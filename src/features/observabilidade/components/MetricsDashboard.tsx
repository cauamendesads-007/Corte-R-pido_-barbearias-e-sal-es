/**
 * MetricsDashboard - Dashboard de métricas agregadas em tempo real.
 * Tabelas acessíveis com ordenação, gráficos simples, exportação CSV.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { MetricaAgregada, MetricEntry } from '../types';
import { agregarMetricas } from '../rules';
import './MetricsDashboard.css';

interface MetricsDashboardProps {
  entries: MetricEntry[];
  refreshInterval?: number;
  onExport?: (data: MetricaAgregada[]) => void;
}

const METRIC_TYPE_COLORS: Record<MetricaAgregada['tipo'], string> = {
  counter: 'var(--metric-counter, #3b82f6)',
  gauge: 'var(--metric-gauge, #10b981)',
  histogram: 'var(--metric-histogram, #f59e0b)',
  timing: 'var(--metric-timing, #8b5cf6)',
};

const METRIC_TYPE_LABELS: Record<MetricaAgregada['tipo'], string> = {
  counter: 'Contador',
  gauge: 'Medidor',
  histogram: 'Histograma',
  timing: 'Tempo',
};

const formatNumber = (num: number, decimals = 2): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
  return num.toFixed(decimals);
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  entries,
  refreshInterval = 5000,
  onExport,
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'nome',
    direction: 'asc',
  });
  const [filterType, setFilterType] = useState<MetricaAgregada['tipo'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<MetricaAgregada | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Reagregar métricas quando entries mudam
  const aggregated = useMemo(() => agregarMetricas(entries), [entries]);

  // Filtrar e ordenar
  const processedMetrics = useMemo(() => {
    let result = aggregated;

    if (filterType !== 'all') {
      result = result.filter(m => m.tipo === filterType);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(m => m.nome.toLowerCase().includes(term));
    }

    // Ordenar
    result.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof MetricaAgregada];
      const bVal = b[sortConfig.key as keyof MetricaAgregada];

      if (aVal === undefined || bVal === undefined) return 0;

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [aggregated, filterType, searchTerm, sortConfig]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const handleSort = useCallback((key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleExport = useCallback(() => {
    onExport?.(processedMetrics);
  }, [onExport, processedMetrics]);

  const handleRowClick = useCallback((metric: MetricaAgregada) => {
    setSelectedMetric(selectedMetric?.nome === metric.nome ? null : metric);
  }, [selectedMetric]);

  const getSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  const formatValue = (metric: MetricaAgregada, key: keyof MetricaAgregada) => {
    const value = metric[key];
    if (typeof value !== 'number') return String(value ?? '—');

    if (metric.tipo === 'timing' || key === 'min' || key === 'max' || key === 'avg' || key === 'p50' || key === 'p95' || key === 'p99') {
      return formatDuration(value);
    }
    return formatNumber(value);
  };

  return (
    <div className="metrics-dashboard" role="region" aria-label="Dashboard de métricas">
      {/* Header */}
      <div className="metrics-header">
        <div className="metrics-title">
          <h2>Métricas do Sistema</h2>
          <span className="metrics-last-refresh" aria-live="polite">
            Atualizado: {lastRefresh.toLocaleTimeString('pt-BR')}
          </span>
        </div>

        <div className="metrics-controls">
          <label htmlFor="metric-type-filter" className="visually-hidden">Filtrar por tipo</label>
          <select
            id="metric-type-filter"
            value={filterType}
            onChange={e => setFilterType(e.target.value as MetricaAgregada['tipo'] | 'all')}
            className="metrics-filter-select"
            aria-label="Filtrar por tipo de métrica"
          >
            <option value="all">Todos os tipos</option>
            <option value="counter">Contadores</option>
            <option value="gauge">Medidores</option>
            <option value="histogram">Histogramas</option>
            <option value="timing">Tempos</option>
          </select>

          <label htmlFor="metric-search" className="visually-hidden">Buscar métricas</label>
          <input
            id="metric-search"
            type="search"
            placeholder="Buscar métricas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="metrics-search-input"
            aria-label="Buscar métricas por nome"
          />

          {onExport && (
            <button
              onClick={handleExport}
              className="metrics-btn metrics-btn--primary"
              aria-label="Exportar métricas para CSV"
            >
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="metrics-summary" role="list" aria-label="Resumo das métricas">
        {['counter', 'gauge', 'histogram', 'timing'].map(type => {
          const count = aggregated.filter(m => m.tipo === type).length;
          return (
            <div
              key={type}
              className="metrics-summary-card"
              style={{ borderLeftColor: METRIC_TYPE_COLORS[type] }}
              role="listitem"
            >
              <span className="metrics-summary-label">{METRIC_TYPE_LABELS[type]}</span>
              <span className="metrics-summary-value">{count}</span>
            </div>
          );
        })}
        <div
          className="metrics-summary-card metrics-summary-card--total"
          style={{ borderLeftColor: 'var(--accent-primary, #89b4fa)' }}
          role="listitem"
        >
          <span className="metrics-summary-label">Total</span>
          <span className="metrics-summary-value">{aggregated.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="metrics-table-container">
        {processedMetrics.length === 0 ? (
          <div className="metrics-empty">
            <p>Nenhuma métrica encontrada</p>
            {(filterType !== 'all' || searchTerm) && (
              <p>Tente ajustar os filtros ou a busca</p>
            )}
          </div>
        ) : (
          <table className="metrics-table" role="grid">
            <thead>
              <tr>
                <th
                  scope="col"
                  onClick={() => handleSort('nome')}
                  aria-sort={sortConfig.key === 'nome' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  style={{ width: '30%' }}
                >
                  Nome {getSortIndicator('nome')}
                </th>
                <th
                  scope="col"
                  onClick={() => handleSort('tipo')}
                  aria-sort={sortConfig.key === 'tipo' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  style={{ width: '15%' }}
                >
                  Tipo {getSortIndicator('tipo')}
                </th>
                <th
                  scope="col"
                  onClick={() => handleSort('count')}
                  aria-sort={sortConfig.key === 'count' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  style={{ width: '10%' }}
                >
                  Count {getSortIndicator('count')}
                </th>
                <th
                  scope="col"
                  onClick={() => handleSort('sum')}
                  aria-sort={sortConfig.key === 'sum' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  style={{ width: '15%' }}
                >
                  Soma {getSortIndicator('sum')}
                </th>
                <th
                  scope="col"
                  onClick={() => handleSort('avg')}
                  aria-sort={sortConfig.key === 'avg' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  style={{ width: '15%' }}
                >
                  Média {getSortIndicator('avg')}
                </th>
                <th
                  scope="col"
                  onClick={() => handleSort('p95')}
                  aria-sort={sortConfig.key === 'p95' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  style={{ width: '15%' }}
                >
                  P95 {getSortIndicator('p95')}
                </th>
              </tr>
            </thead>
            <tbody>
              {processedMetrics.map((metric, index) => (
                <tr
                  key={`${metric.nome}-${metric.tipo}-${index}`}
                  className={`metrics-row ${selectedMetric?.nome === metric.nome ? 'metrics-row--selected' : ''}`}
                  onClick={() => handleRowClick(metric)}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(metric);
                    }
                  }}
                  role="row"
                >
                  <td className="metrics-cell metrics-cell--name">
                    <span
                      className="metrics-type-indicator"
                      style={{ backgroundColor: METRIC_TYPE_COLORS[metric.tipo] }}
                      aria-hidden="true"
                    />
                    <span className="metrics-name">{metric.nome}</span>
                    <span className="metrics-type-badge" style={{ color: METRIC_TYPE_COLORS[metric.tipo] }}>
                      {METRIC_TYPE_LABELS[metric.tipo]}
                    </span>
                  </td>
                  <td className="metrics-cell">{METRIC_TYPE_LABELS[metric.tipo]}</td>
                  <td className="metrics-cell metrics-cell--number">{formatNumber(metric.count)}</td>
                  <td className="metrics-cell metrics-cell--number">{formatValue(metric, 'sum')}</td>
                  <td className="metrics-cell metrics-cell--number">{formatValue(metric, 'avg')}</td>
                  <td className="metrics-cell metrics-cell--number">
                    {metric.p95 !== undefined ? formatValue(metric, 'p95') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail panel */}
      {selectedMetric && (
        <div className="metrics-detail" role="region" aria-label={`Detalhes de ${selectedMetric.nome}`}>
          <div className="metrics-detail-header">
            <h3>
              <span
                className="metrics-type-indicator"
                style={{ backgroundColor: METRIC_TYPE_COLORS[selectedMetric.tipo] }}
                aria-hidden="true"
              />
              {selectedMetric.nome}
            </h3>
            <button
              onClick={() => setSelectedMetric(null)}
              className="metrics-detail-close"
              aria-label="Fechar detalhes"
            >
              ×
            </button>
          </div>

          <div className="metrics-detail-grid">
            <div className="metrics-detail-item">
              <span className="metrics-detail-label">Tipo</span>
              <span className="metrics-detail-value" style={{ color: METRIC_TYPE_COLORS[selectedMetric.tipo] }}>
                {METRIC_TYPE_LABELS[selectedMetric.tipo]}
              </span>
            </div>
            <div className="metrics-detail-item">
              <span className="metrics-detail-label">Contagem</span>
              <span className="metrics-detail-value">{formatNumber(selectedMetric.count)}</span>
            </div>
            <div className="metrics-detail-item">
              <span className="metrics-detail-label">Soma</span>
              <span className="metrics-detail-value">{formatValue(selectedMetric, 'sum')}</span>
            </div>
            <div className="metrics-detail-item">
              <span className="metrics-detail-label">Mínimo</span>
              <span className="metrics-detail-value">{formatValue(selectedMetric, 'min')}</span>
            </div>
            <div className="metrics-detail-item">
              <span className="metrics-detail-label">Máximo</span>
              <span className="metrics-detail-value">{formatValue(selectedMetric, 'max')}</span>
            </div>
            <div className="metrics-detail-item">
              <span className="metrics-detail-label">Média</span>
              <span className="metrics-detail-value">{formatValue(selectedMetric, 'avg')}</span>
            </div>
            {selectedMetric.p50 !== undefined && (
              <div className="metrics-detail-item">
                <span className="metrics-detail-label">P50 (Mediana)</span>
                <span className="metrics-detail-value">{formatValue(selectedMetric, 'p50')}</span>
              </div>
            )}
            {selectedMetric.p95 !== undefined && (
              <div className="metrics-detail-item">
                <span className="metrics-detail-label">P95</span>
                <span className="metrics-detail-value">{formatValue(selectedMetric, 'p95')}</span>
              </div>
            )}
            {selectedMetric.p99 !== undefined && (
              <div className="metrics-detail-item">
                <span className="metrics-detail-label">P99</span>
                <span className="metrics-detail-value">{formatValue(selectedMetric, 'p99')}</span>
              </div>
            )}
            <div className="metrics-detail-item">
              <span className="metrics-detail-label">Última atualização</span>
              <span className="metrics-detail-value">
                {new Date(selectedMetric.ultimaAtualizacao).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsDashboard;