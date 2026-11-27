/**
 * Implementação Supabase do IEstabelecimentosService.
 * Usa a view v_estabelecimentos_publicos para evitar erro 42501 (REVOKE em configuracao_pix_chave).
 */

import { IEstabelecimentosService } from './IEstabelecimentosService';
import type {
  Estabelecimento,
  Servico,
  ItemGaleria,
  Avaliacao,
  ConfiguracaoPix,
  MensagemAutomatica,
  FiltrosBusca,
  ResultadoServico,
  StatusEstabelecimento,
  NichoEstabelecimento,
  TemaEstabelecimento,
} from '@/tipos';
import { getSupabaseClient, isSupabaseAvailable } from '@/servicos/supabase/client';
import { sucesso, falha } from '@/servicos/api';

// Colunas públicas permitidas na tabela estabelecimentos (exclui configuracao_pix_chave)
const COLUNAS_ESTABELECIMENTO_PUBLICO = `
  id,
  slug,
  nome,
  responsavel,
  cidade,
  nicho,
  avaliacao,
  status,
  latitude,
  longitude,
  whatsapp,
  endereco,
  sobre,
  tema,
  servicos,
  galeria,
  fila,
  tempo_medio_atendimento,
  horario_funcionamento,
  permite_auto_edicao,
  configuracao_pix,
  avaliacoes,
  seguidores,
  taxa_fidelidade,
  data_criacao
`;

/** Mapeia snake_case do banco para camelCase do domínio */
function mapEstabelecimento(row: Record<string, unknown>): Estabelecimento {
  return {
    id: row.id as string,
    slug: row.slug as string,
    nome: row.nome as string,
    responsavel: row.responsavel as string,
    cidade: row.cidade as string,
    nicho: row.nicho as NichoEstabelecimento,
    avaliacao: Number(row.avaliacao) || 0,
    status: row.status as StatusEstabelecimento,
    latitude: Number(row.latitude) || 0,
    longitude: Number(row.longitude) || 0,
    whatsapp: row.whatsapp as string,
    endereco: row.endereco as string,
    sobre: row.sobre as string,
    tema: row.tema as TemaEstabelecimento,
    servicos: (row.servicos as Servico[]) || [],
    galeria: (row.galeria as ItemGaleria[]) || [],
    fila: (row.fila as { nome: string; horarioChegada: string }[]) || [],
    tempoMedioAtendimento: Number(row.tempo_medio_atendimento) || 20,
    horarioFuncionamento: row.horario_funcionamento as string,
    permiteAutoEdicao: Boolean(row.permite_auto_edicao),
    configuracaoPix: row.configuracao_pix as ConfiguracaoPix,
    avaliacoes: (row.avaliacoes as Avaliacao[]) || [],
    seguidores: Number(row.seguidores) || 0,
    taxaFidelidade: Number(row.taxa_fidelidade) || 0,
  };
}

function mapServico(row: Record<string, unknown>): Servico {
  return {
    id: row.id as string,
    nome: row.nome as string,
    preco: Number(row.preco) || 0,
    duracaoMinutos: Number(row.duracao_minutos) || 30,
    tag: row.tag as string,
    midias: (row.midias as { tipo: 'imagem' | 'video'; src: string }[]) || [],
  };
}

function mapItemGaleria(row: Record<string, unknown>): ItemGaleria {
  return {
    id: row.id as string,
    src: row.src as string,
    tipo: row.tipo as 'imagem' | 'video' || 'imagem',
  };
}

function mapAvaliacao(row: Record<string, unknown>): Avaliacao {
  return {
    id: row.id as string,
    nomeCliente: row.nome_cliente as string,
    estrelas: Number(row.estrelas) || 0,
    comentario: row.comentario as string,
    data: row.data as string,
    resposta: row.resposta as string | undefined,
    avatar: row.avatar as string | undefined,
  };
}

export class SupabaseEstabelecimentosService implements IEstabelecimentosService {
  private supabase = getSupabaseClient();

  // Busca e listagem
  async buscar(filtros: FiltrosBusca): Promise<ResultadoServico<Estabelecimento[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      // Usa a view pública para evitar erro 42501 na coluna configuracao_pix_chave
      let query = this.supabase
        .from('v_estabelecimentos_publicos')
        .select(COLUNAS_ESTABELECIMENTO_PUBLICO)
        .eq('status', 'aprovado');

      if (filtros.nicho !== 'todos') {
        query = query.eq('nicho', filtros.nicho);
      }

      // Filtro de preço máximo (baseado no menor serviço)
      if (filtros.precoMaximo) {
        query = query.lte('preco_minimo', filtros.precoMaximo);
      }

      // Filtro de avaliação mínima
      if (filtros.avaliacaoMinima) {
        query = query.gte('avaliacao', filtros.avaliacaoMinima);
      }

      // Filtro de tipo de serviço
      if (filtros.tipoServico) {
        query = query.ilike('servicos', `%${filtros.tipoServico}%`);
      }

      // Filtro de bem avaliados
      if (filtros.apenasBemAvaliados) {
        query = query.gte('avaliacao', 4.8);
      }

      // Ordenação
      switch (filtros.ordenacao) {
        case 'avaliacao':
          query = query.order('avaliacao', { ascending: false });
          break;
        case 'preco':
          query = query.order('preco_minimo', { ascending: true });
          break;
        case 'fila':
          query = query.order('fila_count', { ascending: true });
          break;
        default:
          query = query.order('avaliacao', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      return sucesso((data || []).map(mapEstabelecimento));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.buscar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao buscar estabelecimentos');
    }
  }

  async obter(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('v_estabelecimentos_publicos')
        .select(COLUNAS_ESTABELECIMENTO_PUBLICO)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return sucesso(null); // Não encontrado
        throw error;
      }

      return sucesso(data ? mapEstabelecimento(data) : null);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.obter] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter estabelecimento');
    }
  }

  async obterPorSlug(slug: string): Promise<ResultadoServico<Estabelecimento | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('v_estabelecimentos_publicos')
        .select(COLUNAS_ESTABELECIMENTO_PUBLICO)
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return sucesso(null); // Não encontrado
        throw error;
      }

      return sucesso(data ? mapEstabelecimento(data) : null);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.obterPorSlug] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter estabelecimento por slug');
    }
  }

  // CRUD Estabelecimento
  async criar(dados: Omit<Estabelecimento, 'id' | 'slug' | 'avaliacao' | 'status' | 'seguidores' | 'taxaFidelidade'>): Promise<ResultadoServico<Estabelecimento>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const slug = dados.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data, error } = await this.supabase
        .from('estabelecimentos')
        .insert({
          slug,
          nome: dados.nome,
          responsavel: dados.responsavel,
          cidade: dados.cidade,
          nicho: dados.nicho,
          endereco: dados.endereco,
          whatsapp: dados.whatsapp,
          sobre: dados.sobre,
          latitude: dados.latitude,
          longitude: dados.longitude,
          tema: dados.tema,
          servicos: [],
          galeria: [],
          fila: [],
          tempo_medio_atendimento: dados.tempoMedioAtendimento,
          horario_funcionamento: dados.horarioFuncionamento,
          permite_auto_edicao: dados.permiteAutoEdicao,
          configuracao_pix: dados.configuracaoPix,
          avaliacoes: [],
          status: 'pendente',
          seguidores: 0,
          taxa_fidelidade: 0,
        })
        .select(COLUNAS_ESTABELECIMENTO_PUBLICO)
        .single();

      if (error) throw error;

      return sucesso(mapEstabelecimento(data));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.criar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao criar estabelecimento');
    }
  }

  async atualizar(id: string, dados: Partial<Estabelecimento>): Promise<ResultadoServico<Estabelecimento>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const updateData: Record<string, unknown> = {};

      if (dados.nome !== undefined) updateData.nome = dados.nome;
      if (dados.responsavel !== undefined) updateData.responsavel = dados.responsavel;
      if (dados.cidade !== undefined) updateData.cidade = dados.cidade;
      if (dados.nicho !== undefined) updateData.nicho = dados.nicho;
      if (dados.endereco !== undefined) updateData.endereco = dados.endereco;
      if (dados.whatsapp !== undefined) updateData.whatsapp = dados.whatsapp;
      if (dados.sobre !== undefined) updateData.sobre = dados.sobre;
      if (dados.latitude !== undefined) updateData.latitude = dados.latitude;
      if (dados.longitude !== undefined) updateData.longitude = dados.longitude;
      if (dados.tema !== undefined) updateData.tema = dados.tema;
      if (dados.servicos !== undefined) updateData.servicos = dados.servicos;
      if (dados.galeria !== undefined) updateData.galeria = dados.galeria;
      if (dados.fila !== undefined) updateData.fila = dados.fila;
      if (dados.tempoMedioAtendimento !== undefined) updateData.tempo_medio_atendimento = dados.tempoMedioAtendimento;
      if (dados.horarioFuncionamento !== undefined) updateData.horario_funcionamento = dados.horarioFuncionamento;
      if (dados.permiteAutoEdicao !== undefined) updateData.permite_auto_edicao = dados.permiteAutoEdicao;
      if (dados.configuracaoPix !== undefined) updateData.configuracao_pix = dados.configuracaoPix;
      if (dados.avaliacoes !== undefined) updateData.avaliacoes = dados.avaliacoes;
      if (dados.status !== undefined) updateData.status = dados.status;
      if (dados.seguidores !== undefined) updateData.seguidores = dados.seguidores;
      if (dados.taxaFidelidade !== undefined) updateData.taxa_fidelidade = dados.taxaFidelidade;

      const { data, error } = await this.supabase
        .from('estabelecimentos')
        .update(updateData)
        .eq('id', id)
        .select(COLUNAS_ESTABELECIMENTO_PUBLICO)
        .single();

      if (error) throw error;

      return sucesso(mapEstabelecimento(data));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.atualizar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar estabelecimento');
    }
  }

  async excluir(id: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('estabelecimentos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.excluir] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao excluir estabelecimento');
    }
  }

  // Configurações
  async atualizarConfiguracaoPix(id: string, config: ConfiguracaoPix): Promise<ResultadoServico<ConfiguracaoPix>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('estabelecimentos')
        .update({ configuracao_pix: config })
        .eq('id', id);

      if (error) throw error;

      return sucesso(config);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.atualizarConfiguracaoPix] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar configuração Pix');
    }
  }

  async atualizarMensagensAutomaticas(_id: string, _mensagens: MensagemAutomatica): Promise<ResultadoServico<MensagemAutomatica>> {
    // Mensagens automáticas são salvas em tabela separada em produção
    return falha('Não implementado');
  }

  async atualizarTema(id: string, tema: { cor?: string; layout?: string; titulo?: string; subtitulo?: string }): Promise<ResultadoServico<Estabelecimento>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const updateData: Record<string, unknown> = {};
      if (tema.cor !== undefined) updateData['tema->cor'] = tema.cor;
      if (tema.layout !== undefined) updateData['tema->layout'] = tema.layout;
      if (tema.titulo !== undefined) updateData['tema->titulo'] = tema.titulo;
      if (tema.subtitulo !== undefined) updateData['tema->subtitulo'] = tema.subtitulo;

      const { data, error } = await this.supabase
        .from('estabelecimentos')
        .update(updateData)
        .eq('id', id)
        .select(COLUNAS_ESTABELECIMENTO_PUBLICO)
        .single();

      if (error) throw error;

      return sucesso(mapEstabelecimento(data));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.atualizarTema] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar tema');
    }
  }

  async atualizarHorarioFuncionamento(id: string, horario: string): Promise<ResultadoServico<Estabelecimento>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('estabelecimentos')
        .update({ horario_funcionamento: horario })
        .eq('id', id)
        .select(COLUNAS_ESTABELECIMENTO_PUBLICO)
        .single();

      if (error) throw error;

      return sucesso(mapEstabelecimento(data));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.atualizarHorarioFuncionamento] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar horário de funcionamento');
    }
  }

  async definirAutoEdicao(id: string, permitido: boolean): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('estabelecimentos')
        .update({ permite_auto_edicao: permitido })
        .eq('id', id);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.definirAutoEdicao] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao definir auto-edição');
    }
  }

  // Serviços
  async listarServicos(estabelecimentoId: string): Promise<ResultadoServico<Servico[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('servicos')
        .select('id, nome, preco, duracao_minutos, tag, midias')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return sucesso((data || []).map(mapServico));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.listarServicos] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar serviços');
    }
  }

  async obterServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<Servico | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('servicos')
        .select('id, nome, preco, duracao_minutos, tag, midias')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('id', servicoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return sucesso(null);
        throw error;
      }

      return sucesso(data ? mapServico(data) : null);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.obterServico] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter serviço');
    }
  }

  async criarServico(estabelecimentoId: string, servico: Omit<Servico, 'id'>): Promise<ResultadoServico<Servico>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('servicos')
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome: servico.nome,
          preco: servico.preco,
          duracao_minutos: servico.duracaoMinutos,
          tag: servico.tag,
          midias: servico.midias || [],
        })
        .select('id, nome, preco, duracao_minutos, tag, midias')
        .single();

      if (error) throw error;

      return sucesso(mapServico(data));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.criarServico] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao criar serviço');
    }
  }

  async atualizarServico(estabelecimentoId: string, servicoId: string, dados: Partial<Servico>): Promise<ResultadoServico<Servico>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const updateData: Record<string, unknown> = {};
      if (dados.nome !== undefined) updateData.nome = dados.nome;
      if (dados.preco !== undefined) updateData.preco = dados.preco;
      if (dados.duracaoMinutos !== undefined) updateData.duracao_minutos = dados.duracaoMinutos;
      if (dados.tag !== undefined) updateData.tag = dados.tag;
      if (dados.midias !== undefined) updateData.midias = dados.midias;

      const { data, error } = await this.supabase
        .from('servicos')
        .update(updateData)
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('id', servicoId)
        .select('id, nome, preco, duracao_minutos, tag, midias')
        .single();

      if (error) throw error;

      return sucesso(mapServico(data));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.atualizarServico] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar serviço');
    }
  }

  async excluirServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('servicos')
        .delete()
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('id', servicoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.excluirServico] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao excluir serviço');
    }
  }

  async reordenarServicos(estabelecimentoId: string, servicoIds: string[]): Promise<ResultadoServico<Servico[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      // Atualiza ordem via update em lote
      for (let i = 0; i < servicoIds.length; i++) {
        const { error } = await this.supabase
          .from('servicos')
          .update({ ordem: i })
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('id', servicoIds[i]);
        if (error) throw error;
      }

      return this.listarServicos(estabelecimentoId);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.reordenarServicos] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao reordenar serviços');
    }
  }

  async adicionarMidiaServico(estabelecimentoId: string, servicoId: string, midia: { tipo: 'imagem' | 'video'; src: string }): Promise<ResultadoServico<Servico>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: servicoAtual, error: fetchError } = await this.supabase
        .from('servicos')
        .select('midias')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('id', servicoId)
        .single();

      if (fetchError) throw fetchError;

      const midias = (servicoAtual.midias as { tipo: 'imagem' | 'video'; src: string }[]) || [];
      midias.push(midia);

      const { data, error } = await this.supabase
        .from('servicos')
        .update({ midias })
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('id', servicoId)
        .select('id, nome, preco, duracao_minutos, tag, midias')
        .single();

      if (error) throw error;

      return sucesso(mapServico(data));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.adicionarMidiaServico] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao adicionar mídia ao serviço');
    }
  }

  async removerMidiaServico(estabelecimentoId: string, servicoId: string, midiaIndex: number): Promise<ResultadoServico<Servico>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: servicoAtual, error: fetchError } = await this.supabase
        .from('servicos')
        .select('midias')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('id', servicoId)
        .single();

      if (fetchError) throw fetchError;

      const midias = (servicoAtual.midias as { tipo: 'imagem' | 'video'; src: string }[]) || [];
      if (midiaIndex >= 0 && midiaIndex < midias.length) {
        midias.splice(midiaIndex, 1);
      }

      const { data, error } = await this.supabase
        .from('servicos')
        .update({ midias })
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('id', servicoId)
        .select('id, nome, preco, duracao_minutos, tag, midias')
        .single();

      if (error) throw error;

      return sucesso(mapServico(data));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.removerMidiaServico] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao remover mídia do serviço');
    }
  }

  // Galeria
  async listarGaleria(estabelecimentoId: string): Promise<ResultadoServico<ItemGaleria[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('galeria_estabelecimento')
        .select('id, src, tipo')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('ordem', { ascending: true });

      if (error) throw error;

      return sucesso((data || []).map(mapItemGaleria));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.listarGaleria] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar galeria');
    }
  }

  async adicionarGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('galeria_estabelecimento')
        .insert({
          estabelecimento_id: estabelecimentoId,
          src: item.src,
          tipo: item.tipo || 'imagem',
        })
        .select('id, src, tipo')
        .single();

      if (error) throw error;

      return sucesso(mapItemGaleria(data));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.adicionarGaleria] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao adicionar à galeria');
    }
  }

  async removerGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('galeria_estabelecimento')
        .delete()
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('id', itemId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.removerGaleria] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao remover da galeria');
    }
  }

  async reordenarGaleria(estabelecimentoId: string, itemIds: string[]): Promise<ResultadoServico<ItemGaleria[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      for (let i = 0; i < itemIds.length; i++) {
        const { error } = await this.supabase
          .from('galeria_estabelecimento')
          .update({ ordem: i })
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('id', itemIds[i]);
        if (error) throw error;
      }

      return this.listarGaleria(estabelecimentoId);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.reordenarGaleria] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao reordenar galeria');
    }
  }

  async adicionarMidiaGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>> {
    return this.adicionarGaleria(estabelecimentoId, item);
  }

  async removerMidiaGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>> {
    return this.removerGaleria(estabelecimentoId, itemId);
  }

  // Avaliações
  async listarAvaliacoes(estabelecimentoId: string): Promise<ResultadoServico<Avaliacao[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('avaliacoes')
        .select('id, nome_cliente, estrelas, comentario, data, resposta, avatar')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('data', { ascending: false });

      if (error) throw error;

      return sucesso((data || []).map(mapAvaliacao));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.listarAvaliacoes] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar avaliações');
    }
  }

  async responderAvaliacao(estabelecimentoId: string, avaliacaoId: string, resposta: string): Promise<ResultadoServico<Avaliacao>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('avaliacoes')
        .update({ resposta })
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('id', avaliacaoId)
        .select('id, nome_cliente, estrelas, comentario, data, resposta, avatar')
        .single();

      if (error) throw error;

      return sucesso(mapAvaliacao(data));
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.responderAvaliacao] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao responder avaliação');
    }
  }

  // Fila
  async obterFila(estabelecimentoId: string): Promise<ResultadoServico<{ fila: Array<{ nome: string; horarioChegada: string }>; esperaEstimada: number }>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('estabelecimentos')
        .select('fila, tempo_medio_atendimento')
        .eq('id', estabelecimentoId)
        .single();

      if (error) throw error;

      const fila = (data.fila as { nome: string; horarioChegada: string }[]) || [];
      const esperaEstimada = fila.length * (Number(data.tempo_medio_atendimento) || 15);

      return sucesso({ fila, esperaEstimada });
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.obterFila] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter fila');
    }
  }

  async entrarNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<{ posicao: number; esperaEstimada: number }>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const agora = new Date();
      const horario = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

      const { data: est, error: fetchError } = await this.supabase
        .from('estabelecimentos')
        .select('fila, tempo_medio_atendimento')
        .eq('id', estabelecimentoId)
        .single();

      if (fetchError) throw fetchError;

      const fila = (est.fila as { nome: string; horarioChegada: string }[]) || [];
      fila.push({ nome, horarioChegada: horario });

      const { error } = await this.supabase
        .from('estabelecimentos')
        .update({ fila })
        .eq('id', estabelecimentoId);

      if (error) throw error;

      const posicao = fila.length;
      const esperaEstimada = posicao * (Number(est.tempo_medio_atendimento) || 15);

      return sucesso({ posicao, esperaEstimada });
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.entrarNaFila] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao entrar na fila');
    }
  }

  async sairDaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: est, error: fetchError } = await this.supabase
        .from('estabelecimentos')
        .select('fila')
        .eq('id', estabelecimentoId)
        .single();

      if (fetchError) throw fetchError;

      const fila = (est.fila as { nome: string; horarioChegada: string }[]) || [];
      const idx = fila.findIndex((f) => f.nome === nome);
      if (idx === -1) return falha('Nome não encontrado na fila.');

      fila.splice(idx, 1);

      const { error } = await this.supabase
        .from('estabelecimentos')
        .update({ fila })
        .eq('id', estabelecimentoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.sairDaFila] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao sair da fila');
    }
  }

  async chamarProximo(estabelecimentoId: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: est, error: fetchError } = await this.supabase
        .from('estabelecimentos')
        .select('fila')
        .eq('id', estabelecimentoId)
        .single();

      if (fetchError) throw fetchError;

      const fila = (est.fila as { nome: string; horarioChegada: string }[]) || [];
      if (fila.length === 0) return falha('Fila vazia.');

      fila.shift();

      const { error } = await this.supabase
        .from('estabelecimentos')
        .update({ fila })
        .eq('id', estabelecimentoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.chamarProximo] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao chamar próximo');
    }
  }

  async adicionarPresencialNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>> {
    const result = await this.entrarNaFila(estabelecimentoId, nome);
    return result.sucesso ? sucesso(undefined) : falha(result.erro!);
  }

  async removerDaFila(estabelecimentoId: string, index: number): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: est, error: fetchError } = await this.supabase
        .from('estabelecimentos')
        .select('fila')
        .eq('id', estabelecimentoId)
        .single();

      if (fetchError) throw fetchError;

      const fila = (est.fila as { nome: string; horarioChegada: string }[]) || [];
      if (index >= 0 && index < fila.length) {
        fila.splice(index, 1);

        const { error } = await this.supabase
          .from('estabelecimentos')
          .update({ fila })
          .eq('id', estabelecimentoId);

        if (error) throw error;
      }

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.removerDaFila] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao remover da fila');
    }
  }
}