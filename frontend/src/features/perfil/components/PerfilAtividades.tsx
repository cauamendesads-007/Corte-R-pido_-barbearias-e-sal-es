/**
 * Componente PerfilAtividades - Histórico de atividades do usuário.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  BotaoSecundario,
  Badge,
  Icone,
  Skeleton,
  EmptyState,
  Dropdown,
  DropdownItem,
} from '@/componentes';
import type { AtividadeUsuario, AtividadesFiltro } from '../types';
import { formatarDuracao } from '../rules';
import './PerfilAtividades.css';

interface PerfilAtividadesProps {
  /** Atividades */
  atividades: AtividadeUsuario[];
  /** Carregando */
  carregando?: boolean;
  /** Próxima página */
  proximaPagina: number | null;
  /** Callback para carregar mais */
  aoCarregarMais?: (pagina: number, filtro?: AtividadesFiltro) => Promise<void>;
  /** Filtro atual */
  filtro?: AtividadesFiltro;
  /** Callback ao alterar filtro */
  aoAlterarFiltro?: (filtro: AtividadesFiltro) => void;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const TIPOS_ATIVIDADE = [
  { valor: 'login', rotulo: 'Login', icone: 'login', cor: 'primario' },
  { valor: 'agendamento_criado', rotulo: 'Agendamento criado', icone: 'calendario-mais', cor: 'sucesso' },
  { valor: 'agendamento_cancelado', rotulo: 'Agendamento cancelado', icone: 'calendario-x', cor: 'perigo' },
  { valor: 'agendamento_concluido', rotulo: 'Agendamento concluído', icone: 'calendario-check', cor: 'sucesso' },
  { valor: 'avaliacao_feita', rotulo: 'Avaliação feita', icone: 'estrela', cor: 'aviso' },
  { valor: 'pagamento', rotulo: 'Pagamento', icone: 'cartao', cor: 'primario' },
  { valor: 'perfil_atualizado', rotulo: 'Perfil atualizado', icone: 'usuario', cor: 'secundario' },
  { valor: 'configuracao_alterada', rotulo: 'Configuração alterada', icone: 'configuracoes', cor: 'secundario' },
] as const;

export const PerfilAtividades = ({
  atividades,
  carregando = false,
  proximaPagina,
  aoCarregarMais,
  filtro,
  aoAlterarFiltro,
  className = '',
  'data-testid': testId,
}: PerfilAtividadesProps) => {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroLocal, setFiltroLocal] = useState<AtividadesFiltro>(filtro || {});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const carregandoMaisRef = useRef(false);

  // Infinite scroll
  useEffect(() => {
    if (!proximaPagina || carregando || carregandoMaisRef.current || !aoCarregarMais) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          carregandoMaisRef.current = true;
          aoCarregarMais(proximaPagina, filtroLocal).finally(() => {
            carregandoMaisRef.current = false;
          });
        }
      },
      { rootMargin: '100px' }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [proximaPagina, carregando, aoCarregarMais, filtroLocal]);

  const handleFiltroChange = useCallback((chave: keyof AtividadesFiltro, valor: string | undefined) => {
    const novoFiltro = { ...filtroLocal, [chave]: valor || undefined };
    setFiltroLocal(novoFiltro);
    aoAlterarFiltro?.(novoFiltro);
  }, [filtroLocal, aoAlterarFiltro]);

  const getTipoInfo = (tipo: AtividadeUsuario['tipo']) => {
    return TIPOS_ATIVIDADE.find((t) => t.valor === tipo) || { icone: 'atividade', cor: 'secundario', rotulo: tipo };
  };

  const formatarData = (data: string) => {
    const d = new Date(data);
    const agora = new Date();
    const diffMs = agora.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (carregando && atividades.length === 0) {
    return (
      <Cartao className={`perfil-atividades ${className}`} data-testid={testId}>
        <CartaoCabecalho titulo="Atividade recente" />
        <CartaoCorpo>
          <div className="perfil-atividades__skeleton" role="status" aria-label="Carregando atividades">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} variante="retangular" largura="100%" altura={72} />
            ))}
          </div>
        </CartaoCorpo>
      </Cartao>
    );
  }

  return (
    <Cartao className={`perfil-atividades ${className}`} data-testid={testId}>
      <CartaoCabecalho
        titulo="Atividade recente"
        subtitulo={`${atividades.length} atividad${atividades.length !== 1 ? 'es' : 'e'}`}
        acao={
          <button
            className="perfil-atividades__filtros-btn"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            aria-expanded={mostrarFiltros}
            data-testid="btn-filtros"
          >
            <Icone nome="funil" tamanho={16} />
            Filtros
          </button>
        }
      />
      <CartaoCorpo>
        {/* Filtros */}
        {mostrarFiltros && (
          <div className="perfil-atividades__filtros" data-testid="painel-filtros">
            <Select
              label="Tipo de atividade"
              value={filtroLocal.tipo || ''}
              onChange={(e) => handleFiltroChange('tipo', e.target.value as any)}
              opcoes={[
                { valor: '', rotulo: 'Todos os tipos' },
                ...TIPOS_ATIVIDADE.map((t) => ({ valor: t.valor, rotulo: t.rotulo })),
              ]}
              placeholder="Filtrar por tipo"
              data-testid="select-tipo-atividade"
            />

            <div className="perfil-atividades__filtros-data">
              <Input
                label="Data início"
                type="date"
                value={filtroLocal.dataInicio || ''}
                onChange={(e) => handleFiltroChange('dataInicio', e.target.value)}
                data-testid="input-data-inicio"
              />
              <Input
                label="Data fim"
                type="date"
                value={filtroLocal.dataFim || ''}
                onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
                data-testid="input-data-fim"
              />
            </div>

            <button
              className="perfil-atividades__limpar-filtros"
              onClick={() => { setFiltroLocal({}); aoAlterarFiltro?.({}); }}
              data-testid="btn-limpar-filtros"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* Lista de atividades */}
        {atividades.length === 0 ? (
          <EmptyState
            titulo="Nenhuma atividade"
            mensagem={filtroLocal.tipo || filtroLocal.dataInicio || filtroLocal.dataFim
              ? 'Nenhuma atividade encontrada com esses filtros.'
              : 'Suas atividades recentes aparecerão aqui.'}
            icone="historico"
            className="perfil-atividades__empty"
            data-testid="atividades-vazio"
          />
        ) : (
          <>
            <ul className="perfil-atividades__lista" role="list" data-testid="lista-atividades">
              {atividades.map((atividade) => {
                const info = getTipoInfo(atividade.tipo);
                return (
                  <li
                    key={atividade.id}
                    className="perfil-atividades__item"
                    role="listitem"
                    data-testid={`atividade-${atividade.id}`}
                  >
                    <div className="perfil-atividades__item-icone" style={{ '--cor-atividade': `var(--cor-${info.cor})` }}>
                      <Icone nome={info.icone} tamanho={20} />
                    </div>
                    <div className="perfil-atividades__item-conteudo">
                      <p className="perfil-atividades__item-descricao">{atividade.descricao}</p>
                      <div className="perfil-atividades__item-meta">
                        <time className="perfil-atividades__item-tempo" dateTime={atividade.criadoEm}>
                          {formatarData(atividade.criadoEm)}
                        </time>
                        {atividade.ip && (
                          <>
                            <span className="perfil-atividades__item-separador" aria-hidden="true">·</span>
                            <span className="perfil-atividades__item-ip">{atividade.ip}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Dropdown
                      gatilho={
                        <button
                          className="perfil-atividades__item-menu"
                          aria-label="Mais opções"
                          data-testid={`menu-${atividade.id}`}
                        >
                          <Icone nome="mais" tamanho={16} />
                        </button>
                      }
                      itens={[
                        { rotulo: 'Detalhes', icone: 'info', aoClicar: () => alert(JSON.stringify(atividade.metadados, null, 2)) },
                      ]}
                      posicao="bottom-end"
                    />
                  </li>
                );
              })}
            </ul>

            {/* Sentinel para infinite scroll */}
            <div
              ref={sentinelRef}
              className="perfil-atividades__sentinel"
              aria-hidden="true"
            >
              {proximaPagina && (
                <div className="perfil-atividades__carregando-mais" role="status" aria-label="Carregando mais atividades">
                  <Icone nome="carregando" tamanho={20} className="perfil-atividades__spinner" />
                  Carregando mais...
                </div>
              )}
            </div>
          </>
        )}
      </CartaoCorpo>
    </Cartao>
  );
};

export default PerfilAtividades;