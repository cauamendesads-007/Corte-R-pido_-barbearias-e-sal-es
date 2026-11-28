/**
 * Tela Explorar - Marketplace de barbearias e salões.
 * Filtros laterais (desktop) / drawer (mobile), grid de cards, busca, mapa.
 */

import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEstabelecimentos, useNichos, useCidades } from '@/hooks/useEstabelecimentos';
import type { NichoEstabelecimento } from '@/tipos';
import {
  Container,
  CartaoEstabelecimento,
  Skeleton,
  BotaoIcone,
  ChipGrupo,
  CampoBusca,
  Select,
  Modal,
  BotaoSecundario,
  Icone,
} from '@/componentes';
import { NICHOS } from '@/constantes';
import './Explorar.css';

const Explorar = () => {
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState<'relevancia' | 'distancia' | 'avaliacao' | 'preco'>('relevancia');
  const [nichoSelecionado, setNichoSelecionado] = useState<NichoEstabelecimento | 'todos'>('todos');
  const [cidadeSelecionada, setCidadeSelecionada] = useState<string>('todas');
  const [apenasAbertos, setApenasAbertos] = useState(false);
  const [avaliacaoMinima, setAvaliacaoMinima] = useState(0);
  const [precoMaximo, setPrecoMaximo] = useState(500);
  const [visualizacao, setVisualizacao] = useState<'grid' | 'lista'>('grid');

  const { nichos } = useNichos();
  const { cidades: cidadesHook } = useCidades();

  const {
    estabelecimentos,
    carregando,
    erro,
    temMais,
    buscar,
    carregarMais,
    recarregar,
    limparFiltros: limparFiltrosHook,
  } = useEstabelecimentos({
    busca,
    nicho: nichoSelecionado,
    cidade: cidadeSelecionada,
    ordenacao,
    apenasAbertos,
    avaliacaoMinima,
    precoMaximo,
  });

  const nichosDisponiveis = nichos.map((n) => ({ valor: n, rotulo: NICHOS[n] || n }));
  const cidadesDisponiveis = cidadesHook.map((c) => ({ valor: c, rotulo: c }));

  const handleBusca = (termo: string) => {
    setBusca(termo);
  };

  const handleOrdenacao = (valor: string | string[]) => {
    setOrdenacao(valor as 'relevancia' | 'distancia' | 'avaliacao' | 'preco');
  };

  const handleNicho = (valor: string | string[]) => {
    setNichoSelecionado((valor as string[])[0] as NichoEstabelecimento | 'todos' || 'todos');
  };

  const handleCidade = (valor: string | string[]) => {
    setCidadeSelecionada((valor as string[])[0] || 'todas');
  };

  const handleFiltrar = useCallback(() => {
    buscar({
      busca,
      nicho: nichoSelecionado,
      cidade: cidadeSelecionada,
      ordenacao,
      apenasAbertos,
      avaliacaoMinima,
      precoMaximo,
    });
  }, [buscar, busca, nichoSelecionado, cidadeSelecionada, ordenacao, apenasAbertos, avaliacaoMinima, precoMaximo]);

  const limparFiltros = useCallback(() => {
    setBusca('');
    setNichoSelecionado('todos');
    setCidadeSelecionada('todas');
    setOrdenacao('relevancia');
    setApenasAbertos(false);
    setAvaliacaoMinima(0);
    setPrecoMaximo(500);
    limparFiltrosHook();
  }, [limparFiltrosHook]);

  const temFiltrosAtivos = busca || nichoSelecionado !== 'todos' || cidadeSelecionada !== 'todas' ||
    ordenacao !== 'relevancia' || apenasAbertos || avaliacaoMinima > 0 || precoMaximo < 500;

  // Efeito para buscar quando filtros mudam
  useEffect(() => {
    handleFiltrar();
  }, [handleFiltrar]);

  if (carregando && estabelecimentos.length === 0) {
    return (
      <Container variante="com-cabecalho">
        <div className="explorar__grid" role="list" aria-label="Carregando estabelecimentos">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variante="estabelecimento" data-testid={`explorar-skeleton-${i}`} />
          ))}
        </div>
      </Container>
    );
  }

  return (
    <Container variante="com-cabecalho" data-testid="explorar-container">
      {/* Header com busca e ações */}
      <header className="explorar__cabecalho">
        <div className="explorar__busca-wrapper">
          <CampoBusca
            label="Buscar"
            valor={busca}
            aoAlterar={handleBusca}
            placeholder="Buscar barbearias, salões, serviços..."
            className="explorar__busca"
            data-testid="explorar-busca"
          />
        </div>

        <div className="explorar__acoes">
          <BotaoIcone
            icone={visualizacao === 'grid' ? <Icone nome="lista" tamanho={20} /> : <Icone nome="grade" tamanho={20} />}
            variante="fantasma"
            aoClicar={() => setVisualizacao((v) => v === 'grid' ? 'lista' : 'grid')}
            ariaLabel={visualizacao === 'grid' ? 'Visualizar como lista' : 'Visualizar como grade'}
            data-testid="explorar-toggle-visualizacao"
          />
          <BotaoIcone
            icone={temFiltrosAtivos ? <Icone nome="filtroAtivo" tamanho={20} /> : <Icone nome="filtro" tamanho={20} />}
            variante="fantasma"
            aoClicar={() => setFiltrosAbertos(true)}
            ariaLabel="Filtros"
            className={temFiltrosAtivos ? 'explorar__filtro-ativo' : ''}
            data-testid="explorar-filtros"
          />
        </div>
      </header>

      {/* Filtros Mobile Drawer */}
      <Modal
        aberto={filtrosAbertos}
        aoFechar={() => setFiltrosAbertos(false)}
        titulo="Filtros"
        tamanho="tela-cheia"
        data-testid="modal-filtros"
      >
        <form className="filtros-modal" role="dialog" aria-modal="true" aria-labelledby="filtros-titulo">
          <h2 id="filtros-titulo" className="sr-only">Filtros de busca</h2>
          <div className="filtros-modal__secao">
            <h3>Ordenar por</h3>
            <Select
              label="Ordenar por"
              valor={ordenacao}
              aoAlterar={handleOrdenacao}
              opcoes={[
                { valor: 'relevancia', rotulo: 'Relevância' },
                { valor: 'distancia', rotulo: 'Mais perto' },
                { valor: 'avaliacao', rotulo: 'Melhor avaliado' },
                { valor: 'preco', rotulo: 'Menor preço' },
              ]}
              data-testid="filtros-ordenacao"
            />
          </div>

          <div className="filtros-modal__secao">
            <h3>Nicho</h3>
            <fieldset>
              <legend className="sr-only">Filtrar por nicho</legend>
              <ChipGrupo
                opcoes={[{ valor: 'todos', rotulo: 'Todos' }, ...nichosDisponiveis]}
                selecionados={[nichoSelecionado]}
                aoAlterar={handleNicho}
                multiplo={false}
                variante="selecao"
                data-testid="filtros-nicho"
              />
            </fieldset>
          </div>

          <div className="filtros-modal__secao">
            <h3>Cidade</h3>
            <Select
              label="Cidade"
              valor={cidadeSelecionada}
              aoAlterar={handleCidade}
              opcoes={[{ valor: 'todas', rotulo: 'Todas' }, ...cidadesDisponiveis]}
              buscavel
              data-testid="filtros-cidade"
            />
          </div>

          <div className="filtros-modal__secao">
            <fieldset>
              <legend>Apenas abertos agora</legend>
              <label className="filtros-modal__toggle">
                <input
                  type="checkbox"
                  checked={apenasAbertos}
                  onChange={(e) => setApenasAbertos(e.target.checked)}
                />
                <span>Apenas abertos agora</span>
              </label>
            </fieldset>
          </div>

          <div className="filtros-modal__secao">
            <h3>Avaliação mínima</h3>
            <div className="filtros-modal__avaliacao" role="radiogroup" aria-label="Avaliação mínima">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={avaliacaoMinima >= n}
                  className={`filtros-modal__estrela ${avaliacaoMinima >= n ? 'filtros-modal__estrela--ativa' : ''}`}
                  onClick={() => setAvaliacaoMinima(n)}
                  aria-label={`${n} estrela${n > 1 ? 's' : ''} ou mais`}
                >
                  <Icone nome="estrela" tamanho={20} />
                </button>
              ))}
            </div>
          </div>

          <div className="filtros-modal__secao">
            <label htmlFor="preco-maximo">Preço máximo: R$ {precoMaximo}</label>
            <input
              id="preco-maximo"
              type="range"
              min="0"
              max="500"
              step="50"
              value={precoMaximo}
              onChange={(e) => setPrecoMaximo(Number(e.target.value))}
              className="filtros-modal__range"
            />
          </div>

          {temFiltrosAtivos && (
            <BotaoSecundario aoClicar={limparFiltros} className="filtros-modal__limpar">
              Limpar filtros
            </BotaoSecundario>
          )}
        </form>
      </Modal>

      {/* Resultados */}
      <main className="explorar__main" role="main">
        <div className="explorar__resultados">
          <div className="explorar__contador" aria-live="polite">
            {estabelecimentos.length} estabelecimento{estabelecimentos.length !== 1 ? 's' : ''} encontrado{estabelecimentos.length !== 1 ? 's' : ''}
          </div>

          {estabelecimentos.length > 0 ? (
            <>
              {visualizacao === 'grid' ? (
                <div className="explorar__grid" role="list" aria-label="Estabelecimentos">
                  {estabelecimentos.map((estabelecimento) => (
                    <article key={estabelecimento.id} className="explorar__card-item">
                      <Link
                        to={`/estabelecimento/${estabelecimento.slug}`}
                        className="explorar__card-link"
                        data-testid={`explorar-card-${estabelecimento.id}`}
                      >
                        <CartaoEstabelecimento
                          estabelecimento={estabelecimento}
                          data-testid={`explorar-card-${estabelecimento.id}`}
                        />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="explorar__lista" role="list" aria-label="Estabelecimentos">
                  {estabelecimentos.map((estabelecimento) => (
                    <article key={estabelecimento.id} className="explorar__card-item">
                      <Link
                        to={`/estabelecimento/${estabelecimento.slug}`}
                        className="explorar__card-link"
                        data-testid={`explorar-card-${estabelecimento.id}`}
                      >
                        <CartaoEstabelecimento
                          estabelecimento={estabelecimento}
                          data-testid={`explorar-card-${estabelecimento.id}`}
                        />
                      </Link>
                    </article>
                  ))}
                </div>
              )}

              {temMais && (
                <div className="explorar__carregar-mais">
                  <BotaoSecundario aoClicar={carregarMais} desabilitado={carregando}>
                    {carregando ? 'Carregando...' : 'Carregar mais'}
                  </BotaoSecundario>
                </div>
              )}
            </>
          ) : (
            <section className="explorar__vazio" data-testid="explorar-vazio" aria-labelledby="vazio-titulo">
              <div className="explorar__vazio-icone" aria-hidden="true"><Icone nome="busca" tamanho={48} /></div>
              <h2 id="vazio-titulo" className="explorar__vazio-titulo">Nenhum estabelecimento encontrado</h2>
              <p className="explorar__vazio-texto">
                {temFiltrosAtivos
                  ? 'Tente ajustar seus filtros ou busque por outro termo.'
                  : 'Cadastre-se como barbeiro para aparecer aqui!'}
              </p>
              {temFiltrosAtivos && (
                <BotaoSecundario aoClicar={limparFiltros}>Limpar filtros</BotaoSecundario>
              )}
            </section>
          )}

          {erro && (
            <div className="explorar__erro" role="alert">
              <span><Icone nome="alerta" tamanho={20} /></span>
              <p>{erro}</p>
              <BotaoSecundario aoClicar={recarregar}>Tentar novamente</BotaoSecundario>
            </div>
          )}
        </div>
      </main>
    </Container>
  );
};

export default Explorar;