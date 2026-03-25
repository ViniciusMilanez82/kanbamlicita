# SP-5 — Score, Valor Capturável e Parecer Executivo Design

## Goal

Implementar as abas **score** e **parecer** na página de detalhe da licitação, permitindo que o analista preencha e salve o score por componentes (com sugestão automática calculada a partir da Análise manual + IA), o valor capturável estimado, o registro de falso negativo e o parecer executivo.

## Architecture

### Fluxo

1. `app/licitacoes/[id]/page.tsx` carrega `LicitacaoScore` e `LicitacaoParece` via Prisma (`score: true, parecer: true` já no include)
2. `ScoreTab` — Client Component com 3 blocos editáveis (score, valor capturável, falso negativo). Botão "Sugerir" chama `calcularScore(analise, analiseIa)` client-side, preenche campos. Salva via PUT `/api/licitacoes/[id]/score`
3. `ParecerTab` — Client Component com formulário de parecer executivo. Salva via PUT `/api/licitacoes/[id]/parecer`
4. `lib/score/calculator.ts` — função pura testável, zero dependências externas

### Novos arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `lib/score/calculator.ts` | Criar | Fórmula de sugestão de score |
| `app/api/licitacoes/[id]/score/route.ts` | Criar | PUT upsert LicitacaoScore |
| `app/api/licitacoes/[id]/parecer/route.ts` | Criar | PUT upsert LicitacaoParece |
| `components/licitacao/tabs/ScoreTab.tsx` | Criar | Formulário score + valor capturável + falso negativo |
| `components/licitacao/tabs/ParecerTab.tsx` | Criar | Formulário parecer executivo |
| `types/licitacao-detalhe.ts` | Modificar | Expandir ScoreDetalhe, adicionar ParecerDetalhe |
| `app/licitacoes/[id]/page.tsx` | Modificar | Serializar score completo + parecer, wiring tabs |

---

## Fórmula de Score (`lib/score/calculator.ts`)

### Pesos (conforme documentação)

| Componente | Peso |
|---|---|
| scoreAderenciaDireta | 15 |
| scoreAderenciaAplicacao | 25 |
| scoreContextoOculto | 20 |
| scoreModeloComercial | 15 |
| scorePotencialEconomico | 15 |
| scoreQualidadeEvidencia | 10 |

`scoreFinal = (comp1×15 + comp2×25 + comp3×20 + comp4×15 + comp5×15 + comp6×10) / 100`

### Escala por componente (0–100)

**scoreAderenciaDireta** — fonte: `analise.aderenciaDiretaNivel` (se `aderenciaDiretaExiste`)
- alta → 100, media → 60, baixa → 30, nenhuma/não existe → 0

**scoreAderenciaAplicacao** — fonte: `analise.aderenciaAplicacaoNivel` (se `aderenciaAplicacaoExiste`)
- mesma escala

**scoreContextoOculto** — fonte: `analise.contextoOcultoNivel` (se `contextoOcultoExiste`)
- alto → 100, medio → 60 (usar "medio"), baixo → 30, nenhuma/não existe → 0

**scoreModeloComercial** — fonte: `analise` (oportunidades ativas)
- conta: oportunidadeNoObjeto, oportunidadeNoTr, oportunidadeNosLotes, oportunidadeNosItens, oportunidadeNaPlanilha, oportunidadeNoMemorial, oportunidadeEmAnexoTecnico
- score = (quantidade ativa / 7) × 100

**scorePotencialEconomico** — fonte: `analiseIa.resultadoJson.aderencia.nivel`
- alta → 100, media → 60, baixa → 30, nenhuma → 0

**scoreQualidadeEvidencia** — fonte: `analiseIa.resultadoJson.confianca`
- alta → 100, media → 60, baixa → 30

### Faixas de classificação (conforme documentação)

| Score | Faixa |
|---|---|
| ≥ 85 | A+ |
| ≥ 70 | A |
| ≥ 55 | B |
| ≥ 40 | C |
| < 40 | D |

### Assinatura da função

```ts
import type { AnaliseDetalhe } from '@/types/licitacao-detalhe'
import type { AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'

export type ScoreSugestao = {
  scoreAderenciaDireta: number
  scoreAderenciaAplicacao: number
  scoreContextoOculto: number
  scoreModeloComercial: number
  scorePotencialEconomico: number
  scoreQualidadeEvidencia: number
  scoreFinal: number
  faixaClassificacao: string
}

export function calcularScore(
  analise: AnaliseDetalhe,
  analiseIaResult: AnaliseIaResult | null
): ScoreSugestao
```

---

## Tipos Serializados

### `ScoreDetalhe` (expandido)

```ts
export type ScoreDetalhe = {
  scoreFinal: number
  faixaClassificacao: string
  scoreAderenciaDireta: number
  scoreAderenciaAplicacao: number
  scoreContextoOculto: number
  scoreModeloComercial: number
  scorePotencialEconomico: number
  scoreQualidadeEvidencia: number
  scoreJustificativaResumida: string | null
  valorCapturavelFoiPossivelEstimar: boolean
  valorCapturavelEstimado: number | null
  valorCapturavelFaixaMin: number | null
  valorCapturavelFaixaMax: number | null
  valorCapturavelMoeda: string
  valorCapturavelNivelConfianca: string
  valorCapturavelMetodoEstimativa: string
  valorCapturavelJustificativa: string
  valorCapturavelBaseDocumental: unknown[]
  valorCapturavelObservacao: string | null
  falsoNegativoExisteRisco: boolean
  falsoNegativoNivelRisco: string
  falsoNegativoMotivos: unknown[]
  falsoNegativoTrechosCriticos: unknown[]
  falsoNegativoResumo: string
} | null
```

### `ParecerDetalhe` (novo)

```ts
export type ParecerDetalhe = {
  classificacaoFinal: string
  prioridadeComercial: string
  valeEsforcoComercial: boolean
  recomendacaoFinal: string
  resumo: string | null
  oportunidadeDireta: boolean
  oportunidadeIndireta: boolean
  oportunidadeOcultaItemLoteAnexo: boolean
  oportunidadeInexistente: boolean
  riscoFalsoPositivo: string
  riscoFalsoNegativoSoTitulo: string
} | null
```

> Campos JSON (`ondeEstaOportunidade`, `solucoesQueMultiteinerPoderiaOfertar`, `proximoPasosRecomendado`, `riscosLimitacoes`, `evidenciasPrincipais`) são excluídos desta fase — SP futuro.

`LicitacaoDetalhe` recebe dois novos campos:
```ts
  parecer: ParecerDetalhe
```
(score já existe, mas será re-serializado com todos os campos)

---

## API Routes

### PUT `/api/licitacoes/[id]/score/route.ts`

Padrão idêntico ao `/analise/route.ts`:
- Verificar se licitação existe (404 se não)
- Remover `id`, `licitacaoId`, `criadoEm`, `atualizadoEm` do body
- `db.licitacaoScore.upsert({ where: { licitacaoId }, create: ..., update: ... })`
- Retorna `{ score }`

### PUT `/api/licitacoes/[id]/parecer/route.ts`

Mesmo padrão:
- Modelo Prisma: `licitacaoParece` (nome do modelo no schema — typo original)
- `db.licitacaoParece.upsert({ where: { licitacaoId }, create: ..., update: ... })`
- Retorna `{ parecer }`

---

## Componentes UI

### `ScoreTab` (`components/licitacao/tabs/ScoreTab.tsx`)

Client Component (`'use client'`). Props: `licitacaoId`, `score: ScoreDetalhe`, `analise: AnaliseDetalhe`, `analiseIa: AnaliseIaDetalhe`.

**3 blocos:**

**Bloco 1 — Score por componentes**
- 6 inputs numéricos (0–100) para cada componente
- Score final e faixa calculados em tempo real (derivados, read-only)
- Textarea para justificativa resumida
- Botão "Sugerir" → chama `calcularScore(analise, analiseIaResult)` e preenche os 6 campos
  - `analiseIaResult` extraído de `analiseIa.resultadoJson as AnaliseIaResult` se status === 'CONCLUIDO'
- Botão "Salvar" → PUT `/api/licitacoes/[id]/score`

**Bloco 2 — Valor capturável**
- Toggle "Foi possível estimar?"
- Input valor estimado (mostra se foi possível)
- Inputs faixa min / max
- Select moeda (BRL padrão)
- Select nível confiança (alto/medio/baixo)
- Select método (`por_item_planilhado`, `por_quantitativo_x_preco_referencia`, `por_lote_relacionado`, `por_inferencia_de_escopo`, `nao_estimado`)
- Textarea justificativa
- Textarea observação

**Bloco 3 — Falso negativo**
- Toggle "Existe risco?"
- Select nível (alto/medio/baixo) — visível se existe risco
- Checkboxes de motivos padronizados (12 opções conforme documentação)
- Textarea resumo

### `ParecerTab` (`components/licitacao/tabs/ParecerTab.tsx`)

Client Component (`'use client'`). Props: `licitacaoId`, `parecer: ParecerDetalhe`, `score: ScoreDetalhe`.

- Select classificação final (A+/A/B/C/D) — pré-preenchido com `score.faixaClassificacao` se parecer nulo
- Select prioridade comercial (alta/media/baixa)
- Toggle vale esforço comercial?
- Select recomendação final (AVANCAR/ACOMPANHAR/DESCARTAR)
- Checkboxes tipo de oportunidade (direta / indireta / oculta item-lote-anexo / inexistente — mutuamente exclusiva com inexistente)
- Select risco falso positivo (alto/medio/baixo)
- Select risco falso negativo só título (alto/medio/baixo)
- Textarea resumo
- Botão "Salvar" → PUT `/api/licitacoes/[id]/parecer`

---

## Testes

### `__tests__/lib/score/calculator.test.ts`

Testa `calcularScore` com casos:
1. Análise completa + IA completa → score correto com pesos
2. Análise nula → score zerado
3. IA nula → scorePotencialEconomico e scoreQualidadeEvidencia = 0
4. Todos alta/alta → faixa A+
5. Todos baixo → faixa D

---

## O que NÃO entra

- Campos JSON complexos do parecer (`ondeEstaOportunidade`, `soluções`, `próximo passo`, etc.)
- Cálculo automático de parecer a partir do score
- Histórico de versões do score
- Bloqueio de movimentação kanban por score incompleto
