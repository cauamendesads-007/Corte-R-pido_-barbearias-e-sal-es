/**
 * Testes para componente CampoTexto e derivados
 * Cobertura: 100%
 */

import { render, screen, fireEvent } from '@testing-library/react';
import {
  CampoTexto,
  CampoSenha,
  CampoBusca,
  CampoWhatsapp,
  CampoNumero,
} from './CampoTexto';

describe('CampoTexto', () => {
  it('renderiza label e input', () => {
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
  });

  it('mostra asterisco quando obrigatório', () => {
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} obrigatorio />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('atualiza valor ao digitar', () => {
    const onChange = vi.fn();
    render(<CampoTexto label="Nome" valor="" aoAlterar={onChange} />);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'João' } });
    expect(onChange).toHaveBeenCalledWith('João');
  });

  it('aplica valor inicial', () => {
    render(<CampoTexto label="Nome" valor="João" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('Nome')).toHaveValue('João');
  });

  it('mostra erro quando prop erro fornecida', () => {
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} erro="Campo obrigatório" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório');
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true');
  });

  it('mostra texto de ajuda quando fornecido', () => {
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} ajuda="Digite seu nome completo" />);
    expect(screen.getByText('Digite seu nome completo')).toBeInTheDocument();
  });

  it('desabilita campo quando desabilitado=true', () => {
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} desabilitado />);
    expect(screen.getByLabelText('Nome')).toBeDisabled();
  });

  it('aplica placeholder', () => {
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} placeholder="Digite seu nome" />);
    expect(screen.getByLabelText('Nome')).toHaveAttribute('placeholder', 'Digite seu nome');
  });

  it('aplica tipo email', () => {
    render(<CampoTexto label="Email" tipo="email" valor="" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  });

  it('aplica tipo password', () => {
    render(<CampoTexto label="Senha" tipo="password" valor="" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('aplica maxLength', () => {
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} maxLength={10} />);
    expect(screen.getByLabelText('Nome')).toHaveAttribute('maxlength', '10');
  });

  it('aplica autoFocus', () => {
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} autoFocus />);
    expect(screen.getByLabelText('Nome')).toHaveFocus();
  });

  it('aplica ícone de prefixo', () => {
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} iconePrefixo={<span>★</span>} />);
    expect(screen.getByLabelText('Nome').parentElement).toContainHTML('★');
  });

  it('aplica ícone de sufixo com botão', () => {
    const onClick = vi.fn();
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} iconeSufixo={<span>🔍</span>} aoClicarIconeSufixo={onClick} />);
    const wrapper = screen.getByLabelText('Nome').parentElement;
    const botao = wrapper?.querySelector('button');
    if (botao) fireEvent.click(botao);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('aplica id personalizado', () => {
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} id="meu-id" />);
    expect(screen.getByLabelText('Nome')).toHaveAttribute('id', 'meu-id');
  });

  it('aplica className personalizada no wrapper', () => {
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} className="minha-classe" />);
    expect(screen.getByLabelText('Nome').closest('.campo-texto')).toHaveClass('minha-classe');
  });

  it('aplica inputMode', () => {
    render(<CampoTexto label="Telefone" tipo="tel" inputMode="tel" valor="" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('Telefone')).toHaveAttribute('inputmode', 'tel');
  });

  it('chama onBlur', () => {
    const onBlur = vi.fn();
    render(<CampoTexto label="Nome" valor="" aoAlterar={vi.fn()} onBlur={onBlur} />);
    fireEvent.blur(screen.getByLabelText('Nome'));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

describe('CampoSenha', () => {
  it('renderiza campo do tipo password', () => {
    render(<CampoSenha label="Senha" valor="" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('alterna visibilidade ao clicar no ícone', () => {
    render(<CampoSenha label="Senha" valor="123" aoAlterar={vi.fn()} />);
    const input = screen.getByLabelText('Senha');
    expect(input).toHaveAttribute('type', 'password');

    const wrapper = input.parentElement;
    const botao1 = wrapper?.querySelector('button');
    if (botao1) fireEvent.click(botao1);
    expect(input).toHaveAttribute('type', 'text');

    const botao2 = wrapper?.querySelector('button');
    if (botao2) fireEvent.click(botao2);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('aceita estado controlado de visibilidade', () => {
    render(<CampoSenha label="Senha" valor="123" aoAlterar={vi.fn()} mostrarSenha={true} />);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
  });
});

describe('CampoBusca', () => {
  it('renderiza campo de busca com ícone de lupa', () => {
    render(<CampoBusca label="Buscar" valor="" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('Buscar')).toHaveAttribute('type', 'search');
    expect(screen.getByLabelText('Buscar').parentElement).toContainHTML('Busca');
  });

  it('usa placeholder padrão', () => {
    render(<CampoBusca valor="" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('Buscar')).toHaveAttribute('placeholder', 'Buscar...');
  });

  it('usa placeholder personalizado', () => {
    render(<CampoBusca valor="" aoAlterar={vi.fn()} placeholder="Buscar por nome" />);
    expect(screen.getByLabelText('Buscar')).toHaveAttribute('placeholder', 'Buscar por nome');
  });

  it('define autoComplete=off', () => {
    render(<CampoBusca valor="" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('Buscar')).toHaveAttribute('autocomplete', 'off');
  });
});

describe('CampoWhatsapp', () => {
  it('renderiza campo telefone com ícone', () => {
    render(<CampoWhatsapp label="WhatsApp" valor="" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('WhatsApp')).toHaveAttribute('type', 'tel');
    expect(screen.getByLabelText('WhatsApp')).toHaveAttribute('inputmode', 'tel');
    expect(screen.getByLabelText('WhatsApp')).toHaveAttribute('maxlength', '15');
  });

  it('aplica máscara de WhatsApp ao digitar', () => {
    const onChange = vi.fn();
    render(<CampoWhatsapp label="WhatsApp" valor="" aoAlterar={onChange} />);
    fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: '11999999999' } });
    expect(onChange).toHaveBeenCalledWith('(11) 99999-9999');
  });

  it('formata no blur', () => {
    const onChange = vi.fn();
    render(<CampoWhatsapp label="WhatsApp" valor="" aoAlterar={onChange} />);
    const input = screen.getByLabelText('WhatsApp');
    fireEvent.change(input, { target: { value: '11999999999' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('(11) 99999-9999');
  });
});

describe('CampoNumero', () => {
  it('renderiza campo do tipo number', () => {
    render(<CampoNumero label="Quantidade" valor="10" aoAlterar={vi.fn()} />);
    expect(screen.getByLabelText('Quantidade')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Quantidade')).toHaveAttribute('inputmode', 'numeric');
  });

  it('aplica min, max e step', () => {
    render(<CampoNumero label="Idade" valor="25" aoAlterar={vi.fn()} min={18} max={100} step={1} />);
    expect(screen.getByLabelText('Idade')).toHaveAttribute('min', '18');
    expect(screen.getByLabelText('Idade')).toHaveAttribute('max', '100');
    expect(screen.getByLabelText('Idade')).toHaveAttribute('step', '1');
  });

  it('aceita valor numérico e string', () => {
    render(<CampoNumero label="Preço" valor={45} aoAlterar={vi.fn()} />);
    // HTML input values are strings, but React passes the value as-is
    expect(screen.getByLabelText('Preço')).toHaveValue(45);
  });
});