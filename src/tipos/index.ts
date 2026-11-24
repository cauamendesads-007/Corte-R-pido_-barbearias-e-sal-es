/**
 * Tipos e contratos de dados da aplicação Corte Rápido.
 * Centraliza todas as interfaces para garantir tipagem forte em toda a codebase.
 */

/** Nichos de atuação dos estabelecimentos */
export type NichoEstabelecimento =
  | 'barbearia'
  | 'feminino'
  | 'visagismo'
  | 'infantil';

/** Alias para compatibilidade */
export type Nicho = NichoEstabelecimento;

/** Status de aprovação do estabelecimento na plataforma */
export type StatusEstabelecimento = 'aprovado' | 'pendente' | 'rejeitado';

/** Tipos de layout disponíveis para a página pública */
export type TipoLayout = 'classico' | 'moderno';

/** Papéis de usuário no sistema */
export type PapelUsuario = 'cliente' | 'barbeiro' | 'admin';

/** Alias para compatibilidade */
export type TipoUsuario = PapelUsuario;

/** Status do pagamento de um agendamento */
export type StatusPagamento = 'no_local' | 'aguardando_pix' | 'pago';

/** Tipos de mídia para portfólio */
export type TipoMidia = 'imagem' | 'video';

/** Tipos de notificação */
export type TipoNotificacao = 'agendamento' | 'reagendamento' | 'cancelamento' | 'mensagem' | 'administracao' | 'pagamento';

/** Filtros de busca no marketplace */
export interface FiltrosBusca {
  nicho: NichoEstabelecimento | 'todos';
  precoMaximo: number;
  avaliacaoMinima: number;
  tipoServico: string;
  ordenacao: 'avaliacao' | 'distancia' | 'fila' | 'preco';
  apenasBemAvaliados: boolean;
  apenasVagasHoje: boolean;
  localizacaoUsuario: Coordenadas | null;
}

/** Filtros para listagem de estabelecimentos (admin/barbeiro) */
export interface FiltrosEstabelecimento {
  busca: string;
  nicho: NichoEstabelecimento | 'todos';
  cidade: string;
  ordenacao: 'relevancia' | 'avaliacao' | 'distancia' | 'fila' | 'preco';
  raioKm: number;
  apenasAbertos: boolean;
  avaliacaoMinima: number;
  precoMaximo: number;
}

/** Coordenadas geográficas */
export interface Coordenadas {
  latitude: number;
  longitude: number;
}

/** Tema visual do estabelecimento */
export interface TemaEstabelecimento {
  cor: string;
  layout: TipoLayout;
  titulo: string;
  subtitulo: string;
}

/** Serviço oferecido pelo estabelecimento */
export interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracaoMinutos: number;
  tag: string;
  midias?: MidiaServico[];
}

/** Mídia de exemplo do serviço (foto/vídeo de corte) */
export interface MidiaServico {
  tipo: TipoMidia;
  src: string;
}

/** Item da galeria/portfólio do estabelecimento */
export interface ItemGaleria {
  id?: string;
  src: string;
  tipo?: TipoMidia;
}

/** Avaliação de cliente */
export interface Avaliacao {
  id: string;
  nomeCliente: string;
  estrelas: number;
  comentario: string;
  data: string;
  resposta?: string;
  avatar?: string;
}

/** Fila de espera em tempo real */
export interface PosicaoFila {
  nome: string;
  horarioChegada: string;
}

/** Estabelecimento (barbearia/salão) */
export interface Estabelecimento {
  id: string;
  slug: string;
  nome: string;
  responsavel: string;
  cidade: string;
  nicho: NichoEstabelecimento;
  avaliacao: number;
  status: StatusEstabelecimento;
  latitude: number;
  longitude: number;
  whatsapp: string;
  endereco: string;
  sobre: string;
  tema: TemaEstabelecimento;
  servicos: Servico[];
  galeria: ItemGaleria[];
  fila: PosicaoFila[];
  tempoMedioAtendimento: number;
  horarioFuncionamento: string;
  permiteAutoEdicao: boolean;
  configuracaoPix: ConfiguracaoPix;
  avaliacoes: Avaliacao[];
  seguidores: number;
  taxaFidelidade: number;
}

/** Configuração de recebimento via Pix */
export interface ConfiguracaoPix {
  modo: 'desativado' | 'opcional' | 'obrigatorio';
  chave: string;
  percentualSinal: number;
}

/** Status do agendamento */
export type StatusAgendamento = 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'nao_compareceu';

/** Avaliação dentro do agendamento */
export interface AvaliacaoAgendamento {
  estrelas: number;
  comentario?: string;
  data: string;
}

/** Agendamento/horário marcado */
export interface Agendamento {
  id: string;
  estabelecimentoId: string;
  usuarioId?: string;
  dia: string; // YYYY-MM-DD
  horario: string; // HH:MM
  duracaoMinutos: number;
  nomeCliente: string;
  telefoneCliente: string;
  servicos: string; // nomes concatenados
  valorTotal: number;
  statusPagamento: StatusPagamento;
  status: StatusAgendamento;
  servicoIds: string[];
  avaliacao?: AvaliacaoAgendamento;
}

/** Publicação no feed */
export interface Publicacao {
  id: string;
  estabelecimentoId: string;
  tipo: 'imagem' | 'video' | 'texto';
  src?: string;
  legenda: string;
  tagServico?: string;
  curtidas: string[]; // ids de usuários
  salvos: string[]; // ids de usuários
  visualizacoes: number;
  compartilhamentos: number;
  comentarios: Comentario[];
  dataCriacao: number; // timestamp
  usuarioCurtiu?: boolean;
  usuarioSalvou?: boolean;
}

/** Comentário em publicação */
export interface Comentario {
  id: string;
  nomeAutor: string;
  texto: string;
  dataCriacao: number;
}

/** Usuário do sistema */
export interface Usuario {
  id: string;
  email: string;
  senha: string; // hash em produção
  papel: PapelUsuario;
  nome?: string;
  bio?: string;
  whatsapp?: string;
  cidade?: string;
  avatar?: string;
  estabelecimentoId?: string; // para barbeiros
  confirmado: boolean;
  lembretesWhatsapp: boolean;
  seguindo: string[]; // ids de estabelecimentos
  inspiracoesSalvas: string[]; // ids de publicações
}

/** Estado da sessão atual */
export interface SessaoUsuario {
  papel: PapelUsuario;
  email: string;
  estabelecimentoId?: string;
  nome?: string;
}

/** Notificação */
export interface Notificacao {
  id: string;
  destinatario: string; // email
  tipo: 'agendamento' | 'reagendamento' | 'cancelamento' | 'mensagem' | 'administracao' | 'pagamento';
  titulo: string;
  texto: string;
  lida: boolean;
  dataCriacao: number;
  estabelecimentoId?: string;
}

/** Mensagem automática de WhatsApp */
export interface MensagemAutomatica {
  geral: string;
  porServico: Record<string, string>;
}

/** Plano de assinatura */
export interface PlanoAssinatura {
  id: string;
  nome: string;
  tipo: 'mensal' | 'diario';
  preco: number;
}

/** Assinatura do estabelecimento */
export interface AssinaturaEstabelecimento {
  planoId: string;
  inicioContrato: string; // YYYY-MM-DD
  vencimento: string; // YYYY-MM-DD
  desconto?: DescontoAssinatura;
  historicoPagamentos: PagamentoHistorico[];
}

/** Desconto aplicado na assinatura */
export interface DescontoAssinatura {
  tipo: 'percentual' | 'valor_fixo';
  valor: number;
  motivo?: string;
}

/** Pagamento no histórico */
export interface PagamentoHistorico {
  data: string; // YYYY-MM-DD
  descricao: string;
  valor: number;
}

/** Estado global da aplicação (para store) */
export interface EstadoGlobal {
  estabelecimentos: Estabelecimento[];
  usuarios: Usuario[];
  agendamentos: Record<string, Agendamento[]>; // key = estabelecimentoId
  publicacoes: Publicacao[];
  notificacoes: Notificacao[];
  planos: PlanoAssinatura[];
  assinaturas: Record<string, AssinaturaEstabelecimento>;
  sessao: SessaoUsuario | null;
  filtrosBusca: FiltrosBusca;
  abaBarbeiroAtiva: string;
  abaAdminAtiva: string;
  abaClienteAtiva: string;
  filtroFeed: string;
  filtroNotificacoes: string;
  estabelecimentoAdminSelecionado: string | null;
  planoPagamentoVisivel: boolean;
}

/** Resultado de serviço assíncrono */
export interface ResultadoServico<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
}

/** Props base para componentes de UI */
export interface PropsComponenteBase {
  className?: string;
  'data-testid'?: string;
}

/** Props para componentes de botão */
export interface PropsBotao extends PropsComponenteBase {
  variante?: 'primario' | 'secundario' | 'perigo' | 'fantasma';
  tamanho?: 'pequeno' | 'medio' | 'grande';
  desabilitado?: boolean;
  carregando?: boolean;
  aoClicar?: () => void;
  tipo?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/** Props para componentes de input */
export interface PropsCampoTexto extends PropsComponenteBase {
  label: string;
  tipo?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'search' | 'time' | 'date' | 'url';
  placeholder?: string;
  valor: string;
  aoAlterar: (_valor: string) => void;
  erro?: string;
  ajuda?: string;
  desabilitado?: boolean;
  obrigatorio?: boolean;
  id?: string;
  autoComplete?: string;
  inputMode?: string;
  maxLength?: number;
  autoFocus?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

/** Props para card de estabelecimento */
export interface PropsCartaoEstabelecimento extends PropsComponenteBase {
  estabelecimento: Estabelecimento;
  distanciaKm?: number;
  horarioDisponivelHoje?: string;
  aoClicar?: () => void;
}

/** Props para modal */
export interface PropsModal extends PropsComponenteBase {
  aberto: boolean;
  aoFechar: () => void;
  titulo?: string;
  children: React.ReactNode;
  tamanho?: 'pequeno' | 'medio' | 'grande' | 'tela-cheia';
  fecharComEsc?: boolean;
  fecharNoBackdrop?: boolean;
  ariaLabel?: string;
}

/** Props para toast */
export interface PropsToast {
  id: string;
  mensagem: string;
  tipo: 'sucesso' | 'erro' | 'aviso' | 'info';
  acao?: { label: string; aoClicar: () => void };
  duracao?: number;
}

/** Props para skeleton de carregamento */
export interface PropsSkeleton extends PropsComponenteBase {
  variante?: 'texto' | 'circular' | 'retangular' | 'cartao';
  linhas?: number;
  largura?: string;
  altura?: string;
}