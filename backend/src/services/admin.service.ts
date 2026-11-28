import {
  relatorioFaturamentoMensal,
  relatorioAgendaDia,
  relatorioServicosMaisVendidos,
  relatorioClientesFieis,
  relatorioHorariosPico,
  relatorioPlanosStatus,
  relatorioAvaliacoesDetalhadas,
  relatorioAuditoriaPrecos,
  listarEstabelecimentosAdmin,
  moderarEstabelecimento,
  estatisticasGerais
} from '@/repositories/admin.repository';
import { AppError } from '@/middlewares/errorHandler';

// ============================================================================
// RELATÓRIOS PARA ESTABELECIMENTO (Dono/Admin do estabelecimento)
// ============================================================================

export async function getRelatorioFaturamento(
  estabelecimentoId: string,
  meses = 6
) {
  return relatorioFaturamentoMensal(estabelecimentoId, meses);
}

export async function getRelatorioAgenda(
  estabelecimentoId: string,
  data: Date,
  profissionalId?: string
) {
  return relatorioAgendaDia(estabelecimentoId, data, profissionalId);
}

export async function getRelatorioServicos(
  estabelecimentoId: string,
  dias = 30
) {
  return relatorioServicosMaisVendidos(estabelecimentoId, dias);
}

export async function getRelatorioClientesFieis(
  estabelecimentoId: string,
  limite = 10
) {
  return relatorioClientesFieis(estabelecimentoId, limite);
}

export async function getRelatorioHorariosPico(estabelecimentoId: string) {
  return relatorioHorariosPico(estabelecimentoId);
}

export async function getRelatorioAvaliacoes(estabelecimentoId: string) {
  return relatorioAvaliacoesDetalhadas(estabelecimentoId);
}

export async function getRelatorioAuditoriaPrecos(estabelecimentoId: string) {
  return relatorioAuditoriaPrecos(estabelecimentoId);
}

// ============================================================================
// RELATÓRIOS GLOBAIS (Admin do sistema)
// ============================================================================

export async function getRelatorioPlanosStatus() {
  return relatorioPlanosStatus();
}

export async function getEstatisticasGerais() {
  return estatisticasGerais();
}

// ============================================================================
// MODERAÇÃO DE ESTABELECIMENTOS (Admin do sistema)
// ============================================================================

export interface EstabelecimentoAdminResponse {
  id: string;
  slug: string;
  nome: string;
  responsavel: string;
  cidade: string;
  nicho: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'suspenso';
  avaliacao: number;
  seguidores: number;
  dataCriacao: Date;
}

export async function listarEstabelecimentosParaModeracao(status?: string): Promise<EstabelecimentoAdminResponse[]> {
  const estabelecimentos = await listarEstabelecimentosAdmin(status ? { status } : undefined);
  return estabelecimentos.map(e => ({
    id: e.id,
    slug: e.slug,
    nome: e.nome,
    responsavel: e.responsavel,
    cidade: e.cidade,
    nicho: e.nicho,
    status: e.status,
    avaliacao: Number(e.avaliacao),
    seguidores: e.seguidores,
    dataCriacao: e.data_criacao
  }));
}

export async function moderarEstabelecimentoService(
  id: string,
  acao: 'aprovar' | 'rejeitar' | 'suspender' | 'reativar',
  motivo?: string
): Promise<EstabelecimentoAdminResponse | null> {
  const validActions = ['aprovar', 'rejeitar', 'suspender', 'reativar'];
  if (!validActions.includes(acao)) {
    throw new AppError(400, 'Ação inválida', 'INVALID_ACTION');
  }

  const estabelecimento = await moderarEstabelecimento(id, acao, motivo);
  if (!estabelecimento) {
    throw new AppError(404, 'Estabelecimento não encontrado', 'ESTABELECIMENTO_NOT_FOUND');
  }

  return {
    id: estabelecimento.id,
    slug: estabelecimento.slug,
    nome: estabelecimento.nome,
    responsavel: estabelecimento.responsavel,
    cidade: estabelecimento.cidade,
    nicho: estabelecimento.nicho,
    status: estabelecimento.status,
    avaliacao: Number(estabelecimento.avaliacao),
    seguidores: estabelecimento.seguidores,
    dataCriacao: estabelecimento.data_criacao
  };
}

// ============================================================================
// HELPERS DE AUTORIZAÇÃO
// ============================================================================

export function podeAcessarRelatoriosEstabelecimento(
  tipoUsuario: string,
  estabelecimentoIdUsuario: string | undefined,
  estabelecimentoIdRequisitado: string
): boolean {
  if (tipoUsuario === 'admin') return true;
  if (tipoUsuario === 'estabelecimento') return estabelecimentoIdUsuario === estabelecimentoIdRequisitado;
  return false;
}

export function apenasAdmin(tipoUsuario: string): boolean {
  return tipoUsuario === 'admin';
}