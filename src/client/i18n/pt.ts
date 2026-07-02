export interface Translations {
  themes: { dark: string; joule: string; edp: string };
  nav: { openSimulator: string; back: string };
  hero: { badge: string; subtitle: string; location: string; cta: string; scroll: string };
  stats: { clients: string; clientsSub: string; faults: string; faultsSub: string; crews: string; crewsSub: string; critical: string; criticalSub: string };
  challenge: { eyebrow: string; title: string; titleHighlight: string; body: string; card1: string; card1Sub: string; card2: string; card2Sub: string; card3: string; card3Sub: string; card4: string; card4Sub: string; drolius: string; droluisSub: string };
  arch: { eyebrow: string; title: string; subtitle: string; supervisor: string; sapSystem: string; phase1: string; phase2: string; agents: { techLabel: string; techDesc: string; scadaLabel: string; scadaDesc: string; dispLabel: string; dispDesc: string; resLabel: string; resDesc: string; commsLabel: string; commsDesc: string } };
  cta: { eyebrow: string; title: string; body: string; button: string; footer: string };
  app: { title: string; standby: string; running: string; done: string; report: string; window: string };
  params: {
    header: string; incident: string; moreInfo: string; incidentBody: string;
    droluisAvailable: string; droluisRunning: string;
    sla: string; slaTip: string; switchable: string; switchableTip: string;
    limitedParts: string; limitedPartsTip: string; limitedPartsOn: string;
    crews: string; crewsTip: string; storm2: string; noStorm: string;
    operatorInstructions: string; operatorPlaceholder: string; operatorHint: string;
    simulate: string; simulating: string; kpis: string;
    slaKpi: string; slaSub: string; safety: string; safetySub: string;
    efficiency: string; efficiencySub: string; tiepi: string; tiepiSub: string; mttr: string; mttrSub: string;
    infoTitle: string; infoSummary: string; infoFaults: string; infoFaultsLabel: string;
    infoCritical: string; infoCriticalLabel: string; infoFaultTypes: string; infoResources: string;
    infoChallenges: string; infoClose: string; infoCrewBases: string; infoInventory: string; infoDrolius: string;
  };
  map: { header: string; fault: string; switching: string; restored: string; crewEnRoute: string; repairing: string; repaired: string; typeSwitchable: string; typeTransformer: string; typeCable: string; tooltipType: string; tooltipClients: string; tooltipBattery: string; droluisScout: string; droluisAssigned: string; legendFault: string; legendActive: string; legendOk: string };
  log: { header: string; live: string; placeholder: string; supervisor: string; phase1: string; phase2: string; pending: string; agentOrchestrator: string; agentTriage: string; agentRerouting: string; agentDispatch: string; agentResource: string; agentComms: string };
  gantt: { header: string; phase1: string; phase2: string; running: string; done: string; pending: string; conflicts: string; agents: { orchestratorLabel: string; orchestratorSub: string; orchestratorTip: string; triageLabel: string; triageSub: string; triageTip: string; reroutingLabel: string; reroutingSub: string; reroutingTip: string; dispatchLabel: string; dispatchSub: string; dispatchTip: string; resourceLabel: string; resourceSub: string; resourceTip: string; commsLabel: string; commsSub: string; commsTip: string } };
  panels: { sapHeader: string; commsHeader: string; sapPlaceholder: string; commsPlaceholder: string; sms: string; press: string; regulatory: string };
  results: {
    title: string; completed: string; mission: string; download: string; close: string; duration: string;
    kpiSla: string; kpiSafety: string; kpiEfficiency: string;
    tiepi: string; tiepiLong: string; mttr: string; mttrLong: string;
    clientsServed: string; faultsHandled: string; criticalCovered: string; pendingActions: string;
    sapIntegration: string; sapSystems: string; sapWorkOrders: string; sapSwitches: string;
    sapMaterials: string; sapReplenish: string; sapMessages: string; sapAssets: string; sapDrolius: string;
    analysisTitle: string; analysisEmpty: string;
    pendingTitle: string; pendingUnresolved: string; pendingUnresolvedPlural: string;
    mitigationLabel: string; mitigationCritical: string; mitigationTransformer: string; mitigationCable: string; mitigationSwitchable: string;
    urgencyCritical: string; urgencyModerate: string; urgencyLow: string;
    gradOptimal: string; gradAcceptable: string; gradCritical: string;
    pdfTitle: string; pdfKpis: string; pdfOperational: string; pdfSap: string; pdfAnalysis: string; pdfPending: string; pdfGenerated: string;
  };
  modal: {
    title: string; subtitle: string;
    summaryTitle: string; summaryClients: string; summaryFaults: string; summaryCritical: string; summaryBody: string;
    criticalTitle: string; criticalSubtitle: string; faultTypesTitle: string;
    faultSwitchable: string; faultSwitchableDesc: string; faultTransformer: string; faultTransformerDesc: string; faultCable: string; faultCableDesc: string; faultParamNote: string;
    resourcesTitle: string; crewBases: string; totalMax: string; inventory: string;
    matTransformers: string; matCables: string; matGenerator: string; matTransNote: string; matCableNote: string; matGenNote: string; limitedPartsWarning: string;
    droliusTitle: string; droliusBody: string; tensionsTitle: string;
    tension1Label: string; tension1Desc: string; tension2Label: string; tension2Desc: string; tension3Label: string; tension3Desc: string; tension4Label: string; tension4Desc: string;
    urgencyCritical: string; urgencyHigh: string; urgencyMedium: string; urgencyLow: string;
    siteDataCenter: string; siteHealth: string; siteWater: string; siteEmergency: string; siteHospital: string;
  };
}

export const pt: Translations = {
  themes: { dark: 'Escuro', joule: 'Roxo', edp: 'Verde' },
  nav: { openSimulator: 'Abrir Simulador →', back: 'Início' },
  hero: {
    badge: 'SAP AI CORE × SAP JOULE MULTI-AGENT',
    subtitle: 'Sistema multi-agente de inteligência artificial para a gestão de incidentes elétricos em tempo real. Orquestração autónoma, decisões fundamentadas e integrações SAP em direto.',
    location: 'DISTRIBUIÇÃO ELETRICIDADE · ÁREA METROPOLITANA DE LISBOA · TEMPESTADE KRISTIN',
    cta: 'Abrir Simulador →',
    scroll: 'SCROLL',
  },
  stats: {
    clients: 'Clientes afetados', clientsSub: 'Área Metropolitana de Lisboa',
    faults: 'Falhas ativas', faultsSub: 'Transformadores · Cabos · Comutáveis',
    crews: 'Brigadas', crewsSub: 'Em 6 bases operacionais',
    critical: 'Locais críticos', criticalSub: 'Hospitais · EPAL · Diálise · CPD',
  },
  challenge: {
    eyebrow: 'O DESAFIO OPERACIONAL',
    title: '47 falhas simultâneas.', titleHighlight: 'Decisões em minutos.',
    body: 'A Tempestade Kristin, com rajadas de 120 km/h, atinge a Área Metropolitana de Lisboa. Eucaliptos caem sobre linhas MT em Sintra e na Arrábida. A estação de bombagem EPAL de Loures — que abastece 800.000 pessoas — está com 30 minutos de bateria. As brigadas da margem sul enfrentam congestionamento na Ponte 25 de Abril. 143.000 clientes sem fornecimento. Cada minuto conta.',
    card1: 'Locais críticos', card1Sub: 'Hospitais, diálise, EPAL e CPD — bateria limitada, prioridade máxima',
    card2: 'Falhas de transformador', card2Sub: '7 ativas — brigada especializada · 90–180 min reparação',
    card3: 'Falhas de cabo MT', card3Sub: '18 ativas — eucaliptos sobre linhas · 60–120 min',
    card4: 'Rede comutável', card4Sub: '22 ativas — rede subterrânea Lisboa · telecomando imediato',
    drolius: 'Drolius — Robô de Inspeção',
    droluisSub: 'ANYbotics implantado no campo. O agente Service Dispatcher pode enviá-lo a zonas de difícil acesso em Sintra ou à Arrábida para confirmar nível de bateria UPS, avaliar acessibilidade e documentar danos antes de arriscar uma brigada.',
  },
  arch: {
    eyebrow: 'ARQUITETURA MULTI-AGENTE',
    title: 'Orquestração autónoma com SAP',
    subtitle: 'Um orquestrador SAP AI Core coordena 5 agentes especializados que raciocinam e atuam com ferramentas reais',
    supervisor: 'SUPERVISOR',
    sapSystem: 'SAP AI Core Orchestration',
    phase1: 'FASE 1 — PARALELO',
    phase2: 'FASE 2 — SEQUENCIAL',
    agents: {
      techLabel: 'TECHNICIAN BRIEFING AGENT', techDesc: 'Classifica 47 falhas por severidade e ordena as físicas por urgência para o despacho',
      scadaLabel: 'REMOTE RESTORATION SCADA AGENT', scadaDesc: 'Executa comutações remotas de telecomando até ao limite autorizado',
      dispLabel: 'SERVICE DISPATCHER AGENT', dispDesc: 'Atribui brigadas respeitando competências, janela de tempestade e acessibilidade de zonas',
      resLabel: 'RESOURCE CAPACITY SHORTAGE AGENT', resDesc: 'Gere inventário e regista conflitos de material',
      commsLabel: 'COMMUNICATIONS INSIGHT AGENT', commsDesc: 'Redige SMS, comunicados de imprensa e notificações à ERSE e ANPC',
    },
  },
  cta: {
    eyebrow: 'PRONTO PARA SIMULAR',
    title: 'Iniciar o incidente',
    body: 'Configure os parâmetros operacionais e observe como os agentes raciocinam, decidem e atuam em tempo real.',
    button: 'Abrir Simulador →',
    footer: 'SAP BTP Cloud Foundry · SAP AI Core · SAP Joule',
  },
  app: {
    title: 'Gestão de Resposta a Tempestades',
    standby: 'Standby', running: 'Em execução', done: '✓ Concluído',
    report: 'Ver Relatório', window: 'JANELA',
  },
  params: {
    header: 'PARÂMETROS',
    incident: 'INCIDENTE ATIVO', moreInfo: 'mais info',
    incidentBody: 'Tempestade Kristin — AML. 143K clientes sem fornecimento, 7 locais críticos com bateria limitada. Configure os parâmetros e execute a simulação multi-agente.',
    droluisAvailable: 'Robô de inspeção em standby',
    droluisRunning: 'Inspeção em curso…',
    sla: 'SLA Objetivo', slaTip: 'Tempo máximo comprometido para restaurar o fornecimento. Afeta a priorização de locais críticos e a urgência do despacho.',
    switchable: 'Comutáveis', switchableTip: 'Falhas na rede subterrânea de Lisboa restauráveis por telecomando remoto sem enviar brigadas. Limite de operações autorizadas para o dia.',
    limitedParts: 'Peças limitadas', limitedPartsTip: 'OFF: 2 transformadores em armazém (inventário completo). ON: apenas 1 transformador disponível — força conflitos de material.',
    limitedPartsOn: 'Apenas 1 transformador disponível',
    crews: 'Brigadas', crewsTip: 'Equipas de campo disponíveis para o dia. Subconjunto das 22 brigadas base (Lisboa, Sintra, Cascais, Loures, Almada, Setúbal).',
    storm2: 'Janela tempestade 2', noStorm: 'Sem tempestade',
    operatorInstructions: 'INSTRUÇÕES AO ORQUESTRADOR',
    operatorPlaceholder: 'Ex: Priorizar a EPAL Loures acima de qualquer outro incidente. Não despachar brigadas para zonas inundadas.',
    operatorHint: 'Injetado como contexto prioritário no prompt do orquestrador.',
    simulate: '▶ Simular', simulating: 'Simulando…',
    kpis: 'KPIS',
    slaKpi: 'SLA', slaSub: 'clientes cobertos',
    safety: 'Segurança', safetySub: 'locais críticos',
    efficiency: 'Eficiência', efficiencySub: 'falhas geridas',
    tiepi: 'TIEPI', tiepiSub: 'interrupção média',
    mttr: 'MTTR', mttrSub: 'tempo médio reposição',
    infoTitle: 'Resumo do incidente',
    infoSummary: 'Resumo do incidente', infoFaults: 'falhas ativas', infoFaultsLabel: 'INCIDENTE ATIVO',
    infoCritical: 'locais críticos', infoCriticalLabel: 'Locais críticos com UPS / bateria',
    infoFaultTypes: 'Tipos de falha', infoResources: 'Recursos disponíveis',
    infoChallenges: 'Tensões do cenário', infoClose: '×',
    infoCrewBases: 'BRIGADAS — 6 bases', infoInventory: 'MATERIAL EM ARMAZÉM', infoDrolius: 'DROLIUS — 1 UNIDADE',
  },
  map: {
    header: 'REDE ELÉTRICA — AML LISBOA',
    fault: 'Avaria', switching: 'Comutando…', restored: 'Restaurado',
    crewEnRoute: 'Brigada a caminho', repairing: 'A reparar', repaired: 'Reparado',
    typeSwitchable: 'Comutável', typeTransformer: 'Transformador', typeCable: 'Cabo',
    tooltipType: 'Tipo:', tooltipClients: 'Clientes:', tooltipBattery: 'bateria:',
    droluisScout: 'Drolius Scout', droluisAssigned: 'Atribuído no campo',
    legendFault: 'Avaria', legendActive: 'Ativo', legendOk: 'OK',
  },
  log: {
    header: 'LOG DE AGENTES', live: 'LIVE',
    placeholder: 'Prima SIMULAR para ver o raciocínio dos agentes…',
    supervisor: 'SUPERVISOR', phase1: 'PREPARATION PHASE (PARALLEL)', phase2: 'EXECUTION PHASE',
    pending: '— pending —',
    agentOrchestrator: 'Asset and Services Assistant',
    agentTriage: 'Technician Briefing Agent',
    agentRerouting: 'Remote Restoration Scada Agent',
    agentDispatch: 'Service Dispatcher Agent',
    agentResource: 'Resource Capacity Shortage Agent',
    agentComms: 'Communications Insight Agent',
  },
  gantt: {
    header: 'AGENT ORCHESTRATION FLOW',
    phase1: 'PREPARATION · PARALLEL', phase2: 'EXECUTION · SEQUENTIAL',
    running: 'Running', done: 'Done ✓', pending: 'Pending',
    conflicts: 'Conflitos',
    agents: {
      orchestratorLabel: 'Asset & Services', orchestratorSub: 'SAP AI Core',
      orchestratorTip: 'Coordena todos os agentes. Executa a Fase 1 em paralelo e a Fase 2 em sequencial, e calcula os KPIs finais.',
      triageLabel: 'Technician', triageSub: 'S/4HANA Assets',
      triageTip: 'Classifica as 47 falhas por severidade e identifica locais críticos com bateria em risco. Ordena as falhas físicas por urgência.',
      reroutingLabel: 'Remote SCADA', reroutingSub: 'Asset Intelligence',
      reroutingTip: 'Restaura fornecimento por telecomando remoto até ao limite de operações autorizadas.',
      dispatchLabel: 'Dispatcher', dispatchSub: 'Field Service Mgmt',
      dispatchTip: 'Atribui brigadas a falhas físicas respeitando competências, janela de tempestade e acessibilidade.',
      resourceLabel: 'Resources', resourceSub: 'IBP',
      resourceTip: 'Verifica inventário para brigadas despachadas. Regista conflitos se houver défice.',
      commsLabel: 'Comms', commsSub: 'SAP CX',
      commsTip: 'Redige SMS, comunicado de imprensa e notificações à ERSE e ANPC.',
    },
  },
  panels: {
    sapHeader: 'AÇÕES SAP', commsHeader: 'COMUNICAÇÕES',
    sapPlaceholder: 'As ações de integração aparecerão aqui',
    commsPlaceholder: 'As comunicações aparecerão aqui durante a simulação',
    sms: 'SMS', press: 'IMPRENSA', regulatory: 'REGULATÓRIO',
  },
  results: {
    title: 'RESUMO EXECUTIVO', completed: 'Ciclo concluído', mission: '✓ MISSÃO CONCLUÍDA',
    download: 'Descarregar PDF', close: 'Fechar e voltar ao simulador',
    duration: 'DURAÇÃO DO CICLO',
    kpiSla: 'SLA', kpiSafety: 'SEGURANÇA', kpiEfficiency: 'EFICIÊNCIA OPERACIONAL',
    tiepi: 'TIEPI', tiepiLong: 'Tempo de Interrupção Equiv. Potência Instalada',
    mttr: 'MTTR', mttrLong: 'Mean Time To Repair — Tempo médio de reposição',
    clientsServed: 'Clientes atendidos', faultsHandled: 'Falhas atendidas',
    criticalCovered: 'Locais críticos cobertos', pendingActions: 'Ações pendentes',
    sapIntegration: 'INTEGRAÇÃO SAP',
    sapSystems: 'Sistemas SAP integrados',
    sapWorkOrders: 'Ordens de trabalho criadas',
    sapSwitches: 'Comutações registadas em AIN',
    sapMaterials: 'Materiais reservados',
    sapReplenish: 'reposição solicitada',
    sapMessages: 'Mensagens enviadas via SAP CX',
    sapAssets: 'Ativos analisados em S/4HANA',
    sapDrolius: 'Missões de inspeção executadas',
    analysisTitle: 'ANÁLISE ASSET AND SERVICES ASSISTANT',
    analysisEmpty: 'Resumo do orquestrador não disponível.',
    pendingTitle: 'AÇÕES PENDENTES',
    pendingUnresolved: 'falha por resolver',
    pendingUnresolvedPlural: 'falhas por resolver',
    mitigationLabel: 'Mitigação',
    mitigationCritical: 'Reatribuir brigada com prioridade máxima. Considerar gerador móvel como medida imediata.',
    mitigationTransformer: 'Atribuir brigada com Skill A. Se inventário esgotado, ativar protocolo de reposição urgente em SAP IBP.',
    mitigationCable: 'Atribuir brigada com Skill B. Avaliar reencaminhamento manual da rede se houver alimentação alternativa disponível.',
    mitigationSwitchable: 'Avaliar possibilidade de comutação manual ou ampliar limite de operações de telecomando.',
    urgencyCritical: 'CRÍTICO', urgencyModerate: 'MODERADO', urgencyLow: 'BAIXO',
    gradOptimal: 'ÓTIMO', gradAcceptable: 'ACEITÁVEL', gradCritical: 'CRÍTICO',
    pdfTitle: 'Resumo Executivo', pdfKpis: 'KPIs DE MISSÃO',
    pdfOperational: 'INDICADORES OPERACIONAIS', pdfSap: 'INTEGRAÇÃO SAP',
    pdfAnalysis: 'ANÁLISE ASSET AND SERVICES ASSISTANT',
    pdfPending: 'AÇÕES PENDENTES', pdfGenerated: 'Gerado em',
  },
  modal: {
    title: 'INCIDENTE ATIVO',
    subtitle: '— Tempestade Kristin · Área Metropolitana de Lisboa',
    summaryTitle: 'Resumo do incidente',
    summaryClients: 'clientes sem fornecimento',
    summaryFaults: 'falhas ativas',
    summaryCritical: 'locais críticos',
    summaryBody: 'A Tempestade Kristin atingiu simultaneamente múltiplas zonas da AML com rajadas de 120 km/h. Eucaliptos caem sobre linhas MT em Sintra e na Arrábida. A estação de bombagem EPAL de Loures — que abastece 800.000 pessoas — tem apenas 30 min de bateria. As brigadas da margem sul enfrentam atrasos pela Ponte 25 de Abril.',
    criticalTitle: 'Locais críticos com UPS / bateria',
    criticalSubtitle: 'Infraestruturas com fornecimento de emergência que se esgotará se a rede não for restaurada a tempo.',
    faultTypesTitle: 'Tipos de falha',
    faultSwitchable: 'Comutáveis', faultSwitchableDesc: 'Rede subterrânea Lisboa — restauração por telecomando, sem brigada física',
    faultTransformer: 'Transformadores', faultTransformerDesc: 'Eucaliptos sobre subestações MT em Sintra e Arrábida — substituição física',
    faultCable: 'Cabos', faultCableDesc: 'Eucaliptos sobre linhas MT aéreas — reparação física de linha no campo',
    faultParamNote: 'O parâmetro Comutáveis controla quantas falhas SW o agente Remote Restoration pode restaurar por telecomando. As que excedam o limite são degradadas a falha de cabo e requerem brigada. Os parâmetros Brigadas e Peças limitadas afetam diretamente quantas falhas físicas podem ser atendidas.',
    resourcesTitle: 'Recursos disponíveis',
    crewBases: 'BRIGADAS — 6 bases', totalMax: 'Total máximo',
    inventory: 'MATERIAL EM ARMAZÉM',
    matTransformers: 'Transformadores', matCables: 'Bobinas de cabo', matGenerator: 'Gerador móvel',
    matTransNote: '→ 1 ud se peças limitadas', matCableNote: 'suficiente para todas as falhas', matGenNote: 'medida temporária',
    limitedPartsWarning: 'Com peças limitadas ON, apenas 1 transformador para 7 falhas. O agente Resource deteta a escassez e força um conflito de priorização.',
    droliusTitle: 'DROLIUS — 1 UNIDADE',
    droliusBody: 'Robô Scout de inspeção autónoma. O agente Service Dispatcher pode implantá-lo em zonas de Sintra ou Arrábida com acesso difícil antes de enviar brigadas.',
    tensionsTitle: 'Tensões do cenário',
    tension1Label: 'EPAL Loures — 30 min de bateria', tension1Desc: 'Se o SLA objetivo superar 30 min, a estação de bombagem TRF-002 quase certamente não cumprirá. Afeta o abastecimento de 800.000 pessoas. O agente Triage deve atribuir-lhe rank 1.',
    tension2Label: 'Escassez de transformadores', tension2Desc: 'Com peças limitadas, o agente Resource entra em conflito garantido: 1 transformador para 7 falhas críticas em Sintra e Arrábida.',
    tension3Label: 'Janela tempestade T+4h', tension3Desc: 'O agente Service Dispatcher não pode atribuir reparações com ETA > 210 min. Zonas de Sintra com eucaliptos caídos na EN9 podem ficar sem brigada.',
    tension4Label: 'Margem Sul isolada', tension4Desc: 'Com < 12 brigadas, congestionamento na Ponte 25 de Abril atrasa brigadas de Almada. O dispatcher deve decidir cobertura cruzada Lisboa → Almada.',
    urgencyCritical: 'crítica', urgencyHigh: 'alta', urgencyMedium: 'média', urgencyLow: 'baixa',
    siteDataCenter: 'Centro de dados', siteHealth: 'Saúde', siteWater: 'Água / saneamento',
    siteEmergency: 'Emergências', siteHospital: 'Hospital',
  },
};
