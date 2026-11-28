/**
 * Componente Chip - Tag/badge interativo para filtros, seleção, categorias.
 * Variantes: padrao, selecao, filtro, status, nicho.
 */

import React, { forwardRef } from 'react';
import { Icone } from '@/componentes';
import type { ChipOpcao, StatusAgendamento, VarianteChip } from './Chip.tipos';
import './Chip.css';

interface ChipProps {
  children: React.ReactNode;
  variante?: 'padrao' | 'selecao' | 'filtro' | 'status' | 'nicho';
  selecionado?: boolean;
  desabilitado?: boolean;
  aoClicar?: () => void;
  aoRemover?: () => void;
  icone?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

/** Chip base reutilizável */
export const Chip = forwardRef<HTMLDivElement, ChipProps>(
  ({
    children,
    variante = 'padrao',
    selecionado = false,
    desabilitado = false,
    aoClicar,
    aoRemover,
    icone,
    className = '',
    'data-testid': testId,
    ...props
  }, ref) => {
    const classes = [
      'chip',
      `chip--${variante}`,
      selecionado && 'chip--selecionado',
      desabilitado && 'chip--desabilitado',
      aoRemover && 'chip--removivel',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const isRemovivel = aoRemover && !desabilitado;
    const isClicavel = aoClicar && !desabilitado && !aoRemover;

    const handleClick = () => {
      if (desabilitado || aoRemover) return;
      aoClicar?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!desabilitado && !aoRemover) {
          aoClicar?.();
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (aoRemover && !desabilitado) {
          e.preventDefault();
          aoRemover();
        }
      }
    };

    // Sempre usa div como wrapper para evitar problemas com ref
    // button não pode conter outro button (botão de remover)
    // Mas adicionamos role="button" para acessibilidade quando clicável
    return (
      <div
        ref={ref}
        className={classes}
        onClick={isClicavel ? handleClick : undefined}
        onKeyDown={isClicavel ? handleKeyDown : undefined}
        role={isClicavel ? 'button' : isRemovivel ? undefined : 'button'}
        tabIndex={isClicavel ? 0 : isRemovivel ? undefined : 0}
        aria-pressed={variante === 'selecao' ? (selecionado ? 'true' : 'false') : undefined}
        aria-disabled={desabilitado}
        aria-label={isRemovivel ? `Remover ${children}` : undefined}
        data-testid={testId}
        {...props}
      >
        {icone && <span className="chip__icone" aria-hidden="true">{icone}</span>}
        <span className="chip__texto">{children}</span>
        {isRemovivel && (
          <button
            type="button"
            className="chip__remover"
            onClick={(e) => { e.stopPropagation(); aoRemover(); }}
            aria-label={`Remover ${children}`}
            tabIndex={-1}
          >
            <Icone nome="x" tamanho={14} />
          </button>
        )}
      </div>
    );
  }
);

Chip.displayName = 'Chip';

/** Chip de status (para filtros de agendamento, etc.) */
interface ChipStatusProps {
  status: StatusAgendamento;
  className?: string;
  'data-testid'?: string;
}

export const ChipStatus = ({
  status,
  className = '',
  'data-testid': testId,
}: ChipStatusProps) => {
  const mapaVariante: Record<string, 'status' | 'filtro'> = {
    agendado: 'status',
    confirmado: 'status',
    concluido: 'status',
    cancelado: 'status',
    pago: 'status',
    no_local: 'filtro',
    aguardando_pix: 'filtro',
  };

  const mapaLabel: Record<string, string> = {
    agendado: 'Agendado',
    confirmado: 'Confirmado',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    pago: 'Pago',
    no_local: 'No local',
    aguardando_pix: 'Aguardando PIX',
  };

  return (
    <Chip
      variante={mapaVariante[status] || 'status'}
      className={className}
      data-testid={testId}
      desabilitado={true}
    >
      {mapaLabel[status] || status}
    </Chip>
  );
};

/** Grupo de chips para seleção múltipla */
interface ChipGrupoProps {
  opcoes: ChipOpcao[];
  valores?: string[];
  selecionados?: string[]; // alias para valores
  aoAlterar: (_valores: string[]) => void;
  variante?: VarianteChip;
  className?: string;
  'data-testid'?: string;
  multiplo?: boolean;
  label?: string; // aria-label para o grupo
}

export const ChipGrupo = ({
  opcoes,
  valores = [],
  selecionados,
  aoAlterar,
  variante = 'selecao',
  className = '',
  'data-testid': testId,
  multiplo = true,
  label = 'Opções',
}: ChipGrupoProps) => {
  const valoresEfetivos = selecionados ?? valores;

  const handleToggle = (valor: string) => {
    let novosValores: string[];
    if (multiplo) {
      novosValores = valoresEfetivos.includes(valor)
        ? valoresEfetivos.filter((v) => v !== valor)
        : [...valoresEfetivos, valor];
    } else {
      novosValores = valoresEfetivos.includes(valor) ? [] : [valor];
    }
    aoAlterar(novosValores);
  };

  return (
    <div className={`chip-grupo ${className}`} data-testid={testId} role="group" aria-label={label}>
      {opcoes.map((opcao) => (
        <Chip
          key={opcao.valor}
          variante={variante}
          selecionado={valoresEfetivos.includes(opcao.valor)}
          aoClicar={() => handleToggle(opcao.valor)}
          icone={opcao.icone}
          data-testid={`${testId}-${opcao.valor}`}
        >
          {opcao.rotulo}
        </Chip>
      ))}
    </div>
  );
};

