/**
 * Hook useConfiguracoes - Gerencia estado das configurações do usuário.
 * AbortController para race conditions, atualizações otimísticas com rollback.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getConfiguracoesService } from '../services';
import type {
  ConfiguracoesConta,
  ConfiguracoesAparencia,
  ConfiguracoesNotificacoes,
  ConfiguracoesPrivacidade,
  ConfiguracoesSeguranca,
  ConfiguracoesState,
  ConfiguracoesActions,
} from '../types';

export function useConfiguracoes(): ConfiguracoesState & ConfiguracoesActions {
  const service = getConfiguracoesService();
  const abortRef = useRef<AbortController | null>(null);

  const [conta, setConta] = useState<ConfiguracoesConta | null>(null);
  const [aparencia, setAparencia] = useState<ConfiguracoesAparencia | null>(null);
  const [notificacoes, setNotificacoes] = useState<ConfiguracoesNotificacoes | null>(null);
  const [privacidade, setPrivacidade] = useState<ConfiguracoesPrivacidade | null>(null);
  const [seguranca, setSeguranca] = useState<ConfiguracoesSeguranca | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});

  const abortarAnterior = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  const setSalvandoEstado = useCallback((chave: string, valor: boolean) => {
    setSalvando((prev) => ({ ...prev, [chave]: valor }));
  }, []);

  // Carregar todas
  const carregarTodas = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const [contaRes, aparenciaRes, notificacoesRes, privacidadeRes, segurancaRes] = await Promise.all([
        service.buscarConta(signal),
        service.buscarAparencia(signal),
        service.buscarNotificacoes(signal),
        service.buscarPrivacidade(signal),
        service.buscarSeguranca(signal),
      ]);

      if (!contaRes.sucesso) throw new Error(contaRes.erro);
      if (!aparenciaRes.sucesso) throw new Error(aparenciaRes.erro);
      if (!notificacoesRes.sucesso) throw new Error(notificacoesRes.erro);
      if (!privacidadeRes.sucesso) throw new Error(privacidadeRes.erro);
      if (!segurancaRes.sucesso) throw new Error(segurancaRes.erro);

      setConta(contaRes.dados || null);
      setAparencia(aparenciaRes.dados || null);
      setNotificacoes(notificacoesRes.dados || null);
      setPrivacidade(privacidadeRes.dados || null);
      setSeguranca(segurancaRes.dados || null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar configurações');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  // Carregar individuais
  const carregarConta = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarConta(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setConta(resposta.dados || null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar conta');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const carregarAparencia = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarAparencia(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setAparencia(resposta.dados || null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar aparência');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const carregarNotificacoes = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarNotificacoes(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setNotificacoes(resposta.dados || null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar notificações');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const carregarPrivacidade = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarPrivacidade(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setPrivacidade(resposta.dados || null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar privacidade');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const carregarSeguranca = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarSeguranca(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setSeguranca(resposta.dados || null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar segurança');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  // Atualizações com rollback otimista
  const atualizarConta = useCallback(async (dados: Partial<ConfiguracoesConta>) => {
    const contaAnterior = conta;
    setSalvandoEstado('conta', true);
    try {
      setConta((c) => c ? { ...c, ...dados } : null);
      const resposta = await service.atualizarConta(dados);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      if (resposta.dados) setConta(resposta.dados);
    } catch {
      setConta(contaAnterior);
      throw new Error('Erro ao atualizar conta');
    } finally {
      setSalvandoEstado('conta', false);
    }
  }, [service, conta, setSalvandoEstado]);

  const atualizarAparencia = useCallback(async (dados: Partial<ConfiguracoesAparencia>) => {
    const aparenciaAnterior = aparencia;
    setSalvandoEstado('aparencia', true);
    try {
      setAparencia((a) => a ? { ...a, ...dados } : null);
      const resposta = await service.atualizarAparencia(dados);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      if (resposta.dados) setAparencia(resposta.dados);
    } catch {
      setAparencia(aparenciaAnterior);
      throw new Error('Erro ao atualizar aparência');
    } finally {
      setSalvandoEstado('aparencia', false);
    }
  }, [service, aparencia, setSalvandoEstado]);

  const atualizarNotificacoes = useCallback(async (dados: Partial<ConfiguracoesNotificacoes>) => {
    const notificacoesAnterior = notificacoes;
    setSalvandoEstado('notificacoes', true);
    try {
      setNotificacoes((n) => n ? { ...n, ...dados } : null);
      const resposta = await service.atualizarNotificacoes(dados);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      if (resposta.dados) setNotificacoes(resposta.dados);
    } catch {
      setNotificacoes(notificacoesAnterior);
      throw new Error('Erro ao atualizar notificações');
    } finally {
      setSalvandoEstado('notificacoes', false);
    }
  }, [service, notificacoes, setSalvandoEstado]);

  const atualizarPrivacidade = useCallback(async (dados: Partial<ConfiguracoesPrivacidade>) => {
    const privacidadeAnterior = privacidade;
    setSalvandoEstado('privacidade', true);
    try {
      setPrivacidade((p) => p ? { ...p, ...dados } : null);
      const resposta = await service.atualizarPrivacidade(dados);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      if (resposta.dados) setPrivacidade(resposta.dados);
    } catch {
      setPrivacidade(privacidadeAnterior);
      throw new Error('Erro ao atualizar privacidade');
    } finally {
      setSalvandoEstado('privacidade', false);
    }
  }, [service, privacidade, setSalvandoEstado]);

  const atualizarSeguranca = useCallback(async (dados: Partial<ConfiguracoesSeguranca>) => {
    const segurancaAnterior = seguranca;
    setSalvandoEstado('seguranca', true);
    try {
      setSeguranca((s) => s ? { ...s, ...dados } : null);
      const resposta = await service.atualizarSeguranca(dados);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      if (resposta.dados) setSeguranca(resposta.dados);
    } catch {
      setSeguranca(segurancaAnterior);
      throw new Error('Erro ao atualizar segurança');
    } finally {
      setSalvandoEstado('seguranca', false);
    }
  }, [service, seguranca, setSalvandoEstado]);

  // Ações específicas
  const alterarSenha = useCallback(async (senhaAtual: string, novaSenha: string) => {
    setSalvandoEstado('senha', true);
    try {
      const resposta = await service.alterarSenha(senhaAtual, novaSenha);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      // Atualiza timestamp da senha na segurança
      setSeguranca((s) => s ? { ...s, senhaAtualizadaEm: new Date().toISOString() } : null);
    } catch {
      throw new Error('Erro ao alterar senha');
    } finally {
      setSalvandoEstado('senha', false);
    }
  }, [service, setSalvandoEstado]);

  const ativarDoisFatores = useCallback(async (metodo: 'app' | 'sms' | 'email', codigo: string) => {
    setSalvandoEstado('2fa', true);
    try {
      const resposta = await service.ativarDoisFatores(metodo, codigo);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setSeguranca((s) => s ? { ...s, doisFatoresAtivo: true, doisFatoresMetodo: metodo } : null);
      return resposta.dados;
    } catch {
      throw new Error('Erro ao ativar 2FA');
    } finally {
      setSalvandoEstado('2fa', false);
    }
  }, [service, setSalvandoEstado]);

  const desativarDoisFatores = useCallback(async (senha: string) => {
    setSalvandoEstado('2fa', true);
    try {
      const resposta = await service.desativarDoisFatores(senha);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setSeguranca((s) => s ? { ...s, doisFatoresAtivo: false } : null);
    } catch {
      throw new Error('Erro ao desativar 2FA');
    } finally {
      setSalvandoEstado('2fa', false);
    }
  }, [service, setSalvandoEstado]);

  const revogarSessao = useCallback(async (sessaoId: string) => {
    setSalvandoEstado(`sessao-${sessaoId}`, true);
    try {
      const resposta = await service.revogarSessao(sessaoId);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setSeguranca((s) => s ? { ...s, sessoesAtivas: s.sessoesAtivas.filter((ses) => ses.id !== sessaoId) } : null);
    } catch {
      throw new Error('Erro ao revogar sessão');
    } finally {
      setSalvandoEstado(`sessao-${sessaoId}`, false);
    }
  }, [service, setSalvandoEstado]);

  const revogarTodasSessoes = useCallback(async () => {
    setSalvandoEstado('todas-sessoes', true);
    try {
      const resposta = await service.revogarTodasSessoes();
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setSeguranca((s) => s ? { ...s, sessoesAtivas: s.sessoesAtivas.filter((ses) => ses.atual) } : null);
    } catch {
      throw new Error('Erro ao revogar todas as sessões');
    } finally {
      setSalvandoEstado('todas-sessoes', false);
    }
  }, [service, setSalvandoEstado]);

  const removerDispositivoConfiavel = useCallback(async (dispositivoId: string) => {
    setSalvandoEstado(`dispositivo-${dispositivoId}`, true);
    try {
      const resposta = await service.removerDispositivoConfiavel(dispositivoId);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      setSeguranca((s) => s ? { ...s, dispositivosConfiaveis: s.dispositivosConfiaveis.filter((d) => d.id !== dispositivoId) } : null);
    } catch {
      throw new Error('Erro ao remover dispositivo');
    } finally {
      setSalvandoEstado(`dispositivo-${dispositivoId}`, false);
    }
  }, [service, setSalvandoEstado]);

  const exportarDados = useCallback(async () => {
    setSalvandoEstado('exportar', true);
    try {
      const resposta = await service.exportarDados();
      if (!resposta.sucesso) throw new Error(resposta.erro);
      return resposta.dados as Blob;
    } catch {
      throw new Error('Erro ao exportar dados');
    } finally {
      setSalvandoEstado('exportar', false);
    }
  }, [service, setSalvandoEstado]);

  const excluirConta = useCallback(async (senha: string, confirmacao: string) => {
    setSalvandoEstado('excluir', true);
    try {
      const resposta = await service.excluirConta(senha, confirmacao);
      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      throw new Error('Erro ao excluir conta');
    } finally {
      setSalvandoEstado('excluir', false);
    }
  }, [service, setSalvandoEstado]);

  // Cleanup
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    conta,
    aparencia,
    notificacoes,
    privacidade,
    seguranca,
    carregando,
    erro,
    salvando,
    carregarTodas,
    carregarConta,
    carregarAparencia,
    carregarNotificacoes,
    carregarPrivacidade,
    carregarSeguranca,
    atualizarConta,
    atualizarAparencia,
    atualizarNotificacoes,
    atualizarPrivacidade,
    atualizarSeguranca,
    alterarSenha,
    ativarDoisFatores,
    desativarDoisFatores,
    revogarSessao,
    revogarTodasSessoes,
    removerDispositivoConfiavel,
    exportarDados,
    excluirConta,
    limparErro,
  };
}

export default useConfiguracoes;