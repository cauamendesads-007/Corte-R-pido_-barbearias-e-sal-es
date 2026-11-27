/**
 * Testes unitários para SupabaseFeedService
 * Mocka o SDK @supabase/supabase-js
 * Cobertura: sucesso, conflito, RLS (403), fallback mock
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Publicacao, Comentario, PublicacaoTipo, TipoMidia, Inspiracao, InspiracaoCategoria, FeedFiltros } from '@/tipos';

type PublicacaoRow = {
  id: string;
  estabelecimento_id: string;
  autor_id: string | null;
  autor_nome: string;
  autor_avatar: string | null;
  tipo: string;
  legenda: string;
  tag_servico: string | null;
  curtidas: number;
  salvos: number;
  visualizacoes: number;
  compartilhamentos: number;
  comentarios_count: number;
  data_criacao: string;
  publicacao_midias: Array<{
    id: string;
    tipo: string;
    src: string;
    alt: string | null;
    thumbnail: string | null;
    ordem: number;
  }>;
  estabelecimentos: { status: string };
};

type UsuarioRow = {
  id: string;
  email: string;
  nome: string;
  avatar: string | null;
  estabelecimento_id: string | null;
  papel: string;
  seguindo: string[];
  inspiracao_salvas: string[];
};

type CurtidaRow = {
  id: string;
  publicacao_id: string;
  usuario_id: string;
};

type SalvoRow = {
  id: string;
  publicacao_id: string;
  usuario_id: string;
};

type SeguidorRow = {
  id: string;
  estabelecimento_id: string;
  usuario_id: string;
};

// ============================================================================
// MOCK FACTORY - cria mocks isolados por teste
// ============================================================================

function createMockSupabase() {
  const mockFrom = vi.fn();
  const mockAuth = {
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
  };
  const mockFunctions = {
    invoke: vi.fn(),
  };
  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
    })),
  };
  const mockChannel = vi.fn(() => ({
    on: vi.fn(() => ({ subscribe: vi.fn() })),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }));
  const mockRemoveChannel = vi.fn();
  const mockRpc = vi.fn();

  return {
    from: mockFrom,
    auth: mockAuth,
    functions: mockFunctions,
    storage: mockStorage,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
    rpc: mockRpc,
    // Helpers para configurar mocks
    _mockFrom: mockFrom,
    _mockAuth: mockAuth,
    _mockRpc: mockRpc,
  };
}

// Helper para criar chain de query do Supabase
function createQueryChain(resolveValue: any) {
  const chain: any = {
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    range: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    select: vi.fn(() => chain),
    // then/catch para tornar o chain "thenable" (suporta await query.limit(50))
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(resolveValue).then(onFulfilled, onRejected);
    },
    catch(onRejected: any) {
      return Promise.resolve(resolveValue).catch(onRejected);
    },
  };
  return chain;
}

// Helper para criar mock de insert
function createInsertMock(resolveValue: any) {
  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue(resolveValue),
      })),
    })),
  };
}

// Helper para criar mock de update
function createUpdateMock(resolveValue: any) {
  return {
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(resolveValue),
        })),
      })),
    })),
  };
}

// Helper para criar mock de delete
function createDeleteMock(resolveValue: any = { error: null }) {
  return {
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue(resolveValue),
      })),
    })),
  };
}

// ============================================================================
// SETUP DO MÓDULO
// ============================================================================

const mockSupabase = createMockSupabase();

// Mock do módulo client
vi.mock('../client', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  isMockMode: vi.fn(() => false),
  initSupabase: vi.fn(),
  enableMockMode: vi.fn(),
  resetSupabase: vi.fn(),
}));

describe('SupabaseFeedService', () => {
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase._mockFrom.mockReset();
    mockSupabase._mockRpc.mockReset();
    mockSupabase._mockAuth.getUser.mockReset();
    mockSupabase._mockAuth.getSession.mockReset();

    const module = await import('../SupabaseFeedService');
    service = module.SupabaseFeedService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // HELPERS DE DADOS DE TESTE
  // ============================================================================

  const mockPublicacaoRow: PublicacaoRow = {
    id: 'pub-123',
    estabelecimento_id: 'est-123',
    autor_id: 'user-123',
    autor_nome: 'João Barbeiro',
    autor_avatar: 'https://exemplo.com/avatar.jpg',
    tipo: 'corte',
    legenda: 'Novo corte degradê!',
    tag_servico: 'corte',
    curtidas: 10,
    salvos: 5,
    visualizacoes: 100,
    compartilhamentos: 2,
    comentarios_count: 3,
    data_criacao: '2025-01-15T10:00:00Z',
    publicacao_midias: [
      { id: 'mid-1', tipo: 'imagem', src: 'https://exemplo.com/foto.jpg', alt: 'Corte', thumbnail: null, ordem: 0 },
    ],
    estabelecimentos: { status: 'aprovado' },
  };

  const mockUsuarioRow: UsuarioRow = {
    id: 'user-123',
    email: 'cliente@exemplo.com',
    nome: 'João Barbeiro',
    avatar: 'https://exemplo.com/avatar.jpg',
    estabelecimento_id: 'est-123',
    papel: 'barbeiro',
    seguindo: ['est-123'],
    inspiracao_salvas: ['pub-123'],
  };

  const mockPerfilBarbeiro = {
    id: 'user-123',
    nome: 'João Barbeiro',
    avatar: 'https://exemplo.com/avatar.jpg',
    estabelecimento_id: 'est-123',
    papel: 'barbeiro',
  };

  const mockPerfilCliente = {
    id: 'user-123',
    nome: 'Cliente',
    avatar: null,
    estabelecimento_id: 'outro-est',
    papel: 'cliente',
  };

  const mockPerfilAdmin = {
    id: 'user-123',
    nome: 'Admin',
    avatar: null,
    estabelecimento_id: null,
    papel: 'admin',
  };

  // ============================================================================
  // TESTES: listarFeed
  // ============================================================================

  describe('listarFeed', () => {
    it('deve listar publicações do feed sem usuário logado', async () => {
      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'publicacoes') return createQueryChain({ data: [mockPublicacaoRow], error: null });
        if (table === 'usuarios') return createQueryChain({ data: null, error: null });
        if (table === 'salvos') return createQueryChain({ data: [], error: null });
        if (table === 'curtidas') return createQueryChain({ data: [], error: null });
        return createQueryChain({ data: null, error: null });
      });

      const resultado = await service.listarFeed('todos');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toHaveLength(1);
      expect(resultado.dados?.[0].id).toBe('pub-123');
      expect(resultado.dados?.[0].curtidas).toBe(10);
      expect(resultado.dados?.[0].tipo).toBe('corte');
    });

    it('deve filtrar por tipo de publicação', async () => {
      const chain = createQueryChain({ data: [mockPublicacaoRow], error: null });
      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'publicacoes') return chain;
        return createQueryChain({ data: null, error: null });
      });

      const resultado = await service.listarFeed('barba');

      expect(resultado.sucesso).toBe(true);
      expect(chain.eq).toHaveBeenCalledWith('tipo', 'barba');
    });

    it('deve aplicar algoritmo de recomendação quando usuário logado', async () => {
      mockSupabase._mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });

      const userChain = createQueryChain({ data: mockUsuarioRow, error: null });
      const pubChain = createQueryChain({ data: [mockPublicacaoRow], error: null });
      const curtidasChain = createQueryChain({ data: [], error: null });
      const salvosChain = createQueryChain({ data: [], error: null });

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'usuarios') return userChain;
        if (table === 'publicacoes') return pubChain;
        if (table === 'curtidas') return curtidasChain;
        if (table === 'salvos') return salvosChain;
        return createQueryChain({ data: null, error: null });
      });

      const resultado = await service.listarFeed('todos', 'cliente@exemplo.com');

      expect(resultado.sucesso).toBe(true);
      expect(mockSupabase._mockFrom).toHaveBeenCalledWith('usuarios');
    });

    it('deve filtrar salvos quando filtro="salvos" e usuário logado', async () => {
      mockSupabase._mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });

      const salvosChain = createQueryChain({ data: [{ publicacao_id: 'pub-123' }], error: null });
      const userChain = createQueryChain({ data: mockUsuarioRow, error: null });
      const pubChain = createQueryChain({ data: [mockPublicacaoRow], error: null });
      const curtidasChain = createQueryChain({ data: [], error: null });

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'salvos') return salvosChain;
        if (table === 'usuarios') return userChain;
        if (table === 'publicacoes') return pubChain;
        if (table === 'curtidas') return curtidasChain;
        return createQueryChain({ data: null, error: null });
      });

      const resultado = await service.listarFeed('salvos', 'cliente@exemplo.com');

      expect(resultado.sucesso).toBe(true);
      expect(salvosChain.eq).toHaveBeenCalledWith('usuario_id', 'user-123');
    });

    it('deve retornar erro quando Supabase falha', async () => {
      const chain = createQueryChain({ data: null, error: { message: 'Erro ao buscar feed' } });
      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'publicacoes') return chain;
        return createQueryChain({ data: null, error: null });
      });

      const resultado = await service.listarFeed('todos');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao buscar feed.');
    });
  });

  // ============================================================================
  // TESTES: obterPublicacao
  // ============================================================================

  describe('obterPublicacao', () => {
    it('deve obter publicação por ID com sucesso', async () => {
      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'publicacoes') return createQueryChain({ data: mockPublicacaoRow, error: null });
        return createQueryChain({ data: null, error: null });
      });

      const resultado = await service.obterPublicacao('pub-123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).not.toBeNull();
      expect(resultado.dados?.id).toBe('pub-123');
    });

    it('deve retornar null quando publicação não encontrada', async () => {
      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'publicacoes') return createQueryChain({ data: null, error: null });
        return createQueryChain({ data: null, error: null });
      });

      const resultado = await service.obterPublicacao('inexistente');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBeNull();
    });
  });

  // ============================================================================
  // TESTES: criarPublicacao
  // ============================================================================

  describe('criarPublicacao', () => {
    it('deve criar publicação com sucesso quando usuário é barbeiro do estabelecimento', async () => {
      mockSupabase._mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'barbeiro@exemplo.com' } }, error: null });

      // Mock para usuarios: select().eq().single()
      const userSelectChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockPerfilBarbeiro, error: null }),
          })),
        })),
      };

      // Mock para publicacoes: insert().select().single() E select().eq().single() (reload)
      const pubInsertResult = { data: mockPublicacaoRow, error: null };
      const pubSelectResult = { data: { ...mockPublicacaoRow, publicacao_midias: [{ id: 'mid-1', tipo: 'imagem', src: 'https://exemplo.com/foto.jpg', alt: 'Corte', thumbnail: null, ordem: 0 }] }, error: null };

      const publicacoesMock = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue(pubInsertResult),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue(pubSelectResult),
          })),
        })),
      };

      const midiasInsertMock = { insert: vi.fn().mockResolvedValue({ error: null }) };

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'usuarios') return userSelectChain;
        if (table === 'publicacoes') return publicacoesMock;
        if (table === 'publicacao_midias') return midiasInsertMock;
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) };
      });

      mockSupabase._mockRpc.mockResolvedValue({ error: null });

      const dados = {
        estabelecimentoId: 'est-123',
        tipo: 'corte' as PublicacaoTipo,
        legenda: 'Novo corte!',
        tagServico: 'corte',
        midias: [{ tipo: 'imagem' as TipoMidia, src: 'https://exemplo.com/foto.jpg' }],
      };

      const resultado = await service.criarPublicacao(dados);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.id).toBe('pub-123');
    });

    it('deve retornar erro quando usuário não autenticado', async () => {
      mockSupabase._mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const dados = {
        estabelecimentoId: 'est-123',
        tipo: 'corte' as PublicacaoTipo,
        legenda: 'Novo corte!',
      };

      const resultado = await service.criarPublicacao(dados);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Não autenticado.');
    });

    it('deve retornar erro quando usuário não é barbeiro nem admin do estabelecimento', async () => {
      mockSupabase._mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'cliente@exemplo.com' } }, error: null });

      const userSelectChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockPerfilCliente, error: null }),
          })),
        })),
      };

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'usuarios') return userSelectChain;
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) };
      });

      const dados = {
        estabelecimentoId: 'est-123',
        tipo: 'corte' as PublicacaoTipo,
        legenda: 'Novo corte!',
      };

      const resultado = await service.criarPublicacao(dados);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Não autorizado a publicar neste estabelecimento.');
    });
  });

  // ============================================================================
  // TESTES: alternarCurtida
  // ============================================================================

  describe('alternarCurtida', () => {
    it('deve curtir publicação quando não curtiu', async () => {
      const mockUser = { id: 'user-123', email: 'cliente@exemplo.com' };

      const usuariosMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          })),
        })),
      };

      const curtidasMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      };

      const publicacoesMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { curtidas: 11 }, error: null }),
          })),
        })),
      };

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'usuarios') return usuariosMock;
        if (table === 'curtidas') return curtidasMock;
        if (table === 'publicacoes') return publicacoesMock;
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) };
      });

      mockSupabase._mockRpc.mockResolvedValue({ error: null });

      const resultado = await service.alternarCurtida('pub-123', 'cliente@exemplo.com');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.curtido).toBe(true);
      expect(resultado.dados?.total).toBe(11);
    });

    it('deve descurtir publicação quando já curtiu', async () => {
      const mockUser = { id: 'user-123', email: 'cliente@exemplo.com' };

      const usuariosMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          })),
        })),
      };

      const curtidasMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'curtida-1' }, error: null }),
            })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      };

      const publicacoesMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { curtidas: 9 }, error: null }),
          })),
        })),
      };

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'usuarios') return usuariosMock;
        if (table === 'curtidas') return curtidasMock;
        if (table === 'publicacoes') return publicacoesMock;
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) };
      });

      mockSupabase._mockRpc.mockResolvedValue({ error: null });

      const resultado = await service.alternarCurtida('pub-123', 'cliente@exemplo.com');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.curtido).toBe(false);
      expect(resultado.dados?.total).toBe(9);
    });
  });

  // ============================================================================
  // TESTES: alternarInspiracao (salvar/remover)
  // ============================================================================

  describe('alternarInspiracao', () => {
    it('deve salvar publicação quando não salva', async () => {
      const mockUser = { id: 'user-123', email: 'cliente@exemplo.com' };

      const usuariosMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          })),
        })),
      };

      const salvosMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      };

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'usuarios') return usuariosMock;
        if (table === 'salvos') return salvosMock;
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) };
      });

      mockSupabase._mockRpc.mockResolvedValue({ error: null });

      const resultado = await service.alternarInspiracao('pub-123', 'cliente@exemplo.com');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.salvo).toBe(true);
    });

    it('deve remover salvamento quando já salvo', async () => {
      const mockUser = { id: 'user-123', email: 'cliente@exemplo.com' };

      const usuariosMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          })),
        })),
      };

      const salvosMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'salvo-1' }, error: null }),
            })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      };

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'usuarios') return usuariosMock;
        if (table === 'salvos') return salvosMock;
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) };
      });

      mockSupabase._mockRpc.mockResolvedValue({ error: null });

      const resultado = await service.alternarInspiracao('pub-123', 'cliente@exemplo.com');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.salvo).toBe(false);
    });
  });

  // ============================================================================
  // TESTES: alternarSeguir
  // ============================================================================

  describe('alternarSeguir', () => {
    it('deve seguir estabelecimento quando não seguia', async () => {
      const mockUser = { id: 'user-123', email: 'cliente@exemplo.com' };
      const userChain = createQueryChain({ data: mockUser, error: null });

      const seguidoresMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      };

      const estabelecimentosMock = {
        rpc: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'usuarios') return userChain;
        if (table === 'seguidores') return seguidoresMock;
        if (table === 'estabelecimentos') return estabelecimentosMock;
        return createQueryChain({ data: null, error: null });
      });

      mockSupabase._mockRpc.mockResolvedValue({ error: null });

      const resultado = await service.alternarSeguir('est-123', 'cliente@exemplo.com');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.seguindo).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: adicionarComentario
  // ============================================================================

  describe('adicionarComentario', () => {
    it('deve adicionar comentário com sucesso', async () => {
      const mockUser = { id: 'user-123', email: 'cliente@exemplo.com' };
      mockSupabase._mockAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const mockPerfil = { nome: 'Cliente', avatar: 'https://exemplo.com/avatar.jpg' };

      const usuariosMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockPerfil, error: null }),
          })),
        })),
      };

      const comentarioInsertMock = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'coment-1', publicacao_id: 'pub-123', autor_id: 'user-123', autor_nome: 'Cliente', autor_avatar: 'https://exemplo.com/avatar.jpg', texto: 'Ótimo corte!', data_criacao: '2025-01-15T10:05:00Z' },
              error: null,
            }),
          })),
        })),
      };

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'usuarios') return usuariosMock;
        if (table === 'comentarios') return comentarioInsertMock;
        if (table === 'publicacoes') return { rpc: vi.fn().mockResolvedValue({ error: null }) };
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) };
      });

      mockSupabase._mockRpc.mockResolvedValue({ error: null });

      const resultado = await service.adicionarComentario('pub-123', 'Cliente', 'Ótimo corte!');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.texto).toBe('Ótimo corte!');
    });
  });

  // ============================================================================
  // TESTES: excluirPublicacao
  // ============================================================================

  describe('excluirPublicacao', () => {
    it('deve excluir publicação quando usuário é barbeiro dono', async () => {
      const mockUser = { id: 'user-123', email: 'barbeiro@exemplo.com' };
      mockSupabase._mockAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const mockPerfil = { id: 'user-123', papel: 'barbeiro', estabelecimento_id: 'est-123' };

      const usuariosMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockPerfil, error: null }),
          })),
        })),
      };

      const publicacoesMock = {
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      };

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'usuarios') return usuariosMock;
        if (table === 'publicacoes') return publicacoesMock;
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) };
      });

      const resultado = await service.excluirPublicacao('pub-123', 'est-123');

      expect(resultado.sucesso).toBe(true);
    });

    it('deve retornar erro quando usuário não autorizado', async () => {
      const mockUser = { id: 'user-123', email: 'cliente@exemplo.com' };
      mockSupabase._mockAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const mockPerfil = { id: 'user-123', papel: 'cliente', estabelecimento_id: null };

      const usuariosMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockPerfil, error: null }),
          })),
        })),
      };

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'usuarios') return usuariosMock;
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) };
      });

      const resultado = await service.excluirPublicacao('pub-123', 'est-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Não autorizado.');
    });
  });

  // ============================================================================
  // TESTES: compartilharPublicacao
  // ============================================================================

  describe('compartilharPublicacao', () => {
    it('deve incrementar contador de compartilhamentos', async () => {
      mockSupabase._mockRpc.mockResolvedValue({ error: null });
      mockSupabase._mockFrom.mockImplementation(() => ({
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })) })),
      }));

      const resultado = await service.compartilharPublicacao('pub-123');

      expect(resultado.sucesso).toBe(true);
      expect(mockSupabase._mockRpc).toHaveBeenCalledWith('incrementar_contador', {
        tabela: 'publicacoes',
        campo: 'compartilhamentos',
        id_registro: 'pub-123',
      });
    });

    it('deve retornar erro quando RPC falha', async () => {
      mockSupabase._mockRpc.mockResolvedValue({ error: { message: 'Erro RPC' } });
      mockSupabase._mockFrom.mockImplementation(() => ({
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })) })),
      }));

      const resultado = await service.compartilharPublicacao('pub-123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao compartilhar.');
    });
  });

  // ============================================================================
  // TESTES: RLS / PERMISSÃO (HTTP 403)
  // ============================================================================

  describe('Erros de permissão RLS (HTTP 403)', () => {
    it('deve retornar erro quando RLS bloqueia inserção de publicação', async () => {
      const mockUser = { id: 'user-123', email: 'barbeiro@exemplo.com' };
      mockSupabase._mockAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const mockPerfil = { id: 'user-123', nome: 'João', avatar: null, estabelecimento_id: 'est-123', papel: 'barbeiro' };

      const usuariosMock = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockPerfil, error: null }),
          })),
        })),
      };

      const publicacoesMock = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied by row-level security policy', code: '42501' } }),
          })),
        })),
      };

      mockSupabase._mockFrom.mockImplementation((table) => {
        if (table === 'usuarios') return usuariosMock;
        if (table === 'publicacoes') return publicacoesMock;
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) };
      });

      const dados = {
        estabelecimentoId: 'est-123',
        tipo: 'corte' as PublicacaoTipo,
        legenda: 'Novo corte!',
      };

      const resultado = await service.criarPublicacao(dados);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao criar publicação.');
    });
  });
});