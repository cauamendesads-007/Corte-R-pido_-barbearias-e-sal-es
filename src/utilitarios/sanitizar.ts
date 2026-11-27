/**
 * Utilitários de Sanitização XSS.
 * Protege contra Cross-Site Scripting em inputs do usuário,
 * saídas HTML, URLs e atributos.
 *
 * Baseado nas recomendações OWASP XSS Prevention Cheat Sheet.
 */

// ============================================================================
// CONFIGURAÇÃO DE ELEMENTOS/ATRIBUTOS PERMITIDOS
// ============================================================================

/** Tags HTML permitidas (conteúdo rico básico) */
const TAGS_PERMITIDAS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'span', 'div',
]);

/** Atributos permitidos por tag */
const ATRIBUTOS_PERMITIDOS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
  span: new Set(['class', 'style']),
  div: new Set(['class', 'style']),
  blockquote: new Set(['cite']),
  '*': new Set(['class', 'id', 'dir', 'lang']),
};

/** Protocolos de URL permitidos */
const PROTOCOLOS_PERMITIDOS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'whatsapp:']);

/** Estilos CSS permitidos (propriedades seguras) */
const ESTILOS_PERMITIDOS = new Set([
  'color', 'background-color', 'font-weight', 'font-style',
  'text-decoration', 'text-align', 'font-size', 'line-height',
  'margin', 'padding', 'border', 'border-radius',
  'width', 'height', 'max-width', 'max-height',
  'display', 'flex', 'grid', 'gap',
]);

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/** Escapa caracteres HTML perigosos */
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "\"")
    .replace(/'/g, "\'")
    .replace(/\//g, "&#x2F;");
}

/** Valida se URL usa protocolo seguro */
function validarUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return PROTOCOLOS_PERMITIDOS.has(parsed.protocol);
  } catch {
    return false;
  }
}

/** Sanitiza valor de estilo CSS */
function sanitizarEstilo(estilo: string): string {
  const propriedades = estilo.split(';').map((p) => p.trim()).filter(Boolean);
  const seguras = propriedades.filter((prop) => {
    const [nome] = prop.split(':').map((p) => p.trim().toLowerCase());
    return ESTILOS_PERMITIDOS.has(nome);
  });
  return seguras.join('; ');
}

/** Remove atributos de evento (on*) e javascript: */
function removerPerigosos(valor: string): string {
  return valor
    .replace(/\son\w+\s*=/gi, ' data-on-removed=')
    .replace(/javascript:/gi, 'javascript-removed:')
    .replace(/vbscript:/gi, 'vbscript-removed:')
    .replace(/data:/gi, 'data-removed:');
}

// ============================================================================
// SANITIZAÇÃO DE HTML (DOMPurify-like simplificado)
// ============================================================================

/**
 * Sanitiza string HTML permitindo apenas tags/atributos seguros.
 * Remove scripts, event handlers, javascript: URLs, etc.
 */
export function sanitizarHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // Parser DOM temporário
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove scripts e iframes
  doc.querySelectorAll('script, iframe, object, embed, form, input, button, select, textarea').forEach((el) => el.remove());

  // Processa todos os elementos
  const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const elementosParaRemover: Element[] = [];

  while (walker.nextNode()) {
    const el = walker.currentNode as Element;
    const tagName = el.tagName.toLowerCase();

    // Remove tags não permitidas
    if (!TAGS_PERMITIDAS.has(tagName)) {
      elementosParaRemover.push(el);
      continue;
    }

    // Sanitiza atributos
    const atributosPermitidos = ATRIBUTOS_PERMITIDOS[tagName] || new Set();
    const atributosGlobais = ATRIBUTOS_PERMITIDOS['*'] || new Set();
    const todosPermitidos = new Set([...atributosPermitidos, ...atributosGlobais]);

    Array.from(el.attributes).forEach((attr) => {
      const nome = attr.name.toLowerCase();
      let valor = attr.value;

      // Remove atributos não permitidos
      if (!todosPermitidos.has(nome)) {
        el.removeAttribute(attr.name);
        return;
      }

      // Sanitiza valores perigosos
      valor = removerPerigosos(valor);

      // Validação específica por atributo
      if (nome === 'href' || nome === 'src') {
        if (!validarUrl(valor)) {
          el.removeAttribute(attr.name);
          return;
        }
        // Força HTTPS para links externos
        if (nome === 'href' && valor.startsWith('http:')) {
          try {
            const url = new URL(valor);
            if (url.hostname !== window.location.hostname) {
              valor = valor.replace('http:', 'https:');
            }
          } catch {
            el.removeAttribute(attr.name);
            return;
          }
        }
      }

      if (nome === 'target' && valor === '_blank') {
        // Força rel="noopener noreferrer" para links externos
        if (!el.hasAttribute('rel') || !el.getAttribute('rel')?.includes('noopener')) {
          el.setAttribute('rel', 'noopener noreferrer');
        }
      }

      if (nome === 'style') {
        valor = sanitizarEstilo(valor);
      }

      el.setAttribute(attr.name, valor);
    });
  }

  // Remove elementos não permitidos (mantendo filhos)
  elementosParaRemover.forEach((el) => {
    const pai = el.parentNode;
    if (pai) {
      while (el.firstChild) {
        pai.insertBefore(el.firstChild, el);
      }
      pai.removeChild(el);
    }
  });

  return doc.body.innerHTML;
}

/**
 * Sanitiza texto simples (escape apenas, sem tags).
 * Para inputs que não devem ter HTML.
 */
export function sanitizarTexto(texto: string): string {
  if (!texto || typeof texto !== 'string') return '';
  return escaparHtml(texto);
}

/**
 * Sanitiza atributo HTML (valor de atributo).
 */
export function sanitizarAtributo(valor: string): string {
  if (!valor || typeof valor !== 'string') return '';
  return escaparHtml(removerPerigosos(valor));
}

/**
 * Sanitiza URL - garante protocolo seguro.
 */
export function sanitizarUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const limpa = removerPerigosos(url.trim());
  return validarUrl(limpa) ? limpa : '';
}

/**
 * Sanitiza CSS - permite apenas propriedades seguras.
 */
export function sanitizarCss(css: string): string {
  if (!css || typeof css !== 'string') return '';
  return sanitizarEstilo(removerPerigosos(css));
}

// ============================================================================
// VALIDAÇÕES ESPECÍFICAS DO APP
// ============================================================================

/** Sanitiza nome de estabelecimento/serviço */
export function sanitizarNome(nome: string): string {
  return sanitizarTexto(nome).slice(0, 80);
}

/** Sanitiza descrição/sobre (permite HTML básico) */
export function sanitizarDescricao(descricao: string): string {
  return sanitizarHtml(descricao).slice(0, 2000);
}

/** Sanitiza WhatsApp/telefone */
export function sanitizarTelefone(tel: string): string {
  return tel.replace(/[^\d\s()+-]/g, '').slice(0, 20);
}

/** Sanitiza e-mail */
export function sanitizarEmail(email: string): string {
  const limpo = email.trim().toLowerCase().slice(0, 254);
  // Validação básica RFC 5322 simplificada
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(limpo) ? limpo : '';
}

/** Sanitiza slug (URL amigável) */
export function sanitizarSlug(slug: string): string {
  return slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove acentos
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/** Sanitiza cor hex */
export function sanitizarCorHex(cor: string): string {
  const hexRegex = /^#[0-9a-fA-F]{6}$/;
  return hexRegex.test(cor) ? cor.toLowerCase() : '#e11d48';
}

/** Sanitiza percentual (0-100) */
export function sanitizarPercentual(valor: number | string): number {
  const num = typeof valor === 'string' ? parseInt(valor, 10) : valor;
  return Math.max(0, Math.min(100, isNaN(num) ? 0 : num));
}

/** Sanitiza preço (positivo, 2 casas decimais) */
export function sanitizarPreco(valor: number | string): number {
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
  return Math.max(0, Math.round(num * 100) / 100);
}

/** Sanitiza duração em minutos (positivo, máximo 480 = 8h) */
export function sanitizarDuracao(valor: number | string): number {
  const num = typeof valor === 'string' ? parseInt(valor, 10) : valor;
  return Math.max(1, Math.min(480, isNaN(num) ? 30 : num));
}

// ============================================================================
// HOOK REACT PARA SANITIZAÇÃO AUTOMÁTICA
// ============================================================================

import { useCallback } from 'react';

/**
 * Hook para sanitizar inputs de formulário automaticamente.
 */
export function usarSanitizador() {
  const sanitizar = useCallback((valor: string, tipo: 'texto' | 'html' | 'url' | 'atributo' = 'texto'): string => {
    switch (tipo) {
      case 'html':
        return sanitizarHtml(valor);
      case 'url':
        return sanitizarUrl(valor);
      case 'atributo':
        return sanitizarAtributo(valor);
      default:
        return sanitizarTexto(valor);
    }
  }, []);

  return { sanitizar };
}

export default {
  sanitizarHtml,
  sanitizarTexto,
  sanitizarAtributo,
  sanitizarUrl,
  sanitizarCss,
  sanitizarNome,
  sanitizarDescricao,
  sanitizarTelefone,
  sanitizarEmail,
  sanitizarSlug,
  sanitizarCorHex,
  sanitizarPercentual,
  sanitizarPreco,
  sanitizarDuracao,
  usarSanitizador,
};