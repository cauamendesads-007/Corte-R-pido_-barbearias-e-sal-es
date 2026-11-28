/**
 * Cliente HTTP para o backend MySQL (Express API)
 * Substitui a camada Supabase/mock quando VITE_API_URL está definido
 */
import type {
  Estabelecimento,
  Usuario,
  Agendamento,
  Publicacao,
  Notificacao,
  Servico,
  ItemGaleria,
  Avaliacao,
  FiltrosBusca,
  SessaoUsuario,
  ConfiguracaoPix,
  MensagemAutomatica,
  PlanoAssinatura,
  AssinaturaEstabelecimento,
  ResultadoServico,
  NichoEstabelecimento,
  StatusEstabelecimento,
  StatusAgendamento,
  Comentario,
  TipoLayout,
} from '@/tipos';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ResultadoServico<T>> {
  const url = `${API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Adiciona token de autenticação se disponível
  const token = localStorage.getItem('cr_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const erro = data.message || data.error || `Erro HTTP ${response.status}`;
      return { sucesso: false, erro };
    }

    return { sucesso: true, dados: data };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return { sucesso: false, erro: 'Erro de conexão. Verifique se o backend está rodando.' };
  }
}

// ============================================================================
// AUTENTICAÇÃO
// ============================================================================

export async function login(email: string, senha: string): Promise<ResultadoServico<SessaoUsuario>> {
  const result = await request<{ usuario: Usuario; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });

  if (result.sucesso && result.dados) {
    localStorage.setItem('cr_token', result.dados.token);
    const sessao: SessaoUsuario = {
      papel: result.dados.usuario.papel,
      email: result.dados.usuario.email,
      estabelecimentoId: result.dados.usuario.estabelecimentoId,
      nome: result.dados.usuario.nome,
    };
    return { sucesso: true, dados: sessao };
  }
  return result as ResultadoServico<SessaoUsuario>;
}

export async function cadastrarCliente(dados: { nome: string; email: string; senha: string }): Promise<ResultadoServico<SessaoUsuario>> {
  const result = await request<{ usuario: Usuario; token: string }>('/auth/register/cliente', {
    method: 'POST',
    body: JSON.stringify(dados),
  });

  if (result.sucesso && result.dados) {
    localStorage.setItem('cr_token', result.dados.token);
    const sessao: SessaoUsuario = {
      papel: result.dados.usuario.papel,
      email: result.dados.usuario.email,
      nome: result.dados.usuario.nome,
    };
    return { sucesso: true, dados: sessao };
  }
  return result as ResultadoServico<SessaoUsuario>;
}

export async function cadastrarProfissional(dados: {
  nomeEstabelecimento: string;
  responsavel: string;
  email: string;
  senha: string;
  cidade: string;
  endereco: string;
  whatsapp: string;
  nicho: NichoEstabelecimento;
}): Promise<ResultadoServico<{ estabelecimentoId: string }>> {
  return request('/auth/register/profissional', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

export async function sair(): Promise<ResultadoServico<void>> {
  localStorage.removeItem('cr_token');
  return { sucesso: true, dados: undefined };
}

export async function obterSessao(): Promise<ResultadoServico<SessaoUsuario | null>> {
  const token = localStorage.getItem('cr_token');
  if (!token) return { sucesso: true, dados: null };

  const result = await request<Usuario>('/auth/me');
  if (result.sucesso && result.dados) {
    const sessao: SessaoUsuario = {
      papel: result.dados.papel,
      email: result.dados.email,
      estabelecimentoId: result.dados.estabelecimentoId,
      nome: result.dados.nome,
    };
    return { sucesso: true, dados: sessao };
  }

  // Token inválido, remove
  localStorage.removeItem('cr_token');
  return { sucesso: true, dados: null };
}

export async function atualizarPerfilCliente(dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
  return request('/usuarios/perfil', {
    method: 'PATCH',
    body: JSON.stringify(dados),
  });
}

export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<ResultadoServico<void>> {
  return request('/usuarios/senha', {
    method: 'PATCH',
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
}

export async function excluirConta(): Promise<ResultadoServico<void>> {
  return request('/usuarios/conta', { method: 'DELETE' });
}

export async function validarToken(): Promise<ResultadoServico<SessaoUsuario | null>> {
  return obterSessao();
}

export async function renovarSessao(): Promise<ResultadoServico<SessaoUsuario | null>> {
  return obterSessao();
}

export async function recuperarSenha(email: string): Promise<ResultadoServico<void>> {
  return request('/auth/recuperar-senha', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function confirmarEmail(): Promise<ResultadoServico<SessaoUsuario | null>> {
  // O backend deve lidar com token via query param
  return { sucesso: true, dados: null };
}

// ============================================================================
// ESTABELECIMENTOS
// ============================================================================

export async function listarEstabelecimentos(filtros: FiltrosBusca): Promise<ResultadoServico<Estabelecimento[]>> {
  const params = new URLSearchParams();
  if (filtros.nicho !== 'todos') params.append('nicho', filtros.nicho);
  if (filtros.precoMaximo) params.append('precoMaximo', String(filtros.precoMaximo));
  if (filtros.avaliacaoMinima) params.append('avaliacaoMinima', String(filtros.avaliacaoMinima));
  if (filtros.tipoServico) params.append('tipoServico', filtros.tipoServico);
  if (filtros.ordenacao) params.append('ordenacao', filtros.ordenacao);
  if (filtros.localizacaoUsuario) {
    params.append('lat', String(filtros.localizacaoUsuario.latitude));
    params.append('lng', String(filtros.localizacaoUsuario.longitude));
  }
  if (filtros.apenasBemAvaliados) params.append('apenasBemAvaliados', 'true');
  if (filtros.apenasVagasHoje) params.append('apenasVagasHoje', 'true');

  return request(`/estabelecimentos?${params.toString()}`);
}

export async function buscarEstabelecimentoPorSlug(slug: string): Promise<ResultadoServico<Estabelecimento | null>> {
  return request(`/estabelecimentos/slug/${slug}`);
}

export async function buscarEstabelecimentoPorId(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
  return request(`/estabelecimentos/${id}`);
}

export async function atualizarEstabelecimento(id: string, dados: Partial<Estabelecimento>): Promise<ResultadoServico<Estabelecimento>> {
  return request(`/estabelecimentos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  });
}

export async function atualizarConfiguracaoPix(id: string, config: ConfiguracaoPix): Promise<ResultadoServico<ConfiguracaoPix>> {
  return request(`/estabelecimentos/${id}/pix`, {
    method: 'PATCH',
    body: JSON.stringify(config),
  });
}

export async function atualizarMensagensAutomaticas(id: string, mensagens: MensagemAutomatica): Promise<ResultadoServico<MensagemAutomatica>> {
  return request(`/estabelecimentos/${id}/mensagens-auto`, {
    method: 'PATCH',
    body: JSON.stringify(mensagens),
  });
}

// Serviços
export async function listarServicos(estabelecimentoId: string): Promise<ResultadoServico<Servico[]>> {
  return request(`/estabelecimentos/${estabelecimentoId}/servicos`);
}

export async function obterServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<Servico | null>> {
  return request(`/estabelecimentos/${estabelecimentoId}/servicos/${servicoId}`);
}

export async function adicionarServico(estabelecimentoId: string, servico: Omit<Servico, 'id'>): Promise<ResultadoServico<Servico>> {
  return request(`/estabelecimentos/${estabelecimentoId}/servicos`, {
    method: 'POST',
    body: JSON.stringify(servico),
  });
}

export async function atualizarServico(estabelecimentoId: string, servicoId: string, dados: Partial<Servico>): Promise<ResultadoServico<Servico>> {
  return request(`/estabelecimentos/${estabelecimentoId}/servicos/${servicoId}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  });
}

export async function excluirServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<void>> {
  return request(`/estabelecimentos/${estabelecimentoId}/servicos/${servicoId}`, { method: 'DELETE' });
}

export async function reordenarServicos(estabelecimentoId: string, servicoIds: string[]): Promise<ResultadoServico<Servico[]>> {
  return request(`/estabelecimentos/${estabelecimentoId}/servicos/reordenar`, {
    method: 'POST',
    body: JSON.stringify({ servicoIds }),
  });
}

// Galeria
export async function adicionarGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>> {
  return request(`/estabelecimentos/${estabelecimentoId}/galeria`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function removerGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>> {
  return request(`/estabelecimentos/${estabelecimentoId}/galeria/${itemId}`, { method: 'DELETE' });
}

export async function reordenarGaleria(estabelecimentoId: string, itemIds: string[]): Promise<ResultadoServico<ItemGaleria[]>> {
  return request(`/estabelecimentos/${estabelecimentoId}/galeria/reordenar`, {
    method: 'POST',
    body: JSON.stringify({ itemIds }),
  });
}

// Avaliações
export async function listarAvaliacoes(estabelecimentoId: string): Promise<ResultadoServico<Avaliacao[]>> {
  return request(`/estabelecimentos/${estabelecimentoId}/avaliacoes`);
}

export async function responderAvaliacao(estabelecimentoId: string, avaliacaoId: string, resposta: string): Promise<ResultadoServico<Avaliacao>> {
  return request(`/estabelecimentos/${estabelecimentoId}/avaliacoes/${avaliacaoId}/responder`, {
    method: 'POST',
    body: JSON.stringify({ resposta }),
  });
}

// Fila
export async function entrarNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<{ posicao: number; esperaEstimada: number }>> {
  return request(`/estabelecimentos/${estabelecimentoId}/fila`, {
    method: 'POST',
    body: JSON.stringify({ nome }),
  });
}

export async function obterFila(estabelecimentoId: string): Promise<ResultadoServico<{ fila: Array<{ nome: string; horarioChegada: string }>; esperaEstimada: number }>> {
  return request(`/estabelecimentos/${estabelecimentoId}/fila`);
}

export async function chamarProximoFila(estabelecimentoId: string): Promise<ResultadoServico<void>> {
  return request(`/estabelecimentos/${estabelecimentoId}/fila/chamar`, { method: 'POST' });
}

export async function removerDaFila(estabelecimentoId: string, index: number): Promise<ResultadoServico<void>> {
  return request(`/estabelecimentos/${estabelecimentoId}/fila/${index}`, { method: 'DELETE' });
}

export async function adicionarPresencialNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>> {
  return request(`/estabelecimentos/${estabelecimentoId}/fila/presencial`, {
    method: 'POST',
    body: JSON.stringify({ nome }),
  });
}

export async function sairDaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>> {
  return request(`/estabelecimentos/${estabelecimentoId}/fila/sair`, {
    method: 'POST',
    body: JSON.stringify({ nome }),
  });
}

// ============================================================================
// AGENDAMENTOS
// ============================================================================

export async function listarAgendamentosEstabelecimento(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>> {
  return request(`/estabelecimentos/${estabelecimentoId}/agendamentos`);
}

export async function listarAgendamentosCliente(usuarioId: string): Promise<ResultadoServico<Agendamento[]>> {
  return request(`/agendamentos/cliente/${usuarioId}`);
}

export async function obterHorariosDisponiveis(
  estabelecimentoId: string,
  dia: string,
  duracaoMinutos: number
): Promise<ResultadoServico<Array<{ horario: string; disponivel: boolean }>>> {
  return request(`/estabelecimentos/${estabelecimentoId}/horarios-disponiveis?dia=${dia}&duracao=${duracaoMinutos}`);
}

export async function criarAgendamento(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>> {
  return request('/agendamentos', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

export async function cancelarAgendamento(agendamentoId: string): Promise<ResultadoServico<void>> {
  return request(`/agendamentos/${agendamentoId}`, { method: 'DELETE' });
}

export async function reagendarAgendamento(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>> {
  return request(`/agendamentos/${agendamentoId}/reagendar`, {
    method: 'POST',
    body: JSON.stringify({ novoDia, novoHorario }),
  });
}

export async function confirmarPresenca(agendamentoId: string): Promise<ResultadoServico<void>> {
  return request(`/agendamentos/${agendamentoId}/confirmar`, { method: 'POST' });
}

export async function avaliarAgendamento(agendamentoId: string, estrelas: number, comentario: string): Promise<ResultadoServico<void>> {
  return request(`/agendamentos/${agendamentoId}/avaliar`, {
    method: 'POST',
    body: JSON.stringify({ estrelas, comentario }),
  });
}

export async function obterAgendamento(agendamentoId: string): Promise<ResultadoServico<Agendamento | null>> {
  return request(`/agendamentos/${agendamentoId}`);
}

export async function listarBarbeiro(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>> {
  return request(`/estabelecimentos/${estabelecimentoId}/agendamentos/barbeiro`);
}

export async function atualizarStatus(agendamentoId: string, status: StatusAgendamento): Promise<ResultadoServico<void>> {
  return request(`/agendamentos/${agendamentoId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function definirHorarioReal(agendamentoId: string, horarioReal: string): Promise<ResultadoServico<void>> {
  return request(`/agendamentos/${agendamentoId}/horario-real`, {
    method: 'PATCH',
    body: JSON.stringify({ horarioReal }),
  });
}

export async function confirmarPagamentoPix(agendamentoId: string): Promise<ResultadoServico<void>> {
  return request(`/agendamentos/${agendamentoId}/confirmar-pix`, { method: 'POST' });
}

// ============================================================================
// FEED / PUBLICAÇÕES
// ============================================================================

export async function listarFeed(filtro: string, usuarioEmail?: string): Promise<ResultadoServico<Publicacao[]>> {
  const params = new URLSearchParams();
  if (filtro !== 'todos') params.append('filtro', filtro);
  if (usuarioEmail) params.append('usuarioEmail', usuarioEmail);
  return request(`/feed?${params.toString()}`);
}

export async function obterPublicacao(id: string): Promise<ResultadoServico<Publicacao | null>> {
  return request(`/feed/${id}`);
}

export async function criarPublicacao(dados: {
  estabelecimentoId: string;
  legenda?: string;
  arquivoUrl?: string;
  tipo: 'imagem' | 'video';
}): Promise<ResultadoServico<Publicacao>> {
  return request('/feed', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

export async function alternarCurtida(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ curtido: boolean; total: number }>> {
  return request(`/feed/${publicacaoId}/curtir`, {
    method: 'POST',
    body: JSON.stringify({ usuarioEmail }),
  });
}

export async function alternarInspiracao(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ salvo: boolean }>> {
  return request(`/feed/${publicacaoId}/salvar`, {
    method: 'POST',
    body: JSON.stringify({ usuarioEmail }),
  });
}

export async function alternarSeguir(estabelecimentoId: string, usuarioEmail: string): Promise<ResultadoServico<{ seguindo: boolean }>> {
  return request(`/estabelecimentos/${estabelecimentoId}/seguir`, {
    method: 'POST',
    body: JSON.stringify({ usuarioEmail }),
  });
}

export async function adicionarComentario(publicacaoId: string, autorNome: string, texto: string): Promise<ResultadoServico<Comentario>> {
  return request(`/feed/${publicacaoId}/comentarios`, {
    method: 'POST',
    body: JSON.stringify({ autorNome, texto }),
  });
}

export async function excluirPublicacao(publicacaoId: string, estabelecimentoId: string): Promise<ResultadoServico<void>> {
  return request(`/feed/${publicacaoId}`, { method: 'DELETE' });
}

export async function compartilharPublicacao(publicacaoId: string): Promise<ResultadoServico<void>> {
  return request(`/feed/${publicacaoId}/compartilhar`, { method: 'POST' });
}

export async function denunciarPublicacao(publicacaoId: string, motivo: string): Promise<ResultadoServico<void>> {
  return request(`/feed/${publicacaoId}/denunciar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

// ============================================================================
// NOTIFICAÇÕES
// ============================================================================

export async function listarNotificacoes(usuarioEmail: string, filtro: string): Promise<ResultadoServico<Notificacao[]>> {
  const params = new URLSearchParams();
  if (filtro !== 'todos') params.append('filtro', filtro);
  return request(`/notificacoes?${params.toString()}`);
}

export async function marcarNotificacaoLida(notificacaoId: string): Promise<ResultadoServico<void>> {
  return request(`/notificacoes/${notificacaoId}/ler`, { method: 'POST' });
}

export async function marcarTodasNotificacoesLidas(usuarioEmail: string): Promise<ResultadoServico<void>> {
  return request('/notificacoes/ler-todas', { method: 'POST' });
}

export async function excluirNotificacao(notificacaoId: string): Promise<ResultadoServico<void>> {
  return request(`/notificacoes/${notificacaoId}`, { method: 'DELETE' });
}

export async function excluirTodasLidas(usuarioEmail: string): Promise<ResultadoServico<void>> {
  return request('/notificacoes/excluir-lidas', { method: 'DELETE' });
}

export async function enviarMensagemClientes(estabelecimentoId: string, destinatarios: string[], texto: string): Promise<ResultadoServico<number>> {
  return request(`/estabelecimentos/${estabelecimentoId}/mensagens/clientes`, {
    method: 'POST',
    body: JSON.stringify({ destinatarios, texto }),
  });
}

export async function enviarAvisoBarbeiros(destinatarios: string[], texto: string): Promise<ResultadoServico<number>> {
  return request('/admin/mensagens/barbeiros', {
    method: 'POST',
    body: JSON.stringify({ destinatarios, texto }),
  });
}

// ============================================================================
// BARBEIRO
// ============================================================================

export async function obterDashboardBarbeiro(): Promise<ResultadoServico<{
  agendamentosHoje: number;
  agendamentosSemana: number;
  faturamentoMes: number;
  avaliacaoMedia: number;
  filaAtual: number;
  proximosAgendamentos: Agendamento[];
}>> {
  return request('/barbeiro/dashboard');
}

export async function obterEstatisticasBarbeiro(): Promise<ResultadoServico<{
  totalAgendamentos: number;
  totalClientes: number;
  faturamentoTotal: number;
  servicosMaisProcurados: Array<{ nome: string; quantidade: number }>;
}>> {
  return request('/barbeiro/estatisticas');
}

// ============================================================================
// ADMIN
// ============================================================================

export async function listarUsuariosAdmin(): Promise<ResultadoServico<Usuario[]>> {
  return request('/admin/usuarios');
}

export async function obterUsuarioAdmin(id: string): Promise<ResultadoServico<Usuario | null>> {
  return request(`/admin/usuarios/${id}`);
}

export async function atualizarUsuarioAdmin(id: string, dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
  return request(`/admin/usuarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  });
}

export async function excluirUsuarioAdmin(id: string): Promise<ResultadoServico<void>> {
  return request(`/admin/usuarios/${id}`, { method: 'DELETE' });
}

export async function listarTodosEstabelecimentosAdmin(): Promise<ResultadoServico<Estabelecimento[]>> {
  return request('/admin/estabelecimentos');
}

export async function obterEstabelecimentoAdmin(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
  return request(`/admin/estabelecimentos/${id}`);
}

export async function aprovarEstabelecimento(id: string): Promise<ResultadoServico<void>> {
  return request(`/admin/estabelecimentos/${id}/aprovar`, { method: 'POST' });
}

export async function rejeitarEstabelecimento(id: string): Promise<ResultadoServico<void>> {
  return request(`/admin/estabelecimentos/${id}/rejeitar`, { method: 'POST' });
}

export async function suspenderEstabelecimento(id: string): Promise<ResultadoServico<void>> {
  return request(`/admin/estabelecimentos/${id}/suspender`, { method: 'POST' });
}

export async function listarPagamentosAdmin(): Promise<ResultadoServico<Array<{ estabelecimento: string; data: string; valor: number; status: string }>>> {
  return request('/admin/pagamentos');
}

export async function listarPlanos(): Promise<ResultadoServico<PlanoAssinatura[]>> {
  return request('/admin/planos');
}

export async function adicionarPlano(plano: Omit<PlanoAssinatura, 'id'>): Promise<ResultadoServico<PlanoAssinatura>> {
  return request('/admin/planos', {
    method: 'POST',
    body: JSON.stringify(plano),
  });
}

export async function atualizarPlano(planoId: string, dados: Partial<PlanoAssinatura>): Promise<ResultadoServico<PlanoAssinatura>> {
  return request(`/admin/planos/${planoId}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  });
}

export async function excluirPlano(planoId: string): Promise<ResultadoServico<void>> {
  return request(`/admin/planos/${planoId}`, { method: 'DELETE' });
}

export async function obterAssinatura(estabelecimentoId: string): Promise<ResultadoServico<AssinaturaEstabelecimento | null>> {
  return request(`/admin/estabelecimentos/${estabelecimentoId}/assinatura`);
}

export async function atualizarContrato(estabelecimentoId: string): Promise<ResultadoServico<void>> {
  return request(`/admin/estabelecimentos/${estabelecimentoId}/contrato`, { method: 'POST' });
}

export async function registrarPagamento(estabelecimentoId: string): Promise<ResultadoServico<void>> {
  return request(`/admin/estabelecimentos/${estabelecimentoId}/pagamento`, { method: 'POST' });
}

export async function ajustarVencimento(estabelecimentoId: string, dias: number): Promise<ResultadoServico<void>> {
  return request(`/admin/estabelecimentos/${estabelecimentoId}/vencimento`, {
    method: 'POST',
    body: JSON.stringify({ dias }),
  });
}

export async function definirAutoEdicao(estabelecimentoId: string, permitido: boolean): Promise<ResultadoServico<void>> {
  return request(`/admin/estabelecimentos/${estabelecimentoId}/auto-edicao`, {
    method: 'POST',
    body: JSON.stringify({ permitido }),
  });
}

// ============================================================================
// EXPORT AGRUPADO
// ============================================================================

export const mysqlApi = {
  autenticacao: {
    login,
    cadastrarCliente,
    cadastrarProfissional,
    sair,
    obterSessao,
    atualizarPerfilCliente,
    alterarSenha,
    excluirConta,
    validarToken,
    renovarSessao,
    recuperarSenha,
    confirmarEmail,
  },
  estabelecimentos: {
    buscar: listarEstabelecimentos,
    obter: buscarEstabelecimentoPorId,
    obterPorSlug: buscarEstabelecimentoPorSlug,
    atualizar: atualizarEstabelecimento,
    atualizarConfiguracaoPix,
    atualizarMensagensAutomaticas,
    listarServicos,
    obterServico,
    adicionarServico,
    atualizarServico,
    excluirServico,
    reordenarServicos,
    adicionarGaleria,
    removerGaleria,
    reordenarGaleria,
    listarAvaliacoes,
    responderAvaliacao,
    obterFila,
    entrarNaFila,
    chamarProximoFila,
    removerDaFila,
    adicionarPresencialNaFila,
    sairDaFila,
  },
  agendamentos: {
    listar: listarAgendamentosEstabelecimento,
    listarCliente: listarAgendamentosCliente,
    obterHorariosDisponiveis,
    criar: criarAgendamento,
    cancelar: cancelarAgendamento,
    reagendar: reagendarAgendamento,
    confirmarPresenca,
    avaliar: avaliarAgendamento,
    obter: obterAgendamento,
    listarBarbeiro,
    atualizarStatus,
    definirHorarioReal,
    confirmarPagamentoPix,
  },
  feed: {
    listar: listarFeed,
    obter: obterPublicacao,
    criar: criarPublicacao,
    curtir: alternarCurtida,
    salvar: alternarInspiracao,
    seguir: alternarSeguir,
    comentar: adicionarComentario,
    excluir: excluirPublicacao,
    compartilhar: compartilharPublicacao,
    denunciar: denunciarPublicacao,
  },
  notificacoes: {
    listar: listarNotificacoes,
    marcarComoLida: marcarNotificacaoLida,
    marcarTodasComoLidas: marcarTodasNotificacoesLidas,
    excluir: excluirNotificacao,
    excluirTodasLidas,
    enviarMensagemClientes,
    enviarAvisoBarbeiros,
  },
  barbeiro: {
    obterDashboard: obterDashboardBarbeiro,
    obterEstatisticas: obterEstatisticasBarbeiro,
  },
  admin: {
    listarUsuarios: listarUsuariosAdmin,
    obterUsuario: obterUsuarioAdmin,
    atualizarUsuario: atualizarUsuarioAdmin,
    excluirUsuario: excluirUsuarioAdmin,
    listarEstabelecimentos: listarTodosEstabelecimentosAdmin,
    obterEstabelecimento: obterEstabelecimentoAdmin,
    aprovarEstabelecimento,
    rejeitarEstabelecimento,
    suspenderEstabelecimento,
    listarPagamentos: listarPagamentosAdmin,
    listarPlanos,
    adicionarPlano,
    atualizarPlano,
    excluirPlano,
    obterAssinatura,
    atualizarContrato,
    registrarPagamento,
    ajustarVencimento,
    definirAutoEdicao,
  },
} as const;