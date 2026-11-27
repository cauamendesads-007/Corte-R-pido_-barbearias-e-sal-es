/**
 * Aba Segurança - Sessões ativas, dispositivos confiáveis, 2FA, histórico de senha.
 */

import { useState, useCallback } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  Divisor,
  Botao,
  Modal,
  CampoTexto,
  ErrorState,
  CheckboxToggle,
} from '@/componentes';
import type { ConfiguracoesSeguranca } from '../types';
import { formatarDataRelativa } from '../rules';
import './AbaSeguranca.css';

interface AbaSegurancaProps {
  seguranca: ConfiguracoesSeguranca | null;
  carregando: boolean;
  aoAtualizar: (dados: Partial<ConfiguracoesSeguranca>) => Promise<void>;
  aoRevogarSessao: (sessaoId: string) => Promise<void>;
  aoRevogarTodasSessoes: () => Promise<void>;
  aoRemoverDispositivo: (dispositivoId: string) => Promise<void>;
  aoAlterarSenha: (senhaAtual: string, novaSenha: string) => Promise<void>;
  aoAtivar2FA: (metodo: 'app' | 'sms' | 'email', codigo: string) => Promise<{ secret?: string; qrCode?: string } | void>;
  aoDesativar2FA: (senha: string) => Promise<void>;
}

export const AbaSeguranca = ({
  seguranca,
  carregando,
  aoAtualizar,
  aoRevogarSessao,
  aoRevogarTodasSessoes,
  aoRemoverDispositivo,
  aoAlterarSenha,
  aoAtivar2FA,
  aoDesativar2FA,
}: AbaSegurancaProps) => {
  const [modalAlterarSenha, setModalAlterarSenha] = useState(false);
  const [modal2FA, setModal2FA] = useState<{ tipo: 'ativar' | 'desativar'; metodo?: 'app' | 'sms' | 'email' } | null>(null);
  const [senhaForm, setSenhaForm] = useState({ atual: '', nova: '', confirmar: '' });
  const [codigo2FA, setCodigo2FA] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [erro2FA, setErro2FA] = useState('');

  const handleChange = useCallback(<K extends keyof ConfiguracoesSeguranca>(campo: K, valor: ConfiguracoesSeguranca[K]) => {
    aoAtualizar({ [campo]: valor });
  }, [aoAtualizar]);

  const handleSenhaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroSenha('');
    if (senhaForm.nova !== senhaForm.confirmar) {
      setErroSenha('As senhas não coincidem');
      return;
    }
    if (senhaForm.nova.length < 8) {
      setErroSenha('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }
    try {
      await aoAlterarSenha(senhaForm.atual, senhaForm.nova);
      setModalAlterarSenha(false);
      setSenhaForm({ atual: '', nova: '', confirmar: '' });
    } catch (err) {
      setErroSenha(err instanceof Error ? err.message : 'Erro ao alterar senha');
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro2FA('');
    if (!modal2FA) return;
    try {
      if (modal2FA.tipo === 'ativar' && modal2FA.metodo) {
        await aoAtivar2FA(modal2FA.metodo, codigo2FA);
      } else if (modal2FA.tipo === 'desativar') {
        await aoDesativar2FA(codigo2FA);
      }
      setModal2FA(null);
      setCodigo2FA('');
    } catch (err) {
      setErro2FA(err instanceof Error ? err.message : 'Erro ao configurar 2FA');
    }
  };

  if (!seguranca) return null;

  const sessoesOrdenadas = [...seguranca.sessoesAtivas].sort((a, b) =>
    a.atual ? -1 : b.atual ? 1 : new Date(b.ultimaAtividade).getTime() - new Date(a.ultimaAtividade).getTime()
  );

  const getMetodo2FALabel = (metodo: string): string => {
    switch (metodo) {
      case 'app': return 'App Authenticator';
      case 'sms': return 'SMS';
      case 'email': return 'E-mail';
      default: return metodo;
    }
  };

  return (
    <div className="aba-seguranca" data-testid="aba-seguranca">
      {/* Autenticação de dois fatores */}
      <Cartao className="aba-seguranca__cartao">
        <CartaoCabecalho>
          <h3>Autenticação de dois fatores (2FA)</h3>
          <p>{seguranca.doisFatoresAtivo
            ? 'Sua conta tem uma camada extra de proteção'
            : 'Adicione uma camada extra de segurança à sua conta'}</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          {seguranca.doisFatoresAtivo ? (
            <div className="aba-seguranca__2fa-ativo">
              <div className="aba-seguranca__2fa-status">
                <span className="aba-seguranca__2fa-badge">Ativado</span>
                <p className="aba-seguranca__2fa-metodo">
                  Método: <strong>{getMetodo2FALabel(seguranca.doisFatoresMetodo)}</strong>
                </p>
                <p className="aba-seguranca__2fa-atualizado">
                  Última atualização: {formatarDataRelativa(seguranca.senhaAtualizadaEm)}
                </p>
              </div>
              <div className="aba-seguranca__2fa-acoes">
                <Botao
                  variante="secundario"
                  aoClicar={() => setModal2FA({ tipo: 'desativar' })}
                  desabilitado={carregando}
                  data-testid="btn-desativar-2fa"
                >
                  Desativar 2FA
                </Botao>
              </div>
            </div>
          ) : (
            <div className="aba-seguranca__2fa-inativo">
              <p className="aba-seguranca__2fa-info">
                A autenticação de dois fatores adiciona uma camada extra de segurança.
                Você precisará inserir um código além da senha ao fazer login.
              </p>
              <div className="aba-seguranca__2fa-metodos">
                <Botao
                  variante="primario"
                  aoClicar={() => setModal2FA({ tipo: 'ativar', metodo: 'app' })}
                  desabilitado={carregando}
                  data-testid="btn-ativar-2fa-authenticator"
                >
                  App Authenticator (recomendado)
                </Botao>
                <Botao
                  variante="secundario"
                  aoClicar={() => setModal2FA({ tipo: 'ativar', metodo: 'sms' })}
                  desabilitado={carregando}
                  data-testid="btn-ativar-2fa-sms"
                >
                  SMS
                </Botao>
                <Botao
                  variante="secundario"
                  aoClicar={() => setModal2FA({ tipo: 'ativar', metodo: 'email' })}
                  desabilitado={carregando}
                  data-testid="btn-ativar-2fa-email"
                >
                  E-mail
                </Botao>
              </div>
            </div>
          )}
        </CartaoCorpo>
      </Cartao>

      <Divisor />

      {/* Alterar senha */}
      <Cartao className="aba-seguranca__cartao">
        <CartaoCabecalho>
          <h3>Alterar senha</h3>
          <p>Atualize sua senha periodicamente para manter a conta segura</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-seguranca__senha-info">
            <p>Última alteração: <strong>{formatarDataRelativa(seguranca.senhaAtualizadaEm)}</strong></p>
          </div>
          <Botao
            variante="primario"
            aoClicar={() => setModalAlterarSenha(true)}
            desabilitado={carregando}
            data-testid="btn-alterar-senha"
          >
            Alterar senha
          </Botao>
        </CartaoCorpo>
      </Cartao>

      <Divisor />

      {/* Sessões ativas */}
      <Cartao className="aba-seguranca__cartao">
        <CartaoCabecalho>
          <h3>Sessões ativas</h3>
          <p>Gerencie onde sua conta está logada</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          {sessoesOrdenadas.length === 0 ? (
            <p className="aba-seguranca__vazio">Nenhuma sessão ativa encontrada.</p>
          ) : (
            <>
              <div className="aba-seguranca__sessoes-lista">
                {sessoesOrdenadas.map((sessao) => (
                  <div
                    key={sessao.id}
                    className={`aba-seguranca__sessao-item ${sessao.atual ? 'aba-seguranca__sessao-item--atual' : ''}`}
                    data-testid={`sessao-${sessao.id}`}
                  >
                    <div className="aba-seguranca__sessao-info">
                      <div className="aba-seguranca__sessao-cabecalho">
                        <h4>{sessao.dispositivo}</h4>
                        {sessao.atual && <span className="aba-seguranca__badge-atual">Sessão atual</span>}
                      </div>
                      <p className="aba-seguranca__sessao-detalhes">
                        {sessao.navegador} • {sessao.sistemaOperacional} • {sessao.ip}
                      </p>
                      <p className="aba-seguranca__sessao-localizacao">
                        {sessao.localizacao || 'Localização desconhecida'} • Última atividade: {formatarDataRelativa(sessao.ultimaAtividade)}
                      </p>
                    </div>
                    {!sessao.atual && (
                      <Botao
                        variante="perigo"
                        tamanho="pequeno"
                        aoClicar={() => aoRevogarSessao(sessao.id)}
                        desabilitado={carregando}
                        data-testid={`btn-revogar-sessao-${sessao.id}`}
                      >
                        Revogar
                      </Botao>
                    )}
                  </div>
                ))}
              </div>
              {sessoesOrdenadas.filter(s => !s.atual).length > 0 && (
                <div className="aba-seguranca__sessoes-acoes">
                  <Botao
                    variante="perigo"
                    aoClicar={aoRevogarTodasSessoes}
                    desabilitado={carregando}
                    data-testid="btn-revogar-todas-sessoes"
                  >
                    Revogar todas as outras sessões
                  </Botao>
                </div>
              )}
            </>
          )}
        </CartaoCorpo>
      </Cartao>

      <Divisor />

      {/* Dispositivos confiáveis */}
      <Cartao className="aba-seguranca__cartao">
        <CartaoCabecalho>
          <h3>Dispositivos confiáveis</h3>
          <p>Dispositivos que não precisam de 2FA ao fazer login</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          {seguranca.dispositivosConfiaveis.length === 0 ? (
            <p className="aba-seguranca__vazio">Nenhum dispositivo confiável cadastrado.</p>
          ) : (
            <div className="aba-seguranca__dispositivos-lista">
              {seguranca.dispositivosConfiaveis.map((dispositivo) => (
                <div
                  key={dispositivo.id}
                  className="aba-seguranca__dispositivo-item"
                  data-testid={`dispositivo-${dispositivo.id}`}
                >
                  <div className="aba-seguranca__dispositivo-info">
                    <h4>{dispositivo.nome}</h4>
                    <p className="aba-seguranca__dispositivo-detalhes">
                      {dispositivo.tipo === 'mobile' ? '📱' : dispositivo.tipo === 'tablet' ? '📟' : '💻'} {dispositivo.tipo}
                    </p>
                    <p className="aba-seguranca__dispositivo-datas">
                      Adicionado: {formatarDataRelativa(dispositivo.criadoEm)} •
                      Último uso: {formatarDataRelativa(dispositivo.ultimoAcesso)}
                    </p>
                  </div>
                  <Botao
                    variante="perigo"
                    tamanho="pequeno"
                    aoClicar={() => aoRemoverDispositivo(dispositivo.id)}
                    desabilitado={carregando}
                    data-testid={`btn-remover-dispositivo-${dispositivo.id}`}
                  >
                    Remover
                  </Botao>
                </div>
              ))}
            </div>
          )}
        </CartaoCorpo>
      </Cartao>

      <Divisor />

      {/* Alertas de segurança */}
      <Cartao className="aba-seguranca__cartao">
        <CartaoCabecalho>
          <h3>Alertas de segurança</h3>
          <p>Configure quando deseja ser notificado sobre atividades de segurança</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-seguranca__switches">
            <CheckboxToggle
              rotulo="Alertas de login"
              descricao="Receber notificação quando houver novo login na conta"
              verificado={seguranca.alertasLogin}
              aoAlterar={(v) => handleChange('alertasLogin', v)}
              desabilitado={carregando}
              data-testid="switch-alertas-login"
            />
            <CheckboxToggle
              rotulo="Alertas de novos dispositivos"
              descricao="Notificar quando um novo dispositivo acessar a conta"
              verificado={seguranca.alertasNovosDispositivos}
              aoAlterar={(v) => handleChange('alertasNovosDispositivos', v)}
              desabilitado={carregando}
              data-testid="switch-alertas-novos-dispositivos"
            />
          </div>
        </CartaoCorpo>
      </Cartao>

      <Divisor />

      {/* Proteção contra força bruta */}
      <Cartao className="aba-seguranca__cartao">
        <CartaoCabecalho>
          <h3>Proteção contra força bruta</h3>
          <p>Configure limites de tentativas de login</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-seguranca__grid">
            <CampoTexto
              label="Bloquear após (tentativas)"
              tipo="number"
              valor={String(seguranca.bloquearAposTentativas)}
              aoAlterar={(valor) => handleChange('bloquearAposTentativas', Number(valor))}
              min={3}
              max={20}
              desabilitado={carregando}
              data-testid="input-bloquear-tentativas"
            />
            <CampoTexto
              label="Tempo de bloqueio (minutos)"
              tipo="number"
              valor={String(seguranca.tempoBloqueio)}
              aoAlterar={(valor) => handleChange('tempoBloqueio', Number(valor))}
              min={5}
              max={1440}
              desabilitado={carregando}
              data-testid="input-tempo-bloqueio"
            />
          </div>
        </CartaoCorpo>
      </Cartao>

      {/* Modal Alterar Senha */}
      <Modal
        aberto={modalAlterarSenha}
        aoFechar={() => setModalAlterarSenha(false)}
        titulo="Alterar senha"
        tamanho="medio"
        data-testid="modal-alterar-senha"
      >
        <form onSubmit={handleSenhaSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espaco-4)' }}>
            <CampoTexto
              label="Senha atual"
              tipo="password"
              valor={senhaForm.atual}
              aoAlterar={(valor) => setSenhaForm({ ...senhaForm, atual: valor })}
              autoComplete="current-password"
              obrigatorio
              desabilitado={carregando}
              data-testid="input-senha-atual"
            />
            <CampoTexto
              label="Nova senha"
              tipo="password"
              valor={senhaForm.nova}
              aoAlterar={(valor) => setSenhaForm({ ...senhaForm, nova: valor })}
              autoComplete="new-password"
              obrigatorio
              desabilitado={carregando}
              data-testid="input-nova-senha"
            />
            <CampoTexto
              label="Confirmar nova senha"
              tipo="password"
              valor={senhaForm.confirmar}
              aoAlterar={(valor) => setSenhaForm({ ...senhaForm, confirmar: valor })}
              autoComplete="new-password"
              obrigatorio
              desabilitado={carregando}
              data-testid="input-confirmar-senha"
            />
            {erroSenha && <ErrorState titulo="Erro ao alterar senha" mensagem={erroSenha} data-testid="alerta-erro-senha" />}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--espaco-3)', marginTop: 'var(--espaco-2)' }}>
              <Botao tipo="button" variante="secundario" aoClicar={() => setModalAlterarSenha(false)} desabilitado={carregando}>
                Cancelar
              </Botao>
              <Botao tipo="submit" variante="primario" desabilitado={carregando}>
                Salvar
              </Botao>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal 2FA */}
      <Modal
        aberto={!!modal2FA}
        aoFechar={() => { setModal2FA(null); setCodigo2FA(''); setErro2FA(''); }}
        titulo={modal2FA?.tipo === 'ativar' ? 'Ativar 2FA' : 'Desativar 2FA'}
        tamanho="medio"
        data-testid="modal-2fa"
      >
        {modal2FA?.tipo === 'ativar' && modal2FA.metodo === 'app' && (
          <div className="aba-seguranca__2fa-setup">
            <p>Escaneie o QR code com seu app authenticator (Google Authenticator, Authy, 1Password, etc.)</p>
            <div className="aba-seguranca__2fa-qrcode">
              <div className="aba-seguranca__2fa-qrcode-placeholder">QR Code</div>
              <p className="aba-seguranca__2fa-secret">
                Ou insira manualmente: <code>JBSWY3DPEHPK3PXP</code>
              </p>
            </div>
            <form onSubmit={handle2FASubmit}>
              <CampoTexto
                label="Código de 6 dígitos"
                tipo="text"
                valor={codigo2FA}
                aoAlterar={(valor) => setCodigo2FA(valor)}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                obrigatorio
                desabilitado={carregando}
                data-testid="input-codigo-2fa"
              />
              {erro2FA && <ErrorState titulo="Erro" mensagem={erro2FA} data-testid="alerta-erro-2fa" />}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--espaco-3)', marginTop: 'var(--espaco-2)' }}>
                <Botao tipo="button" variante="secundario" aoClicar={() => { setModal2FA(null); setCodigo2FA(''); }} desabilitado={carregando}>
                  Cancelar
                </Botao>
                <Botao tipo="submit" variante="primario" desabilitado={carregando}>
                  Ativar
                </Botao>
              </div>
            </form>
          </div>
        )}

        {modal2FA?.tipo === 'ativar' && modal2FA.metodo !== 'app' && (
          <div className="aba-seguranca__2fa-setup">
            <p>Enviaremos um código de verificação para seu {modal2FA.metodo === 'sms' ? 'telefone' : 'e-mail'} cadastrado.</p>
            <form onSubmit={handle2FASubmit}>
              <CampoTexto
                label="Código de verificação"
                tipo="text"
                valor={codigo2FA}
                aoAlterar={(valor) => setCodigo2FA(valor)}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                obrigatorio
                desabilitado={carregando}
                data-testid="input-codigo-2fa"
              />
              {erro2FA && <ErrorState titulo="Erro" mensagem={erro2FA} data-testid="alerta-erro-2fa" />}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--espaco-3)', marginTop: 'var(--espaco-2)' }}>
                <Botao tipo="button" variante="secundario" aoClicar={() => { setModal2FA(null); setCodigo2FA(''); }} desabilitado={carregando}>
                  Cancelar
                </Botao>
                <Botao tipo="submit" variante="primario" desabilitado={carregando}>
                  Ativar
                </Botao>
              </div>
            </form>
          </div>
        )}

        {modal2FA?.tipo === 'desativar' && (
          <div className="aba-seguranca__2fa-setup">
            <p>Para desativar a autenticação de dois fatores, insira o código do seu app authenticator ou receba por SMS/e-mail.</p>
            <ErrorState titulo="Aviso" mensagem="Desativar 2FA torna sua conta menos segura." data-testid="alerta-aviso-desativar-2fa" />
            <form onSubmit={handle2FASubmit}>
              <CampoTexto
                label="Código de 6 dígitos"
                tipo="text"
                valor={codigo2FA}
                aoAlterar={(valor) => setCodigo2FA(valor)}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                obrigatorio
                desabilitado={carregando}
                data-testid="input-codigo-2fa-desativar"
              />
              {erro2FA && <ErrorState titulo="Erro" mensagem={erro2FA} data-testid="alerta-erro-2fa" />}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--espaco-3)', marginTop: 'var(--espaco-2)' }}>
                <Botao tipo="button" variante="secundario" aoClicar={() => { setModal2FA(null); setCodigo2FA(''); }} desabilitado={carregando}>
                  Cancelar
                </Botao>
                <Botao tipo="submit" variante="perigo" desabilitado={carregando}>
                  Desativar
                </Botao>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AbaSeguranca;