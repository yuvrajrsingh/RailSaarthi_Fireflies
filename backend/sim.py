import simpy
import pandas as pd
import matplotlib.pyplot as plt
from math import ceil, floor  # for directional track split
from datetime import timedelta
import random  # for local train start/end selection

train_stop_map = {}

# ===================== GLOBAL CONFIG =====================

NUM_STATIONS = 22
NUM_BLOCKS = NUM_STATIONS - 1

UP_TRAINS = 50          # passenger only (UP)
DOWN_TRAINS = 31        # passenger only (DOWN)
DEPARTURE_GAP = 0.10    # hours

MIN_HEADWAY_KM = 3.6  # for automatic block capacity

CORRIDOR_BLOCK_LENGTHS = [
    7.74,
    9.23,
    7.11,
    10.65,
    11.74,
    12.33,
    6.57,
    4.43,
    8.84,
    10.07,
    8.82,
    6.46,
    10.04,
    9.63,
    5.43,
    8.29,
    7.98,
    5.94,
    7.01,
    6.23,
    12.29
]

# Speeds
SPEED_EXPRESS = 120
SPEED_LOCAL = 80
SPEED_FRT_LOADED = 60
SPEED_FRT_EMPTY = 75

DWELL_TIME = 0.05  # hours

MAJOR_STATIONS = {0, 4, 18}

station_pos = [0]
for l in CORRIDOR_BLOCK_LENGTHS:
    station_pos.append(station_pos[-1] + l)

# >>> Station codes, index 0..21
STATION_CODES = [
    "KTV", "KPL", "ALM", "KUK", "VZM", "NML", "GVI", "CPP",
    "BTVA", "SGDM", "PDU", "DUSI", "CHE", "ULM", "TIU", "HCM",
    "KBM", "DGB", "NWP", "RMZ", "PUN", "PSA"
]

block_wait_time = [0.0] * NUM_BLOCKS
block_usage = [0] * NUM_BLOCKS
station_wait_time = [0.0] * NUM_STATIONS
station_usage = [0] * NUM_STATIONS

current_speed_multiplier = [1.0] * NUM_BLOCKS
add_new_track_direction = None

DAY_HOURS = 24.0  # horizon used for scheduling + freight throughput stats

# ===================== BEHAVIOUR TOGGLES =====================

# If True, slightly harmonize speeds so freight is less disruptive
USE_SPEED_HARMONIZATION = True

# If True, automatically add a loop to every station (in addition to manual)
USE_GLOBAL_LOOPS = False  # you can turn this on if you want

# ===================== BASELINE INFRASTRUCTURE =====================

BASELINE_BLOCK_CAPS = {
    0: 3, 1: 3, 2: 3, 3: 3, 4: 3,
    5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2,
    13: 2, 14: 2, 15: 2, 16: 2, 17: 2, 18: 2, 19: 2, 20: 2
}
# Block 21 doesn't exist because NUM_BLOCKS = 21 (0..20)


# ===================== TRAIN MIX HELPERS =====================

def get_type_speed(i, is_up):
    """
    All passenger trains:
    Even index -> Express
    Odd index -> Local
    """
    if i % 2 == 0:
        t = "EXP"
        s = SPEED_EXPRESS
    else:
        t = "LOC"
        s = SPEED_LOCAL
    return t, s


def log_position(records, train, t, st, direction):
    dist = station_pos[st] if direction == "UP" else -station_pos[st]
    records.append((train, t, dist))


# ===================== RAILWAY CLASS =====================

class Railway:
    def __init__(self, env, auto_blocks=None, block_caps=None):
        """
        auto_blocks: list of block indices where automatic block signalling is enabled
        block_caps: dict {block_index: capacity}, full capacity map
                    (baseline + any manual overrides already merged before passing)

        Interpretation:
        - capacity N = N physical tracks in that block
        - Split per direction: UP = ceil(N/2), DOWN = floor(N/2)
        - If N == 1 -> single bi-directional track (shared, with lock)
        """
        self.env = env

        self.up_blocks = []
        self.down_blocks = []
        self.block_total_caps = []
        self.single_track_locks = []  # used only when total_cap == 1 (true single line)

        for i in range(NUM_BLOCKS):
            total_cap = 1

            if block_caps and i in block_caps:
                total_cap = max(1, int(block_caps[i]))
            elif auto_blocks and i in auto_blocks:
                total_cap = max(1, int(CORRIDOR_BLOCK_LENGTHS[i] / MIN_HEADWAY_KM))

            self.block_total_caps.append(total_cap)

            if total_cap == 1:
                cap_up = 1
                cap_dn = 1
                lock = simpy.PriorityResource(env, capacity=1)
            else:
                cap_up = ceil(total_cap / 2)
                cap_dn = floor(total_cap / 2)
                if cap_dn <= 0:
                    cap_dn = 1
                lock = None

            self.up_blocks.append(simpy.PriorityResource(env, cap_up))
            self.down_blocks.append(simpy.PriorityResource(env, cap_dn))
            self.single_track_locks.append(lock)

        # Major stations = 3 tracks, others = 2 tracks
        self.stations = [
            simpy.PriorityResource(env, 3 if s in MAJOR_STATIONS else 2)
            for s in range(NUM_STATIONS)
        ]

    def add_loop(self, st):
        if not (0 <= st < NUM_STATIONS):
            print(f"⚠ Warning: Station index {st} out of range, skipping loop")
            return
        self.stations[st] = simpy.PriorityResource(
            self.env,
            self.stations[st].capacity + 1
        )

    def enable_new_line(self, direction):
        global add_new_track_direction
        add_new_track_direction = direction

        # New track INCREASES usable capacity direction-wise
        for i in range(NUM_BLOCKS):
            if direction == "UP":
                current = self.up_blocks[i].capacity
                self.up_blocks[i] = simpy.PriorityResource(self.env, capacity=current + 1)
            else:
                current = self.down_blocks[i].capacity
                self.down_blocks[i] = simpy.PriorityResource(self.env, capacity=current + 1)

            # Remove single-line lock → becomes true double line
            self.single_track_locks[i] = None


def generate_stopping_pattern(train_id, is_local, start_st, end_st):
    """
    Returns a boolean list of length NUM_STATIONS.
    True  -> train stops (dwell) at that station
    False -> train passes through without dwell

    Only stations between start_st and end_st are considered for stopping.
    """
    stops = [False] * NUM_STATIONS

    lo = min(start_st, end_st)
    hi = max(start_st, end_st)

    # Always stop at origin and destination of this train
    stops[start_st] = True
    stops[end_st] = True

    # Always stop at major stations inside this train's run
    for s in MAJOR_STATIONS:
        if lo <= s <= hi and 0 <= s < NUM_STATIONS:
            stops[s] = True

    # Probabilistic stopping in between
    for s in range(lo + 1, hi):
        if stops[s]:
            continue  # already forced to stop here

        if is_local:
            prob = 0.8  # locals stop at most stations
        else:
            prob = 0.25  # expresses stop occasionally

        if random.random() < prob:
            stops[s] = True

    return stops


# ===================== TRAIN PROCESS =====================

def train_process(env, tid, dir, rail, speed, ttype, dep, rec,
                  start_st=None, end_st=None, is_freight=False):
    global block_wait_time, block_usage, station_wait_time, station_usage
    global add_new_track_direction

    # Priority: passenger = 0, freight = 2 (higher number = lower priority)
    pr = 0 if not is_freight else 2
    is_up = (dir == "UP")

    # Default behaviour (full section) if not overridden
    if start_st is None:
        start_st = 0 if is_up else NUM_STATIONS - 1
    if end_st is None:
        end_st = NUM_STATIONS - 1 if is_up else 0

    st = start_st
    last = end_st
    step = 1 if is_up else -1

    yield env.timeout(dep)
    log_position(rec, tid, env.now, st, dir)

    while st != last:
        blk = st if is_up else st - 1

        with rail.stations[st].request(priority=pr) as req:
            yield req
            station_wait_time[st] += 0
            station_usage[st] += 1

            # ---------- STATION BEHAVIOUR ----------
            if not is_freight:
                # Passenger: dwell only where scheduled to stop
                if train_stop_map[tid][st]:
                    yield env.timeout(DWELL_TIME)
            else:
                # Freight: ONLY slow if there is a loop here (capacity > 2)
                if rail.stations[st].capacity > 2:
                    yield env.timeout(5 / 60.0)  # 5 minutes decel into loop

            log_position(rec, tid, env.now, st, dir)

            # ---------- BLOCK TRAVEL ----------
            no_wait = add_new_track_direction and \
                ((add_new_track_direction == "UP" and is_up) or
                 (add_new_track_direction == "DOWN" and not is_up))

            travel = CORRIDOR_BLOCK_LENGTHS[blk] / (speed * current_speed_multiplier[blk])

            if no_wait:
                # New line in this direction: ignore block resource (effectively infinite tracks)
                yield env.timeout(travel)
            else:
                # Direction-wise resources + optional single-track lock
                dir_blocks = rail.up_blocks if is_up else rail.down_blocks
                lock = rail.single_track_locks[blk]

                if lock is not None:
                    # True single-line section: UP and DOWN mutually exclusive
                    with lock.request(priority=pr) as lreq:
                        yield lreq
                        t_before = env.now
                        with dir_blocks[blk].request(priority=pr) as b:
                            yield b
                            block_wait_time[blk] += env.now - t_before
                            block_usage[blk] += 1
                            yield env.timeout(travel)
                else:
                    # Multi-track: tracks split by direction (no cross-direction conflict)
                    t_before = env.now
                    with dir_blocks[blk].request(priority=pr) as b:
                        yield b
                        block_wait_time[blk] += env.now - t_before
                        block_usage[blk] += 1
                        yield env.timeout(travel)

            # ---------- POST-BLOCK ACCEL FOR FREIGHT ----------
            if is_freight and rail.stations[st].capacity > 2:
                # Accelerate back to line speed after leaving loop
                yield env.timeout(7 / 60.0)  # 7 minutes accel

        st += step
        log_position(rec, tid, env.now, st, dir)


def build_departure_times(num_trains, start=0.0, end=DAY_HOURS):
    """
    Evenly spread `num_trains` departures between `start` and `end` (in hours).
    Returns a list of departure times (len = num_trains).
    """
    if num_trains <= 0:
        return []
    if num_trains == 1:
        return [start]
    span = end - start
    headway = span / (num_trains - 1)
    return [start + i * headway for i in range(num_trains)]


# ===================== SIM RUNNER =====================

def run_sim(label, loop_stations=None, auto_blocks=None, speed_up_blocks=None,
            block_capacities=None, new_track_direction=None):
    """
    block_capacities: dict {block_index: capacity}
        - EXTRA per-block capacity (on top of BASELINE_BLOCK_CAPS)
        - Manual per-block capacity (highest priority over auto_blocks)

    Returns:
        df_export,
        simulation_time,
        block_wait_time,
        block_usage,
        station_wait_time,
        station_usage,
        freight_finished (throughput),
        avg_freight_travel_time,
        avg_freight_speed
    """

    global block_wait_time, block_usage, station_wait_time, station_usage
    global current_speed_multiplier, add_new_track_direction
    global train_stop_map

    block_wait_time = [0.0] * NUM_BLOCKS
    block_usage = [0] * NUM_BLOCKS
    station_wait_time = [0.0] * NUM_STATIONS
    station_usage = [0] * NUM_STATIONS
    current_speed_multiplier = [1.0] * NUM_BLOCKS
    add_new_track_direction = None
    train_stop_map = {}

    # Start with baseline infra capacities
    merged_caps = dict(BASELINE_BLOCK_CAPS)

    # Apply extra capacities (scenario/manual)
    if block_capacities:
        for b, cap in block_capacities.items():
            if 0 <= b < NUM_BLOCKS and cap >= 1:
                merged_caps[b] = int(cap)
            else:
                print(f"⚠ Warning: Ignoring invalid block capacity entry ({b}: {cap})")

    if speed_up_blocks:
        for b, m in list(speed_up_blocks.items()):
            if 0 <= b < NUM_BLOCKS:
                current_speed_multiplier[b] = m
            else:
                print(f"⚠ Warning: Ignoring invalid speed-up block index {b}")

    rec = []
    env = simpy.Environment()
    rail = Railway(env, auto_blocks, merged_caps)

    # Global loops (optional)
    if USE_GLOBAL_LOOPS:
        for s in range(NUM_STATIONS):
            rail.add_loop(s)

    # Manual loops
    if loop_stations:
        for s in loop_stations:
            rail.add_loop(s)

    if new_track_direction:
        rail.enable_new_line(new_track_direction)

    # ========== TRAIN GENERATION (24-hour horizon) ==========

    random.seed(42)

    # Precompute departure times over 24 hours, separately for each direction
    up_departures = build_departure_times(UP_TRAINS, start=0.0, end=DAY_HOURS)
    down_departures = build_departure_times(DOWN_TRAINS, start=0.0, end=DAY_HOURS)

    tid = 0

    # ---------- UP TRAINS: half long, half short ----------
    up_long = UP_TRAINS // 2
    up_short = UP_TRAINS - up_long

    # Long-distance UP (0 -> last)
    for i in range(up_long):
        tt, sp = get_type_speed(i, True)
        start_st = 0
        end_st = NUM_STATIONS - 1

        train_stop_map[tid] = generate_stopping_pattern(tid, (tt == "LOC"), start_st, end_st)

        dep_time = up_departures[i]
        env.process(train_process(env, tid, "UP", rail, sp, tt, dep_time, rec,
                                  start_st=start_st, end_st=end_st))
        tid += 1

    # Short-distance UP (start & end inside section)
    for i in range(up_short):
        tt, sp = get_type_speed(i + up_long, True)

        start_st = random.randint(1, 10)
        end_st = random.randint(start_st + 3, NUM_STATIONS - 2)

        train_stop_map[tid] = generate_stopping_pattern(tid, (tt == "LOC"), start_st, end_st)

        dep_time = up_departures[i + up_long]
        env.process(train_process(env, tid, "UP", rail, sp, tt, dep_time, rec,
                                  start_st=start_st, end_st=end_st))
        tid += 1

    # ---------- DOWN TRAINS: half long, half short ----------
    down_long = DOWN_TRAINS // 2
    down_short = DOWN_TRAINS - down_long

    # Long-distance DOWN (last -> 0)
    for i in range(down_long):
        tt, sp = get_type_speed(i, False)
        start_st = NUM_STATIONS - 1
        end_st = 0

        train_stop_map[tid] = generate_stopping_pattern(tid, (tt == "LOC"), start_st, end_st)

        dep_time = down_departures[i]
        env.process(train_process(env, tid, "DOWN", rail, sp, tt, dep_time, rec,
                                  start_st=start_st, end_st=end_st))
        tid += 1

    # Short-distance DOWN (start & end inside section, reversed direction)
    for i in range(down_short):
        tt, sp = get_type_speed(i + down_long, False)

        start_st = random.randint(11, NUM_STATIONS - 2)
        end_st = random.randint(1, start_st - 3)

        train_stop_map[tid] = generate_stopping_pattern(tid, (tt == "LOC"), start_st, end_st)

        dep_time = down_departures[i + down_long]
        env.process(train_process(env, tid, "DOWN", rail, sp, tt, dep_time, rec,
                                  start_st=start_st, end_st=end_st))
        tid += 1

    # ========== FREIGHT INSERTION (gap-based, horizon-limited) ==========

    FREIGHT_REQUESTED = 50  # or whatever you like
    max_per_dir = FREIGHT_REQUESTED // 2

    freight_up_deps = []
    freight_down_deps = []

    # midpoint between UP departures
    for i in range(len(up_departures) - 1):
        mid = (up_departures[i] + up_departures[i + 1]) / 2
        if mid <= DAY_HOURS:
            freight_up_deps.append(mid)

    # midpoint between DOWN departures
    for i in range(len(down_departures) - 1):
        mid = (down_departures[i] + down_departures[i + 1]) / 2
        if mid <= DAY_HOURS:
            freight_down_deps.append(mid)

    freight_up_deps = freight_up_deps[:max_per_dir]
    freight_down_deps = freight_down_deps[:max_per_dir]

    # Create UP freights
    for dep in freight_up_deps:
        if dep > DAY_HOURS:
            break
        tt = "FRT"
        sp = SPEED_FRT_LOADED
        start_st = 0
        end_st = NUM_STATIONS - 1

        train_stop_map[tid] = [False] * NUM_STATIONS

        env.process(train_process(
            env, tid, "UP", rail, sp, tt,
            dep=dep,
            rec=rec,
            start_st=start_st,
            end_st=end_st,
            is_freight=True
        ))
        tid += 1

    # Create DOWN freights
    for dep in freight_down_deps:
        if dep > DAY_HOURS:
            break
        tt = "FRT"
        sp = SPEED_FRT_LOADED
        start_st = NUM_STATIONS - 1
        end_st = 0

        train_stop_map[tid] = [False] * NUM_STATIONS

        env.process(train_process(
            env, tid, "DOWN", rail, sp, tt,
            dep=dep,
            rec=rec,
            start_st=start_st,
            end_st=end_st,
            is_freight=True
        ))
        tid += 1

    # ========== RUN ==========
    env.run()
    print(f"{label} finished in {env.now:.2f}h")

    # ========== POST-SIM FREIGHT THROUGHPUT & SPEED ==========
    df = pd.DataFrame(rec, columns=["train", "time", "dist"])

    passenger_cutoff = UP_TRAINS + DOWN_TRAINS
    full_len = station_pos[-1]

    freight_df = df[df.train >= passenger_cutoff]
    finished_ids = []
    total_time = 0.0
    total_speed = 0.0

    for tid_f in freight_df.train.unique():
        tdf = freight_df[freight_df.train == tid_f].sort_values("time")
        dep = tdf.time.iloc[0]
        arr = tdf.time.iloc[-1]

        # must arrive within 24h horizon
        if arr > DAY_HOURS:
            continue

        # must reach near end-to-end
        if abs(abs(tdf.dist.iloc[-1]) - full_len) > 1e-3:
            continue

        trav = arr - dep
        if trav <= 0:
            continue

        finished_ids.append(tid_f)
        total_time += trav
        total_speed += full_len / trav

    freight_finished = len(finished_ids)
    avg_frt_time = total_time / freight_finished if freight_finished > 0 else 0.0
    avg_frt_speed = total_speed / freight_finished if freight_finished > 0 else 0.0

    print(f"📦 Freight Finished (within 24h): {freight_finished}")
    if freight_finished > 0:
        print(f"🚄 Avg Freight Travel Time: {avg_frt_time:.2f} h")
        print(f"⚡ Avg Freight Speed: {avg_frt_speed:.1f} km/h")

    # Expose only passenger + COMPLETED freights (Option A)
    if freight_finished > 0:
        df_export = df[(df.train < passenger_cutoff) | (df.train.isin(finished_ids))]
    else:
        df_export = df[df.train < passenger_cutoff]

    return (
        df_export,
        env.now,
        block_wait_time.copy(),
        block_usage.copy(),
        station_wait_time.copy(),
        station_usage.copy(),
        freight_finished,
        avg_frt_time,
        avg_frt_speed
    )


# ===================== ANALYSIS =====================

def top_k_blocks(n):
    score = [(i, block_wait_time[i], block_usage[i]) for i in range(NUM_BLOCKS)]
    return sorted(score, key=lambda x: (-x[1], -x[2]))[:n]


def top_k_stations(n):
    score = [(i, station_wait_time[i], station_usage[i]) for i in range(NUM_STATIONS)]
    return sorted(score, key=lambda x: (-x[1], -x[2]))[:n]


def format_train_segments(df):
    """
    Build JSON-friendly structure:

    {
      "train_id": "T0",
      "train_name": "Train-0",
      "direction": "UP",
      "train_type": "Passenger"/"Freight",
      "color": "#....",
      "segments": [
         {
           "from_station": "KTV",
           "to_station": "KPL",
           ...
         }, ...
      ]
    }
    """
    trains_data = []
    passenger_cutoff = UP_TRAINS + DOWN_TRAINS

    for train_id in df.train.unique():
        tdf = df[df.train == train_id].sort_values("time")
        direction = "UP" if tdf.dist.iloc[0] >= 0 else "DOWN"

        is_freight = (train_id >= passenger_cutoff)
        train_type = "Freight" if is_freight else "Passenger"

        # Color scheme for 4 classes
        if not is_freight and direction == "UP":
            color = "#005eff"      # UP Passenger
        elif not is_freight and direction == "DOWN":
            color = "#ff3300"      # DOWN Passenger
        elif is_freight and direction == "UP":
            color = "#00aa00"      # UP Freight
        else:
            color = "#ff8800"      # DOWN Freight

        segments = []
        prev_st = None
        prev_time = None

        for _, row in tdf.iterrows():
            # find closest station index
            st = min(
                range(len(station_pos)),
                key=lambda i: abs(station_pos[i] - abs(row.dist))
            )

            if prev_st is not None and prev_st != st:
                segments.append({
                    "from_station": STATION_CODES[prev_st],
                    "to_station": STATION_CODES[st],
                    "distance_km": float(abs(station_pos[st] - station_pos[prev_st])),
                    "scheduled_dep": str(timedelta(hours=prev_time))[:8],
                    "scheduled_arr": str(timedelta(hours=row.time))[:8],
                    "dwell_time_sec": int(DWELL_TIME * 3600)
                })

            prev_st = st
            prev_time = row.time

        train_info = {
            "train_id": f"T{train_id}",
            "train_name": f"Train-{train_id}",
            "direction": direction,
            "train_type": train_type,
            "color": color,
            "segments": segments
        }

        trains_data.append(train_info)

    return trains_data


# ===================== MAIN (kept mostly as-is for CLI use) =====================

if __name__ == "__main__":

    print("\n===== BASELINE RUN =====")
    df_base, T_base, *_ = run_sim("Baseline")

    # ===================== Automated Analysis =====================
    print("\n🚦 Auto-block tests")
    block_gain = []
    for blk, _, _ in top_k_blocks(5):
        _, T, *_ = run_sim("AutoBlk", auto_blocks=[blk])
        imp = T_base - T
        if imp > 0:
            print(f"+ Block {blk}: +{imp:.2f}h")
            block_gain.append((blk, imp))

    print("\n➕ Loop tests")
    station_gain = []
    for st, _, _ in top_k_stations(5):
        _, T, *_ = run_sim("Loop", loop_stations=[st])
        imp = T_base - T
        if imp > 0:
            print(f"+ Station {st}: +{imp:.2f}h")
            station_gain.append((st, imp))

    print("\n🚄 Speed-up tests")
    speed_gain = []
    for blk, _, _ in top_k_blocks(5):
        _, T, *_ = run_sim("SpeedUp", speed_up_blocks={blk: 1.25})
        imp = T_base - T
        if imp > 0:
            print(f"+ Speed in Block {blk}: +{imp:.2f}h")
            speed_gain.append((blk, imp))

    best_auto = [b for b, _ in sorted(block_gain, key=lambda x: -x[1])][:3]
    best_loops = [s for s, _ in sorted(station_gain, key=lambda x: -x[1])][:3]
    best_speed = {b: 1.25 for b, _ in sorted(speed_gain, key=lambda x: -x[1])[:3]}

    print("\n📦 BEST AUTO-OPTIMIZED SCENARIO")
    print("Auto blocks:", best_auto)
    print("Loop stations:", best_loops)
    print("Speed upgrades:", best_speed)

    USE_MANUAL_VALUES = True  # change to False to use BEST auto scenario

    MANUAL_AUTO_BLOCKS = [1, 2, 3, 4]
    MANUAL_LOOP_STATIONS = [10, 13, 12, 5]
    MANUAL_SPEED_UP = {17: 1.50, 18: 1.2}
    MANUAL_BLOCK_CAPACITIES = {
        # add manual extra capacities if needed
    }

    if USE_MANUAL_VALUES:
        print("\n===== MANUAL SCENARIO RUN =====")
        df_scen, T_scen, *_tail = run_sim(
            "Manual",
            auto_blocks=MANUAL_AUTO_BLOCKS or None,
            loop_stations=MANUAL_LOOP_STATIONS or None,
            speed_up_blocks=MANUAL_SPEED_UP or None,
            block_capacities=MANUAL_BLOCK_CAPACITIES or None,
        )
        imp_manual = T_base - T_scen
        print(f"Manual improvement: +{imp_manual:.2f}h")
        scenario_label = "Manual"
    else:
        df_scen, T_scen, *_tail = run_sim(
            "BEST",
            auto_blocks=best_auto or None,
            loop_stations=best_loops or None,
            speed_up_blocks=best_speed or None,
            block_capacities=None,
        )
        imp_manual = T_base - T_scen
        print(f"🎯 BEST improvement: +{imp_manual:.2f}h")
        scenario_label = "Best"

    print("\n===== NEW TRACK SCENARIO =====")
    new_line = "DOWN" if DOWN_TRAINS >= UP_TRAINS else "UP"
    print("🛤 building extra line in", new_line)

    df_track, T_track, *_tail2 = run_sim("NewTrack", new_track_direction=new_line)
    track_imp = T_base - T_track
    print(f"⭐ New track improvement: +{track_imp:.2f}h")

    # Distance–time plot (uses raw station positions but we could change to STATION_CODES labels)
    plt.figure(figsize=(14, 8))

    for t in df_base.train.unique():
        seg = df_base[df_base.train == t]
        y = seg.dist.abs()
        plt.plot(seg.time, y, color="gray", alpha=0.30, linewidth=0.7)

    for t in df_scen.train.unique():
        seg = df_scen[df_scen.train == t]
        y = seg.dist.abs()
        color = "blue" if seg.dist.iloc[0] > 0 else "red"
        plt.plot(seg.time, y, linewidth=1.8, color=color)

    plt.grid(True)
    plt.title(
        f"Baseline vs {scenario_label} Scenario\n"
        f"Impr: +{imp_manual:.2f}h"
    )
    plt.xlabel("Time (hours)")
    plt.ylabel("Distance (km)")
    plt.yticks(station_pos, STATION_CODES)
    plt.ylim(0, max(station_pos) + 5)
    plt.tight_layout()
    plt.savefig("baseline_vs_scenario.png")

    # FULL DT GRAPH WITH 4 COLORS
    print("\n📊 Plotting Full Timetable Distance vs Time Graph...")

    plt.figure(figsize=(15, 9))

    passenger_cutoff = UP_TRAINS + DOWN_TRAINS

    for tid in df_scen.train.unique():
        seg = df_scen[df_scen.train == tid].sort_values("time")
        y = seg.dist.abs()
        is_up = seg.dist.iloc[0] >= 0

        if tid < UP_TRAINS:
            color = "blue"          # UP Passenger
        elif tid < passenger_cutoff:
            color = "red"           # DOWN Passenger
        else:
            color = "green" if is_up else "orange"  # Freights

        plt.plot(seg.time, y, color=color, linewidth=1.1, alpha=0.9)

    plt.yticks(station_pos, STATION_CODES, fontsize=8)
    plt.grid(True, linestyle="--", alpha=0.3)
    plt.xlabel("Time (hours)")
    plt.ylabel("Distance (km)")
    plt.title(
        "Full Distance–Time Timetable Chart\n"
        f"{scenario_label} Scenario Runtime: {T_scen:.2f}h"
    )

    from matplotlib.lines import Line2D
    legend_elements = [
        Line2D([0], [0], color="blue", lw=2, label="UP Passenger"),
        Line2D([0], [0], color="red", lw=2, label="DOWN Passenger"),
        Line2D([0], [0], color="green", lw=2, label="UP Freight"),
        Line2D([0], [0], color="orange", lw=2, label="DOWN Freight"),
    ]
    plt.legend(handles=legend_elements, loc="upper right")

    plt.tight_layout()
    plt.savefig("full_timetable_classified_dt_chart.png")