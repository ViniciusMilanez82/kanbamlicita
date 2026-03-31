# SP-A: Modelagem do Banco Fase 2 + Parâmetros Estratégicos

**Data**: 2026-03-31
**Sub-projeto**: SP-A (primeiro de 8)
**Escopo**: Novas tabelas, migrations, seeds, API CRUD, tela admin de parâmetros

---

## Contexto

O sistema atual (Fase 1) possui: Empresa, Produto, KanbanColuna, Licitacao, KanbanCard, Movimentacao, AcaoIa, User. A Fase 2 exige um módulo de parâmetros estratégicos configuráveis, auditáveis e versionados, que servirá de fundação para o motor de score, captação inteligente e qualificação de oportunidades.

**Decisões tomadas:**
- Reset total do Kanban (sem dados de produção)
- Módulo separado com tabelas próprias (não expandir JSON em Empresa)
- Híbrido: tabela genérica para maioria + tabelas dedicadas para score e aderência

---

## 1. Modelagem do Banco

### 1.1 Nova tabela: `ParametroEstrategico`

Tabela genérica para configurações de negócio organizadas por categoria.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | String (CUID) | PK | Identificador |
| categoria | Enum `CategoriaParametro` | Sim | Tipo do parâmetro |
| chave | String | Sim | Identificador legível (slug) |
| valor | String | Sim | Valor do parâmetro |
| peso | Float | Não | Peso numérico (0-100) |
| descricao | String | Não | Explicação |
| ativo | Boolean | Sim (default true) | Soft delete |
| ordem | Int | Sim (default 0) | Ordenação na UI |
| criadoEm | DateTime | Auto | Criação |
| atualizadoEm | DateTime | Auto | Última edição |

**Enum `CategoriaParametro`:**
- `segmento`
- `categoria_produto`
- `linha_servico`
- `palavra_chave_positiva`
- `palavra_chave_negativa`
- `regra_modalidade`
- `regra_orgao`
- `regra_uf`
- `criterio_descarte`
- `criterio_urgencia`
- `gatilho_risco`

**Índice único:** `(categoria, chave)` — evita duplicatas dentro da mesma categoria.

### 1.2 Nova tabela: `CriterioScore`

Regras do motor de pontuação, com estrutura dedicada.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | String (CUID) | PK | Identificador |
| nome | String | Sim | Ex: "aderencia_portfolio" |
| descricao | String | Sim | Explicação humana |
| tipo | Enum `TipoCriterio` | Sim | objetivo ou subjetivo |
| peso | Float | Sim | Peso no cálculo (1-100) |
| formulaRef | String | Não | Referência à lógica (para tipo objetivo) |
| faixaMin | Float | Não | Valor mínimo possível |
| faixaMax | Float | Não | Valor máximo possível |
| ativo | Boolean | Sim (default true) | Soft delete |
| ordem | Int | Sim (default 0) | Ordem de avaliação |
| criadoEm | DateTime | Auto | Criação |
| atualizadoEm | DateTime | Auto | Última edição |

**Enum `TipoCriterio`:** `objetivo`, `subjetivo`

### 1.3 Nova tabela: `RegraAderencia`

Regras de filtro/match de oportunidades.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | String (CUID) | PK | Identificador |
| nome | String | Sim | Nome da regra |
| tipo | Enum `TipoRegra` | Sim | inclusao, exclusao, condicional |
| campo | String | Sim | Campo da licitação alvo |
| operador | Enum `OperadorRegra` | Sim | Operação de comparação |
| valor | String | Sim | Valor de comparação |
| peso | Float | Não | Impacto no score |
| ativo | Boolean | Sim (default true) | Soft delete |
| descricao | String | Não | Justificativa |
| criadoEm | DateTime | Auto | Criação |
| atualizadoEm | DateTime | Auto | Última edição |

**Enum `TipoRegra`:** `inclusao`, `exclusao`, `condicional`
**Enum `OperadorRegra`:** `igual`, `diferente`, `contem`, `nao_contem`, `maior`, `menor`, `regex`

### 1.4 Nova tabela: `AuditoriaParametro`

Log imutável de alterações em parâmetros.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | String (CUID) | PK | Identificador |
| tabela | String | Sim | Nome da tabela alterada |
| registroId | String | Sim | ID do registro alterado |
| campo | String | Sim | Campo alterado |
| valorAnterior | String | Não | Valor antes |
| valorNovo | String | Não | Valor depois |
| acao | Enum `AcaoAuditoria` | Sim | criacao, edicao, exclusao |
| alteradoPorId | String | Sim | FK → User |
| criadoEm | DateTime | Auto | Timestamp |

**Enum `AcaoAuditoria`:** `criacao`, `edicao`, `exclusao`
**Relação:** `alteradoPor` → `User`

### 1.5 Alteração: `Empresa`

Adicionar campo:
- `configuracaoScore` (Json?) — thresholds globais do motor de score

Estrutura esperada:
```json
{
  "scoreMinimo": 40,
  "faixas": { "A": [80,100], "B": [60,79], "C": [40,59], "D": [0,39] },
  "recomendacoes": { "A": "avancar", "B": "acompanhar", "C": "acompanhar", "D": "descartar" }
}
```

### 1.6 Kanban — Reset de Seed

Remover colunas atuais (8) e criar as 6 da Fase 2:

| Ordem | Nome | Tipo | Cor |
|---|---|---|---|
| 1 | Captação | inicial | #6B7280 (cinza) |
| 2 | Qualificação | normal | #F59E0B (âmbar) |
| 3 | Análise | normal | #3B82F6 (azul) |
| 4 | Proposta | normal | #8B5CF6 (roxo) |
| 5 | Disputa | normal | #06B6D4 (ciano) |
| 6 | Pós-resultado | final_positivo | #10B981 (verde) |

> Nota: colunas de desfecho negativo (Descartada, Perdemos) serão tratadas como transições com motivo obrigatório em SP-D (Kanban Fase 2).

---

## 2. API Endpoints

### 2.1 Parâmetros Estratégicos (`/api/parametros`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/parametros?categoria=X` | Required | Listar por categoria |
| POST | `/api/parametros` | Admin | Criar parâmetro |
| PUT | `/api/parametros/[id]` | Admin | Editar (gera auditoria) |
| DELETE | `/api/parametros/[id]` | Admin | Desativar (soft delete, gera auditoria) |

### 2.2 Critérios de Score (`/api/criterios-score`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/criterios-score` | Required | Listar critérios |
| POST | `/api/criterios-score` | Admin | Criar critério |
| PUT | `/api/criterios-score/[id]` | Admin | Editar (gera auditoria) |
| DELETE | `/api/criterios-score/[id]` | Admin | Desativar (gera auditoria) |

### 2.3 Regras de Aderência (`/api/regras-aderencia`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/regras-aderencia` | Required | Listar regras |
| POST | `/api/regras-aderencia` | Admin | Criar regra |
| PUT | `/api/regras-aderencia/[id]` | Admin | Editar (gera auditoria) |
| DELETE | `/api/regras-aderencia/[id]` | Admin | Desativar (gera auditoria) |

### 2.4 Auditoria (`/api/auditoria-parametros`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/auditoria-parametros?tabela=X&de=Y&ate=Z` | Admin | Consultar log |

---

## 3. Tela Admin

### Localização: Nova aba "Parâmetros" em `/configuracoes`

Acessível apenas para admin. Três sub-abas internas:

### 3.1 Sub-aba: Parâmetros Gerais
- Dropdown de categoria no topo
- Tabela editável: Valor | Peso | Ativo | Ações (editar, desativar)
- Botão "Adicionar" → form inline
- Edição inline nos campos
- Estados: loading (skeleton), vazio, erro (toast + retry)

### 3.2 Sub-aba: Critérios de Score
- Tabela: Nome | Descrição | Tipo | Peso | Faixa | Ativo
- Form de edição em modal/dialog
- Indicador visual da soma dos pesos (barra, alerta se ≠ 100)
- Seção de configuração de faixas A/B/C/D (salva em Empresa.configuracaoScore)

### 3.3 Sub-aba: Regras de Aderência
- Tabela: Nome | Tipo | Campo | Operador | Valor | Peso | Ativo
- Form de edição em modal/dialog
- Preview em linguagem natural: "Se **modalidade** é **igual** a **Pregão Eletrônico** → incluir (peso +20)"

### 3.4 Log de Auditoria
- Acessível via ícone de histórico em cada sub-aba
- Lista cronológica: quem alterou, o quê, quando, valor anterior → novo

---

## 4. Seed Inicial

Dados coerentes com o negócio da Multiteiner:

### Segmentos
- Contêineres Marítimos, Equipamentos Portuários, Logística e Transporte, Armazenagem

### Palavras-chave positivas
- contêiner, container, reefer, dry, equipamento portuário, reach stacker, empilhadeira, spreader, guindaste, pórtico, munck, plataforma, içamento

### Palavras-chave negativas
- alimentação, medicamento, veículo automotor, mobiliário, limpeza, material de escritório, uniforme, combustível

### Regras de aderência
- Incluir: Pregão Eletrônico (modalidade)
- Incluir: UFs portuárias (SP, RJ, SC, RS, PR, ES, BA, PE, CE, PA, AM)
- Excluir: Convite (modalidade)
- Excluir: objeto contém "alimentação"

### Critérios de score
| Nome | Tipo | Peso |
|---|---|---|
| Aderência ao portfólio | objetivo | 25 |
| Valor estimado | objetivo | 15 |
| Modalidade favorável | objetivo | 15 |
| UF estratégica | objetivo | 10 |
| Prazo viável | objetivo | 10 |
| Complexidade | subjetivo | 10 |
| Histórico com órgão | subjetivo | 15 |

### Configuração de score (Empresa)
```json
{
  "scoreMinimo": 40,
  "faixas": { "A": [80,100], "B": [60,79], "C": [40,59], "D": [0,39] },
  "recomendacoes": { "A": "avancar", "B": "acompanhar", "C": "acompanhar", "D": "descartar" }
}
```

### Kanban — 6 colunas
Captação, Qualificação, Análise, Proposta, Disputa, Pós-resultado

---

## 5. Fora de escopo (próximos sub-projetos)

- Motor de score funcional (SP-C)
- Fontes de captação e ingestão (SP-B)
- Expansão da entidade Licitacao (SP-C)
- Regras de transição do Kanban por coluna (SP-D)
- Dashboard (SP-E)
- Ferramentas inteligentes (SP-G)
