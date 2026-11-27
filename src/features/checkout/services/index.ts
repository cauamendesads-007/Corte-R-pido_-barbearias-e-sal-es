/**
 * Serviços do domínio Checkout - Interface DIP + Implementação.
 * Injeção de dependência via factory/singleton.
 */

import type {
  MetodoPagamento,
  StatusPagamento,
  ItemCheckout,
  DadosPagamentoPix,
  DadosPagamentoCartao,
  DadosPagamentoBoleto,
  CheckoutSession,
  ValidacaoCartao,
  ValidacaoCPF_CNPJ,
} from '../types';

import {
  criarSessaoCheckout,
  validarItensCheckout,
  validarIdempotencyKey,
  gerarIdempotencyKey,
  validarCartaoCompleto,
  validarChavePix,
  validarCPF_CNPJ,
  calcularParcelas,
  formatarMoeda,
  identificarBandeira,
  formatarCartao,
  formatarValidade,
  formatarCPF_CNPJ,
  ERRO_CODIGOS,
} from '../rules';

// ============================================
// INTERFACE (DIP)
// ============================================

export interface ICheckoutService {
  // Sessão
  criarSessao(_itens: ItemCheckout[], _metodo: MetodoPagamento, _desconto?: number, _metadata?: Record<string, unknown>): Promise<CheckoutSession>;
  obterSessao(_id: string): Promise<CheckoutSession | null>;
  atualizarStatusSessao(_id: string, _status: StatusPagamento, _dadosPagamento?: Partial<DadosPagamentoPix | DadosPagamentoCartao | DadosPagamentoBoleto>): Promise<CheckoutSession>;

  // Validações
  validarCartao(_dados: Partial<DadosPagamentoCartao>): Promise<ValidacaoCartao>;
  validarCPF_CNPJ(_valor: string): Promise<ValidacaoCPF_CNPJ>;
  validarChavePix(_chave: string): Promise<{ valido: boolean; tipo?: string; erro?: string }>;

  // Pagamentos
  processarPix(_sessaoId: string, _chavePix: string): Promise<DadosPagamentoPix>;
  processarCartao(_sessaoId: string, _dados: DadosPagamentoCartao): Promise<{ autorizado: boolean; transacaoId?: string; erro?: string }>;
  processarBoleto(_sessaoId: string): Promise<DadosPagamentoBoleto>;

  // Idempotência
  gerarChaveIdempotencia(_acao: string, _entidadeId: string): string;
  validarChaveIdempotencia(_chave: string, _acao: string, _entidadeId: string): Promise<{ valido: boolean; erro?: string }>;
  registrarUsoIdempotencia(_chave: string): Promise<void>;

  // Utilitários
  calcularParcelas(_valorTotal: number, _maxParcelas?: number): ReturnType<typeof calcularParcelas>;
  formatarMoeda: typeof formatarMoeda;
  identificarBandeira: typeof identificarBandeira;
  formatarCartao: typeof formatarCartao;
  formatarValidade: typeof formatarValidade;
  formatarCPF_CNPJ: typeof formatarCPF_CNPJ;
}

// ============================================
// MOCK DATA / SIMULAÇÃO
// ============================================

const MOCK_SESSOES: Map<string, CheckoutSession> = new Map();
const MOCK_IDEMPOTENCIA: Set<string> = new Set();

// Simula latência de rede
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// IMPLEMENTAÇÃO
// ============================================

class CheckoutService implements ICheckoutService {
  async criarSessao(
    itens: ItemCheckout[],
    metodo: MetodoPagamento,
    desconto: number = 0,
    metadata?: Record<string, unknown>
  ): Promise<CheckoutSession> {
    await delay();

    const validacao = validarItensCheckout(itens);
    if (!validacao.valido) {
      throw new Error(validacao.erros.join('; '));
    }

    const sessao = criarSessaoCheckout(itens, metodo, desconto, metadata);
    MOCK_SESSOES.set(sessao.id, sessao);
    return sessao;
  }

  async obterSessao(id: string): Promise<CheckoutSession | null> {
    await delay(100);
    return MOCK_SESSOES.get(id) ?? null;
  }

  async atualizarStatusSessao(
    id: string,
    status: StatusPagamento,
    dadosPagamento?: Partial<DadosPagamentoPix | DadosPagamentoCartao | DadosPagamentoBoleto>
  ): Promise<CheckoutSession> {
    await delay();

    const sessao = MOCK_SESSOES.get(id);
    if (!sessao) throw new Error('SESSAO_INEXISTENTE');

    const pixDados = dadosPagamento as Partial<DadosPagamentoPix> | undefined;
    const cartaoDados = dadosPagamento as Partial<DadosPagamentoCartao> | undefined;
    const boletoDados = dadosPagamento as Partial<DadosPagamentoBoleto> | undefined;

    const atualizada: CheckoutSession = {
      ...sessao,
      status,
      dataPagamento: status === 'aprovado' ? new Date().toISOString() : sessao.dataPagamento,
      pix: pixDados?.qrCode ? { ...sessao.pix, ...pixDados } as DadosPagamentoPix : sessao.pix,
      cartao: cartaoDados?.numero ? { ...sessao.cartao, ...cartaoDados } as DadosPagamentoCartao : sessao.cartao,
      boleto: boletoDados?.codigoBarras ? { ...sessao.boleto, ...boletoDados } as DadosPagamentoBoleto : sessao.boleto,
    };

    MOCK_SESSOES.set(id, atualizada);
    return atualizada;
  }

  async validarCartao(dados: Partial<DadosPagamentoCartao>): Promise<ValidacaoCartao> {
    await delay(100);
    return validarCartaoCompleto(dados);
  }

  async validarCPF_CNPJ(valor: string): Promise<ValidacaoCPF_CNPJ> {
    await delay(100);
    return validarCPF_CNPJ(valor);
  }

  async validarChavePix(chave: string): Promise<{ valido: boolean; tipo?: string; erro?: string }> {
    await delay(100);
    return validarChavePix(chave);
  }

  async processarPix(sessaoId: string, chavePix: string): Promise<DadosPagamentoPix> {
    await delay(1000); // Simula chamada para gateway

    const sessao = MOCK_SESSOES.get(sessaoId);
    if (!sessao) throw new Error('SESSAO_INEXISTENTE');

    // Validar chave
    const validacaoChave = validarChavePix(chavePix);
    if (!validacaoChave.valido) {
      throw new Error(validacaoChave.erro || 'Chave Pix inválida');
    }

    // Gerar QR Code EMVCo mock
    const payload = this.gerarPayloadPixEMVCo(sessao.total, chavePix);
    const qrCodeImage = `data:image/svg+xml;base64,${btoa(this.gerarQRCodeSVG(payload))}`;
    const expiracao = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const dadosPix: DadosPagamentoPix = {
      chave: chavePix,
      qrCode: payload,
      qrCodeImage,
      expiracao,
      valor: sessao.total,
    };

    await this.atualizarStatusSessao(sessaoId, 'pendente', dadosPix);
    return dadosPix;
  }

  async processarCartao(sessaoId: string, dados: DadosPagamentoCartao): Promise<{ autorizado: boolean; transacaoId?: string; erro?: string }> {
    await delay(1500); // Simula chamada para gateway

    const sessao = MOCK_SESSOES.get(sessaoId);
    if (!sessao) throw new Error('SESSAO_INEXISTENTE');

    // Validar cartão completo
    const validacao = validarCartaoCompleto(dados);
    if (!validacao.valido) {
      return { autorizado: false, erro: validacao.erros.join('; ') };
    }

    // Simular aprovação (90% sucesso)
    const autorizado = Math.random() > 0.1;

    if (autorizado) {
      const transacaoId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await this.atualizarStatusSessao(sessaoId, 'aprovado', { ...dados, numero: `**** **** **** ${dados.numero.replace(/\D/g, '').slice(-4)}` } as Partial<DadosPagamentoCartao>);
      return { autorizado: true, transacaoId };
    } else {
      await this.atualizarStatusSessao(sessaoId, 'recusado');
      return { autorizado: false, erro: 'Transação recusada pela operadora' };
    }
  }

  async processarBoleto(sessaoId: string): Promise<DadosPagamentoBoleto> {
    await delay(800);

    const sessao = MOCK_SESSOES.get(sessaoId);
    if (!sessao) throw new Error('SESSAO_INEXISTENTE');

    const vencimento = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const codigoBarras = this.gerarCodigoBarrasMock(sessao.total);
    const linhaDigitavel = this.gerarLinhaDigitavelMock(codigoBarras);

    const dadosBoleto: DadosPagamentoBoleto = {
      codigoBarras,
      linhaDigitavel,
      urlBoleto: `https://api.corterapido.com/boletos/${sessaoId}.pdf`,
      vencimento,
      valor: sessao.total,
    };

    await this.atualizarStatusSessao(sessaoId, 'pendente', dadosBoleto);
    return dadosBoleto;
  }

  gerarChaveIdempotencia(acao: string, entidadeId: string): string {
    return gerarIdempotencyKey(acao, entidadeId);
  }

  async validarChaveIdempotencia(chave: string, acao: string, entidadeId: string): Promise<{ valido: boolean; erro?: string }> {
    await delay(50);

    const validacao = validarIdempotencyKey(chave, acao, entidadeId);
    if (!validacao.valido) return validacao;

    if (MOCK_IDEMPOTENCIA.has(chave)) {
      return { valido: false, erro: ERRO_CODIGOS.IDEMPOTENCIA_JA_USADA };
    }

    return { valido: true };
  }

  async registrarUsoIdempotencia(chave: string): Promise<void> {
    await delay(50);
    MOCK_IDEMPOTENCIA.add(chave);
  }

  calcularParcelas = calcularParcelas;
  formatarMoeda = formatarMoeda;
  identificarBandeira = identificarBandeira;
  formatarCartao = formatarCartao;
  formatarValidade = formatarValidade;
  formatarCPF_CNPJ = formatarCPF_CNPJ;

  // ============================================
  // HELPERS PRIVADOS (MOCK)
  // ============================================

  private gerarPayloadPixEMVCo(valor: number, chave: string): string {
    // Payload EMVCo simplificado para mock
    const valorFormatado = (valor / 100).toFixed(2);
    const merchantAccountInfo = `0014BR.GOV.BCB.PIX01${chave.length.toString().padStart(2, '0')}${chave}`;
    const payload = `00020126${merchantAccountInfo.length.toString().padStart(2, '0')}${merchantAccountInfo}52040000530398654${valorFormatado.length.toString().padStart(2, '0')}${valorFormatado}5802BR5913Corte Rapido6009SAO PAULO62070503***6304`;
    // CRC16 seria calculado aqui em produção
    return payload + '1234'; // CRC mock
  }

  private gerarQRCodeSVG(payload: string): string {
    // SVG simples representando QR code (em produção usaria biblioteca)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" font-size="10" fill="black">QR Code Pix\n${payload.substring(0, 50)}...</text></svg>`;
  }

  private gerarCodigoBarrasMock(valor: number): string {
    // 44 dígitos padrão Febraban
    const base = '34191790000000000000000000000000000000000000';
    return base.substring(0, 44 - valor.toString().length) + valor.toString().padStart(10, '0');
  }

  private gerarLinhaDigitavelMock(codigoBarras: string): string {
    // Formatação simplificada da linha digitável
    return `${codigoBarras.slice(0, 5)}.${codigoBarras.slice(5, 10)} ${codigoBarras.slice(10, 15)}.${codigoBarras.slice(15, 21)} ${codigoBarras.slice(21, 26)}.${codigoBarras.slice(26, 32)} ${codigoBarras.slice(32)} ${codigoBarras.slice(33, 44)}`;
  }
}

// ============================================
// FACTORY / SINGLETON
// ============================================

let serviceInstance: ICheckoutService | null = null;

export function createCheckoutService(): ICheckoutService {
  if (!serviceInstance) {
    serviceInstance = new CheckoutService();
  }
  return serviceInstance;
}

export function getCheckoutService(): ICheckoutService {
  if (!serviceInstance) {
    serviceInstance = new CheckoutService();
  }
  return serviceInstance;
}

export function resetCheckoutService(): void {
  serviceInstance = null;
  MOCK_SESSOES.clear();
  MOCK_IDEMPOTENCIA.clear();
}