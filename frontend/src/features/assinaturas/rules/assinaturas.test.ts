/**
 * Testes de Boundary TDD - Regras puras do domínio Assinaturas.
 * Cobertura: validações, cálculos, cupons, limites, edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  validarPlanoId,
  validarCicloFaturamento,
  validarStatusAssinatura,
  calcularPrecoComDesconto,
  calcularProrrateacao,
  validarCupom,
  verificarLimitePlano,
  gerarIdAssinatura,
  gerarNumeroFatura,
  gerarIdempotencyKey,
  formatarStatusAssinatura,
  formatarStatusFatura,
  podeAlterarPlano,
  podePausarAssinatura,
  podeCancelarAssinatura,
  podeReativarAssinatura,
  calcularDiasProximaCobranca,
  sanitizarCupom,
  sanitizarMotivoCancelamento,
  ERRO_CODIGOS,
} from '../rules';

import type {
  PlanoId,
  CicloFaturamento,
  PlanoAssinatura,
  CupomDesconto,
  AssinaturaAtiva,
} from '../types';

import { PLANOS_DEFINICAO } from '../types';

// ============================================
// MOCKS E HELPERS
// ============================================

const criarPlanoMock = (overrides: Partial<PlanoAssinatura> = {}): PlanoAssinatura => ({
  id: 'profissional',
  nome: 'Profissional',
  descricao: 'Plano para barbearias',
  precoMensal: 14900,
  precoAnual: 143040,
  descontoAnual: 20,
  limites: {
    barbeiros: 5,
    cadeiras: 5,
    agendamentosMes: 500,
    lembretes: true,
    relatoriosFinanceiros: true,
    apiAcesso: true,
    suportePrioritario: true,
    marcaBranca: false,
  },
  destaque: true,
  ordem: 2,
  ...overrides,
});

const criarCupomMock = (overrides: Partial<CupomDesconto> = {}): CupomDesconto => ({
  id: 'cup_1',
  codigo: 'BEMVINDO20',
  descricao: '20% off primeira assinatura',
  tipo: 'percentual',
  valor: 20,
  planoElegivel: ['profissional', 'enterprise'],
  cicloElegivel: ['mensal', 'anual'],
  maxUsos: 1000,
  usosAtuais: 100,
  dataInicio: '2024-01-01T00:00:00Z',
  dataFim: '2024-12-31T23:59:59Z',
  ativo: true,
  primeiraAssinatura: true,
  ...overrides,
});

const criarAssinaturaMock = (overrides: Partial<AssinaturaAtiva> = {}): AssinaturaAtiva => ({
  id: 'sub_123',
  planoId: 'profissional',
  ciclo: 'mensal',
  status: 'ativa',
  dataInicio: '2024-01-15T10:00:00Z',
  dataProximaCobranca: '2024-12-15T10:00:00Z',
  valorAtual: 14900,
  ...overrides,
});

// ============================================
// TESTES: VALIDAÇÕES BÁSICAS
// ============================================

describe('validarPlanoId', () => {
  it('deve retornar true para planos válidos', () => {
    expect(validarPlanoId('starter')).toBe(true);
    expect(validarPlanoId('profissional')).toBe(true);
    expect(validarPlanoId('enterprise')).toBe(true);
  });

  it('deve retornar false para planos inválidos', () => {
    expect(validarPlanoId('invalido')).toBe(false);
    expect(validarPlanoId('')).toBe(false);
    expect(validarPlanoId('premium')).toBe(false);
  });

  it('deve funcionar como type guard', () => {
    const plano: string = 'profissional';
    if (validarPlanoId(plano)) {
      // TypeScript sabe que plano é PlanoId aqui
      expect(plano).toBe('profissional');
    }
  });
});

describe('validarCicloFaturamento', () => {
  it('deve retornar true para ciclos válidos', () => {
    expect(validarCicloFaturamento('mensal')).toBe(true);
    expect(validarCicloFaturamento('anual')).toBe(true);
  });

  it('deve retornar false para ciclos inválidos', () => {
    expect(validarCicloFaturamento('semanal')).toBe(false);
    expect(validarCicloFaturamento('')).toBe(false);
  });
});

describe('validarStatusAssinatura', () => {
  it('deve retornar true para status válidos', () => {
    expect(validarStatusAssinatura('ativa')).toBe(true);
    expect(validarStatusAssinatura('pausada')).toBe(true);
    expect(validarStatusAssinatura('cancelada')).toBe(true);
    expect(validarStatusAssinatura('expirada')).toBe(true);
    expect(validarStatusAssinatura('pendente')).toBe(true);
  });

  it('deve retornar false para status inválidos', () => {
    expect(validarStatusAssinatura('invalido')).toBe(false);
    expect(validarStatusAssinatura('')).toBe(false);
  });
});

// ============================================
// TESTES: CÁLCULOS DE PREÇO
// ============================================

describe('calcularPrecoComDesconto', () => {
  const plano = criarPlanoMock();

  it('deve retornar preço mensal sem cupom', () => {
    const resultado = calcularPrecoComDesconto(plano, 'mensal');
    expect(resultado.precoOriginal).toBe(14900);
    expect(resultado.precoFinal).toBe(14900);
    expect(resultado.descontoTotal).toBe(0);
  });

  it('deve retornar preço anual sem cupom', () => {
    const resultado = calcularPrecoComDesconto(plano, 'anual');
    expect(resultado.precoOriginal).toBe(143040);
    expect(resultado.precoFinal).toBe(143040);
    expect(resultado.descontoTotal).toBe(0);
  });

  it('deve aplicar cupom percentual', () => {
    const cupom = criarCupomMock({ tipo: 'percentual', valor: 20 });
    const resultado = calcularPrecoComDesconto(plano, 'mensal', cupom);
    expect(resultado.precoOriginal).toBe(14900);
    expect(resultado.descontoTotal).toBe(2980); // 20% de 14900
    expect(resultado.precoFinal).toBe(11920);
  });

  it('deve aplicar cupom fixo', () => {
    const cupom = criarCupomMock({ tipo: 'fixo', valor: 5000 });
    const resultado = calcularPrecoComDesconto(plano, 'mensal', cupom);
    expect(resultado.descontoTotal).toBe(5000);
    expect(resultado.precoFinal).toBe(9900);
  });

  it('não deve permitir preço negativo', () => {
    const cupom = criarCupomMock({ tipo: 'fixo', valor: 20000 });
    const resultado = calcularPrecoComDesconto(plano, 'mensal', cupom);
    expect(resultado.precoFinal).toBe(0);
    expect(resultado.descontoTotal).toBe(14900); // limitado ao preço base
  });

  it('deve lidar com plano gratuito (starter)', () => {
    const planoGratuito = criarPlanoMock({ id: 'starter', precoMensal: 0, precoAnual: 0 });
    const resultado = calcularPrecoComDesconto(planoGratuito, 'mensal');
    expect(resultado.precoFinal).toBe(0);
  });
});

describe('calcularProrrateacao', () => {
  const planoAtual = criarPlanoMock({ id: 'starter', precoMensal: 0, precoAnual: 0 });
  const planoNovo = criarPlanoMock({ id: 'profissional', precoMensal: 14900, precoAnual: 143040 });

  it('deve calcular crédito e débito para upgrade mensal', () => {
    // 15 dias restantes de 30
    const resultado = calcularProrrateacao(planoAtual, planoNovo, 'mensal', 'mensal', 15, 30);
    expect(resultado.credito).toBe(0); // plano atual é grátis
    expect(resultado.debito).toBe(7450); // 14900 * 15/30
    expect(resultado.valorLiquido).toBe(7450); // cobrar diferença
  });

  it('deve calcular downgrade com crédito', () => {
    const resultado = calcularProrrateacao(planoNovo, planoAtual, 'mensal', 'mensal', 10, 30);
    expect(resultado.credito).toBe(4967); // 14900 * 10/30
    expect(resultado.debito).toBe(0);
    expect(resultado.valorLiquido).toBe(-4967); // crédito para o cliente
  });

  it('deve calcular mudança de ciclo', () => {
    const resultado = calcularProrrateacao(planoNovo, planoNovo, 'mensal', 'anual', 15, 30);
    // preço diário mensal: 14900/30 = 496.67
    // preço diário anual: 143040/365 = 391.89
    // crédito: 496.67 * 15 = 7450
    // débito: 391.89 * 15 = 5878
    // líquido: -1572 (crédito)
    expect(resultado.credito).toBeGreaterThan(0);
    expect(resultado.debito).toBeGreaterThan(0);
  });
});

// ============================================
// TESTES: VALIDAÇÃO DE CUPONS
// ============================================

describe('validarCupom', () => {
  const planoId: PlanoId = 'profissional';
  const ciclo: CicloFaturamento = 'mensal';

  it('deve rejeitar cupom undefined', () => {
    const resultado = validarCupom(undefined, planoId, ciclo, true, 0);
    expect(resultado.valido).toBe(false);
    expect(resultado.codigo).toBe(ERRO_CODIGOS.CUPON_EXPIRADO);
  });

  it('deve rejeitar cupom inativo', () => {
    const cupom = criarCupomMock({ ativo: false });
    const resultado = validarCupom(cupom, planoId, ciclo, true, 0);
    expect(resultado.valido).toBe(false);
    expect(resultado.codigo).toBe(ERRO_CODIGOS.CUPON_INATIVO);
  });

  it('deve rejeitar cupom expirado', () => {
    const cupom = criarCupomMock({ dataFim: '2020-01-01T00:00:00Z' });
    const resultado = validarCupom(cupom, planoId, ciclo, true, 0);
    expect(resultado.valido).toBe(false);
    expect(resultado.codigo).toBe(ERRO_CODIGOS.CUPON_EXPIRADO);
  });

  it('deve rejeitar cupom não iniciado', () => {
    const cupom = criarCupomMock({ dataInicio: '2030-01-01T00:00:00Z' });
    const resultado = validarCupom(cupom, planoId, ciclo, true, 0);
    expect(resultado.valido).toBe(false);
    expect(resultado.codigo).toBe(ERRO_CODIGOS.CUPON_EXPIRADO);
  });

  it('deve rejeitar cupom com usos esgotados', () => {
    const cupom = criarCupomMock({ maxUsos: 100, usosAtuais: 100 });
    const resultado = validarCupom(cupom, planoId, ciclo, true, 0);
    expect(resultado.valido).toBe(false);
    expect(resultado.codigo).toBe(ERRO_CODIGOS.CUPON_USOS_ESGOTADOS);
  });

  it('deve rejeitar cupom para plano inelegível', () => {
    const cupom = criarCupomMock({ planoElegivel: ['enterprise'] });
    const resultado = validarCupom(cupom, 'profissional', ciclo, true, 0);
    expect(resultado.valido).toBe(false);
    expect(resultado.codigo).toBe(ERRO_CODIGOS.CUPON_PLANO_INCOMPATIVEL);
  });

  it('deve rejeitar cupom para ciclo inelegível', () => {
    const cupom = criarCupomMock({ cicloElegivel: ['anual'] });
    const resultado = validarCupom(cupom, planoId, 'mensal', true, 0);
    expect(resultado.valido).toBe(false);
    expect(resultado.codigo).toBe(ERRO_CODIGOS.CUPON_CICLO_INCOMPATIVEL);
  });

  it('deve rejeitar cupom de primeira assinatura para cliente recorrente', () => {
    const cupom = criarCupomMock({ primeiraAssinatura: true });
    const resultado = validarCupom(cupom, planoId, ciclo, false, 1);
    expect(resultado.valido).toBe(false);
    expect(resultado.codigo).toBe(ERRO_CODIGOS.CUPON_PRIMEIRA_ASSINATURA);
  });

  it('deve aceitar cupom válido para primeira assinatura', () => {
    const cupom = criarCupomMock({ primeiraAssinatura: true });
    const resultado = validarCupom(cupom, planoId, ciclo, true, 0);
    expect(resultado.valido).toBe(true);
    expect(resultado.valorDesconto).toBe(2980); // 20% de 14900
  });

  it('deve aceitar cupom válido para assinatura recorrente (sem primeiraAssinatura)', () => {
    const cupom = criarCupomMock({ primeiraAssinatura: false });
    const resultado = validarCupom(cupom, planoId, ciclo, false, 1);
    expect(resultado.valido).toBe(true);
  });

  it('deve calcular desconto fixo corretamente', () => {
    const cupom = criarCupomMock({ tipo: 'fixo', valor: 5000 });
    const resultado = validarCupom(cupom, planoId, ciclo, true, 0);
    expect(resultado.valido).toBe(true);
    expect(resultado.valorDesconto).toBe(5000);
  });

  it('deve limitar desconto fixo ao preço do plano', () => {
    const cupom = criarCupomMock({ tipo: 'fixo', valor: 20000 });
    const resultado = validarCupom(cupom, planoId, ciclo, true, 0);
    expect(resultado.valorDesconto).toBe(14900); // limitado ao preço
  });
});

// ============================================
// TESTES: VERIFICAÇÃO DE LIMITES (UPSELL)
// ============================================

describe('verificarLimitePlano', () => {
  it('deve permitir quando ilimitado (-1)', () => {
    const resultado = verificarLimitePlano('enterprise', 'barbeiros', 100);
    expect(resultado.permitido).toBe(true);
    expect(resultado.limiteMaximo).toBe(-1);
  });

  it('deve permitir quando dentro do limite', () => {
    const resultado = verificarLimitePlano('profissional', 'barbeiros', 3, 4);
    expect(resultado.permitido).toBe(true);
    expect(resultado.limiteAtual).toBe(3);
    expect(resultado.limiteMaximo).toBe(5);
  });

  it('deve bloquear quando limite atingido', () => {
    const resultado = verificarLimitePlano('profissional', 'barbeiros', 5, 6);
    expect(resultado.permitido).toBe(false);
    expect(resultado.limiteAtual).toBe(5);
    expect(resultado.limiteMaximo).toBe(5);
    expect(resultado.mensagemUpsell).toContain('limite de 5 barbeiros');
    expect(resultado.planoSugerido).toBe('enterprise');
  });

  it('deve sugerir próximo plano para cadeiras', () => {
    const resultado = verificarLimitePlano('starter', 'cadeiras', 1, 2);
    expect(resultado.permitido).toBe(false);
    expect(resultado.planoSugerido).toBe('profissional');
  });

  it('deve sugerir próximo plano para agendamentos', () => {
    const resultado = verificarLimitePlano('profissional', 'agendamentosMes', 500, 501);
    expect(resultado.permitido).toBe(false);
    expect(resultado.planoSugerido).toBe('enterprise');
  });

  it('deve retornar recurso correto na resposta', () => {
    const resultado = verificarLimitePlano('starter', 'cadeiras', 1);
    expect(resultado.recurso).toBe('cadeiras');
  });
});

// ============================================
// TESTES: GERAÇÃO DE IDs
// ============================================

describe('gerarIdAssinatura', () => {
  it('deve gerar ID único com prefixo sub_', () => {
    const id1 = gerarIdAssinatura();
    const id2 = gerarIdAssinatura();

    expect(id1).toMatch(/^sub_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^sub_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});

describe('gerarNumeroFatura', () => {
  it('deve gerar número sequencial com ano', () => {
    const num1 = gerarNumeroFatura(1);
    const num2 = gerarNumeroFatura(123);

    expect(num1).toMatch(/^CR-\d{4}-000001$/);
    expect(num2).toMatch(/^CR-\d{4}-000123$/);
  });
});

describe('gerarIdempotencyKey', () => {
  it('deve gerar chave com formato correto', () => {
    const chave = gerarIdempotencyKey('checkout', 'sessao_123');
    expect(chave).toMatch(/^idem_checkout_sessao_123_\d+_[a-z0-9]+$/);
  });
});

// ============================================
// TESTES: FORMATAÇÃO DE STATUS
// ============================================

describe('formatarStatusAssinatura', () => {
  it('deve formatar status ativa', () => {
    expect(formatarStatusAssinatura('ativa')).toEqual({ label: 'Ativa', cor: 'sucesso' });
  });

  it('deve formatar status pausada', () => {
    expect(formatarStatusAssinatura('pausada')).toEqual({ label: 'Pausada', cor: 'aviso' });
  });

  it('deve formatar status cancelada', () => {
    expect(formatarStatusAssinatura('cancelada')).toEqual({ label: 'Cancelada', cor: 'erro' });
  });

  it('deve formatar status expirada', () => {
    expect(formatarStatusAssinatura('expirada')).toEqual({ label: 'Expirada', cor: 'erro' });
  });

  it('deve formatar status pendente', () => {
    expect(formatarStatusAssinatura('pendente')).toEqual({ label: 'Pendente', cor: 'aviso' });
  });
});

describe('formatarStatusFatura', () => {
  it('deve formatar status paga', () => {
    expect(formatarStatusFatura('paga')).toEqual({ label: 'Paga', cor: 'sucesso' });
  });

  it('deve formatar status pendente', () => {
    expect(formatarStatusFatura('pendente')).toEqual({ label: 'Pendente', cor: 'aviso' });
  });

  it('deve formatar status vencida', () => {
    expect(formatarStatusFatura('vencida')).toEqual({ label: 'Vencida', cor: 'erro' });
  });

  it('deve formatar status cancelada', () => {
    expect(formatarStatusFatura('cancelada')).toEqual({ label: 'Cancelada', cor: 'neutro' });
  });

  it('deve formatar status estornada', () => {
    expect(formatarStatusFatura('estornada')).toEqual({ label: 'Estornada', cor: 'aviso' });
  });

  it('deve lidar com status desconhecido', () => {
    expect(formatarStatusFatura('desconhecido')).toEqual({ label: 'desconhecido', cor: 'neutro' });
  });
});

// ============================================
// TESTES: PERMISSÕES DE AÇÕES
// ============================================

describe('podeAlterarPlano', () => {
  it('deve permitir para assinatura ativa', () => {
    const assinatura = criarAssinaturaMock({ status: 'ativa' });
    expect(podeAlterarPlano(assinatura)).toBe(true);
  });

  it('deve permitir para assinatura pausada', () => {
    const assinatura = criarAssinaturaMock({ status: 'pausada' });
    expect(podeAlterarPlano(assinatura)).toBe(true);
  });

  it('deve negar para assinatura cancelada', () => {
    const assinatura = criarAssinaturaMock({ status: 'cancelada' });
    expect(podeAlterarPlano(assinatura)).toBe(false);
  });

  it('deve negar para assinatura expirada', () => {
    const assinatura = criarAssinaturaMock({ status: 'expirada' });
    expect(podeAlterarPlano(assinatura)).toBe(false);
  });

  it('deve negar para assinatura nula', () => {
    expect(podeAlterarPlano(null)).toBe(false);
  });
});

describe('podePausarAssinatura', () => {
  it('deve permitir apenas para ativa', () => {
    expect(podePausarAssinatura(criarAssinaturaMock({ status: 'ativa' }))).toBe(true);
    expect(podePausarAssinatura(criarAssinaturaMock({ status: 'pausada' }))).toBe(false);
    expect(podePausarAssinatura(criarAssinaturaMock({ status: 'cancelada' }))).toBe(false);
    expect(podePausarAssinatura(null)).toBe(false);
  });
});

describe('podeCancelarAssinatura', () => {
  it('deve permitir para ativa, pausada, pendente', () => {
    expect(podeCancelarAssinatura(criarAssinaturaMock({ status: 'ativa' }))).toBe(true);
    expect(podeCancelarAssinatura(criarAssinaturaMock({ status: 'pausada' }))).toBe(true);
    expect(podeCancelarAssinatura(criarAssinaturaMock({ status: 'pendente' }))).toBe(true);
  });

  it('deve negar para cancelada, expirada', () => {
    expect(podeCancelarAssinatura(criarAssinaturaMock({ status: 'cancelada' }))).toBe(false);
    expect(podeCancelarAssinatura(criarAssinaturaMock({ status: 'expirada' }))).toBe(false);
  });
});

describe('podeReativarAssinatura', () => {
  it('deve permitir para pausada e cancelada', () => {
    expect(podeReativarAssinatura(criarAssinaturaMock({ status: 'pausada' }))).toBe(true);
    expect(podeReativarAssinatura(criarAssinaturaMock({ status: 'cancelada' }))).toBe(true);
  });

  it('deve negar para ativa, expirada, pendente', () => {
    expect(podeReativarAssinatura(criarAssinaturaMock({ status: 'ativa' }))).toBe(false);
    expect(podeReativarAssinatura(criarAssinaturaMock({ status: 'expirada' }))).toBe(false);
    expect(podeReativarAssinatura(criarAssinaturaMock({ status: 'pendente' }))).toBe(false);
  });
});

// ============================================
// TESTES: CÁLCULO DE DIAS
// ============================================

describe('calcularDiasProximaCobranca', () => {
  it('deve calcular dias futuros', () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    expect(calcularDiasProximaCobranca(amanha.toISOString())).toBe(1);
  });

  it('deve retornar 0 para hoje', () => {
    expect(calcularDiasProximaCobranca(new Date().toISOString())).toBe(0);
  });

  it('deve retornar negativo para datas passadas', () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    expect(calcularDiasProximaCobranca(ontem.toISOString())).toBe(-1);
  });
});

// ============================================
// TESTES: SANITIZAÇÃO
// ============================================

describe('sanitizarCupom', () => {
  it('deve remover espaços e converter para maiúscula', () => {
    expect(sanitizarCupom('  bemvindo20  ')).toBe('BEMVINDO20');
  });

  it('deve remover caracteres especiais', () => {
    expect(sanitizarCupom('BEM-VINDO_20!')).toBe('BEMVINDO20');
  });

  it('deve lidar com string vazia', () => {
    expect(sanitizarCupom('')).toBe('');
  });
});

describe('sanitizarMotivoCancelamento', () => {
  it('deve remover espaços extras', () => {
    expect(sanitizarMotivoCancelamento('  motivo   ')).toBe('motivo');
  });

  it('deve truncar em 500 caracteres', () => {
    const longo = 'a'.repeat(600);
    expect(sanitizarMotivoCancelamento(longo).length).toBe(500);
  });
});

// ============================================
// TESTES: INTEGRAÇÃO COM PLANOS_DEFINICAO
// ============================================

describe('PLANOS_DEFINICAO integration', () => {
  it('deve ter 3 planos definidos', () => {
    expect(PLANOS_DEFINICAO.length).toBe(3);
  });

  it('deve ter starter como gratuito', () => {
    const starter = PLANOS_DEFINICAO.find(p => p.id === 'starter');
    expect(starter?.precoMensal).toBe(0);
    expect(starter?.precoAnual).toBe(0);
    expect(starter?.limites.barbeiros).toBe(1);
  });

  it('deve ter profissional com destaque', () => {
    const prof = PLANOS_DEFINICAO.find(p => p.id === 'profissional');
    expect(prof?.destaque).toBe(true);
    expect(prof?.precoMensal).toBe(14900);
    expect(prof?.descontoAnual).toBe(20);
  });

  it('deve ter enterprise com ilimitado', () => {
    const ent = PLANOS_DEFINICAO.find(p => p.id === 'enterprise');
    expect(ent?.limites.barbeiros).toBe(-1);
    expect(ent?.limites.cadeiras).toBe(-1);
    expect(ent?.limites.marcaBranca).toBe(true);
  });

  it('deve estar ordenado por ordem', () => {
    for (let i = 1; i < PLANOS_DEFINICAO.length; i++) {
      expect(PLANOS_DEFINICAO[i].ordem).toBeGreaterThan(PLANOS_DEFINICAO[i - 1].ordem);
    }
  });
});