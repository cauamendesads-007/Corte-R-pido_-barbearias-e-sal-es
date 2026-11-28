/**
 * Testes de fronteira para regras de onboarding.
 * Cobertura 100% - boundary values, erros, casos edge.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validarEtapa,
  validarCampo,
  validarTelefone,
  validarCPF,
  formatarTelefone,
  formatarCPF,
  formatarCEP,
  obterIndiceEtapa,
  obterProximaEtapa,
  obterEtapaAnterior,
  podeAvancar,
  calcularProgresso,
  salvarRascunho,
  carregarRascunho,
  limparRascunho,
  sanitizarDadosOnboarding,
  criarOnboardingError,
} from './index';
import type { OnboardingEtapa, OnboardingDados, OnboardingRascunho } from '../types';

describe('onboarding rules - boundary tests', () => {
  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'sessionStorage', {
      writable: true,
      value: sessionStorageMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== validarEtapa ====================
  describe('validarEtapa', () => {
    const dadosBase: OnboardingDados = {
      tipoUsuario: 'cliente',
      nome: 'João Silva',
      email: 'joao@email.com',
      telefone: '(11) 99999-9999',
      cpf: '123.456.789-09',
      dataNascimento: '1990-01-01',
      genero: 'masculino',
      senha: 'SenhaForte123!',
      confirmarSenha: 'SenhaForte123!',
      cep: '01310-100',
      logradouro: 'Av. Paulista',
      numero: '1000',
      complemento: '',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP',
      notificacoesPush: true,
      notificacoesEmail: true,
      notificacoesSMS: false,
      tema: 'sistema',
    };

    it('deve validar etapa boas-vindas (sempre válida)', () => {
      const resultado = validarEtapa('boas-vindas', {});
      expect(resultado.sucesso).toBe(true);
    });

    it('deve validar etapa tipo-usuario', () => {
      const resultado = validarEtapa('tipo-usuario', { tipoUsuario: 'cliente' });
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar etapa tipo-usuario sem seleção', () => {
      const resultado = validarEtapa('tipo-usuario', { tipoUsuario: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('tipo');
    });

    it('deve validar etapa dados-pessoais completa', () => {
      const resultado = validarEtapa('dados-pessoais', dadosBase);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar etapa dados-pessoais com nome vazio', () => {
      const resultado = validarEtapa('dados-pessoais', { ...dadosBase, nome: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Nome');
    });

    it('deve falhar etapa dados-pessoais com email inválido', () => {
      const resultado = validarEtapa('dados-pessoais', { ...dadosBase, email: 'invalido' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('E-mail');
    });

    it('deve falhar etapa dados-pessoais com telefone inválido', () => {
      const resultado = validarEtapa('dados-pessoais', { ...dadosBase, telefone: '123' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Telefone');
    });

    it('deve falhar etapa dados-pessoais com CPF inválido', () => {
      const resultado = validarEtapa('dados-pessoais', { ...dadosBase, cpf: '123' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('CPF');
    });

    it('deve falhar etapa dados-pessoais com senha fraca', () => {
      const resultado = validarEtapa('dados-pessoais', { ...dadosBase, senha: '123', confirmarSenha: '123' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar etapa dados-pessoais com senhas diferentes', () => {
      const resultado = validarEtapa('dados-pessoais', { ...dadosBase, senha: 'Senha123!', confirmarSenha: 'Outra123!' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('coincidem');
    });

    it('deve validar etapa endereco completa', () => {
      const resultado = validarEtapa('endereco', dadosBase);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar etapa endereco com CEP inválido', () => {
      const resultado = validarEtapa('endereco', { ...dadosBase, cep: '123' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('CEP');
    });

    it('deve validar etapa preferencias', () => {
      const resultado = validarEtapa('preferencias', dadosBase);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve validar etapa conclusao', () => {
      const resultado = validarEtapa('conclusao', {});
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar para etapa desconhecida', () => {
      const resultado = validarEtapa('desconhecida' as any, {});
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Etapa');
    });
  });

  // ==================== validarCampo ====================
  describe('validarCampo', () => {
    it('deve validar nome', () => {
      expect(validarCampo('nome', 'João').sucesso).toBe(true);
      expect(validarCampo('nome', '').sucesso).toBe(false);
      expect(validarCampo('nome', 'a'.repeat(101)).sucesso).toBe(false);
    });

    it('deve validar email', () => {
      expect(validarCampo('email', 'test@test.com').sucesso).toBe(true);
      expect(validarCampo('email', 'invalido').sucesso).toBe(false);
      expect(validarCampo('email', '').sucesso).toBe(false);
    });

    it('deve validar telefone', () => {
      expect(validarCampo('telefone', '(11) 99999-9999').sucesso).toBe(true);
      expect(validarCampo('telefone', '123').sucesso).toBe(false);
    });

    it('deve validar cpf', () => {
      expect(validarCampo('cpf', '123.456.789-09').sucesso).toBe(true);
      expect(validarCampo('cpf', '123').sucesso).toBe(false);
    });

    it('deve validar senha', () => {
      expect(validarCampo('senha', 'SenhaForte123!').sucesso).toBe(true);
      expect(validarCampo('senha', 'fraca').sucesso).toBe(false);
    });

    it('deve validar cep', () => {
      expect(validarCampo('cep', '01310-100').sucesso).toBe(true);
      expect(validarCampo('cep', '123').sucesso).toBe(false);
    });
  });

  // ==================== validarTelefone ====================
  describe('validarTelefone', () => {
    it('deve aceitar celular válido', () => {
      expect(validarTelefone('(11) 99999-9999')).toBe(true);
      expect(validarTelefone('11999999999')).toBe(true);
    });

    it('deve aceitar fixo válido', () => {
      expect(validarTelefone('(11) 3333-4444')).toBe(true);
    });

    it('deve rejeitar inválidos', () => {
      expect(validarTelefone('123')).toBe(false);
      expect(validarTelefone('(11) 89999-9999')).toBe(false);
      expect(validarTelefone('')).toBe(false);
    });
  });

  // ==================== validarCPF ====================
  describe('validarCPF', () => {
    it('deve aceitar CPF válido', () => {
      expect(validarCPF('123.456.789-09')).toBe(true);
      expect(validarCPF('12345678909')).toBe(true);
    });

    it('deve rejeitar CPF inválido', () => {
      expect(validarCPF('123.456.789-00')).toBe(false);
      expect(validarCPF('111.111.111-11')).toBe(false);
      expect(validarCPF('123')).toBe(false);
      expect(validarCPF('')).toBe(false);
    });
  });

  // ==================== formatarTelefone ====================
  describe('formatarTelefone', () => {
    it('deve formatar celular', () => {
      expect(formatarTelefone('11999999999')).toBe('(11) 99999-9999');
    });

    it('deve formatar fixo', () => {
      expect(formatarTelefone('1133334444')).toBe('(11) 3333-4444');
    });

    it('deve retornar vazio para vazio', () => {
      expect(formatarTelefone('')).toBe('');
    });
  });

  // ==================== formatarCPF ====================
  describe('formatarCPF', () => {
    it('deve formatar CPF', () => {
      expect(formatarCPF('12345678909')).toBe('123.456.789-09');
    });

    it('deve retornar vazio para vazio', () => {
      expect(formatarCPF('')).toBe('');
    });
  });

  // ==================== formatarCEP ====================
  describe('formatarCEP', () => {
    it('deve formatar CEP', () => {
      expect(formatarCEP('01310100')).toBe('01310-100');
    });

    it('deve retornar vazio para vazio', () => {
      expect(formatarCEP('')).toBe('');
    });
  });

  // ==================== Navigation functions ====================
  const ETAPAS: OnboardingEtapa[] = [
    'boas-vindas', 'tipo-usuario', 'dados-pessoais', 'endereco', 'preferencias', 'conclusao'
  ];

  describe('obterIndiceEtapa', () => {
    it('deve retornar índice correto', () => {
      expect(obterIndiceEtapa('boas-vindas', ETAPAS)).toBe(0);
      expect(obterIndiceEtapa('tipo-usuario', ETAPAS)).toBe(1);
      expect(obterIndiceEtapa('conclusao', ETAPAS)).toBe(5);
    });

    it('deve retornar -1 para etapa inexistente', () => {
      expect(obterIndiceEtapa('inexistente' as any, ETAPAS)).toBe(-1);
    });
  });

  describe('obterProximaEtapa', () => {
    it('deve retornar próxima etapa', () => {
      expect(obterProximaEtapa('boas-vindas', ETAPAS)).toBe('tipo-usuario');
      expect(obterProximaEtapa('preferencias', ETAPAS)).toBe('conclusao');
    });

    it('deve retornar null na última etapa', () => {
      expect(obterProximaEtapa('conclusao', ETAPAS)).toBeNull();
    });
  });

  describe('obterEtapaAnterior', () => {
    it('deve retornar etapa anterior', () => {
      expect(obterEtapaAnterior('tipo-usuario', ETAPAS)).toBe('boas-vindas');
      expect(obterEtapaAnterior('conclusao', ETAPAS)).toBe('preferencias');
    });

    it('deve retornar null na primeira etapa', () => {
      expect(obterEtapaAnterior('boas-vindas', ETAPAS)).toBeNull();
    });
  });

  // ==================== podeAvancar ====================
  describe('podeAvancar', () => {
    it('deve retornar true para etapa válida', () => {
      expect(podeAvancar('boas-vindas', {})).toBe(true);
      expect(podeAvancar('tipo-usuario', { tipoUsuario: 'cliente' })).toBe(true);
    });

    it('deve retornar false para etapa inválida', () => {
      expect(podeAvancar('tipo-usuario', { tipoUsuario: '' })).toBe(false);
      expect(podeAvancar('dados-pessoais', { nome: '' })).toBe(false);
    });
  });

  // ==================== calcularProgresso ====================
  describe('calcularProgresso', () => {
    it('deve calcular progresso corretamente', () => {
      expect(calcularProgresso('boas-vindas', ETAPAS)).toBe(0); // 0/6 = 0%
      expect(calcularProgresso('tipo-usuario', ETAPAS)).toBeCloseTo(16.67, 1); // 1/6
      expect(calcularProgresso('conclusao', ETAPAS)).toBe(100); // 6/6 = 100%
    });
  });

  // ==================== Rascunho (sessionStorage) ====================
  describe('salvarRascunho', () => {
    it('deve salvar rascunho no sessionStorage', () => {
      const rascunho: OnboardingRascunho = {
        etapaAtual: 'dados-pessoais',
        dados: { nome: 'João' },
        timestamp: Date.now(),
        versao: 1,
      };
      salvarRascunho(rascunho);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'onboarding_rascunho',
        expect.stringContaining('dados-pessoais')
      );
    });
  });

  describe('carregarRascunho', () => {
    it('deve retornar null se não houver rascunho', () => {
      sessionStorageMock.getItem.mockReturnValue(null);
      const resultado = carregarRascunho();
      expect(resultado).toBeNull();
    });

    it('deve retornar rascunho válido', () => {
      const rascunho: OnboardingRascunho = {
        etapaAtual: 'dados-pessoais',
        dados: { nome: 'João' },
        timestamp: Date.now(),
        versao: 1,
      };
      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(rascunho));
      const resultado = carregarRascunho();
      expect(resultado).toEqual(rascunho);
    });

    it('deve retornar null se rascunho expirado (>24h)', () => {
      const rascunho: OnboardingRascunho = {
        etapaAtual: 'dados-pessoais',
        dados: { nome: 'João' },
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 horas atrás
        versao: 1,
      };
      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(rascunho));
      const resultado = carregarRascunho();
      expect(resultado).toBeNull();
    });

    it('deve retornar null se JSON inválido', () => {
      sessionStorageMock.getItem.mockReturnValue('invalid json');
      const resultado = carregarRascunho();
      expect(resultado).toBeNull();
    });
  });

  describe('limparRascunho', () => {
    it('deve remover rascunho do sessionStorage', () => {
      limparRascunho();
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('onboarding_rascunho');
    });
  });

  // ==================== sanitizarDadosOnboarding ====================
  describe('sanitizarDadosOnboarding', () => {
    it('deve remover campos undefined/null', () => {
      const resultado = sanitizarDadosOnboarding({ nome: 'João', email: undefined, telefone: null } as any);
      expect(resultado.nome).toBe('João');
      expect(resultado.email).toBeUndefined();
      expect(resultado.telefone).toBeUndefined();
    });

    it('deve trim strings', () => {
      const resultado = sanitizarDadosOnboarding({ nome: '  João  ', email: '  joao@email.com  ' });
      expect(resultado.nome).toBe('João');
      expect(resultado.email).toBe('joao@email.com');
    });
  });

  // ==================== criarOnboardingError ====================
  describe('criarOnboardingError', () => {
    it('deve criar erro com código e mensagem', () => {
      const erro = criarOnboardingError('VALIDATION_ERROR', 'Dados inválidos');
      expect(erro.codigo).toBe('VALIDATION_ERROR');
      expect(erro.mensagem).toBe('Dados inválidos');
    });
  });
});