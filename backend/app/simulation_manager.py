import threading
import time
import enum
from typing import Dict, Any, Optional
from app.data_provider import BaseDataProvider

class SimulationState(str, enum.Enum):
    STOPPED = "STOPPED"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    FINISHED = "FINISHED"
    ERROR = "ERROR"

class SimulationManager:
    """
    Simulation Engine Controller managing playback states (STOPPED, RUNNING, PAUSED, FINISHED, ERROR),
    current record pointer, playback speed, and background replay thread.
    """

    def __init__(self, data_provider: BaseDataProvider, base_interval: float = 1.0):
        self.data_provider = data_provider
        self.base_interval = base_interval  # 1.0 sec base interval per record at 1x speed

        self.state: SimulationState = SimulationState.STOPPED
        self.current_record_idx: int = 0
        self.speed: float = 1.0

        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()

    def start(self) -> Dict[str, Any]:
        """Start simulation from first CSV record (index 0)."""
        with self._lock:
            self.stop_worker_nolock()
            self.current_record_idx = 0
            self.state = SimulationState.RUNNING
            self.start_worker_nolock()
        return self.get_status()

    def pause(self) -> Dict[str, Any]:
        """Freeze current record index."""
        with self._lock:
            if self.state == SimulationState.RUNNING:
                self.state = SimulationState.PAUSED
        return self.get_status()

    def resume(self) -> Dict[str, Any]:
        """Continue simulation from current record index."""
        with self._lock:
            if self.state in [SimulationState.PAUSED, SimulationState.STOPPED, SimulationState.FINISHED]:
                total = self.data_provider.get_total_records()
                if total > 0 and self.current_record_idx >= total - 1:
                    self.current_record_idx = 0
                self.state = SimulationState.RUNNING
                self.start_worker_nolock()
        return self.get_status()

    def stop(self) -> Dict[str, Any]:
        """Stop simulation and reset to first record."""
        with self._lock:
            self.stop_worker_nolock()
            self.state = SimulationState.STOPPED
            self.current_record_idx = 0
        return self.get_status()

    def restart(self) -> Dict[str, Any]:
        """Reset to first record and start immediately."""
        with self._lock:
            self.stop_worker_nolock()
            self.current_record_idx = 0
            self.state = SimulationState.RUNNING
            self.start_worker_nolock()
        return self.get_status()

    def set_speed(self, speed: float) -> Dict[str, Any]:
        """Set simulation speed multiplier (e.g., 1, 2, 5, 10, 100)."""
        with self._lock:
            if speed > 0:
                self.speed = speed
        return self.get_status()

    def start_worker_nolock(self):
        """Spawns background replay worker thread."""
        if self._thread is None or not self._thread.is_alive():
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._worker_loop, daemon=True)
            self._thread.start()

    def stop_worker_nolock(self):
        """Cancels any existing worker thread."""
        self._stop_event.set()
        self._thread = None

    def _worker_loop(self):
        """Background thread loop advancing simulation records according to playback speed."""
        while not self._stop_event.is_set():
            if self.state == SimulationState.RUNNING:
                total = self.data_provider.get_total_records()
                if total == 0 or self.current_record_idx >= total - 1:
                    self.state = SimulationState.FINISHED
                    break

                # Sleep interval calculated from base_interval and speed multiplier
                interval = max(0.001, self.base_interval / max(0.1, self.speed))
                stopped = self._stop_event.wait(timeout=interval)
                if stopped:
                    break

                if self.state == SimulationState.RUNNING:
                    with self._lock:
                        if self.current_record_idx < total - 1:
                            self.current_record_idx += 1
                        else:
                            self.state = SimulationState.FINISHED
                            break
            elif self.state in [SimulationState.PAUSED, SimulationState.STOPPED, SimulationState.FINISHED]:
                # Idle wait while paused or stopped
                stopped = self._stop_event.wait(timeout=0.1)
                if stopped:
                    break

    def get_status(self) -> Dict[str, Any]:
        """Returns current simulation status metadata and controller state."""
        total = self.data_provider.get_total_records()
        current_record_num = self.current_record_idx + 1 if total > 0 else 0
        progress = round((current_record_num / total) * 100.0, 2) if total > 0 else 0.0

        record = self.data_provider.get_record_by_index(self.current_record_idx)
        elapsed_hours = float(record.get("ElapsedHrs", 0.0))
        sim_time = str(record.get("Time", "00:00:00.000"))

        return {
            "simulation_name": "SysCAD Dynamic Phosphates Grinding Circuit",
            "csv_file": "Dynamic Results.CSV",
            "state": self.state.value,
            "current_record": current_record_num,
            "total_records": total,
            "progress": progress,
            "speed": self.speed,
            "elapsed_hours": elapsed_hours,
            "simulation_time": sim_time,
        }
