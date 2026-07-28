import { API_BASE } from "../config/api.config.js";

/**
 * REST API client for the SysCAD Simulation Engine & MQTT Live Telemetry.
 */
export async function getSimulationStatus() {
  const res = await fetch(`${API_BASE}/simulation/status`);
  if (!res.ok) throw new Error("Failed to fetch simulation status");
  return res.json();
}

export async function startSimulation() {
  const res = await fetch(`${API_BASE}/simulation/start`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to start simulation");
  return res.json();
}

export async function pauseSimulation() {
  const res = await fetch(`${API_BASE}/simulation/pause`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to pause simulation");
  return res.json();
}

export async function resumeSimulation() {
  const res = await fetch(`${API_BASE}/simulation/resume`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to resume simulation");
  return res.json();
}

export async function stopSimulation() {
  const res = await fetch(`${API_BASE}/simulation/stop`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to stop simulation");
  return res.json();
}

export async function restartSimulation() {
  const res = await fetch(`${API_BASE}/simulation/restart`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to restart simulation");
  return res.json();
}

export async function setSimulationSpeed(speed) {
  const res = await fetch(`${API_BASE}/simulation/speed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speed: Number(speed) }),
  });
  if (!res.ok) throw new Error("Failed to update simulation speed");
  return res.json();
}

export async function getMqttStatus() {
  const res = await fetch(`${API_BASE}/api/mqtt/status`);
  if (!res.ok) throw new Error("Failed to fetch MQTT status");
  return res.json();
}

export async function getMqttTags() {
  const res = await fetch(`${API_BASE}/api/mqtt/tags`);
  if (!res.ok) throw new Error("Failed to fetch MQTT live tags");
  return res.json();
}
