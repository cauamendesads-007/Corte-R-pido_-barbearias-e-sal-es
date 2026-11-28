import { criarServico, listarPorEstabelecimento, buscarPorId, atualizarServico, excluirServico } from '@/repositories/servico.repository';
import type { ServicoInput } from '@/validators/schemas';
import { AppError } from '@/middlewares/errorHandler';

export async function criar(estabelecimentoId: string, data: ServicoInput) {
  return criarServico(estabelecimentoId, data);
}

export async function listar(estabelecimentoId: string) {
  return listarPorEstabelecimento(estabelecimentoId);
}

export async function buscar(id: string) {
  const servico = await buscarPorId(id);
  if (!servico) {
    throw new AppError(404, 'Serviço não encontrado', 'NOT_FOUND');
  }
  return servico;
}

export async function atualizar(id: string, data: Partial<ServicoInput>) {
  const servico = await buscarPorId(id);
  if (!servico) {
    throw new AppError(404, 'Serviço não encontrado', 'NOT_FOUND');
  }
  return atualizarServico(id, data);
}

export async function excluir(id: string) {
  const servico = await buscarPorId(id);
  if (!servico) {
    throw new AppError(404, 'Serviço não encontrado', 'NOT_FOUND');
  }
  await excluirServico(id);
  return { sucesso: true };
}