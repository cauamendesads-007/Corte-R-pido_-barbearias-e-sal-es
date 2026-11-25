/**
 * Tipos do domínio Painel Admin (dashboard administrativo).
 * Re-exporta de @/tipos para fonte única da verdade.
 */

export type {
  Usuario,
  UsuarioRole,
  Estabelecimento,
  EstabelecimentoStatus,
  Agendamento,
  AgendamentoStatus,
  Denuncia,
  DenunciaStatus,
  MetricasAdmin,
  ConfiguracaoSistema,
  LogAuditoria,
} from '@/tipos';

/** Tipos locais para o domínio painel-admin */
export interface PainelAdminState {
  usuarios: Usuario[];
  estabelecimentos: Estabelecimento[];
  agendamentos: Agendamento[];
  denuncias: Denuncia[];
  metricas: MetricasAdmin | null;
  configuracao: ConfiguracaoSistema | null;
  carregando: boolean;
  erro: string | null;
  paginaUsuarios: number;
  proximaPaginaUsuarios: number | null;
  paginaEstabelecimentos: number;
  proximaPaginaEstabelecimentos: number | null;
  paginaAgendamentos: number;
  proximaPaginaAgendamentos: number | null;
  paginaDenuncias: number;
  proximaPaginaDenuncias: number | null;
}

export interface PainelAdminActions {
  // Usuários
  carregarUsuarios: (pagina?: number, filtro?: UsuariosFiltro) => Promise<void>;
  atualizarRoleUsuario: (id: string, role: UsuarioRole) => Promise<void>;
  banirUsuario: (id: string, motivo: string) => Promise<void>;
  desbanirUsuario: (id: string) => Promise<void>;

  // Estabelecimentos
  carregarEstabelecimentos: (pagina?: number, filtro?: EstabelecimentosFiltro) => Promise<void>;
  aprovarEstabelecimento: (id: string) => Promise<void>;
  rejeitarEstabelecimento: (id: string, motivo: string) => Promise<void>;
  suspenderEstabelecimento: (id: string, motivo: string) => Promise<void>;
  reativarEstabelecimento: (id: string) => Promise<void>;

  // Agendamentos
  carregarAgendamentos: (pagina?: number, filtro?: AgendamentosFiltro) => Promise<void>;
  cancelarAgendamentoAdmin: (id: string, motivo: string) => Promise<void>;

  // Denúncias
  carregarDenuncias: (pagina?: number, filtro?: DenunciasFiltro) => Promise<void>;
  resolverDenuncia: (id: string, status: DenunciaStatus, resolucao: string) => Promise<void>;

  // Métricas
  carregarMetricas: () => Promise<void>;

  // Configuração
  carregarConfiguracao: () => Promise<void>;
  atualizarConfiguracao: (config: Partial<ConfiguracaoSistema>) => Promise<void>;

  // Utilitários
  limparErro: () => void;
}

export interface UsuariosFiltro {
  role?: UsuarioRole;
  status?: 'ativo' | 'banido' | 'pendente';
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface EstabelecimentosFiltro {
  status?: EstabelecimentoStatus;
  nicho?: string;
  cidade?: string;
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface AgendamentosFiltro {
  status?: AgendamentoStatus;
  estabelecimentoId?: string;
  clienteId?: string;
  barbeiroId?: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface DenunciasFiltro {
  status?: DenunciaStatus;
  tipo?: string;
  denunciadoId?: string;
  denuncianteId?: string;
  dataInicio?: string;
  dataFim?: string;
}