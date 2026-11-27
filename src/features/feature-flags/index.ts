/**
 * Exportações públicas do domínio Feature Flags.
 * Controle de funcionalidades, Rollout, Targeting, Avaliação.
 */

// Types
export type {
  FlagTipo,
  FlagAmbiente,
  RolloutEstrategia,
  FeatureFlag,
  RolloutConfig,
  FlagEvaluation,
  ContextoAvaliacao,
  FeatureFlagsConfig,
  FlagChangeEvent,
} from './types';

export {
  AMBIENTES,
  TIPOS_FLAG,
  ESTRATEGIAS_ROLLOUT,
  CONFIG_PADRAO,
  gerarIdFlag,
  validarChaveFlag,
  validarRolloutConfig,
  criarFlagPadrao,
  FLAGS_SISTEMA,
} from './types';

// Rules
export {
  validarFlag,
  validarContexto,
  avaliarFlag,
  avaliarTodasFlags,
  obterValorFlag,
  flagHabilitada,
  obterTodasHabilitadas,
  serializarFlagsParaCache,
  deserializarFlagsDoCache,
  detectarMudancas,
} from './rules';

// Services
export type { IFeatureFlagsService } from './services';
export {
  createFeatureFlagsService,
  getFeatureFlagsService,
  resetFeatureFlagsService,
  featureFlags,
} from './services';

// Hooks
export {
  FeatureFlagsProvider,
  useFeatureFlagsContext,
  useFlag,
  useFlagEvaluation,
  useFlagEnabled,
  useFlagsHabilitadas,
  useFeatureFlagsContexto,
  useAtualizarContextoFeatureFlags,
  useFeatureFlagsAdmin,
  useBooleanFlag,
  useStringFlag,
  useNumberFlag,
  useJsonFlag,
  useFlags,
  useFeatureGate,
  useRolloutInfo,
  usePersistedFeatureFlagsContext,
} from './hooks/useFeatureFlags';

// Components
export {
  FeatureFlagToggle,
} from './components';

export type {
  FeatureFlagToggleProps,
} from './components';