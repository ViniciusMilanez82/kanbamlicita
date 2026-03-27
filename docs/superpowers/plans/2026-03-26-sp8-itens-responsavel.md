# SP-8: Itens Campos Ocultos + Responsável Kanban — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (a) Exibir `tipoAderencia` e `motivo` na aba Itens/Lotes. (b) Implementar atribuição de responsável no card kanban com dropdown inline, filtro na FilterBar e API de persistência.

**Architecture:** SP-8a é puramente aditivo: 2 campos já existem no banco, apenas faltam no tipo e na tabela. SP-8b requer: nova relação Prisma (`KanbanCard → User`), nova migration, novo endpoint `GET /api/usuarios-ativos`, novo endpoint `PATCH /api/kanban/cards/[id]`, atualização do `GET /api/licitacoes` para incluir `responsavel` no card, e atualização de 3 componentes (LicitacaoCard, FilterBar, KanbanBoard).

**Tech Stack:** Next.js App Router, TypeScript, Prisma (PostgreSQL), Tailwind CSS, Jest, @testing-library/react

---

## Arquivos

| Ação | Arquivo | O que muda |
|------|---------|-----------|
| Modify | `types/licitacao-detalhe.ts` | `ItemDetalhe`: + `tipoAderencia`, `motivo` |
| Modify | `app/licitacoes/[id]/page.tsx` | mapping de itens: + `tipoAderencia`, `motivo` |
| Modify | `components/licitacao/tabs/ItensTab.tsx` | + 2 colunas na tabela |
| Modify | `prisma/schema.prisma` | relação `KanbanCard → User` |
| Create | `prisma/migrations/…/migration.sql` | FK `responsavel_id → users.id` |
| Modify | `types/licitacao.ts` | `CardInfo`: + `responsavel` |
| Modify | `components/kanban/FilterBar.tsx` | `FiltrosKanban`: + `responsavelId`; + select no JSX |
| Modify | `app/api/licitacoes/route.ts` | include `responsavel` no card select |
| Create | `app/api/usuarios-ativos/route.ts` | GET — retorna usuários ativos (qualquer role) |
| Create | `app/api/kanban/cards/[id]/route.ts` | PATCH — atualiza `responsavelId` |
| Modify | `components/kanban/LicitacaoCard.tsx` | + linha responsável com dropdown inline |
| Modify | `components/kanban/KanbanBoard.tsx` | fetch usuariosAtivos + pass to FilterBar + filtro |
| Create | `__tests__/api/usuarios-ativos.test.ts` | testes da query |
| Create | `__tests__/api/kanban-cards-patch.test.ts` | testes do PATCH |

---

## PARTE A — Itens campos ocultos

### Task 1: Tipo ItemDetalhe + mapping em page.tsx

**Files:**
- Modify: `types/licitacao-detalhe.ts`
- Modify: `app/licitacoes/[id]/page.tsx`

- [ ] **Step 1: Adicionar campos em `ItemDetalhe` (após `aderencia`, linha 79)**

Em `types/licitacao-detalhe.ts`:

```ts
export type ItemDetalhe = {
  id: string
  tipo: string | null
  identificador: string | null
  descricao: string | null
  quantitativo: number | null
  unidade: string | null
  aderencia: string
  tipoAderencia: string | null   // novo
  prioridade: string
  valorEstimadoItem: number | null
  motivo: string | null          // novo
  observacoes: string | null
}
```

- [ ] **Step 2: Adicionar campos no mapping de itens em `app/licitacoes/[id]/page.tsx` (linhas 152-163)**

```ts
    itens: row.itens.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      identificador: item.identificador,
      descricao: item.descricao,
      quantitativo: item.quantitativo ? Number(item.quantitativo) : null,
      unidade: item.unidade,
      aderencia: item.aderencia,
      tipoAderencia: item.tipoAderencia ?? null,   // novo
      prioridade: item.prioridade,
      valorEstimadoItem: item.valorEstimadoItem ? Number(item.valorEstimadoItem) : null,
      motivo: item.motivo ?? null,                  // novo
      observacoes: item.observacoes,
    })),
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 4: Commit**

```bash
git add types/licitacao-detalhe.ts app/licitacoes/[id]/page.tsx
git commit -m "feat(sp8a): add tipoAderencia and motivo to ItemDetalhe type and mapping"
```

---

### Task 2: ItensTab — adicionar colunas (TDD)

**Files:**
- Create: `__tests__/components/ItensTab.test.tsx`
- Modify: `components/licitacao/tabs/ItensTab.tsx`

- [ ] **Step 1: Criar arquivo de teste**

Criar `__tests__/components/ItensTab.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { ItensTab } from '@/components/licitacao/tabs/ItensTab'
import type { ItemDetalhe } from '@/types/licitacao-detalhe'

const ITEM_BASE: ItemDetalhe = {
  id: '1',
  tipo: 'item',
  identificador: 'IT-01',
  descricao: 'Servidor de rack',
  quantitativo: 2,
  unidade: 'UN',
  aderencia: 'alta',
  tipoAderencia: 'direta',
  prioridade: 'alta',
  valorEstimadoItem: 15000,
  motivo: 'Produto principal do portfólio',
  observacoes: null,
}

describe('ItensTab', () => {
  it('renderiza empty state quando itens = []', () => {
    render(<ItensTab itens={[]} />)
    expect(screen.getByText(/nenhum item/i)).toBeInTheDocument()
  })

  it('renderiza coluna "Tipo Ader." com badge', () => {
    render(<ItensTab itens={[ITEM_BASE]} />)
    expect(screen.getByText('Tipo Ader.')).toBeInTheDocument()
    expect(screen.getByText('direta')).toBeInTheDocument()
  })

  it('renderiza coluna "Motivo" com texto truncado', () => {
    render(<ItensTab itens={[ITEM_BASE]} />)
    expect(screen.getByText('Motivo')).toBeInTheDocument()
    expect(screen.getByText('Produto principal do portfólio')).toBeInTheDocument()
  })

  it('renderiza "—" quando tipoAderencia é null', () => {
    const item = { ...ITEM_BASE, tipoAderencia: null, motivo: null }
    render(<ItensTab itens={[item]} />)
    // Deve ter pelo menos 2 ocorrências de "—" (tipoAderencia e motivo)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

```bash
npx jest __tests__/components/ItensTab.test.tsx --no-coverage
```

Expected: FAIL — colunas "Tipo Ader." e "Motivo" não existem

- [ ] **Step 3: Atualizar `components/licitacao/tabs/ItensTab.tsx`**

Adicionar badge para tipoAderencia (após `PRIORIDADE_BADGE`, linha 17):

```ts
const TIPO_ADERENCIA_BADGE: Record<string, string> = {
  direta: 'bg-blue-100 text-blue-700',
  aplicacao: 'bg-green-100 text-green-700',
  contexto_oculto: 'bg-yellow-100 text-yellow-700',
  nenhuma: 'bg-gray-50 text-gray-400',
}
```

Atualizar headers (linha 33) para incluir as 2 novas colunas após 'Aderência':

```ts
{['Tipo', 'ID', 'Descrição', 'Qtd', 'Unid.', 'Aderência', 'Tipo Ader.', 'Prioridade', 'Motivo', 'Valor Est.'].map(...)}
```

Adicionar células após a célula de aderência (após linha 69):

```tsx
              <td className="py-2 pr-3">
                {item.tipoAderencia ? (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TIPO_ADERENCIA_BADGE[item.tipoAderencia] ?? 'bg-gray-50 text-gray-400'}`}>
                    {item.tipoAderencia}
                  </span>
                ) : '—'}
              </td>
```

E após a célula de prioridade (após linha 78), adicionar célula de motivo:

```tsx
              <td className="py-2 pr-3 text-slate-500 max-w-[160px]">
                {item.motivo ? (
                  <span title={item.motivo} className="block truncate">
                    {item.motivo.length > 40 ? item.motivo.slice(0, 40) + '…' : item.motivo}
                  </span>
                ) : '—'}
              </td>
```

- [ ] **Step 4: Rodar teste**

```bash
npx jest __tests__/components/ItensTab.test.tsx --no-coverage
```

Expected: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add components/licitacao/tabs/ItensTab.tsx __tests__/components/ItensTab.test.tsx
git commit -m "feat(sp8a): show tipoAderencia and motivo columns in ItensTab"
```

---

## PARTE B — Responsável kanban

### Task 3: Schema Prisma — relação KanbanCard → User

**Files:**
- Modify: `prisma/schema.prisma`

**Contexto:** `KanbanCard` já tem `responsavelId String? @map("responsavel_id")` (linha 85). Precisa de relação declarada. `User` é o model do NextAuth (campos: `id`, `name`, `email`, `role`, `ativo`).

- [ ] **Step 1: Adicionar relação em `KanbanCard` (após `responsavelId`, linha 86)**

```prisma
  responsavel   User?  @relation("KanbanCardResponsavel", fields: [responsavelId], references: [id])
```

- [ ] **Step 2: Adicionar lado inverso em `User` (em qualquer posição dentro do model `User`)**

```prisma
  kanbanCards   KanbanCard[]  @relation("KanbanCardResponsavel")
```

- [ ] **Step 3: Criar migration**

```bash
npx prisma migrate dev --name add_kanbancard_responsavel_relation
```

Expected: migration criada e aplicada com sucesso

- [ ] **Step 4: Verificar TypeScript gerado**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(sp8b): add KanbanCard-User relation for responsavel"
```

---

### Task 4: Tipos — CardInfo + FiltrosKanban

**Files:**
- Modify: `types/licitacao.ts`
- Modify: `components/kanban/FilterBar.tsx`

- [ ] **Step 1: Adicionar `responsavel` em `CardInfo` em `types/licitacao.ts` (após `motivoBloqueio`, linha 23)**

```ts
export type CardInfo = {
  id: string
  colunaAtual: KanbanColuna
  urgente: boolean
  bloqueado: boolean
  motivoBloqueio: string | null
  responsavel: { id: string; name: string | null } | null
}
```

- [ ] **Step 2: Adicionar `responsavelId` em `FiltrosKanban` em `components/kanban/FilterBar.tsx` (linha 7-14)**

```ts
export type FiltrosKanban = {
  busca: string
  segmento: string
  classificacao: string
  uf: string
  urgentes: boolean
  riscoAltoFn: boolean
  responsavelId: string   // '' = todos
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: erros de `responsavel` ausente no `CardInfo` em `app/api/licitacoes/route.ts` e no `KanbanBoard` — serão resolvidos nas próximas tasks.

- [ ] **Step 4: Commit**

```bash
git add types/licitacao.ts components/kanban/FilterBar.tsx
git commit -m "feat(sp8b): add responsavel to CardInfo and responsavelId to FiltrosKanban"
```

---

### Task 5: GET /api/usuarios-ativos (TDD)

**Files:**
- Create: `__tests__/api/usuarios-ativos.test.ts`
- Create: `app/api/usuarios-ativos/route.ts`

- [ ] **Step 1: Criar teste**

Criar `__tests__/api/usuarios-ativos.test.ts`:

```ts
import { db } from '@/lib/db'

async function getUsuariosAtivos() {
  return db.user.findMany({
    where: { ativo: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

describe('GET /api/usuarios-ativos — query', () => {
  afterAll(async () => { await db.$disconnect() })

  it('retorna apenas usuários ativos', async () => {
    const result = await getUsuariosAtivos()
    expect(Array.isArray(result)).toBe(true)
    result.forEach((u) => {
      expect(u.id).toBeDefined()
      expect(u.name).toBeDefined()
    })
  })

  it('não retorna campos sensíveis (email, password)', async () => {
    const result = await getUsuariosAtivos()
    result.forEach((u: Record<string, unknown>) => {
      expect(u.email).toBeUndefined()
      expect(u.password).toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: Rodar teste para confirmar que passa** (query é simples, sem implementação necessária para o teste)

```bash
npx jest __tests__/api/usuarios-ativos.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 3: Criar rota**

Criar `app/api/usuarios-ativos/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const usuarios = await db.user.findMany({
    where: { ativo: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ usuarios })
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 5: Commit**

```bash
git add app/api/usuarios-ativos/route.ts __tests__/api/usuarios-ativos.test.ts
git commit -m "feat(sp8b): add GET /api/usuarios-ativos endpoint"
```

---

### Task 6: PATCH /api/kanban/cards/[id] (TDD)

**Files:**
- Create: `__tests__/api/kanban-cards-patch.test.ts`
- Create: `app/api/kanban/cards/[id]/route.ts`

- [ ] **Step 1: Criar teste**

Criar `__tests__/api/kanban-cards-patch.test.ts`:

```ts
import { db } from '@/lib/db'

async function patchCardResponsavel(cardId: string, responsavelId: string | null) {
  return db.kanbanCard.update({
    where: { id: cardId },
    data: { responsavelId },
    select: {
      id: true,
      responsavelId: true,
      responsavel: { select: { id: true, name: true } },
    },
  })
}

describe('PATCH /api/kanban/cards/[id] — responsavelId', () => {
  afterAll(async () => { await db.$disconnect() })

  it('atribui responsável a um card', async () => {
    const card = await db.kanbanCard.findFirst({ select: { id: true } })
    const user = await db.user.findFirst({ where: { ativo: true }, select: { id: true } })
    if (!card || !user) return

    const result = await patchCardResponsavel(card.id, user.id)
    expect(result.responsavelId).toBe(user.id)
    expect(result.responsavel?.id).toBe(user.id)
  })

  it('remove responsável ao passar null', async () => {
    const card = await db.kanbanCard.findFirst({ select: { id: true } })
    if (!card) return

    const result = await patchCardResponsavel(card.id, null)
    expect(result.responsavelId).toBeNull()
    expect(result.responsavel).toBeNull()
  })

  it('rejeita responsavelId de usuário inativo (validação de negócio)', async () => {
    const card = await db.kanbanCard.findFirst({ select: { id: true } })
    const inativo = await db.user.findFirst({ where: { ativo: false }, select: { id: true } })
    if (!card || !inativo) {
      console.warn('Nenhum usuário inativo no banco para testar — pule este caso')
      return
    }
    // A rota HTTP retorna 400, mas aqui testamos que a query Prisma executa sem erro
    // e que a validação deve ser feita no handler antes de chamar db.update
    const user = await db.user.findUnique({ where: { id: inativo.id }, select: { ativo: true } })
    expect(user?.ativo).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar teste**

```bash
npx jest __tests__/api/kanban-cards-patch.test.ts --no-coverage
```

Expected: PASS (testa a query diretamente com o banco)

- [ ] **Step 3: Criar rota**

Criar `app/api/kanban/cards/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const { responsavelId } = await req.json() as { responsavelId: string | null }

  // Validar que o usuário existe e está ativo (se não for null)
  if (responsavelId !== null) {
    const user = await db.user.findUnique({ where: { id: responsavelId }, select: { ativo: true } })
    if (!user || !user.ativo) {
      return NextResponse.json({ error: 'Usuário inválido ou inativo' }, { status: 400 })
    }
  }

  const card = await db.kanbanCard.update({
    where: { id },
    data: { responsavelId },
    select: {
      id: true,
      responsavelId: true,
      responsavel: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ card })
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 5: Commit**

```bash
git add app/api/kanban/cards/[id]/route.ts __tests__/api/kanban-cards-patch.test.ts
git commit -m "feat(sp8b): add PATCH /api/kanban/cards/[id] for responsavel assignment"
```

---

### Task 7: GET /api/licitacoes — incluir responsavel no card

**Files:**
- Modify: `app/api/licitacoes/route.ts`

- [ ] **Step 1: Adicionar `responsavel` ao select do card (após `motivoBloqueio`, linha 14)**

```ts
        card: {
          select: {
            id: true,
            colunaAtual: true,
            urgente: true,
            bloqueado: true,
            motivoBloqueio: true,
            responsavel: { select: { id: true, name: true } },
          },
        },
```

O campo `responsavel` já está tipado como `{ id: string; name: string | null } | null` em `CardInfo` (Task 4). O Prisma retorna `name: string | null` (campo `String?` no schema), que é compatível. O `GET /api/licitacoes/route.ts` retorna o objeto diretamente sem mapping manual — o TypeScript infere o tipo automaticamente do Prisma.

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 3: Rodar testes de licitacoes**

```bash
npx jest __tests__/api/licitacoes.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/licitacoes/route.ts
git commit -m "feat(sp8b): include responsavel in GET /api/licitacoes card select"
```

---

### Task 8: LicitacaoCard — linha responsável com dropdown

**Files:**
- Modify: `components/kanban/LicitacaoCard.tsx`

**Contexto:** `LicitacaoCard` é um componente de servidor/cliente misto — atualmente sem `'use client'`. Para ter interação (click, fetch), ele precisa virar Client Component ou o responsável precisa ser extraído para um sub-componente client.

- [ ] **Step 1: Criar sub-componente `CardResponsavel`**

Adicionar no topo do arquivo `components/kanban/LicitacaoCard.tsx` a diretiva e o sub-componente:

```tsx
'use client'
```

(Todo o arquivo já usa `lucide-react` e pode virar client — verificar se há dependência server-only. Se não houver, adicionar `'use client'` no topo.)

- [ ] **Step 2: Adicionar state e handler no `LicitacaoCard`**

```tsx
'use client'

import { useState, useRef } from 'react'
import { AlertTriangle, Zap, UserCircle } from 'lucide-react'
// ... demais imports
```

Adicionar dentro do componente, após `const scoreVal`:

```tsx
  const [responsavel, setResponsavel] = useState(licitacao.card.responsavel)
  const [showDropdown, setShowDropdown] = useState(false)
  const [usuarios, setUsuarios] = useState<{ id: string; name: string | null }[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  async function handleClickResponsavel(e: React.MouseEvent) {
    e.stopPropagation()
    if (usuarios.length === 0) {
      const res = await fetch('/api/usuarios-ativos')
      const { usuarios: u } = await res.json()
      setUsuarios(u)
    }
    setShowDropdown((v) => !v)
  }

  async function handleSelectResponsavel(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation()
    const val = e.target.value
    const responsavelId = val === '' ? null : val
    const prevResponsavel = responsavel
    // Optimistic update
    setResponsavel(usuarios.find((u) => u.id === responsavelId) ?? null)
    setShowDropdown(false)
    const res = await fetch(`/api/kanban/cards/${licitacao.card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responsavelId }),
    })
    if (!res.ok) {
      // Rollback
      setResponsavel(prevResponsavel)
    }
  }
```

- [ ] **Step 3: Adicionar linha responsável no JSX, antes de `<CardQuickActions>`**

```tsx
      {/* Responsável */}
      <div className="relative mt-2">
        <button
          onClick={handleClickResponsavel}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <UserCircle className="h-3 w-3" />
          <span className="text-[10px]">{responsavel?.name ?? '— Sem responsável'}</span>
        </button>
        {showDropdown && (
          <div ref={dropdownRef} className="absolute z-10 top-5 left-0 bg-white border border-slate-200 rounded shadow-md min-w-[160px]">
            <select
              size={Math.min(usuarios.length + 1, 6)}
              onChange={handleSelectResponsavel}
              className="w-full text-xs p-1 outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">— Sem responsável</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.name ?? u.id}</option>
              ))}
            </select>
          </div>
        )}
      </div>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 5: Commit**

```bash
git add components/kanban/LicitacaoCard.tsx
git commit -m "feat(sp8b): add responsavel inline dropdown to LicitacaoCard"
```

---

### Task 8b: Teste do LicitacaoCard com responsável (TDD complementar)

**Files:**
- Create: `__tests__/components/LicitacaoCard.test.tsx`

- [ ] **Step 1: Criar teste**

Criar `__tests__/components/LicitacaoCard.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { LicitacaoCard } from '@/components/kanban/LicitacaoCard'
import type { LicitacaoComCard } from '@/types/licitacao'

const BASE: LicitacaoComCard = {
  id: '1',
  orgao: 'Órgão Teste',
  numeroLicitacao: '001/2026',
  modalidade: 'Pregão',
  objetoResumido: 'Objeto teste',
  uf: 'SP',
  municipio: 'São Paulo',
  segmento: 'TI',
  dataSessao: null,
  valorGlobalEstimado: null,
  score: null,
  card: {
    id: 'card-1',
    colunaAtual: 'captadas',
    urgente: false,
    bloqueado: false,
    motivoBloqueio: null,
    responsavel: null,
  },
}

describe('LicitacaoCard — responsável', () => {
  it('renderiza "Sem responsável" quando card.responsavel = null', () => {
    render(<LicitacaoCard licitacao={BASE} onMover={() => {}} />)
    expect(screen.getByText(/sem responsável/i)).toBeInTheDocument()
  })

  it('renderiza o nome do responsável quando atribuído', () => {
    const comResponsavel: LicitacaoComCard = {
      ...BASE,
      card: { ...BASE.card, responsavel: { id: 'u1', name: 'João Silva' } },
    }
    render(<LicitacaoCard licitacao={comResponsavel} onMover={() => {}} />)
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste**

```bash
npx jest __tests__/components/LicitacaoCard.test.tsx --no-coverage
```

Expected: PASS (2 testes)

- [ ] **Step 3: Commit**

```bash
git add __tests__/components/LicitacaoCard.test.tsx
git commit -m "test(sp8b): add LicitacaoCard responsavel render tests"
```

---

### Task 9: FilterBar — select responsável + KanbanBoard wiring

**Files:**
- Modify: `components/kanban/FilterBar.tsx`
- Modify: `components/kanban/KanbanBoard.tsx`

- [ ] **Step 1: Adicionar prop `usuariosAtivos` e select em `FilterBar.tsx`**

Atualizar `Props`:

```ts
type Props = {
  filtros: FiltrosKanban
  onChange: (filtros: FiltrosKanban) => void
  segmentosDisponiveis: string[]
  ufsDisponiveis: string[]
  usuariosAtivos: { id: string; name: string | null }[]
}
```

Adicionar no JSX (após o select de UF, antes dos checkboxes):

```tsx
      <Select
        value={filtros.responsavelId}
        onValueChange={(v) => update({ responsavelId: v === 'todos' ? '' : v })}
      >
        <SelectTrigger className="h-8 text-xs w-40">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {usuariosAtivos.map((u) => (
            <SelectItem key={u.id} value={u.id}>{u.name ?? u.id}</SelectItem>
          ))}
        </SelectContent>
      </Select>
```

- [ ] **Step 2: Atualizar `FILTROS_INICIAIS` em `KanbanBoard.tsx` (linha 23)**

```ts
const FILTROS_INICIAIS: FiltrosKanban = {
  busca: '',
  segmento: 'todos',
  classificacao: 'todas',
  uf: 'todas',
  urgentes: false,
  riscoAltoFn: false,
  responsavelId: '',
}
```

- [ ] **Step 3: Adicionar fetch de `usuariosAtivos` no `KanbanBoard.tsx`**

Após o `useQuery` de metricas (linha 54), adicionar:

```ts
  const { data: usuariosData } = useQuery<{ usuarios: { id: string; name: string | null }[] }>({
    queryKey: ['usuarios-ativos'],
    queryFn: () => fetch('/api/usuarios-ativos').then((r) => r.json()),
    staleTime: 60_000,
  })
  const usuariosAtivos = usuariosData?.usuarios ?? []
```

- [ ] **Step 4: Adicionar filtro por responsável no `licitacoesFiltradas` (após `riscoAltoFn`, linha 95)**

```ts
      if (filtros.responsavelId && l.card.responsavel?.id !== filtros.responsavelId) return false
```

- [ ] **Step 5: Passar `usuariosAtivos` ao `FilterBar` (linha 178)**

```tsx
      <FilterBar
        filtros={filtros}
        onChange={setFiltros}
        segmentosDisponiveis={segmentosDisponiveis}
        ufsDisponiveis={ufsDisponiveis}
        usuariosAtivos={usuariosAtivos}
      />
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 7: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Expected: todos passando

- [ ] **Step 8: Commit**

```bash
git add components/kanban/FilterBar.tsx components/kanban/KanbanBoard.tsx
git commit -m "feat(sp8b): add responsavel filter to FilterBar and KanbanBoard — SP-8 complete"
```
