/**
 * LogViewer - Componente para visualização de logs em tempo real.
 * Acessível, com filtros, busca e exportação.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { LogEntry, LogLevel } from '../types';
import { LOG_LEVELS } from '../types';
import './LogViewer.css';

interface LogViewerProps {
  entries: LogEntry[];
  maxEntries?: number;
  autoScroll?: boolean;
  onClear?: () => void;
  onExport?: () => void;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'var(--log-debug, #6b7280)',
  info: 'var(--log-info, #3b82f6)',
  warn: 'var(--log-warn, #f59e0b)',
  error: 'var(--log-error, #ef4444)',
  fatal: 'var(--log-fatal, #dc2626)',
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  fatal: 'FATAL',
};

export const LogViewer: React.FC<LogViewerProps> = ({
  entries,
  maxEntries = 1000,
  autoScroll = true,
  onClear,
  onExport,
}) => {
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);

  // Filtrar e limitar entradas
  const filteredEntries = useMemo(() => {
    let result = entries;

    if (filterLevel !== 'all') {
      result = result.filter(e => e.level === filterLevel);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e =>
        e.message.toLowerCase().includes(term) ||
        JSON.stringify(e.context).toLowerCase().includes(term) ||
        e.tags?.some(t => t.toLowerCase().includes(term))
      );
    }

    return result.slice(-maxEntries);
  }, [entries, filterLevel, searchTerm, maxEntries]);

  // Auto-scroll quando novas entradas chegam
  useEffect(() => {
    if (autoScroll && !isUserScrolling.current && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredEntries.length, autoScroll]);

  const handleScroll = useCallback(() => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      isUserScrolling.current = scrollTop + clientHeight < scrollHeight - 50;
    }
  }, []);

  const handleClear = useCallback(() => {
    onClear?.();
    setSelectedEntry(null);
  }, [onClear]);

  const handleExport = useCallback(() => {
    onExport?.();
  }, [onExport]);

  const handleCopyEntry = useCallback((entry: LogEntry) => {
    const text = `${entry.timestamp} [${LEVEL_LABELS[entry.level]}] ${entry.message}${
      entry.context ? ` ${JSON.stringify(entry.context, null, 2)}` : ''
    }`;
    navigator.clipboard.writeText(text);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const getLevelBadge = (level: LogLevel) => (
    <span
      className="log-level-badge"
      style={{ backgroundColor: LEVEL_COLORS[level], color: 'white' }}
      title={level}
    >
      {LEVEL_LABELS[level]}
    </span>
  );

  return (
    <div className="log-viewer" role="region" aria-label="Visualizador de logs" tabIndex={0}>
      {/* Toolbar */}
      <div className="log-toolbar">
        <div className="log-filters">
          <label htmlFor="log-level-filter" className="visually-hidden">Filtrar por nível</label>
          <select
            id="log-level-filter"
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value as LogLevel | 'all')}
            className="log-filter-select"
            aria-label="Filtrar por nível de log"
          >
            <option value="all">Todos os níveis</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="fatal">Fatal</option>
          </select>

          <label htmlFor="log-search" className="visually-hidden">Buscar logs</label>
          <input
            id="log-search"
            type="search"
            placeholder="Buscar logs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="log-search-input"
            aria-label="Buscar nos logs"
          />
        </div>

        <div className="log-actions">
          <label className="log-toggle">
            <input
              type="checkbox"
              checked={showContext}
              onChange={e => setShowContext(e.target.checked)}
              aria-label="Mostrar contexto"
            />
            <span>Contexto</span>
          </label>

          {onClear && (
            <button
              onClick={handleClear}
              className="log-btn log-btn--secondary"
              aria-label="Limpar logs"
            >
              Limpar
            </button>
          )}

          {onExport && (
            <button
              onClick={handleExport}
              className="log-btn log-btn--secondary"
              aria-label="Exportar logs"
            >
              Exportar
            </button>
          )}
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={logContainerRef}
        className="log-entries"
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        {filteredEntries.length === 0 ? (
          <div className="log-empty">
            <p>Nenhum log encontrado</p>
            {searchTerm && <p>Tente ajustar a busca ou filtros</p>}
          </div>
        ) : (
          filteredEntries.map((entry, index) => (
            <div
              key={`${entry.id}-${index}`}
              className={`log-entry log-entry--${entry.level}`}
              onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
              role="listitem"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedEntry(selectedEntry?.id === entry.id ? null : entry);
                }
              }}
            >
              <div className="log-entry-header">
                <time className="log-timestamp" dateTime={entry.timestamp}>
                  {formatTimestamp(entry.timestamp)}
                </time>
                {getLevelBadge(entry.level)}
                {entry.tags?.length && (
                  <span className="log-tags" aria-label={`Tags: ${entry.tags.join(', ')}`}>
                    {entry.tags.map(tag => (
                      <span key={tag} className="log-tag">{tag}</span>
                    ))}
                  </span>
                )}
              </div>

              <div className="log-message">{entry.message}</div>

              {(showContext || selectedEntry?.id === entry.id) && entry.context && (
                <details className="log-context" open={selectedEntry?.id === entry.id}>
                  <summary className="log-context-summary">
                    Contexto {selectedEntry?.id === entry.id ? '▲' : '▼'}
                  </summary>
                  <pre className="log-context-pre">{JSON.stringify(entry.context, null, 2)}</pre>
                  <div className="log-context-actions">
                    <button
                      onClick={e => { e.stopPropagation(); handleCopyEntry(entry); }}
                      className="log-btn log-btn--small"
                      aria-label="Copiar entrada completa"
                    >
                      Copiar
                    </button>
                  </div>
                </details>
              )}

              {selectedEntry?.id === entry.id && (
                <div className="log-entry-selected-indicator" aria-hidden="true" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer com contadores */}
      <div className="log-footer">
        <span className="log-count">
          {filteredEntries.length} de {entries.length} entradas
        </span>
        {entries.length > maxEntries && (
          <span className="log-truncated">
            (limitado a {maxEntries} entradas mais recentes)
          </span>
        )}
      </div>
    </div>
  );
};

export default LogViewer;