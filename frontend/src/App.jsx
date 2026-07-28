import { useState, useEffect, useRef } from "react";
import { Menu, Activity, Radio } from "lucide-react";
import Flowsheet from "./pages/Flowsheet";
import MaintenancePage from "./pages/MaintenancePage";
import KnowledgeGraphPage from "./pages/KnowledgeGraphPage";
import NavigationSidebar from "./components/NavigationSidebar";
import {
  getSimulationStatus,
  startSimulation,
  pauseSimulation,
  resumeSimulation,
  stopSimulation,
  restartSimulation,
  setSimulationSpeed,
} from "./api/simulationApi";
import { API_BASE as API } from "./config/api.config";
import "./styles/App.css";

const DISPLAY_METRIC_NAMES = {
  "Feed Solid Flow": "Flow (t/h)",
  "Feed BPL": "Grade (% BPL)",
  "Feed P80": "P80 (µm)",
  "Feed Solid Fraction": "Solid Frac (%)",
  "Process Water Solid Flow": "PW Flow (t/h)",
  "Process Water Solid Fraction": "Solid Frac (%)",
  "Cyclone Feed Solid Flow": "Flow (t/h)",
  "Cyclone Feed BPL": "Grade (% BPL)",
  "Cyclone Feed P80": "P80 (µm)",
  "Cyclone Feed Solid Fraction": "Solid Frac (%)",
  "Cyclone Underflow Solid Flow": "Flow (t/h)",
  "Cyclone Underflow BPL": "Grade (% BPL)",
  "Cyclone Underflow P80": "P80 (µm)",
  "Cyclone Underflow Solid Fraction": "Solid Frac (%)",
  "Ball Mill Discharge Solid Flow": "Flow (t/h)",
  "Ball Mill Discharge BPL": "Grade (% BPL)",
  "Ball Mill Discharge P80": "P80 (µm)",
  "Ball Mill Discharge Solid Fraction": "Solid Frac (%)",
  "Output Slurry Solid Flow": "Flow (t/h)",
  "Output Slurry BPL": "Grade (% BPL)",
  "Output Slurry P80": "P80 (µm)",
  "Output Slurry Solid Fraction": "Solid Frac (%)",
  "Ambient_Temp_C": "Ambient Temp (°C)",
  "PB001_Level_pct": "Sump Level (%)",
  "PB001_Sump_Temp_C": "Sump Temp (°C)",
  "SP001_Motor_Current_A": "Current (A)",
  "SP001_Motor_Power_kW": "Power (kW)",
  "SP001_Discharge_Pressure_kPa": "Disch Press (kPa)",
  "SP001_Speed_RPM": "Speed (RPM)",
  "SP001_Bearing_Temp_C": "Bearing Temp (°C)",
  "SP001_Vibration_mms": "Vibration (mm/s)",
  "BM001_Power_Draw_kW": "Power Draw (kW)",
  "BM001_Motor_Current_A": "Motor Current (A)",
  "BM001_Mill_Speed_pctCritical": "Speed (% Crit)",
  "BM001_Bearing_DE_Temp_C": "Drive Bearing (°C)",
  "BM001_Bearing_NDE_Temp_C": "Non-Drive Bearing (°C)",
  "BM001_Vibration_mms": "Vibration RMS (mm/s)",
  "BM001_Sound_Level_dB": "Acoustic (dB)",
  "CY001_Inlet_Pressure_kPa": "Inlet Press (kPa)",
  "CY001_Vortex_DP_kPa": "Vortex DP (kPa)",
  "CY001_Apex_Wear_Index_pct": "Apex Wear (%)",
  "CY001_Cyclones_Online": "Cyclones Online",
  "Circulating_Load_Ratio_pct": "Circulating Load (%)",
  "Mill_Reduction_Ratio": "Reduction Ratio",
};

function getDisplayMetricName(key) {
  if (DISPLAY_METRIC_NAMES[key]) return DISPLAY_METRIC_NAMES[key];
  if (key.includes("Solid Flow")) return "Flow (t/h)";
  if (key.includes("Solid Fraction")) return "Solid Frac (%)";
  if (key.includes("BPL")) return "Grade (% BPL)";
  if (key.includes("P80")) return "P80 (µm)";
  return key;
}

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

function MetricCard({ label, value, unit }) {
  const numVal = typeof value === "number" ? value : parseFloat(value);
  const isValidNum = !isNaN(numVal);
  const displayStr = isValidNum ? numVal.toFixed(2) : (value || "0.00");

  let color = "#00f0ff";
  let percent = 50;

  if (label.includes("Temp") || label.includes("Vibration")) {
    if (isValidNum && numVal > 65) color = "#ef4444";
    else if (isValidNum && numVal > 45) color = "#f59e0b";
    percent = isValidNum ? Math.min(100, Math.max(15, (numVal / 100) * 100)) : 50;
  } else if (label.includes("Level") || label.includes("Solid Frac") || label.includes("Wear")) {
    percent = isValidNum ? Math.min(100, Math.max(5, numVal)) : 50;
  } else if (label.includes("Flow")) {
    percent = isValidNum ? Math.min(100, Math.max(10, (numVal / 1500) * 100)) : 40;
  } else if (label.includes("Power") || label.includes("Current") || label.includes("Pressure")) {
    percent = isValidNum ? Math.min(100, Math.max(15, (numVal / 2000) * 100)) : 60;
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #162032 0%, #0f172a 100%)",
        border: "1px solid #1e293b",
        borderRadius: "8px",
        padding: "0.6rem 0.75rem",
        display: "flex",
        flexDirection: "column",
        justify: "space-between",
        minHeight: "76px",
        boxSizing: "border-box",
        transition: "all 0.3s ease",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "600", lineHeight: "1.2" }} title={label}>
          {label}
        </span>
        {unit && <span style={{ color: "#64748b", fontSize: "10px", fontWeight: "700" }}>{unit}</span>}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", marginTop: "0.25rem" }}>
        <span style={{ color: color, fontFamily: "'JetBrains Mono', monospace", fontSize: "1.3rem", fontWeight: "800", lineHeight: "1.1", transition: "color 0.3s ease" }}>
          {displayStr}
        </span>
      </div>

      <div style={{ width: "100%", height: "4px", backgroundColor: "#1e293b", borderRadius: "2px", overflow: "hidden", marginTop: "0.35rem" }}>
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: "2px",
            boxShadow: `0 0 8px ${color}`,
            transition: "width 0.4s ease, background-color 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

const VALID_TABS = ["flowsheet", "maintenance", "knowledge-graph", "graph"];

const getInitialTab = () => {
  const hash = window.location.hash.replace("#", "");
  if (hash && VALID_TABS.includes(hash)) {
    return hash;
  }
  const saved = localStorage.getItem("activeTab");
  if (saved && VALID_TABS.includes(saved)) {
    return saved;
  }
  return "flowsheet";
};

export default function App() {
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
    if (window.location.hash !== `#${activeTab}`) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [asset, setAsset] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [simStatus, setSimStatus] = useState(null);

  const selectedTagRef = useRef(selectedTag);
  const [simStep, setSimStep] = useState(0);

  selectedTagRef.current = selectedTag;

  function getAssetStage(tag) {
    if (tag === "P_001" || tag === "P_101") return 1;
    if (tag === "PB_001" || tag === "SP_001" || tag === "P_002") return 2;
    if (tag === "CY_001" || tag === "P_003") return 3;
    if (tag === "P_006" || tag === "P_004" || tag === "BM_001") return 4;
    if (tag === "P_005") return 5;
    return 1;
  }

  function adjustAssetDataForStartup(data, currentSimStep, state) {
    if (!data || state !== "RUNNING" || currentSimStep >= 5 || currentSimStep === 0) return data;

    const stage = getAssetStage(data.tag);
    if (currentSimStep < stage) {
      const clone = JSON.parse(JSON.stringify(data));
      if (clone.live_metrics) {
        for (const k in clone.live_metrics) clone.live_metrics[k] = 0.0;
      }
      if (clone.derived_metrics) {
        for (const k in clone.derived_metrics) clone.derived_metrics[k] = 0.0;
      }
      if (clone.incoming_streams) {
        for (const s in clone.incoming_streams) {
          for (const k in clone.incoming_streams[s]) clone.incoming_streams[s][k] = 0.0;
        }
      }
      if (clone.outgoing_streams) {
        for (const s in clone.outgoing_streams) {
          for (const k in clone.outgoing_streams[s]) clone.outgoing_streams[s][k] = 0.0;
        }
      }
      return clone;
    }
    return data;
  }

  const loadAsset = async (tag) => {
    selectedTagRef.current = tag || null;
    if (!tag) {
      setAsset(null);
      setSelectedTag(null);
      return;
    }
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

  useEffect(() => {
    const fetchStatusAndTelemetry = async () => {
      try {
        const status = await getSimulationStatus();
        setSimStatus(status);

        const currentTag = selectedTagRef.current;
        if (currentTag) {
          const res = await fetch(`${API}/api/assets/${currentTag}`);
          if (res.ok) {
            setAsset(await res.json());
          }
        } else {
          setAsset(null);
        }
      } catch (err) {
        console.error("Telemetry polling error:", err);
      }
    };

    fetchStatusAndTelemetry();
    const interval = setInterval(fetchStatusAndTelemetry, 600);
    return () => clearInterval(interval);
  }, []);

  const displayAsset = adjustAssetDataForStartup(asset, simStep, simStatus?.state);

  const hasLiveMetrics = Boolean(displayAsset?.live_metrics && Object.keys(displayAsset.live_metrics).length > 0);
  const hasIncomingStreams = Boolean(displayAsset?.incoming_streams && Object.keys(displayAsset.incoming_streams).length > 0);
  const hasOutgoingStreams = Boolean(displayAsset?.outgoing_streams && Object.keys(displayAsset.outgoing_streams).length > 0);
  const hasDerivedMetrics = Boolean(asset?.derived_metrics && Object.keys(asset.derived_metrics).length > 0);

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
      <NavigationSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpen={() => setIsSidebarOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <header
        style={{
          height: "52px",
          flexShrink: 0,
          background: "#0f172a",
          borderBottom: "1px solid #1e293b",
          padding: "0 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              background: "#162032",
              border: "1px solid #1e293b",
              color: "#00f0ff",
              borderRadius: "6px",
              padding: "0.35rem 0.55rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            title="Toggle left navigation menu"
          >
            <Menu size={19} />
          </button>

          <h1 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "800", letterSpacing: "0.6px" }}>
            <span style={{ color: "#00f0ff", fontWeight: "900" }}>NEXUS</span> DIGITAL TWIN{" "}
            <span style={{ color: "#475569", fontWeight: "300", margin: "0 0.4rem" }}>|</span>{" "}
            <span style={{ color: "#38bdf8", fontWeight: "400", fontSize: "0.82rem" }}>
              {activeTab === "flowsheet" ? "Process Flowsheet & Control View" : activeTab === "maintenance" ? "Maintenance Circuit & Reliability View" : "Knowledge Graph & Topology View"}
            </span>
          </h1>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            fontSize: "0.72rem",
            color: "#94a3b8",
            background: "#162032",
            border: "1px solid #1e293b",
            padding: "0.25rem 0.65rem",
            borderRadius: "12px",
            userSelect: "none",
          }}
        >
          <span className="pulse-dot"></span>
          <span style={{ fontWeight: "700", color: "#f8fafc", letterSpacing: "0.5px" }}>
            SCADA ONLINE
          </span>
        </div>
      </header>

      {activeTab === "flowsheet" ? (
        <main
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(0, 3.6fr) minmax(260px, 1fr)",
            gap: "0.6rem",
            padding: "0.5rem",
            height: "calc(100vh - 52px)",
            maxHeight: "calc(100vh - 52px)",
            overflow: "hidden",
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          <section style={{ height: "100%", width: "100%", minWidth: 0, minHeight: 0, overflow: "hidden", position: "relative" }}>
            <Flowsheet 
              onSelect={loadAsset} 
              selected={asset?.tag} 
              isRunning={simStatus?.state === "RUNNING"} 
              onSimStepChange={setSimStep}
              isSimActive={simStatus?.state === "RUNNING" || simStatus?.state === "PAUSED"}
              simStatus={simStatus}
              onStartToggle={async () => {
                if (simStatus?.state === "RUNNING") {
                  setSimStatus(await pauseSimulation());
                } else {
                  setSimStatus(await startSimulation());
                }
              }}
              onRestart={async () => setSimStatus(await restartSimulation())}
              onStop={async () => setSimStatus(await stopSimulation())}
              onSpeedChange={async (spd) => setSimStatus(await setSimulationSpeed(spd))}
            />
          </section>

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
            <div
              style={{
                borderBottom: "1px solid #1e293b",
                paddingBottom: "0.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <h2 style={{ margin: 0, fontSize: "0.82rem", color: "#f8fafc", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Activity size={15} style={{ color: "#00f0ff" }} /> Telemetry Inspection
              </h2>
              <span
                style={{
                  fontSize: "0.65rem",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                  background: displayAsset?.mqtt?.active ? "rgba(16, 185, 129, 0.15)" : "rgba(56, 189, 248, 0.15)",
                  color: displayAsset?.mqtt?.active ? "#34d399" : "#38bdf8",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <Radio size={11} /> {displayAsset?.mqtt?.active ? "LIVE MQTT" : "SIM ENGINE"}
              </span>
            </div>

            {error && (
              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", color: "#fca5a5", padding: "0.5rem", borderRadius: "4px", fontSize: "0.75rem" }}>
                {error}
              </div>
            )}

            {displayAsset ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
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
                  <div style={{ fontSize: "1.15rem", fontWeight: "bold", color: "#00f0ff", letterSpacing: "0.5px" }}>{displayAsset.tag}</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "500" }}>{displayAsset.asset_type}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  <div style={{ background: "#162032", border: "1px solid #1e293b", padding: "0.5rem 0.65rem", borderRadius: "5px" }}>
                    <div style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Material
                    </div>
                    <div style={{ color: "#f8fafc", fontSize: "0.85rem", fontWeight: "600", marginTop: "0.1rem" }}>
                      {displayAsset.material || "N/A"}
                    </div>
                  </div>

                  <div style={{ background: "#162032", border: "1px solid #1e293b", padding: "0.5rem 0.65rem", borderRadius: "5px" }}>
                    <div style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Source
                    </div>
                    <div style={{ fontSize: "0.85rem", marginTop: "0.1rem" }}>
                      {renderSourceDestValue(displayAsset.source)}
                    </div>
                  </div>

                  <div style={{ background: "#162032", border: "1px solid #1e293b", padding: "0.5rem 0.65rem", borderRadius: "5px" }}>
                    <div style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Destination
                    </div>
                    <div style={{ fontSize: "0.85rem", marginTop: "0.1rem" }}>
                      {renderSourceDestValue(displayAsset.destination)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: "0.8rem", color: "#38bdf8", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>
                    {hasLiveMetrics ? "LIVE METRICS" : "STREAM TELEMETRY"}
                  </h3>

                  {hasLiveMetrics && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "0.4rem", width: "100%" }}>
                      {Object.entries(displayAsset.live_metrics).map(([key, val]) => (
                        <MetricCard key={key} label={getDisplayMetricName(key)} value={val} />
                      ))}
                    </div>
                  )}

                  {hasDerivedMetrics && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <h4 style={{ fontSize: "0.75rem", color: "#a855f7", marginBottom: "0.4rem", textTransform: "uppercase", fontWeight: "700" }}>
                        DERIVED ENGINEERING KPIS
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "0.4rem" }}>
                        {Object.entries(displayAsset.derived_metrics).map(([key, val]) => (
                          <MetricCard key={key} label={getDisplayMetricName(key)} value={val} />
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasLiveMetrics && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.4rem" }}>
                      {hasIncomingStreams && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>
                            Incoming Streams
                          </div>
                          {Object.entries(displayAsset.incoming_streams).map(([streamTag, metricsDict]) => (
                            <div key={streamTag} style={{ background: "#0f172a", border: "1px solid #1e293b", padding: "0.5rem", borderRadius: "6px" }}>
                              <div style={{ color: "#38bdf8", fontSize: "0.75rem", fontWeight: "700", marginBottom: "0.3rem" }}>
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

                      {hasOutgoingStreams && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>
                            Outgoing Streams
                          </div>
                          {Object.entries(displayAsset.outgoing_streams).map(([streamTag, metricsDict]) => (
                            <div key={streamTag} style={{ background: "#0f172a", border: "1px solid #1e293b", padding: "0.5rem", borderRadius: "6px" }}>
                              <div style={{ color: "#38bdf8", fontSize: "0.75rem", fontWeight: "700", marginBottom: "0.3rem" }}>
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
                Select an asset on the flowsheet to inspect metrics.
              </div>
            )}
          </aside>
        </main>
      ) : activeTab === "maintenance" ? (
        <main
          style={{
            flex: 1,
            height: "calc(100vh - 52px)",
            maxHeight: "calc(100vh - 52px)",
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          <MaintenancePage />
        </main>
      ) : (
        <main
          style={{
            flex: 1,
            height: "calc(100vh - 52px)",
            maxHeight: "calc(100vh - 52px)",
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          <KnowledgeGraphPage />
        </main>
      )}
    </div>
  );
}
