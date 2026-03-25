# SP-3 — Detalhe da Licitação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a página `/licitacoes/[id]` com cabeçalho, 8 abas navegáveis via URL, formulário de análise editável e listagem de licitações com links para o detalhe.

**Architecture:** Server Component page (`app/licitacoes/[id]/page.tsx`) busca dados via Prisma, converte Decimals para Number e passa props serializadas para componentes filhos. Navegação de abas via `searchParams.tab`. Apenas `LicitacaoHeader` e `AnaliseForm` são Client Components. Um novo endpoint `PUT /api/licitacoes/[id]/analise` faz upsert de `LicitacaoAnalise`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Tailwind CSS, shadcn/ui, TypeScript, Jest (testes de integração)

---

## Verificação após cada tarefa

```bash
npx tsc --noEmit
```
Esperado: saída vazia (zero erros).

---

## Padrões do projeto — leitura obrigatória antes de implementar

- `lib/db.ts` — importar `db` (não criar novo PrismaClient)
- `app/kanban/page.tsx` — padrão de Server Component: fetch com Prisma + conversão `Decimal → Number`
- `__tests__/api/licitacoes.test.ts` — padrão de teste de query
- `components/kanban/MoveKanbanModal.tsx` — reutilizar no header
- `lib/kanban.ts` — `KANBAN_COLUNA_LABELS` para labels das colunas
- `components/kanban/LicitacaoCard.tsx` — `FAIXA_COLORS` para badges de faixa (importar de lá ou copiar)

---

## Arquivo de referência

Spec: `docs/superpowers/specs/2026-03-25-sp3-detalhe-licitacao-design.md`

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `lib/format.ts` | Criar | `formatCurrency`, `formatDate` compartilhados |
| `components/kanban/LicitacaoCard.tsx` | Modificar | Importar `formatCurrency` de `lib/format.ts` |
| `types/licitacao-detalhe.ts` | Criar | Tipos serializados para a página de detalhe |
| `app/api/licitacoes/[id]/analise/route.ts` | Criar | PUT upsert `LicitacaoAnalise` |
| `__tests__/api/analise-upsert.test.ts` | Criar | Teste de integração do upsert |
| `components/licitacao/LicitacaoHeader.tsx` | Criar | Client Component — cabeçalho + modal mover |
| `components/licitacao/DetailTabs.tsx` | Criar | Server Component — barra de abas |
| `components/licitacao/tabs/ResumoTab.tsx` | Criar | Server Component — dados da licitação |
| `components/licitacao/tabs/DocumentosTab.tsx` | Criar | Server Component — checklist de documentos |
| `components/licitacao/tabs/ItensTab.tsx` | Criar | Server Component — tabela de itens/lotes |
| `components/licitacao/tabs/AnaliseForm.tsx` | Criar | Client Component — formulário de análise |
| `components/licitacao/tabs/HistoricoTab.tsx` | Criar | Server Component — timeline de movimentações |
| `app/licitacoes/[id]/page.tsx` | Criar | Server Component — página principal |
| `app/licitacoes/page.tsx` | Modificar | Adicionar listagem de licitações com links |

---

## Task 1: Utilitários de formatação compartilhados

**Files:**
- Create: `lib/format.ts`
- Modify: `components/kanban/LicitacaoCard.tsx`

- [ ] **Step 1.1: Criar `lib/format.ts`**

```ts
export function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return `R$ ${value}`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
```

- [ ] **Step 1.2: Atualizar `LicitacaoCard.tsx` para importar de `lib/format.ts`**

No topo do arquivo, substituir as funções `formatCurrency` e `formatDate` inline por imports:

```ts
import { formatCurrency, formatDate } from '@/lib/format'
```

Remover as definições locais de `formatCurrency` (linhas ~27-29) e `formatDate` (linhas ~31-33) do arquivo.

- [ ] **Step 1.3: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 1.4: Commit**

```bash
git add lib/format.ts components/kanban/LicitacaoCard.tsx
git commit -m "refactor: extract formatCurrency/formatDate to lib/format.ts"
```

---

## Task 2: Tipos serializados para o detalhe

**Files:**
- Create: `types/licitacao-detalhe.ts`

- [ ] **Step 2.1: Criar `types/licitacao-detalhe.ts`**

```ts
import type { KanbanColuna } from '@/lib/kanban'

export type CardDetalhe = {
  id: string
  colunaAtual: KanbanColuna
  urgente: boolean
  bloqueado: boolean
  motivoBloqueio: string | null
}

export type ScoreDetalhe = {
  scoreFinal: number
  faixaClassificacao: string
  valorCapturavelEstimado: number | null
  falsoNegativoNivelRisco: string
} | null

export type DocumentosDetalhe = {
  possuiEdital: boolean
  possuiTermoReferencia: boolean
  possuiProjetoBasico: boolean
  possuiMemorialDescritivo: boolean
  possuiAnexosTecnicos: boolean
  possuiPlanilhaOrcamentaria: boolean
  possuiCronograma: boolean
  possuiMinutaContratual: boolean
  lacunasDocumentais: string | null
} | null

export type ItemDetalhe = {
  id: string
  tipo: string | null
  identificador: string | null
  descricao: string | null
  quantitativo: number | null
  unidade: string | null
  aderencia: string
  prioridade: string
  valorEstimadoItem: number | null
  observacoes: string | null
}

export type AnaliseDetalhe = {
  aderenciaDiretaExiste: boolean
  aderenciaDiretaNivel: string
  aderenciaAplicacaoExiste: boolean
  aderenciaAplicacaoNivel: string
  contextoOcultoExiste: boolean
  contextoOcultoNivel: string
  oportunidadeOcultaExiste: boolean
  oportunidadeOcultaForca: string
  oportunidadeOcultaResumo: string | null
  oportunidadeNoObjeto: boolean
  oportunidadeNoTr: boolean
  oportunidadeNosLotes: boolean
  oportunidadeNosItens: boolean
  oportunidadeNaPlanilha: boolean
  oportunidadeNoMemorial: boolean
  oportunidadeEmAnexoTecnico: boolean
  portfolioAplicavel: unknown[]
  solucoesMuliteinerAplicaveis: unknown[]
} | null

export type MovimentacaoDetalhe = {
  id: string
  colunaOrigem: string | null
  colunaDestino: string
  motivo: string | null
  automatico: boolean
  criadoEm: string
}

export type LicitacaoDetalhe = {
  id: string
  orgao: string | null
  numeroLicitacao: string | null
  numeroProcesso: string | null
  modalidade: string | null
  tipoDisputa: string | null
  criterioJulgamento: string | null
  objetoResumido: string | null
  resumoNatureza: string | null
  segmento: string | null
  dataPublicacao: string | null
  dataSessao: string | null
  uf: string | null
  municipio: string | null
  regiao: string | null
  valorGlobalEstimado: number | null
  moeda: string
  statusPipeline: string
  linkOrigem: string | null
  fonteCaptacao: string | null
  // flags estruturais
  possuiLotes: boolean
  possuiItens: boolean
  possuiPlanilhaOrcamentaria: boolean
  possuiQuantitativos: boolean
  possuiPrecosUnitarios: boolean
  // natureza do objeto
  envolveLocacao: boolean
  envolveFornecimento: boolean
  envolveServico: boolean
  envolveObra: boolean
  envolveInstalacao: boolean
  envolveMontagem: boolean
  envolveDesmontagem: boolean
  envolveTransporte: boolean
  envolveMobilizacao: boolean
  envolveDesmobilizacao: boolean
  envolveManutencao: boolean
  // relações
  card: CardDetalhe | null
  score: ScoreDetalhe
  documentos: DocumentosDetalhe
  itens: ItemDetalhe[]
  analise: AnaliseDetalhe
  movimentacoes: MovimentacaoDetalhe[]
}
```

- [ ] **Step 2.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 2.3: Commit**

```bash
git add types/licitacao-detalhe.ts
git commit -m "feat(sp3): add LicitacaoDetalhe serialized types"
```

---

## Task 3: API route PUT /api/licitacoes/[id]/analise

**Files:**
- Create: `app/api/licitacoes/[id]/analise/route.ts`
- Create: `__tests__/api/analise-upsert.test.ts`

- [ ] **Step 3.1: Escrever o teste**

```ts
// __tests__/api/analise-upsert.test.ts
import { db } from '@/lib/db'

async function upsertAnalise(licitacaoId: string, body: Record<string, unknown>) {
  // Verifica existência
  const exists = await db.licitacao.findUnique({ where: { id: licitacaoId } })
  if (!exists) throw new Error('NOT_FOUND')

  return db.licitacaoAnalise.upsert({
    where: { licitacaoId },
    create: { licitacaoId, ...body },
    update: { ...body },
  })
}

describe('upsert LicitacaoAnalise', () => {
  let licitacaoId: string

  beforeAll(async () => {
    const l = await db.licitacao.findFirst()
    if (!l) throw new Error('Seed não encontrado')
    licitacaoId = l.id
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('cria análise quando não existe', async () => {
    // Limpar para garantir estado limpo
    await db.licitacaoAnalise.deleteMany({ where: { licitacaoId } })

    const result = await upsertAnalise(licitacaoId, {
      aderenciaDiretaExiste: true,
      aderenciaDiretaNivel: 'alta',
    })

    expect(result.licitacaoId).toBe(licitacaoId)
    expect(result.aderenciaDiretaExiste).toBe(true)
    expect(result.aderenciaDiretaNivel).toBe('alta')
  })

  it('atualiza análise quando já existe', async () => {
    const result = await upsertAnalise(licitacaoId, {
      aderenciaDiretaExiste: false,
      aderenciaDiretaNivel: 'nenhuma',
    })

    expect(result.aderenciaDiretaExiste).toBe(false)
    expect(result.aderenciaDiretaNivel).toBe('nenhuma')
  })

  it('lança NOT_FOUND para id inexistente', async () => {
    await expect(
      upsertAnalise('id-que-nao-existe', {})
    ).rejects.toThrow('NOT_FOUND')
  })
})
```

- [ ] **Step 3.2: Rodar teste para verificar que falha**

```bash
npx jest __tests__/api/analise-upsert.test.ts --no-coverage
```
Esperado: FAIL — `upsertAnalise is not defined` ou similar.

- [ ] **Step 3.3: Criar `app/api/licitacoes/[id]/analise/route.ts`**

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

    // Remover campos que não pertencem à tabela
    const { id: _id, licitacaoId: _lid, criadoEm: _c, atualizadoEm: _a, ...data } = body

    const analise = await db.licitacaoAnalise.upsert({
      where: { licitacaoId: id },
      create: { licitacaoId: id, ...data },
      update: { ...data },
    })

    return NextResponse.json({ analise })
  } catch (error) {
    console.error('[PUT /api/licitacoes/[id]/analise]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

- [ ] **Step 3.4: Rodar teste novamente**

```bash
npx jest __tests__/api/analise-upsert.test.ts --no-coverage
```
Esperado: 3 testes PASS.

- [ ] **Step 3.5: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 3.6: Commit**

```bash
git add app/api/licitacoes/[id]/analise/route.ts __tests__/api/analise-upsert.test.ts
git commit -m "feat(sp3): add PUT /api/licitacoes/[id]/analise with upsert"
```

---

## Task 4: LicitacaoHeader (Client Component)

**Files:**
- Create: `components/licitacao/LicitacaoHeader.tsx`

- [ ] **Step 4.1: Criar `components/licitacao/LicitacaoHeader.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, ArrowRight, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoveKanbanModal } from '@/components/kanban/MoveKanbanModal'
import { KANBAN_COLUNA_LABELS, type KanbanColuna } from '@/lib/kanban'
import { formatCurrency, formatDate } from '@/lib/format'
import type { LicitacaoDetalhe } from '@/types/licitacao-detalhe'

const FAIXA_COLORS: Record<string, string> = {
  'A+': 'bg-green-100 text-green-800 border-green-200',
  A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  B: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  C: 'bg-orange-100 text-orange-800 border-orange-200',
  D: 'bg-red-100 text-red-800 border-red-200',
}

type Props = { licitacao: LicitacaoDetalhe }

export function LicitacaoHeader({ licitacao }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)

  const coluna = licitacao.card?.colunaAtual
  const faixa = licitacao.score?.faixaClassificacao

  async function handleMoverConfirm(colunaDestino: KanbanColuna, motivo?: string) {
    if (!licitacao.card) return
    try {
      const res = await fetch('/api/kanban/mover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: licitacao.card.id, colunaDestino, motivo }),
      })
      if (!res.ok) {
        const body = await res.json()
        toast.error(body.error ?? 'Erro ao mover card')
        return
      }
      toast.success('Card movido com sucesso')
      router.refresh()
    } catch {
      toast.error('Erro de rede ao mover card')
    } finally {
      setModalOpen(false)
    }
  }

  return (
    <div className="border-b bg-white px-6 py-4">
      {/* Linha 1: Órgão + badges */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-base font-semibold text-slate-900 leading-tight">
          {licitacao.orgao ?? '—'}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {coluna && (
            <Badge variant="outline" className="text-xs">
              {KANBAN_COLUNA_LABELS[coluna]}
            </Badge>
          )}
          {faixa && (
            <Badge className={`text-xs border ${FAIXA_COLORS[faixa] ?? ''}`}>
              {faixa}
            </Badge>
          )}
          {licitacao.card?.urgente && (
            <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-200">
              <Zap className="h-3 w-3 mr-0.5" />
              URGENTE
            </Badge>
          )}
        </div>
      </div>

      {/* Linha 2: número · modalidade · UF · município */}
      <p className="text-sm text-slate-500 mt-1">
        {[licitacao.numeroLicitacao, licitacao.modalidade, licitacao.uf, licitacao.municipio]
          .filter(Boolean)
          .join(' · ')}
      </p>

      {/* Linha 3: Objeto */}
      {licitacao.objetoResumido && (
        <p className="text-sm text-slate-700 mt-1 line-clamp-2">{licitacao.objetoResumido}</p>
      )}

      {/* Linha 4: Valores + Sessão */}
      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
        <span>Global: {formatCurrency(licitacao.valorGlobalEstimado)}</span>
        <span>Sessão: {formatDate(licitacao.dataSessao)}</span>
        {licitacao.score?.valorCapturavelEstimado !== undefined &&
          licitacao.score.valorCapturavelEstimado !== null && (
            <span>Capturável: {formatCurrency(licitacao.score.valorCapturavelEstimado)}</span>
          )}
      </div>

      {/* Linha 5: Ações */}
      <div className="flex items-center gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => setModalOpen(true)}
          disabled={!licitacao.card}
        >
          <ArrowRight className="h-3.5 w-3.5 mr-1" />
          Mover Kanban
        </Button>
        {licitacao.linkOrigem ? (
          <a
            href={licitacao.linkOrigem}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir Origem
          </a>
        ) : (
          <span className="text-xs text-slate-300">Sem link de origem</span>
        )}
      </div>

      <MoveKanbanModal
        open={modalOpen}
        colunaDestino={null}
        colunaAtual={coluna}
        onConfirm={handleMoverConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}
```

- [ ] **Step 4.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 4.3: Commit**

```bash
git add components/licitacao/LicitacaoHeader.tsx
git commit -m "feat(sp3): add LicitacaoHeader client component"
```

---

## Task 5: DetailTabs (Server Component)

**Files:**
- Create: `components/licitacao/DetailTabs.tsx`

- [ ] **Step 5.1: Criar `components/licitacao/DetailTabs.tsx`**

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Tab = {
  key: string
  label: string
  badge?: string
}

const TABS: Tab[] = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'itens', label: 'Itens / Lotes' },
  { key: 'analise', label: 'Análise' },
  { key: 'historico', label: 'Histórico' },
  { key: 'ia', label: 'IA', badge: 'SP-4' },
  { key: 'score', label: 'Score', badge: 'SP-5' },
  { key: 'parecer', label: 'Parecer', badge: 'SP-5' },
]

type Props = {
  id: string
  activeTab: string
}

export function DetailTabs({ id, activeTab }: Props) {
  return (
    <div className="border-b bg-white px-6">
      <div className="flex gap-0 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab
          const isFuture = !!tab.badge
          return (
            <Link
              key={tab.key}
              href={`/licitacoes/${id}?tab=${tab.key}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
                isActive
                  ? 'border-[#1D4ED8] text-[#1D4ED8]'
                  : isFuture
                  ? 'border-transparent text-slate-300 hover:text-slate-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              )}
            >
              {tab.label}
              {tab.badge && (
                <span className="text-[10px] bg-slate-100 text-slate-400 rounded px-1 py-0.5">
                  {tab.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 5.3: Commit**

```bash
git add components/licitacao/DetailTabs.tsx
git commit -m "feat(sp3): add DetailTabs server component"
```

---

## Task 6: ResumoTab (Server Component)

**Files:**
- Create: `components/licitacao/tabs/ResumoTab.tsx`

- [ ] **Step 6.1: Criar `components/licitacao/tabs/ResumoTab.tsx`**

```tsx
import { formatCurrency, formatDate } from '@/lib/format'
import type { LicitacaoDetalhe } from '@/types/licitacao-detalhe'

type Props = { licitacao: LicitacaoDetalhe }

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-900">{value ?? '—'}</p>
    </div>
  )
}

function BoolBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${
        value
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-slate-50 text-slate-400 border-slate-200'
      }`}
    >
      {value ? '✓' : '○'} {label}
    </span>
  )
}

const NATUREZA_LABELS: Array<[keyof LicitacaoDetalhe, string]> = [
  ['envolveLocacao', 'Locação'],
  ['envolveFornecimento', 'Fornecimento'],
  ['envolveServico', 'Serviço'],
  ['envolveObra', 'Obra'],
  ['envolveInstalacao', 'Instalação'],
  ['envolveMontagem', 'Montagem'],
  ['envolveDesmontagem', 'Desmontagem'],
  ['envolveTransporte', 'Transporte'],
  ['envolveMobilizacao', 'Mobilização'],
  ['envolveDesmobilizacao', 'Desmobilização'],
  ['envolveManutencao', 'Manutenção'],
]

const ESTRUTURAL_LABELS: Array<[keyof LicitacaoDetalhe, string]> = [
  ['possuiLotes', 'Lotes'],
  ['possuiItens', 'Itens'],
  ['possuiPlanilhaOrcamentaria', 'Planilha orçamentária'],
  ['possuiQuantitativos', 'Quantitativos'],
  ['possuiPrecosUnitarios', 'Preços unitários'],
]

export function ResumoTab({ licitacao }: Props) {
  return (
    <div className="p-6 space-y-6">
      {/* Grid 2 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dados principais */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Dados Principais
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Órgão" value={licitacao.orgao} />
            <Field label="Nº Licitação" value={licitacao.numeroLicitacao} />
            <Field label="Nº Processo" value={licitacao.numeroProcesso} />
            <Field label="Modalidade" value={licitacao.modalidade} />
            <Field label="Tipo Disputa" value={licitacao.tipoDisputa} />
            <Field label="Critério Julgamento" value={licitacao.criterioJulgamento} />
            <Field label="Segmento" value={licitacao.segmento} />
            <Field label="Fonte" value={licitacao.fonteCaptacao} />
            <Field label="Publicação" value={formatDate(licitacao.dataPublicacao)} />
            <Field label="Sessão" value={formatDate(licitacao.dataSessao)} />
            <Field label="UF" value={licitacao.uf} />
            <Field label="Município" value={licitacao.municipio} />
            <Field label="Região" value={licitacao.regiao} />
            <Field
              label="Valor Global"
              value={formatCurrency(licitacao.valorGlobalEstimado)}
            />
            <Field label="Status Pipeline" value={licitacao.statusPipeline} />
          </div>
          {/* Flags estruturais */}
          <div>
            <p className="text-xs text-slate-400 mb-1">Estrutura</p>
            <div className="flex flex-wrap gap-1.5">
              {ESTRUTURAL_LABELS.map(([key, label]) => (
                <BoolBadge key={key} value={licitacao[key] as boolean} label={label} />
              ))}
            </div>
          </div>
        </div>

        {/* Natureza do objeto */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Natureza do Objeto
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {NATUREZA_LABELS.map(([key, label]) => (
              <BoolBadge key={key} value={licitacao[key] as boolean} label={label} />
            ))}
          </div>
        </div>
      </div>

      {/* Objeto resumido */}
      {licitacao.objetoResumido && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Objeto
          </h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{licitacao.objetoResumido}</p>
        </div>
      )}

      {/* Resumo natureza */}
      {licitacao.resumoNatureza && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Resumo da Natureza
          </h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{licitacao.resumoNatureza}</p>
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
git add components/licitacao/tabs/ResumoTab.tsx
git commit -m "feat(sp3): add ResumoTab server component"
```

---

## Task 7: DocumentosTab (Server Component)

**Files:**
- Create: `components/licitacao/tabs/DocumentosTab.tsx`

- [ ] **Step 7.1: Criar `components/licitacao/tabs/DocumentosTab.tsx`**

```tsx
import type { DocumentosDetalhe } from '@/types/licitacao-detalhe'

type Props = { documentos: DocumentosDetalhe }

const DOCUMENTOS: Array<{ key: keyof NonNullable<DocumentosDetalhe>; label: string }> = [
  { key: 'possuiEdital', label: 'Edital' },
  { key: 'possuiTermoReferencia', label: 'Termo de Referência' },
  { key: 'possuiProjetoBasico', label: 'Projeto Básico' },
  { key: 'possuiMemorialDescritivo', label: 'Memorial Descritivo' },
  { key: 'possuiAnexosTecnicos', label: 'Anexos Técnicos' },
  { key: 'possuiPlanilhaOrcamentaria', label: 'Planilha Orçamentária' },
  { key: 'possuiCronograma', label: 'Cronograma' },
  { key: 'possuiMinutaContratual', label: 'Minuta Contratual' },
]

export function DocumentosTab({ documentos }: Props) {
  if (!documentos) {
    return (
      <div className="p-6 text-sm text-slate-400 italic">
        Documentos não analisados para esta licitação.
      </div>
    )
  }

  return (
    <div className="p-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left text-xs text-slate-500 font-medium pb-2">Documento</th>
            <th className="text-left text-xs text-slate-500 font-medium pb-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {DOCUMENTOS.map(({ key, label }) => {
            const presente = documentos[key] as boolean
            return (
              <tr key={key}>
                <td className="py-2 text-slate-700">{label}</td>
                <td className="py-2">
                  {presente ? (
                    <span className="text-green-700 font-medium">✅ Presente</span>
                  ) : (
                    <span className="text-slate-400">⚫ Ausente</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {documentos.lacunasDocumentais && (
        <div className="mt-4">
          <p className="text-xs text-slate-400 mb-1">Lacunas documentais</p>
          <p className="text-sm text-slate-700">{documentos.lacunasDocumentais}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 7.3: Commit**

```bash
git add components/licitacao/tabs/DocumentosTab.tsx
git commit -m "feat(sp3): add DocumentosTab server component"
```

---

## Task 8: ItensTab (Server Component)

**Files:**
- Create: `components/licitacao/tabs/ItensTab.tsx`

- [ ] **Step 8.1: Criar `components/licitacao/tabs/ItensTab.tsx`**

```tsx
import { formatCurrency } from '@/lib/format'
import type { ItemDetalhe } from '@/types/licitacao-detalhe'

type Props = { itens: ItemDetalhe[] }

const ADERENCIA_BADGE: Record<string, string> = {
  alta: 'bg-green-100 text-green-700',
  média: 'bg-yellow-100 text-yellow-700',
  baixa: 'bg-slate-100 text-slate-600',
  nenhuma: 'bg-gray-50 text-gray-400',
}

const PRIORIDADE_BADGE: Record<string, string> = {
  alta: 'bg-red-100 text-red-700',
  média: 'bg-yellow-100 text-yellow-700',
  baixa: 'bg-slate-100 text-slate-600',
}

export function ItensTab({ itens }: Props) {
  if (itens.length === 0) {
    return (
      <div className="p-6 text-sm text-slate-400 italic">
        Nenhum item ou lote registrado para esta licitação.
      </div>
    )
  }

  return (
    <div className="p-6 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            {['Tipo', 'ID', 'Descrição', 'Qtd', 'Unid.', 'Aderência', 'Prioridade', 'Valor Est.'].map(
              (h) => (
                <th
                  key={h}
                  className="text-left text-slate-500 font-medium pb-2 pr-3 whitespace-nowrap"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {itens.map((item) => (
            <tr key={item.id}>
              <td className="py-2 pr-3 text-slate-500">{item.tipo ?? '—'}</td>
              <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">
                {item.identificador ?? '—'}
              </td>
              <td className="py-2 pr-3 text-slate-700 max-w-xs">
                <p className="line-clamp-2">{item.descricao ?? '—'}</p>
                {item.observacoes && (
                  <p className="text-slate-400 text-[10px] mt-0.5">{item.observacoes}</p>
                )}
              </td>
              <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">
                {item.quantitativo ?? '—'}
              </td>
              <td className="py-2 pr-3 text-slate-500">{item.unidade ?? '—'}</td>
              <td className="py-2 pr-3">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    ADERENCIA_BADGE[item.aderencia] ?? 'bg-gray-50 text-gray-400'
                  }`}
                >
                  {item.aderencia}
                </span>
              </td>
              <td className="py-2 pr-3">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    PRIORIDADE_BADGE[item.prioridade] ?? 'bg-gray-50 text-gray-400'
                  }`}
                >
                  {item.prioridade}
                </span>
              </td>
              <td className="py-2 text-slate-700 whitespace-nowrap">
                {formatCurrency(item.valorEstimadoItem)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 8.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 8.3: Commit**

```bash
git add components/licitacao/tabs/ItensTab.tsx
git commit -m "feat(sp3): add ItensTab server component"
```

---

## Task 9: AnaliseForm (Client Component)

**Files:**
- Create: `components/licitacao/tabs/AnaliseForm.tsx`

- [ ] **Step 9.1: Criar `components/licitacao/tabs/AnaliseForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { AnaliseDetalhe } from '@/types/licitacao-detalhe'

type Props = {
  licitacaoId: string
  analise: AnaliseDetalhe
}

type FormState = {
  aderenciaDiretaExiste: boolean
  aderenciaDiretaNivel: string
  aderenciaAplicacaoExiste: boolean
  aderenciaAplicacaoNivel: string
  contextoOcultoExiste: boolean
  contextoOcultoNivel: string
  oportunidadeOcultaExiste: boolean
  oportunidadeOcultaForca: string
  oportunidadeOcultaResumo: string
  oportunidadeNoObjeto: boolean
  oportunidadeNoTr: boolean
  oportunidadeNosLotes: boolean
  oportunidadeNosItens: boolean
  oportunidadeNaPlanilha: boolean
  oportunidadeNoMemorial: boolean
  oportunidadeEmAnexoTecnico: boolean
  portfolioAplicavel: string
  solucoesMuliteinerAplicaveis: string
}

function toFormState(analise: AnaliseDetalhe): FormState {
  return {
    aderenciaDiretaExiste: analise?.aderenciaDiretaExiste ?? false,
    aderenciaDiretaNivel: analise?.aderenciaDiretaNivel ?? 'nenhuma',
    aderenciaAplicacaoExiste: analise?.aderenciaAplicacaoExiste ?? false,
    aderenciaAplicacaoNivel: analise?.aderenciaAplicacaoNivel ?? 'nenhuma',
    contextoOcultoExiste: analise?.contextoOcultoExiste ?? false,
    contextoOcultoNivel: analise?.contextoOcultoNivel ?? 'nenhuma',
    oportunidadeOcultaExiste: analise?.oportunidadeOcultaExiste ?? false,
    oportunidadeOcultaForca: analise?.oportunidadeOcultaForca ?? 'nenhuma',
    oportunidadeOcultaResumo: analise?.oportunidadeOcultaResumo ?? '',
    oportunidadeNoObjeto: analise?.oportunidadeNoObjeto ?? false,
    oportunidadeNoTr: analise?.oportunidadeNoTr ?? false,
    oportunidadeNosLotes: analise?.oportunidadeNosLotes ?? false,
    oportunidadeNosItens: analise?.oportunidadeNosItens ?? false,
    oportunidadeNaPlanilha: analise?.oportunidadeNaPlanilha ?? false,
    oportunidadeNoMemorial: analise?.oportunidadeNoMemorial ?? false,
    oportunidadeEmAnexoTecnico: analise?.oportunidadeEmAnexoTecnico ?? false,
    portfolioAplicavel: JSON.stringify(analise?.portfolioAplicavel ?? []),
    solucoesMuliteinerAplicaveis: JSON.stringify(analise?.solucoesMuliteinerAplicaveis ?? []),
  }
}

const NIVEL_OPTIONS = ['nenhuma', 'baixa', 'média', 'alta']
const FORCA_OPTIONS = ['nenhuma', 'fraca', 'moderada', 'forte']

export function AnaliseForm({ licitacaoId, analise }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => toFormState(analise))
  const [saving, setSaving] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      let portfolioAplicavel: unknown[] = []
      let solucoesMuliteinerAplicaveis: unknown[] = []
      try { portfolioAplicavel = JSON.parse(form.portfolioAplicavel) } catch { portfolioAplicavel = [form.portfolioAplicavel] }
      try { solucoesMuliteinerAplicaveis = JSON.parse(form.solucoesMuliteinerAplicaveis) } catch { solucoesMuliteinerAplicaveis = [form.solucoesMuliteinerAplicaveis] }

      const res = await fetch(`/api/licitacoes/${licitacaoId}/analise`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, portfolioAplicavel, solucoesMuliteinerAplicaveis }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success('Análise salva com sucesso')
      router.refresh()
    } catch {
      toast.error('Erro ao salvar análise')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Bloco 1: Aderência */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Aderência
        </h3>
        <div className="space-y-3">
          {([
            ['aderenciaDiretaExiste', 'aderenciaDiretaNivel', 'Aderência Direta'],
            ['aderenciaAplicacaoExiste', 'aderenciaAplicacaoNivel', 'Aderência por Aplicação'],
            ['contextoOcultoExiste', 'contextoOcultoNivel', 'Contexto Oculto'],
          ] as const).map(([existeKey, nivelKey, label]) => (
            <div key={existeKey} className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-slate-700 w-48 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[existeKey]}
                  onChange={(e) => set(existeKey, e.target.checked)}
                  className="rounded border-slate-300"
                />
                {label}
              </label>
              <select
                value={form[nivelKey]}
                onChange={(e) => set(nivelKey, e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
              >
                {NIVEL_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Bloco 2: Oportunidade oculta */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Oportunidade Oculta
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.oportunidadeOcultaExiste}
              onChange={(e) => set('oportunidadeOcultaExiste', e.target.checked)}
              className="rounded border-slate-300"
            />
            Existe oportunidade oculta
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-16">Força</span>
            <select
              value={form.oportunidadeOcultaForca}
              onChange={(e) => set('oportunidadeOcultaForca', e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
            >
              {FORCA_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Resumo da oportunidade</label>
            <textarea
              value={form.oportunidadeOcultaResumo}
              onChange={(e) => set('oportunidadeOcultaResumo', e.target.value)}
              rows={3}
              className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] resize-none"
              placeholder="Descreva a oportunidade oculta identificada..."
            />
          </div>
        </div>
      </section>

      {/* Bloco 3: Onde está a oportunidade */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Onde Está a Oportunidade
        </h3>
        <div className="flex flex-wrap gap-3">
          {([
            ['oportunidadeNoObjeto', 'No objeto'],
            ['oportunidadeNoTr', 'No TR'],
            ['oportunidadeNosLotes', 'Nos lotes'],
            ['oportunidadeNosItens', 'Nos itens'],
            ['oportunidadeNaPlanilha', 'Na planilha'],
            ['oportunidadeNoMemorial', 'No memorial'],
            ['oportunidadeEmAnexoTecnico', 'Em anexo técnico'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => set(key, e.target.checked)}
                className="rounded border-slate-300"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* Bloco 4: Portfólio e soluções */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Portfólio e Soluções
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Portfólio aplicável (JSON array ou texto livre)
            </label>
            <textarea
              value={form.portfolioAplicavel}
              onChange={(e) => set('portfolioAplicavel', e.target.value)}
              rows={3}
              className="w-full text-xs font-mono border border-slate-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] resize-none"
              placeholder='["containers adaptados", "módulos habitacionais"]'
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Soluções Multiteiner aplicáveis (JSON array ou texto livre)
            </label>
            <textarea
              value={form.solucoesMuliteinerAplicaveis}
              onChange={(e) => set('solucoesMuliteinerAplicaveis', e.target.value)}
              rows={3}
              className="w-full text-xs font-mono border border-slate-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] resize-none"
              placeholder='["alojamento modular", "escritório de obra"]'
            />
          </div>
        </div>
      </section>

      {/* Botão salvar */}
      <div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1D4ED8] hover:bg-blue-700 text-white"
        >
          {saving ? 'Salvando...' : 'Salvar Análise'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 9.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 9.3: Commit**

```bash
git add components/licitacao/tabs/AnaliseForm.tsx
git commit -m "feat(sp3): add AnaliseForm client component"
```

---

## Task 10: HistoricoTab (Server Component)

**Files:**
- Create: `components/licitacao/tabs/HistoricoTab.tsx`

- [ ] **Step 10.1: Criar `components/licitacao/tabs/HistoricoTab.tsx`**

```tsx
import { formatDateTime } from '@/lib/format'
import { KANBAN_COLUNA_LABELS } from '@/lib/kanban'
import type { MovimentacaoDetalhe } from '@/types/licitacao-detalhe'

type Props = { movimentacoes: MovimentacaoDetalhe[] }

function colunaLabel(coluna: string | null): string {
  if (!coluna) return '—'
  return KANBAN_COLUNA_LABELS[coluna as keyof typeof KANBAN_COLUNA_LABELS] ?? coluna
}

export function HistoricoTab({ movimentacoes }: Props) {
  if (movimentacoes.length === 0) {
    return (
      <div className="p-6 text-sm text-slate-400 italic">
        Nenhuma movimentação registrada.
      </div>
    )
  }

  return (
    <div className="p-6">
      <ol className="relative border-l border-slate-200 space-y-6 ml-2">
        {movimentacoes.map((mov) => (
          <li key={mov.id} className="ml-4">
            <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-[#1D4ED8]" />
            <p className="text-xs text-slate-400">{formatDateTime(mov.criadoEm)}</p>
            <p className="text-sm text-slate-700 mt-0.5">
              <span className="text-slate-400">{colunaLabel(mov.colunaOrigem)}</span>
              {' → '}
              <span className="font-medium">{colunaLabel(mov.colunaDestino)}</span>
            </p>
            {mov.motivo && (
              <p className="text-xs text-slate-500 mt-0.5 italic">"{mov.motivo}"</p>
            )}
            <p className="text-[10px] text-slate-300 mt-0.5">
              {mov.automatico ? 'Automático' : 'Manual'}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
```

- [ ] **Step 10.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 10.3: Commit**

```bash
git add components/licitacao/tabs/HistoricoTab.tsx
git commit -m "feat(sp3): add HistoricoTab server component"
```

---

## Task 11: Página de detalhe

**Files:**
- Create: `app/licitacoes/[id]/page.tsx`

- [ ] **Step 11.1: Criar `app/licitacoes/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { LicitacaoHeader } from '@/components/licitacao/LicitacaoHeader'
import { DetailTabs } from '@/components/licitacao/DetailTabs'
import { ResumoTab } from '@/components/licitacao/tabs/ResumoTab'
import { DocumentosTab } from '@/components/licitacao/tabs/DocumentosTab'
import { ItensTab } from '@/components/licitacao/tabs/ItensTab'
import { AnaliseForm } from '@/components/licitacao/tabs/AnaliseForm'
import { HistoricoTab } from '@/components/licitacao/tabs/HistoricoTab'
import { db } from '@/lib/db'
import type { LicitacaoDetalhe } from '@/types/licitacao-detalhe'

const VALID_TABS = ['resumo', 'documentos', 'itens', 'analise', 'historico', 'ia', 'score', 'parecer'] as const
type Tab = typeof VALID_TABS[number]

async function getLicitacao(id: string): Promise<LicitacaoDetalhe> {
  const row = await db.licitacao.findUnique({
    where: { id },
    include: {
      card: true,
      movimentacoes: { orderBy: { criadoEm: 'desc' } },
      score: true,
      documentos: true,
      itens: { orderBy: { criadoEm: 'asc' } },
      analise: true,
    },
  })

  if (!row) notFound()

  return {
    ...row,
    dataPublicacao: row.dataPublicacao?.toISOString() ?? null,
    dataSessao: row.dataSessao?.toISOString() ?? null,
    valorGlobalEstimado: row.valorGlobalEstimado ? Number(row.valorGlobalEstimado) : null,
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
    documentos: row.documentos
      ? {
          possuiEdital: row.documentos.possuiEdital,
          possuiTermoReferencia: row.documentos.possuiTermoReferencia,
          possuiProjetoBasico: row.documentos.possuiProjetoBasico,
          possuiMemorialDescritivo: row.documentos.possuiMemorialDescritivo,
          possuiAnexosTecnicos: row.documentos.possuiAnexosTecnicos,
          possuiPlanilhaOrcamentaria: row.documentos.possuiPlanilhaOrcamentaria,
          possuiCronograma: row.documentos.possuiCronograma,
          possuiMinutaContratual: row.documentos.possuiMinutaContratual,
          lacunasDocumentais: row.documentos.lacunasDocumentais,
        }
      : null,
    itens: row.itens.map((item) => ({
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
    analise: row.analise
      ? {
          aderenciaDiretaExiste: row.analise.aderenciaDiretaExiste,
          aderenciaDiretaNivel: row.analise.aderenciaDiretaNivel,
          aderenciaAplicacaoExiste: row.analise.aderenciaAplicacaoExiste,
          aderenciaAplicacaoNivel: row.analise.aderenciaAplicacaoNivel,
          contextoOcultoExiste: row.analise.contextoOcultoExiste,
          contextoOcultoNivel: row.analise.contextoOcultoNivel,
          oportunidadeOcultaExiste: row.analise.oportunidadeOcultaExiste,
          oportunidadeOcultaForca: row.analise.oportunidadeOcultaForca,
          oportunidadeOcultaResumo: row.analise.oportunidadeOcultaResumo,
          oportunidadeNoObjeto: row.analise.oportunidadeNoObjeto,
          oportunidadeNoTr: row.analise.oportunidadeNoTr,
          oportunidadeNosLotes: row.analise.oportunidadeNosLotes,
          oportunidadeNosItens: row.analise.oportunidadeNosItens,
          oportunidadeNaPlanilha: row.analise.oportunidadeNaPlanilha,
          oportunidadeNoMemorial: row.analise.oportunidadeNoMemorial,
          oportunidadeEmAnexoTecnico: row.analise.oportunidadeEmAnexoTecnico,
          portfolioAplicavel: row.analise.portfolioAplicavel as unknown[],
          solucoesMuliteinerAplicaveis: row.analise.solucoesMuliteinerAplicaveis as unknown[],
        }
      : null,
    movimentacoes: row.movimentacoes.map((m) => ({
      id: m.id,
      colunaOrigem: m.colunaOrigem ?? null,
      colunaDestino: m.colunaDestino,
      motivo: m.motivo,
      automatico: m.automatico,
      criadoEm: m.criadoEm.toISOString(),
    })),
  }
}

function PlaceholderTab({ feature }: { feature: string }) {
  return (
    <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
      <div className="text-4xl">🔧</div>
      <p className="text-sm font-medium text-slate-700">Disponível no {feature}</p>
      <p className="text-xs text-slate-400">Este módulo será implementado em uma próxima etapa.</p>
    </div>
  )
}

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function LicitacaoDetalhePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab: Tab = (VALID_TABS.includes(tab as Tab) ? tab : 'resumo') as Tab

  const licitacao = await getLicitacao(id)

  return (
    <>
      <TopBar title="Detalhe da Licitação" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <LicitacaoHeader licitacao={licitacao} />
        <DetailTabs id={id} activeTab={activeTab} />
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {activeTab === 'resumo' && <ResumoTab licitacao={licitacao} />}
          {activeTab === 'documentos' && <DocumentosTab documentos={licitacao.documentos} />}
          {activeTab === 'itens' && <ItensTab itens={licitacao.itens} />}
          {activeTab === 'analise' && (
            <AnaliseForm licitacaoId={id} analise={licitacao.analise} />
          )}
          {activeTab === 'historico' && (
            <HistoricoTab movimentacoes={licitacao.movimentacoes} />
          )}
          {activeTab === 'ia' && <PlaceholderTab feature="SP-4" />}
          {activeTab === 'score' && <PlaceholderTab feature="SP-5" />}
          {activeTab === 'parecer' && <PlaceholderTab feature="SP-5" />}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 11.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 11.3: Commit**

```bash
git add app/licitacoes/[id]/page.tsx
git commit -m "feat(sp3): add /licitacoes/[id] detail page"
```

---

## Task 12: Página de listagem de licitações

**Files:**
- Modify: `app/licitacoes/page.tsx`

- [ ] **Step 12.1: Substituir placeholder pela listagem real**

Substituir o conteúdo completo de `app/licitacoes/page.tsx`:

```tsx
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { db } from '@/lib/db'
import { KANBAN_COLUNA_LABELS } from '@/lib/kanban'
import { formatCurrency, formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/badge'

const FAIXA_COLORS: Record<string, string> = {
  'A+': 'bg-green-100 text-green-800 border-green-200',
  A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  B: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  C: 'bg-orange-100 text-orange-800 border-orange-200',
  D: 'bg-red-100 text-red-800 border-red-200',
}

async function getLicitacoes() {
  const rows = await db.licitacao.findMany({
    include: {
      card: { select: { colunaAtual: true, urgente: true } },
      score: { select: { faixaClassificacao: true, scoreFinal: true } },
    },
    orderBy: { criadoEm: 'desc' },
  })
  return rows.map((r) => ({
    ...r,
    dataSessao: r.dataSessao?.toISOString() ?? null,
    valorGlobalEstimado: r.valorGlobalEstimado ? Number(r.valorGlobalEstimado) : null,
    score: r.score
      ? { ...r.score, scoreFinal: Number(r.score.scoreFinal) }
      : null,
  }))
}

export default async function LicitacoesPage() {
  const licitacoes = await getLicitacoes()

  return (
    <>
      <TopBar title="Licitações" />
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-slate-50">
                {['Órgão', 'Nº / Modalidade', 'UF', 'Sessão', 'Valor Global', 'Faixa', 'Coluna'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-slate-500 font-medium px-3 py-2 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {licitacoes.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2">
                    <Link
                      href={`/licitacoes/${l.id}`}
                      className="font-medium text-slate-900 hover:text-[#1D4ED8] hover:underline"
                    >
                      {l.orgao ?? '—'}
                    </Link>
                    {l.objetoResumido && (
                      <p className="text-slate-400 truncate max-w-xs">{l.objetoResumido}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                    <p>{l.numeroLicitacao ?? '—'}</p>
                    <p className="text-slate-400">{l.modalidade ?? ''}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{l.uf ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                    {formatDate(l.dataSessao)}
                  </td>
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                    {formatCurrency(l.valorGlobalEstimado)}
                  </td>
                  <td className="px-3 py-2">
                    {l.score?.faixaClassificacao ? (
                      <Badge
                        className={`text-[10px] border ${
                          FAIXA_COLORS[l.score.faixaClassificacao] ?? ''
                        }`}
                      >
                        {l.score.faixaClassificacao}
                      </Badge>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                    {l.card?.colunaAtual
                      ? KANBAN_COLUNA_LABELS[l.card.colunaAtual]
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {licitacoes.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">
              Nenhuma licitação encontrada.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 12.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: saída vazia.

- [ ] **Step 12.3: Commit**

```bash
git add app/licitacoes/page.tsx
git commit -m "feat(sp3): add licitacoes listing page with links to detail"
```

---

## Task 13: Build final e verificação

- [ ] **Step 13.1: Rodar lint**

```bash
npm run lint
```
Esperado: 0 errors (o warning pre-existente em `__tests__/lib/kanban.test.ts` pode aparecer — ignorar).

- [ ] **Step 13.2: Rodar build**

```bash
npm run build
```
Esperado: `✓ Compiled successfully`. As rotas devem incluir:
```
ƒ /licitacoes/[id]
○ /licitacoes
ƒ /api/licitacoes/[id]/analise
```

- [ ] **Step 13.3: Verificação manual**

Com o servidor rodando (`npm run dev`):
1. Acessar `/licitacoes` — deve mostrar tabela com 30 licitações do seed
2. Clicar em qualquer licitação — deve abrir `/licitacoes/[id]` com header e abas
3. Navegar entre abas via URL (`?tab=documentos`, `?tab=itens`, etc.)
4. Acessar `?tab=analise` — formulário deve renderizar com checkboxes e selects
5. Preencher e clicar "Salvar Análise" — deve mostrar toast de sucesso
6. Recarregar a página — dados da análise devem persistir
7. Clicar "Mover Kanban" no header — modal deve abrir
8. Abas IA/Score/Parecer devem mostrar placeholder

- [ ] **Step 13.4: Commit final (se necessário)**

```bash
git status
# Se houver arquivos não commitados:
git add .
git commit -m "feat(sp3): finalize SP-3 detail page implementation"
```
