/**
 * Serviços do domínio Feed - Interface + Implementação + DI.
 * Segue padrão DIP com Result<T,E> e AbortController.
 */

import {
  handleApiError,
  type FeedResult,
} from '../rules';
import type {
  Publicacao,
  PublicacaoInput,
  Comentario,
  ComentarioInput,
  Inspiracao,
  InspiracaoInput,
  InspiracaoCategoria,
  FeedFiltros,
  FeedOrdenacao,
  Curtida,
  Recomendacao,
} from '../types';

// ============================================
// INTERFACE (Contrato)
// ============================================

export interface IFeedService {
  // Feed principal
  buscarFeed(filtros: FeedFiltros, ordenacao: FeedOrdenacao, pagina: number, limite: number, signal?: AbortSignal): Promise<FeedResult<{ publicacoes: Publicacao[]; proximaPagina: number | null }>>;
  buscarPublicacao(id: string, signal?: AbortSignal): Promise<FeedResult<Publicacao>>;
  buscarRecomendacoes(limite: number, signal?: AbortSignal): Promise<FeedResult<Recomendacao[]>>;

  // Publicações
  criarPublicacao(input: PublicacaoInput, signal?: AbortSignal): Promise<FeedResult<Publicacao>>;
  atualizarPublicacao(id: string, input: Partial<PublicacaoInput>, signal?: AbortSignal): Promise<FeedResult<Publicacao>>;
  excluirPublicacao(id: string, signal?: AbortSignal): Promise<FeedResult<void>>;

  // Interações
  curtir(publicacaoId: string, signal?: AbortSignal): Promise<FeedResult<Curtida>>;
  descurtir(publicacaoId: string, signal?: AbortSignal): Promise<FeedResult<void>>;
  salvar(publicacaoId: string, signal?: AbortSignal): Promise<FeedResult<void>>;
  desalvar(publicacaoId: string, signal?: AbortSignal): Promise<FeedResult<void>>;
  denunciar(publicacaoId: string, motivo: string, signal?: AbortSignal): Promise<FeedResult<void>>;
  compartilhar(publicacaoId: string, signal?: AbortSignal): Promise<FeedResult<{ link: string }>>;

  // Comentários
  buscarComentarios(publicacaoId: string, pagina: number, limite: number, signal?: AbortSignal): Promise<FeedResult<{ comentarios: Comentario[]; proximaPagina: number | null }>>;
  adicionarComentario(publicacaoId: string, input: ComentarioInput, signal?: AbortSignal): Promise<FeedResult<Comentario>>;
  excluirComentario(comentarioId: string, signal?: AbortSignal): Promise<FeedResult<void>>;

  // Inspirações
  buscarInspiracoes(categoria?: InspiracaoCategoria, signal?: AbortSignal): Promise<FeedResult<Inspiracao[]>>;
  criarInspiracao(input: InspiracaoInput, signal?: AbortSignal): Promise<FeedResult<Inspiracao>>;
}

// ============================================
// IMPLEMENTAÇÃO
// ============================================

const ENDPOINTS = {
  feed: '/api/feed',
  publicacoes: '/api/publicacoes',
  inspiracoes: '/api/inspiracoes',
  curtidas: '/api/curtidas',
  salvos: '/api/salvos',
  comentarios: '/api/comentarios',
  denuncias: '/api/denuncias',
  compartilhar: '/api/compartilhar',
  recomendacoes: '/api/recomendacoes',
} as const;

const LIMITE_PADRAO = 20;

export class FeedService implements IFeedService {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(baseUrl: string = '', getToken: () => string | null = () => null) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  private async request<T>(url: string, options: RequestInit = {}, signal?: AbortSignal): Promise<FeedResult<T>> {
    const controller = new AbortController();
    const abortSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        ...options,
        headers,
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return handleApiError(response.status, errorData);
      }

      const data = await response.json();
      return { sucesso: true, dados: data };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { sucesso: false, erro: 'Requisição cancelada', codigo: 'ABORTED' };
      }
      return { sucesso: false, erro: 'Erro de conexão', codigo: 'NETWORK_ERROR' };
    }
  }

  // Feed principal
  async buscarFeed(filtros: FeedFiltros, ordenacao: FeedOrdenacao, pagina: number, limite: number = LIMITE_PADRAO, signal?: AbortSignal) {
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: String(limite),
      ordenacao,
      ...(filtros.tipo && { tipo: filtros.tipo }),
      ...(filtros.autorId && { autorId: filtros.autorId }),
      ...(filtros.salvos && { salvos: 'true' }),
      ...(filtros.seguidos && { seguidos: 'true' }),
      ...(filtros.dataInicio && { dataInicio: filtros.dataInicio }),
      ...(filtros.dataFim && { dataFim: filtros.dataFim }),
      ...(filtros.busca && { busca: filtros.busca }),
    });
    return this.request<{ publicacoes: Publicacao[]; proximaPagina: number | null }>(`${ENDPOINTS.feed}?${params}`, { signal });
  }

  async buscarPublicacao(id: string, signal?: AbortSignal) {
    return this.request<Publicacao>(`${ENDPOINTS.publicacoes}/${id}`, { signal });
  }

  async buscarRecomendacoes(limite: number = 10, signal?: AbortSignal) {
    return this.request<Recomendacao[]>(`${ENDPOINTS.recomendacoes}?limite=${limite}`, { signal });
  }

  // Publicações
  async criarPublicacao(input: PublicacaoInput, signal?: AbortSignal) {
    return this.request<Publicacao>(ENDPOINTS.publicacoes, {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
    });
  }

  async atualizarPublicacao(id: string, input: Partial<PublicacaoInput>, signal?: AbortSignal) {
    return this.request<Publicacao>(`${ENDPOINTS.publicacoes}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      signal,
    });
  }

  async excluirPublicacao(id: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.publicacoes}/${id}`, {
      method: 'DELETE',
      signal,
    });
  }

  // Interações
  async curtir(publicacaoId: string, signal?: AbortSignal) {
    return this.request<Curtida>(`${ENDPOINTS.curtidas}/${publicacaoId}`, {
      method: 'POST',
      signal,
    });
  }

  async descurtir(publicacaoId: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.curtidas}/${publicacaoId}`, {
      method: 'DELETE',
      signal,
    });
  }

  async salvar(publicacaoId: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.salvos}/${publicacaoId}`, {
      method: 'POST',
      signal,
    });
  }

  async desalvar(publicacaoId: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.salvos}/${publicacaoId}`, {
      method: 'DELETE',
      signal,
    });
  }

  async denunciar(publicacaoId: string, motivo: string, signal?: AbortSignal) {
    return this.request<void>(ENDPOINTS.denuncias, {
      method: 'POST',
      body: JSON.stringify({ publicacaoId, motivo }),
      signal,
    });
  }

  async compartilhar(publicacaoId: string, signal?: AbortSignal) {
    return this.request<{ link: string }>(`${ENDPOINTS.compartilhar}/${publicacaoId}`, {
      method: 'POST',
      signal,
    });
  }

  // Comentários
  async buscarComentarios(publicacaoId: string, pagina: number, limite: number = LIMITE_PADRAO, signal?: AbortSignal) {
    return this.request<{ comentarios: Comentario[]; proximaPagina: number | null }>(
      `${ENDPOINTS.comentarios}/${publicacaoId}?pagina=${pagina}&limite=${limite}`,
      { signal }
    );
  }

  async adicionarComentario(publicacaoId: string, input: ComentarioInput, signal?: AbortSignal) {
    return this.request<Comentario>(`${ENDPOINTS.comentarios}/${publicacaoId}`, {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
    });
  }

  async excluirComentario(comentarioId: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.comentarios}/${comentarioId}`, {
      method: 'DELETE',
      signal,
    });
  }

  // Inspirações
  async buscarInspiracoes(categoria?: InspiracaoCategoria, signal?: AbortSignal) {
    const params = categoria ? `?categoria=${categoria}` : '';
    return this.request<Inspiracao[]>(`${ENDPOINTS.inspiracoes}${params}`, { signal });
  }

  async criarInspiracao(input: InspiracaoInput, signal?: AbortSignal) {
    return this.request<Inspiracao>(ENDPOINTS.inspiracoes, {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
    });
  }
}

// ============================================
// SINGLETON & FACTORY (para DI)
// ============================================

let _instancia: IFeedService | null = null;

export function getFeedService(): IFeedService {
  if (!_instancia) {
    _instancia = new FeedService(
      import.meta.env.VITE_API_BASE_URL || '',
      () => localStorage.getItem('auth_token')
    );
  }
  return _instancia;
}

export function setFeedService(service: IFeedService): void {
  _instancia = service;
}

export function createFeedService(baseUrl?: string, getToken?: () => string | null): IFeedService {
  return new FeedService(baseUrl, getToken);
}

// Mock para testes
export const createMockFeedService = (): IFeedService => {
  const mockPublicacoes: Publicacao[] = [];
  let idCounter = 1;

  return {
    async buscarFeed() {
      return { sucesso: true, dados: { publicacoes: mockPublicacoes, proximaPagina: null } };
    },
    async buscarPublicacao(id) {
      const p = mockPublicacoes.find((pub) => pub.id === id);
      return p ? { sucesso: true, dados: p } : { sucesso: false, erro: 'Não encontrado', codigo: 'NOT_FOUND' };
    },
    async buscarRecomendacoes() {
      return { sucesso: true, dados: [] };
    },
    async criarPublicacao(input) {
      const agora = Date.now();
      const nova: Publicacao = {
        id: String(idCounter++),
        estabelecimentoId: 'estab-1',
        autorId: 'user-1',
        autorNome: 'Usuário Teste',
        autorAvatar: '',
        autorSeguido: false,
        tipo: input.tipo,
        legenda: input.conteudo,
        conteudo: input.conteudo,
        midias: input.midias,
        curtidas: 0,
        salvos: 0,
        visualizacoes: 0,
        compartilhamentos: 0,
        comentarios: 0,
        dataCriacao: agora,
        criadoEm: agora,
        estaCurtido: false,
        estaSalvo: false,
      };
      mockPublicacoes.unshift(nova);
      return { sucesso: true, dados: nova };
    },
    async atualizarPublicacao(id, input) {
      const idx = mockPublicacoes.findIndex((p) => p.id === id);
      if (idx === -1) return { sucesso: false, erro: 'Não encontrado', codigo: 'NOT_FOUND' };
      mockPublicacoes[idx] = { ...mockPublicacoes[idx], ...input };
      return { sucesso: true, dados: mockPublicacoes[idx] };
    },
    async excluirPublicacao(id) {
      const idx = mockPublicacoes.findIndex((p) => p.id === id);
      if (idx === -1) return { sucesso: false, erro: 'Não encontrado', codigo: 'NOT_FOUND' };
      mockPublicacoes.splice(idx, 1);
      return { sucesso: true, dados: undefined };
    },
    async curtir(publicacaoId) {
      const p = mockPublicacoes.find((pub) => pub.id === publicacaoId);
      if (p) p.curtidas++;
      return { sucesso: true, dados: { id: `curtida-${Date.now()}`, publicacaoId, usuarioId: 'user-1', dataCriacao: Date.now() } };
    },
    async descurtir(publicacaoId) {
      const p = mockPublicacoes.find((pub) => pub.id === publicacaoId);
      if (p) p.curtidas = Math.max(0, p.curtidas - 1);
      return { sucesso: true, dados: undefined };
    },
    async salvar() { return { sucesso: true, dados: undefined }; },
    async desalvar() { return { sucesso: true, dados: undefined }; },
    async denunciar() { return { sucesso: true, dados: undefined }; },
    async compartilhar(publicacaoId) { return { sucesso: true, dados: { link: `https://app.com/p/${publicacaoId}` } }; },
    async buscarComentarios() { return { sucesso: true, dados: { comentarios: [], proximaPagina: null } }; },
    async adicionarComentario(publicacaoId, input) {
      const agora = Date.now();
      const comentario: Comentario = {
        id: String(idCounter++),
        publicacaoId,
        autorId: 'user-1',
        autorNome: 'Usuário Teste',
        autorAvatar: '',
        nomeAutor: 'Usuário Teste',
        texto: input.texto,
        dataCriacao: agora,
        criadoEm: agora,
      };
      return { sucesso: true, dados: comentario };
    },
    async excluirComentario() { return { sucesso: true, dados: undefined }; },
    async buscarInspiracoes() { return { sucesso: true, dados: [] }; },
    async criarInspiracao(input) {
      const agora = Date.now();
      const inspiracao: Inspiracao = {
        id: String(idCounter++),
        ...input,
        autorId: 'user-1',
        autorNome: 'Usuário Teste',
        autorAvatar: '',
        curtidas: 0,
        dataCriacao: agora,
      };
      return { sucesso: true, dados: inspiracao };
    },
  };
};