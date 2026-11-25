/**
 * Componente ErrorState - Estado de erro acessível com retry.
 * WCAG 2.2 AA, preserva visual escuro, micro-interações.
 */

import React from 'react';
import { Icone } from './Icone';
import { BotaoPrimario, BotaoSecundario } from './Botao';
import './ErrorState.css';

export interface ErrorStateProps {
  /** Ícone (chave de ICONES) */
  icone?: string;
  /** Título principal */
  titulo: string;
  /** Mensagem descritiva do erro */
  mensagem: string;
  /** Callback para tentar novamente */
  aoTentarNovamente?: () => void;
  /** Rótulo do botão de retry */
  rotuloRetry?: string;
  /** Ação secundária (opcional) */
  acaoSecundaria?: {
    rotulo: string;
    aoClicar: () => void;
  };
  /** Mostra detalhes técnicos (opcional) */
  detalhes?: string;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const ErrorState = ({
  icone = 'alerta',
  titulo,
  mensagem,
  aoTentarNovamente,
  rotuloRetry = 'Tentar novamente',
  acaoSecundaria,
  detalhes,
  className = '',
  'data-testid': testId,
}: ErrorStateProps) => {
  const [mostrarDetalhes, setMostrarDetalhes] = React.useState(false);

  return (
    <div className={`error-state ${className}`} data-testid={testId} role="alert">
      <div className="error-state__container">
        <div className="error-state__icone" aria-hidden="true">
          <Icone nome={icone as any} tamanho={64} cor="var(--cor-perigo)" />
        </div>
        <h2 className="error-state__titulo">{titulo}</h2>
        <p className="error-state__mensagem">{mensagem}</p>
        {detalhes && (
          <details className="error-state__detalhes" open={mostrarDetalhes} onToggle={() => setMostrarDetalhes(!mostrarDetalhes)}>
            <summary className="error-state__detalhes-summary">
              {mostrarDetalhes ? 'Ocultar detalhes' : 'Mostrar detalhes técnicos'}
            </summary>
            <pre className="error-state__detalhes-pre">{detalhes}</pre>
          </details>
        )}
        {(aoTentarNovamente || acaoSecundaria) && (
          <div className="error-state__acoes">
            {acaoSecundaria && (
              <BotaoSecundario
                aoClicar={acaoSecundaria.aoClicar}
                data-testid={`${testId}-acao-secundaria`}
              >
                {acaoSecundaria.rotulo}
              </BotaoSecundario>
            )}
            {aoTentarNovamente && (
              <BotaoPrimario
                aoClicar={aoTentarNovamente}
                iconeEsquerda={<Icone nome="recarregar" tamanho={16} />}
                data-testid={`${testId}-retry`}
              >
                {rotuloRetry}
              </BotaoPrimario>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorState;