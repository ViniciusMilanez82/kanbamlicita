# SP-9: Captação Histórico — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir histórico de execuções de captação por fonte em Configurações > Sistema, permitindo ao admin monitorar quando cada fonte foi processada e os resultados.

**Architecture:** Novo endpoint `GET /api/admin/fontes/[id]/execucoes` adicionado ao route existente. `SistemaTab` ganha estado por fonte (`HistoricoState`) e toggle de expansão com fetch lazy. A tabela inline mostra as últimas 20 execuções com badges de status.

**Tech Stack:** Next.js App Router, TypeScript, Prisma (PostgreSQL), Tailwind CSS, Jest

---

## Arquivos

| Ação | Arquivo | O que muda |
|------|---------|-----------|
| Modify | `app/api/admin/fontes/[id]/route.ts` | + `GET` handler para execuções |
| Modify | `components/configuracoes/SistemaTab.tsx` | + HistoricoState, toggle, fetch, tabela inline |
| Create | `__tests__/api/fontes-execucoes.test.ts` | testes da query |

---

### Task 1: GET /api/admin/fontes/[id]/execucoes (TDD)

**Files:**
- Create: `__tests__/api/fontes-execucoes.test.ts`
- Modify: `app/api/admin/fontes/[id]/route.ts`

**Contexto:** O modelo `CaptacaoExecucao` tem: `id`, `fonteId`, `status`, `iniciadoEm`, `finalizadoEm`, `totalLidos`, `totalNovos`, `totalAtualizados`, `totalDescartadosDuplicidade`, `totalErros`, `logResumo`. A relação é `fonteId → CaptacaoFonte.id`.

- [ ] **Step 1: Criar arquivo de teste**

Criar `__tests__/api/fontes-execucoes.test.ts`:

```ts
import { db } from '@/lib/db'

async function getExecucoes(fonteId: string) {
  return db.captacaoExecucao.findMany({
    where: { fonteId },
    orderBy: { iniciadoEm: 'desc' },
    take: 20,
    select: {
      id: true,
      status: true,
      iniciadoEm: true,
      finalizadoEm: true,
      totalLidos: true,
      totalNovos: true,
      totalAtualizados: true,
      totalDescartadosDuplicidade: true,
      totalErros: true,
      logResumo: true,
    },
  })
}

describe('GET /api/admin/fontes/[id]/execucoes — query', () => {
  afterAll(async () => { await db.$disconnect() })

  it('retorna array (vazio ou não) para uma fonte existente', async () => {
    const fonte = await db.captacaoFonte.findFirst({ select: { id: true } })
    if (!fonte) {
      console.warn('Nenhuma fonte encontrada no banco — seed pode precisar de fontes')
      return
    }
    const result = await getExecucoes(fonte.id)
    expect(Array.isArray(result)).toBe(true)
  })

  it('não retorna mais de 20 registros', async () => {
    const fonte = await db.captacaoFonte.findFirst({ select: { id: true } })
    if (!fonte) return
    const result = await getExecucoes(fonte.id)
    expect(result.length).toBeLessThanOrEqual(20)
  })

  it('cada execução tem os campos esperados', async () => {
    const fonte = await db.captacaoFonte.findFirst({ select: { id: true } })
    if (!fonte) return
    const result = await getExecucoes(fonte.id)
    result.forEach((e) => {
      expect(e.id).toBeDefined()
      expect(e.status).toBeDefined()
      expect(e.iniciadoEm).toBeDefined()
    })
  })
})
```

- [ ] **Step 2: Rodar teste**

```bash
npx jest __tests__/api/fontes-execucoes.test.ts --no-coverage
```

Expected: PASS (query é direta, sem implementação adicional)

- [ ] **Step 3: Adicionar handler `GET` em `app/api/admin/fontes/[id]/route.ts`**

O arquivo atual tem apenas `PATCH`. Adicionar antes do `PATCH`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const { id } = await params

  const execucoes = await db.captacaoExecucao.findMany({
    where: { fonteId: id },
    orderBy: { iniciadoEm: 'desc' },
    take: 20,
    select: {
      id: true,
      status: true,
      iniciadoEm: true,
      finalizadoEm: true,
      totalLidos: true,
      totalNovos: true,
      totalAtualizados: true,
      totalDescartadosDuplicidade: true,
      totalErros: true,
      logResumo: true,
    },
  })

  return NextResponse.json({ execucoes })
}
```

**Atenção:** O import de `NextRequest` já existe no arquivo (usado no `PATCH`). Não duplicar.

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/fontes/[id]/route.ts __tests__/api/fontes-execucoes.test.ts
git commit -m "feat(sp9): add GET /api/admin/fontes/[id]/execucoes endpoint"
```

---

### Task 2: SistemaTab — histórico inline por fonte

**Files:**
- Modify: `components/configuracoes/SistemaTab.tsx`

**Contexto:** O arquivo já é Client Component (`'use client'`). A seção de fontes renderiza uma tabela com uma `<tr>` por fonte. Vamos adicionar um botão "Histórico" por linha e, ao clicar, expandir uma linha extra com a tabela de execuções.

- [ ] **Step 1: Adicionar tipos de execução no topo de `SistemaTab.tsx` (após `type Fonte`)**

```ts
type Execucao = {
  id: string
  status: string
  iniciadoEm: string
  finalizadoEm: string | null
  totalLidos: number
  totalNovos: number
  totalAtualizados: number
  totalDescartadosDuplicidade: number
  totalErros: number
  logResumo: string | null
}

type HistoricoState = {
  aberto: boolean
  loading: boolean
  execucoes: Execucao[] | null
  erro: string | null
}
```

- [ ] **Step 2: Adicionar estado `historicos` e handler no componente**

Após `const [msg, setMsg] = useState<string | null>(null)` (linha 72), adicionar:

```ts
  const [historicos, setHistoricos] = useState<Record<string, HistoricoState>>({})

  async function handleToggleHistorico(fonteId: string) {
    const atual = historicos[fonteId]

    if (atual?.aberto) {
      setHistoricos((prev) => ({ ...prev, [fonteId]: { ...atual, aberto: false } }))
      return
    }

    // Se já tem dados, só abre
    if (atual?.execucoes !== null && atual?.execucoes !== undefined) {
      setHistoricos((prev) => ({ ...prev, [fonteId]: { ...atual, aberto: true } }))
      return
    }

    // Fetch
    setHistoricos((prev) => ({
      ...prev,
      [fonteId]: { aberto: true, loading: true, execucoes: null, erro: null },
    }))

    try {
      const res = await fetch(`/api/admin/fontes/${fonteId}/execucoes`)
      if (!res.ok) throw new Error('Erro ao buscar execuções')
      const { execucoes } = await res.json() as { execucoes: Execucao[] }
      setHistoricos((prev) => ({
        ...prev,
        [fonteId]: { aberto: true, loading: false, execucoes, erro: null },
      }))
    } catch (e) {
      setHistoricos((prev) => ({
        ...prev,
        [fonteId]: { aberto: true, loading: false, execucoes: [], erro: String(e) },
      }))
    }
  }
```

- [ ] **Step 3: Adicionar import de `Clock` do lucide-react**

No topo do arquivo, adicionar `Clock` aos imports:

```ts
import { Clock } from 'lucide-react'
```

(O arquivo atualmente não importa do lucide. Se não houver import de lucide, adicionar a linha completa.)

- [ ] **Step 4: Adicionar badge de status helper**

Após os tipos de execução, adicionar:

```ts
const STATUS_BADGE: Record<string, string> = {
  concluido: 'bg-green-100 text-green-700',
  rodando: 'bg-blue-100 text-blue-700',
  erro: 'bg-red-100 text-red-700',
}

function formatDuracao(inicio: string, fim: string | null): string {
  if (!fim) return '—'
  const ms = new Date(fim).getTime() - new Date(inicio).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}
```

- [ ] **Step 5: Modificar a tabela de fontes para incluir botão Histórico e linha expandida**

Atualizar o cabeçalho da tabela (linha 247) para incluir coluna extra:

```tsx
              <th className="text-left py-2">Histórico</th>
```

Atualizar cada `<tr>` de fonte para incluir a célula do botão e a linha de expansão.

Substituir o bloco do `tbody` (linhas 255-269) por:

```tsx
          <tbody>
            {fontes.map((f) => {
              const hist = historicos[f.id]
              return (
                <>
                  <tr key={f.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3">{f.nome}</td>
                    <td className="py-2 pr-3 text-slate-500">{f.tipo}</td>
                    <td className="py-2 pr-3 text-slate-400 truncate max-w-[150px]">{f.endpointBase ?? '—'}</td>
                    <td className="py-2 pr-3 text-slate-400">{f.ultimaSincronizacao ? new Date(f.ultimaSincronizacao).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="py-2 pr-3">
                      <button
                        onClick={() => handleToggleFonte(f.id, f.ativo)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${f.ativo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                      >
                        {f.ativo ? 'ativo' : 'inativo'}
                      </button>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleToggleHistorico(f.id)}
                        className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-[10px]"
                        title="Ver histórico de execuções"
                      >
                        <Clock className="h-3 w-3" />
                        {hist?.aberto ? 'Fechar' : 'Histórico'}
                      </button>
                    </td>
                  </tr>
                  {hist?.aberto && (
                    <tr key={`${f.id}-hist`}>
                      <td colSpan={6} className="pb-3 pt-1 px-2 bg-slate-50">
                        {hist.loading && (
                          /* Loading state: texto simples por simplicidade;
                             o spec pede skeleton de 3 linhas — pode ser melhorado futuramente */
                          <p className="text-xs text-slate-400 italic">Carregando…</p>
                        )}
                        {hist.erro && (
                          <p className="text-xs text-red-500">{hist.erro}</p>
                        )}
                        {!hist.loading && !hist.erro && hist.execucoes !== null && (
                          hist.execucoes.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Nenhuma execução registrada para esta fonte.</p>
                          ) : (
                            <table className="w-full text-[10px] border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-400">
                                  <th className="text-left py-1 pr-2 font-medium">Data</th>
                                  <th className="text-left py-1 pr-2 font-medium">Status</th>
                                  <th className="text-left py-1 pr-2 font-medium">Duração</th>
                                  <th className="text-right py-1 pr-2 font-medium">Lidos</th>
                                  <th className="text-right py-1 pr-2 font-medium">Novos</th>
                                  <th className="text-right py-1 pr-2 font-medium">Atualizados</th>
                                  <th className="text-right py-1 font-medium">Erros</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {hist.execucoes.map((e) => (
                                  <tr key={e.id}>
                                    <td className="py-1 pr-2 text-slate-500 whitespace-nowrap">
                                      {new Date(e.iniciadoEm).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="py-1 pr-2">
                                      <span
                                        className={`px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[e.status] ?? 'bg-gray-50 text-gray-400'}`}
                                        title={e.logResumo ?? undefined}
                                      >
                                        {e.status}
                                      </span>
                                    </td>
                                    <td className="py-1 pr-2 text-slate-400">{formatDuracao(e.iniciadoEm, e.finalizadoEm)}</td>
                                    <td className="py-1 pr-2 text-right text-slate-600">{e.totalLidos}</td>
                                    <td className="py-1 pr-2 text-right text-green-600">{e.totalNovos}</td>
                                    <td className="py-1 pr-2 text-right text-blue-600">{e.totalAtualizados}</td>
                                    <td className="py-1 text-right text-red-500">{e.totalErros}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        )}
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
```

**Nota:** O fragmento `<>...</>` dentro do `.map()` requer que o `tbody` renderize corretamente. Use `React.Fragment key={f.id}` se necessário:

```tsx
            {fontes.map((f) => {
              const hist = historicos[f.id]
              return (
                <React.Fragment key={f.id}>
                  <tr>...</tr>
                  {hist?.aberto && <tr key={`${f.id}-hist`}>...</tr>}
                </React.Fragment>
              )
            })}
```

Adicionar `import React from 'react'` se não estiver presente (Next.js geralmente não requer, mas fragmentos com key precisam de `React.Fragment` explícito).

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 7: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Expected: todos passando

- [ ] **Step 8: Commit**

```bash
git add components/configuracoes/SistemaTab.tsx
git commit -m "feat(sp9): add captacao execution history inline in SistemaTab — SP-9 complete"
```
