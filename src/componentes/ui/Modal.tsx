/**
 * Componente Modal - Modal acessível com focus trap, ESC para fechar, backdrop.
 * Segue WAI-ARIA Dialog Pattern.
 */

import React, { useEffect, useRef, useCallback, Fragment } from 'react';
import { createPortal } from 'react-dom';
import type { PropsModal } from '@/tipos';
import { Icone } from './Icone';
import { BotaoIcone, BotaoPrimario, BotaoSecundario, BotaoPerigo } from './Botao';
import './Modal.css';

interface ModalProps extends PropsModal {
  className?: string;
}

export const Modal = React.forwardRef<HTMLDialogElement, ModalProps>(
  (
    {
      aberto,
      aoFechar,
      titulo,
      children,
      tamanho = 'medio',
      fecharComEsc = true,
      fecharNoBackdrop = true,
      className = '',
      ariaLabel,
      'data-testid': testId,
      ...props
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ref
  ) => {
    void _ref;
    const dialogRef = useRef<HTMLDialogElement>(null);
    const elementoAnteriorFoco = useRef<HTMLElement | null>(null);
    const focusableElementsRef = useRef<HTMLElement[]>([]);

    // Atualiza elementos focáveis quando o modal abre
    useEffect(() => {
      if (aberto && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusableElementsRef.current = Array.from(focusable).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
      }
    }, [aberto, children]);

    // Focus trap - handler nativo para document.addEventListener
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (!aberto) return;

        if (e.key === 'Escape' && fecharComEsc) {
          e.preventDefault();
          aoFechar();
          return;
        }

        if (e.key === 'Tab' && focusableElementsRef.current.length > 0) {
          const primeiro = focusableElementsRef.current[0];
          const ultimo = focusableElementsRef.current[focusableElementsRef.current.length - 1];

          if (e.shiftKey && document.activeElement === primeiro) {
            e.preventDefault();
            ultimo.focus();
          } else if (!e.shiftKey && document.activeElement === ultimo) {
            e.preventDefault();
            primeiro.focus();
          }
        }
      },
      [aberto, fecharComEsc, aoFechar]
    );

    // Wrapper para React event (dialog onKeyDown)
    const handleKeyDownReact = useCallback(
      (e: React.KeyboardEvent) => {
        handleKeyDown(e.nativeEvent);
      },
      [handleKeyDown]
    );

    // Gerencia ciclo de vida do modal
    useEffect(() => {
      if (aberto) {
        elementoAnteriorFoco.current = document.activeElement as HTMLElement;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        // Foca no primeiro elemento focável após render
        setTimeout(() => {
          if (focusableElementsRef.current.length > 0) {
            focusableElementsRef.current[0].focus();
          } else {
            dialogRef.current?.focus();
          }
        }, 0);
      } else {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);

        // Restaura foco no elemento que abriu o modal
        if (elementoAnteriorFoco.current) {
          elementoAnteriorFoco.current.focus();
          elementoAnteriorFoco.current = null;
        }
      }

      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [aberto, handleKeyDown]);

    if (!aberto) return null;

    const classes = [
      'modal',
      `modal--${tamanho}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const backdropClasses = ['modal__backdrop', aberto && 'modal__backdrop--visivel'].filter(Boolean).join(' ');

    const conteudoModal = (
      <Fragment>
        <div
          className={backdropClasses}
          onClick={fecharNoBackdrop ? aoFechar : undefined}
          aria-hidden="true"
          data-testid={`${testId}-backdrop`}
        />
        <dialog
          ref={dialogRef}
          className={classes}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titulo ? `${testId}-titulo` : undefined}
          aria-label={!titulo ? ariaLabel : undefined}
          onKeyDown={handleKeyDownReact}
          data-testid={testId}
          {...props}
        >
          { titulo && (
            <header className="modal__cabecalho">
              <h2 id={`${testId}-titulo`} className="modal__titulo">
                {titulo}
              </h2>
              <BotaoIcone
                icone={<Icone nome="fechar" tamanho={16} />}
                ariaLabel="Fechar modal"
                variante="fantasma"
                tamanho="pequeno"
                aoClicar={aoFechar}
                data-testid={`${testId}-fechar`}
              />
            </header>
          )}

          <div className="modal__corpo" data-testid={`${testId}-corpo`}>
            {children}
          </div>
        </dialog>
      </Fragment>
    );

    // Renderiza no body para evitar problemas de z-index e overflow
    return createPortal(conteudoModal, document.body);
  }
);

Modal.displayName = 'Modal';

/** Modal de confirmação simples */
interface ModalConfirmacaoProps {
  aberto: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  varianteConfirmar?: 'primario' | 'perigo';
  carregando?: boolean;
}

export const ModalConfirmacao = ({
  aberto,
  aoFechar,
  aoConfirmar,
  titulo,
  mensagem,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  varianteConfirmar = 'perigo',
  carregando = false,
}: ModalConfirmacaoProps) => {
  const BotaoConfirmar = varianteConfirmar === 'perigo' ? BotaoPerigo : BotaoPrimario;

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      tamanho="pequeno"
      data-testid="modal-confirmacao"
    >
      <p className="modal-confirmacao__mensagem">{mensagem}</p>
      <div className="modal-confirmacao__acoes">
        <BotaoSecundario aoClicar={aoFechar} desabilitado={carregando}>
          {textoCancelar}
        </BotaoSecundario>
        <BotaoConfirmar aoClicar={aoConfirmar} carregando={carregando}>
          {textoConfirmar}
        </BotaoConfirmar>
      </div>
    </Modal>
  );
};

/** Modal de formulário genérico */
interface ModalFormularioProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: React.ReactNode;
  aoSalvar: () => void;
  textoSalvar?: string;
  carregando?: boolean;
  tamanho?: 'pequeno' | 'medio' | 'grande' | 'tela-cheia';
}

export const ModalFormulario = ({
  aberto,
  aoFechar,
  titulo,
  children,
  aoSalvar,
  textoSalvar = 'Salvar',
  carregando = false,
  tamanho = 'medio',
}: ModalFormularioProps) => (
  <Modal
    aberto={aberto}
    aoFechar={aoFechar}
    titulo={titulo}
    tamanho={tamanho}
    data-testid="modal-formulario"
  >
    <form className="modal-formulario" onSubmit={(e) => { e.preventDefault(); aoSalvar(); }}>
      {children}
      <div className="modal-formulario__acoes">
        <BotaoSecundario tipo="button" aoClicar={aoFechar} desabilitado={carregando}>
          Cancelar
        </BotaoSecundario>
        <BotaoPrimario tipo="submit" carregando={carregando}>
          {textoSalvar}
        </BotaoPrimario>
      </div>
    </form>
  </Modal>
);