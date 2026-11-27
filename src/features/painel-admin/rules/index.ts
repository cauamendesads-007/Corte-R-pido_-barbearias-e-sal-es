/**
 * Regras puras de negócio do domínio Painel Admin.
 * Zero dependências de React, < 30 linhas cada, early returns, constantes no topo.
 */

import type {
  Usuario,
  UsuarioRole,
  Estabelecimento,
  EstabelecimentoStatus,
  Denuncia,
  DenunciaStatus,
  MetricasAdmin,
  ConfiguracaoSistema,
} from '../types';

// Constantes
const ROLES_VALIDOS: UsuarioRole[] = ['cliente', 'barbeiro', 'admin'];
const STATUSES_ESTABELECIMENTO: EstabelecimentoStatus[] = ['pendente', 'aprovado', 'rejeitado', 'suspenso'];
const STATUSES_DENUNCIA: DenunciaStatus[] = ['pendente', 'em_analise', 'resolvida', 'arquivada'];
const TRANSICOES_ESTABELECIMENTO: Record<EstabelecimentoStatus, EstabelecimentoStatus[]> = {
  pendente: ['aprovado', 'rejeitado'],
  aprovado: ['suspenso'],
  rejeitado: ['pendente'],
  suspenso: ['aprovado'],
};
const TRANSICOES_DENUNCIA: Record<DenunciaStatus, DenunciaStatus[]> = {
  pendente: ['em_analise', 'arquivada'],
  em_analise: ['resolvida', 'arquivada'],
  resolvida: [],
  arquivada: ['pendente'],
};

/**
 * Valida role de usuário.
 */
export function validarRole(role: string): role is UsuarioRole {
  return ROLES_VALIDOS.includes(role as UsuarioRole);
}

/**
 * Valida transição de status de estabelecimento.
 */
export function validarTransicaoEstabelecimento(atual: EstabelecimentoStatus, novo: EstabelecimentoStatus): string | null {
  if (atual === novo) return 'Status já é o mesmo';
  const permitidas = TRANSICOES_ESTABELECIMENTO[atual] || [];
  if (!permitidas.includes(novo)) {
    return `Transição inválida: ${atual} → ${novo}`;
  }
  return null;
}

/**
 * Valida transição de status de denúncia.
 */
export function validarTransicaoDenuncia(atual: DenunciaStatus, novo: DenunciaStatus): string | null {
  if (atual === novo) return 'Status já é o mesmo';
  const permitidas = TRANSICOES_DENUNCIA[atual] || [];
  if (!permitidas.includes(novo)) {
    return `Transição inválida: ${atual} → ${novo}`;
  }
  return null;
}

/**
 * Valida configuração do sistema.
 */
export function validarConfiguracaoSistema(config: Partial<ConfiguracaoSistema>): string | null {
  if (config.comissaoPlataforma !== undefined && (config.comissaoPlataforma < 0 || config.comissaoPlataforma > 100)) {
    return 'Comissão da plataforma deve ser entre 0% e 100%';
  }
  if (config.limiteAgendamentosDia !== undefined && (config.limiteAgendamentosDia < 1 || config.limiteAgendamentosDia > 100)) {
    return 'Limite de agendamentos por dia deve ser entre 1 e 100';
  }
  if (config.tempoExpiracaoAgendamento !== undefined && (config.tempoExpiracaoAgendamento < 1 || config.tempoExpiracaoAgendamento > 1440)) {
    return 'Tempo de expiração deve ser entre 1 e 1440 minutos';
  }
  return null;
}

/**
 * Calcula comissão da plataforma para um agendamento.
 */
export function calcularComissao(valor: number, percentual: number): number {
  return Math.round(valor * (percentual / 100) * 100) / 100;
}

/**
 * Calcula valor líquido para o barbeiro.
 */
export function calcularValorLiquido(valor: number, comissao: number): number {
  return Math.round((valor - comissao) * 100) / 100;
}

/**
 * Agrupa usuários por role.
 */
export function agruparUsuariosPorRole(usuarios: Usuario[]): Record<UsuarioRole, Usuario[]> {
  return usuarios.reduce((acc, u) => {
    if (!acc[u.role]) acc[u.role] = [];
    acc[u.role].push(u);
    return acc;
  }, {} as Record<UsuarioRole, Usuario[]>);
}

/**
 * Agrupa estabelecimentos por status.
 */
export function agruparEstabelecimentosPorStatus(estabelecimentos: Estabelecimento[]): Record<EstabelecimentoStatus, Estabelecimento[]> {
  return estabelecimentos.reduce((acc, e) => {
    if (!acc[e.status]) acc[e.status] = [];
    acc[e.status].push(e);
    return acc;
  }, {} as Record<EstabelecimentoStatus, Estabelecimento[]>);
}

/**
 * Filtra usuários conforme critérios.
 */
export function filtrarUsuarios(
  usuarios: Usuario[],
  filtro: { role?: UsuarioRole; status?: string; busca?: string; dataInicio?: string; dataFim?: string }
): Usuario[] {
  return usuarios.filter((u) => {
    if (filtro.role && u.role !== filtro.role) return false;
    if (filtro.status) {
      const isBanido = u.banidoEm != null;
      if (filtro.status === 'banido' && !isBanido) return false;
      if (filtro.status === 'ativo' && isBanido) return false;
      if (filtro.status === 'pendente' && u.emailVerificado) return false;
    }
    if (filtro.busca) {
      const termo = filtro.busca.toLowerCase();
      const nome = u.nome.toLowerCase();
      const email = u.email.toLowerCase();
      if (!nome.includes(termo) && !email.includes(termo)) return false;
    }
    if (filtro.dataInicio && new Date(u.criadoEm) < new Date(filtro.dataInicio)) return false;
    if (filtro.dataFim && new Date(u.criadoEm) > new Date(filtro.dataFim)) return false;
    return true;
  });
}

/**
 * Filtra estabelecimentos conforme critérios.
 */
export function filtrarEstabelecimentos(
  estabelecimentos: Estabelecimento[],
  filtro: { status?: EstabelecimentoStatus; nicho?: string; cidade?: string; busca?: string; dataInicio?: string; dataFim?: string }
): Estabelecimento[] {
  return estabelecimentos.filter((e) => {
    if (filtro.status && e.status !== filtro.status) return false;
    if (filtro.nicho && e.nicho !== filtro.nicho) return false;
    if (filtro.cidade && e.cidade !== filtro.cidade) return false;
    if (filtro.busca) {
      const termo = filtro.busca.toLowerCase();
      const nome = e.nome.toLowerCase();
      const responsavel = e.responsavel.toLowerCase();
      if (!nome.includes(termo) && !responsavel.includes(termo)) return false;
    }
    if (filtro.dataInicio && new Date(e.criadoEm) < new Date(filtro.dataInicio)) return false;
    if (filtro.dataFim && new Date(e.criadoEm) > new Date(filtro.dataFim)) return false;
    return true;
  });
}

/**
 * Ordena usuários por data de criação (mais recentes primeiro).
 */
export function ordenarUsuarios(usuarios: Usuario[]): Usuario[] {
  return [...usuarios].sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
}

/**
 * Ordena estabelecimentos por data de criação (mais recentes primeiro).
 */
export function ordenarEstabelecimentosAdmin(estabelecimentos: Estabelecimento[]): Estabelecimento[] {
  return [...estabelecimentos].sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
}

/**
 * Computa métricas derivadas para o admin.
 */
export function computarMetricasAdmin(
  usuarios: Usuario[],
  estabelecimentos: Estabelecimento[],
  agendamentos: any[],
  denuncias: Denuncia[]
): Partial<MetricasAdmin> {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

  const usuariosMes = usuarios.filter((u) => new Date(u.criadoEm) >= inicioMes && new Date(u.criadoEm) <= fimMes);
  const estabelecimentosMes = estabelecimentos.filter((e) => new Date(e.criadoEm) >= inicioMes && new Date(e.criadoEm) <= fimMes);
  const agendamentosMes = agendamentos.filter((a) => new Date(a.criadoEm) >= inicioMes && new Date(a.criadoEm) <= fimMes);
  const denunciasMes = denuncias.filter((d) => new Date(d.criadoEm) >= inicioMes && new Date(d.criadoEm) <= fimMes);

  const faturamentoMes = agendamentosMes
    .filter((a) => a.status === 'concluido')
    .reduce((sum, a) => sum + (a.valorFinal || 0), 0);

  return {
    totalUsuarios: usuarios.length,
    usuariosMes: usuariosMes.length,
    totalBarbeiros: usuarios.filter((u) => u.role === 'barbeiro').length,
    totalClientes: usuarios.filter((u) => u.role === 'cliente').length,
    totalEstabelecimentos: estabelecimentos.length,
    estabelecimentosAprovados: estabelecimentos.filter((e) => e.status === 'aprovado').length,
    estabelecimentosPendentes: estabelecimentos.filter((e) => e.status === 'pendente').length,
    estabelecimentosSuspensos: estabelecimentos.filter((e) => e.status === 'suspenso').length,
    estabelecimentosMes: estabelecimentosMes.length,
    totalAgendamentos: agendamentos.length,
    agendamentosMes: agendamentosMes.length,
    agendamentosConcluidosMes: agendamentosMes.filter((a) => a.status === 'concluido').length,
    agendamentosCanceladosMes: agendamentosMes.filter((a) => a.status === 'cancelado').length,
    faturamentoMes,
    totalDenuncias: denuncias.length,
    denunciasPendentes: denuncias.filter((d) => d.status === 'pendente').length,
    denunciasMes: denunciasMes.length,
    taxaConversaoEstabelecimentos: estabelecimentos.length > 0
      ? Math.round((estabelecimentos.filter((e) => e.status === 'aprovado').length / estabelecimentos.length) * 100)
      : 0,
  };
}

/**
 * Gera slug único para estabelecimento.
 */
export function gerarSlugAdmin(nome: string, existentes: Set<string>): string {
  let slug = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (!existentes.has(slug)) return slug;

  let contador = 1;
  while (existentes.has(`${slug}-${contador}`)) {
    contador++;
  }
  return `${slug}-${contador}`;
}

/**
 * Cria erro padronizado para painel-admin.
 */
export function criarPainelAdminError(mensagem: string, codigo: string = 'PAINEL_ADMIN_ERROR'): Error & { codigo: string } {
  const error = new Error(mensagem) as Error & { codigo: string };
  error.codigo = codigo;
  return error;
}