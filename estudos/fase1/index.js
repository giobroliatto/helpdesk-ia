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

try {
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: "Olá! Me explica o que é um agente de IA em 2 frases."
      }
    ]
  });

  const firstTextBlock = response.content.find((block) => block.type === "text");
  console.log("Resposta do modelo:\n");
  console.log(firstTextBlock?.text ?? "Sem conteúdo de texto na resposta.");
} catch (error) {
  const status = error?.status;
  const message = error?.message || "Erro desconhecido ao chamar a API.";

  if (status === 429) {
    console.error("Erro 429: cota/limite excedido na API da Anthropic.");
    console.error("Revise uso da conta, limites por minuto e billing.");
  } else if (status === 401 || status === 403) {
    console.error("Erro de autenticação/permissão.");
    console.error("Confira ANTHROPIC_API_KEY e permissões da sua conta/projeto.");
  } else if (status === 404) {
    console.error("Erro 404: modelo não encontrado ou descontinuado.");
    console.error("Defina ANTHROPIC_MODEL com um modelo ativo na sua conta.");
    console.error("Exemplo: $env:ANTHROPIC_MODEL='claude-sonnet-4-5'");
  } else {
    console.error("Falha na chamada da API:", message);
  }

  process.exitCode = 1;
}