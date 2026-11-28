/**
 * Aba Conta - Configurações de conta e segurança básica.
 */

import { useState, useCallback } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  Botao,
  CampoTexto,
  Textarea,
  ErrorState,
  Divisor,
  Modal,
  Icone,
} from '@/componentes';
import type { ConfiguracoesConta, ConfiguracoesSeguranca } from '../types';
import { validarSenha, validarExclusaoConta, validarConfiguracoesConta } from '../rules';
import './AbaConta.css';

interface AbaContaProps {
  conta: ConfiguracoesConta | null;
  seguranca: ConfiguracoesSeguranca | null;
  carregando: boolean;
  aoAtualizar: (dados: Partial<ConfiguracoesConta>) => Promise<void>;
  aoAlterarSenha: (senhaAtual: string, novaSenha: string) => Promise<void>;
  aoAtivar2FA: (metodo: 'app' | 'sms' | 'email', codigo: string) => Promise<{ secret?: string; qrCode?: string } | void>;
  aoDesativar2FA: (senha: string) => Promise<void>;
  aoExcluirConta: (senha: string, confirmacao: string) => Promise<void>;
  aoExportarDados: () => Promise<Blob>;
}

export const AbaConta = ({
  conta,
  seguranca,
  carregando,
  aoAtualizar,
  aoAlterarSenha,
  aoAtivar2FA,
  aoDesativar2FA,
  aoExcluirConta,
  aoExportarDados,
}: AbaContaProps) => {
  const [dados, setDados] = useState<Partial<ConfiguracoesConta>>({});
  const [erros, setErros] = useState<Record<string, string | null>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  // Modais
  const [mostrarModalSenha, setMostrarModalSenha] = useState(false);
  const [senhaDados, setSenhaDados] = useState({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
  const [senhaErros, setSenhaErros] = useState<Record<string, string | null>>({});
  const [senhaTouched, setSenhaTouched] = useState<Record<string, boolean>>({});

  const [mostrarModal2FA, setMostrarModal2FA] = useState<'ativar' | 'desativar' | null>(null);
  const [metodo2FA, setMetodo2FA] = useState<'app' | 'sms' | 'email'>('app');
  const [codigo2FA, setCodigo2FA] = useState('');
  const [senhaDesativar2FA, setSenhaDesativar2FA] = useState('');
  const [erro2FA, setErro2FA] = useState<string | null>(null);
  const [qrCode2FA, setQrCode2FA] = useState<string | null>(null);
  const [secret2FA, setSecret2FA] = useState<string | null>(null);

  const [mostrarModalExcluir, setMostrarModalExcluir] = useState(false);
  const [confirmacaoExcluir, setConfirmacaoExcluir] = useState('');
  const [senhaExcluir, setSenhaExcluir] = useState('');
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  const handleChange = useCallback((campo: keyof ConfiguracoesConta, valor: string) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
    const erro = validarCampoIndividual(campo, valor);
    setErros((prev) => ({ ...prev, [campo]: erro }));
  }, []);

  const validarCampoIndividual = (campo: string, valor: string): string | null => {
    switch (campo) {
      case 'nome':
        if (!valor?.trim()) return 'Nome é obrigatório';
        if (valor.trim().length < 2) return 'Nome muito curto';
        break;
      case 'email':
        if (!valor?.trim()) return 'E-mail é obrigatório';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return 'E-mail inválido';
        break;
      case 'telefone':
        if (valor && !/^\d{10,11}$/.test(valor.replace(/\D/g, ''))) return 'Telefone inválido';
        break;
    }
    return null;
  };

  const handleSalvar = useCallback(async () => {
    const erro = validarConfiguracoesConta(dados);
    if (erro) { setErroGeral(erro); return; }
    setErroGeral(null);
    try { await aoAtualizar(dados); } catch (e) { setErroGeral(e instanceof Error ? e.message : 'Erro ao salvar'); }
  }, [dados, aoAtualizar]);

  // Senha
  const handleSenhaChange = useCallback((campo: string, valor: string) => {
    setSenhaDados((prev) => ({ ...prev, [campo]: valor }));
    if (senhaTouched[campo]) {
      const erro = validarSenhaCampo(campo, valor);
      setSenhaErros((prev) => ({ ...prev, [campo]: erro }));
    }
  }, [senhaTouched]);

  const validarSenhaCampo = (campo: string, valor: string): string | null => {
    if (campo === 'novaSenha') {
      if (valor.length < 8) return 'Mínimo 8 caracteres';
      if (!/[A-Z]/.test(valor)) return 'Precisa de maiúscula';
      if (!/[a-z]/.test(valor)) return 'Precisa de minúscula';
      if (!/[0-9]/.test(valor)) return 'Precisa de número';
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(valor)) return 'Precisa de caractere especial';
    }
    if (campo === 'confirmarNovaSenha' && valor !== senhaDados.novaSenha) return 'Senhas não conferem';
    return null;
  };

  const handleSalvarSenha = useCallback(async () => {
    const erro = validarSenha(senhaDados.senhaAtual, senhaDados.novaSenha, senhaDados.confirmarNovaSenha);
    if (erro) { setSenhaErros((prev) => ({ ...prev, form: erro })); return; }
    try {
      await aoAlterarSenha(senhaDados.senhaAtual, senhaDados.novaSenha);
      setMostrarModalSenha(false);
      setSenhaDados({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
      setSenhaTouched({});
      setSenhaErros({});
    } catch (e) {
      setSenhaErros((prev) => ({ ...prev, form: e instanceof Error ? e.message : 'Erro ao alterar senha' }));
    }
  }, [senhaDados, aoAlterarSenha]);

  // 2FA
  const handleAtivar2FA = useCallback(async () => {
    setErro2FA(null);
    try {
      const res = await aoAtivar2FA(metodo2FA, codigo2FA);
      if (res) {
        if (res.secret) setSecret2FA(res.secret);
        if (res.qrCode) setQrCode2FA(res.qrCode);
      }
      if (!codigo2FA) return; // Primeiro passo - mostra QR code
      setMostrarModal2FA(null);
      setCodigo2FA('');
      setMetodo2FA('app');
    } catch (e) { setErro2FA(e instanceof Error ? e.message : 'Erro ao ativar 2FA'); }
  }, [metodo2FA, codigo2FA, aoAtivar2FA]);

  const handleDesativar2FA = useCallback(async () => {
    setErro2FA(null);
    const erro = validarSenha(senhaDesativar2FA, '', ''); // Valida só se tem senha
    if (erro && erro !== 'Nova senha é obrigatória' && erro !== 'As senhas não conferem') { setErro2FA(erro); return; }
    try { await aoDesativar2FA(senhaDesativar2FA); setMostrarModal2FA(null); setSenhaDesativar2FA(''); } catch (e) { setErro2FA(e instanceof Error ? e.message : 'Erro ao desativar 2FA'); }
  }, [senhaDesativar2FA, aoDesativar2FA]);

  // Excluir conta
  const handleExcluirConta = useCallback(async () => {
    const erro = validarExclusaoConta(senhaExcluir, confirmacaoExcluir);
    if (erro) { setErroExcluir(erro); return; }
    try { await aoExcluirConta(senhaExcluir, confirmacaoExcluir); } catch (e) { setErroExcluir(e instanceof Error ? e.message : 'Erro ao excluir conta'); }
  }, [senhaExcluir, confirmacaoExcluir, aoExcluirConta]);

  // Exportar dados
  const handleExportar = useCallback(async () => {
    try {
      const blob = await aoExportarDados();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dados-corte-rapido-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao exportar dados'); }
  }, [aoExportarDados]);

  if (!conta) return null;

  return (
    <div className="aba-conta" data-testid="aba-conta">
      {/* Dados pessoais */}
      <Cartao className="aba-conta__cartao">
        <CartaoCabecalho>
          <h3>Dados pessoais</h3>
        </CartaoCabecalho>
        <CartaoCorpo>
          {erroGeral && <ErrorState titulo="Erro" mensagem={erroGeral} aoTentarNovamente={() => setErroGeral(null)} data-testid="erro-dados" />}
          <div className="aba-conta__grid">
            <CampoTexto label="Nome completo *" valor={dados.nome || conta.nome} aoAlterar={(valor) => handleChange('nome', valor.trim())} erro={erros.nome || undefined} placeholder="Seu nome" inputMode="text" autoComplete="name" obrigatorio desabilitado={carregando} data-testid="input-nome" />
            <CampoTexto label="E-mail *" valor={dados.email || conta.email} aoAlterar={(valor) => handleChange('email', valor.trim().toLowerCase())} erro={erros.email || undefined} placeholder="seu@email.com" tipo="email" inputMode="email" autoComplete="email" obrigatorio desabilitado={carregando} data-testid="input-email" />
            <CampoTexto label="Telefone" valor={dados.telefone || conta.telefone || ''} aoAlterar={(valor) => handleChange('telefone', valor.replace(/\D/g, '').slice(0, 11))} erro={erros.telefone || undefined} placeholder="(11) 99999-9999" inputMode="tel" autoComplete="tel" desabilitado={carregando} data-testid="input-telefone" />
            <Textarea label="Bio" valor={dados.bio || conta.bio || ''} aoAlterar={(valor) => handleChange('bio', valor.trim())} erro={erros.bio || undefined} placeholder="Conte sobre você..." linhas={3} desabilitado={carregando} data-testid="input-bio" />
          </div>
          <div className="aba-conta__acoes">
            <Botao aoClicar={handleSalvar} variante="primario" carregando={carregando} data-testid="btn-salvar-dados">Salvar alterações</Botao>
          </div>
        </CartaoCorpo>
      </Cartao>

      <Divisor className="aba-conta__divisor" />

      {/* Segurança */}
      <Cartao className="aba-conta__cartao">
        <CartaoCabecalho>
          <h3>Segurança</h3>
          <p>Senha, autenticação de dois fatores e sessões</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-conta__seguranca-item">
            <div className="aba-conta__seguranca-info">
              <h4>Senha</h4>
              <p>Alterar sua senha de acesso</p>
            </div>
            <Botao aoClicar={() => setMostrarModalSenha(true)} variante="secundario" iconeEsquerda={<Icone nome="cadeado" />} desabilitado={carregando} data-testid="btn-alterar-senha">Alterar senha</Botao>
          </div>

          <Divisor />

          <div className="aba-conta__seguranca-item">
            <div className="aba-conta__seguranca-info">
              <h4>Autenticação de dois fatores (2FA)</h4>
              <p>{seguranca?.doisFatoresAtivo ? 'Ativo - Adiciona uma camada extra de segurança' : 'Inativo - Ative para maior proteção'}</p>
            </div>
            {seguranca?.doisFatoresAtivo ? (
              <Botao aoClicar={() => { setMostrarModal2FA('desativar'); setErro2FA(null); setSenhaDesativar2FA(''); }} variante="perigo" iconeEsquerda={<Icone nome="cadeado" />} desabilitado={carregando} data-testid="btn-desativar-2fa">Desativar 2FA</Botao>
            ) : (
              <Botao aoClicar={() => { setMostrarModal2FA('ativar'); setErro2FA(null); setCodigo2FA(''); setQrCode2FA(null); setSecret2FA(null); }} variante="primario" iconeEsquerda={<Icone nome="cadeado" />} desabilitado={carregando} data-testid="btn-ativar-2fa">Ativar 2FA</Botao>
            )}
          </div>
        </CartaoCorpo>
      </Cartao>

      <Divisor className="aba-conta__divisor" />

      {/* Dados e privacidade */}
      <Cartao className="aba-conta__cartao">
        <CartaoCabecalho>
          <h3>Seus dados</h3>
          <p>Exporte seus dados ou exclua sua conta permanentemente</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-conta__dados-item">
            <div className="aba-conta__dados-info">
              <h4>Exportar dados</h4>
              <p>Baixe uma cópia de todos os seus dados em formato JSON</p>
            </div>
            <Botao aoClicar={handleExportar} variante="secundario" iconeEsquerda={<Icone nome="salvar" />} desabilitado={carregando} data-testid="btn-exportar">Exportar dados</Botao>
          </div>

          <Divisor />

          <div className="aba-conta__dados-item aba-conta__dados-item--perigo">
            <div className="aba-conta__dados-info">
              <h4>Excluir conta</h4>
              <p>Exclusão permanente e irreversível de todos os seus dados</p>
            </div>
            <Botao aoClicar={() => { setMostrarModalExcluir(true); setErroExcluir(null); setConfirmacaoExcluir(''); setSenhaExcluir(''); }} variante="perigo" iconeEsquerda={<Icone nome="lixeira" />} desabilitado={carregando} data-testid="btn-excluir-conta">Excluir minha conta</Botao>
          </div>
        </CartaoCorpo>
      </Cartao>

      {/* Modal Senha */}
      <Modal aberto={mostrarModalSenha} aoFechar={() => { setMostrarModalSenha(false); setSenhaDados({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' }); setSenhaTouched({}); setSenhaErros({}); }} titulo="Alterar senha" tamanho="medio" className="aba-conta__modal" data-testid="modal-senha">
        <form onSubmit={(e) => { e.preventDefault(); handleSalvarSenha(); }} noValidate>
          {senhaErros.form && <ErrorState titulo="Erro" mensagem={senhaErros.form} data-testid="erro-senha-form" />}
          <CampoTexto label="Senha atual *" tipo="password" valor={senhaDados.senhaAtual} aoAlterar={(valor) => handleSenhaChange('senhaAtual', valor)} erro={senhaTouched.senhaAtual ? (senhaErros.senhaAtual || undefined) : undefined} placeholder="Sua senha atual" autoComplete="current-password" obrigatorio data-testid="input-senha-atual" />
          <CampoTexto label="Nova senha *" tipo="password" valor={senhaDados.novaSenha} aoAlterar={(valor) => handleSenhaChange('novaSenha', valor)} erro={senhaTouched.novaSenha ? (senhaErros.novaSenha || undefined) : undefined} placeholder="Mínimo 8 caracteres" autoComplete="new-password" obrigatorio data-testid="input-nova-senha" />
          <CampoTexto label="Confirmar nova senha *" tipo="password" valor={senhaDados.confirmarNovaSenha} aoAlterar={(valor) => handleSenhaChange('confirmarNovaSenha', valor)} erro={senhaTouched.confirmarNovaSenha ? (senhaErros.confirmarNovaSenha || undefined) : undefined} placeholder="Repita a nova senha" autoComplete="new-password" obrigatorio data-testid="input-confirmar-senha" />
          <div className="aba-conta__modal-acoes">
            <Botao tipo="button" aoClicar={() => setMostrarModalSenha(false)} variante="secundario" data-testid="btn-cancelar-senha">Cancelar</Botao>
            <Botao tipo="submit" variante="primario" data-testid="btn-salvar-senha">Alterar senha</Botao>
          </div>
        </form>
      </Modal>

      {/* Modal 2FA */}
      <Modal aberto={!!mostrarModal2FA} aoFechar={() => { setMostrarModal2FA(null); setCodigo2FA(''); setErro2FA(null); setQrCode2FA(null); setSecret2FA(null); }} titulo={mostrarModal2FA === 'ativar' ? (codigo2FA ? 'Confirmar 2FA' : 'Ativar 2FA') : 'Desativar 2FA'} tamanho="medio" className="aba-conta__modal" data-testid="modal-2fa">
        {mostrarModal2FA === 'ativar' ? (
          <>
            {!codigo2FA ? (
              <>
                <p className="aba-conta__2fa-info">Escolha o método e escaneie o QR code com seu app autenticador:</p>
                <div className="aba-conta__2fa-metodos">
                  {(['app', 'sms', 'email'] as const).map((m) => (
                    <label key={m} className={`aba-conta__2fa-metodo ${metodo2FA === m ? 'selecionado' : ''}`} onClick={() => setMetodo2FA(m)}>
                      <input type="radio" name="metodo2fa" value={m} checked={metodo2FA === m} onChange={() => setMetodo2FA(m)} />
                      <span>{m === 'app' ? 'App autenticador' : m === 'sms' ? 'SMS' : 'E-mail'}</span>
                    </label>
                  ))}
                </div>
                {qrCode2FA && (
                  <div className="aba-conta__2fa-qrcode">
                    <img src={qrCode2FA} alt="QR Code para 2FA" />
                    <p className="aba-conta__2fa-secret">Chave: <code>{secret2FA}</code></p>
                  </div>
                )}
                <CampoTexto label="Código de verificação *" valor={codigo2FA} aoAlterar={(valor) => setCodigo2FA(valor.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" maxLength={6} obrigatorio autoComplete="one-time-code" data-testid="input-codigo-2fa" />
              </>
            ) : (
              <p>Digite o código do seu app autenticador para confirmar.</p>
            )}
            {erro2FA && <ErrorState titulo="Erro" mensagem={erro2FA} data-testid="erro-2fa" />}
            <div className="aba-conta__modal-acoes">
              <Botao tipo="button" aoClicar={() => setMostrarModal2FA(null)} variante="secundario" data-testid="btn-cancelar-2fa">Cancelar</Botao>
              <Botao tipo="button" aoClicar={handleAtivar2FA} variante="primario" carregando={carregando} data-testid="btn-confirmar-2fa">{codigo2FA ? 'Confirmar' : 'Próximo'}</Botao>
            </div>
          </>
        ) : (
          <>
            <p className="aba-conta__2fa-info">Digite sua senha para confirmar a desativação do 2FA:</p>
            <CampoTexto label="Senha *" tipo="password" valor={senhaDesativar2FA} aoAlterar={(valor) => setSenhaDesativar2FA(valor)} placeholder="Sua senha" autoComplete="current-password" obrigatorio data-testid="input-senha-desativar-2fa" />
            {erro2FA && <ErrorState titulo="Erro" mensagem={erro2FA} data-testid="erro-desativar-2fa" />}
            <div className="aba-conta__modal-acoes">
              <Botao tipo="button" aoClicar={() => setMostrarModal2FA(null)} variante="secundario" data-testid="btn-cancelar-desativar-2fa">Cancelar</Botao>
              <Botao tipo="button" aoClicar={handleDesativar2FA} variante="perigo" carregando={carregando} data-testid="btn-confirmar-desativar-2fa">Desativar 2FA</Botao>
            </div>
          </>
        )}
      </Modal>

      {/* Modal Excluir Conta */}
      <Modal aberto={mostrarModalExcluir} aoFechar={() => { setMostrarModalExcluir(false); setConfirmacaoExcluir(''); setSenhaExcluir(''); setErroExcluir(null); }} titulo="Excluir minha conta" tamanho="medio" className="aba-conta__modal aba-conta__modal--perigo" data-testid="modal-excluir">
        <div className="aba-conta__excluir-aviso">
          <Icone nome="alerta" tamanho={32} className="aba-conta__excluir-icone" />
          <h3>Esta ação é irreversível</h3>
          <p>Todos os seus dados, agendamentos, histórico e configurações serão permanentemente excluídos.</p>
        </div>
        <CampoTexto label='Digite "EXCLUIR MINHA CONTA" para confirmar *' valor={confirmacaoExcluir} aoAlterar={(valor) => setConfirmacaoExcluir(valor)} placeholder="EXCLUIR MINHA CONTA" obrigatorio data-testid="input-confirmacao-excluir" />
        <CampoTexto label="Senha *" tipo="password" valor={senhaExcluir} aoAlterar={(valor) => setSenhaExcluir(valor)} placeholder="Sua senha" autoComplete="current-password" obrigatorio data-testid="input-senha-excluir" />
        {erroExcluir && <ErrorState titulo="Erro" mensagem={erroExcluir} data-testid="erro-excluir" />}
        <div className="aba-conta__modal-acoes">
          <Botao tipo="button" aoClicar={() => setMostrarModalExcluir(false)} variante="secundario" data-testid="btn-cancelar-excluir">Cancelar</Botao>
          <Botao tipo="button" aoClicar={handleExcluirConta} variante="perigo" carregando={carregando} data-testid="btn-confirmar-excluir">Excluir permanentemente</Botao>
        </div>
      </Modal>
    </div>
  );
};

export default AbaConta;