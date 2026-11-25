/**
 * Componente Onboarding - Fluxo multi-etapas principal.
 * Orquestra todas as etapas, gerencia progresso e navegação.
 */

import { useCallback, useMemo } from 'react';
import {
  Cartao,
  CartaoCorpo,
  Progresso,
  BotaoPrimario,
  Alerta,
} from '@/componentes';
import { useOnboarding } from '../hooks';
import { EtapaBoasVindas } from './EtapaBoasVindas';
import { EtapaTipoUsuario } from './EtapaTipoUsuario';
import { EtapaDadosPessoais } from './EtapaDadosPessoais';
import { EtapaEndereco } from './EtapaEndereco';
import { EtapaPreferencias } from './EtapaPreferencias';
import { EtapaConclusao } from './EtapaConclusao';
import {
  ORDEM_ETAPAS,
  calcularProgresso,
  type OnboardingEtapa,
  type OnboardingDados,
} from '../types';
import './Onboarding.css';

interface OnboardingProps {
  /** Callback ao concluir onboarding com sucesso */
  aoConcluir?: () => void;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const Onboarding = ({
  aoConcluir,
  className = '',
  'data-testid': testId,
}: OnboardingProps) => {
  const {
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
    marcarTouched,
    concluir,
    limparErro,
  } = useOnboarding();

  const progresso = useMemo(() => calcularProgresso(etapaAtual), [etapaAtual]);
  const indiceEtapa = useMemo(() => ORDEM_ETAPAS.indexOf(etapaAtual), [etapaAtual]);
  const totalEtapas = ORDEM_ETAPAS.length;
  const ehPrimeiraEtapa = indiceEtapa === 0;
  const ehUltimaEtapa = indiceEtapa === totalEtapas - 1 || concluido;

  const handleAvancar = useCallback(() => {
    if (ehUltimaEtapa && !concluido) {
      concluir();
    } else {
      avancar();
    }
  }, [avancar, concluir, ehUltimaEtapa, concluido]);

  const handleVoltar = useCallback(() => {
    if (!ehPrimeiraEtapa) {
      voltar();
    }
  }, [voltar, ehPrimeiraEtapa]);

  const renderEtapa = () => {
    const propsComuns = {
      carregando,
      aoAvancar: handleAvancar,
      aoVoltar: handleVoltar,
    };

    switch (etapaAtual) {
      case 'boas-vindas':
        return <EtapaBoasVindas {...propsComuns} aoContinuar={handleAvancar} key="boas-vindas" />;

      case 'tipo-usuario':
        return (
          <EtapaTipoUsuario
            {...propsComuns}
            tipoSelecionado={dados.tipoUsuario as 'cliente' | 'barbeiro' | null}
            aoSelecionar={(tipo) => atualizarDado('tipoUsuario', tipo)}
            key="tipo-usuario"
          />
        );

      case 'dados-pessoais':
        return (
          <EtapaDadosPessoais
            {...propsComuns}
            dados={dados}
            aoAlterar={atualizarDado}
            erros={erros}
            touched={touched}
            aoBlur={marcarTouched}
            key="dados-pessoais"
          />
        );

      case 'endereco':
        return (
          <EtapaEndereco
            {...propsComuns}
            dados={dados}
            aoAlterar={atualizarDado}
            erros={erros}
            touched={touched}
            aoBlur={marcarTouched}
            key="endereco"
          />
        );

      case 'preferencias':
        return (
          <EtapaPreferencias
            {...propsComuns}
            dados={dados}
            aoAlterar={atualizarDado}
            aoConcluir={handleAvancar}
            key="preferencias"
          />
        );

      case 'conclusao':
        return <EtapaConclusao {...propsComuns} aoEntrar={aoConcluir} key="conclusao" />;

      default:
        return null;
    }
  };

  if (concluido) {
    return (
      <EtapaConclusao
        aoEntrar={aoConcluir}
        carregando={carregando}
        data-testid="etapa-conclusao-final"
      />
    );
  }

  return (
    <Cartao className={`onboarding ${className}`} data-testid={testId}>
      {/* Progresso */}
      <div className="onboarding__progresso" role="progressbar" aria-valuenow={progresso} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso do cadastro: ${progresso}%`}>
        <Progresso
          valor={progresso}
          max={100}
          mostrarRotulo={false}
          altura={4}
          className="onboarding__barra-progresso"
          data-testid="progresso-onboarding"
        />
        <div className="onboarding__progresso-labels">
          {ORDEM_ETAPAS.map((etapa, i) => (
            <span
              key={etapa}
              className={`onboarding__etapa-label ${i <= indiceEtapa ? 'ativa' : ''} ${i === indiceEtapa ? 'atual' : ''}`}
            >
              {etapa === 'boas-vindas' && 'Início'}
              {etapa === 'tipo-usuario' && 'Tipo'}
              {etapa === 'dados-pessoais' && 'Dados'}
              {etapa === 'endereco' && 'Endereço'}
              {etapa === 'preferencias' && 'Prefs'}
              {etapa === 'conclusao' && 'Fim'}
            </span>
          ))}
        </div>
      </div>

      {/* Erro global */}
      {erro && (
        <Alerta
          tipo="erro"
          mensagem={erro}
          dispensavel
          aoDispensar={limparErro}
          className="onboarding__erro"
          data-testid="erro-onboarding"
        />
      )}

      {/* Aviso de rascunho */}
      {rascunhoExiste && etapaAtual !== 'boas-vindas' && (
        <Alerta
          tipo="info"
          mensagem="Você tem um rascunho salvo. Continue de onde parou."
          className="onboarding__rascunho"
          data-testid="aviso-rascunho"
        />
      )}

      {/* Etapa atual */}
      <CartaoCorpo className="onboarding__etapa-container">
        <div className="onboarding__etapa-wrapper" role="region" aria-label={`Etapa ${indiceEtapa + 1} de ${totalEtapas}`}>
          {renderEtapa()}
        </div>
      </CartaoCorpo>

      {/* Navegação inferior (para mobile) */}
      <div className="onboarding__navegacao-mobile" aria-hidden="true">
        {(!ehPrimeiraEtapa || ehUltimaEtapa) && (
          <div className="onboarding__botoes-mobile">
            {!ehPrimeiraEtapa && (
              <BotaoPrimario
                variante="secundario"
                onClick={handleVoltar}
                icone="seta-esquerda"
                className="onboarding__btn-mobile"
                data-testid="btn-voltar-mobile"
              >
                Voltar
              </BotaoPrimario>
            )}
            {ehUltimaEtapa && !concluido && (
              <BotaoPrimario
                onClick={handleAvancar}
                carregando={carregando}
                icone="check"
                iconePosicao="direita"
                className="onboarding__btn-mobile"
                data-testid="btn-concluir-mobile"
              >
                Concluir
              </BotaoPrimario>
            )}
            {!ehUltimaEtapa && !ehPrimeiraEtapa && (
              <BotaoPrimario
                onClick={handleAvancar}
                carregando={carregando}
                icone="seta-direita"
                iconePosicao="direita"
                className="onboarding__btn-mobile"
                data-testid="btn-avancar-mobile"
              >
                Continuar
              </BotaoPrimario>
            )}
          </div>
        )}
      </div>
    </Cartao>
  );
};

export default Onboarding;