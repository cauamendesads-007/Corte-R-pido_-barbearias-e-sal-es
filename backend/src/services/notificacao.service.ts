import {
  criarNotificacao,
  buscarPorUsuario,
  marcarComoLida,
  marcarTodasComoLidas,
  deletarNotificacao,
  contarNaoLidas
} from '@/repositories/notificacao.repository';
import { AppError } from '@/middlewares/errorHandler';

export interface NotificacaoResponse {
  id: string;
  usuarioId: string;
  tipo: 'agendamento' | 'pagamento' | 'avaliacao' | 'mensagem' | 'sistema';
  titulo: string;
  mensagem: string;
  lida: boolean;
  dadosExtras: Record<string, unknown> | null;
  dataCriacao: Date;
}

interface NotificacaoRow {
  id: string;
  usuario_id: string;
  tipo: 'agendamento' | 'pagamento' | 'avaliacao' | 'mensagem' | 'sistema';
  titulo: string;
  mensagem: string;
  lida: boolean;
  dados_extras: Record<string, unknown> | null;
  data_criacao: Date;
}

function mapNotificacao(row: NotificacaoRow): NotificacaoResponse {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    tipo: row.tipo,
    titulo: row.titulo,
    mensagem: row.mensagem,
    lida: row.lida,
    dadosExtras: row.dados_extras,
    dataCriacao: row.data_criacao
  };
}

export async function criarNotificacaoService(data: {
  usuarioId: string;
  tipo: 'agendamento' | 'pagamento' | 'avaliacao' | 'mensagem' | 'sistema';
  titulo: string;
  mensagem: string;
  dadosExtras?: Record<string, unknown>;
}): Promise<NotificacaoResponse> {
  const notificacao = await criarNotificacao(data);
  return mapNotificacao(notificacao);
}

export async function listarNotificacoesUsuario(
  usuarioId: string,
  apenasNaoLidas = false,
  pagina = 1,
  limite = 20
): Promise<{ notificacoes: NotificacaoResponse[]; total: number; naoLidas: number; pagina: number; totalPaginas: number }> {
  const { notificacoes, total, naoLidas } = await buscarPorUsuario(usuarioId, apenasNaoLidas, pagina, limite);
  return {
    notificacoes: notificacoes.map(mapNotificacao),
    total,
    naoLidas,
    pagina,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function marcarComoLidaService(id: string, usuarioId: string): Promise<NotificacaoResponse> {
  const notificacao = await marcarComoLida(id, usuarioId);
  if (!notificacao) {
    throw new AppError(404, 'Notificação não encontrada', 'NOTIFICACAO_NOT_FOUND');
  }
  return mapNotificacao(notificacao);
}

export async function marcarTodasComoLidasService(usuarioId: string): Promise<{ marcadas: number }> {
  const marcadas = await marcarTodasComoLidas(usuarioId);
  return { marcadas };
}

export async function deletarNotificacaoService(id: string, usuarioId: string): Promise<void> {
  const deleted = await deletarNotificacao(id, usuarioId);
  if (!deleted) {
    throw new AppError(404, 'Notificação não encontrada', 'NOTIFICACAO_NOT_FOUND');
  }
}

export async function contarNaoLidasService(usuarioId: string): Promise<{ count: number }> {
  const count = await contarNaoLidas(usuarioId);
  return { count };
}

// Helpers para criar notificações comuns do sistema
export async function notificarNovoAgendamento(
  profissionalId: string,
  agendamentoId: string,
  dataHora: Date,
  clienteNome: string
): Promise<void> {
  await criarNotificacaoService({
    usuarioId: profissionalId,
    tipo: 'agendamento',
    titulo: 'Novo agendamento',
    mensagem: `Você tem um novo agendamento para ${dataHora.toLocaleString('pt-BR')} com ${clienteNome}`,
    dadosExtras: { agendamentoId, dataHora: dataHora.toISOString() }
  });
}

export async function notificarAgendamentoConfirmado(
  clienteId: string,
  agendamentoId: string,
  dataHora: Date,
  estabelecimentoNome: string
): Promise<void> {
  await criarNotificacaoService({
    usuarioId: clienteId,
    tipo: 'agendamento',
    titulo: 'Agendamento confirmado',
    mensagem: `Seu agendamento para ${dataHora.toLocaleString('pt-BR')} em ${estabelecimentoNome} foi confirmado`,
    dadosExtras: { agendamentoId, dataHora: dataHora.toISOString() }
  });
}

export async function notificarLembreteAgendamento(
  clienteId: string,
  agendamentoId: string,
  dataHora: Date,
  estabelecimentoNome: string
): Promise<void> {
  await criarNotificacaoService({
    usuarioId: clienteId,
    tipo: 'agendamento',
    titulo: 'Lembrete: agendamento amanhã',
    mensagem: `Não esqueça: seu agendamento em ${estabelecimentoNome} é amanhã às ${dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    dadosExtras: { agendamentoId, dataHora: dataHora.toISOString() }
  });
}

export async function notificarPagamentoRecebido(
  estabelecimentoId: string,
  pagamentoId: string,
  valor: number,
  metodo: string
): Promise<void> {
  // Notificar dono do estabelecimento
  // Buscar usuario_id do estabelecimento
  // Por simplicidade, assumimos que o estabelecimento tem um usuario_id associado
  // Em produção, buscar via repository
  await criarNotificacaoService({
    usuarioId: estabelecimentoId, // Idealmente buscar o usuario_id do dono
    tipo: 'pagamento',
    titulo: 'Pagamento recebido',
    mensagem: `Recebido pagamento de R$ ${valor.toFixed(2)} via ${metodo}`,
    dadosExtras: { pagamentoId, valor, metodo }
  });
}

export async function notificarNovaAvaliacao(
  estabelecimentoId: string,
  avaliacaoId: string,
  estrelas: number,
  clienteNome: string
): Promise<void> {
  await criarNotificacaoService({
    usuarioId: estabelecimentoId, // Idealmente buscar o usuario_id do dono
    tipo: 'avaliacao',
    titulo: 'Nova avaliação recebida',
    mensagem: `${clienteNome} avaliou seu estabelecimento com ${estrelas} estrela(s)`,
    dadosExtras: { avaliacaoId, estrelas, clienteNome }
  });
}