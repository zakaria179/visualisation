import React from "react";
import { Play, Pause, Square, CheckCircle2, AlertTriangle } from "lucide-react";

/**
 * Status badge displaying color-coded simulation state indicator with Lucide icons.
 */
export default function SimulationStatusBadge({ state }) {
  const isRunning = state === "RUNNING";
  const isPaused = state === "PAUSED";
  const isFinished = state === "FINISHED";
  const isError = state === "ERROR";

  const config = isRunning
    ? { label: "RUNNING", Icon: Play, color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "#10b981" }
    : isPaused
    ? { label: "PAUSED", Icon: Pause, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b" }
    : isFinished
    ? { label: "FINISHED", Icon: CheckCircle2, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6" }
    : isError
    ? { label: "ERROR", Icon: AlertTriangle, color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444" }
    : { label: "STOPPED", Icon: Square, color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)", border: "#64748b" };

  const BadgeIcon = config.Icon;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.2rem 0.65rem",
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
      <BadgeIcon size={12} />
      <span>{config.label}</span>
    </div>
  );
}
