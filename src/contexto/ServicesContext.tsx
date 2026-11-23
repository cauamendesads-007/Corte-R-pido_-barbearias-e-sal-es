/**
 * Services Context - Context para injeção de dependência dos serviços (DIP).
 * Separado do ServiceProvider para evitar warnings do react-refresh.
 */

import { createContext } from 'react';
import type { IAuthService } from '@/features/auth/services/IAuthService';
import type { IEstabelecimentosService } from '@/features/estabelecimentos/services/IEstabelecimentosService';
import type { IAgendamentosService } from '@/features/agendamentos/services/IAgendamentosService';
import type { IFeedService } from '@/features/feed/services/IFeedService';
import type { INotificacoesService } from '@/features/notificacoes/services/INotificacoesService';
import type { IPerfilService } from '@/features/perfil/services/IPerfilService';
import type { IBarbeiroService } from '@/features/barbeiro/services/IBarbeiroService';
import type { IAdminService } from '@/features/admin/services/IAdminService';
import type { IMensagensService } from '@/features/mensagens/services/IMensagensService';

export interface Services {
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

export const ServicesContext = createContext<Services | null>(null);