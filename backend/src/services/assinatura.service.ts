import {
  criarPlano,
  buscarPorId as buscarPlanoPorId,
  listarAtivos,
  listarTodos as listarPlanosTodos,
  atualizarPlano,
  deletarPlano
} from '@/repositories/plano.repository';
import type { PlanoRow as RepoPlanoRow } from '@/repositories/plano.repository';
import {
  criarAssinatura,
  buscarPorEstabelecimento,
  buscarPorId as buscarAssinaturaPorId,
  buscarComPlano,
  listarPorEstabelecimento,
  listarTodas,
  atualizarStatus,
  ativarAssinatura,
  cancelarAssinatura,
  buscarProximasCobrancas,
  calcularMRR
} from '@/repositories/assinatura.repository';
import type { AssinaturaRow as RepoAssinaturaRow, AssinaturaComPlano as RepoAssinaturaComPlano } from '@/repositories/assinatura.repository';
import { AppError } from '@/middlewares/errorHandler';

export interface PlanoResponse {
  id: string;
  nome: string;
  descricao: string | null;
  precoMensal: number;
  precoAnual: number | null;
  limiteProfissionais: number;
  limiteServicos: number;
  recursos: string[] | null;
  ativo: boolean;
  dataCriacao: Date;
}

export interface AssinaturaResponse {
  id: string;
  estabelecimentoId: string;
  planoId: string;
  status: 'ativa' | 'cancelada' | 'vencida' | 'pendente';
  ciclo: 'mensal' | 'anual';
  dataInicio: Date;
  dataFim: Date | null;
  dataProximaCobranca: Date | null;
  formaPagamento: 'cartao' | 'pix' | 'boleto' | null;
  dataCriacao: Date;
  dataAtualizacao: Date;
  plano?: PlanoResponse;
}

// Use repository types directly
type PlanoRow = RepoPlanoRow;
type AssinaturaComPlanoRow = RepoAssinaturaComPlano;

function mapPlano(row: PlanoRow): PlanoResponse {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    precoMensal: Number(row.preco_mensal),
    precoAnual: row.preco_anual ? Number(row.preco_anual) : null,
    limiteProfissionais: row.limite_profissionais,
    limiteServicos: row.limite_servicos,
    recursos: row.recursos,
    ativo: row.ativo,
    dataCriacao: row.data_criacao
  };
}

function mapAssinatura(row: AssinaturaComPlanoRow | RepoAssinaturaRow): AssinaturaResponse {
  const base = {
    id: row.id,
    estabelecimentoId: row.estabelecimento_id,
    planoId: row.plano_id,
    status: row.status,
    ciclo: row.ciclo,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    dataProximaCobranca: row.data_proxima_cobranca,
    formaPagamento: row.forma_pagamento,
    dataCriacao: row.data_criacao,
    dataAtualizacao: row.data_atualizacao
  };

  // Check if row has plano fields (from buscarComPlano or listarTodas)
  const comPlano = row as AssinaturaComPlanoRow;
  if (comPlano.plano_nome) {
    return {
      ...base,
      plano: {
        id: comPlano.plano_id,
        nome: comPlano.plano_nome,
        descricao: null,
        precoMensal: Number(comPlano.plano_preco_mensal),
        precoAnual: comPlano.plano_preco_anual ? Number(comPlano.plano_preco_anual) : null,
        limiteProfissionais: 0,
        limiteServicos: 0,
        recursos: null,
        ativo: true,
        dataCriacao: new Date()
      }
    };
  }

  return base;
}

// ============================================================================
// PLANOS
// ============================================================================

export async function criarPlanoService(data: {
  nome: string;
  descricao?: string;
  precoMensal: number;
  precoAnual?: number;
  limiteProfissionais?: number;
  limiteServicos?: number;
  recursos?: string[];
  ativo?: boolean;
}): Promise<PlanoResponse> {
  const planoData = {
    nome: data.nome,
    descricao: data.descricao,
    precoMensal: data.precoMensal,
    precoAnual: data.precoAnual,
    limiteProfissionais: data.limiteProfissionais ?? 5,
    limiteServicos: data.limiteServicos ?? 20,
    recursos: data.recursos,
    ativo: data.ativo ?? true
  };
  const plano = await criarPlano(planoData);
  return mapPlano(plano);
}

export async function buscarPlanoPorIdService(id: string): Promise<PlanoResponse | null> {
  const plano = await buscarPlanoPorId(id);
  return plano ? mapPlano(plano) : null;
}

export async function listarPlanosAtivosService(): Promise<PlanoResponse[]> {
  const planos = await listarAtivos();
  return planos.map(mapPlano);
}

export async function listarTodosPlanosService(): Promise<PlanoResponse[]> {
  const planos = await listarPlanosTodos();
  return planos.map(mapPlano);
}

export async function atualizarPlanoService(id: string, data: Partial<{
  nome: string;
  descricao: string;
  precoMensal: number;
  precoAnual: number;
  limiteProfissionais: number;
  limiteServicos: number;
  recursos: string[];
  ativo: boolean;
}>): Promise<PlanoResponse | null> {
  const plano = await atualizarPlano(id, data);
  return plano ? mapPlano(plano) : null;
}

export async function deletarPlanoService(id: string): Promise<boolean> {
  // Verificar se há assinaturas ativas usando este plano
  const assinaturas = await listarTodas({ status: 'ativa' });
  const emUso = assinaturas.some(a => a.plano_id === id);

  if (emUso) {
    throw new AppError(400, 'Não é possível excluir plano com assinaturas ativas', 'PLANO_EM_USO');
  }

  return deletarPlano(id);
}

// ============================================================================
// ASSINATURAS
// ============================================================================

export async function criarAssinaturaService(data: {
  estabelecimentoId: string;
  planoId: string;
  ciclo?: 'mensal' | 'anual';
  formaPagamento?: 'cartao' | 'pix' | 'boleto';
}): Promise<AssinaturaResponse> {
  // Verificar se já existe assinatura ativa/pendente para este estabelecimento
  const existente = await buscarPorEstabelecimento(data.estabelecimentoId);
  if (existente && (existente.status === 'ativa' || existente.status === 'pendente')) {
    throw new AppError(400, 'Estabelecimento já possui assinatura ativa ou pendente', 'ASSINATURA_EXISTENTE');
  }

  // Verificar se plano existe e está ativo
  const plano = await buscarPlanoPorId(data.planoId);
  if (!plano || !plano.ativo) {
    throw new AppError(404, 'Plano não encontrado ou inativo', 'PLANO_NOT_FOUND');
  }

  const assinaturaData = {
    estabelecimentoId: data.estabelecimentoId,
    planoId: data.planoId,
    ciclo: data.ciclo ?? 'mensal',
    formaPagamento: data.formaPagamento
  };
  const assinatura = await criarAssinatura(assinaturaData);
  return mapAssinatura(assinatura);
}

export async function buscarAssinaturaEstabelecimento(estabelecimentoId: string): Promise<AssinaturaResponse | null> {
  const assinatura = await buscarPorEstabelecimento(estabelecimentoId);
  return assinatura ? mapAssinatura(assinatura) : null;
}

export async function buscarAssinaturaPorIdService(id: string): Promise<AssinaturaResponse | null> {
  const assinatura = await buscarComPlano(id);
  return assinatura ? mapAssinatura(assinatura) : null;
}

export async function listarAssinaturasEstabelecimento(estabelecimentoId: string): Promise<AssinaturaResponse[]> {
  const assinaturas = await listarPorEstabelecimento(estabelecimentoId);
  return assinaturas.map(mapAssinatura);
}

export async function listarTodasAssinaturas(filtros?: { status?: string }): Promise<AssinaturaResponse[]> {
  const assinaturas = await listarTodas(filtros);
  return assinaturas.map(mapAssinatura);
}

export async function ativarAssinaturaService(id: string): Promise<AssinaturaResponse | null> {
  const assinatura = await buscarAssinaturaPorId(id);
  if (!assinatura) {
    throw new AppError(404, 'Assinatura não encontrada', 'ASSINATURA_NOT_FOUND');
  }

  if (assinatura.status === 'ativa') {
    throw new AppError(400, 'Assinatura já está ativa', 'JA_ATIVA');
  }

  // Calcular próxima cobrança
  const agora = new Date();
  const dataProximaCobranca = new Date(agora);
  if (assinatura.ciclo === 'mensal') {
    dataProximaCobranca.setMonth(dataProximaCobranca.getMonth() + 1);
  } else {
    dataProximaCobranca.setFullYear(dataProximaCobranca.getFullYear() + 1);
  }

  const atualizada = await ativarAssinatura(id, dataProximaCobranca);
  return atualizada ? mapAssinatura(atualizada) : null;
}

export async function cancelarAssinaturaService(id: string): Promise<AssinaturaResponse | null> {
  const assinatura = await buscarAssinaturaPorId(id);
  if (!assinatura) {
    throw new AppError(404, 'Assinatura não encontrada', 'ASSINATURA_NOT_FOUND');
  }

  if (assinatura.status === 'cancelada') {
    throw new AppError(400, 'Assinatura já está cancelada', 'JA_CANCELADA');
  }

  const atualizada = await cancelarAssinatura(id);
  return atualizada ? mapAssinatura(atualizada) : null;
}

export async function processarCobrancasVencidas(): Promise<{ processadas: number; erros: number }> {
  const proximas = await buscarProximasCobrancas(0); // Vencidas hoje ou antes
  let processadas = 0;
  let erros = 0;

  for (const assinatura of proximas) {
    try {
      // Aqui integraria com gateway de pagamento (MercadoPago, Stripe, etc)
      // Por enquanto, apenas marca como pendente para nova tentativa
      await atualizarStatus(assinatura.id, 'pendente');
      processadas++;
    } catch {
      erros++;
    }
  }

  return { processadas, erros };
}

export async function obterMRR(): Promise<{ mrr: number }> {
  const mrr = await calcularMRR();
  return { mrr };
}