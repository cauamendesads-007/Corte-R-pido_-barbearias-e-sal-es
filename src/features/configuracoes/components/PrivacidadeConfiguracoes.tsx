/**
 * PrivacidadeConfiguracoes - Aba de privacidade.
 */

import { Cartao, CartaoCabecalho, CartaoCorpo, CheckboxToggle as Toggle, BotaoSecundario } from '@/componentes';
import { ICONES } from '@/constantes';
import type { ConfiguracaoPrivacidade } from '../types';

interface PrivacidadeConfiguracoesProps {
  valores: ConfiguracaoPrivacidade;
  onAlterar: (valores: Partial<ConfiguracaoPrivacidade>) => void;
}

export const PrivacidadeConfiguracoes = ({ valores, onAlterar }: PrivacidadeConfiguracoesProps) => {
  return (
    <Cartao variante="padrao">
      <CartaoCabecalho>
        <h2>Privacidade e visibilidade</h2>
      </CartaoCabecalho>
      <CartaoCorpo>
        <div className="configuracoes__toggle-grupo">
          <Toggle
            rotulo="Perfil público"
            descricao="Permitir que outros usuários vejam seu perfil e avaliações"
            _verificado={valores.perfilPublico}
            aoAlterar={(v) => onAlterar({ perfilPublico: v })}
            data-testid="toggle-perfil-publico"
          />
          <Toggle
            rotulo="Mostrar minhas avaliações"
            descricao="Exibir suas avaliações publicamente no perfil"
            _verificado={valores.mostrarAvaliacoes}
            aoAlterar={(v) => onAlterar({ mostrarAvaliacoes: v })}
            data-testid="toggle-avaliacoes"
          />
          <Toggle
            rotulo="Histórico de agendamentos visível"
            descricao="Permitir que barbeiros vejam seu histórico"
            _verificado={valores.historicoVisivel}
            aoAlterar={(v) => onAlterar({ historicoVisivel: v })}
            data-testid="toggle-historico"
          />
        </div>

        <div className="configuracoes__secao">
          <h3>Dados da conta</h3>
          <p className="configuracoes__descricao">
            Gerencie seus dados pessoais e solicite a exclusão conforme a LGPD.
          </p>
          <BotaoSecundario iconeEsquerda={ICONES.setaBaixo} aoClicar={() => { /* TODO: exportar dados */ }}>
            Baixar meus dados
          </BotaoSecundario>
        </div>
      </CartaoCorpo>
    </Cartao>
  );
};