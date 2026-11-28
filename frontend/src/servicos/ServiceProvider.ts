// ============================================================================
// SERVICE PROVIDER - Dependency Injection Container
// Seleciona entre: MySQL Backend (VITE_API_URL) > Supabase (VITE_SUPABASE_URL) > Mocks
// ============================================================================

import { isMockMode, initSupabase } from './supabase/client';
import type {
  ResultadoServico,
  SessaoUsuario,
  Usuario,
  Estabelecimento,
  Agendamento,
  Publicacao,
  Notificacao,
  Servico,
  ItemGaleria,
  Avaliacao,
  FiltrosBusca,
  ConfiguracaoPix,
  MensagemAutomatica,
  PlanoAssinatura,
  AssinaturaEstabelecimento,
  Comentario,
  TipoLayout,
  NichoEstabelecimento,
  StatusEstabelecimento,
  StatusAgendamento,
} from '@/tipos';

// Verifica qual backend usar
function getBackendMode(): 'mysql' | 'supabase' | 'mock' {
  if (import.meta.env.VITE_API_URL) return 'mysql';
  if (import.meta.env.VITE_SUPABASE_URL) return 'supabase';
  return 'mock';
}

// Tipos para as interfaces dos serviços
interface IAuthService {
  entrar(email: string, senha: string): Promise<ResultadoServico<SessaoUsuario>>;
  cadastrarCliente(dados: { nome: string; email: string; senha: string }): Promise<ResultadoServico<SessaoUsuario>>;
  cadastrarProfissional(dados: {
    nomeEstabelecimento: string; responsavel: string; email: string; senha: string;
    cidade: string; endereco: string; whatsapp: string; nicho: NichoEstabelecimento;
  }): Promise<ResultadoServico<{ estabelecimentoId: string }>>;
  sair(): Promise<ResultadoServico<void>>;
  obterSessao(): Promise<ResultadoServico<SessaoUsuario | null>>;
  atualizarPerfilCliente(dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>>;
  alterarSenha(senhaAtual: string, novaSenha: string): Promise<ResultadoServico<void>>;
  excluirConta(): Promise<ResultadoServico<void>>;
  validarToken(): Promise<ResultadoServico<SessaoUsuario | null>>;
  renovarSessao(): Promise<ResultadoServico<SessaoUsuario | null>>;
  recuperarSenha(email: string): Promise<ResultadoServico<void>>;
  confirmarEmail(): Promise<ResultadoServico<SessaoUsuario | null>>;
  login(email: string, senha: string): Promise<ResultadoServico<SessaoUsuario>>;
  cadastrar(dados: {
    nome: string; email: string; senha: string; telefone?: string; tipo: 'cliente' | 'barbeiro';
    estabelecimentoId?: string; nomeEstabelecimento?: string; responsavel?: string;
    cidade?: string; endereco?: string; whatsapp?: string; nicho?: NichoEstabelecimento;
  }): Promise<ResultadoServico<SessaoUsuario | { estabelecimentoId: string }>>;
  // Admin
  listarUsuariosAdmin(): Promise<ResultadoServico<Usuario[]>>;
  obterUsuarioAdmin(id: string): Promise<ResultadoServico<Usuario | null>>;
  atualizarUsuarioAdmin(id: string, dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>>;
  excluirUsuarioAdmin(id: string): Promise<ResultadoServico<void>>;
}

interface IEstabelecimentosService {
  listarEstabelecimentos(filtros: FiltrosBusca): Promise<ResultadoServico<Estabelecimento[]>>;
  buscarEstabelecimentoPorSlug(slug: string): Promise<ResultadoServico<Estabelecimento | null>>;
  buscarEstabelecimentoPorId(id: string): Promise<ResultadoServico<Estabelecimento | null>>;
  atualizarEstabelecimento(id: string, dados: Partial<Estabelecimento>): Promise<ResultadoServico<Estabelecimento>>;
  atualizarConfiguracaoPix(id: string, config: ConfiguracaoPix): Promise<ResultadoServico<ConfiguracaoPix>>;
  atualizarMensagensAutomaticas(id: string, mensagens: MensagemAutomatica): Promise<ResultadoServico<MensagemAutomatica>>;
  listarServicos(estabelecimentoId: string): Promise<ResultadoServico<Servico[]>>;
  obterServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<Servico | null>>;
  adicionarServico(estabelecimentoId: string, servico: Omit<Servico, 'id'>): Promise<ResultadoServico<Servico>>;
  atualizarServico(estabelecimentoId: string, servicoId: string, dados: Partial<Servico>): Promise<ResultadoServico<Servico>>;
  excluirServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<void>>;
  reordenarServicos(estabelecimentoId: string, servicoIds: string[]): Promise<ResultadoServico<Servico[]>>;
  adicionarMidiaServico(estabelecimentoId: string, servicoId: string, midia: { tipo: 'imagem' | 'video'; src: string }): Promise<ResultadoServico<Servico>>;
  removerMidiaServico(estabelecimentoId: string, servicoId: string, midiaIndex: number): Promise<ResultadoServico<Servico>>;
  adicionarGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>>;
  removerGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>>;
  reordenarGaleria(estabelecimentoId: string, itemIds: string[]): Promise<ResultadoServico<ItemGaleria[]>>;
  listarAvaliacoes(estabelecimentoId: string): Promise<ResultadoServico<Avaliacao[]>>;
  responderAvaliacao(estabelecimentoId: string, avaliacaoId: string, resposta: string): Promise<ResultadoServico<Avaliacao>>;
  entrarNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<{ posicao: number; esperaEstimada: number }>>;
  obterFila(estabelecimentoId: string): Promise<ResultadoServico<{ fila: Array<{ nome: string; horarioChegada: string }>; esperaEstimada: number }>>;
  chamarProximoFila(estabelecimentoId: string): Promise<ResultadoServico<void>>;
  removerDaFila(estabelecimentoId: string, index: number): Promise<ResultadoServico<void>>;
  adicionarPresencialNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>>;
  sairDaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>>;
  atualizarTemaEstabelecimento(id: string, tema: { cor?: string; layout?: TipoLayout; titulo?: string; subtitulo?: string }): Promise<ResultadoServico<Estabelecimento>>;
  atualizarHorarioFuncionamento(id: string, horario: string): Promise<ResultadoServico<Estabelecimento>>;
  definirAutoEdicao(estabelecimentoId: string, permitido: boolean): Promise<ResultadoServico<void>>;
  criarEstabelecimento(dados: Omit<Estabelecimento, 'id' | 'slug' | 'avaliacao' | 'status' | 'seguidores' | 'taxaFidelidade'>): Promise<ResultadoServico<Estabelecimento>>;
  excluirEstabelecimento(id: string): Promise<ResultadoServico<void>>;
  obterEstabelecimento(id: string): Promise<ResultadoServico<Estabelecimento | null>>;
  obterEstabelecimentoPorSlug(slug: string): Promise<ResultadoServico<Estabelecimento | null>>;
  buscarEstabelecimentos(filtros: FiltrosBusca): Promise<ResultadoServico<Estabelecimento[]>>;
  listarServicosWrapper(estabelecimentoId: string): Promise<ResultadoServico<Servico[]>>;
  obterServicoWrapper(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<Servico | null>>;
  criarServico(estabelecimentoId: string, servico: Omit<Servico, 'id'>): Promise<ResultadoServico<Servico>>;
  adicionarMidiaGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>>;
  removerMidiaGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>>;
  chamarProximo(estabelecimentoId: string): Promise<ResultadoServico<void>>;
  adicionarAvaliacao(estabelecimentoId: string, avaliacao: Omit<Avaliacao, 'id'>): Promise<ResultadoServico<Avaliacao>>;
}

interface IAgendamentosService {
  listarAgendamentosEstabelecimento(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>>;
  listarAgendamentosCliente(usuarioId: string): Promise<ResultadoServico<Agendamento[]>>;
  listarAgendamentos(filtros: { estabelecimentoId?: string; usuarioId?: string }): Promise<ResultadoServico<Agendamento[]>>;
  obterHorariosDisponiveis(estabelecimentoId: string, dia: string, duracaoMinutos: number): Promise<ResultadoServico<Array<{ horario: string; disponivel: boolean }>>>;
  criarAgendamento(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>>;
  cancelarAgendamento(agendamentoId: string): Promise<ResultadoServico<void>>;
  reagendarAgendamento(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>>;
  confirmarPresenca(agendamentoId: string): Promise<ResultadoServico<void>>;
  avaliarAgendamento(agendamentoId: string, estrelas: number, comentario: string): Promise<ResultadoServico<void>>;
  obterAgendamento(agendamentoId: string): Promise<ResultadoServico<Agendamento | null>>;
  listarBarbeiro(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>>;
  atualizarStatus(agendamentoId: string, status: StatusAgendamento): Promise<ResultadoServico<void>>;
  definirHorarioReal(agendamentoId: string, horarioReal: string): Promise<ResultadoServico<void>>;
  confirmarPagamentoPix(agendamentoId: string): Promise<ResultadoServico<void>>;
  criarAgendamentoWrapper(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>>;
  reagendarAgendamentoWrapper(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>>;
  cancelarAgendamentoWrapper(agendamentoId: string): Promise<ResultadoServico<void>>;
  obterHorariosDisponiveisWrapper(estabelecimentoId: string, dia: string, duracaoMinutos: number): Promise<ResultadoServico<Array<{ horario: string; disponivel: boolean }>>>;
}

interface IFeedService {
  listarFeed(filtro: string, usuarioEmail?: string): Promise<ResultadoServico<Publicacao[]>>;
  obterPublicacao(id: string): Promise<ResultadoServico<Publicacao | null>>;
  criarPublicacao(dados: Omit<Publicacao, 'id' | 'curtidas' | 'salvos' | 'visualizacoes' | 'compartilhamentos' | 'comentarios' | 'dataCriacao' | 'criadoEm' | 'autorId' | 'autorNome' | 'conteudo' | 'usuarioCurtiu' | 'estaCurtido' | 'usuarioSalvou' | 'estaSalvo'>): Promise<ResultadoServico<Publicacao>>;
  alternarCurtida(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ curtido: boolean; total: number }>>;
  alternarInspiracao(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ salvo: boolean }>>;
  alternarSeguir(estabelecimentoId: string, usuarioEmail: string): Promise<ResultadoServico<{ seguindo: boolean }>>;
  adicionarComentario(publicacaoId: string, autorNome: string, texto: string): Promise<ResultadoServico<Comentario>>;
  excluirPublicacao(publicacaoId: string, estabelecimentoId: string): Promise<ResultadoServico<void>>;
  listarPublicacoes(filtros: { estabelecimentoId?: string; usuarioEmail?: string; filtro?: string }): Promise<ResultadoServico<Publicacao[]>>;
  obterPublicacaoWrapper(publicacaoId: string): Promise<ResultadoServico<Publicacao | null>>;
  criarPublicacaoFeed(dados: Omit<Publicacao, 'id' | 'curtidas' | 'salvos' | 'comentarios' | 'dataCriacao' | 'criadoEm' | 'visualizacoes' | 'compartilhamentos' | 'autorId' | 'autorNome' | 'conteudo' | 'usuarioCurtiu' | 'estaCurtido' | 'usuarioSalvou' | 'estaSalvo'>): Promise<ResultadoServico<Publicacao>>;
  excluirPublicacaoWrapper(publicacaoId: string, estabelecimentoId: string): Promise<ResultadoServico<void>>;
  curtirPublicacao(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ curtido: boolean; total: number }>>;
  salvarPublicacao(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ salvo: boolean }>>;
  obterSalvas(usuarioEmail: string): Promise<ResultadoServico<Publicacao[]>>;
  compartilharPublicacao(publicacaoId: string): Promise<ResultadoServico<void>>;
  denunciarPublicacao(publicacaoId: string, motivo: string): Promise<ResultadoServico<void>>;
}

interface INotificacoesService {
  listarNotificacoes(usuarioEmail: string, filtro: string): Promise<ResultadoServico<Notificacao[]>>;
  marcarNotificacaoLida(notificacaoId: string): Promise<ResultadoServico<void>>;
  marcarTodasNotificacoesLidas(usuarioEmail: string): Promise<ResultadoServico<void>>;
  excluirNotificacao(notificacaoId: string): Promise<ResultadoServico<void>>;
  excluirTodasLidas(usuarioEmail: string): Promise<ResultadoServico<void>>;
  enviarMensagemClientes(estabelecimentoId: string, destinatarios: string[], texto: string): Promise<ResultadoServico<number>>;
  enviarAvisoBarbeiros(destinatarios: string[], texto: string): Promise<ResultadoServico<number>>;
  marcarComoLida(notificacaoId: string): Promise<ResultadoServico<void>>;
  marcarTodasComoLidas(usuarioEmail: string): Promise<ResultadoServico<void>>;
  excluir(notificacaoId: string): Promise<ResultadoServico<void>>;
  excluirTodasLidasWrapper(usuarioEmail: string): Promise<ResultadoServico<void>>;
}

interface IBarbeiroService {
  obterDashboardBarbeiro(): Promise<ResultadoServico<{
    agendamentosHoje: number;
    agendamentosSemana: number;
    faturamentoMes: number;
    avaliacaoMedia: number;
    filaAtual: number;
    proximosAgendamentos: Agendamento[];
  }>>;
  obterEstatisticasBarbeiro(): Promise<ResultadoServico<{
    totalAgendamentos: number;
    totalClientes: number;
    faturamentoTotal: number;
    servicosMaisProcurados: Array<{ nome: string; quantidade: number }>;
  }>>;
}

interface IAdminService {
  listarUsuariosAdmin(): Promise<ResultadoServico<Usuario[]>>;
  obterUsuarioAdmin(id: string): Promise<ResultadoServico<Usuario | null>>;
  atualizarUsuarioAdmin(id: string, dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>>;
  excluirUsuarioAdmin(id: string): Promise<ResultadoServico<void>>;
  listarEstabelecimentosAdmin(): Promise<ResultadoServico<Estabelecimento[]>>;
  obterEstabelecimentoAdmin(id: string): Promise<ResultadoServico<Estabelecimento | null>>;
  aprovarEstabelecimento(id: string): Promise<ResultadoServico<void>>;
  rejeitarEstabelecimento(id: string): Promise<ResultadoServico<void>>;
  suspenderEstabelecimento(id: string): Promise<ResultadoServico<void>>;
  listarPagamentosAdmin(): Promise<ResultadoServico<Array<{ estabelecimento: string; data: string; valor: number; status: string }>>>;
  obterPlanosAdmin(): Promise<ResultadoServico<PlanoAssinatura[]>>;
  criarPlanoAdmin(dados: Omit<PlanoAssinatura, 'id'>): Promise<ResultadoServico<PlanoAssinatura>>;
  atualizarPlanoAdmin(planoId: string, dados: Partial<PlanoAssinatura>): Promise<ResultadoServico<PlanoAssinatura>>;
  excluirPlanoAdmin(planoId: string): Promise<ResultadoServico<void>>;
  listarAssinaturasAdmin(): Promise<ResultadoServico<Record<string, AssinaturaEstabelecimento>>>;
  obterAssinatura(estabelecimentoId: string): Promise<ResultadoServico<AssinaturaEstabelecimento | null>>;
  atualizarContrato(estabelecimentoId: string): Promise<ResultadoServico<void>>;
  registrarPagamento(estabelecimentoId: string): Promise<ResultadoServico<void>>;
  ajustarVencimento(estabelecimentoId: string, dias: number): Promise<ResultadoServico<void>>;
  definirAutoEdicao(estabelecimentoId: string, permitido: boolean): Promise<ResultadoServico<void>>;
  listarTodosEstabelecimentosAdmin(): Promise<ResultadoServico<Estabelecimento[]>>;
  listarUsuarios(): Promise<ResultadoServico<Usuario[]>>;
  obterUsuario(): Promise<ResultadoServico<Usuario | null>>;
  listarPagamentos(): Promise<ResultadoServico<Array<{ estabelecimento: string; data: string; valor: number; status: string }>>>;
  obterPlanos(): Promise<ResultadoServico<PlanoAssinatura[]>>;
  criarPlano(dados: Omit<PlanoAssinatura, 'id'>): Promise<ResultadoServico<PlanoAssinatura>>;
  atualizarPlano(planoId: string, dados: Partial<PlanoAssinatura>): Promise<ResultadoServico<PlanoAssinatura>>;
  excluirPlano(planoId: string): Promise<ResultadoServico<void>>;
  listarAssinaturas(): Promise<ResultadoServico<Record<string, AssinaturaEstabelecimento>>>;
}

// ============================================================================
// LAZY LOADING DOS SERVIÇOS
// ============================================================================

let _authService: IAuthService | null = null;
let _estabelecimentosService: IEstabelecimentosService | null = null;
let _agendamentosService: IAgendamentosService | null = null;
let _feedService: IFeedService | null = null;
let _notificacoesService: INotificacoesService | null = null;
let _barbeiroService: IBarbeiroService | null = null;
let _adminService: IAdminService | null = null;

// Inicializa Supabase no primeiro uso
function ensureSupabaseInit() {
  initSupabase();
}

async function getAuthService(): Promise<IAuthService> {
  if (_authService) return _authService;

  const mode = getBackendMode();

  if (mode === 'mysql') {
    const { mysqlApi } = await import('./mysqlApi');
    _authService = mysqlApi.autenticacao as unknown as IAuthService;
  } else if (mode === 'supabase') {
    ensureSupabaseInit();
    const { SupabaseAuthService } = await import('./supabase/SupabaseAuthService');
    _authService = SupabaseAuthService as unknown as IAuthService;
  } else {
    const { api } = await import('./api');
    _authService = api.autenticacao as unknown as IAuthService;
  }

  return _authService;
}

async function getEstabelecimentosService(): Promise<IEstabelecimentosService> {
  if (_estabelecimentosService) return _estabelecimentosService;

  const mode = getBackendMode();

  if (mode === 'mysql') {
    const { mysqlApi } = await import('./mysqlApi');
    _estabelecimentosService = mysqlApi.estabelecimentos as unknown as IEstabelecimentosService;
  } else if (mode === 'supabase') {
    ensureSupabaseInit();
    const { SupabaseEstabelecimentosService } = await import('./supabase/SupabaseEstabelecimentosService');
    _estabelecimentosService = SupabaseEstabelecimentosService as unknown as IEstabelecimentosService;
  } else {
    const { api } = await import('./api');
    _estabelecimentosService = api.estabelecimentos as unknown as IEstabelecimentosService;
  }

  return _estabelecimentosService;
}

async function getAgendamentosService(): Promise<IAgendamentosService> {
  if (_agendamentosService) return _agendamentosService;

  const mode = getBackendMode();

  if (mode === 'mysql') {
    const { mysqlApi } = await import('./mysqlApi');
    _agendamentosService = mysqlApi.agendamentos as unknown as IAgendamentosService;
  } else if (mode === 'supabase') {
    ensureSupabaseInit();
    const { SupabaseAgendamentosService } = await import('./supabase/SupabaseAgendamentosService');
    _agendamentosService = SupabaseAgendamentosService as unknown as IAgendamentosService;
  } else {
    const { api } = await import('./api');
    _agendamentosService = api.agendamentos as unknown as IAgendamentosService;
  }

  return _agendamentosService;
}

async function getFeedService(): Promise<IFeedService> {
  if (_feedService) return _feedService;

  const mode = getBackendMode();

  if (mode === 'mysql') {
    const { mysqlApi } = await import('./mysqlApi');
    _feedService = mysqlApi.feed as unknown as IFeedService;
  } else if (mode === 'supabase') {
    ensureSupabaseInit();
    const { SupabaseFeedService } = await import('./supabase/SupabaseFeedService');
    _feedService = SupabaseFeedService as unknown as IFeedService;
  } else {
    const { api } = await import('./api');
    _feedService = api.feed as unknown as IFeedService;
  }

  return _feedService;
}

async function getNotificacoesService(): Promise<INotificacoesService> {
  if (_notificacoesService) return _notificacoesService;

  const mode = getBackendMode();

  if (mode === 'mysql') {
    const { mysqlApi } = await import('./mysqlApi');
    _notificacoesService = mysqlApi.notificacoes as unknown as INotificacoesService;
  } else if (mode === 'supabase') {
    ensureSupabaseInit();
    const { SupabaseNotificacoesService } = await import('./supabase/SupabaseNotificacoesService');
    _notificacoesService = SupabaseNotificacoesService as unknown as INotificacoesService;
  } else {
    const { api } = await import('./api');
    _notificacoesService = api.notificacoes as unknown as INotificacoesService;
  }

  return _notificacoesService;
}

async function getBarbeiroService(): Promise<IBarbeiroService> {
  if (_barbeiroService) return _barbeiroService;

  const mode = getBackendMode();

  if (mode === 'mysql') {
    const { mysqlApi } = await import('./mysqlApi');
    _barbeiroService = mysqlApi.barbeiro as unknown as IBarbeiroService;
  } else if (mode === 'supabase') {
    ensureSupabaseInit();
    const { SupabaseBarbeiroService } = await import('./supabase/SupabaseBarbeiroService');
    _barbeiroService = SupabaseBarbeiroService as unknown as IBarbeiroService;
  } else {
    const { api } = await import('./api');
    _barbeiroService = api.barbeiro as unknown as IBarbeiroService;
  }

  return _barbeiroService;
}

async function getAdminService(): Promise<IAdminService> {
  if (_adminService) return _adminService;

  const mode = getBackendMode();

  if (mode === 'mysql') {
    const { mysqlApi } = await import('./mysqlApi');
    _adminService = mysqlApi.admin as unknown as IAdminService;
  } else if (mode === 'supabase') {
    ensureSupabaseInit();
    const { SupabaseAdminService } = await import('./supabase/SupabaseAdminService');
    _adminService = SupabaseAdminService as unknown as IAdminService;
  } else {
    const { api } = await import('./api');
    _adminService = api.admin as unknown as IAdminService;
  }

  return _adminService;
}

// ============================================================================
// PROXY OBJECT - Interface unificada
// ============================================================================

const serviceProxy = {
  get autenticacao() {
    return new Proxy({}, {
      get(_, prop) {
        return async (...args: any[]) => {
          const service = await getAuthService();
          return (service as any)[prop](...args);
        };
      },
    });
  },

  get estabelecimentos() {
    return new Proxy({}, {
      get(_, prop) {
        return async (...args: any[]) => {
          const service = await getEstabelecimentosService();
          return (service as any)[prop](...args);
        };
      },
    });
  },

  get agendamentos() {
    return new Proxy({}, {
      get(_, prop) {
        return async (...args: any[]) => {
          const service = await getAgendamentosService();
          return (service as any)[prop](...args);
        };
      },
    });
  },

  get feed() {
    return new Proxy({}, {
      get(_, prop) {
        return async (...args: any[]) => {
          const service = await getFeedService();
          return (service as any)[prop](...args);
        };
      },
    });
  },

  get notificacoes() {
    return new Proxy({}, {
      get(_, prop) {
        return async (...args: any[]) => {
          const service = await getNotificacoesService();
          return (service as any)[prop](...args);
        };
      },
    });
  },

  get perfil() {
    return new Proxy({}, {
      get(_, prop) {
        return async (...args: any[]) => {
          const service = await getAuthService();
          // perfil usa métodos do auth service
          const map: Record<string, string> = {
            obter: 'obterSessao',
            atualizar: 'atualizarPerfilCliente',
            alterarSenha: 'alterarSenha',
            excluirConta: 'excluirConta',
          };
          const method = map[prop as string] || prop;
          return (service as any)[method](...args);
        };
      },
    });
  },

  get barbeiro() {
    return new Proxy({}, {
      get(_, prop) {
        return async (...args: any[]) => {
          const service = await getBarbeiroService();
          return (service as any)[prop](...args);
        };
      },
    });
  },

  get admin() {
    return new Proxy({}, {
      get(_, prop) {
        return async (...args: any[]) => {
          const service = await getAdminService();
          return (service as any)[prop](...args);
        };
      },
    });
  },

  get mensagens() {
    return new Proxy({}, {
      get(_, prop) {
        return async (...args: any[]) => {
          const service = await getNotificacoesService();
          const map: Record<string, string> = {
            listarConversas: 'listarNotificacoes',
            obterMensagens: 'listarNotificacoes',
            enviarMensagem: 'enviarMensagemClientes',
            enviarMensagemClientes: 'enviarMensagemClientes',
          };
          const method = map[prop as string] || prop;
          return (service as any)[method](...args);
        };
      },
    });
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const api = serviceProxy;

export async function getService<T>(domain: 'autenticacao' | 'estabelecimentos' | 'agendamentos' | 'feed' | 'notificacoes' | 'barbeiro' | 'admin'): Promise<T> {
  switch (domain) {
    case 'autenticacao': return getAuthService() as Promise<T>;
    case 'estabelecimentos': return getEstabelecimentosService() as Promise<T>;
    case 'agendamentos': return getAgendamentosService() as Promise<T>;
    case 'feed': return getFeedService() as Promise<T>;
    case 'notificacoes': return getNotificacoesService() as Promise<T>;
    case 'barbeiro': return getBarbeiroService() as Promise<T>;
    case 'admin': return getAdminService() as Promise<T>;
  }
}

// Helper para forçar modo mock (útil para testes)
export function forceMockMode(): void {
  _authService = null;
  _estabelecimentosService = null;
  _agendamentosService = null;
  _feedService = null;
  _notificacoesService = null;
  _barbeiroService = null;
  _adminService = null;
}

// Helper para forçar modo Supabase (útil para testes de integração)
export function forceSupabaseMode(): void {
  _authService = null;
  _estabelecimentosService = null;
  _agendamentosService = null;
  _feedService = null;
  _notificacoesService = null;
  _barbeiroService = null;
  _adminService = null;
}

// Helper para forçar modo MySQL (útil para testes de integração)
export function forceMysqlMode(): void {
  _authService = null;
  _estabelecimentosService = null;
  _agendamentosService = null;
  _feedService = null;
  _notificacoesService = null;
  _barbeiroService = null;
  _adminService = null;
}

// Exporta função para saber qual backend está ativo
export { getBackendMode };

export default serviceProxy;