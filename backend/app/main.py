import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.csv_loader import CSVLoader
from app.asset_service import AssetService
from app.telemetry_service import TelemetryService
from app.simulation_manager import SimulationManager
from app.mqtt_subscriber import MQTTSubscriberService
from app.routes import router, init_routes

# Base Directories and Paths
BASE_DIR = Path(__file__).parent
PROJECT_ROOT = BASE_DIR.parent.parent
DATA_DIR = Path("/data") if Path("/data").exists() else PROJECT_ROOT
ASSETS_PATH = BASE_DIR / "assets.json"

# Initialize modular architecture components
csv_loader = CSVLoader(DATA_DIR)
asset_service = AssetService(ASSETS_PATH, DATA_DIR / "equipment_master.csv")
mqtt_service = MQTTSubscriberService(
    host=os.getenv("MQTT_BROKER_HOST", "localhost"),
    port=int(os.getenv("MQTT_BROKER_PORT", "1883")),
)
mqtt_service.start()

telemetry_service = TelemetryService(asset_service, csv_loader, mqtt_service)
sim_manager = SimulationManager(csv_loader, mqtt_service=mqtt_service)

# Lifespan context manager for managing background services
@asynccontextmanager
async def lifespan(app: FastAPI):
    mqtt_service.start()
    yield
    mqtt_service.stop()

app = FastAPI(
    title="Digital Twin SysCAD & MQTT Telemetry Engine",
    description="Real-time SysCAD Dynamic Simulation Engine, MQTT Publisher/Subscriber & Asset Telemetry API",
    version="2.1.0",
    lifespan=lifespan,
)

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bind routes and include router
init_routes(sim_manager, telemetry_service)
app.include_router(router)
