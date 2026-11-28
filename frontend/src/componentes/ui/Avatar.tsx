/**
 * Componente Avatar - Avatar de usuário/estabelecimento com fallback de iniciais.
 * Variantes: tamanho (pequeno, medio, grande, xl), forma (circular, quadrado).
 * Suporta badge de status online/offline.
 */

import React, { forwardRef } from 'react';
import { corTextoContrastante } from '@/utilitarios';
import './Avatar.css';

export interface AvatarProps {
  src?: string;
  alt?: string;
  nome?: string;
  corFundo?: string;
  tamanho?: 'pequeno' | 'medio' | 'grande' | 'xl';
  forma?: 'circular' | 'quadrado';
  status?: 'online' | 'offline' | 'ocupado' | 'ausente';
  className?: string;
  'data-testid'?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/** Avatar principal */
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({
    src,
    alt,
    nome,
    corFundo = '#64748b',
    tamanho = 'medio',
    forma = 'circular',
    status,
    className = '',
    'data-testid': testId,
    onClick,
    style,
    ...props
  }, ref) => {
    const temImagem = !!src;
    const corTexto = corTextoContrastante(corFundo);

    // Preposições portuguesas a ignorar nas iniciais
    const preposicoes = new Set(['da', 'de', 'do', 'dos', 'das', 'e', 'a', 'o', 'as', 'os']);
    const iniciais = nome && nome.trim()
      ? nome.trim().split(' ')
          .filter(p => p.length > 0 && !preposicoes.has(p.toLowerCase()))
          .map(p => p[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : '';

    const classes = [
      'avatar',
      `avatar--${tamanho}`,
      `avatar--${forma}`,
      status && `avatar--status-${status}`,
      onClick && 'avatar--clicavel',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const conteudo = temImagem ? (
      <img
        src={src}
        alt={alt || nome || 'Avatar'}
        className="avatar__imagem"
        loading="lazy"
      />
    ) : (
      <span
        className="avatar__iniciais"
        style={{ background: corFundo, color: corTexto } as React.CSSProperties}
        aria-hidden="true"
      >
        {iniciais}
      </span>
    );

    // Always render as div, handle click via onClick on div
    return (
      <div
        ref={ref}
        className={classes}
        onClick={onClick}
        data-testid={testId}
        aria-label={nome ? `Avatar de ${nome}` : ''}
        style={style}
        role={onClick ? 'button' : 'img'}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }} : undefined}
        {...props}
      >
        {conteudo}
        {status && (
          <span className={`avatar__status avatar__status--${status}`} aria-label={status} aria-hidden="true" />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

/** Avatar empilhado (grupo) */
interface AvatarGrupoProps {
  avatares: Array<{ src?: string; nome: string; corFundo?: string }>;
  maximoVisiveis?: number;
  tamanho?: 'pequeno' | 'medio' | 'grande';
  className?: string;
  'data-testid'?: string;
}

export const AvatarGrupo = ({
  avatares,
  maximoVisiveis = 4,
  tamanho = 'medio',
  className = '',
  'data-testid': testId,
}: AvatarGrupoProps) => {
  const visiveis = avatares.slice(0, maximoVisiveis);
  const restantes = avatares.length - maximoVisiveis;

  return (
    <div className={`avatar-grupo ${className}`} data-testid={testId} role="group" aria-label={`${avatares.length} participantes`}>
      <div className="avatar-grupo__pilha">
        {visiveis.map((avatar, index) => (
          <Avatar
            key={avatar.nome}
            src={avatar.src}
            nome={avatar.nome}
            corFundo={avatar.corFundo}
            tamanho={tamanho}
            className="avatar-grupo__item"
            style={{ zIndex: visiveis.length - index } as React.CSSProperties}
            data-testid={`${testId}-${index}`}
          />
        ))}
        {restantes > 0 && (
          <div
            className={`avatar-grupo__mais avatar-grupo__mais--${tamanho}`}
            aria-label={`${restantes} mais`}
            data-testid={`${testId}-mais`}
          >
            +{restantes}
          </div>
        )}
      </div>
    </div>
  );
};

/** Avatar com badge de notificação */
interface AvatarNotificacaoProps extends Omit<AvatarProps, 'status'> {
  contador?: number;
  maximoContador?: number;
}

export const AvatarNotificacao = ({
  contador = 0,
  maximoContador = 99,
  className = '',
  'data-testid': testId,
  ...props
}: AvatarNotificacaoProps) => {
  const contadorExibicao = contador > maximoContador ? `${maximoContador}+` : contador;
  const temContador = contador > 0;

  return (
    <div className={`avatar-notificacao ${className}`} data-testid={testId}>
      <Avatar {...props} data-testid={`${testId}-avatar`} />
      {temContador && (
        <span className="avatar-notificacao__badge" aria-label={`${contadorExibicao} notificações`} data-testid={`${testId}-badge`}>
          {contadorExibicao}
        </span>
      )}
    </div>
  );
};