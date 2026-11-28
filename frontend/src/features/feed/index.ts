/**
 * Domínio Feed - Exportações principais.
 * Feature-based architecture: componentes, hooks, services, types, rules.
 */

// Types
export type {
  Publicacao,
  PublicacaoInput,
  PublicacaoTipo,
  PublicacaoStatus,
  Comentario,
  ComentarioInput,
  Curtida,
  Inspiracao,
  InspiracaoInput,
  InspiracaoCategoria,
  FeedFiltros,
  FeedOrdenacao,
  Recomendacao,
  FeedState,
  FeedActions,
  PublicacaoState,
  PublicacaoActions,
  InspiracoesState,
  InspiracoesActions,
  FeedResult,
} from './types';

// Rules
export {
  validarPublicacao,
  validarComentario,
  validarInspiracao,
  computarScoreRecomendacao,
  ordenarPublicacoes,
  filtrarPublicacoes,
  gerarRecomendacoes,
  agruparPorData,
  calcularTempoRelativo,
  extrairHashtags,
  extrairMencoes,
  sanitizarConteudo,
  ehVideo,
  obterPrimeiraImagem,
  criarFeedError,
} from './rules';

// Services
export type { IFeedService } from './services';
export {
  FeedService,
  getFeedService,
  setFeedService,
  createFeedService,
  createMockFeedService,
} from './services';

// Hooks
export {
  useFeed,
  usePublicacao,
  useInspiracoes,
} from './hooks';

// Components
export {
  PublicacaoCard,
  FeedList,
  FeedDetail,
  Comentarios,
  Inspiracoes,
  PublicacaoFormModal,
} from './components';