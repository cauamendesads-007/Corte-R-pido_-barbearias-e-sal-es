/**
 * Testes unitários para SupabaseAgendamentosService
 * Mocka o SDK @supabase/supabase-js
 * Cobertura: sucesso, conflito (409/23P01), RLS (403), fallback mock
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Agendamento, StatusPagamento, StatusAgendamento } from '@/tipos';

// ============================================================================
// FACTORY PARA CRIAR MOCKS FRESCOS POR TESTE
// ============================================================================

function createMockSupabase() {
  const tableMocks: Record<string, any> = {};

  // Armazena dados de retorno configurados por tabela
  const selectReturnData: Record<string, any> = {};
  const selectErrorData: Record<string, any> = {};

  function createMockChain(tableName: string) {
    const chain: any = {
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      range: vi.fn(() => chain),
      single: vi.fn(() => {
        // single() modifica o retorno para um único objeto
        chain._isSingle = true;
        return chain;
      }),
      maybeSingle: vi.fn(() => {
        chain._isMaybeSingle = true;
        return chain;
      }),
      select: vi.fn(() => chain),
      then(onFulfilled: any) {
        // Quando await é chamado na chain, retorna os dados configurados
        const data = selectReturnData[tableName];
        const error = selectErrorData[tableName];

        if (error) {
          return Promise.resolve({ data: null, error }).then(onFulfilled);
        }

        // Se single() foi chamado, retorna o primeiro item ou null
        if (chain._isSingle) {
          return Promise.resolve({
            data: Array.isArray(data) ? data[0] : data,
            error: null
          }).then(onFulfilled);
        }

        // Se maybeSingle() foi chamado, retorna o primeiro item ou null
        if (chain._isMaybeSingle) {
          return Promise.resolve({
            data: Array.isArray(data) && data.length > 0 ? data[0] : (data || null),
            error: null
          }).then(onFulfilled);
        }

        // Retorno padrão: array de dados
        return Promise.resolve({ data: data || [], error: null }).then(onFulfilled);
      },
      catch(onRejected: any) {
        const error = selectErrorData[tableName];
        if (error) {
          return Promise.resolve({ data: null, error }).catch(onRejected);
        }
        return Promise.resolve({ data: selectReturnData[tableName] || [], error: null }).catch(onRejected);
      },
      _isSingle: false,
      _isMaybeSingle: false,
    };
    return chain;
  }

  function createUpdateChain() {
    return {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
  }

  function createInsertChain() {
    return {
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    };
  }

  function getOrCreateTableMock(tableName: string) {
    if (!tableMocks[tableName]) {
      const selectChain = createMockChain(tableName);
      const updateChain = createUpdateChain();
      const insertChain = createInsertChain();
      const deleteChain = { eq: vi.fn().mockResolvedValue({ error: null }) };

      tableMocks[tableName] = {
        select: vi.fn(() => selectChain),
        insert: vi.fn(() => insertChain),
        update: vi.fn(() => updateChain),
        delete: vi.fn(() => deleteChain),
        _selectChain: selectChain,
        _updateChain: updateChain,
        _insertChain: insertChain,
        _deleteChain: deleteChain,
      };
    }
    return tableMocks[tableName];
  }

  return {
    tableMocks,
    selectReturnData,
    selectErrorData,
    getOrCreateTableMock,
    from: vi.fn((table: string) => getOrCreateTableMock(table)),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      admin: { deleteUser: vi.fn() },
    },
    functions: { invoke: vi.fn() },
    storage: { from: vi.fn(() => ({ upload: vi.fn(), download: vi.fn(), getPublicUrl: vi.fn(), remove: vi.fn() })) },
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })), subscribe: vi.fn(), unsubscribe: vi.fn() })),
    removeChannel: vi.fn(),
  };
}

// ============================================================================
// HELPERS DE DADOS
// ============================================================================

const mockAgendamentoData = {
  id: 'agendamento-123',
  estabelecimento_id: 'est-123',
  usuario_id: 'user-123',
  profissional_id: 'prof-123',
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

// ============================================================================
// TESTES
// ============================================================================

describe('SupabaseAgendamentosService', () => {
  let service: any;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(async () => {
    vi.resetModules();
    mockSupabase = createMockSupabase();

    vi.doMock('../client', () => ({
      getSupabase: vi.fn(() => mockSupabase),
      isMockMode: vi.fn(() => false),
      initSupabase: vi.fn(),
      enableMockMode: vi.fn(),
      resetSupabase: vi.fn(),
    }));

    const module = await import('../SupabaseAgendamentosService');
    service = module.SupabaseAgendamentosService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // HELPERS POR TESTE
  // ============================================================================

  function setSelectReturn(tableName: string, returnData: any) {
    mockSupabase.selectReturnData[tableName] = returnData;
    mockSupabase.selectErrorData[tableName] = null;
  }

  function setSelectError(tableName: string, error: any) {
    mockSupabase.selectErrorData[tableName] = error;
    mockSupabase.selectReturnData[tableName] = null;
  }

  function setUpdateReturn(tableName: string, error: any = null) {
    const mock = mockSupabase.getOrCreateTableMock(tableName);
    mock._updateChain.eq.mockResolvedValue({ error });
  }

  function setSelectChainFn(tableName: string, chain: any) {
    const mock = mockSupabase.getOrCreateTableMock(tableName);
    mock.select.mockReturnValue(chain);
  }

  function createMockChain(tableName: string) {
    const chain: any = {
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      range: vi.fn(() => chain),
      single: vi.fn(() => chain),
      maybeSingle: vi.fn(() => chain),
      select: vi.fn(() => chain),
      then(onFulfilled: any) {
        const data = mockSupabase.selectReturnData[tableName];
        const error = mockSupabase.selectErrorData[tableName];
        if (error) {
          return Promise.resolve({ data: null, error }).then(onFulfilled);
        }
        return Promise.resolve({ data: data || [], error: null }).then(onFulfilled);
      },
      catch(onRejected: any) {
        const error = mockSupabase.selectErrorData[tableName];
        if (error) {
          return Promise.resolve({ data: null, error }).catch(onRejected);
        }
        return Promise.resolve({ data: mockSupabase.selectReturnData[tableName] || [], error: null }).catch(onRejected);
      },
    };
    return chain;
  }

  // ============================================================================
  // TESTES: listarAgendamentosEstabelecimento
  // ============================================================================

  describe('listarAgendamentosEstabelecimento', () => {
    it('deve retornar lista de agendamentos com sucesso', async () => {
      setSelectReturn('v_agendamentos_detalhados', [mockVRow, { ...mockVRow, id: 'agendamento-456', horario: '15:00' }]);

      const resultado = await service.listarAgendamentosEstabelecimento('est-123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toHaveLength(2);
      expect(resultado.dados?.[0].id).toBe('agendamento-123');
      expect(resultado.dados?.[0].valorTotal).toBe(80);
      expect(resultado.dados?.[0].servicoIds).toEqual(['serv-1', 'serv-2']);
    });

    it('deve retornar array vazio quando não há agendamentos', async () => {
      setSelectReturn('v_agendamentos_detalhados', []);

      const resultado = await service.listarAgendamentosEstabelecimento('est-123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toEqual([]);
    });

    it('deve retornar erro quando Supabase falha', async () => {
      setSelectError('v_agendamentos_detalhados', { message: 'Erro de conexão' });

      const resultado = await service.listarAgendamentosEstabelecimento('est-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao buscar agendamentos.');
    });
  });

  // ============================================================================
  // TESTES: listarAgendamentosCliente
  // ============================================================================

  describe('listarAgendamentosCliente', () => {
    it('deve retornar agendamentos do cliente com sucesso', async () => {
      setSelectReturn('v_agendamentos_detalhados', [mockVRow]);

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
      setSelectReturn('v_agendamentos_detalhados', mockVRow);

      const resultado = await service.obterAgendamento('agendamento-123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).not.toBeNull();
      expect(resultado.dados?.id).toBe('agendamento-123');
    });

    it('deve retornar null quando agendamento não encontrado', async () => {
      setSelectReturn('v_agendamentos_detalhados', null);

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
      const profChain = createMockChain('profissionais');
      mockSupabase.selectReturnData['profissionais'] = [{ id: 'prof-1' }, { id: 'prof-2' }];
      setSelectChainFn('profissionais', profChain);

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [{ horario: '09:00', disponivel: true }, { horario: '10:00', disponivel: false }], error: null })
        .mockResolvedValueOnce({ data: [{ horario: '09:00', disponivel: false }, { horario: '11:00', disponivel: true }], error: null });

      const resultado = await service.obterHorariosDisponiveis('est-123', '2025-01-15', 30);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toHaveLength(3);
      expect(resultado.dados?.map(s => s.horario)).toEqual(['09:00', '10:00', '11:00']);
    });

    it('deve retornar array vazio quando não há profissionais ativos', async () => {
      const profChain = createMockChain('profissionais');
      mockSupabase.selectReturnData['profissionais'] = [];
      setSelectChainFn('profissionais', profChain);

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
      mockSupabase.rpc.mockResolvedValue({ data: [{ agendamento_id: 'novo-agendamento-123', erro: null }], error: null });

      setSelectReturn('v_agendamentos_detalhados', { ...mockVRow, id: 'novo-agendamento-123' });

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
      expect(resultado.erro).toBe('Erro ao criar agendamento.');
    });
  });

  // ============================================================================
  // TESTES: reagendarAgendamento - CONFLITO
  // ============================================================================

  describe('reagendarAgendamento - conflito', () => {
    it('deve retornar erro 409 ao tentar reagendar para horário ocupado', async () => {
      const selectChain = createMockChain('agendamentos');
      mockSupabase.selectReturnData['agendamentos'] = mockAgendamentoData;
      setSelectChainFn('agendamentos', selectChain);

      setUpdateReturn('agendamentos', null);

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: '23P01', message: 'conflito' },
      });

      setSelectReturn('v_agendamentos_detalhados', mockVRow);

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
      setUpdateReturn('agendamentos', null);

      const resultado = await service.cancelarAgendamento('agendamento-123');

      expect(resultado.sucesso).toBe(true);
    });

    it('deve retornar erro quando Supabase falha', async () => {
      setUpdateReturn('agendamentos', { message: 'Erro ao cancelar' });

      const resultado = await service.cancelarAgendamento('agendamento-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao cancelar agendamento.');
    });
  });

  // ============================================================================
  // TESTES: confirmarPresenca
  // ============================================================================

  describe('confirmarPresenca', () => {
    it('deve confirmar presença com sucesso', async () => {
      setUpdateReturn('agendamentos', null);

      const resultado = await service.confirmarPresenca('agendamento-123');

      expect(resultado.sucesso).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: avaliarAgendamento
  // ============================================================================

  describe('avaliarAgendamento', () => {
    it('deve avaliar agendamento e atualizar média do estabelecimento', async () => {
      setUpdateReturn('agendamentos', null);

      const agendamentosSelectChain = createMockChain('agendamentos');
      mockSupabase.selectReturnData['agendamentos'] = { estabelecimento_id: 'est-123', nome_cliente: 'João' };
      setSelectChainFn('agendamentos', agendamentosSelectChain);

      mockSupabase.getOrCreateTableMock('avaliacoes')._insertChain.select.mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const avaliacoesSelectChain = createMockChain('avaliacoes');
      mockSupabase.selectReturnData['avaliacoes'] = [{ estrelas: 5 }, { estrelas: 4 }];
      setSelectChainFn('avaliacoes', avaliacoesSelectChain);

      setUpdateReturn('estabelecimentos', null);

      const resultado = await service.avaliarAgendamento('agendamento-123', 5, 'Excelente!');

      expect(resultado.sucesso).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: atualizarStatus
  // ============================================================================

  describe('atualizarStatus', () => {
    it('deve atualizar status com sucesso', async () => {
      setUpdateReturn('agendamentos', null);

      const resultado = await service.atualizarStatus('agendamento-123', 'confirmado');

      expect(resultado.sucesso).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: definirHorarioReal
  // ============================================================================

  describe('definirHorarioReal', () => {
    it('deve definir horário real e marcar como concluído', async () => {
      setUpdateReturn('agendamentos', null);

      const resultado = await service.definirHorarioReal('agendamento-123', '14:15');

      expect(resultado.sucesso).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: confirmarPagamentoPix
  // ============================================================================

  describe('confirmarPagamentoPix', () => {
    it('deve confirmar pagamento Pix com sucesso', async () => {
      setUpdateReturn('agendamentos', null);

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
      const mockSupabaseMock = createMockSupabase();
      vi.doMock('../client', () => ({
        getSupabase: vi.fn(() => mockSupabaseMock),
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
      setSelectError('v_agendamentos_detalhados', { message: 'row-level security policy violation', code: '42501' });

      const resultado = await service.listarAgendamentosEstabelecimento('est-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao buscar agendamentos.');
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
      expect(resultado.erro).toBe('Erro ao criar agendamento.');
    });
  });
});