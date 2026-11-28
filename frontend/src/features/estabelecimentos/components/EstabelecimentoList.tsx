/**
 * Componente EstabelecimentoList - Lista de estabelecimentos com skeleton, empty/error states.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useMemo } from 'react';
import {
  BotaoSecundario,
  Icone,
  Skeleton,
  EmptyState,
  ErrorState,
} from '@/componentes';
import { EstabelecimentoCard, EstabelecimentoCardSkeleton } from './EstabelecimentoCard';
import type { EstabelecimentoComputado, FiltrosBusca } from '../types';
import './EstabelecimentoList.css';

interface EstabelecimentoListProps {
  /** Estabelecimentos computados para exibição */
  estabelecimentos: EstabelecimentoComputado[];
  /** Carregando lista */
  carregando?: boolean;
  /** Erro ao carregar */
  erro?: string | null;
  /** Tem mais itens para carregar (paginação) */
  temMais?: boolean;
  /** Callback para carregar mais */
  aoCarregarMais?: () => void;
  /** Callback ao clicar no card */
  aoClicar?: (estabelecimento: EstabelecimentoComputado) => void;
  /** Callback para seguir */
  aoSeguir?: (estabelecimentoId: string) => void;
  /** Callback para entrar na fila */
  aoEntrarNaFila?: (estabelecimentoId: string) => void;
  /** Indica quais está seguindo */
  seguindoIds?: Set<string>;
  /** Carregando ação de seguir */
  seguindoCarregando?: boolean;
  /** Filtros atuais (para empty state) */
  filtros?: FiltrosBusca;
  /** Variante de visualização */
  variante?: 'grid' | 'lista';
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const SKELETON_COUNT = 4;

/** Componente Skeleton para lista de estabelecimentos */
function EstabelecimentoListSkeleton({ variante = 'grid' }: { variante?: 'grid' | 'lista' }) {
  return (
    <div className="estabelecimento-list__skeleton" role="status" aria-label="Carregando estabelecimentos">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <EstabelecimentoCardSkeleton key={i} variante={variante === 'grid' ? 'marketplace' : 'compacto'} />
      ))}
    </div>
  );
}

export const EstabelecimentoList = ({
  estabelecimentos,
  carregando = false,
  erro = null,
  temMais = false,
  aoCarregarMais,
  aoClicar,
  aoSeguir,
  aoEntrarNaFila,
  seguindoIds = new Set(),
  seguindoCarregando = false,
  filtros,
  variante = 'grid',
  className = '',
  'data-testid': testId,
}: EstabelecimentoListProps) => {
  const temFiltrosAtivos = useMemo(() => {
    if (!filtros) return false;
    return !!(
      filtros.nicho !== 'todos' ||
      filtros.avaliacaoMinima > 0 ||
      filtros.tipoServico ||
      filtros.apenasBemAvaliados ||
      filtros.apenasVagasHoje ||
      (filtros.localizacaoUsuario && (filtros.ordenacao === 'distancia'))
    );
  }, [filtros]);

  const temResultados = estabelecimentos.length > 0;

  // Skeleton com delay de 150-200ms (CSS animation delay)
  if (carregando && !temResultados) {
    return (
      <div className={`estabelecimento-list ${className}`} data-testid={testId}>
        <EstabelecimentoListSkeleton variante={variante} />
      </div>
    );
  }

  // Estado de erro
  if (erro && !temResultados) {
    return (
      <div className={`estabelecimento-list ${className}`} data-testid={testId}>
        <ErrorState
          titulo="Erro ao carregar"
          mensagem={erro}
          aoTentarNovamente={aoCarregarMais}
          icone="alerta"
          className="estabelecimento-list__error"
          data-testid="estabelecimento-list-error"
        />
      </div>
    );
  }

  // Estado vazio
  if (!temResultados) {
    const emptyConfig = temFiltrosAtivos
      ? {
          titulo: 'Nenhum resultado',
          mensagem: 'Nenhum estabelecimento encontrado com os filtros atuais.',
          acao: aoCarregarMais ? { rotulo: 'Limpar filtros', aoClicar: aoCarregarMais } : undefined,
          icone: 'filtro',
        }
      : {
          titulo: 'Nenhum estabelecimento',
          mensagem: 'Nenhum estabelecimento aprovado encontrado na sua região.',
          icone: 'localizacao',
        };

    return (
      <div className={`estabelecimento-list ${className}`} data-testid={testId}>
        <EmptyState
          {...emptyConfig}
          className="estabelecimento-list__empty"
          data-testid="estabelecimento-list-empty"
        />
      </div>
    );
  }

  return (
    <div className={`estabelecimento-list ${className}`} data-testid={testId}>
      <div className={`estabelecimento-list__container estabelecimento-list__container--${variante}`} role="list">
        {estabelecimentos.map((estabelecimentoComputado) => (
          <EstabelecimentoCard
            key={estabelecimentoComputado.estabelecimento.id}
            estabelecimento={estabelecimentoComputado}
            variante={variante === 'grid' ? 'marketplace' : 'lista'}
            aoClicar={() => aoClicar?.(estabelecimentoComputado)}
            aoSeguir={aoSeguir}
            aoEntrarNaFila={aoEntrarNaFila}
            mostrarSeguir={true}
            mostrarFila={variante === 'grid'}
            seguindo={seguindoIds.has(estabelecimentoComputado.estabelecimento.id)}
            seguindoCarregando={seguindoCarregando}
            data-testid={`estabelecimento-card-${estabelecimentoComputado.estabelecimento.id}`}
          />
        ))}
      </div>

      {/* Botão carregar mais */}
      {temMais && aoCarregarMais && !carregando && (
        <div className="estabelecimento-list__carregar-mais">
          <BotaoSecundario
            aoClicar={aoCarregarMais}
            iconeEsquerda={<Icone nome="setaBaixo" tamanho={16} />}
            data-testid="estabelecimento-list-carregar-mais"
          >
            Carregar mais
          </BotaoSecundario>
        </div>
      )}

      {/* Indicador de carregamento mais */}
      {carregando && temResultados && (
        <div className="estabelecimento-list__carregando-mais" role="status" aria-label="Carregando mais estabelecimentos">
          <Skeleton variante="circular" largura={24} altura={24} className="animar-giro" />
          <span>Carregando mais...</span>
        </div>
      )}
    </div>
  );
};

export default EstabelecimentoList;