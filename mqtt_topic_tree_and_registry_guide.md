# Grinding circuit data architecture — v2 (process/health domain split)

## 1. Why two domains, two clocks

| Domain | Driven by | Real-world cadence | Why |
|---|---|---|---|
| **Process / quality** | Assay & particle-size analyzer cycle | ~15 min | Physical measurement cycle time of the analyzer — can't go faster even with better instrumentation |
| **Machine health** | Electrical + mechanical condition monitoring | seconds–1 min (this dataset: 1 min) | Motor current/power and vibration change on the timescale of the fault they're meant to catch; temperature is slower but still much faster than an assay cycle |

Collapsing both into one 15-min row (what we had before) either wastes resolution
on health tags or forces process tags to look falsely fast. Keeping them separate
also matches how real plants actually architect this: process data usually lives
in a process historian (PI, Wonderware) fed by the DCS at analyzer rate, while
machine health lives in a condition-monitoring system (Bently Nevada, AMS,
Aveva PI Vibration) fed by dedicated sensors at a much faster rate. Two domains,
two systems, two clocks — the MQTT layer should mirror that reality, not hide it.

**One more layer worth knowing about, not built here**: true vibration fault
diagnosis (bearing defect frequencies, gear mesh, etc.) needs kHz-rate raw
waveform capture and FFT analysis — that lives in a dedicated condition-monitoring
system, not in a tag historian. What we publish over MQTT here is the **trended
overall RMS value** (the number condition-monitoring systems report every few
seconds to a minute) — good enough for "vibration is climbing, go investigate,"
not a replacement for the specialist system.

## 2. Topic namespace

```
plant/grinding/<equipment>/process/<context>/<parameter>   <- 15-min cadence
plant/grinding/<equipment>/health/<context>/<parameter>    <- 1-min cadence
plant/grinding/circuit/process/kpi/<parameter>             <- circuit-wide KPIs, 15-min
plant/grinding/circuit/health/env/<parameter>              <- ambient/environmental, 1-min
```

Examples:
```
plant/grinding/CY001/process/underflow/p80        <- P_004, assay-derived, 15 min
plant/grinding/BM001/health/bearing_de_temp        <- machine health, 1 min
plant/grinding/BM001/health/vibration              <- trended RMS, 1 min
plant/grinding/circuit/process/kpi/circulating_load <- 15 min
```

A subscriber that only cares about condition monitoring subscribes to
`plant/grinding/+/health/#` and never touches the slower process stream.
A subscriber building process control dashboards subscribes to
`plant/grinding/+/process/#` and never gets flooded by 1-minute health ticks.

## 3. MQTT QoS / retain recommendations (worth deciding now, before you wire the broker)

| Domain | Suggested QoS | Retain flag | Reasoning |
|---|---|---|---|
| Process/quality | QoS 0 or 1 | Yes | Low volume, historian just needs eventual consistency; retain so a new subscriber immediately sees the last known P80/BPL |
| Machine health | QoS 1 | Yes for trend tags, No for event/alarm-style tags (e.g. cyclones_online drop) | Higher volume, but you don't want to miss a real bearing temp trend point; alarm-style tags should NOT retain so a reconnecting client doesn't replay a stale alarm as current |

## 4. Files in this delivery

| File | Rows | Cadence | Content |
|---|---|---|---|
| `process_flow_timeseries.csv` | 2,880 | 15 min, 30 days | All quality/assay tags + circuit KPIs (circulating load, reduction ratio) |
| `machine_health_timeseries.csv` | 43,200 | 1 min, 30 days | All machine sensor tags (current, power, pressure, temperature, vibration, wear) — independently generated at its own cadence, not resampled from the process file |
| `equipment_master.csv` | 7 (unchanged) | static | Asset/maintenance data — install dates, MTBF/MTTR, last maintenance, condition |
| `tag_mapping_registry.csv` | 51 | static | Now includes a `domain` column (process/health) and a `sample_rate` column per tag |

Note the two time-series files are **on independent time grids** (15 min vs 1 min)
by design — that mirrors reality (a process historian and a condition-monitoring
system are not synchronized to the same clock), and it's also exactly the kind of
alignment problem a real digital twin ingestion layer has to solve (usually via
"as-of" joins on ingestion, not by forcing both onto one grid upfront).

## 5. What changed from v1

- Split one combined file into `process_flow_timeseries.csv` (15 min) and
  `machine_health_timeseries.csv` (1 min).
- Machine health tags regenerated on their own 1-minute grid instead of being
  resampled/repeated from the 15-min process rows.
- Registry gained `domain` and `sample_rate` columns; topics gained a
  `/process/` or `/health/` segment so subscribers can filter by domain with
  a single wildcard.
- No Python deliverables this round — see `antigravity_prompts.md` for
  ready-to-paste prompts to have your local agent build the ingestion/loader
  code itself, with full context on the files and schema above.
