/**
 * Hook usePublicacao - Gerencia estado de uma publicação individual (detail page).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getFeedService } from '../services';
import type {
  PublicacaoState,
  PublicacaoActions,
  Publicacao,
  Comentario,
} from '../types';

export function usePublicacao(): PublicacaoState & PublicacaoActions {
  const service = getFeedService();
  const abortRef = useRef<AbortController | null>(null);
  const publicacaoIdRef = useRef<string | null>(null);
  const paginaComentariosRef = useRef(1);

  const [publicacao, setPublicacao] = useState<Publicacao | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [proximaPaginaComentarios, setProximaPaginaComentarios] = useState<number | null>(1);
  const [carregando, setCarregando] = useState(false);
  const [carregandoComentarios, setCarregandoComentarios] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const abortarAnterior = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  const carregarPublicacao = useCallback(async (id: string) => {
    const signal = abortarAnterior();
    setCarregando(true);
    setErro(null);
    publicacaoIdRef.current = id;
    paginaComentariosRef.current = 1;

    try {
      const [respostaPub, respostaCom] = await Promise.all([
        service.buscarPublicacao(id, signal),
        service.buscarComentarios(id, 1, 20, signal),
      ]);

      if (!respostaPub.sucesso) throw new Error(respostaPub.erro);
      if (!respostaCom.sucesso) throw new Error(respostaCom.erro);

      setPublicacao(respostaPub.dados);
      setComentarios(respostaCom.dados.comentarios);
      setProximaPaginaComentarios(respostaCom.dados.proximaPagina);
      paginaComentariosRef.current = respostaCom.dados.proximaPagina ? 2 : 1;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar publicação');
    } finally {
      setCarregando(false);
    }
  }, [service, abortarAnterior]);

  const carregarComentarios = useCallback(async (publicacaoId?: string, pagina = paginaComentariosRef.current) => {
    const id = publicacaoId ?? publicacaoIdRef.current;
    if (!id || carregandoComentarios || !proximaPaginaComentarios) return;

    const signal = abortarAnterior();
    setCarregandoComentarios(true);

    try {
      const resposta = await service.buscarComentarios(id, pagina, 20, signal);
      if (!resposta.sucesso) throw new Error(resposta.erro);

      setComentarios((prev) => [...prev, ...resposta.dados.comentarios]);
      setProximaPaginaComentarios(resposta.dados.proximaPagina);
      paginaComentariosRef.current = resposta.dados.proximaPagina ? pagina + 1 : pagina;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e instanceof Error ? e.message : 'Erro ao carregar comentários');
    } finally {
      setCarregandoComentarios(false);
    }
  }, [service, carregandoComentarios, proximaPaginaComentarios, abortarAnterior]);

  const adicionarComentario = useCallback(async (texto: string) => {
    const id = publicacaoIdRef.current;
    if (!id || !texto.trim() || enviandoComentario) return;

    setEnviandoComentario(true);
    setErro(null);

    // Otimista
    const otimista: Comentario = {
      id: `temp-${Date.now()}`,
      publicacaoId: id,
      autorId: 'current-user',
      autorNome: 'Você',
      autorAvatar: '',
      nomeAutor: 'Você',
      texto: texto.trim(),
      dataCriacao: Date.now(),
      criadoEm: Date.now(),
    };
    setComentarios((prev) => [otimista, ...prev]);
    if (publicacao) {
      setPublicacao({ ...publicacao, comentarios: publicacao.comentarios + 1 });
    }

    try {
      const resposta = await service.adicionarComentario(id, { texto: texto.trim(), publicacaoId: id });
      if (!resposta.sucesso) throw new Error(resposta.erro);

      // Substitui otimista pelo real
      setComentarios((prev) => prev.map((c) => (c.id === otimista.id ? resposta.dados : c)));
    } catch (e) {
      // Rollback
      setComentarios((prev) => prev.filter((c) => c.id !== otimista.id));
      if (publicacao) {
        setPublicacao({ ...publicacao, comentarios: publicacao.comentarios });
      }
      setErro(e instanceof Error ? e.message : 'Erro ao enviar comentário');
    } finally {
      setEnviandoComentario(false);
    }
  }, [service, publicacao, enviandoComentario]);

  const curtir = useCallback(async () => {
    if (!publicacao) return;

    const anterior = publicacao;
    const otimista: Publicacao = {
      ...anterior,
      curtidas: anterior.estaCurtido ? anterior.curtidas - 1 : anterior.curtidas + 1,
      estaCurtido: !anterior.estaCurtido,
    };
    setPublicacao(otimista);

    try {
      const resposta = anterior.estaCurtido
        ? await service.descurtir(anterior.id)
        : await service.curtir(anterior.id);

      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      setPublicacao(anterior);
    }
  }, [publicacao, service]);

  const salvar = useCallback(async () => {
    if (!publicacao) return;

    const anterior = publicacao;
    const otimista: Publicacao = { ...anterior, estaSalvo: !anterior.estaSalvo };
    setPublicacao(otimista);

    try {
      const resposta = anterior.estaSalvo
        ? await service.desalvar(anterior.id)
        : await service.salvar(anterior.id);

      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      setPublicacao(anterior);
    }
  }, [publicacao, service]);

  const denunciar = useCallback(async (motivo: string) => {
    if (!publicacao) return;

    try {
      const resposta = await service.denunciar(publicacao.id, motivo);
      if (!resposta.sucesso) throw new Error(resposta.erro);
    } catch {
      setErro('Erro ao denunciar');
    }
  }, [publicacao, service]);

  const compartilhar = useCallback(async () => {
    if (!publicacao) return null;

    try {
      const resposta = await service.compartilhar(publicacao.id);
      if (!resposta.sucesso) throw new Error(resposta.erro);
      return resposta.dados?.link ?? null;
    } catch {
      setErro('Erro ao compartilhar');
      return null;
    }
  }, [publicacao, service]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    publicacao,
    comentarios,
    proximaPaginaComentarios,
    carregando,
    carregandoComentarios,
    enviandoComentario,
    erro,
    carregarPublicacao,
    carregarComentarios,
    adicionarComentario,
    curtir,
    descurtir: curtir,
    salvar,
    desalvar: salvar,
    denunciar,
    compartilhar,
    limparErro,
  };
}