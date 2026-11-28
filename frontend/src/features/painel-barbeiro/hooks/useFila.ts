/**
 * Hook useFila - Gerencia fila de espera do barbeiro.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getPainelBarbeiroService } from '../services';
import type {
  FilaState,
  FilaActions,
  FilaEspera,
} from '../types';

export function useFila(): FilaState & FilaActions {
  const service = getPainelBarbeiroService();
  const abortRef = useRef<AbortController | null>(null);

  const [fila, setFila] = useState<FilaEspera[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const abortarAnterior = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  const carregarFila = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarFila(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setFila(resposta.dados);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar fila');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const adicionarCliente = useCallback(async (cliente: Omit<FilaEspera, 'id' | 'posicao' | 'entradaEm'>) => {
    try {
      const resposta = await service.adicionarNaFila(cliente);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setFila((prev) => [...prev, resposta.dados]);
    } catch {
      // Erro silencioso
    }
  }, [service]);

  const chamarProximo = useCallback(async () => {
    try {
      const resposta = await service.chamarProximoFila();
      if (!resposta.sucesso) throw new Error(resposta.erro);

      if (resposta.dados) {
        setFila((prev) => prev.filter((f) => f.id !== resposta.dados!.id));
      }
    } catch {
      // Erro silencioso
    }
  }, [service]);

  const remover = useCallback(async (id: string) => {
    try {
      const resposta = await service.removerDaFila(id);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setFila((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // Erro silencioso
    }
  }, [service]);

  const reordenar = useCallback(async (ids: string[]) => {
    try {
      const resposta = await service.reordenarFila(ids);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      // Reordena localmente
      const novaOrdem = ids.map((id) => fila.find((f) => f.id === id)).filter(Boolean) as FilaEspera[];
      novaOrdem.forEach((f, i) => { f.posicao = i + 1; });
      setFila(novaOrdem);
    } catch {
      // Rollback
    }
  }, [service, fila]);

  // Carrega inicial
  useEffect(() => {
    carregarFila();
  }, [carregarFila]);

  // Cleanup
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    fila,
    carregando,
    erro,
    carregarFila,
    adicionarCliente,
    chamarProximo,
    remover,
    reordenar,
    limparErro,
  };
}