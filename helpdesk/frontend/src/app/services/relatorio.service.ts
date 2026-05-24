import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RelatorioService {
  private baseUrl = 'http://localhost:3000/relatorio';

  // Streaming via fetch nativo + ReadableStream — mesmo padrão do ChatService.
  // SSE com POST não é suportado por EventSource nem HttpClient.
  consultarStream(
    mensagem: string,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onErro: () => void
  ): void {
    fetch(`${this.baseUrl}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem }),
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
            if (data.chunk) onChunk(data.chunk);
            if (data.done)  onDone();
            if (data.erro)  onErro();
          } catch { /* linha parcial entre dois reads — ignora */ }
        }
      }
    }).catch(() => onErro());
  }
}
