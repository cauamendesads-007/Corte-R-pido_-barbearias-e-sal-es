/**
 * QR Code Pix - Exibição, contagem regressiva, copiar pix copia e cola.
 * Acessível, 6 estados, WCAG 2.2 AA, prefers-reduced-motion.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PixQrCodeProps } from '../types';
import { formatarMoeda } from '../types';
import './PixQrCode.css';

export function PixQrCode({ dados, aoCopiar, aoExpirar, tempoRestante: tempoRestanteProp }: PixQrCodeProps) {
  const [tempoRestante, setTempoRestante] = useState(tempoRestanteProp);
  const [copiado, setCopiado] = useState(false);
  const [qrCodeError, setQrCodeError] = useState(false);
  const qrCodeRef = useRef<HTMLImageElement>(null);
  const tempoRestanteRef = useRef(tempoRestante);
  tempoRestanteRef.current = tempoRestante;

  // Contagem regressiva
  useEffect(() => {
    if (tempoRestanteRef.current <= 0) return;

    const interval = setInterval(() => {
      setTempoRestante(prev => {
        const novo = prev - 1;
        if (novo <= 0) {
          clearInterval(interval);
          aoExpirar();
          return 0;
        }
        return novo;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [aoExpirar]);

  // Sincronizar com prop
  useEffect(() => {
    setTempoRestante(tempoRestanteProp);
  }, [tempoRestanteProp]);

  const formatarTempo = useCallback((segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleCopiar = useCallback(async () => {
    await aoCopiar();
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }, [aoCopiar]);

  const handleQrCodeError = useCallback(() => {
    setQrCodeError(true);
  }, []);

  const expiracao = new Date(dados.expiracao);
  const jaExpirou = tempoRestante <= 0 || new Date() > expiracao;

  return (
    <div className={`pix-qrcode ${jaExpirou ? 'expirado' : ''}`} role="region" aria-label="Pagamento com Pix" aria-live="polite">
      <div className="pix-header">
        <div className="pix-metodo">
          <span className="pix-icone" aria-hidden="true">💡</span>
          <div>
            <strong>Pagamento com Pix</strong>
            <span className="pix-valor">{formatarMoeda(dados.valor)}</span>
          </div>
        </div>
        <div className="pix-tempo" aria-live="assertive" aria-atomic="true">
          {jaExpirou ? (
            <span className="tempo-expirado">⏰ QR Code expirado</span>
          ) : (
            <>
              <span className="tempo-label">Expira em</span>
              <span className="tempo-valor" role="timer">{formatarTempo(tempoRestante)}</span>
            </>
          )}
        </div>
      </div>

      <div className="pix-qrcode-container">
        {!qrCodeError && dados.qrCodeImage ? (
          <img
            ref={qrCodeRef}
            src={dados.qrCodeImage}
            alt={`QR Code Pix para pagamento de ${formatarMoeda(dados.valor)}`}
            className="pix-qrcode-image"
            onError={handleQrCodeError}
            loading="lazy"
          />
        ) : (
          <div className="pix-qrcode-fallback" aria-hidden="true">
            <div className="qrcode-placeholder">
              <svg viewBox="0 0 200 200" width="200" height="200" aria-hidden="true">
                <rect x="10" y="10" width="30" height="30" fill="black" />
                <rect x="50" y="10" width="30" height="30" fill="black" />
                <rect x="90" y="10" width="30" height="30" fill="black" />
                <rect x="130" y="10" width="30" height="30" fill="black" />
                <rect x="10" y="50" width="30" height="30" fill="black" />
                <rect x="10" y="90" width="30" height="30" fill="black" />
                <rect x="10" y="130" width="30" height="30" fill="black" />
                <rect x="160" y="50" width="30" height="30" fill="black" />
                <rect x="160" y="90" width="30" height="30" fill="black" />
                <rect x="160" y="130" width="30" height="30" fill="black" />
                <rect x="50" y="160" width="30" height="30" fill="black" />
                <rect x="90" y="160" width="30" height="30" fill="black" />
                <rect x="130" y="160" width="30" height="30" fill="black" />
              </svg>
            </div>
            <p>QR Code indisponível</p>
            <p className="pix-copia-cola-label">Use o código "Pix Copia e Cola" abaixo</p>
          </div>
        )}
      </div>

      {/* Pix Copia e Cola */}
      <div className="pix-copia-cola">
        <label htmlFor="pix-copia-cola" className="pix-copia-cola-label">
          Pix Copia e Cola
        </label>
        <div className="pix-copia-cola-input-wrapper">
          <textarea
            id="pix-copia-cola"
            readOnly
            value={dados.qrCode}
            className="pix-copia-cola-input"
            aria-describedby="pix-copia-cola-desc"
          />
          <button
            type="button"
            className={`btn-copiar ${copiado ? 'copiado' : ''}`}
            onClick={handleCopiar}
            aria-label={copiado ? 'Copiado!' : 'Copiar código Pix'}
            disabled={copiado}
          >
            {copiado ? '✓ Copiado' : '📋 Copiar'}
          </button>
        </div>
        <p id="pix-copia-cola-desc" className="pix-copia-cola-desc">
          Abra o app do seu banco, escolha "Pix Copia e Cola" e cole o código acima
        </p>
      </div>

      {/* Instruções */}
      <div className="pix-instrucoes">
        <h4>Como pagar:</h4>
        <ol>
          <li>Abra o aplicativo do seu banco</li>
          <li>Toque em "Pix" e depois em "Pagar"</li>
          <li>Escolha "Ler QR Code" ou "Pix Copia e Cola"</li>
          <li>Confira o valor: <strong>{formatarMoeda(dados.valor)}</strong></li>
          <li>Confirme o pagamento</li>
        </ol>
        <p className="pix-nota">
          O pagamento é aprovado instantaneamente. Seu acesso será liberado em segundos.
        </p>
      </div>

      {jaExpirou && (
        <div className="pix-expirado" role="alert">
          <span className="expirado-icone" aria-hidden="true">⏰</span>
          <div>
            <strong>QR Code expirado</strong>
            <p>Gere um novo QR Code para continuar o pagamento.</p>
          </div>
          <button type="button" className="btn-gerar-novo" onClick={() => { /* trigger regenerate */ }}>
            Gerar novo QR Code
          </button>
        </div>
      )}
    </div>
  );
}