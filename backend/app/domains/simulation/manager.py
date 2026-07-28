import threading
import time
import enum
import logging
from typing import Dict, Any, Optional
from app.core.interfaces import BaseDataProvider

logger = logging.getLogger(__name__)

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

    def __init__(self, data_provider: BaseDataProvider, base_interval: float = 1.0, mqtt_service: Any = None):
        self.data_provider = data_provider
        self.base_interval = base_interval
        self.mqtt_service = mqtt_service

        self.state: SimulationState = SimulationState.STOPPED
        self.current_record_idx: int = 0
        self.speed: float = 60.0

        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()

    def start(self) -> Dict[str, Any]:
        """Start simulation from first CSV record (index 0)."""
        with self._lock:
            self._interrupt_worker_nolock()
            self.current_record_idx = 0
            self.state = SimulationState.RUNNING
            self.start_worker_nolock()
            if self.mqtt_service and hasattr(self.mqtt_service, "publish_control"):
                self.mqtt_service.publish_control(action="START", speed=self.speed)
        return self.get_status()

    def pause(self) -> Dict[str, Any]:
        """Freeze current record index and signal MQTT publisher to pause."""
        with self._lock:
            if self.state == SimulationState.RUNNING:
                self.state = SimulationState.PAUSED
                if self.mqtt_service and hasattr(self.mqtt_service, "publish_control"):
                    self.mqtt_service.publish_control(action="PAUSE")
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
                if self.mqtt_service and hasattr(self.mqtt_service, "publish_control"):
                    self.mqtt_service.publish_control(action="RESUME", speed=self.speed)
        return self.get_status()

    def stop(self) -> Dict[str, Any]:
        """Stop simulation and reset to first record."""
        with self._lock:
            self.stop_worker_nolock()
            self.state = SimulationState.STOPPED
            self.current_record_idx = 0
            if self.mqtt_service:
                if hasattr(self.mqtt_service, "publish_control"):
                    self.mqtt_service.publish_control(action="STOP")
                if hasattr(self.mqtt_service, "clear_live_tags"):
                    self.mqtt_service.clear_live_tags()
        return self.get_status()

    def restart(self) -> Dict[str, Any]:
        """Reset to first record and start immediately."""
        with self._lock:
            self._interrupt_worker_nolock()
            self.current_record_idx = 0
            self.state = SimulationState.RUNNING
            self.start_worker_nolock()
            if self.mqtt_service and hasattr(self.mqtt_service, "publish_control"):
                self.mqtt_service.publish_control(action="START", speed=self.speed)
        return self.get_status()

    def set_speed(self, speed: float) -> Dict[str, Any]:
        """Set simulation speed multiplier (e.g., 1, 10, 60, 100, 600)."""
        with self._lock:
            if speed > 0:
                self.speed = speed
                self._interrupt_worker_nolock()
                if self.state == SimulationState.RUNNING:
                    self.start_worker_nolock()
                if self.mqtt_service and hasattr(self.mqtt_service, "publish_control"):
                    self.mqtt_service.publish_control(speed=self.speed)
        return self.get_status()

    def _interrupt_worker_nolock(self):
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=0.2)
        self._thread = None

    def start_worker_nolock(self):
        if self._thread is None or not self._thread.is_alive():
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._worker_loop, daemon=True)
            self._thread.start()

    def stop_worker_nolock(self):
        self._stop_event.set()
        self._thread = None

    def _worker_loop(self):
        while not self._stop_event.is_set():
            if self.state == SimulationState.RUNNING:
                total = self.data_provider.get_total_records()
                if total == 0 or self.current_record_idx >= total - 1:
                    self.state = SimulationState.FINISHED
                    break

                effective_speed = max(0.1, float(self.speed))
                step_delay = 60.0 / effective_speed

                stopped = self._stop_event.wait(timeout=step_delay)
                if stopped:
                    break

                if self.state == SimulationState.RUNNING:
                    with self._lock:
                        if self.current_record_idx < total - 1:
                            self.current_record_idx += 1
                        else:
                            self.state = SimulationState.FINISHED
                            break
            else:
                stopped = self._stop_event.wait(timeout=0.1)
                if stopped:
                    break

    def get_status(self) -> Dict[str, Any]:
        total = self.data_provider.get_total_records()
        current_record_num = self.current_record_idx + 1 if total > 0 else 0
        progress = round((current_record_num / total) * 100.0, 2) if total > 0 else 0.0

        record = self.data_provider.get_record_by_index(self.current_record_idx)
        elapsed_hours = float(record.get("ElapsedHrs", 0.0))
        
        raw_ts = str(record.get("Timestamp", record.get("Time", "")))
        if raw_ts and raw_ts != "00:00:00.000":
            sim_time = raw_ts
        else:
            total_sec = int(elapsed_hours * 3600)
            h = (total_sec // 3600) % 24
            m = (total_sec % 3600) // 60
            s = total_sec % 60
            sim_time = f"2026-07-01 {h:02d}:{m:02d}:{s:02d}"

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
            "timestamp": sim_time,
        }
