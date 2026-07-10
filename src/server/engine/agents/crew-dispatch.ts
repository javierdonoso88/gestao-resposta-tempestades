import { SimParams, ScenarioState, AgentResult, SimEvent, Fault } from '../types';
import { runAgent, ToolDef } from '../agentRunner';

export async function runCrewDispatch(
  params: SimParams,
  state: ScenarioState,
  emit: (e: SimEvent) => void
): Promise<AgentResult> {
  let summary = 'Despacho de brigadas concluído.';
  const dispatches: { crewId: string; faultId: string }[] = [];

  const availableCrews = state.crews.filter(c => c.status === 'available');
  const physicalFaults = state.faults.filter(f =>
    (f.type === 'transformer' || f.type === 'cable') && f.status === 'fault'
  );

  const crewList = availableCrews.map(c =>
    `${c.id} | base:${c.base} | skills:${c.skills.join(',')}`
  ).join('\n');

  const faultList = physicalFaults.map(f =>
    `${f.id} | tipo:${f.type} | zona:${f.zone} | clientes:${f.affectedClients}` +
    (f.criticalSite ? ` | CRÍTICO:${f.criticalSite} (${f.criticalSiteType}) bateria:${f.batteryMinutes ?? 'N/A'}min` : '')
  ).join('\n');

  const safetyLimitMin = params.storm2Window === 'T+4h' ? 240
    : params.storm2Window === 'T+6h' ? 360
    : params.storm2Window === 'T+8h' ? 480
    : 9999;

  const tools: ToolDef[] = [
    {
      name: 'dispatch_crew',
      description: 'Despacha uma brigada para uma falha física para reparação.',
      input_schema: {
        type: 'object' as const,
        properties: {
          crewId: { type: 'string', description: 'ID da brigada (ex: LIS-01)' },
          faultId: { type: 'string', description: 'ID da falha física (ex: TRF-001)' },
          eta: { type: 'number', description: 'ETA estimado em minutos' },
          reason: { type: 'string', description: 'Justificação do despacho' },
        },
        required: ['crewId', 'faultId', 'eta', 'reason'],
      },
      handler: async (input) => {
        const crew = state.crews.find(c => c.id === input.crewId);
        const fault = state.faults.find(f => f.id === input.faultId);
        if (!crew) return `Erro: brigada ${input.crewId} não encontrada`;
        if (!fault) return `Erro: falha ${input.faultId} não encontrada`;
        if (crew.status !== 'available') return `Erro: brigada ${input.crewId} não disponível (estado: ${crew.status})`;
        if (fault.status !== 'fault') return `Erro: falha ${input.faultId} já em processo (estado: ${fault.status})`;
        crew.status = 'busy';
        crew.currentTask = input.faultId as string;
        fault.status = 'crew-en-route';
        dispatches.push({ crewId: crew.id, faultId: fault.id });
        emit({ type: 'asset_update', id: fault.id, status: 'crew-en-route' });
        emit({ type: 'action', agent: 'crew-dispatch', system: 'SAP Field Service Management', msg: `Ordem de trabalho criada: ${crew.id} → ${fault.id} (${fault.zone}) — ETA ${input.eta} min` });
        return `OK: ${crew.id} despachado para ${fault.id} — ETA ${input.eta}min. ${fault.affectedClients.toLocaleString()} clientes afetados.`;
      },
    },
    {
      name: 'dispatch_drolius',
      description: 'Implanta o Drolius (robô de inspeção) numa zona de falha para obter dados em tempo real: estado da bateria UPS, acessibilidade da zona e avaliação de danos. Especialmente útil antes de enviar brigada a zonas perigosas ou com bateria crítica. Só disponível se o Drolius não estiver já implantado.',
      input_schema: {
        type: 'object' as const,
        properties: {
          faultId: { type: 'string', description: 'ID da falha a inspecionar' },
          mission: {
            type: 'string',
            enum: ['battery_check', 'zone_access', 'damage_assessment'],
            description: 'Tipo de missão: battery_check = confirmar bateria UPS restante; zone_access = avaliar acessibilidade para brigada; damage_assessment = avaliar danos físicos no ativo',
          },
        },
        required: ['faultId', 'mission'],
      },
      handler: async (input) => {
        if (state.drolius.status !== 'available') {
          return `Erro: Drolius não disponível — atualmente implantado no campo em ${state.drolius.currentTask}`;
        }
        const fault = state.faults.find(f => f.id === input.faultId);
        if (!fault) return `Erro: falha ${input.faultId} não encontrada`;

        state.drolius.status = 'deployed';
        state.drolius.currentTask = input.faultId as string;

        emit({ type: 'drolius_update', status: 'deployed', task: input.faultId as string });
        emit({ type: 'action', agent: 'crew-dispatch', system: 'Drolius · ANYbotics', msg: `Drolius implantado → ${fault.zone} (${input.faultId}) — missão: ${input.mission}` });

        const report = buildDroliusReport(fault, input.mission as string);

        emit({ type: 'action', agent: 'crew-dispatch', system: 'Drolius · ANYbotics', msg: `Drolius transmite relatório: ${report.slice(0, 100)}…` });

        return report;
      },
    },
    {
      name: 'skip_fault',
      description: 'Marca uma falha como não atribuível neste ciclo (sem brigada disponível ou janela insuficiente).',
      input_schema: {
        type: 'object' as const,
        properties: {
          faultId: { type: 'string', description: 'ID da falha a omitir' },
          reason: { type: 'string', description: 'Motivo pelo qual não pode ser atribuída' },
        },
        required: ['faultId', 'reason'],
      },
      handler: async (input) => {
        return `OK: ${input.faultId} registada sem atribuição — ${input.reason}`;
      },
    },
    {
      name: 'complete_dispatch',
      description: 'Finaliza o despacho de brigadas com resumo executivo.',
      input_schema: {
        type: 'object' as const,
        properties: {
          summary: { type: 'string', description: 'Resumo do despacho de brigadas' },
        },
        required: ['summary'],
      },
      handler: async (input) => {
        summary = input.summary as string;
        return 'Despacho finalizado.';
      },
    },
  ];

  await runAgent({
    systemPrompt: `És o agente Service Dispatcher Agent do sistema de Gestão de Resposta a Tempestades da Distribuição Eléctrica (AML Lisboa).
A tua missão: atribuir brigadas disponíveis a falhas físicas (transformadores e cabos).
Regras:
- Skill A = reparação de transformadores | Skill B = reparação de cabos
- Prioridade: locais críticos primeiro, ordenados por bateria restante (menor = mais urgente). EPAL Loures é prioridade absoluta.
- Depois: residenciais por clientes afetados (maior primeiro)
- Janela de tempestade: ${params.storm2Window}. Limite segurança: ${safetyLimitMin}min. Se T+4h, evita transformadores com ETA > 210min.
- IMPORTANTE: Brigadas de Almada e Setúbal (margem sul) têm +20 min de ETA base pela Ponte 25 de Abril. Considera nas tuas ETAs.
- Zonas de Sintra (Sintra Vila, Colares, São Marcos) podem ter acesso dificultado por eucaliptos na EN9/EN247 — usa Drolius antes de enviar brigada.
- Se não há brigada com o skill necessário disponível, usa skip_fault.
- DROLIUS: tens disponível o robô de inspeção Drolius. Usa-o em locais críticos com bateria muito baixa ou em zonas de Sintra/Arrábida com acesso difícil ANTES de enviar brigada. Uma só missão de cada vez.
Chama dispatch_crew para cada atribuição possível, skip_fault para inatribuíveis, depois complete_dispatch.
REGRA DE IDIOMA CRÍTICA: DEVES escrever TODA a saída em Português Europeu. Sê operacional e preciso.`,
    userMessage: `[RESPONDE APENAS EM PORTUGUÊS EUROPEU]

BRIGADAS DISPONÍVEIS (${availableCrews.length} total):
${crewList || 'Nenhuma brigada disponível'}

FALHAS FÍSICAS PENDENTES (${physicalFaults.length} total):
${faultList || 'Nenhuma falha física pendente'}

SLA: ${params.minuteSLA}min | Janela tempestade 2: ${params.storm2Window}
Tempo de reparação estimado: transformador 90-180min, cabo 60-120min

Atribui brigadas com dispatch_crew, omite inatribuíveis com skip_fault, depois complete_dispatch.
DROLIUS disponível: ${state.drolius.status === 'available' ? 'SIM — podes implantá-lo com dispatch_drolius para inspeção prévia' : 'NÃO (ocupado)'}.${params.instructions?.trim() ? `\n\nINSTRUÇÕES DO OPERADOR (prioridade máxima — ajusta atribuições em conformidade):\n${params.instructions.trim()}` : ''}`,
    tools,
    emit,
    agentId: 'crew-dispatch',
    maxTokens: 8192,
    haiku: true,
    instructions: params.instructions,
  });

  return {
    agentId: 'crew-dispatch',
    summary,
    restoredFaults: [],
    dispatches,
    commsMessages: [],
  };
}

function buildDroliusReport(fault: Fault, mission: string): string {
  const zone = fault.zone;
  const id = fault.id;

  const ACCESS_CONDITIONS = fault.batteryMinutes !== undefined && fault.batteryMinutes <= 60
    ? 'zona parcialmente inundada — água 15-20 cm no acesso principal. Requer calçado de proteção e EPI nível 2.'
    : 'zona acessível — sem obstáculos significativos. Condições: pavimento molhado, visibilidade reduzida pela chuva.';

  if (mission === 'battery_check' && fault.criticalSite) {
    const remaining = fault.batteryMinutes ?? 0;
    const tempC = 68 + (remaining % 30);
    return `[DROLIUS RELATÓRIO — ${id} · ${fault.criticalSite}] ` +
      `Bateria UPS confirmada: ${remaining} min restantes (leitura direta do BMS). ` +
      `Temperatura do transformador: ${tempC}°C — dentro da margem operacional. ` +
      `Estado bypass: ativo. Carga atual: ${55 + (remaining % 40)}% da capacidade nominal. ` +
      `Recomendação: prioridade ${remaining <= 60 ? 'CRÍTICA — brigada imediata' : 'alta — brigada em < 90 min'}.`;
  }

  if (mission === 'zone_access') {
    return `[DROLIUS RELATÓRIO ACESSO — ${id} · ${zone}] ` +
      `${ACCESS_CONDITIONS} ` +
      `Rota alternativa disponível por via secundária (+12 min de ETA). ` +
      `Obstáculos detetados: ${fault.type === 'transformer' ? 'eucalipto caído a 30 m do ativo — motosserra necessária' : 'queda de sinalização — removível manualmente'}. ` +
      `Estimativa ETA brigada ajustada: ${fault.type === 'transformer' ? '+20 min sobre ETA nominal' : '+8 min sobre ETA nominal'}.`;
  }

  // damage_assessment
  const damageDesc = fault.type === 'transformer'
    ? 'Impacto de raio confirmado no enrolamento primário. Isolante exterior com queimaduras visíveis. Requer substituição completa do equipamento. Confirmado: Skill A obrigatório.'
    : `Rotura de condutor em ${Math.floor(Math.random() * 3) + 1} ponto(s). Comprimento afetado estimado: ${20 + (fault.affectedClients % 50)} m. Requer ${Math.ceil(fault.affectedClients / 1500)} bobina(s) de cabo.`;

  return `[DROLIUS RELATÓRIO DANOS — ${id} · ${zone}] ${damageDesc} ` +
    `Nível de segurança da zona: ${fault.batteryMinutes !== undefined && fault.batteryMinutes <= 60 ? 'ALTO RISCO — presença de alta tensão próxima' : 'MÉDIO — proceder com EPI padrão'}. ` +
    `ETA reparação estimada: ${fault.type === 'transformer' ? '120-180 min' : '60-100 min'}.`;
}
