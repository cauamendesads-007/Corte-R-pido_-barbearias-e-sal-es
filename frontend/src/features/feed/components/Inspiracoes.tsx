/**
 * Componente Inspiracoes - Galeria de inspirações com filtro por categoria.
 * Puro, coeso, < 150 linhas, skeleton loading, empty state.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  BotaoPrimario,
  BotaoSecundario,
  Icone,
  Skeleton,
  EmptyState,
  Modal,
} from '@/componentes';
import type { Inspiracao, InspiracaoInput, InspiracaoCategoria } from '../types';
import type { NomeIcone } from '@/componentes/ui/Icone';
import './Inspiracoes.css';

interface InspiracoesProps {
  /** Lista de inspirações */
  inspiracaoes: Inspiracao[];
  /** Carregando */
  carregando?: boolean;
  /** Erro */
  erro?: string | null;
  /** Categoria ativa */
  categoriaAtiva?: InspiracaoCategoria | 'todas';
  /** Callback para filtrar por categoria */
  aoFiltrarCategoria?: (categoria: InspiracaoCategoria | 'todas') => void;
  /** Callback para criar inspiração */
  aoCriar?: (input: InspiracaoInput) => Promise<void>;
  /** Mostra botão de criar */
  mostrarCriar?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const CATEGORIAS: { valor: InspiracaoCategoria | 'todas'; rotulo: string; icone: NomeIcone }[] = [
  { valor: 'todas', rotulo: 'Todas', icone: 'grade' },
  { valor: 'classico', rotulo: 'Clássico', icone: 'tesoura' },
  { valor: 'moderno', rotulo: 'Moderno', icone: 'estrela' },
  { valor: 'degrade', rotulo: 'Degradê', icone: 'foto' },
  { valor: 'barba', rotulo: 'Barba', icone: 'tesoura' },
  { valor: 'colorido', rotulo: 'Colorido', icone: 'paleta' },
  { valor: 'infantil', rotulo: 'Infantil', icone: 'usuario' },
  { valor: 'outro', rotulo: 'Outros', icone: 'mais' },
];

// Mapa de ícones de categoria para o badge no card
const ICONES_CATEGORIA: Record<InspiracaoCategoria, NomeIcone> = {
  classico: 'tesoura',
  moderno: 'estrela',
  degrade: 'foto',
  barba: 'tesoura',
  colorido: 'paleta',
  infantil: 'usuario',
  outro: 'mais',
};

export const Inspiracoes = ({
  inspiracaoes,
  carregando = false,
  erro = null,
  categoriaAtiva = 'todas',
  aoFiltrarCategoria,
  aoCriar,
  mostrarCriar = false,
  className = '',
  'data-testid': testId,
}: InspiracoesProps) => {
  const [modalAberto, setModalAberto] = useState(false);
  const [novaInspiracao, setNovaInspiracao] = useState<InspiracaoInput>({
    titulo: '',
    categoria: 'classico',
    descricao: '',
    midias: [],
  });
  const [salvando, setSalvando] = useState(false);

  const inspiracaoesFiltradas = useMemo(() => {
    if (categoriaAtiva === 'todas') return inspiracaoes;
    return inspiracaoes.filter((i) => i.categoria === categoriaAtiva);
  }, [inspiracaoes, categoriaAtiva]);

  const handleCriar = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaInspiracao.titulo.trim() || !novaInspiracao.midias.length || salvando) return;

    setSalvando(true);
    try {
      await aoCriar?.(novaInspiracao);
      setModalAberto(false);
      setNovaInspiracao({ titulo: '', categoria: 'classico', descricao: '', midias: [] });
    } catch {
      // Erro tratado no hook
    } finally {
      setSalvando(false);
    }
  }, [novaInspiracao, aoCriar, salvando]);

  // Handler para upload de arquivos
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const novasMidias = files.slice(0, 5).map((file) => ({
      src: URL.createObjectURL(file),
      tipo: 'imagem' as const,
    }));
    setNovaInspiracao((prev) => ({ ...prev, midias: novasMidias }));
  }, []);

  if (carregando && !inspiracaoes.length) {
    return (
      <div className={`inspiracoes ${className}`} data-testid={testId}>
        <div className="inspiracoes__skeleton" role="status" aria-label="Carregando inspirações">
          <div className="inspiracoes__header-skeleton">
            <Skeleton variante="retangular" largura="200px" altura={28} />
            <Skeleton variante="retangular" largura="300px" altura={44} />
          </div>
          <div className="inspiracoes__grid-skeleton">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="inspiracoes__item-skeleton">
                <Skeleton variante="retangular" largura="100%" altura="200px" />
                <Skeleton variante="retangular" largura="60%" altura={20} />
                <Skeleton variante="retangular" largura="40%" altura={14} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (erro && !inspiracaoes.length) {
    return (
      <div className={`inspiracoes ${className}`} data-testid={testId}>
        <EmptyState
          titulo="Erro ao carregar inspirações"
          mensagem={erro}
          icone="alerta"
          className="inspiracoes__empty"
          data-testid="inspiracoes-erro"
        />
      </div>
    );
  }

  if (!inspiracaoesFiltradas.length) {
    return (
      <div className={`inspiracoes ${className}`} data-testid={testId}>
        <div className="inspiracoes__header">
          <h2 className="inspiracoes__titulo">Inspirações</h2>
          <div className="inspiracoes__categorias" role="tablist" aria-label="Categorias de inspiração">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.valor}
                role="tab"
                aria-selected={categoriaAtiva === cat.valor}
                className={`inspiracoes__categoria ${categoriaAtiva === cat.valor ? 'inspiracoes__categoria--ativa' : ''}`}
                onClick={() => aoFiltrarCategoria?.(cat.valor)}
                data-testid={`inspiracoes-categoria-${cat.valor}`}
              >
                <Icone nome={cat.icone} tamanho={16} />
                {cat.rotulo}
              </button>
            ))}
          </div>
        </div>
        <EmptyState
          titulo="Nenhuma inspiração"
          mensagem={categoriaAtiva !== 'todas' ? `Nenhuma inspiração na categoria ${CATEGORIAS.find(c => c.valor === categoriaAtiva)?.rotulo}.` : 'Ainda não há inspirações cadastradas.'}
          icone="lampada"
          acao={mostrarCriar && aoCriar ? { rotulo: 'Adicionar inspiração', aoClicar: () => setModalAberto(true) } : undefined}
          className="inspiracoes__empty"
          data-testid="inspiracoes-vazio"
        />
      </div>
    );
  }

  return (
    <div className={`inspiracoes ${className}`} data-testid={testId}>
      {/* Header */}
      <header className="inspiracoes__header">
        <div className="inspiracoes__header-top">
          <h2 className="inspiracoes__titulo">Inspirações</h2>
          {mostrarCriar && aoCriar && (
            <BotaoSecundario
              iconeEsquerda={<Icone nome="mais" tamanho={16} />}
              aoClicar={() => setModalAberto(true)}
              data-testid="inspiracoes-novo"
            >
              Nova inspiração
            </BotaoSecundario>
          )}
        </div>
        <div className="inspiracoes__categorias" role="tablist" aria-label="Categorias de inspiração">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.valor}
              role="tab"
              aria-selected={categoriaAtiva === cat.valor}
              className={`inspiracoes__categoria ${categoriaAtiva === cat.valor ? 'inspiracoes__categoria--ativa' : ''}`}
              onClick={() => aoFiltrarCategoria?.(cat.valor)}
              data-testid={`inspiracoes-categoria-${cat.valor}`}
            >
              <Icone nome={cat.icone} tamanho={16} />
              {cat.rotulo}
            </button>
          ))}
        </div>
      </header>

      {/* Grid */}
      <div className="inspiracoes__grid" role="list" aria-label="Galeria de inspirações">
        {inspiracaoesFiltradas.map((inspiracao: Inspiracao) => (
          <article
            key={inspiracao.id}
            className="inspiracoes__item"
            role="listitem"
            data-testid={`inspiracao-${inspiracao.id}`}
          >
            <figure className="inspiracoes__midia">
              {inspiracao.midias[0]?.src && (
                <img
                  src={inspiracao.midias[0].src}
                  alt={inspiracao.titulo}
                  loading="lazy"
                  className="inspiracoes__imagem"
                />
              )}
              <figcaption className="inspiracoes__legenda">
                <span className="inspiracoes__categoria-chip">
                  <Icone nome={ICONES_CATEGORIA[inspiracao.categoria]} tamanho={10} />
                  {inspiracao.categoria.charAt(0).toUpperCase() + inspiracao.categoria.slice(1)}
                </span>
              </figcaption>
            </figure>
            <div className="inspiracoes__info">
              <h3 className="inspiracoes__item-titulo">{inspiracao.titulo}</h3>
              {inspiracao.descricao && (
                <p className="inspiracoes__item-descricao">{inspiracao.descricao}</p>
              )}
              <div className="inspiracoes__item-meta">
                <span className="inspiracoes__item-curtidas">
                  <Icone nome="coracao" tamanho={14} /> {inspiracao.curtidas}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Modal Criar */}
      <Modal
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        titulo="Nova inspiração"
        tamanho="medio"
        data-testid="modal-nova-inspiracao"
      >
        <form onSubmit={handleCriar} className="inspiracoes__modal-form">
          <div className="inspiracoes__modal-grid">
            <div className="inspiracoes__modal-campo">
              <label className="inspiracoes__modal-label">Título</label>
              <input
                type="text"
                value={novaInspiracao.titulo}
                onChange={(e) => setNovaInspiracao((p) => ({ ...p, titulo: e.target.value }))}
                placeholder="Ex: Corte degradê moderno"
                maxLength={100}
                required
                className="inspiracoes__modal-input"
                data-testid="inspiracao-titulo"
              />
            </div>
            <div className="inspiracoes__modal-campo">
              <label className="inspiracoes__modal-label">Categoria</label>
              <select
                value={novaInspiracao.categoria}
                onChange={(e) => setNovaInspiracao((p) => ({ ...p, categoria: e.target.value as InspiracaoCategoria }))}
                className="inspiracoes__modal-select"
                data-testid="inspiracao-categoria"
              >
                {CATEGORIAS.filter(c => c.valor !== 'todas').map((cat) => (
                  <option key={cat.valor} value={cat.valor}>{cat.rotulo}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="inspiracoes__modal-campo">
            <label className="inspiracoes__modal-label">Descrição (opcional)</label>
            <textarea
              value={novaInspiracao.descricao}
              onChange={(e) => setNovaInspiracao((p) => ({ ...p, descricao: e.target.value }))}
              placeholder="Dicas, técnicas, produtos usados..."
              maxLength={500}
              rows={3}
              className="inspiracoes__modal-textarea"
              data-testid="inspiracao-descricao"
            />
          </div>
          <div className="inspiracoes__modal-campo">
            <label className="inspiracoes__modal-label">Imagens (mín. 1, máx. 5)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="inspiracoes__modal-file-input"
              data-testid="inspiracao-upload"
            />
            {novaInspiracao.midias.length > 0 && (
              <div className="inspiracoes__modal-preview">
                {novaInspiracao.midias.map((midia, index) => (
                  <div key={index} className="inspiracoes__modal-preview-item">
                    <img src={midia.src} alt={`Preview ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="inspiracoes__modal-acoes">
            <BotaoSecundario
              tipo="button"
              aoClicar={() => setModalAberto(false)}
              data-testid="modal-inspiracao-cancelar"
            >
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario
              tipo="submit"
              iconeEsquerda={<Icone nome="salvar" tamanho={14} />}
              carregando={salvando}
              desabilitado={!novaInspiracao.titulo.trim() || !novaInspiracao.midias.length}
              data-testid="modal-inspiracao-salvar"
            >
              Criar inspiração
            </BotaoPrimario>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inspiracoes;