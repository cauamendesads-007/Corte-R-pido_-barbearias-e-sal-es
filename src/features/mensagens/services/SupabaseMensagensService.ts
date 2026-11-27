/**
 * Implementação Supabase do IMensagensService.
 */

import { IMensagensService } from './IMensagensService';
import type { ResultadoServico } from '@/tipos';
import { getSupabaseClient, isSupabaseAvailable } from '@/servicos/supabase/client';
import { sucesso, falha } from '@/servicos/api';

export class SupabaseMensagensService implements IMensagensService {
  private supabase = getSupabaseClient();

  async listarConversas(_usuarioEmail: string): Promise<ResultadoServico<Array<{ id: string; participante: string; ultimaMensagem: string; data: number; naoLidas: number }>>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      // Em produção, isso buscaria de uma tabela de conversas
      // Por enquanto retorna vazio como placeholder
      return sucesso([]);
    } catch (error) {
      console.error('[SupabaseMensagensService.listarConversas] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao listar conversas');
    }
  }

  async obterMensagens(_conversaId: string): Promise<ResultadoServico<Array<{ id: string; remetente: string; texto: string; data: number; lida: boolean }>>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      // Em produção, buscaria de tabela de mensagens
      return sucesso([]);
    } catch (error) {
      console.error('[SupabaseMensagensService.obterMensagens] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao obter mensagens');
    }
  }

  async enviarMensagem(_conversaId: string, _texto: string): Promise<ResultadoServico<void>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      // Em produção, salvaria na tabela de mensagens
      return sucesso(undefined);
    } catch (error) {
      console.error('[SupabaseMensagensService.enviarMensagem] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
    }
  }

  async enviarMensagemClientes(estabelecimentoId: string, destinatarios: string[], texto: string): Promise<ResultadoServico<number>> {
    if (!isSupabaseAvailable()) return falha('Supabase não configurado');

    try {
      let emails: string[] = [];

      if (destinatarios.includes('all')) {
        const { data: agendamentos } = await this.supabase
          .from('agendamentos')
          .select('usuario_id')
          .eq('estabelecimento_id', estabelecimentoId);

        emails = [...new Set((agendamentos || []).map(a => a.usuario_id).filter(Boolean))] as string[];
      } else {
        emails = destinatarios;
      }

      if (emails.length === 0) return sucesso(0);

      const { data: est } = await this.supabase
        .from('estabelecimentos')
        .select('nome')
        .eq('id', estabelecimentoId)
        .single();

      const nomeEstabelecimento = est?.nome || 'Corte Rápido';

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
      console.error('[SupabaseMensagensService.enviarMensagemClientes] Erro:', error);
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
      console.error('[SupabaseMensagensService.enviarAvisoBarbeiros] Erro:', error);
      return falha(error instanceof Error ? error.message : 'Erro ao enviar aviso para barbeiros');
    }
  }
}