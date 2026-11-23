/**
 * Componente App - Raiz da aplicação com roteamento, providers globais.
 * Configura React Router, ToastProvider, AuthProvider.
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@/componentes';
import { useAuth } from '@/hooks/useAuth';
import { ServiceProvider } from '@/contexto/ServiceProvider';
import './App.css';

// Lazy loading das telas
const Feed = lazy(() => import('./telas/Feed').then((m) => ({ default: m.default })));
const Explorar = lazy(() => import('./telas/Explorar').then((m) => ({ default: m.default })));
const Perfil = lazy(() => import('./telas/Perfil').then((m) => ({ default: m.default })));
const PainelBarbeiro = lazy(() => import('./features/barbeiro/components/PainelBarbeiro').then((m) => ({ default: m.default })));
const PainelAdmin = lazy(() => import('./features/admin/components/PainelAdmin').then((m) => ({ default: m.default })));
const Login = lazy(() => import('./telas/Login').then((m) => ({ default: m.default })));
const Cadastro = lazy(() => import('./telas/Cadastro').then((m) => ({ default: m.default })));
const Estabelecimento = lazy(() => import('./telas/Estabelecimento').then((m) => ({ default: m.default })));
const Agendamento = lazy(() => import('./telas/Agendamento').then((m) => ({ default: m.default })));
const Notificacoes = lazy(() => import('./telas/Notificacoes').then((m) => ({ default: m.default })));
const Configuracoes = lazy(() => import('./telas/Configuracoes').then((m) => ({ default: m.default })));

// Fallback de carregamento
const Carregando = () => (
  <div className="app__carregando" role="status" aria-label="Carregando">
    <div className="app__spinner" aria-hidden="true" />
  </div>
);

/** Wrapper de rota protegida */
const RotaProtegida = ({ children, tiposPermitidos = ['cliente', 'barbeiro', 'admin'] }: {
  children: React.ReactNode;
  tiposPermitidos?: string[];
}) => {
  const { usuario, carregando } = useAuth();

  if (carregando) return <Carregando />;

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  if (!tiposPermitidos.includes(usuario.papel)) {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
};

/** Wrapper de rota pública (redireciona se logado) */
const RotaPublica = ({ children }: { children: React.ReactNode }) => {
  const { usuario, carregando } = useAuth();

  if (carregando) return <Carregando />;

  if (usuario) {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <ServiceProvider>
      <ToastProvider>
        <BrowserRouter>
          <div className="app">
            <Suspense fallback={<Carregando />}>
              <Routes>
                {/* Rotas públicas */}
                <Route path="/login" element={<RotaPublica><Login /></RotaPublica>} />
                <Route path="/cadastro" element={<RotaPublica><Cadastro /></RotaPublica>} />
                <Route path="/recuperar-senha" element={<RotaPublica><div className="pagina-em-construcao">Recuperar senha</div></RotaPublica>} />

                {/* Rotas principais (autenticadas) */}
                <Route
                  path="/feed"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <Feed />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/explorar"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <Explorar />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/perfil"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <Perfil />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/notificacoes"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <Notificacoes />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/configuracoes"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <Configuracoes />
                    </RotaProtegida>
                  }
                />

                {/* Painel Barbeiro */}
                <Route
                  path="/painel/*"
                  element={
                    <RotaProtegida tiposPermitidos={['barbeiro']}>
                      <PainelBarbeiro />
                    </RotaProtegida>
                  }
                />

                {/* Painel Admin */}
                <Route
                  path="/admin/*"
                  element={
                    <RotaProtegida tiposPermitidos={['admin']}>
                      <PainelAdmin />
                    </RotaProtegida>
                  }
                />

                {/* Estabelecimento e Agendamento */}
                <Route
                  path="/estabelecimento/:slug"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <Estabelecimento />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/agendamento/:id"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <Agendamento />
                    </RotaProtegida>
                  }
                />

                {/* Páginas institucionais */}
                <Route path="/sobre" element={<div className="pagina-em-construcao">Sobre nós</div>} />
                <Route path="/privacidade" element={<div className="pagina-em-construcao">Política de Privacidade</div>} />
                <Route path="/termos" element={<div className="pagina-em-construcao">Termos de Uso</div>} />
                <Route path="/contato" element={<div className="pagina-em-construcao">Contato</div>} />

                {/* Redirecionamentos */}
                <Route path="/" element={<Navigate to="/feed" replace />} />
                <Route path="*" element={<Navigate to="/feed" replace />} />
              </Routes>
            </Suspense>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ServiceProvider>
  );
};

export default App;