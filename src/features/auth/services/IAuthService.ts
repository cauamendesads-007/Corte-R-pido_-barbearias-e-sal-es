/**
 * Interface de contrato para serviço de autenticação (DIP).
 * Implementações: AuthServiceMock, AuthServiceReal (futuro).
 */

import type { Usuario, SessaoUsuario, ResultadoServico } from '@/tipos';

export interface IAuthService {
  /** Login com email e senha */
  login(email: string, senha: string): Promise<ResultadoServico<SessaoUsuario>>;

  /** Cadastro de novo cliente */
  cadastrarCliente(dados: {
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
  }): Promise<ResultadoServico<SessaoUsuario>>;

  /** Cadastro de novo profissional (barbeiro/salão) */
  cadastrarProfissional(dados: {
    nomeEstabelecimento: string;
    responsavel: string;
    cidade: string;
    endereco: string;
    whatsapp: string;
    nicho: string;
    email: string;
    senha: string;
  }): Promise<ResultadoServico<SessaoUsuario>>;

  /** Logout - limpa sessão local */
  sair(): Promise<ResultadoServico<void>>;

  /** Obter perfil completo do usuário autenticado */
  obterSessao(): Promise<ResultadoServico<Usuario | null>>;

  /** Atualizar perfil do cliente autenticado */
  atualizarPerfilCliente(dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>>;

  /** Alterar senha do usuário autenticado */
  alterarSenha(senhaAtual: string, novaSenha: string): Promise<ResultadoServico<void>>;

  /** Excluir conta do usuário autenticado */
  excluirConta(): Promise<ResultadoServico<void>>;

  /** Validar token de sessão (para refresh) */
  validarToken(token: string): Promise<ResultadoServico<SessaoUsuario | null>>;

  /** Renovar sessão com token atual */
  renovarSessao(): Promise<ResultadoServico<SessaoUsuario | null>>;

  /** Solicitar recuperação de senha por email */
  recuperarSenha(email: string): Promise<ResultadoServico<void>>;

  /** Confirmar email via token */
  confirmarEmail(token: string): Promise<ResultadoServico<SessaoUsuario | null>>;
}