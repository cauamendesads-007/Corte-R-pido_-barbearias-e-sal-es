# Checklist de Entrega - Apresentação A3 Banco de Dados

## 📁 Arquivos Obrigatórios

### Modelagem
- [ ] **modelo_conceitual.drawio** - Diagrama Entidade-Relacionamento (MER)
  - [ ] 12 entidades representadas
  - [ ] Relacionamentos com cardinalidades (1:N, 1:1, N:M)
  - [ ] Identificadores (PK) e chaves estrangeiras (FK)
  - [ ] Atributos principais em cada entidade
  - [ ] Exportado como PNG/PDF para slides

- [ ] **modelo_logico.drawio** - Modelo Lógico (3FN)
  - [ ] Tabelas normalizadas (3FN)
  - [ ] Chaves primárias e estrangeiras explícitas
  - [ ] Tipos de dados MySQL 8.0+
  - [ ] Constraints (NOT NULL, UNIQUE, CHECK, DEFAULT)
  - [ ] Índices sugeridos
  - [ ] Exportado como PNG/PDF

- [ ] **modelo_fisico.sql** - DDL MySQL 8.0+ Comentado
  - [ ] `CREATE DATABASE` + `USE`
  - [ ] 14 tabelas com `CREATE TABLE`
  - [ ] Comentários em cada coluna (`COMMENT '...'`)
  - [ ] Constraints nomeadas (`CONSTRAINT chk_estrelas CHECK...`)
  - [ ] Índices criados explicitamente
  - [ ] 2 Triggers anti-overbooking
  - [ ] Procedures/Functions auxiliares
  - [ ] `SHOW TABLES` e `SHOW TRIGGERS` no final

### Documentação
- [ ] **dicionario_dados.md** - Dicionário completo
  - [ ] Todas as 14 tabelas documentadas
  - [ ] Colunas: nome, tipo, restrições, descrição
  - [ ] Índices listados por tabela
  - [ ] Regras de negócio por tabela

- [ ] **triggers_procedures.md** - Triggers e Procedures
  - [ ] trg_anti_overbooking_insert (código + explicação)
  - [ ] trg_anti_overbooking_update (código + explicação)
  - [ ] Lógica de interseção de intervalos
  - [ ] sp_slots_livres (procedure agenda)
  - [ ] sp_atualizar_avaliacao_estabelecimento
  - [ ] sp_faturamento_mensal
  - [ ] fn_verificar_disponibilidade
  - [ ] Triggers de auditoria de avaliação

- [ ] **consultas_dql.md** - 8 Consultas Estratégicas
  - [ ] Query 1: Faturamento mensal (6 meses)
  - [ ] Query 2: Agenda do dia por profissional
  - [ ] Query 3: Ranking serviços (30 dias)
  - [ ] Query 4: Top 10 clientes fiéis
  - [ ] Query 5: Horários de pico
  - [ ] Query 6: Planos ativos vs vencidos (MRR)
  - [ ] Query 7: Avaliações detalhadas
  - [ ] Query 8: Auditoria preços congelados
  - [ ] Resultado esperado para cada (com dados do seed)
  - [ ] Índices de apoio sugeridos

- [ ] **dados_teste.md** - Dados de Teste (DML)
  - [ ] 9 usuários (tipos variados)
  - [ ] 3 estabelecimentos (BH - Centro, Savassi, Barreiro)
  - [ ] 18 horários funcionamento
  - [ ] 7 profissionais (com/sem login)
  - [ ] 14 serviços (preços/durações variados)
  - [ ] 15 agendamentos (passados + futuros)
  - [ ] 16 itens agendamento (preços congelados)
  - [ ] 6 avaliações (1-5 estrelas)
  - [ ] 3 planos assinatura
  - [ ] 3 assinaturas (ativa/vencida)
  - [ ] 8 pagamentos (múltiplos métodos)
  - [ ] 3 publicações feed
  - [ ] 3 notificações
  - [ ] Total: 108 registros
  - [ ] Cenários de teste cobertos listados

### Apresentação
- [ ] **slides_apresentacao.md** - Roteiro 10 min
  - [ ] Slide 1: Capa (30s)
  - [ ] Slide 2: Problema/Contexto (1min)
  - [ ] Slide 3: MER (1min)
  - [ ] Slide 4: Modelo Lógico 3FN (1min)
  - [ ] Slide 5: Modelo Físico MySQL 8.0+ (1.5min)
  - [ ] Slide 6: Triggers Anti-Overbooking (1min)
  - [ ] Slide 7: Dados de Teste (1min)
  - [ ] Slide 8: 8 Consultas DQL (2min)
  - [ ] Slide 9: Integração Backend (30s)
  - [ ] Slide 10: Próximos Passos (30s)
  - [ ] FAQ de backup (5 perguntas)

- [ ] **slides.pdf** ou **slides.pptx** - Slides visuais
  - [ ] 10 slides + capa
  - [ ] Diagramas (MER, Lógico) como imagens
  - [ ] Código SQL formatado (monospace, destaque)
  - [ ] Tabelas de resultados esperados
  - [ ] Tempo total ≤ 10 minutos

### Execução
- [ ] **README.md** - Instruções
  - [ ] Como gerar diagramas (draw.io)
  - [ ] Como executar SQL no MySQL Workbench
  - [ ] Credenciais de teste (usuários/senhas)
  - [ ] Estrutura da pasta explicada

## ✅ Validação Técnica

### MySQL 8.0+
- [ ] `CREATE DATABASE` com `utf8mb4_unicode_ci`
- [ ] `CHAR(36)` + `DEFAULT (UUID())` para PKs
- [ ] `CHECK` constraints validadas (estrelas 1-5, dia_semana 0-6)
- [ ] `JSON` columns para dados flexíveis
- [ ] `ENUM` para domínios fechados
- [ ] `DECIMAL(10,2)` para moeda
- [ ] `TIMESTAMP` com `DEFAULT CURRENT_TIMESTAMP` + `ON UPDATE`
- [ ] Triggers com `SIGNAL SQLSTATE '45000'`
- [ ] Procedures com `DELIMITER $$`
- [ ] CTE Recursiva (`WITH RECURSIVE`) para slots
- [ ] Window Functions (opcional - ranking)

### Integridade Referencial
- [ ] FKs com `ON DELETE CASCADE` / `SET NULL` / `RESTRICT` apropriados
- [ ] `item_agendamento.servico_id` → `RESTRICT` (não deleta serviço usado)
- [ ] `avaliacoes.agendamento_id` → `UNIQUE` (1:1)
- [ ] `horarios_funcionamento` → `UNIQUE (estabelecimento_id, dia_semana)`

### Performance
- [ ] Índices compostos para queries críticas
- [ ] `idx_agendamentos_profissional_data` (trigger anti-overbooking)
- [ ] `idx_pagamentos_estab_data_status` (faturamento)
- [ ] `idx_feed_data` (timeline)
- [ ] `idx_notificacoes_usuario_lida` (badge não lidas)

### Dados de Teste
- [ ] 3 estabelecimentos em bairros reais de BH
- [ ] Senhas todas "Senha123" (bcrypt hash conhecido)
- [ ] Agendamentos passados (relatórios) + futuros (agenda)
- [ ] Múltiplos itens por agendamento (combo)
- [ ] Avaliações variadas (4 e 5 estrelas)
- [ ] Assinaturas em estados diferentes (ativa, vencida)
- [ ] Pagamentos: PIX, cartão crédito, débito, dinheiro
- [ ] Trigger de avaliação atualiza `estabelecimentos.avaliacao`

## 🎯 Critérios de Avaliação (Conferir antes de entregar)

| Critério | Peso | Verificação |
|---|---|---|
| Modelo Conceitual correto e completo | 20% | 12 entidades, cardinalidades certas |
| Modelo Lógico em 3FN | 15% | Sem dependências transitivas |
| Modelo Físico MySQL 8.0+ executável | 20% | Rode no Workbench sem erros |
| Triggers anti-overbooking funcionais | 15% | Teste INSERT concorrente falha |
| 8 Consultas DQL corretas e úteis | 15% | Resultados batem com esperado |
| Dados de teste realistas e completos | 10% | 108 registros, cenários cobertos |
| Documentação clara e organizada | 5% | Markdown bem formatado |

## 🚀 Execução Final (Dia da Apresentação)

### Antes de sair de casa:
- [ ] SQL executado no MySQL local (teste)
- [ ] Slides PDF gerados e testados no projetor
- [ ] Pen drive com backup (PDF + SQL + draw.io)
- [ ] MySQL Workbench aberto com aba do schema
- [ ] Credenciais de teste anotadas (admin@corterapido.com / Senha123)

### Durante a apresentação:
- [ ] Cronômetro (10 min exatos)
- [ ] Mostrar SQL executando no Workbench (query 8 - auditoria)
- [ ] Mostrar trigger falhando (tentar INSERT duplicado)
- [ ] Apontar índices no `EXPLAIN` das queries principais
- [ ] Responder FAQ se sobrar tempo

## 📝 Pós-Apresentação
- [ ] Commit final no git com tag `a3-entrega`
- [ ] Push para repositório da disciplina
- [ ] Compartilhar link do repo com professor
- [ ] Arquivar draw.io sources no repo

---

**Assinatura:** _________________________ **Data:** _______________