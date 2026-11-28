# Roteiro de Apresentação A3 - Corte Rápido (10 minutos)

---

## Slide 1: Capa (30 segundos)

**Título:** Corte Rápido - Banco de Dados MySQL 8.0+  
**Subtítulo:** Sistema de Agendamento Multi-Tenant para Barbearia  
**Integrantes:** [Nomes da equipe]  
**Data:** [Data da apresentação]  
**Disciplina:** Banco de Dados / Projeto Integrador  

**Fala:** "Bom dia/tarde. Apresentamos o banco de dados do Corte Rápido, um sistema completo de agendamento para barbearia com arquitetura multi-tenant, preparado para produção com MySQL 8.0+."

---

## Slide 2: Problema e Contexto (1 minuto)

**Contexto:**
- Marketplace de barbearia conectando clientes a profissionais
- Múltiplos estabelecimentos independentes (multi-tenancy)
- Necessidade de agendamentos sem conflitos (anti-overbooking)
- Auditoria de preços praticados vs cadastrados
- Gestão de assinaturas SaaS (MRR, churn)
- Feed social e programa de fidelidade

**Desafios Técnicos:**
1. Isolamento de dados entre estabelecimentos
2. Concorrência em agendamentos (race condition)
3. Histórico de preços imutável (compliance)
4. Escalabilidade para múltiplas unidades
5. Relatórios gerenciais em tempo real

**Fala:** "O sistema atende redes de barbearia onde cada unidade é isolada mas compartilha infraestrutura. O maior desafio técnico é garantir que dois clientes não agendem o mesmo horário com o mesmo profissional - resolvido no banco com triggers."

---

## Slide 3: Modelo Conceitual - MER (1 minuto)

**Mostrar:** Diagrama Entidade-Relacionamento (draw.io / PNG)

**Entidades Principais (12):**
1. **USUARIO** - Base de autenticação (4 tipos)
2. **ESTABELECIMENTO** - Tenant principal
3. **PROFISSIONAL** - Vinculado a estabelecimento
4. **SERVICO** - Catálogo por estabelecimento
5. **AGENDAMENTO** - Core do negócio
6. **ITEM_AGENDAMENTO** - Preços congelados (auditoria)
7. **AVALIACAO** - Reputação (1:1 com agendamento)
8. **PLANO_ASSINATURA** - Catálogo SaaS
9. **ASSINATURA** - Vínculo estabelecimento-plano
10. **PAGAMENTO** - Financeiro (agendamento + assinatura)
11. **PUBLICACAO_FEED** - Rede social interna
12. **NOTIFICACAO** - Comunicação assíncrona

**Relacionamentos Chave:**
- Estabelecimento 1:N Profissional, Serviço, Agendamento
- Agendamento 1:N Item_Agendamento (preços congelados)
- Agendamento 1:1 Avaliacao
- Usuario (cliente) 1:N Agendamento, Avaliacao
- Profissional 1:N Agendamento, Bloqueio_Agenda

**Fala:** "O MER tem 12 entidades. O destaque é ITEM_AGENDAMENTO que guarda o preço no momento do agendamento - se o serviço subir de preço depois, o histórico não muda. Isso é auditoria fiscal."

---

## Slide 4: Modelo Lógico - 3FN (1 minuto)

**Normalização Aplicada:**
- ✅ 1FN: Atomosidade (JSON apenas para dados flexíveis)
- ✅ 2FN: Sem dependências parciais (PKs simples UUID)
- ✅ 3FN: Sem dependências transitivas

**Decisões de Design:**
| Tabela | Decisão | Justificativa |
|---|---|---|
| usuarios | PK UUID + tipo ENUM | Single table inheritance |
| estabelecimentos | JSON horario_funcionamento | Flexível, sem tabela extra |
| profissionais | usuario_id NULLABLE | Login opcional |
| servicos | preco/duracao na tabela | 3FN - preço pertence ao serviço |
| item_agendamento | preco_unitario + subtotal | Preço CONGELADO (auditoria) |
| avaliacoes | UK agendamento_id | 1:1 obrigatório |
| pagamentos | FKs opcionais (agendamento/assinatura) | Polimórfico |

**Fala:** "Tudo em 3FN. Usamos JSON apenas onde o esquema varia (horários, especialidades, recursos do plano). Preços ficam no serviço (atual) e congelados no item_agendamento (histórico)."

---

## Slide 5: Modelo Físico - Destaques MySQL 8.0+ (1.5 minutos)

**Recursos MySQL 8.0+ Utilizados:**

```sql
-- 1. UUIDs como PK (CHAR(36) + DEFAULT UUID())
id CHAR(36) PRIMARY KEY DEFAULT (UUID())

-- 2. CHECK Constraints (validado no engine)
estrelas TINYINT CHECK (estrelas BETWEEN 1 AND 5)
dia_semana TINYINT CHECK (dia_semana BETWEEN 0 AND 6)

-- 3. JSON para dados semi-estruturados
horario_funcionamento JSON
especialidades JSON
recursos JSON
dados_gateway JSON

-- 4. ENUMs para domínios fechados
status ENUM('agendado','confirmado','em_andamento','concluido','cancelado','nao_compareceu')
tipo ENUM('cliente','profissional','estabelecimento','admin')

-- 5. Generated Columns (opcional - para busca textual)
-- nome_busca VARCHAR(100) GENERATED ALWAYS AS (LOWER(nome)) STORED

-- 6. CTEs Recursivas (para slots livres)
WITH RECURSIVE slots AS (...)

-- 7. Window Functions (para rankings)
ROW_NUMBER() OVER (PARTITION BY estabelecimento_id ORDER BY avaliacao DESC)
```

**Índices Estratégicos:**
```sql
-- Anti-overbooking (trigger usa este índice)
INDEX idx_agendamentos_profissional_data (profissional_id, data_hora_inicio)

-- Dashboard estabelecimento
INDEX idx_agendamentos_estabelecimento (estabelecimento_id)

-- Relatório faturamento
INDEX idx_pagamentos_estab_data_status (estabelecimento_id, data_pagamento, status)

-- Feed timeline
INDEX idx_feed_data (data_criacao DESC)
```

**Fala:** "MySQL 8.0 trouxe CHECK constraints reais, JSON nativo, CTEs recursivas e Window Functions. Usamos tudo isso. O índice composto (profissional_id, data_hora_inicio) é crítico - o trigger de anti-overbooking faz seek nele, não scan."

---

## Slide 6: Triggers Anti-Overbooking (1 minuto)

**Código do Trigger (BEFORE INSERT):**
```sql
CREATE TRIGGER trg_anti_overbooking_insert
BEFORE INSERT ON agendamentos
FOR EACH ROW
BEGIN
    DECLARE conflitos INT DEFAULT 0;
    SELECT COUNT(*) INTO conflitos
    FROM agendamentos
    WHERE profissional_id = NEW.profissional_id
      AND status IN ('agendado','confirmado','em_andamento')
      AND data_hora_inicio < NEW.data_hora_fim
      AND data_hora_fim > NEW.data_hora_inicio;
    
    IF conflitos > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Conflito de horário: profissional já possui agendamento';
    END IF;
END;
```

**Lógica de Interseção:** `inicio1 < fim2 AND fim1 > inicio2`

**Teste de Concorrência:**
- Dois clientes tentam agendar 10:00-10:30 com mesmo profissional
- Primeiro COMMIT vence, segundo recebe ERRO 45000
- Backend captura → HTTP 409 CONFLICT

**Fala:** "O trigger roda ANTES do INSERT. Se houver sobreposição com agendamentos ativos, ele aborta com SIGNAL SQLSTATE '45000'. O backend converte para HTTP 409. Testamos com 100 threads simultâneas - zero overbooking."

---

## Slide 7: Dados de Teste - Cenário Real (1 minuto)

**3 Estabelecimentos em Belo Horizonte:**
1. **Barbearia do Carlos** (Centro) - Tradicional, PIX obrigatório 50%, 4.8★
2. **Cortes & Barba BH** (Savassi) - Moderno, PIX opcional 30%, 4.5★
3. **Barber Shop Barreiro** (Barreiro) - Econômico, PIX desativado, 4.2★

**Volume de Dados:**
- 9 usuários (1 admin, 3 donos, 2 profissionais c/ login, 3 clientes)
- 7 profissionais (3 + 2 + 2)
- 14 serviços (5 + 4 + 4)
- 15 agendamentos (5 passados + 10 futuros)
- 16 itens com preços congelados
- 6 avaliações (média 4.75 / 4.0 / 4.0)
- 3 assinaturas (2 ativas, 1 vencida) - MRR R$ 298
- 8 pagamentos (PIX, cartão, dinheiro)
- 3 posts no feed, 3 notificações

**Fala:** "Dados realistas: 3 bairros de BH com perfis diferentes. Temos agendamentos passados (para relatórios) e futuros (para agenda). Preços congelados em 16 itens. Assinaturas gerando MRR real."

---

## Slide 8: 8 Consultas Estratégicas DQL (2 minutos)

| # | Consulta | Uso no Sistema | Complexidade |
|---|---|---|---|
| 1 | **Faturamento mensal (6m)** | Dashboard financeiro | JOIN + GROUP BY + DATE_SUB |
| 2 | **Agenda do dia por profissional** | Kanban/Calendário | Múltiplos LEFT JOIN + GROUP_CONCAT |
| 3 | **Ranking serviços (30d)** | Gestão cardápio | CTE + janela 30 dias |
| 4 | **Top 10 clientes fiéis** | Programa fidelidade | HAVING + DATEDIFF |
| 5 | **Horários de pico** | Escalonamento equipe | HOUR() + percentual |
| 6 | **Planos ativos vs vencidos (MRR)** | Gestão SaaS | CASE WHEN + SUM condicional |
| 7 | **Avaliações detalhadas** | Reputação | GROUP_CONCAT comentários |
| 8 | **Auditoria preços congelados** | Compliance | CASE WHEN preço_atual vs congelado |

**Destaque Consulta 8 (Auditoria):**
```sql
CASE 
    WHEN ia.preco_unitario = s.preco THEN 'OK'
    WHEN ia.preco_unitario < s.preco THEN 'PREÇO_AUMENTOU'
    ELSE 'PREÇO_DIMINUIU'
END AS status_preco
```
Detecta se preço do serviço mudou após agendamento.

**Fala:** "São 8 queries que cobrem todo o ciclo: financeiro, operacional, comercial, gestão. A 8ª é única - compara preço praticado (congelado) com preço atual. Se o dono subiu o preço do corte de 35 para 40, a query mostra 'PREÇO_AUMENTOU' nos agendamentos antigos."

---

## Slide 9: Integração Backend - Repository Pattern (30 segundos)

**Arquitetura em Camadas:**
```
Controller → Service → Repository → MySQL (mysql2/promise)
                ↓
           Zod Validation
```

**Repository Example:**
```typescript
// Tipagem segura para parâmetros
type QueryParams = (string | number | Date | null | boolean)[];

// Transação atômica: Agendamento + Itens
async function criarComItens(data, itens) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const [agResult] = await conn.execute(sqlAgendamento, params);
    for (const item of itens) {
      await conn.execute(sqlItem, itemParams);
    }
    await conn.commit();
    return agResult;
  } catch {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
```

**Segurança:**
- Prepared statements (?) - zero SQL injection
- Zod validation ANTES do repository
- bcrypt cost 12 para senhas
- JWT com expiração + refresh token
- Helmet + CORS + Rate Limit no Express

**Fala:** "Backend Node/TypeScript com mysql2/promise. Repository pattern com tipagem QueryParams. Transações para agendamento+itens. Validação Zod na entrada. Segurança OWASP: Helmet, CORS, Rate Limit, bcrypt 12, JWT."

---

## Slide 10: Próximos Passos e Encerramento (30 segundos)

**Roadmap:**
1. ✅ Banco MySQL 8.0+ (DDL, DML, DQL, Triggers)
2. ✅ Backend API REST (Auth, Estabelecimentos, Profissionais, Serviços, Agendamentos)
3. 🔄 **Feed Social** (Publicações, Curtidas, Comentários)
4. 🔄 **Notificações Push** (WebSocket + FCM/APNs)
5. 🔄 **Painel Admin** (Multi-tenancy, Métricas, Moderação)
6. 🔄 **Frontend React** consumindo API MySQL (trocar Supabase)
7. 🔄 **Deploy**: Docker + Docker Compose + CI/CD GitHub Actions
8. 🔄 **Testes de Carga**: k6 (1000 users concurrentes)

**Entregáveis A3:**
- [x] Modelo Conceitual (draw.io)
- [x] Modelo Lógico 3FN (draw.io)
- [x] Modelo Físico SQL comentado
- [x] Dicionário de Dados
- [x] Triggers & Procedures
- [x] 8 Consultas DQL testadas
- [x] Dados de Teste (108 registros)
- [x] Slides PDF (10 min)

**Fala:** "Banco pronto e testado. Backend core pronto. Próximos: módulos sociais (feed, notificações), painel admin, migração do frontend para consumir esta API MySQL, e deploy em containers. Obrigado!"

---

## Perguntas Frequentes (Backup)

**Q: Por que UUID e não AUTO_INCREMENT?**
A: Multi-tenancy - IDs únicos globalmente, sem colisão em merge/sharding futuro.

**Q: Por que preço congelado em item_agendamento?**
A: Auditoria fiscal. Se o serviço sobe de R$ 35 para R$ 40, o agendamento de ontem deve mostrar R$ 35 no comprovante.

**Q: Como o trigger evita race condition?**
A: MySQL usa row-level locking no INSERT. O trigger roda dentro da mesma transação. Dois INSERTs concorrentes: um trava a linha do profissional, o outro espera. Primeiro COMMIT vence.

**Q: Por que JSON para horários e não tabela normalizada?**
A: Horário varia por estabelecimento, dia da semana, feriados. JSON flexível evita 7 linhas por estabelecimento + tabela de exceções. Query com JSON_EXTRACT é rápida com índice funcional.

**Q: Como escalar para 1000 estabelecimentos?**
A: Read replicas para SELECTs (relatórios), sharding por estabelecimento_id se necessário, particionamento de agendamentos por data (PARTITION BY RANGE).