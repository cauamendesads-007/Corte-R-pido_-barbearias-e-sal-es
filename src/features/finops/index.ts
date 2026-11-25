/**
 * Exportações públicas do domínio FinOps.
 * Centros de Custo, Orçamentos, Lançamentos, Alertas, Relatórios, Previsões.
 */

// Types
export type {
  Moeda,
  PeriodoOrcamento,
  TipoCusto,
  StatusOrcamento,
  SeveridadeAlerta,
  CategoriaCusto,
  CentroCusto,
  Orcamento,
  LancamentoCusto,
  AlertaFinanceiro,
  RelatorioFinanceiro,
  MetricasFinanceiras,
  GraficoFinanceiro,
  PontoDados,
  PrevisaoCusto,
  FatorPrevisao,
  ConfiguracaoFinOps,
} from './types';

export {
  CATEGORIAS_CUSTO,
  TIPOS_CUSTO,
  PERIODOS_ORCAMENTO,
  SEVERIDADES_ALERTA,
  MOEDAS,
  CONFIG_PADRAO,
  formatarMoeda,
  formatarPercentual,
  calcularPercentual,
  obterStatusOrcamento,
  obterCorStatus,
  gerarIdLancamento,
  gerarIdOrcamento,
  gerarIdAlerta,
  obterInicioPeriodo,
  obterFimPeriodo,
  agruparPorCategoria,
  agruparPorCentro,
  calcularVariacao,
  projetarGastoMensal,
} from './types';

// Rules
export {
  validarCentroCusto,
  validarOrcamento,
  validarLancamento,
  validarConfiguracao,
  criarCentroCusto,
  criarOrcamento,
  criarLancamento,
  criarAlerta,
  calcularGastoOrcamento,
  calcularProjecaoOrcamento,
  atualizarOrcamentoComGastos,
  verificarAlertasOrcamento,
  verificarLancamentosAltos,
  verificarTendenciaAlta,
  consolidarAlertas,
  calcularMetricasFinanceiras,
  gerarPrevisaoCusto,
  gerarCSVLancamentos,
  gerarCSVOrcamentos,
} from './rules';

// Services
export {
  ICentroCustoService,
  IOrcamentoService,
  ILancamentoService,
  IAlertaService,
  IRelatorioService,
  IFinOpsService,
  createFinOpsService,
  getFinOpsService,
  resetFinOpsService,
  finops,
} from './services';

// Hooks
export {
  useFinOps,
  useCentrosCusto,
  useOrcamentos,
  useLancamentos,
  useAlertas,
  useMetricasFinanceiras,
  usePrevisaoCusto,
  useExportacaoCSV,
} from './hooks/useFinOps';

export type { UseFinOpsReturn } from './hooks/useFinOps';

// Components
export {
  OrcamentoCard,
  AlertaLista,
} from './components';

export type {
  OrcamentoCardProps,
  AlertaListaProps,
} from './components';