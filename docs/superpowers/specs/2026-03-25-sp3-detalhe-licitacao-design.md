# SP-3 — Detalhe da Licitação
## Design Spec

**Data:** 2026-03-25
**Sub-projeto:** SP-3 de 6
**Depende de:** SP-1 (concluído)
**Status:** Aprovado

---

## Objetivo

Criar a página de detalhe `/licitacoes/[id]` com cabeçalho completo da licitação, navegação por abas e formulário editável de análise. Pré-requisito para SP-4 (IA) e SP-5 (Score).

---

## Abordagem

Server Component page + ilha de formulário client. A página busca todos os dados via Prisma no servidor (igual ao padrão de `/kanban/page.tsx`). Navegação entre abas via `searchParams.tab`. Apenas o formulário de análise e o botão "Mover Kanban" são Client Components.

---

## Rota e Arquivos

### Nova rota
`app/licitacoes/[id]/page.tsx` — Server Component

### Componentes novos
| Arquivo | Tipo | Responsabilidade |
|---------|------|-----------------|
| `app/licitacoes/[id]/page.tsx` | Server | Fetch Prisma + composição da página |
| `components/licitacao/LicitacaoHeader.tsx` | Client | Cabeçalho + botão Mover Kanban |
| `components/licitacao/DetailTabs.tsx` | Server | Barra de abas com links |
| `components/licitacao/tabs/ResumoTab.tsx` | Server | Aba Resumo |
| `components/licitacao/tabs/DocumentosTab.tsx` | Server | Aba Documentos |
| `components/licitacao/tabs/ItensTab.tsx` | Server | Aba Itens/Lotes |
| `components/licitacao/tabs/AnaliseForm.tsx` | Client | Aba Análise (formulário editável) |
| `components/licitacao/tabs/HistoricoTab.tsx` | Server | Aba Histórico |
| `app/api/licitacoes/[id]/analise/route.ts` | API | PUT upsert LicitacaoAnalise |

### Componentes reutilizados
- `MoveKanbanModal` — já implementado, reutilizado no LicitacaoHeader
- `TopBar` — já implementado
- shadcn/ui: `Badge`, `Button`, `Card`

---

## Data Fetching

`app/licitacoes/[id]/page.tsx` busca com Prisma:

```ts
prisma.licitacao.findUniqueOrThrow({
  where: { id },
  include: {
    card: true,
    movimentacoes: { orderBy: { criadoEm: 'desc' } },
    score: true,
    documentos: true,
    itens: { orderBy: { criadoEm: 'asc' } },
    analise: true,
    parecer: true,
  },
})
```

Retorna 404 se `id` não existir (Next.js `notFound()`).

**Serialização de Decimal:** Seguindo o padrão de `/kanban/page.tsx`, todos os campos `Prisma.Decimal` devem ser convertidos para `Number` antes de passar como props para Client Components (`LicitacaoHeader`, `AnaliseForm`). Campos afetados: `valorGlobalEstimado` (Licitacao), `scoreFinal`/`valorCapturavelEstimado` (LicitacaoScore), `quantitativo`/`valorEstimadoItem` (LicitacaoItem[]). Usar `Number(field ?? 0)` ou `field ? Number(field) : null` conforme o campo seja obrigatório ou opcional.

---

## LicitacaoHeader

Client Component (necessário para `MoveKanbanModal` com estado).

**Layout:**
```
[Órgão — texto grande]                    [Badge coluna kanban]  [Badge faixa score]
Nº · Modalidade · UF · Município
Objeto resumido (line-clamp-2)
Valor Global: R$ X   |   Sessão: DD/MM/AAAA   |   [Badge URGENTE se card.urgente]

[Botão: Mover Kanban]   [Link: ↗ Abrir Origem]
```

- Badge coluna kanban: usa labels do `KANBAN_COLUNA_LABELS` existente
- Badge faixa: usa `FAIXA_COLORS` existente
- "Abrir Origem": `licitacao.linkOrigem` — se nulo, botão desabilitado
- "Mover Kanban": abre `MoveKanbanModal`, ao confirmar chama `PUT /api/kanban/mover` já existente e faz `router.refresh()` para atualizar o Server Component

---

## DetailTabs

Server Component — barra de abas renderizada como links:

```
[Resumo] [Documentos] [Itens/Lotes] [Análise] [Histórico] [IA SP-4] [Score SP-5] [Parecer SP-5]
```

- Tab ativa: borda inferior `#1D4ED8` + texto azul (detectada via `searchParams.tab`)
- Tabs SP-4/SP-5: texto `slate-400`, badge cinza "SP-4"/"SP-5", clicável mas renderiza placeholder
- Tab padrão (sem `?tab=`): `resumo`

---

## Aba Resumo

Server Component. Dois blocos em grid 2 colunas:

**Bloco Dados Principais:**
- Órgão, Número Licitação, Número Processo
- Modalidade, Tipo Disputa, Critério Julgamento
- Segmento, Data Publicação, Data Sessão
- UF, Município, Região
- Valor Global Estimado
- Status Pipeline
- Flags estruturais (read-only): `possuiLotes`, `possuiItens`, `possuiPlanilhaOrcamentaria`, `possuiQuantitativos`, `possuiPrecosUnitarios` — exibidos como badges sim/não neste bloco, **não** na seção Natureza do Objeto

**Bloco Natureza do Objeto:**
Checkboxes read-only para cada boolean da Licitacao:
`envolveLocacao`, `envolveFornecimento`, `envolveServico`, `envolveObra`, `envolveInstalacao`, `envolveMontagem`, `envolveDesmontagem`, `envolveTransporte`, `envolveMobilizacao`, `envolveDesmobilizacao`, `envolveManutencao`

**Abaixo dos blocos:**
- Objeto Resumido (label + texto)
- Resumo Natureza (label + texto, se preenchido)

---

## Aba Documentos

Server Component. Tabela com 8 linhas fixas (uma por tipo de documento do `LicitacaoDocumento`):

| Documento | Status |
|-----------|--------|
| Edital | ✅ Presente / ⚫ Ausente |
| Termo de Referência | ... |
| Projeto Básico | ... |
| Memorial Descritivo | ... |
| Anexos Técnicos | ... |
| Planilha Orçamentária | ... |
| Cronograma | ... |
| Minuta Contratual | ... |

Se `licitacao.documentos` for null: exibir empty state "Documentos não analisados".

Exibe `lacunasDocumentais` como texto abaixo da tabela se preenchido.

---

## Aba Itens/Lotes

Server Component. Tabela de `LicitacaoItem[]`:

| Tipo | ID | Descrição | Qtd | Unidade | Aderência | Prioridade | Valor Est. |
|------|----|-----------|-----|---------|-----------|------------|------------|

- Aderência: badge colorido (alta=verde, média=amarelo, baixa=slate, nenhuma=cinza)
- Prioridade: badge (alta=vermelho, média=amarelo, baixa=slate)
- Valor: `formatCurrency` (helper já existente em `LicitacaoCard.tsx`)
- Se vazio: empty state "Nenhum item ou lote registrado"

---

## Aba Análise (Client Component)

Formulário editável de `LicitacaoAnalise`. Estado local inicializado com dados do servidor.

**Bloco 1 — Aderência (3 linhas):**
Para cada: Aderência Direta, Aderência por Aplicação, Contexto Oculto:
- Checkbox "Existe" + Select nível (nenhuma / baixa / média / alta)

**Bloco 2 — Oportunidade Oculta:**
- Checkbox "Existe oportunidade oculta"
- Select força (nenhuma / fraca / moderada / forte)
- Textarea "Resumo da oportunidade oculta"

**Bloco 3 — Onde está a oportunidade:**
Checkboxes para: `oportunidadeNoObjeto`, `oportunidadeNoTr`, `oportunidadeNosLotes`, `oportunidadeNosItens`, `oportunidadeNaPlanilha`, `oportunidadeNoMemorial`, `oportunidadeEmAnexoTecnico`

**Bloco 4 — Portfólio e soluções:**
- Textarea "Portfólio aplicável" (JSON array → string para edição simples, salvo como array)
- Textarea "Soluções Multiteiner aplicáveis" (idem)

**Botão "Salvar Análise":**
- `PUT /api/licitacoes/[id]/analise` com body JSON
- Loading state durante submit
- Toast de sucesso/erro via `sonner` (já configurado)
- Após sucesso: `router.refresh()` para atualizar dados do Server Component

---

## Aba Histórico

Server Component. Timeline vertical de `KanbanMovimentacao[]` (mais recente primeiro):

Cada item:
```
● DD/MM/AAAA HH:mm
  [Coluna Origem] → [Coluna Destino]
  Motivo: "..." (se houver)
  Automático / Manual
```

Se vazio: empty state "Nenhuma movimentação registrada".

---

## Placeholders SP-4 e SP-5

Abas IA, Score e Parecer renderizam:
```
[ícone]  Disponível no SP-X
         Este módulo será implementado em uma próxima etapa.
```

---

## API — PUT /api/licitacoes/[id]/analise

```ts
// Body: Partial<LicitacaoAnalise> (campos editáveis)
// Resposta: { analise: LicitacaoAnalise }

prisma.licitacaoAnalise.upsert({
  where: { licitacaoId: id },
  create: { licitacaoId: id, ...body },
  update: { ...body },
})
```

Validação básica: verificar que `id` existe em `licitacoes` antes do upsert. Retornar 404 se não existir, 400 se body inválido.

---

## Navegação: Página de Listagem

`app/licitacoes/page.tsx` já existe. Adicionar link `href="/licitacoes/${l.id}"` nas linhas da tabela (ou no nome do órgão) para abrir o detalhe. Mudança mínima na página existente.

---

## O que NÃO entra no SP-3

- Edição dos campos principais da Licitacao (título, órgão, datas) — SP futuro
- Edição de itens/lotes inline — SP futuro
- Upload/visualização de documentos reais — SP futuro
- Análises por IA — SP-4
- Score, valor capturável, falso negativo calculado — SP-5
- Parecer executivo — SP-5
- Atribuição de responsável (sem auth) — SP futuro

---

## Critério de Sucesso

- `/licitacoes/[id]` renderiza sem erro para qualquer licitação do seed
- Header exibe dados corretos e badge de coluna kanban
- Todas as 8 abas navegáveis via URL (`?tab=resumo`, etc.)
- Formulário de análise salva e recarrega os dados
- Histórico exibe movimentações em ordem cronológica
- Build sem erros TypeScript
