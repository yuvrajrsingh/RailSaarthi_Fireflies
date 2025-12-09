from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sim import run_sim, format_train_segments

# ----------------------------------------------------------
# FASTAPI APP CONFIG
# ----------------------------------------------------------
app = FastAPI(
    title="Rail Simulation API",
    description="Backend Simulation for Train Distance-Time visualization",
    version="1.0"
)

# ----------------------------------------------------------
# CORS FIX — REQUIRED FOR REACT FRONTEND
# ----------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite/React Dev Server
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------
# HELPERS FOR QUERY PARAM PARSING
# ----------------------------------------------------------
def parse_auto_blocks(auto_blocks: str):
    return [int(x) for x in auto_blocks.split(",") if x.strip().isdigit()] if auto_blocks else None

def parse_loops(loops: str):
    return [int(x) for x in loops.split(",") if x.strip().isdigit()] if loops else None

def parse_speed_up(speed_up: str):
    if not speed_up:
        return None
    speed_dict = {}
    for item in speed_up.split(","):
        if ":" in item:
            blk, mul = item.split(":")
            speed_dict[int(blk)] = float(mul)
    return speed_dict

# ----------------------------------------------------------
# MAIN SIMULATION ENDPOINT
# ----------------------------------------------------------
@app.get("/simulate")
def simulate(
    auto_blocks: str = "",
    loops: str = "",
    speed_up: str = ""
):
    """
    Query Example:
    /simulate?auto_blocks=6,7,8&loops=10,13&speed_up=17:1.5,18:1.2
    """

    auto_blocks_list = parse_auto_blocks(auto_blocks)
    loops_list = parse_loops(loops)
    speed_dict = parse_speed_up(speed_up)

    (
        df,
        simulation_time,
        block_wait,
        block_usage,
        station_wait,
        station_usage,
        freight_finished,
        avg_frt_time,
        avg_frt_speed
    ) = run_sim(
        "API",
        auto_blocks=auto_blocks_list,
        loop_stations=loops_list,
        speed_up_blocks=speed_dict
    )

    response = {
        "simulation_time_hours": round(simulation_time, 2),
        "infrastructure": {
            "auto_blocks": auto_blocks_list,
            "loop_stations": loops_list,
            "speed_up_blocks": speed_dict
        },
        "freight_stats": {
            "finished_trains": int(freight_finished),
            "average_travel_time_hours": round(avg_frt_time, 2) if freight_finished > 0 else 0.0,
            "average_speed_kmph": round(avg_frt_speed, 1) if freight_finished > 0 else 0.0
        },
        "trains": format_train_segments(df)
    }

    return response
