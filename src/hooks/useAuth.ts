/**
 * Hook useAuth - Gerenciamento de autenticação do usuário.
 * Integra com ServiceProvider (DIP), persistência localStorage, renovação de token.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthService } from '@/contexto/ServiceHooks';
import type { Usuario, TipoUsuario, SessaoUsuario } from '@/tipos';
import { limparCacheAutenticacao, limparCacheGlobal } from '@/utilitarios/cache';

export interface EstadoAuth {
  usuario: Usuario | null;
  carregando: boolean;
  erro: string | null;
  autenticado: boolean;
}

export interface AcoesAuth {
  login: (_email: string, _senha: string, _tipo: TipoUsuario) => Promise<{ sucesso: boolean; erro?: string }>;
  cadastrar: (_dados: {
    nome: string;
    email: string;
    senha: string;
    telefone: string;
    tipo: 'cliente' | 'barbeiro';
    estabelecimentoId?: string;
  }) => Promise<{ sucesso: boolean; erro?: string }>;
  sair: () => void;
  atualizarPerfil: (_dados: Partial<Usuario>) => Promise<{ sucesso: boolean; erro?: string }>;
  alterarSenha: (_senhaAtual: string, _novaSenha: string) => Promise<{ sucesso: boolean; erro?: string }>;
  excluirConta: () => Promise<{ sucesso: boolean; erro?: string }>;
  limparErro: () => void;
}

const CHAVE_USUARIO = 'corte-rapido-usuario';
const CHAVE_TOKEN = 'corte-rapido-token';

export const useAuth = (): EstadoAuth & AcoesAuth => {
  const authService = useAuthService();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const inicializado = useRef(false);

  // Carrega usuário do localStorage na inicialização
  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const usuarioSalvo = localStorage.getItem(CHAVE_USUARIO);
        const tokenSalvo = localStorage.getItem(CHAVE_TOKEN);

        if (usuarioSalvo && tokenSalvo) {
          const usuarioParseado = JSON.parse(usuarioSalvo);
          // Verifica se token ainda é válido (simulado)
          const resposta = await authService.validarToken(tokenSalvo);
          if (resposta.sucesso && resposta.dados) {
            // validarToken retorna SessaoUsuario, mescla com usuario salvo
            const sessao = resposta.dados as SessaoUsuario;
            setUsuario({ ...usuarioParseado, ...sessao });
          } else {
            localStorage.removeItem(CHAVE_USUARIO);
            localStorage.removeItem(CHAVE_TOKEN);
          }
        }
      } catch {
        localStorage.removeItem(CHAVE_USUARIO);
        localStorage.removeItem(CHAVE_TOKEN);
      } finally {
        setCarregando(false);
        inicializado.current = true;
      }
    };

    carregarUsuario();
  }, [authService]);

  const login = useCallback(async (email: string, senha: string, _tipo: TipoUsuario) => {
    void _tipo;
    setErro(null);
    setCarregando(true);

    try {
      const resposta = await authService.login(email, senha);

      if (resposta.sucesso && resposta.dados) {
        const sessao = resposta.dados as SessaoUsuario;
        // Busca usuário completo via API
        try {
          const perfilResposta = await authService.obterSessao();
          if (perfilResposta.sucesso && perfilResposta.dados) {
            localStorage.setItem(CHAVE_USUARIO, JSON.stringify(perfilResposta.dados));
            localStorage.setItem(CHAVE_TOKEN, 'mock-token-' + Date.now());
            setUsuario(perfilResposta.dados);
          } else {
            // Fallback
            const usuarioCompleto = { ...sessao, id: '', senha: '', confirmado: true, lembretesWhatsapp: true, seguindo: [], inspiracoesSalvas: [] } as Usuario;
            localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuarioCompleto));
            localStorage.setItem(CHAVE_TOKEN, 'mock-token-' + Date.now());
            setUsuario(usuarioCompleto);
          }
        } catch {
          const usuarioCompleto = { ...sessao, id: '', senha: '', confirmado: true, lembretesWhatsapp: true, seguindo: [], inspiracoesSalvas: [] } as Usuario;
          localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuarioCompleto));
          localStorage.setItem(CHAVE_TOKEN, 'mock-token-' + Date.now());
          setUsuario(usuarioCompleto);
        }
        return { sucesso: true };
      }

      setErro(resposta.erro || 'Erro ao fazer login');
      return { sucesso: false, erro: resposta.erro };
    } catch (_) {
      void _;
      const mensagem = 'Erro de conexão. Tente novamente.';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } finally {
      setCarregando(false);
    }
  }, [authService]);

  const cadastrar = useCallback(async (dados: {
    nome: string;
    email: string;
    senha: string;
    telefone: string;
    tipo: 'cliente' | 'barbeiro';
    estabelecimentoId?: string;
  }) => {
    setErro(null);
    setCarregando(true);

    try {
      // Apenas cadastro de cliente suportado por enquanto via IAuthService
      const resposta = await authService.cadastrarCliente({
        nome: dados.nome,
        email: dados.email,
        senha: dados.senha,
        telefone: dados.telefone,
      });

      if (resposta.sucesso && resposta.dados) {
        const sessao = resposta.dados as SessaoUsuario;
        // Busca usuário completo via API
        try {
          const perfilResposta = await authService.obterSessao();
          if (perfilResposta.sucesso && perfilResposta.dados) {
            localStorage.setItem(CHAVE_USUARIO, JSON.stringify(perfilResposta.dados));
            localStorage.setItem(CHAVE_TOKEN, 'mock-token-' + Date.now());
            setUsuario(perfilResposta.dados);
          } else {
            // Fallback
            const usuarioCompleto = { ...sessao, id: '', senha: '', confirmado: true, lembretesWhatsapp: true, seguindo: [], inspiracoesSalvas: [] } as Usuario;
            localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuarioCompleto));
            localStorage.setItem(CHAVE_TOKEN, 'mock-token-' + Date.now());
            setUsuario(usuarioCompleto);
          }
        } catch {
          const usuarioCompleto = { ...sessao, id: '', senha: '', confirmado: true, lembretesWhatsapp: true, seguindo: [], inspiracoesSalvas: [] } as Usuario;
          localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuarioCompleto));
          localStorage.setItem(CHAVE_TOKEN, 'mock-token-' + Date.now());
          setUsuario(usuarioCompleto);
        }
        return { sucesso: true };
      }

      setErro(resposta.erro || 'Erro ao cadastrar');
      return { sucesso: false, erro: resposta.erro };
    } catch (_) {
      void _;
      const mensagem = 'Erro de conexão. Tente novamente.';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } finally {
      setCarregando(false);
    }
  }, [authService]);

  const sair = useCallback(() => {
    limparCacheAutenticacao();
    setUsuario(null);
    setErro(null);
  }, []);

  const atualizarPerfil = useCallback(async (dados: Partial<Usuario>) => {
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };

    setErro(null);

    try {
      const resposta = await authService.atualizarPerfilCliente(dados);

      if (resposta.sucesso && resposta.dados) {
        const usuarioAtualizado = { ...usuario, ...resposta.dados };
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuarioAtualizado));
        setUsuario(usuarioAtualizado);
        return { sucesso: true };
      }

      setErro(resposta.erro || 'Erro ao atualizar perfil');
      return { sucesso: false, erro: resposta.erro };
    } catch (_) {
      void _;
      const mensagem = 'Erro de conexão. Tente novamente.';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    }
  }, [usuario, authService]);

  const limparErro = useCallback(() => setErro(null), []);

  const alterarSenha = useCallback(async (senhaAtual: string, novaSenha: string) => {
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };

    setErro(null);

    try {
      const resposta = await authService.alterarSenha(senhaAtual, novaSenha);

      if (resposta.sucesso) {
        return { sucesso: true };
      }

      setErro(resposta.erro || 'Erro ao alterar senha');
      return { sucesso: false, erro: resposta.erro };
    } catch (_) {
      void _;
      const mensagem = 'Erro de conexão. Tente novamente.';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    }
  }, [usuario, authService]);

  const excluirConta = useCallback(async () => {
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };

    setErro(null);

    try {
      const resposta = await authService.excluirConta();

      if (resposta.sucesso) {
        limparCacheGlobal();
        setUsuario(null);
        return { sucesso: true };
      }

      setErro(resposta.erro || 'Erro ao excluir conta');
      return { sucesso: false, erro: resposta.erro };
    } catch (_) {
      void _;
      const mensagem = 'Erro de conexão. Tente novamente.';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    }
  }, [usuario, authService]);

  return {
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
  };
};

/** Hook para verificar se usuário tem permissão */
export const usePermissao = (tiposPermitidos: TipoUsuario[]) => {
  const { usuario } = useAuth();
  return usuario ? tiposPermitidos.includes(usuario.papel) : false;
};

/** Hook para redirecionar se não autenticado */
export const useRequerAutenticacao = (_redirecionarPara = '/login') => {
  void _redirecionarPara;
  const { usuario, carregando } = useAuth();
  const autenticado = !!usuario;

  // Em um app real, usaria useNavigate do react-router
  // Aqui apenas retorna o estado para o componente decidir
  return { autenticado, carregando, usuario };
};