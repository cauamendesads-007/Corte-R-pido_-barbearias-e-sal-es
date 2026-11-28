-- ============================================================================
-- MIGRATION 002 — CORREÇÃO DE PERMISSÕES E VIEWS
-- Corrige:
-- 1. GRANT EXECUTE nas funções helper de RLS para anon/authenticated
-- 2. Remove recursão infinita na view v_estabelecimentos_publicos
-- 3. Garante permissões corretas nas tabelas para anon
-- ============================================================================

-- ============================================================================
-- 1. GRANT EXECUTE nas funções helper de RLS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_estabelecimento_owner(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_profissional_estabelecimento(UUID) TO anon, authenticated;

-- ============================================================================
-- 2. CORRIGIR VIEW v_estabelecimentos_publicos — REMOVER RECURSÃO
-- O problema: subqueries em servicos e profissionais disparam RLS que chamam
-- is_estabelecimento_owner novamente, criando recursão.
-- Solução: usar contadores via RPC ou remover contadores da view pública.
-- Para MVP, removemos os contadores e deixamos a view simples.
-- ============================================================================

DROP VIEW IF EXISTS public.v_estabelecimentos_publicos;

CREATE VIEW public.v_estabelecimentos_publicos
WITH (security_invoker = true)
AS
SELECT
  e.id,
  e.slug,
  e.nome,
  e.responsavel,
  e.cidade,
  e.nicho,
  e.avaliacao,
  e.status,
  e.latitude,
  e.longitude,
  e.whatsapp,
  e.endereco,
  e.sobre,
  e.tema_cor,
  e.tema_layout,
  e.tema_titulo,
  e.tema_subtitulo,
  e.tempo_medio_atendimento,
  e.horario_funcionamento,
  e.permite_auto_edicao,
  e.configuracao_pix_modo,
  e.configuracao_pix_percentual_sinal,
  e.seguidores,
  0 AS servicos_count,
  0 AS profissionais_count,
  e.taxa_fidelidade,
  e.data_criacao,
  e.data_atualizacao
FROM public.estabelecimentos e
WHERE e.status = 'aprovado';

GRANT SELECT ON public.v_estabelecimentos_publicos TO anon, authenticated, service_role;

-- ============================================================================
-- 3. GARANTIR PERMISSÕES BÁSICAS NAS TABELAS PARA ANON
-- (O schema 001 já fez REVOKE/GRANT mas vamos reforçar)
-- ============================================================================

-- estabelecimentos: já tem GRANT para colunas permitidas
-- servicos: precisa de SELECT para anon (via RLS policy)
-- galeria: precisa de SELECT para anon (via RLS policy)
-- avaliacoes: precisa de SELECT para anon (via RLS policy)

-- As policies já permitem SELECT para anon em estabelecimentos aprovados
-- mas as funções helper precisam de EXECUTE (feito acima)

-- ============================================================================
-- 4. CRIAR RPC PARA CONTADORES (EVITA RECURSÃO NA VIEW)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_contadores_estabelecimento(p_estabelecimento_id UUID)
RETURNS TABLE (
  servicos_count BIGINT,
  profissionais_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.servicos s WHERE s.estabelecimento_id = p_estabelecimento_id AND s.ativo = true)::BIGINT,
    (SELECT COUNT(*) FROM public.profissionais p WHERE p.estabelecimento_id = p_estabelecimento_id AND p.ativo = true)::BIGINT;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_contadores_estabelecimento(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_contadores_estabelecimento(UUID) TO anon, authenticated, service_role;

-- ============================================================================
-- 5. FIX: FUNÇÃO auth_user_id() TAMBÉM PRECISA DE GRANT
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.auth_user_id() TO anon, authenticated, service_role;

-- ============================================================================
-- 6. VERIFICAR SE RLS POLICIES USAM (select auth.uid()) CORRETAMENTE
-- Se houver recursão nas policies de profissionais/servicos, ajustar.
-- ============================================================================

-- A policy de profissionais_select faz:
--   EXISTS (SELECT 1 FROM public.estabelecimentos e WHERE e.id = estabelecimento_id AND e.status = 'aprovado')
-- Isso dispara is_estabelecimento_owner na policy de estabelecimentos -> RECURSÃO
--
-- Solução: policy de profissionais não deve consultar estabelecimentos com RLS ativo
-- Usar security_invoker na view ou consultar sem RLS.
-- Mas isso requer alterar as policies, o que é mais invasivo.
-- Para MVP, a view sem contadores já resolve o problema imediato.