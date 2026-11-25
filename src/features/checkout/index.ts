/**
 * Checkout Feature - Exports públicos
 * Feature-based architecture: components, hooks, services, types, rules
 */

// Types
export type {
  MetodoPagamento,
  StatusPagamento,
  BandeiraCartao,
  ItemCheckout,
  DadosPagamentoPix,
  DadosPagamentoCartao,
  DadosPagamentoBoleto,
  CheckoutSession,
  ResumoCheckout,
  ValidacaoCartao,
  ValidacaoCPF_CNPJ,
  CheckoutProps,
  StickySummaryProps,
  PixQrCodeProps,
  CartaoFormProps,
  IdempotencyKey,
} from './types';

export {
  BANDEIRAS_PATTERNS,
  BANDEIRA_LABELS,
  PARCELAS_SEM_JUROS_MAX,
  PARCELAS_COM_JUROS_MAX,
  JUROS_PARCELADO_MENSAL,
  identificarBandeira,
  formatarCartao,
  formatarValidade,
  formatarCPF_CNPJ,
  calcularParcelas,
  gerarIdempotencyKey,
  formatarMoeda,
} from './types';

// Rules (pure business logic)
export {
  validarLuhn,
  validarNumeroCartao,
  validarValidadeCartao,
  validarCVV,
  validarNomeTitular,
  validarCartaoCompleto,
  validarCPF,
  validarCNPJ,
  validarCPF_CNPJ,
  validarChavePix,
  validarQRCodePix,
  calcularTotaisCheckout,
  validarItensCheckout,
  validarIdempotencyKey,
  criarSessaoCheckout,
  ERRO_CODIGOS,
  // Re-export utilitários
  identificarBandeira,
  formatarCartao,
  formatarValidade,
  formatarCPF_CNPJ,
  calcularParcelas,
  gerarIdempotencyKey,
  formatarMoeda,
} from './rules';

// Services (DIP interface + implementation)
export type { ICheckoutService } from './services';
export { createCheckoutService, getCheckoutService, resetCheckoutService } from './services';

// Hooks
export { useCheckout, useStickySummary, useCartaoForm } from './hooks/useCheckout';

// Components
export { Checkout } from './components/Checkout';
export { StickySummary } from './components/StickySummary';
export { PixQrCode } from './components/PixQrCode';
export { CartaoForm } from './components/CartaoForm';
export { BoletoView } from './components/BoletoView';
export { ModalSucesso } from './components/ModalSucesso';