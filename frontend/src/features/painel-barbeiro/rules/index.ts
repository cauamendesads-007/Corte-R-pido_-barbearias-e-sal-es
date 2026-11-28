/**
 * Regras puras de negócio do domínio Painel Barbeiro.
 * Zero dependências de React, < 30 linhas cada, early returns, constantes no topo.
 */

import type {
  Agendamento,
  AgendamentoStatus,
  FilaEspera,
  MetricasBarbeiro,
  ConfiguracaoBarbeiro,
  NotificacaoBarbeiro,
} from '../types';

// Constantes
const STATUSES_VALIDOS: AgendamentoStatus[] = ['pendente', 'confirmado', 'em_andamento', 'concluido', 'cancelado', 'nao_compareceu'];
const TRANSICOES_VALIDAS: Record<AgendamentoStatus, AgendamentoStatus[]> = {
  pendente: ['confirmado', 'cancelado'],
  confirmado: ['em_andamento', 'cancelado', 'reagendado'],
  em_andamento: ['concluido', 'cancelado'],
  concluido: [],
  cancelado: [],
  nao_compareceu: [],
};
const TEMPO_MAXIMO_ESPERA_MINUTOS = 30;
const LIMITE_NOTIFICACOES_NAO_LIDAS = 50;

/**
 * Valida transição de status de agendamento.
 */
export function validarTransicaoStatus(atual: AgendamentoStatus, novo: AgendamentoStatus): string | null {
  if (atual === novo) return 'Status já é o mesmo';
  const permitidas = TRANSICOES_VALIDAS[atual] || [];
  if (!permitidas.includes(novo)) {
    return `Transição inválida: ${atual} → ${novo}`;
  }
  return null;
}

/**
 * Valida configuração do barbeiro.
 */
export function validarConfiguracaoBarbeiro(config: Partial<ConfiguracaoBarbeiro>): string | null {
  if (config.tempoBuffer !== undefined && (config.tempoBuffer < 0 || config.tempoBuffer > 60)) {
    return 'Tempo de buffer deve ser entre 0 e 60 minutos';
  }
  if (config.maxAgendamentosDia !== undefined && (config.maxAgendamentosDia < 1 || config.maxAgendamentosDia > 50)) {
    return 'Máximo de agendamentos por dia deve ser entre 1 e 50';
  }
  if (config.antecedenciaMinima !== undefined && (config.antecedenciaMinima < 0 || config.antecedenciaMinima > 1440)) {
    return 'Antecedência mínima deve ser entre 0 e 1440 minutos (24h)';
  }
  if (config.antecedenciaMaxima !== undefined && (config.antecedenciaMaxima < 1 || config.antecedenciaMaxima > 10080)) {
    return 'Antecedência máxima deve ser entre 1 e 10080 minutos (7 dias)';
  }
  return null;
}

/**
 * Calcula posição na fila de espera.
 */
export function calcularPosicaoFila(fila: FilaEspera[], clienteId: string): number {
  const idx = fila.findIndex((f) => f.clienteId === clienteId);
  return idx >= 0 ? idx + 1 : -1;
}

/**
 * Estima tempo de espera na fila.
 */
export function estimarTempoEspera(fila: FilaEspera[], posicao: number, tempoMedioServico: number = 30): number {
  if (posicao <= 1) return 0;
  return (posicao - 1) * tempoMedioServico;
}

/**
 * Verifica se cliente pode ser chamado (não excedeu tempo de tolerância).
 */
export function podeChamarCliente(filaItem: FilaEspera, agora: Date = new Date()): boolean {
  const entrada = new Date(filaItem.entradaEm);
  const diffMin = (agora.getTime() - entrada.getTime()) / (1000 * 60);
  return diffMin <= TEMPO_MAXIMO_ESPERA_MINUTOS;
}

/**
 * Agrupa agendamentos por status.
 */
export function agruparPorStatus(agendamentos: Agendamento[]): Record<AgendamentoStatus, Agendamento[]> {
  return agendamentos.reduce((acc, a) => {
    if (!acc[a.status]) acc[a.status] = [];
    acc[a.status].push(a);
    return acc;
  }, {} as Record<AgendamentoStatus, Agendamento[]>);
}

/**
 * Filtra agendamentos por período.
 */
export function filtrarPorPeriodo(
  agendamentos: Agendamento[],
  inicio: string,
  fim: string
): Agendamento[] {
  const ini = new Date(inicio);
  const fm = new Date(fim);
  fm.setHours(23, 59, 59, 999);
  return agendamentos.filter((a) => {
    const data = new Date(a.data);
    return data >= ini && data <= fm;
  });
}

/**
 * Ordena agendamentos por data/hora.
 */
export function ordenarAgendamentos(agendamentos: Agendamento[], crescente = true): Agendamento[] {
  return [...agendamentos].sort((a, b) => {
    const diff = new Date(`${a.data}T${a.horario}`).getTime() - new Date(`${b.data}T${b.horario}`).getTime();
    return crescente ? diff : -diff;
  });
}

/**
 * Computa métricas derivadas para o dashboard.
 */
export function computarMetricasDerivadas(
  agendamentos: Agendamento[],
  fila: FilaEspera[],
  config: ConfiguracaoBarbeiro | null
): Partial<MetricasBarbeiro> {
  const hoje = new Date().toISOString().split('T')[0];
  const agendamentosHoje = agendamentos.filter((a) => a.data === hoje);
  const concluidosHoje = agendamentosHoje.filter((a) => a.status === 'concluido');
  const canceladosHoje = agendamentosHoje.filter((a) => a.status === 'cancelado');
  const naoCompareceramHoje = agendamentosHoje.filter((a) => a.status === 'nao_compareceu');

  const faturamentoHoje = concluidosHoje.reduce((sum, a) => sum + (a.valorFinal || a.servico?.preco || 0), 0);
  const taxaComparecimento = agendamentosHoje.length > 0
    ? (concluidosHoje.length / agendamentosHoje.length) * 100
    : 100;

  return {
    agendamentosHoje: agendamentosHoje.length,
    concluidosHoje: concluidosHoje.length,
    canceladosHoje: canceladosHoje.length,
    naoCompareceramHoje: naoCompareceramHoje.length,
    faturamentoHoje,
    taxaComparecimento: Math.round(taxaComparecimento * 10) / 10,
    filaEspera: fila.length,
    tempoMedioEspera: fila.length > 0
      ? Math.round(fila.reduce((s, f) => s + estimarTempoEspera(fila, f.posicao), 0) / fila.length)
      : 0,
    proximoHorarioLivre: obterProximoHorarioLivre(agendamentosHoje, config),
  };
}

/**
 * Obtém próximo horário livre baseado nos agendamentos do dia.
 */
export function obterProximoHorarioLivre(
  agendamentos: Agendamento[],
  config: ConfiguracaoBarbeiro | null
): string | null {
  if (!config) return null;
  const agora = new Date();
  const horarioAtual = `${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}`;

  // Simplificado: retorna primeiro slot após horário atual
  const ocupados = agendamentos
    .filter((a) => ['confirmado', 'em_andamento'].includes(a.status))
    .map((a) => a.horario)
    .sort();

  for (let h = config.horarioInicio; h < config.horarioFim; h++) {
    const slot = `${h.toString().padStart(2, '0')}:00`;
    if (slot > horarioAtual && !ocupados.includes(slot)) {
      return slot;
    }
  }
  return null;
}

/**
 * Formata duração em minutos para exibição legível.
 */
export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos}min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/**
 * Calcula taxa de ocupação do dia.
 */
export function calcularTaxaOcupacao(
  agendamentos: Agendamento[],
  config: ConfiguracaoBarbeiro | null
): number {
  if (!config) return 0;
  const slotsTotais = (config.horarioFim - config.horarioInicio) * (60 / (config.intervaloSlots || 30));
  const ocupados = agendamentos.filter((a) => ['confirmado', 'em_andamento', 'concluido'].includes(a.status)).length;
  return Math.round((ocupados / slotsTotais) * 100);
}

/**
 * Gera notificação para cliente na fila.
 */
export function gerarNotificacaoFila(
  tipo: 'chamada' | 'atraso' | 'proximo' | 'cancelado',
  clienteId: string,
  dados: Record<string, any>
): Omit<NotificacaoBarbeiro, 'id' | 'criadoEm' | 'lida'> {
  const mensagens: Record<string, string> = {
    chamada: 'Sua vez! Dirija-se à cadeira.',
    atraso: 'Você está próximo de perder sua vez na fila.',
    proximo: 'Você é o próximo da fila. Prepare-se!',
    cancelado: 'Sua vez na fila foi cancelada.',
  };
  return {
    tipo: `fila_${tipo}`,
    titulo: 'Fila de espera',
    mensagem: mensagens[tipo],
    clienteId,
    dados,
  };
}

/**
 * Cria erro padronizado para painel-barbeiro.
 */
export function criarPainelBarbeiroError(mensagem: string, codigo: string = 'PAINEL_BARBEIRO_ERROR'): Error & { codigo: string } {
  const error = new Error(mensagem) as Error & { codigo: string };
  error.codigo = codigo;
  return error;
}