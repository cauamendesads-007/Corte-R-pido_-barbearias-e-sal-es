/**
 * Testes para componente Skeleton
 * Cobertura: 100%
 */

import { render, screen } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renderiza skeleton de texto por padrão', () => {
    render(<Skeleton />);
    expect(screen.getByTestId('skeleton')).toHaveClass('skeleton--texto');
  });

  it('renderiza skeleton circular', () => {
    render(<Skeleton variante="circular" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('skeleton--circular');
  });

  it('renderiza skeleton retangular', () => {
    render(<Skeleton variante="retangular" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('skeleton--retangular');
  });

  it('renderiza skeleton de cartão', () => {
    render(<Skeleton variante="cartao" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('skeleton--cartao');
  });

  it('renderiza múltiplas linhas para variante texto', () => {
    render(<Skeleton variante="texto" linhas={3} />);
    const lines = screen.getAllByTestId('skeleton-line');
    expect(lines).toHaveLength(3);
  });

  it('renderiza 1 linha por padrão para texto', () => {
    render(<Skeleton variante="texto" />);
    const lines = screen.getAllByTestId('skeleton-line');
    expect(lines).toHaveLength(1);
  });

  it('aplica largura personalizada', () => {
    render(<Skeleton largura="200px" />);
    expect(screen.getByTestId('skeleton')).toHaveStyle({ width: '200px' });
  });

  it('aplica altura personalizada', () => {
    render(<Skeleton altura="100px" />);
    expect(screen.getByTestId('skeleton')).toHaveStyle({ height: '100px' });
  });

  it('aplica className personalizada', () => {
    render(<Skeleton className="meu-skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('meu-skeleton');
  });

  it('aplica data-testid personalizado', () => {
    render(<Skeleton data-testid="meu-skeleton-teste" />);
    expect(screen.getByTestId('meu-skeleton-teste')).toBeInTheDocument();
  });

  it('tem animação de pulsar', () => {
    render(<Skeleton />);
    expect(screen.getByTestId('skeleton')).toHaveClass('skeleton--animar');
  });

  it('variante circular ignora linhas', () => {
    render(<Skeleton variante="circular" linhas={5} />);
    expect(screen.getByTestId('skeleton')).toHaveClass('skeleton--circular');
    expect(screen.queryByTestId('skeleton-line')).not.toBeInTheDocument();
  });

  it('variante retangular ignora linhas', () => {
    render(<Skeleton variante="retangular" linhas={5} />);
    expect(screen.getByTestId('skeleton')).toHaveClass('skeleton--retangular');
    expect(screen.queryByTestId('skeleton-line')).not.toBeInTheDocument();
  });

  it('variante cartao ignora linhas', () => {
    render(<Skeleton variante="cartao" linhas={5} />);
    expect(screen.getByTestId('skeleton')).toHaveClass('skeleton--cartao');
    expect(screen.queryByTestId('skeleton-line')).not.toBeInTheDocument();
  });
});