# SP-8: Itens Campos Ocultos + Responsável Kanban — Design Spec

## Objetivo

Dois melhorias independentes na mesma sprint:

1. **SP-8a:** Exibir `tipoAderencia` e `motivo` na aba Itens/Lotes
2. **SP-8b:** Implementar atribuição de responsável no card kanban (campo já existe no schema)

---

## SP-8a — Itens: campos tipoAderencia e motivo

### Contexto

`LicitacaoItem` já tem os campos `tipoAderencia` e `motivo` no banco. A `ItensTab` não os exibe.

### Mudanças

**`types/licitacao-detalhe.ts`** — adicionar ao tipo `ItemDetalhe`:
```ts
tipoAderencia: string | null
motivo: string | null
```

**`components/licitacao/tabs/ItensTab.tsx`** — adicionar duas colunas após "Aderência":

| Coluna | Campo | Renderização |
|--------|-------|-------------|
| Tipo Ader. | `tipoAderencia` | Badge: `direta`=azul, `aplicacao`=verde, `contexto_oculto`=amarelo, `nenhuma`=cinza |
| Motivo | `motivo` | Texto truncado (40 chars) com `title` tooltip para texto completo |

### Sem mudança de schema ou API

Os campos já existem no schema e já são retornados na query existente de `itens`.

---

## SP-8b — Responsável kanban

### Contexto

`KanbanCard` já tem `responsavelId: String?` no schema Prisma, mas sem relação declarada com `User` e sem nenhuma UI.

**Importante:** O campo `name` no model `User` segue o nome original do NextAuth (`name`, não `nome`). Todos os tipos e queries devem usar `name`.

### Schema

Adicionar relação em `KanbanCard`:

```prisma
responsavel   User?   @relation("KanbanCardResponsavel", fields: [responsavelId], references: [id])
```

Adicionar lado inverso em `User`:

```prisma
kanbanCards   KanbanCard[]  @relation("KanbanCardResponsavel")
```

Nova migration: `add_kanbancard_responsavel_relation`

### Tipos

**`types/licitacao.ts`** — em `CardInfo`, adicionar:

```ts
responsavel: { id: string; name: string } | null
```

**`components/kanban/FilterBar.tsx`** — em `FiltrosKanban` (definido e exportado neste arquivo), adicionar:

```ts
responsavelId: string   // '' = todos
```

### Query kanban

Na query do kanban (onde `LicitacaoComCard[]` é carregado), incluir:

```ts
card: {
  include: {
    responsavel: { select: { id: true, name: true } }
  }
}
```

### LicitacaoCard — UI

**Arquivo:** `components/kanban/LicitacaoCard.tsx`

Adicionar linha de responsável no rodapé do card (abaixo das quick actions):

```
[ Inicial ] Nome do responsável   (ao clicar → dropdown inline)
— Sem responsável                 (ao clicar → dropdown inline)
```

**Comportamento do dropdown inline:**
- Click na linha abre um `<select>` HTML simples (ou `<Popover>` com lista) com usuários ativos
- Lista de usuários: busca via `GET /api/usuarios-ativos` (endpoint público autenticado, sem restrição de role — ver seção API)
- Seleção → `PATCH /api/kanban/cards/[id]` com `{ responsavelId: string | null }`
- Atualização otimista no estado local; em caso de erro, rollback para valor anterior
- Opção "— Sem responsável" para remover atribuição (`responsavelId: null`)

### FilterBar

**Arquivo:** `components/kanban/FilterBar.tsx`

**`Props`** — adicionar:
```ts
usuariosAtivos: { id: string; name: string }[]
```

**Renderização** — adicionar select "Responsável":
```ts
<select value={filtros.responsavelId} onChange={...}>
  <option value="">Todos</option>
  {usuariosAtivos.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
</select>
```

**`KanbanBoard`** — buscar `usuariosAtivos` via `GET /api/usuarios-ativos` na carga inicial e passar para `FilterBar`.

**Filtro client-side** — aplicar junto com os outros filtros existentes:
```ts
if (filtros.responsavelId) {
  cards = cards.filter(l => l.card.responsavel?.id === filtros.responsavelId)
}
```

### APIs

**`GET /api/usuarios-ativos`** (nova)
- Auth: session obrigatória (qualquer role)
- Retorna: `{ usuarios: { id: string; name: string }[] }` — apenas usuários com `ativo: true`
- Sem dados sensíveis (só id e name)

**`PATCH /api/kanban/cards/[id]`** (nova)
- Auth: session obrigatória (qualquer role)
- Body: `{ responsavelId: string | null }`
- Retorna: card atualizado com `responsavel` incluído
- Valida que `responsavelId` (se não null) pertence a um usuário ativo

### Testes

- `PATCH /api/kanban/cards/[id]` com responsavelId válido → persiste relação
- `PATCH /api/kanban/cards/[id]` com `null` → remove responsável
- `PATCH /api/kanban/cards/[id]` com responsavelId de usuário inativo → 400
- `GET /api/usuarios-ativos` retorna apenas usuários com `ativo: true`
- `GET /api/usuarios-ativos` sem session → 401
- `LicitacaoCard` sem responsável → renderiza "Sem responsável"
- `LicitacaoCard` com responsável → renderiza `name` do usuário

## Fora do escopo

- Notificações ao responsável atribuído
- Histórico de atribuições
- Múltiplos responsáveis por card
