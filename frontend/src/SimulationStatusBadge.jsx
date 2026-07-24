import React from "react";

const STATE_CONFIG = {
  RUNNING: { label: "RUNNING", icon: "▶", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "#10b981" },
  PAUSED: { label: "PAUSED", icon: "⏸", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b" },
  STOPPED: { label: "STOPPED", icon: "⏹", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)", border: "#64748b" },
  FINISHED: { label: "FINISHED", icon: "✔", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6" },
  ERROR: { label: "ERROR", icon: "⚠", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444" },
};

/**
 * Status badge displaying color-coded simulation state indicator.
 */
export default function SimulationStatusBadge({ state }) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.STOPPED;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.15rem 0.55rem",
        borderRadius: "12px",
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        fontSize: "0.75rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        boxShadow: `0 0 8px ${config.bg}`,
        userSelect: "none",
      }}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}
