import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChatService } from '../../services/chat.service';
import { Mensagem } from '../../models/ticket.model';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MarkdownPipe
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  mensagens: Mensagem[] = [];
  texto = '';
  enviando = false;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.chatService.buscarHistorico().subscribe({
      next: (msgs) => { this.mensagens = msgs; this.scrollDown(); }
    });
  }

  enviar(): void {
    if (!this.texto.trim() || this.enviando) return;

    const textoEnviado = this.texto.trim();
    this.texto = '';
    this.enviando = true;

    // Adiciona a mensagem do usuário localmente (feedback imediato)
    this.mensagens.push({
      id: Date.now(),
      ticketId: null,
      role: 'user',
      conteudo: textoEnviado,
      criadoEm: new Date().toISOString()
    });
    this.scrollDown();

    this.chatService.enviarMensagem(textoEnviado).subscribe({
      next: ({ resposta }) => {
        this.mensagens.push({
          id: Date.now() + 1,
          ticketId: null,
          role: 'assistant',
          conteudo: resposta,
          criadoEm: new Date().toISOString()
        });
        this.enviando = false;
        this.scrollDown();
      },
      error: () => { this.enviando = false; }
    });
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviar();
    }
  }

  private scrollDown(): void {
    setTimeout(() => {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }
}
