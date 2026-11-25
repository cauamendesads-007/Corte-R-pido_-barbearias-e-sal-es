/**
 * Etapa Preferências do Onboarding.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import {
  Cartao,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  Switch,
  Select,
} from '@/componentes';
import type { EtapaPreferenciasProps } from '../types';
import './EtapaPreferencias.css';

const OPCOES_TEMA = [
  { valor: 'sistema', rotulo: 'Sistema', icone: 'monitor' },
  { valor: 'claro', rotulo: 'Claro', icone: 'sol' },
  { valor: 'escuro', rotulo: 'Escuro', icone: 'lua' },
] as const;

export const EtapaPreferencias = ({
  dados,
  aoAlterar,
  aoAvancar,
  aoVoltar,
  aoConcluir,
  carregando = false,
}: EtapaPreferenciasProps) => {
  return (
    <Cartao className="onboarding-etapa onboarding-etapa--preferencias" data-testid="etapa-preferencias">
      <CartaoCorpo className="onboarding-etapa__conteudo">
        <div className="onboarding-etapa__header">
          <h1 className="onboarding-etapa__titulo">Suas preferências</h1>
          <p className="onboarding-etapa__subtitulo">
            Personalize como você quer receber notificações e a aparência do app.
            Pode alterar tudo isso depois nas configurações.
          </p>
        </div>

        <form className="onboarding-etapa__form" onSubmit={(e) => { e.preventDefault(); aoConcluir(); }} noValidate>
          {/* Notificações */}
          <fieldset className="onboarding-etapa__fieldset">
            <legend className="onboarding-etapa__fieldset-legenda">
              Notificações
            </legend>

            <div className="onboarding-etapa__switches">
              <Switch
                rotulo="Notificações push"
                descricao="Receber alertas no navegador e celular"
                checked={dados.notificacoesPush ?? true}
                onChange={(v) => aoAlterar('notificacoesPush', v)}
                desabilitado={carregando}
                data-testid="switch-push"
              />

              <Switch
                rotulo="Notificações por e-mail"
                descricao="Receber confirmações e atualizações por e-mail"
                checked={dados.notificacoesEmail ?? true}
                onChange={(v) => aoAlterar('notificacoesEmail', v)}
                desabilitado={carregando}
                data-testid="switch-email"
              />

              <Switch
                rotulo="Notificações por SMS"
                descricao="Receber lembretes importantes via SMS"
                checked={dados.notificacoesSms ?? false}
                onChange={(v) => aoAlterar('notificacoesSms', v)}
                desabilitado={carregando}
                data-testid="switch-sms"
              />
            </div>
          </fieldset>

          {/* Aparência */}
          <fieldset className="onboarding-etapa__fieldset">
            <legend className="onboarding-etapa__fieldset-legenda">
              Aparência
            </legend>

            <div className="onboarding-etapa__tema-opcoes" role="radiogroup" aria-label="Tema">
              {OPCOES_TEMA.map((opcao) => (
                <label
                  key={opcao.valor}
                  className={`onboarding-etapa__tema-opcao ${dados.tema === opcao.valor ? 'selecionada' : ''}`}
                  onClick={() => aoAlterar('tema', opcao.valor)}
                >
                  <input
                    type="radio"
                    name="tema"
                    value={opcao.valor}
                    checked={dados.tema === opcao.valor}
                    onChange={() => aoAlterar('tema', opcao.valor)}
                    className="onboarding-etapa__radio"
                    disabled={carregando}
                    data-testid={`tema-${opcao.valor}`}
                  />
                  <div className="onboarding-etapa__tema-opcao-conteudo">
                    <span className="onboarding-etapa__tema-opcao-icone" aria-hidden="true">
                      {opcao.icone === 'monitor' && '🖥️'}
                      {opcao.icone === 'sol' && '☀️'}
                      {opcao.icone === 'lua' && '🌙'}
                    </span>
                    <span className="onboarding-etapa__tema-opcao-texto">{opcao.rotulo}</span>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

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
              icone="check"
              iconePosicao="direita"
              data-testid="btn-concluir"
            >
              Concluir cadastro
            </BotaoPrimario>
          </div>
        </form>
      </CartaoCorpo>
    </Cartao>
  );
};

export default EtapaPreferencias;