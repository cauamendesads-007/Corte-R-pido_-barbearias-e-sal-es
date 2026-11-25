/**
 * Checkout Principal - Orquestra StickySummary, PixQrCode, CartaoForm, Boleto.
 * Idempotência, AbortController, LGPD-ready, WCAG 2.2 AA.
 */

import React, { useState, useCallback, useEffect } from 'react';
import type {
  ItemCheckout,
  CheckoutSession,
} from '../types';
import { useCheckout } from '../hooks/useCheckout';
import { StickySummary } from './StickySummary';
import { PixQrCode } from './PixQrCode';
import { CartaoForm } from './CartaoForm';
import { BoletoView } from './BoletoView';
import { ModalSucesso } from './ModalSucesso';
import './Checkout.css';

interface CheckoutProps {
  itens: ItemCheckout[];
  desconto?: number;
  _metadata?: Record<string, unknown>;
  aoSucesso?: (_session: CheckoutSession) => void;
  aoErro?: (_erro: Error) => void;
}

export function Checkout({
  itens,
  desconto = 0,
  aoSucesso,
  aoErro,
}: CheckoutProps) {
  const {
    sessao,
    resumo,
    metodoSelecionado,
    carregando,
    erro,
    pixDados,
    pixTempoRestante,
    boletoDados,
    iniciarCheckout,
    trocarMetodo,
    gerarPix,
    copiarPixCopiaCola,
    pagarCartao,
    gerarBoleto,
    limparErro,
    resetar,
  } = useCheckout();

  const [modalSucesso, setModalSucesso] = useState<CheckoutSession | null>(null);
  const [pixChave] = useState('');
  const [pixGerado, setPixGerado] = useState(false);

  // Iniciar checkout na montagem
  useEffect(() => {
    if (itens.length > 0 && !sessao) {
      iniciarCheckout(itens, 'pix', desconto).catch(aoErro);
    }
  }, [itens, desconto, sessao, iniciarCheckout, aoErro]);

  // Regenerar pagamento se método mudar
  useEffect(() => {
    if (!sessao || !resumo) return;

    const gerarPagamento = async () => {
      try {
        switch (metodoSelecionado) {
          case 'pix':
            if (!pixGerado && pixChave) {
              await gerarPix(pixChave);
              setPixGerado(true);
            }
            break;
          case 'boleto':
            if (!boletoDados) {
              await gerarBoleto();
            }
            break;
          case 'cartao':
            // Cartão é processado no submit do formulário
            break;
        }
      } catch {
        // Erro já tratado no hook
      }
    };

    gerarPagamento();
  }, [metodoSelecionado, sessao, resumo, pixGerado, pixChave, boletoDados, gerarPix, gerarBoleto]);

  const handlePagarCartao = useCallback(async (dados: DadosPagamentoCartao) => {
    try {
      const resultado = await pagarCartao(dados);
      if (resultado.autorizado && sessao) {
        const sessaoAtualizada = { ...sessao, status: 'aprovado' as StatusPagamento };
        setModalSucesso(sessaoAtualizada);
        aoSucesso?.(sessaoAtualizada);
      }
    } catch {
      // Erro tratado no hook
    }
  }, [pagarCartao, sessao, aoSucesso]);

  const handleFecharSucesso = useCallback(() => {
    setModalSucesso(null);
    resetar();
  }, [resetar]);

  if (!resumo) {
    return (
      <div className="checkout carregando" role="status" aria-live="polite">
        <div className="checkout-skeleton">
          <div className="skeleton-summary" />
          <div className="skeleton-form" />
        </div>
      </div>
    );
  }

  return (
    <div className="checkout">
      {/* Sticky Summary (mobile bottom sheet, desktop sidebar) */}
      <StickySummary
        resumo={resumo}
        metodoSelecionado={metodoSelecionado}
        carregando={carregando}
        aoSelecionarMetodo={trocarMetodo}
        aoPagar={() => { /* handled by forms */ }}
      />

      <div className="checkout-container">
        <div className="checkout-main">
          <header className="checkout-header">
            <h1>Finalizar compra</h1>
            <p className="checkout-subtitle">
              {resumo.itens.length} item{resumo.itens.length !== 1 ? 's' : ''} · {resumo.formatoMoeda(resumo.total)}
            </p>
          </header>

          {erro && (
            <div className="checkout-erro" role="alert">
              <button onClick={limparErro} aria-label="Fechar" className="erro-fechar">×</button>
              <span>{erro}</span>
            </div>
          )}

          {/* Formulário baseado no método selecionado */}
          <div className="checkout-formulario" role="region" aria-label={`Pagamento com ${metodoSelecionado}`}>
            {metodoSelecionado === 'pix' && (
              <PixQrCode
                dados={pixDados!}
                aoCopiar={copiarPixCopiaCola}
                aoExpirar={() => setPixGerado(false)}
                tempoRestante={pixTempoRestante}
              />
            )}

            {metodoSelecionado === 'cartao' && (
              <CartaoForm
                valor={resumo.total}
                aoPagar={handlePagarCartao}
                carregando={carregando}
                erro={erro}
              />
            )}

            {metodoSelecionado === 'boleto' && (
              <BoletoView
                dados={boletoDados}
                carregando={carregando}
                aoGerar={gerarBoleto}
              />
            )}

            {(!pixDados && metodoSelecionado === 'pix') || (!boletoDados && metodoSelecionado === 'boleto') ? (
              <div className="checkout-gerar">
                <p>Clique em "Pagar" no resumo para gerar o {metodoSelecionado === 'pix' ? 'QR Code Pix' : 'boleto'}.</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Sidebar desktop com resumo dos itens */}
        <aside className="checkout-sidebar" aria-label="Detalhes do pedido">
          <div className="sidebar-itens">
            <h2>Itens do pedido</h2>
            {resumo.itens.map((item, index) => (
              <div key={index} className="sidebar-item">
                <div className="sidebar-item-info">
                  <span className="sidebar-item-qtd">{item.quantidade}x</span>
                  <span className="sidebar-item-desc">{item.descricao}</span>
                </div>
                <span className="sidebar-item-valor">{resumo.formatoMoeda(item.valorTotal)}</span>
              </div>
            ))}
          </div>

          <div className="sidebar-totais">
            <div className="sidebar-total-linha">
              <span>Subtotal</span>
              <span>{resumo.formatoMoeda(resumo.subtotal)}</span>
            </div>
            {resumo.desconto > 0 && (
              <div className="sidebar-total-linha desconto">
                <span>Desconto</span>
                <span>- {resumo.formatoMoeda(resumo.desconto)}</span>
              </div>
            )}
            <div className="sidebar-total-linha total">
              <span>Total</span>
              <span>{resumo.formatoMoeda(resumo.total)}</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal de sucesso */}
      {modalSucesso && (
        <ModalSucesso
          sessao={modalSucesso}
          aoFechar={handleFecharSucesso}
        />
      )}
    </div>
  );
}