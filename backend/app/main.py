from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import DigitalTwinException, digital_twin_exception_handler
from app.api.dependencies import init_app_services, shutdown_app_services
from app.api.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_app_services()
    yield
    shutdown_app_services()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Real-time SysCAD Dynamic Simulation Engine, MQTT Publisher/Subscriber, Multi-Layer Knowledge Graph & Asset Telemetry API",
    version=settings.VERSION,
    lifespan=lifespan,
)

# Exception handlers
app.add_exception_handler(DigitalTwinException, digital_twin_exception_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include master API router
app.include_router(api_router)
