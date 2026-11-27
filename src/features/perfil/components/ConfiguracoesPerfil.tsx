/**
 * ConfiguracoesPerfil - Aba de configurações do perfil do usuário.
 * Reutiliza os componentes da feature configuracoes.
 */

import {
  PerfilConfiguracoes,
  NotificacoesConfiguracoes,
  PrivacidadeConfiguracoes,
  AparenciaConfiguracoes,
  ContaConfiguracoes,
} from '@/features/configuracoes/components';
import type {
  ConfiguracaoPerfil,
  ConfiguracaoNotificacoes,
  ConfiguracaoPrivacidade,
  ConfiguracaoAparencia,
  ConfiguracaoConta,
} from '@/features/configuracoes/types';

interface ConfiguracoesPerfilProps {
  usuario: { nome?: string; bio?: string; whatsapp?: string; cidade?: string; avatar?: string; email: string } | null;
  perfil: ConfiguracaoPerfil;
  notificacoes: ConfiguracaoNotificacoes;
  privacidade: ConfiguracaoPrivacidade;
  aparencia: ConfiguracaoAparencia;
  conta: ConfiguracaoConta;
  avatarPreview: string | null;
  onAvatarChange: (preview: string | null) => void;
  carregando: boolean;
  erro: string;
  onPerfilChange: (valores: Partial<ConfiguracaoPerfil>) => void;
  onNotificacoesChange: (valores: Partial<ConfiguracaoNotificacoes>) => void;
  onPrivacidadeChange: (valores: Partial<ConfiguracaoPrivacidade>) => void;
  onAparenciaChange: (valores: Partial<ConfiguracaoAparencia>) => void;
  onContaChange: (valores: Partial<ConfiguracaoConta>) => void;
  aoSalvarPerfil: () => void;
  aoAlterarSenha: () => void;
  aoExcluirConta: () => void;
  aoSair: () => void;
  mostrarModalExcluir: boolean;
  setMostrarModalExcluir: (v: boolean) => void;
}

export const ConfiguracoesPerfil = ({
  usuario,
  perfil,
  notificacoes,
  privacidade,
  aparencia,
  conta,
  avatarPreview,
  onAvatarChange,
  carregando,
  erro,
  onPerfilChange,
  onNotificacoesChange,
  onPrivacidadeChange,
  onAparenciaChange,
  onContaChange,
  aoSalvarPerfil,
  aoAlterarSenha,
  aoExcluirConta,
  aoSair,
  mostrarModalExcluir,
  setMostrarModalExcluir,
}: ConfiguracoesPerfilProps) => {
  return (
    <div className="perfil__configuracoes" data-testid="perfil-configuracoes">
      <PerfilConfiguracoes
        usuario={usuario}
        valores={perfil}
        onAlterar={onPerfilChange}
        avatarPreview={avatarPreview}
        onAvatarChange={onAvatarChange}
        carregando={carregando}
        erro={erro}
        aoSalvar={aoSalvarPerfil}
      />
      <NotificacoesConfiguracoes
        valores={notificacoes}
        onAlterar={onNotificacoesChange}
      />
      <PrivacidadeConfiguracoes
        valores={privacidade}
        onAlterar={onPrivacidadeChange}
      />
      <AparenciaConfiguracoes
        valores={aparencia}
        onAlterar={onAparenciaChange}
      />
      <ContaConfiguracoes
        valores={conta}
        onAlterar={onContaChange}
        carregando={carregando}
        erro={erro}
        aoAlterarSenha={aoAlterarSenha}
        aoExcluirConta={aoExcluirConta}
        aoSair={aoSair}
        mostrarModalExcluir={mostrarModalExcluir}
        setMostrarModalExcluir={setMostrarModalExcluir}
      />
    </div>
  );
};