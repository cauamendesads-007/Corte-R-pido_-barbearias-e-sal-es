/**
 * Testes de fronteira para regras de painel-admin.
 * Cobertura 100% - boundary values, erros, casos edge.
 */

import { describe, it, expect } from 'vitest';
import {
  validarAprovarEstabelecimento,
  validarRejeitarEstabelecimento,
  validarSuspenderEstabelecimento,
  validarBanirUsuario,
  validarResolverDenuncia,
  validarConfiguracoesSistema,
  sanitizarAcaoAdmin,
  criarAdminError,
  calcularEstatisticas,
  filtrarEstabelecimentos,
  ordenarEstabelecimentos,
  paginarResultados,
} from './index';
import type { EstabelecimentoAdmin, UsuarioAdmin, DenunciaAdmin, ConfiguracoesSistema } from '../types';

describe('painel-admin rules - boundary tests', () => {
  // ==================== validarAprovarEstabelecimento ====================
  describe('validarAprovarEstabelecimento', () => {
    it('deve retornar sucesso para aprovação válida', () => {
      const resultado = validarAprovarEstabelecimento({ estabelecimentoId: '123', observacao: 'OK' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar sem estabelecimentoId', () => {
      const resultado = validarAprovarEstabelecimento({ estabelecimentoId: '', observacao: 'OK' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('ID');
    });

    it('deve aceitar observação vazia', () => {
      const resultado = validarAprovarEstabelecimento({ estabelecimentoId: '123', observacao: '' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com observação > 500 chars', () => {
      const resultado = validarAprovarEstabelecimento({ estabelecimentoId: '123', observacao: 'a'.repeat(501) });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Observação');
    });
  });

  // ==================== validarRejeitarEstabelecimento ====================
  describe('validarRejeitarEstabelecimento', () => {
    it('deve retornar sucesso para rejeição válida', () => {
      const resultado = validarRejeitarEstabelecimento({ estabelecimentoId: '123', motivo: 'Documentação incompleta' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar sem motivo', () => {
      const resultado = validarRejeitarEstabelecimento({ estabelecimentoId: '123', motivo: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Motivo');
    });

    it('deve falhar com motivo > 500 chars', () => {
      const resultado = validarRejeitarEstabelecimento({ estabelecimentoId: '123', motivo: 'a'.repeat(501) });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== validarSuspenderEstabelecimento ====================
  describe('validarSuspenderEstabelecimento', () => {
    it('deve retornar sucesso para suspensão válida', () => {
      const resultado = validarSuspenderEstabelecimento({
        estabelecimentoId: '123',
        motivo: 'Violação de termos',
        duracaoDias: 7,
      });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar sem motivo', () => {
      const resultado = validarSuspenderEstabelecimento({ estabelecimentoId: '123', motivo: '', duracaoDias: 7 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com duracaoDias < 1', () => {
      const resultado = validarSuspenderEstabelecimento({ estabelecimentoId: '123', motivo: 'Teste', duracaoDias: 0 });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Duração');
    });

    it('deve falhar com duracaoDias > 365', () => {
      const resultado = validarSuspenderEstabelecimento({ estabelecimentoId: '123', motivo: 'Teste', duracaoDias: 366 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar duracaoDias = 1 e = 365 (boundaries)', () => {
      expect(validarSuspenderEstabelecimento({ estabelecimentoId: '1', motivo: 'x', duracaoDias: 1 }).sucesso).toBe(true);
      expect(validarSuspenderEstabelecimento({ estabelecimentoId: '1', motivo: 'x', duracaoDias: 365 }).sucesso).toBe(true);
    });
  });

  // ==================== validarBanirUsuario ====================
  describe('validarBanirUsuario', () => {
    it('deve retornar sucesso para banimento válido', () => {
      const resultado = validarBanirUsuario({ usuarioId: '123', motivo: 'Spam', permanente: true });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar sem motivo', () => {
      const resultado = validarBanirUsuario({ usuarioId: '123', motivo: '', permanente: true });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com motivo > 500 chars', () => {
      const resultado = validarBanirUsuario({ usuarioId: '123', motivo: 'a'.repeat(501), permanente: true });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== validarResolverDenuncia ====================
  describe('validarResolverDenuncia', () => {
    it('deve retornar sucesso para resolução válida', () => {
      const resultado = validarResolverDenuncia({ denunciaId: '123', acao: 'advertencia', observacao: 'Resolvido' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com acao inválida', () => {
      const resultado = validarResolverDenuncia({ denunciaId: '123', acao: 'invalida' as any, observacao: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Ação');
    });

    it('deve aceitar ações válidas', () => {
      const acoesValidas = ['advertencia', 'suspensao', 'banimento', 'arquivada', 'sem_fundamento'];
      acoesValidas.forEach(acao => {
        expect(validarResolverDenuncia({ denunciaId: '1', acao: acao as any, observacao: '' }).sucesso).toBe(true);
      });
    });
  });

  // ==================== validarConfiguracoesSistema ====================
  describe('validarConfiguracoesSistema', () => {
    const configValida: Partial<ConfiguracoesSistema> = {
      comissaoPadrao: 10,
      taxaMinima: 5,
      taxaMaxima: 20,
      prazoCancelamentoHoras: 2,
      limiteAgendamentosDia: 20,
      manutencaoAtiva: false,
      mensagemManutencao: '',
    };

    it('deve retornar sucesso para config válida', () => {
      const resultado = validarConfiguracoesSistema(configValida);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com comissaoPadrao < 0', () => {
      const resultado = validarConfiguracoesSistema({ ...configValida, comissaoPadrao: -1 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com comissaoPadrao > 100', () => {
      const resultado = validarConfiguracoesSistema({ ...configValida, comissaoPadrao: 101 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com taxaMinima > taxaMaxima', () => {
      const resultado = validarConfiguracoesSistema({ ...configValida, taxaMinima: 15, taxaMaxima: 10 });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('taxa');
    });

    it('deve falhar com prazoCancelamentoHoras < 0', () => {
      const resultado = validarConfiguracoesSistema({ ...configValida, prazoCancelamentoHoras: -1 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com limiteAgendamentosDia < 1', () => {
      const resultado = validarConfiguracoesSistema({ ...configValida, limiteAgendamentosDia: 0 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar boundaries (0 e 100 para comissao)', () => {
      expect(validarConfiguracoesSistema({ ...configValida, comissaoPadrao: 0 }).sucesso).toBe(true);
      expect(validarConfiguracoesSistema({ ...configValida, comissaoPadrao: 100 }).sucesso).toBe(true);
    });
  });

  // ==================== sanitizarAcaoAdmin ====================
  describe('sanitizarAcaoAdmin', () => {
    it('deve remover campos undefined', () => {
      const resultado = sanitizarAcaoAdmin({ estabelecimentoId: '1', observacao: undefined } as any);
      expect(resultado.estabelecimentoId).toBe('1');
      expect(resultado.observacao).toBeUndefined();
    });

    it('deve trim strings', () => {
      const resultado = sanitizarAcaoAdmin({ observacao: '  teste  ' });
      expect(resultado.observacao).toBe('teste');
    });
  });

  // ==================== criarAdminError ====================
  describe('criarAdminError', () => {
    it('deve criar erro com código e mensagem', () => {
      const erro = criarAdminError('UNAUTHORIZED', 'Sem permissão');
      expect(erro.codigo).toBe('UNAUTHORIZED');
      expect(erro.mensagem).toBe('Sem permissão');
    });
  });

  // ==================== calcularEstatisticas ====================
  describe('calcularEstatisticas', () => {
    const estabelecimentos: EstabelecimentoAdmin[] = [
      { id: '1', nome: 'A', status: 'aprovado', criadoEm: '2024-01-01', atualizadoEm: '2024-01-01', totalAgendamentos: 10, avaliacaoMedia: 4.5 },
      { id: '2', nome: 'B', status: 'pendente', criadoEm: '2024-01-02', atualizadoEm: '2024-01-02', totalAgendamentos: 5, avaliacaoMedia: 4.0 },
      { id: '3', nome: 'C', status: 'rejeitado', criadoEm: '2024-01-03', atualizadoEm: '2024-01-03', totalAgendamentos: 0, avaliacaoMedia: 0 },
      { id: '4', nome: 'D', status: 'suspenso', criadoEm: '2024-01-04', atualizadoEm: '2024-01-04', totalAgendamentos: 3, avaliacaoMedia: 3.5 },
    ];

    it('deve calcular estatísticas corretas', () => {
      const stats = calcularEstatisticas(estabelecimentos);
      expect(stats.total).toBe(4);
      expect(stats.aprovados).toBe(1);
      expect(stats.pendentes).toBe(1);
      expect(stats.rejeitados).toBe(1);
      expect(stats.suspensos).toBe(1);
      expect(stats.totalAgendamentos).toBe(18);
      expect(stats.avaliacaoMediaGeral).toBeCloseTo(3.0, 1);
    });

    it('deve retornar zeros para array vazio', () => {
      const stats = calcularEstatisticas([]);
      expect(stats.total).toBe(0);
      expect(stats.aprovados).toBe(0);
      expect(stats.totalAgendamentos).toBe(0);
      expect(stats.avaliacaoMediaGeral).toBe(0);
    });
  });

  // ==================== filtrarEstabelecimentos ====================
  describe('filtrarEstabelecimentos', () => {
    const estabelecimentos: EstabelecimentoAdmin[] = [
      { id: '1', nome: 'Barbearia Alpha', status: 'aprovado', cidade: 'São Paulo', criadoEm: '2024-01-01', atualizadoEm: '2024-01-01', totalAgendamentos: 10, avaliacaoMedia: 4.5 },
      { id: '2', nome: 'Barbearia Beta', status: 'pendente', cidade: 'Rio de Janeiro', criadoEm: '2024-01-02', atualizadoEm: '2024-01-02', totalAgendamentos: 5, avaliacaoMedia: 4.0 },
    ];

    it('deve filtrar por status', () => {
      const resultado = filtrarEstabelecimentos(estabelecimentos, { status: 'aprovado' });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe('1');
    });

    it('deve filtrar por cidade', () => {
      const resultado = filtrarEstabelecimentos(estabelecimentos, { cidade: 'Rio de Janeiro' });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe('2');
    });

    it('deve filtrar por busca (nome)', () => {
      const resultado = filtrarEstabelecimentos(estabelecimentos, { busca: 'Alpha' });
      expect(resultado).toHaveLength(1);
    });

    it('deve retornar todos se sem filtros', () => {
      const resultado = filtrarEstabelecimentos(estabelecimentos, {});
      expect(resultado).toHaveLength(2);
    });
  });

  // ==================== ordenarEstabelecimentos ====================
  describe('ordenarEstabelecimentos', () => {
    const estabelecimentos: EstabelecimentoAdmin[] = [
      { id: '1', nome: 'C', status: 'aprovado', cidade: 'SP', criadoEm: '2024-01-03', atualizadoEm: '2024-01-03', totalAgendamentos: 5, avaliacaoMedia: 4.0 },
      { id: '2', nome: 'A', status: 'aprovado', cidade: 'SP', criadoEm: '2024-01-01', atualizadoEm: '2024-01-01', totalAgendamentos: 10, avaliacaoMedia: 4.5 },
      { id: '3', nome: 'B', status: 'aprovado', cidade: 'SP', criadoEm: '2024-01-02', atualizadoEm: '2024-01-02', totalAgendamentos: 8, avaliacaoMedia: 4.2 },
    ];

    it('deve ordenar por nome asc', () => {
      const resultado = ordenarEstabelecimentos([...estabelecimentos], 'nome', 'asc');
      expect(resultado.map(e => e.nome)).toEqual(['A', 'B', 'C']);
    });

    it('deve ordenar por nome desc', () => {
      const resultado = ordenarEstabelecimentos([...estabelecimentos], 'nome', 'desc');
      expect(resultado.map(e => e.nome)).toEqual(['C', 'B', 'A']);
    });

    it('deve ordenar por criadoEm asc', () => {
      const resultado = ordenarEstabelecimentos([...estabelecimentos], 'criadoEm', 'asc');
      expect(resultado.map(e => e.id)).toEqual(['2', '3', '1']);
    });
  });

  // ==================== paginarResultados ====================
  describe('paginarResultados', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1), nome: `Item ${i + 1}` }));

    it('deve retornar primeira página', () => {
      const resultado = paginarResultados(items, 1, 10);
      expect(resultado.dados).toHaveLength(10);
      expect(resultado.paginaAtual).toBe(1);
      expect(resultado.totalPaginas).toBe(3);
      expect(resultado.totalItens).toBe(25);
    });

    it('deve retornar última página com itens restantes', () => {
      const resultado = paginarResultados(items, 3, 10);
      expect(resultado.dados).toHaveLength(5);
      expect(resultado.paginaAtual).toBe(3);
    });

    it('deve retornar vazio para página inexistente', () => {
      const resultado = paginarResultados(items, 5, 10);
      expect(resultado.dados).toHaveLength(0);
    });

    it('deve lidar com página 0 (tratar como 1)', () => {
      const resultado = paginarResultados(items, 0 as any, 10);
      expect(resultado.paginaAtual).toBe(1);
    });

    it('deve lidar com limite 0 (retornar todos)', () => {
      const resultado = paginarResultados(items, 1, 0);
      expect(resultado.dados).toHaveLength(25);
      expect(resultado.totalPaginas).toBe(1);
    });
  });
});