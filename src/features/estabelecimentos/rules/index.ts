/**
 * Regras de negócio puras do domínio de Estabelecimentos.
 * Zero dependências de React, < 30 linhas cada, early returns, constantes.
 */

import type {
  Estabelecimento,
  Servico,
  ServicoInput,
  GaleriaItemInput,
  FiltrosBusca,
  EstabelecimentoComputado,
  EstabelecimentoError,
  EstabelecimentoErrorCode,
  NichoEstabelecimento,
} from '../types';
import { ESTABELECIMENTO_CONSTANTES } from '../types';

/**
 * Valida dados de criação/edição de estabelecimento
 */
export function validarEstabelecimento(dados: Partial<Estabelecimento>): string | null {
  if (dados.nome !== undefined) {
    if (!dados.nome || dados.nome.trim().length < ESTABELECIMENTO_CONSTANTES.NOME_MIN_LENGTH) {
      return `Nome deve ter pelo menos ${ESTABELECIMENTO_CONSTANTES.NOME_MIN_LENGTH} caracteres`;
    }
    if (dados.nome.trim().length > ESTABELECIMENTO_CONSTANTES.NOME_MAX_LENGTH) {
      return `Nome deve ter no máximo ${ESTABELECIMENTO_CONSTANTES.NOME_MAX_LENGTH} caracteres`;
    }
  }

  if (dados.sobre !== undefined && dados.sobre.length > ESTABELECIMENTO_CONSTANTES.SOBRE_MAX_LENGTH) {
    return `Descrição deve ter no máximo ${ESTABELECIMENTO_CONSTANTES.SOBRE_MAX_LENGTH} caracteres`;
  }

  if (dados.cidade !== undefined && dados.cidade.length > ESTABELECIMENTO_CONSTANTES.CIDADE_MAX_LENGTH) {
    return `Cidade deve ter no máximo ${ESTABELECIMENTO_CONSTANTES.CIDADE_MAX_LENGTH} caracteres`;
  }

  if (dados.endereco !== undefined && dados.endereco.length > ESTABELECIMENTO_CONSTANTES.ENDERECO_MAX_LENGTH) {
    return `Endereço deve ter no máximo ${ESTABELECIMENTO_CONSTANTES.ENDERECO_MAX_LENGTH} caracteres`;
  }

  if (dados.whatsapp !== undefined && !ESTABELECIMENTO_CONSTANTES.WHATSAPP_PATTERN.test(dados.whatsapp)) {
    return 'WhatsApp inválido. Use formato (XX) XXXXX-XXXX';
  }

  if (dados.nicho !== undefined && !['barbearia', 'feminino', 'visagismo', 'infantil'].includes(dados.nicho)) {
    return 'Nichos válidos: barbearia, feminino, visagismo, infantil';
  }

  if (dados.status !== undefined && !['aprovado', 'pendente', 'rejeitado'].includes(dados.status)) {
    return 'Status inválido';
  }

  return null;
}

/**
 * Valida entrada de serviço
 */
export function validarServico(input: ServicoInput): string | null {
  if (!input.nome || input.nome.trim().length < ESTABELECIMENTO_CONSTANTES.SERVICO_NOME_MIN) {
    return `Nome do serviço deve ter pelo menos ${ESTABELECIMENTO_CONSTANTES.SERVICO_NOME_MIN} caracteres`;
  }
  if (input.nome.trim().length > ESTABELECIMENTO_CONSTANTES.SERVICO_NOME_MAX) {
    return `Nome do serviço deve ter no máximo ${ESTABELECIMENTO_CONSTANTES.SERVICO_NOME_MAX} caracteres`;
  }
  if (input.preco < ESTABELECIMENTO_CONSTANTES.SERVICO_PRECO_MIN || input.preco > ESTABELECIMENTO_CONSTANTES.SERVICO_PRECO_MAX) {
    return `Preço deve ser entre ${ESTABELECIMENTO_CONSTANTES.SERVICO_PRECO_MIN} e ${ESTABELECIMENTO_CONSTANTES.SERVICO_PRECO_MAX}`;
  }
  if (input.duracaoMinutos < ESTABELECIMENTO_CONSTANTES.SERVICO_DURACAO_MIN || input.duracaoMinutos > ESTABELECIMENTO_CONSTANTES.SERVICO_DURACAO_MAX) {
    return `Duração deve ser entre ${ESTABELECIMENTO_CONSTANTES.SERVICO_DURACAO_MIN} e ${ESTABELECIMENTO_CONSTANTES.SERVICO_DURACAO_MAX} minutos`;
  }
  if (!input.tag || input.tag.trim().length === 0) {
    return 'Tag é obrigatória';
  }
  if (input.tag.trim().length > ESTABELECIMENTO_CONSTANTES.TAG_MAX_LENGTH) {
    return `Tag deve ter no máximo ${ESTABELECIMENTO_CONSTANTES.TAG_MAX_LENGTH} caracteres`;
  }
  return null;
}

/**
 * Valida item de galeria
 */
export function validarGaleriaItem(input: GaleriaItemInput): string | null {
  if (!input.src || input.src.trim().length === 0) {
    return 'URL da imagem/vídeo é obrigatória';
  }
  try {
    new URL(input.src);
  } catch {
    return 'URL inválida';
  }
  return null;
}

/**
 * Valida avaliação
 */
export function validarAvaliacao(nota: number, comentario?: string): string | null {
  if (nota < ESTABELECIMENTO_CONSTANTES.AVALIACAO_NOTA_MIN || nota > ESTABELECIMENTO_CONSTANTES.AVALIACAO_NOTA_MAX) {
    return `Nota deve ser entre ${ESTABELECIMENTO_CONSTANTES.AVALIACAO_NOTA_MIN} e ${ESTABELECIMENTO_CONSTANTES.AVALIACAO_NOTA_MAX}`;
  }
  if (comentario && comentario.length > ESTABELECIMENTO_CONSTANTES.AVALIACAO_COMENTARIO_MAX) {
    return `Comentário deve ter no máximo ${ESTABELECIMENTO_CONSTANTES.AVALIACAO_COMENTARIO_MAX} caracteres`;
  }
  return null;
}

/**
 * Valida configuração Pix
 */
export function validarConfiguracaoPix(config: { modo: string; chave: string; percentualSinal: number }): string | null {
  if (!['desativado', 'opcional', 'obrigatorio'].includes(config.modo)) {
    return 'Modo Pix inválido';
  }
  if (config.modo !== 'desativado' && (!config.chave || config.chave.trim().length === 0)) {
    return 'Chave Pix é obrigatória quando modo não é desativado';
  }
  if (config.chave.length > 100) {
    return 'Chave Pix muito longa (máx. 100 caracteres)';
  }
  if (config.percentualSinal < 0 || config.percentualSinal > 100) {
    return 'Percentual de sinal deve ser entre 0 e 100';
  }
  return null;
}

/**
 * Computa estabelecimento para exibição (marketplace)
 */
export function computarEstabelecimento(
  est: Estabelecimento,
  localizacaoUsuario?: { latitude: number; longitude: number }
): EstabelecimentoComputado {
  const servicosComMidia = est.servicos.filter((s) => s.midias && s.midias.length > 0);
  const totalAvaliacoes = est.avaliacoes.length;
  const avaliacaoMedia = totalAvaliacoes > 0
    ? est.avaliacoes.reduce((acc, a) => acc + a.estrelas, 0) / totalAvaliacoes
    : 0;

  let distanciaKm: number | undefined;
  if (localizacaoUsuario) {
    const R = 6371;
    const dLat = ((est.latitude - localizacaoUsuario.latitude) * Math.PI) / 180;
    const dLon = ((est.longitude - localizacaoUsuario.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((localizacaoUsuario.latitude * Math.PI) / 180) *
      Math.cos((est.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    distanciaKm = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
  }

  const temVagasHoje = est.servicos.length > 0;

  let horarioDisponivelHoje: string | undefined;
  if (temVagasHoje) {
    const primeiroServico = est.servicos.reduce((min, s) => s.preco < min.preco ? s : min);
    horarioDisponivelHoje = `A partir de R$ ${primeiroServico.preco.toFixed(2).replace('.', ',')}`;
  }

  return {
    estabelecimento: est,
    distanciaKm,
    horarioDisponivelHoje,
    servicosComMidia,
    avaliacaoMedia: Number(avaliacaoMedia.toFixed(1)),
    totalAvaliacoes,
    temVagasHoje,
  };
}

/**
 * Ordena estabelecimentos por critério
 */
export function ordenarEstabelecimentos(
  estabelecimentos: EstabelecimentoComputado[],
  ordenacao: FiltrosBusca['ordenacao']
): EstabelecimentoComputado[] {
  const copia = [...estabelecimentos];
  switch (ordenacao) {
    case 'avaliacao':
      return copia.sort((a, b) => b.avaliacaoMedia - a.avaliacaoMedia);
    case 'preco':
      return copia.sort((a, b) => {
        const pa = a.estabelecimento.servicos.length ? Math.min(...a.estabelecimento.servicos.map((s) => s.preco)) : 9999;
        const pb = b.estabelecimento.servicos.length ? Math.min(...b.estabelecimento.servicos.map((s) => s.preco)) : 9999;
        return pa - pb;
      });
    case 'fila':
      return copia.sort((a, b) => a.estabelecimento.fila.length - b.estabelecimento.fila.length);
    case 'distancia':
      return copia.sort((a, b) => (a.distanciaKm || 999) - (b.distanciaKm || 999));
    default:
      return copia;
  }
}

/**
 * Filtra estabelecimentos por critérios
 */
export function filtrarEstabelecimentos(
  estabelecimentos: Estabelecimento[],
  filtros: FiltrosBusca
): Estabelecimento[] {
  return estabelecimentos.filter((e) => {
    if (e.status !== 'aprovado') return false;
    if (filtros.nicho !== 'todos' && e.nicho !== filtros.nicho) return false;
    const precoMin = e.servicos.length ? Math.min(...e.servicos.map((s) => s.preco)) : 0;
    if (precoMin > filtros.precoMaximo) return false;
    if ((e.avaliacao || 0) < filtros.avaliacaoMinima) return false;
    if (filtros.tipoServico && !e.servicos.some((s) => s.tag === filtros.tipoServico)) return false;
    if (filtros.apenasBemAvaliados && (e.avaliacao || 0) < 4.8) return false;
    if (filtros.apenasVagasHoje && e.servicos.length === 0) return false;
    return true;
  });
}

/**
 * Gera slug a partir do nome
 */
export function gerarSlug(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Obtém cor padrão por nicho
 */
export function obterCorNicho(nicho: NichoEstabelecimento): string {
  const cores: Record<NichoEstabelecimento, string> = {
    barbearia: '#B45309',
    feminino: '#E8508A',
    visagismo: '#7C3AED',
    infantil: '#FB923C',
  };
  return cores[nicho] || '#6366F1';
}

/**
 * Cria erro tipado
 */
export function criarEstabelecimentoError(code: EstabelecimentoErrorCode, message: string, campo?: string): EstabelecimentoError {
  const error = new Error(message) as EstabelecimentoError;
  error.code = code;
  if (campo) error.campo = campo;
  return error;
}

/**
 * Verifica se estabelecimento está aberto agora
 */
export function estaAbertoAgora(_estabelecimento: Estabelecimento): boolean {
  // Simulação simples - em produção parsearia horarioFuncionamento
  const agora = new Date();
  const hora = agora.getHours();
  const diaSemana = agora.getDay(); // 0 = domingo
  if (diaSemana === 0) return false;
  return hora >= 9 && hora < 18;
}

/**
 * Calcula tempo médio de espera na fila
 */
export function calcularEsperaFila(estabelecimento: Estabelecimento): number {
  return estabelecimento.fila.length * (estabelecimento.tempoMedioAtendimento ?? 20);
}

/**
 * Obtém serviços mais populares
 */
export function obterServicosPopulares(estabelecimento: Estabelecimento, agendamentos: Array<{ servicoIds: string[] }>): Array<{ servico: Servico; quantidade: number }> {
  const contagem: Record<string, number> = {};
  agendamentos.forEach((a) => {
    a.servicoIds.forEach((id) => {
      contagem[id] = (contagem[id] || 0) + 1;
    });
  });
  return Object.entries(contagem)
    .map(([id, quantidade]) => ({
      servico: estabelecimento.servicos.find((s) => s.id === id)!,
      quantidade,
    }))
    .filter((item) => item.servico)
    .sort((a, b) => b.quantidade - a.quantidade);
}