/**
 * Formulário de Cartão - inputmode, autocomplete, máscara algorítmica, validação Luhn.
 * 6 estados, WCAG 2.2 AA, LGPD-ready (não armazena CVV).
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { DadosPagamentoCartao, BandeiraCartao, CartaoFormProps } from '../types';
import { identificarBandeira, calcularParcelas, BANDEIRA_LABELS, formatarMoeda } from '../types';
import { validarCartaoCompleto } from '../rules';
import { useCartaoForm } from '../hooks/useCheckout';
import './CartaoForm.css';

const BANDEIRA_ICONE: Record<BandeiraCartao, string> = {
  visa: '💳',
  mastercard: '💳',
  elo: '💳',
  amex: '💳',
  hipercard: '💳',
  desconhecida: '💳',
};

export function CartaoForm({ valor, carregando, parcelasMaximas = 12 }: CartaoFormProps) {
  const {
    numero,
    nomeTitular,
    validade,
    cvv,
    parcelas,
    salvarCartao,
    bandeira,
    erros,
    valido,
    setNumero,
    setNomeTitular,
    setValidade,
    setCvv,
    setParcelas,
    setSalvarCartao,
    handleBlur,
    pagarCartao,
    dadosCartao,
  } = useCartaoForm(valor);

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const parcelasDisponiveis = useMemo(() => calcularParcelas(valor, parcelasMaximas), [valor, parcelasMaximas]);
  const parcelaSelecionada = parcelasDisponiveis.find(p => p.numero === parcelas) || parcelasDisponiveis[0];

  // Detectar bandeira em tempo real
  useEffect(() => {
    if (numero) {
      identificarBandeira(numero);
      // Bandeira é atualizada via hook
    }
  }, [numero]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Marcar todos como touched
    setTouched({ numero: true, nomeTitular: true, validade: true, cvv: true });

    // Validar tudo
    const validacao = await validarCartaoCompleto(dadosCartao);
    if (!validacao.valido) return;

    try {
      await pagarCartao(dadosCartao);
    } catch {
      // Erro já tratado no hook
    }
  }, [dadosCartao, pagarCartao]);

  const handleBlurWrapper = useCallback((campo: string) => {
    setTouched(prev => ({ ...prev, [campo]: true }));
    handleBlur(campo, dadosCartao[campo as keyof DadosPagamentoCartao] as string);
  }, [handleBlur, dadosCartao]);

  return (
    <form className="cartao-form" onSubmit={handleSubmit} noValidate>
      {erro && (
        <div className="form-erro-global" role="alert">
          <span aria-hidden="true">⚠</span>
          <span>{erro}</span>
        </div>
      )}

      {/* Número do cartão */}
      <div className="form-campo">
        <label htmlFor="cartao-numero" className="form-label">
          Número do cartão
          <span className="form-obrigatorio" aria-hidden="true">*</span>
        </label>
        <div className="form-input-wrapper">
          <input
            id="cartao-numero"
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            value={numero}
            onChange={setNumero}
            onBlur={() => handleBlurWrapper('numero')}
            placeholder="0000 0000 0000 0000"
            maxLength={19}
            disabled={carregando}
            className={`form-input ${touched.numero && erros.numero ? 'erro' : ''} ${bandeira !== 'desconhecida' ? `bandeira-${bandeira}` : ''}`}
            aria-describedby={touched.numero && erros.numero ? 'erro-numero' : undefined}
            aria-invalid={touched.numero && !!erros.numero}
          />
          {bandeira !== 'desconhecida' && (
            <span className="input-bandeira" aria-label={`Bandeira: ${BANDEIRA_LABELS[bandeira]}`}>
              {BANDEIRA_ICONE[bandeira]}
            </span>
          )}
        </div>
        {touched.numero && erros.numero && (
          <p id="erro-numero" className="form-erro" role="alert">{erros.numero}</p>
        )}
      </div>

      {/* Linha: Validade e CVV */}
      <div className="form-linha">
        <div className="form-campo flex-1">
          <label htmlFor="cartao-validade" className="form-label">
            Validade (MM/AA)
            <span className="form-obrigatorio" aria-hidden="true">*</span>
          </label>
          <div className="form-input-wrapper">
            <input
              id="cartao-validade"
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              value={validade}
              onChange={setValidade}
              onBlur={() => handleBlurWrapper('validade')}
              placeholder="MM/AA"
              maxLength={5}
              disabled={carregando}
              className={`form-input ${touched.validade && erros.validade ? 'erro' : ''}`}
              aria-describedby={touched.validade && erros.validade ? 'erro-validade' : undefined}
              aria-invalid={touched.validade && !!erros.validade}
            />
          </div>
          {touched.validade && erros.validade && (
            <p id="erro-validade" className="form-erro" role="alert">{erros.validade}</p>
          )}
        </div>

        <div className="form-campo flex-1">
          <label htmlFor="cartao-cvv" className="form-label">
            CVV
            <span className="form-obrigatorio" aria-hidden="true">*</span>
          </label>
          <div className="form-input-wrapper">
            <input
              id="cartao-cvv"
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={cvv}
              onChange={setCvv}
              onBlur={() => handleBlurWrapper('cvv')}
              placeholder={bandeira === 'amex' ? '1234' : '123'}
              maxLength={bandeira === 'amex' ? 4 : 3}
              disabled={carregando}
              className={`form-input ${touched.cvv && erros.cvv ? 'erro' : ''}`}
              aria-describedby={touched.cvv && erros.cvv ? 'erro-cvv' : 'cvv-ajuda'}
              aria-invalid={touched.cvv && !!erros.cvv}
            />
          </div>
          <p id="cvv-ajuda" className="form-ajuda">
            {bandeira === 'amex' ? '4 dígitos na frente' : '3 dígitos no verso'}
          </p>
          {touched.cvv && erros.cvv && (
            <p id="erro-cvv" className="form-erro" role="alert">{erros.cvv}</p>
          )}
        </div>
      </div>

      {/* Nome do titular */}
      <div className="form-campo">
        <label htmlFor="cartao-nome" className="form-label">
          Nome no cartão
          <span className="form-obrigatorio" aria-hidden="true">*</span>
        </label>
        <input
          id="cartao-nome"
          type="text"
          autoComplete="cc-name"
          value={nomeTitular}
          onChange={setNomeTitular}
          onBlur={() => handleBlurWrapper('nomeTitular')}
          placeholder="JOÃO DA SILVA"
          disabled={carregando}
          className={`form-input ${touched.nomeTitular && erros.nomeTitular ? 'erro' : ''}`}
          aria-describedby={touched.nomeTitular && erros.nomeTitular ? 'erro-nome' : undefined}
          aria-invalid={touched.nomeTitular && !!erros.nomeTitular}
        />
        {touched.nomeTitular && erros.nomeTitular && (
          <p id="erro-nome" className="form-erro" role="alert">{erros.nomeTitular}</p>
        )}
      </div>

      {/* Parcelamento */}
      <div className="form-campo">
        <label htmlFor="cartao-parcelas" className="form-label">
          Parcelamento
        </label>
        <div className="parcelas-opcoes" role="radiogroup" aria-label="Selecione o número de parcelas">
          {parcelasDisponiveis.map(p => (
            <label key={p.numero} className={`parcela-opcao ${p.numero === parcelas ? 'selecionada' : ''} ${p.comJuros ? 'com-juros' : ''}`}>
              <input
                type="radio"
                name="parcelas"
                value={p.numero}
                checked={p.numero === parcelas}
                onChange={() => setParcelas(p.numero)}
                disabled={carregando}
              />
              <div className="parcela-conteudo">
                <span className="parcela-numero">{p.numero}x</span>
                <span className="parcela-valor">{formatarMoeda(p.valor)}</span>
                {p.comJuros && <span className="parcela-juros">com juros</span>}
              </div>
            </label>
          ))}
        </div>
        <p className="form-ajuda">
          Total: <strong>{formatarMoeda(parcelaSelecionada.total)}</strong>
          {parcelaSelecionada.comJuros && ' (inclui juros de 2,99% a.m.)'}
        </p>
      </div>

      {/* Salvar cartão */}
      <div className="form-campo form-checkbox">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={salvarCartao}
            onChange={e => setSalvarCartao(e.target.checked)}
            disabled={carregando}
            className="checkbox-input"
          />
          <span className="checkbox-custom" aria-hidden="true"></span>
          <span className="checkbox-texto">Salvar este cartão para futuras compras (tokenizado, seguro)</span>
        </label>
      </div>

      {/* Botão pagar */}
      <button
        type="submit"
        className={`btn-pagar-cartao ${carregando ? 'carregando' : ''}`}
        disabled={carregando || !valido}
        aria-busy={carregando}
      >
        {carregando ? (
          <>
            <span className="spinner" aria-hidden="true"></span>
            Processando pagamento...
          </>
        ) : (
          `Pagar ${formatarMoeda(parcelaSelecionada.total)}`
        )}
      </button>

      {/* Segurança */}
      <div className="form-seguranca" aria-label="Informações de segurança">
        <span className="seguranca-icone" aria-hidden="true">🔒</span>
        <span>Dados criptografados. Não armazenamos seu CVV.</span>
        <a href="#" className="seguranca-link">Saiba mais</a>
      </div>
    </form>
  );
}