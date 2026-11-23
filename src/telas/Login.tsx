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
} from '@/componentes';
import { ICONES } from '@/constantes';
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

  const handleSubmit = async (e: React.FormEvent, emailOverride?: string, senhaOverride?: string, tipoOverride?: TipoAuth) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    const emailUsar = emailOverride ?? email;
    const senhaUsar = senhaOverride ?? senha;
    const tipoUsar = tipoOverride ?? tipo;

    if (!emailUsar || !senhaUsar) {
      setErro('Preencha todos os campos');
      setCarregando(false);
      return;
    }

    const resultado = await login(emailUsar, senhaUsar, tipoUsar);

    if (resultado.sucesso) {
      sucesso(`Bem-vindo${tipoUsar === 'barbeiro' ? ' ao painel' : ''}!`);

      // Redireciona baseado no tipo
      switch (tipoUsar) {
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

  const handleLoginRapido = async (tipoRapido: TipoAuth, emailRapido: string, senhaRapida: string) => {
    setTipo(tipoRapido);
    setEmail(emailRapido);
    setSenha(senhaRapida);
    await handleSubmit(
      { preventDefault: () => {}, currentTarget: null } as unknown as React.FormEvent<HTMLFormElement>,
      emailRapido,
      senhaRapida,
      tipoRapido
    );
  };

  return (
    <ToastProvider>
      <Container variante="tela-cheia" data-testid="login-container">
        <div className="login__wrapper">
          {/* Logo */}
          <header className="login__header">
            <Link to="/" className="login__logo" aria-label="Corte Rápido - Início">
              <span className="login__logo-icone" aria-hidden="true">✂</span>
              <span className="login__logo-texto">Corte Rápido</span>
            </Link>
          </header>

          {/* Card de login */}
          <Cartao variante="padrao" className="login__card">
            <CartaoCorpo className="login__corpo">
              <h1 className="login__titulo">Entrar na sua conta</h1>
              <p className="login__subtitulo">Acesse seu painel ou agende seu próximo corte</p>

              {/* Seletor de tipo */}
              <fieldset className="login__tipo-grupo">
                <legend>Entrar como</legend>
                <ChipGrupo
                  opcoes={[
                    { valor: 'cliente', rotulo: '👤 Cliente', icone: ICONES.usuario },
                    { valor: 'barbeiro', rotulo: '💈 Barbeiro', icone: ICONES.tesoura },
                    { valor: 'admin', rotulo: '⚙️ Admin', icone: ICONES.configuracoes },
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
                    {ICONES.alerta} {erro}
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
                  tipo="submit"
                  className="login__btn-entrar"
                  carregando={carregando}
                  desabilitado={carregando}
                  data-testid="login-btn-entrar"
                >
                  Entrar
                </BotaoPrimario>
              </form>

              {/* Divisor */}
              <div className="login__divisor">
                <span>ou</span>
              </div>

              {/* Login rápido (demo) */}
              <div className="login__rapido">
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
              </div>

              {/* Cadastro */}
              <p className="login__cadastro">
                Não tem conta? <Link to="/cadastro">Cadastrar grátis</Link>
              </p>
            </CartaoCorpo>
          </Cartao>

          {/* Footer */}
          <footer className="login__footer">
            <p>© 2024 Corte Rápido. Todos os direitos reservados.</p>
            <nav>
              <Link to="/privacidade">Privacidade</Link>
              <Link to="/termos">Termos</Link>
              <Link to="/contato">Contato</Link>
            </nav>
          </footer>
        </div>
      </Container>
    </ToastProvider>
  );
};

export default Login;