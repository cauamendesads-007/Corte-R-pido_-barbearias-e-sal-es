/**
 * Tela Configurações - Configurações do usuário e conta.
 * Perfil, notificações, privacidade, aparência, conta.
 */

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Container,
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  BotaoPrimario,
  BotaoPerigo,
  BotaoSecundario,
  CampoTexto,
  CampoSenha,
  CampoWhatsapp,
  CheckboxToggle as Toggle,
  ChipGrupo,
  ModalConfirmacao,
  Avatar,
  ToastProvider,
  useGlobalToast,
  Icone,
} from '@/componentes';
import './Configuracoes.css';

const Configuracoes = () => {
  const { usuario, atualizarPerfil, alterarSenha, sair, excluirConta } = useAuth();
  const { sucesso, erro: toastErro } = useGlobalToast();

  const [abaAtiva, setAbaAtiva] = useState<'perfil' | 'notificacoes' | 'privacidade' | 'aparencia' | 'conta'>('perfil');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Perfil
  const [nome, setNome] = useState(usuario?.nome || '');
  const [bio, setBio] = useState(usuario?.bio || '');
  const [whatsapp, setWhatsapp] = useState(usuario?.whatsapp || '');
  const [cidade, setCidade] = useState(usuario?.cidade || '');
  const [avatar] = useState<string | null>(usuario?.avatar || null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Notificações
  const [notifAgendamentos, setNotifAgendamentos] = useState(usuario?.lembretesWhatsapp ?? true);
  const [notifMensagens, setNotifMensagens] = useState(true);
  const [notifPromocoes, setNotifPromocoes] = useState(false);
  const [notifWhatsApp, setNotifWhatsApp] = useState(usuario?.lembretesWhatsapp ?? true);

  // Privacidade
  const [perfilPublico, setPerfilPublico] = useState(true);
  const [mostrarAvaliacoes, setMostrarAvaliacoes] = useState(true);
  const [historicoVisivel, setHistoricoVisivel] = useState(true);

  // Aparência
  const [tema, setTema] = useState<'claro' | 'escuro' | 'sistema'>('sistema');
  const [fonteGrande, setFonteGrande] = useState(false);
  const [reduzirAnimacoes, setReduzirAnimacoes] = useState(false);

  // Conta - Senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [mostrarModalExcluir, setMostrarModalExcluir] = useState(false);

  const handleSalvarPerfil = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      await atualizarPerfil({ nome, bio, whatsapp, cidade, avatar: avatarPreview || undefined });
      sucesso('Perfil atualizado com sucesso');
    } catch {
      setErro('Erro ao atualizar perfil');
    } finally {
      setCarregando(false);
    }
  }, [atualizarPerfil, nome, bio, whatsapp, cidade, avatarPreview, sucesso]);

  const handleAlterarSenha = useCallback(async () => {
    if (novaSenha !== confirmarNovaSenha) {
      setErro('As senhas não coincidem');
      return;
    }
    if (novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      await alterarSenha(senhaAtual, novaSenha);
      sucesso('Senha alterada com sucesso');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
    } catch {
      setErro('Erro ao alterar senha. Verifique a senha atual.');
    } finally {
      setCarregando(false);
    }
  }, [alterarSenha, senhaAtual, novaSenha, confirmarNovaSenha, sucesso]);

  const handleExcluirConta = useCallback(async () => {
    setCarregando(true);
    try {
      await excluirConta();
      sucesso('Conta excluída');
    } catch {
      toastErro('Erro ao excluir conta');
    } finally {
      setCarregando(false);
    }
  }, [excluirConta, sucesso, toastErro]);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  return (
    <ToastProvider>
      <Container variante="com-cabecalho" data-testid="configuracoes-container">
        <header className="configuracoes__header">
          <h1>Configurações</h1>
        </header>

        <nav className="configuracoes__abas" role="tablist" aria-label="Seções de configurações">
          <button
            role="tab"
            aria-selected={abaAtiva === 'perfil'}
            aria-controls="painel-perfil"
            id="aba-perfil"
            onClick={() => setAbaAtiva('perfil')}
            className={abaAtiva === 'perfil' ? 'configuracoes__aba ativa' : 'configuracoes__aba'}
          >
            <span aria-hidden="true"><Icone nome="usuario" tamanho={18} /></span> Perfil
          </button>
          <button
            role="tab"
            aria-selected={abaAtiva === 'notificacoes'}
            aria-controls="painel-notificacoes"
            id="aba-notificacoes"
            onClick={() => setAbaAtiva('notificacoes')}
            className={abaAtiva === 'notificacoes' ? 'configuracoes__aba ativa' : 'configuracoes__aba'}
          >
            <span aria-hidden="true"><Icone nome="sino" tamanho={18} /></span> Notificações
          </button>
          <button
            role="tab"
            aria-selected={abaAtiva === 'privacidade'}
            aria-controls="painel-privacidade"
            id="aba-privacidade"
            onClick={() => setAbaAtiva('privacidade')}
            className={abaAtiva === 'privacidade' ? 'configuracoes__aba ativa' : 'configuracoes__aba'}
          >
            <span aria-hidden="true"><Icone nome="cadeado" tamanho={18} /></span> Privacidade
          </button>
          <button
            role="tab"
            aria-selected={abaAtiva === 'aparencia'}
            aria-controls="painel-aparencia"
            id="aba-aparencia"
            onClick={() => setAbaAtiva('aparencia')}
            className={abaAtiva === 'aparencia' ? 'configuracoes__aba ativa' : 'configuracoes__aba'}
          >
            <span aria-hidden="true"><Icone nome="tema" tamanho={18} /></span> Aparência
          </button>
          <button
            role="tab"
            aria-selected={abaAtiva === 'conta'}
            aria-controls="painel-conta"
            id="aba-conta"
            onClick={() => setAbaAtiva('conta')}
            className={abaAtiva === 'conta' ? 'configuracoes__aba ativa' : 'configuracoes__aba'}
          >
            <span aria-hidden="true"><Icone nome="configuracoes" tamanho={18} /></span> Conta
          </button>
        </nav>

        <main className="configuracoes__conteudo" role="main">
          {/* Perfil */}
          <section className="configuracoes__painel" role="tabpanel" id="painel-perfil" aria-labelledby="aba-perfil" hidden={abaAtiva !== 'perfil'}>
            <form onSubmit={(e) => { e.preventDefault(); handleSalvarPerfil(); }} className="configuracoes__form">
              <Cartao variante="padrao">
                <CartaoCabecalho>
                  <h2>Informações pessoais</h2>
                </CartaoCabecalho>
                <CartaoCorpo>
                  <div className="configuracoes__avatar-section">
                    <Avatar
                      src={avatarPreview || avatar || undefined}
                      nome={nome || usuario?.email || 'Usuário'}
                      tamanho="grande"
                      className="configuracoes__avatar"
                    />
                    <label className="configuracoes__avatar-label">
                      <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
                      <Icone nome="camera" tamanho={16} /> Alterar foto
                    </label>
                  </div>

                  <CampoTexto
                    label="Nome completo"
                    valor={nome}
                    aoAlterar={setNome}
                    placeholder="Seu nome"
                    autoComplete="name"
                    obrigatorio
                    data-testid="config-nome"
                  />

                  <CampoTexto
                    label="Bio"
                    valor={bio}
                    aoAlterar={setBio}
                    placeholder="Conte um pouco sobre você"
                    maxLength={160}
                    data-testid="config-bio"
                  />

                  <CampoWhatsapp
                    label="WhatsApp"
                    valor={whatsapp}
                    aoAlterar={setWhatsapp}
                    ajuda="Usado para notificações e contato"
                    data-testid="config-whatsapp"
                  />

                  <CampoTexto
                    label="Cidade"
                    valor={cidade}
                    aoAlterar={setCidade}
                    placeholder="Sua cidade"
                    data-testid="config-cidade"
                  />

                  {erro && <div className="configuracoes__erro" role="alert">{erro}</div>}

                  <BotaoPrimario tipo="submit" carregando={carregando} data-testid="btn-salvar-perfil">
                    Salvar alterações
                  </BotaoPrimario>
                </CartaoCorpo>
              </Cartao>
            </form>
          </section>

          {/* Notificações */}
          <section className="configuracoes__painel" role="tabpanel" id="painel-notificacoes" aria-labelledby="aba-notificacoes" hidden={abaAtiva !== 'notificacoes'}>
            <Cartao variante="padrao">
              <CartaoCabecalho>
                <h2>Preferências de notificação</h2>
              </CartaoCabecalho>
              <CartaoCorpo>
                <fieldset className="configuracoes__toggle-grupo">
                  <legend>Preferências de notificação</legend>
                  <Toggle
                    rotulo="Lembretes de agendamento"
                    descricao="Receber avisos antes dos seus horários marcados"
                    verificado={notifAgendamentos}
                    aoAlterar={setNotifAgendamentos}
                    data-testid="toggle-agendamentos"
                  />
                  <Toggle
                    rotulo="Mensagens e conversas"
                    descricao="Notificações quando receber mensagens de barbeiros"
                    verificado={notifMensagens}
                    aoAlterar={setNotifMensagens}
                    data-testid="toggle-mensagens"
                  />
                  <Toggle
                    rotulo="Promoções e novidades"
                    descricao="Ofertas especiais e atualizações da plataforma"
                    verificado={notifPromocoes}
                    aoAlterar={setNotifPromocoes}
                    data-testid="toggle-promocoes"
                  />
                  <Toggle
                    rotulo="Notificações via WhatsApp"
                    descricao="Enviar lembretes e confirmações pelo WhatsApp"
                    verificado={notifWhatsApp}
                    aoAlterar={setNotifWhatsApp}
                    data-testid="toggle-whatsapp"
                  />
                </fieldset>
              </CartaoCorpo>
            </Cartao>
          </section>

          {/* Privacidade */}
          <section className="configuracoes__painel" role="tabpanel" id="painel-privacidade" aria-labelledby="aba-privacidade" hidden={abaAtiva !== 'privacidade'}>
            <Cartao variante="padrao">
              <CartaoCabecalho>
                <h2>Privacidade e visibilidade</h2>
              </CartaoCabecalho>
              <CartaoCorpo>
                <fieldset className="configuracoes__toggle-grupo">
                  <legend>Visibilidade do perfil</legend>
                  <Toggle
                    rotulo="Perfil público"
                    descricao="Permitir que outros usuários vejam seu perfil e avaliações"
                    verificado={perfilPublico}
                    aoAlterar={setPerfilPublico}
                    data-testid="toggle-perfil-publico"
                  />
                  <Toggle
                    rotulo="Mostrar minhas avaliações"
                    descricao="Exibir suas avaliações publicamente no perfil"
                    verificado={mostrarAvaliacoes}
                    aoAlterar={setMostrarAvaliacoes}
                    data-testid="toggle-avaliacoes"
                  />
                  <Toggle
                    rotulo="Histórico de agendamentos visível"
                    descricao="Permitir que barbeiros vejam seu histórico"
                    verificado={historicoVisivel}
                    aoAlterar={setHistoricoVisivel}
                    data-testid="toggle-historico"
                  />
                </fieldset>

                <section className="configuracoes__secao">
                  <h3>Dados da conta</h3>
                  <p className="configuracoes__descricao">
                    Gerencie seus dados pessoais e solicite a exclusão conforme a LGPD.
                  </p>
                  <BotaoSecundario iconeEsquerda={<Icone nome="setaBaixo" tamanho={16} />} aoClicar={() => { /* TODO: exportar dados */ }}>
                    Baixar meus dados
                  </BotaoSecundario>
                </section>
              </CartaoCorpo>
            </Cartao>
          </section>

          {/* Aparência */}
          <section className="configuracoes__painel" role="tabpanel" id="painel-aparencia" aria-labelledby="aba-aparencia" hidden={abaAtiva !== 'aparencia'}>
            <Cartao variante="padrao">
              <CartaoCabecalho>
                <h2>Tema e exibição</h2>
              </CartaoCabecalho>
              <CartaoCorpo>
                <fieldset className="configuracoes__radio-grupo">
                  <legend>Tema</legend>
                  <ChipGrupo
                    opcoes={[
                      { valor: 'claro', rotulo: 'Claro', icone: <Icone nome="sol" tamanho={16} /> },
                      { valor: 'escuro', rotulo: 'Escuro', icone: <Icone nome="lua" tamanho={16} /> },
                      { valor: 'sistema', rotulo: 'Sistema', icone: <Icone nome="monitor" tamanho={16} /> },
                    ]}
                    selecionados={[tema]}
                    aoAlterar={(v: string[]) => setTema(v[0] as 'claro' | 'escuro' | 'sistema')}
                    multiplo={false}
                    variante="selecao"
                    data-testid="config-tema"
                  />
                </fieldset>

                <fieldset className="configuracoes__toggle-grupo">
                  <legend>Exibição</legend>
                  <Toggle
                    rotulo="Fonte maior"
                    descricao="Aumentar tamanho do texto em toda a aplicação"
                    verificado={fonteGrande}
                    aoAlterar={setFonteGrande}
                    data-testid="toggle-fonte-grande"
                  />
                  <Toggle
                    rotulo="Reduzir animações"
                    descricao="Desativar transições e animações para melhor desempenho"
                    verificado={reduzirAnimacoes}
                    aoAlterar={setReduzirAnimacoes}
                    data-testid="toggle-reduzir-animacoes"
                  />
                </fieldset>
              </CartaoCorpo>
            </Cartao>
          </section>

          {/* Conta */}
          {abaAtiva === 'conta' && (
            <>
              <Cartao variante="padrao">
                <CartaoCabecalho>
                  <h2>Alterar senha</h2>
                </CartaoCabecalho>
                <CartaoCorpo>
                  <form onSubmit={(e) => { e.preventDefault(); handleAlterarSenha(); }} className="configuracoes__form">
                    <CampoSenha
                      label="Senha atual"
                      valor={senhaAtual}
                      aoAlterar={setSenhaAtual}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      obrigatorio
                      data-testid="config-senha-atual"
                    />

                    <CampoSenha
                      label="Nova senha"
                      valor={novaSenha}
                      aoAlterar={setNovaSenha}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      obrigatorio
                      ajuda="Mínimo 6 caracteres"
                      data-testid="config-nova-senha"
                    />

                    <CampoSenha
                      label="Confirmar nova senha"
                      valor={confirmarNovaSenha}
                      aoAlterar={setConfirmarNovaSenha}
                      placeholder="Repita a nova senha"
                      autoComplete="new-password"
                      obrigatorio
                      data-testid="config-confirmar-senha"
                    />

                    {erro && <div className="configuracoes__erro" role="alert">{erro}</div>}

                    <BotaoPrimario tipo="submit" carregando={carregando} data-testid="btn-alterar-senha">
                      Alterar senha
                    </BotaoPrimario>
                  </form>
                </CartaoCorpo>
              </Cartao>

              <Cartao variante="padrao" className="configuracoes__cartao-perigo">
                <CartaoCabecalho>
                  <h2>Excluir conta</h2>
                </CartaoCabecalho>
                <CartaoCorpo>
                  <p className="configuracoes__descricao">
                    Esta ação é irreversível. Todos os seus dados, agendamentos, avaliações e histórico serão permanentemente removidos.
                  </p>
                  <BotaoPerigo
                    aoClicar={() => setMostrarModalExcluir(true)}
                    iconeEsquerda={<Icone nome="lixeira" tamanho={16} />}
                    data-testid="btn-excluir-conta"
                  >
                    Excluir minha conta
                  </BotaoPerigo>
                </CartaoCorpo>
              </Cartao>

              <Cartao variante="padrao">
                <CartaoCabecalho>
                  <h2>Sair da conta</h2>
                </CartaoCabecalho>
                <CartaoCorpo>
                  <p className="configuracoes__descricao">
                    Encerrar sessão atual. Você poderá entrar novamente a qualquer momento.
                  </p>
                  <BotaoSecundario
                    aoClicar={sair}
                    iconeEsquerda={<Icone nome="sair" tamanho={16} />}
                    carregando={carregando}
                    data-testid="btn-sair"
                  >
                    Sair
                  </BotaoSecundario>
                </CartaoCorpo>
              </Cartao>
            </>
          )}

          {/* Modal Excluir Conta */}
          <ModalConfirmacao
            aberto={mostrarModalExcluir}
            aoConfirmar={handleExcluirConta}
            aoFechar={() => setMostrarModalExcluir(false)}
            titulo="Excluir conta permanentemente"
            mensagem="Tem certeza? Esta ação não pode ser desfeita. Todos os seus dados serão perdidos."
            textoConfirmar="Sim, excluir"
            varianteConfirmar="perigo"
            data-testid="modal-excluir-conta"
          />
        </main>
      </Container>
    </ToastProvider>
  );
};

export default Configuracoes;