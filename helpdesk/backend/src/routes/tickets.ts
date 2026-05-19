import { Router, Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { agenteAuditarTicket } from "../agents/agenteAutomatico";

const router = Router();

// GET /tickets — lista todos os tickets
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { criadoEm: "desc" },
    });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// GET /tickets/:id — busca um ticket pelo ID com suas mensagens
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: Number(req.params.id) },
      include: { mensagens: { orderBy: { criadoEm: "asc" } } },
    });

    if (!ticket) {
      res.status(404).json({ erro: "Ticket não encontrado" });
      return;
    }

    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// POST /tickets — cria um novo ticket e dispara o agente automático
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { titulo, descricao } = req.body as { titulo: string; descricao: string };

    if (!titulo?.trim() || !descricao?.trim()) {
      res.status(400).json({ erro: "titulo e descricao são obrigatórios" });
      return;
    }

    const ticket = await prisma.ticket.create({
      data: { titulo, descricao },
    });

    // Dispara o agente automático de forma assíncrona (não bloqueia a resposta HTTP)
    // Analogia: o ticket foi criado, o "auditor automático" começa a trabalhar em background
    agenteAuditarTicket(ticket.id).catch((err) =>
      console.error("[ROTA] Erro no agente automático:", err)
    );

    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// PATCH /tickets/:id — atualiza status de um ticket
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status: string };
    const statusValidos = ["aberto", "em_analise", "resolvido", "fechado"];

    if (!statusValidos.includes(status)) {
      res.status(400).json({ erro: `Status deve ser um de: ${statusValidos.join(", ")}` });
      return;
    }

    const ticket = await prisma.ticket.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });

    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

export default router;

