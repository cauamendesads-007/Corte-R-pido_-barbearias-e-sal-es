/**
 * Modal de Sucesso do Checkout - Confirmação, detalhes, próximos passos.
 * Acessível, focus trap, WCAG 2.2 AA.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { CheckoutSession } from '../types';
import { formatarMoeda, formatarDataRelativa } from '../types';
import './ModalSucesso.css';

interface ModalSucessoProps {
  sessao: CheckoutSession;
  aoFechar: () => void;
}

export function ModalSucesso({ sessao, aoFechar }: ModalSucessoProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const metodoLabels: Record<string, { label: string; icone: string }> = {
    pix: { label: 'Pix', icone: '💡' },
    cartao: { label: 'Cartão de crédito', icone: '💳' },
    boleto: { label: 'Boleto bancário', icone: '📄' },
  };

  const metodo = metodoLabels[sessao.metodo] || { label: sessao.metodo, icone: '💰' };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      aoFechar();
    }
  }, [aoFechar]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
      aoFechar();
    }
  }, [aoFechar]);

  // Focus trap
  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    setTimeout(() => {
      const btnFechar = contentRef.current?.querySelector('[data-action="fechar"]') as HTMLElement;
      btnFechar?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [handleKeyDown]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div
      className="modal-overlay modal-sucesso"
      onClick={aoFechar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sucesso-titulo"
      aria-describedby="sucesso-descricao"
    >
      <div
        ref={contentRef}
        className="modal-content"
        role="document"
        onClick={e => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-icone sucesso" aria-hidden="true">✓</div>
          <h2 id="sucesso-titulo" className="modal-titulo">Pagamento aprovado!</h2>
        </header>

        <div className="modal-body">
          <p id="sucesso-descricao" className="modal-descricao">
            Seu pagamento de <strong>{formatarMoeda(sessao.total)}</strong> foi confirmado.
          </p>

          <div className="sucesso-detalhes">
            <div className="detalhe-item">
              <span className="detalhe-label">Método</span>
              <span className="detalhe-valor">
                <span className="metodo-icone" aria-hidden="true">{metodo.icone}</span>
                {metodo.label}
              </span>
            </div>

            {sessao.cartao && (
              <div className="detalhe-item">
                <span className="detalhe-label">Cartão</span>
                <span className="detalhe-valor">Final {sessao.cartao.numero?.slice(-4)}</span>
              </div>
            )}

            {sessao.cartao && sessao.cartao.parcelas > 1 && (
              <div className="detalhe-item">
                <span className="detalhe-label">Parcelamento</span>
                <span className="detalhe-valor">{sessao.cartao.parcelas}x de {formatarMoeda(Math.round(sessao.total / sessao.cartao.parcelas))}</span>
              </div>
            )}

            <div className="detalhe-item">
              <span className="detalhe-label">Data</span>
              <span className="detalhe-valor">{formatarDataRelativa(sessao.dataPagamento || sessao.dataCriacao)}</span>
            </div>

            <div className="detalhe-item">
              <span className="detalhe-label">ID da transação</span>
              <span className="detalhe-valor detalhe-id">{sessao.id}</span>
            </div>
          </div>

          <div className="sucesso-proximos">
            <h4>Próximos passos</h4>
            <ul>
              <li>Seu acesso foi liberado automaticamente</li>
              <li>Você receberá a confirmação por e-mail</li>
              <li>A fatura estará disponível na seção "Minhas assinaturas"</li>
            </ul>
          </div>
        </div>

        <footer className="modal-footer">
          <button
            className="btn btn-primario"
            onClick={aoFechar}
            data-action="fechar"
            autoFocus
          >
            Continuar
          </button>
        </footer>
      </div>
    </div>
  );
}