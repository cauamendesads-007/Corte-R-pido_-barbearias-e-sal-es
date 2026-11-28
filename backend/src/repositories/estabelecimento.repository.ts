import { pool } from '@/config/database';
import type mysql from 'mysql2/promise';
import type { EstabelecimentoInput } from '@/validators/schemas';

type QueryParams = (string | number | Date | null | boolean)[];

export interface EstabelecimentoRow {
  id: string;
  slug: string;
  nome: string;
  responsavel: string;
  cidade: string;
  nicho: string;
  whatsapp: string;
  endereco: string;
  sobre: string | null;
  latitude: number | null;
  longitude: number | null;
  tema_cor: string | null;
  tema_layout: string | null;
  tema_titulo: string | null;
  tema_subtitulo: string | null;
  tempo_medio_atendimento: number | null;
  horario_funcionamento: Record<string, unknown> | null;
  permite_auto_edicao: boolean;
  configuracao_pix_modo: string;
  configuracao_pix_chave: string | null;
  configuracao_pix_percentual_sinal: number;
  seguidores: number;
  taxa_fidelidade: number;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'suspenso';
  data_criacao: Date;
  data_atualizacao: Date;
}

export async function criarEstabelecimento(data: EstabelecimentoInput, _usuarioId: string): Promise<EstabelecimentoRow> {
  const [result] = await pool.execute(
    `INSERT INTO estabelecimentos (slug, nome, responsavel, cidade, nicho, whatsapp, endereco, sobre, latitude, longitude,
       tema_cor, tema_layout, tema_titulo, tema_subtitulo, tempo_medio_atendimento, horario_funcionamento,
       permite_auto_edicao, configuracao_pix_modo, configuracao_pix_chave, configuracao_pix_percentual_sinal, taxa_fidelidade)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.slug, data.nome, data.responsavel, data.cidade, data.nicho, data.whatsapp, data.endereco,
      data.sobre ?? null, data.latitude ?? null, data.longitude ?? null,
      data.temaCor ?? null, data.temaLayout ?? null, data.temaTitulo ?? null, data.temaSubtitulo ?? null,
      data.tempoMedioAtendimento ?? null, data.horarioFuncionamento ? JSON.stringify(data.horarioFuncionamento) : null,
      data.permiteAutoEdicao ?? false, data.configuracaoPixModo ?? 'opcional', data.configuracaoPixChave ?? null,
      data.configuracaoPixPercentualSinal ?? 0, data.taxaFidelidade ?? 0
    ] as QueryParams
  );
  const insertId = (result as mysql.ResultSetHeader).insertId;
  const [rows] = await pool.execute('SELECT * FROM estabelecimentos WHERE id = ?', [insertId]);
  return (rows as EstabelecimentoRow[])[0];
}

export async function buscarPorSlug(slug: string): Promise<EstabelecimentoRow | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM estabelecimentos WHERE slug = ? AND status = "aprovado"',
    [slug] as QueryParams
  );
  return (rows as EstabelecimentoRow[])[0] ?? null;
}

export async function buscarPorId(id: string): Promise<EstabelecimentoRow | null> {
  const [rows] = await pool.execute('SELECT * FROM estabelecimentos WHERE id = ?', [id] as QueryParams);
  return (rows as EstabelecimentoRow[])[0] ?? null;
}

export async function listarAprovados(filtros?: { nicho?: string; cidade?: string }): Promise<EstabelecimentoRow[]> {
  let query = 'SELECT * FROM estabelecimentos WHERE status = "aprovado"';
  const params: QueryParams = [];

  if (filtros?.nicho) {
    query += ' AND nicho = ?';
    params.push(filtros.nicho);
  }
  if (filtros?.cidade) {
    query += ' AND cidade = ?';
    params.push(filtros.cidade);
  }

  query += ' ORDER BY avaliacao DESC, nome ASC';

  const [rows] = await pool.execute(query, params);
  return rows as EstabelecimentoRow[];
}

export async function atualizarEstabelecimento(id: string, data: Partial<EstabelecimentoInput>): Promise<EstabelecimentoRow | null> {
  const campos: string[] = [];
  const valores: QueryParams = [];

  const mapeamento: Record<string, string> = {
    slug: 'slug', nome: 'nome', responsavel: 'responsavel', cidade: 'cidade', nicho: 'nicho',
    whatsapp: 'whatsapp', endereco: 'endereco', sobre: 'sobre', latitude: 'latitude', longitude: 'longitude',
    temaCor: 'tema_cor', temaLayout: 'tema_layout', temaTitulo: 'tema_titulo', temaSubtitulo: 'tema_subtitulo',
    tempoMedioAtendimento: 'tempo_medio_atendimento', horarioFuncionamento: 'horario_funcionamento',
    permiteAutoEdicao: 'permite_auto_edicao', configuracaoPixModo: 'configuracao_pix_modo',
    configuracaoPixChave: 'configuracao_pix_chave', configuracaoPixPercentualSinal: 'configuracao_pix_percentual_sinal',
    taxaFidelidade: 'taxa_fidelidade'
  };

  for (const [key, value] of Object.entries(data)) {
    const coluna = mapeamento[key];
    if (coluna && value !== undefined) {
      campos.push(`${coluna} = ?`);
      valores.push(key === 'horarioFuncionamento' ? JSON.stringify(value as Record<string, unknown>) : (value as QueryParams[number]));
    }
  }

  if (campos.length === 0) return buscarPorId(id);

  campos.push('data_atualizacao = NOW()');
  valores.push(id);

  await pool.execute(`UPDATE estabelecimentos SET ${campos.join(', ')} WHERE id = ?`, valores);
  return buscarPorId(id);
}