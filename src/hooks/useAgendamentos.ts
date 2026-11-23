/**
 * Hook useAgendamentos - Gerenciamento de agendamentos do cliente e barbeiro.
 * CRUD completo, fila, reagendamento, cancelamento, histórico.
 * Usa ServiceProvider (DIP) para injeção de dependência.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAgendamentosService, useEstabelecimentosService } from '@/contexto/ServiceHooks';
import { useAuth } from './useAuth';
import type { Agendamento, StatusPagamento, StatusAgendamento } from '@/tipos';

export interface EstadoAgendamentos {
  agendamentos: Agendamento[];
  proximos: Agendamento[];
  passados: Agendamento[];
  carregando: boolean;
  erro: string | null;
  temMais: boolean;
  pagina: number;
}

export interface AcoesAgendamentos {
  criar: (_dados: {
    estabelecimentoId: string;
    servicosIds: string[];
    dia: string;
    horario: string;
    observacoes?: string;
    formaPagamento: 'no_local' | 'pix';
  }) => Promise<{ sucesso: boolean; agendamento?: Agendamento; erro?: string }>;
  reagendar: (_id: string, _novoDia: string, _novoHorario: string) => Promise<{ sucesso: boolean; erro?: string }>;
  cancelar: (_id: string) => Promise<{ sucesso: boolean; erro?: string }>;
  confirmarPresenca: (_id: string) => Promise<{ sucesso: boolean; erro?: string }>;
  avaliar: (_id: string, _nota: number, _comentario?: string) => Promise<{ sucesso: boolean; erro?: string }>;
  recarregar: () => Promise<void>;
  carregarMais: () => Promise<void>;
  limparErro: () => void;
}

const ITENS_POR_PAGINA = 10;

export const useAgendamentos = (): EstadoAgendamentos & AcoesAgendamentos => {
  const { usuario } = useAuth();
  const agendamentosService = useAgendamentosService();
  const estabelecimentosService = useEstabelecimentosService();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [temMais, setTemMais] = useState(true);
  const [pagina, setPagina] = useState(1);

  const recarregar = useCallback(async () => {
    if (!usuario) return;

    setCarregando(true);
    setErro(null);
    setPagina(1);

    try {
      const resposta = await agendamentosService.listarCliente(usuario.email);

      if (resposta.sucesso && resposta.dados) {
        const todos = resposta.dados;
        const itens = todos.slice(0, ITENS_POR_PAGINA);
        const haMais = todos.length > ITENS_POR_PAGINA;
        setAgendamentos(itens);
        setTemMais(haMais);
      } else {
        setErro(resposta.erro || 'Erro ao carregar agendamentos');
        setAgendamentos([]);
        setTemMais(false);
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
      setAgendamentos([]);
      setTemMais(false);
    } finally {
      setCarregando(false);
    }
  }, [usuario, agendamentosService]);

  useEffect(() => {
    if (usuario) {
      recarregar();
    } else {
      setAgendamentos([]);
      setTemMais(false);
    }
  }, [usuario, recarregar]);

  const carregarMais = useCallback(async () => {
    if (!usuario || carregando || !temMais) return;

    const proximaPagina = pagina + 1;
    setCarregando(true);

    try {
      const resposta = await agendamentosService.listarCliente(usuario.email);

      if (resposta.sucesso && resposta.dados) {
        const todos = resposta.dados;
        const inicio = (proximaPagina - 1) * ITENS_POR_PAGINA;
        const fim = inicio + ITENS_POR_PAGINA;
        const itens = todos.slice(inicio, fim);
        const haMais = fim < todos.length;

        setAgendamentos((prev) => [...prev, ...itens]);
        setPagina(proximaPagina);
        setTemMais(haMais);
      }
    } catch {
      // Silencioso
    } finally {
      setCarregando(false);
    }
  }, [usuario, carregando, temMais, pagina, agendamentosService]);

  const criar = useCallback(async (dados: {
    estabelecimentoId: string;
    servicosIds: string[];
    dia: string;
    horario: string;
    observacoes?: string;
    formaPagamento: 'no_local' | 'pix';
  }) => {
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };

    setErro(null);

    try {
      // Busca detalhes dos serviços para calcular valor total
      const estResposta = await estabelecimentosService.obter(dados.estabelecimentoId);
      if (!estResposta.sucesso || !estResposta.dados) {
        return { sucesso: false, erro: 'Estabelecimento não encontrado' };
      }
      const estabelecimento = estResposta.dados;

      const servicos = estabelecimento.servicos.filter((s) => dados.servicosIds.includes(s.id));
      const valorTotal = servicos.reduce((acc, s) => acc + s.preco, 0);
      const duracaoMinutos = servicos.reduce((acc, s) => acc + s.duracaoMinutos, 0);
      const servicosNomes = servicos.map((s) => s.nome).join(' + ');

      const resposta = await agendamentosService.criar({
        estabelecimentoId: dados.estabelecimentoId,
        usuarioId: usuario.email,
        dia: dados.dia,
        horario: dados.horario,
        duracaoMinutos,
        nomeCliente: usuario.nome || 'Cliente',
        telefoneCliente: '',
        servicos: servicosNomes,
        valorTotal,
        statusPagamento: dados.formaPagamento === 'pix' ? 'aguardando_pix' : 'no_local',
        status: 'agendado',
        servicoIds: dados.servicosIds,
      });

      if (resposta.sucesso && resposta.dados) {
        setAgendamentos((prev) => [resposta.dados!, ...prev]);
        return { sucesso: true, agendamento: resposta.dados };
      }

      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [usuario, agendamentosService, estabelecimentosService]);

  const reagendar = useCallback(async (id: string, novoDia: string, novoHorario: string) => {
    setErro(null);

    try {
      const resposta = await agendamentosService.reagendar(id, novoDia, novoHorario);

      if (resposta.sucesso && resposta.dados) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === id ? resposta.dados! : a))
        );
        return { sucesso: true };
      }

      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [agendamentosService]);

  const cancelar = useCallback(async (id: string) => {
    setErro(null);

    try {
      const resposta = await agendamentosService.cancelar(id);

      if (resposta.sucesso) {
        setAgendamentos((prev) => prev.filter((a) => a.id !== id));
        return { sucesso: true };
      }

      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [agendamentosService]);

  const confirmarPresenca = useCallback(async (id: string) => {
    setErro(null);

    try {
      const resposta = await agendamentosService.confirmarPresenca(id);

      if (resposta.sucesso) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'confirmado' as StatusAgendamento } : a))
        );
        return { sucesso: true };
      }

      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [agendamentosService]);

  const avaliar = useCallback(async (id: string, nota: number, comentario?: string) => {
    setErro(null);

    try {
      const resposta = await agendamentosService.avaliar(id, nota, comentario || '');

      if (resposta.sucesso) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'concluido' as StatusAgendamento } : a))
        );
        return { sucesso: true };
      }

      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [agendamentosService]);

  const limparErro = useCallback(() => setErro(null), []);

  // Computados
  const agora = new Date();
  const proximos = agendamentos
    .filter((a) => new Date(`${a.dia}T${a.horario}`) >= agora && !['cancelado', 'concluido'].includes(a.status))
    .sort((a, b) => new Date(`${a.dia}T${a.horario}`).getTime() - new Date(`${b.dia}T${b.horario}`).getTime());

  const passados = agendamentos
    .filter((a) => new Date(`${a.dia}T${a.horario}`) < agora || ['cancelado', 'concluido'].includes(a.status))
    .sort((a, b) => new Date(`${b.dia}T${b.horario}`).getTime() - new Date(`${a.dia}T${a.horario}`).getTime());

  return {
    agendamentos,
    proximos,
    passados,
    carregando,
    erro,
    temMais,
    pagina,
    criar,
    reagendar,
    cancelar,
    confirmarPresenca,
    avaliar,
    recarregar,
    carregarMais,
    limparErro,
  };
};

/** Hook para agendamentos do barbeiro (painel) */
export const useAgendamentosBarbeiro = (estabelecimentoId?: string) => {
  const { usuario } = useAuth();
  const agendamentosService = useAgendamentosService();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<{
    status?: StatusPagamento;
    dataInicio?: string;
    dataFim?: string;
  }>({});

  const recarregar = useCallback(async () => {
    if (!usuario || usuario.papel !== 'barbeiro' || !estabelecimentoId) return;

    setCarregando(true);
    setErro(null);

    try {
      const resposta = await agendamentosService.listarEstabelecimento(estabelecimentoId);

      if (resposta.sucesso && resposta.dados) {
        let filtrados = resposta.dados;
        if (filtros.status) {
          filtrados = filtrados.filter((a) => a.statusPagamento === filtros.status);
        }
        if (filtros.dataInicio) {
          filtrados = filtrados.filter((a) => a.dia >= filtros.dataInicio!);
        }
        if (filtros.dataFim) {
          filtrados = filtrados.filter((a) => a.dia <= filtros.dataFim!);
        }
        setAgendamentos(filtrados);
      } else {
        setErro(resposta.erro || 'Erro ao carregar agendamentos');
        setAgendamentos([]);
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
      setAgendamentos([]);
    } finally {
      setCarregando(false);
    }
  }, [usuario, estabelecimentoId, filtros, agendamentosService]);

  useEffect(() => {
    if (usuario?.papel === 'barbeiro' && estabelecimentoId) {
      recarregar();
    }
  }, [usuario, recarregar, filtros, estabelecimentoId]);

  const atualizarStatus = useCallback(async (id: string, status: StatusPagamento) => {
    setErro(null);

    try {
      const agendamento = agendamentos.find((a) => a.id === id);
      if (!agendamento) return { sucesso: false, erro: 'Agendamento não encontrado' };

      const resposta = await agendamentosService.atualizarStatus(id, status);

      if (resposta.sucesso) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === id ? { ...a, statusPagamento: status } : a))
        );
        return { sucesso: true };
      }

      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [agendamentos, agendamentosService]);

  const cancelar = useCallback(async (id: string) => {
    setErro(null);

    try {
      const agendamento = agendamentos.find((a) => a.id === id);
      if (!agendamento) return { sucesso: false, erro: 'Agendamento não encontrado' };

      const resposta = await agendamentosService.cancelar(id);

      if (resposta.sucesso) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'cancelado' as StatusAgendamento } : a))
        );
        return { sucesso: true };
      }

      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [agendamentos, agendamentosService]);

  const definirHorarioReal = useCallback(async (_id: string, _horarioReal: string) => {
    void _horarioReal;
    setErro(null);

    try {
      const resposta = await agendamentosService.definirHorarioReal(_id, _horarioReal);

      if (resposta.sucesso) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === _id ? { ...a, status: 'concluido' as StatusAgendamento } : a))
        );
        return { sucesso: true };
      }

      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [agendamentosService]);

  const limparErro = useCallback(() => setErro(null), []);

  return {
    agendamentos,
    carregando,
    erro,
    filtros,
    setFiltros,
    recarregar,
    atualizarStatus,
    cancelar,
    definirHorarioReal,
    limparErro,
  };
};