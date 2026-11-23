/**
 * Hook useNotificacoes - Gerenciamento de notificações do usuário.
 * Tempo real (polling), marcar como lida, agrupar, badge count.
 * Usa ServiceProvider (DIP) para injeção de dependência.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotificacoesService } from '@/contexto/ServiceHooks';
import type { Notificacao, TipoNotificacao } from '@/tipos';
import { useAuth } from './useAuth';

export interface EstadoNotificacoes {
  notificacoes: Notificacao[];
  naoLidas: number;
  carregando: boolean;
  erro: string | null;
  temMais: boolean;
  pagina: number;
}

export interface AcoesNotificacoes {
  marcarComoLida: (_id: string) => Promise<void>;
  marcarTodasComoLidas: () => Promise<void>;
  excluir: (_id: string) => Promise<void>;
  excluirTodasLidas: () => Promise<void>;
  recarregar: () => Promise<void>;
  carregarMais: () => Promise<void>;
  limparErro: () => void;
}

const INTERVALO_POLLING = 30000; // 30 segundos
const ITENS_POR_PAGINA = 20;

export const useNotificacoes = (): EstadoNotificacoes & AcoesNotificacoes => {
  const { usuario } = useAuth();
  const notificacoesService = useNotificacoesService();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [temMais, setTemMais] = useState(true);
  const [pagina, setPagina] = useState(1);
  const pollingRef = useRef<ReturnType<typeof setInterval>>();

  const recarregar = useCallback(async (resetar = true) => {
    if (!usuario) return;

    if (resetar) {
      setCarregando(true);
      setPagina(1);
    }
    setErro(null);

    try {
      const resposta = await notificacoesService.listar(usuario.email, 'todos');

      if (resposta.sucesso && resposta.dados) {
        const todos = resposta.dados;
        const inicio = resetar ? 0 : (pagina - 1) * ITENS_POR_PAGINA;
        const fim = inicio + ITENS_POR_PAGINA;
        const itens = todos.slice(inicio, fim);
        const haMais = fim < todos.length;

        if (resetar) {
          setNotificacoes(itens);
        } else {
          setNotificacoes((prev) => [...prev, ...itens]);
        }
        setTemMais(haMais);
        if (!resetar) setPagina((p) => p + 1);
      } else {
        setErro(resposta.erro || 'Erro ao carregar notificações');
        if (resetar) setNotificacoes([]);
        setTemMais(false);
      }
    } catch {
      if (resetar) {
        setErro('Erro de conexão. Tente novamente.');
        setNotificacoes([]);
        setTemMais(false);
      }
    } finally {
      setCarregando(false);
    }
  }, [usuario, pagina, notificacoesService]);

  const carregarMais = useCallback(async () => {
    if (carregando || !temMais) return;
    await recarregar(false);
  }, [carregando, temMais, recarregar]);

  // Conta não lidas
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  // Polling para novas notificações
  useEffect(() => {
    if (!usuario) return;

    recarregar();

    pollingRef.current = setInterval(() => {
      recarregar(false);
    }, INTERVALO_POLLING);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [usuario, recarregar]);

  const marcarComoLida = useCallback(async (id: string) => {
    try {
      const resposta = await notificacoesService.marcarComoLida(id);
      if (resposta.sucesso) {
        setNotificacoes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, lida: true, lidaEm: Date.now() } : n))
        );
      }
    } catch {
      // Silencioso
    }
  }, [notificacoesService]);

  const marcarTodasComoLidas = useCallback(async () => {
    if (!usuario) return;
    try {
      const resposta = await notificacoesService.marcarTodasComoLidas(usuario.email);
      if (resposta.sucesso) {
        setNotificacoes((prev) =>
          prev.map((n) => (!n.lida ? { ...n, lida: true, lidaEm: Date.now() } : n))
        );
      }
    } catch {
      // Silencioso
    }
  }, [usuario, notificacoesService]);

  const excluir = useCallback(async (id: string) => {
    try {
      const resposta = await notificacoesService.excluir(id);
      if (resposta.sucesso) {
        setNotificacoes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch {
      // Silencioso
    }
  }, [notificacoesService]);

  const excluirTodasLidas = useCallback(async () => {
    if (!usuario) return;
    try {
      const resposta = await notificacoesService.excluirTodasLidas(usuario.email);
      if (resposta.sucesso) {
        setNotificacoes((prev) => prev.filter((n) => !n.lida));
      }
    } catch {
      // Silencioso
    }
  }, [usuario, notificacoesService]);

  const limparErro = useCallback(() => setErro(null), []);

  return {
    notificacoes,
    naoLidas,
    carregando,
    erro,
    temMais,
    pagina,
    marcarComoLida,
    marcarTodasComoLidas,
    excluir,
    excluirTodasLidas,
    recarregar: () => recarregar(true),
    carregarMais,
    limparErro,
  };
};

/** Hook para filtro de notificações por tipo */
export const useNotificacoesFiltradas = (tipo?: TipoNotificacao) => {
  const { notificacoes, ...resto } = useNotificacoes();

  const filtradas = tipo
    ? notificacoes.filter((n) => n.tipo === tipo)
    : notificacoes;

  return { notificacoes: filtradas, ...resto };
};

/** Hook para notificações não lidas apenas */
export const useNotificacoesNaoLidas = () => {
  const { notificacoes, naoLidas, marcarTodasComoLidas, ...resto } = useNotificacoes();

  const apenasNaoLidas = notificacoes.filter((n) => !n.lida);

  return {
    notificacoes: apenasNaoLidas,
    naoLidas,
    marcarTodasComoLidas,
    ...resto,
  };
};