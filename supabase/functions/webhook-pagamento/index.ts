import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://esm.sh/zod@3.22.4";

// ============================================================================
// CONFIGURAÇÃO E TIPOS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://corte-rapido.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET")!; // Chave HMAC compartilhada
const WEBHOOK_TOLERANCE_SECONDS = 300; // 5 min tolerância para replay attack

// Schema do payload do webhook (exemplo genérico - adaptar para provedor real)
const WebhookPayloadSchema = z.object({
  event: z.enum(["pix.payment.received", "pix.payment.expired", "subscription.payment.received", "subscription.payment.failed"]),
  timestamp: z.string().datetime(),
  data: z.object({
    txid: z.string().min(1).max(35),
    valor: z.number().positive(),
    status: z.enum(["PAGO", "EXPIRADO", "CANCELADO", "PENDENTE"]),
    pagador: z.object({
      nome: z.string().optional(),
      cpf: z.string().optional(),
      email: z.string().email().optional(),
    }).optional(),
    infoAdicionais: z.array(z.object({
      nome: z.string(),
      valor: z.string(),
    })).optional(),
    endToEndId: z.string().optional(), // ID do Banco Central
  }),
});

type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function createProblemDetails(
  status: number,
  title: string,
  detail: string,
  instance: string
): ProblemDetails {
  return {
    type: `https://corte-rapido.app/errors/${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    status,
    detail,
    instance,
    timestamp: new Date().toISOString(),
  };
}

function logStructured(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    function: "webhook-pagamento",
    ...meta,
  };
  console.log(JSON.stringify(logEntry));
}

// Verifica assinatura HMAC-SHA256
async function verificarAssinaturaHMAC(
  payload: string,
  signatureHeader: string | null,
  timestampHeader: string | null
): Promise<{ valido: boolean; erro?: string }> {
  if (!signatureHeader || !timestampHeader) {
    return { valido: false, erro: "Headers de assinatura ausentes" };
  }

  // Verifica timestamp (previne replay attacks)
  const webhookTime = parseInt(timestampHeader, 10);
  const now = Math.floor(Date.now() / 1000);

  if (isNaN(webhookTime)) {
    return { valido: false, erro: "Timestamp inválido" };
  }

  if (Math.abs(now - webhookTime) > WEBHOOK_TOLERANCE_SECONDS) {
    return { valido: false, erro: "Timestamp fora da janela de tolerância (replay attack)" };
  }

  // Constrói string para assinatura: timestamp + "." + payload
  const signedPayload = `${timestampHeader}.${payload}`;

  // Calcula HMAC-SHA256
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  const expectedSignature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // Comparação em tempo constante
  const providedSignature = signatureHeader.replace(/^sha256=/, "");

  if (providedSignature.length !== expectedHex.length) {
    return { valido: false, erro: "Assinatura inválida" };
  }

  let different = 0;
  for (let i = 0; i < providedSignature.length; i++) {
    different |= providedSignature.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }

  if (different !== 0) {
    return { valido: false, erro: "Assinatura HMAC inválida" };
  }

  return { valido: true };
}

// Verifica idempotência via tabela webhooks_processados
async function verificarIdempotencia(
  supabase: ReturnType<typeof createClient>,
  eventId: string
): Promise<{ processado: boolean; erro?: string }> {
  const { data, error } = await supabase
    .from("webhooks_processados")
    .select("id")
    .eq("event_id", eventId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = not found
    return { processado: false, erro: "Erro ao verificar idempotência" };
  }

  return { processado: !!data };
}

async function registrarWebhookProcessado(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  eventType: string,
  payload: unknown
): Promise<void> {
  await supabase
    .from("webhooks_processados")
    .insert({
      event_id: eventId,
      event_type: eventType,
      payload: payload as any,
      processado_em: new Date().toISOString(),
    });
}

// ============================================================================
// PROCESSAMENTO DE EVENTOS
// ============================================================================

async function processarPagamentoPix(
  supabase: ReturnType<typeof createClient>,
  payload: WebhookPayload["data"]
): Promise<{ sucesso: boolean; detalhes?: string }> {
  const { txid, valor, status, endToEndId } = payload;

  // Busca cobrança Pix
  const { data: cobranca, error } = await supabase
    .from("cobrancas_pix")
    .select("id, agendamento_id, assinatura_id, estabelecimento_id, valor, status")
    .eq("id", txid)
    .single();

  if (error || !cobranca) {
    logStructured("warn", "Cobrança Pix não encontrada para webhook", { txid });
    return { sucesso: false, detalhes: "Cobrança não encontrada" };
  }

  // Valida valor
  if (Math.abs(cobranca.valor - valor) > 0.01) {
    logStructured("warn", "Valor diverge na cobrança Pix", { txid, esperado: cobranca.valor, recebido: valor });
    return { sucesso: false, detalhes: "Valor diverge" };
  }

  // Atualiza status da cobrança
  const novoStatusCobranca = status === "PAGO" ? "PAGA" : status === "EXPIRADO" ? "EXPIRADA" : "CANCELADA";

  await supabase
    .from("cobrancas_pix")
    .update({
      status: novoStatusCobranca,
      end_to_end_id: endToEndId ?? null,
      pago_em: status === "PAGO" ? new Date().toISOString() : null,
    })
    .eq("id", txid);

  if (status !== "PAGO") {
    return { sucesso: true, detalhes: `Cobrança ${novoStatusCobranca.toLowerCase()}` };
  }

  // Se tem agendamento, confirma pagamento
  if (cobranca.agendamento_id) {
    const { error: updateError } = await supabase
      .from("agendamentos")
      .update({
        status_pagamento: "pago",
        status: "confirmado",
        pix_end_to_end_id: endToEndId ?? null,
        pago_em: new Date().toISOString(),
      })
      .eq("id", cobranca.agendamento_id);

    if (updateError) {
      logStructured("error", "Erro ao atualizar agendamento", { error: updateError.message });
      return { sucesso: false, detalhes: "Erro ao confirmar agendamento" };
    }

    // Dispara notificação
    await supabase
      .from("notificacoes")
      .insert({
        destinatario: cobranca.estabelecimento_id,
        tipo: "pagamento",
        titulo: "Pagamento confirmado",
        texto: `Pagamento Pix de R$ ${valor.toFixed(2)} confirmado para agendamento ${cobranca.agendamento_id}`,
        estabelecimento_id: cobranca.estabelecimento_id,
        agendamento_id: cobranca.agendamento_id,
      });

    logStructured("info", "Pagamento de agendamento confirmado", {
      agendamentoId: cobranca.agendamento_id,
      valor,
      endToEndId
    });
  }

  // Se tem assinatura, confirma pagamento SaaS
  if (cobranca.assinatura_id) {
    const { error: updateError } = await supabase
      .from("assinaturas_estabelecimentos")
      .update({
        status: "ativa",
        ultima_cobranca: new Date().toISOString(),
        proximo_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // +30 dias
      })
      .eq("id", cobranca.assinatura_id);

    if (updateError) {
      logStructured("error", "Erro ao atualizar assinatura", { error: updateError.message });
      return { sucesso: false, detalhes: "Erro ao confirmar assinatura" };
    }

    // Adiciona ao histórico de pagamentos
    await supabase
      .from("pagamentos_historico")
      .insert({
        assinatura_id: cobranca.assinatura_id,
        data: new Date().toISOString().split("T")[0],
        descricao: `Pagamento plano - R$ ${valor.toFixed(2)}`,
        valor,
        end_to_end_id: endToEndId,
      });

    // Dispara notificação
    await supabase
      .from("notificacoes")
      .insert({
        destinatario: cobranca.estabelecimento_id,
        tipo: "pagamento",
        titulo: "Assinatura paga",
        texto: `Sua assinatura foi renovada. Valor: R$ ${valor.toFixed(2)}`,
        estabelecimento_id: cobranca.estabelecimento_id,
      });

    logStructured("info", "Pagamento de assinatura confirmado", {
      assinaturaId: cobranca.assinatura_id,
      valor,
      endToEndId
    });
  }

  return { sucesso: true, detalhes: "Pagamento processado com sucesso" };
}

async function processarPagamentoExpirado(
  supabase: ReturnType<typeof createClient>,
  payload: WebhookPayload["data"]
): Promise<{ sucesso: boolean; detalhes?: string }> {
  const { txid } = payload;

  const { data: cobranca } = await supabase
    .from("cobrancas_pix")
    .select("id, agendamento_id, estabelecimento_id")
    .eq("id", txid)
    .single();

  if (!cobranca) {
    return { sucesso: false, detalhes: "Cobrança não encontrada" };
  }

  await supabase
    .from("cobrancas_pix")
    .update({ status: "EXPIRADA" })
    .eq("id", txid);

  if (cobranca.agendamento_id) {
    // Libera o horário - volta para "agendado" com pagamento no local
    await supabase
      .from("agendamentos")
      .update({
        status_pagamento: "no_local",
        pix_txid: null,
      })
      .eq("id", cobranca.agendamento_id);

    await supabase
      .from("notificacoes")
      .insert({
        destinatario: cobranca.estabelecimento_id,
        tipo: "pagamento",
        titulo: "Pagamento Pix expirado",
        texto: `O pagamento Pix do agendamento ${cobranca.agendamento_id} expirou. Cliente pode pagar no local.`,
        estabelecimento_id: cobranca.estabelecimento_id,
        agendamento_id: cobranca.agendamento_id,
      });
  }

  return { sucesso: true, detalhes: "Expiração processada" };
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Só aceita POST
  if (req.method !== "POST") {
    const problem = createProblemDetails(
      405,
      "Method Not Allowed",
      "Apenas POST é permitido",
      requestId
    );
    return new Response(JSON.stringify(problem), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
    });
  }

  // Headers de segurança
  const signatureHeader = req.headers.get("x-webhook-signature");
  const timestampHeader = req.headers.get("x-webhook-timestamp");
  const eventId = req.headers.get("x-webhook-event-id") ?? crypto.randomUUID();

  // Lê body raw para verificação HMAC
  const rawBody = await req.text();

  logStructured("info", "Webhook recebido", {
    requestId,
    eventId,
    signaturePresent: !!signatureHeader,
    timestampPresent: !!timestampHeader,
    bodyLength: rawBody.length
  });

  // 1. Verifica assinatura HMAC
  const validacaoHmac = await verificarAssinaturaHMAC(rawBody, signatureHeader, timestampHeader);
  if (!validacaoHmac.valido) {
    logStructured("warn", "Assinatura HMAC inválida", { requestId, erro: validacaoHmac.erro });
    const problem = createProblemDetails(
      401,
      "Unauthorized",
      validacaoHmac.erro ?? "Assinatura inválida",
      requestId
    );
    return new Response(JSON.stringify(problem), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
    });
  }

  // 2. Parse e valida payload
  let payload: WebhookPayload;
  try {
    payload = WebhookPayloadSchema.parse(JSON.parse(rawBody));
  } catch (error) {
    if (error instanceof z.ZodError) {
      logStructured("warn", "Payload inválido", { requestId, errors: error.issues });
    } else {
      logStructured("warn", "JSON inválido", { requestId });
    }
    const problem = createProblemDetails(
      400,
      "Bad Request",
      "Payload inválido",
      requestId
    );
    return new Response(JSON.stringify(problem), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
    });
  }

  // 3. Verifica idempotência
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const idempotencia = await verificarIdempotencia(supabase, eventId);
  if (idempotencia.erro) {
    logStructured("error", "Erro ao verificar idempotência", { requestId, error: idempotencia.erro });
    const problem = createProblemDetails(
      500,
      "Internal Server Error",
      "Erro ao processar webhook",
      requestId
    );
    return new Response(JSON.stringify(problem), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
    });
  }

  if (idempotencia.processado) {
    logStructured("info", "Webhook já processado (idempotência)", { requestId, eventId });
    return new Response(JSON.stringify({ sucesso: true, mensagem: "Já processado" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4. Processa evento
  let resultado: { sucesso: boolean; detalhes?: string };

  try {
    switch (payload.event) {
      case "pix.payment.received":
        resultado = await processarPagamentoPix(supabase, payload.data);
        break;
      case "pix.payment.expired":
        resultado = await processarPagamentoExpirado(supabase, payload.data);
        break;
      case "subscription.payment.received":
        // Processa pagamento de assinatura (similar ao Pix)
        resultado = await processarPagamentoPix(supabase, payload.data);
        break;
      case "subscription.payment.failed":
        // Trata falha de pagamento de assinatura
        resultado = { sucesso: true, detalhes: "Falha registrada" };
        break;
      default:
        logStructured("warn", "Evento não suportado", { requestId, event: payload.event });
        resultado = { sucesso: true, detalhes: "Evento não tratado" };
    }
  } catch (error) {
    logStructured("error", "Erro ao processar evento", {
      requestId,
      event: payload.event,
      error: error instanceof Error ? error.message : String(error)
    });
    resultado = { sucesso: false, detalhes: "Erro interno" };
  }

  // 5. Registra webhook como processado (idempotência)
  if (resultado.sucesso) {
    await registrarWebhookProcessado(supabase, eventId, payload.event, payload);
  }

  logStructured("info", "Webhook processado", {
    requestId,
    eventId,
    event: payload.event,
    sucesso: resultado.sucesso,
    detalhes: resultado.detalhes,
    duracaoMs: Date.now() - startTime
  });

  // Sempre retorna 200 para o provedor (evita reenvios desnecessários)
  // O provedor deve implementar retry com backoff exponencial
  return new Response(JSON.stringify({
    sucesso: resultado.sucesso,
    mensagem: resultado.detalhes,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});