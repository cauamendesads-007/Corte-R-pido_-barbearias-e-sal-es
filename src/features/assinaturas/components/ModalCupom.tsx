/**
 * Modal de Cupom - Validação em tempo real, sanitização, feedback acessível.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sanitizarCupom } from '../rules';
import { useAssinaturas } from '../hooks/useAssinaturas';
import './ModalCupom.css';

interface ModalCupomProps {
  aberto: boolean;
  _planoId?: string;
  _ciclo?: 'mensal' | 'anual';
  aoAplicar: (_codigo: string) => Promise<void>;
  aoFechar: () => void;
}

export function ModalCupom({ aberto, aoAplicar, aoFechar }: ModalCupomProps) {
  const [codigo, setCodigo] = useState('');
  const [validacao, setValidacao] = useState<{ valido: boolean; mensagem?: string; valorDesconto?: number } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { aplicarCupom } = useAssinaturas();

  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!aberto) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      aoFechar();
    }
  }, [aberto, aoFechar]);

  // Focus trap e ESC
  useEffect(() => {
    if (aberto) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
      // Reset estado
      setCodigo('');
      setValidacao(null);
      setErro(null);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [aberto, handleKeyDown]);

  const handleCodigoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizado = sanitizarCupom(e.target.value);
    setCodigo(sanitizado);
    setValidacao(null);
    setErro(null);
  }, []);

  const handleValidar = useCallback(async () => {
    if (!codigo.trim()) {
      setErro('Digite um código de cupom');
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      // Validar via service
      const resultado = await aplicarCupom(codigo);
      setValidacao({
        valido: resultado.valido,
        mensagem: resultado.valido ? undefined : resultado.erro,
        valorDesconto: resultado.valorDesconto,
      });

      if (!resultado.valido) {
        setErro(resultado.erro || 'Cupom inválido');
      }
    } catch {
      setErro('Erro ao validar cupom. Tente novamente.');
      setValidacao({ valido: false, mensagem: 'Erro ao validar' });
    } finally {
      setCarregando(false);
    }
  }, [codigo, aplicarCupom]);

  const handleAplicar = useCallback(async () => {
    if (!validacao?.valido || carregando) return;

    setCarregando(true);
    try {
      await aoAplicar(codigo);
      aoFechar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao aplicar cupom');
    } finally {
      setCarregando(false);
    }
  }, [validacao, carregando, codigo, aoAplicar, aoFechar]);

  if (!aberto) return null;

  return (
    <div
      className="modal-overlay modal-cupom"
      onClick={e => { if (e.target === e.currentTarget) aoFechar(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cupom-titulo"
      aria-describedby="cupom-descricao"
    >
      <div className="modal-content" role="document">
        <header className="modal-header">
          <div className="modal-icone" aria-hidden="true">🎫</div>
          <h2 id="cupom-titulo" className="modal-titulo">Aplicar cupom de desconto</h2>
          <button
            className="modal-fechar"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          <p id="cupom-descricao" className="modal-descricao">
            Insira o código do cupom para ver o desconto aplicado ao seu plano.
          </p>

          <div className="cupom-input-wrapper">
            <label htmlFor="cupom-codigo" className="visually-hidden">Código do cupom</label>
            <input
              ref={inputRef}
              id="cupom-codigo"
              type="text"
              value={codigo}
              onChange={handleCodigoChange}
              placeholder="EX: BEMVINDO20"
              maxLength={20}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={carregando}
              className={`cupom-input ${validacao?.valido === false ? 'erro' : validacao?.valido ? 'sucesso' : ''}`}
              aria-describedby={validacao ? 'cupom-feedback' : undefined}
              aria-invalid={validacao?.valido === false}
            />
            <button
              type="button"
              className="btn btn-secundario cupom-validar-btn"
              onClick={handleValidar}
              disabled={!codigo.trim() || carregando}
              aria-label="Validar cupom"
            >
              {carregando && validacao === null ? 'Validando...' : 'Validar'}
            </button>
          </div>

          {validacao && (
            <div
              id="cupom-feedback"
              className={`cupom-feedback ${validacao.valido ? 'sucesso' : 'erro'}`}
              role="status"
              aria-live="polite"
            >
              {validacao.valido ? (
                <>
                  <span className="feedback-icone" aria-hidden="true">✓</span>
                  <span>Cupom válido! Desconto de <strong>{validacao.valorDesconto > 0 ? `R$ ${(validacao.valorDesconto / 100).toFixed(2).replace('.', ',')}` : 'valor especial'}</strong></span>
                </>
              ) : (
                <>
                  <span className="feedback-icone" aria-hidden="true">✗</span>
                  <span>{validacao.mensagem || 'Cupom inválido'}</span>
                </>
              )}
            </div>
          )}

          {erro && !validacao && (
            <div className="cupom-erro" role="alert" aria-live="assertive">
              <span aria-hidden="true">⚠</span>
              <span>{erro}</span>
            </div>
          )}

          <div className="cupom-exemplos">
            <p className="exemplos-titulo">Exemplos de cupons:</p>
            <ul>
              <li><code>BEMVINDO20</code> — 20% na primeira assinatura (Profissional/Enterprise)</li>
              <li><code>ANUAL15</code> — 15% extra no plano anual</li>
            </ul>
          </div>
        </div>

        <footer className="modal-footer">
          <button
            className="btn btn-secundario"
            onClick={aoFechar}
            disabled={carregando}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primario"
            onClick={handleAplicar}
            disabled={!validacao?.valido || carregando}
          >
            {carregando ? 'Aplicando...' : 'Aplicar cupom'}
          </button>
        </footer>
      </div>
    </div>
  );
}