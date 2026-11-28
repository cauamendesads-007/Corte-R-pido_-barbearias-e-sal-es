/**
 * AlertaLista - Lista de alertas financeiros com filtros, agrupamento e ações.
 * Acessível, com badges de severidade, marcação como lido/reconhecido.
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { AlertaFinanceiro, SeveridadeAlerta } from '../types';
import { SEVERIDADES_ALERTA, formatarMoeda, formatarPercentual } from '../types';
import './AlertaLista.css';

interface AlertaListaProps {
  alertas: AlertaFinanceiro[];
  onMarcarLido?: (id: string) => void;
  onMarcarReconhecido?: (id: string) => void;
  onLimparLidos?: () => void;
  onVerOrcamento?: (orcamentoId: string) => void;
  maxAlertas?: number;
  mostrarAcoes?: boolean;
}

const SEVERIDADE_CORES: Record<SeveridadeAlerta, string> = {
  info: 'var(--info, #3b82f6)',
  warning: 'var(--warning, #f59e0b)',
  critical: 'var(--error, #ef4444)',
};

const SEVERIDADE_ICONES: Record<SeveridadeAlerta, React.ReactNode> = {
  info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  warning: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  critical: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

const TIPO_LABELS: Record<AlertaFinanceiro['tipo'], string> = {
  limite_proximo: 'Limite próximo',
  limite_atingido: 'Limite atingido',
  limite_ultrapassado: 'Limite ultrapassado',
  projecao_estouro: 'Projeção de estouro',
  lancamento_alto: 'Lançamento alto',
  tendencia_alta: 'Tendência de alta',
};

export const AlertaLista: React.FC<AlertaListaProps> = ({
  alertas,
  onMarcarLido,
  onMarcarReconhecido,
  onLimparLidos,
  onVerOrcamento,
  maxAlertas = 50,
  mostrarAcoes = true,
}) => {
  const [filtroSeveridade, setFiltroSeveridade] = useState<SeveridadeAlerta | 'all'>('all');
  const [filtroLido, setFiltroLido] = useState<'all' | 'nao-lidos' | 'lidos'>('all');
  const [busca, setBusca] = useState('');
  const [agruparPorSeveridade, setAgruparPorSeveridade] = useState(false);

  const alertasFiltrados = useMemo(() => {
    let resultado = alertas.slice(0, maxAlertas);

    if (filtroSeveridade !== 'all') {
      resultado = resultado.filter(a => a.severidade === filtroSeveridade);
    }

    if (filtroLido === 'nao-lidos') {
      resultado = resultado.filter(a => !a.lido);
    } else if (filtroLido === 'lidos') {
      resultado = resultado.filter(a => a.lido);
    }

    if (busca) {
      const termo = busca.toLowerCase();
      resultado = resultado.filter(a =>
        a.mensagem.toLowerCase().includes(termo) ||
        a.tipo.toLowerCase().includes(termo)
      );
    }

    return resultado;
  }, [alertas, filtroSeveridade, filtroLido, busca, maxAlertas]);

  const alertasAgrupados = useMemo(() => {
    if (!agruparPorSeveridade) return [{ severidade: 'all' as const, alertas: alertasFiltrados }];

    const grupos: Record<SeveridadeAlerta, AlertaFinanceiro[]> = {
      critical: [],
      warning: [],
      info: [],
    };

    for (const a of alertasFiltrados) {
      grupos[a.severidade].push(a);
    }

    return (['critical', 'warning', 'info'] as SeveridadeAlerta[])
      .filter(s => grupos[s].length > 0)
      .map(s => ({ severidade: s, alertas: grupos[s] }));
  }, [alertasFiltrados, agruparPorSeveridade]);

  const naoLidosCount = alertas.filter(a => !a.lido).length;

  const handleMarcarLido = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onMarcarLido?.(id);
  }, [onMarcarLido]);

  const handleMarcarReconhecido = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onMarcarReconhecido?.(id);
  }, [onMarcarReconhecido]);

  const handleVerOrcamento = useCallback((orcamentoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onVerOrcamento?.(orcamentoId);
  }, [onVerOrcamento]);

  const formatarDataRelativa = (dataISO: string) => {
    const data = new Date(dataISO);
    const agora = new Date();
    const diffMs = agora.getTime() - data.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `${diffMin}min atrás`;
    if (diffHoras < 24) return `${diffHoras}h atrás`;
    if (diffDias < 7) return `${diffDias}d atrás`;
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (alertas.length === 0) {
    return (
      <div className="alerta-lista alerta-lista--vazia" role="status" aria-live="polite">
        <div className="alerta-lista__vazio">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <p>Nenhum alerta financeiro</p>
          <span>Tudo sob controle!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="alerta-lista" role="region" aria-label="Alertas financeiros">
      {/* Toolbar */}
      <div className="alerta-lista__toolbar">
        <div className="alerta-lista__contador">
          <span className={naoLidosCount > 0 ? 'alerta-lista__badge' : ''}>
            {naoLidosCount} não lido{naoLidosCount !== 1 ? 's' : ''}
          </span>
          <span className="alerta-lista__total">de {alertas.length} total</span>
        </div>

        <div className="alerta-lista__filtros">
          <label htmlFor="alerta-severidade" className="visually-hidden">Filtrar por severidade</label>
          <select
            id="alerta-severidade"
            value={filtroSeveridade}
            onChange={e => setFiltroSeveridade(e.target.value as SeveridadeAlerta | 'all')}
            className="alerta-lista__select"
            aria-label="Filtrar por severidade"
          >
            <option value="all">Todas severidades</option>
            <option value="critical">Crítico</option>
            <option value="warning">Atenção</option>
            <option value="info">Informativo</option>
          </select>

          <label htmlFor="alerta-lido" className="visually-hidden">Filtrar por status de leitura</label>
          <select
            id="alerta-lido"
            value={filtroLido}
            onChange={e => setFiltroLido(e.target.value as 'all' | 'nao-lidos' | 'lidos')}
            className="alerta-lista__select"
            aria-label="Filtrar por status de leitura"
          >
            <option value="all">Todos</option>
            <option value="nao-lidos">Não lidos</option>
            <option value="lidos">Lidos</option>
          </select>

          <label htmlFor="alerta-busca" className="visually-hidden">Buscar alertas</label>
          <input
            id="alerta-busca"
            type="search"
            placeholder="Buscar..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="alerta-lista__busca"
            aria-label="Buscar alertas"
          />

          <label className="alerta-lista__toggle">
            <input
              type="checkbox"
              checked={agruparPorSeveridade}
              onChange={e => setAgruparPorSeveridade(e.target.checked)}
              aria-label="Agrupar por severidade"
            />
            <span>Agrupar por severidade</span>
          </label>

          {mostrarAcoes && onLimparLidos && naoLidosCount > 0 && (
            <button
              onClick={onLimparLidos}
              className="alerta-lista__btn alerta-lista__btn--secondary"
              aria-label="Marcar todos como lidos"
            >
              Marcar todos como lidos
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="alerta-lista__container" role="list" aria-label="Lista de alertas">
        {alertasAgrupados.map((grupo, grupoIndex) => (
          <React.Fragment key={grupoIndex}>
            {agruparPorSeveridade && (
              <div className="alerta-lista__grupo" style={{ borderLeftColor: SEVERIDADE_CORES[grupo.severidade] }}>
                <span className="alerta-lista__grupo-label">
                  {SEVERIDADES_ALERTA.find(s => s.value === grupo.severidade)?.label} ({grupo.alertas.length})
                </span>
              </div>
            )}
            {grupo.alertas.map((alerta, index) => (
              <article
                key={`${grupo.severidade}-${alerta.id}-${index}`}
                className={`alerta-lista__item alerta-lista__item--${alerta.severidade} ${alerta.lido ? 'alerta-lista__item--lido' : ''} ${alerta.reconhecido ? 'alerta-lista__item--reconhecido' : ''}`}
                role="listitem"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!alerta.lido) onMarcarLido?.(alerta.id);
                  }
                }}
              >
                <div className="alerta-lista__icone" style={{ color: SEVERIDADE_CORES[alerta.severidade] }} aria-hidden="true">
                  {SEVERIDADE_ICONES[alerta.severidade]}
                </div>

                <div className="alerta-lista__conteudo">
                  <header className="alerta-lista__cabecalho">
                    <span className="alerta-lista__tipo">{TIPO_LABELS[alerta.tipo]}</span>
                    <time className="alerta-lista__tempo" dateTime={alerta.criadoEm}>
                      {formatarDataRelativa(alerta.criadoEm)}
                    </time>
                  </header>

                  <p className="alerta-lista__mensagem">{alerta.mensagem}</p>

                  <footer className="alerta-lista__rodape">
                    <div className="alerta-lista__metricas">
                      <span className="alerta-lista__metrica">
                        <span className="alerta-lista__metrica-label">Atual</span>
                        <span className="alerta-lista__metrica-valor">{formatarMoeda(alerta.valorAtual)}</span>
                      </span>
                      <span className="alerta-lista__metrica">
                        <span className="alerta-lista__metrica-label">Limite</span>
                        <span className="alerta-lista__metrica-valor">{formatarMoeda(alerta.valorLimite)}</span>
                      </span>
                      <span className="alerta-lista__metrica">
                        <span className="alerta-lista__metrica-label">Uso</span>
                        <span className="alerta-lista__metrica-valor">{formatarPercentual(alerta.percentualUso)}</span>
                      </span>
                    </div>

                    {mostrarAcoes && (
                      <div className="alerta-lista__acoes">
                        {!alerta.lido && onMarcarLido && (
                          <button
                            onClick={e => handleMarcarLido(alerta.id, e)}
                            className="alerta-lista__btn alerta-lista__btn--primary"
                            aria-label="Marcar como lido"
                            title="Marcar como lido"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                        )}

                        {!alerta.reconhecido && onMarcarReconhecido && (
                          <button
                            onClick={e => handleMarcarReconhecido(alerta.id, e)}
                            className="alerta-lista__btn alerta-lista__btn--secondary"
                            aria-label="Reconhecer alerta"
                            title="Reconhecer"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                          </button>
                        )}

                        {alerta.orcamentoId && onVerOrcamento && (
                          <button
                            onClick={e => handleVerOrcamento(alerta.orcamentoId, e)}
                            className="alerta-lista__btn alerta-lista__btn--ghost"
                            aria-label="Ver orçamento"
                            title="Ver orçamento"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                        )}
                      </div>
                    )}
                  </footer>
                </div>

                <div className="alerta-lista__severidade-barra" style={{ backgroundColor: SEVERIDADE_CORES[alerta.severidade] }} aria-hidden="true" />
              </article>
            ))}
          </React.Fragment>
        ))}

        {alertasFiltrados.length === 0 && alertas.length > 0 && (
          <div className="alerta-lista__vazio-filtro">
            <p>Nenhum alerta encontrado com os filtros atuais</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertaLista;