/**
 * Regras puras do domínio de Autenticação - Validações, Normalizações.
 * Zero dependências React, < 30 linhas por função, early returns.
 */

import type { CadastroInput, CadastroEtapa, TipoCadastro } from '../types';

export type ErrosValidacao = Partial<Record<keyof CadastroInput, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CPF_REGEX = /^\d{11}$/;
const TELEFONE_REGEX = /^\d{10,11}$/;

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizarTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

export function normalizarCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export function validarEmail(email: string): string | null {
  const normalizado = normalizarEmail(email);
  if (!normalizado) return 'E-mail é obrigatório';
  if (!EMAIL_REGEX.test(normalizado)) return 'E-mail inválido';
  return null;
}

export function validarSenha(senha: string): string | null {
  if (!senha) return 'Senha é obrigatória';
  if (senha.length < 6) return 'Senha deve ter pelo menos 6 caracteres';
  return null;
}

export function validarConfirmarSenha(senha: string, confirmarSenha: string): string | null {
  if (!confirmarSenha) return 'Confirmação de senha é obrigatória';
  if (senha !== confirmarSenha) return 'Senhas não conferem';
  return null;
}

export function validarNome(nome: string): string | null {
  const normalizado = nome.trim();
  if (!normalizado) return 'Nome é obrigatório';
  if (normalizado.length < 2) return 'Nome deve ter pelo menos 2 caracteres';
  return null;
}

export function validarTelefone(telefone: string): string | null {
  const normalizado = normalizarTelefone(telefone);
  if (!normalizado) return null; // opcional
  if (!TELEFONE_REGEX.test(normalizado)) return 'Telefone inválido';
  return null;
}

export function validarWhatsApp(whatsapp: string): string | null {
  const normalizado = normalizarTelefone(whatsapp);
  if (!normalizado) return null; // opcional
  if (!TELEFONE_REGEX.test(normalizado)) return 'WhatsApp inválido';
  return null;
}

export function validarCPF(cpf: string): string | null {
  const normalizado = normalizarCPF(cpf);
  if (!normalizado) return null; // opcional
  if (!CPF_REGEX.test(normalizado)) return 'CPF inválido';
  // Validação básica de dígitos verificadores
  if (/^(\d)\1{10}$/.test(normalizado)) return 'CPF inválido';
  return null;
}

export function validarNicho(nicho: string): string | null {
  if (!nicho?.trim()) return 'Nicho é obrigatório para barbeiros';
  return null;
}

export function validarBio(bio: string): string | null {
  if (!bio?.trim()) return null; // opcional
  if (bio.length > 500) return 'Bio deve ter no máximo 500 caracteres';
  return null;
}

export function validarAceitouTermos(aceitou: boolean): string | null {
  if (!aceitou) return 'Você deve aceitar os termos de uso';
  return null;
}

export function validarEtapaCadastro(
  etapa: CadastroEtapa,
  tipo: TipoCadastro | null,
  dados: Partial<CadastroInput>,
  aceitouTermos: boolean
): ErrosValidacao {
  const erros: ErrosValidacao = {};

  if (!tipo) {
    erros.tipo = 'Selecione um tipo de cadastro';
    return erros;
  }

  switch (etapa) {
    case 1: {
      const erroNome = validarNome(dados.nome || '');
      if (erroNome) erros.nome = erroNome;

      const erroEmail = validarEmail(dados.email || '');
      if (erroEmail) erros.email = erroEmail;

      const erroSenha = validarSenha(dados.senha || '');
      if (erroSenha) erros.senha = erroSenha;

      const erroConfirmar = validarConfirmarSenha(dados.senha || '', dados.confirmarSenha || '');
      if (erroConfirmar) erros.confirmarSenha = erroConfirmar;
      break;
    }

    case 2: {
      // Dados de contato (cliente)
      const erroTelefone = validarTelefone(dados.telefone || '');
      if (erroTelefone) erros.telefone = erroTelefone;

      const erroWhatsApp = validarWhatsApp(dados.whatsapp || '');
      if (erroWhatsApp) erros.whatsapp = erroWhatsApp;
      break;
    }

    case 3: {
      // Dados profissionais (barbeiro)
      if (tipo === 'barbeiro') {
        const erroCPF = validarCPF(dados.cpf || '');
        if (erroCPF) erros.cpf = erroCPF;

        const erroNicho = validarNicho(dados.nicho || '');
        if (erroNicho) erros.nicho = erroNicho;

        const erroBio = validarBio(dados.bio || '');
        if (erroBio) erros.bio = erroBio;
      }
      break;
    }

    case 4: {
      // Termos
      const erroTermos = validarAceitouTermos(aceitouTermos);
      if (erroTermos) erros.aceitouTermos = erroTermos;
      break;
    }
  }

  return erros;
}

export function temErros(erros: ErrosValidacao): boolean {
  return Object.values(erros).some(e => e !== undefined && e !== null && e !== '');
}

export function obterPrimeiroErro(erros: ErrosValidacao): string | null {
  const primeiro = Object.values(erros).find(e => e !== undefined && e !== null && e !== '');
  return primeiro ?? null;
}