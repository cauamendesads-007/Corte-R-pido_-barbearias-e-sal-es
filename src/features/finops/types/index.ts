/**
 * Tipos do domínio FinOps - Custos, Orçamentos, Alertas, Relatórios.
 */

export type Moeda = 'BRL' | 'USD' | 'EUR';
export type PeriodoOrcamento = 'diario' | 'semanal' | 'mensal' | 'anual';
export type TipoCusto = 'fixo' | 'variavel' | 'inesperado' | 'investimento';
export type StatusOrcamento = 'dentro' | 'atencao' | 'critico' | 'estourou';
export type SeveridadeAlerta = 'info' | 'warning' | 'critical';
export type CategoriaCusto = 'infraestrutura' | 'pessoal' | 'marketing' | 'operacional' | 'tecnologia' | 'outros';

export interface CentroCusto {
  id: string;
  nome: string;
  descricao?: string;
  responsavel?: string;
  ativo: boolean;
  criadoEm: string; // ISO 8601
}

export interface Orcamento {
  id: string;
  centroCustoId: string;
  nome: string;
  periodo: PeriodoOrcamento;
  valorLimite: number; // em centavos
  valorGasto: number; // em centavos
  valorProjetado: number; // em centavos
  alertaPercentual: number; // ex: 80 = 80%
  severidadeAlerta: SeveridadeAlerta;
  ativo: boolean;
  inicioVigencia: string; // ISO 8601
  fimVigencia?: string; // ISO 8601
  criadoEm: string;
  atualizadoEm: string;
}

export interface LancamentoCusto {
  id: string;
  centroCustoId: string;
  orcamentoId?: string;
  descricao: string;
  valor: number; // em centavos
  moeda: Moeda;
  tipo: TipoCusto;
  categoria: CategoriaCusto;
  data: string; // ISO 8601
  dataPagamento?: string; // ISO 8601
  status: 'pendente' | 'pago' | 'cancelado' | 'estornado';
  fornecedor?: string;
  notaFiscal?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AlertaFinanceiro {
  id: string;
  orcamentoId: string;
  centroCustoId: string;
  tipo: 'limite_proximo' | 'limite_atingido' | 'limite_ultrapassado' | 'projecao_estouro' | 'lancamento_alto' | 'tendencia_alta';
  severidade: SeveridadeAlerta;
  mensagem: string;
  valorAtual: number;
  valorLimite: number;
  percentualUso: number;
  lido: boolean;
  reconhecido: boolean;
  criadoEm: string;
  lidoEm?: string;
  reconhecidoEm?: string;
}

export interface RelatorioFinanceiro {
  id: string;
  nome: string;
  periodoInicio: string;
  periodoFim: string;
  centrosCusto: string[]; // IDs
  metricas: MetricasFinanceiras;
  graficos: GraficoFinanceiro[];
  exportado: boolean;
  exportadoEm?: string;
  criadoEm: string;
}

export interface MetricasFinanceiras {
  receitaTotal: number;
  custoTotal: number;
  lucroBruto: number;
  margemBruta: number; // percentual
  custosPorCategoria: Record<CategoriaCusto, number>;
  custosPorCentro: Record<string, number>;
  variacaoMensal: number; // percentual vs mês anterior
  projecaoMesAtual: number;
  orcamentoTotal: number;
  gastoTotal: number;
  percentualOrcamento: number;
}

export interface GraficoFinanceiro {
  id: string;
  tipo: 'linha' | 'barra' | 'pizza' | 'area' | 'barras_empilhadas';
  titulo: string;
  dados: PontoDados[];
  configuracao?: Record<string, unknown>;
}

export interface PontoDados {
  label: string;
  valor: number;
  categoria?: string;
  metadata?: Record<string, unknown>;
}

export interface PrevisaoCusto {
  centroCustoId: string;
  periodo: PeriodoOrcamento;
  valorHistorico: number;
  valorPrevisto: number;
  confianca: number; // 0-1
  fatores: FatorPrevisao[];
  geradoEm: string;
}

export interface FatorPrevisao {
  nome: string;
  impacto: 'alto' | 'medio' | 'baixo';
  descricao: string;
  valor: number;
}

export interface ConfiguracaoFinOps {
  moedaPadrao: Moeda;
  alertasAtivos: boolean;
  alertaPadraoPercentual: number;
  projecaoHabilitada: boolean;
  diasProjecao: number;
  categoriasPadrao: CategoriaCusto[];
  centrosCustoPadrao: string[];
  integracaoContabil?: {
    habilitada: boolean;
    endpoint?: string;
    token?: string;
  };
}

// Constantes
export const CATEGORIAS_CUSTO: readonly { value: CategoriaCusto; label: string; icone: string }[] = [
  { value: 'infraestrutura', label: 'Infraestrutura', icone: '🖥️' },
  { value: 'pessoal', label: 'Pessoal', icone: '👥' },
  { value: 'marketing', label: 'Marketing', icone: '📢' },
  { value: 'operacional', label: 'Operacional', icone: '⚙️' },
  { value: 'tecnologia', label: 'Tecnologia', icone: '💻' },
  { value: 'outros', label: 'Outros', icone: '📦' },
] as const;

export const TIPOS_CUSTO: readonly { value: TipoCusto; label: string; cor: string }[] = [
  { value: 'fixo', label: 'Fixo', cor: '#3b82f6' },
  { value: 'variavel', label: 'Variável', cor: '#10b981' },
  { value: 'inesperado', label: 'Inesperado', cor: '#f59e0b' },
  { value: 'investimento', label: 'Investimento', cor: '#8b5cf6' },
] as const;

export const PERIODOS_ORCAMENTO: readonly { value: PeriodoOrcamento; label: string; dias: number }[] = [
  { value: 'diario', label: 'Diário', dias: 1 },
  { value: 'semanal', label: 'Semanal', dias: 7 },
  { value: 'mensal', label: 'Mensal', dias: 30 },
  { value: 'anual', label: 'Anual', dias: 365 },
] as const;

export const SEVERIDADES_ALERTA: readonly { value: SeveridadeAlerta; label: string; cor: string; prioridade: number }[] = [
  { value: 'info', label: 'Informativo', cor: '#3b82f6', prioridade: 1 },
  { value: 'warning', label: 'Atenção', cor: '#f59e0b', prioridade: 2 },
  { value: 'critical', label: 'Crítico', cor: '#ef4444', prioridade: 3 },
] as const;

export const MOEDAS: readonly { value: Moeda; label: string; simbolo: string; locale: string }[] = [
  { value: 'BRL', label: 'Real Brasileiro', simbolo: 'R$', locale: 'pt-BR' },
  { value: 'USD', label: 'Dólar Americano', simbolo: '$', locale: 'en-US' },
  { value: 'EUR', label: 'Euro', simbolo: '€', locale: 'de-DE' },
] as const;

export const CONFIG_PADRAO: ConfiguracaoFinOps = {
  moedaPadrao: 'BRL',
  alertasAtivos: true,
  alertaPadraoPercentual: 80,
  projecaoHabilitada: true,
  diasProjecao: 30,
  categoriasPadrao: ['infraestrutura', 'pessoal', 'marketing', 'operacional', 'tecnologia'],
  centrosCustoPadrao: [],
};

// Utilitários
export function formatarMoeda(valor: number, moeda: Moeda = 'BRL', locale = 'pt-BR'): string {
  const config = MOEDAS.find(m => m.value === moeda);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: config?.value ?? moeda,
    minimumFractionDigits: 2,
  }).format(valor / 100);
}

export function formatarPercentual(valor: number, decimais = 1): string {
  return `${valor.toFixed(decimais)}%`;
}

export function calcularPercentual(valor: number, total: number): number {
  if (total === 0) return 0;
  return (valor / total) * 100;
}

export function obterStatusOrcamento(gasto: number, limite: number, alertaPercentual = 80): StatusOrcamento {
  const percentual = calcularPercentual(gasto, limite);
  if (percentual >= 100) return 'estourou';
  if (percentual >= alertaPercentual) return 'critico';
  if (percentual >= 60) return 'atencao';
  return 'dentro';
}

export function obterCorStatus(status: StatusOrcamento): string {
  switch (status) {
    case 'dentro': return '#10b981';
    case 'atencao': return '#3b82f6';
    case 'critico': return '#f59e0b';
    case 'estourou': return '#ef4444';
  }
}

export function gerarIdLancamento(): string {
  return `LC_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function gerarIdOrcamento(): string {
  return `ORC_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function gerarIdAlerta(): string {
  return `ALT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function obterInicioPeriodo(periodo: PeriodoOrcamento, data = new Date()): Date {
  const inicio = new Date(data);
  switch (periodo) {
    case 'diario':
      inicio.setHours(0, 0, 0, 0);
      break;
    case 'semanal':
      inicio.setDate(inicio.getDate() - inicio.getDay());
      inicio.setHours(0, 0, 0, 0);
      break;
    case 'mensal':
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
      break;
    case 'anual':
      inicio.setMonth(0, 1);
      inicio.setHours(0, 0, 0, 0);
      break;
  }
  return inicio;
}

export function obterFimPeriodo(periodo: PeriodoOrcamento, data = new Date()): Date {
  const fim = new Date(data);
  switch (periodo) {
    case 'diario':
      fim.setHours(23, 59, 59, 999);
      break;
    case 'semanal':
      fim.setDate(fim.getDate() + (6 - fim.getDay()));
      fim.setHours(23, 59, 59, 999);
      break;
    case 'mensal':
      fim.setMonth(fim.getMonth() + 1, 0);
      fim.setHours(23, 59, 59, 999);
      break;
    case 'anual':
      fim.setMonth(11, 31);
      fim.setHours(23, 59, 59, 999);
      break;
  }
  return fim;
}

export function agruparPorCategoria(lancamentos: LancamentoCusto[]): Record<CategoriaCusto, number> {
  const resultado: Record<CategoriaCusto, number> = {
    infraestrutura: 0,
    pessoal: 0,
    marketing: 0,
    operacional: 0,
    tecnologia: 0,
    outros: 0,
  };

  for (const l of lancamentos) {
    resultado[l.categoria] += l.valor;
  }

  return resultado;
}

export function agruparPorCentro(lancamentos: LancamentoCusto[]): Record<string, number> {
  const resultado: Record<string, number> = {};
  for (const l of lancamentos) {
    resultado[l.centroCustoId] = (resultado[l.centroCustoId] ?? 0) + l.valor;
  }
  return resultado;
}

export function calcularVariacao(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}

export function projetarGastoMensal(gastoAtual: number, diaDoMes: number, diasNoMes: number): number {
  if (diaDoMes === 0) return 0;
  return Math.round((gastoAtual / diaDoMes) * diasNoMes);
}