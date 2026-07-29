import json
from pathlib import Path
from typing import Dict, Any, List, Optional

from app.core.config import settings
from app.core.exceptions import AssetNotFoundError
from app.domains.assets.repository import EquipmentRepository, MaintenanceRepository

class AssetService:
    """
    Service responsible for managing asset metadata, topology,
    process unit relationships, equipment master data, and maintenance history logs.
    """

    def __init__(
        self,
        assets_file_path: Optional[str | Path] = None,
        equipment_repo: Optional[EquipmentRepository | str | Path] = None,
        maintenance_repo: Optional[MaintenanceRepository | str | Path] = None,
    ):
        self.assets_file_path = Path(assets_file_path) if assets_file_path else settings.ASSETS_PATH
        if not self.assets_file_path.exists():
            # Fallback lookup
            fallback = Path(__file__).parent.parent.parent / "core" / "assets.json"
            if fallback.exists():
                self.assets_file_path = fallback
            else:
                raise FileNotFoundError(f"Assets configuration not found at: {self.assets_file_path}")

        self._assets: Dict[str, Any] = json.loads(self.assets_file_path.read_text())

        if isinstance(equipment_repo, (str, Path)):
            self.equipment_repo = EquipmentRepository(Path(equipment_repo))
        elif equipment_repo is not None:
            self.equipment_repo = equipment_repo
        else:
            self.equipment_repo = EquipmentRepository()

        if isinstance(maintenance_repo, (str, Path)):
            self.maintenance_repo = MaintenanceRepository(Path(maintenance_repo))
        elif maintenance_repo is not None:
            self.maintenance_repo = maintenance_repo
        else:
            self.maintenance_repo = MaintenanceRepository()

    def get_all_assets(self) -> Dict[str, Any]:
        """Return the complete dictionary of asset definitions."""
        return self._assets

    def get_asset(self, tag: str) -> Optional[Dict[str, Any]]:
        """Return asset metadata dictionary for a specific tag or None if unknown."""
        return self._assets.get(tag)

    def is_equipment(self, tag: str) -> bool:
        """Check if an asset represents a process equipment unit."""
        asset = self.get_asset(tag)
        if not asset:
            return False
        return str(asset.get("asset_type", "")).startswith("Equipment")

    def get_all_equipment_master(self) -> List[Dict[str, Any]]:
        """Return list of all equipment master records."""
        return self.equipment_repo.get_all()

    def get_equipment_master_item(self, equipment_id: str) -> Optional[Dict[str, Any]]:
        """Return single equipment master record by equipment_id."""
        return self.equipment_repo.get_by_id(equipment_id)

    def get_maintenance_history(self, equipment_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return historical maintenance work orders."""
        if not equipment_id:
            return self.maintenance_repo.get_all()
        return self.maintenance_repo.get_by_equipment_id(equipment_id)
