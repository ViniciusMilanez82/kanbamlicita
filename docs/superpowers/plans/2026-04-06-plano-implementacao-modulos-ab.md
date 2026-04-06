# Plano de Implementação — Módulos A (gaps) + B + Transversais

**Data:** 2026-04-06
**Objetivo:** Priorizar e detalhar a implementação de tudo que falta no KanbanLicita.

---

## Critérios de priorização

| Critério | Peso |
|----------|------|
| Valor de negócio direto (reduz perda de oportunidade / gera inteligência) | 40% |
| Dependência técnica (é pré-requisito de outros itens?) | 25% |
| Complexidade de implementação | 20% |
| Aproveitamento do que já existe | 15% |

---

## Visão geral das Fases

```
Fase 1 — Resultado de Licitação + Base Competitiva     (1 sprint)
Fase 2 — Checklist por Edital + Go/No-Go               (1 sprint)
Fase 3 — Dashboard de Inteligência Competitiva          (1 sprint)
Fase 4 — Banco de Atestados + Gerador de Declarações    (1 sprint)
Fase 5 — Alertas Multicanal + Certidões Automáticas     (1 sprint)
Fase 6 — Pricing Assist + Perfil de Concorrente         (1 sprint)
```

---

## FASE 1 — Resultado de Licitação + Base Competitiva

**Por que primeiro?** Sem registrar resultados estruturados (quem ganhou, por quanto, por quê perdemos), nenhum dashboard competitivo funciona. É a fundação de todo o Módulo B.

### 1.1 — Schema: Novos models

```prisma
// ==================== ANÁLISE COMPETITIVA (MÓDULO B) ====================

model Concorrente {
  id            String   @id @default(cuid())
  nome          String
  cnpj          String?  @unique @db.VarChar(18)
  segmentos     String[] // offshore, industrial, eventos, etc.
  porte         String?  // micro, pequena, media, grande
  uf            String?
  observacoes   String?  @db.Text
  ativo         Boolean  @default(true)
  criadoEm      DateTime @default(now()) @map("criado_em")
  atualizadoEm  DateTime @updatedAt @map("atualizado_em")

  resultados    ResultadoLicitacao[]

  @@map("concorrentes")
}

model ResultadoLicitacao {
  id                    String    @id @default(cuid())
  licitacaoId           String    @unique @map("licitacao_id")
  resultado             String    // ganhou, perdeu, desistiu, inabilitado, sem_proposta
  empresaVencedoraId    String?   @map("empresa_vencedora_id")
  nomeVencedorExterno   String?   @map("nome_vencedor_externo")
  valorVencedor         Decimal?  @map("valor_vencedor") @db.Decimal(15, 2)
  valorNossaProposta    Decimal?  @map("valor_nossa_proposta") @db.Decimal(15, 2)
  diferencaPercentual   Float?    @map("diferenca_percentual")
  criterioJulgamento    String?   @map("criterio_julgamento") // menor_preco, tecnica_preco, maior_desconto
  motivoDerrota         String?   @map("motivo_derrota")      // preco, tecnica, habilitacao, prazo, desistencia
  motivoDetalhado       String?   @map("motivo_detalhado") @db.Text
  licoesAprendidas      String?   @map("licoes_aprendidas") @db.Text
  registradoPorId       String?   @map("registrado_por_id")
  criadoEm              DateTime  @default(now()) @map("criado_em")
  atualizadoEm          DateTime  @updatedAt @map("atualizado_em")

  licitacao        Licitacao     @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)
  empresaVencedora Concorrente?  @relation(fields: [empresaVencedoraId], references: [id])
  registradoPor    User?         @relation(fields: [registradoPorId], references: [id])
  itensResultado   ItemResultado[]

  @@map("resultados_licitacao")
}

model ItemResultado {
  id                  String   @id @default(cuid())
  resultadoId         String   @map("resultado_id")
  descricao           String
  categoria           String?  // mapeado para CategoriasProduto
  quantidade          Float?
  unidade             String?
  valorUnitarioNosso  Decimal? @map("valor_unitario_nosso") @db.Decimal(15, 2)
  valorUnitarioVencedor Decimal? @map("valor_unitario_vencedor") @db.Decimal(15, 2)
  criadoEm            DateTime @default(now()) @map("criado_em")

  resultado ResultadoLicitacao @relation(fields: [resultadoId], references: [id], onDelete: Cascade)

  @@map("itens_resultado")
}
```

### 1.2 — Tarefas

| # | Tarefa | Arquivos | Complexidade |
|---|--------|----------|-------------|
| 1.1 | Adicionar models ao schema.prisma + migration | `prisma/schema.prisma` | Baixa |
| 1.2 | CRUD API de Concorrentes | `app/api/concorrentes/route.ts`, `app/api/concorrentes/[id]/route.ts` | Baixa |
| 1.3 | Tela de Cadastro de Concorrentes | `components/concorrentes/ConcorrentesClient.tsx`, `app/concorrentes/page.tsx` | Média |
| 1.4 | Formulário de Resultado no MoverCardModal | Expandir `MoverCardModal.tsx` — ao mover para "Ganhamos" ou "Perdemos", exigir dados estruturados | Média |
| 1.5 | API de Resultado de Licitação | `app/api/licitacoes/[id]/resultado/route.ts` | Baixa |
| 1.6 | Tab "Resultado" no detalhe da licitação | `components/licitacao/ResultadoTab.tsx` | Média |
| 1.7 | Adicionar link "Concorrentes" no SidebarNav | `components/layout/SidebarNav.tsx` | Baixa |

**Entregável:** Ao mover um card para coluna final, o usuário registra resultado completo (vencedor, valor, motivo). Concorrentes são cadastrados e linkados.

---

## FASE 2 — Checklist por Edital + Etapa Go/No-Go

**Por que segundo?** É o gap mais sentido operacionalmente (RF-A04) e a etapa Go/No-Go é o gap transversal mais crítico.

### 2.1 — Schema

```prisma
model ChecklistEdital {
  id            String   @id @default(cuid())
  licitacaoId   String   @map("licitacao_id")
  nome          String   // Ex: "CND Federal", "Atestado técnico", "Proposta comercial"
  categoria     CategoriaHabilitacao
  obrigatorio   Boolean  @default(true)
  status        String   @default("pendente") // pendente, atendido, nao_atendido, parcial
  documentoEmpresaId String? @map("documento_empresa_id") // vínculo com doc vigente
  observacoes   String?  @db.Text
  ordem         Int      @default(0)
  criadoEm      DateTime @default(now()) @map("criado_em")
  atualizadoEm  DateTime @updatedAt @map("atualizado_em")

  licitacao        Licitacao         @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)
  documentoEmpresa DocumentoEmpresa? @relation(fields: [documentoEmpresaId], references: [id])

  @@map("checklist_edital")
}

model DecisaoGoNoGo {
  id            String   @id @default(cuid())
  licitacaoId   String   @unique @map("licitacao_id")
  decisao       String   // go, no_go, condicional
  scoreNoMomento Float?  @map("score_no_momento")
  checklistPronto Boolean @default(false) @map("checklist_pronto")
  valorEstimadoCapturavel Decimal? @map("valor_estimado_capturavel") @db.Decimal(15, 2)
  riscosIdentificados Json? @map("riscos_identificados")
  justificativa String?  @db.Text
  decidido PorId String? @map("decidido_por_id")
  criadoEm      DateTime @default(now()) @map("criado_em")

  licitacao    Licitacao @relation(fields: [licitacaoId], references: [id], onDelete: Cascade)
  decidido Por User?     @relation(fields: [decidido PorId], references: [id])

  @@map("decisoes_go_nogo")
}
```

### 2.2 — Tarefas

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 2.1 | Models + migration | Baixa |
| 2.2 | API CRUD checklist por edital (`/api/licitacoes/[id]/checklist`) | Média |
| 2.3 | Geração automática de checklist a partir dos requisitos do edital (via IA) | Alta |
| 2.4 | Vinculação automática: comparar itens do checklist com DocumentoEmpresa vigentes → semáforo | Média |
| 2.5 | Tab "Habilitação" no detalhe da licitação com semáforo visual | Média |
| 2.6 | Botão "Exportar envelope" — snapshot PDF dos documentos vinculados | Média |
| 2.7 | Etapa Go/No-Go: modal/painel antes de avançar para "Proposta/Documentação" | Média |
| 2.8 | API de decisão Go/No-Go (`/api/licitacoes/[id]/go-nogo`) | Baixa |
| 2.9 | Regra no Kanban: não avança para coluna "Proposta" sem decisão Go registrada | Baixa |

**Entregável:** Cada edital tem checklist específico com semáforo de documentos. Decisão Go/No-Go é obrigatória antes de avançar.

---

## FASE 3 — Dashboard de Inteligência Competitiva

**Por que terceiro?** Com resultados sendo registrados (Fase 1), agora podemos criar os dashboards e relatórios.

### 3.1 — Tarefas

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 3.1 | API de métricas competitivas (`/api/relatorios/competitivo`) | Alta |
| 3.2 | Win rate geral e por segmento/modalidade/UF | Média |
| 3.3 | Ticket médio (nosso vs. vencedor) | Baixa |
| 3.4 | Ranking de concorrentes (quem mais nos venceu, por qual motivo) | Média |
| 3.5 | Análise de derrotas (treemap/pie: preço, técnica, habilitação, prazo) | Média |
| 3.6 | Heatmap de oportunidades por UF + segmento | Média |
| 3.7 | Tendência temporal (win rate por mês, valor médio por mês) | Média |
| 3.8 | Tela DashboardCompetitivo.tsx com filtros (período, segmento, UF, modalidade) | Alta |
| 3.9 | Exportação CSV/PDF dos relatórios competitivos | Média |
| 3.10 | Link no SidebarNav → "Inteligência" | Baixa |

**Entregável:** Dashboard visual com win rate, ranking de concorrentes, análise de derrotas, heatmap geográfico e tendências.

---

## FASE 4 — Banco de Atestados + Gerador de Declarações

**Por que quarto?** Complementa a gestão documental (já funcional) com funcionalidades específicas que o PRD exige.

### 4.1 — Schema (Atestados)

```prisma
model AtestadoTecnico {
  id                  String   @id @default(cuid())
  documentoEmpresaId  String   @map("documento_empresa_id")
  clienteNome         String   @map("cliente_nome")
  clienteCnpj         String?  @map("cliente_cnpj") @db.VarChar(18)
  descricaoServico    String   @map("descricao_servico") @db.Text
  tags                String[] // offshore, industrial, eventos, modular, refrigerado
  valorContrato       Decimal? @map("valor_contrato") @db.Decimal(15, 2)
  dataInicio          DateTime? @map("data_inicio")
  dataFim             DateTime? @map("data_fim")
  possuiCat           Boolean  @default(false) @map("possui_cat")
  numeroCat           String?  @map("numero_cat")
  observacoes         String?  @db.Text
  criadoEm            DateTime @default(now()) @map("criado_em")
  atualizadoEm        DateTime @updatedAt @map("atualizado_em")

  documentoEmpresa DocumentoEmpresa @relation(fields: [documentoEmpresaId], references: [id], onDelete: Cascade)

  @@map("atestados_tecnicos")
}

model TemplateDeclaracao {
  id              String   @id @default(cuid())
  nome            String
  descricao       String?  @db.Text
  categoria       String   // tipo: idoneidade, visita_tecnica, ME_EPP, inexistencia_fato, etc.
  conteudoHtml    String   @map("conteudo_html") @db.Text // template com {{placeholders}}
  variaveis       Json     // lista de variáveis disponíveis
  ativo           Boolean  @default(true)
  criadoEm        DateTime @default(now()) @map("criado_em")
  atualizadoEm    DateTime @updatedAt @map("atualizado_em")

  @@map("templates_declaracao")
}
```

### 4.2 — Tarefas

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 4.1 | Models + migration | Baixa |
| 4.2 | Tela de atestados com metadados enriquecidos | Média |
| 4.3 | Busca inteligente de atestados por tags/segmento/valor | Média |
| 4.4 | Sugestão automática: dado o edital, quais atestados atendem? | Alta |
| 4.5 | CRUD de templates de declaração | Média |
| 4.6 | Renderizador de declaração (preenche variáveis + gera PDF) | Alta |
| 4.7 | Integração com checklist do edital (vincular declaração gerada) | Média |

**Entregável:** Banco de atestados com busca por tags, sugestão automática para editais. Declarações geradas automaticamente a partir de templates.

---

## FASE 5 — Alertas Multicanal + Certidões Automáticas

**Por que quinto?** São automações que economizam tempo mas não bloqueiam o fluxo principal.

### 5.1 — Tarefas

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 5.1 | Integração com Resend (e-mail transacional) | Média |
| 5.2 | Templates de e-mail para alertas (doc vencendo, prazo licitação, score alto) | Média |
| 5.3 | Cron job de envio de alertas por e-mail (diário) | Média |
| 5.4 | Integração WhatsApp via API (Evolution API ou Z-API) | Alta |
| 5.5 | Configuração de canais de alerta por usuário (in-app, e-mail, WhatsApp) | Média |
| 5.6 | Cron job de emissão automática de certidões (CND, CRF, CNDT) via scraping ou API | Alta |
| 5.7 | Upload automático da certidão emitida no repositório + substituição de versão | Média |
| 5.8 | Log de tentativas de emissão (sucesso/falha) | Baixa |

**Entregável:** Alertas chegam por e-mail e WhatsApp. Certidões são renovadas automaticamente antes do vencimento.

---

## FASE 6 — Pricing Assist + Perfil de Concorrente

**Por que último?** Depende de massa de dados acumulada (resultados, preços, concorrentes).

### 6.1 — Tarefas

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 6.1 | Histórico de preços por categoria de produto | Média |
| 6.2 | API de sugestão de faixa de preço (baseada em histórico + concorrentes) | Alta |
| 6.3 | Painel de pricing no detalhe da licitação | Média |
| 6.4 | Ficha de concorrente (página dedicada com timeline, confrontos, métricas) | Alta |
| 6.5 | Confrontos diretos (nós vs. concorrente X — histórico) | Média |
| 6.6 | SLAs entre etapas do Kanban com alertas de prazo | Média |
| 6.7 | Sub-status da coluna Disputa (lances, habilitação, recurso, homologação) | Média |
| 6.8 | Alçada de aprovação por faixa de valor | Média |

**Entregável:** Sugestão inteligente de preços, perfil completo de concorrentes, SLAs operacionais e workflow de aprovação.

---

## Resumo de esforço estimado

| Fase | Foco | Models novos | APIs novas | Componentes novos | Complexidade |
|------|------|-------------|------------|-------------------|-------------|
| 1 | Resultado + Base Competitiva | 3 | 4 | 3 | ⭐⭐ |
| 2 | Checklist Edital + Go/No-Go | 2 | 3 | 3 | ⭐⭐⭐ |
| 3 | Dashboard Competitivo | 0 | 2 | 1 (grande) | ⭐⭐⭐ |
| 4 | Atestados + Declarações | 2 | 4 | 4 | ⭐⭐⭐ |
| 5 | Alertas + Certidões | 0 | 3 | 2 | ⭐⭐⭐⭐ |
| 6 | Pricing + Perfil + SLAs | 0 | 4 | 4 | ⭐⭐⭐⭐ |

---

## Dependências entre fases

```
Fase 1 ──→ Fase 3 (dashboard precisa de resultados)
Fase 1 ──→ Fase 6 (pricing precisa de histórico de preços)
Fase 2 ──→ Fase 4 (checklist edital usa atestados + declarações)
Fase 4 ──→ Fase 5 (certidões automáticas alimentam repositório)

Fases independentes: 1 e 2 podem rodar em paralelo.
```

---

## Ordem recomendada de execução

```
Sprint 1:  Fase 1 (Resultado + Concorrentes) ← COMEÇAR AQUI
Sprint 2:  Fase 2 (Checklist + Go/No-Go)
Sprint 3:  Fase 3 (Dashboard Competitivo)
Sprint 4:  Fase 4 (Atestados + Declarações)
Sprint 5:  Fase 5 (Alertas + Certidões)
Sprint 6:  Fase 6 (Pricing + Perfil + SLAs)
```
