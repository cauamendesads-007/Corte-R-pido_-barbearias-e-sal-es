/**
 * Tipos do domínio Configurações.
 * Painéis de configurações: conta, aparência, notificações, privacidade, segurança.
 */

/** Configurações da conta */
export interface ConfiguracoesConta {
  nome: string;
  email: string;
  telefone?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  doisFatoresAtivo: boolean;
  emailVerificado: boolean;
  telefoneVerificado: boolean;
  criadoEm: string;
}

/** Configurações de aparência */
export interface ConfiguracoesAparencia {
  tema: 'claro' | 'escuro' | 'sistema';
  fonteTamanho: 'pequeno' | 'medio' | 'grande';
  animacoes: boolean;
  altoContraste: boolean;
  reduzirMovimento: boolean;
  idioma: 'pt-BR' | 'en' | 'es';
  fusoHorario: string;
  formatoHora: '12h' | '24h';
  primeiraDiaSemana: 0 | 1 | 6; // Domingo, Segunda, Sábado
}

/** Configurações de notificações */
export interface ConfiguracoesNotificacoes {
  // Push
  pushAtivo: boolean;
  pushAgendamentos: boolean;
  pushLembretes: boolean;
  pushPromocoes: boolean;
  pushAvaliacoes: boolean;
  pushMensagens: boolean;
  pushSistema: boolean;

  // Email
  emailAtivo: boolean;
  emailAgendamentos: boolean;
  emailLembretes: boolean;
  emailPromocoes: boolean;
  emailAvaliacoes: boolean;
  emailMensagens: boolean;
  emailRelatorios: boolean;
  emailSeguranca: boolean;

  // SMS
  smsAtivo: boolean;
  smsAgendamentos: boolean;
  smsLembretes: boolean;
  smsCodigos: boolean;

  // Horários
  naoPerturbarInicio?: string; // HH:mm
  naoPerturbarFim?: string; // HH:mm
  fusoHorarioNotificacoes: string;
}

/** Configurações de privacidade */
export interface ConfiguracoesPrivacidade {
  visibilidadePerfil: 'publico' | 'apenas_conexoes' | 'privado';
  mostrarOnline: boolean;
  mostrarUltimoAcesso: boolean;
  permitirMensagens: 'todos' | 'conexoes' | 'ninguem';
  permitirConvites: 'todos' | 'conexoes' | 'ninguem';
  mostrarAvaliacoes: boolean;
  mostrarHistorico: boolean;
  indexarBusca: boolean;
  compartilharDadosAnalytics: boolean;
  compartilharDadosMarketing: boolean;
}

/** Configurações de segurança */
export interface ConfiguracoesSeguranca {
  doisFatoresAtivo: boolean;
  doisFatoresMetodo: 'app' | 'sms' | 'email';
  senhaAtualizadaEm: string;
  sessoesAtivas: SessaoAtiva[];
  dispositivosConfiaveis: DispositivoConfiavel[];
  alertasLogin: boolean;
  alertasNovosDispositivos: boolean;
  bloquearAposTentativas: number;
  tempoBloqueio: number; // minutos
}

/** Sessão ativa */
export interface SessaoAtiva {
  id: string;
  dispositivo: string;
  navegador: string;
  sistemaOperacional: string;
  ip: string;
  localizacao?: string;
  atual: boolean;
  ultimaAtividade: string;
  criadoEm: string;
}

/** Dispositivo confiável */
export interface DispositivoConfiavel {
  id: string;
  nome: string;
  tipo: 'mobile' | 'desktop' | 'tablet';
  ultimoAcesso: string;
  criadoEm: string;
}

/** Estado do hook useConfiguracoes */
export interface ConfiguracoesState {
  conta: ConfiguracoesConta | null;
  aparencia: ConfiguracoesAparencia | null;
  notificacoes: ConfiguracoesNotificacoes | null;
  privacidade: ConfiguracoesPrivacidade | null;
  seguranca: ConfiguracoesSeguranca | null;
  carregando: boolean;
  erro: string | null;
  salvando: Record<string, boolean>;
}

/** Actions do hook useConfiguracoes */
export interface ConfiguracoesActions {
  carregarTodas: () => Promise<void>;
  carregarConta: () => Promise<void>;
  carregarAparencia: () => Promise<void>;
  carregarNotificacoes: () => Promise<void>;
  carregarPrivacidade: () => Promise<void>;
  carregarSeguranca: () => Promise<void>;

  atualizarConta: (dados: Partial<ConfiguracoesConta>) => Promise<void>;
  atualizarAparencia: (dados: Partial<ConfiguracoesAparencia>) => Promise<void>;
  atualizarNotificacoes: (dados: Partial<ConfiguracoesNotificacoes>) => Promise<void>;
  atualizarPrivacidade: (dados: Partial<ConfiguracoesPrivacidade>) => Promise<void>;
  atualizarSeguranca: (dados: Partial<ConfiguracoesSeguranca>) => Promise<void>;

  // Ações específicas
  alterarSenha: (senhaAtual: string, novaSenha: string) => Promise<void>;
  ativarDoisFatores: (metodo: 'app' | 'sms' | 'email', codigo: string) => Promise<{ secret?: string; qrCode?: string } | void>;
  desativarDoisFatores: (senha: string) => Promise<void>;
  revogarSessao: (sessaoId: string) => Promise<void>;
  revogarTodasSessoes: () => Promise<void>;
  removerDispositivoConfiavel: (dispositivoId: string) => Promise<void>;
  exportarDados: () => Promise<Blob>;
  excluirConta: (senha: string, confirmacao: string) => Promise<void>;

  limparErro: () => void;
}

/** Tipo combinado para o hook */
export type ConfiguracoesHook = ConfiguracoesState & ConfiguracoesActions;

/** Resultado padronizado */
export interface ConfiguracoesResult<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  codigo?: string;
}

/** Abas de configurações */
export type ConfiguracoesAba =
  | 'conta'
  | 'aparencia'
  | 'notificacoes'
  | 'privacidade'
  | 'seguranca';

export const ABAS_CONFIGURACOES: { id: ConfiguracoesAba; rotulo: string; icone: string; descricao: string }[] = [
  { id: 'conta', rotulo: 'Conta', icone: 'usuario', descricao: 'Dados pessoais e login' },
  { id: 'aparencia', rotulo: 'Aparência', icone: 'paleta', descricao: 'Tema, fonte e exibição' },
  { id: 'notificacoes', rotulo: 'Notificações', icone: 'sino', descricao: 'Push, e-mail e SMS' },
  { id: 'privacidade', rotulo: 'Privacidade', icone: 'escudo', descricao: 'Visibilidade e dados' },
  { id: 'seguranca', rotulo: 'Segurança', icone: 'trava', descricao: '2FA, sessões e senha' },
];