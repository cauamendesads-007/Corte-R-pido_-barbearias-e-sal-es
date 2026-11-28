/**
 * Hooks do domínio de Estabelecimentos com injeção de dependência.
 * Encapsula estado, efeitos colaterais e delega regras de negócio para services/rules.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { IEstabelecimentoService } from '../services';
import { estabelecimentoService } from '../services';
import { computarEstabelecimento } from '../rules';
import type {
  Estabelecimento,
  EstabelecimentoComputado,
  Servico,
  ItemGaleria,
  Avaliacao,
  FiltrosBusca,
  ServicoInput,
  GaleriaItemInput,
  TemaInput,
  ConfiguracaoPixInput,
  MensagensAutomaticasInput,
  ConfiguracaoPix,
  MensagemAutomatica,
  Result,
  EstabelecimentosContext,
  EstabelecimentoDetalheContext,
  EstabelecimentoGestaoContext,
} from '../types';

const ITENS_POR_PAGINA = 10;

/** Filtros iniciais padrão */
const FILTROS_INICIAIS: FiltrosBusca = {
  nicho: 'todos',
  precoMaximo: 500,
  avaliacaoMinima: 0,
  tipoServico: '',
  ordenacao: 'avaliacao',
  apenasBemAvaliados: false,
  apenasVagasHoje: false,
  localizacaoUsuario: null,
};

/**
 * Hook para marketplace (lista de estabelecimentos)
 */
export function useEstabelecimentos(options: {
  service?: IEstabelecimentoService;
  filtrosIniciais?: Partial<FiltrosBusca>;
  localizacaoUsuario?: { latitude: number; longitude: number } | null;
} = {}): EstabelecimentosContext {
  const {
    service = estabelecimentoService,
    filtrosIniciais = {},
    localizacaoUsuario = null,
  } = options;

  const { usuario } = useAuth();
  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoComputado[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosBusca>({ ...FILTROS_INICIAIS, ...filtrosIniciais });
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const limparErro = useCallback(() => setErro(null), []);

  const recarregar = useCallback(async () => {
    // Cancela requisição anterior se houver
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setCarregando(true);
    setErro(null);
    setPagina(1);

    try {
      const filtrosComLocalizacao = { ...filtros, localizacaoUsuario };
      const resposta = await service.listar(filtrosComLocalizacao);

      if (resposta.sucesso && resposta.dados) {
        const itens = resposta.dados.slice(0, ITENS_POR_PAGINA);
        const haMais = resposta.dados.length > ITENS_POR_PAGINA;

        setEstabelecimentos(itens);
        setPagina(1);
        setTemMais(haMais);
      } else {
        setErro(resposta.erro || 'Erro ao carregar estabelecimentos');
        setEstabelecimentos([]);
        setTemMais(false);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setErro('Erro de conexão. Tente novamente.');
      setEstabelecimentos([]);
      setTemMais(false);
    } finally {
      setCarregando(false);
    }
  }, [service, filtros, localizacaoUsuario]);

  const carregarMais = useCallback(async () => {
    if (carregando || !temMais) return;

    setCarregando(true);

    try {
      const filtrosComLocalizacao = { ...filtros, localizacaoUsuario };
      const resposta = await service.listar(filtrosComLocalizacao);

      if (resposta.sucesso && resposta.dados) {
        const inicio = pagina * ITENS_POR_PAGINA;
        const fim = inicio + ITENS_POR_PAGINA;
        const itens = resposta.dados.slice(inicio, fim);
        const haMais = fim < resposta.dados.length;

        setEstabelecimentos((prev) => [...prev, ...itens]);
        setPagina((p) => p + 1);
        setTemMais(haMais);
      }
    } catch {
      // Silencioso em paginação
    } finally {
      setCarregando(false);
    }
  }, [service, filtros, localizacaoUsuario, carregando, temMais, pagina]);

  const definirFiltros = useCallback((novosFiltros: Partial<FiltrosBusca>) => {
    setFiltros((prev) => ({ ...prev, ...novosFiltros }));
  }, []);

  const seguir = useCallback(async (estabelecimentoId: string): Promise<Result<{ seguindo: boolean }>> => {
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };
    setErro(null);

    try {
      const resposta = await service.seguir(estabelecimentoId, usuario.email);
      if (resposta.sucesso && resposta.dados) {
        const dadosSeguir = resposta.dados;
        setEstabelecimentos((prev) =>
          prev.map((e) =>
            e.estabelecimento.id === estabelecimentoId
              ? { ...e, estabelecimento: { ...e.estabelecimento, seguidores: dadosSeguir.seguindo ? e.estabelecimento.seguidores + 1 : e.estabelecimento.seguidores - 1 } }
              : e
          )
        );
        return { sucesso: true, dados: dadosSeguir };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [usuario, service]);

  const entrarNaFila = useCallback(async (
    estabelecimentoId: string,
    nome: string
  ): Promise<Result<{ posicao: number; esperaEstimada: number }>> => {
    setErro(null);

    try {
      const resposta = await service.entrarNaFila(estabelecimentoId, nome);
      if (resposta.sucesso && resposta.dados) {
        setEstabelecimentos((prev) =>
          prev.map((e) =>
            e.estabelecimento.id === estabelecimentoId
              ? { ...e, estabelecimento: { ...e.estabelecimento, fila: [...e.estabelecimento.fila, { nome, horarioChegada: new Date().toTimeString().slice(0, 5)}] } }
              : e
          )
        );
        return { sucesso: true, dados: resposta.dados };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [service]);

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
    recarregar();
  }, [filtros, recarregar]);

  const contexto = useMemo<EstabelecimentosContext>(() => ({
    estabelecimentos,
    carregando,
    erro,
    filtros,
    pagina,
    temMais,
    recarregar,
    carregarMais,
    definirFiltros,
    limparErro,
    seguir,
    entrarNaFila,
  }), [
    estabelecimentos,
    carregando,
    erro,
    filtros,
    pagina,
    temMais,
    recarregar,
    carregarMais,
    definirFiltros,
    limparErro,
    seguir,
    entrarNaFila,
  ]);

  return contexto;
}

/**
 * Hook para detalhe de estabelecimento (página pública)
 */
export function useEstabelecimentoDetalhe(
  estabelecimentoId: string,
  options: { service?: IEstabelecimentoService; localizacaoUsuario?: { latitude: number; longitude: number } | null } = {}
): EstabelecimentoDetalheContext {
  const { service = estabelecimentoService, localizacaoUsuario = null } = options;
  const { usuario } = useAuth();
  const [estabelecimento, setEstabelecimento] = useState<EstabelecimentoComputado | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [galeria, setGaleria] = useState<ItemGaleria[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const limparErro = useCallback(() => setErro(null), []);

  const recarregar = useCallback(async () => {
    if (!estabelecimentoId) return;

    setCarregando(true);
    setErro(null);

    try {
      const [estResposta, servicosResposta, galeriaResposta, avaliacoesResposta] = await Promise.all([
        service.obterPorId(estabelecimentoId),
        service.listarServicos(estabelecimentoId),
        service.listarGaleria(estabelecimentoId),
        service.listarAvaliacoes(estabelecimentoId),
      ]);

      if (estResposta.sucesso && estResposta.dados) {
        const estComputado = computarEstabelecimento(estResposta.dados, localizacaoUsuario || undefined);
        setEstabelecimento(estComputado);
      } else {
        setErro(estResposta.erro || 'Estabelecimento não encontrado');
        setEstabelecimento(null);
      }

      if (servicosResposta.sucesso && servicosResposta.dados) {
        setServicos(servicosResposta.dados);
      }

      if (galeriaResposta.sucesso && galeriaResposta.dados) {
        setGaleria(galeriaResposta.dados);
      }

      if (avaliacoesResposta.sucesso && avaliacoesResposta.dados) {
        setAvaliacoes(avaliacoesResposta.dados);
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, [estabelecimentoId, service]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const seguir = useCallback(async (): Promise<Result<{ seguindo: boolean }>> => {
    if (!usuario || !estabelecimento) return { sucesso: false, erro: 'Não autenticado ou estabelecimento não carregado' };
    setErro(null);

    try {
      const resposta = await service.seguir(estabelecimento.estabelecimento.id, usuario.email);
      if (resposta.sucesso && resposta.dados) {
        const dadosSeguir = resposta.dados;
        setEstabelecimento((prev) =>
          prev
            ? {
                ...prev,
                estabelecimento: {
                  ...prev.estabelecimento,
                  seguidores: dadosSeguir.seguindo ? prev.estabelecimento.seguidores + 1 : prev.estabelecimento.seguidores - 1,
                },
              }
            : null
        );
        return { sucesso: true, dados: dadosSeguir };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [usuario, service, estabelecimento]);

  const curtirPublicacao = useCallback(async (publicacaoId: string): Promise<Result<{ curtido: boolean; total: number }>> => {
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };
    setErro(null);

    try {
      const resposta = await service.curtirPublicacao(publicacaoId, usuario.email);
      return resposta;
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [usuario, service]);

  const salvarInspiracao = useCallback(async (publicacaoId: string): Promise<Result<{ salvo: boolean }>> => {
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };
    setErro(null);

    try {
      const resposta = await service.salvarInspiracao(publicacaoId, usuario.email);
      return resposta;
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [usuario, service]);

  const compartilhar = useCallback(async (publicacaoId: string): Promise<Result<void>> => {
    setErro(null);
    try {
      const resposta = await service.compartilharPublicacao(publicacaoId);
      return resposta;
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [service]);

  const denunciar = useCallback(async (publicacaoId: string, motivo: string): Promise<Result<void>> => {
    setErro(null);
    try {
      const resposta = await service.denunciarPublicacao(publicacaoId, motivo);
      return resposta;
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [service]);

  const adicionarAvaliacao = useCallback(async (nota: number, comentario: string): Promise<Result<Avaliacao>> => {
    if (!usuario || !estabelecimento) return { sucesso: false, erro: 'Não autenticado ou estabelecimento não carregado' };
    setErro(null);

    try {
      const resposta = await service.adicionarAvaliacao(estabelecimento.estabelecimento.id, nota, comentario, usuario.nome || 'Cliente');
      if (resposta.sucesso && resposta.dados) {
        setAvaliacoes((prev) => [resposta.dados!, ...prev]);
        setEstabelecimento((prev) =>
          prev
            ? {
                ...prev,
                totalAvaliacoes: prev.totalAvaliacoes + 1,
                avaliacaoMedia: Number(((prev.avaliacaoMedia * prev.totalAvaliacoes + nota) / (prev.totalAvaliacoes + 1)).toFixed(1)),
              }
            : null
        );
        return { sucesso: true, dados: resposta.dados };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [usuario, service, estabelecimento]);

  const entrarNaFila = useCallback(async (nome: string): Promise<Result<{ posicao: number; esperaEstimada: number }>> => {
    if (!estabelecimento) return { sucesso: false, erro: 'Estabelecimento não carregado' };
    setErro(null);

    try {
      const resposta = await service.entrarNaFila(estabelecimento.estabelecimento.id, nome);
      if (resposta.sucesso && resposta.dados) {
        setEstabelecimento((prev) =>
          prev
            ? {
                ...prev,
                estabelecimento: {
                  ...prev.estabelecimento,
                  fila: [...prev.estabelecimento.fila, { nome, horarioChegada: new Date().toTimeString().slice(0, 5) }],
                },
              }
            : null
        );
        return { sucesso: true, dados: resposta.dados };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [service, estabelecimento]);

  return {
    estabelecimento,
    servicos,
    galeria,
    avaliacoes,
    carregando,
    erro,
    recarregar,
    limparErro,
    seguir,
    curtirPublicacao,
    salvarInspiracao,
    compartilhar,
    denunciar,
    adicionarAvaliacao,
    entrarNaFila,
  };
}

/**
 * Hook para gestão de estabelecimento (painel do barbeiro)
 */
export function useEstabelecimentoGestao(
  estabelecimentoId: string,
  options: { service?: IEstabelecimentoService } = {}
): EstabelecimentoGestaoContext {
  const { service = estabelecimentoService } = options;
  const { usuario } = useAuth();
  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [galeria, setGaleria] = useState<ItemGaleria[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const limparErro = useCallback(() => setErro(null), []);

  const recarregar = useCallback(async () => {
    if (!usuario || usuario.papel !== 'barbeiro' || !estabelecimentoId) return;

    setCarregando(true);
    setErro(null);

    try {
      const [estResposta, servicosResposta, galeriaResposta, avaliacoesResposta] = await Promise.all([
        service.obterGestao(estabelecimentoId),
        service.listarServicos(estabelecimentoId),
        service.listarGaleria(estabelecimentoId),
        service.listarAvaliacoes(estabelecimentoId),
      ]);

      if (estResposta.sucesso && estResposta.dados) {
        setEstabelecimento(estResposta.dados);
      } else {
        setErro(estResposta.erro || 'Estabelecimento não encontrado');
        setEstabelecimento(null);
      }

      if (servicosResposta.sucesso && servicosResposta.dados) {
        setServicos(servicosResposta.dados);
      }

      if (galeriaResposta.sucesso && galeriaResposta.dados) {
        setGaleria(galeriaResposta.dados);
      }

      if (avaliacoesResposta.sucesso && avaliacoesResposta.dados) {
        setAvaliacoes(avaliacoesResposta.dados);
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, [usuario, estabelecimentoId, service]);

  useEffect(() => {
    if (usuario?.papel === 'barbeiro' && estabelecimentoId) {
      recarregar();
    }
  }, [usuario, recarregar, estabelecimentoId]);

  // Atualizar estabelecimento
  const atualizarEstabelecimento = useCallback(async (dados: Partial<Estabelecimento>): Promise<Result<Estabelecimento>> => {
    setErro(null);
    setSalvando(true);

    try {
      const resposta = await service.atualizarEstabelecimento(estabelecimentoId, dados);
      if (resposta.sucesso && resposta.dados) {
        setEstabelecimento(resposta.dados);
        return { sucesso: true, dados: resposta.dados };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    } finally {
      setSalvando(false);
    }
  }, [estabelecimentoId, service]);

  // Tema
  const atualizarTema = useCallback(async (tema: TemaInput): Promise<Result<Estabelecimento>> => {
    setErro(null);
    setSalvando(true);

    try {
      const resposta = await service.atualizarTema(estabelecimentoId, tema);
      if (resposta.sucesso && resposta.dados) {
        setEstabelecimento(resposta.dados);
        return { sucesso: true, dados: resposta.dados };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    } finally {
      setSalvando(false);
    }
  }, [estabelecimentoId, service]);

  // Horário
  const atualizarHorario = useCallback(async (horario: string): Promise<Result<Estabelecimento>> => {
    setErro(null);
    setSalvando(true);

    try {
      const resposta = await service.atualizarHorario(estabelecimentoId, horario);
      if (resposta.sucesso && resposta.dados) {
        setEstabelecimento(resposta.dados);
        return { sucesso: true, dados: resposta.dados };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    } finally {
      setSalvando(false);
    }
  }, [estabelecimentoId, service]);

  // Config Pix
  const atualizarConfiguracaoPix = useCallback(async (config: ConfiguracaoPixInput): Promise<Result<ConfiguracaoPix>> => {
    setErro(null);
    setSalvando(true);

    try {
      const resposta = await service.atualizarConfiguracaoPix(estabelecimentoId, config);
      if (resposta.sucesso && resposta.dados && estabelecimento) {
        setEstabelecimento({
          ...estabelecimento,
          configuracaoPix: resposta.dados,
        });
        return { sucesso: true, dados: resposta.dados };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    } finally {
      setSalvando(false);
    }
  }, [estabelecimentoId, service, estabelecimento]);

  // Mensagens automáticas
  const atualizarMensagensAutomaticas = useCallback(async (mensagens: MensagensAutomaticasInput): Promise<Result<MensagemAutomatica>> => {
    setErro(null);
    setSalvando(true);

    try {
      const resposta = await service.atualizarMensagensAutomaticas(estabelecimentoId, mensagens);
      if (resposta.sucesso) {
        return { sucesso: true, dados: resposta.dados };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    } finally {
      setSalvando(false);
    }
  }, [estabelecimentoId, service]);

  // ============================================================================
  // SERVIÇOS
  // ============================================================================

  const adicionarServico = useCallback(async (servico: ServicoInput): Promise<Result<Servico>> => {
    setErro(null);

    try {
      const resposta = await service.adicionarServico(estabelecimentoId, servico);
      if (resposta.sucesso && resposta.dados) {
        const novoServico = resposta.dados;
        setServicos((prev) => [...prev, novoServico]);
        return { sucesso: true, dados: novoServico };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [estabelecimentoId, service]);

  const atualizarServico = useCallback(async (servicoId: string, dados: Partial<Servico>): Promise<Result<Servico>> => {
    setErro(null);

    try {
      const resposta = await service.atualizarServico(estabelecimentoId, servicoId, dados);
      if (resposta.sucesso && resposta.dados) {
        const servicoAtualizado = resposta.dados;
        setServicos((prev) => prev.map((s) => (s.id === servicoId ? servicoAtualizado : s)));
        return { sucesso: true, dados: servicoAtualizado };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [estabelecimentoId, service]);

  const excluirServico = useCallback(async (servicoId: string): Promise<Result<void>> => {
    setErro(null);

    try {
      const resposta = await service.excluirServico(estabelecimentoId, servicoId);
      if (resposta.sucesso) {
        setServicos((prev) => prev.filter((s) => s.id !== servicoId));
        return { sucesso: true, dados: undefined };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [estabelecimentoId, service]);

  const reordenarServicos = useCallback(async (servicoIds: string[]): Promise<Result<Servico[]>> => {
    setErro(null);

    try {
      const resposta = await service.reordenarServicos(estabelecimentoId, servicoIds);
      if (resposta.sucesso && resposta.dados) {
        setServicos(resposta.dados);
        return { sucesso: true, dados: resposta.dados };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [estabelecimentoId, service]);

  // ============================================================================
  // GALERIA
  // ============================================================================

  const adicionarGaleria = useCallback(async (item: GaleriaItemInput): Promise<Result<ItemGaleria>> => {
    setErro(null);

    try {
      const resposta = await service.adicionarGaleria(estabelecimentoId, item);
      if (resposta.sucesso && resposta.dados) {
        const novoItem = resposta.dados;
        setGaleria((prev) => [...prev, novoItem]);
        return { sucesso: true, dados: novoItem };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [estabelecimentoId, service]);

  const removerGaleria = useCallback(async (itemId: string): Promise<Result<void>> => {
    setErro(null);

    try {
      const resposta = await service.removerGaleria(estabelecimentoId, itemId);
      if (resposta.sucesso) {
        setGaleria((prev) => prev.filter((i) => i.id !== itemId));
        return { sucesso: true, dados: undefined };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [estabelecimentoId, service]);

  const reordenarGaleria = useCallback(async (itemIds: string[]): Promise<Result<ItemGaleria[]>> => {
    setErro(null);

    try {
      const resposta = await service.reordenarGaleria(estabelecimentoId, itemIds);
      if (resposta.sucesso && resposta.dados) {
        setGaleria(resposta.dados);
        return { sucesso: true, dados: resposta.dados };
      }
      return { sucesso: false, erro: resposta.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [estabelecimentoId, service]);

  // ============================================================================
  // AVALIAÇÕES
  // ============================================================================

  const responderAvaliacao = useCallback(async (avaliacaoId: string, resposta: string): Promise<Result<Avaliacao>> => {
    setErro(null);

    try {
      const respostaApi = await service.responderAvaliacao(estabelecimentoId, avaliacaoId, resposta);
      if (respostaApi.sucesso && respostaApi.dados) {
        const avaliacaoAtualizada = respostaApi.dados;
        setAvaliacoes((prev) => prev.map((a) => (a.id === avaliacaoId ? avaliacaoAtualizada : a)));
        return { sucesso: true, dados: avaliacaoAtualizada };
      }
      return { sucesso: false, erro: respostaApi.erro };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }, [estabelecimentoId, service]);

  return {
    estabelecimento,
    servicos,
    galeria,
    avaliacoes,
    carregando,
    erro,
    salvando,
    recarregar,
    limparErro,
    atualizarEstabelecimento,
    atualizarTema,
    atualizarHorario,
    atualizarConfiguracaoPix,
    atualizarMensagensAutomaticas,
    adicionarServico,
    atualizarServico,
    excluirServico,
    reordenarServicos,
    adicionarGaleria,
    removerGaleria,
    reordenarGaleria,
    responderAvaliacao,
  };
}