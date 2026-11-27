/**
 * Tipos do domínio Feed (publicações, inspirações, comentários, curtidas).
 * Re-exporta de @/tipos para fonte única da verdade.
 */

import type {
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
} from '@/tipos';

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
};

/** Tipos locais para o domínio feed */
export interface FeedState {
  publicacoes: Publicacao[];
  proximaPagina: number | null;
  carregando: boolean;
  carregandoMais: boolean;
  erro: string | null;
  filtros: FeedFiltros;
  ordenacao: FeedOrdenacao;
}

export interface FeedActions {
  carregarFeed: (filtros?: Partial<FeedFiltros>, reset?: boolean) => Promise<void>;
  carregarMais: () => Promise<void>;
  curtir: (publicacaoId: string) => Promise<void>;
  descurtir: (publicacaoId: string) => Promise<void>;
  salvar: (publicacaoId: string) => Promise<void>;
  desalvar: (publicacaoId: string) => Promise<void>;
  comentar: (publicacaoId: string, texto: string) => Promise<void>;
  excluirComentario: (comentarioId: string) => Promise<void>;
  denunciar: (publicacaoId: string, motivo: string) => Promise<void>;
  compartilhar: (publicacaoId: string) => Promise<string | null>;
  atualizarFiltros: (filtros: Partial<FeedFiltros>) => void;
  atualizarOrdenacao: (ordenacao: FeedOrdenacao) => void;
  limparErro: () => void;
}

export interface PublicacaoState {
  publicacao: Publicacao | null;
  comentarios: Comentario[];
  proximaPaginaComentarios: number | null;
  carregando: boolean;
  carregandoComentarios: boolean;
  enviandoComentario: boolean;
  erro: string | null;
}

export interface PublicacaoActions {
  carregarPublicacao: (id: string) => Promise<void>;
  carregarComentarios: (publicacaoId: string, pagina?: number) => Promise<void>;
  adicionarComentario: (texto: string) => Promise<void>;
  curtir: () => Promise<void>;
  descurtir: () => Promise<void>;
  salvar: () => Promise<void>;
  desalvar: () => Promise<void>;
  denunciar: (motivo: string) => Promise<void>;
  compartilhar: () => Promise<string | null>;
  limparErro: () => void;
}

export interface InspiracoesState {
  inspiracaoes: Inspiracao[];
  carregando: boolean;
  erro: string | null;
  categoriaAtiva: InspiracaoCategoria | 'todas';
}

export interface InspiracoesActions {
  carregarInspiracoes: (categoria?: InspiracaoCategoria) => Promise<void>;
  filtrarPorCategoria: (categoria: InspiracaoCategoria | 'todas') => void;
  limparErro: () => void;
}

export type FeedResult<T> = { sucesso: true; dados: T } | { sucesso: false; erro: string; codigo: string };