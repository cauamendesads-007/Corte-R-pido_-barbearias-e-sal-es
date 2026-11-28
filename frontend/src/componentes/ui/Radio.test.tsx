/**
 * Testes para componente Radio
 * Cobertura: 100%
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Radio, RadioGrupo } from './Radio';

describe('Radio', () => {
  it('renderiza radio com label', () => {
    render(<Radio label="Opção A" valor="a" selecionado="a" aoAlterar={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Opção A' })).toBeInTheDocument();
  });

  it('marca como checked quando valor corresponde', () => {
    render(<Radio label="Opção A" valor="a" selecionado="a" aoAlterar={vi.fn()} />);
    expect(screen.getByRole('radio')).toBeChecked();
  });

  it('não marca quando valor não corresponde', () => {
    render(<Radio label="Opção A" valor="a" selecionado="b" aoAlterar={vi.fn()} />);
    expect(screen.getByRole('radio')).not.toBeChecked();
  });

  it('atualiza valor ao clicar', () => {
    const onChange = vi.fn();
    render(<Radio label="Opção A" valor="a" selecionado="b" aoAlterar={onChange} />);
    fireEvent.click(screen.getByRole('radio'));
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('desabilita quando desabilitado=true', () => {
    render(<Radio label="Opção A" valor="a" selecionado="b" aoAlterar={vi.fn()} desabilitado />);
    expect(screen.getByRole('radio')).toBeDisabled();
  });

  it('aplica id personalizado', () => {
    render(<Radio label="Opção A" valor="a" selecionado="b" aoAlterar={vi.fn()} id="meu-radio" />);
    expect(screen.getByRole('radio')).toHaveAttribute('id', 'meu-radio');
  });

  it('aplica className personalizada', () => {
    render(<Radio label="Opção A" valor="a" selecionado="b" aoAlterar={vi.fn()} className="minha-classe" />);
    expect(screen.getByRole('radio').parentElement).toHaveClass('minha-classe');
  });

  it('aplica data-testid', () => {
    render(<Radio label="Opção A" valor="a" selecionado="b" aoAlterar={vi.fn()} data-testid="meu-radio" />);
    expect(screen.getByTestId('meu-radio')).toBeInTheDocument();
  });
});

describe('RadioGrupo', () => {
  const opcoes = [
    { valor: 'opcao1', rotulo: 'Opção 1' },
    { valor: 'opcao2', rotulo: 'Opção 2' },
    { valor: 'opcao3', rotulo: 'Opção 3' },
  ];

  it('renderiza todos os radios', () => {
    render(<RadioGrupo opcoes={opcoes} selecionado="" aoAlterar={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Opção 1' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Opção 2' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Opção 3' })).toBeInTheDocument();
  });

  it('marca o selecionado', () => {
    render(<RadioGrupo opcoes={opcoes} selecionado="opcao2" aoAlterar={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Opção 2' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Opção 1' })).not.toBeChecked();
  });

  it('atualiza seleção ao clicar', () => {
    const onChange = vi.fn();
    render(<RadioGrupo opcoes={opcoes} selecionado="" aoAlterar={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Opção 3' }));
    expect(onChange).toHaveBeenCalledWith('opcao3');
  });

  it('aplica label do grupo', () => {
    render(<RadioGrupo opcoes={opcoes} selecionado="" aoAlterar={vi.fn()} label="Escolha uma opção" />);
    expect(screen.getByText('Escolha uma opção')).toBeInTheDocument();
  });

  it('define role="radiogroup"', () => {
    render(<RadioGrupo opcoes={opcoes} selecionado="" aoAlterar={vi.fn()} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('aplica className personalizada', () => {
    render(<RadioGrupo opcoes={opcoes} selecionado="" aoAlterar={vi.fn()} className="meu-grupo" />);
    expect(screen.getByRole('radiogroup')).toHaveClass('meu-grupo');
  });

  it('define orientação vertical por padrão', () => {
    render(<RadioGrupo opcoes={opcoes} selecionado="" aoAlterar={vi.fn()} />);
    expect(screen.getByRole('radiogroup')).toHaveClass('radio-grupo--vertical');
  });

  it('aplica orientação horizontal', () => {
    render(<RadioGrupo opcoes={opcoes} selecionado="" aoAlterar={vi.fn()} orientacao="horizontal" />);
    expect(screen.getByRole('radiogroup')).toHaveClass('radio-grupo--horizontal');
  });

  it('desabilita opção individual', () => {
    const opcoesComDesabilitada = [
      { valor: 'opcao1', rotulo: 'Opção 1' },
      { valor: 'opcao2', rotulo: 'Opção 2', desabilitado: true },
    ];
    render(<RadioGrupo opcoes={opcoesComDesabilitada} selecionado="" aoAlterar={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Opção 2' })).toBeDisabled();
  });
});