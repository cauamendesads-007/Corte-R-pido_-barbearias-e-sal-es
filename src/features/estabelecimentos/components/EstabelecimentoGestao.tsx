/**
 * Componente EstabelecimentoGestao - Painel de gestão do estabelecimento (barbeiro).
 * Puro, coeso, < 150 linhas por aba, preserva 100% visual escuro atual.
 */

import { useState, useCallback } from 'react';
import {
  Cartao,
  CartaoCorpo,
  Botao,
  BotaoPrimario,
  BotaoSecundario,
  BotaoPerigo,
  CampoTexto,
  Textarea,
  Chip,
  Icone,
  ToastProvider,
  Modal,
  Skeleton,
  EmptyState,
  Select,
} from '@/componentes';
import type { Estabelecimento, Servico, ItemGaleria, Avaliacao, ServicoInput, GaleriaItemInput, TemaInput, ConfiguracaoPixInput, MensagensAutomaticasInput, TipoLayout } from '../types';
import type { TipoMidia } from '@/tipos';
import './EstabelecimentoGestao.css';

interface EstabelecimentoGestaoProps {
  /** Dados do estabelecimento */
  estabelecimento: Estabelecimento | null;
  /** Serviços */
  servicos: Servico[];
  /** Galeria */
  galeria: ItemGaleria[];
  /** Avaliações */
  avaliacoes: Avaliacao[];
  /** Carregando */
  carregando?: boolean;
  /** Salvando */
  salvando?: boolean;
  /** Callbacks */
  aoAtualizarEstabelecimento?: (dados: Partial<Estabelecimento>) => Promise<void>;
  aoAtualizarTema?: (tema: TemaInput) => Promise<void>;
  aoAtualizarConfiguracaoPix?: (config: ConfiguracaoPixInput) => Promise<void>;
  aoAtualizarMensagensAutomaticas?: (mensagens: MensagensAutomaticasInput) => Promise<void>;
  aoAdicionarServico?: (servico: ServicoInput) => Promise<void>;
  aoAtualizarServico?: (servicoId: string, dados: Partial<Servico>) => Promise<void>;
  aoExcluirServico?: (servicoId: string) => Promise<void>;
  aoAdicionarGaleria?: (item: GaleriaItemInput) => Promise<void>;
  aoRemoverGaleria?: (itemId: string) => Promise<void>;
  aoResponderAvaliacao?: (avaliacaoId: string, resposta: string) => Promise<void>;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const ABAS = [
  { id: 'dados', rotulo: 'Dados', icone: 'editar' },
  { id: 'tema', rotulo: 'Tema', icone: 'paleta' },
  { id: 'pix', rotulo: 'Pix', icone: 'pix' },
  { id: 'mensagens', rotulo: 'Mensagens', icone: 'mensagem' },
  { id: 'servicos', rotulo: 'Serviços', icone: 'tesoura' },
  { id: 'galeria', rotulo: 'Galeria', icone: 'imagem' },
  { id: 'avaliacoes', rotulo: 'Avaliações', icone: 'estrela' },
] as const;

type AbaId = typeof ABAS[number]['id'];

export const EstabelecimentoGestao = ({
  estabelecimento,
  servicos,
  galeria,
  avaliacoes,
  carregando = false,
  salvando = false,
  aoAtualizarEstabelecimento,
  aoAtualizarTema,
  aoAtualizarConfiguracaoPix,
  aoAtualizarMensagensAutomaticas,
  aoAdicionarServico,
  aoAtualizarServico,
  aoExcluirServico,
  aoAdicionarGaleria,
  aoRemoverGaleria,
  aoResponderAvaliacao,
  className = '',
  'data-testid': testId,
}: EstabelecimentoGestaoProps) => {
  const [abaAtiva, setAbaAtiva] = useState<AbaId>('dados');
  const [modalServico, setModalServico] = useState<{ aberto: boolean; servico?: Servico }>({ aberto: false });
  const [modalGaleria, setModalGaleria] = useState<{ aberto: boolean; item?: ItemGaleria }>({ aberto: false });
  const [modalResposta, setModalResposta] = useState<{ aberto: boolean; avaliacao?: Avaliacao }>({ aberto: false });
  const [respostaTexto, setRespostaTexto] = useState('');

  if (!estabelecimento || carregando) {
    return (
      <div className={`estabelecimento-gestao ${className}`} data-testid={testId}>
        <div className="estabelecimento-gestao__skeleton" role="status" aria-label="Carregando painel de gestão">
          <div className="estabelecimento-gestao__header-skeleton">
            <Skeleton variante="retangular" largura="100%" altura={60} />
          </div>
          <div className="estabelecimento-gestao__abas-skeleton">
            <Skeleton variante="retangular" largura="300px" altura={48} />
          </div>
          <div className="estabelecimento-gestao__conteudo-skeleton">
            <Skeleton variante="retangular" largura="100%" altura={400} />
          </div>
        </div>
      </div>
    );
  }

  const handleSalvarDados = useCallback(async (dados: Partial<Estabelecimento>) => {
    try {
      await aoAtualizarEstabelecimento?.(dados);
    } catch {
      console.error('Erro ao salvar dados');
    }
  }, [aoAtualizarEstabelecimento]);

  const handleSalvarTema = useCallback(async (tema: TemaInput) => {
    try {
      await aoAtualizarTema?.(tema);
    } catch {
      console.error('Erro ao atualizar tema');
    }
  }, [aoAtualizarTema]);

  const handleSalvarPix = useCallback(async (config: ConfiguracaoPixInput) => {
    try {
      await aoAtualizarConfiguracaoPix?.(config);
    } catch {
      console.error('Erro ao salvar configuração Pix');
    }
  }, [aoAtualizarConfiguracaoPix]);

  const handleSalvarMensagens = useCallback(async (mensagens: MensagensAutomaticasInput) => {
    try {
      await aoAtualizarMensagensAutomaticas?.(mensagens);
    } catch {
      console.error('Erro ao atualizar mensagens');
    }
  }, [aoAtualizarMensagensAutomaticas]);

  const handleAdicionarServico = useCallback(async (servico: ServicoInput) => {
    try {
      await aoAdicionarServico?.(servico);
      setModalServico({ aberto: false });
    } catch {
      console.error('Erro ao adicionar serviço');
    }
  }, [aoAdicionarServico]);

  const handleAtualizarServico = useCallback(async (servicoId: string, dados: Partial<Servico>) => {
    try {
      await aoAtualizarServico?.(servicoId, dados);
      setModalServico({ aberto: false });
    } catch {
      console.error('Erro ao atualizar serviço');
    }
  }, [aoAtualizarServico]);

  const handleExcluirServico = useCallback(async (servicoId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      await aoExcluirServico?.(servicoId);
    } catch {
      console.error('Erro ao excluir serviço');
    }
  }, [aoExcluirServico]);

  const handleAdicionarGaleria = useCallback(async (item: GaleriaItemInput) => {
    try {
      await aoAdicionarGaleria?.(item);
      setModalGaleria({ aberto: false });
    } catch {
      console.error('Erro ao adicionar à galeria');
    }
  }, [aoAdicionarGaleria]);

  const handleRemoverGaleria = useCallback(async (itemId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este item da galeria?')) return;
    try {
      await aoRemoverGaleria?.(itemId);
    } catch {
      console.error('Erro ao remover da galeria');
    }
  }, [aoRemoverGaleria]);

  const handleResponderAvaliacao = useCallback(async () => {
    if (!respostaTexto.trim() || !modalResposta.avaliacao) return;
    try {
      await aoResponderAvaliacao?.(modalResposta.avaliacao.id, respostaTexto.trim());
      setModalResposta({ aberto: false });
      setRespostaTexto('');
    } catch {
      console.error('Erro ao enviar resposta');
    }
  }, [aoResponderAvaliacao, respostaTexto, modalResposta.avaliacao]);

  return (
    <ToastProvider>
      <div className={`estabelecimento-gestao ${className}`} data-testid={testId}>
        {/* Header */}
        <header className="estabelecimento-gestao__header">
          <div className="estabelecimento-gestao__header-conteudo">
            <div className="estabelecimento-gestao__avatar-wrapper">
              {estabelecimento.galeria[0]?.src ? (
                <img
                  src={estabelecimento.galeria[0].src}
                  alt={estabelecimento.nome}
                  className="estabelecimento-gestao__avatar-img"
                  width={80}
                  height={80}
                  data-testid="gestao-avatar"
                />
              ) : (
                <div className="estabelecimento-gestao__avatar-placeholder">
                  <Icone nome="tesoura" tamanho={32} />
                </div>
              )}
            </div>
            <div className="estabelecimento-gestao__info-header">
              <h1 className="estabelecimento-gestao__nome">{estabelecimento.nome}</h1>
              <div className="estabelecimento-gestao__badges">
                <Chip variante={estabelecimento.status === 'aprovado' ? 'status' : estabelecimento.status === 'pendente' ? 'padrao' : 'padrao'}>
                  {estabelecimento.status === 'aprovado' ? 'Aprovado' : estabelecimento.status === 'pendente' ? 'Pendente' : 'Rejeitado'}
                </Chip>
                <Chip variante="nicho">{estabelecimento.nicho}</Chip>
              </div>
              <p className="estabelecimento-gestao__slug">Slug: <code>{estabelecimento.slug}</code></p>
            </div>
          </div>
        </header>

        {/* Abas */}
        <nav className="estabelecimento-gestao__abas" role="tablist" aria-label="Seções de gestão" data-testid="gestao-abas">
          {ABAS.map((aba) => (
            <Botao
              key={aba.id}
              role="tab"
              aria-selected={abaAtiva === aba.id}
              aria-controls={`painel-${aba.id}`}
              id={`aba-${aba.id}`}
              variante={abaAtiva === aba.id ? 'primario' : 'fantasma'}
              tamanho="pequeno"
              aoClicar={() => setAbaAtiva(aba.id)}
              className="estabelecimento-gestao__aba-btn"
              data-testid={`aba-${aba.id}`}
            >
              <Icone nome={aba.icone as any} tamanho={16} className="estabelecimento-gestao__aba-icone" aria-hidden="true" />
              <span className="estabelecimento-gestao__aba-rotulo">{aba.rotulo}</span>
            </Botao>
          ))}
        </nav>

        {/* Conteúdo */}
        <main className="estabelecimento-gestao__conteudo">
          <div role="tabpanel" id="painel-dados" aria-labelledby="aba-dados" hidden={abaAtiva !== 'dados'} data-testid="painel-dados">
            {abaAtiva === 'dados' && (
              <DadosBasicos
                estabelecimento={estabelecimento}
                salvando={salvando}
                aoSalvar={handleSalvarDados}
                data-testid="gestao-dados"
              />
            )}
          </div>

          <div role="tabpanel" id="painel-tema" aria-labelledby="aba-tema" hidden={abaAtiva !== 'tema'} data-testid="painel-tema">
            {abaAtiva === 'tema' && (
              <TemaConfig
                estabelecimento={estabelecimento}
                salvando={salvando}
                aoSalvar={handleSalvarTema}
                data-testid="gestao-tema"
              />
            )}
          </div>

          <div role="tabpanel" id="painel-pix" aria-labelledby="aba-pix" hidden={abaAtiva !== 'pix'} data-testid="painel-pix">
            {abaAtiva === 'pix' && (
              <PixConfig
                estabelecimento={estabelecimento}
                salvando={salvando}
                aoSalvar={handleSalvarPix}
                data-testid="gestao-pix"
              />
            )}
          </div>

          <div role="tabpanel" id="painel-mensagens" aria-labelledby="aba-mensagens" hidden={abaAtiva !== 'mensagens'} data-testid="painel-mensagens">
            {abaAtiva === 'mensagens' && (
              <MensagensConfig
                salvando={salvando}
                aoSalvar={handleSalvarMensagens}
                data-testid="gestao-mensagens"
              />
            )}
          </div>

          <div role="tabpanel" id="painel-servicos" aria-labelledby="aba-servicos" hidden={abaAtiva !== 'servicos'} data-testid="painel-servicos">
            {abaAtiva === 'servicos' && (
              <ServicosGestao
                servicos={servicos}
                aoAbrirModal={() => setModalServico({ aberto: true, servico: undefined })}
                aoEditar={(s) => setModalServico({ aberto: true, servico: s })}
                aoExcluir={handleExcluirServico}
                data-testid="gestao-servicos"
              />
            )}
          </div>

          <div role="tabpanel" id="painel-galeria" aria-labelledby="aba-galeria" hidden={abaAtiva !== 'galeria'} data-testid="painel-galeria">
            {abaAtiva === 'galeria' && (
              <GaleriaGestao
                galeria={galeria}
                aoAbrirModal={() => setModalGaleria({ aberto: true, item: undefined })}
                aoEditar={(item) => setModalGaleria({ aberto: true, item })}
                aoExcluir={handleRemoverGaleria}
                data-testid="gestao-galeria"
              />
            )}
          </div>

          <div role="tabpanel" id="painel-avaliacoes" aria-labelledby="aba-avaliacoes" hidden={abaAtiva !== 'avaliacoes'} data-testid="painel-avaliacoes">
            {abaAtiva === 'avaliacoes' && (
              <AvaliacoesGestao
                avaliacoes={avaliacoes}
                aoAbrirModal={(avaliacao) => { setModalResposta({ aberto: true, avaliacao }); setRespostaTexto(avaliacao.resposta || ''); }}
                data-testid="gestao-avaliacoes"
              />
            )}
          </div>
        </main>

        {/* Modals */}
        <Modal
          aberto={modalServico.aberto}
          aoFechar={() => setModalServico({ aberto: false })}
          titulo={modalServico.servico ? 'Editar serviço' : 'Novo serviço'}
          tamanho="medio"
          data-testid="modal-servico"
        >
          <ServicoForm
            servico={modalServico.servico}
            aoSalvar={modalServico.servico ? (dados) => handleAtualizarServico(modalServico.servico!.id, dados) : handleAdicionarServico}
            aoFechar={() => setModalServico({ aberto: false })}
            salvando={salvando}
          />
        </Modal>

        <Modal
          aberto={modalGaleria.aberto}
          aoFechar={() => setModalGaleria({ aberto: false })}
          titulo={modalGaleria.item ? 'Editar item da galeria' : 'Adicionar à galeria'}
          tamanho="medio"
          data-testid="modal-galeria"
        >
          <GaleriaForm
            item={modalGaleria.item}
            aoSalvar={handleAdicionarGaleria}
            aoFechar={() => setModalGaleria({ aberto: false })}
            salvando={salvando}
          />
        </Modal>

        <Modal
          aberto={modalResposta.aberto}
          aoFechar={() => { setModalResposta({ aberto: false }); setRespostaTexto(''); }}
          titulo="Responder avaliação"
          tamanho="medio"
          data-testid="modal-resposta-avaliacao"
        >
          <div className="estabelecimento-gestao__modal-resposta">
            <Textarea
              label="Sua resposta"
              valor={respostaTexto}
              aoAlterar={setRespostaTexto}
              placeholder="Agradeça o cliente, esclareça dúvidas, etc."
              linhas={4}
              maxLength={500}
              data-testid="resposta-avaliacao-texto"
            />
            <div className="estabelecimento-gestao__modal-acoes">
              <BotaoSecundario aoClicar={() => { setModalResposta({ aberto: false }); setRespostaTexto(''); }} data-testid="modal-resposta-cancelar">
                Cancelar
              </BotaoSecundario>
              <BotaoPrimario aoClicar={handleResponderAvaliacao} desabilitado={!respostaTexto.trim() || salvando} carregando={salvando} data-testid="modal-resposta-enviar">
                Enviar resposta
              </BotaoPrimario>
            </div>
          </div>
        </Modal>
      </div>
    </ToastProvider>
  );
};

/* Sub-componentes para cada aba */

function DadosBasicos({ estabelecimento, salvando, aoSalvar }: { estabelecimento: Estabelecimento; salvando: boolean; aoSalvar: (dados: Partial<Estabelecimento>) => void }) {
  const [form, setForm] = useState({
    nome: estabelecimento.nome,
    responsavel: estabelecimento.responsavel,
    telefone: '',
    whatsapp: estabelecimento.whatsapp,
    email: '',
    cidade: estabelecimento.cidade,
    endereco: estabelecimento.endereco,
    sobre: estabelecimento.sobre,
    horarioFuncionamento: estabelecimento.horarioFuncionamento,
    permiteAutoEdicao: estabelecimento.permiteAutoEdicao,
  });

  const handleChange = (campo: string, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = () => {
    aoSalvar(form);
  };

  return (
    <Cartao variante="padrao" className="estabelecimento-gestao__painel">
      <CartaoCorpo>
        <h2 className="estabelecimento-gestao__secao-titulo">Dados básicos</h2>

        <div className="estabelecimento-gestao__grid">
          <CampoTexto label="Nome do estabelecimento" valor={form.nome} aoAlterar={(v) => handleChange('nome', v)} obrigatorio data-testid="dados-nome" />
          <CampoTexto label="Responsável" valor={form.responsavel} aoAlterar={(v) => handleChange('responsavel', v)} obrigatorio data-testid="dados-responsavel" />
          <CampoTexto label="WhatsApp" valor={form.whatsapp} aoAlterar={(v) => handleChange('whatsapp', v)} tipo="tel" placeholder="(XX) XXXXX-XXXX" data-testid="dados-whatsapp" />
          <CampoTexto label="Cidade" valor={form.cidade} aoAlterar={(v) => handleChange('cidade', v)} obrigatorio data-testid="dados-cidade" />
          <CampoTexto label="Endereço" valor={form.endereco} aoAlterar={(v) => handleChange('endereco', v)} data-testid="dados-endereco" />
          <CampoTexto label="Horário de funcionamento" valor={form.horarioFuncionamento} aoAlterar={(v) => handleChange('horarioFuncionamento', v)} placeholder="Seg a Sáb, 9h às 18h" data-testid="dados-horario" />
        </div>

        <Textarea
          label="Sobre o estabelecimento"
          valor={form.sobre}
          aoAlterar={(v) => handleChange('sobre', v)}
          linhas={4}
          maxLength={2000}
          placeholder="Descreva seu estabelecimento, diferenciais, etc."
          data-testid="dados-sobre"
        />

        <div className="estabelecimento-gestao__toggle">
          <label className="estabelecimento-gestao__checkbox-label">
            <input
              type="checkbox"
              checked={form.permiteAutoEdicao}
              onChange={(e) => handleChange('permiteAutoEdicao', String(e.target.checked))}
              data-testid="dados-auto-edicao"
            />
            <span>Permitir auto-edição da página pública pelo barbeiro</span>
          </label>
        </div>

        <div className="estabelecimento-gestao__acoes">
          <BotaoPrimario aoClicar={handleSubmit} carregando={salvando} data-testid="dados-salvar">
            Salvar alterações
          </BotaoPrimario>
        </div>
      </CartaoCorpo>
    </Cartao>
  );
}

function TemaConfig({ estabelecimento, salvando, aoSalvar }: { estabelecimento: Estabelecimento; salvando: boolean; aoSalvar: (tema: TemaInput) => void }) {
  const [form, setForm] = useState({
    cor: estabelecimento.tema.cor,
    layout: estabelecimento.tema.layout,
    titulo: estabelecimento.tema.titulo,
    subtitulo: estabelecimento.tema.subtitulo,
  });

  return (
    <Cartao variante="padrao" className="estabelecimento-gestao__painel">
      <CartaoCorpo>
        <h2 className="estabelecimento-gestao__secao-titulo">Tema visual</h2>

        <div className="estabelecimento-gestao__grid">
          <CampoTexto
            label="Cor principal (hex)"
            valor={form.cor}
            aoAlterar={(v) => setForm((prev) => ({ ...prev, cor: v }))}
            placeholder="#B45309"
            data-testid="tema-cor"
          />
          <Select
            label="Layout"
            valor={form.layout}
            aoAlterar={(v) => setForm((prev) => ({ ...prev, layout: v as TipoLayout }))}
            opcoes={[
              { valor: 'classico', rotulo: 'Clássico' },
              { valor: 'moderno', rotulo: 'Moderno' },
            ]}
            data-testid="tema-layout"
          />
          <CampoTexto label="Título da página" valor={form.titulo} aoAlterar={(v) => setForm((prev) => ({ ...prev, titulo: v }))} data-testid="tema-titulo" />
          <CampoTexto label="Subtítulo" valor={form.subtitulo} aoAlterar={(v) => setForm((prev) => ({ ...prev, subtitulo: v }))} data-testid="tema-subtitulo" />
        </div>

        <div className="estabelecimento-gestao__preview">
          <span className="estabelecimento-gestao__preview-label">Prévia da cor:</span>
          <div className="estabelecimento-gestao__preview-cor" style={{ backgroundColor: form.cor }} />
        </div>

        <div className="estabelecimento-gestao__acoes">
          <BotaoPrimario aoClicar={() => aoSalvar(form)} carregando={salvando} data-testid="tema-salvar">
            Salvar tema
          </BotaoPrimario>
        </div>
      </CartaoCorpo>
    </Cartao>
  );
}

function PixConfig({ estabelecimento, salvando, aoSalvar }: { estabelecimento: Estabelecimento; salvando: boolean; aoSalvar: (config: ConfiguracaoPixInput) => void }) {
  const [form, setForm] = useState({
    modo: estabelecimento.configuracaoPix.modo,
    chave: estabelecimento.configuracaoPix.chave,
    percentualSinal: estabelecimento.configuracaoPix.percentualSinal,
  });

  return (
    <Cartao variante="padrao" className="estabelecimento-gestao__painel">
      <CartaoCorpo>
        <h2 className="estabelecimento-gestao__secao-titulo">Configuração Pix</h2>

        <Select
          label="Modo de recebimento"
          valor={form.modo}
          aoAlterar={(v) => setForm((prev) => ({ ...prev, modo: v as ConfiguracaoPixInput['modo'] }))}
          opcoes={[
            { valor: 'desativado', rotulo: 'Desativado' },
            { valor: 'opcional', rotulo: 'Opcional (cliente escolhe)' },
            { valor: 'obrigatorio', rotulo: 'Obrigatório (sinal via Pix)' },
          ]}
          data-testid="pix-modo"
        />

        {form.modo !== 'desativado' && (
          <>
            <CampoTexto
              label="Chave Pix"
              valor={form.chave}
              aoAlterar={(v) => setForm((prev) => ({ ...prev, chave: v }))}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              data-testid="pix-chave"
            />
            <CampoTexto
              label="Percentual de sinal (%)"
              valor={String(form.percentualSinal)}
              aoAlterar={(v) => setForm((prev) => ({ ...prev, percentualSinal: Number(v) || 0 }))}
              tipo="number"
              min={0}
              max={100}
              step={5}
              data-testid="pix-percentual"
            />
          </>
        )}

        <div className="estabelecimento-gestao__acoes">
          <BotaoPrimario aoClicar={() => aoSalvar(form)} carregando={salvando} data-testid="pix-salvar">
            Salvar configuração
          </BotaoPrimario>
        </div>
      </CartaoCorpo>
    </Cartao>
  );
}

function MensagensConfig({ salvando, aoSalvar }: { salvando: boolean; aoSalvar: (mensagens: MensagensAutomaticasInput) => void }) {
  const [form, setForm] = useState({
    geral: '',
    porServico: {} as Record<string, string>,
  });

  return (
    <Cartao variante="padrao" className="estabelecimento-gestao__painel">
      <CartaoCorpo>
        <h2 className="estabelecimento-gestao__secao-titulo">Mensagens automáticas (WhatsApp)</h2>

        <Textarea
          label="Mensagem geral"
          valor={form.geral}
          aoAlterar={(v) => setForm((prev) => ({ ...prev, geral: v }))}
          linhas={3}
          maxLength={500}
          placeholder="Mensagem enviada para todos os agendamentos..."
          data-testid="mensagens-geral"
        />

        <div className="estabelecimento-gestao__acoes">
          <BotaoPrimario aoClicar={() => aoSalvar(form)} carregando={salvando} data-testid="mensagens-salvar">
            Salvar mensagens
          </BotaoPrimario>
        </div>
      </CartaoCorpo>
    </Cartao>
  );
}

function ServicosGestao({
  servicos,
  aoAbrirModal,
  aoEditar,
  aoExcluir,
}: {
  servicos: Servico[];
  aoAbrirModal: () => void;
  aoEditar: (servico: Servico) => void;
  aoExcluir: (servicoId: string) => void;
}) {
  return (
    <div className="estabelecimento-gestao__servicos">
      <div className="estabelecimento-gestao__secao-header">
        <h2 className="estabelecimento-gestao__secao-titulo">Serviços</h2>
        <BotaoPrimario aoClicar={aoAbrirModal} iconeEsquerda={<Icone nome="mais" tamanho={16} />} data-testid="servicos-novo">
          Novo serviço
        </BotaoPrimario>
      </div>

      {servicos.length === 0 ? (
        <EmptyState titulo="Nenhum serviço" mensagem="Adicione seu primeiro serviço." icone="tesoura" acao={{ rotulo: 'Adicionar serviço', aoClicar: aoAbrirModal }} className="estabelecimento-gestao__empty" />
      ) : (
        <div className="estabelecimento-gestao__servicos-lista" role="list">
          {servicos.map((servico: Servico, index: number) => (
            <div key={servico.id} className="estabelecimento-gestao__servico-item" role="listitem" data-testid={`servico-item-${servico.id}`}>
              <div className="estabelecimento-gestao__servico-info">
                <span className="estabelecimento-gestao__servico-ordem">{index + 1}</span>
                <div>
                  <strong className="estabelecimento-gestao__servico-nome">{servico.nome}</strong>
                  <span className="estabelecimento-gestao__servico-meta">
                    R$ {servico.preco.toFixed(2).replace('.', ',')} · {servico.duracaoMinutos} min · {servico.tag}
                  </span>
                </div>
              </div>
              <div className="estabelecimento-gestao__servico-acoes">
                <BotaoSecundario tamanho="pequeno" aoClicar={() => aoEditar(servico)} iconeEsquerda={<Icone nome="editar" tamanho={14} />} data-testid={`servico-editar-${servico.id}`}>
                  Editar
                </BotaoSecundario>
                <BotaoPerigo tamanho="pequeno" aoClicar={() => aoExcluir(servico.id)} iconeEsquerda={<Icone nome="lixeira" tamanho={14} />} data-testid={`servico-excluir-${servico.id}`}>
                  Excluir
                </BotaoPerigo>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GaleriaGestao({
  galeria,
  aoAbrirModal,
  aoEditar,
  aoExcluir,
}: {
  galeria: ItemGaleria[];
  aoAbrirModal: () => void;
  aoEditar: (item: ItemGaleria) => void;
  aoExcluir: (itemId: string) => void;
}) {
  return (
    <div className="estabelecimento-gestao__galeria">
      <div className="estabelecimento-gestao__secao-header">
        <h2 className="estabelecimento-gestao__secao-titulo">Galeria / Portfólio</h2>
        <BotaoPrimario aoClicar={aoAbrirModal} iconeEsquerda={<Icone nome="mais" tamanho={16} />} data-testid="galeria-novo">
          Adicionar item
        </BotaoPrimario>
      </div>

      {galeria.length === 0 ? (
        <EmptyState titulo="Galeria vazia" mensagem="Adicione fotos dos seus cortes e do ambiente." icone="foto" acao={{ rotulo: 'Adicionar à galeria', aoClicar: aoAbrirModal }} className="estabelecimento-gestao__empty" />
      ) : (
        <div className="estabelecimento-gestao__galeria-grid" role="list">
          {galeria.map((item: ItemGaleria, index: number) => (
            <div key={item.id} className="estabelecimento-gestao__galeria-item" role="listitem" data-testid={`galeria-item-${item.id}`}>
              <img src={item.src} alt={`Galeria ${index + 1}`} loading="lazy" />
              <div className="estabelecimento-gestao__galeria-overlay">
                <Botao tamanho="pequeno" variante="fantasma" aoClicar={() => aoEditar(item)} iconeEsquerda={<Icone nome="editar" tamanho={14} />} data-testid={`galeria-editar-${item.id}`}>
                  Editar
                </Botao>
                <Botao tamanho="pequeno" variante="fantasma" aoClicar={() => item.id && aoExcluir(item.id)} iconeEsquerda={<Icone nome="lixeira" tamanho={14} />} data-testid={`galeria-excluir-${item.id || ''}`}>
                  Excluir
                </Botao>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AvaliacoesGestao({
  avaliacoes,
  aoAbrirModal,
}: { avaliacoes: Avaliacao[]; aoAbrirModal: (avaliacao: Avaliacao) => void }) {
  return (
    <div className="estabelecimento-gestao__avaliacoes">
      <h2 className="estabelecimento-gestao__secao-titulo">Avaliações recebidas</h2>

      {avaliacoes.length === 0 ? (
        <EmptyState titulo="Nenhuma avaliação" mensagem="Seus clientes ainda não avaliaram." icone="estrela" className="estabelecimento-gestao__empty" />
      ) : (
        <div className="estabelecimento-gestao__avaliacoes-lista" role="list">
          {avaliacoes.map((avaliacao: any) => (
            <div key={avaliacao.id} className="estabelecimento-gestao__avaliacao-item" role="listitem" data-testid={`avaliacao-gestao-${avaliacao.id}`}>
              <div className="estabelecimento-gestao__avaliacao-header">
                <div className="estabelecimento-gestao__avaliacao-cliente">
                  <strong>{avaliacao.nomeCliente}</strong>
                  <span className="estabelecimento-gestao__avaliacao-data">{avaliacao.data}</span>
                </div>
                <div className="estabelecimento-gestao__avaliacao-estrelas">
                  {[5,4,3,2,1].map(n => <Icone key={n} nome={n <= avaliacao.estrelas ? 'estrela' : 'estrelaVazia'} tamanho={16} />)}
                </div>
              </div>
              <p className="estabelecimento-gestao__avaliacao-comentario">{avaliacao.comentario || 'Sem comentário.'}</p>
              {avaliacao.resposta ? (
                <div className="estabelecimento-gestao__avaliacao-resposta">
                  <strong>Sua resposta:</strong> {avaliacao.resposta}
                </div>
              ) : (
                <BotaoSecundario tamanho="pequeno" aoClicar={() => aoAbrirModal(avaliacao)} iconeEsquerda={<Icone nome="mensagem" tamanho={14} />} data-testid={`avaliacao-responder-${avaliacao.id}`}>
                  Responder
                </BotaoSecundario>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServicoForm({ servico, aoSalvar, aoFechar, salvando }: { servico?: Servico; aoSalvar: (dados: ServicoInput) => void; aoFechar: () => void; salvando: boolean }) {
  const [form, setForm] = useState({
    nome: servico?.nome || '',
    preco: servico?.preco || 0,
    duracaoMinutos: servico?.duracaoMinutos || 30,
    tag: servico?.tag || 'corte',
  });

  const handleSubmit = () => {
    aoSalvar(form as ServicoInput);
  };

  return (
    <div className="estabelecimento-gestao__modal-form">
      <CampoTexto label="Nome do serviço" valor={form.nome} aoAlterar={(v) => setForm((prev) => ({ ...prev, nome: v }))} obrigatorio data-testid="servico-nome" />
      <div className="estabelecimento-gestao__grid">
        <CampoTexto label="Preço (R$)" valor={String(form.preco)} aoAlterar={(v) => setForm((prev) => ({ ...prev, preco: Number(v) || 0 }))} tipo="number" min={0} step={0.01} data-testid="servico-preco" />
        <CampoTexto label="Duração (min)" valor={String(form.duracaoMinutos)} aoAlterar={(v) => setForm((prev) => ({ ...prev, duracaoMinutos: Number(v) || 0 }))} tipo="number" min={5} max={480} data-testid="servico-duracao" />
        <Select label="Categoria" valor={form.tag} aoAlterar={(v) => setForm((prev) => ({ ...prev, tag: v as string }))} opcoes={[{ valor: 'corte', rotulo: 'Corte' }, { valor: 'barba', rotulo: 'Barba' }, { valor: 'combo', rotulo: 'Combo' }, { valor: 'outro', rotulo: 'Outro' }]} data-testid="servico-tag" />
      </div>
      <div className="estabelecimento-gestao__modal-acoes">
        <BotaoSecundario aoClicar={aoFechar} data-testid="servico-cancelar">Cancelar</BotaoSecundario>
        <BotaoPrimario aoClicar={handleSubmit} carregando={salvando} desabilitado={!form.nome.trim()} data-testid="servico-salvar">{servico ? 'Salvar alterações' : 'Adicionar serviço'}</BotaoPrimario>
      </div>
    </div>
  );
}

function GaleriaForm({ item, aoSalvar, aoFechar, salvando }: { item?: ItemGaleria; aoSalvar: (dados: GaleriaItemInput) => void; aoFechar: () => void; salvando: boolean }) {
  const [form, setForm] = useState({
    src: item?.src || '',
    tipo: item?.tipo || 'imagem',
  });

  const handleSubmit = () => {
    aoSalvar(form as GaleriaItemInput);
  };

  return (
    <div className="estabelecimento-gestao__modal-form">
      <CampoTexto label="URL da imagem/vídeo" valor={form.src} aoAlterar={(v) => setForm((prev) => ({ ...prev, src: v }))} obrigatorio placeholder="https://..." data-testid="galeria-src" />
      <Select label="Tipo" valor={form.tipo} aoAlterar={(v) => setForm((prev) => ({ ...prev, tipo: v as TipoMidia }))} opcoes={[{ valor: 'imagem', rotulo: 'Imagem' }, { valor: 'video', rotulo: 'Vídeo' }]} data-testid="galeria-tipo" />
      <div className="estabelecimento-gestao__modal-acoes">
        <BotaoSecundario aoClicar={aoFechar} data-testid="galeria-cancelar">Cancelar</BotaoSecundario>
        <BotaoPrimario aoClicar={handleSubmit} carregando={salvando} desabilitado={!form.src.trim()} data-testid="galeria-salvar">{item ? 'Salvar alterações' : 'Adicionar à galeria'}</BotaoPrimario>
      </div>
    </div>
  );
}

export default EstabelecimentoGestao;
