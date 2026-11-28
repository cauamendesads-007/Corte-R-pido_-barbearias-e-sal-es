/**
 * Componente Comentarios - Lista de comentários reutilizável.
 * Puro, coeso, < 150 linhas, skeleton loading, empty state.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Avatar,
  BotaoPrimario,
  Icone,
  Skeleton,
  EmptyState,
  Textarea,
} from '@/componentes';
import type { Comentario } from '../types';
import { calcularTempoRelativo } from '../rules';
import './Comentarios.css';

interface ComentariosProps {
  /** Lista de comentários */
  comentarios: Comentario[];
  /** Próxima página */
  proximaPagina: number | null;
  /** Carregando */
  carregando?: boolean;
  /** Carregando mais */
  carregandoMais?: boolean;
  /** Enviando novo comentário */
  enviando?: boolean;
  /** Callback ao enviar comentário */
  aoEnviar?: (texto: string) => void;
  /** Callback para carregar mais */
  aoCarregarMais?: () => void;
  /** Placeholder do campo */
  placeholder?: string;
  /** Max length */
  maxLength?: number;
  /** Mostra formulário de novo comentário */
  mostrarFormulario?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const Comentarios = ({
  comentarios,
  proximaPagina,
  carregando = false,
  carregandoMais = false,
  enviando = false,
  aoEnviar,
  aoCarregarMais,
  placeholder = 'Escreva um comentário...',
  maxLength = 1000,
  mostrarFormulario = true,
  className = '',
  'data-testid': testId,
}: ComentariosProps) => {
  const [texto, setTexto] = useState('');
  const observerRef = useRef<HTMLDivElement>(null);

  // Scroll infinito
  useEffect(() => {
    if (carregandoMais || !proximaPagina || !aoCarregarMais) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          aoCarregarMais();
        }
      },
      { rootMargin: '100px', threshold: 0 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [carregandoMais, proximaPagina, aoCarregarMais]);

  const handleEnviar = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    aoEnviar?.(texto.trim());
    setTexto('');
  }, [texto, enviando, aoEnviar]);

  if (carregando && !comentarios.length) {
    return (
      <div className={`comentarios ${className}`} data-testid={testId} role="list" aria-label="Comentários">
        <div className="comentarios__skeleton" role="status" aria-label="Carregando comentários">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="comentarios__item-skeleton">
              <Skeleton variante="circular" largura={40} altura={40} />
              <div>
                <Skeleton variante="retangular" largura="60%" altura={16} />
                <Skeleton variante="retangular" largura="80%" altura={40} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`comentarios ${className}`} data-testid={testId} role="list" aria-label="Comentários">
      {/* Formulário */}
      {mostrarFormulario && aoEnviar && (
        <form className="comentarios__formulario" onSubmit={handleEnviar} data-testid="comentarios-formulario">
          <Avatar src="" alt="Você" tamanho="grande" nome="Você" className="comentarios__avatar" />
          <div className="comentarios__campo-wrapper">
            <Textarea
              label=""
              valor={texto}
              aoAlterar={setTexto}
              placeholder={placeholder}
              linhas={2}
              maxLength={maxLength}
              mostrarContador
              data-testid="comentarios-texto"
            />
            <div className="comentarios__form-acoes">
              <BotaoPrimario
                tipo="submit"
                tamanho="pequeno"
                iconeEsquerda={<Icone nome="setaDireita" tamanho={14} />}
                desabilitado={!texto.trim() || enviando}
                carregando={enviando}
                data-testid="comentarios-enviar"
              >
                Comentar
              </BotaoPrimario>
            </div>
          </div>
        </form>
      )}

      {/* Lista */}
      <div className="comentarios__lista">
        {comentarios.length === 0 ? (
          <EmptyState
            titulo="Nenhum comentário"
            mensagem="Seja o primeiro a comentar!"
            icone="mensagem"
            className="comentarios__empty"
            data-testid="comentarios-vazio"
          />
        ) : (
          <>
            {comentarios.map((comentario) => (
              <article
                key={comentario.id}
                className="comentarios__item"
                role="listitem"
                data-testid={`comentario-${comentario.id}`}
              >
                <Avatar
                  src={comentario.autorAvatar}
                  alt={comentario.autorNome}
                  tamanho="grande"
                  nome={comentario.autorNome}
                  className="comentarios__item-avatar"
                />
                <div className="comentarios__item-conteudo">
                  <header className="comentarios__item-header">
                    <strong className="comentarios__item-autor">{comentario.autorNome}</strong>
                    <time className="comentarios__item-tempo" dateTime={new Date(comentario.criadoEm).toISOString()}>
                      {calcularTempoRelativo(comentario.criadoEm)}
                    </time>
                  </header>
                  <p className="comentarios__item-texto">{comentario.texto}</p>
                </div>
              </article>
            ))}

            {/* Sentinela */}
            <div ref={observerRef} className="comentarios__sentinela" aria-hidden="true">
              {carregandoMais && (
                <div className="comentarios__carregando-mais" role="status">
                  <Icone nome="carregando" tamanho={16} className="animar-giro" />
                  <span>Carregando mais...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Comentarios;