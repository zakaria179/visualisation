import { useState, useEffect, useRef } from "react";
import Flowsheet from "./Flowsheet";
import SimulationControlBar from "./SimulationControlBar";
import { getSimulationStatus } from "./simulationApi";

const API = "http://localhost:8000";

// Dictionary mapping long backend CSV column keys to clean, short UI display labels
const DISPLAY_METRIC_NAMES = {
  "Feed Solid Flow": "Flow",
  "Feed BPL": "BPL",
  "Feed P80": "P80",
  "Feed Solid Fraction": "Solid Fraction",
  "Process Water Solid Flow": "PW Flow",
  "Process Water Solid Fraction": "Solid Fraction",
  "Cyclone Feed Solid Flow": "Flow",
  "Cyclone Feed BPL": "BPL",
  "Cyclone Feed P80": "P80",
  "Cyclone Feed Solid Fraction": "Solid Fraction",
  "Cyclone Underflow Solid Flow": "Flow",
  "Cyclone Underflow BPL": "BPL",
  "Cyclone Underflow P80": "P80",
  "Cyclone Underflow Solid Fraction": "Solid Fraction",
  "Ball Mill Discharge Solid Flow": "Flow",
  "Ball Mill Discharge BPL": "BPL",
  "Ball Mill Discharge P80": "P80",
  "Ball Mill Discharge Solid Fraction": "Solid Fraction",
  "Output Slurry Solid Flow": "Flow",
  "Output Slurry BPL": "BPL",
  "Output Slurry P80": "P80",
  "Output Slurry Solid Fraction": "Solid Fraction",
  "RecordNo": "Record No",
  "Time": "Time",
  "ElapsedHrs": "Elapsed Hrs",
};

/**
 * Format CSV stream metric keys for UI display.
 */
function getDisplayMetricName(key) {
  if (DISPLAY_METRIC_NAMES[key]) return DISPLAY_METRIC_NAMES[key];
  if (key.includes("Solid Flow")) return "Flow";
  if (key.includes("Solid Fraction")) return "Solid Fraction";
  if (key.includes("BPL")) return "BPL";
  if (key.includes("P80")) return "P80";
  return key;
}

/**
 * Format derived KPI keys for UI display.
 */
function formatDerivedMetricKey(key) {
  if (DERIVED_KEY_LABELS[key]) return DERIVED_KEY_LABELS[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Helper to render Source/Destination values.
 * Formats "Equipment Name (TAG)" onto two lines if applicable, preventing text truncation.
 */
function renderSourceDestValue(val) {
  if (!val) return <span style={{ color: "#64748b" }}>N/A</span>;
  const items = Array.isArray(val) ? val : [val];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.2rem" }}>
      {items.map((item, idx) => {
        const match = item.match(/^(.*?)\s*\(([^)]+)\)$/);
        if (match) {
          return (
            <div key={idx} style={{ lineHeight: "1.3" }}>
              <div style={{ color: "#f8fafc", fontWeight: "600" }}>{match[1]}</div>
              <div style={{ color: "#38bdf8", fontSize: "0.75rem", fontWeight: "700" }}>({match[2]})</div>
            </div>
          );
        }
        return (
          <div key={idx} style={{ color: "#38bdf8", fontWeight: "600", wordBreak: "break-word", whiteSpace: "normal" }}>
            {item}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Single Reusable Telemetry Metric Card
 */
function MetricCard({ label, value }) {
  return (
    <div
      style={{
        background: "#162032",
        border: "1px solid #1e293b",
        padding: "0.55rem 0.65rem",
        borderRadius: "6px",
        display: "flex",
        flexDirection: "column",
        justify: "space-between",
        minHeight: "72px",
        boxSizing: "border-box",
      }}
    >
      <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600", lineHeight: "1.2" }} title={label}>
        {label}
      </span>
      <span style={{ color: "#00f0ff", fontFamily: "monospace", fontSize: "24px", fontWeight: "700", lineHeight: "1.1", marginTop: "0.2rem" }}>
        {typeof value === "number" ? value.toFixed(2) : value}
      </span>
    </div>
  );
}

export default function App() {
  const [asset, setAsset] = useState(null);
  const [selectedTag, setSelectedTag] = useState("P_001");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [simStatus, setSimStatus] = useState(null);

  // Ref to hold current selected tag for background polling
  const selectedTagRef = useRef(selectedTag);
  selectedTagRef.current = selectedTag;

  const loadAsset = async (tag) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/assets/${tag}`);
      if (!res.ok) {
        throw new Error(`Failed to load asset ${tag}`);
      }
      const data = await res.json();
      setAsset(data);
      setSelectedTag(tag);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Poll simulation status every 500ms
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await getSimulationStatus();
        setSimStatus(status);

        // Auto-refresh asset telemetry while simulation is RUNNING
        if (status.state === "RUNNING") {
          const currentTag = selectedTagRef.current || "P_001";
          const res = await fetch(`${API}/api/assets/${currentTag}`);
          if (res.ok) {
            setAsset(await res.json());
          }
        }
      } catch (err) {
        console.error("Status polling error:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 500);
    return () => clearInterval(interval);
  }, []);

  const hasLiveMetrics = Boolean(asset?.live_metrics && Object.keys(asset.live_metrics).length > 0);
  const hasIncomingStreams = Boolean(asset?.incoming_streams && Object.keys(asset.incoming_streams).length > 0);
  const hasOutgoingStreams = Boolean(asset?.outgoing_streams && Object.keys(asset.outgoing_streams).length > 0);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        maxHeight: "100vh",
        maxWidth: "100vw",
        backgroundColor: "#090d16",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Top SCADA Header with Simulation Control Bar */}
      <header
        style={{
          height: "48px",
          flexShrink: 0,
          background: "#0f172a",
          borderBottom: "1px solid #1e293b",
          padding: "0 1rem",
          display: "flex",
          justify: "space-between",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", letterSpacing: "0.5px" }}>
            DIGITAL TWIN <span style={{ color: "#38bdf8", fontWeight: "300" }}>| SysCAD Dashboard</span>
          </h1>
        </div>

        {/* Integrated Simulation Control Bar */}
        <SimulationControlBar status={simStatus} onStatusUpdate={setSimStatus} />
      </header>

      {/* Main Grid Viewport */}
      <main
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(0, 3.6fr) minmax(240px, 1fr)",
          gap: "0.6rem",
          padding: "0.5rem",
          height: "calc(100vh - 48px)",
          maxHeight: "calc(100vh - 48px)",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Left Panel: Scaled Interactive Process Flow Diagram */}
        <section style={{ height: "100%", width: "100%", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
          <Flowsheet onSelect={loadAsset} selected={asset?.tag} />
        </section>

        {/* Right Panel: Adaptive Telemetry Inspection Panel */}
        <aside
          style={{
            height: "100%",
            minWidth: 0,
            minHeight: 0,
            background: "#0f172a",
            borderRadius: "8px",
            border: "1px solid #1e293b",
            padding: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            overflowY: "auto",
            overflowX: "hidden",
            boxSizing: "border-box",
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              borderBottom: "1px solid #1e293b",
              paddingBottom: "0.5rem",
              display: "flex",
              justify: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <h2 style={{ margin: 0, fontSize: "0.88rem", color: "#f8fafc", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Telemetry Inspection
            </h2>
            {loading && <span style={{ color: "#00f0ff", fontSize: "0.7rem" }}>Updating...</span>}
          </div>

          {error && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", color: "#fca5a5", padding: "0.5rem", borderRadius: "4px", fontSize: "0.75rem" }}>
              {error}
            </div>
          )}

          {asset ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
              {/* Asset Header Banner */}
              <div
                style={{
                  background: "#162032",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "6px",
                  borderLeft: "4px solid #00f0ff",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                }}
              >
                <div style={{ fontSize: "1.15rem", fontWeight: "bold", color: "#00f0ff", letterSpacing: "0.5px" }}>{asset.tag}</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "500" }}>{asset.asset_type}</div>
              </div>

              {/* Stacked Metadata Cards (Material, Source, Destination) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {/* Material */}
                <div style={{ background: "#162032", border: "1px solid #1e293b", padding: "0.5rem 0.65rem", borderRadius: "5px" }}>
                  <div style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Material
                  </div>
                  <div style={{ color: "#f8fafc", fontSize: "0.88rem", fontWeight: "600", marginTop: "0.2rem", wordBreak: "break-word", whiteSpace: "normal" }}>
                    {asset.material || "N/A"}
                  </div>
                </div>

                {/* Source */}
                <div style={{ background: "#162032", border: "1px solid #1e293b", padding: "0.5rem 0.65rem", borderRadius: "5px" }}>
                  <div style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Source
                  </div>
                  <div style={{ fontSize: "0.85rem", marginTop: "0.1rem" }}>
                    {renderSourceDestValue(asset.source)}
                  </div>
                </div>

                {/* Destination */}
                <div style={{ background: "#162032", border: "1px solid #1e293b", padding: "0.5rem 0.65rem", borderRadius: "5px" }}>
                  <div style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Destination
                  </div>
                  <div style={{ fontSize: "0.85rem", marginTop: "0.1rem" }}>
                    {renderSourceDestValue(asset.destination)}
                  </div>
                </div>
              </div>

              {/* Dynamic Section Renderer */}
              <div>
                <h3 style={{ fontSize: "0.82rem", color: "#38bdf8", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>
                  {hasLiveMetrics ? "LIVE STREAM METRICS" : "PROCESS SUMMARY"}
                </h3>

                {/* CASE 1: STREAM ASSETS (PIPES WITH LIVE METRICS) */}
                {hasLiveMetrics && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "0.4rem", width: "100%" }}>
                    {Object.entries(asset.live_metrics).map(([key, val]) => (
                      <MetricCard key={key} label={getDisplayMetricName(key)} value={val} />
                    ))}
                  </div>
                )}

                {/* CASE 2: EQUIPMENT ASSETS (PROCESS SUMMARY WITH STREAMS) */}
                {!hasLiveMetrics && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {/* SECTION 1: INCOMING STREAMS */}
                    {hasIncomingStreams && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Incoming Streams
                        </div>
                        {Object.entries(asset.incoming_streams).map(([streamTag, metricsDict]) => (
                          <div key={streamTag} style={{ background: "#0f172a", border: "1px solid #1e293b", padding: "0.5rem", borderRadius: "6px" }}>
                            <div style={{ color: "#38bdf8", fontSize: "0.75rem", fontWeight: "700", marginBottom: "0.4rem" }}>
                              Stream {streamTag}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.35rem" }}>
                              {Object.entries(metricsDict).map(([colKey, val]) => (
                                <MetricCard key={colKey} label={getDisplayMetricName(colKey)} value={val} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SECTION 2: OUTGOING STREAMS */}
                    {hasOutgoingStreams && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Outgoing Streams
                        </div>
                        {Object.entries(asset.outgoing_streams).map(([streamTag, metricsDict]) => (
                          <div key={streamTag} style={{ background: "#0f172a", border: "1px solid #1e293b", padding: "0.5rem", borderRadius: "6px" }}>
                            <div style={{ color: "#38bdf8", fontSize: "0.75rem", fontWeight: "700", marginBottom: "0.4rem" }}>
                              Stream {streamTag}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.35rem" }}>
                              {Object.entries(metricsDict).map(([colKey, val]) => (
                                <MetricCard key={colKey} label={getDisplayMetricName(colKey)} value={val} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ color: "#64748b", textAlign: "center", padding: "2rem 0", fontSize: "0.85rem" }}>
              Click any element on the flowsheet to inspect metrics.
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
