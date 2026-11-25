/**
 * Etapa Boas-vindas do Onboarding.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import {
  Cartao,
  CartaoCorpo,
  BotaoPrimario,
  Icone,
} from '@/componentes';
import type { EtapaBoasVindasProps } from '../types';
import './EtapaBoasVindas.css';

export const EtapaBoasVindas = ({
  aoContinuar,
  carregando = false,
}: EtapaBoasVindasProps) => {
  return (
    <Cartao className="onboarding-etapa onboarding-etapa--boas-vindas" data-testid="etapa-boas-vindas">
      <CartaoCorpo className="onboarding-etapa__conteudo">
        <div className="onboarding-etapa__icone-principal" aria-hidden="true">
          <Icone nome="tesoura" tamanho={64} />
        </div>

        <h1 className="onboarding-etapa__titulo">Bem-vindo ao Corte Rápido</h1>

        <p className="onboarding-etapa__subtitulo">
          A plataforma que conecta você aos melhores barbeiros da sua região.
          Agende, avalie e gerencie seus cortes com facilidade.
        </p>

        <ul className="onboarding-etapa__beneficios" role="list">
          <li>
            <Icone nome="check-circle" tamanho={20} className="onboarding-etapa__beneficio-icone" />
            <span>Agendamento rápido e intuitivo</span>
          </li>
          <li>
            <Icone nome="check-circle" tamanho={20} className="onboarding-etapa__beneficio-icone" />
            <span>Avaliações reais de outros clientes</span>
          </li>
          <li>
            <Icone nome="check-circle" tamanho={20} className="onboarding-etapa__beneficio-icone" />
            <span>Lembretes automáticos</span>
          </li>
          <li>
            <Icone nome="check-circle" tamanho={20} className="onboarding-etapa__beneficio-icone" />
            <span>Pagamento seguro</span>
          </li>
        </ul>

        <div className="onboarding-etapa__acoes">
          <BotaoPrimario
            onClick={aoContinuar}
            carregando={carregando}
            tamanho="grande"
            icone="seta-direita"
            data-testid="btn-comecar"
          >
            Começar agora
          </BotaoPrimario>
        </div>

        <p className="onboarding-etapa__ja-tem-conta">
          Já tem conta? <a href="/entrar">Entrar</a>
        </p>
      </CartaoCorpo>
    </Cartao>
  );
};

export default EtapaBoasVindas;