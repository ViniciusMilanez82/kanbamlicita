# SP-A: Modelagem do Banco Fase 2 + Parâmetros Estratégicos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar as tabelas de parâmetros estratégicos, critérios de score e regras de aderência ao banco, criar APIs CRUD com auditoria, resetar o Kanban para as 6 colunas da Fase 2, e construir a tela admin de gerenciamento de parâmetros.

**Architecture:** Migração incremental — novas tabelas Prisma + enums, seed resetado, APIs seguindo o padrão existente (Next.js Route Handlers + getAuthFromRequest), componentes React com React Query + Shadcn UI. Auditoria via tabela dedicada preenchida automaticamente nas mutations de escrita.

**Tech Stack:** Prisma 7 + PostgreSQL, Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Shadcn UI, React Query v5, Sonner toasts.

---

## File Structure

### New Files
| Path | Responsibility |
|---|---|
| `app/api/parametros/route.ts` | CRUD parâmetros estratégicos (GET lista, POST cria) |
| `app/api/parametros/[id]/route.ts` | PUT edita, DELETE desativa parâmetro |
| `app/api/criterios-score/route.ts` | CRUD critérios de score (GET, POST) |
| `app/api/criterios-score/[id]/route.ts` | PUT edita, DELETE desativa critério |
| `app/api/regras-aderencia/route.ts` | CRUD regras de aderência (GET, POST) |
| `app/api/regras-aderencia/[id]/route.ts` | PUT edita, DELETE desativa regra |
| `app/api/auditoria-parametros/route.ts` | GET log de auditoria (filtros: tabela, período) |
| `lib/auditoria.ts` | Helper para registrar auditoria automaticamente |
| `types/parametros.ts` | Types TS para parâmetros, critérios, regras, auditoria |
| `components/configuracoes/ParametrosTab.tsx` | Aba principal de parâmetros com 3 sub-abas |
| `components/configuracoes/ParametrosGeraisSubTab.tsx` | Sub-aba: tabela editável de parâmetros genéricos |
| `components/configuracoes/CriteriosScoreSubTab.tsx` | Sub-aba: critérios de score + config faixas |
| `components/configuracoes/RegrasAderenciaSubTab.tsx` | Sub-aba: regras de aderência com preview |

### Modified Files
| Path | What changes |
|---|---|
| `prisma/schema.prisma` | 4 novas models + 5 enums + campo configuracaoScore em Empresa + relação User→AuditoriaParametro |
| `prisma/seed.ts` | Reset Kanban (6 colunas), seed parâmetros, critérios, regras, configuracaoScore |
| `app/configuracoes/page.tsx` | Adicionar aba "Parâmetros" |
| `types/licitacao.ts` | (não alterado — types novos ficam em arquivo separado) |

---

## Task 1: Schema Prisma — Enums e Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Adicionar os 5 enums ao schema**

Adicionar após o bloco `datasource db` e antes do model `Empresa`:

```prisma
// ==================== ENUMS FASE 2 ====================

enum CategoriaParametro {
  segmento
  categoria_produto
  linha_servico
  palavra_chave_positiva
  palavra_chave_negativa
  regra_modalidade
  regra_orgao
  regra_uf
  criterio_descarte
  criterio_urgencia
  gatilho_risco
}

enum TipoCriterio {
  objetivo
  subjetivo
}

enum TipoRegra {
  inclusao
  exclusao
  condicional
}

enum OperadorRegra {
  igual
  diferente
  contem
  nao_contem
  maior
  menor
  regex
}

enum AcaoAuditoria {
  criacao
  edicao
  exclusao
}
```

- [ ] **Step 2: Adicionar model ParametroEstrategico**

Adicionar após os enums:

```prisma
// ==================== PARÂMETROS ESTRATÉGICOS (FASE 2) ====================

model ParametroEstrategico {
  id         String              @id @default(cuid())
  categoria  CategoriaParametro
  chave      String
  valor      String
  peso       Float?
  descricao  String?             @db.Text
  ativo      Boolean             @default(true)
  ordem      Int                 @default(0)
  criadoEm   DateTime            @default(now()) @map("criado_em")
  atualizadoEm DateTime          @updatedAt @map("atualizado_em")

  @@unique([categoria, chave])
  @@map("parametros_estrategicos")
}
```

- [ ] **Step 3: Adicionar model CriterioScore**

```prisma
model CriterioScore {
  id          String        @id @default(cuid())
  nome        String        @unique
  descricao   String        @db.Text
  tipo        TipoCriterio
  peso        Float
  formulaRef  String?       @map("formula_ref")
  faixaMin    Float?        @map("faixa_min")
  faixaMax    Float?        @map("faixa_max")
  ativo       Boolean       @default(true)
  ordem       Int           @default(0)
  criadoEm    DateTime      @default(now()) @map("criado_em")
  atualizadoEm DateTime     @updatedAt @map("atualizado_em")

  @@map("criterios_score")
}
```

- [ ] **Step 4: Adicionar model RegraAderencia**

```prisma
model RegraAderencia {
  id        String       @id @default(cuid())
  nome      String
  tipo      TipoRegra
  campo     String
  operador  OperadorRegra
  valor     String
  peso      Float?
  ativo     Boolean      @default(true)
  descricao String?      @db.Text
  criadoEm  DateTime     @default(now()) @map("criado_em")
  atualizadoEm DateTime  @updatedAt @map("atualizado_em")

  @@map("regras_aderencia")
}
```

- [ ] **Step 5: Adicionar model AuditoriaParametro e relação com User**

```prisma
model AuditoriaParametro {
  id              String         @id @default(cuid())
  tabela          String
  registroId      String         @map("registro_id")
  campo           String
  valorAnterior   String?        @map("valor_anterior") @db.Text
  valorNovo       String?        @map("valor_novo") @db.Text
  acao            AcaoAuditoria
  alteradoPorId   String         @map("alterado_por_id")
  criadoEm        DateTime       @default(now()) @map("criado_em")

  alteradoPor User @relation(fields: [alteradoPorId], references: [id])

  @@map("auditoria_parametros")
}
```

No model `User`, adicionar a relação (após `kanbanCards KanbanCard[]`):

```prisma
  auditorias AuditoriaParametro[]
```

- [ ] **Step 6: Adicionar campo configuracaoScore em Empresa**

No model `Empresa`, após o campo `iaConfig`, adicionar:

```prisma
  /// Configuração do motor de score (faixas, thresholds, recomendações).
  configuracaoScore Json? @map("configuracao_score")
```

- [ ] **Step 7: Gerar migration e verificar**

Run: `npx prisma migrate dev --name fase2-parametros-estrategicos`
Expected: Migration criada com sucesso, 4 novas tabelas + 5 enums + 1 coluna em empresa.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Phase 2 strategic parameters schema (4 models, 5 enums)"
```

---

## Task 2: Types TypeScript

**Files:**
- Create: `types/parametros.ts`

- [ ] **Step 1: Criar arquivo de types**

```typescript
// ==================== Enums ====================

export type CategoriaParametro =
  | "segmento"
  | "categoria_produto"
  | "linha_servico"
  | "palavra_chave_positiva"
  | "palavra_chave_negativa"
  | "regra_modalidade"
  | "regra_orgao"
  | "regra_uf"
  | "criterio_descarte"
  | "criterio_urgencia"
  | "gatilho_risco";

export const CATEGORIA_LABELS: Record<CategoriaParametro, string> = {
  segmento: "Segmentos de atuação",
  categoria_produto: "Categorias de produto",
  linha_servico: "Linhas de serviço",
  palavra_chave_positiva: "Palavras-chave positivas",
  palavra_chave_negativa: "Palavras-chave negativas",
  regra_modalidade: "Regras por modalidade",
  regra_orgao: "Regras por órgão",
  regra_uf: "Regras por UF",
  criterio_descarte: "Critérios de descarte",
  criterio_urgencia: "Critérios de urgência",
  gatilho_risco: "Gatilhos de risco",
};

export type TipoCriterio = "objetivo" | "subjetivo";

export type TipoRegra = "inclusao" | "exclusao" | "condicional";

export const TIPO_REGRA_LABELS: Record<TipoRegra, string> = {
  inclusao: "Inclusão",
  exclusao: "Exclusão",
  condicional: "Condicional",
};

export type OperadorRegra =
  | "igual"
  | "diferente"
  | "contem"
  | "nao_contem"
  | "maior"
  | "menor"
  | "regex";

export const OPERADOR_LABELS: Record<OperadorRegra, string> = {
  igual: "é igual a",
  diferente: "é diferente de",
  contem: "contém",
  nao_contem: "não contém",
  maior: "é maior que",
  menor: "é menor que",
  regex: "corresponde a (regex)",
};

// ==================== Entities ====================

export interface ParametroEstrategico {
  id: string;
  categoria: CategoriaParametro;
  chave: string;
  valor: string;
  peso: number | null;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriterioScore {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoCriterio;
  peso: number;
  formulaRef: string | null;
  faixaMin: number | null;
  faixaMax: number | null;
  ativo: boolean;
  ordem: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RegraAderencia {
  id: string;
  nome: string;
  tipo: TipoRegra;
  campo: string;
  operador: OperadorRegra;
  valor: string;
  peso: number | null;
  ativo: boolean;
  descricao: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AuditoriaParametro {
  id: string;
  tabela: string;
  registroId: string;
  campo: string;
  valorAnterior: string | null;
  valorNovo: string | null;
  acao: "criacao" | "edicao" | "exclusao";
  alteradoPorId: string;
  alteradoPorNome?: string;
  criadoEm: string;
}

export interface ConfiguracaoScore {
  scoreMinimo: number;
  faixas: {
    A: [number, number];
    B: [number, number];
    C: [number, number];
    D: [number, number];
  };
  recomendacoes: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add types/parametros.ts
git commit -m "feat: add TypeScript types for strategic parameters"
```

---

## Task 3: Helper de Auditoria

**Files:**
- Create: `lib/auditoria.ts`

- [ ] **Step 1: Criar helper de auditoria**

```typescript
import { db } from "@/lib/db";
import type { AcaoAuditoria } from "@/lib/generated/prisma/client";

interface RegistroAuditoria {
  tabela: string;
  registroId: string;
  campo: string;
  valorAnterior?: string | null;
  valorNovo?: string | null;
  acao: AcaoAuditoria;
  alteradoPorId: string;
}

export async function registrarAuditoria(dados: RegistroAuditoria) {
  return db.auditoriaParametro.create({
    data: {
      tabela: dados.tabela,
      registroId: dados.registroId,
      campo: dados.campo,
      valorAnterior: dados.valorAnterior ?? null,
      valorNovo: dados.valorNovo ?? null,
      acao: dados.acao,
      alteradoPorId: dados.alteradoPorId,
    },
  });
}

/**
 * Compara dois objetos e registra auditoria para cada campo que mudou.
 */
export async function registrarAuditoriaDiff(
  tabela: string,
  registroId: string,
  antes: Record<string, unknown>,
  depois: Record<string, unknown>,
  alteradoPorId: string
) {
  const promessas: Promise<unknown>[] = [];

  for (const campo of Object.keys(depois)) {
    const valorAnterior = antes[campo];
    const valorNovo = depois[campo];

    if (String(valorAnterior ?? "") !== String(valorNovo ?? "")) {
      promessas.push(
        registrarAuditoria({
          tabela,
          registroId,
          campo,
          valorAnterior: valorAnterior != null ? String(valorAnterior) : null,
          valorNovo: valorNovo != null ? String(valorNovo) : null,
          acao: "edicao",
          alteradoPorId,
        })
      );
    }
  }

  await Promise.all(promessas);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auditoria.ts
git commit -m "feat: add audit trail helper for parameter changes"
```

---

## Task 4: API — Parâmetros Estratégicos

**Files:**
- Create: `app/api/parametros/route.ts`
- Create: `app/api/parametros/[id]/route.ts`

- [ ] **Step 1: Criar rota GET + POST em /api/parametros/route.ts**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria");

  const where: Record<string, unknown> = { ativo: true };
  if (categoria) where.categoria = categoria;

  const parametros = await db.parametroEstrategico.findMany({
    where,
    orderBy: [{ categoria: "asc" }, { ordem: "asc" }],
  });

  return NextResponse.json(parametros);
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const { categoria, chave, valor, peso, descricao, ordem } = body;

  if (!categoria || !chave || !valor) {
    return NextResponse.json(
      { error: "Categoria, chave e valor são obrigatórios" },
      { status: 400 }
    );
  }

  const parametro = await db.parametroEstrategico.create({
    data: {
      categoria,
      chave,
      valor,
      peso: peso != null ? Number(peso) : null,
      descricao: descricao ?? null,
      ordem: ordem ?? 0,
    },
  });

  await registrarAuditoria({
    tabela: "parametros_estrategicos",
    registroId: parametro.id,
    campo: "*",
    valorNovo: valor,
    acao: "criacao",
    alteradoPorId: auth.userId,
  });

  return NextResponse.json(parametro, { status: 201 });
}
```

- [ ] **Step 2: Criar rota PUT + DELETE em /api/parametros/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { registrarAuditoria, registrarAuditoriaDiff } from "@/lib/auditoria";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { chave, valor, peso, descricao, ativo, ordem } = body;

  const antes = await db.parametroEstrategico.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Parâmetro não encontrado" }, { status: 404 });
  }

  const dados: Record<string, unknown> = {};
  if (chave !== undefined) dados.chave = chave;
  if (valor !== undefined) dados.valor = valor;
  if (peso !== undefined) dados.peso = peso != null ? Number(peso) : null;
  if (descricao !== undefined) dados.descricao = descricao;
  if (ativo !== undefined) dados.ativo = ativo;
  if (ordem !== undefined) dados.ordem = ordem;

  const parametro = await db.parametroEstrategico.update({
    where: { id },
    data: dados,
  });

  await registrarAuditoriaDiff(
    "parametros_estrategicos",
    id,
    antes as unknown as Record<string, unknown>,
    dados,
    auth.userId
  );

  return NextResponse.json(parametro);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const antes = await db.parametroEstrategico.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Parâmetro não encontrado" }, { status: 404 });
  }

  await db.parametroEstrategico.update({
    where: { id },
    data: { ativo: false },
  });

  await registrarAuditoria({
    tabela: "parametros_estrategicos",
    registroId: id,
    campo: "ativo",
    valorAnterior: "true",
    valorNovo: "false",
    acao: "exclusao",
    alteradoPorId: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/parametros/
git commit -m "feat: add CRUD API for strategic parameters with audit"
```

---

## Task 5: API — Critérios de Score

**Files:**
- Create: `app/api/criterios-score/route.ts`
- Create: `app/api/criterios-score/[id]/route.ts`

- [ ] **Step 1: Criar rota GET + POST em /api/criterios-score/route.ts**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const criterios = await db.criterioScore.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
  });

  return NextResponse.json(criterios);
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const { nome, descricao, tipo, peso, formulaRef, faixaMin, faixaMax, ordem } = body;

  if (!nome || !descricao || !tipo || peso == null) {
    return NextResponse.json(
      { error: "Nome, descrição, tipo e peso são obrigatórios" },
      { status: 400 }
    );
  }

  const criterio = await db.criterioScore.create({
    data: {
      nome,
      descricao,
      tipo,
      peso: Number(peso),
      formulaRef: formulaRef ?? null,
      faixaMin: faixaMin != null ? Number(faixaMin) : null,
      faixaMax: faixaMax != null ? Number(faixaMax) : null,
      ordem: ordem ?? 0,
    },
  });

  await registrarAuditoria({
    tabela: "criterios_score",
    registroId: criterio.id,
    campo: "*",
    valorNovo: nome,
    acao: "criacao",
    alteradoPorId: auth.userId,
  });

  return NextResponse.json(criterio, { status: 201 });
}
```

- [ ] **Step 2: Criar rota PUT + DELETE em /api/criterios-score/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { registrarAuditoria, registrarAuditoriaDiff } from "@/lib/auditoria";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { nome, descricao, tipo, peso, formulaRef, faixaMin, faixaMax, ativo, ordem } = body;

  const antes = await db.criterioScore.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Critério não encontrado" }, { status: 404 });
  }

  const dados: Record<string, unknown> = {};
  if (nome !== undefined) dados.nome = nome;
  if (descricao !== undefined) dados.descricao = descricao;
  if (tipo !== undefined) dados.tipo = tipo;
  if (peso !== undefined) dados.peso = Number(peso);
  if (formulaRef !== undefined) dados.formulaRef = formulaRef;
  if (faixaMin !== undefined) dados.faixaMin = faixaMin != null ? Number(faixaMin) : null;
  if (faixaMax !== undefined) dados.faixaMax = faixaMax != null ? Number(faixaMax) : null;
  if (ativo !== undefined) dados.ativo = ativo;
  if (ordem !== undefined) dados.ordem = ordem;

  const criterio = await db.criterioScore.update({
    where: { id },
    data: dados,
  });

  await registrarAuditoriaDiff(
    "criterios_score",
    id,
    antes as unknown as Record<string, unknown>,
    dados,
    auth.userId
  );

  return NextResponse.json(criterio);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const antes = await db.criterioScore.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Critério não encontrado" }, { status: 404 });
  }

  await db.criterioScore.update({
    where: { id },
    data: { ativo: false },
  });

  await registrarAuditoria({
    tabela: "criterios_score",
    registroId: id,
    campo: "ativo",
    valorAnterior: "true",
    valorNovo: "false",
    acao: "exclusao",
    alteradoPorId: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/criterios-score/
git commit -m "feat: add CRUD API for score criteria with audit"
```

---

## Task 6: API — Regras de Aderência

**Files:**
- Create: `app/api/regras-aderencia/route.ts`
- Create: `app/api/regras-aderencia/[id]/route.ts`

- [ ] **Step 1: Criar rota GET + POST em /api/regras-aderencia/route.ts**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const regras = await db.regraAderencia.findMany({
    where: { ativo: true },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(regras);
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const { nome, tipo, campo, operador, valor, peso, descricao } = body;

  if (!nome || !tipo || !campo || !operador || !valor) {
    return NextResponse.json(
      { error: "Nome, tipo, campo, operador e valor são obrigatórios" },
      { status: 400 }
    );
  }

  const regra = await db.regraAderencia.create({
    data: {
      nome,
      tipo,
      campo,
      operador,
      valor,
      peso: peso != null ? Number(peso) : null,
      descricao: descricao ?? null,
    },
  });

  await registrarAuditoria({
    tabela: "regras_aderencia",
    registroId: regra.id,
    campo: "*",
    valorNovo: nome,
    acao: "criacao",
    alteradoPorId: auth.userId,
  });

  return NextResponse.json(regra, { status: 201 });
}
```

- [ ] **Step 2: Criar rota PUT + DELETE em /api/regras-aderencia/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { registrarAuditoria, registrarAuditoriaDiff } from "@/lib/auditoria";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { nome, tipo, campo, operador, valor, peso, ativo, descricao } = body;

  const antes = await db.regraAderencia.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });
  }

  const dados: Record<string, unknown> = {};
  if (nome !== undefined) dados.nome = nome;
  if (tipo !== undefined) dados.tipo = tipo;
  if (campo !== undefined) dados.campo = campo;
  if (operador !== undefined) dados.operador = operador;
  if (valor !== undefined) dados.valor = valor;
  if (peso !== undefined) dados.peso = peso != null ? Number(peso) : null;
  if (ativo !== undefined) dados.ativo = ativo;
  if (descricao !== undefined) dados.descricao = descricao;

  const regra = await db.regraAderencia.update({
    where: { id },
    data: dados,
  });

  await registrarAuditoriaDiff(
    "regras_aderencia",
    id,
    antes as unknown as Record<string, unknown>,
    dados,
    auth.userId
  );

  return NextResponse.json(regra);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const antes = await db.regraAderencia.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });
  }

  await db.regraAderencia.update({
    where: { id },
    data: { ativo: false },
  });

  await registrarAuditoria({
    tabela: "regras_aderencia",
    registroId: id,
    campo: "ativo",
    valorAnterior: "true",
    valorNovo: "false",
    acao: "exclusao",
    alteradoPorId: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/regras-aderencia/
git commit -m "feat: add CRUD API for adherence rules with audit"
```

---

## Task 7: API — Auditoria de Parâmetros

**Files:**
- Create: `app/api/auditoria-parametros/route.ts`

- [ ] **Step 1: Criar rota GET**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tabela = searchParams.get("tabela");
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");
  const registroId = searchParams.get("registroId");

  const where: Record<string, unknown> = {};
  if (tabela) where.tabela = tabela;
  if (registroId) where.registroId = registroId;
  if (de || ate) {
    where.criadoEm = {};
    if (de) (where.criadoEm as Record<string, unknown>).gte = new Date(de);
    if (ate) (where.criadoEm as Record<string, unknown>).lte = new Date(ate);
  }

  const registros = await db.auditoriaParametro.findMany({
    where,
    include: {
      alteradoPor: { select: { name: true, email: true } },
    },
    orderBy: { criadoEm: "desc" },
    take: 100,
  });

  const resultado = registros.map((r) => ({
    ...r,
    alteradoPorNome: r.alteradoPor.name ?? r.alteradoPor.email,
  }));

  return NextResponse.json(resultado);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auditoria-parametros/
git commit -m "feat: add audit log query API for parameters"
```

---

## Task 8: Seed — Reset Kanban + Parâmetros Iniciais

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Reescrever o seed completo**

Substituir o conteúdo inteiro de `prisma/seed.ts`:

```typescript
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL nao definido");
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  // ==================== EMPRESA ====================
  await prisma.empresa.upsert({
    where: { id: "default" },
    update: {
      configuracaoScore: {
        scoreMinimo: 40,
        faixas: { A: [80, 100], B: [60, 79], C: [40, 59], D: [0, 39] },
        recomendacoes: { A: "avancar", B: "acompanhar", C: "acompanhar", D: "descartar" },
      },
    },
    create: {
      id: "default",
      nome: "Multiteiner",
      descricao: "Soluções em contêineres e equipamentos portuários",
      segmento: "Contêineres e Equipamentos Portuários",
      configuracaoScore: {
        scoreMinimo: 40,
        faixas: { A: [80, 100], B: [60, 79], C: [40, 59], D: [0, 39] },
        recomendacoes: { A: "avancar", B: "acompanhar", C: "acompanhar", D: "descartar" },
      },
    },
  });

  // ==================== KANBAN FASE 2 (RESET) ====================
  // Remove cards e movimentações existentes
  await prisma.movimentacao.deleteMany({});
  await prisma.kanbanCard.deleteMany({});
  await prisma.kanbanColuna.deleteMany({});

  const colunasFase2 = [
    { nome: "Captação", ordem: 0, cor: "#6B7280", tipo: "inicial" },
    { nome: "Qualificação", ordem: 1, cor: "#F59E0B", tipo: "normal" },
    { nome: "Análise", ordem: 2, cor: "#3B82F6", tipo: "normal" },
    { nome: "Proposta", ordem: 3, cor: "#8B5CF6", tipo: "normal" },
    { nome: "Disputa", ordem: 4, cor: "#06B6D4", tipo: "normal" },
    { nome: "Pós-resultado", ordem: 5, cor: "#10B981", tipo: "final_positivo" },
  ];

  for (const col of colunasFase2) {
    await prisma.kanbanColuna.create({ data: col });
  }

  // ==================== USUARIO ADMIN ====================
  const adminExists = await prisma.user.findUnique({
    where: { email: "admin@kanbamlicita.com" },
  });

  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: "admin@kanbamlicita.com",
        name: "Administrador",
        senha: await bcrypt.hash("admin123", 10),
        role: "admin",
      },
    });
  }

  // ==================== PARÂMETROS ESTRATÉGICOS ====================
  // Limpa parâmetros existentes para seed idempotente
  await prisma.parametroEstrategico.deleteMany({});

  const parametros = [
    // Segmentos
    { categoria: "segmento" as const, chave: "conteineres-maritimos", valor: "Contêineres Marítimos", ordem: 0 },
    { categoria: "segmento" as const, chave: "equipamentos-portuarios", valor: "Equipamentos Portuários", ordem: 1 },
    { categoria: "segmento" as const, chave: "logistica-transporte", valor: "Logística e Transporte", ordem: 2 },
    { categoria: "segmento" as const, chave: "armazenagem", valor: "Armazenagem", ordem: 3 },

    // Palavras-chave positivas
    { categoria: "palavra_chave_positiva" as const, chave: "conteiner", valor: "contêiner", peso: 10, ordem: 0 },
    { categoria: "palavra_chave_positiva" as const, chave: "container", valor: "container", peso: 10, ordem: 1 },
    { categoria: "palavra_chave_positiva" as const, chave: "reefer", valor: "reefer", peso: 8, ordem: 2 },
    { categoria: "palavra_chave_positiva" as const, chave: "dry", valor: "dry", peso: 6, ordem: 3 },
    { categoria: "palavra_chave_positiva" as const, chave: "equipamento-portuario", valor: "equipamento portuário", peso: 9, ordem: 4 },
    { categoria: "palavra_chave_positiva" as const, chave: "reach-stacker", valor: "reach stacker", peso: 8, ordem: 5 },
    { categoria: "palavra_chave_positiva" as const, chave: "empilhadeira", valor: "empilhadeira", peso: 7, ordem: 6 },
    { categoria: "palavra_chave_positiva" as const, chave: "spreader", valor: "spreader", peso: 8, ordem: 7 },
    { categoria: "palavra_chave_positiva" as const, chave: "guindaste", valor: "guindaste", peso: 7, ordem: 8 },
    { categoria: "palavra_chave_positiva" as const, chave: "portico", valor: "pórtico", peso: 7, ordem: 9 },
    { categoria: "palavra_chave_positiva" as const, chave: "munck", valor: "munck", peso: 6, ordem: 10 },
    { categoria: "palavra_chave_positiva" as const, chave: "plataforma", valor: "plataforma", peso: 5, ordem: 11 },
    { categoria: "palavra_chave_positiva" as const, chave: "icamento", valor: "içamento", peso: 6, ordem: 12 },

    // Palavras-chave negativas
    { categoria: "palavra_chave_negativa" as const, chave: "alimentacao", valor: "alimentação", peso: -10, ordem: 0 },
    { categoria: "palavra_chave_negativa" as const, chave: "medicamento", valor: "medicamento", peso: -10, ordem: 1 },
    { categoria: "palavra_chave_negativa" as const, chave: "veiculo-automotor", valor: "veículo automotor", peso: -8, ordem: 2 },
    { categoria: "palavra_chave_negativa" as const, chave: "mobiliario", valor: "mobiliário", peso: -8, ordem: 3 },
    { categoria: "palavra_chave_negativa" as const, chave: "limpeza", valor: "limpeza", peso: -7, ordem: 4 },
    { categoria: "palavra_chave_negativa" as const, chave: "material-escritorio", valor: "material de escritório", peso: -7, ordem: 5 },
    { categoria: "palavra_chave_negativa" as const, chave: "uniforme", valor: "uniforme", peso: -6, ordem: 6 },
    { categoria: "palavra_chave_negativa" as const, chave: "combustivel", valor: "combustível", peso: -6, ordem: 7 },

    // Regras por modalidade
    { categoria: "regra_modalidade" as const, chave: "pregao-eletronico", valor: "Pregão Eletrônico", peso: 10, ordem: 0 },
    { categoria: "regra_modalidade" as const, chave: "concorrencia", valor: "Concorrência", peso: 5, ordem: 1 },
    { categoria: "regra_modalidade" as const, chave: "tomada-precos", valor: "Tomada de Preços", peso: 3, ordem: 2 },

    // Regras por UF (portuárias)
    { categoria: "regra_uf" as const, chave: "sp", valor: "SP", peso: 10, ordem: 0 },
    { categoria: "regra_uf" as const, chave: "rj", valor: "RJ", peso: 9, ordem: 1 },
    { categoria: "regra_uf" as const, chave: "sc", valor: "SC", peso: 9, ordem: 2 },
    { categoria: "regra_uf" as const, chave: "rs", valor: "RS", peso: 8, ordem: 3 },
    { categoria: "regra_uf" as const, chave: "pr", valor: "PR", peso: 8, ordem: 4 },
    { categoria: "regra_uf" as const, chave: "es", valor: "ES", peso: 7, ordem: 5 },
    { categoria: "regra_uf" as const, chave: "ba", valor: "BA", peso: 7, ordem: 6 },
    { categoria: "regra_uf" as const, chave: "pe", valor: "PE", peso: 6, ordem: 7 },
    { categoria: "regra_uf" as const, chave: "ce", valor: "CE", peso: 6, ordem: 8 },
    { categoria: "regra_uf" as const, chave: "pa", valor: "PA", peso: 7, ordem: 9 },
    { categoria: "regra_uf" as const, chave: "am", valor: "AM", peso: 7, ordem: 10 },
  ];

  for (const p of parametros) {
    await prisma.parametroEstrategico.create({ data: p });
  }

  // ==================== CRITÉRIOS DE SCORE ====================
  await prisma.criterioScore.deleteMany({});

  const criterios = [
    { nome: "aderencia_portfolio", descricao: "Quanto o objeto da licitação se alinha ao portfólio da empresa", tipo: "objetivo" as const, peso: 25, formulaRef: "match_palavras_chave", faixaMin: 0, faixaMax: 100, ordem: 0 },
    { nome: "valor_estimado", descricao: "Atratividade do valor estimado da licitação", tipo: "objetivo" as const, peso: 15, formulaRef: "faixa_valor", faixaMin: 0, faixaMax: 100, ordem: 1 },
    { nome: "modalidade_favoravel", descricao: "Se a modalidade é favorável para a empresa", tipo: "objetivo" as const, peso: 15, formulaRef: "match_modalidade", faixaMin: 0, faixaMax: 100, ordem: 2 },
    { nome: "uf_estrategica", descricao: "Se a UF está na lista de UFs estratégicas da empresa", tipo: "objetivo" as const, peso: 10, formulaRef: "match_uf", faixaMin: 0, faixaMax: 100, ordem: 3 },
    { nome: "prazo_viavel", descricao: "Se há tempo hábil para preparar proposta", tipo: "objetivo" as const, peso: 10, formulaRef: "dias_ate_sessao", faixaMin: 0, faixaMax: 100, ordem: 4 },
    { nome: "complexidade", descricao: "Nível de complexidade documental e operacional", tipo: "subjetivo" as const, peso: 10, faixaMin: 0, faixaMax: 100, ordem: 5 },
    { nome: "historico_orgao", descricao: "Experiência prévia com o órgão licitante", tipo: "subjetivo" as const, peso: 15, faixaMin: 0, faixaMax: 100, ordem: 6 },
  ];

  for (const c of criterios) {
    await prisma.criterioScore.create({ data: c });
  }

  // ==================== REGRAS DE ADERÊNCIA ====================
  await prisma.regraAderencia.deleteMany({});

  const regras = [
    { nome: "Incluir Pregão Eletrônico", tipo: "inclusao" as const, campo: "modalidade", operador: "contem" as const, valor: "Pregão Eletrônico", peso: 20, descricao: "Modalidade mais frequente e com melhor taxa de sucesso" },
    { nome: "Excluir Convite", tipo: "exclusao" as const, campo: "modalidade", operador: "igual" as const, valor: "Convite", peso: -30, descricao: "Modalidade restrita, geralmente não compensa" },
    { nome: "Incluir UFs portuárias", tipo: "inclusao" as const, campo: "uf", operador: "contem" as const, valor: "SP,RJ,SC,RS,PR,ES,BA,PE,CE,PA,AM", peso: 15, descricao: "UFs com portos ativos e demanda para contêineres" },
    { nome: "Excluir alimentação no objeto", tipo: "exclusao" as const, campo: "objeto", operador: "contem" as const, valor: "alimentação", peso: -50, descricao: "Objeto totalmente fora do portfólio" },
  ];

  for (const r of regras) {
    await prisma.regraAderencia.create({ data: r });
  }

  console.log("Seed Fase 2 concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: rewrite seed for Phase 2 (Kanban reset, strategic parameters, score criteria, adherence rules)"
```

---

## Task 9: Componente — ParametrosGeraisSubTab

**Files:**
- Create: `components/configuracoes/ParametrosGeraisSubTab.tsx`

- [ ] **Step 1: Criar componente**

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import type { ParametroEstrategico, CategoriaParametro } from "@/types/parametros";
import { CATEGORIA_LABELS } from "@/types/parametros";

const CATEGORIAS = Object.keys(CATEGORIA_LABELS) as CategoriaParametro[];

export function ParametrosGeraisSubTab() {
  const queryClient = useQueryClient();
  const [categoria, setCategoria] = useState<CategoriaParametro>("segmento");
  const [novoChave, setNovoChave] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoPeso, setNovoPeso] = useState("");

  const { data: parametros = [], isLoading, isError } = useQuery<ParametroEstrategico[]>({
    queryKey: ["parametros", categoria],
    queryFn: async () => {
      const r = await fetch(`/api/parametros?categoria=${categoria}`);
      if (!r.ok) throw new Error("Erro ao carregar parâmetros");
      return r.json();
    },
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["parametros", categoria] });
  }

  const criarMutation = useMutation({
    mutationFn: async () => {
      const chave = novoValor
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const r = await fetch("/api/parametros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria,
          chave: novoChave || chave,
          valor: novoValor,
          peso: novoPeso ? Number(novoPeso) : null,
          ordem: parametros.length,
        }),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao criar");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      setNovoChave("");
      setNovoValor("");
      setNovoPeso("");
      toast.success("Parâmetro adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editarMutation = useMutation({
    mutationFn: async ({ id, ...dados }: Partial<ParametroEstrategico> & { id: string }) => {
      const r = await fetch(`/api/parametros/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao editar");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      toast.success("Parâmetro atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/parametros/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao remover");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      toast.success("Parâmetro removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">Erro ao carregar parâmetros.</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => invalidar()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Seletor de categoria */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
        <select
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaParametro)}
        >
          {CATEGORIAS.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORIA_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de parâmetros */}
      <div className="space-y-2 mb-6">
        {parametros.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-lg border bg-white p-3">
            <input
              className="flex-1 text-sm font-medium border-none bg-transparent outline-none focus:ring-1 focus:ring-blue-300 rounded px-1"
              defaultValue={p.valor}
              onBlur={(e) => {
                if (e.target.value && e.target.value !== p.valor) {
                  editarMutation.mutate({ id: p.id, valor: e.target.value });
                }
              }}
            />
            <input
              className="w-20 text-sm text-center border rounded px-2 py-1"
              type="number"
              defaultValue={p.peso ?? ""}
              placeholder="Peso"
              onBlur={(e) => {
                const novoPesoVal = e.target.value ? Number(e.target.value) : null;
                if (novoPesoVal !== p.peso) {
                  editarMutation.mutate({ id: p.id, peso: novoPesoVal });
                }
              }}
            />
            <button
              onClick={() => {
                if (window.confirm(`Remover "${p.valor}"?`)) {
                  excluirMutation.mutate(p.id);
                }
              }}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {parametros.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhum parâmetro nesta categoria. Adicione o primeiro abaixo.
          </p>
        )}
      </div>

      {/* Formulário para adicionar */}
      <div className="rounded-lg border bg-slate-50 p-4">
        <h4 className="text-sm font-medium mb-3">Adicionar parâmetro</h4>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              placeholder="Valor (ex: Contêineres Marítimos)"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && novoValor) criarMutation.mutate();
              }}
            />
          </div>
          <div className="w-24">
            <Input
              type="number"
              placeholder="Peso"
              value={novoPeso}
              onChange={(e) => setNovoPeso(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={() => criarMutation.mutate()}
            disabled={!novoValor || criarMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/configuracoes/ParametrosGeraisSubTab.tsx
git commit -m "feat: add ParametrosGeraisSubTab component"
```

---

## Task 10: Componente — CriteriosScoreSubTab

**Files:**
- Create: `components/configuracoes/CriteriosScoreSubTab.tsx`

- [ ] **Step 1: Criar componente**

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import type { CriterioScore, TipoCriterio, ConfiguracaoScore } from "@/types/parametros";

export function CriteriosScoreSubTab() {
  const queryClient = useQueryClient();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Form state
  const [formNome, setFormNome] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formTipo, setFormTipo] = useState<TipoCriterio>("objetivo");
  const [formPeso, setFormPeso] = useState("");
  const [formFormulaRef, setFormFormulaRef] = useState("");
  const [formFaixaMin, setFormFaixaMin] = useState("0");
  const [formFaixaMax, setFormFaixaMax] = useState("100");

  const { data: criterios = [], isLoading, isError } = useQuery<CriterioScore[]>({
    queryKey: ["criterios-score"],
    queryFn: async () => {
      const r = await fetch("/api/criterios-score");
      if (!r.ok) throw new Error("Erro ao carregar critérios");
      return r.json();
    },
  });

  const { data: empresa } = useQuery<{ configuracaoScore: ConfiguracaoScore | null }>({
    queryKey: ["empresa"],
    queryFn: async () => {
      const r = await fetch("/api/empresa");
      if (!r.ok) throw new Error("Erro ao carregar empresa");
      return r.json();
    },
  });

  const configScore = empresa?.configuracaoScore;
  const somaPesos = criterios.reduce((acc, c) => acc + c.peso, 0);

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["criterios-score"] });
  }

  function limparForm() {
    setFormNome("");
    setFormDescricao("");
    setFormTipo("objetivo");
    setFormPeso("");
    setFormFormulaRef("");
    setFormFaixaMin("0");
    setFormFaixaMax("100");
    setEditandoId(null);
    setMostrarForm(false);
  }

  function preencherForm(c: CriterioScore) {
    setFormNome(c.nome);
    setFormDescricao(c.descricao);
    setFormTipo(c.tipo);
    setFormPeso(String(c.peso));
    setFormFormulaRef(c.formulaRef ?? "");
    setFormFaixaMin(String(c.faixaMin ?? 0));
    setFormFaixaMax(String(c.faixaMax ?? 100));
    setEditandoId(c.id);
    setMostrarForm(true);
  }

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const dados = {
        nome: formNome,
        descricao: formDescricao,
        tipo: formTipo,
        peso: Number(formPeso),
        formulaRef: formFormulaRef || null,
        faixaMin: Number(formFaixaMin),
        faixaMax: Number(formFaixaMax),
        ordem: editandoId ? undefined : criterios.length,
      };

      const url = editandoId ? `/api/criterios-score/${editandoId}` : "/api/criterios-score";
      const method = editandoId ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao salvar");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      limparForm();
      toast.success(editandoId ? "Critério atualizado" : "Critério adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/criterios-score/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao remover");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      toast.success("Critério removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">Erro ao carregar critérios.</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => invalidar()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Indicador de soma dos pesos */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              somaPesos === 100 ? "bg-green-500" : somaPesos > 100 ? "bg-red-500" : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(somaPesos, 100)}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${
          somaPesos === 100 ? "text-green-600" : somaPesos > 100 ? "text-red-600" : "text-amber-600"
        }`}>
          {somaPesos}/100
        </span>
      </div>

      {/* Lista de critérios */}
      <div className="space-y-2 mb-6">
        {criterios.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-white p-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.nome}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  c.tipo === "objetivo" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                }`}>
                  {c.tipo}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{c.descricao}</p>
            </div>
            <span className="text-sm font-semibold text-slate-700 w-12 text-right">
              {c.peso}%
            </span>
            <button
              onClick={() => preencherForm(c)}
              className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Remover "${c.nome}"?`)) excluirMutation.mutate(c.id);
              }}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {criterios.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhum critério cadastrado. Adicione o primeiro abaixo.
          </p>
        )}
      </div>

      {/* Botão para mostrar form */}
      {!mostrarForm && (
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar critério
        </Button>
      )}

      {/* Formulário de criação/edição */}
      {mostrarForm && (
        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">
              {editandoId ? "Editar critério" : "Novo critério"}
            </h4>
            <button onClick={limparForm} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input placeholder="Nome (ex: aderencia_portfolio)" value={formNome} onChange={(e) => setFormNome(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Textarea placeholder="Descrição do critério" value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tipo</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={formTipo} onChange={(e) => setFormTipo(e.target.value as TipoCriterio)}>
                <option value="objetivo">Objetivo</option>
                <option value="subjetivo">Subjetivo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Peso (%)</label>
              <Input type="number" placeholder="25" value={formPeso} onChange={(e) => setFormPeso(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fórmula (ref)</label>
              <Input placeholder="match_palavras_chave" value={formFormulaRef} onChange={(e) => setFormFormulaRef(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Min</label>
                <Input type="number" value={formFaixaMin} onChange={(e) => setFormFaixaMin(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Max</label>
                <Input type="number" value={formFaixaMax} onChange={(e) => setFormFaixaMax(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={limparForm}>Cancelar</Button>
            <Button
              size="sm"
              onClick={() => salvarMutation.mutate()}
              disabled={!formNome || !formDescricao || !formPeso || salvarMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" /> {editandoId ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </div>
      )}

      {/* Configuração de faixas */}
      {configScore && (
        <div className="mt-6 rounded-lg border bg-slate-50 p-4">
          <h4 className="text-sm font-medium mb-3">Faixas de classificação</h4>
          <div className="grid grid-cols-4 gap-2 text-sm">
            {(["A", "B", "C", "D"] as const).map((faixa) => (
              <div key={faixa} className={`rounded-lg p-2 text-center ${
                faixa === "A" ? "bg-green-100 text-green-700" :
                faixa === "B" ? "bg-blue-100 text-blue-700" :
                faixa === "C" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              }`}>
                <div className="font-bold">{faixa}</div>
                <div className="text-xs">{configScore.faixas[faixa][0]}-{configScore.faixas[faixa][1]}</div>
                <div className="text-xs mt-0.5">{configScore.recomendacoes[faixa]}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/configuracoes/CriteriosScoreSubTab.tsx
git commit -m "feat: add CriteriosScoreSubTab component"
```

---

## Task 11: Componente — RegrasAderenciaSubTab

**Files:**
- Create: `components/configuracoes/RegrasAderenciaSubTab.tsx`

- [ ] **Step 1: Criar componente**

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import type { RegraAderencia, TipoRegra, OperadorRegra } from "@/types/parametros";
import { TIPO_REGRA_LABELS, OPERADOR_LABELS } from "@/types/parametros";

const CAMPOS_LICITACAO = [
  { value: "modalidade", label: "Modalidade" },
  { value: "uf", label: "UF" },
  { value: "objeto", label: "Objeto" },
  { value: "orgao", label: "Órgão" },
  { value: "valorEstimado", label: "Valor estimado" },
  { value: "municipio", label: "Município" },
];

function previewRegra(r: { tipo: TipoRegra; campo: string; operador: OperadorRegra; valor: string; peso: number | null }) {
  const campoLabel = CAMPOS_LICITACAO.find((c) => c.value === r.campo)?.label ?? r.campo;
  const operadorLabel = OPERADOR_LABELS[r.operador];
  const tipoLabel = TIPO_REGRA_LABELS[r.tipo].toLowerCase();
  const pesoStr = r.peso ? ` (peso ${r.peso > 0 ? "+" : ""}${r.peso})` : "";
  return `Se ${campoLabel} ${operadorLabel} "${r.valor}" → ${tipoLabel}${pesoStr}`;
}

export function RegrasAderenciaSubTab() {
  const queryClient = useQueryClient();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [formNome, setFormNome] = useState("");
  const [formTipo, setFormTipo] = useState<TipoRegra>("inclusao");
  const [formCampo, setFormCampo] = useState("modalidade");
  const [formOperador, setFormOperador] = useState<OperadorRegra>("contem");
  const [formValor, setFormValor] = useState("");
  const [formPeso, setFormPeso] = useState("");
  const [formDescricao, setFormDescricao] = useState("");

  const { data: regras = [], isLoading, isError } = useQuery<RegraAderencia[]>({
    queryKey: ["regras-aderencia"],
    queryFn: async () => {
      const r = await fetch("/api/regras-aderencia");
      if (!r.ok) throw new Error("Erro ao carregar regras");
      return r.json();
    },
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["regras-aderencia"] });
  }

  function limparForm() {
    setFormNome("");
    setFormTipo("inclusao");
    setFormCampo("modalidade");
    setFormOperador("contem");
    setFormValor("");
    setFormPeso("");
    setFormDescricao("");
    setEditandoId(null);
    setMostrarForm(false);
  }

  function preencherForm(r: RegraAderencia) {
    setFormNome(r.nome);
    setFormTipo(r.tipo);
    setFormCampo(r.campo);
    setFormOperador(r.operador);
    setFormValor(r.valor);
    setFormPeso(r.peso != null ? String(r.peso) : "");
    setFormDescricao(r.descricao ?? "");
    setEditandoId(r.id);
    setMostrarForm(true);
  }

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const dados = {
        nome: formNome,
        tipo: formTipo,
        campo: formCampo,
        operador: formOperador,
        valor: formValor,
        peso: formPeso ? Number(formPeso) : null,
        descricao: formDescricao || null,
      };

      const url = editandoId ? `/api/regras-aderencia/${editandoId}` : "/api/regras-aderencia";
      const method = editandoId ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao salvar");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      limparForm();
      toast.success(editandoId ? "Regra atualizada" : "Regra adicionada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/regras-aderencia/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao remover");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      toast.success("Regra removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">Erro ao carregar regras.</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => invalidar()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Lista de regras */}
      <div className="space-y-2 mb-6">
        {regras.map((r) => (
          <div key={r.id} className="rounded-lg border bg-white p-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                r.tipo === "inclusao" ? "bg-green-100 text-green-700" :
                r.tipo === "exclusao" ? "bg-red-100 text-red-700" :
                "bg-amber-100 text-amber-700"
              }`}>
                {TIPO_REGRA_LABELS[r.tipo]}
              </span>
              <span className="flex-1 text-sm font-medium">{r.nome}</span>
              <button
                onClick={() => preencherForm(r)}
                className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Remover "${r.nome}"?`)) excluirMutation.mutate(r.id);
                }}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1 ml-14">
              {previewRegra(r)}
            </p>
            {r.descricao && (
              <p className="text-xs text-slate-400 mt-0.5 ml-14 italic">{r.descricao}</p>
            )}
          </div>
        ))}

        {regras.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhuma regra cadastrada. Adicione a primeira abaixo.
          </p>
        )}
      </div>

      {/* Botão para mostrar form */}
      {!mostrarForm && (
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar regra
        </Button>
      )}

      {/* Formulário */}
      {mostrarForm && (
        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">
              {editandoId ? "Editar regra" : "Nova regra"}
            </h4>
            <button onClick={limparForm} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input placeholder="Nome da regra" value={formNome} onChange={(e) => setFormNome(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tipo</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={formTipo} onChange={(e) => setFormTipo(e.target.value as TipoRegra)}>
                <option value="inclusao">Inclusão</option>
                <option value="exclusao">Exclusão</option>
                <option value="condicional">Condicional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Campo</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={formCampo} onChange={(e) => setFormCampo(e.target.value)}>
                {CAMPOS_LICITACAO.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Operador</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={formOperador} onChange={(e) => setFormOperador(e.target.value as OperadorRegra)}>
                {Object.entries(OPERADOR_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Valor</label>
              <Input placeholder="Pregão Eletrônico" value={formValor} onChange={(e) => setFormValor(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Peso</label>
              <Input type="number" placeholder="20" value={formPeso} onChange={(e) => setFormPeso(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Descrição</label>
              <Input placeholder="Justificativa da regra" value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} />
            </div>
          </div>

          {/* Preview */}
          {formCampo && formOperador && formValor && (
            <div className="mt-3 rounded bg-white border p-2 text-xs text-slate-600">
              {previewRegra({
                tipo: formTipo,
                campo: formCampo,
                operador: formOperador,
                valor: formValor,
                peso: formPeso ? Number(formPeso) : null,
              })}
            </div>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={limparForm}>Cancelar</Button>
            <Button
              size="sm"
              onClick={() => salvarMutation.mutate()}
              disabled={!formNome || !formValor || salvarMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" /> {editandoId ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/configuracoes/RegrasAderenciaSubTab.tsx
git commit -m "feat: add RegrasAderenciaSubTab component with rule preview"
```

---

## Task 12: Componente — ParametrosTab (container com sub-abas)

**Files:**
- Create: `components/configuracoes/ParametrosTab.tsx`

- [ ] **Step 1: Criar componente container**

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ParametrosGeraisSubTab } from "./ParametrosGeraisSubTab";
import { CriteriosScoreSubTab } from "./CriteriosScoreSubTab";
import { RegrasAderenciaSubTab } from "./RegrasAderenciaSubTab";

const SUB_TABS = [
  { id: "gerais", label: "Parâmetros gerais" },
  { id: "score", label: "Critérios de score" },
  { id: "aderencia", label: "Regras de aderência" },
];

export function ParametrosTab() {
  const [subTab, setSubTab] = useState("gerais");

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Configure os parâmetros estratégicos que orientam a captação, qualificação e análise de licitações.
      </p>

      <div className="flex gap-1 mb-6 border-b">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              subTab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "gerais" && <ParametrosGeraisSubTab />}
      {subTab === "score" && <CriteriosScoreSubTab />}
      {subTab === "aderencia" && <RegrasAderenciaSubTab />}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/configuracoes/ParametrosTab.tsx
git commit -m "feat: add ParametrosTab container with sub-tabs"
```

---

## Task 13: Integrar aba Parâmetros na página de Configurações

**Files:**
- Modify: `app/configuracoes/page.tsx`

- [ ] **Step 1: Adicionar import e tab**

No array `TABS`, adicionar após o item `usuarios`:

```typescript
  { id: "parametros", label: "Parâmetros" },
```

Adicionar import no topo:

```typescript
import { ParametrosTab } from "@/components/configuracoes/ParametrosTab";
```

Na renderização condicional, adicionar após `{tab === "usuarios" && <UsuariosTab />}`:

```tsx
      {tab === "parametros" && <ParametrosTab />}
```

- [ ] **Step 2: Verificar build**

Run: `npx next build`
Expected: Build completes without errors.

- [ ] **Step 3: Commit**

```bash
git add app/configuracoes/page.tsx
git commit -m "feat: integrate strategic parameters tab in settings page"
```

---

## Task 14: Verificação Final

- [ ] **Step 1: Rodar migration e seed**

```bash
npx prisma migrate dev --name fase2-parametros-estrategicos
npx prisma db seed
```

Expected: Migration applied, seed runs successfully with "Seed Fase 2 concluído!" output.

- [ ] **Step 2: Verificar build**

Run: `npx next build`
Expected: Build completes without errors.

- [ ] **Step 3: Testar manualmente**

1. Acessar `/configuracoes` → aba "Parâmetros" deve aparecer
2. Sub-aba "Parâmetros gerais" → dropdown de categorias, lista de segmentos do seed
3. Adicionar/editar/remover parâmetro → toast de confirmação
4. Sub-aba "Critérios de score" → 7 critérios do seed, barra de peso 100/100
5. Sub-aba "Regras de aderência" → 4 regras do seed com preview em linguagem natural
6. Verificar no banco: `SELECT * FROM auditoria_parametros` deve ter registros após edições

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat: complete SP-A - Phase 2 database modeling and strategic parameters"
```
