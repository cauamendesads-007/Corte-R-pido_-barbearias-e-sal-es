/**
 * Tipos do domínio Checkout - Pix, Cartão, Idempotência, Resumo.
 */

export type MetodoPagamento = 'pix' | 'cartao' | 'boleto';
export type StatusPagamento = 'pendente' | 'processando' | 'aprovado' | 'recusado' | 'expirado' | 'cancelado';
export type BandeiraCartao = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'desconhecida';

export interface ItemCheckout {
  id: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;    // centavos
  valorTotal: number;       // centavos
  metadata?: Record<string, unknown>;
}

export interface DadosPagamentoPix {
  chave: string;            // chave Pix (CPF, email, telefone, aleatória)
  qrCode: string;           // payload EMVCo
  qrCodeImage: string;      // base64 ou URL
  expiracao: string;        // ISO 8601
  valor: number;            // centavos
}

export interface DadosPagamentoCartao {
  numero: string;           // apenas últimos 4 dígitos no frontend
  nomeTitular: string;
  validade: string;         // MM/AA
  cvv: string;              // não armazenar
  bandeira: BandeiraCartao;
  parcelas: number;
  salvarCartao: boolean;
}

export interface DadosPagamentoBoleto {
  codigoBarras: string;
  linhaDigitavel: string;
  urlBoleto: string;
  vencimento: string;       // ISO 8601
  valor: number;
}

export interface CheckoutSession {
  id: string;               // idempotency key
  status: StatusPagamento;
  metodo: MetodoPagamento;
  itens: ItemCheckout[];
  subtotal: number;         // centavos
  desconto: number;         // centavos
  total: number;            // centavos
  dataCriacao: string;      // ISO 8601
  dataExpiracao: string;    // ISO 8601
  dataPagamento?: string;   // ISO 8601
  pix?: DadosPagamentoPix;
  cartao?: DadosPagamentoCartao;
  boleto?: DadosPagamentoBoleto;
  metadata?: Record<string, unknown>;
}

export interface ResumoCheckout {
  itens: ItemCheckout[];
  subtotal: number;
  desconto: number;
  total: number;
  formatoMoeda: (_centavos: number) => string;
}

export interface ValidacaoCartao {
  valido: boolean;
  bandeira?: BandeiraCartao;
  erros: string[];
}

export interface ValidacaoCPF_CNPJ {
  valido: boolean;
  tipo?: 'cpf' | 'cnpj';
  formatado?: string;
  erro?: string;
}

export interface CheckoutProps {
  itens: ItemCheckout[];
  subtotal: number;
  desconto?: number;
  onPagarPix: (_dados: DadosPagamentoPix) => Promise<void>;
  onPagarCartao: (_dados: DadosPagamentoCartao) => Promise<void>;
  onPagarBoleto: (_dados: DadosPagamentoBoleto) => Promise<void>;
  carregando?: boolean;
  erro?: string | null;
}

export interface StickySummaryProps {
  resumo: ResumoCheckout;
  metodoSelecionado: MetodoPagamento;
  aoSelecionarMetodo: (_metodo: MetodoPagamento) => void;
  carregando: boolean;
  aoPagar: () => Promise<void>;
  desabilitado?: boolean;
}

export interface PixQrCodeProps {
  dados: DadosPagamentoPix;
  aoCopiar: () => Promise<void>;
  aoExpirar: () => void;
  tempoRestante: number;    // segundos
}

export interface CartaoFormProps {
  valor: number;            // centavos
  aoPagar: (_dados: DadosPagamentoCartao) => Promise<void>;
  carregando: boolean;
  erro?: string | null;
  parcelasMaximas?: number;
}

export interface IdempotencyKey {
  chave: string;
  acao: string;
  entidadeId: string;
  criadoEm: string;         // ISO 8601
  expiraEm: string;         // ISO 8601
  usado: boolean;
}

// ============================================
// CONSTANTES E UTILITÁRIOS
// ============================================

export const BANDEIRAS_PATTERNS: Record<BandeiraCartao, RegExp> = {
  visa: /^4/,
  mastercard: /^5[1-5]/,
  elo: /^(4011|4312|4389|4514|4576|5041|5067|5090|6277|6362|6363|6500|6504|6505|6506|6507|6508|6509|6516|6550)/,
  amex: /^3[47]/,
  hipercard: /^(606282|3841)/,
  desconhecida: /.*/,
};

export const BANDEIRA_LABELS: Record<BandeiraCartao, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
  desconhecida: 'Bandeira não identificada',
};

export const PARCELAS_SEM_JUROS_MAX = 12;
export const PARCELAS_COM_JUROS_MAX = 24;
export const JUROS_PARCELADO_MENSAL = 2.99; // % ao mês

export function identificarBandeira(numero: string): BandeiraCartao {
  const limpo = numero.replace(/\D/g, '');
  for (const [bandeira, pattern] of Object.entries(BANDEIRAS_PATTERNS)) {
    if (pattern.test(limpo)) return bandeira as BandeiraCartao;
  }
  return 'desconhecida';
}

export function formatarCartao(numero: string): string {
  const limpo = numero.replace(/\D/g, '');
  const bandeira = identificarBandeira(limpo);

  if (bandeira === 'amex') {
    // Amex: 4-6-5
    return limpo.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3').trim();
  }
  // Demais: 4-4-4-4
  return limpo.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4').trim();
}

export function formatarValidade(valor: string): string {
  const limpo = valor.replace(/\D/g, '');
  if (limpo.length >= 2) {
    return `${limpo.slice(0, 2)}/${limpo.slice(2, 4)}`;
  }
  return limpo;
}

export function formatarCPF_CNPJ(valor: string): string {
  const limpo = valor.replace(/\D/g, '');
  if (limpo.length <= 11) {
    // CPF: 999.999.999-99
    return limpo
      .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      .replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
      .replace(/(\d{3})(\d{1,3})/, '$1.$2');
  } else {
    // CNPJ: 99.999.999/9999-99
    return limpo
      .replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      .replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4')
      .replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3')
      .replace(/(\d{2})(\d{1,3})/, '$1.$2');
  }
}

export function calcularParcelas(valorTotal: number, maxParcelas: number = PARCELAS_SEM_JUROS_MAX) {
  const parcelas: Array<{ numero: number; valor: number; total: number; comJuros: boolean }> = [];

  for (let i = 1; i <= maxParcelas; i++) {
    const comJuros = i > PARCELAS_SEM_JUROS_MAX;
    let valorParcela: number;
    let valorTotalParcela: number;

    if (comJuros) {
      // Juros compostos simplificado
      const fator = Math.pow(1 + JUROS_PARCELADO_MENSAL / 100, i);
      valorTotalParcela = Math.round(valorTotal * fator);
      valorParcela = Math.round(valorTotalParcela / i);
    } else {
      valorParcela = Math.round(valorTotal / i);
      valorTotalParcela = valorParcela * i;
    }

    parcelas.push({
      numero: i,
      valor: valorParcela,
      total: valorTotalParcela,
      comJuros,
    });
  }

  return parcelas;
}

export function gerarIdempotencyKey(acao: string, entidadeId: string): string {
  return `idem_${acao}_${entidadeId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
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