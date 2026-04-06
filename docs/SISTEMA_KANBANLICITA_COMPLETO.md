# KanbanLicita — Referência completa do sistema

Documento único com **telas**, **APIs**, **regras de negócio**, **dados** e **configuração**.  
Versão alinhada ao código (Next.js App Router, Prisma, NextAuth v5).  
Para credenciais de servidor e deploy, use `HANDOFF.md` e `.env` (não commitados).

---

## 1. Visão geral

**KanbanLicita** é um sistema web para **acompanhar licitações públicas** em um **quadro Kanban**, enriquecendo cada oportunidade com:

- Dados cadastrais (órgão, objeto, modalidade, UF, valores, etc.)
- **Captação automática** a partir da **API pública de consultas do PNCP** (gov.br) ou de uma **fonte mock** (testes)
- **Análise manual** (formulários), **score** ponderado, **parecer executivo**, **sinais**, **documentos**, **itens/lotes**
- **Análise por IA** (LLM configurável via env), com registro assíncrono em banco
- **Métricas** do pipeline e **movimentação** de cards com **regras de governança** (motivo obrigatório, bloqueio por falso negativo, pré-requisitos para “Viável comercialmente”)

**Papéis:**

- **`user`**: usa Kanban, lista, detalhe, move cards (dentro das regras), edita perfil.
- **`admin`**: tudo acima + **Importar** (PNCP), **Configurações** (usuários, fontes, score, listas de parecer), APIs administrativas de fontes e usuários.

---

## 2. Stack (resumo)

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 (App Router, Turbopack em dev) |
| Linguagem | TypeScript |
| Banco | PostgreSQL + Prisma 7 (client em `lib/generated/prisma`) |
| Auth | NextAuth v5, Credentials, sessão JWT |
| UI | React 19, Tailwind CSS 4, Lucide, Sonner, @dnd-kit |
| Estado cliente | TanStack Query |
| IA | Factory `lib/llm` (Anthropic / OpenAI conforme env) |

**Proteção de rotas:** `proxy.ts` (middleware Next) chama `getProxyRedirect`: usuário não autenticado é redirecionado para `/login`, exceto paths públicos; logado em `/login` vai para `/kanban`.  
**Importante:** `getProxyRedirect` retorna `null` para qualquer path que comece com `/api/` — ou seja, **as rotas de API não são protegidas pelo proxy**; a segurança depende de cada handler chamar `auth()` (muitas rotas admin e `/api/me` fazem isso; outras não — ver §5).  
**API `/api/auth/*`** está excluída do matcher do proxy.

---

## 3. Mapa de navegação (menu lateral)

| Rota | Nome no menu | Quem acessa |
|------|----------------|-------------|
| `/kanban` | Kanban | Autenticado |
| `/licitacoes` | Licitações | Autenticado |
| `/importar` | Importar do PNCP | **Admin** (conteúdo útil); não-admin vê mensagem e link ao Kanban |
| `/configuracoes` | Configurações | Autenticado (abas extras só admin) |

**Redirecionamentos:**

- `/` → `/login` se sem sessão; com sessão → `/kanban`
- `/fontes` → `/importar` (legado)

---

## 4. Telas (páginas)

### 4.1 `/login`

- Formulário email + senha (campo `senha` no Credentials).
- NextAuth `signIn` → JWT com `id` e `role` no token/sessão.

### 4.2 `/kanban`

- Lista **apenas licitações que possuem `KanbanCard`** (join implícito).
- Colunas = enum `KanbanColuna` (ver §6.1).
- Drag-and-drop para mover card → `POST /api/kanban/mover`.
- Admin com lista vazia pode ver atalho para importação (`mostrarAtalhoImportacao`).

### 4.3 `/licitacoes`

- Lista **todas** as licitações (com ou sem card), com coluna Kanban (se houver), urgência, score/faixa e link para o detalhe.
- Acesso ao detalhe: `/licitacoes/[id]`.

### 4.4 `/licitacoes/[id]` — Detalhe da licitação

**Query `?tab=`** — abas válidas:

| Tab | Componente | Conteúdo (conceitual) |
|-----|--------------|----------------------|
| `resumo` | `ResumoTab` | Dados principais da licitação |
| `documentos` | `DocumentosTab` | Checklist documental |
| `itens` | `ItensTab` | Itens / lotes |
| `analise` | `AnaliseForm` | Análise manual consolidada |
| `historico` | `HistoricoTab` | Movimentações do Kanban |
| `ia` | `IaTab` | Disparo/consulta análise IA |
| `sinais` | `SinaisTab` | Sinais extraídos |
| `score` | `ScoreTab` | Score, faixa, valor capturável, falso negativo |
| `parecer` | `ParecerTab` | Parecer executivo |

Carrega `ConfiguracaoSistema` (pesos, faixas, listas do parecer) para cálculo/sugestões na tela.

### 4.5 `/importar` — Somente admin (fluxo PNCP)

- Lista fontes PNCP; pode **garantir fonte PNCP** via `POST /api/admin/fontes/ensure-pncp`.
- **Filtros** espelhados com Configurações → mesmos campos `PncpFonteFiltrosFields` (UF, janela, máx. páginas, modalidade, palavras no objeto, etc.).
- **Passo 1 — Buscar:** `GET /api/admin/fontes/[id]/probe` (opcional `?loteCompleto=1` para escanear todas as páginas como no import).
- **Passo 2 — Trazer:** `POST /api/admin/fontes/[id]/sync` → `runFonteSync`.
- Links para **Configurações → Dados e regras → Origem** (`?tab=sistema&painel=origem`).

### 4.6 `/configuracoes`

Query `?tab=perfil|usuarios|sistema`. Usuário **não admin** que tentar `usuarios` ou `sistema` é **forçado para `perfil`** (`resolveConfiguracoesTab`).

**Abas:**

| Tab | Público | Conteúdo |
|-----|---------|----------|
| `perfil` | Todos | Nome, email; alteração de senha via fluxo existente |
| `usuarios` | **Admin** | CRUD/listagem de usuários (API admin) |
| `sistema` | **Admin** | Ver §5 — painéis internos |

**Painéis em “Dados e regras” (`?painel=`):**

| Painel | Conteúdo |
|--------|----------|
| `origem` | Fontes (PNCP/mock), filtros salvos na fonte, histórico de execuções, sync manual mock, link para Importar |
| `notas` | Pesos do score (soma 100), faixas A+/A/B/C/D, segmentos de mercado |
| `parecer` | Listas de sugestões (onde está oportunidade, soluções, próximos passos, riscos, evidências) |
| `servidor` | Texto de referência das variáveis de ambiente PNCP (somente leitura) |

**Salvar** score/faixas/segmentos/listas: `PUT /api/configuracoes/sistema` (não altera fontes).

---

## 5. APIs HTTP

### 5.1 Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| * | `/api/auth/[...nextauth]` | NextAuth (signin, session, etc.) |

### 5.2 Usuário atual e perfil

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/me` | Sim | Dados do usuário logado |
| PUT | `/api/me` | Sim | Atualiza nome e/ou senha (hash bcrypt) |

### 5.3 Kanban

| Método | Rota | Auth (código) | Descrição |
|--------|------|---------------|-----------|
| POST | `/api/kanban/mover` | *Não verifica sessão no handler* | Move card; valida regras `validateMove` (§6.2) |
| GET | `/api/kanban/metricas` | *Não verifica* | Métricas agregadas do pipeline |
| PATCH | `/api/kanban/cards/[id]` | **Sim** (401 se sem sessão) | Atualiza `responsavelId`; responsável deve ser usuário **ativo** |

> **Nota de segurança:** rotas sem `auth()` podem ser chamadas diretamente se a URL da API for conhecida (§2). Endurecer com middleware ou `auth()` nas rotas sensíveis.

### 5.4 Licitações

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/licitacoes` | *Não verifica* | Lista licitações com card e score |
| PUT | `/api/licitacoes/[id]/analise` | *Não verifica* | Upsert `LicitacaoAnalise` (campos espelhados no body, menos metadados) |
| PUT | `/api/licitacoes/[id]/score` | *Não verifica* | Upsert `LicitacaoScore` |
| PUT | `/api/licitacoes/[id]/parecer` | *Não verifica* | Upsert `LicitacaoParece` |
| GET | `/api/licitacoes/[id]/analise-ia` | *Não verifica* | Última análise IA da licitação |
| POST | `/api/licitacoes/[id]/analise-ia` | *Não verifica* | Inicia análise IA (**202** + processamento assíncrono) |

Leitura de análise/score/parecer na UI vem do **Server Component** em `/licitacoes/[id]` (Prisma), não dessas rotas GET.

### 5.5 Admin — fontes de captação

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET/POST | `/api/admin/fontes` | Admin | Lista / cria fonte |
| GET | `/api/admin/fontes/[id]` | Admin | Últimas **20** execuções da fonte (mesmo payload que `/execucoes`) |
| PATCH | `/api/admin/fontes/[id]` | Admin | Atualiza nome, tipo, endpoint, ativo, `configuracao` |
| POST | `/api/admin/fontes/[id]/sync` | Admin | Executa `runFonteSync` → retorno `SyncResult` (§6.3) |
| GET | `/api/admin/fontes/[id]/execucoes` | Admin | Últimas 20 execuções (duplicado funcionalmente ao GET `[id]`) |
| GET | `/api/admin/fontes/[id]/probe` | Admin | Pré-visualização PNCP (`?loteCompleto=1` para varrer páginas como no import) |
| POST | `/api/admin/fontes/ensure-pncp` | Admin | Garante fonte PNCP padrão |

### 5.6 Admin — usuários

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET/POST | `/api/admin/usuarios` | Admin | Lista / cria usuário (`role` ∈ `user` \| `admin`, senha com bcrypt) |
| PATCH | `/api/admin/usuarios/[id]` | Admin | Altera nome, role, ativo, senha; **admin não pode desativar a si mesmo** |

### 5.7 Configuração global

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET/PUT | `/api/configuracoes/sistema` | Admin | Lê/atualiza `ConfiguracaoSistema` (pesos, faixas, segmentos, listasParecerTab) |

### 5.8 Outros

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/usuarios-ativos` | Usuários ativos (ex.: select de responsável) |

---

## 6. Regras de negócio principais

### 6.1 Colunas do Kanban (ordem do fluxo)

1. `captadas_automaticamente`
2. `triagem_inicial`
3. `em_analise`
4. `viavel_comercialmente`
5. `proposta_documentacao`
6. `enviadas_participando`
7. `ganhamos`
8. `perdemos`
9. `descartadas`

Labels amigáveis em `KANBAN_COLUNA_LABELS` (`lib/kanban.ts`).

### 6.2 Validação de movimento (`validateMove`)

- **Coluna destino** deve ser uma das colunas canônicas; senão `COLUNA_INVALIDA`.
- **Descarte com falso negativo alto:** se destino é `descartadas` e `falsoNegativoNivelRisco === 'alto'` → `FALSO_NEGATIVO_BLOQUEIO`.
- **Motivo obrigatório** para `descartadas` e `perdemos` → `MOTIVO_OBRIGATORIO`.
- **De `em_analise` → `viavel_comercialmente`** exige:
  - Score calculado (`SCORE_OBRIGATORIO`)
  - Classificação preenchida (`CLASSIFICACAO_OBRIGATORIA`)
  - **Valor capturável** considerado preenchido (`VALOR_CAPTURAVEL_OBRIGATORIO`) quando:
    - existe **justificativa** não vazia (`valorCapturavelJustificativa`), **e**
    - se `valorCapturavelFoiPossivelEstimar` for verdadeiro, há **base numérica** (estimativa **ou** faixa min/max); se for falso, a justificativa sozinha basta.

### 6.3 Captação PNCP (`lib/captacao/*`)

- **Fonte** `CaptacaoFonte`: tipo `pncp` ou `mock`; `configuracao` JSON (modo consulta, datas, modalidade, UF, `palavrasChaveObjeto`, `maxPaginas`, etc. — ver `mergePncpConfigDefaults`).
- **Fetch:** URLs em `pncp-source.ts` (atualização / publicação / proposta); **retentativas** e **timeouts** via env (§8).
- **Triagem por texto:** se houver palavras-chave no objeto, só entram registros que passam `filtrarRegistrosTriagemObjeto` (texto agregado inclui vários campos PNCP).
- **Normalização** (`normalizePayloadBruto`): mapeia payload PNCP → campos `Licitacao` (órgão, número, objeto, datas, modalidade, UF, município, valor, link, etc.).
- **Deduplicação:** alias por `fonteId` + `idExternoOrigem` (ex.: `numeroControlePNCP`); fallback hash de conteúdo; fallback orgão+número+data.
- **Processamento:** novo registro cria `Licitacao` + `KanbanCard` na coluna `captadas_automaticamente`; existente atualiza dados da licitação.
- **Resposta de sync (`SyncResult`):** `execucaoId`, `status` `concluido` \| `erro`, `totalLidos`, `totalNovos`, `totalAtualizados`, `totalErros`; em erro, `error` com mensagem (API sync devolve HTTP 500 nesse caso).

### 6.4 Score (`lib/score/calculator.ts`)

- Combina níveis da **análise manual** e, quando existir, resultado estruturado da **IA**.
- Pesos configuráveis (`ConfigPesos`) devem somar **100** na UI de configuração para salvar.
- **Faixas** `aPlus`, `a`, `b`, `c` definem letras A+, A, B, C; abaixo de `c` → D.

### 6.5 Análise IA

- `POST` cria registro `LicitacaoAnaliseIa` com status `EM_PROCESSAMENTO` e dispara `processAnalise` em background.
- Provider: `getLlmProvider()` — Anthropic ou OpenAI conforme `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` (ver `.env.example`).
- Resultado JSON gravado em `resultadoJson`; usado para enriquecer score/fluxos conforme rotas de score.

### 6.6 Tailwind e pasta `docs/`

- Em `app/globals.css`, `@source not "../docs"` impede que arquivos Markdown em `docs/` sejam escaneados como classes Tailwind (evita CSS inválido gerado a partir de exemplos em planos/specs).

---

## 7. Modelo de dados (Prisma) — resumo

- **Licitacao:** núcleo com dezenas de campos de negócio + flags de estrutura/natureza.
- **KanbanCard:** 1:1 com licitação; `colunaAtual`, `ordemColuna`, `responsavelId`, `urgente`, `bloqueado`.
- **KanbanMovimentacao:** histórico de mudanças de coluna.
- **LicitacaoScore:** pontuação, faixa, valor capturável, falso negativo, justificativas.
- **LicitacaoDocumento**, **LicitacaoItem**, **LicitacaoAnalise**, **LicitacaoParece**, **LicitacaoSinal**, **LicitacaoAnaliseIa:** satélites 1:1 ou 1:N conforme schema.
- **CaptacaoFonte**, **CaptacaoExecucao**, **CaptacaoPayload**, **LicitacaoAliasOrigem:** pipeline de importação.
- **ConfiguracaoSistema:** registro singleton `id: default` com JSON de pesos, faixas, segmentos, listas.
- **User**, **Account**, **Session**, **VerificationToken:** NextAuth (sessão JWT reduz uso de Session no app).

Tabelas físicas mapeadas com `@@map("...")` em português onde aplicável.

---

## 8. Variáveis de ambiente (referência)

Ver **`.env.example`** na raiz. Principais grupos:

| Grupo | Variáveis |
|-------|-----------|
| Core | `DATABASE_URL`, `AUTH_SECRET` |
| LLM | `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` |
| PNCP (opcional) | `PNCP_CONSULTA_BASE_URL`, `PNCP_FETCH_TIMEOUT_MS_PROBE`, `PNCP_FETCH_TIMEOUT_MS_PAGE`, `PNCP_INTER_PAGE_DELAY_MS`, `PNCP_FETCH_RETRY_MAX`, `PNCP_FETCH_RETRY_BASE_MS` |

Descrições amigáveis também na UI em **Configurações → Servidor** (`lib/config/parametros-servidor-doc.ts`).

---

## 9. Testes e scripts

- **Jest:** `npm test` — testes em `__tests__/` (ex.: `pncp-source`, `captacao-normalize`, APIs).
- **Script:** `npm run fonte:pncp` — `scripts/ensure-fonte-pncp.ts` (garantir fonte PNCP via CLI).

---

## 10. Documentos relacionados

- `HANDOFF.md` — continuidade, DB remoto, credenciais de exemplo (não repetir aqui em produção).
- `docs/documentacao_final_sistema_licitacoes_multiteiner.md` — documento funcional longo do produto Multiteiner (pode divergir em detalhes da implementação atual; este arquivo prioriza o **código**).
- Planos em `docs/superpowers/` — **não** entram no scan Tailwind por `@source not`.

---

*Gerado como referência estática; ao alterar rotas ou regras, atualize este arquivo ou trate-o como snapshot.*
