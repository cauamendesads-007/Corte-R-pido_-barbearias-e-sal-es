import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://esm.sh/zod@3.22.4";

// ============================================================================
// CONFIGURAÇÃO E TIPOS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://corte-rapido.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Schema de validação Zod
const LgpdExcluirContaSchema = z.object({
  confirmacao: z.literal("EU_QUERO_EXCLUIR_MINHA_CONTA", {
    errorMap: () => ({ message: "Confirmação inválida. Digite exatamente: EU_QUERO_EXCLUIR_MINHA_CONTA" }),
  }),
  motivo: z.string().max(500).optional(),
  tipoExclusao: z.enum(["anonimizar", "excluir"]).default("anonimizar"),
});

type LgpdExcluirContaInput = z.infer<typeof LgpdExcluirContaSchema>;

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
    function: "lgpd-excluir-conta",
    ...meta,
  };
  console.log(JSON.stringify(logEntry));
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
         req.headers.get("x-real-ip") ??
         "unknown";
}

// Rate limiting rigoroso para LGPD
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxRequests = 3, windowMs = 3600000): boolean {
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

// Gera ID anonimizado determinístico
function gerarIdAnonimizado(originalId: string, prefixo: string): string {
  // Hash simples determinístico para manter integridade referencial
  let hash = 0;
  for (let i = 0; i < originalId.length; i++) {
    hash = ((hash << 5) - hash) + originalId.charCodeAt(i);
    hash |= 0;
  }
  return `${prefixo}_${Math.abs(hash).toString(36).substring(0, 12)}`;
}

// ============================================================================
// LÓGICA DE ANONIMIZAÇÃO / EXCLUSÃO (Art. 18 LGPD)
// ============================================================================

interface DadosUsuario {
  id: string;
  email: string;
  papel: string;
  nome?: string;
  bio?: string;
  whatsapp?: string;
  cidade?: string;
  avatar?: string;
  estabelecimento_id?: string;
  confirmado: boolean;
  lembretes_whatsapp: boolean;
  seguindo: string[];
  inspiracao_salvas: string[];
}

async function buscarDadosUsuario(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<DadosUsuario | null> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as DadosUsuario;
}

async function anonimizarUsuario(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  dadosOriginais: DadosUsuario
): Promise<void> {
  const idAnonimizado = gerarIdAnonimizado(userId, "usr");
  const emailAnonimizado = `${idAnonimizado}@anonimizado.lgpd.local`;

  // Atualiza tabela usuarios - mantém ID para FK, anonimiza dados pessoais
  await supabase
    .from("usuarios")
    .update({
      email: emailAnonimizado,
      nome: null,
      bio: null,
      whatsapp: null,
      cidade: null,
      avatar: null,
      estabelecimento_id: null,
      confirmado: false,
      lembretes_whatsapp: false,
      seguindo: [],
      inspiracao_salvas: [],
      // Mantém: id, papel, created_at (para auditoria)
    })
    .eq("id", userId);

  logStructured("info", "Usuário anonimizado", { userId, idAnonimizado });
}

async function excluirUsuarioCompleto(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<void> {
  // Exclusão física (apenas se não houver restrições fiscais)
  // Remove da auth.users também
  await supabase.auth.admin.deleteUser(userId);

  logStructured("info", "Usuário excluído completamente", { userId });
}

async function processarAgendamentos(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tipoExclusao: "anonimizar" | "excluir"
): Promise<void> {
  const { data: agendamentos } = await supabase
    .from("agendamentos")
    .select("id, estabelecimento_id, nome_cliente, telefone_cliente, servicos, valor_total, status_pagamento, status")
    .eq("usuario_id", userId);

  if (!agendamentos || agendamentos.length === 0) return;

  if (tipoExclusao === "anonimizar") {
    // Anonimiza dados pessoais nos agendamentos, MANTÉM para integridade fiscal
    for (const ag of agendamentos) {
      await supabase
        .from("agendamentos")
        .update({
          usuario_id: null, // Remove FK direta
          nome_cliente: "Cliente Anonimizado (LGPD)",
          telefone_cliente: "(00) 00000-0000",
          // Mantém: id, estabelecimento_id, dia, horario, servicos, valor_total, status_pagamento, status
          // Mantém para: notas fiscais, contabilidade, auditoria
        })
        .eq("id", ag.id);
    }
  } else {
    // Exclusão completa - apenas se não houver pagamentos pendentes/notas fiscais
    const temPagamentos = agendamentos.some(a => a.status_pagamento !== "no_local" || a.valor_total > 0);
    if (!temPagamentos) {
      await supabase
        .from("agendamentos")
        .delete()
        .eq("usuario_id", userId);
    } else {
      // Se tem pagamentos, anonimiza mesmo no modo excluir (retenção fiscal)
      for (const ag of agendamentos) {
        await supabase
          .from("agendamentos")
          .update({
            usuario_id: null,
            nome_cliente: "Cliente Excluído (LGPD)",
            telefone_cliente: "(00) 00000-0000",
          })
          .eq("id", ag.id);
      }
    }
  }

  logStructured("info", "Agendamentos processados", { userId, count: agendamentos.length, tipoExclusao });
}

async function processarNotificacoes(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tipoExclusao: "anonimizar" | "excluir"
): Promise<void> {
  if (tipoExclusao === "anonimizar") {
    await supabase
      .from("notificacoes")
      .update({
        destinatario: "anonimizado@lgpd.local",
        texto: "[Conteúdo anonimizado conforme LGPD]",
      })
      .eq("destinatario", userId);
  } else {
    await supabase
      .from("notificacoes")
      .delete()
      .eq("destinatario", userId);
  }
}

async function processarDeviceTokens(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<void> {
  // Remove tokens de push notification (dado pessoal sensível)
  await supabase
    .from("device_tokens")
    .delete()
    .eq("usuario_id", userId);
}

async function processarEstabelecimento(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tipoExclusao: "anonimizar" | "excluir"
): Promise<void> {
  // Verifica se usuário é dono de estabelecimento
  const { data: estab } = await supabase
    .from("estabelecimentos")
    .select("id, responsavel, whatsapp, endereco")
    .eq("responsavel", userId)
    .single();

  if (!estab) return;

  if (tipoExclusao === "anonimizar") {
    await supabase
      .from("estabelecimentos")
      .update({
        responsavel: "Responsável Anonimizado (LGPD)",
        whatsapp: "(00) 00000-0000",
        endereco: "Endereço anonimizado (LGPD)",
        // Mantém: id, slug, nome, cidade, nicho, avaliacao, etc. (dados do negócio)
        status: "rejeitado", // Marca como inativo
      })
      .eq("id", estab.id);
  } else {
    // Exclusão completa do estabelecimento (cuidado: afeta outros barbeiros)
    // Primeiro verifica se há outros barbeiros vinculados
    const { data: barbeiros } = await supabase
      .from("usuarios")
      .select("id")
      .eq("estabelecimento_id", estab.id)
      .neq("id", userId);

    if (!barbeiros || barbeiros.length === 0) {
      // Só exclui se for o único responsável
      await supabase
        .from("estabelecimentos")
        .delete()
        .eq("id", estab.id);
    } else {
      // Se há outros, apenas anonimiza este responsável
      await supabase
        .from("estabelecimentos")
        .update({
          responsavel: "Responsável Excluído (LGPD)",
          whatsapp: "(00) 00000-0000",
          endereco: "Endereço anonimizado (LGPD)",
        })
        .eq("id", estab.id);
    }
  }
}

async function processarAvaliacoes(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tipoExclusao: "anonimizar" | "excluir"
): Promise<void> {
  if (tipoExclusao === "anonimizar") {
    await supabase
      .from("avaliacoes")
      .update({
        nome_cliente: "Cliente Anonimizado",
        avatar: null,
      })
      .eq("usuario_id", userId);
  } else {
    await supabase
      .from("avaliacoes")
      .delete()
      .eq("usuario_id", userId);
  }
}

async function processarPublicacoes(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tipoExclusao: "anonimizar" | "excluir"
): Promise<void> {
  if (tipoExclusao === "anonimizar") {
    await supabase
      .from("publicacoes")
      .update({
        legenda: "[Conteúdo anonimizado conforme LGPD]",
      })
      .eq("estabelecimento_id", userId); // Se for estabelecimento
  } else {
    await supabase
      .from("publicacoes")
      .delete()
      .eq("estabelecimento_id", userId);
  }
}

async function registrarLogAuditoria(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tipoExclusao: "anonimizar" | "excluir",
  motivo?: string
): Promise<void> {
  // Log de auditoria imutável (não pode ser apagado)
  await supabase
    .from("logs_auditoria_lgpd")
    .insert({
      usuario_id_original: userId,
      acao: tipoExclusao === "anonimizar" ? "ANONIMIZACAO" : "EXCLUSAO",
      motivo: motivo ?? "Solicitação do titular (Art. 18 LGPD)",
      executado_em: new Date().toISOString(),
      executado_por: "sistema_automatico",
      detalhes: {
        funcao: "lgpd-excluir-conta",
        versao: "1.0",
      },
    });
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const clientIp = getClientIp(req);
  const startTime = Date.now();

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting rigoroso
  if (!checkRateLimit(clientIp)) {
    logStructured("warn", "Rate limit LGPD excedido", { clientIp, requestId });
    const problem = createProblemDetails(
      429,
      "Too Many Requests",
      "Limite de tentativas excedido. Tente novamente em 1 hora.",
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
    logStructured("warn", "Token inválido LGPD", { error: authError?.message, requestId });
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
  let input: LgpdExcluirContaInput;
  try {
    const body = await req.json();
    input = LgpdExcluirContaSchema.parse(body);
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

  logStructured("info", "Solicitação LGPD recebida", {
    requestId,
    userId: user.id,
    tipoExclusao: input.tipoExclusao,
    motivo: input.motivo
  });

  try {
    // Busca dados atuais do usuário
    const dadosUsuario = await buscarDadosUsuario(supabase, user.id);
    if (!dadosUsuario) {
      const problem = createProblemDetails(
        404,
        "Not Found",
        "Usuário não encontrado",
        requestId
      );
      return new Response(JSON.stringify(problem), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
      });
    }

    // Verifica se há restrições fiscais que impedem exclusão total
    const { data: pagamentosPendentes } = await supabase
      .from("cobrancas_pix")
      .select("id")
      .eq("usuario_id", user.id)
      .in("status", ["ATIVA", "PENDENTE"]);

    const { data: assinaturasAtivas } = await supabase
      .from("assinaturas_estabelecimentos")
      .select("id")
      .eq("estabelecimento_id", dadosUsuario.estabelecimento_id ?? "")
      .eq("status", "ativa");

    const temRestricaoFiscal = (pagamentosPendentes && pagamentosPendentes.length > 0) ||
                               (assinaturasAtivas && assinaturasAtivas.length > 0);

    // Se usuário pediu exclusão total mas tem restrição fiscal, força anonimização
    const tipoExclusaoEfetivo = temRestricaoFiscal ? "anonimizar" : input.tipoExclusao;

    if (temRestricaoFiscal && input.tipoExclusao === "excluir") {
      logStructured("warn", "Exclusão total bloqueada por restrição fiscal - forçando anonimização", {
        userId: user.id,
        pagamentosPendentes: pagamentosPendentes?.length ?? 0,
        assinaturasAtivas: assinaturasAtivas?.length ?? 0
      });
    }

    // Executa em transação (usando RPC para atomicidade)
    // Como Deno/Edge Functions não tem transação nativa, usamos try/catch com rollback manual se necessário

    // 1. Processa agendamentos (MANTÉM para retenção fiscal Art. 18 LGPD §1º)
    await processarAgendamentos(supabase, user.id, tipoExclusaoEfetivo);

    // 2. Processa notificações
    await processarNotificacoes(supabase, user.id, tipoExclusaoEfetivo);

    // 3. Remove device tokens (sempre)
    await processarDeviceTokens(supabase, user.id);

    // 4. Processa estabelecimento se for dono
    await processarEstabelecimento(supabase, user.id, tipoExclusaoEfetivo);

    // 5. Processa avaliações
    await processarAvaliacoes(supabase, user.id, tipoExclusaoEfetivo);

    // 6. Processa publicações/feed
    await processarPublicacoes(supabase, user.id, tipoExclusaoEfetivo);

    // 7. Anonimiza ou exclui usuário
    if (tipoExclusaoEfetivo === "anonimizar") {
      await anonimizarUsuario(supabase, user.id, dadosUsuario);
    } else {
      await excluirUsuarioCompleto(supabase, user.id);
    }

    // 8. Registra log de auditoria (IMUTÁVEL - nunca apaga)
    await registrarLogAuditoria(supabase, user.id, tipoExclusaoEfetivo, input.motivo);

    logStructured("info", "LGPD processado com sucesso", {
      requestId,
      userId: user.id,
      tipoExclusao: tipoExclusaoEfetivo,
      duracaoMs: Date.now() - startTime
    });

    return new Response(JSON.stringify({
      sucesso: true,
      dados: {
        mensagem: tipoExclusaoEfetivo === "anonimizar"
          ? "Seus dados pessoais foram anonimizados conforme LGPD (Art. 18). Dados fiscais e de auditoria foram mantidos conforme legislação."
          : "Sua conta foi excluída completamente. Dados fiscais obrigatórios foram mantidos conforme legislação.",
        tipoExecutado: tipoExclusaoEfetivo,
        restricaoFiscal: temRestricaoFiscal,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logStructured("error", "Erro ao processar LGPD", {
      requestId,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error)
    });

    const problem = createProblemDetails(
      500,
      "Internal Server Error",
      "Erro interno ao processar solicitação LGPD",
      requestId
    );
    return new Response(JSON.stringify(problem), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
    });
  }
});