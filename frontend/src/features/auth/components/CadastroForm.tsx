/**
 * Componente CadastroForm - Formulário multi-etapa de cadastro.
 * Puro, coeso, < 150 linhas por etapa, preserva 100% visual escuro atual.
 */

import { useState, useCallback, useMemo, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
import type { TipoCadastro, CadastroInput, CadastroEtapa } from '../types';
import { validarEtapaCadastro, temErros, obterPrimeiroErro, normalizarTelefone, normalizarCPF } from '../rules';
import { NICHOS_SELECT } from './CadastroForm.constantes';
import './CadastroForm.css';

export interface CadastroFormProps {
  /** Callback opcional ao cadastrar com sucesso */
  onSucesso?: (tipo: TipoCadastro) => void;
  /** Classe customizada */
  className?: string;
}

export const CadastroForm = ({
  onSucesso,
  className = '',
}: CadastroFormProps) => {
  const navigate = useNavigate();
  const { cadastrar } = useAuth();
  const { sucesso } = useGlobalToast();

  const [tipo, setTipo] = useState<TipoCadastro | null>(null);
  const [etapa, setEtapa] = useState<CadastroEtapa>(1);
  const [dados, setDados] = useState<Partial<CadastroInput>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);

  // Validação da etapa atual
  const errosValidacao = useMemo(() =>
    validarEtapaCadastro(etapa, tipo, dados, aceitouTermos),
    [etapa, tipo, dados, aceitouTermos]
  );

  const atualizarDado = useCallback((campo: keyof CadastroInput, valor: string) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
    if (erro) setErro('');
  }, [erro]);

  const handleAvancar = useCallback(() => {
    if (temErros(errosValidacao)) {
      setErro(obterPrimeiroErro(errosValidacao) || 'Erro de validação');
      return;
    }

    if (etapa === 1) {
      setEtapa(tipo === 'barbeiro' ? 3 : 4);
    } else if (etapa === 3) {
      setEtapa(4);
    }
  }, [etapa, tipo, dados, aceitouTermos]);

  const handleVoltar = useCallback(() => {
    setEtapa((prev) => (prev > 1 ? (prev - 1) as CadastroEtapa : 1));
    setErro('');
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validacao = validarEtapaCadastro(etapa, tipo, dados, aceitouTermos);
    if (temErros(validacao)) {
      setErro(obterPrimeiroErro(validacao) || 'Erro de validação');
      return;
    }

    setCarregando(true);
    setErro('');

    try {
      // Prepara dados para API
      const dadosApi = {
        ...dados,
        telefone: normalizarTelefone(dados.telefone || ''),
        cpf: dados.cpf ? normalizarCPF(dados.cpf) : undefined,
      } as CadastroInput;

      const resultado = await cadastrar(dadosApi);

      if (resultado.sucesso) {
        sucesso('Conta criada com sucesso! Bem-vindo ao Corte Rápido.');
        onSucesso?.(tipo!);

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
  }, [etapa, tipo, dados, aceitouTermos, cadastrar, navigate, sucesso, onSucesso]);

  // Renderiza etapa 1: seleção de tipo
  const renderEtapaTipo = () => (
    <ToastProvider>
      <Container variante="tela-cheia" data-testid="cadastro-container" className={className}>
        <main className="cadastro__main">
          <header className="cadastro__header">
            <Link to="/" className="cadastro__logo" aria-label="Corte Rápido">
              <span className="cadastro__logo-icone" aria-hidden="true">
                <Icone nome="tesoura" tamanho={28} />
              </span>
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
                    selecionados={tipo ? [tipo] : []}
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
                  desabilitado={carregando || !tipo}
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

  // Renderiza etapa 3: dados do estabelecimento (barbeiro)
  const renderEtapaEstabelecimento = () => (
    <ToastProvider>
      <Container variante="tela-cheia" data-testid="cadastro-container" className={className}>
        <main className="cadastro__main">
          <header className="cadastro__header">
            <button className="cadastro__btn-voltar" onClick={handleVoltar} aria-label="Voltar">
              <Icone nome="voltar" tamanho={20} />
            </button>
            <Link to="/" className="cadastro__logo" aria-label="Corte Rápido">
              <span className="cadastro__logo-icone" aria-hidden="true">
                <Icone nome="tesoura" tamanho={28} />
              </span>
              <span className="cadastro__logo-texto">Corte Rápido</span>
            </Link>
          </header>

          <section className="cadastro__card-section" aria-labelledby="cadastro-titulo-estab">
            <Cartao variante="padrao" className="cadastro__card">
              <CartaoCorpo className="cadastro__corpo">
                <nav className="cadastro__progresso" aria-label="Progresso do cadastro">
                  <ol>
                    <li className="cadastro__passo cadastro__passo--ativo"><span>1</span></li>
                    <li className="cadastro__passo-linha" aria-hidden="true" />
                    <li className="cadastro__passo cadastro__passo--ativo"><span>2</span></li>
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
                    opcoes={[...NICHOS_SELECT]}
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

  // Renderiza etapa 2/4: dados pessoais
  const renderEtapaDados = () => {
    const isBarbeiro = tipo === 'barbeiro';
    const isAdmin = tipo === 'admin';
    const showProgress = etapa > 1;

    return (
      <ToastProvider>
        <Container variante="tela-cheia" data-testid="cadastro-container" className={className}>
          <main className="cadastro__main">
            <header className="cadastro__header">
              {showProgress && (
                <button className="cadastro__btn-voltar" onClick={handleVoltar} aria-label="Voltar">
                  <Icone nome="voltar" tamanho={20} />
                </button>
              )}
              <Link to="/" className="cadastro__logo" aria-label="Corte Rápido">
                <span className="cadastro__logo-icone" aria-hidden="true">
                  <Icone nome="tesoura" tamanho={28} />
                </span>
                <span className="cadastro__logo-texto">Corte Rápido</span>
              </Link>
            </header>

            <section className="cadastro__card-section" aria-labelledby="cadastro-titulo-dados">
              <Cartao variante="padrao" className="cadastro__card">
                <CartaoCorpo className="cadastro__corpo">
                  {showProgress && (
                    <nav className="cadastro__progresso" aria-label="Progresso do cadastro">
                      <ol>
                        <li className="cadastro__passo cadastro__passo--ativo"><span>1</span></li>
                        <li className="cadastro__passo-linha" aria-hidden="true" />
                        <li className={isBarbeiro ? 'cadastro__passo cadastro__passo--ativo' : 'cadastro__passo'}><span>2</span></li>
                        <li className="cadastro__passo-linha" aria-hidden="true" />
                        <li className="cadastro__passo cadastro__passo--ativo"><span>3</span></li>
                      </ol>
                    </nav>
                  )}

                  <h1 id="cadastro-titulo-dados" className="cadastro__titulo">Suas informações</h1>
                  <p className="cadastro__subtitulo">Preencha para criar sua conta</p>

                  <form onSubmit={handleSubmit} className="cadastro__form" noValidate>
                    <CampoTexto
                      label="Nome completo"
                      valor={dados.nome || ''}
                      aoAlterar={(v) => atualizarDado('nome', v)}
                      placeholder="Seu nome"
                      autoComplete="name"
                      obrigatorio
                      data-testid="cadastro-nome"
                    />

                    <CampoTexto
                      label="E-mail"
                      tipo="email"
                      valor={dados.email || ''}
                      aoAlterar={(v) => atualizarDado('email', v)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      autoCapitalize="off"
                      autoCorrect="off"
                      inputMode="email"
                      obrigatorio
                      data-testid="cadastro-email"
                    />

                    <CampoSenha
                      label="Senha"
                      valor={dados.senha || ''}
                      aoAlterar={(v) => atualizarDado('senha', v)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      obrigatorio
                      ajuda="Mínimo 6 caracteres"
                      data-testid="cadastro-senha"
                    />

                    <CampoSenha
                      label="Confirmar senha"
                      valor={dados.confirmarSenha || ''}
                      aoAlterar={(v) => atualizarDado('confirmarSenha', v)}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      obrigatorio
                      data-testid="cadastro-confirmar-senha"
                    />

                    <CampoWhatsapp
                      label="WhatsApp"
                      valor={dados.telefone || ''}
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
                      {showProgress && <BotaoSecundario aoClicar={handleVoltar} desabilitado={carregando}>Voltar</BotaoSecundario>}
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

  // Render condicional por etapa
  if (etapa === 1) {
    return renderEtapaTipo();
  }

  if (etapa === 3 && tipo === 'barbeiro') {
    return renderEtapaEstabelecimento();
  }

  return renderEtapaDados();
};

export default CadastroForm;