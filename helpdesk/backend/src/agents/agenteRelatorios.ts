import Anthropic from "@anthropic-ai/sdk";
import { relatorioToolsSchema, executarRelatorioTool } from "../tools/relatorioTools";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5";

const SYSTEM_RELATORIOS = `Você é um analista de dados especializado em helpdesk.
Gera relatórios claros, objetivos e acionáveis sobre os tickets de suporte.

REGRA CRÍTICA: SEMPRE use as ferramentas para buscar dados reais antes de qualquer análise.
NUNCA invente números ou suponha o estado do sistema.

Apresente dados em tabelas markdown quando houver múltiplos itens.
Destaque insights importantes e sugira ações concretas quando relevante.
Use emojis com moderação para facilitar a leitura (ex: ✅ ⚠️ 🔴).

Ferramentas disponíveis:
- tickets_por_periodo: tickets criados nos últimos N dias (volume e tendências)
- distribuicao_tickets: distribuição por categoria, prioridade e status (visão geral)
- tickets_sem_atualizacao: tickets abertos parados há N dias (possíveis violações de SLA)

Seja analítico e direto. Aponte problemas e oportunidades de melhoria quando identificados.`;

// ================================================================
// AGENTE DE RELATÓRIOS (STREAMING)
//
// Agente especializado em análise e geração de relatórios.
// Stateless: cada consulta é independente (sem histórico persistido).
// Usa tool use loop + streaming igual ao agente interativo.
// ================================================================
export async function agenteRelatorioStream(
  mensagemUsuario: string,
  onChunk: (chunk: string) => void
): Promise<void> {

  const hoje = new Date().toLocaleDateString("pt-BR");
  const systemComData = `Data de hoje: ${hoje}.\n\n` + SYSTEM_RELATORIOS;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: mensagemUsuario },
  ];

  let respostaFinal = "";

  while (true) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 800,
      system: systemComData,
      tools: relatorioToolsSchema,
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        onChunk(event.delta.text);
        respostaFinal += event.delta.text;
      }
    }

    const finalMsg = await stream.finalMessage();

    if (finalMsg.stop_reason !== "tool_use") break;

    messages.push({ role: "assistant", content: finalMsg.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of finalMsg.content) {
      if (block.type !== "tool_use") continue;
      const resultado = await executarRelatorioTool(
        block.name,
        block.input as Record<string, unknown>
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(resultado),
      });
    }
    messages.push({ role: "user", content: toolResults });
    respostaFinal = "";
  }

  if (!respostaFinal) {
    onChunk("Não consegui gerar o relatório.");
  }
}
