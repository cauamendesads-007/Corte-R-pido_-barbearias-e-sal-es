/**
 * Etapa de Boas-Vindas do Onboarding.
 */

import React from 'react';
import { Container, BotaoPrimario, Icone } from '@/componentes';
import './Onboarding.css';

interface EtapaBoasVindasProps {
  aoAvancar: () => void;
}

export const EtapaBoasVindas: React.FC<EtapaBoasVindasProps> = ({ aoAvancar }) => {
  return (
    <Container variante="com-cabecalho" className="onboarding__etapa onboarding__boas-vindas">
      <div className="onboarding__conteudo">
        <div className="onboarding__icone-principal" aria-hidden="true">
          <Icone nome="usuarios" tamanho={80} />
        </div>

        <h1 className="onboarding__titulo">Bem-vindo ao Corte Rápido</h1>
        <p className="onboarding__subtitulo">
          A plataforma completa para gerenciar sua barbearia ou salão de beleza.
          Agendamentos, fila virtual, pagamentos Pix e muito mais.
        </p>

        <div className="onboarding__beneficios" role="list">
          <div className="onboarding__beneficio" role="listitem">
            <span className="onboarding__beneficio-icone" aria-hidden="true">📅</span>
            <div>
              <strong>Agendamentos Online</strong>
              <p>Clientes agendam 24/7 pelo celular</p>
            </div>
          </div>
          <div className="onboarding__beneficio" role="listitem">
            <span className="onboarding__beneficio-icone" aria-hidden="true">👥</span>
            <div>
              <strong>Fila Virtual</strong>
              <p>Gerencie espera presencial e online</p>
            </div>
          </div>
          <div className="onboarding__beneficio" role="listitem">
            <span className="onboarding__beneficio-icone" aria-hidden="true">💳</span>
            <div>
              <strong>Pagamento Pix</strong>
              <p>Receba sinal ou pagamento total</p>
            </div>
          </div>
          <div className="onboarding__beneficio" role="listitem">
            <span className="onboarding__beneficio-icone" aria-hidden="true">🎨</span>
            <div>
              <strong>Página Personalizada</strong>
              <p>Sua marca, suas cores, seu estilo</p>
            </div>
          </div>
        </div>

        <div className="onboarding__acoes">
          <BotaoPrimario
            aoClicar={aoAvancar}
            iconeEsquerda={<Icone nome="setaDireita" tamanho={20} />}
            tamanho="grande"
            className="onboarding__botao-principal"
          >
            Começar Configuração
          </BotaoPrimario>
        </div>

        <p className="onboarding__info">
          <span aria-hidden="true">⏱️</span>
          Leva cerca de 5 minutos. Você pode salvar e continuar depois.
        </p>
      </div>
    </Container>
  );
};

export default EtapaBoasVindas;