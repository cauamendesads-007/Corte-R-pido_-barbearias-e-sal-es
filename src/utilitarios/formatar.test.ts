/**
 * Testes para utilitários de formatação
 * Cobertura: 100% das funções exportadas
 */

import {
  formatarMoeda,
  formatarData,
  formatarDataHora,
  formatarHora,
  formatarTempoRelativo,
  formatarNumeroCurto,
  formatarWhatsapp,
  validarWhatsapp,
  formatarCpf,
  validarCpf,
  formatarCep,
  gerarSlug,
  extrairIniciais,
  truncarTexto,
  capitalizarPalavras,
  removerAcentos,
  formatarDataCurta,
  calcularDistanciaKm,
  gerarId,
  atrasar,
  clonarProfundo,
  estaVazio,
  formatarDuracao,
  corTextoContrastante,
} from './formatar';

describe('formatarMoeda', () => {
  it('formata valor em reais', () => {
    expect(formatarMoeda(40)).toBe('R$ 40,00');
    expect(formatarMoeda(40.5)).toBe('R$ 40,50');
    expect(formatarMoeda(1234.56)).toBe('R$ 1.234,56');
  });

  it('formata valor em centavos quando emCentavos=true', () => {
    expect(formatarMoeda(4000, true)).toBe('R$ 40,00');
    expect(formatarMoeda(4050, true)).toBe('R$ 40,50');
  });

  it('trata zero', () => {
    expect(formatarMoeda(0)).toBe('R$ 0,00');
  });

  it('trata valores negativos', () => {
    expect(formatarMoeda(-50)).toBe('-R$ 50,00');
  });
});

describe('formatarData', () => {
  it('formata string YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatarData('2024-01-15')).toBe('15/01/2024');
    expect(formatarData('2024-12-31')).toBe('31/12/2024');
  });

  it('formata objeto Date para DD/MM/YYYY', () => {
    expect(formatarData(new Date('2024-01-15T00:00:00'))).toBe('15/01/2024');
  });

  it('trata dia e mês com zero à esquerda', () => {
    expect(formatarData('2024-01-05')).toBe('05/01/2024');
    expect(formatarData('2024-09-15')).toBe('15/09/2024');
  });
});

describe('formatarDataHora', () => {
  it('formata string ISO para DD/MM/YYYY às HH:MM', () => {
    expect(formatarDataHora('2024-01-15T14:30:00')).toBe('15/01/2024 às 14:30');
  });

  it('formata objeto Date', () => {
    expect(formatarDataHora(new Date('2024-01-15T14:30:00'))).toBe('15/01/2024 às 14:30');
  });
});

describe('formatarHora', () => {
  it('formata apenas hora HH:MM', () => {
    expect(formatarHora('2024-01-15T14:30:00')).toBe('14:30');
    expect(formatarHora(new Date('2024-01-15T09:05:00'))).toBe('09:05');
  });
});

describe('formatarTempoRelativo', () => {
  const agora = Date.now();

  it('retorna "agora" para menos de 1 minuto', () => {
    expect(formatarTempoRelativo(agora)).toBe('agora');
    expect(formatarTempoRelativo(agora - 30000)).toBe('agora');
  });

  it('retorna minutos para menos de 1 hora', () => {
    expect(formatarTempoRelativo(agora - 5 * 60000)).toBe('5 min');
    expect(formatarTempoRelativo(agora - 59 * 60000)).toBe('59 min');
  });

  it('retorna horas para menos de 24 horas', () => {
    expect(formatarTempoRelativo(agora - 2 * 3600000)).toBe('2 h');
    expect(formatarTempoRelativo(agora - 23 * 3600000)).toBe('23 h');
  });

  it('retorna dias para mais de 24 horas', () => {
    expect(formatarTempoRelativo(agora - 2 * 86400000)).toBe('2 d');
    expect(formatarTempoRelativo(agora - 10 * 86400000)).toBe('10 d');
  });
});

describe('formatarNumeroCurto', () => {
  it('formata milhões', () => {
    expect(formatarNumeroCurto(1500000)).toBe('1,5M');
    expect(formatarNumeroCurto(2300000)).toBe('2,3M');
  });

  it('formata milhares', () => {
    expect(formatarNumeroCurto(1500)).toBe('1,5k');
    expect(formatarNumeroCurto(9999)).toBe('10k');
  });

  it('retorna número normal para valores < 1000', () => {
    expect(formatarNumeroCurto(999)).toBe('999');
    expect(formatarNumeroCurto(0)).toBe('0');
  });
});

describe('formatarWhatsapp', () => {
  it('formata WhatsApp brasileiro', () => {
    expect(formatarWhatsapp('11999999999')).toBe('(11) 99999-9999');
    expect(formatarWhatsapp('11987654321')).toBe('(11) 98765-4321');
  });

  it('trata strings parciais', () => {
    expect(formatarWhatsapp('11')).toBe('(11');
    expect(formatarWhatsapp('119')).toBe('(11) 9');
    expect(formatarWhatsapp('1198765')).toBe('(11) 98765');
  });

  it('remove não-dígitos', () => {
    expect(formatarWhatsapp('(11) 99999-9999')).toBe('(11) 99999-9999');
    expect(formatarWhatsapp('+55 11 99999-9999')).toBe('(55) 11999-9999');
  });
});

describe('validarWhatsapp', () => {
  it('valida WhatsApp brasileiro correto', () => {
    expect(validarWhatsapp('(11) 99999-9999')).toBe(true);
    expect(validarWhatsapp('11999999999')).toBe(true);
    expect(validarWhatsapp('+55 11 99999-9999')).toBe(true);
  });

  it('rejeita WhatsApp inválido', () => {
    expect(validarWhatsapp('1199999999')).toBe(false); // 10 dígitos
    expect(validarWhatsapp('11899999999')).toBe(false); // não começa com 9
    expect(validarWhatsapp('123')).toBe(false);
    expect(validarWhatsapp('')).toBe(false);
  });
});

describe('formatarCpf', () => {
  it('formata CPF completo', () => {
    expect(formatarCpf('12345678901')).toBe('123.456.789-01');
  });

  it('trata CPF parcial', () => {
    expect(formatarCpf('123')).toBe('123');
    expect(formatarCpf('123456')).toBe('123.456');
    expect(formatarCpf('123456789')).toBe('123.456.789');
  });

  it('remove não-dígitos', () => {
    expect(formatarCpf('123.456.789-01')).toBe('123.456.789-01');
  });
});

describe('validarCpf', () => {
  it('valida CPF correto', () => {
    expect(validarCpf('123.456.789-09')).toBe(true); // CPF válido conhecido
    expect(validarCpf('529.982.247-25')).toBe(true);
  });

  it('rejeita CPF inválido', () => {
    expect(validarCpf('123.456.789-00')).toBe(false);
    expect(validarCpf('111.111.111-11')).toBe(false); // todos iguais
    expect(validarCpf('123')).toBe(false);
    expect(validarCpf('')).toBe(false);
  });
});

describe('formatarCep', () => {
  it('formata CEP completo', () => {
    expect(formatarCep('12345678')).toBe('12345-678');
  });

  it('trata CEP parcial', () => {
    expect(formatarCep('12345')).toBe('12345');
    expect(formatarCep('123')).toBe('123');
  });
});

describe('gerarSlug', () => {
  it('remove acentos e espaços', () => {
    expect(gerarSlug('Minha Barbearia')).toBe('minha-barbearia');
    expect(gerarSlug('Salão de Beleza')).toBe('salao-de-beleza');
  });

  it('remove caracteres especiais', () => {
    expect(gerarSlug('Barbearia @#$%')).toBe('barbearia');
    expect(gerarSlug('Corte & Barba')).toBe('corte-barba');
  });

  it('remove hífens no início/fim', () => {
    expect(gerarSlug('  Teste  ')).toBe('teste');
    expect(gerarSlug('---teste---')).toBe('teste');
  });

  it('converte para minúsculas', () => {
    expect(gerarSlug('MAIÚSCULAS')).toBe('maiusculas');
  });
});

describe('extrairIniciais', () => {
  it('extrai iniciais de nome completo', () => {
    expect(extrairIniciais('João Silva')).toBe('JS');
    expect(extrairIniciais('Maria da Silva')).toBe('MS');
    expect(extrairIniciais('José')).toBe('J');
  });

  it('ignora palavras curtas (preposições)', () => {
    expect(extrairIniciais('João da Silva')).toBe('JS');
    expect(extrairIniciais('Maria de Souza')).toBe('MS');
  });

  it('trata string vazia', () => {
    expect(extrairIniciais('')).toBe('');
  });
});

describe('truncarTexto', () => {
  it('retorna texto original se menor que máximo', () => {
    expect(truncarTexto('Curto', 10)).toBe('Curto');
  });

  it('trunca com reticências', () => {
    expect(truncarTexto('Texto muito longo', 10)).toBe('Texto m...');
    expect(truncarTexto('Exatamente dez', 14)).toBe('Exatamente dez');
  });

  it('trata limite mínimo', () => {
    expect(truncarTexto('A', 3)).toBe('A');
    expect(truncarTexto('AB', 3)).toBe('AB');
  });
});

describe('capitalizarPalavras', () => {
  it('capitaliza primeira letra de cada palavra', () => {
    expect(capitalizarPalavras('joão silva')).toBe('João Silva');
    expect(capitalizarPalavras('BARBEARIA DO ZÉ')).toBe('Barbearia Do Zé');
  });

  it('trata múltiplos espaços', () => {
    expect(capitalizarPalavras('  teste  caso  ')).toBe('  Teste  Caso  ');
  });
});

describe('removerAcentos', () => {
  it('remove todos os acentos', () => {
    expect(removerAcentos('áéíóúàèìòùãõâêîôûç')).toBe('aeiouaeiouaoaeiouc');
    expect(removerAcentos('São Paulo')).toBe('Sao Paulo');
  });

  it('mantém caracteres sem acento', () => {
    expect(removerAcentos('abc123')).toBe('abc123');
  });
});

describe('formatarDataCurta', () => {
  it('formata DD/MM', () => {
    expect(formatarDataCurta('2024-01-15')).toBe('15/01');
    expect(formatarDataCurta(new Date('2024-12-25T00:00:00'))).toBe('25/12');
  });
});

describe('calcularDistanciaKm', () => {
  it('calcula distância entre coordenadas', () => {
    // São Paulo -> Rio de Janeiro ≈ 360km
    const dist = calcularDistanciaKm(-23.5505, -46.6333, -22.9068, -43.1729);
    expect(dist).toBeGreaterThan(350);
    expect(dist).toBeLessThan(370);
  });

  it('retorna 0 para mesma coordenada', () => {
    expect(calcularDistanciaKm(-23.5505, -46.6333, -23.5505, -46.6333)).toBe(0);
  });
});

describe('gerarId', () => {
  it('gera ID único', () => {
    const id1 = gerarId();
    const id2 = gerarId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
  });
});

describe('atrasar', () => {
  it('resolve após tempo especificado', async () => {
    const inicio = Date.now();
    await atrasar(50);
    const fim = Date.now();
    expect(fim - inicio).toBeGreaterThanOrEqual(40);
  });
});

describe('clonarProfundo', () => {
  it('clona objeto simples', () => {
    const original = { a: 1, b: 'teste' };
    const clone = clonarProfundo(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
  });

  it('clona objeto aninhado', () => {
    const original = { a: { b: [1, 2, 3] } };
    const clone = clonarProfundo(original);
    expect(clone).toEqual(original);
    clone.a.b.push(4);
    expect(original.a.b).toHaveLength(3);
  });

  it('clona array', () => {
    const original = [1, 2, { a: 3 }];
    const clone = clonarProfundo(original);
    expect(clone).toEqual(original);
  });
});

describe('estaVazio', () => {
  it('retorna true para null/undefined', () => {
    expect(estaVazio(null)).toBe(true);
    expect(estaVazio(undefined)).toBe(true);
  });

  it('retorna true para string vazia', () => {
    expect(estaVazio('')).toBe(true);
    expect(estaVazio('   ')).toBe(true);
  });

  it('retorna true para array vazio', () => {
    expect(estaVazio([])).toBe(true);
  });

  it('retorna true para objeto vazio', () => {
    expect(estaVazio({})).toBe(true);
  });

  it('retorna false para valores preenchidos', () => {
    expect(estaVazio('texto')).toBe(false);
    expect(estaVazio([1])).toBe(false);
    expect(estaVazio({ a: 1 })).toBe(false);
    expect(estaVazio(0)).toBe(false);
    expect(estaVazio(false)).toBe(false);
  });
});

describe('formatarDuracao', () => {
  it('formata minutos', () => {
    expect(formatarDuracao(30)).toBe('30 min');
    expect(formatarDuracao(45)).toBe('45 min');
  });

  it('formata horas exatas', () => {
    expect(formatarDuracao(60)).toBe('1h');
    expect(formatarDuracao(120)).toBe('2h');
  });

  it('formata horas e minutos', () => {
    expect(formatarDuracao(90)).toBe('1h 30min');
    expect(formatarDuracao(135)).toBe('2h 15min');
  });
});

describe('corTextoContrastante', () => {
  it('retorna preto para fundos claros', () => {
    expect(corTextoContrastante('#FFFFFF')).toBe('#111827');
    expect(corTextoContrastante('#FFFF00')).toBe('#111827');
    expect(corTextoContrastante('#00FF00')).toBe('#111827');
  });

  it('retorna branco para fundos escuros', () => {
    expect(corTextoContrastante('#000000')).toBe('#ffffff');
    expect(corTextoContrastante('#0000FF')).toBe('#ffffff');
    expect(corTextoContrastante('#800000')).toBe('#ffffff');
  });
});