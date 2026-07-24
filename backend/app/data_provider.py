from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseDataProvider(ABC):
    """
    Abstract Base Class for simulation data providers.
    Allows SimulationManager to interface seamlessly with CSV files, MQTT, OPC-UA, or Kafka.
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
        """Fetch historical records up to current_index for specified columns."""
        pass
