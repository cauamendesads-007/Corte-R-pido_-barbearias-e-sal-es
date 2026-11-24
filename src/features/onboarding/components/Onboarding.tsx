/**
 * Onboarding Guiado do Estabelecimento - Componente Principal.
 * Wizard multi-etapas para configuração inicial completa.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Suspense, lazy } from 'react';
import { OnboardingProvider, useOnboarding, useOnboardingService } from '../hooks/useOnboarding';
import { OnboardingServiceMock } from '../services/OnboardingServiceMock';
import { IndicadorProgresso } from './IndicadorProgresso';
import { Icone } from '@/componentes';
import { ETAPAS_ORDEM } from '../types';
import './Onboarding.css';

// Lazy load para code splitting
const EtapaBoasVindasLazy = lazy(() => import('./EtapaBoasVindas').then((m) => ({ default: m.EtapaBoasVindas })));
const EtapaDadosBasicosLazy = lazy(() => import('./EtapaDadosBasicos').then((m) => ({ default: m.EtapaDadosBasicos })));
const EtapaLocalizacaoContatoLazy = lazy(() => import('./EtapaLocalizacaoContato').then((m) => ({ default: m.EtapaLocalizacaoContato })));
const EtapaServicosPrecosLazy = lazy(() => import('./EtapaServicosPrecos').then((m) => ({ default: m.EtapaServicosPrecos })));
const EtapaTemaAparenciaLazy = lazy(() => import('./EtapaTemaAparencia').then((m) => ({ default: m.EtapaTemaAparencia })));
const EtapaPagamentosPixLazy = lazy(() => import('./EtapaPagamentosPix').then((m) => ({ default: m.EtapaPagamentosPix })));
const EtapaConfirmacaoLazy = lazy(() => import('./EtapaConfirmacao').then((m) => ({ default: m.EtapaConfirmacao })));

interface OnboardingContentProps {
  aoConcluir?: (estabelecimentoId: string) => void;
}

const OnboardingContent: React.FC<OnboardingContentProps> = ({ aoConcluir }) => {
  const {
    etapaAtual,
    concluido,
    dados,
    avancar,
    voltar,
    irParaEtapa,
    validarEtapaAtual,
    carregando,
  } = useOnboarding();

  const { estabelecimentoId } = dados;

  // Verificar se pode avançar (validação da etapa atual)
  const podeAvancar = useCallback(() => {
    return validarEtapaAtual();
  }, [validarEtapaAtual]);

  const handleAvancar = useCallback(() => {
    if (podeAvancar()) {
      avancar();
    }
  }, [podeAvancar, avancar]);

  const handleVoltar = useCallback(() => {
    voltar();
  }, [voltar]);

  const handleIrParaEtapa = useCallback((etapa: string) => {
    const indiceAtual = ETAPAS_ORDEM.indexOf(etapaAtual);
    const indiceAlvo = ETAPAS_ORDEM.indexOf(etapa as typeof ETAPAS_ORDEM[number]);
    // Permite voltar para etapas anteriores ou ir para a próxima se válida
    if (indiceAlvo <= indiceAtual || (indiceAlvo === indiceAtual + 1 && podeAvancar())) {
      irParaEtapa(etapa as typeof ETAPAS_ORDEM[number]);
    }
  }, [etapaAtual, podeAvancar, irParaEtapa]);

  const renderEtapa = () => {
    const propsBase = {
      aoAvancar: handleAvancar,
      aoVoltar: handleVoltar,
      desabilitado: carregando,
    };

    switch (etapaAtual) {
      case 'boas-vindas':
        return <EtapaBoasVindasLazy {...propsBase} />;
      case 'dados-basicos':
        return <EtapaDadosBasicosLazy {...propsBase} />;
      case 'localizacao-contato':
        return <EtapaLocalizacaoContatoLazy {...propsBase} />;
      case 'servicos-precos':
        return <EtapaServicosPrecosLazy {...propsBase} />;
      case 'tema-aparencia':
        return <EtapaTemaAparenciaLazy {...propsBase} />;
      case 'pagamentos-pix':
        return <EtapaPagamentosPixLazy {...propsBase} />;
      case 'confirmacao':
        return (
          <EtapaConfirmacaoLazy
            {...propsBase}
            concluido={concluido}
            aoAvancar={() => {
              if (concluido && estabelecimentoId && aoConcluir) {
                aoConcluir(estabelecimentoId);
              } else {
                handleAvancar();
              }
            }}
          />
        );
      default:
        return <EtapaBoasVindasLazy {...propsBase} />;
    }
  };

  return (
    <div className="onboarding" role="main">
      <IndicadorProgresso />

      <main className="onboarding__conteudo-principal">
        <Suspense fallback={<div className="onboarding__carregando" role="status" aria-label="Carregando etapa">Carregando...</div>}>
          {renderEtapa()}
        </Suspense>
      </main>

      {/* Navegação rápida (desktop) */}
      <nav className="onboarding__navegacao-rapida" aria-label="Navegação rápida entre etapas">
        <ul>
          {ETAPAS_ORDEM.map((etapa: typeof ETAPAS_ORDEM[number], index: number) => (
            <li key={etapa}>
              <button
                type="button"
                className={`onboarding__nav-rapida-item ${etapa === etapaAtual ? 'atual' : index < ETAPAS_ORDEM.indexOf(etapaAtual) ? 'concluida' : ''}`}
                onClick={() => handleIrParaEtapa(etapa)}
                disabled={index > ETAPAS_ORDEM.indexOf(etapaAtual) + 1 || carregando}
                aria-current={etapa === etapaAtual ? 'step' : undefined}
              >
                {index + 1}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

// Componente wrapper que verifica se onboarding já foi concluído
const OnboardingWrapper: React.FC<OnboardingContentProps> = ({ aoConcluir }) => {
  const service = new OnboardingServiceMock();
  const { concluido: onboardingConcluido, carregando: verificando } = useOnboardingService(service);
  const [jaConcluido, setJaConcluido] = useState(false);

  useEffect(() => {
    if (!verificando && onboardingConcluido) {
      setJaConcluido(true);
    }
  }, [verificando, onboardingConcluido]);

  if (verificando) {
    return (
      <div className="onboarding onboarding--verificando" role="status" aria-label="Verificando status do cadastro">
        <div className="onboarding__spinner" aria-hidden="true" />
        <p>Verificando seu cadastro...</p>
      </div>
    );
  }

  if (jaConcluido) {
    return (
      <div className="onboarding onboarding--ja-concluido" role="status">
        <div className="onboarding__sucesso-icone" aria-hidden="true">
          <Icone nome="verificarCirculo" tamanho={64} strokeWidth={1.5} />
        </div>
        <h2>Cadastro Já Concluído</h2>
        <p>Você já configurou seu estabelecimento anteriormente.</p>
        <button
          type="button"
          className="botao botao--primario"
          onClick={() => window.location.href = '/painel'}
        >
          Ir para o Painel
        </button>
      </div>
    );
  }

  return (
    <OnboardingProvider service={service}>
      <OnboardingContent aoConcluir={aoConcluir} />
    </OnboardingProvider>
  );
};

// Componente principal exportado
export const Onboarding: React.FC<OnboardingContentProps> = ({ aoConcluir }) => {
  return <OnboardingWrapper aoConcluir={aoConcluir} />;
};

export default Onboarding;