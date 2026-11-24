/**
 * Tela Login - Autenticação de usuários.
 * Suporte a 3 tipos: cliente, barbeiro, admin.
 * Validação, recuperação de senha, cadastro rápido.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Container,
  Cartao,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  CampoTexto,
  CampoSenha,
  ChipGrupo,
  ToastProvider,
  useGlobalToast,
  Icone,
} from '@/componentes';
import './Login.css';

type TipoAuth = 'cliente' | 'barbeiro' | 'admin';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { sucesso } = useGlobalToast();

  const [tipo, setTipo] = useState<TipoAuth>('cliente');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    if (!email || !senha) {
      setErro('Preencha todos os campos');
      setCarregando(false);
      return;
    }

    const resultado = await login(email, senha, tipo);

    if (resultado.sucesso) {
      sucesso(`Bem-vindo${tipo === 'barbeiro' ? ' ao painel' : ''}!`);

      // Redireciona baseado no tipo
      switch (tipo) {
        case 'barbeiro':
          navigate('/painel');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          navigate('/feed');
      }
    } else {
      setErro(resultado.erro || 'Erro ao fazer login');
    }

    setCarregando(false);
  };

  const handleLoginRapido = async (tipoRapido: TipoAuth, emailRapido: string, senhaRapido: string) => {
    setTipo(tipoRapido);
    setEmail(emailRapido);
    setSenha(senhaRapido);
    await handleSubmit({ preventDefault: () => {}, stopPropagation: () => {}, nativeEvent: new Event('submit'), currentTarget: null, target: null, isDefaultPrevented: () => false, isPropagationStopped: () => false, persist: () => {} } as unknown as React.FormEvent<Element>);
  };

  return (
    <ToastProvider>
      <Container variante="tela-cheia" data-testid="login-container">
        <main className="login__main">
          {/* Logo */}
          <header className="login__header">
            <Link to="/" className="login__logo" aria-label="Corte Rápido - Início">
              <span className="login__logo-icone" aria-hidden="true">✂</span>
              <span className="login__logo-texto">Corte Rápido</span>
            </Link>
          </header>

          {/* Card de login */}
          <section className="login__card-section" aria-labelledby="login-titulo">
            <Cartao variante="padrao" className="login__card">
              <CartaoCorpo className="login__corpo">
                <h1 id="login-titulo" className="login__titulo">Entrar na sua conta</h1>
                <p className="login__subtitulo">Acesse seu painel ou agende seu próximo corte</p>

                {/* Seletor de tipo */}
                <fieldset className="login__tipo-grupo">
                  <legend>Entrar como</legend>
                  <ChipGrupo
                    opcoes={[
                      { valor: 'cliente', rotulo: 'Cliente', icone: <Icone nome="usuario" tamanho={16} /> },
                      { valor: 'barbeiro', rotulo: 'Barbeiro', icone: <Icone nome="tesoura" tamanho={16} /> },
                      { valor: 'admin', rotulo: 'Admin', icone: <Icone nome="configuracoes" tamanho={16} /> },
                    ]}
                    selecionados={[tipo]}
                    aoAlterar={(v) => setTipo(v[0] as TipoAuth)}
                    multiplo={false}
                    variante="selecao"
                    data-testid="login-tipo"
                  />
                </fieldset>

                {/* Formulário */}
                <form onSubmit={handleSubmit} className="login__form" noValidate>
                  <CampoTexto
                    label="E-mail"
                    tipo="email"
                    valor={email}
                    aoAlterar={setEmail}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    obrigatorio
                    erro={erro && !senha ? undefined : undefined}
                    data-testid="login-email"
                  />

                  <CampoSenha
                    label="Senha"
                    valor={senha}
                    aoAlterar={setSenha}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    obrigatorio
                    mostrarSenha={mostrarSenha}
                    aoAlternarVisibilidade={() => setMostrarSenha(!mostrarSenha)}
                    data-testid="login-senha"
                  />

                  {erro && (
                    <div className="login__erro" role="alert" data-testid="login-erro">
                      <Icone nome="alerta" tamanho={16} /> {erro}
                    </div>
                  )}

                  <div className="login__opcoes">
                    <label className="login__lembrar">
                      <input type="checkbox" />
                      <span>Lembrar-me</span>
                    </label>
                    <Link to="/recuperar-senha" className="login__esqueci">Esqueci a senha</Link>
                  </div>

                  <BotaoPrimario
                    className="login__btn-entrar"
                    carregando={carregando}
                    desabilitado={carregando}
                    data-testid="login-btn-entrar"
                  >
                    Entrar
                  </BotaoPrimario>
                </form>

                {/* Divisor */}
                <div className="login__divisor" role="separator" aria-label="ou">
                  <span>ou</span>
                </div>

                {/* Login rápido (demo) */}
                <section className="login__rapido" aria-labelledby="login-rapido-titulo">
                  <h2 id="login-rapido-titulo" className="sr-only">Acesso rápido (demo)</h2>
                  <p className="login__rapido-texto">Acesso rápido (demo):</p>
                  <div className="login__rapido-botoes">
                    <BotaoSecundario
                      tamanho="pequeno"
                      aoClicar={() => handleLoginRapido('cliente', 'cliente@demo.com', '123456')}
                      desabilitado={carregando}
                      data-testid="login-demo-cliente"
                    >
                      Cliente Demo
                    </BotaoSecundario>
                    <BotaoSecundario
                      tamanho="pequeno"
                      aoClicar={() => handleLoginRapido('barbeiro', 'barbeiro@demo.com', '123456')}
                      desabilitado={carregando}
                      data-testid="login-demo-barbeiro"
                    >
                      Barbeiro Demo
                    </BotaoSecundario>
                    <BotaoSecundario
                      tamanho="pequeno"
                      aoClicar={() => handleLoginRapido('admin', 'admin@demo.com', '123456')}
                      desabilitado={carregando}
                      data-testid="login-demo-admin"
                    >
                      Admin Demo
                    </BotaoSecundario>
                  </div>
                </section>

                {/* Cadastro */}
                <p className="login__cadastro">
                  Não tem conta? <Link to="/cadastro">Cadastrar grátis</Link>
                </p>
              </CartaoCorpo>
            </Cartao>
          </section>

          {/* Footer */}
          <footer className="login__footer">
            <p>© 2024 Corte Rápido. Todos os direitos reservados.</p>
            <nav aria-label="Links legais">
              <Link to="/privacidade" rel="noopener noreferrer">Privacidade</Link>
              <Link to="/termos" rel="noopener noreferrer">Termos</Link>
              <Link to="/contato" rel="noopener noreferrer">Contato</Link>
            </nav>
          </footer>
        </main>
      </Container>
    </ToastProvider>
  );
};

export default Login;