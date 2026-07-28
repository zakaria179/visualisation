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
