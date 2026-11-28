import {
  criarPublicacao,
  buscarPublicacaoPorId,
  listarPorEstabelecimento,
  listarFeedPublico,
  curtirPublicacao,
  compartilharPublicacao,
  deletarPublicacao
} from '@/repositories/feed.repository';
import { buscarPorId as buscarEstabelecimento } from '@/repositories/estabelecimento.repository';
import { AppError } from '@/middlewares/errorHandler';

export interface PublicacaoResponse {
  id: string;
  estabelecimentoId: string;
  autorId: string;
  legenda: string | null;
  arquivoUrl: string | null;
  tipo: 'imagem' | 'video';
  curtidas: number;
  compartilhamentos: number;
  dataCriacao: Date;
}

interface PublicacaoRow {
  id: string;
  estabelecimento_id: string;
  autor_id: string;
  legenda: string | null;
  arquivo_url: string | null;
  tipo: 'imagem' | 'video';
  curtidas: number;
  compartilhamentos: number;
  data_criacao: Date;
}

function mapPublicacao(row: PublicacaoRow): PublicacaoResponse {
  return {
    id: row.id,
    estabelecimentoId: row.estabelecimento_id,
    autorId: row.autor_id,
    legenda: row.legenda,
    arquivoUrl: row.arquivo_url,
    tipo: row.tipo,
    curtidas: row.curtidas,
    compartilhamentos: row.compartilhamentos,
    dataCriacao: row.data_criacao
  };
}

export async function criarPublicacaoService(
  estabelecimentoId: string,
  autorId: string,
  data: { legenda?: string; arquivoUrl?: string; tipo: 'imagem' | 'video' }
): Promise<PublicacaoResponse> {
  // Verificar se estabelecimento existe e está aprovado
  const estabelecimento = await buscarEstabelecimento(estabelecimentoId);
  if (!estabelecimento) {
    throw new AppError(404, 'Estabelecimento não encontrado', 'ESTABELECIMENTO_NOT_FOUND');
  }
  if (estabelecimento.status !== 'aprovado') {
    throw new AppError(403, 'Estabelecimento não está aprovado para publicações', 'FORBIDDEN');
  }

  const publicacao = await criarPublicacao(
    { estabelecimentoId, ...data },
    autorId
  );
  return mapPublicacao(publicacao);
}

export async function listarFeedEstabelecimento(
  estabelecimentoId: string,
  pagina = 1,
  limite = 20
): Promise<{ publicacoes: PublicacaoResponse[]; total: number; pagina: number; totalPaginas: number }> {
  const { publicacoes, total } = await listarPorEstabelecimento(estabelecimentoId, pagina, limite);
  return {
    publicacoes: publicacoes.map(mapPublicacao),
    total,
    pagina,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function listarFeedPublicoService(
  estabelecimentoId: string,
  pagina = 1,
  limite = 20
): Promise<{ publicacoes: PublicacaoResponse[]; total: number; pagina: number; totalPaginas: number }> {
  const estabelecimento = await buscarEstabelecimento(estabelecimentoId);
  if (!estabelecimento || estabelecimento.status !== 'aprovado') {
    throw new AppError(404, 'Estabelecimento não encontrado', 'ESTABELECIMENTO_NOT_FOUND');
  }

  const { publicacoes, total } = await listarFeedPublico(estabelecimentoId, pagina, limite);
  return {
    publicacoes: publicacoes.map(mapPublicacao),
    total,
    pagina,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function curtirPublicacaoService(id: string): Promise<PublicacaoResponse> {
  const publicacao = await curtirPublicacao(id);
  if (!publicacao) {
    throw new AppError(404, 'Publicação não encontrada', 'PUBLICACAO_NOT_FOUND');
  }
  return mapPublicacao(publicacao);
}

export async function compartilharPublicacaoService(id: string): Promise<PublicacaoResponse> {
  const publicacao = await compartilharPublicacao(id);
  if (!publicacao) {
    throw new AppError(404, 'Publicação não encontrada', 'PUBLICACAO_NOT_FOUND');
  }
  return mapPublicacao(publicacao);
}

export async function deletarPublicacaoService(id: string, autorId: string): Promise<void> {
  const publicacao = await buscarPublicacaoPorId(id);
  if (!publicacao) {
    throw new AppError(404, 'Publicação não encontrada', 'PUBLICACAO_NOT_FOUND');
  }
  if (publicacao.autor_id !== autorId) {
    throw new AppError(403, 'Não autorizado a deletar esta publicação', 'FORBIDDEN');
  }

  const deleted = await deletarPublicacao(id, autorId);
  if (!deleted) {
    throw new AppError(404, 'Publicação não encontrada', 'PUBLICACAO_NOT_FOUND');
  }
}