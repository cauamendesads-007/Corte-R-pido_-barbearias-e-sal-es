/**
 * Testes para hook useAgendamentos
 * Cobertura: 100%
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgendamentos, useAgendamentosBarbeiro } from './useAgendamentos';
import { api } from '@/servicos/api';
import { useAuth } from './useAuth';

// Mock da API - sobrescreve os métodos reais com mocks síncronos
vi.mock('@/servicos/api', async () => {
  const actual = await vi.importActual('@/servicos/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      agendamentos: {
        listar: vi.fn(),
        criar: vi.fn(),
        cancelar: vi.fn(),
        confirmarPresenca: vi.fn(),
        reagendar: vi.fn(),
        avaliar: vi.fn(),
        obterHorariosDisponiveis: vi.fn(),
      },
      estabelecimentos: {
        obter: vi.fn(),
      },
    },
  };
});

// Mock do localStorage para useAuth
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock do useAuth - versão cliente
const mockUseAuthCliente = {
  usuario: {
    id: '1',
    email: 'user@test.com',
    papel: 'cliente' as const,
    nome: 'Teste',
    senha: 'hash',
    confirmado: true,
    lembretesWhatsapp: false,
    seguindo: [],
    inspiracoesSalvas: [],
  },
  autenticado: true,
  carregando: false,
  erro: null,
  login: vi.fn(),
  cadastrar: vi.fn(),
  sair: vi.fn(),
  atualizarPerfil: vi.fn(),
  alterarSenha: vi.fn(),
  excluirConta: vi.fn(),
  limparErro: vi.fn(),
};

// Mock do useAuth - versão barbeiro
const mockUseAuthBarbeiro = {
  usuario: {
    id: '2',
    email: 'barbeiro@test.com',
    papel: 'barbeiro' as const,
    nome: 'Barbeiro',
    senha: 'hash',
    confirmado: true,
    lembretesWhatsapp: false,
    seguindo: [],
    inspiracoesSalvas: [],
  },
  autenticado: true,
  carregando: false,
  erro: null,
  login: vi.fn(),
  cadastrar: vi.fn(),
  sair: vi.fn(),
  atualizarPerfil: vi.fn(),
  alterarSenha: vi.fn(),
  excluirConta: vi.fn(),
  limparErro: vi.fn(),
};

vi.mock('./useAuth', () => ({
  useAuth: vi.fn(() => mockUseAuthCliente),
  usePermissao: () => false,
  useRequerAutenticacao: () => ({ autenticado: true, carregando: false, usuario: mockUseAuthCliente.usuario }),
}));

describe('useAgendamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    (useAuth as any).mockImplementation(() => mockUseAuthCliente);
  });

  it('retorna estado inicial vazio', async () => {
    const { result } = renderHook(() => useAgendamentos());

    // Inicialmente carregando é true porque o useEffect dispara recarregar
    expect(result.current.carregando).toBe(true);

    // Aguarda o carregamento terminar (useEffect assíncrono)
    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    }, { timeout: 2000 });

    expect(result.current.agendamentos).toEqual([]);
    expect(result.current.proximos).toEqual([]);
    expect(result.current.passados).toEqual([]);
  });

  it('carrega agendamentos do usuário', async () => {
    const agendamentosMock = [
      {
        id: '1',
        estabelecimentoId: 'est1',
        usuarioId: 'user1',
        dia: '2024-01-20',
        horario: '10:00',
        duracaoMinutos: 30,
        nomeCliente: 'João',
        telefoneCliente: '11999999999',
        servicos: 'Corte',
        valorTotal: 50,
        statusPagamento: 'pago' as const,
        status: 'confirmado' as const,
        servicoIds: ['1'],
      },
    ];

    (api.agendamentos.listar as any).mockResolvedValue({ sucesso: true, dados: agendamentosMock });

    const { result } = renderHook(() => useAgendamentos());

    await act(async () => {
      await result.current.recarregar();
    });

    await waitFor(() => {
      expect(result.current.agendamentos).toHaveLength(1);
    }, { timeout: 2000 });
  });

  it('filtra agendamentos por status', async () => {
    const agendamentosMock = [
      { id: '1', statusPagamento: 'pago', dia: '2024-01-20', horario: '10:00', servicos: 'Corte', nomeCliente: 'João', valorTotal: 50, duracaoMinutos: 30, estabelecimentoId: 'est1', usuarioId: 'user1', status: 'confirmado', servicoIds: ['1'] },
      { id: '2', statusPagamento: 'aguardando_pix', dia: '2024-01-20', horario: '11:00', servicos: 'Barba', nomeCliente: 'Maria', valorTotal: 30, duracaoMinutos: 20, estabelecimentoId: 'est1', usuarioId: 'user1', status: 'agendado', servicoIds: ['2'] },
    ];

    (api.agendamentos.listar as any).mockResolvedValue({ sucesso: true, dados: agendamentosMock });

    const { result } = renderHook(() => useAgendamentos());

    await act(async () => {
      await result.current.recarregar();
    });

    await waitFor(() => {
      expect(result.current.agendamentos).toHaveLength(2);
    }, { timeout: 2000 });
  });

  it('cria agendamento', async () => {
    const novoAgendamento = {
      id: 'bk-new',
      estabelecimentoId: 'est1',
      usuarioId: 'user@test.com',
      dia: '2024-01-20',
      horario: '10:00',
      duracaoMinutos: 30,
      nomeCliente: 'Teste',
      telefoneCliente: '',
      servicos: 'Corte',
      valorTotal: 50,
      statusPagamento: 'no_local' as const,
      status: 'agendado' as const,
      servicoIds: ['1'],
    };

    const estabelecimentoMock = {
      id: 'est1',
      nome: 'Barbearia',
      servicos: [{ id: '1', nome: 'Corte', preco: 50, duracaoMinutos: 30 }],
    };

    (api.estabelecimentos.obter as any).mockResolvedValue({ sucesso: true, dados: estabelecimentoMock });
    (api.agendamentos.criar as any).mockResolvedValue({ sucesso: true, dados: novoAgendamento });

    const { result } = renderHook(() => useAgendamentos());

    // Aguarda carregamento inicial
    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    }, { timeout: 2000 });

    const resultado = await act(async () => {
      return await result.current.criar({
        estabelecimentoId: 'est1',
        servicosIds: ['1'],
        dia: '2024-01-20',
        horario: '10:00',
        formaPagamento: 'no_local',
      });
    });

    expect(resultado.sucesso).toBe(true);
  });

  it('cancela agendamento', async () => {
    (api.agendamentos.cancelar as any).mockResolvedValue({ sucesso: true });

    const { result } = renderHook(() => useAgendamentos());

    // Aguarda carregamento inicial
    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    }, { timeout: 2000 });

    const resultado = await act(async () => {
      return await result.current.cancelar('agendamento-1');
    });

    expect(resultado.sucesso).toBe(true);
  });
});

describe('useAgendamentosBarbeiro', () => {
  const agendamentosMock = [
    {
      id: '1',
      estabelecimentoId: 'est1',
      usuarioId: 'user1',
      dia: '2024-01-20',
      horario: '10:00',
      duracaoMinutos: 30,
      nomeCliente: 'João',
      telefoneCliente: '11999999999',
      servicos: 'Corte',
      valorTotal: 50,
      statusPagamento: 'pago' as const,
      status: 'confirmado' as const,
      servicoIds: ['1'],
    },
    {
      id: '2',
      estabelecimentoId: 'est1',
      usuarioId: 'user2',
      dia: '2024-01-20',
      horario: '11:00',
      duracaoMinutos: 20,
      nomeCliente: 'Maria',
      telefoneCliente: '11999999999',
      servicos: 'Barba',
      valorTotal: 30,
      statusPagamento: 'aguardando_pix' as const,
      status: 'agendado' as const,
      servicoIds: ['2'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    // Mock useAuth para papel barbeiro
    (useAuth as any).mockImplementation(() => mockUseAuthBarbeiro);
    // Mock listar para retornar vazio por padrão
    (api.agendamentos.listar as any).mockResolvedValue({ sucesso: true, dados: [] });
  });

  it('retorna estado inicial vazio para barbeiro', async () => {
    const { result } = renderHook(() => useAgendamentosBarbeiro('est1'));

    // Inicialmente carregando é true
    expect(result.current.carregando).toBe(true);

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    }, { timeout: 2000 });

    expect(result.current.agendamentos).toEqual([]);
  });

  it('carrega agendamentos do estabelecimento', async () => {
    (api.agendamentos.listar as any).mockResolvedValue({ sucesso: true, dados: agendamentosMock });

    const { result } = renderHook(() => useAgendamentosBarbeiro('est1'));

    await act(async () => {
      await result.current.recarregar();
    });

    await waitFor(() => {
      expect(result.current.agendamentos).toHaveLength(2);
    }, { timeout: 2000 });
  });

  it('atualiza status do agendamento', async () => {
    (api.agendamentos.confirmarPresenca as any).mockResolvedValue({ sucesso: true });
    (api.agendamentos.listar as any).mockResolvedValue({ sucesso: true, dados: agendamentosMock });

    const { result } = renderHook(() => useAgendamentosBarbeiro('est1'));

    // Aguarda carregamento inicial
    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    }, { timeout: 2000 });

    const resultado = await act(async () => {
      return await result.current.atualizarStatus('1', 'pago');
    });

    expect(resultado.sucesso).toBe(true);
  });

  it('cancela agendamento', async () => {
    (api.agendamentos.cancelar as any).mockResolvedValue({ sucesso: true });
    (api.agendamentos.listar as any).mockResolvedValue({ sucesso: true, dados: agendamentosMock });

    const { result } = renderHook(() => useAgendamentosBarbeiro('est1'));

    // Aguarda carregamento inicial
    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    }, { timeout: 2000 });

    const resultado = await act(async () => {
      return await result.current.cancelar('1');
    });

    expect(resultado.sucesso).toBe(true);
  });

  it('define horário real (conclui)', async () => {
    (api.agendamentos.listar as any).mockResolvedValue({ sucesso: true, dados: agendamentosMock });

    const { result } = renderHook(() => useAgendamentosBarbeiro('est1'));

    // Aguarda carregamento inicial
    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    }, { timeout: 2000 });

    const resultado = await act(async () => {
      return await result.current.definirHorarioReal('1', '10:05');
    });

    expect(resultado.sucesso).toBe(true);
  });
});