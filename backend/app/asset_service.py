import csv
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

class AssetService:
    """
    Service responsible for loading and querying asset metadata, topology,
    and process unit relationships from assets.json and equipment_master.csv.
    """

    def __init__(self, assets_file_path: str | Path, equipment_master_path: Optional[str | Path] = None):
        self.assets_file_path = Path(assets_file_path)
        if not self.assets_file_path.exists():
            raise FileNotFoundError(f"Assets configuration not found at: {self.assets_file_path}")
        
        self._assets: Dict[str, Any] = json.loads(self.assets_file_path.read_text())
        self._equipment_master: List[Dict[str, Any]] = []
        self._equipment_map: Dict[str, Dict[str, Any]] = {}

        # Resolve equipment_master.csv location
        em_path = Path(equipment_master_path) if equipment_master_path else None
        if not em_path or not em_path.exists():
            # Search fallback paths
            candidates = [
                Path(__file__).parent / "equipment_master.csv",
                self.assets_file_path.parent / "equipment_master.csv",
                self.assets_file_path.parent.parent / "equipment_master.csv",
                self.assets_file_path.parent.parent.parent / "equipment_master.csv",
                Path("equipment_master.csv"),
                Path("/data/equipment_master.csv"),
                Path("files/equipment_master.csv"),
            ]
            for candidate in candidates:
                if candidate.exists():
                    em_path = candidate
                    break

        if em_path and em_path.exists():
            with open(em_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cleaned_row = {k.strip(): v.strip() for k, v in row.items() if k}
                    eq_id = cleaned_row.get("equipment_id")
                    if eq_id:
                        # Convert numeric fields
                        for num_field in ["maintenance_interval_days", "running_hours", "MTBF_hours", "MTTR_hours"]:
                            if num_field in cleaned_row:
                                try:
                                    cleaned_row[num_field] = float(cleaned_row[num_field]) if "." in cleaned_row[num_field] else int(cleaned_row[num_field])
                                except ValueError:
                                    pass
                        self._equipment_master.append(cleaned_row)
                        self._equipment_map[eq_id] = cleaned_row

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
        """Return list of all equipment master records from equipment_master.csv."""
        return list(self._equipment_master)

    def get_equipment_master_item(self, equipment_id: str) -> Optional[Dict[str, Any]]:
        """Return single equipment master record by equipment_id."""
        return self._equipment_map.get(equipment_id)
