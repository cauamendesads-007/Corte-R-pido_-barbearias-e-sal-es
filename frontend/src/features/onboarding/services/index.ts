/**
 * Serviços do domínio Onboarding - Interface + Implementação + DI.
 * Segue padrão DIP com Result<T,E> e AbortController.
 */

import {
  handleApiError,
  criarOnboardingError,
  type OnboardingResult,
} from '../rules';
import type { OnboardingDados } from '../types';

// ============================================
// INTERFACE (Contrato)
// ============================================

export interface IOnboardingService {
  // Concluir onboarding e criar usuário
  concluir(dados: OnboardingDados, signal?: AbortSignal): Promise<OnboardingResult<{ usuarioId: string; token: string }>>;

  // Verificar disponibilidade de email
  verificarEmail(email: string, signal?: AbortSignal): Promise<OnboardingResult<{ disponivel: boolean }>>;

  // Verificar disponibilidade de telefone
  verificarTelefone(telefone: string, signal?: AbortSignal): Promise<OnboardingResult<{ disponivel: boolean }>>;

  // Buscar endereço por CEP
  buscarCEP(cep: string, signal?: AbortSignal): Promise<OnboardingResult<{ logradouro: string; bairro: string; cidade: string; estado: string }>>;
}

// ============================================
// IMPLEMENTAÇÃO
// ============================================

const ENDPOINTS = {
  onboarding: '/api/onboarding/concluir',
  verificarEmail: '/api/onboarding/verificar-email',
  verificarTelefone: '/api/onboarding/verificar-telefone',
  cep: '/api/cep',
} as const;

export class OnboardingService implements IOnboardingService {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(baseUrl: string = '', getToken: () => string | null = () => null) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  private async request<T>(url: string, options: RequestInit = {}, signal?: AbortSignal): Promise<OnboardingResult<T>> {
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

      const data = await response.json();
      return { sucesso: true, dados: data };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { sucesso: false, erro: 'Requisição cancelada', codigo: 'ABORTED' };
      }
      return { sucesso: false, erro: 'Erro de conexão', codigo: 'NETWORK_ERROR' };
    }
  }

  async concluir(dados: OnboardingDados, signal?: AbortSignal) {
    return this.request<{ usuarioId: string; token: string }>(ENDPOINTS.onboarding, {
      method: 'POST',
      body: JSON.stringify(dados),
      signal,
    });
  }

  async verificarEmail(email: string, signal?: AbortSignal) {
    return this.request<{ disponivel: boolean }>(`${ENDPOINTS.verificarEmail}?email=${encodeURIComponent(email)}`, { signal });
  }

  async verificarTelefone(telefone: string, signal?: AbortSignal) {
    return this.request<{ disponivel: boolean }>(`${ENDPOINTS.verificarTelefone}?telefone=${encodeURIComponent(telefone)}`, { signal });
  }

  async buscarCEP(cep: string, signal?: AbortSignal) {
    const cepLimpo = cep.replace(/\D/g, '');
    return this.request<{ logradouro: string; bairro: string; cidade: string; estado: string }>(
      `${ENDPOINTS.cep}/${cepLimpo}`,
      { signal }
    );
  }
}

// ============================================
// SINGLETON & FACTORY (para DI)
// ============================================

let _instancia: IOnboardingService | null = null;

export function getOnboardingService(): IOnboardingService {
  if (!_instancia) {
    _instancia = new OnboardingService(
      import.meta.env.VITE_API_BASE_URL || '',
      () => localStorage.getItem('auth_token')
    );
  }
  return _instancia;
}

export function setOnboardingService(service: IOnboardingService): void {
  _instancia = service;
}

export function createOnboardingService(baseUrl?: string, getToken?: () => string | null): IOnboardingService {
  return new OnboardingService(baseUrl, getToken);
}

// Mock para testes
export const createMockOnboardingService = (): IOnboardingService => {
  return {
    async concluir() { return { sucesso: true, dados: { usuarioId: '1', token: 'mock-token' } }; },
    async verificarEmail() { return { sucesso: true, dados: { disponivel: true } }; },
    async verificarTelefone() { return { sucesso: true, dados: { disponivel: true } }; },
    async buscarCEP() { return { sucesso: true, dados: { logradouro: '', bairro: '', cidade: '', estado: '' } }; },
  };
};