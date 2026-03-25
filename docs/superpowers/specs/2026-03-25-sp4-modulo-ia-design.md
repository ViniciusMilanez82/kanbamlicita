# SP-4 — Módulo de IA
## Design Spec

**Data:** 2026-03-25
**Sub-projeto:** SP-4 de 6
**Depende de:** SP-3 (concluído)
**Status:** Aprovado

---

## Objetivo

Implementar o módulo de análise por IA que processa cada licitação com um LLM configurável (Anthropic ou OpenAI), armazenando o resultado estruturado em `licitacao_analises_ia` e exibindo-o na aba "IA" da página de detalhe.

---

## Abordagem

Assíncrona com fire-and-forget: o POST retorna 202 imediatamente após criar o registro com `status = EM_PROCESSAMENTO`. A função `processAnalise` roda em background (via `void processAnalise(id)`), chama o LLM e atualiza o registro. A aba IA faz auto-refresh a cada 3s enquanto o status for `EM_PROCESSAMENTO`.

O provider de LLM é abstraído por uma interface `LlmProvider` — o resto do sistema nunca importa Anthropic ou OpenAI diretamente. O provider ativo é selecionado via `LLM_PROVIDER` no `.env`.

---

## Rota e Arquivos

### Novas rotas API
| Rota | Método | Responsabilidade |
|------|--------|-----------------|
| `/api/licitacoes/[id]/analise-ia` | POST | Cria análise EM_PROCESSAMENTO + dispara job |
| `/api/licitacoes/[id]/analise-ia` | GET | Retorna análise mais recente |

### Arquivos novos
| Arquivo | Tipo | Responsabilidade |
|---------|------|-----------------|
| `lib/llm/provider.ts` | TS | Interface `LlmProvider` |
| `lib/llm/anthropic.ts` | TS | Implementação Anthropic (`@anthropic-ai/sdk`) |
| `lib/llm/openai.ts` | TS | Implementação OpenAI (`openai`) |
| `lib/llm/factory.ts` | TS | Factory — lê `LLM_PROVIDER` env e retorna provider |
| `lib/llm/prompts/analise-completa.ts` | TS | Constrói system + user prompt |
| `app/api/licitacoes/[id]/analise-ia/route.ts` | API | GET + POST com processAnalise |
| `__tests__/api/analise-ia.test.ts` | Test | Testa processamento e armazenamento |
| `components/licitacao/tabs/IaTab.tsx` | Client | Aba IA com auto-refresh |

### Arquivos modificados
| Arquivo | Mudança |
|---------|---------|
| `types/licitacao-detalhe.ts` | Adicionar `AnaliseIaDetalhe` |
| `app/licitacoes/[id]/page.tsx` | Include `analiseIa` no fetch + passar para `IaTab` |

---

## Provider Abstraction

```ts
// lib/llm/provider.ts
export interface LlmProvider {
  complete(system: string, user: string): Promise<string>
  readonly modelName: string
}
```

**`lib/llm/anthropic.ts`** — usa `@anthropic-ai/sdk`:
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
    if (block.type !== 'text') throw new Error('Unexpected response type')
    return block.text
  }
}
```

**`lib/llm/openai.ts`** — usa `openai` package:
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

**`lib/llm/factory.ts`** — singleton:
```ts
import type { LlmProvider } from './provider'

let _provider: LlmProvider | null = null

export function getLlmProvider(): LlmProvider {
  if (_provider) return _provider
  const p = process.env.LLM_PROVIDER ?? 'anthropic'
  if (p === 'openai') {
    const { OpenAiProvider } = require('./openai')
    _provider = new OpenAiProvider()
  } else {
    const { AnthropicProvider } = require('./anthropic')
    _provider = new AnthropicProvider()
  }
  return _provider!
}
```

**Variáveis de ambiente (.env.local):**
```
LLM_PROVIDER=anthropic   # ou openai
LLM_API_KEY=sk-...
LLM_MODEL=claude-3-5-sonnet-20241022  # opcional
```

---

## Prompt

**`lib/llm/prompts/analise-completa.ts`**

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
      lines.push(`- [${item.tipo ?? 'item'}] ${item.descricao ?? '—'} | Qtd: ${item.quantitativo ?? '—'} ${item.unidade ?? ''}`)
    })
    lines.push(``)
  }

  if (licitacao.analise) {
    lines.push(`## Análise manual existente`)
    lines.push(`Aderência direta: ${licitacao.analise.aderenciaDiretaNivel} (existe: ${licitacao.analise.aderenciaDiretaExiste})`)
    lines.push(`Aderência aplicação: ${licitacao.analise.aderenciaAplicacaoNivel}`)
    lines.push(`Contexto oculto: ${licitacao.analise.contextoOcultoNivel}`)
    if (licitacao.analise.oportunidadeOcultaResumo) {
      lines.push(`Oportunidade oculta: ${licitacao.analise.oportunidadeOcultaResumo}`)
    }
    lines.push(``)
  }

  lines.push(`## Schema de resposta esperado`)
  lines.push(JSON.stringify({
    aderencia: { nivel: 'alta|media|baixa|nenhuma', justificativa: 'string' },
    oportunidades: [{ tipo: 'string', descricao: 'string', forca: 'forte|moderada|fraca' }],
    riscos: ['string'],
    recomendacao: 'AVANCAR|ACOMPANHAR|DESCARTAR',
    resumo: 'string (2-3 frases)',
    confianca: 'alta|media|baixa',
  }, null, 2))

  return lines.join('\n')
}
```

---

## API Route

**`app/api/licitacoes/[id]/analise-ia/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getLlmProvider } from '@/lib/llm/factory'
import { SYSTEM_PROMPT, buildUserPrompt, type AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'
import type { LicitacaoDetalhe } from '@/types/licitacao-detalhe'

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

  // Evitar duplicatas de processamento
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

  // Fire-and-forget — seguro em ambiente Node.js/pm2
  void processAnalise(registro.id, id)

  return NextResponse.json({ status: 'EM_PROCESSAMENTO', id: registro.id }, { status: 202 })
}

async function processAnalise(registroId: string, licitacaoId: string) {
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

    // Serializar para LicitacaoDetalhe (apenas campos necessários para o prompt)
    const licitacaoDetalhe = serializeForPrompt(row)

    const provider = getLlmProvider()
    const userPrompt = buildUserPrompt(licitacaoDetalhe)
    const raw = await provider.complete(SYSTEM_PROMPT, userPrompt)

    // Parse JSON — remover possíveis blocos markdown
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    const result: AnaliseIaResult = JSON.parse(cleaned)

    await db.licitacaoAnaliseIa.update({
      where: { id: registroId },
      data: {
        status: 'CONCLUIDO',
        modeloUtilizado: provider.modelName,
        resultadoJson: result,
        resumoTexto: result.resumo,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    await db.licitacaoAnaliseIa.update({
      where: { id: registroId },
      data: {
        status: 'ERRO',
        resumoTexto: msg,
      },
    }).catch(() => {}) // Silenciar erro de update em caso de falha de DB
  }
}

function serializeForPrompt(row: any): LicitacaoDetalhe {
  return {
    ...row,
    dataPublicacao: row.dataPublicacao?.toISOString() ?? null,
    dataSessao: row.dataSessao?.toISOString() ?? null,
    valorGlobalEstimado: row.valorGlobalEstimado ? Number(row.valorGlobalEstimado) : null,
    score: row.score ? {
      scoreFinal: Number(row.score.scoreFinal),
      faixaClassificacao: row.score.faixaClassificacao,
      valorCapturavelEstimado: row.score.valorCapturavelEstimado ? Number(row.score.valorCapturavelEstimado) : null,
      falsoNegativoNivelRisco: row.score.falsoNegativoNivelRisco,
    } : null,
    documentos: row.documentos ?? null,
    itens: row.itens.map((item: any) => ({
      ...item,
      quantitativo: item.quantitativo ? Number(item.quantitativo) : null,
      valorEstimadoItem: item.valorEstimadoItem ? Number(item.valorEstimadoItem) : null,
    })),
    analise: row.analise ?? null,
    movimentacoes: row.movimentacoes.map((m: any) => ({
      ...m,
      criadoEm: m.criadoEm.toISOString(),
    })),
  }
}
```

---

## Tipo Serializado

Duas alterações em `types/licitacao-detalhe.ts`:

**1. Novo tipo `AnaliseIaDetalhe`** (adicionar antes de `LicitacaoDetalhe`):

```ts
export type AnaliseIaDetalhe = {
  id: string
  status: string          // PENDENTE | EM_PROCESSAMENTO | CONCLUIDO | ERRO
  tipoAnalise: string
  modeloUtilizado: string | null
  promptVersao: string | null
  resultadoJson: unknown  // AnaliseIaResult quando status=CONCLUIDO
  resumoTexto: string | null
  criadoEm: string
} | null
```

**2. Adicionar campo `analiseIa` em `LicitacaoDetalhe`** (junto às demais relações no fim do tipo):

```ts
  // ao final de LicitacaoDetalhe, após movimentacoes:
  analiseIa: AnaliseIaDetalhe
```

---

## IaTab (Client Component)

**`components/licitacao/tabs/IaTab.tsx`**

Client Component com 4 estados:

1. **Sem análise** — botão "Analisar com IA"
2. **EM_PROCESSAMENTO** — spinner + `useEffect` com `router.refresh()` a cada 3s
3. **CONCLUIDO** — exibe resultado estruturado + botão "Re-analisar"
4. **ERRO** — mensagem de erro + botão "Tentar novamente"

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

const RECOMENDACAO_COLORS = {
  AVANCAR: 'bg-green-100 text-green-800 border-green-200',
  ACOMPANHAR: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DESCARTAR: 'bg-red-100 text-red-800 border-red-200',
}

export function IaTab({ licitacaoId, analiseIa }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Auto-refresh enquanto em processamento
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

  if (!analiseIa) {
    return (
      <div className="p-12 flex flex-col items-center gap-4 text-center">
        <div className="text-4xl">🤖</div>
        <p className="text-sm text-slate-600">Nenhuma análise realizada para esta licitação.</p>
        <Button onClick={handleAnalisar} disabled={loading} className="bg-[#1D4ED8] hover:bg-blue-700 text-white">
          {loading ? 'Iniciando...' : 'Analisar com IA'}
        </Button>
      </div>
    )
  }

  if (analiseIa.status === 'EM_PROCESSAMENTO') {
    return (
      <div className="p-12 flex flex-col items-center gap-3 text-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#1D4ED8] border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-slate-700">Analisando com IA...</p>
        <p className="text-xs text-slate-400">Isso pode levar alguns segundos.</p>
      </div>
    )
  }

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

  // CONCLUIDO
  const result = analiseIa.resultadoJson as AnaliseIaResult
  return (
    <div className="p-6 space-y-5 max-w-2xl">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Modelo: {analiseIa.modeloUtilizado ?? '—'} · Versão: {analiseIa.promptVersao ?? '—'}</span>
        <Button size="sm" variant="outline" onClick={handleAnalisar} disabled={loading} className="h-7 text-xs">
          {loading ? 'Iniciando...' : 'Re-analisar'}
        </Button>
      </div>

      {/* Resumo */}
      <div className="rounded-lg border bg-blue-50 border-blue-100 p-4">
        <p className="text-sm text-slate-700">{result.resumo}</p>
      </div>

      {/* Aderência + Recomendação */}
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
          <Badge variant="outline" className="text-xs capitalize">{result.confianca}</Badge>
        </div>
      </div>

      {/* Justificativa */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Justificativa</p>
        <p className="text-sm text-slate-700">{result.aderencia.justificativa}</p>
      </div>

      {/* Oportunidades */}
      {result.oportunidades.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Oportunidades</p>
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
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Riscos</p>
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

---

## Modificações na Página de Detalhe

**`app/licitacoes/[id]/page.tsx`** — adicionar ao include do Prisma:
```ts
analiseIa: {
  orderBy: { criadoEm: 'desc' },
  take: 1,
}
```

Serializar e passar para a aba:
```ts
analiseIa: row.analiseIa[0]
  ? {
      id: row.analiseIa[0].id,
      status: row.analiseIa[0].status,
      tipoAnalise: row.analiseIa[0].tipoAnalise,
      modeloUtilizado: row.analiseIa[0].modeloUtilizado,
      promptVersao: row.analiseIa[0].promptVersao,
      resultadoJson: row.analiseIa[0].resultadoJson,
      resumoTexto: row.analiseIa[0].resumoTexto,
      criadoEm: row.analiseIa[0].criadoEm.toISOString(),
    }
  : null,
```

E na JSX:
```tsx
{activeTab === 'ia' && <IaTab licitacaoId={id} analiseIa={licitacao.analiseIa} />}
```

---

## Testes

**`__tests__/api/analise-ia.test.ts`** — testa a lógica de processamento diretamente (sem HTTP):

```ts
import { db } from '@/lib/db'

// Mock do provider para testes (não chama API real)
class MockProvider {
  readonly modelName = 'mock-model'
  async complete(_system: string, _user: string): Promise<string> {
    return JSON.stringify({
      aderencia: { nivel: 'alta', justificativa: 'Teste' },
      oportunidades: [],
      riscos: [],
      recomendacao: 'AVANCAR',
      resumo: 'Resumo de teste',
      confianca: 'alta',
    })
  }
}
```

Casos:
- Cria registro `EM_PROCESSAMENTO` ao fazer POST
- Processa e seta `CONCLUIDO` com `resultadoJson` parseado
- Seta `ERRO` se o provider lançar exceção
- Retorna 409 se já há análise `EM_PROCESSAMENTO`

---

## Variáveis de Ambiente

Adicionar ao `.env.local` (e `.env.example` para documentação):
```
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
LLM_MODEL=claude-3-5-sonnet-20241022
```

---

## O que NÃO entra no SP-4

- Análise automática ao mover card para `em_analise` — SP futuro
- Múltiplos tipos de análise (`tipoAnalise` != `analise_completa`) — SP futuro
- Comparação entre versões de análise — SP futuro
- Fine-tuning de prompts via UI — SP futuro

---

## Critério de Sucesso

- `POST /api/licitacoes/[id]/analise-ia` retorna 202 e cria registro `EM_PROCESSAMENTO`
- Após processamento, registro atualiza para `CONCLUIDO` com `resultadoJson` válido
- Aba IA exibe spinner durante processamento e resultado após conclusão
- Auto-refresh funciona (página atualiza sozinha a cada 3s enquanto processando)
- Build sem erros TypeScript
- Testes de integração passam com MockProvider
