/**
 * Testes para Login - Tela de autenticação.
 * Cobre: formulário, validação, tipos de usuário, login rápido, redirecionamento, acessibilidade.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import { useAuth } from '@/hooks/useAuth';

// Mock do useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock do useGlobalToast
vi.mock('@/componentes', async () => {
  const actual = await vi.importActual('@/componentes');
  return {
    ...actual,
    useGlobalToast: vi.fn(() => ({
      sucesso: vi.fn(),
      erro: vi.fn(),
      info: vi.fn(),
      aviso: vi.fn(),
    })),
  };
});

import { useGlobalToast } from '@/componentes';

const mockLogin = vi.fn();
const mockSucesso = vi.fn();

const renderLogin = (props = {}) => {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login {...props} />} />
        <Route path="/feed" element={<div data-testid="feed-page">Feed</div>} />
        <Route path="/painel" element={<div data-testid="painel-page">Painel</div>} />
        <Route path="/admin" element={<div data-testid="admin-page">Admin</div>} />
        <Route path="/cadastro" element={<div data-testid="cadastro-page">Cadastro</div>} />
      </Routes>
    </MemoryRouter>
  );
};

const mockUsuario = {
  id: 'user-1',
  nome: 'João Cliente',
  email: 'cliente@demo.com',
  papel: 'cliente' as const,
  telefone: '(31) 99999-8888',
  confirmado: true,
  lembretesWhatsapp: true,
  seguindo: [],
  inspiracaoSalvas: [],
};

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    (useAuth as vi.Mock).mockReturnValue({ login: mockLogin, usuario: null, carregando: false });
    (useGlobalToast as vi.Mock).mockReturnValue({ sucesso: mockSucesso, erro: vi.fn(), info: vi.fn(), aviso: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Renderização inicial', () => {
    it('deve renderizar container principal', () => {
      renderLogin();

      expect(screen.getByTestId('login-container')).toBeInTheDocument();
    });

    it('deve renderizar logo com link para início', () => {
      renderLogin();

      const logo = screen.getByText('Corte Rápido');
      expect(logo).toBeInTheDocument();
      expect(logo.closest('a')).toHaveAttribute('href', '/');
    });

    it('deve renderizar título e subtítulo', () => {
      renderLogin();

      expect(screen.getByText('Entrar na sua conta')).toBeInTheDocument();
      expect(screen.getByText('Acesse seu painel ou agende seu próximo corte')).toBeInTheDocument();
    });

    it('deve renderizar seletor de tipo de usuário', () => {
      renderLogin();

      expect(screen.getByTestId('login-tipo')).toBeInTheDocument();
      // ChipGrupo renderiza com emoji + texto
      expect(screen.getByText('👤 Cliente')).toBeInTheDocument();
      expect(screen.getByText('💈 Barbeiro')).toBeInTheDocument();
      expect(screen.getByText('⚙️ Admin')).toBeInTheDocument();
    });

    it('deve renderizar campo de e-mail', () => {
      renderLogin();

      const emailField = screen.getByLabelText(/E-mail/);
      expect(emailField).toBeInTheDocument();
      expect(emailField).toHaveAttribute('type', 'email');
      expect(emailField).toHaveAttribute('placeholder', 'seu@email.com');
      expect(emailField).toHaveAttribute('required');
    });

    it('deve renderizar campo de senha com toggle de visibilidade', () => {
      renderLogin();

      const senhaField = screen.getByLabelText(/Senha/);
      expect(senhaField).toBeInTheDocument();
      expect(senhaField).toHaveAttribute('type', 'password');
      expect(senhaField).toHaveAttribute('placeholder', '••••••••');
    });

    it('deve renderizar botão Entrar', () => {
      renderLogin();

      const btnEntrar = screen.getByTestId('login-btn-entrar');
      expect(btnEntrar).toBeInTheDocument();
      expect(btnEntrar).toHaveTextContent('Entrar');
    });

    it('deve renderizar opções: lembrar-me e esqueci senha', () => {
      renderLogin();

      expect(screen.getByText('Lembrar-me')).toBeInTheDocument();
      expect(screen.getByText('Esqueci a senha')).toHaveAttribute('href', '/recuperar-senha');
    });

    it('deve renderizar botões de login rápido demo', () => {
      renderLogin();

      expect(screen.getByTestId('login-demo-cliente')).toBeInTheDocument();
      expect(screen.getByTestId('login-demo-barbeiro')).toBeInTheDocument();
      expect(screen.getByTestId('login-demo-admin')).toBeInTheDocument();
    });

    it('deve renderizar link para cadastro', () => {
      renderLogin();

      expect(screen.getByText('Cadastrar grátis')).toHaveAttribute('href', '/cadastro');
    });

    it('deve renderizar footer com links', () => {
      renderLogin();

      expect(screen.getByText('Privacidade')).toHaveAttribute('href', '/privacidade');
      expect(screen.getByText('Termos')).toHaveAttribute('href', '/termos');
      expect(screen.getByText('Contato')).toHaveAttribute('href', '/contato');
    });
  });

  describe('Seleção de tipo de usuário', () => {
    it('deve ter Cliente selecionado por padrão', () => {
      renderLogin();

      // Cliente deve estar ativo (chip com emoji)
      const chipCliente = screen.getByText('👤 Cliente').closest('[role="button"]');
      expect(chipCliente).toBeInTheDocument();
      expect(chipCliente).toHaveAttribute('aria-pressed', 'true');
    });

    it('deve alterar tipo ao clicar em Barbeiro', async () => {
      renderLogin();

      const barbeiroOption = screen.getByText('💈 Barbeiro');
      await userEvent.click(barbeiroOption);

      // O tipo muda internamente
      expect(barbeiroOption.closest('[role="button"]')).toHaveAttribute('aria-pressed', 'true');
    });

    it('deve alterar tipo ao clicar em Admin', async () => {
      renderLogin();

      const adminOption = screen.getByText('⚙️ Admin');
      await userEvent.click(adminOption);

      expect(adminOption.closest('[role="button"]')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Validação de formulário', () => {
    it('deve mostrar erro se e-mail vazio ao submeter', async () => {
      renderLogin();

      const btnEntrar = screen.getByTestId('login-btn-entrar');
      await userEvent.click(btnEntrar);

      await waitFor(() => {
        expect(screen.getByTestId('login-erro')).toHaveTextContent('Preencha todos os campos');
      });
    });

    it('deve mostrar erro se senha vazia ao submeter', async () => {
      renderLogin();

      const emailField = screen.getByLabelText(/E-mail/);
      await userEvent.type(emailField, 'teste@teste.com');

      const btnEntrar = screen.getByTestId('login-btn-entrar');
      await userEvent.click(btnEntrar);

      await waitFor(() => {
        expect(screen.getByTestId('login-erro')).toHaveTextContent('Preencha todos os campos');
      });
    });

    it('não deve submeter se carregando', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ sucesso: true }), 1000)));

      renderLogin();

      const emailField = screen.getByLabelText(/E-mail/);
      await userEvent.type(emailField, 'teste@teste.com');
      const senhaField = screen.getByLabelText(/Senha/);
      await userEvent.type(senhaField, '123456');

      const btnEntrar = screen.getByTestId('login-btn-entrar');
      await userEvent.click(btnEntrar);

      // Botão deve ficar desabilitado
      await waitFor(() => {
        expect(btnEntrar).toBeDisabled();
      });
    });
  });

  describe('Login bem-sucedido', () => {
    it('deve fazer login como cliente e redirecionar para /feed', async () => {
      mockLogin.mockResolvedValue({ sucesso: true, usuario: mockUsuario });

      renderLogin();

      const emailField = screen.getByLabelText(/E-mail/);
      await userEvent.type(emailField, 'cliente@demo.com');
      const senhaField = screen.getByLabelText(/Senha/);
      await userEvent.type(senhaField, '123456');

      const btnEntrar = screen.getByTestId('login-btn-entrar');
      await userEvent.click(btnEntrar);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('cliente@demo.com', '123456', 'cliente');
        expect(screen.getByTestId('feed-page')).toBeInTheDocument();
      });

      expect(mockSucesso).toHaveBeenCalledWith('Bem-vindo!');
    });

    it('deve fazer login como barbeiro e redirecionar para /painel', async () => {
      const mockBarbeiro = { ...mockUsuario, papel: 'barbeiro' as const, email: 'barbeiro@demo.com' };
      mockLogin.mockResolvedValue({ sucesso: true, usuario: mockBarbeiro });

      renderLogin();

      // Selecionar Barbeiro
      const barbeiroOption = screen.getByText('💈 Barbeiro');
      await userEvent.click(barbeiroOption);

      const emailField = screen.getByLabelText(/E-mail/);
      await userEvent.type(emailField, 'barbeiro@demo.com');
      const senhaField = screen.getByLabelText(/Senha/);
      await userEvent.type(senhaField, '123456');

      const btnEntrar = screen.getByTestId('login-btn-entrar');
      await userEvent.click(btnEntrar);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('barbeiro@demo.com', '123456', 'barbeiro');
        expect(screen.getByTestId('painel-page')).toBeInTheDocument();
      });

      expect(mockSucesso).toHaveBeenCalledWith('Bem-vindo ao painel!');
    });

    it('deve fazer login como admin e redirecionar para /admin', async () => {
      const mockAdmin = { ...mockUsuario, papel: 'admin' as const, email: 'admin@demo.com' };
      mockLogin.mockResolvedValue({ sucesso: true, usuario: mockAdmin });

      renderLogin();

      // Selecionar Admin
      const adminOption = screen.getByText('⚙️ Admin');
      await userEvent.click(adminOption);

      const emailField = screen.getByLabelText(/E-mail/);
      await userEvent.type(emailField, 'admin@demo.com');
      const senhaField = screen.getByLabelText(/Senha/);
      await userEvent.type(senhaField, '123456');

      const btnEntrar = screen.getByTestId('login-btn-entrar');
      await userEvent.click(btnEntrar);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin@demo.com', '123456', 'admin');
        expect(screen.getByTestId('admin-page')).toBeInTheDocument();
      });

      expect(mockSucesso).toHaveBeenCalledWith('Bem-vindo!');
    });
  });

  describe('Login com erro', () => {
    it('deve mostrar erro retornado pela API', async () => {
      mockLogin.mockResolvedValue({ sucesso: false, erro: 'E-mail ou senha inválidos' });

      renderLogin();

      const emailField = screen.getByLabelText(/E-mail/);
      await userEvent.type(emailField, 'errado@teste.com');
      const senhaField = screen.getByLabelText(/Senha/);
      await userEvent.type(senhaField, 'senhaerrada');

      const btnEntrar = screen.getByTestId('login-btn-entrar');
      await userEvent.click(btnEntrar);

      await waitFor(() => {
        expect(screen.getByTestId('login-erro')).toHaveTextContent('E-mail ou senha inválidos');
      });
    });

    it('deve mostrar erro genérico se API não retorna mensagem', async () => {
      mockLogin.mockResolvedValue({ sucesso: false });

      renderLogin();

      const emailField = screen.getByLabelText(/E-mail/);
      await userEvent.type(emailField, 'teste@teste.com');
      const senhaField = screen.getByLabelText(/Senha/);
      await userEvent.type(senhaField, '123456');

      const btnEntrar = screen.getByTestId('login-btn-entrar');
      await userEvent.click(btnEntrar);

      await waitFor(() => {
        expect(screen.getByTestId('login-erro')).toHaveTextContent('Erro ao fazer login');
      });
    });
  });

  describe('Login rápido (demo)', () => {
    it('deve preencher e submeter como Cliente Demo', async () => {
      mockLogin.mockResolvedValue({ sucesso: true, usuario: mockUsuario });

      renderLogin();

      const btnDemoCliente = screen.getByTestId('login-demo-cliente');
      await userEvent.click(btnDemoCliente);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('cliente@demo.com', '123456', 'cliente');
      });
      await waitFor(() => {
        expect(screen.getByTestId('feed-page')).toBeInTheDocument();
      });
    });

    it('deve preencher e submeter como Barbeiro Demo', async () => {
      const mockBarbeiro = { ...mockUsuario, papel: 'barbeiro' as const, email: 'barbeiro@demo.com' };
      mockLogin.mockResolvedValue({ sucesso: true, usuario: mockBarbeiro });

      renderLogin();

      const btnDemoBarbeiro = screen.getByTestId('login-demo-barbeiro');
      await userEvent.click(btnDemoBarbeiro);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('barbeiro@demo.com', '123456', 'barbeiro');
      });
      await waitFor(() => {
        expect(screen.getByTestId('painel-page')).toBeInTheDocument();
      });
    });

    it('deve preencher e submeter como Admin Demo', async () => {
      const mockAdmin = { ...mockUsuario, papel: 'admin' as const, email: 'admin@demo.com' };
      mockLogin.mockResolvedValue({ sucesso: true, usuario: mockAdmin });

      renderLogin();

      const btnDemoAdmin = screen.getByTestId('login-demo-admin');
      await userEvent.click(btnDemoAdmin);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin@demo.com', '123456', 'admin');
      });
      await waitFor(() => {
        expect(screen.getByTestId('admin-page')).toBeInTheDocument();
      });
    });

    it('não deve funcionar se carregando', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ sucesso: true }), 1000)));

      renderLogin();

      const btnDemoCliente = screen.getByTestId('login-demo-cliente');
      await userEvent.click(btnDemoCliente);

      // Segundo clique não deve fazer nada (carregando)
      await userEvent.click(btnDemoCliente);

      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toggle de visibilidade da senha', () => {
    it('deve alternar tipo do input de senha', async () => {
      renderLogin();

      const senhaField = screen.getByLabelText(/Senha/);
      expect(senhaField).toHaveAttribute('type', 'password');

      // Clicar no botão de toggle (ícone do olho)
      const toggleBtn = screen.getByLabelText(/Alternar visibilidade da senha/);
      await userEvent.click(toggleBtn);
      expect(senhaField).toHaveAttribute('type', 'text');
    });
  });

  describe('Acessibilidade', () => {
    it('deve ter label associado ao campo e-mail', () => {
      renderLogin();

      const emailField = screen.getByLabelText(/E-mail/);
      expect(emailField).toHaveAttribute('id');
    });

    it('deve ter label associado ao campo senha', () => {
      renderLogin();

      const senhaField = screen.getByLabelText(/Senha/);
      expect(senhaField).toHaveAttribute('id');
    });

    it('deve ter role=alert no erro', async () => {
      renderLogin();

      const btnEntrar = screen.getByTestId('login-btn-entrar');
      await userEvent.click(btnEntrar);

      await waitFor(() => {
        expect(screen.getByTestId('login-erro')).toHaveAttribute('role', 'alert');
      });
    });

    it('deve ter aria-label no logo', () => {
      renderLogin();

      const logo = screen.getByText('Corte Rápido').closest('a');
      expect(logo).toHaveAttribute('aria-label', 'Corte Rápido - Início');
    });

    it('fieldset do tipo deve ter legend', () => {
      renderLogin();

      expect(screen.getByText('Entrar como')).toBeInTheDocument();
      // O legend está dentro do fieldset
    });
  });

  describe('Estados de carregamento', () => {
    it('deve mostrar estado carregando no botão Entrar', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ sucesso: true }), 500)));

      renderLogin();

      const emailField = screen.getByLabelText(/E-mail/);
      await userEvent.type(emailField, 'teste@teste.com');
      const senhaField = screen.getByLabelText(/Senha/);
      await userEvent.type(senhaField, '123456');

      const btnEntrar = screen.getByTestId('login-btn-entrar');
      await userEvent.click(btnEntrar);

      // Botão deve mostrar carregando
      await waitFor(() => {
        expect(btnEntrar).toBeDisabled();
      });
    });

    it('deve desabilitar botões demo durante carregamento', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ sucesso: true }), 500)));

      renderLogin();

      const emailField = screen.getByLabelText(/E-mail/);
      await userEvent.type(emailField, 'teste@teste.com');
      const senhaField = screen.getByLabelText(/Senha/);
      await userEvent.type(senhaField, '123456');

      const btnEntrar = screen.getByTestId('login-btn-entrar');
      await userEvent.click(btnEntrar);

      await waitFor(() => {
        expect(screen.getByTestId('login-demo-cliente')).toBeDisabled();
        expect(screen.getByTestId('login-demo-barbeiro')).toBeDisabled();
        expect(screen.getByTestId('login-demo-admin')).toBeDisabled();
      });
    });
  });
});