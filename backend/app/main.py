from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.csv_loader import CSVLoader
from app.asset_service import AssetService
from app.telemetry_service import TelemetryService
from app.simulation_manager import SimulationManager
from app.routes import router, init_routes

app = FastAPI(
    title="Digital Twin SysCAD Simulation Engine",
    description="Real-time SysCAD Dynamic Simulation Engine & Asset Telemetry API",
    version="2.0.0"
)

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Base Directories and Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = Path("/data")
CSV_PATH = DATA_DIR / "Dynamic Results.CSV"
ASSETS_PATH = BASE_DIR / "assets.json"

# Initialize modular architecture components
csv_loader = CSVLoader(CSV_PATH)
asset_service = AssetService(ASSETS_PATH)
telemetry_service = TelemetryService(asset_service, csv_loader)
sim_manager = SimulationManager(csv_loader)

# Bind routes and include router
init_routes(sim_manager, telemetry_service)
app.include_router(router)
