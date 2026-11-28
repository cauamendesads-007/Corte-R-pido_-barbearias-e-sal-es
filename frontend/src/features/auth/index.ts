/**
 * Ponto de entrada principal do domínio de Autenticação (Feature-based).
 * Exporta tipos, regras, serviços, hooks e componentes públicos.
 */

// Tipos
export * from './types';

// Regras de negócio puras
export * from './rules';

// Serviços (camada de dados, injetável via DIP)
export * from './services';

// Hooks (estado + efeitos colaterais)
export * from './hooks';

// Componentes visuais puros
export * from './components';