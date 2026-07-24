from typing import Dict, Any, List
from pathlib import Path
import pandas as pd
from app.data_provider import BaseDataProvider

class CSVLoader(BaseDataProvider):
    """
    Concrete implementation of BaseDataProvider loading SysCAD Dynamic Results CSV.
    Handles data indexing, NaN filling, and record extraction.
    """

    def __init__(self, file_path: str | Path):
        self.file_path = Path(file_path)
        if not self.file_path.exists():
            raise FileNotFoundError(f"CSV simulation dataset not found at: {self.file_path}")
        
        # Read dataset and fill NaNs to guarantee numeric stability
        self.df: pd.DataFrame = pd.read_csv(self.file_path)
        self.df = self.df.fillna(0.0)

    def get_total_records(self) -> int:
        """Return total row count of the simulation dataset."""
        return len(self.df)

    def get_record_by_index(self, index: int) -> Dict[str, Any]:
        """Fetch a specific simulation row dict by zero-based index."""
        if len(self.df) == 0:
            return {}
        bounded_idx = max(0, min(index, len(self.df) - 1))
        return self.df.iloc[bounded_idx].to_dict()

    def get_history_by_index(self, columns: List[str], current_index: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch up to limit historical rows prior to and including current_index."""
        valid_cols = [c for c in columns if c in self.df.columns]
        if not valid_cols or len(self.df) == 0:
            return []
        
        end_idx = min(current_index + 1, len(self.df))
        start_idx = max(0, end_idx - limit)
        
        sub_df = self.df.iloc[start_idx:end_idx][valid_cols]
        return sub_df.to_dict(orient="records")
