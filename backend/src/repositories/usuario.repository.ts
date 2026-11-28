import { pool } from '@/config/database';
import type mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import type { CadastroInput } from '@/validators/schemas';

type QueryParams = (string | number | Date | null | boolean)[];

export interface UsuarioRow {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  telefone: string | null;
  tipo: 'cliente' | 'profissional' | 'estabelecimento' | 'admin';
  estabelecimento_id: string | null;
  ativo: boolean;
  data_criacao: Date;
  data_atualizacao: Date;
}

export async function criarUsuario(data: CadastroInput): Promise<UsuarioRow> {
  const senhaHash = await bcrypt.hash(data.senha, 12);
  const [result] = await pool.execute(
    `INSERT INTO usuarios (nome, email, senha_hash, telefone, tipo, estabelecimento_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.nome, data.email, senhaHash, data.telefone ?? null, data.tipo, data.estabelecimentoId ?? null] as QueryParams
  );
  const insertId = (result as mysql.ResultSetHeader).insertId;
  const [rows] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [insertId]);
  return (rows as UsuarioRow[])[0];
}

export async function buscarPorEmail(email: string): Promise<UsuarioRow | null> {
  const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ? AND ativo = true', [email] as QueryParams);
  return (rows as UsuarioRow[])[0] ?? null;
}

export async function buscarPorId(id: string): Promise<UsuarioRow | null> {
  const [rows] = await pool.execute('SELECT * FROM usuarios WHERE id = ? AND ativo = true', [id] as QueryParams);
  return (rows as UsuarioRow[])[0] ?? null;
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}