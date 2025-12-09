import React, { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { stationDistance } from "../utils/trainDataset";

// Time → minutes
const toMinutes = (t) => {
  if (!t) return 0;
  const p = t.split(":").map(Number);
  return p[0] * 60 + p[1];
};

const fixTime = (prev, next) => (next >= prev ? next : prev + 0.01);

// KM lookup
const kmOf = (station) =>
  stationDistance.find((s) => s.station === station)?.km_from_start ?? null;

const stationNameByKM = (km) =>
  stationDistance.find((s) => s.km_from_start === km)?.station ?? "";

export default function DistanceTimeGraph({ simulate }) {
  if (!simulate?.trains)
    return (
      <div className="p-4 bg-blue-50 text-center text-gray-600 rounded-xl">
        No graph data — run the simulation.
      </div>
    );

  const maxKM =
    stationDistance.at(-1)?.km_from_start ??
    Math.max(...stationDistance.map((s) => s.km_from_start));

  // ----------------------------
  // BUILD GRAPH DATA
  // ----------------------------
  const graphData = useMemo(() => {
    return simulate.trains.map((train, idx) => {
      let last = 0;
      const down = train.direction?.toUpperCase() === "DOWN";
      const points = [];

      (train.segments ?? []).forEach((s) => {
        if (!s.from_station || !s.to_station) return;

        let dep = fixTime(last, toMinutes(s.scheduled_dep));
        let arr = fixTime(dep, toMinutes(s.scheduled_arr));
        last = arr;

        let a = kmOf(s.from_station);
        let b = kmOf(s.to_station);

        if (a == null || b == null) return;

        // FIX: Correct direction flip
        if (down && a < b) [a, b] = [b, a];
        if (!down && a > b) [a, b] = [b, a];

        points.push({ x: dep, y: a });
        points.push({ x: arr, y: b });

        if (s.dwell_time_sec) {
          last = arr + s.dwell_time_sec / 60;
          points.push({ x: last, y: b });
        }
      });

      return {
        id: train.train_id ?? `Train-${idx + 1}`,
        color: train.color ?? "#000",
        data: points,
        labelPoint: points[0] ?? { x: 0, y: 0 },
      };
    });
  }, [simulate]);

  // ----------------------------
  // WIDTH CALCULATION
  // ----------------------------
  const visibleRange = 1200;
  const maxTime = 1440;

  const baseWidth = window.innerWidth;
  const extraHours = maxTime - visibleRange;
  const extraWidthPerHour = baseWidth / 20;

  const totalWidth =
    baseWidth + (extraHours / 60) * extraWidthPerHour;

  // ----------------------------
  // TRAIN LABELS
  // ----------------------------
  const trainLabels = ({ xScale, yScale }) => (
    <>
      {graphData.map((t) => {
        const p = t.labelPoint;
        return (
          <text
            key={t.id}
            x={xScale(p.x)}
            y={yScale(p.y) - 10}
            fill={t.color}
            fontSize={12}
            fontWeight={700}
          >
            {t.id}
          </text>
        );
      })}
    </>
  );

  // ----------------------------
  // RENDER
  // ----------------------------
  return (
    <div className="w-full bg-blue-50 p-2 overflow-x-auto">
      <div
        style={{
          width: `${totalWidth}px`,
          height: "86vh",
        }}
        className="bg-white p-1 shadow-xl rounded-xl border border-blue-300"
      >
        <ResponsiveLine
          data={graphData}
          margin={{ top: 30, right: 80, bottom: 50, left: 110 }}  // FIXED MARGINS
          xScale={{ type: "linear", min: 0, max: maxTime }}
          yScale={{ type: "linear", min: 0, max: maxKM }}
          axisLeft={{
            legend: "Distance (km)",
            tickValues: stationDistance.map((s) => s.km_from_start),
            format: (km) => {
              const name = stationNameByKM(km);
              return `${km} km${name ? ` — ${name}` : ""}`;
            },
          }}
          axisBottom={{
            legend: "Time (HH:MM)",
            tickValues: [...Array(25).keys()].map((h) => h * 60),
            format: (v) =>
              `${String(Math.floor(v / 60)).padStart(2, "0")}:00`,
          }}
          colors={(d) => d.color}
          lineWidth={4}
          pointSize={0}
          enablePoints={false}
          useMesh
          enableSlices="x"
          layers={["grid", "axes", "lines", trainLabels, "mesh"]}
        />
      </div>
    </div>
  );
}
