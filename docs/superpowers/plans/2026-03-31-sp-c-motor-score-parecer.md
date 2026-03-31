# SP-C: Motor de Score + Analise + Parecer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build qualitative analysis (manual + AI), score engine with 6 components, capturable value, false negative detection, commercial opinion, and a dedicated licitacao detail page.

**Architecture:** 4 new Prisma models (LicitacaoAnalise, LicitacaoAnaliseIa, LicitacaoScore, LicitacaoParecer) with 1:1 relations to Licitacao. Server-side score calculator in `lib/score/`. IA analysis reuses existing provider factory. Drawer gets summary section; new page `/licitacoes/[id]` with 3 tabs (Analise, Score, Parecer).

**Tech Stack:** Prisma 7.5 (PostgreSQL), Next.js 16 App Router, React 19, TanStack Query v5, Shadcn UI, Sonner toasts, Lucide icons, existing IA provider factory (`lib/ia/`).

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `lib/score/calculator.ts` | `calcularScore()` — server-side score calculation from analysis data |
| `lib/score/analise-ia.ts` | `analisarComIa()` — triggers AI analysis using existing provider factory |
| `lib/score/types.ts` | TypeScript types for score, analysis, parecer |
| `app/api/licitacoes/[id]/analise/route.ts` | GET + PUT analysis |
| `app/api/licitacoes/[id]/analise/ia/route.ts` | POST trigger AI analysis |
| `app/api/licitacoes/[id]/score/route.ts` | GET + PUT score |
| `app/api/licitacoes/[id]/score/calcular/route.ts` | POST calculate score suggestion |
| `app/api/licitacoes/[id]/parecer/route.ts` | GET + PUT parecer |
| `app/licitacoes/[id]/page.tsx` | Dedicated licitacao page with sidebar + 3 tabs |
| `components/licitacao/AnaliseTab.tsx` | Analysis form (manual fields + AI trigger) |
| `components/licitacao/ScoreTab.tsx` | Score display/edit + valor capturavel + falso negativo |
| `components/licitacao/ParecerTab.tsx` | Commercial opinion form |
| `components/licitacao/LicitacaoSidebar.tsx` | Sidebar with licitacao general data |
| `components/licitacao/ListaEditavel.tsx` | Reusable add/remove string list component (for parecer JSON arrays) |

### Modified Files

| File | Changes |
|---|---|
| `prisma/schema.prisma` | Add 4 models + 4 relations on Licitacao |
| `components/detalhe/LicitacaoDrawer.tsx` | Add score/parecer summary section with link to detail page |

---

### Task 1: Schema — 4 New Models + Licitacao Relations

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add LicitacaoAnalise model**

Add before the `// ==================== IA ====================` section:

```prisma
// ==================== ANALISE / SCORE / PARECER (FASE 2 - SP-C) ====================

model LicitacaoAnalise {
  id                        String    @id @default(cuid())
  licitacaoId               String    @unique @map("licitacao_id")
  aderenciaDiretaExiste     Boolean?  @map("aderencia_direta_existe")
  aderenciaDiretaNivel      String?   @map("aderencia_direta_nivel")
  aderenciaAplicacaoExiste  Boolean?  @map("aderencia_aplicacao_existe")
  aderenciaAplicacaoNivel   String?   @map("aderencia_aplicacao_nivel")
  contextoOcultoExiste      Boolean?  @map("contexto_oculto_existe")
  contextoOcultoNivel       String?   @map("contexto_oculto_nivel")
  oportunidadeOcultaExiste  Boolean?  @map("oportunidade_oculta_existe")
  oportunidadeOcultaForca   String?   @map("oportunidade_oculta_forca")
  oportunidadeOcultaResumo  String?   @map("oportunidade_oculta_resumo") @db.Text
  oportunidadeNoObjeto      Boolean   @default(false) @map("oportunidade_no_objeto")
  oportunidadeNoTr          Boolean   @default(false) @map("oportunidade_no_tr")
  oportunidadeNosLotes      Boolean   @default(false) @map("oportunidade_nos_lotes")
  oportunidadeNosItens      Boolean   @default(false) @map("oportunidade_nos_itens")
  oportunidadeNaPlanilha    Boolean   @default(false) @map("oportunidade_na_planilha")
  oportunidadeNoMemorial    Boolean   @default(false) @map("oportunidade_no_memorial")
  oportunidadeEmAnexoTecnico Boolean  @default(false) @map("oportunidade_em_anexo_tecnico")
  criadoEm                  DateTime  @default(now()) @map("criado_em")
  atualizadoEm              DateTime  @updatedAt @map("atualizado_em")

  licitacao Licitacao @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("licitacoes_analise")
}

model LicitacaoAnaliseIa {
  id            String    @id @default(cuid())
  licitacaoId   String    @unique @map("licitacao_id")
  status        String
  resultadoJson Json?     @map("resultado_json")
  modelo        String?
  erro          String?   @db.Text
  criadoEm      DateTime  @default(now()) @map("criado_em")
  atualizadoEm  DateTime  @updatedAt @map("atualizado_em")

  licitacao Licitacao @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("licitacoes_analise_ia")
}

model LicitacaoScore {
  id                          String    @id @default(cuid())
  licitacaoId                 String    @unique @map("licitacao_id")
  scoreFinal                  Float     @map("score_final")
  classificacao               String
  scoreAderenciaDireta        Float?    @map("score_aderencia_direta")
  scoreAderenciaAplicacao     Float?    @map("score_aderencia_aplicacao")
  scoreContextoOculto         Float?    @map("score_contexto_oculto")
  scoreModeloComercial        Float?    @map("score_modelo_comercial")
  scorePotencialEconomico     Float?    @map("score_potencial_economico")
  scoreQualidadeEvidencia     Float?    @map("score_qualidade_evidencia")
  scoreJustificativaResumida  String?   @map("score_justificativa_resumida") @db.Text
  valorCapturavelEstimado     Decimal?  @map("valor_capturavel_estimado") @db.Decimal(15, 2)
  valorCapturavelFaixaMin     Decimal?  @map("valor_capturavel_faixa_min") @db.Decimal(15, 2)
  valorCapturavelFaixaMax     Decimal?  @map("valor_capturavel_faixa_max") @db.Decimal(15, 2)
  valorCapturavelMoeda        String    @default("BRL") @map("valor_capturavel_moeda")
  valorCapturavelNivelConfianca String? @map("valor_capturavel_nivel_confianca")
  valorCapturavelMetodoEstimativa String? @map("valor_capturavel_metodo_estimativa")
  valorCapturavelJustificativa String?  @map("valor_capturavel_justificativa") @db.Text
  valorCapturavelBaseDocumental Json?   @map("valor_capturavel_base_documental")
  valorCapturavelObservacao   String?   @map("valor_capturavel_observacao") @db.Text
  falsoNegativoExisteRisco    Boolean   @default(false) @map("falso_negativo_existe_risco")
  falsoNegativoNivelRisco     String?   @map("falso_negativo_nivel_risco")
  falsoNegativoMotivos        Json?     @map("falso_negativo_motivos")
  falsoNegativoTrechosCriticos Json?    @map("falso_negativo_trechos_criticos")
  falsoNegativoResumo         String?   @map("falso_negativo_resumo") @db.Text
  criadoEm                    DateTime  @default(now()) @map("criado_em")
  atualizadoEm                DateTime  @updatedAt @map("atualizado_em")

  licitacao Licitacao @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("licitacoes_score")
}

model LicitacaoParecer {
  id                          String    @id @default(cuid())
  licitacaoId                 String    @unique @map("licitacao_id")
  classificacaoFinal          String?   @map("classificacao_final")
  prioridadeComercial         String?   @map("prioridade_comercial")
  valeEsforcoComercial        Boolean?  @map("vale_esforco_comercial")
  recomendacaoFinal           String?   @map("recomendacao_final") @db.Text
  resumo                      String?   @db.Text
  oportunidadeDireta          Boolean   @default(false) @map("oportunidade_direta")
  oportunidadeIndireta        Boolean   @default(false) @map("oportunidade_indireta")
  oportunidadeOcultaItemLoteAnexo Boolean @default(false) @map("oportunidade_oculta_item_lote_anexo")
  oportunidadeInexistente     Boolean   @default(false) @map("oportunidade_inexistente")
  riscoFalsoPositivo          Boolean   @default(false) @map("risco_falso_positivo")
  riscoFalsoNegativoSoTitulo  Boolean   @default(false) @map("risco_falso_negativo_so_titulo")
  ondeEstaOportunidade        Json?     @map("onde_esta_oportunidade")
  solucoesQueMultiteinerPoderiaOfertar Json? @map("solucoes_que_multiteiner_poderia_ofertar")
  proximoPasosRecomendado     Json?     @map("proximo_pasos_recomendado")
  riscosLimitacoes            Json?     @map("riscos_limitacoes")
  evidenciasPrincipais        Json?     @map("evidencias_principais")
  criadoEm                    DateTime  @default(now()) @map("criado_em")
  atualizadoEm                DateTime  @updatedAt @map("atualizado_em")

  licitacao Licitacao @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("licitacoes_parecer")
}
```

- [ ] **Step 2: Add 4 relations to Licitacao model**

In the existing `Licitacao` model, after the `itensCaptados ItemCaptado[]` relation, add:

```prisma
  analise   LicitacaoAnalise?
  analiseIa LicitacaoAnaliseIa?
  score     LicitacaoScore?
  parecer   LicitacaoParecer?
```

- [ ] **Step 3: Push schema and regenerate**

Run: `npx prisma db push`
Then: `npx prisma generate`

- [ ] **Step 4: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(sp-c): add LicitacaoAnalise, LicitacaoAnaliseIa, LicitacaoScore, LicitacaoParecer models"
```

---

### Task 2: Score Types

**Files:**
- Create: `lib/score/types.ts`

- [ ] **Step 1: Create types file**

```typescript
export type NivelAnalise = "alta" | "media" | "baixa" | "nenhuma";

export type AnaliseData = {
  aderenciaDiretaExiste?: boolean | null;
  aderenciaDiretaNivel?: NivelAnalise | null;
  aderenciaAplicacaoExiste?: boolean | null;
  aderenciaAplicacaoNivel?: NivelAnalise | null;
  contextoOcultoExiste?: boolean | null;
  contextoOcultoNivel?: NivelAnalise | null;
  oportunidadeOcultaExiste?: boolean | null;
  oportunidadeOcultaForca?: NivelAnalise | null;
  oportunidadeOcultaResumo?: string | null;
  oportunidadeNoObjeto?: boolean;
  oportunidadeNoTr?: boolean;
  oportunidadeNosLotes?: boolean;
  oportunidadeNosItens?: boolean;
  oportunidadeNaPlanilha?: boolean;
  oportunidadeNoMemorial?: boolean;
  oportunidadeEmAnexoTecnico?: boolean;
};

export type AnaliseIaResultado = {
  aderenciaDiretaExiste: boolean;
  aderenciaDiretaNivel: NivelAnalise;
  aderenciaDiretaJustificativa?: string;
  aderenciaAplicacaoExiste: boolean;
  aderenciaAplicacaoNivel: NivelAnalise;
  aderenciaAplicacaoJustificativa?: string;
  contextoOcultoExiste: boolean;
  contextoOcultoNivel: NivelAnalise;
  contextoOcultoJustificativa?: string;
  oportunidadeOcultaExiste: boolean;
  oportunidadeOcultaForca: NivelAnalise;
  oportunidadeOcultaResumo?: string;
  oportunidadeNoObjeto: boolean;
  oportunidadeNoTr: boolean;
  oportunidadeNosLotes: boolean;
  oportunidadeNosItens: boolean;
  oportunidadeNaPlanilha: boolean;
  oportunidadeNoMemorial: boolean;
  oportunidadeEmAnexoTecnico: boolean;
};

export type ScoreComponentes = {
  scoreAderenciaDireta: number;
  scoreAderenciaAplicacao: number;
  scoreContextoOculto: number;
  scoreModeloComercial: number;
  scorePotencialEconomico: number;
  scoreQualidadeEvidencia: number;
};

export type ScoreResultado = {
  scoreFinal: number;
  classificacao: string;
  componentes: ScoreComponentes;
  justificativaResumida: string;
};

export const PESOS_COMPONENTES = {
  scoreAderenciaDireta: 0.15,
  scoreAderenciaAplicacao: 0.25,
  scoreContextoOculto: 0.20,
  scoreModeloComercial: 0.15,
  scorePotencialEconomico: 0.15,
  scoreQualidadeEvidencia: 0.10,
} as const;

export const NIVEL_VALORES: Record<string, number> = {
  alta: 100,
  media: 60,
  baixa: 30,
  nenhuma: 0,
};

export const CLASSIFICACAO_FAIXAS = [
  { min: 85, label: "A+" },
  { min: 70, label: "A" },
  { min: 55, label: "B" },
  { min: 40, label: "C" },
  { min: 0, label: "D" },
] as const;
```

- [ ] **Step 2: Commit**

```bash
git add lib/score/types.ts
git commit -m "feat(sp-c): add score types and constants"
```

---

### Task 3: Score Calculator

**Files:**
- Create: `lib/score/calculator.ts`

- [ ] **Step 1: Create the calculator**

```typescript
import type { AnaliseData, AnaliseIaResultado, ScoreResultado } from "./types";
import { PESOS_COMPONENTES, NIVEL_VALORES, CLASSIFICACAO_FAIXAS } from "./types";

function nivelParaValor(nivel: string | null | undefined): number {
  if (!nivel) return 0;
  return NIVEL_VALORES[nivel] ?? 0;
}

function contarFlagsOportunidade(analise: AnaliseData): number {
  const flags = [
    analise.oportunidadeNoObjeto,
    analise.oportunidadeNoTr,
    analise.oportunidadeNosLotes,
    analise.oportunidadeNosItens,
    analise.oportunidadeNaPlanilha,
    analise.oportunidadeNoMemorial,
    analise.oportunidadeEmAnexoTecnico,
  ];
  return flags.filter(Boolean).length;
}

function classificar(score: number): string {
  for (const faixa of CLASSIFICACAO_FAIXAS) {
    if (score >= faixa.min) return faixa.label;
  }
  return "D";
}

export function calcularScore(
  analise: AnaliseData,
  analiseIa?: AnaliseIaResultado | null,
  valorEstimadoLicitacao?: number | null
): ScoreResultado {
  // Merge: manual tem prioridade, IA como fallback
  const aderenciaDiretaNivel =
    analise.aderenciaDiretaNivel ?? analiseIa?.aderenciaDiretaNivel ?? null;
  const aderenciaAplicacaoNivel =
    analise.aderenciaAplicacaoNivel ?? analiseIa?.aderenciaAplicacaoNivel ?? null;
  const contextoOcultoNivel =
    analise.contextoOcultoNivel ?? analiseIa?.contextoOcultoNivel ?? null;
  const oportunidadeOcultaForca =
    analise.oportunidadeOcultaForca ?? analiseIa?.oportunidadeOcultaForca ?? null;

  // Merge flags: manual OR ia
  const mergedAnalise: AnaliseData = {
    ...analise,
    oportunidadeNoObjeto: analise.oportunidadeNoObjeto || analiseIa?.oportunidadeNoObjeto || false,
    oportunidadeNoTr: analise.oportunidadeNoTr || analiseIa?.oportunidadeNoTr || false,
    oportunidadeNosLotes: analise.oportunidadeNosLotes || analiseIa?.oportunidadeNosLotes || false,
    oportunidadeNosItens: analise.oportunidadeNosItens || analiseIa?.oportunidadeNosItens || false,
    oportunidadeNaPlanilha: analise.oportunidadeNaPlanilha || analiseIa?.oportunidadeNaPlanilha || false,
    oportunidadeNoMemorial: analise.oportunidadeNoMemorial || analiseIa?.oportunidadeNoMemorial || false,
    oportunidadeEmAnexoTecnico: analise.oportunidadeEmAnexoTecnico || analiseIa?.oportunidadeEmAnexoTecnico || false,
  };

  const flagsCount = contarFlagsOportunidade(mergedAnalise);

  // Componente 1: Aderência direta (15%)
  const scoreAderenciaDireta = nivelParaValor(aderenciaDiretaNivel);

  // Componente 2: Aderência por aplicação (25%)
  const scoreAderenciaAplicacao = nivelParaValor(aderenciaAplicacaoNivel);

  // Componente 3: Contexto oculto (20%)
  const scoreContextoOculto = nivelParaValor(contextoOcultoNivel);

  // Componente 4: Modelo comercial (15%)
  const baseModelo = nivelParaValor(oportunidadeOcultaForca);
  const bonusFlags = Math.min(flagsCount * 10, 100);
  const scoreModeloComercial = Math.min(Math.round((baseModelo + bonusFlags) / 2), 100);

  // Componente 5: Potencial econômico (15%)
  let scorePotencialEconomico = 20;
  if (valorEstimadoLicitacao != null && valorEstimadoLicitacao > 0) {
    if (valorEstimadoLicitacao >= 5_000_000) scorePotencialEconomico = 100;
    else if (valorEstimadoLicitacao >= 1_000_000) scorePotencialEconomico = 90;
    else if (valorEstimadoLicitacao >= 500_000) scorePotencialEconomico = 70;
    else scorePotencialEconomico = 50;
  }

  // Componente 6: Qualidade da evidência (10%)
  const scoreQualidadeEvidencia = Math.round((flagsCount / 7) * 100);

  // Score final = média ponderada
  const componentes = {
    scoreAderenciaDireta,
    scoreAderenciaAplicacao,
    scoreContextoOculto,
    scoreModeloComercial,
    scorePotencialEconomico,
    scoreQualidadeEvidencia,
  };

  const scoreFinal = Math.round(
    Object.entries(PESOS_COMPONENTES).reduce((sum, [key, peso]) => {
      return sum + (componentes[key as keyof typeof componentes] ?? 0) * peso;
    }, 0)
  );

  const classificacao = classificar(scoreFinal);

  // Justificativa
  const labels: Record<string, string> = {
    scoreAderenciaDireta: "Aderência direta",
    scoreAderenciaAplicacao: "Aderência aplicação",
    scoreContextoOculto: "Contexto oculto",
    scoreModeloComercial: "Modelo comercial",
    scorePotencialEconomico: "Potencial econômico",
    scoreQualidadeEvidencia: "Qualidade evidência",
  };

  const justificativaResumida = Object.entries(componentes)
    .map(([key, valor]) => {
      const peso = PESOS_COMPONENTES[key as keyof typeof PESOS_COMPONENTES];
      const contribuicao = Math.round(valor * peso);
      return `${labels[key]} ${valor}/100 (${contribuicao} pts)`;
    })
    .join(", ");

  return {
    scoreFinal,
    classificacao,
    componentes,
    justificativaResumida: `Score ${scoreFinal} (${classificacao}): ${justificativaResumida}`,
  };
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/score/calculator.ts
git commit -m "feat(sp-c): add server-side score calculator"
```

---

### Task 4: IA Analysis Function

**Files:**
- Create: `lib/score/analise-ia.ts`

- [ ] **Step 1: Create the AI analysis function**

```typescript
import { db } from "@/lib/db";
import { getIaProvider } from "@/lib/ia/factory";
import type { AnaliseIaResultado } from "./types";

const SYSTEM_PROMPT = `Você é um analista especializado em licitações públicas brasileiras, avaliando oportunidades para uma empresa de contêineres e equipamentos portuários.

Analise a licitação fornecida e retorne um JSON com a seguinte estrutura exata:

{
  "aderenciaDiretaExiste": boolean,
  "aderenciaDiretaNivel": "alta" | "media" | "baixa" | "nenhuma",
  "aderenciaDiretaJustificativa": "string",
  "aderenciaAplicacaoExiste": boolean,
  "aderenciaAplicacaoNivel": "alta" | "media" | "baixa" | "nenhuma",
  "aderenciaAplicacaoJustificativa": "string",
  "contextoOcultoExiste": boolean,
  "contextoOcultoNivel": "alta" | "media" | "baixa" | "nenhuma",
  "contextoOcultoJustificativa": "string",
  "oportunidadeOcultaExiste": boolean,
  "oportunidadeOcultaForca": "alta" | "media" | "baixa" | "nenhuma",
  "oportunidadeOcultaResumo": "string",
  "oportunidadeNoObjeto": boolean,
  "oportunidadeNoTr": boolean,
  "oportunidadeNosLotes": boolean,
  "oportunidadeNosItens": boolean,
  "oportunidadeNaPlanilha": boolean,
  "oportunidadeNoMemorial": boolean,
  "oportunidadeEmAnexoTecnico": boolean
}

Critérios:
- Aderência direta: o objeto da licitação menciona explicitamente produtos/serviços do portfólio da empresa?
- Aderência por aplicação: mesmo sem menção direta, os produtos da empresa poderiam ser aplicados?
- Contexto oculto: há indícios no texto que sugerem necessidade dos produtos da empresa sem menção explícita?
- Oportunidade oculta: há oportunidade escondida em lotes, itens ou anexos?
- Flags de oportunidade: marque onde exatamente a oportunidade foi encontrada.

Retorne APENAS o JSON, sem texto adicional.`;

function buildUserPrompt(
  licitacao: { titulo: string; orgao?: string | null; objeto?: string | null; modalidade?: string | null; uf?: string | null; valorEstimado?: unknown },
  empresa: { nome: string; descricao?: string | null; segmento?: string | null },
  produtos: Array<{ nome: string; descricao?: string | null; categoria?: string | null }>
): string {
  const produtosStr = produtos.length > 0
    ? produtos.map((p) => `- ${p.nome}${p.categoria ? ` (${p.categoria})` : ""}${p.descricao ? `: ${p.descricao}` : ""}`).join("\n")
    : "Nenhum produto cadastrado";

  return `## Empresa
Nome: ${empresa.nome}
Segmento: ${empresa.segmento ?? "Não informado"}
Descrição: ${empresa.descricao ?? "Não informada"}

## Produtos/Serviços
${produtosStr}

## Licitação
Título: ${licitacao.titulo}
Órgão: ${licitacao.orgao ?? "Não informado"}
Modalidade: ${licitacao.modalidade ?? "Não informada"}
UF: ${licitacao.uf ?? "Não informada"}
Valor estimado: ${licitacao.valorEstimado ? `R$ ${Number(licitacao.valorEstimado).toLocaleString("pt-BR")}` : "Não informado"}

Objeto:
${licitacao.objeto ?? "Não informado"}`;
}

export async function analisarComIa(licitacaoId: string): Promise<void> {
  // Criar/atualizar registro como "processando"
  await db.licitacaoAnaliseIa.upsert({
    where: { licitacaoId },
    update: { status: "processando", erro: null, resultadoJson: null },
    create: { licitacaoId, status: "processando" },
  });

  try {
    const licitacao = await db.licitacao.findUniqueOrThrow({
      where: { id: licitacaoId },
    });

    const empresa = await db.empresa.findUniqueOrThrow({
      where: { id: "default" },
    });

    const produtos = await db.produto.findMany({
      where: { empresaId: "default", ativo: true },
      select: { nome: true, descricao: true, categoria: true },
    });

    const ia = await getIaProvider();
    const userPrompt = buildUserPrompt(licitacao, empresa, produtos);
    const resposta = await ia.complete(SYSTEM_PROMPT, userPrompt);

    // Extrair JSON da resposta
    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("A IA não retornou um JSON válido");
    }

    const resultado = JSON.parse(jsonMatch[0]) as AnaliseIaResultado;

    await db.licitacaoAnaliseIa.update({
      where: { licitacaoId },
      data: {
        status: "concluido",
        resultadoJson: resultado as unknown as Record<string, unknown>,
        modelo: ia.modelName,
      },
    });
  } catch (err) {
    await db.licitacaoAnaliseIa.update({
      where: { licitacaoId },
      data: {
        status: "erro",
        erro: err instanceof Error ? err.message : "Erro desconhecido",
      },
    });
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/score/analise-ia.ts
git commit -m "feat(sp-c): add AI analysis function using existing provider factory"
```

---

### Task 5: API — Analysis (GET + PUT + AI trigger)

**Files:**
- Create: `app/api/licitacoes/[id]/analise/route.ts`
- Create: `app/api/licitacoes/[id]/analise/ia/route.ts`

- [ ] **Step 1: Create GET + PUT analysis endpoint**

File: `app/api/licitacoes/[id]/analise/route.ts`

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const analise = await db.licitacaoAnalise.findUnique({
    where: { licitacaoId: id },
  });

  const analiseIa = await db.licitacaoAnaliseIa.findUnique({
    where: { licitacaoId: id },
  });

  return NextResponse.json({ analise, analiseIa });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const body = await req.json();

  const licitacao = await db.licitacao.findUnique({ where: { id } });
  if (!licitacao) {
    return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });
  }

  const analise = await db.licitacaoAnalise.upsert({
    where: { licitacaoId: id },
    update: {
      aderenciaDiretaExiste: body.aderenciaDiretaExiste ?? null,
      aderenciaDiretaNivel: body.aderenciaDiretaNivel ?? null,
      aderenciaAplicacaoExiste: body.aderenciaAplicacaoExiste ?? null,
      aderenciaAplicacaoNivel: body.aderenciaAplicacaoNivel ?? null,
      contextoOcultoExiste: body.contextoOcultoExiste ?? null,
      contextoOcultoNivel: body.contextoOcultoNivel ?? null,
      oportunidadeOcultaExiste: body.oportunidadeOcultaExiste ?? null,
      oportunidadeOcultaForca: body.oportunidadeOcultaForca ?? null,
      oportunidadeOcultaResumo: body.oportunidadeOcultaResumo ?? null,
      oportunidadeNoObjeto: body.oportunidadeNoObjeto ?? false,
      oportunidadeNoTr: body.oportunidadeNoTr ?? false,
      oportunidadeNosLotes: body.oportunidadeNosLotes ?? false,
      oportunidadeNosItens: body.oportunidadeNosItens ?? false,
      oportunidadeNaPlanilha: body.oportunidadeNaPlanilha ?? false,
      oportunidadeNoMemorial: body.oportunidadeNoMemorial ?? false,
      oportunidadeEmAnexoTecnico: body.oportunidadeEmAnexoTecnico ?? false,
    },
    create: {
      licitacaoId: id,
      aderenciaDiretaExiste: body.aderenciaDiretaExiste ?? null,
      aderenciaDiretaNivel: body.aderenciaDiretaNivel ?? null,
      aderenciaAplicacaoExiste: body.aderenciaAplicacaoExiste ?? null,
      aderenciaAplicacaoNivel: body.aderenciaAplicacaoNivel ?? null,
      contextoOcultoExiste: body.contextoOcultoExiste ?? null,
      contextoOcultoNivel: body.contextoOcultoNivel ?? null,
      oportunidadeOcultaExiste: body.oportunidadeOcultaExiste ?? null,
      oportunidadeOcultaForca: body.oportunidadeOcultaForca ?? null,
      oportunidadeOcultaResumo: body.oportunidadeOcultaResumo ?? null,
      oportunidadeNoObjeto: body.oportunidadeNoObjeto ?? false,
      oportunidadeNoTr: body.oportunidadeNoTr ?? false,
      oportunidadeNosLotes: body.oportunidadeNosLotes ?? false,
      oportunidadeNosItens: body.oportunidadeNosItens ?? false,
      oportunidadeNaPlanilha: body.oportunidadeNaPlanilha ?? false,
      oportunidadeNoMemorial: body.oportunidadeNoMemorial ?? false,
      oportunidadeEmAnexoTecnico: body.oportunidadeEmAnexoTecnico ?? false,
    },
  });

  return NextResponse.json(analise);
}
```

- [ ] **Step 2: Create AI trigger endpoint**

File: `app/api/licitacoes/[id]/analise/ia/route.ts`

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { analisarComIa } from "@/lib/score/analise-ia";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const licitacao = await db.licitacao.findUnique({ where: { id } });
  if (!licitacao) {
    return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });
  }

  // Verificar se já está processando
  const existente = await db.licitacaoAnaliseIa.findUnique({
    where: { licitacaoId: id },
  });
  if (existente?.status === "processando") {
    return NextResponse.json(
      { error: "Análise IA já está em andamento" },
      { status: 409 }
    );
  }

  // Executar em background
  analisarComIa(id).catch((err) => {
    console.error(`[analise-ia] Erro na análise da licitação ${id}:`, err);
  });

  return NextResponse.json({ status: "processando" }, { status: 202 });
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/api/licitacoes/[id]/analise/route.ts app/api/licitacoes/[id]/analise/ia/route.ts
git commit -m "feat(sp-c): add analysis API endpoints (GET, PUT, AI trigger)"
```

---

### Task 6: API — Score (GET + PUT + Calculate)

**Files:**
- Create: `app/api/licitacoes/[id]/score/route.ts`
- Create: `app/api/licitacoes/[id]/score/calcular/route.ts`

- [ ] **Step 1: Create GET + PUT score endpoint**

File: `app/api/licitacoes/[id]/score/route.ts`

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const score = await db.licitacaoScore.findUnique({
    where: { licitacaoId: id },
  });

  return NextResponse.json(score);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const body = await req.json();

  const licitacao = await db.licitacao.findUnique({ where: { id } });
  if (!licitacao) {
    return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });
  }

  if (body.scoreFinal == null || body.classificacao == null) {
    return NextResponse.json({ error: "scoreFinal e classificacao são obrigatórios" }, { status: 400 });
  }

  const data = {
    scoreFinal: Number(body.scoreFinal),
    classificacao: body.classificacao,
    scoreAderenciaDireta: body.scoreAderenciaDireta != null ? Number(body.scoreAderenciaDireta) : null,
    scoreAderenciaAplicacao: body.scoreAderenciaAplicacao != null ? Number(body.scoreAderenciaAplicacao) : null,
    scoreContextoOculto: body.scoreContextoOculto != null ? Number(body.scoreContextoOculto) : null,
    scoreModeloComercial: body.scoreModeloComercial != null ? Number(body.scoreModeloComercial) : null,
    scorePotencialEconomico: body.scorePotencialEconomico != null ? Number(body.scorePotencialEconomico) : null,
    scoreQualidadeEvidencia: body.scoreQualidadeEvidencia != null ? Number(body.scoreQualidadeEvidencia) : null,
    scoreJustificativaResumida: body.scoreJustificativaResumida ?? null,
    valorCapturavelEstimado: body.valorCapturavelEstimado ?? null,
    valorCapturavelFaixaMin: body.valorCapturavelFaixaMin ?? null,
    valorCapturavelFaixaMax: body.valorCapturavelFaixaMax ?? null,
    valorCapturavelMoeda: body.valorCapturavelMoeda ?? "BRL",
    valorCapturavelNivelConfianca: body.valorCapturavelNivelConfianca ?? null,
    valorCapturavelMetodoEstimativa: body.valorCapturavelMetodoEstimativa ?? null,
    valorCapturavelJustificativa: body.valorCapturavelJustificativa ?? null,
    valorCapturavelBaseDocumental: body.valorCapturavelBaseDocumental ?? null,
    valorCapturavelObservacao: body.valorCapturavelObservacao ?? null,
    falsoNegativoExisteRisco: body.falsoNegativoExisteRisco ?? false,
    falsoNegativoNivelRisco: body.falsoNegativoNivelRisco ?? null,
    falsoNegativoMotivos: body.falsoNegativoMotivos ?? null,
    falsoNegativoTrechosCriticos: body.falsoNegativoTrechosCriticos ?? null,
    falsoNegativoResumo: body.falsoNegativoResumo ?? null,
  };

  const score = await db.licitacaoScore.upsert({
    where: { licitacaoId: id },
    update: data,
    create: { licitacaoId: id, ...data },
  });

  return NextResponse.json(score);
}
```

- [ ] **Step 2: Create calculate endpoint**

File: `app/api/licitacoes/[id]/score/calcular/route.ts`

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { calcularScore } from "@/lib/score/calculator";
import type { AnaliseData, AnaliseIaResultado } from "@/lib/score/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const licitacao = await db.licitacao.findUnique({ where: { id } });
  if (!licitacao) {
    return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });
  }

  const analise = await db.licitacaoAnalise.findUnique({
    where: { licitacaoId: id },
  });

  if (!analise) {
    return NextResponse.json(
      { error: "É necessário preencher a análise antes de calcular o score" },
      { status: 400 }
    );
  }

  const analiseIa = await db.licitacaoAnaliseIa.findUnique({
    where: { licitacaoId: id },
  });

  const analiseIaResultado =
    analiseIa?.status === "concluido" && analiseIa.resultadoJson
      ? (analiseIa.resultadoJson as unknown as AnaliseIaResultado)
      : null;

  const valorEstimado = licitacao.valorEstimado
    ? Number(licitacao.valorEstimado)
    : null;

  const resultado = calcularScore(
    analise as unknown as AnaliseData,
    analiseIaResultado,
    valorEstimado
  );

  return NextResponse.json(resultado);
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/api/licitacoes/[id]/score/route.ts app/api/licitacoes/[id]/score/calcular/route.ts
git commit -m "feat(sp-c): add score API endpoints (GET, PUT, calculate)"
```

---

### Task 7: API — Parecer (GET + PUT)

**Files:**
- Create: `app/api/licitacoes/[id]/parecer/route.ts`

- [ ] **Step 1: Create GET + PUT parecer endpoint**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const parecer = await db.licitacaoParecer.findUnique({
    where: { licitacaoId: id },
  });

  return NextResponse.json(parecer);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const body = await req.json();

  const licitacao = await db.licitacao.findUnique({ where: { id } });
  if (!licitacao) {
    return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });
  }

  const data = {
    classificacaoFinal: body.classificacaoFinal ?? null,
    prioridadeComercial: body.prioridadeComercial ?? null,
    valeEsforcoComercial: body.valeEsforcoComercial ?? null,
    recomendacaoFinal: body.recomendacaoFinal ?? null,
    resumo: body.resumo ?? null,
    oportunidadeDireta: body.oportunidadeDireta ?? false,
    oportunidadeIndireta: body.oportunidadeIndireta ?? false,
    oportunidadeOcultaItemLoteAnexo: body.oportunidadeOcultaItemLoteAnexo ?? false,
    oportunidadeInexistente: body.oportunidadeInexistente ?? false,
    riscoFalsoPositivo: body.riscoFalsoPositivo ?? false,
    riscoFalsoNegativoSoTitulo: body.riscoFalsoNegativoSoTitulo ?? false,
    ondeEstaOportunidade: body.ondeEstaOportunidade ?? null,
    solucoesQueMultiteinerPoderiaOfertar: body.solucoesQueMultiteinerPoderiaOfertar ?? null,
    proximoPasosRecomendado: body.proximoPasosRecomendado ?? null,
    riscosLimitacoes: body.riscosLimitacoes ?? null,
    evidenciasPrincipais: body.evidenciasPrincipais ?? null,
  };

  const parecer = await db.licitacaoParecer.upsert({
    where: { licitacaoId: id },
    update: data,
    create: { licitacaoId: id, ...data },
  });

  return NextResponse.json(parecer);
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/api/licitacoes/[id]/parecer/route.ts
git commit -m "feat(sp-c): add parecer API endpoints (GET, PUT)"
```

---

### Task 8: Reusable ListaEditavel Component

**Files:**
- Create: `components/licitacao/ListaEditavel.tsx`

- [ ] **Step 1: Create the reusable string list component**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

type Props = {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
};

export function ListaEditavel({ label, items, onChange, placeholder }: Props) {
  const [novoItem, setNovoItem] = useState("");

  function adicionar() {
    const texto = novoItem.trim();
    if (!texto) return;
    onChange([...items, texto]);
    setNovoItem("");
  }

  function remover(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex-1 text-sm bg-slate-50 rounded px-3 py-1.5">{item}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => remover(i)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          placeholder={placeholder ?? "Adicionar item..."}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={adicionar}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/licitacao/ListaEditavel.tsx
git commit -m "feat(sp-c): add reusable ListaEditavel component"
```

---

### Task 9: LicitacaoSidebar Component

**Files:**
- Create: `components/licitacao/LicitacaoSidebar.tsx`

- [ ] **Step 1: Create the sidebar component**

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

type LicitacaoData = {
  id: string;
  numero: number;
  titulo: string;
  orgao?: string | null;
  objeto?: string | null;
  modalidade?: string | null;
  uf?: string | null;
  municipio?: string | null;
  valorEstimado?: string | number | null;
  dataPublicacao?: string | null;
  dataSessao?: string | null;
  linkOrigem?: string | null;
};

type ScoreResumo = {
  scoreFinal: number;
  classificacao: string;
} | null;

const COR_CLASSIFICACAO: Record<string, string> = {
  "A+": "bg-emerald-700 text-white",
  A: "bg-blue-600 text-white",
  B: "bg-yellow-500 text-white",
  C: "bg-orange-500 text-white",
  D: "bg-red-600 text-white",
};

function formatarData(data: string | null | undefined): string {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarValor(valor: string | number | null | undefined): string {
  if (valor == null) return "—";
  const num = Number(valor);
  if (isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function LicitacaoSidebar({
  licitacao,
  score,
}: {
  licitacao: LicitacaoData;
  score: ScoreResumo;
}) {
  return (
    <aside className="w-80 shrink-0 border-r bg-slate-50 p-6 space-y-5 overflow-auto">
      <div>
        <h1 className="text-lg font-semibold leading-tight">{licitacao.titulo}</h1>
        <p className="text-sm text-slate-500 mt-1">#{licitacao.numero}</p>
      </div>

      {score && (
        <div className="flex items-center gap-3">
          <Badge className={COR_CLASSIFICACAO[score.classificacao] ?? "bg-slate-400 text-white"}>
            {score.classificacao}
          </Badge>
          <span className="text-2xl font-bold">{score.scoreFinal}</span>
          <span className="text-sm text-slate-500">/ 100</span>
        </div>
      )}

      {!score && (
        <Badge variant="secondary" className="text-xs">Sem score</Badge>
      )}

      <dl className="space-y-3 text-sm">
        {licitacao.orgao && (
          <div>
            <dt className="text-slate-500">Orgao</dt>
            <dd className="font-medium">{licitacao.orgao}</dd>
          </div>
        )}
        {licitacao.modalidade && (
          <div>
            <dt className="text-slate-500">Modalidade</dt>
            <dd>{licitacao.modalidade}</dd>
          </div>
        )}
        <div className="flex gap-6">
          {licitacao.uf && (
            <div>
              <dt className="text-slate-500">UF</dt>
              <dd>{licitacao.uf}</dd>
            </div>
          )}
          {licitacao.municipio && (
            <div>
              <dt className="text-slate-500">Municipio</dt>
              <dd>{licitacao.municipio}</dd>
            </div>
          )}
        </div>
        <div>
          <dt className="text-slate-500">Valor estimado</dt>
          <dd className="font-medium">{formatarValor(licitacao.valorEstimado)}</dd>
        </div>
        <div className="flex gap-6">
          <div>
            <dt className="text-slate-500">Publicacao</dt>
            <dd>{formatarData(licitacao.dataPublicacao)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Sessao</dt>
            <dd>{formatarData(licitacao.dataSessao)}</dd>
          </div>
        </div>
      </dl>

      {licitacao.objeto && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Objeto</p>
          <p className="text-sm leading-relaxed max-h-40 overflow-auto">{licitacao.objeto}</p>
        </div>
      )}

      {licitacao.linkOrigem && (
        <a
          href={licitacao.linkOrigem}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Ver no site original
        </a>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/licitacao/LicitacaoSidebar.tsx
git commit -m "feat(sp-c): add LicitacaoSidebar component"
```

---

### Task 10: AnaliseTab Component

**Files:**
- Create: `components/licitacao/AnaliseTab.tsx`

- [ ] **Step 1: Create the analysis tab**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

type AnaliseResponse = {
  analise: Record<string, unknown> | null;
  analiseIa: { status: string; resultadoJson: Record<string, unknown> | null } | null;
};

const NIVEIS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baixa", label: "Baixa" },
  { value: "nenhuma", label: "Nenhuma" },
];

function BlocoAnalise({
  titulo,
  existeValue,
  onExisteChange,
  nivelValue,
  onNivelChange,
  iaPreenchido,
}: {
  titulo: string;
  existeValue: boolean;
  onExisteChange: (v: boolean) => void;
  nivelValue: string;
  onNivelChange: (v: string) => void;
  iaPreenchido?: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{titulo}</h4>
        {iaPreenchido && <Badge variant="secondary" className="text-xs">IA</Badge>}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={existeValue}
          onChange={(e) => onExisteChange(e.target.checked)}
          className="rounded"
        />
        Existe?
      </label>
      {existeValue && (
        <Select value={nivelValue || ""} onValueChange={onNivelChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            {NIVEIS.map((n) => (
              <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export function AnaliseTab({ licitacaoId }: { licitacaoId: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AnaliseResponse>({
    queryKey: ["analise", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/analise`);
      if (!r.ok) throw new Error("Erro ao carregar analise");
      return r.json();
    },
  });

  const [form, setForm] = useState({
    aderenciaDiretaExiste: false,
    aderenciaDiretaNivel: "",
    aderenciaAplicacaoExiste: false,
    aderenciaAplicacaoNivel: "",
    contextoOcultoExiste: false,
    contextoOcultoNivel: "",
    oportunidadeOcultaExiste: false,
    oportunidadeOcultaForca: "",
    oportunidadeOcultaResumo: "",
    oportunidadeNoObjeto: false,
    oportunidadeNoTr: false,
    oportunidadeNosLotes: false,
    oportunidadeNosItens: false,
    oportunidadeNaPlanilha: false,
    oportunidadeNoMemorial: false,
    oportunidadeEmAnexoTecnico: false,
  });

  const [iaFields, setIaFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (data?.analise) {
      const a = data.analise;
      setForm({
        aderenciaDiretaExiste: (a.aderenciaDiretaExiste as boolean) ?? false,
        aderenciaDiretaNivel: (a.aderenciaDiretaNivel as string) ?? "",
        aderenciaAplicacaoExiste: (a.aderenciaAplicacaoExiste as boolean) ?? false,
        aderenciaAplicacaoNivel: (a.aderenciaAplicacaoNivel as string) ?? "",
        contextoOcultoExiste: (a.contextoOcultoExiste as boolean) ?? false,
        contextoOcultoNivel: (a.contextoOcultoNivel as string) ?? "",
        oportunidadeOcultaExiste: (a.oportunidadeOcultaExiste as boolean) ?? false,
        oportunidadeOcultaForca: (a.oportunidadeOcultaForca as string) ?? "",
        oportunidadeOcultaResumo: (a.oportunidadeOcultaResumo as string) ?? "",
        oportunidadeNoObjeto: (a.oportunidadeNoObjeto as boolean) ?? false,
        oportunidadeNoTr: (a.oportunidadeNoTr as boolean) ?? false,
        oportunidadeNosLotes: (a.oportunidadeNosLotes as boolean) ?? false,
        oportunidadeNosItens: (a.oportunidadeNosItens as boolean) ?? false,
        oportunidadeNaPlanilha: (a.oportunidadeNaPlanilha as boolean) ?? false,
        oportunidadeNoMemorial: (a.oportunidadeNoMemorial as boolean) ?? false,
        oportunidadeEmAnexoTecnico: (a.oportunidadeEmAnexoTecnico as boolean) ?? false,
      });
    }
  }, [data]);

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/analise`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Analise salva!");
      queryClient.invalidateQueries({ queryKey: ["analise", licitacaoId] });
    },
    onError: () => toast.error("Erro ao salvar analise"),
  });

  const iaMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/analise/ia`, { method: "POST" });
      if (!r.ok) {
        const body = await r.json();
        throw new Error(body.error ?? "Erro ao iniciar analise IA");
      }
      return r.json();
    },
    onSuccess: () => {
      toast.success("Analise IA iniciada! Aguarde...");
      // Poll every 3s until done
      const interval = setInterval(async () => {
        const r = await fetch(`/api/licitacoes/${licitacaoId}/analise`);
        const d = await r.json() as AnaliseResponse;
        if (d.analiseIa?.status === "concluido" && d.analiseIa.resultadoJson) {
          clearInterval(interval);
          const ia = d.analiseIa.resultadoJson as Record<string, unknown>;
          const newIaFields = new Set<string>();
          const updated = { ...form };
          const fieldsMap: Array<[string, string, string]> = [
            ["aderenciaDiretaExiste", "aderenciaDiretaNivel", "aderenciaDiretaNivel"],
            ["aderenciaAplicacaoExiste", "aderenciaAplicacaoNivel", "aderenciaAplicacaoNivel"],
            ["contextoOcultoExiste", "contextoOcultoNivel", "contextoOcultoNivel"],
          ];
          for (const [existeKey, nivelKey] of fieldsMap) {
            if (!updated[existeKey as keyof typeof updated] && ia[existeKey] != null) {
              (updated as Record<string, unknown>)[existeKey] = ia[existeKey];
              (updated as Record<string, unknown>)[nivelKey] = ia[nivelKey] ?? "";
              newIaFields.add(existeKey);
            }
          }
          if (!updated.oportunidadeOcultaExiste && ia.oportunidadeOcultaExiste != null) {
            updated.oportunidadeOcultaExiste = ia.oportunidadeOcultaExiste as boolean;
            updated.oportunidadeOcultaForca = (ia.oportunidadeOcultaForca as string) ?? "";
            updated.oportunidadeOcultaResumo = (ia.oportunidadeOcultaResumo as string) ?? "";
            newIaFields.add("oportunidadeOculta");
          }
          const flagKeys = ["oportunidadeNoObjeto", "oportunidadeNoTr", "oportunidadeNosLotes", "oportunidadeNosItens", "oportunidadeNaPlanilha", "oportunidadeNoMemorial", "oportunidadeEmAnexoTecnico"] as const;
          for (const key of flagKeys) {
            if (ia[key]) {
              (updated as Record<string, unknown>)[key] = true;
              newIaFields.add(key);
            }
          }
          setForm(updated);
          setIaFields(newIaFields);
          queryClient.invalidateQueries({ queryKey: ["analise", licitacaoId] });
          toast.success("Analise IA concluida! Campos preenchidos.");
        } else if (d.analiseIa?.status === "erro") {
          clearInterval(interval);
          toast.error("Analise IA falhou. Tente novamente.");
        }
      }, 3000);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-lg" />)}</div>;
  }

  const FLAGS = [
    { key: "oportunidadeNoObjeto" as const, label: "No objeto" },
    { key: "oportunidadeNoTr" as const, label: "No termo de referencia" },
    { key: "oportunidadeNosLotes" as const, label: "Nos lotes" },
    { key: "oportunidadeNosItens" as const, label: "Nos itens" },
    { key: "oportunidadeNaPlanilha" as const, label: "Na planilha" },
    { key: "oportunidadeNoMemorial" as const, label: "No memorial" },
    { key: "oportunidadeEmAnexoTecnico" as const, label: "Em anexo tecnico" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analise qualitativa</h3>
        <Button
          variant="outline"
          size="sm"
          disabled={iaMutation.isPending || data?.analiseIa?.status === "processando"}
          onClick={() => iaMutation.mutate()}
        >
          {iaMutation.isPending || data?.analiseIa?.status === "processando" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1" />
          )}
          Analisar com IA
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BlocoAnalise
          titulo="Aderencia direta"
          existeValue={form.aderenciaDiretaExiste}
          onExisteChange={(v) => setForm({ ...form, aderenciaDiretaExiste: v })}
          nivelValue={form.aderenciaDiretaNivel}
          onNivelChange={(v) => setForm({ ...form, aderenciaDiretaNivel: v })}
          iaPreenchido={iaFields.has("aderenciaDiretaExiste")}
        />
        <BlocoAnalise
          titulo="Aderencia por aplicacao"
          existeValue={form.aderenciaAplicacaoExiste}
          onExisteChange={(v) => setForm({ ...form, aderenciaAplicacaoExiste: v })}
          nivelValue={form.aderenciaAplicacaoNivel}
          onNivelChange={(v) => setForm({ ...form, aderenciaAplicacaoNivel: v })}
          iaPreenchido={iaFields.has("aderenciaAplicacaoExiste")}
        />
        <BlocoAnalise
          titulo="Contexto oculto"
          existeValue={form.contextoOcultoExiste}
          onExisteChange={(v) => setForm({ ...form, contextoOcultoExiste: v })}
          nivelValue={form.contextoOcultoNivel}
          onNivelChange={(v) => setForm({ ...form, contextoOcultoNivel: v })}
          iaPreenchido={iaFields.has("contextoOcultoExiste")}
        />
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Oportunidade oculta</h4>
          {iaFields.has("oportunidadeOculta") && <Badge variant="secondary" className="text-xs">IA</Badge>}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.oportunidadeOcultaExiste}
            onChange={(e) => setForm({ ...form, oportunidadeOcultaExiste: e.target.checked })}
            className="rounded"
          />
          Existe oportunidade oculta?
        </label>
        {form.oportunidadeOcultaExiste && (
          <>
            <Select value={form.oportunidadeOcultaForca || ""} onValueChange={(v) => setForm({ ...form, oportunidadeOcultaForca: v ?? "" })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Forca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={form.oportunidadeOcultaResumo}
              onChange={(e) => setForm({ ...form, oportunidadeOcultaResumo: e.target.value })}
              placeholder="Descreva a oportunidade oculta..."
              rows={3}
            />
          </>
        )}
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium">Onde encontrou oportunidade?</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {FLAGS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                className="rounded"
              />
              {f.label}
              {iaFields.has(f.key) && <Badge variant="secondary" className="text-[10px] px-1">IA</Badge>}
            </label>
          ))}
        </div>
      </div>

      <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending}>
        {salvarMutation.isPending ? "Salvando..." : "Salvar analise"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/licitacao/AnaliseTab.tsx
git commit -m "feat(sp-c): add AnaliseTab component with AI integration"
```

---

### Task 11: ScoreTab Component

**Files:**
- Create: `components/licitacao/ScoreTab.tsx`

- [ ] **Step 1: Create the score tab**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Calculator, Loader2 } from "lucide-react";

const COR_CLASSIFICACAO: Record<string, string> = {
  "A+": "bg-emerald-700 text-white",
  A: "bg-blue-600 text-white",
  B: "bg-yellow-500 text-white",
  C: "bg-orange-500 text-white",
  D: "bg-red-600 text-white",
};

const COMPONENTES = [
  { key: "scoreAderenciaDireta", label: "Aderencia direta", peso: "15%" },
  { key: "scoreAderenciaAplicacao", label: "Aderencia aplicacao", peso: "25%" },
  { key: "scoreContextoOculto", label: "Contexto oculto", peso: "20%" },
  { key: "scoreModeloComercial", label: "Modelo comercial", peso: "15%" },
  { key: "scorePotencialEconomico", label: "Potencial economico", peso: "15%" },
  { key: "scoreQualidadeEvidencia", label: "Qualidade evidencia", peso: "10%" },
];

export function ScoreTab({ licitacaoId }: { licitacaoId: string }) {
  const queryClient = useQueryClient();

  const { data: scoreData, isLoading } = useQuery<Record<string, unknown> | null>({
    queryKey: ["score", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/score`);
      if (!r.ok) throw new Error("Erro ao carregar score");
      return r.json();
    },
  });

  const [form, setForm] = useState({
    scoreFinal: 0,
    classificacao: "",
    scoreAderenciaDireta: 0,
    scoreAderenciaAplicacao: 0,
    scoreContextoOculto: 0,
    scoreModeloComercial: 0,
    scorePotencialEconomico: 0,
    scoreQualidadeEvidencia: 0,
    scoreJustificativaResumida: "",
    // Valor capturavel
    valorCapturavelEstimado: "",
    valorCapturavelFaixaMin: "",
    valorCapturavelFaixaMax: "",
    valorCapturavelMoeda: "BRL",
    valorCapturavelNivelConfianca: "",
    valorCapturavelMetodoEstimativa: "",
    valorCapturavelJustificativa: "",
    valorCapturavelObservacao: "",
    // Falso negativo
    falsoNegativoExisteRisco: false,
    falsoNegativoNivelRisco: "",
    falsoNegativoResumo: "",
  });

  useEffect(() => {
    if (scoreData) {
      setForm({
        scoreFinal: Number(scoreData.scoreFinal ?? 0),
        classificacao: (scoreData.classificacao as string) ?? "",
        scoreAderenciaDireta: Number(scoreData.scoreAderenciaDireta ?? 0),
        scoreAderenciaAplicacao: Number(scoreData.scoreAderenciaAplicacao ?? 0),
        scoreContextoOculto: Number(scoreData.scoreContextoOculto ?? 0),
        scoreModeloComercial: Number(scoreData.scoreModeloComercial ?? 0),
        scorePotencialEconomico: Number(scoreData.scorePotencialEconomico ?? 0),
        scoreQualidadeEvidencia: Number(scoreData.scoreQualidadeEvidencia ?? 0),
        scoreJustificativaResumida: (scoreData.scoreJustificativaResumida as string) ?? "",
        valorCapturavelEstimado: scoreData.valorCapturavelEstimado != null ? String(scoreData.valorCapturavelEstimado) : "",
        valorCapturavelFaixaMin: scoreData.valorCapturavelFaixaMin != null ? String(scoreData.valorCapturavelFaixaMin) : "",
        valorCapturavelFaixaMax: scoreData.valorCapturavelFaixaMax != null ? String(scoreData.valorCapturavelFaixaMax) : "",
        valorCapturavelMoeda: (scoreData.valorCapturavelMoeda as string) ?? "BRL",
        valorCapturavelNivelConfianca: (scoreData.valorCapturavelNivelConfianca as string) ?? "",
        valorCapturavelMetodoEstimativa: (scoreData.valorCapturavelMetodoEstimativa as string) ?? "",
        valorCapturavelJustificativa: (scoreData.valorCapturavelJustificativa as string) ?? "",
        valorCapturavelObservacao: (scoreData.valorCapturavelObservacao as string) ?? "",
        falsoNegativoExisteRisco: (scoreData.falsoNegativoExisteRisco as boolean) ?? false,
        falsoNegativoNivelRisco: (scoreData.falsoNegativoNivelRisco as string) ?? "",
        falsoNegativoResumo: (scoreData.falsoNegativoResumo as string) ?? "",
      });
    }
  }, [scoreData]);

  const calcularMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/score/calcular`, { method: "POST" });
      if (!r.ok) {
        const body = await r.json();
        throw new Error(body.error ?? "Erro ao calcular");
      }
      return r.json() as Promise<{ scoreFinal: number; classificacao: string; componentes: Record<string, number>; justificativaResumida: string }>;
    },
    onSuccess: (resultado) => {
      setForm((prev) => ({
        ...prev,
        scoreFinal: resultado.scoreFinal,
        classificacao: resultado.classificacao,
        ...resultado.componentes,
        scoreJustificativaResumida: resultado.justificativaResumida,
      }));
      toast.success("Score calculado! Ajuste os valores se necessario.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          valorCapturavelEstimado: form.valorCapturavelEstimado || null,
          valorCapturavelFaixaMin: form.valorCapturavelFaixaMin || null,
          valorCapturavelFaixaMax: form.valorCapturavelFaixaMax || null,
          valorCapturavelNivelConfianca: form.valorCapturavelNivelConfianca || null,
          valorCapturavelMetodoEstimativa: form.valorCapturavelMetodoEstimativa || null,
          valorCapturavelJustificativa: form.valorCapturavelJustificativa || null,
          valorCapturavelObservacao: form.valorCapturavelObservacao || null,
          falsoNegativoNivelRisco: form.falsoNegativoNivelRisco || null,
          falsoNegativoResumo: form.falsoNegativoResumo || null,
        }),
      });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Score salvo!");
      queryClient.invalidateQueries({ queryKey: ["score", licitacaoId] });
    },
    onError: () => toast.error("Erro ao salvar score"),
  });

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Score</h3>
        <Button variant="outline" size="sm" disabled={calcularMutation.isPending} onClick={() => calcularMutation.mutate()}>
          {calcularMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calculator className="h-4 w-4 mr-1" />}
          Calcular score
        </Button>
      </div>

      {form.classificacao && (
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
          <Badge className={`text-lg px-3 py-1 ${COR_CLASSIFICACAO[form.classificacao] ?? "bg-slate-400 text-white"}`}>
            {form.classificacao}
          </Badge>
          <span className="text-3xl font-bold">{form.scoreFinal}</span>
          <span className="text-slate-500">/ 100</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COMPONENTES.map((c) => (
          <div key={c.key} className="border rounded-lg p-3">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium">{c.label}</label>
              <span className="text-xs text-slate-500">Peso: {c.peso}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={form[c.key as keyof typeof form] as number}
                onChange={(e) => setForm({ ...form, [c.key]: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm font-mono w-8 text-right">
                {form[c.key as keyof typeof form] as number}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="text-sm font-medium">Justificativa resumida</label>
        <Textarea
          value={form.scoreJustificativaResumida}
          onChange={(e) => setForm({ ...form, scoreJustificativaResumida: e.target.value })}
          rows={3}
        />
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium">Valor capturavel</h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-slate-600">Estimado (R$)</label>
            <Input type="number" value={form.valorCapturavelEstimado} onChange={(e) => setForm({ ...form, valorCapturavelEstimado: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Faixa min (R$)</label>
            <Input type="number" value={form.valorCapturavelFaixaMin} onChange={(e) => setForm({ ...form, valorCapturavelFaixaMin: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Faixa max (R$)</label>
            <Input type="number" value={form.valorCapturavelFaixaMax} onChange={(e) => setForm({ ...form, valorCapturavelFaixaMax: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">Nivel de confianca</label>
            <Select value={form.valorCapturavelNivelConfianca || ""} onValueChange={(v) => setForm({ ...form, valorCapturavelNivelConfianca: v ?? "" })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="medio">Medio</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Metodo de estimativa</label>
            <Input value={form.valorCapturavelMetodoEstimativa} onChange={(e) => setForm({ ...form, valorCapturavelMetodoEstimativa: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-sm text-slate-600">Justificativa</label>
          <Textarea value={form.valorCapturavelJustificativa} onChange={(e) => setForm({ ...form, valorCapturavelJustificativa: e.target.value })} rows={2} />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium">Risco de falso negativo</h4>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.falsoNegativoExisteRisco} onChange={(e) => setForm({ ...form, falsoNegativoExisteRisco: e.target.checked })} className="rounded" />
          Existe risco de falso negativo?
        </label>
        {form.falsoNegativoExisteRisco && (
          <>
            <Select value={form.falsoNegativoNivelRisco || ""} onValueChange={(v) => setForm({ ...form, falsoNegativoNivelRisco: v ?? "" })}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Nivel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="medio">Medio</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <label className="text-sm text-slate-600">Resumo</label>
              <Textarea value={form.falsoNegativoResumo} onChange={(e) => setForm({ ...form, falsoNegativoResumo: e.target.value })} rows={3} />
            </div>
          </>
        )}
      </div>

      <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending || !form.classificacao}>
        {salvarMutation.isPending ? "Salvando..." : "Salvar score"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/licitacao/ScoreTab.tsx
git commit -m "feat(sp-c): add ScoreTab component with calculator and valor capturavel"
```

---

### Task 12: ParecerTab Component

**Files:**
- Create: `components/licitacao/ParecerTab.tsx`

- [ ] **Step 1: Create the parecer tab**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ListaEditavel } from "./ListaEditavel";

type ParecerData = Record<string, unknown> | null;

export function ParecerTab({
  licitacaoId,
  classificacaoScore,
}: {
  licitacaoId: string;
  classificacaoScore?: string;
}) {
  const queryClient = useQueryClient();

  const { data: parecerData, isLoading } = useQuery<ParecerData>({
    queryKey: ["parecer", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/parecer`);
      if (!r.ok) throw new Error("Erro ao carregar parecer");
      return r.json();
    },
  });

  const [form, setForm] = useState({
    classificacaoFinal: "",
    prioridadeComercial: "",
    valeEsforcoComercial: false,
    recomendacaoFinal: "",
    resumo: "",
    oportunidadeDireta: false,
    oportunidadeIndireta: false,
    oportunidadeOcultaItemLoteAnexo: false,
    oportunidadeInexistente: false,
    riscoFalsoPositivo: false,
    riscoFalsoNegativoSoTitulo: false,
    ondeEstaOportunidade: [] as string[],
    solucoesQueMultiteinerPoderiaOfertar: [] as string[],
    proximoPasosRecomendado: [] as string[],
    riscosLimitacoes: [] as string[],
    evidenciasPrincipais: [] as string[],
  });

  useEffect(() => {
    if (parecerData) {
      const p = parecerData;
      setForm({
        classificacaoFinal: (p.classificacaoFinal as string) ?? classificacaoScore ?? "",
        prioridadeComercial: (p.prioridadeComercial as string) ?? "",
        valeEsforcoComercial: (p.valeEsforcoComercial as boolean) ?? false,
        recomendacaoFinal: (p.recomendacaoFinal as string) ?? "",
        resumo: (p.resumo as string) ?? "",
        oportunidadeDireta: (p.oportunidadeDireta as boolean) ?? false,
        oportunidadeIndireta: (p.oportunidadeIndireta as boolean) ?? false,
        oportunidadeOcultaItemLoteAnexo: (p.oportunidadeOcultaItemLoteAnexo as boolean) ?? false,
        oportunidadeInexistente: (p.oportunidadeInexistente as boolean) ?? false,
        riscoFalsoPositivo: (p.riscoFalsoPositivo as boolean) ?? false,
        riscoFalsoNegativoSoTitulo: (p.riscoFalsoNegativoSoTitulo as boolean) ?? false,
        ondeEstaOportunidade: Array.isArray(p.ondeEstaOportunidade) ? p.ondeEstaOportunidade as string[] : [],
        solucoesQueMultiteinerPoderiaOfertar: Array.isArray(p.solucoesQueMultiteinerPoderiaOfertar) ? p.solucoesQueMultiteinerPoderiaOfertar as string[] : [],
        proximoPasosRecomendado: Array.isArray(p.proximoPasosRecomendado) ? p.proximoPasosRecomendado as string[] : [],
        riscosLimitacoes: Array.isArray(p.riscosLimitacoes) ? p.riscosLimitacoes as string[] : [],
        evidenciasPrincipais: Array.isArray(p.evidenciasPrincipais) ? p.evidenciasPrincipais as string[] : [],
      });
    } else if (classificacaoScore) {
      setForm((prev) => ({ ...prev, classificacaoFinal: classificacaoScore }));
    }
  }, [parecerData, classificacaoScore]);

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/parecer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          classificacaoFinal: form.classificacaoFinal || null,
          prioridadeComercial: form.prioridadeComercial || null,
          recomendacaoFinal: form.recomendacaoFinal || null,
          resumo: form.resumo || null,
          ondeEstaOportunidade: form.ondeEstaOportunidade.length > 0 ? form.ondeEstaOportunidade : null,
          solucoesQueMultiteinerPoderiaOfertar: form.solucoesQueMultiteinerPoderiaOfertar.length > 0 ? form.solucoesQueMultiteinerPoderiaOfertar : null,
          proximoPasosRecomendado: form.proximoPasosRecomendado.length > 0 ? form.proximoPasosRecomendado : null,
          riscosLimitacoes: form.riscosLimitacoes.length > 0 ? form.riscosLimitacoes : null,
          evidenciasPrincipais: form.evidenciasPrincipais.length > 0 ? form.evidenciasPrincipais : null,
        }),
      });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Parecer salvo!");
      queryClient.invalidateQueries({ queryKey: ["parecer", licitacaoId] });
    },
    onError: () => toast.error("Erro ao salvar parecer"),
  });

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />)}</div>;
  }

  const OPORTUNIDADES = [
    { key: "oportunidadeDireta" as const, label: "Oportunidade direta" },
    { key: "oportunidadeIndireta" as const, label: "Oportunidade indireta" },
    { key: "oportunidadeOcultaItemLoteAnexo" as const, label: "Oportunidade oculta (item/lote/anexo)" },
    { key: "oportunidadeInexistente" as const, label: "Oportunidade inexistente" },
  ];

  const RISCOS = [
    { key: "riscoFalsoPositivo" as const, label: "Risco de falso positivo" },
    { key: "riscoFalsoNegativoSoTitulo" as const, label: "Risco de falso negativo (analise so pelo titulo)" },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Parecer comercial</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Classificacao final</label>
          <Select value={form.classificacaoFinal || ""} onValueChange={(v) => setForm({ ...form, classificacaoFinal: v ?? "" })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
              <SelectItem value="D">D</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Prioridade comercial</label>
          <Select value={form.prioridadeComercial || ""} onValueChange={(v) => setForm({ ...form, prioridadeComercial: v ?? "" })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm pb-2">
            <input
              type="checkbox"
              checked={form.valeEsforcoComercial}
              onChange={(e) => setForm({ ...form, valeEsforcoComercial: e.target.checked })}
              className="rounded"
            />
            Vale esforco comercial?
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Tipo de oportunidade</h4>
          {OPORTUNIDADES.map((o) => (
            <label key={o.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form[o.key]}
                onChange={(e) => setForm({ ...form, [o.key]: e.target.checked })}
                className="rounded"
              />
              {o.label}
            </label>
          ))}
        </div>
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Riscos</h4>
          {RISCOS.map((r) => (
            <label key={r.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form[r.key]}
                onChange={(e) => setForm({ ...form, [r.key]: e.target.checked })}
                className="rounded"
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>

      <ListaEditavel label="Onde esta a oportunidade?" items={form.ondeEstaOportunidade} onChange={(v) => setForm({ ...form, ondeEstaOportunidade: v })} placeholder="Ex: Item 3 do lote 2..." />
      <ListaEditavel label="Solucoes que a Multiteiner poderia ofertar" items={form.solucoesQueMultiteinerPoderiaOfertar} onChange={(v) => setForm({ ...form, solucoesQueMultiteinerPoderiaOfertar: v })} placeholder="Ex: Container reefer 40'..." />
      <ListaEditavel label="Proximos passos recomendados" items={form.proximoPasosRecomendado} onChange={(v) => setForm({ ...form, proximoPasosRecomendado: v })} placeholder="Ex: Solicitar edital completo..." />
      <ListaEditavel label="Riscos e limitacoes" items={form.riscosLimitacoes} onChange={(v) => setForm({ ...form, riscosLimitacoes: v })} placeholder="Ex: Prazo curto para proposta..." />
      <ListaEditavel label="Evidencias principais" items={form.evidenciasPrincipais} onChange={(v) => setForm({ ...form, evidenciasPrincipais: v })} placeholder="Ex: Mencao a container no item 5..." />

      <div>
        <label className="text-sm font-medium">Recomendacao final</label>
        <Textarea value={form.recomendacaoFinal} onChange={(e) => setForm({ ...form, recomendacaoFinal: e.target.value })} rows={3} placeholder="Recomendacao detalhada..." />
      </div>

      <div>
        <label className="text-sm font-medium">Resumo executivo</label>
        <Textarea value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} rows={3} placeholder="Resumo para leitura rapida..." />
      </div>

      <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending}>
        {salvarMutation.isPending ? "Salvando..." : "Salvar parecer"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/licitacao/ParecerTab.tsx
git commit -m "feat(sp-c): add ParecerTab component with editable lists"
```

---

### Task 13: Licitacao Detail Page

**Files:**
- Create: `app/licitacoes/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

```tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { LicitacaoDetailClient } from "./client";

export default async function LicitacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const licitacao = await db.licitacao.findUnique({
    where: { id },
    include: {
      score: { select: { scoreFinal: true, classificacao: true } },
    },
  });

  if (!licitacao) notFound();

  // Serialize for client: convert Decimal to string
  const serialized = {
    ...licitacao,
    valorEstimado: licitacao.valorEstimado != null ? String(licitacao.valorEstimado) : null,
    score: licitacao.score
      ? { scoreFinal: licitacao.score.scoreFinal, classificacao: licitacao.score.classificacao }
      : null,
  };

  return <LicitacaoDetailClient licitacao={serialized} />;
}
```

- [ ] **Step 2: Create the client wrapper**

File: `app/licitacoes/[id]/client.tsx`

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LicitacaoSidebar } from "@/components/licitacao/LicitacaoSidebar";
import { AnaliseTab } from "@/components/licitacao/AnaliseTab";
import { ScoreTab } from "@/components/licitacao/ScoreTab";
import { ParecerTab } from "@/components/licitacao/ParecerTab";
import { useQuery } from "@tanstack/react-query";

type LicitacaoData = {
  id: string;
  numero: number;
  titulo: string;
  orgao: string | null;
  objeto: string | null;
  modalidade: string | null;
  uf: string | null;
  municipio: string | null;
  valorEstimado: string | null;
  dataPublicacao: Date | string | null;
  dataSessao: Date | string | null;
  linkOrigem: string | null;
  score: { scoreFinal: number; classificacao: string } | null;
};

const TABS = [
  { id: "analise", label: "Analise" },
  { id: "score", label: "Score" },
  { id: "parecer", label: "Parecer" },
];

export function LicitacaoDetailClient({ licitacao }: { licitacao: LicitacaoData }) {
  const [tab, setTab] = useState("analise");

  // Keep score fresh for sidebar and parecer default
  const { data: scoreAtual } = useQuery<Record<string, unknown> | null>({
    queryKey: ["score", licitacao.id],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacao.id}/score`);
      if (!r.ok) return null;
      return r.json();
    },
    initialData: licitacao.score,
  });

  const scoreResumo = scoreAtual
    ? { scoreFinal: Number((scoreAtual as Record<string, unknown>).scoreFinal ?? 0), classificacao: String((scoreAtual as Record<string, unknown>).classificacao ?? "") }
    : null;

  return (
    <div className="flex h-screen">
      <LicitacaoSidebar
        licitacao={{
          ...licitacao,
          dataPublicacao: licitacao.dataPublicacao ? String(licitacao.dataPublicacao) : null,
          dataSessao: licitacao.dataSessao ? String(licitacao.dataSessao) : null,
        }}
        score={scoreResumo}
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "analise" && <AnaliseTab licitacaoId={licitacao.id} />}
        {tab === "score" && <ScoreTab licitacaoId={licitacao.id} />}
        {tab === "parecer" && (
          <ParecerTab
            licitacaoId={licitacao.id}
            classificacaoScore={scoreResumo?.classificacao}
          />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/licitacoes/[id]/page.tsx app/licitacoes/[id]/client.tsx
git commit -m "feat(sp-c): add licitacao detail page with sidebar and 3 tabs"
```

---

### Task 14: Drawer Summary Section

**Files:**
- Modify: `components/detalhe/LicitacaoDrawer.tsx`

- [ ] **Step 1: Add score/parecer summary to the existing drawer**

Find the section in the drawer where licitacao details are shown (after the basic fields like titulo, orgao, etc.). Add a summary section that shows:

Add a new inner component at the top of the file:

```tsx
function ResumoScoreParecer({ licitacaoId }: { licitacaoId: string }) {
  const { data: score } = useQuery<Record<string, unknown> | null>({
    queryKey: ["score-resumo", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/score`);
      if (!r.ok) return null;
      return r.json();
    },
  });

  const { data: parecer } = useQuery<Record<string, unknown> | null>({
    queryKey: ["parecer-resumo", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/parecer`);
      if (!r.ok) return null;
      return r.json();
    },
  });

  const COR: Record<string, string> = {
    "A+": "bg-emerald-700 text-white",
    A: "bg-blue-600 text-white",
    B: "bg-yellow-500 text-white",
    C: "bg-orange-500 text-white",
    D: "bg-red-600 text-white",
  };

  const hasData = score || parecer;

  return (
    <div className="border-t pt-3 mt-3 space-y-2">
      {score && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${COR[String(score.classificacao)] ?? "bg-slate-400 text-white"}`}>
            {String(score.classificacao)}
          </span>
          <span className="text-sm font-semibold">{Number(score.scoreFinal)}/100</span>
        </div>
      )}
      {parecer && (
        <div className="text-xs text-slate-600">
          {parecer.prioridadeComercial && <span>Prioridade: {String(parecer.prioridadeComercial)}</span>}
          {parecer.valeEsforcoComercial != null && (
            <span className="ml-2">Vale esforco: {parecer.valeEsforcoComercial ? "Sim" : "Nao"}</span>
          )}
        </div>
      )}
      <a
        href={`/licitacoes/${licitacaoId}`}
        className="text-xs text-blue-600 hover:underline"
      >
        {hasData ? "Ver analise completa →" : "Analisar →"}
      </a>
    </div>
  );
}
```

Then render `<ResumoScoreParecer licitacaoId={licitacao.id} />` inside the drawer, after the existing licitacao fields section, when viewing an existing licitacao (not creating new).

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/detalhe/LicitacaoDrawer.tsx
git commit -m "feat(sp-c): add score/parecer summary to licitacao drawer"
```

---

### Task 15: Final Build Verification

- [ ] **Step 1: Run full build**

Run: `npx next build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Verify all new files exist**

```bash
ls lib/score/
ls app/api/licitacoes/*/
ls components/licitacao/
ls app/licitacoes/[id]/
```

- [ ] **Step 3: Final commit if needed**

```bash
git status
```
