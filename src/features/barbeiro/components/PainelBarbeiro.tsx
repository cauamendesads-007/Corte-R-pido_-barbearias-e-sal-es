/**
 * PainelBarbeiro - Dashboard principal do barbeiro/estabelecimento.
 * Compose todos os sub-componentes do feature barbeiro.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAgendamentosBarbeiro } from '@/hooks/useAgendamentos';
import { Container, ToastProvider, Avatar, BotaoIcone, BotaoSecundario, useGlobalToast } from '@/componentes';
import { ICONES } from '@/constantes';
import type { AbaPainelBarbeiro, Servico } from '../types';
import { MetricasBarbeiro } from './MetricasBarbeiro';
import { AbasPainelBarbeiro } from './AbasPainelBarbeiro';
import { PainelAgendaBarbeiro } from './PainelAgendaBarbeiro';
import { PainelServicosBarbeiro } from './PainelServicosBarbeiro';
import { PainelFilaBarbeiro } from './PainelFilaBarbeiro';
import { PainelGaleriaBarbeiro } from './PainelGaleriaBarbeiro';
import { PainelConfiguracoesBarbeiro } from './PainelConfiguracoesBarbeiro';
import './PainelBarbeiro.css';

const PainelBarbeiro = () => {
  const { usuario } = useAuth();
  const { sucesso } = useGlobalToast();

  const [abaAtiva, setAbaAtiva] = useState<AbaPainelBarbeiro>('visao');
  const [servicos, setServicos] = useState<Servico[]>([
    { id: '1', nome: 'Corte masculino', preco: 45, duracaoMinutos: 30, tag: 'Corte', descricao: 'Corte clássico ou moderno com tesoura e máquina' },
    { id: '2', nome: 'Barba', preco: 30, duracaoMinutos: 20, tag: 'Barba', descricao: 'Aparar, modelar e hidratar a barba' },
    { id: '3', nome: 'Corte + Barba', preco: 65, duracaoMinutos: 45, tag: 'Combo', descricao: 'Corte completo + barba com toalha quente' },
    { id: '4', nome: 'Sobrancelha', preco: 20, duracaoMinutos: 15, tag: 'Estética', descricao: 'Design e depilação de sobrancelha' },
  ]);

  const { agendamentos, carregando, filtros, setFiltros, cancelar } = useAgendamentosBarbeiro(usuario?.estabelecimentoId);

  // Métricas calculadas
  const hoje = new Date().toISOString().split('T')[0];
  const agendamentosHoje = agendamentos.filter((a) => a.dia === hoje);
  const agendamentosPendentes = agendamentosHoje.filter((a) => ['aguardando_pix', 'no_local'].includes(a.statusPagamento));
  const agendamentosConfirmados = agendamentosHoje.filter((a) => a.statusPagamento === 'pago');
  const filaAtual = agendamentosHoje.filter((a) => !['cancelado', 'concluido'].includes(a.status)).length;

  const metricas = useMemo(() => ({
    agendamentosHoje: agendamentosHoje.length,
    confirmados: agendamentosConfirmados.length,
    pendentes: agendamentosPendentes.length,
    filaAtual,
  }), [agendamentosHoje, agendamentosConfirmados, agendamentosPendentes, filaAtual]);

  const abasConfig = useMemo(() => [
    { id: 'visao' as AbaPainelBarbeiro, contador: undefined },
    { id: 'agenda' as AbaPainelBarbeiro, contador: agendamentosHoje.length },
    { id: 'servicos' as AbaPainelBarbeiro, contador: servicos.length },
    { id: 'fila' as AbaPainelBarbeiro, contador: filaAtual },
    { id: 'galeria' as AbaPainelBarbeiro, contador: undefined },
    { id: 'configuracoes' as AbaPainelBarbeiro, contador: undefined },
  ], [agendamentosHoje.length, servicos.length, filaAtual]);

  const handleAdicionarServico = (servico: Omit<Servico, 'id'>) => {
    const novoServico = { ...servico, id: Date.now().toString() };
    setServicos((prev) => [...prev, novoServico]);
    sucesso('Serviço criado!');
  };

  const handleAtualizarServico = (servico: Servico) => {
    setServicos((prev) => prev.map((s) => (s.id === servico.id ? servico : s)));
    sucesso('Serviço atualizado!');
  };

  const handleExcluirServico = (id: string) => {
    setServicos((prev) => prev.filter((s) => s.id !== id));
    sucesso('Serviço excluído!');
  };

  if (!usuario || usuario.papel !== 'barbeiro') {
    return (
      <Container variante="com-cabecalho">
        <div className="painel__acesso-negado" data-testid="painel-acesso-negado">
          <h1>Acesso restrito</h1>
          <p>Esta área é exclusiva para barbeiros cadastrados.</p>
        </div>
      </Container>
    );
  }

  return (
    <ToastProvider>
      <Container variante="com-cabecalho" data-testid="painel-barbeiro-container">
        {/* Header */}
        <header className="painel__cabecalho" data-testid="painel-cabecalho">
          <div className="painel__info">
            <h1 className="painel__titulo">Painel do Barbeiro</h1>
            <p className="painel__subtitulo">{usuario.nome || 'Seu estabelecimento'}</p>
          </div>
          <div className="painel__acoes">
            <BotaoIcone
              icone={ICONES.sino}
              variante="fantasma"
              aoClicar={() => window.location.href = '/notificacoes'}
              ariaLabel="Notificações"
              data-testid="painel-btn-notificacoes"
            />
            <Avatar
              src={usuario.avatar}
              nome={usuario.nome}
              corFundo="#64748b"
              tamanho="pequeno"
              data-testid="painel-avatar"
            />
          </div>
        </header>

        {/* Visão Geral - Métricas */}
        {abaAtiva === 'visao' && (
          <MetricasBarbeiro metricas={metricas} />
        )}

        {/* Visão Geral - Próximos agendamentos */}
        {abaAtiva === 'visao' && agendamentosHoje.length > 0 && (
          <section className="painel__secao" data-testid="painel-proximos">
            <div className="painel__secao-cabecalho">
              <h2>Próximos agendamentos</h2>
              <BotaoSecundario tamanho="pequeno" aoClicar={() => setAbaAtiva('agenda')}>Ver todos</BotaoSecundario>
            </div>
            <div className="painel__lista" role="list" data-testid="painel-proximos-lista">
              {agendamentosHoje.slice(0, 5).map((agendamento) => (
                <div key={agendamento.id} className="painel__agendamento-item" data-testid={`painel-proximo-${agendamento.id}`}>
                  <div className="painel__agendamento-info">
                    <strong>{agendamento.nomeCliente}</strong>
                    <span>{agendamento.horario} - {agendamento.servicos}</span>
                  </div>
                  <span className={`painel__status-${agendamento.statusPagamento}`}>
                    {agendamento.statusPagamento === 'pago' ? '✓ Pago' : agendamento.statusPagamento === 'aguardando_pix' ? '⏳ Aguardando Pix' : '💰 No local'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Abas */}
        <AbasPainelBarbeiro
          abaAtiva={abaAtiva}
          onMudarAba={setAbaAtiva}
          abas={abasConfig}
        />

        {/* Painéis por aba */}
        <PainelAgendaBarbeiro
          agendamentos={agendamentos}
          carregando={carregando}
          filtros={filtros}
          onFiltroChange={setFiltros}
          onCancelar={cancelar}
          onVerTodos={() => setAbaAtiva('agenda')}
        />

        <PainelServicosBarbeiro
          servicos={servicos}
          onAdicionar={handleAdicionarServico}
          onAtualizar={handleAtualizarServico}
          onExcluir={handleExcluirServico}
        />

        <PainelFilaBarbeiro
          agendamentosHoje={agendamentosHoje}
          onCancelar={cancelar}
        />

        <PainelGaleriaBarbeiro />

        <PainelConfiguracoesBarbeiro usuario={usuario} />
      </Container>
    </ToastProvider>
  );
};

export default PainelBarbeiro;