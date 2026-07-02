# Technical Architecture

## Simulation flow

```
User configures parameters → POST /api/simulate
    └─► runOrchestrator(params, emit)
            │
            ├── buildScenario()          # Builds initial state: 47 faults + 22 crews (AML Lisboa)
            ├── setInterval safety_tick  # Safety ticker every 2s
            │
            ├── [Turn 1] Orchestrator Claude
            │   └── tool_use: invoke_triage_priority + invoke_rerouting
            │       └── Promise.all → 2 agents in parallel
            │           ├── runTriagePriority()  → classify_fault × 47, set_priority × N, complete_assessment
            │           └── runRerouting()       → attempt_remote_switch × M, complete_rerouting
            │
            ├── [Turn 2] Orchestrator Claude
            │   └── tool_use: invoke_crew_dispatch
            │       └── runCrewDispatch() → dispatch_crew × K, skip_fault × J, complete_dispatch
            │
            ├── [Turn 3] Orchestrator Claude
            │   └── tool_use: invoke_resource
            │       └── runResource() → allocate_resource × L, flag_conflict?, complete_resources
            │
            ├── [Turn 4] Orchestrator Claude
            │   └── tool_use: invoke_comms
            │       └── runComms() → send_sms, send_press_release, send_regulatory, complete_comms
            │
            └── [Turn 5] Orchestrator Claude
                └── tool_use: finalize → emit kpi + done
```

Each `emit()` is serialised as an SSE event and sent to the client immediately.

---

## SSE event types

| Type | Payload | Client action |
|------|---------|---------------|
| `cot_chunk` | `{ text, agent }` | Appends text to the agent's log |
| `agent_start` | `{ agent, t }` | Updates Gantt, marks agent as active |
| `agent_done` | `{ agent, summary }` | Closes block in Gantt |
| `asset_update` | `{ id, status }` | Changes node colour on the map |
| `comms` | `{ channel, msg }` | Adds message to communications feed |
| `action` | `{ agent, system, msg }` | Adds entry to SAP Actions feed |
| `conflict` | `{ winner, loser, reason }` | Shows conflict alert |
| `drolius_update` | `{ status, task?, report? }` | Updates Drolius status chip in sidebar |
| `safety_tick` | `{ elapsed, limit }` | Updates safety progress bar |
| `kpi` | `{ sla, safety, efficiency, tiepi, mttr }` | Updates final metrics |
| `done` | `{ elapsed }` | Closes the simulation |

---

## Models

| Component | Model | Reason |
|-----------|-------|--------|
| Orchestrator | `claude-sonnet-4-6` | Narrative reasoning visible in the executive summary |
| Sub-agents (all 5) | `claude-haiku-4-5` | Structured tool-use decisions; lower latency |

The Haiku deployment is configured via `AICORE_HAIKU_DEPLOYMENT_ID`. If not set, both roles fall back to the Sonnet deployment.

---

## SAP AI Core adapter (`anthropicClient.ts`)

The Anthropic SDK calls `/v1/messages`. SAP AI Core exposes a Bedrock-compatible API with different routes and body format. The adapter acts as transparent middleware:

### Non-streaming request

```
SDK → POST /v1/messages { model, stream: false, ... }
          │
          ▼ customFetch
- Removes `model` from body (fixed in the deployment)
- Adds `anthropic_version: "bedrock-2023-05-31"` to body
- Rewrites URL → /invoke
- Replaces `x-api-key` with `Authorization: Bearer <token>`
- Adds `AI-Resource-Group: default`
          │
          ▼
AI Core → POST /invoke { anthropic_version, messages, max_tokens, ... }
```

### Streaming request

```
SDK → POST /v1/messages { stream: true, ... }
          │
          ▼ customFetch
- Detects `stream: true`, removes from body
- Rewrites URL → /invoke-with-response-stream
          │
          ▼
AI Core → POST /invoke-with-response-stream
       ← SSE: data: {"type":"message_start",...}
               data: {"type":"content_block_delta",...}
          │
          ▼ injectEventLines()
       ← SSE: event: message_start
               data: {"type":"message_start",...}

               event: content_block_delta
               data: {"type":"content_block_delta",...}
          │
          ▼
SDK receives SSE with event: lines → processes normally
```

**Why `injectEventLines` is needed**: AI Core (Bedrock format) sends SSE with only `data:` lines, without a preceding `event:` line. The Anthropic SDK checks `sse.event` to determine the event type; without it, `sse.event === null` and the stream emits no chunks → "request ended without sending any chunks" error. The transformer reads the `type` field from each `data:` JSON and prepends the corresponding `event: <type>` line.

### OAuth2 token

```typescript
// Cache with 60s margin before expiry
if (tokenCache && tokenCache.expiresAt - now > 60_000) {
  return tokenCache.token;
}
POST TOKEN_URL
  Authorization: Basic base64(clientId:clientSecret)
  body: grant_type=client_credentials
```

---

## Generic agent loop (`agentRunner.ts`)

```typescript
messages = [{ role: 'user', content: userMessage }]

for turn in 0..maxTurns:
  stream = anthropic.messages.stream({ system, messages, tools, max_tokens })

  for event in stream:
    if content_block_delta.text_delta:
      emit({ type: 'cot_chunk', text, agent: agentId })  // real-time streaming

  finalMsg = await stream.finalMessage()
  messages.push({ role: 'assistant', content: finalMsg.content })

  if stop_reason == 'end_turn': break

  toolResults = []
  for block in finalMsg.content where block.type == 'tool_use':
    result = await handlers[block.name](block.input)
    toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })

  if toolResults.empty: break
  messages.push({ role: 'user', content: toolResults })
```

Every agent call includes a Portuguese language instruction at the start and end of the system prompt, and as a prefix to the user message:

```
// system prompt (start and end):
REGRA DE IDIOMA CRÍTICA: DEVES escrever TODA a saída em Português Europeu —
raciocínio, chamadas de ferramentas, resumos e qualquer narrativa.

// user message (prefix):
[RESPONDE APENAS EM PORTUGUÊS EUROPEU]
```

---

## Shared state via closure

The `ScenarioState` (faults, crews, inventory, drolius) is created in `runOrchestrator` and passed by reference to each agent. Tools mutate the state in-place:

```typescript
// rerouting.ts — attempt_remote_switch
fault.status = 'switching';
emit({ type: 'asset_update', id: fault.id, status: 'switching' });
await sleep(600);
fault.status = 'restored';
emit({ type: 'asset_update', id: fault.id, status: 'restored' });

// crew-dispatch.ts — dispatch_crew
crew.status = 'busy';
fault.status = 'crew-en-route';
emit({ type: 'asset_update', id: fault.id, status: 'crew-en-route' });

// crew-dispatch.ts — dispatch_drolius
state.drolius.status = 'deployed';
emit({ type: 'drolius_update', status: 'deployed', task: faultId });
const report = generateReport(fault, mission);  // deterministic, no delays
return report;
```

This guarantees that when `resource.ts` receives the state, faults already have `status: 'crew-en-route'` set by crew-dispatch.

---

## KPIs (calculated in `finalize`)

```
SLA        = attended_clients / total_clients × 100
             total_clients = 143,000 (from BASE_SCENARIO, includes critical-site clients)
             attended = sum of affectedClients for faults with status restored or crew-en-route

Safety     = critical_sites_covered / total_critical_sites × 100
             (covered = status crew-en-route or restored)

Efficiency = faults_attended / total_faults × 100
             (attended = status restored or crew-en-route)
```

Estimated interruption times per status: restored (SCADA) = 10 min · crew-en-route transformer = 135 min · crew-en-route cable = 90 min · unattended fault = 240 min.

`totalClients` (143,000) is fetched from `/api/scenario` on load and passed to `ResultsOverlay` as a prop, so transformer faults with `affectedClients: 0` (critical sites) do not distort the denominator.

---

## Theme system (Dark / Joule / EDP)

| Theme | Background | Border | Accent |
|-------|-----------|--------|--------|
| Dark (default) | `#0d1520` navy | `#1e2d45` | `#22d3ee` cyan |
| SAP Joule | `#f3f5f8` light grey | `#dde3ec` | `#6d28d9` SAP purple |
| EDP | `#f2f7f4` light green | `#c8ddd0` | `#00a651` EDP green |

- `ThemeContext.tsx` persists choice in `localStorage('src-theme')` and writes `data-theme` on `document.documentElement`.
- `globals.css` defines CSS variable overrides for each theme.
- Components use `var(--token)` in inline styles. `MapPanel` reads `useTheme()` for JS logic that cannot be resolved with CSS vars (CartoDB tile URL, node border colours).

---

## Executive Summary (`ResultsOverlay.tsx`)

Appears automatically 800 ms after receiving the `done` event.

**All text is in Portuguese**, including:
- Section labels, KPI grades (`ÓTIMO` / `ACEITÁVEL` / `CRÍTICO`)
- Urgency badges (`CRÍTICO` / `MODERADO` / `BAIXO`)
- Pending action mitigation texts (per fault type: transformer, cable, switchable, critical site)
- Plural handling: `1 falha por resolver` / `N falhas por resolver`
- PDF download — all HTML generated in Portuguese

**Sections:**

| Section | Data source |
|---------|-------------|
| Circular KPI gauges (SLA · Safety · Efficiency) | `kpi` state from `kpi` event |
| Operational indicators | `faults` array + `totalClients` prop (143,000) |
| SAP integration KPIs (7 systems, including Drolius) | `actionMessages` + `faults` |
| Orchestrator analysis | `agentLogs.find(l => l.agent === 'orchestrator').text` |
| Pending actions with mitigation | `faults.filter(f => f.status === 'fault')` |

---

## BTP Cloud Foundry deployment

```yaml
# manifest.yml
applications:
- name: edp-storm-response
  memory: 64M
  disk_quota: 512M
  buildpacks: [nodejs_buildpack]
  command: node dist/server/index.js
  env:
    NODE_ENV: production
    NPM_CONFIG_PRODUCTION: false
```

The `heroku-postbuild` script runs `npm run build` during CF staging.

```
cf push
  → npm install (including devDependencies)
  → heroku-postbuild → tsc + vite build
  → node dist/server/index.js
```

URL: [gestao-resposta-tempestades.cfapps.eu10.hana.ondemand.com](https://gestao-resposta-tempestades.cfapps.eu10.hana.ondemand.com)
