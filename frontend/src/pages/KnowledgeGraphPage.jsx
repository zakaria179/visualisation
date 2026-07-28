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

/* ─────────────────────────────────────────────
   DESIGN SYSTEM — Node Types & Styling
   ───────────────────────────────────────────── */
const TYPE_CONFIG = {
  Equipment: {
    radius: 26,
    fill: "#0c2d48",
    stroke: "#00f0ff",
    glowColor: "rgba(0, 240, 255, 0.5)",
    color: "#00f0ff",
    label: "Process Unit",
  },
  Stream: {
    radius: 17,
    fill: "#0a2e1e",
    stroke: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.4)",
    color: "#34d399",
    label: "Pipeline",
  },
  Sensor: {
    radius: 15,
    fill: "#1e1040",
    stroke: "#a855f7",
    glowColor: "rgba(168, 85, 247, 0.4)",
    color: "#c084fc",
    label: "SCADA Tag",
  },
  FailureMode: {
    radius: 14,
    fill: "#2d0f0f",
    stroke: "#ef4444",
    glowColor: "rgba(239, 68, 68, 0.4)",
    color: "#f87171",
    label: "Failure Risk",
  },
  WorkOrder: {
    radius: 13,
    fill: "#2c1a0e",
    stroke: "#f97316",
    glowColor: "rgba(249, 115, 22, 0.4)",
    color: "#fb923c",
    label: "Work Order",
  },
  Technician: {
    radius: 13,
    fill: "#0c2035",
    stroke: "#0284c7",
    glowColor: "rgba(2, 132, 199, 0.4)",
    color: "#38bdf8",
    label: "Technician",
  },
};

const EDGE_COLORS = {
  process: "#00f0ff",
  telemetry: "#c084fc",
  risk: "#ef4444",
  work: "#f97316",
};

/* ─────────────────────────────────────────────
   INITIAL SCHEMATIC COORDINATES (Spread 2D)
   ───────────────────────────────────────────── */
const SCHEMATIC_POSITIONS = {
  // Stage 1: Feed Sump
  P_001:     { x: 120, y: 340 },
  PB_001:    { x: 280, y: 340 },
  FM_PB_001: { x: 280, y: 500 },

  // Stage 2: Slurry Pump & Instrumentation
  P_002:     { x: 440, y: 340 },
  SP_001:    { x: 600, y: 340 },
  FIT_101:   { x: 600, y: 170 },
  PIT_101:   { x: 600, y: 510 },
  FM_SP_001: { x: 600, y: 640 },

  // Stage 3: Hydrocyclone Cluster
  P_003:     { x: 760, y: 340 },

  CY_001_A:    { x: 940, y: 150 },
  FM_CY_001_A: { x: 1110, y: 110 },

  CY_001_B:    { x: 940, y: 340 },
  PIT_301:     { x: 830, y: 230 },
  FM_CY_001_B: { x: 1110, y: 340 },

  CY_001_C:    { x: 940, y: 530 },
  DIT_301:     { x: 830, y: 610 },
  FM_CY_001_C: { x: 1110, y: 560 },

  // Stage 4: Discharge & Underflow
  P_006:     { x: 1240, y: 150 },
  P_004:     { x: 1110, y: 440 },

  // Stage 5: Ball Mill & Recirculation
  BM_001:    { x: 1280, y: 440 },
  WIT_201:   { x: 1280, y: 280 },
  AIT_201:   { x: 1280, y: 600 },
  FM_BM_001: { x: 1280, y: 720 },

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
  { id: "P_002", name: "Sump Discharge", type: "Stream", category: "Pipeline", material: "Sump Slurry", ...SCHEMATIC_POSITIONS.P_002 },
  { id: "P_003", name: "Pump Discharge", type: "Stream", category: "Pipeline", material: "Pressurized Slurry", ...SCHEMATIC_POSITIONS.P_003 },
  { id: "P_004", name: "Cyclone Underflow", type: "Stream", category: "Pipeline", material: "Coarse Underflow", ...SCHEMATIC_POSITIONS.P_004 },
  { id: "P_005", name: "Mill Discharge", type: "Stream", category: "Pipeline", material: "Ground Pulp", ...SCHEMATIC_POSITIONS.P_005 },
  { id: "P_006", name: "Cyclone Overflow", type: "Stream", category: "Pipeline", material: "Fine Product Slurry", ...SCHEMATIC_POSITIONS.P_006 },

  { id: "FIT_101", name: "Feed Flow Meter", type: "Sensor", category: "SCADA Tag", unit: "m³/h", ...SCHEMATIC_POSITIONS.FIT_101 },
  { id: "PIT_101", name: "Pump Pressure Transducer", type: "Sensor", category: "SCADA Tag", unit: "bar", ...SCHEMATIC_POSITIONS.PIT_101 },
  { id: "PIT_301", name: "Cyclone Pressure Gauge", type: "Sensor", category: "SCADA Tag", unit: "kPa", ...SCHEMATIC_POSITIONS.PIT_301 },
  { id: "DIT_301", name: "Underflow Density Sensor", type: "Sensor", category: "SCADA Tag", unit: "g/L", ...SCHEMATIC_POSITIONS.DIT_301 },
  { id: "WIT_201", name: "Mill Feed Scale", type: "Sensor", category: "SCADA Tag", unit: "t/h", ...SCHEMATIC_POSITIONS.WIT_201 },
  { id: "AIT_201", name: "Acoustic Sensor", type: "Sensor", category: "SCADA Tag", unit: "dB", ...SCHEMATIC_POSITIONS.AIT_201 },

  { id: "FM_PB_001", name: "Level probe fouling risk", type: "FailureMode", category: "Risk Factor", ...SCHEMATIC_POSITIONS.FM_PB_001 },
  { id: "FM_SP_001", name: "Impeller and liner wear risk", type: "FailureMode", category: "Risk Factor", ...SCHEMATIC_POSITIONS.FM_SP_001 },
  { id: "FM_CY_001_A", name: "Apex spigot erosion A", type: "FailureMode", category: "Risk Factor", ...SCHEMATIC_POSITIONS.FM_CY_001_A },
  { id: "FM_CY_001_B", name: "Apex spigot erosion B", type: "FailureMode", category: "Risk Factor", ...SCHEMATIC_POSITIONS.FM_CY_001_B },
  { id: "FM_CY_001_C", name: "Choked apex risk", type: "FailureMode", category: "Risk Factor", ...SCHEMATIC_POSITIONS.FM_CY_001_C },
  { id: "FM_BM_001", name: "Trunnion bearing overheat risk", type: "FailureMode", category: "Risk Factor", ...SCHEMATIC_POSITIONS.FM_BM_001 },
];

const STATIC_EDGES = [
  { source: "P_001", target: "PB_001", label: "FEEDS_INTO", type: "process" },
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

  { source: "FIT_101", target: "SP_001", label: "MONITORS", type: "telemetry" },
  { source: "PIT_101", target: "SP_001", label: "MONITORS", type: "telemetry" },
  { source: "WIT_201", target: "BM_001", label: "MONITORS", type: "telemetry" },
  { source: "AIT_201", target: "BM_001", label: "MONITORS", type: "telemetry" },
  { source: "PIT_301", target: "CY_001_B", label: "MONITORS", type: "telemetry" },
  { source: "DIT_301", target: "CY_001_C", label: "MONITORS", type: "telemetry" },

  { source: "SP_001", target: "FM_SP_001", label: "RISKS", type: "risk" },
  { source: "BM_001", target: "FM_BM_001", label: "RISKS", type: "risk" },
  { source: "PB_001", target: "FM_PB_001", label: "RISKS", type: "risk" },
  { source: "CY_001_A", target: "FM_CY_001_A", label: "RISKS", type: "risk" },
  { source: "CY_001_B", target: "FM_CY_001_B", label: "RISKS", type: "risk" },
  { source: "CY_001_C", target: "FM_CY_001_C", label: "RISKS", type: "risk" },

  { source: "FIT_101", target: "FM_SP_001", label: "DETECTS", type: "risk" },
  { source: "PIT_101", target: "FM_SP_001", label: "DETECTS", type: "risk" },
  { source: "AIT_201", target: "FM_BM_001", label: "DETECTS", type: "risk" },
  { source: "PIT_301", target: "FM_CY_001_B", label: "DETECTS", type: "risk" },
  { source: "DIT_301", target: "FM_CY_001_C", label: "DETECTS", type: "risk" },
];

/* ─────────────────────────────────────────────
   BFS SHORTEST PATH ALGORITHM
   ───────────────────────────────────────────── */
function bfsShortestPath(edges, fromId, toId) {
  const adj = {};
  edges.forEach((e) => {
    if (!adj[e.source]) adj[e.source] = [];
    if (!adj[e.target]) adj[e.target] = [];
    adj[e.source].push({ node: e.target, edge: e });
    adj[e.target].push({ node: e.source, edge: e });
  });

  const visited = new Set([fromId]);
  const queue = [[fromId, []]];
  while (queue.length > 0) {
    const [current, pathEdges] = queue.shift();
    if (current === toId) return pathEdges;
    for (const neighbor of adj[current] || []) {
      if (!visited.has(neighbor.node)) {
        visited.add(neighbor.node);
        queue.push([neighbor.node, [...pathEdges, neighbor.edge]]);
      }
    }
  }
  return null;
}

export default function KnowledgeGraphPage() {
  const [nodes, setNodes] = useState(STATIC_NODES);
  const [edges, setEdges] = useState(STATIC_EDGES);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
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
          const visNodes = data.nodes.filter((n) => n.type !== "WorkOrder" && n.type !== "Technician");
          const visNodeIds = new Set(visNodes.map((n) => n.id));
          const bkEdges = (data.edges || []).filter((e) => visNodeIds.has(e.source) && visNodeIds.has(e.target));

          const edgeKeys = new Set(bkEdges.map((e) => `${e.source}→${e.target}→${e.label}`));
          const mergedEdges = [...bkEdges];
          STATIC_EDGES.forEach((se) => {
            const k = `${se.source}→${se.target}→${se.label}`;
            if (!edgeKeys.has(k) && visNodeIds.has(se.source) && visNodeIds.has(se.target)) {
              mergedEdges.push(se);
              edgeKeys.add(k);
            }
          });

          const mergedNodes = visNodes.map((n) => {
            const pos = SCHEMATIC_POSITIONS[n.id] || STATIC_NODES.find((s) => s.id === n.id);
            return {
              ...n,
              x: pos?.x || n.x || 600,
              y: pos?.y || n.y || 400,
              vx: 0,
              vy: 0,
            };
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

  /* ── Canvas Pan & Zoom ── */
  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    setTransform((p) => ({ ...p, scale: Math.min(Math.max(0.2, p.scale * factor), 4) }));
  };

  const handleCanvasMouseDown = (e) => {
    if (e.target.tagName === "svg" || e.target.id === "canvas-bg") {
      setIsPanning(true);
      if (!pathMode) setSelectedNodeId(null);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
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
      setSelectedNodeId(selectedNodeId === node.id ? null : node.id);
    }
    setDraggedNode(node.id);
  };

  const handleMouseMove = (e) => {
    if (draggedNode && svgRef.current) {
      const r = svgRef.current.getBoundingClientRect();
      const cx = (e.clientX - r.left - transform.x) / transform.scale;
      const cy = (e.clientY - r.top - transform.y) / transform.scale;
      setNodes((prev) => prev.map((n) => (n.id === draggedNode ? { ...n, x: cx, y: cy, vx: 0, vy: 0 } : n)));
    } else if (isPanning) {
      setTransform((p) => ({ ...p, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
    }
  };

  const handleMouseUp = () => {
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
  const hasHopHighlight = selectedNodeId && hopNodeSet.size > 1;

  return (
    <div
      style={{
        padding: "0.85rem 1.25rem",
        color: "#f8fafc",
        maxWidth: "1550px",
        margin: "0 auto",
        height: "calc(100vh - 70px)",
        maxHeight: "calc(100vh - 70px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* ════ HEADER TOOLBAR ════ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Share2 size={22} style={{ color: "#00f0ff" }} />
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", color: "#00f0ff", letterSpacing: "0.4px" }}>
            Industrial Knowledge Graph & Topology Engine
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Path Tracing Button */}
          <button
            onClick={() => {
              setPathMode(!pathMode);
              if (pathMode) { setPathSource(null); setPathTarget(null); setTracedPath(null); }
            }}
            style={{
              background: pathMode
                ? "linear-gradient(135deg, rgba(14, 116, 144, 0.4), rgba(0, 240, 255, 0.2))"
                : "#162032",
              border: `1px solid ${pathMode ? "#00f0ff" : "#1e293b"}`,
              color: pathMode ? "#00f0ff" : "#94a3b8",
              borderRadius: "6px",
              padding: "0.35rem 0.7rem",
              fontSize: "0.75rem",
              fontWeight: "700",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Route size={13} /> {pathMode ? "TRACING ON" : "Trace Path"}
          </button>

          {/* Physics Animation Toggle */}
          <button
            onClick={() => setPhysicsRunning(!physicsRunning)}
            style={{
              background: "#162032",
              border: `1px solid ${physicsRunning ? "#00f0ff" : "#1e293b"}`,
              color: physicsRunning ? "#00f0ff" : "#94a3b8",
              borderRadius: "6px",
              padding: "0.35rem 0.65rem",
              fontSize: "0.75rem",
              fontWeight: "700",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            {physicsRunning ? <Pause size={13} /> : <Play size={13} />}
            {physicsRunning ? "Freeze Layout" : "Live Physics"}
          </button>

          <button
            onClick={resetLayout}
            style={{
              background: "#162032",
              border: "1px solid #1e293b",
              color: "#cbd5e1",
              borderRadius: "6px",
              padding: "0.35rem 0.65rem",
              fontSize: "0.75rem",
              fontWeight: "700",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Wand2 size={13} /> Clean Layout
          </button>

          <button
            onClick={fetchGraphTopology}
            style={{
              background: "#162032",
              border: "1px solid #1e293b",
              color: "#00f0ff",
              borderRadius: "6px",
              padding: "0.35rem 0.65rem",
              fontSize: "0.75rem",
              fontWeight: "700",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <RefreshCw size={13} /> Sync ({nodes.length})
          </button>
        </div>
      </div>

      {/* ════ SEARCH & FILTER PILLS ════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "0.6rem", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "#00f0ff" }} />
            <input
              type="text"
              placeholder="Search tag ID, component name, stream, sensor, or failure risk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "#162032",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                padding: "0.45rem 0.75rem 0.45rem 2.3rem",
                color: "#ffffff",
                fontSize: "0.8rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ background: "#162032", border: "1px solid #1e293b", borderRadius: "8px", padding: "0.45rem 0.8rem", fontSize: "0.74rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
            Active: <strong style={{ color: "#00f0ff" }}>{filteredNodes.length}</strong> / {nodes.length} nodes
          </div>
        </div>

        {/* 5 Filter Pills */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.4rem" }}>
          {[
            { id: "ALL", label: "ALL", Icon: Layers },
            { id: "Equipment", label: "PROCESS UNITS", Icon: Cpu },
            { id: "Stream", label: "STREAMS", Icon: Activity },
            { id: "Sensor", label: "SCADA TAGS", Icon: Zap },
            { id: "FailureMode", label: "FAILURE RISKS", Icon: AlertTriangle },
          ].map((tab) => {
            const isActive = filterType === tab.id;
            const TabIcon = tab.Icon;
            const style = TYPE_CONFIG[tab.id] || { color: "#00f0ff" };
            const count = tab.id === "ALL" ? nodes.length : nodes.filter((n) => n.type === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, rgba(2, 132, 199, 0.3), rgba(0, 240, 255, 0.12))"
                    : "#162032",
                  border: `1px solid ${isActive ? "#00f0ff" : "#1e293b"}`,
                  color: isActive ? "#00f0ff" : "#cbd5e1",
                  borderRadius: "6px",
                  padding: "0.38rem 0.5rem",
                  fontSize: "0.72rem",
                  fontWeight: isActive ? "700" : "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem",
                }}
              >
                <TabIcon size={12} style={{ color: isActive ? "#00f0ff" : style.color || "#94a3b8" }} />
                {tab.label}
                <span style={{
                  background: isActive ? "rgba(0, 240, 255, 0.2)" : "rgba(30, 41, 59, 0.8)",
                  padding: "0.05rem 0.3rem",
                  borderRadius: "3px",
                  fontSize: "0.6rem",
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ════ PATH TRACING BANNER ════ */}
      {pathMode && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.65rem",
          background: "rgba(14, 116, 144, 0.15)",
          border: "1px solid #0e7490",
          borderRadius: "8px",
          padding: "0.4rem 0.85rem",
          marginBottom: "0.6rem",
          flexShrink: 0,
          fontSize: "0.78rem",
        }}>
          <Route size={14} style={{ color: "#00f0ff" }} />
          <span style={{ color: "#94a3b8" }}>
            {!pathSource
              ? "Click a source node to begin root-cause path tracing..."
              : !pathTarget
                ? <>Source: <strong style={{ color: "#00f0ff" }}>{pathSource}</strong> — now click a destination node</>
                : <>
                    <strong style={{ color: "#00f0ff" }}>{pathSource}</strong>
                    <span style={{ color: "#475569", margin: "0 0.3rem" }}>→</span>
                    <strong style={{ color: "#00f0ff" }}>{pathTarget}</strong>
                    {tracedPath
                      ? <span style={{ color: "#34d399", marginLeft: "0.5rem" }}>({tracedPath.length} hops traced)</span>
                      : <span style={{ color: "#ef4444", marginLeft: "0.5rem" }}>No direct path found</span>
                    }
                  </>
            }
          </span>
          <button
            onClick={() => { setPathSource(null); setPathTarget(null); setTracedPath(null); }}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ════ GRAPH CANVAS & INSPECTOR WORKSPACE ════ */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: selectedNodeId ? "1fr 380px" : "1fr", gap: "0.85rem" }}>
        {/* SVG Viewport */}
        <div
          style={{
            background: "#060a12",
            border: "1px solid #1e293b",
            borderRadius: "10px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Legend */}
          <div style={{
            position: "absolute", top: "0.7rem", left: "0.7rem", zIndex: 10,
            display: "flex", gap: "0.75rem",
            background: "rgba(6, 10, 18, 0.92)", border: "1px solid #1e293b",
            padding: "0.35rem 0.7rem", borderRadius: "6px", fontSize: "0.65rem",
          }}>
            {Object.entries(TYPE_CONFIG).slice(0, 4).map(([type, cfg]) => (
              <span key={type} style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: cfg.color }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg.stroke, boxShadow: `0 0 6px ${cfg.stroke}` }} />
                {cfg.label}
              </span>
            ))}
          </div>

          {/* Canvas Controls */}
          <div style={{
            position: "absolute", top: "0.7rem", right: "0.7rem", zIndex: 10,
            display: "flex", alignItems: "center", gap: "0.3rem",
            background: "rgba(6, 10, 18, 0.95)", border: "1px solid #1e293b",
            borderRadius: "8px", padding: "0.3rem 0.4rem",
          }}>
            <button onClick={() => setShowAllLinks(!showAllLinks)} title={showAllLinks ? "Focus Mode" : "Show All Links"} style={{ background: showAllLinks ? "rgba(0, 240, 255, 0.2)" : "#162032", border: `1px solid ${showAllLinks ? "#00f0ff" : "#1e293b"}`, color: showAllLinks ? "#00f0ff" : "#cbd5e1", borderRadius: "5px", padding: "0.35rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
              {showAllLinks ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <span style={{ height: "14px", width: "1px", background: "#334155", margin: "0 0.1rem" }} />
            <button onClick={() => setTransform((p) => ({ ...p, scale: Math.min(4, p.scale * 1.25) }))} style={{ background: "#162032", border: "1px solid #1e293b", color: "#00f0ff", borderRadius: "5px", padding: "0.35rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <ZoomIn size={15} />
            </button>
            <button onClick={() => setTransform((p) => ({ ...p, scale: Math.max(0.2, p.scale * 0.8) }))} style={{ background: "#162032", border: "1px solid #1e293b", color: "#00f0ff", borderRadius: "5px", padding: "0.35rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <ZoomOut size={15} />
            </button>
            <button onClick={() => setTransform({ x: 40, y: 20, scale: 0.8 })} style={{ background: "#162032", border: "1px solid #1e293b", color: "#cbd5e1", borderRadius: "5px", padding: "0.35rem 0.5rem", fontSize: "0.68rem", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem" }}>
              <Maximize2 size={13} /> {Math.round(transform.scale * 100)}%
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

            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
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
                  const baseColor = EDGE_COLORS[edge.type] || "#38bdf8";

                  let strokeColor = baseColor;
                  let strokeWidth = 1.2;
                  let opacity = 0.5;
                  let dashArray = edge.type === "telemetry" ? "4 3" : edge.type === "risk" ? "2 2" : "none";

                  if (isTracing) {
                    if (isOnPath) {
                      strokeColor = "#22d3ee"; strokeWidth = 3.5; opacity = 1; dashArray = "none";
                    } else {
                      strokeColor = "#111827"; strokeWidth = 0.5; opacity = 0.1;
                    }
                  } else if (isSelected) {
                    strokeColor = "#00f0ff"; strokeWidth = 2.5; opacity = 1;
                  } else if (isHopEdge) {
                    strokeColor = baseColor; strokeWidth = 1.8; opacity = 0.8;
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
                        opacity={opacity}
                        markerEnd={isSelected || isOnPath || isHopEdge ? "url(#arrow-path)" : "url(#arrow-process)"}
                        filter={isOnPath ? "url(#glow-neon)" : "none"}
                      />
                      {/* Edge Label on distinct arc midpoint */}
                      {(isSelected || isOnPath || isHopEdge) && (
                        <g>
                          <rect
                            x={mx - (edge.label.length * 2.8 + 6)}
                            y={my - 7}
                            width={edge.label.length * 5.6 + 12}
                            height={14}
                            rx={3}
                            fill="rgba(6, 10, 18, 0.95)"
                            stroke={isOnPath ? "#22d3ee" : strokeColor}
                            strokeWidth={0.6}
                          />
                          <text
                            x={mx}
                            y={my + 3}
                            fill={isOnPath ? "#22d3ee" : strokeColor}
                            fontSize="6.5"
                            fontWeight="700"
                            textAnchor="middle"
                          >
                            {edge.label}
                          </text>
                        </g>
                      )}
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
                        r={cfg.radius + 5}
                        fill="none"
                        stroke={condColor}
                        strokeWidth={2.5}
                        opacity={0.7}
                      />
                    )}

                    {/* Glowing Selection Ring */}
                    {(isSelected || isPathNode) && (
                      <circle
                        r={cfg.radius + 8}
                        fill="none"
                        stroke={isPathNode ? "#22d3ee" : "#00f0ff"}
                        strokeWidth={2}
                        filter="url(#glow-neon)"
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      r={cfg.radius}
                      fill={cfg.fill}
                      stroke={isSelected ? "#ffffff" : isOnTracedPath ? "#22d3ee" : cfg.stroke}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter={isSelected || isOnTracedPath ? "url(#glow-neon)" : "none"}
                    />

                    {/* Node Tag ID */}
                    <text
                      y={0}
                      fill={cfg.color}
                      fontSize={node.type === "Equipment" ? "9.5" : "7.5"}
                      fontWeight="800"
                      textAnchor="middle"
                      fontFamily="monospace"
                      dominantBaseline="central"
                    >
                      {node.id}
                    </text>
                  </g>
                );
              })}

              {/* Hover Tooltip */}
              {hoveredNode && !draggedNode && (() => {
                const cfg = TYPE_CONFIG[hoveredNode.type] || TYPE_CONFIG.Equipment;
                const tw = Math.max(130, hoveredNode.name.length * 6 + 24);
                const th = hoveredNode.type === "Equipment" ? 52 : 40;
                return (
                  <g transform={`translate(${hoveredNode.x + cfg.radius + 8}, ${hoveredNode.y - th / 2})`} style={{ pointerEvents: "none" }}>
                    <rect x={0} y={0} width={tw} height={th} rx={5} fill="rgba(6, 10, 18, 0.96)" stroke={cfg.stroke} strokeWidth={0.8} />
                    <text x={8} y={14} fill={cfg.color} fontSize="8.5" fontWeight="800" fontFamily="monospace">{hoveredNode.id}</text>
                    <text x={8} y={28} fill="#e2e8f0" fontSize="7.5" fontWeight="600">{hoveredNode.name}</text>
                    {hoveredNode.type === "Equipment" && (
                      <text x={8} y={42} fill="#64748b" fontSize="6.5" fontWeight="600">{hoveredNode.status || "Active"}</text>
                    )}
                  </g>
                );
              })()}
            </g>
          </svg>
        </div>

        {/* Right Inspector Panel */}
        {selectedNodeId && (
          <div
            style={{
              background: "#0a0f1a",
              border: "1px solid #1e293b",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.7rem",
              overflowY: "auto",
            }}
          >
            {inspectorData?.node && (
              <>
                <div style={{ borderBottom: "1px solid #1e293b", paddingBottom: "0.65rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <span style={{ color: "#00f0ff", fontSize: "0.85rem", fontFamily: "monospace", fontWeight: "800" }}>
                      {inspectorData.node.id}
                    </span>
                    <span style={{
                      fontSize: "0.62rem",
                      background: "rgba(0, 240, 255, 0.12)",
                      border: `1px solid ${(TYPE_CONFIG[inspectorData.node.type] || TYPE_CONFIG.Equipment).stroke}`,
                      color: (TYPE_CONFIG[inspectorData.node.type] || TYPE_CONFIG.Equipment).color,
                      padding: "0.1rem 0.4rem",
                      borderRadius: "4px",
                      fontWeight: "700",
                    }}>
                      {inspectorData.node.type}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "1.05rem", fontWeight: "800" }}>
                    {inspectorData.node.name}
                  </h3>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                  <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "6px", padding: "0.45rem 0.65rem" }}>
                    <div style={{ color: "#64748b", fontSize: "0.6rem", fontWeight: "700" }}>CATEGORY</div>
                    <div style={{ color: "#e2e8f0", fontSize: "0.78rem", fontWeight: "600", marginTop: "0.1rem" }}>
                      {inspectorData.node.category || "General"}
                    </div>
                  </div>
                  <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "6px", padding: "0.45rem 0.65rem" }}>
                    <div style={{ color: "#64748b", fontSize: "0.6rem", fontWeight: "700" }}>STATUS</div>
                    <div style={{ color: "#34d399", fontSize: "0.78rem", fontWeight: "700", marginTop: "0.1rem" }}>
                      ● {inspectorData.node.status || "ACTIVE"}
                    </div>
                  </div>
                </div>

                {/* Multi-Hop Neighbor Radius Selector */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ color: "#64748b", fontSize: "0.7rem", fontWeight: "700" }}>HOPS:</span>
                  {[1, 2, 3].map((h) => (
                    <button
                      key={h}
                      onClick={() => setExpandedHops(h)}
                      style={{
                        background: expandedHops === h ? "rgba(0, 240, 255, 0.2)" : "#111827",
                        border: `1px solid ${expandedHops === h ? "#00f0ff" : "#1e293b"}`,
                        color: expandedHops === h ? "#00f0ff" : "#94a3b8",
                        borderRadius: "4px",
                        padding: "0.2rem 0.5rem",
                        fontSize: "0.68rem",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      {h}-hop
                    </button>
                  ))}
                </div>

                {/* Connected Neighbors List */}
                <div style={{
                  background: "#060a12",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  padding: "0.6rem 0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}>
                  <div style={{ color: "#00f0ff", fontSize: "0.72rem", fontWeight: "800", borderBottom: "1px solid #1e293b", paddingBottom: "0.35rem", display: "flex", justifyContent: "space-between" }}>
                    <span>CONNECTED NEIGHBORS</span>
                    <span>({inspectorData.neighbors?.length || 0})</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", maxHeight: "180px", overflowY: "auto" }}>
                    {inspectorData.neighbors?.map((nbr) => {
                      const cfg = TYPE_CONFIG[nbr.type] || TYPE_CONFIG.Equipment;
                      return (
                        <div
                          key={nbr.id}
                          onClick={() => setSelectedNodeId(nbr.id)}
                          style={{
                            background: "#111827",
                            border: `1px solid ${cfg.stroke}40`,
                            borderRadius: "5px",
                            padding: "0.35rem 0.55rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <span style={{ color: cfg.color, fontSize: "0.74rem", fontWeight: "800", fontFamily: "monospace" }}>{nbr.id}</span>
                            <span style={{ color: "#94a3b8", fontSize: "0.68rem", marginLeft: "0.4rem" }}>{nbr.name}</span>
                          </div>
                          <span style={{ fontSize: "0.58rem", color: "#64748b", background: "#1e293b", padding: "0.08rem 0.3rem", borderRadius: "3px" }}>
                            {nbr.hop}h · {nbr.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Work Orders */}
                {inspectorData.node.type === "Equipment" && workOrders.length > 0 && (
                  <div style={{
                    background: "#060a12",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    padding: "0.6rem 0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}>
                    <div style={{ color: "#fb923c", fontSize: "0.72rem", fontWeight: "800", borderBottom: "1px solid #1e293b", paddingBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Wrench size={12} /> MAINTENANCE HISTORY ({workOrders.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", maxHeight: "200px", overflowY: "auto" }}>
                      {workOrders.slice(0, 8).map((wo, i) => (
                        <div key={i} style={{
                          background: "#111827",
                          border: "1px solid #1e293b",
                          borderRadius: "5px",
                          padding: "0.4rem 0.55rem",
                          fontSize: "0.7rem",
                          borderLeft: "3px solid #f97316",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#fb923c", fontWeight: "700", fontSize: "0.65rem" }}>
                            <span>{wo.log_id || wo.id}</span>
                            <span style={{ color: "#64748b" }}>{wo.maintenance_date}</span>
                          </div>
                          <div style={{ color: "#cbd5e1", fontSize: "0.68rem", marginTop: "0.15rem" }}>
                            {wo.description || wo.parts_replaced}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
