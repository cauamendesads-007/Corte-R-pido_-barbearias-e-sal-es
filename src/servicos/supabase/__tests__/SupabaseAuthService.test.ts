/**
 * Testes unitários para SupabaseAuthService
 * Mocka o SDK @supabase/supabase-js
 * Cobertura: sucesso, conflito, RLS (403), fallback mock
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Usuario, SessaoUsuario, PapelUsuario, NichoEstabelecimento } from '@/tipos';

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

describe('SupabaseAuthService', () => {
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
    mockSupabase.auth.getUser.mockReset();
    mockSupabase.auth.getSession.mockReset();
    mockSupabase.auth.signInWithPassword.mockReset();
    mockSupabase.auth.signUp.mockReset();
    mockSupabase.auth.signOut.mockReset();
    mockSupabase.auth.updateUser.mockReset();
    mockSupabase.auth.resetPasswordForEmail.mockReset();
    mockSupabase.auth.admin.deleteUser.mockReset();
    mockSupabase.functions.invoke.mockReset();

    const module = await import('../SupabaseAuthService');
    service = module.SupabaseAuthService;
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
    bio: 'Bio teste',
    whatsapp: '(11) 99999-9999',
    cidade: 'São Paulo',
    avatar: 'https://exemplo.com/avatar.jpg',
    estabelecimento_id: null,
    confirmado: true,
    lembretes_whatsapp: true,
    seguindo: ['est-1', 'est-2'],
    inspiracao_salvas: ['pub-1'],
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
    tema_subtitulo: 'A melhor barbearia',
    tempo_medio_atendimento: 20,
    horario_funcionamento: 'Seg a Sáb, 9h às 18h',
    permite_auto_edicao: false,
    configuracao_pix_modo: 'desativado',
    configuracao_pix_chave: null,
    configuracao_pix_percentual_sinal: 30,
    seguidores: 10,
    taxa_fidelidade: 0,
  };

  function setupAuthSuccess(user = mockUsuarioRow, session = { user: { id: 'user-123', email: 'teste@exemplo.com' } }) {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });

    const chain = {
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: user, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: user, error: null }),
      })),
    };
    mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });
  }

  function setupAuthError(message = 'Erro de autenticação') {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message } });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: { message } });
  }

  // ============================================================================
  // TESTES: entrar (login)
  // ============================================================================

  describe('entrar (login)', () => {
    it('deve fazer login com sucesso e retornar sessão', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'teste@exemplo.com' }, session: { access_token: 'token' } },
        error: null,
      });

      const chain = {
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockUsuarioRow, error: null }),
        })),
      };
      mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });

      const resultado = await service.entrar('teste@exemplo.com', 'senha123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toEqual({
        papel: 'cliente',
        email: 'teste@exemplo.com',
        estabelecimentoId: null,
        nome: 'João Silva',
      });
    });

    it('deve retornar erro quando credenciais inválidas', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const resultado = await service.entrar('teste@exemplo.com', 'senhaerrada');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('E-mail ou senha inválidos.');
    });

    it('deve retornar erro quando perfil não encontrado', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'teste@exemplo.com' }, session: { access_token: 'token' } },
        error: null,
      });

      const chain = {
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        })),
      };
      mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });

      const resultado = await service.entrar('teste@exemplo.com', 'senha123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Perfil não encontrado.');
    });

    it('deve retornar erro quando conta não confirmada', async () => {
      const userNaoConfirmado = { ...mockUsuarioRow, confirmado: false };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'teste@exemplo.com' }, session: { access_token: 'token' } },
        error: null,
      });

      const chain = {
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: userNaoConfirmado, error: null }),
        })),
      };
      mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });

      const resultado = await service.entrar('teste@exemplo.com', 'senha123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Conta não confirmada. Verifique seu e-mail.');
    });
  });

  // ============================================================================
  // TESTES: cadastrarCliente
  // ============================================================================

  describe('cadastrarCliente', () => {
    it('deve cadastrar cliente com sucesso', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'novo-user-123', email: 'novo@exemplo.com' }, session: null },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { ...mockUsuarioRow, id: 'novo-user-123', email: 'novo@exemplo.com' }, error: null }),
          })),
        })),
      });

      const resultado = await service.cadastrarCliente({
        nome: 'Novo Cliente',
        email: 'novo@exemplo.com',
        senha: 'senha123',
      });

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.email).toBe('novo@exemplo.com');
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'novo@exemplo.com',
        password: 'senha123',
        options: { data: { nome: 'Novo Cliente', papel: 'cliente' } },
      });
    });

    it('deve retornar erro quando signUp falha', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const resultado = await service.cadastrarCliente({
        nome: 'Novo Cliente',
        email: 'existente@exemplo.com',
        senha: 'senha123',
      });

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('User already registered');
    });

    it('deve deletar usuário do auth se falhar ao criar perfil', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'novo-user-123', email: 'novo@exemplo.com' }, session: null },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro ao inserir perfil' } }),
          })),
        })),
      });

      const resultado = await service.cadastrarCliente({
        nome: 'Novo Cliente',
        email: 'novo@exemplo.com',
        senha: 'senha123',
      });

      expect(resultado.sucesso).toBe(false);
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('novo-user-123');
    });
  });

  // ============================================================================
  // TESTES: cadastrarProfissional
  // ============================================================================

  describe('cadastrarProfissional', () => {
    it('deve cadastrar profissional/estabelecimento com sucesso', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'novo-barbeiro-123', email: 'barbeiro@exemplo.com' }, session: null },
        error: null,
      });

      // Mock busca slug único
      const slugChain = {
        eq: vi.fn(() => ({
          maybeSingle: vi.fn()
            .mockResolvedValueOnce({ data: null, error: null }) // slug disponível
            .mockResolvedValueOnce({ data: null, error: null }), // estabelecimento não existe
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      };
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'estabelecimentos') return { select: vi.fn(() => slugChain), insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: mockEstabelecimentoRow, error: null }) })) })) };
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      });

      const resultado = await service.cadastrarProfissional({
        nomeEstabelecimento: 'Nova Barbearia',
        responsavel: 'Carlos Barbeiro',
        email: 'barbeiro@exemplo.com',
        senha: 'senha123',
        cidade: 'São Paulo',
        endereco: 'Rua Nova, 456',
        whatsapp: '(11) 88888-8888',
        nicho: 'barbearia',
      });

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.estabelecimentoId).toBe('est-123');
    });

    it('deve gerar slug único incrementando contador', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'novo-barbeiro-123', email: 'barbeiro@exemplo.com' }, session: null },
        error: null,
      });

      let callCount = 0;
      const slugChain = {
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => {
            callCount++;
            if (callCount <= 2) return Promise.resolve({ data: { id: 'existing' }, error: null }); // slug ocupado
            return Promise.resolve({ data: null, error: null }); // slug disponível
          }),
        })),
      };
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'estabelecimentos') return { select: vi.fn(() => slugChain), insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: mockEstabelecimentoRow, error: null }) })) })) };
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      });

      const resultado = await service.cadastrarProfissional({
        nomeEstabelecimento: 'Barbearia Popular',
        responsavel: 'Carlos',
        email: 'barbeiro@exemplo.com',
        senha: 'senha123',
        cidade: 'São Paulo',
        endereco: 'Rua Nova, 456',
        whatsapp: '(11) 88888-8888',
        nicho: 'barbearia',
      });

      expect(resultado.sucesso).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: sair (logout)
  // ============================================================================

  describe('sair (logout)', () => {
    it('deve fazer logout com sucesso', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const resultado = await service.sair();

      expect(resultado.sucesso).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('deve retornar erro quando signOut falha', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: { message: 'Erro ao sair' } });

      const resultado = await service.sair();

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao sair');
    });
  });

  // ============================================================================
  // TESTES: obterSessao
  // ============================================================================

  describe('obterSessao', () => {
    it('deve retornar sessão atual quando usuário logado', async () => {
      setupAuthSuccess();

      const resultado = await service.obterSessao();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toEqual({
        papel: 'cliente',
        email: 'teste@exemplo.com',
        estabelecimentoId: null,
        nome: 'João Silva',
      });
    });

    it('deve retornar null quando não há sessão', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

      const resultado = await service.obterSessao();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBeNull();
    });
  });

  // ============================================================================
  // TESTES: atualizarPerfilCliente
  // ============================================================================

  describe('atualizarPerfilCliente', () => {
    it('deve atualizar perfil com sucesso', async () => {
      setupAuthSuccess();

      const updatedUser = { ...mockUsuarioRow, nome: 'João Atualizado', bio: 'Nova bio' };
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: updatedUser, error: null }),
            })),
          })),
        })),
      });

      const resultado = await service.atualizarPerfilCliente({ nome: 'João Atualizado', bio: 'Nova bio' });

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.nome).toBe('João Atualizado');
    });

    it('deve retornar erro quando não autenticado', async () => {
      setupAuthError();

      const resultado = await service.atualizarPerfilCliente({ nome: 'Teste' });

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Não autenticado.');
    });
  });

  // ============================================================================
  // TESTES: alterarSenha
  // ============================================================================

  describe('alterarSenha', () => {
    it('deve alterar senha com sucesso quando senha atual correta', async () => {
      setupAuthSuccess();

      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      mockSupabase.auth.updateUser.mockResolvedValue({ data: { user: mockUsuarioRow }, error: null });

      const resultado = await service.alterarSenha('senhaAtual', 'novaSenha123');

      expect(resultado.sucesso).toBe(true);
    });

    it('deve retornar erro quando senha atual incorreta', async () => {
      setupAuthSuccess();

      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid credentials' } });

      const resultado = await service.alterarSenha('senhaErrada', 'novaSenha123');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Senha atual incorreta.');
    });
  });

  // ============================================================================
  // TESTES: excluirConta (LGPD - Edge Function)
  // ============================================================================

  describe('excluirConta (LGPD)', () => {
    it('deve chamar Edge Function e excluir com sucesso', async () => {
      setupAuthSuccess();

      mockSupabase.functions.invoke.mockResolvedValue({ data: { sucesso: true }, error: null });

      const resultado = await service.excluirConta();

      expect(resultado.sucesso).toBe(true);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('lgpd-excluir-conta', {
        body: { confirmacao: 'CONFIRMO_EXCLUSAO_MINHA_CONTA_E_DADOS_PESSOAIS' },
      });
    });

    it('deve retornar erro quando Edge Function falha', async () => {
      setupAuthSuccess();

      mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: { message: 'Erro na exclusão LGPD' } });

      const resultado = await service.excluirConta();

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro na exclusão LGPD');
    });
  });

  // ============================================================================
  // TESTES: validarToken
  // ============================================================================

  describe('validarToken', () => {
    it('deve validar token e retornar sessão', async () => {
      setupAuthSuccess();

      const resultado = await service.validarToken();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).not.toBeNull();
    });

    it('deve retornar null quando token inválido', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const resultado = await service.validarToken();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBeNull();
    });
  });

  // ============================================================================
  // TESTES: recuperarSenha
  // ============================================================================

  describe('recuperarSenha', () => {
    it('deve enviar e-mail de recuperação', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      const resultado = await service.recuperarSenha('teste@exemplo.com');

      expect(resultado.sucesso).toBe(true);
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('teste@exemplo.com', {
        redirectTo: expect.stringContaining('/resetar-senha'),
      });
    });
  });

  // ============================================================================
  // TESTES: confirmarEmail
  // ============================================================================

  describe('confirmarEmail', () => {
    it('deve confirmar e-mail e retornar sessão', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null });

      const confirmedUser = { ...mockUsuarioRow, confirmado: true };
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: confirmedUser, error: null }),
            })),
          })),
        })),
      });

      const resultado = await service.confirmarEmail();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.confirmado).toBe(true);
    });
  });

  // ============================================================================
  // TESTES: Admin - listarUsuariosAdmin
  // ============================================================================

  describe('listarUsuariosAdmin', () => {
    it('deve listar todos usuários para admin', async () => {
      const chain = {
        order: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: [mockUsuarioRow, { ...mockUsuarioRow, id: 'user-456', email: 'outro@exemplo.com' }], error: null }),
        })),
      };
      mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });

      const resultado = await service.listarUsuariosAdmin();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toHaveLength(2);
    });
  });

  // ============================================================================
  // TESTES: Admin - obterUsuarioAdmin
  // ============================================================================

  describe('obterUsuarioAdmin', () => {
    it('deve obter usuário por ID para admin', async () => {
      const chain = {
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockUsuarioRow, error: null }),
        })),
      };
      mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });

      const resultado = await service.obterUsuarioAdmin('user-123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.id).toBe('user-123');
    });

    it('deve retornar erro quando usuário não encontrado', async () => {
      const chain = {
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        })),
      };
      mockSupabase.from.mockReturnValue({ select: vi.fn(() => chain) });

      const resultado = await service.obterUsuarioAdmin('inexistente');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Usuário não encontrado.');
    });
  });

  // ============================================================================
  // TESTES: Admin - excluirUsuarioAdmin
  // ============================================================================

  describe('excluirUsuarioAdmin', () => {
    it('deve excluir usuário via admin API', async () => {
      mockSupabase.auth.admin.deleteUser.mockResolvedValue({ error: null });

      const resultado = await service.excluirUsuarioAdmin('user-123');

      expect(resultado.sucesso).toBe(true);
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');
    });
  });

  // ============================================================================
  // TESTES: MODO MOCK (FALLBACK)
  // ============================================================================

  describe('Modo Mock (fallback quando VITE_SUPABASE_URL não definido)', () => {
    beforeEach(async () => {
      vi.resetModules();
      vi.doMock('../client', () => ({
        getSupabase: vi.fn(() => mockSupabase),
        isMockMode: vi.fn(() => true),
        initSupabase: vi.fn(),
        enableMockMode: vi.fn(),
        resetSupabase: vi.fn(),
      }));

      const module = await import('../SupabaseAuthService');
      service = module.SupabaseAuthService;
    });

    it('deve delegar para API mock quando isMockMode() retorna true', async () => {
      const mockApi = {
        autenticacao: {
          entrar: vi.fn().mockResolvedValue({ sucesso: true, dados: { papel: 'cliente', email: 'test@test.com' } }),
          cadastrarCliente: vi.fn().mockResolvedValue({ sucesso: true }),
          cadastrarProfissional: vi.fn().mockResolvedValue({ sucesso: true }),
          sair: vi.fn().mockResolvedValue({ sucesso: true }),
          obterSessao: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
          atualizarPerfilCliente: vi.fn().mockResolvedValue({ sucesso: true }),
          alterarSenha: vi.fn().mockResolvedValue({ sucesso: true }),
          excluirConta: vi.fn().mockResolvedValue({ sucesso: true }),
          validarToken: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
          renovarSessao: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
          recuperarSenha: vi.fn().mockResolvedValue({ sucesso: true }),
          confirmarEmail: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
          login: vi.fn().mockResolvedValue({ sucesso: true }),
          cadastrar: vi.fn().mockResolvedValue({ sucesso: true }),
          listarUsuariosAdmin: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
          obterUsuarioAdmin: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
          atualizarUsuarioAdmin: vi.fn().mockResolvedValue({ sucesso: true }),
          excluirUsuarioAdmin: vi.fn().mockResolvedValue({ sucesso: true }),
        },
      };

      vi.doMock('@/servicos/api', () => ({ api: mockApi }));

      vi.resetModules();
      const mod = await import('../SupabaseAuthService');
      const svc = mod.SupabaseAuthService;

      await svc.entrar('test@test.com', 'senha');
      expect(mockApi.autenticacao.entrar).toHaveBeenCalledWith('test@test.com', 'senha');
    });
  });

  // ============================================================================
  // TESTES: RLS / PERMISSÃO (HTTP 403)
  // ============================================================================

  describe('Erros de permissão RLS (HTTP 403)', () => {
    it('deve retornar erro quando RLS bloqueia atualização de perfil', async () => {
      setupAuthSuccess();

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied by row-level security policy', code: '42501' } }),
            })),
          })),
        })),
      });

      const resultado = await service.atualizarPerfilCliente({ nome: 'Teste' });

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('permission denied');
    });
  });
});