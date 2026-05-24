import Anthropic from "@anthropic-ai/sdk";
import prisma from "../db/prisma";
import { buscarConhecimentoRelevante } from "../rag/buscar";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5";

// ================================================================
// PROMPT ENGINEERING — Few-Shot + Chain of Thought
//
// Few-Shot: 4 exemplos reais calibram o modelo nos casos limítrofes
//   (especialmente media vs alta, que são os mais ambíguos)
//
// Chain of Thought: o campo "raciocinio" força o modelo a pensar em
//   voz alta ANTES de decidir a prioridade. Isso reduz erros de
//   classificação e torna cada decisão auditável no banco.
//   Ordem importa: raciocinio vem primeiro no JSON para que o modelo
//   "escreva o pensamento" antes de comprometer com uma prioridade.
// ================================================================
const SYSTEM_AUDITOR = `Você é um auditor automático de tickets de suporte.

Analise cada ticket e responda SEMPRE neste formato JSON exato, sem texto adicional:
{
  "raciocinio": "raciocínio passo a passo: quem é afetado, existe workaround, é processo crítico de negócio?",
  "prioridade": "baixa | media | alta | critica",
  "categoria": "ti | rh | financeiro | geral",
  "sugestao": "sugestão concisa de resolução (máximo 2 frases)"
}

Critérios de prioridade:
- critica: sistema fora do ar, perda de dados, bloqueio total de trabalho
- alta: afeta múltiplos usuários ou processo crítico de negócio
- media: afeta um usuário, mas tem workaround
- baixa: dúvida, melhoria ou solicitação não urgente

--- EXEMPLOS ---

Ticket: "Servidor de produção fora do ar"
Descrição: "Sistema ERP inacessível. Ninguém consegue emitir nota fiscal ou acessar pedidos. Empresa parada há 30 minutos."
Resposta:
{
  "raciocinio": "Afeta toda a empresa. Processo crítico de negócio (ERP, nota fiscal). Sem workaround possível. Bloqueio total de trabalho com impacto financeiro imediato.",
  "prioridade": "critica",
  "categoria": "ti",
  "sugestao": "Acionar imediatamente o time de infraestrutura e verificar logs do servidor. Notificar gestores sobre o impacto."
}

Ticket: "Sistema de ponto eletrônico não registra"
Descrição: "O relógio de ponto parou de funcionar. 80 funcionários não conseguem bater o ponto. O turno começa em 1 hora."
Resposta:
{
  "raciocinio": "Afeta múltiplos usuários (80 funcionários). Processo de RH crítico com prazo urgente (1 hora). Sem workaround prático para 80 pessoas.",
  "prioridade": "alta",
  "categoria": "rh",
  "sugestao": "Reiniciar o serviço do ponto eletrônico e verificar conectividade com o servidor de RH. Como contingência, registrar ponto manual com supervisão."
}

Ticket: "Excel travando ao abrir planilha grande"
Descrição: "Minha planilha de controle mensal com 50 mil linhas fica travando. Consigo trabalhar em partes menores como workaround."
Resposta:
{
  "raciocinio": "Afeta apenas 1 usuário. Existe workaround funcional (trabalhar em partes menores). Não é processo crítico de negócio. Impacto é na produtividade, não no bloqueio.",
  "prioridade": "media",
  "categoria": "ti",
  "sugestao": "Dividir a planilha em arquivos menores ou usar filtros para carregar apenas o período necessário. Verificar se há atualizações pendentes do Office."
}

Ticket: "Solicitar troca de mouse para modelo ergonômico"
Descrição: "Meu mouse atual funciona bem, mas gostaria de trocar por um modelo ergonômico para maior conforto no dia a dia."
Resposta:
{
  "raciocinio": "Não é um problema, é uma solicitação de melhoria de conforto. Nenhum bloqueio ao trabalho. O equipamento atual funciona normalmente.",
  "prioridade": "baixa",
  "categoria": "ti",
  "sugestao": "Abrir solicitação de compra via setor de TI com justificativa de ergonomia. Aprovação sujeita a disponibilidade de orçamento."
}

--- FIM DOS EXEMPLOS ---`;

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
      max_tokens: 600,  // CoT precisa de mais tokens que o JSON puro
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
      raciocinio: string;
      prioridade: string;
      categoria: string;
      sugestao: string;
    };

    if (!analise.raciocinio || !analise.prioridade || !analise.categoria || !analise.sugestao) {
      throw new Error(`JSON incompleto: ${JSON.stringify(analise)}`);
    }

    // Persiste a análise no banco — isso é o agente "agindo no mundo real"
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        prioridade: analise.prioridade,
        categoria: analise.categoria,
        sugestaoIA: analise.sugestao,
        raciocinioIA: analise.raciocinio,
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
