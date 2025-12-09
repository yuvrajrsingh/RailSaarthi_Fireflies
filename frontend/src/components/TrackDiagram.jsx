import React, { useState } from "react";
import { stationDistance, blockDistance } from "../utils/trainDataset";

export default function TrackDiagram() {
  // MULTIPLE LOOP LINES — store loop count per station
  const [loops, setLoops] = useState({}); // { stationIndex: count }

  // Speed state
  const [blockSpeeds, setBlockSpeeds] = useState({});
  const [speedInput, setSpeedInput] = useState({ block: "", speed: "" });
  const [showSpeedForm, setShowSpeedForm] = useState(false);

  // Signal state
  const [signals, setSignals] = useState({});
  const [signalInput, setSignalInput] = useState({ block: "" });
  const [showSignalForm, setShowSignalForm] = useState(false);

  // Loop popup
  const [showLoopForm, setShowLoopForm] = useState(false);
  const [loopStation, setLoopStation] = useState("");

  // ADD LOOP LINE ON SELECTED STATION (MULTIPLE ALLOWED)
  const applyLoopLine = () => {
    const stationIndex = Number(loopStation) - 1;

    if (stationIndex >= 0 && stationIndex < stationDistance.length) {
      setLoops((prev) => ({
        ...prev,
        [stationIndex]: (prev[stationIndex] || 0) + 1, // increment loop count
      }));
    }

    setShowLoopForm(false);
    setLoopStation("");
  };

  // Apply speed
  const applySpeed = () => {
    const blk = Number(speedInput.block) - 1;
    if (blk >= 0 && blk < blockDistance.length) {
      setBlockSpeeds({ ...blockSpeeds, [blk]: speedInput.speed });
    }
    setShowSpeedForm(false);
    setSpeedInput({ block: "", speed: "" });
  };

  // Apply signals (Auto start+end)
  const applySignal = () => {
    const blk = Number(signalInput.block) - 1;

    if (blk >= 0 && blk < blockDistance.length) {
      setSignals({
        ...signals,
        [blk]: { start: true, end: true },
      });
    }

    setShowSignalForm(false);
    setSignalInput({ block: "" });
  };

  return (
    <div className="w-full bg-gradient-to-b from-blue-50 to-blue-100 border border-blue-300 rounded-2xl p-8 shadow-xl">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center tracking-wide">
        Railway Section Track Layout
      </h2>

      {/* CONTROL PANEL */}
      <div className="flex items-center gap-4 mb-8 p-4 bg-white rounded-xl shadow-md border border-blue-200">
        <button
          onClick={() => setShowLoopForm(true)}
          className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md font-semibold transition"
        >
          ➕ Add Loop Line
        </button>

        <button
          onClick={() => setShowSpeedForm(true)}
          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md font-semibold transition"
        >
          ⚡ Set Speed
        </button>

        <button
          onClick={() => setShowSignalForm(true)}
          className="px-5 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg shadow-md font-semibold transition"
        >
          🚦 Set Signal
        </button>
      </div>

      {/* LOOP LINE POPUP */}
      {showLoopForm && (
        <div className="p-5 bg-white rounded-xl shadow-lg border border-purple-300 mb-8">
          <h3 className="text-purple-700 font-bold mb-2 text-lg">
            Add Loop Line on Station
          </h3>

          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="Station No"
              className="border p-2 rounded-lg w-28 shadow-sm bg-purple-50"
              value={loopStation}
              onChange={(e) => setLoopStation(e.target.value)}
            />

            <button
              onClick={applyLoopLine}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow-md font-semibold"
            >
              Add Loop
            </button>

            <button
              onClick={() => setShowLoopForm(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg shadow-md font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SPEED POPUP */}
      {showSpeedForm && (
        <div className="p-5 bg-white rounded-xl shadow-lg border border-green-300 mb-8">
          <h3 className="text-green-700 font-bold mb-2 text-lg">
            Set Block Speed
          </h3>

          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="Block No"
              className="border p-2 rounded-lg w-28 shadow-sm bg-green-50"
              value={speedInput.block}
              onChange={(e) =>
                setSpeedInput({ ...speedInput, block: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Speed km/h"
              className="border p-2 rounded-lg w-36 shadow-sm bg-green-50"
              value={speedInput.speed}
              onChange={(e) =>
                setSpeedInput({ ...speedInput, speed: e.target.value })
              }
            />

            <button
              onClick={applySpeed}
              className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md font-semibold"
            >
              Apply
            </button>

            <button
              onClick={() => setShowSpeedForm(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg shadow-md font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SIGNAL POPUP */}
      {showSignalForm && (
        <div className="p-5 bg-white rounded-xl shadow-lg border border-yellow-300 mb-8">
          <h3 className="text-yellow-700 font-bold mb-2 text-lg">
            Set Signal (Auto Start + End)
          </h3>

          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="Block No"
              className="border p-2 rounded-lg w-28 shadow-sm bg-yellow-50"
              value={signalInput.block}
              onChange={(e) => setSignalInput({ block: e.target.value })}
            />

            <button
              onClick={applySignal}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg shadow-md font-semibold"
            >
              Apply
            </button>

            <button
              onClick={() => setShowSignalForm(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg shadow-md font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ========================== UP MAIN LINE ========================== */}
      <div className="relative mb-14">
        <p className="text-blue-800 font-bold mb-1">UP MAIN LINE</p>

        <div className="h-2 bg-blue-700 rounded-full shadow-md"></div>

        {/* SPEED LABELS */}
        <div className="absolute w-full flex justify-between -mt-7">
          {blockDistance.map((_, idx) => (
            <div
              key={idx}
              className="w-20 text-center font-semibold text-xs text-red-600"
            >
              {blockSpeeds[idx] && `${blockSpeeds[idx]} km/h`}
            </div>
          ))}
        </div>

        {/* SIGNALS */}
        <div className="absolute w-full flex justify-between -mt-3">
          {blockDistance.map((_, idx) => (
            <div key={idx} className="w-20 relative">
              {signals[idx]?.start && (
                <div className="w-4 h-4 bg-green-500 rounded-full absolute left-0 -ml-2 shadow"></div>
              )}
              {signals[idx]?.end && (
                <div className="w-4 h-4 bg-green-500 rounded-full absolute right-0 -mr-2 shadow"></div>
              )}
            </div>
          ))}
        </div>

        {/* STATIONS + LOOP LINES */}
        <div className="flex justify-between mt-3">
          {stationDistance.map((st, idx) => (
            <div key={idx} className="w-20 text-center">
              <div className="w-2 h-2 bg-blue-700 rounded-full mx-auto shadow"></div>

              <p className="text-sm font-semibold text-blue-900">
                {st.station}
              </p>
              <p className="text-[11px] text-blue-700">{st.km_from_start} km</p>

              {/* MULTIPLE LOOP LINES */}
              {loops[idx] > 0 &&
                [...Array(loops[idx])].map((_, loopIndex) => (
                  <div key={loopIndex} className="mt-1">
                    <div className="h-2 w-20 bg-purple-700 mx-auto rounded-full shadow"></div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* ========================== DOWN MAIN LINE ========================== */}
      <div className="relative mb-14">
        <p className="text-blue-800 font-bold mb-1">DOWN MAIN LINE</p>

        <div className="h-2 bg-blue-700 rounded-full shadow-md"></div>

        {/* SIGNALS */}
        <div className="absolute w-full flex justify-between -mt-3">
          {blockDistance.map((_, idx) => (
            <div key={idx} className="w-20 relative">
              {signals[idx]?.start && (
                <div className="w-4 h-4 bg-green-500 rounded-full absolute left-0 -ml-2 shadow"></div>
              )}
              {signals[idx]?.end && (
                <div className="w-4 h-4 bg-green-500 rounded-full absolute right-0 -mr-2 shadow"></div>
              )}
            </div>
          ))}
        </div>

        {/* STATIONS + LOOPS */}
        <div className="flex justify-between mt-3">
          {stationDistance.map((st, idx) => (
            <div key={idx} className="w-20 text-center">
              <div className="w-2 h-2 bg-blue-700 rounded-full mx-auto shadow"></div>

              <p className="text-sm font-semibold text-blue-900">
                {st.station}
              </p>
              <p className="text-[11px] text-blue-700">{st.km_from_start} km</p>

              {loops[idx] > 0 &&
                [...Array(loops[idx])].map((_, loopIndex) => (
                  <div key={loopIndex} className="mt-1">
                    <div className="h-2 w-20 bg-purple-700 mx-auto rounded-full shadow"></div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
