# Agent Reference

All agents share the same input/output interface and use the generic loop in `agentRunner.ts`. The scenario state (`ScenarioState`) is passed by reference — tools mutate it directly.

All agents output in **European Portuguese**. The language instruction is injected at the start and end of every system prompt, and as a prefix to every user message.

Each agent emits `action` events tied to its SAP integration system, feeding the **Ações SAP** panel in real time. Only the **Communications Insight Agent** emits `comms` events (SMS, press release, regulatory).

| Agent | Internal ID | SAP System |
|-------|------------|------------|
| Asset and Services Assistant | `orchestrator` | SAP AI Core Orchestration |
| Technician Briefing Agent | `triage-priority` | SAP S/4HANA Asset Management + Event Mesh |
| Remote Restoration SCADA Agent | `rerouting` | SAP Asset Intelligence Network |
| Service Dispatcher Agent | `crew-dispatch` | SAP Field Service Management · Drolius · ANYbotics |
| Resource Capacity Shortage Agent | `resource` | SAP Integrated Business Planning |
| Communications Insight Agent | `comms` | SAP Customer Experience |

---

## Orchestrator

**File**: `src/server/engine/orchestrator.ts`

The orchestrator is a Claude agent with tools that invoke the other agents. It has its own loop (not `runAgent`) to detect and run Phase 1 in parallel.

**Protocol**:
```
Phase 1 (parallel)  : invoke_triage_priority + invoke_rerouting
Phase 2 (sequential): invoke_crew_dispatch → invoke_resource → invoke_comms
Close               : finalize
```

**Parallelism detection**: if all `tool_use` blocks in a turn belong to `phase1Tools = {'invoke_triage_priority', 'invoke_rerouting'}`, they are executed with `Promise.all`.

**Tools**:

| Tool | Description |
|------|-------------|
| `invoke_triage_priority` | Runs the Technician Briefing Agent |
| `invoke_rerouting` | Runs the Remote Restoration SCADA Agent |
| `invoke_crew_dispatch` | Runs the Service Dispatcher Agent |
| `invoke_resource` | Runs the Resource Capacity Shortage Agent |
| `invoke_comms` | Runs the Communications Insight Agent |
| `finalize` | Calculates KPIs (SLA, Safety, Efficiency, TIEPI, MTTR) and emits `kpi` + `done` |

**`action` events emitted** (`SAP AI Core Orchestration`):
- On start: incident registered — fault count and affected customers
- On close: cycle closed with final KPIs

---

## Technician Briefing Agent

**File**: `src/server/engine/agents/triage-priority.ts`  
**Input**: all 47 faults (ID, type, zone, customers, critical site, battery) + physical fault list  
**Purpose**: classify all faults by severity and rank physical ones by urgency for the Service Dispatcher Agent

**Internal stages**:
1. **Triage** — `classify_fault` for each of the 47 faults
2. **Priority** — `set_priority` for each physical fault (transformers and cables)
3. `complete_assessment` — executive summary

**Tools**:

| Tool | Parameters | Effect |
|------|-----------|--------|
| `classify_fault` | `faultId, severity, criticalSite, batteryRisk` | Records classification (read-only) |
| `set_priority` | `faultId, rank, reason, slaRisk` | Records dispatch order (read-only) |
| `complete_assessment` | `summary` | Closes agent |

**`action` events emitted** (`SAP S/4HANA Asset Management + Event Mesh`):
- Assets analysed, critical sites identified, physical faults ranked

**Classification criteria**:
- `critical` — critical site with battery < SLA or < 30 min
- `high` — critical site with sufficient battery, or residential > 3,000 customers
- `medium` — residential 500–3,000 customers
- `low` — residential < 500 customers

**Prioritisation rule**:
1. Critical sites ordered by remaining battery ASC. EPAL Loures (water supply 800K people) is absolute rank 1 if battery < 60 min.
2. Residential faults ordered by affected customers DESC

---

## Remote Restoration SCADA Agent

**File**: `src/server/engine/agents/rerouting.ts`  
**Input**: pending switchable faults + authorised SCADA limit  
**Purpose**: restore supply on the Lisboa underground grid via remote SCADA without sending crews

**Tools**:

| Tool | Parameters | State effect |
|------|-----------|--------------|
| `attempt_remote_switch` | `faultId` | `fault.status: fault → switching → restored`, emits `asset_update` ×2 |
| `complete_rerouting` | `summary` | Closes agent |

**`action` events emitted** (`SAP Asset Intelligence Network`):
- Per successful switch: fault ID, zone, customers reconnected

**Constraints**:
- Maximum `params.switchableFaults` operations (authorised ERSE daily limit)
- Handler validates the limit and returns an error if exceeded

**Observable effect**: map nodes change red → yellow (switching, 600 ms delay) → green (restored).

---

## Service Dispatcher Agent

**File**: `src/server/engine/agents/crew-dispatch.ts`  
**Input**: available crews + pending physical faults + second storm window + Drolius status  
**Purpose**: assign crews to faults respecting skills and safety window; optionally deploy Drolius

**Tools**:

| Tool | Parameters | State effect |
|------|-----------|--------------|
| `dispatch_crew` | `crewId, faultId, eta, reason` | `crew.status = 'busy'`, `fault.status = 'crew-en-route'`, emits `asset_update` |
| `dispatch_drolius` | `faultId, mission` | Emits `drolius_update` (deployed), returns inspection report |
| `skip_fault` | `faultId, reason` | Records fault as unassignable (no state effect) |
| `complete_dispatch` | `summary` | Closes agent |

**`action` events emitted** (`SAP Field Service Management`):
- Per `dispatch_crew`: work order created — crew, fault, zone, ETA

**`action` events emitted** (`Drolius · ANYbotics`):
- Deployment + report transmission

**Drolius missions**:

| Mission | Information returned |
|---------|---------------------|
| `battery_check` | UPS battery level (BMS), transformer temperature, urgency recommendation |
| `zone_access` | Zone conditions, obstacles (eucalyptus on EN9/EN247), ETA adjustment |
| `damage_assessment` | Damage type, materials needed, zone safety level |

**Drolius behaviour**: one mission per simulation, stays `deployed` for the rest of the run. Reports are deterministic (based on fault data, not random).

**Skills**: A → transformer repair · B → cable repair · C → auxiliary

**South bank ETA penalty**: Almada and Setúbal crews have base +20 min ETA due to Ponte 25 de Abril congestion — explicitly stated in the system prompt.

**Storm window**: if `storm2Window = T+4h`, no transformer dispatch with ETA > 210 min.

---

## Resource Capacity Shortage Agent

**File**: `src/server/engine/agents/resource.ts`  
**Input**: faults with `status: 'crew-en-route'` + current inventory  
**Purpose**: verify sufficient materials for all dispatched crews and record conflicts

**Tools**:

| Tool | Parameters | State effect |
|------|-----------|--------------|
| `allocate_resource` | `faultId, resourceType` | Decrements `inventory[resourceType]` |
| `flag_conflict` | `faultId, reason` | Emits `conflict`, sets `hadConflict = true` |
| `complete_resources` | `summary` | Closes agent |

**`action` events emitted** (`SAP Integrated Business Planning`):
- Per allocation: material reserved in IBP
- Per conflict: replenishment request registered in IBP

**`resourceType`**: `transformer` \| `cable` \| `mobile_generator`

**Conflict scenario** (`limitedParts = 1`): 1 transformer for 7 transformer faults. Claude allocates to the critical site with least battery and flags conflict for the rest. `hadConflict` propagates to Communications Insight Agent.

---

## Communications Insight Agent

**File**: `src/server/engine/agents/comms.ts`  
**Input**: incident summary (restored faults, crews, customers, critical sites, `hadConflict`, sites with battery below SLA)  
**Purpose**: draft and emit 3 mandatory communications in Portuguese. Only agent authorised to emit `comms` events.

**Tools**:

| Tool | Channel | Constraints |
|------|---------|-------------|
| `send_sms` | Mass SMS to customers | ≤ 160 chars, must mention Distribuição Eléctrica |
| `send_press_release` | Lisboa media (Público, Expresso, RTP, TSF, Rádio Renascença) | In Portuguese |
| `send_regulatory` | ERSE + ANPC (Proteção Civil) | Formal; must mention conflict or critical battery if applicable |
| `complete_comms` | — | Closes agent |

**Mandatory order**: SMS → Press release → Regulatory → `complete_comms`

**`action` events emitted** (`SAP Customer Experience`):
- SMS sent, press release published, regulatory notification sent to ERSE/ANPC

---

## Simulation parameters (`SimParams`)

| Parameter | Range | Description |
|-----------|-------|-------------|
| `minuteSLA` | 30–120 | Maximum committed restoration time (min) |
| `switchableFaults` | 5–22 | Authorised SCADA operations for the day (ERSE limit) |
| `limitedParts` | 0 \| 1 | 0 = full inventory (2 transformers); 1 = only 1 available |
| `storm2Window` | T+4h \| T+6h \| T+8h \| none | Window before the second storm |
| `availableCrews` | 8–22 | Active crews (subset of the 22 in the base scenario) |
| `language` | `'pt'` | Fixed — always Portuguese |

---

## KPIs calculated by `finalize`

| KPI | Formula | Scale |
|-----|---------|-------|
| SLA | % customers with resolution in progress | % (higher is better) |
| Safety | % critical sites covered | % (higher is better) |
| Efficiency | % physical faults attended | % (higher is better) |
| TIEPI | Σ(customers_i × estimated_time_i) / 143,000 | minutes (lower is better) |
| MTTR | Σ(estimated time of attended faults) / attended_faults | minutes (lower is better) |

Estimated times: restored (SCADA) = 10 min · crew-en-route transformer = 135 min · crew-en-route cable = 90 min · unattended = 240 min.

---

## Fault states

```
fault → crew-en-route             (Service Dispatcher Agent)
fault → switching → restored      (Remote Restoration SCADA Agent)
```

| State | Map colour |
|-------|-----------|
| `fault` | Red |
| `switching` | Blinking yellow |
| `restored` | Green |
| `crew-en-route` | Orange |

> States `repairing` and `repaired` are defined in `types.ts` for future use but not currently assigned — dispatched crews remain `crew-en-route` until cycle close.
