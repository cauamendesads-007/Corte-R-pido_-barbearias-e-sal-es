/**
 * Serviços do domínio Perfil - Interface + Implementação + DI.
 * Segue padrão DIP com Result<T,E> e AbortController.
 */

import {
  handleApiError,
  criarPerfilError,
  type PerfilResult,
} from '../rules';
import type {
  Perfil,
  PreferenciasUsuario,
  EnderecoUsuario,
  CartaoSalvo,
  AtividadeUsuario,
  AtualizarPerfilDados,
  AlterarSenhaDados,
  UploadAvatarDados,
  AtividadesFiltro,
} from '../types';

// ============================================
// INTERFACE (Contrato)
// ============================================

export interface IPerfilService {
  // Perfil
  buscarPerfil(signal?: AbortSignal): Promise<PerfilResult<Perfil>>;
  atualizarPerfil(dados: AtualizarPerfilDados, signal?: AbortSignal): Promise<PerfilResult<Perfil>>;
  uploadAvatar(dados: UploadAvatarDados, signal?: AbortSignal): Promise<PerfilResult<{ avatar: string }>>;
  removerAvatar(signal?: AbortSignal): Promise<PerfilResult<void>>;
  alterarSenha(dados: AlterarSenhaDados, signal?: AbortSignal): Promise<PerfilResult<void>>;

  // Preferências
  buscarPreferencias(signal?: AbortSignal): Promise<PerfilResult<PreferenciasUsuario>>;
  atualizarPreferencias(prefs: Partial<PreferenciasUsuario>, signal?: AbortSignal): Promise<PerfilResult<PreferenciasUsuario>>;

  // Endereços
  buscarEnderecos(signal?: AbortSignal): Promise<PerfilResult<EnderecoUsuario[]>>;
  adicionarEndereco(endereco: Omit<EnderecoUsuario, 'id'>, signal?: AbortSignal): Promise<PerfilResult<EnderecoUsuario>>;
  atualizarEndereco(id: string, endereco: Partial<EnderecoUsuario>, signal?: AbortSignal): Promise<PerfilResult<EnderecoUsuario>>;
  removerEndereco(id: string, signal?: AbortSignal): Promise<PerfilResult<void>>;
  definirEnderecoPrincipal(id: string, signal?: AbortSignal): Promise<PerfilResult<void>>;

  // Cartões
  buscarCartoes(signal?: AbortSignal): Promise<PerfilResult<CartaoSalvo[]>>;
  adicionarCartao(cartao: Omit<CartaoSalvo, 'id' | 'criadoEm'>, signal?: AbortSignal): Promise<PerfilResult<CartaoSalvo>>;
  removerCartao(id: string, signal?: AbortSignal): Promise<PerfilResult<void>>;
  definirCartaoPadrao(id: string, signal?: AbortSignal): Promise<PerfilResult<void>>;

  // Atividades
  buscarAtividades(pagina: number, limite: number, filtro?: AtividadesFiltro, signal?: AbortSignal): Promise<PerfilResult<{ atividades: AtividadeUsuario[]; proximaPagina: number | null }>>;
}

// ============================================
// IMPLEMENTAÇÃO
// ============================================

const ENDPOINTS = {
  perfil: '/api/perfil',
  preferencias: '/api/perfil/preferencias',
  enderecos: '/api/perfil/enderecos',
  cartoes: '/api/perfil/cartoes',
  atividades: '/api/perfil/atividades',
  avatar: '/api/perfil/avatar',
  senha: '/api/perfil/senha',
} as const;

const LIMITE_PADRAO = 20;

export class PerfilService implements IPerfilService {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(baseUrl: string = '', getToken: () => string | null = () => null) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  private async request<T>(url: string, options: RequestInit = {}, signal?: AbortSignal): Promise<PerfilResult<T>> {
    const controller = new AbortController();
    const abortSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        ...options,
        headers,
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return handleApiError(response.status, errorData);
      }

      // Para respostas vazias (204 No Content)
      if (response.status === 204) {
        return { sucesso: true, dados: undefined as T };
      }

      const data = await response.json();
      return { sucesso: true, dados: data };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { sucesso: false, erro: 'Requisição cancelada', codigo: 'ABORTED' };
      }
      return { sucesso: false, erro: 'Erro de conexão', codigo: 'NETWORK_ERROR' };
    }
  }

  // Perfil
  async buscarPerfil(signal?: AbortSignal) {
    return this.request<Perfil>(ENDPOINTS.perfil, { signal });
  }

  async atualizarPerfil(dados: AtualizarPerfilDados, signal?: AbortSignal) {
    return this.request<Perfil>(ENDPOINTS.perfil, {
      method: 'PATCH',
      body: JSON.stringify(dados),
      signal,
    });
  }

  async uploadAvatar(dados: UploadAvatarDados, signal?: AbortSignal) {
    const formData = new FormData();
    formData.append('avatar', dados.arquivo);
    if (dados.recorte) {
      formData.append('recorte', JSON.stringify(dados.recorte));
    }

    const controller = new AbortController();
    const abortSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.avatar}`, {
        method: 'POST',
        body: formData,
        headers,
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return handleApiError(response.status, errorData);
      }

      const data = await response.json();
      return { sucesso: true, dados: data };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { sucesso: false, erro: 'Requisição cancelada', codigo: 'ABORTED' };
      }
      return { sucesso: false, erro: 'Erro de conexão', codigo: 'NETWORK_ERROR' };
    }
  }

  async removerAvatar(signal?: AbortSignal) {
    return this.request<void>(ENDPOINTS.avatar, {
      method: 'DELETE',
      signal,
    });
  }

  async alterarSenha(dados: AlterarSenhaDados, signal?: AbortSignal) {
    return this.request<void>(ENDPOINTS.senha, {
      method: 'PUT',
      body: JSON.stringify(dados),
      signal,
    });
  }

  // Preferências
  async buscarPreferencias(signal?: AbortSignal) {
    return this.request<PreferenciasUsuario>(ENDPOINTS.preferencias, { signal });
  }

  async atualizarPreferencias(prefs: Partial<PreferenciasUsuario>, signal?: AbortSignal) {
    return this.request<PreferenciasUsuario>(ENDPOINTS.preferencias, {
      method: 'PATCH',
      body: JSON.stringify(prefs),
      signal,
    });
  }

  // Endereços
  async buscarEnderecos(signal?: AbortSignal) {
    return this.request<EnderecoUsuario[]>(ENDPOINTS.enderecos, { signal });
  }

  async adicionarEndereco(endereco: Omit<EnderecoUsuario, 'id'>, signal?: AbortSignal) {
    return this.request<EnderecoUsuario>(ENDPOINTS.enderecos, {
      method: 'POST',
      body: JSON.stringify(endereco),
      signal,
    });
  }

  async atualizarEndereco(id: string, endereco: Partial<EnderecoUsuario>, signal?: AbortSignal) {
    return this.request<EnderecoUsuario>(`${ENDPOINTS.enderecos}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(endereco),
      signal,
    });
  }

  async removerEndereco(id: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.enderecos}/${id}`, {
      method: 'DELETE',
      signal,
    });
  }

  async definirEnderecoPrincipal(id: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.enderecos}/${id}/principal`, {
      method: 'POST',
      signal,
    });
  }

  // Cartões
  async buscarCartoes(signal?: AbortSignal) {
    return this.request<CartaoSalvo[]>(ENDPOINTS.cartoes, { signal });
  }

  async adicionarCartao(cartao: Omit<CartaoSalvo, 'id' | 'criadoEm'>, signal?: AbortSignal) {
    return this.request<CartaoSalvo>(ENDPOINTS.cartoes, {
      method: 'POST',
      body: JSON.stringify(cartao),
      signal,
    });
  }

  async removerCartao(id: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.cartoes}/${id}`, {
      method: 'DELETE',
      signal,
    });
  }

  async definirCartaoPadrao(id: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.cartoes}/${id}/padrao`, {
      method: 'POST',
      signal,
    });
  }

  // Atividades
  async buscarAtividades(pagina: number, limite: number = LIMITE_PADRAO, filtro?: AtividadesFiltro, signal?: AbortSignal) {
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: String(limite),
      ...(filtro?.tipo && { tipo: filtro.tipo }),
      ...(filtro?.dataInicio && { dataInicio: filtro.dataInicio }),
      ...(filtro?.dataFim && { dataFim: filtro.dataFim }),
    });
    return this.request<{ atividades: AtividadeUsuario[]; proximaPagina: number | null }>(
      `${ENDPOINTS.atividades}?${params}`,
      { signal }
    );
  }
}

// ============================================
// SINGLETON & FACTORY (para DI)
// ============================================

let _instancia: IPerfilService | null = null;

export function getPerfilService(): IPerfilService {
  if (!_instancia) {
    _instancia = new PerfilService(
      import.meta.env.VITE_API_BASE_URL || '',
      () => localStorage.getItem('auth_token')
    );
  }
  return _instancia;
}

export function setPerfilService(service: IPerfilService): void {
  _instancia = service;
}

export function createPerfilService(baseUrl?: string, getToken?: () => string | null): IPerfilService {
  return new PerfilService(baseUrl, getToken);
}

// Mock para testes
export const createMockPerfilService = (): IPerfilService => {
  return {
    async buscarPerfil() { return { sucesso: true, dados: {} as Perfil }; },
    async atualizarPerfil() { return { sucesso: true, dados: {} as Perfil }; },
    async uploadAvatar() { return { sucesso: true, dados: { avatar: '' } }; },
    async removerAvatar() { return { sucesso: true, dados: undefined }; },
    async alterarSenha() { return { sucesso: true, dados: undefined }; },
    async buscarPreferencias() { return { sucesso: true, dados: {} as PreferenciasUsuario }; },
    async atualizarPreferencias() { return { sucesso: true, dados: {} as PreferenciasUsuario }; },
    async buscarEnderecos() { return { sucesso: true, dados: [] }; },
    async adicionarEndereco() { return { sucesso: true, dados: {} as EnderecoUsuario }; },
    async atualizarEndereco() { return { sucesso: true, dados: {} as EnderecoUsuario }; },
    async removerEndereco() { return { sucesso: true, dados: undefined }; },
    async definirEnderecoPrincipal() { return { sucesso: true, dados: undefined }; },
    async buscarCartoes() { return { sucesso: true, dados: [] }; },
    async adicionarCartao() { return { sucesso: true, dados: {} as CartaoSalvo }; },
    async removerCartao() { return { sucesso: true, dados: undefined }; },
    async definirCartaoPadrao() { return { sucesso: true, dados: undefined }; },
    async buscarAtividades() { return { sucesso: true, dados: { atividades: [], proximaPagina: null } }; },
  };
};