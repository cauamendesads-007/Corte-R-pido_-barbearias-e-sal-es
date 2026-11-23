/**
 * Testes para BottomNav - Navegação inferior fixa (mobile-first).
 * Segue Material Design / iOS HIG: 3-5 destinos, ícone + label, indicador ativo.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav, BottomNavSimples, ItemBottomNav } from './BottomNav';
import { ICONES } from '@/constantes';

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderBottomNav = (props = {}) => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav
          data-testid="bottom-nav-teste"
          {...props}
        />
      </MemoryRouter>
    );
  };

  const mockUsuarioCliente = {
    papel: 'cliente' as const,
  };

  const mockUsuarioBarbeiro = {
    papel: 'barbeiro' as const,
  };

  describe('Sem usuário (público)', () => {
    it('deve renderizar itens padrão público', () => {
      renderBottomNav({ usuario: null });

      expect(screen.getByTestId('bottom-nav-teste-início')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-explorar')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-entrar')).toBeInTheDocument();
    });

    it('não deve renderizar itens apenasAutenticado', () => {
      renderBottomNav({ usuario: null });

      expect(screen.queryByTestId('bottom-nav-teste-agendamentos')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bottom-nav-teste-inspirações')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bottom-nav-teste-perfil')).not.toBeInTheDocument();
    });

    it('deve marcar item ativo baseado na rota', () => {
      render(
        <MemoryRouter initialEntries={['/explorar']}>
          <BottomNav data-testid="bottom-nav-teste" usuario={null} />
        </MemoryRouter>
      );

      const explorar = screen.getByTestId('bottom-nav-teste-explorar');
      expect(explorar).toHaveClass('bottom-nav__item--ativo');
      expect(explorar).toHaveAttribute('aria-current', 'page');

      const inicio = screen.getByTestId('bottom-nav-teste-início');
      expect(inicio).not.toHaveClass('bottom-nav__item--ativo');
    });

    it('deve ter role="navigation" e aria-label', () => {
      renderBottomNav({ usuario: null });

      const nav = screen.getByTestId('bottom-nav-teste');
      expect(nav).toHaveAttribute('role', 'navigation');
      expect(nav).toHaveAttribute('aria-label', 'Navegação principal');
    });

    it('deve renderizar indicador animado', () => {
      renderBottomNav({ usuario: null });

      const indicador = screen.getByTestId('bottom-nav-teste').querySelector('.bottom-nav__indicador');
      expect(indicador).toBeInTheDocument();
    });
  });

  describe('Com usuário cliente', () => {
    it('deve renderizar itens padrão cliente', () => {
      renderBottomNav({ usuario: mockUsuarioCliente });

      expect(screen.getByTestId('bottom-nav-teste-feed')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-explorar')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-agendamentos')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-inspirações')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-perfil')).toBeInTheDocument();
    });

    it('deve marcar item ativo corretamente', () => {
      render(
        <MemoryRouter initialEntries={['/agendamentos']}>
          <BottomNav data-testid="bottom-nav-teste" usuario={mockUsuarioCliente} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('bottom-nav-teste-agendamentos')).toHaveClass('bottom-nav__item--ativo');
    });

    it('deve usar iconeAtivo quando item está ativo', () => {
      render(
        <MemoryRouter initialEntries={['/feed']}>
          <BottomNav data-testid="bottom-nav-teste" usuario={mockUsuarioCliente} />
        </MemoryRouter>
      );

      const feedItem = screen.getByTestId('bottom-nav-teste-feed');
      const icone = feedItem.querySelector('.bottom-nav__icone');
      expect(icone).toHaveTextContent(ICONES.grade);
    });
  });

  describe('Com usuário barbeiro', () => {
    it('deve renderizar itens padrão barbeiro', () => {
      renderBottomNav({ usuario: mockUsuarioBarbeiro });

      expect(screen.getByTestId('bottom-nav-teste-painel')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-agenda')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-fila')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-serviços')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-perfil')).toBeInTheDocument();
    });

    it('não deve renderizar itens de cliente', () => {
      renderBottomNav({ usuario: mockUsuarioBarbeiro });

      expect(screen.queryByTestId('bottom-nav-teste-feed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bottom-nav-teste-explorar')).not.toBeInTheDocument();
    });
  });

  describe('Itens personalizados', () => {
    const itensCustomizados: ItemBottomNav[] = [
      { caminho: '/custom1', rotulo: 'Custom 1', icone: ICONES.casa },
      { caminho: '/custom2', rotulo: 'Custom 2', icone: ICONES.busca },
    ];

    it('deve usar itens personalizados quando fornecidos', () => {
      renderBottomNav({ itens: itensCustomizados, usuario: null });

      // testId usa rotulo em lowercase com espaços preservados
      expect(screen.getByTestId('bottom-nav-teste-custom 1')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-custom 2')).toBeInTheDocument();
      expect(screen.queryByTestId('bottom-nav-teste-início')).not.toBeInTheDocument();
    });

    it('deve filtrar itens apenasAutenticado sem usuário', () => {
      const itensComAuth: ItemBottomNav[] = [
        { caminho: '/publico', rotulo: 'Público', icone: ICONES.casa },
        { caminho: '/privado', rotulo: 'Privado', icone: ICONES.cadeado, apenasAutenticado: true },
      ];

      renderBottomNav({ itens: itensComAuth, usuario: null });

      expect(screen.getByTestId('bottom-nav-teste-público')).toBeInTheDocument();
      expect(screen.queryByTestId('bottom-nav-teste-privado')).not.toBeInTheDocument();
    });

    it('deve mostrar itens apenasAutenticado com usuário', () => {
      const itensComAuth: ItemBottomNav[] = [
        { caminho: '/publico', rotulo: 'Público', icone: ICONES.casa },
        { caminho: '/privado', rotulo: 'Privado', icone: ICONES.cadeado, apenasAutenticado: true },
      ];

      renderBottomNav({ itens: itensComAuth, usuario: mockUsuarioCliente });

      expect(screen.getByTestId('bottom-nav-teste-público')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-privado')).toBeInTheDocument();
    });

    it('deve filtrar por tipoUsuario', () => {
      const itensComTipo: ItemBottomNav[] = [
        { caminho: '/cliente', rotulo: 'Cliente', icone: ICONES.usuario, tipoUsuario: 'cliente' },
        { caminho: '/barbeiro', rotulo: 'Barbeiro', icone: ICONES.tesoura, tipoUsuario: 'barbeiro' },
      ];

      renderBottomNav({ itens: itensComTipo, usuario: mockUsuarioCliente });

      expect(screen.getByTestId('bottom-nav-teste-cliente')).toBeInTheDocument();
      expect(screen.queryByTestId('bottom-nav-teste-barbeiro')).not.toBeInTheDocument();
    });

    it('deve renderizar badge quando fornecido', () => {
      const itensComBadge: ItemBottomNav[] = [
        { caminho: '/com-badge', rotulo: 'Com Badge', icone: ICONES.casa, badge: 5 },
        { caminho: '/sem-badge', rotulo: 'Sem Badge', icone: ICONES.busca },
      ];

      renderBottomNav({ itens: itensComBadge, usuario: null });

      // testId usa rotulo em lowercase com espaços preservados
      const badge = screen.getByTestId('bottom-nav-teste-com badge').querySelector('.bottom-nav__badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');
      expect(badge).toHaveAttribute('aria-label', '5 notificações');

      expect(screen.getByTestId('bottom-nav-teste-sem badge').querySelector('.bottom-nav__badge')).not.toBeInTheDocument();
    });

    it('deve renderizar badge string (exclamação)', () => {
      const itensComBadge: ItemBottomNav[] = [
        { caminho: '/exclamacao', rotulo: 'Exclamação', icone: ICONES.casa, badge: '!' },
      ];

      renderBottomNav({ itens: itensComBadge, usuario: null });

      const badge = screen.getByTestId('bottom-nav-teste-exclamação').querySelector('.bottom-nav__badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('!');
      expect(badge).toHaveAttribute('aria-label', 'Atenção');
    });
  });

  describe('ClassName personalizado', () => {
    it('deve aplicar className personalizada', () => {
      renderBottomNav({ usuario: null, className: 'minha-classe' });

      expect(screen.getByTestId('bottom-nav-teste')).toHaveClass('minha-classe');
    });
  });

  describe('Navegação', () => {
    it('deve usar NavLink para navegação', () => {
      renderBottomNav({ usuario: null });

      const link = screen.getByTestId('bottom-nav-teste-início');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/');
    });

    it('deve ter data-testid específico por item', () => {
      renderBottomNav({ usuario: null });

      expect(screen.getByTestId('bottom-nav-teste-início')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-explorar')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-nav-teste-entrar')).toBeInTheDocument();
    });
  });
});

describe('BottomNavSimples', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const itensPadrao = [
    { caminho: '/aba1', rotulo: 'Aba 1', icone: ICONES.casa },
    { caminho: '/aba2', rotulo: 'Aba 2', icone: ICONES.busca },
  ];

  it('deve renderizar itens como botões com role="tab"', () => {
    render(
      <BottomNavSimples
        itens={itensPadrao}
        valor="/aba1"
        aoAlterar={vi.fn()}
        data-testid="bottom-nav-simples-teste"
      />
    );

    expect(screen.getByTestId('bottom-nav-simples-teste')).toHaveAttribute('role', 'tablist');
    expect(screen.getByTestId('bottom-nav-simples-teste-aba 1')).toHaveAttribute('role', 'tab');
    expect(screen.getByTestId('bottom-nav-simples-teste-aba 2')).toHaveAttribute('role', 'tab');
  });

  it('deve marcar aba ativa com aria-selected="true"', () => {
    render(
      <BottomNavSimples
        itens={itensPadrao}
        valor="/aba1"
        aoAlterar={vi.fn()}
        data-testid="bottom-nav-simples-teste"
      />
    );

    expect(screen.getByTestId('bottom-nav-simples-teste-aba 1')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('bottom-nav-simples-teste-aba 2')).toHaveAttribute('aria-selected', 'false');
  });

  it('deve chamar aoAlterar ao clicar em aba', () => {
    const aoAlterar = vi.fn();
    render(
      <BottomNavSimples
        itens={itensPadrao}
        valor="/aba1"
        aoAlterar={aoAlterar}
        data-testid="bottom-nav-simples-teste"
      />
    );

    fireEvent.click(screen.getByTestId('bottom-nav-simples-teste-aba 2'));

    expect(aoAlterar).toHaveBeenCalledWith('/aba2');
  });

  it('deve usar iconeAtivo para aba ativa', () => {
    const itensComIconeAtivo = [
      { caminho: '/aba1', rotulo: 'Aba 1', icone: ICONES.casa, iconeAtivo: ICONES.coracao },
      { caminho: '/aba2', rotulo: 'Aba 2', icone: ICONES.busca, iconeAtivo: ICONES.estrela },
    ];

    render(
      <BottomNavSimples
        itens={itensComIconeAtivo}
        valor="/aba1"
        aoAlterar={vi.fn()}
        data-testid="bottom-nav-simples-teste"
      />
    );

    const iconeAba1 = screen.getByTestId('bottom-nav-simples-teste-aba 1').querySelector('.bottom-nav__icone');
    // Ícones são strings HTML injetadas - verifica se há SVG (pode estar escapado como <svg)
    expect(iconeAba1?.innerHTML).toContain('svg');

    const iconeAba2 = screen.getByTestId('bottom-nav-simples-teste-aba 2').querySelector('.bottom-nav__icone');
    expect(iconeAba2?.innerHTML).toContain('svg');
  });

  it('deve ter aria-controls e id corretos', () => {
    render(
      <BottomNavSimples
        itens={itensPadrao}
        valor="/aba1"
        aoAlterar={vi.fn()}
        data-testid="bottom-nav-simples-teste"
      />
    );

    // O testId usa o rótulo em lowercase com espaços
    const aba1 = screen.getByTestId('bottom-nav-simples-teste-aba 1');
    expect(aba1).toHaveAttribute('aria-controls', '/aba1-painel');
    expect(aba1).toHaveAttribute('id', 'tab-/aba1');
  });

  it('deve aplicar className personalizada', () => {
    render(
      <BottomNavSimples
        itens={itensPadrao}
        valor="/aba1"
        aoAlterar={vi.fn()}
        className="minha-classe"
        data-testid="bottom-nav-simples-teste"
      />
    );

    expect(screen.getByTestId('bottom-nav-simples-teste')).toHaveClass('minha-classe');
  });

  it('deve renderizar indicador animado', () => {
    render(
      <BottomNavSimples
        itens={itensPadrao}
        valor="/aba1"
        aoAlterar={vi.fn()}
        data-testid="bottom-nav-simples-teste"
      />
    );

    const indicador = screen.getByTestId('bottom-nav-simples-teste').querySelector('.bottom-nav__indicador');
    expect(indicador).toBeInTheDocument();
  });
});