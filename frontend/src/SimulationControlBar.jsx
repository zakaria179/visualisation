import React from "react";
import SimulationStatusBadge from "./SimulationStatusBadge";
import {
  startSimulation,
  pauseSimulation,
  resumeSimulation,
  stopSimulation,
  restartSimulation,
  setSimulationSpeed,
} from "./simulationApi";

/**
 * Compact Header Simulation Control Bar.
 * Renders playback buttons, state badge, speed dropdown, and progress indicator.
 */
export default function SimulationControlBar({ status, onStatusUpdate }) {
  const state = status?.state || "STOPPED";
  const currentRecord = status?.current_record || 0;
  const totalRecords = status?.total_records || 0;
  const progress = status?.progress || 0;
  const speed = status?.speed || 1;
  const simTime = status?.simulation_time || "00:00:00.000";

  // Enable / Disable logic based on simulation state
  const isRunning = state === "RUNNING";
  const isPaused = state === "PAUSED";
  const isStopped = state === "STOPPED";
  const isFinished = state === "FINISHED";
  const isError = state === "ERROR";

  const canStart = (isStopped || isFinished) && !isError;
  const canPause = isRunning && !isError;
  const canResume = isPaused && !isError;
  const canStop = (isRunning || isPaused) && !isError;
  const canRestart = true; // Always enabled to reset error/state

  const handleAction = async (actionFn) => {
    try {
      const updatedStatus = await actionFn();
      if (onStatusUpdate) onStatusUpdate(updatedStatus);
    } catch (err) {
      console.error("Simulation action failed:", err);
    }
  };

  const handleSpeedChange = async (e) => {
    const newSpeed = Number(e.target.value);
    try {
      const updatedStatus = await setSimulationSpeed(newSpeed);
      if (onStatusUpdate) onStatusUpdate(updatedStatus);
    } catch (err) {
      console.error("Speed update failed:", err);
    }
  };

  const buttonStyle = (enabled) => ({
    background: enabled ? "#1e293b" : "#0f172a",
    color: enabled ? "#f8fafc" : "#475569",
    border: `1px solid ${enabled ? "#334155" : "#1e293b"}`,
    padding: "0.2rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: "600",
    cursor: enabled ? "pointer" : "not-allowed",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    transition: "all 0.2s ease",
    opacity: enabled ? 1 : 0.4,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.85rem",
        boxSizing: "border-box",
      }}
    >
      {/* State Badge */}
      <SimulationStatusBadge state={state} />

      {/* Progress & Record Count */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: "140px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#94a3b8" }}>
          <span>Record {currentRecord} / {totalRecords}</span>
          <strong style={{ color: "#00f0ff" }}>{progress.toFixed(1)}%</strong>
        </div>
        {/* Thin Progress Bar */}
        <div style={{ width: "100%", height: "4px", backgroundColor: "#1e293b", borderRadius: "2px", overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: "100%",
              backgroundColor: isFinished ? "#3b82f6" : "#00f0ff",
              boxShadow: "0 0 6px #00f0ff",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Playback Speed Dropdown */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Speed:</span>
        <select
          value={speed}
          onChange={handleSpeedChange}
          style={{
            background: "#162032",
            color: "#00f0ff",
            border: "1px solid #1e293b",
            borderRadius: "4px",
            fontSize: "0.75rem",
            fontWeight: "700",
            padding: "0.15rem 0.35rem",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={5}>5×</option>
          <option value={10}>10×</option>
          <option value={100}>100×</option>
        </select>
      </div>

      {/* Control Buttons Group */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <button
          disabled={!canStart}
          onClick={() => handleAction(startSimulation)}
          style={buttonStyle(canStart)}
          title="Start simulation from record 1"
        >
          ▶ Start
        </button>

        <button
          disabled={!canPause}
          onClick={() => handleAction(pauseSimulation)}
          style={buttonStyle(canPause)}
          title="Pause current simulation record"
        >
          ⏸ Pause
        </button>

        <button
          disabled={!canResume}
          onClick={() => handleAction(resumeSimulation)}
          style={buttonStyle(canResume)}
          title="Resume simulation playback"
        >
          ▶ Resume
        </button>

        <button
          disabled={!canStop}
          onClick={() => handleAction(stopSimulation)}
          style={buttonStyle(canStop)}
          title="Stop simulation and reset pointer"
        >
          ⏹ Stop
        </button>

        <button
          disabled={!canRestart}
          onClick={() => handleAction(restartSimulation)}
          style={buttonStyle(canRestart)}
          title="Restart simulation immediately"
        >
          ↺ Restart
        </button>
      </div>
    </div>
  );
}
