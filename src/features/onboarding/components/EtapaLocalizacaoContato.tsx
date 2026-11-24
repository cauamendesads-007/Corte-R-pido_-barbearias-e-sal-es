/**
 * Etapa de Localização e Contato do Onboarding.
 */

import React from 'react';
import { Container, CampoTexto } from '@/componentes';
import { useOnboarding } from '../hooks/useOnboarding';
import './Onboarding.css';

interface EtapaLocalizacaoContatoProps {
  aoAvancar: () => void;
  aoVoltar: () => void;
  desabilitado?: boolean;
}

export const EtapaLocalizacaoContato: React.FC<EtapaLocalizacaoContatoProps> = ({
  aoAvancar,
  aoVoltar,
  desabilitado = false,
}) => {
  const { dados, atualizarDados, erros } = useOnboarding();

  const formatarCep = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 5) return numeros;
    return `${numeros.slice(0, 5)}-${numeros.slice(5, 8)}`;
  };

  const formatarWhatsapp = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 2) return `(${numeros}`;
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  };

  return (
    <Container variante="com-cabecalho" className="onboarding__etapa onboarding__localizacao-contato">
      <header className="onboarding__cabecalho">
        <h2>Localização e Contato</h2>
        <p className="onboarding__descricao">Onde os clientes vão te encontrar e como entrar em contato</p>
      </header>

      <div className="onboarding__formulario">
        <div className="onboarding__campo">
          <CampoTexto
            label="CEP"
            placeholder="00000-000"
            valor={dados.cep}
            aoAlterar={(v) => atualizarDados({ cep: formatarCep(v) })}
            erro={erros.cep}
            maxLength={9}
            inputMode="numeric"
            autoComplete="postal-code"
          />
        </div>

        <div className="onboarding__campo">
          <CampoTexto
            label="Endereço Completo *"
            placeholder="Rua, número, complemento, bairro"
            valor={dados.endereco}
            aoAlterar={(v) => atualizarDados({ endereco: v })}
            erro={erros.endereco}
            obrigatorio
            maxLength={150}
            autoComplete="street-address"
          />
        </div>

        <div className="onboarding__campo">
          <CampoTexto
            label="Cidade *"
            placeholder="São Paulo"
            valor={dados.cidade}
            aoAlterar={(v) => atualizarDados({ cidade: v })}
            erro={erros.cidade}
            obrigatorio
            maxLength={60}
            autoComplete="address-level2"
          />
        </div>

        <div className="onboarding__campo">
          <CampoTexto
            label="WhatsApp para Contato *"
            placeholder="(11) 99999-9999"
            valor={dados.whatsapp}
            aoAlterar={(v) => atualizarDados({ whatsapp: formatarWhatsapp(v) })}
            erro={erros.whatsapp}
            obrigatorio
            maxLength={15}
            inputMode="tel"
            autoComplete="tel"
          />
          <p className="onboarding__ajuda">
            Será usado para notificações e link direto no perfil público
          </p>
        </div>

        <div className="onboarding__campo">
          <label className="onboarding__label">Horário de Funcionamento *</label>
          <div className="onboarding__horario-grupo">
            <CampoTexto
              label="Abertura"
              placeholder="09:00"
              valor={dados.horarioFuncionamento.split('-')[0] || '09:00'}
              aoAlterar={(v) => atualizarDados({ horarioFuncionamento: `${v}-${dados.horarioFuncionamento.split('-')[1] || '18:00'}` })}
              tipo="time"
              inputMode="numeric"
              maxLength={5}
              className="onboarding__horario-input"
            />
            <span className="onboarding__horario-separador">até</span>
            <CampoTexto
              label="Fechamento"
              placeholder="18:00"
              valor={dados.horarioFuncionamento.split('-')[1] || '18:00'}
              aoAlterar={(v) => atualizarDados({ horarioFuncionamento: `${dados.horarioFuncionamento.split('-')[0] || '09:00'}-${v}` })}
              tipo="time"
              inputMode="numeric"
              maxLength={5}
              className="onboarding__horario-input"
            />
          </div>
          {erros.horarioFuncionamento && <p className="onboarding__erro">{erros.horarioFuncionamento}</p>}
        </div>
      </div>

      <footer className="onboarding__rodape">
        <button
          type="button"
          className="botao botao--secundario onboarding__botao-voltar"
          onClick={aoVoltar}
          disabled={desabilitado}
        >
          Voltar
        </button>
        <button
          type="button"
          className="botao botao--primario onboarding__botao-avancar"
          onClick={aoAvancar}
          disabled={desabilitado}
        >
          Próximo: Serviços e Preços
        </button>
      </footer>
    </Container>
  );
};

export default EtapaLocalizacaoContato;