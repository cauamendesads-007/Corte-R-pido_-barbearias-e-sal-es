# Dicionário de Dados - Corte Rápido

## Convenções
- **PK** = Primary Key
- **FK** = Foreign Key
- **UK** = Unique Key
- **NN** = Not Null
- **AI** = Auto Increment (não usado, UUIDs)
- **DF** = Default

---

## Tabela: usuarios

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único (UUID v4) |
| nome | VARCHAR(100) | NN | Nome completo do usuário |
| email | VARCHAR(150) | NN, UK | Email único para login |
| senha_hash | VARCHAR(255) | NN | Hash bcrypt (cost 12) |
| telefone | VARCHAR(20) | | Telefone com DDD: (XX) XXXXX-XXXX |
| tipo | ENUM | NN, DF('cliente') | 'cliente', 'profissional', 'estabelecimento', 'admin' |
| estabelecimento_id | CHAR(36) | FK → estabelecimentos.id | Apenas para tipo 'estabelecimento' e 'profissional' |
| ativo | BOOLEAN | NN, DF(TRUE) | Soft delete |
| data_criacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) | Criação do registro |
| data_atualizacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) ON UPDATE | Última atualização |

**Índices:**
- idx_usuarios_email (email) - UK implícito
- idx_usuarios_tipo (tipo) - Filtro por tipo
- idx_usuarios_estabelecimento (estabelecimento_id) - JOINs

---

## Tabela: estabelecimentos

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| slug | VARCHAR(50) | NN, UK | URL amigável: 'barbearia-do-carlos' |
| nome | VARCHAR(100) | NN | Nome fantasia |
| responsavel | VARCHAR(100) | NN | Nome do responsável legal |
| cidade | VARCHAR(50) | NN | Cidade para busca geográfica |
| nicho | VARCHAR(50) | NN | Ex: 'Barbearia', 'Salão', 'Clínica' |
| whatsapp | VARCHAR(20) | NN | WhatsApp comercial com DDD |
| endereco | VARCHAR(200) | NN | Endereço completo |
| sobre | VARCHAR(500) | | Descrição/About |
| latitude | DECIMAL(10,8) | | Latitude para mapa (-90 a 90) |
| longitude | DECIMAL(11,8) | | Longitude para mapa (-180 a 180) |
| tema_cor | VARCHAR(7) | | Hex color: #8B4513 |
| tema_layout | ENUM | DF('classico') | 'classico', 'moderno', 'minimalista' |
| tema_titulo | VARCHAR(50) | | Título personalizado do tema |
| tema_subtitulo | VARCHAR(100) | | Subtítulo personalizado |
| tempo_medio_atendimento | INT | | Minutos médios por atendimento |
| horario_funcionamento | JSON | | Horários por dia: {"1": {"abre": "08:00", "fecha": "20:00"}} |
| permite_auto_edicao | BOOLEAN | DF(FALSE) | Cliente edita próprio agendamento |
| configuracao_pix_modo | ENUM | DF('opcional') | 'obrigatorio', 'opcional', 'desativado' |
| configuracao_pix_chave | VARCHAR(100) | | Chave PIX (email, telefone, CPF, aleatória) |
| configuracao_pix_percentual_sinal | INT | DF(0) | % de sinal no agendamento (0-100) |
| seguidores | INT | DF(0) | Contador de seguidores |
| taxa_fidelidade | INT | DF(0) | % desconto fidelidade (0-100) |
| avaliacao | DECIMAL(3,2) | DF(0.00) | Média calculada (trigger/view) |
| status | ENUM | DF('pendente') | 'pendente', 'aprovado', 'rejeitado', 'suspenso' |
| data_criacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) | |
| data_atualizacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) ON UPDATE | |

**Índices:**
- idx_estabelecimentos_slug (slug) - UK implícito
- idx_estabelecimentos_status (status) - Filtro admin
- idx_estabelecimentos_cidade_nicho (cidade, nicho) - Busca pública
- idx_estabelecimentos_avaliacao (avaliacao DESC) - Ranking

---

## Tabela: profissionais

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| estabelecimento_id | CHAR(36) | NN, FK → estabelecimentos.id | CASCADE DELETE |
| usuario_id | CHAR(36) | UK, FK → usuarios.id | SET NULL (login opcional) |
| nome | VARCHAR(100) | NN | Nome profissional |
| email | VARCHAR(150) | | Email para contato (pode != usuario.email) |
| telefone | VARCHAR(20) | | Telefone direto |
| especialidades | JSON | | Array: ["Corte Clássico", "Barba", "Degradê"] |
| ativo | BOOLEAN | NN, DF(TRUE) | Disponível para agendamentos |
| data_criacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) | |
| data_atualizacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) ON UPDATE | |

**Índices:**
- idx_profissionais_estabelecimento (estabelecimento_id) - Lista por estabelecimento
- idx_profissionais_usuario (usuario_id) - JOIN auth
- idx_profissionais_ativo (ativo) - Filtro disponíveis

---

## Tabela: servicos

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| estabelecimento_id | CHAR(36) | NN, FK → estabelecimentos.id | CASCADE DELETE |
| nome | VARCHAR(100) | NN | Ex: 'Corte + Barba' |
| descricao | VARCHAR(500) | | Detalhes do serviço |
| preco | DECIMAL(10,2) | NN | Preço atual (pode mudar) |
| duracao_minutos | INT | NN | Duração em minutos |
| ordem_exibicao | INT | DF(0) | Ordenação no cardápio |
| ativo | BOOLEAN | NN, DF(TRUE) | Disponível para agendamento |
| data_criacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) | |
| data_atualizacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) ON UPDATE | |

**Índices:**
- idx_servicos_estabelecimento (estabelecimento_id) - Cardápio do estabelecimento
- idx_servicos_ativo (ativo) - Filtro disponíveis

---

## Tabela: agendamentos

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| estabelecimento_id | CHAR(36) | NN, FK → estabelecimentos.id | CASCADE DELETE |
| profissional_id | CHAR(36) | NN, FK → profissionais.id | CASCADE DELETE |
| cliente_id | CHAR(36) | FK → usuarios.id | SET NULL (cliente pode ser deletado) |
| data_hora_inicio | DATETIME | NN | Início do agendamento |
| data_hora_fim | DATETIME | NN | Fim calculado (início + duração serviços) |
| status | ENUM | DF('agendado') | 'agendado', 'confirmado', 'em_andamento', 'concluido', 'cancelado', 'nao_compareceu' |
| observacoes | VARCHAR(500) | | Observações do cliente/estabelecimento |
| valor_total | DECIMAL(10,2) | NN | Soma dos itens (preços congelados) |
| data_criacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) | |
| data_atualizacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) ON UPDATE | |

**Índices:**
- idx_agendamentos_estabelecimento (estabelecimento_id) - Dashboard estabelecimento
- idx_agendamentos_profissional_data (profissional_id, data_hora_inicio) - Agenda do profissional + anti-overbooking
- idx_agendamentos_cliente (cliente_id) - Histórico do cliente
- idx_agendamentos_status (status) - Filtros Kanban
- idx_agendamentos_data_hora (data_hora_inicio) - Relatórios temporais

**Trigger:** trg_anti_overbooking_insert/update (impede sobreposição)

---

## Tabela: item_agendamento (Preços Congelados - Auditoria)

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| agendamento_id | CHAR(36) | NN, FK → agendamentos.id | CASCADE DELETE |
| servico_id | CHAR(36) | NN, FK → servicos.id | RESTRICT (não deleta serviço se usado) |
| quantidade | INT | NN, DF(1) | Quantidade (geralmente 1) |
| preco_unitario | DECIMAL(10,2) | NN | **Preço no momento do agendamento** |
| subtotal | DECIMAL(10,2) | NN | preco_unitario * quantidade |

**Índices:**
- idx_item_agendamento_agendamento (agendamento_id) - Itens do agendamento

**Regra de Negócio:** Preço congelado = auditoria. Não atualiza se servicos.preco mudar.

---

## Tabela: avaliacoes

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| agendamento_id | CHAR(36) | NN, UK, FK → agendamentos.id | CASCADE DELETE (1:1) |
| estabelecimento_id | CHAR(36) | NN, FK → estabelecimentos.id | CASCADE DELETE |
| cliente_id | CHAR(36) | NN, FK → usuarios.id | CASCADE DELETE |
| profissional_id | CHAR(36) | FK → profissionais.id | SET NULL |
| estrelas | TINYINT | NN, CHECK(1-5) | 1 a 5 estrelas |
| comentario | VARCHAR(500) | | Texto livre |
| resposta_estabelecimento | VARCHAR(500) | | Resposta do dono |
| data_resposta | TIMESTAMP | | Quando respondeu |
| data_criacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) | |

**Índices:**
- idx_avaliacoes_estabelecimento (estabelecimento_id) - Média por estabelecimento
- idx_avaliacoes_cliente (cliente_id) - Histórico do cliente

---

## Tabela: planos_assinatura

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| nome | VARCHAR(50) | NN | 'Básico', 'Profissional', 'Enterprise' |
| descricao | VARCHAR(200) | | Descrição do plano |
| preco_mensal | DECIMAL(10,2) | NN | Valor mensal |
| preco_anual | DECIMAL(10,2) | | Valor anual (10% desconto típico) |
| limite_profissionais | INT | DF(5) | Max profissionais |
| limite_servicos | INT | DF(20) | Max serviços |
| recursos | JSON | | Lista features: ["relatorios", "marketing", "api"] |
| ativo | BOOLEAN | DF(TRUE) | Disponível para venda |
| data_criacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) | |

**Índices:**
- idx_planos_ativo (ativo) - Catálogo público

---

## Tabela: assinaturas

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| estabelecimento_id | CHAR(36) | NN, FK → estabelecimentos.id | CASCADE DELETE |
| plano_id | CHAR(36) | NN, FK → planos_assinatura.id | RESTRICT |
| status | ENUM | DF('pendente') | 'ativa', 'cancelada', 'vencida', 'pendente' |
| ciclo | ENUM | DF('mensal') | 'mensal', 'anual' |
| data_inicio | DATE | NN | Início da vigência |
| data_fim | DATE | | Fim (NULL = indeterminado) |
| data_proxima_cobranca | DATE | | Próximo vencimento |
| forma_pagamento | ENUM | | 'cartao', 'pix', 'boleto' |
| data_criacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) | |
| data_atualizacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) ON UPDATE | |

**Índices:**
- idx_assinaturas_estabelecimento (estabelecimento_id) - Assinatura do estabelecimento
- idx_assinaturas_status (status) - Cobranças pendentes

---

## Tabela: pagamentos

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| agendamento_id | CHAR(36) | FK → agendamentos.id | SET NULL |
| assinatura_id | CHAR(36) | FK → assinaturas.id | SET NULL |
| estabelecimento_id | CHAR(36) | NN, FK → estabelecimentos.id | CASCADE DELETE |
| valor | DECIMAL(10,2) | NN | Valor pago |
| metodo | ENUM | NN | 'pix', 'cartao_credito', 'cartao_debito', 'dinheiro' |
| status | ENUM | DF('pendente') | 'pendente', 'pago', 'estornado', 'falhou' |
| transaction_id | VARCHAR(100) | | ID do gateway (MercadoPago, Stripe, etc) |
| dados_gateway | JSON | | Response completo do gateway |
| data_pagamento | TIMESTAMP | | Quando foi confirmado |
| data_criacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) | |

**Índices:**
- idx_pagamentos_estabelecimento (estabelecimento_id) - Financeiro do estabelecimento
- idx_pagamentos_status (status) - Conciliação
- idx_pagamentos_data (data_criacao) - Relatórios mensais

---

## Tabela: publicacoes_feed

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| estabelecimento_id | CHAR(36) | NN, FK → estabelecimentos.id | CASCADE DELETE |
| autor_id | CHAR(36) | NN, FK → usuarios.id | CASCADE DELETE |
| legenda | VARCHAR(500) | | Texto da publicação |
| arquivo_url | VARCHAR(500) | | URL da imagem/video (Storage) |
| tipo | ENUM | NN | 'imagem', 'video' |
| curtidas | INT | DF(0) | Contador (desnormalizado) |
| compartilhamentos | INT | DF(0) | Contador (desnormalizado) |
| data_criacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) | |

**Índices:**
- idx_feed_estabelecimento (estabelecimento_id) - Feed do estabelecimento
- idx_feed_data (data_criacao DESC) - Timeline cronológica

---

## Tabela: notificacoes

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| usuario_id | CHAR(36) | NN, FK → usuarios.id | CASCADE DELETE |
| tipo | ENUM | NN | 'agendamento', 'pagamento', 'avaliacao', 'mensagem', 'sistema' |
| titulo | VARCHAR(100) | NN | Título curto |
| mensagem | VARCHAR(500) | NN | Conteúdo |
| lida | BOOLEAN | DF(FALSE) | Status de leitura |
| dados_extras | JSON | | Dados adicionais (ids, links) |
| data_criacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) | |

**Índices:**
- idx_notificacoes_usuario_lida (usuario_id, lida) - Badge não lidas
- idx_notificacoes_data (data_criacao DESC) - Histórico

---

## Tabela: horarios_funcionamento

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| estabelecimento_id | CHAR(36) | NN, FK → estabelecimentos.id | CASCADE DELETE |
| dia_semana | TINYINT | NN, CHECK(0-6) | 0=Dom, 1=Seg, ..., 6=Sáb |
| hora_abertura | TIME | NN | Ex: '08:00:00' |
| hora_fechamento | TIME | NN | Ex: '20:00:00' |
| ativo | BOOLEAN | DF(TRUE) | Horário vigente |

**Constraints:**
- UK: uk_horario_estabelecimento_dia (estabelecimento_id, dia_semana)

---

## Tabela: bloqueios_agenda

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | CHAR(36) | PK, NN, DF(UUID()) | Identificador único |
| profissional_id | CHAR(36) | NN, FK → profissionais.id | CASCADE DELETE |
| data_hora_inicio | DATETIME | NN | Início do bloqueio |
| data_hora_fim | DATETIME | NN | Fim do bloqueio |
| motivo | VARCHAR(200) | | 'Férias', 'Manutenção', 'Pessoal' |
| data_criacao | TIMESTAMP | NN, DF(CURRENT_TIMESTAMP) | |

**Índices:**
- idx_bloqueios_profissional_data (profissional_id, data_hora_inicio) - Verificação conflitos