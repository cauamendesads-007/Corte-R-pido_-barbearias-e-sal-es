import { pool } from '@/config/database';

type QueryParams = (string | number | Date | null | boolean)[];

// ============================================================================
// TIPOS DE RETORNO DOS RELATÓRIOS
// ============================================================================

export interface FaturamentoMensal {
  estabelecimento: string;
  mes: string;
  total_transacoes: number;
  faturamento_total: number;
  ticket_medio: number;
}

export interface AgendaDia {
  profissional: string;
  estabelecimento: string;
  data_hora_inicio: Date;
  data_hora_fim: Date;
  status: string;
  cliente: string | null;
  servicos: string | null;
  valor_total: number;
}

export interface ServicoRanking {
  servico: string;
  estabelecimento: string;
  quantidade_vendida: number;
  receita_total: number;
  preco_medio: number;
}

export interface ClienteFiel {
  cliente: string;
  email: string;
  total_agendamentos: number;
  valor_total_gasto: number;
  ticket_medio: number;
  ultimo_agendamento: Date;
  dias_desde_ultimo: number;
}

export interface HorarioPico {
  hora: number;
  total_agendamentos: number;
  percentual: number;
}

export interface PlanoStatus {
  plano: string;
  ativas: number;
  vencidas: number;
  canceladas: number;
  pendentes: number;
  mrr_atual: number;
}

export interface AvaliacaoDetalhada {
  estabelecimento: string;
  media_geral: number;
  total_avaliacoes: number;
  media_calculada: number;
  cinco_estrelas: number;
  quatro_estrelas: number;
  tres_ou_menos: number;
  ultimos_comentarios: string | null;
}

export interface AuditoriaPreco {
  agendamento_id: string;
  estabelecimento: string;
  servico: string;
  preco_congelado: number;
  preco_atual: number;
  status_preco: 'OK' | 'PREÇO_AUMENTOU' | 'PREÇO_DIMINUIU';
  diferenca: number;
  data_hora_inicio: Date;
}

// ============================================================================
// RELATÓRIOS
// ============================================================================

export async function relatorioFaturamentoMensal(
  estabelecimentoId: string,
  meses = 6
): Promise<FaturamentoMensal[]> {
  const [rows] = await pool.execute(
    `SELECT
       e.nome AS estabelecimento,
       DATE_FORMAT(p.data_pagamento, '%Y-%m') AS mes,
       COUNT(p.id) AS total_transacoes,
       SUM(p.valor) AS faturamento_total,
       AVG(p.valor) AS ticket_medio
     FROM pagamentos p
     JOIN estabelecimentos e ON p.estabelecimento_id = e.id
     WHERE p.estabelecimento_id = ?
       AND p.status = 'pago'
       AND p.data_pagamento >= DATE_SUB(
           (SELECT MAX(data_pagamento) FROM pagamentos WHERE status = 'pago'),
           INTERVAL ? MONTH
       )
     GROUP BY e.id, e.nome, DATE_FORMAT(p.data_pagamento, '%Y-%m')
     ORDER BY e.nome, mes DESC`,
    [estabelecimentoId, meses] as QueryParams
  );
  return rows as FaturamentoMensal[];
}

export async function relatorioAgendaDia(
  estabelecimentoId: string,
  data: Date,
  profissionalId?: string
): Promise<AgendaDia[]> {
  let query = `
    SELECT
      p.nome AS profissional,
      e.nome AS estabelecimento,
      a.data_hora_inicio,
      a.data_hora_fim,
      a.status,
      c.nome AS cliente,
      GROUP_CONCAT(s.nome SEPARATOR ', ') AS servicos,
      a.valor_total
    FROM agendamentos a
    JOIN profissionais p ON a.profissional_id = p.id
    JOIN estabelecimentos e ON a.estabelecimento_id = e.id
    LEFT JOIN usuarios c ON a.cliente_id = c.id
    LEFT JOIN item_agendamento ia ON a.id = ia.agendamento_id
    LEFT JOIN servicos s ON ia.servico_id = s.id
    WHERE a.estabelecimento_id = ?
      AND DATE(a.data_hora_inicio) = ?
      AND a.status IN ('agendado', 'confirmado', 'em_andamento')
  `;
  const params: QueryParams = [estabelecimentoId, data];

  if (profissionalId) {
    query += ' AND a.profissional_id = ?';
    params.push(profissionalId);
  }

  query += ' GROUP BY a.id, p.nome, e.nome, a.data_hora_inicio, a.data_hora_fim, a.status, c.nome, a.valor_total ORDER BY p.nome, a.data_hora_inicio';

  const [rows] = await pool.execute(query, params);
  return rows as AgendaDia[];
}

export async function relatorioServicosMaisVendidos(
  estabelecimentoId: string,
  dias = 30
): Promise<ServicoRanking[]> {
  const [rows] = await pool.execute(
    `SELECT
       s.nome AS servico,
       e.nome AS estabelecimento,
       COUNT(ia.id) AS quantidade_vendida,
       SUM(ia.subtotal) AS receita_total,
       AVG(ia.preco_unitario) AS preco_medio
     FROM item_agendamento ia
     JOIN servicos s ON ia.servico_id = s.id
     JOIN agendamentos a ON ia.agendamento_id = a.id
     JOIN estabelecimentos e ON a.estabelecimento_id = e.id
     WHERE a.estabelecimento_id = ?
       AND a.status = 'concluido'
       AND a.data_hora_inicio >= DATE_SUB(
           (SELECT MAX(data_hora_inicio) FROM agendamentos WHERE status = 'concluido'),
           INTERVAL ? DAY
       )
     GROUP BY s.id, s.nome, e.nome
     ORDER BY quantidade_vendida DESC, receita_total DESC
     LIMIT 10`,
    [estabelecimentoId, dias] as QueryParams
  );
  return rows as ServicoRanking[];
}

export async function relatorioClientesFieis(
  estabelecimentoId: string,
  limite = 10
): Promise<ClienteFiel[]> {
  const [rows] = await pool.execute(
    `SELECT
       c.nome AS cliente,
       c.email,
       COUNT(DISTINCT a.id) AS total_agendamentos,
       SUM(a.valor_total) AS valor_total_gasto,
       AVG(a.valor_total) AS ticket_medio,
       MAX(a.data_hora_inicio) AS ultimo_agendamento,
       DATEDIFF(
           (SELECT MAX(data_hora_inicio) FROM agendamentos),
           MAX(a.data_hora_inicio)
       ) AS dias_desde_ultimo
     FROM agendamentos a
     JOIN usuarios c ON a.cliente_id = c.id
     WHERE a.estabelecimento_id = ?
       AND a.status = 'concluido'
     GROUP BY c.id, c.nome, c.email
     HAVING total_agendamentos >= 2
     ORDER BY total_agendamentos DESC, valor_total_gasto DESC
     LIMIT ?`,
    [estabelecimentoId, limite] as QueryParams
  );
  return rows as ClienteFiel[];
}

export async function relatorioHorariosPico(estabelecimentoId: string): Promise<HorarioPico[]> {
  const [rows] = await pool.execute(
    `SELECT
       HOUR(a.data_hora_inicio) AS hora,
       COUNT(*) AS total_agendamentos,
       ROUND(COUNT(*) * 100.0 / (
           SELECT COUNT(*) FROM agendamentos WHERE estabelecimento_id = ? AND status = 'concluido'
       ), 2) AS percentual
     FROM agendamentos a
     WHERE a.estabelecimento_id = ?
       AND a.status = 'concluido'
     GROUP BY HOUR(a.data_hora_inicio)
     ORDER BY total_agendamentos DESC`,
    [estabelecimentoId, estabelecimentoId] as QueryParams
  );
  return rows as HorarioPico[];
}

export async function relatorioPlanosStatus(): Promise<PlanoStatus[]> {
  const [rows] = await pool.execute(
    `SELECT
       pa.nome AS plano,
       COUNT(CASE WHEN a.status = 'ativa' THEN 1 END) AS ativas,
       COUNT(CASE WHEN a.status = 'vencida' THEN 1 END) AS vencidas,
       COUNT(CASE WHEN a.status = 'cancelada' THEN 1 END) AS canceladas,
       COUNT(CASE WHEN a.status = 'pendente' THEN 1 END) AS pendentes,
       SUM(CASE WHEN a.status = 'ativa' THEN pa.preco_mensal ELSE 0 END) AS mrr_atual
     FROM assinaturas a
     JOIN planos_assinatura pa ON a.plano_id = pa.id
     GROUP BY pa.id, pa.nome
     ORDER BY mrr_atual DESC`
  );
  return rows as PlanoStatus[];
}

export async function relatorioAvaliacoesDetalhadas(estabelecimentoId: string): Promise<AvaliacaoDetalhada | null> {
  const [rows] = await pool.execute(
    `SELECT
       e.nome AS estabelecimento,
       e.avaliacao AS media_geral,
       COUNT(av.id) AS total_avaliacoes,
       ROUND(AVG(av.estrelas), 2) AS media_calculada,
       COUNT(CASE WHEN av.estrelas = 5 THEN 1 END) AS cinco_estrelas,
       COUNT(CASE WHEN av.estrelas = 4 THEN 1 END) AS quatro_estrelas,
       COUNT(CASE WHEN av.estrelas <= 3 THEN 1 END) AS tres_ou_menos,
       GROUP_CONCAT(
           DISTINCT CASE WHEN av.comentario IS NOT NULL THEN av.comentario END
           SEPARATOR ' | '
       ) AS ultimos_comentarios
     FROM estabelecimentos e
     LEFT JOIN avaliacoes av ON e.id = av.estabelecimento_id
     WHERE e.id = ?
     GROUP BY e.id, e.nome, e.avaliacao`,
    [estabelecimentoId] as QueryParams
  );
  return (rows as AvaliacaoDetalhada[])[0] ?? null;
}

export async function relatorioAuditoriaPrecos(estabelecimentoId: string): Promise<AuditoriaPreco[]> {
  const [rows] = await pool.execute(
    `SELECT
       a.id AS agendamento_id,
       e.nome AS estabelecimento,
       s.nome AS servico,
       ia.preco_unitario AS preco_congelado,
       s.preco AS preco_atual,
       CASE
           WHEN ia.preco_unitario = s.preco THEN 'OK'
           WHEN ia.preco_unitario < s.preco THEN 'PREÇO_AUMENTOU'
           ELSE 'PREÇO_DIMINUIU'
       END AS status_preco,
       (s.preco - ia.preco_unitario) AS diferenca,
       a.data_hora_inicio
     FROM item_agendamento ia
     JOIN agendamentos a ON ia.agendamento_id = a.id
     JOIN servicos s ON ia.servico_id = s.id
     JOIN estabelecimentos e ON a.estabelecimento_id = e.id
     WHERE a.estabelecimento_id = ?
       AND a.status = 'concluido'
     ORDER BY a.data_hora_inicio DESC`,
    [estabelecimentoId] as QueryParams
  );
  return rows as AuditoriaPreco[];
}

// ============================================================================
// MODERAÇÃO ADMIN
// ============================================================================

export interface EstabelecimentoAdmin {
  id: string;
  slug: string;
  nome: string;
  responsavel: string;
  cidade: string;
  nicho: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'suspenso';
  avaliacao: number;
  seguidores: number;
  data_criacao: Date;
}

export async function listarEstabelecimentosAdmin(filtros?: { status?: string }): Promise<EstabelecimentoAdmin[]> {
  let query = 'SELECT id, slug, nome, responsavel, cidade, nicho, status, avaliacao, seguidores, data_criacao FROM estabelecimentos';
  const params: QueryParams = [];

  if (filtros?.status) {
    query += ' WHERE status = ?';
    params.push(filtros.status);
  }

  query += ' ORDER BY data_criacao DESC';

  const [rows] = await pool.execute(query, params);
  return rows as EstabelecimentoAdmin[];
}

export async function moderarEstabelecimento(
  id: string,
  acao: 'aprovar' | 'rejeitar' | 'suspender' | 'reativar',
  _motivo?: string
): Promise<EstabelecimentoAdmin | null> {
  const statusMap: Record<string, 'aprovado' | 'rejeitado' | 'suspenso' | 'pendente'> = {
    aprovar: 'aprovado',
    rejeitar: 'rejeitado',
    suspender: 'suspenso',
    reativar: 'pendente'
  };

  await pool.execute(
    'UPDATE estabelecimentos SET status = ?, data_atualizacao = NOW() WHERE id = ?',
    [statusMap[acao], id] as QueryParams
  );

  const [rows] = await pool.execute(
    'SELECT id, slug, nome, responsavel, cidade, nicho, status, avaliacao, seguidores, data_criacao FROM estabelecimentos WHERE id = ?',
    [id] as QueryParams
  );
  return (rows as EstabelecimentoAdmin[])[0] ?? null;
}

// Tipos para queries de estatísticas
interface EstabStatsRow {
  total_estabelecimentos: number;
  estabelecimentos_aprovados: number;
  estabelecimentos_pendentes: number;
}

interface UserStatsRow {
  total_usuarios: number;
}

interface AgendStatsRow {
  total_agendamentos_mes: number;
}

interface MrrStatsRow {
  mrr_total: number | null;
}

export async function estatisticasGerais(): Promise<{
  total_estabelecimentos: number;
  estabelecimentos_aprovados: number;
  estabelecimentos_pendentes: number;
  total_usuarios: number;
  total_agendamentos_mes: number;
  mrr_total: number;
}> {
  const [estab] = await pool.execute(
    `SELECT
       COUNT(*) as total_estabelecimentos,
       SUM(CASE WHEN status = 'aprovado' THEN 1 ELSE 0 END) as estabelecimentos_aprovados,
       SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as estabelecimentos_pendentes
     FROM estabelecimentos`
  );

  const [users] = await pool.execute('SELECT COUNT(*) as total_usuarios FROM usuarios WHERE ativo = true');

  const [agend] = await pool.execute(
    `SELECT COUNT(*) as total_agendamentos_mes
     FROM agendamentos
     WHERE data_hora_inicio >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)`
  );

  const [mrr] = await pool.execute(
    `SELECT
       SUM(CASE WHEN a.status = 'ativa' AND a.ciclo = 'mensal' THEN p.preco_mensal ELSE 0 END) +
       SUM(CASE WHEN a.status = 'ativa' AND a.ciclo = 'anual' AND p.preco_anual IS NOT NULL THEN p.preco_anual/12 ELSE 0 END) as mrr_total
     FROM assinaturas a
     JOIN planos_assinatura p ON a.plano_id = p.id`
  );

  const estabRows = estab as EstabStatsRow[];
  const userRows = users as UserStatsRow[];
  const agendRows = agend as AgendStatsRow[];
  const mrrRows = mrr as MrrStatsRow[];

  return {
    total_estabelecimentos: estabRows[0]?.total_estabelecimentos ?? 0,
    estabelecimentos_aprovados: estabRows[0]?.estabelecimentos_aprovados ?? 0,
    estabelecimentos_pendentes: estabRows[0]?.estabelecimentos_pendentes ?? 0,
    total_usuarios: userRows[0]?.total_usuarios ?? 0,
    total_agendamentos_mes: agendRows[0]?.total_agendamentos_mes ?? 0,
    mrr_total: Number(((mrrRows[0]?.mrr_total ?? 0)).toFixed(2))
  };
}