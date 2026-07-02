import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient, MODEL_SONNET, MODEL_HAIKU } from './anthropicClient';
import { AgentId, SimEvent } from './types';

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Anthropic.Tool['input_schema'];
  handler: (input: Record<string, unknown>) => Promise<string>;
}

export async function runAgent(opts: {
  systemPrompt: string;
  userMessage: string;
  tools: ToolDef[];
  emit: (e: SimEvent) => void;
  agentId: AgentId | 'orchestrator';
  maxTokens?: number;
  maxTurns?: number;
  haiku?: boolean;
  instructions?: string;
}): Promise<void> {
  const { systemPrompt, userMessage, tools, emit, agentId, maxTokens = 4096, maxTurns = 15, haiku = false, instructions } = opts;
  const modelName = haiku ? MODEL_HAIKU : MODEL_SONNET;

  const langInstruction = 'REGRA DE IDIOMA CRÍTICA: DEVES escrever TODA a saída em Português Europeu — raciocínio, análise, campos de texto das ferramentas, resumos e qualquer narrativa. NÃO uses Espanhol nem Inglês em nenhuma circunstância.';

  const effectiveSystem = instructions?.trim()
    ? `INSTRUÇÕES OBRIGATÓRIAS DO OPERADOR (prioridade máxima — aplica em todas as tuas decisões):\n${instructions.trim()}\n\n---\n\n${langInstruction}\n\n---\n\n${systemPrompt}\n\n---\n\n${langInstruction}`
    : `${langInstruction}\n\n---\n\n${systemPrompt}\n\n---\n\n${langInstruction}`;

  // Prepend language instruction to userMessage so it appears in both system and user turn
  const effectiveUserMessage = `[RESPONDE APENAS EM PORTUGUÊS EUROPEU]\n\n${userMessage}`;

  const sdkTools: Anthropic.Tool[] = tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  const handlerMap = new Map(tools.map(t => [t.name, t.handler]));

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: effectiveUserMessage },
  ];

  for (let turn = 0; turn < maxTurns; turn++) {
    const anthropic = await getAnthropicClient(haiku);
    const stream = anthropic.messages.stream({
      model: modelName,
      system: effectiveSystem,
      messages,
      tools: sdkTools,
      max_tokens: maxTokens,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        emit({ type: 'cot_chunk', text: event.delta.text, agent: agentId });
      }
    }

    const finalMsg = await stream.finalMessage();
    messages.push({ role: 'assistant', content: finalMsg.content });

    if (finalMsg.stop_reason === 'end_turn') break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of finalMsg.content) {
      if (block.type !== 'tool_use') continue;

      const handler = handlerMap.get(block.name);
      let result: string;

      if (!handler) {
        result = `Error: unknown tool "${block.name}"`;
      } else {
        try {
          result = await handler(block.input as Record<string, unknown>);
        } catch (err) {
          result = `Error executing tool ${block.name}: ${String(err)}`;
        }
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
      });
    }

    if (toolResults.length === 0) break;
    messages.push({ role: 'user', content: toolResults });
  }
}
