# Fase 1: Messages, System Prompt, Max Tokens

Bem-vindo ao aprendizado prático de IA! Aqui você entende os 3 pilares do prompt engineering de forma concreta.

---

## 1️⃣ MESSAGES: O Histórico (Memória da Conversa)

**O que é:**
Array de turnos de conversa que você envia junto com cada pergunta.

**Analogia:**
É como ter um caderninho de conversa com a IA. Toda vez que você pergunta algo, você envia também todas as mensagens anteriores. A IA lê tudo isso e entende o contexto completo.

**Estrutura:**
```javascript
messages: [
  { role: "user", content: "Pergunta 1" },
  { role: "assistant", content: "Resposta 1" },
  { role: "user", content: "Pergunta 2 que depende da Pergunta 1" }
]
```

**Por que importa:**
Sem histórico: "O que é Python?" → resposta padrão
Com histórico: "Python é legal?" (referência implícita a Python anterior) → respostas que fazem sentido

**No seu script interativo:**
- Cada vez que você digita algo, esse algo vai para o array `messages`.
- A IA lê TUDO que está em `messages` antes de responder.
- Próxima pergunta vai ter contexto da anterior.
- Isso simula uma conversa de verdade, não perguntas isoladas.

---

## 2️⃣ SYSTEM PROMPT: A Personalidade/Instruções

**O que é:**
Uma instrução especial que molda como o modelo se comporta em TODA a conversa.

**Analogia:**
É como contar pro modelo qual é o seu "trabalho" antes de qualquer pergunta.

Se você diz:
- "Você é um pirata" → respostas vêm com "Arrrr!" e jeito de pirata
- "Você é um professor" → respostas didáticas com exemplos
- "Responda em 1 parágrafo" → tudo respeitará isso

**Estrutura:**
```javascript
system: "Você é um professor de IA muito didático. Respostas simples com analogias."
```

**Por que importa:**
Mesma pergunta, 2 system prompts diferentes = 2 respostas completamente diferentes em estilo/qualidade.

**No seu script interativo:**
```javascript
const systemPrompt = `Você é um professor de IA muito didático e paciente...`
```

A IA vai sempre se lembrar dessa instrução. Ela NÃO vai virar pirata ou técnico demais.

---

## 3️⃣ MAX_TOKENS: O Limite de Resposta

**O que é:**
Limite máximo de "palavras" (tecnicamente: tokens) que a IA pode gerar.

**Analogia:**
É como dizer ao modelo: "Sua resposta pode ter no máximo X tokens".
1 token ≈ 4 caracteres em média.

- max_tokens=50 → resposta superficial e rápida
- max_tokens=200 → resposta equilibrada
- max_tokens=2000 → resposta detalhada e bem pensada

**Por que importa:**
- Controla o custo (mais tokens = mais caro).
- Controla a velocidade (menos tokens = resposta mais rápida).
- Controla qualidade (muito baixo = resposta incompleta, muito alto = desnecessário).

**No seu script interativo:**
```javascript
max_tokens: 200
```
Cada resposta não vai passar de ~200 tokens (≈800 caracteres).

---

## Como Rodar o Script Interativo

```powershell
cd C:\aulas-claude\ia
node .\interativo.js
```

### Exemplo de Conversa:

```
👤 Você: O que é um agente de IA?
🤖 IA: Um agente de IA é um programa que pode pensar e tomar decisões por conta própria, como um estagiário competente. Diferente de um simples chatbot, ele não só responde — ele *age* no mundo real. Tipo, em vez de só conversar, ele pode executar tarefas, pedir informações, e ajustar o plano baseado no que aprender. Você já usou um agente de IA sem perceber?

📊 Tokens: 45 entrada + 78 saída = 123 total
📚 Histórico atual: 2 mensagens na conversa

👤 Você: Como é diferente de um LLM normal?
🤖 IA: Ótima pergunta! Um LLM (como eu) só processa texto — você pergunta, eu respondo, fim. Um agente de IA é um LLM + ferramentas extras. O agente pode chamar APIs, acessar bancos de dados, ou executar código. É a diferença entre um consultor que dá conselhos vs um consultor que pode sair e implementar a solução.

📊 Tokens: 156 entrada + 92 saída = 248 total
📚 Histórico atual: 4 mensagens na conversa

👤 Você: sair
✅ Até logo! Você teve uma conversa com histórico de 4 mensagens.
```

---

## O Que Você Vai Aprender Conversando

1. **MESSAGES funcionam**: Perceba como a IA se lembra do que você disse antes.
2. **SYSTEM PROMPT funciona**: Perceba como a IA mantém a personalidade de "professor".
3. **TOKENS**: Veja que cada resposta custa tokens, e o histórico cresce (mais mensagens = mais tokens gastos na próxima pergunta).
4. **Feedback em tempo real**: Você vê exatamente o que está acontecendo, não só resultado final.

---

## Próximo Passo (Fase 2)

Quando você entender bem esses 3 conceitos na prática, vamos para:
- **Tool Use**: Dar ferramentas pro modelo (ex: calculadora, acesso a API)
- **Agentes**: Deixar a IA decidir quando usar cada ferramenta

Mas por enquanto: **converse, brinque, entenda os 3 pilares!** 🚀
