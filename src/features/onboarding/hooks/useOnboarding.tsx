/**
 * Hook para gerenciar estado e lógica do Onboarding Guiado.
 * Implementa padrão DIP via context + service injection.
 */

import { useState, useCallback, useEffect, useContext, createContext, ReactNode } from 'react';
import type { IOnboardingService } from '../services/IOnboardingService';
import type { OnboardingContextType, DadosOnboarding, EtapaOnboarding, OnboardingState } from '../types';
import { DADOS_INICIAIS, ETAPAS_ORDEM } from '../types';

interface OnboardingProviderProps {
  children: ReactNode;
  service: IOnboardingService;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const OnboardingProvider = ({ children, service }: OnboardingProviderProps) => {
  const [state, setState] = useState<OnboardingState>({
    dados: DADOS_INICIAIS,
    etapaAtual: 'boas-vindas',
    erros: {},
    carregando: false,
    concluido: false,
  });

  // Carregar progresso salvo ao inicializar
  useEffect(() => {
    const carregarProgresso = async () => {
      setState((prev) => ({ ...prev, carregando: true }));
      const resultado = await service.obterProgresso();
      if (resultado.sucesso && resultado.dados) {
        setState((prev) => ({
          ...prev,
          dados: resultado.dados!,
          etapaAtual: resultado.dados!.etapaAtual,
          carregando: false,
        }));
      } else {
        setState((prev) => ({ ...prev, carregando: false }));
      }
    };
    carregarProgresso();
  }, [service]);

  // Salvar progresso automaticamente quando dados mudam (debounced)
  useEffect(() => {
    if (state.carregando) return;

    const timeoutId = setTimeout(async () => {
      await service.salvarProgresso(state.dados);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state.dados, service]);

  const atualizarDados = useCallback((novosDados: Partial<DadosOnboarding>) => {
    setState((prev) => ({
      ...prev,
      dados: { ...prev.dados, ...novosDados },
      erros: {}, // Limpar erros ao atualizar
    }));
  }, []);

  const validarEtapaAtual = useCallback((): boolean => {
    const { dados, etapaAtual } = state;
    const erros: Record<string, string> = {};

    switch (etapaAtual) {
      case 'dados-basicos':
        if (!dados.nome?.trim()) erros.nome = 'Nome é obrigatório';
        if (!dados.responsavel?.trim()) erros.responsavel = 'Responsável é obrigatório';
        if (!dados.sobre?.trim()) erros.sobre = 'Descrição é obrigatória';
        break;

      case 'localizacao-contato':
        if (!dados.endereco?.trim()) erros.endereco = 'Endereço é obrigatório';
        if (!dados.cidade?.trim()) erros.cidade = 'Cidade é obrigatória';
        if (!dados.whatsapp?.trim()) erros.whatsapp = 'WhatsApp é obrigatório';
        // Validar formato WhatsApp básico
        if (dados.whatsapp && !/^\+?\d{10,15}$/.test(dados.whatsapp.replace(/\D/g, ''))) {
          erros.whatsapp = 'WhatsApp inválido (apenas números, com DDD)';
        }
        if (!dados.horarioFuncionamento?.trim()) erros.horarioFuncionamento = 'Horário é obrigatório';
        break;

      case 'servicos-precos':
        if (dados.servicos.length === 0) erros.servicos = 'Adicione pelo menos um serviço';
        dados.servicos.forEach((s, i) => {
          if (!s.nome?.trim()) erros[`servico-${i}-nome`] = 'Nome do serviço é obrigatório';
          if (!s.preco || s.preco <= 0) erros[`servico-${i}-preco`] = 'Preço deve ser maior que zero';
          if (!s.duracaoMinutos || s.duracaoMinutos <= 0) erros[`servico-${i}-duracao`] = 'Duração deve ser maior que zero';
        });
        break;

      case 'pagamentos-pix':
        if (dados.configuracaoPix.modo !== 'desativado') {
          if (!dados.configuracaoPix.chave?.trim()) erros.configuracaoPix = 'Chave Pix é obrigatória';
          if (!dados.configuracaoPix.percentualSinal || dados.configuracaoPix.percentualSinal < 10 || dados.configuracaoPix.percentualSinal > 100) {
            erros.configuracaoPix = 'Percentual deve ser entre 10% e 100%';
          }
        }
        break;
    }

    setState((prev) => ({ ...prev, erros }));
    return Object.keys(erros).length === 0;
  }, [state]);

  const avancar = useCallback(() => {
    if (!validarEtapaAtual()) return;

    setState((prev) => {
      const indiceAtual = ETAPAS_ORDEM.indexOf(prev.etapaAtual);
      if (indiceAtual < ETAPAS_ORDEM.length - 1) {
        const proximaEtapa = ETAPAS_ORDEM[indiceAtual + 1];
        return {
          ...prev,
          etapaAtual: proximaEtapa,
          dados: { ...prev.dados, etapaAtual: proximaEtapa },
        };
      }
      return prev;
    });
  }, [validarEtapaAtual]);

  const voltar = useCallback(() => {
    setState((prev) => {
      const indiceAtual = ETAPAS_ORDEM.indexOf(prev.etapaAtual);
      if (indiceAtual > 0) {
        const etapaAnterior = ETAPAS_ORDEM[indiceAtual - 1];
        return {
          ...prev,
          etapaAtual: etapaAnterior,
          dados: { ...prev.dados, etapaAtual: etapaAnterior },
        };
      }
      return prev;
    });
  }, []);

  const irParaEtapa = useCallback((etapa: EtapaOnboarding) => {
    // Só permite ir para etapas anteriores ou a atual (não pular validações)
    const indiceAtual = ETAPAS_ORDEM.indexOf(state.etapaAtual);
    const indiceAlvo = ETAPAS_ORDEM.indexOf(etapa);
    if (indiceAlvo <= indiceAtual + 1) {
      setState((prev) => ({
        ...prev,
        etapaAtual: etapa,
        dados: { ...prev.dados, etapaAtual: etapa },
      }));
    }
  }, [state.etapaAtual]);

  const concluir = useCallback(async () => {
    if (!validarEtapaAtual()) return;

    setState((prev) => ({ ...prev, carregando: true }));

    const resultado = await service.finalizarOnboarding(state.dados);

    if (resultado.sucesso) {
      setState((prev) => ({
        ...prev,
        concluido: true,
        carregando: false,
        dados: { ...prev.dados, estabelecimentoId: resultado.dados!.id, concluido: true },
      }));
    } else {
      setState((prev) => ({
        ...prev,
        carregando: false,
        erros: { ...prev.erros, submit: resultado.erro || 'Erro ao finalizar cadastro' },
      }));
    }
  }, [state.dados, service, validarEtapaAtual]);

  const resetar = useCallback(async () => {
    await service.limparProgresso();
    setState({
      dados: DADOS_INICIAIS,
      etapaAtual: 'boas-vindas',
      erros: {},
      carregando: false,
      concluido: false,
    });
  }, [service]);

  const contextValue: OnboardingContextType = {
    ...state,
    avancar,
    voltar,
    irParaEtapa,
    atualizarDados,
    validarEtapaAtual,
    concluir,
    resetar,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding deve ser usado dentro de OnboardingProvider');
  }
  return context;
};

// Hook para usar serviço de onboarding fora do provider (ex: verificação inicial)
export const useOnboardingService = (service: IOnboardingService) => {
  const [concluido, setConcluido] = useState<boolean | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const verificar = async () => {
      const resultado = await service.verificarConcluido();
      if (resultado.sucesso) {
        setConcluido(resultado.dados ?? false);
      }
      setCarregando(false);
    };
    verificar();
  }, [service]);

  return { concluido, carregando };
};