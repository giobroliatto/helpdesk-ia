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

  buscarHistorico(ticketId?: number): Observable<Mensagem[]> {
    const params = ticketId ? `?ticketId=${ticketId}` : '';
    return this.http.get<Mensagem[]>(`${this.baseUrl}/historico${params}`);
  }
}
