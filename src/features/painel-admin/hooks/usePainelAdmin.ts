/**
 * Hook usePainelAdmin - Gerencia estado do painel administrativo.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getPainelAdminService } from '../services';
import type {
  PainelAdminState,
  PainelAdminActions,
  Usuario,
  UsuarioRole,
  Estabelecimento,
  EstabelecimentoStatus,
  Agendamento,
  Denuncia,
  DenunciaStatus,
  MetricasAdmin,
  ConfiguracaoSistema,
  UsuariosFiltro,
  EstabelecimentosFiltro,
  AgendamentosFiltro,
  DenunciasFiltro,
} from '../types';

const FILTRO_USUARIOS_INICIAL: UsuariosFiltro = {};
const FILTRO_ESTABELECIMENTOS_INICIAL: EstabelecimentosFiltro = {};
const FILTRO_AGENDAMENTOS_INICIAL: AgendamentosFiltro = {};
const FILTRO_DENUNCIAS_INICIAL: DenunciasFiltro = {};

export function usePainelAdmin(): PainelAdminState & PainelAdminActions {
  const service = getPainelAdminService();
  const abortRef = useRef<AbortController | null>(null);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null);
  const [configuracao, setConfiguracao] = useState<ConfiguracaoSistema | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [paginaUsuarios, setPaginaUsuarios] = useState(1);
  const [proximaPaginaUsuarios, setProximaPaginaUsuarios] = useState<number | null>(1);
  const [paginaEstabelecimentos, setPaginaEstabelecimentos] = useState(1);
  const [proximaPaginaEstabelecimentos, setProximaPaginaEstabelecimentos] = useState<number | null>(1);
  const [paginaAgendamentos, setPaginaAgendamentos] = useState(1);
  const [proximaPaginaAgendamentos, setProximaPaginaAgendamentos] = useState<number | null>(1);
  const [paginaDenuncias, setPaginaDenuncias] = useState(1);
  const [proximaPaginaDenuncias, setProximaPaginaDenuncias] = useState<number | null>(1);

  const filtroUsuariosRef = useRef(FILTRO_USUARIOS_INICIAL);
  const filtroEstabelecimentosRef = useRef(FILTRO_ESTABELECIMENTOS_INICIAL);
  const filtroAgendamentosRef = useRef(FILTRO_AGENDAMENTOS_INICIAL);
  const filtroDenunciasRef = useRef(FILTRO_DENUNCIAS_INICIAL);

  const abortarAnterior = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  // Usuários
  const carregarUsuarios = useCallback(async (pagina = 1, filtro?: UsuariosFiltro) => {
    const signal = abortarAnterior();
    if (pagina === 1) {
      setCarregando(true);
      setUsuarios([]);
    }
    setErro(null);

    if (filtro) {
      filtroUsuariosRef.current = { ...filtroUsuariosRef.current, ...filtro };
    }

    try {
      const resposta = await service.buscarUsuarios(pagina, 20, filtroUsuariosRef.current, signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      if (pagina === 1) {
        setUsuarios(resposta.dados.usuarios);
      } else {
        setUsuarios((prev) => [...prev, ...resposta.dados.usuarios]);
      }
      setProximaPaginaUsuarios(resposta.dados.proximaPagina);
      setPaginaUsuarios(resposta.dados.proximaPagina ? pagina + 1 : pagina);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar usuários');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const atualizarRoleUsuario = useCallback(async (id: string, role: UsuarioRole) => {
    try {
      const resposta = await service.atualizarRoleUsuario(id, role);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch {
      // Rollback
    }
  }, [service]);

  const banirUsuario = useCallback(async (id: string, motivo: string) => {
    try {
      const resposta = await service.banirUsuario(id, motivo);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, banidoEm: new Date().toISOString(), banidoMotivo: motivo } : u)));
    } catch {
      // Rollback
    }
  }, [service]);

  const desbanirUsuario = useCallback(async (id: string) => {
    try {
      const resposta = await service.desbanirUsuario(id);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, banidoEm: undefined, banidoMotivo: undefined } : u)));
    } catch {
      // Rollback
    }
  }, [service]);

  // Estabelecimentos
  const carregarEstabelecimentos = useCallback(async (pagina = 1, filtro?: EstabelecimentosFiltro) => {
    const signal = abortarAnterior();
    if (pagina === 1) {
      setCarregando(true);
      setEstabelecimentos([]);
    }
    setErro(null);

    if (filtro) {
      filtroEstabelecimentosRef.current = { ...filtroEstabelecimentosRef.current, ...filtro };
    }

    try {
      const resposta = await service.buscarEstabelecimentos(pagina, 20, filtroEstabelecimentosRef.current, signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      if (pagina === 1) {
        setEstabelecimentos(resposta.dados.estabelecimentos);
      } else {
        setEstabelecimentos((prev) => [...prev, ...resposta.dados.estabelecimentos]);
      }
      setProximaPaginaEstabelecimentos(resposta.dados.proximaPagina);
      setPaginaEstabelecimentos(resposta.dados.proximaPagina ? pagina + 1 : pagina);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar estabelecimentos');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const aprovarEstabelecimento = useCallback(async (id: string) => {
    try {
      const resposta = await service.aprovarEstabelecimento(id);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setEstabelecimentos((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'aprovado' } : e)));
    } catch {
      // Rollback
    }
  }, [service]);

  const rejeitarEstabelecimento = useCallback(async (id: string, motivo: string) => {
    try {
      const resposta = await service.rejeitarEstabelecimento(id, motivo);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setEstabelecimentos((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'rejeitado', rejeicaoMotivo: motivo } : e)));
    } catch {
      // Rollback
    }
  }, [service]);

  const suspenderEstabelecimento = useCallback(async (id: string, motivo: string) => {
    try {
      const resposta = await service.suspenderEstabelecimento(id, motivo);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setEstabelecimentos((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'suspenso', suspensaoMotivo: motivo } : e)));
    } catch {
      // Rollback
    }
  }, [service]);

  const reativarEstabelecimento = useCallback(async (id: string) => {
    try {
      const resposta = await service.reativarEstabelecimento(id);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setEstabelecimentos((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'aprovado' } : e)));
    } catch {
      // Rollback
    }
  }, [service]);

  // Agendamentos
  const carregarAgendamentos = useCallback(async (pagina = 1, filtro?: AgendamentosFiltro) => {
    const signal = abortarAnterior();
    if (pagina === 1) {
      setCarregando(true);
      setAgendamentos([]);
    }
    setErro(null);

    if (filtro) {
      filtroAgendamentosRef.current = { ...filtroAgendamentosRef.current, ...filtro };
    }

    try {
      const resposta = await service.buscarAgendamentos(pagina, 20, filtroAgendamentosRef.current, signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      if (pagina === 1) {
        setAgendamentos(resposta.dados.agendamentos);
      } else {
        setAgendamentos((prev) => [...prev, ...resposta.dados.agendamentos]);
      }
      setProximaPaginaAgendamentos(resposta.dados.proximaPagina);
      setPaginaAgendamentos(resposta.dados.proximaPagina ? pagina + 1 : pagina);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar agendamentos');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const cancelarAgendamentoAdmin = useCallback(async (id: string, motivo: string) => {
    try {
      const resposta = await service.cancelarAgendamentoAdmin(id, motivo);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelado', cancelamentoMotivo: motivo } : a)));
    } catch {
      // Rollback
    }
  }, [service]);

  // Denúncias
  const carregarDenuncias = useCallback(async (pagina = 1, filtro?: DenunciasFiltro) => {
    const signal = abortarAnterior();
    if (pagina === 1) {
      setCarregando(true);
      setDenuncias([]);
    }
    setErro(null);

    if (filtro) {
      filtroDenunciasRef.current = { ...filtroDenunciasRef.current, ...filtro };
    }

    try {
      const resposta = await service.buscarDenuncias(pagina, 20, filtroDenunciasRef.current, signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      if (pagina === 1) {
        setDenuncias(resposta.dados.denuncias);
      } else {
        setDenuncias((prev) => [...prev, ...resposta.dados.denuncias]);
      }
      setProximaPaginaDenuncias(resposta.dados.proximaPagina);
      setPaginaDenuncias(resposta.dados.proximaPagina ? pagina + 1 : pagina);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar denúncias');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const resolverDenuncia = useCallback(async (id: string, status: DenunciaStatus, resolucao: string) => {
    try {
      const resposta = await service.resolverDenuncia(id, status, resolucao);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setDenuncias((prev) => prev.map((d) => (d.id === id ? { ...d, status, resolucao, resolvidoEm: new Date().toISOString() } : d)));
    } catch {
      // Rollback
    }
  }, [service]);

  // Métricas
  const carregarMetricas = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarMetricas(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setMetricas(resposta.dados);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar métricas');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  // Configuração
  const carregarConfiguracao = useCallback(async () => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await service.buscarConfiguracao(signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setConfiguracao(resposta.dados);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar configuração');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const atualizarConfiguracao = useCallback(async (config: Partial<ConfiguracaoSistema>) => {
    try {
      const resposta = await service.atualizarConfiguracao(config);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setConfiguracao((prev) => (prev ? { ...prev, ...resposta.dados } : resposta.dados));
    } catch {
      // Rollback
    }
  }, [service]);

  // Cleanup
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    usuarios,
    estabelecimentos,
    agendamentos,
    denuncias,
    metricas,
    configuracao,
    carregando,
    erro,
    paginaUsuarios,
    proximaPaginaUsuarios,
    paginaEstabelecimentos,
    proximaPaginaEstabelecimentos,
    paginaAgendamentos,
    proximaPaginaAgendamentos,
    paginaDenuncias,
    proximaPaginaDenuncias,
    carregarUsuarios,
    atualizarRoleUsuario,
    banirUsuario,
    desbanirUsuario,
    carregarEstabelecimentos,
    aprovarEstabelecimento,
    rejeitarEstabelecimento,
    suspenderEstabelecimento,
    reativarEstabelecimento,
    carregarAgendamentos,
    cancelarAgendamentoAdmin,
    carregarDenuncias,
    resolverDenuncia,
    carregarMetricas,
    carregarConfiguracao,
    atualizarConfiguracao,
    limparErro,
  };
}