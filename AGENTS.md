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
- **Codebase Onboarding & Architectural Roadmap**: Formulated a structured 6-phase learning guide for walking through the project folder-by-folder and file-by-file (Data Datasets $\rightarrow$ Backend Core/Domains $\rightarrow$ API Layer $\rightarrow$ Infrastructure/Simulation $\rightarrow$ Frontend Architecture $\rightarrow$ Integration & Verification).
- **Phase 1 Deep Dive Completed**: Conducted file-by-file inspection and detailed walkthrough of `data/` and `docs/` (`equipment_master.csv`, `tag_mapping_registry.csv`, `process_flow_timeseries.csv`, `machine_health_timeseries.csv`, `maintenance_history.csv`, and `mqtt_topic_tree_and_registry_guide.md`), explaining multi-clock domain architecture, SCADA tag mapping, process streams, and maintenance work orders.
- **Dataset Cleanup & Work Order Reference Guide**:
  1. Kept `RecordNo` index column intact across `data/process_flow_timeseries.csv` and `data/machine_health_timeseries.csv` for tracking sequential row numbers (`1..2880` and `1..43200`).
  2. Deleted legacy unaligned v1 dataset `data/Dynamic Results.CSV` and updated backend `manager.py`, `schemas.py`, `assets.json` references to use the v3 dual-stream process/health dataset.
  3. Created [`docs/work_order_types_guide.md`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/docs/work_order_types_guide.md) detailing exact causes, triggers, and plant examples for work order codes (`CM-01` to `CM-03`, `PM-01` to `PM-05`, `INSP-01` to `INSP-02`).
- **Phase 2 Deep Dive Completed**: Inspected and documented backend core infrastructure (`config.py`, `interfaces.py`, `exceptions.py`, `utils.py`) and concrete data provider (`csv_provider.py`), explaining environment configuration, Pydantic settings, `BaseDataProvider` abstract contracts, custom exception handling, numeric parsing helpers, and `pd.merge_asof` dual-stream temporal joining.
- **Phase 3 Deep Dive Completed**: Inspected and documented backend Domain-Driven Design modules across `backend/app/domains/` (`assets`, `telemetry`, `knowledge_graph`, and `simulation`), explaining asset topology lookup, live MQTT telemetry buffering, dynamic derived engineering calculations, in-memory graph construction, and time-series stream replay state machine.
- **Phase 4 Deep Dive Completed**: Inspected and documented backend API layer across `backend/app/api/` (`dependencies.py`, `router.py`, `v1/*`) and `main.py`, explaining FastAPI lifespan setup, singleton dependency injection, CORS middleware, and domain REST endpoints (`/api/v1/assets`, `/telemetry`, `/graph`, `/maintenance`, `/simulation`).
- **Phase 5 Deep Dive Completed**: Inspected and documented React 19 + Vite frontend architecture across `frontend/src/` (`App.jsx`, `Flowsheet.jsx`, `KnowledgeGraphPage.jsx`, `MaintenancePage.jsx`, `SimulationContext.jsx`, `simulationApi.js`), explaining live telemetry polling, stream-specific color lighting, SCADA tag nodes, and KPI unit badges.
- **Phase 6 Deep Dive Completed**: Inspected and documented infrastructure & system execution files (`docker-compose.yml`, `mosquitto.conf`, `run_system.sh`, `AGENTS.md`), explaining container orchestration, MQTT broker configuration, launcher script automation, and system verification routines.
- **Graph RAG Architectural Consultation & Guide Creation**: Conducted architectural design breakdown for integrating Graph Retrieval-Augmented Generation (Graph RAG) into the Phosphates Grinding Circuit Digital Twin. Detailed AI-driven sub-graph retrieval, Cypher/Python query generation, causal multi-hop reasoning over industrial topology + live SCADA telemetry, and step-by-step implementation blueprint. Created comprehensive guide in [`docs/graph_rag_architecture_guide.md`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/docs/graph_rag_architecture_guide.md).
- **Industrial Graph RAG Engine & Frontend AI Copilot Integration**:
  1. Configured `GEMINI_API_KEY` in `backend/.env` and `app/core/config.py`.
  2. Implemented `GraphRAGService` in [`backend/app/domains/knowledge_graph/rag_service.py`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/app/domains/knowledge_graph/rag_service.py) with sub-graph topology extraction, live SCADA telemetry & derived mass-balance KPI injection, maintenance log correlation, Google Gemini API synthesis, and deterministic local industrial fallback engine.
  3. Added REST endpoints `POST /api/v1/rag/query` and `GET /api/v1/rag/sample-questions` in [`backend/app/api/v1/rag.py`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/app/api/v1/rag.py) and registered routes in [`backend/app/api/router.py`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/app/api/router.py).
  4. Built interactive React component [`GraphRagDrawer.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/components/GraphRagDrawer.jsx) with AI Copilot trigger in [`App.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/App.jsx) header.
  5. Added unit test suite [`backend/tests/test_rag_service.py`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/tests/test_rag_service.py) (8/8 tests passed) and verified clean production build via `npm --prefix frontend run build`.
- **Floating Glassmorphism AI Copilot & Right-Side Icon Trigger**:
  1. Updated [`GraphRagDrawer.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/components/GraphRagDrawer.jsx) into a fully draggable, translucent floating modal with header drag handle (`GripHorizontal`), minimize-to-bubble button, and border resizing.
  2. Removed AI Copilot button from top navbar in [`App.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/App.jsx) and placed a floating circular icon button (`48px`) without text name on the bottom right.
- **Model Selection & Direct Answer Quoting**:
  1. Configured [`rag_service.py`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/app/domains/knowledge_graph/rag_service.py) with Gemma 4 26B (`gemma-4-26b-a4b-it`) and multi-model HTTP 429 failover chain.
  2. Implemented regex quote extraction filter to return 100% clean, 1-sentence answers for direct telemetry queries without chain-of-thought scratchpad echoes.
- **Pump Box Maintenance Record CSV Fix (`WO-2026-0205`)**:
  - Fixed unquoted description string in [`data/maintenance_history.csv`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/data/maintenance_history.csv) for work order `WO-2026-0205` (`"De-sludged sump basin, inspected elastomer lining for erosion, and calibrated level sensor."`).
  - Corrected column shifting where cost parsed as `$NaN` and downtime as missing. Re-verified via backend API: `cost_usd` is `$3,100`, `downtime_hours` is `6.0` hours, `technician` is `"David Thorne (Mechanical Specialist)"`, and `status` is `"Completed"`. All 8 backend unit tests passed.
- **Git Push & Repository Synchronization**:
  - Added `.env`, `*.env`, and LibreOffice `.~lock.*#` patterns to `.gitignore` to protect API secrets.
  - Created `backend/.env.example` template configuration.
  - Verified backend unit tests (8/8 passed) and production frontend build (`npm run build`).
  - Staged, committed, and pushed all updated code, datasets, guides, and Industrial Graph RAG engine features to GitHub `origin/master`.
- **Phase 1 — Platform Authentication & Session Gating Completed**:
  1. **Co-Branded Assets**: Imported ENSA Berrechid (`logo_ensa.png`) and JESA / OCP Group (`logo_jesa.png`) logos into `frontend/src/assets/`.
  2. **Backend Security Infrastructure**: Created [`backend/app/core/security.py`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/app/core/security.py) using direct `bcrypt` password hashing and JWT token generation/decoding (`HS256`, 8-hour expiration).
  3. **Auth Service & Schemas**: Implemented [`backend/app/domains/auth/schemas.py`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/app/domains/auth/schemas.py) and [`backend/app/domains/auth/service.py`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/app/domains/auth/service.py) with pre-configured industrial demo roles (`operator`, `engineer`, `admin`).
  4. **FastAPI Route Protection**: Implemented `get_current_user` in [`backend/app/api/dependencies.py`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/app/api/dependencies.py) and endpoints `/api/v1/auth/login` and `/api/v1/auth/me` in [`backend/app/api/v1/auth.py`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/app/api/v1/auth.py).
  5. **Frontend Auth Context & Login Page**: Built [`frontend/src/context/AuthContext.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/context/AuthContext.jsx), co-branded glassmorphism split-screen login page [`frontend/src/pages/LoginPage.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/LoginPage.jsx) with quick role presets, and [`frontend/src/components/ProtectedRoute.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/components/ProtectedRoute.jsx) route guard.
  6. **API Header Attachment**: Updated [`frontend/src/api/simulationApi.js`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/api/simulationApi.js) to attach `Authorization: Bearer <token>` on requests.
  7. **Header Integration**: Updated [`frontend/src/App.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/App.jsx) top navbar to show the authenticated user badge and a red Logout button.
  8. **Verification**: 13/13 backend unit tests passed (`test_auth.py`, `test_rag_service.py`, `test_simulation.py`) and frontend production build compiled cleanly (`npm run build`).
- **JESA Logo Background Removal & Quick Select Authentication Fix**:
  1. Processed both [`frontend/src/assets/logo_jesa.png`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/assets/logo_jesa.png) and [`frontend/src/assets/logo_ensa.png`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/assets/logo_ensa.png) to convert white background pixels into alpha channels, producing clean transparent vector-like PNGs cropped to exact bounding boxes (`1846x433` and `292x80`).
  2. Fixed `"Failed to fetch"` error on login by updating endpoint routing in [`AuthContext.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/context/AuthContext.jsx) to try `/api/v1/auth/login` and `/auth/login`, and adding an offline demo authentication fallback for quick-select demo roles (`operator`, `engineer`, `admin`) when the backend service is offline.
  3. Made quick select buttons in [`LoginPage.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/LoginPage.jsx) trigger immediate authentication upon click.
  4. Verified 13/13 backend unit tests pass and frontend build succeeds cleanly in 267ms.
- **Co-Branding 50/50 Equal Logo Layout**:
  - Updated [`LoginPage.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/LoginPage.jsx) header layout to wrap **ENSA Berrechid** and **JESA / OCP Group** logos in symmetrical `flex: 1` slot containers.
  - Both logos now occupy exactly **50% / 50% equal width** inside the pill header with balanced visual boundaries. Verified via clean frontend production build (270ms).
- **Full Platform ISA-101 Dark Slate Theme Overhaul**:
  1. **Standardized HMI Design System**: Updated [`index.css`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/styles/index.css) to enforce the official ISA-101 dark slate palette (`#0e1420` canvas, `#161f30` cards, `#2a384e` borders, `#475569` neutral equipment strokes, `#526580` process lines).
  2. **Complete Component Synchronization**: Applied the ISA-101 theme across all platform components: [`App.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/App.jsx) (header, metric cards, status badges), [`LoginPage.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/LoginPage.jsx) (co-branded authentication card), [`NavigationSidebar.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/components/NavigationSidebar.jsx) (screen hierarchy drawer), [`GraphRagDrawer.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/components/GraphRagDrawer.jsx) (AI Copilot modal), [`Flowsheet.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/Flowsheet.jsx) (P&ID overview), and [`KnowledgeGraphPage.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/KnowledgeGraphPage.jsx) (topology network).
  3. **Verification**: 13/13 backend unit tests passed and frontend compiled cleanly in 337ms.
- **Backend Docker Container Dependency Fix & Connection Restoration**:
  1. **Root Cause Analysis**: Inspected `digital_twin_backend` Docker container logs and identified startup crash: `ModuleNotFoundError: No module named 'bcrypt'`, caused by missing `bcrypt` and `PyJWT` packages in [`backend/requirements.txt`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/requirements.txt) required by [`backend/app/core/security.py`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/app/core/security.py).
  2. **Requirements Update**: Added `bcrypt==5.0.0` and `PyJWT==2.13.0` to [`backend/requirements.txt`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/backend/requirements.txt).
  3. **Container Rebuild & Verification**: Rebuilt and restarted the `digital_twin_backend` container via `docker compose up -d --build backend`. Verified API endpoints (`/api/v1/assets/BM_001` and `/api/v1/simulation/status`) return HTTP 200 OK. Ran 13/13 backend unit tests with 100% pass rate.
- **Complete Removal of Decorative Orange Colors**:
  1. **Strict ISA-101 Compliance**: Stripped all decorative orange accents (`#f97316`, `#fb923c`) from process flow badges (`StreamClassifierBadge` `UNDERFLOW` in [`Flowsheet.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/Flowsheet.jsx)), Knowledge Graph nodes & side drawers (`WorkOrder` & history in [`KnowledgeGraphPage.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/KnowledgeGraphPage.jsx)), and KPI stat cards in [`MaintenancePage.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/MaintenancePage.jsx).
  2. **Replacement with Neutral Slate & Standard Priority Colors**: Replaced all instances with neutral slate gray (`#475569`, `#94a3b8`, `#cbd5e1`) and standard ISA-101 amber (`#f59e0b`).
  3. **Verification**: 13/13 backend unit tests passed and frontend compiled cleanly in 284ms (`npm --prefix frontend run build`).
- **Restored Directional Arrows & Clean Single White Line Pipe Selection**:
  1. **Restored Arrows**: Re-enabled `getSinglePipeArrow` rendering on all stream lines with exact directional flow orientation.
  2. **Clean Single White Selection Line**: Updated `PipeLine` in [`Flowsheet.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/Flowsheet.jsx) so that clicking a pipe turns the line and arrow head to pure `#ffffff` white at the exact same `3.5px` stroke thickness as when gray, eliminating all thick outer contour layers, secondary lines, and drop-shadow glow filters.
  3. **Verification**: 13/13 backend unit tests passed and frontend compiled cleanly in 409ms (`npm --prefix frontend run build`).
- **Synchronized OVERFLOW & UNDERFLOW Badges with Machine Title Styling**:
  1. **Consistent Machine Title Styling**: Updated `StreamClassifierBadge` in [`Flowsheet.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/Flowsheet.jsx) to match `EquipmentTitle` machine name pills 1:1 (`fill="#0f172a"`, `stroke="#334155"`, `strokeWidth="1.5"`, text fill `#94a3b8` in default state; `fill="#1e293b"`, `stroke="#ffffff"`, text fill `#ffffff` when selected).
  2. **Clean Vector Symbology**: Removed legacy circle dots and drop-shadow glow filters around the stream badges for uniform SCADA design consistency.
  3. **Verification**: 13/13 backend unit tests passed and frontend compiled cleanly in 328ms (`npm --prefix frontend run build`).- **Flowsheet Selection Intercept & Display Fix**:
  1. **Removed Root Container Click Interceptor**: Removed `onClick={() => onSelect && onSelect(null)}` from the top root container `<div>` in [`Flowsheet.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/Flowsheet.jsx), which was previously intercepting all equipment, pipe, and control clicks and immediately canceling selections.
  2. **Scoped SVG Background Unselect**: Updated `<svg>` background click handler so unselection only fires when clicking directly on empty canvas space (`e.target.tagName === 'svg' || e.target.id === 'cadGrid'`).
  3. **Verification**: 13/13 backend unit tests passed and frontend compiled cleanly in 314ms (`npm --prefix frontend run build`).
- **Knowledge Graph Auto-Pan/Zoom on Flowsheet Selection & TelemetryPopoutDrawer Position Reset**:
  1. **KG Auto-Pan/Zoom**: Expanded the `externalSelectedId` `useEffect` in [`KnowledgeGraphPage.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/pages/KnowledgeGraphPage.jsx) to auto-center the KG viewport on the selected node whenever a machine is clicked in the Flowsheet. Uses `SCHEMATIC_POSITIONS` for stable position lookup (no `nodes` in dependency array to avoid infinite re-renders). Maps `CY_001` → `CY_001_B` for both `selectedNodeId` highlight/dim logic and viewport centering. Resets transform to `{ x: 40, y: 20, scale: 0.8 }` on deselect/null.
  2. **Smooth CSS Transition**: Added `transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)` to the SVG `<g>` element, suppressed during drag and pan for immediate response.
  3. **TelemetryPopoutDrawer Position Reset**: Added a second `useEffect` in [`TelemetryPopoutDrawer.jsx`](file:///home/zakaria/Documents/ProjetPFA/digital-twin-dashboard/frontend/src/components/TelemetryPopoutDrawer.jsx) that resets `position` to `{ x: null, y: null }` whenever `isOpen` becomes `false`, ensuring stale dragged positions never persist into the next drawer open.
  4. **Verification**: 13/13 backend unit tests passed and frontend compiled cleanly in 390ms.


































