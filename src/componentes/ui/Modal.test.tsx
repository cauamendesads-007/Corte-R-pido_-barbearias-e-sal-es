/**
 * Testes para componente Modal
 * Cobertura: 100%
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { Modal, ModalFormulario, ModalConfirmacao } from './Modal';

describe('Modal', () => {
  it('não renderiza quando fechado', () => {
    render(<Modal aberto={false} aoFechar={vi.fn()}>Conteúdo</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza quando aberto', () => {
    render(<Modal aberto aoFechar={vi.fn()}>Conteúdo do modal</Modal>);
    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
    expect(screen.getByText('Conteúdo do modal')).toBeInTheDocument();
  });

  it('renderiza título quando fornecido', () => {
    render(<Modal aberto aoFechar={vi.fn()} titulo="Título do Modal" />);
    expect(screen.getByRole('heading', { name: 'Título do Modal', hidden: true })).toBeInTheDocument();
  });

  it('fecha ao clicar no backdrop', () => {
    const onClose = vi.fn();
    render(<Modal aberto aoFechar={onClose} fecharNoBackdrop>Conteúdo</Modal>);
    const backdrop = screen.getByTestId('undefined-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha ao clicar no backdrop quando fecharNoBackdrop=false', () => {
    const onClose = vi.fn();
    render(<Modal aberto aoFechar={onClose} fecharNoBackdrop={false}>Conteúdo</Modal>);
    const backdrop = screen.getByTestId('undefined-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('fecha ao pressionar Escape', () => {
    const onClose = vi.fn();
    render(<Modal aberto aoFechar={onClose} fecharComEsc>Conteúdo</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha ao pressionar Escape quando fecharComEsc=false', () => {
    const onClose = vi.fn();
    render(<Modal aberto aoFechar={onClose} fecharComEsc={false}>Conteúdo</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('aplica tamanho pequeno', () => {
    render(<Modal aberto aoFechar={vi.fn()} tamanho="pequeno">Conteúdo</Modal>);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('modal--pequeno');
  });

  it('aplica tamanho médio (padrão)', () => {
    render(<Modal aberto aoFechar={vi.fn()} tamanho="medio">Conteúdo</Modal>);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('modal--medio');
  });

  it('aplica tamanho grande', () => {
    render(<Modal aberto aoFechar={vi.fn()} tamanho="grande">Conteúdo</Modal>);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('modal--grande');
  });

  it('aplica tamanho tela-cheia', () => {
    render(<Modal aberto aoFechar={vi.fn()} tamanho="tela-cheia">Conteúdo</Modal>);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('modal--tela-cheia');
  });

  it('aplica className personalizada', () => {
    render(<Modal aberto aoFechar={vi.fn()} className="minha-classe">Conteúdo</Modal>);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('minha-classe');
  });

  it('define aria-labelledby quando tem título', () => {
    render(<Modal aberto aoFechar={vi.fn()} titulo="Meu Título">Conteúdo</Modal>);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-labelledby');
  });

  it('define aria-label quando não tem título mas tem ariaLabel', () => {
    render(<Modal aberto aoFechar={vi.fn()} ariaLabel="Modal sem título">Conteúdo</Modal>);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-label', 'Modal sem título');
  });
});

describe('ModalFormulario', () => {
  it('renderiza formulário com título', () => {
    render(
      <ModalFormulario aberto aoFechar={vi.fn()} titulo="Novo Item" aoSalvar={vi.fn()}>
        <input name="nome" />
      </ModalFormulario>
    );
    expect(screen.getByRole('heading', { name: 'Novo Item', hidden: true })).toBeInTheDocument();
  });

  it('renderiza botão de salvar', () => {
    render(
      <ModalFormulario aberto aoFechar={vi.fn()} titulo="Novo" aoSalvar={vi.fn()}>
        <input name="nome" />
      </ModalFormulario>
    );
    expect(screen.getByRole('button', { name: /salvar/i, hidden: true })).toBeInTheDocument();
  });

  it('renderiza botão de cancelar', () => {
    render(
      <ModalFormulario aberto aoFechar={vi.fn()} titulo="Novo" aoSalvar={vi.fn()}>
        <input name="nome" />
      </ModalFormulario>
    );
    expect(screen.getByRole('button', { name: /cancelar/i, hidden: true })).toBeInTheDocument();
  });

  it('chama aoSalvar ao clicar em salvar', () => {
    const onSave = vi.fn();
    render(
      <ModalFormulario aberto aoFechar={vi.fn()} titulo="Novo" aoSalvar={onSave}>
        <input name="nome" />
      </ModalFormulario>
    );
    fireEvent.click(screen.getByRole('button', { name: /salvar/i, hidden: true }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('chama aoFechar ao clicar em cancelar', () => {
    const onClose = vi.fn();
    render(
      <ModalFormulario aberto aoFechar={onClose} titulo="Novo" aoSalvar={vi.fn()}>
        <input name="nome" />
      </ModalFormulario>
    );
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i, hidden: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('desabilita botão salvar quando carregando', () => {
    render(
      <ModalFormulario aberto aoFechar={vi.fn()} titulo="Novo" aoSalvar={vi.fn()} carregando>
        <input name="nome" />
      </ModalFormulario>
    );
    expect(screen.getByRole('button', { name: /salvar/i, hidden: true })).toBeDisabled();
  });

  it('mostra spinner quando carregando', () => {
    render(
      <ModalFormulario aberto aoFechar={vi.fn()} titulo="Novo" aoSalvar={vi.fn()} carregando>
        <input name="nome" />
      </ModalFormulario>
    );
    const botaoSalvar = screen.getByRole('button', { name: /salvar/i, hidden: true });
    expect(botaoSalvar).toHaveClass('botao--carregando');
    expect(botaoSalvar).toContainHTML('animar-giro');
  });
});

describe('ModalConfirmacao', () => {
  it('renderiza título e mensagem', () => {
    render(
      <ModalConfirmacao
        aberto
        aoFechar={vi.fn()}
        aoConfirmar={vi.fn()}
        titulo="Confirmar exclusão"
        mensagem="Tem certeza?"
      />
    );
    expect(screen.getByRole('heading', { name: 'Confirmar exclusão', hidden: true })).toBeInTheDocument();
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument();
  });

  it('renderiza botão confirmar com variante perigo', () => {
    render(
      <ModalConfirmacao
        aberto
        aoFechar={vi.fn()}
        aoConfirmar={vi.fn()}
        titulo="Confirmar"
        mensagem="Mensagem"
      />
    );
    expect(screen.getByRole('button', { name: /confirmar|excluir|sim/i, hidden: true })).toHaveClass('botao--perigo');
  });

  it('renderiza botão cancelar', () => {
    render(
      <ModalConfirmacao
        aberto
        aoFechar={vi.fn()}
        aoConfirmar={vi.fn()}
        titulo="Confirmar"
        mensagem="Mensagem"
      />
    );
    expect(screen.getByRole('button', { name: /cancelar|não/i, hidden: true })).toBeInTheDocument();
  });

  it('chama aoConfirmar ao clicar em confirmar', () => {
    const onConfirm = vi.fn();
    render(
      <ModalConfirmacao
        aberto
        aoFechar={vi.fn()}
        aoConfirmar={onConfirm}
        titulo="Confirmar"
        mensagem="Mensagem"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /confirmar|excluir|sim/i, hidden: true }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('chama aoFechar ao clicar em cancelar', () => {
    const onClose = vi.fn();
    render(
      <ModalConfirmacao
        aberto
        aoFechar={onClose}
        aoConfirmar={vi.fn()}
        titulo="Confirmar"
        mensagem="Mensagem"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /cancelar|não/i, hidden: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('personaliza textos dos botões', () => {
    render(
      <ModalConfirmacao
        aberto
        aoFechar={vi.fn()}
        aoConfirmar={vi.fn()}
        titulo="Confirmar"
        mensagem="Mensagem"
        textoConfirmar="Sim, excluir"
        textoCancelar="Não, manter"
      />
    );
    expect(screen.getByRole('button', { name: 'Sim, excluir', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Não, manter', hidden: true })).toBeInTheDocument();
  });
});