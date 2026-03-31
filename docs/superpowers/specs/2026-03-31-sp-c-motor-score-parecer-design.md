# SP-C: Motor de Score + Análise + Parecer

**Data**: 2026-03-31
**Sub-projeto**: SP-C (terceiro de 8)
**Escopo**: Análise qualitativa (manual + IA), motor de score com 6 componentes, valor capturável, falso negativo, parecer comercial, página dedicada da licitação

---

## Contexto

Com SP-A (parâmetros estratégicos) e SP-B (fontes de captação + pipeline) concluídos, as licitações já entram automaticamente no Kanban. O próximo passo é permitir a avaliação de cada licitação: análise qualitativa dos 6 eixos, cálculo de score, estimativa de valor capturável, detecção de falso negativo, e parecer comercial final.

**Decisões tomadas:**
- Análise manual + IA (usuário preenche ou clica "Analisar com IA")
- Escopo completo: score + valor capturável + falso negativo + parecer
- Provider IA: usa iaConfig existente da Empresa (factory pattern)
- UI: drawer com resumo + página dedicada `/licitacoes/[id]` para edição
- Cálculo do score no servidor (POST calcular)
- 6 componentes de análise como base do score; 7 critérios do seed ficam como config futura

---

## 1. Modelagem do Banco

### 1.1 `LicitacaoAnalise` — Entrada de análise qualitativa

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | CUID | PK | Identificador |
| licitacaoId | String @unique | Sim | FK → Licitacao |
| aderenciaDiretaExiste | Boolean? | Não | Existe aderência direta ao portfólio? |
| aderenciaDiretaNivel | String? | Não | "alta", "media", "baixa", "nenhuma" |
| aderenciaAplicacaoExiste | Boolean? | Não | Existe aderência por aplicação? |
| aderenciaAplicacaoNivel | String? | Não | idem |
| contextoOcultoExiste | Boolean? | Não | Contexto oculto identificado? |
| contextoOcultoNivel | String? | Não | idem |
| oportunidadeOcultaExiste | Boolean? | Não | Oportunidade oculta? |
| oportunidadeOcultaForca | String? | Não | "alta", "media", "baixa" |
| oportunidadeOcultaResumo | String? @db.Text | Não | Descrição da oportunidade |
| oportunidadeNoObjeto | Boolean | Sim (default false) | Flag: encontrada no objeto |
| oportunidadeNoTr | Boolean | Sim (default false) | Flag: encontrada no TR |
| oportunidadeNosLotes | Boolean | Sim (default false) | Flag: encontrada nos lotes |
| oportunidadeNosItens | Boolean | Sim (default false) | Flag: encontrada nos itens |
| oportunidadeNaPlanilha | Boolean | Sim (default false) | Flag: encontrada na planilha |
| oportunidadeNoMemorial | Boolean | Sim (default false) | Flag: encontrada no memorial |
| oportunidadeEmAnexoTecnico | Boolean | Sim (default false) | Flag: encontrada em anexo técnico |
| criadoEm | DateTime | Auto | Criação |
| atualizadoEm | DateTime | Auto | Atualização |

Relações: `licitacao` (1-1 Licitacao)
@@map("licitacoes_analise")

### 1.2 `LicitacaoAnaliseIa` — Resultado da análise por IA

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | CUID | PK | Identificador |
| licitacaoId | String @unique | Sim | FK → Licitacao |
| status | String | Sim | "processando", "concluido", "erro" |
| resultadoJson | Json? | Não | Payload completo retornado pela IA |
| modelo | String? | Não | Modelo usado (ex: "claude-sonnet-4-5-20250514") |
| erro | String? @db.Text | Não | Mensagem de erro se falhou |
| criadoEm | DateTime | Auto | Criação |
| atualizadoEm | DateTime | Auto | Atualização |

Relações: `licitacao` (1-1 Licitacao)
@@map("licitacoes_analise_ia")

### 1.3 `LicitacaoScore` — Score calculado + valor capturável + falso negativo

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | CUID | PK | Identificador |
| licitacaoId | String @unique | Sim | FK → Licitacao |
| scoreFinal | Float | Sim | 0-100, média ponderada |
| classificacao | String | Sim | "A+", "A", "B", "C", "D" |
| scoreAderenciaDireta | Float? | Não | Componente (peso 15%) |
| scoreAderenciaAplicacao | Float? | Não | Componente (peso 25%) |
| scoreContextoOculto | Float? | Não | Componente (peso 20%) |
| scoreModeloComercial | Float? | Não | Componente (peso 15%) |
| scorePotencialEconomico | Float? | Não | Componente (peso 15%) |
| scoreQualidadeEvidencia | Float? | Não | Componente (peso 10%) |
| scoreJustificativaResumida | String? @db.Text | Não | Resumo automático do cálculo |
| **Valor capturável** | | | |
| valorCapturavelEstimado | Decimal? @db.Decimal(15,2) | Não | Valor estimado |
| valorCapturavelFaixaMin | Decimal? @db.Decimal(15,2) | Não | Faixa mínima |
| valorCapturavelFaixaMax | Decimal? @db.Decimal(15,2) | Não | Faixa máxima |
| valorCapturavelMoeda | String | Sim (default "BRL") | Moeda |
| valorCapturavelNivelConfianca | String? | Não | "alto", "medio", "baixo" |
| valorCapturavelMetodoEstimativa | String? | Não | Como estimou |
| valorCapturavelJustificativa | String? @db.Text | Não | Justificativa |
| valorCapturavelBaseDocumental | Json? | Não | Referências documentais |
| valorCapturavelObservacao | String? @db.Text | Não | Observação adicional |
| **Falso negativo** | | | |
| falsoNegativoExisteRisco | Boolean | Sim (default false) | Há risco de falso negativo? |
| falsoNegativoNivelRisco | String? | Não | "alto", "medio", "baixo" |
| falsoNegativoMotivos | Json? | Não | Array de motivos |
| falsoNegativoTrechosCriticos | Json? | Não | Trechos relevantes |
| falsoNegativoResumo | String? @db.Text | Não | Resumo |
| criadoEm | DateTime | Auto | Criação |
| atualizadoEm | DateTime | Auto | Atualização |

Relações: `licitacao` (1-1 Licitacao)
@@map("licitacoes_score")

### 1.4 `LicitacaoParecer` — Parecer comercial final

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | CUID | PK | Identificador |
| licitacaoId | String @unique | Sim | FK → Licitacao |
| classificacaoFinal | String? | Não | "A+", "A", "B", "C", "D" |
| prioridadeComercial | String? | Não | "alta", "media", "baixa" |
| valeEsforcoComercial | Boolean? | Não | Vale investir? |
| recomendacaoFinal | String? @db.Text | Não | Texto livre |
| resumo | String? @db.Text | Não | Resumo executivo |
| oportunidadeDireta | Boolean | Sim (default false) | |
| oportunidadeIndireta | Boolean | Sim (default false) | |
| oportunidadeOcultaItemLoteAnexo | Boolean | Sim (default false) | |
| oportunidadeInexistente | Boolean | Sim (default false) | |
| riscoFalsoPositivo | Boolean | Sim (default false) | |
| riscoFalsoNegativoSoTitulo | Boolean | Sim (default false) | |
| ondeEstaOportunidade | Json? | Não | Array de strings |
| solucoesQueMultiteinerPoderiaOfertar | Json? | Não | Array de strings |
| proximoPasosRecomendado | Json? | Não | Array de strings |
| riscosLimitacoes | Json? | Não | Array de strings |
| evidenciasPrincipais | Json? | Não | Array de strings |
| criadoEm | DateTime | Auto | Criação |
| atualizadoEm | DateTime | Auto | Atualização |

Relações: `licitacao` (1-1 Licitacao)
@@map("licitacoes_parecer")

### 1.5 Alterações em `Licitacao`

Novas relações (opcionais, 1-1):
- `analise LicitacaoAnalise?`
- `analiseIa LicitacaoAnaliseIa?`
- `score LicitacaoScore?`
- `parecer LicitacaoParecer?`

---

## 2. Motor de Score

### 2.1 Calculadora (`lib/score/calculator.ts`)

Função `calcularScore(analise, analiseIa?, licitacao?)` server-side:

**Mapeamento de níveis:**
- "alta" → 100
- "media" → 60
- "baixa" → 30
- "nenhuma" / null → 0

**6 componentes com pesos:**

| Componente | Peso | Base de cálculo |
|---|---|---|
| scoreAderenciaDireta | 15% | `aderenciaDiretaNivel` |
| scoreAderenciaAplicacao | 25% | `aderenciaAplicacaoNivel` |
| scoreContextoOculto | 20% | `contextoOcultoNivel` |
| scoreModeloComercial | 15% | `oportunidadeOcultaForca` + contagem de flags de oportunidade ativas (cada flag ativa adiciona 10 pontos ao componente, max 100) |
| scorePotencialEconomico | 15% | Se valorEstimado da licitação > 0: base 50; se > 500k: 70; se > 1M: 90; se > 5M: 100. Senão: 20 |
| scoreQualidadeEvidencia | 10% | (flags de oportunidade marcadas / 7) * 100 |

**Fallback IA:** se `analiseIa` disponível com status "concluido", campos não preenchidos na análise manual são preenchidos com os valores do `resultadoJson` da IA.

**Score final:** `scoreFinal = Σ(componente × peso)`

**Classificação:**
- A+ ≥ 85
- A ≥ 70
- B ≥ 55
- C ≥ 40
- D < 40

**Justificativa automática:** string descritiva tipo "Aderência direta alta (15%), Aplicação média (15%), Contexto oculto baixo (6%)..." mostrando a contribuição de cada componente.

### 2.2 Análise por IA (`lib/score/analise-ia.ts`)

Função `analisarComIa(licitacaoId)`:

1. Busca Licitacao (título, órgão, objeto, modalidade, UF, valor, link)
2. Busca iaConfig da Empresa (provider, modelo, apiKey)
3. Busca contexto: segmento e descrição da Empresa, produtos do catálogo
4. Usa o provider factory (`lib/ia/`) para criar o client
5. Prompt estruturado pedindo avaliação dos 6 eixos:
   - Para cada eixo: `existe` (boolean) + `nivel` ("alta"/"media"/"baixa"/"nenhuma") + `justificativa` (string)
   - Oportunidade oculta: `existe` + `forca` + `resumo`
   - Flags de onde encontrou oportunidade
6. Parseia resposta JSON
7. Salva em `LicitacaoAnaliseIa` com status "concluido" ou "erro"
8. Retorna o resultado

---

## 3. APIs

### 3.1 Análise

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/licitacoes/[id]/analise` | Required | Retorna análise + analiseIa (se existirem) |
| PUT | `/api/licitacoes/[id]/analise` | Required | Upsert análise manual |
| POST | `/api/licitacoes/[id]/analise/ia` | Admin | Dispara análise IA. Cria LicitacaoAnaliseIa com status "processando", executa em background, retorna 202 |

### 3.2 Score

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/licitacoes/[id]/score` | Required | Retorna score salvo |
| POST | `/api/licitacoes/[id]/score/calcular` | Required | Calcula score a partir da análise, retorna sugestão sem salvar |
| PUT | `/api/licitacoes/[id]/score` | Required | Salva score (aceita overrides do usuário) |

### 3.3 Parecer

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/licitacoes/[id]/parecer` | Required | Retorna parecer salvo |
| PUT | `/api/licitacoes/[id]/parecer` | Required | Upsert parecer |

---

## 4. Interface

### 4.1 Drawer da licitação (resumo)

Seção adicional abaixo dos dados gerais no drawer existente:

- **Badge de score**: classificação colorida (A+ verde-escuro, A azul, B amarelo, C laranja, D vermelho) + scoreFinal numérico. Se não tem score: badge cinza "Sem score"
- **Status da análise**: "Não analisada" / "Analisada manualmente" / "Analisada por IA" / "Em análise..."
- **Parecer resumido**: classificação final + prioridade + "Vale esforço: Sim/Não". Se não tem parecer: "Sem parecer"
- **Link**: "Ver análise completa →" abre `/licitacoes/[id]`

Se não tem score nem parecer: "Nenhuma análise realizada. [Analisar →]"

### 4.2 Página dedicada (`/licitacoes/[id]`)

**Layout**: sidebar fixa com dados gerais da licitação (título, órgão, objeto, modalidade, UF, valor, datas, link PNCP, badge score). Área principal com 3 tabs.

**Tab "Análise"**:
- 3 blocos lado a lado: aderência direta, aderência aplicação, contexto oculto
  - Cada um: toggle "Existe?" + dropdown nível ("Alta", "Média", "Baixa", "Nenhuma")
- Bloco oportunidade oculta: toggle "Existe?" + dropdown força + textarea resumo
- 7 checkboxes em grid: "Onde encontrou oportunidade?" (objeto, TR, lotes, itens, planilha, memorial, anexo técnico)
- Botão "Analisar com IA": loading spinner, ao concluir preenche os campos. Badge "IA" nos campos preenchidos pela IA
- Botão "Salvar análise"

**Tab "Score"**:
- 6 sliders (0-100) agrupados em 2 colunas de 3, com labels e peso indicado
- Botão "Calcular score" → chama API, preenche os sliders com valores sugeridos
- Bloco resultado: scoreFinal (número grande) + classificação (badge colorida)
- Textarea "Justificativa resumida" (preenchida automaticamente, editável)
- **Seção "Valor capturável"**: inputs para estimado/faixa min-max, dropdown confiança, textarea método/justificativa
- **Seção "Risco de falso negativo"**: toggle risco, dropdown nível, textarea motivos, textarea trechos críticos, textarea resumo
- Botão "Salvar score"

**Tab "Parecer"**:
- Dropdown classificação final (default = classificação do score)
- Dropdown prioridade comercial
- Toggle "Vale esforço comercial?"
- 4 checkboxes tipo de oportunidade
- 2 checkboxes riscos
- 5 listas editáveis de strings (onde está oportunidade, soluções, próximos passos, riscos/limitações, evidências principais) — cada uma com botão adicionar e X para remover
- Textarea recomendação final
- Textarea resumo executivo
- Botão "Salvar parecer"

### 4.3 Estados obrigatórios
- **Loading**: skeleton em todas as seções
- **Vazio**: mensagem orientando fluxo (Análise → Score → Parecer)
- **Erro**: toast com retry
- **Salvando**: botão disabled + "Salvando..."

---

## 5. Compatibilidade

- Busca manual em `/pncp` e Kanban continuam inalterados
- Licitações sem análise/score/parecer funcionam normalmente (relações opcionais)
- O drawer existente ganha apenas a seção de resumo, sem quebrar o layout atual
- A página `/licitacoes/[id]` é nova, não afeta rotas existentes

---

## 6. Fora de escopo (próximos sub-projetos)

- Aplicação automática de regras de aderência no pipeline (SP-D)
- Score automático no pipeline de captação (depende de SP-D)
- Dashboard com métricas de score/parecer (SP-E)
- Regras de transição Kanban baseadas em score (SP-D)
- Histórico de versões de score/parecer
