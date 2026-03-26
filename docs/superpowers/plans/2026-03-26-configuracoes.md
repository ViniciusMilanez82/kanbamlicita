# Configurações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar a página `/configuracoes` com 3 abas (Perfil, Usuários, Sistema) eliminando a necessidade de código para mudanças operacionais como pesos do score, faixas, segmentos e listas do ParecerTab.

**Architecture:** Novo model singleton `ConfiguracaoSistema` no Prisma armazena pesos/faixas/segmentos/listas. Calculator recebe pesos/faixas como parâmetros com defaults. Page `/configuracoes` é Server Component que verifica role via `auth()` e roteia para 3 abas: PerfilTab (todos), UsuariosTab (admin), SistemaTab (admin). 10 novas API routes cobrem perfil, usuários, sistema e fontes.

**Tech Stack:** TypeScript, Next.js App Router, Prisma, NextAuth (`auth()` de `auth.ts`), bcryptjs, Tailwind CSS, shadcn/ui

---

## File Map

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Modificar | `prisma/schema.prisma` | Adicionar model `ConfiguracaoSistema` |
| Criar | `prisma/migrations/...` | Migration da nova tabela |
| Modificar | `prisma/seed.ts` | Seed do registro `default` |
| Modificar | `lib/score/calculator.ts` | Tipos `ConfigPesos`/`ConfigFaixas`, constantes `PESOS_PADRAO`/`FAIXAS_PADRAO`, parâmetros com defaults em `faixa()` e `calcularScore()` |
| Modificar | `app/licitacoes/[id]/page.tsx` | Carregar `ConfiguracaoSistema` com fallback, passar props para `ScoreTab` e `ParecerTab` |
| Modificar | `components/licitacao/tabs/ScoreTab.tsx` | Receber `configPesos` e `configFaixas` como props, usar nas contas em tempo real e no botão Sugerir |
| Modificar | `components/licitacao/tabs/ParecerTab.tsx` | Receber `listasParecerTab` como prop, substituir constantes hardcoded |
| Criar | `app/api/me/route.ts` | GET/PUT perfil do usuário logado |
| Criar | `app/api/admin/usuarios/route.ts` | GET lista + POST criar usuário |
| Criar | `app/api/admin/usuarios/[id]/route.ts` | PATCH editar nome/senha/role/ativo |
| Criar | `app/api/configuracoes/sistema/route.ts` | GET/PUT singleton `ConfiguracaoSistema` |
| Criar | `app/api/admin/fontes/route.ts` | GET lista + POST criar `CaptacaoFonte` |
| Criar | `app/api/admin/fontes/[id]/route.ts` | PATCH editar `CaptacaoFonte` |
| Criar | `components/configuracoes/PerfilTab.tsx` | Formulário nome + senha |
| Criar | `components/configuracoes/UsuariosTab.tsx` | Tabela + criar/editar/toggle usuários |
| Criar | `components/configuracoes/SistemaTab.tsx` | Pesos, faixas, segmentos, listas parecer, fontes |
| Modificar | `app/configuracoes/page.tsx` | Server Component: auth check + roteamento de abas |

---

## Task 1: Adicionar model `ConfiguracaoSistema` ao schema e rodar migration

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Adicionar model ao schema**

No final de `prisma/schema.prisma`, antes de qualquer comentário de fechamento, adicionar:

```prisma
model ConfiguracaoSistema {
  id               String   @id @default("default")
  pesosScore       Json     @default("{\"aderenciaDireta\":15,\"aderenciaAplicacao\":25,\"contextoOculto\":20,\"modeloComercial\":15,\"potencialEconomico\":15,\"qualidadeEvidencia\":10}")
  faixasScore      Json     @default("{\"aPlus\":85,\"a\":70,\"b\":55,\"c\":40}")
  segmentos        Json     @default("[]")
  listasParecerTab Json     @default("{}")
  criadoEm         DateTime @default(now()) @map("criado_em")
  atualizadoEm     DateTime @updatedAt @map("atualizado_em")

  @@map("configuracao_sistema")
}
```

- [ ] **Step 2: Rodar migration**

```bash
cd C:/Users/vinic/OneDrive/PROJETOS/APPS/kanbamlicita
npx prisma migrate dev --name add-configuracao-sistema
```

Esperado: migration criada e aplicada com sucesso. Prisma regenera o client automaticamente.

- [ ] **Step 3: Adicionar seed do registro default**

Em `prisma/seed.ts`, após as declarações de constantes no topo (antes de `main()`), adicionar:

```ts
const LISTAS_PARECER_TAB = {
  ondeEstaOportunidade: ['objeto', 'tr', 'lotes', 'itens', 'planilha', 'memorial', 'anexo_tecnico'],
  solucoesQueMultiteinerPoderiaOfertar: [
    'containers_adaptados', 'modulos_habitacionais', 'modulos_administrativos',
    'modulos_sanitarios', 'guaritas', 'almoxarifados', 'refeitorios',
    'alojamentos', 'escritorios_de_obra', 'bases_operacionais', 'estruturas_temporarias_modulares',
  ],
  proximoPasosRecomendado: [
    'elaborar_proposta', 'solicitar_esclarecimentos', 'visitar_local', 'contatar_gestor',
    'acompanhar_publicacao', 'montar_consorcio', 'aguardar_nova_edicao',
    'solicitar_visita_tecnica', 'preparar_amostra', 'cadastrar_fornecedor',
  ],
  riscosLimitacoes: [
    'prazo_curto', 'exigencia_tecnica_restritiva', 'capacidade_limitada',
    'concorrencia_acirrada', 'preco_referencia_baixo', 'localizacao_desfavoravel',
    'habilitacao_complexa', 'historico_direcionamento', 'escopo_indefinido', 'dependencia_de_parceiro',
  ],
  evidenciasPrincipais: [
    'mencao_explicita_no_tr', 'mencao_em_item_ou_lote', 'descricao_tecnica_compativel',
    'quantitativo_compativel', 'aderencia_ao_portfolio', 'historico_de_relacionamento',
    'preco_referencia_compativel', 'concorrente_fraco_identificado',
  ],
}
```

Dentro de `main()`, após o bloco de criação de licitações, adicionar:

```ts
  console.log('Criando configuracao do sistema...')
  await prisma.configuracaoSistema.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      pesosScore: { aderenciaDireta: 15, aderenciaAplicacao: 25, contextoOculto: 20, modeloComercial: 15, potencialEconomico: 15, qualidadeEvidencia: 10 },
      faixasScore: { aPlus: 85, a: 70, b: 55, c: 40 },
      segmentos: SEGMENTOS,
      listasParecerTab: LISTAS_PARECER_TAB,
    },
    update: {
      pesosScore: { aderenciaDireta: 15, aderenciaAplicacao: 25, contextoOculto: 20, modeloComercial: 15, potencialEconomico: 15, qualidadeEvidencia: 10 },
      faixasScore: { aPlus: 85, a: 70, b: 55, c: 40 },
      segmentos: SEGMENTOS,
      listasParecerTab: LISTAS_PARECER_TAB,
    },
  })
  console.log('✓ ConfiguracaoSistema criada.')
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: saída vazia.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts
git commit -m "feat(config): add ConfiguracaoSistema model, migration, and seed"
```

---

## Task 2: Atualizar `lib/score/calculator.ts` com tipos e defaults configuráveis

**Files:**
- Modify: `lib/score/calculator.ts`

- [ ] **Step 1: Adicionar tipos e constantes exportados**

No início de `lib/score/calculator.ts`, após os imports existentes e antes de `ScoreSugestao`, adicionar:

```ts
export type ConfigPesos = {
  aderenciaDireta: number
  aderenciaAplicacao: number
  contextoOculto: number
  modeloComercial: number
  potencialEconomico: number
  qualidadeEvidencia: number
}

export type ConfigFaixas = {
  aPlus: number
  a: number
  b: number
  c: number
}

export const PESOS_PADRAO: ConfigPesos = {
  aderenciaDireta: 15,
  aderenciaAplicacao: 25,
  contextoOculto: 20,
  modeloComercial: 15,
  potencialEconomico: 15,
  qualidadeEvidencia: 10,
}

export const FAIXAS_PADRAO: ConfigFaixas = {
  aPlus: 85,
  a: 70,
  b: 55,
  c: 40,
}
```

- [ ] **Step 2: Atualizar `faixa()` para aceitar `ConfigFaixas`**

Trocar a função `faixa()` existente:

```ts
export function faixa(score: number, faixas: ConfigFaixas = FAIXAS_PADRAO): string {
  if (score >= faixas.aPlus) return 'A+'
  if (score >= faixas.a) return 'A'
  if (score >= faixas.b) return 'B'
  if (score >= faixas.c) return 'C'
  return 'D'
}
```

- [ ] **Step 3: Atualizar `calcularScore()` para aceitar pesos e faixas**

Trocar a assinatura e o corpo de `calcularScore()`:

```ts
export function calcularScore(
  analise: AnaliseDetalhe | null,
  analiseIaResult: AnaliseIaResult | null,
  pesos: ConfigPesos = PESOS_PADRAO,
  faixasConfig: ConfigFaixas = FAIXAS_PADRAO
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
    (scoreAderenciaDireta * pesos.aderenciaDireta +
      scoreAderenciaAplicacao * pesos.aderenciaAplicacao +
      scoreContextoOculto * pesos.contextoOculto +
      scoreModeloComercial * pesos.modeloComercial +
      scorePotencialEconomico * pesos.potencialEconomico +
      scoreQualidadeEvidencia * pesos.qualidadeEvidencia) /
    100

  return {
    scoreAderenciaDireta,
    scoreAderenciaAplicacao,
    scoreContextoOculto,
    scoreModeloComercial,
    scorePotencialEconomico,
    scoreQualidadeEvidencia,
    scoreFinal: Math.round(scoreFinal * 100) / 100,
    faixaClassificacao: faixa(scoreFinal, faixasConfig),
  }
}
```

- [ ] **Step 4: Rodar testes existentes para garantir retrocompatibilidade**

```bash
npx jest __tests__/lib/score/calculator.test.ts --no-coverage
```

Esperado: todos os testes passam (os defaults garantem que chamadas com 2 argumentos continuem funcionando).

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: saída vazia.

- [ ] **Step 6: Commit**

```bash
git add lib/score/calculator.ts
git commit -m "feat(config): make score weights and classification thresholds configurable"
```

---

## Task 3: Integrar ConfiguracaoSistema em `page.tsx`, `ScoreTab` e `ParecerTab`

**Files:**
- Modify: `app/licitacoes/[id]/page.tsx`
- Modify: `components/licitacao/tabs/ScoreTab.tsx`
- Modify: `components/licitacao/tabs/ParecerTab.tsx`

- [ ] **Step 1: Atualizar imports e Props de `ScoreTab`**

Em `components/licitacao/tabs/ScoreTab.tsx`, atualizar o import do calculator e o type Props:

```ts
import { calcularScore, faixa, PESOS_PADRAO, FAIXAS_PADRAO } from '@/lib/score/calculator'
import type { ConfigPesos, ConfigFaixas } from '@/lib/score/calculator'
```

Atualizar `type Props`:
```ts
type Props = {
  licitacaoId: string
  score: ScoreDetalhe
  analise: AnaliseDetalhe
  analiseIa: AnaliseIaDetalhe
  configPesos: ConfigPesos
  configFaixas: ConfigFaixas
}
```

Atualizar a desestruturação da função:
```ts
export function ScoreTab({ licitacaoId, score, analise, analiseIa, configPesos, configFaixas }: Props) {
```

- [ ] **Step 2: Usar `configPesos` e `configFaixas` no cálculo em tempo real**

Substituir as linhas 59–66 (cálculo hardcoded de `scoreFinal`):

```ts
  const scoreFinal =
    (aderenciaDireta * configPesos.aderenciaDireta +
      aderenciaAplicacao * configPesos.aderenciaAplicacao +
      contextoOculto * configPesos.contextoOculto +
      modeloComercial * configPesos.modeloComercial +
      potencialEconomico * configPesos.potencialEconomico +
      qualidadeEvidencia * configPesos.qualidadeEvidencia) /
    100
```

- [ ] **Step 3: Usar `configFaixas` no botão Sugerir e nos labels**

Em `handleSugerir`, atualizar a chamada:
```ts
    const sugestao = calcularScore(analise, iaResult, configPesos, configFaixas)
```

Na linha de exibição do score (dentro do JSX), atualizar:
```tsx
<span className="text-sm text-slate-600">
  Score final: <strong>{Math.round(scoreFinal * 100) / 100}</strong> — Faixa: <strong>{faixa(scoreFinal, configFaixas)}</strong>
</span>
```

Na chamada dentro de `handleSalvar` (faixaClassificacao):
```ts
faixaClassificacao: faixa(scoreFinal, configFaixas),
```

- [ ] **Step 4: Atualizar `ParecerTab` para receber `listasParecerTab` como prop**

Em `components/licitacao/tabs/ParecerTab.tsx`:

Remover as 5 constantes hardcoded (`ONDE_ESTA_OPORTUNIDADE`, `SOLUCOES_MULTITEINER`, `PROXIMOS_PASSOS`, `RISCOS_LIMITACOES`, `EVIDENCIAS_PRINCIPAIS`).

Adicionar tipo:
```ts
type ListasParecerTab = {
  ondeEstaOportunidade: string[]
  solucoesQueMultiteinerPoderiaOfertar: string[]
  proximoPasosRecomendado: string[]
  riscosLimitacoes: string[]
  evidenciasPrincipais: string[]
}
```

Atualizar `type Props`:
```ts
type Props = {
  licitacaoId: string
  parecer: ParecerDetalhe
  score: ScoreDetalhe
  listasParecerTab: ListasParecerTab
}
```

Atualizar desestruturação:
```ts
export function ParecerTab({ licitacaoId, parecer, score, listasParecerTab }: Props) {
```

Substituir referências às 5 constantes por `listasParecerTab.ondeEstaOportunidade`, `listasParecerTab.solucoesQueMultiteinerPoderiaOfertar`, etc.

- [ ] **Step 5: Atualizar `app/licitacoes/[id]/page.tsx`**

Adicionar import:
```ts
import { PESOS_PADRAO, FAIXAS_PADRAO } from '@/lib/score/calculator'
import type { ConfigPesos, ConfigFaixas } from '@/lib/score/calculator'
```

Em `getLicitacao()`, carregar config (antes do `return`):
```ts
  const config = await db.configuracaoSistema.findUnique({ where: { id: 'default' } })
  const configPesos = (config?.pesosScore ?? PESOS_PADRAO) as ConfigPesos
  const configFaixas = (config?.faixasScore ?? FAIXAS_PADRAO) as ConfigFaixas
  const listasParecerTab = (config?.listasParecerTab ?? {
    ondeEstaOportunidade: [],
    solucoesQueMultiteinerPoderiaOfertar: [],
    proximoPasosRecomendado: [],
    riscosLimitacoes: [],
    evidenciasPrincipais: [],
  }) as {
    ondeEstaOportunidade: string[]
    solucoesQueMultiteinerPoderiaOfertar: string[]
    proximoPasosRecomendado: string[]
    riscosLimitacoes: string[]
    evidenciasPrincipais: string[]
  }
```

Retornar também `configPesos`, `configFaixas`, `listasParecerTab` do `getLicitacao` (ajustar o tipo de retorno ou usar um objeto separado). A abordagem mais simples: retornar um objeto `{ licitacao, configPesos, configFaixas, listasParecerTab }` da função.

Atualizar a chamada na page:
```ts
  const { licitacao, configPesos, configFaixas, listasParecerTab } = await getLicitacao(id)
```

Atualizar o JSX do `ScoreTab`:
```tsx
<ScoreTab
  licitacaoId={id}
  score={licitacao.score}
  analise={licitacao.analise}
  analiseIa={licitacao.analiseIa}
  configPesos={configPesos}
  configFaixas={configFaixas}
/>
```

Atualizar o JSX do `ParecerTab`:
```tsx
<ParecerTab
  licitacaoId={id}
  parecer={licitacao.parecer}
  score={licitacao.score}
  listasParecerTab={listasParecerTab}
/>
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: saída vazia.

- [ ] **Step 7: Commit**

```bash
git add app/licitacoes/[id]/page.tsx components/licitacao/tabs/ScoreTab.tsx components/licitacao/tabs/ParecerTab.tsx
git commit -m "feat(config): wire configurable pesos/faixas into ScoreTab and listasParecerTab into ParecerTab"
```

---

## Task 4: API `/api/me` — GET e PUT perfil do usuário logado

**Files:**
- Create: `app/api/me/route.ts`

A autenticação usa `auth()` importado de `'@/auth'` (não de `next-auth` direto). Verificar `session?.user?.id` para garantir que o usuário está logado.

- [ ] **Step 1: Criar `app/api/me/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  })
  return NextResponse.json({ user })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { name, senha } = body as { name?: string; senha?: string }

  const data: { name?: string; senha?: string } = {}
  if (name !== undefined) data.name = name
  if (senha) data.senha = await bcrypt.hash(senha, 10)

  const user = await db.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true, role: true },
  })
  return NextResponse.json({ user })
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: saída vazia.

- [ ] **Step 3: Commit**

```bash
git add app/api/me/route.ts
git commit -m "feat(config): add GET/PUT /api/me for user profile"
```

---

## Task 5: API `/api/admin/usuarios` — listar, criar e editar usuários

**Files:**
- Create: `app/api/admin/usuarios/route.ts`
- Create: `app/api/admin/usuarios/[id]/route.ts`

Helper de verificação de admin (inline em cada arquivo — sem criar arquivo extra):
```ts
const session = await auth()
if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })
```

- [ ] **Step 1: Criar `app/api/admin/usuarios/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const usuarios = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, ativo: true, criadoEm: true },
    orderBy: { criadoEm: 'asc' },
  })
  return NextResponse.json({ usuarios })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const { name, email, senha, role } = await req.json() as {
    name: string; email: string; senha: string; role: string
  }

  if (!['user', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Role inválida' }, { status: 400 })
  }

  const senhaHash = await bcrypt.hash(senha, 10)
  const user = await db.user.create({
    data: { name, email, senha: senhaHash, role },
    select: { id: true, name: true, email: true, role: true, ativo: true, criadoEm: true },
  })
  return NextResponse.json({ user }, { status: 201 })
}
```

- [ ] **Step 2: Criar `app/api/admin/usuarios/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as {
    name?: string; senha?: string; role?: string; ativo?: boolean
  }

  if (body.role !== undefined && !['user', 'admin'].includes(body.role)) {
    return NextResponse.json({ error: 'Role inválida' }, { status: 400 })
  }

  // Admin não pode desativar a si mesmo
  if (body.ativo === false && id === session.user.id) {
    return NextResponse.json({ error: 'Não é possível desativar a própria conta' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.role !== undefined) data.role = body.role
  if (body.ativo !== undefined) data.ativo = body.ativo
  if (body.senha) data.senha = await bcrypt.hash(body.senha, 10)

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, ativo: true, criadoEm: true },
  })
  return NextResponse.json({ user })
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: saída vazia.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/usuarios/route.ts "app/api/admin/usuarios/[id]/route.ts"
git commit -m "feat(config): add admin usuarios API (GET/POST/PATCH)"
```

---

## Task 6: APIs de sistema e fontes

**Files:**
- Create: `app/api/configuracoes/sistema/route.ts`
- Create: `app/api/admin/fontes/route.ts`
- Create: `app/api/admin/fontes/[id]/route.ts`

- [ ] **Step 1: Criar `app/api/configuracoes/sistema/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const config = await db.configuracaoSistema.findUnique({ where: { id: 'default' } })
  return NextResponse.json({ config })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const body = await req.json()
  const { pesosScore, faixasScore, segmentos, listasParecerTab } = body

  const config = await db.configuracaoSistema.upsert({
    where: { id: 'default' },
    create: { id: 'default', pesosScore, faixasScore, segmentos, listasParecerTab },
    update: { pesosScore, faixasScore, segmentos, listasParecerTab },
  })
  return NextResponse.json({ config })
}
```

- [ ] **Step 2: Criar `app/api/admin/fontes/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const fontes = await db.captacaoFonte.findMany({
    select: { id: true, nome: true, tipo: true, endpointBase: true, ativo: true, ultimaSincronizacao: true },
    orderBy: { criadoEm: 'asc' },
  })
  return NextResponse.json({ fontes })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const { nome, tipo, endpointBase } = await req.json() as {
    nome: string; tipo: string; endpointBase?: string
  }

  const fonte = await db.captacaoFonte.create({
    data: { nome, tipo, endpointBase },
    select: { id: true, nome: true, tipo: true, endpointBase: true, ativo: true, ultimaSincronizacao: true },
  })
  return NextResponse.json({ fonte }, { status: 201 })
}
```

- [ ] **Step 3: Criar `app/api/admin/fontes/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as { nome?: string; tipo?: string; endpointBase?: string; ativo?: boolean }

  const fonte = await db.captacaoFonte.update({
    where: { id },
    data: body,
    select: { id: true, nome: true, tipo: true, endpointBase: true, ativo: true, ultimaSincronizacao: true },
  })
  return NextResponse.json({ fonte })
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: saída vazia.

- [ ] **Step 5: Commit**

```bash
git add app/api/configuracoes/sistema/route.ts app/api/admin/fontes/route.ts "app/api/admin/fontes/[id]/route.ts"
git commit -m "feat(config): add sistema config and fontes admin APIs"
```

---

## Task 7: Componente `PerfilTab`

**Files:**
- Create: `components/configuracoes/PerfilTab.tsx`

- [ ] **Step 1: Criar `components/configuracoes/PerfilTab.tsx`**

```tsx
'use client'

import { useState } from 'react'

type Props = {
  initialName: string
  email: string
}

export function PerfilTab({ initialName, email }: Props) {
  const [name, setName] = useState(initialName)
  const [senha, setSenha] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleSalvar() {
    setSaving(true)
    setMsg(null)
    try {
      const body: Record<string, string> = { name }
      if (senha) body.senha = senha
      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setSenha('')
      setMsg('Perfil salvo com sucesso.')
    } catch {
      setMsg('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-md">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Meu Perfil</h2>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Email</span>
        <input
          type="email"
          value={email}
          disabled
          className="border border-slate-200 rounded px-2 py-1 text-sm bg-slate-50 text-slate-400"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Nome</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Nova senha (deixe em branco para não alterar)</span>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSalvar}
          disabled={saving}
          className="px-3 py-1.5 text-sm bg-[#1D4ED8] text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        {msg && <p className="text-xs text-slate-500">{msg}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: saída vazia.

- [ ] **Step 3: Commit**

```bash
git add components/configuracoes/PerfilTab.tsx
git commit -m "feat(config): add PerfilTab component"
```

---

## Task 8: Componente `UsuariosTab`

**Files:**
- Create: `components/configuracoes/UsuariosTab.tsx`

- [ ] **Step 1: Criar `components/configuracoes/UsuariosTab.tsx`**

```tsx
'use client'

import { useState } from 'react'

type Usuario = {
  id: string
  name: string | null
  email: string
  role: string
  ativo: boolean
  criadoEm: string
}

type Props = {
  initialUsuarios: Usuario[]
  currentUserId: string
}

export function UsuariosTab({ initialUsuarios, currentUserId }: Props) {
  const [usuarios, setUsuarios] = useState(initialUsuarios)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newSenha, setNewSenha] = useState('')
  const [newRole, setNewRole] = useState('user')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleCreate() {
    setCreating(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, senha: newSenha, role: newRole }),
      })
      if (!res.ok) throw new Error('Erro ao criar')
      const { user } = await res.json()
      setUsuarios((prev) => [...prev, user])
      setShowForm(false)
      setNewName('')
      setNewEmail('')
      setNewSenha('')
      setNewRole('user')
    } catch {
      setMsg('Erro ao criar usuário.')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleAtivo(id: string, ativo: boolean) {
    const res = await fetch(`/api/admin/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !ativo }),
    })
    if (res.ok) {
      const { user } = await res.json()
      setUsuarios((prev) => prev.map((u) => (u.id === id ? user : u)))
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Usuários</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 text-xs bg-[#1D4ED8] text-white rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : 'Novo usuário'}
        </button>
      </div>

      {showForm && (
        <div className="border border-slate-200 rounded p-4 space-y-3 bg-slate-50">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Nome</span>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Email</span>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Senha</span>
              <input type="password" value={newSenha} onChange={(e) => setNewSenha(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Role</span>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm">
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </label>
          </div>
          <button onClick={handleCreate} disabled={creating}
            className="px-3 py-1.5 text-sm bg-[#1D4ED8] text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {creating ? 'Criando…' : 'Criar'}
          </button>
          {msg && <p className="text-xs text-red-500">{msg}</p>}
        </div>
      )}

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="text-left py-2 pr-3">Nome</th>
            <th className="text-left py-2 pr-3">Email</th>
            <th className="text-left py-2 pr-3">Role</th>
            <th className="text-left py-2 pr-3">Status</th>
            <th className="text-left py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} className="border-b border-slate-100">
              <td className="py-2 pr-3">{u.name ?? '—'}</td>
              <td className="py-2 pr-3 text-slate-500">{u.email}</td>
              <td className="py-2 pr-3">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                  {u.role}
                </span>
              </td>
              <td className="py-2 pr-3">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {u.ativo ? 'ativo' : 'inativo'}
                </span>
              </td>
              <td className="py-2">
                <button
                  onClick={() => handleToggleAtivo(u.id, u.ativo)}
                  disabled={u.id === currentUserId}
                  className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {u.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: saída vazia.

- [ ] **Step 3: Commit**

```bash
git add components/configuracoes/UsuariosTab.tsx
git commit -m "feat(config): add UsuariosTab component"
```

---

## Task 9: Componente `SistemaTab`

**Files:**
- Create: `components/configuracoes/SistemaTab.tsx`

- [ ] **Step 1: Criar `components/configuracoes/SistemaTab.tsx`**

```tsx
'use client'

import { useState } from 'react'

type ConfigPesos = {
  aderenciaDireta: number; aderenciaAplicacao: number; contextoOculto: number
  modeloComercial: number; potencialEconomico: number; qualidadeEvidencia: number
}
type ConfigFaixas = { aPlus: number; a: number; b: number; c: number }
type ListasParecerTab = {
  ondeEstaOportunidade: string[]
  solucoesQueMultiteinerPoderiaOfertar: string[]
  proximoPasosRecomendado: string[]
  riscosLimitacoes: string[]
  evidenciasPrincipais: string[]
}
type Fonte = {
  id: string; nome: string; tipo: string; endpointBase: string | null; ativo: boolean; ultimaSincronizacao: string | null
}

type Props = {
  initialPesos: ConfigPesos
  initialFaixas: ConfigFaixas
  initialSegmentos: string[]
  initialListasParecerTab: ListasParecerTab
  initialFontes: Fonte[]
}

function ListaEditor({ label, items, onAdd, onRemove }: {
  label: string
  items: string[]
  onAdd: (v: string) => void
  onRemove: (i: number) => void
}) {
  const [novoItem, setNovoItem] = useState('')
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-slate-600">{label}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-xs">
            {item}
            <button onClick={() => onRemove(i)} className="text-slate-400 hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={novoItem} onChange={(e) => setNovoItem(e.target.value)}
          placeholder="Novo item"
          className="border border-slate-300 rounded px-2 py-1 text-xs"
          onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(novoItem); setNovoItem('') } }} />
        <button onClick={() => { onAdd(novoItem); setNovoItem('') }}
          className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100">
          Adicionar
        </button>
      </div>
    </div>
  )
}

export function SistemaTab({ initialPesos, initialFaixas, initialSegmentos, initialListasParecerTab, initialFontes }: Props) {
  const [pesos, setPesos] = useState(initialPesos)
  const [faixas, setFaixas] = useState(initialFaixas)
  const [segmentos, setSegmentos] = useState(initialSegmentos)
  const [novoSegmento, setNovoSegmento] = useState('')
  const [listas, setListas] = useState(initialListasParecerTab)
  const [fontes, setFontes] = useState(initialFontes)
  const [novaFonteNome, setNovaFonteNome] = useState('')
  const [novaFonteTipo, setNovaFonteTipo] = useState('')
  const [novaFonteEndpoint, setNovaFonteEndpoint] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const somaPesos = Object.values(pesos).reduce((a, b) => a + b, 0)

  async function handleSalvarSistema() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/configuracoes/sistema', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pesosScore: pesos, faixasScore: faixas, segmentos, listasParecerTab: listas }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setMsg('Configurações salvas com sucesso.')
    } catch {
      setMsg('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleFonte(id: string, ativo: boolean) {
    const res = await fetch(`/api/admin/fontes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !ativo }),
    })
    if (res.ok) {
      const { fonte } = await res.json()
      setFontes((prev) => prev.map((f) => (f.id === id ? fonte : f)))
    }
  }

  async function handleCriarFonte() {
    const res = await fetch('/api/admin/fontes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novaFonteNome, tipo: novaFonteTipo, endpointBase: novaFonteEndpoint || undefined }),
    })
    if (res.ok) {
      const { fonte } = await res.json()
      setFontes((prev) => [...prev, fonte])
      setNovaFonteNome('')
      setNovaFonteTipo('')
      setNovaFonteEndpoint('')
    }
  }

  function addToLista(key: keyof ListasParecerTab, value: string) {
    if (!value.trim()) return
    setListas((prev) => ({ ...prev, [key]: [...prev[key], value.trim()] }))
  }

  function removeFromLista(key: keyof ListasParecerTab, index: number) {
    setListas((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }))
  }

  const PESOS_LABELS: Record<keyof ConfigPesos, string> = {
    aderenciaDireta: 'Aderência Direta',
    aderenciaAplicacao: 'Aderência Aplicação',
    contextoOculto: 'Contexto Oculto',
    modeloComercial: 'Modelo Comercial',
    potencialEconomico: 'Potencial Econômico',
    qualidadeEvidencia: 'Qualidade Evidência',
  }

  const LISTAS_LABELS: Record<keyof ListasParecerTab, string> = {
    ondeEstaOportunidade: 'Onde está a oportunidade',
    solucoesQueMultiteinerPoderiaOfertar: 'Soluções Multiteiner',
    proximoPasosRecomendado: 'Próximos passos',
    riscosLimitacoes: 'Riscos e limitações',
    evidenciasPrincipais: 'Evidências principais',
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">

      {/* Pesos do Score */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Pesos do Score</h2>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(pesos) as (keyof ConfigPesos)[]).map((key) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">{PESOS_LABELS[key]}</span>
              <input
                type="number" min={0} max={100}
                value={pesos[key]}
                onChange={(e) => setPesos((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                className="border border-slate-300 rounded px-2 py-1 text-sm"
              />
            </label>
          ))}
        </div>
        <p className={`text-xs ${somaPesos === 100 ? 'text-green-600' : 'text-red-500'}`}>
          Soma: {somaPesos} {somaPesos !== 100 && '(deve ser 100)'}
        </p>
      </section>

      {/* Faixas */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Faixas de Classificação</h2>
        <div className="grid grid-cols-4 gap-3">
          {(['aPlus', 'a', 'b', 'c'] as (keyof ConfigFaixas)[]).map((key) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">{key === 'aPlus' ? 'A+ (mín)' : `${key.toUpperCase()} (mín)`}</span>
              <input
                type="number" min={0} max={100}
                value={faixas[key]}
                onChange={(e) => setFaixas((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                className="border border-slate-300 rounded px-2 py-1 text-sm"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Segmentos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Segmentos</h2>
        <div className="flex flex-wrap gap-2">
          {segmentos.map((s, i) => (
            <span key={i} className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-xs">
              {s}
              <button onClick={() => setSegmentos((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-slate-400 hover:text-red-500">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text" value={novoSegmento} onChange={(e) => setNovoSegmento(e.target.value)}
            placeholder="Novo segmento"
            className="border border-slate-300 rounded px-2 py-1 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') { setSegmentos((p) => [...p, novoSegmento]); setNovoSegmento('') } }}
          />
          <button
            onClick={() => { if (novoSegmento.trim()) { setSegmentos((p) => [...p, novoSegmento.trim()]); setNovoSegmento('') } }}
            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100">
            Adicionar
          </button>
        </div>
      </section>

      {/* Listas do ParecerTab */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Listas do Parecer</h2>
        {(Object.keys(listas) as (keyof ListasParecerTab)[]).map((key) => (
          <ListaEditor
            key={key}
            label={LISTAS_LABELS[key]}
            items={listas[key]}
            onAdd={(v) => addToLista(key, v)}
            onRemove={(i) => removeFromLista(key, i)}
          />
        ))}
      </section>

      {/* Botão salvar sistema */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSalvarSistema}
          disabled={saving || somaPesos !== 100}
          className="px-3 py-1.5 text-sm bg-[#1D4ED8] text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
        {msg && <p className="text-xs text-slate-500">{msg}</p>}
      </div>

      {/* Fontes de Captação */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Fontes de Captação</h2>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="text-left py-2 pr-3">Nome</th>
              <th className="text-left py-2 pr-3">Tipo</th>
              <th className="text-left py-2 pr-3">Endpoint</th>
              <th className="text-left py-2 pr-3">Último sync</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {fontes.map((f) => (
              <tr key={f.id} className="border-b border-slate-100">
                <td className="py-2 pr-3">{f.nome}</td>
                <td className="py-2 pr-3 text-slate-500">{f.tipo}</td>
                <td className="py-2 pr-3 text-slate-400 truncate max-w-[150px]">{f.endpointBase ?? '—'}</td>
                <td className="py-2 pr-3 text-slate-400">{f.ultimaSincronizacao ? new Date(f.ultimaSincronizacao).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="py-2">
                  <button
                    onClick={() => handleToggleFonte(f.id, f.ativo)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${f.ativo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                  >
                    {f.ativo ? 'ativo' : 'inativo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border border-slate-200 rounded p-3 space-y-2 bg-slate-50">
          <p className="text-xs font-medium text-slate-600">Nova fonte</p>
          <div className="grid grid-cols-3 gap-2">
            <input type="text" value={novaFonteNome} onChange={(e) => setNovaFonteNome(e.target.value)}
              placeholder="Nome" className="border border-slate-300 rounded px-2 py-1 text-xs" />
            <input type="text" value={novaFonteTipo} onChange={(e) => setNovaFonteTipo(e.target.value)}
              placeholder="Tipo" className="border border-slate-300 rounded px-2 py-1 text-xs" />
            <input type="text" value={novaFonteEndpoint} onChange={(e) => setNovaFonteEndpoint(e.target.value)}
              placeholder="Endpoint (opcional)" className="border border-slate-300 rounded px-2 py-1 text-xs" />
          </div>
          <button onClick={handleCriarFonte}
            className="px-2 py-1 text-xs bg-[#1D4ED8] text-white rounded hover:bg-blue-700">
            Criar fonte
          </button>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: saída vazia.

- [ ] **Step 3: Commit**

```bash
git add components/configuracoes/SistemaTab.tsx
git commit -m "feat(config): add SistemaTab component"
```

---

## Task 10: Page `/configuracoes` e `ConfigTabs`

**Files:**
- Modify: `app/configuracoes/page.tsx`

- [ ] **Step 1: Reescrever `app/configuracoes/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { TopBar } from '@/components/layout/TopBar'
import { PerfilTab } from '@/components/configuracoes/PerfilTab'
import { UsuariosTab } from '@/components/configuracoes/UsuariosTab'
import { SistemaTab } from '@/components/configuracoes/SistemaTab'
import { PESOS_PADRAO, FAIXAS_PADRAO } from '@/lib/score/calculator'
import type { ConfigPesos, ConfigFaixas } from '@/lib/score/calculator'

const VALID_TABS = ['perfil', 'usuarios', 'sistema'] as const
type Tab = typeof VALID_TABS[number]

type PageProps = {
  searchParams: Promise<{ tab?: string }>
}

export default async function ConfiguracoesPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { tab } = await searchParams
  const isAdmin = session.user.role === 'admin'

  // Redirecionar abas admin para perfil se não for admin
  let activeTab: Tab = (VALID_TABS.includes(tab as Tab) ? tab : 'perfil') as Tab
  if (!isAdmin && (activeTab === 'usuarios' || activeTab === 'sistema')) {
    activeTab = 'perfil'
  }

  // Carregar dados conforme a aba ativa
  const [user, config, usuarios, fontes] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id as string },
      select: { name: true, email: true },
    }),
    isAdmin ? db.configuracaoSistema.findUnique({ where: { id: 'default' } }) : null,
    isAdmin && activeTab === 'usuarios'
      ? db.user.findMany({ select: { id: true, name: true, email: true, role: true, ativo: true, criadoEm: true }, orderBy: { criadoEm: 'asc' } })
      : [],
    isAdmin && activeTab === 'sistema'
      ? db.captacaoFonte.findMany({ select: { id: true, nome: true, tipo: true, endpointBase: true, ativo: true, ultimaSincronizacao: true }, orderBy: { criadoEm: 'asc' } })
      : [],
  ])

  const configPesos = (config?.pesosScore ?? PESOS_PADRAO) as ConfigPesos
  const configFaixas = (config?.faixasScore ?? FAIXAS_PADRAO) as ConfigFaixas
  const segmentos = (config?.segmentos ?? []) as string[]
  const listasParecerTab = (config?.listasParecerTab ?? {
    ondeEstaOportunidade: [], solucoesQueMultiteinerPoderiaOfertar: [],
    proximoPasosRecomendado: [], riscosLimitacoes: [], evidenciasPrincipais: [],
  }) as { ondeEstaOportunidade: string[]; solucoesQueMultiteinerPoderiaOfertar: string[]; proximoPasosRecomendado: string[]; riscosLimitacoes: string[]; evidenciasPrincipais: string[] }

  const TABS: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: 'perfil', label: 'Perfil' },
    { key: 'usuarios', label: 'Usuários', adminOnly: true },
    { key: 'sistema', label: 'Sistema', adminOnly: true },
  ]

  return (
    <>
      <TopBar title="Configurações" />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Barra de abas */}
        <div className="flex border-b border-slate-200 bg-white px-4">
          {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
            <a
              key={t.key}
              href={`/configuracoes?tab=${t.key}`}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-[#1D4ED8] text-[#1D4ED8]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </a>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {activeTab === 'perfil' && (
            <PerfilTab
              initialName={user?.name ?? ''}
              email={user?.email ?? ''}
            />
          )}
          {activeTab === 'usuarios' && isAdmin && (
            <UsuariosTab
              initialUsuarios={usuarios.map((u) => ({ ...u, criadoEm: u.criadoEm.toISOString() }))}
              currentUserId={session.user.id as string}
            />
          )}
          {activeTab === 'sistema' && isAdmin && (
            <SistemaTab
              initialPesos={configPesos}
              initialFaixas={configFaixas}
              initialSegmentos={segmentos}
              initialListasParecerTab={listasParecerTab}
              initialFontes={fontes.map((f) => ({
                ...f,
                ultimaSincronizacao: f.ultimaSincronizacao?.toISOString() ?? null,
              }))}
            />
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: saída vazia.

- [ ] **Step 3: Commit**

```bash
git add app/configuracoes/page.tsx
git commit -m "feat(config): implement /configuracoes page with Perfil, Usuarios, Sistema tabs"
```

---

## Task 11: Build final e lint

- [ ] **Step 1: Rodar lint**

```bash
npm run lint 2>&1 | grep -E "error|Error" | head -20
```

Esperado: zero erros (warnings são aceitáveis se pré-existentes).

- [ ] **Step 2: Rodar build**

```bash
npm run build 2>&1 | tail -20
```

Esperado: `✓ Compiled successfully` sem erros de TypeScript ou de módulo.

- [ ] **Step 3: Verificar que a migração está pendente de push ao banco de produção**

Verificar se o arquivo de migration foi gerado:
```bash
ls prisma/migrations/ | tail -3
```

Esperado: nova pasta `..._add_configuracao_sistema` listada.

- [ ] **Step 4: Commit final se houver arquivos não commitados**

```bash
git status
# Se houver arquivos modificados não commitados, adicionar e commitar
```
