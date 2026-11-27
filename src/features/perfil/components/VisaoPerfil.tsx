/**
 * VisaoPerfil - Aba de visão geral do perfil.
 */

import { CampoTexto, CampoWhatsapp } from '@/componentes';
import type { DadosEdicaoPerfil } from '../types';

interface VisaoPerfilProps {
  usuario: { nome?: string; bio?: string; whatsapp?: string; email: string; papel: string } | null;
  editando: boolean;
  dadosEdicao: DadosEdicaoPerfil;
  onDadosChange: (dados: Partial<DadosEdicaoPerfil>) => void;
}

export const VisaoPerfil = ({ usuario, editando, dadosEdicao, onDadosChange }: VisaoPerfilProps) => {
  return (
    <div className="perfil__painel" role="tabpanel" id="painel-visao" aria-labelledby="aba-visao" hidden={!editando && true}>
      <section className="perfil__secao" data-testid="perfil-visao">
        <h2>Sobre mim</h2>
        {editando ? (
          <div>
            <label className="perfil__campo-label">Bio</label>
            <textarea
              placeholder="Conte um pouco sobre você..."
              value={dadosEdicao.bio}
              onChange={(e) => onDadosChange({ bio: e.target.value })}
              rows={4}
              maxLength={300}
              className="perfil__textarea"
              data-testid="perfil-bio"
            />
            <span className="perfil__contador">{dadosEdicao.bio.length}/300</span>
          </div>
        ) : (
          <p className={usuario?.bio ? '' : 'perfil__bio-vazia'}>
            {usuario?.bio || 'Nenhuma bio adicionada ainda.'}
          </p>
        )}
      </section>

      <section className="perfil__secao" data-testid="perfil-contato">
        <h2>Contato</h2>
        {editando ? (
          <>
            <CampoTexto
              label="Nome completo"
              valor={dadosEdicao.nome}
              aoAlterar={(v) => onDadosChange({ nome: v })}
              obrigatorio
              data-testid="perfil-nome"
            />
            <CampoTexto
              label="E-mail"
              tipo="email"
              valor={dadosEdicao.email}
              aoAlterar={(v) => onDadosChange({ email: v })}
              obrigatorio
              data-testid="perfil-email"
            />
            <CampoWhatsapp
              label="WhatsApp"
              valor={dadosEdicao.telefone}
              aoAlterar={(v) => onDadosChange({ telefone: v })}
              data-testid="perfil-telefone"
            />
          </>
        ) : (
          <dl className="perfil__contato-lista">
            <div>
              <dt>Nome</dt>
              <dd>{usuario?.nome}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{usuario?.email}</dd>
            </div>
            <div>
              <dt>WhatsApp</dt>
              <dd>{usuario?.whatsapp || 'Não informado'}</dd>
            </div>
          </dl>
        )}
      </section>

      {usuario?.papel === 'barbeiro' && (
        <section className="perfil__secao" data-testid="perfil-barbeiro">
          <h2>Estabelecimento</h2>
          <p>Gerencie seu estabelecimento no <a href="/painel">Painel do Barbeiro</a>.</p>
        </section>
      )}
    </div>
  );
};