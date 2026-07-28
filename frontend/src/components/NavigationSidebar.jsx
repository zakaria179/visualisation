import React, { useEffect } from "react";
import { Activity, Wrench, Cpu, ChevronRight, ChevronLeft, Share2 } from "lucide-react";

/**
 * Sophisticated Round Floating Pull/Push Handle Navigation Sidebar.
 * Both '>' (when closed) and '<' (when open) are hidden off-screen by default.
 * When hovering near the left edge/sidebar, the round dark-glass handle smoothly slides out from left to right.
 */
export default function NavigationSidebar({ isOpen, onClose, onOpen, activeTab, setActiveTab }) {
  // Listen for Escape key to close navigation menu naturally
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelect = (id) => {
    setActiveTab(id);
  };

  const menuItems = [
    {
      id: "flowsheet",
      label: "Process Flowsheet & Control",
      sublabel: "Interactive SCADA P&ID, Live Telemetry & Control Engine",
      Icon: Activity,
    },
    {
      id: "maintenance",
      label: "Maintenance Circuit & Reliability",
      sublabel: "Asset Reliability, Overdue Alerts & Health Trends",
      Icon: Wrench,
    },
    {
      id: "knowledge-graph",
      label: "Knowledge Graph & Topology",
      sublabel: "Multi-Layer Node Network, Work Orders & Component Relationships",
      Icon: Share2,
    },
  ];

  return (
    <>
      {/* Round & Sophisticated Floating Handle CSS Micro-Interactions */}
      <style>{`
        /* Trigger zone along the left screen border */
        .left-hover-trigger {
          position: fixed;
          top: 0;
          left: 0;
          width: 42px;
          height: 100vh;
          z-index: 9998;
          pointer-events: auto;
        }

        /* Round floating pull handle ('>') when closed - Hidden by default */
        .round-pull-handle {
          position: fixed;
          top: 50%;
          left: 12px;
          z-index: 9999;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #0f172a;
          border: 1.5px solid #00f0ff;
          color: #00f0ff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
          transform: translate3d(-60px, -50%, 0);
          transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, box-shadow 0.2s ease, background 0.2s ease;
          will-change: transform, opacity;
          outline: none;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5);
        }

        /* Slide out smoothly from left to right on hover */
        .left-hover-trigger:hover + .round-pull-handle,
        .round-pull-handle:hover {
          opacity: 1 !important;
          pointer-events: auto !important;
          transform: translate3d(0, -50%, 0) !important;
          box-shadow: 0 0 22px rgba(0, 240, 255, 0.6) !important;
        }

        .round-pull-handle:hover {
          background: #162032 !important;
          color: #ffffff !important;
          transform: translate3d(0, -50%, 0) scale(1.08) !important;
        }

        /* Round floating push handle ('<') stuck permanently to open drawer edge */
        .round-push-handle {
          position: absolute;
          top: 50%;
          right: -20px;
          transform: translateY(-50%);
          z-index: 10001;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #0f172a;
          border: 1.5px solid #00f0ff;
          color: #00f0ff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 1;
          pointer-events: auto;
          outline: none;
          box-shadow: 0 0 16px rgba(0, 240, 255, 0.4);
          transition: all 0.15s ease;
        }

        .round-push-handle:hover {
          background: #162032 !important;
          color: #ffffff !important;
          transform: translateY(-50%) scale(1.08) !important;
          box-shadow: 0 0 24px rgba(0, 240, 255, 0.65) !important;
        }
      `}</style>

      {/* When Closed: Left Edge Trigger & Hidden Round Pull Handle ('>') */}
      {!isOpen && (
        <>
          <div className="left-hover-trigger" />
          <button
            onClick={onOpen}
            className="round-pull-handle"
            title="Open Navigation Menu"
            aria-label="Open Navigation"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Full Navigation Drawer Container */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          pointerEvents: isOpen ? "auto" : "none",
          display: "flex",
        }}
      >
        {/* Semi-transparent Backdrop Overlay */}
        <div
          onClick={onClose}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.5)",
            cursor: "pointer",
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
            transition: "opacity 0.28s ease",
          }}
        />

        {/* Hardware-Accelerated Sidebar Panel */}
        <div
          className="sidebar-panel"
          style={{
            position: "relative",
            width: "360px",
            height: "100%",
            background: "#0f172a",
            borderRight: "1px solid #1e293b",
            boxShadow: "12px 0 40px rgba(0, 0, 0, 0.6)",
            display: "flex",
            flexDirection: "column",
            padding: "1.5rem",
            boxSizing: "border-box",
            zIndex: 10000,
            pointerEvents: isOpen ? "auto" : "none",
            transform: isOpen ? "translate3d(0, 0, 0)" : "translate3d(-100%, 0, 0)",
            transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "transform",
          }}
        >
          {/* Round Floating Push Handle ('<') Attached to Drawer Edge */}
          {isOpen && (
            <button
              onClick={onClose}
              className="round-push-handle"
              title="Close / Hide Navigation Menu"
              aria-label="Close Navigation"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Drawer Header (Clean Title Bar) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              paddingBottom: "1.25rem",
              borderBottom: "1px solid #1e293b",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(0, 240, 255, 0.12)",
                border: "1px solid rgba(0, 240, 255, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00f0ff",
              }}
            >
              <Cpu size={22} />
            </div>
            <div>
              <div style={{ color: "#00f0ff", fontSize: "1.1rem", fontWeight: "900", letterSpacing: "0.8px" }}>
                NEXUS <span style={{ color: "#f8fafc", fontWeight: "300" }}>TWIN</span>
              </div>
              <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: "600", marginTop: "0.1rem" }}>
                Phosphate Industrial Intelligence
              </div>
            </div>
          </div>

          {/* Menu Items List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
            <div style={{ color: "#475569", fontSize: "0.72rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.15rem" }}>
              MODULE NAVIGATION
            </div>

            {menuItems.map((item) => {
              const isSelected = activeTab === item.id;
              const ItemIcon = item.Icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  style={{
                    minHeight: "90px",
                    boxSizing: "border-box",
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(2, 132, 199, 0.28) 0%, rgba(0, 240, 255, 0.14) 100%)"
                      : "#162032",
                    border: `1.5px solid ${isSelected ? "#00f0ff" : "#1e293b"}`,
                    borderRadius: "14px",
                    padding: "1rem 1.2rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                    boxShadow: isSelected
                      ? "0 0 24px rgba(0, 240, 255, 0.35), inset 0 0 14px rgba(0, 240, 255, 0.15)"
                      : "0 4px 12px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  {/* Left Icon Badge Container */}
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: isSelected ? "rgba(0, 240, 255, 0.15)" : "rgba(30, 41, 59, 0.8)",
                      border: `1px solid ${isSelected ? "rgba(0, 240, 255, 0.4)" : "#334155"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isSelected ? "#00f0ff" : "#94a3b8",
                      flexShrink: 0,
                    }}
                  >
                    <ItemIcon size={20} />
                  </div>

                  {/* Text Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: isSelected ? "#00f0ff" : "#f8fafc", fontWeight: "800", fontSize: "0.95rem", lineHeight: "1.2" }}>
                      {item.label}
                    </div>
                    <div style={{ color: isSelected ? "#cbd5e1" : "#94a3b8", fontSize: "0.74rem", marginTop: "0.25rem", lineHeight: "1.3" }}>
                      {item.sublabel}
                    </div>
                  </div>

                  {/* Fixed-width Right Indicator Wrapper */}
                  <div style={{ width: "24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isSelected ? (
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: "#00f0ff",
                          boxShadow: "0 0 12px #00f0ff",
                        }}
                      />
                    ) : (
                      <ChevronRight size={18} style={{ color: "#475569" }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div
            style={{
              paddingTop: "1.25rem",
              borderTop: "1px solid #1e293b",
              fontSize: "0.75rem",
              color: "#64748b",
              display: "flex",
              justify: "space-between",
              alignItems: "center",
            }}
          >
            <span>NEXUS SCADA v2.6</span>
            <span style={{ color: "#34d399", fontWeight: "700" }}>● ONLINE</span>
          </div>
        </div>
      </div>
    </>
  );
}
