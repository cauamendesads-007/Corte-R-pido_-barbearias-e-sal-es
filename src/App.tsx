/**
 * Componente App - Raiz da aplicação com roteamento, providers globais.
 * Configura React Router, ToastProvider, AuthProvider.
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@/componentes';
import { ErrorBoundary } from '@/componentes';
import { useAuth } from '@/hooks/useAuth';
import { ServiceProvider } from '@/contexto/ServiceProvider';
import './App.css';

// Lazy loading das telas
const Feed = lazy(() => import('./telas/Feed').then((m) => ({ default: m.default })));
const Explorar = lazy(() => import('./telas/Explorar').then((m) => ({ default: m.default })));
const Perfil = lazy(() => import('./features/perfil/components/Perfil').then((m) => ({ default: m.default })));
const PainelBarbeiro = lazy(() => import('./features/barbeiro/components/PainelBarbeiro').then((m) => ({ default: m.default })));
const PainelAdmin = lazy(() => import('./features/admin/components/PainelAdmin').then((m) => ({ default: m.default })));
const Login = lazy(() => import('./telas/Login').then((m) => ({ default: m.default })));
const Cadastro = lazy(() => import('./telas/Cadastro').then((m) => ({ default: m.default })));
const Estabelecimento = lazy(() => import('./telas/Estabelecimento').then((m) => ({ default: m.default })));
const Agendamento = lazy(() => import('./telas/Agendamento').then((m) => ({ default: m.default })));
const Notificacoes = lazy(() => import('./telas/Notificacoes').then((m) => ({ default: m.default })));
const Configuracoes = lazy(() => import('./features/configuracoes/components/Configuracoes').then((m) => ({ default: m.default })));

// Fallback de carregamento
const Carregando = () => (
  <div className="app__carregando" role="status" aria-label="Carregando">
    <div className="app__spinner" aria-hidden="true" />
  </div>
);

/** ErrorBoundary por rota - isola erros em rotas específicas */
const RotaComErrorBoundary = ({ children, fallback }: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <ErrorBoundary
    fallbackRender={({ error, resetErrorBoundary, errorId }) => (
      fallback || (
        <div className="rota-error-boundary" role="alert">
          <div className="rota-error-boundary__conteudo">
            <h2>Erro ao carregar esta página</h2>
            <p>Algo deu errado ao carregar o conteúdo. Tente recarregar ou navegar para outra página.</p>
            <details>
              <summary>Detalhes técnicos</summary>
              <pre>
                <strong>Error ID:</strong> {errorId}
                <br />
                <strong>Mensagem:</strong> {error.message}
              </pre>
            </details>
            <button onClick={resetErrorBoundary} className="botao botao--primario">
              Tentar novamente
            </button>
            <button onClick={() => window.location.href = '/feed'} className="botao botao--secundario">
              Ir para o feed
            </button>
          </div>
        </div>
      )
    )}
  >
    {children}
  </ErrorBoundary>
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

/** ErrorBoundary global - captura erros não tratados em toda a app */
const ErrorBoundaryGlobal = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallbackRender={({ error, resetErrorBoundary, errorId }) => (
      <div className="error-boundary-global" role="alert">
        <div className="error-boundary-global__conteudo">
          <h1>Erro Crítico da Aplicação</h1>
          <p>Ocorreu um erro inesperado que impede o funcionamento da aplicação.</p>
          <details>
            <summary>Detalhes técnicos</summary>
            <pre>
              <strong>Error ID:</strong> {errorId}
              <br />
              <strong>Mensagem:</strong> {error.message}
              <br />
              <strong>Stack:</strong> {error.stack || 'N/A'}
            </pre>
          </details>
          <div className="error-boundary-global__acoes">
            <button onClick={resetErrorBoundary} className="botao botao--primario">
              Tentar Recuperar
            </button>
            <button onClick={() => window.location.reload()} className="botao botao--secundario">
              Recarregar Página
            </button>
          </div>
        </div>
      </div>
    )}
    onError={(error, errorInfo) => {
      // Log para serviço de monitoramento (Sentry, LogRocket, etc.)
      console.error('[ErrorBoundaryGlobal] Erro crítico capturado:', {
        errorId: `global-${Date.now()}`,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      });
    }}
    resetKeys={[]}
  >
    {children}
  </ErrorBoundary>
);

const App = () => {
  return (
    <ServiceProvider>
      <ToastProvider>
        <BrowserRouter>
          <ErrorBoundaryGlobal>
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
                      <RotaComErrorBoundary>
                        <Feed />
                      </RotaComErrorBoundary>
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/explorar"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <RotaComErrorBoundary>
                        <Explorar />
                      </RotaComErrorBoundary>
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/perfil"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <RotaComErrorBoundary>
                        <Perfil />
                      </RotaComErrorBoundary>
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/notificacoes"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <RotaComErrorBoundary>
                        <Notificacoes />
                      </RotaComErrorBoundary>
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/configuracoes"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <RotaComErrorBoundary>
                        <Configuracoes />
                      </RotaComErrorBoundary>
                    </RotaProtegida>
                  }
                />

                {/* Painel Barbeiro */}
                <Route
                  path="/painel/*"
                  element={
                    <RotaProtegida tiposPermitidos={['barbeiro']}>
                      <RotaComErrorBoundary>
                        <PainelBarbeiro />
                      </RotaComErrorBoundary>
                    </RotaProtegida>
                  }
                />

                {/* Painel Admin */}
                <Route
                  path="/admin/*"
                  element={
                    <RotaProtegida tiposPermitidos={['admin']}>
                      <RotaComErrorBoundary>
                        <PainelAdmin />
                      </RotaComErrorBoundary>
                    </RotaProtegida>
                  }
                />

                {/* Estabelecimento e Agendamento */}
                <Route
                  path="/estabelecimento/:slug"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <RotaComErrorBoundary>
                        <Estabelecimento />
                      </RotaComErrorBoundary>
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/agendamento/:id"
                  element={
                    <RotaProtegida tiposPermitidos={['cliente', 'barbeiro', 'admin']}>
                      <RotaComErrorBoundary>
                        <Agendamento />
                      </RotaComErrorBoundary>
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
          </ErrorBoundaryGlobal>
        </BrowserRouter>
      </ToastProvider>
    </ServiceProvider>
  );
};

export default App;