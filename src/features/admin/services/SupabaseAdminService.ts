/**
 * Implementação Supabase do IAdminService.
 */

import { IAdminService } from './IAdminService';
import type { Usuario, Estabelecimento, PlanoAssinatura, AssinaturaEstabelecimento, StatusEstabelecimento, ResultadoServico } from '@/tipos';
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

function mapEstabelecimento(row: Record<string, unknown>): Estabelecimento {
  return {
    id: row.id as string,
    slug: row.slug as string,
    nome: row.nome as string,
    responsavel: row.responsavel as string,
    cidade: row.cidade as string,
    nicho: row.nicho as Estabelecimento['nicho'],
    avaliacao: Number(row.avaliacao) || 0,
    status: row.status as StatusEstabelecimento,
    latitude: Number(row.latitude) || 0,
    longitude: Number(row.longitude) || 0,
    whatsapp: row.whatsapp as string,
    endereco: row.endereco as string,
    sobre: row.sobre as string,
    tema: row.tema as Estabelecimento['tema'],
    servicos: (row.servicos as Estabelecimento['servicos']) || [],
    galeria: (row.galeria as Estabelecimento['galeria']) || [],
    fila: (row.fila as Estabelecimento['fila']) || [],
    tempoMedioAtendimento: Number(row.tempo_medio_atendimento) || 20,
    horarioFuncionamento: row.horario_funcionamento as string,
    permiteAutoEdicao: Boolean(row.permite_auto_edicao),
    configuracaoPix: row.configuracao_pix as Estabelecimento['configuracaoPix'],
    avaliacoes: (row.avaliacoes as Estabelecimento['avaliacoes']) || [],
    seguidores: Number(row.seguidores) || 0,
    taxaFidelidade: Number(row.taxa_fidelidade) || 0,
  };
}

function mapPlano(row: Record<string, unknown>): PlanoAssinatura {
  return {
    id: row.id as string,
    nome: row.nome as string,
    tipo: row.tipo as 'mensal' | 'diario',
    preco: Number(row.preco) || 0,
  };
}

export class SupabaseAdminService implements IAdminService {
  private supabase = getSupabaseClient();

  // Usuários
  async listarUsuarios(): Promise<ResultadoServico<Usuario[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('id, email, role, nome, bio, whatsapp, cidade, avatar, estabelecimento_id, confirmado, lembretes_whatsapp, seguindo, inspiracoes_salvas')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return sucesso((data || []).map(mapUsuario));
    } catch (error) {
      console.error('[SupabaseAdminService.listarUsuarios] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar usuários');
    }
  }

  async obterUsuario(id: string): Promise<ResultadoServico<Usuario | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('id, email, role, nome, bio, whatsapp, cidade, avatar, estabelecimento_id, confirmado, lembretes_whatsapp, seguindo, inspiracoes_salvas')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return sucesso(null);
        throw error;
      }

      return sucesso(data ? mapUsuario(data) : null);
    } catch (error) {
      console.error('[SupabaseAdminService.obterUsuario] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter usuário');
    }
  }

  async atualizarUsuario(id: string, dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const updateData: Record<string, unknown> = {};
      if (dados.nome !== undefined) updateData.nome = dados.nome;
      if (dados.bio !== undefined) updateData.bio = dados.bio;
      if (dados.whatsapp !== undefined) updateData.whatsapp = dados.whatsapp;
      if (dados.cidade !== undefined) updateData.cidade = dados.cidade;
      if (dados.avatar !== undefined) updateData.avatar = dados.avatar;
      if (dados.papel !== undefined) updateData.role = dados.papel;
      if (dados.estabelecimentoId !== undefined) updateData.estabelecimento_id = dados.estabelecimentoId;
      if (dados.confirmado !== undefined) updateData.confirmado = dados.confirmado;
      if (dados.lembretesWhatsapp !== undefined) updateData.lembretes_whatsapp = dados.lembretesWhatsapp;

      const { data, error } = await this.supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', id)
        .select('id, email, role, nome, bio, whatsapp, cidade, avatar, estabelecimento_id, confirmado, lembretes_whatsapp, seguindo, inspiracoes_salvas')
        .single();

      if (error) throw error;

      return sucesso(mapUsuario(data));
    } catch (error) {
      console.error('[SupabaseAdminService.atualizarUsuario] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar usuário');
    }
  }

  async excluirUsuario(id: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Nota: Exclusão do auth.users requer service role (edge function)
      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseAdminService.excluirUsuario] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao excluir usuário');
    }
  }

  // Estabelecimentos
  async listarEstabelecimentos(): Promise<ResultadoServico<Estabelecimento[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('estabelecimentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return sucesso((data || []).map(mapEstabelecimento));
    } catch (error) {
      console.error('[SupabaseAdminService.listarEstabelecimentos] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar estabelecimentos');
    }
  }

  async obterEstabelecimento(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('estabelecimentos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return sucesso(null);
        throw error;
      }

      return sucesso(data ? mapEstabelecimento(data) : null);
    } catch (error) {
      console.error('[SupabaseAdminService.obterEstabelecimento] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter estabelecimento');
    }
  }

  async aprovarEstabelecimento(id: string): Promise<ResultadoServico<void>> {
    return this.alterarStatusEstabelecimento(id, 'aprovado');
  }

  async rejeitarEstabelecimento(id: string): Promise<ResultadoServico<void>> {
    return this.alterarStatusEstabelecimento(id, 'rejeitado');
  }

  async suspenderEstabelecimento(id: string): Promise<ResultadoServico<void>> {
    return this.alterarStatusEstabelecimento(id, 'pendente');
  }

  async alterarStatusEstabelecimento(id: string, status: StatusEstabelecimento): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('estabelecimentos')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseAdminService.alterarStatusEstabelecimento] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao alterar status do estabelecimento');
    }
  }

  // Planos
  async listarPlanos(): Promise<ResultadoServico<PlanoAssinatura[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('planos')
        .select('id, nome, tipo, preco')
        .order('tipo', { ascending: true });

      if (error) throw error;

      return sucesso((data || []).map(mapPlano));
    } catch (error) {
      console.error('[SupabaseAdminService.listarPlanos] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar planos');
    }
  }

  async obterPlanos(): Promise<ResultadoServico<PlanoAssinatura[]>> {
    return this.listarPlanos();
  }

  async criarPlano(dados: Omit<PlanoAssinatura, 'id'>): Promise<ResultadoServico<PlanoAssinatura>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('planos')
        .insert({
          nome: dados.nome,
          tipo: dados.tipo,
          preco: dados.preco,
        })
        .select('id, nome, tipo, preco')
        .single();

      if (error) throw error;

      return sucesso(mapPlano(data));
    } catch (error) {
      console.error('[SupabaseAdminService.criarPlano] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao criar plano');
    }
  }

  async atualizarPlano(planoId: string, dados: Partial<PlanoAssinatura>): Promise<ResultadoServico<PlanoAssinatura>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const updateData: Record<string, unknown> = {};
      if (dados.nome !== undefined) updateData.nome = dados.nome;
      if (dados.tipo !== undefined) updateData.tipo = dados.tipo;
      if (dados.preco !== undefined) updateData.preco = dados.preco;

      const { data, error } = await this.supabase
        .from('planos')
        .update(updateData)
        .eq('id', planoId)
        .select('id, nome, tipo, preco')
        .single();

      if (error) throw error;

      return sucesso(mapPlano(data));
    } catch (error) {
      console.error('[SupabaseAdminService.atualizarPlano] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar plano');
    }
  }

  async excluirPlano(planoId: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('planos')
        .delete()
        .eq('id', planoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseAdminService.excluirPlano] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao excluir plano');
    }
  }

  // Assinaturas
  async listarAssinaturas(): Promise<ResultadoServico<Record<string, AssinaturaEstabelecimento>>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('assinaturas_estabelecimentos')
        .select(`
          estabelecimento_id,
          plano_id,
          inicio_contrato,
          vencimento,
          desconto,
          historico_pagamentos
        `);

      if (error) throw error;

      const assinaturas: Record<string, AssinaturaEstabelecimento> = {};
      (data || []).forEach(row => {
        assinaturas[row.estabelecimento_id] = {
          planoId: row.plano_id as string,
          inicioContrato: row.inicio_contrato as string,
          vencimento: row.vencimento as string,
          desconto: row.desconto as AssinaturaEstabelecimento['desconto'] | undefined,
          historicoPagamentos: (row.historico_pagamentos as AssinaturaEstabelecimento['historicoPagamentos']) || [],
        };
      });

      return sucesso(assinaturas);
    } catch (error) {
      console.error('[SupabaseAdminService.listarAssinaturas] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar assinaturas');
    }
  }

  async listarPagamentos(): Promise<ResultadoServico<Array<{ estabelecimento: string; data: string; valor: number; status: string }>>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('pagamentos')
        .select(`
          estabelecimento_id,
          data,
          valor,
          status,
          estabelecimentos:nome
        `)
        .order('data', { ascending: false });

      if (error) throw error;

      const pagamentos = (data || []).map(row => ({
        estabelecimento: (row.estabelecimentos as Record<string, unknown>)?.nome as string || row.estabelecimento_id,
        data: row.data as string,
        valor: Number(row.valor) || 0,
        status: row.status as string,
      }));

      return sucesso(pagamentos);
    } catch (error) {
      console.error('[SupabaseAdminService.listarPagamentos] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar pagamentos');
    }
  }
}