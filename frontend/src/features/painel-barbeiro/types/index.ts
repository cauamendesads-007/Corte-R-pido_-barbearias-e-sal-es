/**
 * Tipos do domínio Painel Barbeiro (dashboard do profissional).
 * Re-exporta de @/tipos para fonte única da verdade.
 */

export type {
  Agendamento,
  AgendamentoStatus,
  Servico,
  Estabelecimento,
  Cliente,
  FilaEspera,
  MetricasBarbeiro,
  ConfiguracaoBarbeiro,
  NotificacaoBarbeiro,
} from '@/tipos';

/** Tipos locais para o domínio painel-barbeiro */
export interface PainelBarbeiroState {
  agendamentosHoje: Agendamento[];
  agendamentosProximos: Agendamento[];
  filaEspera: FilaEspera[];
  metricas: MetricasBarbeiro | null;
  configuracao: ConfiguracaoBarbeiro | null;
  notificacoes: NotificacaoBarbeiro[];
  carregando: boolean;
  erro: string | null;
}

export interface PainelBarbeiroActions {
  carregarDashboard: () => Promise<void>;
  atualizarStatusAgendamento: (id: string, status: AgendamentoStatus) => Promise<void>;
  chamarProximoFila: () => Promise<void>;
  removerDaFila: (clienteId: string) => Promise<void>;
  atualizarConfiguracao: (config: Partial<ConfiguracaoBarbeiro>) => Promise<void>;
  marcarNotificacaoLida: (id: string) => Promise<void>;
  limparErro: () => void;
}

export interface AgendamentosState {
  agendamentos: Agendamento[];
  filtro: AgendamentosFiltro;
  pagina: number;
  proximaPagina: number | null;
  carregando: boolean;
  carregandoMais: boolean;
  erro: string | null;
}

export interface AgendamentosActions {
  carregarAgendamentos: (filtro?: Partial<AgendamentosFiltro>, reset?: boolean) => Promise<void>;
  carregarMais: () => Promise<void>;
  atualizarFiltro: (filtro: Partial<AgendamentosFiltro>) => void;
  atualizarStatus: (id: string, status: AgendamentoStatus) => Promise<void>;
  reagendar: (id: string, novaData: string, novoHorario: string) => Promise<void>;
  cancelar: (id: string, motivo?: string) => Promise<void>;
  limparErro: () => void;
}

export interface AgendamentosFiltro {
  status?: AgendamentoStatus;
  dataInicio?: string;
  dataFim?: string;
  clienteId?: string;
  servicoId?: string;
}

export interface FilaState {
  fila: FilaEspera[];
  carregando: boolean;
  erro: string | null;
}

export interface FilaActions {
  carregarFila: () => Promise<void>;
  adicionarCliente: (cliente: Omit<FilaEspera, 'id' | 'posicao' | 'entradaEm'>) => Promise<void>;
  chamarProximo: () => Promise<void>;
  remover: (id: string) => Promise<void>;
  reordenar: (ids: string[]) => Promise<void>;
  limparErro: () => void;
}

export interface MetricasState {
  metricas: MetricasBarbeiro | null;
  carregando: boolean;
  erro: string | null;
  periodo: 'dia' | 'semana' | 'mes' | 'ano';
}

export interface MetricasActions {
  carregarMetricas: (periodo?: 'dia' | 'semana' | 'mes' | 'ano') => Promise<void>;
  alterarPeriodo: (periodo: 'dia' | 'semana' | 'mes' | 'ano') => void;
  limparErro: () => void;
}