/**
 * Regras puras de negócio do domínio de Agendamento.
 * Funções < 30 linhas, baixa complexidade ciclomática, zero dependência de React,
 * early returns, zero magic numbers - tudo em constantes nomeadas.
 */

import type {
  Agendamento,
  Servico,
  CriarAgendamentoInput,
  AgendamentoComputado,
  StatusAgendamento,
  StatusPagamento,
  AgendamentoErrorCode,
} from '../types';
import { AGENDAMENTO_CONSTANTES } from '../types';

/** Verifica se data/horário é no passado */
export function isHorarioPassado(dia: string, horario: string): boolean {
  const agora = new Date();
  const agendamento = new Date(`${dia}T${horario}`);
  return agendamento < agora;
}

/** Verifica se data/horário é hoje */
export function isHoje(dia: string): boolean {
  const hoje = new Date().toISOString().split('T')[0];
  return dia === hoje;
}

/** Verifica se agendamento é nas próximas 24h */
export function isProximo(dia: string, horario: string): boolean {
  const agora = new Date();
  const agendamento = new Date(`${dia}T${horario}`);
  const diffHoras = (agendamento.getTime() - agora.getTime()) / (1000 * 60 * 60);
  return diffHoras > 0 && diffHoras <= 24;
}

/** Verifica antecedência mínima para agendamento */
export function temAntecedenciaMinima(dia: string, horario: string): boolean {
  const agora = new Date();
  const agendamento = new Date(`${dia}T${horario}`);
  const diffMinutos = (agendamento.getTime() - agora.getTime()) / (1000 * 60);
  return diffMinutos >= AGENDAMENTO_CONSTANTES.ANTECEDENCIA_MINIMA_MINUTOS;
}

/** Verifica antecedência máxima para agendamento */
export function temAntecedenciaMaxima(dia: string): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const agendamento = new Date(`${dia}T00:00:00`);
  const diffDias = (agendamento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
  return diffDias <= AGENDAMENTO_CONSTANTES.ANTECEDENCIA_MAXIMA_DIAS;
}

/** Verifica se pode cancelar (antes do limite de horas) */
export function podeCancelar(dia: string, horario: string): boolean {
  const agora = new Date();
  const agendamento = new Date(`${dia}T${horario}`);
  const diffHoras = (agendamento.getTime() - agora.getTime()) / (1000 * 60 * 60);
  return diffHoras >= AGENDAMENTO_CONSTANTES.LIMITE_CANCELAMENTO_HORAS;
}

/** Verifica se pode reagendar (antes do limite de horas) */
export function podeReagendar(dia: string, horario: string): boolean {
  const agora = new Date();
  const agendamento = new Date(`${dia}T${horario}`);
  const diffHoras = (agendamento.getTime() - agora.getTime()) / (1000 * 60 * 60);
  return diffHoras >= AGENDAMENTO_CONSTANTES.LIMITE_REAGENDAMENTO_HORAS;
}

/** Verifica se agendamento está em status cancelável */
export function isStatusCancelavel(status: StatusAgendamento): boolean {
  return ['agendado', 'confirmado'].includes(status);
}

/** Verifica se agendamento está em status reagendável */
export function isStatusReagendavel(status: StatusAgendamento): boolean {
  return ['agendado', 'confirmado'].includes(status);
}

/** Verifica se agendamento pode ser avaliado */
export function podeAvaliar(status: StatusAgendamento, avaliacao?: { estrelas: number }): boolean {
  return status === 'concluido' && !avaliacao;
}

/** Calcula valor total dos serviços */
export function calcularValorTotal(servicos: Servico[]): number {
  return servicos.reduce((acc, s) => acc + s.preco, 0);
}

/** Calcula duração total dos serviços */
export function calcularDuracaoTotal(servicos: Servico[]): number {
  return servicos.reduce((acc, s) => acc + s.duracaoMinutos, 0);
}

/** Filtra serviços por IDs */
export function filtrarServicosPorIds(servicos: Servico[], ids: string[]): Servico[] {
  const idSet = new Set(ids);
  return servicos.filter((s) => idSet.has(s.id));
}

/** Obtém texto do status para exibição */
export function obterStatusTexto(status: StatusAgendamento): string {
  const textos: Record<StatusAgendamento, string> = {
    agendado: 'Agendado',
    confirmado: 'Confirmado',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    nao_compareceu: 'Não compareceu',
  };
  return textos[status] || status;
}

/** Obtém cor do status para UI */
export function obterStatusCor(status: StatusAgendamento): AgendamentoComputado['statusCor'] {
  const cores: Record<StatusAgendamento, AgendamentoComputado['statusCor']> = {
    agendado: 'aviso',
    confirmado: 'sucesso',
    concluido: 'padrao',
    cancelado: 'perigo',
    nao_compareceu: 'perigo',
  };
  return cores[status] || 'padrao';
}

/** Obtém texto do status de pagamento */
export function obterStatusPagamentoTexto(status: StatusPagamento): string {
  const textos: Record<StatusPagamento, string> = {
    no_local: 'Pagar no local',
    aguardando_pix: 'Aguardando Pix',
    pago: 'Pago',
  };
  return textos[status] || status;
}

/** Cria objeto AgendamentoComputado a partir de Agendamento + Serviços */
export function computarAgendamento(
  agendamento: Agendamento,
  servicosDisponiveis: Servico[]
): AgendamentoComputado {
  const servicos = filtrarServicosPorIds(servicosDisponiveis, agendamento.servicoIds);
  const valorTotal = calcularValorTotal(servicos);
  const duracaoTotal = calcularDuracaoTotal(servicos);

  return {
    agendamento,
    servicos,
    valorTotal,
    duracaoTotal,
    podeCancelar: isStatusCancelavel(agendamento.status) && podeCancelar(agendamento.dia, agendamento.horario),
    podeReagendar: isStatusReagendavel(agendamento.status) && podeReagendar(agendamento.dia, agendamento.horario),
    podeAvaliar: podeAvaliar(agendamento.status, agendamento.avaliacao),
    podeConfirmar: agendamento.status === 'agendado',
    statusTexto: obterStatusTexto(agendamento.status),
    statusCor: obterStatusCor(agendamento.status),
    isPassado: isHorarioPassado(agendamento.dia, agendamento.horario),
    isHoje: isHoje(agendamento.dia),
    isProximo: isProximo(agendamento.dia, agendamento.horario),
  };
}

/** Valida entrada de criação de agendamento */
export function validarCriarAgendamento(input: CriarAgendamentoInput, servicosDisponiveis: Servico[]): string | null {
  if (!input.estabelecimentoId) return 'Estabelecimento é obrigatório';
  if (!input.servicoIds.length) return 'Selecione pelo menos um serviço';
  if (!input.dia) return 'Data é obrigatória';
  if (!input.horario) return 'Horário é obrigatório';

  // Valida antecedência
  if (isHorarioPassado(input.dia, input.horario)) return 'Não é possível agendar no passado';
  if (!temAntecedenciaMinima(input.dia, input.horario)) {
    return `Agende com pelo menos ${AGENDAMENTO_CONSTANTES.ANTECEDENCIA_MINIMA_MINUTOS} minutos de antecedência`;
  }
  if (!temAntecedenciaMaxima(input.dia)) {
    return `Agendamentos só podem ser feitos com até ${AGENDAMENTO_CONSTANTES.ANTECEDENCIA_MAXIMA_DIAS} dias de antecedência`;
  }

  // Valida serviços
  const servicos = filtrarServicosPorIds(servicosDisponiveis, input.servicoIds);
  if (servicos.length !== input.servicoIds.length) return 'Um ou mais serviços não existem';
  if (servicos.length === 0) return 'Nenhum serviço válido selecionado';

  // Valida duração total
  const duracaoTotal = calcularDuracaoTotal(servicos);
  if (duracaoTotal < AGENDAMENTO_CONSTANTES.DURACAO_MINIMA_MINUTOS) {
    return `Duração mínima: ${AGENDAMENTO_CONSTANTES.DURACAO_MINIMA_MINUTOS} minutos`;
  }
  if (duracaoTotal > AGENDAMENTO_CONSTANTES.DURACAO_MAXIMA_MINUTOS) {
    return `Duração máxima: ${AGENDAMENTO_CONSTANTES.DURACAO_MAXIMA_MINUTOS} minutos`;
  }

  // Valida forma de pagamento
  if (!['no_local', 'pix'].includes(input.formaPagamento)) return 'Forma de pagamento inválida';

  return null;
}

/** Valida nota de avaliação */
export function validarNota(nota: number): string | null {
  if (!Number.isInteger(nota)) return 'Nota deve ser um número inteiro';
  if (nota < AGENDAMENTO_CONSTANTES.NOTA_MINIMA || nota > AGENDAMENTO_CONSTANTES.NOTA_MAXIMA) {
    return `Nota deve ser entre ${AGENDAMENTO_CONSTANTES.NOTA_MINIMA} e ${AGENDAMENTO_CONSTANTES.NOTA_MAXIMA}`;
  }
  return null;
}

/** Valida comentário de avaliação */
export function validarComentario(comentario?: string): string | null {
  if (comentario && comentario.length > AGENDAMENTO_CONSTANTES.COMENTARIO_MAX_LENGTH) {
    return `Comentário deve ter no máximo ${AGENDAMENTO_CONSTANTES.COMENTARIO_MAX_LENGTH} caracteres`;
  }
  return null;
}

/** Cria erro tipado */
export function criarAgendamentoError(code: AgendamentoErrorCode, message: string, campo?: string): Error & { code: AgendamentoErrorCode; campo?: string } {
  const error = new Error(message) as Error & { code: AgendamentoErrorCode; campo?: string };
  error.code = code;
  if (campo) error.campo = campo;
  return error;
}

/** Ordena agendamentos por data/horário (mais recentes primeiro) */
export function ordenarAgendamentos(agendamentos: Agendamento[], ascendente = false): Agendamento[] {
  return [...agendamentos].sort((a, b) => {
    const dataA = new Date(`${a.dia}T${a.horario}`).getTime();
    const dataB = new Date(`${b.dia}T${b.horario}`).getTime();
    return ascendente ? dataA - dataB : dataB - dataA;
  });
}

/** Agrupa agendamentos por status */
export function agruparPorStatus(agendamentos: Agendamento[]): Record<StatusAgendamento, Agendamento[]> {
  const grupos: Record<StatusAgendamento, Agendamento[]> = {
    agendado: [],
    confirmado: [],
    concluido: [],
    cancelado: [],
    nao_compareceu: [],
  };

  agendamentos.forEach((a) => {
    if (grupos[a.status]) {
      grupos[a.status].push(a);
    }
  });

  return grupos;
}