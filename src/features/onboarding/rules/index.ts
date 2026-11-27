/**
 * Regras puras de negócio do domínio Onboarding.
 * Zero dependências de React, < 30 linhas cada, early returns, constantes no topo.
 */

import type {
  OnboardingDados,
  OnboardingEtapa,
  OnboardingRascunho,
  ValidacaoOnboardingConfig,
} from '../types';

// Constantes
const CHAVE_RASCUNHO = 'corte_rapido_onboarding_rascunho';
const VERSAO_RASCUNHO = 1;

const CONFIG_PADRAO: ValidacaoOnboardingConfig = {
  nomeMin: 2,
  nomeMax: 100,
  senhaMin: 8,
  telefoneObrigatorio: true,
  cpfObrigatorio: false,
  enderecoObrigatorio: true,
};

const ETAPAS_ORDEM: OnboardingEtapa[] = [
  'boas-vindas',
  'tipo-usuario',
  'dados-pessoais',
  'endereco',
  'preferencias',
  'conclusao',
];

const CAMPOS_POR_ETAPA: Record<OnboardingEtapa, (keyof OnboardingDados)[]> = {
  'boas-vindas': [],
  'tipo-usuario': ['tipoUsuario'],
  'dados-pessoais': ['nome', 'email', 'telefone', 'senha', 'confirmarSenha', 'dataNascimento', 'genero', 'cpf'],
  'endereco': ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado'],
  'preferencias': ['notificacoesPush', 'notificacoesEmail', 'notificacoesSms', 'tema'],
  'conclusao': [],
};

/**
 * Valida etapa atual do onboarding.
 */
export function validarEtapa(
  etapa: OnboardingEtapa,
  dados: Partial<OnboardingDados>,
  config: Partial<ValidacaoOnboardingConfig> = {}
): string | null {
  const cfg = { ...CONFIG_PADRAO, ...config };
  const campos = CAMPOS_POR_ETAPA[etapa] || [];

  for (const campo of campos) {
    const valor = dados[campo];
    const erro = validarCampo(campo, valor, dados, cfg);
    if (erro) return erro;
  }

  return null;
}

/**
 * Valida um campo específico.
 */
function validarCampo(
  campo: keyof OnboardingDados,
  valor: any,
  todosDados: Partial<OnboardingDados>,
  config: ValidacaoOnboardingConfig
): string | null {
  switch (campo) {
    case 'tipoUsuario':
      if (!valor || !['cliente', 'barbeiro'].includes(valor)) {
        return 'Selecione um tipo de usuário';
      }
      break;

    case 'nome':
      if (!valor?.trim()) return 'Nome é obrigatório';
      if (valor.trim().length < config.nomeMin) return `Nome deve ter pelo menos ${config.nomeMin} caracteres`;
      if (valor.trim().length > config.nomeMax) return `Nome deve ter no máximo ${config.nomeMax} caracteres`;
      break;

    case 'email':
      if (!valor?.trim()) return 'E-mail é obrigatório';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return 'E-mail inválido';
      break;

    case 'telefone':
      if (config.telefoneObrigatorio && !valor?.trim()) return 'Telefone é obrigatório';
      if (valor && !validarTelefone(valor)) return 'Telefone inválido';
      break;

    case 'senha':
      if (!valor) return 'Senha é obrigatória';
      if (valor.length < config.senhaMin) return `Senha deve ter pelo menos ${config.senhaMin} caracteres`;
      if (!/[A-Z]/.test(valor)) return 'Senha deve conter pelo menos uma letra maiúscula';
      if (!/[a-z]/.test(valor)) return 'Senha deve conter pelo menos uma letra minúscula';
      if (!/[0-9]/.test(valor)) return 'Senha deve conter pelo menos um número';
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(valor)) {
        return 'Senha deve conter pelo menos um caractere especial';
      }
      break;

    case 'confirmarSenha':
      if (!valor) return 'Confirme a senha';
      if (valor !== todosDados.senha) return 'As senhas não conferem';
      break;

    case 'cpf':
      if (config.cpfObrigatorio && !valor?.trim()) return 'CPF é obrigatório';
      if (valor && !validarCPF(valor)) return 'CPF inválido';
      break;

    case 'dataNascimento':
      if (valor) {
        const data = new Date(valor);
        const hoje = new Date();
        if (data > hoje) return 'Data de nascimento não pode ser futura';
        const idade = hoje.getFullYear() - data.getFullYear();
        if (idade < 13) return 'Idade mínima é 13 anos';
      }
      break;

    case 'cep':
      if (config.enderecoObrigatorio && !valor?.trim()) return 'CEP é obrigatório';
      if (valor && !/^\d{5}-?\d{3}$/.test(valor.replace(/\D/g, ''))) return 'CEP inválido';
      break;

    case 'logradouro':
      if (config.enderecoObrigatorio && !valor?.trim()) return 'Logradouro é obrigatório';
      break;

    case 'numero':
      if (config.enderecoObrigatorio && !valor?.trim()) return 'Número é obrigatório';
      break;

    case 'bairro':
      if (config.enderecoObrigatorio && !valor?.trim()) return 'Bairro é obrigatório';
      break;

    case 'cidade':
      if (config.enderecoObrigatorio && !valor?.trim()) return 'Cidade é obrigatória';
      break;

    case 'estado':
      if (config.enderecoObrigatorio && !valor?.trim()) return 'Estado é obrigatório';
      if (valor && valor.length !== 2) return 'Estado inválido (use UF com 2 letras)';
      break;
  }

  return null;
}

/**
 * Valida telefone brasileiro.
 */
export function validarTelefone(telefone: string): boolean {
  const numeros = telefone.replace(/\D/g, '');
  return numeros.length >= 10 && numeros.length <= 11;
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
 * Formata telefone para exibição.
 */
export function formatarTelefone(telefone: string): string {
  const numeros = telefone.replace(/\D/g, '');
  if (numeros.length === 11) return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (numeros.length === 10) return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return telefone;
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
 * Formata CEP para exibição.
 */
export function formatarCEP(cep: string): string {
  const numeros = cep.replace(/\D/g, '');
  if (numeros.length !== 8) return cep;
  return numeros.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Obtém índice da etapa atual.
 */
export function obterIndiceEtapa(etapa: OnboardingEtapa): number {
  return ETAPAS_ORDEM.indexOf(etapa);
}

/**
 * Obtém próxima etapa.
 */
export function obterProximaEtapa(etapa: OnboardingEtapa): OnboardingEtapa | null {
  const indice = obterIndiceEtapa(etapa);
  if (indice === -1 || indice === ETAPAS_ORDEM.length - 1) return null;
  return ETAPAS_ORDEM[indice + 1];
}

/**
 * Obtém etapa anterior.
 */
export function obterEtapaAnterior(etapa: OnboardingEtapa): OnboardingEtapa | null {
  const indice = obterIndiceEtapa(etapa);
  if (indice <= 0) return null;
  return ETAPAS_ORDEM[indice - 1];
}

/**
 * Verifica se pode avançar para a próxima etapa.
 */
export function podeAvancar(etapa: OnboardingEtapa, dados: Partial<OnboardingDados>, config?: Partial<ValidacaoOnboardingConfig>): boolean {
  return validarEtapa(etapa, dados, config) === null;
}

/**
 * Calcula progresso do onboarding (0-100).
 */
export function calcularProgresso(etapa: OnboardingEtapa): number {
  const indice = obterIndiceEtapa(etapa);
  if (indice === -1) return 0;
  return Math.round(((indice + 1) / ETAPAS_ORDEM.length) * 100);
}

/**
 * Salva rascunho no sessionStorage.
 */
export function salvarRascunho(rascunho: OnboardingRascunho): void {
  try {
    sessionStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({
      ...rascunho,
      versao: VERSAO_RASCUNHO,
      atualizadoEm: new Date().toISOString(),
    }));
  } catch {
    // Ignora erros de quota
  }
}

/**
 * Carrega rascunho do sessionStorage.
 */
export function carregarRascunho(): OnboardingRascunho | null {
  try {
    const salvo = sessionStorage.getItem(CHAVE_RASCUNHO);
    if (!salvo) return null;

    const rascunho = JSON.parse(salvo) as OnboardingRascunho;

    // Verifica versão
    if (rascunho.versao !== VERSAO_RASCUNHO) {
      limparRascunho();
      return null;
    }

    // Verifica expiração (24h)
    const atualizadoEm = new Date(rascunho.atualizadoEm);
    const agora = new Date();
    if (agora.getTime() - atualizadoEm.getTime() > 24 * 60 * 60 * 1000) {
      limparRascunho();
      return null;
    }

    return rascunho;
  } catch {
    return null;
  }
}

/**
 * Limpa rascunho do sessionStorage.
 */
export function limparRascunho(): void {
  try {
    sessionStorage.removeItem(CHAVE_RASCUNHO);
  } catch {
    // Ignora
  }
}

/**
 * Sanitiza dados para envio à API.
 */
export function sanitizarDadosOnboarding(dados: Partial<OnboardingDados>): Partial<OnboardingDados> {
  return {
    ...dados,
    nome: dados.nome?.trim(),
    email: dados.email?.trim().toLowerCase(),
    telefone: dados.telefone?.replace(/\D/g, ''),
    cpf: dados.cpf?.replace(/\D/g, ''),
    cep: dados.cep?.replace(/\D/g, ''),
    logradouro: dados.logradouro?.trim(),
    numero: dados.numero?.trim(),
    complemento: dados.complemento?.trim(),
    bairro: dados.bairro?.trim(),
    cidade: dados.cidade?.trim(),
    estado: dados.estado?.toUpperCase().trim(),
  };
}

/**
 * Cria erro padronizado para onboarding.
 */
export function criarOnboardingError(mensagem: string, codigo: string = 'ONBOARDING_ERROR'): Error & { codigo: string } {
  const error = new Error(mensagem) as Error & { codigo: string };
  error.codigo = codigo;
  return error;
}