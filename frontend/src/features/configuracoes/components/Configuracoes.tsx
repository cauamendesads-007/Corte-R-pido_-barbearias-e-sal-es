/**
 * Componente Configuracoes - Painel principal de configurações.
 * Composição de todas as abas, gerencia navegação e estado global.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  ErrorState,
  Skeleton,
  Botao,
  Icone,
} from '@/componentes';
import { useConfiguracoes } from '../hooks';
import { AbaConta } from './AbaConta';
import { AbaAparencia } from './AbaAparencia';
import { AbaNotificacoes } from './AbaNotificacoes';
import { AbaPrivacidade } from './AbaPrivacidade';
import { AbaSeguranca } from './AbaSeguranca';
import { ABAS_CONFIGURACOES, type ConfiguracoesAba } from '../types';
import './Configuracoes.css';

interface ConfiguracoesProps {
  /** Aba inicial */
  abaInicial?: ConfiguracoesAba;
  /** Callback ao alterar aba */
  aoAlterarAba?: (aba: ConfiguracoesAba) => void;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const Configuracoes = ({
  abaInicial = 'conta',
  aoAlterarAba,
  className = '',
  'data-testid': testId,
}: ConfiguracoesProps) => {
  const [abaAtiva, setAbaAtiva] = useState<ConfiguracoesAba>(abaInicial);

  const {
    conta,
    aparencia,
    notificacoes,
    privacidade,
    seguranca,
    carregando,
    erro,
    salvando,
    atualizarConta,
    atualizarAparencia,
    atualizarNotificacoes,
    atualizarPrivacidade,
    atualizarSeguranca,
    alterarSenha,
    ativarDoisFatores,
    desativarDoisFatores,
    revogarSessao,
    revogarTodasSessoes,
    removerDispositivoConfiavel,
    exportarDados,
    excluirConta,
    limparErro,
  } = useConfiguracoes();

  useEffect(() => {
    setAbaAtiva(abaInicial);
    aoAlterarAba?.(abaInicial);
  }, [abaInicial, aoAlterarAba]);

  const handleAlterarAba = (aba: ConfiguracoesAba) => {
    setAbaAtiva(aba);
    aoAlterarAba?.(aba);
  };

  const abasCarregando = useMemo(() => ({
    conta: salvando.conta || salvando.senha || salvando['2fa'] || salvando.excluir,
    aparencia: salvando.aparencia,
    notificacoes: salvando.notificacoes,
    privacidade: salvando.privacidade,
    seguranca: salvando.seguranca || salvando['todas-sessoes'] || Object.keys(salvando).some(k => k.startsWith('sessao-') || k.startsWith('dispositivo-')),
  }), [salvando]);

  if (carregando && !conta && !aparencia && !notificacoes && !privacidade && !seguranca) {
    return (
      <Cartao className={`configuracoes ${className}`} data-testid={testId}>
        <CartaoCabecalho>
          <h3>Configurações</h3>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="configuracoes__skeleton" role="status" aria-label="Carregando configurações">
            <Skeleton variante="retangular" largura="100%" altura={400} />
          </div>
        </CartaoCorpo>
      </Cartao>
    );
  }

  const renderAba = () => {
    switch (abaAtiva) {
      case 'conta':
        return (
          <AbaConta
            conta={conta}
            seguranca={seguranca}
            carregando={abasCarregando.conta}
            aoAtualizar={atualizarConta}
            aoAlterarSenha={alterarSenha}
            aoAtivar2FA={ativarDoisFatores}
            aoDesativar2FA={desativarDoisFatores}
            aoExcluirConta={excluirConta}
            aoExportarDados={exportarDados}
          />
        );
      case 'aparencia':
        return (
          <AbaAparencia
            aparencia={aparencia}
            carregando={abasCarregando.aparencia}
            aoAtualizar={atualizarAparencia}
          />
        );
      case 'notificacoes':
        return (
          <AbaNotificacoes
            notificacoes={notificacoes}
            carregando={abasCarregando.notificacoes}
            aoAtualizar={atualizarNotificacoes}
          />
        );
      case 'privacidade':
        return (
          <AbaPrivacidade
            privacidade={privacidade}
            carregando={abasCarregando.privacidade}
            aoAtualizar={atualizarPrivacidade}
          />
        );
      case 'seguranca':
        return (
          <AbaSeguranca
            seguranca={seguranca}
            carregando={abasCarregando.seguranca}
            aoAtualizar={atualizarSeguranca}
            aoRevogarSessao={revogarSessao}
            aoRevogarTodasSessoes={revogarTodasSessoes}
            aoRemoverDispositivo={removerDispositivoConfiavel}
            aoAlterarSenha={alterarSenha}
            aoAtivar2FA={ativarDoisFatores}
            aoDesativar2FA={desativarDoisFatores}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Cartao className={`configuracoes ${className}`} data-testid={testId}>
      <CartaoCabecalho>
        <h3>Configurações</h3>
        <p>Gerencie sua conta, aparência, notificações, privacidade e segurança</p>
      </CartaoCabecalho>
      <CartaoCorpo>
        {erro && (
          <ErrorState
            titulo="Erro"
            mensagem={erro}
            aoTentarNovamente={limparErro}
            className="configuracoes__erro"
            data-testid="erro-configuracoes"
          />
        )}

        <div className="configuracoes__abas" role="tablist" aria-label="Abas de configurações" data-testid="configuracoes-abas">
          {ABAS_CONFIGURACOES.map((aba) => (
            <Botao
              key={aba.id}
              role="tab"
              aria-selected={abaAtiva === aba.id}
              aria-controls={`painel-${aba.id}`}
              id={`aba-${aba.id}`}
              variante={abaAtiva === aba.id ? 'primario' : 'fantasma'}
              tamanho="pequeno"
              aoClicar={() => handleAlterarAba(aba.id)}
              className="configuracoes__aba-btn"
              data-testid={`aba-${aba.id}`}
            >
              <Icone nome={aba.icone as any} tamanho={16} className="configuracoes__aba-icone" aria-hidden="true" />
              <span className="configuracoes__aba-rotulo">{aba.rotulo}</span>
            </Botao>
          ))}
        </div>

        <div className="configuracoes__painel" role="tabpanel" id={`painel-${abaAtiva}`} aria-labelledby={`aba-${abaAtiva}`} data-testid={`painel-${abaAtiva}`}>
          {renderAba()}
        </div>
      </CartaoCorpo>
    </Cartao>
  );
};

export default Configuracoes;