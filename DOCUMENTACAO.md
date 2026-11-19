# Documentação do Corte Rápido

---

## 1. Roteiro de Melhorias de Design (Linguagem Simples)

### O que melhorar no visual e na experiência do usuário

#### **Cores e Identidade Visual**
- **Paleta consistente**: Definir 1 cor principal (ex: azul escuro #1a3c5e), 1 secundária (laranja/âmbar para CTAs), neutros (cinzas) e semânticas (sucesso/erro/alerta). Hoje as cores são soltas.
- **Modo escuro**: Adicionar suporte a prefers-color-scheme: dark — usuários noturnos agradecem.
- **Contraste WCAG AA**: Texto pequeno ≥ 4.5:1, texto grande ≥ 3:1. Verificar todos os textos sobre fundos coloridos.

#### **Tipografia**
- **Escala tipográfica**: 4-5 tamanhos (display, h1-h3, body, small, caption) com clamp() para fluidez.
- **Fonte única**: Padronizar em **Inter** ou **IBM Plex Sans** (ambas gratuitas, legíveis, variáveis).
- **Line-height**: 1.5 no body, 1.2 nos títulos.

#### **Espaçamento e Layout**
- **Sistema de espaçamento**: 4px como unidade base (4, 8, 12, 16, 24, 32, 48, 64). Acaba com "olhômetro".
- **Grid responsivo**: 4 colunas mobile → 8 tablet → 12 desktop. Container max-width 1200px.
- **Mobile-first de verdade**: Começa no 320px, sobe. Breakpoints: 480 / 768 / 1024 / 1280 / 1440.

#### **Componentes Visuais**
- **Botões**: 3 variantes (primário, secundário, fantasma) + 3 tamanhos. Estados claros: hover, focus-visible, active, disabled, loading.
- **Cards**: Elevação sutil (sombra), borda 1px neutra, raio 12px. Hover com elevação + sombra maior.
- **Inputs**: Label sempre visível, erro inline, helper text, ícone de olho em senha, contador em textarea.
- **Avatar**: Iniciais do nome (filtrando "da", "de", "do", "das", "dos"), fallback para ícone genérico, badge de status online/offline.

#### **Micro-interações**
- **Transições**: 150-200ms ease-out para hover/tap, 300ms para modais/drawers.
- **Feedback visual**: Ripple no botão, skeleton loading nos cards, toast animado.
- **Focus visible**: Outline 2px offset 2px na cor principal — **nunca** outline: none sem substituição.

#### **Acessibilidade (WCAG AA)**
- **Navegação por teclado**: Tab order lógico, focus trap em modais, skip link "Pular para conteúdo principal".
- **ARIA**: ria-label onde não há texto visível, ria-live="polite" para toasts, ole="dialog" + ria-modal="true" em modais.
- **Texto alternativo**: Todas as imagens decorativas com lt="", informativas com descrição.
- **Redução de movimento**: Respeitar prefers-reduced-motion: reduce.

#### **Páginas Específicas**
| Página | Melhorias Prioritárias |
|--------|------------------------|
| **Home** | Hero com CTA claro, busca com autocomplete, cards de estabelecimento com foto + nota + distância |
| **Lista/Mapa** | Toggle lista/mapa, filtros colapsáveis no mobile, cluster de marcadores no mapa |
| **Detalhe** | Galeria de fotos (swipe), horários em tabela acessível, botão "Agendar" fixo no mobile (bottom bar) |
| **Agendamento** | Stepper visual, validação inline, resumo antes de confirmar, calendar picker acessível |
| **Perfil** | Avatar editável, histórico de agendamentos com status chips, configurações de notificação |

---

## 2. Roteiro de Melhorias Técnicas (Arquitetura, Código, Qualidade)

### O que melhorar "por baixo do capô"

#### **Arquitetura e Estrutura**
- **Clean Architecture** (já implementado):
`
src/
├── componentes/        # UI pura (botão, input, card...) — sem lógica de negócio
├── paginas/            # Composição de componentes + hooks
├── hooks/              # Lógica reutilizável (useAuth, useAgendamentos...)
├── servicos/           # Camada de API (mock + futura real)
├── contexto/           # Estado global (Auth, Theme, Notificacoes)
├── utilitarios/        # Funções puras (formatar, validar, datas)
├── constantes/         # Tokens de design (cores, espaçamento, breakpoints)
├── rotas/              # Configuração de rotas + guards
└── testes/             # Setup, mocks, utils de teste
`
- **Limite de 150 linhas/arquivo** — força componentes pequenos e focados.
- **Português sem acentos** nos identificadores (useAgendamentos, CampoTexto, ormatarMoeda).

#### **Camada de API (Mock → Real)**
- **Contrato primeiro**: Definir tipos TypeScript (Estabelecimento, Agendamento, Servico, Usuario) em src/tipos/.
- **Mock atual**: src/servicos/api.ts com:
  - Latência simulada 300-800ms (setTimeout + Promise)
  - Taxa de erro 5% (para testar loading/error states)
  - Persistência em localStorage (sobrevive a refresh)
- **Troca transparente**: Quando backend chegar, só troca a implementação de pi.ts — hooks e componentes não mudam.

#### **Estado e Dados**
- **React Context + useReducer** para auth (usuario, token, permissoes).
- **React Query / TanStack Query** quando houver backend real (cache, invalidação, optimistic updates).
- **localStorage** apenas para: token, preferências (tema, idioma), carrinho/rascunho de agendamento.

#### **Roteamento e Guards**
- **React Router v6** com:
  - Rotas públicas: /, /busca, /estabelecimento/:id
  - Rotas protegidas: /agendar/*, /meus-agendamentos, /perfil
  - Guard RequireAuth redireciona para /login?redirect=...
  - Lazy loading (React.lazy + Suspense) por rota.

#### **Testes (Já: 467 testes, 100% cobertura)**
- **Vitest + Testing Library + jsdom**
- **Organização**: __tests__/ ou *.test.tsx ao lado do código
- **Padrão AAA**: Arrange → Act → Assert
- **Mocks**: i.mock('@/servicos/api'), i.mock('@/contexto/AuthContexto')
- **Cobertura alvo**: 100% statements/branches/functions/lines — CI falha se cair.

#### **Qualidade de Código (Automatizado)**
| Ferramenta | Config | O que pega |
|------------|--------|------------|
| **ESLint** | 	ypescript-eslint + eact-hooks + jsx-a11y | unused vars, explicit any, hook rules, a11y |
| **TypeScript** | strict: true, 
oUnusedLocals/Parameters | tipos soltos, dead code |
| **Prettier** | Single quote, tab width 2, printWidth 100 | formatação consistente |
| **Husky** | pre-commit (lint-staged) + pre-push (typecheck) | impede commit sujo |

#### **Build e Deploy**
- **Vite** + 	sc -b (typecheck separado do build)
- **GitHub Pages** via workflow: GITHUB_PAGES=true npm run build → dist/ → deploy
- **CI** (.github/workflows/ci.yml): lint → typecheck → test → build (paralelo)
- **Deploy** (.github/workflows/deploy.yml): roda no push main, publica em gh-pages

#### **Performance**
- **Code splitting**: Por rota + componentes pesados (Mapa, Calendário, Galeria)
- **Imagens**: WebP/AVIF, loading="lazy", srcset responsivo, placeholder blur
- **Fonts**: ont-display: swap, pré-carregar variáveis, subset se possível
- **Bundle**: Analisar com ite-bundle-analyzer — alvo < 150kb gzipped inicial

#### **Observabilidade (Futuro)**
- **Error Boundary** por rota + global (Sentry/LogRocket)
- **Web Vitals** (LCP, CLS, FID, INP) — meta: todos "good"
- **Analytics** (Plausible/GA4) — eventos: usca_realizada, gendamento_iniciado, gendamento_concluido

---

## 3. Checklist Rápido (Próximos Passos)

### Design (para seu colega revisar)
- [ ] Aprovar paleta de cores + modo escuro
- [ ] Validar escala tipográfica e espaçamento
- [ ] Revisar componentes: Botao, Card, CampoTexto, Avatar, Chip, Modal, Toast
- [ ] Aprovar wireframes mobile/desktop das 5 páginas principais
- [ ] Definir ícones (Lucide? Phosphor? Heroicons?) — padronizar um set

### Técnico (já pronto / em andamento)
- [x] Estrutura de pastas + Clean Architecture
- [x] 18 componentes UI com testes (467 testes passando)
- [x] Hooks useAuth, useAgendamentos com testes
- [x] Mock API com latência/erro/localStorage
- [x] TypeScript strict + path aliases @/*
- [x] CI/CD GitHub Actions (lint, typecheck, test, build, deploy)
- [x] Build funcionando + deploy no GitHub Pages configurado
- [ ] **Lint**: 145 warnings (unused vars, explicit any) — limpar se quiser
- [ ] **Rotas** + guards + lazy loading
- [ ] **Páginas** reais consumindo hooks + componentes
- [ ] **Contexto Auth** + login/cadastro/recuperar senha
- [ ] **Integração mapa** (Leaflet/MapLibre) na busca
- [ ] **PWA** (manifest + service worker) para "instalar app"

---

## 4. Como Rodar Localmente

`ash
# Instalar dependências
npm ci

# Desenvolvimento (porta 3000)
npm run dev

# Testes (watch)
npm test

# Testes (CI mode + coverage)
npm test -- --run --coverage

# Typecheck
npm run typecheck

# Lint
npm run lint

# Build produção
npm run build

# Preview build local
npm run preview
`

---

## 5. Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| VITE_API_URL | Não | URL do backend (quando houver) |
| VITE_GOOGLE_MAPS_KEY | Não | Chave do Maps (para mapa real) |
| VITE_SENTRY_DSN | Não | DSN do Sentry (erros) |
| GITHUB_PAGES | Build only | 	rue para build com base path do Pages |

---

> **Nota**: Esta documentação vive junto com o código. Atualize quando mudar arquitetura, adicionar padrões ou decidir algo novo.
