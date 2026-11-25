/**
 * Tipos do domínio Feature Flags - Controle de funcionalidades, Rollout, Targeting.
 */

export type FlagTipo = 'boolean' | 'string' | 'number' | 'json';
export type FlagAmbiente = 'development' | 'staging' | 'production' | 'test';
export type RolloutEstrategia = 'percentage' | 'user_list' | 'attribute' | 'custom';

export interface FeatureFlag {
  id: string;
  chave: string;           // ex: "nova-home", "checkout-pix"
  nome: string;
  descricao?: string;
  tipo: FlagTipo;
  valorPadrao: unknown;    // valor quando flag está desabilitada
  valorAtivo: unknown;     // valor quando flag está habilitada
  habilitada: boolean;
  ambiente: FlagAmbiente[];
  rollout: RolloutConfig;
  tags?: string[];
  criadoEm: string;        // ISO 8601
  atualizadoEm: string;    // ISO 8601
  criadoPor?: string;
  dependencias?: string[]; // IDs de outras flags que devem estar ativas
}

export interface RolloutConfig {
  estrategia: RolloutEstrategia;
  porcentagem?: number;           // 0-100 para percentage
  usuariosIds?: string[];         // para user_list
  atributo?: string;              // para attribute (ex: "plano", "regiao")
  valoresAtributo?: unknown[];    // valores que ativam a flag
  funcaoCustomizada?: string;     // nome da função customizada
}

export interface FlagEvaluation {
  flagId: string;
  chave: string;
  valor: unknown;
  habilitada: boolean;
  motivo: 'default' | 'rollout' | 'user_list' | 'attribute' | 'custom' | 'disabled' | 'dependency';
  contextoAvaliado?: Record<string, unknown>;
  avaliadoEm: string;
}

export interface ContextoAvaliacao {
  userId?: string;
  sessionId?: string;
  atributos?: Record<string, unknown>; // ex: { plano: 'profissional', regiao: 'BR' }
  ambiente?: FlagAmbiente;
  custom?: Record<string, unknown>;
}

export interface FeatureFlagsConfig {
  ambiente: FlagAmbiente;
  endpoint?: string;
  cacheTtlMs: number;
  enableLocalEvaluation: boolean;
  enableAnalytics: boolean;
  defaultFlags: Record<string, unknown>;
}

export interface FlagChangeEvent {
  flagId: string;
  chave: string;
  anterior: unknown;
  atual: unknown;
  timestamp: string;
  usuario?: string;
}

// Constantes
export const AMBIENTES: readonly FlagAmbiente[] = ['development', 'staging', 'production', 'test'] as const;
export const TIPOS_FLAG: readonly FlagTipo[] = ['boolean', 'string', 'number', 'json'] as const;
export const ESTRATEGIAS_ROLLOUT: readonly RolloutEstrategia[] = ['percentage', 'user_list', 'attribute', 'custom'] as const;

export const CONFIG_PADRAO: FeatureFlagsConfig = {
  ambiente: (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') ? 'production' : 'development',
  cacheTtlMs: 5 * 60 * 1000, // 5 minutos
  enableLocalEvaluation: true,
  enableAnalytics: true,
  defaultFlags: {},
};

// Utilitários
export function gerarIdFlag(): string {
  return `FF_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function validarChaveFlag(chave: string): boolean {
  // lowercase, kebab-case, 2-50 chars
  return /^[a-z][a-z0-9-]{1,48}[a-z0-9]$/.test(chave);
}

export function validarRolloutConfig(config: RolloutConfig): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (!ESTRATEGIAS_ROLLOUT.includes(config.estrategia)) {
    erros.push(`Estratégia inválida: ${config.estrategia}`);
  }

  switch (config.estrategia) {
    case 'percentage':
      if (config.porcentagem === undefined || config.porcentagem < 0 || config.porcentagem > 100) {
        erros.push('Porcentagem deve estar entre 0 e 100');
      }
      break;
    case 'user_list':
      if (!config.usuariosIds || config.usuariosIds.length === 0) {
        erros.push('Lista de usuários é obrigatória para user_list');
      }
      break;
    case 'attribute':
      if (!config.atributo) {
        erros.push('Atributo é obrigatório para attribute');
      }
      if (!config.valoresAtributo || config.valoresAtributo.length === 0) {
        erros.push('Valores do atributo são obrigatórios para attribute');
      }
      break;
    case 'custom':
      if (!config.funcaoCustomizada) {
        erros.push('Função customizada é obrigatória para custom');
      }
      break;
  }

  return { valido: erros.length === 0, erros };
}

export function criarFlagPadrao<T extends FlagTipo>(
  chave: string,
  nome: string,
  tipo: T,
  valorPadrao: T extends 'boolean' ? boolean : T extends 'string' ? string : T extends 'number' ? number : unknown,
  valorAtivo: T extends 'boolean' ? boolean : T extends 'string' ? string : T extends 'number' ? number : unknown,
  opcoes: Partial<Omit<FeatureFlag, 'id' | 'chave' | 'nome' | 'tipo' | 'valorPadrao' | 'valorAtivo' | 'criadoEm' | 'atualizadoEm'>> = {}
): FeatureFlag {
  const agora = new Date().toISOString();
  return {
    id: gerarIdFlag(),
    chave,
    nome,
    tipo,
    valorPadrao,
    valorAtivo,
    habilitada: false,
    ambiente: ['development', 'staging', 'production'],
    rollout: { estrategia: 'percentage', porcentagem: 100 },
    ...opcoes,
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

// Flags padrão do sistema
export const FLAGS_SISTEMA: FeatureFlag[] = [
  // UI/UX
  criarFlagPadrao('nova-home', 'Nova Home', 'boolean', false, true, {
    descricao: 'Habilita o novo design da página inicial',
    tags: ['ui', 'home'],
  }),
  criarFlagPadrao('tema-escuro-forcado', 'Tema Escuro Forçado', 'boolean', false, true, {
    descricao: 'Força tema escuro independente da preferência do sistema',
    tags: ['ui', 'tema'],
  }),
  criarFlagPadrao('animacoes-reduzidas', 'Animações Reduzidas', 'boolean', false, true, {
    descricao: 'Respeita prefers-reduced-motion globalmente',
    tags: ['ui', 'acessibilidade'],
  }),

  // Funcionalidades
  criarFlagPadrao('checkout-pix', 'Checkout PIX', 'boolean', true, true, {
    descricao: 'Habilita pagamento via PIX no checkout',
    tags: ['checkout', 'pagamento'],
  }),
  criarFlagPadrao('checkout-boleto', 'Checkout Boleto', 'boolean', true, true, {
    descricao: 'Habilita pagamento via Boleto no checkout',
    tags: ['checkout', 'pagamento'],
  }),
  criarFlagPadrao('assinaturas-pausar', 'Pausar Assinaturas', 'boolean', true, true, {
    descricao: 'Permite pausar assinaturas ativas',
    tags: ['assinaturas', 'gerenciamento'],
  }),
  criarFlagPadrao('relatorios-avancados', 'Relatórios Avançados', 'boolean', false, true, {
    descricao: 'Habilita relatórios financeiros avançados',
    tags: ['relatorios', 'financeiro'],
    rollout: { estrategia: 'attribute', atributo: 'plano', valoresAtributo: ['profissional', 'enterprise'] },
  }),

  // Experimentais
  criarFlagPadrao('ia-sugestoes', 'Sugestões IA', 'boolean', false, true, {
    descricao: 'Habilita sugestões baseadas em IA',
    tags: ['experimental', 'ia'],
    ambiente: ['development', 'staging'],
  }),
  criarFlagPadrao('novo-dashboard', 'Novo Dashboard', 'boolean', false, true, {
    descricao: 'Novo dashboard com métricas em tempo real',
    tags: ['experimental', 'dashboard'],
    rollout: { estrategia: 'percentage', porcentagem: 10 },
  }),

  // Configurações
  criarFlagPadrao('max-agendamentos-dia', 'Máx Agendamentos/Dia', 'number', 50, 100, {
    descricao: 'Limite máximo de agendamentos por dia por barbearia',
    tags: ['config', 'limites'],
  }),
  criarFlagPadrao('tempo-espera-lembrete', 'Tempo Espera Lembrete', 'number', 30, 15, {
    descricao: 'Minutos antes do agendamento para enviar lembrete',
    tags: ['config', 'notificacoes'],
  }),
];