/**
 * Testes para componente Textarea
 * Cobertura: 100%
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renderiza label e textarea', () => {
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} />);
    const textarea = screen.getByLabelText('Descrição');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('mostra asterisco quando obrigatório', () => {
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} obrigatorio />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('atualiza valor ao digitar', () => {
    const onChange = vi.fn();
    render(<Textarea label="Descrição" valor="" aoAlterar={onChange} />);
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Nova descrição' } });
    expect(onChange).toHaveBeenCalledWith('Nova descrição');
  });

  it('aplica valor inicial', () => {
    render(<Textarea label="Descrição" valor="Descrição inicial" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('Descrição')).toHaveValue('Descrição inicial');
  });

  it('mostra erro quando prop erro fornecida', () => {
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} erro="Campo obrigatório" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório');
    expect(screen.getByLabelText('Descrição')).toHaveAttribute('aria-invalid', 'true');
  });

  it('mostra texto de ajuda', () => {
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} ajuda="Máximo 300 caracteres" />);
    expect(screen.getByText('Máximo 300 caracteres')).toBeInTheDocument();
  });

  it('desabilita quando desabilitado=true', () => {
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} desabilitado />);
    expect(screen.getByLabelText('Descrição')).toBeDisabled();
  });

  it('aplica placeholder', () => {
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} placeholder="Digite aqui..." />);
    expect(screen.getByLabelText('Descrição')).toHaveAttribute('placeholder', 'Digite aqui...');
  });

  it('aplica número de linhas', () => {
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} linhas={5} />);
    expect(screen.getByLabelText('Descrição')).toHaveAttribute('rows', '5');
  });

  it('usa 3 linhas por padrão', () => {
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('Descrição')).toHaveAttribute('rows', '3');
  });

  it('aplica maxLength', () => {
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} maxLength={300} />);
    expect(screen.getByLabelText('Descrição')).toHaveAttribute('maxlength', '300');
  });

  it('aplica autoFocus', () => {
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} autoFocus />);
    expect(screen.getByLabelText('Descrição')).toHaveFocus();
  });

  it('aplica id personalizado', () => {
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} id="meu-textarea" />);
    expect(screen.getByLabelText('Descrição')).toHaveAttribute('id', 'meu-textarea');
  });

  it('aplica className personalizada', () => {
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} className="minha-classe" />);
    expect(screen.getByLabelText('Descrição')).toHaveClass('minha-classe');
  });

  it('chama onBlur', () => {
    const onBlur = vi.fn();
    render(<Textarea label="Descrição" valor="" aoAlterar={vi.fn()} onBlur={onBlur} />);
    fireEvent.blur(screen.getByLabelText('Descrição'));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('contador de caracteres quando maxLength definido', () => {
    render(<Textarea label="Descrição" valor="abc" aoAlterar={vi.fn()} maxLength={10} />);
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });
});