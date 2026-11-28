/**
 * Serviços do domínio Graceful Degradation - Circuit Breaker, Retry, Fallback, Offline Queue.
 * Injeção de dependência via factory/singleton.
 */

import type {
  Recurso,
  CircuitBreakerState,
  RetryConfig,
  QueueItem,
  DegradationEvent,
  OfflineConfig,
  GracefulDegradationConfig,
  NivelDegradacao,
  TipoRecurso,
  DegradationListener,
} from '../types';

import {
  CONFIG_PADRAO,
  RETRY_CONFIG_PADRAO,
  gerarIdRecurso,
  obterLabelNivel,
  criarCircuitBreaker,
  registrarFalha,
  registrarSucesso,
  criarEventoDegradacao,
} from '../types';

import {
  validarRecurso,
  validarRetryConfig,
  validarOfflineConfig,
  executarComRetry,
  aplicarFallback,
  salvarNoCache,
  adicionarNaFila,
  processarFila,
  removerDaFila,
  calcularNivelGlobalAtual,
  obterRecursosDegradados,
  obterRecursosEssenciaisDegradados,
  notificarListeners,
  serializarConfig,
  deserializarConfig,
} from '../rules';

// ============================================
// INTERFACES (DIP)
// ============================================

export interface IRecursoService {
  listarRecursos(): Recurso[];
  obterPorId(_id: string): Recurso | undefined;
  obterPorTipo(_tipo: TipoRecurso): Recurso[];
  criar(_recurso: Omit<Recurso, 'id' | 'degradadoEm' | 'restauradoEm'>): Recurso;
  atualizar(_id: string, _dados: Partial<Recurso>): Recurso | null;
  removerRecurso(_id: string): boolean;
  marcarDegradado(_id: string): Recurso | null;
  marcarRestaurado(_id: string): Recurso | null;
}

export interface ICircuitBreakerService {
  obterEstado(_recursoId: string): CircuitBreakerState | undefined;
  obterTodosEstados(): Record<string, CircuitBreakerState>;
  registrarSucesso(_recursoId: string): CircuitBreakerState | null;
  registrarFalha(_recursoId: string): CircuitBreakerState | null;
  reiniciar(_recursoId: string): CircuitBreakerState | null;
  configurar(_recursoId: string, _config: Partial<CircuitBreakerState>): CircuitBreakerState | null;
}

export interface IRetryService {
  executar<T>(_operacao: () => Promise<T>, _config?: Partial<RetryConfig>, _abortSignal?: AbortSignal): Promise<T>;
  configurarPadrao(_config: Partial<RetryConfig>): void;
  obterConfigPadrao(): RetryConfig;
}

export interface IFallbackService {
  aplicar<T>(_recursoId: string, _erro: Error): { dados: T | null; fonte: string };
  salvarCache(_chave: string, _dados: unknown, _ttlMs?: number): boolean;
  obterCache<T>(_chave: string, _ttlMs?: number): T | null;
}

export interface IOfflineQueueService {
  adicionarNaFila<T>(_item: Omit<QueueItem<T>, 'id' | 'criadoEm' | 'tentativas'>): QueueItem<T>;
  listarFila(): QueueItem[];
  processarFila<T>(_processar: (_item: QueueItem<T>) => Promise<boolean>): Promise<void>;
  removerDaFila(_id: string): boolean;
  limparFila(): number;
  configurarFila(_config: Partial<OfflineConfig>): void;
  obterConfigFila(): OfflineConfig;
}

export interface IDegradationService extends
  IRecursoService,
  ICircuitBreakerService,
  IRetryService,
  IFallbackService,
  IOfflineQueueService {
  nivelGlobal: NivelDegradacao;
  obterNivelGlobal(): NivelDegradacao;
  obterRecursosDegradados(): Recurso[];
  obterRecursosEssenciaisDegradados(): Recurso[];
  subscrever(_listener: DegradationListener): () => void;
  verificarHealthChecks(): Promise<void>;
  sincronizarOffline(): Promise<number>;
  salvarEstado(): void;
  carregarEstado(): boolean;
  destruir(): void;
}

// ============================================
// IMPLEMENTAÇÃO
// ============================================

class GracefulDegradationService implements IDegradationService {
  private config: GracefulDegradationConfig;
  private healthCheckTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private onlineListener?: () => void;
  private offlineListener?: () => void;

  constructor(config?: Partial<GracefulDegradationConfig>) {
    this.config = { ...CONFIG_PADRAO, ...config };
    this.inicializar();
  }

  private inicializar(): void {
    // Carregar estado salvo
    this.carregarEstado();

    // Configurar listeners online/offline
    if (typeof window !== 'undefined') {
      this.onlineListener = () => this.aoFicarOnline();
      this.offlineListener = () => this.aoFicarOffline();
      window.addEventListener('online', this.onlineListener);
      window.addEventListener('offline', this.offlineListener);
    }

    // Iniciar health checks
    this.iniciarHealthChecks();

    // Atualizar nível global
    this.atualizarNivelGlobal();
  }

  private aoFicarOnline(): void {
    this.notificar(criarEventoDegradacao(
      'global', 'restaurado', this.config.nivelGlobal, 'none',
      'Conexão restaurada', { online: true }
    ));
    this.config.nivelGlobal = 'none';
    this.sincronizarOffline();
    this.atualizarNivelGlobal();
  }

  private aoFicarOffline(): void {
    this.notificar(criarEventoDegradacao(
      'global', 'degradado', this.config.nivelGlobal, 'offline',
      'Conexão perdida - modo offline', { online: false }
    ));
    this.config.nivelGlobal = 'offline';
    this.atualizarNivelGlobal();
  }

  private iniciarHealthChecks(): void {
    for (const recurso of this.config.recursos) {
      if (recurso.healthCheck?.habilitado) {
        this.iniciarHealthCheck(recurso);
      }
    }
  }

  private iniciarHealthCheck(recurso: Recurso): void {
    if (!recurso.healthCheck) return;

    const timer = setInterval(async () => {
      await this.executarHealthCheck(recurso);
    }, recurso.healthCheck.intervaloMs);

    this.healthCheckTimers.set(recurso.id, timer);
  }

  private async executarHealthCheck(recurso: Recurso): Promise<void> {
    if (!recurso.healthCheck || !recurso.endpoint) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), recurso.healthCheck!.timeoutMs);

      const response = await fetch(`${recurso.endpoint}${recurso.healthCheck.endpoint}`, {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeoutId);

      const sucesso = recurso.healthCheck.criterioSucesso
        ? recurso.healthCheck.criterioSucesso(response)
        : response.status === recurso.healthCheck.esperadoStatus;

      const cb = this.config.circuitBreakers[recurso.id];
      if (cb) {
        if (sucesso) {
          this.config.circuitBreakers[recurso.id] = registrarSucesso(cb);
        } else {
          this.config.circuitBreakers[recurso.id] = registrarFalha(cb);
        }
        this.atualizarNivelGlobal();
        this.salvarEstado();
      }
    } catch {
      const cb = this.config.circuitBreakers[recurso.id];
      if (cb) {
        this.config.circuitBreakers[recurso.id] = registrarFalha(cb);
        this.atualizarNivelGlobal();
        this.salvarEstado();
      }
    }
  }

  private notificar(evento: DegradationEvent): void {
    notificarListeners(this.config.listeners, evento);
  }

  private atualizarNivelGlobal(): void {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const novoNivel = calcularNivelGlobalAtual(this.config.recursos, this.config.circuitBreakers, online);

    if (novoNivel !== this.config.nivelGlobal) {
      const anterior = this.config.nivelGlobal;
      this.config.nivelGlobal = novoNivel;
      this.notificar(criarEventoDegradacao(
        'global',
        novoNivel === 'offline' ? 'degradado' : 'restaurado',
        anterior,
        novoNivel,
        `Nível de degradação alterado: ${obterLabelNivel(anterior)} → ${obterLabelNivel(novoNivel)}`
      ));
    }
  }

  // IRecursoService
  listarRecursos(): Recurso[] { return [...this.config.recursos].sort((a, b) => a.nome.localeCompare(b.nome)); }
  obterPorId(id: string): Recurso | undefined { return this.config.recursos.find(r => r.id === id); }
  obterPorTipo(tipo: TipoRecurso): Recurso[] { return this.listarRecursos().filter(r => r.tipo === tipo); }

  criar(dados: Omit<Recurso, 'id' | 'degradadoEm' | 'restauradoEm'>): Recurso {
    const validacao = validarRecurso(dados);
    if (!validacao.valido) throw new Error(`Recurso inválido: ${validacao.erros.join(', ')}`);

    const recurso: Recurso = {
      ...dados,
      id: gerarIdRecurso(),
    };

    this.config.recursos.push(recurso);

    // Inicializar circuit breaker
    this.config.circuitBreakers[recurso.id] = criarCircuitBreaker(recurso.id);

    // Iniciar health check se configurado
    if (recurso.healthCheck?.habilitado) {
      this.iniciarHealthCheck(recurso);
    }

    this.salvarEstado();
    return recurso;
  }

  atualizar(id: string, dados: Partial<Recurso>): Recurso | null {
    const idx = this.config.recursos.findIndex(r => r.id === id);
    if (idx === -1) return null;

    const recursoAtual = this.config.recursos[idx];
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    const { id: _id, degradadoEm: _degradadoEm, restauradoEm: _restauradoEm, ...dadosPermitidos } = dados;
    const recursoAtualizado = { ...recursoAtual, ...dadosPermitidos };

    const validacao = validarRecurso(recursoAtualizado);
    if (!validacao.valido) throw new Error(`Recurso inválido: ${validacao.erros.join(', ')}`);

    this.config.recursos[idx] = recursoAtualizado;
    this.salvarEstado();
    return recursoAtualizado;
  }

  removerRecurso(id: string): boolean {
    const idx = this.config.recursos.findIndex(r => r.id === id);
    if (idx === -1) return false;

    // Parar health check
    const timer = this.healthCheckTimers.get(id);
    if (timer) clearInterval(timer);
    this.healthCheckTimers.delete(id);

    // Remover circuit breaker
    delete this.config.circuitBreakers[id];

    this.config.recursos.splice(idx, 1);
    this.salvarEstado();
    return true;
  }

  marcarDegradado(id: string): Recurso | null {
    const recurso = this.obterPorId(id);
    if (!recurso) return null;

    recurso.degradadoEm = new Date().toISOString();
    recurso.restauradoEm = undefined;
    this.atualizarNivelGlobal();
    this.salvarEstado();
    return recurso;
  }

  marcarRestaurado(id: string): Recurso | null {
    const recurso = this.obterPorId(id);
    if (!recurso) return null;

    recurso.restauradoEm = new Date().toISOString();
    this.atualizarNivelGlobal();
    this.salvarEstado();
    return recurso;
  }

  // ICircuitBreakerService
  obterEstado(recursoId: string): CircuitBreakerState | undefined {
    return this.config.circuitBreakers[recursoId];
  }

  obterTodosEstados(): Record<string, CircuitBreakerState> {
    return { ...this.config.circuitBreakers };
  }

  registrarSucesso(recursoId: string): CircuitBreakerState | null {
    const cb = this.config.circuitBreakers[recursoId];
    if (!cb) return null;

    this.config.circuitBreakers[recursoId] = registrarSucesso(cb);
    this.atualizarNivelGlobal();
    this.salvarEstado();
    return this.config.circuitBreakers[recursoId];
  }

  registrarFalha(recursoId: string): CircuitBreakerState | null {
    const cb = this.config.circuitBreakers[recursoId];
    if (!cb) return null;

    this.config.circuitBreakers[recursoId] = registrarFalha(cb);
    this.atualizarNivelGlobal();
    this.salvarEstado();
    return this.config.circuitBreakers[recursoId];
  }

  reiniciar(recursoId: string): CircuitBreakerState | null {
    const cb = this.config.circuitBreakers[recursoId];
    if (!cb) return null;

    this.config.circuitBreakers[recursoId] = criarCircuitBreaker(recursoId);
    this.atualizarNivelGlobal();
    this.salvarEstado();
    return this.config.circuitBreakers[recursoId];
  }

  configurar(recursoId: string, config: Partial<CircuitBreakerState>): CircuitBreakerState | null {
    const cb = this.config.circuitBreakers[recursoId];
    if (!cb) return null;

    this.config.circuitBreakers[recursoId] = { ...cb, ...config };
    this.salvarEstado();
    return this.config.circuitBreakers[recursoId];
  }

  // IRetryService
  async executar<T>(operacao: () => Promise<T>, config?: Partial<RetryConfig>, abortSignal?: AbortSignal): Promise<T> {
    const retryConfig = { ...RETRY_CONFIG_PADRAO, ...config };
    return executarComRetry(operacao, retryConfig, abortSignal);
  }

  configurarPadrao(config: Partial<RetryConfig>): void {
    const validacao = validarRetryConfig(config);
    if (!validacao.valido) throw new Error(`Retry config inválida: ${validacao.erros.join(', ')}`);
    // Em uma implementação real, isso atualizaria um default global
  }

  obterConfigPadrao(): RetryConfig { return { ...RETRY_CONFIG_PADRAO }; }

  // IFallbackService
  aplicar<T>(recursoId: string, erro: Error): { dados: T | null; fonte: string } {
    const recurso = this.obterPorId(recursoId);
    if (!recurso) return { dados: null, fonte: 'erro' };

    return aplicarFallback(recurso.fallback, erro, recurso.fallback.chaveCache);
  }

  salvarCache(chave: string, dados: unknown, ttlMs?: number): boolean {
    return salvarNoCache(chave, dados, ttlMs);
  }

  obterCache<T>(chave: string, ttlMs?: number): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const cached = sessionStorage.getItem(chave);
      if (!cached) return null;
      const { dados, timestamp, ttl } = JSON.parse(cached);
      const ttlFinal = ttlMs ?? ttl ?? 5 * 60 * 1000;
      if (Date.now() - timestamp < ttlFinal) {
        return dados as T;
      }
    } catch {
      // Ignorar
    }
    return null;
  }

  // IOfflineQueueService
  adicionarNaFila<T>(item: Omit<QueueItem<T>, 'id' | 'criadoEm' | 'tentativas'>): QueueItem<T> {
    const novaFila = adicionarNaFila(this.config.filaOffline, item, this.config.configOffline);
    this.config.filaOffline = novaFila as QueueItem[];
    this.salvarEstado();
    return novaFila[novaFila.length - 1] as QueueItem<T>;
  }

  listarFila(): QueueItem[] { return [...this.config.filaOffline]; }

  async processarFila<T>(_processar: (_item: QueueItem<T>) => Promise<boolean>): Promise<void> {
    const novaFila = await processarFila(this.config.filaOffline as QueueItem<T>[], _processar);
    this.config.filaOffline = novaFila as QueueItem[];
    this.salvarEstado();
  }

  removerDaFila(id: string): boolean {
    const novaFila = removerDaFila(this.config.filaOffline, id);
    if (novaFila.length !== this.config.filaOffline.length) {
      this.config.filaOffline = novaFila;
      this.salvarEstado();
      return true;
    }
    return false;
  }

  limparFila(): number {
    const count = this.config.filaOffline.length;
    this.config.filaOffline = [];
    this.salvarEstado();
    return count;
  }

  configurarFila(config: Partial<OfflineConfig>): void {
    const validacao = validarOfflineConfig(config);
    if (!validacao.valido) throw new Error(`Offline config inválida: ${validacao.erros.join(', ')}`);
    this.config.configOffline = { ...this.config.configOffline, ...config };
    this.salvarEstado();
  }

  obterConfigFila(): OfflineConfig { return { ...this.config.configOffline }; }

  // IDegradationService
  get nivelGlobal(): NivelDegradacao { return this.config.nivelGlobal; }

  obterNivelGlobal(): NivelDegradacao { return this.config.nivelGlobal; }

  obterRecursosDegradados(): Recurso[] { return obterRecursosDegradados(this.config.recursos, this.config.circuitBreakers); }

  obterRecursosEssenciaisDegradados(): Recurso[] { return obterRecursosEssenciaisDegradados(this.config.recursos, this.config.circuitBreakers); }

  subscrever(listener: DegradationListener): () => void {
    this.config.listeners.push(listener);
    return () => {
      const idx = this.config.listeners.indexOf(listener);
      if (idx >= 0) this.config.listeners.splice(idx, 1);
    };
  }

  async verificarHealthChecks(): Promise<void> {
    for (const recurso of this.config.recursos) {
      if (recurso.healthCheck?.habilitado) {
        await this.executarHealthCheck(recurso);
      }
    }
  }

  async sincronizarOffline(): Promise<number> {
    if (!this.config.configOffline.sincronizarAoOnline) return 0;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
    if (this.config.filaOffline.length === 0) return 0;

    // Em implementação real, processaria a fila
    // Por enquanto, apenas simula
    const processados = this.config.filaOffline.length;
    this.config.filaOffline = [];
    this.salvarEstado();
    return processados;
  }

  salvarEstado(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('cr_graceful_degradation', serializarConfig(this.config));
    } catch {
      // Ignorar
    }
  }

  carregarEstado(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('cr_graceful_degradation');
      if (!saved) return false;

      const parsed = deserializarConfig(saved);
      if (!parsed) return false;

      this.config = { ...this.config, ...parsed };
      return true;
    } catch {
      return false;
    }
  }

  // Cleanup
  destruir(): void {
    for (const timer of this.healthCheckTimers.values()) {
      clearInterval(timer);
    }
    this.healthCheckTimers.clear();

    if (typeof window !== 'undefined') {
      if (this.onlineListener) window.removeEventListener('online', this.onlineListener);
      if (this.offlineListener) window.removeEventListener('offline', this.offlineListener);
    }
  }
}

// ============================================
// FACTORY / SINGLETON
// ============================================

let gracefulDegradationInstance: IDegradationService | null = null;

export function createGracefulDegradationService(config?: Partial<GracefulDegradationConfig>): IDegradationService {
  if (!gracefulDegradationInstance) {
    gracefulDegradationInstance = new GracefulDegradationService(config);
  }
  return gracefulDegradationInstance;
}

export function getGracefulDegradationService(): IDegradationService {
  if (!gracefulDegradationInstance) {
    gracefulDegradationInstance = new GracefulDegradationService();
  }
  return gracefulDegradationInstance;
}

export function resetGracefulDegradationService(): void {
  if (gracefulDegradationInstance) {
    gracefulDegradationInstance.destruir();
    gracefulDegradationInstance = null;
  }
}

// Instância global
export const gracefulDegradation = {
  get recursos() { return getGracefulDegradationService(); },
  get circuitBreakers() { return getGracefulDegradationService(); },
  get retry() { return getGracefulDegradationService(); },
  get fallback() { return getGracefulDegradationService(); },
  get offline() { return getGracefulDegradationService(); },
};