/**
 * Detalhe da Fatura - Expansível, impressão, download PDF.
 * Acessível, 6 estados, WCAG 2.2 AA.
 */

import React from 'react';
import type { Fatura, FaturaItem } from '../types';
import { formatarMoeda, formatarDataRelativa, formatarStatusFatura } from '../types';
import './FaturaDetalhe.css';

interface FaturaDetalheProps {
  fatura: Fatura;
  onFechar: () => void;
}

function ItemFatura({ item }: { item: FaturaItem }) {
  return (
    <tr>
      <td className="item-descricao">{item.descricao}</td>
      <td className="item-qtd">{item.quantidade}</td>
      <td className="item-valor">{formatarMoeda(item.valorUnitario)}</td>
      <td className="item-total"><strong>{formatarMoeda(item.valorTotal)}</strong></td>
    </tr>
  );
}

function LinhaResumo({ label, valor, destaque = false }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <tr className={destaque ? 'destaque' : ''}>
      <td>{label}</td>
      <td className={destaque ? 'valor-destaque' : ''}>{valor}</td>
    </tr>
  );
}

export function FaturaDetalhe({ fatura, onFechar }: FaturaDetalheProps) {
  const statusFormatado = formatarStatusFatura(fatura.status);
  const podeBaixar = fatura.status !== 'cancelada' && fatura.status !== 'estornada';
  const podeImprimir = fatura.pdfUrl || fatura.status === 'paga';

  const handleImprimir = () => {
    if (fatura.pdfUrl) {
      window.open(fatura.pdfUrl, '_blank');
    } else {
      window.print();
    }
  };

  return (
    <div className="fatura-detalhe" role="region" aria-label={`Detalhes da fatura ${fatura.numero}`}>
      <div className="fatura-detalhe-header">
        <div className="fatura-detalhe-info">
          <h4>Fatura {fatura.numero}</h4>
          <div className="fatura-detalhe-meta">
            <span>Status: <strong>{statusFormatado.label}</strong></span>
            <span>Emissão: {formatarDataRelativa(fatura.dataEmissao)}</span>
            <span>Vencimento: {formatarDataRelativa(fatura.dataVencimento)}</span>
            {fatura.dataPagamento && (
              <span>Pagamento: {formatarDataRelativa(fatura.dataPagamento)}</span>
            )}
            {fatura.metodoPagamento && (
              <span>Método: <span className="metodo-badge">{fatura.metodoPagamento.toUpperCase()}</span></span>
            )}
          </div>
        </div>
        <button className="btn-fechar-detalhe" onClick={onFechar} aria-label="Fechar detalhes">×</button>
      </div>

      {/* Itens da fatura */}
      <div className="fatura-itens">
        <table>
          <thead>
            <tr>
              <th scope="col">Descrição</th>
              <th scope="col">Qtd</th>
              <th scope="col">Valor unit.</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {fatura.itens.map((item, i) => (
              <ItemFatura key={i} item={item} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo financeiro */}
      <div className="fatura-resumo">
        <table>
          <tbody>
            <LinhaResumo label="Subtotal" valor={formatarMoeda(fatura.itens.reduce((s, i) => s + i.valorTotal, 0))} />
            {fatura.valor !== fatura.itens.reduce((s, i) => s + i.valorTotal, 0) && (
              <LinhaResumo label="Descontos / Ajustes" valor={formatarMoeda(fatura.valor - fatura.itens.reduce((s, i) => s + i.valorTotal, 0))} />
            )}
            <LinhaResumo label="Total" valor={formatarMoeda(fatura.valor)} destaque />
            {fatura.valorPago > 0 && (
              <LinhaResumo label="Valor pago" valor={formatarMoeda(fatura.valorPago)} />
            )}
            {fatura.valor > fatura.valorPago && (
              <LinhaResumo label="Saldo devedor" valor={formatarMoeda(fatura.valor - fatura.valorPago)} destaque />
            )}
          </tbody>
        </table>
      </div>

      {/* Ações */}
      <div className="fatura-detalhe-acoes">
        {podeBaixar && fatura.pdfUrl && (
          <a
            href={fatura.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secundario"
            download
          >
            ⬇️ Baixar PDF
          </a>
        )}
        {podeImprimir && (
          <button
            className="btn btn-outline"
            onClick={handleImprimir}
            aria-label={`Imprimir fatura ${fatura.numero}`}
          >
            🖨️ Imprimir
          </button>
        )}
        {fatura.urlPix && fatura.status === 'pendente' && (
          <a
            href={fatura.urlPix}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primario"
          >
            💳 Pagar com Pix
          </a>
        )}
        {fatura.urlBoleto && fatura.status === 'pendente' && (
          <a
            href={fatura.urlBoleto}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            📄 Ver boleto
          </a>
        )}
      </div>
    </div>
  );
}