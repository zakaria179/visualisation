import React from "react";
import { Sun, Moon, Calendar, Clock } from "lucide-react";

/**
 * Clean SCADA Simulation Clock Widget.
 * Displays:
 * 1. Plant Simulation Operational Time & Date (from current dataset record).
 * 2. Plant Operational Shift Status (Day Shift vs. Night Shift) with Lucide vector icons.
 */
export default function ClockWidget({ status }) {
  // Extract simulation timestamp from backend status
  const rawTs = status?.timestamp || status?.simulation_time || "";
  const simState = status?.state || "STOPPED";
  const isPaused = simState === "PAUSED";
  const isStopped = simState === "STOPPED";

  let dateStr = "2026-07-01";
  let timeStr = "00:00:00";
  let hour = 0;

  if (rawTs.includes(" ")) {
    const parts = rawTs.split(" ");
    dateStr = parts[0] || "2026-07-01";
    timeStr = parts[1] ? parts[1].slice(0, 8) : "00:00:00";
  } else if (rawTs.includes("T")) {
    const parts = rawTs.split("T");
    dateStr = parts[0] || "2026-07-01";
    timeStr = parts[1] ? parts[1].slice(0, 8) : "00:00:00";
  } else if (rawTs.length >= 8) {
    timeStr = rawTs.slice(0, 8);
  }

  if (timeStr.includes(":")) {
    const h = parseInt(timeStr.split(":")[0], 10);
    if (!isNaN(h)) hour = h;
  }

  // Determine shift phase: Day Shift (06:00 - 17:59), Night Shift (18:00 - 05:59)
  const isDayShift = hour >= 6 && hour < 18;

  // Format Date cleanly (e.g. Jul 01, 2026)
  const formatDateLabel = (dStr) => {
    try {
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
      }
    } catch (e) {}
    return dStr;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        border: `1px solid ${isPaused ? "#f59e0b" : "#1e293b"}`,
        borderRadius: "8px",
        padding: "0.45rem 0.85rem",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
        userSelect: "none",
        transition: "border-color 0.2s ease",
      }}
    >
      {/* Shift Icon Badge */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.3rem 0.5rem",
          borderRadius: "6px",
          background: isDayShift ? "rgba(245, 158, 11, 0.12)" : "rgba(99, 102, 241, 0.15)",
          border: `1px solid ${isDayShift ? "rgba(245, 158, 11, 0.4)" : "rgba(99, 102, 241, 0.4)"}`,
          color: isDayShift ? "#fbbf24" : "#818cf8",
        }}
        title={isDayShift ? "Day Shift (06:00 - 18:00)" : "Night Shift (18:00 - 06:00)"}
      >
        {isDayShift ? <Sun size={18} /> : <Moon size={18} />}
        <span
          style={{
            fontSize: "0.58rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            marginTop: "0.15rem",
            textTransform: "uppercase",
          }}
        >
          {isDayShift ? "DAY" : "NIGHT"}
        </span>
      </div>

      {/* Single Simulation Clock */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", lineHeight: "1.1" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Clock size={14} style={{ color: isPaused ? "#f59e0b" : isStopped ? "#94a3b8" : "#00f0ff" }} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              fontSize: "1.15rem",
              fontWeight: "800",
              color: isPaused ? "#f59e0b" : isStopped ? "#94a3b8" : "#00f0ff",
              letterSpacing: "1px",
              textShadow: isPaused
                ? "0 0 10px rgba(245, 158, 11, 0.5)"
                : isStopped
                ? "none"
                : "0 0 10px rgba(0, 240, 255, 0.5)",
            }}
          >
            {timeStr}
          </span>
          {isPaused && (
            <span
              style={{
                fontSize: "0.6rem",
                fontWeight: "700",
                color: "#f59e0b",
                background: "rgba(245, 158, 11, 0.15)",
                padding: "0.05rem 0.25rem",
                borderRadius: "3px",
                textTransform: "uppercase",
              }}
            >
              PAUSED
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.2rem" }}>
          <Calendar size={11} style={{ color: "#94a3b8" }} />
          <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: "600" }}>
            {formatDateLabel(dateStr)}
          </span>
        </div>
      </div>
    </div>
  );
}
