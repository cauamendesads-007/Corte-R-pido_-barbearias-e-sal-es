/**
 * Tela Agendamento - Detalhes e gerenciamento de um agendamento.
 * Cliente: ver detalhes, cancelar, reagendar, avaliar.
 * Barbeiro: ver detalhes, confirmar, concluir, cancelar.
 */

import { useState, useCallback, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import { api } from '@/servicos/api';
import {
  Container,
  CartaoAgendamento,
  BotaoPrimario,
  BotaoSecundario,
  BotaoPerigo,
  Botao,
  Modal,
  ModalConfirmacao,
  Chip,
  ToastProvider,
  useGlobalToast,
  Skeleton,
  Icone,
} from '@/componentes';
import { formatarDataCurta } from '@/utilitarios/formatar';
import './Agendamento.css';

const Agendamento = () => {
  const { id: agendamentoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { sucesso, erro: toastErro } = useGlobalToast();

  const {
    agendamentos,
    carregando,
    erro,
    cancelar,
    reagendar,
    avaliar,
  } = useAgendamentos();

  const agendamento = agendamentos.find((a) => a.id === agendamentoId);

  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false);
  const [mostrarModalReagendar, setMostrarModalReagendar] = useState(false);
  const [mostrarModalAvaliar, setMostrarModalAvaliar] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [novoHorario, setNovoHorario] = useState('');
  const [avaliacaoEstrelas, setAvaliacaoEstrelas] = useState(0);
  const [avaliacaoComentario, setAvaliacaoComentario] = useState('');
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);

  const papel = usuario?.papel;
  const isBarbeiro = papel === 'barbeiro';
  const isCliente = papel === 'cliente';

  // Carregar horários disponíveis quando data muda
  useEffect(() => {
    if (novaData && agendamento) {
      api.agendamentos.obterHorariosDisponiveis?.(agendamento.estabelecimentoId, novaData, agendamento.duracaoMinutos)
        .then((res) => {
          if (res.sucesso && res.dados) {
            setHorariosDisponiveis(res.dados.filter((h) => h.disponivel).map((h) => h.horario));
          }
        });
    }
  }, [novaData, agendamento]);

  const handleCancelar = useCallback(async () => {
    if (!agendamento) return;
    try {
      await cancelar(agendamento.id);
      sucesso('Agendamento cancelado');
      navigate(isBarbeiro ? '/painel/agenda' : '/perfil/agendamentos');
    } catch {
      toastErro('Erro ao cancelar');
    }
  }, [agendamento, cancelar, sucesso, toastErro, navigate, isBarbeiro]);

  const handleReagendar = useCallback(async () => {
    if (!agendamento || !novaData || !novoHorario) return;
    try {
      await reagendar(agendamento.id, novaData, novoHorario);
      sucesso('Agendamento reagendado');
      setMostrarModalReagendar(false);
    } catch {
      toastErro('Erro ao reagendar');
    }
  }, [agendamento, reagendar, sucesso, toastErro, novaData, novoHorario]);

  const handleAvaliar = useCallback(async () => {
    if (!agendamento || avaliacaoEstrelas === 0) return;
    try {
      await avaliar(agendamento.id, avaliacaoEstrelas, avaliacaoComentario);
      sucesso('Obrigado pela avaliação!');
      setMostrarModalAvaliar(false);
    } catch {
      toastErro('Erro ao enviar avaliação');
    }
  }, [agendamento, avaliar, sucesso, toastErro, avaliacaoEstrelas, avaliacaoComentario]);

  if (carregando) {
    return (
      <ToastProvider>
        <Container variante="com-cabecalho" data-testid="agendamento-container">
          <div className="agendamento__carregando" role="status" aria-label="Carregando agendamento">
            <Skeleton variante="agendamento" />
            <Skeleton variante="agendamento" />
          </div>
        </Container>
      </ToastProvider>
    );
  }

  if (erro || !agendamento) {
    return (
      <ToastProvider>
        <Container variante="com-cabecalho" data-testid="agendamento-container">
          <div className="agendamento__erro" role="alert">
            <span className="agendamento__erro-icone" aria-hidden="true"><Icone nome="alerta" tamanho={24} /></span>
            <h2>Agendamento não encontrado</h2>
            <p>Este agendamento não existe ou foi removido.</p>
            <BotaoPrimario aoClicar={() => navigate(isBarbeiro ? '/painel/agenda' : '/perfil/agendamentos')}>
              Voltar
            </BotaoPrimario>
          </div>
        </Container>
      </ToastProvider>
    );
  }

  const statusConfig = {
    pendente: { label: 'Pendente', variante: 'aviso' as const, icone: <Icone nome="relogio" tamanho={16} /> },
    confirmado: { label: 'Confirmado', variante: 'sucesso' as const, icone: <Icone nome="verificarCirculo" tamanho={16} /> },
    concluido: { label: 'Concluído', variante: 'padrao' as const, icone: <Icone nome="verificarCirculo" tamanho={16} /> },
    cancelado: { label: 'Cancelado', variante: 'perigo' as const, icone: <Icone nome="xCirculo" tamanho={16} /> },
  } as const;

  const status = statusConfig[agendamento.status as keyof typeof statusConfig] || statusConfig.pendente;

  return (
    <ToastProvider>
      <Container variante="com-cabecalho" data-testid="agendamento-container">
        <header className="agendamento__header">
          <div className="agendamento__header-conteudo">
            <Link to={isBarbeiro ? '/painel/agenda' : '/perfil/agendamentos'} className="agendamento__voltar" aria-label="Voltar">
              <Icone nome="voltar" tamanho={20} />
            </Link>
            <div>
              <h1 className="agendamento__titulo">Detalhes do agendamento</h1>
              <Chip
                variante="status"
                icone={status.icone}
              >
                {status.label}
              </Chip>
            </div>
          </div>
        </header>

        <main className="agendamento__conteudo" role="main">
          <CartaoAgendamento
            agendamento={{
              ...agendamento,
              estabelecimento: { nome: agendamento.estabelecimentoId },
              statusPagamento: agendamento.statusPagamento,
              nomeCliente: agendamento.nomeCliente,
            }}
            ehBarbeiro={isBarbeiro}
            data-testid="agendamento-card"
          />

          <section className="agendamento__acoes" aria-label="Ações do agendamento">
            {agendamento.status === 'agendado' && (
              <>
                {isCliente && (
                  <BotaoSecundario
                    aoClicar={() => setMostrarModalReagendar(true)}
                    iconeEsquerda={<Icone nome="calendario" tamanho={16} />}
                    data-testid="btn-reagendar"
                  >
                    Reagendar
                  </BotaoSecundario>
                )}
                {isBarbeiro && (
                  <BotaoPrimario
                    aoClicar={() => { /* TODO: confirmar */ }}
                    iconeEsquerda={<Icone nome="verificarCirculo" tamanho={16} />}
                    data-testid="btn-confirmar"
                  >
                    Confirmar
                  </BotaoPrimario>
                )}
                <BotaoPerigo
                  aoClicar={() => setMostrarModalCancelar(true)}
                  iconeEsquerda={<Icone nome="x" tamanho={16} />}
                  data-testid="btn-cancelar"
                >
                  Cancelar
                </BotaoPerigo>
              </>
            )}

            {agendamento.status === 'confirmado' && isBarbeiro && (
              <BotaoPrimario
                aoClicar={() => { /* TODO: concluir */ }}
                iconeEsquerda={<Icone nome="verificarCirculo" tamanho={16} />}
                data-testid="btn-concluir"
              >
                Marcar como concluído
              </BotaoPrimario>
            )}

            {agendamento.status === 'concluido' && isCliente && !agendamento.avaliacao && (
              <BotaoSecundario
                aoClicar={() => setMostrarModalAvaliar(true)}
                iconeEsquerda={<Icone nome="estrela" tamanho={16} />}
                data-testid="btn-avaliar"
              >
                Avaliar
              </BotaoSecundario>
            )}
          </section>

          {agendamento.status === 'concluido' && agendamento.avaliacao && (
            <section className="agendamento__avaliacao-existente" aria-labelledby="avaliacao-titulo">
              <h3 id="avaliacao-titulo">Sua avaliação</h3>
              <article className="agendamento__avaliacao-card">
                <div className="agendamento__avaliacao-estrelas" aria-label={`${agendamento.avaliacao.estrelas} de 5 estrelas`}>
                  <span aria-hidden="true">{'★'.repeat(agendamento.avaliacao.estrelas)}{'☆'.repeat(5 - agendamento.avaliacao.estrelas)}</span>
                </div>
                <p>{agendamento.avaliacao.comentario || 'Sem comentário'}</p>
                <time dateTime={agendamento.avaliacao.data}>Enviado em {formatarDataCurta(agendamento.avaliacao.data)}</time>
              </article>
            </section>
          )}
        </main>

        {/* Modal Cancelar */}
        <ModalConfirmacao
          aberto={mostrarModalCancelar}
          aoConfirmar={handleCancelar}
          aoFechar={() => setMostrarModalCancelar(false)}
          titulo="Cancelar agendamento"
          mensagem="Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita."
          textoConfirmar="Sim, cancelar"
          varianteConfirmar="perigo"
          data-testid="modal-cancelar"
        />

        {/* Modal Reagendar */}
        <Modal
          aberto={mostrarModalReagendar}
          aoFechar={() => setMostrarModalReagendar(false)}
          titulo="Reagendar agendamento"
          data-testid="modal-reagendar"
        >
          <form className="modal-reagendar__conteudo" onSubmit={(e) => { e.preventDefault(); handleReagendar(); }}>
            <p>Selecione a nova data e horário:</p>
            <div className="modal-reagendar__campos">
              <label>
                <span>Data</span>
                <input
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </label>
              <label>
                <span>Horário</span>
                <select
                  value={novoHorario}
                  onChange={(e) => setNovoHorario(e.target.value)}
                  required
                >
                  <option value="">Selecione a data primeiro</option>
                  {horariosDisponiveis.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-reagendar__botoes">
              <BotaoSecundario aoClicar={() => setMostrarModalReagendar(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario tipo="submit" desabilitado={!novaData || !novoHorario}>
                Confirmar
              </BotaoPrimario>
            </div>
          </form>
        </Modal>

        {/* Modal Avaliar */}
        <Modal
          aberto={mostrarModalAvaliar}
          aoFechar={() => {
            setMostrarModalAvaliar(false);
            setAvaliacaoEstrelas(0);
            setAvaliacaoComentario('');
          }}
          titulo="Avaliar estabelecimento"
          data-testid="modal-avaliar"
        >
          <form className="modal-avaliar__conteudo" onSubmit={(e) => { e.preventDefault(); handleAvaliar(); }}>
            <fieldset className="modal-avaliar__estrelas">
              <legend>Selecione a nota</legend>
              <div role="radiogroup" aria-label="Selecione a nota">
                {[1, 2, 3, 4, 5].map((estrela) => (
                  <button
                    key={estrela}
                    type="button"
                    role="radio"
                    aria-checked={avaliacaoEstrelas === estrela}
                    onClick={() => setAvaliacaoEstrelas(estrela)}
                    className={avaliacaoEstrelas >= estrela ? 'ativa' : ''}
                    aria-label={`${estrela} estrela${estrela > 1 ? 's' : ''}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="modal-avaliar__comentario">
              <span>Comentário (opcional)</span>
              <textarea
                value={avaliacaoComentario}
                onChange={(e) => setAvaliacaoComentario(e.target.value)}
                placeholder="Como foi sua experiência?"
                rows={3}
                maxLength={500}
              />
            </label>
            <div className="modal-avaliar__botoes">
              <Botao aoClicar={() => {
                setMostrarModalAvaliar(false);
                setAvaliacaoEstrelas(0);
                setAvaliacaoComentario('');
              }}>Cancelar</Botao>
              <BotaoPrimario tipo="submit" desabilitado={avaliacaoEstrelas === 0}>
                Enviar
              </BotaoPrimario>
            </div>
          </form>
        </Modal>
      </Container>
    </ToastProvider>
  );
};

export default Agendamento;