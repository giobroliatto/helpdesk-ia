import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TicketService } from '../../services/ticket.service';
import { Ticket } from '../../models/ticket.model';
import { LabelPipe } from '../../pipes/label.pipe';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule,
    MatIconModule, MatCardModule, MatProgressSpinnerModule, MatTooltipModule,
    LabelPipe
  ],
  templateUrl: './ticket-list.component.html',
  styleUrl: './ticket-list.component.scss'
})
export class TicketListComponent implements OnInit {
  tickets: Ticket[] = [];
  carregando = true;
  erro = '';
  colunas = ['id', 'titulo', 'status', 'prioridade', 'categoria', 'criadoEm', 'acoes'];

  constructor(private ticketService: TicketService, private router: Router) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = '';
    this.ticketService.listar().subscribe({
      next: (tickets) => { this.tickets = tickets; this.carregando = false; },
      error: (err) => {
        console.error('[TicketList] Erro ao listar tickets:', err);
        this.erro = 'Não foi possível carregar os tickets. Verifique se o backend está rodando em localhost:3000.';
        this.carregando = false;
      }
    });
  }

  novo(): void {
    this.router.navigate(['/tickets/novo']);
  }

  ver(id: number): void {
    this.router.navigate(['/tickets', id]);
  }

  formatarData(data: string): string {
    return new Date(data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
}
