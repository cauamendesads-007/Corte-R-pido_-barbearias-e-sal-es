/**
 * PainelFilaBarbeiro - Gestão da fila de atendimento do dia.
 */

import { Cartao, CartaoCorpo } from '@/componentes';
import { ICONES } from '@/constantes';
import type { Agendamento } from '@/tipos';

interface PainelFilaBarbeiroProps {
  agendamentosHoje: Agendamento[];
  onCancelar: (id: string) => void;
}

export const PainelFilaBarbeiro = ({ agendamentosHoje, onCancelar }: PainelFilaBarbeiroProps) => {
  const agendamentosFila = agendamentosHoje
    .filter((a) => !['cancelado', 'concluido'].includes(a.status))
    .sort((a, b) => a.horario.localeCompare(b.horario));

  const confirmados = agendamentosHoje.filter((a) => a.statusPagamento === 'pago' && !['cancelado', 'concluido'].includes(a.status)).length;
  const aguardando = agendamentosFila.length - confirmados;

  return (
    <div className="painel__painel" role="tabpanel" id="painel-fila" aria-labelledby="aba-fila">
      <h2>Fila de hoje</h2>

      <div className="painel__fila-estatisticas" data-testid="painel-fila-estatisticas">
        <Cartao className="painel__fila-stat">
          <CartaoCorpo>
            <p className="painel__fila-stat-valor">{agendamentosFila.length}</p>
            <p className="painel__fila-stat-label">Clientes na fila</p>
          </CartaoCorpo>
        </Cartao>
        <Cartao className="painel__fila-stat">
          <CartaoCorpo>
            <p className="painel__fila-stat-valor">{Math.max(0, aguardando)}</p>
            <p className="painel__fila-stat-label">Aguardando</p>
          </CartaoCorpo>
        </Cartao>
        <Cartao className="painel__fila-stat">
          <CartaoCorpo>
            <p className="painel__fila-stat-valor">{confirmados}</p>
            <p className="painel__fila-stat-label">Em atendimento</p>
          </CartaoCorpo>
        </Cartao>
      </div>

      <div className="painel__lista" data-testid="painel-fila-lista">
        {agendamentosFila.map((agendamento) => (
          <div key={agendamento.id} className="painel__agendamento-item" data-testid={`painel-fila-${agendamento.id}`}>
            <div className="painel__agendamento-info">
              <strong>{agendamento.nomeCliente}</strong>
              <span>{agendamento.horario} - {agendamento.servicos}</span>
            </div>
            <div className="painel__agendamento-acoes">
              <span className={`painel__status-${agendamento.statusPagamento}`}>
                {agendamento.statusPagamento === 'pago' ? '✓ Em atendimento' : '⏳ Aguardando'}
              </span>
              <button
                type="button"
                className="painel__btn-cancelar"
                onClick={() => onCancelar(agendamento.id)}
                aria-label="Cancelar agendamento"
                data-testid={`painel-fila-cancelar-${agendamento.id}`}
              >
                {ICONES.x}
              </button>
            </div>
          </div>
        ))}
      </div>

      {agendamentosFila.length === 0 && (
        <div className="painel__vazio" data-testid="painel-fila-vazio">
          <div className="painel__vazio-icone">{ICONES.fila}</div>
          <h3>Fila vazia</h3>
          <p>Nenhum cliente aguardando no momento.</p>
        </div>
      )}
    </div>
  );
};