# SP-D: Avaliacao Automatica de Aderencia

## Objetivo

Avaliar automaticamente cada licitacao captada contra as RegraAderencia configuradas, gerar um score preliminar baseado em dados objetivos, e exibir badges visuais nos cards do Kanban. Sem IA, sem auto-transicoes.

## Decisoes de Design

1. **Regras de exclusao**: Criam card normalmente, com flag visual "Baixa aderencia" (nunca descartam automaticamente)
2. **Score**: Simplificado, baseado apenas em dados objetivos (palavras-chave, modalidade, UF, valor)
3. **Transicoes**: Apenas flag visual no card (sem auto-mover entre colunas)
4. **Ponto de injecao**: Inline no pipeline, apos criar/atualizar Licitacao

## Arquitetura

```
Pipeline (processarItem)
  -> Cria/atualiza Licitacao + KanbanCard
  -> avaliarAderencia(licitacao, regrasAtivas)
     -> Para cada regra: testar campo/operador/valor
     -> Retorna: { score, regrasAtendidas[], regrasVioladas[], classificacao }
  -> Salva resultado em campos JSON na Licitacao
  -> Badge visual no KanbanCard (lido do JSON)
```

## Modelo de Dados

Novos campos na Licitacao (nao precisa de novas tabelas):

```prisma
model Licitacao {
  // ... campos existentes ...
  aderenciaAutomatica  Json?   @map("aderencia_automatica")
  scorePreliminar      Float?  @map("score_preliminar")
  classificacaoPreliminar String? @map("classificacao_preliminar")
}
```

Estrutura do JSON `aderenciaAutomatica`:
```json
{
  "avaliadoEm": "2026-04-01T...",
  "regrasAvaliadas": 5,
  "regrasAtendidas": [
    { "id": "...", "nome": "Incluir Pregao", "tipo": "inclusao", "campo": "modalidade", "peso": 20 }
  ],
  "regrasVioladas": [
    { "id": "...", "nome": "Excluir Convite", "tipo": "exclusao", "campo": "modalidade", "peso": -30 }
  ],
  "scorePreliminar": 72,
  "classificacao": "B"
}
```

## Avaliador de Aderencia

Arquivo: `lib/aderencia/avaliador.ts`

Funcoes:
- `avaliarAderencia(licitacao, regras)` — avalia cada regra contra os campos da licitacao
- Operadores suportados: `igual`, `diferente`, `contem`, `nao_contem`, `maior`, `menor`, `regex`
- Campos avaliados: `titulo`, `objeto`, `modalidade`, `uf`, `municipio`, `orgao`, `valorEstimado`
- Score preliminar: media ponderada das regras de inclusao atendidas, penalizada por exclusoes

## Calculo do Score Preliminar

1. Somar pesos das regras de **inclusao** atendidas
2. Somar pesos das regras de **exclusao** violadas (negativos)
3. Normalizar para 0-100
4. Classificacao: A+ (>=85), A (>=70), B (>=55), C (>=40), D (<40)

## Badges Visuais no Kanban

No KanbanCard:
- Badge de classificacao: "A+", "A", "B", "C", "D" com cores
- Se tem regra de exclusao violada: badge vermelho "Baixa aderencia"
- Se score >= 70: badge verde
- Se score < 40: badge laranja

## Componentes Afetados

1. `lib/aderencia/avaliador.ts` — novo, motor de avaliacao
2. `lib/fontes/pipeline.ts` — injetar avaliacao apos criar card
3. `prisma/schema.prisma` — 3 novos campos na Licitacao
4. `components/kanban/KanbanCard.tsx` — badges visuais
5. `app/api/licitacoes/[id]/aderencia/route.ts` — novo, GET resultado + POST recalcular

## Fora de Escopo

- Analise por IA (ja existe em SP-C)
- Auto-transicao de colunas
- Descarte automatico
- Notificacoes
