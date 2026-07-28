import React, { useState, useEffect } from "react";
import SimulationControlModal from "./SimulationControlModal";
import { getMqttStatus, getMqttTags } from "./simulationApi";

/**
 * Ultra-Clean Header Control Bar.
 * Holds only two pop-up launchers:
 * 1. "🎮 Simulation Controls & Data" -> opens SimulationControlModal pop-up.
 * 2. "📡 Live Feed" -> opens live MQTT stream drawer.
 */
export default function SimulationControlBar({ status, onStatusUpdate }) {
  const [mqttStatus, setMqttStatus] = useState(null);
  const [showMqttDrawer, setShowMqttDrawer] = useState(false);
  const [showControlModal, setShowControlModal] = useState(false);
  const [mqttTags, setMqttTags] = useState({});

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
    const timer = setInterval(fetchMqtt, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll live MQTT tags when drawer is open
  useEffect(() => {
    if (!showMqttDrawer) return;
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
  }, [showMqttDrawer]);

  const totalTags = mqttStatus?.total_live_tags || status?.mqtt?.total_live_tags || 51;
  const liveTagCount = Object.keys(mqttTags).length > 0 ? Object.keys(mqttTags).length : totalTags;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      {/* 1. Simulation Controls & Data Pop-up Launcher Button */}
      <button
        onClick={() => setShowControlModal(true)}
        style={{
          background: "#0284c7",
          color: "#ffffff",
          border: "1px solid #00f0ff",
          borderRadius: "6px",
          padding: "0.32rem 0.75rem",
          fontSize: "0.78rem",
          fontWeight: "700",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          transition: "all 0.2s ease",
          boxShadow: "0 0 10px rgba(0, 240, 255, 0.25)",
        }}
        title="Click to open Simulation Controller & Live Data Pop-up"
      >
        🎮 Simulation Controls & Data
      </button>

      {/* 2. Live Feed MQTT Drawer Button */}
      <button
        onClick={() => setShowMqttDrawer(!showMqttDrawer)}
        style={{
          background: showMqttDrawer ? "#0284c7" : "#1e293b",
          color: "#38bdf8",
          border: "1px solid #0284c7",
          borderRadius: "6px",
          padding: "0.32rem 0.75rem",
          fontSize: "0.78rem",
          fontWeight: "700",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          transition: "all 0.2s ease",
        }}
        title="Click to open Live MQTT Stream Feed"
      >
        📡 Live Feed ({liveTagCount} topics)
      </button>

      {/* Pop-up Simulation Controller & Live Data Modal */}
      <SimulationControlModal
        isOpen={showControlModal}
        onClose={() => setShowControlModal(false)}
        status={status}
        onStatusUpdate={onStatusUpdate}
      />

      {/* Live MQTT Stream Drawer Modal */}
      {showMqttDrawer && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            onClick={() => setShowMqttDrawer(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(2px)",
              cursor: "pointer",
            }}
          />

          <div
            style={{
              position: "relative",
              width: "420px",
              height: "100%",
              background: "#0f172a",
              borderLeft: "1px solid #1e293b",
              boxShadow: "-5px 0 25px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              padding: "1rem",
              boxSizing: "border-box",
              zIndex: 10000,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #1e293b", paddingBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.2rem" }}>📡</span>
                <span style={{ color: "#00f0ff", fontWeight: "700", fontSize: "0.9rem" }}>
                  MQTT Broker Live Feed
                </span>
              </div>
              <button
                onClick={() => setShowMqttDrawer(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {Object.keys(mqttTags).length === 0 ? (
                <div style={{ color: "#64748b", textAlign: "center", padding: "2rem 0", fontSize: "0.8rem" }}>
                  Waiting for active MQTT topic payloads...
                </div>
              ) : (
                Object.entries(mqttTags).map(([topic, payload]) => (
                  <div key={topic} style={{ background: "#162032", border: "1px solid #1e293b", borderRadius: "6px", padding: "0.6rem", fontSize: "0.72rem" }}>
                    <div style={{ color: "#38bdf8", fontWeight: "700", fontFamily: "monospace", marginBottom: "0.2rem" }}>
                      {topic}
                    </div>
                    <pre style={{ margin: 0, color: "#a7f3d0", fontFamily: "monospace", fontSize: "0.68rem", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
