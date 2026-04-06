# Fase 2: Sync Manual de Fontes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir sincronização manual por fonte com execução registrada, payload bruto persistido e atualização imediata do histórico no admin.

**Architecture:** Um adaptador mock fornece registros brutos por fonte. Um serviço de sync cria `captacao_execucoes`, grava `captacao_payloads`, atualiza contadores/status e marca `ultimaSincronizacao`. A UI de `SistemaTab` ganha ação de sincronizar e refetch do histórico da fonte.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, PostgreSQL, Jest, Tailwind CSS

---

## Arquivos

| Ação | Arquivo | O que muda |
|------|---------|-----------|
| Create | `lib/captacao/types.ts` | Tipos do adaptador de captação |
| Create | `lib/captacao/mock-source.ts` | Provider mock de registros brutos |
| Create | `lib/captacao/sync.ts` | Serviço de sincronização manual |
| Create | `app/api/admin/fontes/[id]/sync/route.ts` | Endpoint POST para rodar sync |
| Modify | `components/configuracoes/SistemaTab.tsx` | Botão de sincronizar e refresh do histórico |
| Create | `__tests__/lib/captacao-sync.test.ts` | Testes da regra de sync |
| Modify | `__tests__/api/fontes-execucoes.test.ts` | Cobrir leitura das execuções após sync |

---

## Tarefas

### Task 1: Serviço de sync manual (TDD)

**Files:**
- Create: `__tests__/lib/captacao-sync.test.ts`
- Create: `lib/captacao/types.ts`
- Create: `lib/captacao/mock-source.ts`
- Create: `lib/captacao/sync.ts`

- [ ] Escrever teste que cria execução com status `concluido` e grava payloads
- [ ] Rodar teste e verificar falha por módulo inexistente
- [ ] Implementar provider mock + serviço mínimo
- [ ] Rodar teste e verificar verde

### Task 2: Endpoint admin para disparar sync

**Files:**
- Create: `app/api/admin/fontes/[id]/sync/route.ts`
- Modify: `lib/captacao/sync.ts`

- [ ] Escrever teste focado no serviço usado pela rota
- [ ] Implementar `POST` admin-only chamando `runFonteSync`
- [ ] Retornar resumo da execução (`status`, `totalLidos`, `totalErros`)
- [ ] Rodar testes da task

### Task 3: UI de sincronização em Configurações > Sistema

**Files:**
- Modify: `components/configuracoes/SistemaTab.tsx`

- [ ] Adicionar botão `Sincronizar` por fonte
- [ ] Exibir estado `Sincronizando...`
- [ ] Atualizar `ultimaSincronizacao`
- [ ] Refazer fetch do histórico ao final

### Task 4: Verificação

**Files:**
- Modify: `__tests__/api/fontes-execucoes.test.ts`

- [ ] Rodar testes do sync e execuções
- [ ] Rodar `ReadLints` nos arquivos alterados
- [ ] Validar resposta HTTP do endpoint `/api/admin/fontes/[id]/sync`
