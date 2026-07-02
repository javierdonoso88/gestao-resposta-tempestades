import { SimParams, ScenarioState, AgentResult, SimEvent } from '../types';
import { runAgent, ToolDef } from '../agentRunner';

export async function runResource(
  params: SimParams,
  state: ScenarioState,
  emit: (e: SimEvent) => void
): Promise<AgentResult & { hadConflict: boolean }> {
  let summary = 'Gestión de recursos completada.';
  let hadConflict = false;

  const deployedFaults = state.faults.filter(f => f.status === 'crew-en-route');
  const trfFaults = deployedFaults.filter(f => f.type === 'transformer');
  const cableFaults = deployedFaults.filter(f => f.type === 'cable');

  const faultInfo = deployedFaults.map(f =>
    `${f.id} | tipo:${f.type} | zona:${f.zone} | clientes:${f.affectedClients}` +
    (f.criticalSite ? ` | CRÍTICO:${f.criticalSite}` : '')
  ).join('\n');

  const tools: ToolDef[] = [
    {
      name: 'allocate_resource',
      description: 'Asigna un recurso material a un fallo (consume inventario).',
      input_schema: {
        type: 'object' as const,
        properties: {
          faultId: { type: 'string', description: 'ID del fallo' },
          resourceType: {
            type: 'string',
            enum: ['transformer', 'cable', 'mobile_generator'],
            description: 'Tipo de recurso a asignar',
          },
        },
        required: ['faultId', 'resourceType'],
      },
      handler: async (input) => {
        const fault = state.faults.find(f => f.id === input.faultId);
        if (!fault) return `Error: fallo ${input.faultId} no encontrado`;
        const rt = input.resourceType as string;
        if (rt === 'transformer' && state.inventory.transformers <= 0) {
          return `Error: sin transformadores en inventario (disponibles: 0)`;
        }
        if (rt === 'cable' && state.inventory.cables <= 0) {
          return `Error: sin cables en inventario (disponibles: 0)`;
        }
        if (rt === 'mobile_generator' && state.inventory.mobileGenerators <= 0) {
          return `Error: sin generadores móviles en inventario (disponibles: 0)`;
        }
        if (rt === 'transformer') state.inventory.transformers--;
        else if (rt === 'cable') state.inventory.cables--;
        else if (rt === 'mobile_generator') state.inventory.mobileGenerators--;
        const RESOURCE_LABEL_ES: Record<string, string> = { transformer: 'transformador', cable: 'cable', mobile_generator: 'generador móvil' };
        const RESOURCE_LABEL_EN: Record<string, string> = { transformer: 'transformer', cable: 'cable', mobile_generator: 'mobile generator' };
        const RESOURCE_LABEL_PT: Record<string, string> = { transformer: 'transformador', cable: 'cabo', mobile_generator: 'gerador móvel' };
        const rl = params.language === 'en' ? (RESOURCE_LABEL_EN[rt] ?? rt) : params.language === 'pt' ? (RESOURCE_LABEL_PT[rt] ?? rt) : (RESOURCE_LABEL_ES[rt] ?? rt);
        emit({ type: 'action', agent: 'resource', system: 'SAP Integrated Business Planning', msg: params.language === 'en'
          ? `Material reserved in IBP: 1 ${rl} → ${input.faultId}`
          : params.language === 'pt'
          ? `Material reservado em IBP: 1 ${rl} → ${input.faultId}`
          : `Material reservado en IBP: 1 ${rl} → ${input.faultId}` });
        return `OK: ${rt} asignado a ${input.faultId}`;
      },
    },
    {
      name: 'flag_conflict',
      description: 'Registra conflicto de recursos: material insuficiente. Technician Briefing Agent siempre prevalece — sitios críticos tienen prioridad.',
      input_schema: {
        type: 'object' as const,
        properties: {
          faultId: { type: 'string', description: 'ID del fallo afectado por el déficit' },
          reason: { type: 'string', description: 'Descripción del conflicto de material' },
        },
        required: ['faultId', 'reason'],
      },
      handler: async (input) => {
        hadConflict = true;
        emit({
          type: 'conflict',
          winner: 'triage-priority',
          loser: 'resource',
          reason: input.reason as string,
        });
        emit({ type: 'action', agent: 'resource', system: 'SAP Integrated Business Planning', msg: params.language === 'en'
          ? `Material replenishment request registered in IBP: ${input.reason}`
          : params.language === 'pt'
          ? `Pedido de reposição de material registado em IBP: ${input.reason}`
          : `Solicitud de reposición de material registrada en IBP: ${input.reason}` });
        return `Conflicto registrado: ${input.faultId} — ${input.reason}`;
      },
    },
    {
      name: 'complete_resources',
      description: 'Finaliza la gestión de recursos con resumen ejecutivo.',
      input_schema: {
        type: 'object' as const,
        properties: {
          summary: { type: 'string', description: 'Resumen de la gestión de recursos' },
        },
        required: ['summary'],
      },
      handler: async (input) => {
        summary = input.summary as string;
        return 'Gestión de recursos finalizada.';
      },
    },
  ];

  await runAgent({
    systemPrompt: `Eres el agente Resource Capacity Shortage Agent del sistema de Respuesta a Tormentas de Distribuição Eléctrica (AML Lisboa).
Tu misión: verificar que los materiales necesarios están disponibles para las brigadas desplegadas.
Reglas:
- Brigada reparando transformador → necesita 1 transformador del inventario
- Brigada reparando cable → necesita 1 bobina de cable del inventario
- Si inventario insuficiente → llama flag_conflict para los fallos que no pueden ser atendidos
- REGLA DE ORO: Technician Briefing Agent prevalece — EPAL Loures y hospitales tienen prioridad absoluta sobre material disponible
- Puedes asignar generadores móviles (mobile_generator) como medida temporal para sitios críticos sin transformador disponible
Llama a allocate_resource para cada asignación posible, flag_conflict si hay déficit, luego complete_resources.
${params.language === 'pt' ? 'Responde em Português Europeu.' : params.language === 'en' ? 'Respond in English.' : 'Responde en español.'} Sé preciso.`,
    userMessage: `FALLOS CON BRIGADA EN CAMINO (${deployedFaults.length} total):
${faultInfo || 'Ningún fallo con brigada asignada'}

INVENTARIO ACTUAL:
  Transformadores : ${state.inventory.transformers} unidades
  Cables (bobinas): ${state.inventory.cables} unidades
  Gen. móviles    : ${state.inventory.mobileGenerators} unidades

DEMANDA:
  Transformadores necesarios: ${trfFaults.length}
  Cables necesarios         : ${cableFaults.length}
${params.limitedParts === 1 ? `⚠️ INVENTARIO LIMITADO: solo ${state.inventory.transformers} transformador(es) disponible(s) para ${trfFaults.length} fallo(s)` : '✓ Inventario completo'}

Asigna recursos con allocate_resource, registra conflictos con flag_conflict si hay déficit, luego complete_resources.${params.instructions?.trim() ? `\n\nINSTRUCCIONES DEL OPERADOR (aplica en la priorización de material):\n${params.instructions.trim()}` : ''}`,
    tools,
    emit,
    agentId: 'resource',
    maxTokens: 4096,
    haiku: true,
    instructions: params.instructions,
    language: params.language,
  });

  return {
    agentId: 'resource',
    summary,
    restoredFaults: [],
    dispatches: [],
    commsMessages: [],
    hadConflict,
  };
}
