// ============================================================================
// EDGE FUNCTION: webhook-pagamento
// Valida assinatura HMAC + timestamp contra replay attacks,
// garante idempotência (webhooks_processados), confirma pagamento
// do agendamento ou da assinatura SaaS
// ============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Webhooks vêm de provedores externos
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-signature, x-timestamp, x-webhook-id",
  "Access-Control-Max-Age": "86400",
};

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  // Secrets dos provedores para validação HMAC
  MERCADO_PAGO_WEBHOOK_SECRET?: string;
  INTER_WEBHOOK_SECRET?: string;
  ASAAS_WEBHOOK_SECRET?: string;
  BANCO_CENTRAL_WEBHOOK_SECRET?: string;
  // Tolerância de timestamp para replay attack (segundos)
  WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS?: string;
}

const env = Deno.env.toObject() as unknown as Env;

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TIMESTAMP_TOLERANCE = parseInt(env.WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS || "300", 10); // 5 min default

// ============================================================================
// TIPOS E VALIDAÇÃO
// ============================================================================

interface WebhookPayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
  date_created: string;
}

const WebhookPayloadSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.unknown()),
  date_created: z.string().datetime(),
});

// ============================================================================
// ERROS RFC 7807
// ============================================================================

class HttpError extends Error {
  constructor(
    public _status: number,
    public _title: string,
    public detail: string,
    public _code?: string
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
        timestamp: new Date().toISOString(),
      }),
      { status: this._status, headers: { ...corsHeaders, "Content-Type": "application/problem+json" } }
    );
  }
}

// ============================================================================
// HELPERS DE VALIDAÇÃO HMAC
// ============================================================================

async function verifyHMAC(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = hexToBytes(signature);
    const result = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
    return result;
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function verifyTimestamp(timestampHeader: string): void {
  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp)) {
    throw new HttpError(400, "Timestamp inválido", "Header x-timestamp deve ser um timestamp Unix válido", "INVALID_TIMESTAMP");
  }

  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - timestamp);

  if (diff > TIMESTAMP_TOLERANCE) {
    throw new HttpError(400, "Timestamp expirado", `Timestamp fora da tolerância de ${TIMESTAMP_TOLERANCE}s (replay attack suspeito)`, "TIMESTAMP_EXPIRED");
  }
}

async function checkAndMarkWebhookProcessed(provedor: string, eventoId: string, payloadHash: string): Promise<boolean> {
  // Tenta inserir na tabela de idempotência
  const { error } = await supabase
    .from("webhooks_processados")
    .insert({
      provedor,
      evento_id: eventoId,
      evento_tipo: "", // Será preenchido depois
      payload_hash: payloadHash,
      resultado: "sucesso",
    })
    .select()
    .maybeSingle();

  if (error) {
    // Unique violation = já processado
    if (error.code === "23505") {
      return false; // Já processado
    }
    throw new HttpError(500, "Erro interno", "Falha ao registrar webhook", "DB_ERROR");
  }

  return true; // Novo, processado com sucesso
}

// ============================================================================
// PROCESSADORES POR PROVEDOR
// ============================================================================

interface ProcessResult {
  agendamentoId?: string;
  assinaturaId?: string;
  status: "pago" | "falhou" | "estornado" | "reembolsado";
  valorCentavos: number;
}

async function processMercadoPago(payload: WebhookPayload): Promise<ProcessResult> {
  // Eventos relevantes: payment.approved, payment.rejected, payment.refunded, payment.chargeback
  const payment = payload.data;

  if (!payment?.id || !payment?.external_reference) {
    throw new HttpError(400, "Payload inválido", "payment.id ou external_reference ausente", "INVALID_PAYLOAD");
  }

  // external_reference contém nosso idempotency_key ou pagamento_id
  const externalRef = payment.external_reference;

  let status: ProcessResult["status"] = "falhou";
  switch (payload.type) {
    case "payment.approved":
      status = "pago";
      break;
    case "payment.rejected":
    case "payment.cancelled":
      status = "falhou";
      break;
    case "payment.refunded":
    case "payment.chargeback":
      status = "estornado";
      break;
    default:
      // Evento não tratado - apenas registra
      return { status: "falhou", valorCentavos: 0 };
  }

  // Busca pagamento no nosso banco via idempotency_key (external_reference)
  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select("id, agendamento_id, assinatura_id, estabelecimento_id, valor_centavos")
    .eq("idempotency_key", externalRef)
    .single();

  if (!pagamento) {
    // Tenta buscar por provedor_transacao_id
    const { data: pag2 } = await supabase
      .from("pagamentos")
      .select("id, agendamento_id, assinatura_id, estabelecimento_id, valor_centavos")
      .eq("provedor_transacao_id", String(payment.id))
      .single();

    if (!pag2) {
      throw new HttpError(404, "Pagamento não encontrado", `Nenhum pagamento encontrado para external_reference: ${externalRef}`, "PAGAMENTO_NOT_FOUND");
    }
    return { agendamentoId: pag2.agendamento_id, assinaturaId: pag2.assinatura_id, status, valorCentavos: pag2.valor_centavos };
  }

  return { agendamentoId: pagamento.agendamento_id, assinaturaId: pagamento.assinatura_id, status, valorCentavos: pagamento.valor_centavos };
}

async function processAsaas(payload: WebhookPayload): Promise<ProcessResult> {
  // Asaas events: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, PAYMENT_DELETED, PAYMENT_REFUNDED
  const payment = payload.data;

  if (!payment?.id || !payment?.externalReference) {
    throw new HttpError(400, "Payload inválido", "payment.id ou externalReference ausente", "INVALID_PAYLOAD");
  }

  let status: ProcessResult["status"] = "falhou";
  switch (payload.type) {
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED":
      status = "pago";
      break;
    case "PAYMENT_OVERDUE":
    case "PAYMENT_DELETED":
      status = "falhou";
      break;
    case "PAYMENT_REFUNDED":
      status = "estornado";
      break;
    default:
      return { status: "falhou", valorCentavos: 0 };
  }

  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select("id, agendamento_id, assinatura_id, estabelecimento_id, valor_centavos")
    .eq("idempotency_key", payment.externalReference)
    .single();

  if (!pagamento) {
    const { data: pag2 } = await supabase
      .from("pagamentos")
      .select("id, agendamento_id, assinatura_id, estabelecimento_id, valor_centavos")
      .eq("provedor_transacao_id", payment.id)
      .single();

    if (!pag2) {
      throw new HttpError(404, "Pagamento não encontrado", `Nenhum pagamento para externalReference: ${payment.externalReference}`, "PAGAMENTO_NOT_FOUND");
    }
    return { agendamentoId: pag2.agendamento_id, assinaturaId: pag2.assinatura_id, status, valorCentavos: pag2.valor_centavos };
  }

  return { agendamentoId: pagamento.agendamento_id, assinaturaId: pagamento.assinatura_id, status, valorCentavos: pagamento.valor_centavos };
}

async function processBancoCentral(payload: WebhookPayload): Promise<ProcessResult> {
  // Pix do Banco Central (DICT) - webhook de liquidação
  // Implementação depende do provedor de conta (Banco do Brasil, Itaú, etc.)
  // Aqui assumimos formato genérico
  const pix = payload.data;

  if (!pix?.endToEndId || !pix?.txid) {
    throw new HttpError(400, "Payload inválido", "endToEndId ou txid ausente", "INVALID_PAYLOAD");
  }

  let status: ProcessResult["status"] = "falhou";
  if (payload.type === "pix.liquidado" || payload.type === "pix.recebido") {
    status = "pago";
  } else if (payload.type === "pix.devolvido") {
    status = "estornado";
  } else {
    return { status: "falhou", valorCentavos: 0 };
  }

  // Busca por txid (nosso provedor_transacao_id)
  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select("id, agendamento_id, assinatura_id, estabelecimento_id, valor_centavos")
    .eq("provedor_transacao_id", pix.txid)
    .single();

  if (!pagamento) {
    throw new HttpError(404, "Pagamento não encontrado", `Nenhum pagamento para txid: ${pix.txid}`, "PAGAMENTO_NOT_FOUND");
  }

  return { agendamentoId: pagamento.agendamento_id, assinaturaId: pagamento.assinatura_id, status, valorCentavos: pagamento.valor_centavos };
}

// ============================================================================
// AÇÕES PÓS-PAGAMENTO
// ============================================================================

async function confirmarPagamentoAgendamento(agendamentoId: string, status: ProcessResult["status"]) {
  const novoStatusPagamento = status === "pago" ? "pago" : status === "estornado" ? "estornado" : "falhou";
  const novoStatusAgendamento = status === "pago" ? "confirmado" : "agendado";

  const { error } = await supabase
    .from("agendamentos")
    .update({
      status_pagamento: novoStatusPagamento,
      status: novoStatusAgendamento,
      data_atualizacao: new Date().toISOString(),
    })
    .eq("id", agendamentoId);

  if (error) {
    throw new HttpError(500, "Erro ao atualizar agendamento", error.message, "DB_ERROR");
  }

  // Notifica cliente e barbeiro
  const { data: ag } = await supabase
    .from("agendamentos")
    .select("usuario_id, estabelecimento_id, nome_cliente, servicos, dia, horario")
    .eq("id", agendamentoId)
    .single();

  if (ag) {
    const notifications = [];

    if (ag.usuario_id) {
      notifications.push({
        destinatario_id: ag.usuario_id,
        tipo: status === "pago" ? "pagamento" : "cancelamento",
        titulo: status === "pagto" ? "Pagamento confirmado" : "Pagamento falhou",
        texto: `Seu agendamento de ${ag.servicos} para ${ag.dia} às ${ag.horario} teve pagamento ${status === "pago" ? "confirmado" : "não aprovado"}.`,
        estabelecimento_id: ag.estabelecimento_id,
      });
    }

    // Notifica barbeiros do estabelecimento
    const { data: barbeiros } = await supabase
      .from("usuarios")
      .select("id")
      .eq("estabelecimento_id", ag.estabelecimento_id)
      .eq("papel", "barbeiro");

    for (const b of barbeiros || []) {
      notifications.push({
        destinatario_id: b.id,
        tipo: "pagamento",
        titulo: status === "pago" ? "Pagamento recebido" : "Pagamento não aprovado",
        texto: `Agendamento de ${ag.nome_cliente} (${ag.servicos}) - ${status === "pago" ? "Pago" : "Não pago"}.`,
        estabelecimento_id: ag.estabelecimento_id,
      });
    }

    if (notifications.length > 0) {
      await supabase.from("notificacoes").insert(notifications);
    }
  }
}

async function confirmarPagamentoAssinatura(assinaturaId: string, status: ProcessResult["status"], transacaoId: string) {
  if (status !== "pago") {
    // Para falha/estorno, apenas registra - não cancela assinatura automaticamente
    await supabase
      .from("pagamentos")
      .update({ status, data_confirmacao: new Date().toISOString() })
      .eq("assinatura_id", assinaturaId)
      .eq("provedor_transacao_id", transacaoId);
    return;
  }

  // Pagamento confirmado: atualiza vencimento da assinatura (+30 dias para mensal, +1 dia para diária)
  const { data: assinatura } = await supabase
    .from("assinaturas")
    .select("plano_id, vencimento")
    .eq("id", assinaturaId)
    .single();

  if (!assinatura) return;

  const { data: plano } = await supabase
    .from("planos_assinatura")
    .select("tipo")
    .eq("id", assinatura.plano_id)
    .single();

  const novoVencimento = new Date(assinatura.vencimento);
  if (plano?.tipo === "diario") {
    novoVencimento.setDate(novoVencimento.getDate() + 1);
  } else {
    novoVencimento.setMonth(novoVencimento.getMonth() + 1);
  }

  await supabase
    .from("assinaturas")
    .update({
      vencimento: novoVencimento.toISOString().split("T")[0],
      status: "ativa",
      data_atualizacao: new Date().toISOString(),
    })
    .eq("id", assinaturaId);

  // Registra no histórico de pagamentos da assinatura
  await supabase
    .from("pagamentos")
    .update({ status: "pago", data_confirmacao: new Date().toISOString() })
    .eq("assinatura_id", assinaturaId)
    .eq("provedor_transacao_id", transacaoId);

  // Notifica barbeiro
  const { data: assinaturaCompleta } = await supabase
    .from("assinaturas")
    .select("estabelecimento_id")
    .eq("id", assinaturaId)
    .single();

  if (assinaturaCompleta) {
    const { data: barbeiros } = await supabase
      .from("usuarios")
      .select("id")
      .eq("estabelecimento_id", assinaturaCompleta.estabelecimento_id)
      .eq("papel", "barbeiro");

    const notifications = (barbeiros || []).map((b) => ({
      destinatario_id: b.id,
      tipo: "pagamento",
      titulo: "Mensalidade paga",
      texto: `Sua assinatura foi renovada. Novo vencimento: ${novoVencimento.toLocaleDateString("pt-BR")}.`,
      estabelecimento_id: assinaturaCompleta.estabelecimento_id,
    }));

    if (notifications.length > 0) {
      await supabase.from("notificacoes").insert(notifications);
    }
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

  // Headers de segurança
  const signature = req.headers.get("x-signature") || req.headers.get("x-hub-signature-256") || "";
  const timestamp = req.headers.get("x-timestamp") || req.headers.get("x-request-timestamp") || "";
  const webhookId = req.headers.get("x-webhook-id") || req.headers.get("x-request-id") || crypto.randomUUID();

  if (!signature) {
    return new HttpError(401, "Assinatura ausente", "Header x-signature é obrigatório", "MISSING_SIGNATURE").toResponse();
  }

  if (!timestamp) {
    return new HttpError(400, "Timestamp ausente", "Header x-timestamp é obrigatório", "MISSING_TIMESTAMP").toResponse();
  }

  try {
    // 1. Valida timestamp (replay attack protection)
    verifyTimestamp(timestamp);

    // 2. Lê body raw para verificação HMAC
    const rawBody = await req.text();

    // 3. Identifica provedor e valida HMAC
    let provedor = "desconhecido";
    let processFn: (_payload: WebhookPayload) => Promise<ProcessResult>;

    // Mercado Pago: x-signature = sha256=...
    if (signature.startsWith("sha256=") && env.MERCADO_PAGO_WEBHOOK_SECRET) {
      provedor = "mercado_pago";
      const sig = signature.slice(7);
      const valid = await verifyHMAC(rawBody, sig, env.MERCADO_PAGO_WEBHOOK_SECRET);
      if (!valid) {
        throw new HttpError(401, "Assinatura inválida", "HMAC verification failed for Mercado Pago", "INVALID_SIGNATURE");
      }
      processFn = processMercadoPago;
    }
    // Asaas: x-signature = hmac sha256
    else if (env.ASAAS_WEBHOOK_SECRET) {
      provedor = "asaas";
      const valid = await verifyHMAC(rawBody, signature, env.ASAAS_WEBHOOK_SECRET);
      if (!valid) {
        throw new HttpError(401, "Assinatura inválida", "HMAC verification failed for Asaas", "INVALID_SIGNATURE");
      }
      processFn = processAsaas;
    }
    // Banco Central / Pix
    else if (env.BANCO_CENTRAL_WEBHOOK_SECRET) {
      provedor = "banco_central";
      const valid = await verifyHMAC(rawBody, signature, env.BANCO_CENTRAL_WEBHOOK_SECRET);
      if (!valid) {
        throw new HttpError(401, "Assinatura inválida", "HMAC verification failed for Banco Central", "INVALID_SIGNATURE");
      }
      processFn = processBancoCentral;
    }
    // Desenvolvimento sem secret (ACEITA QUALQUER - APENAS DEV)
    else if (Deno.env.get("ENVIRONMENT") === "development") {
      provedor = "mock";
      processFn = processMercadoPago; // Usa mesmo parser
    } else {
      throw new HttpError(500, "Configuração ausente", "Nenhum webhook secret configurado para o provedor", "CONFIG_MISSING");
    }

    // 4. Parse e valida payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
      WebhookPayloadSchema.parse(payload);
    } catch (_e) {
      throw new HttpError(400, "Payload inválido", "JSON malformado ou schema inválido", "INVALID_PAYLOAD");
    }

    // 5. Gera hash do payload para idempotência
    const payloadHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody));
    const payloadHashHex = Array.from(new Uint8Array(payloadHash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 6. Verifica idempotência (webhooks_processados)
    const isNew = await checkAndMarkWebhookProcessed(provedor, payload.id, payloadHashHex);

    if (!isNew) {
      // Já processado - retorna 200 OK (idempotente)
      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: "Webhook já processado (idempotente)",
          idempotent: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Processa webhook
    const result = await processFn(payload);

    // 8. Atualiza pagamento no banco
    await supabase
      .from("pagamentos")
      .update({
        status: result.status,
        data_confirmacao: new Date().toISOString(),
        dados_webhook: payload,
      })
      .eq("provedor_transacao_id", payload.data?.id || payload.id);

    // 9. Executa ações de negócio
    if (result.agendamentoId) {
      await confirmarPagamentoAgendamento(result.agendamentoId, result.status, payload.id);
    } else if (result.assinaturaId) {
      await confirmarPagamentoAssinatura(result.assinaturaId, result.status, payload.id);
    }

    // 10. Atualiza registro de webhook com tipo de evento
    await supabase
      .from("webhooks_processados")
      .update({ evento_tipo: payload.type })
      .eq("provedor", provedor)
      .eq("evento_id", payload.id);

    // 11. Log de auditoria
    await supabase.from("audit_logs").insert({
      estabelecimento_id: null, // Será preenchido via trigger ou RPC se necessário
      acao: "update",
      entidade: "pagamentos",
      entidade_id: result.agendamentoId || result.assinaturaId,
      dados_novos: { webhook_type: payload.type, status: result.status, provedor },
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    }).catch(console.error);

    // 12. Resposta de sucesso
    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: "Webhook processado com sucesso",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Registra falha no webhook
    await supabase
      .from("webhooks_processados")
      .update({
        resultado: "erro",
        erro_mensagem: error instanceof Error ? error.message : "Erro desconhecido",
      })
      .eq("provedor", provedor)
      .eq("evento_id", webhookId)
      .catch(() => {});

    if (error instanceof HttpError) {
      return error.toResponse();
    }
    console.error("Erro inesperado no webhook:", error);
    // Retorna 200 para não causar retry infinito do provedor (já logamos o erro)
    return new Response(
      JSON.stringify({
        sucesso: false,
        mensagem: "Erro interno processado",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});