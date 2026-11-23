/**
 * Tipos do domínio Barbeiro - Painel do barbeiro/estabelecimento.
 */

export type AbaPainelBarbeiro = 'visao' | 'agenda' | 'servicos' | 'fila' | 'galeria' | 'configuracoes';

export interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracaoMinutos: number;
  tag: string;
  descricao: string;
}

export interface MetricasBarbeiro {
  agendamentosHoje: number;
  confirmados: number;
  pendentes: number;
  filaAtual: number;
}

export interface ConfiguracaoEstabelecimento {
  nome: string;
  telefone: string;
  descricao: string;
  endereco: string;
  cidade: string;
}

export interface TemaOpcao {
  cor: string;
  ativo: boolean;
}

export const ABA_PAINEL_BARBEIRO_LABELS: Record<AbaPainelBarbeiro, string> = {
  visao: 'Visão geral',
  agenda: 'Agenda',
  servicos: 'Serviços',
  fila: 'Fila',
  galeria: 'Galeria',
  configuracoes: 'Configurações',
};

export const ABA_PAINEL_BARBEIRO_ICONES: Record<AbaPainelBarbeiro, string> = {
  visao: '📊',
  agenda: '📅',
  servicos: '✂️',
  fila: '👥',
  galeria: '📸',
  configuracoes: '⚙️',
};

export const SERVICO_TAGS = ['Corte', 'Barba', 'Combo', 'Estética', 'Tratamento', 'Outro'] as const;
export type ServicoTag = typeof SERVICO_TAGS[number];