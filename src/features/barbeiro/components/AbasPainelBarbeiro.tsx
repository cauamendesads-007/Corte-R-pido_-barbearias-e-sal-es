/**
 * AbasPainelBarbeiro - Navegação por abas do painel do barbeiro.
 */

import { ICONES } from '@/constantes';
import type { AbaPainelBarbeiro } from '../types';
import { ABA_PAINEL_BARBEIRO_LABELS } from '../types';

interface AbaConfig {
  id: AbaPainelBarbeiro;
  contador?: number;
}

interface AbasPainelBarbeiroProps {
  abaAtiva: AbaPainelBarbeiro;
  onMudarAba: (aba: AbaPainelBarbeiro) => void;
  abas: AbaConfig[];
}

const ABA_ICONES_MAP: Record<AbaPainelBarbeiro, string> = {
  visao: ICONES.painel,
  agenda: ICONES.calendario,
  servicos: ICONES.tesoura,
  fila: ICONES.fila,
  galeria: ICONES.foto,
  configuracoes: ICONES.configuracoes,
};

export const AbasPainelBarbeiro = ({ abaAtiva, onMudarAba, abas }: AbasPainelBarbeiroProps) => {
  return (
    <nav className="painel__abas" role="tablist" aria-label="Seções do painel">
      {abas.map((aba) => (
        <button
          key={aba.id}
          role="tab"
          aria-selected={abaAtiva === aba.id}
          aria-controls={`painel-${aba.id}`}
          id={`aba-${aba.id}`}
          className={`painel__aba ${abaAtiva === aba.id ? 'painel__aba--ativa' : ''}`}
          onClick={() => onMudarAba(aba.id)}
          data-testid={`painel-aba-${aba.id}`}
        >
          <span aria-hidden="true">{ABA_ICONES_MAP[aba.id]}</span>
          {ABA_PAINEL_BARBEIRO_LABELS[aba.id]}
          {aba.contador !== undefined && aba.contador > 0 && (
            <span className="painel__aba-badge">{aba.contador}</span>
          )}
        </button>
      ))}
    </nav>
  );
};