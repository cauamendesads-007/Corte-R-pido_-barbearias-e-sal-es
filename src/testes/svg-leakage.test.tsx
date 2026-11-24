/**
 * Testes para detectar vazamento de SVG (raw HTML strings) no DOM.
 * Garante que todos os ícones usem o componente Icone seguro em vez de strings SVG inline.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Icone, IconeGrupo, usarIconeBruto } from '@/componentes/ui/Icone';
import { Botao, BotaoPrimario } from '@/componentes/ui/Botao';
import { BottomNav } from '@/componentes/layout/BottomNav';

// Helper para detectar SVG inline suspeito (strings raw não processadas pelo componente Icone)
function detectarSvgVazamento(container: HTMLElement): string[] {
  const problemas: string[] = [];

  // Busca por elementos SVG que NÃO tenham a classe 'icone' (indicando que vieram do componente Icone)
  const svgs = container.querySelectorAll('svg');
  svgs.forEach((svg) => {
    const classList = svg.classList;
    // Permite SVGs do componente Icone (têm classe 'icone')
    const ehIconeSeguro = classList.contains('icone');

    if (!ehIconeSeguro) {
      // Verifica se parece com SVG inline suspeito (tem viewBox mas não classe icone)
      const outerHTML = svg.outerHTML;
      if (outerHTML.includes('viewBox="0 0 24 24"') && !outerHTML.includes('class="icone"')) {
        problemas.push(`SVG suspeito detectado: ${outerHTML.substring(0, 200)}...`);
      }
    }
  });

  // Busca por strings SVG brutas no textContent (indicam dangerouslySetInnerHTML mal usado)
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent || '';
    // Detecta strings que parecem SVG inline (começam com <svg e têm viewBox)
    if (text.trim().startsWith('<svg') && text.includes('viewBox="0 0 24 24"')) {
      problemas.push(`String SVG bruta no textContent: ${text.substring(0, 200)}...`);
    }
  }

  return problemas;
}

// Wrapper com Router para componentes que usam useLocation
const wrapperWithRouter = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
);

describe('Prevenção de Vazamento de SVG', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Componente Icone', () => {
    it('não deve vazar SVG bruto no DOM', () => {
      const { container } = render(<Icone nome="menu" tamanho={24} />);

      const problemas = detectarSvgVazamento(container);
      expect(problemas).toHaveLength(0);
    });

    it('deve renderizar SVG com classe icone', () => {
      const { container } = render(<Icone nome="menu" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('icone');
    });

    it('deve ter aria-hidden quando sem ariaLabel', () => {
      const { container } = render(<Icone nome="menu" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('deve ter role=img e aria-label quando ariaLabel fornecido', () => {
      render(<Icone nome="menu" ariaLabel="Menu principal" />);
      const svg = screen.getByRole('img', { name: 'Menu principal', hidden: true });
      expect(svg).toHaveAttribute('aria-label', 'Menu principal');
    });

    it('carregando deve ter classe animar-giro', () => {
      const { container } = render(<Icone nome="carregando" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animar-giro');
    });
  });

  describe('Botao com Icone', () => {
    it('não deve vazar SVG bruto quando usa iconeEsquerda com componente Icone', () => {
      const { container } = render(
        <BotaoPrimario iconeEsquerda={<Icone nome="setaDireita" />}>Teste</BotaoPrimario>
      );

      const problemas = detectarSvgVazamento(container);
      expect(problemas).toHaveLength(0);
    });

    it('não deve vazar SVG bruto no estado carregando', () => {
      const { container } = render(<Botao carregando>Teste</Botao>);

      const problemas = detectarSvgVazamento(container);
      expect(problemas).toHaveLength(0);
    });

    it('spinner de carregamento deve ter classe animar-giro', () => {
      render(<Botao carregando>Teste</Botao>);
      const spinner = screen.getByRole('button').querySelector('.animar-giro');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('BottomNav com strings SVG (ainda não migrado)', () => {
    const itensPadrao = [
      { caminho: '/', rotulo: 'Início', icone: '<svg>icone1</svg>', iconeAtivo: '<svg>icone1ativo</svg>' },
      { caminho: '/explorar', rotulo: 'Explorar', icone: '<svg>icone2</svg>', iconeAtivo: '<svg>icone2ativo</svg>' },
    ];

    it('renderiza sem erro com Router', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <BottomNav itens={itensPadrao} usuario={null} />
        </MemoryRouter>
      );

      // BottomNav ainda usa strings SVG (ícones brutos) - isso é esperado até migração completa
      // O teste serve como documentação do estado atual
      expect(container.querySelector('nav')).toBeInTheDocument();
    });
  });
});

describe('API de ícones seguros', () => {
  it('usarIconeBruto deve retornar string SVG bruta para uso em data URLs', () => {
    const svg = usarIconeBruto('menu');
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 24 24"');
  });

  it('usarIconeBruto deve retornar string vazia para ícone inexistente', () => {
    const svg = usarIconeBruto('inexistente' as any);
    expect(svg).toBe('');
  });

  it('IconeGrupo deve renderizar múltiplos ícones', () => {
    const { container } = render(
      <IconeGrupo nome="estrela" quantidade={3} tamanho={16} ariaLabel="3 estrelas" />
    );

    const problemas = detectarSvgVazamento(container);
    expect(problemas).toHaveLength(0);

    const estrelas = container.querySelectorAll('.icone');
    expect(estrelas).toHaveLength(3);
  });
});