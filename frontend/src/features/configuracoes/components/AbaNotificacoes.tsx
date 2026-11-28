/**
 * Aba Notificações - Configurações de push, e-mail e SMS.
 */

import { useCallback } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  CheckboxToggle,
  Divisor,
  CampoTexto,
} from '@/componentes';
import type { ConfiguracoesNotificacoes } from '../types';
import './AbaNotificacoes.css';

interface AbaNotificacoesProps {
  notificacoes: ConfiguracoesNotificacoes | null;
  carregando: boolean;
  aoAtualizar: (dados: Partial<ConfiguracoesNotificacoes>) => Promise<void>;
}

export const AbaNotificacoes = ({
  notificacoes,
  carregando,
  aoAtualizar,
}: AbaNotificacoesProps) => {
  const handleChange = useCallback(<K extends keyof ConfiguracoesNotificacoes>(campo: K, valor: ConfiguracoesNotificacoes[K]) => {
    aoAtualizar({ [campo]: valor });
  }, [aoAtualizar]);

  if (!notificacoes) return null;

  // Helper to determine if a dependent switch should be disabled
  const isSwitchDisabled = (chave: string): boolean => {
    if (carregando) return true;
    const masterKeys = ['pushAtivo', 'emailAtivo', 'smsAtivo'];
    if (masterKeys.includes(chave)) return false;
    const masterKey = chave.replace('Ativo', '').toLowerCase() as keyof ConfiguracoesNotificacoes;
    return !notificacoes[masterKey];
  };

  const secoes = [
    {
      titulo: 'Notificações Push',
      descricao: 'Receba alertas instantâneos no navegador e celular',
      icone: 'sino',
      itens: [
        { chave: 'pushAtivo' as const, rotulo: 'Ativar notificações push', descricao: 'Mestre para todas as notificações push' },
        { chave: 'pushAgendamentos' as const, rotulo: 'Agendamentos', descricao: 'Confirmações, alterações e cancelamentos' },
        { chave: 'pushLembretes' as const, rotulo: 'Lembretes', descricao: 'Lembretes de agendamentos próximos' },
        { chave: 'pushPromocoes' as const, rotulo: 'Promoções', descricao: 'Ofertas especiais e novidades' },
        { chave: 'pushAvaliacoes' as const, rotulo: 'Avaliações', descricao: 'Pedidos de avaliação após atendimentos' },
        { chave: 'pushMensagens' as const, rotulo: 'Mensagens', descricao: 'Novas mensagens e conversas' },
        { chave: 'pushSistema' as const, rotulo: 'Sistema', descricao: 'Atualizações importantes e alertas de segurança' },
      ],
    },
    {
      titulo: 'Notificações por E-mail',
      descricao: 'Receba atualizações por e-mail',
      icone: 'email',
      itens: [
        { chave: 'emailAtivo' as const, rotulo: 'Ativar notificações por e-mail', descricao: 'Mestre para todas as notificações por e-mail' },
        { chave: 'emailAgendamentos' as const, rotulo: 'Agendamentos', descricao: 'Confirmações, alterações e cancelamentos' },
        { chave: 'emailLembretes' as const, rotulo: 'Lembretes', descricao: 'Lembretes de agendamentos próximos' },
        { chave: 'emailPromocoes' as const, rotulo: 'Promoções', descricao: 'Ofertas especiais e novidades' },
        { chave: 'emailAvaliacoes' as const, rotulo: 'Avaliações', descricao: 'Pedidos de avaliação após atendimentos' },
        { chave: 'emailMensagens' as const, rotulo: 'Mensagens', descricao: 'Resumo de mensagens não lidas' },
        { chave: 'emailRelatorios' as const, rotulo: 'Relatórios', descricao: 'Relatórios mensais de atividade (para barbeiros)' },
        { chave: 'emailSeguranca' as const, rotulo: 'Segurança', descricao: 'Alertas de login, alterações de senha e 2FA' },
      ],
    },
    {
      titulo: 'Notificações por SMS',
      descricao: 'Receba alertas importantes via SMS',
      icone: 'mensagem',
      itens: [
        { chave: 'smsAtivo' as const, rotulo: 'Ativar notificações por SMS', descricao: 'Mestre para todas as notificações por SMS' },
        { chave: 'smsAgendamentos' as const, rotulo: 'Agendamentos', descricao: 'Confirmações e lembretes de horários' },
        { chave: 'smsLembretes' as const, rotulo: 'Lembretes urgentes', descricao: 'Lembretes de última hora' },
        { chave: 'smsCodigos' as const, rotulo: 'Códigos de verificação', descricao: 'Códigos de 2FA e recuperação de conta' },
      ],
    },
  ];

  const renderSecao = (secao: typeof secoes[0], isFirst: boolean) => (
    <>
      {!isFirst && <Divisor />}
      <Cartao className="aba-notificacoes__cartao">
        <CartaoCabecalho>
          <h3>{secao.titulo}</h3>
          <p>{secao.descricao}</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-notificacoes__switches">
            {secao.itens.map((item) => (
              <CheckboxToggle
                key={item.chave}
                rotulo={item.rotulo}
                descricao={item.descricao}
                verificado={notificacoes[item.chave] as boolean}
                aoAlterar={(v) => handleChange(item.chave, v as ConfiguracoesNotificacoes[typeof item.chave])}
                desabilitado={isSwitchDisabled(item.chave)}
                data-testid={`switch-${item.chave}`}
              />
            ))}
          </div>
        </CartaoCorpo>
      </Cartao>
    </>
  );

  return (
    <div className="aba-notificacoes" data-testid="aba-notificacoes">
      {secoes.map((secao, i) => renderSecao(secao, i === 0))}

      <Divisor />

      {/* Horários */}
      <Cartao className="aba-notificacoes__cartao">
        <CartaoCabecalho>
          <h3>Horários de silêncio</h3>
          <p>Configure quando não receber notificações</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-notificacoes__grid">
            <CampoTexto
              label="Não perturbar - Início"
              tipo="text"
              inputMode="time"
              valor={notificacoes.naoPerturbarInicio || ''}
              aoAlterar={(valor) => handleChange('naoPerturbarInicio', valor)}
              desabilitado={carregando}
              placeholder="HH:mm"
              maxLength={5}
              data-testid="input-nao-perturbar-inicio"
            />
            <CampoTexto
              label="Não perturbar - Fim"
              tipo="text"
              inputMode="time"
              valor={notificacoes.naoPerturbarFim || ''}
              aoAlterar={(valor) => handleChange('naoPerturbarFim', valor)}
              desabilitado={carregando}
              placeholder="HH:mm"
              maxLength={5}
              data-testid="input-nao-perturbar-fim"
            />
            <CampoTexto
              label="Fuso horário das notificações"
              valor={notificacoes.fusoHorarioNotificacoes}
              aoAlterar={(valor) => handleChange('fusoHorarioNotificacoes', valor)}
              placeholder="America/Sao_Paulo"
              desabilitado={carregando}
              data-testid="input-fuso-notificacoes"
            />
          </div>
        </CartaoCorpo>
      </Cartao>
    </div>
  );
};

export default AbaNotificacoes;