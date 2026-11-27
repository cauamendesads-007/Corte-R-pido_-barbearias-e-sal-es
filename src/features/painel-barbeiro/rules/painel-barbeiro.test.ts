/**
 * Testes de fronteira para regras de painel-barbeiro.
 * Cobertura 100% - boundary values, erros, casos edge.
 */

import { describe, it, expect } from 'vitest';
import {
  validarAtualizarDisponibilidade,
  validarAtualizarServico,
  validarCriarServico,
  validarResponderAgendamento,
  validarAtualizarFila,
  validarConfiguracoesBarbeiro,
  sanitizarDadosBarbeiro,
  criarBarbeiroError,
  calcularMetricas,
  filtrarAgendamentos,
  ordenarAgendamentos,
  agruparPorPeriodo,
} from './index';
import type { DisponibilidadeBarbeiro, ServicoBarbeiro, AgendamentoBarbeiro, FilaItem, ConfiguracoesBarbeiro } from '../types';

describe('painel-barbeiro rules - boundary tests', () => {
  // ==================== validarAtualizarDisponibilidade ====================
  describe('validarAtualizarDisponibilidade', () => {
    const disponibilidadeValida: Partial<DisponibilidadeBarbeiro> = {
      diaSemana: 1,
      horaInicio: '09:00',
      horaFim: '18:00',
      intervaloMinutos: 30,
      ativo: true,
    };

    it('deve retornar sucesso para disponibilidade válida', () => {
      const resultado = validarAtualizarDisponibilidade(disponibilidadeValida);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com diaSemana inválido (< 0)', () => {
      const resultado = validarAtualizarDisponibilidade({ ...disponibilidadeValida, diaSemana: -1 });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Dia da semana');
    });

    it('deve falhar com diaSemana inválido (> 6)', () => {
      const resultado = validarAtualizarDisponibilidade({ ...disponibilidadeValida, diaSemana: 7 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com horaInicio inválida', () => {
      const resultado = validarAtualizarDisponibilidade({ ...disponibilidadeValida, horaInicio: '25:00' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Hora de início');
    });

    it('deve falhar com horaFim inválida', () => {
      const resultado = validarAtualizarDisponibilidade({ ...disponibilidadeValida, horaFim: '18:60' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar se horaInicio >= horaFim', () => {
      const resultado = validarAtualizarDisponibilidade({ ...disponibilidadeValida, horaInicio: '18:00', horaFim: '09:00' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('início deve ser anterior');
    });

    it('deve falhar com intervaloMinutos < 15', () => {
      const resultado = validarAtualizarDisponibilidade({ ...disponibilidadeValida, intervaloMinutos: 10 });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Intervalo');
    });

    it('deve falhar com intervaloMinutos > 120', () => {
      const resultado = validarAtualizarDisponibilidade({ ...disponibilidadeValida, intervaloMinutos: 150 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar boundaries (15 e 120)', () => {
      expect(validarAtualizarDisponibilidade({ ...disponibilidadeValida, intervaloMinutos: 15 }).sucesso).toBe(true);
      expect(validarAtualizarDisponibilidade({ ...disponibilidadeValida, intervaloMinutos: 120 }).sucesso).toBe(true);
    });
  });

  // ==================== validarCriarServico ====================
  describe('validarCriarServico', () => {
    const servicoValido: Partial<ServicoBarbeiro> = {
      nome: 'Corte',
      descricao: 'Corte de cabelo',
      duracaoMinutos: 30,
      preco: 50.00,
      ativo: true,
    };

    it('deve retornar sucesso para serviço válido', () => {
      const resultado = validarCriarServico(servicoValido);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com nome vazio', () => {
      const resultado = validarCriarServico({ ...servicoValido, nome: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Nome');
    });

    it('deve falhar com nome > 100 chars', () => {
      const resultado = validarCriarServico({ ...servicoValido, nome: 'a'.repeat(101) });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com duracaoMinutos < 15', () => {
      const resultado = validarCriarServico({ ...servicoValido, duracaoMinutos: 10 });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Duração');
    });

    it('deve falhar com duracaoMinutos > 240', () => {
      const resultado = validarCriarServico({ ...servicoValido, duracaoMinutos: 300 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com preco < 0', () => {
      const resultado = validarCriarServico({ ...servicoValido, preco: -10 });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Preço');
    });

    it('deve falhar com preco > 10000', () => {
      const resultado = validarCriarServico({ ...servicoValido, preco: 15000 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar boundaries (15 e 240 min, 0 e 10000 preco)', () => {
      expect(validarCriarServico({ ...servicoValido, duracaoMinutos: 15, preco: 0 }).sucesso).toBe(true);
      expect(validarCriarServico({ ...servicoValido, duracaoMinutos: 240, preco: 10000 }).sucesso).toBe(true);
    });
  });

  // ==================== validarAtualizarServico ====================
  describe('validarAtualizarServico', () => {
    it('deve aceitar atualização parcial', () => {
      const resultado = validarAtualizarServico({ preco: 60 });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve validar campos presentes', () => {
      const resultado = validarAtualizarServico({ duracaoMinutos: 10 });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== validarResponderAgendamento ====================
  describe('validarResponderAgendamento', () => {
    it('deve retornar sucesso para resposta válida', () => {
      const resultado = validarResponderAgendamento({ agendamentoId: '123', acao: 'confirmar' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar sem agendamentoId', () => {
      const resultado = validarResponderAgendamento({ agendamentoId: '', acao: 'confirmar' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com acao inválida', () => {
      const resultado = validarResponderAgendamento({ agendamentoId: '1', acao: 'invalida' as any });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Ação');
    });

    it('deve aceitar todas as ações válidas', () => {
      const acoes = ['confirmar', 'rejeitar', 'cancelar', 'reagendar', 'concluir', 'nao_compareceu'];
      acoes.forEach(acao => {
        expect(validarResponderAgendamento({ agendamentoId: '1', acao: acao as any }).sucesso).toBe(true);
      });
    });

    it('deve aceitar observação opcional', () => {
      const resultado = validarResponderAgendamento({ agendamentoId: '1', acao: 'rejeitar', observacao: 'Horário indisponível' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com observação > 500 chars', () => {
      const resultado = validarResponderAgendamento({ agendamentoId: '1', acao: 'rejeitar', observacao: 'a'.repeat(501) });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== validarAtualizarFila ====================
  describe('validarAtualizarFila', () => {
    it('deve retornar sucesso para atualização válida', () => {
      const resultado = validarAtualizarFila({ filaId: '123', acao: 'chamar' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com acao inválida', () => {
      const resultado = validarAtualizarFila({ filaId: '1', acao: 'invalida' as any });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar ações válidas', () => {
      const acoes = ['chamar', 'atender', 'pular', 'remover', 'reagendar'];
      acoes.forEach(acao => {
        expect(validarAtualizarFila({ filaId: '1', acao: acao as any }).sucesso).toBe(true);
      });
    });
  });

  // ==================== validarConfiguracoesBarbeiro ====================
  describe('validarConfiguracoesBarbeiro', () => {
    const configValida: Partial<ConfiguracoesBarbeiro> = {
      aceitaAgendamentosOnline: true,
      antecedenciaMinimaHoras: 2,
      antecedenciaMaximaDias: 30,
      confirmacaoAutomatica: true,
      lembreteClienteHoras: 24,
      tempoBufferMinutos: 10,
      permiteFilaEspera: true,
      maxFilaEspera: 5,
    };

    it('deve retornar sucesso para config válida', () => {
      const resultado = validarConfiguracoesBarbeiro(configValida);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com antecedenciaMinimaHoras < 0', () => {
      const resultado = validarConfiguracoesBarbeiro({ ...configValida, antecedenciaMinimaHoras: -1 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com antecedenciaMaximaDias < 1', () => {
      const resultado = validarConfiguracoesBarbeiro({ ...configValida, antecedenciaMaximaDias: 0 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com antecedenciaMinimaHoras > antecedenciaMaximaDias * 24', () => {
      const resultado = validarConfiguracoesBarbeiro({ ...configValida, antecedenciaMinimaHoras: 500, antecedenciaMaximaDias: 10 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com lembreteClienteHoras < 1', () => {
      const resultado = validarConfiguracoesBarbeiro({ ...configValida, lembreteClienteHoras: 0 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com tempoBufferMinutos < 0', () => {
      const resultado = validarConfiguracoesBarbeiro({ ...configValida, tempoBufferMinutos: -5 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com maxFilaEspera < 1', () => {
      const resultado = validarConfiguracoesBarbeiro({ ...configValida, maxFilaEspera: 0 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com maxFilaEspera > 50', () => {
      const resultado = validarConfiguracoesBarbeiro({ ...configValida, maxFilaEspera: 100 });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== sanitizarDadosBarbeiro ====================
  describe('sanitizarDadosBarbeiro', () => {
    it('deve remover campos undefined', () => {
      const resultado = sanitizarDadosBarbeiro({ nome: 'João', especialidade: undefined } as any);
      expect(resultado.nome).toBe('João');
      expect(resultado.especialidade).toBeUndefined();
    });

    it('deve trim strings', () => {
      const resultado = sanitizarDadosBarbeiro({ nome: '  João  ', especialidade: '  Barba  ' });
      expect(resultado.nome).toBe('João');
      expect(resultado.especialidade).toBe('Barba');
    });
  });

  // ==================== criarBarbeiroError ====================
  describe('criarBarbeiroError', () => {
    it('deve criar erro com código e mensagem', () => {
      const erro = criarBarbeiroError('NOT_FOUND', 'Barbeiro não encontrado');
      expect(erro.codigo).toBe('NOT_FOUND');
      expect(erro.mensagem).toBe('Barbeiro não encontrado');
    });
  });

  // ==================== calcularMetricas ====================
  describe('calcularMetricas', () => {
    const agendamentos: AgendamentoBarbeiro[] = [
      { id: '1', clienteId: 'c1', servicoId: 's1', dataHora: '2024-01-15T10:00:00', status: 'concluido', valor: 50, duracaoMinutos: 30 },
      { id: '2', clienteId: 'c2', servicoId: 's1', dataHora: '2024-01-15T11:00:00', status: 'concluido', valor: 50, duracaoMinutos: 30 },
      { id: '3', clienteId: 'c3', servicoId: 's2', dataHora: '2024-01-15T14:00:00', status: 'cancelado', valor: 80, duracaoMinutos: 60 },
      { id: '4', clienteId: 'c1', servicoId: 's1', dataHora: '2024-01-16T10:00:00', status: 'confirmado', valor: 50, duracaoMinutos: 30 },
    ];

    it('deve calcular métricas corretas', () => {
      const metricas = calcularMetricas(agendamentos);
      expect(metricas.totalAgendamentos).toBe(4);
      expect(metricas.concluidos).toBe(2);
      expect(metricas.cancelados).toBe(1);
      expect(metricas.confirmados).toBe(1);
      expect(metricas.faturamentoTotal).toBe(100);
      expect(metricas.ticketMedio).toBe(50);
      expect(metricas.clientesUnicos).toBe(3);
      expect(metricas.taxaOcupacao).toBeGreaterThan(0);
    });

    it('deve retornar zeros para array vazio', () => {
      const metricas = calcularMetricas([]);
      expect(metricas.totalAgendamentos).toBe(0);
      expect(metricas.faturamentoTotal).toBe(0);
      expect(metricas.ticketMedio).toBe(0);
      expect(metricas.clientesUnicos).toBe(0);
    });
  });

  // ==================== filtrarAgendamentos ====================
  describe('filtrarAgendamentos', () => {
    const agendamentos: AgendamentoBarbeiro[] = [
      { id: '1', clienteId: 'c1', servicoId: 's1', dataHora: '2024-01-15T10:00:00', status: 'concluido', valor: 50, duracaoMinutos: 30 },
      { id: '2', clienteId: 'c2', servicoId: 's1', dataHora: '2024-01-16T10:00:00', status: 'confirmado', valor: 50, duracaoMinutos: 30 },
    ];

    it('deve filtrar por status', () => {
      const resultado = filtrarAgendamentos(agendamentos, { status: 'concluido' });
      expect(resultado).toHaveLength(1);
    });

    it('deve filtrar por data inicio', () => {
      const resultado = filtrarAgendamentos(agendamentos, { dataInicio: '2024-01-16' });
      expect(resultado).toHaveLength(1);
    });

    it('deve filtrar por data fim', () => {
      const resultado = filtrarAgendamentos(agendamentos, { dataFim: '2024-01-15' });
      expect(resultado).toHaveLength(1);
    });

    it('deve retornar todos sem filtros', () => {
      const resultado = filtrarAgendamentos(agendamentos, {});
      expect(resultado).toHaveLength(2);
    });
  });

  // ==================== ordenarAgendamentos ====================
  describe('ordenarAgendamentos', () => {
    const agendamentos: AgendamentoBarbeiro[] = [
      { id: '1', clienteId: 'c1', servicoId: 's1', dataHora: '2024-01-15T12:00:00', status: 'concluido', valor: 50, duracaoMinutos: 30 },
      { id: '2', clienteId: 'c2', servicoId: 's1', dataHora: '2024-01-15T10:00:00', status: 'concluido', valor: 50, duracaoMinutos: 30 },
    ];

    it('deve ordenar por dataHora asc', () => {
      const resultado = ordenarAgendamentos([...agendamentos], 'dataHora', 'asc');
      expect(resultado[0].dataHora).toBe('2024-01-15T10:00:00');
    });

    it('deve ordenar por dataHora desc', () => {
      const resultado = ordenarAgendamentos([...agendamentos], 'dataHora', 'desc');
      expect(resultado[0].dataHora).toBe('2024-01-15T12:00:00');
    });
  });

  // ==================== agruparPorPeriodo ====================
  describe('agruparPorPeriodo', () => {
    const agendamentos: AgendamentoBarbeiro[] = [
      { id: '1', clienteId: 'c1', servicoId: 's1', dataHora: '2024-01-15T10:00:00', status: 'concluido', valor: 50, duracaoMinutos: 30 },
      { id: '2', clienteId: 'c2', servicoId: 's1', dataHora: '2024-01-15T14:00:00', status: 'concluido', valor: 80, duracaoMinutos: 60 },
      { id: '3', clienteId: 'c3', servicoId: 's1', dataHora: '2024-01-16T10:00:00', status: 'concluido', valor: 50, duracaoMinutos: 30 },
    ];

    it('deve agrupar por dia', () => {
      const grupos = agruparPorPeriodo(agendamentos, 'dia');
      expect(Object.keys(grupos)).toHaveLength(2);
      expect(grupos['2024-01-15']).toHaveLength(2);
      expect(grupos['2024-01-16']).toHaveLength(1);
    });

    it('deve agrupar por semana', () => {
      const grupos = agruparPorPeriodo(agendamentos, 'semana');
      expect(Object.keys(grupos)).toHaveLength(1);
    });

    it('deve agrupar por mes', () => {
      const grupos = agruparPorPeriodo(agendamentos, 'mes');
      expect(Object.keys(grupos)).toHaveLength(1);
    });
  });
});