# Prompts for Antigravity (local CLI agent)

Paste these one at a time (or adapt) once the data files are in your project
folder: `process_flow_timeseries.csv`, `machine_health_timeseries.csv`,
`equipment_master.csv`, `tag_mapping_registry.csv`.

---

## Prompt 1 — MQTT publisher (replay both domains at their real cadence)

```
I have four CSV files in this folder: process_flow_timeseries.csv (2,880 rows,
15-minute cadence), machine_health_timeseries.csv (43,200 rows, 1-minute
cadence), equipment_master.csv (static asset data), and
tag_mapping_registry.csv (columns: domain, source_column, tag_id, mqtt_topic,
equipment, stream, parameter, unit, data_type, sample_rate, description).

Write an MQTT publisher that:
1. Connects to a local Mosquitto broker on localhost:1883.
2. Uses tag_mapping_registry.csv to look up the mqtt_topic for each
   source_column in the two time-series CSVs.
3. Replays process_flow_timeseries.csv and machine_health_timeseries.csv
   concurrently, each on its own thread/task, compressing simulated time into
   real time at a configurable speed-up factor (e.g. 1 simulated minute = 1
   real second, so the 15-min file publishes one row every 15 real seconds
   and the 1-min file publishes one row every 1 real second).
4. Publishes each tag as its own message: JSON payload with tag_id, value,
   unit, timestamp, quality ("SIM"). QoS 1, retain=true for trend tags.
5. Logs a summary line per publish batch (topic count, timestamp) so I can
   see it running.
Use whichever language/library you default to (Python+paho-mqtt or
Node+mqtt.js are both fine) - your choice.
```

## Prompt 2 — Knowledge graph loader (Neo4j)

```
Using equipment_master.csv and tag_mapping_registry.csv in this folder, build
a Neo4j graph loader script that:
1. Creates one (:Equipment) node per row in equipment_master.csv, with all
   its columns (install_date, criticality, last_maintenance_date, MTBF_hours,
   etc.) as node properties.
2. Creates the following structural relationships between equipment, matching
   this confirmed process flow:
   (PB_001)-[:DISCHARGES_VIA {stream:"P_002"}]->(SP_001)
   (SP_001)-[:DISCHARGES_VIA {stream:"P_003"}]->(CY_001)
   (CY_001)-[:OVERFLOW_VIA {stream:"P_006"}]->(SlurryOut:Terminal)
   (CY_001)-[:UNDERFLOW_VIA {stream:"P_004"}]->(BM_001)
   (BM_001)-[:DISCHARGES_VIA {stream:"P_005"}]->(PB_001)
   Also create (SlurryIn:Terminal)-[:FEEDS]->(PB_001) and
   (ProcessWater:Terminal)-[:FEEDS]->(PB_001).
3. Creates one (:Tag) node per row in tag_mapping_registry.csv, with tag_id,
   mqtt_topic, domain, unit, sample_rate as properties, and a
   (:Tag)-[:MEASURES]->(:Equipment) relationship using the equipment column.
4. Then writes a small MQTT subscriber that listens on plant/grinding/# and,
   on each message, updates the matching (:Tag) node's current_value and
   last_updated properties in Neo4j (match by tag_id from the payload).
Ask me for Neo4j connection details if you need them; otherwise assume
bolt://localhost:7687 with default credentials.
```

## Prompt 3 — Historian ingestion (time-series DB)

```
Using tag_mapping_registry.csv, write an MQTT subscriber that listens to
plant/grinding/# and writes every incoming tag value into a time-series table
(propose whether TimescaleDB, InfluxDB, or SQLite is simplest for a local
proof-of-concept - your call) with columns: tag_id, mqtt_topic, domain,
equipment, value, unit, quality, timestamp. Partition or index by tag_id and
timestamp so a query like "give me the last 24 hours of
BM001.HEALTH.BearingDETemp" is fast. Include one example query script that
plots that bearing temp trend against the maintenance dates in
equipment_master.csv, to sanity check the maintenance-linked reset pattern.
```

## Prompt 4 — Root-cause query example (once the graph is loaded)

```
Using the Neo4j graph built in Prompt 2, write three example Cypher queries
and a short script to run them:
1. Given an equipment_id, return its most recent maintenance event and how
   many days ago it occurred.
2. Trace the full recycle loop starting from CY_001's underflow relationship
   through BM_001 back to PB_001, returning the chain of equipment and
   stream labels.
3. Given a tag_id whose value is currently outside a normal range, return
   all other tags that MEASURE the same equipment, so I can see related
   signals (e.g. if BM001 bearing temp is high, also show BM001 vibration
   and power draw at the same time).
```

---

**Why these are structured this way**: each prompt is scoped to one
deliverable (publisher, graph loader, historian, query examples) so your
agent can build and test them independently rather than one giant script.
Feel free to run them in order — Prompt 1 needs nothing else running,
Prompt 2 needs a Neo4j instance up, Prompt 3 needs your DB of choice up,
Prompt 4 needs Prompt 2 done first.
