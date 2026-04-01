# SP-D: Avaliacao Automatica de Aderencia — Plano

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Avaliar automaticamente licitacoes contra regras de aderencia e mostrar badges no Kanban.

**Architecture:** Avaliador inline no pipeline + campos JSON na Licitacao + badges visuais.

**Tech Stack:** Prisma, TypeScript, React/Tailwind

---

### Task 1: Schema — adicionar campos na Licitacao

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] Adicionar 3 campos na model Licitacao:
  - `aderenciaAutomatica Json? @map("aderencia_automatica")`
  - `scorePreliminar Float? @map("score_preliminar")`
  - `classificacaoPreliminar String? @map("classificacao_preliminar")`
- [ ] Rodar `npx prisma generate` e `npx prisma db push`

---

### Task 2: Avaliador de aderencia

**Files:**
- Create: `lib/aderencia/avaliador.ts`

- [ ] Criar funcao `avaliarRegra(licitacao, regra)` que testa um campo/operador/valor
- [ ] Criar funcao `avaliarAderencia(licitacao, regras)` que retorna resultado completo
- [ ] Suportar operadores: igual, diferente, contem, nao_contem, maior, menor, regex
- [ ] Calcular score preliminar (0-100) e classificacao (A+/A/B/C/D)

---

### Task 3: Injetar no pipeline

**Files:**
- Modify: `lib/fontes/pipeline.ts`
- Create: `lib/aderencia/pipeline-hook.ts`

- [ ] Criar hook que carrega regras ativas e chama avaliador
- [ ] Salvar resultado nos 3 campos da Licitacao
- [ ] Chamar hook apos criar/atualizar card no pipeline

---

### Task 4: API de aderencia por licitacao

**Files:**
- Create: `app/api/licitacoes/[id]/aderencia/route.ts`

- [ ] GET: retorna aderenciaAutomatica, scorePreliminar, classificacaoPreliminar
- [ ] POST: recalcula aderencia sob demanda

---

### Task 5: Badges visuais no Kanban

**Files:**
- Modify: `components/kanban/KanbanCard.tsx`

- [ ] Exibir badge de classificacao (A+/A/B/C/D) com cores
- [ ] Exibir badge "Baixa aderencia" quando tem exclusao violada
- [ ] Cores: A+/A=verde, B=azul, C=laranja, D=vermelho
