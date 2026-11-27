/**
 * Domínio Painel Barbeiro - Exportações principais.
 * Feature-based architecture: componentes, hooks, services, types, rules.
 */

// Types
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
  PainelBarbeiroState,
  PainelBarbeiroActions,
  AgendamentosState,
  AgendamentosActions,
  AgendamentosFiltro,
  FilaState,
  FilaActions,
  MetricasState,
  MetricasActions,
} from './types';

// Rules
export {
  validarTransicaoStatus,
  validarConfiguracaoBarbeiro,
  calcularPosicaoFila,
  estimarTempoEspera,
  podeChamarCliente,
  agruparPorStatus,
  filtrarPorPeriodo,
  ordenarAgendamentos,
  computarMetricasDerivadas,
  obterProximoHorarioLivre,
  formatarDuracao,
  calcularTaxaOcupacao,
  gerarNotificacaoFila,
  criarPainelBarbeiroError,
  STATUS_CONFIG,
  TRANSICOES_VALIDAS,
} from './rules';

// Services
export {
  IPainelBarbeiroService,
  PainelBarbeiroService,
  getPainelBarbeiroService,
  setPainelBarbeiroService,
  createPainelBarbeiroService,
  createMockPainelBarbeiroService,
} from './services';

// Hooks
export {
  usePainelBarbeiro,
  useAgendamentosBarbeiro,
  useFila,
  useMetricasBarbeiro,
} from './hooks';

// Components
export {
  DashboardBarbeiro,
  AgendamentosBarbeiro,
  FilaBarbeiro,
  MetricasBarbeiro,
} from './components';