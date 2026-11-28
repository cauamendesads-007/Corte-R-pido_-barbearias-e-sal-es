-- ============================================================================
-- EXECUTE ESTE SCRIPT NO SUPABASE DASHBOARD > SQL EDITOR
-- Copie e cole todo o conteúdo abaixo e clique em "Run"
-- ============================================================================

-- 1. GRANT EXECUTE nas funções helper de RLS para anon/authenticated
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_estabelecimento_owner(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_profissional_estabelecimento(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO anon, authenticated, service_role;

-- 2. CORRIGIR VIEW v_estabelecimentos_publicos — REMOVER RECURSÃO INFINITA
-- O problema: subqueries em servicos/profissionais disparam RLS que chamam
-- is_estabelecimento_owner novamente, criando recursão infinita.
-- Solução: remover contadores da view (serão buscados via RPC separado se necessário)

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

-- 3. CRIAR RPC PARA CONTADORES (EVITA RECURSÃO NA VIEW)
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
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- Rode estes selects para confirmar que funcionou:
-- ============================================================================

-- Verificar grants nas funções
SELECT proname, proacl FROM pg_proc
WHERE proname IN ('is_admin', 'is_estabelecimento_owner', 'is_profissional_estabelecimento', 'auth_user_id', 'rpc_contadores_estabelecimento');

-- Verificar view
SELECT * FROM public.v_estabelecimentos_publicos LIMIT 1;

-- Testar RPC de contadores
SELECT * FROM public.rpc_contadores_estabelecimento('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');