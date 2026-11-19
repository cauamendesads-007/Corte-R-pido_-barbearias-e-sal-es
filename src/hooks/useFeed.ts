/**
 * Hook useFeed - Feed de publicações (inspirações, cortes, dicas).
 * Paginação infinita, curtir/salvar/compartilhar, otimista.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/servicos/api';
import type { Publicacao, TipoMidia } from '@/tipos';
import { useAuth } from './useAuth';

export interface EstadoFeed {
  publicacoes: Publicacao[];
  carregando: boolean;
  carregandoMais: boolean;
  erro: string | null;
  temMais: boolean;
  pagina: number;
}

export interface AcoesFeed {
  curtir: (id: string) => Promise<void>;
  salvar: (id: string) => Promise<void>;
  compartilhar: (id: string) => Promise<void>;
  criar: (dados: {
    legenda: string;
    servicoId?: string;
    estabelecimentoId: string;
    midias: Array<{ tipo: TipoMidia; src: string }>;
  }) => Promise<{ sucesso: boolean; publicacao?: Publicacao; erro?: string }>;
  excluir: (id: string, estabelecimentoId: string) => Promise<{ sucesso: boolean; erro?: string }>;
  denunciar: (id: string, motivo: string) => Promise<{ sucesso: boolean; erro?: string }>;
  recarregar: () => Promise<void>;
  carregarMais: () => Promise<void>;
  limparErro: () => void;
}

const ITENS_POR_PAGINA = 10;

export const useFeed = (tipo: 'todos' | 'seguindo' | 'inspiracoes' | 'populares' = 'todos'): EstadoFeed & AcoesFeed => {
  const { usuario } = useAuth();
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [temMais, setTemMais] = useState(true);
  const [pagina, setPagina] = useState(1);
  const otimistasRef = useRef<Map<string, Partial<Publicacao>>>(new Map());

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    setPagina(1);

    try {
      let filtro: string = tipo;
      if (tipo === 'inspiracoes' && usuario) {
        filtro = 'salvos';
      } else if (tipo === 'seguindo' && usuario) {
        filtro = 'todos'; // API filtra por seguindo internamente
      }

      const resposta = await api.feed.listar({ usuarioEmail: usuario?.email, filtro });

      if (resposta.sucesso && resposta.dados) {
        const todos = resposta.dados;
        const itens = todos.slice(0, ITENS_POR_PAGINA);
        const haMais = todos.length > ITENS_POR_PAGINA;
        setPublicacoes(itens);
        setTemMais(haMais);
      } else {
        setErro(resposta.erro || 'Erro ao carregar feed');
        setPublicacoes([]);
        setTemMais(false);
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
      setPublicacoes([]);
      setTemMais(false);
    } finally {
      setCarregando(false);
    }
  }, [tipo, usuario?.email]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const carregarMais = useCallback(async () => {
    if (carregandoMais || !temMais) return;

    setCarregandoMais(true);

    try {
      let filtro: string = tipo;
      if (tipo === 'inspiracoes' && usuario) {
        filtro = 'salvos';
      }

      const resposta = await api.feed.listar({ usuarioEmail: usuario?.email, filtro });

      if (resposta.sucesso && resposta.dados) {
        const todos = resposta.dados;
        const inicio = pagina * ITENS_POR_PAGINA;
        const fim = inicio + ITENS_POR_PAGINA;
        const itens = todos.slice(inicio, fim);
        const haMais = fim < todos.length;

        setPublicacoes((prev) => [...prev, ...itens]);
        setPagina(pagina + 1);
        setTemMais(haMais);
      }
    } catch {
      // Silencioso
    } finally {
      setCarregandoMais(false);
    }
  }, [carregandoMais, temMais, pagina, tipo, usuario?.email]);

  // Atualiza otimista
  const aplicarOtimista = useCallback((id: string, atualizacoes: Partial<Publicacao>) => {
    otimistasRef.current.set(id, { ...otimistasRef.current.get(id), ...atualizacoes });
    setPublicacoes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...otimistasRef.current.get(id) } : p))
    );
  }, []);

  const reverterOtimista = useCallback((id: string) => {
    otimistasRef.current.delete(id);
  }, []);

  const curtir = useCallback(async (id: string) => {
    const publicacao = publicacoes.find((p) => p.id === id);
    if (!publicacao || !usuario) return;

    const jaCurtiu = publicacao.usuarioCurtiu;
    const novaContagem = jaCurtiu ? publicacao.curtidas.length - 1 : publicacao.curtidas.length + 1;

    // Otimista
    aplicarOtimista(id, { usuarioCurtiu: !jaCurtiu, curtidas: Array(novaContagem).fill('') });

    try {
      const resposta = await api.feed.curtir(id, usuario.email);
      if (!resposta.sucesso) {
        reverterOtimista(id);
      }
    } catch {
      reverterOtimista(id);
    }
  }, [publicacoes, usuario, aplicarOtimista, reverterOtimista]);

  const salvar = useCallback(async (id: string) => {
    const publicacao = publicacoes.find((p) => p.id === id);
    if (!publicacao || !usuario) return;

    const jaSalvou = publicacao.usuarioSalvou;

    // Otimista
    aplicarOtimista(id, { usuarioSalvou: !jaSalvou });

    try {
      const resposta = await api.feed.salvar(id, usuario.email);
      if (!resposta.sucesso) {
        reverterOtimista(id);
      }
    } catch {
      reverterOtimista(id);
    }
  }, [publicacoes, usuario, aplicarOtimista, reverterOtimista]);

  const compartilhar = useCallback(async (id: string) => {
    const publicacao = publicacoes.find((p) => p.id === id);
    if (!publicacao) return;

    try {
      await api.feed.compartilhar(id);
      // Incrementa contador local
      aplicarOtimista(id, { compartilhamentos: (publicacao.compartilhamentos || 0) + 1 });
    } catch {
      // Silencioso
    }
  }, [publicacoes, aplicarOtimista]);

  const criar = useCallback(async (dados: {
    legenda: string;
    servicoId?: string;
    estabelecimentoId: string;
    midias: Array<{ tipo: TipoMidia; src: string }>;
  }) => {
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };

    setErro(null);

    try {
      // Busca tag do serviço se fornecido
      let tagServico: string | undefined;
      if (dados.servicoId) {
        const estResposta = await api.estabelecimentos.obter(dados.estabelecimentoId);
        if (estResposta.sucesso && estResposta.dados) {
          const servico = estResposta.dados.servicos.find((s) => s.id === dados.servicoId);
          tagServico = servico?.tag;
        }
      }

      const primeiraMidia = dados.midias[0];
      const resposta = await api.feed.criar({
        estabelecimentoId: dados.estabelecimentoId,
        tipo: primeiraMidia?.tipo || 'texto',
        src: primeiraMidia?.src,
        legenda: dados.legenda,
        tagServico,
      });

      if (resposta.sucesso && resposta.dados) {
        setPublicacoes((prev) => [resposta.dados!, ...prev]);
        return { sucesso: true, publicacao: resposta.dados };
      }

      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [usuario]);

  const excluir = useCallback(async (id: string, estabelecimentoId: string) => {
    setErro(null);

    try {
      const resposta = await api.feed.excluir(id, estabelecimentoId);

      if (resposta.sucesso) {
        setPublicacoes((prev) => prev.filter((p) => p.id !== id));
        return { sucesso: true };
      }

      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, []);

  const denunciar = useCallback(async (id: string, motivo: string) => {
    setErro(null);

    try {
      const resposta = await api.feed.denunciar(id, motivo);
      return { sucesso: resposta.sucesso, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  return {
    publicacoes,
    carregando,
    carregandoMais,
    erro,
    temMais,
    pagina,
    curtir,
    salvar,
    compartilhar,
    criar,
    excluir,
    denunciar,
    recarregar,
    carregarMais,
    limparErro,
  };
};

/** Hook para inspirações salvas do usuário */
export const useInspiracoes = () => {
  const { usuario } = useAuth();
  const [inspiracoes, setInspiracoes] = useState<Publicacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!usuario) return;

    setCarregando(true);
    setErro(null);

    try {
      const resposta = await api.feed.listar({ usuarioEmail: usuario.email, filtro: 'salvos' });
      if (resposta.sucesso && resposta.dados) {
        setInspiracoes(resposta.dados);
      } else {
        setErro(resposta.erro || 'Erro ao carregar inspirações');
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (usuario) recarregar();
  }, [usuario, recarregar]);

  return { inspiracoes, carregando, erro, recarregar };
};