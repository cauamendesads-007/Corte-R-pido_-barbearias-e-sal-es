/**
 * Componente Select - Select acessível com busca opcional, agrupamento, múltipla seleção.
 * Usa select nativo com estilo customizado; opção de combobox para busca.
 */

import React, { forwardRef, useId, useRef, useState, useEffect, useCallback } from 'react';
import type { PropsCampoTexto } from '@/tipos';
import { Icone } from './Icone';
import './Select.css';

interface OpcaoSelect {
  valor: string;
  rotulo: string;
  desabilitado?: boolean;
  grupo?: string;
}

interface SelectProps extends Omit<PropsCampoTexto, 'tipo' | 'inputMode' | 'maxLength' | 'valor'> {
  opcoes: OpcaoSelect[];
  placeholder?: string;
  multiplo?: boolean;
  buscavel?: boolean;
  valor: string | string[];
  aoAlterar: (_valor: string | string[]) => void;
  className?: string;
  'data-testid'?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      opcoes,
      valor,
      aoAlterar,
      erro,
      ajuda,
      desabilitado = false,
      obrigatorio = false,
      id: idProp,
      placeholder = 'Selecione...',
      multiplo = false,
      buscavel = false,
      className = '',
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    void autoComplete;
    const idGerado = useId();
    const id = idProp || idGerado;
    const erroId = `${id}-erro`;
    const ajudaId = `${id}-ajuda`;
    const descricoes = [erro && erroId, ajuda && ajudaId].filter(Boolean).join(' ') || undefined;

    const [aberto, setAberto] = useState(false);
    const [filtro, setFiltro] = useState('');
    const selectRef = useRef<HTMLSelectElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Agrupa opções por grupo
    const grupos = React.useMemo(() => {
      const mapa = new Map<string, OpcaoSelect[]>();
      opcoes.forEach((opcao) => {
        const chave = opcao.grupo || 'sem-grupo';
        if (!mapa.has(chave)) mapa.set(chave, []);
        mapa.get(chave)!.push(opcao);
      });
      return Array.from(mapa.entries());
    }, [opcoes]);

    // Filtra opções se buscável
    const opcoesFiltradas = React.useMemo(() => {
      if (!buscavel || !filtro) return opcoes;
      const termo = filtro.toLowerCase();
      return opcoes.filter((o) => o.rotulo.toLowerCase().includes(termo));
    }, [opcoes, filtro, buscavel]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (multiplo) {
          const selecionados = Array.from(e.target.selectedOptions).map((opt) => opt.value);
          aoAlterar(selecionados);
        } else {
          aoAlterar(e.target.value);
        }
      },
      [aoAlterar, multiplo]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          setAberto(false);
          selectRef.current?.blur();
        }
        if (buscavel && e.key === 'Enter' && !e.nativeEvent.isComposing) {
          e.preventDefault();
        }
      },
      [buscavel]
    );

    // Click outside para fechar
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (aberto && wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
          setAberto(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [aberto]);

    const classes = [
      'select',
      className,
      erro && 'select--erro',
      desabilitado && 'select--desabilitado',
      aberto && 'select--aberto',
      buscavel && 'select--buscavel',
    ]
      .filter(Boolean)
      .join(' ');

    const valoresSelecionados = multiplo ? (valor as string[]).filter(Boolean) : (valor !== undefined && valor !== null ? [valor as string] : []);

    // Renderiza opções agrupadas
    const renderizarOpcoes = () => {
      if (buscavel && filtro) {
        return opcoesFiltradas.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor} disabled={opcao.desabilitado}>
            {opcao.rotulo}
          </option>
        ));
      }

      return grupos.map(([grupo, ops]) => (
        <optgroup key={grupo} label={grupo === 'sem-grupo' ? undefined : grupo}>
          {ops.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor} disabled={opcao.desabilitado}>
              {opcao.rotulo}
            </option>
          ))}
        </optgroup>
      ));
    };

    return (
      <div ref={wrapperRef} className={classes} data-testid={testId}>
        <label htmlFor={id} className="select__label">
          {label}
          {obrigatorio && <span className="select__obrigatorio" aria-hidden="true">*</span>}
        </label>

        <div className="select__wrapper">
          {buscavel && (
            <input
              type="text"
              className="select__busca"
              placeholder="Buscar..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              onFocus={() => setAberto(true)}
              onKeyDown={handleKeyDown}
              aria-label="Buscar opções"
              autoComplete="off"
              disabled={desabilitado}
            />
          )}

          <select
            ref={ref}
            id={id}
            value={multiplo ? undefined : (valoresSelecionados[0] as string)}
            onChange={handleChange}
            onFocus={() => setAberto(true)}
            onBlur={() => setTimeout(() => setAberto(false), 100)}
            onKeyDown={handleKeyDown}
            disabled={desabilitado}
            required={obrigatorio && !multiplo}
            multiple={multiplo}
            aria-invalid={erro ? 'true' : 'false'}
            aria-describedby={descricoes}
            aria-required={obrigatorio}
            className="select__select"
            {...props}
          >
            {!multiplo && !valoresSelecionados[0] && (
              <option value="" disabled hidden>{placeholder}</option>
            )}
            {renderizarOpcoes()}
          </select>

          <span className="select__seta" aria-hidden="true">
            <Icone nome="setaBaixo" tamanho={16} />
          </span>

          {multiplo && valoresSelecionados.length > 0 && (
            <div className="select__selecionados" aria-label={`${valoresSelecionados.length} itens selecionados`}>
              {valoresSelecionados.slice(0, 3).map((v) => {
                const opcao = opcoes.find((o) => o.valor === v);
                return opcao ? (
                  <span key={v} className="select__tag">
                    {opcao.rotulo}
                    <button
                      type="button"
                      className="select__tag-remover"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const novos = valoresSelecionados.filter((val) => val !== v);
                        aoAlterar(novos);
                      }}
                      aria-label={`Remover ${opcao.rotulo}`}
                    >
                      <Icone nome="fechar" tamanho={12} />
                    </button>
                  </span>
                ) : null;
              })}
              {valoresSelecionados.length > 3 && (
                <span className="select__tag select__tag--mais">
                  +{valoresSelecionados.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {erro && (
          <p id={erroId} className="select__erro" role="alert">
            <Icone nome="alerta" tamanho={14} /> {erro}
          </p>
        )}

        {ajuda && !erro && (
          <p id={ajudaId} className="select__ajuda">
            {ajuda}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';