/**
 * Serviços do domínio de Autenticação - Interface DIP + Implementação Mock.
 * Injeção de dependência via factory/singleton.
 */

import type {
  IAuthService,
  LoginInput,
  CadastroInput,
  SessaoUsuario,
  Usuario,
  AuthResponse,
  TipoAuth,
} from '../types';

import { normalizarEmail, normalizarTelefone, normalizarCPF } from '../rules';

// ============================================
// MOCK DATA / SIMULAÇÃO
// ============================================

const USUARIOS_MOCK: Usuario[] = [
  {
    id: 'usr_1',
    email: 'cliente@demo.com',
    senha: '123456',
    papel: 'cliente',
    nome: 'João Cliente',
    confirmado: true,
    telefone: '11999999999',
    whatsapp: '11999999999',
    aceitouTermos: true,
    aceitouMarketing: true,
    lembretesWhatsapp: true,
    seguindo: [],
    inspiracaoSalvas: [],
    avatar: '',
    dataCadastro: '2024-01-15T10:00:00Z',
    dataAtualizacao: '2024-01-15T10:00:00Z',
  },
  {
    id: 'usr_2',
    email: 'barbeiro@demo.com',
    senha: '123456',
    papel: 'barbeiro',
    nome: 'Carlos Barbeiro',
    confirmado: true,
    telefone: '11888888888',
    whatsapp: '11888888888',
    cpf: '12345678901',
    nicho: 'barbearia',
    bio: 'Barbeiro experiente com 10 anos de profissão',
    aceitouTermos: true,
    aceitouMarketing: false,
    lembretesWhatsapp: true,
    seguindo: [],
    inspiracaoSalvas: [],
    estabelecimentoId: 'est_1',
    avatar: '',
    dataCadastro: '2024-01-15T10:00:00Z',
    dataAtualizacao: '2024-01-15T10:00:00Z',
  },
  {
    id: 'usr_3',
    email: 'admin@demo.com',
    senha: '123456',
    papel: 'admin',
    nome: 'Admin Sistema',
    confirmado: true,
    aceitouTermos: true,
    aceitouMarketing: false,
    lembretesWhatsapp: false,
    seguindo: [],
    inspiracaoSalvas: [],
    avatar: '',
    dataCadastro: '2024-01-15T10:00:00Z',
    dataAtualizacao: '2024-01-15T10:00:00Z',
  },
];

let proximoId = 4;

// ============================================
// IMPLEMENTAÇÃO
// ============================================

class AuthService implements IAuthService {
  private usuarioAtual: Usuario | null = null;
  private tokenAtual: string | null = null;

  private async delay(ms: number = 300): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private encontrarUsuario(email: string, senha: string, papel?: TipoAuth): Usuario | undefined {
    const emailNormalizado = normalizarEmail(email);
    return USUARIOS_MOCK.find(u =>
      normalizarEmail(u.email) === emailNormalizado &&
      u.senha === senha &&
      (!papel || u.papel === papel)
    );
  }

  private gerarSessao(usuario: Usuario): SessaoUsuario {
    return {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      papel: usuario.papel,
      estabelecimentoId: usuario.estabelecimentoId,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse<SessaoUsuario>> {
    await this.delay(500);

    const usuario = this.encontrarUsuario(input.email, input.senha, input.tipo);

    if (!usuario) {
      return { sucesso: false, erro: 'E-mail, senha ou tipo de acesso incorretos' };
    }

    if (!usuario.confirmado) {
      return { sucesso: false, erro: 'Confirme seu e-mail antes de acessar' };
    }

    this.usuarioAtual = usuario;
    this.tokenAtual = 'mock-token-' + Date.now();

    return { sucesso: true, dados: this.gerarSessao(usuario) };
  }

  async cadastrar(input: CadastroInput): Promise<AuthResponse<SessaoUsuario>> {
    await this.delay(500);

    const emailNormalizado = normalizarEmail(input.email);

    // Verifica se e-mail já existe
    if (USUARIOS_MOCK.some(u => normalizarEmail(u.email) === emailNormalizado)) {
      return { sucesso: false, erro: 'Este e-mail já está cadastrado' };
    }

    const novoUsuario: Usuario = {
      id: `usr_${proximoId++}`,
      email: emailNormalizado,
      senha: input.senha,
      papel: input.tipo,
      nome: input.nome.trim(),
      confirmado: true, // Mock: auto-confirma
      telefone: input.telefone ? normalizarTelefone(input.telefone) : undefined,
      whatsapp: input.whatsapp ? normalizarTelefone(input.whatsapp) : undefined,
      cpf: input.cpf ? normalizarCPF(input.cpf) : undefined,
      nicho: input.nicho?.trim(),
      bio: input.bio?.trim(),
      aceitouTermos: input.aceitouTermos,
      aceitouMarketing: input.aceitouMarketing,
      lembretesWhatsapp: true,
      seguindo: [],
      inspiracaoSalvas: [],
      estabelecimentoId: input.tipo === 'barbeiro' ? `est_${proximoId}` : undefined,
      avatar: '',
      dataCadastro: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString(),
    };

    USUARIOS_MOCK.push(novoUsuario);
    this.usuarioAtual = novoUsuario;
    this.tokenAtual = 'mock-token-' + Date.now();

    return { sucesso: true, dados: this.gerarSessao(novoUsuario) };
  }

  async sair(): Promise<void> {
    await this.delay(100);
    this.usuarioAtual = null;
    this.tokenAtual = null;
  }

  async obterSessao(): Promise<AuthResponse<SessaoUsuario>> {
    await this.delay(100);

    if (!this.usuarioAtual || !this.tokenAtual) {
      return { sucesso: false, erro: 'Não autenticado' };
    }

    return { sucesso: true, dados: this.gerarSessao(this.usuarioAtual) };
  }

  async validarToken(): Promise<AuthResponse<SessaoUsuario>> {
    return this.obterSessao();
  }

  async atualizarPerfil(dados: Partial<Usuario>): Promise<AuthResponse<Usuario>> {
    await this.delay(300);

    if (!this.usuarioAtual) {
      return { sucesso: false, erro: 'Não autenticado' };
    }

    // Não permite alterar e-mail, senha ou papel por aqui
    const { email, senha, papel, id, dataCadastro, ...dadosPermitidos } = dados;

    this.usuarioAtual = {
      ...this.usuarioAtual,
      ...dadosPermitidos,
      dataAtualizacao: new Date().toISOString(),
    };

    return { sucesso: true, dados: this.usuarioAtual };
  }

  async alterarSenha(senhaAtual: string, novaSenha: string): Promise<AuthResponse<void>> {
    await this.delay(300);

    if (!this.usuarioAtual) {
      return { sucesso: false, erro: 'Não autenticado' };
    }

    if (this.usuarioAtual.senha !== senhaAtual) {
      return { sucesso: false, erro: 'Senha atual incorreta' };
    }

    if (novaSenha.length < 6) {
      return { sucesso: false, erro: 'Nova senha deve ter pelo menos 6 caracteres' };
    }

    this.usuarioAtual.senha = novaSenha;
    this.usuarioAtual.dataAtualizacao = new Date().toISOString();

    return { sucesso: true };
  }

  async excluirConta(): Promise<AuthResponse<void>> {
    await this.delay(300);

    if (!this.usuarioAtual) {
      return { sucesso: false, erro: 'Não autenticado' };
    }

    const index = USUARIOS_MOCK.findIndex(u => u.id === this.usuarioAtual!.id);
    if (index >= 0) {
      USUARIOS_MOCK.splice(index, 1);
    }

    this.usuarioAtual = null;
    this.tokenAtual = null;

    return { sucesso: true };
  }

  async recuperarSenha(email: string): Promise<AuthResponse<void>> {
    await this.delay(500);

    const emailNormalizado = normalizarEmail(email);
    const usuario = USUARIOS_MOCK.find(u => normalizarEmail(u.email) === emailNormalizado);

    if (!usuario) {
      // Por segurança, não revela se e-mail existe
      return { sucesso: true };
    }

    // Em produção: enviar e-mail de recuperação
    console.log('Enviar e-mail de recuperação para:', emailNormalizado);

    return { sucesso: true };
  }

  async confirmarEmail(): Promise<AuthResponse<SessaoUsuario>> {
    await this.delay(300);

    if (!this.usuarioAtual) {
      return { sucesso: false, erro: 'Não autenticado' };
    }

    this.usuarioAtual.confirmado = true;
    this.usuarioAtual.dataAtualizacao = new Date().toISOString();

    return { sucesso: true, dados: this.gerarSessao(this.usuarioAtual) };
  }
}

// ============================================
// FACTORY / SINGLETON
// ============================================

let serviceInstance: IAuthService | null = null;

export function createAuthService(): IAuthService {
  if (!serviceInstance) {
    serviceInstance = new AuthService();
  }
  return serviceInstance;
}

export const authService = createAuthService();

export type { IAuthService };

export function resetAuthService(): void {
  serviceInstance = null;
}