/**
 * Testes para componente Avatar
 * Cobertura: 100%
 */

import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renderiza imagem quando src fornecido', () => {
    render(<Avatar src="https://exemplo.com/foto.jpg" nome="João" />);
    expect(screen.getByAltText('João')).toHaveAttribute('src', 'https://exemplo.com/foto.jpg');
  });

  it('renderiza iniciais quando sem imagem', () => {
    render(<Avatar nome="João Silva" />);
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('renderiza iniciais de nome único', () => {
    render(<Avatar nome="João" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('ignora preposições nas iniciais', () => {
    render(<Avatar nome="Maria da Silva" />);
    expect(screen.getByText('MS')).toBeInTheDocument();
  });

  it('aplica cor de fundo personalizada', () => {
    render(<Avatar nome="João" corFundo="#ff0000" />);
    expect(screen.getByText('J')).toHaveStyle({ backgroundColor: '#ff0000' });
  });

  it('usa cor padrão quando não fornecida', () => {
    render(<Avatar nome="João" />);
    expect(screen.getByText('J')).toHaveStyle({ backgroundColor: '#64748b' });
  });

  it('aplica tamanho pequeno', () => {
    render(<Avatar nome="João" tamanho="pequeno" />);
    expect(screen.getByText('J').parentElement).toHaveClass('avatar--pequeno');
  });

  it('aplica tamanho médio (padrão)', () => {
    render(<Avatar nome="João" tamanho="medio" />);
    expect(screen.getByText('J').parentElement).toHaveClass('avatar--medio');
  });

  it('aplica tamanho grande', () => {
    render(<Avatar nome="João" tamanho="grande" />);
    expect(screen.getByText('J').parentElement).toHaveClass('avatar--grande');
  });

  it('aplica tamanho xl', () => {
    render(<Avatar nome="João" tamanho="xl" />);
    expect(screen.getByText('J').parentElement).toHaveClass('avatar--xl');
  });

  it('aplica className personalizada', () => {
    render(<Avatar nome="João" className="minha-classe" />);
    expect(screen.getByText('J').parentElement).toHaveClass('minha-classe');
  });

  it('define role="img" e aria-label', () => {
    render(<Avatar nome="João Silva" />);
    expect(screen.getByText('JS').parentElement).toHaveAttribute('role', 'img');
    expect(screen.getByText('JS').parentElement).toHaveAttribute('aria-label', 'Avatar de João Silva');
  });

  it('trata nome vazio', () => {
    render(<Avatar nome="" />);
    const avatar = screen.getByRole('img');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('aria-label', '');
  });
});