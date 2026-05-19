export interface Ticket {
  id: number;
  titulo: string;
  descricao: string;
  status: 'aberto' | 'em_analise' | 'resolvido' | 'fechado';
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  categoria: string;
  sugestaoIA: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Mensagem {
  id: number;
  ticketId: number | null;
  role: 'user' | 'assistant';
  conteudo: string;
  criadoEm: string;
}
