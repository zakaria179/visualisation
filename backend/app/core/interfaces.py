from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseDataProvider(ABC):
    """
    Abstract interface defining the contract for retrieving time-series simulation records.
    """

    @abstractmethod
    def get_total_records(self) -> int:
        """Return the total number of records available in the simulation dataset."""
        pass

    @abstractmethod
    def get_record_by_index(self, index: int) -> Dict[str, Any]:
        """Fetch a single simulation record dict by index."""
        pass

    @abstractmethod
    def get_history_by_index(self, columns: List[str], current_index: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch up to limit historical records for specific columns ending at current_index."""
        pass
