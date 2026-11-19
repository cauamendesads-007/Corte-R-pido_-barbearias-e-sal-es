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
} from '@/componentes';
import { ICONES } from '@/constantes';
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
  { valor: 'barbearia', rotulo: '💈 Barbearia' },
  { valor: 'feminino', rotulo: '♀ Salão Feminino' },
  { valor: 'visagismo', rotulo: '✂ Visagismo' },
  { valor: 'infantil', rotulo: '👶 Infantil' },
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
        <div className="cadastro__wrapper">
          <header className="cadastro__header">
            <Link to="/" className="cadastro__logo" aria-label="Corte Rápido">
              <span className="cadastro__logo-icone" aria-hidden="true">✂</span>
              <span className="cadastro__logo-texto">Corte Rápido</span>
            </Link>
          </header>

          <Cartao variante="padrao" className="cadastro__card">
            <CartaoCorpo className="cadastro__corpo">
              <h1 className="cadastro__titulo">Criar conta</h1>
              <p className="cadastro__subtitulo">Como você vai usar o Corte Rápido?</p>

              <ChipGrupo
                opcoes={[
                  { valor: 'cliente', rotulo: '👤 Cliente', icone: ICONES.usuario },
                  { valor: 'barbeiro', rotulo: '💈 Barbeiro', icone: ICONES.tesoura },
                  { valor: 'admin', rotulo: '⚙️ Admin', icone: ICONES.configuracoes },
                ]}
                selecionados={[tipo]}
                aoAlterar={(v) => setTipo(v[0] as TipoCadastro)}
                multiplo={false}
                variante="selecao"
                className="cadastro__tipo-chips"
                data-testid="cadastro-tipo"
              />

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
        </div>
      </Container>
    </ToastProvider>
  );

  const renderEtapaEstabelecimento = () => (
    <ToastProvider>
      <Container variante="tela-cheia" data-testid="cadastro-container">
        <div className="cadastro__wrapper">
          <header className="cadastro__header">
            <button className="cadastro__btn-voltar" onClick={handleVoltar} aria-label="Voltar">
              {ICONES.voltar}
            </button>
            <Link to="/" className="cadastro__logo" aria-label="Corte Rápido">
              <span className="cadastro__logo-icone" aria-hidden="true">✂</span>
              <span className="cadastro__logo-texto">Corte Rápido</span>
            </Link>
          </header>

          <Cartao variante="padrao" className="cadastro__card">
            <CartaoCorpo className="cadastro__corpo">
              <div className="cadastro__progresso">
                <span className={etapa >= 1 ? 'cadastro__passo cadastro__passo--ativo' : 'cadastro__passo'}>1</span>
                <span className="cadastro__passo-linha" />
                <span className={etapa >= 3 ? 'cadastro__passo cadastro__passo--ativo' : 'cadastro__passo'}>2</span>
                <span className="cadastro__passo-linha" />
                <span className="cadastro__passo">3</span>
              </div>

              <h1 className="cadastro__titulo">Dados do estabelecimento</h1>
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
        </div>
      </Container>
    </ToastProvider>
  );

  const renderEtapaDados = () => {
    const isBarbeiro = tipo === 'barbeiro';
    const isAdmin = tipo === 'admin';

    return (
      <ToastProvider>
        <Container variante="tela-cheia" data-testid="cadastro-container">
          <div className="cadastro__wrapper">
            <header className="cadastro__header">
              <button className="cadastro__btn-voltar" onClick={handleVoltar} aria-label="Voltar">
                {ICONES.voltar}
              </button>
              <Link to="/" className="cadastro__logo" aria-label="Corte Rápido">
                <span className="cadastro__logo-icone" aria-hidden="true">✂</span>
                <span className="cadastro__logo-texto">Corte Rápido</span>
              </Link>
            </header>

            <Cartao variante="padrao" className="cadastro__card">
              <CartaoCorpo className="cadastro__corpo">
                <div className="cadastro__progresso">
                  <span className="cadastro__passo cadastro__passo--ativo">1</span>
                  <span className="cadastro__passo-linha" />
                  <span className={isBarbeiro ? 'cadastro__passo cadastro__passo--ativo' : 'cadastro__passo'}>2</span>
                  <span className="cadastro__passo-linha" />
                  <span className="cadastro__passo cadastro__passo--ativo">3</span>
                </div>

                <h1 className="cadastro__titulo">Suas informações</h1>
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

                  <label className="cadastro__termos">
                    <input
                      type="checkbox"
                      checked={aceitouTermos}
                      onChange={(e) => setAceitouTermos(e.target.checked)}
                      required
                    />
                    <span>
                      Aceito os <Link to="/termos" target="_blank" rel="noopener">Termos de Uso</Link> e a <Link to="/privacidade" target="_blank" rel="noopener">Política de Privacidade</Link>
                    </span>
                  </label>

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
          </div>
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