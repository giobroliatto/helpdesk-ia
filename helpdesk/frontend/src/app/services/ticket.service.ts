import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ticket, ComentarioTicket } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private baseUrl = 'http://localhost:3000/tickets';

  constructor(private http: HttpClient) {}

  listar(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(this.baseUrl);
  }

  buscar(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.baseUrl}/${id}`);
  }

  criar(dados: { titulo: string; descricao: string }): Observable<Ticket> {
    return this.http.post<Ticket>(this.baseUrl, dados);
  }

  atualizarStatus(id: number, status: string): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.baseUrl}/${id}`, { status });
  }

  adicionarComentario(ticketId: number, conteudo: string): Observable<ComentarioTicket> {
    return this.http.post<ComentarioTicket>(`${this.baseUrl}/${ticketId}/comentarios`, { conteudo });
  }
}
