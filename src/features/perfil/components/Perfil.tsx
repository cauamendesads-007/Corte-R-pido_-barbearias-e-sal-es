/**
 * Perfil - Componente principal do perfil do usuário (feature-based).
 * Abas: Visão geral, Agendamentos, Inspirações, Configurações.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import { useFeed } from '@/hooks/useFeed';
import { useEstabelecimentos } from '@/hooks/useEstabelecimentos';
import { useGlobalToast } from '@/componentes';
import {
  Container,
  BotaoPrimario,
  BotaoSecundario,
  Avatar,
  ToastProvider,
} from '@/componentes';
import { ICONES } from '@/constantes';
import { AbasPerfil } from './AbasPerfil';
import { VisaoPerfil } from './VisaoPerfil';
import { AgendamentosPerfil } from './AgendamentosPerfil';
import { InspiracoesPerfil } from './InspiracoesPerfil';
import { ConfiguracoesPerfil } from './ConfiguracoesPerfil';
import type { AbaPerfil, DadosEdicaoPerfil } from '../types';
import type {
  ConfiguracaoPerfil,
  ConfiguracaoNotificacoes,
  ConfiguracaoPrivacidade,
  ConfiguracaoAparencia,
  ConfiguracaoConta,
} from '@/features/configuracoes/types';
import type { Servico } from '@/tipos';
import './Perfil.css';

const PERFIL_DEFAULTS: DadosEdicaoPerfil = {
  nome: '',
  email: '',
  telefone: '',
  bio: '',
  avatar: undefined,
};

const CONFIGURACAO_PERFIL_DEFAULTS: ConfiguracaoPerfil = {
  nome: '',
  bio: '',
  whatsapp: '',
  cidade: '',
};

const CONFIGURACAO_NOTIFICACOES_DEFAULTS: ConfiguracaoNotificacoes = {
  agendamentos: true,
  mensagens: true,
  promocoes: false,
  whatsapp: true,
};

const CONFIGURACAO_PRIVACIDADE_DEFAULTS: ConfiguracaoPrivacidade = {
  perfilPublico: true,
  mostrarAvaliacoes: true,
  historicoVisivel: true,
};

const CONFIGURACAO_APARANCIA_DEFAULTS: ConfiguracaoAparencia = {
  tema: 'sistema',
  fonteGrande: false,
  reduzirAnimacoes: false,
};

const CONFIGURACAO_CONTA_DEFAULTS: ConfiguracaoConta = {
  senhaAtual: '',
  novaSenha: '',
  confirmarNovaSenha: '',
};

export const Perfil = () => {
  const { usuario, atualizarPerfil, alterarSenha, sair } = useAuth();
  const { agendamentos, cancelar: cancelarAgendamento } = useAgendamentos();
  const { publicacoes: inspiracaoSalvas } = useFeed('inspiracoes');
  const { estabelecimentos, buscar: buscarEstabelecimentos } = useEstabelecimentos();
  const { sucesso, erro: toastErro } = useGlobalToast();

  const [abaAtiva, setAbaAtiva] = useState<AbaPerfil>('visao');
  const [editando, setEditando] = useState(false);
  const [dadosEdicao, setDadosEdicao] = useState<DadosEdicaoPerfil>(PERFIL_DEFAULTS);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Estados para configurações
  const [perfilConfig, setPerfilConfig] = useState<ConfiguracaoPerfil>(CONFIGURACAO_PERFIL_DEFAULTS);
  const [notificacoesConfig, setNotificacoesConfig] = useState<ConfiguracaoNotificacoes>(CONFIGURACAO_NOTIFICACOES_DEFAULTS);
  const [privacidadeConfig, setPrivacidadeConfig] = useState<ConfiguracaoPrivacidade>(CONFIGURACAO_PRIVACIDADE_DEFAULTS);
  const [aparenciaConfig, setAparenciaConfig] = useState<ConfiguracaoAparencia>(CONFIGURACAO_APARANCIA_DEFAULTS);
  const [contaConfig, setContaConfig] = useState<ConfiguracaoConta>(CONFIGURACAO_CONTA_DEFAULTS);
  const [mostrarModalExcluir, setMostrarModalExcluir] = useState(false);

  // Sincronizar dados do usuário com estados locais
  useEffect(() => {
    if (usuario) {
      setDadosEdicao({
        nome: usuario.nome || '',
        email: usuario.email || '',
        telefone: usuario.whatsapp || '',
        bio: usuario.bio || '',
        avatar: usuario.avatar,
      });
      setPerfilConfig({
        nome: usuario.nome || '',
        bio: usuario.bio || '',
        whatsapp: usuario.whatsapp || '',
        cidade: usuario.cidade || '',
      });
    }
  }, [usuario]);

  // Criar mapa de serviços a partir dos agendamentos
  const servicosMap = useMemo(() => {
    const map: Record<string, Servico> = {};
    // Os agendamentos já têm servicoIds, mas não temos um hook de serviços direto
    // Por enquanto usamos um mapa vazio - os componentes lidam com ausência
    return map;
  }, []);

  const handleDadosChange = useCallback((dados: Partial<DadosEdicaoPerfil>) => {
    setDadosEdicao((prev) => ({ ...prev, ...dados }));
  }, []);

  const handlePerfilChange = useCallback((valores: Partial<ConfiguracaoPerfil>) => {
    setPerfilConfig((prev) => ({ ...prev, ...valores }));
  }, []);

  const handleNotificacoesChange = useCallback((valores: Partial<ConfiguracaoNotificacoes>) => {
    setNotificacoesConfig((prev) => ({ ...prev, ...valores }));
  }, []);

  const handlePrivacidadeChange = useCallback((valores: Partial<ConfiguracaoPrivacidade>) => {
    setPrivacidadeConfig((prev) => ({ ...prev, ...valores }));
  }, []);

  const handleAparenciaChange = useCallback((valores: Partial<ConfiguracaoAparencia>) => {
    setAparenciaConfig((prev) => ({ ...prev, ...valores }));
  }, []);

  const handleContaChange = useCallback((valores: Partial<ConfiguracaoConta>) => {
    setContaConfig((prev) => ({ ...prev, ...valores }));
  }, []);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        setAvatarPreview(preview);
        setDadosEdicao((prev) => ({ ...prev, avatar: preview }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSalvarPerfil = useCallback(async () => {
    setSalvando(true);
    setErro('');
    try {
      const resultado = await atualizarPerfil(dadosEdicao);
      if (resultado.sucesso) {
        sucesso('Perfil atualizado!');
        setEditando(false);
        setAvatarPreview(null);
      } else {
        setErro(resultado.erro || 'Erro ao atualizar perfil');
        toastErro(resultado.erro || 'Erro ao atualizar perfil');
      }
    } catch {
      setErro('Erro inesperado ao salvar perfil');
      toastErro('Erro inesperado ao salvar perfil');
    } finally {
      setSalvando(false);
    }
  }, [atualizarPerfil, dadosEdicao, sucesso, toastErro]);

  const handleCancelarEdicao = useCallback(() => {
    if (usuario) {
      setDadosEdicao({
        nome: usuario.nome || '',
        email: usuario.email || '',
        telefone: usuario.whatsapp || '',
        bio: usuario.bio || '',
        avatar: usuario.avatar,
      });
      setAvatarPreview(null);
    }
    setEditando(false);
  }, [usuario]);

  const handleAlterarSenha = useCallback(async () => {
    if (contaConfig.novaSenha !== contaConfig.confirmarNovaSenha) {
      toastErro('As senhas não coincidem');
      return;
    }
    if (contaConfig.novaSenha.length < 6) {
      toastErro('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      const resultado = await alterarSenha(contaConfig.senhaAtual, contaConfig.novaSenha);
      if (resultado.sucesso) {
        sucesso('Senha alterada!');
        setContaConfig((prev) => ({ ...prev, senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' }));
      } else {
        setErro(resultado.erro || 'Erro ao alterar senha');
        toastErro(resultado.erro || 'Erro ao alterar senha');
      }
    } catch {
      setErro('Erro inesperado ao alterar senha');
      toastErro('Erro inesperado ao alterar senha');
    } finally {
      setSalvando(false);
    }
  }, [alterarSenha, contaConfig, sucesso, toastErro]);

  const handleExcluirConta = useCallback(async () => {
    setSalvando(true);
    setErro('');
    try {
      // Em um app real, chamaria api.usuarios.excluir()
      await new Promise((r) => setTimeout(r, 1000));
      sucesso('Conta excluída (simulado)');
      sair();
      setMostrarModalExcluir(false);
    } catch {
      setErro('Erro ao excluir conta');
      toastErro('Erro ao excluir conta');
    } finally {
      setSalvando(false);
    }
  }, [sair, sucesso, toastErro]);

  const handleSair = useCallback(() => {
    sair();
  }, [sair]);

  const handleSalvarConfiguracoes = useCallback(async () => {
    setSalvando(true);
    setErro('');
    try {
      // Atualizar perfil
      await atualizarPerfil({
        nome: perfilConfig.nome,
        bio: perfilConfig.bio,
        whatsapp: perfilConfig.whatsapp,
        // cidade não está no tipo de atualizarPerfil
      });

      // Notificações, privacidade e aparência seriam salvas via API/backend
      // Por enquanto apenas salvam localmente

      sucesso('Configurações salvas!');
    } catch {
      setErro('Erro ao salvar configurações');
      toastErro('Erro ao salvar configurações');
    } finally {
      setSalvando(false);
    }
  }, [atualizarPerfil, perfilConfig, sucesso, toastErro]);

  // Buscar estabelecimentos para inspirações
  useEffect(() => {
    if (usuario) {
      buscarEstabelecimentos();
    }
  }, [buscarEstabelecimentos, usuario]);

  if (!usuario) {
    return (
      <ToastProvider>
        <Container variante="com-cabecalho">
          <div className="perfil__nao-autenticado" data-testid="perfil-nao-autenticado">
            <h1>Faça login para ver seu perfil</h1>
            <BotaoPrimario aoClicar={() => { window.location.href = '/login'; }}>Entrar</BotaoPrimario>
          </div>
        </Container>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Container variante="com-cabecalho" data-testid="perfil-container">
        {/* Header do perfil */}
        <header className="perfil__cabecalho">
          <div className="perfil__avatar-wrapper">
            <Avatar
              src={avatarPreview || usuario.avatar}
              nome={dadosEdicao.nome || usuario.nome || usuario.email}
              corFundo="#64748b"
              tamanho="xl"
              className="perfil__avatar"
              data-testid="perfil-avatar"
            />
            {editando && (
              <label className="perfil__avatar-editar">
                {ICONES.camera}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  hidden
                />
              </label>
            )}
          </div>
          <div className="perfil__info">
            <h1 className="perfil__nome">{dadosEdicao.nome || usuario.nome || usuario.email}</h1>
            <p className="perfil__tipo">
              {usuario.papel === 'barbeiro' ? '💈 Barbeiro' : usuario.papel === 'admin' ? '⚙️ Admin' : '👤 Cliente'}
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
        <AbasPerfil
          abaAtiva={abaAtiva}
          onMudarAba={setAbaAtiva}
        />

        {/* Painéis */}
        <VisaoPerfil
          usuario={usuario}
          editando={editando}
          dadosEdicao={dadosEdicao}
          onDadosChange={handleDadosChange}
        />

        <AgendamentosPerfil
          agendamentos={agendamentos}
          servicos={servicosMap}
          onCancelar={cancelarAgendamento}
          onReagendar={() => {}}
          onAvaliar={() => {}}
        />

        <InspiracoesPerfil
          favoritos={inspiracaoSalvas.map((i) => i.id)}
          estabelecimentos={estabelecimentos}
          onRemoverFavorito={() => {}}
          onVerEstabelecimento={() => {}}
        />

        <ConfiguracoesPerfil
          usuario={usuario}
          perfil={perfilConfig}
          notificacoes={notificacoesConfig}
          privacidade={privacidadeConfig}
          aparencia={aparenciaConfig}
          conta={contaConfig}
          avatarPreview={avatarPreview}
          onAvatarChange={setAvatarPreview}
          carregando={salvando}
          erro={erro}
          onPerfilChange={handlePerfilChange}
          onNotificacoesChange={handleNotificacoesChange}
          onPrivacidadeChange={handlePrivacidadeChange}
          onAparenciaChange={handleAparenciaChange}
          onContaChange={handleContaChange}
          aoSalvarPerfil={handleSalvarConfiguracoes}
          aoAlterarSenha={handleAlterarSenha}
          aoExcluirConta={handleExcluirConta}
          aoSair={handleSair}
          mostrarModalExcluir={mostrarModalExcluir}
          setMostrarModalExcluir={setMostrarModalExcluir}
        />
      </Container>
    </ToastProvider>
  );
};

export default Perfil;