import { Pipe, PipeTransform } from '@angular/core';

const STATUS_LABELS: Record<string, string> = {
  aberto:     'Aberto',
  em_analise: 'Em análise',
  resolvido:  'Resolvido',
  fechado:    'Fechado',
};

const PRIORIDADE_LABELS: Record<string, string> = {
  baixa:   'Baixa',
  media:   'Média',
  alta:    'Alta',
  critica: 'Crítica',
};

const CATEGORIA_LABELS: Record<string, string> = {
  ti:         'TI',
  rh:         'RH',
  financeiro: 'Financeiro',
  geral:      'Geral',
};

@Pipe({ name: 'label', standalone: true })
export class LabelPipe implements PipeTransform {
  transform(value: string, tipo: 'status' | 'prioridade' | 'categoria'): string {
    if (!value) return value;
    if (tipo === 'status')     return STATUS_LABELS[value]    ?? value;
    if (tipo === 'prioridade') return PRIORIDADE_LABELS[value] ?? value;
    if (tipo === 'categoria')  return CATEGORIA_LABELS[value]  ?? value;
    return value;
  }
}
