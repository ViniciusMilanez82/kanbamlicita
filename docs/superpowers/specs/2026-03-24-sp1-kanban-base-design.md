# SP-1 — Fundação + Kanban Base
## Design Spec

**Data:** 2026-03-24
**Projeto:** kanbamlicita — Sistema de Licitações Multiteiner
**Sub-projeto:** SP-1 de 6
**Status:** Aprovado

---

## Contexto

A Multiteiner precisa de um sistema para captar, triar e gerir licitações públicas. Este documento especifica o SP-1: a fundação técnica e o quadro Kanban operacional, pré-requisito de todos os sub-projetos seguintes.

O sistema completo foi decomposto em 6 sub-projetos independentes:

| # | Sub-projeto | Depende de |
|---|-------------|------------|
| **SP-1** | Fundação + Kanban Base | — |
| SP-2 | Pipeline de Captação | SP-1 |
| SP-3 | Detalhe da Licitação | SP-1 |
| SP-4 | Módulo de IA | SP-3 |
| SP-5 | Score, Valor Capturável e Falso Negativo | SP-3 + SP-4 |
| SP-6 | Painel de Prioridades + KPIs | SP-5 |

---

## Escopo do SP-1

### O que entra
- Estrutura do projeto Next.js com App Router
- Schema Prisma completo (todas as 14 tabelas listadas abaixo)
- Seed com 30 licitações fictícias realistas
- App shell: layout, sidebar, topbar
- Kanban board com 9 colunas
- Cards com todos os campos do wireframe
- Drag-and-drop entre colunas
- Validação de travas básicas (falso negativo alto bloqueia descarte)
- Registro de histórico de movimentação
- Filtros client-side
- Linha de métricas rápidas
- API routes mínimas para o Kanban funcionar

### O que fica fora
- Autenticação e controle de acesso (adicionado depois do MVP)
- Captação automática via API (SP-2)
- Página de detalhe completa (SP-3)
- Análises por IA (SP-4)
- Score calculado, valor capturável, falso negativo completo (SP-5)
- Painel de prioridades (SP-6)
- Filtro por responsável (sem auth, campo fica oculto no SP-1)

---

## Stack Técnica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Framework | Next.js 14+ (App Router) | Full-stack, RSC + API routes |
| UI | Tailwind CSS + shadcn/ui | Alinhado ao doc-mãe |
| ORM | Prisma | Migrations declarativas, type-safe, boa DX para projeto desse porte |
| Banco | PostgreSQL | Conforme doc-mãe, rodando em VPS Hostinger |
| Drag-and-drop | @dnd-kit/core | Leve, acessível, flexível |
| Estado/cache cliente | TanStack Query | Cache, invalidação e re-fetch reativos |
| Runtime | Node.js em VPS Hostinger | Sem serverless — sem restrições de tempo de execução |

**Deploy:** aplicação iniciada via PM2 na VPS. `DATABASE_URL` configurada via `.env.local` (não versionado). Migrations rodadas manualmente com `prisma migrate deploy` no primeiro deploy e a cada SP.

---

## Arquitetura

### Estrutura de diretórios

```
kanbamlicita/
├── app/
│   ├── layout.tsx                # AppShell (sidebar + topbar) — Server Component
│   ├── kanban/
│   │   └── page.tsx              # Kanban page — Server Component, busca dados via Prisma
│   ├── licitacoes/
│   │   └── page.tsx              # Placeholder (SP-3)
│   ├── fontes/
│   │   └── page.tsx              # Placeholder (SP-2)
│   └── api/
│       ├── licitacoes/
│       │   └── route.ts          # GET /api/licitacoes
│       └── kanban/
│           ├── mover/
│           │   └── route.ts      # POST /api/kanban/mover
│           └── metricas/
│               └── route.ts      # GET /api/kanban/metricas
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── SidebarNav.tsx
│   │   └── TopBar.tsx
│   ├── kanban/
│   │   ├── KanbanBoard.tsx       # "use client" — dnd-kit + TanStack Query
│   │   ├── KanbanColumn.tsx
│   │   ├── LicitacaoCard.tsx
│   │   ├── CardQuickActions.tsx
│   │   ├── MoveKanbanModal.tsx   # Modal de motivo ao mover
│   │   ├── FilterBar.tsx
│   │   └── MetricsCardsRow.tsx
│   └── ui/                       # shadcn/ui re-exports
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   └── kanban.ts                 # Regras de negócio: travas, validações, slugs de colunas
├── prisma/
│   ├── schema.prisma             # Todas as 14 tabelas
│   └── seed.ts                   # 30 licitações fictícias
└── types/
    └── licitacao.ts              # Tipos derivados do Prisma + tipos de domínio
```

### Fluxo de dados

```
app/kanban/page.tsx (Server Component)
  └── Prisma: busca cards + licitações + scores
  └── Passa como props iniciais →
        KanbanBoard (Client Component)
          ├── @dnd-kit gerencia drag-and-drop
          ├── FilterBar filtra client-side sobre dados carregados
          ├── MetricsCardsRow calcula KPIs sobre dados carregados
          └── Ao soltar card em nova coluna:
                ├── Verifica travas via lib/kanban.ts (client-side, instantâneo)
                ├── Se trava ativa → bloqueia sem chamar API
                ├── Se destino = "descartadas" → abre MoveKanbanModal para motivo
                ├── POST /api/kanban/mover (confirma travas server-side também)
                └── TanStack Query invalida cache → re-render reativo
```

---

## Slugs canônicos das colunas

Definidos como constante em `lib/kanban.ts` e reutilizados em todo o sistema:

```ts
export const KANBAN_COLUNAS = [
  'captadas_automaticamente',
  'triagem_inicial',
  'em_analise',
  'viavel_comercialmente',
  'proposta_documentacao',
  'enviadas_participando',
  'ganhamos',
  'perdemos',
  'descartadas',
] as const

export type KanbanColuna = typeof KANBAN_COLUNAS[number]
```

Esses slugs são os valores gravados em `kanban_cards.coluna_atual` e validados em `POST /api/kanban/mover`. Os nomes de exibição no board (ex: "Captadas Automaticamente") são mapeados a partir desse array.

---

## API Routes

### `GET /api/licitacoes`
Retorna licitações com joins em `kanban_cards` e `licitacao_score` para popular o board.

**Response:**
```ts
{
  licitacoes: Array<{
    id: string
    orgao: string
    numeroLicitacao: string
    modalidade: string
    objetoResumido: string
    uf: string
    municipio: string
    segmento: string | null           // para filtro e badge do card
    dataSessao: string | null
    valorGlobalEstimado: number | null
    // kanban_cards join (sempre presente — toda licitação tem card)
    card: {
      id: string
      colunaAtual: KanbanColuna
      urgente: boolean
      bloqueado: boolean              // true quando movimentação está travada por regra de negócio
      motivoBloqueio: string | null   // texto exibido em tooltip quando bloqueado = true
    }
    // licitacao_score join (null se score ainda não foi calculado)
    score: {
      scoreFinal: number
      faixaClassificacao: 'A+' | 'A' | 'B' | 'C' | 'D'
      valorCapturavelEstimado: number | null
      falsoNegativoNivelRisco: 'baixo' | 'medio' | 'alto'
    } | null
  }>
}
```

---

### `POST /api/kanban/mover`

Move um card entre colunas, valida travas server-side, grava movimentação.

> **Nota de alinhamento com doc-mãe:** o doc-mãe (seção 16.3) define a rota como `POST /api/licitacoes/:id/mover`. Esta spec usa `POST /api/kanban/mover` com `cardId` no body — decisão deliberada para SP-1, pois centraliza toda lógica de Kanban em `/api/kanban/`. Quando SP-3 criar `/api/licitacoes/:id`, a rota de mover pode ser adicionada como alias se necessário.

**Request body:**
```ts
{
  cardId: string
  colunaDestino: KanbanColuna
  motivo?: string   // obrigatório se destino = 'descartadas' ou 'perdemos'
}
```

**Responses:**
```ts
200 → { success: true }
400 → {
  error:
    | 'MOTIVO_OBRIGATORIO'       // destino exige motivo mas não foi fornecido
    | 'FALSO_NEGATIVO_BLOQUEIO'  // FN alto impede descarte
    | 'COLUNA_INVALIDA'          // destino não é um slug válido de KANBAN_COLUNAS
}
```

**Lógica de travas (em `lib/kanban.ts`, executada tanto client-side quanto server-side):**
- Se destino = `'descartadas'` ou `'perdemos'` e motivo ausente → `MOTIVO_OBRIGATORIO`
- Se destino = `'descartadas'` e `falsoNegativoNivelRisco = 'alto'` → `FALSO_NEGATIVO_BLOQUEIO`
- Se destino não está em `KANBAN_COLUNAS` → `COLUNA_INVALIDA`
- Sempre grava em `kanban_movimentacoes` com `automatico = false`

---

### `GET /api/kanban/metricas`

Retorna os 5 KPIs da linha de métricas.

**Response:**
```ts
{
  captadasHoje: number                  // cards criados hoje em qualquer coluna
  emAnalise: number                     // cards na coluna 'em_analise'
  classificacaoAouAPlus: number         // cards com faixaClassificacao IN ('A', 'A+')
  urgentes: number                      // cards com urgente = true
  riscoAltoFalsoNegativo: number        // cards com falsoNegativoNivelRisco = 'alto'
}
```

---

## Kanban Board

### Card (`LicitacaoCard`)

```
┌─────────────────────────────────────────┐
│ [Construção Civil] [A+] [URGENTE] [FN!] │  ← badges
│ Ministério da Infraestrutura            │  ← órgão
│ PE 001/2026 · Pregão Eletrônico         │  ← número + modalidade
│ Locação de módulos habitacionais...     │  ← objeto (2 linhas, truncado)
│ RS · Porto Alegre                       │  ← UF/município
│ Sessão: 15/04/2026                      │  ← data sessão
│ Global: R$ 2.4M  Capturável: R$ 380K   │  ← valores (— se null)
│ Score: 87 ──────────────────── A+       │  ← barra de score + classificação
│ [→ Mover]  [↗ Abrir]  [⚡ IA (SP-4)]   │  ← ações rápidas
└─────────────────────────────────────────┘
```

**Notas do card:**
- Badge `FN!` aparece em vermelho quando `falsoNegativoNivelRisco = 'alto'`
- Badge `URGENTE` aparece quando `urgente = true`
- Botão `[→ Mover]` para coluna "Descartadas" fica desabilitado com tooltip explicativo se `FN! = alto`
- Botão `[⚡ IA]` renderizado como desabilitado com tooltip "Disponível no SP-4" — não omitido, pois faz parte do wireframe final
- Campo `responsável` omitido no SP-1 (sem auth; retorna no SP com autenticação)
- Valores exibidos como `—` quando null

**Score ausente no card:**
- Quando `score = null`, a linha de score exibe "Score: — · Sem classificação"
- Barra de score fica vazia (0%)
- Campo "Capturável" exibe `—`

### Filtros (client-side)

Campos: busca textual (objeto + órgão) · **segmento** · classificação (A+/A/B/C/D) · UF · urgentes · risco alto FN

Filtros operam sobre os dados já carregados em memória — sem re-fetch. O filtro por segmento usa o campo `segmento` da licitação (já presente na resposta da API).

### Alerta para "Viável Comercialmente" sem score

Quando o usuário solta um card na coluna `viavel_comercialmente` e `score = null`:
- A movimentação **é permitida** (sem bloqueio no SP-1)
- Um toast de alerta é exibido: _"Este card ainda não tem score calculado. Preencha o score antes de prosseguir comercialmente."_
- O toast tem duração de 6 segundos e não bloqueia o fluxo

### Métricas rápidas

5 cards acima do board: **Captadas hoje** · **Em análise** · **A+ e A** · **Urgentes** · **Risco alto FN**

---

## Schema Prisma — 14 Tabelas

O `schema.prisma` define todas as 14 tabelas desde o início. As 4 **ativas** no SP-1 recebem seed data. As 10 **passivas** existem no schema mas ficam vazias.

### Tabelas ativas no SP-1
| Tabela | Papel no SP-1 |
|--------|---------------|
| `licitacoes` | Entidade principal — dados do card |
| `kanban_cards` | Coluna atual, urgente, bloqueado |
| `kanban_movimentacoes` | Histórico de cada movimento (inicia vazio no seed) |
| `licitacao_score` | Score + classificação + falso negativo (exibidos no card) |

### Tabelas passivas (schema criado, sem dados no SP-1)
| Tabela | Futuro SP |
|--------|-----------|
| `licitacao_documentos` | SP-3 |
| `licitacao_sinais` | SP-3 |
| `licitacao_itens` | SP-3 |
| `licitacao_analise` | SP-3 |
| `licitacao_parecer` | SP-5 |
| `licitacao_analises_ia` | SP-4 |
| `captacao_fontes` | SP-2 |
| `captacao_execucoes` | SP-2 |
| `captacao_payloads` | SP-2 |
| `licitacao_aliases_origem` | SP-2 |

---

## Seed Data

`prisma/seed.ts` gera exatamente 30 licitações. Para cada licitação são criadas:
- 1 row em `licitacoes`
- 1 row em `kanban_cards` (coluna conforme distribuição abaixo)
- 1 row em `licitacao_score` (para todas as 30 licitações, com valores variados)
- Nenhum row em `kanban_movimentacoes` (inicia vazio — histórico cresce com uso)

### Distribuição pelas colunas

| Coluna | Quantidade |
|--------|-----------|
| captadas_automaticamente | 8 |
| triagem_inicial | 6 |
| em_analise | 6 |
| viavel_comercialmente | 4 |
| proposta_documentacao | 2 |
| enviadas_participando | 1 |
| ganhamos | 1 |
| perdemos | 1 |
| descartadas | 1 |

### Cobertura do seed

- Todas as 5 faixas de score (A+, A, B, C, D) cobertas
- ~6 licitações com `urgente = true`
- ~5 licitações com `falsoNegativoNivelRisco = 'alto'`
- ~3 licitações com `score = null` para testar o alerta de "sem score"
- Segmentos: construção civil, offshore, eventos, apoio logístico
- Datas de sessão distribuídas nos próximos 60 dias
- Valores de `valorGlobalEstimado` entre R$ 200K e R$ 15M
- Valores de `valorCapturavelEstimado` entre R$ 50K e R$ 2M (null em ~3 registros)

---

## Travas Operacionais no SP-1

| Situação | Comportamento |
|----------|---------------|
| Mover para `descartadas` sem motivo | Bloqueia — `MoveKanbanModal` exige motivo |
| Mover para `perdemos` sem motivo | Bloqueia — `MoveKanbanModal` exige motivo |
| Mover para `descartadas` com FN alto | Bloqueia — alerta explicativo, botão desabilitado |
| Mover para `viavel_comercialmente` sem score | Permite — toast de alerta não bloqueante (6s) |
| Campo `bloqueado = true` no card | Movimentação via drag-and-drop desabilitada; tooltip exibe `motivoBloqueio` |

---

## Desvios em relação ao doc-mãe

| Desvio | Justificativa |
|--------|---------------|
| Rota `POST /api/kanban/mover` em vez de `POST /api/licitacoes/:id/mover` (seção 16.3) | Centraliza lógica de Kanban em `/api/kanban/`. Alias pode ser adicionado no SP-3 se necessário. |
| Campo `segmento` adicionado à tabela `licitacoes` | O doc-mãe usa segmento como conceito de UI (badge, filtro, distribuição) mas não o inclui no schema SQL. O campo é indispensável para os filtros e badges do Kanban. Proposto como emenda ao doc-mãe. |

---

## O que este SP entrega

Ao final do SP-1, a Multiteiner terá:
- Aplicação Next.js rodando na VPS Hostinger via PM2
- Schema PostgreSQL completo com dados seed (30 licitações)
- Quadro Kanban operacional com 9 colunas
- Cards com todas as informações relevantes visíveis
- Drag-and-drop funcional com travas básicas
- Histórico de movimentação gravado a cada ação
- Filtros (incluindo por segmento) e métricas rápidas funcionando
- Base sólida para todos os SPs seguintes
