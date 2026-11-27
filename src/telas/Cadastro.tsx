/**
 * Tela Cadastro - Registro de novos usuários.
 * 3 fluxos: Cliente, Barbeiro (com estabelecimento), Admin (restrito).
 * Validação completa, termos, LGPD.
 */

import { useState, useCallback } from 'react';
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
  CampoWhatsapp,
  Select,
  ChipGrupo,
  ToastProvider,
  useGlobalToast,
  Icone,
} from '@/componentes';
import './Cadastro.css';

type TipoCadastro = 'cliente' | 'barbeiro' | 'admin';

interface DadosCadastro {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  telefone: string;
  tipo: TipoCadastro;
  // Barbeiro
  estabelecimentoNome?: string;
  estabelecimentoCidade?: string;
  estabelecimentoEndereco?: string;
  estabelecimentoNicho?: string;
  cpf?: string;
  // Admin
  codigoConvite?: string;
}

const NICHOS = [
  { valor: 'barbearia', rotulo: 'Barbearia', icone: <Icone nome="tesoura" tamanho={14} /> },
  { valor: 'feminino', rotulo: 'Salão Feminino', icone: <Icone nome="usuario" tamanho={14} /> },
  { valor: 'visagismo', rotulo: 'Visagismo', icone: <Icone nome="estrela" tamanho={14} /> },
  { valor: 'infantil', rotulo: 'Infantil', icone: <Icone nome="casa" tamanho={14} /> },
];

const Cadastro = () => {
  const navigate = useNavigate();
  const { cadastrar } = useAuth();
  const { sucesso } = useGlobalToast();

  const [tipo, setTipo] = useState<TipoCadastro>('cliente');
  const [dados, setDados] = useState<DadosCadastro>({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    telefone: '',
    tipo: 'cliente',
    estabelecimentoNicho: 'barbearia',
  });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [etapa, setEtapa] = useState(1); // 1: tipo, 2: dados, 3: estabelecimento (barbeiro), 4: confirmacao

  const atualizarDado = useCallback((campo: keyof DadosCadastro, valor: string) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
    if (erro) setErro('');
  }, [erro]);

  const validarEtapa = () => {
    if (etapa === 1) return true;

    if (!dados.nome.trim()) return 'Nome é obrigatório';
    if (!dados.email.trim()) return 'E-mail é obrigatório';
    if (!dados.email.includes('@')) return 'E-mail inválido';
    if (dados.senha.length < 6) return 'Senha deve ter pelo menos 6 caracteres';
    if (dados.senha !== dados.confirmarSenha) return 'As senhas não coincidem';
    if (!dados.telefone.trim()) return 'WhatsApp é obrigatório';
    if (!aceitouTermos) return 'Você deve aceitar os termos de uso';

    if (tipo === 'barbeiro' && etapa >= 3) {
      if (!dados.estabelecimentoNome?.trim()) return 'Nome do estabelecimento é obrigatório';
      if (!dados.estabelecimentoCidade?.trim()) return 'Cidade é obrigatória';
      if (!dados.estabelecimentoEndereco?.trim()) return 'Endereço é obrigatório';
      if (!dados.cpf?.trim()) return 'CPF é obrigatório';
      if (dados.cpf.replace(/\D/g, '').length !== 11) return 'CPF inválido';
    }

    if (tipo === 'admin' && dados.codigoConvite !== 'ADMIN2024') {
      return 'Código de convite inválido para admin';
    }

    return true;
  };

  const handleAvancar = () => {
    const validacao = validarEtapa();
    if (validacao !== true) {
      setErro(validacao);
      return;
    }

    if (etapa === 1) {
      setEtapa(tipo === 'barbeiro' ? 3 : 4);
    } else if (etapa === 3) {
      setEtapa(4);
    }
  };

  const handleVoltar = () => {
    setEtapa(etapa > 1 ? etapa - 1 : 1);
    setErro('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validacao = validarEtapa();
    if (validacao !== true) {
      setErro(validacao);
      return;
    }

    setCarregando(true);
    setErro('');

    try {
      const tipoCadastro = tipo === 'admin' ? 'barbeiro' : tipo;
      const resultado = await cadastrar({
        nome: dados.nome,
        email: dados.email,
        senha: dados.senha,
        telefone: dados.telefone,
        tipo: tipoCadastro,
        estabelecimentoId: tipo === 'barbeiro' ? 'novo' : undefined,
      });

      if (resultado.sucesso) {
        sucesso('Conta criada com sucesso! Bem-vindo ao Corte Rápido.');

        // Redireciona baseado no tipo
        setTimeout(() => {
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
        }, 1500);
      } else {
        setErro(resultado.erro || 'Erro ao criar conta');
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  // Render por etapa
  const renderEtapaTipo = () => (
    <ToastProvider>
      <Container variante="tela-cheia" data-testid="cadastro-container">
        <main className="cadastro__main">
          <header className="cadastro__header">
            <Link to="/" className="cadastro__logo" aria-label="Corte Rápido">
              <span className="cadastro__logo-icone" aria-hidden="true">✂</span>
              <span className="cadastro__logo-texto">Corte Rápido</span>
            </Link>
          </header>

          <section className="cadastro__card-section" aria-labelledby="cadastro-titulo-tipo">
            <Cartao variante="padrao" className="cadastro__card">
              <CartaoCorpo className="cadastro__corpo">
                <h1 id="cadastro-titulo-tipo" className="cadastro__titulo">Criar conta</h1>
                <p className="cadastro__subtitulo">Como você vai usar o Corte Rápido?</p>

                <fieldset className="cadastro__tipo-fieldset">
                  <legend>Tipo de conta</legend>
                  <ChipGrupo
                    opcoes={[
                      { valor: 'cliente', rotulo: 'Cliente', icone: <Icone nome="usuario" tamanho={16} /> },
                      { valor: 'barbeiro', rotulo: 'Barbeiro', icone: <Icone nome="tesoura" tamanho={16} /> },
                      { valor: 'admin', rotulo: 'Admin', icone: <Icone nome="configuracoes" tamanho={16} /> },
                    ]}
                    selecionados={[tipo]}
                    aoAlterar={(v) => setTipo(v[0] as TipoCadastro)}
                    multiplo={false}
                    variante="selecao"
                    className="cadastro__tipo-chips"
                    data-testid="cadastro-tipo"
                  />
                </fieldset>

                {erro && (
                  <div className="cadastro__erro" role="alert">{erro}</div>
                )}

                <BotaoPrimario
                  className="cadastro__btn-continuar"
                  aoClicar={handleAvancar}
                  desabilitado={carregando}
                  data-testid="cadastro-btn-tipo"
                >
                  Continuar
                </BotaoPrimario>

                <p className="cadastro__login-link">
                  Já tem conta? <Link to="/login">Entrar</Link>
                </p>
              </CartaoCorpo>
            </Cartao>
          </section>
        </main>
      </Container>
    </ToastProvider>
  );

  const renderEtapaEstabelecimento = () => (
    <ToastProvider>
      <Container variante="tela-cheia" data-testid="cadastro-container">
        <main className="cadastro__main">
          <header className="cadastro__header">
            <button className="cadastro__btn-voltar" onClick={handleVoltar} aria-label="Voltar">
              <Icone nome="voltar" tamanho={20} />
            </button>
            <Link to="/" className="cadastro__logo" aria-label="Corte Rápido">
              <span className="cadastro__logo-icone" aria-hidden="true">✂</span>
              <span className="cadastro__logo-texto">Corte Rápido</span>
            </Link>
          </header>

          <section className="cadastro__card-section" aria-labelledby="cadastro-titulo-estab">
            <Cartao variante="padrao" className="cadastro__card">
              <CartaoCorpo className="cadastro__corpo">
                <nav className="cadastro__progresso" aria-label="Progresso do cadastro">
                  <ol>
                    <li className={etapa >= 1 ? 'cadastro__passo cadastro__passo--ativo' : 'cadastro__passo'}><span>1</span></li>
                    <li className="cadastro__passo-linha" aria-hidden="true" />
                    <li className={etapa >= 3 ? 'cadastro__passo cadastro__passo--ativo' : 'cadastro__passo'}><span>2</span></li>
                    <li className="cadastro__passo-linha" aria-hidden="true" />
                    <li className="cadastro__passo"><span>3</span></li>
                  </ol>
                </nav>

                <h1 id="cadastro-titulo-estab" className="cadastro__titulo">Dados do estabelecimento</h1>
                <p className="cadastro__subtitulo">Informações para seu perfil profissional</p>

                <form onSubmit={(e) => { e.preventDefault(); handleAvancar(); }} className="cadastro__form">
                  <CampoTexto
                    label="Nome do estabelecimento"
                    valor={dados.estabelecimentoNome || ''}
                    aoAlterar={(v) => atualizarDado('estabelecimentoNome', v)}
                    placeholder="Ex: Barbearia do João"
                    obrigatorio
                    data-testid="cadastro-estab-nome"
                  />

                  <Select
                    label="Categoria"
                    valor={dados.estabelecimentoNicho || 'barbearia'}
                    aoAlterar={(v) => atualizarDado('estabelecimentoNicho', Array.isArray(v) ? v[0] : v)}
                    opcoes={NICHOS}
                    obrigatorio
                    data-testid="cadastro-estab-nicho"
                  />

                  <CampoTexto
                    label="Cidade"
                    valor={dados.estabelecimentoCidade || ''}
                    aoAlterar={(v) => atualizarDado('estabelecimentoCidade', v)}
                    placeholder="Sua cidade"
                    obrigatorio
                    data-testid="cadastro-estab-cidade"
                  />

                  <CampoTexto
                    label="Endereço completo"
                    valor={dados.estabelecimentoEndereco || ''}
                    aoAlterar={(v) => atualizarDado('estabelecimentoEndereco', v)}
                    placeholder="Rua, número, bairro"
                    obrigatorio
                    data-testid="cadastro-estab-endereco"
                  />

                  <CampoTexto
                    label="CPF (para verificação)"
                    valor={dados.cpf || ''}
                    aoAlterar={(v) => atualizarDado('cpf', v)}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={14}
                    obrigatorio
                    ajuda="Apenas para verificação de identidade. Não será exibido publicamente."
                    data-testid="cadastro-cpf"
                  />

                  {erro && (
                    <div className="cadastro__erro" role="alert">{erro}</div>
                  )}

                  <div className="cadastro__botoes">
                    <BotaoSecundario aoClicar={handleVoltar} desabilitado={carregando}>Voltar</BotaoSecundario>
                    <BotaoPrimario carregando={carregando} data-testid="cadastro-btn-estab">Continuar</BotaoPrimario>
                  </div>
                </form>
              </CartaoCorpo>
            </Cartao>
          </section>
        </main>
      </Container>
    </ToastProvider>
  );

  const renderEtapaDados = () => {
    const isBarbeiro = tipo === 'barbeiro';
    const isAdmin = tipo === 'admin';

    return (
      <ToastProvider>
        <Container variante="tela-cheia" data-testid="cadastro-container">
          <main className="cadastro__main">
            <header className="cadastro__header">
              <button className="cadastro__btn-voltar" onClick={handleVoltar} aria-label="Voltar">
                <Icone nome="voltar" tamanho={20} />
              </button>
              <Link to="/" className="cadastro__logo" aria-label="Corte Rápido">
                <span className="cadastro__logo-icone" aria-hidden="true">✂</span>
                <span className="cadastro__logo-texto">Corte Rápido</span>
              </Link>
            </header>

            <section className="cadastro__card-section" aria-labelledby="cadastro-titulo-dados">
              <Cartao variante="padrao" className="cadastro__card">
                <CartaoCorpo className="cadastro__corpo">
                  <nav className="cadastro__progresso" aria-label="Progresso do cadastro">
                    <ol>
                      <li className="cadastro__passo cadastro__passo--ativo"><span>1</span></li>
                      <li className="cadastro__passo-linha" aria-hidden="true" />
                      <li className={isBarbeiro ? 'cadastro__passo cadastro__passo--ativo' : 'cadastro__passo'}><span>2</span></li>
                      <li className="cadastro__passo-linha" aria-hidden="true" />
                      <li className="cadastro__passo cadastro__passo--ativo"><span>3</span></li>
                    </ol>
                  </nav>

                  <h1 id="cadastro-titulo-dados" className="cadastro__titulo">Suas informações</h1>
                  <p className="cadastro__subtitulo">Preencha para criar sua conta</p>

                  <form onSubmit={handleSubmit} className="cadastro__form" noValidate>
                    <CampoTexto
                      label="Nome completo"
                      valor={dados.nome}
                      aoAlterar={(v) => atualizarDado('nome', v)}
                      placeholder="Seu nome"
                      autoComplete="name"
                      obrigatorio
                      data-testid="cadastro-nome"
                    />

                    <CampoTexto
                      label="E-mail"
                      tipo="email"
                      valor={dados.email}
                      aoAlterar={(v) => atualizarDado('email', v)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      obrigatorio
                      data-testid="cadastro-email"
                    />

                    <CampoSenha
                      label="Senha"
                      valor={dados.senha}
                      aoAlterar={(v) => atualizarDado('senha', v)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      obrigatorio
                      ajuda="Mínimo 6 caracteres"
                      data-testid="cadastro-senha"
                    />

                    <CampoSenha
                      label="Confirmar senha"
                      valor={dados.confirmarSenha}
                      aoAlterar={(v) => atualizarDado('confirmarSenha', v)}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      obrigatorio
                      data-testid="cadastro-confirmar-senha"
                    />

                    <CampoWhatsapp
                      label="WhatsApp"
                      valor={dados.telefone}
                      aoAlterar={(v) => atualizarDado('telefone', v)}
                      obrigatorio
                      ajuda="Usado para confirmações e notificações"
                      data-testid="cadastro-telefone"
                    />

                    {isAdmin && (
                      <CampoTexto
                        label="Código de convite admin"
                        valor={dados.codigoConvite || ''}
                        aoAlterar={(v) => atualizarDado('codigoConvite', v)}
                        placeholder="Código exclusivo"
                        obrigatorio
                        data-testid="cadastro-codigo-admin"
                      />
                    )}

                    <fieldset className="cadastro__termos-fieldset">
                      <legend>Termos e condições</legend>
                      <label className="cadastro__termos">
                        <input
                          type="checkbox"
                          checked={aceitouTermos}
                          onChange={(e) => setAceitouTermos(e.target.checked)}
                          required
                        />
                        <span>
                          Aceito os <Link to="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso</Link> e a <Link to="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link>
                        </span>
                      </label>
                    </fieldset>

                    {erro && (
                      <div className="cadastro__erro" role="alert">{erro}</div>
                    )}

                    <div className="cadastro__botoes">
                      {etapa > 1 && <BotaoSecundario aoClicar={handleVoltar} desabilitado={carregando}>Voltar</BotaoSecundario>}
                      <BotaoPrimario carregando={carregando} data-testid="cadastro-btn-final">
                        {carregando ? 'Criando conta...' : 'Criar conta'}
                      </BotaoPrimario>
                    </div>
                  </form>

                  <p className="cadastro__login-link">
                    Já tem conta? <Link to="/login">Entrar</Link>
                  </p>
                </CartaoCorpo>
              </Cartao>
            </section>
          </main>
        </Container>
      </ToastProvider>
    );
  };

  // Render por etapa
  if (etapa === 1) {
    return renderEtapaTipo();
  }

  if (etapa === 3) {
    return renderEtapaEstabelecimento();
  }

  return renderEtapaDados();
};

export default Cadastro;