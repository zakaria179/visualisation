import React, { useState, useEffect, useRef } from "react";
import { Bot, Send, X, Sparkles, RefreshCw, ChevronDown, ChevronUp, Database, Copy, Check, Maximize2, Minimize2, GripHorizontal, Minus } from "lucide-react";
import { API_BASE as API } from "../config/api.config";

function renderInlineFormatting(text) {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} style={{ color: "#00f0ff", fontWeight: "700" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          style={{
            background: "#090d16",
            border: "1px solid #1e293b",
            color: "#38bdf8",
            padding: "0.1rem 0.35rem",
            borderRadius: "4px",
            fontSize: "0.74rem",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={idx} style={{ color: "#94a3b8", fontStyle: "italic" }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

function FormattedMessage({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const blocks = [];
  let currentTableLines = [];

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      currentTableLines.push(trimmed);
      return;
    }

    if (currentTableLines.length > 0) {
      blocks.push({ type: "table", lines: [...currentTableLines], key: `tbl-${lineIdx}` });
      currentTableLines = [];
    }

    if (!trimmed) {
      blocks.push({ type: "space", key: `sp-${lineIdx}` });
    } else if (trimmed.startsWith("### ") || trimmed.startsWith("#### ") || trimmed.startsWith("## ")) {
      blocks.push({ type: "header", text: trimmed.replace(/^#+\s*/, ""), key: `hdr-${lineIdx}` });
    } else if (trimmed.startsWith("> ")) {
      blocks.push({ type: "quote", text: trimmed.replace(/^>\s*/, ""), key: `q-${lineIdx}` });
    } else if (trimmed.startsWith("---") || trimmed.startsWith("***")) {
      blocks.push({ type: "divider", key: `div-${lineIdx}` });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || /^\d+\.\s/.test(trimmed)) {
      blocks.push({ type: "bullet", text: trimmed.replace(/^([-•]|\d+\.)\s*/, ""), key: `b-${lineIdx}` });
    } else {
      blocks.push({ type: "text", text: trimmed, key: `t-${lineIdx}` });
    }
  });

  if (currentTableLines.length > 0) {
    blocks.push({ type: "table", lines: [...currentTableLines], key: "tbl-end" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      {blocks.map((block) => {
        if (block.type === "space") return <div key={block.key} style={{ height: "0.2rem" }} />;
        if (block.type === "divider") return <hr key={block.key} style={{ border: "none", borderTop: "1px solid #1e293b", margin: "0.35rem 0" }} />;

        if (block.type === "header") {
          return (
            <div
              key={block.key}
              style={{
                marginTop: "0.4rem",
                marginBottom: "0.15rem",
                padding: "0.3rem 0.55rem",
                background: "rgba(15, 23, 42, 0.7)",
                borderLeft: "3px solid #00f0ff",
                borderRadius: "0 6px 6px 0",
                fontSize: "0.82rem",
                fontWeight: "800",
                color: "#f8fafc",
                letterSpacing: "0.3px",
              }}
            >
              {renderInlineFormatting(block.text)}
            </div>
          );
        }

        if (block.type === "quote") {
          return (
            <div
              key={block.key}
              style={{
                background: "rgba(56, 189, 248, 0.08)",
                borderLeft: "3px solid #38bdf8",
                padding: "0.35rem 0.55rem",
                borderRadius: "4px",
                fontSize: "0.74rem",
                color: "#cbd5e1",
                fontStyle: "italic",
                margin: "0.2rem 0",
              }}
            >
              {renderInlineFormatting(block.text)}
            </div>
          );
        }

        if (block.type === "bullet") {
          return (
            <div
              key={block.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.35rem",
                paddingLeft: "0.3rem",
                lineHeight: "1.45",
              }}
            >
              <span style={{ color: "#00f0ff", fontSize: "0.78rem", marginTop: "0.05rem" }}>•</span>
              <div style={{ flex: 1 }}>{renderInlineFormatting(block.text)}</div>
            </div>
          );
        }

        if (block.type === "table") {
          const rows = block.lines
            .filter((l) => !l.includes(":---") && !l.includes("---"))
            .map((l) => l.split("|").filter((_, i, arr) => i > 0 && i < arr.length - 1).map((c) => c.trim()));

          if (rows.length === 0) return null;
          const headerRow = rows[0];
          const bodyRows = rows.slice(1);

          return (
            <div key={block.key} style={{ overflowX: "auto", margin: "0.35rem 0" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.72rem",
                  background: "#090d16",
                  border: "1px solid #1e293b",
                  borderRadius: "6px",
                }}
              >
                <thead>
                  <tr style={{ background: "#162032", borderBottom: "1px solid #1e293b" }}>
                    {headerRow.map((col, idx) => (
                      <th key={idx} style={{ padding: "0.35rem 0.5rem", color: "#00f0ff", textAlign: "left", fontWeight: "700" }}>
                        {renderInlineFormatting(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: "1px solid #141e2e", background: rIdx % 2 === 0 ? "transparent" : "rgba(15, 23, 42, 0.4)" }}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} style={{ padding: "0.35rem 0.5rem", color: "#cbd5e1" }}>
                          {renderInlineFormatting(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return <div key={block.key} style={{ lineHeight: "1.45" }}>{renderInlineFormatting(block.text)}</div>;
      })}
    </div>
  );
}

export default function GraphRagDrawer({ isOpen, onClose }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "👋 Hello! I am the **Industrial Graph RAG AI Assistant** for the Phosphates Grinding Circuit Digital Twin.\n\nI analyze Knowledge Graph topology, live SCADA telemetry, derived mass-balance KPIs, and maintenance history to provide root-cause diagnostics.",
      citations: [],
      nodes: ["PB_001", "SP_001", "CY_001_A", "BM_001"],
      engine: "Industrial Graph RAG Engine"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState([]);
  const [expandedNodesIdx, setExpandedNodesIdx] = useState({});
  const [copiedIdx, setCopiedIdx] = useState(null);
  
  // Resizing, Maximizing & Draggable Position states
  const [drawerWidth, setDrawerWidth] = useState(520);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: null, y: 70 });
  
  const isResizing = useRef(false);
  const isDraggingPos = useRef(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const res = await fetch(`${API}/api/v1/rag/sample-questions`);
        if (res.ok) {
          setSamples(await res.json());
        }
      } catch (err) {
        console.error("Error fetching RAG sample questions:", err);
      }
    };
    fetchSamples();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Global mouse move & mouse up for resizing and dragging window
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing.current) {
        const currentX = position.x ?? (window.innerWidth - drawerWidth - 20);
        const newW = window.innerWidth - e.clientX;
        if (newW >= 380 && newW <= window.innerWidth * 0.92) {
          setDrawerWidth(newW);
        }
      } else if (isDraggingPos.current) {
        let newX = e.clientX - dragStartOffset.current.x;
        let newY = e.clientY - dragStartOffset.current.y;
        // Clamp bounds to prevent window from disappearing
        newX = Math.max(10, Math.min(window.innerWidth - 300, newX));
        newY = Math.max(10, Math.min(window.innerHeight - 150, newY));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      isDraggingPos.current = false;
      document.body.style.userSelect = "auto";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drawerWidth, position]);

  const startResizing = (e) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.userSelect = "none";
  };

  const startDraggingPos = (e) => {
    if (isMaximized) return;
    if (e.target.closest("button") || e.target.closest("input")) return;
    e.preventDefault();
    isDraggingPos.current = true;
    const currentX = position.x !== null ? position.x : (window.innerWidth - drawerWidth - 20);
    dragStartOffset.current = {
      x: e.clientX - currentX,
      y: e.clientY - position.y
    };
    document.body.style.userSelect = "none";
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const toggleNodes = (idx) => {
    setExpandedNodesIdx((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSend = async (queryText) => {
    const textToSend = queryText || question;
    if (!textToSend || !textToSend.trim() || loading) return;

    const userMsg = { sender: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({ sender: m.sender, text: m.text }));
      const res = await fetch(`${API}/api/v1/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: textToSend, chat_history: historyPayload }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.detail || `Backend server returned HTTP ${res.status} (${res.statusText})`;
        throw new Error(errMsg);
      }

      const data = await res.json();
      const botMsg = {
        sender: "bot",
        text: data.answer,
        citations: data.citations || [],
        nodes: data.retrieved_nodes || [],
        engine: data.engine || "Graph RAG Engine"
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `⚠️ **Error executing Graph RAG query:** ${err.message}`,
          citations: [],
          nodes: [],
          engine: "System Error"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Render minimized floating bubble pill in bottom right
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          position: "fixed",
          bottom: "28px",
          right: "24px",
          zIndex: 1000,
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%)",
          border: "1px solid rgba(0, 240, 255, 0.6)",
          boxShadow: "0 0 20px rgba(0, 240, 255, 0.5), 0 8px 25px rgba(0, 0, 0, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          backdropFilter: "blur(8px)",
        }}
        title="Expand Graph RAG AI Copilot"
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
      >
        <Bot size={24} color="#0f172a" />
      </div>
    );
  }

  const currentWidth = isMaximized ? "88vw" : `${drawerWidth}px`;
  const leftStyle = isMaximized ? "6vw" : (position.x !== null ? `${position.x}px` : undefined);
  const rightStyle = isMaximized ? "6vw" : (position.x !== null ? undefined : "16px");
  const topStyle = isMaximized ? "20px" : `${position.y}px`;
  const heightStyle = isMaximized ? "92vh" : "82vh";

  return (
    <div
      style={{
        position: "fixed",
        top: topStyle,
        left: leftStyle,
        right: rightStyle,
        width: currentWidth,
        height: heightStyle,
        maxWidth: "94vw",
        backgroundColor: "rgba(13, 19, 34, 0.82)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        border: "1px solid rgba(0, 240, 255, 0.3)",
        borderRadius: "16px",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 240, 255, 0.18)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: isResizing.current || isDraggingPos.current ? "none" : "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Draggable Resizer Bar on Left Border */}
      {!isMaximized && (
        <div
          onMouseDown={startResizing}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "6px",
            cursor: "col-resize",
            zIndex: 10,
            background: "transparent",
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) => (e.target.style.background = "#00f0ff")}
          onMouseLeave={(e) => (e.target.style.background = "transparent")}
          title="Drag left/right to resize floating drawer"
        />
      )}

      {/* Draggable Drawer Header */}
      <div
        onMouseDown={startDraggingPos}
        style={{
          padding: "0.85rem 1rem",
          background: "rgba(22, 32, 50, 0.85)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: isMaximized ? "default" : "grab",
          userSelect: "none",
        }}
        title={isMaximized ? "" : "Click and drag to move window anywhere on screen"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {!isMaximized && <GripHorizontal size={18} color="#64748b" style={{ marginRight: "0.1rem" }} />}
          
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 12px rgba(0, 240, 255, 0.4)",
            }}
          >
            <Bot size={18} color="#0f172a" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "0.9rem", color: "#f8fafc", fontWeight: "800", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              Graph RAG AI Copilot <Sparkles size={14} color="#00f0ff" />
            </h3>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Industrial Topology + Live SCADA RAG</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {/* Minimize to Bubble Button */}
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "0.3rem",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            title="Minimize to floating launcher bubble"
            onMouseEnter={(e) => (e.currentTarget.style.color = "#00f0ff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            <Minus size={16} />
          </button>

          {/* Maximize / Restore Toggle */}
          <button
            onClick={toggleMaximize}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "0.3rem",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            title={isMaximized ? "Restore window size" : "Expand window full width"}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#00f0ff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "0.3rem",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages Body */}
      <div
        style={{
          flex: 1,
          padding: "1rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
              gap: "0.35rem",
            }}
          >
            <div
              style={{
                maxWidth: "94%",
                background: msg.sender === "user" ? "linear-gradient(135deg, rgba(37, 99, 235, 0.85) 0%, rgba(29, 78, 216, 0.85) 100%)" : "rgba(22, 32, 50, 0.78)",
                backdropFilter: "blur(10px)",
                border: msg.sender === "user" ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: msg.sender === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                padding: "0.75rem 0.9rem",
                color: "#f8fafc",
                fontSize: "0.81rem",
                boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
              }}
            >
              <FormattedMessage text={msg.text} />

              {/* Clean Subtle Footer */}
              {msg.sender === "bot" && (
                <div style={{ marginTop: "0.6rem", paddingTop: "0.45rem", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "0.68rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {msg.engine && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#38bdf8", fontWeight: "600" }}>
                      <Sparkles size={11} /> {msg.engine}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {/* Copy Text Icon */}
                    <button
                      onClick={() => handleCopy(msg.text, idx)}
                      style={{
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: copiedIdx === idx ? "#10b981" : "#94a3b8",
                        cursor: "pointer",
                        fontSize: "0.65rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                        transition: "all 0.2s ease",
                      }}
                      title="Copy message content"
                    >
                      {copiedIdx === idx ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                      {copiedIdx === idx ? "Copied!" : "Copy"}
                    </button>

                    {/* Entities Dropdown Toggle */}
                    {msg.nodes && msg.nodes.length > 0 && (
                      <button
                        onClick={() => toggleNodes(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#64748b",
                          cursor: "pointer",
                          fontSize: "0.65rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.2rem",
                          padding: "0.1rem 0.3rem",
                          borderRadius: "4px",
                        }}
                      >
                        <Database size={10} /> {msg.nodes.length} Entities {expandedNodesIdx[idx] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Optional Collapsible Topology Nodes */}
              {msg.sender === "bot" && expandedNodesIdx[idx] && msg.nodes && msg.nodes.length > 0 && (
                <div style={{ marginTop: "0.4rem", paddingTop: "0.4rem", borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                  <div style={{ color: "#64748b", fontSize: "0.62rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                    Retrieved Context Nodes:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
                    {msg.nodes.filter(n => !n.startsWith("WO-")).slice(0, 10).map((nodeId) => (
                      <span
                        key={nodeId}
                        style={{
                          background: "rgba(0, 240, 255, 0.08)",
                          border: "1px solid rgba(0, 240, 255, 0.25)",
                          color: "#00f0ff",
                          padding: "0.05rem 0.3rem",
                          borderRadius: "3px",
                          fontSize: "0.62rem",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {nodeId.startsWith("FM_") ? `Risk:${nodeId.replace("FM_", "")}` : nodeId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#00f0ff", fontSize: "0.78rem" }}>
            <RefreshCw size={14} className="spin-animation" /> Synthesizing Graph RAG Diagnostic...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sample Question Chips */}
      {samples.length > 0 && (
        <div
          style={{
            padding: "0.5rem 0.8rem",
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(8px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>
            Suggested Queries:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {samples.slice(0, 3).map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                style={{
                  background: "rgba(22, 32, 50, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#cbd5e1",
                  borderRadius: "12px",
                  padding: "0.25rem 0.55rem",
                  fontSize: "0.68rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = "#00f0ff";
                  e.target.style.color = "#00f0ff";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.target.style.color = "#cbd5e1";
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box */}
      <div
        style={{
          padding: "0.75rem 0.8rem",
          background: "rgba(22, 32, 50, 0.78)",
          backdropFilter: "blur(8px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask Graph RAG about grinding circuit..."
          style={{
            flex: 1,
            background: "rgba(9, 13, 22, 0.75)",
            border: "1px solid rgba(0, 240, 255, 0.2)",
            borderRadius: "6px",
            padding: "0.5rem 0.75rem",
            color: "#f8fafc",
            fontSize: "0.8rem",
            outline: "none",
          }}
        />

        <button
          onClick={() => handleSend()}
          disabled={loading || !question.trim()}
          style={{
            background: "linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%)",
            border: "none",
            borderRadius: "6px",
            padding: "0.5rem 0.75rem",
            color: "#0f172a",
            cursor: loading || !question.trim() ? "not-allowed" : "pointer",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: loading || !question.trim() ? 0.5 : 1,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
