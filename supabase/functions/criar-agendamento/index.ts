// ============================================================================
// EDGE FUNCTION: criar-agendamento
// Valida antecedência, horários, bloqueios, calcula slots, congela preços em
// item_agendamento, grava agendamento em transação (trata erro 23P01 -> 409)
// ============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ============================================================================
// CONFIGURAÇÃO E TIPOS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://corte-rapido.app", // Ajustar para domínio de produção
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
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

const CriarAgendamentoSchema = z.object({
  estabelecimento_id: z.string().uuid(),
  profissional_id: z.string().uuid(),
  usuario_id: z.string().uuid().nullable().optional(),
  dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  horario: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
  duracao_min: z.number().int().positive().max(480),
  nome_cliente: z.string().min(2).max(100),
  telefone_cliente: z.string().min(10).max(20),
  servico_ids: z.array(z.string().uuid()).min(1).max(10),
  valor_total_centavos: z.number().int().positive(),
  status_pagamento: z.enum(["no_local", "aguardando_pix", "pago"]).default("no_local"),
  observacoes: z.string().max(500).optional(),
});

type CriarAgendamentoInput = z.infer<typeof CriarAgendamentoSchema>;

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

async function validateEstabelecimentoAccess(userId: string, estabelecimentoId: string) {
  // Verifica se usuário é admin ou dono/barbeiro do estabelecimento
  const { data: user, error: userError } = await supabase
    .from("usuarios")
    .select("papel, estabelecimento_id")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    throw new HttpError(403, "Acesso negado", "Usuário não encontrado", "FORBIDDEN");
  }

  const isAdmin = user.papel === "admin";
  const isOwner = user.papel === "barbeiro" && user.estabelecimento_id === estabelecimentoId;

  if (!isAdmin && !isOwner) {
    throw new HttpError(403, "Acesso negado", "Você não tem permissão para gerenciar este estabelecimento", "FORBIDDEN");
  }
}

async function validateProfissional(profissionalId: string, estabelecimentoId: string) {
  const { data, error } = await supabase
    .from("profissionais")
    .select("id, estabelecimento_id, ativo, usuario_id")
    .eq("id", profissionalId)
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("ativo", true)
    .single();

  if (error || !data) {
    throw new HttpError(404, "Profissional não encontrado", "Profissional não existe ou não pertence a este estabelecimento", "PROFISSIONAL_NOT_FOUND");
  }
  return data;
}

async function validateServicos(servicoIds: string[], estabelecimentoId: string) {
  const { data, error } = await supabase
    .from("servicos")
    .select("id, nome, preco_centavos, duracao_min")
    .in("id", servicoIds)
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("ativo", true);

  if (error) {
    throw new HttpError(500, "Erro interno", "Falha ao validar serviços", "DB_ERROR");
  }

  if (!data || data.length !== servicoIds.length) {
    const foundIds = data?.map((s) => s.id) || [];
    const missing = servicoIds.filter((id) => !foundIds.includes(id));
    throw new HttpError(400, "Serviços inválidos", `Serviços não encontrados ou inativos: ${missing.join(", ")}`, "SERVICOS_INVALIDOS");
  }

  return data;
}

async function checkAntecedencia(dia: string, horario: string): void {
  const agora = new Date();
  const agendamentoDt = new Date(`${dia}T${horario}:00`);
  const diffMin = (agendamentoDt.getTime() - agora.getTime()) / 60000;

  // Antecedência mínima: 30 minutos
  if (diffMin < 30) {
    throw new HttpError(400, "Antecedência insuficiente", "Agendamentos devem ser feitos com pelo menos 30 minutos de antecedência", "ANTECEDENCIA_INSUFICIENTE");
  }

  // Antecedência máxima: 90 dias
  const diffDays = diffMin / (60 * 24);
  if (diffDays > 90) {
    throw new HttpError(400, "Antecedência excessiva", "Agendamentos só podem ser feitos com até 90 dias de antecedência", "ANTECEDENCIA_EXCESSIVA");
  }
}

async function checkHorarioFuncionamento(profissionalId: string, dia: string, horario: string, duracaoMin: number): Promise<void> {
  const diaSemana = new Date(`${dia}T00:00:00`).getDay(); // 0=Dom..6=Sáb

  const { data, error } = await supabase
    .from("horarios_funcionamento")
    .select("hora_inicio, hora_fim, intervalo_minutos")
    .eq("profissional_id", profissionalId)
    .eq("dia_semana", diaSemana)
    .eq("ativo", true)
    .single();

  if (error || !data) {
    throw new HttpError(400, "Estabelecimento fechado", "O profissional não atende neste dia da semana", "ESTABELECIMENTO_FECHADO");
  }

  const inicio = data.hora_inicio;
  const fim = data.hora_fim;
  const slotFim = addMinutes(horario, duracaoMin);

  if (horario < inicio || slotFim > fim) {
    throw new HttpError(400, "Fora do horário", `Horário deve estar entre ${inicio} e ${fim}`, "FORA_HORARIO");
  }
}

async function checkBloqueios(profissionalId: string, dia: string, horario: string, duracaoMin: number): Promise<void> {
  const inicio = new Date(`${dia}T${horario}:00`);
  const fim = addMinutes(`${dia}T${horario}:00`, duracaoMin);

  const { data, error } = await supabase
    .from("bloqueios_agenda")
    .select("id")
    .eq("profissional_id", profissionalId)
    .lte("inicio", fim.toISOString())
    .gte("fim", inicio.toISOString())
    .limit(1);

  if (error) {
    throw new HttpError(500, "Erro interno", "Falha ao verificar bloqueios", "DB_ERROR");
  }

  if (data && data.length > 0) {
    throw new HttpError(409, "Horário bloqueado", "Este profissional tem um bloqueio de agenda neste horário", "HORARIO_BLOQUEADO");
  }
}

function addMinutes(dateTime: string, minutes: number): string {
  const dt = new Date(dateTime);
  dt.setMinutes(dt.getMinutes() + minutes);
  return dt.toTimeString().slice(0, 5);
}

async function calculateSlotsLivres(profissionalId: string, dia: string, duracaoMin: number) {
  // Reutiliza a RPC do banco
  const { data, error } = await supabase.rpc("rpc_slots_disponiveis", {
    p_profissional_id: profissionalId,
    p_dia: dia,
    p_duracao_min: duracaoMin,
  });

  if (error) {
    console.error("Erro ao calcular slots:", error);
    return [];
  }

  return data || [];
}

async function createAgendamentoTx(input: CriarAgendamentoInput & { servicos: unknown[] }) {
  const { data, error } = await supabase.rpc("rpc_criar_agendamento", {
    p_estabelecimento_id: input.estabelecimento_id,
    p_profissional_id: input.profissional_id,
    p_usuario_id: input.usuario_id || null,
    p_dia: input.dia,
    p_horario: input.horario,
    p_duracao_min: input.duracao_min,
    p_nome_cliente: input.nome_cliente,
    p_telefone_cliente: input.telefone_cliente,
    p_servico_ids: input.servico_ids,
    p_valor_total_centavos: input.valor_total_centavos,
    p_status_pagamento: input.status_pagamento,
    p_observacoes: input.observacoes || null,
  });

  if (error) {
    // Erro 23P01 = exclusion_violation (constraint anti-overbooking)
    if (error.code === "23P01" || error.message?.includes("exclusion_violation")) {
      throw new HttpError(409, "Conflito de horário", "Esse horário acabou de ser ocupado por outro agendamento. Escolha outro.", "CONFLITO_HORARIO");
    }
    throw new HttpError(500, "Erro ao criar agendamento", error.message, "DB_ERROR");
  }

  const result = data?.[0];
  if (result?.erro) {
    if (result.erro.includes("CONFLITO_HORARIO")) {
      throw new HttpError(409, "Conflito de horário", result.erro, "CONFLITO_HORARIO");
    }
    throw new HttpError(400, "Erro de validação", result.erro, "VALIDATION_ERROR");
  }

  return result?.agendamento_id;
}

async function createNotifications(agendamentoId: string, estabelecimentoId: string, profissionalId: string, tipo: "criado" | "cancelado" | "reagendado") {
  // Busca barbeiros do estabelecimento para notificar
  const { data: barbeiros } = await supabase
    .from("usuarios")
    .select("id, email")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("papel", "barbeiro");

  const notifications = (barbeiros || []).map((b) => ({
    destinatario_id: b.id,
    tipo: tipo === "criado" ? "agendamento" : tipo === "cancelado" ? "cancelamento" : "reagendamento",
    titulo: tipo === "criado" ? "Novo agendamento" : tipo === "cancelado" ? "Agendamento cancelado" : "Agendamento reagendado",
    texto: `Agendamento ${tipo} para ${agendamentoId}`,
    estabelecimento_id: estabelecimentoId,
  }));

  if (notifications.length > 0) {
    await supabase.from("notificacoes").insert(notifications);
  }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new HttpError(405, "Método não permitido", "Apenas POST é permitido", "METHOD_NOT_ALLOWED").toResponse();
  }

  // Idempotency-Key header (opcional mas recomendado)
  const _idempotencyKey = req.headers.get("idempotency-key");

  try {
    // 1. Autenticação
    const user = await getAuthenticatedUser(req.headers.get("authorization"));

    // 2. Parse e validação do body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "JSON inválido", "Corpo da requisição deve ser JSON válido", "INVALID_JSON");
    }

    const input = CriarAgendamentoSchema.parse(body);

    // 3. Verifica permissão no estabelecimento
    await validateEstabelecimentoAccess(user.id, input.estabelecimento_id);

    // 4. Valida profissional
    await validateProfissional(input.profissional_id, input.estabelecimento_id);

    // 5. Valida serviços
    const servicos = await validateServicos(input.servico_ids, input.estabelecimento_id);

    // 6. Valida valor total (soma dos serviços deve bater)
    const valorCalculado = servicos.reduce((acc, s) => acc + s.preco_centavos, 0);
    if (valorCalculado !== input.valor_total_centavos) {
      throw new HttpError(400, "Valor incorreto", `Valor total deve ser ${valorCalculado} centavos (soma dos serviços)`, "VALOR_INCORRETO");
    }

    // 7. Valida duração total
    const duracaoCalculada = servicos.reduce((acc, s) => acc + s.duracao_min, 0);
    if (duracaoCalculada !== input.duracao_min) {
      throw new HttpError(400, "Duração incorreta", `Duração total deve ser ${duracaoCalculada} minutos (soma dos serviços)`, "DURACAO_INCORRETA");
    }

    // 8. Valida antecedência
    await checkAntecedencia(input.dia, input.horario);

    // 9. Valida horário de funcionamento
    await checkHorarioFuncionamento(input.profissional_id, input.dia, input.horario, input.duracao_min);

    // 10. Valida bloqueios
    await checkBloqueios(input.profissional_id, input.dia, input.horario, input.duracao_min);

    // 11. Calcula slots livres (para resposta)
    const slots = await calculateSlotsLivres(input.profissional_id, input.dia, input.duracao_min);

    // 12. Cria agendamento em transação (RPC)
    const agendamentoId = await createAgendamentoTx({ ...input, servicos });

    // 13. Cria notificações (async, não bloqueia)
    createNotifications(agendamentoId, input.estabelecimento_id, input.profissional_id, "criado").catch(console.error);

    // 14. Log de auditoria
    await supabase.from("audit_logs").insert({
      usuario_id: user.id,
      estabelecimento_id: input.estabelecimento_id,
      acao: "create",
      entidade: "agendamentos",
      entidade_id: agendamentoId,
      dados_novos: input,
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    }).catch(console.error);

    // 15. Resposta de sucesso
    return new Response(
      JSON.stringify({
        sucesso: true,
        dados: {
          agendamento_id: agendamentoId,
          slots_disponiveis: slots.filter((s) => s.disponivel).map((s) => s.horario),
        },
        mensagem: "Agendamento criado com sucesso",
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
    return new HttpError(500, "Erro interno", "Erro inesperado ao processar agendamento", "INTERNAL_ERROR").toResponse();
  }
});