/**
 * Tela Perfil - Perfil do usuário (cliente, barbeiro, admin).
 * Abas: Visão geral, Agendamentos, Inspirações, Configurações.
 * Edição inline, avatar upload, tema do estabelecimento (barbeiro).
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import { useFeed } from '@/hooks/useFeed';
import {
  Container,
  BotaoPrimario,
  BotaoSecundario,
  BotaoPerigo,
  CampoTexto,
  CampoSenha,
  CampoWhatsapp,
  Avatar,
  ToastProvider,
  useGlobalToast,
  Skeleton,
  Icone,
} from '@/componentes';
import './Perfil.css';

type AbaPerfil = 'visao' | 'agendamentos' | 'inspiracoes' | 'configuracoes';

const Perfil = () => {
  const { usuario, atualizarPerfil, sair } = useAuth();
  const { agendamentos, proximos, passados, carregando: carregandoAgendamentos, cancelar } = useAgendamentos();
  const { publicacoes: inspiracaoSalvas, carregando: carregandoInspiracoes } = useFeed('inspiracoes');
  const { sucesso, erro: toastErro } = useGlobalToast();

  const [abaAtiva, setAbaAtiva] = useState<AbaPerfil>('visao');
  const [editando, setEditando] = useState(false);
  const [dadosEdicao, setDadosEdicao] = useState({
    nome: '',
    email: '',
    telefone: '',
    bio: '',
  });
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (usuario) {
      setDadosEdicao({
        nome: usuario.nome || '',
        email: usuario.email || '',
        telefone: usuario.whatsapp || '',
        bio: usuario.bio || '',
      });
    }
  }, [usuario]);

  const handleSalvarPerfil = async () => {
    setSalvando(true);
    const resultado = await atualizarPerfil(dadosEdicao);
    if (resultado.sucesso) {
      sucesso('Perfil atualizado!');
      setEditando(false);
    } else {
      toastErro(resultado.erro || 'Erro ao atualizar perfil');
    }
    setSalvando(false);
  };

  const handleCancelarEdicao = () => {
    if (usuario) {
      setDadosEdicao({
        nome: usuario.nome || '',
        email: usuario.email || '',
        telefone: usuario.whatsapp || '',
        bio: usuario.bio || '',
      });
    }
    setEditando(false);
  };

  const handleAlterarSenha = async () => {
    if (novaSenha !== confirmarSenha) {
      toastErro('As senhas não coincidem');
      return;
    }
    if (novaSenha.length < 6) {
      toastErro('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSalvando(true);
    const resultado = await atualizarPerfil({ senha: novaSenha });
    if (resultado.sucesso) {
      sucesso('Senha alterada!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } else {
      toastErro(resultado.erro || 'Erro ao alterar senha');
    }
    setSalvando(false);
  };

  const handleSair = () => {
    sair();
  };

  const handleExcluirConta = async () => {
    setSalvando(true);
    // Em um app real, chamaria api.usuarios.excluir()
    // Por enquanto simula
    await new Promise((r) => setTimeout(r, 1000));
    sucesso('Conta excluída (simulado)');
    sair();
    setSalvando(false);
    setModalExcluirAberto(false);
  };

  const abas = [
    { id: 'visao', rotulo: 'Visão geral', icone: <Icone nome="usuario" tamanho={18} />, contador: undefined },
    { id: 'agendamentos', rotulo: 'Agendamentos', icone: <Icone nome="calendario" tamanho={18} />, contador: agendamentos.length },
    { id: 'inspiracoes', rotulo: 'Inspirações', icone: <Icone nome="coracao" tamanho={18} />, contador: inspiracaoSalvas.length },
    { id: 'configuracoes', rotulo: 'Configurações', icone: <Icone nome="configuracoes" tamanho={18} />, contador: undefined },
  ];

  if (!usuario) {
    return (
      <Container variante="com-cabecalho">
        <div className="perfil__nao-autenticado">
          <h1>Faça login para ver seu perfil</h1>
          <BotaoPrimario aoClicar={() => window.location.href = '/login'}>Entrar</BotaoPrimario>
        </div>
      </Container>
    );
  }

  return (
    <ToastProvider>
      <Container variante="com-cabecalho" data-testid="perfil-container">
        {/* Header do perfil */}
        <header className="perfil__cabecalho">
          <div className="perfil__avatar-wrapper">
            <Avatar
              src={usuario.avatar}
              nome={usuario.nome}
              corFundo="#64748b"
              tamanho="xl"
              className="perfil__avatar"
              data-testid="perfil-avatar"
            />
            {editando && (
              <label className="perfil__avatar-editar">
                <Icone nome="camera" tamanho={20} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0];
                    if (arquivo) {
                      const src = URL.createObjectURL(arquivo);
                      setDadosEdicao((prev) => ({ ...prev, avatar: src }));
                    }
                  }}
                  hidden
                />
              </label>
            )}
          </div>
          <div className="perfil__info">
            <h1 className="perfil__nome">{editando ? (
              <CampoTexto
                label="Nome"
                valor={dadosEdicao.nome}
                aoAlterar={(v) => setDadosEdicao((prev) => ({ ...prev, nome: v }))}
                className="perfil__nome-input"
                autoFocus
                data-testid="perfil-nome-input"
              />
            ) : usuario.nome}</h1>
            <p className="perfil__tipo">
              {usuario.papel === 'barbeiro' ? (
                <>
                  <Icone nome="tesoura" tamanho={16} aria-hidden="true" /> Barbeiro
                </>
              ) : usuario.papel === 'admin' ? (
                <>
                  <Icone nome="configuracoes" tamanho={16} aria-hidden="true" /> Admin
                </>
              ) : (
                <>
                  <Icone nome="usuario" tamanho={16} aria-hidden="true" /> Cliente
                </>
              )}
            </p>
            <p className="perfil__email">{usuario.email}</p>
          </div>
          <div className="perfil__acoes">
            {editando ? (
              <>
                <BotaoSecundario aoClicar={handleCancelarEdicao}>Cancelar</BotaoSecundario>
                <BotaoPrimario aoClicar={handleSalvarPerfil} carregando={salvando}>Salvar</BotaoPrimario>
              </>
            ) : (
              <BotaoSecundario aoClicar={() => setEditando(true)}>Editar perfil</BotaoSecundario>
            )}
          </div>
        </header>

        {/* Abas */}
        <nav className="perfil__abas" role="tablist" aria-label="Seções do perfil">
          {abas.map((aba) => (
            <button
              key={aba.id}
              role="tab"
              id={`aba-${aba.id}`}
              aria-selected={abaAtiva === aba.id}
              aria-controls={`painel-${aba.id}`}
              className={`perfil__aba ${abaAtiva === aba.id ? 'perfil__aba--ativa' : ''}`}
              onClick={() => setAbaAtiva(aba.id as AbaPerfil)}
              data-testid={`perfil-aba-${aba.id}`}
            >
              <span aria-hidden="true">{aba.icone}</span>
              {aba.rotulo}
              {aba.contador !== undefined && aba.contador > 0 && (
                <span className="perfil__aba-badge">{aba.contador}</span>
              )}
            </button>
          ))}
        </nav>

        <main className="perfil__main" role="main">
          {/* Painel Visão Geral */}
          <section
            className="perfil__painel"
            role="tabpanel"
            id="painel-visao"
            aria-labelledby="aba-visao"
            hidden={abaAtiva !== 'visao'}
          >
            <section className="perfil__secao" data-testid="perfil-visao" aria-labelledby="sobre-titulo">
              <h2 id="sobre-titulo">Sobre mim</h2>
              {editando ? (
                <div>
                  <label className="perfil__campo-label">Bio</label>
                  <textarea
                    placeholder="Conte um pouco sobre você..."
                    value={dadosEdicao.bio}
                    onChange={(e) => setDadosEdicao((prev) => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    maxLength={300}
                    className="perfil__textarea"
                    data-testid="perfil-bio"
                  />
                  <span className="perfil__contador">{dadosEdicao.bio.length}/300</span>
                </div>
              ) : (
                <p className={usuario.bio ? '' : 'perfil__bio-vazia'}>
                  {usuario.bio || 'Nenhuma bio adicionada ainda.'}
                </p>
              )}
            </section>

            <section className="perfil__secao" data-testid="perfil-contato" aria-labelledby="contato-titulo">
              <h2 id="contato-titulo">Contato</h2>
              {editando ? (
                <>
                  <CampoTexto
                    label="Nome completo"
                    valor={dadosEdicao.nome}
                    aoAlterar={(v) => setDadosEdicao((prev) => ({ ...prev, nome: v }))}
                    obrigatorio
                    data-testid="perfil-nome"
                  />
                  <CampoTexto
                    label="E-mail"
                    tipo="email"
                    valor={dadosEdicao.email}
                    aoAlterar={(v) => setDadosEdicao((prev) => ({ ...prev, email: v }))}
                    obrigatorio
                    data-testid="perfil-email"
                  />
                  <CampoWhatsapp
                    label="WhatsApp"
                    valor={dadosEdicao.telefone}
                    aoAlterar={(v) => setDadosEdicao((prev) => ({ ...prev, telefone: v }))}
                    data-testid="perfil-telefone"
                  />
                </>
              ) : (
                <dl className="perfil__contato-lista">
                  <div>
                    <dt>Nome</dt>
                    <dd>{usuario.nome}</dd>
                  </div>
                  <div>
                    <dt>E-mail</dt>
                    <dd>{usuario.email}</dd>
                  </div>
                  <div>
                    <dt>WhatsApp</dt>
                    <dd>{usuario.whatsapp || 'Não informado'}</dd>
                  </div>
                </dl>
              )}
            </section>

            {usuario.papel === 'barbeiro' && (
              <section className="perfil__secao" data-testid="perfil-barbeiro" aria-labelledby="estabelecimento-titulo">
                <h2 id="estabelecimento-titulo">Estabelecimento</h2>
                <p>Gerencie seu estabelecimento no <a href="/painel" rel="noopener noreferrer">Painel do Barbeiro</a>.</p>
              </section>
            )}
          </section>

          {/* Painel Agendamentos */}
          <section
            className="perfil__painel"
            role="tabpanel"
            id="painel-agendamentos"
            aria-labelledby="aba-agendamentos"
            hidden={abaAtiva !== 'agendamentos'}
          >
            {carregandoAgendamentos ? (
              <div className="perfil__lista-carregando" role="status" aria-label="Carregando agendamentos">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variante="texto" data-testid={`perfil-agendamento-skeleton-${i}`} />
                ))}
              </div>
            ) : proximos.length > 0 ? (
              <>
                <h3 className="perfil__subtitulo">Próximos</h3>
                <ul className="perfil__lista" role="list" data-testid="perfil-agendamentos-proximos">
                  {proximos.map((agendamento) => (
                    <li key={agendamento.id} className="perfil__agendamento-item" data-testid={`perfil-agendamento-${agendamento.id}`}>
                      <div className="perfil__agendamento-info">
                        <strong>{agendamento.servicos}</strong>
                        <time>{agendamento.dia} às {agendamento.horario}</time>
                      </div>
                      <div className="perfil__agendamento-acoes">
                        <span className={`perfil__status-${agendamento.statusPagamento}`}>
                          {agendamento.statusPagamento === 'pago' && (
                            <>
                              <Icone nome="verificarCirculo" tamanho={14} aria-hidden="true" /> Confirmado
                            </>
                          )}
                          {agendamento.statusPagamento === 'aguardando_pix' && (
                            <>
                              <Icone nome="relogio" tamanho={14} aria-hidden="true" /> Aguardando Pix
                            </>
                          )}
                          {agendamento.statusPagamento === 'no_local' && (
                            <>
                              <Icone nome="pix" tamanho={14} aria-hidden="true" /> Pagar no local
                            </>
                          )}
                        </span>
                        <BotaoSecundario tamanho="pequeno" aoClicar={() => cancelar(agendamento.id)}>Cancelar</BotaoSecundario>
                      </div>
                    </li>
                  ))}
                </ul>
                {passados.length > 0 && (
                  <>
                    <h3 className="perfil__subtitulo">Histórico</h3>
                    <ul className="perfil__lista" role="list" data-testid="perfil-agendamentos-passados">
                      {passados.slice(0, 5).map((agendamento) => (
                        <li key={agendamento.id} className="perfil__agendamento-item" data-testid={`perfil-agendamento-${agendamento.id}`}>
                          <div className="perfil__agendamento-info">
                            <strong>{agendamento.servicos}</strong>
                            <time>{agendamento.dia} às {agendamento.horario}</time>
                          </div>
                          <span className="perfil__status-concluido">
                            <Icone nome="verificarCirculo" tamanho={14} aria-hidden="true" /> Concluído
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : (
              <section className="perfil__vazio" aria-labelledby="vazio-agendamentos-titulo">
                <div className="perfil__vazio-icone" aria-hidden="true"><Icone nome="calendario" tamanho={48} /></div>
                <h3 id="vazio-agendamentos-titulo">Nenhum agendamento</h3>
                <p>Agende seu próximo corte na aba Explorar.</p>
                <BotaoPrimario aoClicar={() => window.location.href = '/explorar'}>Explorar</BotaoPrimario>
              </section>
            )}
          </section>

          {/* Painel Inspirações */}
          <section
            className="perfil__painel"
            role="tabpanel"
            id="painel-inspiracoes"
            aria-labelledby="aba-inspiracoes"
            hidden={abaAtiva !== 'inspiracoes'}
          >
            {carregandoInspiracoes ? (
              <div className="perfil__lista-carregando" role="status" aria-label="Carregando inspirações">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variante="texto" data-testid={`perfil-inspiracao-skeleton-${i}`} />
                ))}
              </div>
            ) : inspiracaoSalvas.length > 0 ? (
              <div className="perfil__grid-inspiracoes" role="list" data-testid="perfil-inspiracoes-grid">
                {inspiracaoSalvas.map((inspiracao) => (
                  <article key={inspiracao.id} className="perfil__inspiracao-item" data-testid={`perfil-inspiracao-${inspiracao.id}`}>
                    {inspiracao.midias?.[0]?.src && <img src={inspiracao.midias[0].src} alt={inspiracao.legenda} />}
                    <p>{inspiracao.legenda}</p>
                  </article>
                ))}
              </div>
            ) : (
              <section className="perfil__vazio" aria-labelledby="vazio-inspiracoes-titulo">
                <div className="perfil__vazio-icone" aria-hidden="true"><Icone nome="coracao" tamanho={48} /></div>
                <h3 id="vazio-inspiracoes-titulo">Nenhuma inspiração salva</h3>
                <p>Salve cortes que você gosta no Feed.</p>
                <BotaoPrimario aoClicar={() => window.location.href = '/feed'}>Ver Feed</BotaoPrimario>
              </section>
            )}
          </section>

          {/* Painel Configurações */}
          <section
            className="perfil__painel"
            role="tabpanel"
            id="painel-configuracoes"
            aria-labelledby="aba-configuracoes"
            hidden={abaAtiva !== 'configuracoes'}
          >
            <section className="perfil__secao" data-testid="perfil-senha" aria-labelledby="senha-titulo">
              <h2 id="senha-titulo">Alterar senha</h2>
              <CampoSenha
                label="Senha atual"
                valor={senhaAtual}
                aoAlterar={setSenhaAtual}
                obrigatorio
                data-testid="perfil-senha-atual"
              />
              <CampoSenha
                label="Nova senha"
                valor={novaSenha}
                aoAlterar={setNovaSenha}
                obrigatorio
                ajuda="Mínimo 6 caracteres"
                data-testid="perfil-nova-senha"
              />
              <CampoSenha
                label="Confirmar nova senha"
                valor={confirmarSenha}
                aoAlterar={setConfirmarSenha}
                obrigatorio
                data-testid="perfil-confirmar-senha"
              />
              <BotaoPrimario aoClicar={handleAlterarSenha} carregando={salvando}>Alterar senha</BotaoPrimario>
            </section>

            <section className="perfil__secao perfil__secao--perigo" data-testid="perfil-excluir" aria-labelledby="excluir-titulo">
              <h2 id="excluir-titulo">Excluir conta</h2>
              <p className="perfil__aviso">Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.</p>
              <BotaoPerigo aoClicar={() => setModalExcluirAberto(true)}>Excluir minha conta</BotaoPerigo>
            </section>

            <section className="perfil__secao" data-testid="perfil-sair" aria-labelledby="sair-titulo">
              <h2 id="sair-titulo" className="sr-only">Sair da conta</h2>
              <BotaoSecundario aoClicar={handleSair}>Sair da conta</BotaoSecundario>
            </section>
          </section>
        </main>

        {/* Modal Excluir Conta */}
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-excluir-titulo" hidden={!modalExcluirAberto}>
          <div className="modal modal--confirmacao">
            <h2 id="modal-excluir-titulo">Excluir conta</h2>
            <p>Tem certeza? Esta ação não pode ser desfeita. Todos os seus agendamentos, inspirações e dados serão perdidos permanentemente.</p>
            <div className="modal__botoes">
              <BotaoSecundario aoClicar={() => { setModalExcluirAberto(false); }}>Cancelar</BotaoSecundario>
              <BotaoPerigo aoClicar={handleExcluirConta} carregando={salvando}>Excluir permanentemente</BotaoPerigo>
            </div>
          </div>
        </div>
      </Container>
    </ToastProvider>
  );
};

export default Perfil;