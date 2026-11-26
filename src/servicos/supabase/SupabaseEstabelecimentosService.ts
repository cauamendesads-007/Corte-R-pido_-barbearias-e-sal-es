// ============================================================================
// SUPABASE ESTABELECIMENTOS SERVICE
// Implementa interface de estabelecimentos usando Supabase
// ============================================================================

import { getSupabase, isMockMode } from './client';
import type { Database } from './types';
import type {
  ResultadoServico,
  Estabelecimento,
  Servico,
  ItemGaleria,
  Avaliacao,
  ConfiguracaoPix,
  FiltrosBusca,
  NichoEstabelecimento,
  StatusEstabelecimento,
  TipoLayout,
  PosicaoFila,
  MidiaServico,
} from '@/tipos';

type EstabelecimentoRow = Database['public']['Tables']['estabelecimentos']['Row'];
type EstabelecimentoInsert = Database['public']['Tables']['estabelecimentos']['Insert'];
type EstabelecimentoUpdate = Database['public']['Tables']['estabelecimentos']['Update'];
type ServicoRow = Database['public']['Tables']['servicos']['Row'];
type ServicoInsert = Database['public']['Tables']['servicos']['Insert'];
type ServicoUpdate = Database['public']['Tables']['servicos']['Update'];
type ServicoMidiasRow = Database['public']['Tables']['servico_midias']['Row'];
type ServicoMidiasInsert = Database['public']['Tables']['servico_midias']['Insert'];
type GaleriaRow = Database['public']['Tables']['galeria']['Row'];
type GaleriaInsert = Database['public']['Tables']['galeria']['Insert'];
type GaleriaUpdate = Database['public']['Tables']['galeria']['Update'];
type AvaliacaoRow = Database['public']['Tables']['avaliacoes']['Row'];
type AvaliacaoInsert = Database['public']['Tables']['avaliacoes']['Insert'];
type AvaliacaoUpdate = Database['public']['Tables']['avaliacoes']['Update'];
type VEstabelecimentosPublicosRow = Database['public']['Views']['v_estabelecimentos_publicos']['Row'];

// ============================================================================
// HELPERS DE MAPEAMENTO
// ============================================================================

function mapEstabelecimentoRowToTipo(row: EstabelecimentoRow | VEstabelecimentosPublicosRow): Estabelecimento {
  const servicos: Servico[] = (row as any).servicos || [];
  const galeria: ItemGaleria[] = (row as any).galeria || [];
  const avaliacoes: Avaliacao[] = (row as any).avaliacoes || [];
  const fila: PosicaoFila[] = (row as any).fila || [];

  return {
    id: row.id,
    slug: row.slug,
    nome: row.nome,
    responsavel: row.responsavel,
    cidade: row.cidade,
    nicho: row.nicho,
    avaliacao: row.avaliacao,
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    whatsapp: row.whatsapp,
    endereco: row.endereco,
    sobre: row.sobre || '',
    tema: {
      cor: row.tema_cor,
      layout: row.tema_layout,
      titulo: row.tema_titulo || '',
      subtitulo: row.tema_subtitulo || '',
    },
    servicos: servicos.map((s: any) => ({
      id: s.id,
      nome: s.nome,
      preco: s.preco_centavos / 100,
      duracaoMinutos: s.duracao_min,
      tag: s.tag,
      midias: (s.servico_midias || []).map((m: any) => ({ tipo: m.tipo, src: m.src })),
    })),
    galeria,
    fila,
    tempoMedioAtendimento: row.tempo_medio_atendimento,
    horarioFuncionamento: row.horario_funcionamento,
    permiteAutoEdicao: row.permite_auto_edicao,
    configuracaoPix: {
      modo: row.configuracao_pix_modo,
      chave: row.configuracao_pix_chave || '',
      percentualSinal: row.configuracao_pix_percentual_sinal,
    },
    avaliacoes,
    seguidores: row.seguidores,
    taxaFidelidade: row.taxa_fidelidade,
  };
}

function mapServicoRowToTipo(row: ServicoRow & { servico_midias?: ServicoMidiasRow[] }): Servico {
  return {
    id: row.id,
    nome: row.nome,
    preco: row.preco_centavos / 100,
    duracaoMinutos: row.duracao_min,
    tag: row.tag,
    midias: (row.servico_midias || []).map((m) => ({ tipo: m.tipo, src: m.src })),
  };
}

function mapGaleriaRowToTipo(row: GaleriaRow): ItemGaleria {
  return {
    id: row.id,
    src: row.src,
    tipo: row.tipo,
  };
}

function mapAvaliacaoRowToTipo(row: AvaliacaoRow): Avaliacao {
  return {
    id: row.id,
    nomeCliente: row.nome_cliente,
    estrelas: row.estrelas,
    comentario: row.comentario || '',
    data: row.data_criacao,
    resposta: row.resposta || undefined,
  };
}

// ============================================================================
// SERVICE
// ============================================================================

export const SupabaseEstabelecimentosService = {
  // ---------------------------------------------------------------------------
  // MARKETPLACE / PÚBLICO
  // ---------------------------------------------------------------------------

  /**
   * Listar estabelecimentos com filtros (público - apenas aprovados)
   */
  async listarEstabelecimentos(filtros: FiltrosBusca): Promise<ResultadoServico<Estabelecimento[]>> {
    if (isMockMode()) {
      const { listarEstabelecimentos } = await import('@/servicos/api');
      return listarEstabelecimentos(filtros);
    }

    try {
      const supabase = getSupabase();

      let query = supabase
        .from('v_estabelecimentos_publicos')
        .select('*');

      if (filtros.nicho !== 'todos') {
        query = query.eq('nicho', filtros.nicho);
      }

      // Preço máximo: filtra por serviços
      if (filtros.precoMaximo > 0) {
        // Usa subquery ou filtra depois
      }

      if (filtros.avaliacaoMinima > 0) {
        query = query.gte('avaliacao', filtros.avaliacaoMinima);
      }

      if (filtros.apenasBemAvaliados) {
        query = query.gte('avaliacao', 4.8);
      }

      // Ordenação
      switch (filtros.ordenacao) {
        case 'avaliacao':
          query = query.order('avaliacao', { ascending: false });
          break;
        case 'preco':
          // Ordenação por preço mínimo dos serviços - precisa de join
          query = query.order('avaliacao', { ascending: false }); // fallback
          break;
        case 'fila':
          query = query.order('seguidores', { ascending: true }); // proxy
          break;
        default:
          query = query.order('avaliacao', { ascending: false });
      }

      // Distância - se localização informada, calcula no JS
      const { data, error } = await query;

      if (error) return { sucesso: false, erro: error.message };

      let resultado = (data || []).map(mapEstabelecimentoRowToTipo);

      // Filtro por tipo de serviço (precisa buscar serviços)
      if (filtros.tipoServico) {
        const estIds = resultado.map(e => e.id);
        if (estIds.length > 0) {
          const { data: servicos } = await supabase
            .from('servicos')
            .select('estabelecimento_id')
            .eq('tag', filtros.tipoServico)
            .eq('ativo', true)
            .in('estabelecimento_id', estIds);

          const estComServico = new Set(servicos?.map(s => s.estabelecimento_id) || []);
          resultado = resultado.filter(e => estComServico.has(e.id));
        }
      }

      // Filtro por preço máximo
      if (filtros.precoMaximo > 0) {
        resultado = resultado.filter(e => {
          const precoMin = e.servicos.length ? Math.min(...e.servicos.map(s => s.preco)) : 0;
          return precoMin <= filtros.precoMaximo;
        });
      }

      // Distância
      if (filtros.localizacaoUsuario) {
        resultado = resultado.map(e => ({
          ...e,
          _distancia: calcularDistanciaKm(
            filtros.localizacaoUsuario!.latitude,
            filtros.localizacaoUsuario!.longitude,
            e.latitude,
            e.longitude
          ),
        })).sort((a, b) => (a._distancia || 0) - (b._distancia || 0));
      }

      // Vagas hoje - filtra estabelecimentos que têm horários disponíveis hoje
      if (filtros.apenasVagasHoje) {
        const hoje = new Date().toISOString().split('T')[0];
        const estIds = resultado.map(e => e.id);
        if (estIds.length > 0) {
          const { data: agendamentos } = await supabase
            .from('agendamentos')
            .select('estabelecimento_id')
            .eq('dia', hoje)
            .in('status', ['agendado', 'confirmado'])
            .in('estabelecimento_id', estIds);

          const estComVagas = new Set<string>();
          // Lógica simplificada: se tem menos de X agendamentos, tem vaga
          const contagem: Record<string, number> = {};
          agendamentos?.forEach(a => {
            contagem[a.estabelecimento_id] = (contagem[a.estabelecimento_id] || 0) + 1;
          });
          resultado.forEach(e => {
            if ((contagem[e.id] || 0) < 20) estComVagas.add(e.id); // threshold arbitrário
          });
          resultado = resultado.filter(e => estComVagas.has(e.id));
        }
      }

      return { sucesso: true, dados: resultado };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.listarEstabelecimentos] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar estabelecimentos.' };
    }
  },

  /**
   * Buscar estabelecimento por slug (público)
   */
  async buscarEstabelecimentoPorSlug(slug: string): Promise<ResultadoServico<Estabelecimento | null>> {
    if (isMockMode()) {
      const { buscarEstabelecimentoPorSlug } = await import('@/servicos/api');
      return buscarEstabelecimentoPorSlug(slug);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('v_estabelecimentos_publicos')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'aprovado')
        .maybeSingle();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: true, dados: null };

      // Busca serviços separadamente
      const { data: servicos } = await supabase
        .from('servicos')
        .select('*, servico_midias(*)')
        .eq('estabelecimento_id', data.id)
        .eq('ativo', true)
        .order('ordem_exibicao');

      // Busca galeria
      const { data: galeria } = await supabase
        .from('galeria')
        .select('*')
        .eq('estabelecimento_id', data.id)
        .order('ordem');

      // Busca avaliações
      const { data: avaliacoes } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('estabelecimento_id', data.id)
        .order('data_criacao', { ascending: false });

      const est = mapEstabelecimentoRowToTipo(data);
      est.servicos = (servicos || []).map(mapServicoRowToTipo);
      est.galeria = (galeria || []).map(mapGaleriaRowToTipo);
      est.avaliacoes = (avaliacoes || []).map(mapAvaliacaoRowToTipo);

      return { sucesso: true, dados: est };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.buscarEstabelecimentoPorSlug] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar estabelecimento.' };
    }
  },

  /**
   * Buscar estabelecimento por ID (barbeiro/admin - vê todos status)
   */
  async buscarEstabelecimentoPorId(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
    if (isMockMode()) {
      const { buscarEstabelecimentoPorId } = await import('@/servicos/api');
      return buscarEstabelecimentoPorId(id);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('estabelecimentos')
        .select('*, servicos(*, servico_midias(*)), galeria(*), avaliacoes(*)')
        .eq('id', id)
        .single();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: true, dados: null };

      const est = mapEstabelecimentoRowToTipo(data);
      est.servicos = (data.servicos || []).map(mapServicoRowToTipo);
      est.galeria = (data.galeria || []).map(mapGaleriaRowToTipo);
      est.avaliacoes = (data.avaliacoes || []).map(mapAvaliacaoRowToTipo);

      return { sucesso: true, dados: est };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.buscarEstabelecimentoPorId] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar estabelecimento.' };
    }
  },

  // ---------------------------------------------------------------------------
  // BARBEIRO - GERENCIAMENTO DO PRÓPRIO ESTABELECIMENTO
  // ---------------------------------------------------------------------------

  /**
   * Atualizar dados do estabelecimento (barbeiro dono)
   */
  async atualizarEstabelecimento(id: string, dados: Partial<Estabelecimento>): Promise<ResultadoServico<Estabelecimento>> {
    if (isMockMode()) {
      const { atualizarEstabelecimento } = await import('@/servicos/api');
      return atualizarEstabelecimento(id, dados);
    }

    try {
      const supabase = getSupabase();

      const updateData: EstabelecimentoUpdate = {
        nome: dados.nome,
        responsavel: dados.responsavel,
        cidade: dados.cidade,
        nicho: dados.nicho,
        whatsapp: dados.whatsapp,
        endereco: dados.endereco,
        sobre: dados.sobre,
        tema_cor: dados.tema?.cor,
        tema_layout: dados.tema?.layout,
        tema_titulo: dados.tema?.titulo,
        tema_subtitulo: dados.tema?.subtitulo,
        tempo_medio_atendimento: dados.tempoMedioAtendimento,
        horario_funcionamento: dados.horarioFuncionamento,
        permite_auto_edicao: dados.permiteAutoEdicao,
        configuracao_pix_modo: dados.configuracaoPix?.modo,
        configuracao_pix_chave: dados.configuracaoPix?.chave,
        configuracao_pix_percentual_sinal: dados.configuracaoPix?.percentualSinal,
        data_atualizacao: new Date().toISOString(),
      };

      // Remove campos undefined
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      const { data, error } = await supabase
        .from('estabelecimentos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: false, erro: 'Estabelecimento não encontrado.' };

      return { sucesso: true, dados: mapEstabelecimentoRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.atualizarEstabelecimento] Erro:', error);
      return { sucesso: false, erro: 'Erro ao atualizar estabelecimento.' };
    }
  },

  /**
   * Atualizar configuração Pix
   */
  async atualizarConfiguracaoPix(id: string, config: ConfiguracaoPix): Promise<ResultadoServico<ConfiguracaoPix>> {
    if (isMockMode()) {
      const { atualizarConfiguracaoPix } = await import('@/servicos/api');
      return atualizarConfiguracaoPix(id, config);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('estabelecimentos')
        .update({
          configuracao_pix_modo: config.modo,
          configuracao_pix_chave: config.chave,
          configuracao_pix_percentual_sinal: config.percentualSinal,
          data_atualizacao: new Date().toISOString(),
        })
        .eq('id', id)
        .select('configuracao_pix_modo, configuracao_pix_chave, configuracao_pix_percentual_sinal')
        .single();

      if (error) return { sucesso: false, erro: error.message };

      return {
        sucesso: true,
        dados: {
          modo: data.configuracao_pix_modo,
          chave: data.configuracao_pix_chave || '',
          percentualSinal: data.configuracao_pix_percentual_sinal,
        },
      };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.atualizarConfiguracaoPix] Erro:', error);
      return { sucesso: false, erro: 'Erro ao atualizar configuração Pix.' };
    }
  },

  /**
   * Atualizar mensagens automáticas (armazenaria em tabela separada ou JSONB)
   */
  async atualizarMensagensAutomaticas(id: string, mensagens: any): Promise<ResultadoServico<any>> {
    if (isMockMode()) {
      const { atualizarMensagensAutomaticas } = await import('@/servicos/api');
      return atualizarMensagensAutomaticas(id, mensagens);
    }

    // Em produção, salvaria em tabela mensagens_automaticas ou campo JSONB
    // Por enquanto retorna sucesso
    return { sucesso: true, dados: mensagens };
  },

  // ---------------------------------------------------------------------------
  // SERVIÇOS
  // ---------------------------------------------------------------------------

  /**
   * Listar serviços do estabelecimento
   */
  async listarServicos(estabelecimentoId: string): Promise<ResultadoServico<Servico[]>> {
    if (isMockMode()) {
      const { listarServicos } = await import('@/servicos/api');
      return listarServicos(estabelecimentoId);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('servicos')
        .select('*, servico_midias(*)')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('ordem_exibicao');

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data || []).map(mapServicoRowToTipo) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.listarServicos] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar serviços.' };
    }
  },

  /**
   * Obter serviço por ID
   */
  async obterServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<Servico | null>> {
    if (isMockMode()) {
      const { obterServico } = await import('@/servicos/api');
      return obterServico(estabelecimentoId, servicoId);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('servicos')
        .select('*, servico_midias(*)')
        .eq('id', servicoId)
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: true, dados: null };

      return { sucesso: true, dados: mapServicoRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.obterServico] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar serviço.' };
    }
  },

  /**
   * Criar serviço
   */
  async adicionarServico(estabelecimentoId: string, servico: Omit<Servico, 'id'>): Promise<ResultadoServico<Servico>> {
    if (isMockMode()) {
      const { adicionarServico } = await import('@/servicos/api');
      return adicionarServico(estabelecimentoId, servico);
    }

    try {
      const supabase = getSupabase();

      // Obtém próxima ordem
      const { data: maxOrdem } = await supabase
        .from('servicos')
        .select('ordem_exibicao')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('ordem_exibicao', { ascending: false })
        .limit(1);

      const proximaOrdem = (maxOrdem?.[0]?.ordem_exibicao || 0) + 1;

      const { data, error } = await supabase
        .from('servicos')
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome: servico.nome,
          descricao: servico.tag, // usando tag como descrição temporária
          preco_centavos: Math.round(servico.preco * 100),
          duracao_min: servico.duracaoMinutos,
          tag: servico.tag,
          ativo: true,
          ordem_exibicao: proximaOrdem,
        })
        .select('*, servico_midias(*)')
        .single();

      if (error) return { sucesso: false, erro: error.message };

      // Adiciona mídias se houver
      if (servico.midias && servico.midias.length > 0) {
        const midiasInsert = servico.midias.map((m, i) => ({
          servico_id: data.id,
          tipo: m.tipo,
          src: m.src,
          alt: null,
          thumbnail: null,
          ordem: i,
        }));
        await supabase.from('servico_midias').insert(midiasInsert);
      }

      // Recarrega com mídias
      const { data: servicoCompleto } = await supabase
        .from('servicos')
        .select('*, servico_midias(*)')
        .eq('id', data.id)
        .single();

      return { sucesso: true, dados: mapServicoRowToTipo(servicoCompleto!) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.adicionarServico] Erro:', error);
      return { sucesso: false, erro: 'Erro ao criar serviço.' };
    }
  },

  /**
   * Atualizar serviço
   */
  async atualizarServico(estabelecimentoId: string, servicoId: string, dados: Partial<Servico>): Promise<ResultadoServico<Servico>> {
    if (isMockMode()) {
      const { atualizarServico } = await import('@/servicos/api');
      return atualizarServico(estabelecimentoId, servicoId, dados);
    }

    try {
      const supabase = getSupabase();

      const updateData: ServicoUpdate = {
        nome: dados.nome,
        preco_centavos: dados.preco ? Math.round(dados.preco * 100) : undefined,
        duracao_min: dados.duracaoMinutos,
        tag: dados.tag,
        data_atualizacao: new Date().toISOString(),
      };
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      const { data, error } = await supabase
        .from('servicos')
        .update(updateData)
        .eq('id', servicoId)
        .eq('estabelecimento_id', estabelecimentoId)
        .select('*, servico_midias(*)')
        .single();

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: mapServicoRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.atualizarServico] Erro:', error);
      return { sucesso: false, erro: 'Erro ao atualizar serviço.' };
    }
  },

  /**
   * Excluir serviço
   */
  async excluirServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { excluirServico } = await import('@/servicos/api');
      return excluirServico(estabelecimentoId, servicoId);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('servicos')
        .delete()
        .eq('id', servicoId)
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.excluirServico] Erro:', error);
      return { sucesso: false, erro: 'Erro ao excluir serviço.' };
    }
  },

  /**
   * Reordenar serviços
   */
  async reordenarServicos(estabelecimentoId: string, servicoIds: string[]): Promise<ResultadoServico<Servico[]>> {
    if (isMockMode()) {
      const { reordenarServicos } = await import('@/servicos/api');
      return reordenarServicos(estabelecimentoId, servicoIds);
    }

    try {
      const supabase = getSupabase();

      const updates = servicoIds.map((id, index) =>
        supabase
          .from('servicos')
          .update({ ordem_exibicao: index + 1, data_atualizacao: new Date().toISOString() })
          .eq('id', id)
          .eq('estabelecimento_id', estabelecimentoId)
      );

      await Promise.all(updates);

      // Recarrega lista
      const { data } = await supabase
        .from('servicos')
        .select('*, servico_midias(*)')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('ordem_exibicao');

      return { sucesso: true, dados: (data || []).map(mapServicoRowToTipo) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.reordenarServicos] Erro:', error);
      return { sucesso: false, erro: 'Erro ao reordenar serviços.' };
    }
  },

  /**
   * Adicionar mídia ao serviço
   */
  async adicionarMidiaServico(estabelecimentoId: string, servicoId: string, midia: { tipo: 'imagem' | 'video'; src: string }): Promise<ResultadoServico<Servico>> {
    if (isMockMode()) {
      const { adicionarMidiaServico } = await import('@/servicos/api');
      return adicionarMidiaServico(estabelecimentoId, servicoId, midia);
    }

    try {
      const supabase = getSupabase();

      // Obtém próxima ordem
      const { data: maxOrdem } = await supabase
        .from('servico_midias')
        .select('ordem')
        .eq('servico_id', servicoId)
        .order('ordem', { ascending: false })
        .limit(1);

      const proximaOrdem = (maxOrdem?.[0]?.ordem || 0) + 1;

      const { error } = await supabase
        .from('servico_midias')
        .insert({
          servico_id: servicoId,
          tipo: midia.tipo,
          src: midia.src,
          alt: null,
          thumbnail: null,
          ordem: proximaOrdem,
        });

      if (error) return { sucesso: false, erro: error.message };

      // Recarrega serviço
      return this.obterServico(estabelecimentoId, servicoId) as Promise<ResultadoServico<Servico>>;
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.adicionarMidiaServico] Erro:', error);
      return { sucesso: false, erro: 'Erro ao adicionar mídia.' };
    }
  },

  /**
   * Remover mídia do serviço
   */
  async removerMidiaServico(estabelecimentoId: string, servicoId: string, midiaIndex: number): Promise<ResultadoServico<Servico>> {
    if (isMockMode()) {
      const { removerMidiaServico } = await import('@/servicos/api');
      return removerMidiaServico(estabelecimentoId, servicoId, midiaIndex);
    }

    try {
      const supabase = getSupabase();

      // Busca mídia pelo índice (ordem)
      const { data: midias } = await supabase
        .from('servico_midias')
        .select('id')
        .eq('servico_id', servicoId)
        .order('ordem');

      if (!midias || midiaIndex >= midias.length) {
        return { sucesso: false, erro: 'Mídia não encontrada.' };
      }

      const { error } = await supabase
        .from('servico_midias')
        .delete()
        .eq('id', midias[midiaIndex].id);

      if (error) return { sucesso: false, erro: error.message };

      // Recarrega serviço
      return this.obterServico(estabelecimentoId, servicoId) as Promise<ResultadoServico<Servico>>;
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.removerMidiaServico] Erro:', error);
      return { sucesso: false, erro: 'Erro ao remover mídia.' };
    }
  },

  // ---------------------------------------------------------------------------
  // GALERIA / PORTFÓLIO
  // ---------------------------------------------------------------------------

  /**
   * Adicionar item à galeria
   */
  async adicionarGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>> {
    if (isMockMode()) {
      const { adicionarGaleria } = await import('@/servicos/api');
      return adicionarGaleria(estabelecimentoId, item);
    }

    try {
      const supabase = getSupabase();

      const { data: maxOrdem } = await supabase
        .from('galeria')
        .select('ordem')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('ordem', { ascending: false })
        .limit(1);

      const proximaOrdem = (maxOrdem?.[0]?.ordem || 0) + 1;

      const { data, error } = await supabase
        .from('galeria')
        .insert({
          estabelecimento_id: estabelecimentoId,
          src: item.src,
          tipo: item.tipo || 'imagem',
          ordem: proximaOrdem,
        })
        .select()
        .single();

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: mapGaleriaRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.adicionarGaleria] Erro:', error);
      return { sucesso: false, erro: 'Erro ao adicionar à galeria.' };
    }
  },

  /**
   * Remover item da galeria
   */
  async removerGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { removerGaleria } = await import('@/servicos/api');
      return removerGaleria(estabelecimentoId, itemId);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('galeria')
        .delete()
        .eq('id', itemId)
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.removerGaleria] Erro:', error);
      return { sucesso: false, erro: 'Erro ao remover da galeria.' };
    }
  },

  /**
   * Reordenar galeria
   */
  async reordenarGaleria(estabelecimentoId: string, itemIds: string[]): Promise<ResultadoServico<ItemGaleria[]>> {
    if (isMockMode()) {
      const { reordenarGaleria } = await import('@/servicos/api');
      return reordenarGaleria(estabelecimentoId, itemIds);
    }

    try {
      const supabase = getSupabase();

      const updates = itemIds.map((id, index) =>
        supabase
          .from('galeria')
          .update({ ordem: index + 1 })
          .eq('id', id)
          .eq('estabelecimento_id', estabelecimentoId)
      );

      await Promise.all(updates);

      const { data } = await supabase
        .from('galeria')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('ordem');

      return { sucesso: true, dados: (data || []).map(mapGaleriaRowToTipo) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.reordenarGaleria] Erro:', error);
      return { sucesso: false, erro: 'Erro ao reordenar galeria.' };
    }
  },

  /**
   * Listar galeria
   */
  async listarGaleria(estabelecimentoId: string): Promise<ResultadoServico<ItemGaleria[]>> {
    if (isMockMode()) {
      const { listarGaleria } = await import('@/servicos/api');
      return listarGaleria(estabelecimentoId);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('galeria')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('ordem');

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data || []).map(mapGaleriaRowToTipo) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.listarGaleria] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar galeria.' };
    }
  },

  // ---------------------------------------------------------------------------
  // AVALIAÇÕES
  // ---------------------------------------------------------------------------

  /**
   * Listar avaliações do estabelecimento
   */
  async listarAvaliacoes(estabelecimentoId: string): Promise<ResultadoServico<Avaliacao[]>> {
    if (isMockMode()) {
      const { listarAvaliacoes } = await import('@/servicos/api');
      return listarAvaliacoes(estabelecimentoId);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('data_criacao', { ascending: false });

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data || []).map(mapAvaliacaoRowToTipo) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.listarAvaliacoes] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar avaliações.' };
    }
  },

  /**
   * Responder avaliação
   */
  async responderAvaliacao(estabelecimentoId: string, avaliacaoId: string, resposta: string): Promise<ResultadoServico<Avaliacao>> {
    if (isMockMode()) {
      const { responderAvaliacao } = await import('@/servicos/api');
      return responderAvaliacao(estabelecimentoId, avaliacaoId, resposta);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('avaliacoes')
        .update({ resposta, resposta_data: new Date().toISOString() })
        .eq('id', avaliacaoId)
        .eq('estabelecimento_id', estabelecimentoId)
        .select()
        .single();

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: mapAvaliacaoRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.responderAvaliacao] Erro:', error);
      return { sucesso: false, erro: 'Erro ao responder avaliação.' };
    }
  },

  // ---------------------------------------------------------------------------
  // FILA (TEMPO REAL)
  // ---------------------------------------------------------------------------

  /**
   * Entrar na fila
   */
  async entrarNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<{ posicao: number; esperaEstimada: number }>> {
    if (isMockMode()) {
      const { entrarNaFila } = await import('@/servicos/api');
      return entrarNaFila(estabelecimentoId, nome);
    }

    // Fila em tempo real seria melhor com Realtime + tabela fila_espera
    // Por enquanto usa RPC ou tabela simples
    try {
      const supabase = getSupabase();

      const { data: est } = await supabase
        .from('estabelecimentos')
        .select('tempo_medio_atendimento')
        .eq('id', estabelecimentoId)
        .single();

      // Simula entrada na fila (em produção usaria tabela fila_espera com Realtime)
      const posicao = 1; // TODO: implementar fila real
      const esperaEstimada = posicao * (est?.tempo_medio_atendimento || 20);

      return { sucesso: true, dados: { posicao, esperaEstimada } };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.entrarNaFila] Erro:', error);
      return { sucesso: false, erro: 'Erro ao entrar na fila.' };
    }
  },

  /**
   * Obter fila atual
   */
  async obterFila(estabelecimentoId: string): Promise<ResultadoServico<{ fila: PosicaoFila[]; esperaEstimada: number }>> {
    if (isMockMode()) {
      const { obterFila } = await import('@/servicos/api');
      return obterFila(estabelecimentoId);
    }

    // TODO: implementar com tabela fila_espera e Realtime
    return { sucesso: true, dados: { fila: [], esperaEstimada: 0 } };
  },

  /**
   * Chamar próximo da fila (barbeiro)
   */
  async chamarProximoFila(estabelecimentoId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { chamarProximoFila } = await import('@/servicos/api');
      return chamarProximoFila(estabelecimentoId);
    }

    // TODO: implementar com tabela fila_espera
    return { sucesso: true, dados: undefined };
  },

  /**
   * Remover da fila por índice (barbeiro)
   */
  async removerDaFila(estabelecimentoId: string, index: number): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { removerDaFila } = await import('@/servicos/api');
      return removerDaFila(estabelecimentoId, index);
    }

    return { sucesso: true, dados: undefined };
  },

  /**
   * Adicionar cliente presencial na fila (barbeiro)
   */
  async adicionarPresencialNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { adicionarPresencialNaFila } = await import('@/servicos/api');
      return adicionarPresencialNaFila(estabelecimentoId, nome);
    }

    return { sucesso: true, dados: undefined };
  },

  /**
   * Sair da fila (cliente)
   */
  async sairDaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { sairDaFila } = await import('@/servicos/api');
      return sairDaFila(estabelecimentoId, nome);
    }

    return { sucesso: true, dados: undefined };
  },

  // ---------------------------------------------------------------------------
  // TEMA E HORÁRIO
  // ---------------------------------------------------------------------------

  /**
   * Atualizar tema do estabelecimento
   */
  async atualizarTemaEstabelecimento(id: string, tema: { cor?: string; layout?: TipoLayout; titulo?: string; subtitulo?: string }): Promise<ResultadoServico<Estabelecimento>> {
    if (isMockMode()) {
      const { atualizarTemaEstabelecimento } = await import('@/servicos/api');
      return atualizarTemaEstabelecimento(id, tema);
    }

    return this.atualizarEstabelecimento(id, { tema } as any);
  },

  /**
   * Atualizar horário de funcionamento
   */
  async atualizarHorarioFuncionamento(id: string, horario: string): Promise<ResultadoServico<Estabelecimento>> {
    if (isMockMode()) {
      const { atualizarHorarioFuncionamento } = await import('@/servicos/api');
      return atualizarHorarioFuncionamento(id, horario);
    }

    return this.atualizarEstabelecimento(id, { horarioFuncionamento: horario } as any);
  },

  /**
   * Definir auto-edição
   */
  async definirAutoEdicao(estabelecimentoId: string, permitido: boolean): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { definirAutoEdicao } = await import('@/servicos/api');
      return definirAutoEdicao(estabelecimentoId, permitido);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('estabelecimentos')
        .update({ permite_auto_edicao: permitido, data_atualizacao: new Date().toISOString() })
        .eq('id', estabelecimentoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.definirAutoEdicao] Erro:', error);
      return { sucesso: false, erro: 'Erro ao definir auto-edição.' };
    }
  },

  // ---------------------------------------------------------------------------
  // ADMIN - CRIAR/EXCLUIR ESTABELECIMENTOS
  // ---------------------------------------------------------------------------

  /**
   * Criar estabelecimento (admin)
   */
  async criarEstabelecimento(dados: Omit<Estabelecimento, 'id' | 'slug' | 'avaliacao' | 'status' | 'seguidores' | 'taxaFidelidade'>): Promise<ResultadoServico<Estabelecimento>> {
    if (isMockMode()) {
      const { criarEstabelecimento } = await import('@/servicos/api');
      return criarEstabelecimento(dados);
    }

    try {
      const supabase = getSupabase();

      const baseSlug = dados.nome
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      let slug = baseSlug;
      let contador = 1;
      while (true) {
        const { data: existente } = await supabase
          .from('estabelecimentos')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        if (!existente) break;
        slug = `${baseSlug}-${contador++}`;
      }

      const corNicho: Record<NichoEstabelecimento, string> = {
        barbearia: '#B45309',
        feminino: '#E8508A',
        visagismo: '#7C3AED',
        infantil: '#FB923C',
      };

      const { data, error } = await supabase
        .from('estabelecimentos')
        .insert({
          slug,
          nome: dados.nome,
          responsavel: dados.responsavel,
          cidade: dados.cidade,
          nicho: dados.nicho,
          avaliacao: 0,
          status: 'aprovado',
          latitude: dados.latitude,
          longitude: dados.longitude,
          whatsapp: dados.whatsapp,
          endereco: dados.endereco,
          sobre: dados.sobre,
          tema_cor: dados.tema.cor,
          tema_layout: dados.tema.layout,
          tema_titulo: dados.tema.titulo,
          tema_subtitulo: dados.tema.subtitulo,
          tempo_medio_atendimento: dados.tempoMedioAtendimento,
          horario_funcionamento: dados.horarioFuncionamento,
          permite_auto_edicao: dados.permiteAutoEdicao,
          configuracao_pix_modo: dados.configuracaoPix.modo,
          configuracao_pix_chave: dados.configuracaoPix.chave,
          configuracao_pix_percentual_sinal: dados.configuracaoPix.percentualSinal,
          seguidores: 0,
          taxa_fidelidade: 0,
        })
        .select()
        .single();

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: mapEstabelecimentoRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.criarEstabelecimento] Erro:', error);
      return { sucesso: false, erro: 'Erro ao criar estabelecimento.' };
    }
  },

  /**
   * Excluir estabelecimento (admin)
   */
  async excluirEstabelecimento(id: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { excluirEstabelecimento } = await import('@/servicos/api');
      return excluirEstabelecimento(id);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('estabelecimentos')
        .delete()
        .eq('id', id);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.excluirEstabelecimento] Erro:', error);
      return { sucesso: false, erro: 'Erro ao excluir estabelecimento.' };
    }
  },

  /**
   * Obter estabelecimento (wrapper público)
   */
  async obterEstabelecimento(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
    return this.buscarEstabelecimentoPorId(id);
  },

  /**
   * Obter por slug (wrapper público)
   */
  async obterEstabelecimentoPorSlug(slug: string): Promise<ResultadoServico<Estabelecimento | null>> {
    return this.buscarEstabelecimentoPorSlug(slug);
  },

  /**
   * Buscar estabelecimentos (compatível com FiltrosBusca)
   */
  async buscarEstabelecimentos(filtros: FiltrosBusca): Promise<ResultadoServico<Estabelecimento[]>> {
    return this.listarEstabelecimentos(filtros);
  },

  /**
   * Listar serviços (wrapper)
   */
  async listarServicosWrapper(estabelecimentoId: string): Promise<ResultadoServico<Servico[]>> {
    return this.listarServicos(estabelecimentoId);
  },

  /**
   * Obter serviço (wrapper)
   */
  async obterServicoWrapper(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<Servico | null>> {
    return this.obterServico(estabelecimentoId, servicoId);
  },

  /**
   * Criar serviço (wrapper)
   */
  async criarServico(estabelecimentoId: string, servico: Omit<Servico, 'id'>): Promise<ResultadoServico<Servico>> {
    return this.adicionarServico(estabelecimentoId, servico);
  },

  /**
   * Adicionar mídia à galeria (wrapper)
   */
  async adicionarMidiaGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>> {
    return this.adicionarGaleria(estabelecimentoId, item);
  },

  /**
   * Remover mídia da galeria (wrapper)
   */
  async removerMidiaGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>> {
    return this.removerGaleria(estabelecimentoId, itemId);
  },

  /**
   * Chamar próximo (wrapper)
   */
  async chamarProximo(estabelecimentoId: string): Promise<ResultadoServico<void>> {
    return this.chamarProximoFila(estabelecimentoId);
  },

  /**
   * Adicionar avaliação
   */
  async adicionarAvaliacao(estabelecimentoId: string, avaliacao: Omit<Avaliacao, 'id'>): Promise<ResultadoServico<Avaliacao>> {
    if (isMockMode()) {
      const { adicionarAvaliacao } = await import('@/servicos/api');
      return adicionarAvaliacao(estabelecimentoId, avaliacao);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('avaliacoes')
        .insert({
          estabelecimento_id: estabelecimentoId,
          agendamento_id: null,
          usuario_id: null,
          nome_cliente: avaliacao.nomeCliente,
          estrelas: avaliacao.estrelas,
          comentario: avaliacao.comentario,
        })
        .select()
        .single();

      if (error) return { sucesso: false, erro: error.message };

      // Recalcula média
      const { data: avals } = await supabase
        .from('avaliacoes')
        .select('estrelas')
        .eq('estabelecimento_id', estabelecimentoId);

      if (avals && avals.length > 0) {
        const soma = avals.reduce((acc, a) => acc + a.estrelas, 0);
        const media = Number((soma / avals.length).toFixed(1));
        await supabase
          .from('estabelecimentos')
          .update({ avaliacao: media })
          .eq('id', estabelecimentoId);
      }

      return { sucesso: true, dados: mapAvaliacaoRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseEstabelecimentosService.adicionarAvaliacao] Erro:', error);
      return { sucesso: false, erro: 'Erro ao adicionar avaliação.' };
    }
  },
};

// ============================================================================
// FUNÇÃO AUXILIAR DE DISTÂNCIA
// ============================================================================

function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default SupabaseEstabelecimentosService;