/**
 * Comparação de Planos - Tabela acessível com aria-sort, sticky header.
 * 6 estados visuais, WCAG 2.2 AA, prefers-reduced-motion.
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { PlanoAssinatura, CicloFaturamento, ComparacaoPlanosProps } from '../types';
import { formatarMoeda, calcularEconomiaAnual, precoEfetivo } from '../types';
import { useComparacaoPlanos } from '../hooks/useAssinaturas';
import './ComparacaoPlanos.css';

// ============================================
// COMPONENTES AUXILIARES
// ============================================

interface ColunaOrdenavelProps {
  children: React.ReactNode;
  _campo: string;
  ordenacao: { campo: string; direcao: 'asc' | 'desc' } | null;
  aoOrdenar: (_campo: string) => void;
}

function ColunaOrdenavel({ children, _campo, ordenacao, aoOrdenar }: ColunaOrdenavelProps) {
  const estaOrdenado = ordenacao?.campo === _campo;
  const direcao = estaOrdenado ? ordenacao.direcao : null;

  return (
    <th
      scope="col"
      onClick={() => aoOrdenar(_campo)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      aria-sort={direcao === 'asc' ? 'ascending' : direcao === 'desc' ? 'descending' : 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {children}
        {estaOrdenado && (
          <span aria-hidden="true" style={{ fontSize: '10px' }}>
            {direcao === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </div>
    </th>
  );
}

interface BadgePlanoProps {
  plano: PlanoAssinatura;
  ehAtual: boolean;
  ciclo: CicloFaturamento;
}

function BadgePlano({ plano, ehAtual, ciclo }: BadgePlanoProps) {
  const preco = precoEfetivo(plano, ciclo);
  const economia = ciclo === 'anual' ? calcularEconomiaAnual(plano) : 0;

  return (
    <div
      className={`badge-plano ${ehAtual ? 'atual' : ''} ${plano.destaque ? 'destaque' : ''}`}
      role="status"
      aria-label={ehAtual ? 'Plano atual' : plano.destaque ? 'Plano recomendado' : ''}
    >
      <h3>{plano.nome}</h3>
      <p className="descricao">{plano.descricao}</p>
      <div className="preco">
        <span className="valor">{formatarMoeda(preco)}</span>
        <span className="periodo">/{ciclo === 'anual' ? 'ano' : 'mês'}</span>
      </div>
      {ciclo === 'anual' && economia > 0 && (
        <span className="economia" aria-label={`Economia de ${formatarMoeda(economia)} por ano`}>
          Economize {formatarMoeda(economia)}/ano ({plano.descontoAnual}%)
        </span>
      )}
      {ehAtual && <span className="tag-atual">Atual</span>}
      {plano.destaque && !ehAtual && <span className="tag-destaque">Recomendado</span>}
    </div>
  );
}

interface LinhaRecursoProps {
  recurso: string;
  valores: (string | number | boolean)[];
  planoAtualIndex: number;
}

function LinhaRecurso({ recurso, valores, planoAtualIndex }: LinhaRecursoProps) {
  return (
    <tr>
      <th scope="row">{recurso}</th>
      {valores.map((valor, i) => (
        <td key={i} className={i === planoAtualIndex ? 'atual' : ''}>
          {typeof valor === 'boolean' ? (
            <span className={valor ? 'sim' : 'nao'} aria-label={valor ? 'Incluso' : 'Não incluso'}>
              {valor ? '✓' : '✗'}
            </span>
          ) : typeof valor === 'number' && valor === -1 ? (
            <span className="ilimitado">Ilimitado</span>
          ) : (
            String(valor)
          )}
        </td>
      ))}
    </tr>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ComparacaoPlanos(props: ComparacaoPlanosProps) {
  const {
    planos,
    planoAtual,
    cicloPreferido,
    carregando,
    selecionarPlano,
    verDetalhes,
  } = useComparacaoPlanos(props);

  const [ciclo, setCiclo] = useState<CicloFaturamento>(cicloPreferido);
  const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' } | null>(null);

  const planoAtualIndex = useMemo(() => {
    if (!planoAtual) return -1;
    return planos.findIndex(p => p.id === planoAtual);
  }, [planos, planoAtual]);

  const aoOrdenar = useCallback((campo: string) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev?.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const planosOrdenados = useMemo(() => {
    if (!ordenacao) return planos;
    return [...planos].sort((a, b) => {
      const va = (a as Record<string, unknown>)[ordenacao.campo];
      const vb = (b as Record<string, unknown>)[ordenacao.campo];
      if (va < vb) return ordenacao.direcao === 'asc' ? -1 : 1;
      if (va > vb) return ordenacao.direcao === 'asc' ? 1 : -1;
      return 0;
    });
  }, [planos, ordenacao]);

  if (carregando) {
    return (
      <div className="comparacao-planos carregando" role="status" aria-live="polite">
        <div className="skeleton-planos">
          {planos.map((_, i) => (
            <div key={i} className="skeleton-plano" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="comparacao-planos" aria-labelledby="titulo-planos">
      {/* Header com seletor de ciclo */}
      <div className="comparacao-header">
        <h2 id="titulo-planos">Compare nossos planos</h2>
        <div className="seletor-ciclo" role="group" aria-label="Ciclo de faturamento">
          <label className={`opcao-ciclo ${ciclo === 'mensal' ? 'ativa' : ''}`}>
            <input
              type="radio"
              name="ciclo-faturamento"
              value="mensal"
              checked={ciclo === 'mensal'}
              onChange={() => setCiclo('mensal')}
              aria-label="Mensal"
            />
            <span>Mensal</span>
          </label>
          <label className={`opcao-ciclo ${ciclo === 'anual' ? 'ativa' : ''}`}>
            <input
              type="radio"
              name="ciclo-faturamento"
              value="anual"
              checked={ciclo === 'anual'}
              onChange={() => setCiclo('anual')}
              aria-label="Anual"
            />
            <span>Anual <em className="desconto-badge">-{planos[1]?.descontoAnual || 20}%</em></span>
          </label>
        </div>
      </div>

      {/* Tabela de comparação */}
      <div className="tabela-wrapper" role="region" aria-label="Tabela de comparação de planos" tabIndex={0}>
        <table className="tabela-comparacao">
          <thead>
            <tr>
              <th scope="col">Recurso</th>
              {planosOrdenados.map(plano => (
                <ColunaOrdenavel
                  key={plano.id}
                  campo="ordem"
                  ordenacao={ordenacao}
                  aoOrdenar={aoOrdenar}
                >
                  <BadgePlano plano={plano} ehAtual={plano.id === planoAtual} ciclo={ciclo} />
                </ColunaOrdenavel>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Barbeiros */}
            <LinhaRecurso
              recurso="Barbeiros"
              valores={planosOrdenados.map(p => p.limites.barbeiros === -1 ? 'Ilimitado' : p.limites.barbeiros)}
              planoAtualIndex={planoAtualIndex}
            />
            {/* Cadeiras */}
            <LinhaRecurso
              recurso="Cadeiras"
              valores={planosOrdenados.map(p => p.limites.cadeiras === -1 ? 'Ilimitado' : p.limites.cadeiras)}
              planoAtualIndex={planoAtualIndex}
            />
            {/* Agendamentos/mês */}
            <LinhaRecurso
              recurso="Agendamentos/mês"
              valores={planosOrdenados.map(p => p.limites.agendamentosMes === -1 ? 'Ilimitado' : p.limites.agendamentosMes.toLocaleString('pt-BR'))}
              planoAtualIndex={planoAtualIndex}
            />
            {/* Lembretes */}
            <LinhaRecurso
              recurso="Lembretes automáticos"
              valores={planosOrdenados.map(p => p.limites.lembretes)}
              planoAtualIndex={planoAtualIndex}
            />
            {/* Relatórios financeiros */}
            <LinhaRecurso
              recurso="Relatórios financeiros"
              valores={planosOrdenados.map(p => p.limites.relatoriosFinanceiros)}
              planoAtualIndex={planoAtualIndex}
            />
            {/* API */}
            <LinhaRecurso
              recurso="Acesso à API"
              valores={planosOrdenados.map(p => p.limites.apiAcesso)}
              planoAtualIndex={planoAtualIndex}
            />
            {/* Suporte prioritário */}
            <LinhaRecurso
              recurso="Suporte prioritário"
              valores={planosOrdenados.map(p => p.limites.suportePrioritario)}
              planoAtualIndex={planoAtualIndex}
            />
            {/* Marca branca */}
            <LinhaRecurso
              recurso="Marca branca"
              valores={planosOrdenados.map(p => p.limites.marcaBranca)}
              planoAtualIndex={planoAtualIndex}
            />
          </tbody>
        </table>
      </div>

      {/* Ações */}
      <div className="comparacao-acoes">
        {planosOrdenados.map(plano => (
          <button
            key={plano.id}
            className={`btn-plano ${plano.id === planoAtual ? 'atual' : ''} ${plano.destaque ? 'destaque' : ''}`}
            onClick={() => selecionarPlano(plano.id, ciclo)}
            disabled={plano.id === planoAtual}
            aria-pressed={plano.id === planoAtual}
          >
            {plano.id === planoAtual ? (
              <>
                <span className="btn-texto">Plano atual</span>
                {verDetalhes && (
                  <span className="btn-secundario" onClick={e => { e.stopPropagation(); verDetalhes(plano.id); }}>
                    Ver detalhes
                  </span>
                )}
              </>
            ) : plano.precoMensal === 0 ? (
              'Começar grátis'
            ) : (
              `Assinar por ${formatarMoeda(precoEfetivo(plano, ciclo))}/${ciclo === 'anual' ? 'ano' : 'mês'}`
            )}
          </button>
        ))}
      </div>

      {/* Legenda */}
      <div className="comparacao-legenda" aria-label="Legenda">
        <span className="legenda-item"><span className="sim" aria-hidden="true">✓</span> Incluso</span>
        <span className="legenda-item"><span className="nao" aria-hidden="true">✗</span> Não incluso</span>
        <span className="legenda-item"><span className="ilimitado" aria-hidden="true">∞</span> Ilimitado</span>
      </div>
    </section>
  );
}