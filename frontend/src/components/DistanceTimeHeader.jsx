import React from "react";

const DistanceTimeHeader = () => {
  return (
    <div className="
      w-full px-6 py-3 
      rounded-lg border 
      bg-gradient-to-r from-blue-100 to-blue-200 
      border-blue-300 
      shadow-sm 
      flex justify gap-5  gitems-center
    ">
      {/* Section Name */}
      <h2 className="text-3xl font-semibold text-blue-900 tracking-wide">
        Kottavalasa (KTV) → Palasa (PSA)
      </h2>

      {/* Distance */}
      <span className="text-blue-800 text-3xl font-semibold">
        160 km
      </span>
    </div>
  );
};

export default DistanceTimeHeader;
