import { Router, Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { agenteChatInterativo } from "../agents/agenteInterativo";

const router = Router();

// POST /chat — envia uma mensagem para o agente interativo
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mensagem, ticketId } = req.body as {
      mensagem: string;
      ticketId?: number;
    };

    if (!mensagem?.trim()) {
      res.status(400).json({ erro: "mensagem é obrigatória" });
      return;
    }

    // Busca histórico de mensagens anteriores desta conversa (contexto para o modelo)
    const historico = await prisma.mensagemChat.findMany({
      where: { ticketId: ticketId ?? null },
      orderBy: { criadoEm: "desc" },
      take: 8, // Apenas as 4 trocas mais recentes — evita contexto obsoleto que confunde o agente
    });

    // Inverte para ordem cronológica (findMany DESC + reverse = mantém só os últimos)
    const historicoFormatado = historico.reverse().map((m: { role: string; conteudo: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.conteudo,
    }));

    const resposta = await agenteChatInterativo(
      ticketId ?? null,
      mensagem,
      historicoFormatado
    );

    res.json({ resposta });
  } catch (err) {
    next(err);
  }
});

// GET /chat/historico — retorna histórico de mensagens (opcional: filtrado por ticket)
router.get("/historico", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = req.query.ticketId ? Number(req.query.ticketId) : undefined;

    const mensagens = await prisma.mensagemChat.findMany({
      where: { ticketId: ticketId ?? undefined },
      orderBy: { criadoEm: "asc" },
      take: 50,
    });

    res.json(mensagens);
  } catch (err) {
    next(err);
  }
});

export default router;

