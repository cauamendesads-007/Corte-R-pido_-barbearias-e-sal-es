/**
 * Componente Checkbox - Checkbox acessível com label, indeterminado, grupo.
 * Segue WCAG: role="checkbox", aria-checked, focus visible.
 */

import React, { forwardRef } from 'react';
import { ICONES } from '@/constantes';
import './Checkbox.css';

interface CheckboxProps {
  label?: string;
  descricao?: string;
  _valor?: string | boolean; // string value or boolean for checked state (test compat)
  valor?: string | boolean; // alias for _valor (test compat)
  _verificado?: boolean;
  checked?: boolean; // alias for verificado
  indeterminado?: boolean;
  aoAlterar?: (_verificado: boolean) => void; // single arg to match tests
  desabilitado?: boolean;
  obrigatorio?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'data-testid'?: string;
}

/** Checkbox individual */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      descricao,
      _valor,
      valor, // alias for _valor (test compat)
      _verificado = false,
      checked,
      indeterminado = false,
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
    const valorFinal = _valor ?? valor;
    // Support valor as boolean for checked state (test compatibility)
    const isChecked = typeof valorFinal === 'boolean' ? valorFinal : (checked ?? _verificado);
    const idGerado = React.useId();
    const id = idProp || idGerado;
    const descricaoId = `${id}-descricao`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!desabilitado) {
        aoAlterar?.(e.target.checked);
      }
    };

    const classes = [
      'checkbox',
      className,
      desabilitado && 'checkbox--desabilitado',
      indeterminado && 'checkbox--indeterminado',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={classes} data-testid={testId}>
        <input
          ref={ref}
          type="checkbox"
          id={id}
          name={name}
          checked={isChecked}
          onChange={handleChange}
          disabled={desabilitado}
          required={obrigatorio}
          aria-checked={indeterminado ? 'mixed' : isChecked}
          aria-describedby={descricao ? descricaoId : undefined}
          aria-required={obrigatorio}
          className="checkbox__input"
        />
        <span className="checkbox__box" aria-hidden="true">
          {indeterminado ? (
            <span className="checkbox__indeterminado" />
          ) : isChecked ? (
            ICONES.verificar
          ) : null}
        </span>
        {(label || descricao) && (
          <label htmlFor={id} className="checkbox__label">
            {label && <span className="checkbox__texto">{label}</span>}
            {descricao && <span id={descricaoId} className="checkbox__descricao">{descricao}</span>}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

/** Grupo de checkboxes */
interface CheckboxGrupoProps {
  opcoes: Array<{ valor: string; label?: string; rotulo?: string; descricao?: string; desabilitado?: boolean }>;
  _valores?: string[];
  selecionados?: string[]; // alias for valores
  aoAlterar: (_valores: string[]) => void;
  label?: string;
  orientacao?: 'vertical' | 'horizontal';
  className?: string;
  'data-testid'?: string;
  name?: string;
}

export const CheckboxGrupo = ({
  opcoes,
  _valores = [],
  selecionados = [],
  aoAlterar,
  label,
  orientacao = 'vertical',
  className = '',
  'data-testid': testId,
  name,
}: CheckboxGrupoProps) => {
  const valoresAtuais = selecionados.length > 0 ? selecionados : _valores;

  const handleToggle = (opcaoValor: string) => () => {
    const novos = valoresAtuais.includes(opcaoValor)
      ? valoresAtuais.filter((v) => v !== opcaoValor)
      : [...valoresAtuais, opcaoValor];
    aoAlterar(novos);
  };

  return (
    <fieldset className={`checkbox-grupo checkbox-grupo--${orientacao} ${className}`} data-testid={testId}>
      {label && <legend className="checkbox-grupo__label">{label}</legend>}
      <div className="checkbox-grupo__opcoes">
        {opcoes.map((opcao) => (
          <Checkbox
            key={opcao.valor}
            label={opcao.label || opcao.rotulo}
            descricao={opcao.descricao}
            checked={valoresAtuais.includes(opcao.valor)}
            aoAlterar={handleToggle(opcao.valor)}
            desabilitado={opcao.desabilitado}
            name={name}
            data-testid={`${testId}-${opcao.valor}`}
          />
        ))}
      </div>
    </fieldset>
  );
};

/** Checkbox toggle (estilo switch) */
export const CheckboxToggle = ({
  rotulo,
  descricao,
  _verificado = false,
  aoAlterar,
  desabilitado = false,
  className = '',
  'data-testid': testId,
  ...props
}: { rotulo: string; descricao?: string; _verificado?: boolean; aoAlterar?: (_verificado: boolean) => void; desabilitado?: boolean; className?: string; 'data-testid'?: string } & Omit<CheckboxProps, 'indeterminado' | 'valor' | 'label'>) => {
  const id = testId || `toggle-${Math.random().toString(36).slice(2, 9)}`;
  const descId = descricao ? `${id}-desc` : undefined;

  return (
    <div className={`checkbox-toggle ${className}`} data-testid={testId}>
      <input
        type="checkbox"
        id={id}
        checked={_verificado}
        onChange={(e) => !desabilitado && aoAlterar?.(e.target.checked)}
        disabled={desabilitado}
        className="checkbox-toggle__input"
        aria-describedby={descId}
        {...props}
      />
      <label htmlFor={id} className="checkbox-toggle__label">
        <span className="checkbox-toggle__track" aria-hidden="true">
          <span className="checkbox-toggle__thumb" />
        </span>
        <span className="checkbox-toggle__texto">{rotulo}</span>
      </label>
      {descricao && <span id={descId} className="checkbox-toggle__descricao">{descricao}</span>}
    </div>
  );
};