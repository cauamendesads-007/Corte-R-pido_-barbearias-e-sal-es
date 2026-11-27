/**
 * Tela PainelAdmin - Dashboard administrativo.
 * Abas: Visão geral, Estabelecimentos, Usuários, Análises, Configurações.
 * Métricas globais, moderação, gestão de planos, logs.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Container,
  Cartao,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  BotaoIcone,
  CampoTexto,
  CampoBusca,
  Select,
  Chip,
  Avatar,
  ToastProvider,
  useGlobalToast,
  Icone,
} from '@/componentes';
import './PainelAdmin.css';

type AbaAdmin = 'visao' | 'estabelecimentos' | 'usuarios' | 'analises' | 'configuracoes';

const PainelAdmin = () => {
  const { usuario } = useAuth();
  const { sucesso } = useGlobalToast();

  const [abaAtiva, setAbaAtiva] = useState<AbaAdmin>('visao');
  const [buscaEstabelecimentos, setBuscaEstabelecimentos] = useState('');
  const [buscaUsuarios, setBuscaUsuarios] = useState('');
  const [filtroStatusEstab, setFiltroStatusEstab] = useState<'todos' | 'ativo' | 'pendente' | 'suspenso'>('todos');
  const [filtroTipoUsuario, setFiltroTipoUsuario] = useState<'todos' | 'cliente' | 'barbeiro' | 'admin'>('todos');

  // Dados mock
  const estabelecimentos = [
    { id: '1', nome: 'Barbearia do João', proprietario: 'João Silva', cidade: 'Belo Horizonte', nicho: 'barbearia', status: 'ativo', plano: 'profissional', agendamentosMes: 124, avaliacao: 4.8, dataCadastro: '2024-01-15' },
    { id: '2', nome: 'Salão Bella', proprietario: 'Maria Santos', cidade: 'Belo Horizonte', nicho: 'feminino', status: 'ativo', plano: 'essencial', agendamentosMes: 89, avaliacao: 4.6, dataCadastro: '2024-02-20' },
    { id: '3', nome: 'Visagismo Arte', proprietario: 'Carlos Lima', cidade: 'Contagem', nicho: 'visagismo', status: 'pendente', plano: 'premium', agendamentosMes: 0, avaliacao: 0, dataCadastro: '2024-12-01' },
    { id: '4', nome: 'Kids Cut', proprietario: 'Ana Paula', cidade: 'Betim', nicho: 'infantil', status: 'suspenso', plano: 'essencial', agendamentosMes: 45, avaliacao: 4.2, dataCadastro: '2024-03-10' },
    { id: '5', nome: 'Barbearia Premium', proprietario: 'Roberto', cidade: 'Belo Horizonte', nicho: 'barbearia', status: 'ativo', plano: 'premium', agendamentosMes: 203, avaliacao: 4.9, dataCadastro: '2023-11-05' },
  ];

  const usuarios = [
    { id: '1', nome: 'João Silva', email: 'joao@email.com', telefone: '(31) 99999-1111', papel: 'barbeiro', estabelecimento: 'Barbearia do João', status: 'ativo', dataCadastro: '2024-01-15' },
    { id: '2', nome: 'Maria Santos', email: 'maria@email.com', telefone: '(31) 99999-2222', papel: 'barbeiro', estabelecimento: 'Salão Bella', status: 'ativo', dataCadastro: '2024-02-20' },
    { id: '3', nome: 'Carlos Cliente', email: 'carlos@email.com', telefone: '(31) 99999-3333', papel: 'cliente', estabelecimento: '-', status: 'ativo', dataCadastro: '2024-03-01' },
    { id: '4', nome: 'Ana Paula', email: 'ana@email.com', telefone: '(31) 99999-4444', papel: 'barbeiro', estabelecimento: 'Kids Cut', status: 'suspenso', dataCadastro: '2024-03-10' },
    { id: '5', nome: 'Roberto Admin', email: 'roberto@admin.com', telefone: '(31) 99999-5555', papel: 'admin', estabelecimento: '-', status: 'ativo', dataCadastro: '2023-10-01' },
  ];

  const planos = [
    { id: 'essencial', nome: 'Essencial', preco: 49, cor: '#64748b', limites: { barbeiros: 1, servicos: 10, fotos: 20, analises: false, api: false } },
    { id: 'profissional', nome: 'Profissional', preco: 99, cor: '#0ea5e9', limites: { barbeiros: 3, servicos: 50, fotos: 100, analises: true, api: false } },
    { id: 'premium', nome: 'Premium', preco: 199, cor: '#f59e0b', limites: { barbeiros: 10, servicos: -1, fotos: -1, analises: true, api: true } },
  ];

  const filtrarEstabelecimentos = estabelecimentos.filter((e) => {
    const matchBusca = e.nome.toLowerCase().includes(buscaEstabelecimentos.toLowerCase()) ||
      e.proprietario.toLowerCase().includes(buscaEstabelecimentos.toLowerCase());
    const matchStatus = filtroStatusEstab === 'todos' || e.status === filtroStatusEstab;
    return matchBusca && matchStatus;
  });

  const filtrarUsuarios = usuarios.filter((u) => {
    const matchBusca = u.nome.toLowerCase().includes(buscaUsuarios.toLowerCase()) ||
      u.email.toLowerCase().includes(buscaUsuarios.toLowerCase());
    const matchTipo = filtroTipoUsuario === 'todos' || u.papel === filtroTipoUsuario;
    return matchBusca && matchTipo;
  });

  const stats = {
    totalEstabelecimentos: estabelecimentos.length,
    ativos: estabelecimentos.filter((e) => e.status === 'ativo').length,
    pendentes: estabelecimentos.filter((e) => e.status === 'pendente').length,
    suspensos: estabelecimentos.filter((e) => e.status === 'suspenso').length,
    totalUsuarios: usuarios.length,
    barbeiros: usuarios.filter((u) => u.papel === 'barbeiro').length,
    clientes: usuarios.filter((u) => u.papel === 'cliente').length,
    agendamentosMes: estabelecimentos.reduce((s, e) => s + e.agendamentosMes, 0),
    receitaEstimada: estabelecimentos.reduce((s, e) => s + (e.plano === 'premium' ? 199 : e.plano === 'profissional' ? 99 : 49), 0),
  };

  const handleAprovarEstabelecimento = () => {
    sucesso('Estabelecimento aprovado!');
  };

  const handleSuspenderEstabelecimento = () => {
    sucesso('Estabelecimento suspenso!');
  };

  const handleAlterarStatusUsuario = () => {
    sucesso('Status do usuário alterado!');
  };

  const abas = [
    { id: 'visao', rotulo: 'Visão geral', icone: <Icone nome="painel" tamanho={18} /> },
    { id: 'estabelecimentos', rotulo: 'Estabelecimentos', icone: <Icone nome="predio" tamanho={18} />, contador: stats.totalEstabelecimentos },
    { id: 'usuarios', rotulo: 'Usuários', icone: <Icone nome="usuarios" tamanho={18} />, contador: stats.totalUsuarios },
    { id: 'analises', rotulo: 'Análises', icone: <Icone nome="grafico" tamanho={18} /> },
    { id: 'configuracoes', rotulo: 'Configurações', icone: <Icone nome="configuracoes" tamanho={18} /> },
  ];

  if (!usuario || usuario.papel !== 'admin') {
    return (
      <Container variante="com-cabecalho">
        <div className="admin__acesso-negado">
          <h1>Acesso restrito</h1>
          <p>Esta área é exclusiva para administradores.</p>
        </div>
      </Container>
    );
  }

  return (
    <ToastProvider>
      <Container variante="com-cabecalho" data-testid="painel-admin-container">
        {/* Header */}
        <header className="admin__cabecalho">
          <div className="admin__info">
            <h1 className="admin__titulo">Painel Admin</h1>
            <p className="admin__subtitulo">Corte Rápido - Administração</p>
          </div>
          <Avatar
            src={usuario.avatar}
            nome={usuario.nome}
            corFundo="#dc2626"
            tamanho="pequeno"
          />
        </header>

        {/* Métricas */}
        <section className="admin__metricas" role="region" aria-labelledby="metricas-titulo" data-testid="admin-metricas">
          <h2 id="metricas-titulo" className="sr-only">Métricas globais</h2>
          <ul className="admin__metricas-lista" role="list">
            <li>
              <Cartao>
                <CartaoCorpo>
                  <div className="admin__metrica-icone" style={{ background: 'var(--cor-primaria-transparente)', color: 'var(--cor-primaria)' }} aria-hidden="true">
                    <Icone nome="predio" tamanho={20} />
                  </div>
                  <div>
                    <p className="admin__metrica-valor">{stats.totalEstabelecimentos}</p>
                    <p className="admin__metrica-label">Estabelecimentos</p>
                  </div>
                </CartaoCorpo>
              </Cartao>
            </li>
            <li>
              <Cartao>
                <CartaoCorpo>
                  <div className="admin__metrica-icone" style={{ background: 'var(--cor-sucesso-transparente)', color: 'var(--cor-sucesso)' }} aria-hidden="true">
                    <Icone nome="verificarCirculo" tamanho={20} />
                  </div>
                  <div>
                    <p className="admin__metrica-valor">{stats.ativos}</p>
                    <p className="admin__metrica-label">Ativos</p>
                  </div>
                </CartaoCorpo>
              </Cartao>
            </li>
            <li>
              <Cartao>
                <CartaoCorpo>
                  <div className="admin__metrica-icone" style={{ background: 'var(--cor-aviso-transparente)', color: 'var(--cor-aviso)' }} aria-hidden="true">
                    <Icone nome="relogio" tamanho={20} />
                  </div>
                  <div>
                    <p className="admin__metrica-valor">{stats.pendentes}</p>
                    <p className="admin__metrica-label">Pendentes</p>
                  </div>
                </CartaoCorpo>
              </Cartao>
            </li>
            <li>
              <Cartao>
                <CartaoCorpo>
                  <div className="admin__metrica-icone" style={{ background: 'var(--cor-perigo-transparente)', color: 'var(--cor-perigo)' }} aria-hidden="true">
                    <Icone nome="alerta" tamanho={20} />
                  </div>
                  <div>
                    <p className="admin__metrica-valor">{stats.suspensos}</p>
                    <p className="admin__metrica-label">Suspensos</p>
                  </div>
                </CartaoCorpo>
              </Cartao>
            </li>
            <li>
              <Cartao>
                <CartaoCorpo>
                  <div className="admin__metrica-icone" style={{ background: 'var(--cor-primaria-transparente)', color: 'var(--cor-primaria)' }} aria-hidden="true">
                    <Icone nome="usuarios" tamanho={20} />
                  </div>
                  <div>
                    <p className="admin__metrica-valor">{stats.totalUsuarios}</p>
                    <p className="admin__metrica-label">Usuários</p>
                  </div>
                </CartaoCorpo>
              </Cartao>
            </li>
            <li>
              <Cartao>
                <CartaoCorpo>
                  <div className="admin__metrica-icone" style={{ background: 'var(--cor-sucesso-transparente)', color: 'var(--cor-sucesso)' }} aria-hidden="true">
                    <Icone nome="moeda" tamanho={20} />
                  </div>
                  <div>
                    <p className="admin__metrica-valor">{stats.receitaEstimada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <p className="admin__metrica-label">Receita estimada/mês</p>
                  </div>
                </CartaoCorpo>
              </Cartao>
            </li>
          </ul>
        </section>

        {/* Abas */}
        <nav className="admin__abas" role="tablist" aria-label="Seções do admin">
          {abas.map((aba) => (
            <button
              key={aba.id}
              role="tab"
              aria-selected={abaAtiva === aba.id}
              aria-controls={`painel-${aba.id}`}
              id={`aba-${aba.id}`}
              className={`admin__aba ${abaAtiva === aba.id ? 'admin__aba--ativa' : ''}`}
              onClick={() => setAbaAtiva(aba.id as AbaAdmin)}
              data-testid={`admin-aba-${aba.id}`}
            >
              <span aria-hidden="true">{aba.icone}</span>
              {aba.rotulo}
              {aba.contador !== undefined && (
                <span className="admin__aba-badge">{aba.contador}</span>
              )}
            </button>
          ))}
        </nav>

        <main className="admin__main" role="main">
          {/* Painel Estabelecimentos */}
          <section
            className="admin__painel"
            role="tabpanel"
            id="painel-estabelecimentos"
            aria-labelledby="aba-estabelecimentos"
            hidden={abaAtiva !== 'estabelecimentos'}
          >
            <form className="admin__filtros" role="search" aria-label="Filtrar estabelecimentos">
              <CampoBusca
                label="Buscar estabelecimentos"
                valor={buscaEstabelecimentos}
                aoAlterar={setBuscaEstabelecimentos}
                placeholder="Buscar por nome ou proprietário..."
                className="admin__busca"
                data-testid="admin-busca-estabelecimentos"
              />
              <Select
                label="Status"
                valor={filtroStatusEstab}
                aoAlterar={(v) => setFiltroStatusEstab(v as 'todos' | 'ativo' | 'pendente' | 'suspenso')}
                opcoes={[
                  { valor: 'todos', rotulo: 'Todos' },
                  { valor: 'ativo', rotulo: 'Ativos' },
                  { valor: 'pendente', rotulo: 'Pendentes' },
                  { valor: 'suspenso', rotulo: 'Suspensos' },
                ]}
                data-testid="admin-filtro-status-estab"
              />
            </form>

            <div className="admin__tabela-wrapper" data-testid="admin-estabelecimentos-tabela">
              <table className="admin__tabela" role="table">
                <thead>
                  <tr>
                    <th scope="col">Estabelecimento</th>
                    <th scope="col">Proprietário</th>
                    <th scope="col">Cidade</th>
                    <th scope="col">Nicho</th>
                    <th scope="col">Status</th>
                    <th scope="col">Plano</th>
                    <th scope="col">Agend./mês</th>
                    <th scope="col">Avaliação</th>
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrarEstabelecimentos.map((estab) => (
                    <tr key={estab.id}>
                      <td>
                        <div className="admin__tabela-nome">
                          <Avatar
                            nome={estab.nome}
                            tamanho="pequeno"
                            corFundo={estab.nicho === 'feminino' ? '#ec4899' : estab.nicho === 'visagismo' ? '#a855f7' : estab.nicho === 'infantil' ? '#22c55e' : '#e11d48'}
                          />
                          <strong>{estab.nome}</strong>
                        </div>
                      </td>
                      <td>{estab.proprietario}</td>
                      <td>{estab.cidade}</td>
                      <td>
                        <Chip variante="nicho">{estab.nicho === 'feminino' ? 'Salão' : estab.nicho === 'visagismo' ? 'Visagismo' : estab.nicho === 'infantil' ? 'Infantil' : 'Barbearia'}</Chip>
                      </td>
                      <td>
                        <Chip
                          variante="status"
                          selecionado={estab.status === 'ativo'}
                          desabilitado
                        >
                          {estab.status === 'ativo' ? 'Ativo' : estab.status === 'pendente' ? 'Pendente' : 'Suspenso'}
                        </Chip>
                      </td>
                      <td>
                        <Chip variante="padrao" selecionado={false} desabilitado>
                          {estab.plano === 'premium' ? 'Premium' : estab.plano === 'profissional' ? 'Profissional' : 'Essencial'}
                        </Chip>
                      </td>
                      <td>{estab.agendamentosMes}</td>
                      <td>{estab.avaliacao ? <><Icone nome="estrela" tamanho={14} aria-hidden="true" /> {estab.avaliacao}</> : '-'}</td>
                      <td>
                        <div className="admin__acoes-linha">
                          {estab.status === 'pendente' && (
                            <BotaoIcone icone={<Icone nome="verificar" tamanho={16} />} variante="primario" tamanho="pequeno" aoClicar={handleAprovarEstabelecimento} ariaLabel="Aprovar" />
                          )}
                          {estab.status === 'ativo' && (
                            <BotaoIcone icone={<Icone nome="alerta" tamanho={16} />} variante="secundario" tamanho="pequeno" aoClicar={handleSuspenderEstabelecimento} ariaLabel="Suspender" />
                          )}
                          <BotaoIcone icone={<Icone nome="editar" tamanho={16} />} variante="fantasma" tamanho="pequeno" aoClicar={() => {}} ariaLabel="Editar" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Painel Usuários */}
          <section
            className="admin__painel"
            role="tabpanel"
            id="painel-usuarios"
            aria-labelledby="aba-usuarios"
            hidden={abaAtiva !== 'usuarios'}
          >
            <form className="admin__filtros" role="search" aria-label="Filtrar usuários">
              <CampoBusca
                label="Buscar usuários"
                valor={buscaUsuarios}
                aoAlterar={setBuscaUsuarios}
                placeholder="Buscar por nome ou e-mail..."
                className="admin__busca"
                data-testid="admin-busca-usuarios"
              />
              <Select
                label="Tipo de usuário"
                valor={filtroTipoUsuario}
                aoAlterar={(v) => setFiltroTipoUsuario(v as 'todos' | 'cliente' | 'barbeiro' | 'admin')}
                opcoes={[
                  { valor: 'todos', rotulo: 'Todos' },
                  { valor: 'cliente', rotulo: 'Clientes' },
                  { valor: 'barbeiro', rotulo: 'Barbeiros' },
                  { valor: 'admin', rotulo: 'Admins' },
                ]}
                data-testid="admin-filtro-tipo-usuario"
              />
            </form>

            <div className="admin__tabela-wrapper" data-testid="admin-usuarios-tabela">
              <table className="admin__tabela" role="table">
                <thead>
                  <tr>
                    <th scope="col">Usuário</th>
                    <th scope="col">E-mail</th>
                    <th scope="col">Telefone</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Estabelecimento</th>
                    <th scope="col">Status</th>
                    <th scope="col">Cadastro</th>
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrarUsuarios.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="admin__tabela-nome">
                          <Avatar
                            nome={user.nome}
                            tamanho="pequeno"
                            corFundo={user.papel === 'barbeiro' ? '#e11d48' : user.papel === 'admin' ? '#dc2626' : '#0ea5e9'}
                          />
                          <strong>{user.nome}</strong>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.telefone}</td>
                      <td>
                        <Chip variante="nicho">
                          {user.papel === 'barbeiro' ? 'Barbeiro' : user.papel === 'admin' ? 'Admin' : 'Cliente'}
                        </Chip>
                      </td>
                      <td>{user.estabelecimento}</td>
                      <td>
                        <Chip
                          variante="status"
                          selecionado={user.status === 'ativo'}
                          desabilitado
                        >
                          {user.status === 'ativo' ? 'Ativo' : 'Suspenso'}
                        </Chip>
                      </td>
                      <td>{new Date(user.dataCadastro).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="admin__acoes-linha">
                          {user.status === 'ativo' && (
                            <BotaoIcone icone={<Icone nome="alerta" tamanho={16} />} variante="secundario" tamanho="pequeno" aoClicar={handleAlterarStatusUsuario} ariaLabel="Suspender" />
                          )}
                          {user.status === 'suspenso' && (
                            <BotaoIcone icone={<Icone nome="verificar" tamanho={16} />} variante="primario" tamanho="pequeno" aoClicar={handleAlterarStatusUsuario} ariaLabel="Ativar" />
                          )}
                          <BotaoIcone icone={<Icone nome="editar" tamanho={16} />} variante="fantasma" tamanho="pequeno" aoClicar={() => {}} ariaLabel="Editar" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Painel Análises (placeholder) */}
          <section
            className="admin__painel"
            role="tabpanel"
            id="painel-analises"
            aria-labelledby="aba-analises"
            hidden={abaAtiva !== 'analises'}
          >
            <h2>Análises e Relatórios</h2>
            <ul className="admin__metricas-lista" role="list">
              <li>
                <Cartao>
                  <CartaoCorpo>
                    <p className="admin__metrica-valor">{stats.agendamentosMes.toLocaleString('pt-BR')}</p>
                    <p className="admin__metrica-label">Agendamentos este mês</p>
                  </CartaoCorpo>
                </Cartao>
              </li>
              <li>
                <Cartao>
                  <CartaoCorpo>
                    <p className="admin__metrica-valor">4.7</p>
                    <p className="admin__metrica-label">Avaliação média global</p>
                  </CartaoCorpo>
                </Cartao>
              </li>
              <li>
                <Cartao>
                  <CartaoCorpo>
                    <p className="admin__metrica-valor">89%</p>
                    <p className="admin__metrica-label">Taxa de conversão</p>
                  </CartaoCorpo>
                </Cartao>
              </li>
              <li>
                <Cartao>
                  <CartaoCorpo>
                    <p className="admin__metrica-valor">12 min</p>
                    <p className="admin__metrica-label">Tempo médio resposta</p>
                  </CartaoCorpo>
                </Cartao>
              </li>
            </ul>
            <section className="admin__vazio" aria-labelledby="analises-vazio-titulo">
              <p id="analises-vazio-titulo">Gráficos e relatórios detalhados serão implementados aqui.</p>
            </section>
          </section>

          {/* Painel Configurações */}
          <section
            className="admin__painel"
            role="tabpanel"
            id="painel-configuracoes"
            aria-labelledby="aba-configuracoes"
            hidden={abaAtiva !== 'configuracoes'}
          >
            <section className="admin__secao" aria-labelledby="planos-titulo">
              <h2 id="planos-titulo">Planos de assinatura</h2>
              <ul className="admin__planos-grid" role="list">
                {planos.map((plano) => (
                  <li key={plano.id}>
                    <Cartao className="admin__plano-card" variante="padrao">
                      <CartaoCorpo>
                        <header className="admin__plano-header" style={{ borderColor: plano.cor }}>
                          <h3>{plano.nome}</h3>
                          <p className="admin__plano-preco">R$ {plano.preco}/mês</p>
                        </header>
                        <ul className="admin__plano-limites">
                          <li>Barbeiros: {plano.limites.barbeiros === -1 ? 'Ilimitado' : plano.limites.barbeiros}</li>
                          <li>Serviços: {plano.limites.servicos === -1 ? 'Ilimitado' : plano.limites.servicos}</li>
                          <li>Fotos: {plano.limites.fotos === -1 ? 'Ilimitado' : plano.limites.fotos}</li>
                          <li>Análises: {plano.limites.analises ? 'Sim' : 'Não'}</li>
                          <li>API: {plano.limites.api ? 'Sim' : 'Não'}</li>
                        </ul>
                        <BotaoSecundario className="admin__plano-btn" style={{ borderColor: plano.cor, color: plano.cor }}>Editar</BotaoSecundario>
                      </CartaoCorpo>
                    </Cartao>
                  </li>
                ))}
              </ul>
            </section>

            <section className="admin__secao" aria-labelledby="config-titulo">
              <h2 id="config-titulo">Configurações gerais</h2>
              <form className="admin__config-form">
                <CampoTexto label="Nome da plataforma" valor="Corte Rápido" aoAlterar={() => {}} data-testid="admin-config-nome" />
                <CampoTexto label="E-mail de suporte" valor="suporte@corterapido.com" aoAlterar={() => {}} data-testid="admin-config-email" />
                <CampoTexto label="Taxa da plataforma (%)" valor="10" aoAlterar={() => {}} data-testid="admin-config-taxa" />
                <BotaoPrimario tipo="submit">Salvar configurações</BotaoPrimario>
              </form>
            </section>
          </section>
        </main>
      </Container>
    </ToastProvider>
  );
};

export default PainelAdmin;