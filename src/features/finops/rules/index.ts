/**
 * Regras puras do domínio FinOps - Validações, Cálculos, Alertas, Projeções.
 * Zero dependências React, < 30 linhas por função, early returns.
 */

import type {
  CentroCusto,
  Orcamento,
  LancamentoCusto,
  AlertaFinanceiro,
  RelatorioFinanceiro,
  MetricasFinanceiras,
  PrevisaoCusto,
  ConfiguracaoFinOps,
  TipoCusto,
  CategoriaCusto,
  PeriodoOrcamento,
  StatusOrcamento,
  SeveridadeAlerta,
  Moeda,
} from '../types';

import {
  CONFIG_PADRAO,
  CATEGORIAS_CUSTO,
  TIPOS_CUSTO,
  PERIODOS_ORCAMENTO,
  SEVERIDADES_ALERTA,
  MOEDAS,
  formatarMoeda,
  formatarPercentual,
  calcularPercentual,
  obterStatusOrcamento,
  obterCorStatus,
  gerarIdLancamento,
  gerarIdOrcamento,
  gerarIdAlerta,
  obterInicioPeriodo,
  obterFimPeriodo,
  agruparPorCategoria,
  agruparPorCentro,
  calcularVariacao,
  projetarGastoMensal,
} from '../types';

// ============================================
// VALIDAÇÕES
// ============================================

export function validarCentroCusto(centro: Partial<CentroCusto>): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (!centro.nome || centro.nome.trim().length < 2) {
    erros.push('Nome deve ter pelo menos 2 caracteres');
  }

  if (centro.nome && centro.nome.length > 100) {
    erros.push('Nome deve ter no máximo 100 caracteres');
  }

  if (centro.descricao && centro.descricao.length > 500) {
    erros.push('Descrição deve ter no máximo 500 caracteres');
  }

  return { valido: erros.length === 0, erros };
}

export function validarOrcamento(orcamento: Partial<Orcamento>): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (!orcamento.nome || orcamento.nome.trim().length < 2) {
    erros.push('Nome do orçamento deve ter pelo menos 2 caracteres');
  }

  if (!orcamento.centroCustoId) {
    erros.push('Centro de custo é obrigatório');
  }

  if (orcamento.valorLimite !== undefined && orcamento.valorLimite < 0) {
    erros.push('Valor limite não pode ser negativo');
  }

  if (orcamento.periodo && !PERIODOS_ORCAMENTO.some(p => p.value === orcamento.periodo)) {
    erros.push('Período inválido');
  }

  if (orcamento.alertaPercentual !== undefined && (orcamento.alertaPercentual < 1 || orcamento.alertaPercentual > 100)) {
    erros.push('Percentual de alerta deve estar entre 1 e 100');
  }

  if (orcamento.inicioVigencia && orcamento.fimVigencia) {
    const inicio = new Date(orcamento.inicioVigencia);
    const fim = new Date(orcamento.fimVigencia);
    if (fim <= inicio) {
      erros.push('Fim da vigência deve ser posterior ao início');
    }
  }

  return { valido: erros.length === 0, erros };
}

export function validarLancamento(lancamento: Partial<LancamentoCusto>): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (!lancamento.descricao || lancamento.descricao.trim().length < 2) {
    erros.push('Descrição deve ter pelo menos 2 caracteres');
  }

  if (lancamento.valor === undefined || lancamento.valor < 0) {
    erros.push('Valor deve ser maior ou igual a zero');
  }

  if (!lancamento.centroCustoId) {
    erros.push('Centro de custo é obrigatório');
  }

  if (lancamento.tipo && !TIPOS_CUSTO.some(t => t.value === lancamento.tipo)) {
    erros.push('Tipo de custo inválido');
  }

  if (lancamento.categoria && !CATEGORIAS_CUSTO.some(c => c.value === lancamento.categoria)) {
    erros.push('Categoria inválida');
  }

  if (lancamento.moeda && !MOEDAS.some(m => m.value === lancamento.moeda)) {
    erros.push('Moeda inválida');
  }

  if (lancamento.data) {
    const data = new Date(lancamento.data);
    if (isNaN(data.getTime())) {
      erros.push('Data inválida');
    }
  }

  return { valido: erros.length === 0, erros };
}

export function validarConfiguracao(config: Partial<ConfiguracaoFinOps>): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (config.moedaPadrao && !MOEDAS.some(m => m.value === config.moedaPadrao)) {
    erros.push('Moeda padrão inválida');
  }

  if (config.alertaPadraoPercentual !== undefined && (config.alertaPadraoPercentual < 1 || config.alertaPadraoPercentual > 100)) {
    erros.push('Percentual de alerta padrão deve estar entre 1 e 100');
  }

  if (config.diasProjecao !== undefined && (config.diasProjecao < 1 || config.diasProjecao > 365)) {
    erros.push('Dias de projeção deve estar entre 1 e 365');
  }

  return { valido: erros.length === 0, erros };
}

// ============================================
// CRIAÇÃO DE ENTIDADES
// ============================================

export function criarCentroCusto(dados: Omit<CentroCusto, 'id' | 'criadoEm' | 'ativo'>): CentroCusto {
  const agora = new Date().toISOString();
  return {
    ...dados,
    id: `CC_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    ativo: true,
    criadoEm: agora,
  };
}

export function criarOrcamento(dados: Omit<Orcamento, 'id' | 'valorGasto' | 'valorProjetado' | 'criadoEm' | 'atualizadoEm'>): Orcamento {
  const agora = new Date().toISOString();
  return {
    ...dados,
    id: gerarIdOrcamento(),
    valorGasto: 0,
    valorProjetado: 0,
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

export function criarLancamento(dados: Omit<LancamentoCusto, 'id' | 'criadoEm' | 'atualizadoEm' | 'status'>): LancamentoCusto {
  const agora = new Date().toISOString();
  return {
    ...dados,
    id: gerarIdLancamento(),
    status: 'pendente',
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

export function criarAlerta(dados: Omit<AlertaFinanceiro, 'id' | 'lido' | 'reconhecido' | 'criadoEm' | 'lidoEm' | 'reconhecidoEm'>): AlertaFinanceiro {
  return {
    ...dados,
    id: gerarIdAlerta(),
    lido: false,
    reconhecido: false,
    criadoEm: new Date().toISOString(),
  };
}

// ============================================
// CÁLCULOS DE ORÇAMENTO
// ============================================

export function calcularGastoOrcamento(orcamento: Orcamento, lancamentos: LancamentoCusto[]): number {
  const inicio = new Date(orcamento.inicioVigencia);
  const fim = orcamento.fimVigencia ? new Date(orcamento.fimVigencia) : new Date();

  return lancamentos
    .filter(l => l.orcamentoId === orcamento.id)
    .filter(l => l.status === 'pago')
    .filter(l => {
      const data = new Date(l.data);
      return data >= inicio && data <= fim;
    })
    .reduce((sum, l) => sum + l.valor, 0);
}

export function calcularProjecaoOrcamento(orcamento: Orcamento, lancamentos: LancamentoCusto[]): number {
  const inicio = new Date(orcamento.inicioVigencia);
  const fim = orcamento.fimVigencia ? new Date(orcamento.fimVigencia) : obterFimPeriodo(orcamento.periodo);
  const hoje = new Date();

  if (hoje >= fim) return orcamento.valorGasto;

  const diasDecorridos = Math.max(1, Math.ceil((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
  const diasTotais = Math.max(1, Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));

  if (diasDecorridos >= diasTotais) return orcamento.valorGasto;

  const gastoDiario = orcamento.valorGasto / diasDecorridos;
  return Math.round(gastoDiario * diasTotais);
}

export function atualizarOrcamentoComGastos(orcamento: Orcamento, lancamentos: LancamentoCusto[]): Orcamento {
  const valorGasto = calcularGastoOrcamento(orcamento, lancamentos);
  const valorProjetado = calcularProjecaoOrcamento(orcamento, lancamentos);

  return {
    ...orcamento,
    valorGasto,
    valorProjetado,
    atualizadoEm: new Date().toISOString(),
  };
}

// ============================================
// GERAÇÃO DE ALERTAS
// ============================================

export function verificarAlertasOrcamento(orcamento: Orcamento, config: ConfiguracaoFinOps = CONFIG_PADRAO): AlertaFinanceiro[] {
  if (!config.alertasAtivos) return [];

  const alertas: AlertaFinanceiro[] = [];
  const percentual = calcularPercentual(orcamento.valorGasto, orcamento.valorLimite);
  const alertaPercentual = orcamento.alertaPercentual ?? config.alertaPadraoPercentual;

  // Verificar limite próximo
  if (percentual >= alertaPercentual && percentual < 100) {
    alertas.push(criarAlerta({
      orcamentoId: orcamento.id,
      centroCustoId: orcamento.centroCustoId,
      tipo: 'limite_proximo',
      severidade: percentual >= 90 ? 'critical' : 'warning',
      mensagem: `Orçamento "${orcamento.nome}" atingiu ${formatarPercentual(percentual)} do limite (${formatarMoeda(orcamento.valorGasto)} de ${formatarMoeda(orcamento.valorLimite)})`,
      valorAtual: orcamento.valorGasto,
      valorLimite: orcamento.valorLimite,
      percentualUso: percentual,
    }));
  }

  // Verificar limite atingido
  if (percentual >= 100 && percentual < 110) {
    alertas.push(criarAlerta({
      orcamentoId: orcamento.id,
      centroCustoId: orcamento.centroCustoId,
      tipo: 'limite_atingido',
      severidade: 'critical',
      mensagem: `Orçamento "${orcamento.nome}" atingiu 100% do limite! Gasto: ${formatarMoeda(orcamento.valorGasto)}`,
      valorAtual: orcamento.valorGasto,
      valorLimite: orcamento.valorLimite,
      percentualUso: percentual,
    }));
  }

  // Verificar limite ultrapassado
  if (percentual >= 110) {
    alertas.push(criarAlerta({
      orcamentoId: orcamento.id,
      centroCustoId: orcamento.centroCustoId,
      tipo: 'limite_ultrapassado',
      severidade: 'critical',
      mensagem: `Orçamento "${orcamento.nome}" ULTRAPASSOU o limite em ${formatarPercentual(percentual - 100)}! Excedente: ${formatarMoeda(orcamento.valorGasto - orcamento.valorLimite)}`,
      valorAtual: orcamento.valorGasto,
      valorLimite: orcamento.valorLimite,
      percentualUso: percentual,
    }));
  }

  // Verificar projeção de estouro
  if (orcamento.valorProjetado > orcamento.valorLimite && percentual < 100) {
    alertas.push(criarAlerta({
      orcamentoId: orcamento.id,
      centroCustoId: orcamento.centroCustoId,
      tipo: 'projecao_estouro',
      severidade: 'warning',
      mensagem: `Projeção indica que orçamento "${orcamento.nome}" estourará (projetado: ${formatarMoeda(orcamento.valorProjetado)}, limite: ${formatarMoeda(orcamento.valorLimite)})`,
      valorAtual: orcamento.valorProjetado,
      valorLimite: orcamento.valorLimite,
      percentualUso: calcularPercentual(orcamento.valorProjetado, orcamento.valorLimite),
    }));
  }

  return alertas;
}

export function verificarLancamentosAltos(lancamentos: LancamentoCusto[], limiteAlto: number = 500000): AlertaFinanceiro[] {
  const alertas: AlertaFinanceiro[] = [];

  for (const l of lancamentos) {
    if (l.valor >= limiteAlto && l.status === 'pago') {
      alertas.push(criarAlerta({
        orcamentoId: l.orcamentoId ?? '',
        centroCustoId: l.centroCustoId,
        tipo: 'lancamento_alto',
        severidade: l.valor >= limiteAlto * 2 ? 'critical' : 'warning',
        mensagem: `Lançamento alto detectado: "${l.descricao}" - ${formatarMoeda(l.valor)}`,
        valorAtual: l.valor,
        valorLimite: limiteAlto,
        percentualUso: calcularPercentual(l.valor, limiteAlto),
      }));
    }
  }

  return alertas;
}

export function verificarTendenciaAlta(lancamentos: LancamentoCusto[], centroCustoId: string, meses: number = 3): AlertaFinanceiro[] {
  const alertas: AlertaFinanceiro[] = [];
  const agora = new Date();
  const mesesAtras = new Date(agora.getFullYear(), agora.getMonth() - meses, 1);

  const lancamentosCentro = lancamentos
    .filter(l => l.centroCustoId === centroCustoId)
    .filter(l => l.status === 'pago')
    .filter(l => new Date(l.data) >= mesesAtras);

  if (lancamentosCentro.length < 2) return alertas;

  // Agrupar por mês
  const porMes: Record<string, number> = {};
  for (const l of lancamentosCentro) {
    const mes = l.data.substring(0, 7); // YYYY-MM
    porMes[mes] = (porMes[mes] ?? 0) + l.valor;
  }

  const mesesOrdenados = Object.keys(porMes).sort();
  if (mesesOrdenados.length < 2) return alertas;

  const atual = porMes[mesesOrdenados[mesesOrdenados.length - 1]];
  const anterior = porMes[mesesOrdenados[mesesOrdenados.length - 2]];
  const variacao = calcularVariacao(atual, anterior);

  if (variacao > 50) {
    alertas.push(criarAlerta({
      orcamentoId: '',
      centroCustoId,
      tipo: 'tendencia_alta',
      severidade: variacao > 100 ? 'critical' : 'warning',
      mensagem: `Tendência de alta detectada no centro de custo: +${formatarPercentual(variacao)} nos últimos 2 meses`,
      valorAtual: atual,
      valorLimite: anterior,
      percentualUso: variacao,
    }));
  }

  return alertas;
}

// ============================================
// CONSOLIDAÇÃO DE ALERTAS
// ============================================

export function consolidarAlertas(
  orcamentos: Orcamento[],
  lancamentos: LancamentoCusto[],
  config: ConfiguracaoFinOps = CONFIG_PADRAO
): AlertaFinanceiro[] {
  const todosAlertas: AlertaFinanceiro[] = [];

  for (const orcamento of orcamentos) {
    if (!orcamento.ativo) continue;
    todosAlertas.push(...verificarAlertasOrcamento(orcamento, config));
  }

  todosAlertas.push(...verificarLancamentosAltos(lancamentos));

  // Verificar tendência por centro de custo
  const centrosUnicos = [...new Set(lancamentos.map(l => l.centroCustoId))];
  for (const centroId of centrosUnicos) {
    todosAlertas.push(...verificarTendenciaAlta(lancamentos, centroId));
  }

  // Ordenar por severidade e data
  return todosAlertas.sort((a, b) => {
    const sevOrder = { critical: 3, warning: 2, info: 1 };
    const sevDiff = sevOrder[b.severidade] - sevOrder[a.severidade];
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
  });
}

// ============================================
// MÉTRICAS FINANCEIRAS
// ============================================

export function calcularMetricasFinanceiras(
  lancamentos: LancamentoCusto[],
  orcamentos: Orcamento[],
  centrosCusto: CentroCusto[],
  periodoInicio: string,
  periodoFim: string
): MetricasFinanceiras {
  const inicio = new Date(periodoInicio);
  const fim = new Date(periodoFim);

  const lancamentosPeriodo = lancamentos.filter(l => {
    const data = new Date(l.data);
    return data >= inicio && data <= fim && l.status === 'pago';
  });

  const receitaTotal = 0; // Seria calculado de outra fonte
  const custoTotal = lancamentosPeriodo.reduce((sum, l) => sum + l.valor, 0);
  const lucroBruto = receitaTotal - custoTotal;
  const margemBruta = receitaTotal > 0 ? (lucroBruto / receitaTotal) * 100 : 0;

  const custosPorCategoria = agruparPorCategoria(lancamentosPeriodo);
  const custosPorCentro = agruparPorCentro(lancamentosPeriodo);

  // Variação vs mês anterior
  const mesAnteriorInicio = new Date(inicio);
  mesAnteriorInicio.setMonth(mesAnteriorInicio.getMonth() - 1);
  const mesAnteriorFim = new Date(fim);
  mesAnteriorFim.setMonth(mesAnteriorFim.getMonth() - 1);

  const lancamentosMesAnterior = lancamentos.filter(l => {
    const data = new Date(l.data);
    return data >= mesAnteriorInicio && data <= mesAnteriorFim && l.status === 'pago';
  });

  const custoMesAnterior = lancamentosMesAnterior.reduce((sum, l) => sum + l.valor, 0);
  const variacaoMensal = calcularVariacao(custoTotal, custoMesAnterior);

  // Projeção mês atual
  const hoje = new Date();
  const diaDoMes = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const gastoMesAtual = lancamentosPeriodo
    .filter(l => new Date(l.data).getMonth() === hoje.getMonth())
    .reduce((sum, l) => sum + l.valor, 0);
  const projecaoMesAtual = projetarGastoMensal(gastoMesAtual, diaDoMes, diasNoMes);

  // Orçamento total
  const orcamentosAtivos = orcamentos.filter(o => o.ativo);
  const orcamentoTotal = orcamentosAtivos.reduce((sum, o) => sum + o.valorLimite, 0);
  const gastoTotal = orcamentosAtivos.reduce((sum, o) => sum + o.valorGasto, 0);
  const percentualOrcamento = orcamentoTotal > 0 ? (gastoTotal / orcamentoTotal) * 100 : 0;

  return {
    receitaTotal,
    custoTotal,
    lucroBruto,
    margemBruta,
    custosPorCategoria,
    custosPorCentro,
    variacaoMensal,
    projecaoMesAtual,
    orcamentoTotal,
    gastoTotal,
    percentualOrcamento,
  };
}

// ============================================
// PREVISÃO DE CUSTOS
// ============================================

export function gerarPrevisaoCusto(
  centroCustoId: string,
  lancamentos: LancamentoCusto[],
  periodo: PeriodoOrcamento = 'mensal'
): PrevisaoCusto {
  const agora = new Date();
  const inicio = obterInicioPeriodo(periodo, agora);
  const fim = obterFimPeriodo(periodo, agora);

  const historicos = lancamentos
    .filter(l => l.centroCustoId === centroCustoId)
    .filter(l => l.status === 'pago')
    .filter(l => {
      const data = new Date(l.data);
      return data >= inicio && data <= fim;
    });

  const valorHistorico = historicos.reduce((sum, l) => sum + l.valor, 0);

  // Média móvel simples dos últimos 3 períodos
  const periodosAnteriores = 3;
  let somaPeriodos = 0;
  let countPeriodos = 0;

  for (let i = 1; i <= periodosAnteriores; i++) {
    const inicioAnt = new Date(inicio);
    const fimAnt = new Date(fim);

    switch (periodo) {
      case 'diario':
        inicioAnt.setDate(inicioAnt.getDate() - i);
        fimAnt.setDate(fimAnt.getDate() - i);
        break;
      case 'semanal':
        inicioAnt.setDate(inicioAnt.getDate() - i * 7);
        fimAnt.setDate(fimAnt.getDate() - i * 7);
        break;
      case 'mensal':
        inicioAnt.setMonth(inicioAnt.getMonth() - i);
        fimAnt.setMonth(fimAnt.getMonth() - i);
        break;
      case 'anual':
        inicioAnt.setFullYear(inicioAnt.getFullYear() - i);
        fimAnt.setFullYear(fimAnt.getFullYear() - i);
        break;
    }

    const lancsPeriodo = lancamentos
      .filter(l => l.centroCustoId === centroCustoId)
      .filter(l => l.status === 'pago')
      .filter(l => {
        const data = new Date(l.data);
        return data >= inicioAnt && data <= fimAnt;
      });

    if (lancsPeriodo.length > 0) {
      somaPeriodos += lancsPeriodo.reduce((sum, l) => sum + l.valor, 0);
      countPeriodos++;
    }
  }

  const mediaHistorica = countPeriodos > 0 ? somaPeriodos / countPeriodos : valorHistorico;

  // Tendência linear simples
  const tendencia = countPeriodos > 1 ? (valorHistorico - mediaHistorica) / countPeriodos : 0;
  const valorPrevisto = Math.max(0, Math.round(valorHistorico + tendencia));

  // Fatores
  const fatores: PrevisaoCusto['fatores'] = [
    {
      nome: 'Média histórica',
      impacto: 'alto',
      descricao: `Média dos últimos ${countPeriodos} períodos`,
      valor: Math.round(mediaHistorica),
    },
    {
      nome: 'Tendência atual',
      impacto: tendencia > 0 ? 'alto' : 'medio',
      descricao: tendencia > 0 ? 'Crescimento detectado' : 'Estável ou decrescente',
      valor: Math.round(tendencia),
    },
  ];

  return {
    centroCustoId,
    periodo,
    valorHistorico,
    valorPrevisto,
    confianca: countPeriodos >= 3 ? 0.8 : countPeriodos >= 2 ? 0.6 : 0.4,
    fatores,
    geradoEm: new Date().toISOString(),
  };
}

// ============================================
// EXPORTAÇÃO CSV
// ============================================

export function gerarCSVLancamentos(lancamentos: LancamentoCusto[]): string {
  const cabecalho = [
    'ID',
    'Data',
    'Centro de Custo',
    'Orçamento',
    'Descrição',
    'Valor',
    'Moeda',
    'Tipo',
    'Categoria',
    'Status',
    'Fornecedor',
    'Nota Fiscal',
    'Tags',
  ].join(',');

  const linhas = lancamentos.map(l => [
    l.id,
    l.data,
    l.centroCustoId,
    l.orcamentoId ?? '',
    `"${l.descricao.replace(/"/g, '""')}"`,
    (l.valor / 100).toFixed(2),
    l.moeda,
    l.tipo,
    l.categoria,
    l.status,
    l.fornecedor ?? '',
    l.notaFiscal ?? '',
    l.tags?.join(';') ?? '',
  ].join(','));

  return [cabecalho, ...linhas].join('\n');
}

export function gerarCSVOrcamentos(orcamentos: Orcamento[]): string {
  const cabecalho = [
    'ID',
    'Nome',
    'Centro de Custo',
    'Período',
    'Limite',
    'Gasto',
    'Projetado',
    '% Alerta',
    'Status',
    'Início',
    'Fim',
    'Ativo',
  ].join(',');

  const linhas = orcamentos.map(o => [
    o.id,
    `"${o.nome.replace(/"/g, '""')}"`,
    o.centroCustoId,
    o.periodo,
    (o.valorLimite / 100).toFixed(2),
    (o.valorGasto / 100).toFixed(2),
    (o.valorProjetado / 100).toFixed(2),
    o.alertaPercentual.toString(),
    obterStatusOrcamento(o.valorGasto, o.valorLimite, o.alertaPercentual),
    o.inicioVigencia,
    o.fimVigencia ?? '',
    o.ativo ? 'Sim' : 'Não',
  ].join(','));

  return [cabecalho, ...linhas].join('\n');
}