// ============================================================================
// SUPABASE AUTH SERVICE
// Implementa interface de autenticação usando Supabase Auth
// ============================================================================

import { getSupabase, isMockMode } from './client';
import type { Database } from './types';
import type {
  ResultadoServico,
  SessaoUsuario,
  Usuario,
  PapelUsuario,
  NichoEstabelecimento,
} from '@/tipos';

type UsuarioRow = Database['public']['Tables']['usuarios']['Row'];
type UsuarioInsert = Database['public']['Tables']['usuarios']['Insert'];
type EstabelecimentoRow = Database['public']['Tables']['estabelecimentos']['Row'];
type EstabelecimentoInsert = Database['public']['Tables']['estabelecimentos']['Insert'];

// ============================================================================
// HELPERS
// ============================================================================

function mapUsuarioRowToTipo(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    email: row.email,
    senha: '', // Nunca expõe senha
    papel: row.papel,
    nome: row.nome,
    bio: row.bio,
    whatsapp: row.whatsapp,
    cidade: row.cidade,
    avatar: row.avatar,
    estabelecimentoId: row.estabelecimento_id,
    confirmado: row.confirmado,
    lembretesWhatsapp: row.lembretes_whatsapp,
    seguindo: row.seguindo || [],
    inspiracoesSalvas: row.inspiracao_salvas || [],
  };
}

function mapSessaoFromUser(user: UsuarioRow, estabelecimento?: EstabelecimentoRow | null): SessaoUsuario {
  return {
    papel: user.papel,
    email: user.email,
    estabelecimentoId: user.estabelecimento_id,
    nome: user.nome,
  };
}

// ============================================================================
// SERVICE
// ============================================================================

export const SupabaseAuthService = {
  /**
   * Login com e-mail e senha
   */
  async entrar(email: string, senha: string): Promise<ResultadoServico<SessaoUsuario>> {
    if (isMockMode()) {
      // Em modo mock, delega para API mock
      const { entrar } = await import('@/servicos/api');
      return entrar(email, senha);
    }

    try {
      const supabase = getSupabase();

      // Autentica via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (authError || !authData.user) {
        return { sucesso: false, erro: 'E-mail ou senha inválidos.' };
      }

      // Busca perfil do usuário na tabela usuarios
      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (perfilError || !perfil) {
        return { sucesso: false, erro: 'Perfil não encontrado.' };
      }

      if (!perfil.confirmado) {
        return { sucesso: false, erro: 'Conta não confirmada. Verifique seu e-mail.' };
      }

      const sessao = mapSessaoFromUser(perfil);
      return { sucesso: true, dados: sessao };
    } catch (error) {
      console.error('[SupabaseAuthService.entrar] Erro:', error);
      return { sucesso: false, erro: 'Erro ao fazer login. Tente novamente.' };
    }
  },

  /**
   * Cadastra novo cliente
   */
  async cadastrarCliente(dados: {
    nome: string;
    email: string;
    senha: string;
  }): Promise<ResultadoServico<SessaoUsuario>> {
    if (isMockMode()) {
      const { cadastrarCliente } = await import('@/servicos/api');
      return cadastrarCliente(dados);
    }

    try {
      const supabase = getSupabase();

      // Cria usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: dados.email,
        password: dados.senha,
        options: {
          data: { nome: dados.nome, papel: 'cliente' },
        },
      });

      if (authError || !authData.user) {
        return { sucesso: false, erro: authError?.message || 'Erro ao criar conta.' };
      }

      // Cria perfil na tabela usuarios
      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .insert({
          id: authData.user.id,
          email: dados.email,
          papel: 'cliente',
          nome: dados.nome,
          confirmado: true, // Em produção: false até confirmação por e-mail
          lembretes_whatsapp: true,
          seguindo: [],
          inspiracao_salvas: [],
        })
        .select()
        .single();

      if (perfilError || !perfil) {
        // Tenta deletar usuário do auth se falhou
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { sucesso: false, erro: 'Erro ao criar perfil. Tente novamente.' };
      }

      const sessao = mapSessaoFromUser(perfil);
      return { sucesso: true, dados: sessao };
    } catch (error) {
      console.error('[SupabaseAuthService.cadastrarCliente] Erro:', error);
      return { sucesso: false, erro: 'Erro ao cadastrar. Tente novamente.' };
    }
  },

  /**
   * Cadastra novo profissional/estabelecimento
   */
  async cadastrarProfissional(dados: {
    nomeEstabelecimento: string;
    responsavel: string;
    email: string;
    senha: string;
    cidade: string;
    endereco: string;
    whatsapp: string;
    nicho: NichoEstabelecimento;
  }): Promise<ResultadoServico<{ estabelecimentoId: string }>> {
    if (isMockMode()) {
      const { cadastrarProfissional } = await import('@/servicos/api');
      return cadastrarProfissional(dados);
    }

    try {
      const supabase = getSupabase();

      // Cria usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: dados.email,
        password: dados.senha,
        options: {
          data: { nome: dados.responsavel, papel: 'barbeiro' },
        },
      });

      if (authError || !authData.user) {
        return { sucesso: false, erro: authError?.message || 'Erro ao criar conta.' };
      }

      // Gera slug único
      const baseSlug = dados.nomeEstabelecimento
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      let slug = baseSlug;
      let contador = 1;
      while (true) {
        const { data: existente, error: slugError } = await supabase
          .from('estabelecimentos')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        if (slugError) {
          console.error('[SupabaseAuthService.cadastrarProfissional] Erro:', slugError);
          return { sucesso: false, erro: 'Erro ao verificar slug.' };
        }
        if (!existente) break;
        slug = `${baseSlug}-${contador++}`;
      }

      // Cores por nicho
      const corNicho: Record<NichoEstabelecimento, string> = {
        barbearia: '#B45309',
        feminino: '#E8508A',
        visagismo: '#7C3AED',
        infantil: '#FB923C',
      };

      // Cria estabelecimento
      const { data: estabelecimento, error: estError } = await supabase
        .from('estabelecimentos')
        .insert({
          slug,
          nome: dados.nomeEstabelecimento,
          responsavel: dados.responsavel,
          cidade: dados.cidade,
          nicho: dados.nicho,
          avaliacao: 0,
          status: 'pendente',
          latitude: -19.92,
          longitude: -43.94,
          whatsapp: dados.whatsapp,
          endereco: dados.endereco,
          sobre: 'Aguardando aprovação.',
          tema_cor: corNicho[dados.nicho],
          tema_layout: 'classico',
          tema_titulo: dados.nomeEstabelecimento,
          tema_subtitulo: 'Aguardando aprovação.',
          tempo_medio_atendimento: 20,
          horario_funcionamento: 'Seg a Sáb, 9h às 18h',
          permite_auto_edicao: false,
          configuracao_pix_modo: 'desativado',
          configuracao_pix_chave: null,
          configuracao_pix_percentual_sinal: 30,
          seguidores: 0,
          taxa_fidelidade: 0,
        })
        .select()
        .single();

      if (estError || !estabelecimento) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { sucesso: false, erro: 'Erro ao criar estabelecimento.' };
      }

      // Cria perfil do usuário vinculado ao estabelecimento
      const { error: perfilError } = await supabase
        .from('usuarios')
        .insert({
          id: authData.user.id,
          email: dados.email,
          papel: 'barbeiro',
          nome: dados.responsavel,
          estabelecimento_id: estabelecimento.id,
          confirmado: false, // Aguarda aprovação do admin
          lembretes_whatsapp: true,
          seguindo: [],
          inspiracao_salvas: [],
        });

      if (perfilError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        await supabase.from('estabelecimentos').delete().eq('id', estabelecimento.id);
        return { sucesso: false, erro: 'Erro ao vincular usuário ao estabelecimento.' };
      }

      return { sucesso: true, dados: { estabelecimentoId: estabelecimento.id } };
    } catch (error) {
      console.error('[SupabaseAuthService.cadastrarProfissional] Erro:', error);
      return { sucesso: false, erro: 'Erro ao cadastrar profissional. Tente novamente.' };
    }
  },

  /**
   * Logout
   */
  async sair(): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { sair } = await import('@/servicos/api');
      return sair();
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) return { sucesso: false, erro: error.message };
      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAuthService.sair] Erro:', error);
      return { sucesso: false, erro: 'Erro ao sair.' };
    }
  },

  /**
   * Obtém sessão atual
   */
  async obterSessao(): Promise<ResultadoServico<SessaoUsuario | null>> {
    if (isMockMode()) {
      const { obterSessao } = await import('@/servicos/api');
      return obterSessao();
    }

    try {
      const supabase = getSupabase();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { sucesso: true, dados: null };
      }

      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (perfilError || !perfil) {
        return { sucesso: true, dados: null };
      }

      const sessao = mapSessaoFromUser(perfil);
      return { sucesso: true, dados: sessao };
    } catch (error) {
      console.error('[SupabaseAuthService.obterSessao] Erro:', error);
      return { sucesso: false, erro: 'Erro ao obter sessão.' };
    }
  },

  /**
   * Atualiza perfil do cliente
   */
  async atualizarPerfilCliente(dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
    if (isMockMode()) {
      const { atualizarPerfilCliente } = await import('@/servicos/api');
      return atualizarPerfilCliente(dados);
    }

    try {
      const supabase = getSupabase();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { sucesso: false, erro: 'Não autenticado.' };

      const { data: perfil, error } = await supabase
        .from('usuarios')
        .update({
          nome: dados.nome,
          bio: dados.bio,
          whatsapp: dados.whatsapp,
          cidade: dados.cidade,
          avatar: dados.avatar,
          lembretes_whatsapp: dados.lembretesWhatsapp,
          data_atualizacao: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error || !perfil) {
        return { sucesso: false, erro: 'Erro ao atualizar perfil.' };
      }

      return { sucesso: true, dados: mapUsuarioRowToTipo(perfil) };
    } catch (error) {
      console.error('[SupabaseAuthService.atualizarPerfilCliente] Erro:', error);
      return { sucesso: false, erro: 'Erro ao atualizar perfil.' };
    }
  },

  /**
   * Altera senha
   */
  async alterarSenha(senhaAtual: string, novaSenha: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { alterarSenha } = await import('@/servicos/api');
      return alterarSenha(senhaAtual, novaSenha);
    }

    try {
      const supabase = getSupabase();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { sucesso: false, erro: 'Não autenticado.' };

      // Verifica senha atual fazendo login
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: senhaAtual,
      });

      if (verifyError) {
        return { sucesso: false, erro: 'Senha atual incorreta.' };
      }

      // Atualiza senha
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAuthService.alterarSenha] Erro:', error);
      return { sucesso: false, erro: 'Erro ao alterar senha.' };
    }
  },

  /**
   * Exclui conta (LGPD - chama Edge Function)
   */
  async excluirConta(): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { excluirConta } = await import('@/servicos/api');
      return excluirConta();
    }

    try {
      const supabase = getSupabase();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { sucesso: false, erro: 'Não autenticado.' };

      // Chama Edge Function para exclusão LGPD
      const { data, error } = await supabase.functions.invoke('lgpd-excluir-conta', {
        body: {
          confirmacao: 'CONFIRMO_EXCLUSAO_MINHA_CONTA_E_DADOS_PESSOAIS',
        },
      });

      if (error) {
        return { sucesso: false, erro: error.message || 'Erro ao excluir conta.' };
      }

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAuthService.excluirConta] Erro:', error);
      return { sucesso: false, erro: 'Erro ao excluir conta.' };
    }
  },

  /**
   * Valida token de sessão
   */
  async validarToken(): Promise<ResultadoServico<SessaoUsuario | null>> {
    if (isMockMode()) {
      const { validarToken } = await import('@/servicos/api');
      return validarToken();
    }

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return { sucesso: true, dados: null };

      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (perfilError || !perfil) return { sucesso: true, dados: null };

      const sessao = mapSessaoFromUser(perfil);
      return { sucesso: true, dados: sessao };
    } catch (error) {
      console.error('[SupabaseAuthService.validarToken] Erro:', error);
      return { sucesso: false, erro: 'Erro ao validar token.' };
    }
  },

  /**
   * Renova sessão
   */
  async renovarSessao(): Promise<ResultadoServico<SessaoUsuario | null>> {
    return this.obterSessao();
  },

  /**
   * Recupera senha
   */
  async recuperarSenha(email: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { recuperarSenha } = await import('@/servicos/api');
      return recuperarSenha(email);
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/resetar-senha`,
      });

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAuthService.recuperarSenha] Erro:', error);
      return { sucesso: false, erro: 'Erro ao enviar e-mail de recuperação.' };
    }
  },

  /**
   * Confirma e-mail
   */
  async confirmarEmail(): Promise<ResultadoServico<SessaoUsuario | null>> {
    if (isMockMode()) {
      const { confirmarEmail } = await import('@/servicos/api');
      return confirmarEmail();
    }

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) return { sucesso: false, erro: 'Token inválido ou expirado.' };

      const { data: perfil, error } = await supabase
        .from('usuarios')
        .update({ confirmado: true, data_atualizacao: new Date().toISOString() })
        .eq('id', session.user.id)
        .select()
        .single();

      if (error || !perfil) return { sucesso: false, erro: 'Erro ao confirmar e-mail.' };

      const sessao = mapSessaoFromUser(perfil);
      return { sucesso: true, dados: sessao };
    } catch (error) {
      console.error('[SupabaseAuthService.confirmarEmail] Erro:', error);
      return { sucesso: false, erro: 'Erro ao confirmar e-mail.' };
    }
  },

  /**
   * Login (alias para entrar)
   */
  async login(email: string, senha: string): Promise<ResultadoServico<SessaoUsuario>> {
    return this.entrar(email, senha);
  },

  /**
   * Cadastro unificado
   */
  async cadastrar(dados: {
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
    tipo: 'cliente' | 'barbeiro';
    estabelecimentoId?: string;
    nomeEstabelecimento?: string;
    responsavel?: string;
    cidade?: string;
    endereco?: string;
    whatsapp?: string;
    nicho?: NichoEstabelecimento;
  }): Promise<ResultadoServico<SessaoUsuario | { estabelecimentoId: string }>> {
    if (dados.tipo === 'cliente') {
      return this.cadastrarCliente({ nome: dados.nome, email: dados.email, senha: dados.senha });
    }
    return this.cadastrarProfissional({
      nomeEstabelecimento: dados.nomeEstabelecimento || '',
      responsavel: dados.responsavel || dados.nome,
      email: dados.email,
      senha: dados.senha,
      cidade: dados.cidade || '',
      endereco: dados.endereco || '',
      whatsapp: dados.whatsapp || '',
      nicho: dados.nicho || 'barbearia',
    });
  },

  /**
   * Obtém usuário por ID (admin)
   */
  async obterUsuarioAdmin(id: string): Promise<ResultadoServico<Usuario | null>> {
    if (isMockMode()) {
      const { obterUsuarioAdmin } = await import('@/servicos/api');
      return obterUsuarioAdmin(id);
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return { sucesso: false, erro: 'Usuário não encontrado.' };
      return { sucesso: true, dados: mapUsuarioRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseAuthService.obterUsuarioAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar usuário.' };
    }
  },

  /**
   * Atualiza usuário (admin)
   */
  async atualizarUsuarioAdmin(id: string, dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
    if (isMockMode()) {
      const { atualizarUsuarioAdmin } = await import('@/servicos/api');
      return atualizarUsuarioAdmin(id, dados);
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('usuarios')
        .update({
          papel: dados.papel,
          nome: dados.nome,
          bio: dados.bio,
          whatsapp: dados.whatsapp,
          cidade: dados.cidade,
          avatar: dados.avatar,
          estabelecimento_id: dados.estabelecimentoId,
          confirmado: dados.confirmado,
          lembretes_whatsapp: dados.lembretesWhatsapp,
          seguindo: dados.seguindo,
          inspiracao_salvas: dados.inspiracoesSalvas,
          cpf: dados.cpf,
          data_atualizacao: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) return { sucesso: false, erro: 'Erro ao atualizar usuário.' };
      return { sucesso: true, dados: mapUsuarioRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseAuthService.atualizarUsuarioAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao atualizar usuário.' };
    }
  },

  /**
   * Exclui usuário (admin)
   */
  async excluirUsuarioAdmin(id: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { excluirUsuarioAdmin } = await import('@/servicos/api');
      return excluirUsuarioAdmin(id);
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) return { sucesso: false, erro: error.message };

      // O trigger on_delete_anonimizar_usuario fará a anonimização dos dados
      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAuthService.excluirUsuarioAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao excluir usuário.' };
    }
  },

  /**
   * Lista usuários (admin)
   */
  async listarUsuariosAdmin(): Promise<ResultadoServico<Usuario[]>> {
    if (isMockMode()) {
      const { listarUsuariosAdmin } = await import('@/servicos/api');
      return listarUsuariosAdmin();
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('data_cadastro', { ascending: false });

      if (error) return { sucesso: false, erro: error.message };
      return { sucesso: true, dados: data.map(mapUsuarioRowToTipo) };
    } catch (error) {
      console.error('[SupabaseAuthService.listarUsuariosAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao listar usuários.' };
    }
  },
};

export default SupabaseAuthService;