/**
 * Componente Skeleton - Placeholders de carregamento para melhor UX percebida.
 * Variantes: texto, circular, retangular, avatar, cartao, lista, feed.
 * Animação shimmer/pulse respeitando prefers-reduced-motion.
 */

import React from 'react';
import './Skeleton.css';

interface SkeletonProps {
  variante?: 'texto' | 'circular' | 'retangular' | 'avatar' | 'cartao' | 'lista' | 'feed' | 'publicacao' | 'estabelecimento' | 'agendamento';
  linhas?: number;
  largura?: string | number;
  altura?: string | number;
  className?: string;
  'data-testid'?: string;
  animacao?: 'shimmer' | 'pulse' | 'none' | 'animar';
}

/** Skeleton base */
export const Skeleton = ({
  variante = 'texto',
  linhas = 1,
  largura = '100%',
  altura,
  className = '',
  'data-testid': testId = 'skeleton',
  animacao = 'animar',
}: SkeletonProps) => {
  const classes = [
    'skeleton',
    `skeleton--${variante}`,
    `skeleton--${animacao}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const estilo: React.CSSProperties = {
    width: typeof largura === 'number' ? `${largura}px` : largura,
    height: typeof altura === 'number' ? `${altura}px` : altura,
  } as React.CSSProperties;

  // Variantes compostas
  if (variante === 'texto') {
    return (
      <div className={classes} data-testid={testId} style={estilo} aria-hidden="true">
        {Array.from({ length: linhas }, (_, i) => (
          <div key={i} className="skeleton__linha" data-testid="skeleton-line" style={{ width: i === linhas - 1 && linhas > 1 ? '70%' : '100%' }} />
        ))}
      </div>
    );
  }

  if (variante === 'cartao') {
    return (
      <div className={classes} data-testid={testId} aria-hidden="true">
        <div className="skeleton__cartao-capa" />
        <div className="skeleton__cartao-corpo">
          <div className="skeleton__linha skeleton__linha--larga" />
          <div className="skeleton__linha skeleton__linha--media" />
          <div className="skeleton__linha skeleton__linha--curta" />
        </div>
      </div>
    );
  }

  if (variante === 'lista') {
    return (
      <div className={classes} data-testid={testId} aria-hidden="true">
        {Array.from({ length: linhas }, (_, i) => (
          <div key={i} className="skeleton__item-lista">
            <div className="skeleton__avatar" />
            <div className="skeleton__item-conteudo">
              <div className="skeleton__linha skeleton__linha--media" />
              <div className="skeleton__linha skeleton__linha--curta" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variante === 'feed') {
    return (
      <div className={classes} data-testid={testId} aria-hidden="true">
        {Array.from({ length: linhas }, (_, i) => (
          <div key={i} className="skeleton__feed-item">
            <div className="skeleton__feed-cabecalho">
              <div className="skeleton__avatar skeleton__avatar--pequeno" />
              <div className="skeleton__feed-info">
                <div className="skeleton__linha skeleton__linha--media" />
                <div className="skeleton__linha skeleton__linha--curta" />
              </div>
            </div>
            <div className="skeleton__feed-midia" />
            <div className="skeleton__feed-corpo">
              <div className="skeleton__linha skeleton__linha--larga" />
              <div className="skeleton__linha skeleton__linha--media" />
              <div className="skeleton__linha skeleton__linha--curta" />
            </div>
            <div className="skeleton__feed-rodape">
              <div className="skeleton__linha skeleton__linha--curta" style={{ width: '120px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variante === 'publicacao') {
    return (
      <div className={classes} data-testid={testId} aria-hidden="true">
        <div className="skeleton__publicacao-cabecalho">
          <div className="skeleton__avatar skeleton__avatar--pequeno" />
          <div>
            <div className="skeleton__linha skeleton__linha--media" />
            <div className="skeleton__linha skeleton__linha--curta" />
          </div>
        </div>
        <div className="skeleton__publicacao-midia" />
        <div className="skeleton__publicacao-corpo">
          <div className="skeleton__linha skeleton__linha--media" />
          <div className="skeleton__linha skeleton__linha--curta" />
          <div className="skeleton__linha" />
          <div className="skeleton__linha" style={{ width: '80%' }} />
        </div>
        <div className="skeleton__publicacao-rodape">
          <div className="skeleton__linha" style={{ width: '100px' }} />
          <div className="skeleton__linha" style={{ width: '100px' }} />
        </div>
      </div>
    );
  }

  if (variante === 'estabelecimento') {
    return (
      <div className={classes} data-testid={testId} aria-hidden="true">
        <div className="skeleton__estabelecimento-capa">
          <div className="skeleton__badge" />
          <div className="skeleton__avatar skeleton__avatar--grande" style={{ position: 'absolute', top: '16px', left: '16px' }} />
        </div>
        <div className="skeleton__estabelecimento-corpo">
          <div className="skeleton__estabelecimento-info">
            <div className="skeleton__avatar skeleton__avatar--medio" />
            <div>
              <div className="skeleton__linha skeleton__linha--larga" />
              <div className="skeleton__linha skeleton__linha--curta" />
              <div className="skeleton__linha skeleton__linha--curta" style={{ width: '100px' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variante === 'agendamento') {
    return (
      <div className={classes} data-testid={testId} aria-hidden="true">
        <div className="skeleton__agendamento-cabecalho">
          <div className="skeleton__linha skeleton__linha--media" />
          <div className="skeleton__linha skeleton__linha--curta" />
          <div className="skeleton__badge" style={{ width: '120px' }} />
        </div>
        <div className="skeleton__agendamento-rodape">
          <div className="skeleton__linha" style={{ width: '100px' }} />
          <div className="skeleton__linha" style={{ width: '100px' }} />
        </div>
      </div>
    );
  }

  // Variantes simples
  return (
    <div className={classes} data-testid={testId} style={estilo} aria-hidden="true" />
  );
};

/** Skeleton de texto multilinha */
export const SkeletonTexto = ({ linhas = 3, largura = '100%', className = '', 'data-testid': testId }: Omit<SkeletonProps, 'variante' | 'animacao'>) => (
  <Skeleton variante="texto" linhas={linhas} largura={largura} className={className} data-testid={testId} />
);

/** Skeleton de avatar */
export const SkeletonAvatar = ({ tamanho = 'medio', className = '', 'data-testid': testId }: { tamanho?: 'pequeno' | 'medio' | 'grande' | 'xl'; className?: string; 'data-testid'?: string }) => (
  <Skeleton variante="circular" className={`skeleton__avatar skeleton__avatar--${tamanho} ${className}`} data-testid={testId} />
);

/** Skeleton de botão */
export const SkeletonBotao = ({ largura = 'auto', className = '', 'data-testid': testId }: { largura?: string | number; className?: string; 'data-testid'?: string }) => (
  <Skeleton variante="retangular" largura={largura} altura={44} className={`skeleton__botao ${className}`} data-testid={testId} />
);

/** Skeleton de input */
export const SkeletonInput = ({ largura = '100%', className = '', 'data-testid': testId }: { largura?: string | number; className?: string; 'data-testid'?: string }) => (
  <Skeleton variante="retangular" largura={largura} altura={48} className={`skeleton__input ${className}`} data-testid={testId} />
);

/** Grid de skeletons para listas */
interface SkeletonGridProps {
  colunas?: number;
  itens: number;
  varianteItem: SkeletonProps['variante'];
  gap?: string;
  className?: string;
  'data-testid'?: string;
}

export const SkeletonGrid = ({
  colunas = 2,
  itens = 6,
  varianteItem = 'cartao',
  gap = 'var(--espaco-4)',
  className = '',
  'data-testid': testId,
}: SkeletonGridProps) => (
  <div
    className={`skeleton-grid ${className}`}
    data-testid={testId}
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${colunas}, 1fr)`,
      gap,
    } as React.CSSProperties}
    aria-hidden="true"
  >
    {Array.from({ length: itens }, (_, i) => (
      <Skeleton key={i} variante={varianteItem} data-testid={`${testId}-${i}`} />
    ))}
  </div>
);