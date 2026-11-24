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
  Icone,
} from '@/componentes';
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
    { id: 'visao', rotulo: 'Visão geral', icone: <Icone nome="painel" tamanho={20} /> },
    { id: 'agenda', rotulo: 'Agenda', icone: <Icone nome="calendario" tamanho={20} />, contador: agendamentosHoje.length },
    { id: 'servicos', rotulo: 'Serviços', icone: <Icone nome="tesoura" tamanho={20} />, contador: servicos.length },
    { id: 'fila', rotulo: 'Fila', icone: <Icone nome="fila" tamanho={20} />, contador: filaAtual },
    { id: 'galeria', rotulo: 'Galeria', icone: <Icone nome="foto" tamanho={20} /> },
    { id: 'configuracoes', rotulo: 'Configurações', icone: <Icone nome="configuracoes" tamanho={20} /> },
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
              icone={<Icone nome="sino" tamanho={20} />}
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

        <main className="painel__main" role="main">
          {/* Métricas (Visão geral) */}
          {abaAtiva === 'visao' && (
            <section className="painel__metricas" aria-labelledby="metricas-titulo" data-testid="painel-metricas">
              <h2 id="metricas-titulo" className="sr-only">Métricas do dia</h2>
              <Cartao className="painel__metrica">
                <CartaoCorpo>
                  <div className="painel__metrica-icone" style={{ background: 'var(--cor-primaria-transparente)', color: 'var(--cor-primaria)' }}>
                    <Icone nome="calendario" tamanho={20} />
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
                    <Icone nome="verificarCirculo" tamanho={20} />
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
                    <Icone nome="relogio" tamanho={20} />
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
                    <Icone nome="usuarios" tamanho={20} />
                  </div>
                  <div>
                    <p className="painel__metrica-valor">{filaAtual}</p>
                    <p className="painel__metrica-label">Na fila agora</p>
                  </div>
                </CartaoCorpo>
              </Cartao>
            </section>
          )}

          {/* Próximos agendamentos (Visão geral) */}
          {abaAtiva === 'visao' && agendamentosHoje.length > 0 && (
            <section className="painel__secao" data-testid="painel-proximos">
              <div className="painel__secao-cabecalho">
                <h2>Próximos agendamentos</h2>
                <BotaoSecundario tamanho="pequeno" aoClicar={() => setAbaAtiva('agenda')}>Ver todos</BotaoSecundario>
              </div>
              <ul className="painel__lista" role="list">
                {agendamentosHoje.slice(0, 5).map((agendamento) => (
                  <li key={agendamento.id} className="painel__agendamento-item" data-testid={`painel-agendamento-${agendamento.id}`}>
                    <div className="painel__agendamento-info">
                      <strong>{agendamento.nomeCliente}</strong>
                      <span>{agendamento.horario} - {agendamento.servicos}</span>
                    </div>
                    <span className={`painel__status-${agendamento.statusPagamento}`}>
                      {agendamento.statusPagamento === 'pago' ? '✓ Pago' : agendamento.statusPagamento === 'aguardando_pix' ? '⏳ Aguardando Pix' : '💰 No local'}
                    </span>
                  </li>
                ))}
              </ul>
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
          <section className="painel__painel" role="tabpanel" id="painel-agenda" aria-labelledby="aba-agenda" hidden={abaAtiva !== 'agenda'}>
            <form className="painel__filtros" role="search" aria-label="Filtrar agendamentos">
              <div className="painel__filtros-grupo">
                <Select
                  label="Status"
                  valor={(filtros.status as string) || ''}
                  aoAlterar={(v: string | string[]) => setFiltros({ ...filtros, status: (Array.isArray(v) ? v[0] : v) as StatusPagamento })}
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
            </form>

            {carregando ? (
              <div className="painel__lista-carregando" role="status" aria-label="Carregando agendamentos">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variante="texto" data-testid={`painel-agenda-skeleton-${i}`} />
                ))}
              </div>
            ) : agendamentos.length > 0 ? (
              <ul className="painel__lista" role="list" data-testid="painel-agenda-lista">
                {agendamentos.map((agendamento) => (
                  <li key={agendamento.id} className="painel__agendamento-item" data-testid={`painel-agenda-${agendamento.id}`}>
                    <div className="painel__agendamento-info">
                      <strong>{agendamento.nomeCliente}</strong>
                      <span>{agendamento.dia} às {agendamento.horario} - {agendamento.servicos}</span>
                    </div>
                    <div className="painel__agendamento-acoes">
                      <span className={`painel__status-${agendamento.statusPagamento}`}>
                        {agendamento.statusPagamento === 'pago' ? '✓ Pago' : agendamento.statusPagamento === 'aguardando_pix' ? '⏳ Aguardando Pix' : '💰 No local'}
                      </span>
                      <BotaoIcone icone={<Icone nome="x" tamanho={16} />} variante="fantasma" tamanho="pequeno" aoClicar={() => cancelar(agendamento.id)} ariaLabel="Cancelar" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <section className="painel__vazio" aria-labelledby="vazio-titulo">
                <div className="painel__vazio-icone" aria-hidden="true"><Icone nome="calendario" tamanho={48} /></div>
                <h3 id="vazio-titulo">Nenhum agendamento</h3>
                <p>{filtros.status ? 'Nenhum agendamento com este status.' : 'Agendamentos aparecerão aqui.'}</p>
              </section>
            )}
          </section>

          {/* Painel Serviços */}
          <section className="painel__painel" role="tabpanel" id="painel-servicos" aria-labelledby="aba-servicos" hidden={abaAtiva !== 'servicos'}>
            <header className="painel__secao-cabecalho">
              <h2>Meus serviços</h2>
              <BotaoPrimario aoClicar={() => handleAbrirModalServico()}>Novo serviço</BotaoPrimario>
            </header>

            <ul className="painel__servicos-lista" role="list" data-testid="painel-servicos-lista">
              {servicos.map((servico) => (
                <li key={servico.id} className="painel__servico-item" data-testid={`painel-servico-${servico.id}`}>
                  <div className="painel__servico-info">
                    <strong>{servico.nome}</strong>
                    <span className="painel__servico-tag">{servico.tag}</span>
                  </div>
                  <div className="painel__servico-detalhes">
                    <span>{servico.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <span>{servico.duracaoMinutos} min</span>
                  </div>
                  <div className="painel__servico-acoes">
                    <BotaoIcone icone={<Icone nome="editar" tamanho={16} />} variante="fantasma" tamanho="pequeno" aoClicar={() => handleAbrirModalServico(servico)} ariaLabel="Editar" />
                    <BotaoIcone icone={<Icone nome="lixeira" tamanho={16} />} variante="fantasma" tamanho="pequeno" aoClicar={() => { if (window.confirm('Excluir este serviço?')) handleExcluirServico(servico.id); }} ariaLabel="Excluir" />
                  </div>
                </li>
              ))}
            </ul>

            {servicos.length === 0 && (
              <section className="painel__vazio" aria-labelledby="vazio-servicos-titulo">
                <div className="painel__vazio-icone" aria-hidden="true"><Icone nome="tesoura" tamanho={48} /></div>
                <h3 id="vazio-servicos-titulo">Nenhum serviço cadastrado</h3>
                <p>Adicione seus serviços para que clientes possam agendar.</p>
                <BotaoPrimario aoClicar={() => handleAbrirModalServico()}>Criar primeiro serviço</BotaoPrimario>
              </section>
            )}
          </section>

          {/* Painel Fila */}
          <section className="painel__painel" role="tabpanel" id="painel-fila" aria-labelledby="aba-fila" hidden={abaAtiva !== 'fila'}>
            <h2>Fila de hoje</h2>
            <div className="painel__fila-estatisticas" role="region" aria-label="Estatísticas da fila">
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

            <ul className="painel__lista" data-testid="painel-fila-lista" role="list">
              {agendamentosHoje
                .filter((a) => !['cancelado', 'concluido'].includes(a.status))
                .sort((a, b) => a.horario.localeCompare(b.horario))
                .map((agendamento) => (
                  <li key={agendamento.id} className="painel__agendamento-item" data-testid={`painel-fila-${agendamento.id}`}>
                    <div className="painel__agendamento-info">
                      <strong>{agendamento.nomeCliente}</strong>
                      <span>{agendamento.horario} - {agendamento.servicos}</span>
                    </div>
                    <div className="painel__agendamento-acoes">
                      <span className={`painel__status-${agendamento.statusPagamento}`}>
                        {agendamento.statusPagamento === 'pago' ? '✓ Em atendimento' : '⏳ Aguardando'}
                      </span>
                      <BotaoIcone icone={<Icone nome="x" tamanho={16} />} variante="fantasma" tamanho="pequeno" aoClicar={() => cancelar(agendamento.id)} ariaLabel="Cancelar" />
                    </div>
                  </li>
                ))}
            </ul>
          </section>

          {/* Painel Galeria (placeholder) */}
          <section className="painel__painel" role="tabpanel" id="painel-galeria" aria-labelledby="aba-galeria" hidden={abaAtiva !== 'galeria'}>
            <header className="painel__secao-cabecalho">
              <h2>Galeria de cortes</h2>
              <BotaoPrimario>Adicionar foto/vídeo</BotaoPrimario>
            </header>
            <section className="painel__vazio" aria-labelledby="vazio-galeria-titulo">
              <div className="painel__vazio-icone" aria-hidden="true"><Icone nome="foto" tamanho={48} /></div>
              <h3 id="vazio-galeria-titulo">Galeria vazia</h3>
              <p>Adicione fotos dos seus cortes para atrair mais clientes.</p>
            </section>
          </section>

          {/* Painel Configurações */}
          <section className="painel__painel" role="tabpanel" id="painel-configuracoes" aria-labelledby="aba-configuracoes" hidden={abaAtiva !== 'configuracoes'}>
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
              <div className="painel__tema-opcoes" role="radiogroup" aria-label="Selecionar tema visual">
                {['#e11d48', '#0ea5e9', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'].map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    role="radio"
                    aria-checked={usuario.avatar === cor}
                    className={`painel__tema-cor ${usuario.avatar === cor ? 'painel__tema-cor--ativo' : ''}`}
                    style={{ background: cor }}
                    onClick={() => {}}
                    aria-label={`Tema ${cor}`}
                  />
                ))}
              </div>
            </section>
          </section>
        </main>

        {/* Modal Serviço */}
        <ModalFormulario
          aberto={modalServicoAberto}
          aoFechar={() => { setModalServicoAberto(false); setServicoEditando(null); }}
          titulo={servicoEditando?.id ? 'Editar serviço' : 'Novo serviço'}
          aoSalvar={handleSalvarServico}
          tamanho="medio"
          data-testid="modal-servico"
        >
          <form onSubmit={(e) => { e.preventDefault(); handleSalvarServico(); }}>
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
          </form>
        </ModalFormulario>
      </Container>
    </ToastProvider>
  );
};

export default PainelBarbeiro;