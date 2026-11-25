/**
 * Componente ServicosList - Lista de serviços do estabelecimento.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import {
  BotaoPrimario,
  Icone,
  Skeleton,
  EmptyState,
  Chip,
} from '@/componentes';
import type { Servico } from '../types';
import './ServicosList.css';

interface ServicosListProps {
  /** Lista de serviços */
  servicos: Servico[];
  /** Callback ao agendar */
  aoAgendar?: (servico: Servico) => void;
  /** Carregando */
  carregando?: boolean;
  /** Variante de exibição */
  variante?: 'cards' | 'lista' | 'grade';
  /** Mostra botão de agendar */
  mostrarAgendar?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const ServicosList = ({
  servicos,
  aoAgendar,
  carregando = false,
  variante = 'cards',
  mostrarAgendar = true,
  className = '',
  'data-testid': testId,
}: ServicosListProps) => {

  if (carregando) {
    return (
      <div className={`servicos-list ${className}`} data-testid={testId}>
        <div className="servicos-list__skeleton" role="status" aria-label="Carregando serviços">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className={`servicos-list__item-skeleton servicos-list__item-skeleton--${variante}`}>
              {variante !== 'lista' && <Skeleton variante="retangular" largura="100%" altura={120} />}
              <Skeleton variante="retangular" largura="60%" altura={20} />
              <Skeleton variante="retangular" largura="40%" altura={14} />
              <Skeleton variante="retangular" largura="100px" altura={24} />
              {mostrarAgendar && <Skeleton variante="retangular" largura="140px" altura={44} />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!servicos.length) {
    return (
      <div className={`servicos-list ${className}`} data-testid={testId}>
        <EmptyState
          titulo="Nenhum serviço"
          mensagem="Este estabelecimento ainda não cadastrou serviços."
          icone="tesoura"
          className="servicos-list__empty"
          data-testid="servicos-list-empty"
        />
      </div>
    );
  }

  const handleAgendar = (servico: Servico) => {
    aoAgendar?.(servico);
  };

  if (variante === 'lista') {
    return (
      <div className={`servicos-list servicos-list--lista ${className}`} data-testid={testId} role="list">
        {servicos.map((servico) => (
          <article
            key={servico.id}
            className="servicos-list__item servicos-list__item--lista"
            role="listitem"
            data-testid={`servico-${servico.id}`}
          >
            {servico.midias && servico.midias.length > 0 && servico.midias[0].src && (
              <img
                src={servico.midias[0].src}
                alt={servico.nome}
                className="servicos-list__img"
                loading="lazy"
              />
            )}
            <div className="servicos-list__info">
              <div className="servicos-list__header">
                <h3 className="servicos-list__nome">{servico.nome}</h3>
                <Chip variante="padrao">{servico.tag}</Chip>
              </div>
              <p className="servicos-list__descricao">
                {servico.duracaoMinutos} min
              </p>
            </div>
            <div className="servicos-list__preco">
              <strong className="servicos-list__valor">
                R$ {servico.preco.toFixed(2).replace('.', ',')}
              </strong>
              {mostrarAgendar && aoAgendar && (
                <BotaoPrimario
                  tamanho="pequeno"
                  aoClicar={() => handleAgendar(servico)}
                  iconeEsquerda={<Icone nome="calendario" tamanho={14} />}
                  data-testid={`servico-agendar-${servico.id}`}
                >
                  Agendar
                </BotaoPrimario>
              )}
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (variante === 'grade') {
    return (
      <div className={`servicos-list servicos-list--grade ${className}`} data-testid={testId} role="list">
        {servicos.map((servico) => (
          <article
            key={servico.id}
            className="servicos-list__item servicos-list__item--grade"
            role="listitem"
            data-testid={`servico-${servico.id}`}
          >
            {servico.midias && servico.midias.length > 0 && servico.midias[0].src && (
              <img
                src={servico.midias[0].src}
                alt={servico.nome}
                className="servicos-list__img"
                loading="lazy"
              />
            )}
            <div className="servicos-list__info">
              <div className="servicos-list__header">
                <h3 className="servicos-list__nome">{servico.nome}</h3>
                <Chip variante="padrao">{servico.tag}</Chip>
              </div>
              <p className="servicos-list__descricao">
                {servico.duracaoMinutos} min
              </p>
            </div>
            <div className="servicos-list__preco">
              <strong className="servicos-list__valor">
                R$ {servico.preco.toFixed(2).replace('.', ',')}
              </strong>
              {mostrarAgendar && aoAgendar && (
                <BotaoPrimario
                  tamanho="pequeno"
                  aoClicar={() => handleAgendar(servico)}
                  iconeEsquerda={<Icone nome="calendario" tamanho={14} />}
                  className="servicos-list__btn-agendar"
                  data-testid={`servico-agendar-${servico.id}`}
                >
                  Agendar
                </BotaoPrimario>
              )}
            </div>
          </article>
        ))}
      </div>
    );
  }

  // Variante cards (padrão)
  return (
    <div className={`servicos-list servicos-list--cards ${className}`} data-testid={testId} role="list">
      {servicos.map((servico) => (
        <article
          key={servico.id}
          className="servicos-list__item servicos-list__item--cards"
          role="listitem"
          data-testid={`servico-${servico.id}`}
        >
          <div className="servicos-list__midia">
            {servico.midias && servico.midias.length > 0 && servico.midias[0].src ? (
              <img
                src={servico.midias[0].src}
                alt={servico.nome}
                className="servicos-list__img"
                loading="lazy"
              />
            ) : (
              <div className="servicos-list__placeholder">
                <Icone nome="tesoura" tamanho={32} />
              </div>
            )}
            <div className="servicos-list__tags">
              <Chip variante="padrao">{servico.tag}</Chip>
              <span className="servicos-list__duracao">
                <Icone nome="relogio" tamanho={12} /> {servico.duracaoMinutos} min
              </span>
            </div>
          </div>
          <div className="servicos-list__info">
            <h3 className="servicos-list__nome">{servico.nome}</h3>
            <div className="servicos-list__preco">
              <strong className="servicos-list__valor">
                R$ {servico.preco.toFixed(2).replace('.', ',')}
              </strong>
              {mostrarAgendar && aoAgendar && (
                <BotaoPrimario
                  tamanho="pequeno"
                  aoClicar={() => handleAgendar(servico)}
                  iconeEsquerda={<Icone nome="calendario" tamanho={14} />}
                  className="servicos-list__btn-agendar"
                  data-testid={`servico-agendar-${servico.id}`}
                >
                  Agendar
                </BotaoPrimario>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default ServicosList;