/**
 * ContaConfiguracoes - Aba de conta (senha, exclusão, sair).
 */

import { useCallback } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  BotaoPerigo,
  CampoSenha,
  ModalConfirmacao,
} from '@/componentes';
import { ICONES } from '@/constantes';
import type { ConfiguracaoConta } from '../types';

interface ContaConfiguracoesProps {
  valores: ConfiguracaoConta;
  onAlterar: (valores: Partial<ConfiguracaoConta>) => void;
  carregando: boolean;
  erro: string;
  aoAlterarSenha: () => void;
  aoExcluirConta: () => void;
  aoSair: () => void;
  mostrarModalExcluir: boolean;
  setMostrarModalExcluir: (v: boolean) => void;
}

export const ContaConfiguracoes = ({
  valores,
  onAlterar,
  carregando,
  erro,
  aoAlterarSenha,
  aoExcluirConta,
  aoSair,
  mostrarModalExcluir,
  setMostrarModalExcluir,
}: ContaConfiguracoesProps) => {
  const handleAlterarSenhaSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    aoAlterarSenha();
  }, [aoAlterarSenha]);

  return (
    <>
      <Cartao variante="padrao">
        <CartaoCabecalho>
          <h2>Alterar senha</h2>
        </CartaoCabecalho>
        <CartaoCorpo>
          <form onSubmit={handleAlterarSenhaSubmit} className="configuracoes__form">
            <CampoSenha
              label="Senha atual"
              valor={valores.senhaAtual}
              aoAlterar={(v) => onAlterar({ senhaAtual: v })}
              placeholder="••••••••"
              autoComplete="current-password"
              obrigatorio
              data-testid="config-senha-atual"
            />

            <CampoSenha
              label="Nova senha"
              valor={valores.novaSenha}
              aoAlterar={(v) => onAlterar({ novaSenha: v })}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              obrigatorio
              ajuda="Mínimo 6 caracteres"
              data-testid="config-nova-senha"
            />

            <CampoSenha
              label="Confirmar nova senha"
              valor={valores.confirmarNovaSenha}
              aoAlterar={(v) => onAlterar({ confirmarNovaSenha: v })}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              obrigatorio
              data-testid="config-confirmar-senha"
            />

            {erro && <div className="configuracoes__erro" role="alert">{erro}</div>}

            <BotaoPrimario tipo="submit" carregando={carregando} data-testid="btn-alterar-senha">
              Alterar senha
            </BotaoPrimario>
          </form>
        </CartaoCorpo>
      </Cartao>

      <Cartao variante="padrao" className="configuracoes__cartao-perigo">
        <CartaoCabecalho>
          <h2>Excluir conta</h2>
        </CartaoCabecalho>
        <CartaoCorpo>
          <p className="configuracoes__descricao">
            Esta ação é irreversível. Todos os seus dados, agendamentos, avaliações e histórico serão permanentemente removidos.
          </p>
          <BotaoPerigo
            aoClicar={() => setMostrarModalExcluir(true)}
            iconeEsquerda={ICONES.lixeira}
            data-testid="btn-excluir-conta"
          >
            Excluir minha conta
          </BotaoPerigo>
        </CartaoCorpo>
      </Cartao>

      <Cartao variante="padrao">
        <CartaoCabecalho>
          <h2>Sair da conta</h2>
        </CartaoCabecalho>
        <CartaoCorpo>
          <p className="configuracoes__descricao">
            Encerrar sessão atual. Você poderá entrar novamente a qualquer momento.
          </p>
          <BotaoSecundario
            aoClicar={aoSair}
            iconeEsquerda={ICONES.sair}
            carregando={carregando}
            data-testid="btn-sair"
          >
            Sair
          </BotaoSecundario>
        </CartaoCorpo>
      </Cartao>

      {/* Modal Excluir Conta */}
      <ModalConfirmacao
        aberto={mostrarModalExcluir}
        aoConfirmar={aoExcluirConta}
        aoFechar={() => setMostrarModalExcluir(false)}
        titulo="Excluir conta permanentemente"
        mensagem="Tem certeza? Esta ação não pode ser desfeita. Todos os seus dados serão perdidos."
        textoConfirmar="Sim, excluir"
        varianteConfirmar="perigo"
        data-testid="modal-excluir-conta"
      />
    </>
  );
};