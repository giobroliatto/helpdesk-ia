import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mensagem } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private baseUrl = 'http://localhost:3000/chat';

  constructor(private http: HttpClient) {}

  enviarMensagem(mensagem: string, ticketId?: number): Observable<{ resposta: string }> {
    return this.http.post<{ resposta: string }>(this.baseUrl, { mensagem, ticketId });
  }

  // Versão streaming: a conexão fica aberta e os callbacks são chamados conforme o texto chega.
  //
  // Por que fetch nativo e não HttpClient?
  // O HttpClient do Angular não suporta SSE (Server-Sent Events) — ele espera a resposta
  // completa antes de emitir. O fetch nativo tem ReadableStream que lê byte a byte.
  //
  // Por que não EventSource?
  // EventSource só suporta GET. Nossa rota é POST (precisa enviar a mensagem no body).
  enviarMensagemStream(
    mensagem: string,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onErro: () => void,
    ticketId?: number
  ): void {
    fetch(`${this.baseUrl}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem, ticketId }),
    }).then(async (response) => {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Um único read() pode conter múltiplos eventos SSE — processamos linha por linha
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) onChunk(data.chunk);
            if (data.done)  onDone();
            if (data.erro)  onErro();
          } catch { /* linha parcial entre dois reads — ignora */ }
        }
      }
    }).catch(() => onErro());
  }

  // Versão orquestrada: envia para /orquestrador/stream que classifica a intenção
  // e delega para o agente correto. Inclui callback onAgente com o nome do agente escolhido.
  enviarMensagemOrquestrador(
    mensagem: string,
    onAgente: (agente: string) => void,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onErro: () => void,
    ticketId?: number
  ): void {
    fetch('http://localhost:3000/orquestrador/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem, ticketId }),
    }).then(async (response) => {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.agente) onAgente(data.agente);
            if (data.chunk)  onChunk(data.chunk);
            if (data.done)   onDone();
            if (data.erro)   onErro();
          } catch { /* linha parcial — ignora */ }
        }
      }
    }).catch(() => onErro());
  }

  buscarHistorico(ticketId?: number): Observable<Mensagem[]> {
    const params = ticketId ? `?ticketId=${ticketId}` : '';
    return this.http.get<Mensagem[]>(`${this.baseUrl}/historico${params}`);
  }

  limparHistorico(): Observable<{ ok: boolean; removidas: number }> {
    return this.http.delete<{ ok: boolean; removidas: number }>(`${this.baseUrl}/historico`);
  }
}
