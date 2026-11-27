/**
 * OrcamentoCard - Card de orçamento com progresso visual, status e ações.
 * Acessível, responsivo, com estados de loading e erro.
 */

import React, { useState, useMemo } from 'react';
import type { Orcamento, CentroCusto, StatusOrcamento } from '../types';
import { obterStatusOrcamento, obterCorStatus, formatarMoeda, formatarPercentual } from '../types';
import './OrcamentoCard.css';

interface OrcamentoCardProps {
  orcamento: Orcamento;
  centroCusto?: CentroCusto;
  onEditar?: (orcamento: Orcamento) => void;
  onRemover?: (id: string) => void;
  onVerDetalhes?: (orcamento: Orcamento) => void;
  compacto?: boolean;
  carregando?: boolean;
}

export const OrcamentoCard: React.FC<OrcamentoCardProps> = ({
  orcamento,
  centroCusto,
  onEditar,
  onRemover,
  onVerDetalhes,
  compacto = false,
  carregando = false,
}) => {
  const [expandido, setExpandido] = useState(false);

  const status = useMemo(() => obterStatusOrcamento(orcamento.valorGasto, orcamento.valorLimite, orcamento.alertaPercentual), [orcamento]);
  const corStatus = useMemo(() => obterCorStatus(status), [status]);
  const percentual = useMemo(() => orcamento.valorLimite > 0 ? (orcamento.valorGasto / orcamento.valorLimite) * 100 : 0, [orcamento]);
  const valorRestante = orcamento.valorLimite - orcamento.valorGasto;
  const projecaoExcedente = orcamento.valorProjetado > orcamento.valorLimite ? orcamento.valorProjetado - orcamento.valorLimite : 0;

  const formatarStatus = (s: StatusOrcamento) => {
    switch (s) {
      case 'dentro': return 'Dentro do orçamento';
      case 'atencao': return 'Atenção';
      case 'critico': return 'Crítico';
      case 'estourou': return 'Estourou';
    }
  };

  if (carregando) {
    return (
      <div className="orcamento-card orcamento-card--loading" aria-busy="true">
        <div className="orcamento-card__skeleton" />
        <div className="orcamento-card__skeleton" style={{ width: '60%' }} />
        <div className="orcamento-card__skeleton" style={{ width: '100%', height: 8 }} />
        <div className="orcamento-card__skeleton" style={{ width: '80%', height: 8 }} />
      </div>
    );
  }

  return (
    <article
      className={`orcamento-card orcamento-card--${status} ${compacto ? 'orcamento-card--compacto' : ''} ${expandido ? 'orcamento-card--expandido' : ''}`}
      style={{ '--status-color': corStatus } as React.CSSProperties}
    >
      {/* Header */}
      <header className="orcamento-card__header">
        <div className="orcamento-card__info">
          <h3 className="orcamento-card__nome">{orcamento.nome}</h3>
          {centroCusto && (
            <span className="orcamento-card__centro">{centroCusto.nome}</span>
          )}
          <span className="orcamento-card__periodo">{orcamento.periodo}</span>
        </div>

        <div className="orcamento-card__status" style={{ backgroundColor: corStatus }}>
          <span className="orcamento-card__status-label">{formatarStatus(status)}</span>
          <span className="orcamento-card__status-percent">{formatarPercentual(percentual)}</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="orcamento-card__progress" role="progressbar" aria-valuenow={Math.round(percentual)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso do orçamento: ${formatarPercentual(percentual)}`}>
        <div
          className="orcamento-card__progress-bar"
          style={{ width: `${Math.min(percentual, 100)}%`, backgroundColor: corStatus }}
        />
        {percentual > 100 && (
          <div
            className="orcamento-card__progress-excesso"
            style={{ left: '100%', width: `${Math.min((percentual - 100) * 2, 50)}%` }}
          />
        )}
        {orcamento.alertaPercentual < 100 && (
          <div
            className="orcamento-card__progress-alerta"
            style={{ left: `${orcamento.alertaPercentual}%` }}
            title={`Alerta em ${orcamento.alertaPercentual}%`}
          />
        )}
      </div>

      {/* Valores */}
      <div className="orcamento-card__valores">
        <div className="orcamento-card__valor">
          <span className="orcamento-card__valor-label">Gasto</span>
          <span className="orcamento-card__valor-valor">{formatarMoeda(orcamento.valorGasto)}</span>
        </div>
        <div className="orcamento-card__valor">
          <span className="orcamento-card__valor-label">Limite</span>
          <span className="orcamento-card__valor-valor">{formatarMoeda(orcamento.valorLimite)}</span>
        </div>
        {!compacto && (
          <>
            <div className="orcamento-card__valor orcamento-card__valor--restante">
              <span className="orcamento-card__valor-label">Restante</span>
              <span className="orcamento-card__valor-valor" style={{ color: valorRestante >= 0 ? 'var(--success)' : 'var(--error)' }}>
                {formatarMoeda(Math.abs(valorRestante))}
              </span>
            </div>
            {orcamento.valorProjetado > 0 && (
              <div className="orcamento-card__valor orcamento-card__valor--projetado">
                <span className="orcamento-card__valor-label">Projetado</span>
                <span className="orcamento-card__valor-valor" style={{ color: projecaoExcedente > 0 ? 'var(--warning)' : 'inherit' }}>
                  {formatarMoeda(orcamento.valorProjetado)}
                  {projecaoExcedente > 0 && (
                    <span className="orcamento-card__excedente">(+{formatarMoeda(projecaoExcedente)} excedente)</span>
                  )}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Expandir/Colapsar */}
      {!compacto && (
        <button
          className="orcamento-card__toggle"
          onClick={() => setExpandido(!expandido)}
          aria-expanded={expandido}
          aria-controls="orcamento-detalhes"
        >
          {expandido ? 'Menos detalhes ▲' : 'Mais detalhes ▼'}
        </button>
      )}

      {/* Detalhes Expandidos */}
      {!compacto && expandido && (
        <div id="orcamento-detalhes" className="orcamento-card__detalhes">
          <div className="orcamento-card__detalhe">
            <span className="orcamento-card__detalhe-label">Início da vigência</span>
            <span className="orcamento-card__detalhe-valor">{new Date(orcamento.inicioVigencia).toLocaleDateString('pt-BR')}</span>
          </div>
          {orcamento.fimVigencia && (
            <div className="orcamento-card__detalhe">
              <span className="orcamento-card__detalhe-label">Fim da vigência</span>
              <span className="orcamento-card__detalhe-valor">{new Date(orcamento.fimVigencia).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
          <div className="orcamento-card__detalhe">
            <span className="orcamento-card__detalhe-label">Alerta configurado</span>
            <span className="orcamento-card__detalhe-valor">{orcamento.alertaPercentual}%</span>
          </div>
          <div className="orcamento-card__detalhe">
            <span className="orcamento-card__detalhe-label">Severidade do alerta</span>
            <span className="orcamento-card__detalhe-valor">{orcamento.severidadeAlerta}</span>
          </div>
          <div className="orcamento-card__detalhe">
            <span className="orcamento-card__detalhe-label">Criado em</span>
            <span className="orcamento-card__detalhe-valor">{new Date(orcamento.criadoEm).toLocaleString('pt-BR')}</span>
          </div>
          <div className="orcamento-card__detalhe">
            <span className="orcamento-card__detalhe-label">Atualizado em</span>
            <span className="orcamento-card__detalhe-valor">{new Date(orcamento.atualizadoEm).toLocaleString('pt-BR')}</span>
          </div>
        </div>
      )}

      {/* Ações */}
      <footer className="orcamento-card__acoes">
        {onVerDetalhes && (
          <button
            className="orcamento-card__btn orcamento-card__btn--secondary"
            onClick={() => onVerDetalhes(orcamento)}
            disabled={carregando}
          >
            Ver detalhes
          </button>
        )}
        {onEditar && (
          <button
            className="orcamento-card__btn orcamento-card__btn--primary"
            onClick={() => onEditar(orcamento)}
            disabled={carregando}
          >
            Editar
          </button>
        )}
        {onRemover && (
          <button
            className="orcamento-card__btn orcamento-card__btn--danger"
            onClick={() => onRemover(orcamento.id)}
            disabled={carregando}
          >
            Remover
          </button>
        )}
      </footer>
    </article>
  );
};

export default OrcamentoCard;