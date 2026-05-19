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
// FASE 2: Tool Use (Agentes Simples)
// ============================================

// Definir as "ferramentas" que o modelo pode usar
const tools = [
  {
    name: "calculadora",
    description: "Realiza operações matemáticas básicas",
    input_schema: {
      type: "object",
      properties: {
        operacao: {
          type: "string",
          description: "A operação matemática (ex: '2+2', '10*5', '100/4')"
        }
      },
      required: ["operacao"]
    }
  },
  {
    name: "buscar_informacao",
    description: "Busca informações sobre um tópico (simulado para aula)",
    input_schema: {
      type: "object",
      properties: {
        topico: {
          type: "string",
          description: "O tópico que você quer pesquisar"
        }
      },
      required: ["topico"]
    }
  }
];

// ============================================
// Simulação de ferramentas (em produção seriam APIs reais)
// ============================================

function executarCalculadora(operacao) {
  try {
    // ⚠️ AVISO: eval é perigoso em produção! Aqui é só pra demonstração educacional.
    // Em código real, use uma biblioteca segura como math.js
    const resultado = eval(operacao);
    return {
      sucesso: true,
      resultado: resultado,
      descricao: `${operacao} = ${resultado}`
    };
  } catch (error) {
    return {
      sucesso: false,
      erro: error.message,
      descricao: `Não consegui calcular: ${error.message}`
    };
  }
}

function buscarInformacao(topico) {
  // Simulação: em produção seria uma chamada a Wikipedia API, Google, etc
  const informacoes = {
    "inteligência artificial": "IA é a simulação de inteligência humana por máquinas. Envolve aprendizado, reconhecimento de padrões e tomada de decisão.",
    "machine learning": "ML é um ramo da IA onde sistemas aprendem com dados, sem serem programados explicitamente para cada caso.",
    "prompt": "Um prompt é a instrução que você dá para um modelo de IA. A qualidade do prompt afeta diretamente a qualidade da resposta.",
    "token": "Token é uma unidade de texto. Aproximadamente 1 token = 4 caracteres em inglês. APIs cobram por tokens.",
    "agente": "Um agente de IA é um sistema que pode usar ferramentas, tomar decisões e agir no mundo real, não só conversar."
  };

  const topicoBuscado = topico.toLowerCase();
  const resultado = informacoes[topicoBuscado];

  return {
    sucesso: resultado ? true : false,
    resultado: resultado || `Não encontrei informação sobre "${topico}". Tente um tópico diferente.`,
    descricao: resultado 
      ? `Encontrei sobre "${topico}": ${resultado}`
      : `Sem informações sobre "${topico}".`
  };
}

function executarTool(toolName, toolInput) {
  console.log(`\n🔧 Usando ferramenta: ${toolName}`);
  console.log(`   Parâmetros: ${JSON.stringify(toolInput)}`);

  if (toolName === "calculadora") {
    return executarCalculadora(toolInput.operacao);
  } else if (toolName === "buscar_informacao") {
    return buscarInformacao(toolInput.topico);
  }

  return { sucesso: false, erro: "Ferramenta desconhecida" };
}

// ============================================
// Histórico de mensagens
// ============================================
const messages = [];

const systemPrompt = `Você é um assistente inteligente que pode usar ferramentas para responder melhor.

Quando o usuário faz uma pergunta que requer:
- Cálculos: use a ferramenta "calculadora"
- Informações sobre um tópico: use "buscar_informacao"
- Conversação simples: responda diretamente

Sempre explique de forma didática. Use analogias quando possível.`;

async function chat(userMessage) {
  try {
    // Adiciona mensagem do usuário
    messages.push({
      role: "user",
      content: userMessage
    });

    console.log("\n⏳ Processando...\n");

    let response = await client.messages.create({
      model,
      max_tokens: 100,
      system: systemPrompt,
      tools: tools,
      messages: messages
    });

    // Loop para lidar com chamadas de ferramenta
    // (o modelo pode chamar uma ferramenta, precisamos executar, e enviar de volta)
    while (response.stop_reason === "tool_use") {
      // Encontra o bloco de tool_use na resposta
      const toolUseBlock = response.content.find((block) => block.type === "tool_use");

      if (!toolUseBlock) break;

      // Executa a ferramenta
      const toolResult = executarTool(toolUseBlock.name, toolUseBlock.input);
      console.log(`   ✅ Resultado: ${toolResult.descricao}\n`);

      // Adiciona a resposta completa (incluindo tool_use) ao histórico
      messages.push({
        role: "assistant",
        content: response.content
      });

      // Adiciona o resultado da ferramenta para o modelo processar
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUseBlock.id,
            content: JSON.stringify(toolResult)
          }
        ]
      });

      // Chama a API novamente para obter resposta final
      response = await client.messages.create({
        model,
        max_tokens: 100,
        system: systemPrompt,
        tools: tools,
        messages: messages
      });
    }

    // Extrai o texto final
    const textBlock = response.content.find((block) => block.type === "text");
    const assistantText = textBlock?.text || "Sem resposta de texto.";

    // Adiciona resposta final ao histórico
    messages.push({
      role: "assistant",
      content: assistantText
    });

    console.log("🤖 IA:");
    console.log(assistantText);
    console.log(
      `\n📊 Tokens: ${response.usage.input_tokens} entrada + ${response.usage.output_tokens} saída = ${response.usage.input_tokens + response.usage.output_tokens} total`
    );
    console.log(`📚 Histórico: ${messages.length} turnos de conversa\n`);
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
}

// ============================================
// Interface de entrada
// ============================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function promptUser() {
  rl.question("👤 Você: ", async (input) => {
    if (input.toLowerCase() === "sair") {
      console.log("\n✅ Conversa encerrada! Total de", messages.length, "mensagens.");
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
// Início
// ============================================
console.log("╔════════════════════════════════════════════╗");
console.log("║   FASE 2: Tool Use (Agentes Simples)      ║");
console.log("╚════════════════════════════════════════════╝\n");

console.log("Ferramentas disponíveis:");
console.log("🧮 Calculadora - para cálculos matemáticos");
console.log("🔍 Buscar Info - para pesquisar sobre tópicos (IA, ML, Prompts, Tokens, Agentes)\n");

console.log("Teste coisas como:");
console.log('- "Quanto é 42 * 7?"');
console.log('- "O que é machine learning?"');
console.log('- "Me explica o que é um token e depois calcula 1000 / 4"');
console.log('- "sair" para encerrar\n');

promptUser();
