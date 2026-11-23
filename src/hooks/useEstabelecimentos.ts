/**
 * Hook useEstabelecimentos - Busca, filtros, paginação de estabelecimentos.
 * Integra com ServiceProvider (DIP), cache local, debounce de busca.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEstabelecimentosService } from '@/contexto/ServiceHooks';
import type { Estabelecimento, FiltrosEstabelecimento, Nicho, FiltrosBusca } from '@/tipos';

export interface EstadoEstabelecimentos {
  estabelecimentos: Estabelecimento[];
  carregando: boolean;
  erro: string | null;
  temMais: boolean;
  pagina: number;
  total: number;
}

export interface AcoesEstabelecimentos {
  buscar: (_filtros?: Partial<FiltrosEstabelecimento>) => Promise<void>;
  carregarMais: () => Promise<void>;
  recarregar: () => Promise<void>;
  limparFiltros: () => void;
  obterPorId: (_id: string) => Estabelecimento | undefined;
  obterPorSlug: (_slug: string) => Estabelecimento | undefined;
}

const ITENS_POR_PAGINA = 12;
const TEMPO_DEBOUNCE = 300;

export const useEstabelecimentos = (filtrosIniciais: Partial<FiltrosEstabelecimento> = {}): EstadoEstabelecimentos & AcoesEstabelecimentos => {
  const estabelecimentosService = useEstabelecimentosService();
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [temMais, setTemMais] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtros, setFiltros] = useState<FiltrosEstabelecimento>({
    busca: '',
    nicho: 'todos',
    cidade: 'todas',
    ordenacao: 'avaliacao',
    raioKm: 10,
    apenasAbertos: false,
    avaliacaoMinima: 0,
    precoMaximo: 500,
    ...filtrosIniciais,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortControllerRef = useRef<AbortController>();

  // Converte FiltrosEstabelecimento para FiltrosBusca
  const converterFiltros = useCallback((f: FiltrosEstabelecimento): FiltrosBusca => ({
    nicho: f.nicho,
    precoMaximo: f.precoMaximo,
    avaliacaoMinima: f.avaliacaoMinima,
    tipoServico: f.busca,
    ordenacao: f.ordenacao as FiltrosBusca['ordenacao'],
    apenasBemAvaliados: f.avaliacaoMinima >= 4.8,
    apenasVagasHoje: f.apenasAbertos,
    localizacaoUsuario: null,
  }), []);

  // Debounce na busca
  const buscarComDebounce = useCallback(async (novosFiltros?: Partial<FiltrosEstabelecimento>) => {
    if (novosFiltros) {
      setFiltros((prev) => ({ ...prev, ...novosFiltros }));
    }
  }, []);

  const buscar = useCallback(async (novosFiltros?: Partial<FiltrosEstabelecimento>) => {
    const filtrosAtuais = novosFiltros ? { ...filtros, ...novosFiltros } : filtros;

    // Cancela requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setCarregando(true);
    setErro(null);

    try {
      const filtrosBusca = converterFiltros(filtrosAtuais);
      const resposta = await estabelecimentosService.buscar(filtrosBusca);

      if (resposta.sucesso && resposta.dados) {
        const todos = resposta.dados;
        // Simula paginação
        const inicio = (pagina - 1) * ITENS_POR_PAGINA;
        const fim = inicio + ITENS_POR_PAGINA;
        const itens = todos.slice(inicio, fim);
        const haMais = fim < todos.length;

        if (pagina === 1) {
          setEstabelecimentos(itens);
        } else {
          setEstabelecimentos((prev) => [...prev, ...itens]);
        }
        setTotal(todos.length);
        setTemMais(haMais);
      } else {
        setErro(resposta.erro || 'Erro ao buscar estabelecimentos');
        setEstabelecimentos([]);
        setTemMais(false);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setErro('Erro de conexão. Tente novamente.');
      setEstabelecimentos([]);
      setTemMais(false);
    } finally {
      setCarregando(false);
    }
  }, [filtros, pagina, converterFiltros, estabelecimentosService]);

  const carregarMais = useCallback(async () => {
    if (carregando || !temMais) return;

    const proximaPagina = pagina + 1;
    setPagina(proximaPagina);
    abortControllerRef.current = new AbortController();

    setCarregando(true);

    try {
      const filtrosBusca = converterFiltros(filtros);
      const resposta = await estabelecimentosService.buscar(filtrosBusca);

      if (resposta.sucesso && resposta.dados) {
        const todos = resposta.dados;
        const inicio = (proximaPagina - 1) * ITENS_POR_PAGINA;
        const fim = inicio + ITENS_POR_PAGINA;
        const itens = todos.slice(inicio, fim);
        const haMais = fim < todos.length;

        setEstabelecimentos((prev) => [...prev, ...itens]);
        setTemMais(haMais);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      // Silencioso para carregar mais
    } finally {
      setCarregando(false);
    }
  }, [carregando, temMais, pagina, filtros, converterFiltros, estabelecimentosService]);

  const recarregar = useCallback(async () => {
    setPagina(1);
    await buscar();
  }, [buscar]);

  const limparFiltros = useCallback(() => {
    setFiltros({
      busca: '',
      nicho: 'todos',
      cidade: 'todas',
      ordenacao: 'avaliacao',
      raioKm: 10,
      apenasAbertos: false,
      avaliacaoMinima: 0,
      precoMaximo: 500,
    });
    setPagina(1);
  }, []);

  const obterPorId = useCallback((id: string) => {
    return estabelecimentos.find((e) => e.id === id);
  }, [estabelecimentos]);

  const obterPorSlug = useCallback((slug: string) => {
    return estabelecimentos.find((e) => e.slug === slug);
  }, [estabelecimentos]);

  // Efeito para buscar quando filtros mudam (com debounce)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPagina(1);
      buscar();
    }, TEMPO_DEBOUNCE);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filtros, buscar]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    estabelecimentos,
    carregando,
    erro,
    temMais,
    pagina,
    total,
    buscar: buscarComDebounce,
    carregarMais,
    recarregar,
    limparFiltros,
    obterPorId,
    obterPorSlug,
  };
};

/** Hook para estabelecimento único (detalhes) */
export const useEstabelecimento = (id: string | null) => {
  const estabelecimentosService = useEstabelecimentosService();
  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    if (!id) return;
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await estabelecimentosService.obter(id);
      if (resposta.sucesso && resposta.dados) {
        setEstabelecimento(resposta.dados);
      } else {
        setErro(resposta.erro || 'Estabelecimento não encontrado');
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, [id, estabelecimentosService]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  return { estabelecimento, carregando, erro, recarregar: buscar };
};

/** Hook para nichos disponíveis */
export const useNichos = () => {
  const [nichos, setNichos] = useState<Nicho[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const buscar = async () => {
      setCarregando(true);
      try {
        // Nichos vêm do tipo
        const nichosDisponiveis: Nicho[] = ['barbearia', 'feminino', 'visagismo', 'infantil'];
        setNichos(nichosDisponiveis);
      } finally {
        setCarregando(false);
      }
    };
    buscar();
  }, []);

  return { nichos, carregando };
};

/** Hook para cidades disponíveis */
export const useCidades = () => {
  const estabelecimentosService = useEstabelecimentosService();
  const [cidades, setCidades] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const buscar = async () => {
      setCarregando(true);
      try {
        // Busca cidades dos estabelecimentos
        const resposta = await estabelecimentosService.buscar({
          nicho: 'todos',
          precoMaximo: 9999,
          avaliacaoMinima: 0,
          tipoServico: '',
          ordenacao: 'avaliacao',
          apenasBemAvaliados: false,
          apenasVagasHoje: false,
          localizacaoUsuario: null,
        });
        if (resposta.sucesso && resposta.dados) {
          const cidadesUnicas = [...new Set(resposta.dados.map((e) => e.cidade))].sort();
          setCidades(cidadesUnicas);
        }
      } finally {
        setCarregando(false);
      }
    };
    buscar();
  }, [estabelecimentosService]);

  return { cidades, carregando };
};