/**
 * Hook useFeed - Gerencia estado do feed principal.
 * Segue padrão: estado imutável, AbortController, Result<T,E>, callbacks estáveis.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getFeedService } from '../services';
import type {
  FeedState,
  FeedActions,
  FeedFiltros,
  FeedOrdenacao,
  Publicacao,
} from '../types';
import { ordenarPublicacoes, filtrarPublicacoes } from '../rules';

const FILTROS_INICIAIS: FeedFiltros = {
  tipo: undefined,
  autorId: undefined,
  salvos: false,
  seguidos: false,
  dataInicio: undefined,
  dataFim: undefined,
  busca: undefined,
};

const ORDENACAO_INICIAL: FeedOrdenacao = 'recentes';

export function useFeed(): FeedState & FeedActions {
  const service = getFeedService();
  const abortRef = useRef<AbortController | null>(null);
  const paginaRef = useRef(1);
  const filtrosRef = useRef(FILTROS_INICIAIS);
  const ordenacaoRef = useRef(ORDENACAO_INICIAL);

  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [proximaPagina, setProximaPagina] = useState<number | null>(1);
  const [carregando, setCarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Limpa abort anterior
  const abortarAnterior = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  const carregarFeed = useCallback(async (novosFiltros?: Partial<FeedFiltros>, reset = true) => {
    const signal = abortarAnterior();
    if (reset) {
      setCarregando(true);
      paginaRef.current = 1;
      setPublicacoes([]);
    } else {
      setCarregandoMais(true);
    }
    setErro(null);

    if (novosFiltros) {
      filtrosRef.current = { ...filtrosRef.current, ...novosFiltros };
    }

    try {
      const resposta = await service.buscarFeed(
        filtrosRef.current,
        ordenacaoRef.current,
        paginaRef.current,
        20,
        signal
      );

      if (!resposta.sucesso) throw new Error(resposta.erro);

      const { publicacoes: novas, proximaPagina: prox } = resposta.dados;

      if (reset) {
        setPublicacoes(novas);
      } else {
        setPublicacoes((prev) => [...prev, ...novas]);
      }
      setProximaPagina(prox);
      paginaRef.current = prox ? paginaRef.current + 1 : paginaRef.current;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar feed');
    } finally {
      setCarregando(false);
      setCarregandoMais(false);
    }
  }, [service, abortarAnterior]);

  const carregarMais = useCallback(async () => {
    if (!proximaPagina || carregandoMais || carregando) return;
    await carregarFeed(undefined, false);
  }, [proximaPagina, carregandoMais, carregando, carregarFeed]);

  const atualizarFiltros = useCallback((novosFiltros: Partial<FeedFiltros>) => {
    carregarFeed(novosFiltros, true);
  }, [carregarFeed]);

  const atualizarOrdenacao = useCallback((novaOrdenacao: FeedOrdenacao) => {
    ordenacaoRef.current = novaOrdenacao;
    // Reordena localmente para feedback imediato
    setPublicacoes((prev) => ordenarPublicacoes(filtrarPublicacoes(prev, filtrosRef.current), novaOrdenacao));
    // Recarrega do servidor
    carregarFeed(undefined, true);
  }, [carregarFeed]);

  // Interações otimistas
  const curtir = useCallback(async (publicacaoId: string) => {
    const idx = publicacoes.findIndex((p) => p.id === publicacaoId);
    if (idx === -1) return;

    const anterior = publicacoes[idx];
    const otimista: Publicacao = {
      ...anterior,
      curtidas: anterior.estaCurtido ? anterior.curtidas - 1 : anterior.curtidas + 1,
      estaCurtido: !anterior.estaCurtido,
    };

    setPublicacoes((prev) => prev.map((p, i) => (i === idx ? otimista : p)));

    try {
      const resposta = anterior.estaCurtido
        ? await service.descurtir(publicacaoId)
        : await service.curtir(publicacaoId);

      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      // Rollback
      setPublicacoes((prev) => prev.map((p, i) => (i === idx ? anterior : p)));
    }
  }, [publicacoes, service]);

  const salvar = useCallback(async (publicacaoId: string) => {
    const idx = publicacoes.findIndex((p) => p.id === publicacaoId);
    if (idx === -1) return;

    const anterior = publicacoes[idx];
    const otimista: Publicacao = { ...anterior, estaSalvo: !anterior.estaSalvo };

    setPublicacoes((prev) => prev.map((p, i) => (i === idx ? otimista : p)));

    try {
      const resposta = anterior.estaSalvo
        ? await service.desalvar(publicacaoId)
        : await service.salvar(publicacaoId);

      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      setPublicacoes((prev) => prev.map((p, i) => (i === idx ? anterior : p)));
    }
  }, [publicacoes, service]);

  const comentar = useCallback(async (publicacaoId: string, texto: string) => {
    try {
      const resposta = await service.adicionarComentario(publicacaoId, { texto, publicacaoId });
      if (!resposta.sucesso) throw new Error(resposta.erro);

      // Atualiza contador local
      setPublicacoes((prev) =>
        prev.map((p) =>
          p.id === publicacaoId ? { ...p, comentarios: p.comentarios + 1 } : p
        )
      );
    } catch {
      // Erro silencioso - toast no componente
    }
  }, [service]);

  const denunciar = useCallback(async (publicacaoId: string, motivo: string) => {
    try {
      const resposta = await service.denunciar(publicacaoId, motivo);
      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      // Erro silencioso
    }
  }, [service]);

  const compartilhar = useCallback(async (publicacaoId: string) => {
    try {
      const resposta = await service.compartilhar(publicacaoId);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      return resposta.dados?.link;
    } catch {
      return null;
    }
  }, [service]);

  // Cleanup
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    publicacoes,
    proximaPagina,
    carregando,
    carregandoMais,
    erro,
    filtros: filtrosRef.current,
    ordenacao: ordenacaoRef.current,
    carregarFeed,
    carregarMais,
    curtir,
    descurtir: curtir, // Mesmo toggle
    salvar,
    desalvar: salvar, // Mesmo toggle
    comentar,
    excluirComentario: async () => {}, // Não implementado no feed principal
    denunciar,
    compartilhar,
    atualizarFiltros,
    atualizarOrdenacao,
    limparErro,
  };
}