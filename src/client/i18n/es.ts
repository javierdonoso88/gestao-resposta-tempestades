export interface Translations {
  lang: Record<string, never>;
  themes: {
    dark: string;
    joule: string;
    edp: string;
  };
  nav: {
    openSimulator: string;
    back: string;
  };
  hero: {
    badge: string;
    subtitle: string;
    location: string;
    cta: string;
    scroll: string;
  };
  stats: {
    clients: string; clientsSub: string;
    faults: string;  faultsSub: string;
    crews: string;   crewsSub: string;
    critical: string; criticalSub: string;
  };
  challenge: {
    eyebrow: string;
    title: string; titleHighlight: string;
    body: string;
    card1: string; card1Sub: string;
    card2: string; card2Sub: string;
    card3: string; card3Sub: string;
    card4: string; card4Sub: string;
    drolius: string; droluisSub: string;
  };
  arch: {
    eyebrow: string;
    title: string;
    subtitle: string;
    supervisor: string;
    sapSystem: string;
    phase1: string;
    phase2: string;
    agents: {
      techLabel: string; techDesc: string;
      scadaLabel: string; scadaDesc: string;
      dispLabel: string; dispDesc: string;
      resLabel: string; resDesc: string;
      commsLabel: string; commsDesc: string;
    };
  };
  cta: {
    eyebrow: string;
    title: string;
    body: string;
    button: string;
    footer: string;
  };
  app: {
    title: string;
    standby: string;
    running: string;
    done: string;
    report: string;
    window: string;
  };
  params: {
    header: string;
    incident: string;
    moreInfo: string;
    incidentBody: string;
    droluisAvailable: string;
    droluisRunning: string;
    sla: string; slaTip: string;
    switchable: string; switchableTip: string;
    limitedParts: string; limitedPartsTip: string;
    limitedPartsOn: string;
    crews: string; crewsTip: string;
    storm2: string;
    noStorm: string;
    operatorInstructions: string;
    operatorPlaceholder: string;
    operatorHint: string;
    simulate: string;
    simulating: string;
    kpis: string;
    slaKpi: string; slaSub: string;
    safety: string; safetySub: string;
    efficiency: string; efficiencySub: string;
    tiepi: string; tiepiSub: string;
    mttr: string; mttrSub: string;
    infoTitle: string;
    infoSummary: string;
    infoFaults: string; infoFaultsLabel: string;
    infoCritical: string; infoCriticalLabel: string;
    infoFaultTypes: string;
    infoResources: string;
    infoChallenges: string;
    infoClose: string;
    infoCrewBases: string;
    infoInventory: string;
    infoDrolius: string;
  };
  map: {
    header: string;
    fault: string;
    switching: string;
    restored: string;
    crewEnRoute: string;
    repairing: string;
    repaired: string;
    typeSwitchable: string;
    typeTransformer: string;
    typeCable: string;
    tooltipType: string;
    tooltipClients: string;
    tooltipBattery: string;
    droluisScout: string;
    droluisAssigned: string;
    legendFault: string;
    legendActive: string;
    legendOk: string;
  };
  log: {
    header: string;
    live: string;
    placeholder: string;
    supervisor: string;
    phase1: string;
    phase2: string;
    pending: string;
    agentOrchestrator: string;
    agentTriage: string;
    agentRerouting: string;
    agentDispatch: string;
    agentResource: string;
    agentComms: string;
  };
  gantt: {
    header: string;
    phase1: string;
    phase2: string;
    running: string;
    done: string;
    pending: string;
    conflicts: string;
    agents: {
      orchestratorLabel: string; orchestratorSub: string; orchestratorTip: string;
      triageLabel: string; triageSub: string; triageTip: string;
      reroutingLabel: string; reroutingSub: string; reroutingTip: string;
      dispatchLabel: string; dispatchSub: string; dispatchTip: string;
      resourceLabel: string; resourceSub: string; resourceTip: string;
      commsLabel: string; commsSub: string; commsTip: string;
    };
  };
  panels: {
    sapHeader: string;
    commsHeader: string;
    sapPlaceholder: string;
    commsPlaceholder: string;
    sms: string;
    press: string;
    regulatory: string;
  };
  results: {
    title: string; completed: string; mission: string;
    download: string; close: string; duration: string;
    kpiSla: string; kpiSafety: string; kpiEfficiency: string;
    tiepi: string; tiepiLong: string; mttr: string; mttrLong: string;
    clientsServed: string; faultsHandled: string; criticalCovered: string; pendingActions: string;
    sapIntegration: string;
    sapSystems: string; sapWorkOrders: string; sapSwitches: string;
    sapMaterials: string; sapReplenish: string; sapMessages: string;
    sapAssets: string; sapDrolius: string;
    analysisTitle: string; analysisEmpty: string;
    pendingTitle: string;
    urgencyCritical: string; urgencyModerate: string; urgencyLow: string;
    gradOptimal: string; gradAcceptable: string; gradCritical: string;
    pdfTitle: string; pdfKpis: string; pdfOperational: string;
    pdfSap: string; pdfAnalysis: string; pdfPending: string; pdfGenerated: string;
  };
  modal: {
    title: string; subtitle: string;
    summaryTitle: string; summaryClients: string; summaryFaults: string; summaryCritical: string; summaryBody: string;
    criticalTitle: string; criticalSubtitle: string;
    faultTypesTitle: string;
    faultSwitchable: string; faultSwitchableDesc: string;
    faultTransformer: string; faultTransformerDesc: string;
    faultCable: string; faultCableDesc: string;
    faultParamNote: string;
    resourcesTitle: string; crewBases: string; totalMax: string;
    inventory: string;
    matTransformers: string; matCables: string; matGenerator: string;
    matTransNote: string; matCableNote: string; matGenNote: string;
    limitedPartsWarning: string;
    droliusTitle: string; droliusBody: string;
    tensionsTitle: string;
    tension1Label: string; tension1Desc: string;
    tension2Label: string; tension2Desc: string;
    tension3Label: string; tension3Desc: string;
    tension4Label: string; tension4Desc: string;
    urgencyCritical: string; urgencyHigh: string; urgencyMedium: string; urgencyLow: string;
    siteDataCenter: string; siteHealth: string; siteWater: string;
    siteEmergency: string; siteHospital: string;
  };
}

export const es: Translations = {
  lang: {},
  themes: { dark: 'Oscuro', joule: 'SAP Joule', edp: 'EDP' },
  nav: { openSimulator: 'Abrir Simulador →', back: 'Inicio' },
  hero: {
    badge: 'SAP AI CORE × SAP JOULE MULTI-AGENT',
    subtitle: 'Sistema multi-agente de inteligencia artificial para la gestión de incidentes eléctricos en tiempo real. Orquestación autónoma, decisiones razonadas e integraciones SAP en vivo.',
    location: 'DISTRIBUIÇÃO ELÉCTRICA · ÁREA METROPOLITANA DE LISBOA · TEMPESTAD KRISTIN',
    cta: 'Acceder al Simulador →',
    scroll: 'SCROLL',
  },
  stats: {
    clients: 'Clientes afectados', clientsSub: 'Área Metropolitana de Lisboa',
    faults: 'Fallos activos', faultsSub: 'Transformadores · Cables · Conmutables',
    crews: 'Brigadas', crewsSub: 'En 6 bases operativas',
    critical: 'Sitios críticos', criticalSub: 'Hospitales · EPAL · Diálisis · CPD',
  },
  challenge: {
    eyebrow: 'EL RETO OPERATIVO',
    title: '47 fallos simultáneos.', titleHighlight: 'Decisiones en minutos.',
    body: 'La Tempestad Kristin, con rachas de 120 km/h, golpea el Área Metropolitana de Lisboa. Eucaliptos caen sobre líneas MT en Sintra y la Arrábida. La estación de bombeo EPAL de Loures — que abastece a 800.000 personas — tiene 30 minutos de batería. Las brigadas de la margen sur enfrentan congestión en el Puente 25 de Abril. 143.000 clientes sin suministro. Cada minuto cuenta.',
    card1: 'Sitios críticos', card1Sub: 'Hospitales, diálisis, EPAL y CPD — batería limitada, prioridad máxima',
    card2: 'Fallos de transformador', card2Sub: '7 activos — brigada especializada · 90–180 min reparación',
    card3: 'Fallos de cable MT', card3Sub: '18 activos — eucaliptos sobre líneas · 60–120 min',
    card4: 'Red conmutable', card4Sub: '22 activos — red subterránea Lisboa · telecontrol inmediato',
    drolius: 'Drolius — Robot de Inspección',
    droluisSub: 'ANYbotics desplegado en campo. El agente Service Dispatcher puede enviarlo a zonas de difícil acceso en Sintra o la Arrábida para confirmar batería SAI, evaluar accesibilidad y documentar daños antes de arriesgar una brigada.',
  },
  arch: {
    eyebrow: 'ARQUITECTURA MULTI-AGENTE',
    title: 'Orquestación autónoma con SAP',
    subtitle: 'Un orquestador SAP AI Core coordina 5 agentes especializados que razonan y actúan con herramientas reales',
    supervisor: 'SUPERVISOR',
    sapSystem: 'SAP AI Core Orchestration',
    phase1: 'FASE 1 — PARALELO',
    phase2: 'FASE 2 — SECUENCIAL',
    agents: {
      techLabel: 'TECHNICIAN BRIEFING AGENT', techDesc: 'Clasifica 47 fallos por severidad y rankea los físicos por urgencia para el despacho',
      scadaLabel: 'REMOTE RESTORATION SCADA AGENT', scadaDesc: 'Ejecuta conmutaciones remotas de telecontrol hasta el límite autorizado',
      dispLabel: 'SERVICE DISPATCHER AGENT', dispDesc: 'Asigna brigadas respetando skills, ventana de tormenta y accesibilidad de zonas',
      resLabel: 'RESOURCE CAPACITY SHORTAGE AGENT', resDesc: 'Gestiona inventario y registra conflictos de material',
      commsLabel: 'COMMUNICATIONS INSIGHT AGENT', commsDesc: 'Redacta SMS, notas de prensa y notificaciones a ERSE y ANPC',
    },
  },
  cta: {
    eyebrow: 'LISTO PARA SIMULAR',
    title: 'Inicia el incidente',
    body: 'Configura los parámetros operativos y observa cómo los agentes razonan, deciden y actúan en tiempo real.',
    button: 'Acceder al Simulador →',
    footer: 'SAP BTP Cloud Foundry · SAP AI Core · SAP Joule',
  },
  app: {
    title: 'Gestión de Respuesta a Tempestades',
    standby: 'Standby', running: 'En ejecución', done: '✓ Completado',
    report: 'Ver Informe', window: 'VENTANA',
  },
  params: {
    header: 'PARÁMETROS',
    incident: 'INCIDENTE ACTIVO', moreInfo: 'más info',
    incidentBody: 'Tempestad Kristin — AML. 143K clientes sin suministro, 7 sitios críticos con batería limitada. Configura los parámetros y ejecuta la simulación multi-agente.',
    droluisAvailable: 'Robot de inspección en standby',
    droluisRunning: 'Inspección en curso…',
    sla: 'SLA Objetivo', slaTip: 'Tiempo máximo comprometido para restaurar el suministro. Afecta la priorización de sitios críticos y la urgencia del despacho.',
    switchable: 'Conmutables', switchableTip: 'Fallos en la red subterránea de Lisboa restaurables por telecontrol remoto sin enviar brigadas. Límite de operaciones autorizadas para la jornada.',
    limitedParts: 'Piezas limitadas', limitedPartsTip: 'OFF: 2 transformadores en almacén (inventario completo). ON: solo 1 transformador disponible — fuerza conflictos de material.',
    limitedPartsOn: 'Solo 1 transformador disponible',
    crews: 'Brigadas', crewsTip: 'Equipos de campo disponibles para la jornada. Subconjunto de las 22 brigadas base (Lisboa, Sintra, Cascais, Loures, Almada, Setúbal).',
    storm2: 'Ventana tormenta 2', noStorm: 'Sin tormenta',
    operatorInstructions: 'INSTRUCCIONES AL ORQUESTRADOR',
    operatorPlaceholder: 'Ej: Priorizar la EPAL Loures sobre cualquier otra incidencia. No despachar brigadas a zonas inundadas.',
    operatorHint: 'Se inyecta como contexto prioritario en el prompt del orquestrador.',
    simulate: '▶ Simular', simulating: 'Simulando…',
    kpis: 'KPIS',
    slaKpi: 'SLA', slaSub: 'clientes cubiertos',
    safety: 'Seguridad', safetySub: 'sitios críticos',
    efficiency: 'Eficiencia', efficiencySub: 'fallos gestionados',
    tiepi: 'TIEPI', tiepiSub: 'interrupción media',
    mttr: 'MTTR', mttrSub: 'tiempo medio reposición',
    infoTitle: 'Resumen del incidente',
    infoSummary: 'Resumen del incidente', infoFaults: 'fallos activos', infoFaultsLabel: 'INCIDENTE ACTIVO',
    infoCritical: 'sitios críticos', infoCriticalLabel: 'Sitios críticos con SAI / batería',
    infoFaultTypes: 'Tipos de fallo', infoResources: 'Recursos disponibles',
    infoChallenges: 'Tensiones del escenario', infoClose: '×',
    infoCrewBases: 'BRIGADAS — 6 bases', infoInventory: 'MATERIAL EN ALMACÉN', infoDrolius: 'DROLIUS — 1 UNIDAD',
  },
  map: {
    header: 'RED ELÉCTRICA — AML LISBOA',
    fault: 'Avería', switching: 'Conmutando…', restored: 'Restaurado',
    crewEnRoute: 'Brigada en ruta', repairing: 'Reparando', repaired: 'Reparado',
    typeSwitchable: 'Conmutable', typeTransformer: 'Transformador', typeCable: 'Cable',
    tooltipType: 'Tipo:', tooltipClients: 'Clientes:', tooltipBattery: 'batería:',
    droluisScout: 'Drolius Scout', droluisAssigned: 'Asignado en campo',
    legendFault: 'Avería', legendActive: 'Activo', legendOk: 'OK',
  },
  log: {
    header: 'LOG DE AGENTES', live: 'LIVE',
    placeholder: 'Pulsa SIMULAR para ver el razonamiento de los agentes…',
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
    conflicts: 'Conflictos',
    agents: {
      orchestratorLabel: 'Asset & Services', orchestratorSub: 'SAP AI Core',
      orchestratorTip: 'Coordina todos los agentes. Ejecuta la Fase 1 en paralelo y la Fase 2 en secuencial, y calcula los KPIs finales.',
      triageLabel: 'Technician', triageSub: 'S/4HANA Assets',
      triageTip: 'Clasifica los 47 fallos por severidad e identifica sitios críticos con batería en riesgo. Rankea los fallos físicos por urgencia.',
      reroutingLabel: 'Remote SCADA', reroutingSub: 'Asset Intelligence',
      reroutingTip: 'Restaura suministro por telecontrol remoto hasta el límite de operaciones autorizadas.',
      dispatchLabel: 'Dispatcher', dispatchSub: 'Field Service Mgmt',
      dispatchTip: 'Asigna brigadas a fallos físicos respetando skills, ventana de tormenta y accesibilidad.',
      resourceLabel: 'Resources', resourceSub: 'IBP',
      resourceTip: 'Verifica inventario para brigadas despachadas. Registra conflictos si hay déficit.',
      commsLabel: 'Comms', commsSub: 'SAP CX',
      commsTip: 'Redacta SMS, nota de prensa y notificaciones a ERSE y ANPC.',
    },
  },
  panels: {
    sapHeader: 'ACCIONES SAP', commsHeader: 'COMUNICACIONES',
    sapPlaceholder: 'Las acciones de integración aparecerán aquí',
    commsPlaceholder: 'Las comunicaciones aparecerán aquí durante la simulación',
    sms: 'SMS', press: 'PRENSA', regulatory: 'REGULATORIO',
  },
  results: {
    title: 'RESUMEN EJECUTIVO', completed: 'Ciclo completado', mission: '✓ MISIÓN COMPLETADA',
    download: 'Descargar PDF', close: 'Cerrar y volver al simulador',
    duration: 'DURACIÓN CICLO',
    kpiSla: 'SLA', kpiSafety: 'SEGURIDAD', kpiEfficiency: 'EFICIENCIA OPERATIVA',
    tiepi: 'TIEPI', tiepiLong: 'Tiempo de Interrupción Equiv. Potencia Instalada',
    mttr: 'MTTR', mttrLong: 'Mean Time To Repair — Tiempo medio de reposición',
    clientsServed: 'Clientes atendidos', faultsHandled: 'Fallos atendidos',
    criticalCovered: 'Sitios críticos cubiertos', pendingActions: 'Acciones pendientes',
    sapIntegration: 'INTEGRACIÓN SAP',
    sapSystems: 'Sistemas SAP integrados',
    sapWorkOrders: 'Órdenes de trabajo creadas',
    sapSwitches: 'Conmutaciones registradas en AIN',
    sapMaterials: 'Materiales reservados',
    sapReplenish: 'reposición solicitada',
    sapMessages: 'Mensajes enviados vía SAP CX',
    sapAssets: 'Activos analizados en S/4HANA',
    sapDrolius: 'Misiones de inspección ejecutadas',
    analysisTitle: 'ANÁLISIS ASSET AND SERVICES ASSISTANT',
    analysisEmpty: 'Resumen del orquestrador no disponible.',
    pendingTitle: 'ACCIONES PENDIENTES',
    urgencyCritical: 'CRÍTICO', urgencyModerate: 'MODERADO', urgencyLow: 'BAJO',
    gradOptimal: 'ÓPTIMO', gradAcceptable: 'ACEPTABLE', gradCritical: 'CRÍTICO',
    pdfTitle: 'Resumen Ejecutivo', pdfKpis: 'KPIs DE MISIÓN',
    pdfOperational: 'INDICADORES OPERATIVOS', pdfSap: 'INTEGRACIÓN SAP',
    pdfAnalysis: 'ANÁLISIS ASSET AND SERVICES ASSISTANT',
    pdfPending: 'ACCIONES PENDIENTES', pdfGenerated: 'Generado el',
  },
  modal: {
    title: 'INCIDENTE ACTIVO',
    subtitle: '— Tempestad Kristin · Área Metropolitana de Lisboa',
    summaryTitle: 'Resumen del incidente',
    summaryClients: 'clientes sin suministro',
    summaryFaults: 'fallos activos',
    summaryCritical: 'sitios críticos',
    summaryBody: 'La Tempestad Kristin ha golpeado simultáneamente múltiples zonas del AML con rachas de 120 km/h. Eucaliptos caen sobre líneas MT en Sintra y la Arrábida. La estación de bombeo EPAL de Loures — que abastece a 800.000 personas — tiene solo 30 min de batería. Las brigadas de la margen sur enfrentan retrasos en el Puente 25 de Abril.',
    criticalTitle: 'Sitios críticos con SAI / batería',
    criticalSubtitle: 'Infraestructuras con suministro de emergencia que se agotará si no se restaura la red a tiempo.',
    faultTypesTitle: 'Tipos de fallo',
    faultSwitchable: 'Conmutables', faultSwitchableDesc: 'Red subterránea Lisboa — restauración por telecontrol, sin brigada física',
    faultTransformer: 'Transformadores', faultTransformerDesc: 'Eucaliptos sobre subestaciones MT en Sintra y Arrábida — sustitución física',
    faultCable: 'Cables', faultCableDesc: 'Eucaliptos sobre líneas MT aéreas — reparación física de línea en campo',
    faultParamNote: 'El parámetro Conmutables controla cuántos fallos SW puede restaurar el agente Remote Restoration por telecontrol. Los que excedan el límite se degradan a fallo de cable y requieren brigada. Los parámetros Brigadas y Piezas limitadas afectan directamente a cuántos fallos físicos pueden atenderse.',
    resourcesTitle: 'Recursos disponibles',
    crewBases: 'BRIGADAS — 6 bases', totalMax: 'Total máximo',
    inventory: 'MATERIAL EN ALMACÉN',
    matTransformers: 'Transformadores', matCables: 'Bobinas de cable', matGenerator: 'Generador móvil',
    matTransNote: '→ 1 ud si piezas limitadas', matCableNote: 'suficiente para todos los fallos', matGenNote: 'medida temporal',
    limitedPartsWarning: 'Con piezas limitadas ON, solo hay 1 transformador para 7 fallos. El agente Resource detecta la escasez y fuerza un conflicto de priorización.',
    droliusTitle: 'DROLIUS — 1 UNIDAD',
    droliusBody: 'Robot Scout de inspección autónoma. El agente Service Dispatcher puede desplegarlo en zonas de Sintra o Arrábida con acceso difícil antes de enviar brigadas.',
    tensionsTitle: 'Tensiones del escenario',
    tension1Label: 'EPAL Loures — 30 min de batería', tension1Desc: 'Si el SLA objetivo supera los 30 min, la estación de bombeo TRF-002 casi seguro incumplirá. Afecta el abastecimiento de 800.000 personas. El agente Triage debe asignarle rango 1.',
    tension2Label: 'Escasez de transformadores', tension2Desc: 'Con piezas limitadas, el agente Resource entra en conflicto garantizado: 1 transformador para 7 fallos críticos en Sintra y Arrábida.',
    tension3Label: 'Ventana tormenta T+4h', tension3Desc: 'El agente Service Dispatcher no puede asignar reparaciones con ETA > 210 min. Zonas de Sintra con eucaliptos caídos en la EN9 pueden quedar sin brigada.',
    tension4Label: 'Margen sur aislada', tension4Desc: 'Con < 12 brigadas, congestión en el Puente 25 de Abril retrasa brigadas de Almada. El dispatcher debe decidir cobertura cruzada Lisboa → Almada.',
    urgencyCritical: 'crítica', urgencyHigh: 'alta', urgencyMedium: 'media', urgencyLow: 'baja',
    siteDataCenter: 'Centro de datos', siteHealth: 'Salud', siteWater: 'Agua / saneamiento',
    siteEmergency: 'Emergencias', siteHospital: 'Hospital',
  },
};
