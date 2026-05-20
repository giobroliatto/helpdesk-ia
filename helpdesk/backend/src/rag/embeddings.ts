// ================================================================
// GERAÇÃO DE EMBEDDINGS (RAG — Passo 1)
//
// Um embedding é um vetor de números que representa o SIGNIFICADO
// de um texto. Textos com significado parecido têm vetores próximos.
//
// Modelo: all-MiniLM-L6-v2 (~80MB, roda 100% local, sem API key)
// Dimensões: 384 floats por texto
// Primeira execução: baixa o modelo (~10s)
// Execuções seguintes: carrega do cache (~1s)
// ================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipelineCache: any = null;

export async function gerarEmbedding(texto: string): Promise<number[]> {
  if (!pipelineCache) {
    process.stderr.write("[RAG] Carregando modelo de embeddings (primeira vez demora ~10s)...\n");

    // @xenova/transformers é ESM-only — dynamic import funciona em CommonJS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import("@xenova/transformers") as any;
    pipelineCache = await mod.pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

    process.stderr.write("[RAG] Modelo pronto.\n");
  }

  // pooling: 'mean' → comprime os vetores de cada token em um vetor único
  // normalize: true  → normaliza para comprimento 1 (necessário para cosseno)
  const output = await pipelineCache(texto, { pooling: "mean", normalize: true });
  return Array.from(output.data) as number[];
}
