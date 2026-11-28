import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { buscarPorEmail, buscarPorId, criarUsuario, verificarSenha } from '@/repositories/usuario.repository';
import type { CadastroInput, LoginInput } from '@/validators/schemas';
import { AppError } from '@/middlewares/errorHandler';
import type { AuthPayload } from '@/middlewares/auth';

export async function cadastrar(data: CadastroInput): Promise<{ usuario: AuthPayload; token: string }> {
  const existente = await buscarPorEmail(data.email);
  if (existente) {
    throw new AppError(409, 'E-mail já cadastrado', 'EMAIL_EXISTS');
  }

  const usuario = await criarUsuario(data);

  const payload: AuthPayload = {
    sub: usuario.id,
    email: usuario.email,
    tipo: usuario.tipo,
    estabelecimentoId: usuario.estabelecimento_id ?? undefined,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });

  return { usuario: payload, token };
}

export async function login(data: LoginInput): Promise<{ usuario: AuthPayload; token: string }> {
  const usuario = await buscarPorEmail(data.email);
  if (!usuario) {
    throw new AppError(401, 'Credenciais inválidas', 'INVALID_CREDENTIALS');
  }

  const senhaValida = await verificarSenha(data.senha, usuario.senha_hash);
  if (!senhaValida) {
    throw new AppError(401, 'Credenciais inválidas', 'INVALID_CREDENTIALS');
  }

  const payload: AuthPayload = {
    sub: usuario.id,
    email: usuario.email,
    tipo: usuario.tipo,
    estabelecimentoId: usuario.estabelecimento_id ?? undefined,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });

  return { usuario: payload, token };
}

export async function me(usuarioId: string): Promise<AuthPayload | null> {
  const usuario = await buscarPorId(usuarioId);
  if (!usuario) return null;

  return {
    sub: usuario.id,
    email: usuario.email,
    tipo: usuario.tipo,
    estabelecimentoId: usuario.estabelecimento_id ?? undefined,
  };
}