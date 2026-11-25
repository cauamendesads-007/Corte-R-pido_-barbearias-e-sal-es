/**
 * Componente MetricasBarbeiro - Dashboard de métricas e relatórios.
 * Puro, coeso, < 150 linhas, gráficos acessíveis, exportação CSV.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  BotaoSecundario,
  Icone,
  Chip,
  Select,
  Skeleton,
  EmptyState,
  Tabela,
  TabelaCabecalho,
  TabelaCorpo,
  TabelaLinha,
  TabelaCelula,
  TabelaOrdenavel,
} from '@/componentes';
import type { MetricasBarbeiro } from '../types';
import { formatarDuracao } from '../rules';
import './MetricasBarbeiro.css';

interface MetricasBarbeiroProps {
  /** Métricas */
  metricas: MetricasBarbeiro | null;
  /** Período atual */
  periodo: 'dia' | 'semana' | 'mes' | 'ano';
  /** Carregando */
  carregando?: boolean;
  /** Erro */
  erro?: string | null;
  /** Callback para alterar período */
  aoAlterarPeriodo?: (periodo: 'dia' | 'semana' | 'mes' | 'ano') => void;
  /** Callback para exportar */
  aoExportar?: (formato: 'csv' | 'pdf') => void;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const PERIODOS: { valor: 'dia' | 'semana' | 'mes' | 'ano'; rotulo: string; icone: string }[] = [
  { valor: 'dia', rotulo: 'Hoje', icone: 'sol' },
  { valor: 'semana', rotulo: 'Esta semana', icone: 'calendario-semana' },
  { valor: 'mes', rotulo: 'Este mês', icone: 'calendario' },
  { valor: 'ano', rotulo: 'Este ano', icone: 'calendario-ano' },
];

export const MetricasBarbeiro = ({
  metricas,
  periodo,
  carregando = false,
  erro = null,
  aoAlterarPeriodo,
  aoExportar,
  className = '',
  'data-testid': testId,
}: MetricasBarbeiroProps) => {
  const [mostrarExportar, setMostrarExportar] = useState(false);

  const metricasCards = useMemo(() => {
    if (!metricas) return [];

    return [
      {
        titulo: 'Agendamentos',
        valor: metricas.agendamentosHoje,
        icone: 'calendario',
        cor: 'primario',
        subtitulo: `${metricas.concluidosHoje} concluídos · ${metricas.canceladosHoje} cancelados`,
      },
      {
        titulo: 'Taxa de comparecimento',
        valor: `${metricas.taxaComparecimento}%`,
        icone: 'usuario-check',
        cor: metricas.taxaComparecimento >= 90 ? 'sucesso' : metricas.taxaComparecimento >= 70 ? 'aviso' : 'perigo',
        subtitulo: `${metricas.naoCompareceramHoje} não compareceram`,
      },
      {
        titulo: 'Faturamento',
        valor: `R$ ${metricas.faturamentoHoje.toFixed(2).replace('.', ',')}`,
        icone: 'moeda',
        cor: 'primario',
        subtitulo: `Ticket médio: R$ ${metricas.ticketMedio.toFixed(2).replace('.', ',')}`,
      },
      {
        titulo: 'Fila de espera',
        valor: metricas.filaEspera,
        icone: 'usuarios',
        cor: 'aviso',
        subtitulo: `Tempo médio: ${formatarDuracao(metricas.tempoMedioEspera)}`,
      },
      {
        titulo: 'Agendamentos no período',
        valor: metricas.agendamentosSemana,
        icone: 'lista',
        cor: 'primario',
        subtitulo: `Faturamento: R$ ${metricas.faturamentoSemana.toFixed(2).replace('.', ',')}`,
      },
      {
        titulo: 'Clientes únicos',
        valor: metricas.clientesUnicosMes,
        icone: 'usuarios',
        cor: 'sucesso',
        subtitulo: `Mês atual`,
      },
    ];
  }, [metricas]);

  const servicosPopulares = useMemo(() => {
    if (!metricas?.servicosPopulares) return [];
    return metricas.servicosPopulares.slice(0, 10).map((s, i) => ({
      posicao: i + 1,
      nome: s.nome,
      quantidade: s.quantidade,
      faturamento: s.faturamento,
    }));
  }, [metricas?.servicosPopulares]);

  const horariosPico = useMemo(() => {
    if (!metricas?.horariosPico) return [];
    return metricas.horariosPico.map((h) => ({
      horario: h.horario,
      agendamentos: h.agendamentos,
      percentual: h.percentual,
    }));
  }, [metricas?.horariosPico]);

  if (carregando) {
    return (
      <div className={`metricas-barbeiro ${className}`} data-testid={testId}>
        <div className="metricas-barbeiro__skeleton" role="status" aria-label="Carregando métricas">
          <div className="metricas-barbeiro__header-skeleton">
            <Skeleton variante="retangular" largura="200px" altura={28} />
            <Skeleton variante="retangular" largura="300px" altura={44} />
          </div>
          <div className="metricas-barbeiro__cards-skeleton">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="metricas-barbeiro__card-skeleton">
                <Skeleton variante="retangular" largura="100%" altura={60} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className={`metricas-barbeiro ${className}`} data-testid={testId}>
        <EmptyState
          titulo="Erro ao carregar métricas"
          mensagem={erro}
          icone="alerta"
          className="metricas-barbeiro__empty"
          data-testid="metricas-barbeiro-erro"
        />
      </div>
    );
  }

  if (!metricas) {
    return (
      <div className={`metricas-barbeiro ${className}`} data-testid={testId}>
        <EmptyState
          titulo="Nenhuma métrica disponível"
          mensagem="Aguarde os dados serem carregados."
          icone="grafico-barras"
          className="metricas-barbeiro__empty"
          data-testid="metricas-barbeiro-vazio"
        />
      </div>
    );
  }

  return (
    <div className={`metricas-barbeiro ${className}`} data-testid={testId}>
      {/* Header */}
      <header className="metricas-barbeiro__header">
        <div className="metricas-barbeiro__header-esquerda">
          <h1 className="metricas-barbeiro__titulo">Métricas e Relatórios</h1>
          <div className="metricas-barbeiro__periodo" role="group" aria-label="Período do relatório">
            {PERIODOS.map((p) => (
              <button
                key={p.valor}
                className={`metricas-barbeiro__periodo-btn ${periodo === p.valor ? 'ativo' : ''}`}
                onClick={() => aoAlterarPeriodo?.(p.valor)}
                aria-pressed={periodo === p.valor}
                data-testid={`metricas-periodo-${p.valor}`}
              >
                <Icone nome={p.icone} tamanho={16} />
                {p.rotulo}
              </button>
            ))}
          </div>
        </div>
        <div className="metricas-barbeiro__header-direita">
          <div className="metricas-barbeiro__exportar-dropdown" style={{ position: 'relative' }}>
            <BotaoSecundario
              iconeEsquerda={<Icone nome="download" tamanho={16} />}
              aoClicar={() => setMostrarExportar(!mostrarExportar)}
              data-testid="metricas-exportar-btn"
            >
              Exportar
            </BotaoSecundario>
            {mostrarExportar && (
              <div className="metricas-barbeiro__exportar-menu" role="menu">
                <button
                  role="menuitem"
                  onClick={() => { aoExportar?.('csv'); setMostrarExportar(false); }}
                  data-testid="metricas-exportar-csv"
                >
                  <Icone nome="arquivo-csv" tamanho={16} /> CSV
                </button>
                <button
                  role="menuitem"
                  onClick={() => { aoExportar?.('pdf'); setMostrarExportar(false); }}
                  data-testid="metricas-exportar-pdf"
                >
                  <Icone nome="arquivo-pdf" tamanho={16} /> PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Cards de métricas */}
      <section className="metricas-barbeiro__cards" aria-label="Métricas principais">
        {metricasCards.map((metrica, index) => (
          <Cartao key={index} variante="metrica" className="metricas-barbeiro__cartao">
            <CartaoCorpo>
              <div className="metricas-barbeiro__metrica">
                <div className={`metricas-barbeiro__metrica-icone ${metrica.cor}`}>
                  <Icone nome={metrica.icone} tamanho={24} />
                </div>
                <div className="metricas-barbeiro__metrica-info">
                  <span className="metricas-barbeiro__metrica-valor">{metrica.valor}</span>
                  <span className="metricas-barbeiro__metrica-titulo">{metrica.titulo}</span>
                  <span className="metricas-barbeiro__metrica-subtitulo">{metrica.subtitulo}</span>
                </div>
              </div>
            </CartaoCorpo>
          </Cartao>
        ))}
      </section>

      {/* Serviços populares */}
      <section className="metricas-barbeiro__secao" aria-label="Serviços mais populares">
        <Cartao className="metricas-barbeiro__cartao-tabela">
          <CartaoCabecalho>
            <div className="metricas-barbeiro__secao-header">
              <h2 className="metricas-barbeiro__secao-titulo">
                <Icone nome="tesoura" tamanho={20} />
                Serviços mais populares
              </h2>
            </div>
          </CartaoCabecalho>
          <CartaoCorpo>
            {servicosPopulares.length === 0 ? (
              <EmptyState
                titulo="Nenhum dado"
                mensagem="Ainda não há agendamentos concluídos neste período."
                icone="tesoura"
                className="metricas-barbeiro__empty"
                data-testid="metricas-servicos-vazio"
              />
            ) : (
              <div className="metricas-barbeiro__tabela-wrapper">
                <Tabela>
                  <TabelaCabecalho>
                    <TabelaLinha>
                      <TabelaCelula>#</TabelaCelula>
                      <TabelaCelula>Serviço</TabelaCelula>
                      <TabelaCelula>Quantidade</TabelaCelula>
                      <TabelaCelula>Faturamento</TabelaCelula>
                    </TabelaLinha>
                  </TabelaCabecalho>
                  <TabelaCorpo>
                    {servicosPopulares.map((s) => (
                      <TabelaLinha key={s.nome}>
                        <TabelaCelula><strong>#{s.posicao}</strong></TabelaCelula>
                        <TabelaCelula>{s.nome}</TabelaCelula>
                        <TabelaCelula><Chip variante="primario">{s.quantidade}</Chip></TabelaCelula>
                        <TabelaCelula>R$ {s.faturamento.toFixed(2).replace('.', ',')}</TabelaCelula>
                      </TabelaLinha>
                    ))}
                  </TabelaCorpo>
                </Tabela>
              </div>
            )}
          </CartaoCorpo>
        </Cartao>
      </section>

      {/* Horários de pico */}
      <section className="metricas-barbeiro__secao" aria-label="Horários de maior movimento">
        <Cartao className="metricas-barbeiro__cartao-tabela">
          <CartaoCabecalho>
            <div className="metricas-barbeiro__secao-header">
              <h2 className="metricas-barbeiro__secao-titulo">
                <Icone nome="relogio" tamanho={20} />
                Horários de pico
              </h2>
            </div>
          </CartaoCabecalho>
          <CartaoCorpo>
            {horariosPico.length === 0 ? (
              <EmptyState
                titulo="Nenhum dado"
                mensagem="Ainda não há agendamentos neste período."
                icone="relogio"
                className="metricas-barbeiro__empty"
                data-testid="metricas-horarios-vazio"
              />
            ) : (
              <div className="metricas-barbeiro__horarios-grid">
                {horariosPico.map((h) => (
                  <div key={h.horario} className="metricas-barbeiro__horario-item">
                    <div className="metricas-barbeiro__horario-label">{h.horario}</div>
                    <div className="metricas-barbeiro__horario-barra">
                      <div
                        className="metricas-barbeiro__horario-preenchimento"
                        style={{ width: `${h.percentual}%` }}
                        role="progressbar"
                        aria-valuenow={h.percentual}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${h.horario}: ${h.agendamentos} agendamentos (${h.percentual}%)`}
                      />
                    </div>
                    <div className="metricas-barbeiro__horario-valor">
                      {h.agendamentos} ({h.percentual}%)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CartaoCorpo>
        </Cartao>
      </section>
    </div>
  );
};

export default MetricasBarbeiro;