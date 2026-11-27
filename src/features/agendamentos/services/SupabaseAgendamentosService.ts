/**
 * Implementação Supabase do IAgendamentosService.
 */

import { IAgendamentosService } from './IAgendamentosService';
import type { Agendamento, StatusPagamento, StatusAgendamento, AvaliacaoAgendamento, ResultadoServico } from '@/tipos';
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
    avaliacao: row.avaliacao && typeof row.avaliacao === 'object' ? {
      estrelas: Number((row.avaliacao as Record<string, unknown>).estrelas) || 0,
      comentario: (row.avaliacao as Record<string, unknown>).comentario as string | undefined,
      data: (row.avaliacao as Record<string, unknown>).data as string,
    } : undefined,
  };
}

export class SupabaseAgendamentosService implements IAgendamentosService {
  private supabase = getSupabaseClient();

  // Listagem
  async listar(filtros: { estabelecimentoId?: string; usuarioId?: string }): Promise<ResultadoServico<Agendamento[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      let query = this.supabase
        .from('agendamentos')
        .select(`
          id,
          estabelecimento_id,
          usuario_id,
          dia,
          horario,
          duracao_minutos,
          nome_cliente,
          telefone_cliente,
          servicos,
          valor_total,
          status_pagamento,
          status,
          servico_ids,
          avaliacao
        `)
        .order('dia', { ascending: true })
        .order('horario', { ascending: true });

      if (filtros.estabelecimentoId) {
        query = query.eq('estabelecimento_id', filtros.estabelecimentoId);
      }

      if (filtros.usuarioId) {
        query = query.eq('usuario_id', filtros.usuarioId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return sucesso((data || []).map(mapAgendamento));
    } catch (error) {
      console.error('[SupabaseAgendamentosService.listar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar agendamentos');
    }
  }

  async listarEstabelecimento(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>> {
    return this.listar({ estabelecimentoId });
  }

  async listarCliente(usuarioId: string): Promise<ResultadoServico<Agendamento[]>> {
    return this.listar({ usuarioId });
  }

  async listarBarbeiro(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>> {
    return this.listar({ estabelecimentoId });
  }

  async obter(agendamentoId: string): Promise<ResultadoServico<Agendamento | null>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('agendamentos')
        .select(`
          id,
          estabelecimento_id,
          usuario_id,
          dia,
          horario,
          duracao_minutos,
          nome_cliente,
          telefone_cliente,
          servicos,
          valor_total,
          status_pagamento,
          status,
          servico_ids,
          avaliacao
        `)
        .eq('id', agendamentoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return sucesso(null);
        throw error;
      }

      return sucesso(data ? mapAgendamento(data) : null);
    } catch (error) {
      console.error('[SupabaseAgendamentosService.obter] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter agendamento');
    }
  }

  async obterHorariosDisponiveis(estabelecimentoId: string, dia: string, duracaoMinutos: number): Promise<ResultadoServico<string[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      // Chama a função RPC do Supabase para calcular slots livres
      const { data, error } = await this.supabase.rpc('calcular_slots_livres', {
        p_estabelecimento_id: estabelecimentoId,
        p_dia: dia,
        p_duracao_minutos: duracaoMinutos,
      });

      if (error) throw error;

      return sucesso((data as string[]) || []);
    } catch (error) {
      console.error('[SupabaseAgendamentosService.obterHorariosDisponiveis] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter horários disponíveis');
    }
  }

  // CRUD
  async criar(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('agendamentos')
        .insert({
          estabelecimento_id: dados.estabelecimentoId,
          usuario_id: dados.usuarioId,
          dia: dados.dia,
          horario: dados.horario,
          duracao_minutos: dados.duracaoMinutos,
          nome_cliente: dados.nomeCliente,
          telefone_cliente: dados.telefoneCliente,
          servicos: dados.servicos,
          valor_total: dados.valorTotal,
          status_pagamento: dados.statusPagamento,
          status: dados.status,
          servico_ids: dados.servicoIds,
        })
        .select(`
          id,
          estabelecimento_id,
          usuario_id,
          dia,
          horario,
          duracao_minutos,
          nome_cliente,
          telefone_cliente,
          servicos,
          valor_total,
          status_pagamento,
          status,
          servico_ids,
          avaliacao
        `)
        .single();

      if (error) throw error;

      return sucesso(mapAgendamento(data));
    } catch (error) {
      console.error('[SupabaseAgendamentosService.criar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao criar agendamento');
    }
  }

  async criarWrapper(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>> {
    return this.criar(dados);
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
      console.error('[SupabaseAgendamentosService.cancelar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao cancelar agendamento');
    }
  }

  async cancelarWrapper(agendamentoId: string): Promise<ResultadoServico<void>> {
    return this.cancelar(agendamentoId);
  }

  async reagendar(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { data, error } = await this.supabase
        .from('agendamentos')
        .update({ dia: novoDia, horario: novoHorario })
        .eq('id', agendamentoId)
        .select(`
          id,
          estabelecimento_id,
          usuario_id,
          dia,
          horario,
          duracao_minutos,
          nome_cliente,
          telefone_cliente,
          servicos,
          valor_total,
          status_pagamento,
          status,
          servico_ids,
          avaliacao
        `)
        .single();

      if (error) throw error;

      return sucesso(mapAgendamento(data));
    } catch (error) {
      console.error('[SupabaseAgendamentosService.reagendar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao reagendar agendamento');
    }
  }

  async reagendarWrapper(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>> {
    return this.reagendar(agendamentoId, novoDia, novoHorario);
  }

  // Ações
  async confirmarPresenca(agendamentoId: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('agendamentos')
        .update({ status: 'confirmado' })
        .eq('id', agendamentoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseAgendamentosService.confirmarPresenca] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao confirmar presença');
    }
  }

  async confirmarPagamentoPix(agendamentoId: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('agendamentos')
        .update({ status_pagamento: 'pago' })
        .eq('id', agendamentoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseAgendamentosService.confirmarPagamentoPix] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao confirmar pagamento Pix');
    }
  }

  async avaliar(agendamentoId: string, nota: number, comentario?: string): Promise<ResultadoServico<AvaliacaoAgendamento>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const avaliacao: AvaliacaoAgendamento = {
        estrelas: nota,
        comentario,
        data: new Date().toISOString().split('T')[0],
      };

      const { error } = await this.supabase
        .from('agendamentos')
        .update({ avaliacao, status: 'concluido' })
        .eq('id', agendamentoId);

      if (error) throw error;

      return sucesso(avaliacao);
    } catch (error) {
      console.error('[SupabaseAgendamentosService.avaliar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao avaliar agendamento');
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
      console.error('[SupabaseAgendamentosService.atualizarStatus] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao atualizar status');
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
      console.error('[SupabaseAgendamentosService.definirHorarioReal] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao definir horário real');
    }
  }
}