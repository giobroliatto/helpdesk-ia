import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

if (!apiKey) {
  throw new Error(
    "Defina a variável de ambiente ANTHROPIC_API_KEY antes de executar o script."
  );
}

const client = new Anthropic({
  apiKey
});

// ============================================
// FASE 1: Messages, System Prompt, Max Tokens
// ============================================

// Exemplo 1: Chamada simples (sem contexto anterior)
async function exemplo1_ChamadaSimples() {
  console.log("\n=== EXEMPLO 1: Chamada Simples (sem histórico) ===\n");
  console.log("Pergunta: Qual é a capital do Brasil?");

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: "Qual é a capital do Brasil?"
        }
      ]
    });

    const text = response.content.find((block) => block.type === "text")?.text;
    console.log("Resposta:");
    console.log(text);
    console.log(`\nTokens usados: ${response.usage.input_tokens} entrada + ${response.usage.output_tokens} saída`);
  } catch (error) {
    console.error("Erro:", error.message);
  }
}

// Exemplo 2: Com histórico (messages)
// Analogia: é como o modelo "lembrar" de coisas que você disse antes
async function exemplo2_ComHistorico() {
  console.log("\n=== EXEMPLO 2: Com Histórico (messages) ===\n");
  console.log("Simulate uma conversa de 2 turnos:");
  console.log("Turno 1: Usuário pergunta sobre Python");
  console.log("Turno 2: Usuário faz uma pergunta relacionada (que depende do contexto anterior)");

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 150,
      messages: [
        // Turno 1: contexto anterior (como se o usuário tivesse perguntado antes)
        {
          role: "user",
          content: "Me explica o que é Python?"
        },
        {
          role: "assistant",
          content: "Python é uma linguagem de programação interpretada, legível e versátil."
        },
        // Turno 2: pergunta que depende do contexto
        {
          role: "user",
          content: "Como eu uso isso para aprender sobre IA?"
        }
      ]
    });

    const text = response.content.find((block) => block.type === "text")?.text;
    console.log("Resposta do turno 2:");
    console.log(text);
    console.log(`\nTokens usados: ${response.usage.input_tokens} entrada + ${response.usage.output_tokens} saída`);
  } catch (error) {
    console.error("Erro:", error.message);
  }
}

// Exemplo 3: Com system prompt
// Analogia: é como dar um "trabalho" ou "personagem" pro modelo
async function exemplo3_ComSystemPrompt() {
  console.log("\n=== EXEMPLO 3: Com System Prompt (instruções) ===\n");
  console.log("Role: 'Você é um estagiário entusiasmado com 2 dias na empresa'");
  console.log("Pergunta: Explica o que é um servidor web?");

  try {
    const response = await client.models.generateContent({
      model,
      messages: [
        {
          role: "user",
          content: "Explica o que é um servidor web?"
        }
      ],
      system: "Você é um estagiário entusiasmado com apenas 2 dias de experiência na empresa. Responda de forma simples, com entusiasmo, mas reconhecendo que não sabe tudo. Use analogias do dia a dia."
    });

    console.log("Tentando com system prompt via generateContent...");
    // Nota: se der erro, é porque essa API pode ter diferenças
  } catch (error) {
    console.log("Alternativa: usando system no messages.create (menos suportado em alguns SDKs)");
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 200,
        system: "Você é um estagiário entusiasmado com apenas 2 dias de experiência na empresa. Responda de forma simples, com entusiasmo, mas reconhecendo que não sabe tudo.",
        messages: [
          {
            role: "user",
            content: "Explica o que é um servidor web?"
          }
        ]
      });

      const text = response.content.find((block) => block.type === "text")?.text;
      console.log("Resposta (com system prompt):");
      console.log(text);
      console.log(`\nTokens usados: ${response.usage.input_tokens} entrada + ${response.usage.output_tokens} saída`);
    } catch (error2) {
      console.error("Erro:", error2.message);
    }
  }
}

// Exemplo 4: Comparando max_tokens
// Analogia: é como dizer ao modelo "responda em 1 parágrafo" vs "responda bem detalhado"
async function exemplo4_MaxTokens() {
  console.log("\n=== EXEMPLO 4: Comparando max_tokens ===\n");
  console.log("Mesma pergunta, 2 limites diferentes:\n");

  const pergunta = "O que é inteligência artificial?";

  // Resposta curta (max_tokens baixo)
  console.log("--- Resposta CURTA (max_tokens=50) ---");
  try {
    const responseShort = await client.messages.create({
      model,
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: pergunta
        }
      ]
    });

    const textShort = responseShort.content.find((block) => block.type === "text")?.text;
    console.log(textShort);
    console.log(`Tokens usados: ${responseShort.usage.output_tokens} (output)\n`);
  } catch (error) {
    console.error("Erro:", error.message);
  }

  // Resposta longa (max_tokens alto)
  console.log("--- Resposta LONGA (max_tokens=300) ---");
  try {
    const responseLong = await client.messages.create({
      model,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: pergunta
        }
      ]
    });

    const textLong = responseLong.content.find((block) => block.type === "text")?.text;
    console.log(textLong);
    console.log(`Tokens usados: ${responseLong.usage.output_tokens} (output)`);
  } catch (error) {
    console.error("Erro:", error.message);
  }
}

// ============================================
// Executar todos os exemplos
// ============================================
async function runAll() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║  FASE 1: Aprendendo Messages, System & Max ║");
  console.log("╚════════════════════════════════════════════╝");

  await exemplo1_ChamadaSimples();
  await exemplo2_ComHistorico();
  await exemplo3_ComSystemPrompt();
  await exemplo4_MaxTokens();

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║           FIM DOS EXEMPLOS                  ║");
  console.log("╚════════════════════════════════════════════╝\n");
}

runAll().catch(console.error);
