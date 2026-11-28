/**
 * Hook usePerfil - Gerencia estado do perfil do usuário.
 * AbortController para race conditions, Result<T,E>, atualizações otimísticas.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getPerfilService } from '../services';
import type {
  Perfil,
  PreferenciasUsuario,
  EnderecoUsuario,
  CartaoSalvo,
  AtividadeUsuario,
  AtualizarPerfilDados,
  AlterarSenhaDados,
  UploadAvatarDados,
  PerfilState,
  PerfilActions,
  AtividadesFiltro,
} from '../types';

const FILTRO_ATIVIDADES_INICIAL: AtividadesFiltro = {};

export function usePerfil(): PerfilState & PerfilActions {
  const service = getPerfilService();
  const abortRef = useRef<AbortController | null>(null);

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [preferencias, setPreferencias] = useState<PreferenciasUsuario | null>(null);
  const [enderecos, setEnderecos] = useState<EnderecoUsuario[]>([]);
  const [cartoes, setCartoes] = useState<CartaoSalvo[]>([]);
  const [atividades, setAtividades] = useState<AtividadeUsuario[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [proximaPaginaAtividades, setProximaPaginaAtividades] = useState<number | null>(1);

  const filtroAtividadesRef = useRef(FILTRO_ATIVIDADES_INICIAL);

  const abortarAnterior = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  // Perfil
  const carregarPerfil = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarPerfil(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setPerfil(resposta.dados || null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar perfil');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const atualizarPerfil = useCallback(async (dados: AtualizarPerfilDados) => {
    const perfilAnterior = perfil;
    try {
      setPerfil((p) => p ? { ...p, ...dados } : null);
      const resposta = await service.atualizarPerfil(dados);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      if (resposta.dados) setPerfil(resposta.dados);
    } catch {
      setPerfil(perfilAnterior); // Rollback
      throw new Error('Erro ao atualizar perfil');
    }
  }, [service, perfil]);

  const uploadAvatar = useCallback(async (dados: UploadAvatarDados) => {
    const avatarAnterior = perfil?.avatar;
    try {
      if (perfil) setPerfil({ ...perfil, avatar: URL.createObjectURL(dados.arquivo) });
      const resposta = await service.uploadAvatar(dados);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      if (resposta.dados?.avatar) setPerfil((p) => p ? { ...p, avatar: resposta.dados!.avatar } : null);
    } catch {
      if (perfil) setPerfil({ ...perfil, avatar: avatarAnterior }); // Rollback
      throw new Error('Erro ao fazer upload do avatar');
    }
  }, [service, perfil]);

  const removerAvatar = useCallback(async () => {
    const avatarAnterior = perfil?.avatar;
    try {
      setPerfil((p) => p ? { ...p, avatar: undefined } : null);
      const resposta = await service.removerAvatar();
      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      setPerfil((p) => p ? { ...p, avatar: avatarAnterior } : null); // Rollback
      throw new Error('Erro ao remover avatar');
    }
  }, [service, perfil]);

  const alterarSenha = useCallback(async (dados: AlterarSenhaDados) => {
    try {
      const resposta = await service.alterarSenha(dados);
      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      throw new Error('Erro ao alterar senha');
    }
  }, [service]);

  // Preferências
  const carregarPreferencias = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarPreferencias(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setPreferencias(resposta.dados || null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar preferências');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const atualizarPreferencias = useCallback(async (prefs: Partial<PreferenciasUsuario>) => {
    const prefsAnteriores = preferencias;
    try {
      setPreferencias((p) => p ? { ...p, ...prefs } : null);
      const resposta = await service.atualizarPreferencias(prefs);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      if (resposta.dados) setPreferencias(resposta.dados);
    } catch {
      setPreferencias(prefsAnteriores); // Rollback
      throw new Error('Erro ao atualizar preferências');
    }
  }, [service, preferencias]);

  // Endereços
  const carregarEnderecos = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarEnderecos(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setEnderecos(resposta.dados || []);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar endereços');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const adicionarEndereco = useCallback(async (endereco: Omit<EnderecoUsuario, 'id'>) => {
    try {
      const resposta = await service.adicionarEndereco(endereco);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      if (resposta.dados) setEnderecos((prev) => [...prev, resposta.dados!]);
    } catch {
      throw new Error('Erro ao adicionar endereço');
    }
  }, [service]);

  const atualizarEndereco = useCallback(async (id: string, endereco: Partial<EnderecoUsuario>) => {
    const enderecosAnteriores = enderecos;
    try {
      setEnderecos((prev) => prev.map((e) => (e.id === id ? { ...e, ...endereco } : e)));
      const resposta = await service.atualizarEndereco(id, endereco);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      if (resposta.dados) setEnderecos((prev) => prev.map((e) => (e.id === id ? resposta.dados! : e)));
    } catch {
      setEnderecos(enderecosAnteriores); // Rollback
      throw new Error('Erro ao atualizar endereço');
    }
  }, [service, enderecos]);

  const removerEndereco = useCallback(async (id: string) => {
    const enderecosAnteriores = enderecos;
    try {
      setEnderecos((prev) => prev.filter((e) => e.id !== id));
      const resposta = await service.removerEndereco(id);
      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      setEnderecos(enderecosAnteriores); // Rollback
      throw new Error('Erro ao remover endereço');
    }
  }, [service, enderecos]);

  const definirEnderecoPrincipal = useCallback(async (id: string) => {
    const enderecosAnteriores = enderecos;
    try {
      setEnderecos((prev) => prev.map((e) => ({ ...e, principal: e.id === id })));
      const resposta = await service.definirEnderecoPrincipal(id);
      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      setEnderecos(enderecosAnteriores); // Rollback
      throw new Error('Erro ao definir endereço principal');
    }
  }, [service, enderecos]);

  // Cartões
  const carregarCartoes = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarCartoes(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setCartoes(resposta.dados || []);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar cartões');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const adicionarCartao = useCallback(async (cartao: Omit<CartaoSalvo, 'id' | 'criadoEm'>) => {
    try {
      const resposta = await service.adicionarCartao(cartao);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      if (resposta.dados) setCartoes((prev) => [...prev, resposta.dados!]);
    } catch {
      throw new Error('Erro ao adicionar cartão');
    }
  }, [service]);

  const removerCartao = useCallback(async (id: string) => {
    const cartoesAnteriores = cartoes;
    try {
      setCartoes((prev) => prev.filter((c) => c.id !== id));
      const resposta = await service.removerCartao(id);
      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      setCartoes(cartoesAnteriores); // Rollback
      throw new Error('Erro ao remover cartão');
    }
  }, [service, cartoes]);

  const definirCartaoPadrao = useCallback(async (id: string) => {
    const cartoesAnteriores = cartoes;
    try {
      setCartoes((prev) => prev.map((c) => ({ ...c, padrao: c.id === id })));
      const resposta = await service.definirCartaoPadrao(id);
      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      setCartoes(cartoesAnteriores); // Rollback
      throw new Error('Erro ao definir cartão padrão');
    }
  }, [service, cartoes]);

  // Atividades
  const carregarAtividades = useCallback(async (pagina = 1, filtro?: AtividadesFiltro) => {
    const signal = abortarAnterior();
    if (pagina === 1) {
      setCarregando(true);
      setAtividades([]);
    }
    setErro(null);

    if (filtro) {
      filtroAtividadesRef.current = { ...filtroAtividadesRef.current, ...filtro };
    }

    try {
      const resposta = await service.buscarAtividades(pagina, 20, filtroAtividadesRef.current, signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      if (pagina === 1) {
        setAtividades(resposta.dados.atividades);
      } else {
        setAtividades((prev) => [...prev, ...resposta.dados.atividades]);
      }
      setProximaPaginaAtividades(resposta.dados.proximaPagina);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar atividades');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  // Cleanup
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    perfil,
    preferencias,
    enderecos,
    cartoes,
    atividades,
    carregando,
    erro,
    proximaPaginaAtividades,
    carregarPerfil,
    atualizarPerfil,
    uploadAvatar,
    removerAvatar,
    alterarSenha,
    carregarPreferencias,
    atualizarPreferencias,
    carregarEnderecos,
    adicionarEndereco,
    atualizarEndereco,
    removerEndereco,
    definirEnderecoPrincipal,
    carregarCartoes,
    adicionarCartao,
    removerCartao,
    definirCartaoPadrao,
    carregarAtividades,
    limparErro,
  };
}