# Triggers e Procedures - Corte Rápido

## Trigger: trg_anti_overbooking_insert

```sql
CREATE TRIGGER trg_anti_overbooking_insert
BEFORE INSERT ON agendamentos
FOR EACH ROW
BEGIN
    DECLARE conflitos INT DEFAULT 0;
    
    SELECT COUNT(*) INTO conflitos
    FROM agendamentos
    WHERE profissional_id = NEW.profissional_id
      AND status IN ('agendado', 'confirmado', 'em_andamento')
      AND data_hora_inicio < NEW.data_hora_fim
      AND data_hora_fim > NEW.data_hora_inicio;
    
    IF conflitos > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Conflito de horário: profissional já possui agendamento neste período';
    END IF;
END;
```

### Lógica de Detecção de Conflito
Dois intervalos `[inicio1, fim1]` e `[inicio2, fim2]` se sobrepõem **SE E SOMENTE SE**:
```
inicio1 < fim2  E  fim1 > inicio2
```

### Exemplo
- Agendamento existente: 10:00 - 11:00
- Novo agendamento: 10:30 - 11:30 → **CONFLITO** (10:00 < 11:30 E 11:00 > 10:30)
- Novo agendamento: 11:00 - 12:00 → **OK** (11:00 !< 11:00)

### Status Considerados como Ocupados
- `agendado` - Criado, aguardando confirmação
- `confirmado` - Confirmado pelo estabelecimento
- `em_andamento` - Em execução

### Status Ignorados (livres)
- `concluido` - Finalizado
- `cancelado` - Cancelado
- `nao_compareceu` - Cliente não apareceu

---

## Trigger: trg_anti_overbooking_update

```sql
CREATE TRIGGER trg_anti_overbooking_update
BEFORE UPDATE ON agendamentos
FOR EACH ROW
BEGIN
    DECLARE conflitos INT DEFAULT 0;
    
    IF NEW.data_hora_inicio <> OLD.data_hora_inicio 
       OR NEW.data_hora_fim <> OLD.data_hora_fim
       OR NEW.profissional_id <> OLD.profissional_id THEN
        
        SELECT COUNT(*) INTO conflitos
        FROM agendamentos
        WHERE profissional_id = NEW.profissional_id
          AND id != NEW.id
          AND status IN ('agendado', 'confirmado', 'em_andamento')
          AND data_hora_inicio < NEW.data_hora_fim
          AND data_hora_fim > NEW.data_hora_inicio;
        
        IF conflitos > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Conflito de horário: profissional já possui agendamento neste período';
        END IF;
    END IF;
END;
```

### Quando Dispara
Apenas quando **mudam** campos críticos:
- `data_hora_inicio`
- `data_hora_fim`
- `profissional_id`

### Exclusão do Próprio Registro
`AND id != NEW.id` evita que o agendamento conflite consigo mesmo ao ser movido.

---

## Procedure: Calcular Slots Livres (Para Backend)

```sql
DELIMITER $$

CREATE PROCEDURE sp_slots_livres(
    IN p_profissional_id CHAR(36),
    IN p_data DATE,
    IN p_duracao_minutos INT,
    IN p_hora_inicio TIME,     -- Ex: '08:00:00'
    IN p_hora_fim TIME         -- Ex: '20:00:00'
)
BEGIN
    -- CTE com slots gerados (a cada 30 min)
    WITH RECURSIVE slots AS (
        SELECT 
            CAST(CONCAT(p_data, ' ', p_hora_inicio) AS DATETIME) AS inicio,
            CAST(CONCAT(p_data, ' ', ADDTIME(p_hora_inicio, SEC_TO_TIME(p_duracao_minutos * 60))) AS DATETIME) AS fim
        UNION ALL
        SELECT 
            ADDTIME(inicio, '00:30:00'),
            ADDTIME(fim, '00:30:00')
        FROM slots
        WHERE fim < CAST(CONCAT(p_data, ' ', p_hora_fim) AS DATETIME)
    ),
    agendamentos_dia AS (
        SELECT data_hora_inicio, data_hora_fim
        FROM agendamentos
        WHERE profissional_id = p_profissional_id
          AND DATE(data_hora_inicio) = p_data
          AND status IN ('agendado', 'confirmado', 'em_andamento')
    ),
    bloqueios_dia AS (
        SELECT data_hora_inicio, data_hora_fim
        FROM bloqueios_agenda
        WHERE profissional_id = p_profissional_id
          AND DATE(data_hora_inicio) = p_data
    ),
    horarios_func AS (
        SELECT hora_abertura, hora_fechamento
        FROM horarios_funcionamento
        WHERE estabelecimento_id = (SELECT estabelecimento_id FROM profissionais WHERE id = p_profissional_id)
          AND dia_semana = WEEKDAY(p_data)
          AND ativo = TRUE
    )
    SELECT 
        s.inicio AS slot_inicio,
        s.fim AS slot_fim,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM agendamentos_dia a
                WHERE a.data_hora_inicio < s.fim AND a.data_hora_fim > s.inicio
            ) THEN 'ocupado'
            WHEN EXISTS (
                SELECT 1 FROM bloqueios_dia b
                WHERE b.data_hora_inicio < s.fim AND b.data_hora_fim > s.inicio
            ) THEN 'bloqueado'
            ELSE 'livre'
        END AS status
    FROM slots s
    WHERE (SELECT COUNT(*) FROM horarios_func) = 0 
       OR (s.inicio >= CAST(CONCAT(p_data, ' ', (SELECT hora_abertura FROM horarios_func)) AS DATETIME)
           AND s.fim <= CAST(CONCAT(p_data, ' ', (SELECT hora_fechamento FROM horarios_func)) AS DATETIME));
END$$

DELIMITER ;
```

### Uso no Backend
```typescript
// Repository chama a procedure
const [rows] = await pool.execute(
  'CALL sp_slots_livres(?, ?, ?, ?, ?)',
  [profissionalId, data, duracaoMinutos, '08:00:00', '20:00:00']
);
```

---

## Procedure: Atualizar Avaliação Média do Estabelecimento

```sql
DELIMITER $$

CREATE PROCEDURE sp_atualizar_avaliacao_estabelecimento(
    IN p_estabelecimento_id CHAR(36)
)
BEGIN
    UPDATE estabelecimentos
    SET avaliacao = (
        SELECT ROUND(AVG(estrelas), 2)
        FROM avaliacoes
        WHERE estabelecimento_id = p_estabelecimento_id
    )
    WHERE id = p_estabelecimento_id;
END$$

DELIMITER ;
```

### Trigger para Manter Avaliação Atualizada

```sql
DELIMITER $$

CREATE TRIGGER trg_avaliacao_after_insert
AFTER INSERT ON avaliacoes
FOR EACH ROW
BEGIN
    CALL sp_atualizar_avaliacao_estabelecimento(NEW.estabelecimento_id);
END$$

CREATE TRIGGER trg_avaliacao_after_update
AFTER UPDATE ON avaliacoes
FOR EACH ROW
BEGIN
    CALL sp_atualizar_avaliacao_estabelecimento(NEW.estabelecimento_id);
END$$

CREATE TRIGGER trg_avaliacao_after_delete
AFTER DELETE ON avaliacoes
FOR EACH ROW
BEGIN
    CALL sp_atualizar_avaliacao_estabelecimento(OLD.estabelecimento_id);
END$$

DELIMITER ;
```

---

## Procedure: Faturamento Mensal (Para Dashboard)

```sql
DELIMITER $$

CREATE PROCEDURE sp_faturamento_mensal(
    IN p_estabelecimento_id CHAR(36),
    IN p_meses INT DEFAULT 6
)
BEGIN
    SELECT 
        DATE_FORMAT(data_pagamento, '%Y-%m') AS mes,
        COUNT(*) AS total_transacoes,
        SUM(valor) AS faturamento_total,
        AVG(valor) AS ticket_medio
    FROM pagamentos
    WHERE estabelecimento_id = p_estabelecimento_id
      AND status = 'pago'
      AND data_pagamento >= DATE_SUB(
          (SELECT MAX(data_pagamento) FROM pagamentos WHERE status = 'pago'),
          INTERVAL p_meses MONTH
      )
    GROUP BY DATE_FORMAT(data_pagamento, '%Y-%m')
    ORDER BY mes DESC;
END$$

DELIMITER ;
```

---

## Function: Verificar Disponibilidade (Para Frontend Tempo Real)

```sql
DELIMITER $$

CREATE FUNCTION fn_verificar_disponibilidade(
    p_profissional_id CHAR(36),
    p_inicio DATETIME,
    p_fim DATETIME
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE conflitos INT DEFAULT 0;
    
    SELECT COUNT(*) INTO conflitos
    FROM agendamentos
    WHERE profissional_id = p_profissional_id
      AND status IN ('agendado', 'confirmado', 'em_andamento')
      AND data_hora_inicio < p_fim
      AND data_hora_fim > p_inicio;
    
    RETURN conflitos = 0;
END$$

DELIMITER ;
```

### Uso
```sql
SELECT fn_verificar_disponibilidade('p111...', '2026-12-01 10:00:00', '2026-12-01 10:30:00');
-- Retorna 1 (livre) ou 0 (ocupado)
```

---

## Resumo de Objetos de Banco

| Objeto | Tipo | Tabela Afetada | Propósito |
|--------|------|----------------|-----------|
| trg_anti_overbooking_insert | Trigger BEFORE INSERT | agendamentos | Impede overbooking na criação |
| trg_anti_overbooking_update | Trigger BEFORE UPDATE | agendamentos | Impede overbooking na edição |
| trg_avaliacao_after_insert | Trigger AFTER INSERT | avaliacoes | Atualiza média do estabelecimento |
| trg_avaliacao_after_update | Trigger AFTER UPDATE | avaliacoes | Atualiza média do estabelecimento |
| trg_avaliacao_after_delete | Trigger AFTER DELETE | avaliacoes | Atualiza média do estabelecimento |
| sp_slots_livres | Procedure | - | Calcula slots livres do dia |
| sp_atualizar_avaliacao_estabelecimento | Procedure | estabelecimentos | Recalcula média |
| sp_faturamento_mensal | Procedure | pagamentos | Relatório financeiro |
| fn_verificar_disponibilidade | Function | agendamentos | Check rápido para frontend |

---

## Segurança e Boas Práticas

1. **SIGNAL SQLSTATE '45000'** - Erro customizado capturado pelo backend (AppError 409 CONFLICT)
2. **READS SQL DATA / DETERMINISTIC** - Functions otimizadas para cache
3. **Indexes compostos** - (profissional_id, data_hora_inicio) para triggers rápidos
4. **Transações no Backend** - Agendamento + Itens em transação única
5. **Soft Delete** - Campo `ativo` em vez de DELETE físico