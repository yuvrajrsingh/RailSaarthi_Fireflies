import React, { useContext } from "react";
import DistanceTimeGraph from "../components/DistanceTime";
import Simulator from "../components/Simulator";
import AppContext from "../context/AppContext";
import Legend from "../components/Legend";
import DistanceTimeHeader from "../components/DistanceTimeHeader";

export default function Home() {
  const { simulate } = useContext(AppContext);

  return (
    <div className="w-full p-1 space-y-6">
      <DistanceTimeHeader />
      <Legend />
      {/* GRAPH */}
      <DistanceTimeGraph simulate={simulate} />

      {/* CONTROLS + SUMMARY */}
      <Simulator />

      {/* RAW JSON */}
      <div className="p-4 bg-white shadow rounded-lg">
        <h2 className="font-bold mb-2 text-gray-800">Simulation Data</h2>

        {!simulate ? (
          <div className="text-gray-500">Run simulation to see results.</div>
        ) : (
          <pre className="bg-gray-100 p-3 rounded max-h-96 overflow-auto text-sm">
            {JSON.stringify(simulate, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
