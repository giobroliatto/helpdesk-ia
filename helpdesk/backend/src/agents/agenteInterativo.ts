import Anthropic from "@anthropic-ai/sdk";
import prisma from "../db/prisma";
import { ticketToolsSchema, executarTicketTool } from "../tools/ticketTools";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5";

const SYSTEM_INTERATIVO = `Você é um assistente de suporte interno da empresa.
Você ajuda funcionários a consultar, entender e acompanhar tickets de suporte.

REGRA CRÍTICA: SEMPRE use as ferramentas para buscar dados atualizados do banco antes
de responder qualquer pergunta sobre tickets. NUNCA use informações do histórico da
conversa para responder sobre o estado atual dos tickets — elas podem estar
desatualizadas. Cada resposta sobre tickets deve ser baseada em uma consulta
fresca às ferramentas.

Ferramentas disponíveis:
- listar_tickets: lista tickets com filtros opcionais de status ou prioridade
- buscar_ticket: busca detalhes completos de um ticket pelo ID
- resumo_tickets: conta tickets agrupados por status

Seja objetivo e direto. Quando não souber, diga claramente.`;

// ================================================================
// AGENTE INTERATIVO — responde perguntas do usuário em tempo real
// ================================================================
export async function agenteChatInterativo(
  ticketId: number | null,
  mensagemUsuario: string,
  historicoMensagens: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {

  // Monta o histórico no formato da Anthropic
  const messages: Anthropic.MessageParam[] = historicoMensagens.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Garante que o histórico termina com uma mensagem "assistant" antes de adicionar
  // a mensagem atual do usuário. Mensagens "user" órfãs (de chamadas falhas anteriores)
  // seriam rejeitadas pela API por quebrarem a alternância user/assistant.
  while (messages.length > 0 && messages[messages.length - 1].role === "user") {
    messages.pop();
  }

  // Adiciona a mensagem atual do usuário
  messages.push({ role: "user", content: mensagemUsuario });

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM_INTERATIVO,
    tools: ticketToolsSchema,
    messages,
  });

  // Loop de tool use — agente pode chamar ferramentas quantas vezes quiser.
  // IMPORTANTE: Claude pode retornar múltiplos tool_use em uma única resposta.
  // Todos devem ter um tool_result correspondente antes da próxima chamada da API.
  while (response.stop_reason === "tool_use") {
    // 1. Adiciona a resposta do assistente (com todos os tool_use) ao histórico
    messages.push({ role: "assistant", content: response.content });

    // 2. Coleta resultados de TODOS os blocos tool_use sequencialmente
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const resultado = await executarTicketTool(
        block.name,
        block.input as Record<string, unknown>
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(resultado),
      });
    }

    // 3. Adiciona UMA mensagem user com TODOS os resultados juntos
    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM_INTERATIVO,
      tools: ticketToolsSchema,
      messages,
    });
  }

  const textBlock = response.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined;
  const respostaFinal = textBlock?.text ?? "Não consegui gerar uma resposta.";

  // Salva AMBAS as mensagens no banco apenas após sucesso.
  // Se salvarmos o user ANTES e o agente falhar, a mensagem fica órfã no histórico
  // e corrompe chamadas futuras (quebrando a alternância user/assistant esperada pela API).
  await prisma.mensagemChat.createMany({
    data: [
      { ticketId, role: "user",      conteudo: mensagemUsuario },
      { ticketId, role: "assistant", conteudo: respostaFinal  },
    ],
  });

  return respostaFinal;
}
