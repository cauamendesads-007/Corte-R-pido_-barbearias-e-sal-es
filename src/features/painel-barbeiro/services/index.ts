/**
 * Serviços do domínio Painel Barbeiro - Interface + Implementação + DI.
 * Segue padrão DIP com Result<T,E> e AbortController.
 */

import {
  handleApiError,
  criarPainelBarbeiroError,
  type PainelBarbeiroResult,
} from '../rules';
import type {
  Agendamento,
  AgendamentoStatus,
  FilaEspera,
  MetricasBarbeiro,
  ConfiguracaoBarbeiro,
  NotificacaoBarbeiro,
  AgendamentosFiltro,
} from '../types';

// ============================================
// INTERFACE (Contrato)
// ============================================

export interface IPainelBarbeiroService {
  // Dashboard
  buscarDashboard(signal?: AbortSignal): Promise<PainelBarbeiroResult<{
    agendamentosHoje: Agendamento[];
    agendamentosProximos: Agendamento[];
    filaEspera: FilaEspera[];
    metricas: MetricasBarbeiro;
    configuracao: ConfiguracaoBarbeiro;
    notificacoes: NotificacaoBarbeiro[];
  }>>;

  // Agendamentos
  buscarAgendamentos(filtro: AgendamentosFiltro, pagina: number, limite: number, signal?: AbortSignal): Promise<PainelBarbeiroResult<{ agendamentos: Agendamento[]; proximaPagina: number | null }>>;
  atualizarStatusAgendamento(id: string, status: AgendamentoStatus, signal?: AbortSignal): Promise<PainelBarbeiroResult<Agendamento>>;
  reagendarAgendamento(id: string, data: string, horario: string, signal?: AbortSignal): Promise<PainelBarbeiroResult<Agendamento>>;
  cancelarAgendamento(id: string, motivo?: string, signal?: AbortSignal): Promise<PainelBarbeiroResult<void>>;

  // Fila
  buscarFila(signal?: AbortSignal): Promise<PainelBarbeiroResult<FilaEspera[]>>;
  adicionarNaFila(cliente: Omit<FilaEspera, 'id' | 'posicao' | 'entradaEm'>, signal?: AbortSignal): Promise<PainelBarbeiroResult<FilaEspera>>;
  chamarProximoFila(signal?: AbortSignal): Promise<PainelBarbeiroResult<FilaEspera | null>>;
  removerDaFila(id: string, signal?: AbortSignal): Promise<PainelBarbeiroResult<void>>;
  reordenarFila(ids: string[], signal?: AbortSignal): Promise<PainelBarbeiroResult<void>>;

  // Métricas
  buscarMetricas(periodo: 'dia' | 'semana' | 'mes' | 'ano', signal?: AbortSignal): Promise<PainelBarbeiroResult<MetricasBarbeiro>>;

  // Configuração
  buscarConfiguracao(signal?: AbortSignal): Promise<PainelBarbeiroResult<ConfiguracaoBarbeiro>>;
  atualizarConfiguracao(config: Partial<ConfiguracaoBarbeiro>, signal?: AbortSignal): Promise<PainelBarbeiroResult<ConfiguracaoBarbeiro>>;

  // Notificações
  buscarNotificacoes(signal?: AbortSignal): Promise<PainelBarbeiroResult<NotificacaoBarbeiro[]>>;
  marcarNotificacaoLida(id: string, signal?: AbortSignal): Promise<PainelBarbeiroResult<void>>;
  marcarTodasLidas(signal?: AbortSignal): Promise<PainelBarbeiroResult<void>>;
}

// ============================================
// IMPLEMENTAÇÃO
// ============================================

const ENDPOINTS = {
  dashboard: '/api/barbeiro/dashboard',
  agendamentos: '/api/barbeiro/agendamentos',
  fila: '/api/barbeiro/fila',
  metricas: '/api/barbeiro/metricas',
  configuracao: '/api/barbeiro/configuracao',
  notificacoes: '/api/barbeiro/notificacoes',
} as const;

const LIMITE_PADRAO = 20;

export class PainelBarbeiroService implements IPainelBarbeiroService {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(baseUrl: string = '', getToken: () => string | null = () => null) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  private async request<T>(url: string, options: RequestInit = {}, signal?: AbortSignal): Promise<PainelBarbeiroResult<T>> {
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

  // Dashboard
  async buscarDashboard(signal?: AbortSignal) {
    return this.request<{
      agendamentosHoje: Agendamento[];
      agendamentosProximos: Agendamento[];
      filaEspera: FilaEspera[];
      metricas: MetricasBarbeiro;
      configuracao: ConfiguracaoBarbeiro;
      notificacoes: NotificacaoBarbeiro[];
    }>(ENDPOINTS.dashboard, { signal });
  }

  // Agendamentos
  async buscarAgendamentos(filtro: AgendamentosFiltro, pagina: number, limite: number = LIMITE_PADRAO, signal?: AbortSignal) {
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: String(limite),
      ...(filtro.status && { status: filtro.status }),
      ...(filtro.dataInicio && { dataInicio: filtro.dataInicio }),
      ...(filtro.dataFim && { dataFim: filtro.dataFim }),
      ...(filtro.clienteId && { clienteId: filtro.clienteId }),
      ...(filtro.servicoId && { servicoId: filtro.servicoId }),
    });
    return this.request<{ agendamentos: Agendamento[]; proximaPagina: number | null }>(
      `${ENDPOINTS.agendamentos}?${params}`,
      { signal }
    );
  }

  async atualizarStatusAgendamento(id: string, status: AgendamentoStatus, signal?: AbortSignal) {
    return this.request<Agendamento>(`${ENDPOINTS.agendamentos}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      signal,
    });
  }

  async reagendarAgendamento(id: string, data: string, horario: string, signal?: AbortSignal) {
    return this.request<Agendamento>(`${ENDPOINTS.agendamentos}/${id}/reagendar`, {
      method: 'PATCH',
      body: JSON.stringify({ data, horario }),
      signal,
    });
  }

  async cancelarAgendamento(id: string, motivo?: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.agendamentos}/${id}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
      signal,
    });
  }

  // Fila
  async buscarFila(signal?: AbortSignal) {
    return this.request<FilaEspera[]>(ENDPOINTS.fila, { signal });
  }

  async adicionarNaFila(cliente: Omit<FilaEspera, 'id' | 'posicao' | 'entradaEm'>, signal?: AbortSignal) {
    return this.request<FilaEspera>(ENDPOINTS.fila, {
      method: 'POST',
      body: JSON.stringify(cliente),
      signal,
    });
  }

  async chamarProximoFila(signal?: AbortSignal) {
    return this.request<FilaEspera | null>(`${ENDPOINTS.fila}/chamar-proximo`, {
      method: 'POST',
      signal,
    });
  }

  async removerDaFila(id: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.fila}/${id}`, {
      method: 'DELETE',
      signal,
    });
  }

  async reordenarFila(ids: string[], signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.fila}/reordenar`, {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
      signal,
    });
  }

  // Métricas
  async buscarMetricas(periodo: 'dia' | 'semana' | 'mes' | 'ano', signal?: AbortSignal) {
    return this.request<MetricasBarbeiro>(`${ENDPOINTS.metricas}?periodo=${periodo}`, { signal });
  }

  // Configuração
  async buscarConfiguracao(signal?: AbortSignal) {
    return this.request<ConfiguracaoBarbeiro>(ENDPOINTS.configuracao, { signal });
  }

  async atualizarConfiguracao(config: Partial<ConfiguracaoBarbeiro>, signal?: AbortSignal) {
    return this.request<ConfiguracaoBarbeiro>(ENDPOINTS.configuracao, {
      method: 'PATCH',
      body: JSON.stringify(config),
      signal,
    });
  }

  // Notificações
  async buscarNotificacoes(signal?: AbortSignal) {
    return this.request<NotificacaoBarbeiro[]>(ENDPOINTS.notificacoes, { signal });
  }

  async marcarNotificacaoLida(id: string, signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.notificacoes}/${id}/ler`, {
      method: 'POST',
      signal,
    });
  }

  async marcarTodasLidas(signal?: AbortSignal) {
    return this.request<void>(`${ENDPOINTS.notificacoes}/ler-todas`, {
      method: 'POST',
      signal,
    });
  }
}

// ============================================
// SINGLETON & FACTORY (para DI)
// ============================================

let _instancia: IPainelBarbeiroService | null = null;

export function getPainelBarbeiroService(): IPainelBarbeiroService {
  if (!_instancia) {
    _instancia = new PainelBarbeiroService(
      import.meta.env.VITE_API_BASE_URL || '',
      () => localStorage.getItem('auth_token')
    );
  }
  return _instancia;
}

export function setPainelBarbeiroService(service: IPainelBarbeiroService): void {
  _instancia = service;
}

export function createPainelBarbeiroService(baseUrl?: string, getToken?: () => string | null): IPainelBarbeiroService {
  return new PainelBarbeiroService(baseUrl, getToken);
}

// Mock para testes
export const createMockPainelBarbeiroService = (): IPainelBarbeiroService => {
  const mockAgendamentos: Agendamento[] = [];
  const mockFila: FilaEspera[] = [];
  let idCounter = 1;

  return {
    async buscarDashboard() {
      return {
        sucesso: true,
        dados: {
          agendamentosHoje: [],
          agendamentosProximos: [],
          filaEspera: mockFila,
          metricas: {
            agendamentosHoje: 0,
            concluidosHoje: 0,
            canceladosHoje: 0,
            naoCompareceramHoje: 0,
            faturamentoHoje: 0,
            taxaComparecimento: 100,
            filaEspera: mockFila.length,
            tempoMedioEspera: 0,
            agendamentosSemana: 0,
            faturamentoSemana: 0,
            agendamentosMes: 0,
            faturamentoMes: 0,
            clientesUnicosMes: 0,
            ticketMedio: 0,
            servicosPopulares: [],
            horariosPico: [],
          },
          configuracao: {
            tempoBuffer: 5,
            maxAgendamentosDia: 20,
            antecedenciaMinima: 30,
            antecedenciaMaxima: 10080,
            horarioInicio: 9,
            horarioFim: 19,
            intervaloSlots: 30,
            aceitaFila: true,
            notificacoesPush: true,
            notificacoesEmail: true,
          },
          notificacoes: [],
        },
      };
    },
    async buscarAgendamentos() {
      return { sucesso: true, dados: { agendamentos: mockAgendamentos, proximaPagina: null } };
    },
    async atualizarStatusAgendamento(id, status) {
      const a = mockAgendamentos.find((ag) => ag.id === id);
      if (a) a.status = status;
      return { sucesso: true, dados: a! };
    },
    async reagendarAgendamento(id, data, horario) {
      const a = mockAgendamentos.find((ag) => ag.id === id);
      if (a) { a.data = data; a.horario = horario; }
      return { sucesso: true, dados: a! };
    },
    async cancelarAgendamento(id) {
      const a = mockAgendamentos.find((ag) => ag.id === id);
      if (a) a.status = 'cancelado';
      return { sucesso: true, dados: undefined };
    },
    async buscarFila() {
      return { sucesso: true, dados: mockFila };
    },
    async adicionarNaFila(cliente) {
      const item: FilaEspera = {
        id: String(idCounter++),
        ...cliente,
        posicao: mockFila.length + 1,
        entradaEm: new Date().toISOString(),
      };
      mockFila.push(item);
      return { sucesso: true, dados: item };
    },
    async chamarProximoFila() {
      const proximo = mockFila.shift();
      if (proximo) {
        mockFila.forEach((f, i) => { f.posicao = i + 1; });
        return { sucesso: true, dados: proximo };
      }
      return { sucesso: true, dados: null };
    },
    async removerDaFila(id) {
      const idx = mockFila.findIndex((f) => f.id === id);
      if (idx >= 0) {
        mockFila.splice(idx, 1);
        mockFila.forEach((f, i) => { f.posicao = i + 1; });
      }
      return { sucesso: true, dados: undefined };
    },
    async reordenarFila(ids) {
      const novaOrdem = ids.map((id) => mockFila.find((f) => f.id === id)).filter(Boolean) as FilaEspera[];
      novaOrdem.forEach((f, i) => { f.posicao = i + 1; });
      mockFila.splice(0, mockFila.length, ...novaOrdem);
      return { sucesso: true, dados: undefined };
    },
    async buscarMetricas() {
      return { sucesso: true, dados: {} as MetricasBarbeiro };
    },
    async buscarConfiguracao() {
      return { sucesso: true, dados: {} as ConfiguracaoBarbeiro };
    },
    async atualizarConfiguracao(config) {
      return { sucesso: true, dados: config as ConfiguracaoBarbeiro };
    },
    async buscarNotificacoes() {
      return { sucesso: true, dados: [] };
    },
    async marcarNotificacaoLida() {
      return { sucesso: true, dados: undefined };
    },
    async marcarTodasLidas() {
      return { sucesso: true, dados: undefined };
    },
  };
};