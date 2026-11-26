// ============================================================================
// SUPABASE BARBEIRO SERVICE
// Dashboard e estatísticas do barbeiro
// ============================================================================

import { getSupabase, isMockMode } from './client';
import type { Database } from './types';
import type {
  ResultadoServico,
  Agendamento,
} from '@/tipos';

type AgendamentoRow = Database['public']['Tables']['agendamentos']['Row'];
type VAgendamentosDetalhadosRow = Database['public']['Views']['v_agendamentos_detalhados']['Row'];

// ============================================================================
// HELPERS
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

export const SupabaseBarbeiroService = {
  /**
   * Obter dashboard do barbeiro
   */
  async obterDashboardBarbeiro(): Promise<ResultadoServico<{
    agendamentosHoje: number;
    agendamentosSemana: number;
    faturamentoMes: number;
    avaliacaoMedia: number;
    filaAtual: number;
    proximosAgendamentos: Agendamento[];
  }>> {
    if (isMockMode()) {
      const { obterDashboardBarbeiro } = await import('@/servicos/api');
      return obterDashboardBarbeiro();
    }

    try {
      const supabase = getSupabase();

      // Obtém sessão para saber estabelecimento
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { sucesso: false, erro: 'Não autenticado.' };

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('estabelecimento_id, papel')
        .eq('id', user.id)
        .single();

      if (!perfil || perfil.papel !== 'barbeiro' || !perfil.estabelecimento_id) {
        return { sucesso: false, erro: 'Não autorizado.' };
      }

      const estId = perfil.estabelecimento_id;
      const hoje = new Date().toISOString().split('T')[0];
      const umaSemana = new Date();
      umaSemana.setDate(umaSemana.getDate() + 7);
      const semanaStr = umaSemana.toISOString().split('T')[0];

      // Busca agendamentos do estabelecimento
      const { data: agendamentos } = await supabase
        .from('v_agendamentos_detalhados')
        .select('*')
        .eq('estabelecimento_id', estId);

      const ags = (agendamentos || []).map(mapAgendamentoRowToTipo);

      // Agendamentos hoje
      const agendamentosHoje = ags.filter(a => a.dia === hoje).length;

      // Agendamentos esta semana
      const agendamentosSemana = ags.filter(a => a.dia >= hoje && a.dia <= semanaStr).length;

      // Faturamento do mês (apenas pagos)
      const mesAtual = new Date().getMonth();
      const faturamentoMes = ags
        .filter(a => new Date(a.dia).getMonth() === mesAtual && a.statusPagamento === 'pago')
        .reduce((acc, a) => acc + a.valorTotal, 0);

      // Avaliação média do estabelecimento
      const { data: est } = await supabase
        .from('estabelecimentos')
        .select('avaliacao')
        .eq('id', estId)
        .single();

      const avaliacaoMedia = est?.avaliacao || 0;

      // Fila atual (placeholder - implementar com tabela fila_espera)
      const filaAtual = 0;

      // Próximos agendamentos (próximos 5)
      const proximosAgendamentos = ags
        .filter(a => a.dia >= hoje)
        .sort((a, b) => (a.dia + a.horario).localeCompare(b.dia + b.horario))
        .slice(0, 5);

      return {
        sucesso: true,
        dados: {
          agendamentosHoje,
          agendamentosSemana,
          faturamentoMes,
          avaliacaoMedia,
          filaAtual,
          proximosAgendamentos,
        },
      };
    } catch (error) {
      console.error('[SupabaseBarbeiroService.obterDashboardBarbeiro] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar dashboard.' };
    }
  },

  /**
   * Obter estatísticas do barbeiro
   */
  async obterEstatisticasBarbeiro(): Promise<ResultadoServico<{
    totalAgendamentos: number;
    totalClientes: number;
    faturamentoTotal: number;
    servicosMaisProcurados: Array<{ nome: string; quantidade: number }>;
  }>> {
    if (isMockMode()) {
      const { obterEstatisticasBarbeiro } = await import('@/servicos/api');
      return obterEstatisticasBarbeiro();
    }

    try {
      const supabase = getSupabase();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { sucesso: false, erro: 'Não autenticado.' };

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('estabelecimento_id, papel')
        .eq('id', user.id)
        .single();

      if (!perfil || perfil.papel !== 'barbeiro' || !perfil.estabelecimento_id) {
        return { sucesso: false, erro: 'Não autorizado.' };
      }

      const estId = perfil.estabelecimento_id;

      // Busca agendamentos
      const { data: agendamentos } = await supabase
        .from('v_agendamentos_detalhados')
        .select('*')
        .eq('estabelecimento_id', estId);

      const ags = (agendamentos || []).map(mapAgendamentoRowToTipo);

      // Conta serviços
      const servicosCount: Record<string, number> = {};
      ags.forEach(a => {
        a.servicoIds.forEach(id => {
          servicosCount[id] = (servicosCount[id] || 0) + 1;
        });
      });

      // Busca nomes dos serviços
      const servicoIds = Object.keys(servicosCount);
      let servicosNomes: Record<string, string> = {};
      if (servicoIds.length > 0) {
        const { data: servicos } = await supabase
          .from('servicos')
          .select('id, nome')
          .in('id', servicoIds);
        servicosNomes = Object.fromEntries((servicos || []).map(s => [s.id, s.nome]));
      }

      const servicosMaisProcurados = Object.entries(servicosCount)
        .map(([id, qtd]) => ({
          nome: servicosNomes[id] || id,
          quantidade: qtd,
        }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);

      const totalClientes = new Set(ags.map(a => a.usuarioId).filter(Boolean)).size;
      const faturamentoTotal = ags
        .filter(a => a.statusPagamento === 'pago')
        .reduce((acc, a) => acc + a.valorTotal, 0);

      return {
        sucesso: true,
        dados: {
          totalAgendamentos: ags.length,
          totalClientes,
          faturamentoTotal,
          servicosMaisProcurados,
        },
      };
    } catch (error) {
      console.error('[SupabaseBarbeiroService.obterEstatisticasBarbeiro] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar estatísticas.' };
    }
  },
};

export default SupabaseBarbeiroService;