import unittest
from app.providers.csv_provider import CSVDataProvider
from app.domains.simulation.manager import SimulationManager, SimulationState
from app.core.config import settings

class TestSimulationManager(unittest.TestCase):
    def setUp(self):
        self.provider = CSVDataProvider(settings.DATA_DIR)
        self.manager = SimulationManager(self.provider)

    def test_initial_state(self):
        status = self.manager.get_status()
        self.assertEqual(status["state"], SimulationState.STOPPED.value)
        self.assertEqual(status["current_record"], 1 if status["total_records"] > 0 else 0)

    def test_start_pause_stop(self):
        self.manager.start()
        self.assertEqual(self.manager.state, SimulationState.RUNNING)
        self.manager.pause()
        self.assertEqual(self.manager.state, SimulationState.PAUSED)
        self.manager.stop()
        self.assertEqual(self.manager.state, SimulationState.STOPPED)

class TestMQTTPublisher(unittest.TestCase):
    def test_publisher_defaults_to_paused(self):
        from app.domains.simulation.publisher import MQTTPublisher
        publisher = MQTTPublisher()
        self.assertTrue(publisher.paused, "MQTTPublisher must start in paused state until Play is triggered")


if __name__ == "__main__":
    unittest.main()

