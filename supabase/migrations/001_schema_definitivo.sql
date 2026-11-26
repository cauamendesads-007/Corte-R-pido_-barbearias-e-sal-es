-- ============================================================================
-- MIGRATION 001 — ESQUEMA DEFINITIVO CORTE RÁPIDO
-- PostgreSQL 15+ / Supabase
-- Idempotente: pode ser executado múltiplas vezes sem erro
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  estabelecimento_id UUID, -- FK para estabelecimentos (para barbeiros)
  confirmado BOOLEAN NOT NULL DEFAULT false,
  lembretes_whatsapp BOOLEAN NOT NULL DEFAULT true,
  seguindo UUID[] NOT NULL DEFAULT '{}', -- array de estabelecimento_ids
  inspiracao_salvas UUID[] NOT NULL DEFAULT '{}', -- array de publicacao_ids
  cpf TEXT, -- apenas para barbeiros (LGPD: anonimizar)
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_cpf_formato CHECK (cpf IS NULL OR cpf ~ '^\d{11}$')
);

COMMENT ON TABLE public.usuarios IS 'Perfil estendido do usuário (auth.users + dados de negócio). CPF apenas para barbeiros, anonimizado em LGPD.';

-- ============================================================================
-- TABELA: estabelecimentos (tenants)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.estabelecimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  configuracao_pix_chave TEXT, -- CHAVE PIX NUNCA EXPOSTA AO FRONTEND (apenas service_role)
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

-- ============================================================================
-- TABELA: profissionais (SEPARADA DE usuarios - REQUISITO OBRIGATÓRIO)
-- Um estabelecimento pode ter profissionais sem conta de login
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  usuario_id UUID UNIQUE REFERENCES public.usuarios(id) ON DELETE SET NULL, -- OPCIONAL e UNIQUE
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Domingo, 6=Sábado
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_centavos INT NOT NULL, -- VALOR EM CENTAVOS (INTEGER)
  duracao_min INT NOT NULL,
  tag TEXT NOT NULL, -- ex: 'corte', 'barba', 'combo'
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE RESTRICT, -- FK para profissional
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL, -- cliente logado (opcional)
  dia DATE NOT NULL, -- YYYY-MM-DD
  horario TIME NOT NULL, -- HH:MM
  duracao_min INT NOT NULL,
  nome_cliente TEXT NOT NULL,
  telefone_cliente TEXT NOT NULL,
  servicos TEXT NOT NULL, -- nomes concatenados para exibição rápida
  valor_total_centavos INT NOT NULL, -- VALOR EM CENTAVOS
  status_pagamento public.status_pagamento NOT NULL DEFAULT 'no_local',
  status public.status_agendamento NOT NULL DEFAULT 'agendado',
  servico_ids UUID[] NOT NULL DEFAULT '{}', -- array de servico_ids
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

-- ============================================================================
-- CONSTRAINT ANTI-OVERBOOKING POR PROFISSIONAL (REQUISITO OBRIGATÓRIO #3)
-- Usa btree_gist + EXCLUDE para impedir conflitos no MESMO profissional
-- Permite atendimentos simultâneos de barbeiros DIFERENTES na mesma barbearia
-- ============================================================================

-- Remove constraint se existir (idempotência)
ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_sem_conflito_profissional;

-- Adiciona constraint de exclusão usando tstzrange
-- Converte dia (DATE) + horario (TIME) + duracao_min para tstzrange
ALTER TABLE public.agendamentos
ADD CONSTRAINT agendamentos_sem_conflito_profissional
EXCLUDE USING gist (
  profissional_id WITH =,
  tstzrange(
    (dia + horario) AT TIME ZONE 'UTC',
    (dia + horario + (duracao_min || ' minutes')::interval) AT TIME ZONE 'UTC'
  ) WITH &&
) WHERE (status NOT IN ('cancelado', 'nao_compareceu'));

COMMENT ON CONSTRAINT agendamentos_sem_conflito_profissional ON public.agendamentos IS
'Constraint anti-overbooking por profissional (não por estabelecimento). Impede agendamentos sobrepostos para o mesmo profissional. Código de erro PostgreSQL: 23P01 (exclusion_violation).';

-- ============================================================================
-- TABELA: item_agendamento (ASSOCIATIVA - REQUISITO OBRIGATÓRIO #2)
-- Congela preço e duração de cada serviço no momento da reserva
-- Permite múltiplos serviços por agendamento sem perder histórico financeiro
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.item_agendamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
  preco_cobrado_centavos INT NOT NULL, -- PREÇO CONGELADO NO MOMENTO DA RESERVA
  duracao_min INT NOT NULL, -- DURAÇÃO CONGELADA NO MOMENTO DA RESERVA
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================================
-- TABELA: publicacoes (feed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.publicacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================================
-- TABELA: publicacao_midias
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.publicacao_midias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publicacao_id UUID NOT NULL REFERENCES public.publicacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (publicacao_id, usuario_id)
);

COMMENT ON TABLE public.salvos IS 'Publicações salvas pelo usuário (inspirações).';

CREATE INDEX IF NOT EXISTS idx_salvos_usuario ON public.salvos (usuario_id);

-- ============================================================================
-- TABELA: comentarios
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publicacao_id UUID NOT NULL REFERENCES public.publicacoes(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  autor_nome TEXT NOT NULL,
  autor_avatar TEXT,
  texto TEXT NOT NULL,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.comentarios IS 'Comentários em publicações.';

CREATE INDEX IF NOT EXISTS idx_comentarios_publicacao ON public.comentarios (publicacao_id, data_criacao DESC);

-- ============================================================================
-- TABELA: inspiracaoes (catálogo de inspirações curadas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inspiracaoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================================
-- TABELA: inspiracao_midias
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inspiracao_midias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  tipo public.plano_tipo NOT NULL,
  preco_centavos INT NOT NULL, -- VALOR EM CENTAVOS
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  plano_id UUID NOT NULL REFERENCES public.planos_assinatura(id) ON DELETE RESTRICT,
  inicio_contrato DATE NOT NULL,
  vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'vencida', 'cancelada', 'suspensa')),
  desconto_tipo TEXT CHECK (desconto_tipo IN ('percentual', 'valor_fixo')),
  desconto_valor NUMERIC(10,2) DEFAULT 0,
  desconto_motivo TEXT,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, status) WHERE (status = 'ativa') -- apenas uma ativa por estabelecimento
);

COMMENT ON TABLE public.assinaturas IS 'Assinatura ativa do estabelecimento. Apenas uma ativa por estabelecimento (partial unique index).';

CREATE INDEX IF NOT EXISTS idx_assinaturas_estabelecimento ON public.assinaturas (estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_vencimento ON public.assinaturas (vencimento) WHERE (status = 'ativa');

-- ============================================================================
-- TABELA: pagamentos (histórico de pagamentos: agendamentos + assinaturas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pagamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  assinatura_id UUID REFERENCES public.assinaturas(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('agendamento', 'assinatura', 'sinal')),
  valor_centavos INT NOT NULL, -- VALOR EM CENTAVOS
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'falhou', 'estornado', 'reembolsado')),
  provedor TEXT, -- 'pix', 'mercado_pago', 'stripe', 'manual'
  provedor_transacao_id TEXT, -- ID da transação no provedor
  pix_qr_code TEXT,
  pix_copia_cola TEXT,
  pix_expiracao TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE, -- CHAVE IDEMPOTÊNCIA PARA EVITAR DUPLICATAS
  dados_webhook JSONB, -- payload original do webhook para auditoria
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provedor TEXT NOT NULL, -- 'mercado_pago', 'stripe', 'asaas', 'banco_central'
  evento_id TEXT NOT NULL, -- ID único do evento no provedor
  evento_tipo TEXT NOT NULL, -- 'payment.approved', 'subscription.updated', etc.
  payload_hash TEXT NOT NULL, -- SHA256 do payload para detectar replay
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE SET NULL,
  acao public.audit_acao NOT NULL,
  entidade TEXT NOT NULL, -- nome da tabela afetada
  entidade_id UUID, -- ID do registro afetado
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
-- TRIGGERS: updated_at automático
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
    'bloqueios_agenda', 'servicos', 'agendamentos', 'galeria',
    'planos_assinatura', 'assinaturas', 'pagamentos'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_%I_updated_at ON public.%I;
      CREATE TRIGGER trigger_%I_updated_at
      BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();
    ', t, t, t, t);
  END LOOP;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — 100% DAS TABELAS (REQUISITO OBRIGATÓRIO #4)
-- ============================================================================

-- Habilitar RLS em TODAS as tabelas
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

-- ============================================================================
-- FUNÇÕES AUXILIARES PARA RLS
-- ============================================================================

-- Obter ID do usuário autenticado (auth.uid())
-- Retorna NULL se não autenticado
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT auth.uid();
$$;

-- Verificar se usuário é admin (role 'admin' no JWT ou na tabela usuarios)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND papel = 'admin'
  );
$$;

-- Verificar se usuário é dono/barbeiro do estabelecimento
CREATE OR REPLACE FUNCTION public.is_estabelecimento_owner(est_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid()
    AND papel IN ('barbeiro', 'admin')
    AND (papel = 'admin' OR estabelecimento_id = est_id)
  );
$$;

-- Verificar se usuário é profissional do estabelecimento
CREATE OR REPLACE FUNCTION public.is_profissional_estabelecimento(est_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profissionais
    WHERE usuario_id = auth.uid()
    AND estabelecimento_id = est_id
  );
$$;

-- ============================================================================
-- POLÍTICAS RLS: usuarios
-- ============================================================================

-- Usuário vê apenas seu próprio perfil
DROP POLICY IF EXISTS usuarios_select_own ON public.usuarios;
CREATE POLICY usuarios_select_own ON public.usuarios
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

-- Usuário atualiza apenas seu próprio perfil (não pode mudar papel, estabelecimento_id, cpf)
DROP POLICY IF EXISTS usuarios_update_own ON public.usuarios;
CREATE POLICY usuarios_update_own ON public.usuarios
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin insere/atualiza qualquer usuário
DROP POLICY IF EXISTS usuarios_admin_all ON public.usuarios;
CREATE POLICY usuarios_admin_all ON public.usuarios
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: estabelecimentos
-- ============================================================================

-- Leitura pública: apenas estabelecimentos APROVADOS (não vaza CPF, telefone, chave Pix)
DROP POLICY IF EXISTS estabelecimentos_select_public ON public.estabelecimentos;
CREATE POLICY estabelecimentos_select_public ON public.estabelecimentos
  FOR SELECT USING (status = 'aprovado');

-- Dono/barbeiro vê TUDO do seu estabelecimento (inclui campos sensíveis)
DROP POLICY IF EXISTS estabelecimentos_select_owner ON public.estabelecimentos;
CREATE POLICY estabelecimentos_select_owner ON public.estabelecimentos
  FOR SELECT USING (public.is_estabelecimento_owner(id));

-- Admin vê tudo
DROP POLICY IF EXISTS estabelecimentos_admin_all ON public.estabelecimentos;
CREATE POLICY estabelecimentos_admin_all ON public.estabelecimentos
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Dono/barbeiro atualiza seu estabelecimento (NÃO pode mudar status para aprovado)
DROP POLICY IF EXISTS estabelecimentos_update_owner ON public.estabelecimentos;
CREATE POLICY estabelecimentos_update_owner ON public.estabelecimentos
  FOR UPDATE USING (public.is_estabelecimento_owner(id))
  WITH CHECK (public.is_estabelecimento_owner(id));

-- ============================================================================
-- POLÍTICAS RLS: profissionais
-- ============================================================================

-- Público vê profissionais ativos de estabelecimentos aprovados
DROP POLICY IF EXISTS profissionais_select_public ON public.profissionais;
CREATE POLICY profissionais_select_public ON public.profissionais
  FOR SELECT USING (
    ativo = true
    AND EXISTS (
      SELECT 1 FROM public.estabelecimentos e
      WHERE e.id = estabelecimento_id AND e.status = 'aprovado'
    )
  );

-- Dono/barbeiro/admin gerencia profissionais do seu estabelecimento
DROP POLICY IF EXISTS profissionais_manage_owner ON public.profissionais;
CREATE POLICY profissionais_manage_owner ON public.profissionais
  FOR ALL USING (
    public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin()
  )
  WITH CHECK (
    public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin()
  );

-- ============================================================================
-- POLÍTICAS RLS: horarios_funcionamento
-- ============================================================================

-- Público vê horários de profissionais ativos de estabelecimentos aprovados
DROP POLICY IF EXISTS horarios_select_public ON public.horarios_funcionamento;
CREATE POLICY horarios_select_public ON public.horarios_funcionamento
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profissionais p
      JOIN public.estabelecimentos e ON e.id = p.estabelecimento_id
      WHERE p.id = profissional_id
      AND p.ativo = true
      AND e.status = 'aprovado'
    )
  );

-- Dono/barbeiro/admin gerencia
DROP POLICY IF EXISTS horarios_manage_owner ON public.horarios_funcionamento;
CREATE POLICY horarios_manage_owner ON public.horarios_funcionamento
  FOR ALL USING (
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

-- ============================================================================
-- POLÍTICAS RLS: bloqueios_agenda
-- ============================================================================

-- Apenas dono/barbeiro/admin veem/gerenciam bloqueios
DROP POLICY IF EXISTS bloqueios_manage_owner ON public.bloqueios_agenda;
CREATE POLICY bloqueios_manage_owner ON public.bloqueios_agenda
  FOR ALL USING (
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

-- ============================================================================
-- POLÍTICAS RLS: servicos
-- ============================================================================

-- Público vê serviços ativos de estabelecimentos aprovados
DROP POLICY IF EXISTS servicos_select_public ON public.servicos;
CREATE POLICY servicos_select_public ON public.servicos
  FOR SELECT USING (
    ativo = true
    AND EXISTS (
      SELECT 1 FROM public.estabelecimentos e
      WHERE e.id = estabelecimento_id AND e.status = 'aprovado'
    )
  );

-- Dono/barbeiro/admin gerencia
DROP POLICY IF EXISTS servicos_manage_owner ON public.servicos;
CREATE POLICY servicos_manage_owner ON public.servicos
  FOR ALL USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin())
  WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: servico_midias
-- ============================================================================

DROP POLICY IF EXISTS servico_midias_select_public ON public.servico_midias;
CREATE POLICY servico_midias_select_public ON public.servico_midias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.servicos s
      JOIN public.estabelecimentos e ON e.id = s.estabelecimento_id
      WHERE s.id = servico_id AND s.ativo = true AND e.status = 'aprovado'
    )
  );

DROP POLICY IF EXISTS servico_midias_manage_owner ON public.servico_midias;
CREATE POLICY servico_midias_manage_owner ON public.servico_midias
  FOR ALL USING (
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

-- ============================================================================
-- POLÍTICAS RLS: agendamentos
-- ============================================================================

-- Cliente vê seus próprios agendamentos (via usuario_id ou telefone)
DROP POLICY IF EXISTS agendamentos_select_cliente ON public.agendamentos;
CREATE POLICY agendamentos_select_cliente ON public.agendamentos
  FOR SELECT USING (
    usuario_id = auth.uid()
    OR (usuario_id IS NULL AND telefone_cliente IN (
      SELECT whatsapp FROM public.usuarios WHERE id = auth.uid()
    ))
  );

-- Profissional vê agendamentos do seu estabelecimento onde ele é o profissional
DROP POLICY IF EXISTS agendamentos_select_profissional ON public.agendamentos;
CREATE POLICY agendamentos_select_profissional ON public.agendamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id
      AND p.usuario_id = auth.uid()
    )
  );

-- Dono/barbeiro vê TODOS agendamentos do seu estabelecimento
DROP POLICY IF EXISTS agendamentos_select_owner ON public.agendamentos;
CREATE POLICY agendamentos_select_owner ON public.agendamentos
  FOR SELECT USING (public.is_estabelecimento_owner(estabelecimento_id));

-- Admin vê tudo
DROP POLICY IF EXISTS agendamentos_admin_all ON public.agendamentos;
CREATE POLICY agendamentos_admin_all ON public.agendamentos
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- CRIAÇÃO: Apenas via Edge Function (service_role) — NÃO HÁ POLÍTICA FOR INSERT COM WITH CHECK (true)
-- A Edge Function 'criar-agendamento' roda com service_role e insere diretamente
-- Clientes NÃO fazem INSERT direto na tabela agendamentos

-- ATUALIZAÇÃO: Dono/barbeiro/admin podem atualizar status, etc.
DROP POLICY IF EXISTS agendamentos_update_owner ON public.agendamentos;
CREATE POLICY agendamentos_update_owner ON public.agendamentos
  FOR UPDATE USING (
    public.is_estabelecimento_owner(estabelecimento_id)
    OR EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id AND p.usuario_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_estabelecimento_owner(estabelecimento_id)
    OR EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = profissional_id AND p.usuario_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ============================================================================
-- POLÍTICAS RLS: item_agendamento
-- ============================================================================

-- Segue mesma lógica de agendamentos (via JOIN)
DROP POLICY IF EXISTS item_agendamento_select ON public.item_agendamento;
CREATE POLICY item_agendamento_select ON public.item_agendamento
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.id = agendamento_id
      AND (
        a.usuario_id = auth.uid()
        OR public.is_estabelecimento_owner(a.estabelecimento_id)
        OR EXISTS (
          SELECT 1 FROM public.profissionais p
          WHERE p.id = a.profissional_id AND p.usuario_id = auth.uid()
        )
        OR public.is_admin()
      )
    )
  );

-- Apenas service_role (Edge Functions) insere
-- NÃO HÁ POLÍTICA FOR INSERT para usuários autenticados

DROP POLICY IF EXISTS item_agendamento_admin_all ON public.item_agendamento;
CREATE POLICY item_agendamento_admin_all ON public.item_agendamento
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: galeria
-- ============================================================================

DROP POLICY IF EXISTS galeria_select_public ON public.galeria;
CREATE POLICY galeria_select_public ON public.galeria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.estabelecimentos e
      WHERE e.id = estabelecimento_id AND e.status = 'aprovado'
    )
  );

DROP POLICY IF EXISTS galeria_manage_owner ON public.galeria;
CREATE POLICY galeria_manage_owner ON public.galeria
  FOR ALL USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin())
  WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: avaliacoes
-- ============================================================================

-- Público vê avaliações de estabelecimentos aprovados
DROP POLICY IF EXISTS avaliacoes_select_public ON public.avaliacoes;
CREATE POLICY avaliacoes_select_public ON public.avaliacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.estabelecimentos e
      WHERE e.id = estabelecimento_id AND e.status = 'aprovado'
    )
  );

-- Cliente insere avaliação do SEU agendamento concluído
DROP POLICY IF EXISTS avaliacoes_insert_cliente ON public.avaliacoes;
CREATE POLICY avaliacoes_insert_cliente ON public.avaliacoes
  FOR INSERT WITH CHECK (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.id = agendamento_id
      AND a.usuario_id = auth.uid()
      AND a.status = 'concluido'
      AND a.avaliacao_estrelas IS NULL
    )
  );

-- Dono/barbeiro responde avaliação
DROP POLICY IF EXISTS avaliacoes_update_owner ON public.avaliacoes;
CREATE POLICY avaliacoes_update_owner ON public.avaliacoes
  FOR UPDATE USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin())
  WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

DROP POLICY IF EXISTS avaliacoes_admin_all ON public.avaliacoes;
CREATE POLICY avaliacoes_admin_all ON public.avaliacoes
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: publicacoes (feed)
-- ============================================================================

-- Público vê publicações de estabelecimentos aprovados
DROP POLICY IF EXISTS publicacoes_select_public ON public.publicacoes;
CREATE POLICY publicacoes_select_public ON public.publicacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.estabelecimentos e
      WHERE e.id = estabelecimento_id AND e.status = 'aprovado'
    )
  );

-- Dono/barbeiro/admin gerencia publicações do seu estabelecimento
DROP POLICY IF EXISTS publicacoes_manage_owner ON public.publicacoes
  FOR ALL USING (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin())
  WITH CHECK (public.is_estabelecimento_owner(estabelecimento_id) OR public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: publicacao_midias
-- ============================================================================

DROP POLICY IF EXISTS publicacao_midias_select ON public.publicacao_midias;
CREATE POLICY publicacao_midias_select ON public.publicacao_midias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.publicacoes p
      JOIN public.estabelecimentos e ON e.id = p.estabelecimento_id
      WHERE p.id = publicacao_id AND e.status = 'aprovado'
    )
  );

DROP POLICY IF EXISTS publicacao_midias_manage_owner ON public.publicacao_midias;
CREATE POLICY publicacao_midias_manage_owner ON public.publicacao_midias
  FOR ALL USING (
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

-- ============================================================================
-- POLÍTICAS RLS: curtidas
-- ============================================================================

-- Usuário vê/gerencia suas próprias curtidas
DROP POLICY IF EXISTS curtidas_own ON public.curtidas;
CREATE POLICY curtidas_own ON public.curtidas
  FOR ALL USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Admin vê tudo
DROP POLICY IF EXISTS curtidas_admin_all ON public.curtidas;
CREATE POLICY curtidas_admin_all ON public.curtidas
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: salvos
-- ============================================================================

DROP POLICY IF EXISTS salvos_own ON public.salvos;
CREATE POLICY salvos_own ON public.salvos
  FOR ALL USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS salvos_admin_all ON public.salvos;
CREATE POLICY salvos_admin_all ON public.salvos
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: comentarios
-- ============================================================================

-- Público vê comentários de publicações de estabelecimentos aprovados
DROP POLICY IF EXISTS comentarios_select_public ON public.comentarios;
CREATE POLICY comentarios_select_public ON public.comentarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.publicacoes p
      JOIN public.estabelecimentos e ON e.id = p.estabelecimento_id
      WHERE p.id = publicacao_id AND e.status = 'aprovado'
    )
  );

-- Usuário autenticado insere comentário
DROP POLICY IF EXISTS comentarios_insert_auth ON public.comentarios;
CREATE POLICY comentarios_insert_auth ON public.comentarios
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND autor_id = auth.uid()
  );

-- Autor ou admin exclui
DROP POLICY IF EXISTS comentarios_delete_own ON public.comentarios;
CREATE POLICY comentarios_delete_own ON public.comentarios
  FOR DELETE USING (autor_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS comentarios_admin_all ON public.comentarios;
CREATE POLICY comentarios_admin_all ON public.comentarios
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: inspiracaoes
-- ============================================================================

-- Leitura pública total (catálogo curado)
DROP POLICY IF EXISTS inspiracaoes_select_public ON public.inspiracaoes;
CREATE POLICY inspiracaoes_select_public ON public.inspiracaoes
  FOR SELECT USING (true);

-- Apenas admin gerencia
DROP POLICY IF EXISTS inspiracaoes_admin_all ON public.inspiracaoes;
CREATE POLICY inspiracaoes_admin_all ON public.inspiracaoes
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: inspiracao_midias
-- ============================================================================

DROP POLICY IF EXISTS inspiracao_midias_select_public ON public.inspiracao_midias;
CREATE POLICY inspiracao_midias_select_public ON public.inspiracao_midias
  FOR SELECT USING (true);

DROP POLICY IF EXISTS inspiracao_midias_admin_all ON public.inspiracao_midias;
CREATE POLICY inspiracao_midias_admin_all ON public.inspiracao_midias
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: seguidores
-- ============================================================================

-- Usuário gerencia seus próprios follows
DROP POLICY IF EXISTS seguidores_own ON public.seguidores;
CREATE POLICY seguidores_own ON public.seguidores
  FOR ALL USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Público vê contagem (via view ou RPC)
DROP POLICY IF EXISTS seguidores_select_public ON public.seguidores;
CREATE POLICY seguidores_select_public ON public.seguidores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS seguidores_admin_all ON public.seguidores;
CREATE POLICY seguidores_admin_all ON public.seguidores
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: planos_assinatura
-- ============================================================================

-- Leitura pública (apenas ativos)
DROP POLICY IF EXISTS planos_select_public ON public.planos_assinatura;
CREATE POLICY planos_select_public ON public.planos_assinatura
  FOR SELECT USING (ativo = true);

-- Apenas admin gerencia
DROP POLICY IF EXISTS planos_admin_all ON public.planos_assinatura;
CREATE POLICY planos_admin_all ON public.planos_assinatura
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- POLÍTICAS RLS: assinaturas
-- ============================================================================

-- Dono/barbeiro vê sua assinatura
DROP POLICY IF EXISTS assinaturas_select_owner ON public.assinaturas;
CREATE POLICY assinaturas_select_owner ON public.assinaturas
  FOR SELECT USING (public.is_estabelecimento_owner(estabelecimento_id));

-- Admin vê/gerencia tudo
DROP POLICY IF EXISTS assinaturas_admin_all ON public.assinaturas;
CREATE POLICY assinaturas_admin_all ON public.assinaturas
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Apenas service_role (Edge Functions) insere/atualiza assinaturas
-- NÃO HÁ POLÍTICA FOR INSERT para usuários autenticados

-- ============================================================================
-- POLÍTICAS RLS: pagamentos (SENSÍVEL - REQUISITO OBRIGATÓRIO #4)
-- ============================================================================

-- Dono/barbeiro vê pagamentos do seu estabelecimento
DROP POLICY IF EXISTS pagamentos_select_owner ON public.pagamentos;
CREATE POLICY pagamentos_select_owner ON public.pagamentos
  FOR SELECT USING (public.is_estabelecimento_owner(estabelecimento_id));

-- Cliente vê SEUS pagamentos de agendamento
DROP POLICY IF EXISTS pagamentos_select_cliente ON public.pagamentos;
CREATE POLICY pagamentos_select_cliente ON public.pagamentos
  FOR SELECT USING (
    agendamento_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.id = agendamento_id AND a.usuario_id = auth.uid()
    )
  );

-- Admin vê tudo
DROP POLICY IF EXISTS pagamentos_admin_all ON public.pagamentos;
CREATE POLICY pagamentos_admin_all ON public.pagamentos
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PROIBIDO: FOR INSERT WITH CHECK (true) — APENAS EDGE FUNCTIONS (service_role)
-- A Edge Function 'gerar-cobranca-pix' e 'webhook-pagamento' inserem/atualizam

-- ============================================================================
-- POLÍTICAS RLS: notificacoes (SENSÍVEL)
-- ============================================================================

-- Usuário vê apenas suas notificações
DROP POLICY IF EXISTS notificacoes_own ON public.notificacoes;
CREATE POLICY notificacoes_own ON public.notificacoes
  FOR ALL USING (destinatario_id = auth.uid())
  WITH CHECK (destinatario_id = auth.uid());

-- Admin vê tudo
DROP POLICY IF EXISTS notificacoes_admin_all ON public.notificacoes;
CREATE POLICY notificacoes_admin_all ON public.notificacoes
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PROIBIDO: FOR INSERT WITH CHECK (true) — APENAS EDGE FUNCTIONS

-- ============================================================================
-- POLÍTICAS RLS: webhooks_processados (APENAS SERVICE_ROLE/ADMIN)
-- ============================================================================

DROP POLICY IF EXISTS webhooks_admin_all ON public.webhooks_processados;
CREATE POLICY webhooks_admin_all ON public.webhooks_processados
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Apenas service_role (Edge Functions) insere

-- ============================================================================
-- POLÍTICAS RLS: audit_logs (APENAS ADMIN/SERVICE_ROLE - IMUTÁVEL)
-- ============================================================================

DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
CREATE POLICY audit_logs_admin_select ON public.audit_logs
  FOR SELECT USING (public.is_admin());

-- Apenas service_role (Edge Functions) insere — NÃO HÁ UPDATE/DELETE

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View: estabelecimentos públicos com contadores
CREATE OR REPLACE VIEW public.v_estabelecimentos_publicos AS
SELECT
  e.*,
  (SELECT COUNT(*) FROM public.seguidores s WHERE s.estabelecimento_id = e.id) AS seguidores_count,
  (SELECT COUNT(*) FROM public.servicos sv WHERE sv.estabelecimento_id = e.id AND sv.ativo = true) AS servicos_count,
  (SELECT COUNT(*) FROM public.profissionais p WHERE p.estabelecimento_id = e.id AND p.ativo = true) AS profissionais_count
FROM public.estabelecimentos e
WHERE e.status = 'aprovado';

-- View: agendamentos com dados expandidos (para dashboards)
CREATE OR REPLACE VIEW public.v_agendamentos_detalhados AS
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

-- ============================================================================
-- RPC FUNCTIONS (para operações complexas seguras)
-- ============================================================================

-- RPC: Obter slots disponíveis por profissional/dia (usa horarios_funcionamento, bloqueios, agendamentos existentes)
CREATE OR REPLACE FUNCTION public.rpc_slots_disponiveis(
  p_profissional_id UUID,
  p_dia DATE,
  p_duracao_min INT DEFAULT 30
)
RETURNS TABLE (
  horario TIME,
  disponivel BOOLEAN,
  profissional_nome TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_inicio TIME;
  v_fim TIME;
  v_intervalo INT;
  v_slot TIME;
  v_ocupado BOOLEAN;
  v_bloqueado BOOLEAN;
BEGIN
  -- Busca horário de funcionamento do profissional para o dia da semana
  SELECT hora_inicio, hora_fim, intervalo_minutos
  INTO v_inicio, v_fim, v_intervalo
  FROM public.horarios_funcionamento
  WHERE profissional_id = p_profissional_id
    AND dia_semana = EXTRACT(DOW FROM p_dia)::INT
    AND ativo = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::TIME, false, NULL::TEXT WHERE false;
    RETURN;
  END IF;

  -- Busca nome do profissional
  DECLARE v_nome TEXT;
  SELECT nome INTO v_nome FROM public.profissionais WHERE id = p_profissional_id;

  -- Gera slots
  v_slot := v_inicio;
  WHILE v_slot + (p_duracao_min || ' minutes')::interval <= v_fim LOOP
    -- Verifica se há agendamento conflitante
    SELECT EXISTS (
      SELECT 1 FROM public.agendamentos
      WHERE profissional_id = p_profissional_id
        AND dia = p_dia
        AND status NOT IN ('cancelado', 'nao_compareceu')
        AND (
          (horario <= v_slot AND horario + (duracao_min || ' minutes')::interval > v_slot)
          OR (horario < v_slot + (p_duracao_min || ' minutes')::interval AND horario + (duracao_min || ' minutes')::interval >= v_slot + (p_duracao_min || ' minutes')::interval)
        )
    ) INTO v_ocupado;

    -- Verifica bloqueio
    SELECT EXISTS (
      SELECT 1 FROM public.bloqueios_agenda
      WHERE profissional_id = p_profissional_id
        AND inicio <= (p_dia + v_slot) AT TIME ZONE 'UTC'
        AND fim > (p_dia + v_slot) AT TIME ZONE 'UTC'
    ) INTO v_bloqueado;

    -- Verifica se já passou
    DECLARE v_passado BOOLEAN := (p_dia + v_slot) AT TIME ZONE 'UTC' < now();

    RETURN QUERY SELECT v_slot, (NOT v_ocupado AND NOT v_bloqueado AND NOT v_passado), v_nome;

    v_slot := v_slot + (v_intervalo || ' minutes')::interval;
  END LOOP;
END $$;

-- RPC: Criar agendamento com transação atômica (usado pela Edge Function)
CREATE OR REPLACE FUNCTION public.rpc_criar_agendamento(
  p_estabelecimento_id UUID,
  p_profissional_id UUID,
  p_usuario_id UUID, -- pode ser NULL
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
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_agendamento_id UUID;
  v_servicos TEXT;
  v_servico RECORD;
BEGIN
  -- Valida profissional pertence ao estabelecimento
  IF NOT EXISTS (
    SELECT 1 FROM public.profissionais
    WHERE id = p_profissional_id AND estabelecimento_id = p_estabelecimento_id
  ) THEN
    RETURN QUERY SELECT NULL, 'Profissional não pertence ao estabelecimento';
  END IF;

  -- Concatena nomes dos serviços
  SELECT STRING_AGG(nome, ' + ') INTO v_servicos
  FROM public.servicos
  WHERE id = ANY(p_servico_ids);

  -- Insere agendamento (constraint anti-overbooking valida automaticamente)
  INSERT INTO public.agendamentos (
    estabelecimento_id, profissional_id, usuario_id, dia, horario, duracao_min,
    nome_cliente, telefone_cliente, servicos, valor_total_centavos,
    status_pagamento, status, servico_ids, observacoes
  ) VALUES (
    p_estabelecimento_id, p_profissional_id, p_usuario_id, p_dia, p_horario, p_duracao_min,
    p_nome_cliente, p_telefone_cliente, v_servicos, p_valor_total_centavos,
    p_status_pagamento, 'agendado', p_servico_ids, p_observacoes
  ) RETURNING id INTO v_agendamento_id;

  -- Insere itens (congela preço e duração)
  FOR v_servico IN
    SELECT id, preco_centavos, duracao_min
    FROM public.servicos
    WHERE id = ANY(p_servico_ids)
  LOOP
    INSERT INTO public.item_agendamento (agendamento_id, servico_id, preco_cobrado_centavos, duracao_min, ordem)
    VALUES (v_agendamento_id, v_servico.id, v_servico.preco_centavos, v_servico.duracao_min, 0);
  END LOOP;

  RETURN QUERY SELECT v_agendamento_id, NULL;
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN QUERY SELECT NULL, 'CONFLITO_HORARIO: Esse horário já foi ocupado por outro agendamento';
  WHEN unique_violation THEN
    RETURN QUERY SELECT NULL, 'Erro de duplicidade';
  WHEN others THEN
    RETURN QUERY SELECT NULL, SQLERRM;
END $$;

-- RPC: Anonimizar usuário (LGPD Art. 18)
CREATE OR REPLACE FUNCTION public.rpc_anonimizar_usuario(p_usuario_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_hash TEXT := md5(p_usuario_id::TEXT || clock_timestamp()::TEXT);
  v_novo_nome TEXT := 'Usuário Anonimizado ' || substr(v_hash, 1, 8);
  v_novo_email TEXT := 'anon-' || substr(v_hash, 1, 12) || '@corte-rapido.local';
BEGIN
  -- Anonimiza tabela usuarios (mantém ID para FKs)
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

  -- Anonimiza agendamentos (nome/telefone do cliente)
  UPDATE public.agendamentos SET
    nome_cliente = v_novo_nome,
    telefone_cliente = '(00) 00000-0000',
    observacoes = NULL,
    avaliacao_comentario = NULL
  WHERE usuario_id = p_usuario_id;

  -- Anonimiza avaliações
  UPDATE public.avaliacoes SET
    nome_cliente = v_novo_nome,
    comentario = '[anonimizado]'
  WHERE usuario_id = p_usuario_id;

  -- Anonimiza publicações (autor)
  UPDATE public.publicacoes SET
    autor_nome = v_novo_nome,
    autor_avatar = NULL
  WHERE autor_id = p_usuario_id;

  -- Anonimiza comentários
  UPDATE public.comentarios SET
    autor_nome = v_novo_nome,
    autor_avatar = NULL,
    texto = '[anonimizado]'
  WHERE autor_id = p_usuario_id;

  -- Anonimiza inspirações
  UPDATE public.inspiracaoes SET
    autor_nome = v_novo_nome,
    autor_avatar = NULL
  WHERE autor_id = p_usuario_id;

  -- Remove curtidas/salvos/seguidores (dados pessoais)
  DELETE FROM public.curtidas WHERE usuario_id = p_usuario_id;
  DELETE FROM public.salvos WHERE usuario_id = p_usuario_id;
  DELETE FROM public.seguidores WHERE usuario_id = p_usuario_id;

  -- NOTA: NÃO apaga pagamentos, audit_logs, webhooks_processados (retenção fiscal/legal)
END $$;

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

COMMENT ON DATABASE postgres IS 'Corte Rápido - SaaS Multi-tenant para Barbearias/Salões. Schema v1.0.0';