import { pool } from '@/config/database';
import type mysql from 'mysql2/promise';

export interface AgendamentoRow {
  id: string;
  estabelecimento_id: string;
  profissional_id: string;
  cliente_id: string | null;
  data_hora_inicio: Date;
  data_hora_fim: Date;
  status: 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado' | 'nao_compareceu';
  observacoes: string | null;
  valor_total: number;
  data_criacao: Date;
  data_atualizacao: Date;
}

export interface ItemAgendamentoRow {
  id: string;
  agendamento_id: string;
  servico_id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface SlotLivre {
  inicio: Date;
  fim: Date;
  profissional_id: string;
}

type QueryParams = (string | number | Date | null | boolean)[];

export async function verificarConflitoAgendamento(
  profissionalId: string,
  dataHoraInicio: Date,
  dataHoraFim: Date,
  excluirAgendamentoId?: string
): Promise<boolean> {
  let query = `
    SELECT 1 FROM agendamentos
    WHERE profissional_id = ?
      AND status IN ('agendado', 'confirmado', 'em_andamento')
      AND data_hora_inicio < ?
      AND data_hora_fim > ?
  `;
  const params: QueryParams = [profissionalId, dataHoraFim, dataHoraInicio];

  if (excluirAgendamentoId) {
    query += ' AND id != ?';
    params.push(excluirAgendamentoId);
  }

  const [rows] = await pool.execute(query, params);
  return (rows as Array<{ 1: number }>).length > 0;
}

export async function criarAgendamentoComItens(
  data: {
    estabelecimentoId: string;
    profissionalId: string;
    clienteId: string | null;
    dataHoraInicio: Date;
    dataHoraFim: Date;
    observacoes: string | null;
    valorTotal: number;
    itens: Array<{ servicoId: string; quantidade: number; precoUnitario: number; subtotal: number }>;
  }
): Promise<AgendamentoRow> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO agendamentos (estabelecimento_id, profissional_id, cliente_id, data_hora_inicio, data_hora_fim,
         status, observacoes, valor_total)
       VALUES (?, ?, ?, ?, ?, 'agendado', ?, ?)`,
      [data.estabelecimentoId, data.profissionalId, data.clienteId, data.dataHoraInicio, data.dataHoraFim,
       data.observacoes, data.valorTotal] as QueryParams
    );
    const agendamentoId = (result as mysql.ResultSetHeader).insertId;

    for (const item of data.itens) {
      await conn.execute(
        `INSERT INTO item_agendamento (agendamento_id, servico_id, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [agendamentoId, item.servicoId, item.quantidade, item.precoUnitario, item.subtotal] as QueryParams
      );
    }

    await conn.commit();

    const [rows] = await conn.execute('SELECT * FROM agendamentos WHERE id = ?', [agendamentoId]);
    return (rows as AgendamentoRow[])[0];
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function buscarAgendamentoPorId(id: string): Promise<AgendamentoRow | null> {
  const [rows] = await pool.execute('SELECT * FROM agendamentos WHERE id = ?', [id]);
  return (rows as AgendamentoRow[])[0] ?? null;
}

export async function buscarItensAgendamento(agendamentoId: string): Promise<ItemAgendamentoRow[]> {
  const [rows] = await pool.execute('SELECT * FROM item_agendamento WHERE agendamento_id = ?', [agendamentoId]);
  return rows as ItemAgendamentoRow[];
}

export async function listarPorEstabelecimento(
  estabelecimentoId: string,
  filtros?: { status?: string; dataInicio?: Date; dataFim?: Date; profissionalId?: string }
): Promise<AgendamentoRow[]> {
  let query = 'SELECT * FROM agendamentos WHERE estabelecimento_id = ?';
  const params: QueryParams = [estabelecimentoId];

  if (filtros?.status) {
    query += ' AND status = ?';
    params.push(filtros.status);
  }
  if (filtros?.dataInicio) {
    query += ' AND data_hora_inicio >= ?';
    params.push(filtros.dataInicio);
  }
  if (filtros?.dataFim) {
    query += ' AND data_hora_inicio <= ?';
    params.push(filtros.dataFim);
  }
  if (filtros?.profissionalId) {
    query += ' AND profissional_id = ?';
    params.push(filtros.profissionalId);
  }

  query += ' ORDER BY data_hora_inicio DESC';

  const [rows] = await pool.execute(query, params);
  return rows as AgendamentoRow[];
}

export async function atualizarStatus(id: string, status: AgendamentoRow['status']): Promise<AgendamentoRow | null> {
  await pool.execute('UPDATE agendamentos SET status = ?, data_atualizacao = NOW() WHERE id = ?', [status, id] as QueryParams);
  return buscarAgendamentoPorId(id);
}

export async function calcularSlotsLivres(
  profissionalId: string,
  data: Date,
  duracaoMinutos: number
): Promise<SlotLivre[]> {
  const inicioDia = new Date(data);
  inicioDia.setHours(8, 0, 0, 0);
  const fimDia = new Date(data);
  fimDia.setHours(20, 0, 0, 0);

  const [agendamentos] = await pool.execute(
    `SELECT data_hora_inicio, data_hora_fim FROM agendamentos
     WHERE profissional_id = ? AND status IN ('agendado', 'confirmado', 'em_andamento')
     AND data_hora_inicio >= ? AND data_hora_fim <= ?
     ORDER BY data_hora_inicio`,
    [profissionalId, inicioDia, fimDia] as QueryParams
  );

  const slots: SlotLivre[] = [];
  let atual = new Date(inicioDia);
  const ags = agendamentos as AgendamentoRow[];

  for (const ag of ags) {
    const fimSlot = new Date(atual);
    fimSlot.setMinutes(fimSlot.getMinutes() + duracaoMinutos);

    if (fimSlot <= ag.data_hora_inicio) {
      slots.push({ inicio: new Date(atual), fim: fimSlot, profissional_id: profissionalId });
      atual = new Date(fimSlot);
    } else {
      atual = new Date(Math.max(atual.getTime(), ag.data_hora_fim.getTime()));
    }
  }

  while (true) {
    const fimSlot = new Date(atual);
    fimSlot.setMinutes(fimSlot.getMinutes() + duracaoMinutos);
    if (fimSlot > fimDia) break;
    slots.push({ inicio: new Date(atual), fim: fimSlot, profissional_id: profissionalId });
    atual = fimSlot;
  }

  return slots;
}