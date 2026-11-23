/**
 * Tipos do domínio Configuracoes - Configurações do usuário.
 */

export type AbaConfiguracoes = 'perfil' | 'notificacoes' | 'privacidade' | 'aparencia' | 'conta';

export interface ConfiguracaoPerfil {
  nome: string;
  bio: string;
  whatsapp: string;
  cidade: string;
  avatar?: string | null;
}

export interface ConfiguracaoNotificacoes {
  agendamentos: boolean;
  mensagens: boolean;
  promocoes: boolean;
  whatsapp: boolean;
}

export interface ConfiguracaoPrivacidade {
  perfilPublico: boolean;
  mostrarAvaliacoes: boolean;
  historicoVisivel: boolean;
}

export interface ConfiguracaoAparencia {
  tema: 'claro' | 'escuro' | 'sistema';
  fonteGrande: boolean;
  reduzirAnimacoes: boolean;
}

export interface ConfiguracaoConta {
  senhaAtual: string;
  novaSenha: string;
  confirmarNovaSenha: string;
}

export const ABA_CONFIGURACOES_LABELS: Record<AbaConfiguracoes, string> = {
  perfil: 'Perfil',
  notificacoes: 'Notificações',
  privacidade: 'Privacidade',
  aparencia: 'Aparência',
  conta: 'Conta',
};

export const ABA_CONFIGURACOES_ICONES: Record<AbaConfiguracoes, string> = {
  perfil: '👤',
  notificacoes: '🔔',
  privacidade: '🔒',
  aparencia: '🎨',
  conta: '⚙️',
};

export const TEMA_OPCOES = [
  { valor: 'claro', rotulo: 'Claro', icone: '☀️' },
  { valor: 'escuro', rotulo: 'Escuro', icone: '🌙' },
  { valor: 'sistema', rotulo: 'Sistema', icone: '💻' },
] as const;