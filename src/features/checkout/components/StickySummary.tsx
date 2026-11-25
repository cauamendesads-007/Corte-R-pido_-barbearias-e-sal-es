/**
 * Resumo Sticky do Checkout - Fixo no bottom em mobile, sidebar em desktop.
 * 6 estados, WCAG 2.2 AA, prefers-reduced-motion.
 */

import React from 'react';
import type { StickySummaryProps } from '../types';
import { formatarMoeda } from '../types';
import { useStickySummary } from '../hooks/useCheckout';
import './StickySummary.css';

const METODOS_LABELS = {
  pix: { label: 'Pix', icone: '💡', descricao: 'Pagamento instantâneo, aprovado na hora' },
  cartao: { label: 'Cartão de crédito', icone: '💳', descricao: 'Até 12x sem juros' },
  boleto: { label: 'Boleto bancário', icone: '📄', descricao: 'Pague em até 3 dias úteis' },
} as const;

export function StickySummary(props: StickySummaryProps) {
  const {
    resumo,
    metodoSelecionado,
    carregando,
    desabilitado,
    visivel,
    aoSelecionarMetodo,
    aoPagar,
    parcelas,
  } = useStickySummary(props);

  if (!resumo) return null;

  const economiaPix = resumo.total > 0 ? Math.round(resumo.total * 0.05) : 0; // 5% off no Pix (exemplo)

  return (
    <>
      {/* Botão flutuante mobile para abrir resumo */}
      <button
        className={`sticky-trigger ${visivel ? 'visivel' : ''}`}
        onClick={() => { /* scroll to summary */ }}
        aria-label="Ver resumo do pedido"
        aria-expanded={visivel}
      >
        <span className="trigger-icone" aria-hidden="true">🛒</span>
        <span className="trigger-texto">Resumo: {formatarMoeda(resumo.total)}</span>
        <span className="trigger-seta" aria-hidden="true">▲</span>
      </button>

      {/* Painel principal */}
      <aside
        className={`sticky-summary ${visivel ? 'aberto' : ''}`}
        role="complementary"
        aria-label="Resumo do pedido"
      >
        <div className="summary-header">
          <h2>Resumo do pedido</h2>
          <button className="summary-fechar" onClick={() => { /* close */ }} aria-label="Fechar resumo">×</button>
        </div>

        {/* Itens */}
        <div className="summary-itens">
          {resumo.itens.map((item, index) => (
            <div key={index} className="summary-item">
              <div className="item-info">
                <span className="item-qtd">{item.quantidade}x</span>
                <span className="item-desc">{item.descricao}</span>
              </div>
              <span className="item-valor">{formatarMoeda(item.valorTotal)}</span>
            </div>
          ))}
        </div>

        {/* Totais */}
        <div className="summary-totais">
          <div className="total-linha">
            <span>Subtotal</span>
            <span>{formatarMoeda(resumo.subtotal)}</span>
          </div>
          {resumo.desconto > 0 && (
            <div className="total-linha desconto">
              <span>Desconto</span>
              <span>- {formatarMoeda(resumo.desconto)}</span>
            </div>
          )}
          {metodoSelecionado === 'pix' && economiaPix > 0 && (
            <div className="total-linha desconto pix-desconto">
              <span>Desconto Pix (5%)</span>
              <span>- {formatarMoeda(economiaPix)}</span>
            </div>
          )}
          <div className="total-linha total-final">
            <span>Total</span>
            <span>{formatarMoeda(resumo.total - (metodoSelecionado === 'pix' ? economiaPix : 0))}</span>
          </div>
        </div>

        {/* Seleção de método */}
        <fieldset className="summary-metodos">
          <legend>Forma de pagamento</legend>
          <div className="metodos-opcoes" role="radiogroup" aria-label="Selecione a forma de pagamento">
            {(Object.keys(METODOS_LABELS) as MetodoPagamento[]).map(metodo => {
              const info = METODOS_LABELS[metodo];
              const ativo = metodo === metodoSelecionado;
              return (
                <label key={metodo} className={`metodo-opcao ${ativo ? 'ativo' : ''}`}>
                  <input
                    type="radio"
                    name="metodo-pagamento"
                    value={metodo}
                    checked={ativo}
                    onChange={() => aoSelecionarMetodo(metodo)}
                    disabled={carregando}
                  />
                  <div className="metodo-conteudo">
                    <span className="metodo-icone" aria-hidden="true">{info.icone}</span>
                    <div className="metodo-textos">
                      <span className="metodo-label">{info.label}</span>
                      <span className="metodo-desc">{info.descricao}</span>
                    </div>
                  </div>
                  <span className="metodo-check" aria-hidden="true">✓</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Parcelamento (apenas cartão) */}
        {metodoSelecionado === 'cartao' && parcelas.length > 0 && (
          <div className="summary-parcelas">
            <label htmlFor="parcelas-select">Parcelamento</label>
            <select
              id="parcelas-select"
              value={parcelas[0]?.numero || 1}
              onChange={() => { /* handle parcelas */ }}
              disabled={carregando}
              className="parcelas-select"
            >
              {parcelas.map(p => (
                <option key={p.numero} value={p.numero}>
                  {p.numero}x de {formatarMoeda(p.valor)} {p.comJuros ? '(com juros)' : '(sem juros)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Botão de pagamento */}
        <button
          className={`btn-pagar ${carregando ? 'carregando' : ''} ${desabilitado ? 'desabilitado' : ''}`}
          onClick={aoPagar}
          disabled={carregando || desabilitado}
          aria-busy={carregando}
        >
          {carregando ? (
            <>
              <span className="spinner" aria-hidden="true"></span>
              Processando...
            </>
          ) : metodoSelecionado === 'pix' ? (
            `Pagar ${formatarMoeda(resumo.total - economiaPix)} com Pix`
          ) : metodoSelecionado === 'cartao' ? (
            `Pagar ${formatarMoeda(resumo.total)} no Cartão`
          ) : (
            `Gerar boleto de ${formatarMoeda(resumo.total)}`
          )}
        </button>

        {/* Segurança */}
        <div className="summary-seguranca" aria-label="Informações de segurança">
          <span className="seguranca-icone" aria-hidden="true">🔒</span>
          <span>Seus dados são protegidos por criptografia SSL</span>
        </div>
      </aside>

      {/* Overlay para mobile */}
      <div className={`sticky-overlay ${visivel ? 'aberto' : ''}`} onClick={() => { /* close */ }} aria-hidden="true" />
    </>
  );
}