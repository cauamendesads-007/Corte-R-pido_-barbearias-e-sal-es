/**
 * Tipos e contratos do domínio de Estabelecimentos.
 * Contratos estritos usando Discriminated Unions, Result<T, E>, as const.
 */

import type { Estabelecimento, Servico, ItemGaleria, Avaliacao, FiltrosBusca, NichoEstabelecimento, TipoLayout, ConfiguracaoPix, MensagemAutomatica } from '@/tipos';

// Re-export base types from @/tipos
export type { Estabelecimento, Servico, ItemGaleria, Avaliacao, FiltrosBusca, NichoEstabelecimento, StatusEstabelecimento, TipoLayout, ConfiguracaoPix, MensagemAutomatica } from '@/tipos';

/** Filtros para listagem de estabelecimentos (admin/barbeiro) */
export interface FiltrosEstabelecimento {
  busca: string;
  nicho: NichoEstabelecimento | 'todos';
  cidade: string;
  ordenacao: 'relevancia' | 'avaliacao' | 'distancia' | 'fila' | 'preco';
  raioKm: number;
  apenasAbertos: boolean;
  avaliacaoMinima: number;
  precoMaximo: number;
}

/** Entrada para criar/atualizar serviço */
export interface ServicoInput {
  nome: string;
  preco: number;
  duracaoMinutos: number;
  tag: string;
  midias?: Array<{ tipo: 'imagem' | 'video'; src: string }>;
}

/** Entrada para item de galeria */
export interface GaleriaItemInput {
  src: string;
  tipo?: 'imagem' | 'video';
}

/** Entrada para tema do estabelecimento */
export interface TemaInput {
  cor?: string;
  layout?: TipoLayout;
  titulo?: string;
  subtitulo?: string;
}

/** Entrada para configuração Pix */
export interface ConfiguracaoPixInput {
  modo: 'desativado' | 'opcional' | 'obrigatorio';
  chave: string;
  percentualSinal: number;
}

/** Entrada para mensagens automáticas */
export interface MensagensAutomaticasInput {
  geral: string;
  porServico: Record<string, string>;
}

/** Dados computados do estabelecimento para UI */
export interface EstabelecimentoComputado {
  estabelecimento: Estabelecimento;
  distanciaKm?: number;
  horarioDisponivelHoje?: string;
  servicosComMidia: Servico[];
  avaliacaoMedia: number;
  totalAvaliacoes: number;
  temVagasHoje: boolean;
}

/** Resultado de operação (compatível com ResultadoServico da API) */
export interface Result<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
}

/** Estado do hook de estabelecimentos (marketplace) */
export interface EstabelecimentosState {
  estabelecimentos: EstabelecimentoComputado[];
  carregando: boolean;
  erro: string | null;
  filtros: FiltrosBusca;
  pagina: number;
  temMais: boolean;
}

/** Ações do hook de estabelecimentos (marketplace) */
export interface EstabelecimentosActions {
  recarregar: () => Promise<void>;
  carregarMais: () => Promise<void>;
  definirFiltros: (filtros: Partial<FiltrosBusca>) => void;
  limparErro: () => void;
  seguir: (estabelecimentoId: string) => Promise<Result<{ seguindo: boolean }>>;
  entrarNaFila: (estabelecimentoId: string, nome: string) => Promise<Result<{ posicao: number; esperaEstimada: number }>>;
}

/** Contexto completo (marketplace) */
export type EstabelecimentosContext = EstabelecimentosState & EstabelecimentosActions;

/** Estado do hook de estabelecimento (detalhe) */
export interface EstabelecimentoDetalheState {
  estabelecimento: EstabelecimentoComputado | null;
  servicos: Servico[];
  galeria: ItemGaleria[];
  avaliacoes: Avaliacao[];
  carregando: boolean;
  erro: string | null;
}

/** Ações do hook de estabelecimento (detalhe) */
export interface EstabelecimentoDetalheActions {
  recarregar: () => Promise<void>;
  limparErro: () => void;
  seguir: () => Promise<Result<{ seguindo: boolean }>>;
  curtirPublicacao: (publicacaoId: string) => Promise<Result<{ curtido: boolean; total: number }>>;
  salvarInspiracao: (publicacaoId: string) => Promise<Result<{ salvo: boolean }>>;
  compartilhar: (publicacaoId: string) => Promise<Result<void>>;
  denunciar: (publicacaoId: string, motivo: string) => Promise<Result<void>>;
  adicionarAvaliacao: (nota: number, comentario: string) => Promise<Result<Avaliacao>>;
  entrarNaFila: (nome: string) => Promise<Result<{ posicao: number; esperaEstimada: number }>>;
}

/** Contexto completo (detalhe) */
export type EstabelecimentoDetalheContext = EstabelecimentoDetalheState & EstabelecimentoDetalheActions;

/** Estado do hook de estabelecimento (barbeiro - gestão) */
export interface EstabelecimentoGestaoState {
  estabelecimento: Estabelecimento | null;
  servicos: Servico[];
  galeria: ItemGaleria[];
  avaliacoes: Avaliacao[];
  carregando: boolean;
  erro: string | null;
  salvando: boolean;
}

/** Ações do hook de estabelecimento (barbeiro - gestão) */
export interface EstabelecimentoGestaoActions {
  recarregar: () => Promise<void>;
  limparErro: () => void;
  atualizarEstabelecimento: (dados: Partial<Estabelecimento>) => Promise<Result<Estabelecimento>>;
  atualizarTema: (tema: TemaInput) => Promise<Result<Estabelecimento>>;
  atualizarHorario: (horario: string) => Promise<Result<Estabelecimento>>;
  atualizarConfiguracaoPix: (config: ConfiguracaoPixInput) => Promise<Result<ConfiguracaoPix>>;
  atualizarMensagensAutomaticas: (mensagens: MensagensAutomaticasInput) => Promise<Result<MensagemAutomatica>>;
  // Serviços
  adicionarServico: (servico: ServicoInput) => Promise<Result<Servico>>;
  atualizarServico: (servicoId: string, dados: Partial<Servico>) => Promise<Result<Servico>>;
  excluirServico: (servicoId: string) => Promise<Result<void>>;
  reordenarServicos: (servicoIds: string[]) => Promise<Result<Servico[]>>;
  // Galeria
  adicionarGaleria: (item: GaleriaItemInput) => Promise<Result<ItemGaleria>>;
  removerGaleria: (itemId: string) => Promise<Result<void>>;
  reordenarGaleria: (itemIds: string[]) => Promise<Result<ItemGaleria[]>>;
  // Avaliações
  responderAvaliacao: (avaliacaoId: string, resposta: string) => Promise<Result<Avaliacao>>;
}

/** Contexto completo (gestão) */
export type EstabelecimentoGestaoContext = EstabelecimentoGestaoState & EstabelecimentoGestaoActions;

/** Constantes de validação */
export const ESTABELECIMENTO_CONSTANTES = {
  NOME_MIN_LENGTH: 2,
  NOME_MAX_LENGTH: 100,
  SOBRE_MAX_LENGTH: 2000,
  CIDADE_MAX_LENGTH: 100,
  ENDERECO_MAX_LENGTH: 200,
  WHATSAPP_PATTERN: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  SERVICO_NOME_MIN: 2,
  SERVICO_NOME_MAX: 50,
  SERVICO_PRECO_MIN: 0,
  SERVICO_PRECO_MAX: 10000,
  SERVICO_DURACAO_MIN: 5,
  SERVICO_DURACAO_MAX: 480,
  TAG_MAX_LENGTH: 20,
  PIX_CHAVE_MAX_LENGTH: 100,
  PIX_PERCENTUAL_MIN: 0,
  PIX_PERCENTUAL_MAX: 100,
  MENSAGEM_GERAL_MAX: 500,
  MENSAGEM_SERVICO_MAX: 300,
  AVALIACAO_NOTA_MIN: 1,
  AVALIACAO_NOTA_MAX: 5,
  AVALIACAO_COMENTARIO_MAX: 500,
} as const;

/** Códigos de erro */
export type EstabelecimentoErrorCode =
  | 'ESTABELECIMENTO_NAO_ENCONTRADO'
  | 'ESTABELECIMENTO_NAO_APROVADO'
  | 'SERVICO_NAO_ENCONTRADO'
  | 'GALERIA_ITEM_NAO_ENCONTRADO'
  | 'AVALIACAO_NAO_ENCONTRADA'
  | 'NAO_AUTORIZADO'
  | 'ERRO_CONEXAO'
  | 'VALIDACAO_FALHOU'
  | 'SLUG_JA_EXISTE'
  | 'NICHO_INVALIDO';

/** Erro tipado */
export interface EstabelecimentoError extends Error {
  code: EstabelecimentoErrorCode;
  campo?: string;
}