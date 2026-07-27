import React, { useState, useEffect } from "react";
import { Activity, Wrench, Cpu, ChevronRight, ChevronLeft } from "lucide-react";

/**
 * Left Navigation Burger Sidebar Drawer.
 * Optimized with hardware-accelerated GPU layers (will-change: transform) for 60fps/120fps buttery smooth motion.
 * The pull handle is hidden when closed until the user hovers near the left edge of the screen.
 */
export default function NavigationSidebar({ isOpen, onClose, onOpen, activeTab, setActiveTab }) {
  const [isHoveringLeft, setIsHoveringLeft] = useState(false);

  // Listen for Escape key to close hamburger menu naturally
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
  ];

  const showHandle = isOpen || isHoveringLeft;

  return (
    <>
      {/* Invisible Left Edge Hover Trigger Zone (Active when closed) */}
      {!isOpen && (
        <div
          onMouseEnter={() => setIsHoveringLeft(true)}
          onMouseLeave={() => setIsHoveringLeft(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "32px",
            height: "100vh",
            zIndex: 9998,
            cursor: "pointer",
          }}
        />
      )}

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
        {/* Semi-transparent Overlay */}
        <div
          onClick={onClose}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.45)",
            cursor: "pointer",
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
            transition: "opacity 0.3s ease",
            willChange: "opacity",
          }}
        />

        {/* Hardware Accelerated GPU Compositor Layer Sidebar Container */}
        <div
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
            pointerEvents: "auto",
            transform: isOpen ? "translate3d(0, 0, 0)" : "translate3d(-100%, 0, 0)",
            transition: "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "transform",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {/* Pull/Push Handle Button (Hidden until left edge hover when closed) */}
          <button
            onClick={isOpen ? onClose : onOpen}
            onMouseEnter={() => setIsHoveringLeft(true)}
            onMouseLeave={() => setIsHoveringLeft(false)}
            style={{
              position: "absolute",
              top: "50%",
              right: "-34px",
              transform: "translateY(-50%)",
              width: "34px",
              height: "64px",
              background: "linear-gradient(135deg, #0f172a 0%, #162032 100%)",
              border: "1.5px solid #00f0ff",
              borderLeft: "none",
              borderRadius: "0 14px 14px 0",
              color: "#00f0ff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "6px 0 18px rgba(0, 240, 255, 0.35)",
              transition: "opacity 0.22s ease, transform 0.22s ease, color 0.15s ease",
              opacity: showHandle ? 1 : 0,
              pointerEvents: showHandle ? "auto" : "none",
              zIndex: 10001,
            }}
            title={isOpen ? "Push / Close Hamburger Drawer" : "Pull / Open Hamburger Drawer"}
          >
            {/* Glowing vertical accent line */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "12px",
                bottom: "12px",
                width: "2px",
                background: "#00f0ff",
                boxShadow: "0 0 8px #00f0ff",
                borderRadius: "1px",
              }}
            />
            {isOpen ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
          </button>

          {/* Drawer Header */}
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
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(0, 240, 255, 0.12)",
                border: "1px solid rgba(0, 240, 255, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00f0ff",
              }}
            >
              <Cpu size={24} />
            </div>
            <div>
              <div style={{ color: "#00f0ff", fontSize: "1.15rem", fontWeight: "900", letterSpacing: "0.8px" }}>
                NEXUS <span style={{ color: "#f8fafc", fontWeight: "300" }}>TWIN</span>
              </div>
              <div style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: "600", marginTop: "0.1rem" }}>
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
                    minHeight: "92px",
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
                      width: "42px",
                      height: "42px",
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
                    <ItemIcon size={22} />
                  </div>

                  {/* Text Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: isSelected ? "#00f0ff" : "#f8fafc", fontWeight: "800", fontSize: "0.98rem", lineHeight: "1.2" }}>
                      {item.label}
                    </div>
                    <div style={{ color: isSelected ? "#cbd5e1" : "#94a3b8", fontSize: "0.75rem", marginTop: "0.3rem", lineHeight: "1.3" }}>
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
