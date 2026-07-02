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
    systemPrompt: `Eres el agente Remote Restoration Scada Agent del sistema de Respuesta a Tormentas de Distribuição Eléctrica (AML Lisboa).
Tu misión: ejecutar conmutaciones remotas (telecomando) para restaurar suministro en la red subterránea de Lisboa sin enviar brigadas.
Solo puedes hacer ${params.switchableFaults} operaciones de telecomando (límite autorizado ERSE para la jornada).
Llama a attempt_remote_switch para cada fallo que quieras restaurar (hasta el límite).
Al finalizar, llama a complete_rerouting con el resumen de operaciones.
${params.language === 'pt' ? 'Responde em Português Europeu.' : params.language === 'en' ? 'Respond in English.' : 'Responde en español.'} Sé directo y operacional.`,
    userMessage: `FALLOS CONMUTABLES DISPONIBLES (${switchable.length} total):
${faultList}

Operaciones de telecontrol autorizadas: ${params.switchableFaults}
SLA: ${params.minuteSLA} min | Ventana tormenta 2: ${params.storm2Window}

Ejecuta las conmutaciones usando attempt_remote_switch, luego llama a complete_rerouting.${params.instructions?.trim() ? `\n\nINSTRUCCIONES DEL OPERADOR (aplica en tu decisión):\n${params.instructions.trim()}` : ''}`,
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
