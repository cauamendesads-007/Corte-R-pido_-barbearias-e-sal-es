/**
 * Regras puras de negócio do domínio Perfil.
 * Zero dependências de React, < 30 linhas cada, early returns, constantes no topo.
 */

import type {
  Perfil,
  AtualizarPerfilDados,
  AlterarSenhaDados,
  UploadAvatarDados,
  EnderecoUsuario,
  CartaoSalvo,
  PreferenciasUsuario,
  ValidacaoPerfilConfig,
} from '../types';

// Constantes
const CONFIG_PADRAO: ValidacaoPerfilConfig = {
  nomeMin: 2,
  nomeMax: 100,
  bioMax: 500,
  cpfObrigatorio: false,
  telefoneObrigatorio: false,
  avatarMaxSizeMB: 5,
  avatarTiposPermitidos: ['image/jpeg', 'image/png', 'image/webp'],
};

const TIPOS_AVATAR_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const BANDEIRAS_CARTAO = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'outro'] as const;

/**
 * Valida dados de atualização de perfil.
 */
export function validarAtualizarPerfil(dados: AtualizarPerfilDados, config: Partial<ValidacaoPerfilConfig> = {}): string | null {
  const cfg = { ...CONFIG_PADRAO, ...config };

  if (dados.nome !== undefined) {
    const nome = dados.nome.trim();
    if (nome.length < cfg.nomeMin) return `Nome deve ter pelo menos ${cfg.nomeMin} caracteres`;
    if (nome.length > cfg.nomeMax) return `Nome deve ter no máximo ${cfg.nomeMax} caracteres`;
  }

  if (dados.bio !== undefined && dados.bio.length > cfg.bioMax) {
    return `Bio deve ter no máximo ${cfg.bioMax} caracteres`;
  }

  if (dados.cpf !== undefined && dados.cpf && !validarCPF(dados.cpf)) {
    return 'CPF inválido';
  }

  if (dados.telefone !== undefined && dados.telefone && !validarTelefone(dados.telefone)) {
    return 'Telefone inválido';
  }

  if (dados.dataNascimento !== undefined && dados.dataNascimento) {
    const data = new Date(dados.dataNascimento);
    const hoje = new Date();
    if (data > hoje) return 'Data de nascimento não pode ser futura';
    if (data.getFullYear() < 1900) return 'Data de nascimento inválida';
    const idade = hoje.getFullYear() - data.getFullYear();
    if (idade < 13) return 'Idade mínima é 13 anos';
  }

  return null;
}

/**
 * Valida alteração de senha.
 */
export function validarAlterarSenha(dados: AlterarSenhaDados): string | null {
  if (!dados.senhaAtual) return 'Senha atual é obrigatória';
  if (!dados.novaSenha) return 'Nova senha é obrigatória';
  if (dados.novaSenha.length < 8) return 'Nova senha deve ter pelo menos 8 caracteres';
  if (!/[A-Z]/.test(dados.novaSenha)) return 'Nova senha deve conter pelo menos uma letra maiúscula';
  if (!/[a-z]/.test(dados.novaSenha)) return 'Nova senha deve conter pelo menos uma letra minúscula';
  if (!/[0-9]/.test(dados.novaSenha)) return 'Nova senha deve conter pelo menos um número';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(dados.novaSenha)) {
    return 'Nova senha deve conter pelo menos um caractere especial';
  }
  if (dados.novaSenha !== dados.confirmarNovaSenha) return 'As senhas não conferem';
  if (dados.senhaAtual === dados.novaSenha) return 'Nova senha deve ser diferente da atual';
  return null;
}

/**
 * Valida arquivo de avatar.
 */
export function validarAvatar(arquivo: File, config: Partial<ValidacaoPerfilConfig> = {}): string | null {
  const cfg = { ...CONFIG_PADRAO, ...config };

  if (!TIPOS_AVATAR_PERMITIDOS.has(arquivo.type)) {
    return `Tipo de arquivo não permitido. Use: ${cfg.avatarTiposPermitidos.join(', ')}`;
  }

  const maxBytes = cfg.avatarMaxSizeMB * 1024 * 1024;
  if (arquivo.size > maxBytes) {
    return `Arquivo muito grande. Máximo: ${cfg.avatarMaxSizeMB}MB`;
  }

  return null;
}

/**
 * Valida endereço.
 */
export function validarEndereco(endereco: Omit<EnderecoUsuario, 'id'>): string | null {
  if (!endereco.cep || !/^\d{5}-?\d{3}$/.test(endereco.cep)) return 'CEP inválido';
  if (!endereco.logradouro?.trim()) return 'Logradouro é obrigatório';
  if (!endereco.numero?.trim()) return 'Número é obrigatório';
  if (!endereco.bairro?.trim()) return 'Bairro é obrigatório';
  if (!endereco.cidade?.trim()) return 'Cidade é obrigatória';
  if (!endereco.estado?.trim() || endereco.estado.length !== 2) return 'Estado inválido (use UF com 2 letras)';
  return null;
}

/**
 * Valida cartão de crédito (apenas formato básico - tokenização real no backend).
 */
export function validarCartao(cartao: Omit<CartaoSalvo, 'id' | 'criadoEm'>): string | null {
  if (!BANDEIRAS_CARTAO.includes(cartao.bandeira)) return 'Bandeira inválida';
  if (!/^\d{4}$/.test(cartao.ultimosDigitos)) return 'Últimos 4 dígitos inválidos';
  if (!cartao.nomeTitular?.trim()) return 'Nome do titular é obrigatório';
  if (cartao.validadeMes < 1 || cartao.validadeMes > 12) return 'Mês de validade inválido';
  const anoAtual = new Date().getFullYear() % 100;
  if (cartao.validadeAno < anoAtual || cartao.validadeAno > anoAtual + 20) return 'Ano de validade inválido';
  return null;
}

/**
 * Valida CPF (algoritmo oficial).
 */
export function validarCPF(cpf: string): boolean {
  const numeros = cpf.replace(/\D/g, '');
  if (numeros.length !== 11) return false;
  if (/^(\d)\1+$/.test(numeros)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(numeros[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(numeros[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(numeros[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(numeros[10])) return false;

  return true;
}

/**
 * Valida telefone brasileiro.
 */
export function validarTelefone(telefone: string): boolean {
  const numeros = telefone.replace(/\D/g, '');
  return numeros.length >= 10 && numeros.length <= 11;
}

/**
 * Formata CPF para exibição.
 */
export function formatarCPF(cpf: string): string {
  const numeros = cpf.replace(/\D/g, '');
  if (numeros.length !== 11) return cpf;
  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata telefone para exibição.
 */
export function formatarTelefone(telefone: string): string {
  const numeros = telefone.replace(/\D/g, '');
  if (numeros.length === 11) return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (numeros.length === 10) return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return telefone;
}

/**
 * Formata CEP para exibição.
 */
export function formatarCEP(cep: string): string {
  const numeros = cep.replace(/\D/g, '');
  if (numeros.length !== 8) return cep;
  return numeros.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Formata cartão para exibição (mascarado).
 */
export function formatarCartaoExibicao(bandeira: string, ultimosDigitos: string): string {
  const nomesBandeira: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    elo: 'Elo',
    amex: 'American Express',
    hipercard: 'Hipercard',
    outro: 'Cartão',
  };
  return `${nomesBandeira[bandeira] || 'Cartão'} •••• ${ultimosDigitos}`;
}

/**
 * Calcula força da senha (0-4).
 */
export function calcularForcaSenha(senha: string): number {
  let forca = 0;
  if (senha.length >= 8) forca++;
  if (/[A-Z]/.test(senha)) forca++;
  if (/[a-z]/.test(senha)) forca++;
  if (/[0-9]/.test(senha)) forca++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) forca++;
  return Math.min(forca, 4);
}

/**
 * Obtém label da força da senha.
 */
export function obterLabelForcaSenha(forca: number): string {
  const labels = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'];
  return labels[forca] || 'Desconhecida';
}

/**
 * Obtém cor da força da senha.
 */
export function obterCorForcaSenha(forca: number): 'perigo' | 'aviso' | 'sucesso' | 'primario' {
  if (forca <= 1) return 'perigo';
  if (forca === 2) return 'aviso';
  if (forca === 3) return 'sucesso';
  return 'primario';
}

/**
 * Sanitiza dados de perfil para envio.
 */
export function sanitizarPerfil(dados: AtualizarPerfilDados): AtualizarPerfilDados {
  return {
    ...dados,
    nome: dados.nome?.trim(),
    bio: dados.bio?.trim(),
    cpf: dados.cpf?.replace(/\D/g, ''),
    telefone: dados.telefone?.replace(/\D/g, ''),
  };
}

/**
 * Sanitiza endereço para envio.
 */
export function sanitizarEndereco(endereco: Omit<EnderecoUsuario, 'id'>): Omit<EnderecoUsuario, 'id'> {
  return {
    ...endereco,
    cep: endereco.cep.replace(/\D/g, ''),
    logradouro: endereco.logradouro.trim(),
    numero: endereco.numero.trim(),
    complemento: endereco.complemento?.trim(),
    bairro: endereco.bairro.trim(),
    cidade: endereco.cidade.trim(),
    estado: endereco.estado.toUpperCase().trim(),
  };
}

/**
 * Cria erro padronizado para perfil.
 */
export function criarPerfilError(mensagem: string, codigo: string = 'PERFIL_ERROR'): Error & { codigo: string } {
  const error = new Error(mensagem) as Error & { codigo: string };
  error.codigo = codigo;
  return error;
}

/**
 * Verifica se perfil está completo.
 */
export function perfilCompleto(perfil: Perfil): boolean {
  return !!(
    perfil.nome &&
    perfil.email &&
    perfil.telefone &&
    perfil.avatar &&
    perfil.dataNascimento
  );
}

/**
 * Calcula percentual de completude do perfil.
 */
export function calcularCompletudePerfil(perfil: Perfil): number {
  const campos = [
    'nome',
    'email',
    'telefone',
    'avatar',
    'bio',
    'dataNascimento',
    'genero',
    'cpf',
  ];
  const preenchidos = campos.filter((campo) => perfil[campo as keyof Perfil]).length;
  return Math.round((preenchidos / campos.length) * 100);
}