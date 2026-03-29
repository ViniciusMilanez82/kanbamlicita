# KanbanLicita v2 — Reescrita Simplificada

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever o KanbanLicita como uma plataforma simples e intuitiva de gestão de licitações via Kanban visual, com IA opcional em todas as etapas, configurável para qualquer empresa.

**Architecture:** App Next.js 16 com App Router. Prisma 7 + PostgreSQL. Modelo de dados simplificado (~6 tabelas vs 19 atuais). UI limpa com Kanban drag-and-drop como tela principal. Detalhe da licitação em painel lateral (drawer) ao invés de página separada com 9 abas. IA integrada em cada coluna do Kanban como ação contextual.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Prisma 7, PostgreSQL, TailwindCSS 4, shadcn/ui, @dnd-kit, @tanstack/react-query, @anthropic-ai/sdk, NextAuth v5, bcryptjs

---

## Visão Geral da Arquitetura

### Princípios

1. **Simplicidade radical** — se o usuário comum não entende em 5 segundos, está errado
2. **IA como assistente** — sempre disponível, nunca obrigatória
3. **Configurável** — qualquer empresa, qualquer produto/serviço
4. **Kanban-first** — o board é a tela principal, tudo gira em torno dele

### Modelo de Dados Simplificado

```
User              — autenticação (manter atual)
Empresa           — dados da empresa, configurações
Produto           — catálogo de produtos/serviços da empresa
KanbanColuna      — colunas customizáveis do board
Licitacao         — dados da licitação (simplificado: ~15 campos vs 60+)
KanbanCard        — card no board (vincula licitação à coluna)
Movimentacao      — histórico de movimentos
AcaoIa            — log de ações da IA (qualquer fase)
```

### Telas

1. **Login** — email + senha (manter)
2. **Kanban Board** — tela principal, com filtros e métricas simples
3. **Drawer de Detalhe** — painel lateral ao clicar no card (NÃO página separada)
4. **Catálogo** — produtos/serviços da empresa
5. **Configurações** — empresa, colunas, usuários

### Mapa de Arquivos

```
prisma/
  schema.prisma                    — modelo simplificado

app/
  layout.tsx                       — layout raiz
  page.tsx                         — redirect → /kanban
  login/page.tsx                   — login (manter)
  kanban/page.tsx                  — board principal
  catalogo/page.tsx                — produtos/serviços
  configuracoes/page.tsx           — settings

  api/
    auth/[...nextauth]/route.ts    — auth (manter)
    me/route.ts                    — perfil (manter)
    usuarios-ativos/route.ts       — listar usuários (manter)
    empresa/route.ts               — GET/PUT empresa
    produtos/route.ts              — CRUD produtos
    produtos/importar/route.ts     — importar catálogo com IA
    colunas/route.ts               — CRUD colunas
    licitacoes/route.ts            — GET lista, POST criar
    licitacoes/[id]/route.ts       — GET detalhe, PUT atualizar
    licitacoes/importar/route.ts   — importar via PDF/link/texto com IA
    kanban/mover/route.ts          — mover card
    ia/analisar/route.ts           — IA: análise contextual
    admin/usuarios/route.ts        — CRUD usuários (manter)
    admin/usuarios/[id]/route.ts   — update usuário (manter)

components/
  layout/
    AppShell.tsx                   — container principal
    SidebarNav.tsx                 — navegação lateral
    TopBar.tsx                     — barra superior
  kanban/
    KanbanBoard.tsx                — board completo
    KanbanColumn.tsx               — coluna individual
    KanbanCard.tsx                 — card visual
    FilterBar.tsx                  — filtros simples
    MoverCardModal.tsx             — modal de mover
  detalhe/
    LicitacaoDrawer.tsx            — painel lateral de detalhe
    CampoEditavel.tsx              — campo inline editável
    TimelineMovimentos.tsx         — histórico simples
    BotaoIa.tsx                    — botão "Pedir ajuda à IA"
    RespostaIa.tsx                 — exibição da resposta da IA
  catalogo/
    ProdutosList.tsx               — lista de produtos
    ProdutoForm.tsx                — form criar/editar
    ImportarCatalogoModal.tsx       — importar via PDF/planilha
  configuracoes/
    EmpresaForm.tsx                — dados da empresa
    ColunasEditor.tsx              — editor de colunas
    UsuariosTab.tsx                — gerenciar usuários
  ui/                              — shadcn primitivos (manter)
  providers.tsx                    — React Query + Sonner (manter)

lib/
  db.ts                            — Prisma singleton (manter)
  auth/authorize.ts                — auth (manter)
  format.ts                        — formatação (manter)
  utils.ts                         — cn() (manter)
  ia/
    provider.ts                    — interface LLM
    factory.ts                     — factory singleton
    anthropic.ts                   — Anthropic provider
    openai.ts                      — OpenAI provider
    prompts/
      extrair-licitacao.ts         — prompt: extrair dados de edital
      analisar-licitacao.ts        — prompt: analisar licitação vs produtos
      sugerir-proposta.ts          — prompt: sugerir proposta
      extrair-catalogo.ts          — prompt: extrair produtos de PDF
      generico.ts                  — prompt: assistente genérico

types/
  licitacao.ts                     — tipos simplificados
  empresa.ts                       — tipos empresa/produto
```

---

## Task 1: Limpar e preparar o projeto

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `package.json`

- [ ] **Step 1: Criar branch de trabalho**

```bash
git checkout main
git checkout -b feature/v2-simplificado
```

- [ ] **Step 2: Remover arquivos antigos que serão substituídos**

Remover os seguintes diretórios/arquivos (manter auth, db, format, utils, ui, providers):

```bash
# Remover componentes antigos
rm -rf components/kanban
rm -rf components/licitacao
rm -rf components/configuracoes

# Remover pages antigas (exceto login e layout)
rm -rf app/kanban
rm -rf app/licitacoes
rm -rf app/configuracoes
rm -rf app/fontes

# Remover API routes antigas (exceto auth, me, usuarios-ativos, admin/usuarios)
rm -rf app/api/kanban
rm -rf app/api/licitacoes
rm -rf app/api/configuracoes
rm -rf app/api/admin/fontes

# Remover lib antiga (exceto db, auth, format, utils)
rm -rf lib/kanban.ts
rm -rf lib/score
rm -rf lib/llm

# Remover types antigos
rm -rf types/licitacao.ts
rm -rf types/licitacao-detalhe.ts

# Remover testes antigos
rm -rf __tests__
```

- [ ] **Step 3: Verificar que auth, db, format, utils permanecem intactos**

```bash
ls lib/db.ts lib/auth/authorize.ts lib/format.ts lib/utils.ts
ls auth.ts
ls components/ui/
ls components/providers.tsx
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(v2): remove old components, pages, and API routes — clean slate for v2"
```

---

## Task 2: Novo schema Prisma simplificado

**Files:**
- Create: `prisma/schema.prisma` (reescrever)

- [ ] **Step 1: Escrever o novo schema**

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== AUTH (manter igual) ====================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime? @map("email_verified")
  senha         String?
  name          String?
  image         String?
  role          String    @default("user")
  ativo         Boolean   @default(true)
  criadoEm      DateTime  @default(now()) @map("criado_em")
  atualizadoEm  DateTime  @updatedAt @map("atualizado_em")

  accounts    Account[]
  sessions    Session[]
  kanbanCards KanbanCard[]

  @@map("usuarios")
}

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("contas_auth")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessoes_auth")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verificacao_tokens")
}

// ==================== EMPRESA ====================

model Empresa {
  id          String   @id @default("default")
  nome        String
  descricao   String?  @db.Text
  segmento    String?
  criadoEm    DateTime @default(now()) @map("criado_em")
  atualizadoEm DateTime @updatedAt @map("atualizado_em")

  produtos Produto[]

  @@map("empresa")
}

// ==================== CATÁLOGO ====================

model Produto {
  id          String   @id @default(cuid())
  empresaId   String   @default("default") @map("empresa_id")
  nome        String
  descricao   String?  @db.Text
  categoria   String?
  palavrasChave String[] @map("palavras_chave")
  ativo       Boolean  @default(true)
  criadoEm    DateTime @default(now()) @map("criado_em")
  atualizadoEm DateTime @updatedAt @map("atualizado_em")

  empresa Empresa @relation(fields: [empresaId], references: [id], onDelete: Cascade)

  @@map("produtos")
}

// ==================== KANBAN ====================

model KanbanColuna {
  id      String @id @default(cuid())
  nome    String
  ordem   Int
  cor     String @default("#3B82F6")
  tipo    String @default("normal") // "inicial", "normal", "final_positivo", "final_negativo"
  ativo   Boolean @default(true)
  criadoEm DateTime @default(now()) @map("criado_em")

  cards KanbanCard[]

  @@map("kanban_colunas")
}

// ==================== LICITAÇÃO (SIMPLIFICADA) ====================

model Licitacao {
  id              String    @id @default(cuid())
  titulo          String
  orgao           String?
  objeto          String?   @db.Text
  modalidade      String?
  uf              String?
  municipio       String?
  valorEstimado   Decimal?  @map("valor_estimado") @db.Decimal(15, 2)
  dataPublicacao  DateTime? @map("data_publicacao")
  dataSessao      DateTime? @map("data_sessao")
  linkOrigem      String?   @map("link_origem")
  observacoes     String?   @db.Text
  dadosExtraidos  Json?     @map("dados_extraidos") // dados extras extraídos pela IA
  criadoEm        DateTime  @default(now()) @map("criado_em")
  atualizadoEm    DateTime  @updatedAt @map("atualizado_em")

  card          KanbanCard?
  movimentacoes Movimentacao[]
  acoesIa       AcaoIa[]

  @@map("licitacoes")
}

model KanbanCard {
  id           String   @id @default(cuid())
  licitacaoId  String   @unique @map("licitacao_id")
  colunaId     String   @map("coluna_id")
  ordem        Int      @default(0)
  responsavelId String? @map("responsavel_id")
  urgente      Boolean  @default(false)
  notas        String?  @db.Text
  criadoEm     DateTime @default(now()) @map("criado_em")
  atualizadoEm DateTime @updatedAt @map("atualizado_em")

  licitacao   Licitacao    @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)
  coluna      KanbanColuna @relation(fields: [colunaId], references: [id])
  responsavel User?        @relation(fields: [responsavelId], references: [id])
  movimentacoes Movimentacao[]

  @@map("kanban_cards")
}

model Movimentacao {
  id            String   @id @default(cuid())
  cardId        String   @map("card_id")
  licitacaoId   String   @map("licitacao_id")
  colunaOrigem  String?  @map("coluna_origem")
  colunaDestino String   @map("coluna_destino")
  motivo        String?
  movidoPor     String?  @map("movido_por")
  criadoEm      DateTime @default(now()) @map("criado_em")

  card      KanbanCard @relation(fields: [cardId], references: [id], onDelete: Cascade)
  licitacao Licitacao  @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("movimentacoes")
}

// ==================== IA ====================

model AcaoIa {
  id           String   @id @default(cuid())
  licitacaoId  String?  @map("licitacao_id")
  tipo         String   // "extracao", "analise", "triagem", "proposta", "catalogo", "generico"
  prompt       String?  @db.Text
  resposta     String?  @db.Text
  respostaJson Json?    @map("resposta_json")
  modelo       String?
  status       String   @default("processando") // "processando", "concluido", "erro"
  erro         String?
  criadoEm     DateTime @default(now()) @map("criado_em")

  licitacao Licitacao? @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)

  @@map("acoes_ia")
}
```

- [ ] **Step 2: Gerar migration**

```bash
npx prisma migrate dev --name v2_schema_simplificado
```

- [ ] **Step 3: Verificar que o client gera sem erros**

```bash
npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat(v2): new simplified Prisma schema — 8 domain tables vs 19"
```

---

## Task 3: Seed com colunas padrão e empresa

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Escrever o seed**

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Empresa padrão
  await prisma.empresa.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      nome: "Minha Empresa",
      descricao: "Configure os dados da sua empresa em Configurações",
      segmento: "Geral",
    },
  });

  // Colunas padrão de licitação
  const colunas = [
    { nome: "Captadas", ordem: 0, cor: "#6B7280", tipo: "inicial" },
    { nome: "Triagem", ordem: 1, cor: "#F59E0B", tipo: "normal" },
    { nome: "Em Análise", ordem: 2, cor: "#3B82F6", tipo: "normal" },
    { nome: "Proposta", ordem: 3, cor: "#8B5CF6", tipo: "normal" },
    { nome: "Enviada", ordem: 4, cor: "#06B6D4", tipo: "normal" },
    { nome: "Ganhamos", ordem: 5, cor: "#10B981", tipo: "final_positivo" },
    { nome: "Perdemos", ordem: 6, cor: "#EF4444", tipo: "final_negativo" },
    { nome: "Descartada", ordem: 7, cor: "#9CA3AF", tipo: "final_negativo" },
  ];

  for (const col of colunas) {
    const existing = await prisma.kanbanColuna.findFirst({
      where: { nome: col.nome },
    });
    if (!existing) {
      await prisma.kanbanColuna.create({ data: col });
    }
  }

  // Usuário admin padrão
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

  console.log("Seed concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Adicionar script seed ao package.json**

Adicionar no `package.json`:
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Rodar o seed**

```bash
npx prisma db seed
```

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat(v2): add seed with default columns, company, and admin user"
```

---

## Task 4: Types simplificados

**Files:**
- Create: `types/licitacao.ts`
- Create: `types/empresa.ts`

- [ ] **Step 1: Criar types de licitação**

```typescript
// types/licitacao.ts

export interface Licitacao {
  id: string;
  titulo: string;
  orgao: string | null;
  objeto: string | null;
  modalidade: string | null;
  uf: string | null;
  municipio: string | null;
  valorEstimado: number | null;
  dataPublicacao: string | null;
  dataSessao: string | null;
  linkOrigem: string | null;
  observacoes: string | null;
  dadosExtraidos: Record<string, unknown> | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CardInfo {
  id: string;
  colunaId: string;
  colunaNome: string;
  colunaCor: string;
  ordem: number;
  responsavelId: string | null;
  responsavelNome: string | null;
  urgente: boolean;
  notas: string | null;
}

export interface LicitacaoComCard extends Licitacao {
  card: CardInfo | null;
}

export interface Movimentacao {
  id: string;
  colunaOrigem: string | null;
  colunaDestino: string;
  motivo: string | null;
  movidoPor: string | null;
  criadoEm: string;
}

export interface AcaoIa {
  id: string;
  tipo: string;
  resposta: string | null;
  respostaJson: Record<string, unknown> | null;
  modelo: string | null;
  status: string;
  erro: string | null;
  criadoEm: string;
}

export interface LicitacaoDetalhe extends Licitacao {
  card: CardInfo | null;
  movimentacoes: Movimentacao[];
  acoesIa: AcaoIa[];
}

export interface KanbanColuna {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  tipo: string;
  ativo: boolean;
}

export interface KanbanMetricas {
  total: number;
  porColuna: { colunaId: string; colunaNome: string; count: number }[];
  urgentes: number;
}
```

- [ ] **Step 2: Criar types de empresa**

```typescript
// types/empresa.ts

export interface Empresa {
  id: string;
  nome: string;
  descricao: string | null;
  segmento: string | null;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  palavrasChave: string[];
  ativo: boolean;
}
```

- [ ] **Step 3: Commit**

```bash
git add types/
git commit -m "feat(v2): add simplified type definitions"
```

---

## Task 5: LLM provider (reaproveitar e simplificar)

**Files:**
- Create: `lib/ia/provider.ts`
- Create: `lib/ia/factory.ts`
- Create: `lib/ia/anthropic.ts`
- Create: `lib/ia/openai.ts`

- [ ] **Step 1: Interface do provider**

```typescript
// lib/ia/provider.ts

export interface IaProvider {
  complete(system: string, user: string): Promise<string>;
  readonly modelName: string;
}
```

- [ ] **Step 2: Anthropic provider**

```typescript
// lib/ia/anthropic.ts

import Anthropic from "@anthropic-ai/sdk";
import type { IaProvider } from "./provider";

export class AnthropicProvider implements IaProvider {
  private client: Anthropic;
  readonly modelName: string;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.LLM_API_KEY });
    this.modelName = process.env.LLM_MODEL ?? "claude-sonnet-4-20250514";
  }

  async complete(system: string, user: string): Promise<string> {
    const res = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = res.content[0];
    return block.type === "text" ? block.text : "";
  }
}
```

- [ ] **Step 3: OpenAI provider**

```typescript
// lib/ia/openai.ts

import OpenAI from "openai";
import type { IaProvider } from "./provider";

export class OpenAiProvider implements IaProvider {
  private client: OpenAI;
  readonly modelName: string;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.LLM_API_KEY });
    this.modelName = process.env.LLM_MODEL ?? "gpt-4o";
  }

  async complete(system: string, user: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.modelName,
      max_tokens: 4096,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }
}
```

- [ ] **Step 4: Factory**

```typescript
// lib/ia/factory.ts

import type { IaProvider } from "./provider";

let instance: IaProvider | null = null;

export function getIaProvider(): IaProvider {
  if (!instance) {
    const provider = process.env.LLM_PROVIDER ?? "anthropic";
    if (provider === "openai") {
      const { OpenAiProvider } = require("./openai");
      instance = new OpenAiProvider();
    } else {
      const { AnthropicProvider } = require("./anthropic");
      instance = new AnthropicProvider();
    }
  }
  return instance;
}

export function setIaProvider(p: IaProvider) {
  instance = p;
}

export function resetIaProvider() {
  instance = null;
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/ia/
git commit -m "feat(v2): add simplified LLM provider abstraction"
```

---

## Task 6: Prompts da IA

**Files:**
- Create: `lib/ia/prompts/extrair-licitacao.ts`
- Create: `lib/ia/prompts/analisar-licitacao.ts`
- Create: `lib/ia/prompts/sugerir-proposta.ts`
- Create: `lib/ia/prompts/extrair-catalogo.ts`
- Create: `lib/ia/prompts/generico.ts`

- [ ] **Step 1: Prompt de extração de licitação**

```typescript
// lib/ia/prompts/extrair-licitacao.ts

export const SYSTEM_EXTRAIR = `Você é um assistente especializado em licitações públicas brasileiras.
Sua tarefa é extrair dados estruturados de textos de editais.
Retorne APENAS JSON válido, sem markdown, sem explicações.`;

export function buildPromptExtrair(texto: string): string {
  return `Extraia os seguintes dados do texto abaixo. Se não encontrar, use null.

Retorne este JSON:
{
  "titulo": "título resumido da licitação (max 100 chars)",
  "orgao": "nome do órgão licitante",
  "objeto": "descrição do objeto",
  "modalidade": "pregão eletrônico, concorrência, etc",
  "uf": "sigla do estado (2 letras)",
  "municipio": "nome do município",
  "valorEstimado": 0.00,
  "dataPublicacao": "YYYY-MM-DD ou null",
  "dataSessao": "YYYY-MM-DDTHH:mm:ss ou null",
  "itensIdentificados": ["item 1", "item 2"],
  "requisitosChave": ["requisito 1", "requisito 2"],
  "observacoes": "qualquer info relevante adicional"
}

TEXTO DO EDITAL:
${texto}`;
}
```

- [ ] **Step 2: Prompt de análise vs produtos**

```typescript
// lib/ia/prompts/analisar-licitacao.ts

export const SYSTEM_ANALISAR = `Você é um consultor comercial especializado em licitações.
Sua tarefa é analisar se uma licitação é relevante para os produtos/serviços da empresa.
Retorne APENAS JSON válido, sem markdown.`;

export function buildPromptAnalisar(
  licitacao: { titulo: string; objeto: string | null; observacoes: string | null; dadosExtraidos: unknown },
  produtos: { nome: string; descricao: string | null; categoria: string | null }[],
  empresa: { nome: string; descricao: string | null; segmento: string | null }
): string {
  return `Analise se esta licitação é relevante para a empresa.

EMPRESA:
- Nome: ${empresa.nome}
- Segmento: ${empresa.segmento ?? "não informado"}
- Descrição: ${empresa.descricao ?? "não informada"}

PRODUTOS/SERVIÇOS DA EMPRESA:
${produtos.map((p) => `- ${p.nome}: ${p.descricao ?? "sem descrição"} (${p.categoria ?? "sem categoria"})`).join("\n")}

LICITAÇÃO:
- Título: ${licitacao.titulo}
- Objeto: ${licitacao.objeto ?? "não informado"}
- Observações: ${licitacao.observacoes ?? "nenhuma"}
- Dados extraídos: ${JSON.stringify(licitacao.dadosExtraidos ?? {})}

Retorne este JSON:
{
  "relevancia": "alta" | "media" | "baixa" | "nenhuma",
  "justificativa": "explicação em 2-3 frases",
  "produtosRelacionados": ["nome do produto 1", "nome do produto 2"],
  "oportunidades": ["oportunidade identificada 1"],
  "riscos": ["risco identificado 1"],
  "recomendacao": "AVANCAR" | "ACOMPANHAR" | "DESCARTAR",
  "proximosPassos": ["passo 1", "passo 2"]
}`;
}
```

- [ ] **Step 3: Prompt de sugestão de proposta**

```typescript
// lib/ia/prompts/sugerir-proposta.ts

export const SYSTEM_PROPOSTA = `Você é um especialista em propostas para licitações públicas brasileiras.
Ajude a montar uma proposta competitiva baseada nos dados disponíveis.
Retorne APENAS JSON válido, sem markdown.`;

export function buildPromptProposta(
  licitacao: { titulo: string; objeto: string | null; dadosExtraidos: unknown },
  produtos: { nome: string; descricao: string | null }[],
  empresa: { nome: string; segmento: string | null }
): string {
  return `Sugira os elementos para uma proposta para esta licitação.

EMPRESA: ${empresa.nome} (${empresa.segmento ?? "geral"})

PRODUTOS DISPONÍVEIS:
${produtos.map((p) => `- ${p.nome}: ${p.descricao ?? ""}`).join("\n")}

LICITAÇÃO:
- Título: ${licitacao.titulo}
- Objeto: ${licitacao.objeto ?? "não informado"}
- Dados: ${JSON.stringify(licitacao.dadosExtraidos ?? {})}

Retorne este JSON:
{
  "produtosSugeridos": [{"nome": "...", "justificativa": "..."}],
  "pontosFortes": ["ponto 1"],
  "documentacaoNecessaria": ["documento 1"],
  "estrategia": "resumo da estratégia em 2-3 frases",
  "cuidados": ["cuidado 1"]
}`;
}
```

- [ ] **Step 4: Prompt de extração de catálogo**

```typescript
// lib/ia/prompts/extrair-catalogo.ts

export const SYSTEM_CATALOGO = `Você é um assistente que extrai informações de produtos e serviços de catálogos empresariais.
Retorne APENAS JSON válido, sem markdown.`;

export function buildPromptCatalogo(texto: string): string {
  return `Extraia os produtos e/ou serviços do texto abaixo.

Retorne este JSON:
{
  "produtos": [
    {
      "nome": "nome do produto/serviço",
      "descricao": "descrição breve",
      "categoria": "categoria sugerida",
      "palavrasChave": ["palavra1", "palavra2"]
    }
  ]
}

TEXTO:
${texto}`;
}
```

- [ ] **Step 5: Prompt genérico (assistente)**

```typescript
// lib/ia/prompts/generico.ts

export const SYSTEM_GENERICO = `Você é um assistente especializado em licitações públicas brasileiras.
Responda de forma clara, objetiva e útil. Use formatação simples.
Quando fizer análises, seja específico e actionable.`;
```

- [ ] **Step 6: Commit**

```bash
git add lib/ia/prompts/
git commit -m "feat(v2): add all IA prompt templates — extraction, analysis, proposal, catalog"
```

---

## Task 7: API — Empresa e Produtos

**Files:**
- Create: `app/api/empresa/route.ts`
- Create: `app/api/produtos/route.ts`
- Create: `app/api/produtos/importar/route.ts`

- [ ] **Step 1: API da empresa**

```typescript
// app/api/empresa/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const empresa = await db.empresa.findUnique({ where: { id: "default" } });
  return NextResponse.json(empresa);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { nome, descricao, segmento } = body;

  const empresa = await db.empresa.upsert({
    where: { id: "default" },
    update: { nome, descricao, segmento },
    create: { id: "default", nome, descricao, segmento },
  });

  return NextResponse.json(empresa);
}
```

- [ ] **Step 2: API de produtos (CRUD)**

```typescript
// app/api/produtos/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const produtos = await db.produto.findMany({
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(produtos);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { nome, descricao, categoria, palavrasChave } = body;

  if (!nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const produto = await db.produto.create({
    data: { nome, descricao, categoria, palavrasChave: palavrasChave ?? [] },
  });

  return NextResponse.json(produto, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { id, nome, descricao, categoria, palavrasChave, ativo } = body;

  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

  const produto = await db.produto.update({
    where: { id },
    data: { nome, descricao, categoria, palavrasChave, ativo },
  });

  return NextResponse.json(produto);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

  await db.produto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: API de importação de catálogo com IA**

```typescript
// app/api/produtos/importar/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getIaProvider } from "@/lib/ia/factory";
import { SYSTEM_CATALOGO, buildPromptCatalogo } from "@/lib/ia/prompts/extrair-catalogo";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { texto } = body;

  if (!texto) return NextResponse.json({ error: "Texto é obrigatório" }, { status: 400 });

  try {
    const ia = getIaProvider();
    const resposta = await ia.complete(SYSTEM_CATALOGO, buildPromptCatalogo(texto));

    const json = JSON.parse(resposta.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    const produtos = json.produtos ?? [];

    const criados = [];
    for (const p of produtos) {
      const produto = await db.produto.create({
        data: {
          nome: p.nome,
          descricao: p.descricao ?? null,
          categoria: p.categoria ?? null,
          palavrasChave: p.palavrasChave ?? [],
        },
      });
      criados.push(produto);
    }

    return NextResponse.json({ importados: criados.length, produtos: criados }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/empresa/ app/api/produtos/
git commit -m "feat(v2): add empresa and produtos API routes with AI catalog import"
```

---

## Task 8: API — Colunas do Kanban

**Files:**
- Create: `app/api/colunas/route.ts`

- [ ] **Step 1: CRUD de colunas**

```typescript
// app/api/colunas/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const colunas = await db.kanbanColuna.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
  });
  return NextResponse.json(colunas);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if ((session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const { nome, cor, tipo } = body;

  if (!nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const maxOrdem = await db.kanbanColuna.aggregate({ _max: { ordem: true } });
  const ordem = (maxOrdem._max.ordem ?? -1) + 1;

  const coluna = await db.kanbanColuna.create({
    data: { nome, ordem, cor: cor ?? "#3B82F6", tipo: tipo ?? "normal" },
  });

  return NextResponse.json(coluna, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if ((session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const { id, nome, cor, tipo, ordem, ativo } = body;

  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

  const coluna = await db.kanbanColuna.update({
    where: { id },
    data: { nome, cor, tipo, ordem, ativo },
  });

  return NextResponse.json(coluna);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/colunas/
git commit -m "feat(v2): add kanban columns CRUD API"
```

---

## Task 9: API — Licitações (CRUD + importação com IA)

**Files:**
- Create: `app/api/licitacoes/route.ts`
- Create: `app/api/licitacoes/[id]/route.ts`
- Create: `app/api/licitacoes/importar/route.ts`

- [ ] **Step 1: Listar e criar licitações**

```typescript
// app/api/licitacoes/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const licitacoes = await db.licitacao.findMany({
    include: {
      card: {
        include: {
          coluna: { select: { id: true, nome: true, cor: true } },
          responsavel: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(licitacoes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { titulo, orgao, objeto, modalidade, uf, municipio, valorEstimado, dataPublicacao, dataSessao, linkOrigem, observacoes } = body;

  if (!titulo) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });

  // Buscar coluna inicial
  const colunaInicial = await db.kanbanColuna.findFirst({
    where: { tipo: "inicial", ativo: true },
    orderBy: { ordem: "asc" },
  });

  if (!colunaInicial) {
    return NextResponse.json({ error: "Nenhuma coluna inicial configurada" }, { status: 500 });
  }

  const licitacao = await db.licitacao.create({
    data: {
      titulo,
      orgao,
      objeto,
      modalidade,
      uf,
      municipio,
      valorEstimado,
      dataPublicacao: dataPublicacao ? new Date(dataPublicacao) : null,
      dataSessao: dataSessao ? new Date(dataSessao) : null,
      linkOrigem,
      observacoes,
      card: {
        create: {
          colunaId: colunaInicial.id,
          ordem: 0,
        },
      },
    },
    include: {
      card: {
        include: {
          coluna: { select: { id: true, nome: true, cor: true } },
        },
      },
    },
  });

  return NextResponse.json(licitacao, { status: 201 });
}
```

- [ ] **Step 2: Detalhe e update de licitação**

```typescript
// app/api/licitacoes/[id]/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const licitacao = await db.licitacao.findUnique({
    where: { id },
    include: {
      card: {
        include: {
          coluna: { select: { id: true, nome: true, cor: true } },
          responsavel: { select: { id: true, name: true } },
        },
      },
      movimentacoes: {
        orderBy: { criadoEm: "desc" },
        take: 50,
      },
      acoesIa: {
        orderBy: { criadoEm: "desc" },
        take: 10,
      },
    },
  });

  if (!licitacao) return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });

  return NextResponse.json(licitacao);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { titulo, orgao, objeto, modalidade, uf, municipio, valorEstimado, dataPublicacao, dataSessao, linkOrigem, observacoes, dadosExtraidos } = body;

  const licitacao = await db.licitacao.update({
    where: { id },
    data: {
      titulo,
      orgao,
      objeto,
      modalidade,
      uf,
      municipio,
      valorEstimado,
      dataPublicacao: dataPublicacao ? new Date(dataPublicacao) : undefined,
      dataSessao: dataSessao ? new Date(dataSessao) : undefined,
      linkOrigem,
      observacoes,
      dadosExtraidos,
    },
  });

  return NextResponse.json(licitacao);
}
```

- [ ] **Step 3: Importar licitação com IA**

```typescript
// app/api/licitacoes/importar/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getIaProvider } from "@/lib/ia/factory";
import { SYSTEM_EXTRAIR, buildPromptExtrair } from "@/lib/ia/prompts/extrair-licitacao";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { texto } = body;

  if (!texto) return NextResponse.json({ error: "Texto é obrigatório" }, { status: 400 });

  // Buscar coluna inicial
  const colunaInicial = await db.kanbanColuna.findFirst({
    where: { tipo: "inicial", ativo: true },
    orderBy: { ordem: "asc" },
  });

  if (!colunaInicial) {
    return NextResponse.json({ error: "Nenhuma coluna inicial configurada" }, { status: 500 });
  }

  try {
    const ia = getIaProvider();
    const resposta = await ia.complete(SYSTEM_EXTRAIR, buildPromptExtrair(texto));

    const dados = JSON.parse(resposta.replace(/```json?\n?/g, "").replace(/```/g, "").trim());

    const licitacao = await db.licitacao.create({
      data: {
        titulo: dados.titulo ?? "Licitação importada",
        orgao: dados.orgao,
        objeto: dados.objeto,
        modalidade: dados.modalidade,
        uf: dados.uf,
        municipio: dados.municipio,
        valorEstimado: dados.valorEstimado,
        dataPublicacao: dados.dataPublicacao ? new Date(dados.dataPublicacao) : null,
        dataSessao: dados.dataSessao ? new Date(dados.dataSessao) : null,
        observacoes: dados.observacoes,
        dadosExtraidos: dados,
        card: {
          create: { colunaId: colunaInicial.id, ordem: 0 },
        },
        acoesIa: {
          create: {
            tipo: "extracao",
            respostaJson: dados,
            resposta: resposta,
            modelo: ia.modelName,
            status: "concluido",
          },
        },
      },
      include: {
        card: { include: { coluna: true } },
      },
    });

    return NextResponse.json(licitacao, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/licitacoes/
git commit -m "feat(v2): add licitacoes CRUD and AI-powered import API"
```

---

## Task 10: API — Mover card no Kanban

**Files:**
- Create: `app/api/kanban/mover/route.ts`
- Create: `app/api/kanban/metricas/route.ts`

- [ ] **Step 1: Mover card**

```typescript
// app/api/kanban/mover/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { cardId, colunaDestinoId, motivo } = body;

  if (!cardId || !colunaDestinoId) {
    return NextResponse.json({ error: "cardId e colunaDestinoId são obrigatórios" }, { status: 400 });
  }

  const card = await db.kanbanCard.findUnique({
    where: { id: cardId },
    include: { coluna: true },
  });

  if (!card) return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });

  const colunaDestino = await db.kanbanColuna.findUnique({ where: { id: colunaDestinoId } });
  if (!colunaDestino) return NextResponse.json({ error: "Coluna destino não encontrada" }, { status: 404 });

  // Colunas finais negativas pedem motivo
  if (colunaDestino.tipo === "final_negativo" && !motivo) {
    return NextResponse.json({ error: "Motivo é obrigatório para esta coluna" }, { status: 400 });
  }

  const user = session.user as { id: string; name?: string | null };

  const [updated] = await db.$transaction([
    db.kanbanCard.update({
      where: { id: cardId },
      data: { colunaId: colunaDestinoId },
      include: { coluna: true },
    }),
    db.movimentacao.create({
      data: {
        cardId,
        licitacaoId: card.licitacaoId,
        colunaOrigem: card.coluna.nome,
        colunaDestino: colunaDestino.nome,
        motivo,
        movidoPor: user.name ?? user.id,
      },
    }),
  ]);

  return NextResponse.json(updated);
}
```

- [ ] **Step 2: Métricas**

```typescript
// app/api/kanban/metricas/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const colunas = await db.kanbanColuna.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    include: { _count: { select: { cards: true } } },
  });

  const urgentes = await db.kanbanCard.count({ where: { urgente: true } });
  const total = await db.kanbanCard.count();

  return NextResponse.json({
    total,
    urgentes,
    porColuna: colunas.map((c) => ({
      colunaId: c.id,
      colunaNome: c.nome,
      count: c._count.cards,
    })),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/kanban/
git commit -m "feat(v2): add kanban move and metrics API"
```

---

## Task 11: API — IA contextual (análise, triagem, proposta)

**Files:**
- Create: `app/api/ia/analisar/route.ts`

- [ ] **Step 1: Endpoint unificado de IA**

```typescript
// app/api/ia/analisar/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getIaProvider } from "@/lib/ia/factory";
import { SYSTEM_ANALISAR, buildPromptAnalisar } from "@/lib/ia/prompts/analisar-licitacao";
import { SYSTEM_PROPOSTA, buildPromptProposta } from "@/lib/ia/prompts/sugerir-proposta";
import { SYSTEM_GENERICO } from "@/lib/ia/prompts/generico";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { licitacaoId, tipo, pergunta } = body;

  if (!licitacaoId || !tipo) {
    return NextResponse.json({ error: "licitacaoId e tipo são obrigatórios" }, { status: 400 });
  }

  const licitacao = await db.licitacao.findUnique({ where: { id: licitacaoId } });
  if (!licitacao) return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });

  const empresa = await db.empresa.findUnique({ where: { id: "default" } });
  const produtos = await db.produto.findMany({ where: { ativo: true } });

  // Criar registro de ação IA
  const acao = await db.acaoIa.create({
    data: { licitacaoId, tipo, status: "processando" },
  });

  try {
    const ia = getIaProvider();
    let system: string;
    let prompt: string;

    const licData = {
      titulo: licitacao.titulo,
      objeto: licitacao.objeto,
      observacoes: licitacao.observacoes,
      dadosExtraidos: licitacao.dadosExtraidos,
    };

    const prodData = produtos.map((p) => ({
      nome: p.nome,
      descricao: p.descricao,
      categoria: p.categoria,
    }));

    const empData = {
      nome: empresa?.nome ?? "Empresa",
      descricao: empresa?.descricao ?? null,
      segmento: empresa?.segmento ?? null,
    };

    switch (tipo) {
      case "analise":
      case "triagem":
        system = SYSTEM_ANALISAR;
        prompt = buildPromptAnalisar(licData, prodData, empData);
        break;
      case "proposta":
        system = SYSTEM_PROPOSTA;
        prompt = buildPromptProposta(licData, prodData, empData);
        break;
      case "generico":
        system = SYSTEM_GENERICO;
        prompt = pergunta ?? `Analise esta licitação e dê sua opinião:\n\nTítulo: ${licitacao.titulo}\nObjeto: ${licitacao.objeto}`;
        break;
      default:
        system = SYSTEM_ANALISAR;
        prompt = buildPromptAnalisar(licData, prodData, empData);
    }

    const resposta = await ia.complete(system, prompt);

    let respostaJson = null;
    try {
      respostaJson = JSON.parse(resposta.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      // Resposta não é JSON — tudo bem para tipo "generico"
    }

    const updated = await db.acaoIa.update({
      where: { id: acao.id },
      data: {
        resposta,
        respostaJson,
        modelo: ia.modelName,
        status: "concluido",
        prompt: prompt.substring(0, 2000),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    await db.acaoIa.update({
      where: { id: acao.id },
      data: { status: "erro", erro: msg },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/ia/
git commit -m "feat(v2): add unified IA analysis endpoint — triagem, analise, proposta, generico"
```

---

## Task 12: Layout e navegação

**Files:**
- Modify: `components/layout/SidebarNav.tsx`
- Modify: `app/page.tsx` (manter redirect)

- [ ] **Step 1: Atualizar SidebarNav com novos itens**

```typescript
// components/layout/SidebarNav.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/kanban", label: "Kanban", icon: LayoutDashboard },
  { href: "/catalogo", label: "Catálogo", icon: Package },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-52 flex-col bg-[#0F172A] text-white">
      <div className="px-4 py-5">
        <h1 className="text-lg font-bold tracking-tight">KanbanLicita</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[#1D4ED8] text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/SidebarNav.tsx
git commit -m "feat(v2): simplify sidebar navigation — 3 items instead of 4"
```

---

## Task 13: Kanban Board — componente principal

**Files:**
- Create: `app/kanban/page.tsx`
- Create: `components/kanban/KanbanBoard.tsx`
- Create: `components/kanban/KanbanColumn.tsx`
- Create: `components/kanban/KanbanCard.tsx`
- Create: `components/kanban/FilterBar.tsx`
- Create: `components/kanban/MoverCardModal.tsx`

- [ ] **Step 1: Página do Kanban**

```typescript
// app/kanban/page.tsx

import { TopBar } from "@/components/layout/TopBar";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export default function KanbanPage() {
  return (
    <>
      <TopBar title="Kanban de Licitações" />
      <div className="flex-1 overflow-hidden p-4">
        <KanbanBoard />
      </div>
    </>
  );
}
```

- [ ] **Step 2: FilterBar**

```typescript
// components/kanban/FilterBar.tsx

"use client";

import { Input } from "@/components/ui/input";

interface FilterBarProps {
  busca: string;
  onBuscaChange: (v: string) => void;
}

export function FilterBar({ busca, onBuscaChange }: FilterBarProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <Input
        placeholder="Buscar por título, órgão ou objeto..."
        value={busca}
        onChange={(e) => onBuscaChange(e.target.value)}
        className="max-w-md"
      />
    </div>
  );
}
```

- [ ] **Step 3: KanbanCard**

```typescript
// components/kanban/KanbanCard.tsx

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

interface CardData {
  id: string;
  licitacao: {
    id: string;
    titulo: string;
    orgao: string | null;
    uf: string | null;
    valorEstimado: number | null;
    dataSessao: string | null;
    modalidade: string | null;
  };
  urgente: boolean;
  responsavel: { name: string | null } | null;
}

interface KanbanCardProps {
  card: CardData;
  onClick: () => void;
}

export function KanbanCard({ card, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-tight line-clamp-2">
          {card.licitacao.titulo}
        </h3>
        {card.urgente && (
          <Badge variant="destructive" className="shrink-0 text-[10px]">Urgente</Badge>
        )}
      </div>

      {card.licitacao.orgao && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-1">{card.licitacao.orgao}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {card.licitacao.uf && (
          <Badge variant="outline" className="text-[10px]">{card.licitacao.uf}</Badge>
        )}
        {card.licitacao.modalidade && (
          <Badge variant="outline" className="text-[10px]">{card.licitacao.modalidade}</Badge>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>{formatCurrency(card.licitacao.valorEstimado)}</span>
        <span>{formatDate(card.licitacao.dataSessao)}</span>
      </div>

      {card.responsavel?.name && (
        <p className="mt-1.5 text-[11px] text-blue-600">{card.responsavel.name}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: KanbanColumn**

```typescript
// components/kanban/KanbanColumn.tsx

"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";

interface ColumnData {
  id: string;
  nome: string;
  cor: string;
  cards: Array<{
    id: string;
    licitacao: {
      id: string;
      titulo: string;
      orgao: string | null;
      uf: string | null;
      valorEstimado: number | null;
      dataSessao: string | null;
      modalidade: string | null;
    };
    urgente: boolean;
    responsavel: { name: string | null } | null;
  }>;
}

interface KanbanColumnProps {
  column: ColumnData;
  onCardClick: (licitacaoId: string) => void;
}

export function KanbanColumn({ column, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      className={`flex w-72 shrink-0 flex-col rounded-lg bg-slate-50 ${isOver ? "ring-2 ring-blue-400" : ""}`}
    >
      <div
        className="flex items-center justify-between rounded-t-lg px-3 py-2"
        style={{ backgroundColor: column.cor }}
      >
        <span className="text-sm font-semibold text-white">{column.nome}</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
          {column.cards.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 overflow-y-auto p-2"
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card.licitacao.id)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: MoverCardModal**

```typescript
// components/kanban/MoverCardModal.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { KanbanColuna } from "@/types/licitacao";

interface MoverCardModalProps {
  colunas: KanbanColuna[];
  colunaAtualId: string;
  onMover: (colunaDestinoId: string, motivo?: string) => void;
  onClose: () => void;
}

export function MoverCardModal({ colunas, colunaAtualId, onMover, onClose }: MoverCardModalProps) {
  const [destino, setDestino] = useState("");
  const [motivo, setMotivo] = useState("");

  const colDestino = colunas.find((c) => c.id === destino);
  const precisaMotivo = colDestino?.tipo === "final_negativo";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Mover Card</h3>

        <select
          className="w-full rounded border px-3 py-2 mb-3"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        >
          <option value="">Selecione a coluna destino</option>
          {colunas
            .filter((c) => c.id !== colunaAtualId && c.ativo)
            .map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
        </select>

        {precisaMotivo && (
          <Input
            placeholder="Motivo (obrigatório)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mb-3"
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onMover(destino, motivo || undefined)}
            disabled={!destino || (precisaMotivo && !motivo)}
          >
            Mover
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: KanbanBoard (componente principal com DnD)**

```typescript
// components/kanban/KanbanBoard.tsx

"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { FilterBar } from "./FilterBar";
import { LicitacaoDrawer } from "@/components/detalhe/LicitacaoDrawer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [drawerLicitacaoId, setDrawerLicitacaoId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: colunas = [] } = useQuery({
    queryKey: ["colunas"],
    queryFn: () => fetch("/api/colunas").then((r) => r.json()),
  });

  const { data: licitacoes = [] } = useQuery({
    queryKey: ["licitacoes"],
    queryFn: () => fetch("/api/licitacoes").then((r) => r.json()),
  });

  const moverMutation = useMutation({
    mutationFn: (data: { cardId: string; colunaDestinoId: string; motivo?: string }) =>
      fetch("/api/kanban/mover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Card movido!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Agrupar cards por coluna
  const colunasComCards = useMemo(() => {
    const buscaLower = busca.toLowerCase();
    return colunas.map((col: { id: string; nome: string; cor: string }) => ({
      ...col,
      cards: licitacoes
        .filter((l: { card: { colunaId: string } | null }) => l.card?.colunaId === col.id)
        .filter((l: { titulo: string; orgao: string | null; objeto: string | null }) =>
          !busca ||
          l.titulo.toLowerCase().includes(buscaLower) ||
          l.orgao?.toLowerCase().includes(buscaLower) ||
          l.objeto?.toLowerCase().includes(buscaLower)
        )
        .map((l: { id: string; titulo: string; orgao: string | null; uf: string | null; valorEstimado: number | null; dataSessao: string | null; modalidade: string | null; card: { id: string; urgente: boolean; responsavel: { name: string | null } | null } }) => ({
          id: l.card!.id,
          licitacao: {
            id: l.id,
            titulo: l.titulo,
            orgao: l.orgao,
            uf: l.uf,
            valorEstimado: l.valorEstimado,
            dataSessao: l.dataSessao,
            modalidade: l.modalidade,
          },
          urgente: l.card!.urgente,
          responsavel: l.card!.responsavel,
        })),
    }));
  }, [colunas, licitacoes, busca]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // "over" pode ser a coluna (droppable)
    const colunaDestinoId = over.id as string;
    const cardId = active.id as string;

    // Verificar se é coluna final negativa
    const colDestino = colunas.find((c: { id: string }) => c.id === colunaDestinoId);
    if (colDestino?.tipo === "final_negativo") {
      const motivo = prompt("Motivo para mover para " + colDestino.nome + ":");
      if (!motivo) return;
      moverMutation.mutate({ cardId, colunaDestinoId, motivo });
    } else {
      moverMutation.mutate({ cardId, colunaDestinoId });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <FilterBar busca={busca} onBuscaChange={setBusca} />
        <Button
          size="sm"
          onClick={() => setDrawerLicitacaoId("nova")}
          className="shrink-0"
        >
          <Plus className="mr-1 h-4 w-4" /> Nova Licitação
        </Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
          {colunasComCards.map((col: { id: string; nome: string; cor: string; cards: Array<{ id: string; licitacao: { id: string; titulo: string; orgao: string | null; uf: string | null; valorEstimado: number | null; dataSessao: string | null; modalidade: string | null }; urgente: boolean; responsavel: { name: string | null } | null }> }) => (
            <KanbanColumn
              key={col.id}
              column={col}
              onCardClick={(licitacaoId) => setDrawerLicitacaoId(licitacaoId)}
            />
          ))}
        </div>
      </DndContext>

      {drawerLicitacaoId && (
        <LicitacaoDrawer
          licitacaoId={drawerLicitacaoId}
          onClose={() => setDrawerLicitacaoId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add app/kanban/ components/kanban/
git commit -m "feat(v2): add Kanban board with drag-and-drop, filters, and column display"
```

---

## Task 14: Drawer de detalhe da licitação

**Files:**
- Create: `components/detalhe/LicitacaoDrawer.tsx`
- Create: `components/detalhe/CampoEditavel.tsx`
- Create: `components/detalhe/TimelineMovimentos.tsx`
- Create: `components/detalhe/BotaoIa.tsx`
- Create: `components/detalhe/RespostaIa.tsx`

- [ ] **Step 1: CampoEditavel — campo inline editável**

```typescript
// components/detalhe/CampoEditavel.tsx

"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";

interface CampoEditavelProps {
  label: string;
  valor: string | null;
  onSave: (valor: string) => void;
  multiline?: boolean;
}

export function CampoEditavel({ label, valor, onSave, multiline }: CampoEditavelProps) {
  const [editando, setEditando] = useState(false);
  const [temp, setTemp] = useState(valor ?? "");

  function salvar() {
    onSave(temp);
    setEditando(false);
  }

  function cancelar() {
    setTemp(valor ?? "");
    setEditando(false);
  }

  if (editando) {
    return (
      <div className="mb-3">
        <label className="text-xs font-medium text-slate-500">{label}</label>
        {multiline ? (
          <textarea
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            rows={3}
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            autoFocus
          />
        ) : (
          <input
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            autoFocus
          />
        )}
        <div className="mt-1 flex gap-1">
          <button onClick={salvar} className="text-green-600 hover:text-green-800">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={cancelar} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group mb-3">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <div className="flex items-start gap-1">
        <p className="text-sm text-slate-800">{valor || "—"}</p>
        <button
          onClick={() => setEditando(true)}
          className="invisible text-slate-400 hover:text-slate-600 group-hover:visible"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TimelineMovimentos**

```typescript
// components/detalhe/TimelineMovimentos.tsx

"use client";

import { formatDateTime } from "@/lib/format";
import type { Movimentacao } from "@/types/licitacao";

export function TimelineMovimentos({ movimentacoes }: { movimentacoes: Movimentacao[] }) {
  if (movimentacoes.length === 0) {
    return <p className="text-sm text-slate-400">Nenhuma movimentação registrada.</p>;
  }

  return (
    <div className="space-y-2">
      {movimentacoes.map((m) => (
        <div key={m.id} className="flex gap-3 border-l-2 border-slate-200 pl-3 py-1">
          <div>
            <p className="text-xs text-slate-500">{formatDateTime(m.criadoEm)}</p>
            <p className="text-sm">
              {m.colunaOrigem && <span className="text-slate-400">{m.colunaOrigem} → </span>}
              <span className="font-medium">{m.colunaDestino}</span>
            </p>
            {m.motivo && <p className="text-xs text-slate-500 italic">{m.motivo}</p>}
            {m.movidoPor && <p className="text-xs text-slate-400">por {m.movidoPor}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: BotaoIa e RespostaIa**

```typescript
// components/detalhe/BotaoIa.tsx

"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BotaoIaProps {
  licitacaoId: string;
  tipo: "triagem" | "analise" | "proposta" | "generico";
  label: string;
  onResult: (result: Record<string, unknown>) => void;
}

export function BotaoIa({ licitacaoId, tipo, label, onResult }: BotaoIaProps) {
  const mutation = useMutation({
    mutationFn: () =>
      fetch("/api/ia/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licitacaoId, tipo }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: (data) => {
      toast.success("Análise IA concluída!");
      onResult(data.respostaJson ?? { resposta: data.resposta });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="gap-1.5"
    >
      {mutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
      )}
      {label}
    </Button>
  );
}
```

```typescript
// components/detalhe/RespostaIa.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { AcaoIa } from "@/types/licitacao";

export function RespostaIa({ acao }: { acao: AcaoIa }) {
  const json = acao.respostaJson as Record<string, unknown> | null;

  return (
    <div className="rounded-lg border bg-blue-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-[10px]">
          {acao.tipo} · {acao.modelo}
        </Badge>
        <span className="text-[10px] text-slate-400">{formatDateTime(acao.criadoEm)}</span>
      </div>

      {json ? (
        <div className="space-y-2 text-sm">
          {json.relevancia && (
            <p><strong>Relevância:</strong> {json.relevancia as string}</p>
          )}
          {json.recomendacao && (
            <p><strong>Recomendação:</strong> {json.recomendacao as string}</p>
          )}
          {json.justificativa && (
            <p className="text-slate-600">{json.justificativa as string}</p>
          )}
          {json.resumo && (
            <p className="text-slate-600">{json.resumo as string}</p>
          )}
          {json.estrategia && (
            <p className="text-slate-600">{json.estrategia as string}</p>
          )}
          {Array.isArray(json.oportunidades) && json.oportunidades.length > 0 && (
            <div>
              <strong>Oportunidades:</strong>
              <ul className="ml-4 list-disc text-slate-600">
                {(json.oportunidades as string[]).map((o, i) => <li key={i}>{typeof o === "string" ? o : JSON.stringify(o)}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(json.riscos) && json.riscos.length > 0 && (
            <div>
              <strong>Riscos:</strong>
              <ul className="ml-4 list-disc text-slate-600">
                {(json.riscos as string[]).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(json.proximosPassos) && json.proximosPassos.length > 0 && (
            <div>
              <strong>Próximos passos:</strong>
              <ul className="ml-4 list-disc text-slate-600">
                {(json.proximosPassos as string[]).map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap text-slate-600">{acao.resposta}</p>
      )}

      {acao.status === "erro" && (
        <p className="text-sm text-red-600 mt-2">Erro: {acao.erro}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: LicitacaoDrawer — painel lateral principal**

```typescript
// components/detalhe/LicitacaoDrawer.tsx

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoEditavel } from "./CampoEditavel";
import { TimelineMovimentos } from "./TimelineMovimentos";
import { BotaoIa } from "./BotaoIa";
import { RespostaIa } from "./RespostaIa";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AcaoIa } from "@/types/licitacao";

interface LicitacaoDrawerProps {
  licitacaoId: string; // "nova" para criar
  onClose: () => void;
}

export function LicitacaoDrawer({ licitacaoId, onClose }: LicitacaoDrawerProps) {
  const queryClient = useQueryClient();
  const isNova = licitacaoId === "nova";

  // Estado para nova licitação
  const [novaForm, setNovaForm] = useState({
    titulo: "",
    orgao: "",
    objeto: "",
    modalidade: "",
    uf: "",
    valorEstimado: "",
    textoImportar: "",
  });
  const [modoImportar, setModoImportar] = useState(false);

  // Buscar detalhe
  const { data: licitacao } = useQuery({
    queryKey: ["licitacao", licitacaoId],
    queryFn: () => fetch(`/api/licitacoes/${licitacaoId}`).then((r) => r.json()),
    enabled: !isNova,
  });

  // Criar licitação manual
  const criarMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/licitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Licitação criada!");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Importar com IA
  const importarMutation = useMutation({
    mutationFn: (texto: string) =>
      fetch("/api/licitacoes/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Licitação importada com IA!");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Atualizar campo
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch(`/api/licitacoes/${licitacaoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacao", licitacaoId] });
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Atualizado!");
    },
  });

  // IA result handler
  function handleIaResult(_result: Record<string, unknown>) {
    queryClient.invalidateQueries({ queryKey: ["licitacao", licitacaoId] });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">
            {isNova ? "Nova Licitação" : licitacao?.titulo ?? "Carregando..."}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isNova ? (
            // ============ CRIAR NOVA ============
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={modoImportar ? "outline" : "default"}
                  onClick={() => setModoImportar(false)}
                >
                  Manual
                </Button>
                <Button
                  size="sm"
                  variant={modoImportar ? "default" : "outline"}
                  onClick={() => setModoImportar(true)}
                >
                  Importar com IA
                </Button>
              </div>

              {modoImportar ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">
                    Cole o texto do edital ou informações da licitação. A IA extrairá os dados automaticamente.
                  </p>
                  <textarea
                    className="w-full rounded border px-3 py-2 text-sm"
                    rows={12}
                    placeholder="Cole aqui o texto do edital, link, ou qualquer informação da licitação..."
                    value={novaForm.textoImportar}
                    onChange={(e) => setNovaForm({ ...novaForm, textoImportar: e.target.value })}
                  />
                  <Button
                    onClick={() => importarMutation.mutate(novaForm.textoImportar)}
                    disabled={!novaForm.textoImportar || importarMutation.isPending}
                    className="w-full"
                  >
                    {importarMutation.isPending ? "Extraindo com IA..." : "Importar com IA"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500">Título *</label>
                    <Input value={novaForm.titulo} onChange={(e) => setNovaForm({ ...novaForm, titulo: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Órgão</label>
                    <Input value={novaForm.orgao} onChange={(e) => setNovaForm({ ...novaForm, orgao: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Objeto</label>
                    <textarea
                      className="w-full rounded border px-3 py-2 text-sm"
                      rows={3}
                      value={novaForm.objeto}
                      onChange={(e) => setNovaForm({ ...novaForm, objeto: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500">Modalidade</label>
                      <Input value={novaForm.modalidade} onChange={(e) => setNovaForm({ ...novaForm, modalidade: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">UF</label>
                      <Input value={novaForm.uf} onChange={(e) => setNovaForm({ ...novaForm, uf: e.target.value })} maxLength={2} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Valor Estimado (R$)</label>
                    <Input type="number" value={novaForm.valorEstimado} onChange={(e) => setNovaForm({ ...novaForm, valorEstimado: e.target.value })} />
                  </div>
                  <Button
                    onClick={() => criarMutation.mutate({
                      titulo: novaForm.titulo,
                      orgao: novaForm.orgao || null,
                      objeto: novaForm.objeto || null,
                      modalidade: novaForm.modalidade || null,
                      uf: novaForm.uf || null,
                      valorEstimado: novaForm.valorEstimado ? Number(novaForm.valorEstimado) : null,
                    })}
                    disabled={!novaForm.titulo || criarMutation.isPending}
                    className="w-full"
                  >
                    Criar Licitação
                  </Button>
                </div>
              )}
            </div>
          ) : licitacao ? (
            // ============ DETALHE ============
            <div className="space-y-6">
              {/* Badges do card */}
              {licitacao.card && (
                <div className="flex flex-wrap gap-1.5">
                  <Badge style={{ backgroundColor: licitacao.card.coluna.cor }} className="text-white">
                    {licitacao.card.coluna.nome}
                  </Badge>
                  {licitacao.card.urgente && <Badge variant="destructive">Urgente</Badge>}
                </div>
              )}

              {/* Link externo */}
              {licitacao.linkOrigem && (
                <a
                  href={licitacao.linkOrigem}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir edital original
                </a>
              )}

              {/* Campos editáveis */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Dados da Licitação</h3>
                <CampoEditavel label="Título" valor={licitacao.titulo} onSave={(v) => updateMutation.mutate({ titulo: v })} />
                <CampoEditavel label="Órgão" valor={licitacao.orgao} onSave={(v) => updateMutation.mutate({ orgao: v })} />
                <CampoEditavel label="Objeto" valor={licitacao.objeto} onSave={(v) => updateMutation.mutate({ objeto: v })} multiline />
                <CampoEditavel label="Modalidade" valor={licitacao.modalidade} onSave={(v) => updateMutation.mutate({ modalidade: v })} />
                <div className="grid grid-cols-2 gap-4">
                  <CampoEditavel label="UF" valor={licitacao.uf} onSave={(v) => updateMutation.mutate({ uf: v })} />
                  <CampoEditavel label="Município" valor={licitacao.municipio} onSave={(v) => updateMutation.mutate({ municipio: v })} />
                </div>
                <CampoEditavel label="Observações" valor={licitacao.observacoes} onSave={(v) => updateMutation.mutate({ observacoes: v })} multiline />
              </section>

              {/* Ações de IA */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Assistente IA</h3>
                <div className="flex flex-wrap gap-2">
                  <BotaoIa licitacaoId={licitacaoId} tipo="triagem" label="Triagem" onResult={handleIaResult} />
                  <BotaoIa licitacaoId={licitacaoId} tipo="analise" label="Analisar" onResult={handleIaResult} />
                  <BotaoIa licitacaoId={licitacaoId} tipo="proposta" label="Sugerir Proposta" onResult={handleIaResult} />
                </div>
              </section>

              {/* Respostas da IA */}
              {licitacao.acoesIa && licitacao.acoesIa.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Resultados da IA</h3>
                  <div className="space-y-3">
                    {licitacao.acoesIa
                      .filter((a: AcaoIa) => a.status === "concluido")
                      .map((a: AcaoIa) => (
                        <RespostaIa key={a.id} acao={a} />
                      ))}
                  </div>
                </section>
              )}

              {/* Histórico */}
              {licitacao.movimentacoes && licitacao.movimentacoes.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Histórico</h3>
                  <TimelineMovimentos movimentacoes={licitacao.movimentacoes} />
                </section>
              )}

              {/* Dados extraídos pela IA */}
              {licitacao.dadosExtraidos && Object.keys(licitacao.dadosExtraidos).length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Dados Extraídos (IA)</h3>
                  <pre className="rounded bg-slate-50 p-3 text-xs overflow-x-auto">
                    {JSON.stringify(licitacao.dadosExtraidos, null, 2)}
                  </pre>
                </section>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Carregando...</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/detalhe/
git commit -m "feat(v2): add LicitacaoDrawer with inline editing, IA buttons, and timeline"
```

---

## Task 15: Página de Catálogo

**Files:**
- Create: `app/catalogo/page.tsx`
- Create: `components/catalogo/ProdutosList.tsx`
- Create: `components/catalogo/ProdutoForm.tsx`
- Create: `components/catalogo/ImportarCatalogoModal.tsx`

- [ ] **Step 1: Página**

```typescript
// app/catalogo/page.tsx

import { TopBar } from "@/components/layout/TopBar";
import { ProdutosList } from "@/components/catalogo/ProdutosList";

export default function CatalogoPage() {
  return (
    <>
      <TopBar title="Catálogo de Produtos e Serviços" />
      <div className="flex-1 overflow-auto p-6">
        <ProdutosList />
      </div>
    </>
  );
}
```

- [ ] **Step 2: ProdutoForm**

```typescript
// components/catalogo/ProdutoForm.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProdutoFormProps {
  onSave: (data: { nome: string; descricao: string; categoria: string; palavrasChave: string[] }) => void;
  onCancel: () => void;
}

export function ProdutoForm({ onSave, onCancel }: ProdutoFormProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [palavras, setPalavras] = useState("");

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-500">Nome *</label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Descrição</label>
        <textarea className="w-full rounded border px-3 py-2 text-sm" rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Categoria</label>
        <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Palavras-chave (separadas por vírgula)</label>
        <Input value={palavras} onChange={(e) => setPalavras(e.target.value)} placeholder="container, módulo, escritório" />
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave({ nome, descricao, categoria, palavrasChave: palavras.split(",").map((p) => p.trim()).filter(Boolean) })} disabled={!nome}>
          Salvar
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: ImportarCatalogoModal**

```typescript
// components/catalogo/ImportarCatalogoModal.tsx

"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImportarCatalogoModalProps {
  onClose: () => void;
}

export function ImportarCatalogoModal({ onClose }: ImportarCatalogoModalProps) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      fetch("/api/produtos/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success(`${data.importados} produtos importados!`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-2">Importar Catálogo com IA</h3>
        <p className="text-sm text-slate-500 mb-4">
          Cole o texto do seu catálogo, site, ou qualquer descrição dos seus produtos/serviços.
          A IA vai extrair e cadastrar automaticamente.
        </p>
        <textarea
          className="w-full rounded border px-3 py-2 text-sm"
          rows={10}
          placeholder="Cole aqui o texto do catálogo, lista de produtos, página do site..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!texto || mutation.isPending} className="gap-1.5">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {mutation.isPending ? "Extraindo..." : "Importar com IA"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: ProdutosList**

```typescript
// components/catalogo/ProdutosList.tsx

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Trash2 } from "lucide-react";
import { ProdutoForm } from "./ProdutoForm";
import { ImportarCatalogoModal } from "./ImportarCatalogoModal";
import { toast } from "sonner";

export function ProdutosList() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showImportar, setShowImportar] = useState(false);

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos"],
    queryFn: () => fetch("/api/produtos").then((r) => r.json()),
  });

  const criarMutation = useMutation({
    mutationFn: (data: { nome: string; descricao: string; categoria: string; palavrasChave: string[] }) =>
      fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto criado!");
      setShowForm(false);
    },
  });

  const deletarMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/produtos?id=${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto removido!");
    },
  });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Produto
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowImportar(true)} className="gap-1.5">
          <Upload className="h-4 w-4" /> Importar com IA
        </Button>
      </div>

      {showForm && (
        <div className="mb-6">
          <ProdutoForm onSave={(data) => criarMutation.mutate(data)} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="space-y-3">
        {produtos.map((p: { id: string; nome: string; descricao: string | null; categoria: string | null; palavrasChave: string[]; ativo: boolean }) => (
          <div key={p.id} className="flex items-start justify-between rounded-lg border bg-white p-4">
            <div>
              <h3 className="font-medium">{p.nome}</h3>
              {p.descricao && <p className="text-sm text-slate-500 mt-0.5">{p.descricao}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                {p.categoria && <Badge variant="outline">{p.categoria}</Badge>}
                {p.palavrasChave.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-[10px]">{kw}</Badge>
                ))}
              </div>
            </div>
            <button
              onClick={() => { if (confirm("Remover este produto?")) deletarMutation.mutate(p.id); }}
              className="text-slate-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {produtos.length === 0 && !showForm && (
          <p className="text-center text-slate-400 py-8">
            Nenhum produto cadastrado. Adicione seus produtos ou importe com IA.
          </p>
        )}
      </div>

      {showImportar && <ImportarCatalogoModal onClose={() => setShowImportar(false)} />}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/catalogo/ components/catalogo/
git commit -m "feat(v2): add catalog page with manual CRUD and AI import"
```

---

## Task 16: Página de Configurações

**Files:**
- Create: `app/configuracoes/page.tsx`
- Create: `components/configuracoes/EmpresaForm.tsx`
- Create: `components/configuracoes/ColunasEditor.tsx`
- Create: `components/configuracoes/UsuariosTab.tsx` (reaproveitar lógica)

- [ ] **Step 1: Página de configurações com abas**

```typescript
// app/configuracoes/page.tsx

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { EmpresaForm } from "@/components/configuracoes/EmpresaForm";
import { ColunasEditor } from "@/components/configuracoes/ColunasEditor";
import { UsuariosTab } from "@/components/configuracoes/UsuariosTab";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "empresa", label: "Empresa" },
  { id: "colunas", label: "Colunas do Kanban" },
  { id: "usuarios", label: "Usuários" },
];

export default function ConfiguracoesPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") ?? "empresa");

  return (
    <>
      <TopBar title="Configurações" />
      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "empresa" && <EmpresaForm />}
        {tab === "colunas" && <ColunasEditor />}
        {tab === "usuarios" && <UsuariosTab />}
      </div>
    </>
  );
}
```

- [ ] **Step 2: EmpresaForm**

```typescript
// components/configuracoes/EmpresaForm.tsx

"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function EmpresaForm() {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [segmento, setSegmento] = useState("");

  const { data: empresa } = useQuery({
    queryKey: ["empresa"],
    queryFn: () => fetch("/api/empresa").then((r) => r.json()),
  });

  useEffect(() => {
    if (empresa) {
      setNome(empresa.nome ?? "");
      setDescricao(empresa.descricao ?? "");
      setSegmento(empresa.segmento ?? "");
    }
  }, [empresa]);

  const mutation = useMutation({
    mutationFn: () =>
      fetch("/api/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao, segmento }),
      }).then((r) => r.json()),
    onSuccess: () => toast.success("Empresa atualizada!"),
  });

  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-slate-500">
        Essas informações são usadas pela IA para analisar licitações em relação ao seu negócio.
      </p>
      <div>
        <label className="text-xs font-medium text-slate-500">Nome da Empresa</label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Descrição</label>
        <textarea className="w-full rounded border px-3 py-2 text-sm" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que sua empresa faz, quais serviços oferece..." />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Segmento</label>
        <Input value={segmento} onChange={(e) => setSegmento(e.target.value)} placeholder="Ex: Construção civil, TI, Saúde..." />
      </div>
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        Salvar
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: ColunasEditor**

```typescript
// components/configuracoes/ColunasEditor.tsx

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import type { KanbanColuna } from "@/types/licitacao";

export function ColunasEditor() {
  const queryClient = useQueryClient();
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState("#3B82F6");
  const [novoTipo, setNovoTipo] = useState("normal");

  const { data: colunas = [] } = useQuery<KanbanColuna[]>({
    queryKey: ["colunas-todas"],
    queryFn: () => fetch("/api/colunas").then((r) => r.json()),
  });

  const criarMutation = useMutation({
    mutationFn: () =>
      fetch("/api/colunas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome, cor: novaCor, tipo: novoTipo }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colunas-todas"] });
      queryClient.invalidateQueries({ queryKey: ["colunas"] });
      setNovoNome("");
      toast.success("Coluna criada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editarMutation = useMutation({
    mutationFn: (data: Partial<KanbanColuna> & { id: string }) =>
      fetch("/api/colunas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colunas-todas"] });
      queryClient.invalidateQueries({ queryKey: ["colunas"] });
      toast.success("Coluna atualizada!");
    },
  });

  const tipoLabels: Record<string, string> = {
    inicial: "Inicial (entrada)",
    normal: "Normal",
    final_positivo: "Final (positivo)",
    final_negativo: "Final (negativo)",
  };

  return (
    <div className="max-w-lg">
      <p className="text-sm text-slate-500 mb-4">
        Configure as colunas do seu Kanban. Colunas &quot;Inicial&quot; recebem novas licitações.
        Colunas &quot;Final negativo&quot; pedem motivo ao mover.
      </p>

      <div className="space-y-2 mb-6">
        {colunas.map((col) => (
          <div key={col.id} className="flex items-center gap-3 rounded border bg-white p-3">
            <GripVertical className="h-4 w-4 text-slate-300" />
            <div className="h-4 w-4 rounded" style={{ backgroundColor: col.cor }} />
            <input
              className="flex-1 text-sm font-medium border-none bg-transparent outline-none"
              defaultValue={col.nome}
              onBlur={(e) => {
                if (e.target.value !== col.nome) editarMutation.mutate({ id: col.id, nome: e.target.value });
              }}
            />
            <span className="text-xs text-slate-400">{tipoLabels[col.tipo] ?? col.tipo}</span>
            <input
              type="color"
              className="h-6 w-6 cursor-pointer border-none"
              defaultValue={col.cor}
              onChange={(e) => editarMutation.mutate({ id: col.id, cor: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-slate-50 p-4">
        <h4 className="text-sm font-medium mb-3">Adicionar Coluna</h4>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input placeholder="Nome da coluna" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
          </div>
          <input type="color" className="h-9 w-9 cursor-pointer" value={novaCor} onChange={(e) => setNovaCor(e.target.value)} />
          <select className="rounded border px-2 py-2 text-sm" value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)}>
            <option value="inicial">Inicial</option>
            <option value="normal">Normal</option>
            <option value="final_positivo">Final +</option>
            <option value="final_negativo">Final -</option>
          </select>
          <Button size="sm" onClick={() => criarMutation.mutate()} disabled={!novoNome}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: UsuariosTab (simplificado do existente)**

```typescript
// components/configuracoes/UsuariosTab.tsx

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function UsuariosTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState("user");

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => fetch("/api/admin/usuarios").then((r) => r.json()),
  });

  const criarMutation = useMutation({
    mutationFn: () =>
      fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome, email, senha, role }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário criado!");
      setShowForm(false);
      setNome(""); setEmail(""); setSenha(""); setRole("user");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (data: { id: string; ativo: boolean }) =>
      fetch(`/api/admin/usuarios/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: data.ativo }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Atualizado!");
    },
  });

  return (
    <div className="max-w-lg">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="mb-4">
        {showForm ? "Cancelar" : "Novo Usuário"}
      </Button>

      {showForm && (
        <div className="mb-6 rounded-lg border bg-white p-4 space-y-3">
          <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          <select className="w-full rounded border px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">Usuário</option>
            <option value="admin">Admin</option>
          </select>
          <Button onClick={() => criarMutation.mutate()} disabled={!nome || !email || !senha}>Criar</Button>
        </div>
      )}

      <div className="space-y-2">
        {usuarios.map((u: { id: string; name: string | null; email: string; role: string; ativo: boolean }) => (
          <div key={u.id} className="flex items-center justify-between rounded border bg-white p-3">
            <div>
              <span className="font-medium text-sm">{u.name ?? u.email}</span>
              <span className="text-xs text-slate-400 ml-2">{u.email}</span>
              <Badge variant="outline" className="ml-2 text-[10px]">{u.role}</Badge>
            </div>
            <Button
              size="sm"
              variant={u.ativo ? "outline" : "destructive"}
              onClick={() => toggleMutation.mutate({ id: u.id, ativo: !u.ativo })}
            >
              {u.ativo ? "Desativar" : "Ativar"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/configuracoes/ components/configuracoes/
git commit -m "feat(v2): add settings page — empresa, colunas editor, usuarios"
```

---

## Task 17: Testes básicos

**Files:**
- Create: `__tests__/api/empresa.test.ts`
- Create: `__tests__/api/produtos.test.ts`
- Create: `__tests__/api/licitacoes.test.ts`
- Create: `__tests__/api/kanban-mover.test.ts`

- [ ] **Step 1: Teste da API de empresa**

```typescript
// __tests__/api/empresa.test.ts

import { describe, it, expect, jest } from "@jest/globals";

jest.unstable_mockModule("@/auth", () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: "u1", role: "admin" } })),
}));

jest.unstable_mockModule("@/lib/db", () => ({
  db: {
    empresa: {
      findUnique: jest.fn(() => Promise.resolve({ id: "default", nome: "Test", descricao: null, segmento: null })),
      upsert: jest.fn((args: { update: { nome: string } }) => Promise.resolve({ id: "default", ...args.update })),
    },
  },
}));

const { GET, PUT } = await import("@/app/api/empresa/route");

describe("GET /api/empresa", () => {
  it("returns the empresa", async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.nome).toBe("Test");
  });
});

describe("PUT /api/empresa", () => {
  it("updates the empresa", async () => {
    const req = new Request("http://localhost/api/empresa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Nova", descricao: "Desc", segmento: "TI" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Teste da API de produtos**

```typescript
// __tests__/api/produtos.test.ts

import { describe, it, expect, jest } from "@jest/globals";

jest.unstable_mockModule("@/auth", () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: "u1", role: "user" } })),
}));

jest.unstable_mockModule("@/lib/db", () => ({
  db: {
    produto: {
      findMany: jest.fn(() => Promise.resolve([{ id: "p1", nome: "Container", descricao: null, categoria: null, palavrasChave: [], ativo: true }])),
      create: jest.fn((args: { data: { nome: string } }) => Promise.resolve({ id: "p2", ...args.data, ativo: true })),
      delete: jest.fn(() => Promise.resolve({ id: "p1" })),
    },
  },
}));

const { GET, POST } = await import("@/app/api/produtos/route");

describe("GET /api/produtos", () => {
  it("returns products list", async () => {
    const res = await GET();
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].nome).toBe("Container");
  });
});

describe("POST /api/produtos", () => {
  it("creates a product", async () => {
    const req = new Request("http://localhost/api/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Módulo", descricao: "desc", categoria: "cat" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("rejects without nome", async () => {
    const req = new Request("http://localhost/api/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricao: "desc" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Teste do mover kanban**

```typescript
// __tests__/api/kanban-mover.test.ts

import { describe, it, expect, jest } from "@jest/globals";

jest.unstable_mockModule("@/auth", () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: "u1", name: "Admin", role: "admin" } })),
}));

const mockTransaction = jest.fn(() => Promise.resolve([{ id: "c1", colunaId: "col2" }]));

jest.unstable_mockModule("@/lib/db", () => ({
  db: {
    kanbanCard: {
      findUnique: jest.fn(() => Promise.resolve({ id: "c1", licitacaoId: "l1", colunaId: "col1", coluna: { id: "col1", nome: "Captadas", tipo: "inicial" } })),
      update: jest.fn(() => Promise.resolve({ id: "c1" })),
    },
    kanbanColuna: {
      findUnique: jest.fn(() => Promise.resolve({ id: "col2", nome: "Triagem", tipo: "normal" })),
    },
    movimentacao: {
      create: jest.fn(() => Promise.resolve({ id: "m1" })),
    },
    $transaction: mockTransaction,
  },
}));

const { POST } = await import("@/app/api/kanban/mover/route");

describe("POST /api/kanban/mover", () => {
  it("moves a card", async () => {
    const req = new Request("http://localhost/api/kanban/mover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: "c1", colunaDestinoId: "col2" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("rejects without required fields", async () => {
    const req = new Request("http://localhost/api/kanban/mover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 4: Rodar testes**

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add __tests__/
git commit -m "test(v2): add API tests for empresa, produtos, and kanban move"
```

---

## Task 18: Verificação final e cleanup

**Files:**
- Verify: all routes and components

- [ ] **Step 1: Verificar build**

```bash
npx next build
```

- [ ] **Step 2: Corrigir erros de build (se houver)**

Resolver quaisquer erros de TypeScript ou importação.

- [ ] **Step 3: Verificar testes passam**

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest --no-coverage
```

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore(v2): fix build and cleanup"
```

- [ ] **Step 5: Push e criar PR**

```bash
git push -u origin feature/v2-simplificado
gh pr create --title "feat: KanbanLicita v2 — simplified rewrite" --body "## Summary
- Complete rewrite with simplified data model (8 tables vs 19)
- Kanban board with customizable columns
- Drawer-based detail view (no more 9 tabs)
- AI assistance in all phases: extraction, analysis, proposal
- Product catalog with manual + AI import
- Configurable for any company/business

## What changed
- Prisma schema: 60+ fields → ~15 per table
- UI: 9 tabs detail page → clean sidebar drawer
- Scoring: removed 6-component scoring → AI recommendation
- Navigation: 4 items → 3 items
- Columns: hardcoded enum → database-driven customizable"
```

---

## Resumo de Comparação v1 → v2

| Aspecto | v1 (atual) | v2 (novo) |
|---------|-----------|-----------|
| Tabelas Prisma | 19 | 8 |
| Campos na Licitação | 60+ | ~15 |
| Abas no detalhe | 9 | 0 (drawer único) |
| Scoring | 6 componentes + pesos | IA dá recomendação |
| Colunas Kanban | Enum fixo (9) | Dinâmicas (customizáveis) |
| Cadastro empresa | Hardcoded Multiteiner | Configurável |
| Entrada de licitação | Só banco | Manual + colar texto + IA |
| Catálogo produtos | Não existe | Manual + importação IA |
| IA | Só análise genérica | Triagem + Análise + Proposta |
| Nav items | 4 | 3 |
| Complexidade | Alta | Baixa |
