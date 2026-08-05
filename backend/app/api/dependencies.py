from typing import Generator
from fastapi import Request

from app.providers.csv_provider import CSVDataProvider
from app.domains.assets.service import AssetService
from app.domains.assets.repository import EquipmentRepository, MaintenanceRepository
from app.domains.telemetry.subscriber import MQTTSubscriberService
from app.domains.telemetry.service import TelemetryService
from app.domains.simulation.manager import SimulationManager
from app.domains.knowledge_graph.service import KnowledgeGraphService
from app.domains.knowledge_graph.rag_service import GraphRAGService
from app.core.config import settings

# Global singletons
_csv_provider: CSVDataProvider = None
_asset_service: AssetService = None
_mqtt_service: MQTTSubscriberService = None
_telemetry_service: TelemetryService = None
_sim_manager: SimulationManager = None
_kg_service: KnowledgeGraphService = None
_rag_service: GraphRAGService = None

def init_app_services():
    global _csv_provider, _asset_service, _mqtt_service, _telemetry_service, _sim_manager, _kg_service, _rag_service

    _csv_provider = CSVDataProvider(settings.DATA_DIR)
    _asset_service = AssetService(
        assets_file_path=settings.ASSETS_PATH,
        equipment_repo=EquipmentRepository(settings.EQUIPMENT_MASTER_PATH),
        maintenance_repo=MaintenanceRepository(settings.MAINTENANCE_HISTORY_PATH),
    )
    _kg_service = KnowledgeGraphService(_asset_service, _csv_provider)
    _mqtt_service = MQTTSubscriberService(host=settings.MQTT_BROKER_HOST, port=settings.MQTT_BROKER_PORT)
    _mqtt_service.start()

    _telemetry_service = TelemetryService(_asset_service, _csv_provider, _mqtt_service)
    _sim_manager = SimulationManager(_csv_provider, mqtt_service=_mqtt_service)
    _rag_service = GraphRAGService(_kg_service, _telemetry_service, _asset_service)

def shutdown_app_services():
    global _mqtt_service, _kg_service
    if _mqtt_service:
        _mqtt_service.stop()
    if _kg_service:
        _kg_service.close()

def get_csv_provider() -> CSVDataProvider:
    return _csv_provider

def get_asset_service() -> AssetService:
    return _asset_service

def get_mqtt_service() -> MQTTSubscriberService:
    return _mqtt_service

def get_telemetry_service() -> TelemetryService:
    return _telemetry_service

def get_sim_manager() -> SimulationManager:
    return _sim_manager

def get_kg_service() -> KnowledgeGraphService:
    return _kg_service

def get_rag_service() -> GraphRAGService:
    return _rag_service
