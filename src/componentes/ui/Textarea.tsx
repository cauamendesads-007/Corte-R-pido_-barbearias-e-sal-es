/**
 * Componente Textarea - Área de texto acessível com contagem de caracteres, redimensionamento.
 * Estende CampoTexto com funcionalidades específicas de textarea.
 */

import React, { forwardRef, useId, useState, useCallback } from 'react';
import type { PropsCampoTexto } from '@/tipos';
import { ICONES } from '@/constantes';
import './Textarea.css';

interface TextareaProps extends Omit<PropsCampoTexto, 'tipo' | 'inputMode'> {
  linhas?: number;
  maxLength?: number;
  mostrarContador?: boolean;
  autoResize?: boolean;
  className?: string;
  classNameTextarea?: string;
  'data-testid'?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      placeholder,
      valor,
      aoAlterar,
      erro,
      ajuda,
      desabilitado = false,
      obrigatorio = false,
      id: idProp,
      autoComplete,
      maxLength,
      linhas = 3,
      mostrarContador = false,
      autoResize = false,
      className = '',
      classNameTextarea = '',
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const idGerado = useId();
    const id = idProp || idGerado;
    const erroId = `${id}-erro`;
    const ajudaId = `${id}-ajuda`;
    const contadorId = `${id}-contador`;
    const descricoes = [
      erro && erroId,
      ajuda && ajudaId,
      mostrarContador && maxLength && contadorId,
    ].filter(Boolean).join(' ') || undefined;

    const [alturaAuto, setAlturaAuto] = useState<number | string>('auto');

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const novoValor = e.target.value;
        aoAlterar?.(novoValor);

        if (autoResize) {
          // Força recálculo da altura
          setAlturaAuto('auto');
          requestAnimationFrame(() => {
            if (e.target.scrollHeight > 0) {
              setAlturaAuto(e.target.scrollHeight);
            }
          });
        }
      },
      [aoAlterar, autoResize]
    );

    const handleBlur = useCallback(
      (_: React.FocusEvent<HTMLTextAreaElement>) => {
        void _;
        // onBlur pode ser passado via props se necessário
      },
      []
    );

    const mostrarContadorEfetivo = mostrarContador || !!maxLength;

    const classes = [
      'textarea',
      className,
      erro && 'textarea--erro',
      desabilitado && 'textarea--desabilitado',
      mostrarContadorEfetivo && maxLength && 'textarea--com-contador',
    ]
      .filter(Boolean)
      .join(' ');

    const textareaClasses = [
      'textarea__input',
      className, // apply className to textarea for backwards compatibility
      classNameTextarea,
    ]
      .filter(Boolean)
      .join(' ');

    const comprimento = valor?.length || 0;
    const excedeu = maxLength && comprimento > maxLength;

    return (
      <div className={classes} data-testid={testId}>
        <label htmlFor={id} className="textarea__label">
          {label}
          {obrigatorio && <span className="textarea__obrigatorio" aria-hidden="true">*</span>}
        </label>

        <div className="textarea__wrapper">
          <textarea
            ref={ref}
            id={id}
            placeholder={placeholder}
            value={valor}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={desabilitado}
            required={obrigatorio}
            autoComplete={autoComplete}
            maxLength={maxLength}
            rows={linhas}
            aria-invalid={erro ? 'true' : 'false'}
            aria-describedby={descricoes}
            aria-required={obrigatorio}
            className={textareaClasses}
            style={{ height: autoResize ? alturaAuto : undefined } as React.CSSProperties}
            {...props}
          />
        </div>

        {erro && (
          <p id={erroId} className="textarea__erro" role="alert">
            {ICONES.alerta} {erro}
          </p>
        )}

        {ajuda && !erro && !mostrarContador && (
          <p id={ajudaId} className="textarea__ajuda">
            {ajuda}
          </p>
        )}

        {mostrarContadorEfetivo && maxLength && (
          <div id={contadorId} className={`textarea__contador ${excedeu ? 'textarea__contador--excedido' : ''}`} aria-live="polite">
            {comprimento}/{maxLength}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';