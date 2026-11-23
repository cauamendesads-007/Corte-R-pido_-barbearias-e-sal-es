/**
 * PerfilConfiguracoes - Aba de perfil do usuário.
 */

import { useCallback } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  BotaoPrimario,
  CampoTexto,
  CampoWhatsapp,
  Avatar,
} from '@/componentes';
import { ICONES } from '@/constantes';
import type { ConfiguracaoPerfil } from '../types';

interface PerfilConfiguracoesProps {
  usuario: { nome?: string; bio?: string; whatsapp?: string; cidade?: string; avatar?: string; email: string } | null;
  valores: ConfiguracaoPerfil;
  onAlterar: (valores: Partial<ConfiguracaoPerfil>) => void;
  avatarPreview: string | null;
  onAvatarChange: (preview: string | null) => void;
  carregando: boolean;
  erro: string;
  aoSalvar: () => void;
}

export const PerfilConfiguracoes = ({
  usuario,
  valores,
  onAlterar,
  avatarPreview,
  onAvatarChange,
  carregando,
  erro,
  aoSalvar,
}: PerfilConfiguracoesProps) => {
  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onAvatarChange(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onAvatarChange]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    aoSalvar();
  }, [aoSalvar]);

  return (
    <form onSubmit={handleSubmit} className="configuracoes__form">
      <Cartao variante="padrao">
        <CartaoCabecalho>
          <h2>Informações pessoais</h2>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="configuracoes__avatar-section">
            <Avatar
              src={avatarPreview || usuario?.avatar || undefined}
              nome={valores.nome || usuario?.email || 'Usuário'}
              tamanho="grande"
              className="configuracoes__avatar"
            />
            <label className="configuracoes__avatar-label">
              <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
              {ICONES.camera} Alterar foto
            </label>
          </div>

          <CampoTexto
            label="Nome completo"
            valor={valores.nome}
            aoAlterar={(v) => onAlterar({ nome: v })}
            placeholder="Seu nome"
            autoComplete="name"
            obrigatorio
            data-testid="config-nome"
          />

          <CampoTexto
            label="Bio"
            valor={valores.bio}
            aoAlterar={(v) => onAlterar({ bio: v })}
            placeholder="Conte um pouco sobre você"
            maxLength={160}
            data-testid="config-bio"
          />

          <CampoWhatsapp
            label="WhatsApp"
            valor={valores.whatsapp}
            aoAlterar={(v) => onAlterar({ whatsapp: v })}
            ajuda="Usado para notificações e contato"
            data-testid="config-whatsapp"
          />

          <CampoTexto
            label="Cidade"
            valor={valores.cidade}
            aoAlterar={(v) => onAlterar({ cidade: v })}
            placeholder="Sua cidade"
            data-testid="config-cidade"
          />

          {erro && <div className="configuracoes__erro" role="alert">{erro}</div>}

          <BotaoPrimario tipo="submit" carregando={carregando} data-testid="btn-salvar-perfil">
            Salvar alterações
          </BotaoPrimario>
        </CartaoCorpo>
      </Cartao>
    </form>
  );
};