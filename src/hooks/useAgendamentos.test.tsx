/**
 * Testes para useAgendamentos - Gerenciamento de agendamentos.
 * Cobre: criar, reagendar, cancelar, confirmarPresenca, avaliar, paginação, useAgendamentosBarbeiro.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { ServicesContext } from '@/contexto/ServicesContext';
import type { IAgendamentosService } from '@/features/agendamentos/services/IAgendamentosService';
import type { IEstabelecimentosService } from '@/features/estabelecimentos/services/IEstabelecimentosService';
import type { IAuthService } from '@/features/auth/services/IAuthService';
import type { IFeedService } from '@/features/feed/services/IFeedService';
import type { INotificacoesService } from '@/features/notificacoes/services/INotificacoesService';
import type { IPerfilService } from '@/features/perfil/services/IPerfilService';
import type { IBarbeiroService } from '@/features/barbeiro/services/IBarbeiroService';
import type { IAdminService } from '@/features/admin/services/IAdminService';
import type { IMensagensService } from '@/features/mensagens/services/IMensagensService';

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

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});

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

const mockBarbeiro = {
  ...mockUsuario,
  papel: 'barbeiro' as const,
  estabelecimentoId: 'corte-rapido',
};

const mockEstabelecimento = {
  id: 'corte-rapido',
  servicos: [
    { id: 'serv-1', nome: 'Corte', preco: 40, duracaoMinutos: 30, tag: 'corte' },
    { id: 'serv-2', nome: 'Barba', preco: 25, duracaoMinutos: 20, tag: 'barba' },
  ],
};

const mockAgendamentos = [
  {
    id: 'bk-1',
    estabelecimentoId: 'corte-rapido',
    usuarioId: 'cliente@demo.com',
    dia: '2027-12-20',
    horario: '10:00',
    duracaoMinutos: 50,
    nomeCliente: 'João Cliente',
    telefoneCliente: '(31) 99999-8888',
    servicos: 'Corte + Barba',
    valorTotal: 65,
    statusPagamento: 'no_local',
    status: 'agendado',
    servicoIds: ['serv-1', 'serv-2'],
  },
  {
    id: 'bk-2',
    estabelecimentoId: 'corte-rapido',
    usuarioId: 'cliente@demo.com',
    dia: '2025-12-15',
    horario: '14:30',
    duracaoMinutos: 30,
    nomeCliente: 'João Cliente',
    telefoneCliente: '(31) 99999-8888',
    servicos: 'Corte',
    valorTotal: 40,
    statusPagamento: 'aguardando_pix',
    status: 'confirmado',
    servicoIds: ['serv-1'],
  },
];

// Criar mock do IAgendamentosService
const createMockAgendamentosService = () => ({
  listar: vi.fn().mockResolvedValue({ sucesso: true, dados: mockAgendamentos }),
  listarEstabelecimento: vi.fn().mockResolvedValue({ sucesso: true, dados: mockAgendamentos }),
  listarCliente: vi.fn().mockResolvedValue({ sucesso: true, dados: mockAgendamentos }),
  listarBarbeiro: vi.fn().mockResolvedValue({ sucesso: true, dados: mockAgendamentos }),
  obter: vi.fn().mockResolvedValue({ sucesso: true, dados: mockAgendamentos[0] }),
  obterHorariosDisponiveis: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
  criar: vi.fn().mockResolvedValue({ sucesso: true, dados: mockAgendamentos[0] }),
  criarWrapper: vi.fn().mockResolvedValue({ sucesso: true, dados: mockAgendamentos[0] }),
  cancelar: vi.fn().mockResolvedValue({ sucesso: true }),
  cancelarWrapper: vi.fn().mockResolvedValue({ sucesso: true }),
  reagendar: vi.fn().mockResolvedValue({ sucesso: true, dados: mockAgendamentos[0] }),
  reagendarWrapper: vi.fn().mockResolvedValue({ sucesso: true, dados: mockAgendamentos[0] }),
  confirmarPresenca: vi.fn().mockResolvedValue({ sucesso: true }),
  confirmarPagamentoPix: vi.fn().mockResolvedValue({ sucesso: true }),
  avaliar: vi.fn().mockResolvedValue({ sucesso: true }),
  atualizarStatus: vi.fn().mockResolvedValue({ sucesso: true }),
  definirHorarioReal: vi.fn().mockResolvedValue({ sucesso: true }),
});

// Criar mock do IEstabelecimentosService
const createMockEstabelecimentosService = () => ({
  buscar: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
  obter: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento }),
  obterPorSlug: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento }),
  criar: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento }),
  atualizar: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento }),
  excluir: vi.fn().mockResolvedValue({ sucesso: true }),
  atualizarConfiguracaoPix: vi.fn().mockResolvedValue({ sucesso: true, dados: {} }),
  atualizarMensagensAutomaticas: vi.fn().mockResolvedValue({ sucesso: true, dados: {} }),
  atualizarTema: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento }),
  atualizarHorarioFuncionamento: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento }),
  definirAutoEdicao: vi.fn().mockResolvedValue({ sucesso: true }),
  listarServicos: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento.servicos }),
  obterServico: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento.servicos[0] }),
  criarServico: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento.servicos[0] }),
  atualizarServico: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento.servicos[0] }),
  excluirServico: vi.fn().mockResolvedValue({ sucesso: true }),
  reordenarServicos: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento.servicos }),
  adicionarMidiaServico: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento.servicos[0] }),
  removerMidiaServico: vi.fn().mockResolvedValue({ sucesso: true, dados: mockEstabelecimento.servicos[0] }),
  listarGaleria: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
  adicionarGaleria: vi.fn().mockResolvedValue({ sucesso: true, dados: {} }),
  removerGaleria: vi.fn().mockResolvedValue({ sucesso: true }),
  reordenarGaleria: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
  adicionarMidiaGaleria: vi.fn().mockResolvedValue({ sucesso: true, dados: {} }),
  removerMidiaGaleria: vi.fn().mockResolvedValue({ sucesso: true }),
  listarAvaliacoes: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
  responderAvaliacao: vi.fn().mockResolvedValue({ sucesso: true, dados: {} }),
  obterFila: vi.fn().mockResolvedValue({ sucesso: true, dados: { fila: [], esperaEstimada: 0 } }),
  entrarNaFila: vi.fn().mockResolvedValue({ sucesso: true, dados: { posicao: 1, esperaEstimada: 0 } }),
  sairDaFila: vi.fn().mockResolvedValue({ sucesso: true }),
  chamarProximo: vi.fn().mockResolvedValue({ sucesso: true }),
  adicionarPresencialNaFila: vi.fn().mockResolvedValue({ sucesso: true }),
  removerDaFila: vi.fn().mockResolvedValue({ sucesso: true }),
});

// Provider de teste que usa mock services
const TestServiceProvider = ({ children, agendamentosService, estabelecimentosService, authService }: {
  children: ReactNode;
  agendamentosService: IAgendamentosService;
  estabelecimentosService: IEstabelecimentosService;
  authService: IAuthService;
}) => {
  const mockServices: Services = {
    auth: authService,
    estabelecimentos: estabelecimentosService,
    agendamentos: agendamentosService,
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
const renderHookWithAgendamentos = (
  hook: () => unknown,
  agendamentosService: IAgendamentosService,
  estabelecimentosService: IEstabelecimentosService,
  authService: IAuthService
) => {
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <TestServiceProvider
        agendamentosService={agendamentosService}
        estabelecimentosService={estabelecimentosService}
        authService={authService}
      >
        {children}
      </TestServiceProvider>
    ),
  });
};

// Mock do useAuth para o TestServiceProvider
const createMockAuthService = () => ({
  login: vi.fn().mockResolvedValue({ sucesso: true }),
  cadastrarCliente: vi.fn().mockResolvedValue({ sucesso: true }),
  validarToken: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
  alterarSenha: vi.fn().mockResolvedValue({ sucesso: true }),
  excluirConta: vi.fn().mockResolvedValue({ sucesso: true }),
  obterSessao: vi.fn().mockResolvedValue({ sucesso: true, dados: mockUsuario }),
  atualizarPerfilCliente: vi.fn().mockResolvedValue({ sucesso: true, dados: { nome: 'Novo Nome' } }),
  cadastrarProfissional: vi.fn(),
  sair: vi.fn().mockResolvedValue({ sucesso: true }),
  renovarSessao: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
  recuperarSenha: vi.fn().mockResolvedValue({ sucesso: true }),
  confirmarEmail: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
});

import { useAgendamentos, useAgendamentosBarbeiro } from './useAgendamentos';
import type { Agendamento } from '@/tipos';

describe('useAgendamentos', () => {
  let mockAgendamentosService: ReturnType<typeof createMockAgendamentosService>;
  let mockEstabelecimentosService: ReturnType<typeof createMockEstabelecimentosService>;
  let mockAuthService: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem
      .mockReturnValueOnce(JSON.stringify(mockUsuario)) // CHAVE_USUARIO
      .mockReturnValueOnce('mock-token-123'); // CHAVE_TOKEN
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});

    mockAgendamentosService = createMockAgendamentosService();
    mockEstabelecimentosService = createMockEstabelecimentosService();
    mockAuthService = createMockAuthService();

    // Configurar retornos padrão
    mockAgendamentosService.listarCliente.mockResolvedValue({ sucesso: true, dados: mockAgendamentos });
    mockEstabelecimentosService.obter.mockResolvedValue({ sucesso: true, dados: mockEstabelecimento });
    mockAgendamentosService.criar.mockResolvedValue({ sucesso: true, dados: mockAgendamentos[0] });
    mockAgendamentosService.reagendar.mockResolvedValue({ sucesso: true, dados: mockAgendamentos[0] });
    mockAgendamentosService.cancelar.mockResolvedValue({ sucesso: true });
    mockAgendamentosService.confirmarPresenca.mockResolvedValue({ sucesso: true });
    mockAgendamentosService.avaliar.mockResolvedValue({ sucesso: true });
    mockAuthService.validarToken.mockResolvedValue({ sucesso: true, dados: { papel: 'cliente', email: 'cliente@demo.com', nome: 'João Cliente' } });
    mockAuthService.obterSessao.mockResolvedValue({ sucesso: true, dados: mockUsuario });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('carregamento inicial', () => {
    it('deve carregar agendamentos do usuário', async () => {
      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      // Aguarda o carregamento terminar
      await waitFor(() => {
        expect(result.current.agendamentos).toHaveLength(2);
      }, { timeout: 2000 });

      expect(mockAgendamentosService.listarCliente).toHaveBeenCalledWith('cliente@demo.com');
      expect(result.current.temMais).toBe(false);
    });

    it('deve separar próximos e passados', async () => {
      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => {
        expect(result.current.agendamentos).toHaveLength(2);
      }, { timeout: 2000 });

      expect(result.current.proximos).toHaveLength(1); // apenas bk-1 (futuro)
      expect(result.current.passados).toHaveLength(1); // bk-2 (passado)
    });

    it('não deve carregar se usuário não autenticado', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockAuthService.validarToken.mockResolvedValue({ sucesso: false, erro: 'Token inválido' });

      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(result.current.agendamentos).toHaveLength(0);
      expect(mockAgendamentosService.listarCliente).not.toHaveBeenCalled();
    });
  });

  describe('criar agendamento', () => {
    it('deve criar agendamento com sucesso', async () => {
      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let createResult: { sucesso: boolean; agendamento?: Agendamento; erro?: string } = { sucesso: false };

      await act(async () => {
        createResult = await result.current.criar({
          estabelecimentoId: 'corte-rapido',
          servicosIds: ['serv-1'],
          dia: '2025-12-25',
          horario: '10:00',
          formaPagamento: 'no_local',
        });
      });

      expect(createResult.sucesso).toBe(true);
      expect(createResult.agendamento).toBeDefined();
      expect(mockEstabelecimentosService.obter).toHaveBeenCalledWith('corte-rapido');
      const criarCalls = mockAgendamentosService.criar.mock.calls;
      expect(criarCalls).toHaveLength(1);
      const chamado = criarCalls[0][0];
      expect(chamado.estabelecimentoId).toBe('corte-rapido');
      expect(chamado.usuarioId).toBe('cliente@demo.com');
      expect(chamado.servicoIds).toEqual(['serv-1']);
      expect(chamado.statusPagamento).toBe('no_local');
    });

    it('deve calcular valor total e duração dos serviços', async () => {
      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let createResult: { sucesso: boolean; agendamento?: unknown; erro?: string } = { sucesso: false };

      await act(async () => {
        createResult = await result.current.criar({
          estabelecimentoId: 'corte-rapido',
          servicosIds: ['serv-1', 'serv-2'],
          dia: '2025-12-25',
          horario: '10:00',
          formaPagamento: 'pix',
        });
      });

      // Aguarda o mock ser chamado (flusha promessas internas)
      await waitFor(() => expect(mockAgendamentosService.criar).toHaveBeenCalled());

      expect(createResult.sucesso).toBe(true);
      expect(createResult.agendamento).toBeDefined();
      expect(mockEstabelecimentosService.obter).toHaveBeenCalledWith('corte-rapido');
      const criarCalls = mockAgendamentosService.criar.mock.calls;
      expect(criarCalls).toHaveLength(1);
      expect(criarCalls[0][0]).toMatchObject({
        valorTotal: 65,
        duracaoMinutos: 50,
        statusPagamento: 'aguardando_pix',
      });
    });

    it('deve retornar erro se estabelecimento não encontrado', async () => {
      mockEstabelecimentosService.obter.mockResolvedValue({ sucesso: false, erro: 'Não encontrado' });

      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let createResult: { sucesso: boolean; erro?: string } = { sucesso: true };

      await act(async () => {
        createResult = await result.current.criar({
          estabelecimentoId: 'inexistente',
          servicosIds: ['serv-1'],
          dia: '2025-12-25',
          horario: '10:00',
          formaPagamento: 'no_local',
        });
      });

      expect(createResult.sucesso).toBe(false);
      expect(createResult.erro).toBe('Estabelecimento não encontrado');
    });

    it('deve retornar erro se usuário não autenticado', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockAuthService.validarToken.mockResolvedValue({ sucesso: false, erro: 'Token inválido' });

      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let createResult: { sucesso: boolean; erro?: string } = { sucesso: true };

      await act(async () => {
        createResult = await result.current.criar({
          estabelecimentoId: 'corte-rapido',
          servicosIds: ['serv-1'],
          dia: '2025-12-25',
          horario: '10:00',
          formaPagamento: 'no_local',
        });
      });

      expect(createResult.sucesso).toBe(false);
      expect(createResult.erro).toBe('Usuário não autenticado');
    });
  });

  describe('reagendar', () => {
    it('deve reagendar agendamento com sucesso', async () => {
      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let reagendarResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        reagendarResult = await result.current.reagendar('bk-1', '2025-12-26', '11:00');
      });

      expect(reagendarResult.sucesso).toBe(true);
      expect(mockAgendamentosService.reagendar).toHaveBeenCalledWith('bk-1', '2025-12-26', '11:00');
    });
  });

  describe('cancelar', () => {
    it('deve cancelar agendamento e remover da lista', async () => {
      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let cancelResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        cancelResult = await result.current.cancelar('bk-1');
      });

      expect(cancelResult.sucesso).toBe(true);
      expect(result.current.agendamentos).toHaveLength(1);
      expect(result.current.agendamentos[0].id).toBe('bk-2');
    });
  });

  describe('confirmarPresenca', () => {
    it('deve confirmar presença e atualizar status', async () => {
      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let confirmResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        confirmResult = await result.current.confirmarPresenca('bk-1');
      });

      expect(confirmResult.sucesso).toBe(true);
      await waitFor(() => {
        expect(result.current.agendamentos.find((a) => a.id === 'bk-1')?.status).toBe('confirmado');
      });
    });
  });

  describe('avaliar', () => {
    it('deve avaliar agendamento e marcar como concluído', async () => {
      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let avaliarResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        avaliarResult = await result.current.avaliar('bk-1', 5, 'Excelente!');
      });

      expect(avaliarResult.sucesso).toBe(true);
      expect(mockAgendamentosService.avaliar).toHaveBeenCalledWith('bk-1', 5, 'Excelente!');
      expect(result.current.agendamentos.find((a) => a.id === 'bk-1')?.status).toBe('concluido');
    });
  });

  describe('paginação', () => {
    it('deve carregar mais se temMais', async () => {
      const muitosAgendamentos = Array.from({ length: 25 }, (_, i) => ({
        ...mockAgendamentos[0],
        id: `bk-${i}`,
        dia: `2025-12-${String(20 + i).padStart(2, '0')}`,
      }));
      mockAgendamentosService.listarCliente.mockResolvedValue({ sucesso: true, dados: muitosAgendamentos });

      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => {
        expect(result.current.agendamentos).toHaveLength(10);
      }, { timeout: 2000 });
      expect(result.current.temMais).toBe(true);

      await act(async () => {
        await result.current.carregarMais();
      });

      await waitFor(() => {
        expect(result.current.agendamentos).toHaveLength(20);
      }, { timeout: 2000 });
    });
  });

  describe('recarregar', () => {
    it('deve resetar paginação e recarregar', async () => {
      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        mockAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.recarregar();
      });

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(result.current.pagina).toBe(1);
      expect(mockAgendamentosService.listarCliente).toHaveBeenCalledTimes(2);
    });
  });

  describe('limparErro', () => {
    it('deve limpar mensagem de erro', async () => {
      // Cria novos mocks para este teste específico
      const errorAgendamentosService = createMockAgendamentosService();
      errorAgendamentosService.listarCliente.mockResolvedValue({ sucesso: false, erro: 'Erro teste' });

      const { result } = renderHookWithAgendamentos(
        () => useAgendamentos(),
        errorAgendamentosService,
        mockEstabelecimentosService,
        mockAuthService
      );

      await waitFor(() => {
        expect(result.current.erro).toBe('Erro teste');
      }, { timeout: 2000 });

      act(() => {
        result.current.limparErro();
      });

      expect(result.current.erro).toBeNull();
    });
  });
});

describe('useAgendamentosBarbeiro', () => {
  let mockAgendamentosService: ReturnType<typeof createMockAgendamentosService>;
  let mockEstabelecimentosService: ReturnType<typeof createMockEstabelecimentosService>;
  let mockAuthService: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem
      .mockReturnValueOnce(JSON.stringify(mockBarbeiro)) // CHAVE_USUARIO
      .mockReturnValueOnce('mock-token-123'); // CHAVE_TOKEN
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});

    mockAgendamentosService = createMockAgendamentosService();
    mockEstabelecimentosService = createMockEstabelecimentosService();
    mockAuthService = createMockAuthService();

    mockAuthService.validarToken.mockResolvedValue({ sucesso: true, dados: { papel: 'barbeiro', email: 'cliente@demo.com', nome: 'João Cliente', estabelecimentoId: 'corte-rapido' } });
    mockAuthService.obterSessao.mockResolvedValue({ sucesso: true, dados: mockBarbeiro });
    mockAgendamentosService.listarEstabelecimento.mockResolvedValue({ sucesso: true, dados: mockAgendamentos });
    mockAgendamentosService.confirmarPresenca.mockResolvedValue({ sucesso: true });
    mockAgendamentosService.cancelar.mockResolvedValue({ sucesso: true });
    mockAgendamentosService.atualizarStatus.mockResolvedValue({ sucesso: true });
    mockAgendamentosService.definirHorarioReal.mockResolvedValue({ sucesso: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve carregar agendamentos do estabelecimento', async () => {
    const { result } = renderHookWithAgendamentos(
      () => useAgendamentosBarbeiro('corte-rapido'),
      mockAgendamentosService,
      mockEstabelecimentosService,
      mockAuthService
    );

    await waitFor(() => {
      expect(result.current.agendamentos).toHaveLength(2);
    }, { timeout: 2000 });

    expect(mockAgendamentosService.listarEstabelecimento).toHaveBeenCalledWith('corte-rapido');
  });

  it('não deve carregar se não for barbeiro', async () => {
    localStorageMock.getItem
      .mockReturnValueOnce(JSON.stringify(mockUsuario))
      .mockReturnValueOnce('mock-token-123');
    mockAuthService.validarToken.mockResolvedValue({ sucesso: true, dados: { papel: 'cliente', email: 'cliente@demo.com', nome: 'João Cliente' } });
    mockAuthService.obterSessao.mockResolvedValue({ sucesso: true, dados: mockUsuario });

    const { result } = renderHookWithAgendamentos(
      () => useAgendamentosBarbeiro('corte-rapido'),
      mockAgendamentosService,
      mockEstabelecimentosService,
      mockAuthService
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.agendamentos).toHaveLength(0);
    expect(mockAgendamentosService.listarEstabelecimento).not.toHaveBeenCalled();
  });

  it('não deve carregar se estabelecimentoId não fornecido', async () => {
    const { result } = renderHookWithAgendamentos(
      () => useAgendamentosBarbeiro(undefined),
      mockAgendamentosService,
      mockEstabelecimentosService,
      mockAuthService
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.agendamentos).toHaveLength(0);
  });

  it('deve filtrar por status', async () => {
    const { result } = renderHookWithAgendamentos(
      () => useAgendamentosBarbeiro('corte-rapido'),
      mockAgendamentosService,
      mockEstabelecimentosService,
      mockAuthService
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => {
      result.current.setFiltros({ status: 'aguardando_pix' });
    });

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.agendamentos.every((a) => a.statusPagamento === 'aguardando_pix')).toBe(true);
  });

  it('deve filtrar por data início', async () => {
    const { result } = renderHookWithAgendamentos(
      () => useAgendamentosBarbeiro('corte-rapido'),
      mockAgendamentosService,
      mockEstabelecimentosService,
      mockAuthService
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => {
      result.current.setFiltros({ dataInicio: '2025-12-18' });
    });

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.agendamentos.every((a) => a.dia >= '2025-12-18')).toBe(true);
  });

  it('deve atualizar status de pagamento', async () => {
    const { result } = renderHookWithAgendamentos(
      () => useAgendamentosBarbeiro('corte-rapido'),
      mockAgendamentosService,
      mockEstabelecimentosService,
      mockAuthService
    );

    await waitFor(() => {
      expect(result.current.agendamentos).toHaveLength(2);
    }, { timeout: 2000 });

    let updateResult: { sucesso: boolean; erro?: string } = { sucesso: false };

    await act(async () => {
      updateResult = await result.current.atualizarStatus('bk-1', 'pago');
    });

    expect(updateResult.sucesso).toBe(true);
    expect(result.current.agendamentos.find((a) => a.id === 'bk-1')?.statusPagamento).toBe('pago');
  });

  it('deve cancelar agendamento do barbeiro', async () => {
    const { result } = renderHookWithAgendamentos(
      () => useAgendamentosBarbeiro('corte-rapido'),
      mockAgendamentosService,
      mockEstabelecimentosService,
      mockAuthService
    );

    await waitFor(() => {
      expect(result.current.agendamentos).toHaveLength(2);
    }, { timeout: 2000 });

    let cancelResult: { sucesso: boolean; erro?: string } = { sucesso: false };

    await act(async () => {
      cancelResult = await result.current.cancelar('bk-1');
    });

    expect(cancelResult.sucesso).toBe(true);
    expect(result.current.agendamentos.find((a) => a.id === 'bk-1')?.status).toBe('cancelado');
  });

  it('deve definir horário real (concluir)', async () => {
    const { result } = renderHookWithAgendamentos(
      () => useAgendamentosBarbeiro('corte-rapido'),
      mockAgendamentosService,
      mockEstabelecimentosService,
      mockAuthService
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));

    let horarioResult: { sucesso: boolean; erro?: string } = { sucesso: false };

    await act(async () => {
      horarioResult = await result.current.definirHorarioReal('bk-1', '10:15');
    });

    expect(horarioResult.sucesso).toBe(true);
    expect(result.current.agendamentos.find((a) => a.id === 'bk-1')?.status).toBe('concluido');
  });
});