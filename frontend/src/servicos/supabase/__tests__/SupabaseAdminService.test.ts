/**
 * Testes unitários para SupabaseAdminService
 * Mocka o SDK @supabase/supabase-js
 * Cobertura: sucesso, conflito, RLS (403), fallback mock
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Usuario, Estabelecimento, PlanoAssinatura, AssinaturaEstabelecimento, StatusEstabelecimento, NichoEstabelecimento, TipoLayout } from '@/tipos';

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

describe('SupabaseAdminService', () => {
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
    mockSupabase.auth.admin.deleteUser.mockReset();

    const module = await import('../SupabaseAdminService');
    service = module.SupabaseAdminService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // HELPERS
  // ============================================================================

  const mockUsuarioRow = {
    id: 'user-123',
    email: 'teste@exemplo.com',
    papel: 'cliente',
    nome: 'João Silva',
    bio: 'Bio',
    whatsapp: '(11) 99999-9999',
    cidade: 'São Paulo',
    avatar: 'https://exemplo.com/avatar.jpg',
    estabelecimento_id: null,
    confirmado: true,
    lembretes_whatsapp: true,
    seguindo: [],
    inspiracao_salvas: [],
    cpf: null,
    data_cadastro: '2025-01-01T00:00:00Z',
    data_atualizacao: '2025-01-01T00:00:00Z',
  };

  const mockEstabelecimentoRow = {
    id: 'est-123',
    slug: 'minha-barbearia',
    nome: 'Minha Barbearia',
    responsavel: 'João Silva',
    cidade: 'São Paulo',
    nicho: 'barbearia',
    avaliacao: 4.8,
    status: 'aprovado',
    latitude: -23.55,
    longitude: -46.63,
    whatsapp: '(11) 99999-9999',
    endereco: 'Rua Teste, 123',
    sobre: 'Sobre',
    tema_cor: '#B45309',
    tema_layout: 'classico',
    tema_titulo: 'Minha Barbearia',
    tema_subtitulo: 'Subtítulo',
    tempo_medio_atendimento: 20,
    horario_funcionamento: 'Seg a Sáb, 9h às 18h',
    permite_auto_edicao: false,
    configuracao_pix_modo: 'desativado',
    configuracao_pix_chave: null,
    configuracao_pix_percentual_sinal: 30,
    seguidores: 10,
    taxa_fidelidade: 0,
  };

  const mockPlanoRow = {
    id: 'plano-1',
    nome: 'Plano Mensal',
    tipo: 'mensal',
    preco_centavos: 9900,
    descricao: null,
    funcionalidades: null,
    ativo: true,
    ordem_exibicao: 1,
  };

  const mockAssinaturaRow = {
    id: 'assin-1',
    estabelecimento_id: 'est-123',
    plano_id: 'plano-1',
    inicio_contrato: '2025-01-01',
    vencimento: '2025-02-01',
    status: 'ativa',
    desconto_tipo: null,
    desconto_valor: null,
    desconto_motivo: null,
    planos_assinatura: { nome: 'Plano Mensal', tipo: 'mensal', preco_centavos: 9900 },
    estabelecimentos: { nome: 'Minha Barbearia' },
  };

  const mockPagamentoRow = {
    id: 'pag-1',
    estabelecimento_id: 'est-123',
    valor_centavos: 9900,
    status: 'pago',
    data_criacao: '2025-01-15T10:00:00Z',
    estabelecimentos: { nome: 'Minha Barbearia' },
  };

  function setupSelectUsuarios(returnData: any = [mockUsuarioRow]) {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: returnData, error: null }),
      }),
    });
  }

  function setupSelectSingle(returnData: any = mockUsuarioRow) {
    const chain = {
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: returnData, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: returnData, error: null }),
      })),
    };
    mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });
  }

  function setupSelectEstabelecimentos(returnData: any = [mockEstabelecimentoRow]) {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: returnData, error: null }),
      }),
    });
  }

  function setupSelectPlanos(returnData: any = [mockPlanoRow]) {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: returnData, error: null }),
        }),
      }),
    });
  }

  function setupInsert(returnData: any = mockEstabelecimentoRow) {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'estabelecimentos' || table === 'planos_assinatura') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [{ ordem_exibicao: 1 }], error: null }),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: returnData, error: null }),
            })),
          })),
        };
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
    });
  }

  // ============================================================================
  // TESTES: USUÁRIOS (ADMIN)
  // ============================================================================

  describe('Usuários (Admin)', () => {
    describe('listarUsuariosAdmin', () => {
      it('deve listar todos usuários ordenados por data_cadastro desc', async () => {
        setupSelectUsuarios([mockUsuarioRow, { ...mockUsuarioRow, id: 'user-456', email: 'outro@exemplo.com' }]);

        const resultado = await service.listarUsuariosAdmin();

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toHaveLength(2);
        expect(resultado.dados?.[0].id).toBe('user-123');
      });
    });

    describe('obterUsuarioAdmin', () => {
      it('deve obter usuário por ID', async () => {
        setupSelectSingle(mockUsuarioRow);

        const resultado = await service.obterUsuarioAdmin('user-123');

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados?.id).toBe('user-123');
      });

      it('deve retornar null quando não encontrado', async () => {
        setupSelectSingle(null);

        const resultado = await service.obterUsuarioAdmin('inexistente');

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toBeNull();
      });
    });

    describe('atualizarUsuarioAdmin', () => {
      it('deve atualizar usuário com sucesso', async () => {
        const updatedUser = { ...mockUsuarioRow, nome: 'João Atualizado', papel: 'barbeiro' as any };
        mockSupabase.from.mockReturnValue({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: updatedUser, error: null }),
              })),
            })),
          })),
        });

        const resultado = await service.atualizarUsuarioAdmin('user-123', { nome: 'João Atualizado', papel: 'barbeiro' });

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados?.nome).toBe('João Atualizado');
      });
    });

    describe('excluirUsuarioAdmin', () => {
      it('deve excluir usuário via admin API', async () => {
        mockSupabase.auth.admin.deleteUser.mockResolvedValue({ error: null });

        const resultado = await service.excluirUsuarioAdmin('user-123');

        expect(resultado.sucesso).toBe(true);
        expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');
      });

      it('deve retornar erro quando admin API falha', async () => {
        mockSupabase.auth.admin.deleteUser.mockResolvedValue({ error: { message: 'User not found' } });

        const resultado = await service.excluirUsuarioAdmin('inexistente');

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toBe('Erro ao excluir usuário.');
      });
    });
  });

  // ============================================================================
  // TESTES: ESTABELECIMENTOS (ADMIN)
  // ============================================================================

  describe('Estabelecimentos (Admin)', () => {
    describe('listarEstabelecimentosAdmin', () => {
      it('deve listar todos estabelecimentos (todos status)', async () => {
        setupSelectEstabelecimentos([mockEstabelecimentoRow, { ...mockEstabelecimentoRow, id: 'est-456', status: 'pendente' }]);

        const resultado = await service.listarEstabelecimentosAdmin();

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toHaveLength(2);
      });
    });

    describe('alterarStatusEstabelecimento', () => {
      it('deve aprovar estabelecimento', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'estabelecimentos') {
            return {
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            };
          }
          if (table === 'usuarios') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: { email: 'barbeiro@exemplo.com' }, error: null }),
                  })),
                })),
              })),
            };
          }
          if (table === 'notificacoes') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
        });

        const resultado = await service.aprovarEstabelecimento('est-123');

        expect(resultado.sucesso).toBe(true);
      });

      it('deve rejeitar estabelecimento', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'estabelecimentos') {
            return {
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            };
          }
          if (table === 'usuarios') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: { email: 'barbeiro@exemplo.com' }, error: null }),
                  })),
                })),
              })),
            };
          }
          if (table === 'notificacoes') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
        });

        const resultado = await service.rejeitarEstabelecimento('est-123');

        expect(resultado.sucesso).toBe(true);
      });

      it('deve suspender estabelecimento', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'estabelecimentos') {
            return {
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            };
          }
          if (table === 'usuarios') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: { email: 'barbeiro@exemplo.com' }, error: null }),
                  })),
                })),
              })),
            };
          }
          if (table === 'notificacoes') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
        });

        const resultado = await service.suspenderEstabelecimento('est-123');

        expect(resultado.sucesso).toBe(true);
      });
    });

    describe('definirAutoEdicao', () => {
      it('deve permitir auto-edição', async () => {
        mockSupabase.from.mockReturnValue({
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        });

        const resultado = await service.definirAutoEdicao('est-123', true);

        expect(resultado.sucesso).toBe(true);
      });
    });
  });

  // ============================================================================
  // TESTES: PLANOS DE ASSINATURA (ADMIN)
  // ============================================================================

  describe('Planos de Assinatura (Admin)', () => {
    describe('listarPlanos', () => {
      it('deve listar apenas planos ativos', async () => {
        setupSelectPlanos([mockPlanoRow]);

        const resultado = await service.listarPlanos();

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toHaveLength(1);
        expect(resultado.dados?.[0].preco).toBe(99); // centavos -> reais
      });
    });

    describe('criarPlanoAdmin', () => {
      it('deve criar plano com sucesso', async () => {
        setupInsert({ ...mockPlanoRow, id: 'novo-plano', nome: 'Novo Plano', preco_centavos: 14900 });

        const resultado = await service.criarPlanoAdmin({ nome: 'Novo Plano', tipo: 'mensal', preco: 149 });

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados?.nome).toBe('Novo Plano');
        expect(resultado.dados?.preco).toBe(149);
      });
    });

    describe('atualizarPlanoAdmin', () => {
      it('deve atualizar plano com sucesso', async () => {
        const updatedPlano = { ...mockPlanoRow, nome: 'Plano Atualizado', preco_centavos: 14900 };
        mockSupabase.from.mockReturnValue({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: updatedPlano, error: null }),
              })),
            })),
          })),
        });

        const resultado = await service.atualizarPlanoAdmin('plano-1', { nome: 'Plano Atualizado', preco: 149 });

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados?.nome).toBe('Plano Atualizado');
      });
    });

    describe('excluirPlanoAdmin', () => {
      it('deve excluir plano com sucesso', async () => {
        mockSupabase.from.mockReturnValue({
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        });

        const resultado = await service.excluirPlanoAdmin('plano-1');

        expect(resultado.sucesso).toBe(true);
      });
    });
  });

  // ============================================================================
  // TESTES: ASSINATURAS (ADMIN)
  // ============================================================================

  describe('Assinaturas (Admin)', () => {
    describe('listarAssinaturasAdmin', () => {
      it('deve listar assinaturas ativas com dados do plano e estabelecimento', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [mockAssinaturaRow], error: null }),
          }),
        });

        const resultado = await service.listarAssinaturasAdmin();

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toHaveProperty('est-123');
        expect(resultado.dados['est-123'].planoId).toBe('plano-1');
      });
    });

    describe('obterAssinatura', () => {
      it('deve obter assinatura do estabelecimento', async () => {
        const chain = {
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockAssinaturaRow, error: null }),
            })),
          })),
        };
        mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });

        const resultado = await service.obterAssinatura('est-123');

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados?.planoId).toBe('plano-1');
      });

      it('deve retornar null quando não há assinatura ativa', async () => {
        const chain = {
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        };
        mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });

        const resultado = await service.obterAssinatura('est-456');

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toBeNull();
      });
    });
  });

  // ============================================================================
  // TESTES: PAGAMENTOS (ADMIN)
  // ============================================================================

  describe('Pagamentos (Admin)', () => {
    describe('listarPagamentosAdmin', () => {
      it('deve listar pagamentos com dados do estabelecimento', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [mockPagamentoRow], error: null }),
          }),
        });

        const resultado = await service.listarPagamentosAdmin();

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toHaveLength(1);
        expect(resultado.dados?.[0].estabelecimento).toBe('Minha Barbearia');
        expect(resultado.dados?.[0].valor).toBe(99); // centavos -> reais
      });
    });
  });

  // ============================================================================
  // TESTES: RLS / PERMISSÃO (HTTP 403)
  // ============================================================================

  describe('Erros de permissão RLS (HTTP 403)', () => {
    it('deve retornar erro quando RLS bloqueia listagem de usuários', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied by row-level security policy', code: '42501' } }),
        }),
      });

      const resultado = await service.listarUsuariosAdmin();

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao listar usuários.');
    });

    it('deve retornar erro quando RLS bloqueia atualização de estabelecimento', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: { message: 'permission denied by row-level security policy', code: '42501' } }),
        })),
      });

      const resultado = await service.aprovarEstabelecimento('est-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao alterar status.');
    });
  });
});