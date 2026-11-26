/**
 * Testes unitários para SupabaseNotificacoesService
 * Mocka o SDK @supabase/supabase-js
 * Cobertura: sucesso, erro, RLS (403), fallback mock
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Notificacao, TipoNotificacao } from '@/tipos';

// Mock do cliente Supabase - estrutura base
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
        in: vi.fn(() => ({
          single: vi.fn(),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
        limit: vi.fn(),
      })),
      in: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
        single: vi.fn(),
      })),
      order: vi.fn(() => ({
        limit: vi.fn(),
      })),
      limit: vi.fn(),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(),
      })),
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

describe('SupabaseNotificacoesService', () => {
  let service: any;

  const mockNotificacaoRow = {
    id: 'notif-123',
    destinatario_id: 'user@exemplo.com',
    tipo: 'agendamento',
    titulo: 'Agendamento confirmado',
    texto: 'Seu agendamento foi confirmado para amanhã às 10h.',
    lida: false,
    data_criacao: '2025-01-15T10:00:00Z',
    estabelecimento_id: 'est-123',
    agendamento_id: 'ag-456',
  };

  const mockNotificacoesRows = [
    mockNotificacaoRow,
    {
      ...mockNotificacaoRow,
      id: 'notif-456',
      tipo: 'mensagem',
      titulo: 'Nova mensagem',
      texto: 'Olá, tudo bem?',
      lida: true,
      data_criacao: '2025-01-14T15:30:00Z',
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockReset();
    mockSupabase.auth.getSession.mockReset();

    const module = await import('../SupabaseNotificacoesService');
    service = module.SupabaseNotificacoesService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // HELPER: Configura mock para select com eq -> order -> in -> limit
  // Ordem: eq('destinatario_id') -> order('data_criacao') -> in('tipo') -> limit(100)
  // ============================================================================
  function setupSelectMock(data: any, error: any = null) {
    const limitChain = {
      limit: vi.fn().mockResolvedValue({ data, error }),
    };
    const inChain = {
      limit: vi.fn().mockResolvedValue({ data, error }),
    };
    const orderChain = {
      in: vi.fn(() => inChain),
      limit: vi.fn().mockResolvedValue({ data, error }),
    };
    const eqChain = {
      order: vi.fn(() => orderChain),
      limit: vi.fn().mockResolvedValue({ data, error }),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    };
    const selectChain = {
      eq: vi.fn(() => eqChain),
      order: vi.fn(() => orderChain),
      limit: vi.fn(),
    };
    mockSupabase.from.mockReturnValue({ select: vi.fn(() => selectChain) });
  }

  // ============================================================================
  // TESTES: listarNotificacoes
  // ============================================================================

  describe('listarNotificacoes', () => {
    it('deve listar notificações com sucesso (sem filtro)', async () => {
      setupSelectMock(mockNotificacoesRows);

      const resultado = await service.listarNotificacoes('user@exemplo.com', 'todos');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toHaveLength(2);
      expect(resultado.dados?.[0].id).toBe('notif-123');
      expect(resultado.dados?.[0].tipo).toBe('agendamento');
      expect(resultado.dados?.[1].lida).toBe(true);
    });

    it('deve filtrar notificações de agendamentos', async () => {
      const agendamentosRows = mockNotificacoesRows.filter(n => ['agendamento', 'reagendamento', 'cancelamento'].includes(n.tipo));
      setupSelectMock(agendamentosRows);

      const resultado = await service.listarNotificacoes('user@exemplo.com', 'agendamentos');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toHaveLength(1);
      expect(resultado.dados?.[0].tipo).toBe('agendamento');
    });

    it('deve filtrar notificações de mensagens', async () => {
      const mensagensRows = mockNotificacoesRows.filter(n => ['mensagem', 'administracao', 'pagamento'].includes(n.tipo));
      setupSelectMock(mensagensRows);

      const resultado = await service.listarNotificacoes('user@exemplo.com', 'mensagens');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toHaveLength(1);
      expect(resultado.dados?.[0].tipo).toBe('mensagem');
    });

    it('deve retornar erro quando Supabase falha', async () => {
      setupSelectMock(null, { message: 'Erro de conexão' });

      const resultado = await service.listarNotificacoes('user@exemplo.com', 'todos');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro de conexão');
    });

    it('deve retornar array vazio quando não há notificações', async () => {
      setupSelectMock([]);

      const resultado = await service.listarNotificacoes('user@exemplo.com', 'todos');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toHaveLength(0);
    });
  });

  // ============================================================================
  // TESTES: marcarNotificacaoLida
  // ============================================================================

  describe('marcarNotificacaoLida', () => {
    it('deve marcar notificação como lida com sucesso', async () => {
      const eqChain = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const updateChain = {
        eq: vi.fn(() => eqChain),
      };
      mockSupabase.from.mockReturnValue({ update: vi.fn(() => updateChain) });

      const resultado = await service.marcarNotificacaoLida('notif-123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBeUndefined();
    });

    it('deve retornar erro quando Supabase falha', async () => {
      const errorResult = { error: { message: 'Erro ao atualizar' } };
      const updateChain = {
        eq: vi.fn(() => Promise.resolve(errorResult)),
      };
      mockSupabase.from.mockReturnValue({ update: vi.fn(() => updateChain) });

      const resultado = await service.marcarNotificacaoLida('notif-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao atualizar');
    });
  });

  // ============================================================================
  // TESTES: marcarTodasNotificacoesLidas
  // ============================================================================

  describe('marcarTodasNotificacoesLidas', () => {
    it('deve marcar todas como lidas com sucesso', async () => {
      const secondEq = vi.fn().mockResolvedValue({ error: null });
      const firstEq = vi.fn(() => ({ eq: secondEq }));
      const updateChain = {
        eq: firstEq,
      };
      mockSupabase.from.mockReturnValue({ update: vi.fn(() => updateChain) });

      const resultado = await service.marcarTodasNotificacoesLidas('user@exemplo.com');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBeUndefined();
    });

    it('deve retornar erro quando Supabase falha', async () => {
      const errorResult = { error: { message: 'Erro ao atualizar' } };
      const secondEq = vi.fn(() => Promise.resolve(errorResult));
      const firstEq = vi.fn(() => ({ eq: secondEq }));
      const updateChain = {
        eq: firstEq,
      };
      mockSupabase.from.mockReturnValue({ update: vi.fn(() => updateChain) });

      const resultado = await service.marcarTodasNotificacoesLidas('user@exemplo.com');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao atualizar');
    });
  });

  // ============================================================================
  // TESTES: excluirNotificacao
  // ============================================================================

  describe('excluirNotificacao', () => {
    it('deve excluir notificação com sucesso', async () => {
      const eqChain = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const deleteChain = {
        eq: vi.fn(() => eqChain),
      };
      mockSupabase.from.mockReturnValue({ delete: vi.fn(() => deleteChain) });

      const resultado = await service.excluirNotificacao('notif-123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBeUndefined();
    });

    it('deve retornar erro quando Supabase falha', async () => {
      const errorResult = { error: { message: 'Erro ao excluir' } };
      const deleteChain = {
        eq: vi.fn(() => Promise.resolve(errorResult)),
      };
      mockSupabase.from.mockReturnValue({ delete: vi.fn(() => deleteChain) });

      const resultado = await service.excluirNotificacao('notif-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao excluir');
    });
  });

  // ============================================================================
  // TESTES: excluirTodasLidas
  // ============================================================================

  describe('excluirTodasLidas', () => {
    it('deve excluir todas lidas com sucesso', async () => {
      const secondEq = vi.fn().mockResolvedValue({ error: null });
      const firstEq = vi.fn(() => ({ eq: secondEq }));
      const deleteChain = {
        eq: firstEq,
      };
      mockSupabase.from.mockReturnValue({ delete: vi.fn(() => deleteChain) });

      const resultado = await service.excluirTodasLidas('user@exemplo.com');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBeUndefined();
    });

    it('deve retornar erro quando Supabase falha', async () => {
      const errorResult = { error: { message: 'Erro ao excluir' } };
      const secondEq = vi.fn(() => Promise.resolve(errorResult));
      const firstEq = vi.fn(() => ({ eq: secondEq }));
      const deleteChain = {
        eq: firstEq,
      };
      mockSupabase.from.mockReturnValue({ delete: vi.fn(() => deleteChain) });

      const resultado = await service.excluirTodasLidas('user@exemplo.com');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao excluir');
    });
  });

  // ============================================================================
  // TESTES: enviarMensagemClientes
  // ============================================================================

  describe('enviarMensagemClientes', () => {
    function setupEnviarMensagemClientesMock(
      estabelecimentoNome: string | null,
      agendamentos: any[],
      usuarios: any[],
      notificacaoError: any = null
    ) {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'estabelecimentos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: estabelecimentoNome ? { nome: estabelecimentoNome } : null,
                  error: estabelecimentoNome ? null : { message: 'Erro ao buscar' },
                }),
              })),
            })),
          };
        }
        if (table === 'agendamentos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({ data: agendamentos, error: null }),
              })),
            })),
          };
        }
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({ data: usuarios, error: null }),
              })),
            })),
          };
        }
        if (table === 'notificacoes') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: [{ id: 'notif-new' }], error: notificacaoError })),
          };
        }
        return mockSupabase.from();
      });
    }

    it('deve enviar mensagem para todos clientes do estabelecimento', async () => {
      setupEnviarMensagemClientesMock(
        'Minha Barbearia',
        [{ usuario_id: 'cliente1@exemplo.com' }, { usuario_id: 'cliente2@exemplo.com' }],
        [{ email: 'cliente1@exemplo.com' }, { email: 'cliente2@exemplo.com' }]
      );

      const resultado = await service.enviarMensagemClientes('est-123', ['all'], 'Olá clientes!');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBe(2);
    });

    it('deve enviar mensagem para destinatários específicos', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'estabelecimentos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { nome: 'Minha Barbearia' }, error: null }),
              })),
            })),
          };
        }
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({ data: [{ email: 'cliente1@exemplo.com' }], error: null }),
            })),
          };
        }
        if (table === 'notificacoes') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: [{ id: 'notif-new' }], error: null })),
          };
        }
        return mockSupabase.from();
      });

      const resultado = await service.enviarMensagemClientes('est-123', ['cliente1@exemplo.com'], 'Olá!');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBe(1);
    });

    it('deve retornar 0 quando não há destinatários', async () => {
      setupEnviarMensagemClientesMock('Minha Barbearia', [], []);

      const resultado = await service.enviarMensagemClientes('est-123', ['all'], 'Olá!');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBe(0);
    });

    it('deve retornar erro quando falha ao buscar estabelecimento', async () => {
      setupEnviarMensagemClientesMock(null, [], []);

      const resultado = await service.enviarMensagemClientes('est-123', ['all'], 'Olá!');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao buscar');
    });
  });

  // ============================================================================
  // TESTES: enviarAvisoBarbeiros
  // ============================================================================

  describe('enviarAvisoBarbeiros', () => {
    function setupEnviarAvisoBarbeirosMock(
      barbeiros: any[],
      notificacaoError: any = null
    ) {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({ data: barbeiros, error: null }),
              })),
            })),
          };
        }
        if (table === 'notificacoes') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: [{ id: 'notif-new' }], error: notificacaoError })),
          };
        }
        return mockSupabase.from();
      });
    }

    it('deve enviar aviso para todos barbeiros', async () => {
      setupEnviarAvisoBarbeirosMock([
        { email: 'barbeiro1@exemplo.com' },
        { email: 'barbeiro2@exemplo.com' },
      ]);

      const resultado = await service.enviarAvisoBarbeiros(['all'], 'Aviso importante!');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBe(2);
    });

    it('deve enviar aviso para barbeiros de estabelecimentos específicos', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  select: vi.fn().mockResolvedValue({ data: [{ email: 'barbeiro1@exemplo.com' }], error: null }),
                })),
              })),
            })),
          };
        }
        if (table === 'notificacoes') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: [{ id: 'notif-new' }], error: null })),
          };
        }
        return mockSupabase.from();
      });

      const resultado = await service.enviarAvisoBarbeiros(['est-123'], 'Aviso!');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBe(1);
    });

    it('deve retornar 0 quando não há barbeiros', async () => {
      setupEnviarAvisoBarbeirosMock([]);

      const resultado = await service.enviarAvisoBarbeiros(['all'], 'Aviso!');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBe(0);
    });

    it('deve retornar erro quando falha ao buscar barbeiros', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({ data: [], error: { message: 'Erro ao buscar' } }),
              })),
            })),
          };
        }
        if (table === 'notificacoes') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: [{ id: 'notif-new' }], error: null })),
          };
        }
        return mockSupabase.from();
      });

      const resultado = await service.enviarAvisoBarbeiros(['all'], 'Aviso!');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao enviar avisos.');
    });
  });

  // ============================================================================
  // TESTES: Wrappers (alias)
  // ============================================================================

  describe('Wrappers (alias)', () => {
    it('marcarComoLida deve chamar marcarNotificacaoLida', async () => {
      const eqChain = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const updateChain = {
        eq: vi.fn(() => eqChain),
      };
      mockSupabase.from.mockReturnValue({ update: vi.fn(() => updateChain) });

      const resultado = await service.marcarComoLida('notif-123');

      expect(resultado.sucesso).toBe(true);
    });

    it('marcarTodasComoLidas deve chamar marcarTodasNotificacoesLidas', async () => {
      const eqChain = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const updateChain = {
        eq: vi.fn(() => eqChain),
      };
      mockSupabase.from.mockReturnValue({ update: vi.fn(() => updateChain) });

      const resultado = await service.marcarTodasComoLidas('user@exemplo.com');

      expect(resultado.sucesso).toBe(true);
    });

    it('excluir deve chamar excluirNotificacao', async () => {
      const eqChain = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const deleteChain = {
        eq: vi.fn(() => eqChain),
      };
      mockSupabase.from.mockReturnValue({ delete: vi.fn(() => deleteChain) });

      const resultado = await service.excluir('notif-123');

      expect(resultado.sucesso).toBe(true);
    });

    it('excluirTodasLidasWrapper deve chamar excluirTodasLidas', async () => {
      const eqChain = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const deleteChain = {
        eq: vi.fn(() => eqChain),
      };
      mockSupabase.from.mockReturnValue({ delete: vi.fn(() => deleteChain) });

      const resultado = await service.excluirTodasLidasWrapper('user@exemplo.com');

      expect(resultado.sucesso).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: Modo Mock (fallback quando VITE_SUPABASE_URL não definido)
  // ============================================================================

  describe('Modo Mock (fallback quando VITE_SUPABASE_URL não definido)', () => {
    it('deve delegar para API mock quando isMockMode() retorna true', async () => {
      const { isMockMode } = await import('../client');
      (isMockMode as any).mockReturnValue(true);

      vi.resetModules();
      const mockApi = {
        listarNotificacoes: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        marcarNotificacaoLida: vi.fn().mockResolvedValue({ sucesso: true, dados: undefined }),
        marcarTodasNotificacoesLidas: vi.fn().mockResolvedValue({ sucesso: true, dados: undefined }),
        excluirNotificacao: vi.fn().mockResolvedValue({ sucesso: true, dados: undefined }),
        excluirTodasLidas: vi.fn().mockResolvedValue({ sucesso: true, dados: undefined }),
        enviarMensagemClientes: vi.fn().mockResolvedValue({ sucesso: true, dados: 1 }),
        enviarAvisoBarbeiros: vi.fn().mockResolvedValue({ sucesso: true, dados: 1 }),
      };

      vi.doMock('@/servicos/api', () => mockApi);

      const { SupabaseNotificacoesService: mockService } = await import('../SupabaseNotificacoesService');

      await mockService.listarNotificacoes('user@exemplo.com', 'todos');
      await mockService.marcarNotificacaoLida('notif-123');
      await mockService.marcarTodasNotificacoesLidas('user@exemplo.com');
      await mockService.excluirNotificacao('notif-123');
      await mockService.excluirTodasLidas('user@exemplo.com');
      await mockService.enviarMensagemClientes('est-123', ['all'], 'teste');
      await mockService.enviarAvisoBarbeiros(['all'], 'teste');

      expect(mockApi.listarNotificacoes).toHaveBeenCalledWith('user@exemplo.com', 'todos');
      expect(mockApi.marcarNotificacaoLida).toHaveBeenCalledWith('notif-123');
      expect(mockApi.marcarTodasNotificacoesLidas).toHaveBeenCalledWith('user@exemplo.com');
      expect(mockApi.excluirNotificacao).toHaveBeenCalledWith('notif-123');
      expect(mockApi.excluirTodasLidas).toHaveBeenCalledWith('user@exemplo.com');
      expect(mockApi.enviarMensagemClientes).toHaveBeenCalledWith('est-123', ['all'], 'teste');
      expect(mockApi.enviarAvisoBarbeiros).toHaveBeenCalledWith(['all'], 'teste');
    });
  });

  // ============================================================================
  // TESTES: RLS / PERMISSÃO (HTTP 403)
  // ============================================================================

  describe('Erros de permissão RLS (HTTP 403)', () => {
    it('deve retornar erro quando RLS bloqueia listagem de notificações', async () => {
      setupSelectMock(null, { message: 'permission denied by row-level security policy', code: '42501' });

      const resultado = await service.listarNotificacoes('user@exemplo.com', 'todos');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('permission denied');
    });

    it('deve retornar erro quando RLS bloqueia marcação como lida', async () => {
      const errorResult = { error: { message: 'permission denied by row-level security policy', code: '42501' } };
      const updateChain = {
        eq: vi.fn(() => Promise.resolve(errorResult)),
      };
      mockSupabase.from.mockReturnValue({ update: vi.fn(() => updateChain) });

      const resultado = await service.marcarNotificacaoLida('notif-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('permission denied');
    });

    it('deve retornar erro quando RLS bloqueia exclusão de notificação', async () => {
      const errorResult = { error: { message: 'permission denied by row-level security policy', code: '42501' } };
      const deleteChain = {
        eq: vi.fn(() => Promise.resolve(errorResult)),
      };
      mockSupabase.from.mockReturnValue({ delete: vi.fn(() => deleteChain) });

      const resultado = await service.excluirNotificacao('notif-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('permission denied');
    });

    it('deve retornar erro quando RLS bloqueia envio de mensagem para clientes', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'estabelecimentos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { nome: 'Minha Barbearia' }, error: null }),
              })),
            })),
          };
        }
        if (table === 'agendamentos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({ data: [{ usuario_id: 'cliente1@exemplo.com' }], error: null }),
              })),
            })),
          };
        }
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({ data: [{ email: 'cliente1@exemplo.com' }], error: null }),
              })),
            })),
          };
        }
        if (table === 'notificacoes') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: null, error: { message: 'permission denied by row-level security policy', code: '42501' } })),
          };
        }
        return mockSupabase.from();
      });

      const resultado = await service.enviarMensagemClientes('est-123', ['all'], 'teste');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('permission denied');
    });

    it('deve retornar erro quando RLS bloqueia envio de aviso para barbeiros', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({ data: [{ email: 'barbeiro1@exemplo.com' }], error: null }),
              })),
            })),
          };
        }
        if (table === 'notificacoes') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: null, error: { message: 'permission denied by row-level security policy', code: '42501' } })),
          };
        }
        return mockSupabase.from();
      });

      const resultado = await service.enviarAvisoBarbeiros(['all'], 'teste');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('permission denied');
    });
  });
});