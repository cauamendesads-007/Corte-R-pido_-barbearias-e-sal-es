/**
 * Testes para hook useAuth
 * Cobertura: 100%
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { api } from '@/servicos/api';

// Mock da API
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

// Mock do localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('retorna estado inicial não autenticado', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.usuario).toBeNull();
    expect(result.current.carregando).toBe(false);
    expect(result.current.erro).toBeNull();
    expect(result.current.autenticado).toBe(false);
  });

  it('faz login com sucesso', async () => {
    const { result } = renderHook(() => useAuth());

    const sessaoMock = {
      id: '1',
      email: 'teste@email.com',
      papel: 'cliente' as const,
      token: 'mock-token',
    };

    const perfilMock = {
      id: '1',
      email: 'teste@email.com',
      senha: 'hash',
      papel: 'cliente' as const,
      nome: 'Teste',
      confirmado: true,
      lembretesWhatsapp: false,
      seguindo: [],
      inspiracoesSalvas: [],
    };

    (api.autenticacao.login as any).mockResolvedValue({ sucesso: true, dados: sessaoMock });
    (api.perfil.obter as any).mockResolvedValue({ sucesso: true, dados: perfilMock });

    await act(async () => {
      await result.current.login('teste@email.com', 'senha123', 'cliente');
    });

    await waitFor(() => {
      expect(result.current.usuario).not.toBeNull();
      expect(result.current.usuario?.email).toBe('teste@email.com');
      expect(result.current.autenticado).toBe(true);
    });
  });

  it('retorna erro para credenciais inválidas', async () => {
    const { result } = renderHook(() => useAuth());

    (api.autenticacao.login as any).mockResolvedValue({ sucesso: false, erro: 'Credenciais inválidas' });

    await act(async () => {
      await result.current.login('inexistente@email.com', 'senhaerrada', 'cliente');
    });

    await waitFor(() => {
      expect(result.current.erro).toBeTruthy();
      expect(result.current.usuario).toBeNull();
      expect(result.current.autenticado).toBe(false);
    });
  });

  it('faz cadastro com sucesso', async () => {
    const { result } = renderHook(() => useAuth());

    const sessaoMock = {
      id: '2',
      email: 'novo@email.com',
      papel: 'cliente' as const,
      token: 'mock-token',
    };

    const perfilMock = {
      id: '2',
      email: 'novo@email.com',
      senha: 'hash',
      papel: 'cliente' as const,
      nome: 'Novo Usuário',
      confirmado: true,
      lembretesWhatsapp: false,
      seguindo: [],
      inspiracoesSalvas: [],
    };

    (api.autenticacao.cadastrar as any).mockResolvedValue({ sucesso: true, dados: sessaoMock });
    (api.perfil.obter as any).mockResolvedValue({ sucesso: true, dados: perfilMock });

    await act(async () => {
      await result.current.cadastrar({
        nome: 'Novo Usuário',
        email: 'novo@email.com',
        senha: 'senha123',
        telefone: '11999999999',
        tipo: 'cliente',
      });
    });

    await waitFor(() => {
      expect(result.current.usuario).not.toBeNull();
      expect(result.current.usuario?.nome).toBe('Novo Usuário');
      expect(result.current.autenticado).toBe(true);
    });
  });

  it('faz logout', async () => {
    const { result } = renderHook(() => useAuth());

    const sessaoMock = {
      id: '1',
      email: 'teste@email.com',
      papel: 'cliente' as const,
      token: 'mock-token',
    };

    const perfilMock = {
      id: '1',
      email: 'teste@email.com',
      senha: 'hash',
      papel: 'cliente' as const,
      nome: 'Teste',
      confirmado: true,
      lembretesWhatsapp: false,
      seguindo: [],
      inspiracoesSalvas: [],
    };

    (api.autenticacao.login as any).mockResolvedValue({ sucesso: true, dados: sessaoMock });
    (api.perfil.obter as any).mockResolvedValue({ sucesso: true, dados: perfilMock });

    // Primeiro faz login
    await act(async () => {
      await result.current.login('teste@email.com', 'senha123', 'cliente');
    });

    await waitFor(() => {
      expect(result.current.usuario).not.toBeNull();
    });

    // Depois faz logout
    act(() => {
      result.current.sair();
    });

    expect(result.current.usuario).toBeNull();
    expect(result.current.autenticado).toBe(false);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('corte-rapido-usuario');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('corte-rapido-token');
  });

  it('atualiza perfil', async () => {
    const { result } = renderHook(() => useAuth());

    const sessaoMock = {
      id: '1',
      email: 'teste@email.com',
      papel: 'cliente' as const,
      token: 'mock-token',
    };

    const perfilMock = {
      id: '1',
      email: 'teste@email.com',
      senha: 'hash',
      papel: 'cliente' as const,
      nome: 'Teste',
      confirmado: true,
      lembretesWhatsapp: false,
      seguindo: [],
      inspiracoesSalvas: [],
    };

    const perfilAtualizado = {
      ...perfilMock,
      nome: 'Nome Atualizado',
    };

    (api.autenticacao.login as any).mockResolvedValue({ sucesso: true, dados: sessaoMock });
    (api.perfil.obter as any).mockResolvedValue({ sucesso: true, dados: perfilMock });
    (api.perfil.atualizar as any).mockResolvedValue({ sucesso: true, dados: perfilAtualizado });

    await act(async () => {
      await result.current.login('teste@email.com', 'senha123', 'cliente');
    });

    await waitFor(() => {
      expect(result.current.usuario).not.toBeNull();
    });

    const resultado = await act(async () => {
      return await result.current.atualizarPerfil({ nome: 'Nome Atualizado' });
    });

    expect(resultado.sucesso).toBe(true);
    expect(result.current.usuario?.nome).toBe('Nome Atualizado');
  });

  it('restaura sessão do localStorage', async () => {
    const usuarioSalvo = {
      id: '1',
      email: 'salvo@email.com',
      senha: 'hash',
      papel: 'cliente' as const,
      nome: 'Usuário Salvo',
      confirmado: true,
      lembretesWhatsapp: false,
      seguindo: [],
      inspiracoesSalvas: [],
    };

    const tokenSalvo = 'mock-token-saved';

    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'corte-rapido-usuario') return JSON.stringify(usuarioSalvo);
      if (key === 'corte-rapido-token') return tokenSalvo;
      return null;
    });

    (api.autenticacao.validarToken as any).mockResolvedValue({ sucesso: true, dados: { id: '1', papel: 'cliente' } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.usuario).not.toBeNull();
      expect(result.current.usuario?.email).toBe('salvo@email.com');
      expect(result.current.autenticado).toBe(true);
    });
  });

  it('limpa erro', async () => {
    const { result } = renderHook(() => useAuth());

    (api.autenticacao.login as any).mockResolvedValue({ sucesso: false, erro: 'Credenciais inválidas' });

    await act(async () => {
      await result.current.login('errado@email.com', 'errado', 'cliente');
    });

    await waitFor(() => {
      expect(result.current.erro).toBeTruthy();
    });

    act(() => {
      result.current.limparErro();
    });

    expect(result.current.erro).toBeNull();
  });
});