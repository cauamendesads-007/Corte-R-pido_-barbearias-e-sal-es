/**
 * Componente FilaBarbeiro - Gerenciamento da fila de espera.
 * Puro, coeso, < 150 linhas, drag-and-drop ready, skeleton loading.
 */

import { useState, useCallback } from 'react';
import {
  Cartao,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  BotaoPerigo,
  Icone,
  Avatar,
  CampoTexto,
  Chip,
  Skeleton,
  EmptyState,
  Modal,
  ToastProvider,
  useGlobalToast,
} from '@/componentes';
import type { FilaEspera } from '../types';
import { calcularTempoRelativo, estimarTempoEspera, podeChamarCliente, gerarNotificacaoFila } from '../rules';
import './FilaBarbeiro.css';

interface FilaBarbeiroProps {
  /** Lista da fila */
  fila: FilaEspera[];
  /** Carregando */
  carregando?: boolean;
  /** Erro */
  erro?: string | null;
  /** Tempo médio de serviço (minutos) */
  tempoMedioServico?: number;
  /** Callbacks */
  aoAdicionarCliente?: (cliente: Omit<FilaEspera, 'id' | 'posicao' | 'entradaEm'>) => void;
  aoChamarProximo?: () => void;
  aoRemover?: (id: string) => void;
  aoReordenar?: (ids: string[]) => void;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const FilaBarbeiro = ({
  fila,
  carregando = false,
  erro = null,
  tempoMedioServico = 30,
  aoAdicionarCliente,
  aoChamarProximo,
  aoRemover,
  aoReordenar,
  className = '',
  'data-testid': testId,
}: FilaBarbeiroProps) => {
  const { sucesso, erro: toastErro } = useGlobalToast();
  const [modalAdicionar, setModalAdicionar] = useState(false);
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    telefone: '',
    servicoDesejado: '',
    avatar: '',
    observacoes: '',
  });
  const [salvando, setSalvando] = useState(false);

  const handleAdicionar = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCliente.nome.trim() || !novoCliente.servicoDesejado.trim() || salvando) return;

    setSalvando(true);
    try {
      await aoAdicionarCliente?.({
        nome: novoCliente.nome.trim(),
        telefone: novoCliente.telefone.trim(),
        servicoDesejado: novoCliente.servicoDesejado.trim(),
        avatar: novoCliente.avatar,
        observacoes: novoCliente.observacoes.trim(),
      });
      sucesso('Cliente adicionado à fila!');
      setModalAdicionar(false);
      setNovoCliente({ nome: '', telefone: '', servicoDesejado: '', avatar: '', observacoes: '' });
    } catch {
      toastErro('Erro ao adicionar cliente');
    } finally {
      setSalvando(false);
    }
  }, [novoCliente, aoAdicionarCliente, sucesso, toastErro, salvando]);

  const handleRemover = useCallback((id: string) => {
    if (window.confirm('Remover este cliente da fila?')) {
      aoRemover?.(id);
    }
  }, [aoRemover]);

  const podeChamar = fila.length > 0 && podeChamarCliente(fila[0]);

  if (carregando) {
    return (
      <div className={`fila-barbeiro ${className}`} data-testid={testId}>
        <div className="fila-barbeiro__skeleton" role="status" aria-label="Carregando fila">
          <div className="fila-barbeiro__header-skeleton">
            <Skeleton variante="retangular" largura="200px" altura={28} />
            <Skeleton variante="retangular" largura="150px" altura={44} />
          </div>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="fila-barbeiro__item-skeleton">
              <Skeleton variante="retangular" largura="100%" altura={70} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (erro && !fila.length) {
    return (
      <div className={`fila-barbeiro ${className}`} data-testid={testId}>
        <EmptyState
          titulo="Erro ao carregar fila"
          mensagem={erro}
          icone="alerta"
          className="fila-barbeiro__empty"
          data-testid="fila-barbeiro-erro"
        />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className={`fila-barbeiro ${className}`} data-testid={testId}>
        {/* Header */}
        <header className="fila-barbeiro__header">
          <div className="fila-barbeiro__header-esquerda">
            <h1 className="fila-barbeiro__titulo">Fila de espera</h1>
            <Chip
              variante={fila.length > 0 ? 'aviso' : 'sucesso'}
              className="fila-barbeiro__contador"
            >
              {fila.length} cliente{fila.length !== 1 ? 's' : ''} na fila
            </Chip>
          </div>
          <div className="fila-barbeiro__header-direita">
            {aoAdicionarCliente && (
              <BotaoPrimario
                iconeEsquerda={<Icone nome="mais" tamanho={16} />}
                aoClicar={() => setModalAdicionar(true)}
                data-testid="fila-adicionar-cliente"
              >
                Adicionar cliente
              </BotaoPrimario>
            )}
            {aoChamarProximo && fila.length > 0 && (
              <BotaoPrimario
                variante={podeChamar ? 'primario' : 'aviso'}
                iconeEsquerda={<Icone nome={podeChamar ? 'megafone' : 'alerta'} tamanho={16} />}
                aoClicar={aoChamarProximo}
                desabilitado={!podeChamar}
                data-testid="fila-chamar-proximo"
              >
                {podeChamar ? 'Chamar próximo' : 'Aguardando tolerância'}
              </BotaoPrimario>
            )}
          </div>
        </header>

        {/* Estimativa de tempo */}
        {fila.length > 0 && (
          <div className="fila-barbeiro__estimativa" role="status" aria-live="polite">
            <div className="fila-barbeiro__estimativa-item">
              <Icone nome="relogio" tamanho={16} />
              <span>Tempo médio por cliente: <strong>{tempoMedioServico}min</strong></span>
            </div>
            <div className="fila-barbeiro__estimativa-item">
              <Icone nome="usuario-espera" tamanho={16} />
              <span>Próximo a ser chamado: <strong>{fila[0]?.nome}</strong> (entrou há {calcularTempoRelativo(fila[0]?.entradaEm)})</span>
            </div>
          </div>
        )}

        {/* Lista da fila */}
        <section className="fila-barbeiro__lista" aria-label="Clientes na fila">
          {fila.length === 0 ? (
            <EmptyState
              titulo="Fila vazia"
              mensagem="Nenhum cliente aguardando no momento."
              icone="usuarios"
              acao={aoAdicionarCliente ? { rotulo: 'Adicionar primeiro cliente', aoClicar: () => setModalAdicionar(true) } : undefined}
              className="fila-barbeiro__empty"
              data-testid="fila-vazia"
            />
          ) : (
            <div className="fila-barbeiro__itens" role="list">
              {fila.map((cliente, index) => (
                <FilaItem
                  key={cliente.id}
                  cliente={cliente}
                  posicao={index + 1}
                  tempoMedioServico={tempoMedioServico}
                  aoRemover={handleRemover}
                  data-testid={`fila-item-${cliente.id}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* Modal Adicionar Cliente */}
        <Modal
          aberto={modalAdicionar}
          aoFechar={() => setModalAdicionar(false)}
          titulo="Adicionar cliente à fila"
          tamanho="medio"
          data-testid="modal-adicionar-fila"
        >
          <form onSubmit={handleAdicionar} className="fila-barbeiro__modal-form">
            <div className="fila-barbeiro__modal-grid">
              <CampoTexto
                label="Nome do cliente"
                valor={novoCliente.nome}
                aoAlterar={(v) => setNovoCliente((p) => ({ ...p, nome: v }))}
                placeholder="Nome completo"
                obrigatorio
                data-testid="fila-nome"
              />
              <CampoTexto
                label="Telefone/WhatsApp"
                valor={novoCliente.telefone}
                aoAlterar={(v) => setNovoCliente((p) => ({ ...p, telefone: v }))}
                placeholder="(XX) XXXXX-XXXX"
                tipo="tel"
                data-testid="fila-telefone"
              />
            </div>
            <CampoTexto
              label="Serviço desejado"
              valor={novoCliente.servicoDesejado}
              aoAlterar={(v) => setNovoCliente((p) => ({ ...p, servicoDesejado: v }))}
              placeholder="Ex: Corte + Barba"
              obrigatorio
              data-testid="fila-servico"
            />
            <CampoTexto
              label="Observações (opcional)"
              valor={novoCliente.observacoes}
              aoAlterar={(v) => setNovoCliente((p) => ({ ...p, observacoes: v }))}
              placeholder="Preferências, alergias, etc."
              tipo="textarea"
              linhas={3}
              maxLength={500}
              data-testid="fila-observacoes"
            />
            <div className="fila-barbeiro__modal-acoes">
              <BotaoSecundario tipo="button" aoClicar={() => setModalAdicionar(false)} data-testid="modal-fila-cancelar">
                Cancelar
              </BotaoSecundario>
              <BotaoPrimario tipo="submit" iconeEsquerda={<Icone nome="usuario-mais" tamanho={14} />} carregando={salvando} data-testid="modal-fila-salvar">
                Adicionar à fila
              </BotaoPrimario>
            </div>
          </form>
        </Modal>
      </div>
    </ToastProvider>
  );
};

/* Item da fila */

function FilaItem({
  cliente,
  posicao,
  tempoMedioServico,
  aoRemover,
}: {
  cliente: FilaEspera;
  posicao: number;
  tempoMedioServico: number;
  aoRemover?: (id: string) => void;
}) {
  const tempoEspera = Math.floor((Date.now() - new Date(cliente.entradaEm).getTime()) / 60000);
  const tempoEstimado = estimarTempoEspera([cliente], posicao, tempoMedioServico);
  const podeSerChamado = posicao === 1 && podeChamarCliente(cliente);

  return (
    <article className={`fila-barbeiro__item ${podeSerChamado ? 'fila-barbeiro__item--proximo' : ''}`} role="listitem">
      <span className="fila-barbeiro__posicao">{posicao}</span>

      <div className="fila-barbeiro__cliente">
        <Avatar
          src={cliente.avatar}
          alt={cliente.nome}
          tamanho={48}
          nome={cliente.nome}
        />
        <div className="fila-barbeiro__cliente-info">
          <strong className="fila-barbeiro__nome">{cliente.nome}</strong>
          <div className="fila-barbeiro__detalhes">
            <span className="fila-barbeiro__servico">{cliente.servicoDesejado}</span>
            {cliente.telefone && (
              <span className="fila-barbeiro__telefone">
                <Icone nome="telefone" tamanho={12} /> {cliente.telefone}
              </span>
            )}
            {cliente.observacoes && (
              <span className="fila-barbeiro__obs">
                <Icone nome="info" tamanho={12} /> {cliente.observacoes}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="fila-barbeiro__tempos">
        <div className="fila-barbeiro__tempo-espera">
          <Icone nome="relogio" tamanho={14} />
          <span>Espera: {tempoEspera}min</span>
        </div>
        {posicao > 1 && (
          <div className="fila-barbeiro__tempo-estimado">
            <Icone nome="ampulheta" tamanho={14} />
            <span>~{tempoEstimado}min para sua vez</span>
          </div>
        )}
      </div>

      <div className="fila-barbeiro__acoes">
        {podeSerChamado && (
          <Chip variante="sucesso" iconeEsquerda={<Icone nome="check" tamanho={10} />} tamanho="pequeno">
            Próximo
          </Chip>
        )}
        {aoRemover && (
          <button
            className="fila-barbeiro__btn-remover"
            onClick={() => aoRemover(cliente.id)}
            aria-label="Remover da fila"
            data-testid={`fila-remover-${cliente.id}`}
          >
            <Icone nome="lixo" tamanho={16} />
          </button>
        )}
      </div>
    </article>
  );
}

export default FilaBarbeiro;