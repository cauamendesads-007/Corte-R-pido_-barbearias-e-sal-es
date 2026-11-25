/**
 * Tipos e contratos do domínio de Agendamento.
 * Contratos estritos usando Discriminated Unions, Result<T, E>, as const.
 */

import type { Agendamento, StatusAgendamento, StatusPagamento, Servico } from '@/tipos';

// Re-export base types from @/tipos
export type { Agendamento, StatusAgendamento, StatusPagamento, Servico } from '@/tipos';

/** Filtros para listagem de agendamentos */
export interface AgendamentoFiltros {
  status?: StatusAgendamento;
  statusPagamento?: StatusPagamento;
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;    // YYYY-MM-DD
  estabelecimentoId?: string;
  usuarioId?: string;
}

/** Paginação */
export interface Paginacao {
  pagina: number;
  itensPorPagina: number;
  total: number;
  temMais: boolean;
}

/** Entrada para criar agendamento */
export interface CriarAgendamentoInput {
  estabelecimentoId: string;
  servicoIds: string[];
  dia: string; // YYYY-MM-DD
  horario: string; // HH:MM
  observacoes?: string;
  formaPagamento: 'no_local' | 'pix';
}

/** Entrada para reagendar */
export interface ReagendarInput {
  agendamentoId: string;
  novoDia: string;
  novoHorario: string;
}

/** Entrada para avaliar */
export interface AvaliarInput {
  agendamentoId: string;
  nota: number; // 1-5
  comentario?: string;
}

/** Entrada para atualizar status (barbeiro) */
export interface AtualizarStatusInput {
  agendamentoId: string;
  status: StatusAgendamento;
  statusPagamento?: StatusPagamento;
}

/** Dados computados do agendamento */
export interface AgendamentoComputado {
  agendamento: Agendamento;
  servicos: Servico[];
  valorTotal: number;
  duracaoTotal: number;
  podeCancelar: boolean;
  podeReagendar: boolean;
  podeAvaliar: boolean;
  podeConfirmar: boolean;
  statusTexto: string;
  statusCor: 'sucesso' | 'aviso' | 'perigo' | 'padrao' | 'info';
  isPassado: boolean;
  isHoje: boolean;
  isProximo: boolean; // Próximas 24h
}

/** Resultado de operação */
export type Result<T, E = string> =
  | { sucesso: true; dados: T }
  | { sucesso: false; erro: E };

/** Estado do hook de agendamentos */
export interface AgendamentosState {
  agendamentos: Agendamento[];
  proximos: Agendamento[];
  passados: Agendamento[];
  carregando: boolean;
  erro: string | null;
  paginacao: Paginacao;
  filtros: AgendamentoFiltros;
}

/** Ações do hook de agendamentos */
export interface AgendamentosActions {
  criar: (input: CriarAgendamentoInput) => Promise<Result<Agendamento>>;
  reagendar: (input: ReagendarInput) => Promise<Result<void>>;
  cancelar: (agendamentoId: string) => Promise<Result<void>>;
  confirmarPresenca: (agendamentoId: string) => Promise<Result<void>>;
  avaliar: (input: AvaliarInput) => Promise<Result<void>>;
  atualizarStatus: (input: AtualizarStatusInput) => Promise<Result<void>>;
  recarregar: () => Promise<void>;
  carregarMais: () => Promise<void>;
  definirFiltros: (filtros: Partial<AgendamentoFiltros>) => void;
  limparErro: () => void;
}

/** Contexto completo */
export type AgendamentosContext = AgendamentosState & AgendamentosActions;

/** Constantes de validação */
export const AGENDAMENTO_CONSTANTES = {
  ANTECEDENCIA_MINIMA_MINUTOS: 30,
  ANTECEDENCIA_MAXIMA_DIAS: 90,
  DURACAO_MINIMA_MINUTOS: 15,
  DURACAO_MAXIMA_MINUTOS: 480,
  LIMITE_CANCELAMENTO_HORAS: 2,
  LIMITE_REAGENDAMENTO_HORAS: 2,
  NOTA_MINIMA: 1,
  NOTA_MAXIMA: 5,
  COMENTARIO_MAX_LENGTH: 500,
} as const;

/** Códigos de erro */
export type AgendamentoErrorCode =
  | 'AGENDAMENTO_NAO_ENCONTRADO'
  | 'HORARIO_INDISPONIVEL'
  | 'HORARIO_PASSADO'
  | 'ANTECEDENCIA_INSUFICIENTE'
  | 'ANTECEDENCIA_EXCESSIVA'
  | 'CONFLITO_AGENDAMENTO'
  | 'SERVICO_NAO_ENCONTRADO'
  | 'ESTABELECIMENTO_FECHADO'
  | 'FORMA_PAGAMENTO_INVALIDA'
  | 'NAO_AUTORIZADO'
  | 'ERRO_CONEXAO'
  | 'VALIDACAO_FALHOU';

/** Erro tipado */
export interface AgendamentoError extends Error {
  code: AgendamentoErrorCode;
  campo?: string;
}