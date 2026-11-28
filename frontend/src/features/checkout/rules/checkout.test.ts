/**
 * Testes de Boundary TDD - Regras puras do domínio Checkout.
 * Cobertura: Luhn, CPF/CNPJ, Pix, Idempotência, parcelas, edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  validarLuhn,
  validarNumeroCartao,
  validarValidadeCartao,
  validarCVV,
  validarNomeTitular,
  validarCartaoCompleto,
  validarCPF,
  validarCNPJ,
  validarCPF_CNPJ,
  validarChavePix,
  validarQRCodePix,
  calcularTotaisCheckout,
  validarItensCheckout,
  validarIdempotencyKey,
  criarSessaoCheckout,
  identificarBandeira,
  formatarCartao,
  formatarValidade,
  formatarCPF_CNPJ,
  calcularParcelas,
  gerarIdempotencyKey,
  formatarMoeda,
  ERRO_CODIGOS,
} from '../rules';

import type {
  ItemCheckout,
  DadosPagamentoCartao,
} from '../types';

// ============================================
// TESTES: ALGORITMO LUHN
// ============================================

describe('validarLuhn', () => {
  it('deve validar cartões Visa válidos', () => {
    // Visa test numbers que passam no Luhn
    expect(validarLuhn('4111111111111111')).toBe(true);
    expect(validarLuhn('4000000000000002')).toBe(true);
    expect(validarLuhn('4242424242424242')).toBe(true);
  });

  it('deve validar cartões Mastercard válidos', () => {
    expect(validarLuhn('5555555555554444')).toBe(true);
    expect(validarLuhn('5105105105105100')).toBe(true);
  });

  it('deve validar cartões Amex válidos', () => {
    expect(validarLuhn('378282246310005')).toBe(true);
    expect(validarLuhn('371449635398431')).toBe(true);
  });

  it('deve rejeitar números com Luhn inválido', () => {
    expect(validarLuhn('4111111111111112')).toBe(false); // último dígito errado
    expect(validarLuhn('5555555555554445')).toBe(false);
    expect(validarLuhn('1234567890123456')).toBe(false);
  });

  it('deve rejeitar números muito curtos', () => {
    expect(validarLuhn('123')).toBe(false);
    expect(validarLuhn('411111111111')).toBe(false); // 12 dígitos
  });

  it('deve rejeitar números muito longos', () => {
    expect(validarLuhn('41111111111111111111')).toBe(false); // 20 dígitos
  });

  it('deve ignorar caracteres não numéricos', () => {
    expect(validarLuhn('4111 1111 1111 1111')).toBe(true);
    expect(validarLuhn('4111-1111-1111-1111')).toBe(true);
  });

  it('deve rejeitar strings vazias', () => {
    expect(validarLuhn('')).toBe(false);
    expect(validarLuhn('abc')).toBe(false);
  });
});

// ============================================
// TESTES: VALIDAÇÃO COMPLETA DE CARTÃO
// ============================================

describe('validarNumeroCartao', () => {
  it('deve aceitar Visa válido', () => {
    const resultado = validarNumeroCartao('4111 1111 1111 1111');
    expect(resultado.valido).toBe(true);
    expect(resultado.bandeira).toBe('visa');
    expect(resultado.erros).toHaveLength(0);
  });

  it('deve aceitar Mastercard válido', () => {
    const resultado = validarNumeroCartao('5555 5555 5555 4444');
    expect(resultado.valido).toBe(true);
    expect(resultado.bandeira).toBe('mastercard');
  });

  it('deve aceitar Amex válido', () => {
    const resultado = validarNumeroCartao('3782 8224 6310 005');
    expect(resultado.valido).toBe(true);
    expect(resultado.bandeira).toBe('amex');
  });

  it('deve aceitar Elo válido', () => {
    const resultado = validarNumeroCartao('4011 7800 0000 0000');
    expect(resultado.valido).toBe(true);
    expect(resultado.bandeira).toBe('elo');
  });

  it('deve rejeitar número com Luhn inválido', () => {
    const resultado = validarNumeroCartao('4111 1111 1111 1112');
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain('Número do cartão inválido (falha na validação Luhn)');
  });

  it('deve rejeitar número muito curto', () => {
    const resultado = validarNumeroCartao('1234');
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain('Número do cartão deve ter entre 13 e 19 dígitos');
  });

  it('deve rejeitar bandeira não suportada', () => {
    const resultado = validarNumeroCartao('6222 2222 2222 2222'); // UnionPay não suportado
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain('Bandeira do cartão não suportada');
  });

  it('deve rejeitar string vazia', () => {
    const resultado = validarNumeroCartao('');
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain('Número do cartão é obrigatório');
  });
});

describe('validarValidadeCartao', () => {
  it('deve aceitar validade futura', () => {
    const anoFuturo = new Date().getFullYear() + 2;
    const resultado = validarValidadeCartao(`12/${String(anoFuturo).slice(-2)}`);
    expect(resultado.valido).toBe(true);
  });

  it('deve aceitar mês atual se ano futuro', () => {
    const mesAtual = new Date().getMonth() + 1;
    const anoFuturo = new Date().getFullYear() + 1;
    const resultado = validarValidadeCartao(`${String(mesAtual).padStart(2, '0')}/${String(anoFuturo).slice(-2)}`);
    expect(resultado.valido).toBe(true);
  });

  it('deve rejeitar mês inválido (00)', () => {
    const resultado = validarValidadeCartao('00/25');
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Mês inválido (01-12)');
  });

  it('deve rejeitar mês inválido (13)', () => {
    const resultado = validarValidadeCartao('13/25');
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Mês inválido (01-12)');
  });

  it('deve rejeitar cartão expirado', () => {
    const anoPassado = new Date().getFullYear() - 1;
    const resultado = validarValidadeCartao(`12/${String(anoPassado).slice(-2)}`);
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Cartão expirado');
  });

  it('deve rejeitar formato inválido', () => {
    expect(validarValidadeCartao('123').valido).toBe(false);
    expect(validarValidadeCartao('12/3').valido).toBe(false);
    expect(validarValidadeCartao('aa/bb').valido).toBe(false);
  });

  it('deve rejeitar ano muito futuro', () => {
    const anoMuitoFuturo = new Date().getFullYear() + 25;
    const resultado = validarValidadeCartao(`12/${String(anoMuitoFuturo).slice(-2)}`);
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Ano de validade inválido');
  });
});

describe('validarCVV', () => {
  it('deve aceitar CVV de 3 dígitos para Visa/Mastercard', () => {
    expect(validarCVV('123', 'visa').valido).toBe(true);
    expect(validarCVV('123', 'mastercard').valido).toBe(true);
    expect(validarCVV('123', 'elo').valido).toBe(true);
  });

  it('deve aceitar CVV de 4 dígitos para Amex', () => {
    expect(validarCVV('1234', 'amex').valido).toBe(true);
  });

  it('deve rejeitar CVV com tamanho errado', () => {
    expect(validarCVV('12', 'visa').valido).toBe(false);
    expect(validarCVV('1234', 'visa').valido).toBe(false);
    expect(validarCVV('123', 'amex').valido).toBe(false);
    expect(validarCVV('12345', 'amex').valido).toBe(false);
  });

  it('deve rejeitar CVV vazio', () => {
    expect(validarCVV('', 'visa').valido).toBe(false);
    expect(validarCVV('', 'visa').erro).toBe('CVV é obrigatório');
  });

  it('deve ignorar caracteres não numéricos', () => {
    expect(validarCVV('1 2 3', 'visa').valido).toBe(true);
  });
});

describe('validarNomeTitular', () => {
  it('deve aceitar nome completo válido', () => {
    const resultado = validarNomeTitular('JOÃO DA SILVA');
    expect(resultado.valido).toBe(true);
  });

  it('deve aceitar nome com acentos', () => {
    expect(validarNomeTitular('MARÍA JOSÉ SANTOS').valido).toBe(true);
    expect(validarNomeTitular('JOSÉ RIBEIRÃO').valido).toBe(true);
  });

  it('deve rejeitar nome vazio', () => {
    const resultado = validarNomeTitular('');
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Nome do titular é obrigatório');
  });

  it('deve rejeitar nome muito curto', () => {
    expect(validarNomeTitular('AB').valido).toBe(false);
  });

  it('deve rejeitar apenas primeiro nome', () => {
    const resultado = validarNomeTitular('JOÃO');
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Informe nome completo');
  });

  it('deve rejeitar números e caracteres especiais', () => {
    expect(validarNomeTitular('JOÃO 123').valido).toBe(false);
    expect(validarNomeTitular('JOÃO@SILVA').valido).toBe(false);
  });

  it('deve ignorar espaços extras', () => {
    expect(validarNomeTitular('  JOÃO   DA   SILVA  ').valido).toBe(true);
  });
});

describe('validarCartaoCompleto', () => {
  const cartaoValido: Partial<DadosPagamentoCartao> = {
    numero: '4111 1111 1111 1111',
    nomeTitular: 'JOÃO DA SILVA',
    validade: '12/25',
    cvv: '123',
  };

  it('deve validar cartão completo correto', () => {
    const resultado = validarCartaoCompleto(cartaoValido);
    expect(resultado.valido).toBe(true);
    expect(resultado.bandeira).toBe('visa');
    expect(resultado.erros).toHaveLength(0);
  });

  it('deve acumular erros de múltiplos campos', () => {
    const resultado = validarCartaoCompleto({});
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.length).toBe(4); // numero, validade, cvv, nomeTitular
  });

  it('deve reportar erro específico de número inválido', () => {
    const resultado = validarCartaoCompleto({ ...cartaoValido, numero: '1234' });
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.includes('Número do cartão'))).toBe(true);
  });

  it('deve reportar erro específico de validade expirada', () => {
    const resultado = validarCartaoCompleto({ ...cartaoValido, validade: '12/20' });
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.includes('expirado'))).toBe(true);
  });
});

// ============================================
// TESTES: CPF/CNPJ
// ============================================

describe('validarCPF', () => {
  it('deve aceitar CPF válido', () => {
    // CPFs de teste conhecidos
    expect(validarCPF('11144477735').valido).toBe(true);
    expect(validarCPF('123.456.789-09').valido).toBe(true); // CPF formato
  });

  it('deve rejeitar CPF com dígitos verificadores errados', () => {
    expect(validarCPF('11144477736').valido).toBe(false);
    expect(validarCPF('12345678900').valido).toBe(false);
  });

  it('deve rejeitar CPF com dígitos repetidos', () => {
    expect(validarCPF('11111111111').valido).toBe(false);
    expect(validarCPF('00000000000').valido).toBe(false);
  });

  it('deve rejeitar CPF com tamanho errado', () => {
    expect(validarCPF('123').valido).toBe(false);
    expect(validarCPF('123456789012').valido).toBe(false);
  });

  it('deve retornar formatado', () => {
    const resultado = validarCPF('12345678909');
    expect(resultado.formatado).toBe('123.456.789-09');
  });

  it('deve rejeitar CPF com caracteres não numéricos', () => {
    expect(validarCPF('123.456.789-0A').valido).toBe(false);
  });
});

describe('validarCNPJ', () => {
  it('deve aceitar CNPJ válido', () => {
    expect(validarCNPJ('11222333000181').valido).toBe(true);
    expect(validarCNPJ('11.222.333/0001-81').valido).toBe(true);
  });

  it('deve rejeitar CNPJ com dígitos errados', () => {
    expect(validarCNPJ('11222333000182').valido).toBe(false);
  });

  it('deve rejeitar CNPJ com dígitos repetidos', () => {
    expect(validarCNPJ('11111111111111').valido).toBe(false);
  });

  it('deve rejeitar CNPJ com tamanho errado', () => {
    expect(validarCNPJ('123').valido).toBe(false);
    expect(validarCNPJ('123456789012345').valido).toBe(false);
  });

  it('deve retornar formatado', () => {
    const resultado = validarCNPJ('11222333000181');
    expect(resultado.formatado).toBe('11.222.333/0001-81');
  });
});

describe('validarCPF_CNPJ', () => {
  it('deve detectar CPF automaticamente', () => {
    const resultado = validarCPF_CNPJ('12345678909');
    expect(resultado.tipo).toBe('cpf');
    expect(resultado.valido).toBe(true);
  });

  it('deve detectar CNPJ automaticamente', () => {
    const resultado = validarCPF_CNPJ('11222333000181');
    expect(resultado.tipo).toBe('cnpj');
    expect(resultado.valido).toBe(true);
  });

  it('deve formatar CPF', () => {
    const resultado = validarCPF_CNPJ('12345678909');
    expect(resultado.formatado).toBe('123.456.789-09');
  });

  it('deve formatar CNPJ', () => {
    const resultado = validarCPF_CNPJ('11222333000181');
    expect(resultado.formatado).toBe('11.222.333/0001-81');
  });
});

// ============================================
// TESTES: PIX
// ============================================

describe('validarChavePix', () => {
  it('deve aceitar CPF como chave', () => {
    const resultado = validarChavePix('12345678909');
    expect(resultado.valido).toBe(true);
    expect(resultado.tipo).toBe('cpf');
  });

  it('deve aceitar CNPJ como chave', () => {
    const resultado = validarChavePix('11222333000181');
    expect(resultado.valido).toBe(true);
    expect(resultado.tipo).toBe('cnpj');
  });

  it('deve aceitar email como chave', () => {
    const resultado = validarChavePix('usuario@email.com');
    expect(resultado.valido).toBe(true);
    expect(resultado.tipo).toBe('email');
  });

  it('deve aceitar telefone como chave', () => {
    const resultado = validarChavePix('+5511999999999');
    expect(resultado.valido).toBe(true);
    expect(resultado.tipo).toBe('telefone');
  });

  it('deve aceitar chave aleatória (UUID)', () => {
    const resultado = validarChavePix('123e4567-e89b-12d3-a456-426614174000');
    expect(resultado.valido).toBe(true);
    expect(resultado.tipo).toBe('aleatoria');
  });

  it('deve rejeitar chave vazia', () => {
    const resultado = validarChavePix('');
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Chave Pix é obrigatória');
  });

  it('deve rejeitar formato inválido', () => {
    const resultado = validarChavePix('chave-invalida');
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Formato de chave Pix inválido');
  });

  it('deve ignorar espaços', () => {
    expect(validarChavePix('  12345678909  ').valido).toBe(true);
  });
});

describe('validarQRCodePix', () => {
  it('deve aceitar QR Code EMVCo válido', () => {
    const resultado = validarQRCodePix('00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540410.005802BR5913Corte Rapido6009SAO PAULO62070503***63041234', new Date(Date.now() + 3600000).toISOString());
    expect(resultado.valido).toBe(true);
  });

  it('deve rejeitar QR Code sem prefixo EMVCo', () => {
    const resultado = validarQRCodePix('invalido', new Date(Date.now() + 3600000).toISOString());
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('QR Code não segue padrão EMVCo');
  });

  it('deve rejeitar QR Code muito curto', () => {
    const resultado = validarQRCodePix('000201', new Date(Date.now() + 3600000).toISOString());
    expect(resultado.valido).toBe(false);
  });

  it('deve rejeitar QR Code expirado', () => {
    const resultado = validarQRCodePix('00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540410.005802BR5913Corte Rapido6009SAO PAULO62070503***63041234', new Date(Date.now() - 3600000).toISOString());
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('QR Code expirado');
  });
});

// ============================================
// TESTES: CÁLCULOS DE CHECKOUT
// ============================================

describe('calcularTotaisCheckout', () => {
  const itens: ItemCheckout[] = [
    { id: '1', descricao: 'Plano Profissional', quantidade: 1, valorUnitario: 14900, valorTotal: 14900 },
    { id: '2', descricao: 'Adicional SMS', quantidade: 2, valorUnitario: 500, valorTotal: 1000 },
  ];

  it('deve calcular subtotal correto', () => {
    const resultado = calcularTotaisCheckout(itens, 0);
    expect(resultado.subtotal).toBe(15900);
    expect(resultado.desconto).toBe(0);
    expect(resultado.total).toBe(15900);
  });

  it('deve aplicar desconto', () => {
    const resultado = calcularTotaisCheckout(itens, 2000);
    expect(resultado.subtotal).toBe(15900);
    expect(resultado.desconto).toBe(2000);
    expect(resultado.total).toBe(13900);
  });

  it('não deve permitir desconto maior que subtotal', () => {
    const resultado = calcularTotaisCheckout(itens, 20000);
    expect(resultado.desconto).toBe(15900);
    expect(resultado.total).toBe(0);
  });

  it('deve lidar com itens vazios', () => {
    const resultado = calcularTotaisCheckout([], 1000);
    expect(resultado.subtotal).toBe(0);
    expect(resultado.desconto).toBe(0);
    expect(resultado.total).toBe(0);
  });
});

describe('validarItensCheckout', () => {
  it('deve aceitar itens válidos', () => {
    const itens: ItemCheckout[] = [
      { id: '1', descricao: 'Item 1', quantidade: 1, valorUnitario: 1000, valorTotal: 1000 },
    ];
    const resultado = validarItensCheckout(itens);
    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toHaveLength(0);
  });

  it('deve rejeitar array vazio', () => {
    const resultado = validarItensCheckout([]);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain('Nenhum item no checkout');
  });

  it('deve rejeitar item sem descrição', () => {
    const itens: ItemCheckout[] = [
      { id: '1', descricao: '', quantidade: 1, valorUnitario: 1000, valorTotal: 1000 },
    ];
    const resultado = validarItensCheckout(itens);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.includes('descrição'))).toBe(true);
  });

  it('deve rejeitar quantidade zero ou negativa', () => {
    const itens: ItemCheckout[] = [
      { id: '1', descricao: 'Item', quantidade: 0, valorUnitario: 1000, valorTotal: 0 },
    ];
    const resultado = validarItensCheckout(itens);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.includes('quantidade'))).toBe(true);
  });

  it('deve rejeitar valor unitário negativo', () => {
    const itens: ItemCheckout[] = [
      { id: '1', descricao: 'Item', quantidade: 1, valorUnitario: -100, valorTotal: -100 },
    ];
    const resultado = validarItensCheckout(itens);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.includes('negativo'))).toBe(true);
  });

  it('deve rejeitar valor total inconsistente', () => {
    const itens: ItemCheckout[] = [
      { id: '1', descricao: 'Item', quantidade: 2, valorUnitario: 1000, valorTotal: 1500 }, // deveria ser 2000
    ];
    const resultado = validarItensCheckout(itens);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.includes('não confere'))).toBe(true);
  });
});

// ============================================
// TESTES: IDEMPOTÊNCIA
// ============================================

describe('validarIdempotencyKey', () => {
  const chaveValida = 'idem_checkout_sessao123_1700000000000_abc123';

  it('deve aceitar chave válida', () => {
    const resultado = validarIdempotencyKey(chaveValida, 'checkout', 'sessao123');
    expect(resultado.valido).toBe(true);
  });

  it('deve rejeitar chave vazia', () => {
    const resultado = validarIdempotencyKey('', 'checkout', 'sessao123');
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Chave de idempotência é obrigatória');
  });

  it('deve rejeitar formato inválido', () => {
    const resultado = validarIdempotencyKey('invalido', 'checkout', 'sessao123');
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Formato de chave de idempotência inválido');
  });

  it('deve rejeitar ação diferente', () => {
    const resultado = validarIdempotencyKey(chaveValida, 'pagamento', 'sessao123');
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Ação da chave de idempotência não confere');
  });

  it('deve rejeitar entidade diferente', () => {
    const resultado = validarIdempotencyKey(chaveValida, 'checkout', 'outra_sessao');
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Entidade da chave de idempotência não confere');
  });

  it('deve rejeitar chave expirada (24h)', () => {
    const timestampAntigo = Date.now() - 25 * 60 * 60 * 1000; // 25 horas atrás
    const chaveAntiga = `idem_checkout_sessao123_${timestampAntigo}_abc123`;
    const resultado = validarIdempotencyKey(chaveAntiga, 'checkout', 'sessao123');
    expect(resultado.valido).toBe(false);
    expect(resultado.erro).toBe('Chave de idempotência expirada');
  });
});

describe('criarSessaoCheckout', () => {
  const itens: ItemCheckout[] = [
    { id: '1', descricao: 'Plano', quantidade: 1, valorUnitario: 14900, valorTotal: 14900 },
  ];

  it('deve criar sessão com dados corretos', () => {
    const sessao = criarSessaoCheckout(itens, 'pix', 0, { origem: 'web' });

    expect(sessao.id).toMatch(/^idem_checkout_/);
    expect(sessao.status).toBe('pendente');
    expect(sessao.metodo).toBe('pix');
    expect(sessao.itens).toEqual(itens);
    expect(sessao.subtotal).toBe(14900);
    expect(sessao.total).toBe(14900);
    expect(sessao.metadata?.origem).toBe('web');
    expect(sessao.dataCriacao).toBeDefined();
    expect(sessao.dataExpiracao).toBeDefined();
  });

  it('deve aplicar desconto na sessão', () => {
    const sessao = criarSessaoCheckout(itens, 'cartao', 2000);
    expect(sessao.desconto).toBe(2000);
    expect(sessao.total).toBe(12900);
  });

  it('deve definir expiração para ~30 minutos', () => {
    const sessao = criarSessaoCheckout(itens, 'pix', 0);
    const criacao = new Date(sessao.dataCriacao).getTime();
    const expiracao = new Date(sessao.dataExpiracao).getTime();
    const diffMinutos = (expiracao - criacao) / (1000 * 60);
    expect(diffMinutos).toBeCloseTo(30, 0);
  });
});

// ============================================
// TESTES: FORMATAÇÃO E UTILITÁRIOS
// ============================================

describe('identificarBandeira', () => {
  it('deve identificar Visa', () => {
    expect(identificarBandeira('4111111111111111')).toBe('visa');
    expect(identificarBandeira('4000000000000002')).toBe('visa');
  });

  it('deve identificar Mastercard', () => {
    expect(identificarBandeira('5555555555554444')).toBe('mastercard');
    expect(identificarBandeira('5105105105105100')).toBe('mastercard');
  });

  it('deve identificar Amex', () => {
    expect(identificarBandeira('378282246310005')).toBe('amex');
    expect(identificarBandeira('371449635398431')).toBe('amex');
  });

  it('deve identificar Elo', () => {
    expect(identificarBandeira('4011780000000000')).toBe('elo');
    expect(identificarBandeira('4312740000000000')).toBe('elo');
  });

  it('deve identificar Hipercard', () => {
    expect(identificarBandeira('6062820000000000')).toBe('hipercard');
    expect(identificarBandeira('3841000000000000')).toBe('hipercard');
  });

  it('deve retornar desconhecida para outras', () => {
    expect(identificarBandeira('6222222222222222')).toBe('desconhecida'); // UnionPay
    expect(identificarBandeira('1234567890123456')).toBe('desconhecida');
  });
});

describe('formatarCartao', () => {
  it('deve formatar Visa/Mastercard/Elo em grupos de 4', () => {
    expect(formatarCartao('4111111111111111')).toBe('4111 1111 1111 1111');
    expect(formatarCartao('5555555555554444')).toBe('5555 5555 5555 4444');
  });

  it('deve formatar Amex em 4-6-5', () => {
    expect(formatarCartao('378282246310005')).toBe('3782 822463 10005');
  });

  it('deve ignorar caracteres não numéricos', () => {
    expect(formatarCartao('4111 1111 1111 1111')).toBe('4111 1111 1111 1111');
    expect(formatarCartao('4111-1111-1111-1111')).toBe('4111 1111 1111 1111');
  });
});

describe('formatarValidade', () => {
  it('deve formatar MM/AA', () => {
    expect(formatarValidade('1225')).toBe('12/25');
    expect(formatarValidade('12/25')).toBe('12/25');
    expect(formatarValidade('1 2 2 5')).toBe('12/25');
  });

  it('deve lidar com entrada parcial', () => {
    expect(formatarValidade('1')).toBe('1');
    expect(formatarValidade('12')).toBe('12/');
    expect(formatarValidade('123')).toBe('12/3');
  });
});

describe('formatarCPF_CNPJ', () => {
  it('deve formatar CPF', () => {
    expect(formatarCPF_CNPJ('12345678909')).toBe('123.456.789-09');
    expect(formatarCPF_CNPJ('123.456.789-09')).toBe('123.456.789-09');
  });

  it('deve formatar CNPJ', () => {
    expect(formatarCPF_CNPJ('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatarCPF_CNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81');
  });

  it('deve lidar com entrada parcial', () => {
    expect(formatarCPF_CNPJ('123')).toBe('123');
    expect(formatarCPF_CNPJ('12345678')).toBe('123.456.78');
    expect(formatarCPF_CNPJ('11222333')).toBe('11.222.333');
  });
});

describe('calcularParcelas', () => {
  it('deve calcular parcelas sem juros até 12x', () => {
    const parcelas = calcularParcelas(120000, 12); // R$ 1.200,00

    expect(parcelas).toHaveLength(12);
    expect(parcelas[0]).toEqual({ numero: 1, valor: 120000, total: 120000, comJuros: false });
    expect(parcelas[11]).toEqual({ numero: 12, valor: 10000, total: 120000, comJuros: false });
  });

  it('deve calcular parcelas com juros acima de 12x', () => {
    const parcelas = calcularParcelas(120000, 18);

    expect(parcelas).toHaveLength(18);
    expect(parcelas[11].comJuros).toBe(false); // 12x sem juros
    expect(parcelas[12].comJuros).toBe(true);  // 13x com juros
    expect(parcelas[17].comJuros).toBe(true);  // 18x com juros
  });

  it('deve usar maxParcelas padrão (12) se não informado', () => {
    const parcelas = calcularParcelas(100000);
    expect(parcelas).toHaveLength(12);
  });

  it('deve arredondar valores corretamente', () => {
    const parcelas = calcularParcelas(10000, 3); // R$ 100,00 / 3
    expect(parcelas[0].valor).toBe(3334); // 10000/3 = 3333.33 -> 3334
    expect(parcelas[0].total).toBe(10002); // 3334 * 3
  });
});

describe('gerarIdempotencyKey', () => {
  it('deve gerar chave única', () => {
    const chave1 = gerarIdempotencyKey('checkout', 'sessao1');
    const chave2 = gerarIdempotencyKey('checkout', 'sessao1');

    expect(chave1).toMatch(/^idem_checkout_sessao1_\d+_[a-z0-9]+$/);
    expect(chave2).toMatch(/^idem_checkout_sessao1_\d+_[a-z0-9]+$/);
    expect(chave1).not.toBe(chave2);
  });
});

describe('formatarMoeda', () => {
  it('deve formatar centavos para BRL', () => {
    expect(formatarMoeda(0)).toBe('R$ 0,00');
    expect(formatarMoeda(100)).toBe('R$ 1,00');
    expect(formatarMoeda(14900)).toBe('R$ 149,00');
    expect(formatarMoeda(143040)).toBe('R$ 1.430,40');
    expect(formatarMoeda(1999900)).toBe('R$ 19.999,00');
  });

  it('deve lidar com valores negativos', () => {
    expect(formatarMoeda(-100)).toBe('-R$ 1,00');
  });
});

// ============================================
// TESTES: CÓDIGOS DE ERRO
// ============================================

describe('ERRO_CODIGOS', () => {
  it('deve ter todos os códigos de erro definidos', () => {
    expect(ERRO_CODIGOS.CARTAO_NUMERO_INVALIDO).toBe('CARTAO_NUMERO_INVALIDO');
    expect(ERRO_CODIGOS.CARTAO_LUHN_INVALIDO).toBe('CARTAO_LUHN_INVALIDO');
    expect(ERRO_CODIGOS.CPF_CNPJ_INVALIDO).toBe('CPF_CNPJ_INVALIDO');
    expect(ERRO_CODIGOS.PIX_CHAVE_INVALIDA).toBe('PIX_CHAVE_INVALIDA');
    expect(ERRO_CODIGOS.IDEMPOTENCIA_EXPIRADA).toBe('IDEMPOTENCIA_EXPIRADA');
    expect(ERRO_CODIGOS.IDEMPOTENCIA_JA_USADA).toBe('IDEMPOTENCIA_JA_USADA');
  });
});