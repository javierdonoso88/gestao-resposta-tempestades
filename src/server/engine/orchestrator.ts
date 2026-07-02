import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient, MODEL } from './anthropicClient';
import { SimParams, ScenarioState, SimEvent } from './types';
import { buildScenario } from './scenario';
import { runTriagePriority } from './agents/triage-priority';
import { runRerouting } from './agents/rerouting';
import { runCrewDispatch } from './agents/crew-dispatch';
import { runResource } from './agents/resource';
import { runComms } from './agents/comms';

function simTime(elapsedMs: number): string {
  const totalSecs = Math.floor(elapsedMs / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `T+${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export async function runOrchestrator(params: SimParams, emit: (e: SimEvent) => void): Promise<void> {
  const startTime = Date.now();
  const state: ScenarioState = buildScenario({
    availableCrews: params.availableCrews,
    switchableFaults: params.switchableFaults,
    limitedParts: params.limitedParts,
  });

  emit({ type: 'action', agent: 'orchestrator', system: 'SAP AI Core Orchestration', msg: params.language === 'en'
    ? `Incident registered in AI Core — ${state.faults.length} faults detected, ${state.totalClients.toLocaleString()} customers affected`
    : params.language === 'pt'
    ? `Incidente registado em AI Core — ${state.faults.length} falhas detetadas, ${state.totalClients.toLocaleString()} clientes afetados`
    : `Incidente registrado en AI Core — ${state.faults.length} fallos detectados, ${state.totalClients.toLocaleString()} clientes afectados` });

  const safetyLimitMin = params.storm2Window === 'T+4h' ? 240
    : params.storm2Window === 'T+6h' ? 360
    : params.storm2Window === 'T+8h' ? 480
    : 9999;

  let hadConflict = false;

  const safetyInterval = setInterval(() => {
    emit({ type: 'safety_tick', elapsed: Math.floor((Date.now() - startTime) / 1000), limit: safetyLimitMin * 60 });
  }, 2000);

  const phase1Tools = new Set(['invoke_triage_priority', 'invoke_rerouting']);

  // Sub-agent invoke handlers (no input — state accessed via closure)
  const handlers = new Map<string, () => Promise<string>>();

  handlers.set('invoke_triage_priority', async () => {
    emit({ type: 'agent_start', agent: 'triage-priority', t: simTime(Date.now() - startTime) });
    try {
      const result = await runTriagePriority(params, state, emit);
      emit({ type: 'agent_done', agent: 'triage-priority', summary: result.summary });
      return `Technician Briefing Agent completado: ${result.summary}`;
    } catch (err) {
      const msg = `Error en triage-priority: ${String(err)}`;
      emit({ type: 'agent_done', agent: 'triage-priority', summary: msg });
      return msg;
    }
  });

  handlers.set('invoke_rerouting', async () => {
    emit({ type: 'agent_start', agent: 'rerouting', t: simTime(Date.now() - startTime) });
    try {
      const result = await runRerouting(params, state, emit);
      emit({ type: 'agent_done', agent: 'rerouting', summary: result.summary });
      return `Rerouting completado: ${result.summary}`;
    } catch (err) {
      const msg = `Error en rerouting: ${String(err)}`;
      emit({ type: 'agent_done', agent: 'rerouting', summary: msg });
      return msg;
    }
  });

  handlers.set('invoke_crew_dispatch', async () => {
    emit({ type: 'agent_start', agent: 'crew-dispatch', t: simTime(Date.now() - startTime) });
    try {
      const result = await runCrewDispatch(params, state, emit);
      emit({ type: 'agent_done', agent: 'crew-dispatch', summary: result.summary });
      return `Crew-dispatch completado: ${result.summary}`;
    } catch (err) {
      const msg = `Error en crew-dispatch: ${String(err)}`;
      emit({ type: 'agent_done', agent: 'crew-dispatch', summary: msg });
      return msg;
    }
  });

  handlers.set('invoke_resource', async () => {
    emit({ type: 'agent_start', agent: 'resource', t: simTime(Date.now() - startTime) });
    try {
      const result = await runResource(params, state, emit);
      hadConflict = result.hadConflict;
      emit({ type: 'agent_done', agent: 'resource', summary: result.summary });
      return `Resource completado: ${result.summary}`;
    } catch (err) {
      const msg = `Error en resource: ${String(err)}`;
      emit({ type: 'agent_done', agent: 'resource', summary: msg });
      return msg;
    }
  });

  handlers.set('invoke_comms', async () => {
    emit({ type: 'agent_start', agent: 'comms', t: simTime(Date.now() - startTime) });
    try {
      const result = await runComms(params, state, hadConflict, emit);
      emit({ type: 'agent_done', agent: 'comms', summary: result.summary });
      return `Comms completado: ${result.summary}`;
    } catch (err) {
      const msg = `Error en comms: ${String(err)}`;
      emit({ type: 'agent_done', agent: 'comms', summary: msg });
      return msg;
    }
  });

  handlers.set('finalize', async () => {
    const addressedFaults = state.faults.filter(f => f.status === 'restored' || f.status === 'crew-en-route');
    const totalAffectedClients = state.faults.reduce((s, f) => s + f.affectedClients, 0);
    const addressedClients = addressedFaults.reduce((s, f) => s + f.affectedClients, 0);
    const criticalFaults = state.faults.filter(f => f.criticalSite);
    const criticalCovered = criticalFaults.filter(f => f.status === 'crew-en-route' || f.status === 'restored');

    // SLA: % of affected clients with a resolution underway (telecontrol or crew dispatched)
    const slaScore = totalAffectedClients > 0
      ? Math.min(100, Math.round(addressedClients / totalAffectedClients * 100))
      : 100;
    // Safety: % of critical sites covered (crew en-route or restored)
    const safetyScore = criticalFaults.length > 0
      ? Math.round((criticalCovered.length / criticalFaults.length) * 100)
      : 100;
    // Efficiency: % of total faults addressed (restored or crew dispatched)
    const efficiencyScore = Math.min(100, Math.round(addressedFaults.length / state.faults.length * 100));

    // TIEPI: Σ(affectedClients_i × estimatedTime_i) / totalClients  (in minutes)
    // Estimated interruption time per fault status:
    //   restored (telecontrol) → 10 min, crew-en-route transformer → 135 min,
    //   crew-en-route cable → 90 min, fault (unattended) → 240 min
    const estimatedTime = (f: typeof state.faults[0]) => {
      if (f.status === 'restored') return 10;
      if (f.status === 'crew-en-route' || f.status === 'repairing') return f.type === 'transformer' ? 135 : 90;
      return 240; // unattended fault
    };
    const tiepiValue = totalAffectedClients > 0
      ? Math.round(state.faults.reduce((s, f) => s + f.affectedClients * estimatedTime(f), 0) / totalAffectedClients)
      : 0;

    // MTTR: mean repair time for attended faults (restored + crew-en-route)
    const mttrValue = addressedFaults.length > 0
      ? Math.round(addressedFaults.reduce((s, f) => s + estimatedTime(f), 0) / addressedFaults.length)
      : 0;

    emit({ type: 'kpi', sla: slaScore, safety: safetyScore, efficiency: efficiencyScore, tiepi: tiepiValue, mttr: mttrValue });
    emit({ type: 'action', agent: 'orchestrator', system: 'SAP AI Core Orchestration', msg: params.language === 'en'
      ? `Cycle closed in AI Core — KPIs: SLA ${slaScore}%, Safety ${safetyScore}%, Efficiency ${efficiencyScore}%, TIEPI ${tiepiValue} min, MTTR ${mttrValue} min`
      : params.language === 'pt'
      ? `Ciclo encerrado em AI Core — KPIs: SLA ${slaScore}%, Segurança ${safetyScore}%, Eficiência ${efficiencyScore}%, TIEPI ${tiepiValue} min, MTTR ${mttrValue} min`
      : `Ciclo cerrado en AI Core — KPIs: SLA ${slaScore}%, Seguridad ${safetyScore}%, Eficiencia ${efficiencyScore}%, TIEPI ${tiepiValue} min, MTTR ${mttrValue} min` });
    emit({ type: 'done', elapsed: simTime(Date.now() - startTime) });
    return `Misión finalizada. KPIs: SLA=${slaScore}%, Seguridad=${safetyScore}%, Eficiencia=${efficiencyScore}%, TIEPI=${tiepiValue}min, MTTR=${mttrValue}min`;
  });

  const sdkTools: Anthropic.Tool[] = [
    {
      name: 'invoke_triage_priority',
      description: 'Ejecuta Technician Briefing Agent: clasifica todos los fallos por severidad y rankea los físicos por urgencia.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'invoke_rerouting',
      description: 'Ejecuta Remote Restoration Scada Agent: restaura fallos conmutables por telecontrol remoto.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'invoke_crew_dispatch',
      description: 'Ejecuta Service Dispatcher Agent: asigna brigadas a fallos físicos pendientes.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'invoke_resource',
      description: 'Ejecuta Resource Capacity Shortage Agent: gestiona inventario y detecta conflictos de material.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'invoke_comms',
      description: 'Ejecuta Communications Insight Agent: redacta y envía SMS, nota de prensa y notificación regulatoria.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'finalize',
      description: 'Finaliza la misión: calcula KPIs y cierra el ciclo de respuesta.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
  ];

  const systemPrompt = `Eres el ASSET AND SERVICES ASSISTANT del sistema de Respuesta a Tormentas de Distribuição Eléctrica (Área Metropolitana de Lisboa).

PROTOCOLO OBLIGATORIO — sigue este orden exacto sin saltarte ninguna fase:
FASE 1 (PARALELA): Llama invoke_triage_priority + invoke_rerouting en el MISMO turno (los dos a la vez).
FASE 2 (SECUENCIAL): Llama invoke_crew_dispatch (solo), luego invoke_resource (solo), luego invoke_comms (solo).
CIERRE: Llama finalize.

IMPORTANTE: Tras recibir los resultados de cada fase, llama INMEDIATAMENTE a la siguiente herramienta.
No escribas análisis extensos entre fases — una frase de transición es suficiente.
Nunca omitas invoke_crew_dispatch, invoke_resource ni invoke_comms.
${params.language === 'en'
  ? 'CRITICAL LANGUAGE RULE: You MUST write ALL output in English — every transition phrase, every summary, every reasoning step. No Spanish allowed.'
  : params.language === 'pt'
  ? 'REGRA DE IDIOMA CRÍTICA: DEVES escrever TODA a saída em Português Europeu — cada frase de transição, cada resumo, cada passo de raciocínio. Não uses Espanhol nem Inglês.'
  : 'Responde en español.'}`;

  const userMessage = `${params.language === 'en' ? '[RESPOND IN ENGLISH ONLY]\n\n' : params.language === 'pt' ? '[RESPONDE APENAS EM PORTUGUÊS EUROPEU]\n\n' : ''}INCIDENTE ACTIVO — Área Metropolitana de Lisboa — T+00:00

PARÁMETROS:
  SLA objetivo        : ${params.minuteSLA} minutos
  Fallos conmutables  : ${params.switchableFaults}
  Inventario piezas   : ${params.limitedParts === 1 ? 'LIMITADO (1 transformador)' : 'COMPLETO'}
  Ventana tormenta 2  : ${params.storm2Window}
  Brigadas disponibles: ${params.availableCrews}

ESCENARIO:
  Fallos activos      : ${state.faults.length} total
  - Conmutables       : ${state.faults.filter(f => f.type === 'switchable').length}
  - Transformadores   : ${state.faults.filter(f => f.type === 'transformer').length}
  - Cables            : ${state.faults.filter(f => f.type === 'cable').length}
  Sitios críticos     : ${state.faults.filter(f => f.criticalSite).length}
  Clientes afectados  : ${state.totalClients.toLocaleString()}
${params.instructions?.trim() ? `
INSTRUCCIONES DEL OPERADOR (prioridad máxima — ajusta tu razonamiento y el de los agentes en consecuencia):
${params.instructions.trim()}
` : ''}
Inicia el protocolo: llama invoke_triage_priority + invoke_rerouting en el MISMO turno.`;

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }];

  try {
    for (let turn = 0; turn < 20; turn++) {
      const anthropic = await getAnthropicClient();
      const stream = anthropic.messages.stream({
        model: MODEL,
        system: systemPrompt,
        messages,
        tools: sdkTools,
        max_tokens: 8192,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          emit({ type: 'cot_chunk', text: event.delta.text, agent: 'orchestrator' });
        }
      }

      const finalMsg = await stream.finalMessage();
      messages.push({ role: 'assistant', content: finalMsg.content });

      if (finalMsg.stop_reason === 'end_turn') break;

      const toolBlocks = finalMsg.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );
      if (toolBlocks.length === 0) break;

      // Run Phase 1 tools in parallel when Claude calls all three in the same turn
      const isParallelPhase1 = toolBlocks.length > 1 && toolBlocks.every(b => phase1Tools.has(b.name));

      let toolResults: Anthropic.ToolResultBlockParam[];

      if (isParallelPhase1) {
        toolResults = await Promise.all(
          toolBlocks.map(async (block) => {
            const handler = handlers.get(block.name);
            let result: string;
            if (!handler) {
              result = `Error: herramienta desconocida "${block.name}"`;
            } else {
              try {
                result = await handler();
              } catch (err) {
                result = `Error ejecutando ${block.name}: ${String(err)}`;
              }
            }
            return { type: 'tool_result' as const, tool_use_id: block.id, content: result };
          })
        );
      } else {
        toolResults = [];
        for (const block of toolBlocks) {
          const handler = handlers.get(block.name);
          let result: string;
          if (!handler) {
            result = `Error: herramienta desconocida "${block.name}"`;
          } else {
            try {
              result = await handler();
            } catch (err) {
              result = `Error ejecutando ${block.name}: ${String(err)}`;
            }
          }
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        }
      }

      messages.push({ role: 'user', content: toolResults });
    }
  } finally {
    clearInterval(safetyInterval);
  }
}
