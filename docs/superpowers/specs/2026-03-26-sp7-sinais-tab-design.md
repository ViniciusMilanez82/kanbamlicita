# SP-7: Aba Sinais — Design Spec

## Objetivo

Exibir, em modo somente leitura, os sinais identificados pela análise de IA para uma licitação, na nova aba "Sinais" da página de detalhe.

## Contexto

O modelo `LicitacaoSinal` já existe no banco e é populado pelo módulo de IA (SP-4). Atualmente não há nenhuma interface para visualizar esses dados.

## Arquitetura

### Posição da aba

`DetailTabs` — inserir "Sinais" após "IA" e antes de "Score":

```
resumo | documentos | itens | analise | historico | ia | sinais | score | parecer
```

### Tipo

Em `types/licitacao-detalhe.ts`, adicionar ao tipo `LicitacaoDetalhe`:

```ts
sinais: {
  id: string
  categoria: string
  subcategoria: string | null
  sinal: string
  nivel: string | null
  trecho: string | null
  fonteDocumento: string | null
  relevancia: string | null
  criadoEm: string   // ISO string — mesmo padrão dos outros campos de LicitacaoDetalhe
}[]
```

### Query Prisma + mapeamento

Em `app/licitacoes/[id]/page.tsx`:

1. Incluir no `include` do `getLicitacao()`:
```ts
sinais: { orderBy: { criadoEm: 'asc' } }
```

2. No mapeamento manual do retorno (seguindo o padrão dos outros relacionamentos), mapear:
```ts
sinais: licitacao.sinais.map((s) => ({
  ...s,
  criadoEm: s.criadoEm.toISOString(),
})),
```

3. Em `VALID_TABS` (array no topo da `page.tsx`), adicionar `'sinais'`.

### DetailTabs

Em `components/licitacao/DetailTabs.tsx`, adicionar ao array `TABS`:

```ts
{ key: 'sinais', label: 'Sinais' },
```

Posição: após `{ key: 'ia', label: 'IA' }` e antes de `{ key: 'score', label: 'Score' }`.

### Componente `SinaisTab`

**Arquivo:** `components/licitacao/tabs/SinaisTab.tsx` (plural, consistente com `ItensTab`, `DocumentosTab`)

**Comportamento:**
- Agrupa sinais por `categoria` (cabeçalho bold de seção por grupo)
- Dentro de cada grupo: tabela com colunas:
  - Subcategoria
  - Sinal (texto completo)
  - Nível (badge: `alto` = vermelho, `médio` = amarelo, `baixo` = slate, outros = cinza)
  - Relevância (badge: mesma lógica ou slate genérico)
  - Trecho (truncado a ~60 chars, `title` com texto completo)
  - Fonte Doc (texto simples)
- Empty state quando `sinais.length === 0`: "Nenhum sinal identificado."
- Read-only, sem actions

## Fluxo de dados

```
getLicitacao() → inclui sinais[]
  ↓
page.tsx → passa sinais para SinaisTab
  ↓
SinaisTab → agrupa por categoria → renderiza tabela
```

## Estilo

- Segue padrão das outras abas: `text-xs`, `border-slate-200`, sem padding extra
- Badges de nível usam mesma paleta do ScoreTab (vermelho/amarelo/slate)

## Testes

- `SinaisTab` com `sinais = []` renderiza empty state
- `SinaisTab` com sinais de 2 categorias renderiza 2 cabeçalhos de seção
- Badge de nível aplica cor correta para cada valor

## Fora do escopo

- Criação ou edição de sinais (read-only)
- Filtro ou busca dentro da aba
