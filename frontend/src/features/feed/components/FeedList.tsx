/**
 * Componente FeedList - Lista de publicações do feed principal.
 * Puro, coeso, < 150 linhas, skeleton loading 150-200ms, empty/error states.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  BotaoSecundario,
  BotaoFantasma,
  Icone,
  Skeleton,
  EmptyState,
  Chip,
} from '@/componentes';
import { PublicacaoCard } from './PublicacaoCard';
import type { Publicacao, FeedFiltros, FeedOrdenacao } from '../types';
import type { NomeIcone } from '@/componentes/ui/Icone';
import './FeedList.css';

interface FeedListProps {
  /** Lista de publicações */
  publicacoes: Publicacao[];
  /** Próxima página disponível */
  proximaPagina: number | null;
  /** Carregando inicial */
  carregando?: boolean;
  /** Carregando mais */
  carregandoMais?: boolean;
  /** Erro */
  erro?: string | null;
  /** Filtros ativos */
  filtros?: FeedFiltros;
  /** Ordenação ativa */
  ordenacao?: FeedOrdenacao;
  /** Callback para carregar mais */
  aoCarregarMais?: () => void;
  /** Callback para atualizar filtros */
  aoAtualizarFiltros?: (filtros: Partial<FeedFiltros>) => void;
  /** Callback para atualizar ordenação */
  aoAtualizarOrdenacao?: (ordenacao: FeedOrdenacao) => void;
  /** Callback ao curtir */
  aoCurtir?: (id: string) => void;
  /** Callback ao salvar */
  aoSalvar?: (id: string) => void;
  /** Callback ao comentar */
  aoComentar?: (id: string) => void;
  /** Callback ao compartilhar */
  aoCompartilhar?: (id: string) => void;
  /** Callback ao denunciar */
  aoDenunciar?: (id: string, motivo: string) => void;
  /** Callback ao clicar autor */
  aoClicarAutor?: (autorId: string) => void;
  /** Mostra ações de moderação */
  mostrarModeracao?: boolean;
  /** Callback para editar */
  aoEditar?: (publicacao: Publicacao) => void;
  /** Callback para excluir */
  aoExcluir?: (id: string) => void;
  /** Carregando ações */
  carregandoAcoes?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const ORDENACAO_OPCOES: { valor: FeedOrdenacao; rotulo: string; icone: NomeIcone }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes', icone: 'relogio' },
  { valor: 'populares', rotulo: 'Mais populares', icone: 'grafico' },
  { valor: 'relevantes', rotulo: 'Mais relevantes', icone: 'estrela' },
];

const TIPO_OPCOES: { valor: Publicacao['tipo']; rotulo: string }[] = [
  { valor: 'corte', rotulo: 'Cortes' },
  { valor: 'barba', rotulo: 'Barbas' },
  { valor: 'combo', rotulo: 'Combos' },
  { valor: 'inspiracao', rotulo: 'Inspirações' },
  { valor: 'dica', rotulo: 'Dicas' },
  { valor: 'outro', rotulo: 'Outros' },
];

export const FeedList = ({
  publicacoes,
  proximaPagina,
  carregando = false,
  carregandoMais = false,
  erro = null,
  filtros,
  ordenacao = 'recentes',
  aoCarregarMais,
  aoAtualizarFiltros,
  aoAtualizarOrdenacao,
  aoCurtir,
  aoSalvar,
  aoComentar,
  aoCompartilhar,
  aoDenunciar,
  aoClicarAutor,
  mostrarModeracao = false,
  aoEditar,
  aoExcluir,
  carregandoAcoes = false,
  className = '',
  'data-testid': testId,
}: FeedListProps) => {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarOrdenacao, setMostrarOrdenacao] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelaRef = useRef<HTMLDivElement>(null);
  const filtrosRef = useRef<HTMLDivElement>(null);
  const ordenacaoRef = useRef<HTMLDivElement>(null);

  // Intersection Observer para scroll infinito
  useEffect(() => {
    if (carregandoMais || !proximaPagina || !aoCarregarMais) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          aoCarregarMais();
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );

    if (sentinelaRef.current) {
      observerRef.current.observe(sentinelaRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [carregandoMais, proximaPagina, aoCarregarMais]);

  // Click outside para fechar dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mostrarFiltros && filtrosRef.current && !filtrosRef.current.contains(e.target as Node)) {
        setMostrarFiltros(false);
      }
      if (mostrarOrdenacao && ordenacaoRef.current && !ordenacaoRef.current.contains(e.target as Node)) {
        setMostrarOrdenacao(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mostrarFiltros, mostrarOrdenacao]);

  if (carregando && !publicacoes.length) {
    return (
      <div className={`feed-list ${className}`} data-testid={testId} role="feed" aria-label="Feed de publicações">
        <div className="feed-list__skeleton" role="status" aria-label="Carregando feed">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="feed-list__item-skeleton">
              <Skeleton variante="circular" largura={36} altura={36} />
              <div className="feed-list__skeleton-autor">
                <Skeleton variante="retangular" largura="120px" altura={16} />
                <Skeleton variante="retangular" largura="80px" altura={12} />
              </div>
              <Skeleton variante="retangular" largura="100%" altura={60} />
              <Skeleton variante="retangular" largura="100%" altura={200} />
              <div className="feed-list__skeleton-acoes">
                <Skeleton variante="retangular" largura={80} altura={44} />
                <Skeleton variante="retangular" largura={80} altura={44} />
                <Skeleton variante="retangular" largura={80} altura={44} />
                <Skeleton variante="retangular" largura={44} altura={44} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (erro && !publicacoes.length) {
    return (
      <div className={`feed-list ${className}`} data-testid={testId}>
        <EmptyState
          titulo="Erro ao carregar feed"
          mensagem={erro}
          icone="alerta"
          acao={{ rotulo: 'Tentar novamente', aoClicar: aoCarregarMais || (() => {}) }}
          className="feed-list__empty"
          data-testid="feed-list-erro"
        />
      </div>
    );
  }

  if (!publicacoes.length) {
    return (
      <div className={`feed-list ${className}`} data-testid={testId}>
        <EmptyState
          titulo="Nenhuma publicação"
          mensagem={filtros?.busca ? 'Nenhum resultado para sua busca.' : 'Seja o primeiro a postar!'}
          icone="foto"
          acao={{ rotulo: 'Criar publicação', aoClicar: () => {} }}
          className="feed-list__empty"
          data-testid="feed-list-vazio"
        />
      </div>
    );
  }

  const handleFiltrarTipo = useCallback((tipo: Publicacao['tipo'] | undefined) => {
    aoAtualizarFiltros?.({ tipo });
    setMostrarFiltros(false);
  }, [aoAtualizarFiltros]);

  const handleLimparFiltros = useCallback(() => {
    aoAtualizarFiltros?.({ tipo: undefined, busca: undefined, salvos: false, seguidos: false });
    setMostrarFiltros(false);
  }, [aoAtualizarFiltros]);

  const temFiltrosAtivos = filtros?.tipo || filtros?.busca || filtros?.salvos || filtros?.seguidos;

  // Build filter dropdown items
  interface FiltroItem {
    rotulo: string;
    icone?: NomeIcone;
    aoClicar?: () => void;
    ativo?: boolean;
    divisor?: boolean;
    desabilitado?: boolean;
    variante?: string;
  }

  const filtroItems: FiltroItem[] = [
    { rotulo: 'Ordenação', desabilitado: true },
    ...ORDENACAO_OPCOES.map((op) => ({
      rotulo: op.rotulo,
      icone: op.icone,
      aoClicar: () => aoAtualizarOrdenacao?.(op.valor),
      ativo: ordenacao === op.valor,
    })),
    { divisor: true },
    { rotulo: 'Filtrar por tipo', desabilitado: true },
    ...TIPO_OPCOES.map((op) => ({
      rotulo: op.rotulo,
      aoClicar: () => handleFiltrarTipo(op.valor),
      ativo: filtros?.tipo === op.valor,
    })),
    { divisor: true },
    { rotulo: 'Apenas salvos', aoClicar: () => aoAtualizarFiltros?.({ salvos: !filtros?.salvos }), ativo: filtros?.salvos },
    { rotulo: 'Apenas seguidos', aoClicar: () => aoAtualizarFiltros?.({ seguidos: !filtros?.seguidos }), ativo: filtros?.seguidos },
    { divisor: true },
    temFiltrosAtivos && { rotulo: 'Limpar filtros', icone: 'x', aoClicar: handleLimparFiltros, variante: 'perigo' },
  ].filter(Boolean) as FiltroItem[];

  return (
    <div className={`feed-list ${className}`} data-testid={testId} role="feed" aria-label="Feed de publicações">
      {/* Barra de ferramentas */}
      <div className="feed-list__toolbar">
        <div className="feed-list__filtros" ref={filtrosRef}>
          <BotaoSecundario
            tamanho="pequeno"
            iconeEsquerda={<Icone nome="filtro" tamanho={16} />}
            aoClicar={() => setMostrarFiltros(!mostrarFiltros)}
            data-testid="feed-filtros-btn"
          >
            Filtros {temFiltrosAtivos && <Chip variante="selecao">Ativo</Chip>}
          </BotaoSecundario>
          {mostrarFiltros && (
            <div className="feed-list__dropdown" role="menu">
              {filtroItems.map((item, idx) => (
                item.divisor ? (
                  <hr key={`div-${idx}`} className="feed-list__dropdown-divisor" />
                ) : item.desabilitado ? (
                  <span key={idx} className="feed-list__dropdown-header">{item.rotulo}</span>
                ) : (
                  <button
                    key={idx}
                    role="menuitem"
                    className={`feed-list__dropdown-item ${item.ativo ? 'feed-list__dropdown-item--ativo' : ''} ${item.variante === 'perigo' ? 'feed-list__dropdown-item--perigo' : ''}`}
                    onClick={item.aoClicar}
                    data-testid={`feed-filtro-${idx}`}
                  >
                    {item.icone && <Icone nome={item.icone} tamanho={14} />}
                    {item.rotulo}
                  </button>
                )
              ))}
            </div>
          )}
        </div>

        <div className="feed-list__ordenacao" ref={ordenacaoRef}>
          <span className="feed-list__ordenacao-label">Ordenar por:</span>
          <BotaoFantasma
            tamanho="pequeno"
            iconeDireita={<Icone nome="setaBaixo" tamanho={14} />}
            aoClicar={() => setMostrarOrdenacao(!mostrarOrdenacao)}
            data-testid="feed-ordenacao-btn"
          >
            {ORDENACAO_OPCOES.find((o) => o.valor === ordenacao)?.rotulo}
          </BotaoFantasma>
          {mostrarOrdenacao && (
            <div className="feed-list__dropdown" role="menu">
              {ORDENACAO_OPCOES.map((op) => (
                <button
                  key={op.valor}
                  role="menuitem"
                  className={`feed-list__dropdown-item ${ordenacao === op.valor ? 'feed-list__dropdown-item--ativo' : ''}`}
                  onClick={() => { aoAtualizarOrdenacao?.(op.valor); setMostrarOrdenacao(false); }}
                  data-testid={`feed-ordenacao-${op.valor}`}
                >
                  <Icone nome={op.icone} tamanho={14} />
                  {op.rotulo}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista de publicações */}
      <div className="feed-list__lista">
        {publicacoes.map((publicacao) => (
          <div key={publicacao.id} className="feed-list__item" data-testid={`feed-item-${publicacao.id}`}>
            <PublicacaoCard
              publicacao={publicacao}
              aoCurtir={aoCurtir}
              aoSalvar={aoSalvar}
              aoComentar={aoComentar}
              aoCompartilhar={aoCompartilhar}
              aoDenunciar={(id) => aoDenunciar?.(id, 'Conteúdo inadequado')}
              aoClicarAutor={aoClicarAutor}
              mostrarModeracao={mostrarModeracao}
              aoEditar={aoEditar}
              aoExcluir={aoExcluir}
              carregandoAcoes={carregandoAcoes}
              data-testid={`publicacao-card-${publicacao.id}`}
            />
          </div>
        ))}

        {/* Sentinela para scroll infinito */}
        <div ref={sentinelaRef} className="feed-list__sentinela" aria-hidden="true">
          {carregandoMais && (
            <div className="feed-list__carregando-mais" role="status" aria-label="Carregando mais publicações">
              <Icone nome="carregando" tamanho={20} className="animar-giro" />
              <span>Carregando mais...</span>
            </div>
          )}
          {proximaPagina === null && publicacoes.length > 0 && !carregandoMais && (
            <p className="feed-list__fim">Fim do feed</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedList;