# Technical Architecture

## Simulation flow

```
User configures parameters → POST /api/simulate
    └─► runOrchestrator(params, emit)
            │
            ├── buildScenario()          # Builds initial state: 47 faults + 22 crews
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
| `drolius_update` | `{ status, task?, report? }` | Updates Drolius status chip in sidebar; `status` is `'deployed'` (only emitted state) |
| `safety_tick` | `{ elapsed, limit }` | Updates safety progress bar |
| `kpi` | `{ sla, safety, efficiency, tiepi, mttr }` | Updates final metrics |
| `done` | `{ elapsed }` | Closes the simulation |

---

## Models

| Component | Model | Reason |
|-----------|-------|--------|
| Orchestrator | `claude-sonnet-4-6` | Narrative reasoning visible in the executive summary |
| Sub-agents (Technician Briefing, Remote Restoration SCADA, Service Dispatcher, Resource Capacity Shortage, Communications Insight) | `claude-haiku-4-5` | Structured tool-use decisions; lower latency |

The Haiku deployment is configured via `AICORE_HAIKU_DEPLOYMENT_ID`. If not set, both roles fall back to the Sonnet deployment.

---

## SAP AI Core adapter (`anthropicClient.ts`)

The Anthropic SDK calls `/v1/messages`. SAP AI Core exposes a Bedrock-compatible API with different routes and body format. The adapter in `anthropicClient.ts` acts as a transparent middleware:

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
- Same header/body transformations
          │
          ▼
AI Core → POST /invoke-with-response-stream
       ← SSE: data: {"type":"message_start",...}
               data: {"type":"content_block_delta",...}
               ...
          │
          ▼ injectEventLines()
       ← SSE: event: message_start
               data: {"type":"message_start",...}

               event: content_block_delta
               data: {"type":"content_block_delta",...}
               ...
          │
          ▼
SDK receives SSE with event: lines → processes normally
```

**Why `injectEventLines` is needed**: AI Core (Bedrock format) sends SSE with only `data:` lines, without a preceding `event:` line. The Anthropic SDK checks `sse.event` to determine the event type; without it, `sse.event === null` and the stream emits no chunks → "request ended without sending any chunks" error. The transformer reads the `type` field from the JSON in each `data:` line and prepends the corresponding `event: <type>` line.

### OAuth2 token

```typescript
// Cache with 60s margin before expiry
if (tokenCache && tokenCache.expiresAt - now > 60_000) {
  return tokenCache.token;
}
// OAuth2 client_credentials against the BTP tenant
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

Handlers return descriptive strings on success or `"Error: ..."` on failure, allowing Claude to self-correct on the next turn.

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
// report generated instantly (no delays)
const report = generateReport(fault, mission);
return report;
// Drolius stays in 'deployed' state for the rest of the simulation
```

This guarantees that when `resource.ts` receives the state, faults already have `status: 'crew-en-route'` set by crew-dispatch.

---

## KPIs (calculated in `finalize`)

```
SLA        = attended_clients / total_affected_clients × 100
             (attended = sum of affectedClients for faults with status restored or crew-en-route)

Safety     = critical_sites_covered / total_critical_sites × 100
             (covered = status crew-en-route or restored)

Efficiency = faults_attended / total_faults × 100
             (attended = status restored or crew-en-route)
```

Estimated interruption times per status: restored (SCADA) = 10 min · crew-en-route transformer = 135 min · crew-en-route cable = 90 min · unattended fault = 240 min.

---

## Theme system (Dark / Joule / EDP)

The simulator header includes a theme dropdown with three options:

| Theme | Background | Border | Accent |
|-------|-----------|--------|--------|
| Dark (default) | `#0d1520` navy | `#1e2d45` | `#22d3ee` cyan |
| SAP Joule | `#f3f5f8` light grey | `#dde3ec` | `#6d28d9` SAP purple |
| EDP | `#f2f7f4` light green | `#c8ddd0` | `#00a651` EDP green |

**Implementation**:

- `ThemeContext.tsx` — React Context exposing `{ theme, setTheme }`. Supports `Theme = 'dark' | 'joule' | 'iberdrola'` (internal key). Persists in `localStorage('src-theme')` and writes `data-theme="<theme>"` on `document.documentElement`.
- `globals.css` — variables in `:root` (dark), `[data-theme="joule"]` and `[data-theme="iberdrola"]`. The two light themes share the same token structure; they differ in `--accent` value and background tints. Components detect "light theme" with `isLight = theme !== 'dark'`.
- All components use `var(--token)` in their inline styles. `MapPanel` and `ParametersPanel` also consume `useTheme()` for JS logic that cannot be resolved with CSS vars (CartoDB tile URL `dark_all` ↔ `light_all`, map node border colours, toggle switch conditional styles).
- Tailwind arbitrary-value classes (e.g. `bg-[#111c2e]`) are overridden with `[data-theme="joule"] .bg-\[#111c2e\]` selectors in `globals.css`.

**Toggle switch (`ParametersPanel`):** The knob uses `position: absolute` with `left: 2px` (OFF) / `left: 16px` (ON) and `transition-all` for animation. Explicit `left` is used instead of `translateX` because without `left: 0` as origin, the transform operates from the element's static position, which in some browsers is not the button's left edge. The OFF state uses a mid-grey (`#c4cdd9` Joule / `#334155` dark) so the white knob is visible in both themes.

**Simulation status chips (`App.tsx`):** Background and text colours for the "Running" and "Completed" chips use CSS tokens `--status-running-bg/color` and `--status-done-bg/color`, defined in `:root` (dark orange / dark green) and overridden in `[data-theme="joule"]` (creamy orange / light green).

---

## Executive Summary (`ResultsOverlay.tsx`)

Appears automatically 800 ms after receiving the `done` event. Can be closed and reopened via the "View Report" button in the header until a new simulation starts.

**Sections:**

| Section | Data source |
|---------|-------------|
| Circular KPI gauges (SLA · Safety · Efficiency) | `kpi` state from `kpi` event |
| Operational indicators (customers, faults, critical sites, pending) | `faults` array |
| SAP integration KPIs (7 systems, including Drolius) | `actionMessages` + `faults` |
| Orchestrator analysis | `agentLogs.find(l => l.agent === 'orchestrator').text` |
| Pending actions with mitigation | `faults.filter(f => f.status === 'fault')` |

**CoT text cleanup and formatting:** `renderMarkdown()` converts Claude-generated text to JSX: `##`/`###` headings as cyan uppercase tags, `**bold**` as bright white, `*italic*` as light slate, `` `code` `` with dark cyan background, and `- item` lists as bullet points. Lines starting with `**` (bold) are correctly distinguished from bullets (`- ` / `* `) via precise regexes (`/^[-*]\s/`) to avoid infinite loops during render.

**SVG gauges:** Arc calculated with `strokeDasharray = (value/100) × 2πr`. Empty arc uses `var(--border)`, filled arc uses threshold colour (green ≥80, orange ≥60, red <60). `zIndex: 2000` to overlay the Leaflet map (max z-index ~1000).

**PDF download:** The "Download PDF" button generates a complete HTML document in memory (KPIs, operational stats, SAP integration, orchestrator analysis, pending actions with mitigation), opens it in a new window with `window.open()`, and calls `window.print()` after 400 ms to allow rendering. No external dependencies — all HTML and CSS is generated as a string in the client.

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
    NPM_CONFIG_PRODUCTION: false   # required to install devDependencies (TypeScript, Vite)
```

The `heroku-postbuild` script in `package.json` runs `npm run build` during CF staging, compiling TypeScript and Vite before the app starts.

```
cf push
  → npm install (including devDependencies via NPM_CONFIG_PRODUCTION=false)
  → heroku-postbuild → tsc + vite build
  → node dist/server/index.js
```

---

## Internationalisation (ES / EN / PT)

The language selector (🇪🇸 🇬🇧 🇵🇹) is available in both the landing nav and the simulator header. It changes the UI language **and** all AI-generated content.

### Full coverage

| Area | Coverage |
|------|----------|
| Static UI | Landing, simulator, incident modal ("more info"), executive report (screen + downloadable PDF) |
| AI agents | CoT logs, internal reasoning, orchestrator summary |
| SAP actions | All 10 hardcoded action strings across 5 agents + orchestrator |
| Communications | SMS, press release, regulatory notification |
| PDF report | All labels, sections, KPI grades, urgency badges, fault types, footer |

### Architecture

- `LanguageContext.tsx` — React Context exposing `{ lang, setLang, cycleLang }`. Type `Lang = 'es' | 'en' | 'pt'`. Persists in `localStorage('src-lang')`.
- `src/client/i18n/es.ts`, `en.ts`, `pt.ts` — typed objects with ~320 strings each, in sections: `nav`, `hero`, `stats`, `challenge`, `arch`, `cta`, `app`, `params`, `map`, `gantt`, `log`, `panels`, `results`, `modal`.
- `src/client/i18n/index.ts` — exports the `useT()` hook returning the active language's translation object.
- All components import `useT()` and reference strings as `t.params.simulate`, `t.map.header`, `t.modal.summaryTitle`, etc.

### Language in AI agents

The language is sent in the `language` field of `SimParams` with each `POST /api/simulate` request.

**`agentRunner.ts`** injects the language instruction at both the start **and end** of the system prompt, and as a prefix to the user message (to reinforce it against the Spanish-dominant base prompts):

```
// system prompt (start and end):
CRITICAL LANGUAGE RULE: You MUST write ALL your output in English —
reasoning, tool calls, summaries and any narrative. No Spanish allowed.

// user message (prefix):
[RESPOND IN ENGLISH ONLY]
```

Portuguese uses an equivalent rule in European Portuguese.

**`orchestrator.ts`** includes the same rule directly in its system prompt.

**Hardcoded action messages** — the 10 SAP action strings (SCADA switches, work orders, material reservations, communications, etc.) have ES/EN/PT branches in each agent and the orchestrator, selected via `params.language`.

### Orchestration diagram (GanttPanel)

Redesigned with pure HTML layout + overlaid SVG for the connector arrows. Removes `<foreignObject>` in SVG (Safari-incompatible). Nodes are absolute `div` elements with a `ResizeObserver` to scale the diagram to available space. Connector colours adapt to the active theme (cyan / purple / green).
