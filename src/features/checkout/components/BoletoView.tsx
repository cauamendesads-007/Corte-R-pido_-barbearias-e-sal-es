/**
 * Visualização de Boleto - Código de barras, linha digitável, PDF.
 * Acessível, 6 estados, WCAG 2.2 AA.
 */

import React, { useState } from 'react';
import type { DadosPagamentoBoleto } from '../types';
import { formatarMoeda, formatarDataRelativa } from '../types';
import './BoletoView.css';

interface BoletoViewProps {
  dados: DadosPagamentoBoleto | null;
  carregando: boolean;
  aoGerar: () => Promise<void>;
}

export function BoletoView({ dados, carregando, aoGerar }: BoletoViewProps) {
  const [copiado, setCopiado] = useState<'codigo' | 'linha' | null>(null);

  const handleCopiar = async (tipo: 'codigo' | 'linha', valor: string) => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = valor;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 2000);
    }
  };

  if (!dados) {
    return (
      <div className="boleto-vazio">
        <div className="boleto-icone">📄</div>
        <h3>Boleto não gerado</h3>
        <p>Clique no botão abaixo para gerar seu boleto.</p>
        <button
          className="btn-gerar-boleto"
          onClick={aoGerar}
          disabled={carregando}
        >
          {carregando ? 'Gerando...' : 'Gerar boleto'}
        </button>
      </div>
    );
  }

  return (
    <div className="boleto-view" role="region" aria-label="Boleto bancário">
      <div className="boleto-header">
        <div className="boleto-banco">
          <span className="banco-icone" aria-hidden="true">🏦</span>
          <span>Banco Corte Rápido</span>
        </div>
        <div className="boleto-valor-grande">{formatarMoeda(dados.valor)}</div>
      </div>

      <div className="boleto-campos">
        <div className="boleto-campo">
          <label>Vencimento</label>
          <span>{formatarDataRelativa(dados.vencimento)}</span>
        </div>
        <div className="boleto-campo">
          <label>Valor do documento</label>
          <span>{formatarMoeda(dados.valor)}</span>
        </div>
        <div className="boleto-campo">
          <label>Nosso número</label>
          <span>{dados.codigoBarras.slice(-10)}</span>
        </div>
      </div>

      {/* Linha Digitável */}
      <div className="boleto-secao">
        <h4>Linha Digitável</h4>
        <div className="boleto-copiar-wrapper">
          <code className="boleto-linha-digitavel">{formatarLinhaDigitavel(dados.linhaDigitavel)}</code>
          <button
            type="button"
            className={`boleto-btn-copiar ${copiado === 'linha' ? 'copiado' : ''}`}
            onClick={() => handleCopiar('linha', dados.linhaDigitavel)}
            aria-label={copiado === 'linha' ? 'Copiado!' : 'Copiar linha digitável'}
          >
            {copiado === 'linha' ? '✓ Copiado' : '📋 Copiar'}
          </button>
        </div>
        <p className="boleto-ajuda">Copie e cole no app do seu banco ou internet banking</p>
      </div>

      {/* Código de Barras */}
      <div className="boleto-secao">
        <h4>Código de Barras</h4>
        <div className="boleto-copiar-wrapper">
          <code className="boleto-codigo-barras">{formatarCodigoBarras(dados.codigoBarras)}</code>
          <button
            type="button"
            className={`boleto-btn-copiar ${copiado === 'codigo' ? 'copiado' : ''}`}
            onClick={() => handleCopiar('codigo', dados.codigoBarras)}
            aria-label={copiado === 'codigo' ? 'Copiado!' : 'Copiar código de barras'}
          >
            {copiado === 'codigo' ? '✓ Copiado' : '📋 Copiar'}
          </button>
        </div>
        <div className="boleto-barras-visual" aria-hidden="true">
          {gerarBarrasVisual(dados.codigoBarras)}
        </div>
      </div>

      {/* Ações */}
      <div className="boleto-acoes">
        <a
          href={dados.urlBoleto}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-boleto-pdf"
        >
          📄 Baixar PDF do boleto
        </a>
        <button
          type="button"
          className="btn-boleto-imprimir"
          onClick={() => window.print()}
        >
          🖨️ Imprimir
        </button>
      </div>

      {/* Instruções */}
      <div className="boleto-instrucoes">
        <h4>Instruções de pagamento</h4>
        <ul>
          <li>Pague em qualquer banco, lotérica ou app bancário até a data de vencimento</li>
          <li>Após o vencimento, juros e multa poderão ser aplicados</li>
          <li>A compensação ocorre em até 3 dias úteis</li>
          <li>Guarde o comprovante de pagamento</li>
        </ul>
      </div>
    </div>
  );
}

function formatarLinhaDigitavel(linha: string): string {
  // Formato: 99999.99999 99999.999999 99999.999999 9 99999999999999
  return linha
    .replace(/(\d{5})(\d{5})(\d{6})(\d{6})(\d{1})(\d{14})/, '$1.$2 $3.$4 $5 $6')
    .trim();
}

function formatarCodigoBarras(codigo: string): string {
  // Formato: 9999 9999 9999 9999 9999 9999 9999 9999 9999 9999 99
  return codigo.replace(/(.{4})/g, '$1 ').trim();
}

function gerarBarrasVisual(codigo: string): JSX.Element {
  // Visual simples de código de barras (apenas decorativo)
  const barras = codigo.split('').map((digito, i) => {
    const largura = (parseInt(digito, 10) + 1) * 2;
    return <div key={i} className="barra" style={{ width: `${largura}px` }} />;
  });

  return <div className="barras-container">{barras}</div>;
}