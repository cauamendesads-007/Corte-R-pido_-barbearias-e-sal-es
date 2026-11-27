/**
 * Implementação Supabase do IAuthService.
 * Usa Supabase Auth para autenticação real.
 */

import { IAuthService } from './IAuthService';
import type { Usuario, SessaoUsuario, ResultadoServico } from '@/tipos';
import { getSupabaseClient, isSupabaseAvailable } from '@/servicos/supabase/client';
import { sucesso, falha } from '@/servicos/api';

function mapUsuario(user: Record<string, unknown>): Usuario {
  return {
    id: user.id as string,
    email: user.email as string,
    senha: '', // Não expomos hash
    papel: (user.role as 'cliente' | 'barbeiro' | 'admin') || 'cliente',
    nome: user.nome as string | undefined,
    bio: user.bio as string | undefined,
    whatsapp: user.whatsapp as string | undefined,
    cidade: user.cidade as string | undefined,
    avatar: user.avatar as string | undefined,
    estabelecimentoId: user.estabelecimento_id as string | undefined,
    confirmado: Boolean(user.confirmado),
    lembretesWhatsapp: Boolean(user.lembretes_whatsapp),
    seguindo: (user.seguindo as string[]) || [],
    inspiracoesSalvas: (user.inspiracoes_salvas as string[]) || [],
  };
}

function mapSessao(user: Record<string, unknown>): SessaoUsuario {
  return {
    papel: (user.role as 'cliente' | 'barbeiro' | 'admin') || 'cliente',
    email: user.email as string,
    estabelecimentoId: user.estabelecimento_id as string | undefined,
    nome: user.nome as string,
  };
}

export class SupabaseAuthService implements IAuthService {
  private supabase = getSupabaseClient();

  async login(email: string, senha: string): Promise<ResultadoServico<SessaoUsuario>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) throw error;

      if (!data.user) return falha('Credenciais inválidas');

      // Busca perfil do usuário
      const { data: perfil, error: perfilError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (perfilError && perfilError.code !== 'PGRST116') throw perfilError;

      if (!perfil || !perfil.confirmado) {
        return falha('Conta não confirmada. Verifique seu e-mail.');
      }

      return sucesso(mapSessao(perfil));
    } catch (error) {
      console.error('[SupabaseAuthService.login] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao fazer login');
    }
  }

  async cadastrarCliente(dados: {
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
  }): Promise<ResultadoServico<SessaoUsuario>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: dados.email,
        password: dados.senha,
        options: {
          data: {
            nome: dados.nome,
            telefone: dados.telefone,
            papel: 'cliente',
          },
        },
      });

      if (error) throw error;

      if (!data.user) return falha('Erro ao criar usuário');

      // O perfil é criado via trigger no banco
      // Aguarda confirmação de e-mail
      return sucesso({
        papel: 'cliente',
        email: dados.email,
        nome: dados.nome,
      });
    } catch (error) {
      console.error('[SupabaseAuthService.cadastrarCliente] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao cadastrar cliente');
    }
  }

  async cadastrarProfissional(dados: {
    nomeEstabelecimento: string;
    responsavel: string;
    cidade: string;
    endereco: string;
    whatsapp: string;
    nicho: string;
    email: string;
    senha: string;
  }): Promise<ResultadoServico<SessaoUsuario>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: dados.email,
        password: dados.senha,
        options: {
          data: {
            nome: dados.responsavel,
            whatsapp: dados.whatsapp,
            papel: 'barbeiro',
          },
        },
      });

      if (error) throw error;

      if (!data.user) return falha('Erro ao criar usuário');

      // Cria estabelecimento via RPC
      const slug = dados.nomeEstabelecimento
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { error: estError } = await this.supabase.rpc('criar_estabelecimento_profissional', {
        p_usuario_id: data.user.id,
        p_slug: slug,
        p_nome: dados.nomeEstabelecimento,
        p_responsavel: dados.responsavel,
        p_cidade: dados.cidade,
        p_endereco: dados.endereco,
        p_whatsapp: dados.whatsapp,
        p_nicho: dados.nicho,
      });

      if (estError) throw estError;

      return sucesso({
        papel: 'barbeiro',
        email: dados.email,
        estabelecimentoId: slug,
        nome: dados.responsavel,
      });
    } catch (error) {
      console.error('[SupabaseAuthService.cadastrarProfissional] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao cadastrar profissional');
    }
  }

  async sair(): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseAuthService.sair] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao sair');
    }
  }

  async obterSessao(): Promise<ResultadoServico<Usuario | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError || !user) return sucesso(null);

      const { data: perfil, error: perfilError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (perfilError) {
        if (perfilError.code === 'PGRST116') return sucesso(null);
        throw perfilError;
      }

      return sucesso(mapUsuario(perfil));
    } catch (error) {
      console.error('[SupabaseAuthService.obterSessao] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter sessão');
    }
  }

  async atualizarPerfilCliente(dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) return falha('Não autenticado');

      const updateData: Record<string, unknown> = {};
      if (dados.nome !== undefined) updateData.nome = dados.nome;
      if (dados.bio !== undefined) updateData.bio = dados.bio;
      if (dados.whatsapp !== undefined) updateData.whatsapp = dados.whatsapp;
      if (dados.cidade !== undefined) updateData.cidade = dados.cidade;
      if (dados.avatar !== undefined) updateData.avatar = dados.avatar;
      if (dados.lembretesWhatsapp !== undefined) updateData.lembretes_whatsapp = dados.lembretesWhatsapp;

      const { data, error } = await this.supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', user.id)
        .select('*')
        .single();

      if (error) throw error;

      return sucesso(mapUsuario(data));
    } catch (error) {
      console.error('[SupabaseAuthService.atualizarPerfilCliente] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar perfil');
    }
  }

  async alterarSenha(_senhaAtual: string, novaSenha: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase.auth.updateUser({
        password: novaSenha,
      });

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseAuthService.alterarSenha] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao alterar senha');
    }
  }

  async excluirConta(): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) return falha('Não autenticado');

      // Exclui perfil
      const { error: perfilError } = await this.supabase
        .from('usuarios')
        .delete()
        .eq('id', user.id);

      if (perfilError) throw perfilError;

      // Exclui usuário do auth (requer service role)
      // Em produção, usaria uma edge function
      const { error } = await this.supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseAuthService.excluirConta] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao excluir conta');
    }
  }

  async validarToken(token: string): Promise<ResultadoServico<SessaoUsuario | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data.user) return sucesso(null);

      const { data: perfil, error: perfilError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (perfilError) return sucesso(null);

      return sucesso(mapSessao(perfil));
    } catch (error) {
      console.error('[SupabaseAuthService.validarToken] Erro:', error);
      return sucesso(null);
    }
  }

  async renovarSessao(): Promise<ResultadoServico<SessaoUsuario | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error || !data.session?.user) return sucesso(null);

      const { data: perfil, error: perfilError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      if (perfilError) return sucesso(null);

      return sucesso(mapSessao(perfil));
    } catch (error) {
      console.error('[SupabaseAuthService.renovarSessao] Erro:', error);
      return sucesso(null);
    }
  }

  async recuperarSenha(email: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseAuthService.recuperarSenha] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao solicitar recuperação de senha');
    }
  }

  async confirmarEmail(token: string): Promise<ResultadoServico<SessaoUsuario | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup',
      });

      if (error) throw error;

      if (!data.user) return falha('Token inválido ou expirado');

      const { data: perfil, error: perfilError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (perfilError) throw perfilError;

      return sucesso(mapSessao(perfil));
    } catch (error) {
      console.error('[SupabaseAuthService.confirmarEmail] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao confirmar e-mail');
    }
  }
}