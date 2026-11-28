/**
 * Regras puras de negócio do domínio Feed.
 * Zero dependências de React, < 30 linhas cada, early returns, constantes no topo.
 */

import type {
  Publicacao,
  PublicacaoInput,
  PublicacaoTipo,
  ComentarioInput,
  FeedFiltros,
  FeedOrdenacao,
  Recomendacao,
  InspiracaoCategoria,
  InspiracaoInput,
} from '../types';

// Constantes
const TAMANHO_MAXIMO_PUBLICACAO = 2000;
const TAMANHO_MINIMO_PUBLICACAO = 1;
const TAMANHO_MAXIMO_COMENTARIO = 1000;
const TAMANHO_MAXIMO_INSPIRACAO = 500;
const TIPOS_VALIDOS: PublicacaoTipo[] = ['corte', 'barba', 'combo', 'inspiracao', 'dica', 'outro'];
const CATEGORIAS_INSPIRACAO: InspiracaoCategoria[] = ['classico', 'moderno', 'degrade', 'barba', 'colorido', 'infantil', 'outro'];
const PESO_RECENCIA = 0.4;
const PESO_POPULARIDADE = 0.35;
const PESO_RELEVANCIA = 0.25;
const LIMITE_RECOMENDACOES = 10;

/**
 * Valida uma publicação antes de criar/atualizar.
 * @returns null se válido, string com erro se inválido
 */
export function validarPublicacao(input: PublicacaoInput): string | null {
  if (!input.conteudo || !input.conteudo.trim()) {
    return 'Conteúdo da publicação é obrigatório';
  }
  if (input.conteudo.trim().length < TAMANHO_MINIMO_PUBLICACAO) {
    return 'Conteúdo muito curto';
  }
  if (input.conteudo.trim().length > TAMANHO_MAXIMO_PUBLICACAO) {
    return `Conteúdo excede ${TAMANHO_MAXIMO_PUBLICACAO} caracteres`;
  }
  if (!input.tipo || !TIPOS_VALIDOS.includes(input.tipo)) {
    return 'Tipo de publicação inválido';
  }
  if (input.midias && input.midias.length > 10) {
    return 'Máximo de 10 mídias por publicação';
  }
  if (input.midias) {
    for (const midia of input.midias) {
      if (!midia.src || !midia.tipo) {
        return 'Mídia inválida: src e tipo são obrigatórios';
      }
      if (!['imagem', 'video'].includes(midia.tipo)) {
        return 'Tipo de mídia deve ser imagem ou video';
      }
    }
  }
  return null;
}

/**
 * Valida um comentário.
 */
export function validarComentario(input: ComentarioInput): string | null {
  if (!input.texto || !input.texto.trim()) {
    return 'Comentário não pode ser vazio';
  }
  if (input.texto.trim().length > TAMANHO_MAXIMO_COMENTARIO) {
    return `Comentário excede ${TAMANHO_MAXIMO_COMENTARIO} caracteres`;
  }
  return null;
}

/**
 * Valida uma inspiração.
 */
export function validarInspiracao(input: InspiracaoInput): string | null {
  if (!input.titulo || !input.titulo.trim()) {
    return 'Título da inspiração é obrigatório';
  }
  if (!input.categoria || !CATEGORIAS_INSPIRACAO.includes(input.categoria)) {
    return 'Categoria de inspiração inválida';
  }
  if (input.descricao && input.descricao.length > TAMANHO_MAXIMO_INSPIRACAO) {
    return `Descrição excede ${TAMANHO_MAXIMO_INSPIRACAO} caracteres`;
  }
  if (!input.midias || input.midias.length === 0) {
    return 'Pelo menos uma mídia é obrigatória para inspiração';
  }
  if (input.midias.length > 5) {
    return 'Máximo de 5 mídias por inspiração';
  }
  for (const midia of input.midias) {
    if (!midia.src || midia.tipo !== 'imagem') {
      return 'Inspirações aceitam apenas imagens';
    }
  }
  return null;
}

/**
 * Computa score de recomendação para uma publicação.
 * Score = (recencia * 0.4) + (popularidade * 0.35) + (relevancia * 0.25)
 */
export function computarScoreRecomendacao(
  publicacao: Publicacao,
  agora: Date = new Date()
): number {
  const idadeHoras = (agora.getTime() - new Date(publicacao.criadoEm).getTime()) / (1000 * 60 * 60);
  const recencia = Math.max(0, 1 - idadeHoras / (24 * 7)); // Decai em 1 semana
  const popularidade = Math.min(1, (publicacao.curtidas + publicacao.comentarios * 2) / 100);
  const relevancia = publicacao.estaSalvo ? 1 : publicacao.autorSeguido ? 0.7 : 0.3;

  return (
    recencia * PESO_RECENCIA +
    popularidade * PESO_POPULARIDADE +
    relevancia * PESO_RELEVANCIA
  );
}

/**
 * Ordena publicações por critério.
 */
export function ordenarPublicacoes(
  publicacoes: Publicacao[],
  ordenacao: FeedOrdenacao
): Publicacao[] {
  const copia = [...publicacoes];
  switch (ordenacao) {
    case 'recentes':
      return copia.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
    case 'populares':
      return copia.sort((a, b) => (b.curtidas + b.comentarios * 2) - (a.curtidas + a.comentarios * 2));
    case 'relevantes':
      return copia.sort((a, b) => computarScoreRecomendacao(b) - computarScoreRecomendacao(a));
    default:
      return copia;
  }
}

/**
 * Filtra publicações conforme critérios.
 */
export function filtrarPublicacoes(
  publicacoes: Publicacao[],
  filtros: FeedFiltros
): Publicacao[] {
  return publicacoes.filter((p) => {
    if (filtros.tipo && p.tipo !== filtros.tipo) return false;
    if (filtros.autorId && p.autorId !== filtros.autorId) return false;
    if (filtros.salvos && !p.estaSalvo) return false;
    if (filtros.seguidos && !p.autorSeguido) return false;
    if (filtros.dataInicio && new Date(p.criadoEm) < new Date(filtros.dataInicio)) return false;
    if (filtros.dataFim && new Date(p.criadoEm) > new Date(filtros.dataFim)) return false;
    if (filtros.busca) {
      const termo = filtros.busca.toLowerCase();
      const conteudo = p.conteudo.toLowerCase();
      const autor = p.autorNome?.toLowerCase() || '';
      if (!conteudo.includes(termo) && !autor.includes(termo)) return false;
    }
    return true;
  });
}

/**
 * Gera recomendações personalizadas baseadas no histórico do usuário.
 */
export function gerarRecomendacoes(
  publicacoes: Publicacao[],
  publicacoesInteragidas: Set<string>,
  autoresSeguidos: Set<string>,
  limite: number = LIMITE_RECOMENDACOES
): Recomendacao[] {
  const candidatas = publicacoes.filter((p) => !publicacoesInteragidas.has(p.id));

  const comScore = candidatas.map((p) => ({
    publicacao: p,
    score: computarScoreRecomendacao(p),
    motivo: autoresSeguidos.has(p.autorId) ? 'autor_seguido' : 'popular' as const,
  }));

  return comScore
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(({ publicacao, score, motivo }) => ({
      id: `rec-${publicacao.id}`,
      tipo: 'publicacao' as const,
      itemId: publicacao.id,
      score,
      motivo,
    }));
}

/**
 * Agrupa publicações por data (para separadores no feed).
 */
export function agruparPorData(publicacoes: Publicacao[]): Record<string, Publicacao[]> {
  return publicacoes.reduce((acc, p) => {
    const data = new Date(p.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!acc[data]) acc[data] = [];
    acc[data].push(p);
    return acc;
  }, {} as Record<string, Publicacao[]>);
}

/**
 * Calcula tempo relativo para exibição (ex: "2h atrás").
 */
export function calcularTempoRelativo(data: string | Date | number): string {
  const timestamp = typeof data === 'number' ? data : new Date(data).getTime();
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHoras < 24) return `${diffHoras}h atrás`;
  if (diffDias < 7) return `${diffDias}d atrás`;
  return new Date(timestamp).toLocaleDateString('pt-BR');
}

/**
 * Extrai hashtags de um texto.
 */
export function extrairHashtags(texto: string): string[] {
  const regex = /#[\p{L}\p{N}_]+/gu;
  const matches = texto.match(regex);
  return matches ? [...new Set(matches.map((h) => h.toLowerCase()))] : [];
}

/**
 * Extrai menções de um texto.
 */
export function extrairMencoes(texto: string): string[] {
  const regex = /@[\p{L}\p{N}_]+/gu;
  const matches = texto.match(regex);
  return matches ? [...new Set(matches.map((m) => m.toLowerCase()))] : [];
}

/**
 * Sanitiza conteúdo de publicação (remove scripts, etc).
 */
export function sanitizarConteudo(conteudo: string): string {
  return conteudo
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * Verifica se publicação é de vídeo.
 */
export function ehVideo(publicacao: Publicacao): boolean {
  return publicacao.midias?.some((m) => m.tipo === 'video') ?? false;
}

/**
 * Obtém primeira imagem da publicação para preview.
 */
export function obterPrimeiraImagem(publicacao: Publicacao): string | null {
  return publicacao.midias?.find((m) => m.tipo === 'imagem')?.src ?? null;
}

/**
 * Cria erro padronizado para feed.
 */
export function criarFeedError(mensagem: string, codigo: string = 'FEED_ERROR'): Error & { codigo: string } {
  const error = new Error(mensagem) as Error & { codigo: string };
  error.codigo = codigo;
  return error;
}

/**
 * Trata erros de API e retorna Result padronizado.
 */
export function handleApiError(status: number, errorData: unknown): { sucesso: false; erro: string; codigo: string } {
  const mensagem = (errorData as Record<string, unknown>)?.mensagem as string || 'Erro desconhecido';
  const codigo = (errorData as Record<string, unknown>)?.codigo as string || 'API_ERROR';

  switch (status) {
    case 400: return { sucesso: false, erro: mensagem, codigo: 'VALIDATION_ERROR' };
    case 401: return { sucesso: false, erro: 'Não autorizado', codigo: 'UNAUTHORIZED' };
    case 403: return { sucesso: false, erro: 'Acesso negado', codigo: 'FORBIDDEN' };
    case 404: return { sucesso: false, erro: 'Não encontrado', codigo: 'NOT_FOUND' };
    case 409: return { sucesso: false, erro: mensagem, codigo: 'CONFLICT' };
    case 422: return { sucesso: false, erro: mensagem, codigo: 'UNPROCESSABLE_ENTITY' };
    case 429: return { sucesso: false, erro: 'Muitas requisições', codigo: 'RATE_LIMITED' };
    case 500: return { sucesso: false, erro: 'Erro interno do servidor', codigo: 'SERVER_ERROR' };
    default: return { sucesso: false, erro: mensagem, codigo };
  }
}

/** Tipo de resultado padronizado para serviços */
export type FeedResult<T> = { sucesso: true; dados: T } | { sucesso: false; erro: string; codigo: string };