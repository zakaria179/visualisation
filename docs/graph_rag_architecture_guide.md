# Graph RAG Architecture & Implementation Blueprint
## Phosphates Grinding Circuit Digital Twin & Telemetry Engine

---

## 1. Executive Summary & Problem Statement

In an industrial plant context—specifically the **Phosphates Grinding Circuit**—operational troubleshooting requires understanding **physical downstream/upstream dependencies**, **live SCADA telemetry**, and **historical failure logs**.

Traditional AI models using **Standard Vector RAG** (chunking PDF manuals or CSV logs into isolated embeddings) fail because they lack topological awareness. When an operator asks a multi-hop causal question:

> *"If Slurry Pump `SP_001` exhibits high vibration and low discharge pressure, how will it impact Hydrocyclones `CY_001` overflow particle size, and which technician resolved similar issues in the past?"*

Standard RAG struggles because the answer is not contained in a single text chunk. It requires connecting:
1. **Equipment Topology**: `SP_001` $\rightarrow$ `P_003` (Pressurized Slurry) $\rightarrow$ `CY_001_A/B/C` (Hydrocyclones) $\rightarrow$ `P_006` (Overflow Product Slurry).
2. **Live SCADA Telemetry**: `SP001_Vibration_mms` ($4.8\text{ mm/s}$), `SP001_Discharge_Pressure_kPa` ($165\text{ kPa}$), `CY001_Inlet_Pressure_A` ($110\text{ kPa}$).
3. **Derived Engineering KPIs**: Overflow $P_{80}$ particle size reduction ($\Delta P_{80}$).
4. **Historical Failure Modes & Work Orders**: Failure Mode `FM_SP_001` (Impeller Wear / Cavitation) and past Work Orders (`WO_003`, `WO_007`).

**Graph RAG (Graph Retrieval-Augmented Generation)** solves this by using the **Knowledge Graph (KG)** as a structural anchor, combining graph traversal with LLM reasoning.

---

## 2. Standard RAG vs. Graph RAG Comparison

| Feature | Standard Vector RAG | Graph RAG (Our Solution) |
| :--- | :--- | :--- |
| **Data Representation** | Isolated text chunks / embeddings | Structured nodes & edges + vector embeddings |
| **Multi-Hop Causality** | ❌ Fails (cannot trace multi-step paths) | ✅ Traverses $k$-hop physical pipeline dependencies |
| **SCADA Telemetry Integration** | ❌ Static text snapshots only | ✅ Dynamically injects live streaming telemetry |
| **Explainability** | Low (returns raw text quotes) | High (returns explicit graph paths & node IDs) |
| **Root Cause Analysis** | Partial keyphrase matching | Precise causal path tracing ($\text{Pump} \rightarrow \text{Pipeline} \rightarrow \text{Cyclone}$) |

---

## 3. How AI Interacts with the Knowledge Graph (The 4 Core AI Roles)

```
                            ┌──────────────────────────────────────────────┐
                            │               User Query                     │
                            │ "Why is CY_001 pressure dropping?"           │
                            └──────────────────────┬───────────────────────┘
                                                   │
                                                   ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ 1. Intent & Entity Extraction (AI identifies nodes: SP_001, CY_001_A, P_003)                      │
 └─────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                   │
                                                   ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ 2. Sub-Graph & Telemetry Retrieval (Extracts 2-hop physical neighborhood + live SCADA signals)   │
 └─────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                   │
                                                   ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ 3. Causal Multi-Hop Reasoning (Connects pump cavitation -> low discharge pressure -> cyclone DP) │
 └─────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                   │
                                                   ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ 4. Explainable AI Response (Returns natural language diagnosis + clickable graph highlights)   │
 └──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Intent & Entity Extraction (Query Understanding)
When an operator types a query, the AI LLM extracts:
- **Target Entities**: Equipment IDs (`BM_001`, `SP_001`, `PB_001`, `CY_001_A`), Streams (`P_001`..`P_006`), SCADA Sensors (`SP001_Vibration_mms`).
- **Intent**: Root-cause analysis, maintenance recommendation, telemetry trend correlation, or cost calculation.

### 2. Sub-Graph & Telemetry Neighborhood Extraction
Instead of passing the entire graph to the LLM, the Graph RAG engine extracts a focused **$k$-hop local sub-graph**:
- **Nodes**: Physical units, failure modes, work orders, technicians.
- **Edges**: `FEEDS_INTO`, `DISCHARGES_TO`, `RECIRCULATES`, `MONITORS`, `SERVICED`, `RESOLVED`.
- **Live State**: Latest numerical readings from the telemetry engine (`backend/app/domains/telemetry/`).

### 3. Natural Language Cypher / Graph Analytics Generation
For analytical queries (e.g., *"Find all corrective maintenance work orders costing over $3,000 for equipment linked to Pump Box PB_001"*), the AI converts natural language into Cypher graph queries:
```cypher
MATCH (eq:Equipment)-[:RECIRCULATES|FEEDS_INTO|DISCHARGES_TO]-(:Stream)-[]-(target:Equipment {id: 'PB_001'})
MATCH (wo:WorkOrder)-[:SERVICED]->(eq)
WHERE wo.cost_usd > 3000 AND wo.category = 'Corrective'
RETURN eq.name AS Equipment, wo.id AS WorkOrder, wo.cost_usd AS Cost, wo.description AS Details
ORDER BY wo.cost_usd DESC
```

### 4. Grounded Causal Reasoning
The LLM processes the structured sub-graph context and live telemetry signals to generate an explainable operational response with **zero hallucinations**, referencing exact node IDs and metric values.

---

## 4. Physical Graph Schema in This Digital Twin

Our graph topology (configured in `backend/app/domains/knowledge_graph/builder.py`) contains six primary node types:

1. **Equipment Nodes**: `PB_001` (Pump Box), `SP_001` (Slurry Pump), `CY_001_A/B/C` (Hydrocyclones), `BM_001` (Ball Mill).
2. **Stream Nodes**: `P_001` (Feed Ore), `P_101` (Water), `P_002` (Sump Discharge), `P_003` (Pump Discharge), `P_004` (Underflow), `P_005` (Mill Discharge), `P_006` (Overflow Product).
3. **SCADA Sensor Nodes**: Real-time tags (`SP001_Vibration_mms`, `CY001_Inlet_Pressure_A`, `BM001_Power_Draw_kW`, etc.).
4. **Failure Mode Nodes**: `FM_PB_001`, `FM_SP_001`, `FM_CY_001_A`, `FM_BM_001`.
5. **Work Order Nodes**: `WO_001`, `WO_002`, `LOG_WO_...` from `data/maintenance_history.csv`.
6. **Technician Nodes**: Maintenance personnel executing service tasks.

---

## 5. Step-by-Step Implementation Blueprint

### Step 1: Create Backend Domain (`backend/app/domains/graph_rag/`)
Implement the core modules:
- **`retriever.py`**: Sub-graph neighborhood extractor using Python `networkx` or `neo4j` driver.
- **`vector_store.py`**: Local vector embeddings for maintenance work order logs, failure descriptions, and equipment manuals.
- **`prompts.py`**: Domain-specific prompts forcing structured output with node references.
- **`service.py`**: Main Graph RAG service orchestrating graph retrieval, vector search, telemetry injection, and LLM inference.

### Step 2: Create API Endpoint (`backend/app/api/v1/copilot.py`)
Expose FastAPI endpoints:
- `POST /api/v1/copilot/query`: Accepts user prompt and returns AI answer + node/edge highlight IDs.
- `GET /api/v1/copilot/insights`: Background task generating real-time operational alerts based on live SCADA telemetry anomalies.

### Step 3: Integrate Interactive Frontend UI (`frontend/src/components/AICopilotDrawer.jsx`)
Create an AI Assistant drawer panel inside `KnowledgeGraphPage.jsx` and `Flowsheet.jsx`:
- Users ask questions in natural language.
- When the AI references nodes (e.g., `SP_001` $\rightarrow$ `P_003` $\rightarrow$ `CY_001_A`), the dashboard automatically highlights those exact canvas nodes and streams in real time!

---

## 6. Next Implementation Actions

When resuming work, we can execute:
1. **Backend Implementation**: Build `backend/app/domains/graph_rag/` with local in-memory sub-graph retriever.
2. **LLM Provider Setup**: Connect OpenAI API key, Google Gemini, or local Ollama (Llama-3/Qwen2.5) instance.
3. **Frontend Integration**: Add the interactive AI Copilot drawer component to the dashboard.
