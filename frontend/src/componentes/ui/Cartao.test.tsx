/**
 * Testes para componente Cartao
 * Cobertura: 100%
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoRodape, CartaoMidia, CartaoBadge } from './Cartao';

describe('Cartao', () => {
  it('renderiza children', () => {
    render(<Cartao>Conteúdo do cartão</Cartao>);
    expect(screen.getByText('Conteúdo do cartão')).toBeInTheDocument();
  });

  it('aplica variante padrão', () => {
    render(<Cartao data-testid="cartao-teste">Teste</Cartao>);
    expect(screen.getByTestId('cartao-teste')).toHaveClass('cartao--padrao');
  });

  it('aplica variante estabelecimento', () => {
    render(<Cartao variante="estabelecimento" data-testid="cartao-teste">Teste</Cartao>);
    expect(screen.getByTestId('cartao-teste')).toHaveClass('cartao--estabelecimento');
  });

  it('aplica variante publicacao', () => {
    render(<Cartao variante="publicacao" data-testid="cartao-teste">Teste</Cartao>);
    expect(screen.getByTestId('cartao-teste')).toHaveClass('cartao--publicacao');
  });

  it('aplica variante servico', () => {
    render(<Cartao variante="servico" data-testid="cartao-teste">Teste</Cartao>);
    expect(screen.getByTestId('cartao-teste')).toHaveClass('cartao--servico');
  });

  it('aplica variante agendamento', () => {
    render(<Cartao variante="agendamento" data-testid="cartao-teste">Teste</Cartao>);
    expect(screen.getByTestId('cartao-teste')).toHaveClass('cartao--agendamento');
  });

  it('aplica className personalizada', () => {
    render(<Cartao className="minha-classe" data-testid="cartao-teste">Teste</Cartao>);
    expect(screen.getByTestId('cartao-teste')).toHaveClass('minha-classe');
  });

  it('aplica data-testid', () => {
    render(<Cartao data-testid="meu-cartao">Teste</Cartao>);
    expect(screen.getByTestId('meu-cartao')).toBeInTheDocument();
  });

  it('aplica onClick e role button', () => {
    const onClick = vi.fn();
    render(<Cartao onClick={onClick} data-testid="cartao-teste">Teste</Cartao>);
    fireEvent.click(screen.getByTestId('cartao-teste'));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByTestId('cartao-teste')).toHaveAttribute('role', 'button');
  });

  it('não aplica role button sem onClick', () => {
    render(<Cartao data-testid="cartao-teste">Teste</Cartao>);
    expect(screen.getByTestId('cartao-teste')).not.toHaveAttribute('role');
  });
});

describe('CartaoCabecalho', () => {
  it('renderiza children', () => {
    render(<CartaoCabecalho data-testid="cabecalho-teste">Título do cabeçalho</CartaoCabecalho>);
    expect(screen.getByTestId('cabecalho-teste')).toHaveTextContent('Título do cabeçalho');
  });

  it('aplica className personalizada', () => {
    render(<CartaoCabecalho className="minha-classe" data-testid="cabecalho-teste">Título</CartaoCabecalho>);
    expect(screen.getByTestId('cabecalho-teste')).toHaveClass('minha-classe');
  });

  it('aplica data-testid', () => {
    render(<CartaoCabecalho data-testid="cabecalho-teste">Título</CartaoCabecalho>);
    expect(screen.getByTestId('cabecalho-teste')).toBeInTheDocument();
  });

  it('define tag header', () => {
    render(<CartaoCabecalho data-testid="cabecalho-teste">Título</CartaoCabecalho>);
    expect(screen.getByTestId('cabecalho-teste').tagName).toBe('HEADER');
  });
});

describe('CartaoCorpo', () => {
  it('renderiza children', () => {
    render(<CartaoCorpo data-testid="corpo-teste">Corpo do cartão</CartaoCorpo>);
    expect(screen.getByTestId('corpo-teste')).toHaveTextContent('Corpo do cartão');
  });

  it('aplica className personalizada', () => {
    render(<CartaoCorpo className="minha-classe" data-testid="corpo-teste">Teste</CartaoCorpo>);
    expect(screen.getByTestId('corpo-teste')).toHaveClass('minha-classe');
  });

  it('aplica data-testid', () => {
    render(<CartaoCorpo data-testid="corpo-teste">Teste</CartaoCorpo>);
    expect(screen.getByTestId('corpo-teste')).toBeInTheDocument();
  });
});

describe('CartaoRodape', () => {
  it('renderiza children', () => {
    render(
      <CartaoRodape data-testid="rodape-teste">
        <button>Cancelar</button>
        <button>Salvar</button>
      </CartaoRodape>
    );
    expect(screen.getByTestId('rodape-teste')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('aplica className personalizada', () => {
    render(<CartaoRodape className="minha-classe" data-testid="rodape-teste"><button>Salvar</button></CartaoRodape>);
    expect(screen.getByTestId('rodape-teste')).toHaveClass('minha-classe');
  });

  it('aplica data-testid', () => {
    render(<CartaoRodape data-testid="rodape-teste"><button>Salvar</button></CartaoRodape>);
    expect(screen.getByTestId('rodape-teste')).toBeInTheDocument();
  });

  it('define tag footer', () => {
    render(<CartaoRodape data-testid="rodape-teste"><button>Salvar</button></CartaoRodape>);
    expect(screen.getByTestId('rodape-teste').tagName).toBe('FOOTER');
  });
});

describe('CartaoMidia', () => {
  it('renderiza imagem com src e alt', () => {
    render(<CartaoMidia src="https://exemplo.com/img.jpg" alt="Descrição" data-testid="midia-teste" />);
    const img = screen.getByTestId('midia-teste').querySelector('img');
    expect(img).toHaveAttribute('src', 'https://exemplo.com/img.jpg');
    expect(img).toHaveAttribute('alt', 'Descrição');
  });

  it('renderiza vídeo com src', () => {
    render(<CartaoMidia src="video.mp4" alt="Vídeo" tipo="video" data-testid="midia-teste" />);
    const video = screen.getByTestId('midia-teste').querySelector('video');
    expect(video).toHaveAttribute('src', 'video.mp4');
  });

  it('renderiza children quando fornecido', () => {
    render(<CartaoMidia data-testid="midia-teste"><div>Conteúdo personalizado</div></CartaoMidia>);
    expect(screen.getByTestId('midia-teste')).toHaveTextContent('Conteúdo personalizado');
  });

  it('aplica className personalizada', () => {
    render(<CartaoMidia src="img.jpg" alt="Teste" className="minha-classe" data-testid="midia-teste" />);
    expect(screen.getByTestId('midia-teste')).toHaveClass('minha-classe');
  });

  it('aplica style quando fornecido', () => {
    const style = { backgroundColor: 'red' };
    render(<CartaoMidia src="img.jpg" alt="Teste" style={style} data-testid="midia-teste" />);
    expect(screen.getByTestId('midia-teste')).toHaveAttribute('style', expect.stringContaining('background-color: red'));
  });

  it('aplica data-testid', () => {
    render(<CartaoMidia src="img.jpg" alt="Teste" data-testid="midia-teste" />);
    expect(screen.getByTestId('midia-teste')).toBeInTheDocument();
  });
});

describe('CartaoBadge', () => {
  it('renderiza children', () => {
    render(<CartaoBadge data-testid="badge-teste">Badge</CartaoBadge>);
    expect(screen.getByTestId('badge-teste')).toHaveTextContent('Badge');
  });

  it('aplica variante padrão', () => {
    render(<CartaoBadge data-testid="badge-teste">Teste</CartaoBadge>);
    expect(screen.getByTestId('badge-teste')).toHaveClass('cartao__badge--padrao');
  });

  it('aplica variante primario', () => {
    render(<CartaoBadge variante="primario" data-testid="badge-teste">Teste</CartaoBadge>);
    expect(screen.getByTestId('badge-teste')).toHaveClass('cartao__badge--primario');
  });

  it('aplica variante sucesso', () => {
    render(<CartaoBadge variante="sucesso" data-testid="badge-teste">Teste</CartaoBadge>);
    expect(screen.getByTestId('badge-teste')).toHaveClass('cartao__badge--sucesso');
  });

  it('aplica variante aviso', () => {
    render(<CartaoBadge variante="aviso" data-testid="badge-teste">Teste</CartaoBadge>);
    expect(screen.getByTestId('badge-teste')).toHaveClass('cartao__badge--aviso');
  });

  it('aplica variante perigo', () => {
    render(<CartaoBadge variante="perigo" data-testid="badge-teste">Teste</CartaoBadge>);
    expect(screen.getByTestId('badge-teste')).toHaveClass('cartao__badge--perigo');
  });

  it('aplica className personalizada', () => {
    render(<CartaoBadge className="minha-classe" data-testid="badge-teste">Teste</CartaoBadge>);
    expect(screen.getByTestId('badge-teste')).toHaveClass('minha-classe');
  });

  it('aplica data-testid', () => {
    render(<CartaoBadge data-testid="badge-teste">Teste</CartaoBadge>);
    expect(screen.getByTestId('badge-teste')).toBeInTheDocument();
  });
});