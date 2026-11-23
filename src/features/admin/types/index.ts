/**
 * Tipos do domínio Admin - Painel administrativo.
 */

export type AbaAdmin = 'visao' | 'estabelecimentos' | 'usuarios' | 'analises' | 'configuracoes';

export interface EstabelecimentoAdmin {
  id: string;
  nome: string;
  proprietario: string;
  cidade: string;
  nicho: string;
  status: 'ativo' | 'pendente' | 'suspenso';
  plano: 'essencial' | 'profissional' | 'premium';
  agendamentosMes: number;
  avaliacao: number;
  dataCadastro: string;
}

export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  papel: 'cliente' | 'barbeiro' | 'admin';
  estabelecimento: string;
  status: 'ativo' | 'suspenso';
  dataCadastro: string;
}

export interface PlanoAdmin {
  id: 'essencial' | 'profissional' | 'premium';
  nome: string;
  preco: number;
  cor: string;
  limites: {
    barbeiros: number;
    servicos: number;
    fotos: number;
    analises: boolean;
    api: boolean;
  };
}

export interface MetricasAdminData {
  totalEstabelecimentos: number;
  ativos: number;
  pendentes: number;
  suspensos: number;
  totalUsuarios: number;
  barbeiros: number;
  clientes: number;
  agendamentosMes: number;
  receitaEstimada: number;
}

export const ABA_ADMIN_LABELS: Record<AbaAdmin, string> = {
  visao: 'Visão geral',
  estabelecimentos: 'Estabelecimentos',
  usuarios: 'Usuários',
  analises: 'Análises',
  configuracoes: 'Configurações',
};

export const ABA_ADMIN_ICONES: Record<AbaAdmin, string> = {
  visao: '📊',
  estabelecimentos: '🏢',
  usuarios: '👥',
  analises: '📈',
  configuracoes: '⚙️',
};

export const PLANOS_ADMIN: PlanoAdmin[] = [
  { id: 'essencial', nome: 'Essencial', preco: 49, cor: '#64748b', limites: { barbeiros: 1, servicos: 10, fotos: 20, analises: false, api: false } },
  { id: 'profissional', nome: 'Profissional', preco: 99, cor: '#0ea5e9', limites: { barbeiros: 3, servicos: 50, fotos: 100, analises: true, api: false } },
  { id: 'premium', nome: 'Premium', preco: 199, cor: '#f59e0b', limites: { barbeiros: 10, servicos: -1, fotos: -1, analises: true, api: true } },
];