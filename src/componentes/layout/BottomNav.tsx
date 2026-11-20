/**
 * Componente BottomNav - Navegação inferior fixa (mobile-first).
 * Segue Material Design / iOS HIG: 3-5 destinos, ícone + label, indicador ativo.
 * Acessível: role="navigation", aria-label, aria-current.
 */

import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { ICONES } from '@/constantes';
import './BottomNav.css';

export interface ItemBottomNav {
  caminho: string;
  rotulo: string;
  icone: string;
  iconeAtivo?: string;
  badge?: number | string;
  apenasAutenticado?: boolean;
  tipoUsuario?: 'cliente' | 'barbeiro' | 'admin';
}

export interface BottomNavProps {
  itens?: ItemBottomNav[];
  usuario?: { papel: 'cliente' | 'barbeiro' | 'admin' } | null;
  className?: string;
  'data-testid'?: string;
}

/** Configurações padrão por tipo de usuário */
const ITENS_PADRAO_CLIENTE: ItemBottomNav[] = [
  { caminho: '/feed', rotulo: 'Feed', icone: ICONES.grade, iconeAtivo: ICONES.grade },
  { caminho: '/explorar', rotulo: 'Explorar', icone: ICONES.busca, iconeAtivo: ICONES.busca },
  { caminho: '/agendamentos', rotulo: 'Agendamentos', icone: ICONES.calendario, iconeAtivo: ICONES.calendario, apenasAutenticado: true },
  { caminho: '/inspiracoes', rotulo: 'Inspirações', icone: ICONES.coracaoVazio, iconeAtivo: ICONES.coracao, apenasAutenticado: true },
  { caminho: '/perfil', rotulo: 'Perfil', icone: ICONES.usuario, iconeAtivo: ICONES.usuario, apenasAutenticado: true },
];

const ITENS_PADRAO_BARBEIRO: ItemBottomNav[] = [
  { caminho: '/painel', rotulo: 'Painel', icone: ICONES.grafico, iconeAtivo: ICONES.grafico, apenasAutenticado: true, tipoUsuario: 'barbeiro' },
  { caminho: '/painel/agenda', rotulo: 'Agenda', icone: ICONES.calendario, iconeAtivo: ICONES.calendario, apenasAutenticado: true, tipoUsuario: 'barbeiro' },
  { caminho: '/painel/fila', rotulo: 'Fila', icone: ICONES.fila, iconeAtivo: ICONES.fila, apenasAutenticado: true, tipoUsuario: 'barbeiro', badge: '!' },
  { caminho: '/painel/servicos', rotulo: 'Serviços', icone: ICONES.tesoura, iconeAtivo: ICONES.tesoura, apenasAutenticado: true, tipoUsuario: 'barbeiro' },
  { caminho: '/perfil', rotulo: 'Perfil', icone: ICONES.usuario, iconeAtivo: ICONES.usuario, apenasAutenticado: true, tipoUsuario: 'barbeiro' },
];

const ITENS_PADRAO_PUBLICO: ItemBottomNav[] = [
  { caminho: '/', rotulo: 'Início', icone: ICONES.casa, iconeAtivo: ICONES.casa },
  { caminho: '/explorar', rotulo: 'Explorar', icone: ICONES.busca, iconeAtivo: ICONES.busca },
  { caminho: '/login', rotulo: 'Entrar', icone: ICONES.usuario },
];

export const BottomNav = ({
  itens,
  usuario,
  className = '',
  'data-testid': testId,
}: BottomNavProps) => {
  const location = useLocation();

  // Determina itens baseados no usuário
  const itensExibicao = React.useMemo(() => {
    if (itens) return itens;

    if (!usuario) return ITENS_PADRAO_PUBLICO;
    if (usuario.papel === 'barbeiro') return ITENS_PADRAO_BARBEIRO;
    return ITENS_PADRAO_CLIENTE;
  }, [itens, usuario]);

  // Filtra itens visíveis
  const itensVisiveis = itensExibicao.filter((item) => {
    if (item.apenasAutenticado && !usuario) return false;
    if (item.tipoUsuario && usuario?.papel !== item.tipoUsuario) return false;
    return true;
  });

  const classes = [
    'bottom-nav',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav
      className={classes}
      role="navigation"
      aria-label="Navegação principal"
      data-testid={testId}
    >
      <div className="bottom-nav__container">
        {itensVisiveis.map((item) => {
          const ehAtivo = location.pathname.startsWith(item.caminho) && (item.caminho !== '/' || location.pathname === '/');
          const iconeExibicao = ehAtivo && item.iconeAtivo ? item.iconeAtivo : item.icone;

          return (
            <NavLink
              key={item.caminho}
              to={item.caminho}
              className={`bottom-nav__item ${ehAtivo ? 'bottom-nav__item--ativo' : ''}`}
              aria-current={ehAtivo ? 'page' : undefined}
              data-testid={`${testId}-${item.rotulo.toLowerCase()}`}
              onClick={() => {
                // Fecha modais/menus abertos ao navegar
                document.querySelectorAll('[role="dialog"]').forEach((el) => (el as HTMLElement).click?.());
              }}
            >
              <span className="bottom-nav__icone" aria-hidden="true">
                {iconeExibicao}
              </span>
              <span className="bottom-nav__rotulo">{item.rotulo}</span>
              {item.badge && (
                <span className="bottom-nav__badge" aria-label={typeof item.badge === 'number' ? `${item.badge} notificações` : 'Atenção'}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Indicador animado do item ativo */}
      <div className="bottom-nav__indicador" aria-hidden="true" />
    </nav>
  );
};

/** BottomNav simplificado para uso em modais/telas cheias */
export const BottomNavSimples = ({
  itens = ITENS_PADRAO_PUBLICO,
  valor,
  aoAlterar,
  className = '',
  'data-testid': testId,
}: {
  itens?: ItemBottomNav[];
  valor: string;
  aoAlterar: (_caminho: string) => void;
  className?: string;
  'data-testid'?: string;
}) => (
  <div
    className={`bottom-nav bottom-nav--simples ${className}`}
    role="tablist"
    aria-label="Abas"
    data-testid={testId}
  >
    <div className="bottom-nav__container">
      {itens.map((item) => (
        <button
          key={item.caminho}
          role="tab"
          aria-selected={valor === item.caminho}
          aria-controls={`${item.caminho}-painel`}
          id={`tab-${item.caminho}`}
          className={`bottom-nav__item ${valor === item.caminho ? 'bottom-nav__item--ativo' : ''}`}
          onClick={() => aoAlterar(item.caminho)}
          data-testid={`${testId}-${item.rotulo.toLowerCase()}`}
        >
          <span className="bottom-nav__icone" aria-hidden="true">
            {item.iconeAtivo && valor === item.caminho ? item.iconeAtivo : item.icone}
          </span>
          <span className="bottom-nav__rotulo">{item.rotulo}</span>
        </button>
      ))}
    </div>
    <div className="bottom-nav__indicador" aria-hidden="true" />
  </div>
);