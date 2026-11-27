/**
 * Gerenciamento de Assinatura - Tabs: Plano, Faturas, Histórico, Cupons, Limites.
 * Otimista UI, AbortController, rollback, WCAG 2.2 AA.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type {
  PlanoAssinatura,
  PlanoId,
  CicloFaturamento,
  GerenciamentoAssinaturaProps,
} from '../types';
import { formatarMoeda, formatarDataRelativa, obterPlanoPorId } from '../types';
import { formatarStatusAssinatura, formatarStatusFatura } from '../rules';
import { useGerenciamentoAssinatura } from '../hooks/useAssinaturas';
import { ModalConfirmacao } from './ModalConfirmacao';
import { ModalCupom } from './ModalCupom';
import { FaturaDetalhe } from './FaturaDetalhe';
import './GerenciamentoAssinatura.css';

// ============================================
// TIPOS DE ABA
// ============================================

type AbaId = 'plano' | 'faturas' | 'historico' | 'cupons' | 'limites';

interface Aba {
  id: AbaId;
  label: string;
  icone: React.ReactNode;
  badge?: number;
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function TabButton({ aba, ativa, aoClicar, badge }: { aba: Aba; ativa: boolean; aoClicar: () => void; badge?: number }) {
  return (
    <button
      role="tab"
      aria-selected={ativa}
      aria-controls={`painel-${aba.id}`}
      id={`tab-${aba.id}`}
      onClick={aoClicar}
      className={`tab-btn ${ativa ? 'ativa' : ''}`}
      disabled={ativa}
    >
      <span className="tab-icone" aria-hidden="true">{aba.icone}</span>
      <span className="tab-label">{aba.label}</span>
      {badge && badge > 0 && (
        <span className="tab-badge" aria-label={`${badge} notificações`}>{badge}</span>
      )}
    </button>
  );
}

function StatusBadge({ label, cor }: { label: string; cor: 'sucesso' | 'aviso' | 'erro' | 'neutro' }) {
  const cores = {
    sucesso: 'var(--color-success, #16a34a)',
    aviso: 'var(--color-warning, #f59e0b)',
    erro: 'var(--color-error, #dc2626)',
    neutro: 'var(--color-text-secondary, #666)',
  };

  return (
    <span
      className="status-badge"
      style={{ backgroundColor: `${cores[cor]}20`, color: cores[cor], borderColor: cores[cor] }}
    >
      {label}
    </span>
  );
}

function InfoLinha({ label, valor, children }: { label: string; valor?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="info-linha">
      <span className="info-label">{label}</span>
      <span className="info-valor">{valor ?? children}</span>
    </div>
  );
}

function LimiteBarra({ label, atual, maximo, unidade = '' }: { label: string; atual: number; maximo: number; unidade?: string }) {
  const percentual = maximo === -1 ? 0 : Math.min(100, (atual / maximo) * 100);
  const ilimitado = maximo === -1;

  return (
    <div className="limite-barra">
      <div className="limite-header">
        <span className="limite-label">{label}</span>
        <span className="limite-valor" aria-label={ilimitado ? 'Ilimitado' : `${atual} de ${maximo} ${unidade}`}>
          {ilimitado ? 'Ilimitado' : `${atual} / ${maximo} ${unidade}`}
        </span>
      </div>
      {!ilimitado && (
        <div className="limite-progresso" role="progressbar" aria-valuenow={atual} aria-valuemin={0} aria-valuemax={maximo} aria-label={label}>
          <div
            className="limite-barra-preenchimento"
            style={{ width: `${percentual}%` }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function GerenciamentoAssinatura(props: GerenciamentoAssinaturaProps) {
  const {
    assinatura,
    faturas,
    historico,
    planos,
    carregando,
    erro,
    limparErro,
    aoTrocarPlano,
    aoPausar,
    aoCancelar,
    aoReativar,
    aoAplicarCupom,
    aoBaixarFatura,
    aoImprimirFatura,
    recarregarFaturas,
    recarregarHistorico,
  } = useGerenciamentoAssinatura(props);

  const [abaAtiva, setAbaAtiva] = useState<AbaId>('plano');
  const [modalConfirmacao, setModalConfirmacao] = useState<{
    aberto: boolean;
    titulo: string;
    mensagem: string;
    aoConfirmar: () => Promise<void>;
    variante?: 'perigo' | 'aviso' | 'info';
  } | null>(null);
  const [modalCupom, setModalCupom] = useState<{ aberto: boolean; planoId?: PlanoId; ciclo?: CicloFaturamento } | null>(null);
  const [faturaExpandida, setFaturaExpandida] = useState<string | null>(null);

  const planoAtual = useMemo(() => assinatura ? obterPlanoPorId(assinatura.planoId) : null, [assinatura]);

  const abas: Aba[] = useMemo(() => [
    { id: 'plano', label: 'Plano', icone: '📋' },
    { id: 'faturas', label: 'Faturas', icone: '🧾', badge: faturas.filter(f => f.status === 'vencida' || f.status === 'pendente').length },
    { id: 'historico', label: 'Histórico', icone: '📜' },
    { id: 'cupons', label: 'Cupons', icone: '🎫' },
    { id: 'limites', label: 'Limites', icone: '📊' },
  ], [faturas]);

  const abrirConfirmacao = useCallback((
    titulo: string,
    mensagem: string,
    aoConfirmar: () => Promise<void>,
    variante: 'perigo' | 'aviso' | 'info' = 'info'
  ) => {
    setModalConfirmacao({ aberto: true, titulo, mensagem, aoConfirmar, variante });
  }, []);

  // ============================================
  // AÇÕES DO PLANO
  // ============================================

  const handleTrocarPlano = useCallback((planoId: PlanoId, ciclo: CicloFaturamento) => {
    abrirConfirmacao(
      `Alterar para ${obterPlanoPorId(planoId)?.nome}`,
      `Confirma a alteração para o plano ${obterPlanoPorId(planoId)?.nome} (${ciclo === 'anual' ? 'Anual' : 'Mensal'})?`,
      () => aoTrocarPlano(planoId, ciclo),
      'aviso'
    );
  }, [aoTrocarPlano, abrirConfirmacao]);

  const handlePausar = useCallback(() => {
    abrirConfirmacao(
      'Pausar assinatura',
      'Sua assinatura será pausada. Você não será cobrado no próximo ciclo, mas perderá acesso aos recursos pagos. Deseja continuar?',
      aoPausar,
      'aviso'
    );
  }, [aoPausar, abrirConfirmacao]);

  const handleCancelar = useCallback(() => {
    abrirConfirmacao(
      'Cancelar assinatura',
      'Tem certeza? Ao cancelar, você manterá acesso até o fim do período pago, mas não haverá renovação automática. Esta ação pode ser desfeita reativando a assinatura.',
      () => {
        const motivo = window.prompt('Motivo do cancelamento (opcional):') || 'Não informado';
        return aoCancelar(motivo);
      },
      'perigo'
    );
  }, [aoCancelar, abrirConfirmacao]);

  const handleReativar = useCallback(() => {
    abrirConfirmacao(
      'Reativar assinatura',
      'Sua assinatura será reativada e a cobrança retomada no próximo ciclo. Deseja continuar?',
      aoReativar,
      'info'
    );
  }, [aoReativar, abrirConfirmacao]);

  const handleAplicarCupom = useCallback(() => {
    setModalCupom({ aberto: true, planoId: assinatura?.planoId, ciclo: assinatura?.ciclo });
  }, [assinatura]);

  // ============================================
  // RENDER DE ABAS
  // ============================================

  const renderAbaPlano = () => {
    if (!assinatura || !planoAtual) {
      return (
        <div className="estado-vazio" role="status">
          <div className="vazio-icone">📋</div>
          <h3>Nenhuma assinatura ativa</h3>
          <p>Você está no plano gratuito Starter.</p>
          <button
            className="btn btn-primario"
            onClick={() => setAbaAtiva('plano')}
          >
            Ver planos disponíveis
          </button>
        </div>
      );
    }

    const statusFormatado = formatarStatusAssinatura(assinatura.status);
    const diasProxima = assinatura.dataProximaCobranca
      ? Math.ceil((new Date(assinatura.dataProximaCobranca).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <div className="aba-conteudo" role="tabpanel" id="painel-plano" aria-labelledby="tab-plano">
        {/* Card principal do plano */}
        <div className="plano-card" style={{ borderColor: `var(--color-${statusFormatado.cor}, #16a34a)` }}>
          <div className="plano-header">
            <div>
              <h3>{planoAtual.nome}</h3>
              <p className="plano-descricao">{planoAtual.descricao}</p>
            </div>
            <StatusBadge label={statusFormatado.label} cor={statusFormatado.cor} />
          </div>

          <div className="plano-detalhes">
            <InfoLinha
              label="Ciclo"
              valor={<span className="ciclo-badge">{assinatura.ciclo === 'anual' ? 'Anual' : 'Mensal'}</span>}
            />
            <InfoLinha
              label="Valor atual"
              valor={
                <>
                  <strong>{formatarMoeda(assinatura.valorAtual)}</strong>
                  {' '}
                  {assinatura.ciclo === 'anual' ? 'ano' : 'mês'}
                </>
              }
            />
            {assinatura.descontoAplicado && (
              <InfoLinha
                label="Desconto aplicado"
                valor={<span className="desconto-badge">{assinatura.descontoAplicado}% OFF</span>}
              />
            )}
            <InfoLinha
              label="Início da assinatura"
              valor={formatarDataRelativa(assinatura.dataInicio)}
            />
            {diasProxima !== null && (
              <InfoLinha
                label="Próxima cobrança"
                valor={
                  <>
                    <strong>{formatarDataRelativa(assinatura.dataProximaCobranca)}</strong>
                    <span className="dias-restantes">({diasProxima} dia{diasProxima !== 1 ? 's' : ''})</span>
                  </>
                }
              />
            )}
            {assinatura.cupomId && (
              <InfoLinha label="Cupom aplicado" valor={assinatura.cupomId} />
            )}
          </div>

          {/* Ações do plano */}
          <div className="plano-acoes">
            {assinatura.status === 'ativa' && (
              <>
                <button
                  className="btn btn-secundario"
                  onClick={() => setAbaAtiva('plano')}
                >
                  Trocar de plano
                </button>
                <button className="btn btn-outline" onClick={handlePausar}>
                  Pausar
                </button>
                <button className="btn btn-perigo" onClick={handleCancelar}>
                  Cancelar
                </button>
              </>
            )}
            {assinatura.status === 'pausada' && (
              <>
                <button className="btn btn-primario" onClick={handleReativar}>
                  Reativar
                </button>
                <button className="btn btn-perigo" onClick={handleCancelar}>
                  Cancelar definitivamente
                </button>
              </>
            )}
            {assinatura.status === 'cancelada' && (
              <button className="btn btn-primario" onClick={handleReativar}>
                Reativar assinatura
              </button>
            )}
            {assinatura.status !== 'cancelada' && (
              <button className="btn btn-outline" onClick={handleAplicarCupom}>
                Aplicar cupom
              </button>
            )}
          </div>
        </div>

        {/* Comparação rápida com outros planos */}
        <div className="planos-alternativos">
          <h4>Outros planos disponíveis</h4>
          <div className="planos-grid">
            {planos
              .filter(p => p.id !== assinatura.planoId)
              .map(plano => (
                <button
                  key={plano.id}
                  className={`plano-card-mini ${plano.destaque ? 'destaque' : ''}`}
                  onClick={() => handleTrocarPlano(plano.id, assinatura.ciclo)}
                >
                  {plano.destaque && <span className="tag-destaque">Recomendado</span>}
                  <h5>{plano.nome}</h5>
                  <p className="preco">{formatarMoeda(precoEfetivo(plano, assinatura.ciclo))}/{assinatura.ciclo === 'anual' ? 'ano' : 'mês'}</p>
                  <span className="btn-texto">Selecionar</span>
                </button>
              ))}
          </div>
        </div>
      </div>
    );
  };

  // Helper para precoEfetivo (importar de types)
  function precoEfetivo(plano: PlanoAssinatura, ciclo: CicloFaturamento): number {
    return ciclo === 'anual' ? plano.precoAnual : plano.precoMensal;
  }

  const renderAbaFaturas = () => (
    <div className="aba-conteudo" role="tabpanel" id="painel-faturas" aria-labelledby="tab-faturas">
      <div className="aba-header">
        <h3>Faturas</h3>
        <button className="btn btn-secundario" onClick={recarregarFaturas} disabled={carregando}>
          Atualizar
        </button>
      </div>

      {erro && <div className="erro-toast" role="alert">{erro}</div>}

      {faturas.length === 0 ? (
        <div className="estado-vazio">
          <div className="vazio-icone">🧾</div>
          <h3>Nenhuma fatura</h3>
          <p>Suas faturas aparecerão aqui quando houver cobranças.</p>
        </div>
      ) : (
        <div className="faturas-lista">
          {faturas.map(fatura => {
            const statusFormatado = formatarStatusFatura(fatura.status);
            const expandida = faturaExpandida === fatura.id;

            return (
              <article
                key={fatura.id}
                className={`fatura-card ${statusFormatado.cor} ${expandida ? 'expandida' : ''}`}
              >
                <div className="fatura-resumo" onClick={() => setFaturaExpandida(expandida ? null : fatura.id)}>
                  <div className="fatura-info">
                    <div className="fatura-numero">
                      <span className="numero">{fatura.numero}</span>
                      <StatusBadge label={statusFormatado.label} cor={statusFormatado.cor} />
                    </div>
                    <div className="fatura-meta">
                      <span>Emitida: {formatarDataRelativa(fatura.dataEmissao)}</span>
                      <span>Vence: {formatarDataRelativa(fatura.dataVencimento)}</span>
                    </div>
                  </div>
                  <div className="fatura-valor">
                    <strong>{formatarMoeda(fatura.valor)}</strong>
                    {fatura.valorPago > 0 && (
                      <span className="valor-pago">Pago: {formatarMoeda(fatura.valorPago)}</span>
                    )}
                  </div>
                  <div className="fatura-acoes">
                    <button
                      className="btn-icon"
                      onClick={e => { e.stopPropagation(); aoBaixarFatura(fatura.id); }}
                      aria-label={`Baixar fatura ${fatura.numero}`}
                    >
                      ⬇️
                    </button>
                    <button
                      className="btn-icon"
                      onClick={e => { e.stopPropagation(); aoImprimirFatura(fatura.id); }}
                      aria-label={`Imprimir fatura ${fatura.numero}`}
                    >
                      🖨️
                    </button>
                    <span className="expandir-icone" aria-hidden="true">
                      {expandida ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {expandida && (
                  <FaturaDetalhe fatura={fatura} onFechar={() => setFaturaExpandida(null)} />
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAbaHistorico = () => (
    <div className="aba-conteudo" role="tabpanel" id="painel-historico" aria-labelledby="tab-historico">
      <div className="aba-header">
        <h3>Histórico de alterações</h3>
        <button className="btn btn-secundario" onClick={recarregarHistorico} disabled={carregando}>
          Atualizar
        </button>
      </div>

      {historico.length === 0 ? (
        <div className="estado-vazio">
          <div className="vazio-icone">📜</div>
          <h3>Sem alterações</h3>
          <p>Seu histórico de mudanças de plano aparecerá aqui.</p>
        </div>
      ) : (
        <div className="historico-lista">
          {historico.map(item => {
            const planoAntigo = obterPlanoPorId(item.planoAnteriorId);
            const planoNovo = obterPlanoPorId(item.planoNovoId);
            const tipoLabels = {
              upgrade: 'Upgrade',
              downgrade: 'Downgrade',
              mudanca_ciclo: 'Mudança de ciclo',
            };

            return (
              <article key={item.id} className={`historico-item ${item.tipo}`}>
                <div className="historico-tipo">
                  <span className={`tag ${item.tipo}`}>{tipoLabels[item.tipo]}</span>
                  <time dateTime={item.dataEfetivacao}>{formatarDataRelativa(item.dataEfetivacao)}</time>
                </div>
                <div className="historico-detalhes">
                  <div className="mudanca">
                    <span className="de">{planoAntigo?.nome} ({item.cicloAnterior})</span>
                    <span className="seta" aria-hidden="true">→</span>
                    <span className="para">{planoNovo?.nome} ({item.cicloNovo})</span>
                  </div>
                  {item.prorrateado && (
                    <div className="historico-prorrateacao">
                      Valor prorrateado: <strong>{formatarMoeda(Math.abs(item.valorDiferenca))}</strong>
                      {item.valorDiferenca > 0 ? ' (cobrança extra)' : ' (crédito)'}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAbaCupons = () => (
    <div className="aba-conteudo" role="tabpanel" id="painel-cupons" aria-labelledby="tab-cupons">
      <div className="aba-header">
        <h3>Cupons de desconto</h3>
        <button className="btn btn-primario" onClick={handleAplicarCupom}>
          Aplicar cupom
        </button>
      </div>

      <div className="cupons-info">
        <p>Insira um código de cupom para obter desconto na sua assinatura.</p>
        <ul>
          <li>Cupons de porcentagem aplicam-se ao valor base do plano</li>
          <li>Cupons de valor fixo reduzem o valor total (mínimo R$ 0,01)</li>
          <li>Alguns cupons são válidos apenas para primeira assinatura</li>
          <li>Cupons podem ter limite de usos e data de validade</li>
        </ul>
      </div>

      {assinatura?.cupomId && (
        <div className="cupom-aplicado">
          <h4>Cupom ativo</h4>
          <p>Cupom <strong>{assinatura.cupomId}</strong> aplicado com {assinatura.descontoAplicado}% de desconto.</p>
        </div>
      )}
    </div>
  );

  const renderAbaLimites = () => {
    if (!assinatura || !planoAtual) {
      return (
        <div className="aba-conteudo" role="tabpanel" id="painel-limites" aria-labelledby="tab-limites">
          <div className="estado-vazio">
            <div className="vazio-icone">📊</div>
            <h3>Assine um plano para ver limites</h3>
            <p>O plano Starter gratuito tem limites básicos.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="aba-conteudo" role="tabpanel" id="painel-limites" aria-labelledby="tab-limites">
        <h3>Uso dos recursos do plano</h3>
        <p className="limites-intro">Seu plano <strong>{planoAtual.nome}</strong> inclui:</p>

        <div className="limites-grid">
          <LimiteBarra
            label="Barbeiros"
            atual={1}
            maximo={planoAtual.limites.barbeiros}
          />
          <LimiteBarra
            label="Cadeiras"
            atual={1}
            maximo={planoAtual.limites.cadeiras}
          />
          <LimiteBarra
            label="Agendamentos/mês"
            atual={0}
            maximo={planoAtual.limites.agendamentosMes}
          />
        </div>

        <div className="limites-recursos">
          <h4>Recursos inclusos</h4>
          <ul>
            {planoAtual.limites.lembretes && <li>✓ Lembretes automáticos</li>}
            {planoAtual.limites.relatoriosFinanceiros && <li>✓ Relatórios financeiros</li>}
            {planoAtual.limites.apiAcesso && <li>✓ Acesso à API</li>}
            {planoAtual.limites.suportePrioritario && <li>✓ Suporte prioritário</li>}
            {planoAtual.limites.marcaBranca && <li>✓ Marca branca</li>}
          </ul>
          {!planoAtual.limites.relatoriosFinanceiros && <li className="nao-incluso">✗ Relatórios financeiros</li>}
          {!planoAtual.limites.apiAcesso && <li className="nao-incluso">✗ Acesso à API</li>}
          {!planoAtual.limites.suportePrioritario && <li className="nao-incluso">✗ Suporte prioritário</li>}
          {!planoAtual.limites.marcaBranca && <li className="nao-incluso">✗ Marca branca</li>}
        </div>

        <div className="limites-upsell">
          <p>Precisa de mais recursos? <button className="link-btn" onClick={() => setAbaAtiva('plano')}>Ver planos superiores</button></p>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  const renderAba = useCallback(() => {
    switch (abaAtiva) {
      case 'plano': return renderAbaPlano();
      case 'faturas': return renderAbaFaturas();
      case 'historico': return renderAbaHistorico();
      case 'cupons': return renderAbaCupons();
      case 'limites': return renderAbaLimites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaAtiva, assinatura, faturas, historico, planos, carregando, erro]);

  return (
    <section className="gerenciamento-assinatura" aria-labelledby="titulo-gerenciamento">
      {erro && (
        <div className="erro-global" role="alert">
          <span>{erro}</span>
          <button onClick={limparErro} aria-label="Fechar">×</button>
        </div>
      )}

      <div className="gerenciamento-header">
        <h2 id="titulo-gerenciamento">Minha assinatura</h2>
      </div>

      {/* Tabs */}
      <div className="tabs" role="tablist" aria-label="Seções de gerenciamento">
        {abas.map(aba => (
          <TabButton
            key={aba.id}
            aba={aba}
            ativa={abaAtiva === aba.id}
            aoClicar={() => setAbaAtiva(aba.id)}
            badge={aba.badge}
          />
        ))}
      </div>

      {/* Painel da aba ativa */}
      <div className="tab-painel" role="tabpanel">
        {renderAba()}
      </div>

      {/* Modais */}
      {modalConfirmacao && (
        <ModalConfirmacao
          aberto={modalConfirmacao.aberto}
          titulo={modalConfirmacao.titulo}
          mensagem={modalConfirmacao.mensagem}
          variante={modalConfirmacao.variante}
          aoConfirmar={async () => {
            await modalConfirmacao.aoConfirmar();
            setModalConfirmacao(null);
          }}
          aoCancelar={() => setModalConfirmacao(null)}
        />
      )}

      {modalCupom && (
        <ModalCupom
          aberto={modalCupom.aberto}
          _planoId={modalCupom.planoId}
          _ciclo={modalCupom.ciclo}
          aoAplicar={async (codigo) => {
            await aoAplicarCupom(codigo);
            setModalCupom(null);
          }}
          aoFechar={() => setModalCupom(null)}
        />
      )}
    </section>
  );
}