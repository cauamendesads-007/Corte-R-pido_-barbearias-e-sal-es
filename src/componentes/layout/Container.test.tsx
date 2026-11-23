/**
 * Testes para Container - Wrapper de layout com largura máxima, padding responsivo.
 * Variantes: padrao, estreito, largo, tela-cheia, com-cabecalho, com-bottom-nav, com-dois-paineis.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Container, Secao, Grid, GridItem, Stack, Divisor, Espacador, Centralizador } from './Container';

describe('Container', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Container principal', () => {
    it('deve renderizar children', () => {
      render(<Container data-testid="container-teste">Conteúdo do container</Container>);

      expect(screen.getByTestId('container-teste')).toHaveTextContent('Conteúdo do container');
    });

    it('deve usar variante padrão por padrão', () => {
      render(<Container data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste')).toHaveClass('container');
      expect(screen.getByTestId('container-teste')).toHaveClass('container--padrao');
    });

    it('deve aplicar variante estreito', () => {
      render(<Container variante="estreito" data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste')).toHaveClass('container--estreito');
    });

    it('deve aplicar variante largo', () => {
      render(<Container variante="largo" data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste')).toHaveClass('container--largo');
    });

    it('deve aplicar variante tela-cheia', () => {
      render(<Container variante="tela-cheia" data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste')).toHaveClass('container--tela-cheia');
    });

    it('deve aplicar variante com-cabecalho', () => {
      render(<Container variante="com-cabecalho" data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste')).toHaveClass('container--com-cabecalho');
    });

    it('deve aplicar variante com-bottom-nav', () => {
      render(<Container variante="com-bottom-nav" data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste')).toHaveClass('container--com-bottom-nav');
    });

    it('deve aplicar variante com-dois-paineis', () => {
      render(<Container variante="com-dois-paineis" data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste')).toHaveClass('container--com-dois-paineis');
    });

    it('deve aplicar className personalizada', () => {
      render(<Container className="minha-classe" data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste')).toHaveClass('minha-classe');
    });

    it('deve usar elemento main por padrão', () => {
      render(<Container data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste').tagName).toBe('MAIN');
    });

    it('deve permitir alterar elemento via prop as', () => {
      render(<Container as="section" data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste').tagName).toBe('SECTION');
    });

    it('deve permitir alterar elemento para div', () => {
      render(<Container as="div" data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste').tagName).toBe('DIV');
    });

    it('deve permitir alterar elemento para article', () => {
      render(<Container as="article" data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste').tagName).toBe('ARTICLE');
    });

    it('deve aplicar id quando fornecido', () => {
      render(<Container id="meu-id" data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste')).toHaveAttribute('id', 'meu-id');
    });

    it('deve encaminhar props extras', () => {
      render(<Container data-custom="valor" data-testid="container-teste" />);

      expect(screen.getByTestId('container-teste')).toHaveAttribute('data-custom', 'valor');
    });

    it('deve encaminhar ref', () => {
      const ref = vi.fn();
      render(<Container ref={ref} data-testid="container-teste" />);

      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLElement);
    });
  });

  describe('Secao', () => {
    it('deve renderizar children', () => {
      render(<Secao data-testid="secao-teste">Conteúdo da seção</Secao>);

      expect(screen.getByTestId('secao-teste')).toHaveTextContent('Conteúdo da seção');
    });

    it('deve renderizar elemento section', () => {
      render(<Secao data-testid="secao-teste" />);

      expect(screen.getByTestId('secao-teste').tagName).toBe('SECTION');
    });

    it('deve aplicar classe secao', () => {
      render(<Secao data-testid="secao-teste" />);

      expect(screen.getByTestId('secao-teste')).toHaveClass('secao');
    });

    it('deve aplicar className personalizada', () => {
      render(<Secao className="minha-secao" data-testid="secao-teste" />);

      expect(screen.getByTestId('secao-teste')).toHaveClass('minha-secao');
    });

    it('deve aplicar id quando fornecido', () => {
      render(<Secao id="minha-secao" data-testid="secao-teste" />);

      expect(screen.getByTestId('secao-teste')).toHaveAttribute('id', 'minha-secao');
    });

    it('deve encaminhar props extras', () => {
      render(<Secao data-custom="valor" data-testid="secao-teste" />);

      expect(screen.getByTestId('secao-teste')).toHaveAttribute('data-custom', 'valor');
    });
  });

  describe('Grid', () => {
    it('deve renderizar children', () => {
      render(<Grid data-testid="grid-teste"><div>Item 1</div><div>Item 2</div></Grid>);

      expect(screen.getByTestId('grid-teste')).toHaveTextContent('Item 1');
      expect(screen.getByTestId('grid-teste')).toHaveTextContent('Item 2');
    });

    it('deve usar 12 colunas por padrão', () => {
      render(<Grid data-testid="grid-teste" />);

      expect(screen.getByTestId('grid-teste')).toHaveClass('grid--12');
    });

    it('deve aplicar número de colunas personalizado', () => {
      render(<Grid colunas={3} data-testid="grid-teste" />);

      expect(screen.getByTestId('grid-teste')).toHaveClass('grid--3');
      expect(screen.getByTestId('grid-teste')).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
    });

    it('deve usar gap médio por padrão', () => {
      render(<Grid data-testid="grid-teste" />);

      expect(screen.getByTestId('grid-teste')).toHaveClass('grid--gap-medio');
    });

    it('deve aplicar gap personalizado', () => {
      render(<Grid gap="grande" data-testid="grid-teste" />);

      expect(screen.getByTestId('grid-teste')).toHaveClass('grid--gap-grande');
    });

    it('deve aplicar gap none', () => {
      render(<Grid gap="none" data-testid="grid-teste" />);

      expect(screen.getByTestId('grid-teste')).toHaveClass('grid--gap-none');
    });

    it('deve aplicar className personalizada', () => {
      render(<Grid className="meu-grid" data-testid="grid-teste" />);

      expect(screen.getByTestId('grid-teste')).toHaveClass('meu-grid');
    });
  });

  describe('GridItem', () => {
    it('deve renderizar children', () => {
      render(
        <Grid data-testid="grid-teste">
          <GridItem data-testid="item-teste">Conteúdo do item</GridItem>
        </Grid>
      );

      expect(screen.getByTestId('item-teste')).toHaveTextContent('Conteúdo do item');
    });

    it('deve aplicar span quando fornecido', () => {
      render(
        <Grid data-testid="grid-teste">
          <GridItem span={4} data-testid="item-teste" />
        </Grid>
      );

      expect(screen.getByTestId('item-teste')).toHaveStyle('grid-column: span 4');
    });

    it('deve aplicar inicio/fim quando fornecidos', () => {
      render(
        <Grid data-testid="grid-teste">
          <GridItem inicio={2} fim={5} data-testid="item-teste" />
        </Grid>
      );

      expect(screen.getByTestId('item-teste')).toHaveStyle('grid-column: 2 / 5');
    });

    it('deve priorizar span sobre inicio/fim', () => {
      render(
        <Grid data-testid="grid-teste">
          <GridItem span={3} inicio={1} fim={4} data-testid="item-teste" />
        </Grid>
      );

      expect(screen.getByTestId('item-teste')).toHaveStyle('grid-column: span 3');
    });

    it('deve aplicar className personalizada', () => {
      render(
        <Grid data-testid="grid-teste">
          <GridItem className="meu-item" data-testid="item-teste" />
        </Grid>
      );

      expect(screen.getByTestId('item-teste')).toHaveClass('meu-item');
    });

    it('deve aplicar classe grid__item', () => {
      render(
        <Grid data-testid="grid-teste">
          <GridItem data-testid="item-teste" />
        </Grid>
      );

      expect(screen.getByTestId('item-teste')).toHaveClass('grid__item');
    });
  });

  describe('Stack', () => {
    it('deve renderizar children', () => {
      render(<Stack data-testid="stack-teste"><div>Item 1</div><div>Item 2</div></Stack>);

      expect(screen.getByTestId('stack-teste')).toHaveTextContent('Item 1');
      expect(screen.getByTestId('stack-teste')).toHaveTextContent('Item 2');
    });

    it('deve usar direção vertical por padrão', () => {
      render(<Stack data-testid="stack-teste" />);

      expect(screen.getByTestId('stack-teste')).toHaveClass('stack--vertical');
    });

    it('deve aplicar direção horizontal', () => {
      render(<Stack direcao="horizontal" data-testid="stack-teste" />);

      expect(screen.getByTestId('stack-teste')).toHaveClass('stack--horizontal');
    });

    it('deve usar gap médio por padrão', () => {
      render(<Stack data-testid="stack-teste" />);

      expect(screen.getByTestId('stack-teste')).toHaveClass('stack--gap-medio');
    });

    it('deve aplicar gap personalizado', () => {
      render(<Stack gap="grande" data-testid="stack-teste" />);

      expect(screen.getByTestId('stack-teste')).toHaveClass('stack--gap-grande');
    });

    it('deve usar alinhamento esticar por padrão', () => {
      render(<Stack data-testid="stack-teste" />);

      expect(screen.getByTestId('stack-teste')).toHaveClass('stack--align-esticar');
    });

    it('deve aplicar alinhamento personalizado', () => {
      render(<Stack alinhamento="centro" data-testid="stack-teste" />);

      expect(screen.getByTestId('stack-teste')).toHaveClass('stack--align-centro');
    });

    it('deve aplicar className personalizada', () => {
      render(<Stack className="meu-stack" data-testid="stack-teste" />);

      expect(screen.getByTestId('stack-teste')).toHaveClass('meu-stack');
    });
  });

  describe('Divisor', () => {
    it('deve renderizar elemento hr', () => {
      render(<Divisor data-testid="divisor-teste" />);

      expect(screen.getByTestId('divisor-teste').tagName).toBe('HR');
    });

    it('deve aplicar classe divisor', () => {
      render(<Divisor data-testid="divisor-teste" />);

      expect(screen.getByTestId('divisor-teste')).toHaveClass('divisor');
    });

    it('deve ter aria-hidden="true"', () => {
      render(<Divisor data-testid="divisor-teste" />);

      expect(screen.getByTestId('divisor-teste')).toHaveAttribute('aria-hidden', 'true');
    });

    it('deve aplicar className personalizada', () => {
      render(<Divisor className="meu-divisor" data-testid="divisor-teste" />);

      expect(screen.getByTestId('divisor-teste')).toHaveClass('meu-divisor');
    });
  });

  describe('Espacador', () => {
    it('deve renderizar div', () => {
      const { container } = render(<Espacador />);

      expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
    });

    it('deve usar tamanho médio por padrão', () => {
      const { container } = render(<Espacador />);

      expect(container.firstChild).toHaveClass('espacador--medio');
    });

    it('deve aplicar tamanho pequeno', () => {
      const { container } = render(<Espacador tamanho="pequeno" />);

      expect(container.firstChild).toHaveClass('espacador--pequeno');
    });

    it('deve aplicar tamanho grande', () => {
      const { container } = render(<Espacador tamanho="grande" />);

      expect(container.firstChild).toHaveClass('espacador--grande');
    });

    it('deve aplicar tamanho xl', () => {
      const { container } = render(<Espacador tamanho="xl" />);

      expect(container.firstChild).toHaveClass('espacador--xl');
    });

    it('deve ter aria-hidden="true"', () => {
      const { container } = render(<Espacador />);

      expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    });

    it('deve aplicar className personalizada', () => {
      const { container } = render(<Espacador className="meu-espacador" />);

      expect(container.firstChild).toHaveClass('meu-espacador');
    });
  });

  describe('Centralizador', () => {
    it('deve renderizar children', () => {
      render(<Centralizador data-testid="centralizador-teste">Conteúdo centralizado</Centralizador>);

      expect(screen.getByTestId('centralizador-teste')).toHaveTextContent('Conteúdo centralizado');
    });

    it('deve usar largura máxima padrão', () => {
      render(<Centralizador data-testid="centralizador-teste" />);

      expect(screen.getByTestId('centralizador-teste')).toHaveStyle('max-width: var(--largura-maxima)');
    });

    it('deve aplicar largura máxima personalizada', () => {
      render(<Centralizador larguraMaxima="800px" data-testid="centralizador-teste" />);

      expect(screen.getByTestId('centralizador-teste')).toHaveStyle('max-width: 800px');
    });

    it('deve aplicar classe centralizador', () => {
      render(<Centralizador data-testid="centralizador-teste" />);

      expect(screen.getByTestId('centralizador-teste')).toHaveClass('centralizador');
    });

    it('deve aplicar className personalizada', () => {
      render(<Centralizador className="meu-centralizador" data-testid="centralizador-teste" />);

      expect(screen.getByTestId('centralizador-teste')).toHaveClass('meu-centralizador');
    });
  });
});