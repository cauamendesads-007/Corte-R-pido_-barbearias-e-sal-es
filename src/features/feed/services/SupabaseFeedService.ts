/**
 * Implementação Supabase do IFeedService.
 */

import { IFeedService } from './IFeedService';
import type { Publicacao, TipoMidia, ResultadoServico } from '@/tipos';
import { getSupabaseClient, isSupabaseAvailable } from '@/servicos/supabase/client';
import { sucesso, falha } from '@/servicos/api';

function mapPublicacao(row: Record<string, unknown>): Publicacao {
  return {
    id: row.id as string,
    estabelecimentoId: row.estabelecimento_id as string,
    tipo: row.tipo as 'imagem' | 'video' | 'texto',
    src: row.src as string | undefined,
    legenda: row.legenda as string,
    tagServico: row.tag_servico as string | undefined,
    curtidas: (row.curtidas as string[]) || [],
    salvos: (row.salvos as string[]) || [],
    visualizacoes: Number(row.visualizacoes) || 0,
    compartilhamentos: Number(row.compartilhamentos) || 0,
    comentarios: (row.comentarios as { id: string; nomeAutor: string; texto: string; dataCriacao: number }[]) || [],
    dataCriacao: Number(row.data_criacao) || Date.now(),
    usuarioCurtiu: false,
    usuarioSalvou: false,
  };
}

export class SupabaseFeedService implements IFeedService {
  private supabase = getSupabaseClient();

  // Listagem
  async listar(filtros: { estabelecimentoId?: string; usuarioEmail?: string; filtro?: string }): Promise<ResultadoServico<Publicacao[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      let query = this.supabase
        .from('publicacoes')
        .select(`
          id,
          estabelecimento_id,
          tipo,
          src,
          legenda,
          tag_servico,
          curtidas,
          salvos,
          visualizacoes,
          compartilhamentos,
          comentarios,
          data_criacao
        `)
        .order('data_criacao', { ascending: false });

      if (filtros.estabelecimentoId) {
        query = query.eq('estabelecimento_id', filtros.estabelecimentoId);
      }

      if (filtros.filtro && filtros.filtro !== 'todos' && filtros.filtro !== 'salvos') {
        query = query.eq('tag_servico', filtros.filtro);
      }

      // Para 'salvos', precisamos filtrar por usuário - isso seria melhor com RPC
      if (filtros.filtro === 'salvos' && filtros.usuarioEmail) {
        // Busca IDs das publicações salvas pelo usuário
        const { data: salvas } = await this.supabase
          .from('publicacoes_salvas')
          .select('publicacao_id')
          .eq('usuario_email', filtros.usuarioEmail);

        if (salvas && salvas.length > 0) {
          const ids = salvas.map(s => s.publicacao_id);
          query = query.in('id', ids);
        } else {
          return sucesso([]);
        }
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      return sucesso((data || []).map(mapPublicacao));
    } catch (error) {
      console.error('[SupabaseFeedService.listar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar publicações');
    }
  }

  async obter(publicacaoId: string): Promise<ResultadoServico<Publicacao | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('publicacoes')
        .select(`
          id,
          estabelecimento_id,
          tipo,
          src,
          legenda,
          tag_servico,
          curtidas,
          salvos,
          visualizacoes,
          compartilhamentos,
          comentarios,
          data_criacao
        `)
        .eq('id', publicacaoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return sucesso(null);
        throw error;
      }

      return sucesso(data ? mapPublicacao(data) : null);
    } catch (error) {
      console.error('[SupabaseFeedService.obter] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter publicação');
    }
  }

  async obterSalvas(usuarioEmail: string): Promise<ResultadoServico<Publicacao[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: salvas, error: salvasError } = await this.supabase
        .from('publicacoes_salvas')
        .select('publicacao_id')
        .eq('usuario_email', usuarioEmail);

      if (salvasError) throw salvasError;

      if (!salvas || salvas.length === 0) return sucesso([]);

      const ids = salvas.map(s => s.publicacao_id);

      const { data, error } = await this.supabase
        .from('publicacoes')
        .select(`
          id,
          estabelecimento_id,
          tipo,
          src,
          legenda,
          tag_servico,
          curtidas,
          salvos,
          visualizacoes,
          compartilhamentos,
          comentarios,
          data_criacao
        `)
        .in('id', ids)
        .order('data_criacao', { ascending: false });

      if (error) throw error;

      return sucesso((data || []).map(mapPublicacao));
    } catch (error) {
      console.error('[SupabaseFeedService.obterSalvas] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter publicações salvas');
    }
  }

  // CRUD
  async criar(dados: {
    estabelecimentoId: string;
    tipo: TipoMidia;
    src: string;
    legenda: string;
    tagServico?: string;
  }): Promise<ResultadoServico<Publicacao>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('publicacoes')
        .insert({
          estabelecimento_id: dados.estabelecimentoId,
          tipo: dados.tipo,
          src: dados.src,
          legenda: dados.legenda,
          tag_servico: dados.tagServico || null,
          curtidas: [],
          salvos: [],
          visualizacoes: 0,
          compartilhamentos: 0,
          comentarios: [],
          data_criacao: Date.now(),
        })
        .select(`
          id,
          estabelecimento_id,
          tipo,
          src,
          legenda,
          tag_servico,
          curtidas,
          salvos,
          visualizacoes,
          compartilhamentos,
          comentarios,
          data_criacao
        `)
        .single();

      if (error) throw error;

      return sucesso(mapPublicacao(data));
    } catch (error) {
      console.error('[SupabaseFeedService.criar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao criar publicação');
    }
  }

  async excluir(publicacaoId: string, estabelecimentoId: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('publicacoes')
        .delete()
        .eq('id', publicacaoId)
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseFeedService.excluir] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao excluir publicação');
    }
  }

  // Interações
  async curtir(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ curtido: boolean; total: number }>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: pub, error: fetchError } = await this.supabase
        .from('publicacoes')
        .select('curtidas')
        .eq('id', publicacaoId)
        .single();

      if (fetchError) throw fetchError;

      const curtidas = (pub.curtidas as string[]) || [];
      const idx = curtidas.indexOf(usuarioEmail);
      let curtido: boolean;

      if (idx >= 0) {
        curtidas.splice(idx, 1);
        curtido = false;
      } else {
        curtidas.push(usuarioEmail);
        curtido = true;
      }

      const { error } = await this.supabase
        .from('publicacoes')
        .update({ curtidas })
        .eq('id', publicacaoId);

      if (error) throw error;

      return sucesso({ curtido, total: curtidas.length });
    } catch (error) {
      console.error('[SupabaseFeedService.curtir] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao curtir publicação');
    }
  }

  async salvar(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ salvo: boolean }>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: salvo } = await this.supabase
        .from('publicacoes_salvas')
        .select('id')
        .eq('publicacao_id', publicacaoId)
        .eq('usuario_email', usuarioEmail)
        .single();

      let salvoResult: boolean;

      if (salvo) {
        const { error } = await this.supabase
          .from('publicacoes_salvas')
          .delete()
          .eq('publicacao_id', publicacaoId)
          .eq('usuario_email', usuarioEmail);

        if (error) throw error;
        salvoResult = false;
      } else {
        const { error } = await this.supabase
          .from('publicacoes_salvas')
          .insert({
            publicacao_id: publicacaoId,
            usuario_email: usuarioEmail,
          });

        if (error) throw error;
        salvoResult = true;
      }

      return sucesso({ salvo: salvoResult });
    } catch (error) {
      console.error('[SupabaseFeedService.salvar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao salvar publicação');
    }
  }

  async compartilhar(publicacaoId: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: pub, error: fetchError } = await this.supabase
        .from('publicacoes')
        .select('compartilhamentos')
        .eq('id', publicacaoId)
        .single();

      if (fetchError) throw fetchError;

      const compartilhamentos = (Number(pub.compartilhamentos) || 0) + 1;

      const { error } = await this.supabase
        .from('publicacoes')
        .update({ compartilhamentos })
        .eq('id', publicacaoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseFeedService.compartilhar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao compartilhar publicação');
    }
  }

  async denunciar(publicacaoId: string, motivo: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('denuncias')
        .insert({
          publicacao_id: publicacaoId,
          motivo,
        });

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseFeedService.denunciar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao denunciar publicação');
    }
  }
}