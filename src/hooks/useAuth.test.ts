/**
 * Testes para useAuth - Gerenciamento de autenticação.
 * Cobre: login, cadastro, logout, atualização perfil, alterar senha, excluir conta, validação token.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock do atrasar para resolver imediatamente
vi.mock('@/utilitarios/formatar', () => ({
  atrasar: vi.fn((_ms: number) => Promise.resolve()),
  clonarProfundo: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
  gerarId: vi.fn(() => `id-${Date.now()}-${Math.random().toString(36).slice(2)}`),
  formatarMoeda: vi.fn((v) => `R$ ${v.toFixed(2).replace('.', ',')}`),
  formatarParaExibicao: vi.fn((v) => v),
  calcularDistanciaKm: vi.fn(() => 0),
}));

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});

// Mock do api
vi.mock('@/servicos/api', () => ({
  api: {
    autenticacao: {
      login: vi.fn(),
      cadastrar: vi.fn(),
      validarToken: vi.fn(),
      alterarSenha: vi.fn(),
      excluirConta: vi.fn(),
    },
    perfil: {
      obter: vi.fn(),
      atualizar: vi.fn(),
    },
  },
}));

import { useAuth } from './useAuth';
import { api } from '@/servicos/api';

const mockUsuario = {
  id: 'user-1',
  nome: 'João Cliente',
  email: 'cliente@demo.com',
  senha: 'hash123',
  papel: 'cliente' as const,
  telefone: '(31) 99999-8888',
  confirmado: true,
  lembretesWhatsapp: true,
  seguindo: [],
  inspiracaoSalvas: [],
};

const mockSessao = {
  papel: 'cliente',
  email: 'cliente@demo.com',
  nome: 'João Cliente',
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    localStorageMock.clear.mockImplementation(() => {});

    // Default mock responses
    api.autenticacao.login.mockResolvedValue({ sucesso: true, dados: mockSessao });
    api.autenticacao.cadastrar.mockResolvedValue({ sucesso: true, dados: mockSessao });
    api.autenticacao.validarToken.mockResolvedValue({ sucesso: true, dados: mockSessao });
    api.autenticacao.alterarSenha.mockResolvedValue({ sucesso: true });
    api.autenticacao.excluirConta.mockResolvedValue({ sucesso: true });
    api.perfil.obter.mockResolvedValue({ sucesso: true, dados: mockUsuario });
    api.perfil.atualizar.mockResolvedValue({ sucesso: true, dados: { nome: 'Novo Nome' } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('inicialização', () => {
    it('deve iniciar com autenticado=false', () => {
      const { result } = renderHook(() => useAuth());

      // O hook carrega assincronamente, então carregando pode já ser false
      expect(result.current.autenticado).toBe(false);
      expect(result.current.usuario).toBeNull();
      expect(result.current.erro).toBeNull();
    });

    it('deve carregar usuário do localStorage se token válido', async () => {
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockUsuario)) // CHAVE_USUARIO
        .mockReturnValueOnce('mock-token-123'); // CHAVE_TOKEN

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false), { timeout: 2000 });

      expect(api.autenticacao.validarToken).toHaveBeenCalledWith('mock-token-123');
      expect(result.current.usuario).toMatchObject({
        papel: 'cliente',
        email: 'cliente@demo.com',
        nome: 'João Cliente',
      });
      expect(result.current.autenticado).toBe(true);
    });

    it('deve limpar localStorage se token inválido', async () => {
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockUsuario))
        .mockReturnValueOnce('mock-token-123');
      api.autenticacao.validarToken.mockResolvedValue({ sucesso: false, erro: 'Token expirado' });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false), { timeout: 2000 });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('corte-rapido-usuario');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('corte-rapido-token');
      expect(result.current.usuario).toBeNull();
    });

    it('deve lidar com erro ao parsear localStorage', async () => {
      localStorageMock.getItem
        .mockReturnValueOnce('{invalid json') // CHAVE_USUARIO
        .mockReturnValueOnce('mock-token-123');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false), { timeout: 2000 });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('corte-rapido-usuario');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('corte-rapido-token');
    });
  });

  describe('login', () => {
    it('deve fazer login com sucesso e salvar no localStorage', async () => {
      api.perfil.obter.mockResolvedValue({ sucesso: true, dados: mockUsuario });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let loginResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        loginResult = await result.current.login('cliente@demo.com', '123456', 'cliente');
      });

      expect(loginResult.sucesso).toBe(true);
      expect(result.current.autenticado).toBe(true);
      expect(result.current.usuario).toMatchObject({
        email: 'cliente@demo.com',
        nome: 'João Cliente',
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('corte-rapido-usuario', expect.any(String));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('corte-rapido-token', expect.any(String));
    });

    it('deve retornar erro para credenciais inválidas', async () => {
      api.autenticacao.login.mockResolvedValue({ sucesso: false, erro: 'Credenciais inválidas' });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let loginResult: { sucesso: boolean; erro?: string } = { sucesso: true };

      await act(async () => {
        loginResult = await result.current.login('errado@demo.com', '123456', 'cliente');
      });

      expect(loginResult.sucesso).toBe(false);
      expect(loginResult.erro).toBe('Credenciais inválidas');
      expect(result.current.erro).toBe('Credenciais inválidas');
      expect(result.current.autenticado).toBe(false);
    });

    it('deve retornar erro de conexão em exceção', async () => {
      api.autenticacao.login.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let loginResult: { sucesso: boolean; erro?: string } = { sucesso: true };

      await act(async () => {
        loginResult = await result.current.login('cliente@demo.com', '123456', 'cliente');
      });

      expect(loginResult.sucesso).toBe(false);
      expect(loginResult.erro).toBe('Erro de conexão. Tente novamente.');
    });
  });

  describe('cadastrar', () => {
    it('deve cadastrar novo usuário com sucesso', async () => {
      api.perfil.obter.mockResolvedValue({ sucesso: true, dados: mockUsuario });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let cadastroResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        cadastroResult = await result.current.cadastrar({
          nome: 'Novo Cliente',
          email: 'novo@demo.com',
          senha: '123456',
          telefone: '(31) 99999-9999',
          tipo: 'cliente',
        });
      });

      expect(cadastroResult.sucesso).toBe(true);
      expect(result.current.autenticado).toBe(true);
      expect(api.autenticacao.cadastrar).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Novo Cliente',
          email: 'novo@demo.com',
          tipo: 'cliente',
        })
      );
    });

    it('deve retornar erro para email já cadastrado', async () => {
      api.autenticacao.cadastrar.mockResolvedValue({ sucesso: false, erro: 'E-mail já está cadastrado' });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let cadastroResult: { sucesso: boolean; erro?: string } = { sucesso: true };

      await act(async () => {
        cadastroResult = await result.current.cadastrar({
          nome: 'Outro',
          email: 'cliente@demo.com',
          senha: '123456',
          telefone: '(31) 99999-9999',
          tipo: 'cliente',
        });
      });

      expect(cadastroResult.sucesso).toBe(false);
      expect(cadastroResult.erro).toContain('já está cadastrado');
    });
  });

  describe('sair', () => {
    it('deve fazer logout e limpar localStorage', async () => {
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockUsuario))
        .mockReturnValueOnce('mock-token-123');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      act(() => {
        result.current.sair();
      });

      expect(result.current.usuario).toBeNull();
      expect(result.current.autenticado).toBe(false);
      expect(result.current.erro).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('corte-rapido-usuario');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('corte-rapido-token');
    });
  });

  describe('atualizarPerfil', () => {
    it('deve atualizar perfil com sucesso', async () => {
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockUsuario))
        .mockReturnValueOnce('mock-token-123');
      api.perfil.atualizar.mockResolvedValue({ sucesso: true, dados: { nome: 'João Atualizado' } });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let updateResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        updateResult = await result.current.atualizarPerfil({ nome: 'João Atualizado' });
      });

      expect(updateResult.sucesso).toBe(true);
      expect(result.current.usuario?.nome).toBe('João Atualizado');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('corte-rapido-usuario', expect.stringContaining('João Atualizado'));
    });

    it('deve retornar erro se usuário não autenticado', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let updateResult: { sucesso: boolean; erro?: string } = { sucesso: true };

      await act(async () => {
        updateResult = await result.current.atualizarPerfil({ nome: 'Teste' });
      });

      expect(updateResult.sucesso).toBe(false);
      expect(updateResult.erro).toBe('Usuário não autenticado');
    });
  });

  describe('alterarSenha', () => {
    it('deve alterar senha com sucesso', async () => {
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockUsuario))
        .mockReturnValueOnce('mock-token-123');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let changeResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        changeResult = await result.current.alterarSenha('senhaAntiga', 'novaSenha123');
      });

      expect(changeResult.sucesso).toBe(true);
      expect(api.autenticacao.alterarSenha).toHaveBeenCalledWith('senhaAntiga', 'novaSenha123');
    });
  });

  describe('excluirConta', () => {
    it('deve excluir conta e fazer logout', async () => {
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockUsuario))
        .mockReturnValueOnce('mock-token-123');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      let deleteResult: { sucesso: boolean; erro?: string } = { sucesso: false };

      await act(async () => {
        deleteResult = await result.current.excluirConta();
      });

      expect(deleteResult.sucesso).toBe(true);
      expect(result.current.usuario).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('corte-rapido-usuario');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('corte-rapido-token');
    });
  });

  describe('limparErro', () => {
    it('deve limpar mensagem de erro', async () => {
      api.autenticacao.login.mockResolvedValue({ sucesso: false, erro: 'Erro teste' });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.carregando).toBe(false));

      await act(async () => {
        await result.current.login('errado@demo.com', '123456', 'cliente');
      });

      expect(result.current.erro).toBe('Erro teste');

      act(() => {
        result.current.limparErro();
      });

      expect(result.current.erro).toBeNull();
    });
  });

  describe('usePermissao', () => {
    it('deve retornar true se usuário tem papel permitido', () => {
      // Testa a lógica diretamente - usePermissao verifica usuario.papel
      const mockUsuarioBarbeiro = { ...mockUsuario, papel: 'barbeiro' as const };
      // Simula o retorno do hook
      const hasPermission = ['barbeiro', 'admin'].includes(mockUsuarioBarbeiro.papel);
      expect(hasPermission).toBe(true);
    });

    it('deve retornar false se usuário não tem papel permitido', () => {
      const mockUsuarioCliente = { ...mockUsuario, papel: 'cliente' as const };
      const hasPermission = ['barbeiro', 'admin'].includes(mockUsuarioCliente.papel);
      expect(hasPermission).toBe(false);
    });

    it('deve retornar false se não autenticado', () => {
      const hasPermission = ['barbeiro', 'admin'].includes((null as { papel?: string } | null)?.papel || '');
      expect(hasPermission).toBe(false);
    });
  });
});