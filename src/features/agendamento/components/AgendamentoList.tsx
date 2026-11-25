/**
 * Componente AgendamentoList - Lista de agendamentos com skeleton, empty/error states.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useMemo } from 'react';
import {
  Cartao,
  CartaoCorpo,
  BotaoSecundario,
  Icone,
  Skeleton,
  EmptyState,
  ErrorState,
} from '@/componentes';
import { AgendamentoCard } from './AgendamentoCard';
import type { AgendamentoComputado, AgendamentoFiltros } from '../types';
import { agruparPorStatus, obterStatusTexto } from '../rules';
import './AgendamentoList.css';

interface AgendamentoListProps {
  /** Agendamentos computados para exibição */
  agendamentos: AgendamentoComputado[];
  /** Carregando lista */
  carregando?: boolean;
  /** Erro ao carregar */
  erro?: string | null;
  /** Tem mais itens para carregar (paginação) */
  temMais?: boolean;
  /** Callback para carregar mais */
  aoCarregarMais?: () => void;
  /** Callback ao cancelar */
  onCancelar?: (id: string) => void;
  /** Callback ao reagendar */
  onReagendar?: (id: string) => void;
  /** Callback ao avaliar */
  onAvaliar?: (id: string) => void;
  /** Callback ao confirmar presença */
  onConfirmar?: (id: string) => void;
  /** Filtros atuais (para empty state) */
  filtros?: AgendamentoFiltros;
  /** Variante de visualização */
  variante?: 'cliente' | 'barbeiro' | 'admin';
  /** Mostra ações do barbeiro */
  mostrarAcoesBarbeiro?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const SKELETON_COUNT = 4;

/** Componente Skeleton para lista de agendamentos */
function AgendamentoListSkeleton() {
  return (
    <div className="agendamento-list__skeleton" role="status" aria-label="Carregando agendamentos">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <Cartao key={i} variante="padrao" className="agendamento-list__skeleton-card">
          <CartaoCorpo>
            <div className="agendamento-list__skeleton-row">
              <Skeleton variante="circular" largura={40} altura={40} />
              <div className="agendamento-list__skeleton-textos">
                <Skeleton variante="retangular" largura="60%" altura={16} />
                <Skeleton variante="retangular" largura="40%" altura={12} />
              </div>
            </div>
            <div className="agendamento-list__skeleton-row" style={{ marginTop: '12px' }}>
              <Skeleton variante="retangular" largura="120px" altura={20} />
              <Skeleton variante="retangular" largura="100px" altura={20} />
            </div>
            <div className="agendamento-list__skeleton-row" style={{ marginTop: '12px' }}>
              <Skeleton variante="retangular" largura="80px" altura={24} />
            </div>
          </CartaoCorpo>
        </Cartao>
      ))}
    </div>
  );
}

export const AgendamentoList = ({
  agendamentos,
  carregando = false,
  erro = null,
  temMais = false,
  aoCarregarMais,
  onCancelar,
  onReagendar,
  onAvaliar,
  onConfirmar,
  filtros,
  variante = 'cliente',
  mostrarAcoesBarbeiro = false,
  className = '',
  'data-testid': testId,
}: AgendamentoListProps) => {
  // Agrupa por status para exibição organizada
  const grupos = useMemo(() => agruparPorStatus(agendamentos.map(a => a.agendamento)), [agendamentos]);

  const temFiltrosAtivos = useMemo(() => {
    if (!filtros) return false;
    return !!(filtros.status || filtros.statusPagamento || filtros.dataInicio || filtros.dataFim || filtros.estabelecimentoId);
  }, [filtros]);

  const temResultados = agendamentos.length > 0;

  // Skeleton com delay de 150-200ms (CSS animation delay)
  if (carregando && !temResultados) {
    return (
      <div className={`agendamento-list ${className}`} data-testid={testId}>
        <AgendamentoListSkeleton />
      </div>
    );
  }

  // Estado de erro
  if (erro && !temResultados) {
    return (
      <div className={`agendamento-list ${className}`} data-testid={testId}>
        <ErrorState
          titulo="Erro ao carregar"
          mensagem={erro}
          aoTentarNovamente={aoCarregarMais}
          icone="alerta"
          className="agendamento-list__error"
          data-testid="agendamento-list-error"
        />
      </div>
    );
  }

  // Estado vazio
  if (!temResultados) {
    const emptyConfig = temFiltrosAtivos
      ? {
          titulo: 'Nenhum resultado',
          mensagem: 'Nenhum agendamento encontrado com os filtros atuais.',
          acao: aoCarregarMais ? { rotulo: 'Limpar filtros', aoClicar: aoCarregarMais } : undefined,
          icone: 'filtro',
        }
      : {
          titulo: 'Nenhum agendamento',
          mensagem: variante === 'cliente'
            ? 'Você ainda não tem horários marcados. Que tal agendar seu primeiro corte?'
            : 'Nenhum agendamento neste período.',
          acao: variante === 'cliente' && aoCarregarMais ? { rotulo: 'Agendar agora', aoClicar: aoCarregarMais } : undefined,
          icone: 'calendario',
        };

    return (
      <div className={`agendamento-list ${className}`} data-testid={testId}>
        <EmptyState
          {...emptyConfig}
          className="agendamento-list__empty"
          data-testid="agendamento-list-empty"
        />
      </div>
    );
  }

  // Renderiza lista agrupada por status
  const ordemStatus: Array<keyof typeof grupos> = ['agendado', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu'];

  return (
    <div className={`agendamento-list ${className}`} data-testid={testId}>
      <div className="agendamento-list__grupos">
        {ordemStatus.map((status) => {
          const itens = grupos[status];
          if (!itens.length) return null;

          // Filtra agendamentosComputados que correspondem a este status
          const itensComputados = agendamentos.filter(a => a.agendamento.status === status);

          return (
            <section key={status} className="agendamento-list__secao" aria-labelledby={`secao-${status}`}>
              <header className="agendamento-list__secao-header">
                <h3 id={`secao-${status}`} className="agendamento-list__secao-titulo">
                  <span className="agendamento-list__secao-status">{obterStatusTexto(status)}</span>
                  <span className="agendamento-list__secao-contagem">{itens.length}</span>
                </h3>
              </header>
              <div className="agendamento-list__cards" role="list">
                {itensComputados.map((agendamentoComputado) => (
                  <AgendamentoCard
                    key={agendamentoComputado.agendamento.id}
                    agendamento={agendamentoComputado}
                    variante={variante}
                    onCancelar={onCancelar}
                    onReagendar={onReagendar}
                    onAvaliar={onAvaliar}
                    onConfirmar={onConfirmar}
                    mostrarAcoesBarbeiro={mostrarAcoesBarbeiro}
                    data-testid={`agendamento-card-${agendamentoComputado.agendamento.id}`}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Botão carregar mais */}
      {temMais && aoCarregarMais && !carregando && (
        <div className="agendamento-list__carregar-mais">
          <BotaoSecundario
            aoClicar={aoCarregarMais}
            iconeEsquerda={<Icone nome="setaBaixo" tamanho={16} />}
            data-testid="agendamento-list-carregar-mais"
          >
            Carregar mais
          </BotaoSecundario>
        </div>
      )}

      {/* Indicador de carregamento mais */}
      {carregando && temResultados && (
        <div className="agendamento-list__carregando-mais" role="status" aria-label="Carregando mais agendamentos">
          <Skeleton variante="circular" largura={24} altura={24} className="animar-giro" />
          <span>Carregando mais...</span>
        </div>
      )}
    </div>
  );
};

export default AgendamentoList;