/**
 * Implementação Mock do IAuthService.
 * Simula latência, taxa de erro 5% e persiste em localStorage.
 */

import { IAuthService } from './IAuthService';
import type { Usuario, SessaoUsuario, Estabelecimento, NichoEstabelecimento, StatusEstabelecimento, ConfiguracaoPix, TemaEstabelecimento, ResultadoServico } from '@/tipos';
import { estadoGlobal, simularLatencia, simularErroAleatorio, gerarId, persistirEstado, sucesso, falha } from '@/servicos/api';

function criarEstabelecimentoPadrao(dados: {
  nomeEstabelecimento: string;
  responsavel: string;
  cidade: string;
  endereco: string;
  whatsapp: string;
  nicho: string;
}): Estabelecimento {
  const slug = dados.nomeEstabelecimento
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const tema: TemaEstabelecimento = {
    cor: '#3b82f6',
    layout: 'classico',
    titulo: dados.nomeEstabelecimento,
    subtitulo: 'Barbearia de qualidade',
  };

  const configuracaoPix: ConfiguracaoPix = {
    modo: 'opcional',
    chave: '',
    percentualSinal: 0,
  };

  return {
    id: `est-${gerarId()}`,
    slug,
    nome: dados.nomeEstabelecimento,
    responsavel: dados.responsavel,
    cidade: dados.cidade,
    nicho: dados.nicho as NichoEstabelecimento,
    avaliacao: 0,
    status: 'pendente' as StatusEstabelecimento,
    latitude: -23.5505,
    longitude: -46.6333,
    whatsapp: dados.whatsapp,
    endereco: dados.endereco,
    sobre: '',
    tema,
    servicos: [],
    galeria: [],
    fila: [],
    tempoMedioAtendimento: 30,
    horarioFuncionamento: '09:00-18:00',
    permiteAutoEdicao: false,
    configuracaoPix,
    avaliacoes: [],
    seguidores: 0,
    taxaFidelidade: 0,
  };
}

export class AuthServiceMock implements IAuthService {
  async login(email: string, senha: string): Promise<ResultadoServico<SessaoUsuario>> {
    await simularLatencia();
    simularErroAleatorio();

    const usuario = estadoGlobal.usuarios.find((u) => u.email === email && u.senha === senha);
    if (!usuario) return falha('Credenciais inválidas.');

    if (!usuario.confirmado) return falha('Conta não confirmada. Verifique seu e-mail.');

    const sessao: SessaoUsuario = {
      papel: usuario.papel,
      email: usuario.email,
      nome: usuario.nome,
      estabelecimentoId: usuario.estabelecimentoId,
    };

    return sucesso(sessao);
  }

  async cadastrarCliente(dados: {
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
  }): Promise<ResultadoServico<SessaoUsuario>> {
    await simularLatencia();
    simularErroAleatorio();

    if (estadoGlobal.usuarios.some((u) => u.email === dados.email)) {
      return falha('E-mail já está cadastrado.');
    }

    const novoUsuario: Usuario = {
      id: `usr-${gerarId()}`,
      nome: dados.nome,
      email: dados.email,
      senha: dados.senha,
      papel: 'cliente',
      whatsapp: dados.telefone || '',
      confirmado: true,
      lembretesWhatsapp: true,
      seguindo: [],
      inspiracoesSalvas: [],
    };

    estadoGlobal.usuarios.push(novoUsuario);
    persistirEstado();

    const sessao: SessaoUsuario = {
      papel: 'cliente',
      email: novoUsuario.email,
      nome: novoUsuario.nome,
    };

    return sucesso(sessao);
  }

  async cadastrarProfissional(dados: {
    nomeEstabelecimento: string;
    responsavel: string;
    cidade: string;
    endereco: string;
    whatsapp: string;
    nicho: string;
    email: string;
    senha: string;
  }): Promise<ResultadoServico<SessaoUsuario>> {
    await simularLatencia();
    simularErroAleatorio();

    if (estadoGlobal.usuarios.some((u) => u.email === dados.email)) {
      return falha('E-mail já está cadastrado.');
    }

    const novoEstabelecimento = criarEstabelecimentoPadrao({
      nomeEstabelecimento: dados.nomeEstabelecimento,
      responsavel: dados.responsavel,
      cidade: dados.cidade,
      endereco: dados.endereco,
      whatsapp: dados.whatsapp,
      nicho: dados.nicho,
    });

    estadoGlobal.estabelecimentos.push(novoEstabelecimento);

    const novoUsuario: Usuario = {
      id: `usr-${gerarId()}`,
      nome: dados.responsavel,
      email: dados.email,
      senha: dados.senha,
      papel: 'barbeiro',
      whatsapp: dados.whatsapp,
      estabelecimentoId: novoEstabelecimento.id,
      confirmado: true,
      lembretesWhatsapp: true,
      seguindo: [],
      inspiracoesSalvas: [],
    };

    estadoGlobal.usuarios.push(novoUsuario);
    persistirEstado();

    const sessao: SessaoUsuario = {
      papel: 'barbeiro',
      email: novoUsuario.email,
      nome: novoUsuario.nome,
      estabelecimentoId: novoEstabelecimento.id,
    };

    return sucesso(sessao);
  }

  async sair(): Promise<ResultadoServico<void>> {
    return sucesso(undefined);
  }

  async obterSessao(): Promise<ResultadoServico<Usuario | null>> {
    await simularLatencia();
    simularErroAleatorio();
    // Em produção, buscaria do contexto de autenticação (token JWT, etc.)
    // Mock: retorna o primeiro usuário como se estivesse logado
    const usuario = estadoGlobal.usuarios[0];
    return sucesso(usuario ? { ...usuario } : null);
  }

  async atualizarPerfilCliente(_dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
    await simularLatencia();
    simularErroAleatorio();
    // Simplificado - em produção buscaria do contexto de auth
    return falha('Não implementado no mock isolado');
  }

  async alterarSenha(_senhaAtual: string, _novaSenha: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();
    return sucesso(undefined);
  }

  async excluirConta(): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();
    return sucesso(undefined);
  }

  async validarToken(_token: string): Promise<ResultadoServico<SessaoUsuario | null>> {
    await simularLatencia();
    simularErroAleatorio();
    return sucesso(null);
  }

  async renovarSessao(): Promise<ResultadoServico<SessaoUsuario | null>> {
    await simularLatencia();
    simularErroAleatorio();
    return sucesso(null);
  }

  async recuperarSenha(email: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const usuario = estadoGlobal.usuarios.find((u) => u.email === email);
    if (!usuario) return sucesso(undefined); // Não vaza se email existe

    console.log(`[MOCK] E-mail de recuperação enviado para ${email}`);
    return sucesso(undefined);
  }

  async confirmarEmail(_token: string): Promise<ResultadoServico<SessaoUsuario | null>> {
    await simularLatencia();
    simularErroAleatorio();
    return sucesso(null);
  }
}