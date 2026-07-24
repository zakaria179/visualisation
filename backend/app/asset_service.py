import json
from pathlib import Path
from typing import Dict, Any, Optional

class AssetService:
    """
    Service responsible for loading and querying asset metadata, topology,
    and process unit relationships from assets.json.
    """

    def __init__(self, assets_file_path: str | Path):
        self.assets_file_path = Path(assets_file_path)
        if not self.assets_file_path.exists():
            raise FileNotFoundError(f"Assets configuration not found at: {self.assets_file_path}")
        
        self._assets: Dict[str, Any] = json.loads(self.assets_file_path.read_text())

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
