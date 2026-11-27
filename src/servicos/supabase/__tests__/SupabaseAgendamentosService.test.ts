/**
 * Testes unitários para SupabaseAgendamentosService
 * Mocka o SDK @supabase/supabase-js
 * Cobertura: sucesso, conflito (409/23P01), RLS (403), fallback mock
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Agendamento, StatusPagamento, StatusAgendamento } from '@/tipos';

// Mock do cliente Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
      })),
      in: vi.fn(() => ({
        single: vi.fn(),
      })),
      order: vi.fn(() => ({
        limit: vi.fn(() => ({
          range: vi.fn(),
        })),
      })),
      limit: vi.fn(),
      range: vi.fn(),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(),
    })),
    rpc: vi.fn(),
  })),
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    onAuthStateChange: vi.fn(),
    admin: {
      deleteUser: vi.fn(),
    },
  },
  functions: {
    invoke: vi.fn(),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
    })),
  },
  channel: vi.fn(() => ({
    on: vi.fn(() => ({ subscribe: vi.fn() })),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
  removeChannel: vi.fn(),
  rpc: vi.fn(),
};

// Mock do módulo client
vi.mock('../client', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  isMockMode: vi.fn(() => false),
  initSupabase: vi.fn(),
  enableMockMode: vi.fn(),
  resetSupabase: vi.fn(),
}));

describe('SupabaseAgendamentosService', () => {
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
        in: vi.fn(() => ({
          single: vi.fn(),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            range: vi.fn(),
          })),
        })),
        limit: vi.fn(),
        range: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
      rpc: vi.fn(),
    });
    mockSupabase.rpc.mockReset();
    mockSupabase.auth.getUser.mockReset();
    mockSupabase.auth.getSession.mockReset();

    const module = await import('../SupabaseAgendamentosService');
    service = module.SupabaseAgendamentosService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // HELPERS
  // ============================================================================

  const mockAgendamentoData = {
    id: 'agendamento-123',
    estabelecimento_id: 'est-123',
    usuario_id: 'user-123',
    dia: '2025-01-15',
    horario: '14:00',
    duracao_min: 30,
    nome_cliente: 'João Silva',
    telefone_cliente: '(11) 99999-9999',
    servicos: 'Corte, Barba',
    valor_total_centavos: 8000,
    status_pagamento: 'no_local',
    status: 'agendado',
    servico_ids: ['serv-1', 'serv-2'],
    observacoes: 'Sem restrições',
  };

  const mockVRow = {
    ...mockAgendamentoData,
    avaliacao_estrelas: null,
    avaliacao_comentario: null,
    avaliacao_data: null,
  };

  function setupMockSelect(returnData: any = mockVRow) {
    const chain = {
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      range: vi.fn(() => chain),
      single: vi.fn().mockResolvedValue({ data: returnData, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: returnData, error: null }),
    };
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => chain),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: returnData, error: null }) })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: returnData, error: null }) })) })) })),
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      rpc: vi.fn(),
    });
  }

  function setupMockRpc(returnData: any = { agendamento_id: 'agendamento-123', erro: null }) {
    mockSupabase.rpc.mockResolvedValue({ data: [returnData], error: null });
  }

  // ============================================================================
  // TESTES: listarAgendamentosEstabelecimento
  // ============================================================================

  describe('listarAgendamentosEstabelecimento', () => {
    it('deve retornar lista de agendamentos com sucesso', async () => {
      setupMockSelect([mockVRow, { ...mockVRow, id: 'agendamento-456', horario: '15:00' }]);

      const resultado = await service.listarAgendamentosEstabelecimento('est-123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toHaveLength(2);
      expect(resultado.dados?.[0].id).toBe('agendamento-123');
      expect(resultado.dados?.[0].valorTotal).toBe(80); // centavos -> reais
      expect(resultado.dados?.[0].servicoIds).toEqual(['serv-1', 'serv-2']);
    });

    it('deve retornar array vazio quando não há agendamentos', async () => {
      setupMockSelect([]);

      const resultado = await service.listarAgendamentosEstabelecimento('est-123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toEqual([]);
    });

    it('deve retornar erro quando Supabase falha', async () => {
      const chain = {
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro de conexão' } }),
      };
      mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });

      const resultado = await service.listarAgendamentosEstabelecimento('est-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro de conexão');
    });
  });

  // ============================================================================
  // TESTES: listarAgendamentosCliente
  // ============================================================================

  describe('listarAgendamentosCliente', () => {
    it('deve retornar agendamentos do cliente com sucesso', async () => {
      setupMockSelect([mockVRow]);

      const resultado = await service.listarAgendamentosCliente('user-123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toHaveLength(1);
      expect(resultado.dados?.[0].usuarioId).toBe('user-123');
    });
  });

  // ============================================================================
  // TESTES: obterAgendamento
  // ============================================================================

  describe('obterAgendamento', () => {
    it('deve retornar agendamento por ID com sucesso', async () => {
      const chain = {
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockVRow, error: null }),
        })),
      };
      mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });

      const resultado = await service.obterAgendamento('agendamento-123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).not.toBeNull();
      expect(resultado.dados?.id).toBe('agendamento-123');
    });

    it('deve retornar null quando agendamento não encontrado', async () => {
      const chain = {
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      };
      mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });

      const resultado = await service.obterAgendamento('inexistente');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBeNull();
    });
  });

  // ============================================================================
  // TESTES: obterHorariosDisponiveis
  // ============================================================================

  describe('obterHorariosDisponiveis', () => {
    it('deve retornar horários disponíveis combinados de múltiplos profissionais', async () => {
      // Mock profissionais
      const profChain = {
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ data: [{ id: 'prof-1' }, { id: 'prof-2' }], error: null }),
          })),
        })),
      };
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profissionais') return { select: vi.fn(() => profChain) };
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
      });

      // Mock RPC para cada profissional
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [{ horario: '09:00', disponivel: true }, { horario: '10:00', disponivel: false }], error: null })
        .mockResolvedValueOnce({ data: [{ horario: '09:00', disponivel: false }, { horario: '11:00', disponivel: true }], error: null });

      const resultado = await service.obterHorariosDisponiveis('est-123', '2025-01-15', 30);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toHaveLength(3); // 09:00, 10:00, 11:00 (sem duplicatas)
      expect(resultado.dados?.map(s => s.horario)).toEqual(['09:00', '10:00', '11:00']);
    });

    it('deve retornar array vazio quando não há profissionais ativos', async () => {
      const profChain = {
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      };
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profissionais') return { select: vi.fn(() => profChain) };
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
      });

      const resultado = await service.obterHorariosDisponiveis('est-123', '2025-01-15', 30);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toEqual([]);
    });
  });

  // ============================================================================
  // TESTES: criarAgendamento - SUCESSO
  // ============================================================================

  describe('criarAgendamento - sucesso', () => {
    it('deve criar agendamento via RPC e retornar agendamento completo', async () => {
      setupMockRpc({ agendamento_id: 'novo-agendamento-123', erro: null });
      setupMockSelect({ ...mockVRow, id: 'novo-agendamento-123' });

      const dados: Omit<Agendamento, 'id'> = {
        estabelecimentoId: 'est-123',
        usuarioId: 'user-123',
        dia: '2025-01-15',
        horario: '14:00',
        duracaoMinutos: 30,
        nomeCliente: 'João Silva',
        telefoneCliente: '(11) 99999-9999',
        servicos: 'Corte',
        valorTotal: 50,
        statusPagamento: 'no_local',
        status: 'agendado',
        servicoIds: ['serv-1'],
        observacoes: '',
      };

      const resultado = await service.criarAgendamento(dados);

      expect(resultado.sucesso).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_criar_agendamento', expect.objectContaining({
        p_estabelecimento_id: 'est-123',
        p_dia: '2025-01-15',
        p_horario: '14:00',
        p_valor_total_centavos: 5000,
      }));
    });
  });

  // ============================================================================
  // TESTES: criarAgendamento - CONFLITO (409 / 23P01)
  // ============================================================================

  describe('criarAgendamento - conflito de agenda (HTTP 409 / Postgres 23P01)', () => {
    it('deve retornar erro amigável quando RPC retorna código 23P01 (exclusion_violation)', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: '23P01', message: 'conflito de horário: exclusion constraint violated' },
      });

      const dados: Omit<Agendamento, 'id'> = {
        estabelecimentoId: 'est-123',
        usuarioId: 'user-123',
        dia: '2025-01-15',
        horario: '14:00',
        duracaoMinutos: 30,
        nomeCliente: 'João Silva',
        telefoneCliente: '(11) 99999-9999',
        servicos: 'Corte',
        valorTotal: 50,
        statusPagamento: 'no_local',
        status: 'agendado',
        servicoIds: ['serv-1'],
      };

      const resultado = await service.criarAgendamento(dados);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Esse horário acabou de ser ocupado. Escolha outro.');
    });

    it('deve retornar erro amigável quando mensagem contém "conflito"', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: 'P0001', message: 'conflito: horário já ocupado por outro agendamento' },
      });

      const dados: Omit<Agendamento, 'id'> = {
        estabelecimentoId: 'est-123',
        usuarioId: 'user-123',
        dia: '2025-01-15',
        horario: '14:00',
        duracaoMinutos: 30,
        nomeCliente: 'João Silva',
        telefoneCliente: '(11) 99999-9999',
        servicos: 'Corte',
        valorTotal: 50,
        statusPagamento: 'no_local',
        status: 'agendado',
        servicoIds: ['serv-1'],
      };

      const resultado = await service.criarAgendamento(dados);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Esse horário acabou de ser ocupado. Escolha outro.');
    });

    it('deve retornar erro amigável quando mensagem contém "ocupado"', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: 'P0002', message: 'horário ocupado por agendamento existente' },
      });

      const dados: Omit<Agendamento, 'id'> = {
        estabelecimentoId: 'est-123',
        usuarioId: 'user-123',
        dia: '2025-01-15',
        horario: '14:00',
        duracaoMinutos: 30,
        nomeCliente: 'João Silva',
        telefoneCliente: '(11) 99999-9999',
        servicos: 'Corte',
        valorTotal: 50,
        statusPagamento: 'no_local',
        status: 'agendado',
        servicoIds: ['serv-1'],
      };

      const resultado = await service.criarAgendamento(dados);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Esse horário acabou de ser ocupado. Escolha outro.');
    });

    it('deve propagar outros erros do banco', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: 'P0003', message: 'erro genérico do banco' },
      });

      const dados: Omit<Agendamento, 'id'> = {
        estabelecimentoId: 'est-123',
        usuarioId: 'user-123',
        dia: '2025-01-15',
        horario: '14:00',
        duracaoMinutos: 30,
        nomeCliente: 'João Silva',
        telefoneCliente: '(11) 99999-9999',
        servicos: 'Corte',
        valorTotal: 50,
        statusPagamento: 'no_local',
        status: 'agendado',
        servicoIds: ['serv-1'],
      };

      const resultado = await service.criarAgendamento(dados);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('erro genérico do banco');
    });
  });

  // ============================================================================
  // TESTES: reagendarAgendamento - CONFLITO
  // ============================================================================

  describe('reagendarAgendamento - conflito', () => {
    it('deve retornar erro 409 ao tentar reagendar para horário ocupado', async () => {
      // Mock busca agendamento original
      const selectChain = {
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockAgendamentoData, error: null }),
        })),
      };
      mockSupabase.from.mockReturnValueOnce({ select: vi.fn(() => selectChain) });

      // Mock update cancelamento
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      });

      // Mock RPC com conflito
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: '23P01', message: 'conflito' },
      });

      const resultado = await service.reagendarAgendamento('agendamento-123', '2025-01-16', '15:00');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Esse horário acabou de ser ocupado. Escolha outro.');
    });
  });

  // ============================================================================
  // TESTES: cancelarAgendamento
  // ============================================================================

  describe('cancelarAgendamento', () => {
    it('deve cancelar agendamento com sucesso', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const resultado = await service.cancelarAgendamento('agendamento-123');

      expect(resultado.sucesso).toBe(true);
    });

    it('deve retornar erro quando Supabase falha', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Erro ao cancelar' } }),
        })),
      });

      const resultado = await service.cancelarAgendamento('agendamento-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao cancelar');
    });
  });

  // ============================================================================
  // TESTES: confirmarPresenca
  // ============================================================================

  describe('confirmarPresenca', () => {
    it('deve confirmar presença com sucesso', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const resultado = await service.confirmarPresenca('agendamento-123');

      expect(resultado.sucesso).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: avaliarAgendamento
  // ============================================================================

  describe('avaliarAgendamento', () => {
    it('deve avaliar agendamento e atualizar média do estabelecimento', async () => {
      mockSupabase.from
        .mockReturnValueOnce({ // update agendamento
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        })
        .mockReturnValueOnce({ // select agendamento para avaliação
          select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { estabelecimento_id: 'est-123', nome_cliente: 'João' }, error: null }) })) })),
        })
        .mockReturnValueOnce({ // insert avaliação
          insert: vi.fn(() => ({ select: vi.fn().mockResolvedValue({ error: null }) })),
        })
        .mockReturnValueOnce({ // select avaliações para média
          select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [{ estrelas: 5 }, { estrelas: 4 }], error: null }) })),
        })
        .mockReturnValueOnce({ // update estabelecimento média
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        });

      const resultado = await service.avaliarAgendamento('agendamento-123', 5, 'Excelente!');

      expect(resultado.sucesso).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: atualizarStatus
  // ============================================================================

  describe('atualizarStatus', () => {
    it('deve atualizar status com sucesso', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const resultado = await service.atualizarStatus('agendamento-123', 'confirmado');

      expect(resultado.sucesso).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: definirHorarioReal
  // ============================================================================

  describe('definirHorarioReal', () => {
    it('deve definir horário real e marcar como concluído', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const resultado = await service.definirHorarioReal('agendamento-123', '14:15');

      expect(resultado.sucesso).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: confirmarPagamentoPix
  // ============================================================================

  describe('confirmarPagamentoPix', () => {
    it('deve confirmar pagamento Pix com sucesso', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const resultado = await service.confirmarPagamentoPix('agendamento-123');

      expect(resultado.sucesso).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: MODO MOCK (FALLBACK)
  // ============================================================================

  describe('Modo Mock (fallback quando VITE_SUPABASE_URL não definido)', () => {
    beforeEach(async () => {
      vi.resetModules();
      // Mock isMockMode para retornar true
      vi.doMock('../client', () => ({
        getSupabase: vi.fn(() => mockSupabase),
        isMockMode: vi.fn(() => true),
        initSupabase: vi.fn(),
        enableMockMode: vi.fn(),
        resetSupabase: vi.fn(),
      }));

      const module = await import('../SupabaseAgendamentosService');
      service = module.SupabaseAgendamentosService;
    });

    it('deve delegar para API mock quando isMockMode() retorna true', async () => {
      const mockApi = {
        listarAgendamentosEstabelecimento: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        listarAgendamentosCliente: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        obterAgendamento: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
        obterHorariosDisponiveis: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        criarAgendamento: vi.fn().mockResolvedValue({ sucesso: true, dados: mockVRow }),
        cancelarAgendamento: vi.fn().mockResolvedValue({ sucesso: true, dados: undefined }),
        reagendarAgendamento: vi.fn().mockResolvedValue({ sucesso: true, dados: mockVRow }),
        confirmarPresenca: vi.fn().mockResolvedValue({ sucesso: true, dados: undefined }),
        avaliarAgendamento: vi.fn().mockResolvedValue({ sucesso: true, dados: undefined }),
        listarBarbeiro: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        atualizarStatus: vi.fn().mockResolvedValue({ sucesso: true, dados: undefined }),
        definirHorarioReal: vi.fn().mockResolvedValue({ sucesso: true, dados: undefined }),
        confirmarPagamentoPix: vi.fn().mockResolvedValue({ sucesso: true, dados: undefined }),
      };

      vi.doMock('@/servicos/api', () => mockApi);

      // Re-import para pegar o mock
      vi.resetModules();
      const mod = await import('../SupabaseAgendamentosService');
      const svc = mod.SupabaseAgendamentosService;

      await svc.listarAgendamentosEstabelecimento('est-123');
      expect(mockApi.listarAgendamentosEstabelecimento).toHaveBeenCalledWith('est-123');
    });
  });

  // ============================================================================
  // TESTES: RLS / PERMISSÃO (HTTP 403)
  // ============================================================================

  describe('Erros de permissão RLS (HTTP 403)', () => {
    it('deve retornar erro quando RLS bloqueia listagem', async () => {
      const chain = {
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'row-level security policy violation', code: '42501' } }),
      };
      mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });

      const resultado = await service.listarAgendamentosEstabelecimento('est-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('row-level security');
    });

    it('deve retornar erro quando RLS bloqueia criação', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'permission denied by row-level security policy' },
      });

      const dados: Omit<Agendamento, 'id'> = {
        estabelecimentoId: 'est-123',
        usuarioId: 'user-123',
        dia: '2025-01-15',
        horario: '14:00',
        duracaoMinutos: 30,
        nomeCliente: 'João Silva',
        telefoneCliente: '(11) 99999-9999',
        servicos: 'Corte',
        valorTotal: 50,
        statusPagamento: 'no_local',
        status: 'agendado',
        servicoIds: ['serv-1'],
      };

      const resultado = await service.criarAgendamento(dados);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('permission denied');
    });
  });
});