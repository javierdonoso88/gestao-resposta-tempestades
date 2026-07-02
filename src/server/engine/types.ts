export type AgentId = 'triage-priority' | 'rerouting' | 'crew-dispatch' | 'resource' | 'comms';
export type FaultStatus = 'fault' | 'switching' | 'restored' | 'crew-en-route' | 'repairing' | 'repaired';
export type FaultType = 'switchable' | 'transformer' | 'cable';
export type CrewSkill = 'A' | 'B' | 'C';
export type DroliusStatus = 'available' | 'deployed' | 'returning';

export interface SimParams {
  minuteSLA: number;          // 30–120 min
  switchableFaults: number;   // 5–22
  limitedParts: 0 | 1;       // 0=full inventory, 1=limited (only 1 transformer available)
  storm2Window: 'T+4h' | 'T+6h' | 'T+8h' | 'none';
  availableCrews: number;     // 8–22
  instructions?: string;      // free-text operator instructions
}

export interface Fault {
  id: string;
  type: FaultType;
  zone: string;
  affectedClients: number;
  criticalSite?: string;
  criticalSiteType?: 'hospital' | 'cpd' | 'dialysis' | 'water' | 'emergency';
  batteryMinutes?: number;
  gridPos: { col: number; row: number };
  status: FaultStatus;
}

export interface Crew {
  id: string;
  base: string;
  skills: CrewSkill[];
  status: 'available' | 'busy';
  currentTask?: string;
}

export interface Inventory {
  transformers: number;
  cables: number;
  mobileGenerators: number;
}

export interface DroliusUnit {
  status: DroliusStatus;
  currentTask?: string;
}

export interface ScenarioState {
  faults: Fault[];
  crews: Crew[];
  inventory: Inventory;
  totalClients: number;
  drolius: DroliusUnit;
}

export type SimEvent =
  | { type: 'cot_chunk'; text: string; agent?: AgentId | 'orchestrator' }
  | { type: 'agent_start'; agent: AgentId; t: string }
  | { type: 'agent_done'; agent: AgentId; summary: string }
  | { type: 'asset_update'; id: string; status: FaultStatus }
  | { type: 'comms'; channel: 'sms' | 'press' | 'regulatory'; msg: string }
  | { type: 'safety_tick'; elapsed: number; limit: number }
  | { type: 'kpi'; sla: number; safety: number; efficiency: number; tiepi: number; mttr: number }
  | { type: 'conflict'; winner: AgentId; loser: AgentId; reason: string }
  | { type: 'action'; agent: AgentId | 'orchestrator'; system: string; msg: string }
  | { type: 'drolius_update'; status: DroliusStatus; task?: string; report?: string }
  | { type: 'done'; elapsed: string };

export interface AgentResult {
  agentId: AgentId;
  summary: string;
  restoredFaults: string[];
  dispatches: { crewId: string; faultId: string }[];
  commsMessages: { channel: 'sms' | 'press' | 'regulatory'; msg: string }[];
  kpi?: { sla: number; safety: number; efficiency: number };
  conflict?: { winner: AgentId; loser: AgentId; reason: string };
}
