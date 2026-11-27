/**
 * Assinaturas Feature - Exports públicos
 * Feature-based architecture: components, hooks, services, types, rules
 */

// Types
export type {
  PlanoId,
  CicloFaturamento,
  StatusAssinatura,
  StatusFatura,
  LimitesPlano,
  PlanoAssinatura,
  AssinaturaAtiva,
  Fatura,
  FaturaItem,
  HistoricoPlano,
  CupomDesconto,
  ValidacaoCupom,
  VerificacaoLimite,
  ComparacaoPlanosProps,
  GerenciamentoAssinaturaProps,
} from './types';

export {
  PLANOS_DEFINICAO,
  obterPlanoPorId,
  obterLimitesPlano,
  formatarMoeda,
  formatarDataRelativa,
  calcularEconomiaAnual,
  precoEfetivo,
} from './types';

// Rules (pure business logic)
export {
  validarPlanoId,
  validarCicloFaturamento,
  validarStatusAssinatura,
  calcularPrecoComDesconto,
  calcularProrrateacao,
  validarCupom,
  verificarLimitePlano,
  gerarIdAssinatura,
  gerarNumeroFatura,
  gerarIdempotencyKey,
  formatarStatusAssinatura,
  formatarStatusFatura,
  podeAlterarPlano,
  podePausarAssinatura,
  podeCancelarAssinatura,
  podeReativarAssinatura,
  calcularDiasProximaCobranca,
  sanitizarCupom,
  sanitizarMotivoCancelamento,
} from './rules';

// Services (DIP interface + implementation)
export type { IAssinaturasService } from './services';
export { createAssinaturasService, getAssinaturasService, resetAssinaturasService } from './services';

// Hooks
export { useAssinaturas, useComparacaoPlanos, useGerenciamentoAssinatura, useUpsellContextual } from './hooks/useAssinaturas';

// Components
export { ComparacaoPlanos } from './components/ComparacaoPlanos';
export { GerenciamentoAssinatura } from './components/GerenciamentoAssinatura';
export { ModalConfirmacao } from './components/ModalConfirmacao';
export { ModalCupom } from './components/ModalCupom';
export { FaturaDetalhe } from './components/FaturaDetalhe';
export { ModalUpsell } from './components/ModalUpsell';