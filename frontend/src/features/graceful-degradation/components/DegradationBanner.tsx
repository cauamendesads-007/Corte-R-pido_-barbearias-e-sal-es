/**
 * DegradationBanner - Banner de notificação de degradação do sistema.
 * Exibe status atual, recursos afetados e ações disponíveis.
 */

import React, { useState, useMemo } from 'react';
import type { NivelDegradacao, Recurso } from '../types';
import { obterCorNivel, obterLabelNivel } from '../types';
import './DegradationBanner.css';

export interface DegradationBannerProps {
  nivel: NivelDegradacao;
  recursosDegradados: Recurso[];
  recursosEssenciaisDegradados: Recurso[];
  online: boolean;
  onTentarNovamente?: () => void;
  onVerDetalhes?: () => void;
  onDispensar?: () => void;
  dismissivel?: boolean;
  compacto?: boolean;
}

const NIVEL_ICONES: Record<NivelDegradacao, React.ReactNode> = {
  none: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>,
  parcial: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  critico: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  offline: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
};

const NIVEL_MENSAGENS: Record<NivelDegradacao, { titulo: string; descricao: string }> = {
  none: { titulo: 'Sistema operacional', descricao: 'Todos os serviços estão funcionando normalmente' },
  parcial: { titulo: 'Degradação parcial', descricao: 'Alguns recursos não essenciais estão indisponíveis' },
  critico: { titulo: 'Degradação crítica', descricao: 'Recursos essenciais estão indisponíveis. Funcionalidade limitada' },
  offline: { titulo: 'Modo offline', descricao: 'Sem conexão com a internet. Dados serão sincronizados ao reconectar' },
};

export const DegradationBanner: React.FC<DegradationBannerProps> = ({
  nivel,
  recursosDegradados,
  recursosEssenciaisDegradados,
  online,
  onTentarNovamente,
  onVerDetalhes,
  onDispensar,
  dismissivel = true,
  compacto = false,
}) => {
  const [expandido, setExpandido] = useState(false);
  const [dispensado, setDispensado] = useState(false);

  const cor = useMemo(() => obterCorNivel(nivel), [nivel]);
  const label = useMemo(() => obterLabelNivel(nivel), [nivel]);
  const { titulo, descricao } = useMemo(() => NIVEL_MENSAGENS[nivel], [nivel]);

  if (dispensado || nivel === 'none') {
    return null;
  }

  const handleDispensar = () => {
    setDispensado(true);
    onDispensar?.();
  };

  const handleExpandir = () => setExpandido(!expandido);

  if (compacto) {
    return (
      <div
        className="degradation-banner degradation-banner--compacto"
        style={{ backgroundColor: cor, borderColor: cor } as React.CSSProperties}
        role="status"
        aria-live="polite"
      >
        <span className="degradation-banner__icone" aria-hidden="true">
          {NIVEL_ICONES[nivel]}
        </span>
        <span className="degradation-banner__texto">{label}</span>
        {dismissivel && (
          <button
            onClick={handleDispensar}
            className="degradation-banner__dispensar"
            aria-label="Dispensar banner"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`degradation-banner ${expandido ? 'degradation-banner--expandido' : ''}`}
      style={{ '--banner-color': cor } as React.CSSProperties}
      role="alert"
      aria-live="assertive"
    >
      <div className="degradation-banner__conteudo">
        <div className="degradation-banner__header">
          <div className="degradation-banner__icone-container" style={{ backgroundColor: cor }} aria-hidden="true">
            {NIVEL_ICONES[nivel]}
          </div>

          <div className="degradation-banner__texto-container">
            <h3 className="degradation-banner__titulo">{titulo}</h3>
            <p className="degradation-banner__descricao">{descricao}</p>

            <div className="degradation-banner__badges">
              <span className="degradation-banner__badge degradation-banner__badge--nivel" style={{ backgroundColor: cor }}>
                {label}
              </span>
              {!online && (
                <span className="degradation-banner__badge degradation-banner__badge--offline">
                  Offline
                </span>
              )}
              {recursosEssenciaisDegradados.length > 0 && (
                <span className="degradation-banner__badge degradation-banner__badge--critico">
                  {recursosEssenciaisDegradados.length} essencial{recursosEssenciaisDegradados.length !== 1 ? 'is' : ''}
                </span>
              )}
              {recursosDegradados.length > recursosEssenciaisDegradados.length && (
                <span className="degradation-banner__badge degradation-banner__badge--parcial">
                  {recursosDegradados.length - recursosEssenciaisDegradados.length} não essencial{recursosDegradados.length - recursosEssenciaisDegradados.length !== 1 ? 'is' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="degradation-banner__acoes">
            {onTentarNovamente && (
              <button
                onClick={onTentarNovamente}
                className="degradation-banner__btn degradation-banner__btn--primary"
              >
                Tentar novamente
              </button>
            )}

            <button
              onClick={handleExpandir}
              className="degradation-banner__btn degradation-banner__btn--secondary"
              aria-expanded={expandido}
              aria-controls="degradation-detalhes"
            >
              {expandido ? 'Menos detalhes ▲' : 'Mais detalhes ▼'}
            </button>

            {dismissivel && (
              <button
                onClick={handleDispensar}
                className="degradation-banner__dispensar"
                aria-label="Dispensar notificação"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {expandido && (
          <div id="degradation-detalhes" className="degradation-banner__detalhes">
            {recursosDegradados.length > 0 && (
              <div className="degradation-banner__secao">
                <h4 className="degradation-banner__secao-titulo">Recursos afetados</h4>
                <ul className="degradation-banner__lista">
                  {recursosDegradados.map(recurso => (
                    <li key={recurso.id} className="degradation-banner__item">
                      <span className="degradation-banner__item-nome">{recurso.nome}</span>
                      <span className="degradation-banner__item-tipo">{recurso.tipo}</span>
                      {recurso.essencial && (
                        <span className="degradation-banner__item-essencial">Essencial</span>
                      )}
                      {recurso.fallback.mensagemUsuario && (
                        <span className="degradation-banner__item-fallback">{recurso.fallback.mensagemUsuario}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {onVerDetalhes && (
              <div className="degradation-banner__secao degradation-banner__secao--acao">
                <button
                  onClick={onVerDetalhes}
                  className="degradation-banner__btn degradation-banner__btn--outline"
                >
                  Ver detalhes técnicos
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DegradationBanner;