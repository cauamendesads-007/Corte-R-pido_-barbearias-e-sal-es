-- ============================================================================
-- SEED DATA — DADOS INICIAIS PARA TESTES E DESENVOLVIMENTO
-- Execute APÓS a migration 001_schema_definitivo.sql
-- Compatível com o schema da migration (enums, tipos, constraints)
-- ============================================================================

-- ============================================================================
-- PLANOS DE ASSINATURA
-- Nota: planos_assinatura.id é do tipo plano_tipo_enum (enum), não UUID
-- ============================================================================

INSERT INTO public.planos_assinatura (id, nome, descricao, preco_mensal_centavos, preco_anual_centavos, limite_estabelecimentos, limite_barbeiros, limite_agendamentos_mes, funcionalidades, ativo, ordem_exibicao) VALUES
('gratuito', 'Gratuito', 'Plano gratuito para começar', 0, 0, 1, 1, 50, '{"agendamentos": true, "pagamentos": false, "fidelidade": false, "relatorios": false, "api": false}'::jsonb, true, 1),
('basico', 'Básico', 'Ideal para barbearia pequena', 4990, 49900, 1, 3, 500, '{"agendamentos": true, "pagamentos": true, "fidelidade": true, "relatorios": true, "api": false}'::jsonb, true, 2),
('profissional', 'Profissional', 'Para barbearias em crescimento', 8990, 89900, 3, 10, 5000, '{"agendamentos": true, "pagamentos": true, "fidelidade": true, "relatorios": true, "api": true, "multi_unidade": true}'::jsonb, true, 3),
('empresarial', 'Empresarial', 'Para redes e franquias', 19990, 199900, 10, 50, 50000, '{"agendamentos": true, "pagamentos": true, "fidelidade": true, "relatorios": true, "api": true, "multi_unidade": true, "white_label": true, "sso": true}'::jsonb, true, 4),
('custom', 'Customizado', 'Plano sob medida', 0, 0, 999, 999, 999999, '{"agendamentos": true, "pagamentos": true, "fidelidade": true, "relatorios": true, "api": true, "multi_unidade": true, "white_label": true, "sso": true, "custom": true}'::jsonb, true, 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ESTABELECIMENTO DEMO
-- ============================================================================

-- Usamos IDs fixos para facilitar testes
DO $$
DECLARE
  v_est_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_admin_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_barbeiro_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_cliente_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_prof1_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  v_prof2_id UUID := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_svc1_id UUID := '11111111-2222-3333-4444-555555555555';
  v_svc2_id UUID := '22222222-3333-4444-5555-666666666666';
  v_svc3_id UUID := '33333333-4444-5555-6666-777777777777';
BEGIN
  -- Inserir estabelecimento demo
  INSERT INTO public.estabelecimentos (
    id, slug, nome, responsavel, cidade, nicho, avaliacao, status,
    latitude, longitude, whatsapp, endereco, sobre,
    tema_cor, tema_layout, tema_titulo, tema_subtitulo,
    tempo_medio_atendimento, horario_funcionamento,
    permite_auto_edicao,
    pix_modo, pix_chave, pix_percentual_sinal,
    seguidores_count, taxa_fidelidade
  ) VALUES (
    v_est_id,
    'barbearia-do-carlos',
    'Barbearia do Carlos',
    'Carlos Silva',
    'Belo Horizonte',
    'barbearia'::nicho_estabelecimento_enum,
    4.9,
    'aprovado'::status_estabelecimento_enum,
    -19.9208, -43.9378,
    '31999999999',
    'Rua dos Bobos, 0 - Centro, Belo Horizonte - MG',
    'A melhor barbearia da região. Cortes clássicos, barba e atendimento VIP.',
    '#B45309', 'classico'::tipo_layout_enum,
    'Barbearia do Carlos',
    'Tradição e estilo desde 2010',
    25,
    'Seg a Sáb, 9h às 19h',
    true,
    'opcional'::pix_modo_enum,
    'carlos@barbeariadocarlos.com', -- Chave Pix (email) - NUNCA EXPOSTA AO FRONTEND
    30,
    127,
    5.00
  ) ON CONFLICT (id) DO NOTHING;

  -- ============================================================================
  -- USUÁRIOS (auth.users + public.usuarios)
  -- NOTA: Em produção, auth.users é gerenciado pelo Supabase Auth.
  -- Aqui inserimos apenas em public.usuarios assumindo que os IDs existem no auth.
  -- Para testes locais, crie os usuários no Supabase Auth com estes UUIDs e emails.
  -- ============================================================================

  -- Admin
  INSERT INTO public.usuarios (id, email, senha_hash, papel, nome, confirmado, data_cadastro)
  VALUES (v_admin_id, 'admin@corte-rapido.com', '$argon2id$v=19$m=65536,t=3,p=4$dummy', 'admin'::papel_usuario_enum, 'Admin Sistema', true, now())
  ON CONFLICT (id) DO NOTHING;

  -- Barbeiro (dono do estabelecimento)
  INSERT INTO public.usuarios (id, email, senha_hash, papel, nome, whatsapp, cidade, estabelecimento_id, confirmado, data_cadastro)
  VALUES (v_barbeiro_id, 'carlos@barbeariadocarlos.com', '$argon2id$v=19$m=65536,t=3,p=4$dummy', 'barbeiro'::papel_usuario_enum, 'Carlos Silva', '31999999999', 'Belo Horizonte', v_est_id, true, now())
  ON CONFLICT (id) DO NOTHING;

  -- Cliente demo
  INSERT INTO public.usuarios (id, email, senha_hash, papel, nome, whatsapp, cidade, confirmado, lembretes_whatsapp, data_cadastro)
  VALUES (v_cliente_id, 'joao@cliente.com', '$argon2id$v=19$m=65536,t=3,p=4$dummy', 'cliente'::papel_usuario_enum, 'João Cliente', '31988887777', 'Belo Horizonte', true, true, now())
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================================
  -- PROFISSIONAIS
  -- ============================================================================

  -- Profissional 1: Carlos (tem login)
  INSERT INTO public.profissionais (id, estabelecimento_id, usuario_id, nome, apelido, especialidades, ativo, ordem_exibicao, comissao_pct)
  VALUES (v_prof1_id, v_est_id, v_barbeiro_id, 'Carlos Silva', 'Carlos', ARRAY['Corte Clássico', 'Barba', 'Degradê'], true, 1, 60)
  ON CONFLICT (id) DO NOTHING;

  -- Profissional 2: Pedro (SEM login - requisito: profissional sem conta)
  INSERT INTO public.profissionais (id, estabelecimento_id, usuario_id, nome, apelido, especialidades, ativo, ordem_exibicao, comissao_pct)
  VALUES (v_prof2_id, v_est_id, NULL, 'Pedro Santos', 'Pedro', ARRAY['Corte Infantil', 'Corte Feminino', 'Visagismo'], true, 2, 60)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================================
  -- HORÁRIOS DE FUNCIONAMENTO (por profissional)
  -- ============================================================================

  -- Carlos: Seg-Sex 9h-18h, Sáb 9h-13h (dia_semana: 1=Seg, ..., 6=Sáb, 0=Dom)
  INSERT INTO public.horarios_funcionamento (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_minutos, ativo) VALUES
    (v_prof1_id, 1, '09:00', '18:00', 30, true), -- Segunda
    (v_prof1_id, 2, '09:00', '18:00', 30, true), -- Terça
    (v_prof1_id, 3, '09:00', '18:00', 30, true), -- Quarta
    (v_prof1_id, 4, '09:00', '18:00', 30, true), -- Quinta
    (v_prof1_id, 5, '09:00', '18:00', 30, true), -- Sexta
    (v_prof1_id, 6, '09:00', '13:00', 30, true)  -- Sábado
  ON CONFLICT (profissional_id, dia_semana) DO NOTHING;

  -- Pedro: Ter-Qui 10h-19h, Sáb 9h-14h
  INSERT INTO public.horarios_funcionamento (profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_minutos, ativo) VALUES
    (v_prof2_id, 2, '10:00', '19:00', 30, true), -- Terça
    (v_prof2_id, 3, '10:00', '19:00', 30, true), -- Quarta
    (v_prof2_id, 4, '10:00', '19:00', 30, true), -- Quinta
    (v_prof2_id, 6, '09:00', '14:00', 30, true)  -- Sábado
  ON CONFLICT (profissional_id, dia_semana) DO NOTHING;

  -- ============================================================================
  -- SERVIÇOS
  -- ============================================================================

  INSERT INTO public.servicos (id, estabelecimento_id, nome, descricao, preco_centavos, duracao_min, tag, ativo, ordem_exibicao) VALUES
    (v_svc1_id, v_est_id, 'Corte Clássico', 'Corte tradicional com tesoura e máquina, finalização com pomada', 3500, 30, 'corte', true, 1),
    (v_svc2_id, v_est_id, 'Barba Completa', 'Aparar, modelar e hidratar a barba com toalha quente e óleo', 2500, 25, 'barba', true, 2),
    (v_svc3_id, v_est_id, 'Combo Corte + Barba', 'Corte clássico + barba completa com desconto', 5500, 50, 'combo', true, 3)
  ON CONFLICT (id) DO NOTHING;

  -- Mídias dos serviços (placeholders)
  INSERT INTO public.servico_midias (servico_id, tipo, src, alt, ordem) VALUES
    (v_svc1_id, 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400', 'Corte clássico exemplo', 1),
    (v_svc2_id, 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400', 'Barba completa exemplo', 1),
    (v_svc3_id, 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400', 'Combo corte e barba', 1)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- GALERIA DO ESTABELECIMENTO
  -- ============================================================================

  INSERT INTO public.galeria (estabelecimento_id, tipo, src, legenda, ordem, destaque) VALUES
    (v_est_id, 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', 'Ambiente da barbearia', 1, true),
    (v_est_id, 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1519070843887-1ce36f3b385e?w=800', 'Estação de corte', 2, false),
    (v_est_id, 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', 'Detalhe da barba', 3, false)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- INSPIRAÇÕES (CATÁLOGO CURADO)
  -- ============================================================================

  INSERT INTO public.inspiracaoes (id, usuario_id, titulo, categoria, descricao, autor_nome, autor_avatar, curtidas_count, salvos_count, status, data_publicacao, data_criacao) VALUES
    ('iii11111-1111-1111-1111-111111111111', v_admin_id, 'Degradê Clássico', 'degrade'::inspiracao_categoria_enum, 'Corte degradê baixo com transição suave', 'Equipe Corte Rápido', NULL, 234, 45, 'publicado'::publicacao_status_enum, now() - interval '10 days', now() - interval '10 days'),
    ('iii22222-2222-2222-2222-222222222222', v_admin_id, 'Barba Lenhador', 'barba'::inspiracao_categoria_enum, 'Barba cheia modelada com óleo de argan', 'Equipe Corte Rápido', NULL, 189, 32, 'publicado'::publicacao_status_enum, now() - interval '8 days', now() - interval '8 days'),
    ('iii33333-3333-3333-3333-333333333333', v_admin_id, 'Corte Infantil Divertido', 'infantil'::inspiracao_categoria_enum, 'Corte com desenho lateral para crianças', 'Equipe Corte Rápido', NULL, 156, 28, 'publicado'::publicacao_status_enum, now() - interval '5 days', now() - interval '5 days'),
    ('iii44444-4444-4444-4444-444444444444', v_admin_id, 'Colorido Moderno', 'colorido'::inspiracao_categoria_enum, 'Mechas platinadas com corte texturizado', 'Equipe Corte Rápido', NULL, 312, 67, 'publicado'::publicacao_status_enum, now() - interval '3 days', now() - interval '3 days'),
    ('iii55555-5555-5555-5555-555555555555', v_admin_id, 'Visagismo Masculino', 'visagismo'::inspiracao_categoria_enum, 'Análise facial + corte personalizado', 'Equipe Corte Rápido', NULL, 98, 15, 'publicado'::publicacao_status_enum, now() - interval '1 day', now() - interval '1 day')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.inspiracao_midias (inspiracao_id, tipo, src, ordem) VALUES
    ('iii11111-1111-1111-1111-111111111111', 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600', 1),
    ('iii22222-2222-2222-2222-222222222222', 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600', 1),
    ('iii33333-3333-3333-3333-333333333333', 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1519070843887-1ce36f3b385e?w=600', 1),
    ('iii44444-4444-4444-4444-444444444444', 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600', 1),
    ('iii55555-5555-5555-5555-555555555555', 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600', 1)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- PUBLICAÇÕES DEMO (FEED)
  -- ============================================================================

  INSERT INTO public.publicacoes (id, estabelecimento_id, usuario_id, autor_nome, autor_avatar, tipo, legenda, tag_servico, curtidas_count, salvos_count, visualizacoes_count, compartilhamentos_count, comentarios_count, status, data_publicacao, data_criacao) VALUES
    ('ppp11111-1111-1111-1111-111111111111', v_est_id, v_barbeiro_id, 'Carlos Silva', NULL, 'foto'::publicacao_tipo_enum, 'Novo corte degradê do cliente João! 💈 #degrade #barbearia', 'corte', 42, 8, 320, 5, 3, 'publicado'::publicacao_status_enum, now() - interval '2 hours', now() - interval '2 hours'),
    ('ppp22222-2222-2222-2222-222222222222', v_est_id, v_barbeiro_id, 'Carlos Silva', NULL, 'foto'::publicacao_tipo_enum, 'Barba lenhador modelada com óleo de argan. Cliente satisfeito! 🧔', 'barba', 38, 12, 280, 3, 2, 'publicado'::publicacao_status_enum, now() - interval '5 hours', now() - interval '5 hours'),
    ('ppp33333-3333-3333-3333-333333333333', v_est_id, v_barbeiro_id, 'Carlos Silva', NULL, 'foto'::publicacao_tipo_enum, 'Combo corte + barba: o pacote completo para o fim de semana! ✂️🧔', 'combo', 55, 15, 450, 8, 4, 'publicado'::publicacao_status_enum, now() - interval '1 day', now() - interval '1 day'),
    ('ppp44444-4444-4444-4444-444444444444', v_est_id, v_barbeiro_id, 'Carlos Silva', NULL, 'dica'::publicacao_tipo_enum, '💡 Dica: Hidrate a barba diariamente com óleo específico. Evita coceira e fios quebrados.', 'dica', 67, 23, 510, 12, 6, 'publicado'::publicacao_status_enum, now() - interval '2 days', now() - interval '2 days')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.publicacao_midias (publicacao_id, tipo, src, alt, ordem) VALUES
    ('ppp11111-1111-1111-1111-111111111111', 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600', 'Degradê clássico', 1),
    ('ppp22222-2222-2222-2222-222222222222', 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600', 'Barba lenhador', 1),
    ('ppp33333-3333-3333-3333-333333333333', 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600', 'Combo corte barba', 1),
    ('ppp44444-4444-4444-4444-444444444444', 'imagem'::tipo_midia_enum, 'https://images.unsplash.com/photo-1519070843887-1ce36f3b385e?w=600', 'Dica barba', 1)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- ASSINATURA DO ESTABELECIMENTO DEMO
  -- ============================================================================

  INSERT INTO public.assinaturas (estabelecimento_id, plano_id, status, ciclo_cobranca, valor_pago_centavos, data_inicio, data_vencimento)
  VALUES (v_est_id, 'profissional'::plano_tipo_enum, 'ativa'::status_assinatura_enum, 'mensal'::ciclo_cobranca_enum, 8990, CURRENT_DATE - interval '15 days', CURRENT_DATE + interval '15 days')
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- AGENDAMENTOS DE EXEMPLO (para testar a constraint anti-overbooking)
  -- ============================================================================

  -- Agendamento 1: Carlos, hoje 10:00, 30 min
  INSERT INTO public.agendamentos (
    estabelecimento_id, profissional_id, usuario_id, dia, horario, duracao_min,
    nome_cliente, telefone_cliente, servicos, valor_total_centavos,
    status_pagamento, status, servico_ids, observacoes
  ) VALUES (
    v_est_id, v_prof1_id, v_cliente_id, CURRENT_DATE, '10:00', 30,
    'João Cliente', '31988887777', 'Corte Clássico', 3500,
    'pago'::status_pagamento_enum, 'agendado'::status_agendamento_enum, ARRAY[v_svc1_id], NULL
  ) ON CONFLICT DO NOTHING;

  -- Item do agendamento 1 (congela preço e duração)
  INSERT INTO public.item_agendamento (agendamento_id, servico_id, preco_cobrado_centavos, duracao_min, ordem)
  SELECT a.id, v_svc1_id, 3500, 30, 1
  FROM public.agendamentos a
  WHERE a.estabelecimento_id = v_est_id AND a.profissional_id = v_prof1_id AND a.dia = CURRENT_DATE AND a.horario = '10:00'
  ON CONFLICT DO NOTHING;

  -- Agendamento 2: Carlos, hoje 14:00, 50 min (combo)
  INSERT INTO public.agendamentos (
    estabelecimento_id, profissional_id, usuario_id, dia, horario, duracao_min,
    nome_cliente, telefone_cliente, servicos, valor_total_centavos,
    status_pagamento, status, servico_ids, observacoes
  ) VALUES (
    v_est_id, v_prof1_id, NULL, CURRENT_DATE, '14:00', 50,
    'Cliente Avulso', '31977776666', 'Corte Clássico + Barba Completa', 5500,
    'no_local'::status_pagamento_enum, 'agendado'::status_agendamento_enum, ARRAY[v_svc1_id, v_svc2_id], NULL
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.item_agendamento (agendamento_id, servico_id, preco_cobrado_centavos, duracao_min, ordem)
  SELECT a.id, v_svc1_id, 3500, 30, 1
  FROM public.agendamentos a
  WHERE a.estabelecimento_id = v_est_id AND a.profissional_id = v_prof1_id AND a.dia = CURRENT_DATE AND a.horario = '14:00'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.item_agendamento (agendamento_id, servico_id, preco_cobrado_centavos, duracao_min, ordem)
  SELECT a.id, v_svc2_id, 2500, 25, 2
  FROM public.agendamentos a
  WHERE a.estabelecimento_id = v_est_id AND a.profissional_id = v_prof1_id AND a.dia = CURRENT_DATE AND a.horario = '14:00'
  ON CONFLICT DO NOTHING;

  -- Agendamento 3: Pedro, hoje 11:00, 30 min (profissional DIFERENTE - deve permitir)
  INSERT INTO public.agendamentos (
    estabelecimento_id, profissional_id, usuario_id, dia, horario, duracao_min,
    nome_cliente, telefone_cliente, servicos, valor_total_centavos,
    status_pagamento, status, servico_ids, observacoes
  ) VALUES (
    v_est_id, v_prof2_id, NULL, CURRENT_DATE, '11:00', 30,
    'Cliente Pedro', '31966665555', 'Corte Infantil', 3000,
    'no_local'::status_pagamento_enum, 'agendado'::status_agendamento_enum, ARRAY[v_svc1_id], NULL
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.item_agendamento (agendamento_id, servico_id, preco_cobrado_centavos, duracao_min, ordem)
  SELECT a.id, v_svc1_id, 3000, 30, 1
  FROM public.agendamentos a
  WHERE a.estabelecimento_id = v_est_id AND a.profissional_id = v_prof2_id AND a.dia = CURRENT_DATE AND a.horario = '11:00'
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- AVALIAÇÕES
  -- ============================================================================

  INSERT INTO public.avaliacoes (estabelecimento_id, agendamento_id, usuario_id, nome_cliente, estrelas, comentario)
  SELECT v_est_id, a.id, v_cliente_id, 'João Cliente', 5, 'Excelente atendimento! Carlos é muito profissional.'
  FROM public.agendamentos a
  WHERE a.estabelecimento_id = v_est_id AND a.usuario_id = v_cliente_id
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- SEGUIDORES
  -- ============================================================================

  INSERT INTO public.seguidores (usuario_id, estabelecimento_id) VALUES
    (v_cliente_id, v_est_id)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- CURTIDAS / SALVOS
  -- ============================================================================

  INSERT INTO public.curtidas (publicacao_id, usuario_id) VALUES
    ('ppp11111-1111-1111-1111-111111111111', v_cliente_id),
    ('ppp33333-3333-3333-3333-333333333333', v_cliente_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.salvos (publicacao_id, usuario_id) VALUES
    ('ppp44444-4444-4444-4444-444444444444', v_cliente_id)
  ON CONFLICT DO NOTHING;

  -- Atualiza contadores nas publicações
  UPDATE public.publicacoes SET
    curtidas_count = (SELECT COUNT(*) FROM public.curtidas WHERE publicacao_id = publicacoes.id),
    salvos_count = (SELECT COUNT(*) FROM public.salvos WHERE publicacao_id = publicacoes.id);

  -- ============================================================================
  -- COMENTÁRIOS
  -- ============================================================================

  INSERT INTO public.comentarios (publicacao_id, autor_id, autor_nome, texto)
  VALUES
    ('ppp11111-1111-1111-1111-111111111111', v_cliente_id, 'João Cliente', 'Ficou show! Obrigado Carlos!'),
    ('ppp33333-3333-3333-3333-333333333333', v_cliente_id, 'João Cliente', 'Vou agendar o combo na próxima!')
  ON CONFLICT DO NOTHING;

  UPDATE public.publicacoes SET
    comentarios_count = (SELECT COUNT(*) FROM public.comentarios WHERE publicacao_id = publicacoes.id);

  -- ============================================================================
  -- BLOQUEIOS DE AGENDA (exemplo: férias do Pedro)
  -- ============================================================================

  INSERT INTO public.bloqueios_agenda (profissional_id, inicio, fim, motivo, tipo) VALUES
    (v_prof2_id, (CURRENT_DATE + interval '10 days')::date + '10:00'::time, (CURRENT_DATE + interval '10 days')::date + '14:00'::time, 'Consulta médica', 'bloqueio')
  ON CONFLICT DO NOTHING;

END $$;

-- ============================================================================
-- FIM DO SEED
-- ============================================================================