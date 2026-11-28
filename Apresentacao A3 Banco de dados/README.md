# Apresentação A3 - Banco de Dados Corte Rápido

## Estrutura da Pasta

```
Apresentacao A3 Banco de dados/
├── README.md                    # Este arquivo
├── modelo_conceitual.drawio     # Modelo Entidade-Relacionamento (conceitual)
├── modelo_logico.drawio         # Modelo Lógico (3FN)
├── modelo_fisico.sql            # DDL MySQL 8.0+ (copia do database/banco_corte_rapido_mysql.sql)
├── dicionario_dados.md          # Dicionário de dados completo
├── triggers_procedures.md       # Documentação de triggers e procedures
├── consultas_dql.md             # 8 Consultas Estratégicas (DQL)
├── dados_teste.md               # Dados de teste (DML)
├── slides_apresentacao.md       # Roteiro para slides (10 min)
└── checklist_entrega.md         # Checklist de entrega
```

## Como Gerar os Diagramas

### 1. Modelo Conceitual (MER)
Use o draw.io (diagrams.net) para criar o diagrama entidade-relacionamento:

**Entidades Principais:**
- USUARIO (id, nome, email, senha_hash, telefone, tipo, estabelecimento_id)
- ESTABELECIMENTO (id, slug, nome, responsavel, cidade, nicho, whatsapp, endereco, ...)
- PROFISSIONAL (id, estabelecimento_id, usuario_id, nome, email, telefone, especialidades)
- SERVICO (id, estabelecimento_id, nome, descricao, preco, duracao_minutos)
- AGENDAMENTO (id, estabelecimento_id, profissional_id, cliente_id, data_hora_inicio, data_hora_fim, status, valor_total)
- ITEM_AGENDAMENTO (id, agendamento_id, servico_id, quantidade, preco_unitario, subtotal)
- AVALIACAO (id, agendamento_id, estabelecimento_id, cliente_id, profissional_id, estrelas, comentario)
- PLANO_ASSINATURA (id, nome, descricao, preco_mensal, preco_anual, limite_profissionais, limite_servicos, recursos)
- ASSINATURA (id, estabelecimento_id, plano_id, status, ciclo, data_inicio, data_fim, ...)
- PAGAMENTO (id, agendamento_id, assinatura_id, estabelecimento_id, valor, metodo, status, ...)
- PUBLICACAO_FEED (id, estabelecimento_id, autor_id, legenda, arquivo_url, tipo, curtidas, compartilhamentos)
- NOTIFICACAO (id, usuario_id, tipo, titulo, mensagem, lida, dados_extras)
- HORARIO_FUNCIONAMENTO (id, estabelecimento_id, dia_semana, hora_abertura, hora_fechamento)
- BLOQUEIO_AGENDA (id, profissional_id, data_hora_inicio, data_hora_fim, motivo)

**Relacionamentos:**
- Usuario 1:N Estabelecimento (responsável)
- Usuario 1:1 Profissional (login do profissional)
- Estabelecimento 1:N Profissional
- Estabelecimento 1:N Servico
- Estabelecimento 1:N Agendamento
- Profissional 1:N Agendamento
- Usuario (cliente) 1:N Agendamento
- Agendamento 1:N Item_Agendamento
- Servico 1:N Item_Agendamento
- Agendamento 1:1 Avaliacao
- Estabelecimento 1:N Avaliacao
- Usuario 1:N Avaliacao
- Profissional 1:N Avaliacao
- Plano_Assinatura 1:N Assinatura
- Estabelecimento 1:N Assinatura
- Agendamento 1:N Pagamento
- Assinatura 1:N Pagamento
- Estabelecimento 1:N Pagamento
- Estabelecimento 1:N Publicacao_Feed
- Usuario 1:N Publicacao_Feed
- Usuario 1:N Notificacao
- Estabelecimento 1:N Horario_Funcionamento
- Profissional 1:N Bloqueio_Agenda

### 2. Modelo Lógico (3FN)
Normalização para 3ª Forma Normal:
- Todas as tabelas estão em 3FN
- Sem dependências transitivas
- Chaves primárias compostas onde apropriado (item_agendamento)
- Chaves estrangeiras explicitas
- Índices para performance

### 3. Modelo Físico
Arquivo: `database/banco_corte_rapido_mysql.sql` (copiar para cá)

## Entregáveis para Apresentação (10 min)

### Slide 1: Capa (30s)
- Título: "Corte Rápido - Banco de Dados MySQL 8.0+"
- Subtítulo: "Sistema de Agendamento para Barbearia"
- Equipe / Data

### Slide 2: Problema & Contexto (1 min)
- Marketplace de barbearia
- Multi-tenancy (vários estabelecimentos)
- Agendamentos com anti-overbooking
- Preços congelados para auditoria

### Slide 3: Modelo Conceitual (MER) (1 min)
- Mostrar diagrama draw.io
- Explicar 12 entidades principais

### Slide 4: Modelo Lógico - 3FN (1 min)
- Explicar normalização
- Mostrar eliminação de dependências transitivas

### Slide 5: Modelo Físico - Destaques (1.5 min)
- UUIDs como PK (CHAR(36))
- JSON para campos flexíveis (horarios, especialidades, recursos)
- ENUMs para domínios fechados
- CHECK constraints (estrelas 1-5, dia_semana 0-6)
- Triggers anti-overbooking (BEFORE INSERT/UPDATE)

### Slide 6: Dados de Teste (1 min)
- 3 estabelecimentos em BH (Barreiro, Centro, Savassi)
- 9 usuários (admin, 3 donos, 2 profissionais com login, 3 clientes)
- 7 profissionais, 14 serviços
- 15+ agendamentos com preços congelados
- 6 avaliações, 3 assinaturas, 8 pagamentos
- 3 publicações feed, 3 notificações

### Slide 7: 8 Consultas Estratégicas DQL (2 min)
1. Faturamento mensal por estabelecimento (6 meses)
2. Agenda do dia por profissional com slots
3. Ranking serviços mais solicitados (30 dias)
4. Top 10 clientes fiéis (frequência + valor)
5. Horários de pico (por hora)
6. Planos ativos vs vencidos (MRR)
7. Avaliações detalhadas por estabelecimento
8. Auditoria preços congelados vs atuais

### Slide 8: Triggers & Segurança (1 min)
- trg_anti_overbooking_insert/update
- SIGNAL SQLSTATE '45000' para conflitos
- Índices compostos para performance
- Soft deletes (ativo = false)

### Slide 9: Integração Backend (30s)
- Repository pattern com mysql2/promise
- Named placeholders (?) + QueryParams type
- Transações para agendamentos + itens
- Zod validation antes de persistir

### Slide 10: Próximos Passos & Encerramento (30s)
- Frontend consumindo API MySQL
- Módulos: Feed, Notificações, Painel Admin
- Deploy (Docker, CI/CD)
- Perguntas

## Checklist de Entrega

- [ ] Modelo Conceitual (draw.io / PNG / PDF)
- [ ] Modelo Lógico (draw.io / PNG / PDF)
- [ ] Modelo Físico (SQL comentado)
- [ ] Dicionário de Dados (Markdown)
- [ ] Triggers & Procedures documentados
- [ ] 8 Consultas DQL testadas e explicadas
- [ ] Dados de Teste (DML) com 3 estabelecimentos
- [ ] Slides (PDF/PowerPoint) - 10 min
- [ ] Script de criação executável (MySQL 8.0+)
- [ ] README com instruções de execução