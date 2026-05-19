# Fase 2: Tool Use (Agentes Simples)

Bem-vindo à próxima evolução! Aqui você aprende como dar "superpoderes" ao modelo, deixando-o decidir quando usar ferramentas.

---

## 🎯 O Grande Conceito: Tool Use

**O que é:**
É dar ao modelo uma lista de "ferramentas" que ele pode chamar. O modelo então decide:
- Preciso dessa ferramenta pra responder melhor?
- Se sim, qual ferramenta?
- Quais parâmetros passar?

**Analogia:**
Você é o gerente de um projeto. Você tem 2 funcionários:
- **Copywriter** (assistente baseado em conversas)
- **Pesquisador** (ferramenta de busca)
- **Calculista** (ferramenta de cálculos)

Quando alguém pergunta algo, o gerente (modelo) decide:
- Preciso só do copywriter? → responde direto
- Preciso do pesquisador? → chama o pesquisador
- Preciso do calculista? → chama o calculista

---

## ⚙️ Como Funciona: Tool Use Step by Step

### 1. Você define as ferramentas (Schema)

```javascript
const tools = [
  {
    name: "calculadora",
    description: "Realiza operações matemáticas",
    input_schema: {
      type: "object",
      properties: {
        operacao: {
          type: "string",
          description: "A operação (ex: '2+2')"
        }
      },
      required: ["operacao"]
    }
  }
];
```

**O que é cada parte:**
- `name`: como o modelo chama a ferramenta
- `description`: explica pro modelo o que faz
- `input_schema`: descreve quais parâmetros a ferramenta aceita (como um contrato)

### 2. Você envia as ferramentas junto com o histórico

```javascript
const response = await client.messages.create({
  model,
  messages: messages,
  tools: tools  // ← aqui estão as ferramentas
});
```

### 3. O modelo analisa e decide

O modelo recebe tudo (histórico + ferramentas) e pensa:
- "O usuário perguntou: 'Quanto é 42 * 7?'"
- "Eu tenho uma ferramenta chamada 'calculadora'"
- "Essa pergunta precisa de cálculo"
- "Vou chamar a calculadora com operacao='42*7'"

### 4. Você executa a ferramenta

```javascript
if (response.stop_reason === "tool_use") {
  const toolUseBlock = response.content.find(block => block.type === "tool_use");
  const resultado = executarTool(toolUseBlock.name, toolUseBlock.input);
}
```

### 5. Você devolve o resultado pro modelo

```javascript
messages.push({
  role: "user",
  content: [{
    type: "tool_result",
    tool_use_id: toolUseBlock.id,
    content: JSON.stringify(resultado)
  }]
});
```

### 6. O modelo gera a resposta final

```javascript
// Chama a API de novo com o resultado da ferramenta
const finalResponse = await client.messages.create({
  model,
  messages: messages,
  tools: tools
});
```

---

## 🔄 O Fluxo Completo (Visual)

```
Usuário: "Quanto é 42 * 7?"
           ↓
Modelo recebe + vê que tem ferramenta "calculadora"
           ↓
Modelo pensa: "Preciso usar calculadora com operacao='42*7'"
           ↓
Você executa: resultado = 294
           ↓
Você devolve pro modelo: "A calculadora respondeu: 294"
           ↓
Modelo gera resposta: "42 * 7 = 294"
           ↓
Usuário recebe: "42 * 7 = 294"
```

---

## 🚀 O Que Você Vai Ver no Script

### Exemplo 1: Pergunta Simples (sem tools)
```
👤 Você: O que é IA?
🤖 IA: [responde direto, sem usar ferramentas]
```

### Exemplo 2: Pergunta com Cálculo
```
👤 Você: Quanto é 42 * 7?
🔧 Usando ferramenta: calculadora
   Parâmetros: { operacao: "42*7" }
   ✅ Resultado: 42*7 = 294

🤖 IA: 42 multiplicado por 7 é 294. [explicação didática]
```

### Exemplo 3: Pergunta com Busca + Cálculo
```
👤 Você: Me explica token e depois calcula 1000 / 4
🔧 Usando ferramenta: buscar_informacao
   Parâmetros: { topico: "token" }
   ✅ Resultado: Token é uma unidade de texto...

🔧 Usando ferramenta: calculadora
   Parâmetros: { operacao: "1000/4" }
   ✅ Resultado: 1000/4 = 250

🤖 IA: Token é... [explicação]. 1000 dividido por 4 = 250. [contexto]
```

---

## 💡 Por Que Isso É Importante (Agentes)

**Sem Tool Use (Chatbot):**
- Modelo só fala
- Não consegue acessar dados reais
- Não consegue fazer operações
- Respostas podem ser imprecisas

**Com Tool Use (Agente Simples):**
- Modelo pensa e decide usar ferramentas
- Consegue acessar dados, cálculos, APIs
- Respostas são precisas (baseadas em dados reais)
- Pode executar tarefas complexas

---

## 🛠️ Como Rodar

```powershell
cd C:\aulas-claude\ia
node .\fase2.js
```

**Perguntas pra testar:**
1. "Quanto é 123 + 456?" (deve usar calculadora)
2. "O que é prompt?" (deve usar buscar_informacao)
3. "Me explica IA e depois calcula 100 * 2" (deve usar 2 ferramentas)
4. "Qual é a capital do Brasil?" (deve responder direto, sem ferramentas)

---

## 🎓 O Que Você Aprende

1. **Schema/Contrato**: Como descrever ferramentas pra máquina entender
2. **Decisão do modelo**: Como a IA *escolhe* quando usar ferramentas
3. **Fluxo de controle**: Como você orquestra modelo + ferramentas + resultados
4. **Agente simples**: Tudo junto faz um "agente" que age, não só conversa

---

## ⚡ Próximo Passo (Fase 3)

Quando você dominar isso:
- Vamos criar **um MCP Server do zero**
- MCP = Model Context Protocol
- É o padrão de como passar contexto/ferramentas pro modelo
- Base para construir agentes reais, profissionais e reutilizáveis

---

## ❓ Dúvidas Comuns

**P: Por que chamar a API 2 vezes?**
R: Primeira vez o modelo decide "vou usar calculadora". Segunda vez o modelo lê o resultado e gera resposta final. É assim que agentes funcionam na realidade.

**P: E se o modelo não quiser usar ferramentas?**
R: Responde direto! Se não tem `tool_use` na resposta, é sinal que o modelo resolveu só conversando.

**P: Posso ter 100 ferramentas?**
R: Tecnicamente sim, mas quanto mais ferramentas, mais tokens gastos (o modelo precisa "ler" todas). Na prática: 3-10 é ideal.

