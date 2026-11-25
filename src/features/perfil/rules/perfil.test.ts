/**
 * Testes de fronteira para regras de perfil.
 * Cobertura 100% - boundary values, erros, casos edge.
 */

import { describe, it, expect } from 'vitest';
import {
  validarAtualizarPerfil,
  validarAlterarSenha,
  validarAvatar,
  validarEndereco,
  validarCartao,
  validarCPF,
  validarTelefone,
  formatarCPF,
  formatarTelefone,
  formatarCEP,
  formatarCartao,
  calcularForcaSenha,
  sanitizarPerfil,
  sanitizarEndereco,
  criarPerfilError,
  perfilCompleto,
  calcularCompletudePerfil,
} from './index';
import type { Perfil, EnderecoUsuario, CartaoSalvo } from '../types';

describe('perfil rules - boundary tests', () => {
  // ==================== validarAtualizarPerfil ====================
  describe('validarAtualizarPerfil', () => {
    const perfilValido: Partial<Perfil> = {
      nome: 'João Silva',
      email: 'joao@email.com',
      telefone: '(11) 99999-9999',
      cpf: '123.456.789-00',
      dataNascimento: '1990-01-01',
      genero: 'masculino',
    };

    it('deve retornar sucesso para dados válidos', () => {
      const resultado = validarAtualizarPerfil(perfilValido);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com nome vazio', () => {
      const resultado = validarAtualizarPerfil({ ...perfilValido, nome: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Nome');
    });

    it('deve falhar com nome > 100 caracteres', () => {
      const resultado = validarAtualizarPerfil({ ...perfilValido, nome: 'a'.repeat(101) });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com email inválido', () => {
      const resultado = validarAtualizarPerfil({ ...perfilValido, email: 'invalido' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('E-mail');
    });

    it('deve falhar com telefone inválido', () => {
      const resultado = validarAtualizarPerfil({ ...perfilValido, telefone: '123' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Telefone');
    });

    it('deve falhar com CPF inválido', () => {
      const resultado = validarAtualizarPerfil({ ...perfilValido, cpf: '123' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('CPF');
    });

    it('deve falhar com data nascimento futura', () => {
      const futuro = new Date();
      futuro.setFullYear(futuro.getFullYear() + 1);
      const resultado = validarAtualizarPerfil({ ...perfilValido, dataNascimento: futuro.toISOString().split('T')[0] });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com idade < 13 anos', () => {
      const recente = new Date();
      recente.setFullYear(recente.getFullYear() - 10);
      const resultado = validarAtualizarPerfil({ ...perfilValido, dataNascimento: recente.toISOString().split('T')[0] });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve aceitar objeto vazio', () => {
      const resultado = validarAtualizarPerfil({});
      expect(resultado.sucesso).toBe(true);
    });
  });

  // ==================== validarAlterarSenha ====================
  describe('validarAlterarSenha', () => {
    it('deve retornar sucesso para senhas válidas e iguais', () => {
      const resultado = validarAlterarSenha('NovaSenha123!', 'NovaSenha123!');
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com senhas diferentes', () => {
      const resultado = validarAlterarSenha('Senha123!', 'Senha456!');
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('coincidem');
    });

    it('deve falhar com nova senha fraca', () => {
      const resultado = validarAlterarSenha('fraca', 'fraca');
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com senha vazia', () => {
      const resultado = validarAlterarSenha('', '');
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== validarAvatar ====================
  describe('validarAvatar', () => {
    it('deve retornar sucesso para arquivo válido (png < 5MB)', () => {
      const file = new File(['test'], 'avatar.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
      const resultado = validarAvatar(file);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve retornar sucesso para jpeg', () => {
      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });
      const resultado = validarAvatar(file);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve retornar sucesso para webp', () => {
      const file = new File(['test'], 'avatar.webp', { type: 'image/webp' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });
      const resultado = validarAvatar(file);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar para arquivo > 5MB', () => {
      const file = new File(['test'], 'avatar.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
      const resultado = validarAvatar(file);
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('5MB');
    });

    it('deve falhar para tipo inválido (gif)', () => {
      const file = new File(['test'], 'avatar.gif', { type: 'image/gif' });
      Object.defineProperty(file, 'size', { value: 1024 });
      const resultado = validarAvatar(file);
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('tipo');
    });

    it('deve falhar para tipo inválido (pdf)', () => {
      const file = new File(['test'], 'avatar.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 });
      const resultado = validarAvatar(file);
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar para arquivo vazio (0 bytes)', () => {
      const file = new File([''], 'avatar.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 0 });
      const resultado = validarAvatar(file);
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== validarEndereco ====================
  describe('validarEndereco', () => {
    const enderecoValido: Partial<EnderecoUsuario> = {
      cep: '01310-100',
      logradouro: 'Av. Paulista',
      numero: '1000',
      complemento: 'Apto 101',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP',
      principal: true,
    };

    it('deve retornar sucesso para endereço válido', () => {
      const resultado = validarEndereco(enderecoValido);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com CEP inválido', () => {
      const resultado = validarEndereco({ ...enderecoValido, cep: '123' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('CEP');
    });

    it('deve falhar com logradouro vazio', () => {
      const resultado = validarEndereco({ ...enderecoValido, logradouro: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Logradouro');
    });

    it('deve falhar com logradouro > 150 chars', () => {
      const resultado = validarEndereco({ ...enderecoValido, logradouro: 'a'.repeat(151) });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com numero vazio', () => {
      const resultado = validarEndereco({ ...enderecoValido, numero: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com bairro vazio', () => {
      const resultado = validarEndereco({ ...enderecoValido, bairro: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com cidade vazia', () => {
      const resultado = validarEndereco({ ...enderecoValido, cidade: '' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com estado inválido (não 2 letras)', () => {
      const resultado = validarEndereco({ ...enderecoValido, estado: 'SAO' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Estado');
    });

    it('deve aceitar complemento vazio', () => {
      const resultado = validarEndereco({ ...enderecoValido, complemento: '' });
      expect(resultado.sucesso).toBe(true);
    });
  });

  // ==================== validarCartao ====================
  describe('validarCartao', () => {
    const cartaoValido: Partial<CartaoSalvo> = {
      nomeTitular: 'JOÃO SILVA',
      numero: '4111111111111111',
      validadeMes: 12,
      validadeAno: 2030,
      bandeira: 'visa',
    };

    it('deve retornar sucesso para cartão válido', () => {
      const resultado = validarCartao(cartaoValido);
      expect(resultado.sucesso).toBe(true);
    });

    it('deve falhar com nome titular vazio', () => {
      const resultado = validarCartao({ ...cartaoValido, nomeTitular: '' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Nome');
    });

    it('deve falhar com numero inválido (Luhn)', () => {
      const resultado = validarCartao({ ...cartaoValido, numero: '4111111111111112' });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('inválido');
    });

    it('deve falhar com numero com não-dígitos', () => {
      const resultado = validarCartao({ ...cartaoValido, numero: '4111 1111 1111 1111' });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com mes inválido (0)', () => {
      const resultado = validarCartao({ ...cartaoValido, validadeMes: 0 });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Mês');
    });

    it('deve falhar com mes inválido (13)', () => {
      const resultado = validarCartao({ ...cartaoValido, validadeMes: 13 });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com ano no passado', () => {
      const anoPassado = new Date().getFullYear() - 1;
      const resultado = validarCartao({ ...cartaoValido, validadeAno: anoPassado });
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Ano');
    });

    it('deve falhar com ano > 20 anos no futuro', () => {
      const anoFuturo = new Date().getFullYear() + 21;
      const resultado = validarCartao({ ...cartaoValido, validadeAno: anoFuturo });
      expect(resultado.sucesso).toBe(false);
    });

    it('deve falhar com bandeira inválida', () => {
      const resultado = validarCartao({ ...cartaoValido, bandeira: 'invalida' as any });
      expect(resultado.sucesso).toBe(false);
    });
  });

  // ==================== validarCPF ====================
  describe('validarCPF', () => {
    it('deve retornar true para CPF válido', () => {
      expect(validarCPF('123.456.789-09')).toBe(true);
      expect(validarCPF('12345678909')).toBe(true);
    });

    it('deve retornar false para CPF inválido', () => {
      expect(validarCPF('123.456.789-00')).toBe(false);
      expect(validarCPF('111.111.111-11')).toBe(false);
    });

    it('deve retornar false para CPF com tamanho errado', () => {
      expect(validarCPF('123')).toBe(false);
      expect(validarCPF('123.456.789-090')).toBe(false);
    });

    it('deve retornar false para string vazia', () => {
      expect(validarCPF('')).toBe(false);
    });
  });

  // ==================== validarTelefone ====================
  describe('validarTelefone', () => {
    it('deve retornar true para telefone válido (celular)', () => {
      expect(validarTelefone('(11) 99999-9999')).toBe(true);
      expect(validarTelefone('11999999999')).toBe(true);
    });

    it('deve retornar true para telefone fixo', () => {
      expect(validarTelefone('(11) 3333-4444')).toBe(true);
    });

    it('deve retornar false para telefone inválido', () => {
      expect(validarTelefone('123')).toBe(false);
      expect(validarTelefone('(11) 89999-9999')).toBe(false); // 8 não é válido para celular
    });
  });

  // ==================== formatarCPF ====================
  describe('formatarCPF', () => {
    it('deve formatar CPF corretamente', () => {
      expect(formatarCPF('12345678909')).toBe('123.456.789-09');
      expect(formatarCPF('123.456.789-09')).toBe('123.456.789-09');
    });

    it('deve retornar vazio para entrada vazia', () => {
      expect(formatarCPF('')).toBe('');
    });
  });

  // ==================== formatarTelefone ====================
  describe('formatarTelefone', () => {
    it('deve formatar celular corretamente', () => {
      expect(formatarTelefone('11999999999')).toBe('(11) 99999-9999');
    });

    it('deve formatar fixo corretamente', () => {
      expect(formatarTelefone('1133334444')).toBe('(11) 3333-4444');
    });

    it('deve retornar vazio para entrada vazia', () => {
      expect(formatarTelefone('')).toBe('');
    });
  });

  // ==================== formatarCEP ====================
  describe('formatarCEP', () => {
    it('deve formatar CEP corretamente', () => {
      expect(formatarCEP('01310100')).toBe('01310-100');
      expect(formatarCEP('01310-100')).toBe('01310-100');
    });

    it('deve retornar vazio para entrada vazia', () => {
      expect(formatarCEP('')).toBe('');
    });
  });

  // ==================== formatarCartao ====================
  describe('formatarCartao', () => {
    it('deve formatar cartão em grupos de 4', () => {
      expect(formatarCartao('4111111111111111')).toBe('4111 1111 1111 1111');
    });

    it('deve retornar vazio para entrada vazia', () => {
      expect(formatarCartao('')).toBe('');
    });
  });

  // ==================== calcularForcaSenha ====================
  describe('calcularForcaSenha', () => {
    it('deve retornar 0 para senha vazia', () => {
      expect(calcularForcaSenha('')).toBe(0);
    });

    it('deve retornar 1 para senha muito fraca', () => {
      expect(calcularForcaSenha('123')).toBe(1);
    });

    it('deve retornar 2 para senha fraca', () => {
      expect(calcularForcaSenha('senha123')).toBe(2);
    });

    it('deve retornar 3 para senha média', () => {
      expect(calcularForcaSenha('Senha123')).toBe(3);
    });

    it('deve retornar 4 para senha forte', () => {
      expect(calcularForcaSenha('SenhaForte123!')).toBe(4);
    });

    it('deve retornar 5 para senha muito forte', () => {
      expect(calcularForcaSenha('S3nh@Muit0F0rt3!L0ng@')).toBe(5);
    });
  });

  // ==================== sanitizarPerfil ====================
  describe('sanitizarPerfil', () => {
    it('deve remover campos undefined/null', () => {
      const resultado = sanitizarPerfil({ nome: 'João', email: undefined, telefone: null } as any);
      expect(resultado.nome).toBe('João');
      expect(resultado.email).toBeUndefined();
      expect(resultado.telefone).toBeUndefined();
    });

    it('deve trim strings', () => {
      const resultado = sanitizarPerfil({ nome: '  João  ', email: '  joao@email.com  ' });
      expect(resultado.nome).toBe('João');
      expect(resultado.email).toBe('joao@email.com');
    });
  });

  // ==================== sanitizarEndereco ====================
  describe('sanitizarEndereco', () => {
    it('deve remover campos undefined', () => {
      const resultado = sanitizarEndereco({ cep: '01310-100', logradouro: undefined } as any);
      expect(resultado.cep).toBe('01310-100');
      expect(resultado.logradouro).toBeUndefined();
    });
  });

  // ==================== criarPerfilError ====================
  describe('criarPerfilError', () => {
    it('deve criar erro com código e mensagem', () => {
      const erro = criarPerfilError('VALIDATION_ERROR', 'Dados inválidos');
      expect(erro.codigo).toBe('VALIDATION_ERROR');
      expect(erro.mensagem).toBe('Dados inválidos');
    });
  });

  // ==================== perfilCompleto ====================
  describe('perfilCompleto', () => {
    it('deve retornar true para perfil completo', () => {
      const perfil: Perfil = {
        id: '1',
        nome: 'João',
        email: 'joao@email.com',
        telefone: '(11) 99999-9999',
        cpf: '123.456.789-09',
        dataNascimento: '1990-01-01',
        genero: 'masculino',
        avatar: 'avatar.png',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };
      expect(perfilCompleto(perfil)).toBe(true);
    });

    it('deve retornar false para perfil incompleto', () => {
      const perfil: Perfil = {
        id: '1',
        nome: 'João',
        email: 'joao@email.com',
        telefone: '',
        cpf: '',
        dataNascimento: '',
        genero: '',
        avatar: null,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };
      expect(perfilCompleto(perfil)).toBe(false);
    });
  });

  // ==================== calcularCompletudePerfil ====================
  describe('calcularCompletudePerfil', () => {
    it('deve retornar 100 para perfil completo', () => {
      const perfil: Perfil = {
        id: '1',
        nome: 'João',
        email: 'joao@email.com',
        telefone: '(11) 99999-9999',
        cpf: '123.456.789-09',
        dataNascimento: '1990-01-01',
        genero: 'masculino',
        avatar: 'avatar.png',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };
      expect(calcularCompletudePerfil(perfil)).toBe(100);
    });

    it('deve retornar percentual correto para perfil parcial', () => {
      const perfil: Perfil = {
        id: '1',
        nome: 'João',
        email: 'joao@email.com',
        telefone: '',
        cpf: '',
        dataNascimento: '',
        genero: '',
        avatar: null,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };
      // 2 de 7 campos preenchidos = ~28%
      expect(calcularCompletudePerfil(perfil)).toBeGreaterThan(0);
      expect(calcularCompletudePerfil(perfil)).toBeLessThan(50);
    });
  });
});