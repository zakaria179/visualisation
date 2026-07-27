import React, { useState, useEffect } from "react";
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Lightbulb,
  X,
  Cpu,
  BarChart2,
  Layers,
} from "lucide-react";
import Flowsheet from "./Flowsheet";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const API = "http://localhost:8000";

/**
 * Color helper for criticality badges.
 */
function getCriticalityBadge(criticality) {
  const crit = (criticality || "").toLowerCase();
  if (crit === "critical") {
    return { bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444", text: "#f87171" };
  }
  if (crit === "high") {
    return { bg: "rgba(249, 115, 22, 0.15)", border: "#f97316", text: "#fb923c" };
  }
  return { bg: "rgba(234, 179, 8, 0.15)", border: "#eab308", text: "#facc15" };
}

const TAG_COLORS = [
  "#00f0ff", // Bright Cyan
  "#f43f5e", // Rose Red
  "#fbbf24", // Amber Yellow
  "#a855f7", // Purple
  "#38bdf8", // Sky Blue
  "#10b981", // Emerald Green
];

export default function MaintenancePage() {
  const [equipmentList, setEquipmentList] = useState([]);
  const [selectedEqId, setSelectedEqId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);

  // Fetch equipment maintenance list
  const fetchEquipment = async () => {
    try {
      const res = await fetch(`${API}/api/maintenance/equipment`);
      if (res.ok) {
        const data = await res.json();
        setEquipmentList(data);
        setError(null);
      } else {
        setError("Failed to load maintenance equipment records.");
      }
    } catch (e) {
      console.error("Error fetching maintenance equipment:", e);
      setError("Unable to connect to backend server.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
    const interval = setInterval(fetchEquipment, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch single asset detail when selected
  useEffect(() => {
    if (!selectedEqId) {
      setDetailData(null);
      return;
    }
    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await fetch(`${API}/api/maintenance/equipment/${selectedEqId}`);
        if (res.ok) {
          const data = await res.json();
          setDetailData(data);
        }
      } catch (e) {
        console.error("Error fetching detail:", e);
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [selectedEqId]);

  // Compute Summary KPIs
  const totalAssets = equipmentList.length;
  const overdueCount = equipmentList.filter((e) => e.is_overdue).length;
  const criticalCount = equipmentList.filter(
    (e) => (e.criticality || "").toLowerCase() === "critical"
  ).length;
  const avgMtbf =
    totalAssets > 0
      ? Math.round(
          equipmentList.reduce((sum, e) => sum + (e.MTBF_hours || 0), 0) / totalAssets
        )
      : 0;

  // Process history trend data for Recharts
  const formatHistoryForChart = (historyData) => {
    if (!historyData || !Array.isArray(historyData)) return [];
    return historyData.map((row) => {
      const ts = row.Timestamp || row.Time || "";
      const timeLabel = ts.includes(" ") ? ts.split(" ")[1].slice(0, 5) : ts.slice(0, 5);
      const entry = { time: timeLabel };
      Object.keys(row).forEach((col) => {
        if (!["Timestamp", "RecordNo", "ElapsedHrs", "ElapsedMin", "dt"].includes(col)) {
          const val = parseFloat(row[col]);
          entry[col] = isNaN(val) ? 0 : val;
        }
      });
      return entry;
    });
  };

  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        color: "#f8fafc",
        maxWidth: "1450px",
        margin: "0 auto",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      {/* Page Title & Header Bar */}
      <div
        style={{
          display: "flex",
          justify: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: "800",
              color: "#00f0ff",
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Wrench size={22} style={{ color: "#00f0ff" }} /> Maintenance Circuit & Asset Reliability Intelligence
          </h2>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid #ef4444",
              color: "#f87171",
              fontSize: "0.78rem",
              padding: "0.35rem 0.7rem",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <AlertTriangle size={14} /> {error}
          </div>
        )}
      </div>

      {/* KPI Overview Cards Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
        }}
      >
        <div style={{ background: "#162032", border: "1px solid #1e293b", borderRadius: "8px", padding: "0.65rem 0.85rem" }}>
          <div style={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: "700" }}>TOTAL EQUIPMENT UNITS</div>
          <div style={{ color: "#00f0ff", fontSize: "1.5rem", fontWeight: "800", marginTop: "0.15rem" }}>{totalAssets}</div>
        </div>

        <div style={{ background: "#162032", border: `1px solid ${overdueCount > 0 ? "#ef4444" : "#1e293b"}`, borderRadius: "8px", padding: "0.65rem 0.85rem" }}>
          <div style={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: "700" }}>OVERDUE MAINTENANCE</div>
          <div style={{ color: overdueCount > 0 ? "#ef4444" : "#10b981", fontSize: "1.5rem", fontWeight: "800", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {overdueCount} {overdueCount > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          </div>
        </div>

        <div style={{ background: "#162032", border: "1px solid #1e293b", borderRadius: "8px", padding: "0.65rem 0.85rem" }}>
          <div style={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: "700" }}>CRITICAL ASSETS</div>
          <div style={{ color: "#fb923c", fontSize: "1.5rem", fontWeight: "800", marginTop: "0.15rem" }}>
            {criticalCount} <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Critical</span>
          </div>
        </div>

        <div style={{ background: "#162032", border: "1px solid #1e293b", borderRadius: "8px", padding: "0.65rem 0.85rem" }}>
          <div style={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: "700" }}>FLEET AVERAGE MTBF</div>
          <div style={{ color: "#38bdf8", fontSize: "1.5rem", fontWeight: "800", marginTop: "0.15rem" }}>
            {avgMtbf} <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>hours</span>
          </div>
        </div>
      </div>

      {/* Equipment Quick Selector Pills */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700" }}>Quick Inspect:</span>
        {equipmentList.map((item) => {
          const isSelected = selectedEqId === item.equipment_id;
          const critBadge = getCriticalityBadge(item.criticality);
          return (
            <button
              key={item.equipment_id}
              onClick={() => setSelectedEqId(item.equipment_id)}
              style={{
                background: isSelected ? "#0284c7" : "#162032",
                color: isSelected ? "#ffffff" : "#f8fafc",
                border: `1px solid ${item.is_overdue ? "#ef4444" : isSelected ? "#00f0ff" : "#1e293b"}`,
                borderRadius: "6px",
                padding: "0.3rem 0.65rem",
                fontSize: "0.75rem",
                fontWeight: "700",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                transition: "all 0.15s ease",
              }}
            >
              <span>{item.equipment_name}</span>
              <span style={{ fontSize: "0.65rem", color: critBadge.text, background: critBadge.bg, padding: "0.05rem 0.3rem", borderRadius: "3px" }}>
                {item.is_overdue ? "OVERDUE" : item.days_until_due < 0 ? "DUE" : `${item.days_until_due}d`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Circuit Drawing Viewport */}
      <div
        style={{
          background: "#090d16",
          border: "1px solid #1e293b",
          borderRadius: "10px",
          height: "520px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Flowsheet
          onSelect={(tag) => setSelectedEqId(tag)}
          selected={selectedEqId}
        />
      </div>

      {/* Pop-up Modal: Machine Maintenance History & Health Trends */}
      {selectedEqId && detailData && (
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
          {/* Backdrop */}
          <div
            onClick={() => setSelectedEqId(null)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(4px)",
              cursor: "pointer",
            }}
          />

          {/* Modal Container */}
          <div
            style={{
              position: "relative",
              width: "640px",
              maxHeight: "90vh",
              background: "#0f172a",
              border: "1px solid #00f0ff",
              borderRadius: "12px",
              padding: "1.35rem",
              boxSizing: "border-box",
              zIndex: 10000,
              overflowY: "auto",
              boxShadow: "0 10px 40px rgba(0, 240, 255, 0.25)",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", borderBottom: "1px solid #1e293b", paddingBottom: "0.75rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h3 style={{ margin: 0, color: "#00f0ff", fontSize: "1.2rem", fontWeight: "800" }}>
                    {detailData.equipment.equipment_name}
                  </h3>
                  <span
                    style={{
                      background: getCriticalityBadge(detailData.equipment.criticality).bg,
                      border: `1px solid ${getCriticalityBadge(detailData.equipment.criticality).border}`,
                      color: getCriticalityBadge(detailData.equipment.criticality).text,
                      fontSize: "0.68rem",
                      fontWeight: "700",
                      padding: "0.15rem 0.45rem",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    {detailData.equipment.criticality}
                  </span>
                </div>
                <div style={{ color: "#38bdf8", fontSize: "0.78rem", fontFamily: "monospace", marginTop: "0.15rem" }}>
                  ID: {detailData.equipment.equipment_id} • {detailData.equipment.type} • {detailData.equipment.manufacturer} {detailData.equipment.model}
                </div>
              </div>

              <button
                onClick={() => setSelectedEqId(null)}
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

            {/* Maintenance Status & Due Dates Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.6rem",
                background: "#162032",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                padding: "0.75rem",
                marginBottom: "1rem",
                fontSize: "0.75rem",
              }}
            >
              <div>
                <div style={{ color: "#64748b", fontSize: "0.68rem" }}>LAST MAINTENANCE</div>
                <div style={{ color: "#f8fafc", fontWeight: "700", marginTop: "0.1rem" }}>
                  {detailData.equipment.last_maintenance_date}
                </div>
                <div style={{ color: "#94a3b8", fontSize: "0.65rem" }}>
                  ({detailData.equipment.days_since_last_maintenance} days ago)
                </div>
              </div>

              <div>
                <div style={{ color: "#64748b", fontSize: "0.68rem" }}>NEXT MAINTENANCE DUE</div>
                <div style={{ color: detailData.equipment.is_overdue ? "#ef4444" : "#34d399", fontWeight: "700", marginTop: "0.1rem" }}>
                  {detailData.equipment.next_maintenance_due}
                </div>
                <div style={{ color: detailData.equipment.is_overdue ? "#ef4444" : "#94a3b8", fontSize: "0.65rem", fontWeight: "700" }}>
                  {detailData.equipment.is_overdue ? `OVERDUE (${Math.abs(detailData.equipment.days_until_due)} days)` : `Due in ${detailData.equipment.days_until_due} days`}
                </div>
              </div>

              <div>
                <div style={{ color: "#64748b", fontSize: "0.68rem" }}>RELIABILITY METRICS</div>
                <div style={{ color: "#00f0ff", fontFamily: "monospace", fontWeight: "700", marginTop: "0.1rem" }}>
                  MTBF: {detailData.equipment.MTBF_hours}h / MTTR: {detailData.equipment.MTTR_hours}h
                </div>
                <div style={{ color: "#94a3b8", fontSize: "0.65rem" }}>
                  Condition: {detailData.equipment.condition_status}
                </div>
              </div>
            </div>

            {/* Additional Metadata */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.75rem", marginBottom: "1rem", background: "rgba(15, 23, 42, 0.6)", padding: "0.65rem", borderRadius: "6px" }}>
              <div><span style={{ color: "#64748b" }}>Install Date:</span> <strong style={{ color: "#cbd5e1" }}>{detailData.equipment.install_date}</strong></div>
              <div><span style={{ color: "#64748b" }}>Rated Capacity:</span> <strong style={{ color: "#cbd5e1" }}>{detailData.equipment.rated_capacity}</strong></div>
              <div><span style={{ color: "#64748b" }}>Running Hours:</span> <strong style={{ color: "#00f0ff" }}>{detailData.equipment.running_hours} hrs</strong></div>
              <div><span style={{ color: "#64748b" }}>Last Failure Mode:</span> <strong style={{ color: "#f87171" }}>{detailData.equipment.last_failure_mode}</strong></div>
            </div>

            {/* Visual Sanity Check Banner */}
            <div
              style={{
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                borderRadius: "6px",
                padding: "0.65rem 0.75rem",
                marginBottom: "1rem",
                fontSize: "0.72rem",
                color: "#cbd5e1",
                lineHeight: "1.4",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <Lightbulb size={16} style={{ color: "#00f0ff", flexShrink: 0, marginTop: "0.1rem" }} />
              <div>
                <strong style={{ color: "#38bdf8" }}>Visual Sanity Check:</strong> Inspect recent sensor parameter trends (bearing temp, vibration RMS, motor current) relative to the last maintenance date (<strong>{detailData.equipment.last_maintenance_date}</strong>) to confirm parameter resets post-maintenance servicing.
              </div>
            </div>

            {/* Recent Health Trends Recharts Line Chart */}
            <div>
              <div style={{ color: "#38bdf8", fontSize: "0.8rem", fontWeight: "700", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <BarChart2 size={15} /> RECENT MACHINE HEALTH PARAMETER TRENDS
              </div>

              {loadingDetail ? (
                <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                  Loading machine health history...
                </div>
              ) : !detailData.health_history || detailData.health_history.length === 0 ? (
                <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "0.8rem" }}>
                  No telemetry history available for this asset.
                </div>
              ) : (
                <div style={{ width: "100%", height: "230px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={formatHistoryForChart(detailData.health_history)}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: "6px",
                          fontSize: "11px",
                          color: "#f8fafc",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }} />

                      {detailData.health_history.length > 0 &&
                        Object.keys(detailData.health_history[0])
                          .filter(
                            (col) =>
                              !["Timestamp", "RecordNo", "ElapsedHrs", "ElapsedMin", "dt"].includes(col)
                          )
                          .map((col, idx) => (
                            <Line
                              key={col}
                              type="monotone"
                              dataKey={col}
                              stroke={TAG_COLORS[idx % TAG_COLORS.length]}
                              dot={false}
                              strokeWidth={2}
                              name={col}
                            />
                          ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
