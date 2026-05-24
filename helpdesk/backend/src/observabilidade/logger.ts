import prisma from "../db/prisma";

// ================================================================
// OBSERVABILIDADE — logger de chamadas à API da Anthropic
//
// Preços claude-sonnet-4-5 (mai/2026):
//   Input:  $3,00 / 1M tokens  → $0.000003 por token
//   Output: $15,00 / 1M tokens → $0.000015 por token
//
// Por que input e output têm preços diferentes?
//   O modelo precisa processar CADA token do input antes de gerar
//   qualquer output. Output requer mais computação (geração autoregressiva
//   token a token) — por isso custa 5× mais que input.
//
// O que é rastreado:
//   - Tokens de input e output separados (preços diferentes)
//   - Custo estimado em USD por chamada
//   - Latência total (do create() ao retorno)
//   - Quantas tool_use calls aconteceram no loop
//   - Qual agente / qual ticketId (para correlação)
// ================================================================

const CUSTO_INPUT  = 3.00  / 1_000_000; // $3 por milhão de tokens de input
const CUSTO_OUTPUT = 15.00 / 1_000_000; // $15 por milhão de tokens de output

export interface LogParams {
  agente: string;
  inputTokens: number;
  outputTokens: number;
  latenciaMs: number;
  toolCalls?: number;
  ticketId?: number | null;
}

export async function logChamadaIA(params: LogParams): Promise<void> {
  const custoUsd =
    params.inputTokens  * CUSTO_INPUT +
    params.outputTokens * CUSTO_OUTPUT;

  await prisma.logChamadaIA.create({
    data: {
      agente:       params.agente,
      inputTokens:  params.inputTokens,
      outputTokens: params.outputTokens,
      custoUsd,
      latenciaMs:   params.latenciaMs,
      toolCalls:    params.toolCalls ?? 0,
      ticketId:     params.ticketId ?? null,
    },
  });

  // Log no console em formato compacto para debug
  console.log(
    `[OBS] ${params.agente.padEnd(16)} | ` +
    `in:${String(params.inputTokens).padStart(5)} out:${String(params.outputTokens).padStart(4)} | ` +
    `$${custoUsd.toFixed(5)} | ` +
    `${params.latenciaMs}ms | ` +
    `tools:${params.toolCalls ?? 0}`
  );
}
