/**
 * Testes para useAgendamentos - Gerenciamento de agendamentos.
 * Cobre: criar, reagendar, cancelar, confirmarPresenca, avaliar, paginação, useAgendamentosBarbeiro.
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
    agendamentos: {
      listar: vi.fn(),
      criar: vi.fn(),
      reagendar: vi.fn(),
      cancelar: vi.fn(),
      confirmarPresenca: vi.fn(),
      avaliar: vi.fn(),
      confirmarPagamentoPix: vi.fn(),
      atualizarStatus: vi.fn(),
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

import { useAgendamentos, useAgendamentosBarbeiro } from './useAgendamentos';
import { api } from '@/servicos/api';
import { useAuth } from './useAuth';
import type { Agendamento } from '@/tipos';

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

describe('useAgendamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as vi.Mock).mockReturnValue({ usuario: mockUsuario });
    api.agendamentos.listar.mockResolvedValue({ sucesso: true, dados: mockAgendamentos });
    api.estabelecimentos.obter.mockResolvedValue({ sucesso: true, dados: mockEstabelecimento });
    api.agendamentos.criar.mockResolvedValue({ sucesso: true, dados: mockAgendamentos[0] });
    api.agendamentos.reagendar.mockResolvedValue({ sucesso: true, dados: mockAgendamentos[0] });
    api.agendamentos.cancelar.mockResolvedValue({ sucesso: true });
    api.agendamentos.confirmarPresenca.mockResolvedValue({ sucesso: true });
    api.agendamentos.avaliar.mockResolvedValue({ sucesso: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('carregamento inicial', () => {
    it('deve carregar agendamentos do usuário', async () => {
      const { result } = renderHook(() => useAgendamentos());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(api.agendamentos.listar).toHaveBeenCalledWith({ usuarioId: 'cliente@demo.com' });
      expect(result.current.agendamentos).toHaveLength(2);
      expect(result.current.temMais).toBe(false);
    });

    it('deve separar próximos e passados', async () => {
      const { result } = renderHook(() => useAgendamentos());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(result.current.proximos).toHaveLength(1); // apenas bk-1 (futuro)
      expect(result.current.passados).toHaveLength(1); // bk-2 (passado)
    });

    it('não deve carregar se usuário não autenticado', async () => {
      (useAuth as vi.Mock).mockReturnValue({ usuario: null });

      const { result } = renderHook(() => useAgendamentos());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(result.current.agendamentos).toHaveLength(0);
      expect(api.agendamentos.listar).not.toHaveBeenCalled();
    });
  });

  describe('criar agendamento', () => {
    it('deve criar agendamento com sucesso', async () => {
      const { result } = renderHook(() => useAgendamentos());

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
      expect(api.estabelecimentos.obter).toHaveBeenCalledWith('corte-rapido');
      const criarCalls = api.agendamentos.criar.mock.calls;
      expect(criarCalls).toHaveLength(1);
      const chamado = criarCalls[0][0];
      expect(chamado.estabelecimentoId).toBe('corte-rapido');
      expect(chamado.usuarioId).toBe('cliente@demo.com');
      expect(chamado.servicoIds).toEqual(['serv-1']);
      expect(chamado.statusPagamento).toBe('no_local');
    });

    it('deve calcular valor total e duração dos serviços', async () => {
      const { result } = renderHook(() => useAgendamentos());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.criar({
          estabelecimentoId: 'corte-rapido',
          servicosIds: ['serv-1', 'serv-2'],
          dia: '2025-12-25',
          horario: '10:00',
          formaPagamento: 'pix',
        });
      });

      const criarCalls = api.agendamentos.criar.mock.calls;
      expect(criarCalls).toHaveLength(1);
      expect(criarCalls[0][0]).toMatchObject({
        valorTotal: 65,
        duracaoMinutos: 50,
        statusPagamento: 'aguardando_pix',
      });
    });

    it('deve retornar erro se estabelecimento não encontrado', async () => {
      api.estabelecimentos.obter.mockResolvedValue({ sucesso: false, erro: 'Não encontrado' });

      const { result } = renderHook(() => useAgendamentos());

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
      (useAuth as vi.Mock).mockReturnValue({ usuario: null });

      const { result } = renderHook(() => useAgendamentos());

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
      const { result } = renderHook(() => useAgendamentos());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let reagendarResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        reagendarResult = await result.current.reagendar('bk-1', '2025-12-26', '11:00');
      });

      expect(reagendarResult.sucesso).toBe(true);
      expect(api.agendamentos.reagendar).toHaveBeenCalledWith('bk-1', '2025-12-26', '11:00');
    });
  });

  describe('cancelar', () => {
    it('deve cancelar agendamento e remover da lista', async () => {
      const { result } = renderHook(() => useAgendamentos());

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
      const { result } = renderHook(() => useAgendamentos());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let confirmResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        confirmResult = await result.current.confirmarPresenca('bk-1');
      });

      expect(confirmResult.sucesso).toBe(true);
      expect(result.current.agendamentos.find(a => a.id === 'bk-1')?.status).toBe('confirmado');
    });
  });

  describe('avaliar', () => {
    it('deve avaliar agendamento e marcar como concluído', async () => {
      const { result } = renderHook(() => useAgendamentos());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let avaliarResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        avaliarResult = await result.current.avaliar('bk-1', 5, 'Excelente!');
      });

      expect(avaliarResult.sucesso).toBe(true);
      expect(api.agendamentos.avaliar).toHaveBeenCalledWith('bk-1', 5, 'Excelente!');
      expect(result.current.agendamentos.find(a => a.id === 'bk-1')?.status).toBe('concluido');
    });
  });

  describe('paginação', () => {
    it('deve carregar mais se temMais', async () => {
      const muitosAgendamentos = Array.from({ length: 25 }, (_, i) => ({
        ...mockAgendamentos[0],
        id: `bk-${i}`,
        dia: `2025-12-${String(20 + i).padStart(2, '0')}`,
      }));
      api.agendamentos.listar.mockResolvedValue({ sucesso: true, dados: muitosAgendamentos });

      const { result } = renderHook(() => useAgendamentos());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(result.current.agendamentos).toHaveLength(10); // ITENS_POR_PAGINA
      expect(result.current.temMais).toBe(true);

      await act(async () => {
        await result.current.carregarMais();
      });

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(result.current.agendamentos).toHaveLength(20);
    });
  });

  describe('recarregar', () => {
    it('deve resetar paginação e recarregar', async () => {
      const { result } = renderHook(() => useAgendamentos());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.recarregar();
      });

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(result.current.pagina).toBe(1);
      expect(api.agendamentos.listar).toHaveBeenCalledTimes(2);
    });
  });

  describe('limparErro', () => {
    it('deve limpar mensagem de erro', async () => {
      api.agendamentos.listar.mockResolvedValue({ sucesso: false, erro: 'Erro teste' });

      const { result } = renderHook(() => useAgendamentos());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      expect(result.current.erro).toBe('Erro teste');

      act(() => {
        result.current.limparErro();
      });

      expect(result.current.erro).toBeNull();
    });
  });
});

describe('useAgendamentosBarbeiro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as vi.Mock).mockReturnValue({ usuario: mockBarbeiro });
    api.agendamentos.listar.mockResolvedValue({ sucesso: true, dados: mockAgendamentos });
    api.agendamentos.confirmarPresenca.mockResolvedValue({ sucesso: true });
    api.agendamentos.cancelar.mockResolvedValue({ sucesso: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve carregar agendamentos do estabelecimento', async () => {
    const { result } = renderHook(() => useAgendamentosBarbeiro('corte-rapido'));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(api.agendamentos.listar).toHaveBeenCalledWith({ estabelecimentoId: 'corte-rapido' });
    expect(result.current.agendamentos).toHaveLength(2);
  });

  it('não deve carregar se não for barbeiro', async () => {
    (useAuth as vi.Mock).mockReturnValue({ usuario: mockUsuario });

    const { result } = renderHook(() => useAgendamentosBarbeiro('corte-rapido'));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.agendamentos).toHaveLength(0);
    expect(api.agendamentos.listar).not.toHaveBeenCalled();
  });

  it('não deve carregar se estabelecimentoId não fornecido', async () => {
    const { result } = renderHook(() => useAgendamentosBarbeiro(undefined));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.agendamentos).toHaveLength(0);
  });

  it('deve filtrar por status', async () => {
    const { result } = renderHook(() => useAgendamentosBarbeiro('corte-rapido'));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => {
      result.current.setFiltros({ status: 'aguardando_pix' });
    });

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.agendamentos.every(a => a.statusPagamento === 'aguardando_pix')).toBe(true);
  });

  it('deve filtrar por data início', async () => {
    const { result } = renderHook(() => useAgendamentosBarbeiro('corte-rapido'));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => {
      result.current.setFiltros({ dataInicio: '2025-12-18' });
    });

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.agendamentos.every(a => a.dia >= '2025-12-18')).toBe(true);
  });

  it('deve atualizar status de pagamento', async () => {
    const { result } = renderHook(() => useAgendamentosBarbeiro('corte-rapido'));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    let updateResult: { sucesso: boolean; erro?: string } = { sucesso: false };

    await act(async () => {
      updateResult = await result.current.atualizarStatus('bk-1', 'pago');
    });

    expect(updateResult.sucesso).toBe(true);
    expect(result.current.agendamentos.find(a => a.id === 'bk-1')?.statusPagamento).toBe('pago');
  });

  it('deve cancelar agendamento do barbeiro', async () => {
    const { result } = renderHook(() => useAgendamentosBarbeiro('corte-rapido'));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    let cancelResult: { sucesso: boolean; erro?: string } = { sucesso: false };

    await act(async () => {
      cancelResult = await result.current.cancelar('bk-1');
    });

    expect(cancelResult.sucesso).toBe(true);
    expect(result.current.agendamentos.find(a => a.id === 'bk-1')?.status).toBe('cancelado');
  });

  it('deve definir horário real (concluir)', async () => {
    const { result } = renderHook(() => useAgendamentosBarbeiro('corte-rapido'));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    let horarioResult: { sucesso: boolean; erro?: string } = { sucesso: false };

    await act(async () => {
      horarioResult = await result.current.definirHorarioReal('bk-1', '10:15');
    });

    expect(horarioResult.sucesso).toBe(true);
    expect(result.current.agendamentos.find(a => a.id === 'bk-1')?.status).toBe('concluido');
  });
});