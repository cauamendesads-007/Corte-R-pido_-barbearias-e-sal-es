/**
 * Serviços do domínio FinOps - CRUD, Cálculos, Alertas, Relatórios.
 * Injeção de dependência via factory/singleton.
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
  PeriodoOrcamento,
  CategoriaCusto,
  TipoCusto,
  StatusOrcamento,
} from '../types';

import {
  CONFIG_PADRAO,
  CATEGORIAS_CUSTO,
  TIPOS_CUSTO,
  PERIODOS_ORCAMENTO,
  SEVERIDADES_ALERTA,
  MOEDAS,
  formatarMoeda,
  obterStatusOrcamento,
} from '../types';

import {
  validarCentroCusto,
  validarOrcamento,
  validarLancamento,
  validarConfiguracao,
  criarCentroCusto,
  criarOrcamento,
  criarLancamento,
  atualizarOrcamentoComGastos,
  consolidarAlertas,
  calcularMetricasFinanceiras,
  gerarPrevisaoCusto,
  gerarCSVLancamentos,
  gerarCSVOrcamentos,
} from '../rules';

// ============================================
// INTERFACES (DIP)
// ============================================

export interface ICentroCustoService {
  listar(): CentroCusto[];
  obterPorId(id: string): CentroCusto | undefined;
  criar(dados: Omit<CentroCusto, 'id' | 'criadoEm' | 'ativo'>): CentroCusto;
  atualizar(id: string, dados: Partial<CentroCusto>): CentroCusto | null;
  remover(id: string): boolean;
  listarAtivos(): CentroCusto[];
}

export interface IOrcamentoService {
  listar(): Orcamento[];
  obterPorId(id: string): Orcamento | undefined;
  listarPorCentro(centroCustoId: string): Orcamento[];
  listarAtivos(): Orcamento[];
  criar(dados: Omit<Orcamento, 'id' | 'valorGasto' | 'valorProjetado' | 'criadoEm' | 'atualizadoEm'>): Orcamento;
  atualizar(id: string, dados: Partial<Orcamento>): Orcamento | null;
  remover(id: string): boolean;
  recalcularGastos(lancamentos: LancamentoCusto[]): void;
}

export interface ILancamentoService {
  listar(): LancamentoCusto[];
  obterPorId(id: string): LancamentoCusto | undefined;
  listarPorCentro(centroCustoId: string): LancamentoCusto[];
  listarPorOrcamento(orcamentoId: string): LancamentoCusto[];
  listarPorPeriodo(inicio: string, fim: string): LancamentoCusto[];
  listarPorCategoria(categoria: CategoriaCusto): LancamentoCusto[];
  criar(dados: Omit<LancamentoCusto, 'id' | 'criadoEm' | 'atualizadoEm' | 'status'>): LancamentoCusto;
  atualizar(id: string, dados: Partial<LancamentoCusto>): LancamentoCusto | null;
  remover(id: string): boolean;
  pagar(id: string, dataPagamento?: string): LancamentoCusto | null;
  cancelar(id: string): LancamentoCusto | null;
}

export interface IAlertaService {
  listar(): AlertaFinanceiro[];
  listarNaoLidos(): AlertaFinanceiro[];
  listarPorSeveridade(severidade: AlertaFinanceiro['severidade']): AlertaFinanceiro[];
  marcarComoLido(id: string): AlertaFinanceiro | null;
  marcarComoReconhecido(id: string): AlertaFinanceiro | null;
  limparLidos(): number;
  gerarAlertas(orcamentos: Orcamento[], lancamentos: LancamentoCusto[]): AlertaFinanceiro[];
}

export interface IRelatorioService {
  gerarMetricas(periodoInicio: string, periodoFim: string): MetricasFinanceiras;
  gerarPrevisao(centroCustoId: string, periodo: PeriodoOrcamento): PrevisaoCusto;
  exportarLancamentosCSV(): string;
  exportarOrcamentosCSV(): string;
}

export interface IFinOpsService extends
  ICentroCustoService,
  IOrcamentoService,
  ILancamentoService,
  IAlertaService,
  IRelatorioService {
  configurar(config: Partial<ConfiguracaoFinOps>): void;
  obterConfig(): ConfiguracaoFinOps;
}

// ============================================
// IMPLEMENTAÇÃO COM MOCK DATA
// ============================================

class FinOpsService implements IFinOpsService {
  private config: ConfiguracaoFinOps;
  private centrosCusto: Map<string, CentroCusto> = new Map();
  private orcamentos: Map<string, Orcamento> = new Map();
  private lancamentos: Map<string, LancamentoCusto> = new Map();
  private alertas: Map<string, AlertaFinanceiro> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor(config?: Partial<ConfiguracaoFinOps>) {
    this.config = { ...CONFIG_PADRAO, ...config };
    this.inicializarMockData();
  }

  private inicializarMockData(): void {
    // Centros de custo
    const centros: CentroCusto[] = [
      criarCentroCusto({ nome: 'Infraestrutura Cloud', descricao: 'Servidores, banco de dados, CDN', responsavel: 'Tech Lead' }),
      criarCentroCusto({ nome: 'Marketing Digital', descricao: 'Ads, conteúdo, SEO', responsavel: 'CMO' }),
      criarCentroCusto({ nome: 'Equipe de Desenvolvimento', descricao: 'Salários, benefícios, ferramentas', responsavel: 'CTO' }),
      criarCentroCusto({ nome: 'Operações', descricao: 'Suporte, escritório, utilidades', responsavel: 'COO' }),
    ];

    for (const c of centros) this.centrosCusto.set(c.id, c);

    // Orçamentos
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

    const orcamentos: Orcamento[] = [
      criarOrcamento({
        centroCustoId: centros[0].id,
        nome: 'Infra Cloud - Mensal',
        periodo: 'mensal',
        valorLimite: 500000, // R$ 5.000
        alertaPercentual: 80,
        severidadeAlerta: 'warning',
        ativo: true,
        inicioVigencia: inicioMes.toISOString(),
        fimVigencia: fimMes.toISOString(),
      }),
      criarOrcamento({
        centroCustoId: centros[1].id,
        nome: 'Marketing - Mensal',
        periodo: 'mensal',
        valorLimite: 300000, // R$ 3.000
        alertaPercentual: 75,
        severidadeAlerta: 'warning',
        ativo: true,
        inicioVigencia: inicioMes.toISOString(),
        fimVigencia: fimMes.toISOString(),
      }),
      criarOrcamento({
        centroCustoId: centros[2].id,
        nome: 'Dev Team - Mensal',
        periodo: 'mensal',
        valorLimite: 1500000, // R$ 15.000
        alertaPercentual: 90,
        severidadeAlerta: 'critical',
        ativo: true,
        inicioVigencia: inicioMes.toISOString(),
        fimVigencia: fimMes.toISOString(),
      }),
      criarOrcamento({
        centroCustoId: centros[3].id,
        nome: 'Operações - Mensal',
        periodo: 'mensal',
        valorLimite: 200000, // R$ 2.000
        alertaPercentual: 80,
        severidadeAlerta: 'warning',
        ativo: true,
        inicioVigencia: inicioMes.toISOString(),
        fimVigencia: fimMes.toISOString(),
      }),
    ];

    for (const o of orcamentos) this.orcamentos.set(o.id, o);

    // Lançamentos mock
    const lancamentosMock: Omit<LancamentoCusto, 'id' | 'criadoEm' | 'atualizadoEm' | 'status'>[] = [
      { centroCustoId: centros[0].id, orcamentoId: orcamentos[0].id, descricao: 'AWS EC2 Instances', valor: 120000, moeda: 'BRL', tipo: 'fixo', categoria: 'infraestrutura', data: new Date(agora.getFullYear(), agora.getMonth(), 5).toISOString(), dataPagamento: new Date(agora.getFullYear(), agora.getMonth(), 5).toISOString(), fornecedor: 'AWS', tags: ['producao'] },
      { centroCustoId: centros[0].id, orcamentoId: orcamentos[0].id, descricao: 'RDS PostgreSQL', valor: 80000, moeda: 'BRL', tipo: 'fixo', categoria: 'infraestrutura', data: new Date(agora.getFullYear(), agora.getMonth(), 5).toISOString(), dataPagamento: new Date(agora.getFullYear(), agora.getMonth(), 5).toISOString(), fornecedor: 'AWS', tags: ['banco'] },
      { centroCustoId: centros[0].id, orcamentoId: orcamentos[0].id, descricao: 'CloudFront CDN', valor: 15000, moeda: 'BRL', tipo: 'variavel', categoria: 'infraestrutura', data: new Date(agora.getFullYear(), agora.getMonth(), 10).toISOString(), dataPagamento: new Date(agora.getFullYear(), agora.getMonth(), 10).toISOString(), fornecedor: 'AWS', tags: ['cdn'] },
      { centroCustoId: centros[1].id, orcamentoId: orcamentos[1].id, descricao: 'Google Ads - Campanha Verão', valor: 150000, moeda: 'BRL', tipo: 'variavel', categoria: 'marketing', data: new Date(agora.getFullYear(), agora.getMonth(), 3).toISOString(), dataPagamento: new Date(agora.getFullYear(), agora.getMonth(), 3).toISOString(), fornecedor: 'Google', tags: ['ads', 'verao'] },
      { centroCustoId: centros[1].id, orcamentoId: orcamentos[1].id, descricao: 'Facebook/Instagram Ads', valor: 80000, moeda: 'BRL', tipo: 'variavel', categoria: 'marketing', data: new Date(agora.getFullYear(), agora.getMonth(), 8).toISOString(), dataPagamento: new Date(agora.getFullYear(), agora.getMonth(), 8).toISOString(), fornecedor: 'Meta', tags: ['social'] },
      { centroCustoId: centros[2].id, orcamentoId: orcamentos[2].id, descricao: 'Salários Devs - Janeiro', valor: 800000, moeda: 'BRL', tipo: 'fixo', categoria: 'pessoal', data: new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString(), dataPagamento: new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString(), tags: ['folha'] },
      { centroCustoId: centros[2].id, orcamentoId: orcamentos[2].id, descricao: 'Benefícios e Encargos', valor: 200000, moeda: 'BRL', tipo: 'fixo', categoria: 'pessoal', data: new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString(), dataPagamento: new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString(), tags: ['beneficios'] },
      { centroCustoId: centros[2].id, orcamentoId: orcamentos[2].id, descricao: 'GitHub Enterprise + Ferramentas', valor: 25000, moeda: 'BRL', tipo: 'fixo', categoria: 'tecnologia', data: new Date(agora.getFullYear(), agora.getMonth(), 2).toISOString(), dataPagamento: new Date(agora.getFullYear(), agora.getMonth(), 2).toISOString(), fornecedor: 'GitHub', tags: ['tools'] },
      { centroCustoId: centros[3].id, orcamentoId: orcamentos[3].id, descricao: 'Aluguel Escritório', valor: 80000, moeda: 'BRL', tipo: 'fixo', categoria: 'operacional', data: new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString(), dataPagamento: new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString(), fornecedor: 'Imobiliária XYZ', tags: ['aluguel'] },
      { centroCustoId: centros[3].id, orcamentoId: orcamentos[3].id, descricao: 'Internet e Telefone', valor: 2500, moeda: 'BRL', tipo: 'fixo', categoria: 'operacional', data: new Date(agora.getFullYear(), agora.getMonth(), 5).toISOString(), dataPagamento: new Date(agora.getFullYear(), agora.getMonth(), 5).toISOString(), fornecedor: 'Vivo', tags: ['utilidades'] },
    ];

    for (const l of lancamentosMock) {
      const lancamento = criarLancamento(l);
      this.lancamentos.set(lancamento.id, lancamento);
    }

    // Recalcular orçamentos
    this.recalcularGastos(Array.from(this.lancamentos.values()));

    // Gerar alertas iniciais
    this.gerarAlertas(Array.from(this.orcamentos.values()), Array.from(this.lancamentos.values()));
  }

  private notificar(): void {
    for (const listener of this.listeners) listener();
  }

  subscrever(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Config
  configurar(config: Partial<ConfiguracaoFinOps>): void {
    const validacao = validarConfiguracao(config);
    if (!validacao.valida) throw new Error(`Config inválida: ${validacao.erros.join(', ')}`);
    this.config = { ...this.config, ...config };
    this.notificar();
  }

  obterConfig(): ConfiguracaoFinOps { return { ...this.config }; }

  // Centros de Custo
  listar(): CentroCusto[] { return Array.from(this.centrosCusto.values()).sort((a, b) => a.nome.localeCompare(b.nome)); }
  obterPorId(id: string): CentroCusto | undefined { return this.centrosCusto.get(id); }
  listarAtivos(): CentroCusto[] { return this.listar().filter(c => c.ativo); }

  criar(dados: Omit<CentroCusto, 'id' | 'criadoEm' | 'ativo'>): CentroCusto {
    const validacao = validarCentroCusto(dados);
    if (!validacao.valida) throw new Error(`Centro de custo inválido: ${validacao.erros.join(', ')}`);
    const centro = criarCentroCusto(dados);
    this.centrosCusto.set(centro.id, centro);
    this.notificar();
    return centro;
  }

  atualizar(id: string, dados: Partial<CentroCusto>): CentroCusto | null {
    const centro = this.centrosCusto.get(id);
    if (!centro) return null;
    const validacao = validarCentroCusto({ ...centro, ...dados });
    if (!validacao.valida) throw new Error(`Centro de custo inválido: ${validacao.erros.join(', ')}`);
    const atualizado = { ...centro, ...dados };
    this.centrosCusto.set(id, atualizado);
    this.notificar();
    return atualizado;
  }

  remover(id: string): boolean {
    const temOrcamentos = Array.from(this.orcamentos.values()).some(o => o.centroCustoId === id);
    if (temOrcamentos) throw new Error('Não é possível remover centro com orçamentos associados');
    const result = this.centrosCusto.delete(id);
    if (result) this.notificar();
    return result;
  }

  // Orçamentos
  listar(): Orcamento[] { return Array.from(this.orcamentos.values()).sort((a, b) => a.nome.localeCompare(b.nome)); }
  obterPorId(id: string): Orcamento | undefined { return this.orcamentos.get(id); }
  listarPorCentro(centroCustoId: string): Orcamento[] { return this.listar().filter(o => o.centroCustoId === centroCustoId); }
  listarAtivos(): Orcamento[] { return this.listar().filter(o => o.ativo); }

  criar(dados: Omit<Orcamento, 'id' | 'valorGasto' | 'valorProjetado' | 'criadoEm' | 'atualizadoEm'>): Orcamento {
    const validacao = validarOrcamento(dados);
    if (!validacao.valida) throw new Error(`Orçamento inválido: ${validacao.erros.join(', ')}`);
    const orcamento = criarOrcamento(dados);
    this.orcamentos.set(orcamento.id, orcamento);
    this.notificar();
    return orcamento;
  }

  atualizar(id: string, dados: Partial<Orcamento>): Orcamento | null {
    const orcamento = this.orcamentos.get(id);
    if (!orcamento) return null;
    const validacao = validarOrcamento({ ...orcamento, ...dados });
    if (!validacao.valida) throw new Error(`Orçamento inválido: ${validacao.erros.join(', ')}`);
    const atualizado = { ...orcamento, ...dados, atualizadoEm: new Date().toISOString() };
    this.orcamentos.set(id, atualizado);
    this.notificar();
    return atualizado;
  }

  remover(id: string): boolean {
    const temLancamentos = Array.from(this.lancamentos.values()).some(l => l.orcamentoId === id);
    if (temLancamentos) throw new Error('Não é possível remover orçamento com lançamentos associados');
    const result = this.orcamentos.delete(id);
    if (result) this.notificar();
    return result;
  }

  recalcularGastos(lancamentos: LancamentoCusto[]): void {
    for (const orcamento of this.orcamentos.values()) {
      const atualizado = atualizarOrcamentoComGastos(orcamento, lancamentos);
      this.orcamentos.set(atualizado.id, atualizado);
    }
    this.notificar();
  }

  // Lançamentos
  listar(): LancamentoCusto[] { return Array.from(this.lancamentos.values()).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()); }
  obterPorId(id: string): LancamentoCusto | undefined { return this.lancamentos.get(id); }
  listarPorCentro(centroCustoId: string): LancamentoCusto[] { return this.listar().filter(l => l.centroCustoId === centroCustoId); }
  listarPorOrcamento(orcamentoId: string): LancamentoCusto[] { return this.listar().filter(l => l.orcamentoId === orcamentoId); }
  listarPorPeriodo(inicio: string, fim: string): LancamentoCusto[] {
    const ini = new Date(inicio);
    const fm = new Date(fim);
    return this.listar().filter(l => {
      const data = new Date(l.data);
      return data >= ini && data <= fm;
    });
  }
  listarPorCategoria(categoria: CategoriaCusto): LancamentoCusto[] { return this.listar().filter(l => l.categoria === categoria); }

  criar(dados: Omit<LancamentoCusto, 'id' | 'criadoEm' | 'atualizadoEm' | 'status'>): LancamentoCusto {
    const validacao = validarLancamento(dados);
    if (!validacao.valida) throw new Error(`Lançamento inválido: ${validacao.erros.join(', ')}`);
    const lancamento = criarLancamento(dados);
    this.lancamentos.set(lancamento.id, lancamento);
    this.recalcularGastos(Array.from(this.lancamentos.values()));
    this.notificar();
    return lancamento;
  }

  atualizar(id: string, dados: Partial<LancamentoCusto>): LancamentoCusto | null {
    const lancamento = this.lancamentos.get(id);
    if (!lancamento) return null;
    const validacao = validarLancamento({ ...lancamento, ...dados });
    if (!validacao.valida) throw new Error(`Lançamento inválido: ${validacao.erros.join(', ')}`);
    const atualizado = { ...lancamento, ...dados, atualizadoEm: new Date().toISOString() };
    this.lancamentos.set(id, atualizado);
    this.recalcularGastos(Array.from(this.lancamentos.values()));
    this.notificar();
    return atualizado;
  }

  remover(id: string): boolean {
    const result = this.lancamentos.delete(id);
    if (result) {
      this.recalcularGastos(Array.from(this.lancamentos.values()));
      this.notificar();
    }
    return result;
  }

  pagar(id: string, dataPagamento?: string): LancamentoCusto | null {
    const lancamento = this.lancamentos.get(id);
    if (!lancamento || lancamento.status !== 'pendente') return null;
    const atualizado = {
      ...lancamento,
      status: 'pago' as const,
      dataPagamento: dataPagamento ?? new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    this.lancamentos.set(id, atualizado);
    this.recalcularGastos(Array.from(this.lancamentos.values()));
    this.notificar();
    return atualizado;
  }

  cancelar(id: string): LancamentoCusto | null {
    const lancamento = this.lancamentos.get(id);
    if (!lancamento || lancamento.status === 'pago') return null;
    const atualizado = {
      ...lancamento,
      status: 'cancelado' as const,
      atualizadoEm: new Date().toISOString(),
    };
    this.lancamentos.set(id, atualizado);
    this.recalcularGastos(Array.from(this.lancamentos.values()));
    this.notificar();
    return atualizado;
  }

  // Alertas
  listar(): AlertaFinanceiro[] { return Array.from(this.alertas.values()).sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()); }
  listarNaoLidos(): AlertaFinanceiro[] { return this.listar().filter(a => !a.lido); }
  listarPorSeveridade(severidade: AlertaFinanceiro['severidade']): AlertaFinanceiro[] { return this.listar().filter(a => a.severidade === severidade); }

  marcarComoLido(id: string): AlertaFinanceiro | null {
    const alerta = this.alertas.get(id);
    if (!alerta || alerta.lido) return null;
    const atualizado = { ...alerta, lido: true, lidoEm: new Date().toISOString() };
    this.alertas.set(id, atualizado);
    this.notificar();
    return atualizado;
  }

  marcarComoReconhecido(id: string): AlertaFinanceiro | null {
    const alerta = this.alertas.get(id);
    if (!alerta || alerta.reconhecido) return null;
    const atualizado = { ...alerta, reconhecido: true, reconhecidoEm: new Date().toISOString() };
    this.alertas.set(id, atualizado);
    this.notificar();
    return atualizado;
  }

  limparLidos(): number {
    let count = 0;
    for (const [id, alerta] of this.alertas) {
      if (alerta.lido) {
        this.alertas.delete(id);
        count++;
      }
    }
    if (count > 0) this.notificar();
    return count;
  }

  gerarAlertas(orcamentos: Orcamento[], lancamentos: LancamentoCusto[]): AlertaFinanceiro[] {
    const novosAlertas = consolidarAlertas(orcamentos, lancamentos, this.config);
    for (const alerta of novosAlertas) {
      // Evitar duplicados por fingerprint simples
      const existe = Array.from(this.alertas.values()).some(a =>
        a.orcamentoId === alerta.orcamentoId &&
        a.tipo === alerta.tipo &&
        !a.reconhecido
      );
      if (!existe) this.alertas.set(alerta.id, alerta);
    }
    this.notificar();
    return novosAlertas;
  }

  // Relatórios
  gerarMetricas(periodoInicio: string, periodoFim: string): MetricasFinanceiras {
    return calcularMetricasFinanceiras(
      Array.from(this.lancamentos.values()),
      Array.from(this.orcamentos.values()),
      Array.from(this.centrosCusto.values()),
      periodoInicio,
      periodoFim
    );
  }

  gerarPrevisao(centroCustoId: string, periodo: PeriodoOrcamento = 'mensal'): PrevisaoCusto {
    return gerarPrevisaoCusto(centroCustoId, Array.from(this.lancamentos.values()), periodo);
  }

  exportarLancamentosCSV(): string {
    return gerarCSVLancamentos(Array.from(this.lancamentos.values()));
  }

  exportarOrcamentosCSV(): string {
    return gerarCSVOrcamentos(Array.from(this.orcamentos.values()));
  }
}

// ============================================
// FACTORY / SINGLETON
// ============================================

let finopsInstance: IFinOpsService | null = null;

export function createFinOpsService(config?: Partial<ConfiguracaoFinOps>): IFinOpsService {
  if (!finopsInstance) {
    finopsInstance = new FinOpsService(config);
  }
  return finopsInstance;
}

export function getFinOpsService(): IFinOpsService {
  if (!finopsInstance) {
    finopsInstance = new FinOpsService();
  }
  return finopsInstance;
}

export function resetFinOpsService(): void {
  finopsInstance = null;
}

// Instância global
export const finops = {
  get centrosCusto() { return getFinOpsService(); },
  get orcamentos() { return getFinOpsService(); },
  get lancamentos() { return getFinOpsService(); },
  get alertas() { return getFinOpsService(); },
  get relatorios() { return getFinOpsService(); },
};