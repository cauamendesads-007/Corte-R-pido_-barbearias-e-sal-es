/**
 * Testes para useFeed - Feed de publicações.
 * Cobre: curtir, salvar, compartilhar, criar, excluir, denunciar, paginação, useInspiracoes.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock do atrasar para resolver imediatamente
vi.mock('@/utilitarios/formatar', () => ({
  atrasar: vi.fn((_ms: number) => Promise.resolve()),
  clonarProfundo: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
  gerarId: vi.fn(() => `id-${Date.now()}-${Math.random().toString(36).slice(2)}`),
  formatarMoeda: vi.fn((v) => `R$ ${v.toFixed(2).replace('.', ',')}`),
  formatarParaExibicao: vi.fn((v) => v),
  calcularDistanciaKm: vi.fn(() => 0),
}));

vi.mock('@/servicos/api', () => ({
  api: {
    feed: {
      listar: vi.fn(),
      curtir: vi.fn(),
      salvar: vi.fn(),
      compartilhar: vi.fn(),
      criar: vi.fn(),
      excluir: vi.fn(),
      denunciar: vi.fn(),
    },
    estabelecimentos: {
      obter: vi.fn(),
    },
    autenticacao: {
      validarToken: vi.fn(),
    },
    perfil: {
      obter: vi.fn(),
    },
  },
}));

vi.mock('./useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useFeed, useInspiracoes } from './useFeed';
import { api } from '@/servicos/api';
import { useAuth } from './useAuth';
import type { Publicacao } from '@/tipos';

const mockUsuario = {
  id: 'user-1',
  nome: 'João Cliente',
  email: 'cliente@demo.com',
  papel: 'cliente' as const,
  telefone: '(31) 99999-8888',
  confirmado: true,
  lembretesWhatsapp: true,
  seguindo: [],
  inspiracaoSalvas: [],
};

const mockPublicacoes = [
  {
    id: 'post-1',
    estabelecimentoId: 'corte-rapido',
    estabelecimentoNome: 'Corte Rápido',
    estabelecimentoSlug: 'corte-rapido',
    tipo: 'imagem' as const,
    src: 'https://example.com/img1.jpg',
    legenda: 'Corte clássico',
    tagServico: 'corte',
    curtidas: ['user-2', 'user-3'],
    usuarioCurtiu: false,
    salvos: [],
    usuarioSalvou: false,
    compartilhamentos: 5,
    dataCriacao: Date.now() - 86400000,
    denuncias: 0,
  },
  {
    id: 'post-2',
    estabelecimentoId: 'face-e-forma',
    estabelecimentoNome: 'Face e Forma',
    estabelecimentoSlug: 'face-e-forma',
    tipo: 'video' as const,
    src: 'https://example.com/video1.mp4',
    legenda: 'Transformação visagismo',
    tagServico: 'visagismo',
    curtidas: ['user-1'],
    usuarioCurtiu: true,
    salvos: ['user-1'],
    usuarioSalvou: true,
    compartilhamentos: 12,
    dataCriacao: Date.now() - 172800000,
    denuncias: 0,
  },
];

const mockEstabelecimento = {
  id: 'corte-rapido',
  servicos: [
    { id: 'serv-1', nome: 'Corte', preco: 40, duracaoMinutos: 30, tag: 'corte' },
  ],
};

describe('useFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as vi.Mock).mockReturnValue({ usuario: mockUsuario });
    api.feed.listar.mockResolvedValue({ sucesso: true, dados: mockPublicacoes });
    api.feed.curtir.mockResolvedValue({ sucesso: true });
    api.feed.salvar.mockResolvedValue({ sucesso: true });
    api.feed.compartilhar.mockResolvedValue({ sucesso: true });
    api.feed.criar.mockResolvedValue({ sucesso: true, dados: mockPublicacoes[0] });
    api.feed.excluir.mockResolvedValue({ sucesso: true });
    api.feed.denunciar.mockResolvedValue({ sucesso: true });
    api.estabelecimentos.obter.mockResolvedValue({ sucesso: true, dados: mockEstabelecimento });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('carregamento inicial', () => {
    it('deve carregar publicações do feed', async () => {
      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(api.feed.listar).toHaveBeenCalledWith({ usuarioEmail: 'cliente@demo.com', filtro: 'todos' });
      expect(result.current.publicacoes).toHaveLength(2);
      expect(result.current.temMais).toBe(false);
    });

    it('deve usar filtro "salvos" para inspirações', async () => {
      const { result } = renderHook(() => useFeed('inspiracoes'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(api.feed.listar).toHaveBeenCalledWith({ usuarioEmail: 'cliente@demo.com', filtro: 'salvos' });
    });

    it('não deve passar email se usuário não autenticado', async () => {
      (useAuth as vi.Mock).mockReturnValue({ usuario: null });

      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(api.feed.listar).toHaveBeenCalledWith({ usuarioEmail: undefined, filtro: 'todos' });
    });
  });

  describe('curtir', () => {
    it('deve atualizar otimisticamente e chamar API', async () => {
      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      const postId = 'post-1';
      const initialLikes = result.current.publicacoes.find(p => p.id === postId)?.curtidas.length || 0;

      await act(async () => {
        await result.current.curtir(postId);
      });

      expect(result.current.publicacoes.find(p => p.id === postId)?.usuarioCurtiu).toBe(true);
      expect(result.current.publicacoes.find(p => p.id === postId)?.curtidas.length).toBe(initialLikes + 1);
      expect(api.feed.curtir).toHaveBeenCalledWith(postId, 'cliente@demo.com');
    });

    it('deve reverter otimista se API falhar', async () => {
      api.feed.curtir.mockResolvedValue({ sucesso: false, erro: 'Erro' });

      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      const postId = 'post-1';
      const initialLikes = result.current.publicacoes.find(p => p.id === postId)?.curtidas.length || 0;
      const initialCurtiu = result.current.publicacoes.find(p => p.id === postId)?.usuarioCurtiu;

      await act(async () => {
        await result.current.curtir(postId);
      });

      expect(result.current.publicacoes.find(p => p.id === postId)?.curtidas.length).toBe(initialLikes);
      expect(result.current.publicacoes.find(p => p.id === postId)?.usuarioCurtiu).toBe(initialCurtiu);
    });

    it('não deve fazer nada se usuário não autenticado', async () => {
      (useAuth as vi.Mock).mockReturnValue({ usuario: null });

      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.curtir('post-1');
      });

      expect(api.feed.curtir).not.toHaveBeenCalled();
    });
  });

  describe('salvar', () => {
    it('deve salvar/desalvar publicação otimisticamente', async () => {
      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      const postId = 'post-1';
      const initialSalvou = result.current.publicacoes.find(p => p.id === postId)?.usuarioSalvou;

      await act(async () => {
        await result.current.salvar(postId);
      });

      expect(result.current.publicacoes.find(p => p.id === postId)?.usuarioSalvou).toBe(!initialSalvou);
      expect(api.feed.salvar).toHaveBeenCalledWith(postId, 'cliente@demo.com');
    });

    it('deve reverter se API falhar', async () => {
      api.feed.salvar.mockResolvedValue({ sucesso: false });

      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      const postId = 'post-1';
      const initialSalvou = result.current.publicacoes.find(p => p.id === postId)?.usuarioSalvou;

      await act(async () => {
        await result.current.salvar(postId);
      });

      expect(result.current.publicacoes.find(p => p.id === postId)?.usuarioSalvou).toBe(initialSalvou);
    });
  });

  describe('compartilhar', () => {
    it('deve incrementar contador de compartilhamentos', async () => {
      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      const postId = 'post-1';
      const initialShares = result.current.publicacoes.find(p => p.id === postId)?.compartilhamentos || 0;

      await act(async () => {
        await result.current.compartilhar(postId);
      });

      expect(result.current.publicacoes.find(p => p.id === postId)?.compartilhamentos).toBe(initialShares + 1);
      expect(api.feed.compartilhar).toHaveBeenCalledWith(postId);
    });
  });

  describe('criar publicação', () => {
    it('deve criar publicação com sucesso', async () => {
      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let createResult: { sucesso: boolean; publicacao?: Publicacao; erro?: string } = { sucesso: false };

      await act(async () => {
        createResult = await result.current.criar({
          legenda: 'Novo corte!',
          servicoId: 'serv-1',
          estabelecimentoId: 'corte-rapido',
          midias: [{ tipo: 'imagem', src: 'https://example.com/nova.jpg' }],
        });
      });

      expect(createResult.sucesso).toBe(true);
      expect(createResult.publicacao).toBeDefined();
      expect(result.current.publicacoes[0].id).toBe('post-1');
      expect(api.estabelecimentos.obter).toHaveBeenCalledWith('corte-rapido');
      expect(api.feed.criar).toHaveBeenCalledWith(expect.objectContaining({
        estabelecimentoId: 'corte-rapido',
        legenda: 'Novo corte!',
        tagServico: 'corte',
      }));
    });

    it('deve retornar erro se usuário não autenticado', async () => {
      (useAuth as vi.Mock).mockReturnValue({ usuario: null });

      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let createResult: { sucesso: boolean; erro?: string } = { sucesso: true };

      await act(async () => {
        createResult = await result.current.criar({
          legenda: 'Teste',
          estabelecimentoId: 'corte-rapido',
          midias: [{ tipo: 'imagem', src: 'https://example.com/img.jpg' }],
        });
      });

      expect(createResult.sucesso).toBe(false);
      expect(createResult.erro).toBe('Usuário não autenticado');
    });
  });

  describe('excluir', () => {
    it('deve excluir publicação própria', async () => {
      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let deleteResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        deleteResult = await result.current.excluir('post-1', 'corte-rapido');
      });

      expect(deleteResult.sucesso).toBe(true);
      expect(result.current.publicacoes.find(p => p.id === 'post-1')).toBeUndefined();
      expect(api.feed.excluir).toHaveBeenCalledWith('post-1', 'corte-rapido');
    });
  });

  describe('denunciar', () => {
    it('deve denunciar publicação', async () => {
      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let reportResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        reportResult = await result.current.denunciar('post-1', 'Conteúdo inadequado');
      });

      expect(reportResult.sucesso).toBe(true);
      expect(api.feed.denunciar).toHaveBeenCalledWith('post-1', 'Conteúdo inadequado');
    });
  });

  describe('paginação', () => {
    it('deve carregar mais publicações', async () => {
      const muitasPublicacoes = Array.from({ length: 25 }, (_, i) => ({
        ...mockPublicacoes[0],
        id: `post-${i}`,
      }));
      api.feed.listar.mockResolvedValue({ sucesso: true, dados: muitasPublicacoes });

      const { result } = renderHook(() => useFeed('todos'));

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(result.current.publicacoes).toHaveLength(10); // ITENS_POR_PAGINA
      expect(result.current.temMais).toBe(true);

      await act(async () => {
        await result.current.carregarMais();
      });

      await waitFor(() => expect(result.current.carregandoMais).toBe(false));

      expect(result.current.publicacoes).toHaveLength(20);
    });
  });
});

describe('useInspiracoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as vi.Mock).mockReturnValue({ usuario: mockUsuario });
    api.feed.listar.mockResolvedValue({ sucesso: true, dados: mockPublicacoes });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve carregar inspirações salvas do usuário', async () => {
    const { result } = renderHook(() => useInspiracoes());

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(api.feed.listar).toHaveBeenCalledWith({ usuarioEmail: 'cliente@demo.com', filtro: 'salvos' });
    expect(result.current.inspiracoes).toHaveLength(2);
  });

  it('não deve carregar se usuário não autenticado', async () => {
    (useAuth as vi.Mock).mockReturnValue({ usuario: null });

    const { result } = renderHook(() => useInspiracoes());

    expect(result.current.inspiracoes).toHaveLength(0);
    expect(api.feed.listar).not.toHaveBeenCalled();
  });

  it('deve recarregar quando chamado', async () => {
    const { result } = renderHook(() => useInspiracoes());

    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.recarregar();
    });

    expect(api.feed.listar).toHaveBeenCalledTimes(2);
  });
});