import React from "react";

export default function Legend() {
  const items = [
    { label: "Pass. UP ↑",        type: "line", color: "blue" },
    { label: "Pass. DOWN ↓",      type: "line", color: "red" },
    { label: "Freight UP ↑",      type: "line", color: "green" },
    { label: "Freight DOWN ↓",    type: "line", color: "orange" },
    { label: "Loop / Siding",     type: "dot",  color: "#2ecc71" },
  ];

  return (
    <div className="w-full bg-gray-50 p-3 rounded-xl shadow flex flex-wrap items-center gap-6 text-sm">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          
          {/* LINE */}
          {item.type === "line" && (
            <div
              className="h-[3px] w-8 rounded-full"
              style={{ backgroundColor: item.color }}
            ></div>
          )}

          {/* DOT */}
          {item.type === "dot" && (
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            ></div>
          )}

          {/* BOX (optional future use) */}
          {item.type === "box" && (
            <div
              className="h-3 w-6 rounded-sm border border-gray-300"
              style={{ backgroundColor: item.color }}
            ></div>
          )}

          <span className="text-gray-700">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
