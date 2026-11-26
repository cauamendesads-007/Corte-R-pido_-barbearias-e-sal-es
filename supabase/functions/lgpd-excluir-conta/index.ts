// ============================================================================
// EDGE FUNCTION: lgpd-excluir-conta
// Executa anonimização/exclusão de dados pessoais (Art. 18 LGPD)
// Respeita retenções fiscais obrigatórias (não apaga pagamentos/notas fiscais)
// ============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://corte-rapido.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const env = Deno.env.toObject() as unknown as Env;

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ============================================================================
// VALIDAÇÃO ZOD
// ============================================================================

const ExcluirContaSchema = z.object({
  confirmacao: z.literal("CONFIRMO_EXCLUSAO_MINHA_CONTA_E_DADOS_PESSOAIS"),
  motivo: z.enum(["nao_uso_mais", "privacidade", "insatisfacao", "outro"]).optional(),
  motivo_detalhes: z.string().max(500).optional(),
});

// ============================================================================
// ERROS RFC 7807
// ============================================================================

class HttpError extends Error {
  constructor(
    public _status: number,
    public _title: string,
    public detail: string,
    public _code?: string,
    public _errors?: Record<string, string[]>
  ) {
    super(detail);
    this.name = "HttpError";
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({
        type: `https://corte-rapido.app/errors/${this._code || "error"}`,
        title: this._title,
        status: this._status,
        detail: this.detail,
        code: this._code,
        errors: this._errors,
        timestamp: new Date().toISOString(),
      }),
      { status: this._status, headers: { ...corsHeaders, "Content-Type": "application/problem+json" } }
    );
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function getAuthenticatedUser(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Não autenticado", "Token de autorização ausente ou inválido", "UNAUTHENTICATED");
  }
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, "Token inválido", "Token de acesso expirado ou inválido", "INVALID_TOKEN");
  }
  return data.user;
}

async function checkPendingAgendamentos(userId: string) {
  const { data, error } = await supabase
    .from("agendamentos")
    .select("id, status, status_pagamento")
    .eq("usuario_id", userId)
    .in("status", ["agendado", "confirmado"])
    .limit(1);

  if (error) {
    throw new HttpError(500, "Erro interno", "Falha ao verificar agendamentos", "DB_ERROR");
  }

  return data && data.length > 0;
}

async function checkActiveAssinatura(userId: string) {
  // Verifica se usuário é barbeiro dono de estabelecimento com assinatura ativa
  const { data: user } = await supabase
    .from("usuarios")
    .select("papel, estabelecimento_id")
    .eq("id", userId)
    .single();

  if (!user || user.papel !== "barbeiro" || !user.estabelecimento_id) {
    return false;
  }

  const { data, error } = await supabase
    .from("assinaturas")
    .select("id, status")
    .eq("estabelecimento_id", user.estabelecimento_id)
    .eq("status", "ativa")
    .limit(1);

  if (error) {
    throw new HttpError(500, "Erro interno", "Falha ao verificar assinatura", "DB_ERROR");
  }

  return data && data.length > 0;
}

async function anonymizeUserData(userId: string) {
  // Chama a RPC do banco que faz anonimização completa
  const { error } = await supabase.rpc("rpc_anonimizar_usuario", {
    p_usuario_id: userId,
  });

  if (error) {
    throw new HttpError(500, "Erro ao anonimizar", error.message, "ANONYMIZATION_ERROR");
  }
}

async function deleteAuthUser(userId: string) {
  // Deleta usuário do Supabase Auth (requer service_role)
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    // Não falha a operação se auth delete falhar - dados já anonimizados
    console.error("Erro ao deletar usuário do Auth:", error);
  }
}

async function revokeAllSessions(userId: string) {
  // Revoga todas as sessões/refresh tokens do usuário
  const { error } = await supabase.auth.admin.revokeAllRefreshTokens(userId);

  if (error) {
    console.error("Erro ao revogar sessões:", error);
  }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new HttpError(405, "Método não permitido", "Apenas POST é permitido", "METHOD_NOT_ALLOWED").toResponse();
  }

  try {
    // 1. Autenticação
    const user = await getAuthenticatedUser(req.headers.get("authorization"));
    const userId = user.id;

    // 2. Parse e validação
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "JSON inválido", "Corpo da requisição deve ser JSON válido", "INVALID_JSON");
    }

    const input = ExcluirContaSchema.parse(body);

    // 3. Verificações de bloqueio (LGPD Art. 18 § 4º - impossibilidade técnica/legal)

    // 3a. Agendamentos futuros pendentes
    const temAgendamentos = await checkPendingAgendamentos(userId);
    if (temAgendamentos) {
      throw new HttpError(
        409,
        "Agendamentos pendentes",
        "Você tem agendamentos futuros confirmados. Cancele-os antes de excluir a conta.",
        "AGENDAMENTOS_PENDENTES"
      );
    }

    // 3b. Assinatura ativa (barbeiro dono de estabelecimento)
    const temAssinatura = await checkActiveAssinatura(userId);
    if (temAssinatura) {
      throw new HttpError(
        409,
        "Assinatura ativa",
        "Você possui uma assinatura ativa. Cancele-a no painel do estabelecimento antes de excluir a conta.",
        "ASSINATURA_ATIVA"
      );
    }

    // 4. Log de auditoria ANTES da anonimização (registra quem solicitou)
    await supabase.from("audit_logs").insert({
      usuario_id: userId,
      acao: "anonymize",
      entidade: "usuarios",
      entidade_id: userId,
      dados_anteriores: { email: user.email, papel: user.user_metadata?.papel },
      dados_novos: { motivo: input.motivo, detalhes: input.motivo_detalhes },
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    }).catch(console.error);

    // 5. Anonimiza dados pessoais no banco (RPC)
    // Mantém IDs para integridade referencial, apaga/anonimiza PII
    await anonymizeUserData(userId);

    // 6. Revoga sessões ativas
    await revokeAllSessions(userId);

    // 7. Deleta usuário do Supabase Auth
    await deleteAuthUser(userId);

    // 8. Log de auditoria APÓS exclusão
    await supabase.from("audit_logs").insert({
      usuario_id: userId, // ID mantido para rastreabilidade
      acao: "delete",
      entidade: "auth.users",
      entidade_id: userId,
      dados_novos: { anonimizado: true, data_exclusao: new Date().toISOString() },
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    }).catch(console.error);

    // 9. Resposta de sucesso
    // IMPORTANTE: Não retorna dados pessoais na resposta
    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: "Sua conta e dados pessoais foram excluídos conforme Art. 18 da LGPD. Dados fiscais e de pagamentos foram mantidos conforme legislação vigente.",
        dados: {
          anonimizado: true,
          dados_mantidos: [
            "Histórico de pagamentos (retenção fiscal - Art. 12 Lei 8.137/90)",
            "Logs de auditoria (LGPD Art. 37 - accountability)",
            "Webhooks processados (segurança antifraude)",
          ],
          dados_removidos: [
            "Nome, e-mail, telefone, CPF",
            "Endereço, cidade, avatar, bio",
            "Agendamentos (anonimizados: nome/telefone substituídos)",
            "Avaliações (nome anonimizado)",
            "Publicações/comentários (autor anonimizado)",
            "Curtidas, salvos, seguidores",
            "Tokens de sessão, refresh tokens",
          ],
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new HttpError(400, "Dados inválidos", "Confirmação obrigatória: 'CONFIRMO_EXCLUSAO_MINHA_CONTA_E_DADOS_PESSOAIS'", "VALIDATION_ERROR", error.flatten().fieldErrors).toResponse();
    }
    if (error instanceof HttpError) {
      return error.toResponse();
    }
    console.error("Erro inesperado:", error);
    return new HttpError(500, "Erro interno", "Erro inesperado ao processar exclusão", "INTERNAL_ERROR").toResponse();
  }
});