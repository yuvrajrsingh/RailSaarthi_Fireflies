import { stationList, blockDistance } from "../utils/trainDataset";
import React, { useState } from "react";

const Tweak = () => {
  const [values, setValues] = useState({
    loopStation: "",
    loopCount: "",

    trackBlock: "",
    tracks: "",

    speedBlock: "",
    speed: "",

    signalStation: "",
    signal: "",
  });

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const submit = (label, data) => {
    console.log("SUBMIT:", label, data);
  };

  return (
    <div className="bg-blue-50 p-6 rounded-xl shadow-lg border border-blue-200 w-full">

      <div className="grid grid-cols-2 gap-6">

        {/* ---------- LOOPS ---------- */}
        <div className="space-y-3 bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold text-blue-700 text-lg">Set Loops</h3>

          <select
            name="loopStation"
            value={values.loopStation}
            onChange={handleChange}
            className="p-3 rounded-lg border border-blue-300 w-full"
          >
            <option value="">Select Station</option>
            {stationList.map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>

          <select
            name="loopCount"
            value={values.loopCount}
            onChange={handleChange}
            className="p-3 rounded-lg border border-blue-300 w-full"
          >
            <option value="">Loop Count</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <button
            onClick={() =>
              submit("Loops", {
                station: values.loopStation,
                loops: values.loopCount,
              })
            }
            className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full"
          >
            Submit Loops
          </button>
        </div>

        {/* ---------- TRACKS ---------- */}
        <div className="space-y-3 bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold text-blue-700 text-lg">Set Tracks</h3>

          <select
            name="trackBlock"
            value={values.trackBlock}
            onChange={handleChange}
            className="p-3 rounded-lg border border-blue-300 w-full"
          >
            <option value="">Select Block</option>
            {blockDistance.map((b, i) => (
              <option key={i} value={b.from_station}>
                {b.from_station} → {b.to_station}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            name="tracks"
            value={values.tracks}
            onChange={handleChange}
            placeholder="Enter number of tracks"
            className="p-3 rounded-lg border border-blue-300 w-full"
          />

          <button
            onClick={() =>
              submit("Tracks", {
                block: values.trackBlock,
                tracks: values.tracks,
              })
            }
            className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full"
          >
            Submit Tracks
          </button>
        </div>

        {/* ---------- SPEED ---------- */}
        <div className="space-y-3 bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold text-blue-700 text-lg">Set Speed</h3>

          <select
            name="speedBlock"
            value={values.speedBlock}
            onChange={handleChange}
            className="p-3 rounded-lg border border-blue-300 w-full"
          >
            <option value="">Select Block</option>
            {blockDistance.map((b, i) => (
              <option key={i} value={b.from_station}>
                {b.from_station} → {b.to_station}
              </option>
            ))}
          </select>

          <select
            name="speed"
            value={values.speed}
            onChange={handleChange}
            className="p-3 rounded-lg border border-blue-300 w-full"
          >
            <option value="">Select Speed</option>
            <option value="3km">3 km</option>
            <option value="5km">5 km</option>
            <option value="7km">7 km</option>
          </select>

          <button
            onClick={() =>
              submit("Speed", {
                block: values.speedBlock,
                speed: values.speed,
              })
            }
            className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full"
          >
            Submit Speed
          </button>
        </div>

        {/* ---------- SIGNAL ---------- */}
        <div className="space-y-3 bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold text-blue-700 text-lg">Set Signal</h3>

          <select
            name="signalStation"
            value={values.signalStation}
            onChange={handleChange}
            className="p-3 rounded-lg border border-blue-300 w-full"
          >
            <option value="">Select Station</option>
            {stationList.map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>

          <select
            name="signal"
            value={values.signal}
            onChange={handleChange}
            className="p-3 rounded-lg border border-blue-300 w-full"
          >
            <option value="">Select Signal</option>
            <option value="AT">AT</option>
            <option value="STOP">STOP</option>
            <option value="GO">GO</option>
          </select>

          <button
            onClick={() =>
              submit("Signal", {
                station: values.signalStation,
                signal: values.signal,
              })
            }
            className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full"
          >
            Submit Signal
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tweak;
