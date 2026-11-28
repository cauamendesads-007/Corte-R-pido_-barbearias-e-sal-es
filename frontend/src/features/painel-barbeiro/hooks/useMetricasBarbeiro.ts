/**
 * Hook useMetricasBarbeiro - Gerencia métricas do dashboard do barbeiro.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getPainelBarbeiroService } from '../services';
import type {
  MetricasState,
  MetricasActions,
  MetricasBarbeiro,
} from '../types';

export function useMetricasBarbeiro(): MetricasState & MetricasActions {
  const service = getPainelBarbeiroService();
  const abortRef = useRef<AbortController | null>(null);

  const [metricas, setMetricas] = useState<MetricasBarbeiro | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<'dia' | 'semana' | 'mes' | 'ano'>('semana');

  const abortarAnterior = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  const carregarMetricas = useCallback(async (novoPeriodo?: 'dia' | 'semana' | 'mes' | 'ano') => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    const periodoCarregar = novoPeriodo || periodo;

    try {
      const resposta = await service.buscarMetricas(periodoCarregar, signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setMetricas(resposta.dados);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar métricas');
    } finally {
      setCarregando(false);
    }
  }, [service, periodo, abortarAnterior]);

  const alterarPeriodo = useCallback((novoPeriodo: 'dia' | 'semana' | 'mes' | 'ano') => {
    setPeriodo(novoPeriodo);
    carregarMetricas(novoPeriodo);
  }, [carregarMetricas]);

  // Carrega inicial
  useEffect(() => {
    carregarMetricas();
  }, [carregarMetricas]);

  // Cleanup
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    metricas,
    carregando,
    erro,
    periodo,
    carregarMetricas,
    alterarPeriodo,
    limparErro,
  };
}