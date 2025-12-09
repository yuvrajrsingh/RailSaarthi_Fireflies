import React, { useContext, useState, useEffect } from "react";
import AppContext from "../context/AppContext";
import { Settings, Send } from "lucide-react";

export default function Simulator() {
  const { runSimulation, simulate } = useContext(AppContext);

  const [autoBlocks, setAutoBlocks] = useState("6,7,8");
  const [loops, setLoops] = useState("10,13");
  const [speedUp, setSpeedUp] = useState("17:1.5,18:1.2");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("Simulator updated with new simulate:", simulate);
  }, [simulate]);

  const handleRun = async () => {
    setLoading(true);

    await runSimulation({
      auto_blocks: autoBlocks,
      loops: loops,
      speed_up: speedUp,
    });

    setLoading(false);
  };

  // --------------------------------------------------
  //     SECTION THROUGHPUT (Derived from simulate)
  // --------------------------------------------------
  const calculateThroughput = () => {
    if (!simulate) return null;

    const trains = simulate.trains?.length || 0;
    const hours = simulate.simulation_time_hours || 1;

    // Optional: If simulation has distance or blocks, compute section length.
    const blocks = simulate.infrastructure?.auto_blocks || [];
    const sectionLength = blocks.length * 1.5; // assume 1.5 km per block

    const throughputPerHour = trains / hours;
    const throughputPerDay = throughputPerHour * 24;

    return {
      trains,
      hours,
      sectionLength,
      throughputPerHour: throughputPerHour.toFixed(2),
      throughputPerDay: throughputPerDay.toFixed(1),
    };
  };

  const tp = calculateThroughput();

  return (
    <div className="w-full space-y-6">

      {/* SETTINGS PANEL */}
      <div className="w-full p-4 bg-blue-50 rounded-xl shadow-md border border-blue-200">

        <div className="flex items-center gap-2 mb-4">
          <Settings size={24} className="text-blue-600" />
          <h2 className="text-3xl font-semibold text-blue-800">
            Simulation Settings
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xl">
          <div>
            <label className="text-blue-700 font-small">Auto Blocks</label>
            <input
              value={autoBlocks}
              onChange={(e) => setAutoBlocks(e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg bg-white shadow-sm"
            />
          </div>

          <div>
            <label className="text-blue-700 font-small text-xl">Loops</label>
            <input
              value={loops}
              onChange={(e) => setLoops(e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg bg-white shadow-sm"
            />
          </div>

          <div>
            <label className="text-blue-700 font-small text-xl">Speed Up</label>
            <input
              value={speedUp}
              onChange={(e) => setSpeedUp(e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg bg-white shadow-sm"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Send size={18} />
            {loading ? "sending..." : "Run Simulation"}
          </button>
        </div>
      </div>

      {/* ===============================
            DISTANCE–TIME SUMMARY
      =============================== */}
      {simulate && (
        <div className="p-5 bg-blue-100 rounded-xl shadow space-y-2 border border-blue-200">
          <h2 className="font-bold text-blue-900 text-2xl">
            Distance–Time Graph Summary
          </h2>

          <p className="text-blue-700 text-lg">Trains simulated: <b>{tp.trains}</b></p>
          <p className="text-blue-700 text-lg">Freight Trains simulated: <b>{tp.trains-81}</b></p>
          <p className="text-blue-700 text-lg">Simulation Time: <b>{tp.hours} hours</b></p>

          <hr className="my-2 border-blue-300" />

          <p className="text-blue-800 font-medium">
            Section Length (approx): <b>{tp.sectionLength} km</b>
          </p>

          <p className="text-blue-800 font-medium">
            Throughput: <b>{tp.throughputPerHour} trains/hour</b>
          </p>

          <p className="text-blue-800 font-medium">
            Max Daily Capacity: <b>{tp.throughputPerDay} trains/day</b>
          </p>
        </div>
      )}

      {/* ===============================
            TRACK DIAGRAM SUMMARY
      =============================== */}
      {simulate && (
        <div className="p-5 bg-green-100 rounded-xl shadow border border-green-300 space-y-3">
          <h2 className="font-bold text-green-900 text-2xl">
            Track Diagram Summary
          </h2>

          <p className="text-green-800 text-lg">
            Auto Blocks: <b>{simulate.infrastructure.auto_blocks.join(", ")}</b>
          </p>

          <p className="text-green-800 text-lg">
            Loops: <b>{simulate.infrastructure.loop_stations.join(", ")}</b>
          </p>

          {/* Added Extra Stats */}
          <hr className="border-green-400" />

          <p className="text-green-900 font-medium">
            Total Blocks: <b>{simulate.infrastructure.auto_blocks.length}</b>
          </p>

          <p className="text-green-900 font-medium">
            Total Loop Stations: <b>{simulate.infrastructure.loop_stations.length}</b>
          </p>

          <p className="text-green-900 font-medium">
            Block Density:{" "}
            <b>
              {(
                simulate.infrastructure.auto_blocks.length /
                (tp.sectionLength || 1)
              ).toFixed(2)}{" "}
              blocks/km
            </b>
          </p>

          <p className="text-green-900 font-medium">
            Avg Loop Spacing:{" "}
            <b>
              {(tp.sectionLength /
                (simulate.infrastructure.loop_stations.length || 1)
              ).toFixed(2)} km</b>
          </p>

          {/* Visual tags */}
          <div className="mt-3 flex flex-wrap gap-2">
            {simulate.infrastructure.auto_blocks.map((b) => (
              <span
                key={b}
                className="px-3 py-1 bg-green-200 text-green-800 rounded-lg text-sm shadow"
              >
                Block {b}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
