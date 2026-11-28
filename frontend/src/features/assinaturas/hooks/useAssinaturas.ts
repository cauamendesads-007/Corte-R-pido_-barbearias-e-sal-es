/**
 * Hooks do domínio Assinaturas - Estado, Otimista UI, Rollback.
 * AbortController para race conditions, sessionStorage para draft.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  PlanoId,
  CicloFaturamento,
  PlanoAssinatura,
  AssinaturaAtiva,
  Fatura,
  HistoricoPlano,
  VerificacaoLimite,
  ValidacaoCupom,
  ComparacaoPlanosProps,
  GerenciamentoAssinaturaProps,
} from '../types';
import { IAssinaturasService, getAssinaturasService } from '../services';

// ============================================
// TIPOS INTERNOS
// ============================================

interface UseAssinaturasState {
  planos: readonly PlanoAssinatura[];
  assinatura: AssinaturaAtiva | null;
  faturas: Fatura[];
  historico: HistoricoPlano[];
  carregando: boolean;
  erro: string | null;
}

interface UseAssinaturasActions {
  // Planos
  recarregarPlanos: () => Promise<void>;
  // Assinatura
  recarregarAssinatura: () => Promise<void>;
  criarAssinatura: (_planoId: PlanoId, _ciclo: CicloFaturamento, _cupom?: string) => Promise<AssinaturaAtiva>;
  alterarPlano: (_planoId: PlanoId, _ciclo: CicloFaturamento) => Promise<void>;
  pausarAssinatura: () => Promise<void>;
  cancelarAssinatura: (_motivo: string) => Promise<void>;
  reativarAssinatura: () => Promise<void>;
  aplicarCupom: (_codigo: string) => Promise<ValidacaoCupom>;
  // Faturas
  recarregarFaturas: () => Promise<void>;
  baixarFatura: (_id: string) => Promise<void>;
  imprimirFatura: (_id: string) => Promise<void>;
  // Histórico
  recarregarHistorico: () => Promise<void>;
  // Limites
  verificarLimite: (_recurso: 'barbeiros' | 'cadeiras' | 'agendamentosMes', _qtdAtual: number, _qtdNova?: number) => Promise<VerificacaoLimite>;
  // Utilitários
  limparErro: () => void;
  resetar: () => void;
}

type UseAssinaturasReturn = UseAssinaturasState & UseAssinaturasActions;

// ============================================
// ABORT CONTROLLER PARA RACE CONDITIONS
// ============================================

// AbortController é criado inline em executarComAbort

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useAssinaturas(): UseAssinaturasReturn {
  const serviceRef = useRef<IAssinaturasService>(getAssinaturasService());
  const abortRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<UseAssinaturasState>({
    planos: [],
    assinatura: null,
    faturas: [],
    historico: [],
    carregando: false,
    erro: null,
  });

  // ============================================
  // HELPERS DE ESTADO
  // ============================================

  const setCarregando = useCallback((carregando: boolean) => {
    setState(prev => ({ ...prev, carregando }));
  }, []);

  const setErro = useCallback((erro: string | null) => {
    setState(prev => ({ ...prev, erro }));
  }, []);

  const limparErro = useCallback(() => {
    setState(prev => ({ ...prev, erro: null }));
  }, []);

  const resetar = useCallback(() => {
    setState({
      planos: [],
      assinatura: null,
      faturas: [],
      historico: [],
      carregando: false,
      erro: null,
    });
  }, []);

  // ============================================
  // EXECUÇÃO COM ABORT
  // ============================================

  async function executarComAbort<T>(
    fn: (_signal: AbortSignal) => Promise<T>,
    opcoes?: { carregando?: boolean; erroMsg?: string }
  ): Promise<T | null> {
    // Cancelar requisição anterior se houver
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    if (opcoes?.carregando !== false) {
      setCarregando(true);
    }
    setErro(null);

    try {
      const resultado = await fn(controller.signal);
      if (!controller.signal.aborted) {
        setCarregando(false);
        return resultado;
      }
      return null;
    } catch (error) {
      if (controller.signal.aborted) return null;

      const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
      setErro(opcoes?.erroMsg ?? mensagem);
      setCarregando(false);
      throw error;
    }
  }

  // ============================================
  // OTIMISTIC UI COM ROLLBACK
  // ============================================

  async function executarOtIMISTA<T>(
    acaoOtima: () => void,
    acaoServidor: () => Promise<T>,
    rollback: () => void
  ): Promise<T> {
    // Aplica UI otimista imediatamente
    acaoOtima();

    try {
      const resultado = await acaoServidor();
      return resultado;
    } catch (error) {
      // Rollback na falha
      rollback();
      throw error;
    }
  }

  // ============================================
  // PLANOS
  // ============================================

  const recarregarPlanos = useCallback(async () => {
    await executarComAbort(
      async () => {
        const planos = await serviceRef.current.obterPlanos();
        setState(prev => ({ ...prev, planos }));
      },
      { erroMsg: 'Falha ao carregar planos' }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // ASSINATURA ATIVA
  // ============================================

  const recarregarAssinatura = useCallback(async () => {
    await executarComAbort(
      async () => {
        const assinatura = await serviceRef.current.obterAssinaturaAtiva();
        setState(prev => ({ ...prev, assinatura }));
      },
      { erroMsg: 'Falha ao carregar assinatura' }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const criarAssinatura = useCallback(async (planoId: PlanoId, ciclo: CicloFaturamento, cupom?: string) => {
    return executarComAbort(
      async () => {
        const assinatura = await serviceRef.current.criarAssinatura(planoId, ciclo, cupom);
        setState(prev => ({ ...prev, assinatura }));
        return assinatura;
      },
      { carregando: true, erroMsg: 'Falha ao criar assinatura' }
    ) as Promise<AssinaturaAtiva>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alterarPlano = useCallback(async (planoId: PlanoId, ciclo: CicloFaturamento) => {
    const assinaturaAnterior = state.assinatura;

    await executarOtIMISTA(
      // UI Otimista
      () => {
        setState(prev => ({
          ...prev,
          assinatura: prev.assinatura ? { ...prev.assinatura, planoId, ciclo } : null,
        }));
      },
      // Servidor
      async () => {
        const assinatura = await serviceRef.current.alterarPlano(planoId, ciclo);
        setState(prev => ({ ...prev, assinatura }));
      },
      // Rollback
      () => {
        setState(prev => ({ ...prev, assinatura: assinaturaAnterior }));
      }
    );
  }, [state.assinatura]);

  const pausarAssinatura = useCallback(async () => {
    const assinaturaAnterior = state.assinatura;

    await executarOtIMISTA(
      () => {
        setState(prev => ({
          ...prev,
          assinatura: prev.assinatura ? { ...prev.assinatura, status: 'pausada' as const } : null,
        }));
      },
      async () => {
        const assinatura = await serviceRef.current.pausarAssinatura();
        setState(prev => ({ ...prev, assinatura }));
      },
      () => {
        setState(prev => ({ ...prev, assinatura: assinaturaAnterior }));
      }
    );
  }, [state.assinatura]);

  const cancelarAssinatura = useCallback(async (motivo: string) => {
    const assinaturaAnterior = state.assinatura;

    await executarOtIMISTA(
      () => {
        setState(prev => ({
          ...prev,
          assinatura: prev.assinatura ? { ...prev.assinatura, status: 'cancelada' as const } : null,
        }));
      },
      async () => {
        const assinatura = await serviceRef.current.cancelarAssinatura(motivo);
        setState(prev => ({ ...prev, assinatura }));
      },
      () => {
        setState(prev => ({ ...prev, assinatura: assinaturaAnterior }));
      }
    );
  }, [state.assinatura]);

  const reativarAssinatura = useCallback(async () => {
    const assinaturaAnterior = state.assinatura;

    await executarOtIMISTA(
      () => {
        setState(prev => ({
          ...prev,
          assinatura: prev.assinatura ? { ...prev.assinatura, status: 'ativa' as const } : null,
        }));
      },
      async () => {
        const assinatura = await serviceRef.current.reativarAssinatura();
        setState(prev => ({ ...prev, assinatura }));
      },
      () => {
        setState(prev => ({ ...prev, assinatura: assinaturaAnterior }));
      }
    );
  }, [state.assinatura]);

  const aplicarCupom = useCallback(async (codigo: string) => {
    return executarComAbort(
      async () => {
        const validacao = await serviceRef.current.aplicarCupom(codigo);
        return validacao;
      },
      { erroMsg: 'Falha ao validar cupom' }
    ) as Promise<ValidacaoCupom>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // FATURAS
  // ============================================

  const recarregarFaturas = useCallback(async () => {
    await executarComAbort(
      async () => {
        const faturas = await serviceRef.current.obterFaturas();
        setState(prev => ({ ...prev, faturas }));
      },
      { erroMsg: 'Falha ao carregar faturas' }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baixarFatura = useCallback(async (id: string) => {
    await executarComAbort(
      async () => {
        const blob = await serviceRef.current.baixarFatura(id);
        const fatura = state.faturas.find(f => f.id === id);
        const nomeArquivo = fatura ? `fatura-${fatura.numero}.pdf` : `fatura-${id}.pdf`;

        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      { erroMsg: 'Falha ao baixar fatura' }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.faturas]);

  const imprimirFatura = useCallback(async (id: string) => {
    await executarComAbort(
      async () => {
        await serviceRef.current.imprimirFatura(id);
      },
      { erroMsg: 'Falha ao imprimir fatura' }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // HISTÓRICO
  // ============================================

  const recarregarHistorico = useCallback(async () => {
    await executarComAbort(
      async () => {
        const historico = await serviceRef.current.obterHistoricoPlanos();
        setState(prev => ({ ...prev, historico }));
      },
      { erroMsg: 'Falha ao carregar histórico' }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // LIMITES & UPSELL
  // ============================================

  const verificarLimite = useCallback(async (
    recurso: 'barbeiros' | 'cadeiras' | 'agendamentosMes',
    qtdAtual: number,
    qtdNova?: number
  ) => {
    return executarComAbort(
      async () => {
        return serviceRef.current.verificarLimite(recurso, qtdAtual, qtdNova);
      },
      { erroMsg: 'Falha ao verificar limite' }
    ) as Promise<VerificacaoLimite>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // EFEITOS - CARREGAMENTO INICIAL
  // ============================================

  useEffect(() => {
    let montado = true;

    async function carregarInicial() {
      setCarregando(true);
      try {
        const [planos, assinatura, faturas, historico] = await Promise.all([
          serviceRef.current.obterPlanos(),
          serviceRef.current.obterAssinaturaAtiva(),
          serviceRef.current.obterFaturas(),
          serviceRef.current.obterHistoricoPlanos(),
        ]);

        if (montado) {
          setState(prev => ({
            ...prev,
            planos,
            assinatura,
            faturas,
            historico,
            carregando: false,
          }));
        }
      } catch {
        if (montado) {
          setErro('Falha ao carregar dados iniciais');
          setCarregando(false);
        }
      }
    }

    carregarInicial();

    return () => {
      montado = false;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // RETORNO
  // ============================================

  return {
    // Estado
    ...state,
    // Ações
    recarregarPlanos,
    recarregarAssinatura,
    criarAssinatura,
    alterarPlano,
    pausarAssinatura,
    cancelarAssinatura,
    reativarAssinatura,
    aplicarCupom,
    recarregarFaturas,
    baixarFatura,
    imprimirFatura,
    recarregarHistorico,
    verificarLimite,
    limparErro,
    resetar,
  };
}

// ============================================
// HOOKS ESPECIALIZADOS
// ============================================

export function useComparacaoPlanos(props: ComparacaoPlanosProps) {
  const { planos, assinatura, carregando } = useAssinaturas();

  const planoAtual = assinatura?.planoId ?? props.planoAtual;
  const cicloPreferido = props.cicloPreferido ?? 'mensal';

  const planosOrdenados = [...planos].sort((a, b) => a.ordem - b.ordem);

  const selecionarPlano = useCallback((planoId: PlanoId, ciclo: CicloFaturamento) => {
    props.onSelecionarPlano(planoId, ciclo);
  }, [props]);

  const verDetalhes = useCallback((planoId: PlanoId) => {
    props.onVerDetalhes?.(planoId);
  }, [props]);

  return {
    planos: planosOrdenados,
    planoAtual,
    cicloPreferido,
    carregando,
    selecionarPlano,
    verDetalhes,
  };
}

export function useGerenciamentoAssinatura(props: GerenciamentoAssinaturaProps) {
  const {
    assinatura,
    faturas,
    historico,
    planos,
    carregando,
    erro,
    limparErro,
    alterarPlano,
    pausarAssinatura,
    cancelarAssinatura,
    reativarAssinatura,
    aplicarCupom,
    baixarFatura,
    imprimirFatura,
    recarregarAssinatura,
    recarregarFaturas,
    recarregarHistorico,
  } = useAssinaturas();

  return {
    // Estado
    assinatura: props.assinatura ?? assinatura,
    faturas: props.faturas ?? faturas,
    historico: props.historico ?? historico,
    planos: props.planos ?? planos,
    carregando: props.carregando ?? carregando,
    erro: props.erro ?? erro,
    // Ações
    aoTrocarPlano: props.aoTrocarPlano ?? alterarPlano,
    aoPausar: props.aoPausar ?? pausarAssinatura,
    aoCancelar: props.aoCancelar ?? cancelarAssinatura,
    aoReativar: props.aoReativar ?? reativarAssinatura,
    aoAplicarCupom: props.aoAplicarCupom ?? aplicarCupom,
    aoBaixarFatura: props.aoBaixarFatura ?? baixarFatura,
    aoImprimirFatura: props.aoImprimirFatura ?? imprimirFatura,
    limparErro,
    recarregarAssinatura,
    recarregarFaturas,
    recarregarHistorico,
  };
}

// ============================================
// HOOK PARA UPSELL CONTEXTUAL
// ============================================

export function useUpsellContextual() {
  const { assinatura, verificarLimite } = useAssinaturas();
  const [ultimaVerificacao, setUltimaVerificacao] = useState<VerificacaoLimite | null>(null);

  const verificarEAbrirUpsell = useCallback(async (
    recurso: 'barbeiros' | 'cadeiras' | 'agendamentosMes',
    quantidadeAtual: number,
    quantidadeNova?: number
  ) => {
    const resultado = await verificarLimite(recurso, quantidadeAtual, quantidadeNova);
    setUltimaVerificacao(resultado);
    return resultado;
  }, [verificarLimite]);

  const deveMostrarUpsell = ultimaVerificacao !== null && !ultimaVerificacao.permitido && !!ultimaVerificacao.planoSugerido;

  return {
    assinatura,
    ultimaVerificacao,
    verificarEAbrirUpsell,
    deveMostrarUpsell,
    planoSugerido: ultimaVerificacao?.planoSugerido,
    mensagemUpsell: ultimaVerificacao?.mensagemUpsell,
  };
}