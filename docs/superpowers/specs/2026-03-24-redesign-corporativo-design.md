# Design Spec: Redesign Corporativo (Skin Swap)

**Data:** 2026-03-24
**Escopo:** Troca de cores e estilos visuais sem alteração estrutural de componentes
**Abordagem:** Opção 1 — Skin Swap puro

---

## Objetivo

Transformar o visual atual (branco/slate neutro) em um design corporativo profissional com sidebar escura e acento azul corporativo (#1D4ED8), mantendo toda a funcionalidade intacta.

---

## Paleta de Cores

| Token | Hex | Tailwind equivalente | Uso |
|-------|-----|----------------------|-----|
| accent-primary | `#1D4ED8` | `blue-700` | Itens ativos, cabeçalhos de coluna, borda métricas, botão primário |
| sidebar-bg | `#0F172A` | `slate-950` | Fundo da sidebar |
| sidebar-active-bg | `#1D4ED8` | `blue-700` | Fundo do item de nav ativo |
| sidebar-inactive-text | `#94A3B8` | `slate-400` | Texto dos itens inativos |
| sidebar-hover-bg | `#1E293B` | `slate-800` | Hover nos itens inativos |
| sidebar-header-border | `#1E293B` | `slate-800` | Borda interna do header da sidebar |

---

## Arquivos Alterados

### `components/layout/SidebarNav.tsx`

- `<aside>`: trocar `bg-white border-r` → `bg-[#0F172A]` (sem border-r)
- `<div>` do header (linha 20): trocar `border-b` → `border-b border-slate-800`
- `<span>` do título (linha 21): trocar `text-slate-900` → `text-white`
- Item ativo: trocar `bg-slate-100 text-slate-900` → `bg-[#1D4ED8] text-white`
- Item inativo: trocar `text-slate-600 hover:bg-slate-50 hover:text-slate-900` → `text-slate-400 hover:bg-slate-800 hover:text-white`

### `components/layout/TopBar.tsx`

**Mantido sem alteração.** O `TopBar` fica dentro de `<main>` (área de conteúdo separada da sidebar pelo flex layout). O fundo `bg-white` com `border-b` cria uma separação natural entre o cabeçalho de página e o conteúdo, o que é visualmente adequado no contexto corporativo.

### `components/layout/AppShell.tsx`

**Mantido sem alteração.** O fundo `bg-slate-50` já é adequado para o novo visual.

### `components/kanban/KanbanColumn.tsx`

**Cabeçalho:**
- Trocar `bg-slate-100 border border-b-0` → `bg-[#1D4ED8] border border-b-0 border-[#1D4ED8]`
- Texto do label: trocar `text-slate-700` → `text-white`
- Badge de contagem: trocar `bg-slate-200 text-slate-600` → `bg-blue-900 text-blue-100`

**Nota sobre bordas:** O cabeçalho usa `border-b-0` para criar continuidade visual com a área de drop abaixo. A área de drop tem `border border-slate-200`. Com o cabeçalho azul e a área de drop em slate, a coluna terá uma leve transição de cores nas bordas laterais. Isso é aceitável para um skin swap — não alterar a estratégia de borda.

**Área de drop (isOver):**
- Trocar `bg-slate-100 border-slate-400` → `bg-blue-50 border-blue-300`
- A área de drop no estado normal (`bg-slate-50 border-slate-200`) permanece **inalterada** — o border-slate-200 garante o contorno visual da coluna em repouso.

### `components/kanban/LicitacaoCard.tsx`

**Card root (linha 38):**

Substituir o className estático `rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-xs` por um className dinâmico baseado na faixa de classificação. Adicionar uma nova constante `FAIXA_CARD_BG` separada da constante `FAIXA_COLORS` existente (que controla as cores dos **badges** — não alterar).

Nova constante a adicionar:
```ts
const FAIXA_CARD_BG: Record<string, string> = {
  'A+': 'bg-green-50 border-green-200',
  A:   'bg-emerald-50 border-emerald-200',
  B:   'bg-yellow-50 border-yellow-200',
  C:   'bg-orange-50 border-orange-200',
  D:   'bg-red-50 border-red-200',
}
```

Classes base do card (sem bg/border): `rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-xs`

**Importante:** `bg-white` é **removido** do className base e passa a ser controlado por `FAIXA_CARD_BG` (e pelo fallback `bg-white border-slate-200`). Não deixar `bg-white` no className base — se presente, anula os fundos coloridos por faixa.

Aplicação: `${FAIXA_CARD_BG[faixa ?? ''] ?? 'bg-white border-slate-200'}`

**Barra de score (linha 100):**
- Trocar `bg-slate-500` → `bg-[#1D4ED8]`

### `components/kanban/MetricsCardsRow.tsx`

- Cada card de métrica: adicionar `border-t-2 border-t-[#1D4ED8]` às classes existentes

### `components/kanban/FilterBar.tsx`

- Container `<div>`: trocar `bg-white` → `bg-slate-50`

### `components/kanban/MoveKanbanModal.tsx`

**Escopo:** aplicar acento azul nos elementos de foco e hover para consistência com o restante do redesign.

- `<select>` (linha 77): trocar `focus:ring-slate-400` → `focus:ring-[#1D4ED8]`
- `<textarea>` (linha 111): trocar `focus:ring-slate-400` → `focus:ring-[#1D4ED8]`
- Chips de sugestão (linha 103): trocar `hover:bg-slate-100` → `hover:bg-blue-50 hover:border-blue-200`

### `components/kanban/KanbanBoard.tsx` — DragOverlay

**Mantido sem alteração.** O overlay (`<div className="rotate-2 opacity-90 w-64">`) envolve um `LicitacaoCard`, que herdará automaticamente o novo fundo colorido por faixa. A sombra existente (`shadow-sm`) é suficiente para distinguir o card arrastado. Nenhuma mudança necessária.

### `components/kanban/CardQuickActions.tsx`

**Mantido sem alteração.** Os botões `variant="outline"` e `variant="ghost"` com cores `text-slate-400` são elementos secundários dentro do card. A consistência visual é mantida pelo contraste com o fundo colorido do card pai.

---

## O que NÃO muda

- Estrutura JSX de todos os componentes
- Constante `FAIXA_COLORS` (cores dos badges nos cards) — não confundir com a nova `FAIXA_CARD_BG`
- Lógica de drag-and-drop
- Queries, mutations e estado
- Tipos e interfaces TypeScript
- Rotas, APIs e seed data
- Testes

---

## Critério de Sucesso

- Sidebar visualmente escura (`#0F172A`) com item ativo em `#1D4ED8`
- Cabeçalhos de coluna em azul corporativo com texto branco
- Cards distinguíveis pelo fundo colorido conforme faixa (A+/A/B/C/D)
- Barra de score em azul corporativo
- Cards de métricas com borda superior azul
- Foco/hover do modal com acento azul
- Nenhum teste quebrado
- Nenhuma funcionalidade alterada
