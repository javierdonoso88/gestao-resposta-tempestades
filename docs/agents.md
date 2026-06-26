# Agent Reference

All agents share the same input/output interface and use the generic loop in `agentRunner.ts`. The scenario state (`ScenarioState`) is passed by reference — tools mutate it directly.

Each agent emits `action` events tied to its SAP integration system. These events feed the **SAP Actions** panel in the frontend in real time. Only the **Communications Insight Agent** can emit `comms` events (SMS, press release, regulatory).

| Agent | Internal ID | SAP System |
|-------|------------|------------|
| Asset and Services Assistant | `orchestrator` | SAP AI Core Orchestration |
| Technician Briefing Agent | `triage-priority` | SAP S/4HANA Asset Management + Event Mesh |
| Remote Restoration Scada Agent | `rerouting` | SAP Asset Intelligence Network |
| Service Dispatcher Agent | `crew-dispatch` | SAP Field Service Management · Drolius · ANYbotics |
| Resource Capacity Shortage Agent | `resource` | SAP Integrated Business Planning |
| Communications Insight Agent | `comms` | SAP Customer Experience |

---

## Orchestrator

**File**: `src/server/engine/orchestrator.ts`

The orchestrator is a Claude agent with tools that invoke the other agents. It does not use `runAgent` — it has its own loop to detect and run Phase 1 in parallel.

**Protocol**:
```
Phase 1 (parallel)  : invoke_triage_priority + invoke_rerouting
Phase 2 (sequential): invoke_crew_dispatch → invoke_resource → invoke_comms
Close               : finalize
```

**Parallelism detection**: if all `tool_use` blocks in a turn belong to `phase1Tools = {'invoke_triage_priority', 'invoke_rerouting'}`, they are executed with `Promise.all`. Otherwise, sequential loop.

**Model configuration**: `max_tokens: 8192` (increased from 4096 to prevent Phase 2 being skipped when Claude generates long reasoning after Phase 1 results). The system prompt explicitly prohibits extended analysis between phases.

**Tools**:

| Tool | Description |
|------|-------------|
| `invoke_triage_priority` | Runs the Technician Briefing Agent |
| `invoke_rerouting` | Runs the Remote Restoration SCADA Agent |
| `invoke_crew_dispatch` | Runs the Service Dispatcher Agent |
| `invoke_resource` | Runs the Resource Capacity Shortage Agent |
| `invoke_comms` | Runs the Communications Insight Agent |
| `finalize` | Calculates KPIs (SLA, Safety, Efficiency, TIEPI, MTTR) and emits `kpi` + `done` |

**`action` events emitted**:
- On start: `SAP AI Core Orchestration` — incident registered with fault count and affected customers
- On close (`finalize`): `SAP AI Core Orchestration` — cycle closed with calculated KPIs

---

## Technician Briefing Agent

**File**: `src/server/engine/agents/triage-priority.ts`  
**Input**: full list of 47 faults (ID, type, zone, customers, critical site, battery) + list of physical faults  
**Purpose**: classify all faults by severity and rank physical ones by urgency for the Service Dispatcher Agent

**Internal stages**:
1. **Triage** — `classify_fault` for each of the 47 faults
2. **Priority** — `set_priority` for each physical fault (transformers and cables)
3. `complete_assessment` — joint executive summary

**Tools**:

| Tool | Parameters | Effect |
|------|-----------|--------|
| `classify_fault` | `faultId, severity, criticalSite, batteryRisk` | Records classification (read-only) |
| `set_priority` | `faultId, rank, reason, slaRisk` | Records dispatch order (read-only) |
| `complete_assessment` | `summary` | Closes agent with executive summary |

**`action` events emitted** (`SAP S/4HANA Asset Management + Event Mesh`):
- On `complete_assessment`: assets analysed, critical sites identified, physical faults ranked

**Classification criteria**:
- `critical` — critical site with battery < SLA or < 30 min
- `high` — critical site with sufficient battery, or residential with > 3,000 customers
- `medium` — residential 500–3,000 customers
- `low` — residential < 500 customers

**Prioritisation rule**:
1. Critical sites ordered by remaining battery ASC (less battery = more urgent). EPAL Loures is absolute rank 1 if battery < 60 min.
2. Residential faults ordered by affected customers DESC

---

## Remote Restoration SCADA Agent

**File**: `src/server/engine/agents/rerouting.ts`  
**Input**: pending switchable faults + authorised SCADA operation limit  
**Purpose**: restore as much supply as possible without sending crews, using remote SCADA switching on the Lisboa underground grid

**Tools**:

| Tool | Parameters | State effect |
|------|-----------|--------------|
| `attempt_remote_switch` | `faultId` | `fault.status: fault → switching → restored`, emits `asset_update` ×2 |
| `complete_rerouting` | `summary` | Closes agent with operation summary |

**`action` events emitted** (`SAP Asset Intelligence Network`):
- Per successful `attempt_remote_switch`: switch executed with fault ID, zone, and customers reconnected

**Constraints**:
- Can only perform `params.switchableFaults` switches (daily authorised ERSE limit)
- Handler validates the limit and returns an error if exceeded, forcing Claude to stop

**Observable effect**: map nodes change from red → yellow (switching) → green (restored) with a 600 ms delay simulating SCADA switching latency.

---

## Service Dispatcher Agent

**File**: `src/server/engine/agents/crew-dispatch.ts`  
**Input**: available crews + pending physical faults + second storm window + Drolius status  
**Purpose**: assign crews to faults respecting skills and the safety window; optionally deploy Drolius for pre-visit reconnaissance

**Tools**:

| Tool | Parameters | State effect |
|------|-----------|--------------|
| `dispatch_crew` | `crewId, faultId, eta, reason` | `crew.status = 'busy'`, `fault.status = 'crew-en-route'`, emits `asset_update` |
| `dispatch_drolius` | `faultId, mission` | Emits `drolius_update` × 1 (deployed), returns inspection report; Drolius stays deployed |
| `skip_fault` | `faultId, reason` | Records fault as unassignable (no state effect) |
| `complete_dispatch` | `summary` | Closes agent |

**`action` events emitted** (`SAP Field Service Management`):
- Per successful `dispatch_crew`: work order created with crew, fault, zone, and ETA

**`action` events emitted** (`Drolius · ANYbotics`):
- Deployment: `Drolius deployed → <zone> (<faultId>) — mission: <type>`
- Report: `Drolius transmits report: <first 100 chars>…`

**Drolius missions** (`mission`):

| Mission | Information returned |
|---------|---------------------|
| `battery_check` | UPS battery level (direct BMS read), transformer temperature, current load, urgency recommendation |
| `zone_access` | Zone conditions, obstacles detected, ETA adjustment for crew (eucalyptus on EN9/EN247 in Sintra) |
| `damage_assessment` | Damage type, materials needed, zone safety level |

**Drolius behaviour**: one mission per simulation. The robot moves from `available` to `deployed` permanently: emits a single `drolius_update` (deployed) and returns the report instantly with no delays. Stays `deployed` at the fault location for the rest of the simulation. Reports are deterministic based on fault data (not random) for consistency between simulations. Claude receives the report as a tool result and can adjust its dispatch decisions accordingly.

**Skills**:
- Skill **A** → transformer repair
- Skill **B** → cable repair
- Skill **C** → auxiliary operations

**South bank ETA penalty**: Almada and Setúbal crews (margem sul) have a base +20 min ETA due to Ponte 25 de Abril congestion. The system prompt specifies this explicitly.

**Storm window**: if `storm2Window = T+4h`, Claude must avoid dispatching transformer crews with ETA > 210 min. Explicitly stated in the system prompt.

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
- Per `allocate_resource`: material reserved in IBP (type and target fault)
- Per `flag_conflict`: material replenishment request registered in IBP

**`resourceType`**: `transformer` \| `cable` \| `mobile_generator`

**Conflict scenario** (`limitedParts = 1`): only 1 transformer in inventory for 7 transformer faults. Claude must allocate the transformer to the critical site with least battery and flag a conflict for the rest. The `hadConflict` flag propagates to the Communications Insight Agent so it mentions it in the regulatory notification.

---

## Communications Insight Agent

**File**: `src/server/engine/agents/comms.ts`  
**Input**: incident summary (restored faults, crews, customers, critical sites, `hadConflict`, sites with battery below SLA)  
**Purpose**: draft and emit 3 mandatory communications. The **only agent** authorised to emit `comms` events.

**Tools**:

| Tool | Channel | Constraints |
|------|---------|-------------|
| `send_sms` | Mass SMS to customers | ≤ 160 chars, must mention EDP Distribuição |
| `send_press_release` | Lisboa media (Público, Expresso, RTP, TSF, Rádio Renascença) | In Portuguese |
| `send_regulatory` | ERSE / ANPC | Formal, includes technical data; must mention conflict or critical battery if applicable |
| `complete_comms` | — | Closes agent |

**Mandatory order**: SMS → Press release → Regulatory → `complete_comms`.

**Enriched context**: the user message includes the list of critical sites with remaining battery and an explicit flag if any is below the SLA target, so Claude can include accurate information in the regulatory notification.

**`action` events emitted** (`SAP Customer Experience`):
- On `send_sms`: mass SMS sent via SAP CX with text preview
- On `send_press_release`: press release published to Lisboa media
- On `send_regulatory`: regulatory notification sent to ERSE/ANPC

---

## Simulation parameters (`SimParams`)

| Parameter | Range | Description |
|-----------|-------|-------------|
| `minuteSLA` | 30–120 | Maximum committed restoration time (min) |
| `switchableFaults` | 5–22 | Authorised SCADA operations for the day (ERSE limit) |
| `limitedParts` | 0 \| 1 | 0 = full inventory (2 transformers); 1 = only 1 available |
| `storm2Window` | T+4h \| T+6h \| T+8h \| none | Window before the second storm; conditions Service Dispatcher Agent decisions |
| `availableCrews` | 8–22 | Active crews (subset of the 22 in the base scenario) |

Parameter order in the sidebar: SLA → Switchable → Limited parts → Crews → Storm 2 window.

All controls include an informative tooltip. KPIs show `—` until the simulation completes.

**KPIs calculated by `finalize`**:

| KPI | Formula | Scale |
|-----|---------|-------|
| SLA | % customers with resolution in progress (SCADA or crew) | % (higher is better) |
| Safety | % critical sites covered | % (higher is better) |
| Efficiency | % physical faults attended | % (higher is better) |
| TIEPI | Σ(customers_i × estimated_time_i) / total_customers | minutes (lower is better) |
| MTTR | Σ(estimated time of attended faults) / total_attended_faults | minutes (lower is better) |

Estimated times per status: restored (SCADA) = 10 min · crew-en-route transformer = 135 min · crew-en-route cable = 90 min · unattended fault = 240 min.

---

## Fault states

```
fault → crew-en-route             (crew assigned, Service Dispatcher Agent)
fault → switching → restored      (SCADA, Remote Restoration SCADA Agent)
```

The frontend maps each state to a colour on the map:

| State | Colour |
|-------|--------|
| `fault` | Red |
| `switching` | Blinking yellow |
| `restored` | Green |
| `crew-en-route` | Orange |

> States `repairing` and `repaired` are defined in `types.ts` for future use but are not assigned during simulation — dispatched crews remain in `crew-en-route` until the cycle closes.
