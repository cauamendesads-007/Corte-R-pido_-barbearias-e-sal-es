/**
 * Tela Feed - Feed principal de publicações (inspirações, cortes, dicas).
 * Scroll infinito, pull-to-refresh, criar publicação (barbeiro), FAB.
 */

import { useState, useRef, useEffect } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/servicos/api';
import {
  Container,
  CartaoPublicacao,
  Skeleton,
  BotaoPrimario,
  BotaoSecundario,
  ModalFormulario,
  Textarea,
  CampoBusca,
  ToastProvider,
  useGlobalToast,
  Icone,
} from '@/componentes';
import './Feed.css';

const Feed = () => {
  const { usuario } = useAuth();
  const { publicacoes, carregando, carregandoMais, erro, temMais, curtir, salvar, compartilhar, recarregar, carregarMais } = useFeed('todos');
  const { sucesso, erro: toastErro } = useGlobalToast();
  const [novaPublicacaoAberta, setNovaPublicacaoAberta] = useState(false);
  const [legenda, setLegenda] = useState('');
  const [servicoSelecionado, setServicoSelecionado] = useState<string>('');
  const [midias, setMidias] = useState<Array<{ tipo: 'imagem' | 'video'; src: string }>>([]);
  const [criando, setCriando] = useState(false);
  const observadorRef = useRef<IntersectionObserver>();
  const sentinelaRef = useRef<HTMLDivElement>(null);

  // Intersection Observer para scroll infinito
  useEffect(() => {
    observadorRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && temMais && !carregandoMais) {
          carregarMais();
        }
      },
      { rootMargin: '200px' }
    );

    if (sentinelaRef.current) {
      observadorRef.current.observe(sentinelaRef.current);
    }

    return () => observadorRef.current?.disconnect();
  }, [temMais, carregandoMais, carregarMais]);

  const handleCriarPublicacao = async () => {
    if (!legenda.trim() || midias.length === 0 || !servicoSelecionado) {
      toastErro('Preencha a legenda, selecione um serviço e adicione pelo menos uma mídia');
      return;
    }

    setCriando(true);

    try {
      // Busca tag do serviço se fornecido
      let tagServico: string | undefined;
      if (servicoSelecionado) {
        const estResposta = await api.estabelecimentos.obter(usuario?.estabelecimentoId || '');
        if (estResposta.sucesso && estResposta.dados) {
          const servico = estResposta.dados.servicos.find((s) => s.id === servicoSelecionado);
          tagServico = servico?.tag;
        }
      }

      const primeiraMidia = midias[0];
      const resposta = await api.feed.criar({
        estabelecimentoId: usuario?.estabelecimentoId || '',
        tipo: 'outro',
        legenda: legenda.trim(),
        tagServico,
        midias: primeiraMidia ? [{ tipo: primeiraMidia.tipo, src: primeiraMidia.src }] : [],
      });

      if (resposta.sucesso && resposta.dados) {
        sucesso('Publicação criada!');
        setNovaPublicacaoAberta(false);
        setLegenda('');
        setServicoSelecionado('');
        setMidias([]);
      } else {
        toastErro(resposta.erro || 'Erro ao criar publicação');
      }
    } catch {
      toastErro('Erro de conexão. Tente novamente.');
    } finally {
      setCriando(false);
    }
  };

  const handleAdicionarMidia = (arquivo: File) => {
    if (midias.length >= 5) {
      toastErro('Máximo de 5 mídias por publicação');
      return;
    }

    const tipo = arquivo.type.startsWith('video/') ? 'video' : 'imagem';
    const src = URL.createObjectURL(arquivo);
    setMidias((prev) => [...prev, { tipo, src }]);
  };

  const handleRemoverMidia = (index: number) => {
    URL.revokeObjectURL(midias[index].src);
    setMidias((prev) => prev.filter((_, i) => i !== index));
  };

  if (carregando && publicacoes.length === 0) {
    return (
      <Container variante="com-cabecalho">
        <Skeleton variante="feed" linhas={3} data-testid="feed-skeleton" />
      </Container>
    );
  }

  return (
    <ToastProvider>
      <Container variante="com-cabecalho" data-testid="feed-container">
        {/* Header do feed */}
        <header className="feed__cabecalho">
          <h1 className="feed__titulo">Feed</h1>
          {usuario?.papel === 'barbeiro' && (
            <BotaoPrimario
              iconeEsquerda={<Icone nome="mais" tamanho={16} />}
              aoClicar={() => setNovaPublicacaoAberta(true)}
              className="feed__btn-nova"
              data-testid="feed-nova-publicacao"
            >
              Nova publicação
            </BotaoPrimario>
          )}
        </header>

        {/* Lista de publicações */}
        <main className="feed__main" role="main">
          <section className="feed__lista" aria-label="Publicações">
            {publicacoes
              .map((publicacao) => (
                <article key={publicacao.id} className="feed__publicacao-item">
                  <CartaoPublicacao
                    publicacao={{
                      id: publicacao.id,
                      legenda: publicacao.legenda,
                      tagServico: publicacao.tagServico,
                      src: publicacao.midias?.[0]?.src,
                      tipo: (publicacao.midias?.[0]?.tipo || 'imagem') as 'imagem' | 'video',
                      curtidas: publicacao.curtidas,
                      salvos: publicacao.salvos,
                      comentarios: publicacao.comentarios,
                      dataCriacao: publicacao.dataCriacao,
                      usuarioCurtiu: publicacao.usuarioCurtiu ?? false,
                      usuarioSalvou: publicacao.usuarioSalvou ?? false,
                      estabelecimento: {
                        id: publicacao.estabelecimentoId,
                        nome: publicacao.autorNome,
                        cidade: '',
                        tema: { cor: '' },
                        avaliacao: 0,
                      },
                    }}
                    aoCurtir={() => curtir(publicacao.id)}
                    aoSalvar={() => salvar(publicacao.id)}
                    aoCompartilhar={() => compartilhar(publicacao.id)}
                    aoAbrir={() => {}}
                    aoAgendar={() => {}}
                    data-testid={`feed-publicacao-${publicacao.id}`}
                  />
                </article>
              ))}

            {/* Skeletons durante carregamento mais */}
            {carregandoMais && Array.from({ length: 2 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="feed__skeleton-item" aria-hidden="true">
                <Skeleton variante="publicacao" data-testid={`feed-skeleton-${i}`} />
              </div>
            ))}

            {/* Sentinela para intersection observer */}
            <div ref={sentinelaRef} data-testid="feed-sentinela" aria-hidden="true" />
          </section>

          {/* Estado vazio */}
          {publicacoes.length === 0 && !carregando && (
            <section className="feed__vazio" data-testid="feed-vazio" aria-labelledby="vazio-titulo">
              <div className="feed__vazio-icone" aria-hidden="true"><Icone nome="feed" tamanho={48} /></div>
              <h2 id="vazio-titulo" className="feed__vazio-titulo">Nenhuma publicação ainda</h2>
              <p className="feed__vazio-texto">
                {usuario?.papel === 'barbeiro'
                  ? 'Seja o primeiro a compartilhar seus cortes!'
                  : 'Siga barbeiros e salões para ver suas publicações aqui.'}
              </p>
              {usuario?.papel === 'barbeiro' && (
                <BotaoPrimario iconeEsquerda={<Icone nome="mais" tamanho={16} />} aoClicar={() => setNovaPublicacaoAberta(true)}>
                  Criar primeira publicação
                </BotaoPrimario>
              )}
            </section>
          )}

          {/* Erro */}
          {erro && (
            <div className="feed__erro" data-testid="feed-erro" role="alert">
              <span><Icone nome="alerta" tamanho={20} /></span>
              <p>{erro}</p>
              <BotaoSecundario aoClicar={recarregar}>Tentar novamente</BotaoSecundario>
            </div>
          )}
        </main>
      </Container>

      {/* Modal Nova Publicação */}
      <ModalFormulario
        aberto={novaPublicacaoAberta}
        aoFechar={() => setNovaPublicacaoAberta(false)}
        titulo="Nova publicação"
        aoSalvar={handleCriarPublicacao}
        carregando={criando}
        tamanho="grande"
        data-testid="modal-nova-publicacao"
      >
        <form className="nova-publicacao" onSubmit={(e) => { e.preventDefault(); handleCriarPublicacao(); }}>
          <Textarea
            label="Legenda"
            placeholder="Conte sobre este corte, técnica usada, produtos..."
            valor={legenda}
            aoAlterar={setLegenda}
            linhas={4}
            maxLength={500}
            mostrarContador
            obrigatorio
            data-testid="nova-publicacao-legenda"
          />

          <CampoBusca
            label="Serviço relacionado"
            placeholder="Buscar serviço..."
            valor={servicoSelecionado}
            aoAlterar={setServicoSelecionado}
            data-testid="nova-publicacao-servico"
          />

          <fieldset className="nova-publicacao__midias">
            <legend>Mídias (máx. 5)</legend>
            <div className="nova-publicacao__midias-grid">
              {midias.map((midia, index) => (
                <figure key={index} className="nova-publicacao__midia-item">
                  {midia.tipo === 'video' ? (
                    <video src={midia.src} controls playsInline />
                  ) : (
                    <img src={midia.src} alt={`Mídia ${index + 1} da publicação`} />
                  )}
                  <figcaption className="sr-only">Mídia {index + 1}</figcaption>
                  <button
                    type="button"
                    className="nova-publicacao__midia-remover"
                    onClick={() => handleRemoverMidia(index)}
                    aria-label={`Remover mídia ${index + 1}`}
                  >
                    <Icone nome="x" tamanho={16} />
                  </button>
                </figure>
              ))}
              {midias.length < 5 && (
                <label className="nova-publicacao__midia-add">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => Array.from(e.target.files || []).forEach(handleAdicionarMidia)}
                    hidden
                  />
                  <Icone nome="mais" tamanho={24} />
                  <span>Adicionar</span>
                </label>
              )}
            </div>
          </fieldset>
        </form>
      </ModalFormulario>
    </ToastProvider>
  );
};

export default Feed;