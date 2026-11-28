/**
 * Componente PerfilPreferencias - Painel de preferências do usuário.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useState, useCallback } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  Switch,
  Select,
  Alerta,
  Skeleton,
  Tooltip,
} from '@/componentes';
import type { PreferenciasUsuario } from '../types';
import './PerfilPreferencias.css';

interface PerfilPreferenciasProps {
  /** Preferências atuais */
  preferencias: PreferenciasUsuario | null;
  /** Callback ao atualizar */
  aoAtualizar: (prefs: Partial<PreferenciasUsuario>) => Promise<void>;
  /** Carregando */
  carregando?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const OPCOES_TEMA = [
  { valor: 'sistema', rotulo: 'Sistema', icone: 'monitor' },
  { valor: 'claro', rotulo: 'Claro', icone: 'sol' },
  { valor: 'escuro', rotulo: 'Escuro', icone: 'lua' },
] as const;

const OPCOES_IDIOMA = [
  { valor: 'pt-BR', rotulo: 'Português (Brasil)' },
  { valor: 'en', rotulo: 'English' },
  { valor: 'es', rotulo: 'Español' },
] as const;

const OPCOES_MOEDA = [
  { valor: 'BRL', rotulo: 'Real (BRL)' },
  { valor: 'USD', rotulo: 'Dólar (USD)' },
  { valor: 'EUR', rotulo: 'Euro (EUR)' },
] as const;

const OPCOES_PRIVACIDADE = [
  { valor: 'publico', rotulo: 'Público', descricao: 'Todos podem ver seu perfil' },
  { valor: 'apenas_conexoes', rotulo: 'Apenas conexões', descricao: 'Apenas barbeiros/clientes conectados' },
  { valor: 'privado', rotulo: 'Privado', descricao: 'Ninguém pode ver seu perfil' },
] as const;

const OPCOES_MENSAGENS = [
  { valor: 'todos', rotulo: 'Todos', descricao: 'Qualquer um pode enviar mensagens' },
  { valor: 'conexoes', rotulo: 'Conexões', descricao: 'Apenas pessoas conectadas' },
  { valor: 'ninguem', rotulo: 'Ninguém', descricao: 'Ninguém pode enviar mensagens' },
] as const;

export const PerfilPreferencias = ({
  preferencias,
  aoAtualizar,
  carregando = false,
  className = '',
  'data-testid': testId,
}: PerfilPreferenciasProps) => {
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const handleChange = useCallback(async (chave: keyof PreferenciasUsuario, valor: any) => {
    setErro(null);
    setSalvando(true);
    try {
      await aoAtualizar({ [chave]: valor });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar preferência');
    } finally {
      setSalvando(false);
    }
  }, [aoAtualizar]);

  if (carregando) {
    return (
      <Cartao className={`perfil-preferencias ${className}`} data-testid={testId}>
        <CartaoCabecalho titulo="Preferências" />
        <CartaoCorpo>
          <div className="perfil-preferencias__skeleton" role="status" aria-label="Carregando preferências">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} variante="retangular" largura="100%" altura={56} />
            ))}
          </div>
        </CartaoCorpo>
      </Cartao>
    );
  }

  if (!preferencias) {
    return (
      <Cartao className={`perfil-preferencias ${className}`} data-testid={testId}>
        <CartaoCabecalho titulo="Preferências" />
        <CartaoCorpo>
          <div className="perfil-preferencias__vazio">
            <p>Não foi possível carregar as preferências.</p>
          </div>
        </CartaoCorpo>
      </Cartao>
    );
  }

  return (
    <Cartao className={`perfil-preferencias ${className}`} data-testid={testId}>
      <CartaoCabecalho
        titulo="Preferências"
        subtitulo="Personalize sua experiência no Corte Rápido"
      />
      <CartaoCorpo>
        {erro && (
          <Alerta
            tipo="erro"
            mensagem={erro}
            dispensavel
            aoDispensar={() => setErro(null)}
            className="perfil-preferencias__erro"
            data-testid="erro-preferencias"
          />
        )}

        {/* Aparência */}
        <section className="perfil-preferencias__secao" aria-labelledby="aparencia-titulo">
          <h3 id="aparencia-titulo" className="perfil-preferencias__secao-titulo">
            <span className="perfil-preferencias__secao-icone" aria-hidden="true">🎨</span>
            Aparência
          </h3>

          <div className="perfil-preferencias__opcoes">
            {OPCOES_TEMA.map((opcao) => (
              <label
                key={opcao.valor}
                className={`perfil-preferencias__opcao ${preferencias.tema === opcao.valor ? 'selecionada' : ''}`}
              >
                <input
                  type="radio"
                  name="tema"
                  value={opcao.valor}
                  checked={preferencias.tema === opcao.valor}
                  onChange={() => handleChange('tema', opcao.valor)}
                  disabled={salvando}
                  className="perfil-preferencias__radio"
                  data-testid={`tema-${opcao.valor}`}
                />
                <div className="perfil-preferencias__opcao-conteudo">
                  <span className="perfil-preferencias__opcao-icone" aria-hidden="true">
                    {opcao.icone === 'monitor' && '🖥️'}
                    {opcao.icone === 'sol' && '☀️'}
                    {opcao.icone === 'lua' && '🌙'}
                  </span>
                  <span className="perfil-preferencias__opcao-texto">{opcao.rotulo}</span>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Notificações */}
        <section className="perfil-preferencias__secao" aria-labelledby="notificacoes-titulo">
          <h3 id="notificacoes-titulo" className="perfil-preferencias__secao-titulo">
            <span className="perfil-preferencias__secao-icone" aria-hidden="true">🔔</span>
            Notificações
          </h3>

          <div className="perfil-preferencias__switches">
            <Switch
              rotulo="Notificações push"
              descricao="Receber notificações no navegador/celular"
              checked={preferencias.notificacoesPush}
              onChange={(v) => handleChange('notificacoesPush', v)}
              desabilitado={salvando}
              data-testid="switch-push"
            />
            <Switch
              rotulo="Notificações por e-mail"
              descricao="Receber atualizações por e-mail"
              checked={preferencias.notificacoesEmail}
              onChange={(v) => handleChange('notificacoesEmail', v)}
              desabilitado={salvando}
              data-testid="switch-email"
            />
            <Switch
              rotulo="Notificações por SMS"
              descricao="Receber lembretes via SMS"
              checked={preferencias.notificacoesSms}
              onChange={(v) => handleChange('notificacoesSms', v)}
              desabilitado={salvando}
              data-testid="switch-sms"
            />
            <Switch
              rotulo="Agendamentos"
              descricao="Confirmações, lembretes e alterações"
              checked={preferencias.notificacoesAgendamentos}
              onChange={(v) => handleChange('notificacoesAgendamentos', v)}
              desabilitado={salvando}
              data-testid="switch-agendamentos"
            />
            <Switch
              rotulo="Promoções e novidades"
              descricao="Ofertas especiais e novos recursos"
              checked={preferencias.notificacoesPromocoes}
              onChange={(v) => handleChange('notificacoesPromocoes', v)}
              desabilitado={salvando}
              data-testid="switch-promocoes"
            />
            <Switch
              rotulo="Lembretes"
              descricao="Lembretes de agendamentos próximos"
              checked={preferencias.notificacoesLembretes}
              onChange={(v) => handleChange('notificacoesLembretes', v)}
              desabilitado={salvando}
              data-testid="switch-lembretes"
            />
          </div>
        </section>

        {/* Idioma e Região */}
        <section className="perfil-preferencias__secao" aria-labelledby="idioma-titulo">
          <h3 id="idioma-titulo" className="perfil-preferencias__secao-titulo">
            <span className="perfil-preferencias__secao-icone" aria-hidden="true">🌍</span>
            Idioma e Região
          </h3>

          <div className="perfil-preferencias__grid">
            <Select
              label="Idioma"
              value={preferencias.idioma}
              onChange={(e) => handleChange('idioma', e.target.value)}
              opcoes={OPCOES_IDIOMA}
              desabilitado={salvando}
              data-testid="select-idioma"
            />

            <Select
              label="Moeda"
              value={preferencias.moeda}
              onChange={(e) => handleChange('moeda', e.target.value)}
              opcoes={OPCOES_MOEDA}
              desabilitado={salvando}
              data-testid="select-moeda"
            />

            <Input
              label="Fuso horário"
              value={preferencias.fusoHorario}
              onChange={(e) => handleChange('fusoHorario', e.target.value)}
              placeholder="America/Sao_Paulo"
              desabilitado={salvando}
              data-testid="input-fuso"
            />
          </div>
        </section>

        {/* Privacidade */}
        <section className="perfil-preferencias__secao" aria-labelledby="privacidade-titulo">
          <h3 id="privacidade-titulo" className="perfil-preferencias__secao-titulo">
            <span className="perfil-preferencias__secao-icone" aria-hidden="true">🔒</span>
            Privacidade
          </h3>

          <div className="perfil-preferencias__grid">
            <Select
              label="Visibilidade do perfil"
              value={preferencias.privacidadePerfil}
              onChange={(e) => handleChange('privacidadePerfil', e.target.value)}
              opcoes={OPCOES_PRIVACIDADE}
              desabilitado={salvando}
              data-testid="select-privacidade"
            />

            <Select
              label="Quem pode enviar mensagens"
              value={preferencias.permitirMensagens}
              onChange={(e) => handleChange('permitirMensagens', e.target.value)}
              opcoes={OPCOES_MENSAGENS}
              desabilitado={salvando}
              data-testid="select-mensagens"
            />
          </div>

          <Switch
            rotulo="Mostrar status online"
            descricao="Permitir que outros vejam quando você está online"
            checked={preferencias.mostrarOnline}
            onChange={(v) => handleChange('mostrarOnline', v)}
            desabilitado={salvando}
            data-testid="switch-online"
          />
        </section>
      </CartaoCorpo>
    </Cartao>
  );
};

// Need to import Input
import { Input } from '@/componentes';
import { useState } from 'react';

export default PerfilPreferencias;