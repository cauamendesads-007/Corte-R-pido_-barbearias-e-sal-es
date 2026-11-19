/**
 * Funções puras de validação para formulários da aplicação Corte Rápido.
 * Retornam string com mensagem de erro ou null se válido.
 */

import { LIMITES, MENSAGENS_ERRO } from '@/constantes';
import { validarCpf, validarWhatsapp } from './formatar';

/**
 * Valida campo obrigatório (string não vazia).
 */
export function validarObrigatorio(valor: string, nomeCampo: string): string | null {
  if (!valor || valor.trim() === '') {
    return MENSAGENS_ERRO.campoObrigatorio(nomeCampo);
  }
  return null;
}

/**
 * Valida tamanho mínimo e máximo de string.
 */
export function validarTamanho(
  valor: string,
  minimo: number,
  maximo: number,
  nomeCampo: string
): string | null {
  const len = valor.trim().length;
  if (len < minimo) {
    return `${nomeCampo} deve ter pelo menos ${minimo} caracteres.`;
  }
  if (len > maximo) {
    return `${nomeCampo} deve ter no máximo ${maximo} caracteres.`;
  }
  return null;
}

/**
 * Valida e-mail.
 */
export function validarEmail(valor: string): string | null {
  if (!valor) return null; // Opcional, usar validarObrigatorio se necessário
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(valor)) {
    return MENSAGENS_ERRO.emailInvalido;
  }
  return null;
}

/**
 * Valida senha (mínimo 8 chars, pelo menos 1 letra e 1 número).
 */
export function validarSenha(valor: string): string | null {
  if (!valor) return MENSAGENS_ERRO.senhaCurta;
  if (valor.length < LIMITES.senhaMinima) {
    return MENSAGENS_ERRO.senhaCurta;
  }
  if (!/[a-zA-Z]/.test(valor) || !/\d/.test(valor)) {
    return 'A senha deve conter pelo menos uma letra e um número.';
  }
  return null;
}

/**
 * Valida confirmação de senha.
 */
export function validarConfirmarSenha(senha: string, confirmar: string): string | null {
  if (senha !== confirmar) {
    return 'As senhas não conferem.';
  }
  return null;
}

/**
 * Valida WhatsApp brasileiro.
 */
export function validarCampoWhatsapp(valor: string): string | null {
  if (!valor) return MENSAGENS_ERRO.whatsappObrigatorio;
  if (!validarWhatsapp(valor)) {
    return MENSAGENS_ERRO.whatsappInvalido;
  }
  return null;
}

/**
 * Valida CPF.
 */
export function validarCampoCpf(valor: string): string | null {
  if (!valor) return null; // Opcional
  if (!validarCpf(valor)) {
    return 'CPF inválido.';
  }
  return null;
}

/**
 * Valida CEP.
 */
export function validarCep(valor: string): string | null {
  if (!valor) return null; // Opcional
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length !== 8) {
    return 'CEP inválido. Use 00000-000.';
  }
  return null;
}

/**
 * Valida preço (número positivo).
 */
export function validarPreco(valor: string | number): string | null {
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
  if (isNaN(num) || !isFinite(num) || num < LIMITES.precoMinimo) {
    return MENSAGENS_ERRO.precoInvalido;
  }
  if (num > LIMITES.precoMaximo) {
    return `Preço máximo permitido: ${LIMITES.precoMaximo.toLocaleString('pt-BR')}.`;
  }
  return null;
}

/**
 * Valida duração em minutos.
 */
export function validarDuracao(valor: string | number): string | null {
  const num = typeof valor === 'string' ? parseInt(valor, 10) : valor;
  if (isNaN(num) || num < LIMITES.duracaoMinima) {
    return `Duração mínima: ${LIMITES.duracaoMinima} minutos.`;
  }
  if (num > LIMITES.duracaoMaxima) {
    return `Duração máxima: ${LIMITES.duracaoMaxima} minutos.`;
  }
  return null;
}

/**
 * Valida percentual de sinal (10-100).
 */
export function validarPercentualSinal(valor: string | number): string | null {
  const num = typeof valor === 'string' ? parseInt(valor, 10) : valor;
  if (isNaN(num) || num < LIMITES.percentualSinalMinimo) {
    return `Sinal mínimo: ${LIMITES.percentualSinalMinimo}%.`;
  }
  if (num > LIMITES.percentualSinalMaximo) {
    return `Sinal máximo: ${LIMITES.percentualSinalMaximo}%.`;
  }
  return null;
}

/**
 * Valida desconto percentual (0-100).
 */
export function validarDescontoPercentual(valor: string | number): string | null {
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
  if (isNaN(num) || num < 0) {
    return 'Desconto não pode ser negativo.';
  }
  if (num > LIMITES.descontoPercentualMaximo) {
    return `Desconto máximo: ${LIMITES.descontoPercentualMaximo}%.`;
  }
  return null;
}

/**
 * Valida desconto em valor (não pode exceder preço do plano).
 */
export function validarDescontoValor(valor: string | number, precoPlano: number): string | null {
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
  if (isNaN(num) || num < 0) {
    return 'Desconto não pode ser negativo.';
  }
  if (num > precoPlano) {
    return 'O desconto não pode passar do valor do plano.';
  }
  return null;
}

/**
 * Valida arquivo de imagem (tamanho e tipo).
 */
export function validarArquivoImagem(arquivo: File): string | null {
  if (!arquivo.type.startsWith('image/')) {
    return 'O arquivo deve ser uma imagem.';
  }
  const maxBytes = LIMITES.arquivoImagemMaximoMB * 1024 * 1024;
  if (arquivo.size > maxBytes) {
    return MENSAGENS_ERRO.arquivoGrandeImagem;
  }
  return null;
}

/**
 * Valida arquivo de vídeo (tamanho e tipo).
 */
export function validarArquivoVideo(arquivo: File): string | null {
  if (!arquivo.type.startsWith('video/')) {
    return 'O arquivo deve ser um vídeo.';
  }
  const maxBytes = LIMITES.arquivoVideoMaximoMB * 1024 * 1024;
  if (arquivo.size > maxBytes) {
    return MENSAGENS_ERRO.arquivoGrandeVideo;
  }
  return null;
}

/**
 * Valida se pelo menos um serviço foi selecionado.
 */
export function validarServicosSelecionados(idsSelecionados: string[]): string | null {
  if (idsSelecionados.length === 0) {
    return MENSAGENS_ERRO.servicosObrigatorios;
  }
  return null;
}

/**
 * Valida nome do cliente para fila/agendamento.
 */
export function validarNomeCliente(valor: string): string | null {
  const erroObrigatorio = validarObrigatorio(valor, 'Nome');
  if (erroObrigatorio) return MENSAGENS_ERRO.nomeClienteObrigatorio;
  const erroTamanho = validarTamanho(valor, LIMITES.nomeMinimo, LIMITES.nomeMaximo, 'Nome');
  if (erroTamanho) return erroTamanho;
  return null;
}

/**
 * Valida formulário de login completo.
 */
export function validarLogin(email: string, senha: string): Record<string, string | null> {
  return {
    email: validarObrigatorio(email, 'E-mail') || validarEmail(email),
    senha: validarObrigatorio(senha, 'Senha') || validarSenha(senha),
  };
}

/**
 * Valida formulário de cadastro cliente.
 */
export function validarCadastroCliente(dados: {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
}): Record<string, string | null> {
  return {
    nome: validarObrigatorio(dados.nome, 'Nome') || validarTamanho(dados.nome, LIMITES.nomeMinimo, LIMITES.nomeMaximo, 'Nome'),
    email: validarObrigatorio(dados.email, 'E-mail') || validarEmail(dados.email),
    senha: validarObrigatorio(dados.senha, 'Senha') || validarSenha(dados.senha),
    confirmarSenha: validarObrigatorio(dados.confirmarSenha, 'Confirmação') || validarConfirmarSenha(dados.senha, dados.confirmarSenha),
  };
}

/**
 * Valida formulário de cadastro profissional (barbeiro/salão).
 */
export function validarCadastroProfissional(dados: {
  nomeEstabelecimento: string;
  responsavel: string;
  cidade: string;
  endereco: string;
  whatsapp: string;
  nicho: string;
}): Record<string, string | null> {
  return {
    nomeEstabelecimento: validarObrigatorio(dados.nomeEstabelecimento, 'Nome do estabelecimento') || validarTamanho(dados.nomeEstabelecimento, LIMITES.nomeMinimo, LIMITES.nomeMaximo, 'Nome do estabelecimento'),
    responsavel: validarObrigatorio(dados.responsavel, 'Responsável') || validarTamanho(dados.responsavel, LIMITES.nomeMinimo, LIMITES.nomeMaximo, 'Responsável'),
    cidade: validarObrigatorio(dados.cidade, 'Cidade') || validarTamanho(dados.cidade, LIMITES.nomeMinimo, LIMITES.cidadeMaxima, 'Cidade'),
    endereco: validarObrigatorio(dados.endereco, 'Endereço') || validarTamanho(dados.endereco, LIMITES.nomeMinimo, LIMITES.enderecoMaximo, 'Endereço'),
    whatsapp: validarObrigatorio(dados.whatsapp, 'WhatsApp') || validarCampoWhatsapp(dados.whatsapp),
    nicho: validarObrigatorio(dados.nicho, 'Nicho'),
  };
}

/**
 * Valida formulário de serviço.
 */
export function validarServico(dados: {
  nome: string;
  preco: string | number;
  duracaoMinutos: string | number;
  tag: string;
}): Record<string, string | null> {
  return {
    nome: validarObrigatorio(dados.nome, 'Nome do serviço') || validarTamanho(dados.nome, LIMITES.nomeMinimo, LIMITES.nomeMaximo, 'Nome do serviço'),
    preco: validarObrigatorio(String(dados.preco), 'Preço') || validarPreco(dados.preco),
    duracaoMinutos: validarObrigatorio(String(dados.duracaoMinutos), 'Duração') || validarDuracao(dados.duracaoMinutos),
    tag: validarObrigatorio(dados.tag, 'Tipo'),
  };
}

/**
 * Valida formulário de agendamento.
 */
export function validarAgendamento(dados: {
  servicoIds: string[];
  dia: string;
  horario: string;
  nomeCliente: string;
  telefoneCliente: string;
}): Record<string, string | null> {
  return {
    servicoIds: validarServicosSelecionados(dados.servicoIds),
    dia: validarObrigatorio(dados.dia, 'Dia'),
    horario: validarObrigatorio(dados.horario, 'Horário'),
    nomeCliente: validarNomeCliente(dados.nomeCliente),
    telefoneCliente: validarCampoWhatsapp(dados.telefoneCliente),
  };
}

/**
 * Valida formulário de avaliação.
 */
export function validarAvaliacao(dados: {
  nome: string;
  estrelas: number;
  comentario: string;
}): Record<string, string | null> {
  return {
    nome: validarObrigatorio(dados.nome, 'Nome') || validarTamanho(dados.nome, LIMITES.nomeMinimo, LIMITES.nomeMaximo, 'Nome'),
    estrelas: dados.estrelas >= 1 && dados.estrelas <= 5 ? null : 'Selecione uma nota de 1 a 5.',
    comentario: validarObrigatorio(dados.comentario, 'Comentário') || validarTamanho(dados.comentario, 1, 400, 'Comentário'),
  };
}

/**
 * Valida formulário de publicação no feed.
 */
export function validarPublicacao(dados: {
  legenda: string;
  arquivo?: File;
}): Record<string, string | null> {
  const erros: Record<string, string | null> = {
    legenda: null,
    arquivo: null,
  };

  if (!dados.legenda.trim() && !dados.arquivo) {
    erros.legenda = 'Escreva uma legenda ou escolha uma mídia.';
  } else if (dados.legenda.length > LIMITES.legendaMaxima) {
    erros.legenda = `Legenda muito longa (máx. ${LIMITES.legendaMaxima} caracteres).`;
  }

  if (dados.arquivo) {
    if (dados.arquivo.type.startsWith('image/')) {
      erros.arquivo = validarArquivoImagem(dados.arquivo);
    } else if (dados.arquivo.type.startsWith('video/')) {
      erros.arquivo = validarArquivoVideo(dados.arquivo);
    } else {
      erros.arquivo = 'Tipo de arquivo não suportado.';
    }
  }

  return erros;
}

/**
 * Verifica se objeto de erros tem algum erro.
 */
export function temErros(erros: Record<string, string | null>): boolean {
  return Object.values(erros).some((e) => e !== null);
}

/**
 * Retorna o primeiro erro encontrado.
 */
export function primeiroErro(erros: Record<string, string | null>): string | null {
  for (const erro of Object.values(erros)) {
    if (erro) return erro;
  }
  return null;
}