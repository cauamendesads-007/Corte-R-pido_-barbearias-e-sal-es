// ============================================================================
// SUPABASE FEED SERVICE
// Publicações, curtidas, salvos, comentários, inspirações, seguidores
// ============================================================================

import { getSupabase, isMockMode } from './client';
import type { Database } from './types';
import type {
  ResultadoServico,
  Publicacao,
  Comentario,
  PublicacaoTipo,
  TipoMidia,
  Inspiracao,
  InspiracaoCategoria,
  FeedFiltros,
} from '@/tipos';

type PublicacaoRow = Database['public']['Tables']['publicacoes']['Row'];
type PublicacaoInsert = Database['public']['Tables']['publicacoes']['Insert'];
type PublicacaoUpdate = Database['public']['Tables']['publicacoes']['Update'];
type PublicacaoMidiasRow = Database['public']['Tables']['publicacao_midias']['Row'];
type PublicacaoMidiasInsert = Database['public']['Tables']['publicacao_midias']['Insert'];
type CurtidasRow = Database['public']['Tables']['curtidas']['Row'];
type CurtidasInsert = Database['public']['Tables']['curtidas']['Insert'];
type SalvosRow = Database['public']['Tables']['salvos']['Row'];
type SalvosInsert = Database['public']['Tables']['salvos']['Insert'];
type ComentariosRow = Database['public']['Tables']['comentarios']['Row'];
type ComentariosInsert = Database['public']['Tables']['comentarios']['Insert'];
type InspiracaoesRow = Database['public']['Tables']['inspiracaoes']['Row'];
type InspiracaoesInsert = Database['public']['Tables']['inspiracaoes']['Insert'];
type InspiracaoMidiasRow = Database['public']['Tables']['inspiracao_midias']['Row'];
type SeguidoresRow = Database['public']['Tables']['seguidores']['Row'];
type SeguidoresInsert = Database['public']['Tables']['seguidores']['Insert'];

// ============================================================================
// HELPERS DE MAPEAMENTO
// ============================================================================

function mapPublicacaoRowToTipo(row: PublicacaoRow & {
  publicacao_midias?: PublicacaoMidiasRow[];
  usuario_curtiu?: boolean;
  usuario_salvou?: boolean;
}): Publicacao {
  return {
    id: row.id,
    estabelecimentoId: row.estabelecimento_id,
    autorId: row.autor_id || '',
    autorNome: row.autor_nome,
    autorAvatar: row.autor_avatar || undefined,
    autorSeguido: false, // Será preenchido se necessário
    tipo: row.tipo,
    legenda: row.legenda,
    conteudo: row.legenda, // alias
    tagServico: row.tag_servico || undefined,
    midias: (row.publicacao_midias || []).map(m => ({
      id: m.id,
      tipo: m.tipo,
      src: m.src,
      alt: m.alt || undefined,
      thumbnail: m.thumbnail || undefined,
    })),
    curtidas: row.curtidas,
    salvos: row.salvos,
    visualizacoes: row.visualizacoes,
    compartilhamentos: row.compartilhamentos,
    comentarios: row.comentarios_count,
    dataCriacao: new Date(row.data_criacao).getTime(),
    criadoEm: new Date(row.data_criacao).getTime(),
    usuarioCurtiu: row.usuario_curtiu,
    estaCurtido: row.usuario_curtiu,
    usuarioSalvou: row.usuario_salvou,
    estaSalvo: row.usuario_salvou,
  };
}

function mapComentarioRowToTipo(row: ComentariosRow): Comentario {
  return {
    id: row.id,
    publicacaoId: row.publicacao_id,
    autorId: row.autor_id || undefined,
    autorNome: row.autor_nome,
    autorAvatar: row.autor_avatar || undefined,
    nomeAutor: row.autor_nome,
    texto: row.texto,
    dataCriacao: new Date(row.data_criacao).getTime(),
    criadoEm: new Date(row.data_criacao).getTime(),
  };
}

function mapInspiracaoRowToTipo(row: InspiracaoesRow & { inspiracao_midias?: InspiracaoMidiasRow[] }): Inspiracao {
  return {
    id: row.id,
    titulo: row.titulo,
    categoria: row.categoria,
    descricao: row.descricao || undefined,
    midias: (row.inspiracao_midias || []).map(m => ({ tipo: m.tipo, src: m.src })),
    curtidas: row.curtidas,
    autorId: row.autor_id || '',
    autorNome: row.autor_nome,
    autorAvatar: row.autor_avatar || undefined,
    dataCriacao: new Date(row.data_criacao).getTime(),
  };
}

// ============================================================================
// SERVICE
// ============================================================================

export const SupabaseFeedService = {
  // ---------------------------------------------------------------------------
  // PUBLICAÇÕES (FEED)
  // ---------------------------------------------------------------------------

  /**
   * Listar publicações do feed (com algoritmo de recomendação)
   */
  async listarFeed(filtro: string, usuarioEmail?: string): Promise<ResultadoServico<Publicacao[]>> {
    if (isMockMode()) {
      const { listarFeed } = await import('@/servicos/api');
      return listarFeed(filtro, usuarioEmail);
    }

    try {
      const supabase = getSupabase();

      // Busca ID do usuário se email fornecido
      let usuarioId: string | null = null;
      let seguindo: string[] = [];
      let inspiracaoSalvas: string[] = [];

      if (usuarioEmail) {
        const { data: user } = await supabase
          .from('usuarios')
          .select('id, seguindo, inspiracao_salvas')
          .eq('email', usuarioEmail)
          .single();
        if (user) {
          usuarioId = user.id;
          seguindo = user.seguindo || [];
          inspiracaoSalvas = user.inspiracao_salvas || [];
        }
      }

      // Query base: publicações de estabelecimentos aprovados
      let query = supabase
        .from('publicacoes')
        .select(`
          *,
          publicacao_midias(*),
          estabelecimentos!inner(status)
        `)
        .eq('estabelecimentos.status', 'aprovado')
        .order('data_criacao', { ascending: false });

      // Filtro por tipo
      if (filtro !== 'todos' && filtro !== 'salvos') {
        query = query.eq('tipo', filtro as PublicacaoTipo);
      }

      // Filtro salvos
      if (filtro === 'salvos' && usuarioId) {
        const { data: salvos } = await supabase
          .from('salvos')
          .select('publicacao_id')
          .eq('usuario_id', usuarioId);
        const ids = salvos?.map(s => s.publicacao_id) || [];
        if (ids.length > 0) {
          query = query.in('id', ids);
        } else {
          return { sucesso: true, dados: [] };
        }
      }

      const { data, error } = await query.limit(50);

      if (error) return { sucesso: false, erro: error.message };

      let pubs = (data || []).map(row => mapPublicacaoRowToTipo(row as any));

      // Algoritmo de recomendação se usuário logado
      if (usuarioId) {
        pubs = pubs.map(p => {
          let score = 0;
          if (seguindo.includes(p.estabelecimentoId)) score += 10;
          if (inspiracaoSalvas.includes(p.id)) score += 5;
          // Avaliação do estabelecimento - precisa buscar
          const idadeHoras = (Date.now() - p.dataCriacao) / 3600000;
          score += Math.max(0, 10 - idadeHoras / 2);
          return { ...p, _score: score };
        }).sort((a, b) => (b._score || 0) - (a._score || 0));
      }

      // Remove _score antes de retornar
      pubs = pubs.map(({ _score, ...p }) => p);

      // Adiciona flags de curtiu/salvou se usuário logado
      if (usuarioId && pubs.length > 0) {
        const pubIds = pubs.map(p => p.id);
        const [curtidas, salvos] = await Promise.all([
          supabase.from('curtidas').select('publicacao_id').eq('usuario_id', usuarioId).in('publicacao_id', pubIds),
          supabase.from('salvos').select('publicacao_id').eq('usuario_id', usuarioId).in('publicacao_id', pubIds),
        ]);

        const curtidasSet = new Set(curtidas.data?.map(c => c.publicacao_id) || []);
        const salvosSet = new Set(salvos.data?.map(s => s.publicacao_id) || []);

        pubs = pubs.map(p => ({
          ...p,
          usuarioCurtiu: curtidasSet.has(p.id),
          estaCurtido: curtidasSet.has(p.id),
          usuarioSalvou: salvosSet.has(p.id),
          estaSalvo: salvosSet.has(p.id),
        }));
      }

      return { sucesso: true, dados: pubs };
    } catch (error) {
      console.error('[SupabaseFeedService.listarFeed] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar feed.' };
    }
  },

  /**
   * Obter publicação por ID
   */
  async obterPublicacao(id: string): Promise<ResultadoServico<Publicacao | null>> {
    if (isMockMode()) {
      const { obterPublicacao } = await import('@/servicos/api');
      return obterPublicacao(id);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('publicacoes')
        .select('*, publicacao_midias(*)')
        .eq('id', id)
        .maybeSingle();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: true, dados: null };

      return { sucesso: true, dados: mapPublicacaoRowToTipo(data as any) };
    } catch (error) {
      console.error('[SupabaseFeedService.obterPublicacao] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar publicação.' };
    }
  },

  /**
   * Criar publicação
   */
  async criarPublicacao(dados: Omit<Publicacao, 'id' | 'curtidas' | 'salvos' | 'visualizacoes' | 'compartilhamentos' | 'comentarios' | 'dataCriacao' | 'criadoEm' | 'autorId' | 'autorNome' | 'conteudo' | 'usuarioCurtiu' | 'estaCurtido' | 'usuarioSalvou' | 'estaSalvo'>): Promise<ResultadoServico<Publicacao>> {
    if (isMockMode()) {
      const { criarPublicacao } = await import('@/servicos/api');
      return criarPublicacao(dados);
    }

    try {
      const supabase = getSupabase();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { sucesso: false, erro: 'Não autenticado.' };

      // Busca perfil para nome/avatar
      const { data: perfil } = await supabase
        .from('usuarios')
        .select('nome, avatar, estabelecimento_id')
        .eq('id', user.id)
        .single();

      if (!perfil) return { sucesso: false, erro: 'Perfil não encontrado.' };

      // Verifica se é barbeiro do estabelecimento ou admin
      const isAdmin = perfil.papel === 'admin';
      const isBarbeiro = perfil.papel === 'barbeiro' && perfil.estabelecimento_id === dados.estabelecimentoId;

      if (!isAdmin && !isBarbeiro) {
        return { sucesso: false, erro: 'Não autorizado a publicar neste estabelecimento.' };
      }

      // Cria publicação
      const { data: pub, error } = await supabase
        .from('publicacoes')
        .insert({
          estabelecimento_id: dados.estabelecimentoId,
          autor_id: user.id,
          autor_nome: perfil.nome || 'Usuário',
          autor_avatar: perfil.avatar,
          tipo: dados.tipo,
          legenda: dados.legenda,
          tag_servico: dados.tagServico || null,
        })
        .select()
        .single();

      if (error) return { sucesso: false, erro: error.message };

      // Adiciona mídias
      if (dados.midias && dados.midias.length > 0) {
        const midiasInsert = dados.midias.map((m, i) => ({
          publicacao_id: pub.id,
          tipo: m.tipo,
          src: m.src,
          alt: m.alt || null,
          thumbnail: m.thumbnail || null,
          ordem: i,
        }));
        await supabase.from('publicacao_midias').insert(midiasInsert);
      }

      // Notifica seguidores (assíncrono)
      this.notificarSeguidores(dados.estabelecimentoId, pub.id, perfil.nome || '', dados.legenda);

      // Recarrega com mídias
      const { data: pubCompleta } = await supabase
        .from('publicacoes')
        .select('*, publicacao_midias(*)')
        .eq('id', pub.id)
        .single();

      return { sucesso: true, dados: mapPublicacaoRowToTipo(pubCompleta as any) };
    } catch (error) {
      console.error('[SupabaseFeedService.criarPublicacao] Erro:', error);
      return { sucesso: false, erro: 'Erro ao criar publicação.' };
    }
  },

  /**
   * Notificar seguidores (fire-and-forget)
   */
  async notificarSeguidores(estabelecimentoId: string, publicacaoId: string, autorNome: string, legenda: string) {
    if (isMockMode()) return;

    try {
      const supabase = getSupabase();

      const { data: seguidores } = await supabase
        .from('seguidores')
        .select('usuario_id')
        .eq('estabelecimento_id', estabelecimentoId);

      if (!seguidores || seguidores.length === 0) return;

      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, email')
        .in('id', seguidores.map(s => s.usuario_id));

      const est = await supabase
        .from('estabelecimentos')
        .select('nome')
        .eq('id', estabelecimentoId)
        .single();

      const notificacoes = (usuarios || []).map(u => ({
        destinatario_id: u.email,
        tipo: 'mensagem' as const,
        titulo: `Nova publicação de ${est.data?.nome || 'estabelecimento'}`,
        texto: legenda.slice(0, 100),
        lida: false,
        estabelecimento_id: estabelecimentoId,
      }));

      await supabase.from('notificacoes').insert(notificacoes);
    } catch {
      // Silencioso
    }
  },

  /**
   * Curtir/descurtir publicação
   */
  async alternarCurtida(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ curtido: boolean; total: number }>> {
    if (isMockMode()) {
      const { alternarCurtida } = await import('@/servicos/api');
      return alternarCurtida(publicacaoId, usuarioEmail);
    }

    try {
      const supabase = getSupabase();

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', usuarioEmail)
        .single();

      if (!usuario) return { sucesso: false, erro: 'Usuário não encontrado.' };

      // Verifica se já curtiu
      const { data: curtidaExistente } = await supabase
        .from('curtidas')
        .select('id')
        .eq('publicacao_id', publicacaoId)
        .eq('usuario_id', usuario.id)
        .maybeSingle();

      if (curtidaExistente) {
        // Descurtir
        await supabase
          .from('curtidas')
          .delete()
          .eq('id', curtidaExistente.id);

        await supabase.rpc('decrementar_contador', {
          tabela: 'publicacoes',
          campo: 'curtidas',
          id_registro: publicacaoId,
        });

        const { data: pub } = await supabase
          .from('publicacoes')
          .select('curtidas')
          .eq('id', publicacaoId)
          .single();

        return { sucesso: true, dados: { curtido: false, total: pub?.curtidas || 0 } };
      } else {
        // Curtir
        await supabase.from('curtidas').insert({
          publicacao_id: publicacaoId,
          usuario_id: usuario.id,
        });

        await supabase.rpc('incrementar_contador', {
          tabela: 'publicacoes',
          campo: 'curtidas',
          id_registro: publicacaoId,
        });

        const { data: pub } = await supabase
          .from('publicacoes')
          .select('curtidas')
          .eq('id', publicacaoId)
          .single();

        return { sucesso: true, dados: { curtido: true, total: pub?.curtidas || 0 } };
      }
    } catch (error) {
      console.error('[SupabaseFeedService.alternarCurtida] Erro:', error);
      return { sucesso: false, erro: 'Erro ao curtir.' };
    }
  },

  /**
   * Salvar/remover inspiração
   */
  async alternarInspiracao(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ salvo: boolean }>> {
    if (isMockMode()) {
      const { alternarInspiracao } = await import('@/servicos/api');
      return alternarInspiracao(publicacaoId, usuarioEmail);
    }

    try {
      const supabase = getSupabase();

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', usuarioEmail)
        .single();

      if (!usuario) return { sucesso: false, erro: 'Usuário não encontrado.' };

      const { data: salvoExistente } = await supabase
        .from('salvos')
        .select('id')
        .eq('publicacao_id', publicacaoId)
        .eq('usuario_id', usuario.id)
        .maybeSingle();

      if (salvoExistente) {
        await supabase.from('salvos').delete().eq('id', salvoExistente.id);
        return { sucesso: true, dados: { salvo: false } };
      } else {
        await supabase.from('salvos').insert({
          publicacao_id: publicacaoId,
          usuario_id: usuario.id,
        });
        return { sucesso: true, dados: { salvo: true } };
      }
    } catch (error) {
      console.error('[SupabaseFeedService.alternarInspiracao] Erro:', error);
      return { sucesso: false, erro: 'Erro ao salvar.' };
    }
  },

  /**
   * Seguir/deixar de seguir estabelecimento
   */
  async alternarSeguir(estabelecimentoId: string, usuarioEmail: string): Promise<ResultadoServico<{ seguindo: boolean }>> {
    if (isMockMode()) {
      const { alternarSeguir } = await import('@/servicos/api');
      return alternarSeguir(estabelecimentoId, usuarioEmail);
    }

    try {
      const supabase = getSupabase();

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', usuarioEmail)
        .single();

      if (!usuario) return { sucesso: false, erro: 'Usuário não encontrado.' };

      const { data: seguindo } = await supabase
        .from('seguidores')
        .select('id')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('usuario_id', usuario.id)
        .maybeSingle();

      if (seguindo) {
        await supabase.from('seguidores').delete().eq('id', seguindo.id);
        await supabase.rpc('decrementar_contador', {
          tabela: 'estabelecimentos',
          campo: 'seguidores',
          id_registro: estabelecimentoId,
        });
        return { sucesso: true, dados: { seguindo: false } };
      } else {
        await supabase.from('seguidores').insert({
          estabelecimento_id: estabelecimentoId,
          usuario_id: usuario.id,
        });
        await supabase.rpc('incrementar_contador', {
          tabela: 'estabelecimentos',
          campo: 'seguidores',
          id_registro: estabelecimentoId,
        });
        return { sucesso: true, dados: { seguindo: true } };
      }
    } catch (error) {
      console.error('[SupabaseFeedService.alternarSeguir] Erro:', error);
      return { sucesso: false, erro: 'Erro ao seguir.' };
    }
  },

  /**
   * Adicionar comentário
   */
  async adicionarComentario(publicacaoId: string, autorNome: string, texto: string): Promise<ResultadoServico<Comentario>> {
    if (isMockMode()) {
      const { adicionarComentario } = await import('@/servicos/api');
      return adicionarComentario(publicacaoId, autorNome, texto);
    }

    try {
      const supabase = getSupabase();

      const { data: { user } } = await supabase.auth.getUser();

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('nome, avatar')
        .eq('id', user?.id || '')
        .single();

      const { data, error } = await supabase
        .from('comentarios')
        .insert({
          publicacao_id: publicacaoId,
          autor_id: user?.id || null,
          autor_nome: autorNome,
          autor_avatar: perfil?.avatar || null,
          texto,
        })
        .select()
        .single();

      if (error) return { sucesso: false, erro: error.message };

      // Incrementa contador de comentários
      await supabase.rpc('incrementar_contador', {
        tabela: 'publicacoes',
        campo: 'comentarios_count',
        id_registro: publicacaoId,
      });

      return { sucesso: true, dados: mapComentarioRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseFeedService.adicionarComentario] Erro:', error);
      return { sucesso: false, erro: 'Erro ao adicionar comentário.' };
    }
  },

  /**
   * Excluir publicação
   */
  async excluirPublicacao(publicacaoId: string, estabelecimentoId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { excluirPublicacao } = await import('@/servicos/api');
      return excluirPublicacao(publicacaoId, estabelecimentoId);
    }

    try {
      const supabase = getSupabase();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { sucesso: false, erro: 'Não autenticado.' };

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('papel, estabelecimento_id')
        .eq('id', user.id)
        .single();

      const isAdmin = perfil?.papel === 'admin';
      const isBarbeiro = perfil?.papel === 'barbeiro' && perfil?.estabelecimento_id === estabelecimentoId;

      if (!isAdmin && !isBarbeiro) {
        return { sucesso: false, erro: 'Não autorizado.' };
      }

      const { error } = await supabase
        .from('publicacoes')
        .delete()
        .eq('id', publicacaoId)
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseFeedService.excluirPublicacao] Erro:', error);
      return { sucesso: false, erro: 'Erro ao excluir publicação.' };
    }
  },

  // ---------------------------------------------------------------------------
  // WRAPPERS PARA COMPATIBILIDADE
  // ---------------------------------------------------------------------------

  async listarPublicacoes(filtros: { estabelecimentoId?: string; usuarioEmail?: string; filtro?: string }): Promise<ResultadoServico<Publicacao[]>> {
    return this.listarFeed(filtros.filtro || 'todos', filtros.usuarioEmail);
  },

  async obterPublicacaoWrapper(publicacaoId: string): Promise<ResultadoServico<Publicacao | null>> {
    return this.obterPublicacao(publicacaoId);
  },

  async criarPublicacaoFeed(dados: Omit<Publicacao, 'id' | 'curtidas' | 'salvos' | 'comentarios' | 'dataCriacao' | 'criadoEm' | 'visualizacoes' | 'compartilhamentos' | 'autorId' | 'autorNome' | 'conteudo' | 'usuarioCurtiu' | 'estaCurtido' | 'usuarioSalvou' | 'estaSalvo'>): Promise<ResultadoServico<Publicacao>> {
    return this.criarPublicacao(dados);
  },

  async excluirPublicacaoWrapper(publicacaoId: string, estabelecimentoId: string): Promise<ResultadoServico<void>> {
    return this.excluirPublicacao(publicacaoId, estabelecimentoId);
  },

  async curtirPublicacao(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ curtido: boolean; total: number }>> {
    return this.alternarCurtida(publicacaoId, usuarioEmail);
  },

  async salvarPublicacao(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ salvo: boolean }>> {
    return this.alternarInspiracao(publicacaoId, usuarioEmail);
  },

  async obterSalvas(usuarioEmail: string): Promise<ResultadoServico<Publicacao[]>> {
    return this.listarFeed('salvos', usuarioEmail);
  },

  async compartilharPublicacao(publicacaoId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { compartilharPublicacao } = await import('@/servicos/api');
      return compartilharPublicacao(publicacaoId);
    }

    try {
      const supabase = getSupabase();
      await supabase.rpc('incrementar_contador', {
        tabela: 'publicacoes',
        campo: 'compartilhamentos',
        id_registro: publicacaoId,
      });
      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseFeedService.compartilharPublicacao] Erro:', error);
      return { sucesso: false, erro: 'Erro ao compartilhar.' };
    }
  },

  async denunciarPublicacao(publicacaoId: string, motivo: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { denunciarPublicacao } = await import('@/servicos/api');
      return denunciarPublicacao(publicacaoId, motivo);
    }

    // Em produção, salvaria em tabela denuncias
    console.log(`[SupabaseFeedService] Publicação ${publicacaoId} denunciada: ${motivo}`);
    return { sucesso: true, dados: undefined };
  },

  // ---------------------------------------------------------------------------
  // INSPIRAÇÕES
  // ---------------------------------------------------------------------------

  async listarInspiracoes(categoria?: InspiracaoCategoria): Promise<ResultadoServico<Inspiracao[]>> {
    if (isMockMode()) {
      // Mock não tem inspirações, retorna vazio
      return { sucesso: true, dados: [] };
    }

    try {
      const supabase = getSupabase();

      let query = supabase
        .from('inspiracaoes')
        .select('*, inspiracao_midias(*)')
        .order('data_criacao', { ascending: false });

      if (categoria) {
        query = query.eq('categoria', categoria);
      }

      const { data, error } = await query.limit(50);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data || []).map(mapInspiracaoRowToTipo) };
    } catch (error) {
      console.error('[SupabaseFeedService.listarInspiracoes] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar inspirações.' };
    }
  },

  async criarInspiracao(dados: Omit<Inspiracao, 'id' | 'curtidas' | 'dataCriacao'>): Promise<ResultadoServico<Inspiracao>> {
    if (isMockMode()) {
      return { sucesso: false, erro: 'Não disponível no modo mock.' };
    }

    try {
      const supabase = getSupabase();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { sucesso: false, erro: 'Não autenticado.' };

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('nome, avatar')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase
        .from('inspiracaoes')
        .insert({
          titulo: dados.titulo,
          categoria: dados.categoria,
          descricao: dados.descricao || null,
          autor_id: user.id,
          autor_nome: perfil?.nome || 'Usuário',
          autor_avatar: perfil?.avatar || null,
        })
        .select()
        .single();

      if (error) return { sucesso: false, erro: error.message };

      // Adiciona mídias
      if (dados.midias && dados.midias.length > 0) {
        const midiasInsert = dados.midias.map((m, i) => ({
          inspiracao_id: data.id,
          tipo: m.tipo,
          src: m.src,
          ordem: i,
        }));
        await supabase.from('inspiracao_midias').insert(midiasInsert);
      }

      const { data: completa } = await supabase
        .from('inspiracaoes')
        .select('*, inspiracao_midias(*)')
        .eq('id', data.id)
        .single();

      return { sucesso: true, dados: mapInspiracaoRowToTipo(completa as any) };
    } catch (error) {
      console.error('[SupabaseFeedService.criarInspiracao] Erro:', error);
      return { sucesso: false, erro: 'Erro ao criar inspiração.' };
    }
  },
};

export default SupabaseFeedService;