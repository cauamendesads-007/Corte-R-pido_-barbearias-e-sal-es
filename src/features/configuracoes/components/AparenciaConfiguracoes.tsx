/**
 * AparenciaConfiguracoes - Aba de aparência.
 */

import { Cartao, CartaoCabecalho, CartaoCorpo, ChipGrupo, CheckboxToggle as Toggle } from '@/componentes';
import type { ConfiguracaoAparencia } from '../types';
import { TEMA_OPCOES } from '../types';

interface AparenciaConfiguracoesProps {
  valores: ConfiguracaoAparencia;
  onAlterar: (valores: Partial<ConfiguracaoAparencia>) => void;
}

export const AparenciaConfiguracoes = ({ valores, onAlterar }: AparenciaConfiguracoesProps) => {
  return (
    <Cartao variante="padrao">
      <CartaoCabecalho>
        <h2>Tema e exibição</h2>
      </CartaoCabecalho>
      <CartaoCorpo>
        <fieldset className="configuracoes__radio-grupo">
          <legend>Tema</legend>
          <ChipGrupo
            opcoes={[...TEMA_OPCOES] as { valor: string; rotulo: string; icone: string }[]}
            selecionados={[valores.tema]}
            aoAlterar={(v: string[]) => onAlterar({ tema: v[0] as 'claro' | 'escuro' | 'sistema' })}
            multiplo={false}
            variante="selecao"
            data-testid="config-tema"
          />
        </fieldset>

        <div className="configuracoes__toggle-grupo">
          <Toggle
            rotulo="Fonte maior"
            descricao="Aumentar tamanho do texto em toda a aplicação"
            _verificado={valores.fonteGrande}
            aoAlterar={(v) => onAlterar({ fonteGrande: v })}
            data-testid="toggle-fonte-grande"
          />
          <Toggle
            rotulo="Reduzir animações"
            descricao="Desativar transições e animações para melhor desempenho"
            _verificado={valores.reduzirAnimacoes}
            aoAlterar={(v) => onAlterar({ reduzirAnimacoes: v })}
            data-testid="toggle-reduzir-animacoes"
          />
        </div>
      </CartaoCorpo>
    </Cartao>
  );
};