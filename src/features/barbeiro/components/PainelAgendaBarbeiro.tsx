/**
 * PainelAgendaBarbeiro - Lista de agendamentos com filtros.
 */

import { Select, CampoTexto, Skeleton, BotaoSecundario } from '@/componentes';
import { ICONES } from '@/constantes';
import type { Agendamento, StatusPagamento } from '@/tipos';

interface PainelAgendaBarbeiroProps {
  agendamentos: Agendamento[];
  carregando: boolean;
  filtros: {
    status?: StatusPagamento;
    dataInicio?: string;
    dataFim?: string;
  };
  onFiltroChange: (filtros: Partial<{ status?: StatusPagamento; dataInicio?: string; dataFim?: string }>) => void;
  onCancelar: (id: string) => void;
  onVerTodos?: () => void;
}

const STATUS_OPTIONS: { valor: string; rotulo: string }[] = [
  { valor: '', rotulo: 'Todos os status' },
  { valor: 'no_local', rotulo: 'Pagar no local' },
  { valor: 'aguardando_pix', rotulo: 'Aguardando Pix' },
  { valor: 'pago', rotulo: 'Confirmado' },
];

const STATUS_LABELS: Record<StatusPagamento, string> = {
  no_local: '💰 No local',
  aguardando_pix: '⏳ Aguardando Pix',
  pago: '✓ Pago',
};

export const PainelAgendaBarbeiro = ({
  agendamentos,
  carregando,
  filtros,
  onFiltroChange,
  onCancelar,
  onVerTodos,
}: PainelAgendaBarbeiroProps) => {
  const statusAtual = filtros.status || '';
  const dataInicioAtual = filtros.dataInicio || '';
  const dataFimAtual = filtros.dataFim || '';

  const handleStatusChange = (v: string | string[]) => {
    const valorStr = Array.isArray(v) ? v[0] : v;
    onFiltroChange({ status: valorStr === '' ? undefined : valorStr as StatusPagamento });
  };

  if (carregando) {
    return (
      <div className="painel__lista-carregando" data-testid="painel-agenda-carregando">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variante="texto" data-testid={`painel-agenda-skeleton-${i}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="painel__painel" role="tabpanel" id="painel-agenda" aria-labelledby="aba-agenda">
      <div className="painel__filtros" data-testid="painel-agenda-filtros">
        <Select
          label="Status"
          valor={statusAtual}
          aoAlterar={handleStatusChange}
          opcoes={STATUS_OPTIONS}
          data-testid="painel-filtro-status"
        />
        <CampoTexto
          label="Data inicial"
          valor={dataInicioAtual}
          aoAlterar={(v) => onFiltroChange({ dataInicio: v })}
          inputMode="none"
          data-testid="painel-filtro-data-inicio"
        />
        <CampoTexto
          label="Data final"
          valor={dataFimAtual}
          aoAlterar={(v) => onFiltroChange({ dataFim: v })}
          inputMode="none"
          data-testid="painel-filtro-data-fim"
        />
      </div>

      {agendamentos.length > 0 ? (
        <div className="painel__lista" role="list" data-testid="painel-agenda-lista">
          {agendamentos.map((agendamento) => (
            <div key={agendamento.id} className="painel__agendamento-item" data-testid={`painel-agenda-${agendamento.id}`}>
              <div className="painel__agendamento-info">
                <strong>{agendamento.nomeCliente}</strong>
                <span>{agendamento.dia} às {agendamento.horario} - {agendamento.servicos}</span>
              </div>
              <div className="painel__agendamento-acoes">
                <span className={`painel__status-${agendamento.statusPagamento}`}>
                  {STATUS_LABELS[agendamento.statusPagamento] || agendamento.statusPagamento}
                </span>
                <button
                  type="button"
                  className="painel__btn-cancelar"
                  onClick={() => onCancelar(agendamento.id)}
                  aria-label="Cancelar agendamento"
                  data-testid={`painel-cancelar-${agendamento.id}`}
                >
                  {ICONES.x}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="painel__vazio" data-testid="painel-agenda-vazio">
          <div className="painel__vazio-icone">{ICONES.calendario}</div>
          <h3>Nenhum agendamento</h3>
          <p>{filtros.status ? 'Nenhum agendamento com este status.' : 'Agendamentos aparecerão aqui.'}</p>
          {onVerTodos && (
            <BotaoSecundario tamanho="pequeno" aoClicar={onVerTodos}>
              Ver todos
            </BotaoSecundario>
          )}
        </div>
      )}
    </div>
  );
};