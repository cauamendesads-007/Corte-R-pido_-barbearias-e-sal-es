/**
 * Constantes centrais da aplicação Corte Rápido.
 * Valores fixos, configurações e mensagens padronizadas.
 */

import type { NichoEstabelecimento, TipoLayout, PapelUsuario, FiltrosBusca } from '@/tipos';

/** Roteamento da aplicação */
export const ROTAS = {
  raiz: '/',
  feed: '/feed',
  explorar: '/explorar',
  entrar: '/entrar',
  cadastrar: '/cadastrar',
  notificacoes: '/notificacoes',
  painel: '/painel',
  barbeiro: '/barbeiro',
  admin: '/admin',
  estabelecimento: (slug: string) => `/estabelecimento/${slug}`,
  publicacao: (id: string) => `/publicacao/${id}`,
  perfil: '/perfil',
} as const;

/** Nichos com rótulos amigáveis */
export const NICHOS: Record<NichoEstabelecimento, string> = {
  barbearia: 'Barbearia',
  feminino: 'Salão Feminino',
  visagismo: 'Visagismo',
  infantil: 'Infantil',
};

/** Opções de nicho para selects (inclui "Todos") */
export const OPCOES_NICHO = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'barbearia', rotulo: 'Barbearia' },
  { valor: 'feminino', rotulo: 'Salão Feminino' },
  { valor: 'visagismo', rotulo: 'Visagismo' },
  { valor: 'infantil', rotulo: 'Infantil' },
] as const;

/** Layouts de página disponíveis */
export const LAYOUTS: Record<TipoLayout, { valor: TipoLayout; rotulo: string }> = {
  classico: { valor: 'classico', rotulo: 'Clássico: texto à esquerda' },
  moderno: { valor: 'moderno', rotulo: 'Moderno: centralizado com faixa de cor' },
};

/** Opções de ordenação no marketplace */
export const OPCOES_ORDENACAO = [
  { valor: 'avaliacao', rotulo: 'Melhor avaliação' },
  { valor: 'distancia', rotulo: 'Mais perto' },
  { valor: 'fila', rotulo: 'Menor espera' },
  { valor: 'preco', rotulo: 'Menor preço' },
] as const;

/** Filtros padrão do marketplace */
export const FILTROS_PADRAO: FiltrosBusca = {
  nicho: 'todos',
  precoMaximo: 200,
  avaliacaoMinima: 0,
  tipoServico: '',
  ordenacao: 'avaliacao',
  apenasBemAvaliados: false,
  apenasVagasHoje: false,
  localizacaoUsuario: null,
};

/** Limites de validação */
export const LIMITES = {
  nomeMinimo: 2,
  nomeMaximo: 60,
  bioMaxima: 160,
  legendaMaxima: 300,
  comentarioMaximo: 200,
  senhaMinima: 8,
  whatsappMaximo: 15,
  enderecoMaximo: 100,
  cidadeMaxima: 60,
  arquivoImagemMaximoMB: 1.5,
  arquivoVideoMaximoMB: 3,
  precoMinimo: 0,
  precoMaximo: 10000,
  duracaoMinima: 5,
  duracaoMaxima: 480,
  percentualSinalMinimo: 10,
  percentualSinalMaximo: 100,
  descontoPercentualMaximo: 100,
} as const;

/** Mensagens de erro padronizadas */
export const MENSAGENS_ERRO = {
  campoObrigatorio: (campo: string) => `O campo ${campo} é obrigatório.`,
  emailInvalido: 'Informe um e-mail válido.',
  senhaCurta: `A senha deve ter pelo menos ${LIMITES.senhaMinima} caracteres com letra e número.`,
  whatsappInvalido: 'Informe um WhatsApp válido: (DD) 9xxxx-xxxx.',
  whatsappObrigatorio: 'O WhatsApp é obrigatório.',
  nomeCurto: `O nome deve ter pelo menos ${LIMITES.nomeMinimo} caracteres.`,
  nomeLongo: `O nome deve ter no máximo ${LIMITES.nomeMaximo} caracteres.`,
  precoInvalido: 'Informe um preço válido.',
  duracaoInvalida: 'Informe uma duração válida em minutos.',
  arquivoGrandeImagem: `Imagem acima de ${LIMITES.arquivoImagemMaximoMB} MB. Reduza o tamanho.`,
  arquivoGrandeVideo: `Vídeo acima de ${LIMITES.arquivoVideoMaximoMB} MB. Reduza o tamanho.`,
  arquivoInvalido: 'Arquivo de imagem inválido.',
  semResultados: 'Nenhum resultado encontrado com esses filtros.',
  erroGenerico: 'Algo deu errado. Tente novamente.',
  erroRede: 'Erro de conexão. Verifique sua internet.',
  naoAutorizado: 'Você não tem permissão para esta ação.',
  sessaoExpirada: 'Sua sessão expirou. Entre novamente.',
  estabelecimentoNaoEncontrado: 'Estabelecimento não encontrado ou não aprovado.',
  horarioOcupado: 'Esse horário acabou de ser ocupado. Escolha outro.',
  servicosObrigatorios: 'Escolha pelo menos um serviço.',
  nomeClienteObrigatorio: 'Digite seu nome para entrar na fila.',
  confirmacaoExclusao: 'Clique novamente para confirmar a exclusão.',
} as const;

/** Mensagens de sucesso padronizadas */
export const MENSAGENS_SUCESSO = {
  agendado: 'Horário confirmado!',
  filaEntrada: 'Você entrou na fila.',
  filaRemovido: 'Removido da fila.',
  avaliacaoEnviada: 'Avaliação publicada. Obrigado!',
  perfilSalvo: 'Perfil salvo com sucesso.',
  senhaAlterada: 'Senha atualizada.',
  contaExcluida: 'Conta excluída.',
  publicacaoCriada: 'Publicado no seu feed.',
  publicacaoExcluida: 'Publicação excluída.',
  inspiracaoSalva: 'Salvo em Minhas Inspirações.',
  inspiracaoRemovida: 'Removido das inspirações.',
  linkCopiado: 'Link copiado.',
  codigoPixCopiado: 'Código Pix copiado.',
  pagamentoConfirmado: 'Pagamento confirmado.',
  planoAlterado: 'Plano alterado. Vale a partir do próximo pagamento.',
  contratoAtualizado: 'Contrato atualizado.',
  mensagemEnviada: 'Mensagem enviada.',
  notificacoesLidas: 'Notificações marcadas como lidas.',
  dadosRestaurados: 'Dados de demonstração restaurados. Recarregando...',
} as const;

/** Mensagens informativas */
export const MENSAGENS_INFO = {
  carregando: 'Carregando...',
  semAgendamentos: 'Você não tem horários marcados.',
  semHistorico: 'Nenhum serviço realizado ainda.',
  semInspiracoes: 'Você ainda não salvou nenhuma inspiração.',
  semSeguindo: 'Você ainda não segue ninguém.',
  semNotificacoes: 'Você está em dia.',
  semPublicacoes: 'Nenhuma publicação aqui.',
  semServicos: 'Este estabelecimento ainda não publicou serviços.',
  semFila: 'Sem fila agora.',
  cadeiraLivre: 'Cadeira livre. Chegue e seja atendido.',
  filaAtualiza: 'Atualiza a cada 7 segundos.',
  demoCliente: 'Entrar como Cliente Demo',
  demoBarbeiro: 'Entrar como Barbeiro Demo',
  demoAdmin: 'Entrar como Admin Demo',
  restaurarDemo: 'Restaurar dados de demonstração',
  whatsappLembrete: 'Receber lembrete de horário por WhatsApp',
} as const;

/** Breakpoints responsivos */
export const BREAKPOINTS = {
  celular: 480,
  tablet: 768,
  notebook: 1024,
  desktop: 1280,
  grande: 1440,
} as const;

/** Z-index layers */
export const Z_INDEX = {
  base: 0,
  header: 20,
  modalBackdrop: 40,
  modal: 50,
  toast: 30,
  tooltip: 60,
  bottomNav: 25,
} as const;

/** Duração de animações (ms) */
export const DURACAO_ANIMACAO = {
  rapida: 150,
  media: 250,
  lenta: 350,
} as const;

/** Easing padrão */
export const EASING_PADRAO = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** Chaves de localStorage */
export const CHAVES_STORAGE = {
  tema: 'cr_tema',
  sessao: 'cr_sessao',
  dados: 'cr_dados_v1',
  fonteGrande: 'cr_fonte_grande',
} as const;

/** Papéis de usuário */
export const PAPEIS: Record<PapelUsuario, string> = {
  cliente: 'Cliente',
  barbeiro: 'Barbeiro',
  admin: 'Administrador',
};

/** Status de agendamento */
export const STATUS_AGENDAMENTO = {
  agendado: 'Agendado',
  aguardando_pix: 'Aguardando Pix',
  pago: 'Pago',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
} as const;

/** Tipos de notificação */
export const TIPOS_NOTIFICACAO = {
  agendamento: 'Agendamento',
  reagendamento: 'Reagendamento',
  cancelamento: 'Cancelamento',
  mensagem: 'Mensagem',
  administracao: 'Administração',
  pagamento: 'Pagamento',
} as const;

/** Abas do painel do barbeiro */
export const ABAS_BARBEIRO = [
  { id: 'servicos', rotulo: 'Serviços e preços' },
  { id: 'galeria', rotulo: 'Portfólio' },
  { id: 'feed', rotulo: 'Feed' },
  { id: 'pagina', rotulo: 'Minha página' },
  { id: 'pagamentos', rotulo: 'Pagamentos' },
  { id: 'plano', rotulo: 'Meu plano' },
  { id: 'mensagens', rotulo: 'Mensagens' },
  { id: 'fila', rotulo: 'Fila e agenda' },
  { id: 'concorrencia', rotulo: 'Concorrência' },
] as const;

/** Abas do painel do admin */
export const ABAS_ADMIN = [
  { id: 'cadastros', rotulo: 'Cadastros' },
  { id: 'pagamentos', rotulo: 'Pagamentos' },
  { id: 'paginas', rotulo: 'Páginas e templates' },
  { id: 'indicadores', rotulo: 'Indicadores' },
] as const;

/** Abas do painel do cliente */
export const ABAS_CLIENTE = [
  { id: 'agendamentos', rotulo: 'Meus agendamentos' },
  { id: 'perfil', rotulo: 'Perfil' },
  { id: 'inspiracoes', rotulo: 'Inspirações' },
  { id: 'seguindo', rotulo: 'Seguindo' },
  { id: 'configuracoes', rotulo: 'Configurações' },
] as const;

/** Filtros do feed */
export const FILTROS_FEED = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'corte', rotulo: 'Corte' },
  { id: 'barba', rotulo: 'Barba' },
  { id: 'pigmentacao', rotulo: 'Pigmentação' },
  { id: 'sobrancelha', rotulo: 'Sobrancelha' },
  { id: 'coloracao', rotulo: 'Coloração' },
  { id: 'salvos', rotulo: 'Salvos' },
] as const;

/** Dias da semana curtos */
export const DIAS_SEMANA_CURTOS = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
];

/** Meses curtos */
export const MESES_CURTOS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

/** SVG Icons inline */
export const ICONES = {
  menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
  fechar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  busca: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  usuario: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
  sino: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
  tema: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
  fonte: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`,
  estrela: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
  estrelaVazia: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
  coracao: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
  coracaoVazio: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
  salvar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`,
  salvarVazio: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`,
  compartilhar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
  setaDireita: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
  setaEsquerda: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
  setaCima: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`,
  setaBaixo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
  verificar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  x: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  olho: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
  olhoFechado: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.9 10.9 0 0 1 12 19c-6.4 0-10-7-10-7a18 18 0 0 1 4.1-5M9.9 5.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.2 3.2M1 1l22 22M9.9 9.9a3 3 0 0 0 4.2 4.2"></path></svg>`,
  whatsapp: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378 9.86 9.86 0 0 1-.397-.43c-.179-.236-.292-.487-.337-.735-.044-.247-.044-.528.045-.795a.782.782 0 0 1 .242-.52c.31-.27.609-.417.97-.473.335-.05.703-.045 1.034.066.333.11.632.291.904.514.29.238.473.547.534.867.06.31.024.608-.044.85-.07.264-.217.505-.44.748-.225.24-.482.42-.758.556-.274.137-.571.23-.89.284-.318.054-.658.047-.996.012-.356-.035-.696-.11-1.004-.254-.318-.15-.61-.33-.885-.545-.27-.208-.506-.447-.71-.717-.204-.27-.376-.56-.507-.863-.13-.303-.23-.618-.297-.947-.066-.333-.044-.67.023-1.003.07-.33.203-.64.376-.92.177-.283.405-.548.68-.797.277-.25.595-.486.945-.694.352-.21.723-.39 1.099-.536.375-.145.756-.265 1.134-.36.38-.097.758-.174 1.123-.21.364-.037.722-.034 1.067.047.36.085.683.213.977.39.292.176.538.41.65.713.114.302.144.613.104.922-.038.308-.158.609-.31.886-.152.277-.382.523-.68.75-.298.228-.635.407-.993.537-.361.13-.75.198-1.137.218-.385.02-.772-.007-1.154-.067-.376-.06-.728-.175-1.051-.324-.32-.148-.605-.34-.85-.57-.24-.225-.427-.48-.554-.77-.127-.29-.195-.605-.212-.923-.017-.32.023-.64.095-.94.07-.3.18-.587.34-.86.148-.274.336-.527.57-.745.222-.207.467-.38.727-.51.26-.13.527-.225.802-.275.273-.05.535-.074.784-.097.275-.027.54-.03.788-.03.273 0 .543.003.798.044.253.04.487.12.69.23.214.117.385.28.507.485.122.205.193.43.21.678.017.244-.017.492-.067.724-.05.23-.13.445-.252.64-.12.194-.272.375-.433.535-.161.16-.346.306-.546.43-.2.124-.42.218-.65.284-.23.066-.47.107-.72.117-.248.01-.507-.006-.77-.047-.26-.04-.508-.116-.73-.226-.234-.11-.445-.252-.627-.424-.18-.17-.326-.364-.44-.58-.114-.216-.19-.448-.23-.7-.04-.25.003-.507.07-.74.067-.233.16-.45.28-.65.116-.19.256-.36.42-.51.164-.15.347-.284.55-.39.203-.105.416-.19.637-.25.22-.06.443-.104.67-.127.228-.024.45-.03.672-.03.248 0 .5.01.747.06.276.05.518.147.718.292.198.146.36.32.394.53.03.187-.003.377-.044.56-.042.18-.127.34-.24.484-.11.145-.257.27-.435.366-.178.096-.366.167-.564.207-.198.04-.4.06-.61.06-.21 0-.417-.02-.62-.06-.203-.04-.39-.106-.558-.19-.166-.083-.312-.186-.435-.31-.12-.123-.207-.266-.26-.428-.054-.162-.074-.335-.074-.513 0-.18.02-.36.07-.54.05-.17.123-.324.23-.47.106-.147.24-.27.4-.376.16-.106.333-.19.517-.25.183-.06.37-.106.56-.13.19-.025.38-.04.57-.04.19 0 .38.015.565.06.185.045.357.12.513.22.156.1.29.21.4.34.11.13.18.27.22.43.04.16-.004.32-.04.47-.04.144-.1.264-.17.37-.164.104.006.203.02.298.043.094.023.187.05.278.08.09.03.177.07.26.105.082.034.16.078.235.12.075.043.143.097.202.156.059.058.11.126.15.202.04.075.066.154.08.236.014.082-.014.164-.04.243-.025.08-.05.155-.084.225-.034.07-.08.13-.13.18-.05.05-.11.09-.17.12-.06.03-.13.045-.2.045-.07 0-.137-.015-.2-.044-.063-.028-.12-.066-.17-.11-.05-.043-.088-.097-.113-.16-.024-.06-.034-.126-.034-.196 0-.07.01-.14.03-.207.02-.068.05-.132.09-.19.038-.058.09-.11.15-.15.06-.04.124-.07.19-.09.067-.02.136-.03.204-.03.07 0 .136.01.202.03.066.02.13.05.192.09.062.04.12.09.17.15.05.06.084.12.105.188.02.07-.004.137-.04.2-.04.062-.063.105-.14.13-.21.025-.07.025-.147 0-.22-.025-.074-.025-.147-.05-.216-.084-.29-.154-.074-.067-.16-.117-.25-.162-.09-.045-.188-.077-.29-.09-.102-.013-.203-.016-.306-.016-.102 0-.204.003-.304.016-.1.013-.195.033-.282.06-.086.027-.163.07-.23.12-.066.05-.116.11-.15.176-.034.066-.05.135-.05.208 0 .073.016.144.05.21.034.065.08.123.14.174.06.05.128.088.2.117.072.03.15.043.23.043.08 0 .156-.013.232-.04.077-.027.147-.07.21-.125.063-.055.113-.123.15-.2.037-.077.057-.157.06-.24.003-.082-.02-.16-.05-.235-.03-.074-.07-.142-.12-.203-.05-.06-.107-.11-.17-.15-.062-.04-.13-.067-.202-.08-.07-.013-.146-.01-.22.01-.074.02-.14.05-.203.09-.063.04-.117.09-.158.15-.04.06-.067.126-.077.19-.01.065.006.13.03.19.024.06.056.113.1.16.044.047.092.087.145.116.053.03.11.043.168.043.057 0 .114-.013.168-.04.055-.027.103-.07.145-.125.042-.055.07-.117.086-.185.015-.067.012-.137-.01-.205-.022-.068-.054-.132-.095-.19-.04-.057-.09-.107-.15-.15-.06-.042-.125-.073-.196-.093-.07-.02-.144-.026-.218-.026-.073 0-.145.006-.216.02-.07.013-.133.04-.19.08-.056.04-.1.09-.14.15-.04.06-.066.128-.077.196-.01.068.006.136.03.203.024.068.056.118.1.164.044.046.09.085.14.114.05.03.106.042.163.042.057 0 .113-.013.168-.04.054-.027.102-.07.143-.124.043-.055.07-.117.086-.185.015-.068.012-.138-.01-.206"/></svg>`,
  mapa: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 3 21 6 21 18 15 21 9 21 3 18"></polygon><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>`,
  tesoura: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"></path></svg>`,
  relogio: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  localizacao: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
  telefone: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
  calendario: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  mais: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  menos: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  editar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
  lixeira: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  carregando: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animar-giro"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>`,
  verificarCirculo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8 12 12 8 10"></path></svg>`,
  alerta: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
  info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  casa: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
  bussola: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="12 2 15 12 12 22 9 12"></polygon></svg>`,
  usuarios: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  grafico: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
  configuracoes: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
  sair: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
  cadeado: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
  cabecalho: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
  foto: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
  video: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
  moeda: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="6" x2="12" y2="18"></line><line x1="6" y1="12" x2="18" y2="12"></line></svg>`,
  premio: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`,
  fila: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`,
  mensagem: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
  historico: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  recarregar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`,
  filtro: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`,
  grade: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
  lista: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
  // Ícones adicionais
  xCirculo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
  voltar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
  camera: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><circle cx="12" cy="10" r="3"></circle></svg>`,
  paleta: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"></circle><circle cx="18" cy="2" r="2.5"></circle><circle cx="20" cy="10.5" r="2.5"></circle><circle cx="6.5" cy="13.5" r="2.5"></circle><circle cx="2" cy="18" r="2.5"></circle><circle cx="10.5" cy="20" r="2.5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c2.5 0 4.8-.9 6.5-2.4"></path></svg>`,
  sol: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
  lua: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
  monitor: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
  filtroAtivo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`,
  feed: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="18" x2="20" y2="18"></line><line x1="4" y1="6" x2="4.01" y2="6"></line><line x1="4" y1="12" x2="4.01" y2="12"></line><line x1="4" y1="18" x2="4.01" y2="18"></line></svg>`,
  pix: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="12" y1="19" x2="12" y2="19.01"></line><path d="M8 13h8M8 9h8M8 17h8M12 19v-10"></path></svg>`,
  check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  painel: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>`,
  predio: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="1"></rect><path d="M3 8V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"></path><rect x="7" y="12" width="4" height="9"></rect><rect x="13" y="12" width="4" height="9"></rect></svg>`,
  // Ícones adicionais para compatibilidade
  'check-circle': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="16 8 12 12 8 10"></polyline></svg>`,
  edificio: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="1"></rect><path d="M3 8V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"></path><rect x="7" y="12" width="4" height="9"></rect><rect x="13" y="12" width="4" height="9"></rect></svg>`,
  pausa: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`,
  play: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
  refresh: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`,
  'usuario-check': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>`,
  'usuario-x': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="6" x2="22" y2="10"></line><line x1="22" y1="6" x2="18" y2="10"></line></svg>`,
  funil: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`,
  'mais-horizontal': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  'check-circulo': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="16 8 12 12 8 10"></polyline></svg>`,
  'usuario-espera': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M12 12v4"></path><path d="M12 16h.01"></path></svg>`,
  megafone: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14v7l10 10 10-10V14L13 2z"></path><path d="M11.6 16.8a3 3 0 1 1 2.8 0"></path></svg>`,
  'grafico-barras': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
  ampulheta: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2h10"></path><path d="M17 22H7"></path><path d="M7 2l5 5"></path><path d="M17 2l-5 5"></path><path d="M7 22l5-5"></path><path d="M17 22l-5-5"></path></svg>`,
  lixo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  download: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  'arquivo-csv': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><text x="10" y="16" font-size="8">CSV</text></svg>`,
  'arquivo-pdf': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><text x="10" y="16" font-size="8">PDF</text></svg>`,
  cartao: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
  visa: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><text x="12" y="16" font-size="12" text-anchor="middle" font-weight="bold" fill="white">VISA</text></svg>`,
  mastercard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="12" r="6" fill="#EB001B"></circle><circle cx="15" cy="12" r="6" fill="#F79E1B"></circle></svg>`,
  elo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><text x="12" y="16" font-size="10" text-anchor="middle" font-weight="bold" fill="white">ELO</text></svg>`,
  amex: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><text x="12" y="16" font-size="10" text-anchor="middle" font-weight="bold" fill="white">AMEX</text></svg>`,
  hipercard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><text x="12" y="16" font-size="8" text-anchor="middle" font-weight="bold" fill="white">HIPER</text></svg>`,
  escudo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7c0 6 8 10 8 10z"></path></svg>`,
  'calendario-mais': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="12" y1="14" x2="12" y2="18"></line><line x1="10" y1="16" x2="14" y2="16"></line></svg>`,
  'calendario-x': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="10" y1="14" x2="14" y2="18"></line><line x1="14" y1="14" x2="10" y2="18"></line></svg>`,
  'calendario-check': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><polyline points="9 14 12 17 16 11"></polyline></svg>`,
  atividade: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"></path><path d="M12 2v9"></path><path d="M4.5 10.5 12 18l7.5-7.5"></path></svg>`,
} as const;