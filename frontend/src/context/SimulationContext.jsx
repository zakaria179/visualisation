import React, { createContext, useContext, useState, useEffect } from "react";
import { getSimulationStatus } from "../api/simulationApi";

const SimulationContext = createContext(null);

export function SimulationProvider({ children }) {
  const [status, setStatus] = useState(null);
  const [activeAssetTag, setActiveAssetTag] = useState("BM_001");
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const data = await getSimulationStatus();
      setStatus(data);
    } catch (err) {
      console.warn("Error polling simulation status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SimulationContext.Provider
      value={{
        status,
        setStatus,
        activeAssetTag,
        setActiveAssetTag,
        loading,
        refreshStatus: fetchStatus,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulationContext() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error("useSimulationContext must be used within a SimulationProvider");
  }
  return context;
}
