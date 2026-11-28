/**
 * Regras puras do domínio Assinaturas - Validações, Cálculos, Limites.
 * Zero dependências React, < 30 linhas por função, early returns.
 */

import type {
  PlanoId,
  CicloFaturamento,
  StatusAssinatura,
  PlanoAssinatura,
  LimitesPlano,
  AssinaturaAtiva,
  CupomDesconto,
  ValidacaoCupom,
  VerificacaoLimite,
} from '../types';

import { PLANOS_DEFINICAO as PLANOS } from '../types';

// ============================================
// CONSTANTES
// ============================================

const CICLOS_VALIDOS: readonly CicloFaturamento[] = ['mensal', 'anual'];
const PLANOS_VALIDOS: readonly PlanoId[] = ['starter', 'profissional', 'enterprise'];
const STATUSES_VALIDOS: readonly StatusAssinatura[] = ['ativa', 'pausada', 'cancelada', 'expirada', 'pendente'];

const ERRO_CODIGOS = {
  PLANO_INVALIDO: 'PLANO_INVALIDO',
  CICLO_INVALIDO: 'CICLO_INVALIDO',
  STATUS_INVALIDO: 'STATUS_INVALIDO',
  CUPON_EXPIRADO: 'CUPON_EXPIRADO',
  CUPON_INATIVO: 'CUPON_INATIVO',
  CUPON_USOS_ESGOTADOS: 'CUPON_USOS_ESGOTADOS',
  CUPON_PLANO_INCOMPATIVEL: 'CUPON_PLANO_INCOMPATIVEL',
  CUPON_CICLO_INCOMPATIVEL: 'CUPON_CICLO_INCOMPATIVEL',
  CUPON_PRIMEIRA_ASSINATURA: 'CUPON_PRIMEIRA_ASSINATURA',
  LIMITE_ATINGIDO: 'LIMITE_ATINGIDO',
  ASSINATURA_INEXISTENTE: 'ASSINATURA_INEXISTENTE',
  FATURA_INEXISTENTE: 'FATURA_INEXISTENTE',
  VALOR_INVALIDO: 'VALOR_INVALIDO',
} as const;

// ============================================
// VALIDAÇÕES BÁSICAS
// ============================================

export function validarPlanoId(planoId: string): planoId is PlanoId {
  return PLANOS_VALIDOS.includes(planoId as PlanoId);
}

export function validarCicloFaturamento(ciclo: string): ciclo is CicloFaturamento {
  return CICLOS_VALIDOS.includes(ciclo as CicloFaturamento);
}

export function validarStatusAssinatura(status: string): status is StatusAssinatura {
  return STATUSES_VALIDOS.includes(status as StatusAssinatura);
}

// ============================================
// CÁLCULOS DE PREÇO E ECONOMIA
// ============================================

export function calcularPrecoComDesconto(
  plano: PlanoAssinatura,
  ciclo: CicloFaturamento,
  cupom?: CupomDesconto
): { precoOriginal: number; precoFinal: number; descontoTotal: number } {
  const precoBase = ciclo === 'anual' ? plano.precoAnual : plano.precoMensal;
  let descontoCupom = 0;

  if (cupom) {
    if (cupom.tipo === 'percentual') {
      descontoCupom = Math.round(precoBase * (cupom.valor / 100));
    } else {
      descontoCupom = cupom.valor;
    }
  }

  const precoFinal = Math.max(0, precoBase - descontoCupom);
  return {
    precoOriginal: precoBase,
    precoFinal,
    descontoTotal: descontoCupom,
  };
}

export function calcularProrrateacao(
  planoAtual: PlanoAssinatura,
  planoNovo: PlanoAssinatura,
  cicloAtual: CicloFaturamento,
  cicloNovo: CicloFaturamento,
  diasRestantes: number,
  diasTotaisCiclo: number
): { credito: number; debito: number; valorLiquido: number } {
  const precoAtualDia = (cicloAtual === 'anual' ? planoAtual.precoAnual : planoAtual.precoMensal) / diasTotaisCiclo;
  const precoNovoDia = (cicloNovo === 'anual' ? planoNovo.precoAnual : planoNovo.precoMensal) / diasTotaisCiclo;

  const credito = Math.round(precoAtualDia * diasRestantes);
  const debito = Math.round(precoNovoDia * diasRestantes);
  const valorLiquido = debito - credito; // positivo = cobrar, negativo = creditar

  return { credito, debito, valorLiquido };
}

// ============================================
// VALIDAÇÃO DE CUPONS
// ============================================

export function validarCupom(
  cupom: CupomDesconto | undefined,
  planoId: PlanoId,
  ciclo: CicloFaturamento,
  ehPrimeiraAssinatura: boolean,
  assinaturasAnteriores: number
): ValidacaoCupom {
  if (!cupom) {
    return { valido: false, erro: 'Cupom não fornecido', valorDesconto: 0, codigo: ERRO_CODIGOS.CUPON_EXPIRADO };
  }

  if (!cupom.ativo) {
    return { valido: false, erro: 'Cupom inativo', valorDesconto: 0, codigo: ERRO_CODIGOS.CUPON_INATIVO };
  }

  const agora = new Date();
  const inicio = new Date(cupom.dataInicio);
  if (agora < inicio) {
    return { valido: false, erro: 'Cupom ainda não válido', valorDesconto: 0, codigo: ERRO_CODIGOS.CUPON_EXPIRADO };
  }

  if (cupom.dataFim) {
    const fim = new Date(cupom.dataFim);
    fim.setHours(23, 59, 59, 999);
    if (agora > fim) {
      return { valido: false, erro: 'Cupom expirado', valorDesconto: 0, codigo: ERRO_CODIGOS.CUPON_EXPIRADO };
    }
  }

  if (cupom.maxUsos && cupom.usosAtuais >= cupom.maxUsos) {
    return { valido: false, erro: 'Cupom esgotado', valorDesconto: 0, codigo: ERRO_CODIGOS.CUPON_USOS_ESGOTADOS };
  }

  if (cupom.planoElegivel?.length && !cupom.planoElegivel.includes(planoId)) {
    return { valido: false, erro: 'Cupom não válido para este plano', valorDesconto: 0, codigo: ERRO_CODIGOS.CUPON_PLANO_INCOMPATIVEL };
  }

  if (cupom.cicloElegivel?.length && !cupom.cicloElegivel.includes(ciclo)) {
    return { valido: false, erro: 'Cupom não válido para este ciclo', valorDesconto: 0, codigo: ERRO_CODIGOS.CUPON_CICLO_INCOMPATIVEL };
  }

  if (cupom.primeiraAssinatura && !ehPrimeiraAssinatura && assinaturasAnteriores > 0) {
    return { valido: false, erro: 'Cupom válido apenas para primeira assinatura', valorDesconto: 0, codigo: ERRO_CODIGOS.CUPON_PRIMEIRA_ASSINATURA };
  }

  let valorDesconto = 0;
  const plano = PLANOS.find(p => p.id === planoId);
  if (plano) {
    const precoBase = ciclo === 'anual' ? plano.precoAnual : plano.precoMensal;
    if (cupom.tipo === 'percentual') {
      valorDesconto = Math.round(precoBase * (cupom.valor / 100));
    } else {
      valorDesconto = Math.min(cupom.valor, precoBase);
    }
  }

  return { valido: true, cupom, valorDesconto };
}

// ============================================
// VERIFICAÇÃO DE LIMITES (UPSELL CONTEXTUAL)
// ============================================

export function verificarLimitePlano(
  planoId: PlanoId,
  recurso: 'barbeiros' | 'cadeiras' | 'agendamentosMes',
  quantidadeAtual: number,
  quantidadeNova: number = quantidadeAtual + 1
): VerificacaoLimite {
  const limites = obterLimitesPlano(planoId);
  const limiteMaximo = limites[recurso];

  if (limiteMaximo === -1) {
    return { permitido: true, limiteAtual: quantidadeAtual, limiteMaximo: -1, recurso };
  }

  const permitido = quantidadeNova <= limiteMaximo;

  if (!permitido) {
    const planoSugerido = sugerirPlanoPorLimite(planoId, recurso);
    return {
      permitido: false,
      limiteAtual: quantidadeAtual,
      limiteMaximo,
      recurso,
      mensagemUpsell: `Você atingiu o limite de ${limiteMaximo} ${recurso === 'barbeiros' ? 'barbeiros' : recurso === 'cadeiras' ? 'cadeiras' : 'agendamentos/mês'} no plano ${obterNomePlano(planoId)}.`,
      planoSugerido,
    };
  }

  return { permitido: true, limiteAtual: quantidadeAtual, limiteMaximo, recurso };
}

function sugerirPlanoPorLimite(planoAtualId: PlanoId, recurso: 'barbeiros' | 'cadeiras' | 'agendamentosMes'): PlanoId | undefined {
  const indiceAtual = PLANOS.findIndex(p => p.id === planoAtualId);
  for (let i = indiceAtual + 1; i < PLANOS.length; i++) {
    if (PLANOS[i].limites[recurso] === -1 || PLANOS[i].limites[recurso] > PLANOS[indiceAtual].limites[recurso]) {
      return PLANOS[i].id;
    }
  }
  return undefined;
}

function obterNomePlano(planoId: PlanoId): string {
  return PLANOS.find(p => p.id === planoId)?.nome ?? planoId;
}

function obterLimitesPlano(planoId: PlanoId): LimitesPlano {
  return PLANOS.find(p => p.id === planoId)?.limites ?? PLANOS[0].limites;
}

// ============================================
// GERAÇÃO DE IDS E NÚMEROS
// ============================================

export function gerarIdAssinatura(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function gerarNumeroFatura(sequencial: number): string {
  const ano = new Date().getFullYear();
  return `CR-${ano}-${String(sequencial).padStart(6, '0')}`;
}

export function gerarIdempotencyKey(acao: string, entidadeId: string): string {
  return `idem_${acao}_${entidadeId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

// ============================================
// FORMATAÇÃO E UTILITÁRIOS
// ============================================

export function formatarStatusAssinatura(status: StatusAssinatura): { label: string; cor: 'sucesso' | 'aviso' | 'erro' | 'neutro' } {
  switch (status) {
    case 'ativa': return { label: 'Ativa', cor: 'sucesso' };
    case 'pausada': return { label: 'Pausada', cor: 'aviso' };
    case 'cancelada': return { label: 'Cancelada', cor: 'erro' };
    case 'expirada': return { label: 'Expirada', cor: 'erro' };
    case 'pendente': return { label: 'Pendente', cor: 'aviso' };
    default: return { label: status, cor: 'neutro' };
  }
}

export function formatarStatusFatura(status: string): { label: string; cor: 'sucesso' | 'aviso' | 'erro' | 'neutro' } {
  switch (status) {
    case 'paga': return { label: 'Paga', cor: 'sucesso' };
    case 'pendente': return { label: 'Pendente', cor: 'aviso' };
    case 'vencida': return { label: 'Vencida', cor: 'erro' };
    case 'cancelada': return { label: 'Cancelada', cor: 'neutro' };
    case 'estornada': return { label: 'Estornada', cor: 'aviso' };
    default: return { label: status, cor: 'neutro' };
  }
}

export function podeAlterarPlano(assinatura: AssinaturaAtiva | null): boolean {
  if (!assinatura) return false;
  return ['ativa', 'pausada'].includes(assinatura.status);
}

export function podePausarAssinatura(assinatura: AssinaturaAtiva | null): boolean {
  if (!assinatura) return false;
  return assinatura.status === 'ativa';
}

export function podeCancelarAssinatura(assinatura: AssinaturaAtiva | null): boolean {
  if (!assinatura) return false;
  return ['ativa', 'pausada', 'pendente'].includes(assinatura.status);
}

export function podeReativarAssinatura(assinatura: AssinaturaAtiva | null): boolean {
  if (!assinatura) return false;
  return ['pausada', 'cancelada'].includes(assinatura.status);
}

export function calcularDiasProximaCobranca(dataProximaCobranca: string): number {
  const proxima = new Date(dataProximaCobranca);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diffMs = proxima.getTime() - hoje.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================
// SANITIZAÇÃO
// ============================================

export function sanitizarCupom(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function sanitizarMotivoCancelamento(motivo: string): string {
  return motivo.trim().slice(0, 500);
}