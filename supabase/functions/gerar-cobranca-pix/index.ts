import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://esm.sh/zod@3.22.4";

// ============================================================================
// CONFIGURAÇÃO E TIPOS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://corte-rapido.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PIX_PROVIDER_URL = Deno.env.get("PIX_PROVIDER_URL") ?? "https://api.pix.example.com";
const PIX_PROVIDER_API_KEY = Deno.env.get("PIX_PROVIDER_API_KEY")!;

// Schema de validação Zod
const GerarCobrancaPixSchema = z.object({
  agendamentoId: z.string().uuid("ID do agendamento inválido").optional(),
  assinaturaId: z.string().uuid("ID da assinatura inválido").optional(),
  valor: z.number().positive("Valor deve ser positivo").max(100000, "Valor muito alto"),
  descricao: z.string().min(3).max(140),
  expiracaoSegundos: z.number().int().min(300).max(86400).default(3600), // 5 min a 24h
  infoAdicionais: z.array(z.object({
    nome: z.string().max(50),
    valor: z.string().max(100),
  })).optional(),
}).refine(
  (data) => data.agendamentoId || data.assinaturaId,
  { message: "Deve informar agendamentoId ou assinaturaId", path: ["agendamentoId"] }
);

type GerarCobrancaPixInput = z.infer<typeof GerarCobrancaPixSchema>;

// Tipos para resposta
interface PixResponse {
  qrCode: string;           // Base64 da imagem QR Code
  copiaECola: string;       // Pix copia e cola (EMV)
  expiracao: string;        // ISO 8601
  txid: string;             // ID da transação
  valor: number;
}

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  errors?: Record<string, string[]>;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function createProblemDetails(
  status: number,
  title: string,
  detail: string,
  instance: string,
  errors?: Record<string, string[]>
): ProblemDetails {
  return {
    type: `https://corte-rapido.app/errors/${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    status,
    detail,
    instance,
    timestamp: new Date().toISOString(),
    errors,
  };
}

function logStructured(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    function: "gerar-cobranca-pix",
    ...meta,
  };
  console.log(JSON.stringify(logEntry));
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
         req.headers.get("x-real-ip") ??
         "unknown";
}

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxRequests = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Gera txid único (máx 35 chars para Pix)
function generateTxid(prefix: string = "CR"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`.substring(0, 35);
}

// ============================================================================
// INTEGRAÇÃO COM PROVEDOR PIX (Banco Central / Mock)
// ============================================================================

interface PixProviderRequest {
  txid: string;
  valor: number;
  descricao: string;
  expiracaoSegundos: number;
  chavePix: string;
  infoAdicionais?: Array<{ nome: string; valor: string }>;
}

interface PixProviderResponse {
  qrCodeBase64: string;
  copiaECola: string;
  expiracao: string;
  status: "ATIVA" | "EXPIRADA" | "PAGA";
}

async function chamarProvedorPix(
  request: PixProviderRequest
): Promise<PixProviderResponse> {
  // Em produção, integra com API do Banco Central ou provedor (Mercado Pago, PicPay, etc.)
  // Aqui usamos mock se não houver URL configurada

  if (PIX_PROVIDER_URL.includes("example.com") || !PIX_PROVIDER_API_KEY) {
    return mockPixProvider(request);
  }

  try {
    const response = await fetch(`${PIX_PROVIDER_URL}/v2/cob`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PIX_PROVIDER_API_KEY}`,
        "Idempotency-Key": request.txid, // Garante idempotência no provedor
      },
      body: JSON.stringify({
        calendario: { expiracao: request.expiracaoSegundos },
        devedor: { cpf: "00000000000", nome: "Cliente Corte Rápido" }, // Será preenchido pelo webhook
        valor: { original: request.valor.toFixed(2) },
        chave: request.chavePix,
        solicitacaoPagador: request.descricao,
        infoAdicionais: request.infoAdicionais,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Provedor Pix erro ${response.status}: ${error}`);
    }

    const data = await response.json();
    return {
      qrCodeBase64: data.pixQrCode || data.qrCodeBase64,
      copiaECola: data.pixCopiaECola || data.copiaECola,
      expiracao: data.expiracao || new Date(Date.now() + request.expiracaoSegundos * 1000).toISOString(),
      status: "ATIVA",
    };
  } catch (error) {
    logStructured("error", "Erro ao chamar provedor Pix", { error: String(error) });
    throw new Error("Falha ao gerar cobrança Pix. Tente novamente.");
  }
}

// Mock para desenvolvimento/teste
function mockPixProvider(request: PixProviderRequest): PixProviderResponse {
  // Gera EMV Pix copia e cola (simplificado)
  const payload = `00020126580014br.gov.bcb.pix0136${request.chavePix}520400005303986540${request.valor.toFixed(2)}5802BR5925Corte Rapido Servicos6009SAO PAULO62070503***6304`;

  // Calcula CRC16 (simplificado)
  const crc = calculateCRC16(payload);
  const copiaECola = `${payload}${crc}`;

  // Gera QR Code base64 placeholder (em produção usar biblioteca qrcode)
  const qrCodeBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  return {
    qrCodeBase64,
    copiaECola,
    expiracao: new Date(Date.now() + request.expiracaoSegundos * 1000).toISOString(),
    status: "ATIVA",
  };
}

// CRC16 para Pix (ISO 13239)
function calculateCRC16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const clientIp = getClientIp(req);
  const idempotencyKey = req.headers.get("Idempotency-Key") ?? crypto.randomUUID();
  const startTime = Date.now();

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    logStructured("warn", "Rate limit excedido", { clientIp, requestId });
    const problem = createProblemDetails(
      429,
      "Too Many Requests",
      "Muitas tentativas. Tente novamente em alguns minutos.",
      requestId
    );
    return new Response(JSON.stringify(problem), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
    });
  }

  // Autenticação via JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    const problem = createProblemDetails(
      401,
      "Unauthorized",
      "Token de autenticação não fornecido",
      requestId
    );
    return new Response(JSON.stringify(problem), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Valida usuário
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    logStructured("warn", "Token inválido", { error: authError?.message, requestId });
    const problem = createProblemDetails(
      401,
      "Unauthorized",
      "Sessão inválida ou expirada",
      requestId
    );
    return new Response(JSON.stringify(problem), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
    });
  }

  // Valida body
  let input: GerarCobrancaPixInput;
  try {
    const body = await req.json();
    input = GerarCobrancaPixSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const path = issue.path.join(".");
        errors[path] = [...(errors[path] ?? []), issue.message];
      }
      const problem = createProblemDetails(
        400,
        "Bad Request",
        "Dados de entrada inválidos",
        requestId,
        errors
      );
      return new Response(JSON.stringify(problem), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
      });
    }
    const problem = createProblemDetails(
      400,
      "Bad Request",
      "Body JSON inválido",
      requestId
    );
    return new Response(JSON.stringify(problem), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
    });
  }

  logStructured("info", "Gerando cobrança Pix", {
    requestId,
    userId: user.id,
    agendamentoId: input.agendamentoId,
    assinaturaId: input.assinaturaId,
    valor: input.valor,
    idempotencyKey
  });

  try {
    // 1. Verifica idempotência - já processamos esta chave?
    const { data: existing } = await supabase
      .from("cobrancas_pix")
      .select("txid, qr_code_base64, copia_e_cola, expiracao, status")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existing) {
      logStructured("info", "Cobrança Pix já existe (idempotência)", { requestId, txid: existing.txid });

      // Verifica se expirou
      if (new Date(existing.expiracao) < new Date() && existing.status === "ATIVA") {
        // Atualiza status para expirada
        await supabase
          .from("cobrancas_pix")
          .update({ status: "EXPIRADA" })
          .eq("id", existing.txid);

        const problem = createProblemDetails(
          410,
          "Gone",
          "Cobrança Pix expirada. Gere uma nova.",
          requestId
        );
        return new Response(JSON.stringify(problem), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
        });
      }

      return new Response(JSON.stringify({
        sucesso: true,
        dados: {
          qrCode: existing.qr_code_base64,
          copiaECola: existing.copia_e_cola,
          expiracao: existing.expiracao,
          txid: existing.txid,
          valor: input.valor,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Busca chave Pix do estabelecimento NO SERVIDOR (nunca expõe ao navegador)
    let chavePix: string;
    let estabelecimentoId: string;

    if (input.agendamentoId) {
      const { data: agendamento, error } = await supabase
        .from("agendamentos")
        .select("estabelecimento_id, status_pagamento, valor_total")
        .eq("id", input.agendamentoId)
        .single();

      if (error || !agendamento) {
        const problem = createProblemDetails(
          404,
          "Not Found",
          "Agendamento não encontrado",
          requestId
        );
        return new Response(JSON.stringify(problem), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
        });
      }

      if (agendamento.status_pagamento === "pago") {
        const problem = createProblemDetails(
          400,
          "Bad Request",
          "Agendamento já foi pago",
          requestId
        );
        return new Response(JSON.stringify(problem), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
        });
      }

      // Valida valor
      if (Math.abs(agendamento.valor_total - input.valor) > 0.01) {
        const problem = createProblemDetails(
          400,
          "Bad Request",
          "Valor não confere com o agendamento",
          requestId
        );
        return new Response(JSON.stringify(problem), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
        });
      }

      estabelecimentoId = agendamento.estabelecimento_id;
    } else {
      // Assinatura SaaS
      const { data: assinatura, error } = await supabase
        .from("assinaturas_estabelecimentos")
        .select("estabelecimento_id, plano_id, status")
        .eq("id", input.assinaturaId!)
        .single();

      if (error || !assinatura) {
        const problem = createProblemDetails(
          404,
          "Not Found",
          "Assinatura não encontrada",
          requestId
        );
        return new Response(JSON.stringify(problem), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
        });
      }

      estabelecimentoId = assinatura.estabelecimento_id;
    }

    // Busca configuração Pix do estabelecimento (chave privada, nunca exposta)
    const { data: estab, error: estabError } = await supabase
      .from("estabelecimentos")
      .select("configuracao_pix")
      .eq("id", estabelecimentoId)
      .single();

    if (estabError || !estab?.configuracao_pix?.chave) {
      const problem = createProblemDetails(
        400,
        "Bad Request",
        "Estabelecimento não possui chave Pix configurada",
        requestId
      );
      return new Response(JSON.stringify(problem), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
      });
    }

    chavePix = estab.configuracao_pix.chave;

    // 3. Gera txid único
    const txid = generateTxid();

    // 4. Chama provedor Pix
    const pixResponse = await chamarProvedorPix({
      txid,
      valor: input.valor,
      descricao: input.descricao,
      expiracaoSegundos: input.expiracaoSegundos,
      chavePix,
      infoAdicionais: input.infoAdicionais,
    });

    // 5. Salva cobrança no banco (com idempotency_key)
    const { error: insertError } = await supabase
      .from("cobrancas_pix")
      .insert({
        id: txid,
        idempotency_key: idempotencyKey,
        agendamento_id: input.agendamentoId ?? null,
        assinatura_id: input.assinaturaId ?? null,
        estabelecimento_id: estabelecimentoId,
        usuario_id: user.id,
        valor: input.valor,
        descricao: input.descricao,
        qr_code_base64: pixResponse.qrCodeBase64,
        copia_e_cola: pixResponse.copiaECola,
        expiracao: pixResponse.expiracao,
        status: pixResponse.status,
        chave_pix_usada: chavePix.substring(0, 4) + "****" + chavePix.substring(chavePix.length - 4), // Log parcial
      });

    if (insertError) {
      logStructured("error", "Erro ao salvar cobrança Pix", {
        requestId,
        error: insertError.message
      });
      throw new Error("Erro ao registrar cobrança");
    }

    // 6. Atualiza agendamento se aplicável
    if (input.agendamentoId) {
      await supabase
        .from("agendamentos")
        .update({
          status_pagamento: "aguardando_pix",
          pix_txid: txid,
        })
        .eq("id", input.agendamentoId);
    }

    logStructured("info", "Cobrança Pix gerada com sucesso", {
      requestId,
      txid,
      duracaoMs: Date.now() - startTime
    });

    // 7. Retorna apenas QR Code + Copia e Cola + Expiração (NUNCA a chave Pix)
    return new Response(JSON.stringify({
      sucesso: true,
      dados: {
        qrCode: pixResponse.qrCodeBase64,
        copiaECola: pixResponse.copiaECola,
        expiracao: pixResponse.expiracao,
        txid,
        valor: input.valor,
      },
    }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logStructured("error", "Erro inesperado", {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });

    const problem = createProblemDetails(
      500,
      "Internal Server Error",
      "Erro interno do servidor ao gerar cobrança Pix",
      requestId
    );
    return new Response(JSON.stringify(problem), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
    });
  }
});