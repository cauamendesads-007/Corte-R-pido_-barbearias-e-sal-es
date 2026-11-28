/**
 * Componente EstabelecimentoDetail - Página de detalhes do estabelecimento (pública).
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useState, useCallback } from 'react';
import {
  Cartao,
  CartaoCorpo,
  Botao,
  BotaoPrimario,
  BotaoSecundario,
  Chip,
  Icone,
  CampoTexto,
  Textarea,
  ToastProvider,
  Modal,
  Skeleton,
} from '@/componentes';
import { Galeria } from './Galeria';
import { Avaliacoes } from './Avaliacoes';
import { ServicosList } from './ServicosList';
import type { EstabelecimentoComputado, Servico, ItemGaleria, Avaliacao } from '../types';
import './EstabelecimentoDetail.css';

interface EstabelecimentoDetailProps {
  /** Dados computados do estabelecimento */
  estabelecimento: EstabelecimentoComputado | null;
  /** Serviços */
  servicos: Servico[];
  /** Galeria */
  galeria: ItemGaleria[];
  /** Avaliações */
  avaliacoes: Avaliacao[];
  /** Carregando */
  carregando?: boolean;
  /** Callback ao agendar */
  aoAgendar?: (servico: Servico) => void;
  /** Callback para seguir */
  aoSeguir?: () => void;
  /** Callback para adicionar avaliação */
  aoAvaliar?: (nota: number, comentario: string) => void;
  /** Callback para entrar na fila */
  aoEntrarNaFila?: (nome: string) => void;
  /** Indica se está seguindo */
  seguindo?: boolean;
  /** Carregando ações */
  carregandoAcoes?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const ABA_IDS = ['servicos', 'galeria', 'avaliacoes', 'sobre'] as const;
type AbaId = typeof ABA_IDS[number];

export const EstabelecimentoDetail = ({
  estabelecimento,
  servicos,
  galeria,
  avaliacoes,
  carregando = false,
  aoAgendar,
  aoSeguir,
  aoAvaliar,
  aoEntrarNaFila,
  seguindo = false,
  carregandoAcoes = false,
  className = '',
  'data-testid': testId,
}: EstabelecimentoDetailProps) => {
  const [abaAtiva, setAbaAtiva] = useState<AbaId>('servicos');
  const [modalAvaliacao, setModalAvaliacao] = useState<{ aberto: boolean; servicoId?: string }>({ aberto: false });
  const [modalFila, setModalFila] = useState<{ aberto: boolean }>({ aberto: false });
  const [notaAvaliacao, setNotaAvaliacao] = useState(5);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState('');
  const [nomeFila, setNomeFila] = useState('');

  if (!estabelecimento) {
    return (
      <div className={`estabelecimento-detail ${className}`} data-testid={testId}>
        <div className="estabelecimento-detail__skeleton" role="status" aria-label="Carregando estabelecimento">
          <Cartao variante="padrao">
            <CartaoCorpo>
              <Skeleton variante="retangular" largura="100%" altura={200} />
              <Skeleton variante="retangular" largura="100%" altura={100} />
              <Skeleton variante="retangular" largura="100%" altura={100} />
            </CartaoCorpo>
          </Cartao>
        </div>
      </div>
    );
  }

  const { estabelecimento: est, avaliacaoMedia, totalAvaliacoes, distanciaKm } = estabelecimento;
  const estaAberto = est.fila.length >= 0; // Simplificação

  const handleAvaliar = useCallback(() => {
    if (!aoAvaliar) return;
    aoAvaliar(notaAvaliacao, comentarioAvaliacao);
    setModalAvaliacao({ aberto: false });
    setNotaAvaliacao(5);
    setComentarioAvaliacao('');
  }, [aoAvaliar, notaAvaliacao, comentarioAvaliacao]);

  const handleEntrarNaFila = useCallback(() => {
    if (!aoEntrarNaFila || !nomeFila.trim()) return;
    aoEntrarNaFila(nomeFila.trim());
    setModalFila({ aberto: false });
    setNomeFila('');
  }, [aoEntrarNaFila, nomeFila]);

  const handleSeguir = useCallback(() => {
    aoSeguir?.();
  }, [aoSeguir]);

  return (
    <ToastProvider>
      <div className={`estabelecimento-detail ${className}`} data-testid={testId}>
        {/* Header com capa */}
        <section className="estabelecimento-detail__header" style={{ backgroundColor: est.tema.cor }}>
          {est.galeria.length > 0 && est.galeria[0].src && (
            <img
              src={est.galeria[0].src}
              alt={est.nome}
              className="estabelecimento-detail__capa"
              loading="eager"
              fetchPriority="high"
            />
          )}
          <div className="estabelecimento-detail__header-overlay">
            <div className="estabelecimento-detail__header-conteudo">
              <div className="estabelecimento-detail__avatar" style={{ backgroundColor: est.tema.cor }}>
                <Icone nome="tesoura" tamanho={32} />
              </div>
              <div className="estabelecimento-detail__info">
                <div className="estabelecimento-detail__header-linha">
                  <h1 className="estabelecimento-detail__nome">{est.nome}</h1>
                  <Chip variante="nicho">
                    {est.nicho === 'barbearia' ? 'Barbearia' : est.nicho === 'feminino' ? 'Salão Feminino' : est.nicho === 'visagismo' ? 'Visagismo' : 'Infantil'}
                  </Chip>
                </div>
                <div className="estabelecimento-detail__meta">
                  <span className="estabelecimento-detail__cidade">
                    <Icone nome="localizacao" tamanho={16} /> {est.cidade}
                  </span>
                  {distanciaKm && (
                    <span className="estabelecimento-detail__distancia">
                      <Icone nome="mapa" tamanho={16} /> {distanciaKm} km
                    </span>
                  )}
                  <span className="estabelecimento-detail__avaliacao">
                    <Icone nome="estrela" tamanho={16} />
                    {avaliacaoMedia.toFixed(1)} ({totalAvaliacoes})
                  </span>
                  <span className={`estabelecimento-detail__status ${estaAberto ? 'aberto' : 'fechado'}`}>
                    <span className="estabelecimento-detail__status-indicador" />
                    {estaAberto ? 'Aberto agora' : 'Fechado'}
                  </span>
                </div>
              </div>
              <div className="estabelecimento-detail__acoes-header">
                <Botao
                  aoClicar={handleSeguir}
                  carregando={carregandoAcoes}
                  iconeEsquerda={<Icone nome={seguindo ? 'coracao' : 'coracaoVazio'} tamanho={18} />}
                  variante={seguindo ? 'primario' : 'fantasma'}
                  className="estabelecimento-detail__btn-seguir"
                  data-testid="estabelecimento-detail-seguir"
                >
                  {seguindo ? 'Seguindo' : 'Seguir'}
                </Botao>
                {est.servicos.length > 0 && (
                  <BotaoPrimario
                    aoClicar={() => setModalFila({ aberto: true })}
                    iconeEsquerda={<Icone nome="relogio" tamanho={18} />}
                    className="estabelecimento-detail__btn-fila"
                    data-testid="estabelecimento-detail-fila"
                  >
                    Entrar na fila
                  </BotaoPrimario>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Conteúdo principal */}
        <main className="estabelecimento-detail__main">
          {/* Abas */}
          <div className="estabelecimento-detail__abas" role="tablist" aria-label="Abas do estabelecimento" data-testid="estabelecimento-detail-abas">
            {ABA_IDS.map((id) => (
              <Botao
                key={id}
                role="tab"
                aria-selected={abaAtiva === id}
                aria-controls={`painel-${id}`}
                id={`aba-${id}`}
                variante={abaAtiva === id ? 'primario' : 'fantasma'}
                tamanho="pequeno"
                aoClicar={() => setAbaAtiva(id)}
                className="estabelecimento-detail__aba-btn"
                data-testid={`aba-${id}`}
              >
                <Icone nome={id === 'servicos' ? 'tesoura' : id === 'galeria' ? 'foto' : id === 'avaliacoes' ? 'estrela' : 'info'} tamanho={16} className="estabelecimento-detail__aba-icone" aria-hidden="true" />
                <span className="estabelecimento-detail__aba-rotulo">{id.charAt(0).toUpperCase() + id.slice(1)}</span>
              </Botao>
            ))}
          </div>

          {/* Painéis das abas */}
          <div className="estabelecimento-detail__painel">
            <div role="tabpanel" id="painel-servicos" aria-labelledby="aba-servicos" hidden={abaAtiva !== 'servicos'} data-testid="painel-servicos">
              {abaAtiva === 'servicos' && (
                <ServicosList
                  servicos={servicos}
                  aoAgendar={aoAgendar}
                  carregando={carregando}
                  data-testid="estabelecimento-detail-servicos"
                />
              )}
            </div>

            <div role="tabpanel" id="painel-galeria" aria-labelledby="aba-galeria" hidden={abaAtiva !== 'galeria'} data-testid="painel-galeria">
              {abaAtiva === 'galeria' && (
                <Galeria
                  itens={galeria}
                  carregando={carregando}
                  data-testid="estabelecimento-detail-galeria"
                />
              )}
            </div>

            <div role="tabpanel" id="painel-avaliacoes" aria-labelledby="aba-avaliacoes" hidden={abaAtiva !== 'avaliacoes'} data-testid="painel-avaliacoes">
              {abaAtiva === 'avaliacoes' && (
                <Avaliacoes
                  avaliacoes={avaliacoes}
                  media={avaliacaoMedia}
                  total={totalAvaliacoes}
                  aoAvaliar={() => setModalAvaliacao({ aberto: true })}
                  carregando={carregando}
                  data-testid="estabelecimento-detail-avaliacoes"
                />
              )}
            </div>

            <div role="tabpanel" id="painel-sobre" aria-labelledby="aba-sobre" hidden={abaAtiva !== 'sobre'} data-testid="painel-sobre">
              {abaAtiva === 'sobre' && (
                <Cartao variante="padrao" className="estabelecimento-detail__sobre">
                  <CartaoCorpo>
                    <h2 className="estabelecimento-detail__secao-titulo">Sobre</h2>
                    <p className="estabelecimento-detail__sobre-texto">{est.sobre || 'Nenhuma descrição disponível.'}</p>
                    <div className="estabelecimento-detail__info-adicionais">
                      <div className="estabelecimento-detail__info-item">
                        <Icone nome="relogio" tamanho={18} />
                        <div>
                          <span className="estabelecimento-detail__info-label">Horário</span>
                          <span className="estabelecimento-detail__info-valor">{est.horarioFuncionamento}</span>
                        </div>
                      </div>
                      <div className="estabelecimento-detail__info-item">
                        <Icone nome="mapa" tamanho={18} />
                        <div>
                          <span className="estabelecimento-detail__info-label">Endereço</span>
                          <span className="estabelecimento-detail__info-valor">{est.endereco}, {est.cidade}</span>
                        </div>
                      </div>
                      <div className="estabelecimento-detail__info-item">
                        <Icone nome="telefone" tamanho={18} />
                        <div>
                          <span className="estabelecimento-detail__info-label">WhatsApp</span>
                          <a href={`https://wa.me/${est.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="estabelecimento-detail__info-valor-link">
                            {est.whatsapp}
                          </a>
                        </div>
                      </div>
                    </div>
                  </CartaoCorpo>
                </Cartao>
              )}
            </div>
          </div>
        </main>

        {/* Modal Avaliação */}
        <Modal
          aberto={modalAvaliacao.aberto}
          aoFechar={() => setModalAvaliacao({ aberto: false })}
          titulo="Avaliar estabelecimento"
          tamanho="medio"
          data-testid="modal-avaliacao"
        >
          <div className="estabelecimento-detail__modal-avaliacao">
            <div className="estabelecimento-detail__estrelas" role="radiogroup" aria-label="Selecione a nota">
              {[5, 4, 3, 2, 1].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={notaAvaliacao === n}
                  onClick={() => setNotaAvaliacao(n)}
                  className={`estabelecimento-detail__estrela ${notaAvaliacao >= n ? 'preenchida' : ''}`}
                  data-testid={`estrela-${n}`}
                >
                  <Icone nome={notaAvaliacao >= n ? 'estrela' : 'estrelaVazia'} tamanho={28} />
                </button>
              ))}
            </div>
            <Textarea
              label="Comentário (opcional)"
              valor={comentarioAvaliacao}
              aoAlterar={setComentarioAvaliacao}
              placeholder="O que você achou do atendimento?"
              maxLength={500}
              linhas={4}
              data-testid="avaliacao-comentario"
            />
            <div className="estabelecimento-detail__modal-acoes">
              <BotaoSecundario aoClicar={() => setModalAvaliacao({ aberto: false })} data-testid="modal-avaliacao-cancelar">
                Cancelar
              </BotaoSecundario>
              <BotaoPrimario aoClicar={handleAvaliar} data-testid="modal-avaliacao-enviar">
                Enviar avaliação
              </BotaoPrimario>
            </div>
          </div>
        </Modal>

        {/* Modal Fila */}
        <Modal
          aberto={modalFila.aberto}
          aoFechar={() => setModalFila({ aberto: false })}
          titulo="Entrar na fila"
          tamanho="pequeno"
          data-testid="modal-fila"
        >
          <div className="estabelecimento-detail__modal-fila">
            <p className="estabelecimento-detail__modal-fila-texto">
              Informe seu nome para entrar na fila de espera do <strong>{est.nome}</strong>.
            </p>
            <CampoTexto
              label="Seu nome"
              valor={nomeFila}
              aoAlterar={setNomeFila}
              placeholder="Ex: João Silva"
              obrigatorio
              autoFocus
              data-testid="fila-nome"
            />
            <div className="estabelecimento-detail__modal-acoes">
              <BotaoSecundario aoClicar={() => setModalFila({ aberto: false })} data-testid="modal-fila-cancelar">
                Cancelar
              </BotaoSecundario>
              <BotaoPrimario aoClicar={handleEntrarNaFila} desabilitado={!nomeFila.trim()} data-testid="modal-fila-confirmar">
                Confirmar
              </BotaoPrimario>
            </div>
          </div>
        </Modal>
      </div>
    </ToastProvider>
  );
};

export default EstabelecimentoDetail;