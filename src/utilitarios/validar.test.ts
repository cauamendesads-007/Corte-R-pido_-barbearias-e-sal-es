/**
 * Testes para utilitários de validação
 * Cobertura: 100% das funções exportadas
 */

import {
  validarObrigatorio,
  validarTamanho,
  validarEmail,
  validarSenha,
  validarConfirmarSenha,
  validarCampoWhatsapp,
  validarCampoCpf,
  validarCep,
  validarPreco,
  validarDuracao,
  validarPercentualSinal,
  validarDescontoPercentual,
  validarDescontoValor,
  validarArquivoImagem,
  validarArquivoVideo,
  validarServicosSelecionados,
  validarNomeCliente,
  validarLogin,
  validarCadastroCliente,
  validarCadastroProfissional,
  validarServico,
  validarAgendamento,
  validarAvaliacao,
  validarPublicacao,
  temErros,
  primeiroErro,
} from './validar';

// Mock para File
const criarArquivoMock = (tipo: string, tamanhoBytes: number): File => {
  const arquivo = new File([''], 'teste', { type: tipo });
  Object.defineProperty(arquivo, 'size', { value: tamanhoBytes });
  return arquivo;
};

describe('validarObrigatorio', () => {
  it('retorna erro para string vazia', () => {
    expect(validarObrigatorio('', 'Nome')).toBe('O campo Nome é obrigatório.');
    expect(validarObrigatorio('   ', 'Email')).toBe('O campo Email é obrigatório.');
  });

  it('retorna null para string preenchida', () => {
    expect(validarObrigatorio('João', 'Nome')).toBeNull();
    expect(validarObrigatorio('  João  ', 'Nome')).toBeNull();
  });
});

describe('validarTamanho', () => {
  it('retorna erro para string muito curta', () => {
    expect(validarTamanho('Jo', 3, 50, 'Nome')).toBe('Nome deve ter pelo menos 3 caracteres.');
  });

  it('retorna erro para string muito longa', () => {
    expect(validarTamanho('A'.repeat(51), 3, 50, 'Nome')).toBe('Nome deve ter no máximo 50 caracteres.');
  });

  it('retorna null para tamanho válido', () => {
    expect(validarTamanho('João', 3, 50, 'Nome')).toBeNull();
    expect(validarTamanho('A'.repeat(50), 3, 50, 'Nome')).toBeNull();
  });
});

describe('validarEmail', () => {
  it('retorna null para emails válidos', () => {
    expect(validarEmail('teste@email.com')).toBeNull();
    expect(validarEmail('usuario.nome@dominio.com.br')).toBeNull();
    expect(validarEmail('user+tag@example.org')).toBeNull();
    expect(validarEmail('a@b.co')).toBeNull();
  });

  it('retorna erro para emails inválidos', () => {
    expect(validarEmail('invalido')).toBe('Informe um e-mail válido.');
    expect(validarEmail('@semusuario.com')).toBe('Informe um e-mail válido.');
    expect(validarEmail('usuario@')).toBe('Informe um e-mail válido.');
    expect(validarEmail('usuario@dominio')).toBe('Informe um e-mail válido.');
    expect(validarEmail('usuario@@dominio.com')).toBe('Informe um e-mail válido.');
  });

  it('retorna null para string vazia (opcional)', () => {
    expect(validarEmail('')).toBeNull();
  });
});

describe('validarSenha', () => {
  it('retorna null para senhas válidas', () => {
    expect(validarSenha('Senha123')).toBeNull();
    expect(validarSenha('MinhaSenh@1')).toBeNull();
    expect(validarSenha('Abcdef1!')).toBeNull();
  });

  it('retorna erro para senhas curtas', () => {
    expect(validarSenha('')).toBe('A senha deve ter pelo menos 8 caracteres com letra e número.');
    expect(validarSenha('Senha1')).toBe('A senha deve ter pelo menos 8 caracteres com letra e número.');
    expect(validarSenha('12345678')).toBe('A senha deve conter pelo menos uma letra e um número.');
  });

  it('retorna erro para senha sem letra ou sem número', () => {
    // Senhaabc = só letras, 12345678 = só números, ABCDEFGH = só letras maiúsculas
    expect(validarSenha('Senhaabc')).toBe('A senha deve conter pelo menos uma letra e um número.');
    expect(validarSenha('12345678')).toBe('A senha deve conter pelo menos uma letra e um número.');
    expect(validarSenha('ABCDEFGH')).toBe('A senha deve conter pelo menos uma letra e um número.');
    // Estas SÃO válidas (têm letra e número):
    expect(validarSenha('SENHA123')).toBeNull();
    expect(validarSenha('senha123')).toBeNull();
    expect(validarSenha('Senha123')).toBeNull();
  });

  it('valida comprimento mínimo', () => {
    expect(validarSenha('A1b')).toBe('A senha deve ter pelo menos 8 caracteres com letra e número.');
    expect(validarSenha('Abc12')).toBe('A senha deve ter pelo menos 8 caracteres com letra e número.');
  });
});

describe('validarConfirmarSenha', () => {
  it('retorna null quando senhas conferem', () => {
    expect(validarConfirmarSenha('Senha123', 'Senha123')).toBeNull();
  });

  it('retorna erro quando senhas não conferem', () => {
    expect(validarConfirmarSenha('Senha123', 'Senha456')).toBe('As senhas não conferem.');
  });
});

describe('validarCampoWhatsapp', () => {
  it('retorna null para WhatsApp válido', () => {
    expect(validarCampoWhatsapp('(11) 99999-9999')).toBeNull();
    expect(validarCampoWhatsapp('11999999999')).toBeNull();
  });

  it('retorna erro para WhatsApp inválido', () => {
    expect(validarCampoWhatsapp('')).toBe('O WhatsApp é obrigatório.');
    expect(validarCampoWhatsapp('1199999999')).toBe('Informe um WhatsApp válido: (DD) 9xxxx-xxxx.');
    expect(validarCampoWhatsapp('11899999999')).toBe('Informe um WhatsApp válido: (DD) 9xxxx-xxxx.');
  });
});

describe('validarCampoCpf', () => {
  it('retorna null para CPF válido', () => {
    expect(validarCampoCpf('123.456.789-09')).toBeNull();
    expect(validarCampoCpf('529.982.247-25')).toBeNull();
    expect(validarCampoCpf('52998224725')).toBeNull();
  });

  it('retorna erro para CPF inválido', () => {
    expect(validarCampoCpf('123.456.789-00')).toBe('CPF inválido.');
    expect(validarCampoCpf('111.111.111-11')).toBe('CPF inválido.');
  });

  it('retorna null para string vazia (opcional)', () => {
    expect(validarCampoCpf('')).toBeNull();
  });
});

describe('validarCep', () => {
  it('retorna null para CEP válido', () => {
    expect(validarCep('12345-678')).toBeNull();
    expect(validarCep('12345678')).toBeNull();
    expect(validarCep('01000-000')).toBeNull();
  });

  it('retorna erro para CEP inválido', () => {
    expect(validarCep('12345')).toBe('CEP inválido. Use 00000-000.');
    expect(validarCep('12345-67')).toBe('CEP inválido. Use 00000-000.');
    expect(validarCep('abcde-fgh')).toBe('CEP inválido. Use 00000-000.');
    expect(validarCep('123456789')).toBe('CEP inválido. Use 00000-000.');
  });

  it('retorna null para string vazia (opcional)', () => {
    expect(validarCep('')).toBeNull();
  });
});

describe('validarPreco', () => {
  it('retorna null para preços válidos', () => {
    expect(validarPreco(0)).toBeNull();
    expect(validarPreco(10)).toBeNull();
    expect(validarPreco(99.99)).toBeNull();
    expect(validarPreco('10,50')).toBeNull();
  });

  it('retorna erro para preços inválidos', () => {
    expect(validarPreco(-1)).toBe('Informe um preço válido.');
    expect(validarPreco(10001)).toBe('Preço máximo permitido: 10.000.');
    expect(validarPreco(NaN)).toBe('Informe um preço válido.');
    expect(validarPreco(Infinity)).toBe('Informe um preço válido.');
    expect(validarPreco('abc')).toBe('Informe um preço válido.');
  });
});

describe('validarDuracao', () => {
  it('retorna null para durações válidas', () => {
    expect(validarDuracao(5)).toBeNull();
    expect(validarDuracao(30)).toBeNull();
    expect(validarDuracao(60)).toBeNull();
    expect(validarDuracao(480)).toBeNull();
    expect(validarDuracao('30')).toBeNull();
  });

  it('retorna erro para durações inválidas', () => {
    expect(validarDuracao(0)).toBe('Duração mínima: 5 minutos.');
    expect(validarDuracao(4)).toBe('Duração mínima: 5 minutos.');
    expect(validarDuracao(481)).toBe('Duração máxima: 480 minutos.');
    expect(validarDuracao(-5)).toBe('Duração mínima: 5 minutos.');
    expect(validarDuracao(NaN)).toBe('Duração mínima: 5 minutos.');
  });
});

describe('validarPercentualSinal', () => {
  it('retorna null para percentuais válidos', () => {
    expect(validarPercentualSinal(10)).toBeNull();
    expect(validarPercentualSinal(50)).toBeNull();
    expect(validarPercentualSinal(100)).toBeNull();
  });

  it('retorna erro para percentuais inválidos', () => {
    expect(validarPercentualSinal(5)).toBe('Sinal mínimo: 10%.');
    expect(validarPercentualSinal(101)).toBe('Sinal máximo: 100%.');
    expect(validarPercentualSinal(NaN)).toBe('Sinal mínimo: 10%.');
  });
});

describe('validarDescontoPercentual', () => {
  it('retorna null para descontos válidos', () => {
    expect(validarDescontoPercentual(0)).toBeNull();
    expect(validarDescontoPercentual(50)).toBeNull();
    expect(validarDescontoPercentual(100)).toBeNull();
  });

  it('retorna erro para descontos inválidos', () => {
    expect(validarDescontoPercentual(-1)).toBe('Desconto não pode ser negativo.');
    expect(validarDescontoPercentual(101)).toBe('Desconto máximo: 100%.');
    expect(validarDescontoPercentual(NaN)).toBe('Desconto não pode ser negativo.');
  });
});

describe('validarDescontoValor', () => {
  it('retorna null para descontos válidos', () => {
    expect(validarDescontoValor(0, 100)).toBeNull();
    expect(validarDescontoValor(50, 100)).toBeNull();
    expect(validarDescontoValor(100, 100)).toBeNull();
    expect(validarDescontoValor('50,00', 100)).toBeNull();
  });

  it('retorna erro para descontos inválidos', () => {
    expect(validarDescontoValor(-1, 100)).toBe('Desconto não pode ser negativo.');
    expect(validarDescontoValor(101, 100)).toBe('O desconto não pode passar do valor do plano.');
    expect(validarDescontoValor(NaN, 100)).toBe('Desconto não pode ser negativo.');
  });
});

describe('validarArquivoImagem', () => {
  it('retorna null para imagem válida', () => {
    const arquivo = criarArquivoMock('image/jpeg', 1024 * 1024); // 1MB
    expect(validarArquivoImagem(arquivo)).toBeNull();
  });

  it('retorna erro para arquivo não-imagem', () => {
    const arquivo = criarArquivoMock('application/pdf', 1024);
    expect(validarArquivoImagem(arquivo)).toBe('O arquivo deve ser uma imagem.');
  });

  it('retorna erro para imagem muito grande', () => {
    const arquivo = criarArquivoMock('image/jpeg', 10 * 1024 * 1024); // 10MB
    expect(validarArquivoImagem(arquivo)).toBe('Imagem acima de 1.5 MB. Reduza o tamanho.');
  });
});

describe('validarArquivoVideo', () => {
  it('retorna null para vídeo válido', () => {
    const arquivo = criarArquivoMock('video/mp4', 1024 * 1024); // 1MB (abaixo de 3MB)
    expect(validarArquivoVideo(arquivo)).toBeNull();
  });

  it('retorna erro para arquivo não-vídeo', () => {
    const arquivo = criarArquivoMock('image/jpeg', 1024);
    expect(validarArquivoVideo(arquivo)).toBe('O arquivo deve ser um vídeo.');
  });

  it('retorna erro para vídeo muito grande', () => {
    const arquivo = criarArquivoMock('video/mp4', 100 * 1024 * 1024); // 100MB
    expect(validarArquivoVideo(arquivo)).toBe('Vídeo acima de 3 MB. Reduza o tamanho.');
  });
});

describe('validarServicosSelecionados', () => {
  it('retorna null quando há serviços', () => {
    expect(validarServicosSelecionados(['1', '2'])).toBeNull();
    expect(validarServicosSelecionados(['1'])).toBeNull();
  });

  it('retorna erro quando não há serviços', () => {
    expect(validarServicosSelecionados([])).toBe('Escolha pelo menos um serviço.');
  });
});

describe('validarNomeCliente', () => {
  it('retorna null para nome válido', () => {
    expect(validarNomeCliente('João Silva')).toBeNull();
    expect(validarNomeCliente('Maria')).toBeNull();
  });

  it('retorna erro para nome vazio', () => {
    expect(validarNomeCliente('')).toBe('Digite seu nome para entrar na fila.');
  });

  it('retorna erro para nome muito curto/longo', () => {
    expect(validarNomeCliente('J')).toContain('Nome deve ter pelo menos');
    expect(validarNomeCliente('A'.repeat(101))).toContain('Nome deve ter no máximo');
  });
});

describe('validarLogin', () => {
  it('retorna erros para campos vazios', () => {
    const erros = validarLogin('', '');
    expect(erros.email).toBe('O campo E-mail é obrigatório.');
    expect(erros.senha).toBe('O campo Senha é obrigatório.');
  });

  it('retorna erros para email inválido', () => {
    const erros = validarLogin('invalido', 'Senha123');
    expect(erros.email).toBe('Informe um e-mail válido.');
    expect(erros.senha).toBeNull();
  });

  it('retorna null para dados válidos', () => {
    const erros = validarLogin('teste@email.com', 'Senha123');
    expect(erros.email).toBeNull();
    expect(erros.senha).toBeNull();
  });
});

describe('validarCadastroCliente', () => {
  it('retorna erros para campos vazios', () => {
    const erros = validarCadastroCliente({ nome: '', email: '', senha: '', confirmarSenha: '' });
    expect(erros.nome).toBeTruthy();
    expect(erros.email).toBeTruthy();
    expect(erros.senha).toBeTruthy();
    expect(erros.confirmarSenha).toBeTruthy();
  });

  it('retorna erro para senhas diferentes', () => {
    const erros = validarCadastroCliente({
      nome: 'João',
      email: 'joao@email.com',
      senha: 'Senha123',
      confirmarSenha: 'Senha456',
    });
    expect(erros.confirmarSenha).toBe('As senhas não conferem.');
  });

  it('retorna null para dados válidos', () => {
    const erros = validarCadastroCliente({
      nome: 'João Silva',
      email: 'joao@email.com',
      senha: 'Senha123',
      confirmarSenha: 'Senha123',
    });
    expect(erros.nome).toBeNull();
    expect(erros.email).toBeNull();
    expect(erros.senha).toBeNull();
    expect(erros.confirmarSenha).toBeNull();
  });
});

describe('validarCadastroProfissional', () => {
  it('retorna erros para campos vazios', () => {
    const erros = validarCadastroProfissional({
      nomeEstabelecimento: '',
      responsavel: '',
      cidade: '',
      endereco: '',
      whatsapp: '',
      nicho: '',
    });
    expect(erros.nomeEstabelecimento).toBeTruthy();
    expect(erros.responsavel).toBeTruthy();
    expect(erros.cidade).toBeTruthy();
    expect(erros.endereco).toBeTruthy();
    expect(erros.whatsapp).toBeTruthy();
    expect(erros.nicho).toBeTruthy();
  });

  it('retorna erro para WhatsApp inválido', () => {
    const erros = validarCadastroProfissional({
      nomeEstabelecimento: 'Barbearia',
      responsavel: 'João',
      cidade: 'Belo Horizonte',
      endereco: 'Rua A, 123',
      whatsapp: '123',
      nicho: 'barbearia',
    });
    expect(erros.whatsapp).toBe('Informe um WhatsApp válido: (DD) 9xxxx-xxxx.');
  });

  it('retorna null para dados válidos', () => {
    const erros = validarCadastroProfissional({
      nomeEstabelecimento: 'Barbearia do João',
      responsavel: 'João Silva',
      cidade: 'Belo Horizonte',
      endereco: 'Rua A, 123',
      whatsapp: '(31) 99999-9999',
      nicho: 'barbearia',
    });
    expect(erros.nomeEstabelecimento).toBeNull();
    expect(erros.responsavel).toBeNull();
    expect(erros.cidade).toBeNull();
    expect(erros.endereco).toBeNull();
    expect(erros.whatsapp).toBeNull();
    expect(erros.nicho).toBeNull();
  });
});

describe('validarServico', () => {
  it('retorna erros para campos vazios', () => {
    const erros = validarServico({ nome: '', preco: '', duracaoMinutos: '', tag: '' });
    expect(erros.nome).toBeTruthy();
    expect(erros.preco).toBeTruthy();
    expect(erros.duracaoMinutos).toBeTruthy();
    expect(erros.tag).toBeTruthy();
  });

  it('retorna null para dados válidos', () => {
    const erros = validarServico({ nome: 'Corte', preco: 50, duracaoMinutos: 30, tag: 'corte' });
    expect(erros.nome).toBeNull();
    expect(erros.preco).toBeNull();
    expect(erros.duracaoMinutos).toBeNull();
    expect(erros.tag).toBeNull();
  });
});

describe('validarAgendamento', () => {
  it('retorna erros para campos vazios', () => {
    const erros = validarAgendamento({
      servicoIds: [],
      dia: '',
      horario: '',
      nomeCliente: '',
      telefoneCliente: '',
    });
    expect(erros.servicoIds).toBeTruthy();
    expect(erros.dia).toBeTruthy();
    expect(erros.horario).toBeTruthy();
    expect(erros.nomeCliente).toBeTruthy();
    expect(erros.telefoneCliente).toBeTruthy();
  });

  it('retorna null para dados válidos', () => {
    const erros = validarAgendamento({
      servicoIds: ['1'],
      dia: '2024-01-15',
      horario: '10:00',
      nomeCliente: 'João Silva',
      telefoneCliente: '(31) 99999-9999',
    });
    expect(erros.servicoIds).toBeNull();
    expect(erros.dia).toBeNull();
    expect(erros.horario).toBeNull();
    expect(erros.nomeCliente).toBeNull();
    expect(erros.telefoneCliente).toBeNull();
  });
});

describe('validarAvaliacao', () => {
  it('retorna erros para campos vazios', () => {
    const erros = validarAvaliacao({ nome: '', estrelas: 0, comentario: '' });
    expect(erros.nome).toBeTruthy();
    expect(erros.estrelas).toBe('Selecione uma nota de 1 a 5.');
    expect(erros.comentario).toBeTruthy();
  });

  it('retorna erro para estrelas inválidas', () => {
    const erros = validarAvaliacao({ nome: 'João', estrelas: 6, comentario: 'Bom' });
    expect(erros.estrelas).toBe('Selecione uma nota de 1 a 5.');
  });

  it('retorna null para dados válidos', () => {
    const erros = validarAvaliacao({ nome: 'João', estrelas: 5, comentario: 'Excelente!' });
    expect(erros.nome).toBeNull();
    expect(erros.estrelas).toBeNull();
    expect(erros.comentario).toBeNull();
  });
});

describe('validarPublicacao', () => {
  it('retorna erro quando não há legenda nem arquivo', () => {
    const erros = validarPublicacao({ legenda: '', arquivo: undefined });
    expect(erros.legenda).toBe('Escreva uma legenda ou escolha uma mídia.');
  });

  it('retorna erro para legenda muito longa', () => {
    const legendaLonga = 'a'.repeat(501);
    const erros = validarPublicacao({ legenda: legendaLonga, arquivo: undefined });
    expect(erros.legenda).toContain('Legenda muito longa');
  });

  it('retorna null para publicação apenas com legenda', () => {
    const erros = validarPublicacao({ legenda: 'Minha publicação', arquivo: undefined });
    expect(erros.legenda).toBeNull();
    expect(erros.arquivo).toBeNull();
  });

  it('retorna erro para tipo de arquivo não suportado', () => {
    const arquivo = criarArquivoMock('application/pdf', 1024);
    const erros = validarPublicacao({ legenda: '', arquivo });
    expect(erros.arquivo).toBe('Tipo de arquivo não suportado.');
  });
});

describe('temErros', () => {
  it('retorna true quando há erros', () => {
    expect(temErros({ a: 'erro', b: null })).toBe(true);
    expect(temErros({ a: 'erro1', b: 'erro2' })).toBe(true);
  });

  it('retorna false quando não há erros', () => {
    expect(temErros({ a: null, b: null })).toBe(false);
    expect(temErros({})).toBe(false);
  });
});

describe('primeiroErro', () => {
  it('retorna o primeiro erro encontrado', () => {
    expect(primeiroErro({ a: null, b: 'erro2', c: 'erro3' })).toBe('erro2');
    expect(primeiroErro({ a: 'erro1', b: 'erro2' })).toBe('erro1');
  });

  it('retorna null quando não há erros', () => {
    expect(primeiroErro({ a: null, b: null })).toBeNull();
    expect(primeiroErro({})).toBeNull();
  });
});