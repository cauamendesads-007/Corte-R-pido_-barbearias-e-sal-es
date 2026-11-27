/**
 * Implementação Supabase do IPerfilService.
 */

import { IPerfilService } from './IPerfilService';
import type { Usuario, ResultadoServico } from '@/tipos';
import { getSupabaseClient, isSupabaseAvailable } from '@/servicos/supabase/client';
import { sucesso, falha } from '@/servicos/api';

function mapUsuario(row: Record<string, unknown>): Usuario {
  return {
    id: row.id as string,
    email: row.email as string,
    senha: '',
    papel: row.role as 'cliente' | 'barbeiro' | 'admin',
    nome: row.nome as string | undefined,
    bio: row.bio as string | undefined,
    whatsapp: row.whatsapp as string | undefined,
    cidade: row.cidade as string | undefined,
    avatar: row.avatar as string | undefined,
    estabelecimentoId: row.estabelecimento_id as string | undefined,
    confirmado: Boolean(row.confirmado),
    lembretesWhatsapp: Boolean(row.lembretes_whatsapp),
    seguindo: (row.seguindo as string[]) || [],
    inspiracoesSalvas: (row.inspiracoes_salvas as string[]) || [],
  };
}

export class SupabasePerfilService implements IPerfilService {
  private supabase = getSupabaseClient();

  async obter(): Promise<ResultadoServico<Usuario | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError || !user) return sucesso(null);

      const { data, error } = await this.supabase
        .from('usuarios')
        .select('id, email, role, nome, bio, whatsapp, cidade, avatar, estabelecimento_id, confirmado, lembretes_whatsapp, seguindo, inspiracoes_salvas')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return sucesso(null);
        throw error;
      }

      return sucesso(data ? mapUsuario(data) : null);
    } catch (error) {
      console.error('[SupabasePerfilService.obter] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter perfil');
    }
  }

  async atualizar(dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
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
        .select('id, email, role, nome, bio, whatsapp, cidade, avatar, estabelecimento_id, confirmado, lembretes_whatsapp, seguindo, inspiracoes_salvas')
        .single();

      if (error) throw error;

      return sucesso(mapUsuario(data));
    } catch (error) {
      console.error('[SupabasePerfilService.atualizar] Erro:', error);
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
      console.error('[SupabasePerfilService.alterarSenha] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao alterar senha');
    }
  }

  async excluirConta(): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) return falha('Não autenticado');

      const { error: perfilError } = await this.supabase
        .from('usuarios')
        .delete()
        .eq('id', user.id);

      if (perfilError) throw perfilError;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabasePerfilService.excluirConta] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao excluir conta');
    }
  }
}