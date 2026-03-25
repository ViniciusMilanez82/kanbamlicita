# Design Spec: Redesign Corporativo (Skin Swap)

**Data:** 2026-03-24
**Escopo:** Troca de cores e estilos visuais sem alteração estrutural de componentes
**Abordagem:** Opção 1 — Skin Swap

---

## Objetivo

Transformar o visual atual (branco/slate neutro) em um design corporativo profissional com sidebar escura e acento azul corporativo, mantendo toda a funcionalidade intacta.

---

## Paleta de Cores

| Token | Valor | Uso |
|-------|-------|-----|
| `accent-primary` | `#1D4ED8` | Itens ativos, cabeçalhos de coluna, borda métricas |
| `sidebar-bg` | `#0F172A` | Fundo da sidebar |
| `sidebar-active` | `#1D4ED8` | Item de navegação ativo |
| `sidebar-inactive` | `slate-400` | Texto de itens inativos |
| `sidebar-hover` | `slate-800` | Hover nos itens |

---

## Arquivos Alterados

### `components/layout/SidebarNav.tsx`
- `<aside>`: `bg-[#0F172A]` (remover `bg-white`, remover `border-r`)
- Título: `text-white`
- Item ativo: `bg-[#1D4ED8] text-white`
- Item inativo: `text-slate-400 hover:bg-slate-800 hover:text-white`
- Borda do header interno: `border-slate-700`

### `components/layout/AppShell.tsx`
- Sem alteração necessária (fundo `bg-slate-50` já adequado)

### `components/kanban/KanbanColumn.tsx`
- Cabeçalho: `bg-[#1D4ED8] text-white border-[#1D4ED8]`
- Badge de contagem: `bg-blue-900 text-blue-100`
- Área de drop: manter `bg-slate-50`, `isOver` → `bg-blue-50 border-blue-300`

### `components/kanban/LicitacaoCard.tsx`
- Fundo por faixa de classificação:
  - `A+`: `bg-green-50 border-green-200`
  - `A`: `bg-emerald-50 border-emerald-200`
  - `B`: `bg-yellow-50 border-yellow-200`
  - `C`: `bg-orange-50 border-orange-200`
  - `D`: `bg-red-50 border-red-200`
  - Sem faixa: `bg-white border-slate-200`
- Barra de score: `bg-[#1D4ED8]` ao invés de `bg-slate-500`

### `components/kanban/MetricsCardsRow.tsx`
- Cada card: adicionar `border-t-2 border-t-[#1D4ED8]`
- Fundo da row: manter `bg-white`

### `components/kanban/FilterBar.tsx`
- Fundo: `bg-slate-50` ao invés de `bg-white`

---

## O que NÃO muda

- Estrutura JSX de todos os componentes
- Lógica de drag-and-drop
- Queries e mutations
- Tipos e interfaces
- Rotas e APIs

---

## Critério de Sucesso

- Sidebar visualmente escura com item ativo em azul
- Cards distinguíveis visualmente por faixa de classificação
- Cabeçalhos de coluna em azul corporativo
- Nenhum teste quebrado
- Nenhuma funcionalidade alterada
