/**
 * Implementação Mock do IAgendamentosService.
 */

import { IAgendamentosService } from './IAgendamentosService';
import type { Agendamento, StatusPagamento, AvaliacaoAgendamento, ResultadoServico } from '@/tipos';
import { estadoGlobal, simularLatencia, simularErroAleatorio, gerarId, persistirEstado, sucesso, falha } from '@/servicos/api';

function getAllAgendamentos(): Agendamento[] {
  return Object.values(estadoGlobal.agendamentos).flat();
}

function setAgendamentos(agendamentos: Agendamento[]): void {
  const novo: Record<string, Agendamento[]> = {};
  for (const ag of agendamentos) {
    if (!novo[ag.estabelecimentoId]) {
      novo[ag.estabelecimentoId] = [];
    }
    novo[ag.estabelecimentoId].push(ag);
  }
  estadoGlobal.agendamentos = novo;
}

export class AgendamentosServiceMock implements IAgendamentosService {
  async listar(filtros: { estabelecimentoId?: string; usuarioId?: string }): Promise<ResultadoServico<Agendamento[]>> {
    await simularLatencia();
    simularErroAleatorio();

    let resultados = getAllAgendamentos();

    if (filtros.estabelecimentoId) {
      resultados = resultados.filter((a) => a.estabelecimentoId === filtros.estabelecimentoId);
    }
    if (filtros.usuarioId) {
      resultados = resultados.filter((a) => a.usuarioId === filtros.usuarioId);
    }

    resultados.sort((a, b) => new Date(`${b.dia}T${b.horario}`).getTime() - new Date(`${a.dia}T${a.horario}`).getTime());

    return sucesso(resultados);
  }

  async listarEstabelecimento(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>> {
    return this.listar({ estabelecimentoId });
  }

  async listarCliente(usuarioId: string): Promise<ResultadoServico<Agendamento[]>> {
    return this.listar({ usuarioId });
  }

  async listarBarbeiro(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>> {
    return this.listar({ estabelecimentoId });
  }

  async obter(agendamentoId: string): Promise<ResultadoServico<Agendamento | null>> {
    await simularLatencia();
    simularErroAleatorio();

    const ag = getAllAgendamentos().find((a) => a.id === agendamentoId);
    return sucesso(ag ? { ...ag } : null);
  }

  async obterHorariosDisponiveis(estabelecimentoId: string, dia: string, duracaoMinutos: number): Promise<ResultadoServico<string[]>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const [inicio, fim] = est.horarioFuncionamento.split('-');
    const horarios: string[] = [];
    const [hi, mi] = inicio.split(':').map(Number);
    const [hf, mf] = fim.split(':').map(Number);

    let atual = hi * 60 + mi;
    const fimMin = hf * 60 + mf;

    while (atual + duracaoMinutos <= fimMin) {
      const h = String(Math.floor(atual / 60)).padStart(2, '0');
      const m = String(atual % 60).padStart(2, '0');
      horarios.push(`${h}:${m}`);
      atual += 30;
    }

    const agendamentosDia = getAllAgendamentos().filter(
      (a) => a.estabelecimentoId === estabelecimentoId && a.dia === dia && a.status !== 'cancelado'
    );
    const ocupados = new Set(agendamentosDia.map((a) => a.horario));
    const disponiveis = horarios.filter((h) => !ocupados.has(h));

    return sucesso(disponiveis);
  }

  async criar(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === dados.estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const conflito = getAllAgendamentos().some(
      (a) => a.estabelecimentoId === dados.estabelecimentoId && a.dia === dados.dia && a.horario === dados.horario && a.status !== 'cancelado'
    );
    if (conflito) return falha('Horário não disponível.');

    const novo: Agendamento = {
      ...dados,
      id: `ag-${gerarId()}`,
    };

    const allAg = getAllAgendamentos();
    allAg.push(novo);
    setAgendamentos(allAg);
    persistirEstado();

    return sucesso(novo);
  }

  async criarWrapper(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>> {
    return this.criar(dados);
  }

  async cancelar(agendamentoId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const allAg = getAllAgendamentos();
    const idx = allAg.findIndex((a) => a.id === agendamentoId);
    if (idx === -1) return falha('Agendamento não encontrado.');

    allAg[idx] = { ...allAg[idx], status: 'cancelado' };
    setAgendamentos(allAg);
    persistirEstado();

    return sucesso(undefined);
  }

  async cancelarWrapper(agendamentoId: string): Promise<ResultadoServico<void>> {
    return this.cancelar(agendamentoId);
  }

  async reagendar(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>> {
    await simularLatencia();
    simularErroAleatorio();

    const allAg = getAllAgendamentos();
    const idx = allAg.findIndex((a) => a.id === agendamentoId);
    if (idx === -1) return falha('Agendamento não encontrado.');

    const ag = allAg[idx];
    const conflito = allAg.some(
      (a) => a.id !== agendamentoId && a.estabelecimentoId === ag.estabelecimentoId && a.dia === novoDia && a.horario === novoHorario && a.status !== 'cancelado'
    );
    if (conflito) return falha('Horário não disponível.');

    allAg[idx] = { ...ag, dia: novoDia, horario: novoHorario };
    setAgendamentos(allAg);
    persistirEstado();

    return sucesso(allAg[idx]);
  }

  async reagendarWrapper(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>> {
    return this.reagendar(agendamentoId, novoDia, novoHorario);
  }

  async confirmarPresenca(agendamentoId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const allAg = getAllAgendamentos();
    const idx = allAg.findIndex((a) => a.id === agendamentoId);
    if (idx === -1) return falha('Agendamento não encontrado.');

    allAg[idx] = { ...allAg[idx], status: 'confirmado' };
    setAgendamentos(allAg);
    persistirEstado();

    return sucesso(undefined);
  }

  async confirmarPagamentoPix(agendamentoId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const allAg = getAllAgendamentos();
    const idx = allAg.findIndex((a) => a.id === agendamentoId);
    if (idx === -1) return falha('Agendamento não encontrado.');

    allAg[idx] = { ...allAg[idx], statusPagamento: 'pago' };
    setAgendamentos(allAg);
    persistirEstado();

    return sucesso(undefined);
  }

  async avaliar(agendamentoId: string, nota: number, comentario?: string): Promise<ResultadoServico<AvaliacaoAgendamento>> {
    await simularLatencia();
    simularErroAleatorio();

    const allAg = getAllAgendamentos();
    const idx = allAg.findIndex((a) => a.id === agendamentoId);
    if (idx === -1) return falha('Agendamento não encontrado.');

    const avaliacao: AvaliacaoAgendamento = {
      estrelas: nota,
      comentario: comentario || '',
      data: new Date().toISOString(),
    };

    allAg[idx] = { ...allAg[idx], status: 'concluido', avaliacao };
    setAgendamentos(allAg);
    persistirEstado();

    return sucesso(avaliacao);
  }

  async atualizarStatus(agendamentoId: string, status: StatusPagamento): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const allAg = getAllAgendamentos();
    const idx = allAg.findIndex((a) => a.id === agendamentoId);
    if (idx === -1) return falha('Agendamento não encontrado.');

    allAg[idx] = { ...allAg[idx], statusPagamento: status };
    setAgendamentos(allAg);
    persistirEstado();

    return sucesso(undefined);
  }

  async definirHorarioReal(agendamentoId: string, horarioReal: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const allAg = getAllAgendamentos();
    const idx = allAg.findIndex((a) => a.id === agendamentoId);
    if (idx === -1) return falha('Agendamento não encontrado.');

    allAg[idx] = { ...allAg[idx], status: 'concluido', horario: horarioReal };
    setAgendamentos(allAg);
    persistirEstado();

    return sucesso(undefined);
  }
}