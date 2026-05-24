import { Component, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RelatorioService } from '../../services/relatorio.service';
import { Mensagem } from '../../models/ticket.model';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MarkdownPipe
  ],
  templateUrl: './relatorios.component.html',
  styleUrl: './relatorios.component.scss'
})
export class RelatoriosComponent {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  mensagens: Mensagem[] = [];
  texto = '';
  consultando = false;

  // NgZone necessário: callbacks do fetch() nativo rodam fora da zona do Angular
  constructor(private relatorioService: RelatorioService, private ngZone: NgZone) {}

  consultar(): void {
    if (!this.texto.trim() || this.consultando) return;

    const textoEnviado = this.texto.trim();
    this.texto = '';
    this.consultando = true;

    this.mensagens.push({
      id: Date.now(),
      ticketId: null,
      role: 'user',
      conteudo: textoEnviado,
      criadoEm: new Date().toISOString()
    });

    const streamingMsg: Mensagem = {
      id: Date.now() + 1,
      ticketId: null,
      role: 'assistant',
      conteudo: '',
      criadoEm: new Date().toISOString()
    };
    this.mensagens.push(streamingMsg);
    this.scrollDown();

    this.relatorioService.consultarStream(
      textoEnviado,
      (chunk) => {
        this.ngZone.run(() => {
          streamingMsg.conteudo += chunk;
          this.scrollDown();
        });
      },
      () => {
        this.ngZone.run(() => {
          this.consultando = false;
          this.scrollDown();
        });
      },
      () => {
        this.ngZone.run(() => {
          if (!streamingMsg.conteudo) {
            streamingMsg.conteudo = 'Erro ao gerar relatório.';
          }
          this.consultando = false;
        });
      }
    );
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.consultar();
    }
  }

  private scrollDown(): void {
    setTimeout(() => {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }
}
