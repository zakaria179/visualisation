import logging
from typing import Dict, Any, List, Optional
from app.core.config import settings

try:
    from neo4j import GraphDatabase
except ImportError:
    GraphDatabase = None

logger = logging.getLogger(__name__)

class CypherGraphRepository:
    """Repository handling Neo4j Bolt connection, session management, Cypher seeding, and Cypher queries."""
    
    def __init__(self, uri: Optional[str] = None, user: Optional[str] = None, password: Optional[str] = None):
        self.uri = uri or settings.NEO4J_URI
        self.user = user or settings.NEO4J_USER
        self.password = password or settings.NEO4J_PASSWORD
        self.driver = None
        self.connected = False
        self.connect()

    def connect(self):
        if not GraphDatabase:
            logger.warning("Neo4j driver package not available. Cypher repository running in disconnected mode.")
            return

        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            with self.driver.session() as session:
                session.run("RETURN 1")
            self.connected = True
            logger.info("Connected to Neo4j Graph Database at %s", self.uri)
        except Exception as e:
            logger.warning("Neo4j container not active at %s (%s). Running in memory graph mode.", self.uri, e)
            self.connected = False

    def seed_graph(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]):
        if not self.driver or not self.connected:
            return

        try:
            with self.driver.session() as session:
                for node in nodes:
                    label = node.get("type", "Entity")
                    cypher = f"""
                    MERGE (n:{label} {{id: $id}})
                    SET n.name = $name,
                        n.category = $category,
                        n.status = $status,
                        n.x = $x,
                        n.y = $y
                    """
                    session.run(
                        cypher,
                        id=node["id"],
                        name=node["name"],
                        category=node.get("category", "General"),
                        status=node.get("status", "OK"),
                        x=node["x"],
                        y=node["y"]
                    )

                for edge in edges:
                    rel_type = edge["label"].replace("-", "_").replace(" ", "_")
                    cypher = f"""
                    MATCH (a {{id: $src}})
                    MATCH (b {{id: $tgt}})
                    MERGE (a)-[r:{rel_type}]->(b)
                    SET r.label = $label
                    """
                    session.run(cypher, src=edge["source"], tgt=edge["target"], label=edge["label"])
                logger.info("Cypher seeding finished successfully.")
        except Exception as e:
            logger.error("Error executing Cypher seeding queries: %s", e)

    def fetch_topology(self) -> Optional[Dict[str, Any]]:
        if not self.connected or not self.driver:
            return None

        try:
            with self.driver.session() as session:
                nodes_res = session.run("MATCH (n) RETURN n.id AS id, n.name AS name, labels(n)[0] AS type, n.category AS category, n.status AS status, n.x AS x, n.y AS y")
                cypher_nodes = [dict(record) for record in nodes_res]

                edges_res = session.run("MATCH (a)-[r]->(b) RETURN a.id AS source, b.id AS target, type(r) AS label")
                cypher_edges = [dict(record) for record in edges_res]

                if cypher_nodes:
                    return {
                        "nodes": cypher_nodes,
                        "edges": cypher_edges,
                        "total_nodes": len(cypher_nodes),
                        "total_edges": len(cypher_edges),
                        "engine": "Neo4j Database & Cypher Engine (Bolt)"
                    }
        except Exception as e:
            logger.warning("Cypher query error: %s", e)
        return None

    def fetch_node_details(self, node_id: str) -> Optional[Dict[str, Any]]:
        if not self.connected or not self.driver:
            return None

        try:
            with self.driver.session() as session:
                cypher = """
                MATCH (n {id: $id})
                OPTIONAL MATCH (n)-[r]-(m)
                RETURN n.id AS node_id, n.name AS name, labels(n)[0] AS type, n.category AS category, n.status AS status, n.date AS date, n.parts_replaced AS parts_replaced, n.downtime_hours AS downtime_hours, n.cost_usd AS cost_usd,
                       collect(DISTINCT {id: m.id, name: m.name, type: labels(m)[0], category: m.category}) AS neighbors,
                       collect(DISTINCT {source: startNode(r).id, target: endNode(r).id, label: type(r)}) AS edges
                """
                res = session.run(cypher, id=node_id)
                rec = res.single()
                if rec and rec["node_id"]:
                    target_node = {
                        "id": rec["node_id"],
                        "name": rec["name"],
                        "type": rec["type"],
                        "category": rec["category"],
                        "status": rec["status"],
                        "date": rec.get("date"),
                        "parts_replaced": rec.get("parts_replaced"),
                        "downtime_hours": rec.get("downtime_hours"),
                        "cost_usd": rec.get("cost_usd"),
                    }
                    neighbors = [n for n in rec["neighbors"] if n.get("id")]
                    edges = [e for e in rec["edges"] if e.get("source")]
                    return {
                        "node": target_node,
                        "edges": edges,
                        "neighbors": neighbors,
                        "total_neighbors": len(neighbors),
                        "engine": "Neo4j Cypher MATCH Query"
                    }
        except Exception as e:
            logger.warning("Cypher MATCH query error: %s", e)
        return None

    def close(self):
        if self.driver:
            self.driver.close()
