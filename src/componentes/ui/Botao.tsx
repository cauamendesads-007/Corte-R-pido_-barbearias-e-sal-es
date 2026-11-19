/**
 * Componente Botao - Botão reutilizável com variantes, tamanhos e estados.
 * Segue padrões de acessibilidade (WCAG AA) e design system.
 */

import React from 'react';
import type { PropsBotao } from '@/tipos';
import { ICONES } from '@/constantes';
import './Botao.css';

interface BotaoProps extends PropsBotao {
  iconeEsquerda?: string;
  iconeDireita?: string;
  className?: string;
}

export const Botao = React.forwardRef<HTMLButtonElement, BotaoProps>(
  (
    {
      children,
      variante = 'primario',
      tamanho = 'medio',
      desabilitado = false,
      carregando = false,
      aoClicar,
      tipo = 'button',
      ariaLabel,
      iconeEsquerda,
      iconeDireita,
      className = '',
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const classes = [
      'botao',
      `botao--${variante}`,
      `botao--${tamanho}`,
      desabilitado && 'botao--desabilitado',
      carregando && 'botao--carregando',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const conteudo = (
      <>
        {carregando && (
          <span className="botao__spinner" aria-hidden="true">
            {ICONES.carregando}
          </span>
        )}
        {!carregando && iconeEsquerda && (
          <span className="botao__icone botao__icone--esquerda" aria-hidden="true">
            {iconeEsquerda}
          </span>
        )}
        <span className="botao__texto">{children}</span>
        {!carregando && iconeDireita && (
          <span className="botao__icone botao__icone--direita" aria-hidden="true">
            {iconeDireita}
          </span>
        )}
      </>
    );

    return (
      <button
        ref={ref}
        type={tipo}
        className={classes}
        disabled={desabilitado || carregando}
        onClick={aoClicar}
        aria-label={ariaLabel}
        aria-disabled={desabilitado || carregando}
        aria-busy={carregando}
        data-testid={testId}
        {...props}
      >
        {conteudo}
      </button>
    );
  }
);

Botao.displayName = 'Botao';

/** Botão primário - ação principal */
export const BotaoPrimario = (props: Omit<BotaoProps, 'variante'>) => (
  <Botao variante="primario" {...props} />
);

/** Botão secundário - ação alternativa */
export const BotaoSecundario = (props: Omit<BotaoProps, 'variante'>) => (
  <Botao variante="secundario" {...props} />
);

/** Botão de perigo - ações destrutivas */
export const BotaoPerigo = (props: Omit<BotaoProps, 'variante'>) => (
  <Botao variante="perigo" {...props} />
);

/** Botão fantasma - ação sutil */
export const BotaoFantasma = (props: Omit<BotaoProps, 'variante'>) => (
  <Botao variante="fantasma" {...props} />
);

/** Botão apenas ícone (para toolbars, headers) */
export const BotaoIcone = React.forwardRef<HTMLButtonElement, Omit<BotaoProps, 'children' | 'iconeEsquerda' | 'iconeDireita'> & { icone: string }>(
  ({
    icone,
    ariaLabel,
    variante = 'fantasma',
    tamanho = 'pequeno',
    ...props
  }, ref) => (
    <Botao
      ref={ref}
      variante={variante}
      tamanho={tamanho}
      ariaLabel={ariaLabel}
      className="botao--icone-only"
      {...props}
    >
      <span className="botao__icone" aria-hidden="true">{icone}</span>
    </Botao>
  )
);

BotaoIcone.displayName = 'BotaoIcone';