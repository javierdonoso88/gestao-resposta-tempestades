import { SimParams, ScenarioState, AgentResult, SimEvent } from '../types';
import { runAgent, ToolDef } from '../agentRunner';

export async function runComms(
  params: SimParams,
  state: ScenarioState,
  hadConflict: boolean,
  emit: (e: SimEvent) => void
): Promise<AgentResult> {
  let summary = 'Comunicaciones enviadas.';
  const commsMessages: { channel: 'sms' | 'press' | 'regulatory'; msg: string }[] = [];

  const restoredFaults = state.faults.filter(f => f.status === 'restored');
  const crewEnRouteFaults = state.faults.filter(f => f.status === 'crew-en-route');
  const restoredClients = restoredFaults.reduce((s, f) => s + f.affectedClients, 0);
  const criticalFaults = state.faults.filter(f => f.criticalSite);
  const criticalAtRisk = criticalFaults.filter(f =>
    f.batteryMinutes !== undefined && f.batteryMinutes < params.minuteSLA
  );

  const tools: ToolDef[] = [
    {
      name: 'send_sms',
      description: 'Envía SMS masivo a clientes afectados. Máximo 160 caracteres. Debe mencionar Distribuição Eléctrica.',
      input_schema: {
        type: 'object' as const,
        properties: {
          text: { type: 'string', description: 'Texto del SMS (máx 160 chars)' },
        },
        required: ['text'],
      },
      handler: async (input) => {
        const msg = input.text as string;
        commsMessages.push({ channel: 'sms', msg });
        emit({ type: 'comms', channel: 'sms', msg });
        emit({ type: 'action', agent: 'comms', system: 'SAP Customer Experience', msg: params.language === 'en'
          ? `Mass SMS sent via SAP CX — ${msg.slice(0, 60)}${msg.length > 60 ? '…' : ''}`
          : params.language === 'pt'
          ? `SMS em massa enviado via SAP CX — ${msg.slice(0, 60)}${msg.length > 60 ? '…' : ''}`
          : `SMS masivo enviado vía SAP CX — ${msg.slice(0, 60)}${msg.length > 60 ? '…' : ''}` });
        return 'SMS enviado.';
      },
    },
    {
      name: 'send_press_release',
      description: 'Publica nota de prensa / comunicado para medios de comunicación locales de Lisboa.',
      input_schema: {
        type: 'object' as const,
        properties: {
          text: { type: 'string', description: 'Texto de la nota de prensa' },
        },
        required: ['text'],
      },
      handler: async (input) => {
        const msg = input.text as string;
        commsMessages.push({ channel: 'press', msg });
        emit({ type: 'comms', channel: 'press', msg });
        emit({ type: 'action', agent: 'comms', system: 'SAP Customer Experience', msg: params.language === 'en'
          ? `Press release published via SAP CX → Lisboa media (Público, Expresso, RTP, TSF)`
          : params.language === 'pt'
          ? `Comunicado de imprensa publicado via SAP CX → media Lisboa (Público, Expresso, RTP, TSF)`
          : `Comunicado de prensa publicado vía SAP CX → medios Lisboa (Público, Expresso, RTP, TSF)` });
        return 'Nota de prensa enviada.';
      },
    },
    {
      name: 'send_regulatory',
      description: 'Envía notificación formal al regulador ERSE y a la Proteção Civil (ANPC) sobre el incidente.',
      input_schema: {
        type: 'object' as const,
        properties: {
          text: { type: 'string', description: 'Texto de la notificación regulatoria' },
        },
        required: ['text'],
      },
      handler: async (input) => {
        const msg = input.text as string;
        commsMessages.push({ channel: 'regulatory', msg });
        emit({ type: 'comms', channel: 'regulatory', msg });
        emit({ type: 'action', agent: 'comms', system: 'SAP Customer Experience', msg: params.language === 'en'
          ? `Regulatory notification sent via SAP CX → CTEPC/CNMC`
          : params.language === 'pt'
          ? `Notificação regulatória enviada via SAP CX → ERSE/CNMC`
          : `Notificación regulatoria enviada vía SAP CX → CTEPC/CNMC` });
        return 'Notificación regulatoria enviada.';
      },
    },
    {
      name: 'complete_comms',
      description: 'Finaliza el ciclo de comunicaciones.',
      input_schema: {
        type: 'object' as const,
        properties: {
          summary: { type: 'string', description: 'Resumen de comunicaciones enviadas' },
        },
        required: ['summary'],
      },
      handler: async (input) => {
        summary = input.summary as string;
        return 'Comunicaciones finalizadas.';
      },
    },
  ];

  await runAgent({
    systemPrompt: `Eres el agente Communications Insight Agent del sistema de Respuesta a Tormentas de Distribuição Eléctrica (AML Lisboa).
Tu misión: redactar y enviar 3 comunicaciones obligatorias en este orden:
1. send_sms: conciso (≤160 chars), menciona Distribuição Eléctrica, número de clientes y tiempo estimado de restauración
2. send_press_release: comunicado formal para medios de Lisboa (Público, Expresso, RTP, SIC Notícias, TSF, Rádio Renascença). Redáctalo en portugués europeo.
3. send_regulatory: notificación técnica formal para ERSE (regulador energético PT) y ANPC (Proteção Civil) con datos del incidente${hadConflict ? '\nIMPORTANTE: Hay conflicto de recursos (material limitado). Menciónalo en la notificación regulatoria.' : ''}${criticalAtRisk.length > 0 ? `\nALERTA: ${criticalAtRisk.length} sitio(s) crítico(s) con batería bajo el umbral SLA. Especialmente EPAL Loures (afecta abastecimiento de agua a 800.000 personas). Menciónalo en la notificación a ERSE y ANPC.` : ''}
Llama a send_sms, send_press_release y send_regulatory (en ese orden), luego complete_comms.
${params.language === 'pt' ? 'Responde em Português Europeu.' : params.language === 'en' ? 'Respond in English.' : 'Responde en español/portugués según el canal.'} Sé profesional y preciso.`,
    userMessage: `SITUACIÓN ACTUAL DEL INCIDENTE — Área Metropolitana de Lisboa — Tempestade Kristin

Fallos totales      : ${state.faults.length}
Restaurados telecon.: ${restoredFaults.length} (${restoredClients.toLocaleString()} clientes reconectados)
Brigadas en camino  : ${crewEnRouteFaults.length} fallos en atención activa
Clientes afectados  : ${state.totalClients.toLocaleString()} total
Sitios críticos     : ${criticalFaults.length} (${criticalFaults.map(f => `${f.criticalSite} batería:${f.batteryMinutes ?? 'N/A'}min`).join(', ') || 'ninguno'})
${criticalAtRisk.length > 0 ? `⚠️ SITIOS CON BATERÍA CRÍTICA (<${params.minuteSLA}min): ${criticalAtRisk.map(f => f.criticalSite).join(', ')}` : '✓ Todos los sitios críticos dentro del margen de batería'}
${hadConflict ? '⚠️ CONFLICTO DE RECURSOS: transformadores insuficientes — protocolo de priorización activado' : '✓ Sin conflictos de recursos'}

SLA objetivo: ${params.minuteSLA}min | Ventana tormenta 2: ${params.storm2Window}

Redacta y envía las 3 comunicaciones con send_sms, send_press_release, send_regulatory, luego complete_comms.${params.instructions?.trim() ? `\n\nINSTRUCCIONES DEL OPERADOR (refleja en el tono y contenido de las comunicaciones):\n${params.instructions.trim()}` : ''}`,
    tools,
    emit,
    agentId: 'comms',
    maxTokens: 8192,
    haiku: true,
    instructions: params.instructions,
    language: params.language,
  });

  return {
    agentId: 'comms',
    summary,
    restoredFaults: [],
    dispatches: [],
    commsMessages,
  };
}
