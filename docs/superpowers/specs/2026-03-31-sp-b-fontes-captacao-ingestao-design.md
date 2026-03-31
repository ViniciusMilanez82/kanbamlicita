# SP-B: Fontes de Captação + Ingestão/Normalização/Dedup

**Data**: 2026-03-31
**Sub-projeto**: SP-B (segundo de 8)
**Escopo**: Módulo de fontes plugáveis, conectores PNCP + genérico (RSS/scraping), pipeline de ingestão com dedup, execuções agendáveis, tela admin

---

## Contexto

O sistema atual tem integração manual com PNCP: o usuário busca contratos em `/pncp` e importa individualmente. A Fase 2 exige captação automática de pelo menos uma fonte real (PNCP) com suporte estrutural para segunda fonte configurável, normalização, deduplicação e roteamento automático para o Kanban.

**Decisões tomadas:**
- PNCP real + conector genérico RSS/scraping para segunda fonte
- Rota API chamável por cron externo + botão "Executar agora" na UI
- Deduplicação por `identificadorExterno`: ignorar duplicatas, atualizar campos se mudaram

---

## 1. Modelagem do Banco

### 1.1 Enum `TipoFonte`
Valores: `pncp`, `rss`, `scraping`, `api_generica`

### 1.2 Enum `StatusExecucao`
Valores: `executando`, `concluida`, `erro`, `cancelada`

### 1.3 Enum `StatusItem`
Valores: `criado`, `atualizado`, `duplicado`, `descartado`, `erro`

### 1.4 Nova tabela: `FonteCaptacao`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | CUID | PK | Identificador |
| nome | String | Sim | Nome descritivo da fonte |
| tipo | TipoFonte | Sim | Tipo de conector |
| ativo | Boolean | Sim (default true) | Soft delete |
| parametros | Json | Sim (default {}) | Config do conector (tamanhoPagina, URL, seletores) |
| credenciais | Json? | Não | API keys, auth tokens |
| filtros | Json? | Não | Palavras-chave, UFs, modalidades para busca |
| periodicidade | String? | Não | Intervalo ("6h", "12h", "24h") ou "manual" |
| ultimaSincronizacao | DateTime? | Não | Última execução bem-sucedida |
| criadoEm | DateTime | Auto | Criação |
| atualizadoEm | DateTime | Auto | Atualização |

Relações: `execucoes` (1-N ExecucaoCaptacao), `licitacoes` (1-N Licitacao)

### 1.5 Nova tabela: `ExecucaoCaptacao`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | CUID | PK | Identificador |
| fonteId | String | Sim | FK → FonteCaptacao |
| status | StatusExecucao | Sim | Estado da execução |
| iniciadaEm | DateTime | Sim (default now) | Início |
| finalizadaEm | DateTime? | Não | Fim |
| totalCaptados | Int | Sim (default 0) | Itens encontrados |
| totalCriados | Int | Sim (default 0) | Licitações novas |
| totalAtualizados | Int | Sim (default 0) | Licitações atualizadas |
| totalDuplicados | Int | Sim (default 0) | Sem mudanças |
| totalDescartados | Int | Sim (default 0) | Descartados por regra |
| totalErros | Int | Sim (default 0) | Erros |
| erro | String? | Não | Mensagem de erro geral |
| log | Json? | Não | Log detalhado |
| disparadoPor | String? | Não | "cron", "manual", userId |

Relações: `fonte` (N-1 FonteCaptacao), `itens` (1-N ItemCaptado)

### 1.6 Nova tabela: `ItemCaptado`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | CUID | PK | Identificador |
| execucaoId | String | Sim | FK → ExecucaoCaptacao |
| identificadorExterno | String | Sim | ID único na fonte |
| dadosBrutos | Json | Sim | Payload original |
| status | StatusItem | Sim | Resultado do processamento |
| licitacaoId | String? | Não | FK → Licitacao (se criou/atualizou) |
| motivo | String? | Não | Razão de descarte/erro |
| criadoEm | DateTime | Auto | Criação |

Relações: `execucao` (N-1 ExecucaoCaptacao), `licitacao` (N-1 Licitacao, opcional)

### 1.7 Alterações em `Licitacao`

Novos campos:
- `fonteId` (String?, FK → FonteCaptacao) — de qual fonte veio
- `identificadorExterno` (String?, @unique) — ID externo para deduplicação

Relações adicionais: `fonte` (N-1 FonteCaptacao, opcional), `itensCaptados` (1-N ItemCaptado)

---

## 2. Conectores

### 2.1 Interface comum

```typescript
interface ResultadoConector {
  identificadorExterno: string;
  dados: {
    titulo: string;
    orgao?: string;
    objeto?: string;
    modalidade?: string;
    uf?: string;
    municipio?: string;
    valorEstimado?: number;
    dataPublicacao?: string;
    dataSessao?: string;
    linkOrigem?: string;
  };
  dadosBrutos: Record<string, unknown>;
}

interface Conector {
  buscar(fonte: FonteCaptacao): AsyncGenerator<ResultadoConector[]>;
}
```

### 2.2 ConectorPncp

Reutiliza `lib/pncp/client.ts` e `lib/pncp/normalize.ts` existentes.

- Lê `fonte.filtros.palavrasChave` e `fonte.filtros.ufs`
- Lê `fonte.parametros.tamanhoPagina` (default 50) e `fonte.parametros.paginasMaximas` (default 3)
- Itera pelas páginas usando `buscarContratosPncp()`
- Normaliza com `searchItemToListaItem()`
- Gera `identificadorExterno` = `pncp:{numeroControlePNCP}`
- Yield array de `ResultadoConector` por página

### 2.3 ConectorGenerico (RSS/Scraping)

- Lê `fonte.parametros.url`
- Faz fetch da URL
- Detecta formato:
  - Se XML com `<rss>` ou `<feed>` → parseia como RSS/Atom
  - Senão → tenta scraping com seletores de `fonte.parametros.seletores`
- Extrai: título, link (como linkOrigem), descrição (como objeto), data
- Gera `identificadorExterno` = `ext:{hash do link ou titulo}`
- Yield array de `ResultadoConector`

### 2.4 Factory

```typescript
function criarConector(tipo: TipoFonte): Conector
```

---

## 3. Pipeline de Ingestão

Função: `executarCaptacao(fonteId: string, disparadoPor: string)`

### Fluxo:
1. Buscar `FonteCaptacao` do banco (validar que está ativa)
2. Criar `ExecucaoCaptacao` com status `executando`
3. Instanciar conector via factory
4. Para cada batch do generator:
   - Para cada item:
     a. Buscar `Licitacao` por `identificadorExterno`
     b. Se não existe:
        - Criar `Licitacao` com dados normalizados + `fonteId` + `identificadorExterno`
        - Criar `KanbanCard` na coluna inicial
        - Criar `ItemCaptado` com status `criado`
     c. Se existe e campos mudaram (titulo, objeto, valorEstimado, dataPublicacao, dataSessao, modalidade):
        - Atualizar campos não-nulos que diferem
        - Criar `ItemCaptado` com status `atualizado`
     d. Se existe e sem mudanças:
        - Criar `ItemCaptado` com status `duplicado`
     e. Se erro:
        - Criar `ItemCaptado` com status `erro` + motivo
   - Atualizar contadores na `ExecucaoCaptacao`
5. Finalizar `ExecucaoCaptacao` (status `concluida`, `finalizadaEm`, contadores finais)
6. Atualizar `FonteCaptacao.ultimaSincronizacao`

### Tratamento de erros:
- Erro no conector (API indisponível): status `erro` na execução, mensagem no campo `erro`
- Erro em item individual: não interrompe a execução, registra `ItemCaptado` com status `erro`
- Timeout: limit de 5 minutos por execução

---

## 4. APIs

### 4.1 CRUD Fontes (`/api/fontes`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/fontes` | Required | Listar fontes com ultimaSincronizacao e contadores da última execução |
| POST | `/api/fontes` | Admin | Criar fonte |
| PUT | `/api/fontes/[id]` | Admin | Editar fonte |
| DELETE | `/api/fontes/[id]` | Admin | Desativar (soft delete) |

### 4.2 Execução (`/api/fontes/[id]/executar`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/fontes/[id]/executar` | Admin | Disparar captação. Body opcional: `{ disparadoPor: "manual" }` |

Retorna a `ExecucaoCaptacao` criada. A execução roda em background (não bloqueia o response). O frontend faz polling do status.

### 4.3 Histórico (`/api/fontes/[id]/execucoes`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/fontes/[id]/execucoes` | Admin | Listar execuções (paginado, mais recentes primeiro). Query: `?limite=20` |

---

## 5. Tela Admin

### Localização: Nova aba "Fontes de captação" em `/configuracoes`

### 5.1 Lista de fontes
- Card por fonte: nome, tipo (badge colorido), ativo/inativo, periodicidade
- Última sincronização (tempo relativo: "há 2 horas")
- Contadores da última execução: captados/criados/atualizados/duplicados/erros
- Botão "Executar agora" com loading spinner e feedback
- Botão editar (abre dialog)
- Toggle ativo/inativo

### 5.2 Dialog de criação/edição
- Nome (input)
- Tipo (dropdown: PNCP, RSS, Scraping, API Genérica)
- Campos dinâmicos por tipo:
  - **PNCP**: palavras-chave (textarea), UFs (input CSV), tamanho página (number), páginas máximas (number)
  - **RSS/Scraping**: URL (input), seletores opcionais (inputs para lista, título, link, descrição)
- Periodicidade (dropdown: "6h", "12h", "24h", "manual")
- Toggle ativo

### 5.3 Histórico de execuções
- Expansível por fonte (accordion ou seção)
- Tabela: data/hora, duração, status (badge), captados, criados, atualizados, duplicados, erros
- Se erro: mostra mensagem

### Estados obrigatórios: loading (skeleton), vazio, erro (toast + retry)

---

## 6. Seed

Fonte PNCP pré-configurada:
```json
{
  "nome": "PNCP - Contêineres e Equipamentos",
  "tipo": "pncp",
  "ativo": true,
  "filtros": {
    "palavrasChave": ["contêiner", "container", "equipamento portuário", "reach stacker", "empilhadeira"],
    "ufs": ["SP", "RJ", "SC", "RS", "PR", "ES"]
  },
  "parametros": {
    "tamanhoPagina": 50,
    "paginasMaximas": 3
  },
  "periodicidade": "12h"
}
```

---

## 7. Compatibilidade

- Busca manual em `/pncp` continua funcionando inalterada
- Importação individual via "Adicionar ao painel" continua funcionando
- Licitações importadas manualmente têm `fonteId: null` e `identificadorExterno: null`
- Pipeline é um caminho novo e paralelo

---

## 8. Fora de escopo (próximos sub-projetos)

- Motor de score funcional (SP-C)
- Expansão completa da entidade Licitação (SP-C)
- Regras de transição Kanban por coluna (SP-D)
- Dashboard (SP-E)
- Aplicação automática de regras de aderência no pipeline (depende do motor de score SP-C, mas a estrutura `totalDescartados` já está preparada)
