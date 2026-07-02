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
        emit({ type: 'action', agent: 'triage-priority', system: 'SAP S/4HANA Asset Management + Event Mesh', msg: `${state.faults.length} ativos analisados — ${criticalFaultIds.length} locais críticos, ${orderedIds.length} falhas físicas ordenadas` });
        return 'Análisis completado.';
      },
    },
  ];

  await runAgent({
    systemPrompt: `És o agente Technician Briefing Agent do sistema de Gestão de Resposta a Tempestades da Distribuição Eléctrica (AML Lisboa).
A tua missão tem duas etapas:
1. TRIAGE: classifica TODAS as falhas (comutáveis, transformadores, cabos) usando classify_fault.
   - Considera bateria restante em locais críticos (EPAL Loures, hospitais, diálise, CPD Sintra), tipo de falha e clientes afetados.
   - Os transformadores em Sintra e Arrábida são os mais difíceis de aceder — eucaliptos na EN9 e EN247.
2. PRIORITY: após classificar todas, ordena as falhas FÍSICAS (transformadores e cabos) usando set_priority.
   - Locais críticos com menos bateria têm prioridade máxima (bateria ASC, clientes DESC).
   - EPAL Loures (água para 800.000 pessoas) deve receber rank 1 se bateria < 60 min.
Após terminar ambas as etapas chama complete_assessment com o resumo executivo.
REGRA DE IDIOMA CRÍTICA: DEVES escrever TODA a saída em Português Europeu. Sê analítico e operacional.`,
    userMessage: `[RESPONDE APENAS EM PORTUGUÊS EUROPEU]

RELATÓRIO DE INCIDENTE — Área Metropolitana de Lisboa — Tempestade Kristin
SLA objetivo: ${params.minuteSLA} min | Janela tempestade 2: ${params.storm2Window}
Peças limitadas: ${params.limitedParts === 1 ? 'SIM — apenas 1 transformador disponível' : 'NÃO'}
CONTEXTO: Rede subterrânea Lisboa (comutáveis rápidos) + linhas MT aéreas Sintra/Arrábida (eucaliptos caídos)
Brigadas margem sul (Almada/Setúbal) podem ter +20 min de ETA por congestionamento na Ponte 25 de Abril.

TODAS AS FALHAS ATIVAS (${state.faults.length} total):
${faultList}

INSTRUÇÕES:
1. Chama classify_fault para CADA uma das ${state.faults.length} falhas.
2. Chama set_priority para cada uma das ${physicalFaults.length} falhas físicas (transformadores e cabos).
3. Chama complete_assessment com o resumo.${params.instructions?.trim() ? `\n\nINSTRUÇÕES DO OPERADOR (aplica na tua análise):\n${params.instructions.trim()}` : ''}`,
    tools,
    emit,
    agentId: 'triage-priority',
    maxTokens: 8192,
    haiku: true,
    instructions: params.instructions,
  });

  return {
    agentId: 'triage-priority',
    summary,
    restoredFaults: [],
    dispatches: [],
    commsMessages: [],
  };
}
