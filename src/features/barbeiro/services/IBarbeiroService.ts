/**
 * Interface de contrato para serviço do painel do barbeiro (DIP).
 */

import type { Agendamento, StatusPagamento, Estabelecimento, Servico, ItemGaleria, ResultadoServico, ConfiguracaoPix } from '@/tipos';

export interface IBarbeiroService {
  // Dashboard
  obterDashboard(): Promise<ResultadoServico<{
    agendamentosHoje: number;
    proximosAgendamentos: Agendamento[];
    filaAtual: number;
    faturamentoMes: number;
  }>>;

  // Estatísticas
  obterEstatisticas(): Promise<ResultadoServico<{
    totalAgendamentos: number;
    agendamentosConfirmados: number;
    agendamentosCancelados: number;
    agendamentosConcluidos: number;
    faturamentoTotal: number;
    ticketMedio: number;
    servicosMaisPopulares: Array<{ servico: string; quantidade: number }>;
    avaliacaoMedia: number;
  }>>;

  // Agendamentos do barbeiro
  listarAgendamentos(estabelecimentoId: string, filtros?: {
    status?: StatusPagamento;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<ResultadoServico<Agendamento[]>>;
  atualizarStatus(agendamentoId: string, status: StatusPagamento): Promise<ResultadoServico<void>>;
  cancelar(agendamentoId: string): Promise<ResultadoServico<void>>;
  definirHorarioReal(agendamentoId: string, horarioReal: string): Promise<ResultadoServico<void>>;

  // Serviços
  listarServicos(estabelecimentoId: string): Promise<ResultadoServico<Servico[]>>;
  criarServico(estabelecimentoId: string, servico: Omit<Servico, 'id'>): Promise<ResultadoServico<Servico>>;
  atualizarServico(estabelecimentoId: string, servicoId: string, dados: Partial<Servico>): Promise<ResultadoServico<Servico>>;
  excluirServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<void>>;

  // Galeria
  listarGaleria(estabelecimentoId: string): Promise<ResultadoServico<ItemGaleria[]>>;
  adicionarGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>>;
  removerGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>>;

  // Configurações do estabelecimento
  obterEstabelecimento(id: string): Promise<ResultadoServico<Estabelecimento | null>>;
  atualizarEstabelecimento(id: string, dados: Partial<Estabelecimento>): Promise<ResultadoServico<Estabelecimento>>;
  atualizarConfiguracaoPix(id: string, config: ConfiguracaoPix): Promise<ResultadoServico<ConfiguracaoPix>>;
  atualizarMensagensAutomaticas(id: string, mensagens: Record<string, unknown>): Promise<ResultadoServico<Record<string, unknown>>>;
  atualizarTema(id: string, tema: { cor?: string; layout?: string; titulo?: string; subtitulo?: string }): Promise<ResultadoServico<Estabelecimento>>;
  atualizarHorarioFuncionamento(id: string, horario: string): Promise<ResultadoServico<Estabelecimento>>;
  definirAutoEdicao(id: string, permitido: boolean): Promise<ResultadoServico<void>>;
}