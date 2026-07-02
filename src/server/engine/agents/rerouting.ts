import { SimParams, ScenarioState, AgentResult, SimEvent } from '../types';
import { runAgent, ToolDef } from '../agentRunner';

export async function runRerouting(
  params: SimParams,
  state: ScenarioState,
  emit: (e: SimEvent) => void
): Promise<AgentResult> {
  let summary = 'Rerouting completado.';
  const restoredFaultIds: string[] = [];
  let switchCount = 0;

  const switchable = state.faults.filter(f => f.type === 'switchable' && f.status === 'fault');

  const faultList = switchable.map(f =>
    `${f.id} | zona:${f.zone} | clientes:${f.affectedClients}`
  ).join('\n');

  const tools: ToolDef[] = [
    {
      name: 'attempt_remote_switch',
      description: 'Ejecuta una conmutación remota (telecontrol) para restaurar suministro en un fallo conmutable.',
      input_schema: {
        type: 'object' as const,
        properties: {
          faultId: { type: 'string', description: 'ID del fallo conmutable a restaurar' },
        },
        required: ['faultId'],
      },
      handler: async (input) => {
        if (switchCount >= params.switchableFaults) {
          return `Error: límite de operaciones de telecontrol alcanzado (${params.switchableFaults})`;
        }
        const fault = state.faults.find(f => f.id === input.faultId);
        if (!fault) return `Error: fallo ${input.faultId} no encontrado`;
        if (fault.type !== 'switchable') return `Error: ${input.faultId} no es conmutable`;
        if (fault.status !== 'fault') return `Error: ${input.faultId} ya procesado (estado: ${fault.status})`;

        switchCount++;
        fault.status = 'switching';
        emit({ type: 'asset_update', id: fault.id, status: 'switching' });
        await new Promise(r => setTimeout(r, 600));
        fault.status = 'restored';
        emit({ type: 'asset_update', id: fault.id, status: 'restored' });
        restoredFaultIds.push(fault.id);
        emit({ type: 'action', agent: 'rerouting', system: 'SAP Asset Intelligence Network', msg: params.language === 'en'
          ? `Remote switch executed: ${fault.id} — ${fault.zone} (${fault.affectedClients.toLocaleString()} customers reconnected)`
          : params.language === 'pt'
          ? `Comutação remota executada: ${fault.id} — ${fault.zone} (${fault.affectedClients.toLocaleString()} clientes reconectados)`
          : `Conmutación remota ejecutada: ${fault.id} — ${fault.zone} (${fault.affectedClients.toLocaleString()} clientes reconectados)` });
        return `Conmutación exitosa: ${fault.id} (${fault.zone}) restaurado — ${fault.affectedClients.toLocaleString()} clientes reconectados`;
      },
    },
    {
      name: 'complete_rerouting',
      description: 'Finaliza el rerouting con resumen de operaciones.',
      input_schema: {
        type: 'object' as const,
        properties: {
          summary: { type: 'string', description: 'Resumen de operaciones de conmutación' },
        },
        required: ['summary'],
      },
      handler: async (input) => {
        summary = input.summary as string;
        return 'Rerouting finalizado.';
      },
    },
  ];

  await runAgent({
    systemPrompt: `És o agente Remote Restoration SCADA Agent do sistema de Gestão de Resposta a Tempestades da Distribuição Eléctrica (AML Lisboa).
A tua missão: executar comutações remotas (telecomando) para restaurar fornecimento na rede subterrânea de Lisboa sem enviar brigadas.
Só podes fazer ${params.switchableFaults} operações de telecomando (limite autorizado ERSE para o dia).
Chama attempt_remote_switch para cada falha que queiras restaurar (até ao limite).
Após terminar, chama complete_rerouting com o resumo de operações.
REGRA DE IDIOMA CRÍTICA: DEVES escrever TODA a saída em Português Europeu. Sê direto e operacional.`,
    userMessage: `[RESPONDE APENAS EM PORTUGUÊS EUROPEU]

FALHAS COMUTÁVEIS DISPONÍVEIS (${switchable.length} total):
${faultList}

Operações de telecomando autorizadas: ${params.switchableFaults}
SLA: ${params.minuteSLA} min | Janela tempestade 2: ${params.storm2Window}

Executa as comutações usando attempt_remote_switch, depois chama complete_rerouting.${params.instructions?.trim() ? `\n\nINSTRUÇÕES DO OPERADOR (aplica na tua decisão):\n${params.instructions.trim()}` : ''}`,
    tools,
    emit,
    agentId: 'rerouting',
    maxTokens: 8192,
    haiku: true,
    instructions: params.instructions,
    language: params.language,
  });

  return {
    agentId: 'rerouting',
    summary,
    restoredFaults: restoredFaultIds,
    dispatches: [],
    commsMessages: [],
  };
}
