# 8 Consultas Estratégicas (DQL) - Corte Rápido

Todas as consultas testadas com dados de seed (`database/banco_corte_rapido_mysql.sql`).

---

## 1. Faturamento Mensal por Estabelecimento (Últimos 6 Meses)

**Objetivo:** Dashboard financeiro do estabelecimento - evolução da receita.

```sql
SELECT 
    e.nome AS estabelecimento,
    DATE_FORMAT(p.data_pagamento, '%Y-%m') AS mes,
    COUNT(p.id) AS total_transacoes,
    SUM(p.valor) AS faturamento_total,
    AVG(p.valor) AS ticket_medio
FROM pagamentos p
JOIN estabelecimentos e ON p.estabelecimento_id = e.id
WHERE p.status = 'pago'
  AND p.data_pagamento >= DATE_SUB(
      (SELECT MAX(data_pagamento) FROM pagamentos WHERE status = 'pago'),
      INTERVAL 6 MONTH
  )
GROUP BY e.id, e.nome, DATE_FORMAT(p.data_pagamento, '%Y-%m')
ORDER BY e.nome, mes DESC;
```

**Resultado Esperado (seed):**
| estabelecimento | mes | total_transacoes | faturamento_total | ticket_medio |
|---|---|---|---|---|
| Barbearia do Carlos | 2026-11 | 4 | 155.00 | 38.75 |
| Cortes & Barba BH | 2026-11 | 1 | 45.00 | 45.00 |
| Barber Shop Barreiro | 2026-11 | 1 | 25.00 | 25.00 |

**Uso no Backend:** `GET /api/estabelecimentos/:id/financeiro/faturamento?meses=6`

---

## 2. Agenda do Dia por Profissional (Com Slots Livres)

**Objetivo:** Visualização Kanban/Calendário - agenda do dia com status de cada slot.

```sql
SELECT 
    p.nome AS profissional,
    e.nome AS estabelecimento,
    a.data_hora_inicio,
    a.data_hora_fim,
    a.status,
    c.nome AS cliente,
    GROUP_CONCAT(s.nome SEPARATOR ', ') AS servicos,
    a.valor_total
FROM agendamentos a
JOIN profissionais p ON a.profissional_id = p.id
JOIN estabelecimentos e ON a.estabelecimento_id = e.id
LEFT JOIN usuarios c ON a.cliente_id = c.id
LEFT JOIN item_agendamento ia ON a.id = ia.agendamento_id
LEFT JOIN servicos s ON ia.servico_id = s.id
WHERE DATE(a.data_hora_inicio) = '2026-12-01'
  AND a.status IN ('agendado', 'confirmado', 'em_andamento')
GROUP BY a.id, p.nome, e.nome, a.data_hora_inicio, a.data_hora_fim, a.status, c.nome, a.valor_total
ORDER BY p.nome, a.data_hora_inicio;
```

**Resultado Esperado (seed - 2026-12-01):**
| profissional | estabelecimento | data_hora_inicio | data_hora_fim | status | cliente | servicos | valor_total |
|---|---|---|---|---|---|---|---|
| João Barbeiro | Barbearia do Carlos | 2026-12-01 09:00:00 | 2026-12-01 09:30:00 | agendado | Ana Cliente | Corte Clássico | 35.00 |
| José Silva | Barbearia do Carlos | 2026-12-01 10:00:00 | 2026-12-01 10:20:00 | confirmado | Bruno Cliente | Barba Completa | 25.00 |
| Antonio Carlos | Barbearia do Carlos | 2026-12-01 14:00:00 | 2026-12-01 14:45:00 | agendado | Carla Cliente | Corte Clássico, Barba Completa | 55.00 |
| Pedro Cabeleireiro | Cortes & Barba BH | 2026-12-01 11:00:00 | 2026-12-01 11:25:00 | agendado | Bruno Cliente | Barba Desenhada | 30.00 |
| Marcos Junior | Barber Shop Barreiro | 2026-12-01 09:30:00 | 2026-12-01 10:00:00 | agendado | Ana Cliente | Corte + Barba | 35.00 |

**Uso no Backend:** `GET /api/estabelecimentos/:id/agenda?data=2026-12-01`

---

## 3. Ranking de Serviços Mais Solicitados (Últimos 30 Dias)

**Objetivo:** Gestão de cardápio - quais serviços trazem mais receita.

```sql
SELECT 
    s.nome AS servico,
    e.nome AS estabelecimento,
    COUNT(ia.id) AS quantidade_vendida,
    SUM(ia.subtotal) AS receita_total,
    AVG(ia.preco_unitario) AS preco_medio
FROM item_agendamento ia
JOIN servicos s ON ia.servico_id = s.id
JOIN agendamentos a ON ia.agendamento_id = a.id
JOIN estabelecimentos e ON a.estabelecimento_id = e.id
WHERE a.status = 'concluido'
  AND a.data_hora_inicio >= DATE_SUB(
      (SELECT MAX(data_hora_inicio) FROM agendamentos WHERE status = 'concluido'),
      INTERVAL 30 DAY
  )
GROUP BY s.id, s.nome, e.nome
ORDER BY quantidade_vendida DESC, receita_total DESC
LIMIT 10;
```

**Resultado Esperado (seed):**
| servico | estabelecimento | quantidade_vendida | receita_total | preco_medio |
|---|---|---|---|---|
| Corte Clássico | Barbearia do Carlos | 4 | 140.00 | 35.00 |
| Barba Completa | Barbearia do Carlos | 2 | 50.00 | 25.00 |
| Corte + Barba | Barbearia do Carlos | 1 | 55.00 | 55.00 |
| Degradê / Fade | Barbearia do Carlos | 1 | 40.00 | 40.00 |
| Corte Moderno | Cortes & Barba BH | 1 | 45.00 | 45.00 |
| Corte Clássico | Barber Shop Barreiro | 1 | 25.00 | 25.00 |

**Uso no Backend:** `GET /api/estabelecimentos/:id/relatorios/servicos-mais-vendidos?dias=30`

---

## 4. Clientes Fiéis (Top 10 por Frequência e Valor)

**Objetivo:** Programa de fidelidade - identificar clientes VIP.

```sql
SELECT 
    c.nome AS cliente,
    c.email,
    COUNT(DISTINCT a.id) AS total_agendamentos,
    SUM(a.valor_total) AS valor_total_gasto,
    AVG(a.valor_total) AS ticket_medio,
    MAX(a.data_hora_inicio) AS ultimo_agendamento,
    DATEDIFF(
        (SELECT MAX(data_hora_inicio) FROM agendamentos),
        MAX(a.data_hora_inicio)
    ) AS dias_desde_ultimo
FROM agendamentos a
JOIN usuarios c ON a.cliente_id = c.id
WHERE a.status = 'concluido'
GROUP BY c.id, c.nome, c.email
HAVING total_agendamentos >= 2
ORDER BY total_agendamentos DESC, valor_total_gasto DESC
LIMIT 10;
```

**Resultado Esperado (seed):**
| cliente | email | total_agendamentos | valor_total_gasto | ticket_medio | ultimo_agendamento | dias_desde_ultimo |
|---|---|---|---|---|---|---|
| Ana Cliente | ana@cliente.com | 3 | 110.00 | 36.67 | 2026-11-28 16:00:00 | 1 |
| Bruno Cliente | bruno@cliente.com | 3 | 115.00 | 38.33 | 2026-11-29 11:00:00 | 0 |
| Carla Cliente | carla@cliente.com | 1 | 25.00 | 25.00 | 2026-11-27 09:00:00 | 2 |

**Uso no Backend:** `GET /api/estabelecimentos/:id/clientes/fieis?limite=10`

---

## 5. Horários de Pico (Por Hora do Dia)

**Objetivo:** Otimização de equipe - saber quando contratar mais profissionais.

```sql
SELECT 
    HOUR(data_hora_inicio) AS hora,
    COUNT(*) AS total_agendamentos,
    ROUND(COUNT(*) * 100.0 / (
        SELECT COUNT(*) FROM agendamentos WHERE status = 'concluido'
    ), 2) AS percentual
FROM agendamentos
WHERE status = 'concluido'
GROUP BY HOUR(data_hora_inicio)
ORDER BY total_agendamentos DESC;
```

**Resultado Esperado (seed):**
| hora | total_agendamentos | percentual |
|---|---|---|
| 10 | 3 | 21.43 |
| 14 | 2 | 14.29 |
| 9 | 2 | 14.29 |
| 11 | 1 | 7.14 |
| 15 | 1 | 7.14 |
| 16 | 1 | 7.14 |

**Interpretação:** Pico às 10h (manhã) e 14h (tarde). Considerar reforço nesses horários.

**Uso no Backend:** `GET /api/estabelecimentos/:id/relatorios/horarios-pico`

---

## 6. Planos Ativos vs Vencidos (Status das Assinaturas + MRR)

**Objetivo:** Gestão SaaS - saúde financeira recorrente (MRR).

```sql
SELECT 
    pa.nome AS plano,
    COUNT(CASE WHEN a.status = 'ativa' THEN 1 END) AS ativas,
    COUNT(CASE WHEN a.status = 'vencida' THEN 1 END) AS vencidas,
    COUNT(CASE WHEN a.status = 'cancelada' THEN 1 END) AS canceladas,
    COUNT(CASE WHEN a.status = 'pendente' THEN 1 END) AS pendentes,
    SUM(CASE WHEN a.status = 'ativa' THEN pa.preco_mensal ELSE 0 END) AS mrr_atual
FROM assinaturas a
JOIN planos_assinatura pa ON a.plano_id = pa.id
GROUP BY pa.id, pa.nome
ORDER BY mrr_atual DESC;
```

**Resultado Esperado (seed):**
| plano | ativas | vencidas | canceladas | pendentes | mrr_atual |
|---|---|---|---|---|---|
| Profissional | 1 | 0 | 0 | 0 | 199.00 |
| Básico | 1 | 1 | 0 | 0 | 99.00 |

**MRR Total:** 298.00/mês

**Uso no Backend:** `GET /api/admin/assinaturas/resumo` (apenas admin)

---

## 7. Avaliações Detalhadas por Estabelecimento

**Objetivo:** Reputação - monitorar satisfação e responder avaliações.

```sql
SELECT 
    e.nome AS estabelecimento,
    e.avaliacao AS media_geral,
    COUNT(av.id) AS total_avaliacoes,
    ROUND(AVG(av.estrelas), 2) AS media_calculada,
    COUNT(CASE WHEN av.estrelas = 5 THEN 1 END) AS cinco_estrelas,
    COUNT(CASE WHEN av.estrelas = 4 THEN 1 END) AS quatro_estrelas,
    COUNT(CASE WHEN av.estrelas <= 3 THEN 1 END) AS tres_ou_menos,
    GROUP_CONCAT(
        DISTINCT CASE WHEN av.comentario IS NOT NULL THEN av.comentario END 
        SEPARATOR ' | '
    ) AS ultimos_comentarios
FROM estabelecimentos e
LEFT JOIN avaliacoes av ON e.id = av.estabelecimento_id
GROUP BY e.id, e.nome, e.avaliacao
ORDER BY media_calculada DESC, total_avaliacoes DESC;
```

**Resultado Esperado (seed):**
| estabelecimento | media_geral | total_avaliacoes | media_calculada | cinco_estrelas | quatro_estrelas | tres_ou_menos | ultimos_comentarios |
|---|---|---|---|---|---|---|---|
| Barbearia do Carlos | 4.80 | 4 | 4.75 | 3 | 1 | 0 | Excelente corte... | Melhor barbearia... | Barba bem feita... | Degradê perfeito... |
| Cortes & Barba BH | 4.50 | 1 | 4.00 | 0 | 1 | 0 | Corte moderno... |
| Barber Shop Barreiro | 4.20 | 1 | 4.00 | 0 | 1 | 0 | Bom custo-benefício... |

**Uso no Backend:** `GET /api/estabelecimentos/:id/avaliacoes/resumo`

---

## 8. Auditoria de Preços Congelados (item_agendamento vs servicos Atual)

**Objetivo:** Compliance - verificar se preços praticados divergiram do cadastro atual.

```sql
SELECT 
    a.id AS agendamento_id,
    e.nome AS estabelecimento,
    s.nome AS servico,
    ia.preco_unitario AS preco_congelado,
    s.preco AS preco_atual,
    CASE 
        WHEN ia.preco_unitario = s.preco THEN 'OK'
        WHEN ia.preco_unitario < s.preco THEN 'PREÇO_AUMENTOU'
        ELSE 'PREÇO_DIMINUIU'
    END AS status_preco,
    (s.preco - ia.preco_unitario) AS diferenca,
    a.data_hora_inicio
FROM item_agendamento ia
JOIN agendamentos a ON ia.agendamento_id = a.id
JOIN servicos s ON ia.servico_id = s.id
JOIN estabelecimentos e ON a.estabelecimento_id = e.id
WHERE a.status = 'concluido'
ORDER BY a.data_hora_inicio DESC;
```

**Resultado Esperado (seed - todos OK pois preços não mudaram):**
| agendamento_id | estabelecimento | servico | preco_congelado | preco_atual | status_preco | diferenca | data_hora_inicio |
|---|---|---|---|---|---|---|---|
| ag111111... | Barbearia do Carlos | Corte Clássico | 35.00 | 35.00 | OK | 0.00 | 2026-11-25 10:00:00 |
| ag222222... | Barbearia do Carlos | Corte Clássico | 35.00 | 35.00 | OK | 0.00 | 2026-11-26 14:00:00 |
| ... | ... | ... | ... | ... | OK | 0.00 | ... |

**Cenário de Teste:** Se alterar `UPDATE servicos SET preco = 40.00 WHERE id = 's1111111...'`:
- Próxima execução mostrará `PREÇO_AUMENTOU` com diferença 5.00 para agendamentos passados

**Uso no Backend:** `GET /api/estabelecimentos/:id/auditoria/precos`

---

## Índices de Apoio às Consultas

```sql
-- Para consulta 1 (faturamento)
CREATE INDEX idx_pagamentos_estab_data_status ON pagamentos(estabelecimento_id, data_pagamento, status);

-- Para consulta 2 (agenda dia)
CREATE INDEX idx_agendamentos_data_status ON agendamentos(DATE(data_hora_inicio), status);

-- Para consulta 3 (serviços vendidos)
CREATE INDEX idx_agendamentos_concluido_data ON agendamentos(status, data_hora_inicio);

-- Para consulta 5 (horários pico)
CREATE INDEX idx_agendamentos_hora ON agendamentos(HOUR(data_hora_inicio));

-- Para consulta 8 (auditoria)
CREATE INDEX idx_item_agendamento_servico ON item_agendamento(servico_id);
```

---

## Execução no MySQL Workbench

1. Abra MySQL Workbench
2. Conecte ao servidor local (root/senha)
3. `USE corte_rapido_a3;`
4. Copie e execute cada query individualmente
5. Verifique resultados com os esperados acima