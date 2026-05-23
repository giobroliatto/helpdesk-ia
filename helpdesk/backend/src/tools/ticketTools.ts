import prisma from "../db/prisma";

// Ferramentas que o agente pode usar para interagir com o banco de dados
// Cada função aqui é chamada pelo agente quando ele decide que precisa dela

export async function listarTickets(filtros?: { status?: string; prioridade?: string }) {
  const tickets = await prisma.ticket.findMany({
    where: {
      ...(filtros?.status && { status: filtros.status }),
      ...(filtros?.prioridade && { prioridade: filtros.prioridade }),
    },
    orderBy: { criadoEm: "desc" },
    take: 20,
  });
  return tickets;
}

export async function buscarTicketPorId(id: number) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { mensagens: { orderBy: { criadoEm: "asc" } } },
  });
  return ticket;
}

export async function atualizarTicket(
  id: number,
  dados: { status?: string; prioridade?: string; categoria?: string; sugestaoIA?: string }
) {
  const ticket = await prisma.ticket.update({
    where: { id },
    data: dados,
  });
  return ticket;
}

export async function contarTicketsPorStatus() {
  const resultados = await prisma.ticket.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  return resultados.map((r: { status: string; _count: { id: number } }) => ({ status: r.status, total: r._count.id }));
}

export async function fecharTicket(id: number) {
  const ticket = await prisma.ticket.update({
    where: { id },
    data: { status: "fechado" },
  });
  return ticket;
}

// Definição das ferramentas no formato que a Anthropic espera (schema)
export const ticketToolsSchema = [
  {
    name: "listar_tickets",
    description:
      "Lista os tickets do sistema com filtros opcionais por status ou prioridade. Use quando o usuário pedir para ver tickets.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description: "Filtrar por status: aberto, em_analise, resolvido, fechado",
        },
        prioridade: {
          type: "string",
          description: "Filtrar por prioridade: baixa, media, alta, critica",
        },
      },
    },
  },
  {
    name: "buscar_ticket",
    description:
      "Busca detalhes completos de um ticket específico pelo ID, incluindo mensagens.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "ID numérico do ticket" },
      },
      required: ["id"],
    },
  },
  {
    name: "resumo_tickets",
    description:
      "Retorna um resumo com contagem de tickets por status. Útil para visão geral do sistema.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "fechar_ticket",
    description:
      "Fecha um ticket alterando seu status para 'fechado'. " +
      "REGRA OBRIGATÓRIA: só chamar esta tool após o usuário confirmar EXPLICITAMENTE o fechamento. " +
      "Antes de chamar, sempre use buscar_ticket para mostrar os detalhes do ticket e pedir confirmação.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "ID numérico do ticket a fechar" },
      },
      required: ["id"],
    },
  },
];

// Executor: recebe nome e input da tool, chama a função certa
export async function executarTicketTool(
  nome: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (nome) {
    case "listar_tickets":
      return listarTickets(input as { status?: string; prioridade?: string });
    case "buscar_ticket":
      return buscarTicketPorId(input.id as number);
    case "resumo_tickets":
      return contarTicketsPorStatus();
    case "fechar_ticket":
      return fecharTicket(input.id as number);
    default:
      throw new Error(`Ferramenta desconhecida: ${nome}`);
  }
}
