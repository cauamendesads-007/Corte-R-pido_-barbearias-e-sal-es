/**
 * Service Hooks - Hooks individuais para cada serviço.
 * Separo do ServiceProvider para evitar warnings do react-refresh.
 */

import { useContext } from 'react';
import { ServicesContext } from './ServicesContext';
import type { IAuthService } from '@/features/auth/services/IAuthService';
import type { IEstabelecimentosService } from '@/features/estabelecimentos/services/IEstabelecimentosService';
import type { IAgendamentosService } from '@/features/agendamentos/services/IAgendamentosService';
import type { IFeedService } from '@/features/feed/services/IFeedService';
import type { INotificacoesService } from '@/features/notificacoes/services/INotificacoesService';
import type { IPerfilService } from '@/features/perfil/services/IPerfilService';
import type { IBarbeiroService } from '@/features/barbeiro/services/IBarbeiroService';
import type { IAdminService } from '@/features/admin/services/IAdminService';
import type { IMensagensService } from '@/features/mensagens/services/IMensagensService';

interface Services {
  auth: IAuthService;
  estabelecimentos: IEstabelecimentosService;
  agendamentos: IAgendamentosService;
  feed: IFeedService;
  notificacoes: INotificacoesService;
  perfil: IPerfilService;
  barbeiro: IBarbeiroService;
  admin: IAdminService;
  mensagens: IMensagensService;
}

function useServices(): Services {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices deve ser usado dentro de ServiceProvider');
  }
  return context;
}

// Hooks individuais para cada serviço (facilita migração gradual)
export function useAuthService(): IAuthService {
  return useServices().auth;
}

export function useEstabelecimentosService(): IEstabelecimentosService {
  return useServices().estabelecimentos;
}

export function useAgendamentosService(): IAgendamentosService {
  return useServices().agendamentos;
}

export function useFeedService(): IFeedService {
  return useServices().feed;
}

export function useNotificacoesService(): INotificacoesService {
  return useServices().notificacoes;
}

export function usePerfilService(): IPerfilService {
  return useServices().perfil;
}

export function useBarbeiroService(): IBarbeiroService {
  return useServices().barbeiro;
}

export function useAdminService(): IAdminService {
  return useServices().admin;
}

export function useMensagensService(): IMensagensService {
  return useServices().mensagens;
}