/**
 * Componente Icone seguro - substitui strings SVG inline por componente React.
 * Previne vazamento de SVG (raw HTML) no DOM e garante acessibilidade consistente.
 *
 * Uso:
 *   <Icone nome="menu" tamanho={24} />
 *   <Icone nome="verificar" className="icone-sucesso" aria-label="Confirmado" />
 */

import React from 'react';
import { ICONES } from '@/constantes';
import { extrairConteudoSvg } from './Icone.utils';

export type NomeIcone = keyof typeof ICONES;

export interface IconeProps {
  /** Nome do ícone (chave do objeto ICONES) */
  nome: NomeIcone;
  /** Tamanho em pixels (padrão: 20) */
  tamanho?: number;
  /** Classes CSS adicionais */
  className?: string;
  /** Label acessível (para leitores de tela). Se omitido, usa aria-hidden="true" */
  ariaLabel?: string;
  /** Cor do stroke (padrão: currentColor - herda do texto) */
  cor?: string;
  /** Espessura do traço (padrão: 2) */
  strokeWidth?: number | string;
  /** Estilos inline adicionais */
  style?: React.CSSProperties;
  /** data-testid para testes */
  'data-testid'?: string;
}

/**
 * Componente Icone principal.
 * Renderiza SVG inline de forma segura, permitindo customização de tamanho, cor e acessibilidade.
 */
export const Icone: React.FC<IconeProps> = ({
  nome,
  tamanho = 20,
  className = '',
  ariaLabel,
  cor = 'currentColor',
  strokeWidth = 2,
  style,
}) => {
  const svgBruto = ICONES[nome];

  if (!svgBruto) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Icone] Ícone "${nome}" não encontrado em ICONES.`);
    }
    return null;
  }

  const conteudo = extrairConteudoSvg(svgBruto);

  const classes = ['icone', className, nome === 'carregando' ? 'animar-giro' : ''].filter(Boolean).join(' ');

  const propsSvg: React.SVGAttributes<SVGSVGElement> = {
    width: tamanho,
    height: tamanho,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: cor,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: classes,
    style: { ...style, flexShrink: 0 },
    'aria-hidden': ariaLabel ? undefined : 'true',
    role: ariaLabel ? 'img' : undefined,
    'aria-label': ariaLabel,
  };

  return (
    <svg {...propsSvg} dangerouslySetInnerHTML={{ __html: conteudo }} />
  );
};

/**
 * Componente para renderizar múltiplos ícones em linha (ex: rating de estrelas).
 */
export const IconeGrupo: React.FC<{
  nome: NomeIcone;
  quantidade: number;
  tamanho?: number;
  espacamento?: number;
  className?: string;
  ariaLabel?: string;
}> = ({ nome, quantidade, tamanho = 16, espacamento = 2, className = '', ariaLabel }) => (
  <span className={`icone-grupo ${className}`} role={ariaLabel ? 'img' : undefined} aria-label={ariaLabel}>
    {Array.from({ length: quantidade }, (_, i) => (
      <Icone key={i} nome={nome} tamanho={tamanho} style={{ marginRight: i < quantidade - 1 ? espacamento : 0 }} />
    ))}
  </span>
);

export default Icone;