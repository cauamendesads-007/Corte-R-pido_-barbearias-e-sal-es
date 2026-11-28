/**
 * Tipos do domínio de Autenticação - Login, Cadastro, Sessão, Usuário.
 */

export type TipoAuth = 'cliente' | 'barbeiro' | 'admin';

export type TipoCadastro = 'cliente' | 'barbeiro' | 'admin';

export type CadastroEtapa = 1 | 2 | 3 | 4;

export interface LoginInput {
  email: string;
  senha: string;
  tipo: TipoAuth;
}

export interface CadastroInput {
  // Etapa 1
  tipo: TipoCadastro;
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;

  // Etapa 2 (cliente) - contato
  telefone?: string;
  whatsapp?: string;

  // Etapa 3 (barbeiro) - dados profissionais / estabelecimento
  cpf?: string;
  nicho?: string;
  bio?: string;
  estabelecimentoNome?: string;
  estabelecimentoNicho?: string;
  estabelecimentoCidade?: string;
  estabelecimentoEndereco?: string;

  // Etapa 4 - termos
  aceitouTermos: boolean;
  aceitouMarketing?: boolean;
  codigoConvite?: string;
}

export interface SessaoUsuario {
  id: string;
  email: string;
  nome: string;
  papel: string;
  estabelecimentoId?: string;
}

export interface Usuario {
  id: string;
  email: string;
  senha: string;
  papel: 'cliente' | 'barbeiro' | 'admin';
  nome: string;
  confirmado: boolean;
  telefone?: string;
  whatsapp?: string;
  cpf?: string;
  nicho?: string;
  bio?: string;
  aceitouTermos: boolean;
  aceitouMarketing?: boolean;
  lembretesWhatsapp: boolean;
  seguindo: string[];
  inspiracaoSalvas: string[];
  estabelecimentoId?: string;
  avatar?: string;
  dataCadastro: string;
  dataAtualizacao: string;
}

export interface AuthResponse<T = unknown> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
}

export interface AuthState {
  usuario: Usuario | null;
  carregando: boolean;
  erro: string | null;
}

export interface AuthActions {
  login: (input: LoginInput) => Promise<AuthResponse<SessaoUsuario>>;
  cadastrar: (input: CadastroInput) => Promise<AuthResponse<SessaoUsuario>>;
  sair: () => Promise<void>;
  atualizarPerfil: (dados: Partial<Usuario>) => Promise<AuthResponse<Usuario>>;
  alterarSenha: (senhaAtual: string, novaSenha: string) => Promise<AuthResponse<void>>;
  excluirConta: () => Promise<AuthResponse<void>>;
  limparErro: () => void;
  recuperarSenha: (email: string) => Promise<AuthResponse<void>>;
  confirmarEmail: () => Promise<AuthResponse<SessaoUsuario>>;
}

export interface AuthContext extends AuthState, AuthActions {
  autenticado: boolean;
}

export interface IAuthService {
  login(input: LoginInput): Promise<AuthResponse<SessaoUsuario>>;
  cadastrar(input: CadastroInput): Promise<AuthResponse<SessaoUsuario>>;
  sair(): Promise<void>;
  obterSessao(): Promise<AuthResponse<SessaoUsuario>>;
  validarToken(): Promise<AuthResponse<SessaoUsuario>>;
  atualizarPerfil(dados: Partial<Usuario>): Promise<AuthResponse<Usuario>>;
  alterarSenha(senhaAtual: string, novaSenha: string): Promise<AuthResponse<void>>;
  excluirConta(): Promise<AuthResponse<void>>;
  recuperarSenha(email: string): Promise<AuthResponse<void>>;
  confirmarEmail(): Promise<AuthResponse<SessaoUsuario>>;
}