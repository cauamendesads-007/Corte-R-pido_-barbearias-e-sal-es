import { criarProfissional, listarPorEstabelecimento, buscarPorId, buscarPorUsuarioId, atualizarProfissional } from '@/repositories/profissional.repository';
import type { ProfissionalInput } from '@/validators/schemas';
import { AppError } from '@/middlewares/errorHandler';

export async function criar(estabelecimentoId: string, data: ProfissionalInput, usuarioId?: string) {
  return criarProfissional(estabelecimentoId, data, usuarioId);
}

export async function listar(estabelecimentoId: string) {
  return listarPorEstabelecimento(estabelecimentoId);
}

export async function buscar(id: string) {
  const profissional = await buscarPorId(id);
  if (!profissional) {
    throw new AppError(404, 'Profissional não encontrado', 'NOT_FOUND');
  }
  return profissional;
}

export async function buscarMeuPerfil(usuarioId: string) {
  return buscarPorUsuarioId(usuarioId);
}

export async function atualizar(id: string, data: Partial<ProfissionalInput>) {
  const profissional = await buscarPorId(id);
  if (!profissional) {
    throw new AppError(404, 'Profissional não encontrado', 'NOT_FOUND');
  }
  return atualizarProfissional(id, data);
}