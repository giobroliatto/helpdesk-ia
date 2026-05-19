import Anthropic from "@anthropic-ai/sdk";
import readline from "readline";

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
// Script interativo para conversar com a IA
// ============================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Array para armazenar histórico (demonstra "messages")
const messages = [];

// System prompt: dá uma "personalidade" ao modelo
const systemPrompt = `Você é um professor de IA muito didático e paciente. 
Suas respostas devem:
- Ser simples e claras (evitar jargão desnecessário)
- Usar analogias do dia a dia quando possível
- Ser concisas (máximo 3-4 frases por resposta)
- Sempre terminar com uma pergunta para manter a conversa viva`;

async function chat(userMessage) {
  try {
    // Adiciona a mensagem do usuário ao histórico
    messages.push({
      role: "user",
      content: userMessage
    });

    // Chama a API com o histórico completo (ISSO É O CONCEITO DE MESSAGES)
    const response = await client.messages.create({
      model,
      max_tokens: 200,
      system: systemPrompt,
      messages: messages
    });

    const assistantText = response.content.find((block) => block.type === "text")?.text;

    // Adiciona a resposta ao histórico (para próxima conversa ter contexto)
    messages.push({
      role: "assistant",
      content: assistantText
    });

    // Mostra a resposta e tokens
    console.log("\n🤖 IA:");
    console.log(assistantText);
    console.log(
      `\n📊 Tokens: ${response.usage.input_tokens} entrada + ${response.usage.output_tokens} saída = ${response.usage.input_tokens + response.usage.output_tokens} total`
    );
    console.log(
      `📚 Histórico atual: ${messages.length} mensagens na conversa\n`
    );
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
}

function promptUser() {
  rl.question("👤 Você: ", async (input) => {
    if (input.toLowerCase() === "sair") {
      console.log("\n✅ Até logo! Você teve uma conversa com histórico de", messages.length, "mensagens.");
      rl.close();
      return;
    }

    if (input.trim()) {
      await chat(input);
    }

    promptUser();
  });
}

// ============================================
// Início da conversa
// ============================================
console.log("╔════════════════════════════════════════════╗");
console.log("║   Chat Interativo - Aprenda sobre IA       ║");
console.log("╚════════════════════════════════════════════╝\n");

console.log("Conceitos em ação:");
console.log("1️⃣  MESSAGES (histórico) - a IA vai lembrar do que você disse antes");
console.log("2️⃣  SYSTEM PROMPT - a IA é um professor didático");
console.log("3️⃣  TOKENS - você vê quanto de \"energia\" cada resposta usa\n");

console.log('Digite sua pergunta sobre IA. Escreva "sair" para encerrar.\n');

promptUser();
