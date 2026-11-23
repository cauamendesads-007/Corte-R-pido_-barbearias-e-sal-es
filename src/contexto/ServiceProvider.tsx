/**
 * Service Provider - Injeção de dependência para serviços (DIP).
 * Fornece implementações mock/real via React Context.
 */

import { useMemo, ReactNode } from 'react';
import { ServicesContext, type Services } from './ServicesContext';
import { AuthServiceMock } from '@/features/auth/services/AuthServiceMock';
import { EstabelecimentosServiceMock } from '@/features/estabelecimentos/services/EstabelecimentosServiceMock';
import { AgendamentosServiceMock } from '@/features/agendamentos/services/AgendamentosServiceMock';
import { FeedServiceMock } from '@/features/feed/services/FeedServiceMock';
import { NotificacoesServiceMock } from '@/features/notificacoes/services/NotificacoesServiceMock';
import { PerfilServiceMock } from '@/features/perfil/services/PerfilServiceMock';
import { BarbeiroServiceMock } from '@/features/barbeiro/services/BarbeiroServiceMock';
import { AdminServiceMock } from '@/features/admin/services/AdminServiceMock';
import { MensagensServiceMock } from '@/features/mensagens/services/MensagensServiceMock';

export function ServiceProvider({ children }: { children: ReactNode }) {
  const services = useMemo<Services>(() => ({
    auth: new AuthServiceMock(),
    estabelecimentos: new EstabelecimentosServiceMock(),
    agendamentos: new AgendamentosServiceMock(),
    feed: new FeedServiceMock(),
    notificacoes: new NotificacoesServiceMock(),
    perfil: new PerfilServiceMock(),
    barbeiro: new BarbeiroServiceMock(),
    admin: new AdminServiceMock(),
    mensagens: new MensagensServiceMock(),
  }), []);

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}