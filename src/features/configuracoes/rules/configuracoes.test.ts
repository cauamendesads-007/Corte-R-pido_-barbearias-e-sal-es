/**
 * Testes de fronteira para regras de configurações.
 * Cobertura 100% - boundary values, erros, casos edge.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  validarConfiguracoesConta,
  validarConfiguracoesAparencia,
  validarConfiguracoesNotificacoes,
  validarConfiguracoesPrivacidade,
  validarConfiguracoesSeguranca,
  validarSenha,
  validarExclusaoConta,
  sanitizarConfiguracoesConta,
  sanitizarConfiguracoesAparencia,
  sanitizarConfiguracoesNotificacoes,
  sanitizarConfiguracoesPrivacidade,
  sanitizarConfiguracoesSeguranca,
  obterLabelTema,
  obterLabelFonteTamanho,
  obterLabelVisibilidadePerfil,
  obterLabelQuemPodeMensagens,
} from './index';
import type {
  ConfiguracoesConta,
  ConfiguracoesAparencia,
  ConfiguracoesNotificacoes,
  ConfiguracoesPrivacidade,
  ConfiguracoesSeguranca,
} from '../types';

describe('configuracoes rules - boundary tests', () => {
  // ==================== validarConfiguracoesConta ====================
  describe('validarConfiguracoesConta', () => {
    const contaValida: Partial<ConfiguracoesConta> = {
      nome: 'João Silva',
      email: 'joao@email.com',
      telefone: '(11) 99999-9999',
      cpf: '123.456.789-00',
      dataNascimento: '1990-01-01',
      genero: 'masculino',
    };

    it('deve retornar sucesso para dados válidos', () => {
      const resultado = validarConfiguracoesConta(contaValida);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com nome vazio', () => {
      const resultado = validarConfiguracoesConta({ ...contaValida, nome: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Nome');
    });

    it('deve falhar com nome muito longo (>100)', () => {
      const resultado = validarConfiguracoesConta({ ...contaValida, nome: 'a'.repeat(101) });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Nome');
    });

    it('deve falhar com email inválido', () => {
      const resultado = validarConfiguracoesConta({ ...contaValida, email: 'invalido' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('E-mail');
    });

    it('deve falhar com email vazio', () => {
      const resultado = validarConfiguracoesConta({ ...contaValida, email: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('E-mail');
    });

    it('deve falhar com telefone inválido', () => {
      const resultado = validarConfiguracoesConta({ ...contaValida, telefone: '123' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Telefone');
    });

    it('deve falhar com CPF inválido', () => {
      const resultado = validarConfiguracoesConta({ ...contaValida, cpf: '123' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('CPF');
    });

    it('deve falhar com data de nascimento futura', () => {
      const futuro = new Date();
      futuro.setFullYear(futuro.getFullYear() + 1);
      const resultado = validarConfiguracoesConta({ ...contaValida, dataNascimento: futuro.toISOString().split('T')[0] });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Data de nascimento');
    });

    it('deve falhar com idade menor que 13 anos', () => {
      const recente = new Date();
      recente.setFullYear(recente.getFullYear() - 10);
      const resultado = validarConfiguracoesConta({ ...contaValida, dataNascimento: recente.toISOString().split('T')[0] });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('13 anos');
    });

    it('deve falhar com gênero inválido', () => {
      const resultado = validarConfiguracoesConta({ ...contaValida, genero: 'invalido' as any });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Gênero');
    });

    it('deve aceitar dados parciais (apenas nome)', () => {
      const resultado = validarConfiguracoesConta({ nome: 'João' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve aceitar objeto vazio', () => {
      const resultado = validarConfiguracoesConta({});
      expect(resultado.sucesso).toBe(true);
    });
  });

  // ==================== validarConfiguracoesAparencia ====================
  describe('validarConfiguracoesAparencia', () => {
    it('deve retornar sucesso para dados válidos', () => {
      const resultado = validarConfiguracoesAparencia({
        tema: 'escuro',
        fonteTamanho: 'medio',
        animacoes: true,
        altoContraste: false,
        reduzirMovimento: false,
        idioma: 'pt-BR',
        fusoHorario: 'America/Sao_Paulo',
        formatoHora: '24h',
        primeiraDiaSemana: 1,
      });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com tema inválido', () => {
      const resultado = validarConfiguracoesAparencia({ tema: 'invalido' as any });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Tema');
    });

    it('deve falhar com fonteTamanho inválido', () => {
      const resultado = validarConfiguracoesAparencia({ fonteTamanho: 'invalido' as any });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Tamanho da fonte');
    });

    it('deve falhar com idioma inválido', () => {
      const resultado = validarConfiguracoesAparencia({ idioma: 'invalido' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Idioma');
    });

    it('deve falhar com formatoHora inválido', () => {
      const resultado = validarConfiguracoesAparencia({ formatoHora: 'invalido' as any });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Formato de hora');
    });

    it('deve falhar com primeiraDiaSemana inválido (fora do range 0-6)', () => {
      const resultado = validarConfiguracoesAparencia({ primeiraDiaSemana: 7 as any });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Primeiro dia da semana');
    });

    it('deve aceitar fusoHorario vazio', () => {
      const resultado = validarConfiguracoesAparencia({ fusoHorario: '' });
      expect(resultado.sucesso).toBe(true);
    });
  });

  // ==================== validarConfiguracoesNotificacoes ====================
  describe('validarConfiguracoesNotificacoes', () => {
    it('deve retornar sucesso para dados válidos', () => {
      const resultado = validarConfiguracoesNotificacoes({
        pushAtivo: true,
        pushAgendamentos: true,
        pushLembretes: true,
        pushPromocoes: false,
        pushAvaliacoes: true,
        pushMensagens: true,
        pushSistema: true,
        emailAtivo: true,
        emailAgendamentos: true,
        emailLembretes: true,
        emailPromocoes: false,
        emailAvaliacoes: true,
        emailMensagens: true,
        emailRelatorios: false,
        emailSeguranca: true,
        smsAtivo: false,
        smsAgendamentos: false,
        smsLembretes: false,
        smsCodigos: true,
        naoPerturbarInicio: '22:00',
        naoPerturbarFim: '08:00',
        fusoHorarioNotificacoes: 'America/Sao_Paulo',
      });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com formato de hora inválido para naoPerturbarInicio', () => {
      const resultado = validarConfiguracoesNotificacoes({ naoPerturbarInicio: '25:00' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Horário');
    });

    it('deve falhar com formato de hora inválido para naoPerturbarFim', () => {
      const resultado = validarConfiguracoesNotificacoes({ naoPerturbarFim: '08:60' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Horário');
    });

    it('deve aceitar naoPerturbarInicio/Fim vazios', () => {
      const resultado = validarConfiguracoesNotificacoes({ naoPerturbarInicio: '', naoPerturbarFim: '' });
      expect(resultado.sucesso).toBe(true);
    });
  });

  // ==================== validarConfiguracoesPrivacidade ====================
  describe('validarConfiguracoesPrivacidade', () => {
    it('deve retornar sucesso para dados válidos', () => {
      const resultado = validarConfiguracoesPrivacidade({
        visibilidadePerfil: 'publico',
        mostrarNome: true,
        mostrarFoto: true,
        mostrarEspecialidades: true,
        mostrarAvaliacoes: true,
        mostrarHorarioFuncionamento: true,
        mostrarLocalizacao: true,
        quemPodeMensagens: 'todos',
        receberMensagensEstabelecimentos: true,
        receberNewsletter: false,
        quemPodeVerAvaliacoes: 'todos',
        permitirAvaliacoesAnonimas: false,
        compartilharDadosAnalytics: true,
        compartilharDadosParceiros: false,
        personalizarAnuncios: false,
        permitirRastreamento: false,
      });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com visibilidadePerfil inválido', () => {
      const resultado = validarConfiguracoesPrivacidade({ visibilidadePerfil: 'invalido' as any });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Visibilidade');
    });

    it('deve falhar com quemPodeMensagens inválido', () => {
      const resultado = validarConfiguracoesPrivacidade({ quemPodeMensagens: 'invalido' as any });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Mensagens');
    });

    it('deve falhar com quemPodeVerAvaliacoes inválido', () => {
      const resultado = validarConfiguracoesPrivacidade({ quemPodeVerAvaliacoes: 'invalido' as any });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Avaliações');
    });
  });

  // ==================== validarConfiguracoesSeguranca ====================
  describe('validarConfiguracoesSeguranca', () => {
    it('deve retornar sucesso para dados válidos', () => {
      const resultado = validarConfiguracoesSeguranca({
        duasFatoresAtivo: false,
        metodo2FA: null,
        ultimaAtualizacao2FA: null,
        sessoesAtivas: [],
        dispositivosConfiaveis: [],
        logSeguranca: [],
        ultimaAlteracaoSenha: new Date().toISOString(),
        historicoSenhas: [],
      });
      expect(resultado.sucesso).toBe(true);
    });
  });

  // ==================== validarSenha ====================
  describe('validarSenha', () => {
    it('deve retornar sucesso para senha forte', () => {
      const resultado = validarSenha('SenhaForte123!');
      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.forca).toBeGreaterThanOrEqual(3);
    });

    it('deve falhar com senha muito curta (<8)', () => {
      const resultado = validarSenha('Curta1!');
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('8 caracteres');
    });

    it('deve falhar com senha sem maiúscula', () => {
      const resultado = validarSenha('senhafraca123!');
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('maiúscula');
    });

    it('deve falhar com senha sem minúscula', () => {
      const resultado = validarSenha('SENHAFORTE123!');
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('minúscula');
    });

    it('deve falhar com senha sem número', () => {
      const resultado = validarSenha('SenhaFraca!');
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('número');
    });

    it('deve falhar com senha sem caractere especial', () => {
      const resultado = validarSenha('SenhaForte123');
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('especial');
    });

    it('deve falhar com senha vazia', () => {
      const resultado = validarSenha('');
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('obrigatória');
    });

    it('deve aceitar senha com 8 caracteres exatamente', () => {
      const resultado = validarSenha('S3nh@123');
      expect(resultado.sucesso).toBe(true);
    });

    it('deve aceitar senha com 128 caracteres (limite máximo)', () => {
      const senhaLonga = 'S' + 'a'.repeat(125) + '1!';
      const resultado = validarSenha(senhaLonga);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com senha > 128 caracteres', () => {
      const senhaLonga = 'S' + 'a'.repeat(126) + '1!';
      const resultado = validarSenha(senhaLonga);
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('128');
    });
  });

  // ==================== validarExclusaoConta ====================
  describe('validarExclusaoConta', () => {
    it('deve retornar sucesso para confirmação correta', () => {
      const resultado = validarExclusaoConta('EXCLUIR', 'senha123');
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com confirmação incorreta (case sensitive)', () => {
      const resultado = validarExclusaoConta('excluir', 'senha123');
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('EXCLUIR');
    });

    it('deve falhar com confirmação vazia', () => {
      const resultado = validarExclusaoConta('', 'senha123');
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('confirmação');
    });

    it('deve falhar com senha vazia', () => {
      const resultado = validarExclusaoConta('EXCLUIR', '');
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('senha');
    });

    it('deve falhar com senha muito curta', () => {
      const resultado = validarExclusaoConta('EXCLUIR', '123');
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('senha');
    });
  });

  // ==================== sanitizar functions ====================
  describe('sanitizarConfiguracoesConta', () => {
    it('deve remover campos undefined/null', () => {
      const entrada = { nome: 'João', email: undefined, telefone: null, cpf: '123' };
      const resultado = sanitizarConfiguracoesConta(entrada as any);
      expect(resultado.nome).toBe('João');
      expect(resultado.email).toBeUndefined();
      expect(resultado.telefone).toBeUndefined();
      expect(resultado.cpf).toBe('123');
    });

    it('deve trim strings', () => {
      const resultado = sanitizarConfiguracoesConta({ nome: '  João  ', email: '  joao@email.com  ' });
      expect(resultado.nome).toBe('João');
      expect(resultado.email).toBe('joao@email.com');
    });
  });

  describe('sanitizarConfiguracoesAparencia', () => {
    it('deve remover campos undefined', () => {
      const resultado = sanitizarConfiguracoesAparencia({ tema: 'escuro', fonteTamanho: undefined } as any);
      expect(resultado.tema).toBe('escuro');
      expect(resultado.fonteTamanho).toBeUndefined();
    });
  });

  describe('sanitizarConfiguracoesNotificacoes', () => {
    it('deve remover campos undefined', () => {
      const resultado = sanitizarConfiguracoesNotificacoes({ pushAtivo: true, pushAgendamentos: undefined } as any);
      expect(resultado.pushAtivo).toBe(true);
      expect(resultado.pushAgendamentos).toBeUndefined();
    });
  });

  describe('sanitizarConfiguracoesPrivacidade', () => {
    it('deve remover campos undefined', () => {
      const resultado = sanitizarConfiguracoesPrivacidade({ visibilidadePerfil: 'publico', mostrarNome: undefined } as any);
      expect(resultado.visibilidadePerfil).toBe('publico');
      expect(resultado.mostrarNome).toBeUndefined();
    });
  });

  describe('sanitizarConfiguracoesSeguranca', () => {
    it('deve remover campos undefined', () => {
      const resultado = sanitizarConfiguracoesSeguranca({ duasFatoresAtivo: true, metodo2FA: undefined } as any);
      expect(resultado.duasFatoresAtivo).toBe(true);
      expect(resultado.metodo2FA).toBeUndefined();
    });
  });

  // ==================== Label getters ====================
  describe('obterLabelTema', () => {
    it('deve retornar labels corretos', () => {
      expect(obterLabelTema('sistema')).toBe('Sistema');
      expect(obterLabelTema('claro')).toBe('Claro');
      expect(obterLabelTema('escuro')).toBe('Escuro');
    });

    it('deve retornar valor para tema desconhecido', () => {
      expect(obterLabelTema('desconhecido' as any)).toBe('desconhecido');
    });
  });

  describe('obterLabelFonteTamanho', () => {
    it('deve retornar labels corretos', () => {
      expect(obterLabelFonteTamanho('pequeno')).toBe('Pequeno');
      expect(obterLabelFonteTamanho('medio')).toBe('Médio');
      expect(obterLabelFonteTamanho('grande')).toBe('Grande');
    });
  });

  describe('obterLabelVisibilidadePerfil', () => {
    it('deve retornar labels corretos', () => {
      expect(obterLabelVisibilidadePerfil('publico')).toBe('Público');
      expect(obterLabelVisibilidadePerfil('clientes')).toBe('Apenas clientes');
      expect(obterLabelVisibilidadePerfil('privado')).toBe('Privado');
    });
  });

  describe('obterLabelQuemPodeMensagens', () => {
    it('deve retornar labels corretos', () => {
      expect(obterLabelQuemPodeMensagens('todos')).toBe('Todos');
      expect(obterLabelQuemPodeMensagens('clientes')).toBe('Apenas clientes');
      expect(obterLabelQuemPodeMensagens('ninguem')).toBe('Ninguém');
    });
  });
});