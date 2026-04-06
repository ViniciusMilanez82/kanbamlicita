# Mapa de processo AS-IS / TO-BE — KanbanLicita

**Referência técnica alinhada ao código:** [SISTEMA_KANBANLICITA_COMPLETO.md](./SISTEMA_KANBANLICITA_COMPLETO.md)

---

## 1. Objetivo do mapa

Este mapa tem dois objetivos centrais:

1. **Explicitar** com clareza como o sistema funciona hoje (**AS-IS**).
2. **Desenhar** o estado futuro desejado (**TO-BE**) para que a solução deixe de ser apenas um sistema de acompanhamento de licitações e evolua para uma **plataforma operacional intuitiva, guiada e parametrizável** para diferentes mercados e produtos.

Pela documentação técnica, o sistema atual já cobre captação automática, enriquecimento cadastral, análise manual, score, parecer, sinais, documentos, IA, histórico, governança de movimentação e administração de parâmetros globais. Possui papéis distintos para usuário e administrador, fluxo Kanban estruturado, regras de validação de transição e configuração de pesos, faixas, segmentos e listas de parecer.

---

## 2. Visão executiva

### AS-IS

Hoje o sistema funciona como um **motor operacional de acompanhamento de licitações públicas** em formato Kanban. O processo começa na captação via PNCP ou fonte mock, passa por normalização e deduplicação, cria a licitação e o card inicial, permite análise manual e por IA, calcula score, gera parecer, organiza documentos, itens e sinais, e governa a movimentação entre colunas com critérios obrigatórios.

### TO-BE

O estado futuro recomendado é uma **plataforma configurável de gestão de oportunidades/processos**, com jornada guiada, parametrização visual, pipeline modelável, campos dinâmicos, engine de regras, templates por mercado, experiência assistida por IA e dashboards orientados à decisão. O sistema deixa de ser “um Kanban de licitações” e passa a ser **“um sistema operacional para gestão estruturada de oportunidades”**.

---

## 3. Escopo do processo atual

A navegação atual do produto se organiza principalmente em `/login`, `/kanban`, `/licitacoes`, `/importar` e `/configuracoes`. O detalhe da licitação concentra o trabalho operacional nas abas de **resumo, documentos, itens, análise, histórico, IA, sinais, score e parecer**. A administração cobre **usuários, fontes, score/faixas/segmentos, listas de parecer** e parâmetros ligados ao servidor.

---

## 4. Mapa AS-IS completo

### 4.1 Macrofluxo AS-IS

```
Configuração administrativa
        ↓
Definição/garantia da fonte de captação
        ↓
Busca e sincronização de oportunidades (PNCP / mock)
        ↓
Triagem textual + normalização + deduplicação
        ↓
Criação/atualização de licitação
        ↓
Criação do card no Kanban (captadas automaticamente)
        ↓
Triagem inicial e atribuição operacional
        ↓
Análise detalhada (manual + documentos + itens + sinais + IA)
        ↓
Score + classificação + valor capturável + parecer
        ↓
Movimentação governada entre colunas
        ↓
Proposta / participação / ganho / perda / descarte
        ↓
Histórico, métricas e ajustes administrativos
```

O fluxo oficial do Kanban segue as colunas: `captadas_automaticamente`, `triagem_inicial`, `em_analise`, `viavel_comercialmente`, `proposta_documentacao`, `enviadas_participando`, `ganhamos`, `perdemos` e `descartadas`.

### 4.2 Swimlane AS-IS por ator

| Etapa | Admin | Usuário/Analista | Sistema | IA |
|-------|-------|------------------|---------|-----|
| 1. Preparação | Configura fonte, filtros, pesos, faixas, listas | — | Salva configuração global | — |
| 2. Captação | Aciona probe/sync | — | Consulta PNCP/mock, lê páginas | — |
| 3. Tratamento | — | — | Triagem textual, normaliza, deduplica | — |
| 4. Geração do pipeline | — | — | Cria/atualiza licitação e KanbanCard | — |
| 5. Triagem operacional | Pode supervisionar | Visualiza quadro/lista, atribui, prioriza | Exibe cards e listas | — |
| 6. Análise da oportunidade | Pode revisar regras | Preenche análise, documentos, itens, sinais | Persiste dados | Pode analisar licitação |
| 7. Priorização | Ajusta pesos/faixas | Consulta e complementa score | Calcula score/faixa | Pode enriquecer score |
| 8. Decisão e avanço | Pode auditar | Move card, registra motivo | Valida regras de avanço | Pode apoiar parecer |
| 9. Encerramento | Acompanha resultados | Registra perda/ganho/descarte | Mantém histórico e métricas | — |

Esse desenho mostra um sistema com boa separação entre **administração do método** e **operação do pipeline**, porém com forte dependência do entendimento humano para condução do trabalho.

### 4.3 Etapas AS-IS detalhadas

**Etapa 1 — Configuração administrativa do método**  
O administrador acessa Configurações e define fonte, filtros PNCP, pesos do score, faixas de classificação, segmentos de mercado e listas de sugestões de parecer. Existe ainda um painel de referência de parâmetros de servidor.

- **Dor AS-IS:** a parametrização existe, mas está organizada como manutenção administrativa do sistema, não como montagem visual da operação.

**Etapa 2 — Captação de oportunidades**  
Na tela de importação, o admin garante a fonte PNCP, define filtros, faz uma busca de pré-visualização e então executa a sincronização. O processo usa `runFonteSync` para ler oportunidades da fonte.

- **Dor AS-IS:** a entrada de dados está centrada em um caso específico de origem; serve bem ao domínio atual, mas não como camada universal de inbound.

**Etapa 3 — Triagem técnica do dado**  
O sistema aplica triagem textual por palavras-chave, normaliza o payload bruto e deduplica o registro por alias de origem, hash de conteúdo ou fallback por órgão+número+data.

- **Dor AS-IS:** o motor de ingestão é bom, mas a inteligência de entrada ainda é percebida como “importação”, não como “caixa de entrada inteligente”.

**Etapa 4 — Formação do objeto operacional**  
Quando o registro é novo, o sistema cria a licitação e o respectivo KanbanCard na coluna `captadas_automaticamente`; quando já existe, atualiza a licitação.

- **Dor AS-IS:** o card nasce, mas ainda não nasce com contexto de ação, prioridade operacional clara ou recomendação do sistema.

**Etapa 5 — Triagem inicial e organização do pipeline**  
Usuários autenticados acessam o Kanban e a lista de licitações. O Kanban mostra apenas licitações **com** card; a lista mostra **todas**, com ou sem card, com urgência, score e link para detalhe.

- **Dor AS-IS:** o usuário precisa interpretar sozinho o que é mais importante, o que está travado e qual deve ser a próxima ação.

**Etapa 6 — Análise detalhada da oportunidade**  
No detalhe da licitação, o usuário acessa abas de resumo, documentos, itens, análise manual, histórico, IA, sinais, score e parecer. A própria tela carrega a configuração global para cálculo e sugestões.

- **Dor AS-IS:** a estrutura é poderosa, mas dispersa; o usuário precisa navegar por múltiplas abas para entender o estado da oportunidade.

**Etapa 7 — Score e classificação**  
O score combina níveis da análise manual e, quando disponível, resultado estruturado da IA. Os pesos são configuráveis e precisam somar 100; as faixas definem A+, A, B, C e D.

- **Dor AS-IS:** há inteligência decisória, mas ainda não em formato plenamente explicável e assistido ao usuário final.

**Etapa 8 — Análise por IA**  
O sistema inicia análise IA de forma assíncrona, registra status de processamento e salva resultado estruturado em banco para enriquecimento posterior.

- **Dor AS-IS:** a IA está presente como capacidade, mas não como copiloto central da jornada operacional.

**Etapa 9 — Governança de movimentação**  
O sistema valida transições: descarte com falso negativo alto pode ser bloqueado, descarte/perda exigem motivo, e o avanço para `viavel_comercialmente` exige score, classificação e coerência no preenchimento de valor capturável.

- **Dor AS-IS:** as regras são boas, mas aparecem como bloqueio; deveriam aparecer como orientação antecipada.

**Etapa 10 — Métricas, histórico e aprendizado**  
O sistema mantém métricas agregadas do pipeline, histórico de movimentações e registros administrativos. O modelo de dados cobre licitação, card, movimentação, score, documentos, itens, análise, parecer, sinais, análise IA, fontes, execuções, payloads e configuração global.

- **Dor AS-IS:** existe rastreabilidade, mas ainda falta transformar isso em inteligência de gestão mais acionável.

---

## 5. Diagnóstico AS-IS consolidado

### Forças atuais

O sistema já tem base madura em cinco frentes: **captação estruturada**, **modelo de dados robusto**, **governança de transição**, **mistura de análise humana com IA** e **administração de parâmetros críticos**. Isso é um ótimo alicerce.

### Limitações estruturais

O problema central não é capacidade funcional; é **arquitetura de experiência** e **nível de parametrização**. Hoje o produto:

- exige conhecimento prévio do método;
- ainda fala a linguagem do domínio de licitações;
- distribui a operação em muitas abas;
- expõe configurações em formato técnico/administrativo;
- não guia claramente a próxima ação;
- possui pontos de atenção de segurança nas APIs: alguns handlers não verificam sessão explicitamente (ver [SISTEMA_KANBANLICITA_COMPLETO.md](./SISTEMA_KANBANLICITA_COMPLETO.md) — seção de APIs e proxy).

---

## 6. Mapa TO-BE completo

### 6.1 Princípios do desenho futuro

O estado futuro deve obedecer a sete princípios:

1. **Jornada guiada por ação**, não por módulos técnicos.
2. **Pipeline configurável**, não fixo.
3. **Dados parametrizáveis**, não campos rígidos de um único mercado.
4. **Regras explicáveis**, não apenas bloqueios.
5. **IA como copiloto operacional**, não recurso lateral.
6. **Templates por mercado**, não produto monolítico.
7. **Camadas de complexidade**, para atender desde times simples até operações sofisticadas.

### 6.2 Macrofluxo TO-BE

```
Setup guiado da operação
        ↓
Escolha de template / mercado / tipo de processo
        ↓
Definição visual de etapas, campos, regras e critérios
        ↓
Entrada multicanal de oportunidades/demandas
        ↓
Normalização e enriquecimento automático
        ↓
Classificação inicial assistida
        ↓
Priorização e recomendação de próxima ação
        ↓
Execução guiada por etapa
        ↓
Decisão com score + IA + regras
        ↓
Produção de artefatos (parecer, checklist, tarefas, docs)
        ↓
Conclusão do caso/oportunidade
        ↓
Aprendizado operacional e otimização contínua
```

### 6.3 Swimlane TO-BE por ator

| Etapa | Dono da Operação/Admin | Usuário/Analista | Plataforma | IA |
|-------|------------------------|------------------|------------|-----|
| 1. Setup | Escolhe template, modela processo | — | Gera estrutura base | Sugere template/configuração |
| 2. Inbound | Define fontes e canais | Pode registrar manualmente | Recebe entradas multicanal | Classifica e resume entradas |
| 3. Enriquecimento | Define regras | — | Normaliza e deduplica | Completa campos e entidades |
| 4. Qualificação | Define critérios | Valida exceções | Prioriza e roteiriza | Sugere score inicial |
| 5. Análise | Define formulários/checklists | Executa análise guiada | Mostra pendências e progresso | Resume, compara e recomenda |
| 6. Decisão | Define alçadas/regras | Toma decisão | Valida transições | Explica risco/oportunidade |
| 7. Execução | Define templates e tarefas | Move, documenta, conclui | Gera tarefas e artefatos | Produz rascunhos e alertas |
| 8. Aprendizado | Ajusta regras/KPIs | Retroalimenta causas | Mede gargalos e performance | Identifica padrões e desvios |

### 6.4 Etapas TO-BE detalhadas

**Etapa 1 — Studio de configuração da operação**  
O sistema deve abrir com um wizard de implantação: qual processo será gerido, qual o nome da entidade principal, quais são as etapas, quais campos existem, quais critérios definem prioridade e quais documentos/análises são exigidos.

- **Resultado esperado:** o usuário passa a “desenhar sua operação” sem depender do desenvolvedor.

**Etapa 2 — Entrada multicanal**  
A camada de entrada deixa de ser só “importação PNCP” e passa a ser **caixa de entrada operacional**. Pode receber dados de API, planilha, formulário, integração, importação manual ou fonte externa.

- **Resultado esperado:** o motor serve para qualquer mercado.

**Etapa 3 — Normalização e enriquecimento**  
Toda entrada vira um objeto padrão da plataforma. O sistema limpa, classifica, deduplica, atribui categoria, identifica urgência, detecta entidades e prepara o registro para análise.

- **Resultado esperado:** o usuário recebe casos já organizados, e não dados crus.

**Etapa 4 — Qualificação inicial assistida**  
Em vez de apenas jogar o item no Kanban, o sistema já deve indicar: prioridade inicial, risco, valor potencial, dono sugerido, pendências imediatas, probabilidade de avanço.

- **Resultado esperado:** a operação começa orientada.

**Etapa 5 — Espaço de análise guiada**  
Sai o detalhe fragmentado em várias abas técnicas e entra uma tela com três camadas: **resumo executivo**, **próxima ação recomendada**, **dossiê completo**.

- **Resultado esperado:** o usuário entende primeiro o que fazer, depois aprofunda.

**Etapa 6 — Engine de decisão**  
O score evolui para um motor configurável de decisão com: critérios, pesos, thresholds, nível de risco, alçadas, justificativas, recomendação do sistema.

- **Resultado esperado:** o sistema explica por que recomenda avançar, manter, descartar ou escalar.

**Etapa 7 — Regras orientadoras de avanço**  
As regras não desaparecem; melhoram. Em vez de barrar no fim, o sistema orienta no início: “faltam 2 documentos”, “score ainda incompleto”, “esta etapa exige responsável e justificativa”.

- **Resultado esperado:** governança com menor atrito.

**Etapa 8 — Artefatos e execução operacional**  
Cada etapa pode gerar automaticamente: checklist, tarefa, parecer, resumo, evidências, solicitação documental, alerta de prazo, minuta ou plano de ação.

- **Resultado esperado:** menos trabalho manual e maior padronização.

**Etapa 9 — Encerramento e aprendizado**  
Ao concluir ganho, perda, descarte ou fechamento, o sistema coleta causas estruturadas, compara previsão x resultado, mede aderência do score e retroalimenta o modelo.

- **Resultado esperado:** o processo aprende com a operação real.

---

## 7. Comparativo AS-IS × TO-BE

| Dimensão | AS-IS | TO-BE |
|----------|-------|-------|
| Posicionamento | Sistema de licitações | Plataforma operacional configurável |
| Entrada | Importação PNCP/mock | Caixa de entrada multicanal |
| Pipeline | Fixo | Modelável |
| Campos | Voltados ao domínio atual | Dinâmicos por processo |
| Experiência | Modular por telas/abas | Guiada por próxima ação |
| Score | Configurável, mas restrito | Engine de decisão visual |
| IA | Recurso complementar | Copiloto operacional |
| Regras | Bloqueio e validação | Orientação + validação |
| Parametrização | Técnica/administrativa | Studio visual no-code |
| Escalabilidade | Vertical | Multimercado / multiproduto |

---

## 8. Capacidades que precisam existir no TO-BE

### 8.1 Modelador de processo

Permitir criar etapas, nomes, ordem, objetivos, SLA, critérios de entrada/saída e regras de transição.

### 8.2 Modelador de dados

Permitir criar campos de texto, moeda, data, seleção, upload, múltiplos valores, cálculos e relacionamentos.

### 8.3 Motor de decisão

Permitir configurar score, risco, pesos, faixas, fórmulas, justificativas e recomendações.

### 8.4 Modelador documental

Permitir configurar checklists, documentos obrigatórios, templates e evidências por etapa.

### 8.5 IA configurável

Permitir criar prompts por etapa, análise automática, resumos, alertas, classificação e recomendações.

### 8.6 Camada de templates

Disponibilizar modelos prontos por segmento: licitações, vendas complexas, engenharia, supply, jurídico, propostas, expansão etc.

### 8.7 Segurança e governança

Centralizar autenticação/autorização em **todas** as rotas sensíveis, reforçando a confiança da plataforma.

---

## 9. Roadmap de transformação

### Fase 1 — Quick wins de UX e processo

Foco em melhorar muito a usabilidade **sem** reescrever a base:

- dashboard inicial com “o que chegou / o que está travado / o que exige decisão”;
- cards mais informativos;
- topo do detalhe com “próxima ação recomendada”;
- mensagens de bloqueio orientativas;
- simplificação da leitura do score.

### Fase 2 — Parametrização real

Começo da virada para plataforma:

- pipeline configurável;
- campos dinâmicos;
- checklists por etapa;
- regras configuráveis;
- templates de parecer e prompts.

### Fase 3 — Plataforma multimercado

Descolamento do nicho:

- templates por setor;
- inbound multicanal;
- motor de decisão expandido;
- IA configurável por operação;
- analytics preditivo e retroalimentação do modelo.

---

## 10. KPIs recomendados para o TO-BE

O sistema atual já suporta métricas de pipeline; no estado futuro recomenda-se medir:

- tempo médio por etapa;
- taxa de avanço entre etapas;
- taxa de descarte por motivo;
- taxa de perda por causa;
- aderência do score à decisão final;
- produtividade por usuário;
- backlog travado por pendência documental;
- valor potencial por classe;
- tempo até primeira decisão;
- divergência entre recomendação IA e decisão humana.

---

## 11. Parecer final de processo

O **AS-IS** mostra um sistema operacionalmente sólido, com boa governança, boa base analítica e modelo de dados rico. O maior problema não é falta de funcionalidade, e sim **fricção de experiência**, **rigidez de desenho** e **parametrização ainda insuficiente** para autonomia plena do usuário.

O **TO-BE** recomendado transforma o produto em uma plataforma onde o usuário não apenas opera casos, mas **configura o próprio método de trabalho**, com apoio visual, lógica explicável, IA assistiva e estrutura reaproveitável em múltiplos mercados.

**Em uma frase:**

- **AS-IS:** sistema robusto para gerir licitações em Kanban.  
- **TO-BE:** sistema operacional configurável para gerir qualquer processo de oportunidade, análise e decisão.
