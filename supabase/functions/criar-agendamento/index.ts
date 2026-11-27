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
const APP_URL = Deno.env.get("APP_URL") ?? "https://corte-rapido.app";

// Schema de validação Zod
const CriarAgendamentoSchema = z.object({
  estabelecimentoId: z.string().uuid("ID do estabelecimento inválido"),
  dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  horario: z.string().regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM"),
  duracaoMinutos: z.number().int().min(5).max(480),
  nomeCliente: z.string().min(2).max(60),
  telefoneCliente: z.string().regex(/^\(\d{2}\)\s?9\d{4}-?\d{4}$/, "WhatsApp inválido: (DD) 9xxxx-xxxx"),
  servicoIds: z.array(z.string().uuid()).min(1, "Pelo menos um serviço é obrigatório"),
  observacoes: z.string().max(500).optional(),
});

type CriarAgendamentoInput = z.infer<typeof CriarAgendamentoSchema>;

// Tipos para resposta RFC 7807
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
    function: "criar-agendamento",
    ...meta,
  };
  console.log(JSON.stringify(logEntry));
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
         req.headers.get("x-real-ip") ??
         "unknown";
}

// Rate limiting simples em memória (para produção usar Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxRequests = 30, windowMs = 60000): boolean {
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

// ============================================================================
// LÓGICA DE NEGÓCIO
// ============================================================================

async function validarHorarioFuncionamento(
  supabase: ReturnType<typeof createClient>,
  estabelecimentoId: string,
  dia: string,
  horario: string,
  duracaoMinutos: number
): Promise<{ valido: boolean; erro?: string }> {
  // Busca horário de funcionamento do estabelecimento
  const { data: estab, error } = await supabase
    .from("estabelecimentos")
    .select("horario_funcionamento, fuso_horario")
    .eq("id", estabelecimentoId)
    .single();

  if (error || !estab) {
    return { valido: false, erro: "Estabelecimento não encontrado" };
  }

  // Parse do horário de funcionamento (formato: "08:00-18:00" ou JSON com dias da semana)
  let horarioFuncionamento: { inicio: string; fim: string } | null = null;

  try {
    const hf = JSON.parse(estab.horario_funcionamento);
    const diaSemana = new Date(dia + "T00:00:00").getDay(); // 0 = Domingo
    const diasMap = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const configDia = hf[diasMap[diaSemana]];

    if (configDia && !configDia.fechado) {
      horarioFuncionamento = { inicio: configDia.inicio, fim: configDia.fim };
    }
  } catch {
    // Formato simples "HH:MM-HH:MM"
    const partes = estab.horario_funcionamento.split("-");
    if (partes.length === 2) {
      horarioFuncionamento = { inicio: partes[0], fim: partes[1] };
    }
  }

  if (!horarioFuncionamento) {
    return { valido: false, erro: "Estabelecimento fechado neste dia" };
  }

  const [horaInicio, minInicio] = horarioFuncionamento.inicio.split(":").map(Number);
  const [horaFim, minFim] = horarioFuncionamento.fim.split(":").map(Number);
  const [horaAgend, minAgend] = horario.split(":").map(Number);

  const inicioMinutos = horaInicio * 60 + minInicio;
  const fimMinutos = horaFim * 60 + minFim;
  const agendamentoInicio = horaAgend * 60 + minAgend;
  const agendamentoFim = agendamentoInicio + duracaoMinutos;

  if (agendamentoInicio < inicioMinutos || agendamentoFim > fimMinutos) {
    return {
      valido: false,
      erro: `Horário fora do funcionamento (${horarioFuncionamento.inicio} - ${horarioFuncionamento.fim})`
    };
  }

  return { valido: true };
}

async function validarAntecedencia(
  dia: string,
  horario: string,
  antecedenciaMinimaMinutos: number = 30,
  antecedenciaMaximaDias: number = 60
): Promise<{ valido: boolean; erro?: string }> {
  const agora = new Date();
  const agendamento = new Date(`${dia}T${horario}:00`);

  const diffMinutos = (agendamento.getTime() - agora.getTime()) / (1000 * 60);
  const diffDias = diffMinutos / (60 * 24);

  if (diffMinutos < antecedenciaMinimaMinutos) {
    return {
      valido: false,
      erro: `Agendamento deve ser feito com pelo menos ${antecedenciaMinimaMinutos} minutos de antecedência`
    };
  }

  if (diffDias > antecedenciaMaximaDias) {
    return {
      valido: false,
      erro: `Agendamento não pode ser feito com mais de ${antecedenciaMaximaDias} dias de antecedência`
    };
  }

  return { valido: true };
}

async function verificarBloqueios(
  supabase: ReturnType<typeof createClient>,
  estabelecimentoId: string,
  dia: string,
  horario: string,
  duracaoMinutos: number
): Promise<{ valido: boolean; erro?: string }> {
  const { data: bloqueios, error } = await supabase
    .from("bloqueios_agenda")
    .select("inicio, fim, motivo")
    .eq("estabelecimento_id", estabelecimentoId)
    .lte("inicio", `${dia}T${horario}:00`)
    .gte("fim", `${dia}T${horario}:00`);

  if (error) {
    logStructured("error", "Erro ao buscar bloqueios", { error: error.message });
    return { valido: false, erro: "Erro ao verificar bloqueios" };
  }

  const agendamentoInicio = new Date(`${dia}T${horario}:00`);
  const agendamentoFim = new Date(agendamentoInicio.getTime() + duracaoMinutos * 60000);

  for (const bloqueio of bloqueios ?? []) {
    const bloqueioInicio = new Date(bloqueio.inicio);
    const bloqueioFim = new Date(bloqueio.fim);

    // Verifica sobreposição
    if (agendamentoInicio < bloqueioFim && agendamentoFim > bloqueioInicio) {
      return {
        valido: false,
        erro: `Horário bloqueado: ${bloqueio.motivo || "Indisponível"}`
      };
    }
  }

  return { valido: true };
}

async function calcularSlotsLivres(
  supabase: ReturnType<typeof createClient>,
  estabelecimentoId: string,
  dia: string,
  duracaoMinutos: number
): Promise<string[]> {
  // Busca agendamentos existentes no dia
  const { data: agendamentos, error } = await supabase
    .from("agendamentos")
    .select("horario, duracao_minutos")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("dia", dia)
    .in("status", ["agendado", "confirmado", "aguardando_pix"]);

  if (error) {
    logStructured("error", "Erro ao buscar agendamentos", { error: error.message });
    return [];
  }

  // Busca horário de funcionamento
  const { data: estab } = await supabase
    .from("estabelecimentos")
    .select("horario_funcionamento")
    .eq("id", estabelecimentoId)
    .single();

  let horarioFuncionamento: { inicio: string; fim: string } | null = null;

  try {
    const hf = JSON.parse(estab?.horario_funcionamento ?? "{}");
    const diaSemana = new Date(dia + "T00:00:00").getDay();
    const diasMap = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const configDia = hf[diasMap[diaSemana]];

    if (configDia && !configDia.fechado) {
      horarioFuncionamento = { inicio: configDia.inicio, fim: configDia.fim };
    }
  } catch {
    const partes = estab?.horario_funcionamento?.split("-") ?? [];
    if (partes.length === 2) {
      horarioFuncionamento = { inicio: partes[0], fim: partes[1] };
    }
  }

  if (!horarioFuncionamento) return [];

  const [hIni, mIni] = horarioFuncionamento.inicio.split(":").map(Number);
  const [hFim, mFim] = horarioFuncionamento.fim.split(":").map(Number);

  const slots: string[] = [];
  let atual = hIni * 60 + mIni;
  const fim = hFim * 60 + mFim;

  const ocupados = new Set<string>();
  for (const ag of agendamentos ?? []) {
    const [h, m] = ag.horario.split(":").map(Number);
    const inicio = h * 60 + m;
    const fimAg = inicio + ag.duracao_minutos;
    for (let t = inicio; t < fimAg; t += 15) { // slots de 15 min
      const hh = Math.floor(t / 60).toString().padStart(2, "0");
      const mm = (t % 60).toString().padStart(2, "0");
      ocupados.add(`${hh}:${mm}`);
    }
  }

  while (atual + duracaoMinutos <= fim) {
    const hh = Math.floor(atual / 60).toString().padStart(2, "0");
    const mm = (atual % 60).toString().padStart(2, "0");
    const slot = `${hh}:${mm}`;

    // Verifica se o slot inteiro está livre
    let livre = true;
    for (let t = atual; t < atual + duracaoMinutos; t += 15) {
      const hhs = Math.floor(t / 60).toString().padStart(2, "0");
      const mms = (t % 60).toString().padStart(2, "0");
      if (ocupados.has(`${hhs}:${mms}`)) {
        livre = false;
        break;
      }
    }

    if (livre) slots.push(slot);
    atual += 15; // incremento de 15 min
  }

  return slots;
}

async function congelarPrecos(
  supabase: ReturnType<typeof createClient>,
  servicoIds: string[],
  estabelecimentoId: string
): Promise<Record<string, number>> {
  const { data: servicos, error } = await supabase
    .from("servicos")
    .select("id, preco")
    .in("id", servicoIds)
    .eq("estabelecimento_id", estabelecimentoId);

  if (error || !servicos) {
    throw new Error("Erro ao buscar preços dos serviços");
  }

  const precos: Record<string, number> = {};
  for (const s of servicos) {
    precos[s.id] = s.preco;
  }
  return precos;
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
  let input: CriarAgendamentoInput;
  try {
    const body = await req.json();
    input = CriarAgendamentoSchema.parse(body);
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

  logStructured("info", "Criando agendamento", {
    requestId,
    userId: user.id,
    estabelecimentoId: input.estabelecimentoId,
    dia: input.dia,
    horario: input.horario
  });

  try {
    // 1. Valida antecedência
    const validacaoAntecedencia = await validarAntecedencia(input.dia, input.horario);
    if (!validacaoAntecedencia.valido) {
      const problem = createProblemDetails(
        400,
        "Bad Request",
        validacaoAntecedencia.erro!,
        requestId
      );
      return new Response(JSON.stringify(problem), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
      });
    }

    // 2. Valida horário de funcionamento
    const validacaoHorario = await validarHorarioFuncionamento(
      supabase,
      input.estabelecimentoId,
      input.dia,
      input.horario,
      input.duracaoMinutos
    );
    if (!validacaoHorario.valido) {
      const problem = createProblemDetails(
        400,
        "Bad Request",
        validacaoHorario.erro!,
        requestId
      );
      return new Response(JSON.stringify(problem), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
      });
    }

    // 3. Verifica bloqueios
    const validacaoBloqueios = await verificarBloqueios(
      supabase,
      input.estabelecimentoId,
      input.dia,
      input.horario,
      input.duracaoMinutos
    );
    if (!validacaoBloqueios.valido) {
      const problem = createProblemDetails(
        409,
        "Conflict",
        validacaoBloqueios.erro!,
        requestId
      );
      return new Response(JSON.stringify(problem), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
      });
    }

    // 4. Congela preços
    const precosCongelados = await congelarPrecos(
      supabase,
      input.servicoIds,
      input.estabelecimentoId
    );

    const valorTotal = input.servicoIds.reduce((sum, id) => sum + (precosCongelados[id] ?? 0), 0);

    // 5. Busca configuração Pix do estabelecimento
    const { data: estabConfig } = await supabase
      .from("estabelecimentos")
      .select("configuracao_pix")
      .eq("id", input.estabelecimentoId)
      .single();

    const configPix = estabConfig?.configuracao_pix ?? { modo: "desativado", chave: "", percentualSinal: 0 };
    const statusPagamento = configPix.modo === "obrigatorio" ? "aguardando_pix" : "no_local";

    // 6. Grava agendamento em transação
    const { data: agendamento, error: insertError } = await supabase.rpc(
      "criar_agendamento_com_itens",
      {
        p_estabelecimento_id: input.estabelecimentoId,
        p_usuario_id: user.id,
        p_dia: input.dia,
        p_horario: input.horario,
        p_duracao_minutos: input.duracaoMinutos,
        p_nome_cliente: input.nomeCliente,
        p_telefone_cliente: input.telefoneCliente,
        p_servico_ids: input.servicoIds,
        p_precos_congelados: precosCongelados,
        p_valor_total: valorTotal,
        p_status_pagamento: statusPagamento,
        p_observacoes: input.observacoes ?? null,
      }
    );

    // Trata erro de exclusion_violation (conflito de horário - race condition)
    if (insertError) {
      if (insertError.code === "23P01" || insertError.message?.includes("exclusion_violation")) {
        logStructured("warn", "Conflito de horário (race condition)", {
          requestId,
          error: insertError.message
        });

        // Retorna slots livres para o cliente tentar outro horário
        const slotsLivres = await calcularSlotsLivres(
          supabase,
          input.estabelecimentoId,
          input.dia,
          input.duracaoMinutos
        );

        const problem = createProblemDetails(
          409,
          "Conflict",
          "Esse horário acabou de ser ocupado. Escolha outro.",
          requestId,
          { slotsLivres: [slotsLivres.slice(0, 10).join(", ")] }
        );
        return new Response(JSON.stringify(problem), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
        });
      }

      logStructured("error", "Erro ao criar agendamento", {
        requestId,
        error: insertError.message,
        code: insertError.code
      });

      const problem = createProblemDetails(
        500,
        "Internal Server Error",
        "Erro ao processar agendamento",
        requestId
      );
      return new Response(JSON.stringify(problem), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
      });
    }

    // 7. Gera notificações (async, não bloqueia resposta)
    // WhatsApp / Email / Push - implementar integração real
    supabase
      .from("notificacoes")
      .insert({
        destinatario: user.email,
        tipo: "agendamento",
        titulo: "Agendamento confirmado",
        texto: `Seu horário foi confirmado para ${input.dia} às ${input.horario}. Valor: R$ ${valorTotal.toFixed(2)}`,
        estabelecimento_id: input.estabelecimentoId,
        agendamento_id: agendamento,
      })
      .then(({ error }) => {
        if (error) logStructured("error", "Erro ao criar notificação", { error: error.message });
      });

    // Notificação para o estabelecimento (barbeiro)
    supabase
      .from("notificacoes")
      .insert({
        destinatario: input.estabelecimentoId, // será resolvido pelo trigger
        tipo: "agendamento",
        titulo: "Novo agendamento",
        texto: `${input.nomeCliente} agendou para ${input.dia} às ${input.horario}`,
        estabelecimento_id: input.estabelecimentoId,
        agendamento_id: agendamento,
      })
      .then(({ error }) => {
        if (error) logStructured("error", "Erro ao criar notificação barbeiro", { error: error.message });
      });

    logStructured("info", "Agendamento criado com sucesso", {
      requestId,
      agendamentoId: agendamento,
      duracaoMs: Date.now() - startTime
    });

    return new Response(JSON.stringify({
      sucesso: true,
      dados: {
        agendamentoId: agendamento,
        valorTotal,
        statusPagamento,
        precisaPagarPix: statusPagamento === "aguardando_pix",
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
      "Erro interno do servidor",
      requestId
    );
    return new Response(JSON.stringify(problem), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
    });
  }
});