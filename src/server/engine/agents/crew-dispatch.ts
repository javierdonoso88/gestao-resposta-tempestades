import { SimParams, ScenarioState, AgentResult, SimEvent, Fault } from '../types';
import { runAgent, ToolDef } from '../agentRunner';

export async function runCrewDispatch(
  params: SimParams,
  state: ScenarioState,
  emit: (e: SimEvent) => void
): Promise<AgentResult> {
  let summary = 'Despacho de brigadas completado.';
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
    (f.criticalSite ? ` | CRÍTICO:${f.criticalSite} (${f.criticalSiteType}) batería:${f.batteryMinutes ?? 'N/A'}min` : '')
  ).join('\n');

  const safetyLimitMin = params.storm2Window === 'T+4h' ? 240
    : params.storm2Window === 'T+6h' ? 360
    : params.storm2Window === 'T+8h' ? 480
    : 9999;

  const tools: ToolDef[] = [
    {
      name: 'dispatch_crew',
      description: 'Despacha una brigada a un fallo físico para reparación.',
      input_schema: {
        type: 'object' as const,
        properties: {
          crewId: { type: 'string', description: 'ID de la brigada (ej: B-01)' },
          faultId: { type: 'string', description: 'ID del fallo físico (ej: TRF-001)' },
          eta: { type: 'number', description: 'ETA estimada en minutos' },
          reason: { type: 'string', description: 'Justificación del despacho' },
        },
        required: ['crewId', 'faultId', 'eta', 'reason'],
      },
      handler: async (input) => {
        const crew = state.crews.find(c => c.id === input.crewId);
        const fault = state.faults.find(f => f.id === input.faultId);
        if (!crew) return `Error: brigada ${input.crewId} no encontrada`;
        if (!fault) return `Error: fallo ${input.faultId} no encontrado`;
        if (crew.status !== 'available') return `Error: brigada ${input.crewId} no disponible (estado: ${crew.status})`;
        if (fault.status !== 'fault') return `Error: fallo ${input.faultId} ya en proceso (estado: ${fault.status})`;
        crew.status = 'busy';
        crew.currentTask = input.faultId as string;
        fault.status = 'crew-en-route';
        dispatches.push({ crewId: crew.id, faultId: fault.id });
        emit({ type: 'asset_update', id: fault.id, status: 'crew-en-route' });
        emit({ type: 'action', agent: 'crew-dispatch', system: 'SAP Field Service Management', msg: params.language === 'en'
          ? `Work order created: ${crew.id} → ${fault.id} (${fault.zone}) — ETA ${input.eta} min`
          : params.language === 'pt'
          ? `Ordem de trabalho criada: ${crew.id} → ${fault.id} (${fault.zone}) — ETA ${input.eta} min`
          : `Orden de trabajo creada: ${crew.id} → ${fault.id} (${fault.zone}) — ETA ${input.eta} min` });
        return `OK: ${crew.id} despachado a ${fault.id} — ETA ${input.eta}min. ${fault.affectedClients.toLocaleString()} clientes afectados.`;
      },
    },
    {
      name: 'dispatch_drolius',
      description: 'Despliega a Drolius (robot canino de inspección) a una zona de fallo para obtener datos en tiempo real: estado de la batería SAI, accesibilidad de la zona y evaluación de daños. Especialmente útil antes de enviar brigada a zonas peligrosas o con batería crítica. Solo disponible si Drolius no está ya desplegado.',
      input_schema: {
        type: 'object' as const,
        properties: {
          faultId: { type: 'string', description: 'ID del fallo a inspeccionar' },
          mission: {
            type: 'string',
            enum: ['battery_check', 'zone_access', 'damage_assessment'],
            description: 'Tipo de misión: battery_check = confirmar batería SAI restante; zone_access = evaluar accesibilidad para brigada; damage_assessment = evaluar daños físicos en el activo',
          },
        },
        required: ['faultId', 'mission'],
      },
      handler: async (input) => {
        if (state.drolius.status !== 'available') {
          return `Error: Drolius no disponible — actualmente asignado en campo en ${state.drolius.currentTask}`;
        }
        const fault = state.faults.find(f => f.id === input.faultId);
        if (!fault) return `Error: fallo ${input.faultId} no encontrado`;

        state.drolius.status = 'deployed';
        state.drolius.currentTask = input.faultId as string;

        emit({ type: 'drolius_update', status: 'deployed', task: input.faultId as string });
        emit({ type: 'action', agent: 'crew-dispatch', system: 'Drolius · ANYbotics', msg: params.language === 'en'
          ? `Drolius deployed → ${fault.zone} (${input.faultId}) — mission: ${input.mission}`
          : params.language === 'pt'
          ? `Drolius implantado → ${fault.zone} (${input.faultId}) — missão: ${input.mission}`
          : `Drolius asignado en campo → ${fault.zone} (${input.faultId}) — misión: ${input.mission}` });

        const report = buildDroliusReport(fault, input.mission as string);

        emit({ type: 'action', agent: 'crew-dispatch', system: 'Drolius · ANYbotics', msg: params.language === 'en'
          ? `Drolius transmits report: ${report.slice(0, 100)}…`
          : params.language === 'pt'
          ? `Drolius transmite relatório: ${report.slice(0, 100)}…`
          : `Drolius transmite informe: ${report.slice(0, 100)}…` });

        return report;
      },
    },
    {
      name: 'skip_fault',
      description: 'Marca un fallo como no asignable en este ciclo (sin brigada disponible o ventana insuficiente).',
      input_schema: {
        type: 'object' as const,
        properties: {
          faultId: { type: 'string', description: 'ID del fallo a omitir' },
          reason: { type: 'string', description: 'Motivo por el que no se puede asignar' },
        },
        required: ['faultId', 'reason'],
      },
      handler: async (input) => {
        return `OK: ${input.faultId} registrado sin asignar — ${input.reason}`;
      },
    },
    {
      name: 'complete_dispatch',
      description: 'Finaliza el despacho de brigadas con resumen ejecutivo.',
      input_schema: {
        type: 'object' as const,
        properties: {
          summary: { type: 'string', description: 'Resumen del despacho de brigadas' },
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
    systemPrompt: `Eres el agente Service Dispatcher Agent del sistema de Respuesta a Tormentas de Distribuição Eléctrica (AML Lisboa).
Tu misión: asignar brigadas disponibles a fallos físicos (transformadores y cables).
Reglas:
- Skill A = reparación transformadores | Skill B = reparación cables
- Prioridad: sitios críticos primero, ordenados por batería restante (menor = más urgente). EPAL Loures es prioridad absoluta.
- Luego: residenciales por clientes afectados (mayor primero)
- Ventana de tormenta: ${params.storm2Window}. Límite seguridad: ${safetyLimitMin}min. Si es T+4h, evita asignar transformadores con ETA > 210min
- IMPORTANTE: Brigadas de Almada y Setúbal (margem sul) tienen +20 min de ETA base por la Ponte 25 de Abril. Considéralo en tus ETAs.
- Zonas de Sintra (Sintra Vila, Colares, São Marcos) pueden tener acceso dificultado por eucaliptos en la EN9/EN247 — usa Drolius antes de enviar brigada.
- Si no hay brigada con el skill necesario disponible, usa skip_fault
- DROLIUS: tienes disponible el robot de inspección Drolius. Úsalo en sitios críticos con batería muy baja o en zonas de Sintra/Arrábida con acceso difícil ANTES de enviar brigada. Una sola misión a la vez.
Llama a dispatch_crew para cada asignación posible, skip_fault para inasignables, luego complete_dispatch.
${params.language === 'pt' ? 'Responde em Português Europeu.' : params.language === 'en' ? 'Respond in English.' : 'Responde en español.'} Sé operacional y preciso.`,
    userMessage: `BRIGADAS DISPONIBLES (${availableCrews.length} total):
${crewList || 'Ninguna brigada disponible'}

FALLOS FÍSICOS PENDIENTES (${physicalFaults.length} total):
${faultList || 'Ningún fallo físico pendiente'}

SLA: ${params.minuteSLA}min | Ventana tormenta 2: ${params.storm2Window}
Tiempo reparación estimado: transformador 90-180min, cable 60-120min

Asigna brigadas con dispatch_crew, omite inasignables con skip_fault, luego complete_dispatch.
DROLIUS disponible: ${state.drolius.status === 'available' ? 'SÍ — puedes desplegarlo con dispatch_drolius para inspección previa' : 'NO (ocupado)'}.${params.instructions?.trim() ? `\n\nINSTRUCCIONES DEL OPERADOR (prioridad máxima — ajusta asignaciones en consecuencia):\n${params.instructions.trim()}` : ''}`,
    tools,
    emit,
    agentId: 'crew-dispatch',
    maxTokens: 8192,
    haiku: true,
    instructions: params.instructions,
    language: params.language,
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
    ? 'zona parcialmente inundada — agua 15-20 cm en acceso principal. Requiere calzado de protección y EPI nivel 2.'
    : 'zona accesible — sin obstáculos significativos. Condiciones: pavimento mojado, visibilidad reducida por lluvia.';

  if (mission === 'battery_check' && fault.criticalSite) {
    const remaining = fault.batteryMinutes ?? 0;
    const tempC = 68 + (remaining % 30);
    return `[DROLIUS INFORME — ${id} · ${fault.criticalSite}] ` +
      `Batería SAI confirmada: ${remaining} min restantes (lectura directa del BMS). ` +
      `Temperatura transformador: ${tempC}°C — dentro de margen operativo. ` +
      `Estado bypass: activo. Carga actual: ${55 + (remaining % 40)}% capacidad nominal. ` +
      `Recomendación: prioridad ${remaining <= 60 ? 'CRÍTICA — brigada inmediata' : 'alta — brigada en < 90 min'}.`;
  }

  if (mission === 'zone_access') {
    return `[DROLIUS INFORME ACCESO — ${id} · ${zone}] ` +
      `${ACCESS_CONDITIONS} ` +
      `Ruta alternativa disponible por vía secundaria (+12 min de ETA). ` +
      `Obstáculos detectados: ${fault.type === 'transformer' ? 'árbol caído a 30 m del activo — motosierra necesaria' : 'derribo de panel de señalización — despejable manualmente'}. ` +
      `Estimación ETA brigada ajustada: ${fault.type === 'transformer' ? '+20 min sobre ETA nominal' : '+8 min sobre ETA nominal'}.`;
  }

  // damage_assessment
  const damageDesc = fault.type === 'transformer'
    ? 'Impacto de rayo confirmado en devanado primario. Aislante exterior con quemaduras visibles. Requiere sustitución completa del equipo. Confirmado: Skill A obligatorio.'
    : `Rotura de conductor en ${Math.floor(Math.random() * 3) + 1} punto(s). Longitud afectada estimada: ${20 + (fault.affectedClients % 50)} m. Requiere ${Math.ceil(fault.affectedClients / 1500)} bobina(s) de cable.`;

  return `[DROLIUS INFORME DAÑOS — ${id} · ${zone}] ${damageDesc} ` +
    `Nivel de seguridad zona: ${fault.batteryMinutes !== undefined && fault.batteryMinutes <= 60 ? 'ALTO RIESGO — presencia de alta tensión cercana' : 'MEDIO — proceder con EPI estándar'}. ` +
    `ETA reparación estimada: ${fault.type === 'transformer' ? '120-180 min' : '60-100 min'}.`;
}
