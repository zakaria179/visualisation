import csv
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.core.config import settings

class EquipmentRepository:
    """Repository handling file parsing and queries for equipment_master.csv."""
    def __init__(self, csv_path: Optional[Path] = None):
        self.csv_path = csv_path or settings.EQUIPMENT_MASTER_PATH
        self._records: List[Dict[str, Any]] = []
        self._map: Dict[str, Dict[str, Any]] = {}
        self.reload()

    def reload(self):
        self._records.clear()
        self._map.clear()

        # Find valid path
        em_path = self.csv_path
        if not em_path.exists():
            candidates = [
                settings.DATA_DIR / "equipment_master.csv",
                Path(__file__).parent / "equipment_master.csv",
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
                        for num_field in ["maintenance_interval_days", "running_hours", "MTBF_hours", "MTTR_hours"]:
                            if num_field in cleaned_row:
                                try:
                                    cleaned_row[num_field] = float(cleaned_row[num_field]) if "." in cleaned_row[num_field] else int(cleaned_row[num_field])
                                except ValueError:
                                    pass
                        self._records.append(cleaned_row)
                        self._map[eq_id] = cleaned_row

    def get_all(self) -> List[Dict[str, Any]]:
        return list(self._records)

    def get_by_id(self, equipment_id: str) -> Optional[Dict[str, Any]]:
        if not equipment_id:
            return None
        exact = self._map.get(equipment_id)
        if exact:
            return exact
        for k, v in self._map.items():
            if k.startswith(equipment_id) or equipment_id.startswith(k):
                return v
        return None

class MaintenanceRepository:
    """Repository handling file parsing and queries for maintenance_history.csv."""
    def __init__(self, csv_path: Optional[Path] = None):
        self.csv_path = csv_path or settings.MAINTENANCE_HISTORY_PATH
        self._records: List[Dict[str, Any]] = []
        self.reload()

    def reload(self):
        self._records.clear()
        mh_path = self.csv_path
        if not mh_path.exists():
            candidates = [
                settings.DATA_DIR / "maintenance_history.csv",
                Path(__file__).parent / "maintenance_history.csv",
            ]
            for candidate in candidates:
                if candidate.exists():
                    mh_path = candidate
                    break

        if mh_path and mh_path.exists():
            with open(mh_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cleaned_row = {k.strip(): v.strip() for k, v in row.items() if k}
                    if cleaned_row.get("equipment_id"):
                        for num_field in ["downtime_hours", "cost_usd"]:
                            if num_field in cleaned_row:
                                try:
                                    cleaned_row[num_field] = float(cleaned_row[num_field]) if "." in cleaned_row[num_field] else int(cleaned_row[num_field])
                                except ValueError:
                                    pass
                        self._records.append(cleaned_row)

    def get_all(self) -> List[Dict[str, Any]]:
        return list(self._records)

    def get_by_equipment_id(self, equipment_id: str) -> List[Dict[str, Any]]:
        if not equipment_id:
            return list(self._records)
        target = equipment_id.strip()
        base_prefix = target.split("_")[0]

        results = []
        for item in self._records:
            log_eq = item.get("equipment_id", "").strip()
            log_prefix = log_eq.split("_")[0]
            if log_eq == target or log_eq.startswith(target) or target.startswith(log_eq) or (base_prefix and base_prefix == log_prefix):
                results.append(item)
        return results
