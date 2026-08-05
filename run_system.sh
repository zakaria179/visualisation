#!/usr/bin/env bash
# ==============================================================================
# Digital Twin Dashboard & MQTT Replay Engine Launcher
# ==============================================================================

set -e

# Colored log outputs
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SPEEDUP="${1:-60}"

echo -e "${CYAN}=======================================================${NC}"
echo -e "${CYAN}   🚀 DIGITAL TWIN DASHBOARD & MQTT SYSTEM LAUNCHER   ${NC}"
echo -e "${CYAN}=======================================================${NC}"

# Check virtual environment
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Setting up Python virtual environment (.venv)...${NC}"
    python3 -m venv .venv
    .venv/bin/pip install --quiet paho-mqtt pandas fastapi uvicorn neo4j
fi

# Function to clean up background jobs on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down all Digital Twin services...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    docker stop digital_twin_mosquitto_local 2>/dev/null || true
    echo -e "${GREEN}All processes terminated cleanly.${NC}"
}
trap cleanup EXIT INT TERM

# Pre-flight cleanup of lingering background processes & Docker containers
echo -e "${YELLOW}Cleaning up any stale background processes & containers on ports 8000, 5173, 1883...${NC}"
docker stop digital_twin_backend digital_twin_frontend digital_twin_mqtt_publisher digital_twin_mosquitto_local 2>/dev/null || true
docker ps -q --filter "publish=8000" | xargs -r docker stop 2>/dev/null || true
docker ps -q --filter "publish=5173" | xargs -r docker stop 2>/dev/null || true
docker ps -q --filter "publish=1883" | xargs -r docker stop 2>/dev/null || true

lsof -ti:8000 | xargs -r kill -9 2>/dev/null || true
lsof -ti:5173 | xargs -r kill -9 2>/dev/null || true
lsof -ti:5174 | xargs -r kill -9 2>/dev/null || true
fuser -k -9 8000/tcp 2>/dev/null || true
fuser -k -9 5173/tcp 2>/dev/null || true
fuser -k -9 5174/tcp 2>/dev/null || true
pkill -9 -f "uvicorn" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "app.domains.simulation.publisher" 2>/dev/null || true
sleep 1

# 1. Start Mosquitto MQTT Broker
echo -e "${GREEN}[1/4] Starting Mosquitto MQTT Broker on port 1883...${NC}"
docker stop digital_twin_mosquitto digital_twin_mosquitto_local 2>/dev/null || true
docker rm digital_twin_mosquitto digital_twin_mosquitto_local 2>/dev/null || true
docker ps -q --filter "publish=1883" | xargs -r docker stop 2>/dev/null || true

if docker run --rm -d --name digital_twin_mosquitto \
    -p 1883:1883 \
    -v "$(pwd)/infrastructure/mosquitto/config/mosquitto.conf:/mosquitto/config/mosquitto.conf" \
    eclipse-mosquitto:2.0 >/dev/null 2>&1; then
    echo -e "${GREEN}Mosquitto broker container started on port 1883.${NC}"
else
    echo -e "${YELLOW}Port 1883 is already occupied. Reusing active MQTT broker.${NC}"
fi

sleep 1

# 2. Start FastAPI Backend
echo -e "${GREEN}[2/4] Starting FastAPI Telemetry Engine on http://localhost:8000 ...${NC}"
PYTHONPATH=backend .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &

sleep 2

# 3. Start MQTT Telemetry Publisher
echo -e "${GREEN}[3/4] Starting MQTT Publisher (Speedup factor: ${SPEEDUP}x)...${NC}"
PYTHONPATH=backend .venv/bin/python3 -m app.domains.simulation.publisher --speedup "${SPEEDUP}" &

sleep 1

# 4. Start Vite Frontend
echo -e "${GREEN}[4/4] Starting React Frontend on http://localhost:5173 ...${NC}"
echo -e "${CYAN}-------------------------------------------------------${NC}"
echo -e "${GREEN}✔ Digital Twin System is ACTIVE!${NC}"
echo -e "${CYAN}   - Mosquitto Broker : localhost:1883${NC}"
echo -e "${CYAN}   - Backend API      : http://localhost:8000${NC}"
echo -e "${CYAN}   - Frontend UI      : http://localhost:5173${NC}"
echo -e "${CYAN}-------------------------------------------------------${NC}"

npm --prefix frontend run dev
