/**
 * Etapa Conclusão do Onboarding.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useEffect, useState } from 'react';
import {
  Cartao,
  CartaoCorpo,
  BotaoPrimario,
  Icone,
  Alerta,
} from '@/componentes';
import type { EtapaConclusaoProps } from '../types';
import './EtapaConclusao.css';

export const EtapaConclusao = ({
  aoEntrar,
  carregando = false,
}: EtapaConclusaoProps) => {
  const [etapaAnimacao, setEtapaAnimacao] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setEtapaAnimacao(1), 100);
    const timer2 = setTimeout(() => setEtapaAnimacao(2), 400);
    const timer3 = setTimeout(() => setEtapaAnimacao(3), 700);
    return () => { clearTimeout(timer); clearTimeout(timer2); clearTimeout(timer3); };
  }, []);

  useEffect(() => {
    if (etapaAnimacao === 3) {
      const timer = setTimeout(() => aoEntrar(), 1500);
      return () => clearTimeout(timer);
    }
  }, [etapaAnimacao, aoEntrar]);

  return (
    <Cartao className="onboarding-etapa onboarding-etapa--conclusao" data-testid="etapa-conclusao">
      <CartaoCorpo className="onboarding-etapa__conteudo">
        <div className={`onboarding-etapa__icone-wrapper ${etapaAnimacao >= 1 ? 'visivel' : ''}`} aria-hidden="true">
          <Icone nome="check-circle" tamanho={80} className="onboarding-etapa__icone-sucesso" />
        </div>

        <h1 className={`onboarding-etapa__titulo ${etapaAnimacao >= 2 ? 'visivel' : ''}`}>
          Cadastro concluído!
        </h1>

        <p className={`onboarding-etapa__subtitulo ${etapaAnimacao >= 2 ? 'visivel' : ''}`}>
          Bem-vindo ao Corte Rápido. Sua conta foi criada com sucesso.
        </p>

        <div className={`onboarding-etapa__beneficios ${etapaAnimacao >= 3 ? 'visivel' : ''}`} role="list">
          <div className="onboarding-etapa__beneficio-item">
            <Icone nome="check" tamanho={20} className="onboarding-etapa__beneficio-icone" />
            <span>Conta criada com sucesso</span>
          </div>
          <div className="onboarding-etapa__beneficio-item">
            <Icone nome="check" tamanho={20} className="onboarding-etapa__beneficio-icone" />
            <span>Preferências salvas</span>
          </div>
          <div className="onboarding-etapa__beneficio-item">
            <Icone nome="check" tamanho={20} className="onboarding-etapa__beneficio-icone" />
            <span>Pronto para agendar</span>
          </div>
        </div>

        {carregando && (
          <Alerta
            tipo="info"
            mensagem="Finalizando seu cadastro..."
            className="onboarding-etapa__carregando"
            data-testid="carregando-final"
          />
        )}

        <div className="onboarding-etapa__acoes">
          <BotaoPrimario
            onClick={aoEntrar}
            carregando={carregando}
            tamanho="grande"
            icone="seta-direita"
            iconePosicao="direita"
            className={`onboarding-etapa__btn-entrar ${etapaAnimacao >= 3 ? 'visivel' : ''}`}
            data-testid="btn-entrar"
          >
            Entrar no app
          </BotaoPrimario>
        </div>
      </CartaoCorpo>
    </Cartao>
  );
};

export default EtapaConclusao;