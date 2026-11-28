/**
 * Componente Container - Wrapper de layout com largura máxima, padding responsivo.
 * Variantes: padrao, estreito, largo, tela-cheia, com-cabecalho, com-bottom-nav.
 */

import React, { forwardRef } from 'react';
import './Container.css';

export interface ContainerProps {
  variante?: 'padrao' | 'estreito' | 'largo' | 'tela-cheia' | 'com-cabecalho' | 'com-bottom-nav' | 'com-dois-paineis';
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
  as?: 'main' | 'section' | 'div' | 'article';
  id?: string;
}

/** Container principal de layout */
export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({
    variante = 'padrao',
    children,
    className = '',
    'data-testid': testId,
    as: Component = 'main',
    id,
    ...props
  }, ref) => {
    const classes = [
      'container',
      `container--${variante}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <Component
        ref={ref as React.Ref<HTMLDivElement>}
        id={id}
        className={classes}
        data-testid={testId}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Container.displayName = 'Container';

/** Seção com espaçamento padrão */
export const Secao = ({
  children,
  className = '',
  'data-testid': testId,
  id,
  ...props
}: React.HTMLAttributes<HTMLElement> & { 'data-testid'?: string }) => (
  <section
    id={id}
    className={`secao ${className}`}
    data-testid={testId}
    {...props}
  >
    {children}
  </section>
);

/** Grid responsivo de colunas */
interface GridProps {
  colunas?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'pequeno' | 'medio' | 'grande' | 'none';
  className?: string;
  'data-testid'?: string;
  children: React.ReactNode;
}

export const Grid = ({
  colunas = 12,
  gap = 'medio',
  className = '',
  'data-testid': testId,
  children,
}: GridProps) => (
  <div
    className={`grid grid--${colunas} grid--gap-${gap} ${className}`}
    data-testid={testId}
    style={{
      gridTemplateColumns: `repeat(${colunas}, 1fr)`,
    } as React.CSSProperties}
  >
    {children}
  </div>
);

/** Item do grid com span */
interface GridItemProps {
  span?: number;
  inicio?: number;
  fim?: number;
  className?: string;
  'data-testid'?: string;
  children: React.ReactNode;
}

export const GridItem = ({
  span,
  inicio,
  fim,
  className = '',
  'data-testid': testId,
  children,
}: GridItemProps) => (
  <div
    className={`grid__item ${className}`}
    data-testid={testId}
    style={{
      gridColumn: span ? `span ${span}` : inicio && fim ? `${inicio} / ${fim}` : undefined,
    } as React.CSSProperties}
  >
    {children}
  </div>
);

/** Stack vertical com gap */
interface StackProps {
  direcao?: 'vertical' | 'horizontal';
  gap?: 'pequeno' | 'medio' | 'grande' | 'none';
  alinhamento?: 'inicio' | 'centro' | 'fim' | 'esticar';
  className?: string;
  'data-testid'?: string;
  children: React.ReactNode;
}

export const Stack = ({
  direcao = 'vertical',
  gap = 'medio',
  alinhamento = 'esticar',
  className = '',
  'data-testid': testId,
  children,
}: StackProps) => (
  <div
    className={`stack stack--${direcao} stack--gap-${gap} stack--align-${alinhamento} ${className}`}
    data-testid={testId}
  >
    {children}
  </div>
);

/** Divisor horizontal */
export const Divisor = ({
  className = '',
  'data-testid': testId,
}: { className?: string; 'data-testid'?: string }) => (
  <hr className={`divisor ${className}`} data-testid={testId} aria-hidden="true" />
);

/** Espaçador vertical */
export const Espacador = ({
  tamanho = 'medio',
  className = '',
}: { tamanho?: 'pequeno' | 'medio' | 'grande' | 'xl'; className?: string }) => (
  <div className={`espacador espacador--${tamanho} ${className}`} aria-hidden="true" />
);

/** Wrapper para conteúdo centralizado com largura máxima */
export const Centralizador = ({
  children,
  larguraMaxima = 'var(--largura-maxima)',
  className = '',
  'data-testid': testId,
}: {
  children: React.ReactNode;
  larguraMaxima?: string;
  className?: string;
  'data-testid'?: string;
}) => (
  <div
    className={`centralizador ${className}`}
    data-testid={testId}
    style={{ maxWidth: larguraMaxima } as React.CSSProperties}
  >
    {children}
  </div>
);