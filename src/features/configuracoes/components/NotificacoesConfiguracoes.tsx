/**
 * NotificacoesConfiguracoes - Aba de notificações.
 */

import { Cartao, CartaoCabecalho, CartaoCorpo, CheckboxToggle as Toggle } from '@/componentes';
import type { ConfiguracaoNotificacoes } from '../types';

interface NotificacoesConfiguracoesProps {
  valores: ConfiguracaoNotificacoes;
  onAlterar: (valores: Partial<ConfiguracaoNotificacoes>) => void;
}

export const NotificacoesConfiguracoes = ({ valores, onAlterar }: NotificacoesConfiguracoesProps) => {
  return (
    <Cartao variante="padrao">
      <CartaoCabecalho>
        <h2>Preferências de notificação</h2>
      </CartaoCabecalho>
      <CartaoCorpo>
        <div className="configuracoes__toggle-grupo">
          <Toggle
            rotulo="Lembretes de agendamento"
            descricao="Receber avisos antes dos seus horários marcados"
            _verificado={valores.agendamentos}
            aoAlterar={(v) => onAlterar({ agendamentos: v })}
            data-testid="toggle-agendamentos"
          />
          <Toggle
            rotulo="Mensagens e conversas"
            descricao="Notificações quando receber mensagens de barbeiros"
            _verificado={valores.mensagens}
            aoAlterar={(v) => onAlterar({ mensagens: v })}
            data-testid="toggle-mensagens"
          />
          <Toggle
            rotulo="Promoções e novidades"
            descricao="Ofertas especiais e atualizações da plataforma"
            _verificado={valores.promocoes}
            aoAlterar={(v) => onAlterar({ promocoes: v })}
            data-testid="toggle-promocoes"
          />
          <Toggle
            rotulo="Notificações via WhatsApp"
            descricao="Enviar lembretes e confirmações pelo WhatsApp"
            _verificado={valores.whatsapp}
            aoAlterar={(v) => onAlterar({ whatsapp: v })}
            data-testid="toggle-whatsapp"
          />
        </div>
      </CartaoCorpo>
    </Cartao>
  );
};