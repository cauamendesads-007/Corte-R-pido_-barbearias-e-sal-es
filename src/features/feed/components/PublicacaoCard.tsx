/**
 * Componente PublicacaoCard - Card de publicação no feed.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 * 6 estados: default, hover, focus-visible, active, disabled, loading.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Avatar,
  BotaoIcone,
  Icone,
  Chip,
} from '@/componentes';
import type { Publicacao, PublicacaoTipo } from '../types';
import { calcularTempoRelativo, obterPrimeiraImagem } from '../rules';
import type { NomeIcone } from '@/componentes/ui/Icone';
import './PublicacaoCard.css';

interface PublicacaoCardProps {
  /** Dados da publicação */
  publicacao: Publicacao;
  /** Callback ao curtir/descurtir */
  aoCurtir?: (id: string) => void;
  /** Callback ao salvar/desalvar */
  aoSalvar?: (id: string) => void;
  /** Callback ao comentar */
  aoComentar?: (id: string) => void;
  /** Callback ao compartilhar */
  aoCompartilhar?: (id: string) => void;
  /** Callback ao denunciar */
  aoDenunciar?: (id: string) => void;
  /** Callback ao clicar no autor */
  aoClicarAutor?: (autorId: string) => void;
  /** Mostra ações de moderação (para admin/dono) */
  mostrarModeracao?: boolean;
  /** Callback para editar */
  aoEditar?: (publicacao: Publicacao) => void;
  /** Callback para excluir */
  aoExcluir?: (id: string) => void;
  /** Variante visual */
  variante?: 'feed' | 'perfil' | 'compacto';
  /** Carregando ações */
  carregandoAcoes?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const ICONES_TIPO: Record<PublicacaoTipo, NomeIcone> = {
  corte: 'tesoura',
  barba: 'tesoura',
  combo: 'grade',
  inspiracao: 'estrela',
  dica: 'info',
  outro: 'foto',
};

const ROTULOS_TIPO: Record<PublicacaoTipo, string> = {
  corte: 'Corte',
  barba: 'Barba',
  combo: 'Combo',
  inspiracao: 'Inspiração',
  dica: 'Dica',
  outro: 'Postagem',
};

export const PublicacaoCard = ({
  publicacao,
  aoCurtir,
  aoSalvar,
  aoComentar,
  aoCompartilhar,
  aoDenunciar,
  aoClicarAutor,
  mostrarModeracao = false,
  aoEditar,
  aoExcluir,
  variante = 'feed',
  carregandoAcoes = false,
  className = '',
  'data-testid': testId,
}: PublicacaoCardProps) => {
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside para fechar menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mostrarMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMostrarMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mostrarMenu]);

  const handleCurtir = useCallback(() => {
    aoCurtir?.(publicacao.id);
  }, [aoCurtir, publicacao.id]);

  const handleSalvar = useCallback(() => {
    aoSalvar?.(publicacao.id);
  }, [aoSalvar, publicacao.id]);

  const handleComentar = useCallback(() => {
    aoComentar?.(publicacao.id);
  }, [aoComentar, publicacao.id]);

  const handleCompartilhar = useCallback(async () => {
    const link = await aoCompartilhar?.(publicacao.id);
    if (link && navigator.share) {
      try {
        await navigator.share({ title: publicacao.conteudo.slice(0, 50), url: link });
      } catch {
        navigator.clipboard.writeText(link);
      }
    } else if (link) {
      navigator.clipboard.writeText(link);
    }
  }, [aoCompartilhar, publicacao]);

  const handleDenunciar = useCallback(() => {
    const motivo = window.confirm('Tem certeza que deseja denunciar esta publicação?')
      ? 'Conteúdo inadequado'
      : '';
    if (motivo) aoDenunciar?.(publicacao.id);
    setMostrarMenu(false);
  }, [aoDenunciar, publicacao.id]);

  const handleEditar = useCallback(() => {
    aoEditar?.(publicacao);
    setMostrarMenu(false);
  }, [aoEditar, publicacao]);

  const handleExcluir = useCallback(() => {
    if (window.confirm('Tem certeza que deseja excluir esta publicação?')) {
      aoExcluir?.(publicacao.id);
    }
    setMostrarMenu(false);
  }, [aoExcluir, publicacao.id]);

  const imagemPrincipal = obterPrimeiraImagem(publicacao);
  const tempoRelativo = calcularTempoRelativo(publicacao.criadoEm);

  if (variante === 'compacto') {
    return (
      <article className={`publicacao-card publicacao-card--compacto ${className}`} data-testid={testId}>
        <div className="publicacao-card__midia-compacto">
          {imagemPrincipal && <img src={imagemPrincipal} alt="" loading="lazy" />}
        </div>
        <div className="publicacao-card__conteudo-compacto">
          <p className="publicacao-card__texto-compacto">{publicacao.conteudo}</p>
          <div className="publicacao-card__meta-compacto">
            <span className="publicacao-card__tempo">{tempoRelativo}</span>
            <span className="publicacao-card__stats">
              <Icone nome={publicacao.estaCurtido ? 'coracao' : 'coracaoVazio'} tamanho={14} /> {publicacao.curtidas}
              <Icone nome="mensagem" tamanho={14} /> {publicacao.comentarios}
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`publicacao-card publicacao-card--${variante} ${className}`} data-testid={testId}>
      {/* Header */}
      <header className="publicacao-card__header">
        <button
          className="publicacao-card__autor"
          onClick={() => aoClicarAutor?.(publicacao.autorId)}
          data-testid="publicacao-autor"
        >
          <Avatar
            src={publicacao.autorAvatar}
            alt={publicacao.autorNome}
            tamanho="medio"
            nome={publicacao.autorNome}
            data-testid="publicacao-avatar"
          />
          <div className="publicacao-card__autor-info">
            <strong className="publicacao-card__autor-nome">{publicacao.autorNome}</strong>
            <span className="publicacao-card__tempo">{tempoRelativo}</span>
          </div>
        </button>

        {mostrarModeracao && (
          <div className="publicacao-card__menu" ref={menuRef}>
            <BotaoIcone
              icone={<Icone nome="mais" tamanho={20} />}
              aoClicar={() => setMostrarMenu(!mostrarMenu)}
              aria-label="Mais opções"
              data-testid="publicacao-menu"
            />
            {mostrarMenu && (
              <div className="publicacao-card__dropdown" role="menu">
                <button
                  role="menuitem"
                  className="publicacao-card__dropdown-item"
                  onClick={handleEditar}
                  disabled={carregandoAcoes}
                  data-testid="publicacao-editar"
                >
                  <Icone nome="editar" tamanho={14} />
                  Editar
                </button>
                <button
                  role="menuitem"
                  className="publicacao-card__dropdown-item publicacao-card__dropdown-item--perigo"
                  onClick={handleExcluir}
                  disabled={carregandoAcoes}
                  data-testid="publicacao-excluir"
                >
                  <Icone nome="lixeira" tamanho={14} />
                  Excluir
                </button>
                <hr className="publicacao-card__dropdown-divisor" />
                <button
                  role="menuitem"
                  className="publicacao-card__dropdown-item publicacao-card__dropdown-item--perigo"
                  onClick={handleDenunciar}
                  disabled={carregandoAcoes}
                  data-testid="publicacao-denunciar"
                >
                  <Icone nome="alerta" tamanho={14} />
                  Denunciar
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Tipo badge */}
      <div className="publicacao-card__tipo">
        <Chip icone={<Icone nome={ICONES_TIPO[publicacao.tipo]} tamanho={10} />}>
          {ROTULOS_TIPO[publicacao.tipo]}
        </Chip>
      </div>

      {/* Conteúdo */}
      <div className="publicacao-card__conteudo">
        <p className="publicacao-card__texto">{publicacao.conteudo}</p>

        {/* Mídias */}
        {publicacao.midias && publicacao.midias.length > 0 && (
          <div className="publicacao-card__midias" role="list" aria-label="Mídias da publicação">
            {publicacao.midias.map((midia, index) => (
              <figure key={midia.id || index} className="publicacao-card__midia-item" role="listitem">
                {midia.tipo === 'video' ? (
                  <video
                    src={midia.src}
                    poster={midia.thumbnail}
                    controls
                    preload="metadata"
                    className="publicacao-card__video"
                    data-testid={`publicacao-video-${index}`}
                  />
                ) : (
                  <img
                    src={midia.src}
                    alt={midia.alt || `${publicacao.autorNome} - mídia ${index + 1}`}
                    loading="lazy"
                    className="publicacao-card__imagem"
                    data-testid={`publicacao-imagem-${index}`}
                  />
                )}
              </figure>
            ))}
          </div>
        )}
      </div>

      {/* Ações */}
      <footer className="publicacao-card__acoes">
        <div className="publicacao-card__acoes-esquerda">
          <div className="publicacao-card__acao-item">
            <BotaoIcone
              icone={<Icone nome={publicacao.estaCurtido ? 'coracao' : 'coracaoVazio'} tamanho={20} />}
              aoClicar={handleCurtir}
              variante={publicacao.estaCurtido ? 'primario' : 'fantasma'}
              aria-label={publicacao.estaCurtido ? 'Descurtir' : 'Curtir'}
              aria-pressed={publicacao.estaCurtido}
              desabilitado={carregandoAcoes}
              data-testid="publicacao-curtir"
            />
            <span className="publicacao-card__contador">{publicacao.curtidas}</span>
          </div>

          <div className="publicacao-card__acao-item">
            <BotaoIcone
              icone={<Icone nome="mensagem" tamanho={20} />}
              aoClicar={handleComentar}
              aria-label="Comentar"
              desabilitado={carregandoAcoes}
              data-testid="publicacao-comentar"
            />
            <span className="publicacao-card__contador">{publicacao.comentarios}</span>
          </div>

          <div className="publicacao-card__acao-item">
            <BotaoIcone
              icone={<Icone nome="compartilhar" tamanho={20} />}
              aoClicar={handleCompartilhar}
              aria-label="Compartilhar"
              desabilitado={carregandoAcoes}
              data-testid="publicacao-compartilhar"
            />
            <span className="publicacao-card__contador">{publicacao.compartilhamentos}</span>
          </div>
        </div>

        <div className="publicacao-card__acoes-direita">
          <div className="publicacao-card__acao-item">
            <BotaoIcone
              icone={<Icone nome={publicacao.estaSalvo ? 'salvar' : 'salvarVazio'} tamanho={20} />}
              aoClicar={handleSalvar}
              variante={publicacao.estaSalvo ? 'primario' : 'fantasma'}
              aria-label={publicacao.estaSalvo ? 'Remover dos salvos' : 'Salvar'}
              aria-pressed={publicacao.estaSalvo}
              desabilitado={carregandoAcoes}
              data-testid="publicacao-salvar"
            />
          </div>
        </div>
      </footer>

      {/* Separador */}
      {variante === 'feed' && <hr className="publicacao-card__divisor" />}
    </article>
  );
};

export default PublicacaoCard;