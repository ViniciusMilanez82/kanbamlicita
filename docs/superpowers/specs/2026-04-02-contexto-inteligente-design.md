# Design: Contexto Inteligente — Fluxo de Trabalho Contínuo

**Data:** 2026-04-02
**Status:** Aprovado para implementação

## Problema

O sistema tem as funcionalidades certas, mas elas estão desconectadas. O usuário precisa "costurar" mentalmente o fluxo entre triagem, análise, jurídico e decisão. Não há guia sobre o que fazer em cada etapa, e o gestor não consegue ver de relance o progresso da equipe.

## Solução: Contexto Inteligente

O drawer da licitação se adapta dinamicamente à coluna atual do card no kanban. Cada coluna define: quais ações mostrar, qual checklist seguir, e quem é o responsável padrão. O card no kanban mostra progresso, responsável e prazos sem precisar abrir.

## Princípios

- **Uma fonte de verdade:** a coluna do kanban É a etapa do fluxo
- **Guia sem travar:** checklist orienta, mas pode pular etapas
- **Visibilidade:** progresso, responsável e prazos visíveis no card
- **Configurável:** cada empresa monta seu fluxo via configuração de colunas

---

## 1. Configuração de Coluna Expandida

### Schema: Campos novos em `KanbanColuna`

Adicionar ao model `KanbanColuna`:

```
acoesPadrao    String[]   @default([])   @map("acoes_padrao")
corEtapa       String?    @map("cor_etapa")
papelResponsavel String?  @map("papel_responsavel")
```

**`acoesPadrao`** — lista de ações que aparecem como botões no drawer quando o card está nessa coluna. Valores possíveis:
- `triagem_ia` — botão "Rodar Triagem IA"
- `analise_profunda` — botão "Ver/Rodar Análise Profunda"
- `checar_habilitacao` — botão "Checar Habilitação" (cruza docs empresa vs edital)
- `sugerir_proposta` — botão "Sugerir Proposta IA"
- `analise_juridica` — botão "Análise Jurídica IA"
- `redigir_impugnacao` — botão "Redigir Impugnação" (IA gera minuta baseada nas cláusulas restritivas encontradas pela análise jurídica)
- `resumo_executivo` — mostra painel consolidado com score/habilitação/jurídico

**`corEtapa`** — cor da borda esquerda do card e do badge de etapa no drawer (hex). Se null, usa a cor existente da coluna.

**`papelResponsavel`** — role sugerido para essa etapa (ex: "comercial", "tecnico", "juridico", "diretor"). Informativo — não bloqueia.

### Checklist por Coluna (já existe parcialmente)

O sistema já tem infra de checklist por coluna (`ChecklistEtapaPanel`). Expandi-la para:
- Itens do checklist podem ter `tipo`: `manual` (checkbox) ou `automatico` (marcado pelo sistema)
- Itens automáticos: "Análise profunda" marca quando `AcaoIa` tipo `analise_profunda` com status `concluido` existe
- Progresso calculado: `itensCompletos / totalItens`

### API: Expandir endpoints de coluna

**PATCH `/api/colunas/[id]`** — aceitar campos novos: `acoesPadrao`, `corEtapa`, `papelResponsavel`

**GET `/api/colunas`** — retornar campos novos

### UI: Configurações → Colunas

Expandir `ColunasEditor` para mostrar os novos campos:
- Multi-select de ações disponíveis
- Color picker para cor da etapa
- Select de papel responsável

---

## 2. Drawer Adaptativo

### Estrutura do drawer redesenhado

Quando o card NÃO é novo (modo edição), o drawer mostra 3 blocos na seguinte ordem:

#### Bloco 1: "O que fazer agora" (checklist da etapa)

- Título: nome da coluna + badge colorido
- Responsável atribuído (ou "sem responsável")
- Progresso: "2/4 feito" com mini barra
- Lista de itens do checklist:
  - Itens automáticos: marcados/desmarcados pelo sistema, não clicáveis
  - Itens manuais: checkbox clicável
- Cor de fundo e borda lateral segue `corEtapa` da coluna

#### Bloco 2: "Ações desta etapa" (botões contextuais)

- Mostra APENAS os botões definidos em `acoesPadrao` da coluna atual
- Botão primário (primeiro da lista) tem destaque visual (cor sólida)
- Demais botões são outline/secundários
- Se a coluna tem `resumo_executivo` nas ações, mostra o painel consolidado ao invés de botões

#### Bloco 3: Avançar / Voltar

- Botão "Avançar → [próxima coluna]" (verde)
- Botão "Descartar" ou "Voltar" (vermelho outline)
- Se coluna destino é `final_negativo`, pede motivo (comportamento existente)

#### Abaixo: Seções colapsadas

Tudo que hoje aparece aberto no drawer vai para seções colapsáveis:
- "Dados da licitação" (campos editáveis)
- "Análise profunda" (componente existente)
- "Score / Parecer" (link + resumo)
- "Análises gravadas" (histórico IA)
- "Histórico de movimentos" (timeline)
- "Dados extraídos" (JSON)

Todas começam **fechadas** por padrão. O foco é no Bloco 1 + 2.

### Lógica de adaptação

```typescript
// Pseudo-código
const coluna = card.coluna;
const checklist = coluna.checklistTemplate; // itens padrão
const acoes = coluna.acoesPadrao;           // botões a mostrar
const cor = coluna.corEtapa ?? coluna.cor;  // cor do destaque

// Calcular progresso
const itensCompletos = checklist.filter(item =>
  item.tipo === 'automatico'
    ? verificarAutoComplete(item, licitacao)
    : item.marcado
).length;

const progresso = itensCompletos / checklist.length;
```

### Componentes novos/alterados

| Componente | Ação |
|---|---|
| `components/detalhe/BlocoOQueFazer.tsx` | **NOVO** — Checklist da etapa com progresso |
| `components/detalhe/BlocoAcoesEtapa.tsx` | **NOVO** — Botões contextuais baseados em `acoesPadrao` |
| `components/detalhe/BlocoAvancar.tsx` | **NOVO** — Avançar/voltar/descartar |
| `components/detalhe/ResumoExecutivo.tsx` | **NOVO** — Painel consolidado para etapa de decisão |
| `components/detalhe/LicitacaoDrawer.tsx` | **ALTERAR** — Reorganizar: 3 blocos no topo + seções colapsadas |

---

## 3. Kanban Card Enriquecido

### Informações novas no card

1. **Barra de progresso** — mini barra horizontal mostrando progresso do checklist (ex: 2/3)
2. **Avatar do responsável** — círculo com iniciais. Cinza com "?" se não atribuído
3. **Prazo com contagem regressiva** — "Sessão em 5 dias" (amarelo), "Sessão AMANHÃ" (vermelho)
4. **Score badge** — classificação + score compacto (ex: "A 82")
5. **Borda lateral colorida** — usa `corEtapa` da coluna

### Alertas visuais no card

- **Borda vermelha** quando sessão é amanhã ou já passou
- **Texto "⚠ X docs vencidos"** quando cruzamento habilitação detecta pendências
- **Opacidade reduzida** quando sem responsável (chama atenção do gestor)

### Dados necessários na API

**GET `/api/licitacoes`** — incluir nos dados retornados:
- `checklistProgresso: { completos: number, total: number }` — calculado no backend
- `card.responsavel: { name, initials }` — já vem parcialmente
- `dataSessao` — já existe
- `score: { classificacao, scoreFinal }` — join com LicitacaoScore

### Componentes alterados

| Componente | Ação |
|---|---|
| `components/kanban/KanbanCard.tsx` | **ALTERAR** — Adicionar barra progresso, avatar, prazo, score badge, borda colorida |

---

## 4. Ações IA Novas

### Análise Jurídica

Nova ação IA tipo `analise_juridica`:
- Prompt: analisa edital buscando cláusulas restritivas, riscos legais, possibilidade de impugnação
- Usa dados da análise profunda (documentos já baixados) como contexto
- Resultado: JSON com `clausulasRestritivas[]`, `riscosLegais[]`, `cabeImpugnacao: boolean`, `fundamentacao`

**Arquivo:** `lib/ia/prompts/analise-juridica.ts`

### Checar Habilitação (cruzamento)

Nova ação que cruza exigências do edital (extraídas pela análise profunda) com documentos da empresa:
- Busca `resumo.habilitacao` da análise profunda
- Busca `DocumentoEmpresa` usando o CNPJ da empresa padrão (model `Empresa` id="default" — futuro: multi-CNPJ se necessário)
- Retorna: quais docs estão OK, quais faltam, quais estão vencidos

**Arquivo:** `lib/analise-profunda/checar-habilitacao.ts`

### Resumo Executivo

Consolida todas as análises realizadas em um painel único:
- Score + classificação
- Recomendação do parecer
- Status da habilitação
- Status jurídico
- Valor estimado + itens
- Todas as flags (riscos, oportunidades)

**Arquivo:** `components/detalhe/ResumoExecutivo.tsx` (componente de UI, sem backend novo)

---

## 5. Fluxo de Exemplo Completo

```
Busca PNCP → Adiciona ao kanban
                    ↓
            [Coluna: Triagem]
            - Auto: análise profunda roda
            - Checklist: verificar segmento, rodar triagem IA, decidir
            - Responsável: Comercial
            - Ações: [triagem_ia, analise_profunda]
                    ↓ Avançar
            [Coluna: Análise]
            - Checklist: revisar resumo, analisar docs, checar habilitação, sugerir proposta
            - Responsável: Técnico
            - Ações: [analise_profunda, checar_habilitacao, sugerir_proposta]
            - Alerta: docs vencidos se houver
                    ↓ Avançar
            [Coluna: Jurídico]
            - Checklist: análise jurídica, avaliar cláusulas, decidir impugnação
            - Responsável: Jurídico
            - Ações: [analise_juridica, redigir_impugnacao]
                    ↓ Avançar
            [Coluna: Proposta/Decisão]
            - Checklist: revisar análises, aprovar proposta, decisão final
            - Responsável: Diretor
            - Ações: [resumo_executivo]
            - Painel: resumo executivo consolidado
                    ↓
            [Participar] ou [Não participar]
```

---

## 6. O que NÃO muda

- Número de páginas (está ok)
- Sidebar navigation (está ok)
- Página de configurações (só expande ColunasEditor)
- PNCP search page (funciona bem)
- Modelo de dados principal (Licitacao, KanbanCard — sem alteração)
- Análise profunda existente (continua funcionando)

---

## 7. Escopo de Implementação

### Fase 1: Infra (schema + APIs)
- Campos novos em KanbanColuna
- prisma db push
- Expandir API de colunas
- Seed de colunas padrão com acoesPadrao

### Fase 2: Drawer Adaptativo
- BlocoOQueFazer, BlocoAcoesEtapa, BlocoAvancar
- Refatorar LicitacaoDrawer (3 blocos + seções colapsadas)
- Lógica de progresso automático

### Fase 3: Kanban Card Enriquecido
- Barra de progresso, avatar, prazo, score badge
- Alertas visuais
- Incluir dados extras na API de licitações

### Fase 4: Ações IA Novas
- Análise jurídica (prompt + API)
- Checar habilitação (cruzamento docs)
- Resumo executivo (componente UI)

### Fase 5: Configuração UI
- ColunasEditor expandido (ações, cor etapa, papel)

### Fase 6: Deploy
- Build + commit + push + VPS
