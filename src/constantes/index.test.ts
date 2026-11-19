/**
 * Testes para constantes da aplicação
 * Cobertura: 100% das exportações
 */

import {
  ROTAS,
  NICHOS,
  OPCOES_NICHO,
  LAYOUTS,
  OPCOES_ORDENACAO,
  FILTROS_PADRAO,
  LIMITES,
  MENSAGENS_ERRO,
  MENSAGENS_SUCESSO,
  MENSAGENS_INFO,
  BREAKPOINTS,
  Z_INDEX,
  DURACAO_ANIMACAO,
  EASING_PADRAO,
  CHAVES_STORAGE,
  PAPEIS,
  STATUS_AGENDAMENTO,
  TIPOS_NOTIFICACAO,
  ABAS_BARBEIRO,
  ABAS_ADMIN,
  ABAS_CLIENTE,
  FILTROS_FEED,
  DIAS_SEMANA_CURTOS,
  MESES_CURTOS,
  ICONES,
} from './index';

describe('ROTAS', () => {
  it('contém todas as rotas necessárias', () => {
    expect(ROTAS.raiz).toBe('/');
    expect(ROTAS.feed).toBe('/feed');
    expect(ROTAS.explorar).toBe('/explorar');
    expect(ROTAS.entrar).toBe('/entrar');
    expect(ROTAS.cadastrar).toBe('/cadastrar');
    expect(ROTAS.notificacoes).toBe('/notificacoes');
    expect(ROTAS.painel).toBe('/painel');
    expect(ROTAS.barbeiro).toBe('/barbeiro');
    expect(ROTAS.admin).toBe('/admin');
    expect(ROTAS.perfil).toBe('/perfil');
  });

  it('rotas dinâmicas funcionam', () => {
    expect(ROTAS.estabelecimento('minha-barbearia')).toBe('/estabelecimento/minha-barbearia');
    expect(ROTAS.publicacao('123')).toBe('/publicacao/123');
  });
});

describe('NICHOS', () => {
  it('contém todos os nichos', () => {
    expect(NICHOS.barbearia).toBe('Barbearia');
    expect(NICHOS.feminino).toBe('Salão Feminino');
    expect(NICHOS.visagismo).toBe('Visagismo');
    expect(NICHOS.infantil).toBe('Infantil');
  });
});

describe('OPCOES_NICHO', () => {
  it('inclui opção "todos" e todos os nichos', () => {
    expect(OPCOES_NICHO).toHaveLength(5);
    expect(OPCOES_NICHO[0]).toEqual({ valor: 'todos', rotulo: 'Todos' });
    expect(OPCOES_NICHO[1]).toEqual({ valor: 'barbearia', rotulo: 'Barbearia' });
  });
});

describe('LAYOUTS', () => {
  it('contém layouts com rótulos', () => {
    expect(LAYOUTS.classico).toEqual({ valor: 'classico', rotulo: 'Clássico: texto à esquerda' });
    expect(LAYOUTS.moderno).toEqual({ valor: 'moderno', rotulo: 'Moderno: centralizado com faixa de cor' });
  });
});

describe('OPCOES_ORDENACAO', () => {
  it('contém 4 opções de ordenação', () => {
    expect(OPCOES_ORDENACAO).toHaveLength(4);
    expect(OPCOES_ORDENACAO.map(o => o.valor)).toEqual(['avaliacao', 'distancia', 'fila', 'preco']);
  });
});

describe('FILTROS_PADRAO', () => {
  it('contém valores padrão corretos', () => {
    expect(FILTROS_PADRAO.nicho).toBe('todos');
    expect(FILTROS_PADRAO.precoMaximo).toBe(200);
    expect(FILTROS_PADRAO.avaliacaoMinima).toBe(0);
    expect(FILTROS_PADRAO.ordenacao).toBe('avaliacao');
    expect(FILTROS_PADRAO.apenasBemAvaliados).toBe(false);
    expect(FILTROS_PADRAO.apenasVagasHoje).toBe(false);
  });
});

describe('LIMITES', () => {
  it('contém todos os limites de validação', () => {
    expect(LIMITES.nomeMinimo).toBe(2);
    expect(LIMITES.nomeMaximo).toBe(60);
    expect(LIMITES.bioMaxima).toBe(160);
    expect(LIMITES.legendaMaxima).toBe(300);
    expect(LIMITES.comentarioMaximo).toBe(200);
    expect(LIMITES.senhaMinima).toBe(8);
    expect(LIMITES.whatsappMaximo).toBe(15);
    expect(LIMITES.precoMaximo).toBe(10000);
    expect(LIMITES.duracaoMaxima).toBe(480);
  });
});

describe('MENSAGENS_ERRO', () => {
  it('contém funções e strings de erro', () => {
    expect(MENSAGENS_ERRO.campoObrigatorio('Nome')).toBe('O campo Nome é obrigatório.');
    expect(MENSAGENS_ERRO.emailInvalido).toBe('Informe um e-mail válido.');
    expect(MENSAGENS_ERRO.senhaCurta).toContain('8 caracteres');
    expect(MENSAGENS_ERRO.whatsappInvalido).toContain('(DD) 9xxxx-xxxx');
  });
});

describe('MENSAGENS_SUCESSO', () => {
  it('contém mensagens de sucesso', () => {
    expect(MENSAGENS_SUCESSO.agendado).toBe('Horário confirmado!');
    expect(MENSAGENS_SUCESSO.perfilSalvo).toBe('Perfil salvo com sucesso.');
    expect(MENSAGENS_SUCESSO.publicacaoCriada).toBe('Publicado no seu feed.');
  });
});

describe('MENSAGENS_INFO', () => {
  it('contém mensagens informativas', () => {
    expect(MENSAGENS_INFO.carregando).toBe('Carregando...');
    expect(MENSAGENS_INFO.semAgendamentos).toBe('Você não tem horários marcados.');
    expect(MENSAGENS_INFO.demoCliente).toBe('Entrar como Cliente Demo');
  });
});

describe('BREAKPOINTS', () => {
  it('contém breakpoints responsivos', () => {
    expect(BREAKPOINTS.celular).toBe(480);
    expect(BREAKPOINTS.tablet).toBe(768);
    expect(BREAKPOINTS.notebook).toBe(1024);
    expect(BREAKPOINTS.desktop).toBe(1280);
    expect(BREAKPOINTS.grande).toBe(1440);
  });
});

describe('Z_INDEX', () => {
  it('contém camadas de z-index', () => {
    expect(Z_INDEX.base).toBe(0);
    expect(Z_INDEX.header).toBe(20);
    expect(Z_INDEX.modalBackdrop).toBe(40);
    expect(Z_INDEX.modal).toBe(50);
    expect(Z_INDEX.toast).toBe(30);
  });
});

describe('DURACAO_ANIMACAO', () => {
  it('contém durações', () => {
    expect(DURACAO_ANIMACAO.rapida).toBe(150);
    expect(DURACAO_ANIMACAO.media).toBe(250);
    expect(DURACAO_ANIMACAO.lenta).toBe(350);
  });
});

describe('EASING_PADRAO', () => {
  it('é string de cubic-bezier', () => {
    expect(EASING_PADRAO).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
  });
});

describe('CHAVES_STORAGE', () => {
  it('contém chaves do localStorage', () => {
    expect(CHAVES_STORAGE.tema).toBe('cr_tema');
    expect(CHAVES_STORAGE.sessao).toBe('cr_sessao');
    expect(CHAVES_STORAGE.dados).toBe('cr_dados_v1');
    expect(CHAVES_STORAGE.fonteGrande).toBe('cr_fonte_grande');
  });
});

describe('PAPEIS', () => {
  it('contém rótulos dos papéis', () => {
    expect(PAPEIS.cliente).toBe('Cliente');
    expect(PAPEIS.barbeiro).toBe('Barbeiro');
    expect(PAPEIS.admin).toBe('Administrador');
  });
});

describe('STATUS_AGENDAMENTO', () => {
  it('contém status de agendamento', () => {
    expect(STATUS_AGENDAMENTO.agendado).toBe('Agendado');
    expect(STATUS_AGENDAMENTO.aguardando_pix).toBe('Aguardando Pix');
    expect(STATUS_AGENDAMENTO.pago).toBe('Pago');
    expect(STATUS_AGENDAMENTO.concluido).toBe('Concluído');
    expect(STATUS_AGENDAMENTO.cancelado).toBe('Cancelado');
  });
});

describe('TIPOS_NOTIFICACAO', () => {
  it('contém tipos de notificação', () => {
    expect(TIPOS_NOTIFICACAO.agendamento).toBe('Agendamento');
    expect(TIPOS_NOTIFICACAO.cancelamento).toBe('Cancelamento');
    expect(TIPOS_NOTIFICACAO.pagamento).toBe('Pagamento');
  });
});

describe('ABAS_BARBEIRO', () => {
  it('contém 9 abas do painel do barbeiro', () => {
    expect(ABAS_BARBEIRO).toHaveLength(9);
    expect(ABAS_BARBEIRO.map(a => a.id)).toEqual([
      'servicos', 'galeria', 'feed', 'pagina', 'pagamentos',
      'plano', 'mensagens', 'fila', 'concorrencia'
    ]);
  });
});

describe('ABAS_ADMIN', () => {
  it('contém 4 abas do painel admin', () => {
    expect(ABAS_ADMIN).toHaveLength(4);
    expect(ABAS_ADMIN.map(a => a.id)).toEqual(['cadastros', 'pagamentos', 'paginas', 'indicadores']);
  });
});

describe('ABAS_CLIENTE', () => {
  it('contém 5 abas do painel cliente', () => {
    expect(ABAS_CLIENTE).toHaveLength(5);
    expect(ABAS_CLIENTE.map(a => a.id)).toEqual(['agendamentos', 'perfil', 'inspiracoes', 'seguindo', 'configuracoes']);
  });
});

describe('FILTROS_FEED', () => {
  it('contém 7 filtros do feed', () => {
    expect(FILTROS_FEED).toHaveLength(7);
    expect(FILTROS_FEED.map(f => f.id)).toEqual([
      'todos', 'corte', 'barba', 'pigmentacao', 'sobrancelha', 'coloracao', 'salvos'
    ]);
  });
});

describe('DIAS_SEMANA_CURTOS', () => {
  it('contém 7 dias abreviados', () => {
    expect(DIAS_SEMANA_CURTOS).toHaveLength(7);
    expect(DIAS_SEMANA_CURTOS).toEqual(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
  });
});

describe('MESES_CURTOS', () => {
  it('contém 12 meses abreviados', () => {
    expect(MESES_CURTOS).toHaveLength(12);
    expect(MESES_CURTOS[0]).toBe('Jan');
    expect(MESES_CURTOS[11]).toBe('Dez');
  });
});

describe('ICONES', () => {
  it('contém todos os ícones necessários', () => {
    // Ícones principais
    expect(ICONES.menu).toContain('<svg');
    expect(ICONES.fechar).toContain('<svg');
    expect(ICONES.busca).toContain('<svg');
    expect(ICONES.usuario).toContain('<svg');
    expect(ICONES.sino).toContain('<svg');
    expect(ICONES.tema).toContain('<svg');
    expect(ICONES.fonte).toContain('<svg');

    // Ícones de interação
    expect(ICONES.estrela).toContain('<svg');
    expect(ICONES.coracao).toContain('<svg');
    expect(ICONES.salvar).toContain('<svg');
    expect(ICONES.compartilhar).toContain('<svg');
    expect(ICONES.setaDireita).toContain('<svg');
    expect(ICONES.verificar).toContain('<svg');
    expect(ICONES.x).toContain('<svg');

    // Ícones de UI
    expect(ICONES.olho).toContain('<svg');
    expect(ICONES.whatsapp).toContain('<svg');
    expect(ICONES.mapa).toContain('<svg');
    expect(ICONES.tesoura).toContain('<svg');
    expect(ICONES.relogio).toContain('<svg');
    expect(ICONES.localizacao).toContain('<svg');
    expect(ICONES.telefone).toContain('<svg');
    expect(ICONES.calendario).toContain('<svg');

    // Ícones de ação
    expect(ICONES.mais).toContain('<svg');
    expect(ICONES.menos).toContain('<svg');
    expect(ICONES.editar).toContain('<svg');
    expect(ICONES.lixeira).toContain('<svg');
    expect(ICONES.carregando).toContain('<svg');
    expect(ICONES.verificarCirculo).toContain('<svg');
    expect(ICONES.alerta).toContain('<svg');
    expect(ICONES.info).toContain('<svg');

    // Ícones de navegação
    expect(ICONES.casa).toContain('<svg');
    expect(ICONES.bussola).toContain('<svg');
    expect(ICONES.usuarios).toContain('<svg');
    expect(ICONES.grafico).toContain('<svg');
    expect(ICONES.configuracoes).toContain('<svg');
    expect(ICONES.sair).toContain('<svg');
    expect(ICONES.cadeado).toContain('<svg');
    expect(ICONES.cabecalho).toContain('<svg');

    // Ícones de mídia
    expect(ICONES.foto).toContain('<svg');
    expect(ICONES.video).toContain('<svg');
    expect(ICONES.moeda).toContain('<svg');
    expect(ICONES.premio).toContain('<svg');
    expect(ICONES.fila).toContain('<svg');
    expect(ICONES.mensagem).toContain('<svg');
    expect(ICONES.historico).toContain('<svg');
    expect(ICONES.recarregar).toContain('<svg');
    expect(ICONES.filtro).toContain('<svg');
    expect(ICONES.grade).toContain('<svg');
    expect(ICONES.lista).toContain('<svg');

    // Ícones adicionais
    expect(ICONES.xCirculo).toContain('<svg');
    expect(ICONES.voltar).toContain('<svg');
    expect(ICONES.camera).toContain('<svg');
    expect(ICONES.paleta).toContain('<svg');
    expect(ICONES.sol).toContain('<svg');
    expect(ICONES.lua).toContain('<svg');
    expect(ICONES.monitor).toContain('<svg');
    expect(ICONES.filtroAtivo).toContain('<svg');
    expect(ICONES.feed).toContain('<svg');
    expect(ICONES.pix).toContain('<svg');
    expect(ICONES.check).toContain('<svg');
    expect(ICONES.painel).toContain('<svg');
    expect(ICONES.predio).toContain('<svg');
  });

  it('todos ícones são strings SVG válidas', () => {
    Object.values(ICONES).forEach(icone => {
      expect(icone).toMatch(/^<svg/);
      expect(icone).toMatch(/<\/svg>$/);
    });
  });
});