/**
 * Hook useAgendamentos - Gerenciamento de agendamentos com injeção de dependência.
 * Encapsula estado, efeitos colaterais e delega regras de negócio para services/rules.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { IAgendamentoService } from '../services';
import { agendamentoService } from '../services';
import type {
  Agendamento,
  Servico,
  CriarAgendamentoInput,
  ReagendarInput,
  AvaliarInput,
  AtualizarStatusInput,
  AgendamentoFiltros,
  Paginacao,
  Result,
  AgendamentosContext,
  AgendamentoComputado,
} from '../types';
import {
  ordenarAgendamentos,
  computarAgendamento,
  isHorarioPassado,
} from '../rules';

const ITENS_POR_PAGINA = 10;

/** Opções do hook */
export interface UseAgendamentosOptions {
  /** Serviço injetável (DIP) */
  service?: IAgendamentoService;
  /** Filtros iniciais */
  filtrosIniciais?: AgendamentoFiltros;
  /** Callback ao criar agendamento */
  onCriar?: (agendamento: Agendamento) => void;
  /** Callback ao cancelar */
  onCancelar?: (agendamentoId: string) => void;
}

/** Hook para agendamentos do cliente */
export function useAgendamentos(options: UseAgendamentosOptions = {}): AgendamentosContext {
  const {
    service = agendamentoService,
    filtrosIniciais = {},
    onCriar,
    onCancelar,
  } = options;

  const { usuario } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [paginacao, setPaginacao] = useState<Paginacao>({
    pagina: 1,
    itensPorPagina: ITENS_POR_PAGINA,
    total: 0,
    temMais: true,
  });
  const [filtros, setFiltros] = useState<AgendamentoFiltros>(filtrosIniciais);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Limpa erro
  const limparErro = useCallback(() => setErro(null), []);

  // Recarrega lista
  const recarregar = useCallback(async () => {
    if (!usuario) {
      setAgendamentos([]);
      setPaginacao((prev) => ({ ...prev, total: 0, temMais: false }));
      return;
    }

    // Cancela requisição anterior se houver
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setCarregando(true);
    setErro(null);
    setPaginacao((prev) => ({ ...prev, pagina: 1 }));

    try {
      const resposta = await service.listar({ ...filtros, usuarioId: usuario.email });

      if (resposta.sucesso && resposta.dados) {
        const todos = ordenarAgendamentos(resposta.dados);
        const itens = todos.slice(0, ITENS_POR_PAGINA);
        const haMais = todos.length > ITENS_POR_PAGINA;

        setAgendamentos(itens);
        setPaginacao({
          pagina: 1,
          itensPorPagina: ITENS_POR_PAGINA,
          total: todos.length,
          temMais: haMais,
        });
      } else {
        setErro('erro' in resposta ? resposta.erro : 'Erro ao carregar agendamentos');
        setAgendamentos([]);
        setPaginacao((prev) => ({ ...prev, total: 0, temMais: false }));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setErro('Erro de conexão. Tente novamente.');
      setAgendamentos([]);
      setPaginacao((prev) => ({ ...prev, total: 0, temMais: false }));
    } finally {
      setCarregando(false);
    }
  }, [usuario, service, filtros]);

  // Carrega mais (paginação)
  const carregarMais = useCallback(async () => {
    if (!usuario || carregando || !paginacao.temMais) return;

    const proximaPagina = paginacao.pagina + 1;
    setCarregando(true);

    try {
      const resposta = await service.listar({ ...filtros, usuarioId: usuario.email });

      if (resposta.sucesso && resposta.dados) {
        const todos = ordenarAgendamentos(resposta.dados);
        const inicio = (proximaPagina - 1) * ITENS_POR_PAGINA;
        const fim = inicio + ITENS_POR_PAGINA;
        const itens = todos.slice(inicio, fim);
        const haMais = fim < todos.length;

        setAgendamentos((prev) => [...prev, ...itens]);
        setPaginacao({
          pagina: proximaPagina,
          itensPorPagina: ITENS_POR_PAGINA,
          total: todos.length,
          temMais: haMais,
        });
      }
    } catch {
      // Silencioso em paginação
    } finally {
      setCarregando(false);
    }
  }, [usuario, service, filtros, carregando, paginacao]);

  // Efeito de carregamento inicial
  useEffect(() => {
    recarregar();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [recarregar]);

  // Efeito de mudança de filtros
  useEffect(() => {
    if (usuario) {
      recarregar();
    }
  }, [filtros, usuario]);

  // Criar agendamento
  const criar = useCallback(async (input: CriarAgendamentoInput): Promise<Result<Agendamento>> => {
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };

    setErro(null);

    try {
      const resposta = await service.criar(input);

      if (resposta.sucesso && resposta.dados) {
        setAgendamentos((prev) => ordenarAgendamentos([resposta.dados!, ...prev]));
        setPaginacao((prev) => ({ ...prev, total: prev.total + 1 }));
        onCriar?.(resposta.dados);
        return { sucesso: true, dados: resposta.dados };
      }

      return { sucesso: false, erro: 'erro' in resposta ? resposta.erro : 'Erro ao criar agendamento' };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [usuario, service, onCriar]);

  // Reagendar
  const reagendar = useCallback(async (input: ReagendarInput): Promise<Result<void>> => {
    setErro(null);

    try {
      const resposta = await service.reagendar(input);

      if (resposta.sucesso && resposta.dados) {
        setAgendamentos((prev) =>
          ordenarAgendamentos(prev.map((a) => (a.id === input.agendamentoId ? resposta.dados! : a)))
        );
        return { sucesso: true, dados: undefined };
      }

      return { sucesso: false, erro: 'erro' in resposta ? resposta.erro : 'Erro ao reagendar' };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [service]);

  // Cancelar
  const cancelar = useCallback(async (agendamentoId: string): Promise<Result<void>> => {
    setErro(null);

    try {
      const resposta = await service.cancelar(agendamentoId);

      if (resposta.sucesso) {
        setAgendamentos((prev) => prev.filter((a) => a.id !== agendamentoId));
        setPaginacao((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
        onCancelar?.(agendamentoId);
        return { sucesso: true, dados: undefined };
      }

      return { sucesso: false, erro: 'erro' in resposta ? resposta.erro : 'Erro ao cancelar' };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [service, onCancelar]);

  // Confirmar presença
  const confirmarPresenca = useCallback(async (agendamentoId: string): Promise<Result<void>> => {
    setErro(null);

    try {
      const resposta = await service.confirmarPresenca(agendamentoId);

      if (resposta.sucesso) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === agendamentoId ? { ...a, status: 'confirmado' as const } : a))
        );
        return { sucesso: true, dados: undefined };
      }

      return { sucesso: false, erro: 'erro' in resposta ? resposta.erro : 'Erro ao confirmar presença' };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [service]);

  // Avaliar
  const avaliar = useCallback(async (input: AvaliarInput): Promise<Result<void>> => {
    setErro(null);

    try {
      const resposta = await service.avaliar(input);

      if (resposta.sucesso) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === input.agendamentoId ? { ...a, status: 'concluido' as const } : a))
        );
        return { sucesso: true, dados: undefined };
      }

      return { sucesso: false, erro: 'erro' in resposta ? resposta.erro : 'Erro ao avaliar' };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [service]);

  // Atualizar status (barbeiro)
  const atualizarStatus = useCallback(async (input: AtualizarStatusInput): Promise<Result<void>> => {
    setErro(null);

    try {
      const resposta = await service.atualizarStatus(input);

      if (resposta.sucesso) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === input.agendamentoId ? { ...a, status: input.status } : a))
        );
        return { sucesso: true, dados: undefined };
      }

      return { sucesso: false, erro: 'erro' in resposta ? resposta.erro : 'Erro ao atualizar status' };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [service]);

  // Definir filtros
  const definirFiltros = useCallback((novosFiltros: Partial<AgendamentoFiltros>) => {
    setFiltros((prev) => ({ ...prev, ...novosFiltros }));
  }, []);

  // Computados
  const proximos = useMemo(() =>
    agendamentos
      .filter((a) => !isHorarioPassado(a.dia, a.horario) && !['cancelado', 'concluido', 'nao_compareceu'].includes(a.status))
      .sort((a, b) => new Date(`${a.dia}T${a.horario}`).getTime() - new Date(`${b.dia}T${b.horario}`).getTime()),
    [agendamentos]
  );

  const passados = useMemo(() =>
    agendamentos
      .filter((a) => isHorarioPassado(a.dia, a.horario) || ['cancelado', 'concluido', 'nao_compareceu'].includes(a.status))
      .sort((a, b) => new Date(`${b.dia}T${b.horario}`).getTime() - new Date(`${a.dia}T${a.horario}`).getTime()),
    [agendamentos]
  );

  // Memoiza contexto
  const contexto = useMemo<AgendamentosContext>(() => ({
    agendamentos,
    proximos,
    passados,
    carregando,
    erro,
    paginacao,
    filtros,
    criar,
    reagendar,
    cancelar,
    confirmarPresenca,
    avaliar,
    atualizarStatus,
    recarregar,
    carregarMais,
    definirFiltros,
    limparErro,
  }), [
    agendamentos,
    proximos,
    passados,
    carregando,
    erro,
    paginacao,
    filtros,
    criar,
    reagendar,
    cancelar,
    confirmarPresenca,
    avaliar,
    atualizarStatus,
    recarregar,
    carregarMais,
    definirFiltros,
    limparErro,
  ]);

  return contexto;
}

/** Hook para agendamentos do barbeiro (painel) */
export interface UseAgendamentosBarbeiroReturn {
  agendamentos: Agendamento[];
  agendamentosComputados: AgendamentoComputado[];
  carregando: boolean;
  erro: string | null;
  filtros: AgendamentoFiltros;
  setFiltros: (filtros: Partial<AgendamentoFiltros>) => void;
  recarregar: () => Promise<void>;
  atualizarStatus: (agendamentoId: string, status: string, statusPagamento?: string) => Promise<Result<void>>;
  cancelar: (agendamentoId: string) => Promise<Result<void>>;
  definirHorarioReal: (agendamentoId: string) => Promise<Result<void>>;
  limparErro: () => void;
  servicosDisponiveis: Servico[];
  estatisticas: {
    hoje: number;
    semana: number;
    pendentes: number;
    confirmados: number;
  };
}

export function useAgendamentosBarbeiro(
  estabelecimentoId?: string,
  options: { service?: IAgendamentoService } = {}
): UseAgendamentosBarbeiroReturn {
  const { service = agendamentoService } = options;
  const { usuario } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [servicosDisponiveis, setServicosDisponiveis] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltrosEstado] = useState<AgendamentoFiltros>({});

  const limparErro = useCallback(() => setErro(null), []);

  const recarregar = useCallback(async () => {
    if (!usuario || usuario.papel !== 'barbeiro' || !estabelecimentoId) return;

    setCarregando(true);
    setErro(null);

    try {
      const [agendamentosResposta, servicosResposta] = await Promise.all([
        service.listar({ estabelecimentoId }),
        service.listarServicos(estabelecimentoId),
      ]);

      if (agendamentosResposta.sucesso && agendamentosResposta.dados) {
        let filtrados = ordenarAgendamentos(agendamentosResposta.dados);

        if (filtros.status) {
          filtrados = filtrados.filter((a) => a.status === filtros.status);
        }
        if (filtros.statusPagamento) {
          filtrados = filtrados.filter((a) => a.statusPagamento === filtros.statusPagamento);
        }
        if (filtros.dataInicio) {
          filtrados = filtrados.filter((a) => a.dia >= filtros.dataInicio!);
        }
        if (filtros.dataFim) {
          filtrados = filtrados.filter((a) => a.dia <= filtros.dataFim!);
        }

        setAgendamentos(filtrados);
      } else {
        setErro('erro' in agendamentosResposta ? agendamentosResposta.erro : 'Erro ao carregar agendamentos');
        setAgendamentos([]);
      }

      if (servicosResposta.sucesso && servicosResposta.dados) {
        setServicosDisponiveis(servicosResposta.dados);
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
      setAgendamentos([]);
    } finally {
      setCarregando(false);
    }
  }, [usuario, estabelecimentoId, service, filtros]);

  useEffect(() => {
    if (usuario?.papel === 'barbeiro' && estabelecimentoId) {
      recarregar();
    }
  }, [usuario, recarregar, filtros, estabelecimentoId]);

  const setFiltros = useCallback((novosFiltros: Partial<AgendamentoFiltros>) => {
    setFiltrosEstado((prev) => ({ ...prev, ...novosFiltros }));
  }, []);

  const atualizarStatus = useCallback(async (agendamentoId: string, status: string, statusPagamento?: string): Promise<Result<void>> => {
    setErro(null);

    try {
      const agendamento = agendamentos.find((a) => a.id === agendamentoId);
      if (!agendamento) return { sucesso: false, erro: 'Agendamento não encontrado' };

      const resposta = await service.atualizarStatus({
        agendamentoId,
        status: status as any,
        statusPagamento: statusPagamento as any,
      });

      if (resposta.sucesso) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === agendamentoId ? { ...a, status: status as any, statusPagamento: statusPagamento as any } : a))
        );
        return { sucesso: true, dados: undefined };
      }

      return { sucesso: false, erro: 'erro' in resposta ? resposta.erro : 'Erro ao atualizar status' };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [agendamentos, service]);

  const cancelar = useCallback(async (agendamentoId: string): Promise<Result<void>> => {
    setErro(null);

    try {
      const agendamento = agendamentos.find((a) => a.id === agendamentoId);
      if (!agendamento) return { sucesso: false, erro: 'Agendamento não encontrado' };

      const resposta = await service.cancelar(agendamentoId);

      if (resposta.sucesso) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === agendamentoId ? { ...a, status: 'cancelado' as const } : a))
        );
        return { sucesso: true, dados: undefined };
      }

      return { sucesso: false, erro: 'erro' in resposta ? resposta.erro : 'Erro ao cancelar' };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [agendamentos, service]);

  const definirHorarioReal = useCallback(async (agendamentoId: string): Promise<Result<void>> => {
    setErro(null);

    try {
      const agendamento = agendamentos.find((a) => a.id === agendamentoId);
      if (!agendamento) return { sucesso: false, erro: 'Agendamento não encontrado' };

      setAgendamentos((prev) =>
        prev.map((a) => (a.id === agendamentoId ? { ...a, status: 'concluido' as const } : a))
      );
      return { sucesso: true, dados: undefined };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [agendamentos]);

  // Computados com serviços
  const agendamentosComputados = useMemo(() =>
    agendamentos.map((a) => computarAgendamento(a, servicosDisponiveis)),
    [agendamentos, servicosDisponiveis]
  );

  // Estatísticas
  const hoje = new Date().toISOString().split('T')[0];
  const umaSemana = new Date();
  umaSemana.setDate(umaSemana.getDate() + 7);
  const semanaStr = umaSemana.toISOString().split('T')[0];

  const estatisticas = useMemo(() => ({
    hoje: agendamentos.filter((a) => a.dia === hoje).length,
    semana: agendamentos.filter((a) => a.dia >= hoje && a.dia <= semanaStr).length,
    pendentes: agendamentos.filter((a) => a.status === 'agendado').length,
    confirmados: agendamentos.filter((a) => a.status === 'confirmado').length,
  }), [agendamentos, hoje, semanaStr]);

  return {
    agendamentos,
    agendamentosComputados,
    carregando,
    erro,
    filtros,
    setFiltros,
    recarregar,
    atualizarStatus,
    cancelar,
    definirHorarioReal,
    limparErro,
    servicosDisponiveis,
    estatisticas,
  };
}

/** Hook para agendamento único (detalhes) */
export function useAgendamento(agendamentoId: string, options: { service?: IAgendamentoService } = {}) {
  const { service = agendamentoService } = options;
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!agendamentoId) return;

    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.obter(agendamentoId);

      if (resposta.sucesso && resposta.dados) {
        setAgendamento(resposta.dados);
      } else {
        setErro('erro' in resposta ? resposta.erro : 'Agendamento não encontrado');
        setAgendamento(null);
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
      setAgendamento(null);
    } finally {
      setCarregando(false);
    }
  }, [agendamentoId, service]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    agendamento,
    carregando,
    erro,
    recarregar,
    limparErro: () => setErro(null),
  };
}