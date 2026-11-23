/**
 * PainelServicosBarbeiro - Gerenciamento de serviços do estabelecimento.
 */

import { useState } from 'react';
import { BotaoPrimario, BotaoIcone, ModalFormulario, CampoTexto, CampoNumero, Select, Textarea } from '@/componentes';
import { ICONES } from '@/constantes';
import type { Servico, ServicoTag } from '../types';
import { SERVICO_TAGS } from '../types';

interface PainelServicosBarbeiroProps {
  servicos: Servico[];
  onAdicionar: (servico: Omit<Servico, 'id'>) => void;
  onAtualizar: (servico: Servico) => void;
  onExcluir: (id: string) => void;
}

const TAG_OPCOES = SERVICO_TAGS.map((tag) => ({ valor: tag, rotulo: tag }));

export const PainelServicosBarbeiro = ({ servicos, onAdicionar, onAtualizar, onExcluir }: PainelServicosBarbeiroProps) => {
  const [modalAberto, setModalAberto] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<Servico | null>(null);

  const handleAbrirModal = (servico?: Servico) => {
    if (servico) {
      setServicoEditando({ ...servico });
    } else {
      setServicoEditando({ id: '', nome: '', preco: 0, duracaoMinutos: 30, tag: 'Corte', descricao: '' });
    }
    setModalAberto(true);
  };

  const handleFecharModal = () => {
    setModalAberto(false);
    setServicoEditando(null);
  };

  const handleSalvar = () => {
    if (!servicoEditando) return;
    if (!servicoEditando.nome || servicoEditando.preco <= 0 || servicoEditando.duracaoMinutos <= 0) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    if (servicoEditando.id) {
      onAtualizar(servicoEditando);
    } else {
      onAdicionar({
        nome: servicoEditando.nome,
        preco: servicoEditando.preco,
        duracaoMinutos: servicoEditando.duracaoMinutos,
        tag: servicoEditando.tag,
        descricao: servicoEditando.descricao,
      });
    }
    handleFecharModal();
  };

  return (
    <div className="painel__painel" role="tabpanel" id="painel-servicos" aria-labelledby="aba-servicos">
      <div className="painel__secao-cabecalho">
        <h2>Meus serviços</h2>
        <BotaoPrimario aoClicar={() => handleAbrirModal()}>Novo serviço</BotaoPrimario>
      </div>

      <div className="painel__servicos-lista" role="list" data-testid="painel-servicos-lista">
        {servicos.map((servico) => (
          <div key={servico.id} className="painel__servico-item" data-testid={`painel-servico-${servico.id}`}>
            <div className="painel__servico-info">
              <strong>{servico.nome}</strong>
              <span className="painel__servico-tag">{servico.tag}</span>
            </div>
            <div className="painel__servico-detalhes">
              <span>{servico.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              <span>{servico.duracaoMinutos} min</span>
            </div>
            <div className="painel__servico-acoes">
              <BotaoIcone icone={ICONES.editar} variante="fantasma" tamanho="pequeno" aoClicar={() => handleAbrirModal(servico)} ariaLabel="Editar serviço" />
              <BotaoIcone
                icone={ICONES.lixeira}
                variante="fantasma"
                tamanho="pequeno"
                aoClicar={() => { if (window.confirm('Excluir este serviço?')) onExcluir(servico.id); }}
                ariaLabel="Excluir serviço"
              />
            </div>
          </div>
        ))}
      </div>

      {servicos.length === 0 && (
        <div className="painel__vazio" data-testid="painel-servicos-vazio">
          <div className="painel__vazio-icone">{ICONES.tesoura}</div>
          <h3>Nenhum serviço cadastrado</h3>
          <p>Adicione seus serviços para que clientes possam agendar.</p>
          <BotaoPrimario aoClicar={() => handleAbrirModal()}>Criar primeiro serviço</BotaoPrimario>
        </div>
      )}

      {/* Modal Serviço */}
      <ModalFormulario
        aberto={modalAberto}
        aoFechar={handleFecharModal}
        titulo={servicoEditando?.id ? 'Editar serviço' : 'Novo serviço'}
        aoSalvar={handleSalvar}
        tamanho="medio"
        data-testid="modal-servico"
      >
        <CampoTexto
          label="Nome do serviço"
          valor={servicoEditando?.nome || ''}
          aoAlterar={(v) => setServicoEditando((prev) => (prev ? { ...prev, nome: v } : null))}
          obrigatorio
          placeholder="Ex: Corte masculino"
          data-testid="modal-servico-nome"
        />
        <div className="painel__servico-linha">
          <CampoNumero
            label="Preço (R$)"
            valor={String(servicoEditando?.preco || 0)}
            aoAlterar={(v) => setServicoEditando((prev) => (prev ? { ...prev, preco: Number(v) } : null))}
            min={1}
            max={1000}
            step={1}
            obrigatorio
            data-testid="modal-servico-preco"
          />
          <CampoNumero
            label="Duração (min)"
            valor={String(servicoEditando?.duracaoMinutos || 30)}
            aoAlterar={(v) => setServicoEditando((prev) => (prev ? { ...prev, duracaoMinutos: Number(v) } : null))}
            min={5}
            max={240}
            step={5}
            obrigatorio
            data-testid="modal-servico-duracao"
          />
        </div>
        <Select
          label="Categoria"
          valor={servicoEditando?.tag || 'Corte'}
          aoAlterar={(v) => setServicoEditando((prev) => (prev ? { ...prev, tag: v as ServicoTag } : null))}
          opcoes={TAG_OPCOES}
          data-testid="modal-servico-tag"
        />
        <Textarea
          label="Descrição"
          valor={servicoEditando?.descricao || ''}
          aoAlterar={(v) => setServicoEditando((prev) => (prev ? { ...prev, descricao: v } : null))}
          placeholder="Descreva o que está incluso no serviço..."
          linhas={3}
          data-testid="modal-servico-descricao"
        />
      </ModalFormulario>
    </div>
  );
};