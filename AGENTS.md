# AGENTS.md — System Architecture & Instructions

Welcome to the **Phosphates Grinding Circuit Digital Twin & Telemetry Engine** codebase.

## 🏗 System Architecture (V3 Domain-Driven Design)

The repository follows a production-ready, domain-driven architecture organized into decoupled services, providers, and presentation layers:

```
digital-twin-dashboard/
├── backend/                              # FastAPI Telemetry Engine & Domain Logic
│   ├── app/
│   │   ├── api/                          # REST API Routers & Controllers
│   │   │   ├── dependencies.py           # FastAPI Dependency Injection Providers
│   │   │   ├── router.py                 # Master API Router (v1 & legacy backward-compat)
│   │   │   └── v1/                       # Domain Routers (/api/v1/*)
│   │   ├── core/                         # Cross-Cutting Infrastructure
│   │   │   ├── config.py                 # Pydantic BaseSettings & Environment Config
│   │   │   ├── exceptions.py             # Custom Domain Exceptions & Error Handlers
│   │   │   ├── interfaces.py             # BaseDataProvider Abstract Contract
│   │   │   ├── logging.py                # Centralized Logging Configuration
│   │   │   └── utils.py                  # Parsing & Math Helpers
│   │   ├── domains/                      # Feature Domains (Domain-Driven Design)
│   │   │   ├── assets/                   # Asset Metadata, Topology & Maintenance History
│   │   │   ├── knowledge_graph/          # Industrial Graph Engine (Neo4j & Memory)
│   │   │   ├── simulation/               # Simulation State Machine & MQTT Publisher
│   │   │   └── telemetry/                # Live MQTT Telemetry & Derived Engineering KPIs
│   │   ├── providers/                    # Concrete Data Providers
│   │   │   └── csv_provider.py           # Dual-Stream CSV Data Provider (As-Of Join)
│   │   └── main.py                       # FastAPI Application Entrypoint & Lifespan Wireup
│   └── tests/                            # Automated Unit & Integration Tests
├── data/                                 # Single Source of Truth for CSV Datasets
│   ├── Dynamic Results.CSV
│   ├── equipment_master.csv
│   ├── machine_health_timeseries.csv
│   ├── maintenance_history.csv
│   ├── process_flow_timeseries.csv
│   └── tag_mapping_registry.csv
├── docs/                                 # Technical Documentation & Guides
│   ├── antigravity_prompts.md
│   └── mqtt_topic_tree_and_registry_guide.md
├── frontend/                             # React 19 + Vite Single Page Application
│   ├── src/
│   │   ├── api/                          # HTTP Fetch Clients (simulationApi.js)
│   │   ├── config/                       # Runtime Config (api.config.js)
│   │   ├── constants/                    # Theme & Status Constants
│   │   ├── context/                      # Simulation Context API State Provider
│   │   ├── hooks/                        # React Hooks (useSimulation)
│   │   ├── layouts/                      # Page Layout Wrappers
│   │   ├── pages/                        # View Pages (Flowsheet, Graph, Maintenance)
│   │   ├── components/                   # UI Presentation Components & Widgets
│   │   └── styles/                       # CSS Stylesheets (App.css, index.css)
│   └── tests/                            # Frontend Component Test Suite
├── infrastructure/                       # Deployment & Broker Configuration
│   └── mosquitto/config/mosquitto.conf   # Eclipse Mosquitto MQTT Broker Config
├── docker-compose.yml                    # Multi-Container Container Orchestration
└── run_system.sh                         # System Startup Launcher Script
```

## 🚀 Key Rules for AI Agents

1. **Single Source of Truth Data Path**: All dataset CSVs reside strictly in `./data/`. Never create CSV copies under `backend/` or `frontend/`.
2. **Domain Separation**:
   - Simulation state machine and stream replay live in `backend/app/domains/simulation/`.
   - Asset metadata and work order logs live in `backend/app/domains/assets/`.
   - Live MQTT subscribers and engineering calculations live in `backend/app/domains/telemetry/`.
   - Graph queries and Neo4j drivers live in `backend/app/domains/knowledge_graph/`.
3. **Dependency Injection**: Use `app/api/dependencies.py` for injecting services into FastAPI controllers. Avoid global variable mutations.
4. **Environment Variables**: Access settings via `app.core.config.settings`.
5. **Frontend API URL**: Frontend components fetch backend endpoints via `import { API_BASE } from "../config/api.config.js"`.
6. **Task Execution & Tracking**: ALWAYS break down user requests into an explicit TODO list, execute each item systematically, and log completed work into the `Work & Task Log` section in `AGENTS.md`.

## 🧪 Running Verification Commands

- **Backend Unit Tests**:
  ```bash
  PYTHONPATH=backend .venv/bin/python3 -m unittest discover -s backend/tests
  ```
- **Frontend Build Verification**:
  ```bash
  npm --prefix frontend run build
  ```
- **Local Full-Stack Launcher**:
  ```bash
  ./run_system.sh 60
  ```

## 📝 Work & Task Log

- **Initial Setup**: Configured `AGENTS.md` with a Work & Task Log section to log all ongoing changes, fixes, and task history across sessions.
- **Enforce TODO & Logging Protocol**: Added explicit rule requiring TODO tracking and continuous logging in `AGENTS.md` for every user request.
- **Frontend Flowsheet Node Styling**: Enforced dedicated stream-specific color lighting for `Process Water` (`#3b82f6` Blue), `Overflow` (`#10b981` Green), `Underflow` (`#f97316` Orange), `Slurry Out` (`#10b981` Green), and `Slurry In` (`#06b6d4` Cyan) in `Flowsheet.jsx`. Circumferences, glow filters, dot accents, and texts remain strictly lit in their own native colors in both default and selected states, without cyan overrides, while maintaining dark unlit interiors (`#0f172a`). Verified via clean `npm --prefix frontend run build`.
- **Backend MQTT Telemetry Flow Control**: Updated `MQTTPublisher` in `backend/app/domains/simulation/publisher.py` to start in a `PAUSED` (`start_paused=True`) state by default upon launching Docker / startup. Data streaming is completely stopped until the user triggers the Play/Start simulation action (`action="START"` or `action="RESUME"`). Added CLI `--unpaused` option and unit test `test_publisher_defaults_to_paused`. Verified via clean `PYTHONPATH=backend .venv/bin/python3 -m unittest discover -s backend/tests` (3/3 tests passed).
- **Verified Derived Engineering KPIs**: Audited and documented all dynamic derived engineering KPIs calculated across all grinding circuit equipment (`BM_001`, `CY_001`, `PB_001`, `SP_001`) in `backend/app/domains/telemetry/derived_metrics.py` and `service.py`.
- **Telemetry Unit Badges & Pump Mass Balance Fixes**:
  1. Added `getMetricUnit` helper in `App.jsx` and updated `MetricCard` to display styled engineering unit badges (`t/h`, `%`, `µm`, `°C`, `kPa`, `kW`, `A`, `RPM`, `mm/s`, `dB`) for all live and derived telemetry metrics.
  2. Fixed Pump Box (`PB_001`) `total_inflow` and `outflow` calculation in `derived_metrics.py` by properly summing fresh ore feed (`P_001`, 463.4 t/h) + process water (`P_101`, 0.0 t/h) + ball mill recycle (`P_005`, 487.9 t/h) = 951.4 t/h inflow, which balances against `outflow` (947.6 t/h).
  3. Decoupled Slurry Pump (`SP_001`) `suction_flow` (from incoming `P_002`) and `discharge_flow` (from outgoing `P_003`). Updated `P_002` columns in `assets.json`.
- **Unit Layout Refinement & Stream Count Cleanup**:
  1. Refined `MetricCard` in `App.jsx` so that units appear **exclusively beside the telemetry numerical value** (e.g. `947.60 t/h`), removing the duplicate top-right badge beside the telemetry name.
  2. Stripped all hardcoded parenthetical unit strings (e.g., `(t/h)`, `(% BPL)`, `(µm)`, `(%)`, `(°C)`, `(kPa)`, `(kW)`, `(A)`, `(RPM)`, `(mm/s)`, `(dB)`) from `DISPLAY_METRIC_NAMES` and `getDisplayMetricName()` in `App.jsx`, ensuring metric names are clean and units appear strictly beside the number.
  3. Removed `num_incoming_streams` and `num_outgoing_streams` from `derived_metrics.py` for `PB_001`. Verified via clean backend unit tests and frontend build.
- **Telemetry Underscore Cleanup**:
  1. Mapped all derived engineering metric keys (`delta_p80` $\rightarrow$ `Size Reduction`, `input_flow` $\rightarrow$ `Input Flow`, `output_flow` $\rightarrow$ `Output Flow`, `flow_difference` $\rightarrow$ `Flow Variance`, `feed_flow` $\rightarrow$ `Feed Flow`, `underflow_flow` $\rightarrow$ `Underflow Flow`, `overflow_flow` $\rightarrow$ `Overflow Flow`, `underflow_pct` $\rightarrow$ `Underflow Ratio`, `overflow_pct` $\rightarrow$ `Overflow Ratio`, `total_inflow` $\rightarrow$ `Total Inflow`, `outflow` $\rightarrow$ `Outflow`, `flow_balance` $\rightarrow$ `Flow Balance`, `suction_flow` $\rightarrow$ `Suction Flow`, `discharge_flow` $\rightarrow$ `Discharge Flow`) in `DISPLAY_METRIC_NAMES`.
- **Knowledge Graph & Maintenance Page Synchronization**:
  1. Synchronized `KnowledgeGraphPage.jsx` by adding `DISPLAY_METRIC_NAMES`, `getDisplayMetricName()`, and `getMetricUnit()` matching `App.jsx` formatting standards (clean Title Case names without parenthetical units, units displayed strictly beside numerical values).
  2. Integrated a dynamic **Live Telemetry & Derived KPIs** drawer panel in `KnowledgeGraphPage.jsx` that automatically fetches live stream telemetry and derived engineering metrics from `/api/v1/assets/{id}/telemetry` whenever a node (Equipment or Stream pipeline) is selected.
- **Knowledge Graph SCADA Sensors & Layout Overhaul**:
  1. Added missing SCADA Tag sensor nodes in `KnowledgeGraphPage.jsx` for Slurry Pump (`SP001_Motor_Current_A`, `SP001_Speed_RPM`, `SP001_Bearing_Temp_C`), Hydrocyclones (`CY001_Vortex_DP_A`, `CY001_Vortex_DP_B`, `CY001_Vortex_DP_C`), and Ball Mill (`BM001_Motor_Current_A`, `BM001_Bearing_NDE_Temp_C`).
  2. Linked all newly added SCADA sensor nodes to `SP_001`, `CY_001_A/B/C`, and `BM_001` with `MONITORS` telemetry edges.
  3. Expanded `StreamNode` rect width to `114px` in `Flowsheet.jsx` and updated `pillWidth` formula (`Math.max(36, idStr.length * 5.2 + 10)`) in `KnowledgeGraphPage.jsx` to prevent label text from overflowing node boundaries. Verified via clean `npm --prefix frontend run build` and backend unit tests.












