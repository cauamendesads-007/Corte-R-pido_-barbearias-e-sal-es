/**
 * AgendamentosPerfil - Aba de agendamentos do perfil do usuário.
 */

import { useMemo } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  ChipStatus,
  BotaoSecundario,
} from '@/componentes';
import { ICONES } from '@/constantes';
import type { Agendamento, Servico } from '@/tipos';

interface AgendamentosPerfilProps {
  agendamentos: Agendamento[];
  servicos: Record<string, Servico>;
  onCancelar: (id: string) => void;
  onReagendar: (agendamento: Agendamento) => void;
  onAvaliar: (agendamento: Agendamento) => void;
}

const formatDate = (dataStr: string) => {
  const data = new Date(dataStr);
  return data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const formatTime = (dataStr: string) => {
  const data = new Date(dataStr);
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const podeCancelar = (status: string) => ['agendado', 'confirmado'].includes(status);
const podeReagendar = (status: string) => ['agendado', 'confirmado', 'cancelado'].includes(status);
const podeAvaliar = (status: string) => status === 'concluido';

export const AgendamentosPerfil = ({
  agendamentos,
  servicos,
  onCancelar,
  onReagendar,
  onAvaliar,
}: AgendamentosPerfilProps) => {
  const agendamentosOrdenados = useMemo(() => {
    return [...agendamentos].sort((a, b) => new Date(b.dia).getTime() - new Date(a.dia).getTime());
  }, [agendamentos]);

  if (agendamentosOrdenados.length === 0) {
    return (
      <div className="perfil__vazio" data-testid="agendamentos-vazio">
        <span className="perfil__vazio-icone" aria-hidden="true">{ICONES.calendario}</span>
        <h3>Nenhum agendamento</h3>
        <p>Você ainda não fez nenhum agendamento.</p>
      </div>
    );
  }

  return (
    <div className="perfil__lista-agendamentos" data-testid="lista-agendamentos">
      {agendamentosOrdenados.map((agendamento) => {
        const servico = servicos[agendamento.servicoIds?.[0] || ''];
        const status = agendamento.status;

        return (
          <Cartao key={agendamento.id} variante="padrao" className="perfil__agendamento-cartao">
            <CartaoCabecalho>
              <div className="perfil__agendamento-topo">
                <div>
                  <h3 className="perfil__servico-nome">{servico?.nome || agendamento.servicos || 'Serviço'}</h3>
                  <p className="perfil__agendamento-data">
                    {formatDate(agendamento.dia)} às {formatTime(`${agendamento.dia}T${agendamento.horario}`)}
                  </p>
                </div>
                <ChipStatus status={status as 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'pago' | 'no_local' | 'aguardando_pix'} data-testid={`status-${agendamento.id}`} />
              </div>
            </CartaoCabecalho>
            <CartaoCorpo>
              <div className="perfil__agendamento-detalhes">
                {servico && (
                  <>
                    <span className="perfil__detalhe">
                      {ICONES.tesoura} {servico.nome}
                    </span>
                    <span className="perfil__detalhe">
                      {ICONES.relogio} {servico.duracaoMinutos} min
                    </span>
                    <span className="perfil__detalhe">
                      {ICONES.moeda} R$ {servico.preco.toFixed(2).replace('.', ',')}
                    </span>
                  </>
                )}
                {agendamento.avaliacao && (
                  <p className="perfil__observacoes">
                    <strong>Avaliação:</strong> {'★'.repeat(agendamento.avaliacao.estrelas)}
                    {agendamento.avaliacao.comentario && ` - ${agendamento.avaliacao.comentario}`}
                  </p>
                )}
              </div>
              <div className="perfil__agendamento-acoes">
                {podeCancelar(status) && (
                  <BotaoSecundario
                    aoClicar={() => onCancelar(agendamento.id)}
                    iconeEsquerda={ICONES.x}
                    tamanho="pequeno"
                    data-testid={`btn-cancelar-${agendamento.id}`}
                  >
                    Cancelar
                  </BotaoSecundario>
                )}
                {podeReagendar(status) && (
                  <BotaoSecundario
                    aoClicar={() => onReagendar(agendamento)}
                    iconeEsquerda={ICONES.relogio}
                    tamanho="pequeno"
                    data-testid={`btn-reagendar-${agendamento.id}`}
                  >
                    Reagendar
                  </BotaoSecundario>
                )}
                {podeAvaliar(status) && !agendamento.avaliacao && (
                  <BotaoSecundario
                    aoClicar={() => onAvaliar(agendamento)}
                    iconeEsquerda={ICONES.estrela}
                    tamanho="pequeno"
                    data-testid={`btn-avaliar-${agendamento.id}`}
                  >
                    Avaliar
                  </BotaoSecundario>
                )}
              </div>
            </CartaoCorpo>
          </Cartao>
        );
      })}
    </div>
  );
};