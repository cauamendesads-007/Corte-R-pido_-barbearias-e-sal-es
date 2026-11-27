/**
 * AbasPerfil - Navegação por abas do perfil do usuário.
 */

import type { AbaPerfil } from '../types';
import { ABA_PERFIL_CONFIG } from '../types';

interface AbasPerfilProps {
  abaAtiva: AbaPerfil;
  onMudarAba: (aba: AbaPerfil) => void;
}

export const AbasPerfil = ({ abaAtiva, onMudarAba }: AbasPerfilProps) => {
  return (
    <nav className="perfil__abas" role="tablist" aria-label="Seções do perfil">
      {ABA_PERFIL_CONFIG.map((aba) => (
        <button
          key={aba.id}
          role="tab"
          aria-selected={abaAtiva === aba.id}
          aria-controls={`painel-${aba.id}`}
          id={`aba-${aba.id}`}
          className={`perfil__aba ${abaAtiva === aba.id ? 'perfil__aba--ativa' : ''}`}
          onClick={() => onMudarAba(aba.id)}
          data-testid={`perfil-aba-${aba.id}`}
        >
          <span aria-hidden="true">{aba.icone}</span>
          {aba.rotulo}
          {aba.contador !== undefined && aba.contador > 0 && (
            <span className="perfil__aba-badge">{aba.contador}</span>
          )}
        </button>
      ))}
    </nav>
  );
};