/**
 * Hook usePainelBarbeiro - Gerencia estado do dashboard do barbeiro.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getPainelBarbeiroService } from '../services';
import type {
  PainelBarbeiroState,
  PainelBarbeiroActions,
  Agendamento,
  AgendamentoStatus,
  FilaEspera,
  MetricasBarbeiro,
  ConfiguracaoBarbeiro,
  NotificacaoBarbeiro,
} from '../types';

export function usePainelBarbeiro(): PainelBarbeiroState & PainelBarbeiroActions {
  const service = getPainelBarbeiroService();
  const abortRef = useRef<AbortController | null>(null);

  const [agendamentosHoje, setAgendamentosHoje] = useState<Agendamento[]>([]);
  const [agendamentosProximos, setAgendamentosProximos] = useState<Agendamento[]>([]);
  const [filaEspera, setFilaEspera] = useState<FilaEspera[]>([]);
  const [metricas, setMetricas] = useState<MetricasBarbeiro | null>(null);
  const [configuracao, setConfiguracao] = useState<ConfiguracaoBarbeiro | null>(null);
  const [notificacoes, setNotificacoes] = useState<NotificacaoBarbeiro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const abortarAnterior = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  const carregarDashboard = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarDashboard(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setAgendamentosHoje(resposta.dados.agendamentosHoje);
      setAgendamentosProximos(resposta.dados.agendamentosProximos);
      setFilaEspera(resposta.dados.filaEspera);
      setMetricas(resposta.dados.metricas);
      setConfiguracao(resposta.dados.configuracao);
      setNotificacoes(resposta.dados.notificacoes);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar dashboard');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const atualizarStatusAgendamento = useCallback(async (id: string, status: AgendamentoStatus) => {
    try {
      const resposta = await service.atualizarStatusAgendamento(id, status);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      // Atualiza localmente
      const atualizarLista = (lista: Agendamento[]) =>
        lista.map((a) => (a.id === id ? { ...a, status } : a));

      setAgendamentosHoje(atualizarLista);
      setAgendamentosProximos(atualizarLista);
    } catch {
      // Rollback seria necessário com estado anterior
    }
  }, [service]);

  const chamarProximoFila = useCallback(async () => {
    try {
      const resposta = await service.chamarProximoFila();
      if (!resposta.sucesso) throw new Error(resposta.erro);

      if (resposta.dados) {
        setFilaEspera((prev) => prev.filter((f) => f.id !== resposta.dados!.id));
      }
    } catch {
      // Erro silencioso
    }
  }, [service]);

  const removerDaFila = useCallback(async (clienteId: string) => {
    try {
      const resposta = await service.removerDaFila(clienteId);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setFilaEspera((prev) => prev.filter((f) => f.id !== clienteId));
    } catch {
      // Erro silencioso
    }
  }, [service]);

  const atualizarConfiguracao = useCallback(async (config: Partial<ConfiguracaoBarbeiro>) => {
    try {
      const resposta = await service.atualizarConfiguracao(config);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setConfiguracao((prev) => (prev ? { ...prev, ...resposta.dados } : resposta.dados));
    } catch {
      // Erro silencioso
    }
  }, [service]);

  const marcarNotificacaoLida = useCallback(async (id: string) => {
    try {
      const resposta = await service.marcarNotificacaoLida(id);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    } catch {
      // Erro silencioso
    }
  }, [service]);

  // Carrega inicial
  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  // Cleanup
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    agendamentosHoje,
    agendamentosProximos,
    filaEspera,
    metricas,
    configuracao,
    notificacoes,
    carregando,
    erro,
    carregarDashboard,
    atualizarStatusAgendamento,
    chamarProximoFila,
    removerDaFila,
    atualizarConfiguracao,
    marcarNotificacaoLida,
    limparErro,
  };
}