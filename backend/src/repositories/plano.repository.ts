import { pool } from '@/config/database';
import type mysql from 'mysql2/promise';
import type { PlanoAssinaturaInput } from '@/validators/schemas';

type QueryParams = (string | number | Date | null | boolean)[];

export interface PlanoRow {
  id: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  preco_anual: number | null;
  limite_profissionais: number;
  limite_servicos: number;
  recursos: string[] | null;
  ativo: boolean;
  data_criacao: Date;
}

export async function criarPlano(data: PlanoAssinaturaInput): Promise<PlanoRow> {
  const [result] = await pool.execute(
    `INSERT INTO planos_assinatura (nome, descricao, preco_mensal, preco_anual, limite_profissionais, limite_servicos, recursos, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.nome,
      data.descricao ?? null,
      data.precoMensal,
      data.precoAnual ?? null,
      data.limiteProfissionais ?? 5,
      data.limiteServicos ?? 20,
      data.recursos ? JSON.stringify(data.recursos) : null,
      data.ativo ?? true
    ] as QueryParams
  );
  const insertId = (result as mysql.ResultSetHeader).insertId;
  const [rows] = await pool.execute('SELECT * FROM planos_assinatura WHERE id = ?', [insertId]);
  return (rows as PlanoRow[])[0];
}

export async function buscarPorId(id: string): Promise<PlanoRow | null> {
  const [rows] = await pool.execute('SELECT * FROM planos_assinatura WHERE id = ?', [id] as QueryParams);
  return (rows as PlanoRow[])[0] ?? null;
}

export async function listarAtivos(): Promise<PlanoRow[]> {
  const [rows] = await pool.execute('SELECT * FROM planos_assinatura WHERE ativo = true ORDER BY preco_mensal ASC');
  return rows as PlanoRow[];
}

export async function listarTodos(): Promise<PlanoRow[]> {
  const [rows] = await pool.execute('SELECT * FROM planos_assinatura ORDER BY preco_mensal ASC');
  return rows as PlanoRow[];
}

export async function atualizarPlano(id: string, data: Partial<PlanoAssinaturaInput>): Promise<PlanoRow | null> {
  const campos: string[] = [];
  const valores: QueryParams = [];

  const mapeamento: Record<string, string> = {
    nome: 'nome',
    descricao: 'descricao',
    precoMensal: 'preco_mensal',
    precoAnual: 'preco_anual',
    limiteProfissionais: 'limite_profissionais',
    limiteServicos: 'limite_servicos',
    recursos: 'recursos',
    ativo: 'ativo'
  };

  for (const [key, value] of Object.entries(data)) {
    const coluna = mapeamento[key];
    if (coluna && value !== undefined) {
      campos.push(`${coluna} = ?`);
      valores.push(key === 'recursos' ? JSON.stringify(value) : (value as QueryParams[number]));
    }
  }

  if (campos.length === 0) return buscarPorId(id);

  valores.push(id);
  await pool.execute(`UPDATE planos_assinatura SET ${campos.join(', ')} WHERE id = ?`, valores);
  return buscarPorId(id);
}

export async function deletarPlano(id: string): Promise<boolean> {
  const [result] = await pool.execute('DELETE FROM planos_assinatura WHERE id = ?', [id] as QueryParams);
  return (result as mysql.ResultSetHeader).affectedRows > 0;
}