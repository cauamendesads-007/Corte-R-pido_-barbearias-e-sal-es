/**
 * Tipos do domínio Assinaturas - Planos SaaS, Faturas, Limites.
 */
// eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars
// These are intentionally exported for external use
export type PlanoId = 'starter' | 'profissional' | 'enterprise';
export type CicloFaturamento = 'mensal' | 'anual';
export type StatusAssinatura = 'ativa' | 'pausada' | 'cancelada' | 'expirada' | 'pendente';
export type StatusFatura = 'paga' | 'pendente' | 'vencida' | 'cancelada' | 'estornada';

export interface LimitesPlano {
  barbeiros: number;           // -1 = ilimitado
  cadeiras: number;            // -1 = ilimitado
  agendamentosMes: number;     // -1 = ilimitado
  lembretes: boolean;
  relatoriosFinanceiros: boolean;
  apiAcesso: boolean;
  suportePrioritario: boolean;
  marcaBranca: boolean;
}

export interface PlanoAssinatura {
  id: PlanoId;
  nome: string;
  descricao: string;
  precoMensal: number;         // em centavos
  precoAnual: number;          // em centavos (já com desconto)
  descontoAnual: number;       // percentual (ex: 20 = 20%)
  limites: LimitesPlano;
  destaque?: boolean;          // plano recomendado
  ordem: number;
}

export interface AssinaturaAtiva {
  id: string;
  planoId: PlanoId;
  ciclo: CicloFaturamento;
  status: StatusAssinatura;
  dataInicio: string;          // ISO 8601
  dataProximaCobranca: string; // ISO 8601
  dataCancelamento?: string;   // ISO 8601
  dataPausa?: string;          // ISO 8601
  valorAtual: number;          // em centavos
  descontoAplicado?: number;   // percentual
  cupomId?: string;
  metadata?: Record<string, unknown>;
}

export interface Fatura {
  id: string;
  assinaturaId: string;
  numero: string;              // ex: "CR-2024-001234"
  status: StatusFatura;
  valor: number;               // em centavos
  valorPago: number;           // em centavos
  dataEmissao: string;         // ISO 8601
  dataVencimento: string;      // ISO 8601
  dataPagamento?: string;      // ISO 8601
  metodoPagamento?: 'pix' | 'cartao' | 'boleto' | 'transferencia';
  urlBoleto?: string;
  urlPix?: string;
  pdfUrl?: string;
  itens: FaturaItem[];
}

export interface FaturaItem {
  descricao: string;
  quantidade: number;
  valorUnitario: number;       // em centavos
  valorTotal: number;          // em centavos
}

export interface HistoricoPlano {
  id: string;
  planoAnteriorId: PlanoId;
  planoNovoId: PlanoId;
  cicloAnterior: CicloFaturamento;
  cicloNovo: CicloFaturamento;
  tipo: 'upgrade' | 'downgrade' | 'mudanca_ciclo';
  dataEfetivacao: string;      // ISO 8601
  valorDiferenca: number;      // em centavos (positivo = cobrança extra, negativo = crédito)
  prorrateado: boolean;
}

export interface CupomDesconto {
  id: string;
  codigo: string;
  descricao: string;
  tipo: 'percentual' | 'fixo';
  valor: number;               // percentual (ex: 20) ou centavos (ex: 5000)
  planoElegivel?: PlanoId[];   // undefined = todos
  cicloElegivel?: CicloFaturamento[];
  maxUsos?: number;
  usosAtuais: number;
  dataInicio: string;          // ISO 8601
  dataFim?: string;            // ISO 8601
  ativo: boolean;
  primeiraAssinatura?: boolean;
}

export interface ValidacaoCupom {
  valido: boolean;
  cupom?: CupomDesconto;
  erro?: string;
  valorDesconto: number;       // em centavos
  codigo?: string;             // código de erro para debugging
}

export interface VerificacaoLimite {
  permitido: boolean;
  limiteAtual: number;
  limiteMaximo: number;
  recurso: 'barbeiros' | 'cadeiras' | 'agendamentosMes';
  mensagemUpsell?: string;
  planoSugerido?: PlanoId;
}

export interface ComparacaoPlanosProps {
  planoAtual?: PlanoId;
  cicloPreferido?: CicloFaturamento;
  onSelecionarPlano: (_planoId: PlanoId, _ciclo: CicloFaturamento) => void;
  onVerDetalhes?: (_planoId: PlanoId) => void;
}

export interface GerenciamentoAssinaturaProps {
  assinatura: AssinaturaAtiva | null;
  faturas: Fatura[];
  historico: HistoricoPlano[];
  planos: PlanoAssinatura[];
  carregando: boolean;
  erro?: string | null;
  aoTrocarPlano: (_planoId: PlanoId, _ciclo: CicloFaturamento) => Promise<void>;
  aoPausar: () => Promise<void>;
  aoCancelar: (_motivo: string) => Promise<void>;
  aoReativar: () => Promise<void>;
  aoAplicarCupom: (_codigo: string) => Promise<void>;
  aoBaixarFatura: (_faturaId: string) => Promise<void>;
  aoImprimirFatura: (_faturaId: string) => void;
}

export const PLANOS_DEFINICAO: readonly PlanoAssinatura[] = [
  {
    id: 'starter',
    nome: 'Starter',
    descricao: 'Ideal para barbeiros individuais começando',
    precoMensal: 0,
    precoAnual: 0,
    descontoAnual: 0,
    limites: {
      barbeiros: 1,
      cadeiras: 1,
      agendamentosMes: 100,
      lembretes: true,
      relatoriosFinanceiros: false,
      apiAcesso: false,
      suportePrioritario: false,
      marcaBranca: false,
    },
    ordem: 1,
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    descricao: 'Para barbearias em crescimento com equipe',
    precoMensal: 14900,      // R$ 149,00
    precoAnual: 143040,     // R$ 1.430,40 (20% off = R$ 119,20/mês)
    descontoAnual: 20,
    limites: {
      barbeiros: 5,
      cadeiras: 5,
      agendamentosMes: 500,
      lembretes: true,
      relatoriosFinanceiros: true,
      apiAcesso: true,
      suportePrioritario: true,
      marcaBranca: false,
    },
    destaque: true,
    ordem: 2,
  },
  {
    id: 'enterprise',
    nome: 'Rede/Enterprise',
    descricao: 'Para redes de barbearias e franquias',
    precoMensal: 49900,     // R$ 499,00
    precoAnual: 479040,     // R$ 4.790,40 (20% off = R$ 399,20/mês)
    descontoAnual: 20,
    limites: {
      barbeiros: -1,
      cadeiras: -1,
      agendamentosMes: -1,
      lembretes: true,
      relatoriosFinanceiros: true,
      apiAcesso: true,
      suportePrioritario: true,
      marcaBranca: true,
    },
    ordem: 3,
  },
] as const;

export function obterPlanoPorId(id: PlanoId): PlanoAssinatura | undefined {
  return PLANOS_DEFINICAO.find(p => p.id === id);
}

export function obterLimitesPlano(planoId: PlanoId): LimitesPlano {
  return obterPlanoPorId(planoId)?.limites ?? PLANOS_DEFINICAO[0].limites;
}

export function formatarMoeda(centavos: number, locale = 'pt-BR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(centavos / 100);
}

export function formatarDataRelativa(dataISO: string): string {
  const data = new Date(dataISO);
  const agora = new Date();
  const diffMs = data.getTime() - agora.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return `${Math.abs(diffDias)} dia${Math.abs(diffDias) !== 1 ? 's' : ''} atrás`;
  if (diffDias === 0) return 'Hoje';
  if (diffDias === 1) return 'Amanhã';
  if (diffDias <= 7) return `Em ${diffDias} dia${diffDias !== 1 ? 's' : ''}`;
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function calcularEconomiaAnual(plano: PlanoAssinatura): number {
  return (plano.precoMensal * 12) - plano.precoAnual;
}

export function precoEfetivo(plano: PlanoAssinatura, ciclo: CicloFaturamento): number {
  return ciclo === 'anual' ? plano.precoAnual : plano.precoMensal;
}

export function formatarStatusAssinatura(status: StatusAssinatura): { label: string; cor: string } {
  const map: Record<StatusAssinatura, { label: string; cor: string }> = {
    ativa: { label: 'Ativa', cor: '#10b981' },
    pausada: { label: 'Pausada', cor: '#f59e0b' },
    cancelada: { label: 'Cancelada', cor: '#ef4444' },
    expirada: { label: 'Expirada', cor: '#6b7280' },
    pendente: { label: 'Pendente', cor: '#8b5cf6' },
  };
  return map[status] ?? { label: status, cor: '#6b7280' };
}

export function formatarStatusFatura(status: StatusFatura): { label: string; cor: string } {
  const map: Record<StatusFatura, { label: string; cor: string }> = {
    paga: { label: 'Paga', cor: '#10b981' },
    pendente: { label: 'Pendente', cor: '#f59e0b' },
    vencida: { label: 'Vencida', cor: '#ef4444' },
    cancelada: { label: 'Cancelada', cor: '#6b7280' },
    estornada: { label: 'Estornada', cor: '#8b5cf6' },
  };
  return map[status] ?? { label: status, cor: '#6b7280' };
}