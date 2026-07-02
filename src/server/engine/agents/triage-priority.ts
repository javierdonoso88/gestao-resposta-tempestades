import { SimParams, ScenarioState, AgentResult, SimEvent } from '../types';
import { runAgent, ToolDef } from '../agentRunner';

export async function runTriagePriority(
  params: SimParams,
  state: ScenarioState,
  emit: (e: SimEvent) => void
): Promise<AgentResult> {
  let summary = 'Triage y priorización completados.';
  const criticalFaultIds: string[] = [];
  const orderedIds: string[] = [];

  const faultList = state.faults.map(f =>
    `${f.id} | tipo:${f.type} | zona:${f.zone} | clientes:${f.affectedClients}` +
    (f.criticalSite ? ` | CRÍTICO:${f.criticalSite} (${f.criticalSiteType}) batería:${f.batteryMinutes ?? 'N/A'}min` : '')
  ).join('\n');

  const physicalFaults = state.faults.filter(f =>
    (f.type === 'transformer' || f.type === 'cable') && f.status === 'fault'
  );

  const tools: ToolDef[] = [
    {
      name: 'classify_fault',
      description: 'Clasifica un fallo individual por severidad y riesgo crítico.',
      input_schema: {
        type: 'object' as const,
        properties: {
          faultId: { type: 'string', description: 'ID del fallo, e.g. TRF-002' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          criticalSite: { type: 'boolean', description: 'Si afecta infraestructura crítica' },
          batteryRisk: { type: 'boolean', description: 'Si la batería puede agotarse antes del SLA' },
        },
        required: ['faultId', 'severity', 'criticalSite', 'batteryRisk'],
      },
      handler: async (input) => {
        const fault = state.faults.find(f => f.id === input.faultId);
        if (!fault) return `Error: fallo ${input.faultId} no encontrado en el escenario`;
        if (input.criticalSite && !criticalFaultIds.includes(input.faultId as string)) {
          criticalFaultIds.push(input.faultId as string);
        }
        return `OK: ${input.faultId} clasificado severidad=${input.severity}`;
      },
    },
    {
      name: 'set_priority',
      description: 'Asigna un rango de prioridad a un fallo físico (transformador o cable) para el despacho de brigadas.',
      input_schema: {
        type: 'object' as const,
        properties: {
          faultId: { type: 'string', description: 'ID del fallo físico' },
          rank: { type: 'number', description: 'Número de orden (1 = más urgente)' },
          reason: { type: 'string', description: 'Justificación de la prioridad asignada' },
          slaRisk: { type: 'boolean', description: 'Si existe riesgo de incumplimiento del SLA' },
        },
        required: ['faultId', 'rank', 'reason', 'slaRisk'],
      },
      handler: async (input) => {
        const fault = state.faults.find(f => f.id === input.faultId);
        if (!fault) return `Error: fallo ${input.faultId} no encontrado`;
        if (!orderedIds.includes(input.faultId as string)) {
          orderedIds.push(input.faultId as string);
        }
        return `OK: ${input.faultId} asignado rango ${input.rank}`;
      },
    },
    {
      name: 'complete_assessment',
      description: 'Finaliza el análisis con resumen ejecutivo de triage y priorización.',
      input_schema: {
        type: 'object' as const,
        properties: {
          summary: { type: 'string', description: 'Resumen ejecutivo del análisis completo' },
        },
        required: ['summary'],
      },
      handler: async (input) => {
        summary = input.summary as string;
        emit({ type: 'action', agent: 'triage-priority', system: 'SAP S/4HANA Asset Management + Event Mesh', msg: params.language === 'en'
          ? `${state.faults.length} assets analysed — ${criticalFaultIds.length} critical sites, ${orderedIds.length} physical faults ranked`
          : params.language === 'pt'
          ? `${state.faults.length} ativos analisados — ${criticalFaultIds.length} locais críticos, ${orderedIds.length} falhas físicas ordenadas`
          : `${state.faults.length} activos analizados — ${criticalFaultIds.length} sitios críticos, ${orderedIds.length} fallos físicos rankeados` });
        return 'Análisis completado.';
      },
    },
  ];

  await runAgent({
    systemPrompt: `Eres el agente Technician Briefing Agent del sistema de Respuesta a Tormentas de Distribuição Eléctrica (AML Lisboa).
Tu misión tiene dos etapas:
1. TRIAGE: clasifica TODOS los fallos (conmutables, transformadores, cables) usando classify_fault.
   - Considera batería restante en sitios críticos (EPAL Loures, hospitales, diálisis, CPD Sintra), tipo de fallo y clientes afectados.
   - Los transformadores en Sintra y Arrábida son los más difíciles de acceder — eucaliptos en la EN9 y EN247.
2. PRIORITY: una vez clasificados todos, rankea los fallos FÍSICOS (transformadores y cables) usando set_priority.
   - Sitios críticos con menor batería tienen máxima prioridad (batería ASC, clientes DESC).
   - EPAL Loures (agua para 800.000 personas) debe recibir rango 1 si batería < 60 min.
Al finalizar ambas etapas llama a complete_assessment con el resumen ejecutivo.
${params.language === 'pt' ? 'Responde em Português Europeu.' : params.language === 'en' ? 'Respond in English.' : 'Responde en español.'} Sé analítico y operacional.`,
    userMessage: `INFORME DE INCIDENTE — Área Metropolitana de Lisboa — Tempestade Kristin
SLA objetivo: ${params.minuteSLA} min | Ventana tormenta 2: ${params.storm2Window}
Piezas limitadas: ${params.limitedParts === 1 ? 'SÍ — solo 1 transformador disponible' : 'NO'}
CONTEXTO: Red subterránea Lisboa (conmutables rápidos) + líneas MT aéreas Sintra/Arrábida (eucaliptos caídos)
Brigadas margem sul (Almada/Setúbal) pueden tener +20 min de ETA por congestión en Ponte 25 de Abril.

TODOS LOS FALLOS ACTIVOS (${state.faults.length} total):
${faultList}

INSTRUCCIONES:
1. Llama a classify_fault para CADA uno de los ${state.faults.length} fallos.
2. Llama a set_priority para cada uno de los ${physicalFaults.length} fallos físicos (transformadores y cables).
3. Llama a complete_assessment con el resumen.${params.instructions?.trim() ? `\n\nINSTRUCCIONES DEL OPERADOR (aplica en tu análisis):\n${params.instructions.trim()}` : ''}`,
    tools,
    emit,
    agentId: 'triage-priority',
    maxTokens: 8192,
    haiku: true,
    instructions: params.instructions,
    language: params.language,
  });

  return {
    agentId: 'triage-priority',
    summary,
    restoredFaults: [],
    dispatches: [],
    commsMessages: [],
  };
}
