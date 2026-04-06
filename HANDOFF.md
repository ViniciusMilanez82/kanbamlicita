# KanbanLicita — Handoff Document

Documento para continuidade do desenvolvimento em outra sessão ou IDE.

---

## Stack

- **Framework:** Next.js 16.2.1 (App Router, Turbopack em dev)
- **Linguagem:** TypeScript 5
- **Banco de dados:** PostgreSQL 17 (Docker no servidor)
- **ORM:** Prisma 7.5.0 com `@prisma/adapter-pg` (driver adapter — obrigatório)
- **Auth:** NextAuth v5 beta (`next-auth@5.0.0-beta.30`) — Credentials provider, JWT strategy
- **UI:** Tailwind CSS 4, Lucide React, Sonner (toasts), @dnd-kit (drag-and-drop)
- **State:** TanStack React Query v5
- **IA:** Anthropic SDK + OpenAI SDK
- **Testes:** Jest 30 + @testing-library/react

---

## Repositório

```
GitHub: https://github.com/ViniciusMilanez82/kanbamlicita
Branch principal: main
```

---

## Banco de Dados

**Servidor:** `srv1353769.hstgr.cloud` (VPS Hostinger Ubuntu 24.04)
**PostgreSQL:** rodando em Docker, porta mapeada dinamicamente

> ⚠️ A porta do PostgreSQL pode mudar quando o container reinicia.
> Sempre verificar com: `docker ps` no servidor (porta atual: `32769`)

**Credenciais do container:**
```
POSTGRES_USER=A39bokKZClHrBqXC
POSTGRES_PASSWORD=ex4x8VZVSogaZL0Bpvj7oGNJkFoWbT0K
POSTGRES_DB=MHL6sIvZvAqZsACp   (container default — não usar)
```

**Banco da aplicação:** `kanbamlicita` (criado manualmente)

**DATABASE_URL (`.env.local`):**
```
postgresql://A39bokKZClHrBqXC:ex4x8VZVSogaZL0Bpvj7oGNJkFoWbT0K@srv1353769.hstgr.cloud:32769/kanbamlicita?sslmode=disable
```

> Se a aplicação der `SocketTimeout`, verificar se a porta mudou no servidor.

---

## Variáveis de Ambiente

**`.env.local`** (não commitado):
```env
DATABASE_URL="postgresql://A39bokKZClHrBqXC:ex4x8VZVSogaZL0Bpvj7oGNJkFoWbT0K@srv1353769.hstgr.cloud:32769/kanbamlicita?sslmode=disable"
```

**`.env`** (não commitado):
```env
DATABASE_URL="..."   # mesma URL acima
AUTH_SECRET=JBW1ex0b4vFa3kTcaTMHDYuXoaPUdGqQXp52KG+JYtw=
```

Também há variáveis para as APIs de IA (Anthropic/OpenAI) no `.env`.

---

## Usuário Admin

Criado manualmente no banco:

```
Email:  admin@multiteiner.com.br
Senha:  admin123
Role:   admin
```

> ⚠️ **Problema conhecido:** a página `/login` está com um bug de redirect loop.
> O NextAuth v5 + PrismaAdapter está redirecionando `/login` → `/kanban` mesmo
> sem sessão válida. A causa está sendo investigada (`export const dynamic = 'force-dynamic'`
> foi adicionado mas não resolveu).
>
> **Workaround temporário:** desabilitar o redirect da página de login:
> Em `app/login/page.tsx`, comentar `if (session) redirect('/kanban')` e acessar
> o formulário diretamente.

---

## Como rodar localmente

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # Jest (requer DB disponível para testes de API)
```

---

## Estrutura principal

```
app/
  kanban/page.tsx          — Kanban (sem auth guard — qualquer um acessa)
  licitacoes/[id]/page.tsx — Detalhe da licitação
  configuracoes/page.tsx   — Config (abas: Perfil, Usuários, Sistema)
  fontes/page.tsx          — Redireciona para /configuracoes?tab=sistema
  login/page.tsx           — Login (ver bug acima)
  api/
    kanban/cards/[id]/     — PATCH: atualizar responsável do card
    kanban/mover/          — POST: mover card entre colunas
    kanban/metricas/       — GET: métricas do pipeline
    licitacoes/            — GET: lista paginada
    licitacoes/[id]/       — GET: detalhe
    licitacoes/[id]/analise-ia/ — POST: análise IA
    usuarios-ativos/       — GET: lista usuários ativos
    admin/fontes/          — GET/POST: gerenciar fontes de captação
    admin/fontes/[id]/     — PATCH: atualizar fonte
    configuracoes/sistema/ — GET/PATCH: configurações do sistema

components/
  kanban/                  — KanbanBoard, LicitacaoCard, FilterBar, etc.
  licitacao/               — DetailTabs, tabs (SinaisTab, ItensTab, etc.)
  configuracoes/           — PerfilTab, UsuariosTab, SistemaTab
  layout/                  — AppShell, SidebarNav, TopBar

lib/
  db.ts                    — PrismaClient singleton (usa @prisma/adapter-pg)
  auth/                    — authorize.ts (validação de credenciais)
  score/calculator.ts      — Lógica de score/faixas

types/
  licitacao.ts             — CardInfo, LicitacaoComCard
  licitacao-detalhe.ts     — LicitacaoDetalhe, ItemDetalhe, SinalDetalhe, etc.
```

---

## Prisma

**Cliente gerado em:** `lib/generated/prisma/client`

Após qualquer mudança no schema:
```bash
npx prisma generate       # regenerar cliente
npx prisma migrate dev    # criar e aplicar migração
```

> ⚠️ Usar sempre `@prisma/adapter-pg` — é obrigatório para o Prisma 7 funcionar
> com a query compiler WASM. Sem o adapter, a aplicação não conecta ao banco.

---

## Testes

```bash
NODE_OPTIONS=--experimental-vm-modules npx jest
# ou simplesmente:
npm test
```

**Configuração especial (`jest.config.ts`):**
- `extensionsToTreatAsEsm: ['.ts', '.tsx']` — necessário para o Prisma 7 WASM carregar
- `--experimental-vm-modules` — obrigatório por causa do `.mjs` do Prisma

**14 suites, 51 testes — todos passando** (desde que o banco esteja disponível).

---

## SPs implementados

| SP | Descrição | Status |
|----|-----------|--------|
| SP-1 | Kanban base (colunas, drag-and-drop, mover) | ✅ |
| SP-2 | Redesign corporativo (layout, sidebar, topbar) | ✅ |
| C2-A | Auth (login, sessão JWT, proteção de rotas) | ✅ |
| SP-3 | Detalhe da licitação (abas: Geral, Docs, Itens, IA) | ✅ |
| SP-4 | Módulo IA (análise, score, pareceres) | ✅ |
| SP-5 | Score e parecer completo | ✅ |
| SP-6 | Parecer campos JSON (listas configuráveis) | ✅ |
| Configurações | Perfil, Usuários, Sistema (pesos, faixas, segmentos, fontes) | ✅ |
| SP-7 | Aba Sinais (tabela de sinais por categoria) | ✅ |
| SP-8 | Itens: tipoAderência + motivo; Responsável no kanban | ✅ |
| SP-9 | Histórico de captação inline na aba Sistema | ✅ |

---

## Problema em aberto: Login / Auth

**Sintoma:** `/login`, `/configuracoes` e `/fontes` redirecionam para `/kanban`.

**Diagnóstico:**
- O server component da página de login nunca executa (sem log no terminal)
- Mesmo em aba anônima, mesmo após `Remove-Item -Force .next`
- O NextAuth v5 beta + PrismaAdapter parece retornar `session` truthy mesmo sem cookie

**O que já foi tentado:**
- Limpar cookies do browser
- Aba anônima
- Apagar `.next` e reiniciar servidor
- `export const dynamic = 'force-dynamic'` na página de login

**Possíveis causas a investigar:**
1. Bug no NextAuth v5 beta 30 com `PrismaAdapter` + JWT strategy — o adapter pode estar interferindo com o `auth()` server-side
2. Remover `PrismaAdapter` do `auth.ts` (com JWT strategy, o adapter não é necessário para Credentials provider)
3. Testar sem o adapter: em `auth.ts`, remover `adapter: PrismaAdapter(db)` e ver se o login passa a funcionar

**Próximo passo recomendado:**
```ts
// auth.ts — tentar remover o adapter:
export const { auth, handlers, signIn, signOut } = NextAuth({
  // adapter: PrismaAdapter(db),  ← comentar esta linha
  session: { strategy: 'jwt' },
  ...
})
```

---

## Docs do projeto

- **Specs (designs):** `docs/superpowers/specs/`
- **Planos de implementação:** `docs/superpowers/plans/`

Todos os SPs têm spec + plano documentados.
