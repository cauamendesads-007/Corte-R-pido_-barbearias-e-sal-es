/**
 * Hook useOnboarding - Gerencia estado do fluxo de onboarding.
 * AbortController para race conditions, sessionStorage para rascunho,
 * validação reward early/punish late.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getOnboardingService } from '../services';
import {
  validarEtapa,
  obterProximaEtapa,
  obterEtapaAnterior,
  calcularProgresso,
  salvarRascunho,
  carregarRascunho,
  limparRascunho,
  sanitizarDadosOnboarding,
  type OnboardingState,
  type OnboardingActions,
  type OnboardingDados,
  type OnboardingEtapa,
  type OnboardingRascunho,
} from '../types';

const DADOS_INICIAIS: Partial<OnboardingDados> = {
  tipoUsuario: null,
  nome: '',
  email: '',
  telefone: '',
  senha: '',
  confirmarSenha: '',
  dataNascimento: '',
  genero: undefined,
  cpf: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  notificacoesPush: true,
  notificacoesEmail: true,
  notificacoesSms: false,
  tema: 'sistema',
};

export function useOnboarding(): OnboardingState & OnboardingActions {
  const service = getOnboardingService();
  const abortRef = useRef<AbortController | null>(null);

  const [etapaAtual, setEtapaAtual] = useState<OnboardingEtapa>('boas-vindas');
  const [dados, setDados] = useState<Partial<OnboardingDados>>(DADOS_INICIAIS);
  const [erros, setErros] = useState<Partial<Record<keyof OnboardingDados, string>>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);
  const [rascunhoExiste, setRascunhoExiste] = useState(false);

  // Carrega rascunho ao montar
  useEffect(() => {
    const rascunho = carregarRascunho();
    if (rascunho) {
      setEtapaAtual(rascunho.etapaAtual);
      setDados(rascunho.dados);
      setRascunhoExiste(true);
    }
  }, []);

  // Salva rascunho automaticamente quando dados mudam
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const rascunho: OnboardingRascunho = {
        etapaAtual,
        dados,
        atualizadoEm: new Date().toISOString(),
        versao: 1,
      };
      salvarRascunho(rascunho);
      setRascunhoExiste(true);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [etapaAtual, dados]);

  const abortarAnterior = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  const avancar = useCallback(() => {
    const erro = validarEtapa(etapaAtual, dados);
    if (erro) {
      setErros((prev) => ({ ...prev, [Object.keys(CAMPOS_POR_ETAPA[etapaAtual])[0] || '']: erro }));
      setErro(erro);
      return;
    }

    const proxima = obterProximaEtapa(etapaAtual);
    if (proxima) {
      setEtapaAtual(proxima);
      setErro(null);
    }
  }, [etapaAtual, dados]);

  const voltar = useCallback(() => {
    const anterior = obterEtapaAnterior(etapaAtual);
    if (anterior) {
      setEtapaAtual(anterior);
      setErro(null);
    }
  }, [etapaAtual]);

  const irParaEtapa = useCallback((etapa: OnboardingEtapa) => {
    // Só permite ir para etapas anteriores ou a atual
    const indiceAtual = ETAPAS_ORDEM.indexOf(etapaAtual);
    const indiceAlvo = ETAPAS_ORDEM.indexOf(etapa);
    if (indiceAlvo <= indiceAtual + 1) {
      setEtapaAtual(etapa);
      setErro(null);
    }
  }, [etapaAtual]);

  const atualizarDado = useCallback(<K extends keyof OnboardingDados>(campo: K, valor: OnboardingDados[K]) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));

    // Reward early: limpa erro ao digitar se já foi tocado
    if (touched[campo as string]) {
      const erro = validarCampoIndividual(campo as string, valor, { ...dados, [campo]: valor });
      setErros((prev) => ({ ...prev, [campo]: erro }));
    }
  }, [dados, touched]);

  const validarCampoIndividual = (campo: string, valor: any, todosDados: Partial<OnboardingDados>): string | null => {
    // Validação simplificada para feedback imediato
    switch (campo) {
      case 'nome':
        if (!valor?.trim()) return 'Nome é obrigatório';
        if (valor.trim().length < 2) return 'Nome muito curto';
        break;
      case 'email':
        if (!valor?.trim()) return 'E-mail é obrigatório';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return 'E-mail inválido';
        break;
      case 'telefone':
        if (valor && !/^\d{10,11}$/.test(valor.replace(/\D/g, ''))) return 'Telefone inválido';
        break;
      case 'senha':
        if (valor && valor.length < 8) return 'Mínimo 8 caracteres';
        break;
      case 'confirmarSenha':
        if (valor && valor !== todosDados.senha) return 'Senhas não conferem';
        break;
      case 'cpf':
        if (valor && valor.replace(/\D/g, '').length !== 11) return 'CPF inválido';
        break;
      case 'cep':
        if (valor && !/^\d{8}$/.test(valor.replace(/\D/g, ''))) return 'CEP inválido';
        break;
    }
    return null;
  };

  const marcarTouched = useCallback((campo: string) => {
    setTouched((prev) => ({ ...prev, [campo]: true }));
    // Valida ao sair do campo (blur)
    const erro = validarCampoIndividual(campo, dados[campo as keyof OnboardingDados], dados);
    setErros((prev) => ({ ...prev, [campo]: erro }));
  }, [dados]);

  const validarEtapaAtual = useCallback((): boolean => {
    const erro = validarEtapa(etapaAtual, dados);
    if (erro) {
      setErro(erro);
      return false;
    }
    setErro(null);
    return true;
  }, [etapaAtual, dados]);

  const salvarRascunhoManual = useCallback(() => {
    const rascunho: OnboardingRascunho = {
      etapaAtual,
      dados,
      atualizadoEm: new Date().toISOString(),
      versao: 1,
    };
    salvarRascunho(rascunho);
  }, [etapaAtual, dados]);

  const carregarRascunhoManual = useCallback((): boolean => {
    const rascunho = carregarRascunho();
    if (rascunho) {
      setEtapaAtual(rascunho.etapaAtual);
      setDados(rascunho.dados);
      setRascunhoExiste(true);
      return true;
    }
    return false;
  }, []);

  const limparRascunhoManual = useCallback(() => {
    limparRascunho();
    setRascunhoExiste(false);
    setEtapaAtual('boas-vindas');
    setDados(DADOS_INICIAIS);
    setErros({});
    setTouched({});
  }, []);

  const concluir = useCallback(async () => {
    // Valida todas as etapas obrigatórias
    const etapasObrigatorias: OnboardingEtapa[] = ['tipo-usuario', 'dados-pessoais', 'endereco', 'preferencias'];
    for (const etapa of etapasObrigatorias) {
      const erro = validarEtapa(etapa, dados);
      if (erro) {
        setErro(`Etapa ${etapa}: ${erro}`);
        return;
      }
    }

    setCarregando(true);
    setErro(null);

    try {
      const signal = abortarAnterior();
      const dadosSanitizados = sanitizarDadosOnboarding(dados) as OnboardingDados;
      const resposta = await service.concluir(dadosSanitizados, signal);

      if (!resposta.sucesso) throw new Error(resposta.erro);

      setConcluido(true);
      limparRascunho();
      setRascunhoExiste(false);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao concluir onboarding');
    } finally {
      setCarregando(false);
    }
  }, [dados, service, abortarAnterior]);

  // Cleanup
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    etapaAtual,
    dados,
    erros,
    touched,
    carregando,
    erro,
    concluido,
    rascunhoExiste,
    avancar,
    voltar,
    irParaEtapa,
    atualizarDado,
    validarEtapaAtual,
    marcarTouched,
    salvarRascunho: salvarRascunhoManual,
    carregarRascunho: carregarRascunhoManual,
    limparRascunho: limparRascunhoManual,
    concluir,
    limparErro,
  };
}

// Need to import ETAPAS_ORDEM and CAMPOS_POR_ETAPA
import { ETAPAS_ORDEM, CAMPOS_POR_ETAPA } from '../rules';

export default useOnboarding;