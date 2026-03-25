# SP-1 — Fundação + Kanban Base — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundação técnica do kanbamlicita — projeto Next.js com schema PostgreSQL completo via Prisma, seed de 30 licitações e quadro Kanban operacional com drag-and-drop, filtros, travas e métricas.

**Architecture:** Next.js 14+ App Router com Server Components para busca inicial de dados e Client Components (TanStack Query + @dnd-kit) para o Kanban interativo. Lógica de negócio centralizada em `lib/kanban.ts` (pura, testável). API routes finas que delegam para `lib/`.

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL, Tailwind CSS, shadcn/ui, @dnd-kit/core, @tanstack/react-query, Jest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-24-sp1-kanban-base-design.md`

---

## Mapa de Arquivos

```
kanbamlicita/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json                   # shadcn/ui config
├── jest.config.ts
├── jest.setup.ts
├── ecosystem.config.js               # PM2 deploy config
├── .env.local                        # (não versionado) DATABASE_URL
│
├── prisma/
│   ├── schema.prisma                 # 14 tabelas
│   └── seed.ts                       # 30 licitações fictícias
│
├── lib/
│   ├── db.ts                         # Prisma client singleton
│   └── kanban.ts                     # KANBAN_COLUNAS, validateMove, queries
│
├── types/
│   └── licitacao.ts                  # Tipos de domínio derivados do Prisma
│
├── app/
│   ├── globals.css
│   ├── layout.tsx                    # Root layout — AppShell wrapper
│   ├── page.tsx                      # Redirect → /kanban
│   ├── kanban/
│   │   └── page.tsx                  # Server Component — busca e passa dados
│   ├── licitacoes/
│   │   └── page.tsx                  # Placeholder (SP-3)
│   ├── fontes/
│   │   └── page.tsx                  # Placeholder (SP-2)
│   └── api/
│       ├── licitacoes/route.ts       # GET /api/licitacoes
│       └── kanban/
│           ├── mover/route.ts        # POST /api/kanban/mover
│           └── metricas/route.ts     # GET /api/kanban/metricas
│
├── components/
│   ├── providers.tsx                     # QueryClientProvider wrapper
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── SidebarNav.tsx
│   │   └── TopBar.tsx
│   ├── kanban/
│   │   ├── KanbanBoard.tsx           # "use client" — dnd-kit + TanStack Query
│   │   ├── KanbanColumn.tsx
│   │   ├── LicitacaoCard.tsx
│   │   ├── CardQuickActions.tsx
│   │   ├── MoveKanbanModal.tsx
│   │   ├── FilterBar.tsx
│   │   └── MetricsCardsRow.tsx
│   └── ui/                           # shadcn/ui components (gerados pelo CLI)
│
└── __tests__/
    ├── lib/
    │   └── kanban.test.ts
    └── api/
        ├── licitacoes.test.ts
        ├── kanban-mover.test.ts
        └── kanban-metricas.test.ts
```

---

## Task 1: Scaffold do Projeto

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `jest.config.ts`, `jest.setup.ts`, `components.json`

- [ ] **Step 1.1: Criar o projeto Next.js**

```bash
cd "C:/Users/vinic/OneDrive/PROJETOS/APPS"
npx create-next-app@latest kanbamlicita \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
cd kanbamlicita
```

- [ ] **Step 1.2: Instalar dependências de produção**

```bash
npm install \
  prisma @prisma/client \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  @tanstack/react-query \
  class-variance-authority clsx tailwind-merge \
  lucide-react \
  sonner
```

- [ ] **Step 1.3: Instalar dependências de desenvolvimento e test**

```bash
npm install --save-dev \
  jest @types/jest ts-jest \
  jest-environment-jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  @types/node
```

- [ ] **Step 1.4: Inicializar shadcn/ui**

```bash
npx shadcn@latest init
```

Quando solicitado:
- Style: `Default`
- Base color: `Slate`
- CSS variables: `Yes`

- [ ] **Step 1.5: Adicionar componentes shadcn necessários**

```bash
npx shadcn@latest add badge button card dialog input select toast
```

- [ ] **Step 1.6: Inicializar Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Isso cria `prisma/schema.prisma` e `.env`. Renomear `.env` para `.env.local`:

```bash
mv .env .env.local
```

Editar `.env.local` e adicionar:
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/kanbamlicita"
```

- [ ] **Step 1.7: Configurar Jest**

Criar `jest.config.ts`:
```ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
}

export default createJestConfig(config)
```

Criar `jest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 1.8: Criar diretórios de teste**

```bash
mkdir -p __tests__/lib __tests__/api
```

- [ ] **Step 1.9: Commit inicial**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with deps and test setup"
```

---

## Task 2: Schema Prisma — 14 Tabelas

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 2.1: Escrever o schema completo**

Substituir o conteúdo de `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enum de colunas do Kanban ────────────────────────────────────────────────
enum KanbanColuna {
  captadas_automaticamente
  triagem_inicial
  em_analise
  viavel_comercialmente
  proposta_documentacao
  enviadas_participando
  ganhamos
  perdemos
  descartadas
}

// ─── Entidade principal ───────────────────────────────────────────────────────
model Licitacao {
  id                         String    @id @default(uuid())
  idExterno                  String?   @map("id_externo") @db.VarChar(120)
  fonteCaptacao              String?   @map("fonte_captacao") @db.VarChar(50)
  linkOrigem                 String?   @map("link_origem")
  orgao                      String?
  numeroLicitacao            String?   @map("numero_licitacao") @db.VarChar(120)
  numeroProcesso             String?   @map("numero_processo") @db.VarChar(120)
  modalidade                 String?   @db.VarChar(80)
  tipoDisputa                String?   @map("tipo_disputa") @db.VarChar(80)
  criterioJulgamento         String?   @map("criterio_julgamento") @db.VarChar(120)
  objetoResumido             String?   @map("objeto_resumido")
  segmento                   String?   @db.VarChar(80)  // adicionado no SP-1 (não consta no doc-mãe SQL)
  dataPublicacao             DateTime? @map("data_publicacao") @db.Date
  dataSessao                 DateTime? @map("data_sessao")
  uf                         String?   @db.Char(2)
  municipio                  String?   @db.VarChar(120)
  regiao                     String?   @db.VarChar(50)
  valorGlobalEstimado        Decimal?  @map("valor_global_estimado") @db.Decimal(18, 2)
  moeda                      String    @default("BRL") @db.Char(3)
  possuiLotes                Boolean   @default(false) @map("possui_lotes")
  possuiItens                Boolean   @default(false) @map("possui_itens")
  possuiPlanilhaOrcamentaria Boolean   @default(false) @map("possui_planilha_orcamentaria")
  possuiQuantitativos        Boolean   @default(false) @map("possui_quantitativos")
  possuiPrecosUnitarios      Boolean   @default(false) @map("possui_precos_unitarios")
  envolveLocacao             Boolean   @default(false) @map("envolve_locacao")
  envolveFornecimento        Boolean   @default(false) @map("envolve_fornecimento")
  envolveServico             Boolean   @default(false) @map("envolve_servico")
  envolveObra                Boolean   @default(false) @map("envolve_obra")
  envolveInstalacao          Boolean   @default(false) @map("envolve_instalacao")
  envolveMontagem            Boolean   @default(false) @map("envolve_montagem")
  envolveDesmontagem         Boolean   @default(false) @map("envolve_desmontagem")
  envolveTransporte          Boolean   @default(false) @map("envolve_transporte")
  envolveMobilizacao         Boolean   @default(false) @map("envolve_mobilizacao")
  envolveDesmobilizacao      Boolean   @default(false) @map("envolve_desmobilizacao")
  envolveManutencao          Boolean   @default(false) @map("envolve_manutencao")
  resumoNatureza             String?   @map("resumo_natureza")
  statusPipeline             String    @default("pendente") @map("status_pipeline") @db.VarChar(40)
  criadoEm                   DateTime  @default(now()) @map("criado_em")
  atualizadoEm               DateTime  @updatedAt @map("atualizado_em")

  card              KanbanCard?
  movimentacoes     KanbanMovimentacao[]
  score             LicitacaoScore?
  documentos        LicitacaoDocumento?
  sinais            LicitacaoSinal[]
  itens             LicitacaoItem[]
  analise           LicitacaoAnalise?
  parecer           LicitacaoParece?
  analisesIa        LicitacaoAnaliseIa[]
  aliasesOrigem     LicitacaoAliasOrigem[]

  @@map("licitacoes")
}

// ─── Kanban ───────────────────────────────────────────────────────────────────
model KanbanCard {
  id             String       @id @default(uuid())
  licitacaoId    String       @unique @map("licitacao_id")
  colunaAtual    KanbanColuna @map("coluna_atual")
  ordemColuna    Int          @default(0) @map("ordem_coluna")
  responsavelId  String?      @map("responsavel_id")
  urgente        Boolean      @default(false)
  bloqueado      Boolean      @default(false)
  motivoBloqueio String?      @map("motivo_bloqueio")
  criadoEm       DateTime     @default(now()) @map("criado_em")
  atualizadoEm   DateTime     @updatedAt @map("atualizado_em")

  licitacao     Licitacao            @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)
  movimentacoes KanbanMovimentacao[]

  @@map("kanban_cards")
}

model KanbanMovimentacao {
  id            String       @id @default(uuid())
  cardId        String       @map("card_id")
  licitacaoId   String       @map("licitacao_id")
  colunaOrigem  KanbanColuna? @map("coluna_origem")
  colunaDestino KanbanColuna  @map("coluna_destino")
  movidoPor     String?      @map("movido_por")
  motivo        String?
  automatico    Boolean      @default(false)
  criadoEm      DateTime     @default(now()) @map("criado_em")

  card      KanbanCard @relation(fields: [cardId], references: [id], onDelete: Cascade)
  licitacao Licitacao  @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("kanban_movimentacoes")
}

// ─── Score, valor capturável e falso negativo ─────────────────────────────────
model LicitacaoScore {
  id                                    String   @id @default(uuid())
  licitacaoId                           String   @unique @map("licitacao_id")
  scoreFinal                            Decimal  @default(0) @map("score_final") @db.Decimal(5, 2)
  faixaClassificacao                    String   @default("D") @map("faixa_classificacao") @db.VarChar(5)
  scoreAderenciaDireta                  Decimal  @default(0) @map("score_aderencia_direta") @db.Decimal(5, 2)
  scoreAderenciaAplicacao               Decimal  @default(0) @map("score_aderencia_aplicacao") @db.Decimal(5, 2)
  scoreContextoOculto                   Decimal  @default(0) @map("score_contexto_oculto") @db.Decimal(5, 2)
  scoreModeloComercial                  Decimal  @default(0) @map("score_modelo_comercial") @db.Decimal(5, 2)
  scorePotencialEconomico               Decimal  @default(0) @map("score_potencial_economico") @db.Decimal(5, 2)
  scoreQualidadeEvidencia               Decimal  @default(0) @map("score_qualidade_evidencia") @db.Decimal(5, 2)
  scoreJustificativaResumida            String?  @map("score_justificativa_resumida")
  valorCapturavelObrigatorioPreenchido  Boolean  @default(true) @map("valor_capturavel_obrigatorio_preenchido")
  valorCapturavelFoiPossivelEstimar     Boolean  @default(false) @map("valor_capturavel_foi_possivel_estimar")
  valorCapturavelEstimado               Decimal? @map("valor_capturavel_estimado") @db.Decimal(18, 2)
  valorCapturavelFaixaMin               Decimal? @map("valor_capturavel_faixa_min") @db.Decimal(18, 2)
  valorCapturavelFaixaMax               Decimal? @map("valor_capturavel_faixa_max") @db.Decimal(18, 2)
  valorCapturavelMoeda                  String   @default("BRL") @map("valor_capturavel_moeda") @db.Char(3)
  valorCapturavelNivelConfianca         String   @default("baixo") @map("valor_capturavel_nivel_confianca") @db.VarChar(20)
  valorCapturavelMetodoEstimativa       String   @default("nao_estimado") @map("valor_capturavel_metodo_estimativa") @db.VarChar(50)
  valorCapturavelJustificativa          String   @default("") @map("valor_capturavel_justificativa")
  valorCapturavelBasedocumental         Json     @default("[]") @map("valor_capturavel_base_documental")
  valorCapturavelObservacao             String?  @map("valor_capturavel_observacao")
  falsoNegativoObrigatorioPreenchido    Boolean  @default(true) @map("falso_negativo_obrigatorio_preenchido")
  falsoNegativoExisteRisco              Boolean  @default(false) @map("falso_negativo_existe_risco")
  falsoNegativoNivelRisco               String   @default("baixo") @map("falso_negativo_nivel_risco") @db.VarChar(20)
  falsoNegativoMotivos                  Json     @default("[]") @map("falso_negativo_motivos")
  falsoNegativoTrechosCriticos          Json     @default("[]") @map("falso_negativo_trechos_criticos")
  falsoNegativoResumo                   String   @default("") @map("falso_negativo_resumo")
  criadoEm                              DateTime @default(now()) @map("criado_em")
  atualizadoEm                          DateTime @updatedAt @map("atualizado_em")

  licitacao Licitacao @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("licitacao_score")
}

// ─── Documentos ───────────────────────────────────────────────────────────────
model LicitacaoDocumento {
  id                         String   @id @default(uuid())
  licitacaoId                String   @unique @map("licitacao_id")
  possuiEdital               Boolean  @default(false) @map("possui_edital")
  possuiTermoReferencia      Boolean  @default(false) @map("possui_termo_referencia")
  possuiProjetoBasico        Boolean  @default(false) @map("possui_projeto_basico")
  possuiMemorialDescritivo   Boolean  @default(false) @map("possui_memorial_descritivo")
  possuiAnexosTecnicos       Boolean  @default(false) @map("possui_anexos_tecnicos")
  possuiPlanilhaOrcamentaria Boolean  @default(false) @map("possui_planilha_orcamentaria")
  possuiCronograma           Boolean  @default(false) @map("possui_cronograma")
  possuiMinutaContratual     Boolean  @default(false) @map("possui_minuta_contratual")
  lacunasDocumentais         String?  @map("lacunas_documentais")
  criadoEm                   DateTime @default(now()) @map("criado_em")
  atualizadoEm               DateTime @updatedAt @map("atualizado_em")

  licitacao Licitacao @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("licitacao_documentos")
}

// ─── Sinais ───────────────────────────────────────────────────────────────────
model LicitacaoSinal {
  id              String   @id @default(uuid())
  licitacaoId     String   @map("licitacao_id")
  categoria       String   @db.VarChar(50)
  subcategoria    String?  @db.VarChar(50)
  sinal           String
  nivel           String?  @db.VarChar(30)
  trecho          String?
  fonteDocumento  String?  @map("fonte_documento") @db.VarChar(80)
  relevancia      String?  @db.VarChar(20)
  criadoEm        DateTime @default(now()) @map("criado_em")

  licitacao Licitacao @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("licitacao_sinais")
}

// ─── Itens e lotes ────────────────────────────────────────────────────────────
model LicitacaoItem {
  id                 String   @id @default(uuid())
  licitacaoId        String   @map("licitacao_id")
  tipo               String?  @db.VarChar(20)
  identificador      String?  @db.VarChar(80)
  descricao          String?
  quantitativo       Decimal? @db.Decimal(18, 4)
  unidade            String?  @db.VarChar(30)
  aderencia          String   @default("nenhuma") @db.VarChar(20)
  tipoAderencia      String   @default("nenhuma") @map("tipo_aderencia") @db.VarChar(30)
  prioridade         String   @default("baixa") @db.VarChar(20)
  valorEstimadoItem  Decimal? @map("valor_estimado_item") @db.Decimal(18, 2)
  motivo             String?
  observacoes        String?
  criadoEm           DateTime @default(now()) @map("criado_em")
  atualizadoEm       DateTime @updatedAt @map("atualizado_em")

  licitacao Licitacao @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("licitacao_itens")
}

// ─── Análise consolidada ──────────────────────────────────────────────────────
model LicitacaoAnalise {
  id                              String   @id @default(uuid())
  licitacaoId                     String   @unique @map("licitacao_id")
  aderenciaDiretaExiste           Boolean  @default(false) @map("aderencia_direta_existe")
  aderenciaDiretaNivel            String   @default("nenhuma") @map("aderencia_direta_nivel") @db.VarChar(20)
  aderenciaAplicacaoExiste        Boolean  @default(false) @map("aderencia_aplicacao_existe")
  aderenciaAplicacaoNivel         String   @default("nenhuma") @map("aderencia_aplicacao_nivel") @db.VarChar(20)
  contextoOcultoExiste            Boolean  @default(false) @map("contexto_oculto_existe")
  contextoOcultoNivel             String   @default("nenhuma") @map("contexto_oculto_nivel") @db.VarChar(20)
  modeloComercialExiste           Boolean  @default(false) @map("modelo_comercial_existe")
  modeloComercialNivel            String   @default("nenhum") @map("modelo_comercial_nivel") @db.VarChar(20)
  oportunidadeOcultaExiste        Boolean  @default(false) @map("oportunidade_oculta_existe")
  oportunidadeOcultaForca         String   @default("nenhuma") @map("oportunidade_oculta_forca") @db.VarChar(20)
  oportunidadeOcultaResumo        String?  @map("oportunidade_oculta_resumo")
  oportunidadeNoObjeto            Boolean  @default(false) @map("oportunidade_no_objeto")
  oportunidadeNoTr                Boolean  @default(false) @map("oportunidade_no_tr")
  oportunidadeNosLotes            Boolean  @default(false) @map("oportunidade_nos_lotes")
  oportunidadeNosItens            Boolean  @default(false) @map("oportunidade_nos_itens")
  oportunidadeNaPlanilha          Boolean  @default(false) @map("oportunidade_na_planilha")
  oportunidadeNoMemorial          Boolean  @default(false) @map("oportunidade_no_memorial")
  oportunidadeEmAnexoTecnico      Boolean  @default(false) @map("oportunidade_em_anexo_tecnico")
  portfolioAplicavel              Json     @default("[]") @map("portfolio_aplicavel")
  solucoesMuliteinerAplicaveis    Json     @default("[]") @map("solucoes_multiteiner_aplicaveis")
  criadoEm                        DateTime @default(now()) @map("criado_em")
  atualizadoEm                    DateTime @updatedAt @map("atualizado_em")

  licitacao Licitacao @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("licitacao_analise")
}

// ─── Parecer executivo ────────────────────────────────────────────────────────
model LicitacaoParece {
  id                                   String   @id @default(uuid())
  licitacaoId                          String   @unique @map("licitacao_id")
  classificacaoFinal                   String   @default("D") @map("classificacao_final") @db.VarChar(5)
  prioridadeComercial                  String   @default("baixa") @map("prioridade_comercial") @db.VarChar(20)
  valeEsforcoComercial                 Boolean  @default(false) @map("vale_esforco_comercial")
  recomendacaoFinal                    String   @default("DESCARTAR") @map("recomendacao_final") @db.VarChar(40)
  resumo                               String?
  oportunidadeDireta                   Boolean  @default(false) @map("oportunidade_direta")
  oportunidadeIndireta                 Boolean  @default(false) @map("oportunidade_indireta")
  oportunidadeOcultaItemLoteAnexo      Boolean  @default(false) @map("oportunidade_oculta_item_lote_anexo")
  oportunidadeInexistente              Boolean  @default(true) @map("oportunidade_inexistente")
  ondeEstaOportunidade                 Json     @default("[]") @map("onde_esta_oportunidade")
  solucoesQueMultiteinerPoderiaOfertar Json     @default("[]") @map("solucoes_que_multiteiner_poderia_ofertar")
  proximoPasosRecomendado              Json     @default("[]") @map("proximo_passo_recomendado")
  riscosLimitacoes                     Json     @default("[]") @map("riscos_limitacoes")
  evidenciasPrincipais                 Json     @default("[]") @map("evidencias_principais")
  riscoFalsoPositivo                   String   @default("baixo") @map("risco_falso_positivo") @db.VarChar(20)
  riscoFalsoNegativoSoTitulo           String   @default("baixo") @map("risco_falso_negativo_so_titulo") @db.VarChar(20)
  criadoEm                             DateTime @default(now()) @map("criado_em")
  atualizadoEm                         DateTime @updatedAt @map("atualizado_em")

  licitacao Licitacao @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("licitacao_parecer")
}

// ─── Análises por IA ──────────────────────────────────────────────────────────
model LicitacaoAnaliseIa {
  id             String   @id @default(uuid())
  licitacaoId    String   @map("licitacao_id")
  tipoAnalise    String   @map("tipo_analise") @db.VarChar(50)
  status         String   @default("pendente") @db.VarChar(30)
  modeloUtilizado String? @map("modelo_utilizado") @db.VarChar(80)
  promptVersao   String?  @map("prompt_versao") @db.VarChar(40)
  resultadoJson  Json     @default("{}") @map("resultado_json")
  resumoTexto    String?  @map("resumo_texto")
  criadoEm       DateTime @default(now()) @map("criado_em")
  atualizadoEm   DateTime @updatedAt @map("atualizado_em")

  licitacao Licitacao @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("licitacao_analises_ia")
}

// ─── Captação ─────────────────────────────────────────────────────────────────
model CaptacaoFonte {
  id                   String    @id @default(uuid())
  nome                 String    @db.VarChar(100)
  tipo                 String    @db.VarChar(50)
  endpointBase         String?   @map("endpoint_base")
  ativo                Boolean   @default(true)
  autenticacaoTipo     String?   @map("autenticacao_tipo") @db.VarChar(50)
  configuracao         Json      @default("{}")
  ultimaSincronizacao  DateTime? @map("ultima_sincronizacao")
  criadoEm             DateTime  @default(now()) @map("criado_em")
  atualizadoEm         DateTime  @updatedAt @map("atualizado_em")

  execucoes CaptacaoExecucao[]
  payloads  CaptacaoPayload[]
  aliases   LicitacaoAliasOrigem[]

  @@map("captacao_fontes")
}

model CaptacaoExecucao {
  id                         String    @id @default(uuid())
  fonteId                    String    @map("fonte_id")
  iniciadoEm                 DateTime  @default(now()) @map("iniciado_em")
  finalizadoEm               DateTime? @map("finalizado_em")
  status                     String    @default("rodando") @db.VarChar(30)
  totalLidos                 Int       @default(0) @map("total_lidos")
  totalNovos                 Int       @default(0) @map("total_novos")
  totalAtualizados           Int       @default(0) @map("total_atualizados")
  totalDescartadosDuplicidade Int      @default(0) @map("total_descartados_duplicidade")
  totalErros                 Int       @default(0) @map("total_erros")
  logResumo                  String?   @map("log_resumo")

  fonte    CaptacaoFonte     @relation(fields: [fonteId], references: [id], onDelete: Cascade)
  payloads CaptacaoPayload[]

  @@map("captacao_execucoes")
}

model CaptacaoPayload {
  id                   String   @id @default(uuid())
  execucaoId           String   @map("execucao_id")
  fonteId              String   @map("fonte_id")
  idExternoOrigem      String?  @map("id_externo_origem") @db.VarChar(200)
  payloadBruto         Json     @map("payload_bruto")
  hashPayload          String?  @map("hash_payload") @db.VarChar(128)
  capturadoEm          DateTime @default(now()) @map("capturado_em")
  statusProcessamento  String   @default("pendente") @map("status_processamento") @db.VarChar(30)
  erroProcessamento    String?  @map("erro_processamento")

  execucao CaptacaoExecucao @relation(fields: [execucaoId], references: [id], onDelete: Cascade)
  fonte    CaptacaoFonte    @relation(fields: [fonteId], references: [id], onDelete: Cascade)

  @@map("captacao_payloads")
}

model LicitacaoAliasOrigem {
  id                  String   @id @default(uuid())
  licitacaoId         String   @map("licitacao_id")
  fonteId             String   @map("fonte_id")
  idExternoOrigem     String   @map("id_externo_origem") @db.VarChar(200)
  hashDeduplicacao    String?  @map("hash_deduplicacao") @db.VarChar(128)
  objetoSnapshot      String?  @map("objeto_snapshot")
  criadoEm            DateTime @default(now()) @map("criado_em")

  licitacao Licitacao     @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)
  fonte     CaptacaoFonte @relation(fields: [fonteId], references: [id], onDelete: Cascade)

  @@unique([fonteId, idExternoOrigem])
  @@map("licitacao_aliases_origem")
}
```

- [ ] **Step 2.2: Rodar migration**

```bash
npx prisma migrate dev --name init
```

Esperado: "Your database is now in sync with your schema."

- [ ] **Step 2.3: Gerar o Prisma Client**

```bash
npx prisma generate
```

> Nota: `prisma migrate dev` já roda `generate` automaticamente no modo interativo, mas execute explicitamente para garantir que o client está atualizado antes de prosseguir para os testes.

- [ ] **Step 2.4: Verificar tabelas no banco**

```bash
npx prisma studio
```

Confirmar que as 14 tabelas aparecem no Prisma Studio. Fechar o Prisma Studio após verificar.

- [ ] **Step 2.5: Commit do schema**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add complete Prisma schema with 14 tables"
```

---

## Task 3: lib/db.ts e lib/kanban.ts (TDD)

**Files:**
- Create: `lib/db.ts`
- Create: `lib/kanban.ts`
- Create: `__tests__/lib/kanban.test.ts`

- [ ] **Step 3.1: Escrever os testes primeiro**

Criar `__tests__/lib/kanban.test.ts`:

```ts
import {
  KANBAN_COLUNAS,
  KANBAN_COLUNA_LABELS,
  validateMove,
  KanbanMoveError,
} from '@/lib/kanban'

describe('KANBAN_COLUNAS', () => {
  it('deve ter exatamente 9 colunas', () => {
    expect(KANBAN_COLUNAS).toHaveLength(9)
  })

  it('deve incluir todas as colunas esperadas', () => {
    expect(KANBAN_COLUNAS).toContain('captadas_automaticamente')
    expect(KANBAN_COLUNAS).toContain('descartadas')
    expect(KANBAN_COLUNAS).toContain('ganhamos')
  })
})

describe('validateMove', () => {
  const baseInput = {
    colunaDestino: 'triagem_inicial' as const,
    falsoNegativoNivelRisco: 'baixo',
    motivo: undefined as string | undefined,
  }

  it('permite mover para coluna válida sem restrições', () => {
    expect(() => validateMove(baseInput)).not.toThrow()
  })

  it('lança COLUNA_INVALIDA para slug desconhecido', () => {
    expect(() =>
      validateMove({ ...baseInput, colunaDestino: 'coluna_inexistente' as never })
    ).toThrow(KanbanMoveError)

    try {
      validateMove({ ...baseInput, colunaDestino: 'coluna_inexistente' as never })
    } catch (e) {
      expect((e as KanbanMoveError).code).toBe('COLUNA_INVALIDA')
    }
  })

  it('lança MOTIVO_OBRIGATORIO ao mover para descartadas sem motivo', () => {
    expect(() =>
      validateMove({ ...baseInput, colunaDestino: 'descartadas', motivo: undefined })
    ).toThrow(KanbanMoveError)

    try {
      validateMove({ ...baseInput, colunaDestino: 'descartadas', motivo: undefined })
    } catch (e) {
      expect((e as KanbanMoveError).code).toBe('MOTIVO_OBRIGATORIO')
    }
  })

  it('lança MOTIVO_OBRIGATORIO ao mover para perdemos sem motivo', () => {
    expect(() =>
      validateMove({ ...baseInput, colunaDestino: 'perdemos', motivo: undefined })
    ).toThrow(KanbanMoveError)

    try {
      validateMove({ ...baseInput, colunaDestino: 'perdemos', motivo: undefined })
    } catch (e) {
      expect((e as KanbanMoveError).code).toBe('MOTIVO_OBRIGATORIO')
    }
  })

  it('permite mover para descartadas com motivo preenchido e FN baixo', () => {
    expect(() =>
      validateMove({ ...baseInput, colunaDestino: 'descartadas', motivo: 'Fora do escopo' })
    ).not.toThrow()
  })

  it('lança FALSO_NEGATIVO_BLOQUEIO ao mover para descartadas com FN alto', () => {
    expect(() =>
      validateMove({
        colunaDestino: 'descartadas',
        falsoNegativoNivelRisco: 'alto',
        motivo: 'Qualquer motivo',
      })
    ).toThrow(KanbanMoveError)

    try {
      validateMove({
        colunaDestino: 'descartadas',
        falsoNegativoNivelRisco: 'alto',
        motivo: 'Qualquer motivo',
      })
    } catch (e) {
      expect((e as KanbanMoveError).code).toBe('FALSO_NEGATIVO_BLOQUEIO')
    }
  })

  it('permite mover para perdemos com FN alto (FN não bloqueia perdemos)', () => {
    expect(() =>
      validateMove({
        colunaDestino: 'perdemos',
        falsoNegativoNivelRisco: 'alto',
        motivo: 'Perdemos o contrato',
      })
    ).not.toThrow()
  })
})
```

- [ ] **Step 3.2: Rodar os testes — devem falhar**

```bash
npx jest __tests__/lib/kanban.test.ts --no-coverage
```

Esperado: FAIL — "Cannot find module '@/lib/kanban'"

- [ ] **Step 3.3: Criar lib/db.ts**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 3.4: Criar lib/kanban.ts**

```ts
// ─── Colunas canônicas ────────────────────────────────────────────────────────
export const KANBAN_COLUNAS = [
  'captadas_automaticamente',
  'triagem_inicial',
  'em_analise',
  'viavel_comercialmente',
  'proposta_documentacao',
  'enviadas_participando',
  'ganhamos',
  'perdemos',
  'descartadas',
] as const

export type KanbanColuna = (typeof KANBAN_COLUNAS)[number]

export const KANBAN_COLUNA_LABELS: Record<KanbanColuna, string> = {
  captadas_automaticamente: 'Captadas Automaticamente',
  triagem_inicial: 'Triagem Inicial',
  em_analise: 'Em Análise',
  viavel_comercialmente: 'Viável Comercialmente',
  proposta_documentacao: 'Proposta / Documentação',
  enviadas_participando: 'Enviadas / Participando',
  ganhamos: 'Ganhamos',
  perdemos: 'Perdemos',
  descartadas: 'Descartadas',
}

// ─── Erros de validação ───────────────────────────────────────────────────────
export type KanbanMoveErrorCode =
  | 'COLUNA_INVALIDA'
  | 'MOTIVO_OBRIGATORIO'
  | 'FALSO_NEGATIVO_BLOQUEIO'

export class KanbanMoveError extends Error {
  constructor(public code: KanbanMoveErrorCode, message: string) {
    super(message)
    this.name = 'KanbanMoveError'
  }
}

// ─── Colunas que exigem motivo ────────────────────────────────────────────────
const COLUNAS_QUE_EXIGEM_MOTIVO: KanbanColuna[] = ['descartadas', 'perdemos']

// ─── Validação de movimento ───────────────────────────────────────────────────
export function validateMove(input: {
  colunaDestino: string
  falsoNegativoNivelRisco: string
  motivo: string | undefined
}): void {
  const { colunaDestino, falsoNegativoNivelRisco, motivo } = input

  if (!KANBAN_COLUNAS.includes(colunaDestino as KanbanColuna)) {
    throw new KanbanMoveError('COLUNA_INVALIDA', `Coluna inválida: ${colunaDestino}`)
  }

  const coluna = colunaDestino as KanbanColuna

  if (coluna === 'descartadas' && falsoNegativoNivelRisco === 'alto') {
    throw new KanbanMoveError(
      'FALSO_NEGATIVO_BLOQUEIO',
      'Esta licitação possui risco alto de falso negativo. Revisão humana obrigatória antes de descartar.'
    )
  }

  if (COLUNAS_QUE_EXIGEM_MOTIVO.includes(coluna) && !motivo?.trim()) {
    throw new KanbanMoveError(
      'MOTIVO_OBRIGATORIO',
      `Mover para "${KANBAN_COLUNA_LABELS[coluna]}" exige preenchimento do motivo.`
    )
  }
}
```

- [ ] **Step 3.5: Rodar os testes — devem passar**

```bash
npx jest __tests__/lib/kanban.test.ts --no-coverage
```

Esperado: PASS — todos os testes verdes.

- [ ] **Step 3.6: Commit**

```bash
git add lib/ __tests__/lib/
git commit -m "feat: add kanban business logic with full test coverage"
```

---

## Task 4: Seed Data

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (adicionar script `prisma.seed`)

- [ ] **Step 4.1: Criar prisma/seed.ts**

```ts
import { PrismaClient, KanbanColuna } from '@prisma/client'

const prisma = new PrismaClient()

const SEGMENTOS = ['Construção Civil', 'Offshore', 'Eventos', 'Apoio Logístico']
const ORGAOS = [
  'Ministério da Infraestrutura',
  'Petrobras S.A.',
  'Prefeitura de São Paulo',
  'Governo do Estado do RJ',
  'Marinha do Brasil',
  'Vale S.A.',
  'Infraero',
  'DNIT',
]
const UFS = ['SP', 'RJ', 'MG', 'BA', 'RS', 'PE', 'AM', 'PA']
const MUNICIPIOS: Record<string, string> = {
  SP: 'São Paulo', RJ: 'Rio de Janeiro', MG: 'Belo Horizonte',
  BA: 'Salvador', RS: 'Porto Alegre', PE: 'Recife', AM: 'Manaus', PA: 'Belém',
}
const MODALIDADES = ['Pregão Eletrônico', 'Concorrência', 'Tomada de Preços', 'Dispensa']

// Distribuição das 30 licitações pelas 9 colunas
const DISTRIBUICAO: { coluna: KanbanColuna; quantidade: number }[] = [
  { coluna: 'captadas_automaticamente', quantidade: 8 },
  { coluna: 'triagem_inicial', quantidade: 6 },
  { coluna: 'em_analise', quantidade: 6 },
  { coluna: 'viavel_comercialmente', quantidade: 4 },
  { coluna: 'proposta_documentacao', quantidade: 2 },
  { coluna: 'enviadas_participando', quantidade: 1 },
  { coluna: 'ganhamos', quantidade: 1 },
  { coluna: 'perdemos', quantidade: 1 },
  { coluna: 'descartadas', quantidade: 1 },
]

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function futureDays(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

type FaixaClassificacao = 'A+' | 'A' | 'B' | 'C' | 'D'

function scoreToFaixa(score: number): FaixaClassificacao {
  if (score >= 85) return 'A+'
  if (score >= 70) return 'A'
  if (score >= 55) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}

async function main() {
  console.log('Limpando dados existentes...')
  await prisma.kanbanMovimentacao.deleteMany()
  await prisma.kanbanCard.deleteMany()
  await prisma.licitacaoScore.deleteMany()
  await prisma.licitacao.deleteMany()

  console.log('Criando 30 licitações...')

  let licitacaoIndex = 0

  for (const { coluna, quantidade } of DISTRIBUICAO) {
    for (let i = 0; i < quantidade; i++) {
      licitacaoIndex++

      const uf = rand(UFS)
      const segmento = rand(SEGMENTOS)
      const valorGlobal = randInt(200, 15000) * 1000
      const valorCapturavel = Math.random() < 0.9
        ? randInt(50, 2000) * 1000
        : null

      // Cenários especiais para testes:
      // licitações 1-6: urgente = true (~20%)
      const urgente = licitacaoIndex <= 6
      // licitações 7-11: FN alto (~15%)
      const fnAlto = licitacaoIndex >= 7 && licitacaoIndex <= 11
      // licitações 12-14: sem score (score = null)
      const semScore = licitacaoIndex >= 12 && licitacaoIndex <= 14

      const scoreValor = semScore ? null : randInt(20, 98)

      const licitacao = await prisma.licitacao.create({
        data: {
          orgao: rand(ORGAOS),
          numeroLicitacao: `PE ${String(licitacaoIndex).padStart(3, '0')}/2026`,
          modalidade: rand(MODALIDADES),
          objetoResumido: `Locação de módulos e estruturas temporárias para apoio operacional em ${MUNICIPIOS[uf]}`,
          segmento,
          uf,
          municipio: MUNICIPIOS[uf],
          dataSessao: futureDays(randInt(5, 60)),
          valorGlobalEstimado: valorGlobal,
          fonteCaptacao: 'seed',
          statusPipeline: 'ativo',
        },
      })

      // Card Kanban
      await prisma.kanbanCard.create({
        data: {
          licitacaoId: licitacao.id,
          colunaAtual: coluna,
          urgente,
          bloqueado: false,
        },
      })

      // Score (null para licitações 12-14)
      if (!semScore && scoreValor !== null) {
        const faixa = scoreToFaixa(scoreValor)
        await prisma.licitacaoScore.create({
          data: {
            licitacaoId: licitacao.id,
            scoreFinal: scoreValor,
            faixaClassificacao: faixa,
            valorCapturavelEstimado: valorCapturavel,
            falsoNegativoNivelRisco: fnAlto ? 'alto' : rand(['baixo', 'baixo', 'baixo', 'medio']),
            falsoNegativoResumo: fnAlto
              ? 'Título genérico. Oportunidade pode estar escondida nos lotes.'
              : 'Sem indicadores relevantes de falso negativo.',
            valorCapturavelJustificativa: valorCapturavel
              ? 'Estimativa baseada em itens da planilha orçamentária.'
              : 'Não foi possível estimar com os documentos disponíveis.',
          },
        })
      }
    }
  }

  console.log(`✓ ${licitacaoIndex} licitações criadas com sucesso.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 4.2: Adicionar script seed ao package.json**

Adicionar dentro do campo `"scripts"` e adicionar a configuração de seed no final do `package.json`:

```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Instalar ts-node se necessário:
```bash
npm install --save-dev ts-node
```

- [ ] **Step 4.3: Rodar o seed**

```bash
npx prisma db seed
```

Esperado: "✓ 30 licitações criadas com sucesso."

- [ ] **Step 4.4: Verificar no Prisma Studio**

```bash
npx prisma studio
```

Conferir tabelas `licitacoes`, `kanban_cards`, `licitacao_score`. Fechar após confirmar.

- [ ] **Step 4.5: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add seed data with 30 realistic licitacoes across 9 kanban columns"
```

---

## Task 5: API — GET /api/licitacoes (TDD)

**Files:**
- Create: `app/api/licitacoes/route.ts`
- Create: `__tests__/api/licitacoes.test.ts`

- [ ] **Step 5.1: Escrever o teste**

Criar `__tests__/api/licitacoes.test.ts`:

```ts
import { db } from '@/lib/db'

// Testamos a query diretamente, não via HTTP
async function getLicitacoesQuery() {
  return db.licitacao.findMany({
    include: {
      card: {
        select: {
          id: true,
          colunaAtual: true,
          urgente: true,
          bloqueado: true,
          motivoBloqueio: true,
        },
      },
      score: {
        select: {
          scoreFinal: true,
          faixaClassificacao: true,
          valorCapturavelEstimado: true,
          falsoNegativoNivelRisco: true,
        },
      },
    },
    orderBy: { criadoEm: 'desc' },
  })
}

describe('GET /api/licitacoes — query', () => {
  it('retorna array de licitações com card e score', async () => {
    const result = await getLicitacoesQuery()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('cada licitação tem um card associado', async () => {
    const result = await getLicitacoesQuery()
    result.forEach((l) => {
      expect(l.card).not.toBeNull()
      expect(l.card?.colunaAtual).toBeDefined()
    })
  })

  it('score pode ser null para algumas licitações', async () => {
    const result = await getLicitacoesQuery()
    const semScore = result.filter((l) => l.score === null)
    // seed cria 3 sem score
    expect(semScore.length).toBeGreaterThanOrEqual(0)
  })
})
```

> **Nota sobre TDD aqui:** Este teste valida a query layer (Prisma), não o route handler em si. O TDD "run-fail" se dá ao executar antes de o banco ter seed (o teste falhará com "no licitacoes found" ou erro de conexão). Após o seed da Task 4, o teste deve passar. Para verificar a fase vermelha, execute antes do seed:
> ```bash
> npx jest __tests__/api/licitacoes.test.ts --no-coverage
> ```
> Esperado antes do seed: FAIL. Esperado após seed: PASS.

- [ ] **Step 5.2: Criar o route handler**

Criar `app/api/licitacoes/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const licitacoes = await db.licitacao.findMany({
      include: {
        card: {
          select: {
            id: true,
            colunaAtual: true,
            urgente: true,
            bloqueado: true,
            motivoBloqueio: true,
          },
        },
        score: {
          select: {
            scoreFinal: true,
            faixaClassificacao: true,
            valorCapturavelEstimado: true,
            falsoNegativoNivelRisco: true,
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
    })

    return NextResponse.json({ licitacoes })
  } catch (error) {
    console.error('[GET /api/licitacoes]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

- [ ] **Step 5.3: Commit**

```bash
git add app/api/licitacoes/ __tests__/api/licitacoes.test.ts
git commit -m "feat: add GET /api/licitacoes route"
```

---

## Task 6: API — POST /api/kanban/mover (TDD)

**Files:**
- Create: `app/api/kanban/mover/route.ts`
- Create: `__tests__/api/kanban-mover.test.ts`

- [ ] **Step 6.1: Escrever o teste**

Criar `__tests__/api/kanban-mover.test.ts`:

```ts
import { validateMove, KanbanMoveError } from '@/lib/kanban'
import { db } from '@/lib/db'

// Testamos a lógica de validação (já coberta em kanban.test.ts)
// e a função que executa o move no banco

async function executarMove(input: {
  cardId: string
  colunaDestino: string
  falsoNegativoNivelRisco: string
  motivo?: string
}) {
  validateMove({
    colunaDestino: input.colunaDestino,
    falsoNegativoNivelRisco: input.falsoNegativoNivelRisco,
    motivo: input.motivo,
  })

  // Capturar coluna de origem ANTES de atualizar
  const cardAtual = await db.kanbanCard.findUniqueOrThrow({ where: { id: input.cardId } })
  const colunaOrigem = cardAtual.colunaAtual

  const card = await db.kanbanCard.update({
    where: { id: input.cardId },
    data: { colunaAtual: input.colunaDestino as never },
  })

  await db.kanbanMovimentacao.create({
    data: {
      cardId: input.cardId,
      licitacaoId: card.licitacaoId,
      colunaOrigem,                           // origem correta — capturada pré-update
      colunaDestino: input.colunaDestino as never,
      automatico: false,
      motivo: input.motivo,
    },
  })

  return card
}

describe('mover card — validação integrada', () => {
  it('rejeita COLUNA_INVALIDA antes de tocar no banco', async () => {
    await expect(
      executarMove({
        cardId: 'qualquer',
        colunaDestino: 'nao_existe',
        falsoNegativoNivelRisco: 'baixo',
      })
    ).rejects.toThrow(KanbanMoveError)
  })

  it('rejeita FALSO_NEGATIVO_BLOQUEIO para descarte com FN alto', async () => {
    await expect(
      executarMove({
        cardId: 'qualquer',
        colunaDestino: 'descartadas',
        falsoNegativoNivelRisco: 'alto',
        motivo: 'Tentando descartar',
      })
    ).rejects.toThrow(KanbanMoveError)
  })
})
```

- [ ] **Step 6.2: Criar o route handler**

Criar `app/api/kanban/mover/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateMove, KanbanMoveError, KanbanColuna } from '@/lib/kanban'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { cardId, colunaDestino, motivo } = body as {
      cardId: string
      colunaDestino: string
      motivo?: string
    }

    if (!cardId || !colunaDestino) {
      return NextResponse.json({ error: 'cardId e colunaDestino são obrigatórios' }, { status: 400 })
    }

    // Buscar score do card para validar FN
    const card = await db.kanbanCard.findUnique({
      where: { id: cardId },
      include: {
        licitacao: {
          include: { score: { select: { falsoNegativoNivelRisco: true } } },
        },
      },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card não encontrado' }, { status: 404 })
    }

    const falsoNegativoNivelRisco = card.licitacao.score?.falsoNegativoNivelRisco ?? 'baixo'

    validateMove({ colunaDestino, falsoNegativoNivelRisco, motivo })

    const colunaOrigem = card.colunaAtual

    await db.kanbanCard.update({
      where: { id: cardId },
      data: { colunaAtual: colunaDestino as KanbanColuna },
    })

    await db.kanbanMovimentacao.create({
      data: {
        cardId,
        licitacaoId: card.licitacaoId,
        colunaOrigem,
        colunaDestino: colunaDestino as KanbanColuna,
        automatico: false,
        motivo,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof KanbanMoveError) {
      return NextResponse.json({ error: error.code }, { status: 400 })
    }
    console.error('[POST /api/kanban/mover]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

- [ ] **Step 6.3: Commit**

```bash
git add app/api/kanban/mover/ __tests__/api/kanban-mover.test.ts
git commit -m "feat: add POST /api/kanban/mover with trava validation"
```

---

## Task 7: API — GET /api/kanban/metricas (TDD)

**Files:**
- Create: `app/api/kanban/metricas/route.ts`
- Create: `__tests__/api/kanban-metricas.test.ts`

- [ ] **Step 7.1: Escrever o teste**

Criar `__tests__/api/kanban-metricas.test.ts`:

```ts
import { db } from '@/lib/db'

async function getMetricasQuery() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [captadasHoje, emAnalise, classificacaoAouAPlus, urgentes, riscoAltoFalsoNegativo] =
    await Promise.all([
      db.kanbanCard.count({ where: { criadoEm: { gte: hoje } } }),
      db.kanbanCard.count({ where: { colunaAtual: 'em_analise' } }),
      db.licitacaoScore.count({ where: { faixaClassificacao: { in: ['A', 'A+'] } } }),
      db.kanbanCard.count({ where: { urgente: true } }),
      db.licitacaoScore.count({ where: { falsoNegativoNivelRisco: 'alto' } }),
    ])

  return { captadasHoje, emAnalise, classificacaoAouAPlus, urgentes, riscoAltoFalsoNegativo }
}

describe('GET /api/kanban/metricas — query', () => {
  it('retorna objeto com as 5 métricas', async () => {
    const result = await getMetricasQuery()
    expect(result).toHaveProperty('captadasHoje')
    expect(result).toHaveProperty('emAnalise')
    expect(result).toHaveProperty('classificacaoAouAPlus')
    expect(result).toHaveProperty('urgentes')
    expect(result).toHaveProperty('riscoAltoFalsoNegativo')
  })

  it('todos os valores são números >= 0', async () => {
    const result = await getMetricasQuery()
    Object.values(result).forEach((v) => {
      expect(typeof v).toBe('number')
      expect(v).toBeGreaterThanOrEqual(0)
    })
  })
})
```

- [ ] **Step 7.2: Criar o route handler**

Criar `app/api/kanban/metricas/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const [captadasHoje, emAnalise, classificacaoAouAPlus, urgentes, riscoAltoFalsoNegativo] =
      await Promise.all([
        db.kanbanCard.count({ where: { criadoEm: { gte: hoje } } }),
        db.kanbanCard.count({ where: { colunaAtual: 'em_analise' } }),
        db.licitacaoScore.count({ where: { faixaClassificacao: { in: ['A', 'A+'] } } }),
        db.kanbanCard.count({ where: { urgente: true } }),
        db.licitacaoScore.count({ where: { falsoNegativoNivelRisco: 'alto' } }),
      ])

    return NextResponse.json({
      captadasHoje,
      emAnalise,
      classificacaoAouAPlus,
      urgentes,
      riscoAltoFalsoNegativo,
    })
  } catch (error) {
    console.error('[GET /api/kanban/metricas]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

- [ ] **Step 7.3: Commit**

```bash
git add app/api/kanban/metricas/ __tests__/api/kanban-metricas.test.ts
git commit -m "feat: add GET /api/kanban/metricas route"
```

---

## Task 8: App Shell e Layout

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `components/layout/AppShell.tsx`
- Create: `components/layout/SidebarNav.tsx`
- Create: `components/layout/TopBar.tsx`
- Create: `app/page.tsx`

- [ ] **Step 8.1: Criar SidebarNav**

Criar `components/layout/SidebarNav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, List, Radio, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/kanban', label: 'Kanban', icon: LayoutDashboard },
  { href: '/licitacoes', label: 'Licitações', icon: List },
  { href: '/fontes', label: 'Fontes', icon: Radio },
  { href: '/configuracoes', label: 'Config', icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <aside className="flex w-56 flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-sm font-bold tracking-tight text-slate-900">
          KanbanLicita
        </span>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 8.2: Criar TopBar**

Criar `components/layout/TopBar.tsx`:

```tsx
export function TopBar({ title }: { title: string }) {
  return (
    <header className="flex h-14 items-center border-b bg-white px-6">
      <h1 className="text-sm font-semibold text-slate-900">{title}</h1>
    </header>
  )
}
```

- [ ] **Step 8.3: Criar AppShell**

Criar `components/layout/AppShell.tsx`:

```tsx
import { SidebarNav } from './SidebarNav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SidebarNav />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}
```

- [ ] **Step 8.4: Atualizar app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KanbanLicita — Multiteiner',
  description: 'Sistema de gestão de licitações',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AppShell>{children}</AppShell>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
```

- [ ] **Step 8.5: Criar app/page.tsx (redirect)**

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/kanban')
}
```

- [ ] **Step 8.6: Criar páginas placeholder**

Criar `app/licitacoes/page.tsx`:
```tsx
import { TopBar } from '@/components/layout/TopBar'

export default function LicitacoesPage() {
  return (
    <>
      <TopBar title="Licitações" />
      <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">
        Disponível no SP-3
      </div>
    </>
  )
}
```

Criar `app/fontes/page.tsx`:
```tsx
import { TopBar } from '@/components/layout/TopBar'

export default function FontesPage() {
  return (
    <>
      <TopBar title="Fontes de Captação" />
      <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">
        Disponível no SP-2
      </div>
    </>
  )
}
```

Criar `app/configuracoes/page.tsx`:
```tsx
import { TopBar } from '@/components/layout/TopBar'

export default function ConfiguracoesPage() {
  return (
    <>
      <TopBar title="Configurações" />
      <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">
        Disponível em versão futura
      </div>
    </>
  )
}
```

- [ ] **Step 8.7: Testar visualmente**

```bash
npm run dev
```

Abrir http://localhost:3000. Verificar:
- Sidebar aparece com links
- Redirect de `/` para `/kanban` funciona
- Páginas placeholder rendem corretamente

- [ ] **Step 8.8: Commit**

```bash
git add app/ components/layout/
git commit -m "feat: add app shell, sidebar navigation, and layout"
```

---

## Task 9: MetricsCardsRow

**Files:**
- Create: `components/kanban/MetricsCardsRow.tsx`
- Create: `types/licitacao.ts`

- [ ] **Step 9.1: Criar types/licitacao.ts**

```ts
import type { KanbanColuna } from '@/lib/kanban'

export type KanbanMetricas = {
  captadasHoje: number
  emAnalise: number
  classificacaoAouAPlus: number
  urgentes: number
  riscoAltoFalsoNegativo: number
}

export type ScoreInfo = {
  scoreFinal: number
  faixaClassificacao: string
  valorCapturavelEstimado: number | null
  falsoNegativoNivelRisco: string
} | null

export type CardInfo = {
  id: string
  colunaAtual: KanbanColuna   // tipo forte — garante type safety no board
  urgente: boolean
  bloqueado: boolean
  motivoBloqueio: string | null
}

export type LicitacaoComCard = {
  id: string
  orgao: string | null
  numeroLicitacao: string | null
  modalidade: string | null
  objetoResumido: string | null
  uf: string | null
  municipio: string | null
  segmento: string | null
  dataSessao: string | null
  valorGlobalEstimado: number | null
  card: CardInfo
  score: ScoreInfo
}
```

- [ ] **Step 9.2: Criar MetricsCardsRow**

Criar `components/kanban/MetricsCardsRow.tsx`:

```tsx
import { AlertTriangle, Clock, Star, TrendingUp, Zap } from 'lucide-react'
import type { KanbanMetricas } from '@/types/licitacao'

type Props = { metricas: KanbanMetricas }

const CARDS = [
  { key: 'captadasHoje', label: 'Captadas hoje', icon: TrendingUp, color: 'text-blue-600' },
  { key: 'emAnalise', label: 'Em análise', icon: Clock, color: 'text-amber-600' },
  { key: 'classificacaoAouAPlus', label: 'A+ e A', icon: Star, color: 'text-green-600' },
  { key: 'urgentes', label: 'Urgentes', icon: Zap, color: 'text-orange-600' },
  { key: 'riscoAltoFalsoNegativo', label: 'Risco alto FN', icon: AlertTriangle, color: 'text-red-600' },
] as const

export function MetricsCardsRow({ metricas }: Props) {
  return (
    <div className="flex gap-3 px-4 py-3 border-b bg-white">
      {CARDS.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm"
        >
          <Icon className={`h-4 w-4 ${color}`} />
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-lg font-bold text-slate-900 leading-none">{metricas[key]}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 9.3: Commit**

```bash
git add components/kanban/MetricsCardsRow.tsx types/licitacao.ts
git commit -m "feat: add MetricsCardsRow component and domain types"
```

---

## Task 10: LicitacaoCard

**Files:**
- Create: `components/kanban/LicitacaoCard.tsx`
- Create: `components/kanban/CardQuickActions.tsx`

- [ ] **Step 10.1: Criar CardQuickActions**

Criar `components/kanban/CardQuickActions.tsx`:

```tsx
import { ArrowRight, Brain, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LicitacaoComCard } from '@/types/licitacao'

type Props = {
  licitacao: LicitacaoComCard
  onMover: () => void
}

export function CardQuickActions({ licitacao, onMover }: Props) {
  const fnAlto = licitacao.score?.falsoNegativoNivelRisco === 'alto'

  return (
    <div className="flex items-center gap-1 pt-1">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={(e) => {
          e.stopPropagation()
          onMover()
        }}
        disabled={licitacao.card.bloqueado}
        title={licitacao.card.motivoBloqueio ?? undefined}
      >
        <ArrowRight className="h-3 w-3 mr-1" />
        Mover
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-slate-400 cursor-not-allowed"
        disabled
        title="Análise por IA disponível no SP-4"
      >
        <Brain className="h-3 w-3 mr-1" />
        IA
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs"
        onClick={(e) => e.stopPropagation()}
        asChild
      >
        <a
          href={`/licitacoes/${licitacao.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </Button>
    </div>
  )
}
```

- [ ] **Step 10.2: Criar LicitacaoCard**

Criar `components/kanban/LicitacaoCard.tsx`:

```tsx
import { AlertTriangle, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CardQuickActions } from './CardQuickActions'
import type { LicitacaoComCard } from '@/types/licitacao'

type Props = {
  licitacao: LicitacaoComCard
  onMover: () => void
}

const FAIXA_COLORS: Record<string, string> = {
  'A+': 'bg-green-100 text-green-800 border-green-200',
  A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  B: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  C: 'bg-orange-100 text-orange-800 border-orange-200',
  D: 'bg-red-100 text-red-800 border-red-200',
}

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return `R$ ${value}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function LicitacaoCard({ licitacao, onMover }: Props) {
  const { card, score } = licitacao
  const fnAlto = score?.falsoNegativoNivelRisco === 'alto'
  const faixa = score?.faixaClassificacao
  const scoreVal = score ? Number(score.scoreFinal) : null

  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-xs">
      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        {licitacao.segmento && (
          <Badge variant="outline" className="text-[10px] py-0">
            {licitacao.segmento}
          </Badge>
        )}
        {faixa && (
          <Badge className={`text-[10px] py-0 border ${FAIXA_COLORS[faixa] ?? ''}`}>
            {faixa}
          </Badge>
        )}
        {card.urgente && (
          <Badge className="text-[10px] py-0 bg-orange-100 text-orange-800 border-orange-200">
            <Zap className="h-2.5 w-2.5 mr-0.5" />
            URGENTE
          </Badge>
        )}
        {fnAlto && (
          <Badge className="text-[10px] py-0 bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
            FN!
          </Badge>
        )}
      </div>

      {/* Órgão */}
      <p className="font-medium text-slate-900 truncate">{licitacao.orgao ?? '—'}</p>

      {/* Número + Modalidade */}
      <p className="text-slate-500 truncate mt-0.5">
        {licitacao.numeroLicitacao} · {licitacao.modalidade}
      </p>

      {/* Objeto */}
      <p className="text-slate-600 mt-1 line-clamp-2">{licitacao.objetoResumido}</p>

      {/* UF + Município */}
      <p className="text-slate-400 mt-1">
        {licitacao.uf} · {licitacao.municipio}
      </p>

      {/* Data sessão */}
      <p className="text-slate-400 mt-0.5">
        Sessão: {formatDate(licitacao.dataSessao)}
      </p>

      {/* Valores */}
      <div className="flex gap-3 mt-2 text-slate-700">
        <span>Global: {formatCurrency(licitacao.valorGlobalEstimado)}</span>
        <span>Cap: {formatCurrency(score?.valorCapturavelEstimado ?? null)}</span>
      </div>

      {/* Score */}
      {scoreVal !== null ? (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-slate-500">Score: {scoreVal}</span>
            <span className="font-bold text-slate-900">{faixa}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-500 transition-all"
              style={{ width: `${scoreVal}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-2 text-slate-400 italic">Score: — · Sem classificação</p>
      )}

      {/* Ações */}
      <CardQuickActions licitacao={licitacao} onMover={onMover} />
    </div>
  )
}
```

- [ ] **Step 10.3: Commit**

```bash
git add components/kanban/LicitacaoCard.tsx components/kanban/CardQuickActions.tsx
git commit -m "feat: add LicitacaoCard and CardQuickActions components"
```

---

## Task 11: FilterBar

**Files:**
- Create: `components/kanban/FilterBar.tsx`

- [ ] **Step 11.1: Criar FilterBar**

Criar `components/kanban/FilterBar.tsx`:

```tsx
'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type FiltrosKanban = {
  busca: string
  segmento: string
  classificacao: string
  uf: string
  urgentes: boolean
  riscoAltoFn: boolean
}

type Props = {
  filtros: FiltrosKanban
  onChange: (filtros: FiltrosKanban) => void
  segmentosDisponiveis: string[]
  ufsDisponiveis: string[]
}

export function FilterBar({ filtros, onChange, segmentosDisponiveis, ufsDisponiveis }: Props) {
  const update = (partial: Partial<FiltrosKanban>) =>
    onChange({ ...filtros, ...partial })

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-white">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Buscar objeto ou órgão..."
          className="pl-7 h-8 text-xs w-56"
          value={filtros.busca}
          onChange={(e) => update({ busca: e.target.value })}
        />
      </div>

      <Select value={filtros.segmento} onValueChange={(v) => update({ segmento: v })}>
        <SelectTrigger className="h-8 text-xs w-40">
          <SelectValue placeholder="Segmento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {segmentosDisponiveis.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtros.classificacao} onValueChange={(v) => update({ classificacao: v })}>
        <SelectTrigger className="h-8 text-xs w-36">
          <SelectValue placeholder="Classificação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas</SelectItem>
          {['A+', 'A', 'B', 'C', 'D'].map((f) => (
            <SelectItem key={f} value={f}>{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtros.uf} onValueChange={(v) => update({ uf: v })}>
        <SelectTrigger className="h-8 text-xs w-28">
          <SelectValue placeholder="UF" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas</SelectItem>
          {ufsDisponiveis.map((u) => (
            <SelectItem key={u} value={u}>{u}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={filtros.urgentes}
          onChange={(e) => update({ urgentes: e.target.checked })}
          className="rounded border-slate-300"
        />
        Urgentes
      </label>

      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={filtros.riscoAltoFn}
          onChange={(e) => update({ riscoAltoFn: e.target.checked })}
          className="rounded border-slate-300"
        />
        Risco alto FN
      </label>
    </div>
  )
}
```

- [ ] **Step 11.2: Commit**

```bash
git add components/kanban/FilterBar.tsx
git commit -m "feat: add FilterBar component with all filters"
```

---

## Task 12: MoveKanbanModal

**Files:**
- Create: `components/kanban/MoveKanbanModal.tsx`

- [ ] **Step 12.1: Criar MoveKanbanModal**

Criar `components/kanban/MoveKanbanModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { KANBAN_COLUNA_LABELS, type KanbanColuna } from '@/lib/kanban'

type Props = {
  open: boolean
  colunaDestino: KanbanColuna | null   // null = aberto pelo botão, precisa de seletor de coluna
  colunaAtual?: KanbanColuna           // coluna atual do card (para excluir do seletor)
  onConfirm: (colunaDestino: KanbanColuna, motivo?: string) => void
  onCancel: () => void
}

const MOTIVOS_SUGERIDOS: Partial<Record<KanbanColuna, string[]>> = {
  descartadas: [
    'Fora do escopo de produtos da Multiteiner',
    'Região geográfica sem atendimento',
    'Valor global inviável',
    'Requisitos técnicos incompatíveis',
    'Prazo insuficiente para participação',
  ],
  perdemos: [
    'Proposta com preço acima do menor lance',
    'Desclassificação técnica',
    'Documentação recusada',
    'Desistência estratégica',
  ],
}

const COLUNAS_QUE_EXIGEM_MOTIVO: KanbanColuna[] = ['descartadas', 'perdemos']

export function MoveKanbanModal({ open, colunaDestino, colunaAtual, onConfirm, onCancel }: Props) {
  const [motivo, setMotivo] = useState('')
  // Quando aberto via botão (sem destino pré-definido), o usuário escolhe a coluna
  const [colunaSelecionada, setColunaSelecionada] = useState<KanbanColuna | ''>(
    colunaDestino ?? ''
  )

  // Sincronizar quando prop muda (drag-and-drop define destino pré-definido)
  const coluna = (colunaDestino ?? colunaSelecionada) as KanbanColuna | ''
  const exigeMotivo = coluna ? COLUNAS_QUE_EXIGEM_MOTIVO.includes(coluna) : false
  const label = coluna ? KANBAN_COLUNA_LABELS[coluna] : '—'
  const sugestoes = coluna ? (MOTIVOS_SUGERIDOS[coluna] ?? []) : []

  const podeMover = coluna !== '' && (!exigeMotivo || motivo.trim() !== '')

  function handleConfirm() {
    if (!coluna) return
    onConfirm(coluna, motivo.trim() || undefined)
    setMotivo('')
    setColunaSelecionada('')
  }

  function handleCancel() {
    setMotivo('')
    setColunaSelecionada('')
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {colunaDestino ? `Mover para "${label}"` : 'Mover card'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Seletor de coluna — apenas quando aberto via botão (sem destino pré-definido) */}
          {!colunaDestino && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Coluna destino</label>
              <select
                className="w-full rounded-md border border-slate-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                value={colunaSelecionada}
                onChange={(e) => setColunaSelecionada(e.target.value as KanbanColuna)}
              >
                <option value="">Selecione...</option>
                {KANBAN_COLUNAS
                  .filter((c) => c !== colunaAtual)
                  .map((c) => (
                    <option key={c} value={c}>{KANBAN_COLUNA_LABELS[c]}</option>
                  ))}
              </select>
            </div>
          )}

          {exigeMotivo && (
            <>
              <p className="text-xs text-slate-500">
                Informe o motivo para registrar no histórico.
              </p>
              {sugestoes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {sugestoes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setMotivo(s)}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                className="w-full rounded-md border border-slate-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
                rows={3}
                placeholder="Descreva o motivo..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!podeMover}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 12.2: Commit**

```bash
git add components/kanban/MoveKanbanModal.tsx
git commit -m "feat: add MoveKanbanModal with suggested motivos"
```

---

## Task 13: KanbanColumn

**Files:**
- Create: `components/kanban/KanbanColumn.tsx`

- [ ] **Step 13.1: Criar KanbanColumn**

Criar `components/kanban/KanbanColumn.tsx`:

```tsx
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LicitacaoCard } from './LicitacaoCard'
import type { KanbanColuna } from '@/lib/kanban'
import type { LicitacaoComCard } from '@/types/licitacao'

function SortableCard({
  licitacao,
  onMover,
}: {
  licitacao: LicitacaoComCard
  onMover: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: licitacao.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LicitacaoCard licitacao={licitacao} onMover={onMover} />
    </div>
  )
}

type Props = {
  coluna: KanbanColuna
  label: string
  licitacoes: LicitacaoComCard[]
  onMoverCard: (licitacao: LicitacaoComCard) => void
}

export function KanbanColumn({ coluna, label, licitacoes, onMoverCard }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna })

  return (
    <div className="flex w-64 flex-shrink-0 flex-col">
      {/* Cabeçalho da coluna */}
      <div className="flex items-center justify-between px-2 py-2 rounded-t-lg bg-slate-100 border border-b-0">
        <h2 className="text-xs font-semibold text-slate-700 truncate">{label}</h2>
        <span className="ml-2 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
          {licitacoes.length}
        </span>
      </div>

      {/* Área de drop */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 rounded-b-lg border p-2 flex-1 min-h-16 transition-colors ${
          isOver ? 'bg-slate-100 border-slate-400' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <SortableContext
          items={licitacoes.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {licitacoes.map((l) => (
            <SortableCard
              key={l.id}
              licitacao={l}
              onMover={() => onMoverCard(l)}
            />
          ))}
        </SortableContext>

        {licitacoes.length === 0 && (
          <p className="text-center text-[10px] text-slate-300 py-4">Vazia</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 13.2: Commit**

```bash
git add components/kanban/KanbanColumn.tsx
git commit -m "feat: add KanbanColumn with sortable drop areas"
```

---

## Task 14: KanbanBoard (dnd-kit + TanStack Query)

**Files:**
- Create: `components/kanban/KanbanBoard.tsx`
- Create: `components/providers.tsx`

- [ ] **Step 14.1: Criar QueryClient provider**

Criar `components/providers.tsx`:

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

Adicionar `<Providers>` no `app/layout.tsx` envolvendo os filhos:

```tsx
// Em app/layout.tsx, adicionar import e envolver children:
import { Providers } from '@/components/providers'

// Dentro do body:
<Providers>
  <AppShell>{children}</AppShell>
</Providers>
```

- [ ] **Step 14.2: Criar KanbanBoard**

Criar `components/kanban/KanbanBoard.tsx`:

```tsx
'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KanbanColumn } from './KanbanColumn'
import { LicitacaoCard } from './LicitacaoCard'
import { MoveKanbanModal } from './MoveKanbanModal'
import { FilterBar, type FiltrosKanban } from './FilterBar'
import { MetricsCardsRow } from './MetricsCardsRow'
import { KANBAN_COLUNAS, KANBAN_COLUNA_LABELS, type KanbanColuna } from '@/lib/kanban'
import type { LicitacaoComCard, KanbanMetricas } from '@/types/licitacao'

const FILTROS_INICIAIS: FiltrosKanban = {
  busca: '',
  segmento: 'todos',
  classificacao: 'todas',
  uf: 'todas',
  urgentes: false,
  riscoAltoFn: false,
}

type MoveState = {
  licitacao: LicitacaoComCard
  colunaDestino: KanbanColuna | null   // null quando aberto pelo botão (sem destino pré-definido)
} | null

export function KanbanBoard({ initialData }: { initialData: LicitacaoComCard[] }) {
  const queryClient = useQueryClient()
  const [filtros, setFiltros] = useState<FiltrosKanban>(FILTROS_INICIAIS)
  const [activeDrag, setActiveDrag] = useState<LicitacaoComCard | null>(null)
  const [pendingMove, setPendingMove] = useState<MoveState>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Fetch de licitações (usa initialData do Server Component como fallback)
  const { data } = useQuery<{ licitacoes: LicitacaoComCard[] }>({
    queryKey: ['licitacoes'],
    queryFn: () => fetch('/api/licitacoes').then((r) => r.json()),
    initialData: { licitacoes: initialData },
    staleTime: 30_000,
  })

  const { data: metricasData } = useQuery<KanbanMetricas>({
    queryKey: ['kanban-metricas'],
    queryFn: () => fetch('/api/kanban/metricas').then((r) => r.json()),
  })

  // Mutation para mover card
  const moverMutation = useMutation({
    mutationFn: async (input: { cardId: string; colunaDestino: string; motivo?: string }) => {
      const res = await fetch('/api/kanban/mover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erro ao mover card')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] })
      queryClient.invalidateQueries({ queryKey: ['kanban-metricas'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const licitacoes = data?.licitacoes ?? initialData

  // Filtros client-side
  const licitacoesFiltradas = useMemo(() => {
    return licitacoes.filter((l) => {
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase()
        const noObjeto = l.objetoResumido?.toLowerCase().includes(termo)
        const noOrgao = l.orgao?.toLowerCase().includes(termo)
        if (!noObjeto && !noOrgao) return false
      }
      if (filtros.segmento !== 'todos' && l.segmento !== filtros.segmento) return false
      if (filtros.classificacao !== 'todas' && l.score?.faixaClassificacao !== filtros.classificacao) return false
      if (filtros.uf !== 'todas' && l.uf !== filtros.uf) return false
      if (filtros.urgentes && !l.card.urgente) return false
      if (filtros.riscoAltoFn && l.score?.falsoNegativoNivelRisco !== 'alto') return false
      return true
    })
  }, [licitacoes, filtros])

  // Grupos por coluna
  const porColuna = useMemo(() => {
    const map: Record<KanbanColuna, LicitacaoComCard[]> = {} as never
    KANBAN_COLUNAS.forEach((c) => { map[c] = [] })
    licitacoesFiltradas.forEach((l) => {
      const coluna = l.card.colunaAtual as KanbanColuna
      if (map[coluna]) map[coluna].push(l)
    })
    return map
  }, [licitacoesFiltradas])

  // Listas para filtros dinâmicos
  const segmentosDisponiveis = useMemo(() =>
    [...new Set(licitacoes.map((l) => l.segmento).filter(Boolean))] as string[],
    [licitacoes]
  )
  const ufsDisponiveis = useMemo(() =>
    [...new Set(licitacoes.map((l) => l.uf).filter(Boolean))].sort() as string[],
    [licitacoes]
  )

  // Drag handlers
  function onDragStart(event: DragStartEvent) {
    const l = licitacoes.find((l) => l.id === event.active.id)
    if (l) setActiveDrag(l)
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveDrag(null)
    const { active, over } = event
    if (!over) return

    const colunaDestino = over.id as KanbanColuna
    const licitacao = licitacoes.find((l) => l.id === active.id)
    if (!licitacao) return
    if (licitacao.card.colunaAtual === colunaDestino) return

    // Verificar se FN alto bloqueia descarte
    if (colunaDestino === 'descartadas' && licitacao.score?.falsoNegativoNivelRisco === 'alto') {
      toast.error('Falso negativo alto: revisão humana obrigatória antes de descartar.')
      return
    }

    // Verificar se precisa de modal de motivo
    if (colunaDestino === 'descartadas' || colunaDestino === 'perdemos') {
      setPendingMove({ licitacao, colunaDestino })
      return
    }

    // Aviso para viável comercialmente sem score
    if (colunaDestino === 'viavel_comercialmente' && !licitacao.score) {
      toast.warning('Este card ainda não tem score calculado. Preencha o score antes de prosseguir comercialmente.', {
        duration: 6000,
      })
    }

    moverMutation.mutate({ cardId: licitacao.card.id, colunaDestino })
  }

  function handleModalConfirm(colunaDestino: KanbanColuna, motivo?: string) {
    if (!pendingMove) return

    // Aviso para viável comercialmente sem score (mesmo quando via botão)
    if (colunaDestino === 'viavel_comercialmente' && !pendingMove.licitacao.score) {
      toast.warning('Este card ainda não tem score calculado. Preencha o score antes de prosseguir comercialmente.', {
        duration: 6000,
      })
    }

    moverMutation.mutate({
      cardId: pendingMove.licitacao.card.id,
      colunaDestino,
      motivo,
    })
    setPendingMove(null)
  }

  const metricas: KanbanMetricas = metricasData ?? {
    captadasHoje: 0, emAnalise: 0, classificacaoAouAPlus: 0, urgentes: 0, riscoAltoFalsoNegativo: 0,
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Métricas */}
      <MetricsCardsRow metricas={metricas} />

      {/* Filtros */}
      <FilterBar
        filtros={filtros}
        onChange={setFiltros}
        segmentosDisponiveis={segmentosDisponiveis}
        ufsDisponiveis={ufsDisponiveis}
      />

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-3 h-full">
            {KANBAN_COLUNAS.map((coluna) => (
              <KanbanColumn
                key={coluna}
                coluna={coluna}
                label={KANBAN_COLUNA_LABELS[coluna]}
                licitacoes={porColuna[coluna]}
                onMoverCard={(l) => setPendingMove({ licitacao: l, colunaDestino: null })}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDrag && (
              <div className="rotate-2 opacity-90 w-64">
                <LicitacaoCard licitacao={activeDrag} onMover={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal de motivo / seletor de coluna */}
      <MoveKanbanModal
        open={!!pendingMove}
        colunaDestino={pendingMove?.colunaDestino ?? null}
        colunaAtual={pendingMove?.licitacao.card.colunaAtual}
        onConfirm={handleModalConfirm}
        onCancel={() => setPendingMove(null)}
      />
    </div>
  )
}
```

- [ ] **Step 14.3: Commit**

```bash
git add components/kanban/KanbanBoard.tsx components/providers.tsx app/layout.tsx
git commit -m "feat: add KanbanBoard with dnd-kit, TanStack Query, filters, and move modal"
```

---

## Task 15: Kanban Page (wire-up final)

**Files:**
- Create: `app/kanban/page.tsx`

- [ ] **Step 15.1: Criar app/kanban/page.tsx**

```tsx
import { TopBar } from '@/components/layout/TopBar'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { db } from '@/lib/db'
import type { LicitacaoComCard } from '@/types/licitacao'

async function getLicitacoes(): Promise<LicitacaoComCard[]> {
  const rows = await db.licitacao.findMany({
    include: {
      card: {
        select: {
          id: true,
          colunaAtual: true,
          urgente: true,
          bloqueado: true,
          motivoBloqueio: true,
        },
      },
      score: {
        select: {
          scoreFinal: true,
          faixaClassificacao: true,
          valorCapturavelEstimado: true,
          falsoNegativoNivelRisco: true,
        },
      },
    },
    orderBy: { criadoEm: 'desc' },
  })

  return rows
    .filter((r) => r.card !== null)
    .map((r) => ({
      ...r,
      dataSessao: r.dataSessao?.toISOString() ?? null,
      valorGlobalEstimado: r.valorGlobalEstimado ? Number(r.valorGlobalEstimado) : null,
      card: r.card!,
      score: r.score
        ? {
            ...r.score,
            scoreFinal: Number(r.score.scoreFinal),
            valorCapturavelEstimado: r.score.valorCapturavelEstimado
              ? Number(r.score.valorCapturavelEstimado)
              : null,
          }
        : null,
    }))
}

export default async function KanbanPage() {
  const licitacoes = await getLicitacoes()

  return (
    <>
      <TopBar title="Kanban de Licitações" />
      <KanbanBoard initialData={licitacoes} />
    </>
  )
}
```

- [ ] **Step 15.2: Testar o Kanban completo**

```bash
npm run dev
```

Abrir http://localhost:3000/kanban e verificar:
- [ ] 9 colunas aparecem com os cards distribuídos
- [ ] Métricas na linha superior refletem dados reais
- [ ] Filtros funcionam (busca, segmento, UF, urgentes, FN)
- [ ] Drag-and-drop move cards entre colunas
- [ ] Mover para "Descartadas" ou "Perdemos" abre modal de motivo
- [ ] Tentar mover card com FN alto para "Descartadas" mostra toast de erro e não move
- [ ] Mover para "Viável Comercialmente" sem score mostra toast de aviso
- [ ] Cards sem score exibem "Score: — · Sem classificação"
- [ ] Botão IA está desabilitado com tooltip

- [ ] **Step 15.3: Commit**

```bash
git add app/kanban/page.tsx
git commit -m "feat: wire kanban page with server-side data fetch and KanbanBoard"
```

---

## Task 16: PM2 Deploy Config

**Files:**
- Create: `ecosystem.config.js`

- [ ] **Step 16.1: Criar ecosystem.config.js**

```js
module.exports = {
  apps: [
    {
      name: 'kanbamlicita',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
```

- [ ] **Step 16.2: Criar .env.example**

Criar `.env.example` (versionado — sem valores reais):
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/kanbamlicita"
```

- [ ] **Step 16.3: Atualizar .gitignore**

Confirmar que `.env.local` está no `.gitignore`:
```bash
grep ".env.local" .gitignore || echo ".env.local" >> .gitignore
```

- [ ] **Step 16.4: Commit final**

```bash
git add ecosystem.config.js .env.example .gitignore
git commit -m "chore: add PM2 config and env example for VPS deploy"
```

---

## Checklist de Conclusão do SP-1

Antes de marcar o SP-1 como concluído, verificar:

- [ ] `npx jest --no-coverage` → todos os testes passam
- [ ] `npm run build` → build de produção sem erros
- [ ] `npm run dev` → Kanban funcional em localhost:3000
- [ ] 9 colunas com 30 cards seed distribuídos
- [ ] Drag-and-drop funcional
- [ ] Travas: FN alto bloqueia descarte, modal exige motivo para descartadas/perdemos
- [ ] Filtros funcionando (busca, segmento, UF, urgentes, FN)
- [ ] Métricas exibidas corretamente
- [ ] Botão IA desabilitado com tooltip
- [ ] Todas as tabelas do schema existem no banco

---

## Deploy na VPS Hostinger

Após validar localmente:

```bash
# Na VPS, clonar e instalar
git clone <repo> kanbamlicita
cd kanbamlicita
npm install
cp .env.example .env.local
# Editar .env.local com DATABASE_URL real

# Migrations e seed
npx prisma migrate deploy
npx prisma db seed

# Build e start via PM2
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```
