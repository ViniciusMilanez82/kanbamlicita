# SP-7: Aba Sinais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar aba "Sinais" read-only na página de detalhe, exibindo sinais identificados pela IA agrupados por categoria.

**Architecture:** Server Component carrega `sinais[]` junto com `getLicitacao()`. Novo componente `SinaisTab` recebe a lista como prop e renderiza tabela agrupada por `categoria`. Nenhuma escrita — dados são populados pelo módulo de IA (SP-4).

**Tech Stack:** Next.js App Router, TypeScript, Prisma (PostgreSQL), Tailwind CSS, Jest + @testing-library/react

---

## Arquivos

| Ação | Arquivo | O que muda |
|------|---------|-----------|
| Modify | `types/licitacao-detalhe.ts` | Novo tipo `SinalDetalhe`; campo `sinais` em `LicitacaoDetalhe` |
| Modify | `app/licitacoes/[id]/page.tsx` | `VALID_TABS`, include + mapping em `getLicitacao()`, import e render |
| Modify | `components/licitacao/DetailTabs.tsx` | Entrada `sinais` no array `TABS` |
| Create | `components/licitacao/tabs/SinaisTab.tsx` | Componente de exibição agrupado por categoria |
| Create | `__tests__/components/SinaisTab.test.tsx` | Testes de render |

---

### Task 1: Types + VALID_TABS + DetailTabs

**Files:**
- Modify: `types/licitacao-detalhe.ts`
- Modify: `app/licitacoes/[id]/page.tsx`
- Modify: `components/licitacao/DetailTabs.tsx`

- [ ] **Step 1: Adicionar tipo `SinalDetalhe` em `types/licitacao-detalhe.ts`**

Inserir após a linha `export type AnaliseIaDetalhe = { ... } | null` (linha 124):

```ts
export type SinalDetalhe = {
  id: string
  categoria: string
  subcategoria: string | null
  sinal: string
  nivel: string | null
  trecho: string | null
  fonteDocumento: string | null
  relevancia: string | null
  criadoEm: string
}
```

- [ ] **Step 2: Adicionar campo `sinais` em `LicitacaoDetalhe`**

Ao final do tipo `LicitacaoDetalhe` (antes do `}` de fechamento, após `analiseIa`, linha 173):

```ts
  sinais: SinalDetalhe[]
```

- [ ] **Step 3: Adicionar `'sinais'` ao `VALID_TABS` em `app/licitacoes/[id]/page.tsx` (linha 18)**

```ts
const VALID_TABS = ['resumo', 'documentos', 'itens', 'analise', 'historico', 'ia', 'sinais', 'score', 'parecer'] as const
```

- [ ] **Step 4: Adicionar entrada em `components/licitacao/DetailTabs.tsx`**

No array `TABS` (linha 10), após `{ key: 'ia', label: 'IA' }`:

```ts
  { key: 'sinais', label: 'Sinais' },
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: erros de `sinais` ausente no objeto `licitacao` em `getLicitacao()` (isso é esperado agora — será resolvido na Task 2)

- [ ] **Step 6: Commit**

```bash
git add types/licitacao-detalhe.ts app/licitacoes/[id]/page.tsx components/licitacao/DetailTabs.tsx
git commit -m "feat(sp7): add SinalDetalhe type, VALID_TABS entry and DetailTabs tab"
```

---

### Task 2: getLicitacao() — include e mapping

**Files:**
- Modify: `app/licitacoes/[id]/page.tsx`

- [ ] **Step 1: Adicionar `sinais` ao `include` do `getLicitacao()` (após `analisesIa`, linha 46)**

```ts
      sinais: { orderBy: { criadoEm: 'asc' } },
```

- [ ] **Step 2: Adicionar mapping de sinais no objeto `licitacao` (após o bloco `analiseIa`, antes do `}` de fechamento, linha 205)**

```ts
    sinais: row.sinais.map((s) => ({
      id: s.id,
      categoria: s.categoria,
      subcategoria: s.subcategoria ?? null,
      sinal: s.sinal,
      nivel: s.nivel ?? null,
      trecho: s.trecho ?? null,
      fonteDocumento: s.fonteDocumento ?? null,
      relevancia: s.relevancia ?? null,
      criadoEm: s.criadoEm.toISOString(),
    })),
```

- [ ] **Step 3: Verificar TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: sem erros (campo `sinais` ainda não renderizado na page, mas isso não causa erro de compilação)

- [ ] **Step 4: Commit**

```bash
git add app/licitacoes/[id]/page.tsx
git commit -m "feat(sp7): include and map sinais in getLicitacao()"
```

---

### Task 3: Criar SinaisTab (TDD)

**Files:**
- Create: `__tests__/components/SinaisTab.test.tsx`
- Create: `components/licitacao/tabs/SinaisTab.tsx`

- [ ] **Step 1: Criar arquivo de teste**

Criar `__tests__/components/SinaisTab.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { SinaisTab } from '@/components/licitacao/tabs/SinaisTab'
import type { SinalDetalhe } from '@/types/licitacao-detalhe'

const BASE: SinalDetalhe = {
  id: '1',
  categoria: 'tecnologia',
  subcategoria: 'software',
  sinal: 'Equipamento de TI avançado',
  nivel: 'alto',
  trecho: 'Conforme item 3.2 do edital...',
  fonteDocumento: 'edital.pdf',
  relevancia: 'alta',
  criadoEm: '2026-01-01T00:00:00.000Z',
}

describe('SinaisTab', () => {
  it('renderiza empty state quando sinais = []', () => {
    render(<SinaisTab sinais={[]} />)
    expect(screen.getByText(/nenhum sinal identificado/i)).toBeInTheDocument()
  })

  it('renderiza cabeçalho da categoria', () => {
    render(<SinaisTab sinais={[BASE]} />)
    expect(screen.getByText('tecnologia')).toBeInTheDocument()
  })

  it('renderiza 2 seções para 2 categorias distintas', () => {
    const sinais: SinalDetalhe[] = [
      { ...BASE, id: '1', categoria: 'tecnologia' },
      { ...BASE, id: '2', categoria: 'logistica' },
    ]
    render(<SinaisTab sinais={sinais} />)
    expect(screen.getByText('tecnologia')).toBeInTheDocument()
    expect(screen.getByText('logistica')).toBeInTheDocument()
  })

  it('badge de nível "alto" tem classe bg-red-100', () => {
    render(<SinaisTab sinais={[BASE]} />)
    const badge = screen.getByText('alto')
    expect(badge.className).toContain('bg-red-100')
  })
})
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

```bash
npx jest __tests__/components/SinaisTab.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '@/components/licitacao/tabs/SinaisTab'"

- [ ] **Step 3: Criar componente**

Criar `components/licitacao/tabs/SinaisTab.tsx`:

```tsx
import type { SinalDetalhe } from '@/types/licitacao-detalhe'

const NIVEL_BADGE: Record<string, string> = {
  alto: 'bg-red-100 text-red-700',
  médio: 'bg-yellow-100 text-yellow-700',
  baixo: 'bg-slate-100 text-slate-600',
}

const RELEVANCIA_BADGE: Record<string, string> = {
  alta: 'bg-blue-100 text-blue-700',
  média: 'bg-slate-100 text-slate-600',
  baixa: 'bg-gray-50 text-gray-400',
}

type Props = { sinais: SinalDetalhe[] }

export function SinaisTab({ sinais }: Props) {
  if (sinais.length === 0) {
    return (
      <div className="p-6 text-sm text-slate-400 italic">
        Nenhum sinal identificado para esta licitação.
      </div>
    )
  }

  const grupos = sinais.reduce<Record<string, SinalDetalhe[]>>((acc, s) => {
    if (!acc[s.categoria]) acc[s.categoria] = []
    acc[s.categoria].push(s)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6">
      {Object.entries(grupos).map(([categoria, itens]) => (
        <section key={categoria}>
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            {categoria}
          </h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                {['Subcategoria', 'Sinal', 'Nível', 'Relevância', 'Trecho', 'Fonte Doc.'].map((h) => (
                  <th key={h} className="text-left text-slate-500 font-medium pb-2 pr-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {itens.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{s.subcategoria ?? '—'}</td>
                  <td className="py-2 pr-3 text-slate-700 max-w-xs">
                    <p className="line-clamp-3">{s.sinal}</p>
                  </td>
                  <td className="py-2 pr-3">
                    {s.nivel ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${NIVEL_BADGE[s.nivel] ?? 'bg-gray-50 text-gray-400'}`}>
                        {s.nivel}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2 pr-3">
                    {s.relevancia ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${RELEVANCIA_BADGE[s.relevancia] ?? 'bg-gray-50 text-gray-400'}`}>
                        {s.relevancia}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-slate-500 max-w-[200px]">
                    {s.trecho ? (
                      <span title={s.trecho} className="block truncate">{s.trecho}</span>
                    ) : '—'}
                  </td>
                  <td className="py-2 text-slate-400">{s.fonteDocumento ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

```bash
npx jest __tests__/components/SinaisTab.test.tsx --no-coverage
```

Expected: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add components/licitacao/tabs/SinaisTab.tsx __tests__/components/SinaisTab.test.tsx
git commit -m "feat(sp7): add SinaisTab component with render tests"
```

---

### Task 4: Wire SinaisTab na page.tsx

**Files:**
- Modify: `app/licitacoes/[id]/page.tsx`

- [ ] **Step 1: Adicionar import (após o import de `IaTab`, linha 10)**

```ts
import { SinaisTab } from '@/components/licitacao/tabs/SinaisTab'
```

- [ ] **Step 2: Adicionar render (após o bloco `activeTab === 'ia'`, linha 251)**

```tsx
          {activeTab === 'sinais' && <SinaisTab sinais={licitacao.sinais} />}
```

- [ ] **Step 3: Verificar TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 4: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Expected: todos passando

- [ ] **Step 5: Commit**

```bash
git add app/licitacoes/[id]/page.tsx
git commit -m "feat(sp7): wire SinaisTab into detail page — SP-7 complete"
```
