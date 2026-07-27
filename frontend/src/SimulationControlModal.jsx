import React from "react";
import { Play, Pause, RotateCcw, Square, Sliders, X, Gauge, BarChart2 } from "lucide-react";
import SimulationStatusBadge from "./SimulationStatusBadge";
import ClockWidget from "./ClockWidget";
import {
  startSimulation,
  pauseSimulation,
  resumeSimulation,
  stopSimulation,
  setSimulationSpeed,
} from "./simulationApi";

/**
 * Dynamic Simulation Control & Data Pop-up Modal (Lucide Vector Icons version).
 */
export default function SimulationControlModal({ isOpen, onClose, status, onStatusUpdate }) {
  if (!isOpen) return null;

  const state = status?.state || "STOPPED";
  const currentRecord = status?.current_record || 0;
  const totalRecords = status?.total_records || 43200;
  const progress = status?.progress || 0;
  const speed = status?.speed || 60;
  const elapsedHours = status?.elapsed_hours || 0;
  const simTime = status?.simulation_time || status?.timestamp || "2026-07-01 00:00:00";

  const canStart = state === "STOPPED" || state === "FINISHED";
  const isRunning = state === "RUNNING";
  const isPaused = state === "PAUSED";
  const canStop = state === "RUNNING" || state === "PAUSED";

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

  const actionButtonStyle = (enabled, primary = false) => ({
    background: primary ? "#0284c7" : enabled ? "#1e293b" : "#0f172a",
    color: enabled ? "#f8fafc" : "#475569",
    border: `1px solid ${primary ? "#00f0ff" : enabled ? "#334155" : "#1e293b"}`,
    padding: "0.6rem 1.25rem",
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: "700",
    cursor: enabled ? "pointer" : "not-allowed",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    transition: "all 0.2s ease",
    opacity: enabled ? 1 : 0.4,
    boxShadow: primary ? "0 0 12px rgba(0, 240, 255, 0.3)" : "none",
  });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Semi-transparent Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(5px)",
          cursor: "pointer",
        }}
      />

      {/* Modal Dialog Window */}
      <div
        style={{
          position: "relative",
          width: "520px",
          maxHeight: "90vh",
          background: "#0f172a",
          border: "1px solid #00f0ff",
          borderRadius: "12px",
          boxShadow: "0 10px 40px rgba(0, 240, 255, 0.25)",
          padding: "1.5rem",
          boxSizing: "border-box",
          zIndex: 10000,
          color: "#f8fafc",
          overflowY: "auto",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justify: "space-between",
            alignItems: "center",
            paddingBottom: "0.85rem",
            borderBottom: "1px solid #1e293b",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sliders size={20} style={{ color: "#00f0ff" }} />
            <div>
              <div style={{ color: "#00f0ff", fontSize: "1.05rem", fontWeight: "800" }}>
                Simulation Controls & Data
              </div>
              <div style={{ color: "#64748b", fontSize: "0.72rem" }}>
                SysCAD Phosphates 30-Day Replay Engine
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "0.2rem",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Simulation Clock & Shift Badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.85rem",
            background: "#162032",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <ClockWidget status={status} />
          <SimulationStatusBadge state={state} />
        </div>

        {/* Playback Action Buttons */}
        <div
          style={{
            display: "flex",
            justify: "center",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          {isRunning ? (
            <button onClick={() => handleAction(pauseSimulation)} style={actionButtonStyle(true, true)}>
              <Pause size={16} /> Pause Simulation
            </button>
          ) : isPaused ? (
            <button onClick={() => handleAction(resumeSimulation)} style={actionButtonStyle(true, true)}>
              <Play size={16} /> Resume Simulation
            </button>
          ) : (
            <button onClick={() => handleAction(startSimulation)} style={actionButtonStyle(canStart, canStart)}>
              <Play size={16} /> Start Simulation
            </button>
          )}

          <button disabled={!canStop} onClick={() => handleAction(stopSimulation)} style={actionButtonStyle(canStop)}>
            <RotateCcw size={16} /> Stop & Reset
          </button>
        </div>

        {/* Speed Selector */}
        <div
          style={{
            display: "flex",
            justify: "space-between",
            alignItems: "center",
            background: "#162032",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
          }}
        >
          <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Gauge size={16} style={{ color: "#00f0ff" }} /> Playback Speed Multiplier:
          </span>
          <select
            value={speed}
            onChange={handleSpeedChange}
            style={{
              background: "#0f172a",
              color: "#00f0ff",
              border: "1px solid #00f0ff",
              borderRadius: "4px",
              fontSize: "0.82rem",
              fontWeight: "700",
              padding: "0.3rem 0.65rem",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value={1}>1× (Real-time)</option>
            <option value={10}>10× Speedup</option>
            <option value={60}>60× (1m sim = 1s real)</option>
            <option value={100}>100× Speedup</option>
            <option value={600}>600× Speedup</option>
            <option value={1440}>1440× (1 day = 1 min)</option>
            <option value={3600}>3600× (1 day = 24 sec)</option>
          </select>
        </div>

        {/* Live Simulation Data Summary Table */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            padding: "0.85rem 1rem",
            fontSize: "0.78rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          <div style={{ color: "#38bdf8", fontSize: "0.8rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <BarChart2 size={15} /> LIVE SIMULATION DATA STATISTICS
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748b" }}>Simulation Time:</span>
            <strong style={{ color: "#00f0ff", fontFamily: "monospace" }}>{simTime}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748b" }}>Current Record Index:</span>
            <strong style={{ color: "#f8fafc", fontFamily: "monospace" }}>{currentRecord} / {totalRecords}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748b" }}>Elapsed Plant Operating Time:</span>
            <strong style={{ color: "#f8fafc", fontFamily: "monospace" }}>{elapsedHours.toFixed(1)} hours</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748b" }}>Replay Progress:</span>
            <strong style={{ color: "#34d399", fontFamily: "monospace" }}>{progress.toFixed(2)}%</strong>
          </div>

          {/* Progress Bar */}
          <div style={{ width: "100%", height: "6px", backgroundColor: "#1e293b", borderRadius: "3px", overflow: "hidden", marginTop: "0.4rem" }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                height: "100%",
                backgroundColor: "#00f0ff",
                boxShadow: "0 0 8px #00f0ff",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
