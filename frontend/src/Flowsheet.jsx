import React, { useState } from "react";

/**
 * Centralized Layout Grid Configuration (1120 x 580 canvas)
 * Ensures perfect alignment, equal component spacing, and clean pipe routing.
 */
const LAYOUT = {
  canvas: { width: 1120, height: 580 },

  // Stream Nodes (Feed Inputs & Discharge Outputs)
  nodes: {
    Slurry_In: { x: 65, y: 320, label: "Slurry In", tag: "P_001" },
    Process_Water: { x: 65, y: 440, label: "Process Water", tag: "P_101" },
    Slurry_Out: { x: 1045, y: 86, label: "Slurry Out", tag: "P_006" },
  },

  // Primary Equipment Components
  equipment: {
    PB_001: { x: 240, y: 380, label: "PUMP BOX", sublabel: "PB_001" },
    SP_001: { x: 420, y: 430, label: "SLURRY PUMP", sublabel: "SP_001" },
    CY_001: { x: 580, y: 120, label: "HYDROCYCLONES", sublabel: "CY_001" },
    BM_001: { x: 830, y: 380, label: "BALL MILL", sublabel: "BM_001" },
  },

  // Pipe Networks (Strictly following assets.json source/destination relationships)
  pipes: {
    P_001: {
      tag: "P_001",
      name: "Feed Slurry Line",
      color: "#06b6d4", // Cyan (Feed Slurry)
      points: [
        [115, 320],
        [180, 320],
        [180, 345],
        [204, 345],
      ],
      labelPos: { x: 147, y: 320 },
    },
    P_101: {
      tag: "P_101",
      name: "Process Water Line",
      color: "#3b82f6", // Blue (Process Water)
      points: [
        [115, 440],
        [180, 440],
        [180, 375],
        [208, 375],
      ],
      labelPos: { x: 180, y: 407 },
    },
    P_002: {
      tag: "P_002",
      name: "Pump Suction Line",
      color: "#0284c7", // Sky Blue
      points: [
        [240, 430],
        [240, 465],
        [360, 465],
        [360, 430],
        [384, 430],
      ],
      labelPos: { x: 300, y: 465 },
    },
    P_003: {
      tag: "P_003",
      name: "Cyclone Riser Feed",
      color: "#0284c7", // Sky Blue
      points: [
        [420, 394],
        [420, 108],
        [540, 108],
      ],
      labelPos: { x: 420, y: 251 },
    },
    P_006: {
      tag: "P_006",
      name: "Overflow Discharge",
      color: "#10b981", // Green (Overflow)
      points: [
        [628, 86],
        [995, 86],
      ],
      labelPos: { x: 811, y: 86 },
    },
    P_004: {
      tag: "P_004",
      name: "Underflow Line",
      color: "#f97316", // Orange (Underflow)
      points: [
        [580, 186],
        [580, 380],
        [734, 380],
      ],
      labelPos: { x: 580, y: 283 },
    },
    P_005: {
      tag: "P_005",
      name: "Mill Return Recycle",
      color: "#ec4899", // Magenta (Mill Return)
      points: [
        [927, 380],
        [970, 380],
        [970, 520],
        [300, 520],
        [300, 345],
        [276, 345],
      ],
      labelPos: { x: 635, y: 520 },
    },
  },
};

// Styling System Tokens
const SELECTION_CYAN = "#00f0ff";
const BASE_STROKE = "#475569";
const BASE_FILL = "#0f172a";
const CARD_BG = "#1e293b";
const TEXT_PRIMARY = "#f8fafc";
const TEXT_SECONDARY = "#94a3b8";

// Filters for Glow Behaviors
const HOVER_GLOW_FILTER = "drop-shadow(0px 0px 8px rgba(0, 240, 255, 0.6))";
const SELECTED_GLOW_FILTER = "drop-shadow(0px 0px 14px rgba(0, 240, 255, 0.95))";

/**
 * Builds a CAD-quality rounded SVG path d-string from orthogonal points.
 */
function buildRoundedPath(points, radius = 10) {
  if (!points || points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  }

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dx1 = curr[0] - prev[0];
    const dy1 = curr[1] - prev[1];
    const len1 = Math.hypot(dx1, dy1);

    const dx2 = next[0] - curr[0];
    const dy2 = next[1] - curr[1];
    const len2 = Math.hypot(dx2, dy2);

    const r = Math.min(radius, len1 / 2, len2 / 2);

    const startX = curr[0] - (dx1 / len1) * r;
    const startY = curr[1] - (dy1 / len1) * r;

    const endX = curr[0] + (dx2 / len2) * r;
    const endY = curr[1] + (dy2 / len2) * r;

    d += ` L ${startX} ${startY} Q ${curr[0]} ${curr[1]} ${endX} ${endY}`;
  }
  d += ` L ${points[points.length - 1][0]} ${points[points.length - 1][1]}`;
  return d;
}

/**
 * Standardized Pipe Line Component (Path and Direction Arrowheads)
 */
const PipeLine = ({ tag, points, color, selected, onSelect }) => {
  const isSelected = selected === tag;
  const strokeColor = isSelected ? SELECTION_CYAN : color;
  const pathD = buildRoundedPath(points, 12);

  // Compute direction arrows along segments
  const arrows = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);

    if (dist > 40) {
      const midX = x1 + dx * 0.55;
      const midY = y1 + dy * 0.55;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      arrows.push({ x: midX, y: midY, angle, key: `${i}` });
    }
  }

  return (
    <g
      className="flowsheet-pipe"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(tag);
      }}
      style={{ cursor: "pointer" }}
    >
      {/* Invisible wider hit area for easy clicking */}
      <path d={pathD} fill="none" stroke="transparent" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />

      {/* Outer Glow Path when Selected */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke={SELECTION_CYAN}
          strokeWidth="8"
          strokeOpacity="0.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: SELECTED_GLOW_FILTER }}
        />
      )}

      {/* Main Pipe Line (Standardized 3px width) */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected ? 4 : 3}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "stroke 0.25s, stroke-width 0.25s" }}
      />

      {/* Flow Direction Arrowheads */}
      {arrows.map((arr) => (
        <polygon
          key={arr.key}
          points="-7,-4 7,0 -7,4"
          fill={strokeColor}
          transform={`translate(${arr.x}, ${arr.y}) rotate(${arr.angle})`}
          style={{ transition: "fill 0.25s ease" }}
        />
      ))}
    </g>
  );
};

/**
 * Standardized Pipe Tag Badge Component (Highest Layer Priority - Rendered above all pipes)
 */
const PipeLabel = ({ tag, labelPos, color, selected, onSelect }) => {
  if (!labelPos) return null;
  const isSelected = selected === tag;
  const strokeColor = isSelected ? SELECTION_CYAN : color;

  return (
    <g
      transform={`translate(${labelPos.x}, ${labelPos.y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(tag);
      }}
      style={{ cursor: "pointer" }}
    >
      <rect
        x="-25"
        y="-10"
        width="50"
        height="20"
        rx="4"
        fill={isSelected ? SELECTION_CYAN : CARD_BG}
        stroke={isSelected ? "#ffffff" : strokeColor}
        strokeWidth="1.5"
        style={{ transition: "all 0.25s ease" }}
      />
      <text
        x="0"
        y="3.5"
        textAnchor="middle"
        fill={isSelected ? "#0f172a" : TEXT_PRIMARY}
        fontSize="10"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {tag}
      </text>
    </g>
  );
};

/**
 * Equipment Standard Tag Badge Component (Above Equipment)
 */
const TagBadge = ({ tag, isSelected }) => (
  <g transform="translate(0, -64)">
    <rect
      x="-36"
      y="-10"
      width="72"
      height="20"
      rx="4"
      fill={isSelected ? SELECTION_CYAN : CARD_BG}
      stroke={isSelected ? "#ffffff" : BASE_STROKE}
      strokeWidth="1.5"
      style={{ transition: "all 0.25s ease" }}
    />
    <text
      x="0"
      y="3.5"
      textAnchor="middle"
      fill={isSelected ? "#0f172a" : "#38bdf8"}
      fontSize="11"
      fontWeight="800"
      fontFamily="Inter, system-ui, sans-serif"
      letterSpacing="0.5px"
    >
      {tag}
    </text>
  </g>
);

/**
 * Equipment Subtitle Component (Below Equipment) with background card to prevent line overlap
 */
const EquipmentTitle = ({ title, y = 62 }) => (
  <g transform={`translate(0, ${y})`}>
    <rect x="-52" y="-8" width="104" height="16" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
    <text
      x="0"
      y="3"
      textAnchor="middle"
      fill={TEXT_SECONDARY}
      fontSize="10"
      fontWeight="700"
      fontFamily="Inter, system-ui, sans-serif"
      letterSpacing="1px"
    >
      {title}
    </text>
  </g>
);

/**
 * Pump Box Component (PB_001): Normalized 100x90 Hopper Sump Symbol
 */
const PumpBox = ({ tag, x, y, selected, onSelect }) => {
  const isSelected = selected === tag;
  const strokeColor = isSelected ? SELECTION_CYAN : BASE_STROKE;
  const fillColor = isSelected ? "#1e293b" : BASE_FILL;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(tag);
      }}
      className="flowsheet-equipment"
      style={{ cursor: "pointer" }}
    >
      <g style={{ filter: isSelected ? SELECTED_GLOW_FILTER : "none", transition: "all 0.25s" }}>
        <TagBadge tag={tag} isSelected={isSelected} />

        {/* Top Rim Flange */}
        <rect x="-42" y="-45" width="84" height="8" rx="2" fill="#334155" stroke={strokeColor} strokeWidth="1.5" />

        {/* Hopper Body */}
        <polygon
          points="-36,-37 36,-37 20,35 -20,35"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isSelected ? 3 : 2}
        />

        {/* Liquid Level Indicators */}
        <path d="M -26,-15 Q -10,-18 0,-15 T 26,-15" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.8" />
        <path d="M -22,-4 Q -10,-7 0,-4 T 22,-4" fill="none" stroke="#0284c7" strokeWidth="1.5" opacity="0.6" />

        {/* Bottom Outlet Connection Spout */}
        <rect x="-12" y="35" width="24" height="15" fill="#334155" stroke={strokeColor} strokeWidth="1.5" />

        <EquipmentTitle title="PUMP BOX" y={62} />
      </g>
    </g>
  );
};

/**
 * Centrifugal Pump Component (SP_001): Normalized 80x80 Industrial Pump Symbol
 */
const Pump = ({ tag, x, y, selected, onSelect }) => {
  const isSelected = selected === tag;
  const strokeColor = isSelected ? SELECTION_CYAN : BASE_STROKE;
  const fillColor = isSelected ? "#1e293b" : BASE_FILL;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(tag);
      }}
      className="flowsheet-equipment"
      style={{ cursor: "pointer" }}
    >
      <g style={{ filter: isSelected ? SELECTED_GLOW_FILTER : "none", transition: "all 0.25s" }}>
        <g transform="translate(54, -40)">
          <rect
            x="-36"
            y="-10"
            width="72"
            height="20"
            rx="4"
            fill={isSelected ? SELECTION_CYAN : CARD_BG}
            stroke={isSelected ? "#ffffff" : BASE_STROKE}
            strokeWidth="1.5"
            style={{ transition: "all 0.25s ease" }}
          />
          <text
            x="0"
            y="3.5"
            textAnchor="middle"
            fill={isSelected ? "#0f172a" : "#38bdf8"}
            fontSize="11"
            fontWeight="800"
            fontFamily="Inter, system-ui, sans-serif"
            letterSpacing="0.5px"
          >
            {tag}
          </text>
        </g>

        {/* Support Baseplate */}
        <rect x="-24" y="24" width="48" height="8" rx="2" fill="#334155" stroke="#475569" strokeWidth="1.5" />

        {/* Suction Inlet Flange (Left) */}
        <rect x="-36" y="-6" width="10" height="12" fill="#334155" stroke={strokeColor} strokeWidth="1.5" />

        {/* Tangential Vertical Discharge Spout (Top) */}
        <path d="M -6,-24 L -6,-34 L 6,-34 L 6,-20 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="-8" y="-36" width="16" height="5" rx="1" fill="#334155" stroke={strokeColor} strokeWidth="1.5" />

        {/* Main Volute Casing Circle */}
        <circle cx="0" cy="0" r="25" fill={fillColor} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />

        {/* Impeller Symbol */}
        <polygon
          points="0,-20 18,12 -18,12"
          fill={isSelected ? SELECTION_CYAN : "#38bdf8"}
          fillOpacity={isSelected ? "0.9" : "0.35"}
          stroke={isSelected ? "#ffffff" : "#0284c7"}
          strokeWidth="1.5"
        />
        <circle cx="0" cy="0" r="5" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />

        <EquipmentTitle title="SLURRY PUMP" y={48} />
      </g>
    </g>
  );
};

/**
 * Hydrocyclone Cluster Component (CY_001): Normalized 120x120 Multi-Cyclone Symbol
 */
const Hydrocyclone = ({ tag, x, y, selected, onSelect }) => {
  const isSelected = selected === tag;
  const strokeColor = isSelected ? SELECTION_CYAN : BASE_STROKE;
  const fillColor = isSelected ? "#1e293b" : BASE_FILL;

  const renderSingleCone = (offsetX) => (
    <g transform={`translate(${offsetX}, 0)`} key={offsetX}>
      {/* Vortex Tube */}
      <rect x="-6" y="-30" width="12" height="12" fill="#334155" stroke={strokeColor} strokeWidth="1.5" />
      {/* Upper Cylinder */}
      <rect x="-14" y="-18" width="28" height="22" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      {/* Lower Cone */}
      <polygon points="-14,4 14,4 4,48 -4,48" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      {/* Underflow Tip */}
      <rect x="-5" y="48" width="10" height="8" fill="#334155" stroke={strokeColor} strokeWidth="1.5" />
    </g>
  );

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(tag);
      }}
      className="flowsheet-equipment"
      style={{ cursor: "pointer" }}
    >
      <g style={{ filter: isSelected ? SELECTED_GLOW_FILTER : "none", transition: "all 0.25s" }}>
        <TagBadge tag={tag} isSelected={isSelected} />

        {/* Overflow Manifold Header */}
        <rect x="-48" y="-40" width="96" height="12" rx="3" fill="#334155" stroke={strokeColor} strokeWidth="2" />

        {/* 3 Cyclones */}
        {renderSingleCone(-26)}
        {renderSingleCone(0)}
        {renderSingleCone(26)}

        {/* Underflow Trough */}
        <rect x="-38" y="56" width="76" height="10" rx="2" fill="#334155" stroke={strokeColor} strokeWidth="1.5" />

        <EquipmentTitle title="HYDROCYCLONES" y={82} />
      </g>
    </g>
  );
};

/**
 * Ball Mill Component (BM_001): Normalized 160x100 Horizontal Cylinder Symbol
 */
const BallMill = ({ tag, x, y, selected, onSelect }) => {
  const isSelected = selected === tag;
  const strokeColor = isSelected ? SELECTION_CYAN : BASE_STROKE;
  const fillColor = isSelected ? "#1e293b" : BASE_FILL;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(tag);
      }}
      className="flowsheet-equipment"
      style={{ cursor: "pointer" }}
    >
      <g style={{ filter: isSelected ? SELECTED_GLOW_FILTER : "none", transition: "all 0.25s" }}>
        <TagBadge tag={tag} isSelected={isSelected} />

        {/* Trunnion Pedestals */}
        <path d="M -78,25 L -88,54 L -62,54 L -68,25 Z M 68,25 L 62,54 L 88,54 L 78,25 Z" fill="#334155" stroke="#475569" strokeWidth="1.5" />

        {/* Left Feed Trunnion */}
        <polygon points="-65,-30 -85,-12 -85,12 -65,30" fill="#334155" stroke={strokeColor} strokeWidth="1.5" />
        <rect x="-96" y="-12" width="12" height="24" rx="2" fill="#1e293b" stroke={strokeColor} strokeWidth="1.5" />

        {/* Right Discharge Trunnion */}
        <polygon points="65,-30 85,-12 85,12 65,30" fill="#334155" stroke={strokeColor} strokeWidth="1.5" />
        <rect x="85" y="-12" width="12" height="24" rx="2" fill="#1e293b" stroke={strokeColor} strokeWidth="1.5" />

        {/* Main Mill Drum */}
        <rect x="-65" y="-38" width="130" height="76" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />

        {/* Central Girth Gear */}
        <rect x="-8" y="-43" width="16" height="86" rx="2" fill="#475569" stroke={isSelected ? SELECTION_CYAN : "#f59e0b"} strokeWidth="1.5" />
        <line x1="-8" y1="-22" x2="8" y2="-22" stroke="#f59e0b" strokeWidth="1.5" />
        <line x1="-8" y1="0" x2="8" y2="0" stroke="#f59e0b" strokeWidth="1.5" />
        <line x1="-8" y1="22" x2="8" y2="22" stroke="#f59e0b" strokeWidth="1.5" />

        {/* Liner Rib Detail Lines */}
        <line x1="-52" y1="-24" x2="-22" y2="-24" stroke="#334155" strokeWidth="2" />
        <line x1="-52" y1="0" x2="-22" y2="0" stroke="#334155" strokeWidth="2" />
        <line x1="-52" y1="24" x2="-22" y2="24" stroke="#334155" strokeWidth="2" />

        <line x1="22" y1="-24" x2="52" y2="-24" stroke="#334155" strokeWidth="2" />
        <line x1="22" y1="0" x2="52" y2="0" stroke="#334155" strokeWidth="2" />
        <line x1="22" y1="24" x2="52" y2="24" stroke="#334155" strokeWidth="2" />

        <EquipmentTitle title="BALL MILL" y={68} />
      </g>
    </g>
  );
};

/**
 * Stream Node Component: Feed Inputs & Outputs
 */
const StreamNode = ({ label, tag, x, y, type = "input", selected, onSelect }) => {
  const isSelected = selected === tag;
  const isInput = type === "input";
  const accentColor = isInput ? "#06b6d4" : "#10b981";

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(tag);
      }}
      className="flowsheet-equipment"
      style={{ cursor: "pointer" }}
    >
      <g style={{ filter: isSelected ? SELECTED_GLOW_FILTER : "none", transition: "all 0.25s" }}>
        {/* Stream Badge */}
        <rect
          x="-48"
          y="-18"
          width="96"
          height="36"
          rx="6"
          fill={isSelected ? SELECTION_CYAN : CARD_BG}
          stroke={isSelected ? "#ffffff" : accentColor}
          strokeWidth={isSelected ? "2.5" : "1.5"}
          style={{ transition: "all 0.25s ease" }}
        />

        <text
          x="0"
          y="-2"
          textAnchor="middle"
          fill={isSelected ? "#0f172a" : TEXT_PRIMARY}
          fontSize="11"
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {label}
        </text>
        <text
          x="0"
          y="10"
          textAnchor="middle"
          fill={isSelected ? "#0f172a" : TEXT_SECONDARY}
          fontSize="9"
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
        >
          ({tag})
        </text>

        {/* Direction Arrow */}
        <polygon
          points={isInput ? "52,0 44,-5 44,5" : "-52,0 -44,-5 -44,5"}
          fill={isSelected ? SELECTION_CYAN : accentColor}
        />
      </g>
    </g>
  );
};

/**
 * Main Refactored Flowsheet Component
 * Props:
 * - onSelect: (tag: string) => void
 * - selected: string (currently selected asset tag)
 */
export default function Flowsheet({ onSelect, selected }) {
  return (
    <div
      className="flowsheet-container"
      style={{
        width: "100%",
        height: "100%",
        maxHeight: "100%",
        background: "#0f172a",
        borderRadius: "10px",
        padding: "0.75rem",
        border: "1px solid #1e293b",
        boxShadow: "0 8px 20px -5px rgba(0, 0, 0, 0.4)",
        userSelect: "none",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* CAD Blueprint Background Grid Overlay */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          opacity: 0.12,
        }}
      >
        <defs>
          <pattern id="cadGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#475569" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cadGrid)" />
      </svg>

      {/* Header Info Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ color: "#38bdf8", fontWeight: "700", fontSize: "0.8rem", letterSpacing: "1px", textTransform: "uppercase" }}>
            PROCESS SCHEMATIC | GRINDING CIRCUIT
          </span>
          <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
            (Click any unit or pipe line to inspect)
          </span>
        </div>
        {selected && (
          <div
            style={{
              background: "#162032",
              border: "1px solid #00f0ff",
              padding: "0.15rem 0.6rem",
              borderRadius: "14px",
              color: "#00f0ff",
              fontSize: "0.75rem",
              fontWeight: "700",
              boxShadow: "0 0 8px rgba(0, 240, 255, 0.3)",
            }}
          >
            SELECTED: {selected}
          </div>
        )}
      </div>

      {/* Main Process Flow Diagram SVG */}
      <svg
        viewBox={`0 0 ${LAYOUT.canvas.width} ${LAYOUT.canvas.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", flex: 1, display: "block" }}
      >
        <style>{`
          .flowsheet-equipment {
            transition: transform 0.25s ease, filter 0.25s ease;
          }
          .flowsheet-equipment:hover {
            filter: ${HOVER_GLOW_FILTER} !important;
          }
          .flowsheet-pipe {
            transition: filter 0.25s ease;
          }
          .flowsheet-pipe:hover path {
            stroke: #00f0ff !important;
            stroke-width: 4px !important;
          }
          .flowsheet-pipe:hover rect {
            fill: #00f0ff !important;
            stroke: #ffffff !important;
          }
          .flowsheet-pipe:hover text {
            fill: #0f172a !important;
          }
        `}</style>

        {/* 1. PIPES LAYER (Rendered underneath equipment & labels) */}
        {Object.entries(LAYOUT.pipes).map(([key, p]) => (
          <PipeLine
            key={key}
            tag={p.tag}
            points={p.points}
            color={p.color}
            selected={selected}
            onSelect={onSelect}
          />
        ))}

        {/* 2. FEED INPUTS & DISCHARGE OUTPUTS LAYER */}
        <StreamNode
          label={LAYOUT.nodes.Slurry_In.label}
          tag={LAYOUT.nodes.Slurry_In.tag}
          x={LAYOUT.nodes.Slurry_In.x}
          y={LAYOUT.nodes.Slurry_In.y}
          type="input"
          selected={selected}
          onSelect={onSelect}
        />
        <StreamNode
          label={LAYOUT.nodes.Process_Water.label}
          tag={LAYOUT.nodes.Process_Water.tag}
          x={LAYOUT.nodes.Process_Water.x}
          y={LAYOUT.nodes.Process_Water.y}
          type="input"
          selected={selected}
          onSelect={onSelect}
        />
        <StreamNode
          label={LAYOUT.nodes.Slurry_Out.label}
          tag={LAYOUT.nodes.Slurry_Out.tag}
          x={LAYOUT.nodes.Slurry_Out.x}
          y={LAYOUT.nodes.Slurry_Out.y}
          type="output"
          selected={selected}
          onSelect={onSelect}
        />

        {/* 3. PRIMARY INDUSTRIAL EQUIPMENT LAYER */}
        <PumpBox
          tag="PB_001"
          x={LAYOUT.equipment.PB_001.x}
          y={LAYOUT.equipment.PB_001.y}
          selected={selected}
          onSelect={onSelect}
        />
        <Pump
          tag="SP_001"
          x={LAYOUT.equipment.SP_001.x}
          y={LAYOUT.equipment.SP_001.y}
          selected={selected}
          onSelect={onSelect}
        />
        <Hydrocyclone
          tag="CY_001"
          x={LAYOUT.equipment.CY_001.x}
          y={LAYOUT.equipment.CY_001.y}
          selected={selected}
          onSelect={onSelect}
        />
        <BallMill
          tag="BM_001"
          x={LAYOUT.equipment.BM_001.x}
          y={LAYOUT.equipment.BM_001.y}
          selected={selected}
          onSelect={onSelect}
        />

        {/* 4. PIPE TAG LABELS LAYER (Highest Priority - Rendered on top of all pipes and equipment) */}
        {Object.entries(LAYOUT.pipes).map(([key, p]) => (
          <PipeLabel
            key={key}
            tag={p.tag}
            labelPos={p.labelPos}
            color={p.color}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
      </svg>
    </div>
  );
}
