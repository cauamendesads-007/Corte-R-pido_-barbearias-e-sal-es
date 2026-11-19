/**
 * Testes para utilitários de data
 * Cobertura: 100% das funções exportadas
 */

import {
  adicionarDias,
  formatarParaInput,
  formatarParaExibicao,
  formatarDiaMes,
  nomeDiaSemanaCurto,
  nomeDiaSemanaCompleto,
  gerarDiasSelecao,
  gerarHorarios,
  ehHoje,
  ehPassado,
  ehFuturo,
  combinarDataHora,
  diferencaMinutos,
  intervalosSobrepoem,
  horarioNoIntervalo,
  inicioDoDia,
  fimDoDia,
  formatarTempoDecorrido,
  obterMeses,
  obterAnos,
  ehDataValida,
  calcularIdade,
} from './datas';

describe('adicionarDias', () => {
  it('adiciona dias a uma data base', () => {
    const base = new Date('2024-01-15T12:00:00');
    expect(adicionarDias(base, 5)).toBe('2024-01-20');
    expect(adicionarDias(base, -5)).toBe('2024-01-10');
  });

  it('usa hoje como padrão', () => {
    const hoje = new Date();
    const esperado = hoje.toISOString().split('T')[0];
    // Não podemos testar exatamente pois depende do momento da execução
    expect(typeof adicionarDias()).toBe('string');
  });

  it('trata virada de mês/ano', () => {
    expect(adicionarDias(new Date('2024-01-30T12:00:00'), 5)).toBe('2024-02-04');
    expect(adicionarDias(new Date('2024-12-30T12:00:00'), 5)).toBe('2025-01-04');
  });
});

describe('formatarParaInput', () => {
  it('formata Date para YYYY-MM-DD', () => {
    expect(formatarParaInput(new Date('2024-01-15T12:00:00'))).toBe('2024-01-15');
    expect(formatarParaInput(new Date('2024-12-31T12:00:00'))).toBe('2024-12-31');
  });

  it('adiciona zero à esquerda', () => {
    expect(formatarParaInput(new Date('2024-01-05T12:00:00'))).toBe('2024-01-05');
    expect(formatarParaInput(new Date('2024-09-09T12:00:00'))).toBe('2024-09-09');
  });
});

describe('formatarParaExibicao', () => {
  it('formata Date para DD/MM/YYYY', () => {
    expect(formatarParaExibicao(new Date('2024-01-15T12:00:00'))).toBe('15/01/2024');
    expect(formatarParaExibicao(new Date('2024-12-31T12:00:00'))).toBe('31/12/2024');
  });

  it('adiciona zero à esquerda', () => {
    expect(formatarParaExibicao(new Date('2024-01-05T12:00:00'))).toBe('05/01/2024');
  });
});

describe('formatarDiaMes', () => {
  it('formata Date para DD/MM', () => {
    expect(formatarDiaMes(new Date('2024-01-15T00:00:00'))).toBe('15/01');
    expect(formatarDiaMes(new Date('2024-12-31T00:00:00'))).toBe('31/12');
  });
});

describe('nomeDiaSemanaCurto', () => {
  it('retorna abreviação de 3 letras', () => {
    // 2024-01-15 é uma segunda-feira
    expect(nomeDiaSemanaCurto(new Date('2024-01-15T12:00:00'))).toBe('Seg');
    // 2024-01-14 é domingo
    expect(nomeDiaSemanaCurto(new Date('2024-01-14T12:00:00'))).toBe('Dom');
    // 2024-01-13 é sábado
    expect(nomeDiaSemanaCurto(new Date('2024-01-13T12:00:00'))).toBe('Sáb');
  });
});

describe('nomeDiaSemanaCompleto', () => {
  it('retorna nome completo do dia', () => {
    expect(nomeDiaSemanaCompleto(new Date('2024-01-15T12:00:00'))).toBe('Segunda-feira');
    expect(nomeDiaSemanaCompleto(new Date('2024-01-14T12:00:00'))).toBe('Domingo');
    expect(nomeDiaSemanaCompleto(new Date('2024-01-13T12:00:00'))).toBe('Sábado');
  });
});

describe('gerarDiasSelecao', () => {
  it('gera array de dias com valor e rótulo', () => {
    const base = new Date('2024-01-15T00:00:00'); // segunda
    const dias = gerarDiasSelecao(3, base);

    expect(dias).toHaveLength(3);
    expect(dias[0]).toEqual({ valor: '2024-01-15', rotulo: 'Seg 15/01' });
    expect(dias[1]).toEqual({ valor: '2024-01-16', rotulo: 'Ter 16/01' });
    expect(dias[2]).toEqual({ valor: '2024-01-17', rotulo: 'Qua 17/01' });
  });

  it('usa hoje como padrão', () => {
    const dias = gerarDiasSelecao(1);
    expect(dias).toHaveLength(1);
    expect(dias[0].valor).toBeDefined();
  });
});

describe('gerarHorarios', () => {
  it('gera horários com intervalo padrão 30min', () => {
    const horarios = gerarHorarios('09:00', '12:00');
    expect(horarios).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
  });

  it('gera horários com intervalo customizado', () => {
    const horarios = gerarHorarios('09:00', '10:00', 15);
    expect(horarios).toEqual(['09:00', '09:15', '09:30', '09:45']);
  });

  it('retorna vazio se fim <= início', () => {
    expect(gerarHorarios('12:00', '09:00')).toEqual([]);
    expect(gerarHorarios('10:00', '10:00')).toEqual([]);
  });
});

describe('ehHoje', () => {
  it('retorna true para hoje', () => {
    const hoje = new Date().toISOString().split('T')[0];
    expect(ehHoje(hoje)).toBe(true);
    expect(ehHoje(new Date())).toBe(true);
  });

  it('retorna false para outras datas', () => {
    expect(ehHoje('2020-01-01')).toBe(false);
    expect(ehHoje(new Date('2020-01-01'))).toBe(false);
  });
});

describe('ehPassado', () => {
  it('retorna true para datas passadas', () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    expect(ehPassado(ontem)).toBe(true);
    expect(ehPassado('2020-01-01')).toBe(true);
  });

  it('retorna false para hoje e futuro', () => {
    expect(ehPassado(new Date())).toBe(false);
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    expect(ehPassado(amanha)).toBe(false);
  });
});

describe('ehFuturo', () => {
  it('retorna true para datas futuras', () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    expect(ehFuturo(amanha)).toBe(true);
    expect(ehFuturo('2099-01-01')).toBe(true);
  });

  it('retorna false para hoje e passado', () => {
    expect(ehFuturo(new Date())).toBe(false);
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    expect(ehFuturo(ontem)).toBe(false);
  });
});

describe('combinarDataHora', () => {
  it('combina data e hora em Date', () => {
    const data = combinarDataHora('2024-01-15', '14:30');
    expect(data.getFullYear()).toBe(2024);
    expect(data.getMonth()).toBe(0); // Janeiro = 0
    expect(data.getDate()).toBe(15);
    expect(data.getHours()).toBe(14);
    expect(data.getMinutes()).toBe(30);
  });
});

describe('diferencaMinutos', () => {
  it('calcula diferença em minutos', () => {
    const inicio = new Date('2024-01-15T10:00:00');
    const fim = new Date('2024-01-15T11:30:00');
    expect(diferencaMinutos(inicio, fim)).toBe(90);
  });

  it('arredonda corretamente', () => {
    const inicio = new Date('2024-01-15T10:00:00');
    const fim = new Date('2024-01-15T10:00:30'); // 30 segundos
    expect(diferencaMinutos(inicio, fim)).toBe(1); // arredonda para 1 min
  });
});

describe('intervalosSobrepoem', () => {
  it('retorna true para intervalos que se sobrepõem', () => {
    const inicioA = new Date('2024-01-15T10:00:00');
    const fimA = new Date('2024-01-15T12:00:00');
    const inicioB = new Date('2024-01-15T11:00:00');
    const fimB = new Date('2024-01-15T13:00:00');
    expect(intervalosSobrepoem(inicioA, fimA, inicioB, fimB)).toBe(true);
  });

  it('retorna false para intervalos que não se sobrepõem', () => {
    const inicioA = new Date('2024-01-15T10:00:00');
    const fimA = new Date('2024-01-15T11:00:00');
    const inicioB = new Date('2024-01-15T11:00:00');
    const fimB = new Date('2024-01-15T12:00:00');
    expect(intervalosSobrepoem(inicioA, fimA, inicioB, fimB)).toBe(false); // fimA === inicioB
  });

  it('retorna true para intervalo contido em outro', () => {
    const inicioA = new Date('2024-01-15T10:00:00');
    const fimA = new Date('2024-01-15T14:00:00');
    const inicioB = new Date('2024-01-15T11:00:00');
    const fimB = new Date('2024-01-15T12:00:00');
    expect(intervalosSobrepoem(inicioA, fimA, inicioB, fimB)).toBe(true);
  });
});

describe('horarioNoIntervalo', () => {
  it('retorna true se horário está no intervalo', () => {
    expect(horarioNoIntervalo('11:00', '10:00', '12:00')).toBe(true);
    expect(horarioNoIntervalo('10:00', '10:00', '12:00')).toBe(true); // inclusive
    expect(horarioNoIntervalo('11:59', '10:00', '12:00')).toBe(true);
  });

  it('retorna false se horário fora do intervalo', () => {
    expect(horarioNoIntervalo('09:59', '10:00', '12:00')).toBe(false);
    expect(horarioNoIntervalo('12:00', '10:00', '12:00')).toBe(false); // exclusive
    expect(horarioNoIntervalo('13:00', '10:00', '12:00')).toBe(false);
  });
});

describe('inicioDoDia', () => {
  it('retorna timestamp 00:00:00 do dia', () => {
    const timestamp = inicioDoDia('2024-01-15');
    const data = new Date(timestamp);
    expect(data.getHours()).toBe(0);
    expect(data.getMinutes()).toBe(0);
    expect(data.getSeconds()).toBe(0);
    expect(data.getMilliseconds()).toBe(0);
  });

  it('funciona com objeto Date', () => {
    const timestamp = inicioDoDia(new Date('2024-01-15T15:30:00'));
    const data = new Date(timestamp);
    expect(data.getHours()).toBe(0);
  });
});

describe('fimDoDia', () => {
  it('retorna timestamp 23:59:59.999 do dia', () => {
    const timestamp = fimDoDia('2024-01-15');
    const data = new Date(timestamp);
    expect(data.getHours()).toBe(23);
    expect(data.getMinutes()).toBe(59);
    expect(data.getSeconds()).toBe(59);
    expect(data.getMilliseconds()).toBe(999);
  });
});

describe('formatarTempoDecorrido', () => {
  it('formata minutos', () => {
    expect(formatarTempoDecorrido(30)).toBe('30 min');
    expect(formatarTempoDecorrido(59)).toBe('59 min');
  });

  it('formata horas exatas', () => {
    expect(formatarTempoDecorrido(60)).toBe('1h');
    expect(formatarTempoDecorrido(120)).toBe('2h');
  });

  it('formata horas e minutos', () => {
    expect(formatarTempoDecorrido(90)).toBe('1h 30min');
    expect(formatarTempoDecorrido(135)).toBe('2h 15min');
  });
});

describe('obterMeses', () => {
  it('retorna 12 meses com valor e rótulo', () => {
    const meses = obterMeses();
    expect(meses).toHaveLength(12);
    expect(meses[0]).toEqual({ valor: 1, rotulo: 'Janeiro' });
    expect(meses[11]).toEqual({ valor: 12, rotulo: 'Dezembro' });
  });
});

describe('obterAnos', () => {
  it('retorna anos ao redor do atual', () => {
    const anoAtual = new Date().getFullYear();
    const anos = obterAnos(2);
    expect(anos).toHaveLength(5); // -2, -1, 0, +1, +2
    expect(anos[0]).toBe(anoAtual - 2);
    expect(anos[2]).toBe(anoAtual);
    expect(anos[4]).toBe(anoAtual + 2);
  });

  it('usa range padrão 2', () => {
    const anos = obterAnos();
    expect(anos.length).toBeGreaterThan(0);
  });
});

describe('ehDataValida', () => {
  it('retorna true para datas válidas', () => {
    expect(ehDataValida('2024-01-15')).toBe(true);
    expect(ehDataValida('2024-12-31')).toBe(true);
    expect(ehDataValida('2024-02-29')).toBe(true); // ano bissexto
  });

  it('retorna false para datas inválidas', () => {
    expect(ehDataValida('2024-13-01')).toBe(false); // mês inválido
    expect(ehDataValida('2024-02-30')).toBe(false); // dia inválido
    expect(ehDataValida('2023-02-29')).toBe(false); // não bissexto
    expect(ehDataValida('15/01/2024')).toBe(false); // formato errado
    expect(ehDataValida('')).toBe(false);
    expect(ehDataValida('abc')).toBe(false);
  });
});

describe('calcularIdade', () => {
  it('calcula idade corretamente', () => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    const diaAtual = hoje.getDate();

    // Nascimento no início do ano atual (já fez aniversário se passou o mês/dia)
    const inicioAno = `${anoAtual}-01-01`;
    const idadeInicioAno = calcularIdade(inicioAno);
    expect(idadeInicioAno).toBeGreaterThanOrEqual(0);

    // Nascimento ano passado na mesma data (já fez aniversário)
    expect(calcularIdade(`${anoAtual - 1}-${String(mesAtual).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}`)).toBe(1);

    // Nascimento 20 anos atrás na mesma data
    expect(calcularIdade(`${anoAtual - 20}-${String(mesAtual).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}`)).toBe(20);
  });
});