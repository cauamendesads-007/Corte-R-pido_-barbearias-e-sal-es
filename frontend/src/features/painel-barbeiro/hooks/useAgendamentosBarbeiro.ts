/**
 * Hook useAgendamentosBarbeiro - Gerencia lista de agendamentos com filtros e paginação.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getPainelBarbeiroService } from '../services';
import type {
  AgendamentosState,
  AgendamentosActions,
  Agendamento,
  AgendamentoStatus,
  AgendamentosFiltro,
} from '../types';

const FILTRO_INICIAL: AgendamentosFiltro = {};

export function useAgendamentosBarbeiro(): AgendamentosState & AgendamentosActions {
  const service = getPainelBarbeiroService();
  const abortRef = useRef<AbortController | null>(null);
  const paginaRef = useRef(1);
  const filtroRef = useRef(FILTRO_INICIAL);

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [filtro, setFiltro] = useState<AgendamentosFiltro>(FILTRO_INICIAL);
  const [pagina, setPagina] = useState(1);
  const [proximaPagina, setProximaPagina] = useState<number | null>(1);
  const [carregando, setCarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const abortarAnterior = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  const carregarAgendamentos = useCallback(async (novoFiltro?: Partial<AgendamentosFiltro>, reset = true) => {
    const signal = abortarAnterior();
    if (reset) {
      setCarregando(true);
      paginaRef.current = 1;
      setAgendamentos([]);
    } else {
      setCarregandoMais(true);
    }
    setErro(null);

    if (novoFiltro) {
      filtroRef.current = { ...filtroRef.current, ...novoFiltro };
      setFiltro(filtroRef.current);
    }

    try {
      const resposta = await service.buscarAgendamentos(
        filtroRef.current,
        paginaRef.current,
        20,
        signal
      );

      if (!resposta.sucesso) throw new Error(resposta.erro);

      const { agendamentos: novos, proximaPagina: prox } = resposta.dados;

      if (reset) {
        setAgendamentos(novos);
      } else {
        setAgendamentos((prev) => [...prev, ...novos]);
      }
      setProximaPagina(prox);
      paginaRef.current = prox ? paginaRef.current + 1 : paginaRef.current;
      setPagina(paginaRef.current);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar agendamentos');
    } finally {
      setCarregando(false);
      setCarregandoMais(false);
    }
  }, [service, abortarAnterior]);

  const carregarMais = useCallback(async () => {
    if (!proximaPagina || carregandoMais || carregando) return;
    await carregarAgendamentos(undefined, false);
  }, [proximaPagina, carregandoMais, carregando, carregarAgendamentos]);

  const atualizarFiltro = useCallback((novoFiltro: Partial<AgendamentosFiltro>) => {
    carregarAgendamentos(novoFiltro, true);
  }, [carregarAgendamentos]);

  const atualizarStatus = useCallback(async (id: string, status: AgendamentoStatus) => {
    try {
      const resposta = await service.atualizarStatusAgendamento(id, status);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch {
      // Rollback
    }
  }, [service]);

  const reagendar = useCallback(async (id: string, novaData: string, novoHorario: string) => {
    try {
      const resposta = await service.reagendarAgendamento(id, novaData, novoHorario);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setAgendamentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, data: novaData, horario: novoHorario } : a))
      );
    } catch {
      // Rollback
    }
  }, [service]);

  const cancelar = useCallback(async (id: string, motivo?: string) => {
    try {
      const resposta = await service.cancelarAgendamento(id, motivo);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelado' } : a)));
    } catch {
      // Rollback
    }
  }, [service]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    agendamentos,
    filtro,
    pagina,
    proximaPagina,
    carregando,
    carregandoMais,
    erro,
    carregarAgendamentos,
    carregarMais,
    atualizarFiltro,
    atualizarStatus,
    reagendar,
    cancelar,
    limparErro,
  };
}