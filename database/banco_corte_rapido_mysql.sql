-- ============================================================================
-- BANCO DE DADOS CORTE RÁPIDO - MySQL 8.0+
-- Schema completo: DDL (3FN), DML (dados de teste), DQL (consultas estratégicas)
-- ============================================================================

-- Limpeza e criação do banco
DROP DATABASE IF EXISTS corte_rapido_a3;
CREATE DATABASE corte_rapido_a3 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE corte_rapido_a3;

-- ============================================================================
-- SEÇÃO 1: DDL - DATA DEFINITION LANGUAGE (3FN)
-- ============================================================================

-- ----------------------------------------------------------
-- Tabela: usuarios (entidade central de autenticação)
-- ----------------------------------------------------------
CREATE TABLE usuarios (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    tipo ENUM('cliente', 'profissional', 'estabelecimento', 'admin') NOT NULL DEFAULT 'cliente',
    estabelecimento_id CHAR(36),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_usuarios_email (email),
    INDEX idx_usuarios_tipo (tipo),
    INDEX idx_usuarios_estabelecimento (estabelecimento_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Tabela: estabelecimentos (3FN - sem dependências transitivas)
-- ----------------------------------------------------------
CREATE TABLE estabelecimentos (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    slug VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    responsavel VARCHAR(100) NOT NULL,
    cidade VARCHAR(50) NOT NULL,
    nicho VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    endereco VARCHAR(200) NOT NULL,
    sobre VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    tema_cor VARCHAR(7),
    tema_layout ENUM('classico', 'moderno', 'minimalista') DEFAULT 'classico',
    tema_titulo VARCHAR(50),
    tema_subtitulo VARCHAR(100),
    tempo_medio_atendimento INT,
    horario_funcionamento JSON,
    permite_auto_edicao BOOLEAN DEFAULT FALSE,
    configuracao_pix_modo ENUM('obrigatorio', 'opcional', 'desativado') DEFAULT 'opcional',
    configuracao_pix_chave VARCHAR(100),
    configuracao_pix_percentual_sinal INT DEFAULT 0,
    seguidores INT DEFAULT 0,
    taxa_fidelidade INT DEFAULT 0,
    avaliacao DECIMAL(3,2) DEFAULT 0.00,
    status ENUM('pendente', 'aprovado', 'rejeitado', 'suspenso') DEFAULT 'pendente',
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_estabelecimentos_slug (slug),
    INDEX idx_estabelecimentos_status (status),
    INDEX idx_estabelecimentos_cidade_nicho (cidade, nicho),
    INDEX idx_estabelecimentos_avaliacao (avaliacao DESC)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Tabela: profissionais (3FN - separado de usuarios)
-- ----------------------------------------------------------
CREATE TABLE profissionais (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    estabelecimento_id CHAR(36) NOT NULL,
    usuario_id CHAR(36) UNIQUE,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    telefone VARCHAR(20),
    especialidades JSON,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_profissionais_estabelecimento (estabelecimento_id),
    INDEX idx_profissionais_usuario (usuario_id),
    INDEX idx_profissionais_ativo (ativo)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Tabela: servicos (3FN - preço e duração no serviço, não no agendamento)
-- ----------------------------------------------------------
CREATE TABLE servicos (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    estabelecimento_id CHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(500),
    preco DECIMAL(10,2) NOT NULL,
    duracao_minutos INT NOT NULL,
    ordem_exibicao INT DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    INDEX idx_servicos_estabelecimento (estabelecimento_id),
    INDEX idx_servicos_ativo (ativo)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Tabela: agendamentos (3FN - dados do agendamento, preços congelados em item_agendamento)
-- ----------------------------------------------------------
CREATE TABLE agendamentos (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    estabelecimento_id CHAR(36) NOT NULL,
    profissional_id CHAR(36) NOT NULL,
    cliente_id CHAR(36),
    data_hora_inicio DATETIME NOT NULL,
    data_hora_fim DATETIME NOT NULL,
    status ENUM('agendado', 'confirmado', 'em_andamento', 'concluido', 'cancelado', 'nao_compareceu') DEFAULT 'agendado',
    observacoes VARCHAR(500),
    valor_total DECIMAL(10,2) NOT NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_agendamentos_estabelecimento (estabelecimento_id),
    INDEX idx_agendamentos_profissional_data (profissional_id, data_hora_inicio),
    INDEX idx_agendamentos_cliente (cliente_id),
    INDEX idx_agendamentos_status (status),
    INDEX idx_agendamentos_data_hora (data_hora_inicio)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Tabela: item_agendamento (PREÇOS CONGELADOS - auditoria de preços)
-- ----------------------------------------------------------
CREATE TABLE item_agendamento (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    agendamento_id CHAR(36) NOT NULL,
    servico_id CHAR(36) NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
    FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT,
    INDEX idx_item_agendamento_agendamento (agendamento_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Tabela: avaliacoes (3FN - separada de agendamentos)
-- ----------------------------------------------------------
CREATE TABLE avaliacoes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    agendamento_id CHAR(36) NOT NULL UNIQUE,
    estabelecimento_id CHAR(36) NOT NULL,
    cliente_id CHAR(36) NOT NULL,
    profissional_id CHAR(36),
    estrelas TINYINT NOT NULL CHECK (estrelas BETWEEN 1 AND 5),
    comentario VARCHAR(500),
    resposta_estabelecimento VARCHAR(500),
    data_resposta TIMESTAMP NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
    FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL,
    INDEX idx_avaliacoes_estabelecimento (estabelecimento_id),
    INDEX idx_avaliacoes_cliente (cliente_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Tabela: planos_assinatura (3FN - catálogo de planos)
-- ----------------------------------------------------------
CREATE TABLE planos_assinatura (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nome VARCHAR(50) NOT NULL,
    descricao VARCHAR(200),
    preco_mensal DECIMAL(10,2) NOT NULL,
    preco_anual DECIMAL(10,2),
    limite_profissionais INT DEFAULT 5,
    limite_servicos INT DEFAULT 20,
    recursos JSON,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_planos_ativo (ativo)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Tabela: assinaturas (3FN - vincula estabelecimento a plano)
-- ----------------------------------------------------------
CREATE TABLE assinaturas (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    estabelecimento_id CHAR(36) NOT NULL,
    plano_id CHAR(36) NOT NULL,
    status ENUM('ativa', 'cancelada', 'vencida', 'pendente') DEFAULT 'pendente',
    ciclo ENUM('mensal', 'anual') DEFAULT 'mensal',
    data_inicio DATE NOT NULL,
    data_fim DATE,
    data_proxima_cobranca DATE,
    forma_pagamento ENUM('cartao', 'pix', 'boleto'),
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    FOREIGN KEY (plano_id) REFERENCES planos_assinatura(id) ON DELETE RESTRICT,
    INDEX idx_assinaturas_estabelecimento (estabelecimento_id),
    INDEX idx_assinaturas_status (status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Tabela: pagamentos (3FN - registro financeiro)
-- ----------------------------------------------------------
CREATE TABLE pagamentos (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    agendamento_id CHAR(36),
    assinatura_id CHAR(36),
    estabelecimento_id CHAR(36) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    metodo ENUM('pix', 'cartao_credito', 'cartao_debito', 'dinheiro') NOT NULL,
    status ENUM('pendente', 'pago', 'estornado', 'falhou') DEFAULT 'pendente',
    transaction_id VARCHAR(100),
    dados_gateway JSON,
    data_pagamento TIMESTAMP NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL,
    FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id) ON DELETE SET NULL,
    FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    INDEX idx_pagamentos_estabelecimento (estabelecimento_id),
    INDEX idx_pagamentos_status (status),
    INDEX idx_pagamentos_data (data_criacao)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Tabela: publicacoes_feed (3FN - feed social)
-- ----------------------------------------------------------
CREATE TABLE publicacoes_feed (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    estabelecimento_id CHAR(36) NOT NULL,
    autor_id CHAR(36) NOT NULL,
    legenda VARCHAR(500),
    arquivo_url VARCHAR(500),
    tipo ENUM('imagem', 'video') NOT NULL,
    curtidas INT DEFAULT 0,
    compartilhamentos INT DEFAULT 0,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_feed_estabelecimento (estabelecimento_id),
    INDEX idx_feed_data (data_criacao DESC)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Tabela: notificacoes (3FN - sistema de notificações)
-- ----------------------------------------------------------
CREATE TABLE notificacoes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    usuario_id CHAR(36) NOT NULL,
    tipo ENUM('agendamento', 'pagamento', 'avaliacao', 'mensagem', 'sistema') NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    mensagem VARCHAR(500) NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    dados_extras JSON,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_notificacoes_usuario_lida (usuario_id, lida),
    INDEX idx_notificacoes_data (data_criacao DESC)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Tabelas de apoio: horarios_funcionamento, bloqueios_agenda
-- ----------------------------------------------------------
CREATE TABLE horarios_funcionamento (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    estabelecimento_id CHAR(36) NOT NULL,
    dia_semana TINYINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_abertura TIME NOT NULL,
    hora_fechamento TIME NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    UNIQUE KEY uk_horario_estabelecimento_dia (estabelecimento_id, dia_semana)
) ENGINE=InnoDB;

CREATE TABLE bloqueios_agenda (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    profissional_id CHAR(36) NOT NULL,
    data_hora_inicio DATETIME NOT NULL,
    data_hora_fim DATETIME NOT NULL,
    motivo VARCHAR(200),
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    INDEX idx_bloqueios_profissional_data (profissional_id, data_hora_inicio)
) ENGINE=InnoDB;

-- ============================================================================
-- TRIGGER ANTI-OVERBOOKING (Impede agendamentos sobrepostos)
-- ============================================================================

DELIMITER $$

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
END$$

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
END$$

DELIMITER ;

-- ============================================================================
-- SEÇÃO 2: DML - DATA MANIPULATION LANGUAGE (Dados de Teste)
-- ============================================================================

-- ----------------------------------------------------------
-- Usuários (senhas: bcrypt hash de "Senha123")
-- ----------------------------------------------------------
INSERT INTO usuarios (id, nome, email, senha_hash, telefone, tipo, estabelecimento_id) VALUES
-- Admin
('00000000-0000-0000-0000-000000000001', 'Admin Sistema', 'admin@corterapido.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', '(31) 99999-0001', 'admin', NULL),
-- Estabelecimento 1: Barbearia do Carlos
('11111111-1111-1111-1111-111111111111', 'Carlos Silva', 'carlos@barbeariadocarlos.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', '(31) 99999-1111', 'estabelecimento', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
-- Estabelecimento 2: Cortes & Barba BH
('22222222-2222-2222-2222-222222222222', 'Roberto Santos', 'roberto@cortesbarbabh.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', '(31) 99999-2222', 'estabelecimento', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
-- Estabelecimento 3: Barber Shop Barreiro
('33333333-3333-3333-3333-333333333333', 'Marcos Oliveira', 'marcos@barbershopbarreiro.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', '(31) 99999-3333', 'estabelecimento', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
-- Profissionais com login
('44444444-4444-4444-4444-444444444444', 'João Barbeiro', 'joao@barbeiro.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', '(31) 98888-4444', 'profissional', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('55555555-5555-5555-5555-555555555555', 'Pedro Cabeleireiro', 'pedro@cabeleireiro.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', '(31) 98888-5555', 'profissional', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
-- Clientes
('66666666-6666-6666-6666-666666666666', 'Ana Cliente', 'ana@cliente.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', '(31) 97777-6666', 'cliente', NULL),
('77777777-7777-7777-7777-777777777777', 'Bruno Cliente', 'bruno@cliente.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', '(31) 97777-7777', 'cliente', NULL),
('88888888-8888-8888-8888-888888888888', 'Carla Cliente', 'carla@cliente.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', '(31) 97777-8888', 'cliente', NULL);

-- ----------------------------------------------------------
-- Estabelecimentos (3 em BH/Barreiro)
-- ----------------------------------------------------------
INSERT INTO estabelecimentos (id, slug, nome, responsavel, cidade, nicho, whatsapp, endereco, sobre, latitude, longitude, tema_cor, tema_layout, tema_titulo, tema_subtitulo, tempo_medio_atendimento, permite_auto_edicao, configuracao_pix_modo, configuracao_pix_chave, configuracao_pix_percentual_sinal, taxa_fidelidade, avaliacao, status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'barbearia-do-carlos', 'Barbearia do Carlos', 'Carlos Silva', 'Belo Horizonte', 'Barbearia', '(31) 99999-1111', 'Av. Afonso Pena, 1000 - Centro, Belo Horizonte - MG', 'Tradicional barbearia no centro de BH, cortes clássicos e barba.', -19.9227, -43.9451, '#8B4513', 'classico', 'Barbearia do Carlos', 'Tradição e estilo desde 2010', 30, TRUE, 'obrigatorio', 'carlos@barbeariadocarlos.com', 50, 10, 4.8, 'aprovado'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cortes-barra-bh', 'Cortes & Barba BH', 'Roberto Santos', 'Belo Horizonte', 'Barbearia', '(31) 99999-2222', 'Rua dos Inconfidentes, 500 - Savassi, Belo Horizonte - MG', 'Barbearia moderna na Savassi com ambiente descontraído.', -19.9333, -43.9378, '#1A1A2E', 'moderno', 'Cortes & Barba', 'Seu estilo, nossa arte', 40, FALSE, 'opcional', 'roberto@cortesbarbabh.com', 30, 5, 4.5, 'aprovado'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'barber-shop-barreiro', 'Barber Shop Barreiro', 'Marcos Oliveira', 'Belo Horizonte', 'Barbearia', '(31) 99999-3333', 'Av. Sinfrônio Brochado, 1200 - Barreiro, Belo Horizonte - MG', 'Barbearia no Barreiro, atendimento familiar e preço justo.', -19.9789, -43.9987, '#2D5016', 'minimalista', 'Barber Shop', 'Corte rápido, estilo duradouro', 25, TRUE, 'desativado', NULL, 0, 0, 4.2, 'aprovado');

-- ----------------------------------------------------------
-- Horários de funcionamento
-- ----------------------------------------------------------
INSERT INTO horarios_funcionamento (estabelecimento_id, dia_semana, hora_abertura, hora_fechamento) VALUES
-- Barbearia do Carlos: Seg-Sex 8h-20h, Sáb 8h-18h
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, '08:00:00', '20:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, '08:00:00', '20:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, '08:00:00', '20:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, '08:00:00', '20:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, '08:00:00', '20:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 6, '08:00:00', '18:00:00'),
-- Cortes & Barba: Seg-Sex 9h-21h, Sáb 9h-19h
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, '09:00:00', '21:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2, '09:00:00', '21:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3, '09:00:00', '21:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 4, '09:00:00', '21:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 5, '09:00:00', '21:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 6, '09:00:00', '19:00:00'),
-- Barber Shop Barreiro: Seg-Sex 8h-19h, Sáb 8h-16h
('cccccccc-cccc-cccc-cccc-cccccccccccc', 1, '08:00:00', '19:00:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 2, '08:00:00', '19:00:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 3, '08:00:00', '19:00:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 4, '08:00:00', '19:00:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 5, '08:00:00', '19:00:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 6, '08:00:00', '16:00:00');

-- ----------------------------------------------------------
-- Profissionais (com e sem login)
-- ----------------------------------------------------------
INSERT INTO profissionais (id, estabelecimento_id, usuario_id, nome, email, telefone, especialidades, ativo) VALUES
-- Barbearia do Carlos
('p1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'João Barbeiro', 'joao@barbeiro.com', '(31) 98888-4444', '["Corte Clássico", "Barba", "Degradê"]', TRUE),
('p2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'José Silva', NULL, '(31) 98888-2222', '["Corte Clássico", "Bigode"]', TRUE),
('p3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'Antonio Carlos', NULL, '(31) 98888-3333', '["Corte Social", "Barba", "Sobrancelha"]', TRUE),
-- Cortes & Barba BH
('p4444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'Pedro Cabeleireiro', 'pedro@cabeleireiro.com', '(31) 98888-5555', '["Corte Moderno", "Barba Desenhada", "Coloração"]', TRUE),
('p5555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL, 'Lucas Andrade', NULL, '(31) 98888-6666', '["Corte Social", "Barba"]', TRUE),
-- Barber Shop Barreiro
('p6666666-6666-6666-6666-666666666666', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, 'Marcos Junior', NULL, '(31) 98888-7777', '["Corte Clássico", "Barba", "Corte Infantil"]', TRUE),
('p7777777-7777-7777-7777-777777777777', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, 'Rafael Santos', NULL, '(31) 98888-8888', '["Corte Social", "Degradê", "Barba"]', TRUE);

-- ----------------------------------------------------------
-- Serviços
-- ----------------------------------------------------------
INSERT INTO servicos (id, estabelecimento_id, nome, descricao, preco, duracao_minutos, ordem_exibicao, ativo) VALUES
-- Barbearia do Carlos
('s1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Corte Clássico', 'Corte tradicional com tesoura e máquina', 35.00, 30, 1, TRUE),
('s2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Barba Completa', 'Barba com toalha quente e navalha', 25.00, 20, 2, TRUE),
('s3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Corte + Barba', 'Combo corte clássico e barba completa', 55.00, 45, 3, TRUE),
('s4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Degradê / Fade', 'Corte degradê profissional', 40.00, 35, 4, TRUE),
('s5555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sobrancelha', 'Design de sobrancelha masculina', 15.00, 10, 5, TRUE),
-- Cortes & Barba BH
('s6666666-6666-6666-6666-666666666666', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Corte Moderno', 'Corte com acabamento moderno', 45.00, 40, 1, TRUE),
('s7777777-7777-7777-7777-777777777777', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Barba Desenhada', 'Barba com design personalizado', 30.00, 25, 2, TRUE),
('s8888888-8888-8888-8888-888888888888', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Coloração', 'Coloração de cabelo/barba', 60.00, 50, 3, TRUE),
('s9999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Corte + Barba + Sobrancelha', 'Combo completo', 85.00, 60, 4, TRUE),
-- Barber Shop Barreiro
('saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Corte Clássico', 'Corte tradicional barbeiro', 25.00, 25, 1, TRUE),
('sbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Barba', 'Barba simples', 15.00, 15, 2, TRUE),
('sccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Corte + Barba', 'Combo econômico', 35.00, 35, 3, TRUE),
('sddddddd-dddd-dddd-dddd-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Corte Infantil', 'Corte para crianças até 12 anos', 20.00, 20, 4, TRUE);

-- ----------------------------------------------------------
-- Agendamentos (15+ agendamentos com preços congelados)
-- Base: 2026-12-01 (terça-feira)
-- ----------------------------------------------------------
INSERT INTO agendamentos (id, estabelecimento_id, profissional_id, cliente_id, data_hora_inicio, data_hora_fim, status, observacoes, valor_total) VALUES
-- Barbearia do Carlos - Agendamentos passados (concluídos)
('ag111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p1111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', '2026-11-25 10:00:00', '2026-11-25 10:30:00', 'concluido', NULL, 35.00),
('ag222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p1111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', '2026-11-26 14:00:00', '2026-11-26 14:45:00', 'concluido', 'Cliente prefere degradê baixo', 55.00),
('ag333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p2222222-2222-2222-2222-222222222222', '88888888-8888-8888-8888-888888888888', '2026-11-27 09:00:00', '2026-11-27 09:20:00', 'concluido', NULL, 25.00),
('ag444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p3333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', '2026-11-28 16:00:00', '2026-11-28 16:35:00', 'concluido', NULL, 40.00),
('ag555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p1111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', '2026-11-29 11:00:00', '2026-11-29 11:30:00', 'concluido', NULL, 35.00),
-- Barbearia do Carlos - Agendamentos futuros
('ag666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p1111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', '2026-12-01 09:00:00', '2026-12-01 09:30:00', 'agendado', NULL, 35.00),
('ag777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p2222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', '2026-12-01 10:00:00', '2026-12-01 10:20:00', 'confirmado', NULL, 25.00),
('ag888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p3333333-3333-3333-3333-333333333333', '88888888-8888-8888-8888-888888888888', '2026-12-01 14:00:00', '2026-12-01 14:45:00', 'agendado', 'Aniversário do cliente', 55.00),
('ag999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p1111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', '2026-12-02 15:00:00', '2026-12-02 15:30:00', 'agendado', NULL, 35.00),
('agaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p2222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', '2026-12-03 08:30:00', '2026-12-03 09:05:00', 'agendado', NULL, 40.00),
-- Cortes & Barba BH
('agbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'p4444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666', '2026-11-25 15:00:00', '2026-11-25 15:40:00', 'concluido', NULL, 45.00),
('agcccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'p5555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', '2026-12-01 11:00:00', '2026-12-01 11:25:00', 'agendado', NULL, 30.00),
-- Barber Shop Barreiro
('agdddddd-dddd-dddd-dddd-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'p6666666-6666-6666-6666-666666666666', '88888888-8888-8888-8888-888888888888', '2026-11-26 10:00:00', '2026-11-26 10:25:00', 'concluido', NULL, 25.00),
('ageeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'p7777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', '2026-12-01 09:30:00', '2026-12-01 10:00:00', 'agendado', NULL, 35.00);

-- ----------------------------------------------------------
-- Itens de Agendamento (PREÇOS CONGELADOS)
-- ----------------------------------------------------------
INSERT INTO item_agendamento (id, agendamento_id, servico_id, quantidade, preco_unitario, subtotal) VALUES
-- Agendamentos Barbearia do Carlos
('ia111111-1111-1111-1111-111111111111', 'ag111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 1, 35.00, 35.00),
('ia222222-2222-2222-2222-222222222222', 'ag222222-2222-2222-2222-222222222222', 's1111111-1111-1111-1111-111111111111', 1, 35.00, 35.00),
('ia222223-2222-2222-2222-222222222222', 'ag222222-2222-2222-2222-222222222222', 's2222222-2222-2222-2222-222222222222', 1, 25.00, 25.00),
('ia333333-3333-3333-3333-333333333333', 'ag333333-3333-3333-3333-333333333333', 's2222222-2222-2222-2222-222222222222', 1, 25.00, 25.00),
('ia444444-4444-4444-4444-444444444444', 'ag444444-4444-4444-4444-444444444444', 's4444444-4444-4444-4444-444444444444', 1, 40.00, 40.00),
('ia555555-5555-5555-5555-555555555555', 'ag555555-5555-5555-5555-555555555555', 's1111111-1111-1111-1111-111111111111', 1, 35.00, 35.00),
('ia666666-6666-6666-6666-666666666666', 'ag666666-6666-6666-6666-666666666666', 's1111111-1111-1111-1111-111111111111', 1, 35.00, 35.00),
('ia777777-7777-7777-7777-777777777777', 'ag777777-7777-7777-7777-777777777777', 's2222222-2222-2222-2222-222222222222', 1, 25.00, 25.00),
('ia888888-8888-8888-8888-888888888888', 'ag888888-8888-8888-8888-888888888888', 's1111111-1111-1111-1111-111111111111', 1, 35.00, 35.00),
('ia888889-8888-8888-8888-888888888888', 'ag888888-8888-8888-8888-888888888888', 's2222222-2222-2222-2222-222222222222', 1, 25.00, 25.00),
('ia999999-9999-9999-9999-999999999999', 'ag999999-9999-9999-9999-999999999999', 's1111111-1111-1111-1111-111111111111', 1, 35.00, 35.00),
('iaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'agaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 's4444444-4444-4444-4444-444444444444', 1, 40.00, 40.00),
-- Cortes & Barba
('ibbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'agbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 's6666666-6666-6666-6666-666666666666', 1, 45.00, 45.00),
('iccccccc-cccc-cccc-cccc-cccccccccccc', 'agcccccc-cccc-cccc-cccc-cccccccccccc', 's7777777-7777-7777-7777-777777777777', 1, 30.00, 30.00),
-- Barber Shop
('iddddddd-dddd-dddd-dddd-dddddddddddd', 'agdddddd-dddd-dddd-dddd-dddddddddddd', 'saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 25.00, 25.00),
('ieeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ageeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'sccccccc-cccc-cccc-cccc-cccccccccccc', 1, 35.00, 35.00);

-- ----------------------------------------------------------
-- Avaliações
-- ----------------------------------------------------------
INSERT INTO avaliacoes (id, agendamento_id, estabelecimento_id, cliente_id, profissional_id, estrelas, comentario) VALUES
('av111111-1111-1111-1111-111111111111', 'ag111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'p1111111-1111-1111-1111-111111111111', 5, 'Excelente corte, João é muito atencioso!'),
('av222222-2222-2222-2222-222222222222', 'ag222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 'p1111111-1111-1111-1111-111111111111', 5, 'Melhor barbearia de BH, super recomendo'),
('av333333-3333-3333-3333-333333333333', 'ag333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', 'p2222222-2222-2222-2222-222222222222', 4, 'Barba bem feita, ambiente agradável'),
('av444444-4444-4444-4444-444444444444', 'ag444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'p3333333-3333-3333-3333-333333333333', 5, 'Degradê perfeito!'),
('av555555-5555-5555-5555-555555555555', 'agbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 'p4444444-4444-4444-4444-444444444444', 4, 'Corte moderno, gostei do resultado'),
('av666666-6666-6666-6666-666666666666', 'agdddddd-dddd-dddd-dddd-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888888', 'p6666666-6666-6666-6666-666666666666', 4, 'Bom custo-benefício');

-- ----------------------------------------------------------
-- Planos de Assinatura
-- ----------------------------------------------------------
INSERT INTO planos_assinatura (id, nome, descricao, preco_mensal, preco_anual, limite_profissionais, limite_servicos, recursos, ativo) VALUES
('pl111111-1111-1111-1111-111111111111', 'Básico', 'Para barbearias pequenas', 99.00, 990.00, 3, 10, '["Agendamentos", "Clientes", "Relatórios básicos"]', TRUE),
('pl222222-2222-2222-2222-222222222222', 'Profissional', 'Para barbearias em crescimento', 199.00, 1990.00, 10, 30, '["Agendamentos", "Clientes", "Relatórios avançados", "Marketing", "Fidelidade"]', TRUE),
('pl333333-3333-3333-3333-333333333333', 'Enterprise', 'Para redes de barbearia', 499.00, 4990.00, 50, 100, '["Tudo do Profissional", "Multi-unidades", "API", "Suporte prioritário"]', TRUE);

-- ----------------------------------------------------------
-- Assinaturas
-- ----------------------------------------------------------
INSERT INTO assinaturas (id, estabelecimento_id, plano_id, status, ciclo, data_inicio, data_fim, data_proxima_cobranca, forma_pagamento) VALUES
('as111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pl222222-2222-2222-2222-222222222222', 'ativa', 'mensal', '2026-01-01', NULL, '2026-12-01', 'pix'),
('as222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'pl111111-1111-1111-1111-111111111111', 'ativa', 'anual', '2026-01-01', '2027-01-01', '2027-01-01', 'cartao'),
('as333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'pl111111-1111-1111-1111-111111111111', 'vencida', 'mensal', '2026-01-01', '2026-06-01', NULL, 'boleto');

-- ----------------------------------------------------------
-- Pagamentos
-- ----------------------------------------------------------
INSERT INTO pagamentos (id, agendamento_id, assinatura_id, estabelecimento_id, valor, metodo, status, transaction_id, data_pagamento) VALUES
-- Pagamentos de agendamentos
('pg111111-1111-1111-1111-111111111111', 'ag111111-1111-1111-1111-111111111111', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 35.00, 'pix', 'pago', 'txn_001', '2026-11-25 10:30:00'),
('pg222222-2222-2222-2222-222222222222', 'ag222222-2222-2222-2222-222222222222', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 55.00, 'cartao_credito', 'pago', 'txn_002', '2026-11-26 14:45:00'),
('pg333333-3333-3333-3333-333333333333', 'ag333333-3333-3333-3333-333333333333', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 25.00, 'dinheiro', 'pago', 'txn_003', '2026-11-27 09:20:00'),
('pg444444-4444-4444-4444-444444444444', 'ag444444-4444-4444-4444-444444444444', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 40.00, 'pix', 'pago', 'txn_004', '2026-11-28 16:35:00'),
('pg555555-5555-5555-5555-555555555555', 'agbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 45.00, 'cartao_debito', 'pago', 'txn_005', '2026-11-25 15:40:00'),
('pg666666-6666-6666-6666-666666666666', 'agdddddd-dddd-dddd-dddd-dddddddddddd', NULL, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 25.00, 'dinheiro', 'pago', 'txn_006', '2026-11-26 10:25:00'),
-- Pagamentos de assinaturas
('pg777777-7777-7777-7777-777777777777', NULL, 'as111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 199.00, 'pix', 'pago', 'txn_sub_001', '2026-11-01 10:00:00'),
('pg888888-8888-8888-8888-888888888888', NULL, 'as222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1990.00, 'cartao_credito', 'pago', 'txn_sub_002', '2026-01-01 10:00:00');

-- ----------------------------------------------------------
-- Publicações no Feed
-- ----------------------------------------------------------
INSERT INTO publicacoes_feed (id, estabelecimento_id, autor_id, legenda, arquivo_url, tipo, curtidas, compartilhamentos) VALUES
('pf111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Novo degradê do João! 🔥', 'https://exemplo.com/foto1.jpg', 'imagem', 25, 3),
('pf222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Promoção de natal: corte + barba por R$ 50!', 'https://exemplo.com/promo_natal.jpg', 'imagem', 42, 8),
('pf333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Chegou coloração nova! Agende sua avaliação.', 'https://exemplo.com/coloracao.jpg', 'imagem', 18, 2);

-- ----------------------------------------------------------
-- Notificações
-- ----------------------------------------------------------
INSERT INTO notificacoes (id, usuario_id, tipo, titulo, mensagem, lida) VALUES
('nt111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'agendamento', 'Agendamento confirmado', 'Seu agendamento para 01/12 às 09:00 foi confirmado', FALSE),
('nt222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', 'agendamento', 'Lembrete: agendamento amanhã', 'Não esqueça: corte + barba amanhã às 10:00', FALSE),
('nt333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'sistema', 'Novo agendamento', 'Você tem um novo agendamento para 01/12 às 09:00', FALSE);

-- ============================================================================
-- EXEMPLOS DE UPDATE E DELETE
-- ============================================================================

-- UPDATE: Atualizar avaliação média do estabelecimento
UPDATE estabelecimentos e
SET avaliacao = (
    SELECT ROUND(AVG(estrelas), 2)
    FROM avaliacoes a
    WHERE a.estabelecimento_id = e.id
)
WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc');

-- UPDATE: Marcar agendamento como concluído
UPDATE agendamentos
SET status = 'concluido', data_atualizacao = NOW()
WHERE id = 'ag666666-6666-6666-6666-666666666666';

-- DELETE: Remover bloqueio de agenda antigo
DELETE FROM bloqueios_agenda
WHERE data_hora_fim < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- DELETE: Desativar serviço (soft delete)
UPDATE servicos SET ativo = FALSE WHERE id = 's5555555-5555-5555-5555-555555555555';

-- ============================================================================
-- SEÇÃO 3: DQL - DATA QUERY LANGUAGE (8 Consultas Estratégicas)
-- ============================================================================

-- ----------------------------------------------------------
-- 1. Faturamento Mensal por Estabelecimento (últimos 6 meses)
-- ----------------------------------------------------------
SELECT
    e.nome AS estabelecimento,
    DATE_FORMAT(p.data_pagamento, '%Y-%m') AS mes,
    COUNT(p.id) AS total_transacoes,
    SUM(p.valor) AS faturamento_total,
    AVG(p.valor) AS ticket_medio
FROM pagamentos p
JOIN estabelecimentos e ON p.estabelecimento_id = e.id
WHERE p.status = 'pago'
  AND p.data_pagamento >= DATE_SUB((SELECT MAX(data_pagamento) FROM pagamentos WHERE status = 'pago'), INTERVAL 6 MONTH)
GROUP BY e.id, e.nome, DATE_FORMAT(p.data_pagamento, '%Y-%m')
ORDER BY e.nome, mes DESC;

-- ----------------------------------------------------------
-- 2. Agenda do Dia por Profissional (com slots livres)
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- 3. Ranking de Serviços Mais Solicitados (últimos 30 dias)
-- ----------------------------------------------------------
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
  AND a.data_hora_inicio >= DATE_SUB((SELECT MAX(data_hora_inicio) FROM agendamentos WHERE status = 'concluido'), INTERVAL 30 DAY)
GROUP BY s.id, s.nome, e.nome
ORDER BY quantidade_vendida DESC, receita_total DESC
LIMIT 10;

-- ----------------------------------------------------------
-- 4. Clientes Fiéis (Top 10 por frequência e valor)
-- ----------------------------------------------------------
SELECT
    c.nome AS cliente,
    c.email,
    COUNT(DISTINCT a.id) AS total_agendamentos,
    SUM(a.valor_total) AS valor_total_gasto,
    AVG(a.valor_total) AS ticket_medio,
    MAX(a.data_hora_inicio) AS ultimo_agendamento,
    DATEDIFF((SELECT MAX(data_hora_inicio) FROM agendamentos), MAX(a.data_hora_inicio)) AS dias_desde_ultimo
FROM agendamentos a
JOIN usuarios c ON a.cliente_id = c.id
WHERE a.status = 'concluido'
GROUP BY c.id, c.nome, c.email
HAVING total_agendamentos >= 2
ORDER BY total_agendamentos DESC, valor_total_gasto DESC
LIMIT 10;

-- ----------------------------------------------------------
-- 5. Horários de Pico (por hora do dia)
-- ----------------------------------------------------------
SELECT
    HOUR(data_hora_inicio) AS hora,
    COUNT(*) AS total_agendamentos,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM agendamentos WHERE status = 'concluido'), 2) AS percentual
FROM agendamentos
WHERE status = 'concluido'
GROUP BY HOUR(data_hora_inicio)
ORDER BY total_agendamentos DESC;

-- ----------------------------------------------------------
-- 6. Planos Ativos vs Vencidos (Status das Assinaturas)
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- 7. Avaliações Detalhadas por Estabelecimento
-- ----------------------------------------------------------
SELECT
    e.nome AS estabelecimento,
    e.avaliacao AS media_geral,
    COUNT(av.id) AS total_avaliacoes,
    ROUND(AVG(av.estrelas), 2) AS media_calculada,
    COUNT(CASE WHEN av.estrelas = 5 THEN 1 END) AS cinco_estrelas,
    COUNT(CASE WHEN av.estrelas = 4 THEN 1 END) AS quatro_estrelas,
    COUNT(CASE WHEN av.estrelas <= 3 THEN 1 END) AS tres_ou_menos,
    GROUP_CONCAT(DISTINCT CASE WHEN av.comentario IS NOT NULL THEN av.comentario END SEPARATOR ' | ') AS ultimos_comentarios
FROM estabelecimentos e
LEFT JOIN avaliacoes av ON e.id = av.estabelecimento_id
GROUP BY e.id, e.nome, e.avaliacao
ORDER BY media_calculada DESC, total_avaliacoes DESC;

-- ----------------------------------------------------------
-- 8. Auditoria de Preços Congelados (item_agendamento vs servicos atual)
-- ----------------------------------------------------------
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

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

SELECT 'Tabelas criadas:' AS info;
SHOW TABLES;

SELECT 'Contagem de registros:' AS info;
SELECT 'usuarios' AS tabela, COUNT(*) AS total FROM usuarios UNION ALL
SELECT 'estabelecimentos', COUNT(*) FROM estabelecimentos UNION ALL
SELECT 'profissionais', COUNT(*) FROM profissionais UNION ALL
SELECT 'servicos', COUNT(*) FROM servicos UNION ALL
SELECT 'agendamentos', COUNT(*) FROM agendamentos UNION ALL
SELECT 'item_agendamento', COUNT(*) FROM item_agendamento UNION ALL
SELECT 'avaliacoes', COUNT(*) FROM avaliacoes UNION ALL
SELECT 'planos_assinatura', COUNT(*) FROM planos_assinatura UNION ALL
SELECT 'assinaturas', COUNT(*) FROM assinaturas UNION ALL
SELECT 'pagamentos', COUNT(*) FROM pagamentos UNION ALL
SELECT 'publicacoes_feed', COUNT(*) FROM publicacoes_feed UNION ALL
SELECT 'notificacoes', COUNT(*) FROM notificacoes UNION ALL
SELECT 'horarios_funcionamento', COUNT(*) FROM horarios_funcionamento UNION ALL
SELECT 'bloqueios_agenda', COUNT(*) FROM bloqueios_agenda;

SELECT 'Triggers criados:' AS info;
SHOW TRIGGERS;