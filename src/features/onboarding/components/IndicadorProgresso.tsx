/**
 * Indicador de Progresso do Onboarding.
 * Mostra as etapas e progresso atual.
 */

import React, { useMemo } from 'react';
import { ETAPAS_ORDEM, TITULOS_ETAPAS } from '../types';
import { useOnboarding } from '../hooks/useOnboarding';
import { Icone } from '@/componentes';
import './Onboarding.css';

interface IndicadorProgressoProps {
  className?: string;
}

export const IndicadorProgresso: React.FC<IndicadorProgressoProps> = ({ className = '' }) => {
  const { etapaAtual, concluido } = useOnboarding();

  const etapasComStatus = useMemo(() => {
    const indiceAtual = ETAPAS_ORDEM.indexOf(etapaAtual);
    return ETAPAS_ORDEM.map((etapa, indice) => ({
      etapa,
      titulo: TITULOS_ETAPAS[etapa],
      status: indice < indiceAtual ? 'concluida' : indice === indiceAtual ? 'atual' : 'pendente',
      concluido: etapa === 'confirmacao' && concluido,
    }));
  }, [etapaAtual, concluido]);

  return (
    <nav
      className={`onboarding__progresso ${className}`}
      role="navigation"
      aria-label="Progresso do cadastro"
    >
      <ol className="onboarding__progresso-lista">
        {etapasComStatus.map((item, index) => (
          <li key={item.etapa} className="onboarding__progresso-item">
            <button
              type="button"
              className={`onboarding__progresso-botao ${item.status}`}
              aria-current={item.status === 'atual' ? 'step' : undefined}
              aria-label={`${item.titulo} - ${item.status === 'concluida' ? 'Concluída' : item.status === 'atual' ? 'Atual' : 'Pendente'}`}
              disabled={item.status === 'pendente' && index > 0}
            >
              <span className="onboarding__progresso-numero" aria-hidden="true">
                {item.status === 'concluida' ? (
                  <Icone nome="verificar" tamanho={16} strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="onboarding__progresso-titulo">{item.titulo}</span>
            </button>

            {index < etapasComStatus.length - 1 && (
              <div className={`onboarding__progresso-linha ${item.status === 'concluida' ? 'onboarding__progresso-linha--concluida' : ''}`} aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default IndicadorProgresso;