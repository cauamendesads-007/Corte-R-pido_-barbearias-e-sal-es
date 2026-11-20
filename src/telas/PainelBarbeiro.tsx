/**
 * Tela PainelBarbeiro - Dashboard do barbeiro/estabelecimento.
 * Abas: Visão geral, Agenda, Serviços, Fila, Galeria, Configurações.
 * Métricas, calendário, CRUD de serviços, gestão de fila.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAgendamentosBarbeiro } from '@/hooks/useAgendamentos';
import type { StatusPagamento } from '@/tipos';
import {
  Container,
  Cartao,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  BotaoIcone,
  CampoTexto,
  CampoNumero,
  Textarea,
  Select,
  Avatar,
  ModalFormulario,
  ToastProvider,
  useGlobalToast,
  Skeleton,
} from '@/componentes';
import { ICONES } from '@/constantes';
import './PainelBarbeiro.css';

type AbaPainel = 'visao' | 'agenda' | 'servicos' | 'fila' | 'galeria' | 'configuracoes';

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracaoMinutos: number;
  tag: string;
  descricao: string;
}

const PainelBarbeiro = () => {
  const { usuario } = useAuth();
  const { sucesso, erro: toastErro } = useGlobalToast();

  const [abaAtiva, setAbaAtiva] = useState<AbaPainel>('visao');
  const [modalServicoAberto, setModalServicoAberto] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<Servico | null>(null);

  const { agendamentos, carregando, filtros, setFiltros, cancelar } = useAgendamentosBarbeiro(usuario?.estabelecimentoId);

  // Métricas calculadas
  const hoje = new Date().toISOString().split('T')[0];
  const agendamentosHoje = agendamentos.filter((a) => a.dia === hoje);
  const agendamentosPendentes = agendamentosHoje.filter((a) => ['aguardando_pix', 'no_local'].includes(a.statusPagamento));
  const agendamentosConfirmados = agendamentosHoje.filter((a) => a.statusPagamento === 'pago');
  const filaAtual = agendamentosHoje.filter((a) => !['cancelado', 'concluido'].includes(a.status)).length;

  // Serviços mock (em produção viria da API)
  const [servicos, setServicos] = useState<Servico[]>([
    { id: '1', nome: 'Corte masculino', preco: 45, duracaoMinutos: 30, tag: 'Corte', descricao: 'Corte clássico ou moderno com tesoura e máquina' },
    { id: '2', nome: 'Barba', preco: 30, duracaoMinutos: 20, tag: 'Barba', descricao: 'Aparar, modelar e hidratar a barba' },
    { id: '3', nome: 'Corte + Barba', preco: 65, duracaoMinutos: 45, tag: 'Combo', descricao: 'Corte completo + barba com toalha quente' },
    { id: '4', nome: 'Sobrancelha', preco: 20, duracaoMinutos: 15, tag: 'Estética', descricao: 'Design e depilação de sobrancelha' },
  ]);

  const handleAbrirModalServico = (servico?: Servico) => {
    if (servico) {
      setServicoEditando({ ...servico });
    } else {
      setServicoEditando({ id: '', nome: '', preco: 0, duracaoMinutos: 30, tag: 'Corte', descricao: '' });
    }
    setModalServicoAberto(true);
  };

  const handleSalvarServico = async () => {
    if (!servicoEditando) return;
    if (!servicoEditando.nome || servicoEditando.preco <= 0 || servicoEditando.duracaoMinutos <= 0) {
      toastErro('Preencha todos os campos obrigatórios');
      return;
    }

    // Simula salvamento
    await new Promise((r) => setTimeout(r, 500));

    if (servicoEditando.id) {
      setServicos((prev) => prev.map((s) => (s.id === servicoEditando.id ? servicoEditando : s)));
      sucesso('Serviço atualizado!');
    } else {
      const novoServico = { ...servicoEditando, id: Date.now().toString() };
      setServicos((prev) => [...prev, novoServico]);
      sucesso('Serviço criado!');
    }
    setModalServicoAberto(false);
    setServicoEditando(null);
  };

  const handleExcluirServico = (id: string) => {
    setServicos((prev) => prev.filter((s) => s.id !== id));
    sucesso('Serviço excluído!');
  };

  const abas = [
    { id: 'visao', rotulo: 'Visão geral', icone: ICONES.painel },
    { id: 'agenda', rotulo: 'Agenda', icone: ICONES.calendario, contador: agendamentosHoje.length },
    { id: 'servicos', rotulo: 'Serviços', icone: ICONES.tesoura, contador: servicos.length },
    { id: 'fila', rotulo: 'Fila', icone: ICONES.fila, contador: filaAtual },
    { id: 'galeria', rotulo: 'Galeria', icone: ICONES.foto },
    { id: 'configuracoes', rotulo: 'Configurações', icone: ICONES.configuracoes },
  ];

  if (!usuario || usuario.papel !== 'barbeiro') {
    return (
      <Container variante="com-cabecalho">
        <div className="painel__acesso-negado">
          <h1>Acesso restrito</h1>
          <p>Esta área é exclusiva para barbeiros cadastrados.</p>
        </div>
      </Container>
    );
  }

  return (
    <ToastProvider>
      <Container variante="com-cabecalho" data-testid="painel-barbeiro-container">
        {/* Header */}
        <header className="painel__cabecalho">
          <div className="painel__info">
            <h1 className="painel__titulo">Painel do Barbeiro</h1>
            <p className="painel__subtitulo">{usuario.nome || 'Seu estabelecimento'}</p>
          </div>
          <div className="painel__acoes">
            <BotaoIcone
              icone={ICONES.sino}
              variante="fantasma"
              aoClicar={() => window.location.href = '/notificacoes'}
              ariaLabel="Notificações"
            />
            <Avatar
              src={usuario.avatar}
              nome={usuario.nome}
              corFundo="#64748b"
              tamanho="pequeno"
            />
          </div>
        </header>

        {/* Métricas (Visão geral) */}
        {abaAtiva === 'visao' && (
          <div className="painel__metricas" role="region" aria-label="Métricas do dia" data-testid="painel-metricas">
            <Cartao className="painel__metrica">
              <CartaoCorpo>
                <div className="painel__metrica-icone" style={{ background: 'var(--cor-primaria-transparente)', color: 'var(--cor-primaria)' }}>
                  {ICONES.calendario}
                </div>
                <div>
                  <p className="painel__metrica-valor">{agendamentosHoje.length}</p>
                  <p className="painel__metrica-label">Agendamentos hoje</p>
                </div>
              </CartaoCorpo>
            </Cartao>
            <Cartao className="painel__metrica">
              <CartaoCorpo>
                <div className="painel__metrica-icone" style={{ background: 'var(--cor-sucesso-transparente)', color: 'var(--cor-sucesso)' }}>
                  {ICONES.verificarCirculo}
                </div>
                <div>
                  <p className="painel__metrica-valor">{agendamentosConfirmados.length}</p>
                  <p className="painel__metrica-label">Confirmados</p>
                </div>
              </CartaoCorpo>
            </Cartao>
            <Cartao className="painel__metrica">
              <CartaoCorpo>
                <div className="painel__metrica-icone" style={{ background: 'var(--cor-aviso-transparente)', color: 'var(--cor-aviso)' }}>
                  {ICONES.relogio}
                </div>
                <div>
                  <p className="painel__metrica-valor">{agendamentosPendentes.length}</p>
                  <p className="painel__metrica-label">Pendentes</p>
                </div>
              </CartaoCorpo>
            </Cartao>
            <Cartao className="painel__metrica">
              <CartaoCorpo>
                <div className="painel__metrica-icone" style={{ background: 'var(--cor-primaria-transparente)', color: 'var(--cor-primaria)' }}>
                  {ICONES.usuarios}
                </div>
                <div>
                  <p className="painel__metrica-valor">{filaAtual}</p>
                  <p className="painel__metrica-label">Na fila agora</p>
                </div>
              </CartaoCorpo>
            </Cartao>
          </div>
        )}

        {/* Próximos agendamentos (Visão geral) */}
        {abaAtiva === 'visao' && agendamentosHoje.length > 0 && (
          <section className="painel__secao" data-testid="painel-proximos">
            <div className="painel__secao-cabecalho">
              <h2>Próximos agendamentos</h2>
              <BotaoSecundario tamanho="pequeno" aoClicar={() => setAbaAtiva('agenda')}>Ver todos</BotaoSecundario>
            </div>
            <div className="painel__lista" role="list">
              {agendamentosHoje.slice(0, 5).map((agendamento) => (
                <div key={agendamento.id} className="painel__agendamento-item" data-testid={`painel-agendamento-${agendamento.id}`}>
                  <div className="painel__agendamento-info">
                    <strong>{agendamento.nomeCliente}</strong>
                    <span>{agendamento.horario} - {agendamento.servicos}</span>
                  </div>
                  <span className={`painel__status-${agendamento.statusPagamento}`}>
                    {agendamento.statusPagamento === 'pago' ? '✓ Pago' : agendamento.statusPagamento === 'aguardando_pix' ? '⏳ Aguardando Pix' : '💰 No local'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Abas */}
        <nav className="painel__abas" role="tablist" aria-label="Seções do painel">
          {abas.map((aba) => (
            <button
              key={aba.id}
              role="tab"
              aria-selected={abaAtiva === aba.id}
              aria-controls={`painel-${aba.id}`}
              id={`aba-${aba.id}`}
              className={`painel__aba ${abaAtiva === aba.id ? 'painel__aba--ativa' : ''}`}
              onClick={() => setAbaAtiva(aba.id as AbaPainel)}
              data-testid={`painel-aba-${aba.id}`}
            >
              <span aria-hidden="true">{aba.icone}</span>
              {aba.rotulo}
              {aba.contador !== undefined && aba.contador > 0 && (
                <span className="painel__aba-badge">{aba.contador}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Painel Agenda */}
        <div className="painel__painel" role="tabpanel" id="painel-agenda" aria-labelledby="aba-agenda" hidden={abaAtiva !== 'agenda'}>
          <div className="painel__filtros">
            <Select
              label="Status"
              valor={filtros.status || ''}
              aoAlterar={(v: string | string[]) => {
                const valorStr = Array.isArray(v) ? v[0] : v;
                setFiltros({ ...filtros, status: (valorStr === '' ? undefined : valorStr as StatusPagamento) });
              }}
              opcoes={[
                { valor: '', rotulo: 'Todos os status' },
                { valor: 'no_local', rotulo: 'Pagar no local' },
                { valor: 'aguardando_pix', rotulo: 'Aguardando Pix' },
                { valor: 'pago', rotulo: 'Confirmado' },
                { valor: 'cancelado', rotulo: 'Cancelado' },
                { valor: 'concluido', rotulo: 'Concluído' },
              ]}
              data-testid="painel-filtro-status"
            />
            <CampoTexto
              label="Data inicial"
              valor={filtros.dataInicio || ''}
              aoAlterar={(v) => setFiltros({ ...filtros, dataInicio: v })}
              inputMode="none"
              data-testid="painel-filtro-data-inicio"
            />
            <CampoTexto
              label="Data final"
              valor={filtros.dataFim || ''}
              aoAlterar={(v) => setFiltros({ ...filtros, dataFim: v })}
              inputMode="none"
              data-testid="painel-filtro-data-fim"
            />
          </div>

          {carregando ? (
            <div className="painel__lista-carregando">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variante="texto" data-testid={`painel-agenda-skeleton-${i}`} />
              ))}
            </div>
          ) : agendamentos.length > 0 ? (
            <div className="painel__lista" role="list" data-testid="painel-agenda-lista">
              {agendamentos.map((agendamento) => (
                <div key={agendamento.id} className="painel__agendamento-item" data-testid={`painel-agenda-${agendamento.id}`}>
                  <div className="painel__agendamento-info">
                    <strong>{agendamento.nomeCliente}</strong>
                    <span>{agendamento.dia} às {agendamento.horario} - {agendamento.servicos}</span>
                  </div>
                  <div className="painel__agendamento-acoes">
                    <span className={`painel__status-${agendamento.statusPagamento}`}>
                      {agendamento.statusPagamento === 'pago' ? '✓ Pago' : agendamento.statusPagamento === 'aguardando_pix' ? '⏳ Aguardando Pix' : '💰 No local'}
                    </span>
                    <BotaoIcone icone={ICONES.x} variante="fantasma" tamanho="pequeno" aoClicar={() => cancelar(agendamento.id)} ariaLabel="Cancelar" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="painel__vazio">
              <div className="painel__vazio-icone">{ICONES.calendario}</div>
              <h3>Nenhum agendamento</h3>
              <p>{filtros.status ? 'Nenhum agendamento com este status.' : 'Agendamentos aparecerão aqui.'}</p>
            </div>
          )}
        </div>

        {/* Painel Serviços */}
        <div className="painel__painel" role="tabpanel" id="painel-servicos" aria-labelledby="aba-servicos" hidden={abaAtiva !== 'servicos'}>
          <div className="painel__secao-cabecalho">
            <h2>Meus serviços</h2>
            <BotaoPrimario aoClicar={() => handleAbrirModalServico()}>Novo serviço</BotaoPrimario>
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
                  <BotaoIcone icone={ICONES.editar} variante="fantasma" tamanho="pequeno" aoClicar={() => handleAbrirModalServico(servico)} ariaLabel="Editar" />
                  <BotaoIcone icone={ICONES.lixeira} variante="fantasma" tamanho="pequeno" aoClicar={() => { if (window.confirm('Excluir este serviço?')) handleExcluirServico(servico.id); }} ariaLabel="Excluir" />
                </div>
              </div>
            ))}
          </div>

          {servicos.length === 0 && (
            <div className="painel__vazio">
              <div className="painel__vazio-icone">{ICONES.tesoura}</div>
              <h3>Nenhum serviço cadastrado</h3>
              <p>Adicione seus serviços para que clientes possam agendar.</p>
              <BotaoPrimario aoClicar={() => handleAbrirModalServico()}>Criar primeiro serviço</BotaoPrimario>
            </div>
          )}
        </div>

        {/* Painel Fila */}
        <div className="painel__painel" role="tabpanel" id="painel-fila" aria-labelledby="aba-fila" hidden={abaAtiva !== 'fila'}>
          <h2>Fila de hoje</h2>
          <div className="painel__fila-estatisticas">
            <Cartao className="painel__fila-stat">
              <CartaoCorpo>
                <p className="painel__fila-stat-valor">{filaAtual}</p>
                <p className="painel__fila-stat-label">Clientes na fila</p>
              </CartaoCorpo>
            </Cartao>
            <Cartao className="painel__fila-stat">
              <CartaoCorpo>
                <p className="painel__fila-stat-valor">{Math.max(0, filaAtual - agendamentosConfirmados.length)}</p>
                <p className="painel__fila-stat-label">Aguardando</p>
              </CartaoCorpo>
            </Cartao>
            <Cartao className="painel__fila-stat">
              <CartaoCorpo>
                <p className="painel__fila-stat-valor">{agendamentosConfirmados.length}</p>
                <p className="painel__fila-stat-label">Em atendimento</p>
              </CartaoCorpo>
            </Cartao>
          </div>

          <div className="painel__lista" data-testid="painel-fila-lista">
            {agendamentosHoje
              .filter((a) => !['cancelado', 'concluido'].includes(a.status))
              .sort((a, b) => a.horario.localeCompare(b.horario))
              .map((agendamento) => (
                <div key={agendamento.id} className="painel__agendamento-item" data-testid={`painel-fila-${agendamento.id}`}>
                  <div className="painel__agendamento-info">
                    <strong>{agendamento.nomeCliente}</strong>
                    <span>{agendamento.horario} - {agendamento.servicos}</span>
                  </div>
                  <div className="painel__agendamento-acoes">
                    <span className={`painel__status-${agendamento.statusPagamento}`}>
                      {agendamento.statusPagamento === 'pago' ? '✓ Em atendimento' : '⏳ Aguardando'}
                    </span>
                    <BotaoIcone icone={ICONES.x} variante="fantasma" tamanho="pequeno" aoClicar={() => cancelar(agendamento.id)} ariaLabel="Cancelar" />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Painel Galeria (placeholder) */}
        <div className="painel__painel" role="tabpanel" id="painel-galeria" aria-labelledby="aba-galeria" hidden={abaAtiva !== 'galeria'}>
          <div className="painel__secao-cabecalho">
            <h2>Galeria de cortes</h2>
            <BotaoPrimario>Adicionar foto/vídeo</BotaoPrimario>
          </div>
          <div className="painel__vazio">
            <div className="painel__vazio-icone">{ICONES.foto}</div>
            <h3>Galeria vazia</h3>
            <p>Adicione fotos dos seus cortes para atrair mais clientes.</p>
          </div>
        </div>

        {/* Painel Configurações */}
        <div className="painel__painel" role="tabpanel" id="painel-configuracoes" aria-labelledby="aba-configuracoes" hidden={abaAtiva !== 'configuracoes'}>
          <section className="painel__secao">
            <h2>Informações do estabelecimento</h2>
            <CampoTexto label="Nome" valor={usuario.nome || ''} aoAlterar={() => {}} data-testid="painel-config-nome" />
            <CampoTexto label="Telefone" valor={usuario.whatsapp || ''} aoAlterar={() => {}} data-testid="painel-config-telefone" />
            <Textarea label="Descrição" valor="" aoAlterar={() => {}} linhas={3} data-testid="painel-config-descricao" />
            <CampoTexto label="Endereço" valor="" aoAlterar={() => {}} data-testid="painel-config-endereco" />
            <CampoTexto label="Cidade" valor="" aoAlterar={() => {}} data-testid="painel-config-cidade" />
            <BotaoPrimario>Salvar alterações</BotaoPrimario>
          </section>

          <section className="painel__secao">
            <h2>Horário de funcionamento</h2>
            <p className="painel__aviso">Configure os dias e horários de atendimento.</p>
            <BotaoSecundario>Configurar horários</BotaoSecundario>
          </section>

          <section className="painel__secao">
            <h2>Tema visual</h2>
            <div className="painel__tema-opcoes">
              {['#e11d48', '#0ea5e9', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'].map((cor) => (
                <button
                  key={cor}
                  type="button"
                  className={`painel__tema-cor ${usuario.avatar === cor ? 'painel__tema-cor--ativo' : ''}`}
                  style={{ background: cor }}
                  onClick={() => {}}
                  aria-label={`Tema ${cor}`}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Modal Serviço */}
        <ModalFormulario
          aberto={modalServicoAberto}
          aoFechar={() => { setModalServicoAberto(false); setServicoEditando(null); }}
          titulo={servicoEditando?.id ? 'Editar serviço' : 'Novo serviço'}
          aoSalvar={handleSalvarServico}
          tamanho="medio"
          data-testid="modal-servico"
        >
          <CampoTexto
            label="Nome do serviço"
            valor={servicoEditando?.nome || ''}
            aoAlterar={(v) => setServicoEditando((prev) => prev ? { ...prev, nome: v } : null)}
            obrigatorio
            placeholder="Ex: Corte masculino"
            data-testid="modal-servico-nome"
          />
          <div className="painel__servico-linha">
            <CampoNumero
              label="Preço (R$)"
              valor={String(servicoEditando?.preco || 0)}
              aoAlterar={(v) => setServicoEditando((prev) => prev ? { ...prev, preco: Number(v) } : null)}
              min={1}
              max={1000}
              step={1}
              obrigatorio
              data-testid="modal-servico-preco"
            />
            <CampoNumero
              label="Duração (min)"
              valor={String(servicoEditando?.duracaoMinutos || 30)}
              aoAlterar={(v) => setServicoEditando((prev) => prev ? { ...prev, duracaoMinutos: Number(v) } : null)}
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
            aoAlterar={(v) => setServicoEditando((prev) => prev ? { ...prev, tag: v as string } : null)}
            opcoes={[
              { valor: 'Corte', rotulo: 'Corte' },
              { valor: 'Barba', rotulo: 'Barba' },
              { valor: 'Combo', rotulo: 'Combo' },
              { valor: 'Estética', rotulo: 'Estética' },
              { valor: 'Tratamento', rotulo: 'Tratamento' },
              { valor: 'Outro', rotulo: 'Outro' },
            ]}
            data-testid="modal-servico-tag"
          />
          <Textarea
            label="Descrição"
            valor={servicoEditando?.descricao || ''}
            aoAlterar={(v) => setServicoEditando((prev) => prev ? { ...prev, descricao: v } : null)}
            placeholder="Descreva o que está incluso no serviço..."
            linhas={3}
            data-testid="modal-servico-descricao"
          />
        </ModalFormulario>
      </Container>
    </ToastProvider>
  );
};

export default PainelBarbeiro;