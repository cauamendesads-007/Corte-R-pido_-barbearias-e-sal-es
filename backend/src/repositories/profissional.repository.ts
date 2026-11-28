import { pool } from '@/config/database';
import type mysql from 'mysql2/promise';
import type { ProfissionalInput } from '@/validators/schemas';

type QueryParams = (string | number | Date | null | boolean)[];

export interface ProfissionalRow {
  id: string;
  estabelecimento_id: string;
  usuario_id: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  especialidades: string[];
  ativo: boolean;
  data_criacao: Date;
  data_atualizacao: Date;
}

export async function criarProfissional(estabelecimentoId: string, data: ProfissionalInput, usuarioId?: string): Promise<ProfissionalRow> {
  const [result] = await pool.execute(
    `INSERT INTO profissionais (estabelecimento_id, usuario_id, nome, email, telefone, especialidades, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [estabelecimentoId, usuarioId ?? null, data.nome, data.email ?? null, data.telefone ?? null,
     JSON.stringify(data.especialidades ?? []), data.ativo ?? true] as QueryParams
  );
  const insertId = (result as mysql.ResultSetHeader).insertId;
  const [rows] = await pool.execute('SELECT * FROM profissionais WHERE id = ?', [insertId]);
  return (rows as ProfissionalRow[])[0];
}

export async function listarPorEstabelecimento(estabelecimentoId: string): Promise<ProfissionalRow[]> {
  const [rows] = await pool.execute(
    'SELECT * FROM profissionais WHERE estabelecimento_id = ? AND ativo = true ORDER BY nome',
    [estabelecimentoId] as QueryParams
  );
  return rows as ProfissionalRow[];
}

export async function buscarPorId(id: string): Promise<ProfissionalRow | null> {
  const [rows] = await pool.execute('SELECT * FROM profissionais WHERE id = ?', [id] as QueryParams);
  return (rows as ProfissionalRow[])[0] ?? null;
}

export async function buscarPorUsuarioId(usuarioId: string): Promise<ProfissionalRow | null> {
  const [rows] = await pool.execute('SELECT * FROM profissionais WHERE usuario_id = ? AND ativo = true', [usuarioId] as QueryParams);
  return (rows as ProfissionalRow[])[0] ?? null;
}

export async function atualizarProfissional(id: string, data: Partial<ProfissionalInput>): Promise<ProfissionalRow | null> {
  const campos: string[] = [];
  const valores: QueryParams = [];

  const mapeamento: Record<string, string> = {
    nome: 'nome', email: 'email', telefone: 'telefone',
    especialidades: 'especialidades', ativo: 'ativo'
  };

  for (const [key, value] of Object.entries(data)) {
    const coluna = mapeamento[key];
    if (coluna && value !== undefined) {
      campos.push(`${coluna} = ?`);
      valores.push(key === 'especialidades' ? JSON.stringify(value as string[]) : (value as QueryParams[number]));
    }
  }

  if (campos.length === 0) return buscarPorId(id);

  campos.push('data_atualizacao = NOW()');
  valores.push(id);

  await pool.execute(`UPDATE profissionais SET ${campos.join(', ')} WHERE id = ?`, valores);
  return buscarPorId(id);
}