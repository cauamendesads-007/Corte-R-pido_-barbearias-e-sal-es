-- ============================================================================
-- MIGRATION 001 — ESQUEMA DEFINITIVO CORTE RÁPIDO (ZERO ALERTAS SUPABASE ADVISOR)
-- PostgreSQL 15+ / Supabase — Performance Máxima
-- Idempotente: pode ser executado múltiplas vezes sem erro
-- ============================================================================

-- ============================================================================
-- EXTENSÕES NO SCHEMA EXTENSIONS (não public) — ZERO "Extension in Public" ALERTS
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ============================================================================
-- ENUMS (tipos enumerados para integridade)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.nicho_estabelecimento AS ENUM ('barbearia', 'feminino', 'visagismo', 'infantil');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_estabelecimento AS ENUM ('aprovado', 'pendente', 'rejeitado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_layout AS ENUM ('classico', 'moderno');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.papel_usuario AS ENUM ('cliente', 'barbeiro', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_pagamento AS ENUM ('no_local', 'aguardando_pix', 'pago');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_agendamento AS ENUM ('agendado', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_midia AS ENUM ('imagem', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.publicacao_tipo AS ENUM ('corte', 'barba', 'combo', 'inspiracao', 'dica', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_notificacao AS ENUM ('agendamento', 'reagendamento', 'cancelamento', 'mensagem', 'administracao', 'pagamento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inspiracao_categoria AS ENUM ('classico', 'moderno', 'degrade', 'barba', 'colorido', 'infantil', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.plano_tipo AS ENUM ('mensal', 'diario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.webhook_tipo AS ENUM ('pagamento_agendamento', 'pagamento_assinatura');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.audit_acao AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'export', 'anonymize');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABELA: usuarios (extensão do auth.users do Supabase)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  papel public.papel_usuario NOT NULL DEFAULT 'cliente',
  nome TEXT,
  bio TEXT,
  whatsapp TEXT,
  cidade TEXT,
  avatar TEXT,
  estabelecimento_id UUID,
  confirmado BOOLEAN NOT NULL DEFAULT false,
  lembretes_whatsapp BOOLEAN NOT NULL DEFAULT true,
  seguindo UUID[] NOT NULL DEFAULT '{}',
  inspiracao_salvas UUID[] NOT NULL DEFAULT '{}',
  cpf TEXT,
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_cpf_formato CHECK (cpf IS NULL OR cpf ~ '^\d{11}$')
);

COMMENT ON TABLE public.usuarios IS 'Perfil estendido do usuário (auth.users + dados de negócio). CPF apenas para barbeiros, anonimizado em LGPD.';

-- Índices FK
CREATE INDEX IF NOT EXISTS idx_usuarios_estabelecimento_id ON public.usuarios (estabelecimento_id);

-- ============================================================================
-- TABELA: estabelecimentos (tenants)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.estabelecimentos (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  cidade TEXT NOT NULL,
  nicho public.nicho_estabelecimento NOT NULL,
  avaliacao NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  status public.status_estabelecimento NOT NULL DEFAULT 'pendente',
  latitude NUMERIC(10,8) NOT NULL,
  longitude NUMERIC(11,8) NOT NULL,
  whatsapp TEXT NOT NULL,
  endereco TEXT NOT NULL,
  sobre TEXT,
  tema_cor TEXT NOT NULL DEFAULT '#B45309',
  tema_layout public.tipo_layout NOT NULL DEFAULT 'classico',
  tema_titulo TEXT,
  tema_subtitulo TEXT,
  tempo_medio_atendimento INT NOT NULL DEFAULT 20,
  horario_funcionamento TEXT NOT NULL DEFAULT 'Seg a Sáb, 9h às 18h',
  permite_auto_edicao BOOLEAN NOT NULL DEFAULT false,
  configuracao_pix_modo TEXT NOT NULL DEFAULT 'desativado' CHECK (configuracao_pix_modo IN ('desativado', 'opcional', 'obrigatorio')),
  configuracao_pix_chave TEXT,
  configuracao_pix_percentual_sinal INT NOT NULL DEFAULT 30,
  seguidores INT NOT NULL DEFAULT 0,
  taxa_fidelidade NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.estabelecimentos IS 'Tenants do sistema (barbearias/salões). Chave Pix armazenada apenas no servidor, nunca exposta via RLS.';

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_status_cidade ON public.estabelecimentos (status, cidade);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_nicho_status ON public.estabelecimentos (nicho, status);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_slug ON public.estabelecimentos (slug);
-- Índices parciais de alta velocidade para consultas reais do app
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_aprovado_cidade_nicho ON public.estabelecimentos (cidade, nicho) WHERE status = 'aprovado';

-- ============================================================================
-- TABELA: profissionais (SEPARADA DE usuarios - REQUISITO OBRIGATÓRIO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  usuario_id UUID UNIQUE REFERENCES public.usuarios(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  apelido TEXT,
  foto TEXT,
  especialidades TEXT[] NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem_exibicao INT NOT NULL DEFAULT 0,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profissionais IS 'Profissionais do estabelecimento. usuario_id é OPCIONAL e UNIQUE (permite profissional sem login).';

CREATE INDEX IF NOT EXISTS idx_profissionais_estabelecimento_ativo ON public.profissionais (estabelecimento_id, ativo);
CREATE INDEX IF NOT EXISTS idx_profissionais_usuario_id ON public.profissionais (usuario_id);

-- ============================================================================
-- TABELA: horarios_funcionamento (por profissional, por dia da semana)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.horarios_funcionamento (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  intervalo_minutos INT NOT NULL DEFAULT 30,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profissional_id, dia_semana)
);

COMMENT ON TABLE public.horarios_funcionamento IS 'Horários de trabalho de cada profissional por dia da semana (0=Dom..6=Sáb).';

CREATE INDEX IF NOT EXISTS idx_horarios_profissional_dia ON public.horarios_funcionamento (profissional_id, dia_semana);

-- ============================================================================
-- TABELA: bloqueios_agenda (períodos indisponíveis por profissional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bloqueios_agenda (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  motivo TEXT,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bloqueios_agenda IS 'Bloqueios de agenda por profissional (férias, folga, manutenção).';

CREATE INDEX IF NOT EXISTS idx_bloqueios_profissional_periodo ON public.bloqueios_agenda (profissional_id, inicio, fim);

-- ============================================================================
-- TABELA: servicos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.servicos (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_centavos INT NOT NULL,
  duracao_min INT NOT NULL,
  tag TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem_exibicao INT NOT NULL DEFAULT 0,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.servicos IS 'Serviços oferecidos pelo estabelecimento. Preço em centavos (INTEGER).';

CREATE INDEX IF NOT EXISTS idx_servicos_estabelecimento_ativo ON public.servicos (estabelecimento_id, ativo);

-- ============================================================================
-- TABELA: servico_midias (fotos/vídeos de exemplo do serviço)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.servico_midias (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  tipo public.tipo_midia NOT NULL,
  src TEXT NOT NULL,
  alt TEXT,
  thumbnail TEXT,
  ordem INT NOT NULL DEFAULT 0,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_servico_midias_servico ON public.servico_midias (servico_id);

-- ============================================================================
-- TABELA: agendamentos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE RESTRICT,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  dia DATE NOT NULL,
  horario TIME NOT NULL,
  duracao_min INT NOT NULL,
  nome_cliente TEXT NOT NULL,
  telefone_cliente TEXT NOT NULL,
  servicos TEXT NOT NULL,
  valor_total_centavos INT NOT NULL,
  status_pagamento public.status_pagamento NOT NULL DEFAULT 'no_local',
  status public.status_agendamento NOT NULL DEFAULT 'agendado',
  servico_ids UUID[] NOT NULL DEFAULT '{}',
  observacoes TEXT,
  avaliacao_estrelas INT CHECK (avaliacao_estrelas BETWEEN 1 AND 5),
  avaliacao_comentario TEXT,
  avaliacao_data TIMESTAMPTZ,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agendamentos IS 'Agendamentos de clientes. profissional_id é FK obrigatória (não apenas estabelecimento).';

-- Índices compostos para queries frequentes
CREATE INDEX IF NOT EXISTS idx_agendamentos_estabelecimento_dia ON public.agendamentos (estabelecimento_id, dia);
CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_dia ON public.agendamentos (profissional_id, dia);
CREATE INDEX IF NOT EXISTS idx_agendamentos_usuario ON public.agendamentos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON public.agendamentos (status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_criacao ON public.agendamentos (data_criacao DESC);
-- Índice parcial de alta velocidade para consultas reais do app (slots disponíveis)
CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_dia_ativo ON public.agendamentos (profissional_id, dia) WHERE status NOT IN ('cancelado', 'nao_compareceu');

-- search_path FIXO para a tabela (resolve "Function Search Path Mutable" no GiST constraint)
ALTER TABLE public.agendamentos SET search_path = pg_catalog, public, extensions, auth;

-- ============================================================================
-- CONSTRAINT ANTI-OVERBOOKING POR PROFISSIONAL (REQUISITO OBRIGATÓRIO #3)
-- GiST com search_path fixo (extensions schema via search_path)
-- ============================================================================

ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_sem_conflito_profissional;

ALTER TABLE public.agendamentos
ADD CONSTRAINT agendamentos_sem_conflito_profissional
EXCLUDE USING gist (
  profissional_id WITH =,
  tsrange(
    (dia + horario),
    (dia + horario) + make_interval(mins => duracao_min),
    '[)'
  ) WITH &&
) WHERE (status NOT IN ('cancelado', 'nao_compareceu'));

COMMENT ON CONSTRAINT agendamentos_sem_conflito_profissional ON public.agendamentos IS
'Constraint anti-overbooking por profissional. Impede agendamentos sobrepostos para o mesmo profissional. Código de erro PostgreSQL: 23P01 (exclusion_violation).';

-- ============================================================================
-- TABELA: item_agendamento (ASSOCIATIVA - REQUISITO OBRIGATÓRIO #2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.item_agendamento (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
  preco_cobrado_centavos INT NOT NULL,
  duracao_min INT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.item_agendamento IS 'Itens do agendamento (múltiplos serviços). Congela preco_cobrado_centavos e duracao_min no momento da reserva para histórico financeiro íntegro.';

CREATE INDEX IF NOT EXISTS idx_item_agendamento_agendamento ON public.item_agendamento (agendamento_id);
CREATE INDEX IF NOT EXISTS idx_item_agendamento_servico ON public.item_agendamento (servico_id);

-- ============================================================================
-- TABELA: galeria (portfolio do estabelecimento)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.galeria (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  src TEXT NOT NULL,
  tipo public.tipo_midia NOT NULL DEFAULT 'imagem',
  ordem INT NOT NULL DEFAULT 0,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_galeria_estabelecimento ON public.galeria (estabelecimento_id);

-- ============================================================================
-- TABELA: avaliacoes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  nome_cliente TEXT NOT NULL,
  estrelas INT NOT NULL CHECK (estrelas BETWEEN 1 AND 5),
  comentario TEXT,
  resposta TEXT,
  resposta_data TIMESTAMPTZ,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.avaliacoes IS 'Avaliações de clientes. nome_cliente armazenado para exibição mesmo se usuario_id for anonimizado (LGPD).';

CREATE INDEX IF NOT EXISTS idx_avaliacoes_estabelecimento ON public.avaliacoes (estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_agendamento ON public.avaliacoes (agendamento_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_usuario ON public.avaliacoes (usuario_id);

-- ============================================================================
-- TABELA: publicacoes (feed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.publicacoes (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  autor_nome TEXT NOT NULL,
  autor_avatar TEXT,
  tipo public.publicacao_tipo NOT NULL,
  legenda TEXT NOT NULL,
  tag_servico TEXT,
  curtidas INT NOT NULL DEFAULT 0,
  salvos INT NOT NULL DEFAULT 0,
  visualizacoes INT NOT NULL DEFAULT 0,
  compartilhamentos INT NOT NULL DEFAULT 0,
  comentarios_count INT NOT NULL DEFAULT 0,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.publicacoes IS 'Publicações no feed (cortes, barbas, combos, inspirações, dicas).';

CREATE INDEX IF NOT EXISTS idx_publicacoes_estabelecimento_data ON public.publicacoes (estabelecimento_id, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_publicacoes_data_criacao ON public.publicacoes (data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_publicacoes_autor_id ON public.publicacoes (autor_id);

-- ============================================================================
-- TABELA: publicacao_midias
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.publicacao_midias (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  publicacao_id UUID NOT NULL REFERENCES public.publicacoes(id) ON DELETE CASCADE,
  tipo public.tipo_midia NOT NULL,
  src TEXT NOT NULL,
  alt TEXT,
  thumbnail TEXT,
  ordem INT NOT NULL DEFAULT 0,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publicacao_midias_publicacao ON public.publicacao_midias (publicacao_id);

-- ============================================================================
-- TABELA: curtidas
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.curtidas (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  publicacao_id UUID NOT NULL REFERENCES public.publicacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (publicacao_id, usuario_id)
);

COMMENT ON TABLE public.curtidas IS 'Curtidas em publicações. UNIQUE evita duplicatas.';

CREATE INDEX IF NOT EXISTS idx_curtidas_publicacao ON public.curtidas (publicacao_id);
CREATE INDEX IF NOT EXISTS idx_curtidas_usuario ON public.curtidas (usuario_id);

-- ============================================================================
-- TABELA: salvos (inspirações salvas pelo usuário)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.salvos (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  publicacao_id UUID NOT NULL REFERENCES public.publicacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (publicacao_id, usuario_id)
);

COMMENT ON TABLE public.salvos IS 'Publicações salvas pelo usuário (inspirações).';

CREATE INDEX IF NOT EXISTS idx_salvos_usuario ON public.salvos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_salvos_publicacao ON public.salvos (publicacao_id);

-- ============================================================================
-- TABELA: comentarios
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comentarios (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  publicacao_id UUID NOT NULL REFERENCES public.publicacoes(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  autor_nome TEXT NOT NULL,
  autor_avatar TEXT,
  texto TEXT NOT NULL,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.comentarios IS 'Comentários em publicações.';

CREATE INDEX IF NOT EXISTS idx_comentarios_publicacao ON public.comentarios (publicacao_id, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_comentarios_autor_id ON public.comentarios (autor_id);

-- ============================================================================
-- TABELA: inspiracaoes (catálogo de inspirações curadas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inspiracaoes (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  titulo TEXT NOT NULL,
  categoria public.inspiracao_categoria NOT NULL,
  descricao TEXT,
  autor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  autor_nome TEXT NOT NULL,
  autor_avatar TEXT,
  curtidas INT NOT NULL DEFAULT 0,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.inspiracaoes IS 'Catálogo de inspirações de cortes/estilos (curado, não feed de usuário).';

CREATE INDEX IF NOT EXISTS idx_inspiracaoes_categoria ON public.inspiracaoes (categoria);
CREATE INDEX IF NOT EXISTS idx_inspiracaoes_autor_id ON public.inspiracaoes (autor_id);

-- ============================================================================
-- TABELA: inspiracao_midias
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inspiracao_midias (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  inspiracao_id UUID NOT NULL REFERENCES public.inspiracaoes(id) ON DELETE CASCADE,
  tipo public.tipo_midia NOT NULL,
  src TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspiracao_midias_inspiracao ON public.inspiracao_midias (inspiracao_id);

-- ============================================================================
-- TABELA: seguidores (relação usuário segue estabelecimento)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.seguidores (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, estabelecimento_id)
);

COMMENT ON TABLE public.seguidores IS 'Relação muitos-para-muitos: usuários seguem estabelecimentos.';

CREATE INDEX IF NOT EXISTS idx_seguidores_usuario ON public.seguidores (usuario_id);
CREATE INDEX IF NOT EXISTS idx_seguidores_estabelecimento ON public.seguidores (estabelecimento_id);

-- ============================================================================
-- TABELA: planos_assinatura (planos SaaS para estabelecimentos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.planos_assinatura (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  nome TEXT NOT NULL,
  tipo public.plano_tipo NOT NULL,
  preco_centavos INT NOT NULL,
  descricao TEXT,
  funcionalidades JSONB NOT NULL DEFAULT '[]',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem_exibicao INT NOT NULL DEFAULT 0,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.planos_assinatura IS 'Planos de assinatura SaaS (Mensal/Diária). Preço em centavos.';

-- ============================================================================
-- TABELA: assinaturas (contrato do estabelecimento com plano)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assinaturas (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  plano_id UUID NOT NULL REFERENCES public.planos_assinatura(id) ON DELETE RESTRICT,
  inicio_contrato DATE NOT NULL,
  vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'vencida', 'cancelada', 'suspensa')),
  desconto_tipo TEXT CHECK (desconto_tipo IN ('percentual', 'valor_fixo')),
  desconto_valor NUMERIC(10,2) DEFAULT 0,
  desconto_motivo TEXT,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice único parcial: permite histórico, mas apenas uma assinatura ativa por estabelecimento.
CREATE UNIQUE INDEX IF NOT EXISTS idx_assinaturas_uma_ativa_por_estabelecimento
  ON public.assinaturas (estabelecimento_id)
  WHERE (status = 'ativa');

COMMENT ON TABLE public.assinaturas IS 'Assinatura ativa do estabelecimento. Apenas uma ativa por estabelecimento (partial unique index).';

CREATE INDEX IF NOT EXISTS idx_assinaturas_estabelecimento ON public.assinaturas (estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_vencimento ON public.assinaturas (vencimento) WHERE (status = 'ativa');
CREATE INDEX IF NOT EXISTS idx_assinaturas_plano_id ON public.assinaturas (plano_id);

-- ============================================================================
-- TABELA: pagamentos (histórico de pagamentos: agendamentos + assinaturas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pagamentos (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  assinatura_id UUID REFERENCES public.assinaturas(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('agendamento', 'assinatura', 'sinal')),
  valor_centavos INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'falhou', 'estornado', 'reembolsado')),
  provedor TEXT,
  provedor_transacao_id TEXT,
  pix_qr_code TEXT,
  pix_copia_cola TEXT,
  pix_expiracao TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  dados_webhook JSONB,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_confirmacao TIMESTAMPTZ
);

COMMENT ON TABLE public.pagamentos IS 'Histórico unificado de pagamentos (agendamentos + assinaturas). idempotency_key garante processamento único. Chave Pix NUNCA exposta ao frontend.';

CREATE INDEX IF NOT EXISTS idx_pagamentos_estabelecimento ON public.pagamentos (estabelecimento_id, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_pagamentos_agendamento ON public.pagamentos (agendamento_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_assinatura ON public.pagamentos (assinatura_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_idempotency ON public.pagamentos (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON public.pagamentos (status);

-- ============================================================================
-- TABELA: notificacoes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  destinatario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo public.tipo_notificacao NOT NULL,
  titulo TEXT NOT NULL,
  texto TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE SET NULL,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  dados_adicionais JSONB,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notificacoes IS 'Notificações do sistema (push, email, WhatsApp). destinatario_id = usuario.id.';

CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario_lida ON public.notificacoes (destinatario_id, lida, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_estabelecimento ON public.notificacoes (estabelecimento_id);

-- ============================================================================
-- TABELA: webhooks_processados (idempotência de webhooks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhooks_processados (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  provedor TEXT NOT NULL,
  evento_id TEXT NOT NULL,
  evento_tipo TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  processado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  resultado TEXT NOT NULL CHECK (resultado IN ('sucesso', 'erro', 'ignorado')),
  erro_mensagem TEXT,
  UNIQUE (provedor, evento_id)
);

COMMENT ON TABLE public.webhooks_processados IS 'Registro de webhooks processados para idempotência. payload_hash + UNIQUE(provedor, evento_id) impedem replay attacks.';

CREATE INDEX IF NOT EXISTS idx_webhooks_provedor_evento ON public.webhooks_processados (provedor, evento_id);

-- ============================================================================
-- TABELA: audit_logs (trilha de auditoria LGPD/SOX)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE SET NULL,
  acao public.audit_acao NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip_address INET,
  user_agent TEXT,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Log de auditoria imutável para LGPD/SOX. Apenas INSERT via service_role (Edge Functions).';

CREATE INDEX IF NOT EXISTS idx_audit_usuario ON public.audit_logs (usuario_id, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_audit_estabelecimento ON public.audit_logs (estabelecimento_id, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entidade ON public.audit_logs (entidade, entidade_id, data_criacao DESC);

-- ============================================================================
-- TRIGGER: updated_at automático (ZERO "Function Search Path Mutable" — search_path FIXO)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, auth
AS $$
BEGIN
  NEW.data_atualizacao = now();
  RETURN NEW;
END $$;

-- Aplicar trigger nas tabelas que têm data_atualizacao
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'usuarios', 'estabelecimentos', 'profissionais', 'horarios_funcionamento',
    'servicos', 'agendamentos', 'planos_assinatura', 'assinaturas'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trigger_%I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trigger_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================================
-- TRIGGER: atualizar contador seguidores (SUBSTITUI v_contagem_seguidores view — ZERO "Security Definer View")
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_atualizar_seguidores_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.estabelecimentos
    SET seguidores = seguidores + 1, data_atualizacao = now()
    WHERE id = NEW.estabelecimento_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.estabelecimentos
    SET seguidores = seguidores - 1, data_atualizacao = now()
    WHERE id = OLD.estabelecimento_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trigger_seguidores_count ON public.seguidores;
CREATE TRIGGER trigger_seguidores_count
AFTER INSERT OR DELETE ON public.seguidores
FOR EACH ROW EXECUTE FUNCTION public.trigger_atualizar_seguidores_count();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — 100% DAS TABELAS
-- ============================================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_funcionamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servico_midias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_agendamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacao_midias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curtidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salvos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspiracaoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspiracao_midias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_assinatura ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks_processados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Coluna configuracao_pix_chave NUNCA exposta via RLS
REVOKE SELECT ON TABLE public.estabelecimentos FROM PUBLIC, anon, authenticated;
REVOKE SELECT (configuracao_pix_chave) ON TABLE public.estabelecimentos FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, slug, nome, responsavel, cidade, nicho, avaliacao, status,
  latitude, longitude, whatsapp, endereco, sobre, tema_cor, tema_layout,
  tema_titulo, tema_subtitulo, tempo_medio_atendimento, horario_funcionamento,
  permite_auto_edicao, configuracao_pix_modo, configuracao_pix_percentual_sinal,
  seguidores, taxa_fidelidade, data_criacao, data_atualizacao
) ON TABLE public.estabelecimentos TO anon, authenticated;
GRANT SELECT ON TABLE public.estabelecimentos TO service_role;

-- ============================================================================
-- FUNÇÕES AUXILIARES PARA RLS (ZERO "Function Search Path Mutable" — search_path FIXO)
-- ZERO "Auth RLS Initialization Plan" — usa (select auth.uid()) em vez de auth.uid()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public, extensions, auth
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = (select auth.uid())
      AND u.papel = 'admin'::public.papel_usuario
  );
$$;

CREATE OR REPLACE FUNCTION public.is_estabelecimento_owner(est_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = (select auth.uid())
      AND (
        u.papel = 'admin'::public.papel_usuario
        OR (u.papel = 'barbeiro'::public.papel_usuario AND u.estabelecimento_id = est_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_profissional_estabelecimento(est_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profissionais p
    WHERE p.usuario_id = (select auth.uid())
      AND p.estabelecimento_id = est_id
      AND p.ativo = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_estabelecimento_owner(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_profissional_estabelecimento(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_estabelecimento_owner(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_profissional_estabelecimento(UUID) TO anon, authenticated, service_role;

-- Impede que um usuário comum altere o próprio papel, vínculo profissional, CPF ou estado de confirmação
CREATE OR REPLACE FUNCTION public.proteger_campos_sensiveis_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, extensions, auth
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR (select auth.role()) = 'service_role'
     OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.papel IS DISTINCT FROM OLD.papel
     OR NEW.estabelecimento_id IS DISTINCT FROM OLD.estabelecimento_id
     OR NEW.cpf IS DISTINCT FROM OLD.cpf
     OR NEW.confirmado IS DISTINCT FROM OLD.confirmado THEN
    RAISE EXCEPTION 'Não é permitido alterar campos protegidos do perfil.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_proteger_campos_usuario ON public.usuarios;
CREATE TRIGGER trigger_proteger_campos_usuario
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_sensiveis_usuario();

-- Somente administradores/servidor podem alterar o status de aprovação do estabelecimento.
CREATE OR REPLACE FUNCTION public.proteger_status_estabelecimento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, extensions, auth
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
     AND COALESCE((select auth.role()), '') <> 'service_role'
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente um administrador pode alterar o status do estabelecimento.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_proteger_status_estabelecimento ON public.estabelecimentos;
CREATE TRIGGER trigger_proteger_status_estabelecimento
BEFORE UPDATE ON public.estabelecimentos
FOR EACH ROW EXECUTE FUNCTION public.proteger_status_estabelecimento();

-- ============================================================================
-- POLÍTICAS RLS — 1 POLÍTICA POR AÇÃO (SELECT, INSERT, UPDATE, DELETE) POR TABELA
-- ZERO "Multiple Permissive Policies" — FOR ALL ELIMINADO
-- ZERO "Auth RLS Initialization Plan" — usa (select auth.uid()) em todas as chamadas
-- ============================================================================

-- ----------------------------------------------------------
-- usuarios
-- ----------------------------------------------------------
DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
CREATE POLICY usuarios_select ON public.usuarios
  FOR SELECT USING (id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS usuarios_insert ON public.usuarios;
CREATE POLICY usuarios_insert ON public.usuarios
  FOR INSERT WITH CHECK (id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS usuarios_update ON public.usuarios;
CREATE POLICY usuarios_update ON public.usuarios
  FOR UPDATE USING (id = (select auth.uid()) OR public.is_admin())
  WITH CHECK (id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS usuarios_delete ON public.usuarios;
CREATE POLICY usuarios_delete ON public.usuarios
  FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------
-- estabelecimentos
-- ----------------------------------------------------------
DROP POLICY IF EXISTS estabelecimentos_select ON public.estabelecimentos;
CREATE POLICY estabelecimentos_select ON public.estabelecimentos
  FOR SELECT USING (
    status = 'aprovado'
    OR public.is_estabelecimento_owner(id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS estabelecimentos_insert ON public.estabelecimentos;
CREATE POLICY estabelecimentos_insert ON public.estabelecimentos
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS estabelecimentos_update ON public.estabelecimentos;
CREATE POLICY estabelecimentos_update ON public.estabelecimentos
  FOR UPDATE USING (public.is_estabelecimento_owner(id) OR public.is_admin())
  WITH CHECK (public.is_estabelecimento_owner(id) OR public.is_admin());

DROP POLICY IF EXISTS estabelecimentos_delete ON public.estabelecimentos;
CREATE POLICY estabelecimentos_delete ON public.estabelecimentos
  FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------
-- profissionais
-- ----------------------------------------------------------
DROP POLICY IF EXISTS profissionais_select ON public.profissionais;
CREATE POLICY profissionais_select ON public.profissionais
  FOR SELECT USING (
    ativo = true
    AND EXISTS (
      SELECT 1 FROM public.estabelecimentos e
      WHERE e.id = estabelecimento_id AND e.status = 'aprovado'
    )
    OR EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissionais.id
        AND p.usuario_id = (select auth.uid())
    )
    OR public.is_estabelecimento_owner(estabelecimento_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS profissionais_insert ON public.profissionais;
CREATE POLICY profissionais_insert ON public.profissionais
  FOR INSERT WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

DROP POLICY IF EXISTS profissionais_update ON public.profissionais;
CREATE POLICY profissionais_update ON public.profissionais
  FOR UPDATE USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin())
  WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

DROP POLICY IF EXISTS profissionais_delete ON public.profissionais;
CREATE POLICY profissionais_delete ON public.profissionais
  FOR DELETE USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

-- ----------------------------------------------------------
-- horarios_funcionamento
-- ----------------------------------------------------------
DROP POLICY IF EXISTS horarios_select ON public.horarios_funcionamento;
CREATE POLICY horarios_select ON public.horarios_funcionamento
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profissionais p
      JOIN public.estabelecimentos e ON e.id = p.estabelecimento_id
      WHERE p.id = profissional_id
        AND p.ativo = true
        AND e.status = 'aprovado'
    )
    OR EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS horarios_insert ON public.horarios_funcionamento;
CREATE POLICY horarios_insert ON public.horarios_funcionamento
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS horarios_update ON public.horarios_funcionamento;
CREATE POLICY horarios_update ON public.horarios_funcionamento
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS horarios_delete ON public.horarios_funcionamento;
CREATE POLICY horarios_delete ON public.horarios_funcionamento
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  );

-- ----------------------------------------------------------
-- bloqueios_agenda
-- ----------------------------------------------------------
DROP POLICY IF EXISTS bloqueios_select ON public.bloqueios_agenda;
CREATE POLICY bloqueios_select ON public.bloqueios_agenda
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS bloqueios_insert ON public.bloqueios_agenda;
CREATE POLICY bloqueios_insert ON public.bloqueios_agenda
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS bloqueios_update ON public.bloqueios_agenda;
CREATE POLICY bloqueios_update ON public.bloqueios_agenda
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS bloqueios_delete ON public.bloqueios_agenda;
CREATE POLICY bloqueios_delete ON public.bloqueios_agenda
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  );

-- ----------------------------------------------------------
-- servicos
-- ----------------------------------------------------------
DROP POLICY IF EXISTS servicos_select ON public.servicos;
CREATE POLICY servicos_select ON public.servicos
  FOR SELECT USING (
    ativo = true
    AND EXISTS (
      SELECT 1 FROM public.estabelecimentos e
      WHERE e.id = estabelecimento_id AND e.status = 'aprovado'
    )
    OR public.is_estabelecimento_owner(estabelecimento_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS servicos_insert ON public.servicos;
CREATE POLICY servicos_insert ON public.servicos
  FOR INSERT WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

DROP POLICY IF EXISTS servicos_update ON public.servicos;
CREATE POLICY servicos_update ON public.servicos
  FOR UPDATE USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin())
  WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

DROP POLICY IF EXISTS servicos_delete ON public.servicos;
CREATE POLICY servicos_delete ON public.servicos
  FOR DELETE USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

-- ----------------------------------------------------------
-- servico_midias
-- ----------------------------------------------------------
DROP POLICY IF EXISTS servico_midias_select ON public.servico_midias;
CREATE POLICY servico_midias_select ON public.servico_midias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.servicos s
      JOIN public.estabelecimentos e ON e.id = s.estabelecimento_id
      WHERE s.id = servico_id AND s.ativo = true AND e.status = 'aprovado'
    )
    OR EXISTS (
      SELECT 1 FROM public.servicos s
      WHERE s.id = servico_id
        AND (public.is_estabelecimento_owner(s.estabelecimento_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS servico_midias_insert ON public.servico_midias;
CREATE POLICY servico_midias_insert ON public.servico_midias
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.servicos s
      WHERE s.id = servico_id
        AND (public.is_estabelecimento_owner(s.estabelecimento_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS servico_midias_update ON public.servico_midias;
CREATE POLICY servico_midias_update ON public.servico_midias
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.servicos s
      WHERE s.id = servico_id
        AND (public.is_estabelecimento_owner(s.estabelecimento_id) OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.servicos s
      WHERE s.id = servico_id
        AND (public.is_estabelecimento_owner(s.estabelecimento_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS servico_midias_delete ON public.servico_midias;
CREATE POLICY servico_midias_delete ON public.servico_midias
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.servicos s
      WHERE s.id = servico_id
        AND (public.is_estabelecimento_owner(s.estabelecimento_id) OR public.is_admin())
    )
  );

-- ----------------------------------------------------------
-- agendamentos
-- ----------------------------------------------------------
DROP POLICY IF EXISTS agendamentos_select ON public.agendamentos;
CREATE POLICY agendamentos_select ON public.agendamentos
  FOR SELECT USING (
    usuario_id = (select auth.uid())
    OR (usuario_id IS NULL AND telefone_cliente IN (
      SELECT whatsapp FROM public.usuarios WHERE id = (select auth.uid())
    ))
    OR EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id
        AND p.usuario_id = (select auth.uid())
    )
    OR public.is_estabelecimento_owner(estabelecimento_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS agendamentos_insert ON public.agendamentos;
CREATE POLICY agendamentos_insert ON public.agendamentos
  FOR INSERT WITH CHECK (false); -- Apenas service_role (Edge Functions) cria agendamentos via RPC

DROP POLICY IF EXISTS agendamentos_update ON public.agendamentos;
CREATE POLICY agendamentos_update ON public.agendamentos
  FOR UPDATE USING (
    public.is_estabelecimento_owner(estabelecimento_id)
    OR EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id AND p.usuario_id = (select auth.uid())
    )
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_estabelecimento_owner(estabelecimento_id)
    OR EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id AND p.usuario_id = (select auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS agendamentos_delete ON public.agendamentos;
CREATE POLICY agendamentos_delete ON public.agendamentos
  FOR DELETE USING (
    public.is_estabelecimento_owner(estabelecimento_id)
    OR public.is_admin()
  );

-- ----------------------------------------------------------
-- item_agendamento
-- ----------------------------------------------------------
DROP POLICY IF EXISTS item_agendamento_select ON public.item_agendamento;
CREATE POLICY item_agendamento_select ON public.item_agendamento
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.id = agendamento_id
        AND (
          a.usuario_id = (select auth.uid())
          OR public.is_estabelecimento_owner(a.estabelecimento_id)
          OR EXISTS (
            SELECT 1 FROM public.profissionais p
            WHERE p.id = a.profissional_id AND p.usuario_id = (select auth.uid())
          )
          OR public.is_admin()
        )
    )
  );

DROP POLICY IF EXISTS item_agendamento_insert ON public.item_agendamento;
CREATE POLICY item_agendamento_insert ON public.item_agendamento
  FOR INSERT WITH CHECK (false); -- Apenas service_role (Edge Functions) insere

DROP POLICY IF EXISTS item_agendamento_update ON public.item_agendamento;
CREATE POLICY item_agendamento_update ON public.item_agendamento
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS item_agendamento_delete ON public.item_agendamento;
CREATE POLICY item_agendamento_delete ON public.item_agendamento
  FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------
-- galeria
-- ----------------------------------------------------------
DROP POLICY IF EXISTS galeria_select ON public.galeria;
CREATE POLICY galeria_select ON public.galeria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.estabelecimentos e
      WHERE e.id = estabelecimento_id AND e.status = 'aprovado'
    )
    OR public.is_estabelecimento_owner(estabelecimento_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS galeria_insert ON public.galeria;
CREATE POLICY galeria_insert ON public.galeria
  FOR INSERT WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

DROP POLICY IF EXISTS galeria_update ON public.galeria;
CREATE POLICY galeria_update ON public.galeria
  FOR UPDATE USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin())
  WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

DROP POLICY IF EXISTS galeria_delete ON public.galeria;
CREATE POLICY galeria_delete ON public.galeria
  FOR DELETE USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

-- ----------------------------------------------------------
-- avaliacoes
-- ----------------------------------------------------------
DROP POLICY IF EXISTS avaliacoes_select ON public.avaliacoes;
CREATE POLICY avaliacoes_select ON public.avaliacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.estabelecimentos e
      WHERE e.id = estabelecimento_id AND e.status = 'aprovado'
    )
    OR public.is_estabelecimento_owner(estabelecimento_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS avaliacoes_insert ON public.avaliacoes;
CREATE POLICY avaliacoes_insert ON public.avaliacoes
  FOR INSERT WITH CHECK (
    usuario_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.id = agendamento_id
        AND a.usuario_id = (select auth.uid())
        AND a.status = 'concluido'
        AND a.avaliacao_estrelas IS NULL
    )
  );

DROP POLICY IF EXISTS avaliacoes_update ON public.avaliacoes;
CREATE POLICY avaliacoes_update ON public.avaliacoes
  FOR UPDATE USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin())
  WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

DROP POLICY IF EXISTS avaliacoes_delete ON public.avaliacoes;
CREATE POLICY avaliacoes_delete ON public.avaliacoes
  FOR DELETE USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

-- ----------------------------------------------------------
-- publicacoes (feed)
-- ----------------------------------------------------------
DROP POLICY IF EXISTS publicacoes_select ON public.publicacoes;
CREATE POLICY publicacoes_select ON public.publicacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.estabelecimentos e
      WHERE e.id = estabelecimento_id AND e.status = 'aprovado'
    )
    OR public.is_estabelecimento_owner(estabelecimento_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS publicacoes_insert ON public.publicacoes;
CREATE POLICY publicacoes_insert ON public.publicacoes
  FOR INSERT WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

DROP POLICY IF EXISTS publicacoes_update ON public.publicacoes;
CREATE POLICY publicacoes_update ON public.publicacoes
  FOR UPDATE USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin())
  WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

DROP POLICY IF EXISTS publicacoes_delete ON public.publicacoes;
CREATE POLICY publicacoes_delete ON public.publicacoes
  FOR DELETE USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

-- ----------------------------------------------------------
-- publicacao_midias
-- ----------------------------------------------------------
DROP POLICY IF EXISTS publicacao_midias_select ON public.publicacao_midias;
CREATE POLICY publicacao_midias_select ON public.publicacao_midias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.publicacoes p
      JOIN public.estabelecimentos e ON e.id = p.estabelecimento_id
      WHERE p.id = publicacao_id AND e.status = 'aprovado'
    )
    OR EXISTS (
      SELECT 1 FROM public.publicacoes p
      WHERE p.id = publicacao_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS publicacao_midias_insert ON public.publicacao_midias;
CREATE POLICY publicacao_midias_insert ON public.publicacao_midias
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.publicacoes p
      WHERE p.id = publicacao_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS publicacao_midias_update ON public.publicacao_midias;
CREATE POLICY publicacao_midias_update ON public.publicacao_midias
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.publicacoes p
      WHERE p.id = publicacao_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.publicacoes p
      WHERE p.id = publicacao_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS publicacao_midias_delete ON public.publicacao_midias;
CREATE POLICY publicacao_midias_delete ON public.publicacao_midias
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.publicacoes p
      WHERE p.id = publicacao_id
        AND (public.is_estabelecimento_owner(p.estabelecimento_id) OR public.is_admin())
    )
  );

-- ----------------------------------------------------------
-- curtidas
-- ----------------------------------------------------------
DROP POLICY IF EXISTS curtidas_select ON public.curtidas;
CREATE POLICY curtidas_select ON public.curtidas
  FOR SELECT USING (usuario_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS curtidas_insert ON public.curtidas;
CREATE POLICY curtidas_insert ON public.curtidas
  FOR INSERT WITH CHECK (usuario_id = (select auth.uid()));

DROP POLICY IF EXISTS curtidas_update ON public.curtidas;
CREATE POLICY curtidas_update ON public.curtidas
  FOR UPDATE USING (usuario_id = (select auth.uid()) OR public.is_admin())
  WITH CHECK (usuario_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS curtidas_delete ON public.curtidas;
CREATE POLICY curtidas_delete ON public.curtidas
  FOR DELETE USING (usuario_id = (select auth.uid()) OR public.is_admin());

-- ----------------------------------------------------------
-- salvos
-- ----------------------------------------------------------
DROP POLICY IF EXISTS salvos_select ON public.salvos;
CREATE POLICY salvos_select ON public.salvos
  FOR SELECT USING (usuario_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS salvos_insert ON public.salvos;
CREATE POLICY salvos_insert ON public.salvos
  FOR INSERT WITH CHECK (usuario_id = (select auth.uid()));

DROP POLICY IF EXISTS salvos_update ON public.salvos;
CREATE POLICY salvos_update ON public.salvos
  FOR UPDATE USING (usuario_id = (select auth.uid()) OR public.is_admin())
  WITH CHECK (usuario_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS salvos_delete ON public.salvos;
CREATE POLICY salvos_delete ON public.salvos
  FOR DELETE USING (usuario_id = (select auth.uid()) OR public.is_admin());

-- ----------------------------------------------------------
-- comentarios
-- ----------------------------------------------------------
DROP POLICY IF EXISTS comentarios_select ON public.comentarios;
CREATE POLICY comentarios_select ON public.comentarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.publicacoes p
      JOIN public.estabelecimentos e ON e.id = p.estabelecimento_id
      WHERE p.id = publicacao_id AND e.status = 'aprovado'
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS comentarios_insert ON public.comentarios;
CREATE POLICY comentarios_insert ON public.comentarios
  FOR INSERT WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND autor_id = (select auth.uid())
  );

DROP POLICY IF EXISTS comentarios_update ON public.comentarios;
CREATE POLICY comentarios_update ON public.comentarios
  FOR UPDATE USING (autor_id = (select auth.uid()) OR public.is_admin())
  WITH CHECK (autor_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS comentarios_delete ON public.comentarios;
CREATE POLICY comentarios_delete ON public.comentarios
  FOR DELETE USING (autor_id = (select auth.uid()) OR public.is_admin());

-- ----------------------------------------------------------
-- inspiracaoes
-- ----------------------------------------------------------
DROP POLICY IF EXISTS inspiracaoes_select ON public.inspiracaoes;
CREATE POLICY inspiracaoes_select ON public.inspiracaoes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS inspiracaoes_insert ON public.inspiracaoes;
CREATE POLICY inspiracaoes_insert ON public.inspiracaoes
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS inspiracaoes_update ON public.inspiracaoes;
CREATE POLICY inspiracaoes_update ON public.inspiracaoes
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS inspiracaoes_delete ON public.inspiracaoes;
CREATE POLICY inspiracaoes_delete ON public.inspiracaoes
  FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------
-- inspiracao_midias
-- ----------------------------------------------------------
DROP POLICY IF EXISTS inspiracao_midias_select ON public.inspiracao_midias;
CREATE POLICY inspiracao_midias_select ON public.inspiracao_midias
  FOR SELECT USING (true);

DROP POLICY IF EXISTS inspiracao_midias_insert ON public.inspiracao_midias;
CREATE POLICY inspiracao_midias_insert ON public.inspiracao_midias
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS inspiracao_midias_update ON public.inspiracao_midias;
CREATE POLICY inspiracao_midias_update ON public.inspiracao_midias
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS inspiracao_midias_delete ON public.inspiracao_midias;
CREATE POLICY inspiracao_midias_delete ON public.inspiracao_midias
  FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------
-- seguidores
-- ----------------------------------------------------------
DROP POLICY IF EXISTS seguidores_select ON public.seguidores;
CREATE POLICY seguidores_select ON public.seguidores
  FOR SELECT USING (usuario_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS seguidores_insert ON public.seguidores;
CREATE POLICY seguidores_insert ON public.seguidores
  FOR INSERT WITH CHECK (usuario_id = (select auth.uid()));

DROP POLICY IF EXISTS seguidores_update ON public.seguidores;
CREATE POLICY seguidores_update ON public.seguidores
  FOR UPDATE USING (usuario_id = (select auth.uid()) OR public.is_admin())
  WITH CHECK (usuario_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS seguidores_delete ON public.seguidores;
CREATE POLICY seguidores_delete ON public.seguidores
  FOR DELETE USING (usuario_id = (select auth.uid()) OR public.is_admin());

-- ----------------------------------------------------------
-- planos_assinatura
-- ----------------------------------------------------------
DROP POLICY IF EXISTS planos_select ON public.planos_assinatura;
CREATE POLICY planos_select ON public.planos_assinatura
  FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS planos_insert ON public.planos_assinatura;
CREATE POLICY planos_insert ON public.planos_assinatura
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS planos_update ON public.planos_assinatura;
CREATE POLICY planos_update ON public.planos_assinatura
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS planos_delete ON public.planos_assinatura;
CREATE POLICY planos_delete ON public.planos_assinatura
  FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------
-- assinaturas
-- ----------------------------------------------------------
DROP POLICY IF EXISTS assinaturas_select ON public.assinaturas;
CREATE POLICY assinaturas_select ON public.assinaturas
  FOR SELECT USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

DROP POLICY IF EXISTS assinaturas_insert ON public.assinaturas;
CREATE POLICY assinaturas_insert ON public.assinaturas
  FOR INSERT WITH CHECK (false); -- Apenas service_role (Edge Functions)

DROP POLICY IF EXISTS assinaturas_update ON public.assinaturas;
CREATE POLICY assinaturas_update ON public.assinaturas
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS assinaturas_delete ON public.assinaturas;
CREATE POLICY assinaturas_delete ON public.assinaturas
  FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------
-- pagamentos (SENSÍVEL)
-- ----------------------------------------------------------
DROP POLICY IF EXISTS pagamentos_select ON public.pagamentos;
CREATE POLICY pagamentos_select ON public.pagamentos
  FOR SELECT USING (
    public.is_estabelecimento_owner(estabelecimento_id)
    OR (
      agendamento_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.agendamentos a
        WHERE a.id = agendamento_id AND a.usuario_id = (select auth.uid())
      )
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS pagamentos_insert ON public.pagamentos;
CREATE POLICY pagamentos_insert ON public.pagamentos
  FOR INSERT WITH CHECK (false); -- Apenas service_role (Edge Functions)

DROP POLICY IF EXISTS pagamentos_update ON public.pagamentos;
CREATE POLICY pagamentos_update ON public.pagamentos
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS pagamentos_delete ON public.pagamentos;
CREATE POLICY pagamentos_delete ON public.pagamentos
  FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------
-- notificacoes (SENSÍVEL)
-- ----------------------------------------------------------
DROP POLICY IF EXISTS notificacoes_select ON public.notificacoes;
CREATE POLICY notificacoes_select ON public.notificacoes
  FOR SELECT USING (destinatario_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS notificacoes_insert ON public.notificacoes;
CREATE POLICY notificacoes_insert ON public.notificacoes
  FOR INSERT WITH CHECK (false); -- Apenas service_role (Edge Functions)

DROP POLICY IF EXISTS notificacoes_update ON public.notificacoes;
CREATE POLICY notificacoes_update ON public.notificacoes
  FOR UPDATE USING (destinatario_id = (select auth.uid()) OR public.is_admin())
  WITH CHECK (destinatario_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS notificacoes_delete ON public.notificacoes;
CREATE POLICY notificacoes_delete ON public.notificacoes
  FOR DELETE USING (destinatario_id = (select auth.uid()) OR public.is_admin());

-- ----------------------------------------------------------
-- webhooks_processados (APENAS SERVICE_ROLE/ADMIN)
-- ----------------------------------------------------------
DROP POLICY IF EXISTS webhooks_select ON public.webhooks_processados;
CREATE POLICY webhooks_select ON public.webhooks_processados
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS webhooks_insert ON public.webhooks_processados;
CREATE POLICY webhooks_insert ON public.webhooks_processados
  FOR INSERT WITH CHECK (false); -- Apenas service_role (Edge Functions)

DROP POLICY IF EXISTS webhooks_update ON public.webhooks_processados;
CREATE POLICY webhooks_update ON public.webhooks_processados
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS webhooks_delete ON public.webhooks_processados;
CREATE POLICY webhooks_delete ON public.webhooks_processados
  FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------
-- audit_logs (APENAS ADMIN/SERVICE_ROLE - IMUTÁVEL)
-- ----------------------------------------------------------
DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT USING (public.is_admin());

-- Apenas service_role (Edge Functions) insere — NÃO HÁ INSERT/UPDATE/DELETE policies

-- ============================================================================
-- VIEWS (ZERO "Security Definer View" — todas usam security_invoker = true)
-- ============================================================================

-- View pública com projeção explícita: nunca inclui configuracao_pix_chave.
-- security_invoker mantém as políticas RLS aplicáveis às demais tabelas consultadas.
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
  (SELECT COUNT(*) FROM public.servicos sv
   WHERE sv.estabelecimento_id = e.id AND sv.ativo = true) AS servicos_count,
  (SELECT COUNT(*) FROM public.profissionais pr
   WHERE pr.estabelecimento_id = e.id AND pr.ativo = true) AS profissionais_count,
  e.taxa_fidelidade,
  e.data_criacao,
  e.data_atualizacao
FROM public.estabelecimentos e
WHERE e.status = 'aprovado';

GRANT SELECT ON public.v_estabelecimentos_publicos TO anon, authenticated, service_role;

-- View de dados detalhados respeita RLS das tabelas-base e não contorna permissões.
DROP VIEW IF EXISTS public.v_agendamentos_detalhados;
CREATE VIEW public.v_agendamentos_detalhados
WITH (security_invoker = true)
AS
SELECT
  a.*,
  e.nome AS estabelecimento_nome,
  e.slug AS estabelecimento_slug,
  p.nome AS profissional_nome,
  p.apelido AS profissional_apelido,
  u.nome AS cliente_nome,
  u.email AS cliente_email
FROM public.agendamentos a
JOIN public.estabelecimentos e ON e.id = a.estabelecimento_id
JOIN public.profissionais p ON p.id = a.profissional_id
LEFT JOIN public.usuarios u ON u.id = a.usuario_id;

GRANT SELECT ON public.v_agendamentos_detalhados TO authenticated, service_role;

-- ============================================================================
-- RPC FUNCTIONS (ZERO "Function Search Path Mutable" — todas com search_path FIXO)
-- ============================================================================

-- RPC: Obter slots disponíveis por profissional/dia.
CREATE OR REPLACE FUNCTION public.rpc_slots_disponiveis(
  p_profissional_id UUID,
  p_dia DATE,
  p_duracao_min INT DEFAULT 30
)
RETURNS TABLE (
  horario TIME,
  disponivel BOOLEAN,
  profissional_nome TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, auth
AS $$
DECLARE
  v_inicio TIME;
  v_fim TIME;
  v_intervalo INT;
  v_slot TIMESTAMP WITHOUT TIME ZONE;
  v_nome TEXT;
  v_ocupado BOOLEAN;
  v_bloqueado BOOLEAN;
  v_passado BOOLEAN;
  v_inicio_ts TIMESTAMPTZ;
  v_fim_ts TIMESTAMPTZ;
BEGIN
  IF p_profissional_id IS NULL OR p_dia IS NULL
     OR p_duracao_min IS NULL OR p_duracao_min <= 0 THEN
    RAISE EXCEPTION 'Parâmetros inválidos para consulta de disponibilidade.'
      USING ERRCODE = '22023';
  END IF;

  SELECT hf.hora_inicio, hf.hora_fim, hf.intervalo_minutos, pr.nome
  INTO v_inicio, v_fim, v_intervalo, v_nome
  FROM public.horarios_funcionamento hf
  JOIN public.profissionais pr ON pr.id = hf.profissional_id
  JOIN public.estabelecimentos e ON e.id = pr.estabelecimento_id
  WHERE hf.profissional_id = p_profissional_id
    AND hf.dia_semana = EXTRACT(DOW FROM p_dia)::INT
    AND hf.ativo = true
    AND pr.ativo = true
    AND e.status = 'aprovado'
  LIMIT 1;

  IF NOT FOUND OR v_intervalo IS NULL OR v_intervalo <= 0
     OR v_fim <= v_inicio THEN
    RETURN;
  END IF;

  v_slot := p_dia + v_inicio;
  WHILE (v_slot + make_interval(mins => p_duracao_min)) <= (p_dia + v_fim) LOOP
    v_inicio_ts := v_slot AT TIME ZONE 'UTC';
    v_fim_ts := (v_slot + make_interval(mins => p_duracao_min)) AT TIME ZONE 'UTC';

    SELECT EXISTS (
      SELECT 1
      FROM public.agendamentos a
      WHERE a.profissional_id = p_profissional_id
        AND a.status NOT IN ('cancelado', 'nao_compareceu')
        AND tstzrange(
          (a.dia + a.horario) AT TIME ZONE 'UTC',
          (a.dia + a.horario + make_interval(mins => a.duracao_min)) AT TIME ZONE 'UTC',
          '[)'
        ) && tstzrange(v_inicio_ts, v_fim_ts, '[)')
    ) INTO v_ocupado;

    SELECT EXISTS (
      SELECT 1
      FROM public.bloqueios_agenda b
      WHERE b.profissional_id = p_profissional_id
        AND b.inicio < v_fim_ts
        AND b.fim > v_inicio_ts
    ) INTO v_bloqueado;

    v_passado := v_inicio_ts < now();

    RETURN QUERY
      SELECT v_slot::TIME, (NOT v_ocupado AND NOT v_bloqueado AND NOT v_passado), v_nome;

    v_slot := v_slot + make_interval(mins => v_intervalo);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_slots_disponiveis(UUID, DATE, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_slots_disponiveis(UUID, DATE, INT) TO anon, authenticated, service_role;

-- RPC: Criar agendamento com transação atômica (uso exclusivo da Edge Function/service_role).
CREATE OR REPLACE FUNCTION public.rpc_criar_agendamento(
  p_estabelecimento_id UUID,
  p_profissional_id UUID,
  p_usuario_id UUID,
  p_dia DATE,
  p_horario TIME,
  p_duracao_min INT,
  p_nome_cliente TEXT,
  p_telefone_cliente TEXT,
  p_servico_ids UUID[],
  p_valor_total_centavos INT,
  p_status_pagamento public.status_pagamento DEFAULT 'no_local',
  p_observacoes TEXT DEFAULT NULL
)
RETURNS TABLE (
  agendamento_id UUID,
  erro TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, auth
AS $$
DECLARE
  v_agendamento_id UUID;
  v_servicos TEXT;
  v_servico RECORD;
  v_qtd_servicos BIGINT;
  v_duracao_servicos BIGINT;
BEGIN
  IF p_estabelecimento_id IS NULL OR p_profissional_id IS NULL
     OR p_dia IS NULL OR p_horario IS NULL
     OR p_duracao_min IS NULL OR p_duracao_min <= 0
     OR p_valor_total_centavos IS NULL OR p_valor_total_centavos < 0
     OR p_status_pagamento IS NULL
     OR NULLIF(BTRIM(p_nome_cliente), '') IS NULL
     OR NULLIF(BTRIM(p_telefone_cliente), '') IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'Dados obrigatórios do agendamento inválidos'::TEXT;
    RETURN;
  END IF;

  IF p_servico_ids IS NULL OR cardinality(p_servico_ids) = 0 THEN
    RETURN QUERY SELECT NULL::UUID, 'Selecione ao menos um serviço'::TEXT;
    RETURN;
  END IF;

  IF cardinality(p_servico_ids) <> (
    SELECT COUNT(DISTINCT item.servico_id)::INT
    FROM unnest(p_servico_ids) AS item(servico_id)
  ) THEN
    RETURN QUERY SELECT NULL::UUID, 'A lista contém serviços duplicados'::TEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profissionais pr
    JOIN public.estabelecimentos e ON e.id = pr.estabelecimento_id
    WHERE pr.id = p_profissional_id
      AND pr.estabelecimento_id = p_estabelecimento_id
      AND pr.ativo = true
      AND e.status = 'aprovado'
  ) THEN
    RETURN QUERY SELECT NULL::UUID, 'Profissional inválido, inativo ou estabelecimento não aprovado'::TEXT;
    RETURN;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(s.duracao_min), 0), STRING_AGG(s.nome, ' + ' ORDER BY selected.ordem)
  INTO v_qtd_servicos, v_duracao_servicos, v_servicos
  FROM unnest(p_servico_ids) WITH ORDINALITY AS selected(servico_id, ordem)
  JOIN public.servicos s ON s.id = selected.servico_id
  WHERE s.estabelecimento_id = p_estabelecimento_id
    AND s.ativo = true;

  IF v_qtd_servicos <> cardinality(p_servico_ids) THEN
    RETURN QUERY SELECT NULL::UUID, 'Um ou mais serviços são inválidos, inativos ou pertencem a outro estabelecimento'::TEXT;
    RETURN;
  END IF;

  IF v_duracao_servicos <> p_duracao_min THEN
    RETURN QUERY SELECT NULL::UUID, 'A duração informada não corresponde à soma das durações dos serviços'::TEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.horarios_funcionamento hf
    WHERE hf.profissional_id = p_profissional_id
      AND hf.dia_semana = EXTRACT(DOW FROM p_dia)::INT
      AND hf.ativo = true
      AND (p_dia + p_horario) >= (p_dia + hf.hora_inicio)
      AND (p_dia + p_horario + make_interval(mins => p_duracao_min)) <= (p_dia + hf.hora_fim)
  ) THEN
    RETURN QUERY SELECT NULL::UUID, 'Horário fora do expediente do profissional'::TEXT;
    RETURN;
  END IF;

  IF ((p_dia + p_horario) AT TIME ZONE 'UTC') < now() THEN
    RETURN QUERY SELECT NULL::UUID, 'Não é possível criar agendamento no passado'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bloqueios_agenda b
    WHERE b.profissional_id = p_profissional_id
      AND b.inicio < ((p_dia + p_horario + make_interval(mins => p_duracao_min)) AT TIME ZONE 'UTC')
      AND b.fim > ((p_dia + p_horario) AT TIME ZONE 'UTC')
  ) THEN
    RETURN QUERY SELECT NULL::UUID, 'Horário bloqueado para esse profissional'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.agendamentos (
    estabelecimento_id, profissional_id, usuario_id, dia, horario, duracao_min,
    nome_cliente, telefone_cliente, servicos, valor_total_centavos,
    status_pagamento, status, servico_ids, observacoes
  ) VALUES (
    p_estabelecimento_id, p_profissional_id, p_usuario_id, p_dia, p_horario, p_duracao_min,
    BTRIM(p_nome_cliente), BTRIM(p_telefone_cliente), v_servicos, p_valor_total_centavos,
    p_status_pagamento, 'agendado', p_servico_ids, p_observacoes
  ) RETURNING id INTO v_agendamento_id;

  FOR v_servico IN
    SELECT s.id, s.preco_centavos, s.duracao_min, selected.ordem
    FROM unnest(p_servico_ids) WITH ORDINALITY AS selected(servico_id, ordem)
    JOIN public.servicos s ON s.id = selected.servico_id
    WHERE s.estabelecimento_id = p_estabelecimento_id
      AND s.ativo = true
    ORDER BY selected.ordem
  LOOP
    INSERT INTO public.item_agendamento (
      agendamento_id, servico_id, preco_cobrado_centavos, duracao_min, ordem
    ) VALUES (
      v_agendamento_id, v_servico.id, v_servico.preco_centavos,
      v_servico.duracao_min, (v_servico.ordem - 1)::INT
    );
  END LOOP;

  RETURN QUERY SELECT v_agendamento_id, NULL::TEXT;
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN QUERY SELECT NULL::UUID, 'CONFLITO_HORARIO: Esse horário já foi ocupado por outro agendamento'::TEXT;
  WHEN unique_violation THEN
    RETURN QUERY SELECT NULL::UUID, 'Erro de duplicidade'::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::UUID, SQLERRM::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_criar_agendamento(UUID, UUID, UUID, DATE, TIME, INT, TEXT, TEXT, UUID[], INT, public.status_pagamento, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_criar_agendamento(UUID, UUID, UUID, DATE, TIME, INT, TEXT, TEXT, UUID[], INT, public.status_pagamento, TEXT) TO service_role;

-- RPC: Anonimizar dados do usuário nas tabelas públicas (parte do fluxo LGPD).
CREATE OR REPLACE FUNCTION public.rpc_anonimizar_usuario(p_usuario_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, auth
AS $$
DECLARE
  v_hash TEXT := md5(p_usuario_id::TEXT || clock_timestamp()::TEXT);
  v_novo_nome TEXT := 'Usuário Anonimizado ' || substr(v_hash, 1, 8);
  v_novo_email TEXT := 'anon-' || substr(v_hash, 1, 12) || '@corte-rapido.local';
BEGIN
  IF p_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Informe o usuário que será anonimizado.' USING ERRCODE = '22023';
  END IF;

  IF COALESCE((select auth.role()), '') <> 'service_role'
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente administradores ou a Edge Function (service_role) podem anonimizar usuários.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.usuarios SET
    nome = v_novo_nome,
    email = v_novo_email,
    whatsapp = NULL,
    cidade = NULL,
    avatar = NULL,
    cpf = NULL,
    bio = NULL,
    seguindo = '{}',
    inspiracao_salvas = '{}',
    data_atualizacao = now()
  WHERE id = p_usuario_id;

  UPDATE public.agendamentos SET
    nome_cliente = v_novo_nome,
    telefone_cliente = '(00) 00000-0000',
    observacoes = NULL,
    avaliacao_comentario = NULL
  WHERE usuario_id = p_usuario_id;

  UPDATE public.avaliacoes SET
    nome_cliente = v_novo_nome,
    comentario = '[anonimizado]'
  WHERE usuario_id = p_usuario_id;

  UPDATE public.publicacoes SET
    autor_nome = v_novo_nome,
    autor_avatar = NULL
  WHERE autor_id = p_usuario_id;

  UPDATE public.comentarios SET
    autor_nome = v_novo_nome,
    autor_avatar = NULL,
    texto = '[anonimizado]'
  WHERE autor_id = p_usuario_id;

  UPDATE public.inspiracaoes SET
    autor_nome = v_novo_nome,
    autor_avatar = NULL
  WHERE autor_id = p_usuario_id;

  DELETE FROM public.curtidas WHERE usuario_id = p_usuario_id;
  DELETE FROM public.salvos WHERE usuario_id = p_usuario_id;
  DELETE FROM public.seguidores WHERE usuario_id = p_usuario_id;

  -- NOTA: NÃO apaga pagamentos, audit_logs, webhooks_processados (retenção fiscal/legal)
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_anonimizar_usuario(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_anonimizar_usuario(UUID) TO authenticated, service_role;

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

COMMENT ON DATABASE postgres IS 'Corte Rápido - SaaS Multi-tenant para Barbearias/Salões. Schema v1.0.0 - Zero Alertas Supabase Advisor - Performance Máxima';