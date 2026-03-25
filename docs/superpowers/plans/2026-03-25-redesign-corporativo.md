# Redesign Corporativo (Skin Swap) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar as cores do app para um visual corporativo com sidebar escura (#0F172A) e acento azul (#1D4ED8), sem alterar qualquer estrutura JSX ou lógica.

**Architecture:** Skin swap puro — apenas substituições de classes Tailwind nos 6 arquivos listados. Nenhum novo componente, nenhuma nova lógica, nenhum novo arquivo. A constante `FAIXA_CARD_BG` é adicionada a `LicitacaoCard.tsx` para controlar o fundo colorido por faixa.

**Tech Stack:** Next.js, Tailwind CSS, shadcn/ui (classes utilitárias puras)

---

## Verificação de tipos

Após cada tarefa, rodar:
```bash
npx tsc --noEmit
```
Saída esperada: **nenhum erro** (saída vazia = sucesso).

---

## Arquivos Modificados

| Arquivo | O que muda |
|---------|-----------|
| `components/layout/SidebarNav.tsx` | Fundo escuro, cores ativas/inativas/hover |
| `components/kanban/KanbanColumn.tsx` | Cabeçalho azul, badge, drop isOver |
| `components/kanban/LicitacaoCard.tsx` | Nova constante `FAIXA_CARD_BG`, fundo por faixa, barra de score azul |
| `components/kanban/MetricsCardsRow.tsx` | Borda superior azul nos cards de métrica |
| `components/kanban/FilterBar.tsx` | Fundo `bg-slate-50` |
| `components/kanban/MoveKanbanModal.tsx` | Focus ring azul, hover chips azul |

**Não alterar:** `TopBar.tsx`, `AppShell.tsx`, `KanbanBoard.tsx`, `CardQuickActions.tsx`, `FAIXA_COLORS` (constante de badges).

---

## Task 1: Sidebar — cores escuras

**Files:**
- Modify: `components/layout/SidebarNav.tsx`

- [ ] **Step 1.1: Editar `<aside>`**

Linha 19. Trocar:
```tsx
<aside className="flex w-56 flex-col border-r bg-white">
```
Por:
```tsx
<aside className="flex w-56 flex-col bg-[#0F172A]">
```

- [ ] **Step 1.2: Editar header interno**

Linha 20. Trocar:
```tsx
<div className="flex h-14 items-center border-b px-4">
```
Por:
```tsx
<div className="flex h-14 items-center border-b border-slate-800 px-4">
```

- [ ] **Step 1.3: Editar título**

Linha 21. Trocar:
```tsx
<span className="text-sm font-bold tracking-tight text-slate-900">
```
Por:
```tsx
<span className="text-sm font-bold tracking-tight text-white">
```

- [ ] **Step 1.4: Editar item ativo e inativo**

Linhas 33–34. Trocar:
```tsx
pathname === href
  ? 'bg-slate-100 text-slate-900'
  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
```
Por:
```tsx
pathname === href
  ? 'bg-[#1D4ED8] text-white'
  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
```

- [ ] **Step 1.5: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia (sem erros).

- [ ] **Step 1.6: Commit**

```bash
git add components/layout/SidebarNav.tsx
git commit -m "style: apply dark corporate sidebar (#0F172A + #1D4ED8)"
```

---

## Task 2: KanbanColumn — cabeçalho azul

**Files:**
- Modify: `components/kanban/KanbanColumn.tsx`

- [ ] **Step 2.1: Editar cabeçalho da coluna**

Linha 44. Trocar:
```tsx
<div className="flex items-center justify-between px-2 py-2 rounded-t-lg bg-slate-100 border border-b-0">
```
Por:
```tsx
<div className="flex items-center justify-between px-2 py-2 rounded-t-lg bg-[#1D4ED8] border border-b-0 border-[#1D4ED8]">
```

- [ ] **Step 2.2: Editar texto do label**

Linha 45. Trocar:
```tsx
<h2 className="text-xs font-semibold text-slate-700 truncate">{label}</h2>
```
Por:
```tsx
<h2 className="text-xs font-semibold text-white truncate">{label}</h2>
```

- [ ] **Step 2.3: Editar badge de contagem**

Linha 46. Trocar:
```tsx
<span className="ml-2 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
```
Por:
```tsx
<span className="ml-2 rounded-full bg-blue-900 px-1.5 py-0.5 text-[10px] font-medium text-blue-100">
```

- [ ] **Step 2.4: Editar área de drop (isOver)**

Linha 55. Trocar:
```tsx
isOver ? 'bg-slate-100 border-slate-400' : 'bg-slate-50 border-slate-200'
```
Por:
```tsx
isOver ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'
```

- [ ] **Step 2.5: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 2.6: Commit**

```bash
git add components/kanban/KanbanColumn.tsx
git commit -m "style: apply blue corporate header to kanban columns"
```

---

## Task 3: LicitacaoCard — fundo por faixa + score azul

**Files:**
- Modify: `components/kanban/LicitacaoCard.tsx`

- [ ] **Step 3.1: Adicionar constante `FAIXA_CARD_BG`**

Após a constante `FAIXA_COLORS` (linha 17), adicionar:

```tsx
const FAIXA_CARD_BG: Record<string, string> = {
  'A+': 'bg-green-50 border-green-200',
  A:   'bg-emerald-50 border-emerald-200',
  B:   'bg-yellow-50 border-yellow-200',
  C:   'bg-orange-50 border-orange-200',
  D:   'bg-red-50 border-red-200',
}
```

**Não alterar** `FAIXA_COLORS` — ela controla apenas os badges.

- [ ] **Step 3.2: Editar className do card root**

Linha 38. Trocar:
```tsx
<div className="rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-xs">
```
Por:
```tsx
<div className={`rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-xs ${FAIXA_CARD_BG[faixa ?? ''] ?? 'bg-white border-slate-200'}`}>
```

`bg-white` é **removido** do className base — agora vem de `FAIXA_CARD_BG` ou do fallback `'bg-white border-slate-200'`.

- [ ] **Step 3.3: Editar barra de score**

Linha 101. Trocar:
```tsx
className="h-full rounded-full bg-slate-500 transition-all"
```
Por:
```tsx
className="h-full rounded-full bg-[#1D4ED8] transition-all"
```

- [ ] **Step 3.4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 3.5: Commit**

```bash
git add components/kanban/LicitacaoCard.tsx
git commit -m "style: color-code kanban cards by classification faixa"
```

---

## Task 4: MetricsCardsRow — borda superior azul

**Files:**
- Modify: `components/kanban/MetricsCardsRow.tsx`

- [ ] **Step 4.1: Adicionar borda superior azul nos cards de métrica**

Linha 20. Trocar:
```tsx
className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm"
```
Por:
```tsx
className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm border-t-2 border-t-[#1D4ED8]"
```

- [ ] **Step 4.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 4.3: Commit**

```bash
git add components/kanban/MetricsCardsRow.tsx
git commit -m "style: add blue accent top border to metric cards"
```

---

## Task 5: FilterBar — fundo slate-50

**Files:**
- Modify: `components/kanban/FilterBar.tsx`

- [ ] **Step 5.1: Editar fundo do container**

Linha 28. Trocar:
```tsx
<div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-white">
```
Por:
```tsx
<div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-slate-50">
```

- [ ] **Step 5.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 5.3: Commit**

```bash
git add components/kanban/FilterBar.tsx
git commit -m "style: set filter bar background to slate-50"
```

---

## Task 6: MoveKanbanModal — foco e hover azul

**Files:**
- Modify: `components/kanban/MoveKanbanModal.tsx`

- [ ] **Step 6.1: Editar focus ring do `<select>`**

Linha 77. Trocar:
```tsx
className="w-full rounded-md border border-slate-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
```
Por:
```tsx
className="w-full rounded-md border border-slate-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
```

- [ ] **Step 6.2: Editar focus ring da `<textarea>`**

Linha 111. Trocar:
```tsx
className="w-full rounded-md border border-slate-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
```
Por:
```tsx
className="w-full rounded-md border border-slate-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] resize-none"
```

- [ ] **Step 6.3: Editar hover dos chips de sugestão**

Linha 103. Trocar:
```tsx
className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 transition-colors"
```
Por:
```tsx
className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
```

- [ ] **Step 6.4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 6.5: Commit**

```bash
git add components/kanban/MoveKanbanModal.tsx
git commit -m "style: apply blue accent focus/hover to move modal"
```

---

## Task 7: Build final e lint

- [ ] **Step 7.1: Rodar lint**

```bash
npm run lint
```
Esperado: sem erros. Warnings de acessibilidade podem aparecer — ignorar se já existiam antes.

- [ ] **Step 7.2: Rodar build**

```bash
npm run build
```
Esperado: `✓ Compiled successfully` (ou equivalente Next.js). Nenhum erro de TypeScript ou de módulo.

- [ ] **Step 7.3: Verificação visual manual**

Abrir o app e checar:
- Sidebar está escura com texto claro e item ativo azul
- Cabeçalhos das colunas kanban estão em azul com texto branco
- Cards A+ aparecem com fundo verde-claro, B amarelo, D vermelho
- Cards sem faixa aparecem com fundo branco
- Cards de métricas têm borda superior azul
- FilterBar tem fundo levemente cinza
- Modal de mover: focus ring azul no select/textarea, hover azul nos chips

- [ ] **Step 7.4: Commit final (se houver arquivos não commitados)**

```bash
git status
# Se tudo já foi commitado nas tarefas anteriores, nenhuma ação necessária.
```
