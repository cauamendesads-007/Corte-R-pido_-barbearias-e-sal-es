/**
 * Testes de fronteira para regras de estabelecimentos.
 * Cobertura 100% - boundary values, erros, casos edge.
 */

import { describe, it, expect } from 'vitest';
import {
  validarCriarEstabelecimento,
  validarAtualizarEstabelecimento,
  validarAvaliacao,
  validarServico,
  sanitizarEstabelecimento,
  criarEstabelecimentoError,
  calcularDistancia,
  filtrarEstabelecimentos,
  ordenarEstabelecimentos,
  paginarEstabelecimentos,
  agruparPorCidade,
  normalizarTelefone,
  validarHorarioFuncionamento,
} from './index';
import type { Estabelecimento, AvaliacaoEstabelecimento, ServicoEstabelecimento, HorarioFuncionamento } from '../types';

describe('estabelecimentos rules - boundary tests', () => {
  // ==================== validarCriarEstabelecimento ====================
  describe('validarCriarEstabelecimento', () => {
    const estabelecimentoValido: Partial<Estabelecimento> = {
      nome: 'Barbearia do João',
      descricao: 'Melhor barbearia da região',
      telefone: '(11) 99999-9999',
      email: 'contato@barbearia.com',
      cep: '01310-100',
      logradouro: 'Av. Paulista',
      numero: '1000',
      complemento: 'Sala 101',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP',
      latitude: -23.5613,
      longitude: -46.6565,
      horariosFuncionamento: [],
      servicos: [],
      fotos: [],
      ativo: true,
    };

    it('deve retornar sucesso para estabelecimento válido', () => {
      const resultado = validarCriarEstabelecimento(estabelecimentoValido);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com nome vazio', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, nome: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Nome');
    });

    it('deve falhar com nome > 150 chars', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, nome: 'a'.repeat(151) });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com descricao > 1000 chars', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, descricao: 'a'.repeat(1001) });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com telefone inválido', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, telefone: '123' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com email inválido', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, email: 'invalido' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com CEP inválido', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, cep: '123' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com logradouro vazio', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, logradouro: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com numero vazio', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, numero: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com bairro vazio', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, bairro: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com cidade vazia', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, cidade: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com estado inválido (não 2 letras)', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, estado: 'SAO' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com latitude fora do range', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, latitude: 100 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com longitude fora do range', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, longitude: -200 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar boundaries lat/lng válidos', () => {
      expect(validarCriarEstabelecimento({ ...estabelecimentoValido, latitude: -90, longitude: -180 }).sucesso).toBe(true);
      expect(validarCriarEstabelecimento({ ...estabelecimentoValido, latitude: 90, longitude: 180 }).sucesso).toBe(true);
    });

    it('deve aceitar complemento vazio', () => {
      const resultado = validarCriarEstabelecimento({ ...estabelecimentoValido, complemento: '' });
      expect(resultado.sucesso).toBe(true);
    });
  });

  // ==================== validarAtualizarEstabelecimento ====================
  describe('validarAtualizarEstabelecimento', () => {
    it('deve aceitar atualização parcial', () => {
      const resultado = validarAtualizarEstabelecimento({ nome: 'Novo Nome' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve validar campos presentes', () => {
      const resultado = validarAtualizarEstabelecimento({ nome: '' });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== validarAvaliacao ====================
  describe('validarAvaliacao', () => {
    const avaliacaoValida: Partial<AvaliacaoEstabelecimento> = {
      estabelecimentoId: '1',
      clienteId: 'c1',
      nota: 5,
      comentario: 'Excelente atendimento!',
      servicoId: 's1',
    };

    it('deve retornar sucesso para avaliação válida', () => {
      const resultado = validarAvaliacao(avaliacaoValida);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar sem estabelecimentoId', () => {
      const resultado = validarAvaliacao({ ...avaliacaoValida, estabelecimentoId: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com nota < 1', () => {
      const resultado = validarAvaliacao({ ...avaliacaoValida, nota: 0 });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Nota');
    });

    it('deve falhar com nota > 5', () => {
      const resultado = validarAvaliacao({ ...avaliacaoValida, nota: 6 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar boundaries (1 e 5)', () => {
      expect(validarAvaliacao({ ...avaliacaoValida, nota: 1 }).sucesso).toBe(true);
      expect(validarAvaliacao({ ...avaliacaoValida, nota: 5 }).sucesso).toBe(true);
    });

    it('deve falhar com comentario > 1000 chars', () => {
      const resultado = validarAvaliacao({ ...avaliacaoValida, comentario: 'a'.repeat(1001) });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar comentario vazio', () => {
      const resultado = validarAvaliacao({ ...avaliacaoValida, comentario: '' });
      expect(resultado.sucesso).toBe(true);
    });
  });

  // ==================== validarServico ====================
  describe('validarServico', () => {
    const servicoValido: Partial<ServicoEstabelecimento> = {
      estabelecimentoId: '1',
      nome: 'Corte',
      descricao: 'Corte de cabelo',
      duracaoMinutos: 30,
      preco: 50.00,
      categoria: 'corte',
      ativo: true,
    };

    it('deve retornar sucesso para serviço válido', () => {
      const resultado = validarServico(servicoValido);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com nome vazio', () => {
      const resultado = validarServico({ ...servicoValido, nome: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com duracaoMinutos < 15', () => {
      const resultado = validarServico({ ...servicoValido, duracaoMinutos: 10 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com duracaoMinutos > 240', () => {
      const resultado = validarServico({ ...servicoValido, duracaoMinutos: 300 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com preco < 0', () => {
      const resultado = validarServico({ ...servicoValido, preco: -10 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com preco > 10000', () => {
      const resultado = validarServico({ ...servicoValido, preco: 15000 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com categoria inválida', () => {
      const resultado = validarServico({ ...servicoValido, categoria: 'invalida' as any });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar categorias válidas', () => {
      const categorias = ['corte', 'barba', 'sobrancelha', 'hidratacao', 'coloração', 'outro'];
      categorias.forEach(cat => {
        expect(validarServico({ ...servicoValido, categoria: cat as any }).sucesso).toBe(true);
      });
    });
  });

  // ==================== sanitizarEstabelecimento ====================
  describe('sanitizarEstabelecimento', () => {
    it('deve remover campos undefined', () => {
      const resultado = sanitizarEstabelecimento({ nome: 'Teste', telefone: undefined } as any);
      expect(resultado.nome).toBe('Teste');
      expect(resultado.telefone).toBeUndefined();
    });

    it('deve trim strings', () => {
      const resultado = sanitizarEstabelecimento({ nome: '  Teste  ', descricao: '  Desc  ' });
      expect(resultado.nome).toBe('Teste');
      expect(resultado.descricao).toBe('Desc');
    });
  });

  // ==================== criarEstabelecimentoError ====================
  describe('criarEstabelecimentoError', () => {
    it('deve criar erro com código e mensagem', () => {
      const erro = criarEstabelecimentoError('NOT_FOUND', 'Estabelecimento não encontrado');
      expect(erro.codigo).toBe('NOT_FOUND');
      expect(erro.mensagem).toBe('Estabelecimento não encontrado');
    });
  });

  // ==================== calcularDistancia ====================
  describe('calcularDistancia', () => {
    it('deve calcular distância entre duas coordenadas (Haversine)', () => {
      // São Paulo -> Rio de Janeiro ≈ 360km
      const dist = calcularDistancia(-23.5505, -46.6333, -22.9068, -43.1729);
      expect(dist).toBeGreaterThan(350);
      expect(dist).toBeLessThan(380);
    });

    it('deve retornar 0 para coordenadas iguais', () => {
      const dist = calcularDistancia(-23.5505, -46.6333, -23.5505, -46.6333);
      expect(dist).toBe(0);
    });

    it('deve ser simétrico', () => {
      const dist1 = calcularDistancia(-23.5505, -46.6333, -22.9068, -43.1729);
      const dist2 = calcularDistancia(-22.9068, -43.1729, -23.5505, -46.6333);
      expect(dist1).toBeCloseTo(dist2, 5);
    });
  });

  // ==================== filtrarEstabelecimentos ====================
  describe('filtrarEstabelecimentos', () => {
    const estabelecimentos: Estabelecimento[] = [
      { id: '1', nome: 'Alpha', cidade: 'São Paulo', estado: 'SP', ativo: true, avaliacaoMedia: 4.5, distancia: 2 } as any,
      { id: '2', nome: 'Beta', cidade: 'Rio de Janeiro', estado: 'RJ', ativo: true, avaliacaoMedia: 4.0, distancia: 10 } as any,
      { id: '3', nome: 'Gamma', cidade: 'São Paulo', estado: 'SP', ativo: false, avaliacaoMedia: 3.5, distancia: 1 } as any,
    ];

    it('deve filtrar por cidade', () => {
      const resultado = filtrarEstabelecimentos(estabelecimentos, { cidade: 'São Paulo' });
      expect(resultado).toHaveLength(2);
    });

    it('deve filtrar por estado', () => {
      const resultado = filtrarEstabelecimentos(estabelecimentos, { estado: 'RJ' });
      expect(resultado).toHaveLength(1);
    });

    it('deve filtrar por ativo', () => {
      const resultado = filtrarEstabelecimentos(estabelecimentos, { ativo: true });
      expect(resultado).toHaveLength(2);
    });

    it('deve filtrar por avaliacao minima', () => {
      const resultado = filtrarEstabelecimentos(estabelecimentos, { avaliacaoMinima: 4.0 });
      expect(resultado).toHaveLength(2);
    });

    it('deve filtrar por distancia maxima', () => {
      const resultado = filtrarEstabelecimentos(estabelecimentos, { distanciaMaxima: 5 });
      expect(resultado).toHaveLength(2);
    });

    it('deve filtrar por busca no nome', () => {
      const resultado = filtrarEstabelecimentos(estabelecimentos, { busca: 'Alpha' });
      expect(resultado).toHaveLength(1);
    });
  });

  // ==================== ordenarEstabelecimentos ====================
  describe('ordenarEstabelecimentos', () => {
    const estabelecimentos: Estabelecimento[] = [
      { id: '1', nome: 'C', avaliacaoMedia: 4.0, distancia: 5 } as any,
      { id: '2', nome: 'A', avaliacaoMedia: 4.5, distancia: 2 } as any,
      { id: '3', nome: 'B', avaliacaoMedia: 3.5, distancia: 10 } as any,
    ];

    it('deve ordenar por nome asc', () => {
      const resultado = ordenarEstabelecimentos([...estabelecimentos], 'nome', 'asc');
      expect(resultado.map(e => e.nome)).toEqual(['A', 'B', 'C']);
    });

    it('deve ordenar por avaliacaoMedia desc', () => {
      const resultado = ordenarEstabelecimentos([...estabelecimentos], 'avaliacaoMedia', 'desc');
      expect(resultado.map(e => e.id)).toEqual(['2', '1', '3']);
    });

    it('deve ordenar por distancia asc', () => {
      const resultado = ordenarEstabelecimentos([...estabelecimentos], 'distancia', 'asc');
      expect(resultado.map(e => e.id)).toEqual(['2', '1', '3']);
    });
  });

  // ==================== paginarEstabelecimentos ====================
  describe('paginarEstabelecimentos', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1), nome: `Item ${i + 1}` } as any));

    it('deve retornar primeira página', () => {
      const resultado = paginarEstabelecimentos(items, 1, 10);
      expect(resultado.dados).toHaveLength(10);
      expect(resultado.totalPaginas).toBe(3);
    });

    it('deve lidar com página inválida', () => {
      const resultado = paginarEstabelecimentos(items, 5, 10);
      expect(resultado.dados).toHaveLength(0);
    });
  });

  // ==================== agruparPorCidade ====================
  describe('agruparPorCidade', () => {
    const estabelecimentos: Estabelecimento[] = [
      { id: '1', nome: 'A', cidade: 'São Paulo', estado: 'SP' } as any,
      { id: '2', nome: 'B', cidade: 'São Paulo', estado: 'SP' } as any,
      { id: '3', nome: 'C', cidade: 'Rio de Janeiro', estado: 'RJ' } as any,
    ];

    it('deve agrupar por cidade', () => {
      const grupos = agruparPorCidade(estabelecimentos);
      expect(Object.keys(grupos)).toHaveLength(2);
      expect(grupos['São Paulo']).toHaveLength(2);
      expect(grupos['Rio de Janeiro']).toHaveLength(1);
    });
  });

  // ==================== normalizarTelefone ====================
  describe('normalizarTelefone', () => {
    it('deve normalizar telefone brasileiro', () => {
      expect(normalizarTelefone('(11) 99999-9999')).toBe('5511999999999');
      expect(normalizarTelefone('11999999999')).toBe('5511999999999');
      expect(normalizarTelefone('+55 11 99999-9999')).toBe('5511999999999');
    });

    it('deve retornar vazio para inválido', () => {
      expect(normalizarTelefone('123')).toBe('');
      expect(normalizarTelefone('')).toBe('');
    });
  });

  // ==================== validarHorarioFuncionamento ====================
  describe('validarHorarioFuncionamento', () => {
    const horarioValido: HorarioFuncionamento = {
      diaSemana: 1,
      abertura: '09:00',
      fechamento: '18:00',
      fechado: false,
    };

    it('deve retornar true para horário válido', () => {
      expect(validarHorarioFuncionamento(horarioValido)).toBe(true);
    });

    it('deve retornar true para dia fechado', () => {
      expect(validarHorarioFuncionamento({ ...horarioValido, fechado: true })).toBe(true);
    });

    it('deve falhar com diaSemana inválido', () => {
      expect(validarHorarioFuncionamento({ ...horarioValido, diaSemana: 7 })).toBe(false);
    });

    it('deve falhar com abertura inválida', () => {
      expect(validarHorarioFuncionamento({ ...horarioValido, abertura: '25:00' })).toBe(false);
    });

    it('deve falhar com fechamento inválido', () => {
      expect(validarHorarioFuncionamento({ ...horarioValido, fechamento: '18:60' })).toBe(false);
    });

    it('deve falhar se abertura >= fechamento (não fechado)', () => {
      expect(validarHorarioFuncionamento({ ...horarioValido, abertura: '18:00', fechamento: '09:00' })).toBe(false);
    });
  });
});