/**
 * Serviços do domínio Assinaturas - Interface DIP + Implementação.
 * Injeção de dependência via factory/singleton.
 */

import type {
  PlanoId,
  CicloFaturamento,
  PlanoAssinatura,
  AssinaturaAtiva,
  Fatura,
  CupomDesconto,
  ValidacaoCupom,
  VerificacaoLimite,
  HistoricoPlano,
} from '../types';

import { PLANOS_DEFINICAO } from '../types';
import {
  validarPlanoId,
  validarCicloFaturamento,
  validarCupom,
  verificarLimitePlano,
  gerarIdAssinatura,
  gerarNumeroFatura,
  gerarIdempotencyKey,
  podeAlterarPlano,
  podePausarAssinatura,
  podeCancelarAssinatura,
  podeReativarAssinatura,
  sanitizarCupom,
  sanitizarMotivoCancelamento,
  calcularProrrateacao,
} from '../rules';

// ============================================
// INTERFACE (DIP)
// ============================================

export interface IAssinaturasService {
  // Planos
  obterPlanos(): Promise<readonly PlanoAssinatura[]>;
  obterPlanoPorId(_id: PlanoId): Promise<PlanoAssinatura | undefined>;

  // Assinatura ativa
  obterAssinaturaAtiva(): Promise<AssinaturaAtiva | null>;
  criarAssinatura(_planoId: PlanoId, _ciclo: CicloFaturamento, _cupomCodigo?: string): Promise<AssinaturaAtiva>;
  alterarPlano(_novoPlanoId: PlanoId, _novoCiclo: CicloFaturamento): Promise<AssinaturaAtiva>;
  pausarAssinatura(): Promise<AssinaturaAtiva>;
  cancelarAssinatura(_motivo: string): Promise<AssinaturaAtiva>;
  reativarAssinatura(): Promise<AssinaturaAtiva>;
  aplicarCupom(_codigo: string): Promise<ValidacaoCupom>;

  // Faturas
  obterFaturas(): Promise<Fatura[]>;
  obterFaturaPorId(_id: string): Promise<Fatura | undefined>;
  baixarFatura(_id: string): Promise<Blob>;
  imprimirFatura(_id: string): Promise<void>;

  // Histórico
  obterHistoricoPlanos(): Promise<HistoricoPlano[]>;

  // Limites & Upsell
  verificarLimite(_recurso: 'barbeiros' | 'cadeiras' | 'agendamentosMes', _quantidadeAtual: number, _quantidadeNova?: number): Promise<VerificacaoLimite>;
  obterPlanoSugerido(_recurso: 'barbeiros' | 'cadeiras' | 'agendamentosMes'): PlanoId | undefined;

  // Cupons
  validarCupom(_codigo: string, _planoId: PlanoId, _ciclo: CicloFaturamento): Promise<ValidacaoCupom>;

  // Idempotency
  gerarChaveIdempotencia(_acao: string, _entidadeId: string): string;
}

// ============================================
// MOCK DATA / SIMULAÇÃO
// ============================================

const MOCK_ASSINATURA: AssinaturaAtiva = {
  id: 'sub_1700000000_abc123',
  planoId: 'profissional',
  ciclo: 'mensal',
  status: 'ativa',
  dataInicio: '2024-01-15T10:00:00Z',
  dataProximaCobranca: '2024-12-15T10:00:00Z',
  valorAtual: 14900,
  descontoAplicado: 0,
};

const MOCK_FATURAS: Fatura[] = [
  {
    id: 'fat_1',
    assinaturaId: 'sub_1700000000_abc123',
    numero: 'CR-2024-001234',
    status: 'paga',
    valor: 14900,
    valorPago: 14900,
    dataEmissao: '2024-11-01T10:00:00Z',
    dataVencimento: '2024-11-10T10:00:00Z',
    dataPagamento: '2024-11-05T14:30:00Z',
    metodoPagamento: 'pix',
    urlPix: 'https://api.corterapido.com/pix/fat_1',
    pdfUrl: 'https://api.corterapido.com/faturas/fat_1.pdf',
    itens: [
      { descricao: 'Plano Profissional - Mensal', quantidade: 1, valorUnitario: 14900, valorTotal: 14900 },
    ],
  },
  {
    id: 'fat_2',
    assinaturaId: 'sub_1700000000_abc123',
    numero: 'CR-2024-001235',
    status: 'pendente',
    valor: 14900,
    valorPago: 0,
    dataEmissao: '2024-12-01T10:00:00Z',
    dataVencimento: '2024-12-10T10:00:00Z',
    metodoPagamento: 'cartao',
    itens: [
      { descricao: 'Plano Profissional - Mensal', quantidade: 1, valorUnitario: 14900, valorTotal: 14900 },
    ],
  },
];

const MOCK_HISTORICO: HistoricoPlano[] = [
  {
    id: 'hist_1',
    planoAnteriorId: 'starter',
    planoNovoId: 'profissional',
    cicloAnterior: 'mensal',
    cicloNovo: 'mensal',
    tipo: 'upgrade',
    dataEfetivacao: '2024-01-15T10:00:00Z',
    valorDiferenca: 14900,
    prorrateado: false,
  },
];

const MOCK_CUPONS: CupomDesconto[] = [
  {
    id: 'cup_1',
    codigo: 'BEMVINDO20',
    descricao: '20% de desconto na primeira assinatura',
    tipo: 'percentual',
    valor: 20,
    planoElegivel: ['profissional', 'enterprise'],
    cicloElegivel: ['mensal', 'anual'],
    maxUsos: 1000,
    usosAtuais: 150,
    dataInicio: '2024-01-01T00:00:00Z',
    dataFim: '2024-12-31T23:59:59Z',
    ativo: true,
    primeiraAssinatura: true,
  },
  {
    id: 'cup_2',
    codigo: 'ANUAL15',
    descricao: '15% off no plano anual',
    tipo: 'percentual',
    valor: 15,
    cicloElegivel: ['anual'],
    maxUsos: 500,
    usosAtuais: 80,
    dataInicio: '2024-01-01T00:00:00Z',
    ativo: true,
  },
];

// ============================================
// IMPLEMENTAÇÃO
// ============================================

class AssinaturasService implements IAssinaturasService {
  private assinaturaAtual: AssinaturaAtiva | null = MOCK_ASSINATURA;
  private faturas: Fatura[] = [...MOCK_FATURAS];
  private historico: HistoricoPlano[] = [...MOCK_HISTORICO];
  private cupons: CupomDesconto[] = [...MOCK_CUPONS];
  private faturaSequencial = MOCK_FATURAS.length;

  // Simula latência de rede
  private async delay(ms: number = 300): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  // Planos
  async obterPlanos(): Promise<readonly PlanoAssinatura[]> {
    await this.delay();
    return PLANOS_DEFINICAO;
  }

  async obterPlanoPorId(id: PlanoId): Promise<PlanoAssinatura | undefined> {
    await this.delay(100);
    return PLANOS_DEFINICAO.find(p => p.id === id);
  }

  // Assinatura ativa
  async obterAssinaturaAtiva(): Promise<AssinaturaAtiva | null> {
    await this.delay();
    return this.assinaturaAtual;
  }

  async criarAssinatura(planoId: PlanoId, ciclo: CicloFaturamento, cupomCodigo?: string): Promise<AssinaturaAtiva> {
    await this.delay(500);

    if (!validarPlanoId(planoId)) {
      throw new Error('PLANO_INVALIDO');
    }
    if (!validarCicloFaturamento(ciclo)) {
      throw new Error('CICLO_INVALIDO');
    }

    const plano = PLANOS_DEFINICAO.find(p => p.id === planoId);
    if (!plano) throw new Error('PLANO_INVALIDO');

    let descontoAplicado = 0;
    let cupomId: string | undefined;

    if (cupomCodigo) {
      const codigoSanitizado = sanitizarCupom(cupomCodigo);
      const cupom = this.cupons.find(c => c.codigo === codigoSanitizado);
      if (cupom) {
        const validacao = validarCupom(cupom, planoId, ciclo, true, 0);
        if (validacao.valido && validacao.cupom) {
          descontoAplicado = cupom.tipo === 'percentual' ? cupom.valor : 0;
          cupomId = cupom.id;
          validacao.cupom.usosAtuais++;
        }
      }
    }

    const valorBase = ciclo === 'anual' ? plano.precoAnual : plano.precoMensal;
    const valorFinal = Math.round(valorBase * (1 - descontoAplicado / 100));

    const agora = new Date();
    const proximaCobranca = new Date(agora);
    proximaCobranca.setMonth(proximaCobranca.getMonth() + (ciclo === 'anual' ? 12 : 1));

    this.assinaturaAtual = {
      id: gerarIdAssinatura(),
      planoId,
      ciclo,
      status: 'ativa',
      dataInicio: agora.toISOString(),
      dataProximaCobranca: proximaCobranca.toISOString(),
      valorAtual: valorFinal,
      descontoAplicado: descontoAplicado > 0 ? descontoAplicado : undefined,
      cupomId,
    };

    // Criar fatura inicial
    this.faturaSequencial++;
    const novaFatura: Fatura = {
      id: `fat_${this.faturaSequencial}`,
      assinaturaId: this.assinaturaAtual.id,
      numero: gerarNumeroFatura(this.faturaSequencial),
      status: 'pendente',
      valor: valorFinal,
      valorPago: 0,
      dataEmissao: agora.toISOString(),
      dataVencimento: new Date(agora.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      itens: [
        { descricao: `${plano.nome} - ${ciclo === 'anual' ? 'Anual' : 'Mensal'}`, quantidade: 1, valorUnitario: valorFinal, valorTotal: valorFinal },
      ],
    };
    this.faturas.unshift(novaFatura);

    return this.assinaturaAtual;
  }

  async alterarPlano(novoPlanoId: PlanoId, novoCiclo: CicloFaturamento): Promise<AssinaturaAtiva> {
    await this.delay(500);

    if (!this.assinaturaAtual) throw new Error('ASSINATURA_INEXISTENTE');
    if (!podeAlterarPlano(this.assinaturaAtual)) throw new Error('STATUS_INVALIDO');
    if (!validarPlanoId(novoPlanoId)) throw new Error('PLANO_INVALIDO');
    if (!validarCicloFaturamento(novoCiclo)) throw new Error('CICLO_INVALIDO');

    const planoAtual = PLANOS_DEFINICAO.find(p => p.id === this.assinaturaAtual!.planoId)!;
    const planoNovo = PLANOS_DEFINICAO.find(p => p.id === novoPlanoId)!;

    const isUpgrade = planoNovo.ordem > planoAtual.ordem ||
      (planoNovo.ordem === planoAtual.ordem && novoCiclo === 'anual' && this.assinaturaAtual.ciclo === 'mensal');

    const tipoHistorico = isUpgrade ? 'upgrade' :
      planoNovo.ordem < planoAtual.ordem ? 'downgrade' : 'mudanca_ciclo';

    // Calcular prorrateação (simplificado: 15 dias restantes de 30)
    const { valorLiquido } = calcularProrrateacao(planoAtual, planoNovo, this.assinaturaAtual.ciclo, novoCiclo, 15, 30);

    const valorBaseNovo = novoCiclo === 'anual' ? planoNovo.precoAnual : planoNovo.precoMensal;
    const descontoAtual = this.assinaturaAtual.descontoAplicado ?? 0;
    const valorFinal = Math.round(valorBaseNovo * (1 - descontoAtual / 100));

    const planoAnteriorId = this.assinaturaAtual.planoId;
    const cicloAnterior = this.assinaturaAtual.ciclo;

    this.assinaturaAtual = {
      ...this.assinaturaAtual,
      planoId: novoPlanoId,
      ciclo: novoCiclo,
      valorAtual: valorFinal,
      dataProximaCobranca: new Date(Date.now() + (novoCiclo === 'anual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
    };

    this.historico.unshift({
      id: `hist_${Date.now()}`,
      planoAnteriorId,
      planoNovoId: novoPlanoId,
      cicloAnterior,
      cicloNovo: novoCiclo,
      tipo: tipoHistorico,
      dataEfetivacao: new Date().toISOString(),
      valorDiferenca: valorLiquido,
      prorrateado: true,
    });

    // Nova fatura com valor ajustado
    this.faturaSequencial++;
    const novaFatura: Fatura = {
      id: `fat_${this.faturaSequencial}`,
      assinaturaId: this.assinaturaAtual.id,
      numero: gerarNumeroFatura(this.faturaSequencial),
      status: 'pendente',
      valor: valorFinal,
      valorPago: 0,
      dataEmissao: new Date().toISOString(),
      dataVencimento: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      itens: [
        { descricao: `${planoNovo.nome} - ${novoCiclo === 'anual' ? 'Anual' : 'Mensal'}`, quantidade: 1, valorUnitario: valorFinal, valorTotal: valorFinal },
      ],
    };
    this.faturas.unshift(novaFatura);

    return this.assinaturaAtual;
  }

  async pausarAssinatura(): Promise<AssinaturaAtiva> {
    await this.delay(300);

    if (!this.assinaturaAtual) throw new Error('ASSINATURA_INEXISTENTE');
    if (!podePausarAssinatura(this.assinaturaAtual)) throw new Error('STATUS_INVALIDO');

    this.assinaturaAtual = {
      ...this.assinaturaAtual,
      status: 'pausada',
      dataPausa: new Date().toISOString(),
    };

    return this.assinaturaAtual;
  }

  async cancelarAssinatura(motivo: string): Promise<AssinaturaAtiva> {
    await this.delay(300);

    if (!this.assinaturaAtual) throw new Error('ASSINATURA_INEXISTENTE');
    if (!podeCancelarAssinatura(this.assinaturaAtual)) throw new Error('STATUS_INVALIDO');

    const motivoSanitizado = sanitizarMotivoCancelamento(motivo);

    this.assinaturaAtual = {
      ...this.assinaturaAtual,
      status: 'cancelada',
      dataCancelamento: new Date().toISOString(),
      metadata: { ...this.assinaturaAtual.metadata, motivoCancelamento: motivoSanitizado },
    };

    return this.assinaturaAtual;
  }

  async reativarAssinatura(): Promise<AssinaturaAtiva> {
    await this.delay(300);

    if (!this.assinaturaAtual) throw new Error('ASSINATURA_INEXISTENTE');
    if (!podeReativarAssinatura(this.assinaturaAtual)) throw new Error('STATUS_INVALIDO');

    const proximaCobranca = new Date();
    proximaCobranca.setMonth(proximaCobranca.getMonth() + (this.assinaturaAtual.ciclo === 'anual' ? 12 : 1));

    this.assinaturaAtual = {
      ...this.assinaturaAtual,
      status: 'ativa',
      dataPausa: undefined,
      dataCancelamento: undefined,
      dataProximaCobranca: proximaCobranca.toISOString(),
    };

    // Nova fatura
    this.faturaSequencial++;
    const plano = PLANOS_DEFINICAO.find(p => p.id === this.assinaturaAtual.planoId)!;
    const novaFatura: Fatura = {
      id: `fat_${this.faturaSequencial}`,
      assinaturaId: this.assinaturaAtual.id,
      numero: gerarNumeroFatura(this.faturaSequencial),
      status: 'pendente',
      valor: this.assinaturaAtual.valorAtual,
      valorPago: 0,
      dataEmissao: new Date().toISOString(),
      dataVencimento: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      itens: [
        { descricao: `${plano.nome} - ${this.assinaturaAtual.ciclo === 'anual' ? 'Anual' : 'Mensal'}`, quantidade: 1, valorUnitario: this.assinaturaAtual.valorAtual, valorTotal: this.assinaturaAtual.valorAtual },
      ],
    };
    this.faturas.unshift(novaFatura);

    return this.assinaturaAtual;
  }

  async aplicarCupom(codigo: string): Promise<ValidacaoCupom> {
    await this.delay(200);

    if (!this.assinaturaAtual) {
      return { valido: false, erro: 'Nenhuma assinatura ativa', valorDesconto: 0 };
    }

    const codigoSanitizado = sanitizarCupom(codigo);
    const cupom = this.cupons.find(c => c.codigo === codigoSanitizado);

    if (!cupom) {
      return { valido: false, erro: 'Cupom não encontrado', valorDesconto: 0 };
    }

    const ehPrimeiraAssinatura = this.historico.length === 0;
    const assinaturasAnteriores = this.historico.filter(h => h.tipo !== 'mudanca_ciclo').length;

    return validarCupom(cupom, this.assinaturaAtual.planoId, this.assinaturaAtual.ciclo, ehPrimeiraAssinatura, assinaturasAnteriores);
  }

  // Faturas
  async obterFaturas(): Promise<Fatura[]> {
    await this.delay();
    return [...this.faturas];
  }

  async obterFaturaPorId(id: string): Promise<Fatura | undefined> {
    await this.delay(100);
    return this.faturas.find(f => f.id === id);
  }

  async baixarFatura(id: string): Promise<Blob> {
    await this.delay(500);
    const fatura = this.faturas.find(f => f.id === id);
    if (!fatura) throw new Error('FATURA_INEXISTENTE');

    // Simula PDF - em produção seria download real
    const conteudo = `Fatura ${fatura.numero}\nValor: R$ ${(fatura.valor / 100).toFixed(2)}\nStatus: ${fatura.status}`;
    return new Blob([conteudo], { type: 'application/pdf' });
  }

  async imprimirFatura(id: string): Promise<void> {
    await this.delay(300);
    const fatura = this.faturas.find(f => f.id === id);
    if (!fatura) throw new Error('FATURA_INEXISTENTE');

    // Em produção: window.open(fatura.pdfUrl, '_blank')
    console.log('Imprimir fatura:', fatura.numero);
  }

  // Histórico
  async obterHistoricoPlanos(): Promise<HistoricoPlano[]> {
    await this.delay();
    return [...this.historico];
  }

  // Limites & Upsell
  async verificarLimite(
    recurso: 'barbeiros' | 'cadeiras' | 'agendamentosMes',
    quantidadeAtual: number,
    quantidadeNova?: number
  ): Promise<VerificacaoLimite> {
    await this.delay(100);

    if (!this.assinaturaAtual) {
      return { permitido: false, limiteAtual: 0, limiteMaximo: 0, recurso, mensagemUpsell: 'Assine um plano para acessar este recurso' };
    }

    return verificarLimitePlano(this.assinaturaAtual.planoId, recurso, quantidadeAtual, quantidadeNova);
  }

  obterPlanoSugerido(recurso: 'barbeiros' | 'cadeiras' | 'agendamentosMes'): PlanoId | undefined {
    if (!this.assinaturaAtual) return 'profissional';
    return verificarLimitePlano(this.assinaturaAtual.planoId, recurso, 0, 1).planoSugerido;
  }

  // Cupons
  async validarCupom(codigo: string, planoId: PlanoId, ciclo: CicloFaturamento): Promise<ValidacaoCupom> {
    await this.delay(200);

    const codigoSanitizado = sanitizarCupom(codigo);
    const cupom = this.cupons.find(c => c.codigo === codigoSanitizado);

    if (!cupom) {
      return { valido: false, erro: 'Cupom não encontrado', valorDesconto: 0 };
    }

    const ehPrimeiraAssinatura = this.historico.length === 0;
    const assinaturasAnteriores = this.historico.filter(h => h.tipo !== 'mudanca_ciclo').length;

    return validarCupom(cupom, planoId, ciclo, ehPrimeiraAssinatura, assinaturasAnteriores);
  }

  // Idempotency
  gerarChaveIdempotencia(acao: string, entidadeId: string): string {
    return gerarIdempotencyKey(acao, entidadeId);
  }
}

// ============================================
// FACTORY / SINGLETON
// ============================================

let serviceInstance: IAssinaturasService | null = null;

export function createAssinaturasService(): IAssinaturasService {
  if (!serviceInstance) {
    serviceInstance = new AssinaturasService();
  }
  return serviceInstance;
}

export function getAssinaturasService(): IAssinaturasService {
  if (!serviceInstance) {
    serviceInstance = new AssinaturasService();
  }
  return serviceInstance;
}

export function resetAssinaturasService(): void {
  serviceInstance = null;
}