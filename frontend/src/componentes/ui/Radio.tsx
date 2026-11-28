/**
 * Componente Radio - Radio button acessível com label, grupo, cards.
 * Segue WCAG: role="radio", aria-checked, focus visible, roving tabindex.
 */

import React, { forwardRef } from 'react';
import './Radio.css';

interface RadioProps {
  label?: string;
  descricao?: string;
  valor: string;
  verificado?: boolean;
  selecionado?: string; // alias for controlled selection (test compat)
  aoAlterar?: (_valor: string) => void;
  desabilitado?: boolean;
  obrigatorio?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'data-testid'?: string;
}

/** Radio individual */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      descricao,
      valor,
      verificado = false,
      selecionado,
      aoAlterar,
      desabilitado = false,
      obrigatorio = false,
      id: idProp,
      name,
      className = '',
      'data-testid': testId,
    },
    ref
  ) => {
    // Support selecionado prop for controlled selection (test compatibility)
    const isChecked = selecionado !== undefined ? selecionado === valor : verificado;
    const idGerado = React.useId();
    const id = idProp || idGerado;
    const descricaoId = `${id}-descricao`;

    const handleChange = () => {
      if (!desabilitado) {
        aoAlterar?.(valor);
      }
    };

    const classes = [
      'radio',
      className,
      desabilitado && 'radio--desabilitado',
      isChecked && 'radio--verificado',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={classes} data-testid={testId}>
        <input
          ref={ref}
          type="radio"
          id={id}
          name={name}
          value={valor}
          checked={isChecked}
          onChange={handleChange}
          disabled={desabilitado}
          required={obrigatorio}
          aria-checked={isChecked}
          aria-describedby={descricao ? descricaoId : undefined}
          aria-required={obrigatorio}
          className="radio__input"
        />
        <span className="radio__circulo" aria-hidden="true">
          <span className="radio__ponto" />
        </span>
        {(label || descricao) && (
          <label htmlFor={id} className="radio__label">
            {label && <span className="radio__texto">{label}</span>}
            {descricao && <span id={descricaoId} className="radio__descricao">{descricao}</span>}
          </label>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

/** Grupo de radios (vertical/horizontal) */
interface RadioGrupoProps {
  opcoes: Array<{ valor: string; label?: string; rotulo?: string; descricao?: string; desabilitado?: boolean }>;
  valor?: string;
  selecionado?: string; // alias for valor (test compat)
  aoAlterar: (_valor: string) => void;
  label?: string;
  orientacao?: 'vertical' | 'horizontal';
  name?: string;
  className?: string;
  'data-testid'?: string;
}

export const RadioGrupo = ({
  opcoes,
  valor,
  selecionado,
  aoAlterar,
  label,
  orientacao = 'vertical',
  name,
  className = '',
  'data-testid': testId,
}: RadioGrupoProps) => {
  const valorAtual = selecionado !== undefined ? selecionado : valor;

  return (
    <fieldset data-testid={testId}>
      {label && <legend className="radio-grupo__label">{label}</legend>}
      <div className={`radio-grupo__opcoes radio-grupo--${orientacao} ${className}`} role="radiogroup" aria-label={label}>
        {opcoes.map((opcao) => (
          <Radio
            key={opcao.valor}
            valor={opcao.valor}
            label={opcao.label || opcao.rotulo}
            descricao={opcao.descricao}
            selecionado={valorAtual}
            aoAlterar={aoAlterar}
            desabilitado={opcao.desabilitado}
            name={name}
            data-testid={`${testId}-${opcao.valor}`}
          />
        ))}
      </div>
    </fieldset>
  );
};

/** Radio como card clicável (para seleção visual) */
interface RadioCardProps extends Omit<RadioProps, 'className'> {
  children: React.ReactNode;
  className?: string;
}

export const RadioCard = forwardRef<HTMLDivElement, RadioCardProps>(
  (
    {
      label,
      descricao,
      valor,
      verificado = false,
      selecionado,
      aoAlterar,
      desabilitado = false,
      obrigatorio = false,
      id: idProp,
      name,
      children,
      className = '',
      'data-testid': testId,
    },
    ref
  ) => {
    const isChecked = selecionado !== undefined ? selecionado === valor : verificado;
    const idGerado = React.useId();
    const id = idProp || idGerado;
    const radioId = `${id}-radio`;
    const descricaoId = `${id}-descricao`;

    const handleClick = () => {
      if (!desabilitado) {
        aoAlterar?.(valor);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !desabilitado) {
        e.preventDefault();
        aoAlterar?.(valor);
      }
    };

    const classes = [
      'radio-card',
      className,
      isChecked && 'radio-card--verificado',
      desabilitado && 'radio-card--desabilitado',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        className={classes}
        role="radio"
        aria-checked={isChecked}
        aria-disabled={desabilitado}
        aria-required={obrigatorio}
        aria-describedby={descricao ? descricaoId : undefined}
        tabIndex={desabilitado ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-testid={testId}
      >
        <input
          type="radio"
          id={radioId}
          name={name}
          value={valor}
          checked={isChecked}
          onChange={handleClick}
          disabled={desabilitado}
          required={obrigatorio}
          className="radio-card__input"
          aria-hidden="true"
          tabIndex={-1}
        />
        <span className="radio-card__indicador" aria-hidden="true">
          <span className="radio-card__circulo">
            <span className="radio-card__ponto" />
          </span>
        </span>
        <div className="radio-card__conteudo">
          {label && <span className="radio-card__label">{label}</span>}
          {descricao && <span id={descricaoId} className="radio-card__descricao">{descricao}</span>}
          {children}
        </div>
      </div>
    );
  }
);

RadioCard.displayName = 'RadioCard';

/** Grupo de RadioCards */
interface RadioCardGrupoProps {
  opcoes: Array<{ valor: string; label: string; descricao?: string; children?: React.ReactNode; desabilitado?: boolean }>;
  valor: string;
  aoAlterar: (_valor: string) => void;
  label?: string;
  colunas?: number;
  className?: string;
  'data-testid'?: string;
  name?: string;
}

export const RadioCardGrupo = ({
  opcoes,
  valor,
  aoAlterar,
  label,
  colunas = 2,
  className = '',
  'data-testid': testId,
  name,
}: RadioCardGrupoProps) => {
  return (
    <fieldset className={`radio-card-grupo ${className}`} data-testid={testId} style={{ gridTemplateColumns: `repeat(${colunas}, 1fr)` } as React.CSSProperties}>
      {label && <legend className="radio-card-grupo__label">{label}</legend>}
      <div className="radio-card-grupo__grid" role="radiogroup" aria-label={label}>
        {opcoes.map((opcao) => (
          <RadioCard
            key={opcao.valor}
            valor={opcao.valor}
            label={opcao.label}
            descricao={opcao.descricao}
            verificado={valor === opcao.valor}
            aoAlterar={aoAlterar}
            desabilitado={opcao.desabilitado}
            name={name}
            data-testid={`${testId}-${opcao.valor}`}
          >
            {opcao.children}
          </RadioCard>
        ))}
      </div>
    </fieldset>
  );
};