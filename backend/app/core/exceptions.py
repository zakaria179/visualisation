from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

class DigitalTwinException(Exception):
    """Base exception for Digital Twin application."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class AssetNotFoundError(DigitalTwinException):
    def __init__(self, tag: str):
        super().__init__(f"Unknown asset tag: {tag}", status_code=404)

class EquipmentNotFoundError(DigitalTwinException):
    def __init__(self, equipment_id: str):
        super().__init__(f"Equipment record not found for: {equipment_id}", status_code=404)

class SimulationStateError(DigitalTwinException):
    def __init__(self, message: str):
        super().__init__(message, status_code=400)

class DatabaseConnectionError(DigitalTwinException):
    def __init__(self, message: str):
        super().__init__(message, status_code=503)

async def digital_twin_exception_handler(request: Request, exc: DigitalTwinException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "error": exc.__class__.__name__},
    )
