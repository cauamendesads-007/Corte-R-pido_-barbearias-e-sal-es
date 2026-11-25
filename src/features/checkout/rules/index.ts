/**
 * Regras puras do domínio Checkout - Validações, Algoritmos, Cálculos.
 * Zero dependências React, < 30 linhas por função, early returns.
 */

import type {
  MetodoPagamento,
  BandeiraCartao,
  ItemCheckout,
  DadosPagamentoCartao,
  CheckoutSession,
  ValidacaoCartao,
  ValidacaoCPF_CNPJ,
} from '../types';

import {
  BANDEIRA_LABELS,
  PARCELAS_SEM_JUROS_MAX,
  PARCELAS_COM_JUROS_MAX,
  JUROS_PARCELADO_MENSAL,
  identificarBandeira,
  formatarCartao,
  formatarValidade,
  formatarCPF_CNPJ,
  calcularParcelas,
  gerarIdempotencyKey,
  formatarMoeda,
} from '../types';

// ============================================
// CONSTANTES DE ERRO
// ============================================

const ERRO_CODIGOS = {
  // Cartão
  CARTAO_NUMERO_INVALIDO: 'CARTAO_NUMERO_INVALIDO',
  CARTAO_NUMERO_INCOMPLETO: 'CARTAO_NUMERO_INCOMPLETO',
  CARTAO_VALIDADE_INVALIDA: 'CARTAO_VALIDADE_INVALIDA',
  CARTAO_VALIDADE_EXPIRADA: 'CARTAO_VALIDADE_EXPIRADA',
  CARTAO_CVV_INVALIDO: 'CARTAO_CVV_INVALIDO',
  CARTAO_NOME_INVALIDO: 'CARTAO_NOME_INVALIDO',
  CARTAO_BANDEIRA_NAO_SUPORTADA: 'CARTAO_BANDEIRA_NAO_SUPORTADA',
  CARTAO_LUHN_INVALIDO: 'CARTAO_LUHN_INVALIDO',

  // CPF/CNPJ
  CPF_CNPJ_INVALIDO: 'CPF_CNPJ_INVALIDO',
  CPF_INVALIDO: 'CPF_INVALIDO',
  CNPJ_INVALIDO: 'CNPJ_INVALIDO',

  // Pix
  PIX_CHAVE_INVALIDA: 'PIX_CHAVE_INVALIDA',
  PIX_QRCODE_EXPIRADO: 'PIX_QRCODE_EXPIRADO',
  PIX_VALOR_INVALIDO: 'PIX_VALOR_INVALIDO',

  // Geral
  VALOR_INVALIDO: 'VALOR_INVALIDO',
  ITEM_INVALIDO: 'ITEM_INVALIDO',
  IDEMPOTENCIA_EXPIRADA: 'IDEMPOTENCIA_EXPIRADA',
  IDEMPOTENCIA_JA_USADA: 'IDEMPOTENCIA_JA_USADA',
  SESSAO_EXPIRADA: 'SESSAO_EXPIRADA',
  METODO_NAO_SUPORTADO: 'METODO_NAO_SUPORTADO',
} as const;

// ============================================
// ALGORITMO LUHN (validação de cartão)
// ============================================

export function validarLuhn(numero: string): boolean {
  const limpo = numero.replace(/\D/g, '');
  if (limpo.length < 13 || limpo.length > 19) return false;

  let soma = 0;
  let alternar = false;

  // Percorre da direita para esquerda
  for (let i = limpo.length - 1; i >= 0; i--) {
    let digito = parseInt(limpo[i], 10);

    if (alternar) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }

    soma += digito;
    alternar = !alternar;
  }

  return soma % 10 === 0;
}

// ============================================
// VALIDAÇÃO DE CARTÃO DE CRÉDITO
// ============================================

export function validarNumeroCartao(numero: string): ValidacaoCartao {
  const limpo = numero.replace(/\D/g, '');
  const erros: string[] = [];

  if (!limpo) {
    return { valido: false, erros: ['Número do cartão é obrigatório'] };
  }

  if (limpo.length < 13 || limpo.length > 19) {
    erros.push('Número do cartão deve ter entre 13 e 19 dígitos');
  }

  const bandeira = identificarBandeira(limpo);
  if (bandeira === 'desconhecida') {
    erros.push('Bandeira do cartão não suportada');
  }

  if (!validarLuhn(limpo)) {
    erros.push('Número do cartão inválido (falha na validação Luhn)');
  }

  return {
    valido: erros.length === 0,
    bandeira: erros.length === 0 ? bandeira : undefined,
    erros,
  };
}

export function validarValidadeCartao(validade: string): { valido: boolean; erro?: string } {
  const limpo = validade.replace(/\D/g, '');

  if (!limpo || limpo.length !== 4) {
    return { valido: false, erro: 'Validade deve estar no formato MM/AA' };
  }

  const mes = parseInt(limpo.slice(0, 2), 10);
  const ano = parseInt(limpo.slice(2, 4), 10) + 2000;

  if (mes < 1 || mes > 12) {
    return { valido: false, erro: 'Mês inválido (01-12)' };
  }

  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth() + 1;

  const dataValidade = new Date(ano, mes - 1);
  const dataAtual = new Date(anoAtual, mesAtual - 1);

  if (dataValidade < dataAtual) {
    return { valido: false, erro: 'Cartão expirado' };
  }

  // Verificar se não é muito no futuro (máx 20 anos)
  if (ano > anoAtual + 20) {
    return { valido: false, erro: 'Ano de validade inválido' };
  }

  return { valido: true };
}

export function validarCVV(cvv: string, bandeira?: BandeiraCartao): { valido: boolean; erro?: string } {
  const limpo = cvv.replace(/\D/g, '');

  if (!limpo) {
    return { valido: false, erro: 'CVV é obrigatório' };
  }

  const tamanhoEsperado = bandeira === 'amex' ? 4 : 3;

  if (limpo.length !== tamanhoEsperado) {
    return { valido: false, erro: `CVV deve ter ${tamanhoEsperado} dígitos` };
  }

  return { valido: true };
}

export function validarNomeTitular(nome: string): { valido: boolean; erro?: string } {
  const limpo = nome.trim();

  if (!limpo) {
    return { valido: false, erro: 'Nome do titular é obrigatório' };
  }

  if (limpo.length < 3) {
    return { valido: false, erro: 'Nome muito curto' };
  }

  if (!/^[A-Za-zÀ-ÿ\s]+$/.test(limpo)) {
    return { valido: false, erro: 'Nome deve conter apenas letras e espaços' };
  }

  // Verificar se tem pelo menos primeiro e último nome
  const partes = limpo.split(/\s+/).filter(p => p.length > 0);
  if (partes.length < 2) {
    return { valido: false, erro: 'Informe nome completo' };
  }

  return { valido: true };
}

export function validarCartaoCompleto(dados: Partial<DadosPagamentoCartao>): ValidacaoCartao {
  const erros: string[] = [];
  let bandeira: BandeiraCartao | undefined;

  // Número
  if (dados.numero) {
    const validacaoNumero = validarNumeroCartao(dados.numero);
    erros.push(...validacaoNumero.erros);
    bandeira = validacaoNumero.bandeira;
  } else {
    erros.push('Número do cartão é obrigatório');
  }

  // Validade
  if (dados.validade) {
    const validacaoValidade = validarValidadeCartao(dados.validade);
    if (!validacaoValidade.valido) erros.push(validacaoValidade.erro!);
  } else {
    erros.push('Validade é obrigatória');
  }

  // CVV
  if (dados.cvv) {
    const validacaoCVV = validarCVV(dados.cvv, bandeira);
    if (!validacaoCVV.valido) erros.push(validacaoCVV.erro!);
  } else {
    erros.push('CVV é obrigatório');
  }

  // Nome
  if (dados.nomeTitular) {
    const validacaoNome = validarNomeTitular(dados.nomeTitular);
    if (!validacaoNome.valido) erros.push(validacaoNome.erro!);
  } else {
    erros.push('Nome do titular é obrigatório');
  }

  return {
    valido: erros.length === 0,
    bandeira,
    erros,
  };
}

// ============================================
// VALIDAÇÃO CPF/CNPJ (algoritmos oficiais)
// ============================================

function calcularDigitoCPF(cpf: string, posicao: number): number {
  let soma = 0;
  const peso = posicao === 1 ? 10 : 11;

  for (let i = 0; i < posicao === 1 ? 9 : 10; i++) {
    soma += parseInt(cpf[i], 10) * (peso - i);
  }

  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

export function validarCPF(cpf: string): ValidacaoCPF_CNPJ {
  const limpo = cpf.replace(/\D/g, '');

  if (limpo.length !== 11) {
    return { valido: false, tipo: 'cpf', erro: 'CPF deve ter 11 dígitos', formatado: formatarCPF_CNPJ(limpo) };
  }

  // Verificar dígitos repetidos (111.111.111-11, etc.)
  if (/^(\d)\1+$/.test(limpo)) {
    return { valido: false, tipo: 'cpf', erro: 'CPF inválido', formatado: formatarCPF_CNPJ(limpo) };
  }

  const digito1 = calcularDigitoCPF(limpo, 1);
  const digito2 = calcularDigitoCPF(limpo, 2);

  const valido = digito1 === parseInt(limpo[9], 10) && digito2 === parseInt(limpo[10], 10);

  return {
    valido,
    tipo: 'cpf',
    formatado: formatarCPF_CNPJ(limpo),
    erro: valido ? undefined : 'CPF inválido',
  };
}

function calcularDigitoCNPJ(cnpj: string, posicao: number): number {
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos = posicao === 1 ? pesos1 : pesos2;

  let soma = 0;
  for (let i = 0; i < pesos.length; i++) {
    soma += parseInt(cnpj[i], 10) * pesos[i];
  }

  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarCNPJ(cnpj: string): ValidacaoCPF_CNPJ {
  const limpo = cnpj.replace(/\D/g, '');

  if (limpo.length !== 14) {
    return { valido: false, tipo: 'cnpj', erro: 'CNPJ deve ter 14 dígitos', formatado: formatarCPF_CNPJ(limpo) };
  }

  // Verificar dígitos repetidos
  if (/^(\d)\1+$/.test(limpo)) {
    return { valido: false, tipo: 'cnpj', erro: 'CNPJ inválido', formatado: formatarCPF_CNPJ(limpo) };
  }

  const digito1 = calcularDigitoCNPJ(limpo, 1);
  const digito2 = calcularDigitoCNPJ(limpo, 2);

  const valido = digito1 === parseInt(limpo[12], 10) && digito2 === parseInt(limpo[13], 10);

  return {
    valido,
    tipo: 'cnpj',
    formatado: formatarCPF_CNPJ(limpo),
    erro: valido ? undefined : 'CNPJ inválido',
  };
}

export function validarCPF_CNPJ(valor: string): ValidacaoCPF_CNPJ {
  const limpo = valor.replace(/\D/g, '');

  if (limpo.length <= 11) {
    return validarCPF(limpo);
  } else {
    return validarCNPJ(limpo);
  }
}

// ============================================
// VALIDAÇÃO PIX
// ============================================

const PIX_CHAVE_PATTERNS = {
  cpf: /^\d{11}$/,
  cnpj: /^\d{14}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  telefone: /^\+?55\d{10,11}$/,
  aleatoria: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

export function validarChavePix(chave: string): { valido: boolean; tipo?: string; erro?: string } {
  const limpo = chave.trim();

  if (!limpo) {
    return { valido: false, erro: 'Chave Pix é obrigatória' };
  }

  // Tentar identificar tipo
  for (const [tipo, pattern] of Object.entries(PIX_CHAVE_PATTERNS)) {
    if (pattern.test(limpo)) {
      return { valido: true, tipo };
    }
  }

  // Se não bateu em nenhum pattern, pode ser uma chave aleatória mal formatada
  return { valido: false, erro: 'Formato de chave Pix inválido' };
}

export function validarQRCodePix(qrCode: string, expiracao: string): { valido: boolean; erro?: string } {
  if (!qrCode || qrCode.length < 50) {
    return { valido: false, erro: 'QR Code Pix inválido' };
  }

  // Verificar se começa com payload EMVCo (000201...)
  if (!qrCode.startsWith('000201')) {
    return { valido: false, erro: 'QR Code não segue padrão EMVCo' };
  }

  const agora = new Date();
  const exp = new Date(expiracao);

  if (agora > exp) {
    return { valido: false, erro: 'QR Code expirado' };
  }

  return { valido: true };
}

// ============================================
// CÁLCULOS DE CHECKOUT
// ============================================

export function calcularTotaisCheckout(
  itens: ItemCheckout[],
  desconto: number = 0
): { subtotal: number; desconto: number; total: number } {
  const subtotal = itens.reduce((s, item) => s + item.valorTotal, 0);
  const descontoAplicado = Math.min(desconto, subtotal);
  const total = Math.max(0, subtotal - descontoAplicado);

  return { subtotal, desconto: descontoAplicado, total };
}

export function validarItensCheckout(itens: ItemCheckout[]): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (!itens.length) {
    erros.push('Nenhum item no checkout');
    return { valido: false, erros };
  }

  itens.forEach((item, index) => {
    if (!item.descricao?.trim()) {
      erros.push(`Item ${index + 1}: descrição é obrigatória`);
    }
    if (item.quantidade <= 0) {
      erros.push(`Item ${index + 1}: quantidade deve ser maior que zero`);
    }
    if (item.valorUnitario < 0) {
      erros.push(`Item ${index + 1}: valor unitário não pode ser negativo`);
    }
    if (item.valorTotal !== item.valorUnitario * item.quantidade) {
      erros.push(`Item ${index + 1}: valor total não confere (${item.valorTotal} ≠ ${item.valorUnitario} × ${item.quantidade})`);
    }
  });

  return { valido: erros.length === 0, erros };
}

// ============================================
// IDEMPOTÊNCIA
// ============================================

export function validarIdempotencyKey(chave: string, acaoEsperada: string, entidadeIdEsperada: string): { valido: boolean; erro?: string } {
  if (!chave) {
    return { valido: false, erro: 'Chave de idempotência é obrigatória' };
  }

  const partes = chave.split('_');
  if (partes.length < 5 || partes[0] !== 'idem') {
    return { valido: false, erro: 'Formato de chave de idempotência inválido' };
  }

  const [, acao, entidadeId, timestampStr] = partes;
  const timestamp = parseInt(timestampStr, 10);

  if (acao !== acaoEsperada) {
    return { valido: false, erro: 'Ação da chave de idempotência não confere' };
  }

  if (entidadeId !== entidadeIdEsperada) {
    return { valido: false, erro: 'Entidade da chave de idempotência não confere' };
  }

  // Verificar expiração (24 horas)
  const agora = Date.now();
  const expiracao = timestamp + 24 * 60 * 60 * 1000;

  if (agora > expiracao) {
    return { valido: false, erro: 'Chave de idempotência expirada' };
  }

  return { valido: true };
}

export function criarSessaoCheckout(
  itens: ItemCheckout[],
  metodo: MetodoPagamento,
  desconto: number = 0,
  metadata?: Record<string, unknown>
): CheckoutSession {
  const { subtotal, total } = calcularTotaisCheckout(itens, desconto);
  const agora = new Date();
  const expiracao = new Date(agora.getTime() + 30 * 60 * 1000); // 30 minutos

  return {
    id: gerarIdempotencyKey('checkout', `items_${itens.length}`),
    status: 'pendente',
    metodo,
    itens,
    subtotal,
    desconto,
    total,
    dataCriacao: agora.toISOString(),
    dataExpiracao: expiracao.toISOString(),
    metadata,
  };
}

// ============================================
// FORMATAÇÃO E UTILITÁRIOS EXPORTADOS
// ============================================

export {
  identificarBandeira,
  formatarCartao,
  formatarValidade,
  formatarCPF_CNPJ,
  calcularParcelas,
  gerarIdempotencyKey,
  formatarMoeda,
  BANDEIRA_LABELS,
  PARCELAS_SEM_JUROS_MAX,
  PARCELAS_COM_JUROS_MAX,
  JUROS_PARCELADO_MENSAL,
  ERRO_CODIGOS,
};