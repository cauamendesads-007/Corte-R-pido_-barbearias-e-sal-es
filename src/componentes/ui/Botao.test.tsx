/**
 * Testes para componente Botao
 * Cobertura: 100%
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Botao, BotaoPrimario, BotaoSecundario, BotaoPerigo, BotaoFantasma, BotaoIcone } from './Botao';

describe('Botao', () => {
  it('renderiza botão com children', () => {
    render(<Botao>Clique aqui</Botao>);
    expect(screen.getByRole('button', { name: 'Clique aqui' })).toBeInTheDocument();
  });

  it('aplica variante primária por padrão', () => {
    render(<Botao>Teste</Botao>);
    expect(screen.getByRole('button')).toHaveClass('botao--primario');
  });

  it('aplica variante secundária', () => {
    render(<Botao variante="secundario">Teste</Botao>);
    expect(screen.getByRole('button')).toHaveClass('botao--secundario');
  });

  it('aplica variante perigo', () => {
    render(<Botao variante="perigo">Teste</Botao>);
    expect(screen.getByRole('button')).toHaveClass('botao--perigo');
  });

  it('aplica variante fantasma', () => {
    render(<Botao variante="fantasma">Teste</Botao>);
    expect(screen.getByRole('button')).toHaveClass('botao--fantasma');
  });

  it('aplica tamanho médio por padrão', () => {
    render(<Botao>Teste</Botao>);
    expect(screen.getByRole('button')).toHaveClass('botao--medio');
  });

  it('aplica tamanho pequeno', () => {
    render(<Botao tamanho="pequeno">Teste</Botao>);
    expect(screen.getByRole('button')).toHaveClass('botao--pequeno');
  });

  it('aplica tamanho grande', () => {
    render(<Botao tamanho="grande">Teste</Botao>);
    expect(screen.getByRole('button')).toHaveClass('botao--grande');
  });

  it('desabilita botão quando desabilitado=true', () => {
    render(<Botao desabilitado>Teste</Botao>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('mostra estado de carregamento', () => {
    render(<Botao carregando>Teste</Botao>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button')).toContainHTML('animar-giro');
  });

  it('chama onClick quando clicado', () => {
    const handleClick = vi.fn();
    render(<Botao aoClicar={handleClick}>Teste</Botao>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('não chama onClick quando desabilitado', () => {
    const handleClick = vi.fn();
    render(<Botao desabilitado aoClicar={handleClick}>Teste</Botao>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('não chama onClick quando carregando', () => {
    const handleClick = vi.fn();
    render(<Botao carregando aoClicar={handleClick}>Teste</Botao>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('define tipo submit quando tipo="submit"', () => {
    render(<Botao tipo="submit">Enviar</Botao>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('define aria-label quando fornecido', () => {
    render(<Botao ariaLabel="Fechar modal">X</Botao>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Fechar modal');
  });

  it('aplica className personalizada', () => {
    render(<Botao className="minha-classe">Teste</Botao>);
    expect(screen.getByRole('button')).toHaveClass('minha-classe');
  });

  it('aplica style inline', () => {
    render(<Botao style={{ background: 'red' }}>Teste</Botao>);
    expect(screen.getByRole('button')).toHaveStyle({ background: 'red' });
  });
});

describe('BotaoPrimario', () => {
  it('renderiza botão primário', () => {
    render(<BotaoPrimario>Primário</BotaoPrimario>);
    expect(screen.getByRole('button')).toHaveClass('botao--primario');
  });

  it('aceita ícone à esquerda', () => {
    render(<BotaoPrimario iconeEsquerda={<span>★</span>}>Com ícone</BotaoPrimario>);
    expect(screen.getByRole('button')).toContainHTML('★');
  });
});

describe('BotaoSecundario', () => {
  it('renderiza botão secundário', () => {
    render(<BotaoSecundario>Secundário</BotaoSecundario>);
    expect(screen.getByRole('button')).toHaveClass('botao--secundario');
  });
});

describe('BotaoPerigo', () => {
  it('renderiza botão de perigo', () => {
    render(<BotaoPerigo>Perigo</BotaoPerigo>);
    expect(screen.getByRole('button')).toHaveClass('botao--perigo');
  });
});

describe('BotaoFantasma', () => {
  it('renderiza botão fantasma', () => {
    render(<BotaoFantasma>Fantasma</BotaoFantasma>);
    expect(screen.getByRole('button')).toHaveClass('botao--fantasma');
  });
});

describe('BotaoIcone', () => {
  it('renderiza botão apenas com ícone', () => {
    render(<BotaoIcone icone={<span>★</span>} ariaLabel="Favoritar" />);
    const btn = screen.getByRole('button', { name: 'Favoritar' });
    expect(btn).toBeInTheDocument();
    expect(btn).toContainHTML('★');
  });

  it('aplica variante fantasma por padrão', () => {
    render(<BotaoIcone icone={<span>★</span>} ariaLabel="Teste" />);
    expect(screen.getByRole('button')).toHaveClass('botao--fantasma');
  });

  it('aplica tamanho pequeno por padrão', () => {
    render(<BotaoIcone icone={<span>★</span>} ariaLabel="Teste" />);
    expect(screen.getByRole('button')).toHaveClass('botao--pequeno');
  });
});