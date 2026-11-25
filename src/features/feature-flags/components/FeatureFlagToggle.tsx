/**
 * FeatureFlagToggle - Componente para alternar feature flags (admin).
 * Acessível, com estados visuais claros, confirmação para flags críticas.
 */

import React, { useState, useCallback } from 'react';
import type { FeatureFlag, FlagEvaluation } from '../types';
import { formatarMoeda } from '@/utilitarios/formatar';
import { FLAGS_SISTEMA } from '../types';
import './FeatureFlagToggle.css';

export interface FeatureFlagToggleProps {
  flag: FeatureFlag;
  evaluation?: FlagEvaluation;
  onAlternar: (id: string, habilitada: boolean) => Promise<void>;
  onEditar?: (flag: FeatureFlag) => void;
  onRemover?: (id: string) => void;
  carregando?: boolean;
  compacto?: boolean;
}

const TIPO_LABELS: Record<FeatureFlag['tipo'], string> = {
  boolean: 'Booleana',
  string: 'Texto',
  number: 'Número',
  json: 'JSON',
};

const TIPO_ICONES: Record<FeatureFlag['tipo'], React.ReactNode> = {
  boolean: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M9 12l2 2 4-4"/></svg>,
  string: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  number: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><text x="12" y="16" textAnchor="middle" fontSize="10">123</text></svg>,
  json: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><polyline points="16 3 16 9 22 9"/></svg>,
};

export const FeatureFlagToggle: React.FC<FeatureFlagToggleProps> = ({
  flag,
  evaluation,
  onAlternar,
  onEditar,
  onRemover,
  carregando = false,
  compacto = false,
}) => {
  const [confirmando, setConfirmando] = useState(false);
  const habilitada = evaluation?.habilitada ?? flag.habilitada;

  const handleAlternar = useCallback(async () => {
    if (carregando) return;

    // Flags críticas pedem confirmação
    const ehCritica = flag.chave.includes('checkout') || flag.chave.includes('pagamento') || flag.chave.includes('assinatura');
    if (ehCritica && !confirmando) {
      setConfirmando(true);
      return;
    }

    try {
      await onAlternar(flag.id, !habilitada);
      setConfirmando(false);
    } catch {
      setConfirmando(false);
    }
  }, [flag, habilitada, onAlternar, carregando, confirmando]);

  const handleEditar = useCallback(() => {
    onEditar?.(flag);
  }, [flag, onEditar]);

  const handleRemover = useCallback(() => {
    if (window.confirm(`Remover flag "${flag.nome}"? Esta ação não pode ser desfeita.`)) {
      onRemover?.(flag.id);
    }
  }, [flag, onRemover]);

  const getValorDisplay = (): string => {
    if (!habilitada) return String(flag.valorPadrao);

    switch (flag.tipo) {
      case 'boolean':
        return flag.valorAtivo === true ? 'Sim' : 'Não';
      case 'number':
        return typeof flag.valorAtivo === 'number' ? formatarMoeda(flag.valorAtivo) : String(flag.valorAtivo);
      case 'string':
        return String(flag.valorAtivo);
      case 'json':
        return JSON.stringify(flag.valorAtivo).length > 50
          ? JSON.stringify(flag.valorAtivo).substring(0, 50) + '...'
          : JSON.stringify(flag.valorAtivo);
      default:
        return String(flag.valorAtivo);
    }
  };

  const getValorPadraoDisplay = (): string => {
    switch (flag.tipo) {
      case 'boolean':
        return flag.valorPadrao === true ? 'Sim' : 'Não';
      case 'number':
        return typeof flag.valorPadrao === 'number' ? formatarMoeda(flag.valorPadrao) : String(flag.valorPadrao);
      case 'string':
        return String(flag.valorPadrao);
      case 'json':
        return JSON.stringify(flag.valorPadrao).length > 50
          ? JSON.stringify(flag.valorPadrao).substring(0, 50) + '...'
          : JSON.stringify(flag.valorPadrao);
      default:
        return String(flag.valorPadrao);
    }
  };

  const motivoDisplay = evaluation?.motivo ? (
    <span className="feature-flag-toggle__motivo" title={evaluation.motivo}>
      {evaluation.motivo === 'rollout' ? 'Rollout' :
       evaluation.motivo === 'user_list' ? 'Lista usuários' :
       evaluation.motivo === 'attribute' ? 'Atributo' :
       evaluation.motivo === 'custom' ? 'Custom' :
       evaluation.motivo === 'dependency' ? 'Dependência' :
       evaluation.motivo}
    </span>
  ) : null;

  if (compacto) {
    return (
      <div className="feature-flag-toggle feature-flag-toggle--compacto">
        <div className="feature-flag-toggle__info">
          <span className="feature-flag-toggle__chave">{flag.chave}</span>
          <span className="feature-flag-toggle__tipo">{TIPO_LABELS[flag.tipo]}</span>
        </div>
        <label className="feature-flag-toggle__switch">
          <input
            type="checkbox"
            checked={habilitada}
            onChange={() => handleAlternar()}
            disabled={carregando}
            aria-label={`Ativar ${flag.nome}`}
          />
          <span className="feature-flag-toggle__slider" />
        </label>
      </div>
    );
  }

  return (
    <article className={`feature-flag-toggle ${habilitada ? 'feature-flag-toggle--ativo' : ''} ${confirmando ? 'feature-flag-toggle--confirmando' : ''}`}>
      <header className="feature-flag-toggle__header">
        <div className="feature-flag-toggle__identidade">
          <span className="feature-flag-toggle__icone" aria-hidden="true">
            {TIPO_ICONES[flag.tipo as keyof typeof TIPO_ICONES]}
          </span>
          <div className="feature-flag-toggle__nome-desc">
            <h4 className="feature-flag-toggle__nome">{flag.nome}</h4>
            {flag.descricao && <p className="feature-flag-toggle__desc">{flag.descricao}</p>}
          </div>
        </div>

        <div className="feature-flag-toggle__badges">
          <span className="feature-flag-toggle__tipo-badge">{TIPO_LABELS[flag.tipo]}</span>
          {flag.tags?.map(tag => (
            <span key={tag} className="feature-flag-toggle__tag">{tag}</span>
          ))}
          {flag.dependencias && flag.dependencias.length > 0 && (
            <span className="feature-flag-toggle__tag feature-flag-toggle__tag--dependencia">
              {flag.dependencias.length} dep.
            </span>
          )}
        </div>
      </header>

      <div className="feature-flag-toggle__valores">
        <div className="feature-flag-toggle__valor">
          <span className="feature-flag-toggle__valor-label">Quando ativa</span>
          <span className="feature-flag-toggle__valor-atual">{getValorDisplay()}</span>
        </div>
        <div className="feature-flag-toggle__valor">
          <span className="feature-flag-toggle__valor-label">Quando inativa</span>
          <span className="feature-flag-toggle__valor-padrao">{getValorPadraoDisplay()}</span>
        </div>
      </div>

      {evaluation && (
        <div className="feature-flag-toggle__avaliacao">
          <span className="feature-flag-toggle__avaliacao-label">Última avaliação:</span>
          <span className="feature-flag-toggle__avaliacao-valor">
            {motivoDisplay}
            <time dateTime={evaluation.avaliadoEm}>
              {' '}
              {new Date(evaluation.avaliadoEm).toLocaleTimeString('pt-BR')}
            </time>
          </span>
        </div>
      )}

      <footer className="feature-flag-toggle__acoes">
        <label className="feature-flag-toggle__switch-container">
          <span className="feature-flag-toggle__switch-label">{habilitada ? 'ATIVA' : 'INATIVA'}</span>
          <label className="feature-flag-toggle__switch">
            <input
              type="checkbox"
              checked={habilitada}
              onChange={() => handleAlternar()}
              disabled={carregando}
              aria-label={`${habilitada ? 'Desativar' : 'Ativar'} ${flag.nome}`}
            />
            <span className="feature-flag-toggle__slider" />
          </label>
        </label>

        <div className="feature-flag-toggle__botoes">
          {onEditar && (
            <button
              onClick={handleEditar}
              className="feature-flag-toggle__btn feature-flag-toggle__btn--secondary"
              disabled={carregando}
              aria-label={`Editar ${flag.nome}`}
            >
              Editar
            </button>
          )}

          {!FLAGS_SISTEMA?.some(f => f.id === flag.id) && onRemover && (
            <button
              onClick={handleRemover}
              className="feature-flag-toggle__btn feature-flag-toggle__btn--danger"
              disabled={carregando}
              aria-label={`Remover ${flag.nome}`}
            >
              Remover
            </button>
          )}
        </div>
      </footer>

      {confirmando && (
        <div className="feature-flag-toggle__confirmacao" role="alertdialog" aria-labelledby="confirm-titulo" aria-describedby="confirm-desc">
          <p id="confirm-titulo" className="feature-flag-toggle__confirmacao-titulo">Confirmar alteração?</p>
          <p id="confirm-desc" className="feature-flag-toggle__confirmacao-desc">
            Esta flag controla funcionalidade crítica ({flag.chave}). Tem certeza?
          </p>
          <div className="feature-flag-toggle__confirmacao-botoes">
            <button
              onClick={() => setConfirmando(false)}
              className="feature-flag-toggle__btn feature-flag-toggle__btn--secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleAlternar}
              className="feature-flag-toggle__btn feature-flag-toggle__btn--danger"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

export default FeatureFlagToggle;