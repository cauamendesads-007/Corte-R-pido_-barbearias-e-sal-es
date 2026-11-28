/**
 * Testes para componente Checkbox
 * Cobertura: 100%
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox, CheckboxGrupo } from './Checkbox';

describe('Checkbox', () => {
  it('renderiza checkbox com label', () => {
    render(<Checkbox label="Aceito os termos" valor={false} aoAlterar={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Aceito os termos' })).toBeInTheDocument();
  });

  it('marca como checked quando valor=true', () => {
    render(<Checkbox label="Opção" valor={true} aoAlterar={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('não marca quando valor=false', () => {
    render(<Checkbox label="Opção" valor={false} aoAlterar={vi.fn()} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('atualiza valor ao clicar', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Opção" valor={false} aoAlterar={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('desabilita quando desabilitado=true', () => {
    render(<Checkbox label="Opção" valor={false} aoAlterar={vi.fn()} desabilitado />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('aplica id personalizado', () => {
    render(<Checkbox label="Opção" valor={false} aoAlterar={vi.fn()} id="meu-checkbox" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'meu-checkbox');
  });

  it('aplica className personalizada', () => {
    render(<Checkbox label="Opção" valor={false} aoAlterar={vi.fn()} className="minha-classe" />);
    expect(screen.getByRole('checkbox').parentElement).toHaveClass('minha-classe');
  });

  it('mostra indeterminado quando indeterminado=true', () => {
    render(<Checkbox label="Opção" valor={false} aoAlterar={vi.fn()} indeterminado />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed');
  });

  it('aplica data-testid', () => {
    render(<Checkbox label="Opção" valor={false} aoAlterar={vi.fn()} data-testid="meu-checkbox" />);
    expect(screen.getByTestId('meu-checkbox')).toBeInTheDocument();
  });
});

describe('CheckboxGrupo', () => {
  const opcoes = [
    { valor: 'opcao1', rotulo: 'Opção 1' },
    { valor: 'opcao2', rotulo: 'Opção 2' },
    { valor: 'opcao3', rotulo: 'Opção 3' },
  ];

  it('renderiza todos os checkboxes', () => {
    render(<CheckboxGrupo opcoes={opcoes} selecionados={[]} aoAlterar={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Opção 1' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Opção 2' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Opção 3' })).toBeInTheDocument();
  });

  it('marca selecionados', () => {
    render(<CheckboxGrupo opcoes={opcoes} selecionados={['opcao1', 'opcao3']} aoAlterar={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Opção 1' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Opção 3' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Opção 2' })).not.toBeChecked();
  });

  it('atualiza seleção ao clicar', () => {
    const onChange = vi.fn();
    render(<CheckboxGrupo opcoes={opcoes} selecionados={[]} aoAlterar={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Opção 2' }));
    expect(onChange).toHaveBeenCalledWith(['opcao2']);
  });

  it('adiciona/remove da seleção', () => {
    const onChange = vi.fn();
    render(<CheckboxGrupo opcoes={opcoes} selecionados={['opcao1']} aoAlterar={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Opção 1' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('aplica label do grupo', () => {
    render(<CheckboxGrupo opcoes={opcoes} selecionados={[]} aoAlterar={vi.fn()} label="Escolha opções" />);
    expect(screen.getByText('Escolha opções')).toBeInTheDocument();
  });

  it('define role="group"', () => {
    render(<CheckboxGrupo opcoes={opcoes} selecionados={[]} aoAlterar={vi.fn()} />);
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('aplica className personalizada', () => {
    render(<CheckboxGrupo opcoes={opcoes} selecionados={[]} aoAlterar={vi.fn()} className="meu-grupo" />);
    expect(screen.getByRole('group')).toHaveClass('meu-grupo');
  });

  it('define orientação vertical por padrão', () => {
    render(<CheckboxGrupo opcoes={opcoes} selecionados={[]} aoAlterar={vi.fn()} />);
    expect(screen.getByRole('group')).toHaveClass('checkbox-grupo--vertical');
  });

  it('aplica orientação horizontal', () => {
    render(<CheckboxGrupo opcoes={opcoes} selecionados={[]} aoAlterar={vi.fn()} orientacao="horizontal" />);
    expect(screen.getByRole('group')).toHaveClass('checkbox-grupo--horizontal');
  });
});