/**
 * Componente Cabeçalho - Header fixo com logo, busca, ações do usuário.
 * Variantes: publico (landing), autenticado (app), barbeiro, admin.
 * Responsivo: colapsa para drawer no mobile.
 */

import React, { useState, useRef, useEffect, Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ICONES } from '@/constantes';
import { BotaoIcone } from '@/componentes/ui/Botao';
import { CampoBusca } from '@/componentes/ui/CampoTexto';
import { Avatar, AvatarNotificacao } from '@/componentes/ui/Avatar';
import './Cabecalho.css';

export interface CabecalhoProps {
  variante?: 'publico' | 'autenticado' | 'barbeiro' | 'admin';
  usuario?: {
    nome: string;
    avatar?: string;
    papel: 'cliente' | 'barbeiro' | 'admin';
    notificacoesNaoLidas?: number;
  } | null;
  aoSair?: () => void;
  aoBuscar?: (termo: string) => void;
  className?: string;
  'data-testid'?: string;
}

export const Cabecalho = ({
  variante = 'publico',
  usuario,
  aoSair,
  aoBuscar,
  className = '',
  'data-testid': testId,
}: CabecalhoProps) => {
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);
  const botaoMenuRef = useRef<HTMLButtonElement>(null);

  // Fecha drawer ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuAberto && drawerRef.current && !drawerRef.current.contains(e.target as Node) &&
          botaoMenuRef.current && !botaoMenuRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuAberto]);

  // Fecha drawer ao navegar
  useEffect(() => {
    setMenuAberto(false);
    setBuscaAberta(false);
  }, [location.pathname]);

  const handleBusca = (e: React.FormEvent) => {
    e.preventDefault();
    if (termoBusca.trim()) {
      aoBuscar?.(termoBusca.trim());
      setBuscaAberta(false);
    }
  };

  const rotasPublicas = [
    { caminho: '/', rotulo: 'Início', icone: ICONES.casa },
    { caminho: '/explorar', rotulo: 'Explorar', icone: ICONES.busca },
    { caminho: '/sobre', rotulo: 'Sobre', icone: ICONES.info },
  ];

  const rotasCliente = [
    { caminho: '/feed', rotulo: 'Feed', icone: ICONES.grade },
    { caminho: '/agendamentos', rotulo: 'Meus Cortes', icone: ICONES.calendario },
    { caminho: '/inspiracoes', rotulo: 'Inspirações', icone: ICONES.coracao },
    { caminho: '/perfil', rotulo: 'Perfil', icone: ICONES.usuario },
  ];

  const rotasBarbeiro = [
    { caminho: '/painel', rotulo: 'Painel', icone: ICONES.grafico },
    { caminho: '/painel/agenda', rotulo: 'Agenda', icone: ICONES.calendario },
    { caminho: '/painel/servicos', rotulo: 'Serviços', icone: ICONES.tesoura },
    { caminho: '/painel/fila', rotulo: 'Fila', icone: ICONES.fila },
    { caminho: '/painel/galeria', rotulo: 'Galeria', icone: ICONES.foto },
    { caminho: '/perfil', rotulo: 'Perfil', icone: ICONES.usuario },
  ];

  const rotasAdmin = [
    { caminho: '/admin', rotulo: 'Dashboard', icone: ICONES.grafico },
    { caminho: '/admin/estabelecimentos', rotulo: 'Estabelecimentos', icone: ICONES.mapa },
    { caminho: '/admin/usuarios', rotulo: 'Usuários', icone: ICONES.usuarios },
    { caminho: '/admin/analises', rotulo: 'Análises', icone: ICONES.grafico },
  ];

  const obterRotas = () => {
    if (!usuario) return rotasPublicas;
    if (usuario.papel === 'barbeiro') return rotasBarbeiro;
    if (usuario.papel === 'admin') return rotasAdmin;
    return rotasCliente;
  };

  const rotas = obterRotas();
  const rotaAtual = location.pathname;

  const renderMenuDrawer = () => (
    <Fragment>
      <div
        className={`cabecalho__backdrop ${menuAberto ? 'cabecalho__backdrop--visivel' : ''}`}
        onClick={() => setMenuAberto(false)}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        className={`cabecalho__drawer ${menuAberto ? 'cabecalho__drawer--aberto' : ''}`}
        role="navigation"
        aria-label="Menu principal"
        data-testid={`${testId}-drawer`}
      >
        <div className="cabecalho__drawer-cabecalho">
          <div className="cabecalho__drawer-usuario">
            {usuario ? (
              <>
                <Avatar
                  src={usuario.avatar}
                  nome={usuario.nome}
                  tamanho="medio"
                  corFundo="#64748b"
                />
                <div>
                  <strong>{usuario.nome}</strong>
                  <br />
                  <span className="cabecalho__drawer-tipo">
                    {usuario.papel === 'barbeiro' ? 'Barbeiro' : usuario.papel === 'admin' ? 'Admin' : 'Cliente'}
                  </span>
                </div>
              </>
            ) : (
              <button
                className="cabecalho__drawer-login"
                onClick={() => { setMenuAberto(false); window.location.href = '/login'; }}
              >
                {ICONES.usuario} Entrar / Cadastrar
              </button>
            )}
          </div>
        </div>

        <nav className="cabecalho__drawer-nav">
          <ul role="list">
            {rotas.map((rota) => (
              <li key={rota.caminho}>
                <Link
                  to={rota.caminho}
                  className={`cabecalho__drawer-link ${rotaAtual.startsWith(rota.caminho) && rota.caminho !== '/' ? 'cabecalho__drawer-link--ativo' : ''}`}
                  onClick={() => setMenuAberto(false)}
                >
                  <span aria-hidden="true">{rota.icone}</span>
                  {rota.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {usuario && (
          <div className="cabecalho__drawer-rodape">
            <button
              type="button"
              className="cabecalho__drawer-sair"
              onClick={() => { setMenuAberto(false); aoSair?.(); }}
            >
              {ICONES.sair} Sair
            </button>
          </div>
        )}
      </aside>
    </Fragment>
  );

  const classes = [
    'cabecalho',
    `cabecalho--${variante}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {renderMenuDrawer()}
      <header
        ref={botaoMenuRef}
        className={classes}
        data-testid={testId}
        role="banner"
      >
        <div className="cabecalho__container">
          {/* Logo / Início */}
          <Link to="/" className="cabecalho__logo" aria-label="Corte Rápido - Início" data-testid={`${testId}-logo`}>
            <span className="cabecalho__logo-icone" aria-hidden="true">✂</span>
            <span className="cabecalho__logo-texto">Corte Rápido</span>
          </Link>

          {/* Busca (desktop) */}
          {(variante === 'autenticado' || variante === 'barbeiro' || variante === 'admin') && (
            <form className="cabecalho__busca" onSubmit={handleBusca} role="search" data-testid={`${testId}-busca`}>
              <CampoBusca
                valor={termoBusca}
                aoAlterar={setTermoBusca}
                placeholder="Buscar barbearias, serviços..."
                autoComplete="off"
                className="cabecalho__campo-busca"
                label="Buscar barbearias e serviços"
              />
            </form>
          )}

          {/* Ações à direita */}
          <div className="cabecalho__acoes">
            {variante === 'publico' && (
              <>
                <Link to="/login" className="cabecalho__link" data-testid={`${testId}-entrar`}>
                  {ICONES.usuario} Entrar
                </Link>
                <Link to="/cadastro" className="botao botao--primario cabecalho__cadastro" data-testid={`${testId}-cadastrar`}>
                  Cadastrar
                </Link>
              </>
            )}

            {usuario && (
              <>
                {/* Notificações */}
                <AvatarNotificacao
                  contador={usuario.notificacoesNaoLidas || 0}
                  src={usuario.avatar}
                  nome={usuario.nome}
                  corFundo="#64748b"
                  tamanho="medio"
                  className="cabecalho__notificacoes"
                  onClick={() => window.location.href = '/notificacoes'}
                  data-testid={`${testId}-notificacoes`}
                />

                {/* Menu do usuário (mobile) / Avatar (desktop) */}
                {window.innerWidth < 768 ? (
                  <BotaoIcone
                    ref={botaoMenuRef}
                    icone={ICONES.menu}
                    ariaLabel="Abrir menu"
                    variante="fantasma"
                    tamanho="medio"
                    aoClicar={() => setMenuAberto(true)}
                    data-testid={`${testId}-menu`}
                  />
                ) : (
                  <Avatar
                    src={usuario.avatar}
                    nome={usuario.nome}
                    tamanho="pequeno"
                    corFundo="#64748b"
                    className="cabecalho__avatar"
                    onClick={() => window.location.href = '/perfil'}
                    data-testid={`${testId}-avatar`}
                  />
                )}
              </>
            )}

            {/* Botão de busca mobile */}
            {window.innerWidth < 768 && (variante === 'autenticado' || variante === 'barbeiro' || variante === 'admin') && (
              <BotaoIcone
                icone={buscaAberta ? ICONES.fechar : ICONES.busca}
                ariaLabel={buscaAberta ? 'Fechar busca' : 'Abrir busca'}
                variante="fantasma"
                tamanho="medio"
                aoClicar={() => setBuscaAberta(!buscaAberta)}
                data-testid={`${testId}-toggle-busca`}
              />
            )}
          </div>
        </div>

        {/* Busca mobile expandida */}
        {buscaAberta && window.innerWidth < 768 && (
          <form className="cabecalho__busca-mobile" onSubmit={handleBusca} role="search">
            <CampoBusca
              valor={termoBusca}
              aoAlterar={setTermoBusca}
              placeholder="Buscar barbearias, serviços..."
              autoComplete="off"
              autoFocus
              className="cabecalho__campo-busca"
              label="Buscar barbearias e serviços"
            />
          </form>
        )}
      </header>
    </>
  );
};