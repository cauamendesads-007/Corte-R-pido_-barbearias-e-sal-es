/**
 * Hook useAuth - Gerenciamento de autenticação com injeção de dependência.
 * Encapsula estado, efeitos colaterais e delega regras de negócio para services/rules.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { IAuthService } from '../services';
import { authService } from '../services';
import type {
  LoginInput,
  CadastroInput,
  SessaoUsuario,
  Usuario,
  AuthContext,
} from '../types';
import { normalizarEmail } from '../rules';

const CHAVE_USUARIO = 'corte-rapido-usuario';
const CHAVE_TOKEN = 'corte-rapido-token';

/** Opções do hook */
export interface UseAuthOptions {
  /** Serviço de autenticação injetável (DIP) */
  service?: IAuthService;
  /** Callback ao fazer login com sucesso */
  onLogin?: (sessao: SessaoUsuario) => void;
  /** Callback ao fazer logout */
  onLogout?: () => void;
  /** Callback ao atualizar perfil */
  onPerfilAtualizado?: (usuario: Usuario) => void;
}

/** Retorno do hook */
export type UseAuthReturn = AuthContext;

/**
 * Hook principal de autenticação
 * @param options - Opções de configuração e injeção de dependência
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const {
    service = authService,
    onLogin,
    onLogout,
    onPerfilAtualizado,
  } = options;

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const inicializado = useRef(false);

  // Limpa erro ao alterar campos
  const limparErro = useCallback(() => setErro(null), []);

  // Carrega usuário do localStorage na inicialização
  useEffect(() => {
    let cancelado = false;

    const carregarUsuario = async () => {
      try {
        const usuarioSalvo = localStorage.getItem(CHAVE_USUARIO);
        const tokenSalvo = localStorage.getItem(CHAVE_TOKEN);

        if (usuarioSalvo && tokenSalvo && !cancelado) {
          try {
            const usuarioParseado = JSON.parse(usuarioSalvo);
            // Verifica se token ainda é válido
            const resposta = await service.validarToken();

            if (resposta.sucesso && resposta.dados && !cancelado) {
              const sessao = resposta.dados;
              // Mescla usuário salvo com sessão válida
              const usuarioCompleto = { ...usuarioParseado, ...sessao } as Usuario;
              setUsuario(usuarioCompleto);
            } else if (!cancelado) {
              // Token inválido, limpa storage
              localStorage.removeItem(CHAVE_USUARIO);
              localStorage.removeItem(CHAVE_TOKEN);
              setUsuario(null);
            }
          } catch {
            if (!cancelado) {
              localStorage.removeItem(CHAVE_USUARIO);
              localStorage.removeItem(CHAVE_TOKEN);
              setUsuario(null);
            }
          }
        } else if (!cancelado) {
          setUsuario(null);
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
          inicializado.current = true;
        }
      }
    };

    carregarUsuario();

    return () => {
      cancelado = true;
    };
  }, [service]);

  // Login
  const login = useCallback(async (input: LoginInput) => {
    setErro(null);
    setCarregando(true);

    try {
      // Normaliza e-mail
      const inputNormalizado = {
        ...input,
        email: normalizarEmail(input.email),
      };

      const resposta = await service.login(inputNormalizado);

      if (resposta.sucesso && resposta.dados) {
        const sessao = resposta.dados;

        // Busca perfil completo
        try {
          const perfilResposta = await service.obterSessao();
          if (perfilResposta.sucesso && perfilResposta.dados) {
            // Se temos sessão válida, o usuário já foi carregado no useEffect
            // Aqui apenas disparamos callback
            onLogin?.(sessao);
            return { sucesso: true };
          }
        } catch {
          // Ignora erro de busca de perfil
        }

        // Fallback: cria usuário mínimo
        const usuarioMinimo: Usuario = {
          id: '',
          email: sessao.email,
          senha: '',
          papel: sessao.papel as 'cliente' | 'barbeiro' | 'admin',
          nome: sessao.nome,
          confirmado: true,
          telefone: undefined,
          whatsapp: undefined,
          cpf: undefined,
          nicho: undefined,
          bio: undefined,
          aceitouTermos: true,
          aceitouMarketing: false,
          lembretesWhatsapp: true,
          seguindo: [],
          inspiracaoSalvas: [],
          estabelecimentoId: sessao.estabelecimentoId,
          avatar: '',
          dataCadastro: new Date().toISOString(),
          dataAtualizacao: new Date().toISOString(),
        };

        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuarioMinimo));
        localStorage.setItem(CHAVE_TOKEN, 'mock-token-' + Date.now());
        setUsuario(usuarioMinimo);
        onLogin?.(sessao);

        return { sucesso: true };
      }

      const mensagem = resposta.erro || 'Erro ao fazer login';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } catch {
      const mensagem = 'Erro de conexão. Tente novamente.';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } finally {
      setCarregando(false);
    }
  }, [service, onLogin]);

  // Cadastro
  const cadastrar = useCallback(async (input: CadastroInput) => {
    setErro(null);
    setCarregando(true);

    try {
      // Normaliza e-mail
      const inputNormalizado = {
        ...input,
        email: normalizarEmail(input.email),
        telefone: input.telefone?.replace(/\D/g, '') ?? '',
      };

      const resposta = await service.cadastrar(inputNormalizado);

      if (resposta.sucesso && resposta.dados) {
        const sessao = resposta.dados;

        // Busca perfil completo
        try {
          const perfilResposta = await service.obterSessao();
          if (perfilResposta.sucesso && perfilResposta.dados) {
            onLogin?.(sessao);
            return { sucesso: true };
          }
        } catch {
          // Ignora erro
        }

        // Fallback
        const usuarioMinimo: Usuario = {
          id: '',
          email: sessao.email,
          senha: '',
          papel: sessao.papel as 'cliente' | 'barbeiro' | 'admin',
          nome: sessao.nome,
          confirmado: true,
          telefone: undefined,
          whatsapp: undefined,
          cpf: undefined,
          nicho: undefined,
          bio: undefined,
          aceitouTermos: true,
          aceitouMarketing: false,
          lembretesWhatsapp: true,
          seguindo: [],
          inspiracaoSalvas: [],
          estabelecimentoId: sessao.estabelecimentoId,
          avatar: '',
          dataCadastro: new Date().toISOString(),
          dataAtualizacao: new Date().toISOString(),
        };

        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuarioMinimo));
        localStorage.setItem(CHAVE_TOKEN, 'mock-token-' + Date.now());
        setUsuario(usuarioMinimo);
        onLogin?.(sessao);

        return { sucesso: true };
      }

      const mensagem = resposta.erro || 'Erro ao cadastrar';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } catch {
      const mensagem = 'Erro de conexão. Tente novamente.';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } finally {
      setCarregando(false);
    }
  }, [service, onLogin]);

  // Logout
  const sair = useCallback(async () => {
    try {
      await service.sair();
    } catch {
      // Ignora erro de API, limpa localmente mesmo assim
    } finally {
      localStorage.removeItem(CHAVE_USUARIO);
      localStorage.removeItem(CHAVE_TOKEN);
      setUsuario(null);
      setErro(null);
      onLogout?.();
    }
  }, [service, onLogout]);

  // Atualizar perfil
  const atualizarPerfil = useCallback(async (dados: Partial<Usuario>) => {
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };

    setErro(null);

    try {
      const resposta = await service.atualizarPerfil(dados);

      if (resposta.sucesso && resposta.dados) {
        const usuarioAtualizado = { ...usuario, ...resposta.dados };
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuarioAtualizado));
        setUsuario(usuarioAtualizado);
        onPerfilAtualizado?.(usuarioAtualizado);
        return { sucesso: true };
      }

      const mensagem = resposta.erro || 'Erro ao atualizar perfil';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } catch {
      const mensagem = 'Erro de conexão. Tente novamente.';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    }
  }, [usuario, service, onPerfilAtualizado]);

  // Alterar senha
  const alterarSenha = useCallback(async (senhaAtual: string, novaSenha: string) => {
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };

    setErro(null);

    try {
      const resposta = await service.alterarSenha(senhaAtual, novaSenha);

      if (resposta.sucesso) {
        return { sucesso: true };
      }

      const mensagem = resposta.erro || 'Erro ao alterar senha';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } catch {
      const mensagem = 'Erro de conexão. Tente novamente.';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    }
  }, [usuario, service]);

  // Excluir conta
  const excluirConta = useCallback(async () => {
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };

    setErro(null);

    try {
      const resposta = await service.excluirConta();

      if (resposta.sucesso) {
        localStorage.removeItem(CHAVE_USUARIO);
        localStorage.removeItem(CHAVE_TOKEN);
        setUsuario(null);
        onLogout?.();
        return { sucesso: true };
      }

      const mensagem = resposta.erro || 'Erro ao excluir conta';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } catch {
      const mensagem = 'Erro de conexão. Tente novamente.';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    }
  }, [usuario, service, onLogout]);

  // Recuperar senha
  const recuperarSenha = useCallback(async (email: string) => {
    setErro(null);

    try {
      const resposta = await service.recuperarSenha(normalizarEmail(email));

      if (resposta.sucesso) {
        return { sucesso: true };
      }

      const mensagem = resposta.erro || 'Erro ao recuperar senha';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } catch {
      const mensagem = 'Erro de conexão. Tente novamente.';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    }
  }, [service]);

  // Confirmar e-mail
  const confirmarEmail = useCallback(async () => {
    setErro(null);
    setCarregando(true);

    try {
      const resposta = await service.confirmarEmail();

      if (resposta.sucesso && resposta.dados) {
        const sessao = resposta.dados;
        const usuarioMinimo: Usuario = {
          id: '',
          email: sessao.email,
          senha: '',
          papel: sessao.papel as 'cliente' | 'barbeiro' | 'admin',
          nome: sessao.nome,
          confirmado: true,
          telefone: undefined,
          whatsapp: undefined,
          cpf: undefined,
          nicho: undefined,
          bio: undefined,
          aceitouTermos: true,
          aceitouMarketing: false,
          lembretesWhatsapp: true,
          seguindo: [],
          inspiracaoSalvas: [],
          estabelecimentoId: sessao.estabelecimentoId,
          avatar: '',
          dataCadastro: new Date().toISOString(),
          dataAtualizacao: new Date().toISOString(),
        };

        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuarioMinimo));
        localStorage.setItem(CHAVE_TOKEN, 'mock-token-' + Date.now());
        setUsuario(usuarioMinimo);
        onLogin?.(sessao);

        return { sucesso: true };
      }

      const mensagem = resposta.erro || 'Token inválido ou expirado';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } catch {
      const mensagem = 'Erro de conexão. Tente novamente.';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } finally {
      setCarregando(false);
    }
  }, [service, onLogin]);

  // Memoiza o contexto para evitar re-renders desnecessários
  const contexto = useMemo<AuthContext>(() => ({
    usuario,
    carregando,
    erro,
    autenticado: !!usuario,
    login,
    cadastrar,
    sair,
    atualizarPerfil,
    alterarSenha,
    excluirConta,
    limparErro,
    recuperarSenha,
    confirmarEmail,
  }), [
    usuario,
    carregando,
    erro,
    login,
    cadastrar,
    sair,
    atualizarPerfil,
    alterarSenha,
    excluirConta,
    limparErro,
    recuperarSenha,
    confirmarEmail,
  ]);

  return contexto;
}

/** Hook para verificar permissões */
export function usePermissao(tiposPermitidos: string[]) {
  const { usuario } = useAuth();
  return usuario ? tiposPermitidos.includes(usuario.papel) : false;
}

/** Hook para exigir autenticação */
export function useRequerAutenticacao() {
  const { usuario, carregando } = useAuth();
  return {
    autenticado: !!usuario,
    carregando,
    usuario,
  };
}