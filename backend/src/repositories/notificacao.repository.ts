import { pool } from '@/config/database';
import type mysql from 'mysql2/promise';
import type { NotificacaoInput } from '@/validators/schemas';

type QueryParams = (string | number | Date | null | boolean)[];

export interface NotificacaoRow {
  id: string;
  usuario_id: string;
  tipo: 'agendamento' | 'pagamento' | 'avaliacao' | 'mensagem' | 'sistema';
  titulo: string;
  mensagem: string;
  lida: boolean;
  dados_extras: Record<string, unknown> | null;
  data_criacao: Date;
}

export async function criarNotificacao(data: NotificacaoInput): Promise<NotificacaoRow> {
  const [result] = await pool.execute(
    `INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, dados_extras)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.usuarioId,
      data.tipo,
      data.titulo,
      data.mensagem,
      data.dadosExtras ? JSON.stringify(data.dadosExtras) : null
    ] as QueryParams
  );
  const insertId = (result as mysql.ResultSetHeader).insertId;
  const [rows] = await pool.execute('SELECT * FROM notificacoes WHERE id = ?', [insertId]);
  return (rows as NotificacaoRow[])[0];
}

export async function buscarPorUsuario(
  usuarioId: string,
  apenasNaoLidas = false,
  pagina = 1,
  limite = 20
): Promise<{ notificacoes: NotificacaoRow[]; total: number; naoLidas: number }> {
  const offset = (pagina - 1) * limite;

  let whereClause = 'WHERE usuario_id = ?';
  const params: QueryParams = [usuarioId];

  if (apenasNaoLidas) {
    whereClause += ' AND lida = false';
  }

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) as total FROM notificacoes ${whereClause}`,
    params
  );
  const total = (countRows as { total: number }[])[0].total;

  const [naoLidasRows] = await pool.execute(
    'SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id = ? AND lida = false',
    [usuarioId] as QueryParams
  );
  const naoLidas = (naoLidasRows as { total: number }[])[0].total;

  const [rows] = await pool.execute(
    `SELECT * FROM notificacoes ${whereClause} ORDER BY data_criacao DESC LIMIT ? OFFSET ?`,
    [...params, limite, offset] as QueryParams
  );

  return { notificacoes: rows as NotificacaoRow[], total, naoLidas };
}

export async function marcarComoLida(id: string, usuarioId: string): Promise<NotificacaoRow | null> {
  const [result] = await pool.execute(
    'UPDATE notificacoes SET lida = true WHERE id = ? AND usuario_id = ?',
    [id, usuarioId] as QueryParams
  );

  if ((result as mysql.ResultSetHeader).affectedRows === 0) {
    return null;
  }

  const [rows] = await pool.execute('SELECT * FROM notificacoes WHERE id = ?', [id]);
  return (rows as NotificacaoRow[])[0] ?? null;
}

export async function marcarTodasComoLidas(usuarioId: string): Promise<number> {
  const [result] = await pool.execute(
    'UPDATE notificacoes SET lida = true WHERE usuario_id = ? AND lida = false',
    [usuarioId] as QueryParams
  );
  return (result as mysql.ResultSetHeader).affectedRows;
}

export async function deletarNotificacao(id: string, usuarioId: string): Promise<boolean> {
  const [result] = await pool.execute(
    'DELETE FROM notificacoes WHERE id = ? AND usuario_id = ?',
    [id, usuarioId] as QueryParams
  );
  return (result as mysql.ResultSetHeader).affectedRows > 0;
}

export async function contarNaoLidas(usuarioId: string): Promise<number> {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id = ? AND lida = false',
    [usuarioId] as QueryParams
  );
  return (rows as { total: number }[])[0].total;
}