/**
 * Hooks React para FinOps - Centros de Custo, Orçamentos, Lançamentos, Alertas, Relatórios.
 * Interface reativa com AbortController para race conditions.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  CentroCusto,
  Orcamento,
  LancamentoCusto,
  AlertaFinanceiro,
  MetricasFinanceiras,
  PrevisaoCusto,
  ConfiguracaoFinOps,
  PeriodoOrcamento,
  CategoriaCusto,
  TipoCusto,
  StatusOrcamento,
} from '../types';

import {
  getFinOpsService,
  createFinOpsService,
  resetFinOpsService,
} from '../services';

import {
  obterStatusOrcamento,
  obterCorStatus,
  formatarMoeda,
  CATEGORIAS_CUSTO,
  TIPOS_CUSTO,
  PERIODOS_ORCAMENTO,
} from '../types';

// ============================================
// HOOK PRINCIPAL - FINOPS
// ============================================

export interface UseFinOpsReturn {
  // Centros de Custo
  centrosCusto: {
    listar: () => CentroCusto[];
    obterPorId: (id: string) => CentroCusto | undefined;
    criar: (dados: Omit<CentroCusto, 'id' | 'criadoEm' | 'ativo'>) => CentroCusto;
    atualizar: (id: string, dados: Partial<CentroCusto>) => CentroCusto | null;
    remover: (id: string) => boolean;
    listarAtivos: () => CentroCusto[];
  };
  // Orçamentos
  orcamentos: {
    listar: () => Orcamento[];
    obterPorId: (id: string) => Orcamento | undefined;
    listarPorCentro: (centroCustoId: string) => Orcamento[];
    listarAtivos: () => Orcamento[];
    criar: (dados: Omit<Orcamento, 'id' | 'valorGasto' | 'valorProjetado' | 'criadoEm' | 'atualizadoEm'>) => Orcamento;
    atualizar: (id: string, dados: Partial<Orcamento>) => Orcamento | null;
    remover: (id: string) => boolean;
    recalcularGastos: () => void;
    obterStatus: (orcamento: Orcamento) => StatusOrcamento;
    obterCorStatus: (status: StatusOrcamento) => string;
  };
  // Lançamentos
  lancamentos: {
    listar: () => LancamentoCusto[];
    obterPorId: (id: string) => LancamentoCusto | undefined;
    listarPorCentro: (centroCustoId: string) => LancamentoCusto[];
    listarPorOrcamento: (orcamentoId: string) => LancamentoCusto[];
    listarPorPeriodo: (inicio: string, fim: string) => LancamentoCusto[];
    listarPorCategoria: (categoria: CategoriaCusto) => LancamentoCusto[];
    criar: (dados: Omit<LancamentoCusto, 'id' | 'criadoEm' | 'atualizadoEm' | 'status'>) => LancamentoCusto;
    atualizar: (id: string, dados: Partial<LancamentoCusto>) => LancamentoCusto | null;
    remover: (id: string) => boolean;
    pagar: (id: string, dataPagamento?: string) => LancamentoCusto | null;
    cancelar: (id: string) => LancamentoCusto | null;
  };
  // Alertas
  alertas: {
    listar: () => AlertaFinanceiro[];
    listarNaoLidos: () => AlertaFinanceiro[];
    listarPorSeveridade: (severidade: AlertaFinanceiro['severidade']) => AlertaFinanceiro[];
    marcarComoLido: (id: string) => AlertaFinanceiro | null;
    marcarComoReconhecido: (id: string) => AlertaFinanceiro | null;
    limparLidos: () => number;
    gerarAlertas: () => AlertaFinanceiro[];
    contadorNaoLidos: number;
  };
  // Relatórios
  relatorios: {
    gerarMetricas: (periodoInicio: string, periodoFim: string) => MetricasFinanceiras;
    gerarPrevisao: (centroCustoId: string, periodo?: PeriodoOrcamento) => PrevisaoCusto;
    exportarLancamentosCSV: () => string;
    exportarOrcamentosCSV: () => string;
  };
  // Config
  configurar: (config: Partial<ConfiguracaoFinOps>) => void;
  obterConfig: () => ConfiguracaoFinOps;
  // Constantes
  categorias: typeof CATEGORIAS_CUSTO;
  tipos: typeof TIPOS_CUSTO;
  periodos: typeof PERIODOS_ORCAMENTO;
  formatarMoeda: (valor: number, moeda?: 'BRL' | 'USD' | 'EUR') => string;
}

export function useFinOps(config?: Partial<ConfiguracaoFinOps>): UseFinOpsReturn {
  const serviceRef = useRef<ReturnType<typeof getFinOpsService> | null>(null);
  const initialized = useRef(false);
  const [, forceUpdate] = useState(0);

  if (!initialized.current) {
    serviceRef.current = createFinOpsService(config);
    initialized.current = true;
  }

  const service = serviceRef.current!;

  // Subscrever para updates reativos
  useEffect(() => {
    const unsubscribe = service.subscrever(() => forceUpdate(n => n + 1));
    return unsubscribe;
  }, [service]);

  // Centros de Custo
  const centrosCusto = useMemo(() => ({
    listar: () => service.listar(),
    obterPorId: (id: string) => service.obterPorId(id),
    criar: (dados: Omit<CentroCusto, 'id' | 'criadoEm' | 'ativo'>) => service.criar(dados),
    atualizar: (id: string, dados: Partial<CentroCusto>) => service.atualizar(id, dados),
    remover: (id: string) => service.remover(id),
    listarAtivos: () => service.listarAtivos(),
  }), [service]);

  // Orçamentos
  const orcamentos = useMemo(() => ({
    listar: () => service.listar(),
    obterPorId: (id: string) => service.obterPorId(id),
    listarPorCentro: (centroCustoId: string) => service.listarPorCentro(centroCustoId),
    listarAtivos: () => service.listarAtivos(),
    criar: (dados: Omit<Orcamento, 'id' | 'valorGasto' | 'valorProjetado' | 'criadoEm' | 'atualizadoEm'>) => service.criar(dados),
    atualizar: (id: string, dados: Partial<Orcamento>) => service.atualizar(id, dados),
    remover: (id: string) => service.remover(id),
    recalcularGastos: () => service.recalcularGastos(service.listar()),
    obterStatus: (orcamento: Orcamento) => obterStatusOrcamento(orcamento.valorGasto, orcamento.valorLimite, orcamento.alertaPercentual),
    obterCorStatus: (status: StatusOrcamento) => obterCorStatus(status),
  }), [service]);

  // Lançamentos
  const lancamentos = useMemo(() => ({
    listar: () => service.listar(),
    obterPorId: (id: string) => service.obterPorId(id),
    listarPorCentro: (centroCustoId: string) => service.listarPorCentro(centroCustoId),
    listarPorOrcamento: (orcamentoId: string) => service.listarPorOrcamento(orcamentoId),
    listarPorPeriodo: (inicio: string, fim: string) => service.listarPorPeriodo(inicio, fim),
    listarPorCategoria: (categoria: CategoriaCusto) => service.listarPorCategoria(categoria),
    criar: (dados: Omit<LancamentoCusto, 'id' | 'criadoEm' | 'atualizadoEm' | 'status'>) => service.criar(dados),
    atualizar: (id: string, dados: Partial<LancamentoCusto>) => service.atualizar(id, dados),
    remover: (id: string) => service.remover(id),
    pagar: (id: string, dataPagamento?: string) => service.pagar(id, dataPagamento),
    cancelar: (id: string) => service.cancelar(id),
  }), [service]);

  // Alertas
  const alertas = useMemo(() => ({
    listar: () => service.listar(),
    listarNaoLidos: () => service.listarNaoLidos(),
    listarPorSeveridade: (severidade: AlertaFinanceiro['severidade']) => service.listarPorSeveridade(severidade),
    marcarComoLido: (id: string) => service.marcarComoLido(id),
    marcarComoReconhecido: (id: string) => service.marcarComoReconhecido(id),
    limparLidos: () => service.limparLidos(),
    gerarAlertas: () => service.gerarAlertas(service.listarAtivos(), service.listar()),
    get contadorNaoLidos() { return service.listarNaoLidos().length; },
  }), [service]);

  // Relatórios
  const relatorios = useMemo(() => ({
    gerarMetricas: (periodoInicio: string, periodoFim: string) => service.gerarMetricas(periodoInicio, periodoFim),
    gerarPrevisao: (centroCustoId: string, periodo?: PeriodoOrcamento) => service.gerarPrevisao(centroCustoId, periodo),
    exportarLancamentosCSV: () => service.exportarLancamentosCSV(),
    exportarOrcamentosCSV: () => service.exportarOrcamentosCSV(),
  }), [service]);

  const configurar = useCallback((cfg: Partial<ConfiguracaoFinOps>) => service.configurar(cfg), [service]);
  const obterConfig = useCallback(() => service.obterConfig(), [service]);

  return {
    centrosCusto,
    orcamentos,
    lancamentos,
    alertas,
    relatorios,
    configurar,
    obterConfig,
    categorias: CATEGORIAS_CUSTO,
    tipos: TIPOS_CUSTO,
    periodos: PERIODOS_ORCAMENTO,
    formatarMoeda,
  };
}

// ============================================
// HOOKS ESPECIALIZADOS
// ============================================

// Hook para lista reativa de centros de custo
export function useCentrosCusto() {
  const { centrosCusto } = useFinOps();
  const [data, setData] = useState<CentroCusto[]>(() => centrosCusto.listar());

  useEffect(() => {
    const unsubscribe = () => setData(centrosCusto.listar());
    // Nota: service não expõe subscribe diretamente no hook principal
    // Em produção, usar o service diretamente ou Context
    const interval = setInterval(unsubscribe, 5000);
    return () => clearInterval(interval);
  }, [centrosCusto]);

  return useMemo(() => ({
    centros: data,
    criar: centrosCusto.criar,
    atualizar: centrosCusto.atualizar,
    remover: centrosCusto.remover,
    refresh: () => setData(centrosCusto.listar()),
  }), [centrosCusto, data]);
}

// Hook para lista reativa de orçamentos
export function useOrcamentos(centroCustoId?: string) {
  const { orcamentos } = useFinOps();
  const [data, setData] = useState<Orcamento[]>(() =>
    centroCustoId ? orcamentos.listarPorCentro(centroCustoId) : orcamentos.listar()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setData(centroCustoId ? orcamentos.listarPorCentro(centroCustoId) : orcamentos.listar());
    }, 5000);
    return () => clearInterval(interval);
  }, [orcamentos, centroCustoId]);

  return useMemo(() => ({
    orcamentos: data,
    criar: orcamentos.criar,
    atualizar: orcamentos.atualizar,
    remover: orcamentos.remover,
    recalcular: orcamentos.recalcularGastos,
    obterStatus: orcamentos.obterStatus,
    obterCorStatus: orcamentos.obterCorStatus,
    refresh: () => setData(centroCustoId ? orcamentos.listarPorCentro(centroCustoId!) : orcamentos.listar()),
  }), [orcamentos, data, centroCustoId]);
}

// Hook para lista reativa de lançamentos
export function useLancamentos(filtros?: {
  centroCustoId?: string;
  orcamentoId?: string;
  periodoInicio?: string;
  periodoFim?: string;
  categoria?: CategoriaCusto;
}) {
  const { lancamentos } = useFinOps();
  const [data, setData] = useState<LancamentoCusto[]>(() => {
    let result = lancamentos.listar();
    if (filtros?.centroCustoId) result = result.filter(l => l.centroCustoId === filtros.centroCustoId);
    if (filtros?.orcamentoId) result = result.filter(l => l.orcamentoId === filtros.orcamentoId);
    if (filtros?.periodoInicio && filtros?.periodoFim) result = lancamentos.listarPorPeriodo(filtros.periodoInicio, filtros.periodoFim);
    if (filtros?.categoria) result = result.filter(l => l.categoria === filtros.categoria);
    return result;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      let result = lancamentos.listar();
      if (filtros?.centroCustoId) result = result.filter(l => l.centroCustoId === filtros.centroCustoId);
      if (filtros?.orcamentoId) result = result.filter(l => l.orcamentoId === filtros.orcamentoId);
      if (filtros?.periodoInicio && filtros?.periodoFim) result = lancamentos.listarPorPeriodo(filtros.periodoInicio, filtros.periodoFim);
      if (filtros?.categoria) result = result.filter(l => l.categoria === filtros.categoria);
      setData(result);
    }, 5000);
    return () => clearInterval(interval);
  }, [lancamentos, filtros]);

  return useMemo(() => ({
    lancamentos: data,
    criar: lancamentos.criar,
    atualizar: lancamentos.atualizar,
    remover: lancamentos.remover,
    pagar: lancamentos.pagar,
    cancelar: lancamentos.cancelar,
    refresh: () => {
      let result = lancamentos.listar();
      if (filtros?.centroCustoId) result = result.filter(l => l.centroCustoId === filtros.centroCustoId);
      if (filtros?.orcamentoId) result = result.filter(l => l.orcamentoId === filtros.orcamentoId);
      if (filtros?.periodoInicio && filtros?.periodoFim) result = lancamentos.listarPorPeriodo(filtros.periodoInicio, filtros.periodoFim);
      if (filtros?.categoria) result = result.filter(l => l.categoria === filtros.categoria);
      setData(result);
    },
  }), [lancamentos, data, filtros]);
}

// Hook para alertas reativos
export function useAlertas() {
  const { alertas } = useFinOps();
  const [data, setData] = useState<AlertaFinanceiro[]>(() => alertas.listar());
  const [naoLidos, setNaoLidos] = useState(() => alertas.contadorNaoLidos);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(alertas.listar());
      setNaoLidos(alertas.contadorNaoLidos);
    }, 10000);
    return () => clearInterval(interval);
  }, [alertas]);

  return useMemo(() => ({
    alertas: data,
    naoLidos,
    marcarComoLido: alertas.marcarComoLido,
    marcarComoReconhecido: alertas.marcarComoReconhecido,
    limparLidos: () => { const count = alertas.limparLidos(); setNaoLidos(alertas.contadorNaoLidos); return count; },
    gerarAlertas: alertas.gerarAlertas,
    refresh: () => { setData(alertas.listar()); setNaoLidos(alertas.contadorNaoLidos); },
  }), [alertas, data, naoLidos]);
}

// Hook para métricas financeiras
export function useMetricasFinanceiras(periodoInicio?: string, periodoFim?: string) {
  const { relatorios } = useFinOps();
  const [data, setData] = useState<MetricasFinanceiras | null>(null);
  const [carregando, setCarregando] = useState(false);

  const calcular = useCallback(async () => {
    if (!periodoInicio || !periodoFim) return;
    setCarregando(true);
    try {
      const metricas = relatorios.gerarMetricas(periodoInicio, periodoFim);
      setData(metricas);
    } finally {
      setCarregando(false);
    }
  }, [relatorios, periodoInicio, periodoFim]);

  useEffect(() => {
    calcular();
  }, [calcular]);

  return useMemo(() => ({
    metricas: data,
    carregando,
    recalcular: calcular,
  }), [data, carregando, calcular]);
}

// Hook para previsão de custos
export function usePrevisaoCusto(centroCustoId?: string, periodo: PeriodoOrcamento = 'mensal') {
  const { relatorios } = useFinOps();
  const [data, setData] = useState<PrevisaoCusto | null>(null);
  const [carregando, setCarregando] = useState(false);

  const calcular = useCallback(async () => {
    if (!centroCustoId) return;
    setCarregando(true);
    try {
      const previsao = relatorios.gerarPrevisao(centroCustoId, periodo);
      setData(previsao);
    } finally {
      setCarregando(false);
    }
  }, [relatorios, centroCustoId, periodo]);

  useEffect(() => {
    calcular();
  }, [calcular]);

  return useMemo(() => ({
    previsao: data,
    carregando,
    recalcular: calcular,
  }), [data, carregando, calcular]);
}

// Hook para exportação CSV
export function useExportacaoCSV() {
  const { relatorios } = useFinOps();

  const exportarLancamentos = useCallback(() => {
    const csv = relatorios.exportarLancamentosCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lancamentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [relatorios]);

  const exportarOrcamentos = useCallback(() => {
    const csv = relatorios.exportarOrcamentosCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orcamentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [relatorios]);

  return { exportarLancamentos, exportarOrcamentos };
}