# Sistema de Captação, Triagem e Gestão de Licitações da Multiteiner
## Documento-Mãe do Projeto

**Versão:** 1.0  
**Data:** 2026-03-24  
**Empresa:** Multiteiner  
**Objetivo do documento:** consolidar a visão funcional, técnica e operacional do sistema de captação automática de licitações com Kanban, análises por IA, score comercial e priorização de oportunidades.

---

# 1. Visão geral do produto

## 1.1 Contexto
A Multiteiner precisa de um sistema para captar licitações automaticamente, analisar aderência ao seu mercado e organizar o funil operacional em um quadro Kanban.

A grande dificuldade do mercado não é apenas encontrar licitações com as palavras “container” ou “módulo”, mas identificar oportunidades em que o escopo da empresa aparece de forma indireta ou escondida em:
- objetos genéricos
- termos de referência
- lotes
- itens
- memoriais
- anexos técnicos
- planilhas orçamentárias

Esse sistema deve reduzir perda de oportunidades, melhorar a triagem comercial e criar disciplina operacional.

## 1.2 Objetivo principal
Criar um sistema que:
- capte licitações automaticamente por API
- normalize e deduplique registros
- aplique triagem automática inicial
- organize o fluxo em Kanban
- permita análises manuais e por IA
- calcule score de oportunidade
- estime valor capturável
- identifique risco de falso negativo
- gere parecer executivo comercial

## 1.3 Resultado esperado
Ao final do MVP, a Multiteiner deverá conseguir:
- visualizar rapidamente todas as oportunidades captadas
- saber quais licitações merecem esforço comercial
- não perder editais com oportunidade oculta
- controlar o funil até ganho, perda ou descarte
- registrar todo o racional da análise

---

# 2. Objetivos de negócio

## 2.1 Objetivos estratégicos
- não perder oportunidades por leitura superficial
- aumentar a velocidade da triagem
- organizar o pipeline comercial de licitações
- priorizar editais com maior valor capturável
- registrar inteligência comercial para reuso futuro

## 2.2 Objetivos operacionais
- reduzir esforço manual de busca
- centralizar dados e documentos
- padronizar análise
- criar rastreabilidade de decisões
- dar foco diário ao time

## 2.3 Princípios do sistema
- captação automática primeiro
- análise explicável
- falso negativo é mais perigoso que falso positivo
- valor capturável importa mais do que valor global
- não descartar sem justificativa

---

# 3. Escopo do MVP

## 3.1 O que entra no MVP
- captação automática por API
- persistência de payload bruto
- normalização
- deduplicação
- criação automática de card no Kanban
- Kanban operacional
- detalhe completo da licitação
- módulo de análises por IA
- score da oportunidade
- valor capturável
- risco de falso negativo
- parecer executivo
- painel de prioridades
- histórico e travas operacionais

## 3.2 O que fica para depois
- múltiplas fontes privadas complexas logo no início
- automações comerciais avançadas
- analytics sofisticado
- integração com ERP/CRM externo no primeiro momento
- workflow de parceria/subfornecimento muito avançado

---

# 4. Público usuário

## 4.1 Perfis principais
- gestor comercial
- analista de licitações
- analista técnico
- administrador do sistema
- diretoria

## 4.2 Necessidades por perfil
### Gestor comercial
- priorização rápida
- visão do pipeline
- parecer executivo

### Analista de licitações
- leitura documental
- controle de prazos
- análise de aderência
- itens/lotes

### Analista técnico
- documentos
- escopo
- lotes e planilhas
- apoio à composição

### Administrador
- fontes
- jobs
- status de sincronização
- configuração

### Diretoria
- visão consolidada
- oportunidades mais relevantes
- taxa de ganho/perda
- valor potencial

---

# 5. Contexto da Multiteiner

## 5.1 Segmentos prioritários
- construção civil
- eventos
- offshore
- operações industriais
- apoio logístico
- setor público em geral

## 5.2 Portfólio principal
- containers adaptados
- módulos habitacionais
- módulos administrativos
- módulos sanitários
- guaritas
- almoxarifados
- refeitórios
- alojamentos
- escritórios de obra
- bases operacionais
- estruturas temporárias modulares

## 5.3 Realidade da triagem
Na prática, a oportunidade da Multiteiner aparece muito em:
- obras
- eventos
- offshore
- apoio operacional
- estruturas temporárias
- permanência humana em campo
- bases de apoio
- unidades temporárias

Por isso, o sistema deve valorizar:
- aderência por aplicação
- contexto oculto
- falso negativo provável

---

# 6. Funil operacional em Kanban

## 6.1 Colunas do Kanban
1. Captadas Automaticamente  
2. Triagem Inicial  
3. Em Análise  
4. Viável Comercialmente  
5. Proposta / Documentação  
6. Enviadas / Participando  
7. Ganhamos  
8. Perdemos  
9. Descartadas  

## 6.2 Papel de cada coluna

### Captadas Automaticamente
Entram licitações trazidas por API, ainda sem análise humana profunda.

### Triagem Inicial
Primeira leitura rápida para decidir se vale aprofundar.

### Em Análise
Etapa de leitura mais detalhada, análise documental e IA.

### Viável Comercialmente
Oportunidades com aderência confirmada e esforço comercial recomendado.

### Proposta / Documentação
Licitações em preparação ativa.

### Enviadas / Participando
Licitações com participação confirmada ou proposta enviada.

### Ganhamos
Oportunidades vencidas.

### Perdemos
Oportunidades perdidas com registro de motivo.

### Descartadas
Fora do foco ou inviáveis, com justificativa obrigatória.

## 6.3 Regras de negócio essenciais
- não descartar sem motivo
- não descartar sem falso negativo preenchido
- não sair de Em Análise sem score, valor capturável e classificação
- risco alto de falso negativo bloqueia descarte automático

---

# 7. Captação automática por API

## 7.1 Conceito
O sistema não depende de cadastro manual como origem principal. A licitação nasce pela ingestão automática e o time entra a partir da triagem.

## 7.2 Fontes iniciais sugeridas
- PNCP
- Compras.gov.br
- outras fontes públicas e privadas depois

## 7.3 Pipeline técnico
1. consulta de API  
2. armazenamento bruto  
3. normalização  
4. deduplicação  
5. upsert  
6. score preliminar  
7. entrada automática no Kanban  
8. análise humana + IA  

## 7.4 Jobs sugeridos
- `sync_sources_job`
- `normalize_ingested_records_job`
- `deduplicate_records_job`
- `pre_score_job`
- `kanban_routing_job`
- `deadline_alert_job`

## 7.5 Regras automáticas de entrada
- score preliminar `< 45` → Captadas Automaticamente
- score preliminar `45 a 69` → Triagem Inicial
- score preliminar `>= 70` → Em Análise
- risco alto de falso negativo → nunca descartar automaticamente
- sessão próxima → marcar urgente

---

# 8. Normalização e deduplicação

## 8.1 Objetivo
Transformar dados heterogêneos em formato padrão e evitar cards duplicados.

## 8.2 Estratégia de dedupe
### Regra 1 — id externo da fonte
Usar sempre que confiável.

### Regra 2 — número + órgão + data
Fallback principal.

### Regra 3 — hash do objeto normalizado
Usar para reforçar confiança.

### Regra 4 — tolerância a pequenas variações
Normalizar:
- caixa
- acentuação
- espaços
- pontuação
- abreviações comuns

### Regra 5 — duplicado atualiza
Duplicado não cria card novo.

### Regra 6 — caso duvidoso
Vai para revisão como possível duplicidade.

## 8.3 Estratégia de hash
- `hash_exato`
- `hash_semantico_curto`
- `hash_objeto`

---

# 9. Triagem comercial da Multiteiner

## 9.1 Lógica central
O sistema não deve depender só de palavras exatas como “container” ou “módulo”.

Ele deve encontrar:
- aderência direta
- aderência por aplicação
- aderência por contexto oculto
- oportunidade escondida em item, lote, TR ou anexo

## 9.2 Aderência direta
Exemplos:
- container
- contêiner
- módulo habitacional
- unidade modular
- solução modular
- construção modular

## 9.3 Aderência por aplicação
Exemplos:
- escritório
- alojamento
- dormitório
- refeitório
- banheiro
- sanitário
- vestiário
- guarita
- posto médico
- ambulatório
- almoxarifado
- depósito
- base operacional
- base de apoio
- camarim
- bilheteria
- posto de atendimento

## 9.4 Contexto oculto
Exemplos:
- instalações provisórias
- instalação temporária
- estrutura provisória
- estrutura temporária
- infraestrutura temporária
- apoio operacional
- apoio logístico
- apoio em campo
- apoio de obra
- canteiro de obras
- vivência
- permanência
- acomodação
- base de apoio
- unidade de apoio
- instalação emergencial
- estrutura de contingência

## 9.5 Modelo comercial compatível
Exemplos:
- locação
- aluguel
- fornecimento com instalação
- montagem
- desmontagem
- mobilização
- desmobilização
- transporte
- adaptação
- implantação

---

# 10. Score da oportunidade

## 10.1 Objetivo
Transformar leitura técnica e comercial em prioridade operacional.

## 10.2 Escala
- 85 a 100 → A+
- 70 a 84 → A
- 55 a 69 → B
- 40 a 54 → C
- 0 a 39 → D

## 10.3 Pesos ajustados para a Multiteiner
```json
{
  "aderencia_direta": 15,
  "aderencia_aplicacao": 25,
  "aderencia_contexto_oculto": 20,
  "modelo_comercial_compativel": 15,
  "potencial_economico_capturavel": 15,
  "qualidade_evidencia_documental": 10
}
```

## 10.4 Justificativa do ajuste
Para a Multiteiner, o edital raramente vem “escrito do jeito ideal”. Por isso:
- aplicação vale mais
- contexto oculto vale muito
- falso negativo precisa ser tratado como risco central

## 10.5 Componentes do score
- aderência direta
- aderência por aplicação
- aderência por contexto oculto
- modelo comercial compatível
- potencial econômico capturável
- qualidade da evidência documental

---

# 11. Valor capturável estimado

## 11.1 Conceito
O valor global do edital não é suficiente. O sistema deve estimar quanto da licitação é realmente capturável pela Multiteiner.

## 11.2 Regras
- campo obrigatório
- pode ser valor exato
- pode ser faixa
- pode ser “não foi possível estimar com segurança”, mas com justificativa

## 11.3 Métodos aceitos
- `por_item_planilhado`
- `por_quantitativo_x_preco_referencia`
- `por_lote_relacionado`
- `por_inferencia_de_escopo`
- `nao_estimado`

## 11.4 Campos mínimos
- foi possível estimar?
- valor estimado
- faixa
- nível de confiança
- método
- justificativa
- base documental

---

# 12. Falso negativo provável

## 12.1 Conceito
Risco de a oportunidade ser descartada indevidamente porque o título ou o objeto principal parecem genéricos.

## 12.2 Campo obrigatório
Toda licitação deve registrar:
- existe risco?
- nível do risco
- motivos
- trechos críticos
- resumo

## 12.3 Motivos padronizados
- `titulo_generico`
- `objeto_amplo_demais`
- `aderencia_escondida_em_lote`
- `aderencia_escondida_em_item`
- `aderencia_escondida_em_tr`
- `aderencia_escondida_em_planilha`
- `aderencia_escondida_em_memorial`
- `aderencia_escondida_em_anexo_tecnico`
- `linguagem_indireta`
- `nao_menciona_container_ou_modulo`
- `valor_global_mascara_valor_capturavel`
- `oportunidade_parcial_dentro_de_escopo_maior`

## 12.4 Regra operacional
Se houver risco alto:
- não permitir descarte automático
- exigir revisão humana

---

# 13. Módulo de análises por IA

## 13.1 Objetivo
Dar ao sistema várias análises especializadas, em vez de uma análise única genérica.

## 13.2 Tipos de análise
- leitura rápida
- aderência ao portfólio
- oportunidade oculta
- análise de lotes e itens
- score da oportunidade
- valor capturável
- falso negativo
- parecer executivo

## 13.3 Modo manual
O usuário escolhe qual análise rodar.

## 13.4 Modo automático
O sistema roda análises conforme a etapa do Kanban.

### Exemplo
- Captadas Automaticamente → leitura rápida + aderência inicial
- Triagem Inicial → aderência + falso negativo inicial
- Em Análise → oportunidade oculta + lotes/itens + score + valor capturável
- Viável Comercialmente → parecer executivo

## 13.5 Regras
- antes de descartar: falso negativo + parecer
- antes de Viável Comercialmente: score + valor capturável + parecer
- oportunidade oculta forte pode subir prioridade
- falso negativo alto bloqueia descarte automático

---

# 14. Wireframe textual das telas

## 14.1 Tela 1 — Kanban Principal

### Estrutura
- cabeçalho com título, sincronizar agora, atualizar scores
- linha de métricas
- barra de filtros
- board com 9 colunas
- cards com dados principais

### Métricas rápidas
- captadas hoje
- em análise
- A+ e A
- urgentes
- risco alto de falso negativo

### Filtros
- busca textual
- segmento
- classificação
- responsável
- UF
- sessão até
- urgentes
- risco alto

### Estrutura do card
- badges: segmento, classificação, urgência, falso negativo
- órgão
- número
- objeto curto
- UF/município
- modalidade
- data sessão
- valor global
- valor capturável
- score
- responsável
- ações rápidas

## 14.2 Tela 2 — Detalhe da Licitação

### Cabeçalho
- órgão
- número
- modalidade
- objeto resumido
- status Kanban
- score
- classificação
- valor capturável
- recomendação

### Ações
- mover no Kanban
- rodar análise IA
- editar
- abrir origem
- observação

### Abas
- Resumo
- Documentos
- Itens / Lotes
- Análise
- Análises por IA
- Score
- Parecer
- Histórico

## 14.3 Aba Resumo
- dados principais
- dados operacionais
- objeto completo
- natureza do objeto

## 14.4 Aba Documentos
Tabela:
- tipo
- nome
- status
- origem
- data
- ações

## 14.5 Aba Itens / Lotes
Tabela:
- tipo
- identificador
- descrição
- quantitativo
- unidade
- aderência
- prioridade
- valor estimado
- observações
- ações

## 14.6 Aba Análise
Blocos:
- aderência ao portfólio
- valor capturável
- falso negativo
- observações do analista

## 14.7 Aba Análises por IA
- botões de rodar análise
- tabela de execuções
- drawer/modal do resultado

## 14.8 Aba Score
- score final
- classificação
- barras por componente
- justificativa

## 14.9 Aba Parecer
- vale esforço comercial?
- recomendação final
- tipo de oportunidade
- onde está a oportunidade
- o que ofertar
- próximo passo
- riscos

## 14.10 Aba Histórico
Timeline com:
- captura
- sincronizações
- movimentações
- análises
- alterações manuais
- decisão final

## 14.11 Tela 3 — Painel de Prioridades
Blocos:
- KPIs do dia
- ações imediatas
- risco de falso negativo
- pendências críticas
- distribuição por segmento

---

# 15. Mapa de componentes UI

## 15.1 Componentes globais
- `AppShell`
- `SidebarNav`
- `TopBar`
- `PageHeader`
- `FilterBar`
- `MetricsCardsRow`
- `EmptyState`
- `StatusBadge`

## 15.2 Componentes do Kanban
- `KanbanBoard`
- `KanbanColumn`
- `LicitacaoCard`
- `CardQuickActions`

## 15.3 Componentes do detalhe
- `LicitacaoHeader`
- `LicitacaoSummaryCards`
- `DetailTabs`
- `SummarySection`
- `DocumentsTable`
- `DocumentPreviewPanel`
- `ItensTable`
- `AnaliseForm`
- `ScorePanel`
- `ScoreBreakdown`
- `ParecerPanel`
- `TimelinePanel`

## 15.4 Componentes do módulo de IA
- `AIAnalysisActions`
- `AIAnalysisTable`
- `AIAnalysisResultDrawer`
- `AIStatusBadge`

## 15.5 Componentes do painel de prioridades
- `PrioritiesDashboard`
- `ActionNowTable`
- `FalseNegativeRiskList`
- `CriticalPendingList`
- `SegmentDistributionPanel`

## 15.6 Componentes de suporte
- `MoveKanbanModal`
- `AssignOwnerModal`
- `SyncExecutionTable`
- `SourceConfigForm`
- `BlockingAlert`

---

# 16. Rotas do sistema

## 16.1 Rotas de tela
- `/kanban`
- `/prioridades`
- `/licitacoes`
- `/licitacoes/[id]`
- `/fontes`
- `/execucoes`
- `/configuracoes`

## 16.2 Rotas secundárias possíveis
- `/licitacoes/[id]/documentos`
- `/licitacoes/[id]/analises-ia`
- `/licitacoes/[id]/historico`
- `/fontes/[id]`
- `/execucoes/[id]`

## 16.3 API routes sugeridas

### Licitações
- `GET /api/licitacoes`
- `GET /api/licitacoes/:id`
- `PATCH /api/licitacoes/:id`
- `POST /api/licitacoes/:id/mover`

### Itens
- `GET /api/licitacoes/:id/itens`
- `PATCH /api/itens/:id`

### Análise humana
- `GET /api/licitacoes/:id/analise`
- `POST /api/licitacoes/:id/analise`
- `PATCH /api/licitacoes/:id/analise`

### IA
- `POST /api/licitacoes/:id/ia/leitura-rapida`
- `POST /api/licitacoes/:id/ia/aderencia`
- `POST /api/licitacoes/:id/ia/oportunidade-oculta`
- `POST /api/licitacoes/:id/ia/lotes-itens`
- `POST /api/licitacoes/:id/ia/score`
- `POST /api/licitacoes/:id/ia/valor-capturavel`
- `POST /api/licitacoes/:id/ia/falso-negativo`
- `POST /api/licitacoes/:id/ia/parecer`
- `GET /api/licitacoes/:id/ia/analises`

### Fontes
- `GET /api/fontes`
- `POST /api/fontes`
- `PATCH /api/fontes/:id`
- `POST /api/fontes/:id/sync`

### Execuções
- `GET /api/execucoes`
- `GET /api/execucoes/:id`

---

# 17. Backlog funcional MVP v1

## Épico 1 — Captação automática por API
- cadastro de fontes
- sincronização automática
- persistência de payload bruto

## Épico 2 — Normalização e deduplicação
- normalização
- dedupe
- alias por origem

## Épico 3 — Entrada automática no Kanban
- criação automática de card
- roteamento preliminar
- histórico de movimentação

## Épico 4 — Kanban operacional
- board
- drag and drop
- filtros

## Épico 5 — Detalhe da licitação
- página completa
- documentos
- itens/lotes

## Épico 6 — Análises por IA
- rodar manualmente
- esteira automática
- histórico de análises

## Épico 7 — Score, valor capturável e falso negativo
- score
- valor capturável obrigatório
- falso negativo obrigatório

## Épico 8 — Parecer comercial
- parecer executivo
- próximo passo recomendado

## Épico 9 — Painel de prioridades
- dashboard do dia
- bloco de falso negativo

## Épico 10 — Segurança operacional e travas
- bloqueio de descarte indevido
- bloqueio de avanço sem análise mínima

---

# 18. Backlog técnico por tela

## 18.1 Kanban
- layout base
- filtros
- colunas
- cards
- drag and drop
- histórico

## 18.2 Detalhe da licitação
- cabeçalho
- abas
- integração de resumo
- documentos
- itens
- análise humana
- score
- parecer
- timeline

## 18.3 Aba Análises por IA
- botões
- tabela de execuções
- drawer de resultado
- reprocessar
- copiar para análise humana

## 18.4 Painel de Prioridades
- KPIs
- ações imediatas
- falso negativo
- pendências críticas
- visão por segmento

## 18.5 Fontes
- cadastro
- edição
- ativar/inativar
- sincronização manual

## 18.6 Execuções
- listar execuções
- mostrar status
- abrir detalhe
- logs resumidos

---

# 19. Sprint plan sugerido

## Sprint 1 — Base
- estrutura do app
- rotas
- schema inicial
- tela básica do Kanban

## Sprint 2 — Captação e normalização
- fontes
- job de sincronização
- payload bruto
- normalização
- dedupe
- criação do card

## Sprint 3 — Kanban operacional
- drag and drop
- filtros
- histórico
- urgência
- estados visuais

## Sprint 4 — Detalhe da licitação
- cabeçalho
- abas
- resumo
- documentos
- itens/lotes
- análise humana
- timeline

## Sprint 5 — IA e análise comercial
- módulo de IA
- leitura rápida
- aderência
- oportunidade oculta
- score
- parecer executivo

## Sprint 6 — Prioridades e fechamento do MVP
- painel de prioridades
- pendências críticas
- falso negativo
- valor capturável
- bloqueios finais
- ajustes de UX

---

# 20. Modelo de dados — visão funcional

## 20.1 Entidades principais
- licitações
- documentos da licitação
- sinais encontrados
- itens/lotes
- análise consolidada
- score
- parecer
- fontes
- execuções de captura
- payloads brutos
- aliases de origem
- cards Kanban
- movimentações
- análises IA

## 20.2 Relacionamentos principais
- uma fonte tem muitas execuções
- uma execução tem muitos payloads
- uma licitação pode ter várias origens
- uma licitação tem um card
- uma licitação tem muitos itens
- uma licitação tem muitos sinais
- uma licitação tem muitas análises IA
- uma licitação tem uma análise consolidada
- uma licitação tem um score
- uma licitação tem um parecer

---

# 21. Schema JSON final consolidado

```json
{
  "schema_version": "1.0.0",
  "empresa_contexto": {
    "empresa_nome": "Multiteiner",
    "segmentos_prioritarios": [
      "construcao_civil",
      "eventos",
      "offshore",
      "operacoes_industriais",
      "apoio_logistico",
      "setor_publico"
    ],
    "portfolio_principal": [
      "containers_adaptados",
      "modulos_habitacionais",
      "modulos_administrativos",
      "modulos_sanitarios",
      "guaritas",
      "almoxarifados",
      "refeitorios",
      "alojamentos",
      "escritorios_de_obra",
      "bases_operacionais",
      "estruturas_temporarias_modulares"
    ]
  }
}
```

> Observação: o schema JSON completo do projeto pode ser mantido em arquivo separado técnico, mas o modelo funcional já está refletido neste documento.

---

# 22. Schema SQL/PostgreSQL

## 22.1 Tabela principal de licitações
```sql
CREATE TABLE licitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_externo VARCHAR(120),
    fonte_captacao VARCHAR(50),
    link_origem TEXT,
    orgao TEXT,
    numero_licitacao VARCHAR(120),
    numero_processo VARCHAR(120),
    modalidade VARCHAR(80),
    tipo_disputa VARCHAR(80),
    criterio_julgamento VARCHAR(120),
    objeto_resumido TEXT,
    data_publicacao DATE,
    data_sessao TIMESTAMP,
    uf CHAR(2),
    municipio VARCHAR(120),
    regiao VARCHAR(50),
    valor_global_estimado NUMERIC(18,2),
    moeda CHAR(3) DEFAULT 'BRL',
    possui_lotes BOOLEAN DEFAULT FALSE,
    possui_itens BOOLEAN DEFAULT FALSE,
    possui_planilha_orcamentaria BOOLEAN DEFAULT FALSE,
    possui_quantitativos BOOLEAN DEFAULT FALSE,
    possui_precos_unitarios BOOLEAN DEFAULT FALSE,
    envolve_locacao BOOLEAN DEFAULT FALSE,
    envolve_fornecimento BOOLEAN DEFAULT FALSE,
    envolve_servico BOOLEAN DEFAULT FALSE,
    envolve_obra BOOLEAN DEFAULT FALSE,
    envolve_instalacao BOOLEAN DEFAULT FALSE,
    envolve_montagem BOOLEAN DEFAULT FALSE,
    envolve_desmontagem BOOLEAN DEFAULT FALSE,
    envolve_transporte BOOLEAN DEFAULT FALSE,
    envolve_mobilizacao BOOLEAN DEFAULT FALSE,
    envolve_desmobilizacao BOOLEAN DEFAULT FALSE,
    envolve_manutencao BOOLEAN DEFAULT FALSE,
    resumo_natureza TEXT,
    status_pipeline VARCHAR(40) DEFAULT 'pendente',
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);
```

## 22.2 Documentos
```sql
CREATE TABLE licitacao_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licitacao_id UUID NOT NULL REFERENCES licitacoes(id) ON DELETE CASCADE,
    possui_edital BOOLEAN DEFAULT FALSE,
    possui_termo_referencia BOOLEAN DEFAULT FALSE,
    possui_projeto_basico BOOLEAN DEFAULT FALSE,
    possui_memorial_descritivo BOOLEAN DEFAULT FALSE,
    possui_anexos_tecnicos BOOLEAN DEFAULT FALSE,
    possui_planilha_orcamentaria BOOLEAN DEFAULT FALSE,
    possui_cronograma BOOLEAN DEFAULT FALSE,
    possui_minuta_contratual BOOLEAN DEFAULT FALSE,
    lacunas_documentais TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE (licitacao_id)
);
```

## 22.3 Sinais
```sql
CREATE TABLE licitacao_sinais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licitacao_id UUID NOT NULL REFERENCES licitacoes(id) ON DELETE CASCADE,
    categoria VARCHAR(50) NOT NULL,
    subcategoria VARCHAR(50),
    sinal TEXT NOT NULL,
    nivel VARCHAR(30),
    trecho TEXT,
    fonte_documento VARCHAR(80),
    relevancia VARCHAR(20),
    criado_em TIMESTAMP DEFAULT NOW()
);
```

## 22.4 Itens e lotes
```sql
CREATE TABLE licitacao_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licitacao_id UUID NOT NULL REFERENCES licitacoes(id) ON DELETE CASCADE,
    tipo VARCHAR(20),
    identificador VARCHAR(80),
    descricao TEXT,
    quantitativo NUMERIC(18,4),
    unidade VARCHAR(30),
    aderencia VARCHAR(20) DEFAULT 'nenhuma',
    tipo_aderencia VARCHAR(30) DEFAULT 'nenhuma',
    prioridade VARCHAR(20) DEFAULT 'baixa',
    valor_estimado_item NUMERIC(18,2),
    motivo TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);
```

## 22.5 Análise consolidada
```sql
CREATE TABLE licitacao_analise (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licitacao_id UUID NOT NULL REFERENCES licitacoes(id) ON DELETE CASCADE,
    aderencia_direta_existe BOOLEAN DEFAULT FALSE,
    aderencia_direta_nivel VARCHAR(20) DEFAULT 'nenhuma',
    aderencia_aplicacao_existe BOOLEAN DEFAULT FALSE,
    aderencia_aplicacao_nivel VARCHAR(20) DEFAULT 'nenhuma',
    contexto_oculto_existe BOOLEAN DEFAULT FALSE,
    contexto_oculto_nivel VARCHAR(20) DEFAULT 'nenhuma',
    modelo_comercial_existe BOOLEAN DEFAULT FALSE,
    modelo_comercial_nivel VARCHAR(20) DEFAULT 'nenhum',
    oportunidade_oculta_existe BOOLEAN DEFAULT FALSE,
    oportunidade_oculta_forca VARCHAR(20) DEFAULT 'nenhuma',
    oportunidade_oculta_resumo TEXT,
    oportunidade_no_objeto BOOLEAN DEFAULT FALSE,
    oportunidade_no_tr BOOLEAN DEFAULT FALSE,
    oportunidade_nos_lotes BOOLEAN DEFAULT FALSE,
    oportunidade_nos_itens BOOLEAN DEFAULT FALSE,
    oportunidade_na_planilha BOOLEAN DEFAULT FALSE,
    oportunidade_no_memorial BOOLEAN DEFAULT FALSE,
    oportunidade_em_anexo_tecnico BOOLEAN DEFAULT FALSE,
    portfolio_aplicavel JSONB DEFAULT '[]'::jsonb,
    solucoes_multiteiner_aplicaveis JSONB DEFAULT '[]'::jsonb,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE (licitacao_id)
);
```

## 22.6 Score, valor capturável e falso negativo
```sql
CREATE TABLE licitacao_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licitacao_id UUID NOT NULL REFERENCES licitacoes(id) ON DELETE CASCADE,
    score_final NUMERIC(5,2) DEFAULT 0,
    faixa_classificacao VARCHAR(5) DEFAULT 'D',
    score_aderencia_direta NUMERIC(5,2) DEFAULT 0,
    score_aderencia_aplicacao NUMERIC(5,2) DEFAULT 0,
    score_contexto_oculto NUMERIC(5,2) DEFAULT 0,
    score_modelo_comercial NUMERIC(5,2) DEFAULT 0,
    score_potencial_economico NUMERIC(5,2) DEFAULT 0,
    score_qualidade_evidencia NUMERIC(5,2) DEFAULT 0,
    score_justificativa_resumida TEXT,
    valor_capturavel_obrigatorio_preenchido BOOLEAN NOT NULL DEFAULT TRUE,
    valor_capturavel_foi_possivel_estimar BOOLEAN DEFAULT FALSE,
    valor_capturavel_estimado NUMERIC(18,2),
    valor_capturavel_faixa_min NUMERIC(18,2),
    valor_capturavel_faixa_max NUMERIC(18,2),
    valor_capturavel_moeda CHAR(3) DEFAULT 'BRL',
    valor_capturavel_nivel_confianca VARCHAR(20) DEFAULT 'baixo',
    valor_capturavel_metodo_estimativa VARCHAR(50) DEFAULT 'nao_estimado',
    valor_capturavel_justificativa TEXT NOT NULL,
    valor_capturavel_base_documental JSONB DEFAULT '[]'::jsonb,
    valor_capturavel_observacao TEXT,
    falso_negativo_obrigatorio_preenchido BOOLEAN NOT NULL DEFAULT TRUE,
    falso_negativo_existe_risco BOOLEAN DEFAULT FALSE,
    falso_negativo_nivel_risco VARCHAR(20) DEFAULT 'baixo',
    falso_negativo_motivos JSONB DEFAULT '[]'::jsonb,
    falso_negativo_trechos_criticos JSONB DEFAULT '[]'::jsonb,
    falso_negativo_resumo TEXT NOT NULL,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE (licitacao_id)
);
```

## 22.7 Parecer executivo
```sql
CREATE TABLE licitacao_parecer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licitacao_id UUID NOT NULL REFERENCES licitacoes(id) ON DELETE CASCADE,
    classificacao_final VARCHAR(5) DEFAULT 'D',
    prioridade_comercial VARCHAR(20) DEFAULT 'baixa',
    vale_esforco_comercial BOOLEAN DEFAULT FALSE,
    recomendacao_final VARCHAR(40) DEFAULT 'DESCARTAR',
    resumo TEXT,
    oportunidade_direta BOOLEAN DEFAULT FALSE,
    oportunidade_indireta BOOLEAN DEFAULT FALSE,
    oportunidade_oculta_item_lote_anexo BOOLEAN DEFAULT FALSE,
    oportunidade_inexistente BOOLEAN DEFAULT TRUE,
    onde_esta_oportunidade JSONB DEFAULT '[]'::jsonb,
    solucoes_que_multiteiner_poderia_ofertar JSONB DEFAULT '[]'::jsonb,
    proximo_passo_recomendado JSONB DEFAULT '[]'::jsonb,
    riscos_limitacoes JSONB DEFAULT '[]'::jsonb,
    evidencias_principais JSONB DEFAULT '[]'::jsonb,
    risco_falso_positivo VARCHAR(20) DEFAULT 'baixo',
    risco_falso_negativo_so_titulo VARCHAR(20) DEFAULT 'baixo',
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE (licitacao_id)
);
```

## 22.8 Fontes
```sql
CREATE TABLE captacao_fontes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    endpoint_base TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    autenticacao_tipo VARCHAR(50),
    configuracao JSONB DEFAULT '{}'::jsonb,
    ultima_sincronizacao TIMESTAMP,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);
```

## 22.9 Execuções
```sql
CREATE TABLE captacao_execucoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fonte_id UUID NOT NULL REFERENCES captacao_fontes(id) ON DELETE CASCADE,
    iniciado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    finalizado_em TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'rodando',
    total_lidos INTEGER DEFAULT 0,
    total_novos INTEGER DEFAULT 0,
    total_atualizados INTEGER DEFAULT 0,
    total_descartados_duplicidade INTEGER DEFAULT 0,
    total_erros INTEGER DEFAULT 0,
    log_resumo TEXT
);
```

## 22.10 Payloads brutos
```sql
CREATE TABLE captacao_payloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execucao_id UUID NOT NULL REFERENCES captacao_execucoes(id) ON DELETE CASCADE,
    fonte_id UUID NOT NULL REFERENCES captacao_fontes(id) ON DELETE CASCADE,
    id_externo_origem VARCHAR(200),
    payload_bruto JSONB NOT NULL,
    hash_payload VARCHAR(128),
    capturado_em TIMESTAMP DEFAULT NOW(),
    status_processamento VARCHAR(30) DEFAULT 'pendente',
    erro_processamento TEXT
);
```

## 22.11 Aliases de origem
```sql
CREATE TABLE licitacao_aliases_origem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licitacao_id UUID NOT NULL REFERENCES licitacoes(id) ON DELETE CASCADE,
    fonte_id UUID NOT NULL REFERENCES captacao_fontes(id) ON DELETE CASCADE,
    id_externo_origem VARCHAR(200) NOT NULL,
    hash_deduplicacao VARCHAR(128),
    objeto_snapshot TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE (fonte_id, id_externo_origem)
);
```

## 22.12 Cards Kanban
```sql
CREATE TABLE kanban_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licitacao_id UUID NOT NULL REFERENCES licitacoes(id) ON DELETE CASCADE,
    coluna_atual VARCHAR(40) NOT NULL,
    ordem_coluna INTEGER DEFAULT 0,
    responsavel_id UUID,
    urgente BOOLEAN DEFAULT FALSE,
    bloqueado BOOLEAN DEFAULT FALSE,
    motivo_bloqueio TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE (licitacao_id)
);
```

## 22.13 Movimentações
```sql
CREATE TABLE kanban_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
    coluna_origem VARCHAR(40),
    coluna_destino VARCHAR(40) NOT NULL,
    movido_por UUID,
    motivo TEXT,
    automatico BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT NOW()
);
```

## 22.14 Análises por IA
```sql
CREATE TABLE licitacao_analises_ia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licitacao_id UUID NOT NULL REFERENCES licitacoes(id) ON DELETE CASCADE,
    tipo_analise VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    modelo_utilizado VARCHAR(80),
    prompt_versao VARCHAR(40),
    resultado_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    resumo_texto TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);
```

---

# 23. Índices e views recomendadas

## Índices
```sql
CREATE INDEX idx_licitacoes_orgao ON licitacoes(orgao);
CREATE INDEX idx_licitacoes_uf_municipio ON licitacoes(uf, municipio);
CREATE INDEX idx_licitacoes_data_sessao ON licitacoes(data_sessao);
CREATE INDEX idx_licitacoes_modalidade ON licitacoes(modalidade);
CREATE INDEX idx_licitacoes_status_pipeline ON licitacoes(status_pipeline);
CREATE INDEX idx_licitacao_itens_licitacao_id ON licitacao_itens(licitacao_id);
CREATE INDEX idx_licitacao_itens_prioridade ON licitacao_itens(prioridade);
CREATE INDEX idx_licitacao_itens_aderencia ON licitacao_itens(aderencia);
CREATE INDEX idx_licitacao_sinais_licitacao_id ON licitacao_sinais(licitacao_id);
CREATE INDEX idx_licitacao_sinais_categoria ON licitacao_sinais(categoria);
CREATE INDEX idx_licitacao_score_classificacao ON licitacao_score(faixa_classificacao);
CREATE INDEX idx_licitacao_score_score_final ON licitacao_score(score_final);
CREATE INDEX idx_licitacao_parecer_recomendacao ON licitacao_parecer(recomendacao_final);
```

## View para dashboard
```sql
CREATE VIEW vw_pipeline_licitacoes AS
SELECT
    l.id,
    l.orgao,
    l.numero_licitacao,
    l.modalidade,
    l.objeto_resumido,
    l.uf,
    l.municipio,
    l.data_sessao,
    l.valor_global_estimado,
    s.score_final,
    s.faixa_classificacao,
    s.valor_capturavel_estimado,
    s.valor_capturavel_faixa_min,
    s.valor_capturavel_faixa_max,
    s.falso_negativo_existe_risco,
    s.falso_negativo_nivel_risco,
    p.classificacao_final,
    p.prioridade_comercial,
    p.vale_esforco_comercial,
    p.recomendacao_final,
    p.resumo
FROM licitacoes l
LEFT JOIN licitacao_score s ON s.licitacao_id = l.id
LEFT JOIN licitacao_parecer p ON p.licitacao_id = l.id;
```

---

# 24. Travas operacionais

## 24.1 Travas funcionais
- não descartar sem motivo
- não descartar sem falso negativo
- não sair de Em Análise sem score
- não sair de Em Análise sem valor capturável ou justificativa
- não sair de Em Análise sem classificação
- risco alto de falso negativo impede descarte automático

## 24.2 Checks úteis
```sql
ALTER TABLE licitacao_score
ADD CONSTRAINT chk_score_final
CHECK (score_final >= 0 AND score_final <= 100);

ALTER TABLE licitacao_score
ADD CONSTRAINT chk_faixa_classificacao
CHECK (faixa_classificacao IN ('A+','A','B','C','D'));

ALTER TABLE licitacao_score
ADD CONSTRAINT chk_valor_capturavel_justificativa
CHECK (length(trim(valor_capturavel_justificativa)) > 0);

ALTER TABLE licitacao_score
ADD CONSTRAINT chk_falso_negativo_resumo
CHECK (length(trim(falso_negativo_resumo)) > 0);

ALTER TABLE licitacao_parecer
ADD CONSTRAINT chk_recomendacao_final
CHECK (recomendacao_final IN (
    'ATACAR_IMEDIATAMENTE',
    'ANALISAR_COMERCIALMENTE',
    'INVESTIGAR_MELHOR',
    'MONITORAR',
    'DESCARTAR'
));
```

---

# 25. KPIs do sistema

## 25.1 KPIs operacionais
- licitações captadas no período
- licitações analisadas
- cards por coluna
- urgentes abertas
- risco alto de falso negativo

## 25.2 KPIs comerciais
- A+ abertas
- A abertas
- valor global mapeado
- valor capturável estimado
- oportunidades viáveis
- taxa de descarte
- taxa de ganho
- perdas por preço
- perdas por documentação

---

# 26. Stack sugerida

## 26.1 Frontend
- Next.js
- Tailwind
- shadcn/ui

## 26.2 Backend
- Next.js API routes ou serviço dedicado
- jobs/worker para sincronização

## 26.3 Banco
- Postgres

## 26.4 Jobs/agendamento
- cron
- scheduled jobs
- worker

## 26.5 Organização dos serviços
- `source-connectors`
- `ingestion-service`
- `normalization-service`
- `dedup-service`
- `scoring-service`
- `kanban-routing-service`

---

# 27. Ordem de implementação recomendada

## Fase 1
- schema do banco
- rotas principais
- Kanban com dados
- detalhe da licitação

## Fase 2
- fontes
- sincronização
- payload bruto
- normalização
- deduplicação

## Fase 3
- score preliminar
- entrada automática no Kanban
- histórico de movimentação

## Fase 4
- análises por IA
- score consolidado
- valor capturável
- falso negativo
- parecer

## Fase 5
- painel de prioridades
- travas finais
- ajustes de UX
- preparação para produção

---

# 28. Regras críticas da Multiteiner

## Regra central 1
Se houver aderência por aplicação ou contexto oculto relevante, o sistema não deve descartar sozinho.

## Regra central 2
Valor global não deve dirigir a decisão sozinho. O campo decisivo é o valor capturável.

## Regra central 3
Toda oportunidade com risco alto de falso negativo precisa de revisão humana.

## Regra central 4
Aderência direta é importante, mas não pode dominar a lógica do sistema.

---

# 29. Resultado esperado do MVP

Ao concluir o MVP, a Multiteiner terá:
- motor de ingestão automática
- quadro Kanban operacional
- detalhe completo por licitação
- análises por IA
- score e priorização
- valor capturável
- gestão de falso negativo
- parecer comercial executivo
- base técnica para evoluir para CRM e automações mais avançadas

---

# 30. Próximos passos após este documento

1. validar este documento com o time  
2. congelar o escopo do MVP v1  
3. transformar em backlog de execução detalhado no projeto  
4. iniciar implementação técnica pelo Sprint 1  
5. manter um changelog desta documentação a cada avanço de produto  

---
