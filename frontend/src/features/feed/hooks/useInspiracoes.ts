/**
 * Hook useInspiracoes - Gerencia estado das inspirações (galeria de referências).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getFeedService } from '../services';
import type {
  InspiracoesState,
  InspiracoesActions,
  Inspiracao,
  InspiracaoCategoria,
} from '../types';

export function useInspiracoes(): InspiracoesState & InspiracoesActions {
  const service = getFeedService();
  const abortRef = useRef<AbortController | null>(null);

  const [inspiracaoes, setInspiracoes] = useState<Inspiracao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState<InspiracaoCategoria | 'todas'>('todas');

  const abortarAnterior = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  const carregarInspiracoes = useCallback(async (categoria?: InspiracaoCategoria) => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarInspiracoes(categoria, signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setInspiracoes(resposta.dados);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar inspirações');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const filtrarPorCategoria = useCallback((categoria: InspiracaoCategoria | 'todas') => {
    setCategoriaAtiva(categoria);
    carregarInspiracoes(categoria === 'todas' ? undefined : categoria);
  }, [carregarInspiracoes]);

  // Carrega inicial
  useEffect(() => {
    carregarInspiracoes();
  }, [carregarInspiracoes]);

  // Cleanup
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    inspiracaoes,
    carregando,
    erro,
    categoriaAtiva,
    carregarInspiracoes,
    filtrarPorCategoria,
    limparErro,
  };
}