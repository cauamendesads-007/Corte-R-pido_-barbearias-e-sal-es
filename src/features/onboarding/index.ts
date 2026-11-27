/**
 * Onboarding Feature - Exportações Públicas
 */

export { Onboarding } from './components/Onboarding';
export { OnboardingProvider, useOnboarding, useOnboardingService } from './hooks/useOnboarding';
export { OnboardingServiceMock } from './services/OnboardingServiceMock';
export type { IOnboardingService } from './services/IOnboardingService';

export type {
  EtapaOnboarding,
  DadosOnboarding,
  OnboardingState,
  OnboardingActions,
  OnboardingContextType,
} from './types';

export {
  ETAPAS_ORDEM,
  TITULOS_ETAPAS,
  DESCRICOES_ETAPAS,
  CORES_TEMA,
  LAYOUTS_DISPONIVEIS,
  NICHOS_OPCOES,
  DADOS_INICIAIS,
} from './types';