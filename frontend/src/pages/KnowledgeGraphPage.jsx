import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Share2,
  Cpu,
  Layers,
  Activity,
  Search,
  Zap,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Eye,
  EyeOff,
  Route,
  Clock,
  DollarSign,
  Wrench,
  X,
  FileText,
  Play,
  Pause,
  Wand2,
  ZoomIn,
  ZoomOut,
  ChevronRight,
} from "lucide-react";

import { API_BASE as API } from "../config/api.config.js";

const DISPLAY_METRIC_NAMES = {
  // Raw CSV Telemetry
  "Feed Solid Flow": "Solid Flow",
  "Feed BPL": "Grade",
  "Feed P80": "P80",
  "Feed Solid Fraction": "Solid Frac",
  "Process Water Solid Flow": "Solid Flow",
  "Process Water Solid Fraction": "Solid Frac",
  "Cyclone Feed Solid Flow": "Solid Flow",
  "Cyclone Feed BPL": "Grade",
  "Cyclone Feed P80": "P80",
  "Cyclone Feed Solid Fraction": "Solid Frac",
  "Cyclone Underflow Solid Flow": "Solid Flow",
  "Cyclone Underflow BPL": "Grade",
  "Cyclone Underflow P80": "P80",
  "Cyclone Underflow Solid Fraction": "Solid Frac",
  "Ball Mill Discharge Solid Flow": "Solid Flow",
  "Ball Mill Discharge BPL": "Grade",
  "Ball Mill Discharge P80": "P80",
  "Ball Mill Discharge Solid Fraction": "Solid Frac",
  "Output Slurry Solid Flow": "Solid Flow",
  "Output Slurry BPL": "Grade",
  "Output Slurry P80": "P80",
  "Output Slurry Solid Fraction": "Solid Frac",
  "Ambient_Temp_C": "Ambient Temp",
  "PB001_Level_pct": "Sump Level",
  "PB001_Sump_Temp_C": "Sump Temp",
  "SP001_Motor_Current_A": "Current",
  "SP001_Motor_Power_kW": "Power",
  "SP001_Discharge_Pressure_kPa": "Disch Press",
  "SP001_Speed_RPM": "Speed",
  "SP001_Bearing_Temp_C": "Bearing Temp",
  "SP001_Vibration_mms": "Vibration",
  "BM001_Power_Draw_kW": "Power Draw",
  "BM001_Motor_Current_A": "Motor Current",
  "BM001_Mill_Speed_pctCritical": "Speed",
  "BM001_Bearing_DE_Temp_C": "Drive Bearing",
  "BM001_Bearing_NDE_Temp_C": "Non-Drive Bearing",
  "BM001_Vibration_mms": "Vibration RMS",
  "BM001_Sound_Level_dB": "Acoustic",
  "CY001_Inlet_Pressure_kPa": "Inlet Press",
  "CY001_Vortex_DP_kPa": "Vortex DP",
  "CY001_Apex_Wear_Index_pct": "Apex Wear",
  "CY001_Cyclones_Online": "Cyclones Online",
  "Circulating_Load_Ratio_pct": "Circulating Load",
  "Mill_Reduction_Ratio": "Reduction Ratio",

  // Derived Engineering Metrics
  "delta_p80": "Size Reduction",
  "input_flow": "Input Flow",
  "output_flow": "Output Flow",
  "flow_difference": "Flow Variance",
  "feed_flow": "Feed Flow",
  "underflow_flow": "Underflow Flow",
  "overflow_flow": "Overflow Flow",
  "underflow_pct": "Underflow Ratio",
  "overflow_pct": "Overflow Ratio",
  "total_inflow": "Total Inflow",
  "outflow": "Outflow",
  "flow_balance": "Flow Balance",
  "suction_flow": "Suction Flow",
  "discharge_flow": "Discharge Flow",
};

function getDisplayMetricName(key) {
  if (!key) return "";
  if (DISPLAY_METRIC_NAMES[key]) return DISPLAY_METRIC_NAMES[key];

  let cleanName = String(key);
  if (cleanName.includes("Solid Flow")) return "Flow";
  if (cleanName.includes("Solid Fraction")) return "Solid Frac";
  if (cleanName.includes("BPL")) return "Grade";
  if (cleanName.includes("P80")) return "P80";

  return cleanName
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
}

function getMetricUnit(key) {
  if (!key) return "";
  const k = String(key).toLowerCase();

  if (k.includes("p80") || k.includes("delta_p80")) return "µm";
  if (k.includes("bpl")) return "% BPL";
  if (k.includes("pct") || k.includes("fraction") || k.includes("level") || k.includes("wear") || k.includes("_pct")) return "%";
  if (k.includes("flow") || k.includes("inflow") || k.includes("outflow")) return "t/h";
  if (k.includes("temp")) return "°C";
  if (k.includes("pressure") || k.includes("kpa") || k.includes("vortex_dp")) return "kPa";
  if (k.includes("kw") || k.includes("power")) return "kW";
  if (k.includes("current") || k.endsWith("_a")) return "A";
  if (k.includes("rpm") || k.includes("speed")) return "RPM";
  if (k.includes("vibration") || k.includes("mms")) return "mm/s";
  if (k.includes("sound") || k.includes("db")) return "dB";
  if (k.includes("online") || k.includes("num_")) return "units";

  return "";
}

/* ─────────────────────────────────────────────
   DESIGN SYSTEM — Node Types & Styling
   ───────────────────────────────────────────── */
const TYPE_CONFIG = {
  Equipment: {
    radius: 20,
    fill: "#162032",
    stroke: "#64748b",
    glowColor: "rgba(100, 116, 139, 0.4)",
    color: "#f8fafc",
    label: "Process Unit",
  },
  Stream: {
    radius: 14,
    fill: "#162032",
    stroke: "#475569",
    glowColor: "rgba(71, 85, 105, 0.4)",
    color: "#cbd5e1",
    label: "Pipeline",
  },
  Sensor: {
    radius: 14,
    fill: "#162032",
    stroke: "#0284c7",
    glowColor: "rgba(2, 132, 199, 0.4)",
    color: "#38bdf8",
    label: "SCADA Tag",
  },
  FailureMode: {
    radius: 14,
    fill: "#2d0f0f",
    stroke: "#ef4444",
    glowColor: "rgba(239, 68, 68, 0.45)",
    color: "#ef4444",
    label: "Failure Risk",
  },
  WorkOrder: {
    radius: 13,
    fill: "#162032",
    stroke: "#94a3b8",
    glowColor: "rgba(148, 163, 184, 0.3)",
    color: "#cbd5e1",
    label: "Work Order",
  },
  Technician: {
    radius: 13,
    fill: "#162032",
    stroke: "#94a3b8",
    glowColor: "rgba(148, 163, 184, 0.3)",
    color: "#e2e8f0",
    label: "Technician",
  },
};

const EDGE_COLORS = {
  process: "#475569",
  telemetry: "#0284c7",
  risk: "#ef4444",
  work: "#94a3b8",
};

/* ─────────────────────────────────────────────
   INITIAL SCHEMATIC COORDINATES (Spread 2D)
   ───────────────────────────────────────────── */
const SCHEMATIC_POSITIONS = {
  // Stage 1: Feed Ore & Water Sump (PB_001)
  P_001:     { x: 80, y: 340 },
  P_101:     { x: 80, y: 200 },
  PB_001:    { x: 280, y: 340 },
  PB001_Level_pct: { x: 220, y: 220 },
  PB001_Sump_Temp_C: { x: 340, y: 220 },
  FM_PB_001: { x: 280, y: 620 },

  // Stage 2: Slurry Pump (SP_001)
  P_002:     { x: 440, y: 340 },
  SP_001:    { x: 600, y: 340 },
  SP001_Motor_Power_kW: { x: 520, y: 180 },
  SP001_Motor_Current_A: { x: 680, y: 180 },
  SP001_Speed_RPM: { x: 480, y: 340 },
  SP001_Discharge_Pressure_kPa: { x: 520, y: 500 },
  SP001_Bearing_Temp_C: { x: 600, y: 500 },
  SP001_Vibration_mms: { x: 680, y: 500 },
  FM_SP_001: { x: 600, y: 640 },

  // Stage 3: Hydrocyclone Cluster (CY_001_A, B, C)
  P_003:     { x: 760, y: 340 },

  CY_001_A:    { x: 960, y: 160 },
  CY001_Inlet_Pressure_A: { x: 840, y: 100 },
  CY001_Vortex_DP_A: { x: 960, y: 80 },
  CY001_Apex_Wear_A: { x: 1080, y: 100 },
  FM_CY_001_A: { x: 960, y: 20 },

  CY_001_B:    { x: 960, y: 340 },
  CY001_Inlet_Pressure_B: { x: 840, y: 280 },
  CY001_Vortex_DP_B: { x: 960, y: 260 },
  CY001_Apex_Wear_B: { x: 1080, y: 280 },
  FM_CY_001_B: { x: 960, y: 200 },

  CY_001_C:    { x: 960, y: 520 },
  CY001_Inlet_Pressure_C: { x: 840, y: 460 },
  CY001_Vortex_DP_C: { x: 960, y: 440 },
  CY001_Apex_Wear_C: { x: 1080, y: 460 },
  FM_CY_001_C: { x: 960, y: 640 },

  // Stage 4: Discharge Streams
  P_006:     { x: 1220, y: 160 },
  P_004:     { x: 1140, y: 440 },

  // Stage 5: Ball Mill & Recirculation (BM_001)
  BM_001:    { x: 1320, y: 440 },
  BM001_Power_Draw_kW: { x: 1240, y: 280 },
  BM001_Motor_Current_A: { x: 1400, y: 280 },
  BM001_Bearing_DE_Temp_C: { x: 1460, y: 380 },
  BM001_Bearing_NDE_Temp_C: { x: 1460, y: 500 },
  BM001_Vibration_mms: { x: 1320, y: 600 },
  BM001_Sound_Level_dB: { x: 1200, y: 580 },
  FM_BM_001: { x: 1320, y: 720 },

  P_005:     { x: 760, y: 720 },
};

const STATIC_NODES = [
  { id: "PB_001", name: "Pump Box Sump Unit", type: "Equipment", category: "Sump / Mixing Box", status: "GOOD", ...SCHEMATIC_POSITIONS.PB_001 },
  { id: "SP_001", name: "Slurry Pump Centrifugal", type: "Equipment", category: "Centrifugal Pump", status: "FAIR", ...SCHEMATIC_POSITIONS.SP_001 },
  { id: "CY_001_A", name: "Hydrocyclone Unit A", type: "Equipment", category: "Hydrocyclone", status: "GOOD", ...SCHEMATIC_POSITIONS.CY_001_A },
  { id: "CY_001_B", name: "Hydrocyclone Unit B", type: "Equipment", category: "Hydrocyclone", status: "GOOD", ...SCHEMATIC_POSITIONS.CY_001_B },
  { id: "CY_001_C", name: "Hydrocyclone Unit C", type: "Equipment", category: "Hydrocyclone", status: "MONITOR", ...SCHEMATIC_POSITIONS.CY_001_C },
  { id: "BM_001", name: "Ball Mill Grinding Unit", type: "Equipment", category: "Grinding Mill", status: "FAIR", ...SCHEMATIC_POSITIONS.BM_001 },

  { id: "P_001", name: "Feed Ore Slurry", type: "Stream", category: "Pipeline", material: "Phosphate Ore Slurry", ...SCHEMATIC_POSITIONS.P_001 },
  { id: "P_101", name: "Process Water Line", type: "Stream", category: "Pipeline", material: "Process Water", ...SCHEMATIC_POSITIONS.P_101 },
  { id: "P_002", name: "Sump Discharge", type: "Stream", category: "Pipeline", material: "Diluted Slurry", ...SCHEMATIC_POSITIONS.P_002 },
  { id: "P_003", name: "Pump Discharge", type: "Stream", category: "Pipeline", material: "Pressurized Slurry", ...SCHEMATIC_POSITIONS.P_003 },
  { id: "P_004", name: "Cyclone Underflow", type: "Stream", category: "Pipeline", material: "Coarse Underflow", ...SCHEMATIC_POSITIONS.P_004 },
  { id: "P_005", name: "Mill Discharge", type: "Stream", category: "Pipeline", material: "Ground Pulp", ...SCHEMATIC_POSITIONS.P_005 },
  { id: "P_006", name: "Cyclone Overflow", type: "Stream", category: "Pipeline", material: "Fine Product Slurry", ...SCHEMATIC_POSITIONS.P_006 },

  // SCADA Telemetry Tags (100% Aligned with assets.json and machine_health_timeseries.csv)
  { id: "PB001_Level_pct", name: "Pump Box Sump Level", type: "Sensor", category: "SCADA Tag", unit: "%", ...SCHEMATIC_POSITIONS.PB001_Level_pct },
  { id: "PB001_Sump_Temp_C", name: "Pump Box Sump Temp", type: "Sensor", category: "SCADA Tag", unit: "°C", ...SCHEMATIC_POSITIONS.PB001_Sump_Temp_C },

  { id: "SP001_Discharge_Pressure_kPa", name: "Pump Discharge Pressure", type: "Sensor", category: "SCADA Tag", unit: "kPa", ...SCHEMATIC_POSITIONS.SP001_Discharge_Pressure_kPa },
  { id: "SP001_Motor_Power_kW", name: "Pump Motor Power Draw", type: "Sensor", category: "SCADA Tag", unit: "kW", ...SCHEMATIC_POSITIONS.SP001_Motor_Power_kW },
  { id: "SP001_Motor_Current_A", name: "Pump Motor Current", type: "Sensor", category: "SCADA Tag", unit: "A", ...SCHEMATIC_POSITIONS.SP001_Motor_Current_A },
  { id: "SP001_Speed_RPM", name: "Pump Speed", type: "Sensor", category: "SCADA Tag", unit: "RPM", ...SCHEMATIC_POSITIONS.SP001_Speed_RPM },
  { id: "SP001_Bearing_Temp_C", name: "Pump Bearing Temp", type: "Sensor", category: "SCADA Tag", unit: "°C", ...SCHEMATIC_POSITIONS.SP001_Bearing_Temp_C },
  { id: "SP001_Vibration_mms", name: "Pump Vibration RMS", type: "Sensor", category: "SCADA Tag", unit: "mm/s", ...SCHEMATIC_POSITIONS.SP001_Vibration_mms },

  { id: "CY001_Inlet_Pressure_A", name: "Cyclone A Inlet Pressure", type: "Sensor", category: "SCADA Tag", unit: "kPa", ...SCHEMATIC_POSITIONS.CY001_Inlet_Pressure_A },
  { id: "CY001_Vortex_DP_A", name: "Cyclone A Vortex DP", type: "Sensor", category: "SCADA Tag", unit: "kPa", ...SCHEMATIC_POSITIONS.CY001_Vortex_DP_A },
  { id: "CY001_Apex_Wear_A", name: "Cyclone A Apex Wear Index", type: "Sensor", category: "SCADA Tag", unit: "%", ...SCHEMATIC_POSITIONS.CY001_Apex_Wear_A },

  { id: "CY001_Inlet_Pressure_B", name: "Cyclone B Inlet Pressure", type: "Sensor", category: "SCADA Tag", unit: "kPa", ...SCHEMATIC_POSITIONS.CY001_Inlet_Pressure_B },
  { id: "CY001_Vortex_DP_B", name: "Cyclone B Vortex DP", type: "Sensor", category: "SCADA Tag", unit: "kPa", ...SCHEMATIC_POSITIONS.CY001_Vortex_DP_B },
  { id: "CY001_Apex_Wear_B", name: "Cyclone B Apex Wear Index", type: "Sensor", category: "SCADA Tag", unit: "%", ...SCHEMATIC_POSITIONS.CY001_Apex_Wear_B },

  { id: "CY001_Inlet_Pressure_C", name: "Cyclone C Inlet Pressure", type: "Sensor", category: "SCADA Tag", unit: "kPa", ...SCHEMATIC_POSITIONS.CY001_Inlet_Pressure_C },
  { id: "CY001_Vortex_DP_C", name: "Cyclone C Vortex DP", type: "Sensor", category: "SCADA Tag", unit: "kPa", ...SCHEMATIC_POSITIONS.CY001_Vortex_DP_C },
  { id: "CY001_Apex_Wear_C", name: "Cyclone C Apex Wear Index", type: "Sensor", category: "SCADA Tag", unit: "%", ...SCHEMATIC_POSITIONS.CY001_Apex_Wear_C },

  { id: "BM001_Power_Draw_kW", name: "Mill Motor Power Draw", type: "Sensor", category: "SCADA Tag", unit: "kW", ...SCHEMATIC_POSITIONS.BM001_Power_Draw_kW },
  { id: "BM001_Motor_Current_A", name: "Mill Motor Current", type: "Sensor", category: "SCADA Tag", unit: "A", ...SCHEMATIC_POSITIONS.BM001_Motor_Current_A },
  { id: "BM001_Bearing_DE_Temp_C", name: "Drive-End Bearing Temp", type: "Sensor", category: "SCADA Tag", unit: "°C", ...SCHEMATIC_POSITIONS.BM001_Bearing_DE_Temp_C },
  { id: "BM001_Bearing_NDE_Temp_C", name: "Non-Drive-End Bearing Temp", type: "Sensor", category: "SCADA Tag", unit: "°C", ...SCHEMATIC_POSITIONS.BM001_Bearing_NDE_Temp_C },
  { id: "BM001_Vibration_mms", name: "Mill Shell Vibration", type: "Sensor", category: "SCADA Tag", unit: "mm/s", ...SCHEMATIC_POSITIONS.BM001_Vibration_mms },
  { id: "BM001_Sound_Level_dB", name: "Acoustic Mill Charge Sound", type: "Sensor", category: "SCADA Tag", unit: "dB", ...SCHEMATIC_POSITIONS.BM001_Sound_Level_dB },

  // Failure Modes
  { id: "FM_PB_001", name: "Level probe fouling risk", type: "FailureMode", category: "Risk Factor", ...SCHEMATIC_POSITIONS.FM_PB_001 },
  { id: "FM_SP_001", name: "Impeller and liner wear risk", type: "FailureMode", category: "Risk Factor", ...SCHEMATIC_POSITIONS.FM_SP_001 },
  { id: "FM_CY_001_A", name: "Apex wear & choke risk A", type: "FailureMode", category: "Risk Factor", ...SCHEMATIC_POSITIONS.FM_CY_001_A },
  { id: "FM_CY_001_B", name: "Apex wear & choke risk B", type: "FailureMode", category: "Risk Factor", ...SCHEMATIC_POSITIONS.FM_CY_001_B },
  { id: "FM_CY_001_C", name: "Apex wear & choke risk C", type: "FailureMode", category: "Risk Factor", ...SCHEMATIC_POSITIONS.FM_CY_001_C },
  { id: "FM_BM_001", name: "Trunnion bearing overheat risk", type: "FailureMode", category: "Risk Factor", ...SCHEMATIC_POSITIONS.FM_BM_001 },
];

const STATIC_EDGES = [
  // Process Stream Connections
  { source: "P_001", target: "PB_001", label: "FEEDS_INTO", type: "process" },
  { source: "P_101", target: "PB_001", label: "WATER_INPUT", type: "process" },
  { source: "PB_001", target: "P_002", label: "DISCHARGES_TO", type: "process" },
  { source: "P_002", target: "SP_001", label: "FEEDS_INTO", type: "process" },
  { source: "SP_001", target: "P_003", label: "DISCHARGES_TO", type: "process" },
  { source: "P_003", target: "CY_001_A", label: "FEEDS_INTO", type: "process" },
  { source: "P_003", target: "CY_001_B", label: "FEEDS_INTO", type: "process" },
  { source: "P_003", target: "CY_001_C", label: "FEEDS_INTO", type: "process" },
  { source: "CY_001_A", target: "P_006", label: "OVERFLOW", type: "process" },
  { source: "CY_001_B", target: "P_006", label: "OVERFLOW", type: "process" },
  { source: "CY_001_C", target: "P_006", label: "OVERFLOW", type: "process" },
  { source: "CY_001_A", target: "P_004", label: "UNDERFLOW", type: "process" },
  { source: "CY_001_B", target: "P_004", label: "UNDERFLOW", type: "process" },
  { source: "CY_001_C", target: "P_004", label: "UNDERFLOW", type: "process" },
  { source: "P_004", target: "BM_001", label: "FEEDS_INTO", type: "process" },
  { source: "BM_001", target: "P_005", label: "DISCHARGES_TO", type: "process" },
  { source: "P_005", target: "PB_001", label: "RECIRCULATES", type: "process" },

  // SCADA Telemetry Tags
  { source: "PB001_Level_pct", target: "PB_001", label: "MONITORS", type: "telemetry" },
  { source: "PB001_Sump_Temp_C", target: "PB_001", label: "MONITORS", type: "telemetry" },

  { source: "SP001_Discharge_Pressure_kPa", target: "SP_001", label: "MONITORS", type: "telemetry" },
  { source: "SP001_Motor_Power_kW", target: "SP_001", label: "MONITORS", type: "telemetry" },
  { source: "SP001_Motor_Current_A", target: "SP_001", label: "MONITORS", type: "telemetry" },
  { source: "SP001_Speed_RPM", target: "SP_001", label: "MONITORS", type: "telemetry" },
  { source: "SP001_Bearing_Temp_C", target: "SP_001", label: "MONITORS", type: "telemetry" },
  { source: "SP001_Vibration_mms", target: "SP_001", label: "MONITORS", type: "telemetry" },

  { source: "CY001_Inlet_Pressure_A", target: "CY_001_A", label: "MONITORS", type: "telemetry" },
  { source: "CY001_Vortex_DP_A", target: "CY_001_A", label: "MONITORS", type: "telemetry" },
  { source: "CY001_Apex_Wear_A", target: "CY_001_A", label: "MONITORS", type: "telemetry" },

  { source: "CY001_Inlet_Pressure_B", target: "CY_001_B", label: "MONITORS", type: "telemetry" },
  { source: "CY001_Vortex_DP_B", target: "CY_001_B", label: "MONITORS", type: "telemetry" },
  { source: "CY001_Apex_Wear_B", target: "CY_001_B", label: "MONITORS", type: "telemetry" },

  { source: "CY001_Inlet_Pressure_C", target: "CY_001_C", label: "MONITORS", type: "telemetry" },
  { source: "CY001_Vortex_DP_C", target: "CY_001_C", label: "MONITORS", type: "telemetry" },
  { source: "CY001_Apex_Wear_C", target: "CY_001_C", label: "MONITORS", type: "telemetry" },

  { source: "BM001_Power_Draw_kW", target: "BM_001", label: "MONITORS", type: "telemetry" },
  { source: "BM001_Motor_Current_A", target: "BM_001", label: "MONITORS", type: "telemetry" },
  { source: "BM001_Bearing_DE_Temp_C", target: "BM_001", label: "MONITORS", type: "telemetry" },
  { source: "BM001_Bearing_NDE_Temp_C", target: "BM_001", label: "MONITORS", type: "telemetry" },
  { source: "BM001_Vibration_mms", target: "BM_001", label: "MONITORS", type: "telemetry" },
  { source: "BM001_Sound_Level_dB", target: "BM_001", label: "MONITORS", type: "telemetry" },

  // Failure Mode Risks
  { source: "SP_001", target: "FM_SP_001", label: "RISKS", type: "risk" },
  { source: "BM_001", target: "FM_BM_001", label: "RISKS", type: "risk" },
  { source: "PB_001", target: "FM_PB_001", label: "RISKS", type: "risk" },
  { source: "CY_001_A", target: "FM_CY_001_A", label: "RISKS", type: "risk" },
  { source: "CY_001_B", target: "FM_CY_001_B", label: "RISKS", type: "risk" },
  { source: "CY_001_C", target: "FM_CY_001_C", label: "RISKS", type: "risk" },
];

/* ─────────────────────────────────────────────
   ALL SHORTEST PATHS TRAVERSAL ALGORITHM
   ───────────────────────────────────────────── */
function bfsShortestPath(edges, fromId, toId) {
  const adj = {};
  edges.forEach((e) => {
    if (!adj[e.source]) adj[e.source] = [];
    if (!adj[e.target]) adj[e.target] = [];
    adj[e.source].push({ node: e.target, edge: e });
    adj[e.target].push({ node: e.source, edge: e });
  });

  const distances = { [fromId]: 0 };
  const queue = [[fromId, []]];
  let shortestLen = Infinity;
  const allPathEdges = [];
  const edgeSeen = new Set();

  while (queue.length > 0) {
    const [current, pathEdges] = queue.shift();
    if (pathEdges.length > shortestLen) continue;

    if (current === toId) {
      shortestLen = pathEdges.length;
      pathEdges.forEach((e) => {
        const key = `${e.source}->${e.target}`;
        if (!edgeSeen.has(key)) {
          edgeSeen.add(key);
          allPathEdges.push(e);
        }
      });
      continue;
    }

    for (const neighbor of adj[current] || []) {
      const d = pathEdges.length + 1;
      if (d <= shortestLen && (distances[neighbor.node] === undefined || d <= distances[neighbor.node])) {
        distances[neighbor.node] = d;
        queue.push([neighbor.node, [...pathEdges, neighbor.edge]]);
      }
    }
  }

  return allPathEdges.length > 0 ? allPathEdges : null;
}

export default function KnowledgeGraphPage({ onSelect, externalSelectedId }) {
  const [nodes, setNodes] = useState(STATIC_NODES);
  const [edges, setEdges] = useState(STATIC_EDGES);

  const [selectedNodeId, setSelectedNodeId] = useState(externalSelectedId || null);

  useEffect(() => {
    if (externalSelectedId !== undefined) {
      // Map aggregate IDs: CY_001 from Flowsheet → CY_001_B (center cyclone in KG)
      const mappedId =
        externalSelectedId === "CY_001" ? "CY_001_B" : externalSelectedId;

      setSelectedNodeId(mappedId || null);

      if (mappedId) {
        // Use static SCHEMATIC_POSITIONS — always available, no closure/loop risk
        const nodePos = SCHEMATIC_POSITIONS[mappedId];

        if (nodePos && svgRef.current) {
          const rect = svgRef.current.getBoundingClientRect();
          const viewW = rect.width || 600;
          const viewH = rect.height || 700;
          const focusScale = 1.2;
          const centerX = viewW / 2 - nodePos.x * focusScale;
          const centerY = viewH / 2 - nodePos.y * focusScale;
          setTransform({ x: centerX, y: centerY, scale: focusScale });
        }
      } else {
        // Deselected — reset to default overview state
        setTransform({ x: 40, y: 20, scale: 0.8 });
      }
    }
  }, [externalSelectedId]);
  const [telemetryData, setTelemetryData] = useState(null);
  const [filterType, setFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Canvas Viewport Transforms
  const [transform, setTransform] = useState({ x: 40, y: 20, scale: 0.8 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState(null);
  const [showAllLinks, setShowAllLinks] = useState(true);

  // Physics Simulation State
  const [physicsRunning, setPhysicsRunning] = useState(false);

  // Path Tracing State
  const [pathMode, setPathMode] = useState(false);
  const [pathSource, setPathSource] = useState(null);
  const [pathTarget, setPathTarget] = useState(null);
  const [tracedPath, setTracedPath] = useState(null);

  // Inspector & Multi-Hop State
  const [inspectorData, setInspectorData] = useState(null);
  const [expandedHops, setExpandedHops] = useState(1);
  const [workOrders, setWorkOrders] = useState([]);
  const [equipmentConditions, setEquipmentConditions] = useState({});
  const [hoveredNode, setHoveredNode] = useState(null);

  const svgRef = useRef(null);
  const animFrameRef = useRef(null);

  /* ── Fetch backend graph ── */
  const fetchGraphTopology = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/graph/topology`);
      if (res.ok) {
        const data = await res.json();
        if (data.nodes && data.nodes.length > 0) {
          const OBSOLETE_TAGS = new Set([
            "DIT_301", "PIT_301", "PIT_101", "FIT_101", "FIT_201", "LIT_101", "TIT_101",
            "VIT_101", "JIT_201", "AIT_201", "TIT_401", "VIT_201", "PIT_301_A", "DIT_301_A",
            "PIT_301_B", "DIT_301_B", "PIT_301_C", "DIT_301_C", "WIT_301_A", "WIT_301_B", "WIT_301_C"
          ]);
          const visNodes = data.nodes.filter((n) => n.type !== "WorkOrder" && n.type !== "Technician" && !OBSOLETE_TAGS.has(n.id));
          
          const nodeMap = new Map();
          STATIC_NODES.forEach((s) => nodeMap.set(s.id, s));
          visNodes.forEach((n) => {
            const pos = SCHEMATIC_POSITIONS[n.id] || nodeMap.get(n.id);
            nodeMap.set(n.id, {
              ...n,
              x: pos?.x || n.x || 600,
              y: pos?.y || n.y || 400,
              vx: 0,
              vy: 0,
            });
          });

          const mergedNodes = Array.from(nodeMap.values());
          const visNodeIds = new Set(mergedNodes.map((n) => n.id));
          const bkEdges = (data.edges || []).filter((e) => visNodeIds.has(e.source) && visNodeIds.has(e.target));

          const rawMergedEdges = [...bkEdges, ...STATIC_EDGES];
          const pairSet = new Set();
          const mergedEdges = [];
          rawMergedEdges.forEach((e) => {
            if (visNodeIds.has(e.source) && visNodeIds.has(e.target)) {
              const pairKey = `${e.source}->${e.target}`;
              if (!pairSet.has(pairKey)) {
                pairSet.add(pairKey);
                mergedEdges.push(e);
              }
            }
          });

          setNodes(mergedNodes);
          setEdges(mergedEdges);
        }
      }
    } catch {
      /* Fallback static data active */
    }
  }, []);

  /* ── Fetch equipment conditions ── */
  const fetchConditions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/maintenance/equipment`);
      if (res.ok) {
        const data = await res.json();
        const condMap = {};
        (data || []).forEach((eq) => {
          condMap[eq.equipment_id] = {
            condition: eq.condition_status,
            criticality: eq.criticality,
            isOverdue: eq.is_overdue,
          };
        });
        setEquipmentConditions(condMap);
      }
    } catch {
      /* silent */
    }
  }, []);

  /* ── Fetch work orders for selected equipment ── */
  const fetchWorkOrders = useCallback(async (eqId) => {
    try {
      const res = await fetch(`${API}/api/maintenance/equipment/${eqId}/history`);
      if (res.ok) {
        const data = await res.json();
        setWorkOrders(data || []);
      } else {
        setWorkOrders([]);
      }
    } catch {
      setWorkOrders([]);
    }
  }, []);

  useEffect(() => {
    fetchGraphTopology();
    fetchConditions();
    const timer = setInterval(fetchConditions, 5000);
    return () => clearInterval(timer);
  }, [fetchGraphTopology, fetchConditions]);

  /* ── Path Tracing Computation ── */
  useEffect(() => {
    if (pathSource && pathTarget && pathSource !== pathTarget) {
      const res = bfsShortestPath(edges, pathSource, pathTarget);
      setTracedPath(res);
    } else {
      setTracedPath(null);
    }
  }, [pathSource, pathTarget, edges]);

  /* ── Physics Force Simulation Loop ── */
  useEffect(() => {
    if (!physicsRunning) return;

    const stepPhysics = () => {
      setNodes((prevNodes) => {
        const newNodes = prevNodes.map((n) => ({ ...n }));
        const nodeMap = new Map(newNodes.map((n) => [n.id, n]));

        // 1. Coulomb Repulsion between all nodes
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const a = newNodes[i];
            const b = newNodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            if (dist < 280) {
              const force = (280 - dist) / dist * 1.5;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              if (a.id !== draggedNode) { a.vx = (a.vx || 0) - fx; a.vy = (a.vy || 0) - fy; }
              if (b.id !== draggedNode) { b.vx = (b.vx || 0) + fx; b.vy = (b.vy || 0) + fy; }
            }
          }
        }

        // 2. Hooke's Spring Attraction along edges
        edges.forEach((e) => {
          const a = nodeMap.get(e.source);
          const b = nodeMap.get(e.target);
          if (a && b) {
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = 160;
            const force = (dist - targetDist) * 0.02;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            if (a.id !== draggedNode) { a.vx = (a.vx || 0) + fx; a.vy = (a.vy || 0) + fy; }
            if (b.id !== draggedNode) { b.vx = (b.vx || 0) - fx; b.vy = (b.vy || 0) - fy; }
          }
        });

        // 3. Update position with damping
        return newNodes.map((n) => {
          if (n.id === draggedNode) return n;
          const damping = 0.85;
          const vx = (n.vx || 0) * damping;
          const vy = (n.vy || 0) * damping;
          return {
            ...n,
            vx,
            vy,
            x: Math.max(80, Math.min(1500, n.x + vx)),
            y: Math.max(80, Math.min(900, n.y + vy)),
          };
        });
      });

      animFrameRef.current = requestAnimationFrame(stepPhysics);
    };

    animFrameRef.current = requestAnimationFrame(stepPhysics);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [physicsRunning, edges, draggedNode]);

  /* ── Reset Layout to Organic Schematic ── */
  const resetLayout = () => {
    setNodes((prev) =>
      prev.map((n) => {
        const pos = SCHEMATIC_POSITIONS[n.id];
        return {
          ...n,
          x: pos?.x || 600,
          y: pos?.y || 400,
          vx: 0,
          vy: 0,
        };
      })
    );
    setTransform({ x: 40, y: 20, scale: 0.8 });
  };

  /* ── Canvas Pan, Zoom & Node Dragging ── */
  const panDistanceRef = useRef(0);
  const nodeDragDistanceRef = useRef(0);
  const nodeMouseDownRef = useRef(null);

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    setTransform((p) => ({ ...p, scale: Math.min(Math.max(0.2, p.scale * factor), 4) }));
  };

  const handleCanvasMouseDown = (e) => {
    if (e.target.tagName === "svg" || e.target.id === "canvas-bg") {
      setIsPanning(true);
      panDistanceRef.current = 0;
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
    nodeMouseDownRef.current = node;
    nodeDragDistanceRef.current = 0;
    setDraggedNode(node.id);
  };

  const handleMouseMove = (e) => {
    if (draggedNode && svgRef.current) {
      nodeDragDistanceRef.current += Math.abs(e.movementX) + Math.abs(e.movementY);
      const r = svgRef.current.getBoundingClientRect();
      const cx = (e.clientX - r.left - transform.x) / transform.scale;
      const cy = (e.clientY - r.top - transform.y) / transform.scale;
      setNodes((prev) => prev.map((n) => (n.id === draggedNode ? { ...n, x: cx, y: cy, vx: 0, vy: 0 } : n)));
    } else if (isPanning) {
      panDistanceRef.current += Math.abs(e.movementX) + Math.abs(e.movementY);
      setTransform((p) => ({ ...p, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
    }
  };

  const handleMouseUp = () => {
    // 1. Handle stationary node click selection (< 5px drag distance)
    if (draggedNode && nodeMouseDownRef.current) {
      const node = nodeMouseDownRef.current;
      const totalMoved = nodeDragDistanceRef.current;

      if (totalMoved < 5) {
        if (pathMode) {
          if (!pathSource) {
            setPathSource(node.id);
            setPathTarget(null);
            setSelectedNodeId(node.id);
          } else if (!pathTarget && node.id !== pathSource) {
            setPathTarget(node.id);
          } else {
            setPathSource(node.id);
            setPathTarget(null);
            setSelectedNodeId(node.id);
          }
        } else {
          setSelectedNodeId((prev) => {
            const nextId = prev === node.id ? null : node.id;
            if (onSelect) onSelect(nextId);
            return nextId;
          });
        }
      }
    }

    // 2. Handle canvas background stationary click deselect (< 5px pan distance)
    if (isPanning && panDistanceRef.current < 5) {
      if (!pathMode) {
        setSelectedNodeId(null);
        if (onSelect) onSelect(null);
      }
    }

    nodeMouseDownRef.current = null;
    nodeDragDistanceRef.current = 0;
    setDraggedNode(null);
    setIsPanning(false);
  };

  /* ── Inspector Multi-hop computation ── */
  useEffect(() => {
    if (!selectedNodeId) {
      setInspectorData(null);
      setWorkOrders([]);
      return;
    }

    const targetNode = nodes.find((n) => n.id === selectedNodeId);
    if (!targetNode) return;

    const visited = new Set([selectedNodeId]);
    const neighbors = [];
    const hopEdges = [];
    let currentLevel = [selectedNodeId];

    for (let hop = 1; hop <= expandedHops; hop++) {
      const nextLevel = [];
      for (const nodeId of currentLevel) {
        edges.forEach((e) => {
          const other = e.source === nodeId ? e.target : e.target === nodeId ? e.source : null;
          if (other && !visited.has(other)) {
            visited.add(other);
            nextLevel.push(other);
            hopEdges.push(e);
            const nNode = nodes.find((n) => n.id === other);
            if (nNode) neighbors.push({ ...nNode, hop });
          }
        });
      }
      currentLevel = nextLevel;
    }

    setInspectorData({ node: targetNode, neighbors, edges: hopEdges });

    if (targetNode.type === "Equipment") {
      fetchWorkOrders(targetNode.id);
    } else {
      setWorkOrders([]);
    }
  }, [selectedNodeId, nodes, edges, expandedHops, fetchWorkOrders]);

  /* ── Telemetry Fetching for Graph Node ── */
  useEffect(() => {
    if (!selectedNodeId) {
      setTelemetryData(null);
      return;
    }
    const targetNode = nodes.find((n) => n.id === selectedNodeId);
    if (!targetNode || (targetNode.type !== "Equipment" && targetNode.type !== "Stream")) {
      setTelemetryData(null);
      return;
    }

    const tagToFetch = targetNode.id.startsWith("CY_001") ? "CY_001" : targetNode.id;
    const fetchTelemetry = async () => {
      try {
        const res = await fetch(`${API}/api/v1/assets/${tagToFetch}/telemetry`);
        if (res.ok) {
          const data = await res.json();
          setTelemetryData(data);
        }
      } catch (e) {
        console.error("Error fetching telemetry for graph node:", e);
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, [selectedNodeId, nodes]);

  /* ── Filtered Nodes ── */
  const filteredNodes = nodes.filter((n) => {
    const matchType = filterType === "ALL" || n.type === filterType;
    const matchSearch =
      !searchQuery ||
      n.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.name && n.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchType && matchSearch;
  });

  /* ── Path traced edge & node sets ── */
  const tracedEdgeSet = new Set();
  const tracedNodeSet = new Set();
  if (tracedPath) {
    tracedPath.forEach((e) => {
      tracedEdgeSet.add(`${e.source}-${e.target}`);
      tracedEdgeSet.add(`${e.target}-${e.source}`);
      tracedNodeSet.add(e.source);
      tracedNodeSet.add(e.target);
    });

    // Identify primary equipment involved in pathSource/pathTarget or on the traced path
    const activeEqIds = new Set();
    tracedNodeSet.forEach((id) => {
      const n = nodes.find((item) => item.id === id);
      if (n && n.type === "Equipment") activeEqIds.add(id);
    });

    edges.forEach((e) => {
      if (
        e.type === "telemetry" &&
        (e.source === pathSource || e.target === pathSource || e.source === pathTarget || e.target === pathTarget)
      ) {
        const sNode = nodes.find((item) => item.id === e.source);
        const tNode = nodes.find((item) => item.id === e.target);
        if (sNode && sNode.type === "Equipment") activeEqIds.add(e.source);
        if (tNode && tNode.type === "Equipment") activeEqIds.add(e.target);
      }
    });

    edges.forEach((e) => {
      // Include RISK edges for the active source/target equipment
      if (e.type === "risk" && (activeEqIds.has(e.source) || activeEqIds.has(e.target))) {
        tracedEdgeSet.add(`${e.source}-${e.target}`);
        tracedEdgeSet.add(`${e.target}-${e.source}`);
        tracedNodeSet.add(e.source);
        tracedNodeSet.add(e.target);
      }
      // Include MONITORS edges if the sensor node is specifically pathSource or pathTarget
      if (
        e.type === "telemetry" &&
        (e.source === pathSource || e.source === pathTarget || e.target === pathSource || e.target === pathTarget)
      ) {
        tracedEdgeSet.add(`${e.source}-${e.target}`);
        tracedEdgeSet.add(`${e.target}-${e.source}`);
        tracedNodeSet.add(e.source);
        tracedNodeSet.add(e.target);
      }
    });
  }

  const isTracing = pathMode && pathSource && pathTarget && tracedPath;

  /* ── Hop Neighborhood sets for canvas visual dimming ── */
  const hopNodeSet = new Set();
  const hopEdgeSet = new Set();
  if (selectedNodeId && inspectorData) {
    hopNodeSet.add(selectedNodeId);
    (inspectorData.neighbors || []).forEach((n) => hopNodeSet.add(n.id));
    (inspectorData.edges || []).forEach((e) => {
      hopEdgeSet.add(`${e.source}-${e.target}`);
      hopEdgeSet.add(`${e.target}-${e.source}`);
    });
  }
  const hasHopHighlight = !pathMode && selectedNodeId && hopNodeSet.size > 1;

  return (
    <div
      style={{
        padding: "0",
        color: "#f8fafc",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* ════ GRAPH CANVAS & INSPECTOR WORKSPACE ════ */}
      <div style={{ flex: 1, height: "100%", width: "100%", position: "relative", overflow: "hidden" }}>
        {/* SVG Viewport */}
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#0e1420",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* In-Canvas Label — top-left, matching Flowsheet "Phosphate Grinding Circuit" style */}
          <div
            style={{
              position: "absolute",
              top: "14px",
              left: "14px",
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                color: "#00f0ff",
                fontWeight: "700",
                fontSize: "0.8rem",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              Knowledge Graph
            </span>
          </div>
          {/* Bottom-Left Independent Category Filter Icon Boxes (Icon Only, Down at Bottom) */}
          <div
            style={{
              position: "absolute",
              bottom: "14px",
              left: "14px",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {[
              { id: "ALL", title: "All Nodes", Icon: Layers },
              { id: "Equipment", title: "Process Units", Icon: Cpu },
              { id: "Stream", title: "Stream Pipelines", Icon: Activity },
              { id: "Sensor", title: "SCADA Tags", Icon: Zap },
              { id: "FailureMode", title: "Failure Risks", Icon: AlertTriangle },
            ].map((tab) => {
              const isActive = filterType === tab.id;
              const TabIcon = tab.Icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  style={{
                    width: "36px",
                    height: "36px",
                    background: isActive ? "rgba(0, 240, 255, 0.2)" : "rgba(22, 31, 48, 0.92)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border: `1px solid ${isActive ? "#00f0ff" : "#2a384e"}`,
                    color: isActive ? "#00f0ff" : "#94a3b8",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                  }}
                  title={tab.title}
                >
                  <TabIcon size={16} />
                </button>
              );
            })}
          </div>

          {/* Top-Right Independent Canvas Tool Boxes */}
          <div
            style={{
              position: "absolute",
              top: "14px",
              right: "14px",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {/* Trace Path Box */}
            <button
              onClick={() => {
                setPathMode(!pathMode);
                if (pathMode) { setPathSource(null); setPathTarget(null); setTracedPath(null); }
              }}
              title={pathMode ? "Disable Path Tracing" : "Trace Path (Root Cause Traversal)"}
              style={{
                width: "36px",
                height: "36px",
                background: pathMode ? "rgba(0, 240, 255, 0.25)" : "rgba(22, 31, 48, 0.92)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: `1px solid ${pathMode ? "#00f0ff" : "#2a384e"}`,
                color: pathMode ? "#00f0ff" : "#94a3b8",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
              }}
            >
              <Route size={16} />
            </button>

            {/* Live Physics Box */}
            <button
              onClick={() => setPhysicsRunning(!physicsRunning)}
              title={physicsRunning ? "Freeze Physics Layout" : "Live Force-Directed Physics"}
              style={{
                width: "36px",
                height: "36px",
                background: physicsRunning ? "rgba(0, 240, 255, 0.25)" : "rgba(22, 31, 48, 0.92)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: `1px solid ${physicsRunning ? "#00f0ff" : "#2a384e"}`,
                color: physicsRunning ? "#00f0ff" : "#94a3b8",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
              }}
            >
              {physicsRunning ? <Pause size={16} /> : <Play size={16} />}
            </button>

            {/* Clean Layout Box */}
            <button
              onClick={resetLayout}
              title="Clean Schematic Layout"
              style={{
                width: "36px",
                height: "36px",
                background: "rgba(22, 31, 48, 0.92)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid #2a384e",
                color: "#cbd5e1",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
              }}
            >
              <Wand2 size={16} />
            </button>

            {/* Zoom In Box */}
            <button
              onClick={() => setTransform((p) => ({ ...p, scale: Math.min(4, p.scale * 1.25) }))}
              title="Zoom In"
              style={{
                width: "36px",
                height: "36px",
                background: "rgba(22, 31, 48, 0.92)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid #2a384e",
                color: "#00f0ff",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
              }}
            >
              <ZoomIn size={16} />
            </button>

            {/* Zoom Out Box */}
            <button
              onClick={() => setTransform((p) => ({ ...p, scale: Math.max(0.2, p.scale * 0.8) }))}
              title="Zoom Out"
              style={{
                width: "36px",
                height: "36px",
                background: "rgba(22, 31, 48, 0.92)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid #2a384e",
                color: "#00f0ff",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
              }}
            >
              <ZoomOut size={16} />
            </button>
          </div>

          {/* Interactive SVG */}
          <svg
            ref={svgRef}
            onWheel={handleWheel}
            onMouseDown={handleCanvasMouseDown}
            style={{
              width: "100%",
              height: "100%",
              background: "radial-gradient(ellipse at 45% 45%, #0c1424 0%, #060a12 75%)",
              cursor: draggedNode ? "grabbing" : isPanning ? "grabbing" : pathMode ? "crosshair" : "grab",
              userSelect: "none",
            }}
          >
            <rect id="canvas-bg" width="100%" height="100%" fill="transparent" />

            <defs>
              <marker id="arrow-process" viewBox="0 0 10 10" refX="12" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#00f0ff" />
              </marker>
              <marker id="arrow-path" viewBox="0 0 10 10" refX="12" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#22d3ee" />
              </marker>
              <filter id="glow-neon">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <g
              transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
              style={{
                transition:
                  draggedNode || isPanning
                    ? "none"
                    : "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
            >
              {/* Process Stage Guides */}
              {[
                { label: "STAGE 1: FEED SUMP", x: 190 },
                { label: "STAGE 2: PUMPING", x: 520 },
                { label: "STAGE 3: HYDROCYCLONES", x: 860 },
                { label: "STAGE 4: MILL RECIRCULATION", x: 1200 },
              ].map((st, i) => (
                <text key={i} x={st.x} y={60} fill="#1e293b" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="1px">
                  {st.label}
                </text>
              ))}

              {/* ── EDGES WITH DIVERGENT ARCS FOR MULTI-EDGE PAIRS ── */}
              {(() => {
                const pairCounts = {};
                const pairIndices = {};
                edges.forEach((e) => {
                  const key = [e.source, e.target].sort().join("<->");
                  pairCounts[key] = (pairCounts[key] || 0) + 1;
                });

                return edges.map((edge, idx) => {
                  const src = filteredNodes.find((n) => n.id === edge.source);
                  const tgt = filteredNodes.find((n) => n.id === edge.target);
                  if (!src || !tgt) return null;

                  const pairKey = [edge.source, edge.target].sort().join("<->");
                  const totalPairEdges = pairCounts[pairKey] || 1;
                  const pairIdx = pairIndices[pairKey] || 0;
                  pairIndices[pairKey] = pairIdx + 1;

                  const isSelected = selectedNodeId && (src.id === selectedNodeId || tgt.id === selectedNodeId);
                  const edgeKey = `${edge.source}-${edge.target}`;
                  const isOnPath = tracedEdgeSet.has(edgeKey);
                  const isHopEdge = !isTracing && hasHopHighlight && hopEdgeSet.has(edgeKey);
                  const actualType = edge.type || (
                    edge.label === "RISKS" || edge.label === "RISKS_FAILURE" ? "risk" :
                    edge.label === "MONITORS" || edge.label === "MONITORS_TELEMETRY" ? "telemetry" : "process"
                  );
                  const baseColor = EDGE_COLORS[actualType] || "#38bdf8";

                  let strokeColor = baseColor;
                  let strokeWidth = actualType === "process" ? 2.2 : 2.0;
                  let opacity = 0.9;
                  let dashArray = actualType === "telemetry" ? "6 4" : actualType === "risk" ? "3 4" : "none";

                  if (isTracing) {
                    if (isOnPath) {
                      strokeColor = "#22d3ee"; strokeWidth = 3.5; opacity = 1; dashArray = "none";
                    } else {
                      strokeColor = "#111827"; strokeWidth = 0.5; opacity = 0.1;
                    }
                  } else if (isSelected) {
                    strokeColor = actualType === "risk" ? "#ef4444" : "#00f0ff"; strokeWidth = 2.8; opacity = 1;
                  } else if (isHopEdge) {
                    strokeColor = baseColor; strokeWidth = 2.0; opacity = 0.9;
                  } else if (hasHopHighlight) {
                    strokeColor = "#111827"; strokeWidth = 0.5; opacity = 0.08;
                  } else if (!showAllLinks) {
                    strokeColor = "#111827"; strokeWidth = 0.5; opacity = 0.1;
                  }

                  const dx = tgt.x - src.x;
                  const dy = tgt.y - src.y;
                  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                  // Divergent Arc Offset for multi-edge pairs (+35, -35, +70, -70)
                  let arcFactor = 0;
                  if (edge.label === "RECIRCULATES" || Math.abs(dx) > 400) {
                    arcFactor = 70;
                  } else if (totalPairEdges > 1) {
                    const step = 35;
                    arcFactor = (pairIdx % 2 === 0 ? 1 : -1) * (Math.floor(pairIdx / 2) + 1) * step;
                  } else {
                    arcFactor = (idx % 2 === 0 ? 12 : -12);
                  }

                  const mx = (src.x + tgt.x) / 2 - (dy / dist) * arcFactor;
                  const my = (src.y + tgt.y) / 2 + (dx / dist) * arcFactor;

                  const pathData = `M ${src.x} ${src.y} Q ${mx} ${my} ${tgt.x} ${tgt.y}`;

                  return (
                    <g key={idx}>
                      <path
                        d={pathData}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={dashArray}
                        strokeLinecap={actualType === "risk" ? "round" : "butt"}
                        opacity={opacity}
                        markerEnd={isSelected || isOnPath || isHopEdge ? "url(#arrow-path)" : "url(#arrow-process)"}
                        filter={isOnPath || (isSelected && actualType === "risk") ? "url(#glow-neon)" : "none"}
                      />
                      {/* Edge Label on distinct arc midpoint */}
                      {(isSelected || isOnPath || isHopEdge) && (() => {
                        const lw = edge.label.length * 4.5 + 8;
                        return (
                          <g>
                            <rect
                              x={mx - lw / 2}
                              y={my - 6}
                              width={lw}
                              height={12}
                              rx={3}
                              fill="rgba(6, 10, 18, 0.95)"
                              stroke={isOnPath ? "#22d3ee" : strokeColor}
                              strokeWidth={0.6}
                            />
                            <text
                              x={mx}
                              y={my + 2.5}
                              fill={isOnPath ? "#22d3ee" : strokeColor}
                              fontSize="6"
                              fontWeight="700"
                              textAnchor="middle"
                            >
                              {edge.label}
                            </text>
                          </g>
                        );
                      })()}
                    </g>
                  );
                });
              })()}

              {/* ── NODES ── */}
              {filteredNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const cfg = TYPE_CONFIG[node.type] || TYPE_CONFIG.Equipment;
                const isPathNode = pathSource === node.id || pathTarget === node.id;
                const isOnTracedPath = tracedNodeSet.has(node.id);
                const dimmedByTrace = isTracing && !isOnTracedPath && !isPathNode;
                const dimmedByHop = !isTracing && hasHopHighlight && !hopNodeSet.has(node.id);
                const dimmed = dimmedByTrace || dimmedByHop;

                const cond = equipmentConditions[node.id];
                const condColor = cond?.isOverdue ? "#ef4444" : cond?.condition === "FAIR" ? "#f59e0b" : "#10b981";

                const idStr = String(node.id || "");
                const shortSymbol = node.type === "FailureMode" ? "FM" : idStr.split('_')[0];
                const pillWidth = Math.max(36, idStr.length * 5.2 + 10);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: pathMode ? "crosshair" : "grab" }}
                    opacity={dimmed ? 0.15 : 1}
                  >
                    {/* Outer condition ring for equipment */}
                    {node.type === "Equipment" && (
                      <circle
                        r={cfg.radius + 4}
                        fill="none"
                        stroke={condColor}
                        strokeWidth={2}
                        opacity={0.8}
                      />
                    )}

                    {/* Glowing Selection Ring */}
                    {(isSelected || isPathNode) && (
                      <circle
                        r={cfg.radius + 6}
                        fill="none"
                        stroke={isPathNode ? "#22d3ee" : "#00f0ff"}
                        strokeWidth={2}
                        filter="url(#glow-neon)"
                      />
                    )}

                    {/* Main Compact Node Circle */}
                    <circle
                      r={cfg.radius}
                      fill={cfg.fill}
                      stroke={isSelected ? "#ffffff" : isOnTracedPath ? "#22d3ee" : cfg.stroke}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter={isSelected || isOnTracedPath ? "url(#glow-neon)" : "none"}
                    />

                    {/* Category Monogram inside circle */}
                    <text
                      y={0}
                      fill={cfg.color}
                      fontSize={node.type === "Equipment" ? "8.5" : "7"}
                      fontWeight="900"
                      textAnchor="middle"
                      fontFamily="monospace"
                      dominantBaseline="central"
                    >
                      {shortSymbol}
                    </text>

                    {/* Attached Pill Badge for Full Tag ID Below Circle (Fit to text) */}
                    <g transform={`translate(0, ${cfg.radius + 10})`}>
                      <rect
                        x={-pillWidth / 2}
                        y={-6}
                        width={pillWidth}
                        height={12}
                        rx={3}
                        fill="rgba(6, 10, 18, 0.95)"
                        stroke={isSelected ? "#ffffff" : cfg.stroke}
                        strokeWidth={isSelected ? 1 : 0.6}
                      />
                      <text
                        x={0}
                        y={0.5}
                        fill={cfg.color}
                        fontSize="6"
                        fontWeight="800"
                        textAnchor="middle"
                        fontFamily="monospace"
                        dominantBaseline="central"
                      >
                        {idStr}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Hover Tooltip (Fit tightly to text) */}
              {hoveredNode && !draggedNode && (() => {
                const cfg = TYPE_CONFIG[hoveredNode.type] || TYPE_CONFIG.Equipment;
                const maxTextLen = Math.max(hoveredNode.id.length * 5.2, hoveredNode.name.length * 4.6);
                const tw = Math.max(75, maxTextLen + 16);
                const th = hoveredNode.type === "Equipment" ? 46 : 36;
                return (
                  <g transform={`translate(${hoveredNode.x + cfg.radius + 8}, ${hoveredNode.y - th / 2})`} style={{ pointerEvents: "none" }}>
                    <rect x={0} y={0} width={tw} height={th} rx={4} fill="rgba(6, 10, 18, 0.96)" stroke={cfg.stroke} strokeWidth={0.8} />
                    <text x={8} y={13} fill={cfg.color} fontSize="8" fontWeight="800" fontFamily="monospace">{hoveredNode.id}</text>
                    <text x={8} y={26} fill="#e2e8f0" fontSize="7" fontWeight="600">{hoveredNode.name}</text>
                    {hoveredNode.type === "Equipment" && (
                      <text x={8} y={38} fill="#64748b" fontSize="6" fontWeight="600">{hoveredNode.status || "Active"}</text>
                    )}
                  </g>
                );
              })()}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
