/**
 * Testes unitários para SupabaseBarbeiroService
 * Mocka o SDK @supabase/supabase-js
 * Cobertura: sucesso, conflito, RLS (403), fallback mock
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Agendamento } from '@/tipos';

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

// Mock do módulo client - isMockMode retorna false por padrão
vi.mock('../client', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  isMockMode: vi.fn(() => false),
  initSupabase: vi.fn(),
  enableMockMode: vi.fn(),
  resetSupabase: vi.fn(),
}));

describe('SupabaseBarbeiroService', () => {
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();
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

    const module = await import('../SupabaseBarbeiroService');
    service = module.SupabaseBarbeiroService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // HELPERS
  // ============================================================================

  const mockAgendamentoRow = {
    id: 'ag-1',
    estabelecimento_id: 'est-123',
    usuario_id: 'user-1',
    dia: '2025-01-15',
    horario: '14:00',
    duracao_min: 30,
    nome_cliente: 'Cliente 1',
    telefone_cliente: '(11) 99999-9999',
    servicos: 'Corte',
    valor_total_centavos: 5000,
    status_pagamento: 'pago',
    status: 'concluido',
    servico_ids: ['serv-1'],
    observacoes: '',
    avaliacao_estrelas: 5,
    avaliacao_comentario: 'Ótimo!',
    avaliacao_data: '2025-01-15',
  };

  const mockAgendamentoRow2 = {
    ...mockAgendamentoRow,
    id: 'ag-2',
    dia: '2025-01-16',
    horario: '10:00',
    valor_total_centavos: 8000,
    servico_ids: ['serv-1', 'serv-2'],
    avaliacao_estrelas: null,
  };

  function setupAuthBarbeiro(estabelecimentoId = 'est-123') {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-barbeiro' } }, error: null });

    const perfilChain = {
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { estabelecimento_id: estabelecimentoId, papel: 'barbeiro' }, error: null }),
      })),
    };
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'usuarios') return { select: vi.fn(() => perfilChain) };
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
    });
  }

  function setupAuthNaoAutorizado(papel = 'cliente', estabelecimentoId = null) {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-cliente' } }, error: null });

    const perfilChain = {
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { estabelecimento_id: estabelecimentoId, papel }, error: null }),
      })),
    };
    mockSupabase.from.mockReturnValue({ select: vi.fn(() => perfilChain) });
  }

  function makeChain(returnData: any, returnError: any = null) {
    const promise = Promise.resolve({ data: returnData, error: returnError });
    const chain: any = {
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      range: vi.fn(() => chain),
      single: vi.fn(() => promise),
      maybeSingle: vi.fn(() => promise),
      select: vi.fn(() => chain),
      then: vi.fn((onFulfilled) => promise.then(onFulfilled)),
      catch: vi.fn((onRejected) => promise.catch(onRejected)),
    };
    chain[Symbol.toStringTag] = 'Object';
    return chain;
  }

  function setupFullMock(returnData: any = [mockAgendamentoRow, mockAgendamentoRow2], returnError: any = null) {
    const agendamentosChain = makeChain(returnData, returnError);
    const estabelecimentoChain = makeChain({ avaliacao: 4.8 });
    const servicosChain = makeChain([{ id: 'serv-1', nome: 'Corte' }, { id: 'serv-2', nome: 'Barba' }]);
    const perfilChain = makeChain({ estabelecimento_id: 'est-123', papel: 'barbeiro' });

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-barbeiro' } }, error: null });
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'v_agendamentos_detalhados') return { select: vi.fn(() => agendamentosChain) };
      if (table === 'estabelecimentos') return { select: vi.fn(() => estabelecimentoChain) };
      if (table === 'servicos') return { select: vi.fn(() => servicosChain) };
      if (table === 'usuarios') return { select: vi.fn(() => perfilChain) };
      return { select: vi.fn(() => makeChain(null)) };
    });
  }

  // Helper to get today's date in YYYY-MM-DD format
  const hoje = new Date().toISOString().split('T')[0];
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const amanhaStr = amanha.toISOString().split('T')[0];

  // ============================================================================
  // TESTES: obterDashboardBarbeiro
  // ============================================================================

  describe('obterDashboardBarbeiro', () => {
    it('deve retornar dashboard completo do barbeiro', async () => {
      setupAuthBarbeiro();
      setupFullMock();

      const resultado = await service.obterDashboardBarbeiro();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toEqual(
        expect.objectContaining({
          agendamentosHoje: expect.any(Number),
          agendamentosSemana: expect.any(Number),
          faturamentoMes: expect.any(Number),
          avaliacaoMedia: expect.any(Number),
          filaAtual: 0,
          proximosAgendamentos: expect.any(Array),
        })
      );
    });

    it('deve calcular agendamentos de hoje corretamente', async () => {
      setupAuthBarbeiro();
      setupFullMock([
        { ...mockAgendamentoRow, dia: hoje },
        { ...mockAgendamentoRow2, dia: amanhaStr },
      ]);

      const resultado = await service.obterDashboardBarbeiro();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados.agendamentosHoje).toBe(1);
      expect(resultado.dados.agendamentosSemana).toBe(2);
    });

    it('deve calcular faturamento do mês apenas pagamentos "pago"', async () => {
      setupAuthBarbeiro();
      setupFullMock([
        { ...mockAgendamentoRow, dia: hoje, valor_total_centavos: 5000, status_pagamento: 'pago' },
        { ...mockAgendamentoRow2, dia: hoje, valor_total_centavos: 8000, status_pagamento: 'no_local' }, // não conta
      ]);

      const resultado = await service.obterDashboardBarbeiro();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados.faturamentoMes).toBe(50); // apenas o pago (5000 centavos = 50 reais)
    });

    it('deve retornar erro quando não autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const resultado = await service.obterDashboardBarbeiro();

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Não autenticado.');
    });

    it('deve retornar erro quando usuário não é barbeiro', async () => {
      setupAuthNaoAutorizado('cliente');

      const resultado = await service.obterDashboardBarbeiro();

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Não autorizado.');
    });

    it('deve retornar erro quando barbeiro não tem estabelecimento', async () => {
      setupAuthNaoAutorizado('barbeiro', null);

      const resultado = await service.obterDashboardBarbeiro();

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Não autorizado.');
    });
  });

  // ============================================================================
  // TESTES: obterEstatisticasBarbeiro
  // ============================================================================

  describe('obterEstatisticasBarbeiro', () => {
    it('deve retornar estatísticas completas do barbeiro', async () => {
      setupFullMock([
        mockAgendamentoRow,
        mockAgendamentoRow2,
        { ...mockAgendamentoRow, id: 'ag-3', servico_ids: ['serv-1'] },
      ]);

      const resultado = await service.obterEstatisticasBarbeiro();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toEqual(
        expect.objectContaining({
          totalAgendamentos: expect.any(Number),
          totalClientes: expect.any(Number),
          faturamentoTotal: expect.any(Number),
          servicosMaisProcurados: expect.any(Array),
        })
      );
    });

    it('deve contar serviços mais procurados corretamente', async () => {
      setupFullMock([
        { ...mockAgendamentoRow, servico_ids: ['serv-1'] },
        { ...mockAgendamentoRow2, servico_ids: ['serv-1', 'serv-2'] },
        { ...mockAgendamentoRow, id: 'ag-3', servico_ids: ['serv-2'] },
        { ...mockAgendamentoRow, id: 'ag-4', servico_ids: ['serv-1'] },
      ]);

      const resultado = await service.obterEstatisticasBarbeiro();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados.servicosMaisProcurados).toHaveLength(2);
      // serv-1 aparece 3 vezes, serv-2 aparece 2 vezes
      expect(resultado.dados.servicosMaisProcurados[0].nome).toBe('Corte');
      expect(resultado.dados.servicosMaisProcurados[0].quantidade).toBe(3);
      expect(resultado.dados.servicosMaisProcurados[1].nome).toBe('Barba');
      expect(resultado.dados.servicosMaisProcurados[1].quantidade).toBe(2);
    });

    it('deve calcular faturamento total apenas pagamentos "pago"', async () => {
      setupFullMock([
        { ...mockAgendamentoRow, valor_total_centavos: 5000, status_pagamento: 'pago' },
        { ...mockAgendamentoRow2, valor_total_centavos: 8000, status_pagamento: 'pago' },
        { ...mockAgendamentoRow, id: 'ag-3', valor_total_centavos: 3000, status_pagamento: 'no_local' },
      ]);

      const resultado = await service.obterEstatisticasBarbeiro();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados.faturamentoTotal).toBe(130); // 50 + 80 = 130 reais
    });
  });

  // ============================================================================
  // TESTES: RLS / PERMISSÃO (HTTP 403)
  // ============================================================================

  describe('Erros de permissão RLS (HTTP 403)', () => {
    it('deve retornar erro genérico quando RLS bloqueia busca de agendamentos (catch block)', async () => {
      setupAuthBarbeiro();

      const chain = makeChain(null, { message: 'permission denied by row-level security policy', code: '42501' });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'v_agendamentos_detalhados') return { select: vi.fn(() => chain) };
        if (table === 'usuarios') return { select: vi.fn(() => makeChain({ estabelecimento_id: 'est-123', papel: 'barbeiro' })) };
        return { select: vi.fn(() => makeChain(null)) };
      });

      const resultado = await service.obterDashboardBarbeiro();

      // O serviço captura o erro no catch e retorna mensagem genérica
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao buscar dashboard.');
    });
  });
});