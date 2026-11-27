/**
 * Implementação Supabase do INotificacoesService.
 */

import { INotificacoesService } from './INotificacoesService';
import type { Notificacao, ResultadoServico } from '@/tipos';
import { getSupabaseClient, isSupabaseAvailable } from '@/servicos/supabase/client';
import { sucesso, falha } from '@/servicos/api';

function mapNotificacao(row: Record<string, unknown>): Notificacao {
  return {
    id: row.id as string,
    destinatario: row.destinatario as string,
    tipo: row.tipo as Notificacao['tipo'],
    titulo: row.titulo as string,
    texto: row.texto as string,
    lida: Boolean(row.lida),
    dataCriacao: Number(row.data_criacao) || Date.now(),
    estabelecimentoId: row.estabelecimento_id as string | undefined,
  };
}

export class SupabaseNotificacoesService implements INotificacoesService {
  private supabase = getSupabaseClient();

  async listar(usuarioEmail: string, filtro: string): Promise<ResultadoServico<Notificacao[]>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      let query = this.supabase
        .from('notificacoes')
        .select('id, destinatario, tipo, titulo, texto, lida, data_criacao, estabelecimento_id')
        .eq('destinatario', usuarioEmail)
        .order('data_criacao', { ascending: false });

      if (filtro === 'agendamentos') {
        query = query.in('tipo', ['agendamento', 'reagendamento', 'cancelamento']);
      } else if (filtro === 'mensagens') {
        query = query.in('tipo', ['mensagem', 'administracao', 'pagamento']);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      return sucesso((data || []).map(mapNotificacao));
    } catch (error) {
      console.error('[SupabaseNotificacoesService.listar] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar notificações');
    }
  }

  async marcarComoLida(notificacaoId: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', notificacaoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseNotificacoesService.marcarComoLida] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao marcar notificação como lida');
    }
  }

  async marcarTodasComoLidas(usuarioEmail: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('destinatario', usuarioEmail)
        .eq('lida', false);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseNotificacoesService.marcarTodasComoLidas] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao marcar todas como lidas');
    }
  }

  async excluir(notificacaoId: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('notificacoes')
        .delete()
        .eq('id', notificacaoId);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseNotificacoesService.excluir] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao excluir notificação');
    }
  }

  async excluirTodasLidas(usuarioEmail: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      const { error } = await this.supabase
        .from('notificacoes')
        .delete()
        .eq('destinatario', usuarioEmail)
        .eq('lida', true);

      if (error) throw error;

      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseNotificacoesService.excluirTodasLidas] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao excluir todas lidas');
    }
  }

  async enviarMensagemClientes(estabelecimentoId: string, destinatarios: string[], texto: string): Promise<ResultadoServico<number>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      let emails: string[] = [];

      if (destinatarios.includes('all')) {
        // Busca todos os clientes que agendaram neste estabelecimento
        const { data: agendamentos } = await this.supabase
          .from('agendamentos')
          .select('usuario_id')
          .eq('estabelecimento_id', estabelecimentoId);

        emails = [...new Set((agendamentos || []).map(a => a.usuario_id).filter(Boolean))] as string[];
      } else {
        emails = destinatarios;
      }

      if (emails.length === 0) return sucesso(0);

      // Busca nome do estabelecimento
      const { data: est } = await this.supabase
        .from('estabelecimentos')
        .select('nome')
        .eq('id', estabelecimentoId)
        .single();

      const nomeEstabelecimento = est?.nome || 'Corte Rápido';

      // Insere notificações em lote
      const notificacoes = emails.map(email => ({
        destinatario: email,
        tipo: 'mensagem' as const,
        titulo: `Mensagem de ${nomeEstabelecimento}`,
        texto,
        lida: false,
        data_criacao: Date.now(),
        estabelecimento_id: estabelecimentoId,
      }));

      const { error } = await this.supabase
        .from('notificacoes')
        .insert(notificacoes);

      if (error) throw error;

      return sucesso(emails.length);
    } catch (error) {
      console.error('[SupabaseNotificacoesService.enviarMensagemClientes] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao enviar mensagem para clientes');
    }
  }

  async enviarAvisoBarbeiros(destinatarios: string[], texto: string): Promise<ResultadoServico<number>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      let emails: string[] = [];

      if (destinatarios.includes('all')) {
        const { data: barbeiros } = await this.supabase
          .from('usuarios')
          .select('email')
          .eq('role', 'barbeiro');

        emails = (barbeiros || []).map(b => b.email);
      } else {
        // Busca emails dos barbeiros pelos IDs dos estabelecimentos
        for (const id of destinatarios) {
          const { data: barbeiro } = await this.supabase
            .from('usuarios')
            .select('email')
            .eq('estabelecimento_id', id)
            .eq('role', 'barbeiro')
            .single();

          if (barbeiro?.email) emails.push(barbeiro.email);
        }
      }

      if (emails.length === 0) return sucesso(0);

      const notificacoes = emails.map(email => ({
        destinatario: email,
        tipo: 'administracao' as const,
        titulo: 'Aviso da administração',
        texto,
        lida: false,
        data_criacao: Date.now(),
      }));

      const { error } = await this.supabase
        .from('notificacoes')
        .insert(notificacoes);

      if (error) throw error;

      return sucesso(emails.length);
    } catch (error) {
      console.error('[SupabaseNotificacoesService.enviarAvisoBarbeiros] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao enviar aviso para barbeiros');
    }
  }
}