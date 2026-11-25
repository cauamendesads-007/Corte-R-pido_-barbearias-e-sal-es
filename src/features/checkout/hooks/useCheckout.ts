/**
 * Hooks do domínio Checkout - Estado, Otimista UI, AbortController.
 * Idempotência, race condition prevention, LGPD-ready.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type {
  MetodoPagamento,
  ItemCheckout,
  DadosPagamentoPix,
  DadosPagamentoCartao,
  DadosPagamentoBoleto,
  CheckoutSession,
  ResumoCheckout,
  ValidacaoCartao,
  StickySummaryProps,
} from '../types';
import { ICheckoutService, getCheckoutService } from '../services';
import { calcularTotaisCheckout, formatarMoeda, identificarBandeira } from '../rules';

// ============================================
// TIPOS INTERNOS
// ============================================

interface UseCheckoutState {
  sessao: CheckoutSession | null;
  resumo: ResumoCheckout | null;
  metodoSelecionado: MetodoPagamento;
  carregando: boolean;
  erro: string | null;
  pixDados: DadosPagamentoPix | null;
  pixTempoRestante: number;
  cartaoValidacao: ValidacaoCartao | null;
  boletoDados: DadosPagamentoBoleto | null;
}

interface UseCheckoutActions {
  // Sessão
  iniciarCheckout: (_itens: ItemCheckout[], _metodo: MetodoPagamento, _desconto?: number) => Promise<CheckoutSession>;
  trocarMetodo: (_metodo: MetodoPagamento) => void;

  // Pix
  gerarPix: (_chavePix: string) => Promise<DadosPagamentoPix>;
  copiarPixCopiaCola: () => Promise<void>;
  iniciarContagemRegressivaPix: () => void;
  pararContagemRegressivaPix: () => void;

  // Cartão
  validarCartao: (_dados: Partial<DadosPagamentoCartao>) => Promise<ValidacaoCartao>;
  pagarCartao: (_dados: DadosPagamentoCartao) => Promise<{ autorizado: boolean; transacaoId?: string; erro?: string }>;

  // Boleto
  gerarBoleto: () => Promise<DadosPagamentoBoleto>;

  // Idempotência
  gerarChaveIdempotencia: (_acao: string, _entidadeId: string) => string;
  validarChaveIdempotencia: (_chave: string, _acao: string, _entidadeId: string) => Promise<{ valido: boolean; erro?: string }>;

  // Utilitários
  limparErro: () => void;
  resetar: () => void;
}

type UseCheckoutReturn = UseCheckoutState & UseCheckoutActions;

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useCheckout(): UseCheckoutReturn {
  const serviceRef = useRef<ICheckoutService>(getCheckoutService());
  const abortRef = useRef<AbortController | null>(null);
  const contagemPixRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<UseCheckoutState>({
    sessao: null,
    resumo: null,
    metodoSelecionado: 'pix',
    carregando: false,
    erro: null,
    pixDados: null,
    pixTempoRestante: 0,
    cartaoValidacao: null,
    boletoDados: null,
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
    if (contagemPixRef.current) {
      clearInterval(contagemPixRef.current);
      contagemPixRef.current = null;
    }
    setState({
      sessao: null,
      resumo: null,
      metodoSelecionado: 'pix',
      carregando: false,
      erro: null,
      pixDados: null,
      pixTempoRestante: 0,
      cartaoValidacao: null,
      boletoDados: null,
    });
  }, []);

  // ============================================
  // EXECUÇÃO COM ABORT
  // ============================================

  async function executarComAbort<T>(
    fn: (_signal: AbortSignal) => Promise<T>,
    opcoes?: { carregando?: boolean; erroMsg?: string }
  ): Promise<T | null> {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    if (opcoes?.carregando !== false) setCarregando(true);
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
  // SESSÃO DE CHECKOUT
  // ============================================

  const iniciarCheckout = useCallback(async (
    itens: ItemCheckout[],
    metodo: MetodoPagamento,
    desconto: number = 0
  ) => {
    return executarComAbort(
      async () => {
        const sessao = await serviceRef.current.criarSessao(itens, metodo, desconto);

        const { subtotal, total } = calcularTotaisCheckout(itens, desconto);
        const resumo: ResumoCheckout = {
          itens,
          subtotal,
          desconto,
          total,
          formatoMoeda: formatarMoeda,
        };

        setState(prev => ({
          ...prev,
          sessao,
          resumo,
          metodoSelecionado: metodo,
          erro: null,
        }));

        return sessao;
      },
      { erroMsg: 'Falha ao iniciar checkout' }
    ) as Promise<CheckoutSession>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trocarMetodo = useCallback((metodo: MetodoPagamento) => {
    setState(prev => ({ ...prev, metodoSelecionado: metodo, erro: null }));

    // Se tinha sessão, criar nova com novo método
    if (state.sessao && state.resumo) {
      iniciarCheckout(state.resumo.itens, metodo, state.resumo.desconto);
    }
  }, [state.sessao, state.resumo, iniciarCheckout]);

  // ============================================
  // PIX
  // ============================================

  const gerarPix = useCallback(async (chavePix: string) => {
    if (!state.sessao) throw new Error('Nenhuma sessão de checkout ativa');

    return executarComAbort(
      async () => {
        const dados = await serviceRef.current.processarPix(state.sessao!.id, chavePix);

        setState(prev => ({
          ...prev,
          pixDados: dados,
          pixTempoRestante: 30 * 60, // 30 minutos em segundos
        }));

        // Iniciar contagem regressiva
        iniciarContagemRegressivaPix();

        return dados;
      },
      { erroMsg: 'Falha ao gerar QR Code Pix' }
    ) as Promise<DadosPagamentoPix>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessao]);

  const copiarPixCopiaCola = useCallback(async () => {
    if (!state.pixDados) return;

    try {
      await navigator.clipboard.writeText(state.pixDados.qrCode);
      // Feedback visual seria via toast
    } catch {
      // Fallback para seleção
      const textarea = document.createElement('textarea');
      textarea.value = state.pixDados.qrCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, [state.pixDados]);

  const iniciarContagemRegressivaPix = useCallback(() => {
    if (contagemPixRef.current) {
      clearInterval(contagemPixRef.current);
    }

    contagemPixRef.current = setInterval(() => {
      setState(prev => {
        const novoTempo = prev.pixTempoRestante - 1;
        if (novoTempo <= 0) {
          if (contagemPixRef.current) {
            clearInterval(contagemPixRef.current);
            contagemPixRef.current = null;
          }
          return { ...prev, pixTempoRestante: 0 };
        }
        return { ...prev, pixTempoRestante: novoTempo };
      });
    }, 1000);
  }, []);

  const pararContagemRegressivaPix = useCallback(() => {
    if (contagemPixRef.current) {
      clearInterval(contagemPixRef.current);
      contagemPixRef.current = null;
    }
  }, []);

  // ============================================
  // CARTÃO
  // ============================================

  const validarCartao = useCallback(async (dados: Partial<DadosPagamentoCartao>) => {
    return executarComAbort(
      async () => {
        const validacao = await serviceRef.current.validarCartao(dados);
        setState(prev => ({ ...prev, cartaoValidacao: validacao }));
        return validacao;
      },
      { carregando: false, erroMsg: 'Falha ao validar cartão' }
    ) as Promise<ValidacaoCartao>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pagarCartao = useCallback(async (dados: DadosPagamentoCartao) => {
    if (!state.sessao) throw new Error('Nenhuma sessão de checkout ativa');

    // Validar antes de enviar
    const validacao = await serviceRef.current.validarCartao(dados);
    if (!validacao.valido) {
      throw new Error(validacao.erros.join('; '));
    }

    return executarComAbort(
      async () => {
        const resultado = await serviceRef.current.processarCartao(state.sessao!.id, dados);

        if (resultado.autorizado) {
          setState(prev => ({ ...prev, sessao: prev.sessao ? { ...prev.sessao, status: 'aprovado' } : null }));
        } else {
          setState(prev => ({ ...prev, sessao: prev.sessao ? { ...prev.sessao, status: 'recusado' } : null }));
        }

        return resultado;
      },
      { erroMsg: 'Falha ao processar pagamento' }
    ) as Promise<{ autorizado: boolean; transacaoId?: string; erro?: string }>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessao]);

  // ============================================
  // BOLETO
  // ============================================

  const gerarBoleto = useCallback(async () => {
    if (!state.sessao) throw new Error('Nenhuma sessão de checkout ativa');

    return executarComAbort(
      async () => {
        const dados = await serviceRef.current.processarBoleto(state.sessao!.id);
        setState(prev => ({ ...prev, boletoDados: dados }));
        return dados;
      },
      { erroMsg: 'Falha ao gerar boleto' }
    ) as Promise<DadosPagamentoBoleto>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessao]);

  // ============================================
  // IDEMPOTÊNCIA
  // ============================================

  const gerarChaveIdempotencia = useCallback((acao: string, entidadeId: string) => {
    return serviceRef.current.gerarChaveIdempotencia(acao, entidadeId);
  }, []);

  const validarChaveIdempotencia = useCallback(async (chave: string, acao: string, entidadeId: string) => {
    return executarComAbort(
      async () => {
        return serviceRef.current.validarChaveIdempotencia(chave, acao, entidadeId);
      },
      { carregando: false }
    ) as Promise<{ valido: boolean; erro?: string }>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // CLEANUP
  // ============================================

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (contagemPixRef.current) clearInterval(contagemPixRef.current);
    };
  }, []);

  // ============================================
  // RETORNO
  // ============================================

  return {
    // Estado
    ...state,
    // Ações
    iniciarCheckout,
    trocarMetodo,
    gerarPix,
    copiarPixCopiaCola,
    iniciarContagemRegressivaPix,
    pararContagemRegressivaPix,
    validarCartao,
    pagarCartao,
    gerarBoleto,
    gerarChaveIdempotencia,
    validarChaveIdempotencia,
    limparErro,
    resetar,
  };
}

// ============================================
// HOOK ESPECIALIZADO PARA RESUMO STICKY
// ============================================

export function useStickySummary(props: StickySummaryProps) {
  const {
    resumo,
    metodoSelecionado,
    carregando,
    aoPagar,
    desabilitado,
    aoSelecionarMetodo,
  } = props;

  const [visivel, setVisivel] = useState(true);
  const [posicaoScroll, setPosicaoScroll] = useState(0);

  // Detectar scroll para mostrar/ocultar sticky
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setPosicaoScroll(scrollY);
      // Mostrar sticky após rolar 200px
      setVisivel(scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const parcelas = useMemo(() => {
    if (!resumo) return [];
    return resumo.total > 0
      ? serviceRef.current?.calcularParcelas?.(resumo.total) ?? []
      : [];
  }, [resumo]);

  // Service ref para acessar calcularParcelas
  const serviceRef = useRef(getCheckoutService());

  return {
    resumo,
    metodoSelecionado,
    carregando,
    desabilitado: desabilitado || !resumo || resumo.total <= 0,
    visivel,
    posicaoScroll,
    parcelas,
    aoSelecionarMetodo,
    aoPagar,
  };
}

// ============================================
// HOOK PARA FORMULÁRIO DE CARTÃO
// ============================================

export function useCartaoForm() {
  const [numero, setNumero] = useState('');
  const [nomeTitular, setNomeTitular] = useState('');
  const [validade, setValidade] = useState('');
  const [cvv, setCvv] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [salvarCartao, setSalvarCartao] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [bandeira, setBandeira] = useState<'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'desconhecida'>('desconhecida');

  const { validarCartao, pagarCartao } = useCheckout();

  const handleNumeroChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '');
    setNumero(valor);
    setBandeira(identificarBandeira(valor) as 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'desconhecida');
    // Limpar erro ao digitar
    setErros(prev => ({ ...prev, numero: '' }));
  }, []);

  const handleValidadeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '');
    if (valor.length >= 2) {
      setValidade(`${valor.slice(0, 2)}/${valor.slice(2, 4)}`);
    } else {
      setValidade(valor);
    }
    setErros(prev => ({ ...prev, validade: '' }));
  }, []);

  const handleCvvChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvv(valor);
    setErros(prev => ({ ...prev, cvv: '' }));
  }, []);

  const handleNomeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNomeTitular(e.target.value);
    setErros(prev => ({ ...prev, nomeTitular: '' }));
  }, []);

  const validarCampo = useCallback(async (campo: string, valor: string) => {
    const validacao = await validarCartao({
      numero: campo === 'numero' ? valor : numero,
      nomeTitular: campo === 'nomeTitular' ? valor : nomeTitular,
      validade: campo === 'validade' ? valor : validade,
      cvv: campo === 'cvv' ? valor : cvv,
    });

    if (!validacao.valido) {
      const erroCampo = validacao.erros.find(e =>
        e.toLowerCase().includes(campo.toLowerCase()) ||
        (campo === 'numero' && e.includes('Número')) ||
        (campo === 'validade' && e.includes('Validade')) ||
        (campo === 'cvv' && e.includes('CVV')) ||
        (campo === 'nomeTitular' && e.includes('Nome'))
      );
      if (erroCampo) setErros(prev => ({ ...prev, [campo]: erroCampo }));
    }
  }, [numero, nomeTitular, validade, cvv, validarCartao]);

  const handleBlur = useCallback((campo: string, valor: string) => {
    validarCampo(campo, valor);
  }, [validarCampo]);

  const dadosCartao: DadosPagamentoCartao = {
    numero,
    nomeTitular,
    validade,
    cvv,
    bandeira,
    parcelas,
    salvarCartao,
  };

  const valido = useMemo(() => {
    return numero.replace(/\D/g, '').length >= 13 &&
      nomeTitular.trim().length >= 3 &&
      validade.replace(/\D/g, '').length === 4 &&
      cvv.replace(/\D/g, '').length >= 3;
  }, [numero, nomeTitular, validade, cvv]);

  return {
    // Estado
    numero,
    nomeTitular,
    validade,
    cvv,
    parcelas,
    salvarCartao,
    bandeira,
    erros,
    valido,
    // Setters
    setNumero: handleNumeroChange,
    setNomeTitular: handleNomeChange,
    setValidade: handleValidadeChange,
    setCvv: handleCvvChange,
    setParcelas,
    setSalvarCartao,
    // Handlers
    handleBlur,
    // Ações
    validarCartao,
    pagarCartao,
    dadosCartao,
  };
}

// Import identificarBandeira para uso no hook
import { identificarBandeira } from '../rules';