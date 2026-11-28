import { criarEstabelecimento, buscarPorSlug, buscarPorId, listarAprovados, atualizarEstabelecimento } from '@/repositories/estabelecimento.repository';
import type { EstabelecimentoInput } from '@/validators/schemas';
import { AppError } from '@/middlewares/errorHandler';

export async function criar(data: EstabelecimentoInput, usuarioId: string) {
  const existente = await buscarPorSlug(data.slug);
  if (existente) {
    throw new AppError(409, 'Slug já em uso', 'SLUG_EXISTS');
  }

  return criarEstabelecimento(data, usuarioId);
}

export async function buscarPublicoPorSlug(slug: string) {
  const estab = await buscarPorSlug(slug);
  if (!estab) return null;

  return {
    id: estab.id,
    slug: estab.slug,
    nome: estab.nome,
    responsavel: estab.responsavel,
    cidade: estab.cidade,
    nicho: estab.nicho,
    whatsapp: estab.whatsapp,
    endereco: estab.endereco,
    sobre: estab.sobre,
    latitude: estab.latitude,
    longitude: estab.longitude,
    temaCor: estab.tema_cor,
    temaLayout: estab.tema_layout,
    temaTitulo: estab.tema_titulo,
    temaSubtitulo: estab.tema_subtitulo,
    tempoMedioAtendimento: estab.tempo_medio_atendimento,
    horarioFuncionamento: estab.horario_funcionamento,
    permiteAutoEdicao: estab.permite_auto_edicao,
    configuracaoPixModo: estab.configuracao_pix_modo,
    configuracaoPixPercentualSinal: estab.configuracao_pix_percentual_sinal,
    seguidores: estab.seguidores,
    taxaFidelidade: estab.taxa_fidelidade,
    avaliacao: 0, // TODO: calcular média
    dataCriacao: estab.data_criacao,
    dataAtualizacao: estab.data_atualizacao,
  };
}

export async function buscarPorIdCompleto(id: string) {
  return buscarPorId(id);
}

export async function listarPublicos(filtros?: { nicho?: string; cidade?: string }) {
  const estabelecimentos = await listarAprovados(filtros);
  return estabelecimentos.map(e => ({
    id: e.id,
    slug: e.slug,
    nome: e.nome,
    responsavel: e.responsavel,
    cidade: e.cidade,
    nicho: e.nicho,
    whatsapp: e.whatsapp,
    endereco: e.endereco,
    sobre: e.sobre,
    latitude: e.latitude,
    longitude: e.longitude,
    temaCor: e.tema_cor,
    temaLayout: e.tema_layout,
    temaTitulo: e.tema_titulo,
    temaSubtitulo: e.tema_subtitulo,
    tempoMedioAtendimento: e.tempo_medio_atendimento,
    horarioFuncionamento: e.horario_funcionamento,
    permiteAutoEdicao: e.permite_auto_edicao,
    configuracaoPixModo: e.configuracao_pix_modo,
    configuracaoPixPercentualSinal: e.configuracao_pix_percentual_sinal,
    seguidores: e.seguidores,
    taxaFidelidade: e.taxa_fidelidade,
    avaliacao: 0,
    dataCriacao: e.data_criacao,
    dataAtualizacao: e.data_atualizacao,
  }));
}

export async function atualizar(id: string, data: Partial<EstabelecimentoInput>) {
  return atualizarEstabelecimento(id, data);
}