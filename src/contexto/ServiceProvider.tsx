/**
 * Service Provider - Injeção de dependência para serviços (DIP).
 * Fornece implementações mock/real via React Context.
 * Usa Supabase quando VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configurados.
 */

import { useMemo, ReactNode } from 'react';
import { ServicesContext, type Services } from './ServicesContext';
import { isSupabaseAvailable } from '@/servicos/supabase/client';

// Mock services (fallback)
import { AuthServiceMock } from '@/features/auth/services/AuthServiceMock';
import { EstabelecimentosServiceMock } from '@/features/estabelecimentos/services/EstabelecimentosServiceMock';
import { AgendamentosServiceMock } from '@/features/agendamentos/services/AgendamentosServiceMock';
import { FeedServiceMock } from '@/features/feed/services/FeedServiceMock';
import { NotificacoesServiceMock } from '@/features/notificacoes/services/NotificacoesServiceMock';
import { PerfilServiceMock } from '@/features/perfil/services/PerfilServiceMock';
import { BarbeiroServiceMock } from '@/features/barbeiro/services/BarbeiroServiceMock';
import { AdminServiceMock } from '@/features/admin/services/AdminServiceMock';
import { MensagensServiceMock } from '@/features/mensagens/services/MensagensServiceMock';

// Supabase services (real)
import { SupabaseAuthService } from '@/features/auth/services/SupabaseAuthService';
import { SupabaseEstabelecimentosService } from '@/features/estabelecimentos/services/SupabaseEstabelecimentosService';
import { SupabaseAgendamentosService } from '@/features/agendamentos/services/SupabaseAgendamentosService';
import { SupabaseFeedService } from '@/features/feed/services/SupabaseFeedService';
import { SupabaseNotificacoesService } from '@/features/notificacoes/services/SupabaseNotificacoesService';
import { SupabasePerfilService } from '@/features/perfil/services/SupabasePerfilService';
import { SupabaseBarbeiroService } from '@/features/barbeiro/services/SupabaseBarbeiroService';
import { SupabaseAdminService } from '@/features/admin/services/SupabaseAdminService';
import { SupabaseMensagensService } from '@/features/mensagens/services/SupabaseMensagensService';

export function ServiceProvider({ children }: { children: ReactNode }) {
  const useSupabase = isSupabaseAvailable();

  const services = useMemo<Services>(() => {
    if (useSupabase) {
      console.log('[ServiceProvider] Usando serviços Supabase (produção)');
      return {
        auth: new SupabaseAuthService(),
        estabelecimentos: new SupabaseEstabelecimentosService(),
        agendamentos: new SupabaseAgendamentosService(),
        feed: new SupabaseFeedService(),
        notificacoes: new SupabaseNotificacoesService(),
        perfil: new SupabasePerfilService(),
        barbeiro: new SupabaseBarbeiroService(),
        admin: new SupabaseAdminService(),
        mensagens: new SupabaseMensagensService(),
      };
    }

    console.log('[ServiceProvider] Usando serviços Mock (desenvolvimento)');
    return {
      auth: new AuthServiceMock(),
      estabelecimentos: new EstabelecimentosServiceMock(),
      agendamentos: new AgendamentosServiceMock(),
      feed: new FeedServiceMock(),
      notificacoes: new NotificacoesServiceMock(),
      perfil: new PerfilServiceMock(),
      barbeiro: new BarbeiroServiceMock(),
      admin: new AdminServiceMock(),
      mensagens: new MensagensServiceMock(),
    };
  }, [useSupabase]);

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}