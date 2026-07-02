import { useCallback, useRef, useState } from 'react';
import {
  AgentId, AgentLog, AgentState, AgentStatus, ActionMessage, CommsMessage, ConflictEvent,
  Fault, KPIState, SimEvent, SimParams, DroliusStatus
} from '../types';

const AGENT_LABELS: Record<AgentId | 'orchestrator', string> = {
  orchestrator: 'Asset and Services Assistant',
  'triage-priority': 'Technician Briefing Agent',
  rerouting: 'Remote Restoration Scada Agent',
  'crew-dispatch': 'Service Dispatcher Agent',
  resource: 'Resource Capacity Shortage Agent',
  comms: 'Communications Insight Agent',
};

const AGENT_ORDER: AgentId[] = ['triage-priority', 'rerouting', 'crew-dispatch', 'resource', 'comms'];

function initialAgents(): AgentState[] {
  return AGENT_ORDER.map(id => ({
    id, label: AGENT_LABELS[id], status: 'pending' as AgentStatus, progress: 0,
  }));
}

export interface SimulationState {
  running: boolean;
  done: boolean;
  orchestratorStatus: AgentStatus;
  agentLogs: AgentLog[];
  agents: AgentState[];
  faults: Fault[];
  kpi: KPIState;
  commsMessages: CommsMessage[];
  actionMessages: ActionMessage[];
  conflicts: ConflictEvent[];
  safetyElapsed: number;
  safetyLimit: number;
  elapsedLabel: string;
  drolius: { status: DroliusStatus; task?: string };
}

export function useSimulation(initialFaults: Fault[]) {
  const [state, setState] = useState<SimulationState>({
    running: false,
    done: false,
    orchestratorStatus: 'pending',
    agentLogs: [],
    agents: initialAgents(),
    faults: initialFaults,
    kpi: { sla: null, safety: null, efficiency: null, tiepi: null, mttr: null },
    commsMessages: [],
    actionMessages: [],
    conflicts: [],
    safetyElapsed: 0,
    safetyLimit: 360 * 60,
    elapsedLabel: 'T+00:00',
    drolius: { status: 'available' },
  });

  const startSimulation = useCallback((params: SimParams) => {
    setState(prev => ({
      ...prev,
      running: true,
      done: false,
      orchestratorStatus: 'running',
      agentLogs: [],
      agents: initialAgents(),
      faults: initialFaults.map(f => ({ ...f, status: 'fault' as const })),
      kpi: { sla: null, safety: null, efficiency: null, tiepi: null, mttr: null },
      commsMessages: [],
      actionMessages: [],
      conflicts: [],
      safetyElapsed: 0,
      drolius: { status: 'available' },
    }));

    simulateWithFetch(params);
  }, [initialFaults]);

  const simulateWithFetch = useCallback(async (params: SimParams) => {
    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try { handleEvent(JSON.parse(line.slice(6))); } catch { /* skip */ }
          }
        }
      }
    } catch (err) {
      console.error('Simulation error:', err);
      setState(prev => ({ ...prev, running: false }));
    }
  }, []);

  const handleEvent = useCallback((event: SimEvent) => {
    setState(prev => {
      switch (event.type) {
        case 'cot_chunk': {
          const agentKey = (event.agent ?? 'orchestrator') as AgentId | 'orchestrator';
          const idx = prev.agentLogs.findIndex(l => l.agent === agentKey && !l.complete);
          if (idx >= 0) {
            const logs = [...prev.agentLogs];
            logs[idx] = { ...logs[idx], text: logs[idx].text + event.text };
            return { ...prev, agentLogs: logs };
          } else {
            return {
              ...prev,
              agentLogs: [...prev.agentLogs, {
                agent: agentKey,
                label: AGENT_LABELS[agentKey],
                text: event.text,
                complete: false,
              }],
            };
          }
        }

        case 'agent_start':
          return {
            ...prev,
            agents: prev.agents.map(a =>
              a.id === event.agent
                ? { ...a, status: 'running' as AgentStatus, startTime: event.t, progress: 5 }
                : a
            ),
          };

        case 'agent_done':
          return {
            ...prev,
            agents: prev.agents.map(a =>
              a.id === event.agent
                ? { ...a, status: 'done' as AgentStatus, summary: event.summary, progress: 100 }
                : a
            ),
            agentLogs: prev.agentLogs.map(l =>
              l.agent === event.agent && !l.complete ? { ...l, complete: true } : l
            ),
          };

        case 'asset_update':
          return {
            ...prev,
            faults: prev.faults.map(f => f.id === event.id ? { ...f, status: event.status } : f),
          };

        case 'comms':
          return {
            ...prev,
            commsMessages: [{ channel: event.channel, msg: event.msg, ts: Date.now() }, ...prev.commsMessages].slice(0, 20),
          };

        case 'safety_tick':
          return { ...prev, safetyElapsed: event.elapsed, safetyLimit: event.limit };

        case 'kpi':
          return { ...prev, kpi: { sla: event.sla, safety: event.safety, efficiency: event.efficiency, tiepi: event.tiepi, mttr: event.mttr } };

        case 'conflict':
          return {
            ...prev,
            conflicts: [{ winner: event.winner, loser: event.loser, reason: event.reason }, ...prev.conflicts].slice(0, 5),
          };

        case 'action':
          return {
            ...prev,
            actionMessages: [{ agent: event.agent, system: event.system, msg: event.msg, ts: Date.now() }, ...prev.actionMessages].slice(0, 200),
          };

        case 'drolius_update':
          return {
            ...prev,
            drolius: { status: event.status, task: event.task },
          };

        case 'done':
          return {
            ...prev,
            running: false,
            done: true,
            orchestratorStatus: 'done',
            elapsedLabel: event.elapsed,
            agents: prev.agents.map(a =>
              a.status === 'running' ? { ...a, status: 'done' as AgentStatus, progress: 100 } : a
            ),
            agentLogs: prev.agentLogs.map(l => ({ ...l, complete: true })),
          };

        default:
          return prev;
      }
    });
  }, []);

  const tickAgentProgress = useCallback(() => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a =>
        a.status === 'running' && a.progress < 92
          ? { ...a, progress: a.progress + 2 }
          : a
      ),
    }));
  }, []);

  return { state, startSimulation, tickAgentProgress };
}
