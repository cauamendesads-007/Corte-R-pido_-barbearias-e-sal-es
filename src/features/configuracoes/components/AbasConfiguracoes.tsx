/**
 * AbasConfiguracoes - Navegação por abas da tela de configurações.
 */

import type { AbaConfiguracoes } from '../types';
import { ABA_CONFIGURACOES_LABELS, ABA_CONFIGURACOES_ICONES } from '../types';

interface AbasConfiguracoesProps {
  abaAtiva: AbaConfiguracoes;
  onMudarAba: (aba: AbaConfiguracoes) => void;
}

export const AbasConfiguracoes = ({ abaAtiva, onMudarAba }: AbasConfiguracoesProps) => {
  const abas: AbaConfiguracoes[] = ['perfil', 'notificacoes', 'privacidade', 'aparencia', 'conta'];

  return (
    <nav className="configuracoes__abas" role="tablist" aria-label="Seções de configurações">
      {abas.map((aba) => (
        <button
          key={aba}
          role="tab"
          aria-selected={abaAtiva === aba}
          onClick={() => onMudarAba(aba)}
          className={`configuracoes__aba ${abaAtiva === aba ? 'configuracoes__aba--ativa' : ''}`}
          data-testid={`config-aba-${aba}`}
        >
          <span aria-hidden="true">{ABA_CONFIGURACOES_ICONES[aba]}</span>
          {ABA_CONFIGURACOES_LABELS[aba]}
        </button>
      ))}
    </nav>
  );
};