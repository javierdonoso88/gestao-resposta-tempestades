import { SimParams, ScenarioState, AgentResult, SimEvent } from '../types';
import { runAgent, ToolDef } from '../agentRunner';

export async function runComms(
  params: SimParams,
  state: ScenarioState,
  hadConflict: boolean,
  emit: (e: SimEvent) => void
): Promise<AgentResult> {
  let summary = 'Comunicações enviadas.';
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
      description: 'Envia SMS em massa aos clientes afetados. Máximo 160 caracteres. Deve mencionar Distribuição Eléctrica.',
      input_schema: {
        type: 'object' as const,
        properties: {
          text: { type: 'string', description: 'Texto do SMS (máx 160 chars)' },
        },
        required: ['text'],
      },
      handler: async (input) => {
        const msg = input.text as string;
        commsMessages.push({ channel: 'sms', msg });
        emit({ type: 'comms', channel: 'sms', msg });
        emit({ type: 'action', agent: 'comms', system: 'SAP Customer Experience', msg: `SMS em massa enviado via SAP CX — ${msg.slice(0, 60)}${msg.length > 60 ? '…' : ''}` });
        return 'SMS enviado.';
      },
    },
    {
      name: 'send_press_release',
      description: 'Publica comunicado de imprensa para media local de Lisboa.',
      input_schema: {
        type: 'object' as const,
        properties: {
          text: { type: 'string', description: 'Texto do comunicado de imprensa' },
        },
        required: ['text'],
      },
      handler: async (input) => {
        const msg = input.text as string;
        commsMessages.push({ channel: 'press', msg });
        emit({ type: 'comms', channel: 'press', msg });
        emit({ type: 'action', agent: 'comms', system: 'SAP Customer Experience', msg: `Comunicado de imprensa publicado via SAP CX → media Lisboa (Público, Expresso, RTP, TSF)` });
        return 'Comunicado de imprensa enviado.';
      },
    },
    {
      name: 'send_regulatory',
      description: 'Envia notificação formal ao regulador ERSE e à Proteção Civil (ANPC) sobre o incidente.',
      input_schema: {
        type: 'object' as const,
        properties: {
          text: { type: 'string', description: 'Texto da notificação regulatória' },
        },
        required: ['text'],
      },
      handler: async (input) => {
        const msg = input.text as string;
        commsMessages.push({ channel: 'regulatory', msg });
        emit({ type: 'comms', channel: 'regulatory', msg });
        emit({ type: 'action', agent: 'comms', system: 'SAP Customer Experience', msg: `Notificação regulatória enviada via SAP CX → ERSE/ANPC` });
        return 'Notificação regulatória enviada.';
      },
    },
    {
      name: 'complete_comms',
      description: 'Finaliza o ciclo de comunicações.',
      input_schema: {
        type: 'object' as const,
        properties: {
          summary: { type: 'string', description: 'Resumo das comunicações enviadas' },
        },
        required: ['summary'],
      },
      handler: async (input) => {
        summary = input.summary as string;
        return 'Comunicações finalizadas.';
      },
    },
  ];

  await runAgent({
    systemPrompt: `És o agente Communications Insight Agent do sistema de Gestão de Resposta a Tempestades da Distribuição Eléctrica (AML Lisboa).
A tua missão: redigir e enviar 3 comunicações obrigatórias por esta ordem:
1. send_sms: conciso (≤160 chars), menciona Distribuição Eléctrica, número de clientes e tempo estimado de restauro
2. send_press_release: comunicado formal para media de Lisboa (Público, Expresso, RTP, SIC Notícias, TSF, Rádio Renascença). Redige em Português Europeu.
3. send_regulatory: notificação técnica formal para ERSE (regulador energético PT) e ANPC (Proteção Civil) com dados do incidente${hadConflict ? '\nIMPORTANTE: Há conflito de recursos (material limitado). Menciona na notificação regulatória.' : ''}${criticalAtRisk.length > 0 ? `\nALERTA: ${criticalAtRisk.length} local(ais) crítico(s) com bateria abaixo do limiar SLA. Especialmente EPAL Loures (afeta abastecimento de água a 800.000 pessoas). Menciona na notificação à ERSE e ANPC.` : ''}
Chama send_sms, send_press_release e send_regulatory (por esta ordem), depois complete_comms.
REGRA DE IDIOMA CRÍTICA: DEVES escrever TODA a saída em Português Europeu. Sê profissional e preciso.`,
    userMessage: `[RESPONDE APENAS EM PORTUGUÊS EUROPEU]

SITUAÇÃO ATUAL DO INCIDENTE — Área Metropolitana de Lisboa — Tempestade Kristin

Falhas totais       : ${state.faults.length}
Restauradas telecom.: ${restoredFaults.length} (${restoredClients.toLocaleString()} clientes reconectados)
Brigadas a caminho  : ${crewEnRouteFaults.length} falhas em atendimento ativo
Clientes afetados   : ${state.totalClients.toLocaleString()} total
Locais críticos     : ${criticalFaults.length} (${criticalFaults.map(f => `${f.criticalSite} bateria:${f.batteryMinutes ?? 'N/A'}min`).join(', ') || 'nenhum'})
${criticalAtRisk.length > 0 ? `⚠️ LOCAIS COM BATERIA CRÍTICA (<${params.minuteSLA}min): ${criticalAtRisk.map(f => f.criticalSite).join(', ')}` : '✓ Todos os locais críticos dentro da margem de bateria'}
${hadConflict ? '⚠️ CONFLITO DE RECURSOS: transformadores insuficientes — protocolo de priorização ativado' : '✓ Sem conflitos de recursos'}

SLA objetivo: ${params.minuteSLA}min | Janela tempestade 2: ${params.storm2Window}

Redige e envia as 3 comunicações com send_sms, send_press_release, send_regulatory, depois complete_comms.${params.instructions?.trim() ? `\n\nINSTRUÇÕES DO OPERADOR (reflete no tom e conteúdo das comunicações):\n${params.instructions.trim()}` : ''}`,
    tools,
    emit,
    agentId: 'comms',
    maxTokens: 8192,
    haiku: true,
    instructions: params.instructions,
  });

  return {
    agentId: 'comms',
    summary,
    restoredFaults: [],
    dispatches: [],
    commsMessages,
  };
}
