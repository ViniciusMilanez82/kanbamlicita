# SP-4 — Módulo de IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar análise de licitações por LLM (Anthropic ou OpenAI), com processamento assíncrono e exibição dos resultados na aba "IA" da página de detalhe.

**Architecture:** POST `/api/licitacoes/[id]/analise-ia` cria registro `EM_PROCESSAMENTO` e dispara `processAnalise` em fire-and-forget. A função chama o LLM via provider abstrato, parseia o JSON de saída e atualiza o registro para `CONCLUIDO` ou `ERRO`. O Client Component `IaTab` faz auto-refresh a cada 3s enquanto o status for `EM_PROCESSAMENTO`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, `@anthropic-ai/sdk`, `openai`, TypeScript, Jest (testes com MockProvider injetável)

---

## Verificação após cada tarefa

```bash
npx tsc --noEmit
```
Esperado: saída vazia (zero erros).

---

## Padrões do projeto — leitura obrigatória antes de implementar

- `lib/db.ts` — importar `db` (nunca criar novo PrismaClient)
- `app/api/licitacoes/[id]/analise/route.ts` — padrão de route handler com `params: Promise<{ id: string }>` e `await params`
- `app/licitacoes/[id]/page.tsx` — padrão de serialização Prisma → tipos serializados
- `types/licitacao-detalhe.ts` — tipos serializados existentes (vamos adicionar `AnaliseIaDetalhe`)
- Prisma: relação em `Licitacao` se chama **`analisesIa`** (plural, camelCase) — confirme em `prisma/schema.prisma` linha 73

---

## Spec de referência

`docs/superpowers/specs/2026-03-25-sp4-modulo-ia-design.md`

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `lib/llm/provider.ts` | Criar | Interface `LlmProvider` |
| `lib/llm/anthropic.ts` | Criar | Implementação Anthropic |
| `lib/llm/openai.ts` | Criar | Implementação OpenAI |
| `lib/llm/factory.ts` | Criar | Singleton — seleciona provider por env var |
| `lib/llm/prompts/analise-completa.ts` | Criar | System prompt + builder do user prompt + tipo `AnaliseIaResult` |
| `types/licitacao-detalhe.ts` | Modificar | Adicionar `AnaliseIaDetalhe` e campo `analiseIa` em `LicitacaoDetalhe` |
| `app/api/licitacoes/[id]/analise-ia/route.ts` | Criar | GET + POST + `processAnalise` |
| `__tests__/api/analise-ia.test.ts` | Criar | Testes de integração com MockProvider |
| `components/licitacao/tabs/IaTab.tsx` | Criar | Client Component — 4 estados visuais + auto-refresh |
| `app/licitacoes/[id]/page.tsx` | Modificar | Incluir `analisesIa` no fetch + passar para `IaTab` |

---

## Task 1: Instalar dependências e criar interface LlmProvider

**Files:**
- Create: `lib/llm/provider.ts`

- [ ] **Step 1.1: Instalar SDKs**

```bash
npm install @anthropic-ai/sdk openai
```
Esperado: `added N packages` sem erros.

- [ ] **Step 1.2: Criar `lib/llm/provider.ts`**

```ts
export interface LlmProvider {
  complete(system: string, user: string): Promise<string>
  readonly modelName: string
}
```

- [ ] **Step 1.3: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 1.4: Commit**

```bash
git add lib/llm/provider.ts package.json package-lock.json
git commit -m "feat(sp4): add LlmProvider interface and install SDKs"
```

---

## Task 2: Implementações de provider e factory

**Files:**
- Create: `lib/llm/anthropic.ts`
- Create: `lib/llm/openai.ts`
- Create: `lib/llm/factory.ts`

- [ ] **Step 2.1: Criar `lib/llm/anthropic.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk'
import type { LlmProvider } from './provider'

export class AnthropicProvider implements LlmProvider {
  private client = new Anthropic({ apiKey: process.env.LLM_API_KEY })
  readonly modelName = process.env.LLM_MODEL ?? 'claude-3-5-sonnet-20241022'

  async complete(system: string, user: string): Promise<string> {
    const msg = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const block = msg.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type from Anthropic')
    return block.text
  }
}
```

- [ ] **Step 2.2: Criar `lib/llm/openai.ts`**

```ts
import OpenAI from 'openai'
import type { LlmProvider } from './provider'

export class OpenAiProvider implements LlmProvider {
  private client = new OpenAI({ apiKey: process.env.LLM_API_KEY })
  readonly modelName = process.env.LLM_MODEL ?? 'gpt-4o'

  async complete(system: string, user: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 1024,
    })
    return res.choices[0].message.content ?? ''
  }
}
```

- [ ] **Step 2.3: Criar `lib/llm/factory.ts`**

```ts
import { AnthropicProvider } from './anthropic'
import { OpenAiProvider } from './openai'
import type { LlmProvider } from './provider'

let _provider: LlmProvider | null = null

export function getLlmProvider(): LlmProvider {
  if (_provider) return _provider
  const p = process.env.LLM_PROVIDER ?? 'anthropic'
  _provider = p === 'openai' ? new OpenAiProvider() : new AnthropicProvider()
  return _provider
}

/** Permite trocar o provider em testes */
export function setLlmProvider(provider: LlmProvider): void {
  _provider = provider
}

/** Reseta o singleton (útil em testes) */
export function resetLlmProvider(): void {
  _provider = null
}
```

- [ ] **Step 2.4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 2.5: Commit**

```bash
git add lib/llm/anthropic.ts lib/llm/openai.ts lib/llm/factory.ts
git commit -m "feat(sp4): add Anthropic/OpenAI providers and factory"
```

---

## Task 3: Prompt builder

**Files:**
- Create: `lib/llm/prompts/analise-completa.ts`

- [ ] **Step 3.1: Criar `lib/llm/prompts/analise-completa.ts`**

```ts
import type { LicitacaoDetalhe } from '@/types/licitacao-detalhe'

export const SYSTEM_PROMPT = `Você é um analista especializado da Multiteiner, empresa brasileira que fornece estruturas modulares (containers adaptados, alojamentos de obra, escritórios modulares, vestiários, refeitórios).

Analise a licitação pública abaixo e responda APENAS com JSON válido, sem markdown, sem explicações extras. O JSON deve seguir exatamente o schema fornecido.`

export type AnaliseIaResult = {
  aderencia: {
    nivel: 'alta' | 'media' | 'baixa' | 'nenhuma'
    justificativa: string
  }
  oportunidades: Array<{
    tipo: string
    descricao: string
    forca: 'forte' | 'moderada' | 'fraca'
  }>
  riscos: string[]
  recomendacao: 'AVANCAR' | 'ACOMPANHAR' | 'DESCARTAR'
  resumo: string
  confianca: 'alta' | 'media' | 'baixa'
}

export function buildUserPrompt(licitacao: LicitacaoDetalhe): string {
  const lines: string[] = [
    `## Licitação`,
    `Órgão: ${licitacao.orgao ?? '—'}`,
    `Modalidade: ${licitacao.modalidade ?? '—'}`,
    `Segmento: ${licitacao.segmento ?? '—'}`,
    `UF: ${licitacao.uf ?? '—'} — Município: ${licitacao.municipio ?? '—'}`,
    ``,
    `## Objeto`,
    licitacao.objetoResumido ?? '(não informado)',
    ``,
  ]

  if (licitacao.itens.length > 0) {
    lines.push(`## Itens / Lotes (${licitacao.itens.length})`)
    licitacao.itens.slice(0, 20).forEach((item) => {
      lines.push(
        `- [${item.tipo ?? 'item'}] ${item.descricao ?? '—'} | Qtd: ${item.quantitativo ?? '—'} ${item.unidade ?? ''}`
      )
    })
    lines.push(``)
  }

  if (licitacao.analise) {
    lines.push(`## Análise manual existente`)
    lines.push(
      `Aderência direta: ${licitacao.analise.aderenciaDiretaNivel} (existe: ${licitacao.analise.aderenciaDiretaExiste})`
    )
    lines.push(`Aderência aplicação: ${licitacao.analise.aderenciaAplicacaoNivel}`)
    lines.push(`Contexto oculto: ${licitacao.analise.contextoOcultoNivel}`)
    if (licitacao.analise.oportunidadeOcultaResumo) {
      lines.push(`Oportunidade oculta: ${licitacao.analise.oportunidadeOcultaResumo}`)
    }
    lines.push(``)
  }

  lines.push(`## Schema de resposta esperado`)
  lines.push(
    JSON.stringify(
      {
        aderencia: { nivel: 'alta|media|baixa|nenhuma', justificativa: 'string' },
        oportunidades: [{ tipo: 'string', descricao: 'string', forca: 'forte|moderada|fraca' }],
        riscos: ['string'],
        recomendacao: 'AVANCAR|ACOMPANHAR|DESCARTAR',
        resumo: 'string (2-3 frases para o executivo)',
        confianca: 'alta|media|baixa',
      },
      null,
      2
    )
  )

  return lines.join('\n')
}
```

- [ ] **Step 3.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 3.3: Commit**

```bash
git add lib/llm/prompts/analise-completa.ts
git commit -m "feat(sp4): add analise-completa prompt builder"
```

---

## Task 4: Tipos serializados

**Files:**
- Modify: `types/licitacao-detalhe.ts`

- [ ] **Step 4.1: Adicionar `AnaliseIaDetalhe` e atualizar `LicitacaoDetalhe`**

Em `types/licitacao-detalhe.ts`, fazer duas mudanças:

**Mudança 1:** Adicionar o tipo `AnaliseIaDetalhe` antes de `LicitacaoDetalhe` (após `MovimentacaoDetalhe`):

```ts
export type AnaliseIaDetalhe = {
  id: string
  status: string          // 'EM_PROCESSAMENTO' | 'CONCLUIDO' | 'ERRO'
  tipoAnalise: string
  modeloUtilizado: string | null
  promptVersao: string | null
  resultadoJson: unknown  // AnaliseIaResult quando status='CONCLUIDO'
  resumoTexto: string | null
  criadoEm: string
} | null
```

**Mudança 2:** No tipo `LicitacaoDetalhe`, após `movimentacoes: MovimentacaoDetalhe[]`, adicionar:

```ts
  analiseIa: AnaliseIaDetalhe
```

O bloco final de `LicitacaoDetalhe` deve ficar:
```ts
  // relações
  card: CardDetalhe | null
  score: ScoreDetalhe
  documentos: DocumentosDetalhe
  itens: ItemDetalhe[]
  analise: AnaliseDetalhe
  movimentacoes: MovimentacaoDetalhe[]
  analiseIa: AnaliseIaDetalhe
```

- [ ] **Step 4.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia (TypeScript irá apontar erros em `app/licitacoes/[id]/page.tsx` sobre `analiseIa` não fornecido — normal, será corrigido na Task 7).

Se o erro for APENAS sobre `analiseIa` faltando em `getLicitacao`, está ok para commit. Qualquer outro erro deve ser corrigido.

- [ ] **Step 4.3: Commit**

```bash
git add types/licitacao-detalhe.ts
git commit -m "feat(sp4): add AnaliseIaDetalhe type and analiseIa field to LicitacaoDetalhe"
```

---

## Task 5: API route e testes

**Files:**
- Create: `app/api/licitacoes/[id]/analise-ia/route.ts`
- Create: `__tests__/api/analise-ia.test.ts`

- [ ] **Step 5.1: Escrever o teste**

Criar `__tests__/api/analise-ia.test.ts`:

```ts
import { db } from '@/lib/db'
import { setLlmProvider, resetLlmProvider } from '@/lib/llm/factory'
import type { LlmProvider } from '@/lib/llm/provider'
import type { AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'

// MockProvider — não chama API real
class MockProvider implements LlmProvider {
  readonly modelName = 'mock-model'
  readonly result: AnaliseIaResult = {
    aderencia: { nivel: 'alta', justificativa: 'Testes de containers são aderentes.' },
    oportunidades: [{ tipo: 'estrutura', descricao: 'Alojamento modular', forca: 'forte' }],
    riscos: ['Prazo curto'],
    recomendacao: 'AVANCAR',
    resumo: 'Licitação altamente aderente à Multiteiner.',
    confianca: 'alta',
  }

  async complete(_system: string, _user: string): Promise<string> {
    return JSON.stringify(this.result)
  }
}

class ErrorProvider implements LlmProvider {
  readonly modelName = 'error-model'
  async complete(_system: string, _user: string): Promise<string> {
    throw new Error('API unavailable')
  }
}

// Importar processAnalise após definir o mock
import { processAnalise } from '@/app/api/licitacoes/[id]/analise-ia/route'

describe('SP-4: analise-ia', () => {
  let licitacaoId: string
  let registroId: string

  beforeAll(async () => {
    const l = await db.licitacao.findFirst()
    if (!l) throw new Error('Seed não encontrado')
    licitacaoId = l.id
  })

  beforeEach(async () => {
    // Limpar análises anteriores
    await db.licitacaoAnaliseIa.deleteMany({ where: { licitacaoId } })
    setLlmProvider(new MockProvider())
  })

  afterEach(() => {
    resetLlmProvider()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('processAnalise atualiza status para CONCLUIDO com resultadoJson correto', async () => {
    const registro = await db.licitacaoAnaliseIa.create({
      data: { licitacaoId, tipoAnalise: 'analise_completa', status: 'EM_PROCESSAMENTO', promptVersao: 'v1' },
    })
    registroId = registro.id

    await processAnalise(registroId, licitacaoId)

    const updated = await db.licitacaoAnaliseIa.findUniqueOrThrow({ where: { id: registroId } })
    expect(updated.status).toBe('CONCLUIDO')
    expect(updated.modeloUtilizado).toBe('mock-model')
    expect(updated.resumoTexto).toBe('Licitação altamente aderente à Multiteiner.')
    const result = updated.resultadoJson as AnaliseIaResult
    expect(result.recomendacao).toBe('AVANCAR')
    expect(result.aderencia.nivel).toBe('alta')
  })

  it('processAnalise atualiza status para ERRO quando provider falha', async () => {
    setLlmProvider(new ErrorProvider())
    const registro = await db.licitacaoAnaliseIa.create({
      data: { licitacaoId, tipoAnalise: 'analise_completa', status: 'EM_PROCESSAMENTO', promptVersao: 'v1' },
    })

    await processAnalise(registro.id, licitacaoId)

    const updated = await db.licitacaoAnaliseIa.findUniqueOrThrow({ where: { id: registro.id } })
    expect(updated.status).toBe('ERRO')
    expect(updated.resumoTexto).toContain('API unavailable')
  })

  it('processAnalise lida com JSON malformado do LLM setando ERRO', async () => {
    class BadJsonProvider implements LlmProvider {
      readonly modelName = 'bad-json'
      async complete(): Promise<string> { return 'isso nao e json' }
    }
    setLlmProvider(new BadJsonProvider())

    const registro = await db.licitacaoAnaliseIa.create({
      data: { licitacaoId, tipoAnalise: 'analise_completa', status: 'EM_PROCESSAMENTO', promptVersao: 'v1' },
    })

    await processAnalise(registro.id, licitacaoId)

    const updated = await db.licitacaoAnaliseIa.findUniqueOrThrow({ where: { id: registro.id } })
    expect(updated.status).toBe('ERRO')
  })

  it('não cria duplicata se já há registro EM_PROCESSAMENTO', async () => {
    await db.licitacaoAnaliseIa.create({
      data: { licitacaoId, tipoAnalise: 'analise_completa', status: 'EM_PROCESSAMENTO', promptVersao: 'v1' },
    })

    // Verificar lógica de deduplicação diretamente
    const emProcessamento = await db.licitacaoAnaliseIa.findFirst({
      where: { licitacaoId, status: 'EM_PROCESSAMENTO' },
    })
    expect(emProcessamento).not.toBeNull()
  })
})
```

- [ ] **Step 5.2: Criar `app/api/licitacoes/[id]/analise-ia/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getLlmProvider } from '@/lib/llm/factory'
import { SYSTEM_PROMPT, buildUserPrompt, type AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'
import type { LicitacaoDetalhe } from '@/types/licitacao-detalhe'
import type { LlmProvider } from '@/lib/llm/provider'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const analise = await db.licitacaoAnaliseIa.findFirst({
    where: { licitacaoId: id },
    orderBy: { criadoEm: 'desc' },
  })
  return NextResponse.json({ analise })
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const licitacao = await db.licitacao.findUnique({ where: { id } })
  if (!licitacao) {
    return NextResponse.json({ error: 'Licitação não encontrada' }, { status: 404 })
  }

  const emProcessamento = await db.licitacaoAnaliseIa.findFirst({
    where: { licitacaoId: id, status: 'EM_PROCESSAMENTO' },
  })
  if (emProcessamento) {
    return NextResponse.json({ error: 'Análise já em andamento' }, { status: 409 })
  }

  const registro = await db.licitacaoAnaliseIa.create({
    data: {
      licitacaoId: id,
      tipoAnalise: 'analise_completa',
      status: 'EM_PROCESSAMENTO',
      promptVersao: 'v1',
    },
  })

  // Fire-and-forget — seguro em Node.js/pm2 (não serverless)
  void processAnalise(registro.id, id)

  return NextResponse.json({ status: 'EM_PROCESSAMENTO', id: registro.id }, { status: 202 })
}

export async function processAnalise(
  registroId: string,
  licitacaoId: string,
  provider?: LlmProvider
) {
  try {
    const row = await db.licitacao.findUniqueOrThrow({
      where: { id: licitacaoId },
      include: {
        card: true,
        itens: { orderBy: { criadoEm: 'asc' } },
        analise: true,
        documentos: true,
        score: true,
        movimentacoes: { orderBy: { criadoEm: 'desc' } },
      },
    })

    const licitacaoDetalhe = serializeForPrompt(row)
    const llm = provider ?? getLlmProvider()
    const userPrompt = buildUserPrompt(licitacaoDetalhe)
    const raw = await llm.complete(SYSTEM_PROMPT, userPrompt)

    // Remover possíveis blocos markdown do LLM
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    const result: AnaliseIaResult = JSON.parse(cleaned)

    await db.licitacaoAnaliseIa.update({
      where: { id: registroId },
      data: {
        status: 'CONCLUIDO',
        modeloUtilizado: llm.modelName,
        resultadoJson: result,
        resumoTexto: result.resumo,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    await db.licitacaoAnaliseIa
      .update({ where: { id: registroId }, data: { status: 'ERRO', resumoTexto: msg } })
      .catch(() => {})
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeForPrompt(row: any): LicitacaoDetalhe {
  return {
    ...row,
    dataPublicacao: row.dataPublicacao?.toISOString() ?? null,
    dataSessao: row.dataSessao?.toISOString() ?? null,
    valorGlobalEstimado: row.valorGlobalEstimado ? Number(row.valorGlobalEstimado) : null,
    card: row.card
      ? {
          id: row.card.id,
          colunaAtual: row.card.colunaAtual,
          urgente: row.card.urgente,
          bloqueado: row.card.bloqueado,
          motivoBloqueio: row.card.motivoBloqueio ?? null,
        }
      : null,
    score: row.score
      ? {
          scoreFinal: Number(row.score.scoreFinal),
          faixaClassificacao: row.score.faixaClassificacao,
          valorCapturavelEstimado: row.score.valorCapturavelEstimado
            ? Number(row.score.valorCapturavelEstimado)
            : null,
          falsoNegativoNivelRisco: row.score.falsoNegativoNivelRisco,
        }
      : null,
    documentos: row.documentos ?? null,
    itens: row.itens.map((item: any) => ({
      id: item.id,
      tipo: item.tipo,
      identificador: item.identificador,
      descricao: item.descricao,
      quantitativo: item.quantitativo ? Number(item.quantitativo) : null,
      unidade: item.unidade,
      aderencia: item.aderencia,
      prioridade: item.prioridade,
      valorEstimadoItem: item.valorEstimadoItem ? Number(item.valorEstimadoItem) : null,
      observacoes: item.observacoes,
    })),
    analise: row.analise ?? null,
    movimentacoes: row.movimentacoes.map((m: any) => ({
      id: m.id,
      colunaOrigem: m.colunaOrigem ?? null,
      colunaDestino: m.colunaDestino,
      motivo: m.motivo,
      automatico: m.automatico,
      criadoEm: m.criadoEm.toISOString(),
    })),
    analiseIa: null, // não necessário para o prompt
  }
}
```

- [ ] **Step 5.3: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia. Se houver erro de `processAnalise` não exportada, verificar que a função está com `export`.

- [ ] **Step 5.4: Rodar testes**

```bash
npx jest __tests__/api/analise-ia.test.ts --no-coverage
```
Esperado: 4 testes PASS.

Se os testes falharem com "Cannot find module", verificar que `processAnalise` está exportada do route file.

- [ ] **Step 5.5: Commit**

```bash
git add "app/api/licitacoes/[id]/analise-ia/route.ts" __tests__/api/analise-ia.test.ts
git commit -m "feat(sp4): add POST/GET analise-ia route with processAnalise"
```

---

## Task 6: IaTab (Client Component)

**Files:**
- Create: `components/licitacao/tabs/IaTab.tsx`

- [ ] **Step 6.1: Criar `components/licitacao/tabs/IaTab.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AnaliseIaDetalhe } from '@/types/licitacao-detalhe'
import type { AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'

type Props = {
  licitacaoId: string
  analiseIa: AnaliseIaDetalhe
}

const RECOMENDACAO_COLORS: Record<string, string> = {
  AVANCAR: 'bg-green-100 text-green-800 border-green-200',
  ACOMPANHAR: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DESCARTAR: 'bg-red-100 text-red-800 border-red-200',
}

export function IaTab({ licitacaoId, analiseIa }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Auto-refresh a cada 3s enquanto em processamento
  useEffect(() => {
    if (analiseIa?.status !== 'EM_PROCESSAMENTO') return
    const timer = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(timer)
  }, [analiseIa?.status, router])

  async function handleAnalisar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/licitacoes/${licitacaoId}/analise-ia`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json()
        toast.error(body.error ?? 'Erro ao iniciar análise')
        return
      }
      router.refresh()
    } catch {
      toast.error('Erro de rede')
    } finally {
      setLoading(false)
    }
  }

  // Estado: sem análise
  if (!analiseIa) {
    return (
      <div className="p-12 flex flex-col items-center gap-4 text-center">
        <div className="text-4xl">🤖</div>
        <p className="text-sm text-slate-600">Nenhuma análise realizada para esta licitação.</p>
        <Button
          onClick={handleAnalisar}
          disabled={loading}
          className="bg-[#1D4ED8] hover:bg-blue-700 text-white"
        >
          {loading ? 'Iniciando...' : 'Analisar com IA'}
        </Button>
      </div>
    )
  }

  // Estado: processando
  if (analiseIa.status === 'EM_PROCESSAMENTO') {
    return (
      <div className="p-12 flex flex-col items-center gap-3 text-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#1D4ED8] border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-slate-700">Analisando com IA...</p>
        <p className="text-xs text-slate-400">Isso pode levar alguns segundos.</p>
      </div>
    )
  }

  // Estado: erro
  if (analiseIa.status === 'ERRO') {
    return (
      <div className="p-12 flex flex-col items-center gap-4 text-center">
        <div className="text-4xl">❌</div>
        <p className="text-sm font-medium text-slate-700">Falha na análise</p>
        <p className="text-xs text-slate-500 max-w-md">{analiseIa.resumoTexto}</p>
        <Button onClick={handleAnalisar} disabled={loading} variant="outline">
          {loading ? 'Iniciando...' : 'Tentar novamente'}
        </Button>
      </div>
    )
  }

  // Estado: concluído
  const result = analiseIa.resultadoJson as AnaliseIaResult

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Modelo: {analiseIa.modeloUtilizado ?? '—'} · Versão: {analiseIa.promptVersao ?? '—'}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAnalisar}
          disabled={loading}
          className="h-7 text-xs"
        >
          {loading ? 'Iniciando...' : 'Re-analisar'}
        </Button>
      </div>

      {/* Resumo executivo */}
      <div className="rounded-lg border bg-blue-50 border-blue-100 p-4">
        <p className="text-sm text-slate-700">{result.resumo}</p>
      </div>

      {/* Aderência + Recomendação + Confiança */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Aderência:</span>
          <Badge className="text-xs capitalize">{result.aderencia.nivel}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Recomendação:</span>
          <Badge className={`text-xs border ${RECOMENDACAO_COLORS[result.recomendacao] ?? ''}`}>
            {result.recomendacao}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Confiança:</span>
          <Badge variant="outline" className="text-xs capitalize">
            {result.confianca}
          </Badge>
        </div>
      </div>

      {/* Justificativa */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Justificativa
        </p>
        <p className="text-sm text-slate-700">{result.aderencia.justificativa}</p>
      </div>

      {/* Oportunidades */}
      {result.oportunidades.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Oportunidades
          </p>
          <ul className="space-y-2">
            {result.oportunidades.map((op, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-slate-400 shrink-0">•</span>
                <div>
                  <span className="font-medium text-slate-700">{op.tipo}</span>
                  <span className="text-slate-500"> — {op.descricao}</span>
                  <span className="ml-2 text-xs text-slate-400 italic">({op.forca})</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Riscos */}
      {result.riscos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Riscos
          </p>
          <ul className="space-y-1">
            {result.riscos.map((r, i) => (
              <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                <span className="text-red-400 shrink-0">⚠</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 6.3: Commit**

```bash
git add components/licitacao/tabs/IaTab.tsx
git commit -m "feat(sp4): add IaTab client component with auto-refresh"
```

---

## Task 7: Atualizar página de detalhe

**Files:**
- Modify: `app/licitacoes/[id]/page.tsx`

- [ ] **Step 7.1: Atualizar imports e fetch**

Em `app/licitacoes/[id]/page.tsx`, fazer 3 mudanças:

**Mudança 1 — Adicionar import do IaTab** (junto com outros imports de tab components, linha ~8):
```ts
import { IaTab } from '@/components/licitacao/tabs/IaTab'
```

**Mudança 2 — Adicionar `analisesIa` no include do Prisma** (dentro do `db.licitacao.findUnique`, após `analise: true,`):
```ts
analisesIa: {
  orderBy: { criadoEm: 'desc' },
  take: 1,
},
```

**Mudança 3 — Serializar `analiseIa` no return de `getLicitacao`** (após `movimentacoes: row.movimentacoes.map(...)`, antes do fechamento `}`):
```ts
analiseIa: row.analisesIa[0]
  ? {
      id: row.analisesIa[0].id,
      status: row.analisesIa[0].status,
      tipoAnalise: row.analisesIa[0].tipoAnalise,
      modeloUtilizado: row.analisesIa[0].modeloUtilizado,
      promptVersao: row.analisesIa[0].promptVersao,
      resultadoJson: row.analisesIa[0].resultadoJson,
      resumoTexto: row.analisesIa[0].resumoTexto,
      criadoEm: row.analisesIa[0].criadoEm.toISOString(),
    }
  : null,
```

**Mudança 4 — Substituir o PlaceholderTab da aba "ia"** (linha ~151):

Trocar:
```tsx
{activeTab === 'ia' && <PlaceholderTab feature="SP-4" />}
```
Por:
```tsx
{activeTab === 'ia' && (
  <IaTab licitacaoId={id} analiseIa={licitacao.analiseIa} />
)}
```

- [ ] **Step 7.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia. Se houver erro sobre tipo de retorno de `getLicitacao`, verificar que `LicitacaoDetalhe` agora tem `analiseIa` (Task 4).

- [ ] **Step 7.3: Commit**

```bash
git add "app/licitacoes/[id]/page.tsx"
git commit -m "feat(sp4): wire IaTab into detail page with Prisma include"
```

---

## Task 8: Build final e verificação

- [ ] **Step 8.1: Criar `.env.local` com variáveis de exemplo** (se não existir)

```bash
# Verificar se .env.local existe
cat .env.local 2>/dev/null || echo "não existe"
```

Se não existir, criar `env.example` para documentação (não commitar chaves reais):

```bash
# .env.local — não commitar
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
LLM_MODEL=claude-3-5-sonnet-20241022
```

Verificar que `.env.local` está no `.gitignore`.

- [ ] **Step 8.2: Rodar lint**

```bash
npm run lint
```
Esperado: 0 errors. Warnings pré-existentes em test files são ok.

- [ ] **Step 8.3: Rodar build**

```bash
npm run build
```
Esperado: `✓ Compiled successfully`. As rotas devem incluir:
```
ƒ /api/licitacoes/[id]/analise-ia
ƒ /licitacoes/[id]
```

- [ ] **Step 8.4: Verificação manual** (com `LLM_API_KEY` configurada)

Com o servidor rodando (`npm run dev`):
1. Abrir `/licitacoes` → clicar em qualquer licitação
2. Clicar na aba "IA" → deve mostrar "Nenhuma análise realizada" + botão
3. Clicar "Analisar com IA" → spinner deve aparecer
4. Aguardar ~5-10 segundos → resultado deve aparecer automaticamente
5. Verificar campos: aderência, recomendação, oportunidades, riscos
6. Clicar "Re-analisar" → deve criar nova análise

Se `LLM_API_KEY` não estiver configurada: o status ficará `ERRO` com mensagem de autenticação — comportamento correto.

- [ ] **Step 8.5: Commit final (se necessário)**

```bash
git status
# Se houver arquivos não commitados:
git add .
git commit -m "feat(sp4): finalize SP-4 IA module"
```
