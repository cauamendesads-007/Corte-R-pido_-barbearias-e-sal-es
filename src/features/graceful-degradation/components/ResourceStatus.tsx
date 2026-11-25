/**
 * ResourceStatus - Componente para exibir status de um recurso individual.
 * Mostra circuit breaker, health check, fallback ativo, ações de retry.
 */

import React, { useState } from 'react';
import type { Recurso, CircuitBreakerState, NivelDegradacao } from '../types';
import { obterCorNivel } from '../types';
import './ResourceStatus.css';

export interface ResourceStatusProps {
  recurso: Recurso;
  circuitBreaker?: CircuitBreakerState;
  fallbackAtivo?: boolean;
  onRetry?: () => void;
  onVerLogs?: () => void;
  compacto?: boolean;
}

const ESTADO_ICONES: Record<CircuitBreakerState['estado'], React.ReactNode> = {
  closed: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>,
  open: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  'half-open': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
};

const ESTADO_LABELS: Record<CircuitBreakerState['estado'], string> = {
  closed: 'Fechado (Normal)',
  open: 'Aberto (Bloqueando)',
  'half-open': 'Meio-aberto (Testando)',
};

const ESTADO_CORES: Record<CircuitBreakerState['estado'], string> = {
  closed: 'var(--success, #10b981)',
  open: 'var(--error, #ef4444)',
  'half-open': 'var(--warning, #f59e0b)',
};

export const ResourceStatus: React.FC<ResourceStatusProps> = ({
  recurso,
  circuitBreaker,
  fallbackAtivo = false,
  onRetry,
  onVerLogs,
  compacto = false,
}) => {
  const [expandido, setExpandido] = useState(false);

  const estado = circuitBreaker?.estado ?? 'closed';
  const corEstado = ESTADO_CORES[estado];
  const nivelRecurso: NivelDegradacao = estado === 'open' ? (recurso.essencial ? 'critico' : 'parcial') :
    estado === 'half-open' ? 'parcial' : 'none';
  const corNivel = obterCorNivel(nivelRecurso);

  const cb = circuitBreaker;

  if (compacto) {
    return (
      <div className="resource-status resource-status--compacto" style={{ '--status-color': corNivel } as React.CSSProperties}>
        <div className="resource-status__icone" style={{ color: corEstado }} aria-hidden="true">
          {ESTADO_ICONES[estado]}
        </div>
        <div className="resource-status__info">
          <span className="resource-status__nome">{recurso.nome}</span>
          <span className="resource-status__estado" style={{ color: corEstado }}>{ESTADO_LABELS[estado]}</span>
        </div>
        {fallbackAtivo && (
          <span className="resource-status__fallback-badge">Fallback ativo</span>
        )}
      </div>
    );
  }

  return (
    <article
      className={`resource-status ${estado !== 'closed' ? 'resource-status--degradado' : ''} ${fallbackAtivo ? 'resource-status--fallback' : ''}`}
      style={{ '--status-color': corNivel, '--estado-color': corEstado } as React.CSSProperties}
    >
      <header className="resource-status__header">
        <div className="resource-status__identidade">
          <div className="resource-status__icone-container" style={{ backgroundColor: corEstado }} aria-hidden="true">
            {ESTADO_ICONES[estado]}
          </div>
          <div className="resource-status__nome-tipo">
            <h4 className="resource-status__nome">{recurso.nome}</h4>
            <span className="resource-status__tipo">{recurso.tipo}</span>
          </div>
        </div>

        <div className="resource-status__estado-container">
          <span className="resource-status__estado-badge" style={{ backgroundColor: corEstado, color: 'white' }}>
            {ESTADO_LABELS[estado]}
          </span>
          {recurso.essencial && (
            <span className="resource-status__essencial-badge">Essencial</span>
          )}
          {fallbackAtivo && (
            <span className="resource-status__fallback-badge">Fallback ativo</span>
          )}
        </div>

        <button
          className="resource-status__expandir"
          onClick={() => setExpandido(!expandido)}
          aria-expanded={expandido}
          aria-controls={`resource-status-${recurso.id}`}
        >
          {expandido ? '▲' : '▼'}
        </button>
      </header>

      {expandido && (
        <div id={`resource-status-${recurso.id}`} className="resource-status__detalhes">
          <div className="resource-status__grid">
            {cb && (
              <>
                <div className="resource-status__campo">
                  <span className="resource-status__campo-label">Estado do Circuit Breaker</span>
                  <span className="resource-status__campo-valor" style={{ color: corEstado }}>
                    {ESTADO_LABELS[cb.estado]}
                  </span>
                </div>
                <div className="resource-status__campo">
                  <span className="resource-status__campo-label">Falhas consecutivas</span>
                  <span className="resource-status__campo-valor">{cb.falhasConsecutivas} / {cb.limiteFalhas}</span>
                </div>
                <div className="resource-status__campo">
                  <span className="resource-status__campo-label">Sucessos consecutivos</span>
                  <span className="resource-status__campo-valor">{cb.sucessosConsecutivos}</span>
                </div>
                {cb.ultimaFalha && (
                  <div className="resource-status__campo">
                    <span className="resource-status__campo-label">Última falha</span>
                    <span className="resource-status__campo-valor">
                      {new Date(cb.ultimaFalha).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
                {cb.proximaTentativa && (
                  <div className="resource-status__campo">
                    <span className="resource-status__campo-label">Próxima tentativa</span>
                    <span className="resource-status__campo-valor">
                      {new Date(cb.proximaTentativa).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
                <div className="resource-status__campo">
                  <span className="resource-status__campo-label">Tempo aberto</span>
                  <span className="resource-status__campo-valor">{(cb.tempoAbertoMs / 1000).toFixed(0)}s</span>
                </div>
                <div className="resource-status__campo">
                  <span className="resource-status__campo-label">Tempo meio-aberto</span>
                  <span className="resource-status__campo-valor">{(cb.tempoMeioAbertoMs / 1000).toFixed(0)}s</span>
                </div>
              </>
            )}

            <div className="resource-status__campo">
              <span className="resource-status__campo-label">Timeout</span>
              <span className="resource-status__campo-valor">{(recurso.timeoutMs / 1000).toFixed(1)}s</span>
            </div>
            <div className="resource-status__campo">
              <span className="resource-status__campo-label">Tentativas máximas</span>
              <span className="resource-status__campo-valor">{recurso.tentativasMaximas}</span>
            </div>
            <div className="resource-status__campo">
              <span className="resource-status__campo-label">Backoff inicial</span>
              <span className="resource-status__campo-valor">{(recurso.backoffMs / 1000).toFixed(1)}s</span>
            </div>
            <div className="resource-status__campo">
              <span className="resource-status__campo-label">Fallback</span>
              <span className="resource-status__campo-valor">{recurso.fallback.estrategia}</span>
            </div>
            {recurso.fallback.chaveCache && (
              <div className="resource-status__campo">
                <span className="resource-status__campo-label">Chave de cache</span>
                <span className="resource-status__campo-valor">{recurso.fallback.chaveCache}</span>
              </div>
            )}
            {recurso.fallback.ttlCacheMs && (
              <div className="resource-status__campo">
                <span className="resource-status__campo-label">TTL do cache</span>
                <span className="resource-status__campo-valor">{(recurso.fallback.ttlCacheMs / 1000 / 60).toFixed(1)}min</span>
              </div>
            )}
            {recurso.healthCheck && (
              <>
                <div className="resource-status__campo">
                  <span className="resource-status__campo-label">Health Check</span>
                  <span className="resource-status__campo-valor">{recurso.healthCheck.habilitado ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="resource-status__campo">
                  <span className="resource-status__campo-label">Intervalo</span>
                  <span className="resource-status__campo-valor">{(recurso.healthCheck.intervaloMs / 1000).toFixed(0)}s</span>
                </div>
                <div className="resource-status__campo">
                  <span className="resource-status__campo-label">Endpoint</span>
                  <span className="resource-status__campo-valor">{recurso.healthCheck.endpoint}</span>
                </div>
              </>
            )}
          </div>

          <footer className="resource-status__acoes">
            {onRetry && cb && cb.estado === 'open' && (
              <button
                onClick={onRetry}
                className="resource-status__btn resource-status__btn--primary"
              >
                Tentar reconectar
              </button>
            )}

            {onRetry && cb && cb.estado === 'half-open' && (
              <button
                onClick={onRetry}
                className="resource-status__btn resource-status__btn--secondary"
              >
                Testar conexão
              </button>
            )}

            {onVerLogs && (
              <button
                onClick={onVerLogs}
                className="resource-status__btn resource-status__btn--ghost"
              >
                Ver logs
              </button>
            )}

            {cb && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('reset-circuit-breaker', { detail: { recursoId: recurso.id } }))}
                className="resource-status__btn resource-status__btn--ghost"
              >
                Resetar circuit breaker
              </button>
            )}
          </footer>
        </div>
      )}
    </article>
  );
};

export default ResourceStatus;