-- CreateTable
CREATE TABLE "LogChamadaIA" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "agente" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "custoUsd" REAL NOT NULL,
    "latenciaMs" INTEGER NOT NULL,
    "toolCalls" INTEGER NOT NULL DEFAULT 0,
    "ticketId" INTEGER,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
