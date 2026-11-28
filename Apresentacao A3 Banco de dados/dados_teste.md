# Dados de Teste (DML) - Corte Rápido

Documentação dos dados inseridos pelo `database/banco_corte_rapido_mysql.sql`.

---

## Usuários (9 registros)

| ID | Nome | Email | Tipo | Estabelecimento | Senha |
|---|---|---|---|---|---|
| `00000000-0000-0000-0000-000000000001` | Admin Sistema | admin@corterapido.com | admin | - | Senha123 |
| `11111111-1111-1111-1111-111111111111` | Carlos Silva | carlos@barbeariadocarlos.com | estabelecimento | Barbearia do Carlos | Senha123 |
| `22222222-2222-2222-2222-222222222222` | Roberto Santos | roberto@cortesbarbabh.com | estabelecimento | Cortes & Barba BH | Senha123 |
| `33333333-3333-3333-3333-333333333333` | Marcos Oliveira | marcos@barbershopbarreiro.com | estabelecimento | Barber Shop Barreiro | Senha123 |
| `44444444-4444-4444-4444-444444444444` | João Barbeiro | joao@barbeiro.com | profissional | Barbearia do Carlos | Senha123 |
| `55555555-5555-5555-5555-555555555555` | Pedro Cabeleireiro | pedro@cabeleireiro.com | profissional | Cortes & Barba BH | Senha123 |
| `66666666-6666-6666-6666-666666666666` | Ana Cliente | ana@cliente.com | cliente | - | Senha123 |
| `77777777-7777-7777-7777-777777777777` | Bruno Cliente | bruno@cliente.com | cliente | - | Senha123 |
| `88888888-8888-8888-8888-888888888888` | Carla Cliente | carla@cliente.com | cliente | - | Senha123 |

**Hash da senha:** `$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S` (bcrypt cost 12 de "Senha123")

---

## Estabelecimentos (3 em Belo Horizonte)

| ID | Slug | Nome | Responsável | Bairro/Região | Nicho | Status | Avaliação |
|---|---|---|---|---|---|---|---|
| `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | barbearia-do-carlos | Barbearia do Carlos | Carlos Silva | Centro (Av. Afonso Pena) | Barbearia | aprovado | 4.80 |
| `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | cortes-barra-bh | Cortes & Barba BH | Roberto Santos | Savassi (Rua dos Inconfidentes) | Barbearia | aprovado | 4.50 |
| `cccccccc-cccc-cccc-cccc-cccccccccccc` | barber-shop-barreiro | Barber Shop Barreiro | Marcos Oliveira | Barreiro (Av. Sinfrônio Brochado) | Barbearia | aprovado | 4.20 |

**Configurações PIX:**
- Barbearia do Carlos: **Obrigatório** - `carlos@barbeariadocarlos.com` - 50% sinal
- Cortes & Barba BH: **Opcional** - `roberto@cortesbarbabh.com` - 30% sinal
- Barber Shop Barreiro: **Desativado** - sem chave - 0% sinal

**Temas:**
- Barbearia do Carlos: Clássico (#8B4513 marrom) - "Tradição e estilo desde 2010"
- Cortes & Barba BH: Moderno (#1A1A2E azul escuro) - "Seu estilo, nossa arte"
- Barber Shop Barreiro: Minimalista (#2D5016 verde) - "Corte rápido, estilo duradouro"

---

## Horários de Funcionamento (18 registros - 6 por estabelecimento)

**Barbearia do Carlos** (Seg-Sex 8h-20h, Sáb 8h-18h, Dom fechado)
**Cortes & Barba BH** (Seg-Sex 9h-21h, Sáb 9h-19h, Dom fechado)
**Barber Shop Barreiro** (Seg-Sex 8h-19h, Sáb 8h-16h, Dom fechado)

```sql
-- Dia da semana: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
```

---

## Profissionais (7 registros)

| ID | Estabelecimento | Usuario_ID (login) | Nome | Email | Especialidades | Ativo |
|---|---|---|---|---|---|---|
| `p1111111-1111-1111-1111-111111111111` | Barbearia do Carlos | `44444444...` (João) | João Barbeiro | joao@barbeiro.com | ["Corte Clássico", "Barba", "Degradê"] | ✓ |
| `p2222222-2222-2222-2222-222222222222` | Barbearia do Carlos | NULL | José Silva | - | ["Corte Clássico", "Bigode"] | ✓ |
| `p3333333-3333-3333-3333-333333333333` | Barbearia do Carlos | NULL | Antonio Carlos | - | ["Corte Social", "Barba", "Sobrancelha"] | ✓ |
| `p4444444-4444-4444-4444-444444444444` | Cortes & Barba BH | `55555555...` (Pedro) | Pedro Cabeleireiro | pedro@cabeleireiro.com | ["Corte Moderno", "Barba Desenhada", "Coloração"] | ✓ |
| `p5555555-5555-5555-5555-555555555555` | Cortes & Barba BH | NULL | Lucas Andrade | - | ["Corte Social", "Barba"] | ✓ |
| `p6666666-6666-6666-6666-666666666666` | Barber Shop Barreiro | NULL | Marcos Junior | - | ["Corte Clássico", "Barba", "Corte Infantil"] | ✓ |
| `p7777777-7777-7777-7777-777777777777` | Barber Shop Barreiro | NULL | Rafael Santos | - | ["Corte Social", "Degradê", "Barba"] | ✓ |

---

## Serviços (14 registros)

### Barbearia do Carlos (5 serviços)
| ID | Nome | Preço | Duração | Ordem |
|---|---|---|---|---|
| `s1111111-1111-1111-1111-111111111111` | Corte Clássico | 35.00 | 30 min | 1 |
| `s2222222-2222-2222-2222-222222222222` | Barba Completa | 25.00 | 20 min | 2 |
| `s3333333-3333-3333-3333-333333333333` | Corte + Barba | 55.00 | 45 min | 3 |
| `s4444444-4444-4444-4444-444444444444` | Degradê / Fade | 40.00 | 35 min | 4 |
| `s5555555-5555-5555-5555-555555555555` | Sobrancelha | 15.00 | 10 min | 5 |

### Cortes & Barba BH (4 serviços)
| ID | Nome | Preço | Duração | Ordem |
|---|---|---|---|---|
| `s6666666-6666-6666-6666-666666666666` | Corte Moderno | 45.00 | 40 min | 1 |
| `s7777777-7777-7777-7777-777777777777` | Barba Desenhada | 30.00 | 25 min | 2 |
| `s8888888-8888-8888-8888-888888888888` | Coloração | 60.00 | 50 min | 3 |
| `s9999999-9999-9999-9999-999999999999` | Corte + Barba + Sobrancelha | 85.00 | 60 min | 4 |

### Barber Shop Barreiro (4 serviços)
| ID | Nome | Preço | Duração | Ordem |
|---|---|---|---|---|
| `saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | Corte Clássico | 25.00 | 25 min | 1 |
| `sbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | Barba | 15.00 | 15 min | 2 |
| `sccccccc-cccc-cccc-cccc-cccccccccccc` | Corte + Barba | 35.00 | 35 min | 3 |
| `sddddddd-dddd-dddd-dddd-dddddddddddd` | Corte Infantil | 20.00 | 20 min | 4 |

---

## Agendamentos (15 registros)

### Período: 25/11/2026 a 03/12/2026

| ID | Estabelecimento | Profissional | Cliente | Início | Fim | Status | Valor | Obs |
|---|---|---|---|---|---|---|---|---|
| `ag111111-1111-1111-1111-111111111111` | Barbearia Carlos | João Barbeiro | Ana | 25/11 10:00 | 10:30 | concluido | 35.00 | - |
| `ag222222-2222-2222-2222-222222222222` | Barbearia Carlos | João Barbeiro | Bruno | 26/11 14:00 | 14:45 | concluido | 55.00 | Degradê baixo |
| `ag333333-3333-3333-3333-333333333333` | Barbearia Carlos | José Silva | Carla | 27/11 09:00 | 09:20 | concluido | 25.00 | - |
| `ag444444-4444-4444-4444-444444444444` | Barbearia Carlos | Antonio Carlos | Ana | 28/11 16:00 | 16:35 | concluido | 40.00 | - |
| `ag555555-5555-5555-5555-555555555555` | Barbearia Carlos | João Barbeiro | Bruno | 29/11 11:00 | 11:30 | concluido | 35.00 | - |
| `ag666666-6666-6666-6666-666666666666` | Barbearia Carlos | João Barbeiro | Ana | 01/12 09:00 | 09:30 | agendado | 35.00 | - |
| `ag777777-7777-7777-7777-777777777777` | Barbearia Carlos | José Silva | Bruno | 01/12 10:00 | 10:20 | confirmado | 25.00 | - |
| `ag888888-8888-8888-8888-888888888888` | Barbearia Carlos | Antonio Carlos | Carla | 01/12 14:00 | 14:45 | agendado | 55.00 | Aniversário |
| `ag999999-9999-9999-9999-999999999999` | Barbearia Carlos | João Barbeiro | Ana | 02/12 15:00 | 15:30 | agendado | 35.00 | - |
| `agaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | Barbearia Carlos | José Silva | Bruno | 03/12 08:30 | 09:05 | agendado | 40.00 | - |
| `agbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | Cortes & Barba | Pedro Cabeleireiro | Ana | 25/11 15:00 | 15:40 | concluido | 45.00 | - |
| `agcccccc-cccc-cccc-cccc-cccccccccccc` | Cortes & Barba | Lucas Andrade | Bruno | 01/12 11:00 | 11:25 | agendado | 30.00 | - |
| `agdddddd-dddd-dddd-dddd-dddddddddddd` | Barber Shop | Marcos Junior | Carla | 26/11 10:00 | 10:25 | concluido | 25.00 | - |
| `ageeeeee-eeee-eeee-eeee-eeeeeeeeeeee` | Barber Shop | Rafael Santos | Ana | 01/12 09:30 | 10:00 | agendado | 35.00 | - |

---

## Itens de Agendamento (16 registros - Preços Congelados)

| Agendamento | Serviço | Qtd | Preço Unit. | Subtotal |
|---|---|---|---|---|
| ag111111... | Corte Clássico | 1 | 35.00 | 35.00 |
| ag222222... | Corte Clássico | 1 | 35.00 | 35.00 |
| ag222222... | Barba Completa | 1 | 25.00 | 25.00 |
| ag333333... | Barba Completa | 1 | 25.00 | 25.00 |
| ag444444... | Degradê / Fade | 1 | 40.00 | 40.00 |
| ag555555... | Corte Clássico | 1 | 35.00 | 35.00 |
| ag666666... | Corte Clássico | 1 | 35.00 | 35.00 |
| ag777777... | Barba Completa | 1 | 25.00 | 25.00 |
| ag888888... | Corte Clássico | 1 | 35.00 | 35.00 |
| ag888888... | Barba Completa | 1 | 25.00 | 25.00 |
| ag999999... | Corte Clássico | 1 | 35.00 | 35.00 |
| agaaaaaa... | Degradê / Fade | 1 | 40.00 | 40.00 |
| agbbbbbb... | Corte Moderno | 1 | 45.00 | 45.00 |
| agcccccc... | Barba Desenhada | 1 | 30.00 | 30.00 |
| agdddddd... | Corte Clássico | 1 | 25.00 | 25.00 |
| ageeeeee... | Corte + Barba | 1 | 35.00 | 35.00 |

---

## Avaliações (6 registros)

| ID | Agendamento | Estabelecimento | Cliente | Profissional | Estrelas | Comentário |
|---|---|---|---|---|---|---|
| `av111111...` | ag111111... | Barbearia Carlos | Ana | João Barbeiro | 5 | Excelente corte, João é muito atencioso! |
| `av222222...` | ag222222... | Barbearia Carlos | Bruno | João Barbeiro | 5 | Melhor barbearia de BH, super recomendo |
| `av333333...` | ag333333... | Barbearia Carlos | Carla | José Silva | 4 | Barba bem feita, ambiente agradável |
| `av444444...` | ag444444... | Barbearia Carlos | Ana | Antonio Carlos | 5 | Degradê perfeito! |
| `av555555...` | agbbbbbb... | Cortes & Barba | Ana | Pedro Cabeleireiro | 4 | Corte moderno, gostei do resultado |
| `av666666...` | agdddddd... | Barber Shop | Carla | Marcos Junior | 4 | Bom custo-benefício |

---

## Planos de Assinatura (3 registros)

| ID | Nome | Preço Mensal | Preço Anual | Limite Prof. | Limite Serv. | Recursos |
|---|---|---|---|---|---|---|
| `pl111111...` | Básico | 99.00 | 990.00 | 3 | 10 | ["Agendamentos", "Clientes", "Relatórios básicos"] |
| `pl222222...` | Profissional | 199.00 | 1990.00 | 10 | 30 | ["Agendamentos", "Clientes", "Relatórios avançados", "Marketing", "Fidelidade"] |
| `pl333333...` | Enterprise | 499.00 | 4990.00 | 50 | 100 | ["Tudo do Profissional", "Multi-unidades", "API", "Suporte prioritário"] |

---

## Assinaturas (3 registros)

| ID | Estabelecimento | Plano | Status | Ciclo | Início | Fim | Próxima Cobrança | Forma |
|---|---|---|---|---|---|---|---|---|
| `as111111...` | Barbearia Carlos | Profissional | ativa | mensal | 2026-01-01 | - | 2026-12-01 | pix |
| `as222222...` | Cortes & Barba | Básico | ativa | anual | 2026-01-01 | 2027-01-01 | 2027-01-01 | cartao |
| `as333333...` | Barber Shop | Básico | vencida | mensal | 2026-01-01 | 2026-06-01 | - | boleto |

---

## Pagamentos (8 registros)

| ID | Tipo | Agendamento/Assinatura | Estabelecimento | Valor | Método | Status | Transaction ID | Data |
|---|---|---|---|---|---|---|---|---|
| `pg111111...` | Agendamento | ag111111... | Barbearia Carlos | 35.00 | pix | pago | txn_001 | 25/11 10:30 |
| `pg222222...` | Agendamento | ag222222... | Barbearia Carlos | 55.00 | cartao_credito | pago | txn_002 | 26/11 14:45 |
| `pg333333...` | Agendamento | ag333333... | Barbearia Carlos | 25.00 | dinheiro | pago | txn_003 | 27/11 09:20 |
| `pg444444...` | Agendamento | ag444444... | Barbearia Carlos | 40.00 | pix | pago | txn_004 | 28/11 16:35 |
| `pg555555...` | Agendamento | agbbbbbb... | Cortes & Barba | 45.00 | cartao_debito | pago | txn_005 | 25/11 15:40 |
| `pg666666...` | Agendamento | agdddddd... | Barber Shop | 25.00 | dinheiro | pago | txn_006 | 26/11 10:25 |
| `pg777777...` | Assinatura | as111111... | Barbearia Carlos | 199.00 | pix | pago | txn_sub_001 | 01/11 10:00 |
| `pg888888...` | Assinatura | as222222... | Cortes & Barba | 1990.00 | cartao_credito | pago | txn_sub_002 | 01/01 10:00 |

---

## Publicações Feed (3 registros)

| ID | Estabelecimento | Autor | Legenda | Arquivo | Tipo | Curtidas | Compart. |
|---|---|---|---|---|---|---|---|
| `pf111111...` | Barbearia Carlos | Carlos | Novo degradê do João! 🔥 | foto1.jpg | imagem | 25 | 3 |
| `pf222222...` | Barbearia Carlos | Carlos | Promoção natal: corte + barba R$ 50! | promo_natal.jpg | imagem | 42 | 8 |
| `pf333333...` | Cortes & Barba | Roberto | Chegou coloração nova! Agende avaliação. | coloracao.jpg | imagem | 18 | 2 |

---

## Notificações (3 registros)

| ID | Usuário | Tipo | Título | Mensagem | Lida |
|---|---|---|---|---|---|
| `nt111111...` | Ana Cliente | agendamento | Agendamento confirmado | Seu agendamento para 01/12 às 09:00 foi confirmado | Não |
| `nt222222...` | Bruno Cliente | agendamento | Lembrete: agendamento amanhã | Não esqueça: corte + barba amanhã às 10:00 | Não |
| `nt333333...` | João Barbeiro | sistema | Novo agendamento | Você tem um novo agendamento para 01/12 às 09:00 | Não |

---

## Resumo de Contagens

| Tabela | Registros |
|---|---|
| usuarios | 9 |
| estabelecimentos | 3 |
| horarios_funcionamento | 18 |
| profissionais | 7 |
| servicos | 14 |
| agendamentos | 15 |
| item_agendamento | 16 |
| avaliacoes | 6 |
| planos_assinatura | 3 |
| assinaturas | 3 |
| pagamentos | 8 |
| publicacoes_feed | 3 |
| notificacoes | 3 |
| **TOTAL** | **108** |

---

## Cenários de Teste Cobertos

✅ **Multi-tenancy**: 3 estabelecimentos isolados  
✅ **Profissionais com/sem login**: 2 com usuario_id, 5 sem  
✅ **Agendamentos passados/futuros**: 5 concluídos, 10 futuros  
✅ **Múltiplos serviços por agendamento**: ag222222 (2 itens), ag888888 (2 itens)  
✅ **Preços congelados**: 16 itens com preço no momento  
✅ **Avaliações 1-5 estrelas**: 4x5, 2x4  
✅ **Assinaturas ativas/vencidas**: 2 ativas, 1 vencida  
✅ **Pagamentos múltiplos métodos**: pix, cartão, dinheiro  
✅ **Feed social**: 3 posts com engajamento  
✅ **Notificações**: cliente + profissional  
✅ **Horários diferentes**: 3 regimes de funcionamento  
✅ **Triggers anti-overbooking**: testáveis com INSERT/UPDATE conflitantes