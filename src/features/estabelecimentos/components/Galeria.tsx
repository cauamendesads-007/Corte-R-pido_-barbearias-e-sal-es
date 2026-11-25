/**
 * Componente Galeria - Galeria de imagens/vídeos do estabelecimento.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useState, useCallback } from 'react';
import { Icone, Skeleton } from '@/componentes';
import type { ItemGaleria } from '../types';
import './Galeria.css';

interface GaleriaProps {
  /** Itens da galeria */
  itens: ItemGaleria[];
  /** Carregando */
  carregando?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

interface CarrosselItem {
  id: string;
  src: string;
  alt: string;
  legenda?: string;
}

function CarrosselSimples({ itens, className, 'data-testid': testId }: { itens: CarrosselItem[]; className?: string; 'data-testid'?: string }) {
  const [indiceAtual, setIndiceAtual] = useState(0);

  const proximo = useCallback(() => {
    setIndiceAtual((prev) => (prev + 1) % itens.length);
  }, [itens.length]);

  const anterior = useCallback(() => {
    setIndiceAtual((prev) => (prev - 1 + itens.length) % itens.length);
  }, [itens.length]);

  if (!itens.length) return null;

  return (
    <div className={`carrossel-simples ${className || ''}`} data-testid={testId} role="region" aria-label="Carrossel de imagens">
      <div className="carrossel-simples__viewport">
        {itens.map((item, index) => (
          <div
            key={item.id}
            className={`carrossel-simples__slide ${index === indiceAtual ? 'ativo' : ''}`}
            style={{ transform: `translateX(${(index - indiceAtual) * 100}%)` }}
          >
            <img src={item.src} alt={item.alt} loading={index === indiceAtual ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>
      {itens.length > 1 && (
        <>
          <button
            type="button"
            className="carrossel-simples__seta carrossel-simples__seta--anterior"
            onClick={anterior}
            aria-label="Imagem anterior"
            data-testid="carrossel-anterior"
          >
            <Icone nome="setaEsquerda" tamanho={24} />
          </button>
          <button
            type="button"
            className="carrossel-simples__seta carrossel-simples__seta--proximo"
            onClick={proximo}
            aria-label="Próxima imagem"
            data-testid="carrossel-proximo"
          >
            <Icone nome="setaDireita" tamanho={24} />
          </button>
          <div className="carrossel-simples__indicadores" role="tablist" aria-label="Indicadores do carrossel">
            {itens.map((_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={index === indiceAtual}
                aria-label={`Ir para imagem ${index + 1}`}
                className={`carrossel-simples__indicador ${index === indiceAtual ? 'ativo' : ''}`}
                onClick={() => setIndiceAtual(index)}
                data-testid={`carrossel-indicador-${index}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export const Galeria = ({
  itens,
  carregando = false,
  className = '',
  'data-testid': testId,
}: GaleriaProps) => {
  if (carregando) {
    return (
      <div className={`galeria ${className}`} data-testid={testId}>
        <div className="galeria__skeleton" role="status" aria-label="Carregando galeria">
          <div className="galeria__carrossel-skeleton">
            <Skeleton variante="retangular" largura="100%" altura={320} />
          </div>
          <div className="galeria__thumbs-skeleton">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} variante="retangular" largura={80} altura={80} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!itens.length) {
    return (
      <div className={`galeria ${className}`} data-testid={testId}>
        <div className="galeria__vazio" role="status">
          <Icone nome="foto" tamanho={48} />
          <p>Nenhuma imagem na galeria</p>
        </div>
      </div>
    );
  }

  const imagens = itens.filter((item) => item.tipo !== 'video' || !item.tipo);
  const videos = itens.filter((item) => item.tipo === 'video');

  const itensCarrossel = imagens.map((item, index) => ({
    id: item.id || `img-${index}`,
    src: item.src,
    alt: `Imagem ${index + 1} da galeria`,
    legenda: undefined,
  }));

  return (
    <div className={`galeria ${className}`} data-testid={testId}>
      <div className="galeria__carrossel">
        <CarrosselSimples
          itens={itensCarrossel}
          className="galeria__carrossel-inner"
          data-testid="galeria-carrossel"
        />
      </div>

      {(imagens.length > 1 || videos.length > 0) && (
        <div className="galeria__thumbs" role="list" aria-label="Miniaturas da galeria">
          {imagens.map((item, index) => (
            <button
              key={item.id || `thumb-img-${index}`}
              type="button"
              role="listitem"
              className="galeria__thumb"
              data-testid={`galeria-thumb-${index}`}
            >
              <img src={item.src} alt={`Miniatura ${index + 1}`} loading="lazy" />
              {item.tipo === 'video' && (
                <span className="galeria__thumb-video-badge">
                  <Icone nome="video" tamanho={16} />
                </span>
              )}
            </button>
          ))}
          {videos.map((item, index) => (
            <button
              key={item.id || `thumb-vid-${index}`}
              type="button"
              role="listitem"
              className="galeria__thumb galeria__thumb--video"
              data-testid={`galeria-thumb-video-${index}`}
            >
              <img src={item.src} alt={`Vídeo ${index + 1}`} loading="lazy" />
              <span className="galeria__thumb-video-badge">
                <Icone nome="video" tamanho={16} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Galeria;