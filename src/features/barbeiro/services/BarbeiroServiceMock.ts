/**
 * Implementação Mock do IBarbeiroService.
 */

import { IBarbeiroService } from './IBarbeiroService';
import type { Agendamento, StatusPagamento, Estabelecimento, Servico, ItemGaleria, ResultadoServico, ConfiguracaoPix } from '@/tipos';
import { estadoGlobal, simularLatencia, simularErroAleatorio, gerarId, persistirEstado, sucesso, falha } from '@/servicos/api';

function getAllAgendamentos(): Agendamento[] {
  return Object.values(estadoGlobal.agendamentos).flat();
}

export class BarbeiroServiceMock implements IBarbeiroService {
  async obterDashboard(): Promise<ResultadoServico<{
    agendamentosHoje: number;
    proximosAgendamentos: Agendamento[];
    filaAtual: number;
    faturamentoMes: number;
  }>> {
    await simularLatencia();
    simularErroAleatorio();

    const hoje = new Date().toISOString().split('T')[0];
    const agendamentos = getAllAgendamentos();

    const agendamentosHoje = agendamentos.filter(
      (a) => a.dia === hoje && a.status !== 'cancelado'
    ).length;

    const proximosAgendamentos = agendamentos
      .filter((a) => new Date(`${a.dia}T${a.horario}`) >= new Date() && a.status !== 'cancelado')
      .sort((a, b) => new Date(`${a.dia}T${a.horario}`).getTime() - new Date(`${b.dia}T${b.horario}`).getTime())
      .slice(0, 5);

    const est = estadoGlobal.estabelecimentos[0];
    const filaAtual = est?.fila?.length || 0;

    const inicioMes = new Date();
    inicioMes.setDate(1);
    const fimMes = new Date();
    fimMes.setMonth(fimMes.getMonth() + 1, 0);

    const faturamentoMes = agendamentos
      .filter((a) => {
        const data = new Date(`${a.dia}T${a.horario}`);
        return data >= inicioMes && data <= fimMes && a.statusPagamento === 'pago';
      })
      .reduce((acc, a) => acc + a.valorTotal, 0);

    return sucesso({ agendamentosHoje, proximosAgendamentos, filaAtual, faturamentoMes });
  }

  async obterEstatisticas(): Promise<ResultadoServico<{
    totalAgendamentos: number;
    agendamentosConfirmados: number;
    agendamentosCancelados: number;
    agendamentosConcluidos: number;
    faturamentoTotal: number;
    ticketMedio: number;
    servicosMaisPopulares: Array<{ servico: string; quantidade: number }>;
    avaliacaoMedia: number;
  }>> {
    await simularLatencia();
    simularErroAleatorio();

    const agendamentos = getAllAgendamentos();
    const total = agendamentos.length;
    const confirmados = agendamentos.filter((a) => a.status === 'confirmado').length;
    const cancelados = agendamentos.filter((a) => a.status === 'cancelado').length;
    const concluidos = agendamentos.filter((a) => a.status === 'concluido').length;
    const faturamentoTotal = agendamentos.filter((a) => a.statusPagamento === 'pago').reduce((acc, a) => acc + a.valorTotal, 0);
    const ticketMedio = concluidos > 0 ? faturamentoTotal / concluidos : 0;

    const servicoCount: Record<string, number> = {};
    agendamentos.forEach((a) => {
      servicoCount[a.servicos] = (servicoCount[a.servicos] || 0) + 1;
    });
    const servicosMaisPopulares = Object.entries(servicoCount)
      .map(([servico, quantidade]) => ({ servico, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    const avaliacaoMedia = 4.8; // Mock

    return sucesso({ totalAgendamentos: total, agendamentosConfirmados: confirmados, agendamentosCancelados: cancelados, agendamentosConcluidos: concluidos, faturamentoTotal, ticketMedio, servicosMaisPopulares, avaliacaoMedia });
  }

  async listarAgendamentos(estabelecimentoId: string, filtros?: { status?: StatusPagamento; dataInicio?: string; dataFim?: string }): Promise<ResultadoServico<Agendamento[]>> {
    await simularLatencia();
    simularErroAleatorio();

    let resultados = getAllAgendamentos().filter((a) => a.estabelecimentoId === estabelecimentoId);

    if (filtros?.status) {
      resultados = resultados.filter((a) => a.statusPagamento === filtros.status);
    }
    if (filtros?.dataInicio) {
      resultados = resultados.filter((a) => a.dia >= filtros.dataInicio!);
    }
    if (filtros?.dataFim) {
      resultados = resultados.filter((a) => a.dia <= filtros.dataFim!);
    }

    resultados.sort((a, b) => new Date(`${a.dia}T${a.horario}`).getTime() - new Date(`${b.dia}T${b.horario}`).getTime());
    return sucesso(resultados);
  }

  async atualizarStatus(agendamentoId: string, status: StatusPagamento): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const agendamentos = getAllAgendamentos();
    const idx = agendamentos.findIndex((a) => a.id === agendamentoId);
    if (idx === -1) return falha('Agendamento não encontrado.');

    agendamentos[idx] = { ...agendamentos[idx], statusPagamento: status };
    // Rebuild the Record
    const novo: Record<string, Agendamento[]> = {};
    for (const ag of agendamentos) {
      if (!novo[ag.estabelecimentoId]) novo[ag.estabelecimentoId] = [];
      novo[ag.estabelecimentoId].push(ag);
    }
    estadoGlobal.agendamentos = novo;
    persistirEstado();

    return sucesso(undefined);
  }

  async cancelar(agendamentoId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const agendamentos = getAllAgendamentos();
    const idx = agendamentos.findIndex((a) => a.id === agendamentoId);
    if (idx === -1) return falha('Agendamento não encontrado.');

    agendamentos[idx] = { ...agendamentos[idx], status: 'cancelado' };
    const novo: Record<string, Agendamento[]> = {};
    for (const ag of agendamentos) {
      if (!novo[ag.estabelecimentoId]) novo[ag.estabelecimentoId] = [];
      novo[ag.estabelecimentoId].push(ag);
    }
    estadoGlobal.agendamentos = novo;
    persistirEstado();

    return sucesso(undefined);
  }

  async definirHorarioReal(agendamentoId: string, horarioReal: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const agendamentos = getAllAgendamentos();
    const idx = agendamentos.findIndex((a) => a.id === agendamentoId);
    if (idx === -1) return falha('Agendamento não encontrado.');

    agendamentos[idx] = { ...agendamentos[idx], status: 'concluido', horario: horarioReal };
    const novo: Record<string, Agendamento[]> = {};
    for (const ag of agendamentos) {
      if (!novo[ag.estabelecimentoId]) novo[ag.estabelecimentoId] = [];
      novo[ag.estabelecimentoId].push(ag);
    }
    estadoGlobal.agendamentos = novo;
    persistirEstado();

    return sucesso(undefined);
  }

  // Serviços
  async listarServicos(estabelecimentoId: string): Promise<ResultadoServico<Servico[]>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    return sucesso([...est.servicos]);
  }

  async criarServico(estabelecimentoId: string, servico: Omit<Servico, 'id'>): Promise<ResultadoServico<Servico>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const novo: Servico = { ...servico, id: `svc-${gerarId()}` };
    est.servicos.push(novo);
    persistirEstado();

    return sucesso(novo);
  }

  async atualizarServico(estabelecimentoId: string, servicoId: string, dados: Partial<Servico>): Promise<ResultadoServico<Servico>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const idx = est.servicos.findIndex((s) => s.id === servicoId);
    if (idx === -1) return falha('Serviço não encontrado.');

    est.servicos[idx] = { ...est.servicos[idx], ...dados };
    persistirEstado();

    return sucesso(est.servicos[idx]);
  }

  async excluirServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const idx = est.servicos.findIndex((s) => s.id === servicoId);
    if (idx === -1) return falha('Serviço não encontrado.');

    est.servicos.splice(idx, 1);
    persistirEstado();

    return sucesso(undefined);
  }

  // Galeria
  async listarGaleria(estabelecimentoId: string): Promise<ResultadoServico<ItemGaleria[]>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    return sucesso([...est.galeria]);
  }

  async adicionarGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const novo: ItemGaleria = { ...item, id: `gal-${gerarId()}` };
    est.galeria.push(novo);
    persistirEstado();

    return sucesso(novo);
  }

  async removerGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const idx = est.galeria.findIndex((g) => g.id === itemId);
    if (idx === -1) return falha('Item não encontrado.');

    est.galeria.splice(idx, 1);
    persistirEstado();

    return sucesso(undefined);
  }

  // Configurações
  async obterEstabelecimento(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    return sucesso(est ? { ...est } : null);
  }

  async atualizarEstabelecimento(id: string, dados: Partial<Estabelecimento>): Promise<ResultadoServico<Estabelecimento>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
    if (idx === -1) return falha('Estabelecimento não encontrado.');

    estadoGlobal.estabelecimentos[idx] = { ...estadoGlobal.estabelecimentos[idx], ...dados };
    persistirEstado();

    return sucesso(estadoGlobal.estabelecimentos[idx]);
  }

  async atualizarConfiguracaoPix(id: string, config: ConfiguracaoPix): Promise<ResultadoServico<ConfiguracaoPix>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    if (!est) return falha('Estabelecimento não encontrado.');

    est.configuracaoPix = config;
    persistirEstado();

    return sucesso(config);
  }

  async atualizarMensagensAutomaticas(id: string, mensagens: Record<string, unknown>): Promise<ResultadoServico<Record<string, unknown>>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    if (!est) return falha('Estabelecimento não encontrado.');

    // Mensagens automáticas são salvas no localStorage separadamente em produção
    // Aqui apenas simulamos sucesso
    persistirEstado();

    return sucesso(mensagens);
  }

  async atualizarTema(id: string, tema: { cor?: string; layout?: string; titulo?: string; subtitulo?: string }): Promise<ResultadoServico<Estabelecimento>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    if (!est) return falha('Estabelecimento não encontrado.');

    if (tema.cor) est.tema.cor = tema.cor;
    if (tema.layout) est.tema.layout = tema.layout as 'classico' | 'moderno';
    if (tema.titulo) est.tema.titulo = tema.titulo;
    if (tema.subtitulo) est.tema.subtitulo = tema.subtitulo;

    persistirEstado();
    return sucesso(est);
  }

  async atualizarHorarioFuncionamento(id: string, horario: string): Promise<ResultadoServico<Estabelecimento>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    if (!est) return falha('Estabelecimento não encontrado.');

    est.horarioFuncionamento = horario;
    persistirEstado();

    return sucesso(est);
  }

  async definirAutoEdicao(id: string, permitido: boolean): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    if (!est) return falha('Estabelecimento não encontrado.');

    est.permiteAutoEdicao = permitido;
    persistirEstado();

    return sucesso(undefined);
  }
}