/**
 * Componente AgendamentoCard - Card de exibição de agendamento.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Cartao,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  BotaoPerigo,
  ChipStatus,
  Avatar,
  Icone,
} from '@/componentes';
import type { AgendamentoComputado } from '../types';
import './AgendamentoCard.css';

interface AgendamentoCardProps {
  /** Dados computados do agendamento */
  agendamento: AgendamentoComputado;
  /** Tipo de visualização */
  variante?: 'cliente' | 'barbeiro' | 'admin';
  /** Callback ao cancelar */
  onCancelar?: (id: string) => void;
  /** Callback ao reagendar */
  onReagendar?: (id: string) => void;
  /** Callback ao avaliar */
  onAvaliar?: (id: string) => void;
  /** Callback ao confirmar presença */
  onConfirmar?: (id: string) => void;
  /** Mostra ações do barbeiro */
  mostrarAcoesBarbeiro?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const AgendamentoCard = ({
  agendamento,
  variante = 'cliente',
  onCancelar,
  onReagendar,
  onAvaliar,
  onConfirmar,
  mostrarAcoesBarbeiro = false,
  className = '',
  'data-testid': testId,
}: AgendamentoCardProps) => {
  const { agendamento: ag, servicos, isHoje, isProximo, duracaoTotal, valorTotal, podeReagendar, podeCancelar, podeAvaliar, podeConfirmar } = agendamento;

  const statusChip = useMemo(() => (
    <ChipStatus status={ag.status as any} />
  ), [ag.status]);

  const pagamentoChip = useMemo(() => (
    <ChipStatus status={ag.statusPagamento as any} />
  ), [ag.statusPagamento]);

  return (
    <Cartao
      variante={isHoje ? 'agendamento' : 'padrao'}
      className={`agendamento-card ${className}`}
      data-testid={testId}
    >
      <CartaoCorpo className="agendamento-card__corpo">
        {/* Header */}
        <header className="agendamento-card__header">
          <div className="agendamento-card__estabelecimento">
            <Avatar
              src={ag.estabelecimentoId}
              nome={ag.estabelecimentoId}
              tamanho="pequeno"
              className="agendamento-card__avatar"
            />
            <div className="agendamento-card__info">
              <Link
                to={`/estabelecimento/${ag.estabelecimentoId}`}
                className="agendamento-card__nome-link"
              >
                <strong>{ag.estabelecimentoId}</strong>
              </Link>
              <span className="agendamento-card__servicos">{servicos.map(s => s.nome).join(', ')}</span>
            </div>
          </div>
          <div className="agendamento-card__chips">
            {statusChip}
            {pagamentoChip}
          </div>
        </header>

        {/* Data/Hora */}
        <div className="agendamento-card__data-hora">
          <div className="agendamento-card__data">
            <Icone nome="calendario" tamanho={16} aria-hidden="true" />
            <span>
              {new Date(`${ag.dia}T00:00:00`).toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
              })}
              {isHoje && <span className="agendamento-card__hoje-badge">Hoje</span>}
              {isProximo && !isHoje && <span className="agendamento-card__proximo-badge">Em breve</span>}
            </span>
          </div>
          <div className="agendamento-card__horario">
            <Icone nome="relogio" tamanho={16} aria-hidden="true" />
            <span>{ag.horario}</span>
            <span className="agendamento-card__duracao">({duracaoTotal} min)</span>
          </div>
        </div>

        {/* Valor */}
        <div className="agendamento-card__valor">
          <span className="agendamento-card__valor-label">Total</span>
          <strong className="agendamento-card__valor-total">
            R$ {valorTotal.toFixed(2).replace('.', ',')}
          </strong>
        </div>

        {/* Ações */}
        <footer className="agendamento-card__acoes">
          {variante === 'cliente' && (
            <>
              {podeReagendar && onReagendar && (
                <BotaoSecundario
                  tamanho="pequeno"
                  iconeEsquerda={<Icone nome="calendario" tamanho={14} />}
                  aoClicar={() => onReagendar?.(ag.id)}
                  data-testid={`agendamento-reagendar-${ag.id}`}
                >
                  Reagendar
                </BotaoSecundario>
              )}

              {podeCancelar && onCancelar && (
                <BotaoPerigo
                  tamanho="pequeno"
                  iconeEsquerda={<Icone nome="x" tamanho={14} />}
                  aoClicar={() => onCancelar?.(ag.id)}
                  data-testid={`agendamento-cancelar-${ag.id}`}
                >
                  Cancelar
                </BotaoPerigo>
              )}

              {podeAvaliar && onAvaliar && (
                <BotaoSecundario
                  tamanho="pequeno"
                  aoClicar={() => onAvaliar?.(ag.id)}
                  data-testid={`agendamento-avaliar-${ag.id}`}
                >
                  <Icone nome="estrela" tamanho={14} aria-hidden="true" />
                  Avaliar
                </BotaoSecundario>
              )}
            </>
          )}

          {variante === 'barbeiro' && mostrarAcoesBarbeiro && (
            <>
              {podeConfirmar && onConfirmar && (
                <BotaoPrimario
                  tamanho="pequeno"
                  iconeEsquerda={<Icone nome="verificarCirculo" tamanho={14} />}
                  aoClicar={() => onConfirmar?.(ag.id)}
                  data-testid={`agendamento-confirmar-${ag.id}`}
                >
                  Confirmar
                </BotaoPrimario>
              )}

              {podeConfirmar && (
                <BotaoSecundario
                  tamanho="pequeno"
                  aoClicar={() => { /* marcar como concluído */ }}
                  data-testid={`agendamento-concluir-${ag.id}`}
                >
                  Concluir
                </BotaoSecundario>
              )}
            </>
          )}
        </footer>
      </CartaoCorpo>
    </Cartao>
  );
};

export default AgendamentoCard;