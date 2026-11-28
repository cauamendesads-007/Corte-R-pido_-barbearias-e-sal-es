import { pool } from '@/config/database';
import type mysql from 'mysql2/promise';
import type { PublicacaoInput } from '@/validators/schemas';

type QueryParams = (string | number | Date | null | boolean)[];

export interface PublicacaoRow {
  id: string;
  estabelecimento_id: string;
  autor_id: string;
  legenda: string | null;
  arquivo_url: string | null;
  tipo: 'imagem' | 'video';
  curtidas: number;
  compartilhamentos: number;
  data_criacao: Date;
}

export async function criarPublicacao(data: PublicacaoInput, autorId: string): Promise<PublicacaoRow> {
  const [result] = await pool.execute(
    `INSERT INTO publicacoes_feed (estabelecimento_id, autor_id, legenda, arquivo_url, tipo)
     VALUES (?, ?, ?, ?, ?)`,
    [data.estabelecimentoId, autorId, data.legenda ?? null, data.arquivoUrl ?? null, data.tipo] as QueryParams
  );
  const insertId = (result as mysql.ResultSetHeader).insertId;
  const [rows] = await pool.execute('SELECT * FROM publicacoes_feed WHERE id = ?', [insertId]);
  return (rows as PublicacaoRow[])[0];
}

export async function buscarPublicacaoPorId(id: string): Promise<PublicacaoRow | null> {
  const [rows] = await pool.execute('SELECT * FROM publicacoes_feed WHERE id = ?', [id] as QueryParams);
  return (rows as PublicacaoRow[])[0] ?? null;
}

export async function listarPorEstabelecimento(
  estabelecimentoId: string,
  pagina = 1,
  limite = 20
): Promise<{ publicacoes: PublicacaoRow[]; total: number }> {
  const offset = (pagina - 1) * limite;

  const [countRows] = await pool.execute(
    'SELECT COUNT(*) as total FROM publicacoes_feed WHERE estabelecimento_id = ?',
    [estabelecimentoId] as QueryParams
  );
  const total = (countRows as { total: number }[])[0].total;

  const [rows] = await pool.execute(
    `SELECT * FROM publicacoes_feed
     WHERE estabelecimento_id = ?
     ORDER BY data_criacao DESC
     LIMIT ? OFFSET ?`,
    [estabelecimentoId, limite, offset] as QueryParams
  );

  return { publicacoes: rows as PublicacaoRow[], total };
}

export async function listarFeedPublico(
  estabelecimentoId: string,
  pagina = 1,
  limite = 20
): Promise<{ publicacoes: PublicacaoRow[]; total: number }> {
  return listarPorEstabelecimento(estabelecimentoId, pagina, limite);
}

export async function curtirPublicacao(id: string): Promise<PublicacaoRow | null> {
  await pool.execute(
    'UPDATE publicacoes_feed SET curtidas = curtidas + 1 WHERE id = ?',
    [id] as QueryParams
  );
  return buscarPublicacaoPorId(id);
}

export async function compartilharPublicacao(id: string): Promise<PublicacaoRow | null> {
  await pool.execute(
    'UPDATE publicacoes_feed SET compartilhamentos = compartilhamentos + 1 WHERE id = ?',
    [id] as QueryParams
  );
  return buscarPublicacaoPorId(id);
}

export async function deletarPublicacao(id: string, autorId: string): Promise<boolean> {
  const [result] = await pool.execute(
    'DELETE FROM publicacoes_feed WHERE id = ? AND autor_id = ?',
    [id, autorId] as QueryParams
  );
  return (result as mysql.ResultSetHeader).affectedRows > 0;
}