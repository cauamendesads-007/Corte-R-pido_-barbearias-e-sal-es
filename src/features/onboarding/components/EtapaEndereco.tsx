/**
 * Etapa Endereço do Onboarding.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useCallback } from 'react';
import {
  Cartao,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  Input,
  Select,
  Alerta,
} from '@/componentes';
import type { EtapaEnderecoProps } from '../types';
import { formatarCEP } from '../rules';
import './EtapaEndereco.css';

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const EtapaEndereco = ({
  dados,
  aoAlterar,
  aoAvancar,
  aoVoltar,
  erros,
  touched,
  aoBlur,
  carregando = false,
}: EtapaEnderecoProps) => {
  const handleCEPChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 8);
    aoAlterar('cep', valor);
  }, [aoAlterar]);

  return (
    <Cartao className="onboarding-etapa onboarding-etapa--endereco" data-testid="etapa-endereco">
      <CartaoCorpo className="onboarding-etapa__conteudo">
        <div className="onboarding-etapa__header">
          <h1 className="onboarding-etapa__titulo">Seu endereço</h1>
          <p className="onboarding-etapa__subtitulo">
            Informe seu endereço para encontrarmos barbeiros próximos a você.
          </p>
        </div>

        <form className="onboarding-etapa__form" onSubmit={(e) => { e.preventDefault(); aoAvancar(); }} noValidate>
          {erros.form && (
            <Alerta
              tipo="erro"
              mensagem={erros.form}
              className="onboarding-etapa__erro-form"
              data-testid="erro-form"
            />
          )}

          <div className="onboarding-etapa__grid">
            <Input
              label="CEP *"
              value={dados.cep || ''}
              onChange={handleCEPChange}
              onBlur={(e) => aoBlur('cep')}
              erro={touched.cep ? erros.cep : undefined}
              placeholder="00000-000"
              inputMode="numeric"
              autoComplete="postal-code"
              mascara={formatarCEP}
              required
              desabilitado={carregando}
              data-testid="input-cep"
            />

            <Input
              label="Logradouro *"
              value={dados.logradouro || ''}
              onChange={(e) => aoAlterar('logradouro', e.target.value.trim())}
              onBlur={(e) => aoBlur('logradouro')}
              erro={touched.logradouro ? erros.logradouro : undefined}
              placeholder="Rua, Avenida, etc."
              inputMode="text"
              autoComplete="street-address"
              required
              desabilitado={carregando}
              data-testid="input-logradouro"
            />

            <Input
              label="Número *"
              value={dados.numero || ''}
              onChange={(e) => aoAlterar('numero', e.target.value.trim())}
              onBlur={(e) => aoBlur('numero')}
              erro={touched.numero ? erros.numero : undefined}
              placeholder="123"
              inputMode="text"
              autoComplete="street-address"
              required
              desabilitado={carregando}
              data-testid="input-numero"
            />

            <Input
              label="Complemento"
              value={dados.complemento || ''}
              onChange={(e) => aoAlterar('complemento', e.target.value.trim())}
              onBlur={(e) => aoBlur('complemento')}
              erro={touched.complemento ? erros.complemento : undefined}
              placeholder="Apto, Bloco, etc."
              inputMode="text"
              autoComplete="address-line2"
              desabilitado={carregando}
              data-testid="input-complemento"
            />

            <Input
              label="Bairro *"
              value={dados.bairro || ''}
              onChange={(e) => aoAlterar('bairro', e.target.value.trim())}
              onBlur={(e) => aoBlur('bairro')}
              erro={touched.bairro ? erros.bairro : undefined}
              placeholder="Centro"
              inputMode="text"
              autoComplete="address-level3"
              required
              desabilitado={carregando}
              data-testid="input-bairro"
            />

            <Input
              label="Cidade *"
              value={dados.cidade || ''}
              onChange={(e) => aoAlterar('cidade', e.target.value.trim())}
              onBlur={(e) => aoBlur('cidade')}
              erro={touched.cidade ? erros.cidade : undefined}
              placeholder="São Paulo"
              inputMode="text"
              autoComplete="address-level2"
              required
              desabilitado={carregando}
              data-testid="input-cidade"
            />

            <Select
              label="Estado *"
              value={dados.estado || ''}
              onChange={(e) => aoAlterar('estado', e.target.value.toUpperCase())}
              onBlur={(e) => aoBlur('estado')}
              erro={touched.estado ? erros.estado : undefined}
              opcoes={ESTADOS_BR.map((uf) => ({ valor: uf, rotulo: uf }))}
              placeholder="SP"
              required
              desabilitado={carregando}
              data-testid="select-estado"
            />
          </div>

          <div className="onboarding-etapa__acoes">
            <BotaoSecundario
              tipo="button"
              onClick={aoVoltar}
              icone="seta-esquerda"
              data-testid="btn-voltar"
            >
              Voltar
            </BotaoSecundario>
            <BotaoPrimario
              tipo="submit"
              carregando={carregando}
              icone="seta-direita"
              iconePosicao="direita"
              data-testid="btn-avancar"
            >
              Continuar
            </BotaoPrimario>
          </div>
        </form>
      </CartaoCorpo>
    </Cartao>
  );
};

export default EtapaEndereco;