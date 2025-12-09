import React from "react";
import { BarChart3, Gauge } from "lucide-react";

const KpiStats = ({ throughput = 0, avgDelay = 0 }) => {
  return (
    <div className="h-full w-full flex flex-col">
      <div
        className="
          flex-1
          bg-blue-50/70 backdrop-blur-xl 
          p-6 rounded-xl shadow-lg border border-blue-200
          space-y-8
          flex flex-col
        "
      >
        <h2 className="text-2xl font-bold text-blue-800 tracking-wide">
          KPI Statistics
        </h2>

        {/* Throughput */}
        <div
          className="
            p-4 bg-blue-100/70 rounded-xl border border-blue-200
            shadow-sm hover:shadow-md transition-all space-y-2 cursor-default
          "
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 size={26} className="text-blue-700" />
              <span className="text-blue-700 font-semibold">
                Throughput
              </span>
            </div>

            <span className="text-xl font-bold text-blue-800">
              {throughput}
            </span>
          </div>

          <p className="text-sm text-blue-600">
            Calculated throughput value (dynamic)
          </p>
        </div>

        {/* Average Delay */}
        <div
          className="
            p-4 bg-blue-100/70 rounded-xl border border-blue-200
            shadow-sm hover:shadow-md transition-all space-y-2 cursor-default
          "
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gauge size={26} className="text-blue-700" />
              <span className="text-blue-700 font-semibold">
                Average Delay
              </span>
            </div>

            <span className="text-xl font-bold text-blue-800">
              {avgDelay} min
            </span>
          </div>

          <p className="text-sm text-blue-600">
            Delay based on train schedule deviation
          </p>
        </div>
      </div>
    </div>
  );
};

export default KpiStats;
