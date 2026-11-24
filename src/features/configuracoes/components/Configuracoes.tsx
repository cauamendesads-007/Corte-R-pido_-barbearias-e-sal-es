/**
 * Configuracoes - Tela principal de configurações do usuário.
 * Compose todos os sub-componentes do feature configuracoes.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Container,
  ToastProvider,
  useGlobalToast,
} from '@/componentes';
import type {
  AbaConfiguracoes,
  ConfiguracaoPerfil,
  ConfiguracaoNotificacoes,
  ConfiguracaoPrivacidade,
  ConfiguracaoAparencia,
  ConfiguracaoConta,
} from '../types';
import { AbasConfiguracoes } from './AbasConfiguracoes';
import { PerfilConfiguracoes } from './PerfilConfiguracoes';
import { NotificacoesConfiguracoes } from './NotificacoesConfiguracoes';
import { PrivacidadeConfiguracoes } from './PrivacidadeConfiguracoes';
import { AparenciaConfiguracoes } from './AparenciaConfiguracoes';
import { ContaConfiguracoes } from './ContaConfiguracoes';
import './Configuracoes.css';

const PERFIL_INICIAL: ConfiguracaoPerfil = {
  nome: '',
  bio: '',
  whatsapp: '',
  cidade: '',
  avatar: null,
};

const NOTIFICACOES_INICIAL: ConfiguracaoNotificacoes = {
  agendamentos: true,
  mensagens: true,
  promocoes: false,
  whatsapp: true,
};

const PRIVACIDADE_INICIAL: ConfiguracaoPrivacidade = {
  perfilPublico: true,
  mostrarAvaliacoes: true,
  historicoVisivel: true,
};

const APARÊNCIA_INICIAL: ConfiguracaoAparencia = {
  tema: 'sistema',
  fonteGrande: false,
  reduzirAnimacoes: false,
};

const CONTA_INICIAL: ConfiguracaoConta = {
  senhaAtual: '',
  novaSenha: '',
  confirmarNovaSenha: '',
};

const Configuracoes = () => {
  const { usuario, atualizarPerfil, alterarSenha, sair, excluirConta } = useAuth();
  const { sucesso, erro: toastErro } = useGlobalToast();

  const [abaAtiva, setAbaAtiva] = useState<AbaConfiguracoes>('perfil');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Perfil
  const [perfil, setPerfilState] = useState<ConfiguracaoPerfil>({
    ...PERFIL_INICIAL,
    nome: usuario?.nome || '',
    bio: usuario?.bio || '',
    whatsapp: usuario?.whatsapp || '',
    cidade: usuario?.cidade || '',
    avatar: usuario?.avatar || null,
  });
  const setPerfil = useCallback((valores: Partial<ConfiguracaoPerfil>) => {
    setPerfilState((prev) => ({ ...prev, ...valores }));
  }, []);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Notificações
  const [notificacoes, setNotificacoesState] = useState<ConfiguracaoNotificacoes>({
    ...NOTIFICACOES_INICIAL,
    agendamentos: usuario?.lembretesWhatsapp ?? true,
    whatsapp: usuario?.lembretesWhatsapp ?? true,
  });
  const setNotificacoes = useCallback((valores: Partial<ConfiguracaoNotificacoes>) => {
    setNotificacoesState((prev) => ({ ...prev, ...valores }));
  }, []);

  // Privacidade
  const [privacidade, setPrivacidadeState] = useState<ConfiguracaoPrivacidade>(PRIVACIDADE_INICIAL);
  const setPrivacidade = useCallback((valores: Partial<ConfiguracaoPrivacidade>) => {
    setPrivacidadeState((prev) => ({ ...prev, ...valores }));
  }, []);

  // Aparência
  const [aparencia, setAparenciaState] = useState<ConfiguracaoAparencia>(APARÊNCIA_INICIAL);
  const setAparencia = useCallback((valores: Partial<ConfiguracaoAparencia>) => {
    setAparenciaState((prev) => ({ ...prev, ...valores }));
  }, []);

  // Conta
  const [conta, setContaState] = useState<ConfiguracaoConta>(CONTA_INICIAL);
  const setConta = useCallback((valores: Partial<ConfiguracaoConta>) => {
    setContaState((prev) => ({ ...prev, ...valores }));
  }, []);
  const [mostrarModalExcluir, setMostrarModalExcluir] = useState(false);

  const handleSalvarPerfil = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      await atualizarPerfil({ ...perfil, avatar: avatarPreview || undefined });
      sucesso('Perfil atualizado com sucesso');
    } catch (_) { void _;
      setErro('Erro ao atualizar perfil');
    } finally {
      setCarregando(false);
    }
  }, [atualizarPerfil, perfil, avatarPreview, sucesso]);

  const handleAlterarSenha = useCallback(async () => {
    if (conta.novaSenha !== conta.confirmarNovaSenha) {
      setErro('As senhas não coincidem');
      return;
    }
    if (conta.novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      await alterarSenha(conta.senhaAtual, conta.novaSenha);
      sucesso('Senha alterada com sucesso');
      setConta(CONTA_INICIAL);
    } catch (_) { void _;
      setErro('Erro ao alterar senha. Verifique a senha atual.');
    } finally {
      setCarregando(false);
    }
  }, [alterarSenha, conta, sucesso, setConta]);

  const handleExcluirConta = useCallback(async () => {
    setCarregando(true);
    try {
      await excluirConta();
      sucesso('Conta excluída');
    } catch (_) { void _;
      toastErro('Erro ao excluir conta');
    } finally {
      setCarregando(false);
    }
  }, [excluirConta, sucesso, toastErro]);

  return (
    <ToastProvider>
      <Container variante="com-cabecalho" data-testid="configuracoes-container">
        <header className="configuracoes__header">
          <h1>Configurações</h1>
        </header>

        <AbasConfiguracoes abaAtiva={abaAtiva} onMudarAba={setAbaAtiva} />

        <main className="configuracoes__conteudo" role="tabpanel" aria-label={`Configurações de ${abaAtiva}`}>
          {/* Perfil */}
          {abaAtiva === 'perfil' && (
            <PerfilConfiguracoes
              usuario={usuario}
              valores={perfil}
              onAlterar={setPerfil}
              avatarPreview={avatarPreview}
              onAvatarChange={setAvatarPreview}
              carregando={carregando}
              erro={erro}
              aoSalvar={handleSalvarPerfil}
            />
          )}

          {/* Notificações */}
          {abaAtiva === 'notificacoes' && (
            <NotificacoesConfiguracoes
              valores={notificacoes}
              onAlterar={setNotificacoes}
            />
          )}

          {/* Privacidade */}
          {abaAtiva === 'privacidade' && (
            <PrivacidadeConfiguracoes
              valores={privacidade}
              onAlterar={setPrivacidade}
            />
          )}

          {/* Aparência */}
          {abaAtiva === 'aparencia' && (
            <AparenciaConfiguracoes
              valores={aparencia}
              onAlterar={setAparencia}
            />
          )}

          {/* Conta */}
          {abaAtiva === 'conta' && (
            <ContaConfiguracoes
              valores={conta}
              onAlterar={setConta}
              carregando={carregando}
              erro={erro}
              aoAlterarSenha={handleAlterarSenha}
              aoExcluirConta={handleExcluirConta}
              aoSair={sair}
              mostrarModalExcluir={mostrarModalExcluir}
              setMostrarModalExcluir={setMostrarModalExcluir}
            />
          )}
        </main>
      </Container>
    </ToastProvider>
  );
};

export default Configuracoes;