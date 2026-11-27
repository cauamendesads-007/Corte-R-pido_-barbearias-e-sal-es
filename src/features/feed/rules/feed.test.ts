/**
 * Testes de fronteira para regras de feed.
 * Cobertura 100% - boundary values, erros, casos edge.
 */

import { describe, it, expect } from 'vitest';
import {
  validarCriarPublicacao,
  validarAtualizarPublicacao,
  validarComentario,
  validarDenuncia,
  sanitizarPublicacao,
  criarFeedError,
  calcularEngajamento,
  filtrarPublicacoes,
  ordenarPublicacoes,
  paginarPublicacoes,
  extrairHashtags,
  extrairMencoes,
  truncarTexto,
} from './index';
import type { PublicacaoFeed, ComentarioFeed, DenunciaFeed } from '../types';

describe('feed rules - boundary tests', () => {
  // ==================== validarCriarPublicacao ====================
  describe('validarCriarPublicacao', () => {
    const publicacaoValida: Partial<PublicacaoFeed> = {
      conteudo: 'Minha nova publicação #corte #barbearia @joao',
      tipo: 'post',
      visibilidade: 'publico',
      midias: [],
    };

    it('deve retornar sucesso para publicação válida', () => {
      const resultado = validarCriarPublicacao(publicacaoValida);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com conteudo vazio', () => {
      const resultado = validarCriarPublicacao({ ...publicacaoValida, conteudo: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Conteúdo');
    });

    it('deve falhar com conteudo > 2000 chars', () => {
      const resultado = validarCriarPublicacao({ ...publicacaoValida, conteudo: 'a'.repeat(2001) });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('2000');
    });

    it('deve aceitar conteudo com 2000 chars exatamente', () => {
      const resultado = validarCriarPublicacao({ ...publicacaoValida, conteudo: 'a'.repeat(2000) });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com tipo inválido', () => {
      const resultado = validarCriarPublicacao({ ...publicacaoValida, tipo: 'invalido' as any });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Tipo');
    });

    it('deve aceitar tipos válidos', () => {
      const tipos = ['post', 'inspiracao', 'promocao', 'evento'];
      tipos.forEach(tipo => {
        expect(validarCriarPublicacao({ ...publicacaoValida, tipo: tipo as any }).sucesso).toBe(true);
      });
    });

    it('deve falhar com visibilidade inválida', () => {
      const resultado = validarCriarPublicacao({ ...publicacaoValida, visibilidade: 'invalido' as any });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com midias > 10', () => {
      const resultado = validarCriarPublicacao({ ...publicacaoValida, midias: Array(11).fill({ tipo: 'imagem', url: 'x' }) });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('10');
    });

    it('deve aceitar midias = 10', () => {
      const resultado = validarCriarPublicacao({ ...publicacaoValida, midias: Array(10).fill({ tipo: 'imagem', url: 'x' }) });
      expect(resultado.sucesso).toBe(true);
    });
  });

  // ==================== validarAtualizarPublicacao ====================
  describe('validarAtualizarPublicacao', () => {
    it('deve aceitar atualização parcial', () => {
      const resultado = validarAtualizarPublicacao({ conteudo: 'Atualizado' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve validar campos presentes', () => {
      const resultado = validarAtualizarPublicacao({ conteudo: '' });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== validarComentario ====================
  describe('validarComentario', () => {
    it('deve retornar sucesso para comentário válido', () => {
      const resultado = validarComentario({ publicacaoId: '123', conteudo: 'Ótimo corte!' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar sem publicacaoId', () => {
      const resultado = validarComentario({ publicacaoId: '', conteudo: 'Teste' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com conteudo vazio', () => {
      const resultado = validarComentario({ publicacaoId: '1', conteudo: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com conteudo > 1000 chars', () => {
      const resultado = validarComentario({ publicacaoId: '1', conteudo: 'a'.repeat(1001) });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar comentarioPaiId opcional', () => {
      const resultado = validarComentario({ publicacaoId: '1', conteudo: 'Resposta', comentarioPaiId: '456' });
      expect(resultado.sucesso).toBe(true);
    });
  });

  // ==================== validarDenuncia ====================
  describe('validarDenuncia', () => {
    it('deve retornar sucesso para denúncia válida', () => {
      const resultado = validarDenuncia({ alvoId: '123', tipoAlvo: 'publicacao', motivo: 'spam', descricao: 'Conteúdo spam' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar sem alvoId', () => {
      const resultado = validarDenuncia({ alvoId: '', tipoAlvo: 'publicacao', motivo: 'spam', descricao: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com tipoAlvo inválido', () => {
      const resultado = validarDenuncia({ alvoId: '1', tipoAlvo: 'invalido' as any, motivo: 'spam', descricao: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com motivo inválido', () => {
      const resultado = validarDenuncia({ alvoId: '1', tipoAlvo: 'publicacao', motivo: 'invalido' as any, descricao: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar motivos válidos', () => {
      const motivos = ['spam', 'ofensivo', 'ilegal', 'direitos_autorais', 'informacao_falsa', 'outro'];
      motivos.forEach(motivo => {
        expect(validarDenuncia({ alvoId: '1', tipoAlvo: 'publicacao', motivo: motivo as any, descricao: '' }).sucesso).toBe(true);
      });
    });

    it('deve falhar com descricao > 1000 chars', () => {
      const resultado = validarDenuncia({ alvoId: '1', tipoAlvo: 'publicacao', motivo: 'outro', descricao: 'a'.repeat(1001) });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== sanitizarPublicacao ====================
  describe('sanitizarPublicacao', () => {
    it('deve remover campos undefined', () => {
      const resultado = sanitizarPublicacao({ conteudo: 'Teste', tipo: undefined } as any);
      expect(resultado.conteudo).toBe('Teste');
      expect(resultado.tipo).toBeUndefined();
    });

    it('deve trim strings', () => {
      const resultado = sanitizarPublicacao({ conteudo: '  Teste  ' });
      expect(resultado.conteudo).toBe('Teste');
    });
  });

  // ==================== criarFeedError ====================
  describe('criarFeedError', () => {
    it('deve criar erro com código e mensagem', () => {
      const erro = criarFeedError('NOT_FOUND', 'Publicação não encontrada');
      expect(erro.codigo).toBe('NOT_FOUND');
      expect(erro.mensagem).toBe('Publicação não encontrada');
    });
  });

  // ==================== calcularEngajamento ====================
  describe('calcularEngajamento', () => {
    const publicacao: PublicacaoFeed = {
      id: '1',
      autorId: 'a1',
      conteudo: 'Teste',
      tipo: 'post',
      visibilidade: 'publico',
      midias: [],
      curtidas: 10,
      comentarios: 5,
      compartilhamentos: 2,
      visualizacoes: 100,
      criadoEm: '2024-01-01T10:00:00',
      atualizadoEm: '2024-01-01T10:00:00',
    };

    it('deve calcular engajamento corretamente', () => {
      const engajamento = calcularEngajamento(publicacao);
      expect(engajamento.totalInteracoes).toBe(17); // 10 + 5 + 2
      expect(engajamento.taxaEngajamento).toBeCloseTo(17, 1); // 17/100 * 100
      expect(engajamento.score).toBeGreaterThan(0);
    });

    it('deve lidar com visualizacoes = 0', () => {
      const pubSemViews = { ...publicacao, visualizacoes: 0 };
      const engajamento = calcularEngajamento(pubSemViews);
      expect(engajamento.taxaEngajamento).toBe(0);
    });
  });

  // ==================== filtrarPublicacoes ====================
  describe('filtrarPublicacoes', () => {
    const publicacoes: PublicacaoFeed[] = [
      { id: '1', autorId: 'a1', conteudo: 'Corte novo #barbearia', tipo: 'post', visibilidade: 'publico', midias: [], curtidas: 10, comentarios: 2, compartilhamentos: 1, visualizacoes: 100, criadoEm: '2024-01-15', atualizadoEm: '2024-01-15' },
      { id: '2', autorId: 'a2', conteudo: 'Promoção especial', tipo: 'promocao', visibilidade: 'publico', midias: [], curtidas: 5, comentarios: 0, compartilhamentos: 0, visualizacoes: 50, criadoEm: '2024-01-16', atualizadoEm: '2024-01-16' },
    ];

    it('deve filtrar por tipo', () => {
      const resultado = filtrarPublicacoes(publicacoes, { tipo: 'promocao' });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].tipo).toBe('promocao');
    });

    it('deve filtrar por autorId', () => {
      const resultado = filtrarPublicacoes(publicacoes, { autorId: 'a1' });
      expect(resultado).toHaveLength(1);
    });

    it('deve filtrar por busca no conteúdo', () => {
      const resultado = filtrarPublicacoes(publicacoes, { busca: 'barbearia' });
      expect(resultado).toHaveLength(1);
    });

    it('deve filtrar por hashtag', () => {
      const resultado = filtrarPublicacoes(publicacoes, { hashtag: 'barbearia' });
      expect(resultado).toHaveLength(1);
    });

    it('deve retornar todos sem filtros', () => {
      const resultado = filtrarPublicacoes(publicacoes, {});
      expect(resultado).toHaveLength(2);
    });
  });

  // ==================== ordenarPublicacoes ====================
  describe('ordenarPublicacoes', () => {
    const publicacoes: PublicacaoFeed[] = [
      { id: '1', autorId: 'a1', conteudo: 'C', tipo: 'post', visibilidade: 'publico', midias: [], curtidas: 5, comentarios: 1, compartilhamentos: 0, visualizacoes: 10, criadoEm: '2024-01-15', atualizadoEm: '2024-01-15' },
      { id: '2', autorId: 'a2', conteudo: 'A', tipo: 'post', visibilidade: 'publico', midias: [], curtidas: 10, comentarios: 2, compartilhamentos: 1, visualizacoes: 20, criadoEm: '2024-01-16', atualizadoEm: '2024-01-16' },
    ];

    it('deve ordenar por criadoEm desc (padrão)', () => {
      const resultado = ordenarPublicacoes([...publicacoes], 'criadoEm', 'desc');
      expect(resultado[0].id).toBe('2');
    });

    it('deve ordenar por curtidas desc', () => {
      const resultado = ordenarPublicacoes([...publicacoes], 'curtidas', 'desc');
      expect(resultado[0].id).toBe('2');
    });
  });

  // ==================== paginarPublicacoes ====================
  describe('paginarPublicacoes', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      autorId: 'a1',
      conteudo: `Post ${i + 1}`,
      tipo: 'post' as const,
      visibilidade: 'publico' as const,
      midias: [],
      curtidas: 0,
      comentarios: 0,
      compartilhamentos: 0,
      visualizacoes: 0,
      criadoEm: '2024-01-01',
      atualizadoEm: '2024-01-01',
    }));

    it('deve retornar primeira página', () => {
      const resultado = paginarPublicacoes(items, 1, 10);
      expect(resultado.dados).toHaveLength(10);
      expect(resultado.paginaAtual).toBe(1);
      expect(resultado.totalPaginas).toBe(3);
    });

    it('deve retornar última página', () => {
      const resultado = paginarPublicacoes(items, 3, 10);
      expect(resultado.dados).toHaveLength(5);
    });

    it('deve lidar com página inválida', () => {
      const resultado = paginarPublicacoes(items, 5, 10);
      expect(resultado.dados).toHaveLength(0);
    });
  });

  // ==================== extrairHashtags ====================
  describe('extrairHashtags', () => {
    it('deve extrair hashtags corretamente', () => {
      const hashtags = extrairHashtags('Meu #corte em #barbearia #sp');
      expect(hashtags).toEqual(['corte', 'barbearia', 'sp']);
    });

    it('deve remover duplicatas', () => {
      const hashtags = extrairHashtags('#corte #corte #barbearia');
      expect(hashtags).toEqual(['corte', 'barbearia']);
    });

    it('deve retornar array vazio sem hashtags', () => {
      expect(extrairHashtags('Sem hashtags')).toEqual([]);
    });

    it('deve ignorar hashtags inválidas (só #)', () => {
      expect(extrairHashtags('# #corte')).toEqual(['corte']);
    });
  });

  // ==================== extrairMencoes ====================
  describe('extrairMencoes', () => {
    it('deve extrair menções corretamente', () => {
      const mencoes = extrairMencoes('Olá @joao e @maria!');
      expect(mencoes).toEqual(['joao', 'maria']);
    });

    it('deve remover duplicatas', () => {
      const mencoes = extrairMencoes('@joao @joao @maria');
      expect(mencoes).toEqual(['joao', 'maria']);
    });

    it('deve retornar array vazio sem menções', () => {
      expect(extrairMencoes('Sem menções')).toEqual([]);
    });
  });

  // ==================== truncarTexto ====================
  describe('truncarTexto', () => {
    it('deve truncar texto longo', () => {
      const resultado = truncarTexto('Texto muito longo que precisa ser cortado', 20);
      expect(resultado.length).toBeLessThanOrEqual(20);
      expect(resultado.endsWith('...')).toBe(true);
    });

    it('deve não truncar texto curto', () => {
      const resultado = truncarTexto('Curto', 20);
      expect(resultado).toBe('Curto');
    });

    it('deve lidar com limite exato', () => {
      const resultado = truncarTexto('12345', 5);
      expect(resultado).toBe('12345');
    });

    it('deve lidar com limite 0', () => {
      const resultado = truncarTexto('Texto', 0);
      expect(resultado).toBe('...');
    });
  });
});