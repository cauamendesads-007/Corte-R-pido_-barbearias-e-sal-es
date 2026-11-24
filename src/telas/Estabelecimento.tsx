/**
 * Tela Estabelecimento - Detalhes de uma barbearia/salão.
 * Exibe informações, serviços, galeria, avaliações e permite agendar.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEstabelecimento } from '@/hooks/useEstabelecimentos';
import { useAuth } from '@/hooks/useAuth';
import {
  Container,
  Botao,
  BotaoPrimario,
  Chip,
  Avatar,
  Skeleton,
  Modal,
  ToastProvider,
  useGlobalToast,
  Icone,
} from '@/componentes';
import { formatarMoeda, formatarDataCurta } from '@/utilitarios/formatar';
import type { Servico, Avaliacao } from '@/tipos';
import './Estabelecimento.css';

const Estabelecimento = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { sucesso, erro: toastErro } = useGlobalToast();

  const { estabelecimento, carregando, recarregar } = useEstabelecimento(slug || null);

  const [abaAtiva, setAbaAtiva] = useState<'servicos' | 'galeria' | 'avaliacoes' | 'info'>('servicos');
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null);
  const [mostrarModalAgendar, setMostrarModalAgendar] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<string>('');
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('');
  const [horariosDisponiveis] = useState<string[]>([]);

  useEffect(() => {
    if (slug) {
      recarregar();
    }
  }, [slug, recarregar]);

  const handleAgendar = useCallback((servico: Servico) => {
    if (!usuario) {
      navigate('/login', { state: { from: `/estabelecimento/${slug}` } });
      return;
    }
    setServicoSelecionado(servico);
    setMostrarModalAgendar(true);
    // TODO: carregar horários disponíveis para o serviço
  }, [usuario, navigate, slug]);

  const handleConfirmarAgendamento = async () => {
    if (!servicoSelecionado || !diaSelecionado || !horarioSelecionado) return;

    try {
      // TODO: chamar API de agendamento
      sucesso('Agendamento confirmado!');
      setMostrarModalAgendar(false);
      setServicoSelecionado(null);
    } catch {
      toastErro('Erro ao confirmar agendamento');
    }
  };

  if (carregando) {
    return (
      <ToastProvider>
        <Container variante="com-cabecalho" data-testid="estabelecimento-container">
          <div className="estabelecimento__carregando" role="status" aria-label="Carregando estabelecimento">
            <Skeleton variante="estabelecimento" />
            <Skeleton variante="estabelecimento" />
            <Skeleton variante="estabelecimento" />
          </div>
        </Container>
      </ToastProvider>
    );
  }

  if (!estabelecimento) {
    return (
      <ToastProvider>
        <Container variante="com-cabecalho" data-testid="estabelecimento-container">
          <div className="estabelecimento__erro" role="alert">
            <span className="estabelecimento__erro-icone" aria-hidden="true"><Icone nome="alerta" tamanho={24} /></span>
            <h2>Estabelecimento não encontrado</h2>
            <p>Este estabelecimento não existe ou foi removido.</p>
            <BotaoPrimario aoClicar={() => navigate('/explorar')} data-testid="btn-voltar-explorar">
              Voltar para explorar
            </BotaoPrimario>
          </div>
        </Container>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Container variante="com-cabecalho" data-testid="estabelecimento-container">
        <header className="estabelecimento__header">
          <div className="estabelecimento__header-conteudo">
            <div className="estabelecimento__avatar-wrapper">
              <Avatar
                src={estabelecimento.tema?.cor}
                nome={estabelecimento.nome}
                tamanho="grande"
                className="estabelecimento__avatar"
              />
            </div>
            <div className="estabelecimento__info-principal">
              <h1 className="estabelecimento__nome">{estabelecimento.nome}</h1>
              <p className="estabelecimento__categoria">
                <Chip
                  variante="nicho"
                  icone={<Icone nome={estabelecimento.nicho === 'feminino' ? 'usuario' : estabelecimento.nicho === 'visagismo' ? 'tesoura' : estabelecimento.nicho === 'infantil' ? 'casa' : 'tesoura'} tamanho={14} />}
                >
                  {estabelecimento.nicho}
                </Chip>
              </p>
              <div className="estabelecimento__meta">
                <span className="estabelecimento__avaliacao">
                  <span aria-hidden="true"><Icone nome="estrela" tamanho={14} /></span> {estabelecimento.avaliacao?.toFixed(1) || '–'}
                  <span className="estabelecimento__avaliacao-count">({estabelecimento.avaliacoes?.length || 0})</span>
                </span>
                <span className="estabelecimento__localizacao">
                  <Icone nome="localizacao" tamanho={14} /> {estabelecimento.cidade}
                </span>
                <span className="estabelecimento__whatsapp">
                  <a href={`https://wa.me/${estabelecimento.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                    <Icone nome="whatsapp" tamanho={14} /> Agendar
                  </a>
                </span>
              </div>
            </div>
          </div>
        </header>

        <nav className="estabelecimento__abas" role="tablist" aria-label="Seções do estabelecimento">
          <button
            role="tab"
            id="aba-servicos"
            aria-selected={abaAtiva === 'servicos'}
            aria-controls="painel-servicos"
            onClick={() => setAbaAtiva('servicos')}
            className={abaAtiva === 'servicos' ? 'estabelecimento__aba ativa' : 'estabelecimento__aba'}
          >
            <Icone nome="tesoura" tamanho={18} /> Serviços
          </button>
          <button
            role="tab"
            id="aba-galeria"
            aria-selected={abaAtiva === 'galeria'}
            aria-controls="painel-galeria"
            onClick={() => setAbaAtiva('galeria')}
            className={abaAtiva === 'galeria' ? 'estabelecimento__aba ativa' : 'estabelecimento__aba'}
          >
            <Icone nome="foto" tamanho={18} /> Galeria
          </button>
          <button
            role="tab"
            id="aba-avaliacoes"
            aria-selected={abaAtiva === 'avaliacoes'}
            aria-controls="painel-avaliacoes"
            onClick={() => setAbaAtiva('avaliacoes')}
            className={abaAtiva === 'avaliacoes' ? 'estabelecimento__aba ativa' : 'estabelecimento__aba'}
          >
            <Icone nome="estrela" tamanho={18} /> Avaliações
          </button>
          <button
            role="tab"
            id="aba-info"
            aria-selected={abaAtiva === 'info'}
            aria-controls="painel-info"
            onClick={() => setAbaAtiva('info')}
            className={abaAtiva === 'info' ? 'estabelecimento__aba ativa' : 'estabelecimento__aba'}
          >
            <Icone nome="info" tamanho={18} /> Informações
          </button>
        </nav>

        <main className="estabelecimento__conteudo" role="main">
          <section
            className="estabelecimento__secao"
            role="tabpanel"
            id="painel-servicos"
            aria-labelledby="aba-servicos"
            hidden={abaAtiva !== 'servicos'}
          >
            {estabelecimento.servicos?.length > 0 ? (
              <div className="estabelecimento__servicos-grid">
                {estabelecimento.servicos.map((servico: Servico) => (
                  <article key={servico.id} className="estabelecimento__servico-card" data-testid={`servico-${servico.id}`}>
                    <div className="estabelecimento__servico-info">
                      <strong>{servico.nome}</strong>
                      <span className="estabelecimento__servico-tag">{servico.tag}</span>
                    </div>
                    <div className="estabelecimento__servico-detalhes">
                      <span>{formatarMoeda(servico.preco)}</span>
                      <span>{servico.duracaoMinutos} min</span>
                    </div>
                    <button className="estabelecimento__servico-btn" onClick={() => handleAgendar(servico)}>
                      <Icone nome="setaDireita" tamanho={18} />
                      <span className="sr-only">Agendar {servico.nome}</span>
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="estabelecimento__vazio" aria-labelledby="vazio-servicos-titulo">
                <span aria-hidden="true"><Icone nome="tesoura" tamanho={48} /></span>
                <p id="vazio-servicos-titulo">Nenhum serviço cadastrado</p>
              </div>
            )}
          </section>

          <section
            className="estabelecimento__secao"
            role="tabpanel"
            id="painel-galeria"
            aria-labelledby="aba-galeria"
            hidden={abaAtiva !== 'galeria'}
          >
            {estabelecimento.galeria?.length > 0 ? (
              <div className="estabelecimento__galeria-grid">
                {estabelecimento.galeria.map((item: { id?: string; src: string }, idx: number) => (
                  <figure key={item.id || idx} className="estabelecimento__galeria-item">
                    <img
                      src={item.src}
                      alt={`Foto ${idx + 1} de ${estabelecimento.nome}`}
                      loading="lazy"
                    />
                    <figcaption className="sr-only">Foto {idx + 1}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="estabelecimento__vazio" aria-labelledby="vazio-galeria-titulo">
                <span aria-hidden="true"><Icone nome="foto" tamanho={48} /></span>
                <p id="vazio-galeria-titulo">Nenhuma foto na galeria</p>
              </div>
            )}
          </section>

          <section
            className="estabelecimento__secao"
            role="tabpanel"
            id="painel-avaliacoes"
            aria-labelledby="aba-avaliacoes"
            hidden={abaAtiva !== 'avaliacoes'}
          >
            {estabelecimento.avaliacoes?.length > 0 ? (
              <div className="estabelecimento__avaliacoes-lista">
                {estabelecimento.avaliacoes.map((av: Avaliacao) => (
                  <article key={av.id} className="estabelecimento__avaliacao-card">
                    <header className="estabelecimento__avaliacao-header">
                      <Avatar
                        nome={av.nomeCliente}
                        tamanho="pequeno"
                      />
                      <div>
                        <strong>{av.nomeCliente}</strong>
                        <time className="estabelecimento__avaliacao-data" dateTime={av.data}>
                          {formatarDataCurta(av.data)}
                        </time>
                      </div>
                    </header>
                    <div className="estabelecimento__avaliacao-estrelas" aria-label={`${av.estrelas} de 5 estrelas`}>
                      <span aria-hidden="true">{'★'.repeat(av.estrelas)}{'☆'.repeat(5 - av.estrelas)}</span>
                    </div>
                    <p className="estabelecimento__avaliacao-comentario">{av.comentario}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="estabelecimento__vazio" aria-labelledby="vazio-avaliacoes-titulo">
                <span aria-hidden="true"><Icone nome="estrela" tamanho={48} /></span>
                <p id="vazio-avaliacoes-titulo">Nenhuma avaliação ainda</p>
              </div>
            )}
          </section>

          <section
            className="estabelecimento__secao"
            role="tabpanel"
            id="painel-info"
            aria-labelledby="aba-info"
            hidden={abaAtiva !== 'info'}
          >
            <div className="estabelecimento__info-grid">
              <article className="estabelecimento__info-card">
                <h3><Icone nome="info" tamanho={18} /> Sobre</h3>
                <p>{estabelecimento.sobre || 'Sem descrição disponível.'}</p>
              </article>
              <article className="estabelecimento__info-card">
                <h3><Icone nome="localizacao" tamanho={18} /> Endereço</h3>
                <address>{estabelecimento.endereco}</address>
                <p>{estabelecimento.cidade}</p>
              </article>
              <article className="estabelecimento__info-card">
                <h3><Icone nome="relogio" tamanho={18} /> Horário de Funcionamento</h3>
                <p>{estabelecimento.horarioFuncionamento || 'Não informado'}</p>
              </article>
              <article className="estabelecimento__info-card">
                <h3><Icone nome="whatsapp" tamanho={18} /> Contato</h3>
                <a href={`https://wa.me/${estabelecimento.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                  {estabelecimento.whatsapp}
                </a>
              </article>
            </div>
          </section>
        </main>

        {/* Modal de Agendamento */}
        <Modal
          aberto={mostrarModalAgendar}
          aoFechar={() => setMostrarModalAgendar(false)}
          titulo="Confirmar agendamento"
          data-testid="modal-agendar"
        >
          {servicoSelecionado && (
            <div className="modal-agendar__conteudo">
              <div className="modal-agendar__servico">
                <strong>{servicoSelecionado.nome}</strong>
                <span>{formatarMoeda(servicoSelecionado.preco)}</span>
                <span>{servicoSelecionado.duracaoMinutos} min</span>
              </div>
              <div className="modal-agendar__campos">
                <label>
                  <span>Data</span>
                  <input
                    type="date"
                    value={diaSelecionado}
                    onChange={(e) => setDiaSelecionado(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </label>
                <label>
                  <span>Horário</span>
                  <select
                    value={horarioSelecionado}
                    onChange={(e) => setHorarioSelecionado(e.target.value)}
                    required
                  >
                    <option value="">Selecione a data primeiro</option>
                    {horariosDisponiveis.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="modal-agendar__botoes">
                <Botao aoClicar={() => setMostrarModalAgendar(false)}>Cancelar</Botao>
                <BotaoPrimario aoClicar={handleConfirmarAgendamento} desabilitado={!diaSelecionado || !horarioSelecionado}>
                  Confirmar
                </BotaoPrimario>
              </div>
            </div>
          )}
        </Modal>
      </Container>
    </ToastProvider>
  );
};

export default Estabelecimento;