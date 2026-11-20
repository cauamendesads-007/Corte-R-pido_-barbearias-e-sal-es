/**
 * Componente CampoTexto - Input acessível com label, erro, ajuda e máscara opcional.
 * Segue WCAG AA: label associada, aria-describedby, aria-invalid.
 */

import React, { forwardRef, useId, useCallback } from 'react';
import type { PropsCampoTexto } from '@/tipos';
import { ICONES } from '@/constantes';
import { formatarWhatsapp } from '@/utilitarios';
import './CampoTexto.css';

interface CampoTextoProps extends PropsCampoTexto {
  iconePrefixo?: string;
  iconeSufixo?: React.ReactNode;
  aoClicarIconeSufixo?: () => void;
  className?: string;
  _valorComoNumero?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export const CampoTexto = forwardRef<HTMLInputElement, CampoTextoProps>(
  (
    {
      label,
      tipo = 'text',
      placeholder,
      valor,
      aoAlterar,
      erro,
      ajuda,
      desabilitado = false,
      obrigatorio = false,
      id: idProp,
      autoComplete,
      inputMode,
      maxLength,
      iconePrefixo,
      iconeSufixo,
      aoClicarIconeSufixo,
      className = '',
      min,
      max,
      step,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const idGerado = useId();
    const id = idProp || idGerado;
    const erroId = `${id}-erro`;
    const ajudaId = `${id}-ajuda`;
    const descricoes = [erro && erroId, ajuda && ajudaId].filter(Boolean).join(' ') || undefined;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        let novoValor = e.target.value;

        // Aplica máscara de WhatsApp se for tipo tel
        if (tipo === 'tel' && inputMode === 'tel') {
          novoValor = formatarWhatsapp(novoValor);
        }

        aoAlterar?.(novoValor);
      },
      [aoAlterar, tipo, inputMode]
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        // Reaplica formatação no blur para garantir consistência
        if (tipo === 'tel' && inputMode === 'tel') {
          const formatado = formatarWhatsapp(e.target.value);
          if (formatado !== e.target.value) {
            aoAlterar?.(formatado);
          }
        }
      },
      [aoAlterar, tipo, inputMode]
    );

    const classes = [
      'campo-texto',
      className,
      erro && 'campo-texto--erro',
      desabilitado && 'campo-texto--desabilitado',
      iconePrefixo && 'campo-texto--com-prefixo',
      iconeSufixo && 'campo-texto--com-sufixo',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={classes} data-testid={testId}>
        <label htmlFor={id} className="campo-texto__label">
          {label}
          {obrigatorio && <span className="campo-texto__obrigatorio" aria-hidden="true">*</span>}
        </label>

        <div className="campo-texto__wrapper">
          {iconePrefixo && (
            <span className="campo-texto__prefixo" aria-hidden="true">
              {iconePrefixo}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            type={tipo as React.InputHTMLAttributes<HTMLInputElement>['type']}
            placeholder={placeholder}
            value={valor}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={desabilitado}
            required={obrigatorio}
            autoComplete={autoComplete}
            inputMode={inputMode as React.InputHTMLAttributes<HTMLInputElement>['inputMode']}
            maxLength={maxLength}
            min={min}
            max={max}
            step={step}
            aria-invalid={erro ? 'true' : 'false'}
            aria-describedby={descricoes}
            aria-required={obrigatorio}
            className="campo-texto__input"
            {...props}
          />

          {iconeSufixo && (
            <button
              type="button"
              className="campo-texto__sufixo"
              onClick={aoClicarIconeSufixo}
              aria-label={tipo === 'password' ? 'Alternar visibilidade da senha' : undefined}
              disabled={desabilitado}
              tabIndex={-1}
            >
              {iconeSufixo}
            </button>
          )}
        </div>

        {erro && (
          <p id={erroId} className="campo-texto__erro" role="alert">
            {ICONES.alerta} {erro}
          </p>
        )}

        {ajuda && !erro && (
          <p id={ajudaId} className="campo-texto__ajuda">
            {ajuda}
          </p>
        )}
      </div>
    );
  }
);

CampoTexto.displayName = 'CampoTexto';

/** Props base para campos derivados */
interface CampoDerivadoProps extends Omit<PropsCampoTexto, 'tipo' | 'inputMode'> {
  iconePrefixo?: string;
  iconeSufixo?: React.ReactNode;
  aoClicarIconeSufixo?: () => void;
  className?: string;
  'data-testid'?: string;
}

/** Campo de senha com botão mostrar/ocultar */
export const CampoSenha = ({
  aoClicarIconeSufixo,
  aoAlternarVisibilidade,
  mostrarSenha,
  ...props
}: CampoDerivadoProps & {
  mostrarSenha?: boolean;
  aoAlternarVisibilidade?: (_mostrar: boolean) => void;
}) => {
  const [mostrarInterno, setMostrarInterno] = React.useState(false);
  const controlado = typeof mostrarSenha === 'boolean';
  const _mostrar = controlado ? mostrarSenha : mostrarInterno;

  const handleToggle = () => {
    const novoEstado = !_mostrar;
    if (!controlado) {
      setMostrarInterno(novoEstado);
    }
    aoClicarIconeSufixo?.();
    aoAlternarVisibilidade?.(novoEstado);
  };

  return (
    <CampoTexto
      tipo={_mostrar ? 'text' : 'password'}
      iconeSufixo={_mostrar ? ICONES.olhoFechado : ICONES.olho}
      aoClicarIconeSufixo={handleToggle}
      {...props}
    />
  );
};

/** Campo de busca com ícone de lupa */
export const CampoBusca = ({
  iconePrefixo = ICONES.busca,
  placeholder = 'Buscar...',
  label = 'Buscar',
  ...props
}: CampoDerivadoProps & { label?: string; placeholder?: string }) => (
  <CampoTexto
    tipo="search"
    iconePrefixo={iconePrefixo}
    placeholder={placeholder}
    autoComplete="off"
    label={label}
    {...props}
  />
);

/** Campo WhatsApp com máscara automática */
export const CampoWhatsapp = ({
  iconePrefixo = ICONES.telefone,
  placeholder = '(DD) 9xxxx-xxxx',
  inputMode = 'tel',
  maxLength = 15,
  ...props
}: CampoDerivadoProps & { placeholder?: string; inputMode?: string; maxLength?: number }) => (
  <CampoTexto
    tipo="tel"
    iconePrefixo={iconePrefixo}
    placeholder={placeholder}
    inputMode={inputMode}
    maxLength={maxLength}
    autoComplete="tel"
    {...props}
  />
);

/** Campo numérico com stepper */
export const CampoNumero = ({
  min,
  max,
  step = 1,
  iconeSufixo,
  ...props
}: CampoDerivadoProps & { min?: number; max?: number; step?: number }) => (
  <CampoTexto
    tipo="number"
    inputMode="numeric"
    iconeSufixo={iconeSufixo}
    min={min}
    max={max}
    step={step}
    {...props}
  />
);