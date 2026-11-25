/**
 * Modal de Confirmação - Acessível, focus trap, ESC para fechar.
 * 6 estados visuais, WCAG 2.2 AA, prefers-reduced-motion.
 */

import { useEffect, useRef, useCallback } from 'react';
import './ModalConfirmacao.css';

interface ModalConfirmacaoProps {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  variante?: 'perigo' | 'aviso' | 'info';
  aoConfirmar: () => Promise<void>;
  aoCancelar: () => void;
  textoConfirmar?: string;
  textoCancelar?: string;
  carregando?: boolean;
}

export function ModalConfirmacao({
  aberto,
  titulo,
  mensagem,
  variante = 'info',
  aoConfirmar,
  aoCancelar,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  carregando = false,
}: ModalConfirmacaoProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const focusableElementsRef = useRef<HTMLElement[]>([]);

  // Focus trap
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!aberto) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      aoCancelar();
      return;
    }

    if (e.key === 'Tab') {
      const focusableElements = focusableElementsRef.current;
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [aberto, aoCancelar]);

  useEffect(() => {
    if (aberto) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);

      // Focar no botão de cancelar por padrão (mais seguro)
      setTimeout(() => {
        const cancelBtn = contentRef.current?.querySelector('[data-action="cancelar"]') as HTMLElement;
        cancelBtn?.focus();
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

  // Atualizar elementos focáveis
  useEffect(() => {
    if (contentRef.current) {
      focusableElementsRef.current = Array.from(
        contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    }
  }, [aberto]);

  if (!aberto) return null;

  const icones = {
    perigo: '⚠️',
    aviso: '⚠️',
    info: 'ℹ️',
  };

  const varianteClasses = {
    perigo: 'modal-perigo',
    aviso: 'modal-aviso',
    info: 'modal-info',
  };

  return (
    <div
      className={`modal-overlay ${varianteClasses[variante]}`}
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) aoCancelar(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
      aria-describedby="modal-mensagem"
    >
      <div
        className="modal-content"
        ref={contentRef}
        role="document"
      >
        <header className="modal-header">
          <div className="modal-icone" aria-hidden="true">{icones[variante]}</div>
          <h2 id="modal-titulo" className="modal-titulo">{titulo}</h2>
          <button
            className="modal-fechar"
            onClick={aoCancelar}
            aria-label="Fechar"
            data-action="fechar"
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          <p id="modal-mensagem" className="modal-mensagem">{mensagem}</p>
        </div>

        <footer className="modal-footer">
          <button
            className="btn btn-secundario"
            onClick={aoCancelar}
            disabled={carregando}
            data-action="cancelar"
          >
            {textoCancelar}
          </button>
          <button
            className={`btn ${variante === 'perigo' ? 'btn-perigo' : 'btn-primario'}`}
            onClick={aoConfirmar}
            disabled={carregando}
            data-action="confirmar"
          >
            {carregando ? 'Processando...' : textoConfirmar}
          </button>
        </footer>
      </div>
    </div>
  );
}