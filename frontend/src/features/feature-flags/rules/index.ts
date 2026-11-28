/**
 * Regras puras do domínio Feature Flags - Avaliação, Rollout, Validação.
 * Zero dependências React, < 30 linhas por função, early returns.
 */

import type {
  FeatureFlag,
  FlagEvaluation,
  ContextoAvaliacao,
  RolloutConfig,
} from '../types';

import {
  CONFIG_PADRAO,
  AMBIENTES,
  TIPOS_FLAG,
  validarChaveFlag,
  validarRolloutConfig,
} from '../types';

// ============================================
// VALIDAÇÕES
// ============================================

export function validarFlag(flag: Partial<FeatureFlag>): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (!flag.chave || !validarChaveFlag(flag.chave)) {
    erros.push('Chave inválida: deve ser lowercase, kebab-case, 2-50 caracteres');
  }

  if (!flag.nome || flag.nome.trim().length < 2) {
    erros.push('Nome deve ter pelo menos 2 caracteres');
  }

  if (flag.tipo && !TIPOS_FLAG.includes(flag.tipo)) {
    erros.push(`Tipo inválido: ${flag.tipo}`);
  }

  if (flag.ambiente) {
    for (const env of flag.ambiente) {
      if (!AMBIENTES.includes(env)) {
        erros.push(`Ambiente inválido: ${env}`);
      }
    }
  }

  if (flag.rollout) {
    const rolloutValidation = validarRolloutConfig(flag.rollout);
    erros.push(...rolloutValidation.erros);
  }

  if (flag.dependencias && flag.id && flag.dependencias.includes(flag.id)) {
    erros.push('Uma flag não pode depender de si mesma');
  }

  return { valido: erros.length === 0, erros };
}

export function validarContexto(contexto: ContextoAvaliacao): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (contexto.ambiente && !AMBIENTES.includes(contexto.ambiente)) {
    erros.push(`Ambiente inválido: ${contexto.ambiente}`);
  }

  if (contexto.atributos) {
    for (const [chave, valor] of Object.entries(contexto.atributos)) {
      if (typeof chave !== 'string' || chave.length === 0) {
        erros.push('Chaves de atributos devem ser strings não vazias');
      }
      if (valor === null || valor === undefined) {
        erros.push(`Valor do atributo "${chave}" não pode ser null/undefined`);
      }
    }
  }

  return { valido: erros.length === 0, erros };
}

// ============================================
// AVALIAÇÃO DE FLAGS
// ============================================

export function avaliarFlag(
  flag: FeatureFlag,
  contexto: ContextoAvaliacao,
  flagsAtivas: Set<string> = new Set()
): FlagEvaluation {
  const agora = new Date().toISOString();

  // 1. Flag desabilitada globalmente
  if (!flag.habilitada) {
    return {
      flagId: flag.id,
      chave: flag.chave,
      valor: flag.valorPadrao,
      habilitada: false,
      motivo: 'disabled',
      contextoAvaliado: contexto.atributos,
      avaliadoEm: agora,
    };
  }

  // 2. Verificar ambiente
  if (contexto.ambiente && !flag.ambiente.includes(contexto.ambiente)) {
    return {
      flagId: flag.id,
      chave: flag.chave,
      valor: flag.valorPadrao,
      habilitada: false,
      motivo: 'disabled',
      contextoAvaliado: contexto.atributos,
      avaliadoEm: agora,
    };
  }

  // 3. Verificar dependências
  if (flag.dependencias && flag.dependencias.length > 0) {
    const dependenciaFaltando = flag.dependencias.find(dep => !flagsAtivas.has(dep));
    if (dependenciaFaltando) {
      return {
        flagId: flag.id,
        chave: flag.chave,
        valor: flag.valorPadrao,
        habilitada: false,
        motivo: 'dependency',
        contextoAvaliado: { ...contexto.atributos, dependenciaFaltando },
        avaliadoEm: agora,
      };
    }
  }

  // 4. Avaliar rollout
  const rolloutResult = avaliarRollout(flag.rollout, contexto);

  if (!rolloutResult.ativo) {
    return {
      flagId: flag.id,
      chave: flag.chave,
      valor: flag.valorPadrao,
      habilitada: false,
      motivo: rolloutResult.motivo,
      contextoAvaliado: contexto.atributos,
      avaliadoEm: agora,
    };
  }

  // 5. Flag ativa para este contexto
  return {
    flagId: flag.id,
    chave: flag.chave,
    valor: flag.valorAtivo,
    habilitada: true,
    motivo: rolloutResult.motivo,
    contextoAvaliado: contexto.atributos,
    avaliadoEm: agora,
  };
}

function avaliarRollout(rollout: RolloutConfig, contexto: ContextoAvaliacao): { ativo: boolean; motivo: FlagEvaluation['motivo'] } {
  switch (rollout.estrategia) {
    case 'percentage':
      return avaliarPorcentagem(rollout.porcentagem ?? 0, contexto);
    case 'user_list':
      return avaliarListaUsuarios(rollout.usuariosIds ?? [], contexto);
    case 'attribute':
      return avaliarAtributo(rollout.atributo, rollout.valoresAtributo ?? [], contexto);
    case 'custom':
      return avaliarCustomizado(rollout.funcaoCustomizada, contexto);
    default:
      return { ativo: false, motivo: 'disabled' };
  }
}

function avaliarPorcentagem(porcentagem: number, contexto: ContextoAvaliacao): { ativo: boolean; motivo: FlagEvaluation['motivo'] } {
  if (porcentagem >= 100) return { ativo: true, motivo: 'rollout' };
  if (porcentagem <= 0) return { ativo: false, motivo: 'rollout' };

  // Hash determinístico baseado no userId ou sessionId
  const identificador = contexto.userId ?? contexto.sessionId ?? 'anonymous';
  let hash = 0;
  for (let i = 0; i < identificador.length; i++) {
    hash = ((hash << 5) - hash) + identificador.charCodeAt(i);
    hash = hash & hash;
  }
  const hashPositivo = Math.abs(hash) % 100;
  return { ativo: hashPositivo < porcentagem, motivo: 'rollout' };
}

function avaliarListaUsuarios(usuariosIds: string[], contexto: ContextoAvaliacao): { ativo: boolean; motivo: FlagEvaluation['motivo'] } {
  if (!contexto.userId) return { ativo: false, motivo: 'user_list' };
  return { ativo: usuariosIds.includes(contexto.userId), motivo: 'user_list' };
}

function avaliarAtributo(atributo: string | undefined, valores: unknown[], contexto: ContextoAvaliacao): { ativo: boolean; motivo: FlagEvaluation['motivo'] } {
  if (!atributo || !contexto.atributos) return { ativo: false, motivo: 'attribute' };
  const valorUsuario = contexto.atributos[atributo];
  if (valorUsuario === undefined) return { ativo: false, motivo: 'attribute' };
  return { ativo: valores.some(v => JSON.stringify(v) === JSON.stringify(valorUsuario)), motivo: 'attribute' };
}

function avaliarCustomizado(_funcao: string | undefined, _contexto: ContextoAvaliacao): { ativo: boolean; motivo: FlagEvaluation['motivo'] } {
  // Em produção, isso chamaria uma função registrada
  // Por enquanto, retorna false para segurança
  return { ativo: false, motivo: 'custom' };
}

// ============================================
// AVALIAÇÃO EM LOTE
// ============================================

export function avaliarTodasFlags(
  flags: FeatureFlag[],
  contexto: ContextoAvaliacao
): Record<string, FlagEvaluation> {
  const resultado: Record<string, FlagEvaluation> = {};
  const flagsAtivas = new Set<string>();

  // Primeira passagem: flags sem dependências
  const flagsSemDep = flags.filter(f => !f.dependencias || f.dependencias.length === 0);
  for (const flag of flagsSemDep) {
    const evalResult = avaliarFlag(flag, contexto, flagsAtivas);
    resultado[flag.chave] = evalResult;
    if (evalResult.habilitada) flagsAtivas.add(flag.id);
  }

  // Segunda passagem: flags com dependências (topological sort simplificado)
  const flagsComDep = flags.filter(f => f.dependencias && f.dependencias.length > 0);
  let mudou = true;
  let iteracoes = 0;
  const maxIteracoes = flagsComDep.length + 1;

  while (mudou && iteracoes < maxIteracoes) {
    mudou = false;
    for (const flag of flagsComDep) {
      if (resultado[flag.chave]) continue; // Já avaliada

      const depsResolvidas = flag.dependencias!.every(dep => flagsAtivas.has(dep));
      if (!depsResolvidas) continue;

      const evalResult = avaliarFlag(flag, contexto, flagsAtivas);
      resultado[flag.chave] = evalResult;
      if (evalResult.habilitada) flagsAtivas.add(flag.id);
      mudou = true;
    }
    iteracoes++;
  }

  // Flags com dependências circulares ou não resolvidas
  for (const flag of flagsComDep) {
    if (!resultado[flag.chave]) {
      resultado[flag.chave] = {
        flagId: flag.id,
        chave: flag.chave,
        valor: flag.valorPadrao,
        habilitada: false,
        motivo: 'dependency',
        contextoAvaliado: { ...contexto.atributos, erro: 'Dependências não resolvidas' },
        avaliadoEm: new Date().toISOString(),
      };
    }
  }

  return resultado;
}

// ============================================
// UTILITÁRIOS DE VALOR
// ============================================

export function obterValorFlag<T>(
  evaluation: FlagEvaluation,
  valorPadrao: T
): T {
  if (!evaluation.habilitada) return valorPadrao;
  try {
    return evaluation.valor as T;
  } catch {
    return valorPadrao;
  }
}

export function flagHabilitada(evaluation: FlagEvaluation): boolean {
  return evaluation.habilitada === true;
}

export function obterTodasHabilitadas(evaluations: Record<string, FlagEvaluation>): string[] {
  return Object.entries(evaluations)
    .filter(([, evaluation]) => evaluation.habilitada)
    .map(([chave]) => chave);
}

// ============================================
// CACHE E SERIALIZAÇÃO
// ============================================

export function serializarFlagsParaCache(flags: FeatureFlag[]): string {
  return JSON.stringify({
    flags: flags.map(f => ({
      id: f.id,
      chave: f.chave,
      nome: f.nome,
      tipo: f.tipo,
      valorPadrao: f.valorPadrao,
      valorAtivo: f.valorAtivo,
      habilitada: f.habilitada,
      ambiente: f.ambiente,
      rollout: f.rollout,
      dependencias: f.dependencias,
      atualizadoEm: f.atualizadoEm,
    })),
    timestamp: new Date().toISOString(),
  });
}

export function deserializarFlagsDoCache(data: string): { flags: FeatureFlag[]; timestamp: string } | null {
  try {
    const parsed = JSON.parse(data);
    if (!parsed.flags || !Array.isArray(parsed.flags)) return null;
    if (!parsed.timestamp) return null;

    // Verificar se cache não expirou (5 min default)
    const idade = Date.now() - new Date(parsed.timestamp).getTime();
    if (idade > CONFIG_PADRAO.cacheTtlMs) return null;

    return {
      flags: parsed.flags.map((f: any) => ({
        ...f,
        descricao: f.descricao,
        tags: f.tags,
        criadoPor: f.criadoPor,
        criadoEm: f.criadoEm,
      })),
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

// ============================================
// DETECÇÃO DE MUDANÇAS
// ============================================

export function detectarMudancas(
  flagsAnteriores: FeatureFlag[],
  flagsAtuais: FeatureFlag[]
): Array<{ flagId: string; chave: string; tipo: 'criada' | 'atualizada' | 'removida' | 'habilitada' | 'desabilitada' }> {
  const mudancas: Array<{ flagId: string; chave: string; tipo: 'criada' | 'atualizada' | 'removida' | 'habilitada' | 'desabilitada' }> = [];
  const mapaAnterior = new Map(flagsAnteriores.map(f => [f.id, f]));
  const mapaAtual = new Map(flagsAtuais.map(f => [f.id, f]));

  // Verificar criadas e atualizadas
  for (const [id, flagAtual] of mapaAtual) {
    const flagAnterior = mapaAnterior.get(id);
    if (!flagAnterior) {
      mudancas.push({ flagId: id, chave: flagAtual.chave, tipo: 'criada' });
    } else if (flagAnterior.habilitada !== flagAtual.habilitada) {
      mudancas.push({ flagId: id, chave: flagAtual.chave, tipo: flagAtual.habilitada ? 'habilitada' : 'desabilitada' });
    } else if (
      flagAnterior.valorAtivo !== flagAtual.valorAtivo ||
      flagAnterior.rollout.estrategia !== flagAtual.rollout.estrategia ||
      flagAnterior.valorPadrao !== flagAtual.valorPadrao
    ) {
      mudancas.push({ flagId: id, chave: flagAtual.chave, tipo: 'atualizada' });
    }
  }

  // Verificar removidas
  for (const [id, flagAnterior] of mapaAnterior) {
    if (!mapaAtual.has(id)) {
      mudancas.push({ flagId: id, chave: flagAnterior.chave, tipo: 'removida' });
    }
  }

  return mudancas;
}