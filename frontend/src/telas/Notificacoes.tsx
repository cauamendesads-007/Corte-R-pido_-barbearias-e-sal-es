/**
 * Tela Notificações - Lista de notificações do usuário.
 * Filtros por tipo, marcar como lida, excluir, paginação infinita.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import {
  Container,
  Botao,
  BotaoPrimario,
  ChipGrupo,
  Skeleton,
  ToastProvider,
  useGlobalToast,
  Icone,
} from '@/componentes';
import { formatarTempoRelativo } from '@/utilitarios/formatar';
import type { Notificacao } from '@/tipos';
import './Notificacoes.css';

type TipoFiltro = 'todas' | 'agendamentos' | 'mensagens' | 'pagamentos' | 'administracao';

const TIPOS_FILTRO: { valor: TipoFiltro; rotulo: string; icone: React.ReactNode }[] = [
  { valor: 'todas', rotulo: 'Todas', icone: <Icone nome="sino" tamanho={16} /> },
  { valor: 'agendamentos', rotulo: 'Agendamentos', icone: <Icone nome="calendario" tamanho={16} /> },
  { valor: 'mensagens', rotulo: 'Mensagens', icone: <Icone nome="mensagem" tamanho={16} /> },
  { valor: 'pagamentos', rotulo: 'Pagamentos', icone: <Icone nome="pix" tamanho={16} /> },
  { valor: 'administracao', rotulo: 'Administração', icone: <Icone nome="configuracoes" tamanho={16} /> },
];

const ICONES_TIPO: Record<string, React.ReactNode> = {
  agendamento: <Icone nome="calendario" tamanho={16} />,
  reagendamento: <Icone nome="calendario" tamanho={16} />,
  cancelamento: <Icone nome="xCirculo" tamanho={16} />,
  mensagem: <Icone nome="mensagem" tamanho={16} />,
  administracao: <Icone nome="configuracoes" tamanho={16} />,
  pagamento: <Icone nome="pix" tamanho={16} />,
};

const Notificacoes = () => {
  const { sucesso, erro: toastErro } = useGlobalToast();

  const [filtro, setFiltro] = useState<TipoFiltro>('todas');
  const [apenasNaoLidas, setApenasNaoLidas] = useState(false);

  const {
    notificacoes,
    carregando,
    erro,
    temMais,
    carregarMais,
    marcarComoLida,
    marcarTodasComoLidas,
    excluir,
    recarregar,
    naoLidas,
  } = useNotificacoes();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && temMais && !carregando) {
          carregarMais();
        }
      },
      { rootMargin: '200px' }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [temMais, carregando, carregarMais]);

  const handleMarcarComoLida = useCallback(async (notificacaoId: string) => {
    try {
      await marcarComoLida(notificacaoId);
    } catch {
      toastErro('Erro ao marcar como lida');
    }
  }, [marcarComoLida, toastErro]);

  const handleMarcarTodas = useCallback(async () => {
    try {
      await marcarTodasComoLidas();
      sucesso('Todas as notificações marcadas como lidas');
    } catch {
      toastErro('Erro ao marcar todas');
    }
  }, [marcarTodasComoLidas, sucesso, toastErro]);

  const handleExcluir = useCallback(async (notificacaoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await excluir(notificacaoId);
    } catch {
      toastErro('Erro ao excluir');
    }
  }, [excluir, toastErro]);

  const handleAbrirLink = useCallback((notificacao: Notificacao) => {
    if (notificacao.estabelecimentoId) {
      // TODO: navegar para estabelecimento ou agendamento
    }
    if (!notificacao.lida) {
      handleMarcarComoLida(notificacao.id);
    }
  }, [handleMarcarComoLida]);

  if (carregando && notificacoes.length === 0) {
    return (
      <ToastProvider>
        <Container variante="com-cabecalho" data-testid="notificacoes-container">
          <header className="notificacoes__header">
            <h1>Notificações</h1>
            {naoLidas > 0 && (
              <span className="notificacoes__badge">{naoLidas}</span>
            )}
          </header>
          <div className="notificacoes__carregando" role="status" aria-label="Carregando notificações">
            <Skeleton variante="texto" />
            <Skeleton variante="texto" />
            <Skeleton variante="texto" />
          </div>
        </Container>
      </ToastProvider>
    );
  }

  const notificacoesFiltradas = notificacoes;

  return (
    <ToastProvider>
      <Container variante="com-cabecalho" data-testid="notificacoes-container">
        <header className="notificacoes__header">
          <h1>Notificações</h1>
          <div className="notificacoes__header-actions">
            {naoLidas > 0 && (
              <BotaoPrimario tamanho="pequeno" aoClicar={handleMarcarTodas} data-testid="btn-marcar-todas">
                <Icone nome="check" tamanho={16} /> Marcar todas como lidas
              </BotaoPrimario>
            )}
          </div>
        </header>

        <nav className="notificacoes__filtros" role="tablist" aria-label="Filtrar notificações por tipo">
          <ChipGrupo
            opcoes={TIPOS_FILTRO}
            selecionados={[filtro]}
            aoAlterar={(v) => setFiltro(v[0] as TipoFiltro)}
            multiplo={false}
            variante="filtro"
            className="notificacoes__chip-grupo"
            data-testid="notificacoes-filtros"
          />
        </nav>

        <label className="notificacoes__apenas-nao-lidas">
          <input
            type="checkbox"
            checked={apenasNaoLidas}
            onChange={(e) => setApenasNaoLidas(e.target.checked)}
          />
          <span>Apenas não lidas</span>
        </label>

        {erro && (
          <div className="notificacoes__erro" role="alert">
            <Icone nome="alerta" tamanho={16} /> {erro}
            <Botao tamanho="pequeno" aoClicar={recarregar}>Tentar novamente</Botao>
          </div>
        )}

        <main className="notificacoes__main" role="main">
          {notificacoesFiltradas.length === 0 ? (
            <section className="notificacoes__vazio" role="status" aria-labelledby="vazio-titulo">
              <span className="notificacoes__vazio-icone" aria-hidden="true"><Icone nome="sino" tamanho={48} /></span>
              <h2 id="vazio-titulo">Nenhuma notificação</h2>
              <p>
                {filtro !== 'todas'
                  ? `Nenhuma notificação do tipo "${TIPOS_FILTRO.find(t => t.valor === filtro)?.rotulo}"`
                  : 'Você está em dia!'}
              </p>
            </section>
          ) : (
            <>
              <ul className="notificacoes__lista" role="list" aria-label="Lista de notificações">
                {notificacoesFiltradas.map((notif) => (
                  <li
                    key={notif.id}
                    className={`notificacoes__item ${!notif.lida ? 'notificacoes__item--nao-lida' : ''}`}
                    onClick={() => handleAbrirLink(notif)}
                    data-testid={`notificacao-${notif.id}`}
                  >
                    <div className="notificacoes__item-icone">
                      <span aria-hidden="true">{ICONES_TIPO[notif.tipo] || <Icone nome="sino" tamanho={16} />}</span>
                      {!notif.lida && <span className="notificacoes__item-dot" aria-hidden="true" />}
                    </div>
                    <div className="notificacoes__item-conteudo">
                      <header className="notificacoes__item-header">
                        <strong className="notificacoes__item-titulo">{notif.titulo}</strong>
                        <time className="notificacoes__item-tempo" dateTime={new Date(notif.dataCriacao).toISOString()}>
                          {formatarTempoRelativo(notif.dataCriacao)}
                        </time>
                      </header>
                      <p className="notificacoes__item-texto">{notif.texto}</p>
                      {notif.estabelecimentoId && (
                        <span className="notificacoes__item-estabelecimento">
                          <Icone nome="localizacao" tamanho={14} /> Estabelecimento
                        </span>
                      )}
                    </div>
                    <button
                      className="notificacoes__item-excluir"
                      onClick={(e) => handleExcluir(notif.id, e)}
                      aria-label="Excluir notificação"
                    >
                      <Icone nome="x" tamanho={16} />
                    </button>
                  </li>
                ))}
              </ul>
              {temMais && (
                <div ref={sentinelRef} className="notificacoes__sentinela" aria-hidden="true">
                  {carregando && <span className="notificacoes__carregando-mais">Carregando mais...</span>}
                </div>
              )}
            </>
          )}
        </main>
      </Container>
    </ToastProvider>
  );
};

export default Notificacoes;