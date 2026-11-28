// ============================================================================
// TIPOS DO BANCO DE DADOS (GERADOS DO SCHEMA SUPABASE)
// Tipagem forte para todas as tabelas e RPCs
// ============================================================================

// Enums
export type NichoEstabelecimento = 'barbearia' | 'feminino' | 'visagismo' | 'infantil';
export type StatusEstabelecimento = 'aprovado' | 'pendente' | 'rejeitado';
export type TipoLayout = 'classico' | 'moderno';
export type PapelUsuario = 'cliente' | 'barbeiro' | 'admin';
export type StatusPagamento = 'no_local' | 'aguardando_pix' | 'pago';
export type StatusAgendamento = 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'nao_compareceu';
export type TipoMidia = 'imagem' | 'video';
export type PublicacaoTipo = 'corte' | 'barba' | 'combo' | 'inspiracao' | 'dica' | 'outro';
export type TipoNotificacao = 'agendamento' | 'reagendamento' | 'cancelamento' | 'mensagem' | 'administracao' | 'pagamento';
export type InspiracaoCategoria = 'classico' | 'moderno' | 'degrade' | 'barba' | 'colorido' | 'infantil' | 'outro';
export type PlanoTipo = 'mensal' | 'diario';
export type WebhookTipo = 'pagamento_agendamento' | 'pagamento_assinatura';
export type AuditAcao = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'anonymize';

// ============================================================================
// TABELAS PRINCIPAIS
// ============================================================================

export interface UsuariosRow {
  id: string;
  email: string;
  papel: PapelUsuario;
  nome: string | null;
  bio: string | null;
  whatsapp: string | null;
  cidade: string | null;
  avatar: string | null;
  estabelecimento_id: string | null;
  confirmado: boolean;
  lembretes_whatsapp: boolean;
  seguindo: string[] | null;
  inspiracao_salvas: string[] | null;
  cpf: string | null;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface UsuariosInsert {
  id: string;
  email: string;
  papel?: PapelUsuario;
  nome?: string | null;
  bio?: string | null;
  whatsapp?: string | null;
  cidade?: string | null;
  avatar?: string | null;
  estabelecimento_id?: string | null;
  confirmado?: boolean;
  lembretes_whatsapp?: boolean;
  seguindo?: string[] | null;
  inspiracao_salvas?: string[] | null;
  cpf?: string | null;
  data_cadastro?: string;
  data_atualizacao?: string;
}

export interface UsuariosUpdate {
  email?: string;
  papel?: PapelUsuario;
  nome?: string | null;
  bio?: string | null;
  whatsapp?: string | null;
  cidade?: string | null;
  avatar?: string | null;
  estabelecimento_id?: string | null;
  confirmado?: boolean;
  lembretes_whatsapp?: boolean;
  seguindo?: string[] | null;
  inspiracao_salvas?: string[] | null;
  cpf?: string | null;
  data_atualizacao?: string;
}

export interface EstabelecimentosRow {
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
  sobre: string | null;
  tema_cor: string;
  tema_layout: TipoLayout;
  tema_titulo: string | null;
  tema_subtitulo: string | null;
  tempo_medio_atendimento: number;
  horario_funcionamento: string;
  permite_auto_edicao: boolean;
  configuracao_pix_modo: string;
  configuracao_pix_chave: string | null;
  configuracao_pix_percentual_sinal: number;
  seguidores: number;
  taxa_fidelidade: number;
  data_criacao: string;
  data_atualizacao: string;
}

export interface EstabelecimentosInsert {
  id?: string;
  slug: string;
  nome: string;
  responsavel: string;
  cidade: string;
  nicho: NichoEstabelecimento;
  avaliacao?: number;
  status?: StatusEstabelecimento;
  latitude: number;
  longitude: number;
  whatsapp: string;
  endereco: string;
  sobre?: string | null;
  tema_cor?: string;
  tema_layout?: TipoLayout;
  tema_titulo?: string | null;
  tema_subtitulo?: string | null;
  tempo_medio_atendimento?: number;
  horario_funcionamento?: string;
  permite_auto_edicao?: boolean;
  configuracao_pix_modo?: string;
  configuracao_pix_chave?: string | null;
  configuracao_pix_percentual_sinal?: number;
  seguidores?: number;
  taxa_fidelidade?: number;
  data_criacao?: string;
  data_atualizacao?: string;
}

export interface EstabelecimentosUpdate {
  slug?: string;
  nome?: string;
  responsavel?: string;
  cidade?: string;
  nicho?: NichoEstabelecimento;
  avaliacao?: number;
  status?: StatusEstabelecimento;
  latitude?: number;
  longitude?: number;
  whatsapp?: string;
  endereco?: string;
  sobre?: string | null;
  tema_cor?: string;
  tema_layout?: TipoLayout;
  tema_titulo?: string | null;
  tema_subtitulo?: string | null;
  tempo_medio_atendimento?: number;
  horario_funcionamento?: string;
  permite_auto_edicao?: boolean;
  configuracao_pix_modo?: string;
  configuracao_pix_chave?: string | null;
  configuracao_pix_percentual_sinal?: number;
  seguidores?: number;
  taxa_fidelidade?: number;
  data_atualizacao?: string;
}

export interface ProfissionaisRow {
  id: string;
  estabelecimento_id: string;
  usuario_id: string | null;
  nome: string;
  apelido: string | null;
  foto: string | null;
  especialidades: string[] | null;
  ativo: boolean;
  ordem_exibicao: number;
  data_criacao: string;
  data_atualizacao: string;
}

export interface ProfissionaisInsert {
  id?: string;
  estabelecimento_id: string;
  usuario_id?: string | null;
  nome: string;
  apelido?: string | null;
  foto?: string | null;
  especialidades?: string[] | null;
  ativo?: boolean;
  ordem_exibicao?: number;
  data_criacao?: string;
  data_atualizacao?: string;
}

export interface ProfissionaisUpdate {
  estabelecimento_id?: string;
  usuario_id?: string | null;
  nome?: string;
  apelido?: string | null;
  foto?: string | null;
  especialidades?: string[] | null;
  ativo?: boolean;
  ordem_exibicao?: number;
  data_atualizacao?: string;
}

export interface HorariosFuncionamentoRow {
  id: string;
  profissional_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  intervalo_minutos: number;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

export interface HorariosFuncionamentoInsert {
  id?: string;
  profissional_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  intervalo_minutos?: number;
  ativo?: boolean;
  data_criacao?: string;
  data_atualizacao?: string;
}

export interface HorariosFuncionamentoUpdate {
  profissional_id?: string;
  dia_semana?: number;
  hora_inicio?: string;
  hora_fim?: string;
  intervalo_minutos?: number;
  ativo?: boolean;
  data_atualizacao?: string;
}

export interface BloqueiosAgendaRow {
  id: string;
  profissional_id: string;
  inicio: string;
  fim: string;
  motivo: string | null;
  data_criacao: string;
}

export interface BloqueiosAgendaInsert {
  id?: string;
  profissional_id: string;
  inicio: string;
  fim: string;
  motivo?: string | null;
  data_criacao?: string;
}

export interface BloqueiosAgendaUpdate {
  profissional_id?: string;
  inicio?: string;
  fim?: string;
  motivo?: string | null;
}

export interface ServicosRow {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao: string | null;
  preco_centavos: number;
  duracao_min: number;
  tag: string;
  ativo: boolean;
  ordem_exibicao: number;
  data_criacao: string;
  data_atualizacao: string;
}

export interface ServicosInsert {
  id?: string;
  estabelecimento_id: string;
  nome: string;
  descricao?: string | null;
  preco_centavos: number;
  duracao_min: number;
  tag: string;
  ativo?: boolean;
  ordem_exibicao?: number;
  data_criacao?: string;
  data_atualizacao?: string;
}

export interface ServicosUpdate {
  estabelecimento_id?: string;
  nome?: string;
  descricao?: string | null;
  preco_centavos?: number;
  duracao_min?: number;
  tag?: string;
  ativo?: boolean;
  ordem_exibicao?: number;
  data_atualizacao?: string;
}

export interface ServicoMidiasRow {
  id: string;
  servico_id: string;
  tipo: TipoMidia;
  src: string;
  alt: string | null;
  thumbnail: string | null;
  ordem: number;
  data_criacao: string;
}

export interface ServicoMidiasInsert {
  id?: string;
  servico_id: string;
  tipo: TipoMidia;
  src: string;
  alt?: string | null;
  thumbnail?: string | null;
  ordem?: number;
  data_criacao?: string;
}

export interface AgendamentosRow {
  id: string;
  estabelecimento_id: string;
  profissional_id: string;
  usuario_id: string | null;
  dia: string;
  horario: string;
  duracao_min: number;
  nome_cliente: string;
  telefone_cliente: string;
  servicos: string;
  valor_total_centavos: number;
  status_pagamento: StatusPagamento;
  status: StatusAgendamento;
  servico_ids: string[] | null;
  observacoes: string | null;
  avaliacao_estrelas: number | null;
  avaliacao_comentario: string | null;
  avaliacao_data: string | null;
  data_criacao: string;
  data_atualizacao: string;
}

export interface AgendamentosInsert {
  id?: string;
  estabelecimento_id: string;
  profissional_id: string;
  usuario_id?: string | null;
  dia: string;
  horario: string;
  duracao_min: number;
  nome_cliente: string;
  telefone_cliente: string;
  servicos: string;
  valor_total_centavos: number;
  status_pagamento?: StatusPagamento;
  status?: StatusAgendamento;
  servico_ids?: string[] | null;
  observacoes?: string | null;
  avaliacao_estrelas?: number | null;
  avaliacao_comentario?: string | null;
  avaliacao_data?: string | null;
  data_criacao?: string;
  data_atualizacao?: string;
}

export interface AgendamentosUpdate {
  estabelecimento_id?: string;
  profissional_id?: string;
  usuario_id?: string | null;
  dia?: string;
  horario?: string;
  duracao_min?: number;
  nome_cliente?: string;
  telefone_cliente?: string;
  servicos?: string;
  valor_total_centavos?: number;
  status_pagamento?: StatusPagamento;
  status?: StatusAgendamento;
  servico_ids?: string[] | null;
  observacoes?: string | null;
  avaliacao_estrelas?: number | null;
  avaliacao_comentario?: string | null;
  avaliacao_data?: string | null;
  data_atualizacao?: string;
}

export interface ItemAgendamentoRow {
  id: string;
  agendamento_id: string;
  servico_id: string;
  preco_cobrado_centavos: number;
  duracao_min: number;
  ordem: number;
  data_criacao: string;
}

export interface ItemAgendamentoInsert {
  id?: string;
  agendamento_id: string;
  servico_id: string;
  preco_cobrado_centavos: number;
  duracao_min: number;
  ordem?: number;
  data_criacao?: string;
}

export interface ItemAgendamentoUpdate {
  agendamento_id?: string;
  servico_id?: string;
  preco_cobrado_centavos?: number;
  duracao_min?: number;
  ordem?: number;
}

export interface GaleriaRow {
  id: string;
  estabelecimento_id: string;
  src: string;
  tipo: TipoMidia;
  ordem: number;
  data_criacao: string;
}

export interface GaleriaInsert {
  id?: string;
  estabelecimento_id: string;
  src: string;
  tipo?: TipoMidia;
  ordem?: number;
  data_criacao?: string;
}

export interface GaleriaUpdate {
  estabelecimento_id?: string;
  src?: string;
  tipo?: TipoMidia;
  ordem?: number;
}

export interface AvaliacoesRow {
  id: string;
  estabelecimento_id: string;
  agendamento_id: string | null;
  usuario_id: string | null;
  nome_cliente: string;
  estrelas: number;
  comentario: string | null;
  resposta: string | null;
  resposta_data: string | null;
  data_criacao: string;
}

export interface AvaliacoesInsert {
  id?: string;
  estabelecimento_id: string;
  agendamento_id?: string | null;
  usuario_id?: string | null;
  nome_cliente: string;
  estrelas: number;
  comentario?: string | null;
  resposta?: string | null;
  resposta_data?: string | null;
  data_criacao?: string;
}

export interface AvaliacoesUpdate {
  estabelecimento_id?: string;
  agendamento_id?: string | null;
  usuario_id?: string | null;
  nome_cliente?: string;
  estrelas?: number;
  comentario?: string | null;
  resposta?: string | null;
  resposta_data?: string | null;
}

export interface PublicacoesRow {
  id: string;
  estabelecimento_id: string;
  autor_id: string | null;
  autor_nome: string;
  autor_avatar: string | null;
  tipo: PublicacaoTipo;
  legenda: string;
  tag_servico: string | null;
  curtidas: number;
  salvos: number;
  visualizacoes: number;
  compartilhamentos: number;
  comentarios_count: number;
  data_criacao: string;
}

export interface PublicacoesInsert {
  id?: string;
  estabelecimento_id: string;
  autor_id?: string | null;
  autor_nome: string;
  autor_avatar?: string | null;
  tipo: PublicacaoTipo;
  legenda: string;
  tag_servico?: string | null;
  curtidas?: number;
  salvos?: number;
  visualizacoes?: number;
  compartilhamentos?: number;
  comentarios_count?: number;
  data_criacao?: string;
}

export interface PublicacoesUpdate {
  estabelecimento_id?: string;
  autor_id?: string | null;
  autor_nome?: string;
  autor_avatar?: string | null;
  tipo?: PublicacaoTipo;
  legenda?: string;
  tag_servico?: string | null;
  curtidas?: number;
  salvos?: number;
  visualizacoes?: number;
  compartilhamentos?: number;
  comentarios_count?: number;
}

export interface PublicacaoMidiasRow {
  id: string;
  publicacao_id: string;
  tipo: TipoMidia;
  src: string;
  alt: string | null;
  thumbnail: string | null;
  ordem: number;
  data_criacao: string;
}

export interface PublicacaoMidiasInsert {
  id?: string;
  publicacao_id: string;
  tipo: TipoMidia;
  src: string;
  alt?: string | null;
  thumbnail?: string | null;
  ordem?: number;
  data_criacao?: string;
}

export interface CurtidasRow {
  id: string;
  publicacao_id: string;
  usuario_id: string;
  data_criacao: string;
}

export interface CurtidasInsert {
  id?: string;
  publicacao_id: string;
  usuario_id: string;
  data_criacao?: string;
}

export interface SalvosRow {
  id: string;
  publicacao_id: string;
  usuario_id: string;
  data_criacao: string;
}

export interface SalvosInsert {
  id?: string;
  publicacao_id: string;
  usuario_id: string;
  data_criacao?: string;
}

export interface ComentariosRow {
  id: string;
  publicacao_id: string;
  autor_id: string | null;
  autor_nome: string;
  autor_avatar: string | null;
  texto: string;
  data_criacao: string;
}

export interface ComentariosInsert {
  id?: string;
  publicacao_id: string;
  autor_id?: string | null;
  autor_nome: string;
  autor_avatar?: string | null;
  texto: string;
  data_criacao?: string;
}

export interface ComentariosUpdate {
  publicacao_id?: string;
  autor_id?: string | null;
  autor_nome?: string;
  autor_avatar?: string | null;
  texto?: string;
}

export interface InspiracaoesRow {
  id: string;
  titulo: string;
  categoria: InspiracaoCategoria;
  descricao: string | null;
  autor_id: string | null;
  autor_nome: string;
  autor_avatar: string | null;
  curtidas: number;
  data_criacao: string;
}

export interface InspiracaoesInsert {
  id?: string;
  titulo: string;
  categoria: InspiracaoCategoria;
  descricao?: string | null;
  autor_id?: string | null;
  autor_nome: string;
  autor_avatar?: string | null;
  curtidas?: number;
  data_criacao?: string;
}

export interface InspiracaoesUpdate {
  titulo?: string;
  categoria?: InspiracaoCategoria;
  descricao?: string | null;
  autor_id?: string | null;
  autor_nome?: string;
  autor_avatar?: string | null;
  curtidas?: number;
}

export interface InspiracaoMidiasRow {
  id: string;
  inspiracao_id: string;
  tipo: TipoMidia;
  src: string;
  ordem: number;
  data_criacao: string;
}

export interface InspiracaoMidiasInsert {
  id?: string;
  inspiracao_id: string;
  tipo: TipoMidia;
  src: string;
  ordem?: number;
  data_criacao?: string;
}

export interface SeguidoresRow {
  id: string;
  usuario_id: string;
  estabelecimento_id: string;
  data_criacao: string;
}

export interface SeguidoresInsert {
  id?: string;
  usuario_id: string;
  estabelecimento_id: string;
  data_criacao?: string;
}

export interface PlanosAssinaturaRow {
  id: string;
  nome: string;
  tipo: PlanoTipo;
  preco_centavos: number;
  descricao: string | null;
  funcionalidades: any[] | null;
  ativo: boolean;
  ordem_exibicao: number;
  data_criacao: string;
  data_atualizacao: string;
}

export interface PlanosAssinaturaInsert {
  id?: string;
  nome: string;
  tipo: PlanoTipo;
  preco_centavos: number;
  descricao?: string | null;
  funcionalidades?: any[] | null;
  ativo?: boolean;
  ordem_exibicao?: number;
  data_criacao?: string;
  data_atualizacao?: string;
}

export interface PlanosAssinaturaUpdate {
  nome?: string;
  tipo?: PlanoTipo;
  preco_centavos?: number;
  descricao?: string | null;
  funcionalidades?: any[] | null;
  ativo?: boolean;
  ordem_exibicao?: number;
  data_atualizacao?: string;
}

export interface AssinaturasRow {
  id: string;
  estabelecimento_id: string;
  plano_id: string;
  inicio_contrato: string;
  vencimento: string;
  status: string;
  desconto_tipo: string | null;
  desconto_valor: number | null;
  desconto_motivo: string | null;
  data_criacao: string;
  data_atualizacao: string;
}

export interface AssinaturasInsert {
  id?: string;
  estabelecimento_id: string;
  plano_id: string;
  inicio_contrato: string;
  vencimento: string;
  status?: string;
  desconto_tipo?: string | null;
  desconto_valor?: number | null;
  desconto_motivo?: string | null;
  data_criacao?: string;
  data_atualizacao?: string;
}

export interface AssinaturasUpdate {
  estabelecimento_id?: string;
  plano_id?: string;
  inicio_contrato?: string;
  vencimento?: string;
  status?: string;
  desconto_tipo?: string | null;
  desconto_valor?: number | null;
  desconto_motivo?: string | null;
  data_atualizacao?: string;
}

export interface PagamentosRow {
  id: string;
  estabelecimento_id: string;
  agendamento_id: string | null;
  assinatura_id: string | null;
  tipo: string;
  valor_centavos: number;
  status: string;
  provedor: string | null;
  provedor_transacao_id: string | null;
  pix_qr_code: string | null;
  pix_copia_cola: string | null;
  pix_expiracao: string | null;
  idempotency_key: string | null;
  dados_webhook: any | null;
  data_criacao: string;
  data_confirmacao: string | null;
}

export interface PagamentosInsert {
  id?: string;
  estabelecimento_id: string;
  agendamento_id?: string | null;
  assinatura_id?: string | null;
  tipo: string;
  valor_centavos: number;
  status?: string;
  provedor?: string | null;
  provedor_transacao_id?: string | null;
  pix_qr_code?: string | null;
  pix_copia_cola?: string | null;
  pix_expiracao?: string | null;
  idempotency_key?: string | null;
  dados_webhook?: any | null;
  data_criacao?: string;
  data_confirmacao?: string | null;
}

export interface PagamentosUpdate {
  estabelecimento_id?: string;
  agendamento_id?: string | null;
  assinatura_id?: string | null;
  tipo?: string;
  valor_centavos?: number;
  status?: string;
  provedor?: string | null;
  provedor_transacao_id?: string | null;
  pix_qr_code?: string | null;
  pix_copia_cola?: string | null;
  pix_expiracao?: string | null;
  idempotency_key?: string | null;
  dados_webhook?: any | null;
  data_confirmacao?: string | null;
}

export interface NotificacoesRow {
  id: string;
  destinatario_id: string;
  tipo: TipoNotificacao;
  titulo: string;
  texto: string;
  lida: boolean;
  estabelecimento_id: string | null;
  agendamento_id: string | null;
  dados_adicionais: any | null;
  data_criacao: string;
}

export interface NotificacoesInsert {
  id?: string;
  destinatario_id: string;
  tipo: TipoNotificacao;
  titulo: string;
  texto: string;
  lida?: boolean;
  estabelecimento_id?: string | null;
  agendamento_id?: string | null;
  dados_adicionais?: any | null;
  data_criacao?: string;
}

export interface NotificacoesUpdate {
  destinatario_id?: string;
  tipo?: TipoNotificacao;
  titulo?: string;
  texto?: string;
  lida?: boolean;
  estabelecimento_id?: string | null;
  agendamento_id?: string | null;
  dados_adicionais?: any | null;
}

export interface WebhooksProcessadosRow {
  id: string;
  provedor: string;
  evento_id: string;
  evento_tipo: string;
  payload_hash: string;
  processado_em: string;
  resultado: string;
  erro_mensagem: string | null;
}

export interface WebhooksProcessadosInsert {
  id?: string;
  provedor: string;
  evento_id: string;
  evento_tipo: string;
  payload_hash: string;
  processado_em?: string;
  resultado?: string;
  erro_mensagem?: string | null;
}

export interface AuditLogsRow {
  id: string;
  usuario_id: string | null;
  estabelecimento_id: string | null;
  acao: AuditAcao;
  entidade: string;
  entidade_id: string | null;
  dados_anteriores: any | null;
  dados_novos: any | null;
  ip_address: string | null;
  user_agent: string | null;
  data_criacao: string;
}

export interface AuditLogsInsert {
  id?: string;
  usuario_id?: string | null;
  estabelecimento_id?: string | null;
  acao: AuditAcao;
  entidade: string;
  entidade_id?: string | null;
  dados_anteriores?: any | null;
  dados_novos?: any | null;
  ip_address?: string | null;
  user_agent?: string | null;
  data_criacao?: string;
}

// ============================================================================
// VIEWS
// ============================================================================

export interface VEstabelecimentosPublicosRow {
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
  sobre: string | null;
  tema_cor: string;
  tema_layout: TipoLayout;
  tema_titulo: string | null;
  tema_subtitulo: string | null;
  tempo_medio_atendimento: number;
  horario_funcionamento: string;
  permite_auto_edicao: boolean;
  configuracao_pix_modo: string;
  configuracao_pix_chave: string | null;
  configuracao_pix_percentual_sinal: number;
  seguidores: number;
  taxa_fidelidade: number;
  data_criacao: string;
  data_atualizacao: string;
  seguidores_count: number;
  servicos_count: number;
  profissionais_count: number;
}

export interface VAgendamentosDetalhadosRow {
  id: string;
  estabelecimento_id: string;
  profissional_id: string;
  usuario_id: string | null;
  dia: string;
  horario: string;
  duracao_min: number;
  nome_cliente: string;
  telefone_cliente: string;
  servicos: string;
  valor_total_centavos: number;
  status_pagamento: StatusPagamento;
  status: StatusAgendamento;
  servico_ids: string[] | null;
  observacoes: string | null;
  avaliacao_estrelas: number | null;
  avaliacao_comentario: string | null;
  avaliacao_data: string | null;
  data_criacao: string;
  data_atualizacao: string;
  estabelecimento_nome: string;
  estabelecimento_slug: string;
  profissional_nome: string;
  profissional_apelido: string | null;
  cliente_nome: string | null;
  cliente_email: string | null;
}

// ============================================================================
// RPC RETURN TYPES
// ============================================================================

export interface RpcSlotsDisponiveisResult {
  horario: string;
  disponivel: boolean;
  profissional_nome: string | null;
}

export interface RpcCriarAgendamentoResult {
  agendamento_id: string | null;
  erro: string | null;
}

export interface RpcAnonimizarUsuarioResult {
  // void
}

// ============================================================================
// DATABASE INTERFACE (para tipagem do client)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      usuarios: { Row: UsuariosRow; Insert: UsuariosInsert; Update: UsuariosUpdate };
      estabelecimentos: { Row: EstabelecimentosRow; Insert: EstabelecimentosInsert; Update: EstabelecimentosUpdate };
      profissionais: { Row: ProfissionaisRow; Insert: ProfissionaisInsert; Update: ProfissionaisUpdate };
      horarios_funcionamento: { Row: HorariosFuncionamentoRow; Insert: HorariosFuncionamentoInsert; Update: HorariosFuncionamentoUpdate };
      bloqueios_agenda: { Row: BloqueiosAgendaRow; Insert: BloqueiosAgendaInsert; Update: BloqueiosAgendaUpdate };
      servicos: { Row: ServicosRow; Insert: ServicosInsert; Update: ServicosUpdate };
      servico_midias: { Row: ServicoMidiasRow; Insert: ServicoMidiasInsert; Update: never };
      agendamentos: { Row: AgendamentosRow; Insert: AgendamentosInsert; Update: AgendamentosUpdate };
      item_agendamento: { Row: ItemAgendamentoRow; Insert: ItemAgendamentoInsert; Update: ItemAgendamentoUpdate };
      galeria: { Row: GaleriaRow; Insert: GaleriaInsert; Update: GaleriaUpdate };
      avaliacoes: { Row: AvaliacoesRow; Insert: AvaliacoesInsert; Update: AvaliacoesUpdate };
      publicacoes: { Row: PublicacoesRow; Insert: PublicacoesInsert; Update: PublicacoesUpdate };
      publicacao_midias: { Row: PublicacaoMidiasRow; Insert: PublicacaoMidiasInsert; Update: never };
      curtidas: { Row: CurtidasRow; Insert: CurtidasInsert; Update: never };
      salvos: { Row: SalvosRow; Insert: SalvosInsert; Update: never };
      comentarios: { Row: ComentariosRow; Insert: ComentariosInsert; Update: ComentariosUpdate };
      inspiracaoes: { Row: InspiracaoesRow; Insert: InspiracaoesInsert; Update: InspiracaoesUpdate };
      inspiracao_midias: { Row: InspiracaoMidiasRow; Insert: InspiracaoMidiasInsert; Update: never };
      seguidores: { Row: SeguidoresRow; Insert: SeguidoresInsert; Update: never };
      planos_assinatura: { Row: PlanosAssinaturaRow; Insert: PlanosAssinaturaInsert; Update: PlanosAssinaturaUpdate };
      assinaturas: { Row: AssinaturasRow; Insert: AssinaturasInsert; Update: AssinaturasUpdate };
      pagamentos: { Row: PagamentosRow; Insert: PagamentosInsert; Update: PagamentosUpdate };
      notificacoes: { Row: NotificacoesRow; Insert: NotificacoesInsert; Update: NotificacoesUpdate };
      webhooks_processados: { Row: WebhooksProcessadosRow; Insert: WebhooksProcessadosInsert; Update: never };
      audit_logs: { Row: AuditLogsRow; Insert: AuditLogsInsert; Update: never };
    };
    Views: {
      v_estabelecimentos_publicos: { Row: VEstabelecimentosPublicosRow };
      v_agendamentos_detalhados: { Row: VAgendamentosDetalhadosRow };
    };
    Functions: {
      rpc_slots_disponiveis: {
        Args: { p_profissional_id: string; p_dia: string; p_duracao_min: number };
        Returns: RpcSlotsDisponiveisResult[];
      };
      rpc_criar_agendamento: {
        Args: {
          p_estabelecimento_id: string;
          p_profissional_id: string;
          p_usuario_id: string | null;
          p_dia: string;
          p_horario: string;
          p_duracao_min: number;
          p_nome_cliente: string;
          p_telefone_cliente: string;
          p_servico_ids: string[];
          p_valor_total_centavos: number;
          p_status_pagamento: StatusPagamento;
          p_observacoes: string | null;
        };
        Returns: RpcCriarAgendamentoResult[];
      };
      rpc_anonimizar_usuario: {
        Args: { p_usuario_id: string };
        Returns: void;
      };
    };
    Enums: {
      nicho_estabelecimento: NichoEstabelecimento;
      status_estabelecimento: StatusEstabelecimento;
      tipo_layout: TipoLayout;
      papel_usuario: PapelUsuario;
      status_pagamento: StatusPagamento;
      status_agendamento: StatusAgendamento;
      tipo_midia: TipoMidia;
      publicacao_tipo: PublicacaoTipo;
      tipo_notificacao: TipoNotificacao;
      inspiracao_categoria: InspiracaoCategoria;
      plano_tipo: PlanoTipo;
      webhook_tipo: WebhookTipo;
      audit_acao: AuditAcao;
    };
  };
}