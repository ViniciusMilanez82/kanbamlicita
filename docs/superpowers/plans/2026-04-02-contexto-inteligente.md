# Contexto Inteligente — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O drawer da licitação se adapta à coluna atual do card, mostrando checklist, ações e botões contextuais. O card no kanban mostra progresso, responsável e prazos.

**Architecture:** Expandir `KanbanColuna` com campos de workflow (`acoesPadrao`, `corEtapa`, `papelResponsavel`). Redesenhar o `LicitacaoDrawer` em 3 blocos (checklist + ações + avançar) + seções colapsadas. Enriquecer `KanbanCard` com barra de progresso, avatar e prazo. Adicionar novas ações IA (jurídica, habilitação).

**Tech Stack:** Next.js 16.2.1, React 19, Prisma 7.5, PostgreSQL, Tailwind 4, TanStack Query, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-02-contexto-inteligente-design.md`

---

## Mapa de Arquivos

### Criar
| Arquivo | Responsabilidade |
|---------|-----------------|
| `app/api/kanban/cards/[id]/route.ts` | PATCH para atualizar checklistProgresso do card |
| `components/detalhe/BlocoOQueFazer.tsx` | Checklist da etapa com progresso |
| `components/detalhe/BlocoAcoesEtapa.tsx` | Botões contextuais baseados em acoesPadrao |
| `components/detalhe/BlocoAvancar.tsx` | Avançar/voltar/descartar |
| `components/detalhe/ResumoExecutivo.tsx` | Painel consolidado para etapa de decisão |
| `components/detalhe/SecaoColapsavel.tsx` | Wrapper genérico de seção colapsável |
| `lib/ia/prompts/analise-juridica.ts` | Prompt IA para análise jurídica |
| `lib/analise-profunda/checar-habilitacao.ts` | Cruzamento docs empresa vs exigências edital |

### Modificar
| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.prisma` | Campos novos em KanbanColuna |
| `app/api/colunas/route.ts` | Aceitar/retornar campos novos |
| `app/api/licitacoes/route.ts` | Include score + checklistProgresso |
| `components/detalhe/LicitacaoDrawer.tsx` | Redesign: 3 blocos + seções colapsadas |
| `components/kanban/KanbanCard.tsx` | Barra progresso, avatar, prazo, score |
| `components/kanban/KanbanBoard.tsx` | Passar dados extras ao card |
| `components/configuracoes/ColunasEditor.tsx` | Campos de acoesPadrao, corEtapa, papel |
| `types/licitacao.ts` | Expandir KanbanColuna type |

---

### Task 1: Schema — Campos novos em KanbanColuna

**Files:**
- Modify: `prisma/schema.prisma` (model KanbanColuna, ~line 277)

- [ ] **Step 1: Adicionar campos ao schema**

Em `prisma/schema.prisma`, no model `KanbanColuna`, adicionar após `ativo`:

```prisma
  acoesPadrao      String[]  @default([]) @map("acoes_padrao")
  corEtapa         String?   @map("cor_etapa")
  papelResponsavel String?   @map("papel_responsavel")
```

- [ ] **Step 2: Executar prisma db push**

Run: `npx prisma db push`
Expected: Alteração aplicada sem erros. Os 3 campos novos são opcionais/default, sem migração destrutiva.

- [ ] **Step 3: Gerar client**

Run: `npx prisma generate`
Expected: Client regenerado com os campos novos.

- [ ] **Step 4: Atualizar tipo TypeScript**

Em `types/licitacao.ts`, expandir a interface `KanbanColuna`:

```typescript
export type KanbanColuna = {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  tipo: string;
  ativo: boolean;
  acoesPadrao: string[];
  corEtapa: string | null;
  papelResponsavel: string | null;
};
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma types/licitacao.ts
git commit -m "feat: campos de workflow em KanbanColuna (acoesPadrao, corEtapa, papelResponsavel)"
```

---

### Task 2: API — PATCH /api/kanban/cards/[id]

**Files:**
- Create: `app/api/kanban/cards/[id]/route.ts`

O `ChecklistEtapaPanel` já existente chama este endpoint, mas ele não existe. Criá-lo.

- [ ] **Step 1: Criar diretório e arquivo**

Run: `mkdir -p app/api/kanban/cards/[id]`

- [ ] **Step 2: Implementar PATCH**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import type { InputJsonValue } from "@prisma/client/runtime/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const body = await req.json();

  const card = await db.kanbanCard.findUnique({ where: { id } });
  if (!card) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (body.checklistProgresso !== undefined) {
    data.checklistProgresso = body.checklistProgresso as InputJsonValue;
  }
  if (body.responsavelId !== undefined) {
    data.responsavelId = body.responsavelId || null;
  }
  if (body.urgente !== undefined) {
    data.urgente = Boolean(body.urgente);
  }
  if (body.notas !== undefined) {
    data.notas = body.notas || null;
  }

  const updated = await db.kanbanCard.update({
    where: { id },
    data,
    include: {
      coluna: { select: { id: true, nome: true, cor: true } },
      responsavel: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 3: Verificar build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add app/api/kanban/cards/
git commit -m "feat: PATCH /api/kanban/cards/[id] para checklist e responsável"
```

---

### Task 3: API — Expandir colunas e licitações

**Files:**
- Modify: `app/api/colunas/route.ts`
- Modify: `app/api/licitacoes/route.ts`

- [ ] **Step 1: Colunas API — aceitar campos novos no PUT e POST**

Em `app/api/colunas/route.ts`, no handler `POST`, adicionar ao body destructuring e ao `data`:

```typescript
// POST handler — adicionar campos
const { nome, cor, tipo, acoesPadrao, corEtapa, papelResponsavel } = body;
// ...
const coluna = await db.kanbanColuna.create({
  data: {
    nome,
    ordem,
    cor: cor ?? "#3B82F6",
    tipo: tipo ?? "normal",
    acoesPadrao: Array.isArray(acoesPadrao) ? acoesPadrao : [],
    corEtapa: corEtapa ?? null,
    papelResponsavel: papelResponsavel ?? null,
  },
});
```

No handler `PUT`, adicionar os campos ao update:

```typescript
const { id, nome, cor, tipo, ordem, ativo, acoesPadrao, corEtapa, papelResponsavel } = body;
// ...
const coluna = await db.kanbanColuna.update({
  where: { id },
  data: {
    nome, cor, tipo, ordem, ativo,
    ...(acoesPadrao !== undefined ? { acoesPadrao } : {}),
    ...(corEtapa !== undefined ? { corEtapa } : {}),
    ...(papelResponsavel !== undefined ? { papelResponsavel } : {}),
  },
});
```

- [ ] **Step 2: Licitações API — incluir score e checklistProgresso**

Em `app/api/licitacoes/route.ts`, expandir o `include` do `findMany`:

```typescript
const licitacoes = await db.licitacao.findMany({
  include: {
    card: {
      include: {
        coluna: true, // retornar todos os campos (inclui acoesPadrao, corEtapa)
        responsavel: { select: { id: true, name: true } },
      },
    },
    fonte: { select: { id: true, nome: true, tipo: true } },
    score: { select: { scoreFinal: true, classificacao: true } },
  },
  orderBy: { criadoEm: "desc" },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/api/colunas/route.ts app/api/licitacoes/route.ts
git commit -m "feat: APIs expandidas — colunas com workflow, licitações com score"
```

---

### Task 4: Componente — SecaoColapsavel

**Files:**
- Create: `components/detalhe/SecaoColapsavel.tsx`

Wrapper reutilizável para seções colapsáveis do drawer.

- [ ] **Step 1: Criar componente**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SecaoColapsavelProps {
  titulo: string;
  children: React.ReactNode;
  defaultAberto?: boolean;
  icone?: React.ReactNode;
}

export function SecaoColapsavel({
  titulo,
  children,
  defaultAberto = false,
  icone,
}: SecaoColapsavelProps) {
  const [aberto, setAberto] = useState(defaultAberto);

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setAberto(!aberto)}
        className="flex w-full items-center gap-2 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        {aberto ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        {icone}
        {titulo}
      </button>
      {aberto && <div className="pb-3 pl-6">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/detalhe/SecaoColapsavel.tsx
git commit -m "feat: componente SecaoColapsavel reutilizável"
```

---

### Task 5: Componente — BlocoOQueFazer

**Files:**
- Create: `components/detalhe/BlocoOQueFazer.tsx`

Checklist da etapa com progresso visual, adaptado à coluna atual.

- [ ] **Step 1: Criar componente**

```tsx
"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";

interface ChecklistItem {
  texto: string;
  marcado: boolean;
}

interface BlocoOQueFazerProps {
  cardId: string;
  colunaNome: string;
  corEtapa: string;
  papelResponsavel: string | null;
  responsavelNome: string | null;
  itens: string[];
  checklistProgresso: Record<string, Record<string, boolean>> | null;
  /** Itens automáticos marcados pelo sistema (ex: "Análise profunda" se já concluída) */
  itensAutomaticos?: Record<number, boolean>;
}

export function BlocoOQueFazer({
  cardId,
  colunaNome,
  corEtapa,
  papelResponsavel,
  responsavelNome,
  itens,
  checklistProgresso,
  itensAutomaticos = {},
}: BlocoOQueFazerProps) {
  const progressoColuna = checklistProgresso?.[colunaNome] ?? {};

  const [estados, setEstados] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    itens.forEach((_, idx) => {
      if (itensAutomaticos[idx] !== undefined) {
        init[String(idx)] = itensAutomaticos[idx];
      } else {
        init[String(idx)] = progressoColuna[String(idx)] ?? false;
      }
    });
    return init;
  });

  const salvarMutation = useMutation({
    mutationFn: async (novosEstados: Record<string, boolean>) => {
      const novoProgresso = {
        ...(checklistProgresso ?? {}),
        [colunaNome]: novosEstados,
      };
      const r = await fetch(`/api/kanban/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistProgresso: novoProgresso }),
      });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
  });

  const toggleItem = useCallback(
    (idx: number) => {
      // Não permitir toggle de itens automáticos
      if (itensAutomaticos[idx] !== undefined) return;

      const key = String(idx);
      const novos = { ...estados, [key]: !estados[key] };
      setEstados(novos);
      salvarMutation.mutate(novos);
    },
    [estados, itensAutomaticos, salvarMutation]
  );

  const total = itens.length;
  const feitos = Object.values(estados).filter(Boolean).length;
  const percentual = total > 0 ? Math.round((feitos / total) * 100) : 0;

  if (itens.length === 0) return null;

  return (
    <div
      className="rounded-lg p-3"
      style={{
        backgroundColor: `${corEtapa}10`,
        borderLeft: `3px solid ${corEtapa}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
            style={{ backgroundColor: corEtapa }}
          >
            {colunaNome}
          </span>
          {papelResponsavel && (
            <span className="text-[10px] text-slate-500">
              {papelResponsavel}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {feitos}/{total}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="h-1.5 w-full rounded-full bg-slate-200 mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentual}%`, backgroundColor: corEtapa }}
        />
      </div>

      {/* Responsável */}
      {responsavelNome && (
        <div className="text-[11px] text-slate-500 mb-2">
          Responsável: <span className="font-medium text-slate-700">{responsavelNome}</span>
        </div>
      )}

      {/* Itens */}
      <div className="space-y-1.5">
        {itens.map((texto, idx) => {
          const marcado = estados[String(idx)] ?? false;
          const isAuto = itensAutomaticos[idx] !== undefined;

          return (
            <button
              key={idx}
              onClick={() => toggleItem(idx)}
              disabled={isAuto || salvarMutation.isPending}
              className={`flex w-full items-start gap-2 text-left text-xs rounded-md px-2 py-1.5 transition-colors
                ${isAuto ? "cursor-default" : "cursor-pointer hover:bg-white/50"}
                ${marcado ? "text-slate-400" : "text-slate-700"}
              `}
            >
              <span className="mt-0.5 shrink-0">
                {marcado ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded border-2 text-[9px] font-bold"
                    style={{ borderColor: corEtapa, color: corEtapa }}
                  >
                    {idx + 1}
                  </span>
                )}
              </span>
              <span className={marcado ? "line-through" : ""}>
                {texto}
                {isAuto && (
                  <span className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-400 no-underline">
                    auto
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/detalhe/BlocoOQueFazer.tsx
git commit -m "feat: BlocoOQueFazer — checklist da etapa com progresso"
```

---

### Task 6: Componente — BlocoAcoesEtapa

**Files:**
- Create: `components/detalhe/BlocoAcoesEtapa.tsx`

Botões contextuais baseados em `acoesPadrao` da coluna.

- [ ] **Step 1: Criar componente**

```tsx
"use client";

import { BotaoIa } from "./BotaoIa";
import { Button } from "@/components/ui/button";
import {
  Search,
  FileSearch,
  FileCheck,
  Scale,
  FileEdit,
  BarChart3,
} from "lucide-react";

/** Mapa de ação → configuração visual */
const ACAO_CONFIG: Record<
  string,
  {
    label: string;
    icone: React.ReactNode;
    tipoIa?: string;
    cor?: string;
  }
> = {
  triagem_ia: {
    label: "Triagem IA",
    icone: <Search className="h-3.5 w-3.5" />,
    tipoIa: "triagem",
    cor: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  analise_profunda: {
    label: "Análise Profunda",
    icone: <FileSearch className="h-3.5 w-3.5" />,
    cor: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  checar_habilitacao: {
    label: "Checar Habilitação",
    icone: <FileCheck className="h-3.5 w-3.5" />,
    cor: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  sugerir_proposta: {
    label: "Sugerir Proposta",
    icone: <BarChart3 className="h-3.5 w-3.5" />,
    tipoIa: "proposta",
    cor: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  analise_juridica: {
    label: "Análise Jurídica",
    icone: <Scale className="h-3.5 w-3.5" />,
    tipoIa: "analise_juridica",
    cor: "bg-violet-600 hover:bg-violet-700 text-white",
  },
  redigir_impugnacao: {
    label: "Redigir Impugnação",
    icone: <FileEdit className="h-3.5 w-3.5" />,
    tipoIa: "impugnacao",
  },
};

interface BlocoAcoesEtapaProps {
  licitacaoId: string;
  acoesPadrao: string[];
  onIaResult?: (result: {
    tipo: string;
    resposta: string;
    respostaJson: Record<string, unknown> | null;
    modelo: string;
    acaoId: string;
  }) => void;
  onAnaliseProfunda?: () => void;
  onChecarHabilitacao?: () => void;
}

export function BlocoAcoesEtapa({
  licitacaoId,
  acoesPadrao,
  onIaResult,
  onAnaliseProfunda,
  onChecarHabilitacao,
}: BlocoAcoesEtapaProps) {
  if (acoesPadrao.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-slate-500 mb-1">
        Ações desta etapa
      </div>
      <div className="flex flex-wrap gap-2">
        {acoesPadrao.map((acao, idx) => {
          const config = ACAO_CONFIG[acao];
          if (!config) return null;

          // Ações que disparam via BotaoIa
          if (config.tipoIa && onIaResult) {
            return (
              <BotaoIa
                key={acao}
                licitacaoId={licitacaoId}
                tipo={config.tipoIa}
                label={config.label}
                onResult={onIaResult}
              />
            );
          }

          // Ação: Análise Profunda (trigger manual)
          if (acao === "analise_profunda" && onAnaliseProfunda) {
            return (
              <Button
                key={acao}
                size="sm"
                className={`gap-1.5 text-xs ${idx === 0 ? config.cor ?? "" : ""}`}
                variant={idx === 0 ? "default" : "outline"}
                onClick={onAnaliseProfunda}
              >
                {config.icone}
                {config.label}
              </Button>
            );
          }

          // Ação: Checar Habilitação
          if (acao === "checar_habilitacao" && onChecarHabilitacao) {
            return (
              <Button
                key={acao}
                size="sm"
                className={`gap-1.5 text-xs ${idx === 0 ? config.cor ?? "" : ""}`}
                variant={idx === 0 ? "default" : "outline"}
                onClick={onChecarHabilitacao}
              >
                {config.icone}
                {config.label}
              </Button>
            );
          }

          // Fallback: botão genérico
          return (
            <Button
              key={acao}
              size="sm"
              variant={idx === 0 ? "default" : "outline"}
              className={`gap-1.5 text-xs ${idx === 0 ? config.cor ?? "" : ""}`}
            >
              {config.icone}
              {config.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/detalhe/BlocoAcoesEtapa.tsx
git commit -m "feat: BlocoAcoesEtapa — botões contextuais por coluna"
```

---

### Task 7: Componente — BlocoAvancar

**Files:**
- Create: `components/detalhe/BlocoAvancar.tsx`

Barra fixa de avançar/voltar/descartar.

- [ ] **Step 1: Criar componente**

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface BlocoAvancarProps {
  cardId: string;
  licitacaoId: string;
  colunaAtualId: string;
  colunas: { id: string; nome: string; cor: string; tipo: string; ordem: number }[];
}

export function BlocoAvancar({
  cardId,
  licitacaoId,
  colunaAtualId,
  colunas,
}: BlocoAvancarProps) {
  const queryClient = useQueryClient();
  const [motivoMover, setMotivoMover] = useState("");
  const [colunaPendente, setColunaPendente] = useState<{
    id: string;
    nome: string;
    tipo: string;
  } | null>(null);

  const colunaAtual = colunas.find((c) => c.id === colunaAtualId);
  const ordemAtual = colunaAtual?.ordem ?? 0;

  // Próxima coluna ativa (ordem > atual)
  const proxima = colunas
    .filter((c) => c.ordem > ordemAtual)
    .sort((a, b) => a.ordem - b.ordem)[0];

  // Coluna anterior (ordem < atual)
  const anterior = colunas
    .filter((c) => c.ordem < ordemAtual)
    .sort((a, b) => b.ordem - a.ordem)[0];

  // Primeira coluna final_negativo
  const colunaDescartar = colunas.find((c) => c.tipo === "final_negativo");

  const moverMutation = useMutation({
    mutationFn: (data: {
      cardId: string;
      colunaDestinoId: string;
      motivo?: string;
    }) =>
      fetch("/api/kanban/mover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok)
          return r
            .json()
            .then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacao", licitacaoId] });
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Card movido!");
      setColunaPendente(null);
      setMotivoMover("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleAvancar() {
    if (!proxima) return;
    if (proxima.tipo === "final_negativo") {
      setColunaPendente(proxima);
    } else {
      moverMutation.mutate({ cardId, colunaDestinoId: proxima.id });
    }
  }

  function handleVoltar() {
    if (!anterior) return;
    moverMutation.mutate({ cardId, colunaDestinoId: anterior.id });
  }

  function handleDescartar() {
    if (!colunaDescartar) return;
    setColunaPendente(colunaDescartar);
  }

  function confirmarMover() {
    if (!colunaPendente || !motivoMover.trim()) return;
    moverMutation.mutate({
      cardId,
      colunaDestinoId: colunaPendente.id,
      motivo: motivoMover.trim(),
    });
  }

  return (
    <div className="space-y-2">
      {/* Modal inline de motivo */}
      {colunaPendente && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-sm font-medium text-amber-800">
            Por que está movendo para &quot;{colunaPendente.nome}&quot;?
          </p>
          <Textarea
            placeholder="Ex: Não atende requisitos técnicos, prazo inviável..."
            value={motivoMover}
            onChange={(e) => setMotivoMover(e.target.value)}
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={confirmarMover}
              disabled={!motivoMover.trim() || moverMutation.isPending}
            >
              Confirmar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setColunaPendente(null);
                setMotivoMover("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Botões */}
      {!colunaPendente && (
        <div className="flex gap-2">
          {proxima && (
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleAvancar}
              disabled={moverMutation.isPending}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Avançar → {proxima.nome}
            </Button>
          )}

          {anterior && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleVoltar}
              disabled={moverMutation.isPending}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Button>
          )}

          {colunaDescartar && colunaDescartar.id !== colunaAtualId && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleDescartar}
              disabled={moverMutation.isPending}
            >
              <X className="h-3.5 w-3.5" />
              Descartar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/detalhe/BlocoAvancar.tsx
git commit -m "feat: BlocoAvancar — avançar/voltar/descartar com motivo"
```

---

### Task 8: Componente — ResumoExecutivo

**Files:**
- Create: `components/detalhe/ResumoExecutivo.tsx`

Painel consolidado para etapa de decisão.

- [ ] **Step 1: Criar componente**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ResumoExecutivoProps {
  licitacaoId: string;
}

const COR_CLASSIFICACAO: Record<string, string> = {
  "A+": "bg-emerald-700 text-white",
  A: "bg-blue-600 text-white",
  B: "bg-yellow-500 text-white",
  C: "bg-orange-500 text-white",
  D: "bg-red-600 text-white",
};

function StatusIcon({ ok }: { ok: boolean | null | undefined }) {
  if (ok === true) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (ok === false) return <XCircle className="h-4 w-4 text-red-500" />;
  return <AlertTriangle className="h-4 w-4 text-amber-400" />;
}

export function ResumoExecutivo({ licitacaoId }: ResumoExecutivoProps) {
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

  const { data: analiseProfunda } = useQuery<{
    status: string;
    dados: Record<string, unknown> | null;
  } | null>({
    queryKey: ["analise-profunda", licitacaoId],
    queryFn: async () => {
      const r = await fetch(
        `/api/licitacoes/${licitacaoId}/analise-profunda`
      );
      if (!r.ok) return null;
      return r.json();
    },
  });

  const classificacao = score?.classificacao
    ? String(score.classificacao)
    : null;
  const scoreFinal = score?.scoreFinal ? Number(score.scoreFinal) : null;
  const habilitacaoOk = analiseProfunda?.dados
    ? (analiseProfunda.dados as Record<string, unknown>).habilitacao != null
    : null;

  return (
    <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3">
      <div className="text-sm font-bold text-emerald-900">
        📊 Resumo Executivo
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Score */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Score:</span>
          {classificacao ? (
            <span className={`rounded px-2 py-0.5 text-xs font-bold ${COR_CLASSIFICACAO[classificacao] ?? "bg-slate-400 text-white"}`}>
              {classificacao} {scoreFinal != null ? `${scoreFinal}` : ""}
            </span>
          ) : (
            <span className="text-xs text-slate-400">Não calculado</span>
          )}
        </div>

        {/* Parecer */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Parecer:</span>
          {parecer?.classificacaoFinal ? (
            <Badge variant="outline" className="text-xs">
              {String(parecer.classificacaoFinal)}
            </Badge>
          ) : (
            <span className="text-xs text-slate-400">Pendente</span>
          )}
        </div>

        {/* Habilitação */}
        <div className="flex items-center gap-2">
          <StatusIcon ok={habilitacaoOk} />
          <span className="text-xs">Habilitação</span>
        </div>

        {/* Vale esforço */}
        <div className="flex items-center gap-2">
          <StatusIcon ok={parecer?.valeEsforcoComercial as boolean | null} />
          <span className="text-xs">Vale esforço</span>
        </div>
      </div>

      {/* Recomendação final */}
      {parecer?.recomendacaoFinal && (
        <div className="rounded-md bg-white/70 p-2 text-xs text-slate-700">
          <span className="font-semibold">Recomendação: </span>
          {String(parecer.recomendacaoFinal).slice(0, 200)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/detalhe/ResumoExecutivo.tsx
git commit -m "feat: ResumoExecutivo — painel consolidado para decisão"
```

---

### Task 9: Refatorar LicitacaoDrawer

**Files:**
- Modify: `components/detalhe/LicitacaoDrawer.tsx`

Redesign principal: 3 blocos no topo + seções colapsadas embaixo.

- [ ] **Step 1: Adicionar imports novos**

No topo do arquivo, adicionar:

```typescript
import { BlocoOQueFazer } from "./BlocoOQueFazer";
import { BlocoAcoesEtapa } from "./BlocoAcoesEtapa";
import { BlocoAvancar } from "./BlocoAvancar";
import { ResumoExecutivo } from "./ResumoExecutivo";
import { SecaoColapsavel } from "./SecaoColapsavel";
import { getChecklistItensColuna } from "@/lib/kanban/checklist-por-coluna";
```

- [ ] **Step 2: Redesenhar a seção de exibição do card existente**

Substituir o bloco `{licitacao ? (...)` inteiro. O novo layout segue esta estrutura:

```
Header: #numero + badge coluna + responsável
─────────────────────────
Bloco 1: BlocoOQueFazer (checklist da etapa)
Bloco 2: BlocoAcoesEtapa (botões contextuais)
         ou ResumoExecutivo (se ação = resumo_executivo)
Bloco 3: BlocoAvancar (avançar/voltar/descartar)
─────────────────────────
Seções colapsadas:
  ▸ Dados da licitação (CampoEditavel)
  ▸ Análise Profunda
  ▸ Score / Parecer
  ▸ Assistente IA (botões triagem/analise/proposta)
  ▸ Análises gravadas
  ▸ Histórico de movimentos
```

A implementação exata: manter o header existente (badges + link edital), os blocos novos no topo, e envolver as seções existentes em `<SecaoColapsavel>`. Remover o `<select>` de coluna (substituído pelo BlocoAvancar). Remover o motivo inline (agora está no BlocoAvancar).

Manter todo o código de mutations/handlers de IA existente — eles ainda são usados nos botões de triagem/analise/proposta dentro das seções colapsadas.

Os dados de `acoesPadrao` e `corEtapa` vêm do query `colunas` que já existe. Filtrar pelo `licitacao.card.coluna.id`.

- [ ] **Step 3: Testar build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add components/detalhe/LicitacaoDrawer.tsx
git commit -m "refactor: drawer adaptativo — 3 blocos + seções colapsadas"
```

---

### Task 10: KanbanCard enriquecido

**Files:**
- Modify: `components/kanban/KanbanCard.tsx`
- Modify: `components/kanban/KanbanBoard.tsx`

Adicionar barra de progresso, avatar responsável, prazo com contagem regressiva, score badge.

- [ ] **Step 1: Expandir interface CardData**

No `KanbanCard.tsx`, expandir a interface:

```typescript
interface CardData {
  id: string;
  licitacao: {
    id: string;
    numero: number;
    titulo: string;
    orgao: string | null;
    uf: string | null;
    valorEstimado: number | null;
    dataSessao: string | null;
    dataPublicacao: string | null;
    modalidade: string | null;
    scorePreliminar: number | null;
    classificacaoPreliminar: string | null;
    fonte: { tipo: string; nome: string } | null;
    score: { scoreFinal: number; classificacao: string } | null;
  };
  urgente: boolean;
  responsavel: { name: string | null } | null;
  checklistProgresso: Record<string, Record<string, boolean>> | null;
  coluna: {
    nome: string;
    corEtapa: string | null;
    cor: string;
  };
  /** Calculado pelo pai: { feitos, total } */
  progresso: { feitos: number; total: number } | null;
}
```

- [ ] **Step 2: Adicionar componentes auxiliares no card**

Adicionar antes do export principal:

```typescript
function AvatarResponsavel({ nome }: { nome: string | null }) {
  if (!nome) {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] text-slate-400 font-bold">
        ?
      </div>
    );
  }
  const iniciais = nome
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[9px] text-white font-bold"
      title={nome}
    >
      {iniciais}
    </div>
  );
}

function PrazoContagem({ dataSessao }: { dataSessao: string | null }) {
  if (!dataSessao) return null;
  const sessao = new Date(dataSessao);
  const hoje = new Date();
  const diffMs = sessao.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return <span className="text-[10px] font-semibold text-red-600">⏰ Encerrada</span>;
  }
  if (diffDias === 0) {
    return <span className="text-[10px] font-semibold text-red-600">⏰ HOJE</span>;
  }
  if (diffDias === 1) {
    return <span className="text-[10px] font-semibold text-red-600">⏰ AMANHÃ</span>;
  }
  if (diffDias <= 5) {
    return <span className="text-[10px] font-semibold text-amber-600">⏰ {diffDias} dias</span>;
  }
  return <span className="text-[10px] text-slate-400">⏰ {diffDias}d</span>;
}

function BarraProgresso({ feitos, total, cor }: { feitos: number; total: number; cor: string }) {
  if (total === 0) return null;
  const pct = Math.round((feitos / total) * 100);
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: cor }}
        />
      </div>
      <span className="text-[9px] text-slate-400">{feitos}/{total}</span>
    </div>
  );
}
```

- [ ] **Step 3: Atualizar o JSX do card**

Substituir o JSX do componente `KanbanCard` para incluir:
- Borda lateral colorida via `borderLeft: 3px solid corEtapa`
- Avatar do responsável no header (ao lado dos badges)
- `BarraProgresso` após as badges
- `PrazoContagem` no rodapé junto com valor
- Score do `licitacao.score` (se existir) como badge compacto
- Borda vermelha se sessão é amanhã ou passou

- [ ] **Step 4: Atualizar KanbanBoard para passar dados extras**

No `KanbanBoard.tsx`, atualizar o mapeamento de cards para incluir `checklistProgresso`, `coluna`, e `progresso` calculado a partir dos checklist items da coluna.

- [ ] **Step 5: Testar build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

- [ ] **Step 6: Commit**

```bash
git add components/kanban/KanbanCard.tsx components/kanban/KanbanBoard.tsx components/kanban/KanbanColumn.tsx
git commit -m "feat: cards enriquecidos — progresso, avatar, prazo, score"
```

---

### Task 11: Análise Jurídica IA

**Files:**
- Create: `lib/ia/prompts/analise-juridica.ts`

- [ ] **Step 1: Criar prompt**

```typescript
export const SYSTEM_ANALISE_JURIDICA = `Você é um advogado especializado em licitações públicas brasileiras (Lei 14.133/2021 e legislação anterior).

Sua tarefa é analisar o edital e documentos de uma licitação e identificar:
1. Cláusulas restritivas à competição
2. Riscos jurídicos para o licitante
3. Possibilidade de impugnação
4. Fundamentação legal para eventuais questionamentos

Seja objetivo e cite os artigos de lei quando aplicável.
Retorne APENAS JSON válido sem markdown.`;

export function buildPromptAnaliseJuridica(
  licitacao: {
    titulo: string;
    objeto: string | null;
    modalidade: string | null;
    dadosExtraidos: unknown;
  },
  resumoProfundo: Record<string, unknown> | null,
  textosDocumentos: { nome: string; texto: string }[]
): string {
  const partes: string[] = [];

  partes.push("=== LICITAÇÃO ===");
  partes.push(`Título: ${licitacao.titulo}`);
  partes.push(`Objeto: ${licitacao.objeto ?? "não informado"}`);
  partes.push(`Modalidade: ${licitacao.modalidade ?? "não informada"}`);

  if (resumoProfundo) {
    partes.push("\n=== RESUMO DA ANÁLISE PROFUNDA ===");
    partes.push(JSON.stringify(resumoProfundo, null, 2));
  }

  if (textosDocumentos.length > 0) {
    partes.push("\n=== DOCUMENTOS DO EDITAL ===");
    for (const doc of textosDocumentos) {
      partes.push(`\n--- ${doc.nome} ---`);
      partes.push(doc.texto.slice(0, 20000));
    }
  }

  partes.push(`
=== FORMATO DE RESPOSTA (JSON) ===
{
  "clausulasRestritivas": [
    { "clausula": "Texto da cláusula", "fundamentoLegal": "Art. X da Lei Y", "gravidade": "alta|media|baixa" }
  ],
  "riscosLegais": [
    { "risco": "Descrição", "impacto": "alto|medio|baixo", "mitigacao": "Como mitigar" }
  ],
  "cabeImpugnacao": true,
  "fundamentacaoImpugnacao": "Texto com fundamentação ou null",
  "prazoImpugnacao": "Informação sobre prazo ou null",
  "recomendacao": "IMPUGNAR|PROSSEGUIR|PROSSEGUIR_COM_RESSALVAS",
  "observacoes": "Observações adicionais"
}`);

  return partes.join("\n");
}
```

- [ ] **Step 2: Registrar tipo no endpoint de IA**

Em `app/api/ia/analisar/route.ts`, o tipo `analise_juridica` será aceito como um tipo válido. O endpoint já é genérico — verificar que não há whitelist que bloqueie. Se houver, adicionar `analise_juridica` e `impugnacao` à lista.

- [ ] **Step 3: Commit**

```bash
git add lib/ia/prompts/analise-juridica.ts
git commit -m "feat: prompt de análise jurídica para licitações"
```

---

### Task 12: Checar Habilitação

**Files:**
- Create: `lib/analise-profunda/checar-habilitacao.ts`

Cruza exigências do edital com documentos da empresa.

- [ ] **Step 1: Criar módulo**

```typescript
import { db } from "@/lib/db";

export type ResultadoHabilitacao = {
  ok: boolean;
  exigencias: {
    categoria: string;
    documento: string;
    status: "ok" | "vencido" | "faltando";
    documentoEmpresa: string | null;
    dataValidade: string | null;
  }[];
  resumo: {
    total: number;
    ok: number;
    vencidos: number;
    faltando: number;
  };
};

/**
 * Cruza documentos de habilitação exigidos (da análise profunda)
 * com documentos da empresa cadastrados no sistema.
 */
export async function checarHabilitacao(
  licitacaoId: string
): Promise<ResultadoHabilitacao> {
  // Buscar análise profunda mais recente
  const analise = await db.acaoIa.findFirst({
    where: { licitacaoId, tipo: "analise_profunda", status: "concluido" },
    orderBy: { criadoEm: "desc" },
    select: { respostaJson: true },
  });

  const dados = analise?.respostaJson as Record<string, unknown> | null;
  const habilitacao = dados?.habilitacao as Record<string, string[]> | null;

  if (!habilitacao) {
    return {
      ok: true,
      exigencias: [],
      resumo: { total: 0, ok: 0, vencidos: 0, faltando: 0 },
    };
  }

  // Buscar docs da empresa (todos os CNPJs)
  const docsEmpresa = await db.documentoEmpresa.findMany({
    where: { status: { in: ["vigente", "vencendo", "vencido"] } },
    select: {
      tipoDocumento: true,
      nome: true,
      categoria: true,
      status: true,
      dataValidade: true,
    },
  });

  const exigencias: ResultadoHabilitacao["exigencias"] = [];

  const categorias: [string, string[]][] = [
    ["juridica", habilitacao.juridica ?? []],
    ["tecnica", habilitacao.tecnica ?? []],
    ["fiscal", habilitacao.fiscal ?? []],
    ["economica", habilitacao.economica ?? []],
    ["declaracoes", habilitacao.declaracoes ?? []],
  ];

  for (const [categoria, docs] of categorias) {
    for (const docExigido of docs) {
      const docExigidoLower = docExigido.toLowerCase();

      // Buscar match fuzzy nos docs da empresa
      const match = docsEmpresa.find((d) => {
        const nomeDoc = (d.tipoDocumento + " " + d.nome).toLowerCase();
        // Match por palavras-chave
        const palavras = docExigidoLower.split(/\s+/).filter((p) => p.length > 3);
        return palavras.some((p) => nomeDoc.includes(p));
      });

      if (!match) {
        exigencias.push({
          categoria,
          documento: docExigido,
          status: "faltando",
          documentoEmpresa: null,
          dataValidade: null,
        });
      } else if (match.status === "vencido") {
        exigencias.push({
          categoria,
          documento: docExigido,
          status: "vencido",
          documentoEmpresa: match.nome,
          dataValidade: match.dataValidade?.toISOString() ?? null,
        });
      } else {
        exigencias.push({
          categoria,
          documento: docExigido,
          status: "ok",
          documentoEmpresa: match.nome,
          dataValidade: match.dataValidade?.toISOString() ?? null,
        });
      }
    }
  }

  const resumo = {
    total: exigencias.length,
    ok: exigencias.filter((e) => e.status === "ok").length,
    vencidos: exigencias.filter((e) => e.status === "vencido").length,
    faltando: exigencias.filter((e) => e.status === "faltando").length,
  };

  return {
    ok: resumo.vencidos === 0 && resumo.faltando === 0,
    exigencias,
    resumo,
  };
}
```

- [ ] **Step 2: Criar endpoint API**

Criar `app/api/licitacoes/[id]/habilitacao/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { checarHabilitacao } from "@/lib/analise-profunda/checar-habilitacao";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const resultado = await checarHabilitacao(id);
  return NextResponse.json(resultado);
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/analise-profunda/checar-habilitacao.ts app/api/licitacoes/[id]/habilitacao/
git commit -m "feat: checar habilitação — cruzamento docs empresa vs edital"
```

---

### Task 13: ColunasEditor expandido

**Files:**
- Modify: `components/configuracoes/ColunasEditor.tsx`

Adicionar campos de `acoesPadrao`, `corEtapa`, `papelResponsavel` na UI de configuração.

- [ ] **Step 1: Adicionar constantes de ações**

No topo do arquivo:

```typescript
const ACOES_DISPONIVEIS = [
  { value: "triagem_ia", label: "Triagem IA" },
  { value: "analise_profunda", label: "Análise Profunda" },
  { value: "checar_habilitacao", label: "Checar Habilitação" },
  { value: "sugerir_proposta", label: "Sugerir Proposta" },
  { value: "analise_juridica", label: "Análise Jurídica" },
  { value: "redigir_impugnacao", label: "Redigir Impugnação" },
  { value: "resumo_executivo", label: "Resumo Executivo" },
];

const PAPEIS_DISPONIVEIS = [
  { value: "", label: "Nenhum" },
  { value: "comercial", label: "Comercial" },
  { value: "tecnico", label: "Técnico" },
  { value: "juridico", label: "Jurídico" },
  { value: "diretor", label: "Diretor" },
  { value: "administrativo", label: "Administrativo" },
];
```

- [ ] **Step 2: Expandir cada row de coluna**

Dentro do `.map()` que renderiza cada coluna, após o `<select>` de tipo, adicionar uma seção expandível ou segunda linha com:

- Multi-checkbox para `acoesPadrao` (usando as constantes acima)
- Color picker para `corEtapa` (separado da cor principal)
- Select para `papelResponsavel`

Cada alteração chama `editarMutation.mutate({ id: col.id, acoesPadrao: [...] })` etc.

- [ ] **Step 3: Também expandir o form de nova coluna**

Adicionar os mesmos campos ao form "Adicionar nova coluna".

- [ ] **Step 4: Testar build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

- [ ] **Step 5: Commit**

```bash
git add components/configuracoes/ColunasEditor.tsx
git commit -m "feat: configuração de workflow por coluna (ações, cor, papel)"
```

---

### Task 14: Seed — Colunas padrão com workflow

**Files:**
- Nenhum arquivo novo — rodar via script ou manualmente

- [ ] **Step 1: Atualizar colunas existentes no banco**

Criar um script ou rodar manualmente para popular as colunas existentes com `acoesPadrao` sensatos. Exemplo via API ou SQL direto:

| Coluna | acoesPadrao | papelResponsavel |
|--------|------------|------------------|
| Captação/Triagem | `["triagem_ia", "analise_profunda"]` | `"comercial"` |
| Qualificação | `["analise_profunda", "checar_habilitacao"]` | `"tecnico"` |
| Análise | `["analise_profunda", "checar_habilitacao", "sugerir_proposta"]` | `"tecnico"` |
| Jurídico (se existir) | `["analise_juridica", "redigir_impugnacao"]` | `"juridico"` |
| Proposta/Decisão | `["resumo_executivo"]` | `"diretor"` |

Isso pode ser feito manualmente pela UI de Configurações → Colunas após o deploy.

- [ ] **Step 2: Commit (se script)**

```bash
git commit -m "chore: seed de workflow padrão nas colunas"
```

---

### Task 15: Build final e deploy

- [ ] **Step 1: Build local**

```bash
rm -rf .next && npx next build
```

Expected: Compiled successfully, sem erros TypeScript.

- [ ] **Step 2: Commit final e push**

```bash
git add -A
git status  # verificar que não há arquivos sensíveis
git commit -m "feat: contexto inteligente — drawer adaptativo + cards enriquecidos"
git push origin main
```

- [ ] **Step 3: Deploy VPS**

```bash
ssh -i ~/.ssh/id_ed25519_hostinger_vps root@srv1353769.hstgr.cloud \
  "cd /var/www/kanbamlicita && git pull origin main && npm install && npx prisma generate && npx prisma db push && rm -rf .next && npm run build && pm2 restart kanbamlicita"
```

Expected: PM2 restart com status "online".

- [ ] **Step 4: Configurar colunas na UI**

Acessar Configurações → Colunas e configurar `acoesPadrao`, `corEtapa` e `papelResponsavel` para cada coluna existente.

---

## Verificação Final

- [ ] Ao abrir um card, o drawer mostra checklist + ações da coluna atual
- [ ] Marcar item no checklist salva via PATCH e atualiza progresso no card
- [ ] Botão "Avançar" move para próxima coluna
- [ ] Cards no kanban mostram barra de progresso e avatar
- [ ] Prazo com contagem regressiva aparece nos cards
- [ ] Configurações → Colunas permite editar ações e papel
- [ ] Análise jurídica funciona via IA
- [ ] Checar habilitação cruza docs empresa vs edital
- [ ] ResumoExecutivo consolida score/parecer/habilitação
- [ ] Build passa sem erros TypeScript
