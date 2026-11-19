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
} from '@/componentes';
import { ICONES } from '@/constantes';
import { formatarMoeda, formatarDataCurta } from '@/utilitarios/formatar';
import './Estabelecimento.css';

const Estabelecimento = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { sucesso, erro: toastErro } = useGlobalToast();

  const { estabelecimento, carregando, recarregar } = useEstabelecimento(slug || null);

  const [abaAtiva, setAbaAtiva] = useState<'servicos' | 'galeria' | 'avaliacoes' | 'info'>('servicos');
  const [servicoSelecionado, setServicoSelecionado] = useState<any>(null);
  const [mostrarModalAgendar, setMostrarModalAgendar] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<string>('');
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('');
  const [horariosDisponiveis] = useState<string[]>([]);

  useEffect(() => {
    if (slug) {
      recarregar();
    }
  }, [slug, recarregar]);

  const handleAgendar = useCallback((servico: any) => {
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
    } catch (e) {
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
            <span className="estabelecimento__erro-icone" aria-hidden="true">{ICONES.alerta}</span>
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
                  icone={ICONES[estabelecimento.nicho as keyof typeof ICONES] || ICONES.tesoura}
                >
                  {estabelecimento.nicho}
                </Chip>
              </p>
              <div className="estabelecimento__meta">
                <span className="estabelecimento__avaliacao">
                  <span aria-hidden="true">⭐</span> {estabelecimento.avaliacao?.toFixed(1) || '–'}
                  <span className="estabelecimento__avaliacao-count">({estabelecimento.avaliacoes?.length || 0})</span>
                </span>
                <span className="estabelecimento__localizacao">
                  {ICONES.localizacao} {estabelecimento.cidade}
                </span>
                <span className="estabelecimento__whatsapp">
                  <a href={`https://wa.me/${estabelecimento.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noopener">
                    {ICONES.whatsapp} Agendar
                  </a>
                </span>
              </div>
            </div>
          </div>
        </header>

        <nav className="estabelecimento__abas" role="tablist" aria-label="Seções do estabelecimento">
          <button
            role="tab"
            aria-selected={abaAtiva === 'servicos'}
            onClick={() => setAbaAtiva('servicos')}
            className={abaAtiva === 'servicos' ? 'estabelecimento__aba ativa' : 'estabelecimento__aba'}
          >
            {ICONES.tesoura} Serviços
          </button>
          <button
            role="tab"
            aria-selected={abaAtiva === 'galeria'}
            onClick={() => setAbaAtiva('galeria')}
            className={abaAtiva === 'galeria' ? 'estabelecimento__aba ativa' : 'estabelecimento__aba'}
          >
            {ICONES.foto} Galeria
          </button>
          <button
            role="tab"
            aria-selected={abaAtiva === 'avaliacoes'}
            onClick={() => setAbaAtiva('avaliacoes')}
            className={abaAtiva === 'avaliacoes' ? 'estabelecimento__aba ativa' : 'estabelecimento__aba'}
          >
            {ICONES.estrela} Avaliações
          </button>
          <button
            role="tab"
            aria-selected={abaAtiva === 'info'}
            onClick={() => setAbaAtiva('info')}
            className={abaAtiva === 'info' ? 'estabelecimento__aba ativa' : 'estabelecimento__aba'}
          >
            {ICONES.info} Informações
          </button>
        </nav>

        <main className="estabelecimento__conteudo">
          {abaAtiva === 'servicos' && (
            <section className="estabelecimento__secao" aria-label="Serviços">
              {estabelecimento.servicos?.length > 0 ? (
                <div className="estabelecimento__servicos-grid">
                  {estabelecimento.servicos.map((servico: any) => (
                    <div key={servico.id} className="estabelecimento__servico-card" data-testid={`servico-${servico.id}`} onClick={() => handleAgendar(servico)}>
                      <div className="estabelecimento__servico-info">
                        <strong>{servico.nome}</strong>
                        <span className="estabelecimento__servico-tag">{servico.tag}</span>
                      </div>
                      <div className="estabelecimento__servico-detalhes">
                        <span>{formatarMoeda(servico.preco)}</span>
                        <span>{servico.duracaoMinutos} min</span>
                      </div>
                      <button className="estabelecimento__servico-btn" onClick={(e) => { e.stopPropagation(); handleAgendar(servico); }}>
                        {ICONES.setaDireita}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="estabelecimento__vazio">
                  <span aria-hidden="true">{ICONES.tesoura}</span>
                  <p>Nenhum serviço cadastrado</p>
                </div>
              )}
            </section>
          )}

          {abaAtiva === 'galeria' && (
            <section className="estabelecimento__secao" aria-label="Galeria">
              {estabelecimento.galeria?.length > 0 ? (
                <div className="estabelecimento__galeria-grid">
                  {estabelecimento.galeria.map((item: any, idx: number) => (
                    <div key={item.id || idx} className="estabelecimento__galeria-item">
                      <img
                        src={item.src}
                        alt={`Foto ${idx + 1} de ${estabelecimento.nome}`}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="estabelecimento__vazio">
                  <span aria-hidden="true">{ICONES.foto}</span>
                  <p>Nenhuma foto na galeria</p>
                </div>
              )}
            </section>
          )}

          {abaAtiva === 'avaliacoes' && (
            <section className="estabelecimento__secao" aria-label="Avaliações">
              {estabelecimento.avaliacoes?.length > 0 ? (
                <div className="estabelecimento__avaliacoes-lista">
                  {estabelecimento.avaliacoes.map((av: any) => (
                    <article key={av.id} className="estabelecimento__avaliacao-card">
                      <header className="estabelecimento__avaliacao-header">
                        <Avatar
                          src={av.avatar}
                          nome={av.nomeCliente}
                          tamanho="pequeno"
                        />
                        <div>
                          <strong>{av.nomeCliente}</strong>
                          <span className="estabelecimento__avaliacao-data">
                            {formatarDataCurta(av.data)}
                          </span>
                        </div>
                      </header>
                      <div className="estabelecimento__avaliacao-estrelas">
                        {'★'.repeat(av.estrelas)}{'☆'.repeat(5 - av.estrelas)}
                      </div>
                      <p className="estabelecimento__avaliacao-comentario">{av.comentario}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="estabelecimento__vazio">
                  <span aria-hidden="true">{ICONES.estrela}</span>
                  <p>Nenhuma avaliação ainda</p>
                </div>
              )}
            </section>
          )}

          {abaAtiva === 'info' && (
            <section className="estabelecimento__secao" aria-label="Informações">
              <div className="estabelecimento__info-grid">
                <article className="estabelecimento__info-card">
                  <h3>{ICONES.info} Sobre</h3>
                  <p>{estabelecimento.sobre || 'Sem descrição disponível.'}</p>
                </article>
                <article className="estabelecimento__info-card">
                  <h3>{ICONES.localizacao} Endereço</h3>
                  <address>{estabelecimento.endereco}</address>
                  <p>{estabelecimento.cidade}</p>
                </article>
                <article className="estabelecimento__info-card">
                  <h3>{ICONES.relogio} Horário de Funcionamento</h3>
                  <p>{estabelecimento.horarioFuncionamento || 'Não informado'}</p>
                </article>
                <article className="estabelecimento__info-card">
                  <h3>{ICONES.whatsapp} Contato</h3>
                  <a href={`https://wa.me/${estabelecimento.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noopener">
                    {estabelecimento.whatsapp}
                  </a>
                </article>
              </div>
            </section>
          )}
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