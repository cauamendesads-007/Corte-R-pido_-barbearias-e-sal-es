/**
 * Etapa Tipo de Usuário do Onboarding.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import {
  Cartao,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  Icone,
} from '@/componentes';
import type { EtapaTipoUsuarioProps } from '../types';
import './EtapaTipoUsuario.css';

export const EtapaTipoUsuario = ({
  tipoSelecionado,
  aoSelecionar,
  aoAvancar,
  aoVoltar,
  carregando = false,
}: EtapaTipoUsuarioProps) => {
  return (
    <Cartao className="onboarding-etapa onboarding-etapa--tipo-usuario" data-testid="etapa-tipo-usuario">
      <CartaoCorpo className="onboarding-etapa__conteudo">
        <div className="onboarding-etapa__header">
          <h1 className="onboarding-etapa__titulo">Como você vai usar o Corte Rápido?</h1>
          <p className="onboarding-etapa__subtitulo">
            Escolha a opção que melhor descreve você para personalizarmos sua experiência.
          </p>
        </div>

        <div className="onboarding-etapa__opcoes" role="radiogroup" aria-label="Tipo de usuário">
          <label
            className={`onboarding-etapa__opcao ${tipoSelecionado === 'cliente' ? 'selecionada' : ''}`}
            onClick={() => aoSelecionar('cliente')}
          >
            <input
              type="radio"
              name="tipoUsuario"
              value="cliente"
              checked={tipoSelecionado === 'cliente'}
              onChange={() => aoSelecionar('cliente')}
              className="onboarding-etapa__radio"
              data-testid="radio-cliente"
            />
            <div className="onboarding-etapa__opcao-conteudo">
              <div className="onboarding-etapa__opcao-icone" aria-hidden="true">
                <Icone nome="usuario" tamanho={32} />
              </div>
              <h3 className="onboarding-etapa__opcao-titulo">Sou Cliente</h3>
              <p className="onboarding-etapa__opcao-descricao">
                Quero agendar cortes, encontrar barbeiros perto de mim e gerenciar meus agendamentos.
              </p>
              <ul className="onboarding-etapa__opcao-features">
                <li>Agendar horários</li>
                <li>Ver avaliações</li>
                <li>Receber lembretes</li>
                <li>Pagar pelo app</li>
              </ul>
            </div>
          </label>

          <label
            className={`onboarding-etapa__opcao ${tipoSelecionado === 'barbeiro' ? 'selecionada' : ''}`}
            onClick={() => aoSelecionar('barbeiro')}
          >
            <input
              type="radio"
              name="tipoUsuario"
              value="barbeiro"
              checked={tipoSelecionado === 'barbeiro'}
              onChange={() => aoSelecionar('barbeiro')}
              className="onboarding-etapa__radio"
              data-testid="radio-barbeiro"
            />
            <div className="onboarding-etapa__opcao-conteudo">
              <div className="onboarding-etapa__opcao-icone" aria-hidden="true">
                <Icone nome="tesoura" tamanho={32} />
              </div>
              <h3 className="onboarding-etapa__opcao-titulo">Sou Barbeiro</h3>
              <p className="onboarding-etapa__opcao-descricao">
                Quero gerenciar minha agenda, receber clientes, acompanhar métricas e crescer meu negócio.
              </p>
              <ul className="onboarding-etapa__opcao-features">
                <li>Gerenciar agenda</li>
                <li>Fila de espera</li>
                <li>Métricas de desempenho</li>
                <li>Receber pagamentos</li>
              </ul>
            </div>
          </label>
        </div>

        <div className="onboarding-etapa__acoes">
          <BotaoSecundario
            onClick={aoVoltar}
            icone="seta-esquerda"
            data-testid="btn-voltar"
          >
            Voltar
          </BotaoSecundario>
          <BotaoPrimario
            onClick={aoAvancar}
            carregando={carregando}
            desabilitado={!tipoSelecionado}
            icone="seta-direita"
            iconePosicao="direita"
            data-testid="btn-avancar"
          >
            Continuar
          </BotaoPrimario>
        </div>
      </CartaoCorpo>
    </Cartao>
  );
};

export default EtapaTipoUsuario;