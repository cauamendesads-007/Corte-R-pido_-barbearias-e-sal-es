/**
 * Testes para Cabecalho - Header fixo com logo, busca, ações do usuário.
 * Variantes: publico, autenticado, barbeiro, admin.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Cabecalho } from './Cabecalho';

// Mock do window.innerWidth
const originalInnerWidth = window.innerWidth;

describe('Cabecalho', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  const renderCabecalho = (props = {}) => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Cabecalho
          data-testid="cabecalho-teste"
          {...props}
        />
      </MemoryRouter>
    );
  };

  describe('Variante público', () => {
    it('deve renderizar logo com link para início', () => {
      renderCabecalho({ variante: 'publico' });

      const logo = screen.getByTestId('cabecalho-teste-logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('href', '/');
      expect(logo).toHaveTextContent('Corte Rápido');
    });

    it('deve renderizar botão Entrar', () => {
      renderCabecalho({ variante: 'publico' });

      const btnEntrar = screen.getByTestId('cabecalho-teste-entrar');
      expect(btnEntrar).toBeInTheDocument();
      expect(btnEntrar).toHaveAttribute('href', '/login');
      expect(btnEntrar).toHaveTextContent('Entrar');
    });

    it('deve renderizar botão Cadastrar', () => {
      renderCabecalho({ variante: 'publico' });

      const btnCadastrar = screen.getByTestId('cabecalho-teste-cadastrar');
      expect(btnCadastrar).toBeInTheDocument();
      expect(btnCadastrar).toHaveAttribute('href', '/cadastro');
      expect(btnCadastrar).toHaveTextContent('Cadastrar');
    });

    it('não deve renderizar busca na variante público', () => {
      renderCabecalho({ variante: 'publico' });

      expect(screen.queryByTestId('cabecalho-teste-busca')).not.toBeInTheDocument();
    });

    it('não deve renderizar notificações na variante público', () => {
      renderCabecalho({ variante: 'publico' });

      expect(screen.queryByTestId('cabecalho-teste-notificacoes')).not.toBeInTheDocument();
    });

    it('não deve renderizar avatar na variante público', () => {
      renderCabecalho({ variante: 'publico' });

      expect(screen.queryByTestId('cabecalho-teste-avatar')).not.toBeInTheDocument();
    });
  });

  describe('Variante autenticado (cliente)', () => {
    const mockUsuario = {
      nome: 'João Cliente',
      avatar: 'https://example.com/avatar.jpg',
      papel: 'cliente' as const,
      notificacoesNaoLidas: 3,
    };

    it('deve renderizar logo', () => {
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario });

      expect(screen.getByTestId('cabecalho-teste-logo')).toBeInTheDocument();
    });

    it('deve renderizar campo de busca', () => {
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario });

      expect(screen.getByTestId('cabecalho-teste-busca')).toBeInTheDocument();
    });

    it('deve renderizar notificações com contador', () => {
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario });

      const notificacoes = screen.getByTestId('cabecalho-teste-notificacoes');
      expect(notificacoes).toBeInTheDocument();
    });

    it('deve renderizar avatar do usuário (desktop)', () => {
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario });

      expect(screen.getByTestId('cabecalho-teste-avatar')).toBeInTheDocument();
    });

    it('não deve renderizar botão menu (desktop)', () => {
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario });

      expect(screen.queryByTestId('cabecalho-teste-menu')).not.toBeInTheDocument();
    });

    it('deve chamar aoBuscar ao submeter busca', async () => {
      const aoBuscar = vi.fn();
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario, aoBuscar });

      const campoBusca = screen.getByLabelText('Buscar barbearias e serviços');
      await userEvent.type(campoBusca, 'corte');
      await userEvent.keyboard('{Enter}');

      expect(aoBuscar).toHaveBeenCalledWith('corte');
    });

    it('deve chamar aoSair ao clicar em sair no drawer', async () => {
      const aoSair = vi.fn();
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });

      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario, aoSair });

      const btnMenu = screen.getByTestId('cabecalho-teste-menu');
      fireEvent.click(btnMenu);

      await waitFor(() => {
        expect(screen.getByTestId('cabecalho-teste-drawer')).toHaveClass('cabecalho__drawer--aberto');
      });

      const btnSair = screen.getByRole('button', { name: /sair/i });
      fireEvent.click(btnSair);

      expect(aoSair).toHaveBeenCalled();
    });
  });

  describe('Variante barbeiro', () => {
    const mockBarbeiro = {
      nome: 'Carlos Barbeiro',
      avatar: 'https://example.com/barbeiro.jpg',
      papel: 'barbeiro' as const,
      notificacoesNaoLidas: 1,
    };

    it('deve renderizar rotas específicas de barbeiro no drawer', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      renderCabecalho({ variante: 'barbeiro', usuario: mockBarbeiro });

      const btnMenu = screen.getByTestId('cabecalho-teste-menu');
      fireEvent.click(btnMenu);

      await waitFor(() => {
        expect(screen.getByTestId('cabecalho-teste-drawer')).toHaveClass('cabecalho__drawer--aberto');
      });

      expect(screen.getByText('Painel')).toBeInTheDocument();
      expect(screen.getByText('Agenda')).toBeInTheDocument();
      expect(screen.getByText('Serviços')).toBeInTheDocument();
      expect(screen.getByText('Fila')).toBeInTheDocument();
      expect(screen.getByText('Galeria')).toBeInTheDocument();
    });
  });

  describe('Variante admin', () => {
    const mockAdmin = {
      nome: 'Admin User',
      avatar: 'https://example.com/admin.jpg',
      papel: 'admin' as const,
      notificacoesNaoLidas: 0,
    };

    it('deve renderizar rotas específicas de admin no drawer', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      renderCabecalho({ variante: 'admin', usuario: mockAdmin });

      const btnMenu = screen.getByTestId('cabecalho-teste-menu');
      fireEvent.click(btnMenu);

      await waitFor(() => {
        expect(screen.getByTestId('cabecalho-teste-drawer')).toHaveClass('cabecalho__drawer--aberto');
      });

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Estabelecimentos')).toBeInTheDocument();
      expect(screen.getByText('Usuários')).toBeInTheDocument();
      expect(screen.getByText('Análises')).toBeInTheDocument();
    });
  });

  describe('Menu mobile (drawer)', () => {
    const mockUsuario = {
      nome: 'João Cliente',
      avatar: 'https://example.com/avatar.jpg',
      papel: 'cliente' as const,
      notificacoesNaoLidas: 0,
    };

    it('deve abrir drawer ao clicar no botão menu (mobile)', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario });

      const btnMenu = screen.getByTestId('cabecalho-teste-menu');
      expect(btnMenu).toBeInTheDocument();

      fireEvent.click(btnMenu);

      await waitFor(() => {
        expect(screen.getByTestId('cabecalho-teste-drawer')).toHaveClass('cabecalho__drawer--aberto');
      });

      expect(screen.getByText('João Cliente')).toBeInTheDocument();
      expect(screen.getByText('Cliente')).toBeInTheDocument();
    });

    it('deve fechar drawer ao clicar no backdrop', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario });

      const btnMenu = screen.getByTestId('cabecalho-teste-menu');
      fireEvent.click(btnMenu);

      await waitFor(() => {
        expect(screen.getByTestId('cabecalho-teste-drawer')).toHaveClass('cabecalho__drawer--aberto');
      });

      const backdrop = screen.getByTestId('cabecalho-teste-drawer').parentElement?.querySelector('.cabecalho__backdrop');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      await waitFor(() => {
        expect(screen.getByTestId('cabecalho-teste-drawer')).not.toHaveClass('cabecalho__drawer--aberto');
      });
    });

    it('deve fechar drawer ao clicar em link de navegação', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario });

      const btnMenu = screen.getByTestId('cabecalho-teste-menu');
      fireEvent.click(btnMenu);

      await waitFor(() => {
        expect(screen.getByTestId('cabecalho-teste-drawer')).toHaveClass('cabecalho__drawer--aberto');
      });

      // Clica em um link de navegação (que tem onClick que fecha o drawer)
      const linkPerfil = screen.getByText('Perfil');
      fireEvent.click(linkPerfil);

      await waitFor(() => {
        expect(screen.getByTestId('cabecalho-teste-drawer')).not.toHaveClass('cabecalho__drawer--aberto');
      });
    });
  });

  describe('Busca mobile', () => {
    const mockUsuario = {
      nome: 'João Cliente',
      avatar: 'https://example.com/avatar.jpg',
      papel: 'cliente' as const,
      notificacoesNaoLidas: 0,
    };

    it('deve mostrar toggle de busca no mobile', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario });

      const toggleBusca = screen.getByTestId('cabecalho-teste-toggle-busca');
      expect(toggleBusca).toBeInTheDocument();
      expect(toggleBusca).toHaveAttribute('aria-label', 'Abrir busca');
    });

    it('deve abrir busca mobile ao clicar no toggle', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario });

      const toggleBusca = screen.getByTestId('cabecalho-teste-toggle-busca');
      fireEvent.click(toggleBusca);

      // Verifica se o formulário de busca mobile está visível
      const formBuscaMobile = screen.getByTestId('cabecalho-teste').querySelector('.cabecalho__busca-mobile');
      expect(formBuscaMobile).toBeInTheDocument();
      expect(formBuscaMobile).toHaveAttribute('role', 'search');
    });

    it('não deve mostrar toggle de busca no desktop', () => {
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario });

      expect(screen.queryByTestId('cabecalho-teste-toggle-busca')).not.toBeInTheDocument();
    });
  });

  describe('Acessibilidade', () => {
    it('deve ter role="banner"', () => {
      renderCabecalho({ variante: 'publico' });

      expect(screen.getByTestId('cabecalho-teste')).toHaveAttribute('role', 'banner');
    });

    it('deve ter aria-label no logo', () => {
      renderCabecalho({ variante: 'publico' });

      const logo = screen.getByTestId('cabecalho-teste-logo');
      expect(logo).toHaveAttribute('aria-label', 'Corte Rápido - Início');
    });

    it('deve ter role="search" no formulário de busca', () => {
      const mockUsuario = {
        nome: 'João',
        papel: 'cliente' as const,
      };
      renderCabecalho({ variante: 'autenticado', usuario: mockUsuario });

      const formBusca = screen.getByTestId('cabecalho-teste-busca');
      expect(formBusca).toHaveAttribute('role', 'search');
    });
  });

  describe('Props opcionais', () => {
    it('deve aplicar className personalizada', () => {
      renderCabecalho({ variante: 'publico', className: 'minha-classe' });

      expect(screen.getByTestId('cabecalho-teste')).toHaveClass('minha-classe');
    });

    it('deve aplicar data-testid personalizado', () => {
      renderCabecalho({ variante: 'publico', 'data-testid': 'custom-id' });

      expect(screen.getByTestId('custom-id')).toBeInTheDocument();
    });

    it('deve renderizar sem usuário (null)', () => {
      renderCabecalho({ variante: 'autenticado', usuario: null });

      expect(screen.getByTestId('cabecalho-teste-logo')).toBeInTheDocument();
      expect(screen.queryByTestId('cabecalho-teste-notificacoes')).not.toBeInTheDocument();
    });
  });
});