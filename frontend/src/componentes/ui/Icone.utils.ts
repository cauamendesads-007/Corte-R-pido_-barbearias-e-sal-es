/**
 * Utilitários para o componente Icone.
 * Separados para evitar warning react-refresh/only-export-components.
 */

import { ICONES } from '@/constantes';
import type { NomeIcone } from './Icone';

/**
 * Extrai o conteúdo interno do SVG (sem a tag <svg>) do string bruto.
 * Remove width/height/viewBox/fill/stroke do wrapper para permitir override via props.
 */
export function extrairConteudoSvg(svgBruto: string): string {
  // Remove a tag <svg ...> e </svg>, mantendo apenas o conteúdo interno
  const match = svgBruto.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!match) return '';

  let conteudo = match[1].trim();

  // Remove atributos width/height/viewBox/fill/stroke das tags internas se existirem
  // (já que serão controlados pelo componente pai)
  conteudo = conteudo
    .replace(/\s(width|height|viewBox|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)="[^"]*"/gi, '')
    .replace(/\s(class)="[^"]*"/gi, '');

  return conteudo;
}

/**
 * Hook para usar ícones programaticamente (ex: em mapas, gráficos).
 * Retorna o SVG bruto como string (para uso em data URLs, etc).
 */
export function usarIconeBruto(nome: NomeIcone): string {
  return ICONES[nome] ?? '';
}