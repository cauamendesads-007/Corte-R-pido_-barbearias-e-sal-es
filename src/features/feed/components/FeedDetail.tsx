/**
 * Componente FeedDetail - Página de detalhes da publicação.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  BotaoPrimario,
  BotaoSecundario,
  BotaoPerigo,
  BotaoIcone,
  Icone,
  Avatar,
  Skeleton,
  EmptyState,
  Modal,
  Textarea,
  ToastProvider,
  useGlobalToast,
} from '@/componentes';
import type { Publicacao, Comentario } from '../types';
import { calcularTempoRelativo } from '../rules';
import type { NomeIcone } from '@/componentes/ui/Icone';
import './FeedDetail.css';

// Mapa de ícones por tipo de publicação
const ICONES_TIPO_PUBLICACAO: Record<Publicacao['tipo'], NomeIcone> = {
  corte: 'tesoura',
  barba: 'tesoura',
  combo: 'grade',
  inspiracao: 'estrela',
  dica: 'info',
  outro: 'foto',
};

interface FeedDetailProps {
  /** Publicação principal */
  publicacao: Publicacao | null;
  /** Comentários */
  comentarios: Comentario[];
  /** Próxima página de comentários */
  proximaPaginaComentarios: number | null;
  /** Carregando publicação */
  carregando?: boolean;
  /** Carregando comentários */
  carregandoComentarios?: boolean;
  /** Enviando comentário */
  enviandoComentario?: boolean;
  /** Erro */
  erro?: string | null;
  /** Callbacks */
  aoCurtir?: () => void;
  aoSalvar?: () => void;
  aoComentar?: (texto: string) => void;
  aoCarregarMaisComentarios?: () => void;
  aoDenunciar?: (motivo: string) => void;
  aoCompartilhar?: () => Promise<string | null>;
  aoClicarAutor?: (autorId: string) => void;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const FeedDetail = ({
  publicacao,
  comentarios,
  proximaPaginaComentarios,
  carregando = false,
  carregandoComentarios = false,
  enviandoComentario = false,
  aoCurtir,
  aoSalvar,
  aoComentar,
  aoCarregarMaisComentarios,
  aoDenunciar,
  aoCompartilhar,
  aoClicarAutor,
  className = '',
  'data-testid': testId,
}: FeedDetailProps) => {
  const { sucesso } = useGlobalToast();
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [mostrarModalCompartilhar, setMostrarModalCompartilhar] = useState(false);
  const [linkCompartilhado, setLinkCompartilhado] = useState('');
  const [mostrarModalDenuncia, setMostrarModalDenuncia] = useState(false);
  const [motivoDenuncia, setMotivoDenuncia] = useState('');
  const observerRef = useRef<HTMLDivElement>(null);

  // Scroll infinito para comentários
  useEffect(() => {
    if (carregandoComentarios || !proximaPaginaComentarios || !aoCarregarMaisComentarios) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          aoCarregarMaisComentarios();
        }
      },
      { rootMargin: '100px', threshold: 0 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [carregandoComentarios, proximaPaginaComentarios, aoCarregarMaisComentarios]);

  if (!publicacao || carregando) {
    return (
      <div className={`feed-detail ${className}`} data-testid={testId}>
        <div className="feed-detail__skeleton" role="status" aria-label="Carregando publicação">
          <div className="feed-detail__header-skeleton">
            <Skeleton variante="circular" largura={48} altura={48} />
            <div>
              <Skeleton variante="retangular" largura="150px" altura={20} />
              <Skeleton variante="retangular" largura="100px" altura={14} />
            </div>
          </div>
          <Skeleton variante="retangular" largura="100%" altura={200} />
          <Skeleton variante="retangular" largura="100%" altura={60} />
          <div className="feed-detail__acoes-skeleton">
            <Skeleton variante="retangular" largura={100} altura={48} />
            <Skeleton variante="retangular" largura={100} altura={48} />
            <Skeleton variante="retangular" largura={100} altura={48} />
            <Skeleton variante="retangular" largura={48} altura={48} />
          </div>
          <div className="feed-detail__comentarios-skeleton">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="feed-detail__comentario-skeleton">
                <Skeleton variante="circular" largura={40} altura={40} />
                <div>
                  <Skeleton variante="retangular" largura="80%" altura={16} />
                  <Skeleton variante="retangular" largura="100%" altura={40} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tempoRelativo = calcularTempoRelativo(publicacao.criadoEm);

  const handleEnviarComentario = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentarioTexto.trim() || enviandoComentario) return;
    await aoComentar?.(comentarioTexto.trim());
    setComentarioTexto('');
  }, [comentarioTexto, enviandoComentario, aoComentar]);

  const handleCompartilhar = useCallback(async () => {
    const link = await aoCompartilhar?.();
    if (link) {
      setLinkCompartilhado(link);
      setMostrarModalCompartilhar(true);
    }
  }, [aoCompartilhar]);

  const handleCopiarLink = useCallback(() => {
    navigator.clipboard.writeText(linkCompartilhado);
    sucesso('Link copiado!');
    setMostrarModalCompartilhar(false);
  }, [linkCompartilhado, sucesso]);

  const handleDenunciar = useCallback(() => {
    if (!motivoDenuncia.trim()) return;
    aoDenunciar?.(motivoDenuncia.trim());
    setMostrarModalDenuncia(false);
    setMotivoDenuncia('');
    sucesso('Denúncia enviada');
  }, [motivoDenuncia, aoDenunciar, sucesso]);

  return (
    <ToastProvider>
      <div className={`feed-detail ${className}`} data-testid={testId}>
        {/* Publicação principal */}
        <article className="feed-detail__publicacao">
          {/* Header */}
          <header className="feed-detail__header">
            <button
              className="feed-detail__autor"
              onClick={() => aoClicarAutor?.(publicacao.autorId)}
              data-testid="feed-detail-autor"
            >
              <Avatar
                src={publicacao.autorAvatar}
                alt={publicacao.autorNome}
                tamanho="grande"
                nome={publicacao.autorNome}
                data-testid="feed-detail-avatar"
              />
              <div className="feed-detail__autor-info">
                <strong className="feed-detail__autor-nome">{publicacao.autorNome}</strong>
                <span className="feed-detail__tempo">{tempoRelativo}</span>
              </div>
            </button>
          </header>

          {/* Tipo badge */}
          <div className="feed-detail__tipo">
            <span className="feed-detail__chip">
              <Icone nome={ICONES_TIPO_PUBLICACAO[publicacao.tipo]} tamanho={12} />
              {publicacao.tipo.charAt(0).toUpperCase() + publicacao.tipo.slice(1)}
            </span>
          </div>

          {/* Conteúdo */}
          <div className="feed-detail__conteudo">
            <p className="feed-detail__texto">{publicacao.conteudo}</p>

            {/* Mídias */}
            {publicacao.midias && publicacao.midias.length > 0 && (
              <div className="feed-detail__midias" role="list">
                {publicacao.midias.map((midia, index) => (
                  <figure key={midia.id || index} className="feed-detail__midia-item" role="listitem">
                    {midia.tipo === 'video' ? (
                      <video
                        src={midia.src}
                        poster={midia.thumbnail}
                        controls
                        preload="metadata"
                        className="feed-detail__video"
                      />
                    ) : (
                      <img
                        src={midia.src}
                        alt={midia.alt || ''}
                        loading="lazy"
                        className="feed-detail__imagem"
                      />
                    )}
                  </figure>
                ))}
              </div>
            )}
          </div>

          {/* Ações */}
          <footer className="feed-detail__acoes">
            <div className="feed-detail__acoes-esquerda">
              <div className="feed-detail__acao-item">
                <BotaoIcone
                  icone={<Icone nome={publicacao.estaCurtido ? 'coracao' : 'coracaoVazio'} tamanho={24} />}
                  aoClicar={aoCurtir}
                  variante={publicacao.estaCurtido ? 'primario' : 'fantasma'}
                  aria-label={publicacao.estaCurtido ? 'Descurtir' : 'Curtir'}
                  aria-pressed={publicacao.estaCurtido}
                  data-testid="feed-detail-curtir"
                />
                <span className="feed-detail__contador">{publicacao.curtidas}</span>
              </div>

              <div className="feed-detail__acao-item">
                <BotaoIcone
                  icone={<Icone nome="mensagem" tamanho={24} />}
                  aria-label="Comentários"
                  data-testid="feed-detail-comentarios"
                />
                <span className="feed-detail__contador">{publicacao.comentarios}</span>
              </div>

              <div className="feed-detail__acao-item">
                <BotaoIcone
                  icone={<Icone nome="compartilhar" tamanho={24} />}
                  aoClicar={handleCompartilhar}
                  aria-label="Compartilhar"
                  data-testid="feed-detail-compartilhar"
                />
                <span className="feed-detail__contador">{publicacao.compartilhamentos}</span>
              </div>
            </div>

            <div className="feed-detail__acoes-direita">
              <div className="feed-detail__acao-item">
                <BotaoIcone
                  icone={<Icone nome={publicacao.estaSalvo ? 'salvar' : 'salvarVazio'} tamanho={24} />}
                  aoClicar={aoSalvar}
                  variante={publicacao.estaSalvo ? 'primario' : 'fantasma'}
                  aria-label={publicacao.estaSalvo ? 'Remover dos salvos' : 'Salvar'}
                  aria-pressed={publicacao.estaSalvo}
                  data-testid="feed-detail-salvar"
                />
              </div>
            </div>
          </footer>
        </article>

        {/* Formulário de comentário */}
        <form className="feed-detail__form-comentario" onSubmit={handleEnviarComentario} data-testid="feed-detail-form-comentario">
          <Avatar src="" alt="Você" tamanho="grande" nome="Você" className="feed-detail__avatar-comentario" />
          <div className="feed-detail__campo-wrapper">
            <Textarea
              label=""
              valor={comentarioTexto}
              aoAlterar={setComentarioTexto}
              placeholder="Escreva um comentário..."
              linhas={2}
              maxLength={1000}
              mostrarContador
              data-testid="feed-detail-comentario-texto"
            />
            <div className="feed-detail__form-acoes">
              <BotaoPrimario
                tipo="submit"
                tamanho="pequeno"
                iconeEsquerda={<Icone nome="setaDireita" tamanho={14} />}
                desabilitado={!comentarioTexto.trim() || enviandoComentario}
                carregando={enviandoComentario}
                data-testid="feed-detail-enviar-comentario"
              >
                Comentar
              </BotaoPrimario>
            </div>
          </div>
        </form>

        {/* Lista de comentários */}
        <section className="feed-detail__comentarios" aria-label="Comentários">
          <h2 className="feed-detail__comentarios-titulo">
            {publicacao.comentarios} comentário{publicacao.comentarios !== 1 ? 's' : ''}
          </h2>

          {comentarios.length === 0 ? (
            <EmptyState
              titulo="Nenhum comentário"
              mensagem="Seja o primeiro a comentar!"
              icone="mensagem"
              className="feed-detail__empty"
              data-testid="feed-detail-comentarios-vazio"
            />
          ) : (
            <div className="feed-detail__comentarios-lista" role="list">
              {comentarios.map((comentario) => (
                <article
                  key={comentario.id}
                  className="feed-detail__comentario"
                  role="listitem"
                  data-testid={`comentario-${comentario.id}`}
                >
                  <Avatar
                    src={comentario.autorAvatar}
                    alt={comentario.autorNome}
                    tamanho="grande"
                    nome={comentario.autorNome}
                    className="feed-detail__comentario-avatar"
                  />
                  <div className="feed-detail__comentario-conteudo">
                    <header className="feed-detail__comentario-header">
                      <strong className="feed-detail__comentario-autor">{comentario.autorNome}</strong>
                      <time className="feed-detail__comentario-tempo" dateTime={new Date(comentario.criadoEm).toISOString()}>
                        {calcularTempoRelativo(comentario.criadoEm)}
                      </time>
                    </header>
                    <p className="feed-detail__comentario-texto">{comentario.texto}</p>
                  </div>
                </article>
              ))}

              {/* Sentinela para mais comentários */}
              <div ref={observerRef} className="feed-detail__sentinela" aria-hidden="true">
                {carregandoComentarios && (
                  <div className="feed-detail__carregando-mais" role="status">
                    <span>Carregando mais comentários...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Modal Compartilhar */}
        <Modal
          aberto={mostrarModalCompartilhar}
          aoFechar={() => setMostrarModalCompartilhar(false)}
          titulo="Compartilhar publicação"
          tamanho="pequeno"
          data-testid="modal-compartilhar"
        >
          <div className="feed-detail__modal-compartilhar">
            <p>Link copiado para a área de transferência:</p>
            <div className="feed-detail__link-container">
              <input
                type="text"
                value={linkCompartilhado}
                readOnly
                className="feed-detail__link-input"
                data-testid="modal-link-input"
              />
              <BotaoSecundario
                tamanho="pequeno"
                iconeEsquerda={<Icone nome="check" tamanho={14} />}
                aoClicar={handleCopiarLink}
                data-testid="modal-copiar-link"
              >
                Copiar
              </BotaoSecundario>
            </div>
            <BotaoPrimario
              aoClicar={() => setMostrarModalCompartilhar(false)}
              className="feed-detail__modal-fechar"
              data-testid="modal-fechar"
            >
              Fechar
            </BotaoPrimario>
          </div>
        </Modal>

        {/* Modal Denúncia */}
        <Modal
          aberto={mostrarModalDenuncia}
          aoFechar={() => { setMostrarModalDenuncia(false); setMotivoDenuncia(''); }}
          titulo="Denunciar publicação"
          tamanho="pequeno"
          data-testid="modal-denunciar"
        >
          <div className="feed-detail__modal-denuncia">
            <Textarea
              label="Motivo da denúncia"
              valor={motivoDenuncia}
              aoAlterar={setMotivoDenuncia}
              placeholder="Descreva o motivo..."
              linhas={4}
              maxLength={500}
              data-testid="modal-denuncia-motivo"
            />
            <div className="feed-detail__modal-acoes">
              <BotaoSecundario
                aoClicar={() => { setMostrarModalDenuncia(false); setMotivoDenuncia(''); }}
                data-testid="modal-denuncia-cancelar"
              >
                Cancelar
              </BotaoSecundario>
              <BotaoPerigo
                aoClicar={handleDenunciar}
                desabilitado={!motivoDenuncia.trim()}
                data-testid="modal-denuncia-enviar"
              >
                Enviar denúncia
              </BotaoPerigo>
            </div>
          </div>
        </Modal>
      </div>
    </ToastProvider>
  );
};

export default FeedDetail;