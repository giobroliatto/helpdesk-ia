# HelpDesk IA — Como a aplicação funciona

## Visão geral

Este é um sistema de Help Desk com dois agentes de IA distintos, construído para demonstrar
como agentes baseados em LLM (Large Language Model) funcionam na prática.

**Stack:**
- **Frontend:** Angular 21 + Angular Material
- **Backend:** Node.js + Express 5 + TypeScript
- **Banco de dados:** SQLite via Prisma 7 + better-sqlite3
- **IA:** Anthropic Claude (claude-sonnet-4-5) via `@anthropic-ai/sdk`

**Execução:**

- **Frontend**: ng serve
- **Backend**: npm run dev

---

## Os dois agentes de IA

### 1. Agente Automático (`src/agents/agenteAutomatico.ts`)

**Quando é ativado:** automaticamente, toda vez que um ticket é criado via `POST /tickets`.

**O que faz:** analisa o conteúdo do ticket (título + descrição) e classifica:
- **prioridade** — baixa / media / alta / critica
- **categoria** — ti / rh / financeiro / geral
- **sugestaoIA** — sugestão concisa de como resolver (2 frases)

**Como funciona por dentro:**
```
Criação do ticket
       │
       ▼
Atualiza status → "em_analise"  (feedback visual no frontend)
       │
       ▼
Chama Claude com o conteúdo do ticket
       │
       └── System prompt explica critérios de classificação
           e exige resposta em JSON puro: { prioridade, categoria, sugestao }
       │
       ▼
Faz parse do JSON retornado (extrai de blocos markdown se necessário)
       │
       ▼
Atualiza ticket no banco: prioridade + categoria + sugestaoIA
Volta status → "aberto"  (análise concluída, pronto para atendente)
```

**Característica importante:** é totalmente **assíncrono e não-interativo**. O HTTP
response do `POST /tickets` já foi enviado antes do agente terminar. O frontend faz
polling a cada 3 segundos para detectar quando a análise concluiu (o status muda de
`em_analise` para `aberto` e `sugestaoIA` é preenchida).

Este padrão é exatamente o que você usaria num sistema real de auditoria automática,
por exemplo: análise automática de sinistros, validação de cadastros, triagem de chamados.

---

### 2. Agente Interativo (`src/agents/agenteInterativo.ts`)

**Quando é ativado:** toda vez que o usuário envia uma mensagem na tela de Chat.

**O que faz:** responde perguntas sobre os tickets do sistema em linguagem natural.

**Como funciona por dentro — Tool Use (uso de ferramentas):**

O modelo de IA por si só não tem acesso ao banco de dados. Ele só "sabe" o que está no
contexto da conversa. Para buscar dados reais, ele precisa de **ferramentas**.

```
Usuário: "tem quantos tickets abertos?"
       │
       ▼
Agente envia mensagem para Claude com:
  - system prompt (quem ele é, quais ferramentas tem)
  - histórico da conversa
  - tools schema (descrição das ferramentas disponíveis)
       │
       ▼
Claude decide que precisa de dados e retorna:
  stop_reason = "tool_use"
  content = [{ type: "tool_use", name: "resumo_tickets", id: "t1" }]
       │
       ▼
Agente executa a função resumo_tickets() no banco de dados
       │
       ▼
Agente devolve o resultado para Claude:
  messages += [
    { role: "assistant", content: [tool_use t1] },
    { role: "user",      content: [tool_result t1: "{ aberto: 3, ... }"] }
  ]
       │
       ▼
Claude agora tem os dados e retorna a resposta final em texto
  stop_reason = "end_turn"
       │
       ▼
Resposta enviada ao usuário
```

**Por que há um loop (`while stop_reason === "tool_use"`):**
Claude pode precisar chamar múltiplas ferramentas em sequência. Por exemplo:
"quais tickets abertos e qual a prioridade de cada um?" — ele pode chamar
`resumo_tickets` e depois `listar_tickets` com filtro `status: aberto`.
O loop garante que todas as chamadas de ferramentas sejam atendidas antes de
responder ao usuário.

**Regra crítica da API Anthropic:** para cada bloco `tool_use` retornado pelo modelo,
deve existir um bloco `tool_result` correspondente na próxima mensagem `user`. Se
Claude retornar 2 blocos `tool_use` numa resposta, a próxima mensagem `user` deve ter
exatamente 2 blocos `tool_result`, um para cada ID.

---

## As ferramentas disponíveis (`src/tools/ticketTools.ts`)

| Ferramenta | O que faz | Quando Claude usa |
|---|---|---|
| `listar_tickets` | Lista tickets com filtros de status/prioridade | "mostra todos os tickets abertos" |
| `buscar_ticket` | Busca um ticket pelo ID com mensagens | "o que tem no ticket #3?" |
| `resumo_tickets` | Conta tickets por status | "quantos tickets tem em cada status?" |
| `atualizar_ticket` | Atualiza campos de um ticket | não exposta no agente interativo |

---

## Fluxo completo de criação de ticket

```
Usuário preenche o form (titulo + descricao)
       │
       ▼ POST /tickets
Backend cria ticket no banco (status: "aberto", sugestaoIA: null)
       │
       ├── HTTP 201 → Frontend redireciona para /tickets/:id
       │   (o ticket ainda não tem sugestão)
       │
       └── agenteAuditarTicket(ticket.id).catch(...) [async, non-blocking]
                │
                ▼
           Claude analisa e atualiza o ticket em background
                │
                ▼
           Frontend detecta via polling (3s) que status voltou para "aberto"
           e mostra a sugestaoIA na tela
```

---

## Onde a IA é usada

| Tela | Agente | Ativação |
|---|---|---|
| Criar ticket | Agente Automático | Ao criar qualquer ticket |
| Detalhe do ticket | Agente Automático | Exibe resultado do agente (sugestaoIA) |
| Chat | Agente Interativo | Ao enviar mensagem no chat |

---

## Sobre o histórico de mensagens

O agente interativo mantém contexto de conversa salvando cada par
(mensagem_usuário + resposta_assistente) no banco na tabela `MensagemChat`.

**Regra importante:** usuário e assistente se alternam sempre. A API Anthropic rejeita
qualquer sequência onde duas mensagens consecutivas são do mesmo papel (ex: dois `user`
seguidos). Por isso, o agente salva ambas as mensagens **só após sucesso** — se salvar
o user antes e o agente falhar, a mensagem fica "órfã" no histórico e corrompe chamadas
futuras.

---

## Estrutura de arquivos relevantes

```
backend/src/
├── index.ts                  ← servidor Express, dotenv, CORS, error handler
├── routes/
│   ├── tickets.ts            ← CRUD de tickets + disparo do agente automático
│   └── chat.ts               ← endpoint do chat + carregamento de histórico
├── agents/
│   ├── agenteAutomatico.ts   ← agente de auditoria (sem tool use, só prompt)
│   └── agenteInterativo.ts   ← agente de chat com tool use loop
├── tools/
│   └── ticketTools.ts        ← funções de acesso ao banco + schemas das ferramentas
├── mcp/
│   └── server.ts             ← servidor MCP (expõe as mesmas tools via protocolo padrão)
└── db/
    └── prisma.ts             ← instância do PrismaClient com driver adapter

frontend/src/app/
├── pages/
│   ├── ticket-list/          ← tabela de tickets
│   ├── ticket-create/        ← formulário de criação
│   ├── ticket-detail/        ← detalhe + sugestão IA + polling + atualizar status
│   └── chat/                 ← interface de chat com o agente interativo
├── services/
│   ├── ticket.service.ts     ← HTTP calls para /tickets
│   └── chat.service.ts       ← HTTP calls para /chat
└── pipes/
    └── label.pipe.ts         ← formata valores do banco para exibição ("media" → "Média")
```

---

## Servidor MCP (`src/mcp/server.ts`)

Além dos agentes que rodam dentro do backend Express, o sistema também expõe as
ferramentas de tickets via **MCP (Model Context Protocol)** — um protocolo aberto
da Anthropic que permite que qualquer host de IA compatível utilize as tools.

**O que é MCP:**
É o "USB-C das integrações de IA". Em vez de cada app de IA ter sua integração
customizada, você cria um servidor MCP uma vez e qualquer host (VS Code Copilot,
Claude Desktop, Cursor) o consome com a mesma interface padrão.

**Como funciona o transporte stdio:**
```
VS Code Copilot (host)
    └── spawna processo: npx ts-node src/mcp/server.ts
    └── comunica via stdin/stdout (JSON-RPC)
    └── descobre automaticamente as 3 tools disponíveis
```

**Tools expostas:**

| Tool | Schema | O que faz |
|---|---|---|
| `listar_tickets` | `{ status?, prioridade? }` | Lista tickets com filtros |
| `buscar_ticket` | `{ id: number }` | Detalhe completo de um ticket |
| `resumo_tickets` | `{}` | Contagem por status |

**Diferença entre usar as tools via agente vs via MCP:**

| Via Agente Interativo | Via Servidor MCP |
|---|---|
| Usuário digita no chat da app web | Usuário pergunta no VS Code / Claude Desktop |
| O backend gerencia o tool use loop | O host (VS Code) gerencia o tool use loop |
| Ferramentas acopladas ao agente | Ferramentas expostas de forma padronizada e reutilizável |

**Configuração (`.vscode/mcp.json` na raiz do workspace):**
```json
{
  "servers": {
    "helpdesk-ia": {
      "command": "npx",
      "args": ["ts-node", "--project", "tsconfig.json", "src/mcp/server.ts"],
      "cwd": "c:\\aulas-claude\\ia\\helpdesk\\backend"
    }
  }
}
```

O VS Code inicia o processo automaticamente quando detecta o arquivo e o usuário
confia no servidor. A partir daí, o Copilot pode consultar o banco em tempo real
sem que a interface web esteja aberta.