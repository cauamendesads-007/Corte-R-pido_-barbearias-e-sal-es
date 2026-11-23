/**
 * Testes para useEstabelecimentos - Busca, filtros, paginação.
 * Cobre: buscar, carregarMais, recarregar, limparFiltros, obterPorId/Slug, useEstabelecimento, useNichos, useCidades.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { ServicesContext } from '@/contexto/ServicesContext';
import type { IEstabelecimentosService } from '@/features/estabelecimentos/services/IEstabelecimentosService';
import type { IAuthService } from '@/features/auth/services/IAuthService';
import type { IAgendamentosService } from '@/features/agendamentos/services/IAgendamentosService';
import type { IFeedService } from '@/features/feed/services/IFeedService';
import type { INotificacoesService } from '@/features/notificacoes/services/INotificacoesService';
import type { IPerfilService } from '@/features/perfil/services/IPerfilService';
import type { IBarbeiroService } from '@/features/barbeiro/services/IBarbeiroService';
import type { IAdminService } from '@/features/admin/services/IAdminService';
import type { IMensagensService } from '@/features/mensagens/services/IMensagensService';
import type { Estabelecimento } from '@/tipos';

interface Services {
  auth: IAuthService;
  estabelecimentos: IEstabelecimentosService;
  agendamentos: IAgendamentosService;
  feed: IFeedService;
  notificacoes: INotificacoesService;
  perfil: IPerfilService;
  barbeiro: IBarbeiroService;
  admin: IAdminService;
  mensagens: IMensagensService;
}

// Mock do atrasar para resolver imediatamente
vi.mock('@/utilitarios/formatar', () => ({
  atrasar: vi.fn((_ms: number) => Promise.resolve()),
  clonarProfundo: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
  gerarId: vi.fn(() => `id-${Date.now()}-${Math.random().toString(36).slice(2)}`),
  formatarMoeda: vi.fn((v) => `R$ ${v.toFixed(2).replace('.', ',')}`),
  formatarParaExibicao: vi.fn((v) => v),
  calcularDistanciaKm: vi.fn(() => 0),
}));

const mockEstabelecimentos: Estabelecimento[] = [
  {
    id: 'corte-rapido',
    slug: 'corte-rapido',
    nome: 'Corte Rápido',
    responsavel: 'Carlos Silva',
    cidade: 'Savassi',
    nicho: 'barbearia',
    avaliacao: 4.8,
    status: 'aprovado',
    latitude: -19.9391,
    longitude: -43.9386,
    whatsapp: '(31) 98765-4321',
    endereco: 'Rua das Flores, 120',
    sobre: 'Barbearia clássica',
    tema: { cor: '#F5B301', layout: 'classico', titulo: '', subtitulo: '' },
    servicos: [],
    galeria: [],
    fila: [],
    tempoMedioAtendimento: 20,
    horarioFuncionamento: 'Seg a Sáb, 9h às 18h',
    permiteAutoEdicao: true,
    configuracaoPix: { modo: 'opcional', chave: '', percentualSinal: 30 },
    avaliacoes: [],
    seguidores: 250,
    taxaFidelidade: 90,
  },
  {
    id: 'face-e-forma',
    slug: 'face-e-forma',
    nome: 'Face e Forma',
    responsavel: 'Marina Duarte',
    cidade: 'Lourdes',
    nicho: 'visagismo',
    avaliacao: 4.9,
    status: 'aprovado',
    latitude: -19.9319,
    longitude: -43.9453,
    whatsapp: '(31) 99876-5432',
    endereco: 'Av. Brasil, 450',
    sobre: 'Análise de formato do rosto',
    tema: { cor: '#2DD4BF', layout: 'moderno', titulo: '', subtitulo: '' },
    servicos: [],
    galeria: [],
    fila: [],
    tempoMedioAtendimento: 30,
    horarioFuncionamento: 'Seg a Sex, 10h às 19h',
    permiteAutoEdicao: true,
    configuracaoPix: { modo: 'opcional', chave: '', percentualSinal: 30 },
    avaliacoes: [],
    seguidores: 180,
    taxaFidelidade: 85,
  },
];

// Criar mock do IEstabelecimentosService
const createMockEstabelecimentosService = () => ({
  buscar: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimentos }),
  obter: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimentos[0] }),
  obterPorSlug: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimentos[0] }),
  criar: vi.fn(),
  atualizar: vi.fn(),
  excluir: vi.fn(),
  listarMeus: vi.fn(),
  aprovar: vi.fn(),
  rejeitar: vi.fn(),
  buscarPorProximidade: vi.fn(),
  atualizarTema: vi.fn(),
  atualizarConfiguracaoPix: vi.fn(),
  atualizarServicos: vi.fn(),
  adicionarAvaliacao: vi.fn(),
  responderAvaliacao: vi.fn(),
  seguir: vi.fn(),
  deixarDeSeguir: vi.fn(),
  atualizarHorarioFuncionamento: vi.fn(),
  atualizarFila: vi.fn(),
});

// Provider de teste que usa mock services
const TestServiceProvider = ({ children, estabelecimentosService }: { children: ReactNode; estabelecimentosService: IEstabelecimentosService }) => {
  const mockServices: Services = {
    auth: {} as IAuthService,
    estabelecimentos: estabelecimentosService,
    agendamentos: {} as IAgendamentosService,
    feed: {} as IFeedService,
    notificacoes: {} as INotificacoesService,
    perfil: {} as IPerfilService,
    barbeiro: {} as IBarbeiroService,
    admin: {} as IAdminService,
    mensagens: {} as IMensagensService,
  };

  return (
    <ServicesContext.Provider value={mockServices}>
      {children}
    </ServicesContext.Provider>
  );
};

// Helper para renderizar hook com TestServiceProvider
const renderHookWithEstabelecimentos = <T,>(
  hook: (props: T) => unknown,
  estabelecimentosService: IEstabelecimentosService,
  options?: { initialProps?: T }
) => {
  return renderHook(hook, {
    wrapper: ({ children }) => <TestServiceProvider estabelecimentosService={estabelecimentosService}>{children}</TestServiceProvider>,
    initialProps: options?.initialProps,
  });
};

import { useEstabelecimentos, useEstabelecimento, useNichos, useCidades } from './useEstabelecimentos';

describe('useEstabelecimentos', () => {
  let mockEstabelecimentosService: ReturnType<typeof createMockEstabelecimentosService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEstabelecimentosService = createMockEstabelecimentosService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('estado inicial', () => {
    it('deve iniciar com estado vazio', () => {
      const { result } = renderHookWithEstabelecimentos(() => useEstabelecimentos(), mockEstabelecimentosService);

      expect(result.current.estabelecimentos).toHaveLength(0);
      expect(result.current.carregando).toBe(false);
      expect(result.current.erro).toBeNull();
      expect(result.current.temMais).toBe(true);
      expect(result.current.pagina).toBe(1);
      expect(result.current.total).toBe(0);
    });

    it('deve expor funções de busca', () => {
      const { result } = renderHookWithEstabelecimentos(() => useEstabelecimentos(), mockEstabelecimentosService);

      expect(typeof result.current.buscar).toBe('function');
      expect(typeof result.current.carregarMais).toBe('function');
      expect(typeof result.current.recarregar).toBe('function');
      expect(typeof result.current.limparFiltros).toBe('function');
      expect(typeof result.current.obterPorId).toBe('function');
      expect(typeof result.current.obterPorSlug).toBe('function');
    });
  });

  describe('buscar', () => {
    it('deve chamar serviço e atualizar resultados', async () => {
      const { result } = renderHookWithEstabelecimentos(() => useEstabelecimentos(), mockEstabelecimentosService);

      await act(async () => {
        await result.current.buscar({ nicho: 'visagismo' });
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalled());

      expect(result.current.estabelecimentos).toHaveLength(2);
      expect(result.current.total).toBe(2);
      expect(result.current.temMais).toBe(false);
    });

    it('deve lidar com erro na busca', async () => {
      mockEstabelecimentosService.buscar.mockResolvedValue({ sucesso: false, erro: 'Erro servidor' });

      const { result } = renderHookWithEstabelecimentos(() => useEstabelecimentos(), mockEstabelecimentosService);

      await act(async () => {
        await result.current.buscar({});
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalled());

      expect(result.current.erro).toBe('Erro servidor');
      expect(result.current.estabelecimentos).toHaveLength(0);
    });
  });

  describe('carregarMais', () => {
    it('deve carregar mais itens se temMais', async () => {
      const muitosItens = Array.from({ length: 25 }, (_, i) => ({
        ...mockEstabelecimentos[0],
        id: `est-${i}`,
        slug: `est-${i}`,
      }));
      mockEstabelecimentosService.buscar.mockResolvedValue({ sucesso: true, dados: muitosItens });

      const { result } = renderHookWithEstabelecimentos(() => useEstabelecimentos(), mockEstabelecimentosService);

      await act(async () => {
        await result.current.buscar({});
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalled());

      expect(result.current.estabelecimentos).toHaveLength(12); // ITENS_POR_PAGINA
      expect(result.current.temMais).toBe(true);

      await act(async () => {
        await result.current.carregarMais();
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalledTimes(2));

      expect(result.current.estabelecimentos).toHaveLength(24);
    });

    it('não deve carregar se já carregando', async () => {
      const { result } = renderHookWithEstabelecimentos(() => useEstabelecimentos(), mockEstabelecimentosService);

      await act(async () => {
        await result.current.buscar({});
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalled());

      await act(async () => {
        await Promise.all([result.current.carregarMais(), result.current.carregarMais()]);
      });

      expect(result.current.estabelecimentos).toHaveLength(2);
    });
  });

  describe('recarregar', () => {
    it('deve resetar paginação e buscar novamente', async () => {
      const { result } = renderHookWithEstabelecimentos(() => useEstabelecimentos(), mockEstabelecimentosService);

      await act(async () => {
        await result.current.buscar({});
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalled());

      await act(async () => {
        await result.current.recarregar();
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalledTimes(2));

      expect(result.current.pagina).toBe(1);
    });
  });

  describe('limparFiltros', () => {
    it('deve resetar filtros para padrão', async () => {
      const { result } = renderHookWithEstabelecimentos(() => useEstabelecimentos({ nicho: 'visagismo', busca: 'teste' }), mockEstabelecimentosService);

      await act(async () => {
        await result.current.buscar({});
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalled());

      const initialCalls = mockEstabelecimentosService.buscar.mock.calls.length;

      act(() => {
        result.current.limparFiltros();
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalledTimes(initialCalls + 1));

      expect(result.current.estabelecimentos).toHaveLength(2);
    });
  });

  describe('obterPorId / obterPorSlug', () => {
    it('deve encontrar estabelecimento por ID', async () => {
      const { result } = renderHookWithEstabelecimentos(() => useEstabelecimentos(), mockEstabelecimentosService);

      await act(async () => {
        await result.current.buscar({});
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalled());

      const encontrado = result.current.obterPorId('corte-rapido');

      expect(encontrado).toBeDefined();
      expect(encontrado?.nome).toBe('Corte Rápido');
    });

    it('deve retornar undefined para ID inexistente', async () => {
      const { result } = renderHookWithEstabelecimentos(() => useEstabelecimentos(), mockEstabelecimentosService);

      await act(async () => {
        await result.current.buscar({});
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalled());

      const encontrado = result.current.obterPorId('inexistente');

      expect(encontrado).toBeUndefined();
    });

    it('deve encontrar estabelecimento por slug', async () => {
      const { result } = renderHookWithEstabelecimentos(() => useEstabelecimentos(), mockEstabelecimentosService);

      await act(async () => {
        await result.current.buscar({});
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalled());

      const encontrado = result.current.obterPorSlug('face-e-forma');

      expect(encontrado).toBeDefined();
      expect(encontrado?.nome).toBe('Face e Forma');
    });
  });

  describe('debounce', () => {
    it('deve debounce mudanças de filtro', async () => {
      const { result } = renderHookWithEstabelecimentos(() => useEstabelecimentos(), mockEstabelecimentosService);

      await act(async () => {
        await result.current.buscar({});
      });

      await waitFor(() => expect(mockEstabelecimentosService.buscar).toHaveBeenCalled());

      const initialCalls = mockEstabelecimentosService.buscar.mock.calls.length;

      act(() => {
        result.current.buscar({ busca: 'corte' });
        result.current.buscar({ busca: 'corte r' });
        result.current.buscar({ busca: 'corte rá' });
      });

      // Aguarda o debounce (300ms) - usa waitFor para detectar chamada única
      await waitFor(() => {
        // O debounce deve resultar em apenas uma chamada adicional
        expect(mockEstabelecimentosService.buscar).toHaveBeenCalledTimes(initialCalls + 1);
      }, { timeout: 1000 });
    });
  });
});

describe('useEstabelecimento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve buscar estabelecimento por ID', async () => {
    const mockService = createMockEstabelecimentosService();
    mockService.obter.mockResolvedValue({ sucesso: true, dados: mockEstabelecimentos[0] });

    const { result } = renderHookWithEstabelecimentos(() => useEstabelecimento('corte-rapido'), mockService);

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.estabelecimento).toMatchObject({
      id: 'corte-rapido',
      nome: 'Corte Rápido',
    });
    expect(result.current.erro).toBeNull();
  });

  it('deve retornar erro se não encontrado', async () => {
    const mockService = createMockEstabelecimentosService();
    mockService.obter.mockResolvedValue({ sucesso: false, erro: 'Não encontrado' });

    const { result } = renderHookWithEstabelecimentos(() => useEstabelecimento('inexistente'), mockService);

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.erro).toBe('Não encontrado');
    expect(result.current.estabelecimento).toBeNull();
  });

  it('deve retornar null se ID nulo', async () => {
    const mockService = createMockEstabelecimentosService();
    const { result } = renderHookWithEstabelecimentos(() => useEstabelecimento(null), mockService);

    expect(result.current.estabelecimento).toBeNull();
    expect(result.current.carregando).toBe(false);
  });

  it('deve recarregar quando ID muda', async () => {
    const mockService = createMockEstabelecimentosService();
    mockService.obter.mockResolvedValue({ sucesso: true, dados: mockEstabelecimentos[0] });

    const { result, rerender } = renderHookWithEstabelecimentos((props: { id: string | null }) => useEstabelecimento(props.id), mockService, { initialProps: { id: 'corte-rapido' } });

    await waitFor(() => expect(result.current.carregando).toBe(false));

    mockService.obter.mockResolvedValue({ sucesso: true, dados: mockEstabelecimentos[1] });

    rerender({ id: 'face-e-forma' });

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.estabelecimento?.nome).toBe('Face e Forma');
  });
});

describe('useNichos', () => {
  it('deve retornar nichos disponíveis', async () => {
    const mockService = createMockEstabelecimentosService();
    const { result } = renderHookWithEstabelecimentos(() => useNichos(), mockService);

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.nichos).toEqual(['barbearia', 'feminino', 'visagismo', 'infantil']);
  });
});

describe('useCidades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar cidades únicas dos estabelecimentos', async () => {
    const mockService = createMockEstabelecimentosService();
    mockService.buscar.mockResolvedValue({ sucesso: true, dados: mockEstabelecimentos });

    const { result } = renderHookWithEstabelecimentos(() => useCidades(), mockService);

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.cidades).toEqual(['Lourdes', 'Savassi']);
  });

  it('deve lidar com erro', async () => {
    const mockService = createMockEstabelecimentosService();
    mockService.buscar.mockResolvedValue({ sucesso: false, erro: 'Erro' });

    const { result } = renderHookWithEstabelecimentos(() => useCidades(), mockService);

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.cidades).toEqual([]);
  });
});