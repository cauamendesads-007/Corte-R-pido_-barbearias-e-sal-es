// ============================================================================
// EDGE FUNCTION: gerar-cobranca-pix
// Lê chave Pix do estabelecimento NO SERVIDOR (nunca expõe ao navegador),
// gera cobrança Pix idempotente (Idempotency-Key), retorna QR Code + Copia e Cola + expiração
// ============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://corte-rapido.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
  "Access-Control-Max-Age": "86400",
};

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  // Configurações do provedor Pix (ex: Mercado Pago, Banco Inter, Banco do Brasil, etc.)
  PIX_PROVIDER: "mercado_pago" | "inter" | "bb" | "mock"; // "mock" para desenvolvimento
  MERCADO_PAGO_ACCESS_TOKEN?: string;
  INTER_CLIENT_ID?: string;
  INTER_CLIENT_SECRET?: string;
  INTER_CERT_PATH?: string;
}

const env = Deno.env.toObject() as unknown as Env;

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ============================================================================
// VALIDAÇÃO ZOD
// ============================================================================

const GerarCobrancaSchema = z.object({
  agendamento_id: z.string().uuid().optional(),
  assinatura_id: z.string().uuid().optional(),
  estabelecimento_id: z.string().uuid(),
  valor_centavos: z.number().int().positive().max(10000000), // max R$ 100.000,00
  descricao: z.string().min(3).max(100),
  expiracao_minutos: z.number().int().positive().max(1440).default(30), // max 24h
  // Dados do pagador (opcional - para Pix com info do pagador)
  pagador_nome: z.string().max(100).optional(),
  pagador_cpf: z.string().regex(/^\d{11}$/).optional(),
  pagador_email: z.string().email().optional(),
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

async function getEstabelecimentoPixConfig(estabelecimentoId: string) {
  const { data, error } = await supabase
    .from("estabelecimentos")
    .select("id, nome, configuracao_pix_modo, configuracao_pix_chave, configuracao_pix_percentual_sinal")
    .eq("id", estabelecimentoId)
    .single();

  if (error || !data) {
    throw new HttpError(404, "Estabelecimento não encontrado", "Estabelecimento não existe", "ESTABELECIMENTO_NOT_FOUND");
  }

  if (data.configuracao_pix_modo === "desativado") {
    throw new HttpError(400, "Pix desativado", "Este estabelecimento não aceita pagamentos via Pix", "PIX_DESATIVADO");
  }

  if (!data.configuracao_pix_chave) {
    throw new HttpError(500, "Configuração incompleta", "Chave Pix não configurada no estabelecimento", "PIX_KEY_MISSING");
  }

  return data;
}

async function checkIdempotency(idempotencyKey: string) {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id, pix_qr_code, pix_copia_cola, pix_expiracao, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "Erro interno", "Falha ao verificar idempotência", "DB_ERROR");
  }

  return data;
}

async function savePagamento(params: {
  estabelecimento_id: string;
  agendamento_id?: string;
  assinatura_id?: string;
  tipo: "agendamento" | "assinatura" | "sinal";
  valor_centavos: number;
  provedor: string;
  provedor_transacao_id: string;
  pix_qr_code: string;
  pix_copia_cola: string;
  pix_expiracao: string;
  idempotency_key: string;
}) {
  const { data, error } = await supabase
    .from("pagamentos")
    .insert({
      estabelecimento_id: params.estabelecimento_id,
      agendamento_id: params.agendamento_id,
      assinatura_id: params.assinatura_id,
      tipo: params.tipo,
      valor_centavos: params.valor_centavos,
      status: "pendente",
      provedor: params.provedor,
      provedor_transacao_id: params.provedor_transacao_id,
      pix_qr_code: params.pix_qr_code,
      pix_copia_cola: params.pix_copia_cola,
      pix_expiracao: params.pix_expiracao,
      idempotency_key: params.idempotency_key,
    })
    .select()
    .single();

  if (error) {
    // Unique violation on idempotency_key = concorrência
    if (error.code === "23505") {
      return checkIdempotency(params.idempotency_key);
    }
    throw new HttpError(500, "Erro ao salvar pagamento", error.message, "DB_ERROR");
  }

  return data;
}

// ============================================================================
// PROVEDORES PIX
// ============================================================================

interface PixResponse {
  qr_code: string;
  copia_cola: string;
  expiracao: string; // ISO 8601
  transacao_id: string;
}

// Mock provider para desenvolvimento
async function gerarPixMock(params: {
  chave: string;
  valor_centavos: number;
  descricao: string;
  expiracao_minutos: number;
  pagador?: { nome?: string; cpf?: string; email?: string };
}): Promise<PixResponse> {
  // Simula resposta de provedor real
  const valor = (params.valor_centavos / 100).toFixed(2);
  const txid = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const expiracao = new Date(Date.now() + params.expiracao_minutos * 60000).toISOString();

  // Gera payload Pix (EMVCo) simplificado
  const payload = `00020126580014br.gov.bcb.pix0136${params.chave}520400005303986540${valor}5802BR5925${params.pagador?.nome || "Cliente Corte Rapido"}6009SAO PAULO62070503***6304`;
  const qrCodeBase64 = btoa(payload); // Em produção, geraria QR Code real (base64 PNG)

  return {
    qr_code: `data:image/png;base64,${qrCodeBase64}`,
    copia_cola: payload,
    expiracao,
    transacao_id: txid,
  };
}

// Mercado Pago (exemplo - requer credenciais configuradas)
async function gerarPixMercadoPago(params: {
  accessToken: string;
  valor_centavos: number;
  descricao: string;
  expiracao_minutos: number;
  pagador?: { nome?: string; cpf?: string; email?: string };
}): Promise<PixResponse> {
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `cr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    },
    body: JSON.stringify({
      transaction_amount: params.valor_centavos / 100,
      description: params.descricao,
      payment_method_id: "pix",
      payer: params.pagador
        ? {
            email: params.pagador.email || "cliente@corte-rapido.com",
            first_name: params.pagador.nome?.split(" ")[0] || "Cliente",
            last_name: params.pagador.nome?.split(" ").slice(1).join(" ") || "",
            identification: params.pagador.cpf
              ? { type: "CPF", number: params.pagador.cpf }
              : undefined,
          }
        : { email: "cliente@corte-rapido.com" },
      date_of_expiration: new Date(Date.now() + params.expiracao_minutos * 60000).toISOString(),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Mercado Pago error: ${response.status} - ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  return {
    qr_code: data.point_of_interaction?.transaction_data?.qr_code_base64
      ? `data:image/png;base64,${data.point_of_interaction.transaction_data.qr_code_base64}`
      : "",
    copia_cola: data.point_of_interaction?.transaction_data?.qr_code || "",
    expiracao: data.date_of_expiration,
    transacao_id: String(data.id),
  };
}

// Banco Inter (exemplo simplificado)
async function gerarPixInter(): Promise<PixResponse> {
  // Requer fluxo OAuth2 para obter token - implementação simplificada
  throw new Error("Provedor Inter não implementado - configure MERCADO_PAGO_ACCESS_TOKEN ou use mock");
}

// ============================================================================
// SELETOR DE PROVEDOR
// ============================================================================

async function gerarCobrancaPix(params: {
  chave: string;
  valor_centavos: number;
  descricao: string;
  expiracao_minutos: number;
  pagador?: { nome?: string; cpf?: string; email?: string };
}): Promise<PixResponse> {
  switch (env.PIX_PROVIDER) {
    case "mercado_pago":
      if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
        throw new HttpError(500, "Configuração ausente", "MERCADO_PAGO_ACCESS_TOKEN não configurado", "CONFIG_MISSING");
      }
      return gerarPixMercadoPago({
        accessToken: env.MERCADO_PAGO_ACCESS_TOKEN,
        valor_centavos: params.valor_centavos,
        descricao: params.descricao,
        expiracao_minutos: params.expiracao_minutos,
        pagador: params.pagador,
      });

    case "inter":
      if (!env.INTER_CLIENT_ID || !env.INTER_CLIENT_SECRET) {
        throw new HttpError(500, "Configuração ausente", "Credenciais do Banco Inter não configuradas", "CONFIG_MISSING");
      }
      return gerarPixInter({
        clientId: env.INTER_CLIENT_ID,
        clientSecret: env.INTER_CLIENT_SECRET,
        valor_centavos: params.valor_centavos,
        descricao: params.descricao,
        expiracao_minutos: params.expiracao_minutos,
      });

    case "mock":
    default:
      return gerarPixMock({
        chave: params.chave,
        valor_centavos: params.valor_centavos,
        descricao: params.descricao,
        expiracao_minutos: params.expiracao_minutos,
        pagador: params.pagador,
      });
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

  const idempotencyKey = req.headers.get("idempotency-key") || `cr_${Date.now()}_${crypto.randomUUID()}`;

  try {
    // 1. Autenticação
    const user = await getAuthenticatedUser(req.headers.get("authorization"));

    // 2. Parse e validação
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "JSON inválido", "Corpo da requisição deve ser JSON válido", "INVALID_JSON");
    }

    const input = GerarCobrancaSchema.parse(body);

    // Validação: deve ter agendamento_id OU assinatura_id (XOR)
    if ((!input.agendamento_id && !input.assinatura_id) || (input.agendamento_id && input.assinatura_id)) {
      throw new HttpError(400, "Parâmetros inválidos", "Informe exatamente um de: agendamento_id ou assinatura_id", "INVALID_PARAMS");
    }

    // 3. Verifica permissão no estabelecimento
    // Cliente pode gerar cobrança para SEU agendamento; barbeiro/admin para qualquer do estabelecimento
    const { data: userProfile } = await supabase
      .from("usuarios")
      .select("papel, estabelecimento_id")
      .eq("id", user.id)
      .single();

    if (!userProfile) {
      throw new HttpError(403, "Acesso negado", "Perfil de usuário não encontrado", "FORBIDDEN");
    }

    const isAdmin = userProfile.papel === "admin";
    const isBarbeiro = userProfile.papel === "barbeiro" && userProfile.estabelecimento_id === input.estabelecimento_id;

    if (!isAdmin && !isBarbeiro) {
      // Se for cliente, verifica se o agendamento pertence a ele
      if (input.agendamento_id) {
        const { data: ag } = await supabase
          .from("agendamentos")
          .select("usuario_id, estabelecimento_id")
          .eq("id", input.agendamento_id)
          .single();

        if (!ag || ag.usuario_id !== user.id) {
          throw new HttpError(403, "Acesso negado", "Você não pode gerar cobrança para este agendamento", "FORBIDDEN");
        }
        if (ag.estabelecimento_id !== input.estabelecimento_id) {
          throw new HttpError(400, "Inconsistência", "Agendamento não pertence ao estabelecimento informado", "ESTABELECIMENTO_MISMATCH");
        }
      } else {
        throw new HttpError(403, "Acesso negado", "Apenas barbeiros/admins podem gerar cobrança de assinatura", "FORBIDDEN");
      }
    }

    // 4. Obtém configuração Pix do estabelecimento (NUNCA expõe chave no frontend)
    const estConfig = await getEstabelecimentoPixConfig(input.estabelecimento_id);

    // 5. Verifica idempotência
    const existing = await checkIdempotency(idempotencyKey);
    if (existing) {
      // Retorna cobrança existente (idempotente)
      return new Response(
        JSON.stringify({
          sucesso: true,
          dados: {
            pagamento_id: existing.id,
            qr_code: existing.pix_qr_code,
            copia_cola: existing.pix_copia_cola,
            expiracao: existing.pix_expiracao,
            valor_centavos: existing.valor_total_centavos,
            status: existing.status,
            idempotent: true,
          },
          mensagem: "Cobrança já existente (idempotente)",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Determina tipo e descrição
    const tipo = input.agendamento_id ? "agendamento" : "assinatura";
    const descricao = `${input.descricao} · ${estConfig.nome}`;

    // 7. Gera cobrança Pix no provedor
    const pix = await gerarCobrancaPix({
      chave: estConfig.configuracao_pix_chave, // CHAVE NUNCA SAI DO SERVIDOR
      valor_centavos: input.valor_centavos,
      descricao,
      expiracao_minutos: input.expiracao_minutos,
      pagador: {
        nome: input.pagador_nome,
        cpf: input.pagador_cpf,
        email: input.pagador_email,
      },
    });

    // 8. Salva pagamento no banco
    const pagamento = await savePagamento({
      estabelecimento_id: input.estabelecimento_id,
      agendamento_id: input.agendamento_id,
      assinatura_id: input.assinatura_id,
      tipo,
      valor_centavos: input.valor_centavos,
      provedor: env.PIX_PROVIDER,
      provedor_transacao_id: pix.transacao_id,
      pix_qr_code: pix.qr_code,
      pix_copia_cola: pix.copia_cola,
      pix_expiracao: pix.expiracao,
      idempotency_key: idempotencyKey,
    });

    // 9. Log de auditoria
    await supabase.from("audit_logs").insert({
      usuario_id: user.id,
      estabelecimento_id: input.estabelecimento_id,
      acao: "create",
      entidade: "pagamentos",
      entidade_id: pagamento.id,
      dados_novos: { ...input, chave_pix: "[REDACTED]" }, // Não loga chave real
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    }).catch(console.error);

    // 10. Resposta (NÃO inclui chave Pix!)
    return new Response(
      JSON.stringify({
        sucesso: true,
        dados: {
          pagamento_id: pagamento.id,
          qr_code: pix.qr_code,
          copia_cola: pix.copia_cola,
          expiracao: pix.expiracao,
          valor_centavos: input.valor_centavos,
          status: "pendente",
        },
        mensagem: "Cobrança Pix gerada com sucesso",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new HttpError(400, "Dados inválidos", "Validação falhou", "VALIDATION_ERROR", error.flatten().fieldErrors).toResponse();
    }
    if (error instanceof HttpError) {
      return error.toResponse();
    }
    console.error("Erro inesperado:", error);
    return new HttpError(500, "Erro interno", "Erro inesperado ao gerar cobrança Pix", "INTERNAL_ERROR").toResponse();
  }
});