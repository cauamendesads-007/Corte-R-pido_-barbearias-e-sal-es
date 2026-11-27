/**
 * Componente Avaliacoes - Lista de avaliações do estabelecimento.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useMemo } from 'react';
import {
  BotaoSecundario,
  Icone,
  Skeleton,
  EmptyState,
  Chip,
} from '@/componentes';
import type { Avaliacao } from '../types';
import './Avaliacoes.css';

interface AvaliacoesProps {
  /** Lista de avaliações */
  avaliacoes: Avaliacao[];
  /** Média geral */
  media: number;
  /** Total de avaliações */
  total: number;
  /** Callback para abrir modal de avaliação */
  aoAvaliar?: () => void;
  /** Carregando */
  carregando?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const ESTRELAS = [5, 4, 3, 2, 1] as const;

export const Avaliacoes = ({
  avaliacoes,
  media,
  total,
  aoAvaliar,
  carregando = false,
  className = '',
  'data-testid': testId,
}: AvaliacoesProps) => {
  const distribuicao = useMemo(() => {
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    avaliacoes.forEach((a) => {
      if (a.estrelas >= 1 && a.estrelas <= 5) {
        dist[a.estrelas] = (dist[a.estrelas] || 0) + 1;
      }
    });
    return dist;
  }, [avaliacoes]);

  const porcentagem = (nota: number) => (total > 0 ? (distribuicao[nota] / total) * 100 : 0);

  if (carregando) {
    return (
      <div className={`avaliacoes ${className}`} data-testid={testId}>
        <div className="avaliacoes__skeleton" role="status" aria-label="Carregando avaliações">
          <div className="avaliacoes__resumo-skeleton">
            <Skeleton variante="retangular" largura="80px" altura={80} />
            <div className="avaliacoes__barras-skeleton">
              {ESTRELAS.map((n) => (
                <div key={n} className="avaliacoes__barra-skeleton">
                  <Skeleton variante="retangular" largura="30px" altura={16} />
                  <Skeleton variante="retangular" largura="100%" altura={8} />
                  <Skeleton variante="retangular" largura="40px" altura={16} />
                </div>
              ))}
            </div>
          </div>
          <div className="avaliacoes__lista-skeleton">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="avaliacoes__item-skeleton">
                <Skeleton variante="circular" largura={40} altura={40} />
                <div>
                  <Skeleton variante="retangular" largura="60%" altura={16} />
                  <Skeleton variante="retangular" largura="100px" altura={12} />
                  <Skeleton variante="retangular" largura="80%" altura={14} />
                  <Skeleton variante="retangular" largura="60%" altura={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`avaliacoes ${className}`} data-testid={testId}>
      {/* Resumo */}
      <div className="avaliacoes__resumo">
        <div className="avaliacoes__media">
          <span className="avaliacoes__media-valor">{media.toFixed(1)}</span>
          <div className="avaliacoes__media-estrelas">
            {ESTRELAS.map((n) => (
              <Icone key={n} nome={n <= Math.round(media) ? 'estrela' : 'estrelaVazia'} tamanho={18} />
            ))}
          </div>
          <span className="avaliacoes__media-total">{total} avalia{total !== 1 ? 'ções' : 'ção'}</span>
        </div>
        <div className="avaliacoes__barras" role="img" aria-label={`Distribuição de notas: ${ESTRELAS.map(n => `${n} estrelas: ${porcentagem(n).toFixed(0)}%`).join(', ')}`}>
          {ESTRELAS.map((n) => (
            <div key={n} className="avaliacoes__barra">
              <span className="avaliacoes__barra-nota">{n} <Icone nome="estrela" tamanho={12} /></span>
              <div className="avaliacoes__barra-container">
                <div
                  className="avaliacoes__barra-preenchimento"
                  style={{ width: `${porcentagem(n)}%` }}
                  role="progressbar"
                  aria-valuenow={Math.round(porcentagem(n))}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${n} estrelas: ${porcentagem(n).toFixed(0)}%`}
                />
              </div>
              <span className="avaliacoes__barra-porcentagem">{porcentagem(n).toFixed(0)}%</span>
            </div>
          ))}
        </div>
        {aoAvaliar && (
          <BotaoSecundario
            aoClicar={aoAvaliar}
            iconeEsquerda={<Icone nome="estrela" tamanho={16} />}
            className="avaliacoes__btn-avaliar"
            data-testid="avaliacoes-btn-avaliar"
          >
            Avaliar
          </BotaoSecundario>
        )}
      </div>

      {/* Lista */}
      <div className="avaliacoes__lista" role="list" aria-label="Avaliações dos clientes">
        {avaliacoes.length === 0 ? (
          <EmptyState
            titulo="Nenhuma avaliação"
            mensagem="Seja o primeiro a avaliar este estabelecimento."
            icone="estrela"
            className="avaliacoes__empty"
            data-testid="avaliacoes-empty"
          />
        ) : (
          avaliacoes.map((avaliacao) => (
            <article key={avaliacao.id} className="avaliacoes__item" role="listitem" data-testid={`avaliacao-${avaliacao.id}`}>
              <div className="avaliacoes__item-header">
                <div className="avaliacoes__item-avatar">
                  {avaliacao.nomeCliente.charAt(0).toUpperCase()}
                </div>
                <div className="avaliacoes__item-info">
                  <div className="avaliacoes__item-nome-linha">
                    <strong className="avaliacoes__item-nome">{avaliacao.nomeCliente}</strong>
                    <Chip variante={avaliacao.resposta ? 'status' : 'padrao'}>
                      {avaliacao.resposta ? 'Respondida' : 'Pendente'}
                    </Chip>
                  </div>
                  <div className="avaliacoes__item-meta">
                    <span className="avaliacoes__item-estrelas">
                      {ESTRELAS.map((n) => (
                        <Icone key={n} nome={n <= avaliacao.estrelas ? 'estrela' : 'estrelaVazia'} tamanho={14} />
                      ))}
                    </span>
                    <time className="avaliacoes__item-data" dateTime={avaliacao.data}>
                      {avaliacao.data}
                    </time>
                  </div>
                </div>
              </div>
              <p className="avaliacoes__item-comentario">{avaliacao.comentario || 'Sem comentário.'}</p>
              {avaliacao.resposta && (
                <div className="avaliacoes__item-resposta">
                  <div className="avaliacoes__item-resposta-header">
                    <Icone nome="mensagem" tamanho={14} />
                    <span className="avaliacoes__item-resposta-label">Resposta do estabelecimento</span>
                  </div>
                  <p className="avaliacoes__item-resposta-texto">{avaliacao.resposta}</p>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default Avaliacoes;