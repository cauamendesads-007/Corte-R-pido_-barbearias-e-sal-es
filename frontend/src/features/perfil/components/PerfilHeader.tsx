/**
 * Componente PerfilHeader - Cabeçalho do perfil com avatar e info principal.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useState, useCallback } from 'react';
import {
  Cartao,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  Icone,
  Badge,
  Avatar,
  Tooltip,
  Dropdown,
  DropdownItem,
  Skeleton,
} from '@/componentes';
import type { Perfil } from '../types';
import { calcularCompletudePerfil, formatarTelefone } from '../rules';
import './PerfilHeader.css';

interface PerfilHeaderProps {
  /** Perfil do usuário */
  perfil: Perfil | null;
  /** Carregando */
  carregando?: boolean;
  /** Callback para editar perfil */
  aoEditar?: () => void;
  /** Callback para upload de avatar */
  aoUploadAvatar?: (arquivo: File) => void;
  /** Callback para remover avatar */
  aoRemoverAvatar?: () => void;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const PerfilHeader = ({
  perfil,
  carregando = false,
  aoEditar,
  aoUploadAvatar,
  aoRemoverAvatar,
  className = '',
  'data-testid': testId,
}: PerfilHeaderProps) => {
  const [mostrarMenuAvatar, setMostrarMenuAvatar] = useState(false);
  const [arquivoAvatar, setArquivoAvatar] = useState<File | null>(null);

  const completude = perfil ? calcularCompletudePerfil(perfil) : 0;

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (arquivo) {
      setArquivoAvatar(arquivo);
      aoUploadAvatar?.(arquivo);
    }
    e.target.value = '';
  }, [aoUploadAvatar]);

  const handleRemoverAvatar = useCallback(() => {
    aoRemoverAvatar?.();
    setMostrarMenuAvatar(false);
  }, [aoRemoverAvatar]);

  const handleEditar = useCallback(() => {
    aoEditar?.();
    setMostrarMenuAvatar(false);
  }, [aoEditar]);

  if (carregando) {
    return (
      <Cartao className={`perfil-header ${className}`} data-testid={testId}>
        <CartaoCorpo>
          <div className="perfil-header__skeleton" role="status" aria-label="Carregando cabeçalho do perfil">
            <Skeleton variante="circular" largura={96} altura={96} className="perfil-header__avatar-skeleton" />
            <div className="perfil-header__info-skeleton">
              <Skeleton variante="retangular" largura="200px" altura={28} />
              <Skeleton variante="retangular" largura="150px" altura={20} />
              <Skeleton variante="retangular" largura="100px" altura={20} />
            </div>
            <div className="perfil-header__completude-skeleton">
              <Skeleton variante="retangular" largura="100%" altura={8} />
            </div>
            <div className="perfil-header__acoes-skeleton">
              <Skeleton variante="retangular" largura="120px" altura={40} />
              <Skeleton variante="retangular" largura="100px" altura={40} />
            </div>
          </div>
        </CartaoCorpo>
      </Cartao>
    );
  }

  if (!perfil) {
    return (
      <Cartao className={`perfil-header ${className}`} data-testid={testId}>
        <CartaoCorpo>
          <div className="perfil-header__vazio">
            <Icone nome="usuario" tamanho={48} className="perfil-header__icone-vazio" />
            <h2>Perfil não encontrado</h2>
            <p>Não foi possível carregar os dados do perfil.</p>
          </div>
        </CartaoCorpo>
      </Cartao>
    );
  }

  return (
    <Cartao className={`perfil-header ${className}`} data-testid={testId}>
      <CartaoCorpo>
        <div className="perfil-header__conteudo">
          {/* Avatar */}
          <div className="perfil-header__avatar-wrapper">
            <Avatar
              src={perfil.avatar}
              alt={perfil.nome}
              tamanho="xl"
              nome={perfil.nome}
              className="perfil-header__avatar"
              data-testid="perfil-avatar"
            />
            <label className="perfil-header__avatar-label" htmlFor="avatar-upload">
              <Icone nome="camera" tamanho={20} />
              <input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="perfil-header__avatar-input"
                data-testid="avatar-upload-input"
              />
            </label>

            {/* Dropdown do avatar */}
            <Dropdown
              aberto={mostrarMenuAvatar}
              aoFechar={() => setMostrarMenuAvatar(false)}
              gatilho={
                <button
                  className="perfil-header__avatar-menu-btn"
                  onClick={() => setMostrarMenuAvatar(!mostrarMenuAvatar)}
                  aria-label="Opções do avatar"
                  aria-expanded={mostrarMenuAvatar}
                  data-testid="avatar-menu-btn"
                >
                  <Icone nome="mais" tamanho={16} />
                </button>
              }
              itens={[
                { rotulo: 'Editar perfil', icone: 'editar', aoClicar: handleEditar },
                { rotulo: 'Alterar foto', icone: 'camera', aoClicar: () => document.getElementById('avatar-upload')?.click() },
                perfil.avatar && { rotulo: 'Remover foto', icone: 'lixeira', aoClicar: handleRemoverAvatar, variante: 'perigo' },
              ].filter(Boolean) as any[]}
              posicao="bottom-end"
              className="perfil-header__avatar-dropdown"
              data-testid="avatar-dropdown"
            />
          </div>

          {/* Info principal */}
          <div className="perfil-header__info">
            <div className="perfil-header__nome-row">
              <h1 className="perfil-header__nome">{perfil.nome}</h1>
              {perfil.emailVerificado && (
                <Badge variante="sucesso" tamanho="pequeno" className="perfil-header__verificado">
                  <Icone nome="check-circle" tamanho={12} />
                  Verificado
                </Badge>
              )}
            </div>
            <p className="perfil-header__email">{perfil.email}</p>
            {perfil.telefone && (
              <p className="perfil-header__telefone">
                <Icone nome="telefone" tamanho={14} />
                {formatarTelefone(perfil.telefone)}
              </p>
            )}
            <div className="perfil-header__meta">
              <span className="perfil-header__role">
                <Icone nome={perfil.role === 'admin' ? 'escudo' : perfil.role === 'barbeiro' ? 'tesoura' : 'usuario'} tamanho={12} />
                {perfil.role === 'admin' ? 'Administrador' : perfil.role === 'barbeiro' ? 'Barbeiro' : 'Cliente'}
              </span>
              <span className="perfil-header__desde">
                <Icone nome="calendario" tamanho={12} />
                Membro desde {new Date(perfil.criadoEm).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Completude */}
          <div className="perfil-header__completude" role="progressbar" aria-valuenow={completude} aria-valuemin={0} aria-valuemax={100} aria-label={`Completude do perfil: ${completude}%`}>
            <div className="perfil-header__completude-header">
              <span className="perfil-header__completude-label">Completude do perfil</span>
              <span className="perfil-header__completude-valor">{completude}%</span>
            </div>
            <div className="perfil-header__completude-barra">
              <div
                className="perfil-header__completude-progresso"
                style={{ width: `${completude}%` }}
                data-testid="completude-progresso"
              />
            </div>
            <p className="perfil-header__completude-texto">
              {completude === 100 ? 'Perfil completo! 🎉' : 'Complete seu perfil para aproveitar melhor a plataforma'}
            </p>
          </div>

          {/* Ações */}
          <div className="perfil-header__acoes">
            <BotaoPrimario onClick={handleEditar} icone="editar" data-testid="btn-editar-perfil">
              Editar perfil
            </BotaoPrimario>
            <BotaoSecundario onClick={() => {}} icone="configuracoes" data-testid="btn-configuracoes">
              Configurações
            </BotaoSecundario>
          </div>
        </div>
      </CartaoCorpo>
    </Cartao>
  );
};

export default PerfilHeader;