// ============================================================================
// SUPABASE ADMIN SERVICE
// Gestão administrativa: usuários, estabelecimentos, planos, assinaturas, pagamentos
// ============================================================================

import { getSupabase, isMockMode } from './client';
import type { Database } from './types';
import type {
  ResultadoServico,
  Usuario,
  Estabelecimento,
  PlanoAssinatura,
  AssinaturaEstabelecimento,
  StatusEstabelecimento,
  NichoEstabelecimento,
  TipoLayout,
  Avaliacao,
  ConfiguracaoPix,
  Servico,
  ItemGaleria,
} from '@/tipos';

type UsuarioRow = Database['public']['Tables']['usuarios']['Row'];
type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update'];
type EstabelecimentoRow = Database['public']['Tables']['estabelecimentos']['Row'];
type EstabelecimentoUpdate = Database['public']['Tables']['estabelecimentos']['Update'];
type PlanoAssinaturaRow = Database['public']['Tables']['planos_assinatura']['Row'];
type PlanoAssinaturaInsert = Database['public']['Tables']['planos_assinatura']['Insert'];
type PlanoAssinaturaUpdate = Database['public']['Tables']['planos_assinatura']['Update'];
type AssinaturaRow = Database['public']['Tables']['assinaturas']['Row'];
type PagamentoRow = Database['public']['Tables']['pagamentos']['Row'];
type VEstabelecimentosPublicosRow = Database['public']['Views']['v_estabelecimentos_publicos']['Row'];

// ============================================================================
// HELPERS DE MAPEAMENTO
// ============================================================================

function mapUsuarioRowToTipo(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    email: row.email,
    senha: '',
    papel: row.papel,
    nome: row.nome,
    bio: row.bio,
    whatsapp: row.whatsapp,
    cidade: row.cidade,
    avatar: row.avatar,
    estabelecimentoId: row.estabelecimento_id,
    confirmado: row.confirmado,
    lembretesWhatsapp: row.lembretes_whatsapp,
    seguindo: row.seguindo || [],
    inspiracoesSalvas: row.inspiracao_salvas || [],
  };
}

function mapEstabelecimentoRowToTipo(row: EstabelecimentoRow | VEstabelecimentosPublicosRow): Estabelecimento {
  return {
    id: row.id,
    slug: row.slug,
    nome: row.nome,
    responsavel: row.responsavel,
    cidade: row.cidade,
    nicho: row.nicho,
    avaliacao: row.avaliacao,
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    whatsapp: row.whatsapp,
    endereco: row.endereco,
    sobre: row.sobre || '',
    tema: {
      cor: row.tema_cor,
      layout: row.tema_layout,
      titulo: row.tema_titulo || '',
      subtitulo: row.tema_subtitulo || '',
    },
    servicos: [],
    galeria: [],
    fila: [],
    tempoMedioAtendimento: row.tempo_medio_atendimento,
    horarioFuncionamento: row.horario_funcionamento,
    permiteAutoEdicao: row.permite_auto_edicao,
    configuracaoPix: {
      modo: row.configuracao_pix_modo,
      chave: row.configuracao_pix_chave || '',
      percentualSinal: row.configuracao_pix_percentual_sinal,
    },
    avaliacoes: [],
    seguidores: row.seguidores,
    taxaFidelidade: row.taxa_fidelidade,
  };
}

function mapPlanoRowToTipo(row: PlanoAssinaturaRow): PlanoAssinatura {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    preco: row.preco_centavos / 100,
  };
}

function mapAvaliacaoRowToTipo(row: Database['public']['Tables']['avaliacoes']['Row']): Avaliacao {
  return {
    id: row.id,
    nomeCliente: row.nome_cliente,
    estrelas: row.estrelas,
    comentario: row.comentario || '',
    data: row.data_criacao,
    resposta: row.resposta || undefined,
  };
}

// ============================================================================
// SERVICE
// ============================================================================

export const SupabaseAdminService = {
  // ---------------------------------------------------------------------------
  // USUÁRIOS (ADMIN)
  // ---------------------------------------------------------------------------

  /**
   * Listar todos usuários (admin)
   */
  async listarUsuariosAdmin(): Promise<ResultadoServico<Usuario[]>> {
    if (isMockMode()) {
      const { listarUsuariosAdmin } = await import('@/servicos/api');
      return listarUsuariosAdmin();
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('data_cadastro', { ascending: false });

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data || []).map(mapUsuarioRowToTipo) };
    } catch (error) {
      console.error('[SupabaseAdminService.listarUsuariosAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao listar usuários.' };
    }
  },

  /**
   * Obter usuário por ID (admin)
   */
  async obterUsuarioAdmin(id: string): Promise<ResultadoServico<Usuario | null>> {
    if (isMockMode()) {
      const { obterUsuarioAdmin } = await import('@/servicos/api');
      return obterUsuarioAdmin(id);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: true, dados: null };

      return { sucesso: true, dados: mapUsuarioRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseAdminService.obterUsuarioAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar usuário.' };
    }
  },

  /**
   * Atualizar usuário (admin)
   */
  async atualizarUsuarioAdmin(id: string, dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
    if (isMockMode()) {
      const { atualizarUsuarioAdmin } = await import('@/servicos/api');
      return atualizarUsuarioAdmin(id, dados);
    }

    try {
      const supabase = getSupabase();

      const updateData: UsuarioUpdate = {
        papel: dados.papel,
        nome: dados.nome,
        bio: dados.bio,
        whatsapp: dados.whatsapp,
        cidade: dados.cidade,
        avatar: dados.avatar,
        estabelecimento_id: dados.estabelecimentoId,
        confirmado: dados.confirmado,
        lembretes_whatsapp: dados.lembretesWhatsapp,
        seguindo: dados.seguindo,
        inspiracao_salvas: dados.inspiracoesSalvas,
        cpf: dados.cpf,
        data_atualizacao: new Date().toISOString(),
      };
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      const { data, error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: mapUsuarioRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseAdminService.atualizarUsuarioAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao atualizar usuário.' };
    }
  },

  /**
   * Excluir usuário (admin) - chama Edge Function LGPD
   */
  async excluirUsuarioAdmin(id: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { excluirUsuarioAdmin } = await import('@/servicos/api');
      return excluirUsuarioAdmin(id);
    }

    try {
      const supabase = getSupabase();

      // Deleta do Auth (trigger faz anonimização no banco)
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAdminService.excluirUsuarioAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao excluir usuário.' };
    }
  },

  // ---------------------------------------------------------------------------
  // ESTABELECIMENTOS (ADMIN)
  // ---------------------------------------------------------------------------

  /**
   * Listar todos estabelecimentos (admin - todos status)
   */
  async listarEstabelecimentosAdmin(): Promise<ResultadoServico<Estabelecimento[]>> {
    if (isMockMode()) {
      const { listarEstabelecimentosAdmin } = await import('@/servicos/api');
      return listarEstabelecimentosAdmin();
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('estabelecimentos')
        .select('*')
        .order('data_criacao', { ascending: false });

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data || []).map(mapEstabelecimentoRowToTipo) };
    } catch (error) {
      console.error('[SupabaseAdminService.listarEstabelecimentosAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao listar estabelecimentos.' };
    }
  },

  /**
   * Obter estabelecimento (admin)
   */
  async obterEstabelecimentoAdmin(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
    if (isMockMode()) {
      const { obterEstabelecimentoAdmin } = await import('@/servicos/api');
      return obterEstabelecimentoAdmin(id);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('estabelecimentos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: true, dados: null };

      return { sucesso: true, dados: mapEstabelecimentoRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseAdminService.obterEstabelecimentoAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar estabelecimento.' };
    }
  },

  /**
   * Aprovar estabelecimento
   */
  async aprovarEstabelecimento(id: string): Promise<ResultadoServico<void>> {
    return this.alterarStatusEstabelecimento(id, 'aprovado');
  },

  /**
   * Rejeitar estabelecimento
   */
  async rejeitarEstabelecimento(id: string): Promise<ResultadoServico<void>> {
    return this.alterarStatusEstabelecimento(id, 'rejeitado');
  },

  /**
   * Suspender estabelecimento
   */
  async suspenderEstabelecimento(id: string): Promise<ResultadoServico<void>> {
    return this.alterarStatusEstabelecimento(id, 'pendente');
  },

  /**
   * Alterar status do estabelecimento
   */
  async alterarStatusEstabelecimento(id: string, status: StatusEstabelecimento): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { alterarStatusEstabelecimento } = await import('@/servicos/api');
      return alterarStatusEstabelecimento(id, status);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('estabelecimentos')
        .update({ status, data_atualizacao: new Date().toISOString() })
        .eq('id', id);

      if (error) return { sucesso: false, erro: error.message };

      // Notifica barbeiro (insere notificação)
      const { data: barbeiro } = await supabase
        .from('usuarios')
        .select('email')
        .eq('estabelecimento_id', id)
        .eq('papel', 'barbeiro')
        .single();

      if (barbeiro) {
        await supabase.from('notificacoes').insert({
          destinatario_id: barbeiro.email,
          tipo: 'administracao',
          titulo: status === 'aprovado' ? 'Cadastro aprovado!' : 'Cadastro reprovado',
          texto: status === 'aprovado'
            ? 'Seu cadastro foi aprovado. Bem-vindo ao Corte Rápido!'
            : 'Seu cadastro não foi aprovado. Entre em contato para mais detalhes.',
          lida: false,
          estabelecimento_id: id,
        });
      }

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAdminService.alterarStatusEstabelecimento] Erro:', error);
      return { sucesso: false, erro: 'Erro ao alterar status.' };
    }
  },

  /**
   * Permitir auto-edição da página pelo barbeiro
   */
  async definirAutoEdicao(estabelecimentoId: string, permitido: boolean): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { definirAutoEdicao } = await import('@/servicos/api');
      return definirAutoEdicao(estabelecimentoId, permitido);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('estabelecimentos')
        .update({ permite_auto_edicao: permitido, data_atualizacao: new Date().toISOString() })
        .eq('id', estabelecimentoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAdminService.definirAutoEdicao] Erro:', error);
      return { sucesso: false, erro: 'Erro ao definir auto-edição.' };
    }
  },

  // ---------------------------------------------------------------------------
  // PLANOS DE ASSINATURA (ADMIN)
  // ---------------------------------------------------------------------------

  /**
   * Listar planos
   */
  async listarPlanos(): Promise<ResultadoServico<PlanoAssinatura[]>> {
    if (isMockMode()) {
      const { listarPlanos } = await import('@/servicos/api');
      return listarPlanos();
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('planos_assinatura')
        .select('*')
        .eq('ativo', true)
        .order('ordem_exibicao');

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data || []).map(mapPlanoRowToTipo) };
    } catch (error) {
      console.error('[SupabaseAdminService.listarPlanos] Erro:', error);
      return { sucesso: false, erro: 'Erro ao listar planos.' };
    }
  },

  /**
   * Obter planos (admin - inclui inativos)
   */
  async obterPlanosAdmin(): Promise<ResultadoServico<PlanoAssinatura[]>> {
    if (isMockMode()) {
      const { obterPlanosAdmin } = await import('@/servicos/api');
      return obterPlanosAdmin();
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('planos_assinatura')
        .select('*')
        .order('ordem_exibicao');

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data || []).map(mapPlanoRowToTipo) };
    } catch (error) {
      console.error('[SupabaseAdminService.obterPlanosAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar planos.' };
    }
  },

  /**
   * Criar plano (admin)
   */
  async criarPlanoAdmin(dados: Omit<PlanoAssinatura, 'id'>): Promise<ResultadoServico<PlanoAssinatura>> {
    if (isMockMode()) {
      const { criarPlanoAdmin } = await import('@/servicos/api');
      return criarPlanoAdmin(dados);
    }

    try {
      const supabase = getSupabase();

      // Obtém próxima ordem
      const { data: maxOrdem, error: maxOrdemError } = await supabase
        .from('planos_assinatura')
        .select('ordem_exibicao')
        .order('ordem_exibicao', { ascending: false })
        .limit(1);

      if (maxOrdemError) {
        console.error('[SupabaseAdminService.criarPlanoAdmin] Erro ao buscar ordem:', maxOrdemError);
        return { sucesso: false, erro: 'Erro ao criar plano.' };
      }

      const proximaOrdem = (maxOrdem?.[0]?.ordem_exibicao || 0) + 1;

      const { data, error } = await supabase
        .from('planos_assinatura')
        .insert({
          nome: dados.nome,
          tipo: dados.tipo,
          preco_centavos: Math.round(dados.preco * 100),
          descricao: null,
          funcionalidades: null,
          ativo: true,
          ordem_exibicao: proximaOrdem,
        })
        .select()
        .single();

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: mapPlanoRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseAdminService.criarPlanoAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao criar plano.' };
    }
  },

  /**
   * Atualizar plano (admin)
   */
  async atualizarPlanoAdmin(planoId: string, dados: Partial<PlanoAssinatura>): Promise<ResultadoServico<PlanoAssinatura>> {
    if (isMockMode()) {
      const { atualizarPlanoAdmin } = await import('@/servicos/api');
      return atualizarPlanoAdmin(planoId, dados);
    }

    try {
      const supabase = getSupabase();

      const updateData: PlanoAssinaturaUpdate = {
        nome: dados.nome,
        tipo: dados.tipo,
        preco_centavos: dados.preco ? Math.round(dados.preco * 100) : undefined,
        ativo: dados.preco !== undefined ? undefined : dados.preco, // hack para tipagem
        data_atualizacao: new Date().toISOString(),
      };
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      const { data, error } = await supabase
        .from('planos_assinatura')
        .update(updateData)
        .eq('id', planoId)
        .select()
        .single();

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: mapPlanoRowToTipo(data) };
    } catch (error) {
      console.error('[SupabaseAdminService.atualizarPlanoAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao atualizar plano.' };
    }
  },

  /**
   * Excluir plano (admin)
   */
  async excluirPlanoAdmin(planoId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { excluirPlanoAdmin } = await import('@/servicos/api');
      return excluirPlanoAdmin(planoId);
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('planos_assinatura')
        .delete()
        .eq('id', planoId);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAdminService.excluirPlanoAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao excluir plano.' };
    }
  },

  // ---------------------------------------------------------------------------
  // ASSINATURAS (ADMIN)
  // ---------------------------------------------------------------------------

  /**
   * Listar assinaturas (admin)
   */
  async listarAssinaturasAdmin(): Promise<ResultadoServico<Record<string, AssinaturaEstabelecimento>>> {
    if (isMockMode()) {
      const { listarAssinaturasAdmin } = await import('@/servicos/api');
      return listarAssinaturasAdmin();
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('assinaturas')
        .select('*, planos_assinatura(nome, tipo, preco_centavos), estabelecimentos(nome)')
        .eq('status', 'ativa');

      if (error) return { sucesso: false, erro: error.message };

      const assinaturas: Record<string, AssinaturaEstabelecimento> = {};
      (data || []).forEach(a => {
        assinaturas[a.estabelecimento_id] = {
          planoId: a.plano_id,
          inicioContrato: a.inicio_contrato,
          vencimento: a.vencimento,
          historicoPagamentos: [], // TODO: buscar de pagamentos
        };
      });

      return { sucesso: true, dados: assinaturas };
    } catch (error) {
      console.error('[SupabaseAdminService.listarAssinaturasAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao listar assinaturas.' };
    }
  },

  /**
   * Obter assinatura do estabelecimento
   */
  async obterAssinatura(estabelecimentoId: string): Promise<ResultadoServico<AssinaturaEstabelecimento | null>> {
    if (isMockMode()) {
      const { obterAssinatura } = await import('@/servicos/api');
      return obterAssinatura(estabelecimentoId);
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('assinaturas')
        .select('*, planos_assinatura(*)')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('status', 'ativa')
        .maybeSingle();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: true, dados: null };

      return {
        sucesso: true,
        dados: {
          planoId: data.plano_id,
          inicioContrato: data.inicio_contrato,
          vencimento: data.vencimento,
          desconto: data.desconto_tipo ? {
            tipo: data.desconto_tipo as 'percentual' | 'valor_fixo',
            valor: data.desconto_valor || 0,
            motivo: data.desconto_motivo || undefined,
          } : undefined,
          historicoPagamentos: [], // TODO: buscar de pagamentos
        },
      };
    } catch (error) {
      console.error('[SupabaseAdminService.obterAssinatura] Erro:', error);
      return { sucesso: false, erro: 'Erro ao buscar assinatura.' };
    }
  },

  /**
   * Atualizar contrato/assinatura (admin)
   */
  async atualizarContrato(estabelecimentoId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { atualizarContrato } = await import('@/servicos/api');
      return atualizarContrato(estabelecimentoId);
    }

    // Em produção, atualizaria tabela assinaturas
    // Notifica barbeiro
    try {
      const supabase = getSupabase();

      const { data: barbeiro } = await supabase
        .from('usuarios')
        .select('email')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('papel', 'barbeiro')
        .single();

      if (barbeiro) {
        await supabase.from('notificacoes').insert({
          destinatario_id: barbeiro.email,
          tipo: 'pagamento',
          titulo: 'Contrato atualizado',
          texto: 'A administração alterou seu contrato.',
          lida: false,
          estabelecimento_id: estabelecimentoId,
        });
      }

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAdminService.atualizarContrato] Erro:', error);
      return { sucesso: false, erro: 'Erro ao atualizar contrato.' };
    }
  },

  /**
   * Registrar pagamento recebido (admin)
   */
  async registrarPagamento(estabelecimentoId: string): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { registrarPagamento } = await import('@/servicos/api');
      return registrarPagamento(estabelecimentoId);
    }

    try {
      const supabase = getSupabase();

      const { data: barbeiro } = await supabase
        .from('usuarios')
        .select('email')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('papel', 'barbeiro')
        .single();

      if (barbeiro) {
        await supabase.from('notificacoes').insert({
          destinatario_id: barbeiro.email,
          tipo: 'pagamento',
          titulo: 'Pagamento registrado',
          texto: 'A administração registrou seu pagamento. Novo vencimento atualizado.',
          lida: false,
          estabelecimento_id: estabelecimentoId,
        });
      }

      // TODO: Atualizar vencimento na tabela assinaturas

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAdminService.registrarPagamento] Erro:', error);
      return { sucesso: false, erro: 'Erro ao registrar pagamento.' };
    }
  },

  /**
   * Ajustar vencimento (+ dias)
   */
  async ajustarVencimento(estabelecimentoId: string, dias: number): Promise<ResultadoServico<void>> {
    if (isMockMode()) {
      const { ajustarVencimento } = await import('@/servicos/api');
      return ajustarVencimento(estabelecimentoId, dias);
    }

    try {
      const supabase = getSupabase();

      const { data: barbeiro } = await supabase
        .from('usuarios')
        .select('email')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('papel', 'barbeiro')
        .single();

      if (barbeiro) {
        await supabase.from('notificacoes').insert({
          destinatario_id: barbeiro.email,
          tipo: 'pagamento',
          titulo: 'Vencimento alterado',
          texto: `Novo vencimento do seu plano em ${dias} dia(s).`,
          lida: false,
          estabelecimento_id: estabelecimentoId,
        });
      }

      // TODO: Atualizar vencimento na tabela assinaturas

      return { sucesso: true, dados: undefined };
    } catch (error) {
      console.error('[SupabaseAdminService.ajustarVencimento] Erro:', error);
      return { sucesso: false, erro: 'Erro ao ajustar vencimento.' };
    }
  },

  // ---------------------------------------------------------------------------
  // PAGAMENTOS (ADMIN)
  // ---------------------------------------------------------------------------

  /**
   * Listar pagamentos (admin)
   */
  async listarPagamentosAdmin(): Promise<ResultadoServico<Array<{ estabelecimento: string; data: string; valor: number; status: string }>>> {
    if (isMockMode()) {
      const { listarPagamentosAdmin } = await import('@/servicos/api');
      return listarPagamentosAdmin();
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('pagamentos')
        .select('*, estabelecimentos(nome)')
        .order('data_criacao', { ascending: false });

      if (error) return { sucesso: false, erro: error.message };

      const pagamentos = (data || []).map(p => ({
        estabelecimento: (p.estabelecimentos as any)?.nome || 'Desconhecido',
        data: p.data_criacao.split('T')[0],
        valor: p.valor_centavos / 100,
        status: p.status,
      }));

      return { sucesso: true, dados: pagamentos };
    } catch (error) {
      console.error('[SupabaseAdminService.listarPagamentosAdmin] Erro:', error);
      return { sucesso: false, erro: 'Erro ao listar pagamentos.' };
    }
  },

  // ---------------------------------------------------------------------------
  // WRAPPERS PARA COMPATIBILIDADE
  // ---------------------------------------------------------------------------

  async listarTodosEstabelecimentosAdmin(): Promise<ResultadoServico<Estabelecimento[]>> {
    return this.listarEstabelecimentosAdmin();
  },

  async listarUsuarios(): Promise<ResultadoServico<Usuario[]>> {
    return this.listarUsuariosAdmin();
  },

  async obterUsuario(id: string): Promise<ResultadoServico<Usuario | null>> {
    return this.obterUsuarioAdmin(id);
  },

  async listarPagamentos(): Promise<ResultadoServico<Array<{ estabelecimento: string; data: string; valor: number; status: string }>>> {
    return this.listarPagamentosAdmin();
  },

  async obterPlanos(): Promise<ResultadoServico<PlanoAssinatura[]>> {
    return this.listarPlanos();
  },

  async criarPlano(dados: Omit<PlanoAssinatura, 'id'>): Promise<ResultadoServico<PlanoAssinatura>> {
    return this.criarPlanoAdmin(dados);
  },

  async atualizarPlano(planoId: string, dados: Partial<PlanoAssinatura>): Promise<ResultadoServico<PlanoAssinatura>> {
    return this.atualizarPlanoAdmin(planoId, dados);
  },

  async excluirPlano(planoId: string): Promise<ResultadoServico<void>> {
    return this.excluirPlanoAdmin(planoId);
  },

  async listarAssinaturas(): Promise<ResultadoServico<Record<string, AssinaturaEstabelecimento>>> {
    return this.listarAssinaturasAdmin();
  },
};

export default SupabaseAdminService;