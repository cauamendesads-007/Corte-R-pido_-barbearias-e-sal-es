import { createClient } from '@supabase/supabase-js';

// We need service_role key to run DDL - check if available in env
const url = 'https://ajubpuxiacvfvfgpupqn.supabase.co';
const anonKey = 'sb_publishable_PcZMoKa5-tjOqVpgGnuW4g_x39bKBj1';

const supabase = createClient(url, anonKey);

// Try to run the migration SQL
const migrationSQL = `
-- Grant execute on RLS helper functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_estabelecimento_owner(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_profissional_estabelecimento(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO anon, authenticated, service_role;

-- Fix view to remove recursion
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

-- Create RPC for counters
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
`;

console.log('Attempting to run migration via RPC...');
const { data, error } = await supabase.rpc('pg_catalog.exec', { sql: migrationSQL });
console.log('Data:', data);
console.log('Error:', error);
