/**
 * AbasAdmin - Navegação por abas do painel administrativo.
 */

import { ICONES } from '@/constantes';
import type { AbaAdmin } from '../types';
import { ABA_ADMIN_LABELS } from '../types';

interface AbaConfig {
  id: AbaAdmin;
  contador?: number;
}

interface AbasAdminProps {
  abaAtiva: AbaAdmin;
  onMudarAba: (aba: AbaAdmin) => void;
  abas: AbaConfig[];
}

const ABA_ICONES_MAP: Record<AbaAdmin, string> = {
  visao: ICONES.painel,
  estabelecimentos: ICONES.predio,
  usuarios: ICONES.usuarios,
  analises: ICONES.grafico,
  configuracoes: ICONES.configuracoes,
};

export const AbasAdmin = ({ abaAtiva, onMudarAba, abas }: AbasAdminProps) => {
  return (
    <nav className="admin__abas" role="tablist" aria-label="Seções do admin">
      {abas.map((aba) => (
        <button
          key={aba.id}
          role="tab"
          aria-selected={abaAtiva === aba.id}
          aria-controls={`painel-${aba.id}`}
          id={`aba-${aba.id}`}
          className={`admin__aba ${abaAtiva === aba.id ? 'admin__aba--ativa' : ''}`}
          onClick={() => onMudarAba(aba.id)}
          data-testid={`admin-aba-${aba.id}`}
        >
          <span aria-hidden="true">{ABA_ICONES_MAP[aba.id]}</span>
          {ABA_ADMIN_LABELS[aba.id]}
          {aba.contador !== undefined && (
            <span className="admin__aba-badge">{aba.contador}</span>
          )}
        </button>
      ))}
    </nav>
  );
};