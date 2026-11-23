# Auditoria Completa - Corte Rápido

**Data:** 2026-11-23  
**Branch:** `develop`  
**Commit:** (atual)  
**Autor da Auditoria:** Claude Code  

---

## Resumo Executivo

| Métrica | Valor | Status |
|---------|-------|--------|
| **Testes** | 862 passing, 19 skipped | ✅ |
| **Cobertura Real** | 55.9% linhas, 80.4% funções | ❌ (threshold 100%) |
| **Lint** | 0 warnings/errors | ✅ |
| **TypeScript** | strict, sem erros | ✅ |
| **Build** | Sucesso (137kb gzipped) | ✅ |
| **CI/CD** | 4 jobs paralelos + deploy Pages | ✅ |

---

## Tabela de Classificação dos Conceitos (Seção 3.1 do Prompt Mestre)

| # | Conceito | Classificação | Evidência Concreta | Problemas Encontrados | Recomendação |
|---|----------|---------------|-------------------|----------------------|--------------|
| 1 | **Clean Architecture** | 🟡 **Parcial** | Estrutura em camadas existe: `componentes/`, `hooks/`, `servicos/`, `contexto/`, `utilitarios/`, `tipos/`, `constantes/` (DOCUMENTACAO.md:57-69) | - `api.ts` monolítico (2530 linhas) viola SRP brutalmente<br>- Arquitetura por camadas, não por features (docs diz migração planejada)<br>- PainelBarbeiro (505 lin) e PainelAdmin (480 lin) excedem limite 150 lin<br>- Hooks importam `api` diretamente (acoplamento) | **P1:** Refatorar `api.ts` em módulos por domínio (auth, estabelecimentos, agendamentos, feed, notificações, barbeiro, admin, mensagens). Migrar para estrutura feature-based. |
| 2 | **SOLID** | 🔴 **Incorreto** | - SRP: `api.ts` viola (17 domínios em 1 arquivo)<br>- OCP: Hooks abertos para extensão via callbacks<br>- LSP: Não aplicável (sem herança)<br>- ISP: Interfaces de hooks bem segregadas (Estado + Ações)<br>- DIP: Hooks dependem de `api` concreta, não abstração | - Violação grave do **SRP** em `api.ts` e telas grandes<br>- **DIP** violado: hooks acoplados à implementação concreta<br>- `PainelBarbeiro` e `PainelAdmin` misturam UI + lógica de negócio | **P1:** Extrair serviços por domínio. Injetar dependência via contexto/factory. Separar lógica de UI nas telas grandes. |
| 3 | **DRY** | 🟢 **Bem Aplicado** | - `constantes/index.ts`: 363 linhas de tokens centralizados (cores, espaçamento 4px, breakpoints, z-index, ícones SVG, mensagens)<br>- `utilitarios/formatar.ts`: 28 funções puras reutilizáveis<br>- `utilitarios/validar.ts`: 35 validadores compostos<br>- `utilitarios/datas.ts`: 26 utilitários de data<br>- Componentes UI reutilizados (18 componentes) | - Alguns hardcoded mock data em `PainelAdmin.tsx` e `PainelBarbeiro.tsx` duplicam estrutura de tipos | **P2:** Substituir mocks hardcoded por dados de `src/mocks/dados.ts` ou factory de testes. |
| 4 | **KISS** | 🟡 **Parcial** | - Componentes UI simples e focados (Botao, CampoTexto, Chip, etc.)<br>- Hooks com responsabilidade única por domínio<br>- Utilitários são funções puras simples | - `api.ts` extremamente complexo (2530 lin, 17 domínios)<br>- `PainelBarbeiro`/`PainelAdmin` fazem demais (UI + estado + API + formatação)<br>- `useFeed` gerencia otimista + paginação + CRUD + modal | **P1:** Quebrar `api.ts`. **P2:** Extrair lógica complexa dos painéis para hooks/services. |
| 5 | **YAGNI** | 🟢 **Bem Aplicado** | - Mock API simulada (latência, erro, localStorage) em vez de backend real<br>- PWA hook existe mas SW não implementado totalmente (19 testes skipped)<br>- Mapa (Leaflet) presente mas `Mapa.tsx` é placeholder<br>- Dark mode definido nos tokens mas não implementado | - Alguns tipos/constantes não usados (ex: `LAYOUTS`, `TIPOS_NOTIFICACAO` parciais) | **P3:** Limpar tokens não utilizados. Documentar decisões YAGNI em ADRs. |
| 6 | **Clean Code** | 🟡 **Parcial** | - Nomes em português sem acentos (`useAgendamentos`, `formatarMoeda`)<br>- Funções puras em `utilitarios/`<br>- Componentes UI com props tipadas<br>- AAA nos testes | - `api.ts`: funções longas, aninhamento profundo, magic numbers<br>- Telas >150 linhas misturam responsabilidades<br>- `useAgendamentosBarbeiro` usa `confirmarPresenca` como proxy para `atualizarStatus`<br>- CSS com `@mobile`/`@tablet` syntax inválida (warnings build) | **P1:** Refatorar `api.ts` e telas grandes. **P2:** Corrigir CSS syntax. Extrair formatação para utilitários. |
| 7 | **Design Patterns** | 🟡 **Parcial** | - **Repository**: `api.ts` agrupa por domínio<br>- **Factory**: `gerarId`, `clonarProfundo` em utilitários<br>- **Observer**: `useNotificacoes` polling + `IntersectionObserver` no Feed<br>- **Strategy**: `validar*` compostos<br>- **Compound Components**: `ChipGrupo`, `Select` com sub-componentes<br>- **Custom Hooks** como pattern principal de lógica | - **Singleton**: `estadoGlobal` em `api.ts` (anti-pattern)<br>- **Adapter**: Ausente (mock → real não tem camada)<br>- **Facade**: `api` object tenta ser mas vira god object<br>- **Error Boundary**: Não implementado<br>- **Provider Pattern**: Toast usa Context mas Auth não | **P1:** Remover `estadoGlobal` singleton. **P2:** Implementar Error Boundaries. **P3:** Adapter para API real. |
| 8 | **Custom Hooks** | 🟢 **Bem Aplicado** | 7 hooks principais com testes:<br>- `useAuth` (271 lin): auth completo + `usePermissao`, `useRequerAutenticacao`<br>- `useAgendamentos` + `useAgendamentosBarbeiro` (12K lin)<br>- `useEstabelecimentos` + `useEstabelecimento` + `useNichos` + `useCidades` (9K lin)<br>- `useFeed` + `useInspiracoes` (9K lin): otimista, paginação<br>- `useNotificacoes` + filtradas + não lidas (5.5K lin): polling 30s<br>- `usePWA` (4.9K lin): SW registration, install prompt, updates<br>- Padrão `EstadoX & AcoesX` consistente em todos | - `usePWA` tem 1.69% cobertura (19 skipped)<br>- `useAgendamentosBarbeiro` reutiliza `confirmarPresenca` como proxy (gambiarra)<br>- Hooks importam `api` diretamente (DIP violado) | **P1:** Testar `usePWA` (implementar SW real ou mockar melhor). **P2:** Injetar API via contexto. Corrigir proxy em `useAgendamentosBarbeiro`. |
| 9 | **Componentização** | 🟢 **Bem Aplicado** | 18 componentes UI + 3 layout:<br>- **UI**: Botao (5 vars), CampoTexto (5 derivados), Cartao, Chip, Modal, Select, Checkbox, Radio, Textarea, Avatar, Skeleton, Toast, Mapa<br>- **Layout**: Container, Cabecalho, BottomNav<br>- Props tipadas com `PropsComponenteBase` + variantes específicas<br>- Testes: 100% cobertura em Botao, CampoTexto, Cartao, Chip, Modal, Select, Checkbox, Radio, Textarea, Toast, Skeleton, Avatar | - `Cartao.tsx` 19KB (grande, múltiplas variantes)<br>- `Mapa.tsx` placeholder (não usa Leaflet real)<br>- `Skeleton` 32% cobertura<br>- `Radio` 48% cobertura<br>- `Toast.hooks.tsx` 25% cobertura | **P2:** Dividir `Cartao` em variantes menores. Implementar `Mapa` real. Aumentar cobertura de Skeleton/Radio/Toast.hooks. |
| 10 | **TypeScript Contracts** | 🟢 **Bem Aplicado** | - `src/tipos/index.ts` (311 lin): **todos** contratos centralizados<br>- Tipos: `Estabelecimento`, `Agendamento`, `Servico`, `Usuario`, `Publicacao`, `Notificacao`, `PlanoAssinatura`, `AssinaturaEstabelecimento`, etc.<br>- `ResultadoServico<T>` genérico para respostas API<br>- Props tipadas por componente (`PropsBotao`, `PropsCampoTexto`, etc.)<br>- `strict: true`, `noUnusedLocals/Parameters` ativos<br>- Path aliases `@/*` configurados | - `any` em alguns locais (ESLint permite com `_` prefix)<br>- `Mapa.tsx` tipagem `any` para Leaflet<br>- `tipo` em `Publicacao` como string não union type | **P2:** Eliminar `any` restantes. Usar union types para `Publicacao.tipo`. Tipar Leaflet corretamente. |
| 11 | **TDD / Test Patterns** | 🟡 **Parcial** | - **862 testes passing**, 19 skipped<br>- **Padrão AAA** visível nos testes<br>- `vi.mock` para `@/servicos/api`, `@/contexto/AuthContexto`<br>- `@testing-library/react` + `user-event` + `jest-dom`<br>- `renderHook` + `act` + `waitFor` para hooks<br>- Setup: matchMedia, localStorage, HTMLDialogElement mockados<br>- Testes de integração (Login.test.tsx: 34 testes fluxo completo) | - **Cobertura real 55.9%** (threshold 100% falha no CI!):<br>  - `src/telas/`: **0% cobertura** (exceto Login 100%)<br>  - `usePWA`: 1.69% (19 skipped)<br>  - `Skeleton`: 32%, `Radio`: 48%, `Toast.hooks`: 25%<br>  - `src/servicos/api.ts`: 81.89%<br>- **Teste flaky** identificado: `api.test.ts:1854-1873` (`obterSalvas` - `forcarSucesso()` após chamada que dispara erro aleatório)<br>- Sem testes E2E (Cypress/Playwright) | **P0:** Corrigir teste flaky `obterSalvas`.<br>**P1:** Testar telas principais (Feed, Explorar, Perfil, PainelBarbeiro, PainelAdmin, Agendamento, Cadastro, Configuracoes, Estabelecimento, Notificacoes).<br>**P2:** Aumentar cobertura hooks/componentes baixos. Adicionar testes E2E. |
| 12 | **Security** | 🟡 **Parcial** | - Validação client-side em `validar.ts` (CPF, WhatsApp, email, senha, preço, arquivo)<br>- Sanitização: `removerAcentos`, `gerarSlug`<br>- `localStorage` apenas para token/preferências (sem dados sensíveis)<br>- Helmet/CSP não aplicável (SPA static)<br>- Senhas hasheadas no mock (simulado) | - **Nenhum** rate limiting, CORS, CSP, headers segurança (static hosting)<br>- Token em localStorage (vulnerável a XSS) - deveria ser httpOnly cookie<br>- Validação apenas client-side (mock API não valida server-side)<br>- `perfil` expõe email/telefone sem proteção<br>- Admin actions sem audit log | **P1:** Documentar que segurança real depende de backend. **P2:** Migrar token para httpOnly cookie quando houver backend. **P3:** Implementar rate limiting, CSP, audit logs no backend. |
| 13 | **CI/CD** | 🟢 **Bem Aplicado** | - `.github/workflows/ci.yml`: 4 jobs paralelos (lint → typecheck → test → build)<br>- `needs` correto: build depende dos 3 anteriores<br>- Node 20, `npm ci`, cache npm<br>- `.github/workflows/deploy.yml`: build com `GITHUB_PAGES=true`, upload-pages-artifact, deploy-pages<br>- `concurrency: group: pages` com cancel-in-progress<br>- Permissions: `contents: read`, `pages: write`, `id-token: write` | - CI **falharia** hoje por cobertura < 100% (threshold configurado mas não atingido)<br>- Deploy roda typecheck+test novamente (redundante com CI)<br>- Sem preview deploys para PRs | **P0:** Ajustar threshold de cobertura OU aumentar cobertura real para 100%.<br>**P2:** Otimizar deploy (usar artifacts do CI). Adicionar preview PRs. |
| 14 | **Acessibilidade (a11y)** | 🟡 **Parcial** | - `eslint-plugin-jsx-a11y` ativo no ESLint<br>- `aria-label`, `aria-invalid`, `aria-busy`, `role="alert"`, `role="dialog"`, `aria-modal` presentes<br>- `aria-live="polite"` no Toast<br>- Focus visible: outline 2px offset 2px (docs)<br>- `prefers-reduced-motion` respeitado (docs)<br>- Skip link "Pular para conteúdo principal" (docs) | - **Não verificado na prática**: telas sem testes a11y<br>- `Mapa` (Leaflet) sem a11y<br>- Modal focus trap não testado<br>- Contrastes WCAG AA não validados automaticamente<br>- `BottomNav`/`Cabecalho` navegação teclado não testada | **P2:** Adicionar testes a11y (jest-axe). Validar contrastes. Testar focus trap. Implementar skip link real. |
| 15 | **Performance** | 🟡 **Parcial** | - **Code splitting**: `React.lazy` + `Suspense` por rota (App.tsx:172 lin, 18 rotas)<br>- `IntersectionObserver` para scroll infinito (Feed, Explorar)<br>- Debounce 300ms em busca (useEstabelecimentos)<br>- `abortController` cancela requests anteriores<br>- Otimista updates (Feed curtir/salvar)<br>- `Skeleton` loading states<br>- Bundle: 137kb gzipped (meta <150kb ✅) | - Imagens: sem WebP/AVIF, sem `srcset`, sem blur placeholder<br>- Fonts: sem `font-display: swap`, sem pré-carregamento, sem subset<br>- `leaflet` + `leaflet.markercluster` no bundle inicial (pesado)<br>- Sem `vite-bundle-analyzer` configurado<br>- PWA SW não implementado (cache offline) | **P2:** Otimizar imagens (WebP, lazy, srcset). Fonts: swap + preload. Code-split Leaflet (lazy). Configurar bundle analyzer. Implementar SW para cache. |
| 16 | **PWA** | 🔴 **Ausente/Incompleto** | - `usePWA.ts` hook completo: detecta install, registra SW, gerencia updates, online/offline<br>- `manifest.json` não encontrado<br>- `sw.js` não existe (hook tenta registrar `/sw.js`)<br>- 19 testes skipped em `usePWA.test.ts`<br>- Ícones PWA não definidos | - **PWA não funcional**: sem manifest, sem SW, sem ícones<br>- Hook existe mas infraestrutura faltando<br>- `beforeinstallprompt` nunca dispara sem manifest válido | **P1:** Criar `public/manifest.json`, `public/sw.js` (Workbox), ícones 192/512. Remover skipped tests. Validar instalação. |

---

## Classificação Consolidada

### ✅ Conceitos Bem Aplicados (Preservar)
| Conceito | Por que funciona |
|----------|------------------|
| **DRY** | Tokens centralizados, utilitários puros, componentes reutilizados |
| **YAGNI** | Mock API em vez de backend, PWA/Mapa/Dark mode preparados mas não forçados |
| **Custom Hooks** | 7 hooks bem testados, padrão `Estado & Acoes` consistente, lógica extraída da UI |
| **Componentização** | 18 componentes UI + 3 layout, props tipadas, testes 100% na maioria |
| **TypeScript Contracts** | `tipos/index.ts` centralizado, `strict: true`, path aliases, genéricos |
| **CI/CD** | Pipeline paralelo correto, deploy Pages configurado, concurrency control |

### 🟡 Conceitos Parcialmente Aplicados (Melhorar)
| Conceito | Gap Principal | Prioridade |
|----------|---------------|------------|
| **Clean Architecture** | `api.ts` monolítico, acoplamento hooks→api, estrutura por camadas não features | P1 |
| **KISS** | `api.ts` e painéis excessivamente complexos | P1 |
| **Design Patterns** | Singleton anti-pattern, sem Adapter/Error Boundary/Facade reais | P1/P2 |
| **TDD/Testes** | **Cobertura real 55.9% vs 100% threshold**, telas 0%, teste flaky | P0/P1 |
| **Security** | Validação só client-side, token localStorage, sem headers/rate limit | P1/P2 |
| **Acessibilidade** | ESLint a11y ativo mas não testado, contrastes não validados | P2 |
| **Performance** | Code splitting ok, mas imagens/fonts/Leaflet não otimizados, SW ausente | P2 |

### 🔴 Conceitos Incorretos/Ausentes (Corrigir/Implementar)
| Conceito | Problema | Prioridade |
|----------|----------|------------|
| **SOLID** | SRP violado brutalmente (`api.ts`, painéis), DIP violado (hooks→api concreta) | P1 |
| **PWA** | Hook existe mas **manifest, SW, ícones ausentes** - não instala | P1 |
| **Clean Code** | `api.ts` 2530 lin, CSS syntax inválida (`@mobile`), gambiarras (`confirmarPresenca` proxy) | P1 |

---

## Backlog de Correções (Ordenado por Prioridade)

### P0 - Crítico (Bloqueia CI/Qualidade)
1. **Corrigir teste flaky** `api.test.ts:1854-1873` - `obterSalvas`: mover `forcarSucesso()` para `beforeEach` ou antes da primeira chamada
2. **Ajustar threshold cobertura** OU **aumentar cobertura real para 100%** - CI falha atualmente

### P1 - Alto (Arquitetura/Funcionalidade Core)
3. **Refatorar `api.ts`** (2530 lin → módulos por domínio: `auth.ts`, `estabelecimentos.ts`, `agendamentos.ts`, `feed.ts`, `notificacoes.ts`, `barbeiro.ts`, `admin.ts`, `mensagens.ts`)
4. **Migrar para feature-based architecture** (`src/features/{auth,agendamentos,estabelecimentos,feed,notificacoes,painel-barbeiro,painel-admin,perfil}/`)
5. **Implementar PWA real**: `manifest.json`, `sw.js` (Workbox), ícones 192/512, remover skipped tests
6. **Eliminar `estadoGlobal` singleton** em `api.ts` - usar Context/Reducer ou estado local
7. **Corrigir DIP**: Injetar API via Context/Provider em vez de import direto nos hooks
8. **Separar lógica dos painéis**: Extrair `PainelBarbeiro`/`PainelAdmin` lógica para hooks/services, deixar só UI
9. **Corrigir CSS syntax inválida** (`@mobile` → `@media (max-width: 480px)` etc.)
10. **Token em httpOnly cookie** (quando backend existir) - documentar requisito

### P2 - Médio (Qualidade/Performance/A11y)
11. **Testar todas as telas** (Feed, Explorar, Perfil, PainelBarbeiro, PainelAdmin, Agendamento, Cadastro, Configuracoes, Estabelecimento, Notificacoes)
12. **Aumentar cobertura**: `usePWA`, `Skeleton`, `Radio`, `Toast.hooks`, `Cartao`, `Mapa`
13. **Implementar Error Boundaries** (por rota + global)
14. **Otimizar performance**: WebP/AVIF, `srcset`, blur placeholder, `font-display: swap`, preload fonts, lazy-load Leaflet
15. **Configurar `vite-bundle-analyzer`**
16. **Testes a11y** com `jest-axe`, validar contrastes WCAG AA, testar focus trap
17. **Implementar skip link** real ("Pular para conteúdo principal")
18. **Eliminar `any` restantes**, union types para `Publicacao.tipo`
19. **Dividir `Cartao.tsx`** em variantes menores
20. **Adicionar preview deploys para PRs**

### P3 - Baixo (Documentação/Débito Técnico)
21. **ADRs** para decisões arquiteturais (Clean Architecture, Mock API, PWA, Tokens)
22. **Limpar tokens não utilizados** (`LAYOUTS`, `TIPOS_NOTIFICACAO` parciais)
23. **Substituir mocks hardcoded** em painéis por factory/dados centralizados
24. **Documentar decisões YAGNI** explícitas

---

## Evidências Técnicas Detalhadas

### api.ts - Análise de Domínios (para refatoração P1)

| Domínio | Funções Exportadas | Linhas Aprox |
|---------|-------------------|--------------|
| `autenticacao` | entrar, cadastrarCliente, cadastrarProfissional, sair, obterSessao, atualizarPerfilCliente, alterarSenha, excluirConta, validarToken, renovarSessao, recuperarSenha, confirmarEmail, login, cadastrar | ~300 |
| `estabelecimentos` | listar, buscarPorSlug, buscarPorId, atualizar, configuracaoPix, mensagensAutomaticas, CRUD servicos (5), galeria (4), fila (3), avaliacoes (3) | ~500 |
| `agendamentos` | listarEstabelecimento, listarCliente, obterHorariosDisponiveis, criar, cancelar, reagendar, confirmarPagamentoPix, confirmarPresenca, avaliar, atualizarStatus, definirHorarioReal | ~400 |
| `feed` | listar, obter, criar, curtir, salvar, obterSalvas, excluir, compartilhar, denunciar | ~300 |
| `notificacoes` | listar, marcarLida, marcarTodasLidas, excluir, excluirTodasLidas, enviarMensagemClientes, enviarAvisoBarbeiros | ~200 |
| `perfil` | obter, atualizar, uploadAvatar | ~150 |
| `barbeiro` | dashboard, estatisticas | ~100 |
| `admin` | usuarios (4), estabelecimentos aprovar/rejeitar/suspender (3), planos (4), assinaturas (4), pagamentos (3) | ~400 |
| `mensagens` | conversas (listar, obter, criar, enviar) | ~180 |
| **Total** | **~50+ funções** | **2530 linhas** |

### Cobertura por Diretório (Atual)

| Diretório | Statements | Branches | Functions | Lines |
|-----------|------------|----------|-----------|-------|
| `src/componentes/ui` | 94.5% | 88.2% | 92.1% | 94.5% |
| `src/componentes/layout` | 98.2% | 95.1% | 100% | 98.2% |
| `src/hooks` | 79.6% | 75.8% | 85.0% | 79.6% |
| `src/utilitarios` | 99.3% | 96.7% | 100% | 99.3% |
| `src/constantes` | 100% | 100% | 100% | 100% |
| `src/servicos` | 81.8% | 82.0% | 79.9% | 81.8% |
| `src/telas` | **5.2%** | **74.4%** | **47.4%** | **5.2%** |
| `src/tipos` | 0% | 0% | 0% | 0% |
| **TOTAL** | **55.9%** | **85.3%** | **80.4%** | **55.9%** |

### Teste Flaky - Root Cause

```typescript
// api.test.ts:1854-1873
it('deve retornar publicações salvas do usuário', async () => {
  // PROBLEMA: forcarSucesso() chamado DEPOIS de api.feed.salvar()
  // que internamente chama alternarInspiracao() → simularErroAleatorio()
  const salvarResult = await api.feed.salvar('post-id', 'user@email.com'); // dispara erro 5%
  api.forcarSucesso(); // tarde demais - erro já ocorreu
  const result = await api.feed.obterSalvas('user@email.com');
  expect(result.sucesso).toBe(true);
});
```

**Fix:** Mover `api.forcarSucesso()` para `beforeEach` do describe `obterSalvas` ou antes do primeiro `api.feed.salvar()`.

---

## Conclusão

O projeto **tem fundamentos sólidos** (TypeScript strict, Clean Architecture em camadas, Custom Hooks bem feitos, Componentização, CI/CD, Design System tokens), mas **três problemas críticos impedem qualidade profissional**:

1. **`api.ts` monolítico (2530 lin)** viola SRP/DIP/KISS - precisa ser quebrado **agora**
2. **Cobertura real 55.9% vs threshold 100%** - CI está "verde" mas falharia se rodasse coverage (testes telas 0%)
3. **PWA incompleto** - hook existe mas infraestrutura (manifest, SW, ícones) não

**Recomendação:** Não iniciar refatoração geral antes de resolver P0/P1. Prioridade absoluta: corrigir teste flaky, ajustar threshold OU cobrir telas, quebrar `api.ts`, implementar PWA real.

---

*Auditoria baseada em leitura de código fonte, execução de testes, lint, typecheck, build e análise de cobertura. Nenhuma refatoração foi realizada.*