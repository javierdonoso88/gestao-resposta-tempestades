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
    systemPrompt: `És o agente Resource Capacity Shortage Agent do sistema de Gestão de Resposta a Tempestades da Distribuição Eléctrica (AML Lisboa).
A tua missão: verificar que os materiais necessários estão disponíveis para as brigadas despachadas.
Regras:
- Brigada a reparar transformador → necessita 1 transformador do inventário
- Brigada a reparar cabo → necessita 1 bobina de cabo do inventário
- Se inventário insuficiente → chama flag_conflict para as falhas que não podem ser atendidas
- REGRA DE OURO: Technician Briefing Agent prevalece — EPAL Loures e hospitais têm prioridade absoluta sobre material disponível
- Podes atribuir geradores móveis (mobile_generator) como medida temporária para locais críticos sem transformador disponível
Chama allocate_resource para cada atribuição possível, flag_conflict se há défice, depois complete_resources.
REGRA DE IDIOMA CRÍTICA: DEVES escrever TODA a saída em Português Europeu. Sê preciso.`,
    userMessage: `[RESPONDE APENAS EM PORTUGUÊS EUROPEU]

FALHAS COM BRIGADA A CAMINHO (${deployedFaults.length} total):
${faultInfo || 'Nenhuma falha com brigada atribuída'}

INVENTÁRIO ATUAL:
  Transformadores : ${state.inventory.transformers} unidades
  Cabos (bobinas) : ${state.inventory.cables} unidades
  Gen. móveis     : ${state.inventory.mobileGenerators} unidades

PROCURA:
  Transformadores necessários: ${trfFaults.length}
  Cabos necessários          : ${cableFaults.length}
${params.limitedParts === 1 ? `⚠️ INVENTÁRIO LIMITADO: apenas ${state.inventory.transformers} transformador(es) disponível(eis) para ${trfFaults.length} falha(s)` : '✓ Inventário completo'}

Atribui recursos com allocate_resource, regista conflitos com flag_conflict se há défice, depois complete_resources.${params.instructions?.trim() ? `\n\nINSTRUÇÕES DO OPERADOR (aplica na priorização de material):\n${params.instructions.trim()}` : ''}`,
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
