/**
 * Aba Privacidade - Configurações de visibilidade, permissões e compartilhamento de dados.
 */

import { useCallback } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  CheckboxToggle,
  Divisor,
  RadioGrupo,
} from '@/componentes';
import type { ConfiguracoesPrivacidade } from '../types';
import './AbaPrivacidade.css';

const VISIBILIDADE_PERFIL = [
  { valor: 'publico', rotulo: 'Público', descricao: 'Qualquer pessoa pode ver seu perfil' },
  { valor: 'apenas_conexoes', rotulo: 'Apenas conexões', descricao: 'Apenas pessoas que agendaram com você' },
  { valor: 'privado', rotulo: 'Privado', descricao: 'Ninguém pode ver seu perfil' },
] as const;

const PERMISSOES_MENSAGENS = [
  { valor: 'todos', rotulo: 'Todos', descricao: 'Qualquer pessoa pode enviar mensagens' },
  { valor: 'conexoes', rotulo: 'Apenas conexões', descricao: 'Apenas quem agendou com você' },
  { valor: 'ninguem', rotulo: 'Ninguém', descricao: 'Não receber mensagens' },
] as const;

const OPCOES_VISIBILIDADE = VISIBILIDADE_PERFIL.map(op => ({ ...op, label: op.rotulo, desabilitado: false }));
const OPCOES_PERMISSOES = PERMISSOES_MENSAGENS.map(op => ({ ...op, label: op.rotulo, desabilitado: false }));

interface AbaPrivacidadeProps {
  privacidade: ConfiguracoesPrivacidade | null;
  carregando: boolean;
  aoAtualizar: (dados: Partial<ConfiguracoesPrivacidade>) => Promise<void>;
}

export const AbaPrivacidade = ({
  privacidade,
  carregando,
  aoAtualizar,
}: AbaPrivacidadeProps) => {
  const handleChange = useCallback(<K extends keyof ConfiguracoesPrivacidade>(campo: K, valor: ConfiguracoesPrivacidade[K]) => {
    aoAtualizar({ [campo]: valor });
  }, [aoAtualizar]);

  if (!privacidade) return null;

  return (
    <div className="aba-privacidade" data-testid="aba-privacidade">
      {/* Visibilidade do Perfil */}
      <Cartao className="aba-privacidade__cartao">
        <CartaoCabecalho>
          <h3>Visibilidade do perfil</h3>
          <p>Controlar quem pode ver suas informações públicas</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <RadioGrupo
            name="visibilidadePerfil"
            opcoes={OPCOES_VISIBILIDADE.map(op => ({ ...op, desabilitado: carregando }))}
            valor={privacidade.visibilidadePerfil}
            aoAlterar={(v) => handleChange('visibilidadePerfil', v as ConfiguracoesPrivacidade['visibilidadePerfil'])}
            data-testid="radio-visibilidade-perfil"
            className="aba-privacidade__radio-group"
          />
        </CartaoCorpo>
      </Cartao>

      <Divisor />

      {/* Presença online */}
      <Cartao className="aba-privacidade__cartao">
        <CartaoCabecalho>
          <h3>Presença online</h3>
          <p>Configure o que outros veem sobre sua atividade</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-privacidade__switches">
            <CheckboxToggle
              rotulo="Mostrar status online"
              descricao="Permitir que outros vejam quando você está online"
              verificado={privacidade.mostrarOnline}
              aoAlterar={(v) => handleChange('mostrarOnline', v)}
              desabilitado={carregando}
              data-testid="switch-mostrar-online"
            />
            <CheckboxToggle
              rotulo="Mostrar último acesso"
              descricao="Mostrar quando você esteve online pela última vez"
              verificado={privacidade.mostrarUltimoAcesso}
              aoAlterar={(v) => handleChange('mostrarUltimoAcesso', v)}
              desabilitado={carregando}
              data-testid="switch-mostrar-ultimo-acesso"
            />
            <CheckboxToggle
              rotulo="Indexar em buscas"
              descricao="Permitir que seu perfil apareça em resultados de busca"
              verificado={privacidade.indexarBusca}
              aoAlterar={(v) => handleChange('indexarBusca', v)}
              desabilitado={carregando}
              data-testid="switch-indexar-busca"
            />
            <CheckboxToggle
              rotulo="Mostrar histórico"
              descricao="Mostrar seu histórico de agendamentos publicamente"
              verificado={privacidade.mostrarHistorico}
              aoAlterar={(v) => handleChange('mostrarHistorico', v)}
              desabilitado={carregando}
              data-testid="switch-mostrar-historico"
            />
          </div>
        </CartaoCorpo>
      </Cartao>

      <Divisor />

      {/* Mensagens e convites */}
      <Cartao className="aba-privacidade__cartao">
        <CartaoCabecalho>
          <h3>Mensagens e convites</h3>
          <p>Quem pode entrar em contato com você</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <RadioGrupo
            name="permitirMensagens"
            opcoes={OPCOES_PERMISSOES.map(op => ({ ...op, desabilitado: carregando }))}
            valor={privacidade.permitirMensagens}
            aoAlterar={(v) => handleChange('permitirMensagens', v as ConfiguracoesPrivacidade['permitirMensagens'])}
            data-testid="radio-permitir-mensagens"
            className="aba-privacidade__radio-group"
          />

          <div className="aba-privacidade__switches" style={{ marginTop: 'var(--espaco-4)' }}>
            <RadioGrupo
              name="permitirConvites"
              opcoes={OPCOES_PERMISSOES.map(op => ({ ...op, desabilitado: carregando }))}
              valor={privacidade.permitirConvites}
              aoAlterar={(v) => handleChange('permitirConvites', v as ConfiguracoesPrivacidade['permitirConvites'])}
              data-testid="radio-permitir-convites"
              className="aba-privacidade__radio-group"
            />
          </div>
        </CartaoCorpo>
      </Cartao>

      <Divisor />

      {/* Avaliações */}
      <Cartao className="aba-privacidade__cartao">
        <CartaoCabecalho>
          <h3>Avaliações</h3>
          <p>Configurações de exibição de avaliações</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <CheckboxToggle
            rotulo="Mostrar avaliações"
            descricao="Exibir avaliações recebidas no seu perfil"
            verificado={privacidade.mostrarAvaliacoes}
            aoAlterar={(v) => handleChange('mostrarAvaliacoes', v)}
            desabilitado={carregando}
            data-testid="switch-mostrar-avaliacoes"
          />
        </CartaoCorpo>
      </Cartao>

      <Divisor />

      {/* Dados e compartilhamento */}
      <Cartao className="aba-privacidade__cartao">
        <CartaoCabecalho>
          <h3>Dados e compartilhamento</h3>
          <p>Como seus dados são usados e compartilhados</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-privacidade__switches">
            <CheckboxToggle
              rotulo="Compartilhar dados para analytics"
              descricao="Ajude a melhorar o app compartilhando uso anônimo"
              verificado={privacidade.compartilharDadosAnalytics}
              aoAlterar={(v) => handleChange('compartilharDadosAnalytics', v)}
              desabilitado={carregando}
              data-testid="switch-compartilhar-analytics"
            />
            <CheckboxToggle
              rotulo="Compartilhar dados para marketing"
              descricao="Permitir uso de dados para comunicações de marketing"
              verificado={privacidade.compartilharDadosMarketing}
              aoAlterar={(v) => handleChange('compartilharDadosMarketing', v)}
              desabilitado={carregando}
              data-testid="switch-compartilhar-marketing"
            />
          </div>
        </CartaoCorpo>
      </Cartao>

      <Divisor />

      {/* Histórico e dados */}
      <Cartao className="aba-privacidade__cartao">
        <CartaoCabecalho>
          <h3>Seus dados</h3>
          <p>Gerenciar histórico e dados salvos</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-privacidade__acoes">
            <div className="aba-privacidade__acao-item">
              <div className="aba-privacidade__acao-info">
                <h4>Histórico de buscas</h4>
                <p>Ver e limpar seu histórico de buscas recentes</p>
              </div>
              <button
                type="button"
                className="botao botao--secundario"
                onClick={() => {}}
                disabled={carregando}
                data-testid="btn-historico-buscas"
              >
                Gerenciar
              </button>
            </div>

            <div className="aba-privacidade__acao-item">
              <div className="aba-privacidade__acao-info">
                <h4>Dados de localização</h4>
                <p>Ver e excluir dados de localização salvos</p>
              </div>
              <button
                type="button"
                className="botao botao--secundario"
                onClick={() => {}}
                disabled={carregando}
                data-testid="btn-dados-localizacao"
              >
                Gerenciar
              </button>
            </div>

            <div className="aba-privacidade__acao-item">
              <div className="aba-privacidade__acao-info">
                <h4>Cookies e armazenamento</h4>
                <p>Gerenciar cookies e dados de armazenamento local</p>
              </div>
              <button
                type="button"
                className="botao botao--secundario"
                onClick={() => {}}
                disabled={carregando}
                data-testid="btn-cookies"
              >
                Gerenciar
              </button>
            </div>
          </div>
        </CartaoCorpo>
      </Cartao>
    </div>
  );
};

export default AbaPrivacidade;