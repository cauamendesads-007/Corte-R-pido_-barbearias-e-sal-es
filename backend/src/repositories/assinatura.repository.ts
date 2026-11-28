import { pool } from '@/config/database';
import type mysql from 'mysql2/promise';
import type { AssinaturaInput } from '@/validators/schemas';

type QueryParams = (string | number | Date | null | boolean)[];

export interface AssinaturaRow {
  id: string;
  estabelecimento_id: string;
  plano_id: string;
  status: 'ativa' | 'cancelada' | 'vencida' | 'pendente';
  ciclo: 'mensal' | 'anual';
  data_inicio: Date;
  data_fim: Date | null;
  data_proxima_cobranca: Date | null;
  forma_pagamento: 'cartao' | 'pix' | 'boleto' | null;
  data_criacao: Date;
  data_atualizacao: Date;
}

export interface AssinaturaComPlano extends AssinaturaRow {
  plano_nome: string;
  plano_preco_mensal: number;
  plano_preco_anual: number | null;
}

export async function criarAssinatura(data: AssinaturaInput): Promise<AssinaturaRow> {
  const [result] = await pool.execute(
    `INSERT INTO assinaturas (estabelecimento_id, plano_id, status, ciclo, data_inicio, forma_pagamento)
     VALUES (?, ?, 'pendente', ?, ?, ?)`,
    [
      data.estabelecimentoId,
      data.planoId,
      data.ciclo ?? 'mensal',
      new Date(),
      data.formaPagamento ?? null
    ] as QueryParams
  );
  const insertId = (result as mysql.ResultSetHeader).insertId;
  const [rows] = await pool.execute('SELECT * FROM assinaturas WHERE id = ?', [insertId]);
  return (rows as AssinaturaRow[])[0];
}

export async function buscarPorEstabelecimento(estabelecimentoId: string): Promise<AssinaturaRow | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM assinaturas WHERE estabelecimento_id = ? ORDER BY data_criacao DESC LIMIT 1',
    [estabelecimentoId] as QueryParams
  );
  return (rows as AssinaturaRow[])[0] ?? null;
}

export async function buscarPorId(id: string): Promise<AssinaturaRow | null> {
  const [rows] = await pool.execute('SELECT * FROM assinaturas WHERE id = ?', [id] as QueryParams);
  return (rows as AssinaturaRow[])[0] ?? null;
}

export async function buscarComPlano(id: string): Promise<AssinaturaComPlano | null> {
  const [rows] = await pool.execute(
    `SELECT a.*, p.nome as plano_nome, p.preco_mensal as plano_preco_mensal, p.preco_anual as plano_preco_anual
     FROM assinaturas a
     JOIN planos_assinatura p ON a.plano_id = p.id
     WHERE a.id = ?`,
    [id] as QueryParams
  );
  return (rows as AssinaturaComPlano[])[0] ?? null;
}

export async function listarPorEstabelecimento(estabelecimentoId: string): Promise<AssinaturaRow[]> {
  const [rows] = await pool.execute(
    'SELECT * FROM assinaturas WHERE estabelecimento_id = ? ORDER BY data_criacao DESC',
    [estabelecimentoId] as QueryParams
  );
  return rows as AssinaturaRow[];
}

export async function listarTodas(filtros?: { status?: string }): Promise<AssinaturaComPlano[]> {
  let query = `
    SELECT a.*, p.nome as plano_nome, p.preco_mensal as plano_preco_mensal, p.preco_anual as plano_preco_anual
    FROM assinaturas a
    JOIN planos_assinatura p ON a.plano_id = p.id
  `;
  const params: QueryParams = [];

  if (filtros?.status) {
    query += ' WHERE a.status = ?';
    params.push(filtros.status);
  }

  query += ' ORDER BY a.data_criacao DESC';

  const [rows] = await pool.execute(query, params);
  return rows as AssinaturaComPlano[];
}

export async function atualizarStatus(
  id: string,
  status: 'ativa' | 'cancelada' | 'vencida' | 'pendente',
  dataProximaCobranca?: Date
): Promise<AssinaturaRow | null> {
  const campos = ['status = ?'];
  const valores: QueryParams = [status];

  if (dataProximaCobranca) {
    campos.push('data_proxima_cobranca = ?');
    valores.push(dataProximaCobranca);
  }

  if (status === 'cancelada' || status === 'vencida') {
    campos.push('data_fim = ?');
    valores.push(new Date());
  }

  campos.push('data_atualizacao = NOW()');
  valores.push(id);

  await pool.execute(`UPDATE assinaturas SET ${campos.join(', ')} WHERE id = ?`, valores);
  return buscarPorId(id);
}

export async function ativarAssinatura(id: string, dataProximaCobranca: Date): Promise<AssinaturaRow | null> {
  return atualizarStatus(id, 'ativa', dataProximaCobranca);
}

export async function cancelarAssinatura(id: string): Promise<AssinaturaRow | null> {
  return atualizarStatus(id, 'cancelada');
}

export async function buscarProximasCobrancas(dias: number = 7): Promise<AssinaturaComPlano[]> {
  const [rows] = await pool.execute(
    `SELECT a.*, p.nome as plano_nome, p.preco_mensal as plano_preco_mensal, p.preco_anual as plano_preco_anual
     FROM assinaturas a
     JOIN planos_assinatura p ON a.plano_id = p.id
     WHERE a.status = 'ativa'
       AND a.data_proxima_cobranca IS NOT NULL
       AND a.data_proxima_cobranca <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
     ORDER BY a.data_proxima_cobranca ASC`,
    [dias] as QueryParams
  );
  return rows as AssinaturaComPlano[];
}

export async function calcularMRR(): Promise<number> {
  const [rows] = await pool.execute(
    `SELECT SUM(p.preco_mensal) as mrr
     FROM assinaturas a
     JOIN planos_assinatura p ON a.plano_id = p.id
     WHERE a.status = 'ativa' AND a.ciclo = 'mensal'`
  );
  const mrrMensal = (rows as { mrr: number | null }[])[0].mrr ?? 0;

  const [rowsAnual] = await pool.execute(
    `SELECT SUM(p.preco_anual / 12) as mrr
     FROM assinaturas a
     JOIN planos_assinatura p ON a.plano_id = p.id
     WHERE a.status = 'ativa' AND a.ciclo = 'anual' AND p.preco_anual IS NOT NULL`
  );
  const mrrAnual = (rowsAnual as { mrr: number | null }[])[0].mrr ?? 0;

  return Number((mrrMensal + mrrAnual).toFixed(2));
}