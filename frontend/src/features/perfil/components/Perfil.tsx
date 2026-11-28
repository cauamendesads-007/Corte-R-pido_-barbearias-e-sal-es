/**
 * Componente Perfil - Página principal do perfil do usuário.
 * Composição de todos os sub-componentes, gerencia estado global.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  Tabs,
  TabPainel,
  BotaoPrimario,
  Alerta,
  Skeleton,
} from '@/componentes';
import { PerfilHeader } from './PerfilHeader';
import { PerfilForm } from './PerfilForm';
import { PerfilPreferencias } from './PerfilPreferencias';
import { PerfilEnderecos } from './PerfilEnderecos';
import { PerfilCartoes } from './PerfilCartoes';
import { PerfilAtividades } from './PerfilAtividades';
import { usePerfil } from '../hooks';
import type { Perfil as PerfilType, AtualizarPerfilDados, AlterarSenhaDados, UploadAvatarDados, AtividadesFiltro } from '../types';
import './Perfil.css';

interface PerfilProps {
  /** ID do usuário (opcional, usa o logado se não informado) */
  usuarioId?: string;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const Perfil = ({
  usuarioId,
  className = '',
  'data-testid': testId,
}: PerfilProps) => {
  const {
    perfil,
    preferencias,
    enderecos,
    cartoes,
    atividades,
    carregando,
    erro,
    proximaPaginaAtividades,
    carregarPerfil,
    atualizarPerfil,
    uploadAvatar,
    removerAvatar,
    alterarSenha,
    carregarPreferencias,
    atualizarPreferencias,
    carregarEnderecos,
    adicionarEndereco,
    atualizarEndereco,
    removerEndereco,
    definirEnderecoPrincipal,
    carregarCartoes,
    adicionarCartao,
    removerCartao,
    definirCartaoPadrao,
    carregarAtividades,
    limparErro,
  } = usePerfil();

  const [mostrarFormPerfil, setMostrarFormPerfil] = useState(false);
  const [mostrarFormSenha, setMostrarFormSenha] = useState(false);
  const [filtroAtividades, setFiltroAtividades] = useState<AtividadesFiltro>({});
  const [erroGlobal, setErroGlobal] = useState<string | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    carregarPerfil();
    carregarPreferencias();
    carregarEnderecos();
    carregarCartoes();
    carregarAtividades(1);
  }, [carregarPerfil, carregarPreferencias, carregarEnderecos, carregarCartoes, carregarAtividades]);

  const handleSalvarPerfil = useCallback(async (dados: AtualizarPerfilDados) => {
    try {
      await atualizarPerfil(dados);
      setMostrarFormPerfil(false);
    } catch (e) {
      setErroGlobal(e instanceof Error ? e.message : 'Erro ao salvar perfil');
    }
  }, [atualizarPerfil]);

  const handleAlterarSenha = useCallback(async (dados: AlterarSenhaDados) => {
    try {
      await alterarSenha(dados);
      setMostrarFormSenha(false);
    } catch (e) {
      setErroGlobal(e instanceof Error ? e.message : 'Erro ao alterar senha');
    }
  }, [alterarSenha]);

  const handleUploadAvatar = useCallback(async (dados: UploadAvatarDados) => {
    try {
      await uploadAvatar(dados);
    } catch (e) {
      setErroGlobal(e instanceof Error ? e.message : 'Erro ao fazer upload do avatar');
    }
  }, [uploadAvatar]);

  const handleRemoverAvatar = useCallback(async () => {
    try {
      await removerAvatar();
    } catch (e) {
      setErroGlobal(e instanceof Error ? e.message : 'Erro ao remover avatar');
    }
  }, [removerAvatar]);

  const handleCarregarMaisAtividades = useCallback(async (pagina: number, filtro?: AtividadesFiltro) => {
    await carregarAtividades(pagina, filtro);
  }, [carregarAtividades]);

  if (carregando && !perfil) {
    return (
      <div className={`perfil ${className}`} data-testid={testId}>
        <div className="perfil__skeleton" role="status" aria-label="Carregando perfil">
          <Skeleton variante="retangular" largura="100%" altura={200} className="perfil__header-skeleton" />
          <div className="perfil__abas-skeleton">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} variante="retangular" largura="100%" altura={300} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (erro && !perfil) {
    return (
      <div className={`perfil ${className}`} data-testid={testId}>
        <Alerta
          tipo="erro"
          titulo="Erro ao carregar perfil"
          mensagem={erro}
          acao={<BotaoPrimario onClick={carregarPerfil}>Tentar novamente</BotaoPrimario>}
          className="perfil__erro"
          data-testid="perfil-erro"
        />
      </div>
    );
  }

  return (
    <div className={`perfil ${className}`} data-testid={testId}>
      {/* Erro global */}
      {erroGlobal && (
        <Alerta
          tipo="erro"
          mensagem={erroGlobal}
          dispensavel
          aoDispensar={() => setErroGlobal(null)}
          className="perfil__erro-global"
          data-testid="erro-global"
        />
      )}

      {/* Header do perfil */}
      <PerfilHeader
        perfil={perfil}
        carregando={carregando}
        aoEditar={() => setMostrarFormPerfil(true)}
        aoUploadAvatar={handleUploadAvatar}
        aoRemoverAvatar={handleRemoverAvatar}
        data-testid="perfil-header"
      />

      {/* Abas principais */}
      <Tabs
        abas={[
          { id: 'preferencias', rotulo: 'Preferências', icone: 'configuracoes' },
          { id: 'enderecos', rotulo: 'Endereços', icone: 'mapa' },
          { id: 'cartoes', rotulo: 'Cartões', icone: 'cartao' },
          { id: 'atividades', rotulo: 'Atividade', icone: 'historico' },
        ]}
        variante="cards"
        className="perfil__abas"
        data-testid="perfil-abas"
      >
        <TabPainel id="preferencias">
          <PerfilPreferencias
            preferencias={preferencias}
            aoAtualizar={atualizarPreferencias}
            carregando={carregando}
            data-testid="perfil-preferencias"
          />
        </TabPainel>

        <TabPainel id="enderecos">
          <PerfilEnderecos
            enderecos={enderecos}
            carregando={carregando}
            aoAdicionar={adicionarEndereco}
            aoAtualizar={atualizarEndereco}
            aoRemover={removerEndereco}
            aoDefinirPrincipal={definirEnderecoPrincipal}
            data-testid="perfil-enderecos"
          />
        </TabPainel>

        <TabPainel id="cartoes">
          <PerfilCartoes
            cartoes={cartoes}
            carregando={carregando}
            aoAdicionar={adicionarCartao}
            aoRemover={removerCartao}
            aoDefinirPadrao={definirCartaoPadrao}
            data-testid="perfil-cartoes"
          />
        </TabPainel>

        <TabPainel id="atividades">
          <PerfilAtividades
            atividades={atividades}
            carregando={carregando}
            proximaPagina={proximaPaginaAtividades}
            aoCarregarMais={handleCarregarMaisAtividades}
            filtro={filtroAtividades}
            aoAlterarFiltro={setFiltroAtividades}
            data-testid="perfil-atividades"
          />
        </TabPainel>
      </Tabs>

      {/* Modais */}
      <PerfilForm
        perfil={perfil}
        aoSalvar={handleSalvarPerfil}
        aoAlterarSenha={handleAlterarSenha}
        carregando={carregando}
        aberto={mostrarFormPerfil}
        aoFechar={() => { setMostrarFormPerfil(false); setMostrarFormSenha(false); }}
        data-testid="perfil-form"
      />

      <PerfilForm
        perfil={perfil}
        aoSalvar={handleSalvarPerfil}
        aoAlterarSenha={handleAlterarSenha}
        carregando={carregando}
        aberto={mostrarFormSenha}
        aoFechar={() => { setMostrarFormPerfil(false); setMostrarFormSenha(false); }}
        data-testid="perfil-form-senha"
      />
    </div>
  );
};

export default Perfil;