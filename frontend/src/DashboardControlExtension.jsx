import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Radio,
  Sliders,
  Gauge,
  X,
  Zap,
  BarChart2,
} from "lucide-react";
import SimulationStatusBadge from "./SimulationStatusBadge";
import ClockWidget from "./ClockWidget";
import {
  startSimulation,
  pauseSimulation,
  resumeSimulation,
  stopSimulation,
  setSimulationSpeed,
  getMqttStatus,
  getMqttTags,
} from "./simulationApi";

/**
 * Round Floating Action Button & Side Extension Control Center.
 * Positioned on the bottom-left of the Dashboard (Flowsheet view).
 * Opens a smooth glassmorphism control panel on the left containing:
 * - Simulation Engine Playback (Play/Pause, Stop & Reset, Speed)
 * - Plant Simulation Clock & Operational Shift Widget
 * - Live MQTT Telemetry Stream Feed Inspector
 * - Replay Progress & Statistics
 */
export default function DashboardControlExtension({ status, onStatusUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("controls"); // "controls" | "mqtt"
  const [mqttStatus, setMqttStatus] = useState(null);
  const [mqttTags, setMqttTags] = useState({});

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

  // Poll MQTT status periodically
  useEffect(() => {
    const fetchMqtt = async () => {
      try {
        const data = await getMqttStatus();
        setMqttStatus(data);
      } catch (e) {
        console.error("MQTT status fetch failed:", e);
      }
    };
    fetchMqtt();
    const timer = setInterval(fetchMqtt, 1200);
    return () => clearInterval(timer);
  }, []);

  // Poll live MQTT tags when drawer is open and on MQTT tab
  useEffect(() => {
    if (!isOpen || activeTab !== "mqtt") return;
    const fetchTags = async () => {
      try {
        const data = await getMqttTags();
        setMqttTags(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchTags();
    const timer = setInterval(fetchTags, 800);
    return () => clearInterval(timer);
  }, [isOpen, activeTab]);

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

  const totalTags = mqttStatus?.total_live_tags || status?.mqtt?.total_live_tags || 51;

  return (
    <>
      {/* Round Floating Action Button on Bottom-Left */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="side-extension-btn-left"
        title="Simulation & MQTT Control Extension"
      >
        <span className="side-extension-pulse" />
        {isRunning ? <Pause size={22} /> : isPaused ? <Play size={22} /> : <Sliders size={22} />}
      </button>

      {/* Extension Left Side Panel Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "stretch",
          }}
        >
          {/* Backdrop Click-to-Close */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0, 0, 0, 0.45)",
              backdropFilter: "blur(3px)",
              cursor: "pointer",
            }}
          />

          {/* Sliding Glass Drawer Window from Left */}
          <div
            style={{
              position: "relative",
              width: "460px",
              height: "100%",
              background: "#0f172a",
              borderRight: "1px solid #00f0ff",
              boxShadow: "10px 0 40px rgba(0, 240, 255, 0.25)",
              display: "flex",
              flexDirection: "column",
              padding: "1.25rem",
              boxSizing: "border-box",
              zIndex: 10000,
              color: "#f8fafc",
              overflowY: "auto",
              animation: "slideRight 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: "flex",
                justify: "space-between",
                alignItems: "center",
                paddingBottom: "0.85rem",
                borderBottom: "1px solid #1e293b",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(0, 240, 255, 0.12)",
                    border: "1px solid #00f0ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#00f0ff",
                  }}
                >
                  <Zap size={20} />
                </div>
                <div>
                  <div style={{ color: "#00f0ff", fontSize: "1rem", fontWeight: "800", letterSpacing: "0.5px" }}>
                    DASHBOARD EXTENSION
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.7rem", fontWeight: "600" }}>
                    Simulation Engine & MQTT Telemetry Controls
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
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

            {/* Tab Navigation (Controls vs MQTT Feed) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.4rem",
                background: "#162032",
                padding: "0.25rem",
                borderRadius: "8px",
                border: "1px solid #1e293b",
                marginBottom: "1rem",
              }}
            >
              <button
                onClick={() => setActiveTab("controls")}
                style={{
                  background: activeTab === "controls" ? "#0284c7" : "transparent",
                  color: activeTab === "controls" ? "#ffffff" : "#94a3b8",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.78rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  transition: "all 0.15s ease",
                }}
              >
                <Sliders size={14} /> Simulation Engine
              </button>

              <button
                onClick={() => setActiveTab("mqtt")}
                style={{
                  background: activeTab === "mqtt" ? "#0284c7" : "transparent",
                  color: activeTab === "mqtt" ? "#ffffff" : "#94a3b8",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.78rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  transition: "all 0.15s ease",
                }}
              >
                <Radio size={14} /> Live MQTT Feed ({totalTags})
              </button>
            </div>

            {activeTab === "controls" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Clock & Status Header */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.75rem",
                    background: "#162032",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    padding: "0.85rem",
                  }}
                >
                  <ClockWidget status={status} />
                  <SimulationStatusBadge state={state} />
                </div>

                {/* Primary Action Buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  {isRunning ? (
                    <button
                      onClick={() => handleAction(pauseSimulation)}
                      style={{
                        background: "#0284c7",
                        color: "#ffffff",
                        border: "1px solid #00f0ff",
                        padding: "0.65rem 0.85rem",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                        boxShadow: "0 0 12px rgba(0, 240, 255, 0.3)",
                      }}
                    >
                      <Pause size={16} /> Pause Simulation
                    </button>
                  ) : isPaused ? (
                    <button
                      onClick={() => handleAction(resumeSimulation)}
                      style={{
                        background: "#0284c7",
                        color: "#ffffff",
                        border: "1px solid #00f0ff",
                        padding: "0.65rem 0.85rem",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                        boxShadow: "0 0 12px rgba(0, 240, 255, 0.3)",
                      }}
                    >
                      <Play size={16} /> Resume Simulation
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(startSimulation)}
                      disabled={!canStart}
                      style={{
                        background: canStart ? "#0284c7" : "#162032",
                        color: canStart ? "#ffffff" : "#475569",
                        border: `1px solid ${canStart ? "#00f0ff" : "#1e293b"}`,
                        padding: "0.65rem 0.85rem",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        fontWeight: "700",
                        cursor: canStart ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                        boxShadow: canStart ? "0 0 12px rgba(0, 240, 255, 0.3)" : "none",
                      }}
                    >
                      <Play size={16} /> Start Simulation
                    </button>
                  )}

                  <button
                    disabled={!canStop}
                    onClick={() => handleAction(stopSimulation)}
                    style={{
                      background: canStop ? "#162032" : "#0f172a",
                      color: canStop ? "#f8fafc" : "#475569",
                      border: `1px solid ${canStop ? "#334155" : "#1e293b"}`,
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: "700",
                      cursor: canStop ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      opacity: canStop ? 1 : 0.4,
                    }}
                  >
                    <RotateCcw size={16} /> Stop & Reset
                  </button>
                </div>

                {/* Speed Multiplier Quick Buttons & Select */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                    background: "#162032",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    padding: "0.75rem 0.85rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#94a3b8", fontSize: "0.78rem", fontWeight: "600" }}>
                      <Gauge size={16} style={{ color: "#00f0ff" }} /> Speed Multiplier:
                    </div>
                    <select
                      value={speed}
                      onChange={handleSpeedChange}
                      style={{
                        background: "#0f172a",
                        color: "#00f0ff",
                        border: "1px solid #00f0ff",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: "700",
                        padding: "0.25rem 0.5rem",
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

                  {/* Quick Speed Preset Buttons */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem" }}>
                    {[1, 10, 60, 600].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange({ target: { value: s } })}
                        style={{
                          background: speed === s ? "#0284c7" : "#0f172a",
                          color: speed === s ? "#ffffff" : "#94a3b8",
                          border: `1px solid ${speed === s ? "#00f0ff" : "#1e293b"}`,
                          borderRadius: "4px",
                          padding: "0.3rem 0.4rem",
                          fontSize: "0.75rem",
                          fontWeight: "800",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>

                {/* Replay Data Statistics */}
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    padding: "0.85rem 1rem",
                    fontSize: "0.78rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.55rem",
                  }}
                >
                  <div style={{ color: "#38bdf8", fontSize: "0.8rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <BarChart2 size={15} /> LIVE REPLAY STATISTICS
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Simulation Timestamp:</span>
                    <strong style={{ color: "#00f0ff", fontFamily: "monospace" }}>{simTime}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Current Record Index:</span>
                    <strong style={{ color: "#f8fafc", fontFamily: "monospace" }}>{currentRecord} / {totalRecords}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Elapsed Operating Time:</span>
                    <strong style={{ color: "#f8fafc", fontFamily: "monospace" }}>{elapsedHours.toFixed(1)} hours</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Replay Progress:</span>
                    <strong style={{ color: "#34d399", fontFamily: "monospace" }}>{progress.toFixed(2)}%</strong>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: "100%", height: "6px", backgroundColor: "#1e293b", borderRadius: "3px", overflow: "hidden", marginTop: "0.3rem" }}>
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
            ) : (
              /* MQTT Live Streams Feed Pane */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div style={{ color: "#38bdf8", fontSize: "0.78rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Radio size={15} /> MOSQUITTO MQTT BROKER FEED ({Object.keys(mqttTags).length} ACTIVE TOPICS)
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {Object.keys(mqttTags).length === 0 ? (
                    <div style={{ color: "#64748b", textAlign: "center", padding: "3rem 0", fontSize: "0.8rem" }}>
                      Connecting to MQTT telemetry stream topics...
                    </div>
                  ) : (
                    Object.entries(mqttTags).map(([topic, payload]) => (
                      <div
                        key={topic}
                        style={{
                          background: "#162032",
                          border: "1px solid #1e293b",
                          borderRadius: "6px",
                          padding: "0.6rem",
                          fontSize: "0.72rem",
                        }}
                      >
                        <div style={{ color: "#00f0ff", fontWeight: "700", fontFamily: "monospace", marginBottom: "0.25rem", wordBreak: "break-all" }}>
                          {topic}
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            color: "#a7f3d0",
                            fontFamily: "monospace",
                            fontSize: "0.68rem",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                          }}
                        >
                          {JSON.stringify(payload, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
