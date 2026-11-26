# Documentação Técnica - Corte Rápido

## Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Decisões de Arquitetura (ADRs)](#decisões-de-arquitetura-adrs)
4. [Padrões de Código](#padrões-de-código)
5. [Guias de Desenvolvimento](#guias-de-desenvolvimento)
6. [Testes](#testes)
7. [CI/CD](#cicd)
8. [Deploy](#deploy)
9. [Segurança](#segurança)
10. [Performance](#performance)
11. [Acessibilidade](#acessibilidade)
12. [PWA](#pwa)

---

## Visão Geral

**Corte Rápido** é uma plataforma de agendamento para barbearias, conectando clientes a barbeiros e estabelecimentos.

### Stack Tecnológica
- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: CSS Modules + CSS Custom Properties (Design System)
- **Testes**: Vitest + React Testing Library + Playwright (E2E)
- **Build**: Vite + esbuild
- **Deploy**: Vercel
- **CI/CD**: GitHub Actions

### Princípios Norteadores
- **SOLID** + **Clean Code** + **Clean Architecture**
- **Feature-based architecture** (domínios isolados)
- **Dependency Injection** via interfaces (DIP)
- **Result<T,E>** para tratamento de erros (discriminated unions)
- **AbortController** para race conditions
- **Optimistic UI** com rollback
- **WCAG 2.2 AA** compliance
- **Mobile-first** responsive design

---

## Arquitetura

### Estrutura de Pastas
```
src/
├── componentes/           # Componentes base (UI kit)
│   ├── atoms/             # Botões, inputs, switches, etc.
│   ├── molecules/         # Cards, modais, formulários
│   └── organisms/         # Headers, footers, layouts complexos
├── features/              # Domínios de negócio (feature-based)
│   ├── agendamento/
│   ├── autenticacao/
│   ├── configuracoes/
│   ├── estabelecimentos/
│   ├── feed/
│   ├── onboarding/
│   ├── painel-admin/
│   ├── painel-barbeiro/
│   └── perfil/
├── ganchos/               # Hooks compartilhados
├── regras/                # Regras de negócio puras (sem React)
├── servicos/              # Serviços compartilhados (API, auth)
├── tipos/                 # Tipos TypeScript globais
├── estilos/               # Design system (tokens, globals)
├── utils/                 # Utilitários puros
├── main.tsx               # Entry point
└── App.tsx                # Root component
```

### Feature Structure (cada domínio)
```
features/{dominio}/
├── components/            # Componentes React (< 150 linhas)
├── hooks/                 # Hooks de estado/negócio
├── services/              # Interface + Implementação + DI
├── types/                 # Types + Zod schemas
├── rules/                 # Regras puras (< 30 linhas, zero React)
├── __tests__/             # Testes unitários (boundary values)
└── index.ts               # Domain exports
```

---

## Decisões de Arquitetura (ADRs)

### ADR-001: Feature-Based Architecture
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Necessidade de escalar código mantendo isolamento de domínios.

**Decisão**: Organizar código por features/domínios em vez de camadas técnicas.

**Consequências**:
- ✅ Isolamento de mudanças (baixo acoplamento)
- ✅ Fácil onboarding (tudo relacionado junto)
- ✅ Testes co-localizados
- ⚠️ Duplicação ocasional de utilitários (aceitável)

---

### ADR-002: Dependency Injection via Interfaces (DIP)
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Testabilidade e desacoplamento de implementações externas.

**Decisão**: Definir interfaces (`I{Feature}Service`) e injetar via factory/singleton.

```typescript
// Interface
export interface IAgendamentoService {
  criar(dados: CriarAgendamentoDTO): Promise<Result<Agendamento>>;
}

// Implementação
export class AgendamentoService implements IAgendamentoService { ... }

// Factory + Singleton
let _instancia: IAgendamentoService | null = null;
export function getAgendamentoService(): IAgendamentoService { ... }
export function setAgendamentoService(s: IAgendamentoService): void { ... }
```

**Consequências**:
- ✅ Testes com mocks triviais
- ✅ Troca de implementação (REST → GraphQL → Mock)
- ✅ SSR/SSG friendly

---

### ADR-003: Result<T,E> Discriminated Unions
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Tratamento de erros explícito, sem exceções para fluxo de controle.

**Decisão**: Usar discriminated unions para todos os retornos de serviço/regras.

```typescript
type Result<T, E = string> =
  | { sucesso: true; dados: T }
  | { sucesso: false; erro: E; codigo: string };

// Uso
const resultado = await service.buscar(id);
if (!resultado.sucesso) {
  // Tratar erro: resultado.erro, resultado.codigo
  return;
}
// TypeScript narrows to { sucesso: true; dados: T }
console.log(resultado.dados);
```

**Consequências**:
- ✅ Erros tipados e obrigatórios
- ✅ Sem try/catch para fluxo normal
- ✅ Exaustividade no TypeScript

---

### ADR-004: Pure Business Rules (Zero React)
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Testabilidade unitária pura, separação de responsabilidades.

**Decisão**: Regras de negócio em `rules/` - funções puras, <30 linhas, sem dependências React.

```typescript
// ✅ Bom: pura, testável, independente
export function validarAgendamento(dados: AgendamentoDTO): Result<Agendamento> {
  if (!dados.servicos?.length) return { sucesso: false, erro: 'Serviços obrigatórios', codigo: 'NO_SERVICES' };
  return { sucesso: true, dados: sanitizar(dados) };
}

// ❌ Ruim: acoplada a React, difícil de testar
export function useValidarAgendamento() { ... }
```

**Consequências**:
- ✅ Testes rápidos (ms, sem render)
- ✅ Reutilizáveis (server/client)
- ✅ Documentação viva

---

### ADR-005: AbortController para Race Conditions
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Requisições obsoletas causam bugs (setState em componente desmontado, dados errados).

**Decisão**: Todo hook/serviço usa `AbortController`; `useEffect` cleanup aborta.

```typescript
export function useAgendamentos() {
  const abortRef = useRef<AbortController>(null);

  const carregar = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const resposta = await service.listar(signal);
    if (!signal.aborted) setDados(resposta.dados);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);
}
```

**Consequências**:
- ✅ Zero memory leaks
- ✅ Zero state updates obsoletos
- ✅ Padrão nativo da web

---

### ADR-006: Optimistic UI com Rollback
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Latência percebida deve ser mínima; UX fluida.

**Decisão**: Atualizar estado local imediatamente, reverter em erro.

```typescript
const atualizar = useCallback(async (dados: Partial<Perfil>) => {
  const anterior = perfil; // Snapshot
  setPerfil(p => p ? { ...p, ...dados } : null); // Optimistic
  try {
    const resp = await service.atualizar(dados);
    if (!resp.sucesso) throw new Error(resp.erro);
    if (resp.dados) setPerfil(resp.dados); // Confirmar servidor
  } catch {
    setPerfil(anterior); // Rollback
    throw erro;
  }
}, [perfil, service]);
```

**Consequências**:
- ✅ Feedback instantâneo
- ✅ Consistência eventual
- ⚠️ Complexidade extra (vale a pena)

---

### ADR-007: 6-State Design System
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Consistência visual e acessibilidade em todos componentes.

**Decisão**: Todos componentes interativos implementam 6 estados via CSS:

| Estado | Pseudo-classe | Uso |
|--------|---------------|-----|
| Default | (nenhuma) | Repouso |
| Hover | `:hover` | Mouse sobre |
| Focus-visible | `:focus-visible` | Teclado (acessível) |
| Active | `:active` | Clique/press |
| Disabled | `:disabled` | Desabilitado |
| Loading | `[data-loading]` | Operação assíncrona |

**Consequências**:
- ✅ Acessibilidade nativa (WCAG)
- ✅ Consistência visual
- ✅ Reduz bugs de estado

---

### ADR-008: WCAG 2.2 AA Compliance
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Inclusão digital; requisitos legais/éticos.

**Decisão**: Todos componentes seguem checklist:
- ✅ HTML semântico (`<button>`, `<nav>`, `<main>`, headings)
- ✅ ARIA labels onde semântica insuficiente
- ✅ Contraste 4.5:1 (textos), 3:1 (UI)
- ✅ Targets 44×44px mínimo
- ✅ Focus visible customizado
- ✅ `prefers-reduced-motion` respeitado
- ✅ `prefers-contrast: high` suportado
- ✅ Skip links
- ✅ Landmarks

---

### ADR-009: Skeleton Loading + content-visibility
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Perceived performance; evitar layout shift.

**Decisão**: Skeletons com delay 150-200ms; `content-visibility: auto` para listas longas.

```css
.skeleton {
  animation: shimmer 1.5s infinite;
  background: linear-gradient(90deg, var(--cor-superficie) 25%, var(--cor-borda) 50%, var(--cor-superficie) 75%);
}
.lista-virtualizada > * {
  content-visibility: auto;
  contain-intrinsic-size: 0 200px;
}
```

---

### ADR-010: CSS Custom Properties Theming
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Temas (claro/escuro), alta contraste, fonte dinâmica sem recompilar.

**Decisão**: Tokens em `:root`; override por `[data-theme]`, media queries.

```css
:root {
  --cor-primaria: #2563eb;
  --cor-fundo: #ffffff;
  --cor-texto: #111827;
  --espaco-4: 1rem;
  --raio-lg: 0.75rem;
}
[data-theme="escuro"] {
  --cor-fundo: #111827;
  --cor-texto: #f9fafb;
}
@media (prefers-contrast: high) {
  :root { --cor-borda: currentColor; }
}
```

---

### ADR-011: SessionStorage para Onboarding Draft
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Persistir progresso do onboarding sem backend; expirar automaticamente.

**Decisão**: `sessionStorage` com timestamp; expiração 24h; limpar ao concluir.

```typescript
const SALVAR_RASCUNHO = (dados: OnboardingRascunho) => {
  sessionStorage.setItem('onboarding_rascunho', JSON.stringify({
    ...dados,
    timestamp: Date.now(),
    versao: 1,
  }));
};
const CARREGAR_RASCUNHO = (): OnboardingRascunho | null => {
  const raw = sessionStorage.getItem('onboarding_rascunho');
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) return null; // 24h
  return parsed;
};
```

---

### ADR-012: IntersectionObserver para Infinite Scroll
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Paginação performática em feeds/listas longas.

**Decisão**: Hook `useInfiniteScroll` com `IntersectionObserver` + sentinel element.

```typescript
export function useInfiniteScroll(carregarMais: () => Promise<void>, temMais: boolean) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!temMais) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) carregarMais();
    }, { rootMargin: '200px' });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [carregarMais, temMais]);
  return sentinelRef;
}
// Uso: <div ref={sentinelRef} /> no final da lista
```

---

### ADR-013: Smart Forms (WHATWG + Masks)
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: UX de formulários; redução de erros; acessibilidade.

**Decisão**:
- `inputmode` + `autocomplete` corretos (WHATWG)
- Máscaras algorítmicas (CPF/CNPJ com validação dígito verificador)
- CEP lookup assíncrono (ViaCEP) com debounce
- BRL currency: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- **Não** bloquear `onPaste`
- Password strength: checklist visual (não barra)

---

### ADR-014: Semantic Tables + ARIA Sort
**Status**: Accepted
**Data**: 2024-01-15

**Contexto**: Dashboards acessíveis; ordenação por teclado.

**Decisão**:
- `<table>` com `<thead>`, `<tbody>`, `<th scope="col">`
- `aria-sort="ascending|descending|none"` em headers clicáveis
- Sticky header via `position: sticky; top: 0`
- Filtros sincronizados com URL (`useSearchParams`)
- Export CSV: `Blob` + `URL.createObjectURL`
- Gráficos: colorblind-safe palettes + `ResizeObserver` + texto alternativo

---

### ADR-015: Performance Budget
**Status**: Accepted
**Data**: 2024-01-15

**Decisão**:
- **Font**: `Inter` com `font-display: swap` + `preload`
- **Code-splitting**: `React.lazy` + `Suspense` por rota/feature
- **Images**: `width`/`height` explícitos + `fetchpriority="high"` (LCP) + `loading="lazy"` (below fold)
- **CSS**: `content-visibility: auto` + `contain-intrinsic-size`
- **Listeners**: `passive: true` (scroll/touch)
- **Visibility**: `document.visibilityState` pausa animações/polling

---

### ADR-016: PWA (Progressive Web App)
**Status**: Accepted
**Data**: 2024-01-15

**Decisão**:
- `manifest.json`: name, icons (192/512), `display: standalone`, `start_url`, shortcuts
- `sw.js` (Workbox):
  - **Precache**: shell + assets estáticos
  - **Cache-First**: fonts, images, CSS/JS hashed
  - **Stale-While-Revalidate**: API GET (dados não-críticos)
  - **Network-First**: mutations, auth, dados sensíveis
- `usePWA.ts` hook:
  - Install prompt (antes `beforeinstallprompt`)
  - Update banner (novo SW waiting)
  - Offline queue (IndexedDB + `BackgroundSync`)
  - Multi-tab sync (`BroadcastChannel`)

---

### ADR-017: Security Hardening
**Status**: Accepted
**Data**: 2024-01-15

**Decisão**:
- **ErrorBoundary**: captura `ChunkLoadError` → retry + fallback UI
- **Error Pages**: 403, 404, 500 amigáveis + `reload` button
- **Multi-tenant Cache**: limpeza `Cache-Control: private` + `Vary: Authorization` + key por tenant
- **Zod Validation**: schemas em `types/`; validar **input** (forms) + **output** (API responses)
- **XSS Sanitization**: `DOMPurify` em conteúdo user-generated (feed, avaliações)
- **Rate Limit UI**: `429` → toast com `Retry-After` + backoff exponencial

---

## Padrões de Código

### Commits Semânticos (PT-BR)
```
feat: adiciona autenticação 2FA
fix: corrige validação CPF em onboarding
refactor: extrai hook useInfiniteScroll
docs: atualiza ADR-003
test: adiciona boundary tests para agendamento
chore: atualiza dependências
style: ajusta espaçamento cards
perf: otimiza render lista virtualizada
```

### Convenções TypeScript
- `type` para unions/primitivos; `interface` para objetos extensíveis
- `readonly` arrays/objetos imutáveis
- `const` assertions para literais (`as const`)
- Branded types para IDs: `type AgendamentoId = string & { __brand: 'AgendamentoId' }`
- Discriminated unions para estados: `type State = { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error }`

### Regras de Componentes
- **Máx 150 linhas** (separar em sub-componentes)
- **Single Responsibility**: um componente = uma responsabilidade
- **Props interface** com JSDoc
- **data-testid** em elementos testáveis
- **CSS Modules** (scoped) + design tokens
- **ForwardRef** para componentes base

### Regras de Hooks
- `useCallback`/`useMemo` para referências estáveis
- `AbortController` em todo efeito assíncrono
- Retornar objeto tipado (não tupla)
- Nomes: `use{Domain}` ou `use{Action}`

### Regras de Serviços
- Interface primeiro (`I{Name}Service`)
- `Result<T,E>` em todos métodos públicos
- `AbortSignal` opcional em todos métodos
- Erros mapeados para códigos estáveis (`NOT_FOUND`, `VALIDATION_ERROR`, `UNAUTHORIZED`, `CONFLICT`, `RATE_LIMITED`)

---

## Guias de Desenvolvimento

### Nova Feature (Checklist)
1. [ ] Criar pasta `src/features/{feature}/`
2. [ ] Definir `types/index.ts` (tipos + Zod schemas)
3. [ ] Implementar `rules/index.ts` (funções puras, <30 linhas)
4. [ ] Criar `services/index.ts` (Interface + Impl + DI + Mock)
5. [ ] Escrever `hooks/use{Feature}.ts` (estado + AbortController + optimistic)
6. [ ] Buildar `components/` (atoms → molecules → organisms)
7. [ ] Testes `__tests__/*.test.ts` (boundary values, 100% cobertura rules)
8. [ ] Exportar em `index.ts` + `components/index.ts`
9. [ ] Integrar no `App.tsx`/rotas
10. [ ] Atualizar `DOCUMENTACAO.md` se novo padrão

### Debugging Comum
| Problema | Causa Provável | Solução |
|----------|----------------|---------|
| Warning `act(...)` | Estado assíncrono sem `await` | `await act(async () => ...)` ou `waitFor` |
| Memory leak | `AbortController` não abortado | Verificar cleanup no `useEffect` |
| Dados errados | Race condition | Adicionar `AbortSignal` + check `signal.aborted` |
| Layout shift | Imagem sem dimensões | `width`/`height` + `aspect-ratio` |
| Focus perdido | Modal fecha sem restaurar | Guardar `activeElement` antes de abrir |

---

## Testes

### Estratégia
```
┌─────────────────────────────────────┐
│         E2E (Playwright)            │  ~10% - Fluxos críticos
├─────────────────────────────────────┤
│      Integration (Vitest + RTL)     │  ~20% - Hooks + componentes
├─────────────────────────────────────┤
│        Unit (Vitest)                │  ~70% - Rules + utils + services
└─────────────────────────────────────┘
```

### Cobertura Obrigatória (vitest.config.ts)
```typescript
thresholds: {
  statements: 100,
  branches: 100,
  functions: 100,
  lines: 100,
}
```

### Padrões de Teste
- **Boundary values**: limites, vazios, nulos, tipos errados
- **Arrange-Act-Assert** (AAA)
- **Describe/It** aninhados por função
- **Mocks** via `vi.fn()` + `vi.mock()`
- **TestIDs** estáveis (`data-testid`)

```typescript
// Exemplo boundary test
describe('validarCPF', () => {
  it('aceita CPF válido com pontuação', () => {
    expect(validarCPF('123.456.789-09')).toBe(true);
  });
  it('aceita CPF válido sem pontuação', () => {
    expect(validarCPF('12345678909')).toBe(true);
  });
  it('rejeita CPF dígito verificador errado', () => {
    expect(validarCPF('123.456.789-00')).toBe(false);
  });
  it('rejeita CPF todos dígitos iguais', () => {
    expect(validarCPF('111.111.111-11')).toBe(false);
  });
  it('rejeita string vazia', () => {
    expect(validarCPF('')).toBe(false);
  });
});
```

---

## CI/CD

### Pipeline (`.github/workflows/ci.yml`)
```
Lint & TypeCheck
       ↓
Unit Tests (coverage 100%)
       ↓
    ┌───┴───┐
    ↓       ↓
Build   E2E Tests
    ↓       ↓
Security Scan
    ↓
┌───┴────┐
↓        ↓
Preview  Production
(develop) (main)
```

### Gates Obrigatórios
- ✅ ESLint zero errors
- ✅ TypeScript zero errors
- ✅ Unit tests 100% coverage
- ✅ E2E tests pass
- ✅ Build success
- ✅ Security audit (high+)

---

## Deploy

### Ambientes
| Branch | Ambiente | URL |
|--------|----------|-----|
| `develop` | Preview | `https://corte-rapido-preview.vercel.app` |
| `main` | Production | `https://corte-rapido.app` |

### Variáveis de Ambiente (Vercel)
```
VITE_API_BASE_URL=https://api.corte-rapido.app
VITE_SENTRY_DSN=...
VITE_GA_MEASUREMENT_ID=...
```

### Rollback
```bash
# Via Vercel CLI
vercel rollback <deployment-url>

# Ou GitHub Actions: re-run deploy job anterior
```

---

## Segurança

### Headers (vercel.json)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(self)" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.corte-rapido.app wss://api.corte-rapido.app;" }
      ]
    }
  ]
}
```

### Princípios
- **Zero Trust**: validar tudo (client + server)
- **Least Privilege**: tokens com escopo mínimo
- **Defense in Depth**: validação client + server + WAF
- **Audit Trail**: logs imutáveis de ações sensíveis

---

## Performance

### Métricas Alvo (Core Web Vitals)
| Métrica | Bom | Alvo |
|---------|-----|------|
| LCP | ≤ 2.5s | **≤ 1.8s** |
| FID | ≤ 100ms | **≤ 50ms** |
| CLS | ≤ 0.1 | **≤ 0.05** |
| TTFB | ≤ 800ms | **≤ 400ms** |

### Bundle Budget
```
Initial JS:     ≤ 170 KB gzipped
Initial CSS:    ≤ 30 KB gzipped
Total (initial): ≤ 200 KB gzipped
```

### Otimizações Aplicadas
- Code-splitting por rota (`React.lazy`)
- Tree-shaking (ESM only)
- Minificação (esbuild)
- Compressão (Brotli/Gzip via Vercel)
- Cache imutável (hash nos assets)
- Preload LCP image
- Font `display: swap` + subset

---

## Acessibilidade

### Checklist por Componente
- [ ] Semântica HTML correta
- [ ] `aria-label` / `aria-labelledby` onde necessário
- [ ] `aria-describedby` para erros/ajudas
- [ ] `role` apenas quando semântica insuficiente
- [ ] Focus order lógico (tabindex natural)
- [ ] Focus visible customizado (não `outline: none`)
- [ ] Contraste 4.5:1 (textos), 3:1 (bordas/ícones)
- [ ] Touch target ≥ 44×44px
- [ ] `prefers-reduced-motion`: animações desabilitadas
- [ ] `prefers-contrast: high`: bordas espessadas
- [ ] Screen reader testado (NVDA/VoiceOver)
- [ ] Teclado only: todas ações acessíveis

### Testes Automatizados
```bash
# axe-core no CI
pnpm test:a11y
```

---

## PWA

### Manifest (`public/manifest.json`)
```json
{
  "name": "Corte Rápido",
  "short_name": "Corte Rápido",
  "description": "Agende seu corte em segundos",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#111827",
  "theme_color": "#2563eb",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "shortcuts": [
    { "name": "Novo Agendamento", "url": "/agendar", "icons": [{ "src": "/icons/calendar.png", "sizes": "192x192" }] },
    { "name": "Meus Agendamentos", "url": "/agendamentos", "icons": [{ "src": "/icons/list.png", "sizes": "192x192" }] }
  ]
}
```

### Service Worker Strategy
| Rota | Strategy | Cache TTL |
|------|----------|-----------|
| `/` (shell) | Precaching | Imutável |
| `/assets/*` (hashed) | Cache-First | 1 ano |
| `/api/estabelecimentos` | Stale-While-Revalidate | 5 min |
| `/api/agendamentos` (GET) | Stale-While-Revalidate | 2 min |
| `/api/*` (POST/PUT/DELETE) | Network-First | — |
| `/auth/*` | Network-First | — |

### Offline Queue
- Mutations offline → IndexedDB (`idb`)
- `BackgroundSync` API para replay automático
- `BroadcastChannel` sincroniza abas
- Toast informativo: "Você está offline. Alterações serão sincronizadas."

---

## Guia de Migração SQL (Supabase)

### Visão Geral
O banco de dados está definido em `supabase/migrations/001_schema_definitivo.sql` (3000+ linhas) com:
- 22 tabelas com UUID, TIMESTAMPTZ, valores monetários em centavos (INTEGER)
- 11 ENUMs tipados
- Extensão `btree_gist` para constraints `EXCLUDE` (anti-overbooking)
- RLS (Row Level Security) em 100% das tabelas
- 15+ RPC functions para operações atômicas
- 2 Views materializadas para consultas complexas
- Triggers de auditoria automática
- Seed data em `supabase/seed.sql`

### Como Aplicar no Supabase Dashboard

#### Opção 1: SQL Editor (Recomendado para primeira vez)

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard) → Project → SQL Editor
2. Clique em **"New Query"**
3. Copie **todo o conteúdo** de `supabase/migrations/001_schema_definitivo.sql`
4. Cole no editor e clique em **"Run"** (Ctrl+Enter)
5. Aguarde conclusão (pode levar 30-60s)
6. Repita para `supabase/seed.sql` (dados demo)

#### Opção 2: CLI (Desenvolvimento contínuo)

```bash
# Instala Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref SEU_PROJECT_REF

# Push migrações
supabase db push

# Ou aplicar seed
supabase db seed
```

### Checklist Pós-Migração

- [ ] Verificar se extensão `btree_gist` foi criada: `SELECT * FROM pg_extension WHERE extname = 'btree_gist';`
- [ ] Verificar RLS ativo: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
- [ ] Testar RPCs principais:
  ```sql
  -- Slots disponíveis
  SELECT * FROM rpc_slots_disponiveis('profissional-uuid', '2024-01-15', 30);
  
  -- Criar agendamento (retorna id ou erro)
  SELECT * FROM rpc_criar_agendamento(...);
  
  -- Anonimizar usuário (LGPD)
  SELECT rpc_anonimizar_usuario('usuario-uuid');
  ```
- [ ] Verificar seeds: `SELECT * FROM planos_assinatura;`
- [ ] Configurar Edge Functions no Dashboard (4 functions):
  - `criar-agendamento`
  - `gerar-cobranca-pix`
  - `webhook-pagamento`
  - `lgpd-excluir-conta`

### Variáveis de Ambiente Necessárias (Edge Functions)

```env
# Supabase
SUPABASE_URL=https://SEU_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Pix Provider (escolha um)
PIX_PROVIDER=mercado_pago  # ou "inter", "bb", "mock"
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
# INTER_CLIENT_ID=...
# INTER_CLIENT_SECRET=...

# Frontend (Vite)
VITE_SUPABASE_URL=https://SEU_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Estrutura das Tabelas Principais

| Tabela | Propósito | RLS Policy |
|--------|-----------|------------|
| `usuarios` | Perfis (cliente/barbeiro/admin) | Próprio usuário + admin |
| `estabelecimentos` | Barbearias/salões | Público (aprovados) + dono + admin |
| `profissionais` | Barbeiros do estabelecimento | Dono + admin |
| `servicos` | Serviços oferecidos | Público (ativos) + dono + admin |
| `agendamentos` | Horários marcados | Dono + cliente + admin |
| `pagamentos` | Transações Pix/assinatura | Dono + admin |
| `publicacoes` | Feed social | Público (aprovados) + autor + admin |
| `assinaturas` | Planos dos estabelecimentos | Dono + admin |
| `notificacoes` | Alertas usuários | Próprio destinatário |

### RPCs Disponíveis

| Função | Parâmetros | Retorno | Uso |
|--------|------------|---------|-----|
| `rpc_slots_disponiveis` | profissional_id, dia, duracao_min | `horario, disponivel, profissional_nome` | Buscar vagas |
| `rpc_criar_agendamento` | estabelecimento_id, profissional_id, usuario_id, dia, horario, duracao_min, nome_cliente, telefone, servico_ids[], valor_total, status_pagamento, observacoes | `agendamento_id, erro` | Criar agendamento atômico |
| `rpc_anonimizar_usuario` | usuario_id | `void` | LGPD Art. 18 |

### Triggers de Auditoria

Toda operação `INSERT/UPDATE/DELETE` em tabelas sensíveis gera log em `audit_logs`:
- `usuarios`, `estabelecimentos`, `agendamentos`, `pagamentos`, `assinaturas`

### Rollback

```sql
-- Se necessário, dropar tudo (CUIDADO: apaga dados!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
-- Re-aplicar migração
```

### Troubleshooting

| Erro | Causa | Solução |
|------|-------|---------|
| `23P01 exclusion_violation` | Conflito de horário (anti-overbooking) | Frontend trata como 409 "Horário ocupado" |
| `42501 permission denied` | RLS bloqueando | Verificar policy ou usar `service_role` |
| `P0001 trigger error` | Trigger RPC falhou | Verificar logs em `audit_logs` |
| `23505 unique_violation` | Idempotency key duplicada | Frontend reusa resposta existente |

---

## Referências

- [React 18 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Vitest Guide](https://vitest.dev)
- [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)
- [Web Vitals](https://web.dev/vitals/)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

*Documentação mantida pelo time de engenharia. Última atualização: 2024-01-15*