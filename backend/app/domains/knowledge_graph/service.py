import logging
from typing import Dict, Any, List, Optional

from app.domains.assets.service import AssetService
from app.core.interfaces import BaseDataProvider
from app.domains.knowledge_graph.builder import MemoryGraphBuilder
from app.domains.knowledge_graph.repository import CypherGraphRepository

logger = logging.getLogger(__name__)

class KnowledgeGraphService:
    """
    Unified Multi-Layer Industrial Knowledge Graph Service powered by Neo4j & In-Memory Fallback.
    """

    def __init__(
        self,
        asset_service: AssetService,
        data_provider: BaseDataProvider,
        repository: Optional[CypherGraphRepository] = None,
    ):
        self.asset_service = asset_service
        self.data_provider = data_provider
        self.repository = repository or CypherGraphRepository()

        self._memory_nodes: List[Dict[str, Any]] = []
        self._memory_edges: List[Dict[str, Any]] = []
        self._memory_node_map: Dict[str, Dict[str, Any]] = {}

        self.rebuild_memory_graph()
        if self.repository.connected:
            self.repository.seed_graph(self._memory_nodes, self._memory_edges)

    def rebuild_memory_graph(self):
        nodes, edges, node_map = MemoryGraphBuilder.build(self.asset_service)
        self._memory_nodes = nodes
        self._memory_edges = edges
        self._memory_node_map = node_map

    def get_topology(self) -> Dict[str, Any]:
        self.rebuild_memory_graph()
        cypher_topo = self.repository.fetch_topology()
        if cypher_topo:
            return cypher_topo

        return {
            "nodes": self._memory_nodes,
            "edges": self._memory_edges,
            "total_nodes": len(self._memory_nodes),
            "total_edges": len(self._memory_edges),
            "engine": "In-Memory Cypher Graph Engine"
        }

    def get_node_details(self, node_id: str) -> Dict[str, Any]:
        cypher_details = self.repository.fetch_node_details(node_id)
        if cypher_details:
            return cypher_details

        target = self._memory_node_map.get(node_id)
        if not target:
            return {"error": f"Node {node_id} not found"}

        connected_edges = [
            e for e in self._memory_edges if e["source"] == node_id or e["target"] == node_id
        ]
        neighbor_ids = set()
        for e in connected_edges:
            neighbor_ids.add(e["source"])
            neighbor_ids.add(e["target"])
        neighbor_ids.discard(node_id)

        neighbors = [self._memory_node_map[nid] for nid in neighbor_ids if nid in self._memory_node_map]

        return {
            "node": target,
            "edges": connected_edges,
            "neighbors": neighbors,
            "total_neighbors": len(neighbors),
            "engine": "In-Memory Graph Traversal"
        }

    def close(self):
        self.repository.close()

# Backward compatibility alias
KnowledgeGraphEngine = KnowledgeGraphService
