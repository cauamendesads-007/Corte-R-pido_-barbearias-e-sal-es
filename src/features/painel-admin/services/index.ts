/**
 * Serviços do domínio Painel Admin - Interface + Implementação + DI.
 * Segue padrão DIP com Result<T,E> e AbortController.
 */

import {
  handleApiError,
  criarPainelAdminError,
  type PainelAdminResult,
} from '../rules';
import type {
  Usuario,
  UsuarioRole,
  Estabelecimento,
  EstabelecimentoStatus,
  Agendamento,
  Denuncia,
  DenunciaStatus,
  MetricasAdmin,
  ConfiguracaoSistema,
  UsuariosFiltro,
  EstabelecimentosFiltro,
  AgendamentosFiltro,
  DenunciasFiltro,
} from '../types';

// ============================================
// INTERFACE (Contrato)
// ============================================

export interface IPainelAdminService {
  // Usuários
  buscarUsuarios(pagina: number, limite: number, filtro: UsuariosFiltro, signal?: AbortSignal): Promise<PainelAdminResult<{ usuarios: Usuario[]; proximaPagina: number | null }>>;
  atualizarRoleUsuario(id: string, role: UsuarioRole, signal?: AbortSignal): Promise<PainelAdminResult<Usuario>>;
  banirUsuario(id: string, motivo: string, signal?: AbortSignal): Promise<PainelAdminResult<void>>;
  desbanirUsuario(id: string, signal?: AbortSignal): Promise<PainelAdminResult<void>>;

  // Estabelecimentos
  buscarEstabelecimentos(pagina: number, limite: number, filtro: EstabelecimentosFiltro, signal?: AbortSignal): Promise<PainelAdminResult<{ estabelecimentos: Estabelecimento[]; proximaPagina: number | null }>>;
  aprovarEstabelecimento(id: string, signal?: AbortSignal): Promise<PainelAdminResult<Estabelecimento>>;
  rejeitarEstabelecimento(id: string, motivo: string, signal?: AbortSignal): Promise<PainelAdminResult<void>>;
  suspenderEstabelecimento(id: string, motivo: string, signal?: AbortSignal): Promise<PainelAdminResult<void>>;
  reativarEstabelecimento(id: string, signal?: AbortSignal): Promise<PainelAdminResult<void>>;

  // Agendamentos
  buscarAgendamentos(pagina: number, limite: number, filtro: AgendamentosFiltro, signal?: AbortSignal): Promise<PainelAdminResult<{ agendamentos: Agendamento[]; proximaPagina: number | null }>>;
  cancelarAgendamentoAdmin(id: string, motivo: string, signal?: AbortSignal): Promise<PainelAdminResult<void>>;

  // Denúncias
  buscarDenuncias(pagina: number, limite: number, filtro: DenunciasFiltro, signal?: AbortSignal): Promise<PainelAdminResult<{ denuncias: Denuncia[]; proximaPagina: number | null }>>;
  resolverDenuncia(id: string, status: DenunciaStatus, resolucao: string, signal?: AbortSignal): Promise<PainelAdminResult<Denuncia>>;

  // Métricas
  buscarMetricas(signal?: AbortSignal): Promise<PainelAdminResult<MetricasAdmin>>;

  // Configuração
  buscarConfiguracao(signal?: AbortSignal): Promise<PainelAdminResult<ConfiguracaoSistema>>;
  atualizarConfiguracao(config: Partial<ConfiguracaoSistema>, signal?: AbortSignal): Promise<PainelAdminResult<ConfiguracaoSistema>>;
}

// ============================================
// IMPLEMENTAÇÃO
// ============================================

const ENDPOINTS = {
  usuarios: '/api/admin/usuarios',
  estabelecimentos: '/api/admin/estabelecimentos',
  agendamentos: '/api/admin/agendamentos',
  denuncias: '/api/admin/denuncias',
  metricas: '/api/admin/metricas',
  configuracao: '/api/admin/configuracao',
} as const;

const LIMITE_PADRAO = 20;

export class PainelAdminService implements IPainelAdminService {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(baseUrl: string = '', getToken: () => string | null = () => null) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  private async request<T>(url: string, options: RequestInit = {}, signal?: AbortSignal): Promise<PainelAdminResult<T>> {
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

      const data = await response.json();
      return { sucesso: true, dados: data };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { sucesso: false, erro: 'Requisição cancelada', codigo: 'ABORTED' };
      }
      return { sucesso: false, erro: 'Erro de conexão', codigo: 'NETWORK_ERROR' };
    }
  }

  // Usuários
  async buscarUsuarios(pagina: number, limite: number = LIMITE_PADRAO, filtro: UsuariosFiltro, signal?: AbortSignal) {
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: String(limite),
      ...(filtro.role && { role: filtro.role }),
      ...(filtro.status && { status: filtro.status }),
      ...(filtro.busca && { busca: filtro.busca }),
      ...(filtro.dataInicio && { dataInicio: filtro.dataInicio }),
      ...(filtro.dataFim && { dataFim: filtro.dataFim }),
    });
    return this.request<{ usuarios: Usuario[]; proximaPagina: number | null }>(`${ENDPOINTS.usuarios}?${params}`, { signal });
  }

  async atualizarRoleUsuario(id: string, role: UsuarioRole, signal?: AbortSignal) {
    return this.request<Usuario>(`${ENDPOINTS.usuarios}/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
      signal,
    });
  }

  async banirUsuario(id: string, motivo: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.usuarios}/${id}/banir`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
      signal,
    });
  }

  async desbanirUsuario(id: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.usuarios}/${id}/desbanir`, {
      method: 'POST',
      signal,
    });
  }

  // Estabelecimentos
  async buscarEstabelecimentos(pagina: number, limite: number = LIMITE_PADRAO, filtro: EstabelecimentosFiltro, signal?: AbortSignal) {
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: String(limite),
      ...(filtro.status && { status: filtro.status }),
      ...(filtro.nicho && { nicho: filtro.nicho }),
      ...(filtro.cidade && { cidade: filtro.cidade }),
      ...(filtro.busca && { busca: filtro.busca }),
      ...(filtro.dataInicio && { dataInicio: filtro.dataInicio }),
      ...(filtro.dataFim && { dataFim: filtro.dataFim }),
    });
    return this.request<{ estabelecimentos: Estabelecimento[]; proximaPagina: number | null }>(`${ENDPOINTS.estabelecimentos}?${params}`, { signal });
  }

  async aprovarEstabelecimento(id: string, signal?: AbortSignal) {
    return this.request<Estabelecimento>(`${ENDPOINTS.estabelecimentos}/${id}/aprovar`, {
      method: 'POST',
      signal,
    });
  }

  async rejeitarEstabelecimento(id: string, motivo: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.estabelecimentos}/${id}/rejeitar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
      signal,
    });
  }

  async suspenderEstabelecimento(id: string, motivo: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.estabelecimentos}/${id}/suspender`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
      signal,
    });
  }

  async reativarEstabelecimento(id: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.estabelecimentos}/${id}/reativar`, {
      method: 'POST',
      signal,
    });
  }

  // Agendamentos
  async buscarAgendamentos(pagina: number, limite: number = LIMITE_PADRAO, filtro: AgendamentosFiltro, signal?: AbortSignal) {
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: String(limite),
      ...(filtro.status && { status: filtro.status }),
      ...(filtro.estabelecimentoId && { estabelecimentoId: filtro.estabelecimentoId }),
      ...(filtro.clienteId && { clienteId: filtro.clienteId }),
      ...(filtro.barbeiroId && { barbeiroId: filtro.barbeiroId }),
      ...(filtro.dataInicio && { dataInicio: filtro.dataInicio }),
      ...(filtro.dataFim && { dataFim: filtro.dataFim }),
    });
    return this.request<{ agendamentos: Agendamento[]; proximaPagina: number | null }>(`${ENDPOINTS.agendamentos}?${params}`, { signal });
  }

  async cancelarAgendamentoAdmin(id: string, motivo: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.agendamentos}/${id}/cancelar-admin`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
      signal,
    });
  }

  // Denúncias
  async buscarDenuncias(pagina: number, limite: number = LIMITE_PADRAO, filtro: DenunciasFiltro, signal?: AbortSignal) {
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: String(limite),
      ...(filtro.status && { status: filtro.status }),
      ...(filtro.tipo && { tipo: filtro.tipo }),
      ...(filtro.denunciadoId && { denunciadoId: filtro.denunciadoId }),
      ...(filtro.denuncianteId && { denuncianteId: filtro.denuncianteId }),
      ...(filtro.dataInicio && { dataInicio: filtro.dataInicio }),
      ...(filtro.dataFim && { dataFim: filtro.dataFim }),
    });
    return this.request<{ denuncias: Denuncia[]; proximaPagina: number | null }>(`${ENDPOINTS.denuncias}?${params}`, { signal });
  }

  async resolverDenuncia(id: string, status: DenunciaStatus, resolucao: string, signal?: AbortSignal) {
    return this.request<Denuncia>(`${ENDPOINTS.denuncias}/${id}/resolver`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolucao }),
      signal,
    });
  }

  // Métricas
  async buscarMetricas(signal?: AbortSignal) {
    return this.request<MetricasAdmin>(ENDPOINTS.metricas, { signal });
  }

  // Configuração
  async buscarConfiguracao(signal?: AbortSignal) {
    return this.request<ConfiguracaoSistema>(ENDPOINTS.configuracao, { signal });
  }

  async atualizarConfiguracao(config: Partial<ConfiguracaoSistema>, signal?: AbortSignal) {
    return this.request<ConfiguracaoSistema>(ENDPOINTS.configuracao, {
      method: 'PATCH',
      body: JSON.stringify(config),
      signal,
    });
  }
}

// ============================================
// SINGLETON & FACTORY (para DI)
// ============================================

let _instancia: IPainelAdminService | null = null;

export function getPainelAdminService(): IPainelAdminService {
  if (!_instancia) {
    _instancia = new PainelAdminService(
      import.meta.env.VITE_API_BASE_URL || '',
      () => localStorage.getItem('auth_token')
    );
  }
  return _instancia;
}

export function setPainelAdminService(service: IPainelAdminService): void {
  _instancia = service;
}

export function createPainelAdminService(baseUrl?: string, getToken?: () => string | null): IPainelAdminService {
  return new PainelAdminService(baseUrl, getToken);
}

// Mock para testes
export const createMockPainelAdminService = (): IPainelAdminService => {
  return {
    async buscarUsuarios() { return { sucesso: true, dados: { usuarios: [], proximaPagina: null } }; },
    async atualizarRoleUsuario() { return { sucesso: true, dados: {} as Usuario }; },
    async banirUsuario() { return { sucesso: true, dados: undefined }; },
    async desbanirUsuario() { return { sucesso: true, dados: undefined }; },
    async buscarEstabelecimentos() { return { sucesso: true, dados: { estabelecimentos: [], proximaPagina: null } }; },
    async aprovarEstabelecimento() { return { sucesso: true, dados: {} as Estabelecimento }; },
    async rejeitarEstabelecimento() { return { sucesso: true, dados: undefined }; },
    async suspenderEstabelecimento() { return { sucesso: true, dados: undefined }; },
    async reativarEstabelecimento() { return { sucesso: true, dados: undefined }; },
    async buscarAgendamentos() { return { sucesso: true, dados: { agendamentos: [], proximaPagina: null } }; },
    async cancelarAgendamentoAdmin() { return { sucesso: true, dados: undefined }; },
    async buscarDenuncias() { return { sucesso: true, dados: { denuncias: [], proximaPagina: null } }; },
    async resolverDenuncia() { return { sucesso: true, dados: {} as Denuncia }; },
    async buscarMetricas() { return { sucesso: true, dados: {} as MetricasAdmin }; },
    async buscarConfiguracao() { return { sucesso: true, dados: {} as ConfiguracaoSistema }; },
    async atualizarConfiguracao() { return { sucesso: true, dados: {} as ConfiguracaoSistema }; },
  };
};