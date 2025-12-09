import React, { useState, useRef, useEffect } from "react";
import AppContext from "./AppContext";
import axios from "axios";

const AppState = ({ children }) => {
  const API_URL = "http://localhost:8000";

  const [simulate, setSimulate] = useState(null);

  const abortRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // 🔁 Polling
  const startPolling = (url) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        const res = await axios.get(url, { signal: abortRef.current.signal });
        setSimulate(res.data);
      } catch (err) {
        if (err?.code === "ERR_CANCELED") return;
        console.error("Polling error:", err);
      }
    }, 1500);
  };

  // ▶ Run Simulation
  const runSimulation = async ({ auto_blocks, loops, speed_up }) => {
    try {
      if (abortRef.current) abortRef.current.abort();
      if (pollRef.current) clearInterval(pollRef.current);

      const query = new URLSearchParams({
        auto_blocks,
        loops,
        speed_up,
      }).toString();

      const finalURL = `${API_URL}/simulate?${query}`;

      abortRef.current = new AbortController();
      const res = await axios.get(finalURL, {
        signal: abortRef.current.signal,
      });

      setSimulate(res.data);
      startPolling(finalURL);
      console.log(res)
    } catch (err) {
      if (err?.code !== "ERR_CANCELED") console.error("API ERROR:", err);
    }
  };

  return (
    <AppContext.Provider value={{ simulate, runSimulation }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppState;
