// ============================================================================
// SUPABASE NOTIFICAÇÕES SERVICE
// ============================================================================

import { getSupabase, isMockMode } from './client';
import type { Database } from './types';
import type {
  ResultadoServico,
  Notificacao,
  TipoNotificacao,
} from '@/tipos';

type NotificacaoRow = Database['public']['Tables']['notificacoes']['Row'];

// ============================================================================
// HELPERS
// ============================================================================

function mapNotificacaoRowToTipo(row: NotificacaoRow): Notificacao {
  return {
    id: row.id,
    destinatario: row.destinatario_id,
    tipo: row.tipo,
    titulo: row.titulo,
    texto: row.texto,
    lida: row.lida,
    dataCriacao: new Date(row.data_criacao).getTime(),
    estabelecimentoId: row.estabelecimento_id || undefined,
    agendamentoId: row.agendamento_id || undefined,
  };
}

// ============================================================================
// SERVICE
// ============================================================================

export const SupabaseNotificacoesService = {
  /**
   * Listar notificações do usuário
   */
  async listarNotificacoes(usuarioEmail: string, filtro: string): Promise<ResultadoServico<Notificacao[]>> {
    if (isMockMode()) {
      const { listarNotificacoes } = await import('@/servicos/api');
      return listarNotificacoes(usuarioEmail, filtro);
    }

    try {
      const supabase = getSupabase();

      let query = supabase
        .from('notificacoes')
        .select('*')
        .eq('destinatario_id', usuarioEmail)
        .order('data_criacao', { ascending: false });

      if (filtro === 'agendamentos') {
        query = query.in('tipo', ['agendamento', 'reagendamento', 'cancelamento']);
      } else if (filtro === 'mensagens') {
        query = query.in('tipo', ['mensagem', 'administracao', 'pagamento']);
      }

      const { data, error } = await query.limit(100);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data || []).map(mapNotificacaoRowToTipo) };
    } catch (error) {
      console.error('[SupabaseNotificacoesService.listarNotificacoes] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar notificações.' };
    }
  },

  /**
   * Marcar notificação como lida
   */
  async marcarNotificacaoLida(notificacaoId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { marcarNotificacaoLida } = await import('@/servicos/api');
      return marcarNotificacaoLida(notificacaoId);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', notificacaoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseNotificacoesService.marcarNotificacaoLida] Erro:', error);
      return { sucesso: false, erro: 'Erro ao marcar como lida.' };
    }
  },

  /**
   * Marcar todas como lidas
   */
  async marcarTodasNotificacoesLidas(usuarioEmail: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { marcarTodasNotificacoesLidas } = await import('@/servicos/api');
      return marcarTodasNotificacoesLidas(usuarioEmail);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('destinatario_id', usuarioEmail)
        .eq('lida', false);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseNotificacoesService.marcarTodasNotificacoesLidas] Erro:', error);
      return { sucesso: false, erro: 'Erro ao marcar todas como lidas.' };
    }
  },

  /**
   * Excluir notificação
   */
  async excluirNotificacao(notificacaoId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { excluirNotificacao } = await import('@/servicos/api');
      return excluirNotificacao(notificacaoId);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', notificacaoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseNotificacoesService.excluirNotificacao] Erro:', error);
      return { sucesso: false, erro: 'Erro ao excluir notificação.' };
    }
  },

  /**
   * Excluir todas as lidas do usuário
   */
  async excluirTodasLidas(usuarioEmail: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { excluirTodasLidas } = await import('@/servicos/api');
      return excluirTodasLidas(usuarioEmail);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('destinatario_id', usuarioEmail)
        .eq('lida', true);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseNotificacoesService.excluirTodasLidas] Erro:', error);
      return { sucesso: false, erro: 'Erro ao excluir lidas.' };
    }
  },

  /**
   * Enviar mensagem para clientes (barbeiro)
   */
  async enviarMensagemClientes(estabelecimentoId: string, destinatarios: string[], texto: string): Promise<ResultadoServico<number>> {
    if (isMockMode()) {
      const { enviarMensagemClientes } = await import('@/servicos/api');
      return enviarMensagemClientes(estabelecimentoId, destinatarios, texto);
    }

    try {
      const supabase = getSupabase();

      const { data: est } = await supabase
        .from('estabelecimentos')
        .select('nome')
        .eq('id', estabelecimentoId)
        .single();

      let emails: string[] = [];

      if (destinatarios.includes('all')) {
        // Todos os clientes que agendaram
        const { data: ags } = await supabase
          .from('agendamentos')
          .select('usuario_id')
          .eq('estabelecimento_id', estabelecimentoId);
        emails = [...new Set(ags?.map(a => a.usuario_id).filter(Boolean) || [])];
      } else {
        emails = destinatarios;
      }

      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('email')
        .in('email', emails);

      const notificacoes = (usuarios || []).map(u => ({
        destinatario_id: u.email,
        tipo: 'mensagem' as const,
        titulo: `Mensagem de ${est?.nome || 'estabelecimento'}`,
        texto,
        lida: false,
        estabelecimento_id: estabelecimentoId,
      }));

      const { error: insertError } = await supabase.from('notificacoes').insert(notificacoes);

      if (insertError) return { sucesso: false, erro: insertError.message };

      return { sucesso: true, dados: notificacoes.length };
    } catch (error) {
      console.error('[SupabaseNotificacoesService.enviarMensagemClientes] Erro:', error);
      return { sucesso: false, erro: 'Erro ao enviar mensagens.' };
    }
  },

  /**
   * Enviar aviso para barbeiros (admin)
   */
  async enviarAvisoBarbeiros(destinatarios: string[], texto: string): Promise<ResultadoServico<number>> {
    if (isMockMode()) {
      const { enviarAvisoBarbeiros } = await import('@/servicos/api');
      return enviarAvisoBarbeiros(destinatarios, texto);
    }

    try {
      const supabase = getSupabase();

      let emails: string[] = [];

      if (destinatarios.includes('all')) {
        const { data: barbeiros } = await supabase
          .from('usuarios')
          .select('email')
          .eq('papel', 'barbeiro');
        emails = barbeiros?.map(b => b.email) || [];
      } else {
        // destinatarios são IDs de estabelecimentos
        const { data: barbeiros } = await supabase
          .from('usuarios')
          .select('email')
          .eq('papel', 'barbeiro')
          .in('estabelecimento_id', destinatarios);
        emails = barbeiros?.map(b => b.email) || [];
      }

      const notificacoes = emails.map(email => ({
        destinatario_id: email,
        tipo: 'administracao' as const,
        titulo: 'Aviso da administração',
        texto,
        lida: false,
      }));

      const { error: insertError } = await supabase.from('notificacoes').insert(notificacoes);

      if (insertError) return { sucesso: false, erro: insertError.message };

      return { sucesso: true, dados: notificacoes.length };
    } catch (error) {
      console.error('[SupabaseNotificacoesService.enviarAvisoBarbeiros] Erro:', error);
      return { sucesso: false, erro: 'Erro ao enviar avisos.' };
    }
  },

  // Wrappers
  async marcarComoLida(notificacaoId: string): Promise<ResultadoServico<void>> {
    return this.marcarNotificacaoLida(notificacaoId);
  },

  async marcarTodasComoLidas(usuarioEmail: string): Promise<ResultadoServico<void>> {
    return this.marcarTodasNotificacoesLidas(usuarioEmail);
  },

  async excluir(notificacaoId: string): Promise<ResultadoServico<void>> {
    return this.excluirNotificacao(notificacaoId);
  },

  async excluirTodasLidasWrapper(usuarioEmail: string): Promise<ResultadoServico<void>> {
    return this.excluirTodasLidas(usuarioEmail);
  },
};

export default SupabaseNotificacoesService;