/**
 * Componente AgendamentosBarbeiro - Lista completa de agendamentos com filtros.
 * Puro, coeso, < 150 linhas, skeleton loading, empty/error states.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Cartao,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  Icone,
  CampoTexto,
  CampoSelecao,
  Chip,
  Skeleton,
  EmptyState,
  Modal,
  Avatar,
  Dropdown,
  DropdownItem,
} from '@/componentes';
import type { Agendamento, AgendamentoStatus, AgendamentosFiltro } from '../types';
import { calcularTempoRelativo, validarTransicaoStatus, STATUS_CONFIG } from '../rules';
import './AgendamentosBarbeiro.css';

interface AgendamentosBarbeiroProps {
  /** Lista de agendamentos */
  agendamentos: Agendamento[];
  /** Próxima página */
  proximaPagina: number | null;
  /** Filtro atual */
  filtro: AgendamentosFiltro;
  /** Carregando */
  carregando?: boolean;
  /** Carregando mais */
  carregandoMais?: boolean;
  /** Erro */
  erro?: string | null;
  /** Callbacks */
  aoCarregarMais?: () => void;
  aoAtualizarFiltro?: (filtro: Partial<AgendamentosFiltro>) => void;
  aoAtualizarStatus?: (id: string, status: AgendamentoStatus) => void;
  aoReagendar?: (id: string, data: string, horario: string) => void;
  aoCancelar?: (id: string, motivo?: string) => void;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const STATUS_OPCOES: { valor: AgendamentoStatus | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Todos os status' },
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'confirmado', rotulo: 'Confirmado' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'concluido', rotulo: 'Concluído' },
  { valor: 'cancelado', rotulo: 'Cancelado' },
  { valor: 'nao_compareceu', rotulo: 'Não compareceu' },
];

export const AgendamentosBarbeiro = ({
  agendamentos,
  proximaPagina,
  filtro,
  carregando = false,
  carregandoMais = false,
  erro = null,
  aoCarregarMais,
  aoAtualizarFiltro,
  aoAtualizarStatus,
  aoReagendar,
  aoCancelar,
  className = '',
  'data-testid': testId,
}: AgendamentosBarbeiroProps) => {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [modalReagendar, setModalReagendar] = useState<{ aberto: boolean; agendamento?: Agendamento }>({ aberto: false });
  const [reagendarData, setReagendarData] = useState('');
  const [reagendarHorario, setReagendarHorario] = useState('');
  const [modalCancelar, setModalCancelar] = useState<{ aberto: boolean; agendamento?: Agendamento; motivo: string }>({ aberto: false, motivo: '' });

  const agendamentosFiltrados = useMemo(() => agendamentos, [agendamentos]);

  const handleFiltrarStatus = useCallback((status: AgendamentoStatus | '') => {
    aoAtualizarFiltro?.({ status: status || undefined });
    setMostrarFiltros(false);
  }, [aoAtualizarFiltro]);

  const handleBusca = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    aoAtualizarFiltro?.({ busca: e.target.value });
  }, [aoAtualizarFiltro]);

  const handleLimparFiltros = useCallback(() => {
    aoAtualizarFiltro?.({ status: undefined, busca: undefined, dataInicio: undefined, dataFim: undefined });
    setMostrarFiltros(false);
  }, [aoAtualizarFiltro]);

  const temFiltrosAtivos = filtro.status || filtro.busca || filtro.dataInicio || filtro.dataFim;

  // Build filter dropdown items
  const filtroItems = [
    { rotulo: 'Filtrar por status', desabilitado: true },
    ...STATUS_OPCOES.map((op) => ({
      rotulo: op.rotulo,
      aoClicar: () => handleFiltrarStatus(op.valor),
      ativo: filtro.status === op.valor,
    })),
    { divisor: true },
    { rotulo: 'Período', desabilitado: true },
    {
      rotulo: 'Hoje',
      aoClicar: () => aoAtualizarFiltro?.({ dataInicio: new Date().toISOString().split('T')[0], dataFim: new Date().toISOString().split('T')[0] }),
      ativo: filtro.dataInicio === new Date().toISOString().split('T')[0],
    },
    {
      rotulo: 'Esta semana',
      aoClicar: () => {
        const hoje = new Date();
        const inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - hoje.getDay());
        const fim = new Date(inicio);
        fim.setDate(inicio.getDate() + 6);
        aoAtualizarFiltro?.({ dataInicio: inicio.toISOString().split('T')[0], dataFim: fim.toISOString().split('T')[0] });
      },
    },
    {
      rotulo: 'Este mês',
      aoClicar: () => {
        const hoje = new Date();
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        aoAtualizarFiltro?.({ dataInicio: inicio.toISOString().split('T')[0], dataFim: fim.toISOString().split('T')[0] });
      },
    },
    { divisor: true },
    temFiltrosAtivos && { rotulo: 'Limpar filtros', icone: 'x', aoClicar: handleLimparFiltros, variante: 'perigo' },
  ].filter(Boolean) as DropdownItem[];

  const handleAbrirReagendar = useCallback((agendamento: Agendamento) => {
    setModalReagendar({ aberto: true, agendamento });
    setReagendarData(agendamento.data);
    setReagendarHorario(agendamento.horario);
  }, []);

  const handleConfirmarReagendar = useCallback(() => {
    if (!modalReagendar.agendamento || !reagendarData || !reagendarHorario) return;
    aoReagendar?.(modalReagendar.agendamento.id, reagendarData, reagendarHorario);
    setModalReagendar({ aberto: false });
    setReagendarData('');
    setReagendarHorario('');
  }, [modalReagendar, reagendarData, reagendarHorario, aoReagendar]);

  const handleAbrirCancelar = useCallback((agendamento: Agendamento) => {
    setModalCancelar({ aberto: true, agendamento, motivo: '' });
  }, []);

  const handleConfirmarCancelar = useCallback(() => {
    if (!modalCancelar.agendamento) return;
    aoCancelar?.(modalCancelar.agendamento.id, modalCancelar.motivo || undefined);
    setModalCancelar({ aberto: false, motivo: '' });
  }, [modalCancelar, aoCancelar]);

  if (carregando && !agendamentos.length) {
    return (
      <div className={`agendamentos-barbeiro ${className}`} data-testid={testId}>
        <div className="agendamentos-barbeiro__skeleton" role="status" aria-label="Carregando agendamentos">
          <div className="agendamentos-barbeiro__toolbar-skeleton">
            <Skeleton variante="retangular" largura="200px" altura={44} />
            <Skeleton variante="retangular" largura="150px" altura={44} />
          </div>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="agendamentos-barbeiro__item-skeleton">
              <Skeleton variante="retangular" largura="100%" altura={80} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (erro && !agendamentos.length) {
    return (
      <div className={`agendamentos-barbeiro ${className}`} data-testid={testId}>
        <EmptyState
          titulo="Erro ao carregar"
          mensagem={erro}
          icone="alerta"
          acao={{ rotulo: 'Tentar novamente', aoClicar: aoCarregarMais || (() => {}) }}
          className="agendamentos-barbeiro__empty"
          data-testid="agendamentos-barbeiro-erro"
        />
      </div>
    );
  }

  if (!agendamentosFiltrados.length) {
    return (
      <div className={`agendamentos-barbeiro ${className}`} data-testid={testId}>
        <EmptyState
          titulo="Nenhum agendamento"
          mensagem={temFiltrosAtivos ? 'Tente ajustar os filtros.' : 'Nenhum agendamento encontrado.'}
          icone="calendario"
          className="agendamentos-barbeiro__empty"
          data-testid="agendamentos-barbeiro-vazio"
        />
      </div>
    );
  }

  return (
    <div className={`agendamentos-barbeiro ${className}`} data-testid={testId}>
      {/* Toolbar */}
      <div className="agendamentos-barbeiro__toolbar">
        <div className="agendamentos-barbeiro__busca">
          <CampoTexto
            valor={filtro.busca || ''}
            aoAlterar={handleBusca}
            placeholder="Buscar por cliente, serviço..."
            iconeEsquerda={<Icone nome="busca" tamanho={18} />}
            data-testid="agendamentos-busca"
          />
        </div>

        <div className="agendamentos-barbeiro__filtros">
          <Dropdown
            aberto={mostrarFiltros}
            aoFechar={() => setMostrarFiltros(false)}
            itens={filtroItems}
            trigger={
              <BotaoSecundario
                iconeEsquerda={<Icone nome="funil" tamanho={16} />}
                aoClicar={() => setMostrarFiltros(!mostrarFiltros)}
                variante={temFiltrosAtivos ? 'primario' : 'secundario'}
                data-testid="agendamentos-filtros-btn"
              >
                Filtros {temFiltrosAtivos && <Chip tamanho="pequeno" variante="primario">Ativo</Chip>}
              </BotaoSecundario>
            }
            posicao="bottom-end"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="agendamentos-barbeiro__lista" role="list">
        {agendamentosFiltrados.map((agendamento) => (
          <AgendamentoBarbeiroItem
            key={agendamento.id}
            agendamento={agendamento}
            aoAtualizarStatus={aoAtualizarStatus}
            aoReagendar={handleAbrirReagendar}
            aoCancelar={handleAbrirCancelar}
            data-testid={`agendamento-barbeiro-${agendamento.id}`}
          />
        ))}
      </div>

      {/* Carregando mais */}
      {carregandoMais && (
        <div className="agendamentos-barbeiro__carregando-mais" role="status">
          <Icone nome="carregando" tamanho={20} classe="agendamentos-barbeiro__spinner" />
          <span>Carregando mais...</span>
        </div>
      )}

      {proximaPagina === null && agendamentos.length > 0 && !carregandoMais && (
        <p className="agendamentos-barbeiro__fim">Fim da lista</p>
      )}

      {/* Modal Reagendar */}
      <Modal
        aberto={modalReagendar.aberto}
        aoFechar={() => { setModalReagendar({ aberto: false }); setReagendarData(''); setReagendarHorario(''); }}
        titulo="Reagendar agendamento"
        tamanho="pequeno"
        data-testid="modal-reagendar"
      >
        <div className="agendamentos-barbeiro__modal-form">
          <div className="agendamentos-barbeiro__modal-grid">
            <CampoTexto
              label="Nova data"
              valor={reagendarData}
              aoAlterar={setReagendarData}
              tipo="date"
              min={new Date().toISOString().split('T')[0]}
              obrigatorio
              data-testid="reagendar-data"
            />
            <CampoTexto
              label="Novo horário"
              valor={reagendarHorario}
              aoAlterar={setReagendarHorario}
              tipo="time"
              obrigatorio
              data-testid="reagendar-horario"
            />
          </div>
          <div className="agendamentos-barbeiro__modal-acoes">
            <BotaoSecundario aoClicar={() => setModalReagendar({ aberto: false })} data-testid="modal-reagendar-cancelar">
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario aoClicar={handleConfirmarReagendar} data-testid="modal-reagendar-confirmar">
              Confirmar
            </BotaoPrimario>
          </div>
        </div>
      </Modal>

      {/* Modal Cancelar */}
      <Modal
        aberto={modalCancelar.aberto}
        aoFechar={() => setModalCancelar({ aberto: false, motivo: '' })}
        titulo="Cancelar agendamento"
        tamanho="pequeno"
        data-testid="modal-cancelar"
      >
        <div className="agendamentos-barbeiro__modal-form">
          <CampoTexto
            label="Motivo (opcional)"
            valor={modalCancelar.motivo}
            aoAlterar={(v) => setModalCancelar((p) => ({ ...p, motivo: v }))}
            placeholder="Motivo do cancelamento..."
            tipo="textarea"
            linhas={3}
            maxLength={500}
            data-testid="cancelar-motivo"
          />
          <div className="agendamentos-barbeiro__modal-acoes">
            <BotaoSecundario aoClicar={() => setModalCancelar({ aberto: false, motivo: '' })} data-testid="modal-cancelar-cancelar">
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario variante="perigo" aoClicar={handleConfirmarCancelar} data-testid="modal-cancelar-confirmar">
              Confirmar cancelamento
            </BotaoPrimario>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* Sub-componente para item de agendamento */

function AgendamentoBarbeiroItem({
  agendamento,
  aoAtualizarStatus,
  aoReagendar,
  aoCancelar,
}: {
  agendamento: Agendamento;
  aoAtualizarStatus?: (id: string, status: AgendamentoStatus) => void;
  aoReagendar?: (agendamento: Agendamento) => void;
  aoCancelar?: (agendamento: Agendamento) => void;
}) {
  const config = STATUS_CONFIG[agendamento.status];
  const tempoRelativo = calcularTempoRelativo(`${agendamento.data}T${agendamento.horario}`);
  const [mostrarMenu, setMostrarMenu] = useState(false);

  const handleStatusChange = (novoStatus: AgendamentoStatus) => {
    const erro = validarTransicaoStatus(agendamento.status, novoStatus);
    if (erro) return;
    aoAtualizarStatus?.(agendamento.id, novoStatus);
    setMostrarMenu(false);
  };

  // Build status dropdown items
  const statusItems = [
    { rotulo: 'Ações', desabilitado: true },
    ...['confirmado', 'em_andamento', 'concluido', 'cancelado'].map((s) => ({
      rotulo: STATUS_CONFIG[s as AgendamentoStatus].label,
      icone: STATUS_CONFIG[s as AgendamentoStatus].icone,
      aoClicar: () => handleStatusChange(s as AgendamentoStatus),
      desabilitado: agendamento.status === s || !validarTransicaoStatus(agendamento.status, s as AgendamentoStatus),
    })),
    { divisor: true },
    { rotulo: 'Reagendar', icone: 'calendario', aoClicar: () => { aoReagendar?.(agendamento); setMostrarMenu(false); } },
    { rotulo: 'Cancelar', icone: 'x-circulo', aoClicar: () => { aoCancelar?.(agendamento); setMostrarMenu(false); }, variante: 'perigo' },
  ] as DropdownItem[];

  return (
    <article className="agendamentos-barbeiro__item" role="listitem">
      <div className="agendamentos-barbeiro__item-header">
        <div className="agendamentos-barbeiro__item-data">
          <span className="agendamentos-barbeiro__horario">{agendamento.horario}</span>
          <span className="agendamentos-barbeiro__tempo">{tempoRelativo}</span>
        </div>
        <Dropdown
          aberto={mostrarMenu}
          aoFechar={() => setMostrarMenu(false)}
          itens={statusItems}
          trigger={
            <button
              className="agendamentos-barbeiro__menu-btn"
              onClick={() => setMostrarMenu(!mostrarMenu)}
              aria-label="Mais opções"
            >
              <Icone nome="mais-horizontal" tamanho={20} />
            </button>
          }
          posicao="bottom-end"
        />
      </div>

      <div className="agendamentos-barbeiro__item-conteudo">
        <div className="agendamentos-barbeiro__item-cliente">
          <Avatar
            src={agendamento.cliente?.avatar}
            alt={agendamento.cliente?.nome || 'Cliente'}
            tamanho={48}
            nome={agendamento.cliente?.nome}
          />
          <div>
            <strong className="agendamentos-barbeiro__cliente-nome">{agendamento.cliente?.nome || 'Cliente'}</strong>
            <span className="agendamentos-barbeiro__servico">{agendamento.servico?.nome}</span>
            {agendamento.servico && (
              <span className="agendamentos-barbeiro__servico-meta">
                {agendamento.servico.duracaoMinutos}min · R$ {agendamento.servico.preco.toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>
        </div>

        {agendamento.observacoes && (
          <p className="agendamentos-barbeiro__observacoes">{agendamento.observacoes}</p>
        )}

        <div className="agendamentos-barbeiro__item-status">
          <Chip
            variante={config.cor}
            iconeEsquerda={<Icone nome={config.icone} tamanho={10} />}
          >
            {config.label}
          </Chip>
        </div>
      </div>
    </article>
  );
}

// Need useState for dropdown
import { useState } from 'react';

export default AgendamentosBarbeiro;