// ============================================================================
// SUPABASE AGENDAMENTOS SERVICE
// Implementa interface de agendamentos usando Supabase
// ============================================================================

import { getSupabase, isMockMode } from './client';
import type { Database } from './types';
import type {
  ResultadoServico,
  Agendamento,
  StatusAgendamento,
  StatusPagamento,
} from '@/tipos';

type AgendamentoRow = Database['public']['Tables']['agendamentos']['Row'];
type AgendamentoInsert = Database['public']['Tables']['agendamentos']['Insert'];
type AgendamentoUpdate = Database['public']['Tables']['agendamentos']['Update'];
type VAgendamentosDetalhadosRow = Database['public']['Views']['v_agendamentos_detalhados']['Row'];
type RpcSlotsDisponiveisResult = Database['public']['Functions']['rpc_slots_disponiveis']['Returns'][0];
type RpcCriarAgendamentoResult = Database['public']['Functions']['rpc_criar_agendamento']['Returns'][0];

// ============================================================================
// HELPERS DE MAPEAMENTO
// ============================================================================

function mapAgendamentoRowToTipo(row: AgendamentoRow | VAgendamentosDetalhadosRow): Agendamento {
  return {
    id: row.id,
    estabelecimentoId: row.estabelecimento_id,
    usuarioId: row.usuario_id,
    dia: row.dia,
    horario: row.horario,
    duracaoMinutos: row.duracao_min,
    nomeCliente: row.nome_cliente,
    telefoneCliente: row.telefone_cliente,
    servicos: row.servicos,
    valorTotal: row.valor_total_centavos / 100,
    statusPagamento: row.status_pagamento,
    status: row.status,
    servicoIds: row.servico_ids || [],
    observacoes: row.observacoes,
    avaliacao: row.avaliacao_estrelas ? {
      estrelas: row.avaliacao_estrelas,
      comentario: row.avaliacao_comentario || undefined,
      data: row.avaliacao_data || new Date().toISOString().split('T')[0],
    } : undefined,
  };
}

// ============================================================================
// SERVICE
// ============================================================================

export const SupabaseAgendamentosService = {
  // ---------------------------------------------------------------------------
  // LISTAGENS
  // ---------------------------------------------------------------------------

  /**
   * Listar agendamentos do estabelecimento (barbeiro/admin)
   */
  async listarAgendamentosEstabelecimento(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>> {
    if (isMockMode()) {
      const { listarAgendamentosEstabelecimento } = await import('@/servicos/api');
      return listarAgendamentosEstabelecimento(estabelecimentoId);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('v_agendamentos_detalhados')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('dia', { ascending: true })
        .order('horario', { ascending: true });

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data || []).map(mapAgendamentoRowToTipo) };
    } catch (error) {
      console.error('[SupabaseAgendamentosService.listarAgendamentosEstabelecimento] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar agendamentos.' };
    }
  },

  /**
   * Listar agendamentos do cliente
   */
  async listarAgendamentosCliente(usuarioId: string): Promise<ResultadoServico<Agendamento[]>> {
    if (isMockMode()) {
      const { listarAgendamentosCliente } = await import('@/servicos/api');
      return listarAgendamentosCliente(usuarioId);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('v_agendamentos_detalhados')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('dia', { ascending: true })
        .order('horario', { ascending: true });

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data || []).map(mapAgendamentoRowToTipo) };
    } catch (error) {
      console.error('[SupabaseAgendamentosService.listarAgendamentosCliente] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar agendamentos.' };
    }
  },

  /**
   * Listar agendamentos (unificado - por estabelecimento ou cliente)
   */
  async listarAgendamentos(filtros: { estabelecimentoId?: string; usuarioId?: string }): Promise<ResultadoServico<Agendamento[]>> {
    if (filtros.estabelecimentoId) {
      return this.listarAgendamentosEstabelecimento(filtros.estabelecimentoId);
    }
    if (filtros.usuarioId) {
      return this.listarAgendamentosCliente(filtros.usuarioId);
    }

    // Retorna todos (admin)
    if (isMockMode()) {
      const { listarAgendamentos } = await import('@/servicos/api');
      return listarAgendamentos(filtros);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('v_agendamentos_detalhados')
        .select('*')
        .order('dia', { ascending: true })
        .order('horario', { ascending: true });

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data || []).map(mapAgendamentoRowToTipo) };
    } catch (error) {
      console.error('[SupabaseAgendamentosService.listarAgendamentos] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar agendamentos.' };
    }
  },

  /**
   * Obter agendamento por ID
   */
  async obterAgendamento(agendamentoId: string): Promise<ResultadoServico<Agendamento | null>> {
    if (isMockMode()) {
      const { obterAgendamento } = await import('@/servicos/api');
      return obterAgendamento(agendamentoId);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('v_agendamentos_detalhados')
        .select('*')
        .eq('id', agendamentoId)
        .maybeSingle();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: true, dados: null };

      return { sucesso: true, dados: mapAgendamentoRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseAgendamentosService.obterAgendamento] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar agendamento.' };
    }
  },

  // ---------------------------------------------------------------------------
  // HORÁRIOS DISPONÍVEIS
  // ---------------------------------------------------------------------------

  /**
   * Obter horários disponíveis para um dia (usa RPC do banco)
   */
  async obterHorariosDisponiveis(
    estabelecimentoId: string,
    dia: string,
    duracaoMinutos: number
  ): Promise<ResultadoServico<Array<{ horario: string; disponivel: boolean }>>> {
    if (isMockMode()) {
      const { obterHorariosDisponiveis } = await import('@/servicos/api');
      return obterHorariosDisponiveis(estabelecimentoId, dia, duracaoMinutos);
    }

    try {
      const supabase = getSupabase();

      // Busca profissionais ativos do estabelecimento
      const { data: profissionais } = await supabase
        .from('profissionais')
        .select('id')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true);

      if (!profissionais || profissionais.length === 0) {
        return { sucesso: true, dados: [] };
      }

      // Para cada profissional, busca slots via RPC
      const todosSlots: Array<{ horario: string; disponivel: boolean }> = [];

      for (const prof of profissionais) {
        const { data: slots, error } = await supabase.rpc('rpc_slots_disponiveis', {
          p_profissional_id: prof.id,
          p_dia: dia,
          p_duracao_min: duracaoMinutos,
        });

        if (!error && slots) {
          slots.forEach((slot: RpcSlotsDisponiveisResult) => {
            // Evita duplicatas de horário
            if (!todosSlots.some(s => s.horario === slot.horario)) {
              todosSlots.push({ horario: slot.horario, disponivel: slot.disponivel });
            }
          });
        }
      }

      // Ordena por horário
      todosSlots.sort((a, b) => a.horario.localeCompare(b.horario));

      return { sucesso: true, dados: todosSlots };
    } catch (error) {
      console.error('[SupabaseAgendamentosService.obterHorariosDisponiveis] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar horários disponíveis.' };
    }
  },

  // ---------------------------------------------------------------------------
  // CRIAR AGENDAMENTO (USA RPC COM TRATAMENTO DE CONFLITO 23P01)
  // ---------------------------------------------------------------------------

  /**
   * Criar agendamento
   */
  async criarAgendamento(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>> {
    if (isMockMode()) {
      const { criarAgendamento } = await import('@/servicos/api');
      return criarAgendamento(dados);
    }

    try {
      const supabase = getSupabase();

      // Determina status_pagamento
      const statusPagamento: StatusPagamento = dados.statusPagamento || 'no_local';

      // Chama RPC que faz validação completa (antecedência, horário comercial, bloqueios, conflito)
      const { data, error } = await supabase.rpc('rpc_criar_agendamento', {
        p_estabelecimento_id: dados.estabelecimentoId,
        p_profissional_id: '', // Será determinado pelo RPC baseado no horário
        p_usuario_id: dados.usuarioId || null,
        p_dia: dados.dia,
        p_horario: dados.horario,
        p_duracao_min: dados.duracaoMinutos,
        p_nome_cliente: dados.nomeCliente,
        p_telefone_cliente: dados.telefoneCliente,
        p_servico_ids: dados.servicoIds,
        p_valor_total_centavos: Math.round(dados.valorTotal * 100),
        p_status_pagamento: statusPagamento,
        p_observacoes: dados.observacoes || null,
      });

      if (error) {
        // Trata erro de conflito (código 23P01 = exclusion_violation)
        if (error.code === '23P01' || error.message.includes('conflito') || error.message.includes('ocupado')) {
          return { sucesso: false, erro: 'Esse horário acabou de ser ocupado. Escolha outro.' };
        }
        return { sucesso: false, erro: error.message };
      }

      const resultado = data?.[0] as RpcCriarAgendamentoResult;
      if (!resultado?.agendamento_id) {
        return { sucesso: false, erro: resultado?.erro || 'Erro ao criar agendamento.' };
      }

      // Busca agendamento criado para retornar completo
      return this.obterAgendamento(resultado.agendamento_id) as Promise<ResultadoServico<Agendamento>>;
    } catch (error) {
      console.error('[SupabaseAgendamentosService.criarAgendamento] Erro:', error);
      return { sucesso: false, erro: 'Erro ao criar agendamento.' };
    }
  },

  /**
   * Cancelar agendamento
   */
  async cancelarAgendamento(agendamentoId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { cancelarAgendamento } = await import('@/servicos/api');
      return cancelarAgendamento(agendamentoId);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'cancelado', data_atualizacao: new Date().toISOString() })
        .eq('id', agendamentoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAgendamentosService.cancelarAgendamento] Erro:', error);
      return { sucesso: false, erro: 'Erro ao cancelar agendamento.' };
    }
  },

  /**
   * Reagendar agendamento (cancela antigo e cria novo)
   */
  async reagendarAgendamento(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>> {
    if (isMockMode()) {
      const { reagendarAgendamento } = await import('@/servicos/api');
      return reagendarAgendamento(agendamentoId, novoDia, novoHorario);
    }

    try {
      const supabase = getSupabase();

      // Busca agendamento original
      const { data: original } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single();

      if (!original) return { sucesso: false, erro: 'Agendamento não encontrado.' };

      // Cancela o antigo
      await supabase
        .from('agendamentos')
        .update({ status: 'cancelado', data_atualizacao: new Date().toISOString() })
        .eq('id', agendamentoId);

      // Cria novo via RPC
      const { data, error } = await supabase.rpc('rpc_criar_agendamento', {
        p_estabelecimento_id: original.estabelecimento_id,
        p_profissional_id: original.profissional_id,
        p_usuario_id: original.usuario_id,
        p_dia: novoDia,
        p_horario: novoHorario,
        p_duracao_min: original.duracao_min,
        p_nome_cliente: original.nome_cliente,
        p_telefone_cliente: original.telefone_cliente,
        p_servico_ids: original.servico_ids,
        p_valor_total_centavos: original.valor_total_centavos,
        p_status_pagamento: original.status_pagamento,
        p_observacoes: original.observacoes,
      });

      if (error) {
        if (error.code === '23P01') {
          return { sucesso: false, erro: 'Esse horário acabou de ser ocupado. Escolha outro.' };
        }
        return { sucesso: false, erro: error.message };
      }

      const resultado = data?.[0] as RpcCriarAgendamentoResult;
      if (!resultado?.agendamento_id) {
        return { sucesso: false, erro: resultado?.erro || 'Erro ao reagendar.' };
      }

      return this.obterAgendamento(resultado.agendamento_id) as Promise<ResultadoServico<Agendamento>>;
    } catch (error) {
      console.error('[SupabaseAgendamentosService.reagendarAgendamento] Erro:', error);
      return { sucesso: false, erro: 'Erro ao reagendar.' };
    }
  },

  /**
   * Confirmar presença
   */
  async confirmarPresenca(agendamentoId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { confirmarPresenca } = await import('@/servicos/api');
      return confirmarPresenca(agendamentoId);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'confirmado', data_atualizacao: new Date().toISOString() })
        .eq('id', agendamentoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAgendamentosService.confirmarPresenca] Erro:', error);
      return { sucesso: false, erro: 'Erro ao confirmar presença.' };
    }
  },

  /**
   * Avaliar agendamento
   */
  async avaliarAgendamento(agendamentoId: string, estrelas: number, comentario: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { avaliarAgendamento } = await import('@/servicos/api');
      return avaliarAgendamento(agendamentoId, estrelas, comentario);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('agendamentos')
        .update({
          status: 'concluido',
          avaliacao_estrelas: estrelas,
          avaliacao_comentario: comentario,
          avaliacao_data: new Date().toISOString(),
          data_atualizacao: new Date().toISOString(),
        })
        .eq('id', agendamentoId);

      if (error) return { sucesso: false, erro: error.message };

      // Adiciona avaliação ao estabelecimento
      const { data: ag } = await supabase
        .from('agendamentos')
        .select('estabelecimento_id, nome_cliente')
        .eq('id', agendamentoId)
        .single();

      if (ag) {
        await supabase.from('avaliacoes').insert({
          estabelecimento_id: ag.estabelecimento_id,
          agendamento_id: agendamentoId,
          usuario_id: null,
          nome_cliente: ag.nome_cliente,
          estrelas,
          comentario,
        });

        // Recalcula média
        const { data: avals } = await supabase
          .from('avaliacoes')
          .select('estrelas')
          .eq('estabelecimento_id', ag.estabelecimento_id);

        if (avals && avals.length > 0) {
          const soma = avals.reduce((acc, a) => acc + a.estrelas, 0);
          const media = Number((soma / avals.length).toFixed(1));
          await supabase
            .from('estabelecimentos')
            .update({ avaliacao: media })
            .eq('id', ag.estabelecimento_id);
        }
      }

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAgendamentosService.avaliarAgendamento] Erro:', error);
      return { sucesso: false, erro: 'Erro ao avaliar.' };
    }
  },

  // ---------------------------------------------------------------------------
  // BARBEIRO - LISTAGENS ESPECÍFICAS
  // ---------------------------------------------------------------------------

  /**
   * Listar agendamentos do barbeiro (hoje e futuros)
   */
  async listarBarbeiro(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>> {
    if (isMockMode()) {
      const { listarBarbeiro } = await import('@/servicos/api');
      return listarBarbeiro(estabelecimentoId);
    }

    return this.listarAgendamentosEstabelecimento(estabelecimentoId);
  },

  /**
   * Atualizar status do agendamento
   */
  async atualizarStatus(agendamentoId: string, status: StatusAgendamento): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { atualizarStatus } = await import('@/servicos/api');
      return atualizarStatus(agendamentoId, status);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('agendamentos')
        .update({ status, data_atualizacao: new Date().toISOString() })
        .eq('id', agendamentoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAgendamentosService.atualizarStatus] Erro:', error);
      return { sucesso: false, erro: 'Erro ao atualizar status.' };
    }
  },

  /**
   * Definir horário real e marcar como concluído
   */
  async definirHorarioReal(agendamentoId: string, horarioReal: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { definirHorarioReal } = await import('@/servicos/api');
      return definirHorarioReal(agendamentoId, horarioReal);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('agendamentos')
        .update({ horario: horarioReal, status: 'concluido', data_atualizacao: new Date().toISOString() })
        .eq('id', agendamentoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAgendamentosService.definirHorarioReal] Erro:', error);
      return { sucesso: false, erro: 'Erro ao definir horário real.' };
    }
  },

  /**
   * Confirmar pagamento Pix (chamado pelo webhook)
   */
  async confirmarPagamentoPix(agendamentoId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { confirmarPagamentoPix } = await import('@/servicos/api');
      return confirmarPagamentoPix(agendamentoId);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('agendamentos')
        .update({ status_pagamento: 'pago', data_atualizacao: new Date().toISOString() })
        .eq('id', agendamentoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAgendamentosService.confirmarPagamentoPix] Erro:', error);
      return { sucesso: false, erro: 'Erro ao confirmar pagamento.' };
    }
  },

  // ---------------------------------------------------------------------------
  // WRAPPERS PARA COMPATIBILIDADE
  // ---------------------------------------------------------------------------

  async criarAgendamentoWrapper(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>> {
    return this.criarAgendamento(dados);
  },

  async reagendarAgendamentoWrapper(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>> {
    return this.reagendarAgendamento(agendamentoId, novoDia, novoHorario);
  },

  async cancelarAgendamentoWrapper(agendamentoId: string): Promise<ResultadoServico<void>> {
    return this.cancelarAgendamento(agendamentoId);
  },

  async obterHorariosDisponiveisWrapper(
    estabelecimentoId: string,
    dia: string,
    duracaoMinutos: number
  ): Promise<ResultadoServico<Array<{ horario: string; disponivel: boolean }>>> {
    return this.obterHorariosDisponiveis(estabelecimentoId, dia, duracaoMinutos);
  },
};

export default SupabaseAgendamentosService;