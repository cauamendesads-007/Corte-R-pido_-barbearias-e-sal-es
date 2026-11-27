/**
 * Implementação Supabase do IBarbeiroService.
 */

import { IBarbeiroService } from './IBarbeiroService';
import type { Agendamento, StatusPagamento, StatusAgendamento, Estabelecimento, Servico, ItemGaleria, ResultadoServico, ConfiguracaoPix } from '@/tipos';
import { getSupabaseClient, isSupabaseAvailable } from '@/servicos/supabase/client';
import { sucesso, falha } from '@/servicos/api';

function mapAgendamento(row: Record<string, unknown>): Agendamento {
  return {
    id: row.id as string,
    estabelecimentoId: row.estabelecimento_id as string,
    usuarioId: row.usuario_id as string | undefined,
    dia: row.dia as string,
    horario: row.horario as string,
    duracaoMinutos: Number(row.duracao_minutos) || 30,
    nomeCliente: row.nome_cliente as string,
    telefoneCliente: row.telefone_cliente as string,
    servicos: row.servicos as string,
    valorTotal: Number(row.valor_total) || 0,
    statusPagamento: row.status_pagamento as StatusPagamento,
    status: row.status as StatusAgendamento,
    servicoIds: (row.servico_ids as string[]) || [],
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

function mapEstabelecimento(row: Record<string, unknown>): Estabelecimento {
  return {
    id: row.id as string,
    slug: row.slug as string,
    nome: row.nome as string,
    responsavel: row.responsavel as string,
    cidade: row.cidade as string,
    nicho: row.nicho as Estabelecimento['nicho'],
    avaliacao: Number(row.avaliacao) || 0,
    status: row.status as Estabelecimento['status'],
    latitude: Number(row.latitude) || 0,
    longitude: Number(row.longitude) || 0,
    whatsapp: row.whatsapp as string,
    endereco: row.endereco as string,
    sobre: row.sobre as string,
    tema: row.tema as Estabelecimento['tema'],
    servicos: (row.servicos as Servico[]) || [],
    galeria: (row.galeria as ItemGaleria[]) || [],
    fila: (row.fila as { nome: string; horarioChegada: string }[]) || [],
    tempoMedioAtendimento: Number(row.tempo_medio_atendimento) || 20,
    horarioFuncionamento: row.horario_funcionamento as string,
    permiteAutoEdicao: Boolean(row.permite_auto_edicao),
    configuracaoPix: row.configuracao_pix as ConfiguracaoPix,
    avaliacoes: (row.avaliacoes as Estabelecimento['avaliacoes']) || [],
    seguidores: Number(row.seguidores) || 0,
    taxaFidelidade: Number(row.taxa_fidelidade) || 0,
  };
}

export class SupabaseBarbeiroService implements IBarbeiroService {
  private supabase = getSupabaseClient();

  // Dashboard
  async obterDashboard(): Promise<ResultadoServico<{
    agendamentosHoje: number;
    proximosAgendamentos: Agendamento[];
    filaAtual: number;
    faturamentoMes: number;
  }>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) return falha('Não autenticado');

      const hoje = new Date().toISOString().split('T')[0];

      // Busca estabelecimento do barbeiro
      const { data: perfil } = await this.supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('id', user.id)
        .single();

      const estId = perfil?.estabelecimento_id;
      if (!estId) return falha('Estabelecimento não encontrado');

      // Agendamentos de hoje
      const { data: agendamentosHoje, error: agError } = await this.supabase
        .from('agendamentos')
        .select('id, estabelecimento_id, usuario_id, dia, horario, duracao_minutos, nome_cliente, telefone_cliente, servicos, valor_total, status_pagamento, status, servico_ids')
        .eq('estabelecimento_id', estId)
        .eq('dia', hoje)
        .in('status', ['agendado', 'confirmado', 'aguardando_pix']);

      if (agError) throw agError;

      // Próximos agendamentos
      const { data: proximos } = await this.supabase
        .from('agendamentos')
        .select('id, estabelecimento_id, usuario_id, dia, horario, duracao_minutos, nome_cliente, telefone_cliente, servicos, valor_total, status_pagamento, status, servico_ids')
        .eq('estabelecimento_id', estId)
        .gte('dia', hoje)
        .in('status', ['agendado', 'confirmado', 'aguardando_pix'])
        .order('dia', { ascending: true })
        .order('horario', { ascending: true })
        .limit(5);

      // Fila atual
      const { data: est } = await this.supabase
        .from('estabelecimentos')
        .select('fila, tempo_medio_atendimento')
        .eq('id', estId)
        .single();

      const fila = (est?.fila as { nome: string; horarioChegada: string }[]) || [];
      const filaAtual = fila.length;

      // Faturamento do mês
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const inicioMesStr = inicioMes.toISOString().split('T')[0];

      const { data: pagos } = await this.supabase
        .from('agendamentos')
        .select('valor_total')
        .eq('estabelecimento_id', estId)
        .eq('status_pagamento', 'pago')
        .gte('dia', inicioMesStr);

      const faturamentoMes = (pagos || []).reduce((sum, a) => sum + Number(a.valor_total || 0), 0);

      return sucesso({
        agendamentosHoje: (agendamentosHoje || []).length,
        proximosAgendamentos: (proximos || []).map(mapAgendamento),
        filaAtual,
        faturamentoMes,
      });
    } catch (error) {
      console.error('[SupabaseBarbeiroService.obterDashboard] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter dashboard');
    }
  }

  // Estatísticas
  async obterEstatisticas(): Promise<ResultadoServico<{
    totalAgendamentos: number;
    agendamentosConfirmados: number;
    agendamentosCancelados: number;
    agendamentosConcluidos: number;
    faturamentoTotal: number;
    ticketMedio: number;
    servicosMaisPopulares: Array<{ servico: string; quantidade: number }>;
    avaliacaoMedia: number;
  }>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) return falha('Não autenticado');

      const { data: perfil } = await this.supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('id', user.id)
        .single();

      const estId = perfil?.estabelecimento_id;
      if (!estId) return falha('Estabelecimento não encontrado');

      const { data: agendamentos } = await this.supabase
        .from('agendamentos')
        .select('status, status_pagamento, valor_total, servico_ids')
        .eq('estabelecimento_id', estId);

      if (!agendamentos) return sucesso({
        totalAgendamentos: 0,
        agendamentosConfirmados: 0,
        agendamentosCancelados: 0,
        agendamentosConcluidos: 0,
        faturamentoTotal: 0,
        ticketMedio: 0,
        servicosMaisPopulares: [],
        avaliacaoMedia: 0,
      });

      const totalAgendamentos = agendamentos.length;
      const agendamentosConfirmados = agendamentos.filter(a => a.status === 'confirmado').length;
      const agendamentosCancelados = agendamentos.filter(a => a.status === 'cancelado').length;
      const agendamentosConcluidos = agendamentos.filter(a => a.status === 'concluido').length;
      const faturamentoTotal = agendamentos
        .filter(a => a.status_pagamento === 'pago')
        .reduce((sum, a) => sum + Number(a.valor_total || 0), 0);
      const ticketMedio = agendamentosConfirmados > 0 ? faturamentoTotal / agendamentosConfirmados : 0;

      // Serviços mais populares
      const servicosCount: Record<string, number> = {};
      agendamentos.forEach(a => {
        (a.servico_ids as string[]).forEach(id => {
          servicosCount[id] = (servicosCount[id] || 0) + 1;
        });
      });

      // Busca nomes dos serviços
      const servicoIds = Object.keys(servicosCount);
      let servicosMaisPopulares: Array<{ servico: string; quantidade: number }> = [];
      if (servicoIds.length > 0) {
        const { data: servicos } = await this.supabase
          .from('servicos')
          .select('id, nome')
          .in('id', servicoIds);

        servicosMaisPopulares = Object.entries(servicosCount)
          .map(([id, qtd]) => ({
            servico: servicos?.find(s => s.id === id)?.nome || id,
            quantidade: qtd,
          }))
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 5);
      }

      // Avaliação média
      const { data: est } = await this.supabase
        .from('estabelecimentos')
        .select('avaliacao')
        .eq('id', estId)
        .single();

      return sucesso({
        totalAgendamentos,
        agendamentosConfirmados,
        agendamentosCancelados,
        agendamentosConcluidos,
        faturamentoTotal,
        ticketMedio,
        servicosMaisPopulares,
        avaliacaoMedia: Number(est?.avaliacao) || 0,
      });
    } catch (error) {
      console.error('[SupabaseBarbeiroService.obterEstatisticas] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter estatísticas');
    }
  }

  // Agendamentos do barbeiro
  async listarAgendamentos(estabelecimentoId: string, filtros?: {
    status?: StatusPagamento;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<ResultadoServico<Agendamento[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      let query = this.supabase
        .from('agendamentos')
        .select('id, estabelecimento_id, usuario_id, dia, horario, duracao_minutos, nome_cliente, telefone_cliente, servicos, valor_total, status_pagamento, status, servico_ids')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('dia', { ascending: true })
        .order('horario', { ascending: true });

      if (filtros?.status) {
        query = query.eq('status_pagamento', filtros.status);
      }

      if (filtros?.dataInicio) {
        query = query.gte('dia', filtros.dataInicio);
      }

      if (filtros?.dataFim) {
        query = query.lte('dia', filtros.dataFim);
      }

      const { data, error } = await query;

      if (error) throw error;

      return sucesso((data || []).map(mapAgendamento));
    } catch (error) {
      console.error('[SupabaseBarbeiroService.listarAgendamentos] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar agendamentos');
    }
  }

  async atualizarStatus(agendamentoId: string, status: StatusPagamento): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('agendamentos')
        .update({ status_pagamento: status })
        .eq('id', agendamentoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseBarbeiroService.atualizarStatus] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar status');
    }
  }

  async cancelar(agendamentoId: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('id', agendamentoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseBarbeiroService.cancelar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao cancelar agendamento');
    }
  }

  async definirHorarioReal(agendamentoId: string, horarioReal: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('agendamentos')
        .update({ horario: horarioReal, status: 'concluido' })
        .eq('id', agendamentoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseBarbeiroService.definirHorarioReal] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao definir horário real');
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
      console.error('[SupabaseBarbeiroService.listarServicos] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar serviços');
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
      console.error('[SupabaseBarbeiroService.criarServico] Erro:', error);
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
      console.error('[SupabaseBarbeiroService.atualizarServico] Erro:', error);
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
      console.error('[SupabaseBarbeiroService.excluirServico] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao excluir serviço');
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
      console.error('[SupabaseBarbeiroService.listarGaleria] Erro:', error);
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
      console.error('[SupabaseBarbeiroService.adicionarGaleria] Erro:', error);
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
      console.error('[SupabaseBarbeiroService.removerGaleria] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao remover da galeria');
    }
  }

  // Configurações do estabelecimento
  async obterEstabelecimento(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('v_estabelecimentos_publicos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return sucesso(null);
        throw error;
      }

      return sucesso(data ? mapEstabelecimento(data) : null);
    } catch (error) {
      console.error('[SupabaseBarbeiroService.obterEstabelecimento] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter estabelecimento');
    }
  }

  async atualizarEstabelecimento(id: string, dados: Partial<Estabelecimento>): Promise<ResultadoServico<Estabelecimento>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const updateData: Record<string, unknown> = {};
      if (dados.nome !== undefined) updateData.nome = dados.nome;
      if (dados.responsavel !== undefined) updateData.responsavel = dados.responsavel;
      if (dados.cidade !== undefined) updateData.cidade = dados.cidade;
      if (dados.endereco !== undefined) updateData.endereco = dados.endereco;
      if (dados.whatsapp !== undefined) updateData.whatsapp = dados.whatsapp;
      if (dados.sobre !== undefined) updateData.sobre = dados.sobre;
      if (dados.latitude !== undefined) updateData.latitude = dados.latitude;
      if (dados.longitude !== undefined) updateData.longitude = dados.longitude;
      if (dados.tema !== undefined) updateData.tema = dados.tema;
      if (dados.horarioFuncionamento !== undefined) updateData.horario_funcionamento = dados.horarioFuncionamento;
      if (dados.permiteAutoEdicao !== undefined) updateData.permite_auto_edicao = dados.permiteAutoEdicao;
      if (dados.configuracaoPix !== undefined) updateData.configuracao_pix = dados.configuracaoPix;

      const { data, error } = await this.supabase
        .from('estabelecimentos')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return sucesso(mapEstabelecimento(data));
    } catch (error) {
      console.error('[SupabaseBarbeiroService.atualizarEstabelecimento] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar estabelecimento');
    }
  }

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
      console.error('[SupabaseBarbeiroService.atualizarConfiguracaoPix] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar configuração Pix');
    }
  }

  async atualizarMensagensAutomaticas(id: string, mensagens: Record<string, unknown>): Promise<ResultadoServico<Record<string, unknown>>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('estabelecimentos')
        .update({ mensagens_automaticas: mensagens })
        .eq('id', id);

      if (error) throw error;

      return sucesso(mensagens);
    } catch (error) {
      console.error('[SupabaseBarbeiroService.atualizarMensagensAutomaticas] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar mensagens automáticas');
    }
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
        .select('*')
        .single();

      if (error) throw error;

      return sucesso(mapEstabelecimento(data));
    } catch (error) {
      console.error('[SupabaseBarbeiroService.atualizarTema] Erro:', error);
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
        .select('*')
        .single();

      if (error) throw error;

      return sucesso(mapEstabelecimento(data));
    } catch (error) {
      console.error('[SupabaseBarbeiroService.atualizarHorarioFuncionamento] Erro:', error);
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
      console.error('[SupabaseBarbeiroService.definirAutoEdicao] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao definir auto-edição');
    }
  }
}