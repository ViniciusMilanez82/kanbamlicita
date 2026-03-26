# SP-5 Score, Valor Capturável e Parecer Executivo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Score and Parecer tabs on the licitação detail page, including a pure score calculator, two API upsert routes, expanded types, and two client-side form components.

**Architecture:** A pure function `calcularScore` in `lib/score/calculator.ts` derives suggested scores from existing `AnaliseDetalhe` and `AnaliseIaResult` data. Two new API routes (`/score` and `/parecer`) mirror the existing `/analise` upsert pattern. Two new Client Components (`ScoreTab`, `ParecerTab`) render forms and call those routes. The detail page (`page.tsx`) is updated to include `parecer` in the Prisma query, serialize both models fully, and wire the new tabs.

**Tech Stack:** Next.js App Router, Prisma 7, TypeScript, Tailwind CSS, Jest + ts-jest

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/score/calculator.ts` | Pure score suggestion function |
| Create | `__tests__/lib/score/calculator.test.ts` | TDD tests for the calculator |
| Create | `app/api/licitacoes/[id]/score/route.ts` | PUT upsert LicitacaoScore |
| Create | `app/api/licitacoes/[id]/parecer/route.ts` | PUT upsert LicitacaoParece |
| Modify | `types/licitacao-detalhe.ts` | Expand ScoreDetalhe, add ParecerDetalhe, add `parecer` to LicitacaoDetalhe |
| Modify | `app/licitacoes/[id]/page.tsx` | Add parecer include, serialize full score+parecer, wire ScoreTab/ParecerTab |
| Create | `components/licitacao/tabs/ScoreTab.tsx` | Score + valor capturável + falso negativo form |
| Create | `components/licitacao/tabs/ParecerTab.tsx` | Parecer executivo form |

---

## Task 1: TDD — Score Calculator

**Files:**
- Create: `__tests__/lib/score/calculator.test.ts`
- Create: `lib/score/calculator.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/score/calculator.test.ts`:

```ts
import { calcularScore } from '@/lib/score/calculator'
import type { AnaliseDetalhe } from '@/types/licitacao-detalhe'
import type { AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'

const analiseCompleta: AnaliseDetalhe = {
  aderenciaDiretaExiste: true,
  aderenciaDiretaNivel: 'alta',
  aderenciaAplicacaoExiste: true,
  aderenciaAplicacaoNivel: 'alta',
  contextoOcultoExiste: true,
  contextoOcultoNivel: 'alta',
  oportunidadeOcultaExiste: true,
  oportunidadeOcultaForca: 'forte',
  oportunidadeOcultaResumo: null,
  oportunidadeNoObjeto: true,
  oportunidadeNoTr: true,
  oportunidadeNosLotes: true,
  oportunidadeNosItens: true,
  oportunidadeNaPlanilha: true,
  oportunidadeNoMemorial: true,
  oportunidadeEmAnexoTecnico: true,
  portfolioAplicavel: [],
  solucoesMuliteinerAplicaveis: [],
}

const analiseIaCompleta: AnaliseIaResult = {
  aderencia: { nivel: 'alta', justificativa: '' },
  oportunidades: [],
  riscos: [],
  recomendacao: 'AVANCAR',
  resumo: '',
  confianca: 'alta',
}

describe('calcularScore', () => {
  it('caso 1: analise completa (todos alta) + analiseIa completa (alta/alta) → score correto, faixa A+', () => {
    const result = calcularScore(analiseCompleta, analiseIaCompleta)
    // cada componente = 100, score final = 100*15 + 100*25 + 100*20 + 100*15 + 100*15 + 100*10 / 100 = 100
    expect(result.scoreAderenciaDireta).toBe(100)
    expect(result.scoreAderenciaAplicacao).toBe(100)
    expect(result.scoreContextoOculto).toBe(100)
    expect(result.scoreModeloComercial).toBe(100)
    expect(result.scorePotencialEconomico).toBe(100)
    expect(result.scoreQualidadeEvidencia).toBe(100)
    expect(result.scoreFinal).toBe(100)
    expect(result.faixaClassificacao).toBe('A+')
  })

  it('caso 2: analise=null + analiseIa=null → todos componentes=0, faixa D', () => {
    const result = calcularScore(null, null)
    expect(result.scoreAderenciaDireta).toBe(0)
    expect(result.scoreAderenciaAplicacao).toBe(0)
    expect(result.scoreContextoOculto).toBe(0)
    expect(result.scoreModeloComercial).toBe(0)
    expect(result.scorePotencialEconomico).toBe(0)
    expect(result.scoreQualidadeEvidencia).toBe(0)
    expect(result.scoreFinal).toBe(0)
    expect(result.faixaClassificacao).toBe('D')
  })

  it('caso 3: analise populada (alta) + analiseIa=null → últimos 2 componentes=0', () => {
    const result = calcularScore(analiseCompleta, null)
    expect(result.scoreAderenciaDireta).toBe(100)
    expect(result.scoreAderenciaAplicacao).toBe(100)
    expect(result.scoreContextoOculto).toBe(100)
    expect(result.scoreModeloComercial).toBe(100)
    expect(result.scorePotencialEconomico).toBe(0)
    expect(result.scoreQualidadeEvidencia).toBe(0)
    // 100*15 + 100*25 + 100*20 + 100*15 + 0*15 + 0*10 = 7500 / 100 = 75
    expect(result.scoreFinal).toBe(75)
    expect(result.faixaClassificacao).toBe('A')
  })

  it('caso 4: analise=null + analiseIa populado (alta/alta) → primeiros 4 componentes=0', () => {
    const result = calcularScore(null, analiseIaCompleta)
    expect(result.scoreAderenciaDireta).toBe(0)
    expect(result.scoreAderenciaAplicacao).toBe(0)
    expect(result.scoreContextoOculto).toBe(0)
    expect(result.scoreModeloComercial).toBe(0)
    expect(result.scorePotencialEconomico).toBe(100)
    expect(result.scoreQualidadeEvidencia).toBe(100)
    // 0*15 + 0*25 + 0*20 + 0*15 + 100*15 + 100*10 = 2500 / 100 = 25
    expect(result.scoreFinal).toBe(25)
    expect(result.faixaClassificacao).toBe('D')
  })

  it('caso 5: analise completa (todos baixa) + analiseIa completo (baixa/baixa) → faixa D', () => {
    const analiseBaixa: AnaliseDetalhe = {
      ...analiseCompleta,
      aderenciaDiretaNivel: 'baixa',
      aderenciaAplicacaoNivel: 'baixa',
      contextoOcultoNivel: 'baixa',
      oportunidadeNoObjeto: false,
      oportunidadeNoTr: false,
      oportunidadeNosLotes: false,
      oportunidadeNosItens: false,
      oportunidadeNaPlanilha: false,
      oportunidadeNoMemorial: false,
      oportunidadeEmAnexoTecnico: false,
    }
    const analiseIaBaixa: AnaliseIaResult = {
      ...analiseIaCompleta,
      aderencia: { nivel: 'baixa', justificativa: '' },
      confianca: 'baixa',
    }
    const result = calcularScore(analiseBaixa, analiseIaBaixa)
    // aderencia/contexto/ia = 30; scoreModeloComercial = 0 (7 booleanos false)
    // (30*15 + 30*25 + 30*20 + 0*15 + 30*15 + 30*10) / 100 = 25.5
    expect(result.scoreFinal).toBe(25.5)
    expect(result.faixaClassificacao).toBe('D')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx jest __tests__/lib/score/calculator.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/score/calculator'`

- [ ] **Step 3: Implement the calculator**

Create `lib/score/calculator.ts`:

```ts
import type { AnaliseDetalhe } from '@/types/licitacao-detalhe'
import type { AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'

export type ScoreSugestao = {
  scoreAderenciaDireta: number
  scoreAderenciaAplicacao: number
  scoreContextoOculto: number
  scoreModeloComercial: number
  scorePotencialEconomico: number
  scoreQualidadeEvidencia: number
  scoreFinal: number
  faixaClassificacao: string
}

// Valores canônicos da analise manual: 'alta', 'média' (com acento), 'baixa', 'nenhuma'
function nivelAnalise(nivel: string): number {
  if (nivel === 'alta') return 100
  if (nivel === 'média') return 60
  if (nivel === 'baixa') return 30
  return 0
}

// Valores canônicos da IA: 'alta', 'media' (sem acento), 'baixa', 'nenhuma'
function nivelIa(nivel: string): number {
  if (nivel === 'alta') return 100
  if (nivel === 'media') return 60
  if (nivel === 'baixa') return 30
  return 0
}

function faixa(score: number): string {
  if (score >= 85) return 'A+'
  if (score >= 70) return 'A'
  if (score >= 55) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}

export function calcularScore(
  analise: AnaliseDetalhe,
  analiseIaResult: AnaliseIaResult | null
): ScoreSugestao {
  const scoreAderenciaDireta =
    analise && analise.aderenciaDiretaExiste ? nivelAnalise(analise.aderenciaDiretaNivel) : 0

  const scoreAderenciaAplicacao =
    analise && analise.aderenciaAplicacaoExiste ? nivelAnalise(analise.aderenciaAplicacaoNivel) : 0

  const scoreContextoOculto =
    analise && analise.contextoOcultoExiste ? nivelAnalise(analise.contextoOcultoNivel) : 0

  const oportunidadeFields = analise
    ? [
        analise.oportunidadeNoObjeto,
        analise.oportunidadeNoTr,
        analise.oportunidadeNosLotes,
        analise.oportunidadeNosItens,
        analise.oportunidadeNaPlanilha,
        analise.oportunidadeNoMemorial,
        analise.oportunidadeEmAnexoTecnico,
      ]
    : []
  const scoreModeloComercial = analise
    ? (oportunidadeFields.filter(Boolean).length / 7) * 100
    : 0

  const scorePotencialEconomico = analiseIaResult
    ? nivelIa(analiseIaResult.aderencia.nivel)
    : 0

  const scoreQualidadeEvidencia = analiseIaResult
    ? nivelIa(analiseIaResult.confianca)
    : 0

  const scoreFinal =
    (scoreAderenciaDireta * 15 +
      scoreAderenciaAplicacao * 25 +
      scoreContextoOculto * 20 +
      scoreModeloComercial * 15 +
      scorePotencialEconomico * 15 +
      scoreQualidadeEvidencia * 10) /
    100

  return {
    scoreAderenciaDireta,
    scoreAderenciaAplicacao,
    scoreContextoOculto,
    scoreModeloComercial,
    scorePotencialEconomico,
    scoreQualidadeEvidencia,
    scoreFinal: Math.round(scoreFinal * 100) / 100,
    faixaClassificacao: faixa(scoreFinal),
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx jest __tests__/lib/score/calculator.test.ts --no-coverage
```

Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/score/calculator.ts __tests__/lib/score/calculator.test.ts
git commit -m "feat(sp5): add score calculator with TDD"
```

---

## Task 2: Score API Route

**Files:**
- Create: `app/api/licitacoes/[id]/score/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/licitacoes/[id]/score/route.ts` (mirrors `app/api/licitacoes/[id]/analise/route.ts`):

```ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const exists = await db.licitacao.findUnique({ where: { id } })
    if (!exists) {
      return NextResponse.json({ error: 'Licitação não encontrada' }, { status: 404 })
    }

    const { id: _id, licitacaoId: _lid, criadoEm: _c, atualizadoEm: _a, ...data } = body

    const score = await db.licitacaoScore.upsert({
      where: { licitacaoId: id },
      create: { licitacaoId: id, ...data },
      update: { ...data },
    })

    return NextResponse.json({ score })
  } catch (error) {
    console.error('[PUT /api/licitacoes/[id]/score]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/licitacoes/[id]/score/route.ts
git commit -m "feat(sp5): add PUT /api/licitacoes/[id]/score route"
```

---

## Task 3: Parecer API Route

**Files:**
- Create: `app/api/licitacoes/[id]/parecer/route.ts`

> Note: The Prisma model is `licitacaoParece` (without the trailing 'r') — this is the name as defined in `schema.prisma` (`@@map("licitacao_parecer")`). Use `db.licitacaoParece`.

- [ ] **Step 1: Create the route**

Create `app/api/licitacoes/[id]/parecer/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const exists = await db.licitacao.findUnique({ where: { id } })
    if (!exists) {
      return NextResponse.json({ error: 'Licitação não encontrada' }, { status: 404 })
    }

    const { id: _id, licitacaoId: _lid, criadoEm: _c, atualizadoEm: _a, ...data } = body

    const parecer = await db.licitacaoParece.upsert({
      where: { licitacaoId: id },
      create: { licitacaoId: id, ...data },
      update: { ...data },
    })

    return NextResponse.json({ parecer })
  } catch (error) {
    console.error('[PUT /api/licitacoes/[id]/parecer]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/licitacoes/[id]/parecer/route.ts
git commit -m "feat(sp5): add PUT /api/licitacoes/[id]/parecer route"
```

---

## Task 4: Expand Types

**Files:**
- Modify: `types/licitacao-detalhe.ts`

Replace the existing `ScoreDetalhe` type and add `ParecerDetalhe`. Also add `parecer` to `LicitacaoDetalhe`.

- [ ] **Step 1: Replace ScoreDetalhe, add ParecerDetalhe, extend LicitacaoDetalhe**

In `types/licitacao-detalhe.ts`, replace:

```ts
export type ScoreDetalhe = {
  scoreFinal: number
  faixaClassificacao: string
  valorCapturavelEstimado: number | null
  falsoNegativoNivelRisco: string
} | null
```

With:

```ts
export type ScoreDetalhe = {
  scoreFinal: number
  faixaClassificacao: string
  scoreAderenciaDireta: number
  scoreAderenciaAplicacao: number
  scoreContextoOculto: number
  scoreModeloComercial: number
  scorePotencialEconomico: number
  scoreQualidadeEvidencia: number
  scoreJustificativaResumida: string | null
  valorCapturavelObrigatorioPreenchido: boolean
  valorCapturavelFoiPossivelEstimar: boolean
  valorCapturavelEstimado: number | null
  valorCapturavelFaixaMin: number | null
  valorCapturavelFaixaMax: number | null
  valorCapturavelMoeda: string
  valorCapturavelNivelConfianca: string
  valorCapturavelMetodoEstimativa: string
  valorCapturavelJustificativa: string
  valorCapturavelBaseDocumental: unknown[]
  valorCapturavelObservacao: string | null
  falsoNegativoObrigatorioPreenchido: boolean
  falsoNegativoExisteRisco: boolean
  falsoNegativoNivelRisco: string
  falsoNegativoMotivos: unknown[]
  falsoNegativoTrechosCriticos: unknown[]
  falsoNegativoResumo: string
} | null
```

After `ScoreDetalhe`, add:

```ts
export type ParecerDetalhe = {
  classificacaoFinal: string
  prioridadeComercial: string
  valeEsforcoComercial: boolean
  recomendacaoFinal: string
  resumo: string | null
  oportunidadeDireta: boolean
  oportunidadeIndireta: boolean
  oportunidadeOcultaItemLoteAnexo: boolean
  oportunidadeInexistente: boolean
  riscoFalsoPositivo: string
  riscoFalsoNegativoSoTitulo: string
} | null
```

In `LicitacaoDetalhe`, add `parecer: ParecerDetalhe` after `score: ScoreDetalhe`:

```ts
  score: ScoreDetalhe
  parecer: ParecerDetalhe
```

- [ ] **Step 2: Commit**

```bash
git add types/licitacao-detalhe.ts
git commit -m "feat(sp5): expand ScoreDetalhe, add ParecerDetalhe types"
```

---

## Task 5: Update Detail Page (Prisma + Serialization)

**Files:**
- Modify: `app/licitacoes/[id]/page.tsx`

This task only changes `getLicitacao`: adds `parecer: true` to the Prisma include and rewrites the `score` and `parecer` serialization blocks. Tab wiring happens in Task 8.

- [ ] **Step 1: Add `parecer: true` to the Prisma include**

In `getLicitacao`, the `include` object currently has `score: true`. Add `parecer: true` after it:

```ts
    include: {
      card: true,
      movimentacoes: { orderBy: { criadoEm: 'desc' } },
      score: true,
      parecer: true,           // ← add this line
      documentos: true,
      itens: { orderBy: { criadoEm: 'asc' } },
      analise: true,
      analisesIa: {
        orderBy: { criadoEm: 'desc' },
        take: 1,
      },
    },
```

- [ ] **Step 2: Replace the score serialization block**

Replace the existing `score: row.score ? { ... } : null,` block with the full version from the spec:

```ts
    score: row.score
      ? {
          scoreFinal: Number(row.score.scoreFinal),
          faixaClassificacao: row.score.faixaClassificacao,
          scoreAderenciaDireta: Number(row.score.scoreAderenciaDireta),
          scoreAderenciaAplicacao: Number(row.score.scoreAderenciaAplicacao),
          scoreContextoOculto: Number(row.score.scoreContextoOculto),
          scoreModeloComercial: Number(row.score.scoreModeloComercial),
          scorePotencialEconomico: Number(row.score.scorePotencialEconomico),
          scoreQualidadeEvidencia: Number(row.score.scoreQualidadeEvidencia),
          scoreJustificativaResumida: row.score.scoreJustificativaResumida,
          valorCapturavelObrigatorioPreenchido: row.score.valorCapturavelObrigatorioPreenchido,
          valorCapturavelFoiPossivelEstimar: row.score.valorCapturavelFoiPossivelEstimar,
          valorCapturavelEstimado: row.score.valorCapturavelEstimado
            ? Number(row.score.valorCapturavelEstimado)
            : null,
          valorCapturavelFaixaMin: row.score.valorCapturavelFaixaMin
            ? Number(row.score.valorCapturavelFaixaMin)
            : null,
          valorCapturavelFaixaMax: row.score.valorCapturavelFaixaMax
            ? Number(row.score.valorCapturavelFaixaMax)
            : null,
          valorCapturavelMoeda: row.score.valorCapturavelMoeda,
          valorCapturavelNivelConfianca: row.score.valorCapturavelNivelConfianca,
          valorCapturavelMetodoEstimativa: row.score.valorCapturavelMetodoEstimativa,
          valorCapturavelJustificativa: row.score.valorCapturavelJustificativa,
          valorCapturavelBaseDocumental: row.score.valorCapturavelBaseDocumental as unknown[],
          valorCapturavelObservacao: row.score.valorCapturavelObservacao,
          falsoNegativoObrigatorioPreenchido: row.score.falsoNegativoObrigatorioPreenchido,
          falsoNegativoExisteRisco: row.score.falsoNegativoExisteRisco,
          falsoNegativoNivelRisco: row.score.falsoNegativoNivelRisco,
          falsoNegativoMotivos: row.score.falsoNegativoMotivos as unknown[],
          falsoNegativoTrechosCriticos: row.score.falsoNegativoTrechosCriticos as unknown[],
          falsoNegativoResumo: row.score.falsoNegativoResumo,
        }
      : null,
```

- [ ] **Step 3: Add the parecer serialization block**

After the `score` block (and before `documentos`), add:

```ts
    parecer: row.parecer
      ? {
          classificacaoFinal: row.parecer.classificacaoFinal,
          prioridadeComercial: row.parecer.prioridadeComercial,
          valeEsforcoComercial: row.parecer.valeEsforcoComercial,
          recomendacaoFinal: row.parecer.recomendacaoFinal,
          resumo: row.parecer.resumo,
          oportunidadeDireta: row.parecer.oportunidadeDireta,
          oportunidadeIndireta: row.parecer.oportunidadeIndireta,
          oportunidadeOcultaItemLoteAnexo: row.parecer.oportunidadeOcultaItemLoteAnexo,
          oportunidadeInexistente: row.parecer.oportunidadeInexistente,
          riscoFalsoPositivo: row.parecer.riscoFalsoPositivo,
          riscoFalsoNegativoSoTitulo: row.parecer.riscoFalsoNegativoSoTitulo,
        }
      : null,
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/licitacoes/[id]/page.tsx
git commit -m "feat(sp5): add parecer include and full score/parecer serialization"
```

---

## Task 6: ScoreTab Component

**Files:**
- Create: `components/licitacao/tabs/ScoreTab.tsx`

Props: `licitacaoId: string`, `score: ScoreDetalhe`, `analise: AnaliseDetalhe`, `analiseIa: AnaliseIaDetalhe`

- [ ] **Step 1: Create ScoreTab**

Create `components/licitacao/tabs/ScoreTab.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { calcularScore } from '@/lib/score/calculator'
import type { ScoreDetalhe, AnaliseDetalhe, AnaliseIaDetalhe } from '@/types/licitacao-detalhe'
import type { AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'

type Props = {
  licitacaoId: string
  score: ScoreDetalhe
  analise: AnaliseDetalhe
  analiseIa: AnaliseIaDetalhe
}

const FALSO_NEGATIVO_MOTIVOS = [
  'titulo_generico',
  'objeto_amplo_demais',
  'sem_tr_publicado',
  'criterio_julgamento_ambiguo',
  'lote_misto_heterogeneo',
  'itens_sem_descricao',
  'planilha_incompleta',
  'memorial_ausente',
  'requisitos_habilitacao_restritivos',
  'prazo_curto_para_proposta',
  'historico_direcionamento',
  'exigencia_tecnica_incomum',
]

export function ScoreTab({ licitacaoId, score, analise, analiseIa }: Props) {
  const [aderenciaDireta, setAderenciaDireta] = useState(score?.scoreAderenciaDireta ?? 0)
  const [aderenciaAplicacao, setAderenciaAplicacao] = useState(score?.scoreAderenciaAplicacao ?? 0)
  const [contextoOculto, setContextoOculto] = useState(score?.scoreContextoOculto ?? 0)
  const [modeloComercial, setModeloComercial] = useState(score?.scoreModeloComercial ?? 0)
  const [potencialEconomico, setPotencialEconomico] = useState(score?.scorePotencialEconomico ?? 0)
  const [qualidadeEvidencia, setQualidadeEvidencia] = useState(score?.scoreQualidadeEvidencia ?? 0)
  const [justificativa, setJustificativa] = useState(score?.scoreJustificativaResumida ?? '')

  const [foiPossivelEstimar, setFoiPossivelEstimar] = useState(score?.valorCapturavelFoiPossivelEstimar ?? false)
  const [valorEstimado, setValorEstimado] = useState(score?.valorCapturavelEstimado?.toString() ?? '')
  const [faixaMin, setFaixaMin] = useState(score?.valorCapturavelFaixaMin?.toString() ?? '')
  const [faixaMax, setFaixaMax] = useState(score?.valorCapturavelFaixaMax?.toString() ?? '')
  const [moeda, setMoeda] = useState(score?.valorCapturavelMoeda ?? 'BRL')
  const [nivelConfianca, setNivelConfianca] = useState(score?.valorCapturavelNivelConfianca ?? 'baixo')
  const [metodoEstimativa, setMetodoEstimativa] = useState(score?.valorCapturavelMetodoEstimativa ?? 'nao_estimado')
  const [justificativaValor, setJustificativaValor] = useState(score?.valorCapturavelJustificativa ?? '')
  const [observacaoValor, setObservacaoValor] = useState(score?.valorCapturavelObservacao ?? '')

  const [existeRisco, setExisteRisco] = useState(score?.falsoNegativoExisteRisco ?? false)
  const [nivelRisco, setNivelRisco] = useState(score?.falsoNegativoNivelRisco ?? 'baixo')
  const [motivosSelecionados, setMotivosSelecionados] = useState<string[]>(
    (score?.falsoNegativoMotivos as string[]) ?? []
  )
  const [resumoFn, setResumoFn] = useState(score?.falsoNegativoResumo ?? '')

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const scoreFinal =
    (aderenciaDireta * 15 +
      aderenciaAplicacao * 25 +
      contextoOculto * 20 +
      modeloComercial * 15 +
      potencialEconomico * 15 +
      qualidadeEvidencia * 10) /
    100

  function faixa(s: number) {
    if (s >= 85) return 'A+'
    if (s >= 70) return 'A'
    if (s >= 55) return 'B'
    if (s >= 40) return 'C'
    return 'D'
  }

  function handleSugerir() {
    const iaResult =
      analiseIa?.status === 'CONCLUIDO'
        ? (analiseIa.resultadoJson as AnaliseIaResult)
        : null
    const sugestao = calcularScore(analise, iaResult)
    setAderenciaDireta(sugestao.scoreAderenciaDireta)
    setAderenciaAplicacao(sugestao.scoreAderenciaAplicacao)
    setContextoOculto(sugestao.scoreContextoOculto)
    setModeloComercial(sugestao.scoreModeloComercial)
    setPotencialEconomico(sugestao.scorePotencialEconomico)
    setQualidadeEvidencia(sugestao.scoreQualidadeEvidencia)
  }

  async function handleSalvar() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/licitacoes/${licitacaoId}/score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scoreAderenciaDireta: aderenciaDireta,
          scoreAderenciaAplicacao: aderenciaAplicacao,
          scoreContextoOculto: contextoOculto,
          scoreModeloComercial: modeloComercial,
          scorePotencialEconomico: potencialEconomico,
          scoreQualidadeEvidencia: qualidadeEvidencia,
          scoreFinal: Math.round(scoreFinal * 100) / 100,
          faixaClassificacao: faixa(scoreFinal),
          scoreJustificativaResumida: justificativa || null,
          valorCapturavelObrigatorioPreenchido: true,
          valorCapturavelFoiPossivelEstimar: foiPossivelEstimar,
          valorCapturavelEstimado: foiPossivelEstimar && valorEstimado ? Number(valorEstimado) : null,
          valorCapturavelFaixaMin: faixaMin ? Number(faixaMin) : null,
          valorCapturavelFaixaMax: faixaMax ? Number(faixaMax) : null,
          valorCapturavelMoeda: moeda,
          valorCapturavelNivelConfianca: nivelConfianca,
          valorCapturavelMetodoEstimativa: metodoEstimativa,
          valorCapturavelJustificativa: justificativaValor,
          valorCapturavelBaseDocumental: [],
          valorCapturavelObservacao: observacaoValor || null,
          falsoNegativoObrigatorioPreenchido: true,
          falsoNegativoExisteRisco: existeRisco,
          falsoNegativoNivelRisco: nivelRisco,
          falsoNegativoMotivos: motivosSelecionados,
          falsoNegativoTrechosCriticos: [],
          falsoNegativoResumo: resumoFn,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setMsg('Score salvo com sucesso.')
    } catch {
      setMsg('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function toggleMotivo(motivo: string) {
    setMotivosSelecionados((prev) =>
      prev.includes(motivo) ? prev.filter((m) => m !== motivo) : [...prev, motivo]
    )
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      {/* Bloco 1 — Score por componentes */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Score por Componentes</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Aderência Direta (×15)', value: aderenciaDireta, set: setAderenciaDireta },
            { label: 'Aderência Aplicação (×25)', value: aderenciaAplicacao, set: setAderenciaAplicacao },
            { label: 'Contexto Oculto (×20)', value: contextoOculto, set: setContextoOculto },
            { label: 'Modelo Comercial (×15)', value: modeloComercial, set: setModeloComercial },
            { label: 'Potencial Econômico IA (×15)', value: potencialEconomico, set: setPotencialEconomico },
            { label: 'Qualidade Evidência IA (×10)', value: qualidadeEvidencia, set: setQualidadeEvidencia },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">{label}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={value}
                onChange={(e) => set(Number(e.target.value))}
                className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
              />
            </label>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            Score final: <strong>{Math.round(scoreFinal * 100) / 100}</strong> — Faixa: <strong>{faixa(scoreFinal)}</strong>
          </span>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Justificativa resumida</span>
          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={2}
            className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
          />
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleSugerir}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100"
          >
            Sugerir
          </button>
          <button
            onClick={handleSalvar}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
        {msg && <p className="text-xs text-slate-500">{msg}</p>}
      </section>

      {/* Bloco 2 — Valor capturável */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Valor Capturável</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={foiPossivelEstimar}
            onChange={(e) => setFoiPossivelEstimar(e.target.checked)}
          />
          Foi possível estimar?
        </label>
        {foiPossivelEstimar && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Valor estimado</span>
            <input
              type="number"
              value={valorEstimado}
              onChange={(e) => setValorEstimado(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
        )}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Faixa mín.</span>
            <input
              type="number"
              value={faixaMin}
              onChange={(e) => setFaixaMin(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Faixa máx.</span>
            <input
              type="number"
              value={faixaMax}
              onChange={(e) => setFaixaMax(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Moeda</span>
            <select
              value={moeda}
              onChange={(e) => setMoeda(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm"
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Nível confiança</span>
            <select
              value={nivelConfianca}
              onChange={(e) => setNivelConfianca(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm"
            >
              <option value="alto">Alto</option>
              <option value="medio">Médio</option>
              <option value="baixo">Baixo</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Método</span>
            <select
              value={metodoEstimativa}
              onChange={(e) => setMetodoEstimativa(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm"
            >
              <option value="por_item_planilhado">Por item planilhado</option>
              <option value="por_quantitativo_x_preco_referencia">Por quantitativo × preço ref.</option>
              <option value="por_lote_relacionado">Por lote relacionado</option>
              <option value="por_inferencia_de_escopo">Por inferência de escopo</option>
              <option value="nao_estimado">Não estimado</option>
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Justificativa</span>
          <textarea
            value={justificativaValor}
            onChange={(e) => setJustificativaValor(e.target.value)}
            rows={2}
            className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Observação</span>
          <textarea
            value={observacaoValor}
            onChange={(e) => setObservacaoValor(e.target.value)}
            rows={2}
            className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
          />
        </label>
      </section>

      {/* Bloco 3 — Falso negativo */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Falso Negativo</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={existeRisco}
            onChange={(e) => setExisteRisco(e.target.checked)}
          />
          Existe risco de falso negativo?
        </label>
        {existeRisco && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Nível do risco</span>
            <select
              value={nivelRisco}
              onChange={(e) => setNivelRisco(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm w-48"
            >
              <option value="alto">Alto</option>
              <option value="medio">Médio</option>
              <option value="baixo">Baixo</option>
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          {FALSO_NEGATIVO_MOTIVOS.map((motivo) => (
            <label key={motivo} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={motivosSelecionados.includes(motivo)}
                onChange={() => toggleMotivo(motivo)}
              />
              {motivo.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Resumo</span>
          <textarea
            value={resumoFn}
            onChange={(e) => setResumoFn(e.target.value)}
            rows={2}
            className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
          />
        </label>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/licitacao/tabs/ScoreTab.tsx
git commit -m "feat(sp5): add ScoreTab component"
```

---

## Task 7: ParecerTab Component

**Files:**
- Create: `components/licitacao/tabs/ParecerTab.tsx`

Props: `licitacaoId: string`, `parecer: ParecerDetalhe`, `score: ScoreDetalhe`

- [ ] **Step 1: Create ParecerTab**

Create `components/licitacao/tabs/ParecerTab.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { ParecerDetalhe, ScoreDetalhe } from '@/types/licitacao-detalhe'

type Props = {
  licitacaoId: string
  parecer: ParecerDetalhe
  score: ScoreDetalhe
}

export function ParecerTab({ licitacaoId, parecer, score }: Props) {
  const [classificacaoFinal, setClassificacaoFinal] = useState(
    parecer?.classificacaoFinal ?? score?.faixaClassificacao ?? 'D'
  )
  const [prioridadeComercial, setPrioridadeComercial] = useState(
    parecer?.prioridadeComercial ?? 'baixa'
  )
  const [valeEsforco, setValeEsforco] = useState(parecer?.valeEsforcoComercial ?? false)
  const [recomendacao, setRecomendacao] = useState(parecer?.recomendacaoFinal ?? 'DESCARTAR')
  const [oportunidadeDireta, setOportunidadeDireta] = useState(parecer?.oportunidadeDireta ?? false)
  const [oportunidadeIndireta, setOportunidadeIndireta] = useState(parecer?.oportunidadeIndireta ?? false)
  const [oportunidadeOculta, setOportunidadeOculta] = useState(parecer?.oportunidadeOcultaItemLoteAnexo ?? false)
  const [oportunidadeInexistente, setOportunidadeInexistente] = useState(parecer?.oportunidadeInexistente ?? true)
  const [riscoFalsoPositivo, setRiscoFalsoPositivo] = useState(parecer?.riscoFalsoPositivo ?? 'baixo')
  const [riscoFalsoNegativo, setRiscoFalsoNegativo] = useState(parecer?.riscoFalsoNegativoSoTitulo ?? 'baixo')
  const [resumo, setResumo] = useState(parecer?.resumo ?? '')

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Inexistente é mutuamente exclusivo com as outras oportunidades
  function handleOportunidade(
    tipo: 'direta' | 'indireta' | 'oculta' | 'inexistente',
    value: boolean
  ) {
    if (tipo === 'inexistente' && value) {
      setOportunidadeDireta(false)
      setOportunidadeIndireta(false)
      setOportunidadeOculta(false)
      setOportunidadeInexistente(true)
    } else {
      if (value) setOportunidadeInexistente(false)
      if (tipo === 'direta') setOportunidadeDireta(value)
      if (tipo === 'indireta') setOportunidadeIndireta(value)
      if (tipo === 'oculta') setOportunidadeOculta(value)
    }
  }

  async function handleSalvar() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/licitacoes/${licitacaoId}/parecer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classificacaoFinal,
          prioridadeComercial,
          valeEsforcoComercial: valeEsforco,
          recomendacaoFinal: recomendacao,
          resumo: resumo || null,
          oportunidadeDireta,
          oportunidadeIndireta,
          oportunidadeOcultaItemLoteAnexo: oportunidadeOculta,
          oportunidadeInexistente,
          riscoFalsoPositivo,
          riscoFalsoNegativoSoTitulo: riscoFalsoNegativo,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setMsg('Parecer salvo com sucesso.')
    } catch {
      setMsg('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Parecer Executivo</h2>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Classificação final</span>
          <select
            value={classificacaoFinal}
            onChange={(e) => setClassificacaoFinal(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            {['A+', 'A', 'B', 'C', 'D'].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Prioridade comercial</span>
          <select
            value={prioridadeComercial}
            onChange={(e) => setPrioridadeComercial(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={valeEsforco}
          onChange={(e) => setValeEsforco(e.target.checked)}
        />
        Vale esforço comercial?
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Recomendação final</span>
        <select
          value={recomendacao}
          onChange={(e) => setRecomendacao(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-sm w-48"
        >
          <option value="AVANCAR">Avançar</option>
          <option value="ACOMPANHAR">Acompanhar</option>
          <option value="DESCARTAR">Descartar</option>
        </select>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-xs text-slate-500 mb-1">Tipo de oportunidade</legend>
        {([
          ['direta', 'Direta', oportunidadeDireta],
          ['indireta', 'Indireta', oportunidadeIndireta],
          ['oculta', 'Oculta (item/lote/anexo)', oportunidadeOculta],
          ['inexistente', 'Inexistente', oportunidadeInexistente],
        ] as const).map(([tipo, label, checked]) => (
          <label key={tipo} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => handleOportunidade(tipo, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Risco falso positivo</span>
          <select
            value={riscoFalsoPositivo}
            onChange={(e) => setRiscoFalsoPositivo(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Risco FN só título</span>
          <select
            value={riscoFalsoNegativo}
            onChange={(e) => setRiscoFalsoNegativo(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Resumo</span>
        <textarea
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          rows={4}
          className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSalvar}
          disabled={saving}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        {msg && <p className="text-xs text-slate-500">{msg}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/licitacao/tabs/ParecerTab.tsx
git commit -m "feat(sp5): add ParecerTab component"
```

---

## Task 8: Wire Tabs in Page

**Files:**
- Modify: `app/licitacoes/[id]/page.tsx`

- [ ] **Step 1: Import ScoreTab and ParecerTab**

Add imports after the existing `IaTab` import:

```ts
import { ScoreTab } from '@/components/licitacao/tabs/ScoreTab'
import { ParecerTab } from '@/components/licitacao/tabs/ParecerTab'
```

- [ ] **Step 2: Replace the placeholder renders**

Replace:
```tsx
          {activeTab === 'score' && <PlaceholderTab feature="SP-5" />}
          {activeTab === 'parecer' && <PlaceholderTab feature="SP-5" />}
```

With:
```tsx
          {activeTab === 'score' && (
            <ScoreTab
              licitacaoId={id}
              score={licitacao.score}
              analise={licitacao.analise}
              analiseIa={licitacao.analiseIa}
            />
          )}
          {activeTab === 'parecer' && (
            <ParecerTab
              licitacaoId={id}
              parecer={licitacao.parecer}
              score={licitacao.score}
            />
          )}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests PASS (including the 5 calculator tests from Task 1)

- [ ] **Step 5: Commit**

```bash
git add app/licitacoes/[id]/page.tsx
git commit -m "feat(sp5): wire ScoreTab and ParecerTab into detail page"
```
