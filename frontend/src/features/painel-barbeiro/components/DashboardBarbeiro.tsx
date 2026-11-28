/**
 * Componente DashboardBarbeiro - Dashboard principal do barbeiro.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useMemo } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  CartaoRodape,
  BotaoPrimario,
  BotaoSecundario,
  Icone,
  Chip,
  Avatar,
  Skeleton,
  EmptyState,
  Tabs,
  TabPainel,
  Badge,
} from '@/componentes';
import type { Agendamento, AgendamentoStatus, FilaEspera, MetricasBarbeiro, ConfiguracaoBarbeiro, NotificacaoBarbeiro } from '../types';
import { calcularTempoRelativo, formatarDuracao, obterProximoHorarioLivre } from '../rules';
import './DashboardBarbeiro.css';

interface DashboardBarbeiroProps {
  /** Agendamentos de hoje */
  agendamentosHoje: Agendamento[];
  /** Agendamentos próximos */
  agendamentosProximos: Agendamento[];
  /** Fila de espera */
  filaEspera: FilaEspera[];
  /** Métricas */
  metricas: MetricasBarbeiro | null;
  /** Configuração */
  configuracao: ConfiguracaoBarbeiro | null;
  /** Notificações */
  notificacoes: NotificacaoBarbeiro[];
  /** Carregando */
  carregando?: boolean;
  /** Callbacks */
  aoAtualizarStatus?: (id: string, status: AgendamentoStatus) => void;
  aoChamarProximoFila?: () => void;
  aoRemoverDaFila?: (id: string) => void;
  aoVerAgendamentos?: () => void;
  aoVerFila?: () => void;
  aoVerMetricas?: () => void;
  aoVerConfiguracao?: () => void;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const STATUS_CONFIG: Record<AgendamentoStatus, { label: string; cor: 'sucesso' | 'aviso' | 'perigo' | 'primario' | 'padrao'; icone: string }> = {
  pendente: { label: 'Pendente', cor: 'aviso', icone: 'relogio' },
  confirmado: { label: 'Confirmado', cor: 'sucesso', icone: 'check' },
  em_andamento: { label: 'Em andamento', cor: 'primario', icone: 'tesoura' },
  concluido: { label: 'Concluído', cor: 'sucesso', icone: 'check-circulo' },
  cancelado: { label: 'Cancelado', cor: 'perigo', icone: 'x-circulo' },
  nao_compareceu: { label: 'Não compareceu', cor: 'perigo', icone: 'usuario-x' },
};

export const DashboardBarbeiro = ({
  agendamentosHoje,
  agendamentosProximos,
  filaEspera,
  metricas,
  configuracao,
  notificacoes,
  carregando = false,
  aoAtualizarStatus,
  aoChamarProximoFila,
  aoRemoverDaFila,
  aoVerAgendamentos,
  aoVerFila,
  aoVerMetricas,
  aoVerConfiguracao,
  className = '',
  'data-testid': testId,
}: DashboardBarbeiroProps) => {
  const proximoHorarioLivre = useMemo(
    () => obterProximoHorarioLivre(agendamentosHoje, configuracao),
    [agendamentosHoje, configuracao]
  );

  const notificacoesNaoLidas = notificacoes.filter((n) => !n.lida).length;

  if (carregando) {
    return (
      <div className={`dashboard-barbeiro ${className}`} data-testid={testId}>
        <div className="dashboard-barbeiro__skeleton" role="status" aria-label="Carregando dashboard">
          <div className="dashboard-barbeiro__header-skeleton">
            <Skeleton variante="retangular" largura="200px" altura={28} />
            <Skeleton variante="retangular" largura="100px" altura={44} />
          </div>
          <div className="dashboard-barbeiro__metricas-skeleton">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="dashboard-barbeiro__metrica-skeleton">
                <Skeleton variante="retangular" largura="100%" altura={40} />
                <Skeleton variante="retangular" largura="60%" altura={14} />
              </div>
            ))}
          </div>
          <div className="dashboard-barbeiro__agenda-skeleton">
            <Skeleton variante="retangular" largura="200px" altura={24} />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="dashboard-barbeiro__agendamento-skeleton">
                <Skeleton variante="retangular" largura="100%" altura={60} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-barbeiro ${className}`} data-testid={testId}>
      {/* Header */}
      <header className="dashboard-barbeiro__header">
        <div className="dashboard-barbeiro__header-esquerda">
          <h1 className="dashboard-barbeiro__titulo">Painel do Barbeiro</h1>
          <Badge
            variante={notificacoesNaoLidas > 0 ? 'aviso' : 'sucesso'}
            className="dashboard-barbeiro__badge-notificacoes"
            data-testid="dashboard-notificacoes-badge"
          >
            {notificacoesNaoLidas > 0 ? `${notificacoesNaoLidas} nova${notificacoesNaoLidas !== 1 ? 's' : ''}` : 'Tudo em dia'}
          </Badge>
        </div>
        <div className="dashboard-barbeiro__header-direita">
          {proximoHorarioLivre && (
            <div className="dashboard-barbeiro__proximo-livre">
              <Icone nome="relogio" tamanho={16} />
              <span>Próximo livre: <strong>{proximoHorarioLivre}</strong></span>
            </div>
          )}
        </div>
      </header>

      {/* Métricas rápidas */}
      <section className="dashboard-barbeiro__metricas" aria-label="Métricas do dia">
        <Cartao variante="metrica" className="dashboard-barbeiro__cartao-metrica">
          <CartaoCorpo>
            <div className="dashboard-barbeiro__metrica">
              <div className="dashboard-barbeiro__metrica-icone">
                <Icone nome="calendario" tamanho={24} />
              </div>
              <div className="dashboard-barbeiro__metrica-info">
                <span className="dashboard-barbeiro__metrica-valor">{metricas?.agendamentosHoje || 0}</span>
                <span className="dashboard-barbeiro__metrica-label">Agendamentos hoje</span>
              </div>
            </div>
          </CartaoCorpo>
        </Cartao>

        <Cartao variante="metrica" className="dashboard-barbeiro__cartao-metrica">
          <CartaoCorpo>
            <div className="dashboard-barbeiro__metrica">
              <div className="dashboard-barbeiro__metrica-icone sucesso">
                <Icone nome="check-circulo" tamanho={24} />
              </div>
              <div className="dashboard-barbeiro__metrica-info">
                <span className="dashboard-barbeiro__metrica-valor">{metricas?.concluidosHoje || 0}</span>
                <span className="dashboard-barbeiro__metrica-label">Concluídos</span>
              </div>
            </div>
          </CartaoCorpo>
        </Cartao>

        <Cartao variante="metrica" className="dashboard-barbeiro__cartao-metrica">
          <CartaoCorpo>
            <div className="dashboard-barbeiro__metrica">
              <div className="dashboard-barbeiro__metrica-icone aviso">
                <Icone nome="usuario-espera" tamanho={24} />
              </div>
              <div className="dashboard-barbeiro__metrica-info">
                <span className="dashboard-barbeiro__metrica-valor">{filaEspera.length}</span>
                <span className="dashboard-barbeiro__metrica-label">Na fila</span>
              </div>
            </div>
          </CartaoCorpo>
        </Cartao>

        <Cartao variante="metrica" className="dashboard-barbeiro__cartao-metrica">
          <CartaoCorpo>
            <div className="dashboard-barbeiro__metrica">
              <div className="dashboard-barbeiro__metrica-icone primario">
                <Icone nome="moeda" tamanho={24} />
              </div>
              <div className="dashboard-barbeiro__metrica-info">
                <span className="dashboard-barbeiro__metrica-valor">
                  R$ {(metricas?.faturamentoHoje || 0).toFixed(2).replace('.', ',')}
                </span>
                <span className="dashboard-barbeiro__metrica-label">Faturamento hoje</span>
              </div>
            </div>
          </CartaoCorpo>
        </Cartao>
      </section>

      {/* Abas principais */}
      <Tabs
        abas={[
          { id: 'agenda', rotulo: 'Agenda de hoje', icone: 'calendario' },
          { id: 'fila', rotulo: `Fila de espera (${filaEspera.length})`, icone: 'usuarios' },
          { id: 'proximos', rotulo: 'Próximos', icone: 'relogio' },
        ]}
        variante="cards"
        className="dashboard-barbeiro__abas"
        data-testid="dashboard-abas"
      >
        {/* Agenda de hoje */}
        <TabPainel id="agenda">
          <div className="dashboard-barbeiro__secao">
            <div className="dashboard-barbeiro__secao-header">
              <h2 className="dashboard-barbeiro__secao-titulo">Agendamentos de hoje</h2>
              {aoVerAgendamentos && (
                <BotaoSecundario tamanho="pequeno" aoClicar={aoVerAgendamentos} data-testid="dashboard-ver-agendamentos">
                  Ver todos
                </BotaoSecundario>
              )}
            </div>

            {agendamentosHoje.length === 0 ? (
              <EmptyState
                titulo="Nenhum agendamento hoje"
                mensagem="Aproveite o tempo livre!"
                icone="calendario"
                className="dashboard-barbeiro__empty"
                data-testid="dashboard-agenda-vazia"
              />
            ) : (
              <div className="dashboard-barbeiro__lista-agendamentos" role="list">
                {agendamentosHoje.map((agendamento) => (
                  <AgendamentoDashboardItem
                    key={agendamento.id}
                    agendamento={agendamento}
                    aoAtualizarStatus={aoAtualizarStatus}
                    data-testid={`dashboard-agendamento-${agendamento.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        </TabPainel>

        {/* Fila de espera */}
        <TabPainel id="fila">
          <div className="dashboard-barbeiro__secao">
            <div className="dashboard-barbeiro__secao-header">
              <h2 className="dashboard-barbeiro__secao-titulo">Fila de espera</h2>
              <div className="dashboard-barbeiro__fila-acoes">
                {aoChamarProximoFila && filaEspera.length > 0 && (
                  <BotaoPrimario
                    iconeEsquerda={<Icone nome="megafone" tamanho={16} />}
                    aoClicar={aoChamarProximoFila}
                    data-testid="dashboard-chamar-proximo"
                  >
                    Chamar próximo
                  </BotaoPrimario>
                )}
                {aoVerFila && (
                  <BotaoSecundario tamanho="pequeno" aoClicar={aoVerFila} data-testid="dashboard-ver-fila">
                    Gerenciar fila
                  </BotaoSecundario>
                )}
              </div>
            </div>

            {filaEspera.length === 0 ? (
              <EmptyState
                titulo="Fila vazia"
                mensagem="Nenhum cliente aguardando no momento."
                icone="usuarios"
                className="dashboard-barbeiro__empty"
                data-testid="dashboard-fila-vazia"
              />
            ) : (
              <div className="dashboard-barbeiro__lista-fila" role="list">
                {filaEspera.map((cliente, index) => (
                  <FilaDashboardItem
                    key={cliente.id}
                    cliente={cliente}
                    posicao={index + 1}
                    aoRemover={aoRemoverDaFila}
                    data-testid={`dashboard-fila-${cliente.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        </TabPainel>

        {/* Próximos agendamentos */}
        <TabPainel id="proximos">
          <div className="dashboard-barbeiro__secao">
            <h2 className="dashboard-barbeiro__secao-titulo">Próximos agendamentos</h2>

            {agendamentosProximos.length === 0 ? (
              <EmptyState
                titulo="Nenhum agendamento futuro"
                mensagem="Sua agenda está livre nos próximos dias."
                icone="calendario"
                className="dashboard-barbeiro__empty"
                data-testid="dashboard-proximos-vazio"
              />
            ) : (
              <div className="dashboard-barbeiro__lista-agendamentos" role="list">
                {agendamentosProximos.slice(0, 10).map((agendamento) => (
                  <AgendamentoDashboardItem
                    key={agendamento.id}
                    agendamento={agendamento}
                    aoAtualizarStatus={aoAtualizarStatus}
                    compacto
                    data-testid={`dashboard-proximo-${agendamento.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        </TabPainel>
      </Tabs>

      {/* Ações rápidas */}
      <section className="dashboard-barbeiro__acoes-rapidas" aria-label="Ações rápidas">
        <h2 className="dashboard-barbeiro__secao-titulo">Ações rápidas</h2>
        <div className="dashboard-barbeiro__acoes-grid">
          <Cartao variante="acao" className="dashboard-barbeiro__cartao-acao" onClick={aoVerMetricas}>
            <CartaoCorpo>
              <div className="dashboard-barbeiro__acao-icone">
                <Icone nome="grafico-barras" tamanho={28} />
              </div>
              <h3 className="dashboard-barbeiro__acao-titulo">Métricas</h3>
              <p className="dashboard-barbeiro__acao-desc">Ver desempenho e relatórios</p>
            </CartaoCorpo>
          </Cartao>

          <Cartao variante="acao" className="dashboard-barbeiro__cartao-acao" onClick={aoVerConfiguracao}>
            <CartaoCorpo>
              <div className="dashboard-barbeiro__acao-icone">
                <Icone nome="configuracoes" tamanho={28} />
              </div>
              <h3 className="dashboard-barbeiro__acao-titulo">Configurações</h3>
              <p className="dashboard-barbeiro__acao-desc">Ajustar horários e preferências</p>
            </CartaoCorpo>
          </Cartao>

          <Cartao variante="acao" className="dashboard-barbeiro__cartao-acao" onClick={aoVerAgendamentos}>
            <CartaoCorpo>
              <div className="dashboard-barbeiro__acao-icone">
                <Icone nome="lista" tamanho={28} />
              </div>
              <h3 className="dashboard-barbeiro__acao-titulo">Agendamentos</h3>
              <p className="dashboard-barbeiro__acao-desc">Gerenciar todos os agendamentos</p>
            </CartaoCorpo>
          </Cartao>

          <Cartao variante="acao" className="dashboard-barbeiro__cartao-acao" onClick={aoVerFila}>
            <CartaoCorpo>
              <div className="dashboard-barbeiro__acao-icone">
                <Icone nome="usuarios" tamanho={28} />
              </div>
              <h3 className="dashboard-barbeiro__acao-titulo">Fila de espera</h3>
              <p className="dashboard-barbeiro__acao-desc">Gerenciar clientes na fila</p>
            </CartaoCorpo>
          </Cartao>
        </div>
      </section>
    </div>
  );
};

/* Sub-componentes */

function AgendamentoDashboardItem({
  agendamento,
  aoAtualizarStatus,
  compacto = false,
}: {
  agendamento: Agendamento;
  aoAtualizarStatus?: (id: string, status: AgendamentoStatus) => void;
  compacto?: boolean;
}) {
  const config = STATUS_CONFIG[agendamento.status];
  const tempoRelativo = calcularTempoRelativo(`${agendamento.data}T${agendamento.horario}`);

  const handleStatusChange = (novoStatus: AgendamentoStatus) => {
    aoAtualizarStatus?.(agendamento.id, novoStatus);
  };

  return (
    <article className={`dashboard-barbeiro__agendamento-item ${compacto ? 'dashboard-barbeiro__agendamento-item--compacto' : ''}`} role="listitem">
      <div className="dashboard-barbeiro__agendamento-hora">
        <span className="dashboard-barbeiro__horario">{agendamento.horario}</span>
        <span className="dashboard-barbeiro__tempo-relativo">{tempoRelativo}</span>
      </div>
      <div className="dashboard-barbeiro__agendamento-info">
        <div className="dashboard-barbeiro__agendamento-cliente">
          <Avatar
            src={agendamento.cliente?.avatar}
            alt={agendamento.cliente?.nome || 'Cliente'}
            tamanho={compacto ? 32 : 40}
            nome={agendamento.cliente?.nome}
          />
          <div>
            <strong className="dashboard-barbeiro__cliente-nome">
              {agendamento.cliente?.nome || 'Cliente'}
            </strong>
            <span className="dashboard-barbeiro__servico-nome">{agendamento.servico?.nome}</span>
          </div>
        </div>
        {!compacto && agendamento.observacoes && (
          <p className="dashboard-barbeiro__observacoes">{agendamento.observacoes}</p>
        )}
      </div>
      <div className="dashboard-barbeiro__agendamento-acoes">
        <Chip
          variante={config.cor}
          iconeEsquerda={<Icone nome={config.icone} tamanho={10} />}
          className="dashboard-barbeiro__status-chip"
        >
          {config.label}
        </Chip>
        {!compacto && aoAtualizarStatus && agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && (
          <div className="dashboard-barbeiro__status-acoes">
            {['confirmado', 'em_andamento', 'concluido', 'cancelado'].map((s) => (
              <button
                key={s}
                className={`dashboard-barbeiro__status-btn ${agendamento.status === s ? 'ativo' : ''}`}
                onClick={() => handleStatusChange(s as AgendamentoStatus)}
                disabled={agendamento.status === s}
                data-testid={`status-btn-${s}`}
              >
                {STATUS_CONFIG[s as AgendamentoStatus].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function FilaDashboardItem({
  cliente,
  posicao,
  aoRemover,
}: {
  cliente: FilaEspera;
  posicao: number;
  aoRemover?: (id: string) => void;
}) {
  const tempoEspera = Math.floor((Date.now() - new Date(cliente.entradaEm).getTime()) / 60000);

  return (
    <article className="dashboard-barbeiro__fila-item" role="listitem">
      <span className="dashboard-barbeiro__fila-posicao">#{posicao}</span>
      <div className="dashboard-barbeiro__fila-cliente">
        <Avatar
          src={cliente.avatar}
          alt={cliente.nome}
          tamanho={40}
          nome={cliente.nome}
        />
        <div>
          <strong className="dashboard-barbeiro__fila-nome">{cliente.nome}</strong>
          <span className="dashboard-barbeiro__fila-servico">{cliente.servicoDesejado}</span>
        </div>
      </div>
      <div className="dashboard-barbeiro__fila-tempo">
        <Icone nome="relogio" tamanho={14} />
        <span>{tempoEspera}min esperando</span>
      </div>
      {aoRemover && (
        <button
          className="dashboard-barbeiro__fila-remover"
          onClick={() => aoRemover(cliente.id)}
          aria-label="Remover da fila"
          data-testid={`fila-remover-${cliente.id}`}
        >
          <Icone nome="x" tamanho={16} />
        </button>
      )}
    </article>
  );
}

export default DashboardBarbeiro;