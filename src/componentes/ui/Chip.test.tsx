/**
 * Testes para componente Chip
 * Cobertura: 100%
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { Chip, ChipGrupo } from './Chip';

describe('Chip', () => {
  it('renderiza chip com rótulo', () => {
    render(<Chip>Meu Chip</Chip>);
    expect(screen.getByRole('button', { name: 'Meu Chip' })).toBeInTheDocument();
  });

  it('aplica variante padrão', () => {
    render(<Chip>Teste</Chip>);
    expect(screen.getByRole('button')).toHaveClass('chip--padrao');
  });

  it('aplica variante filtro', () => {
    render(<Chip variante="filtro">Teste</Chip>);
    expect(screen.getByRole('button')).toHaveClass('chip--filtro');
  });

  it('aplica variante selecao', () => {
    render(<Chip variante="selecao">Teste</Chip>);
    expect(screen.getByRole('button')).toHaveClass('chip--selecao');
  });

  it('aplica variante status', () => {
    render(<Chip variante="status">Teste</Chip>);
    expect(screen.getByRole('button')).toHaveClass('chip--status');
  });

  it('aplica variante nicho', () => {
    render(<Chip variante="nicho">Teste</Chip>);
    expect(screen.getByRole('button')).toHaveClass('chip--nicho');
  });

  it('mostra ícone quando fornecido', () => {
    render(<Chip icone={<span>★</span>}>Teste</Chip>);
    expect(screen.getByRole('button')).toContainHTML('★');
  });

  it('mostra botão de remover quando aoRemover fornecido', () => {
    render(<Chip aoRemover={vi.fn()}>Teste</Chip>);
    const botaoRemover = screen.getByRole('button', { name: /remover teste/i });
    expect(botaoRemover).toHaveClass('chip__remover');
  });

  it('chama aoRemover ao clicar no X', () => {
    const onRemove = vi.fn();
    render(<Chip aoRemover={onRemove}>Teste</Chip>);
    const botaoX = screen.getByRole('button', { name: /remover teste/i });
    fireEvent.click(botaoX);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('não mostra botão remover quando não removível', () => {
    render(<Chip>Teste</Chip>);
    const botoesRemover = screen.queryAllByRole('button', { name: /remover/i });
    expect(botoesRemover).toHaveLength(0);
  });

  it('chip removível não tem role button no wrapper', () => {
    render(<Chip aoRemover={vi.fn()}>Teste</Chip>);
    const chip = screen.getByText('Teste').parentElement;
    expect(chip).not.toHaveAttribute('role', 'button');
  });

  it('chama onClick ao clicar no chip', () => {
    const onClick = vi.fn();
    render(<Chip aoClicar={onClick}>Teste</Chip>);
    fireEvent.click(screen.getByRole('button', { name: 'Teste' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('não chama onClick quando desabilitado', () => {
    const onClick = vi.fn();
    render(<Chip desabilitado aoClicar={onClick}>Teste</Chip>);
    fireEvent.click(screen.getByRole('button', { name: 'Teste' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('aplica selected quando selecionado=true', () => {
    render(<Chip variante="selecao" selecionado>Teste</Chip>);
    expect(screen.getByRole('button')).toHaveClass('chip--selecionado');
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('não aplica selected quando selecionado=false', () => {
    render(<Chip variante="selecao" selecionado={false}>Teste</Chip>);
    expect(screen.getByRole('button')).not.toHaveClass('chip--selecionado');
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('aplica className personalizada', () => {
    render(<Chip className="minha-classe">Teste</Chip>);
    expect(screen.getByRole('button')).toHaveClass('minha-classe');
  });

  it('define role="button" por padrão', () => {
    render(<Chip>Teste</Chip>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('ChipGrupo', () => {
  const opcoes = [
    { valor: 'opcao1', rotulo: 'Opção 1' },
    { valor: 'opcao2', rotulo: 'Opção 2' },
    { valor: 'opcao3', rotulo: 'Opção 3' },
  ];

  it('renderiza todos os chips', () => {
    render(<ChipGrupo opcoes={opcoes} selecionados={[]} aoAlterar={vi.fn()} multiplo={false} />);
    expect(screen.getByRole('button', { name: 'Opção 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opção 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opção 3' })).toBeInTheDocument();
  });

  it('marca selecionado no modo single', () => {
    render(<ChipGrupo opcoes={opcoes} selecionados={['opcao2']} aoAlterar={vi.fn()} multiplo={false} />);
    expect(screen.getByRole('button', { name: 'Opção 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Opção 1' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marca múltiplos selecionados no modo multiplo', () => {
    render(<ChipGrupo opcoes={opcoes} selecionados={['opcao1', 'opcao3']} aoAlterar={vi.fn()} multiplo />);
    expect(screen.getByRole('button', { name: 'Opção 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Opção 3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Opção 2' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('atualiza seleção ao clicar (single)', () => {
    const onChange = vi.fn();
    render(<ChipGrupo opcoes={opcoes} selecionados={[]} aoAlterar={onChange} multiplo={false} />);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Opção 2' }));
    });
    expect(onChange).toHaveBeenCalledWith(['opcao2']);
  });

  it('adiciona/remove seleção ao clicar (multiplo)', () => {
    const onChange = vi.fn();
    let selecionados = ['opcao1'];

    const { rerender } = render(<ChipGrupo opcoes={opcoes} selecionados={selecionados} aoAlterar={onChange} multiplo />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Opção 2' }));
    });
    expect(onChange).toHaveBeenCalledWith(['opcao1', 'opcao2']);

    selecionados = ['opcao1', 'opcao2'];
    rerender(<ChipGrupo opcoes={opcoes} selecionados={selecionados} aoAlterar={onChange} multiplo />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Opção 1' }));
    });
    expect(onChange).toHaveBeenCalledWith(['opcao2']);
  });

  it('aplica variante filtro', () => {
    render(<ChipGrupo opcoes={opcoes} selecionados={[]} aoAlterar={vi.fn()} multiplo={false} variante="filtro" />);
    expect(screen.getByRole('button', { name: 'Opção 1' })).toHaveClass('chip--filtro');
  });

  it('aplica classe personalizada', () => {
    render(<ChipGrupo opcoes={opcoes} selecionados={[]} aoAlterar={vi.fn()} multiplo={false} className="meu-grupo" />);
    expect(screen.getByRole('group')).toHaveClass('meu-grupo');
  });

  it('define role="group"', () => {
    render(<ChipGrupo opcoes={opcoes} selecionados={[]} aoAlterar={vi.fn()} multiplo={false} />);
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('define aria-label', () => {
    render(<ChipGrupo opcoes={opcoes} selecionados={[]} aoAlterar={vi.fn()} multiplo={false} label="Escolha uma opção" />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Escolha uma opção');
  });
});