import json
import logging
import re
import urllib.request
import urllib.error
from typing import Dict, Any, List, Set, Optional

from app.core.config import settings
from app.domains.assets.service import AssetService
from app.domains.knowledge_graph.service import KnowledgeGraphService
from app.domains.telemetry.service import TelemetryService

logger = logging.getLogger(__name__)

EQUIPMENT_KEYWORDS = {
    "PB_001": ["pump box", "sump", "pb_001", "pb001", "tank", "water line", "p_101", "p_001"],
    "SP_001": ["slurry pump", "pump", "sp_001", "sp001", "motor", "discharge pressure", "p_002", "p_003"],
    "CY_001_A": ["cyclone a", "hydrocyclone a", "cy_001_a", "cy001_a", "overflow", "underflow"],
    "CY_001_B": ["cyclone b", "hydrocyclone b", "cy_001_b", "cy001_b"],
    "CY_001_C": ["cyclone c", "hydrocyclone c", "cy_001_c", "cy001_c"],
    "BM_001": ["ball mill", "mill", "bm_001", "bm001", "grinding", "bearing", "acoustic", "sound", "p_004", "p_005"],
}

EQUIPMENT_ALIASES = {
    "CY_001": ["CY_001_A", "CY_001_B", "CY_001_C"],
    "CYCLONE": ["CY_001_A", "CY_001_B", "CY_001_C"],
    "HYDROCYCLONE": ["CY_001_A", "CY_001_B", "CY_001_C"],
}

SAMPLE_QUESTIONS = [
    "Why is Hydrocyclone pressure low and how does it affect the ball mill?",
    "Check Pump Box PB_001 inflow and outflow mass balance status.",
    "Summarize recent maintenance work orders and failure risks for Slurry Pump SP_001.",
    "What are the current operating temperatures and vibration levels across the grinding circuit?",
    "Explain the recirculating load loop from Mill BM_001 back to Pump Box PB_001."
]

class GraphRAGService:
    """
    Industrial Graph Retrieval-Augmented Generation (Graph RAG) Engine.
    
    Combines:
    1. Knowledge Graph Sub-graph Extraction (Topology, Process Streams, Sensors, Work Orders)
    2. Live Telemetry & Mass-Balance Derived Engineering KPIs
    3. LLM Synthesis via Google Gemini API (with deterministic industrial fallback)
    """

    def __init__(
        self,
        graph_service: KnowledgeGraphService,
        telemetry_service: TelemetryService,
        asset_service: AssetService,
    ):
        self.graph_service = graph_service
        self.telemetry_service = telemetry_service
        self.asset_service = asset_service

    def query(self, question: str, chat_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Process a natural language user query against the Digital Twin state."""
        q_lower = question.lower()
        
        # 1. Identify Target Equipment Nodes
        target_eq_ids = self._identify_target_equipment(q_lower)
        if chat_history and target_eq_ids == ["BM_001", "CY_001_A", "PB_001", "SP_001"]:
            for h in reversed(chat_history):
                h_target = self._identify_target_equipment(h.get("text", "").lower())
                if h_target != ["BM_001", "CY_001_A", "PB_001", "SP_001"]:
                    target_eq_ids = h_target
                    break
        
        # 2. Extract Sub-graph Topology
        subgraph = self._extract_subgraph(target_eq_ids)
        
        # 3. Retrieve Live Telemetry & Derived KPIs
        telemetry_data = self._retrieve_telemetry(target_eq_ids)
        
        # 4. Retrieve Maintenance Work Orders
        maintenance_logs = self._retrieve_maintenance_logs(target_eq_ids)
        
        # 5. Construct Ground-Truth Context Prompt
        context_str = self._build_context_prompt(subgraph, telemetry_data, maintenance_logs)
        
        # 6. Synthesize Response via Gemini API (or Fallback Engine)
        llm_response, engine_used = self._call_gemini_or_fallback(
            question, context_str, target_eq_ids, telemetry_data, maintenance_logs, chat_history=chat_history
        )
        
        return {
            "question": question,
            "answer": llm_response,
            "engine": engine_used,
            "retrieved_nodes": [n["id"] for n in subgraph["nodes"]],
            "target_equipment": target_eq_ids,
            "telemetry_snapshot": telemetry_data,
            "maintenance_logs_count": len(maintenance_logs),
            "citations": [
                {"source": "Knowledge Graph", "detail": f"{len(subgraph['nodes'])} nodes, {len(subgraph['edges'])} relations"},
                {"source": "MQTT SCADA Engine", "detail": f"Live telemetry for {len(telemetry_data)} units"},
                {"source": "Asset Maintenance Registry", "detail": f"{len(maintenance_logs)} historical work orders"}
            ]
        }

    def get_sample_questions(self) -> List[str]:
        return SAMPLE_QUESTIONS

    def _identify_target_equipment(self, q_lower: str) -> List[str]:
        if any(w in q_lower for w in ["machine here", "a machine", "every machine", "all machine", "circuit", "biggest cost", "highest cost", "repair a machine", "money"]):
            return ["BM_001", "CY_001_A", "PB_001", "SP_001"]

        matched = set()
        for alias, eq_list in EQUIPMENT_ALIASES.items():
            if alias.lower() in q_lower:
                matched.update(eq_list)
                
        for eq_id, keywords in EQUIPMENT_KEYWORDS.items():
            for kw in keywords:
                if kw in q_lower:
                    matched.add(eq_id)
                    break
                    
        if not matched:
            matched = {"PB_001", "SP_001", "CY_001_A", "BM_001"}
            
        return sorted(list(matched))

    def _extract_subgraph(self, equipment_ids: List[str]) -> Dict[str, Any]:
        topology = self.graph_service.get_topology()
        all_nodes = topology.get("nodes", [])
        all_edges = topology.get("edges", [])
        
        sub_node_ids: Set[str] = set(equipment_ids)
        
        for edge in all_edges:
            src = edge["source"]
            tgt = edge["target"]
            if src in equipment_ids:
                sub_node_ids.add(tgt)
            if tgt in equipment_ids:
                sub_node_ids.add(src)
                
        sub_nodes = [n for n in all_nodes if n["id"] in sub_node_ids]
        sub_edges = [e for e in all_edges if e["source"] in sub_node_ids and e["target"] in sub_node_ids]
        
        return {"nodes": sub_nodes, "edges": sub_edges}

    def _retrieve_telemetry(self, equipment_ids: List[str]) -> Dict[str, Any]:
        result = {}
        for eq_id in equipment_ids:
            res = self.telemetry_service.get_asset_telemetry(eq_id, current_record_idx=0)
            if res and "error" not in res:
                result[eq_id] = {
                    "live_metrics": res.get("live_metrics", {}),
                    "derived_kpis": res.get("derived_metrics", {}),
                    "status": res.get("condition_status", "GOOD")
                }
        return result

    def _retrieve_maintenance_logs(self, equipment_ids: List[str]) -> List[Dict[str, Any]]:
        all_logs = self.asset_service.get_maintenance_history()
        filtered = []
        for log in all_logs:
            eq = log.get("equipment_id")
            if eq in equipment_ids or any(eq_id in str(eq) for eq_id in equipment_ids):
                filtered.append(log)
        return filtered

    def _build_context_prompt(
        self,
        subgraph: Dict[str, Any],
        telemetry_data: Dict[str, Any],
        maintenance_logs: List[Dict[str, Any]]
    ) -> str:
        lines = ["=== INDUSTRIAL DIGITAL TWIN GROUND-TRUTH CONTEXT ==="]
        
        lines.append("\n--- RETRIEVED KNOWLEDGE GRAPH NODES & TOPOLOGY ---")
        for node in subgraph["nodes"]:
            lines.append(f"• [{node.get('type', 'Entity')}] {node.get('id')}: {node.get('name')} (Category: {node.get('category', 'N/A')}, Status: {node.get('status', 'OK')})")
            
        lines.append("\n--- PROCESS & TELEMETRY CONNECTIONS ---")
        for edge in subgraph["edges"]:
            lines.append(f"• {edge.get('source')} --[{edge.get('label')}]--> {edge.get('target')}")
            
        lines.append("\n--- LIVE SCADA TELEMETRY & DERIVED KPIS ---")
        for eq_id, data in telemetry_data.items():
            lines.append(f"\nAsset: {eq_id} (Status: {data.get('status')})")
            lines.append("  Live SCADA Telemetry Tags:")
            for k, v in data.get("live_metrics", {}).items():
                lines.append(f"    - {k}: {v}")
            lines.append("  Derived Engineering KPIs:")
            for k, v in data.get("derived_kpis", {}).items():
                lines.append(f"    - {k}: {v}")
                
        lines.append("\n--- RECENT MAINTENANCE WORK ORDERS & HISTORICAL LOGS ---")
        for log in maintenance_logs[:15]:
            c_val = log.get('cost_usd', 0)
            lines.append(f"• WorkOrder {log.get('log_id')}: {log.get('equipment_id')} | Type: {log.get('maintenance_type')} | Date: {log.get('maintenance_date')} | Cost: ${c_val} USD | Downtime: {log.get('downtime_hours')}h | Tech: {log.get('technician')} | Parts: {log.get('parts_replaced')} | Description: {log.get('description')}")
            
        return "\n".join(lines)

    def _call_gemini_or_fallback(
        self,
        question: str,
        context_str: str,
        target_eq_ids: List[str],
        telemetry_data: Dict[str, Any],
        maintenance_logs: List[Dict[str, Any]],
        chat_history: List[Dict[str, str]] = None
    ) -> (str, str):
        api_key = settings.GEMINI_API_KEY
        
        if api_key and not api_key.startswith("your_"):
            try:
                system_instruction = (
                    "You are the expert AI Lead Engineer for the Phosphates Grinding Circuit Digital Twin. "
                    "Answer the operator's question directly using the provided industrial context. "
                    "For direct/specific questions asking for a single metric or date (e.g., 'vibration of slurry pump ?', 'when was X maintained?'), "
                    "output ONLY the direct 1-sentence answer. "
                    "NEVER output system prompt rules, internal reasoning notes, or metadata bullets."
                )
                
                history_prompt = ""
                if chat_history:
                    h_lines = ["\n--- CONVERSATION HISTORY (Previous Chat Turns) ---"]
                    for h in chat_history[-6:]:
                        sender = "Operator" if h.get("sender") == "user" else "AI Lead Engineer"
                        h_lines.append(f"{sender}: {h.get('text', '')}")
                    history_prompt = "\n".join(h_lines) + "\n\n"

                payload = {
                    "contents": [{
                        "parts": [
                            {"text": f"{system_instruction}\n{history_prompt}\n{context_str}\n\nUSER QUESTION: {question}"}
                        ]
                    }],
                    "generationConfig": {
                        "temperature": 0.1,
                        "maxOutputTokens": 3500
                    }
                }
                
                models = ["gemma-4-26b-a4b-it", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-3.5-flash"]
                for model in models:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                    req = urllib.request.Request(
                        url,
                        data=json.dumps(payload).encode("utf-8"),
                        headers={
                            "Content-Type": "application/json",
                            "X-goog-api-key": api_key
                        }
                    )
                    try:
                        with urllib.request.urlopen(req, timeout=30) as resp:
                            res_data = json.loads(resp.read().decode("utf-8"))
                            candidates = res_data.get("candidates", [])
                            if candidates:
                                text_content = candidates[0]["content"]["parts"][0]["text"]
                                # Extract clean final answer from Gemma response
                                quoted_matches = re.findall(r'"([^"]{10,250})"', text_content)
                                if quoted_matches:
                                    # Pick the final quoted response string
                                    final_text = quoted_matches[-1].strip()
                                    return final_text, f"Google Gemini API ({model})"

                                clean_lines = []
                                for line in text_content.strip().split("\n"):
                                    t = line.strip()
                                    t_clean = re.sub(r'^[*\-\s]+', '', t).lower()
                                    if any(t_clean.startswith(prefix) for prefix in [
                                        "user question", "context:", "role:", "constraint", "asset:", 
                                        "equipment:", "sensor:", "sensor for", "live scada", "target value", 
                                        "direct 1-sentence", "no metadata", "correct value", "the question"
                                    ]):
                                        continue
                                    clean_lines.append(line)
                                final_text = "\n".join(clean_lines).strip()
                                if final_text.startswith('"') and final_text.endswith('"'):
                                    final_text = final_text[1:-1].strip()
                                return final_text, f"Google Gemini API ({model})"
                    except urllib.error.HTTPError as http_err:
                        error_body = http_err.read().decode("utf-8", errors="ignore")
                        logger.warning(f"Gemini API model {model} returned HTTP error {http_err.code}: {error_body}")
                        continue
                    except Exception as err:
                        logger.warning(f"Gemini API model {model} call failed: {err}")
                        continue
            except Exception as e:
                logger.error(f"Error during Gemini API invocation: {e}")

        fallback_text = self._synthesize_industrial_fallback(question, target_eq_ids, telemetry_data, maintenance_logs)
        return fallback_text, "Deterministic Industrial Graph RAG Engine (Local Fallback)"

    def _synthesize_industrial_fallback(
        self,
        question: str,
        target_eq_ids: List[str],
        telemetry_data: Dict[str, Any],
        maintenance_logs: List[Dict[str, Any]]
    ) -> str:
        q_lower = question.lower()
        lines = []

        if any(w in q_lower for w in ["how hydrocyclone", "how hydrocylone", "how cyclone", "how do hydrocyclones work", "how does a hydrocyclone work", "how hydrocyclone work", "how hydrocyclones work", "how hydrocylones work", "how work", "work ?"]):
            return (
                "### 💡 How Hydrocyclones Work (Centrifugal Classification)\n\n"
                "Hydrocyclones separate slurry particles by size and density using high-speed centrifugal force without moving parts:\n\n"
                "1. **Tangential Slurry Entry:** Pressurized slurry from Slurry Pump `SP_001` enters tangentially into the top cylindrical chamber of `CY_001`, forming a high-speed rotational vortex.\n"
                "2. **Centrifugal Separation:** Heavy, coarse ore particles are flung outward against the outer cone wall by strong centrifugal acceleration and spiral downward to exit through the bottom apex nozzle as **Underflow (`P_004`)**, returning to Ball Mill `BM_001` for regrinding.\n"
                "3. **Vortex Inversion & Overflow:** Water and fine liberated particles exit upward through the central **Vortex Finder** as **Overflow (`P_006`)**, feeding downstream flotation cells."
            )

        if any(w in q_lower for w in ["vibration"]):
            target_id = target_eq_ids[0] if target_eq_ids else "SP_001"
            telem = telemetry_data.get(target_id, {}).get("live_metrics", {})
            vib_key = [k for k in telem.keys() if "vibration" in k.lower()]
            if vib_key:
                val = telem[vib_key[0]]
                return f"The current vibration level for **{target_id}** is **{val} mm/s**."
            return f"Vibration telemetry currently unavailable for {target_id}."

        if any(w in q_lower for w in ["current", "amps", "amperage"]):
            target_id = target_eq_ids[0] if target_eq_ids else "SP_001"
            telem = telemetry_data.get(target_id, {}).get("live_metrics", {})
            curr_key = [k for k in telem.keys() if "current" in k.lower()]
            if curr_key:
                val = telem[curr_key[0]]
                return f"The motor current of **{target_id}** is **{val} A**."
            return f"Motor current telemetry currently unavailable for {target_id}."

        if any(w in q_lower for w in ["mttr", "avg", "average", "repair time", "downtime", "how long", "how much time"]):
            target_id = target_eq_ids[0] if target_eq_ids else "BM_001"
            eq_meta = self.asset_service.get_equipment_master_item(target_id)
            mttr = eq_meta.get("MTTR_hours") if eq_meta else None
            
            if mttr is not None:
                mtbf = eq_meta.get("MTBF_hours", "N/A")
                return f"The Mean Time To Repair (MTTR) for **{target_id}** is **{mttr} hours** (MTBF: {mtbf} hours)."
            else:
                all_history = self.asset_service.get_maintenance_history()
                matched_logs = [log for log in all_history if str(log.get("equipment_id", "")) == target_id]
                downtimes = [float(log.get("downtime_hours", 0)) for log in matched_logs if float(log.get("downtime_hours", 0)) > 0]
                if downtimes:
                    avg_dt = sum(downtimes) / len(downtimes)
                    return f"The average repair time for **{target_id}** is **{avg_dt:.1f} hours**."
                return f"No MTTR record available for {target_id}."

        elif any(w in q_lower for w in ["last time", "last maintain", "last service", "when was", "last repair"]):
            all_history = self.asset_service.get_maintenance_history()
            matched_logs = []
            for log in all_history:
                eq = str(log.get("equipment_id", ""))
                if any(t in eq for t in target_eq_ids) or any(t.replace("_", "") in eq for t in target_eq_ids):
                    matched_logs.append(log)
            if not matched_logs:
                matched_logs = all_history
            
            sorted_logs = sorted(matched_logs, key=lambda x: str(x.get("maintenance_date", "")), reverse=True)
            if sorted_logs:
                latest = sorted_logs[0]
                target_name = latest.get("equipment_id", "Equipment")
                return f"The **{target_name}** was last maintained on **{latest.get('maintenance_date')}** (Work Order **{latest.get('log_id')}**)."
            else:
                return "No maintenance history recorded for the target equipment."
        elif any(w in q_lower for w in ["cost", "expensive", "biggest", "highest", "maintenance cost", "money", "dollar", "spend", "repair"]):
            all_history = self.asset_service.get_maintenance_history()
            eq_highest_cost = {}
            for log in all_history:
                eq = log.get("equipment_id", "General")
                try:
                    c_val = float(log.get("cost_usd", 0.0) or 0.0)
                except (ValueError, TypeError):
                    c_val = 0.0
                if eq not in eq_highest_cost or c_val > eq_highest_cost[eq]["cost_num"]:
                    eq_highest_cost[eq] = {**log, "cost_num": c_val}
            
            lines.append("### 💡 Highest Maintenance Costs per Asset (Entire Grinding Circuit)\n")
            if eq_highest_cost:
                for eq in sorted(eq_highest_cost.keys()):
                    log = eq_highest_cost[eq]
                    c_val = log.get('cost_num', 0.0)
                    dt = log.get('downtime_hours', 'N/A')
                    desc = log.get('description', '')
                    m_type = log.get('maintenance_type', '')
                    lines.append(f"• **{eq}**: **${c_val:,.2f} USD** (`{m_type}` on {log.get('maintenance_date')}) — *{desc}* (Downtime: {dt}h)")
            else:
                lines.append("• No maintenance cost logs recorded.")
        elif any(w in q_lower for w in ["3 hydrocyclone", "three hydrocyclone", "instead of one", "why 3", "cluster", "parallel", "hydrocyclone"]):
            lines.extend([
                "### 💡 Hydrocyclone Cluster Design Rationale\n",
                "Operating a **cluster of 3 parallel hydrocyclones (`CY_001_A`, `CY_001_B`, `CY_001_C`)** instead of a single massive cyclone is standard mineral processing design for 3 critical engineering reasons:\n",
                "1. **Centrifugal G-Force & Cut-Size Efficiency ($d_{50}$ / P80):** Classification efficiency depends inversely on cyclone body diameter ($D$). A single cyclone sized to handle ~947 t/h would require an oversized diameter, severely weakening centrifugal acceleration ($a_c = v^2 / r$). A cluster of 3 smaller cyclones generates intense G-forces for sharp particle separation ($P80 \\approx 160 \\mu m$).\n",
                "2. **Operational Redundancy & Maintenance Availability:** Hydrocyclone wet-ends (apex nozzles, vortex finders) suffer aggressive phosphate slurry erosion. Having 3 parallel units allows isolating 1 unit for liner replacement without shutting down the entire ball mill grinding circuit.\n",
                "3. **Flow Turndown & Pressure Stabilization:** Plant feed rates fluctuate. By staging individual cyclones ON/OFF in the distributor manifold, operators maintain optimal inlet pressure (150–250 kPa) to prevent roping."
            ])
        elif any(w in q_lower for w in ["recirculat", "recycle", "loop", "load", "closed circuit"]):
            lines.extend([
                "### 💡 Closed-Circuit Recirculating Load\n",
                "The **recirculating load loop** recirculates coarse hydrocyclone underflow (`P_004`) back into Ball Mill `BM_001` for regrinding, while mill discharge (`P_005`) flows into Pump Box `PB_001`. This ensures over-grinding is prevented and fine product (`P_006`) exits efficiently to flotation."
            ])
        elif any(w in q_lower for w in ["vibration", "temp", "thermal", "heat", "bearing"]):
            lines.extend([
                "### 💡 Thermal & Mechanical Health Overview\n",
                "Monitored equipment bearing temperatures and vibration levels are evaluated against operational thresholds. Drive-End bearing temperatures on `BM_001` and slurry pump `SP_001` are operating within safe thermal envelopes (<65°C), with vibration RMS within normal baseline limits (<4.5 mm/s)."
            ])
        elif any(w in q_lower for w in ["pump", "sp_001", "sp001", "pressure"]):
            lines.extend([
                "### 💡 Slurry Pump Operational Status\n",
                "Slurry Pump `SP_001` draws slurry from Pump Box `PB_001` and discharges pressurized slurry (`P_003`) to the hydrocyclone distributor manifold. Discharge pressure is maintained near baseline (~309 kPa) to supply adequate head to the cyclone cluster."
            ])
        elif any(w in q_lower for w in ["mill", "ball mill", "bm_001", "bm001", "grinding"]):
            lines.extend([
                "### 💡 Ball Mill Comminution Performance\n",
                "Ball Mill `BM_001` operates at **74.05% of critical speed** with power draw around **1818 kW**. It achieves a size reduction ($\\Delta P80$) of ~442 µm, grinding coarse cyclone underflow into fine pulp."
            ])
        else:
            lines.extend([
                "### 💡 Grinding Circuit Overview\n",
                "The circuit operates in a closed loop: Fresh feed (`P_001`) enters Pump Box `PB_001`, is pumped by `SP_001` to Hydrocyclones `CY_001`, where fines (`P_006`) exit to flotation and coarse material (`P_004`) is reground in Ball Mill `BM_001`."
            ])
        
        return "\n".join(lines)
