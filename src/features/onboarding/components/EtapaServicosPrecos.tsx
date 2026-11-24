/**
 * Etapa de Serviços e Preços do Onboarding.
 * Permite adicionar, editar e remover serviços dinamicamente.
 */

import React, { useState, useMemo } from 'react';
import { Container, CampoTexto, BotaoPrimario, BotaoSecundario, BotaoIcone, Modal, Icone } from '@/componentes';
import { useOnboarding } from '../hooks/useOnboarding';
import type { Servico } from '@/tipos';
import './Onboarding.css';

interface EtapaServicosPrecosProps {
  aoAvancar: () => void;
  aoVoltar: () => void;
  desabilitado?: boolean;
}

interface ServicoFormData extends Omit<Servico, 'id'> {}

const SERVICO_INICIAL: ServicoFormData = {
  nome: '',
  preco: 0,
  duracaoMinutos: 30,
  tag: 'corte',
  midias: [],
};

const TAGS_SUGERIDAS = ['corte', 'barba', 'sobrancelha', 'hidratacao', 'coloração', 'escova', 'tratamento', 'outro'];

export const EtapaServicosPrecos: React.FC<EtapaServicosPrecosProps> = ({
  aoAvancar,
  aoVoltar,
  desabilitado = false,
}) => {
  const { dados, atualizarDados, erros } = useOnboarding();
  const [servicoEditando, setServicoEditando] = useState<ServicoFormData | null>(null);
  const [indiceEditando, setIndiceEditando] = useState<number | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const servicos = useMemo(() => dados.servicos, [dados.servicos]);
  const temErrosServicos = useMemo(() => {
    return servicos.some((s, _i) =>
      !s.nome?.trim() || !s.preco || s.preco <= 0 || !s.duracaoMinutos || s.duracaoMinutos <= 0
    );
  }, [servicos]);

  const abrirModalAdicionar = () => {
    setServicoEditando({ ...SERVICO_INICIAL });
    setIndiceEditando(null);
    setModalAberto(true);
  };

  const abrirModalEditar = (servico: ServicoFormData, indice: number) => {
    setServicoEditando({ ...servico });
    setIndiceEditando(indice);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setServicoEditando(null);
    setIndiceEditando(null);
  };

  const salvarServico = () => {
    if (!servicoEditando) return;

    const errosServico: string[] = [];
    if (!servicoEditando.nome?.trim()) errosServico.push('Nome é obrigatório');
    if (!servicoEditando.preco || servicoEditando.preco <= 0) errosServico.push('Preço deve ser maior que zero');
    if (!servicoEditando.duracaoMinutos || servicoEditando.duracaoMinutos <= 0) errosServico.push('Duração deve ser maior que zero');

    if (errosServico.length > 0) {
      alert(errosServico.join('\n'));
      return;
    }

    const novosServicos = [...servicos];
    if (indiceEditando !== null) {
      novosServicos[indiceEditando] = servicoEditando;
    } else {
      novosServicos.push(servicoEditando);
    }

    atualizarDados({ servicos: novosServicos });
    fecharModal();
  };

  const removerServico = (indice: number) => {
    if (window.confirm('Tem certeza que deseja remover este serviço?')) {
      const novosServicos = servicos.filter((_, i) => i !== indice);
      atualizarDados({ servicos: novosServicos });
    }
  };

  const formatarPreco = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const formatarDuracao = (minutos: number) => {
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
  };

  return (
    <Container variante="com-cabecalho" className="onboarding__etapa onboarding__servicos-precos">
      <header className="onboarding__cabecalho">
        <h2>Serviços e Preços</h2>
        <p className="onboarding__descricao">
          Cadastre seus serviços. Pelo menos um é obrigatório.
          {servicos.length > 0 && <span> ({servicos.length} cadastrado{servicos.length > 1 ? 's' : ''})</span>}
        </p>
      </header>

      <div className="onboarding__formulario">
        {servicos.length === 0 ? (
          <div className="onboarding__vazio" role="status">
            <Icone nome="adicionar" tamanho={48} />
            <p>Nenhum serviço cadastrado ainda</p>
            <BotaoPrimario aoClicar={abrirModalAdicionar} iconeEsquerda={<Icone nome="adicionar" tamanho={20} />} tamanho="medio">
              Adicionar Primeiro Serviço
            </BotaoPrimario>
          </div>
        ) : (
          <ul className="onboarding__lista-servicos" role="list">
            {servicos.map((servico, indice) => (
              <li key={indice} className="onboarding__servico-item">
                <div className="onboarding__servico-info">
                  <strong>{servico.nome || 'Serviço sem nome'}</strong>
                  <div className="onboarding__servico-detalhes">
                    <span className="onboarding__servico-preco">{formatarPreco(servico.preco)}</span>
                    <span className="onboarding__servico-duracao">{formatarDuracao(servico.duracaoMinutos)}</span>
                    <span className={`onboarding__servico-tag onboarding__servico-tag--${servico.tag}`}>
                      {servico.tag}
                    </span>
                  </div>
                </div>
                <div className="onboarding__servico-acoes">
                  <BotaoIcone
                    icone={<Icone nome="editar" tamanho={16} />}
                    aoClicar={() => abrirModalEditar(servico, indice)}
                    tamanho="pequeno"
                    ariaLabel={`Editar ${servico.nome}`}
                    variante="fantasma"
                  />
                  <BotaoIcone
                    icone={<Icone nome="lixo" tamanho={16} />}
                    aoClicar={() => removerServico(indice)}
                    tamanho="pequeno"
                    ariaLabel={`Remover ${servico.nome}`}
                    variante="perigo"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="onboarding__acao-adicionar">
          <BotaoSecundario aoClicar={abrirModalAdicionar} iconeEsquerda={<Icone nome="adicionar" tamanho={20} />} desabilitado={desabilitado}>
            + Adicionar Outro Serviço
          </BotaoSecundario>
        </div>

        {(erros.servicos || temErrosServicos) && (
          <p className="onboarding__erro onboarding__erro--global">
            {erros.servicos || 'Verifique os campos obrigatórios dos serviços'}
          </p>
        )}
      </div>

      <footer className="onboarding__rodape">
        <button
          type="button"
          className="botao botao--secundario onboarding__botao-voltar"
          onClick={aoVoltar}
          disabled={desabilitado}
        >
          Voltar
        </button>
        <button
          type="button"
          className="botao botao--primario onboarding__botao-avancar"
          onClick={aoAvancar}
          disabled={desabilitado || servicos.length === 0}
        >
          Próximo: Tema e Aparência
        </button>
      </footer>

      <Modal
        aberto={modalAberto}
        aoFechar={fecharModal}
        titulo={indiceEditando !== null ? 'Editar Serviço' : 'Novo Serviço'}
        tamanho="medio"
      >
        <div className="onboarding__modal-formulario">
          <div className="onboarding__campo">
            <CampoTexto
              label="Nome do Serviço *"
              placeholder="Ex: Corte Degradê, Barba Completa, Hidratação"
              valor={servicoEditando?.nome || ''}
              aoAlterar={(v) => setServicoEditando((prev) => prev ? { ...prev, nome: v } : null)}
              erro={indiceEditando !== null ? erros[`servico-${indiceEditando}-nome`] : undefined}
              obrigatorio
              autoFocus
              maxLength={60}
            />
          </div>

          <div className="onboarding__campo-duplo">
            <div className="onboarding__campo">
              <CampoTexto
                label="Preço (R$) *"
                placeholder="0,00"
                valor={servicoEditando?.preco ? servicoEditando.preco.toFixed(2).replace('.', ',') : ''}
                aoAlterar={(v) => {
                  const numero = parseFloat(v.replace(',', '.')) || 0;
                  setServicoEditando((prev) => prev ? { ...prev, preco: numero } : null);
                }}
                erro={indiceEditando !== null ? erros[`servico-${indiceEditando}-preco`] : undefined}
                obrigatorio
                tipo="number"
                inputMode="decimal"
                step={0.01}
                min={0.01}
              />
            </div>

            <div className="onboarding__campo">
              <CampoTexto
                label="Duração (min) *"
                placeholder="30"
                valor={servicoEditando?.duracaoMinutos?.toString() || ''}
                aoAlterar={(v) => {
                  const numero = parseInt(v, 10) || 0;
                  setServicoEditando((prev) => prev ? { ...prev, duracaoMinutos: numero } : null);
                }}
                erro={indiceEditando !== null ? erros[`servico-${indiceEditando}-duracao`] : undefined}
                obrigatorio
                tipo="number"
                inputMode="numeric"
                min={5}
                max={480}
              />
            </div>
          </div>

          <div className="onboarding__campo">
            <label id="categoria-label" className="onboarding__label">Categoria *</label>
            <select
              id="categoria-select"
              className="onboarding__select"
              value={servicoEditando?.tag || 'corte'}
              onChange={(e) => setServicoEditando((prev) => prev ? { ...prev, tag: e.target.value } : null)}
              aria-labelledby="categoria-label"
            >
              {TAGS_SUGERIDAS.map((tag) => (
                <option key={tag} value={tag}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="onboarding__modal-acoes">
            <BotaoSecundario aoClicar={fecharModal} tamanho="medio">Cancelar</BotaoSecundario>
            <BotaoPrimario aoClicar={salvarServico} tamanho="medio">
              {indiceEditando !== null ? 'Salvar Alterações' : 'Adicionar Serviço'}
            </BotaoPrimario>
          </div>
        </div>
      </Modal>
    </Container>
  );
};

export default EtapaServicosPrecos;