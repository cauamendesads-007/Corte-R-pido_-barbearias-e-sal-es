/**
 * Serviços do domínio Feature Flags - CRUD, Avaliação, Cache, Sincronização.
 * Injeção de dependência via factory/singleton.
 */

import type {
  FeatureFlag,
  FlagEvaluation,
  ContextoAvaliacao,
  FeatureFlagsConfig,
  FlagChangeEvent,
} from '../types';

import {
  CONFIG_PADRAO,
  FLAGS_SISTEMA,
  gerarIdFlag,
} from '../types';

import {
  validarFlag,
  avaliarFlag,
  avaliarTodasFlags,
  obterValorFlag,
  flagHabilitada,
  obterTodasHabilitadas,
  serializarFlagsParaCache,
  deserializarFlagsDoCache,
} from '../rules';

// ============================================
// INTERFACES (DIP)
// ============================================

export interface IFeatureFlagsService {
  // CRUD
  listar(): FeatureFlag[];
  obterPorId(id: string): FeatureFlag | undefined;
  obterPorChave(chave: string): FeatureFlag | undefined;
  criar(flag: Omit<FeatureFlag, 'id' | 'criadoEm' | 'atualizadoEm'>): FeatureFlag;
  atualizar(id: string, dados: Partial<FeatureFlag>): FeatureFlag | null;
  remover(id: string): boolean;
  alternar(id: string): FeatureFlag | null;

  // Avaliação
  avaliar(chave: string, contexto: ContextoAvaliacao): FlagEvaluation;
  avaliarTodas(contexto: ContextoAvaliacao): Record<string, FlagEvaluation>;
  obterValor<T>(chave: string, contexto: ContextoAvaliacao, valorPadrao: T): T;
  estaHabilitada(chave: string, contexto: ContextoAvaliacao): boolean;
  listarHabilitadas(contexto: ContextoAvaliacao): string[];

  // Config
  configurar(config: Partial<FeatureFlagsConfig>): void;
  obterConfig(): FeatureFlagsConfig;

  // Cache/Sync
  carregarDoCache(): boolean;
  salvarNoCache(): void;
  limparCache(): void;
  sincronizarComServidor(): Promise<FeatureFlag[]>;

  // Eventos
  subscreverMudancas(listener: (evento: FlagChangeEvent) => void): () => void;
}

// ============================================
// IMPLEMENTAÇÃO
// ============================================

class FeatureFlagsService implements IFeatureFlagsService {
  private config: FeatureFlagsConfig;
  private flags: Map<string, FeatureFlag> = new Map();
  private cacheKey = 'cr_feature_flags_cache';
  private listeners: Set<(evento: FlagChangeEvent) => void> = new Set();
  private contextoPadrao: ContextoAvaliacao = {};

  constructor(config?: Partial<FeatureFlagsConfig>) {
    this.config = { ...CONFIG_PADRAO, ...config };
    this.inicializar();
  }

  private inicializar(): void {
    // Carregar flags do sistema
    for (const flag of FLAGS_SISTEMA) {
      this.flags.set(flag.id, flag);
    }

    // Tentar carregar do cache
    this.carregarDoCache();

    // Aplicar defaults do config
    for (const [chave, valor] of Object.entries(this.config.defaultFlags)) {
      const flag = Array.from(this.flags.values()).find(f => f.chave === chave);
      if (flag) {
        flag.valorPadrao = valor;
      }
    }
  }

  private notificar(evento: FlagChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(evento);
      } catch (error) {
        console.error('[FeatureFlags] Erro no listener:', error);
      }
    }
  }

  private criarEventoMudanca(
    flagId: string,
    chave: string,
    anterior: unknown,
    atual: unknown
  ): FlagChangeEvent {
    return {
      flagId,
      chave,
      anterior,
      atual,
      timestamp: new Date().toISOString(),
      // usuario: obterUsuarioAtual(), // seria injetado
    };
  }

  // CRUD
  listar(): FeatureFlag[] {
    return Array.from(this.flags.values())
      .filter(f => f.ambiente.includes(this.config.ambiente))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  obterPorId(id: string): FeatureFlag | undefined {
    return this.flags.get(id);
  }

  obterPorChave(chave: string): FeatureFlag | undefined {
    return Array.from(this.flags.values()).find(f => f.chave === chave);
  }

  criar(dados: Omit<FeatureFlag, 'id' | 'criadoEm' | 'atualizadoEm'>): FeatureFlag {
    const validacao = validarFlag(dados);
    if (!validacao.valido) throw new Error(`Flag inválida: ${validacao.erros.join(', ')}`);

    const flag: FeatureFlag = {
      ...dados,
      id: gerarIdFlag(),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    this.flags.set(flag.id, flag);
    this.salvarNoCache();
    this.notificar(this.criarEventoMudanca(flag.id, flag.chave, undefined, flag));
    return flag;
  }

  atualizar(id: string, dados: Partial<FeatureFlag>): FeatureFlag | null {
    const flag = this.flags.get(id);
    if (!flag) return null;

    // Não permitir alterar ID ou chave
    const { id: _, chave: __, criadoEm: ___, ...dadosPermitidos } = dados;
    const flagAtualizada = { ...flag, ...dadosPermitidos, atualizadoEm: new Date().toISOString() };

    const validacao = validarFlag(flagAtualizada);
    if (!validacao.valido) throw new Error(`Flag inválida: ${validacao.erros.join(', ')}`);

    const anterior = { habilitada: flag.habilitada, valorAtivo: flag.valorAtivo, rollout: flag.rollout };
    this.flags.set(id, flagAtualizada);
    this.salvarNoCache();

    this.notificar(this.criarEventoMudanca(
      id, flag.chave, anterior, { habilitada: flagAtualizada.habilitada, valorAtivo: flagAtualizada.valorAtivo, rollout: flagAtualizada.rollout }
    ));

    return flagAtualizada;
  }

  remover(id: string): boolean {
    const flag = this.flags.get(id);
    if (!flag) return false;

    // Não remover flags do sistema
    if (FLAGS_SISTEMA.some(f => f.id === id)) {
      throw new Error('Não é possível remover flags do sistema');
    }

    this.flags.delete(id);
    this.salvarNoCache();
    this.notificar(this.criarEventoMudanca(id, flag.chave, flag, undefined));
    return true;
  }

  alternar(id: string): FeatureFlag | null {
    const flag = this.flags.get(id);
    if (!flag) return null;

    return this.atualizar(id, { habilitada: !flag.habilitada });
  }

  // Avaliação
  avaliar(chave: string, contexto: ContextoAvaliacao): FlagEvaluation {
    const flag = this.obterPorChave(chave);
    if (!flag) {
      return {
        flagId: '',
        chave,
        valor: this.config.defaultFlags[chave] ?? false,
        habilitada: false,
        motivo: 'disabled',
        avaliadoEm: new Date().toISOString(),
      };
    }

    const contextoCompleto = { ...this.contextoPadrao, ...contexto };
    return avaliarFlag(flag, contextoCompleto, this.obterIdsHabilitadas(contextoCompleto));
  }

  avaliarTodas(contexto: ContextoAvaliacao): Record<string, FlagEvaluation> {
    const flagsParaAvaliar = this.listar();
    const contextoCompleto = { ...this.contextoPadrao, ...contexto };
    return avaliarTodasFlags(flagsParaAvaliar, contextoCompleto);
  }

  obterValor<T>(chave: string, contexto: ContextoAvaliacao, valorPadrao: T): T {
    const evaluation = this.avaliar(chave, contexto);
    return obterValorFlag(evaluation, valorPadrao);
  }

  estaHabilitada(chave: string, contexto: ContextoAvaliacao): boolean {
    const evaluation = this.avaliar(chave, contexto);
    return flagHabilitada(evaluation);
  }

  listarHabilitadas(contexto: ContextoAvaliacao): string[] {
    const evaluations = this.avaliarTodas(contexto);
    return obterTodasHabilitadas(evaluations);
  }

  private obterIdsHabilitadas(contexto: ContextoAvaliacao): Set<string> {
    const evaluations = this.avaliarTodas(contexto);
    const ids = new Set<string>();
    for (const [chave, evaluation] of Object.entries(evaluations)) {
      if (evaluation.habilitada) {
        const flag = this.obterPorChave(chave);
        if (flag) ids.add(flag.id);
      }
    }
    return ids;
  }

  // Config
  configurar(config: Partial<FeatureFlagsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  obterConfig(): FeatureFlagsConfig {
    return { ...this.config };
  }

  // Cache
  carregarDoCache(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return false;

      const resultado = deserializarFlagsDoCache(cached);
      if (!resultado) return false;

      // Mesclar flags do cache (sobrescrever apenas flags não-sistema)
      for (const flag of resultado.flags) {
        const existente = this.flags.get(flag.id);
        if (existente && FLAGS_SISTEMA.some(f => f.id === flag.id)) continue;
        this.flags.set(flag.id, flag);
      }

      return true;
    } catch {
      return false;
    }
  }

  salvarNoCache(): void {
    if (typeof window === 'undefined') return;

    try {
      const flagsParaCache = Array.from(this.flags.values())
        .filter(f => !FLAGS_SISTEMA.some(sf => sf.id === f.id));
      const serialized = serializarFlagsParaCache(flagsParaCache);
      localStorage.setItem(this.cacheKey, serialized);
    } catch {
      // Ignorar erros de storage
    }
  }

  limparCache(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.cacheKey);
    } catch {
      // Ignorar erros
    }
  }

  // Sync
  async sincronizarComServidor(): Promise<FeatureFlag[]> {
    if (!this.config.endpoint) return [];

    try {
      const response = await fetch(`${this.config.endpoint}/flags?ambiente=${this.config.ambiente}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const flagsServidor: FeatureFlag[] = await response.json();
      const flagsAnteriores = this.listar();

      // Atualizar flags locais
      for (const flag of flagsServidor) {
        const existente = this.flags.get(flag.id);
        if (existente) {
          this.atualizar(flag.id, flag);
        } else {
          this.criar(flag);
        }
      }

      // Detectar flags removidas no servidor
      const idsServidor = new Set(flagsServidor.map(f => f.id));
      for (const flag of flagsAnteriores) {
        if (!idsServidor.has(flag.id) && !FLAGS_SISTEMA.some(sf => sf.id === flag.id)) {
          this.remover(flag.id);
        }
      }

      return flagsServidor;
    } catch (error) {
      console.error('[FeatureFlags] Erro na sincronização:', error);
      return [];
    }
  }

  // Eventos
  subscreverMudancas(listener: (evento: FlagChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Contexto padrão
  definirContextoPadrao(contexto: ContextoAvaliacao): void {
    this.contextoPadrao = { ...this.contextoPadrao, ...contexto };
  }

  }

// ============================================
// FACTORY / SINGLETON
// ============================================

let featureFlagsInstance: IFeatureFlagsService | null = null;

export function createFeatureFlagsService(config?: Partial<FeatureFlagsConfig>): IFeatureFlagsService {
  if (!featureFlagsInstance) {
    featureFlagsInstance = new FeatureFlagsService(config);
  }
  return featureFlagsInstance;
}

export function getFeatureFlagsService(): IFeatureFlagsService {
  if (!featureFlagsInstance) {
    featureFlagsInstance = new FeatureFlagsService();
  }
  return featureFlagsInstance;
}

export function resetFeatureFlagsService(): void {
  if (featureFlagsInstance) {
    featureFlagsInstance.limparCache();
    featureFlagsInstance = null;
  }
}

// Instância global para uso fácil
export const featureFlags = {
  get service() { return getFeatureFlagsService(); },
  avaliar: (chave: string, contexto: ContextoAvaliacao) => getFeatureFlagsService().avaliar(chave, contexto),
  obterValor: <T>(chave: string, contexto: ContextoAvaliacao, valorPadrao: T) => getFeatureFlagsService().obterValor(chave, contexto, valorPadrao),
  estaHabilitada: (chave: string, contexto: ContextoAvaliacao) => getFeatureFlagsService().estaHabilitada(chave, contexto),
};