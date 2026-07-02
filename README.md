# ⚡ Gestão de Resposta a Tempestades

Multi-agent AI simulation system for storm-driven electrical incident response. Models the real-world operations of Distribuição Eléctrica in the Área Metropolitana de Lisboa: Storm Kristin with 120 km/h gusts, 47 active faults, 22 field crews across 6 bases, critical sites on limited battery, and eucalyptus trees down on MV overhead lines in Sintra and Arrábida. The application is in European Portuguese.

**Live demo:** [gestao-resposta-tempestades.cfapps.eu10.hana.ondemand.com](https://gestao-resposta-tempestades.cfapps.eu10.hana.ondemand.com)

**Repositories:**
- GitHub: [github.com/javierdonoso88/gestao-resposta-tempestades](https://github.com/javierdonoso88/gestao-resposta-tempestades)
- SAP GitHub Enterprise: [github.tools.sap/I572394/gestao-resposta-tempestades](https://github.tools.sap/I572394/gestao-resposta-tempestades)

---

## What it does

Opening the app shows a **landing page** with the use case, key scenario metrics, and the multi-agent architecture. From there you enter the interactive simulator, with a back-to-landing button in the header at any time.

The header includes a **theme dropdown** with three options: **Dark** (navy/cyan), **SAP Joule** (light grey, purple `#6d28d9` accent), and **Verde** (light green, `#00a651` accent). The preference is persisted in `localStorage`.

The application is **Portuguese-only**. All UI text, AI agent output, SAP action messages, and the executive report (screen and PDF) are generated in European Portuguese.

When a simulation starts, an SAP AI Core orchestrator coordinates 5 specialised agents that reason over the scenario in real time:

| Phase | Agents | Mode |
|-------|--------|------|
| 1 — Assessment | Technician Briefing Agent · Remote Restoration SCADA Agent | Parallel |
| 2 — Execution | Service Dispatcher Agent → Resource Capacity Shortage Agent → Communications Insight Agent | Sequential |

Each agent receives the scenario state, uses concrete tools to make decisions (switch faults, dispatch crews, allocate materials, send communications), and emits SSE events that update the map, logs, and KPIs in real time.

On completion, an **Executive Summary** appears automatically with:
- Visual KPI gauges (SLA, Safety, Operational Efficiency) with SVG circular arcs
- Time indicators (TIEPI — client-weighted average interruption minutes, MTTR — mean repair time for attended faults)
- Operational indicators: customers restored, faults handled, critical sites covered, pending actions
- SAP integration KPIs: systems touched, FSM work orders, AIN switches, IBP materials, CX messages, S/4HANA assets, Drolius missions
- Orchestrator narrative (clean CoT text, markdown rendered)
- Pending actions with prioritised mitigation recommendations in Portuguese

Sidebar KPIs show `—` until the simulation completes (no misleading initial values).

The report can be closed and reopened via the **"Ver Relatório"** button in the header (visible after simulation completes). Starting a new simulation hides the button until it finishes. The report footer includes a **Descarregar PDF** button — print styles hide the rest of the UI and preserve dashboard colours.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  React Frontend (Portuguese)                                     │
│  LandingPage · MapPanel · LogPanel · GanttPanel                  │
│  ParametersPanel · StatsPanel (SAP Actions + Communications)     │
└────────────────────┬────────────────────────────────────────────┘
                     │  SSE /api/simulate
┌────────────────────▼────────────────────────────────────────────┐
│  Express Server                                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Orchestrator (Claude)                                   │    │
│  │  invoke_triage_priority ─┐                              │    │
│  │  invoke_rerouting ────────┤ Promise.all (Phase 1)       │    │
│  │  invoke_crew_dispatch → invoke_resource → invoke_comms  │    │
│  │  finalize                                               │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                              │ runAgent()                        │
│  ┌──────────────────────┐  ┌─────────────────────────┐         │
│  │ Technician Briefing  │  │ Remote Restoration SCADA │         │
│  │ Agent                │  │ Agent                    │         │
│  └──────────────────────┘  └─────────────────────────┘         │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  │
│  │ Service Dispatcher   │  │ Resource Capacity    │  │ Communications       │  │
│  │ Agent                │  │ Shortage Agent       │  │ Insight Agent        │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SAP AI Core — Anthropic Claude Sonnet / Haiku            │  │
│  │  OAuth2 · /invoke · /invoke-with-response-stream          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for full technical detail.

---

## Base scenario — Storm Kristin · AML Lisboa

- **143,000 customers** — Área Metropolitana de Lisboa
- **47 active faults**: 22 switchable (underground Lisboa grid, SCADA remote), 7 transformers, 18 MV cables
- **7 critical sites** on limited battery: Hospital Santa Maria, EPAL Loures (water supply 800K people, 30 min battery), NephroCare Almada, Hospital Garcia de Orta, CPD Sintra, Hospital Fernando Fonseca, Quartel Bombeiros Setúbal
- **22 field crews** across 6 bases: Lisboa/Chelas, Sintra, Cascais, Loures, Almada, Setúbal
- **Drolius** — ANYbotics inspection robot, deployable by Service Dispatcher Agent for pre-visit reconnaissance in hard-to-access areas (Sintra EN9, Arrábida)
- **Configurable parameters**: SLA target, available crews, limited parts inventory, second storm window

**Unique scenario tensions:**
1. **EPAL Loures** — 30 min battery, water supply for 800,000 people. Absolute rank-1 priority.
2. **Transformer shortage** (limited parts ON) — 1 transformer for 7 critical faults in Sintra and Arrábida.
3. **South bank isolation** — Almada and Setúbal crews face +20 min ETA due to Ponte 25 de Abril congestion.
4. **Sintra access blocked** — Eucalyptus trees on EN9/EN247. Dispatcher must use Drolius before sending crews.

---

## Technology

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React-Leaflet, CSS custom properties |
| Backend | Node.js, Express, SSE |
| AI | SAP AI Core — Claude Sonnet (orchestrator) · Claude Haiku (sub-agents) |
| SDK | `@anthropic-ai/sdk` with custom adapter for AI Core |
| Language | European Portuguese (fixed — no language switching) |
| Deploy | SAP BTP Cloud Foundry (`nodejs_buildpack`) |

---

## Local setup

**Requirements**: Node.js ≥ 18, SAP AI Core access

```bash
git clone https://github.tools.sap/I572394/gestao-resposta-tempestades
cd gestao-resposta-tempestades
npm install
```

Configure environment variables (optional — demo tenant defaults are built in):

```bash
export AICORE_CLIENT_ID=...
export AICORE_CLIENT_SECRET=...
export AICORE_TOKEN_URL=...
export AICORE_API_URL=...
export AICORE_DEPLOYMENT_ID=...
export AICORE_RESOURCE_GROUP=default
```

Start in development mode:

```bash
npm run dev
# Client: http://localhost:5173
# Server: http://localhost:3001
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Server + client in development mode (hot reload) |
| `npm run build` | Compile TypeScript + Vite for production |
| `npm start` | Start the production server |

---

## Cloud Foundry deployment

```bash
cf push
```

The buildpack runs `heroku-postbuild` → `npm run build` automatically during staging, so no local build is needed before deploying.

Environment variables in CF:

```bash
cf set-env edp-storm-response AICORE_CLIENT_ID ...
cf set-env edp-storm-response AICORE_CLIENT_SECRET ...
cf set-env edp-storm-response AICORE_TOKEN_URL ...
cf set-env edp-storm-response AICORE_DEPLOYMENT_ID ...        # Sonnet deployment (orchestrator)
cf set-env edp-storm-response AICORE_HAIKU_DEPLOYMENT_ID ...  # Haiku deployment (sub-agents)
cf restage edp-storm-response
```

---

## Project structure

```
src/
├── client/
│   ├── App.tsx                  # Main layout, landing↔simulator nav, theme selector
│   ├── contexts/
│   │   ├── ThemeContext.tsx      # Dark / Joule / Verde themes — CSS vars + localStorage
│   │   └── LanguageContext.tsx   # Fixed Portuguese context (no switching)
│   ├── i18n/
│   │   ├── pt.ts                # ~320 strings in European Portuguese
│   │   ├── es.ts                # Spanish translations (kept for reference)
│   │   ├── en.ts                # English translations (kept for reference)
│   │   └── index.ts             # useT() hook — always returns pt translations
│   ├── hooks/useSimulation.ts   # SSE handling and simulation state management
│   ├── components/
│   │   ├── LandingPage.tsx      # Landing screen: use case + multi-agent architecture
│   │   ├── MapPanel.tsx         # AML Lisboa map with fault nodes (React-Leaflet)
│   │   ├── LogPanel.tsx         # Real-time CoT logs per agent
│   │   ├── ParametersPanel.tsx  # Controls + KPIs (shows — until simulation completes)
│   │   ├── GanttPanel.tsx       # Orchestration flow diagram (HTML+SVG, Safari-compatible)
│   │   ├── StatsPanel.tsx       # SAP Actions (top) + Communications (bottom)
│   │   └── ResultsOverlay.tsx   # Executive summary: KPIs, SAP integration, analysis, pending actions
│   └── data/mapData.ts          # GPS coordinates and network topology for AML Lisboa
└── server/
    ├── index.ts                 # Express server
    ├── routes/simulation.ts     # SSE endpoint /api/simulate (language fixed to 'pt')
    └── engine/
        ├── types.ts             # Types: Fault, Crew, SimEvent, SimParams…
        ├── scenario.ts          # Base scenario: 47 faults, 22 crews, AML Lisboa
        ├── anthropicClient.ts   # SAP AI Core adapter + SSE transformer
        ├── agentRunner.ts       # Generic tool-use loop with streaming + PT language injection
        ├── orchestrator.ts      # Orchestrator agent + Phase 1 parallel execution
        └── agents/
            ├── triage-priority.ts  # Fault classification + urgency ranking
            ├── rerouting.ts        # Remote SCADA restoration (Lisboa underground grid)
            ├── crew-dispatch.ts    # Crew assignment + Drolius deployment
            ├── resource.ts         # Inventory management + conflict detection
            └── comms.ts            # SMS · Press release · ERSE/ANPC regulatory notification
```

---

## Additional documentation

- [Technical architecture](docs/architecture.md) — SSE, AI Core adapter, streaming model
- [Agent reference](docs/agents.md) — Tools, prompts, and decisions for each agent
