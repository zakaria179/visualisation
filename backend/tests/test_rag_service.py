import unittest
from unittest.mock import MagicMock

from app.domains.knowledge_graph.rag_service import GraphRAGService

class TestGraphRAGService(unittest.TestCase):
    def setUp(self):
        self.mock_graph_service = MagicMock()
        self.mock_telemetry_service = MagicMock()
        self.mock_asset_service = MagicMock()

        self.mock_graph_service.get_topology.return_value = {
            "nodes": [
                {"id": "PB_001", "name": "Pump Box Sump", "type": "Equipment", "category": "Tank", "status": "GOOD"},
                {"id": "SP_001", "name": "Slurry Pump", "type": "Equipment", "category": "Pump", "status": "GOOD"},
                {"id": "P_001", "name": "Feed Ore Slurry", "type": "Stream", "material": "Phosphate Ore Slurry"},
                {"id": "SP001_Vibration_mms", "name": "Pump Vibration", "type": "Sensor", "unit": "mm/s"}
            ],
            "edges": [
                {"source": "P_001", "target": "PB_001", "label": "FEEDS_INTO"},
                {"source": "PB_001", "target": "SP_001", "label": "DISCHARGES_TO"},
                {"source": "SP001_Vibration_mms", "target": "SP_001", "label": "MONITORS"}
            ]
        }

        self.mock_telemetry_service.get_asset_telemetry.return_value = {
            "asset_id": "SP_001",
            "asset_status": "GOOD",
            "live_telemetry": {"SP001_Discharge_Pressure_kPa": 185.4, "SP001_Vibration_mms": 2.1},
            "derived_kpis": {"suction_flow": 947.6, "discharge_flow": 947.6}
        }

        self.mock_asset_service.get_maintenance_history.return_value = [
            {
                "log_id": "LOG_001",
                "equipment_id": "SP_001",
                "maintenance_type": "Preventive",
                "maintenance_date": "2026-03-15",
                "description": "Inspected slurry pump impeller and suction liner wear.",
                "downtime_hours": 3.5
            }
        ]

        self.rag_service = GraphRAGService(
            graph_service=self.mock_graph_service,
            telemetry_service=self.mock_telemetry_service,
            asset_service=self.mock_asset_service
        )

    def test_query_entity_identification(self):
        target_ids = self.rag_service._identify_target_equipment("Why is slurry pump sp_001 vibration increasing?")
        self.assertIn("SP_001", target_ids)

    def test_subgraph_extraction(self):
        subgraph = self.rag_service._extract_subgraph(["SP_001"])
        node_ids = [n["id"] for n in subgraph["nodes"]]
        self.assertIn("SP_001", node_ids)
        self.assertIn("PB_001", node_ids)  # Connected neighbor

    def test_rag_query_execution(self):
        res = self.rag_service.query("What is the status of slurry pump SP_001?")
        self.assertEqual(res["question"], "What is the status of slurry pump SP_001?")
        self.assertTrue(len(res["answer"]) > 10)
        self.assertIn("SP_001", res["target_equipment"])
        self.assertGreaterEqual(len(res["citations"]), 3)

    def test_sample_questions(self):
        samples = self.rag_service.get_sample_questions()
        self.assertGreater(len(samples), 3)

class TestRAGApiEndpoints(unittest.TestCase):
    def test_api_rag_query_and_sample_questions(self):
        from fastapi.testclient import TestClient
        from app.main import app
        
        with TestClient(app) as client:
            res = client.get("/api/v1/rag/sample-questions")
            self.assertEqual(res.status_code, 200)
            self.assertIsInstance(res.json(), list)

            res_post = client.post("/api/v1/rag/query", json={"question": "What is the status of SP_001?"})
            self.assertEqual(res_post.status_code, 200)
            json_data = res_post.json()
            self.assertIn("answer", json_data)
            self.assertIn("retrieved_nodes", json_data)

if __name__ == "__main__":
    unittest.main()
