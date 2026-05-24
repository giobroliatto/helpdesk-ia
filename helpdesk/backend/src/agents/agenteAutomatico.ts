import Anthropic from "@anthropic-ai/sdk";
import prisma from "../db/prisma";
import { buscarConhecimentoRelevante } from "../rag/buscar";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5";

const SYSTEM_AUDITOR = `Você é um auditor automático de tickets de suporte.
Quando um novo ticket chega, você analisa o conteúdo e define:
1. PRIORIDADE: baixa | media | alta | critica
2. CATEGORIA: ti | rh | financeiro | geral
3. SUGESTAO: uma sugestão concisa de como resolver (máximo 2 frases)

Responda SEMPRE neste formato JSON exato, sem texto adicional:
{
  "prioridade": "...",
  "categoria": "...",
  "sugestao": "..."
}

Critérios de prioridade:
- critica: sistema fora do ar, perda de dados, bloqueio total de trabalho
- alta: afeta múltiplos usuários ou processo crítico de negócio
- media: afeta um usuário, mas tem workaround
- baixa: dúvida, melhoria ou solicitação não urgente`;

// ================================================================
// AGENTE AUTOMÁTICO — dispara sozinho quando um ticket é criado
// Não há interação humana, ele analisa e persiste resultado no banco
// ================================================================
export async function agenteAuditarTicket(ticketId: number): Promise<void> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

  if (!ticket) {
    console.error(`[AGENTE AUTO] Ticket ${ticketId} não encontrado.`);
    return;
  }

  console.log(`[AGENTE AUTO] Analisando ticket #${ticketId}: "${ticket.titulo}"`);

  // Marca como em análise imediatamente
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "em_analise" },
  });

  const prompt = `Analise este ticket de suporte:

Título: ${ticket.titulo}
Descrição: ${ticket.descricao}`;

  // ---- RAG: injeta conhecimento relevante da base interna ----
  // Busca artigos semanticamente próximos ao conteúdo do ticket.
  // Se encontrados, são injetados no prompt para enriquecer a sugestão de solução.
  const contextosRAG = await buscarConhecimentoRelevante(`${ticket.titulo} ${ticket.descricao}`);
  const promptComRAG = contextosRAG.length > 0
    ? prompt + `\n\nCONHECIMENTO DA BASE INTERNA (use para melhorar a sugestão de solução):\n` +
      contextosRAG.map((c) => `### ${c.titulo}\n${c.conteudo}`).join("\n\n") +
      `\n\nClassifique e sugira solução conforme as instruções.`
    : prompt + `\n\nClassifique e sugira solução conforme as instruções.`;

  if (contextosRAG.length > 0) {
    console.log(`[AGENTE AUTO] RAG: ${contextosRAG.length} artigo(s) encontrado(s): ${contextosRAG.map(c => c.titulo).join(", ")}`);
  }
  // ----------------------------------------------------------

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM_AUDITOR,
      messages: [{ role: "user", content: promptComRAG }],
    });

    const textBlock = response.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined;
    let textoResposta = textBlock?.text ?? "{}";

    console.log(`[AGENTE AUTO] Resposta bruta: "${textoResposta.slice(0, 120)}..."`);

    // Extrai JSON de forma robusta independente do formato:
    // 1. Se o Claude usou ```json ... ```, split('```') pega o miolo
    if (textoResposta.includes("```")) {
      const partes = textoResposta.split("```");
      // partes[1] = "json\n{...}\n" — remove a tag "json" da primeira linha
      textoResposta = (partes[1] ?? "").replace(/^json\s*/i, "").trim();
    }
    // 2. Se ainda não começa com {, extrai o primeiro objeto JSON do texto
    if (!textoResposta.trimStart().startsWith("{")) {
      const match = textoResposta.match(/\{[\s\S]*\}/);
      textoResposta = match ? match[0] : "{}";
    }

    console.log(`[AGENTE AUTO] JSON extraído: ${textoResposta}`);

    // Parse do JSON retornado pelo modelo
    const analise = JSON.parse(textoResposta) as {
      prioridade: string;
      categoria: string;
      sugestao: string;
    };

    if (!analise.prioridade || !analise.categoria || !analise.sugestao) {
      throw new Error(`JSON incompleto: ${JSON.stringify(analise)}`);
    }

    // Persiste a análise no banco — isso é o agente "agindo no mundo real"
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        prioridade: analise.prioridade,
        categoria: analise.categoria,
        sugestaoIA: analise.sugestao,
        status: "aberto", // volta para aberto após análise (pronto para atendente)
      },
    });

    console.log(`[AGENTE AUTO] Ticket #${ticketId} classificado:`);
    console.log(`  Prioridade: ${analise.prioridade}`);
    console.log(`  Categoria:  ${analise.categoria}`);
    console.log(`  Sugestão:   ${analise.sugestao}`);
  } catch (error) {
    // Se o modelo não retornar JSON válido ou outro erro, loga e segue
    console.error(`[AGENTE AUTO] Erro ao analisar ticket #${ticketId}:`, error);
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "aberto" },
    });
  }
}
