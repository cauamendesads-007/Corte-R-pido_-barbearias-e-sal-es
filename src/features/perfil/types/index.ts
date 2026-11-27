/**
 * Tipos do domínio Perfil - Perfil do usuário.
 */

export type AbaPerfil = 'visao' | 'agendamentos' | 'inspiracoes' | 'configuracoes';

export interface DadosEdicaoPerfil {
  nome: string;
  email: string;
  telefone: string;
  bio: string;
  avatar?: string;
}

export interface AbaConfig {
  id: AbaPerfil;
  rotulo: string;
  icone: string;
  contador?: number;
}

export const ABA_PERFIL_CONFIG: AbaConfig[] = [
  { id: 'visao', rotulo: 'Visão geral', icone: '👤', contador: undefined },
  { id: 'agendamentos', rotulo: 'Agendamentos', icone: '📅', contador: undefined },
  { id: 'inspiracoes', rotulo: 'Inspirações', icone: '❤️', contador: undefined },
  { id: 'configuracoes', rotulo: 'Configurações', icone: '⚙️', contador: undefined },
];