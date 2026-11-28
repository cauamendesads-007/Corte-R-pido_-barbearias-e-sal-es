/**
 * Componente EmptyState - Estado vazio acessível e consistente.
 * WCAG 2.2 AA, preserva visual escuro, micro-interações.
 */

import { Icone } from './Icone';
import { BotaoPrimario, BotaoSecundario } from './Botao';
import './EmptyState.css';

export interface EmptyStateProps {
  /** Ícone (chave de ICONES) */
  icone: string;
  /** Título principal */
  titulo: string;
  /** Mensagem descritiva */
  mensagem: string;
  /** Ação principal (opcional) */
  acao?: {
    rotulo: string;
    aoClicar: () => void;
    variante?: 'primaria' | 'secundaria';
  };
  /** Ação secundária (opcional) */
  acaoSecundaria?: {
    rotulo: string;
    aoClicar: () => void;
  };
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const EmptyState = ({
  icone,
  titulo,
  mensagem,
  acao,
  acaoSecundaria,
  className = '',
  'data-testid': testId,
}: EmptyStateProps) => {
  return (
    <div className={`empty-state ${className}`} data-testid={testId} role="status" aria-live="polite">
      <div className="empty-state__container">
        <div className="empty-state__icone" aria-hidden="true">
          <Icone nome={icone as any} tamanho={64} cor="var(--cor-texto-secundario)" />
        </div>
        <h2 className="empty-state__titulo">{titulo}</h2>
        <p className="empty-state__mensagem">{mensagem}</p>
        {(acao || acaoSecundaria) && (
          <div className="empty-state__acoes">
            {acaoSecundaria && (
              <BotaoSecundario
                aoClicar={acaoSecundaria.aoClicar}
                data-testid={`${testId}-acao-secundaria`}
              >
                {acaoSecundaria.rotulo}
              </BotaoSecundario>
            )}
            {acao && (
              <BotaoPrimario
                aoClicar={acao.aoClicar}
                data-testid={`${testId}-acao-principal`}
              >
                {acao.rotulo}
              </BotaoPrimario>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;