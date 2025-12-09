import React, { useState, useContext } from "react";
import AppContext from "../context/AppContext";

export default function SimulationControls() {
  const { runSimulation } = useContext(AppContext);

  const [auto_blocks, setAuto] = useState("");
  const [loops, setLoops] = useState("");
  const [speed_up, setSpeed] = useState("");

  const handleSubmit = () => {
    runSimulation({ auto_blocks, loops, speed_up });
    console.log(runSimulation)
  };

  return (
    <>
      <input value={auto_blocks} onChange={(e) => setAuto(e.target.value)} />
      <input value={loops} onChange={(e) => setLoops(e.target.value)} />
      <input value={speed_up} onChange={(e) => setSpeed(e.target.value)} />

      <button onClick={handleSubmit}>Run Simulation</button>
    </>
  );
}
