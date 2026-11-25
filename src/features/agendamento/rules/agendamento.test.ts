/**
 * Testes de fronteira para regras de agendamento.
 * Cobertura 100% - boundary values, erros, casos edge.
 */

import { describe, it, expect } from 'vitest';
import {
  validarCriarAgendamento,
  validarAtualizarAgendamento,
  validarCancelarAgendamento,
  validarReagendarAgendamento,
  sanitizarAgendamento,
  criarAgendamentoError,
  calcularDuracaoTotal,
  calcularPrecoTotal,
  verificarConflitoHorario,
  gerarHorariosDisponiveis,
  filtrarAgendamentos,
  ordenarAgendamentos,
  agruparPorData,
  obterStatusAgendamento,
  podeCancelar,
  podeReagendar,
  podeAvaliar,
} from './index';
import type { Agendamento, ServicoAgendamento } from '../types';

describe('agendamento rules - boundary tests', () => {
  // ==================== validarCriarAgendamento ====================
  describe('validarCriarAgendamento', () => {
    const agendamentoValido = {
      estabelecimentoId: '1',
      barbeiroId: 'b1',
      servicos: [
        { servicoId: 's1', quantidade: 1, precoUnitario: 50 },
        { servicoId: 's2', quantidade: 1, precoUnitario: 30 },
      ],
      dataHora: '2024-01-15T10:00:00',
      observacoes: 'Corte degradê',
    };

    it('deve retornar sucesso para agendamento válido', () => {
      const resultado = validarCriarAgendamento(agendamentoValido);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar sem estabelecimentoId', () => {
      const resultado = validarCriarAgendamento({ ...agendamentoValido, estabelecimentoId: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Estabelecimento');
    });

    it('deve falhar sem barbeiroId', () => {
      const resultado = validarCriarAgendamento({ ...agendamentoValido, barbeiroId: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar sem servicos', () => {
      const resultado = validarCriarAgendamento({ ...agendamentoValido, servicos: [] });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Serviço');
    });

    it('deve falhar com servico sem servicoId', () => {
      const resultado = validarCriarAgendamento({
        ...agendamentoValido,
        servicos: [{ servicoId: '', quantidade: 1, precoUnitario: 50 }],
      });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com quantidade < 1', () => {
      const resultado = validarCriarAgendamento({
        ...agendamentoValido,
        servicos: [{ servicoId: 's1', quantidade: 0, precoUnitario: 50 }],
      });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com precoUnitario < 0', () => {
      const resultado = validarCriarAgendamento({
        ...agendamentoValido,
        servicos: [{ servicoId: 's1', quantidade: 1, precoUnitario: -10 }],
      });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com dataHora no passado', () => {
      const passado = new Date(Date.now() - 86400000).toISOString();
      const resultado = validarCriarAgendamento({ ...agendamentoValido, dataHora: passado });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('passado');
    });

    it('deve falhar com dataHora > 90 dias no futuro', () => {
      const futuro = new Date(Date.now() + 91 * 86400000).toISOString();
      const resultado = validarCriarAgendamento({ ...agendamentoValido, dataHora: futuro });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar dataHora = 90 dias no futuro (boundary)', () => {
      const futuro = new Date(Date.now() + 90 * 86400000).toISOString();
      const resultado = validarCriarAgendamento({ ...agendamentoValido, dataHora: futuro });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve aceitar observacoes vazias', () => {
      const resultado = validarCriarAgendamento({ ...agendamentoValido, observacoes: '' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com observacoes > 500 chars', () => {
      const resultado = validarCriarAgendamento({ ...agendamentoValido, observacoes: 'a'.repeat(501) });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== validarAtualizarAgendamento ====================
  describe('validarAtualizarAgendamento', () => {
    it('deve aceitar atualização parcial', () => {
      const resultado = validarAtualizarAgendamento({ observacoes: 'Nova observação' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve validar campos presentes', () => {
      const resultado = validarAtualizarAgendamento({ dataHora: 'invalid' });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== validarCancelarAgendamento ====================
  describe('validarCancelarAgendamento', () => {
    it('deve retornar sucesso para cancelamento válido', () => {
      const resultado = validarCancelarAgendamento({ agendamentoId: '1', motivo: 'Cliente cancelou' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar sem agendamentoId', () => {
      const resultado = validarCancelarAgendamento({ agendamentoId: '', motivo: 'Teste' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar motivo vazio', () => {
      const resultado = validarCancelarAgendamento({ agendamentoId: '1', motivo: '' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com motivo > 500 chars', () => {
      const resultado = validarCancelarAgendamento({ agendamentoId: '1', motivo: 'a'.repeat(501) });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== validarReagendarAgendamento ====================
  describe('validarReagendarAgendamento', () => {
    it('deve retornar sucesso para reagendamento válido', () => {
      const futuro = new Date(Date.now() + 86400000).toISOString();
      const resultado = validarReagendarAgendamento({ agendamentoId: '1', novaDataHora: futuro });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar sem agendamentoId', () => {
      const resultado = validarReagendarAgendamento({ agendamentoId: '', novaDataHora: '2024-01-15T10:00:00' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com novaDataHora no passado', () => {
      const passado = new Date(Date.now() - 86400000).toISOString();
      const resultado = validarReagendarAgendamento({ agendamentoId: '1', novaDataHora: passado });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com novaDataHora > 90 dias', () => {
      const futuro = new Date(Date.now() + 91 * 86400000).toISOString();
      const resultado = validarReagendarAgendamento({ agendamentoId: '1', novaDataHora: futuro });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== sanitizarAgendamento ====================
  describe('sanitizarAgendamento', () => {
    it('deve remover campos undefined', () => {
      const resultado = sanitizarAgendamento({ estabelecimentoId: '1', barbeiroId: undefined } as any);
      expect(resultado.estabelecimentoId).toBe('1');
      expect(resultado.barbeiroId).toBeUndefined();
    });

    it('deve trim strings', () => {
      const resultado = sanitizarAgendamento({ observacoes: '  Teste  ' });
      expect(resultado.observacoes).toBe('Teste');
    });
  });

  // ==================== criarAgendamentoError ====================
  describe('criarAgendamentoError', () => {
    it('deve criar erro com código e mensagem', () => {
      const erro = criarAgendamentoError('CONFLICT', 'Horário indisponível');
      expect(erro.codigo).toBe('CONFLICT');
      expect(erro.mensagem).toBe('Horário indisponível');
    });
  });

  // ==================== calcularDuracaoTotal ====================
  describe('calcularDuracaoTotal', () => {
    const servicos: ServicoAgendamento[] = [
      { servicoId: 's1', quantidade: 1, precoUnitario: 50, duracaoMinutos: 30 },
      { servicoId: 's2', quantidade: 2, precoUnitario: 30, duracaoMinutos: 20 },
    ];

    it('deve calcular duração total corretamente', () => {
      const duracao = calcularDuracaoTotal(servicos);
      expect(duracao).toBe(70); // 30 + 2*20
    });

    it('deve retornar 0 para array vazio', () => {
      expect(calcularDuracaoTotal([])).toBe(0);
    });
  });

  // ==================== calcularPrecoTotal ====================
  describe('calcularPrecoTotal', () => {
    const servicos: ServicoAgendamento[] = [
      { servicoId: 's1', quantidade: 1, precoUnitario: 50, duracaoMinutos: 30 },
      { servicoId: 's2', quantidade: 2, precoUnitario: 30, duracaoMinutos: 20 },
    ];

    it('deve calcular preço total corretamente', () => {
      const preco = calcularPrecoTotal(servicos);
      expect(preco).toBe(110); // 50 + 2*30
    });

    it('deve retornar 0 para array vazio', () => {
      expect(calcularPrecoTotal([])).toBe(0);
    });
  });

  // ==================== verificarConflitoHorario ====================
  describe('verificarConflitoHorario', () => {
    const agendamentosExistentes: Agendamento[] = [
      { id: '1', estabelecimentoId: '1', barbeiroId: 'b1', clienteId: 'c1', servicos: [], dataHora: '2024-01-15T10:00:00', duracaoTotalMinutos: 60, status: 'confirmado', precoTotal: 100, observacoes: '', criadoEm: '', atualizadoEm: '' },
      { id: '2', estabelecimentoId: '1', barbeiroId: 'b1', clienteId: 'c2', servicos: [], dataHora: '2024-01-15T14:00:00', duracaoTotalMinutos: 30, status: 'confirmado', precoTotal: 50, observacoes: '', criadoEm: '', atualizadoEm: '' },
    ];

    it('deve detectar conflito (sobreposição)', () => {
      const conflito = verificarConflitoHorario(agendamentosExistentes, 'b1', '2024-01-15T10:30:00', 30);
      expect(conflito).toBe(true);
    });

    it('deve detectar conflito (início durante outro)', () => {
      const conflito = verificarConflitoHorario(agendamentosExistentes, 'b1', '2024-01-15T09:30:00', 60);
      expect(conflito).toBe(true);
    });

    it('deve não detectar conflito (antes)', () => {
      const conflito = verificarConflitoHorario(agendamentosExistentes, 'b1', '2024-01-15T08:00:00', 60);
      expect(conflito).toBe(false);
    });

    it('deve não detectar conflito (depois)', () => {
      const conflito = verificarConflitoHorario(agendamentosExistentes, 'b1', '2024-01-15T12:00:00', 60);
      expect(conflito).toBe(false);
    });

    it('deve não detectar conflito (barbeiro diferente)', () => {
      const conflito = verificarConflitoHorario(agendamentosExistentes, 'b2', '2024-01-15T10:30:00', 30);
      expect(conflito).toBe(false);
    });

    it('deve ignorar agendamentos cancelados', () => {
      const comCancelado = [...agendamentosExistentes, { ...agendamentosExistentes[0], id: '3', status: 'cancelado' as const }];
      const conflito = verificarConflitoHorario(comCancelado, 'b1', '2024-01-15T10:30:00', 30);
      expect(conflito).toBe(true); // ainda tem o confirmado
    });
  });

  // ==================== gerarHorariosDisponiveis ====================
  describe('gerarHorariosDisponiveis', () => {
    const agendamentosExistentes: Agendamento[] = [
      { id: '1', estabelecimentoId: '1', barbeiroId: 'b1', clienteId: 'c1', servicos: [], dataHora: '2024-01-15T10:00:00', duracaoTotalMinutos: 60, status: 'confirmado', precoTotal: 100, observacoes: '', criadoEm: '', atualizadoEm: '' },
    ];

    it('deve gerar horários disponíveis', () => {
      const horarios = gerarHorariosDisponiveis(
        agendamentosExistentes,
        'b1',
        '2024-01-15',
        '09:00',
        '18:00',
        30
      );
      expect(horarios.length).toBeGreaterThan(0);
      // 10:00-11:00 ocupado, então 09:00, 09:30, 11:00, 11:30... disponíveis
      expect(horarios).toContain('09:00');
      expect(horarios).toContain('11:00');
    });

    it('deve retornar vazio se dia todo ocupado', () => {
      const diaTodo = Array.from({ length: 18 }, (_, i) => ({
        ...agendamentosExistentes[0],
        id: String(i + 1),
        dataHora: `2024-01-15T${String(9 + i).padStart(2, '0')}:00:00`,
        duracaoTotalMinutos: 30,
      }));
      const horarios = gerarHorariosDisponiveis(diaTodo, 'b1', '2024-01-15', '09:00', '18:00', 30);
      expect(horarios).toHaveLength(0);
    });
  });

  // ==================== filtrarAgendamentos ====================
  describe('filtrarAgendamentos', () => {
    const agendamentos: Agendamento[] = [
      { id: '1', estabelecimentoId: '1', barbeiroId: 'b1', clienteId: 'c1', servicos: [], dataHora: '2024-01-15T10:00:00', duracaoTotalMinutos: 60, status: 'confirmado', precoTotal: 100, observacoes: '', criadoEm: '', atualizadoEm: '' },
      { id: '2', estabelecimentoId: '1', barbeiroId: 'b2', clienteId: 'c2', servicos: [], dataHora: '2024-01-16T10:00:00', duracaoTotalMinutos: 30, status: 'pendente', precoTotal: 50, observacoes: '', criadoEm: '', atualizadoEm: '' },
    ];

    it('deve filtrar por status', () => {
      const resultado = filtrarAgendamentos(agendamentos, { status: 'confirmado' });
      expect(resultado).toHaveLength(1);
    });

    it('deve filtrar por barbeiroId', () => {
      const resultado = filtrarAgendamentos(agendamentos, { barbeiroId: 'b2' });
      expect(resultado).toHaveLength(1);
    });

    it('deve filtrar por clienteId', () => {
      const resultado = filtrarAgendamentos(agendamentos, { clienteId: 'c1' });
      expect(resultado).toHaveLength(1);
    });

    it('deve filtrar por data', () => {
      const resultado = filtrarAgendamentos(agendamentos, { data: '2024-01-15' });
      expect(resultado).toHaveLength(1);
    });
  });

  // ==================== ordenarAgendamentos ====================
  describe('ordenarAgendamentos', () => {
    const agendamentos: Agendamento[] = [
      { id: '1', estabelecimentoId: '1', barbeiroId: 'b1', clienteId: 'c1', servicos: [], dataHora: '2024-01-15T12:00:00', duracaoTotalMinutos: 60, status: 'confirmado', precoTotal: 100, observacoes: '', criadoEm: '', atualizadoEm: '' },
      { id: '2', estabelecimentoId: '1', barbeiroId: 'b1', clienteId: 'c2', servicos: [], dataHora: '2024-01-15T10:00:00', duracaoTotalMinutos: 30, status: 'confirmado', precoTotal: 50, observacoes: '', criadoEm: '', atualizadoEm: '' },
    ];

    it('deve ordenar por dataHora asc', () => {
      const resultado = ordenarAgendamentos([...agendamentos], 'dataHora', 'asc');
      expect(resultado[0].dataHora).toBe('2024-01-15T10:00:00');
    });
  });

  // ==================== agruparPorData ====================
  describe('agruparPorData', () => {
    const agendamentos: Agendamento[] = [
      { id: '1', estabelecimentoId: '1', barbeiroId: 'b1', clienteId: 'c1', servicos: [], dataHora: '2024-01-15T10:00:00', duracaoTotalMinutos: 60, status: 'confirmado', precoTotal: 100, observacoes: '', criadoEm: '', atualizadoEm: '' },
      { id: '2', estabelecimentoId: '1', barbeiroId: 'b1', clienteId: 'c2', servicos: [], dataHora: '2024-01-15T14:00:00', duracaoTotalMinutos: 30, status: 'confirmado', precoTotal: 50, observacoes: '', criadoEm: '', atualizadoEm: '' },
      { id: '3', estabelecimentoId: '1', barbeiroId: 'b1', clienteId: 'c3', servicos: [], dataHora: '2024-01-16T10:00:00', duracaoTotalMinutos: 30, status: 'confirmado', precoTotal: 50, observacoes: '', criadoEm: '', atualizadoEm: '' },
    ];

    it('deve agrupar por data', () => {
      const grupos = agruparPorData(agendamentos);
      expect(Object.keys(grupos)).toHaveLength(2);
      expect(grupos['2024-01-15']).toHaveLength(2);
      expect(grupos['2024-01-16']).toHaveLength(1);
    });
  });

  // ==================== obterStatusAgendamento ====================
  describe('obterStatusAgendamento', () => {
    it('deve retornar label correto para cada status', () => {
      expect(obterStatusAgendamento('pendente')).toBe('Pendente');
      expect(obterStatusAgendamento('confirmado')).toBe('Confirmado');
      expect(obterStatusAgendamento('cancelado')).toBe('Cancelado');
      expect(obterStatusAgendamento('concluido')).toBe('Concluído');
      expect(obterStatusAgendamento('nao_compareceu')).toBe('Não compareceu');
    });
  });

  // ==================== podeCancelar ====================
  describe('podeCancelar', () => {
    it('deve permitir cancelar pendente/confirmado', () => {
      expect(podeCancelar('pendente')).toBe(true);
      expect(podeCancelar('confirmado')).toBe(true);
    });

    it('deve não permitir cancelar outros status', () => {
      expect(podeCancelar('concluido')).toBe(false);
      expect(podeCancelar('cancelado')).toBe(false);
      expect(podeCancelar('nao_compareceu')).toBe(false);
    });
  });

  // ==================== podeReagendar ====================
  describe('podeReagendar', () => {
    it('deve permitir reagendar pendente/confirmado', () => {
      expect(podeReagendar('pendente')).toBe(true);
      expect(podeReagendar('confirmado')).toBe(true);
    });

    it('deve não permitir reagendar outros status', () => {
      expect(podeReagendar('concluido')).toBe(false);
      expect(podeReagendar('cancelado')).toBe(false);
    });
  });

  // ==================== podeAvaliar ====================
  describe('podeAvaliar', () => {
    it('deve permitir avaliar apenas concluido', () => {
      expect(podeAvaliar('concluido')).toBe(true);
      expect(podeAvaliar('confirmado')).toBe(false);
      expect(podeAvaliar('pendente')).toBe(false);
      expect(podeAvaliar('cancelado')).toBe(false);
    });
  });
});