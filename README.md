# Help Desk com Agentes de IA 🤖

Um sistema completo de **Help Desk** com dois agentes de IA: um **interativo** (chat) e outro **automático** (análise de tickets).

## 🎯 O Projeto

Desenvolvido para explorar **Agentes de IA**, **Tool Use**, e como integrar modelos de linguagem (Claude) em aplicações reais. O sistema combina:

- **Backend Node.js + Express** com agentes Claude
- **Frontend Angular 21** com interface moderna
- **Banco de dados SQLite** com Prisma
- **Dois padrões de agentes AI**: reativo e automático

---

## 🏗️ Arquitetura

```
ia/
├── helpdesk/
│   ├── backend/              # Node.js + Express + Agentes Claude
│   │   ├── src/
│   │   │   ├── agents/       # Agentes (interativo e automático)
│   │   │   ├── routes/       # Endpoints HTTP
│   │   │   ├── tools/        # Ferramentas que os agentes usam
│   │   │   └── db/           # Setup Prisma
│   │   ├── prisma/           # Migrations e schema
│   │   └── scripts/          # Utilitários (limpar chat, etc)
│   │
│   └── frontend/             # Angular 21 Standalone
│       ├── src/app/
│       │   ├── pages/        # Componentes principais
│       │   ├── pipes/        # Transformação de dados (label, markdown)
│       │   ├── services/     # HTTP com backend
│       │   └── models/       # Types do TypeScript
│       └── src/styles.scss   # Estilos globais

└── estudos/                  # Fases de aprendizado
    ├── fase1/                # Fundamentos de agentes
    └── fase2/                # Tool use loop
```

---

## 🚀 Como Executar

### Pré-requisitos
- **Node.js** v24.15.0+
- **npm** v11.12.1+
- **Git**
- **Anthropic API Key** (obter em https://console.anthropic.com)

### Setup Backend

```bash
cd helpdesk/backend

# 1. Instalar dependências
npm install

# 2. Criar arquivo .env
echo "ANTHROPIC_API_KEY=sua_chave_aqui" > .env

# 3. Criar banco de dados
npx prisma migrate dev

# 4. Iniciar servidor
npm run dev
```

Backend roda em **http://localhost:3000**

### Setup Frontend

```bash
cd helpdesk/frontend

# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm start
```

Frontend roda em **http://localhost:4200**

### Servidor MCP (opcional)

```bash
cd helpdesk/backend
npx ts-node src/mcp/server.ts
```

Ou configure o `.vscode/mcp.json` (já incluído) e o VS Code inicia automaticamente.

---

## 🧠 Como Funcionam os Agentes

### Agente Interativo (Chat)

- **Tipo**: Reativo (responde ao usuário via chat)
- **Arquivo**: `backend/src/agents/agenteInterativo.ts`
- **Como usa**:
  1. Usuário faz pergunta
  2. Agente busca artigos relevantes via **RAG** na base de conhecimento
  3. Agente recebe histórico limitado (8 mensagens)
  4. Agente **chama ferramentas** para buscar dados frescos do banco
  5. Resposta chega em **streaming** — texto aparece progressivamente na tela

**Ferramentas disponíveis:**
- `listar_tickets` — lista tickets com filtros
- `buscar_ticket` — detalhes completos de um ticket
- `resumo_tickets` — contagem por status
- `fechar_ticket` — fecha um ticket (com HITL: só após confirmação do usuário)

> As mesmas ferramentas também são expostas via **servidor MCP** (`src/mcp/server.ts`),
> permitindo que o VS Code Copilot e o Claude Desktop as utilizem diretamente.

**Exemplo de uso:**
```
Usuário: "minha VPN não está conectando"
→ RAG encontra artigo: "VPN não conecta - troubleshooting" (similaridade 0.87)
→ Artigo é injetado no system prompt
→ Resposta chega em streaming — texto aparece conforme o Claude gera
```

### Agente Automático (Triagem)

- **Tipo**: Event-triggered (acionado quando novo ticket é criado)
- **Arquivo**: `backend/src/agents/agenteAutomatico.ts`
- **Como funciona:**
  1. Novo ticket criado via API
  2. Agente recebe título + descrição
  3. Agente **classifica**: prioridade, categoria, sugestão
  4. Agente **atualiza ticket** automaticamente

**Exemplo:**
```
Novo ticket: "Impressora não funciona no 3º andar"
→ Agente classifica: prioridade="media", categoria="ti", sugestao="Verificar conexão"
→ Ticket atualizado automaticamente
```

---

## 🛠️ Tecnologias

**Backend:**
- Express 5.2.1
- Prisma 7.8.0 + SQLite (via BetterSqlite3)
- Anthropic SDK @anthropic-ai/sdk ^0.96.0
- @modelcontextprotocol/sdk (servidor MCP)
- @xenova/transformers (embeddings locais para RAG)
- Zod (validação de schemas MCP)
- TypeScript
- ts-node

**Frontend:**
- Angular 21.2.0 (Standalone)
- Angular Material 21.2.11
- RxJS 7.8
- SCSS
- TypeScript

**DevOps:**
- Git
- Node.js v24.15.0

---

## 📚 Conceitos Aprendidos

### Tool Use Loop
Implementação do padrão de tool use do Claude:
```
1. Agente responde com tool_use block
2. Sistema executa a ferramenta
3. Sistema retorna tool_result ao agente
4. Agente gera resposta final (ou chama outra ferramenta)
```

**Arquivo**: `backend/src/agents/agenteInterativo.ts` (linha do loop)

### System Prompt Crítico
Agente **nunca** usa histórico obsoleto — sempre busca dados frescos:
```
"NUNCA use informações do histórico da conversa para responder 
sobre o estado atual dos tickets — elas podem estar desatualizadas."
```

### Janela de Contexto
Histórico limitado a **8 mensagens** (4 trocas) para evitar context poisoning.

### JSON Extraction
Parsing confiável de respostas do Claude que às vezes vêm em blocos ` ```json ``` `:
```typescript
if (textoResposta.includes("```")) {
  const partes = textoResposta.split("```");
  textoResposta = (partes[1] ?? "").replace(/^json\s*/i, "").trim();
}
```

### MCP (Model Context Protocol)
As ferramentas de acesso ao banco foram expostas como um **servidor MCP standalone**
(`src/mcp/server.ts`). Isso permite que qualquer host compatível — VS Code Copilot,
Claude Desktop, Cursor — consulte o helpdesk diretamente, sem passar pela interface web.

```
VS Code Copilot
    └── inicia: npx ts-node src/mcp/server.ts
    └── envia via stdin:  { tool: "listar_tickets", input: { status: "aberto" } }
    └── recebe via stdout: [ { id: 7, titulo: "Ambiente fora do ar", ... } ]
```

Configurado em `.vscode/mcp.json` — o VS Code inicia o processo automaticamente.

### RAG (Retrieval-Augmented Generation)
O agente interativo usa RAG para responder perguntas com **conhecimento real da empresa**
em vez de depender apenas do treinamento do modelo.

```
Usuário: "como reseto minha senha?"
       │
       ▼
Gera embedding da pergunta (vetor de 384 números)
       │
       ▼
Busca artigos similares na BaseConhecimento (similaridade de cosseno)
       │
       ▼
Artigo relevante injetado no system prompt antes de chamar o Claude
       │
       ▼
Claude responde com os procedimentos reais internos da empresa
```

**Arquivos:**
- `src/rag/embeddings.ts` — gera vetores com modelo local `Xenova/all-MiniLM-L6-v2`
- `src/rag/buscar.ts` — busca por similaridade de cosseno, threshold 0.35, top 3
- `scripts/popular-base-conhecimento.js` — popula 10 artigos de suporte de TI
- Tabela `BaseConhecimento` no banco: `titulo`, `conteudo`, `embedding` (JSON)

### Streaming (SSE — Server-Sent Events)
As respostas do chat chegam **progressivamente** enquanto o Claude gera — sem esperar
do início ao fim. O balão do assistente aparece vazio e vai sendo preenchido token a token.

```
Backend                           Frontend
   │                                │
   ├─ data: {"chunk": "Para "}\n\n → balão começa a aparecer
   ├─ data: {"chunk": "resolver"}   → texto cresce
   ├─ data: {"chunk": " isso..."}   → texto cresce
   └─ data: {"done": true}          → enviando = false
```

**Implementação:**
- Backend: `POST /chat/stream` com headers SSE (`Content-Type: text/event-stream`)
- Agente: `agenteChatInterativoStream()` itera eventos `content_block_delta` da API
- Service: `fetch()` nativo com `ReadableStream` (não `HttpClient` — que não suporta SSE)
- Component: `NgZone.run()` força Angular a detectar mudanças fora do Zone.js

### Human-in-the-Loop (HITL)
O agente interativo pode **fechar tickets**, mas nunca age sem confirmação explícita do
usuário. A regra está em dois lugares para máxima confiabilidade: no `description` da
tool e no `SYSTEM_INTERATIVO`.

```
Usuário: "fecha o ticket 7"
       │
       ▼  Claude usa buscar_ticket(7) primeiro
"Ticket #7: Impressora offline no 3º andar
 Status: aberto | Prioridade: média
 Confirma o fechamento?"
       │
       ▼  Usuário: "sim, pode fechar"
       │
       ▼  SÓ AGORA Claude chama fechar_ticket(7)
"Ticket #7 fechado com sucesso."
```

**Dois níveis de HITL:**
- `description` da tool: instrui o modelo diretamente no schema
- `SYSTEM_INTERATIVO`: regra explícita com os 4 passos obrigatórios

**A tool `fechar_ticket` também está no servidor MCP** — o host (VS Code Copilot) fica
responsável pelo HITL ao usar via MCP.

---

## 🐛 Bugs Resolvidos

| Problema | Causa | Solução |
|---|---|---|
| Frontend congelado | Faltava `zone.js` no Angular 21 | Instalado e importado em `main.ts` |
| API key não carregada | `.env` não lido | `import "dotenv/config"` como primeira linha |
| Chat agent dava respostas erradas | Usava histórico obsoleto | System prompt + janela reduzida |
| Buttons desalinhados | Flex sem align items | `inline-flex` + `align-items: center` |
| Avatares no chat grudam na borda | Sem padding | `padding: 8px 16px` no container |

---

## 📝 Scripts Úteis

**Limpar histórico de chat:**
```bash
cd helpdesk/backend
node scripts/limpar-chat.js
```

**Popular base de conhecimento (RAG):**
```bash
cd helpdesk/backend
node scripts/popular-base-conhecimento.js
# Na primeira execução baixa o modelo (~80MB). Após isso fica em cache.
```

**Regenerar Prisma client:**
```bash
cd helpdesk/backend
npx prisma generate
```

---

## 🔐 Segurança

- ✅ `.env` com API key **não é commitado** (vide `.gitignore`)
- ✅ CORS aberto apenas para localhost (frontend)
- ✅ Senhas e tokens nunca logados
- ✅ SQL injection prevenido pelo Prisma ORM

---

## 📖 Próximos Passos Possíveis

1. ~~**MCP (Model Context Protocol)**~~ ✅ **Implementado**
2. ~~**RAG (Retrieval-Augmented Generation)**~~ ✅ **Implementado**
3. ~~**Streaming**~~ ✅ **Implementado**
4. ~~**Human-in-the-loop**~~ ✅ **Implementado**
5. **Multi-agent Orchestration** — Múltiplos agentes delegando tarefas

---

## 👤 Autor

**Giovani Broliatto**  
Aprendizado prático sobre Agentes de IA, Claude, e Full Stack JavaScript.

---

## 📄 Licença

Projeto de aprendizado — uso livre para fins educacionais.

---

**Última atualização:** Maio de 2026  
**Status:** ✅ Agentes funcionando | ✅ Servidor MCP ativo | ✅ RAG com base de conhecimento | ✅ Streaming SSE | ✅ Human-in-the-loop | CI/CD não configurado
