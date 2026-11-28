import { pool } from '@/config/database';
import type mysql from 'mysql2/promise';
import type { ServicoInput } from '@/validators/schemas';

type QueryParams = (string | number | Date | null | boolean)[];

export interface ServicoRow {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracao_minutos: number;
  ordem_exibicao: number;
  ativo: boolean;
  data_criacao: Date;
  data_atualizacao: Date;
}

export async function criarServico(estabelecimentoId: string, data: ServicoInput): Promise<ServicoRow> {
  const [result] = await pool.execute(
    `INSERT INTO servicos (estabelecimento_id, nome, descricao, preco, duracao_minutos, ordem_exibicao, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [estabelecimentoId, data.nome, data.descricao ?? null, data.preco, data.duracaoMinutos, data.ordemExibicao ?? 0, data.ativo ?? true] as QueryParams
  );
  const insertId = (result as mysql.ResultSetHeader).insertId;
  const [rows] = await pool.execute('SELECT * FROM servicos WHERE id = ?', [insertId]);
  return (rows as ServicoRow[])[0];
}

export async function listarPorEstabelecimento(estabelecimentoId: string): Promise<ServicoRow[]> {
  const [rows] = await pool.execute(
    'SELECT * FROM servicos WHERE estabelecimento_id = ? AND ativo = true ORDER BY ordem_exibicao, nome',
    [estabelecimentoId] as QueryParams
  );
  return rows as ServicoRow[];
}

export async function buscarPorId(id: string): Promise<ServicoRow | null> {
  const [rows] = await pool.execute('SELECT * FROM servicos WHERE id = ?', [id] as QueryParams);
  return (rows as ServicoRow[])[0] ?? null;
}

export async function atualizarServico(id: string, data: Partial<ServicoInput>): Promise<ServicoRow | null> {
  const campos: string[] = [];
  const valores: QueryParams = [];

  const mapeamento: Record<string, string> = {
    nome: 'nome', descricao: 'descricao', preco: 'preco',
    duracaoMinutos: 'duracao_minutos', ordemExibicao: 'ordem_exibicao', ativo: 'ativo'
  };

  for (const [key, value] of Object.entries(data)) {
    const coluna = mapeamento[key];
    if (coluna && value !== undefined) {
      campos.push(`${coluna} = ?`);
      valores.push(value);
    }
  }

  if (campos.length === 0) return buscarPorId(id);

  campos.push('data_atualizacao = NOW()');
  valores.push(id);

  await pool.execute(`UPDATE servicos SET ${campos.join(', ')} WHERE id = ?`, valores);
  return buscarPorId(id);
}

export async function excluirServico(id: string): Promise<boolean> {
  const [result] = await pool.execute('UPDATE servicos SET ativo = false WHERE id = ?', [id] as QueryParams);
  return (result as mysql.ResultSetHeader).affectedRows > 0;
}