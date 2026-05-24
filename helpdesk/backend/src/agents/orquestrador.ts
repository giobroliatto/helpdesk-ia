import Anthropic from "@anthropic-ai/sdk";
import { agenteChatInterativoStream } from "./agenteInterativo";
import { agenteRelatorioStream } from "./agenteRelatorios";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5";

export type AgenteRoteado = "interativo" | "relatorio";

// ================================================================
// ORQUESTRADOR — camada de roteamento entre agentes especializados
//
// Responsabilidade única: classificar a intenção da mensagem e
// delegar para o agente correto. Não tem nenhuma lógica de domínio.
//
// Fluxo:
//   1. Classifica intenção com uma chamada rápida ao Claude (max 10 tokens)
//   2. Roteua para agenteInterativo (tickets) ou agenteRelatorios (analytics)
//   3. Streama a resposta do sub-agente de volta ao chamador
// ================================================================

// System prompt minimalista — só classifica, não responde ao usuário
const SYSTEM_CLASSIFICADOR = `Você é um roteador de intenções de um sistema de helpdesk.
Classifique a mensagem do usuário e responda APENAS com uma palavra:
- "relatorio" — se a mensagem é sobre: análise de dados, estatísticas, quantidades, volumes, tendências, SLA, distribuição, relatórios, dashboards ou qualquer consulta analítica/gerencial
- "interativo" — se a mensagem é sobre: um ticket específico, listar tickets, alterar status ou prioridade, adicionar comentário, ou qualquer operação de suporte operacional

Responda APENAS com "relatorio" ou "interativo", sem nenhum texto adicional.`;

export async function classificarIntencao(mensagem: string): Promise<AgenteRoteado> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 10,
    system: SYSTEM_CLASSIFICADOR,
    messages: [{ role: "user", content: mensagem }],
  });

  const texto = (response.content[0] as Anthropic.TextBlock).text.trim().toLowerCase();
  console.log(`[ORQUESTRADOR] Intenção detectada: "${texto}" para mensagem: "${mensagem.slice(0, 60)}"`);

  // Qualquer resposta que não seja "relatorio" vai para o agente interativo (fallback seguro)
  return texto.startsWith("relatorio") ? "relatorio" : "interativo";
}

export async function orquestradorStream(
  ticketId: number | null,
  mensagemUsuario: string,
  historico: Array<{ role: "user" | "assistant"; content: string }>,
  onAgente: (agente: AgenteRoteado) => void,
  onChunk: (chunk: string) => void
): Promise<void> {
  const agente = await classificarIntencao(mensagemUsuario);
  onAgente(agente);

  if (agente === "relatorio") {
    // Agente de relatórios: stateless, sem histórico, só leitura
    await agenteRelatorioStream(mensagemUsuario, onChunk);
  } else {
    // Agente interativo: stateful, usa histórico, pode fazer ações com HITL
    await agenteChatInterativoStream(ticketId, mensagemUsuario, historico, onChunk);
  }
}
