/**
 * Serviços do domínio Configurações - Interface + Implementação + DI.
 * Segue padrão DIP com Result<T,E> e AbortController.
 */

import { handleApiError } from '../rules';
import type {
  ConfiguracoesConta,
  ConfiguracoesAparencia,
  ConfiguracoesNotificacoes,
  ConfiguracoesPrivacidade,
  ConfiguracoesSeguranca,
} from '../types';
import type { ConfiguracoesResult } from '../types';

// ============================================
// INTERFACE (Contrato)
// ============================================

export interface IConfiguracoesService {
  // Conta
  buscarConta(signal?: AbortSignal): Promise<ConfiguracoesResult<ConfiguracoesConta>>;
  atualizarConta(dados: Partial<ConfiguracoesConta>, signal?: AbortSignal): Promise<ConfiguracoesResult<ConfiguracoesConta>>;
  alterarSenha(senhaAtual: string, novaSenha: string, signal?: AbortSignal): Promise<ConfiguracoesResult<void>>;
  excluirConta(senha: string, confirmacao: string, signal?: AbortSignal): Promise<ConfiguracoesResult<void>>;
  exportarDados(signal?: AbortSignal): Promise<ConfiguracoesResult<Blob>>;

  // Aparência
  buscarAparencia(signal?: AbortSignal): Promise<ConfiguracoesResult<ConfiguracoesAparencia>>;
  atualizarAparencia(dados: Partial<ConfiguracoesAparencia>, signal?: AbortSignal): Promise<ConfiguracoesResult<ConfiguracoesAparencia>>;

  // Notificações
  buscarNotificacoes(signal?: AbortSignal): Promise<ConfiguracoesResult<ConfiguracoesNotificacoes>>;
  atualizarNotificacoes(dados: Partial<ConfiguracoesNotificacoes>, signal?: AbortSignal): Promise<ConfiguracoesResult<ConfiguracoesNotificacoes>>;

  // Privacidade
  buscarPrivacidade(signal?: AbortSignal): Promise<ConfiguracoesResult<ConfiguracoesPrivacidade>>;
  atualizarPrivacidade(dados: Partial<ConfiguracoesPrivacidade>, signal?: AbortSignal): Promise<ConfiguracoesResult<ConfiguracoesPrivacidade>>;

  // Segurança
  buscarSeguranca(signal?: AbortSignal): Promise<ConfiguracoesResult<ConfiguracoesSeguranca>>;
  atualizarSeguranca(dados: Partial<ConfiguracoesSeguranca>, signal?: AbortSignal): Promise<ConfiguracoesResult<ConfiguracoesSeguranca>>;
  ativarDoisFatores(metodo: 'app' | 'sms' | 'email', codigo: string, signal?: AbortSignal): Promise<ConfiguracoesResult<{ secret?: string; qrCode?: string }>>;
  desativarDoisFatores(senha: string, signal?: AbortSignal): Promise<ConfiguracoesResult<void>>;
  revogarSessao(sessaoId: string, signal?: AbortSignal): Promise<ConfiguracoesResult<void>>;
  revogarTodasSessoes(signal?: AbortSignal): Promise<ConfiguracoesResult<void>>;
  removerDispositivoConfiavel(dispositivoId: string, signal?: AbortSignal): Promise<ConfiguracoesResult<void>>;
}

// ============================================
// IMPLEMENTAÇÃO
// ============================================

const ENDPOINTS = {
  conta: '/api/configuracoes/conta',
  aparencia: '/api/configuracoes/aparencia',
  notificacoes: '/api/configuracoes/notificacoes',
  privacidade: '/api/configuracoes/privacidade',
  seguranca: '/api/configuracoes/seguranca',
  sessoes: '/api/configuracoes/sessoes',
  dispositivos: '/api/configuracoes/dispositivos',
  doisFatores: '/api/configuracoes/2fa',
  exportar: '/api/configuracoes/exportar',
  excluir: '/api/configuracoes/excluir',
} as const;

export class ConfiguracoesService implements IConfiguracoesService {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(baseUrl: string = '', getToken: () => string | null = () => null) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  private async request<T>(url: string, options: RequestInit = {}, signal?: AbortSignal): Promise<ConfiguracoesResult<T>> {
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

      if (response.status === 204) {
        return { sucesso: true, dados: undefined as T };
      }

      // Para exportar dados (blob)
      if (url === ENDPOINTS.exportar) {
        const blob = await response.blob();
        return { sucesso: true, dados: blob as T };
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

  // Conta
  async buscarConta(signal?: AbortSignal) {
    return this.request<ConfiguracoesConta>(ENDPOINTS.conta, { signal });
  }

  async atualizarConta(dados: Partial<ConfiguracoesConta>, signal?: AbortSignal) {
    return this.request<ConfiguracoesConta>(ENDPOINTS.conta, {
      method: 'PATCH',
      body: JSON.stringify(dados),
      signal,
    });
  }

  async alterarSenha(senhaAtual: string, novaSenha: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.conta}/senha`, {
      method: 'PUT',
      body: JSON.stringify({ senhaAtual, novaSenha }),
      signal,
    });
  }

  async excluirConta(senha: string, confirmacao: string, signal?: AbortSignal) {
    return this.request<void>(ENDPOINTS.excluir, {
      method: 'DELETE',
      body: JSON.stringify({ senha, confirmacao }),
      signal,
    });
  }

  async exportarDados(signal?: AbortSignal) {
    return this.request<Blob>(ENDPOINTS.exportar, { signal });
  }

  // Aparência
  async buscarAparencia(signal?: AbortSignal) {
    return this.request<ConfiguracoesAparencia>(ENDPOINTS.aparencia, { signal });
  }

  async atualizarAparencia(dados: Partial<ConfiguracoesAparencia>, signal?: AbortSignal) {
    return this.request<ConfiguracoesAparencia>(ENDPOINTS.aparencia, {
      method: 'PATCH',
      body: JSON.stringify(dados),
      signal,
    });
  }

  // Notificações
  async buscarNotificacoes(signal?: AbortSignal) {
    return this.request<ConfiguracoesNotificacoes>(ENDPOINTS.notificacoes, { signal });
  }

  async atualizarNotificacoes(dados: Partial<ConfiguracoesNotificacoes>, signal?: AbortSignal) {
    return this.request<ConfiguracoesNotificacoes>(ENDPOINTS.notificacoes, {
      method: 'PATCH',
      body: JSON.stringify(dados),
      signal,
    });
  }

  // Privacidade
  async buscarPrivacidade(signal?: AbortSignal) {
    return this.request<ConfiguracoesPrivacidade>(ENDPOINTS.privacidade, { signal });
  }

  async atualizarPrivacidade(dados: Partial<ConfiguracoesPrivacidade>, signal?: AbortSignal) {
    return this.request<ConfiguracoesPrivacidade>(ENDPOINTS.privacidade, {
      method: 'PATCH',
      body: JSON.stringify(dados),
      signal,
    });
  }

  // Segurança
  async buscarSeguranca(signal?: AbortSignal) {
    return this.request<ConfiguracoesSeguranca>(ENDPOINTS.seguranca, { signal });
  }

  async atualizarSeguranca(dados: Partial<ConfiguracoesSeguranca>, signal?: AbortSignal) {
    return this.request<ConfiguracoesSeguranca>(ENDPOINTS.seguranca, {
      method: 'PATCH',
      body: JSON.stringify(dados),
      signal,
    });
  }

  async ativarDoisFatores(metodo: 'app' | 'sms' | 'email', codigo: string, signal?: AbortSignal) {
    return this.request<{ secret?: string; qrCode?: string }>(`${ENDPOINTS.doisFatores}/ativar`, {
      method: 'POST',
      body: JSON.stringify({ metodo, codigo }),
      signal,
    });
  }

  async desativarDoisFatores(senha: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.doisFatores}/desativar`, {
      method: 'POST',
      body: JSON.stringify({ senha }),
      signal,
    });
  }

  async revogarSessao(sessaoId: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.sessoes}/${sessaoId}`, {
      method: 'DELETE',
      signal,
    });
  }

  async revogarTodasSessoes(signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.sessoes}/revogar-todas`, {
      method: 'POST',
      signal,
    });
  }

  async removerDispositivoConfiavel(dispositivoId: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.dispositivos}/${dispositivoId}`, {
      method: 'DELETE',
      signal,
    });
  }
}

// ============================================
// SINGLETON & FACTORY (para DI)
// ============================================

let _instancia: IConfiguracoesService | null = null;

export function getConfiguracoesService(): IConfiguracoesService {
  if (!_instancia) {
    _instancia = new ConfiguracoesService(
      import.meta.env.VITE_API_BASE_URL || '',
      () => localStorage.getItem('auth_token')
    );
  }
  return _instancia;
}

export function setConfiguracoesService(service: IConfiguracoesService): void {
  _instancia = service;
}

export function createConfiguracoesService(baseUrl?: string, getToken?: () => string | null): IConfiguracoesService {
  return new ConfiguracoesService(baseUrl, getToken);
}

// Mock para testes
export const createMockConfiguracoesService = (): IConfiguracoesService => {
  return {
    async buscarConta() { return { sucesso: true, dados: {} as ConfiguracoesConta }; },
    async atualizarConta() { return { sucesso: true, dados: {} as ConfiguracoesConta }; },
    async alterarSenha() { return { sucesso: true, dados: undefined }; },
    async excluirConta() { return { sucesso: true, dados: undefined }; },
    async exportarDados() { return { sucesso: true, dados: new Blob() }; },
    async buscarAparencia() { return { sucesso: true, dados: {} as ConfiguracoesAparencia }; },
    async atualizarAparencia() { return { sucesso: true, dados: {} as ConfiguracoesAparencia }; },
    async buscarNotificacoes() { return { sucesso: true, dados: {} as ConfiguracoesNotificacoes }; },
    async atualizarNotificacoes() { return { sucesso: true, dados: {} as ConfiguracoesNotificacoes }; },
    async buscarPrivacidade() { return { sucesso: true, dados: {} as ConfiguracoesPrivacidade }; },
    async atualizarPrivacidade() { return { sucesso: true, dados: {} as ConfiguracoesPrivacidade }; },
    async buscarSeguranca() { return { sucesso: true, dados: {} as ConfiguracoesSeguranca }; },
    async atualizarSeguranca() { return { sucesso: true, dados: {} as ConfiguracoesSeguranca }; },
    async ativarDoisFatores() { return { sucesso: true, dados: { secret: '', qrCode: '' } }; },
    async desativarDoisFatores() { return { sucesso: true, dados: undefined }; },
    async revogarSessao() { return { sucesso: true, dados: undefined }; },
    async revogarTodasSessoes() { return { sucesso: true, dados: undefined }; },
    async removerDispositivoConfiavel() { return { sucesso: true, dados: undefined }; },
  };
};