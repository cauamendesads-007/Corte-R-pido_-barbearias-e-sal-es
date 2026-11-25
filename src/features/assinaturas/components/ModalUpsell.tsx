/**
 * Modal de Upsell Contextual - Aparece ao atingir limite do plano.
 * Não bloqueia fluxo principal, dismissível, WCAG 2.2 AA.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import type { VerificacaoLimite, PlanoId } from '../types';
import { obterPlanoPorId, formatarMoeda } from '../types';
import './ModalUpsell.css';

interface ModalUpsellProps {
  aberto: boolean;
  verificacao: VerificacaoLimite | null;
  aoFechar: () => void;
  aoUpgrade: (_planoId: PlanoId) => void;
}

export function ModalUpsell({ aberto, verificacao, aoFechar, aoUpgrade }: ModalUpsellProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const planoSugerido = verificacao?.planoSugerido ? obterPlanoPorId(verificacao.planoSugerido) : null;
  const planoAtual = verificacao ? obterPlanoPorId(verificacao.recurso as string) : null;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!aberto) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      aoFechar();
    }
  }, [aberto, aoFechar]);

  // Focus trap
  useEffect(() => {
    if (aberto) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => {
        const btnFechar = contentRef.current?.querySelector('[data-action="fechar"]') as HTMLElement;
        btnFechar?.focus();
      }, 0);
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [aberto, handleKeyDown]);

  // Click outside para fechar
  useEffect(() => {
    if (!aberto) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        aoFechar();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [aberto, aoFechar]);

  if (!aberto || !verificacao || !verificacao.planoSugerido || !planoSugerido) return null;

  const recursoLabels: Record<string, string> = {
    barbeiros: 'barbeiros',
    cadeiras: 'cadeiras',
    agendamentosMes: 'agendamentos por mês',
  };

  const recursoAtual = verificacao.limiteAtual;
  const recursoMaximo = verificacao.limiteMaximo;
  const recursoLabel = recursoLabels[verificacao.recurso] || verificacao.recurso;

  return (
    <div
      className="modal-overlay modal-upsell"
      onClick={aoFechar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-titulo"
      aria-describedby="upsell-mensagem"
    >
      <div
        ref={contentRef}
        className="modal-content"
        role="document"
        onClick={e => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-icone" aria-hidden="true">🚀</div>
          <h2 id="upsell-titulo" className="modal-titulo">Limite atingido</h2>
          <button
            className="modal-fechar"
            onClick={aoFechar}
            aria-label="Fechar"
            data-action="fechar"
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          <p id="upsell-mensagem" className="modal-mensagem">
            {verificacao.mensagemUpsell}
          </p>

          <div className="upsell-comparacao">
            <div className="upsell-plano-atual">
              <span className="upsell-plano-label">Seu plano atual</span>
              <div className="upsell-limite-atual">
                <span className="upsell-valor">{recursoAtual}</span>
                <span className="upsell-maximo">de {recursoMaximo === -1 ? '∞' : recursoMaximo} {recursoLabel}</span>
              </div>
              <div className="upsell-barra">
                <div
                  className="upsell-barra-preenchimento"
                  style={{
                    width: recursoMaximo === -1 ? '100%' : `${Math.min(100, (recursoAtual / recursoMaximo) * 100)}%`
                  }}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="upsell-seta" aria-hidden="true">→</div>

            <div className="upsell-plano-sugerido">
              <span className="upsell-plano-label">Plano {planoSugerido.nome}</span>
              <div className="upsell-limite-sugerido">
                <span className="upsell-valor">{planoSugerido.limites[verificacao.recurso] === -1 ? '∞' : planoSugerido.limites[verificacao.recurso]}</span>
                <span className="upsell-maximo">{recursoLabel}</span>
              </div>
              <div className="upsell-preco">
                {formatarMoeda(planoSugerido.precoMensal)}/mês
              </div>
            </div>
          </div>

          <ul className="upsell-beneficios" aria-label="Benefícios adicionais">
            {planoSugerido.limites.relatoriosFinanceiros && !planoAtual?.limites.relatoriosFinanceiros && (
              <li>✓ Relatórios financeiros completos</li>
            )}
            {planoSugerido.limites.apiAcesso && !planoAtual?.limites.apiAcesso && (
              <li>✓ Acesso à API para integrações</li>
            )}
            {planoSugerido.limites.suportePrioritario && !planoAtual?.limites.suportePrioritario && (
              <li>✓ Suporte prioritário</li>
            )}
            {planoSugerido.limites.marcaBranca && !planoAtual?.limites.marcaBranca && (
              <li>✓ Marca branca (white label)</li>
            )}
            {planoSugerido.limites.barbeiros === -1 && planoAtual?.limites.barbeiros !== -1 && (
              <li>✓ Barbeiros ilimitados</li>
            )}
            {planoSugerido.limites.cadeiras === -1 && planoAtual?.limites.cadeiras !== -1 && (
              <li>✓ Cadeiras ilimitadas</li>
            )}
            {planoSugerido.limites.agendamentosMes === -1 && planoAtual?.limites.agendamentosMes !== -1 && (
              <li>✓ Agendamentos ilimitados por mês</li>
            )}
          </ul>
        </div>

        <footer className="modal-footer">
          <button
            className="btn btn-secundario"
            onClick={aoFechar}
            data-action="fechar"
          >
            Agora não
          </button>
          <button
            className="btn btn-primario"
            onClick={() => {
              aoUpgrade(planoSugerido.id);
              aoFechar();
            }}
            data-action="upgrade"
          >
            Upgrade para {planoSugerido.nome}
          </button>
        </footer>
      </div>
    </div>
  );
}