/**
 * Tipos do domínio Perfil.
 * Perfil do usuário, avatar, preferências, histórico.
 */

import type { UsuarioRole } from '@/tipos';

/** Perfil completo do usuário */
export interface Perfil {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  avatar?: string;
  role: UsuarioRole;
  bio?: string;
  dataNascimento?: string;
  genero?: 'masculino' | 'feminino' | 'outro' | 'prefiro_nao_dizer';
  cpf?: string;
  criadoEm: string;
  atualizadoEm: string;
  emailVerificado: boolean;
  telefoneVerificado: boolean;
}

/** Preferências do usuário */
export interface PreferenciasUsuario {
  tema: 'claro' | 'escuro' | 'sistema';
  notificacoesPush: boolean;
  notificacoesEmail: boolean;
  notificacoesSms: boolean;
  notificacoesAgendamentos: boolean;
  notificacoesPromocoes: boolean;
  notificacoesLembretes: boolean;
  idioma: 'pt-BR' | 'en' | 'es';
  fusoHorario: string;
  moeda: 'BRL' | 'USD' | 'EUR';
  privacidadePerfil: 'publico' | 'apenas_conexoes' | 'privado';
  mostrarOnline: boolean;
  permitirMensagens: 'todos' | 'conexoes' | 'ninguem';
}

/** Endereço do usuário */
export interface EnderecoUsuario {
  id: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  principal: boolean;
  tipo: 'residencial' | 'comercial' | 'outro';
}

/** Cartão de pagamento salvo (tokenizado) */
export interface CartaoSalvo {
  id: string;
  bandeira: 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'outro';
  ultimosDigitos: string;
  nomeTitular: string;
  validadeMes: number;
  validadeAno: number;
  padrao: boolean;
  criadoEm: string;
}

/** Histórico de atividades do usuário */
export interface AtividadeUsuario {
  id: string;
  tipo: 'login' | 'agendamento_criado' | 'agendamento_cancelado' | 'agendamento_concluido' | 'avaliacao_feita' | 'pagamento' | 'perfil_atualizado' | 'configuracao_alterada';
  descricao: string;
  metadados?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  criadoEm: string;
}

/** Dados para atualização de perfil */
export interface AtualizarPerfilDados {
  nome?: string;
  telefone?: string;
  bio?: string;
  dataNascimento?: string;
  genero?: Perfil['genero'];
  cpf?: string;
}

/** Dados para alteração de senha */
export interface AlterarSenhaDados {
  senhaAtual: string;
  novaSenha: string;
  confirmarNovaSenha: string;
}

/** Dados para upload de avatar */
export interface UploadAvatarDados {
  arquivo: File;
  recorte?: {
    x: number;
    y: number;
    largura: number;
    altura: number;
  };
}

/** Estado do hook usePerfil */
export interface PerfilState {
  perfil: Perfil | null;
  preferencias: PreferenciasUsuario | null;
  enderecos: EnderecoUsuario[];
  cartoes: CartaoSalvo[];
  atividades: AtividadeUsuario[];
  carregando: boolean;
  erro: string | null;
  proximaPaginaAtividades: number | null;
}

/** Actions do hook usePerfil */
export interface PerfilActions {
  carregarPerfil: () => Promise<void>;
  atualizarPerfil: (dados: AtualizarPerfilDados) => Promise<void>;
  uploadAvatar: (dados: UploadAvatarDados) => Promise<void>;
  removerAvatar: () => Promise<void>;
  alterarSenha: (dados: AlterarSenhaDados) => Promise<void>;
  carregarPreferencias: () => Promise<void>;
  atualizarPreferencias: (prefs: Partial<PreferenciasUsuario>) => Promise<void>;
  carregarEnderecos: () => Promise<void>;
  adicionarEndereco: (endereco: Omit<EnderecoUsuario, 'id'>) => Promise<void>;
  atualizarEndereco: (id: string, endereco: Partial<EnderecoUsuario>) => Promise<void>;
  removerEndereco: (id: string) => Promise<void>;
  definirEnderecoPrincipal: (id: string) => Promise<void>;
  carregarCartoes: () => Promise<void>;
  adicionarCartao: (cartao: Omit<CartaoSalvo, 'id' | 'criadoEm'>) => Promise<void>;
  removerCartao: (id: string) => Promise<void>;
  definirCartaoPadrao: (id: string) => Promise<void>;
  carregarAtividades: (pagina?: number) => Promise<void>;
  limparErro: () => void;
}

/** Tipo combinado para o hook */
export type PerfilHook = PerfilState & PerfilActions;

/** Resultado padronizado */
export interface PerfilResult<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  codigo?: string;
}

/** Filtros para atividades */
export interface AtividadesFiltro {
  tipo?: AtividadeUsuario['tipo'];
  dataInicio?: string;
  dataFim?: string;
}

/** Configurações de validação */
export interface ValidacaoPerfilConfig {
  nomeMin: number;
  nomeMax: number;
  bioMax: number;
  cpfObrigatorio: boolean;
  telefoneObrigatorio: boolean;
  avatarMaxSizeMB: number;
  avatarTiposPermitidos: string[];
}