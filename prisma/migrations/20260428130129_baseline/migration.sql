-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CategoriaParametro" AS ENUM ('segmento', 'categoria_produto', 'linha_servico', 'palavra_chave_positiva', 'palavra_chave_negativa', 'regra_modalidade', 'regra_orgao', 'regra_uf', 'criterio_descarte', 'criterio_urgencia', 'gatilho_risco');

-- CreateEnum
CREATE TYPE "TipoCriterio" AS ENUM ('objetivo', 'subjetivo');

-- CreateEnum
CREATE TYPE "TipoRegra" AS ENUM ('inclusao', 'exclusao', 'condicional');

-- CreateEnum
CREATE TYPE "OperadorRegra" AS ENUM ('igual', 'diferente', 'contem', 'nao_contem', 'maior', 'menor', 'regex');

-- CreateEnum
CREATE TYPE "AcaoAuditoria" AS ENUM ('criacao', 'edicao', 'exclusao');

-- CreateEnum
CREATE TYPE "CategoriaHabilitacao" AS ENUM ('juridica', 'fiscal', 'trabalhista', 'tecnica', 'economica', 'complementar');

-- CreateEnum
CREATE TYPE "StatusDocumentoEmpresa" AS ENUM ('vigente', 'vencendo', 'vencido', 'substituido');

-- CreateEnum
CREATE TYPE "NivelAlerta" AS ENUM ('verde', 'amarelo', 'laranja', 'vermelho', 'preto');

-- CreateEnum
CREATE TYPE "AcaoAuditoriaDoc" AS ENUM ('upload', 'substituicao', 'exclusao', 'alteracao_metadata', 'download');

-- CreateEnum
CREATE TYPE "TipoFonte" AS ENUM ('pncp', 'petronect', 'rss', 'scraping', 'api_generica');

-- CreateEnum
CREATE TYPE "StatusExecucao" AS ENUM ('executando', 'concluida', 'erro', 'cancelada');

-- CreateEnum
CREATE TYPE "StatusItem" AS ENUM ('criado', 'atualizado', 'duplicado', 'descartado', 'erro');

-- CreateTable
CREATE TABLE "empresa" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "segmento" TEXT,
    "pncp_preferencias" JSONB,
    "ia_config" JSONB,
    "configuracao_score" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros_estrategicos" (
    "id" TEXT NOT NULL,
    "categoria" "CategoriaParametro" NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "peso" DOUBLE PRECISION,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametros_estrategicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criterios_score" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoCriterio" NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "formula_ref" TEXT,
    "faixa_min" DOUBLE PRECISION,
    "faixa_max" DOUBLE PRECISION,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "criterios_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regras_aderencia" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoRegra" NOT NULL,
    "campo" TEXT NOT NULL,
    "operador" "OperadorRegra" NOT NULL,
    "valor" TEXT NOT NULL,
    "peso" DOUBLE PRECISION,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regras_aderencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_parametros" (
    "id" TEXT NOT NULL,
    "tabela" TEXT NOT NULL,
    "registro_id" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valor_anterior" TEXT,
    "valor_novo" TEXT,
    "acao" "AcaoAuditoria" NOT NULL,
    "alterado_por_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_parametros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fontes_captacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoFonte" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "parametros" JSONB NOT NULL DEFAULT '{}',
    "credenciais" JSONB,
    "filtros" JSONB,
    "periodicidade" TEXT,
    "ultima_sincronizacao" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fontes_captacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execucoes_captacao" (
    "id" TEXT NOT NULL,
    "fonte_id" TEXT NOT NULL,
    "status" "StatusExecucao" NOT NULL,
    "iniciada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizada_em" TIMESTAMP(3),
    "total_captados" INTEGER NOT NULL DEFAULT 0,
    "total_criados" INTEGER NOT NULL DEFAULT 0,
    "total_atualizados" INTEGER NOT NULL DEFAULT 0,
    "total_duplicados" INTEGER NOT NULL DEFAULT 0,
    "total_descartados" INTEGER NOT NULL DEFAULT 0,
    "total_erros" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "log" JSONB,
    "disparado_por" TEXT,

    CONSTRAINT "execucoes_captacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_captados" (
    "id" TEXT NOT NULL,
    "execucao_id" TEXT NOT NULL,
    "identificador_externo" TEXT NOT NULL,
    "dados_brutos" JSONB NOT NULL,
    "status" "StatusItem" NOT NULL,
    "licitacao_id" TEXT,
    "motivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_captados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL DEFAULT 'default',
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT,
    "palavras_chave" TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kanban_colunas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#3B82F6',
    "tipo" TEXT NOT NULL DEFAULT 'normal',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "acoes_padrao" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cor_etapa" TEXT,
    "papel_responsavel" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kanban_colunas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licitacoes" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "orgao" TEXT,
    "objeto" TEXT,
    "modalidade" TEXT,
    "uf" TEXT,
    "municipio" TEXT,
    "valor_estimado" DECIMAL(15,2),
    "data_publicacao" TIMESTAMP(3),
    "data_sessao" TIMESTAMP(3),
    "link_origem" TEXT,
    "observacoes" TEXT,
    "dados_extraidos" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "fonte_id" TEXT,
    "identificador_externo" TEXT,
    "aderencia_automatica" JSONB,
    "score_preliminar" DOUBLE PRECISION,
    "classificacao_preliminar" TEXT,

    CONSTRAINT "licitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kanban_cards" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "coluna_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "responsavel_id" TEXT,
    "urgente" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "checklist_progresso" JSONB NOT NULL DEFAULT '{}',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kanban_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "coluna_origem" TEXT,
    "coluna_destino" TEXT NOT NULL,
    "motivo" TEXT,
    "movido_por" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licitacoes_analise" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "aderencia_direta_existe" BOOLEAN,
    "aderencia_direta_nivel" TEXT,
    "aderencia_aplicacao_existe" BOOLEAN,
    "aderencia_aplicacao_nivel" TEXT,
    "contexto_oculto_existe" BOOLEAN,
    "contexto_oculto_nivel" TEXT,
    "oportunidade_oculta_existe" BOOLEAN,
    "oportunidade_oculta_forca" TEXT,
    "oportunidade_oculta_resumo" TEXT,
    "oportunidade_no_objeto" BOOLEAN NOT NULL DEFAULT false,
    "oportunidade_no_tr" BOOLEAN NOT NULL DEFAULT false,
    "oportunidade_nos_lotes" BOOLEAN NOT NULL DEFAULT false,
    "oportunidade_nos_itens" BOOLEAN NOT NULL DEFAULT false,
    "oportunidade_na_planilha" BOOLEAN NOT NULL DEFAULT false,
    "oportunidade_no_memorial" BOOLEAN NOT NULL DEFAULT false,
    "oportunidade_em_anexo_tecnico" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licitacoes_analise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licitacoes_analise_ia" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resultado_json" JSONB,
    "modelo" TEXT,
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licitacoes_analise_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licitacoes_score" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "score_final" DOUBLE PRECISION NOT NULL,
    "classificacao" TEXT NOT NULL,
    "score_aderencia_direta" DOUBLE PRECISION,
    "score_aderencia_aplicacao" DOUBLE PRECISION,
    "score_contexto_oculto" DOUBLE PRECISION,
    "score_modelo_comercial" DOUBLE PRECISION,
    "score_potencial_economico" DOUBLE PRECISION,
    "score_qualidade_evidencia" DOUBLE PRECISION,
    "score_justificativa_resumida" TEXT,
    "valor_capturavel_estimado" DECIMAL(15,2),
    "valor_capturavel_faixa_min" DECIMAL(15,2),
    "valor_capturavel_faixa_max" DECIMAL(15,2),
    "valor_capturavel_moeda" TEXT NOT NULL DEFAULT 'BRL',
    "valor_capturavel_nivel_confianca" TEXT,
    "valor_capturavel_metodo_estimativa" TEXT,
    "valor_capturavel_justificativa" TEXT,
    "valor_capturavel_base_documental" JSONB,
    "valor_capturavel_observacao" TEXT,
    "falso_negativo_existe_risco" BOOLEAN NOT NULL DEFAULT false,
    "falso_negativo_nivel_risco" TEXT,
    "falso_negativo_motivos" JSONB,
    "falso_negativo_trechos_criticos" JSONB,
    "falso_negativo_resumo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licitacoes_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licitacoes_parecer" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "classificacao_final" TEXT,
    "prioridade_comercial" TEXT,
    "vale_esforco_comercial" BOOLEAN,
    "recomendacao_final" TEXT,
    "resumo" TEXT,
    "oportunidade_direta" BOOLEAN NOT NULL DEFAULT false,
    "oportunidade_indireta" BOOLEAN NOT NULL DEFAULT false,
    "oportunidade_oculta_item_lote_anexo" BOOLEAN NOT NULL DEFAULT false,
    "oportunidade_inexistente" BOOLEAN NOT NULL DEFAULT false,
    "risco_falso_positivo" BOOLEAN NOT NULL DEFAULT false,
    "risco_falso_negativo_so_titulo" BOOLEAN NOT NULL DEFAULT false,
    "onde_esta_oportunidade" JSONB,
    "solucoes_que_multiteiner_poderia_ofertar" JSONB,
    "proximo_pasos_recomendado" JSONB,
    "riscos_limitacoes" JSONB,
    "evidencias_principais" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licitacoes_parecer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concorrentes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" VARCHAR(18),
    "segmentos" TEXT[],
    "porte" TEXT,
    "uf" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concorrentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultados_licitacao" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "empresa_vencedora_id" TEXT,
    "nome_vencedor_externo" TEXT,
    "valor_vencedor" DECIMAL(15,2),
    "valor_nossa_proposta" DECIMAL(15,2),
    "diferenca_percentual" DOUBLE PRECISION,
    "criterio_julgamento" TEXT,
    "motivo_derrota" TEXT,
    "motivo_detalhado" TEXT,
    "licoes_aprendidas" TEXT,
    "registrado_por_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resultados_licitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_resultado" (
    "id" TEXT NOT NULL,
    "resultado_id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "quantidade" DOUBLE PRECISION,
    "unidade" TEXT,
    "valor_unitario_nosso" DECIMAL(15,2),
    "valor_unitario_vencedor" DECIMAL(15,2),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_resultado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_edital" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "CategoriaHabilitacao" NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "documento_empresa_id" TEXT,
    "observacoes" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_edital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisoes_go_nogo" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "decisao" TEXT NOT NULL,
    "score_no_momento" DOUBLE PRECISION,
    "checklist_pronto" BOOLEAN NOT NULL DEFAULT false,
    "valor_estimado_capturavel" DECIMAL(15,2),
    "riscos_identificados" JSONB,
    "justificativa" TEXT,
    "decidido_por_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisoes_go_nogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "licitacao_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_original" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_por_id" TEXT,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acoes_ia" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT,
    "tipo" TEXT NOT NULL,
    "prompt" TEXT,
    "resposta" TEXT,
    "resposta_json" JSONB,
    "modelo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processando',
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acoes_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_empresa" (
    "id" TEXT NOT NULL,
    "cnpj" VARCHAR(18) NOT NULL,
    "categoria" "CategoriaHabilitacao" NOT NULL,
    "tipo_documento" VARCHAR(100) NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_original" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "versao_anterior_id" TEXT,
    "data_emissao" TIMESTAMP(3),
    "data_validade" TIMESTAMP(3),
    "orgao_emissor" VARCHAR(200),
    "observacoes" TEXT,
    "status" "StatusDocumentoEmpresa" NOT NULL DEFAULT 'vigente',
    "nivel_alerta" "NivelAlerta",
    "enviado_por_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes_alerta_doc" (
    "id" TEXT NOT NULL,
    "tipo_documento" VARCHAR(100) NOT NULL,
    "dias_verde" INTEGER NOT NULL DEFAULT 90,
    "dias_amarelo" INTEGER NOT NULL DEFAULT 60,
    "dias_laranja" INTEGER NOT NULL DEFAULT 30,
    "dias_vermelho" INTEGER NOT NULL DEFAULT 15,
    "dias_preto" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_alerta_doc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_documentos" (
    "id" TEXT NOT NULL,
    "documento_id" TEXT NOT NULL,
    "acao" "AcaoAuditoriaDoc" NOT NULL,
    "detalhes" TEXT,
    "realizado_por_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atestados_tecnicos" (
    "id" TEXT NOT NULL,
    "documento_empresa_id" TEXT NOT NULL,
    "cliente_nome" TEXT NOT NULL,
    "cliente_cnpj" VARCHAR(18),
    "descricao_servico" TEXT NOT NULL,
    "tags" TEXT[],
    "valor_contrato" DECIMAL(15,2),
    "data_inicio" TIMESTAMP(3),
    "data_fim" TIMESTAMP(3),
    "possui_cat" BOOLEAN NOT NULL DEFAULT false,
    "numero_cat" TEXT,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atestados_tecnicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates_declaracao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT NOT NULL,
    "conteudo_html" TEXT NOT NULL,
    "variaveis" JSONB NOT NULL DEFAULT '[]',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_declaracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified" TIMESTAMP(3),
    "senha" VARCHAR(255),
    "name" VARCHAR(100),
    "image" TEXT,
    "role" VARCHAR(20) NOT NULL DEFAULT 'user',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_auth" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "contas_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes_auth" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessoes_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificacao_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "parametros_estrategicos_categoria_chave_key" ON "parametros_estrategicos"("categoria", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "criterios_score_nome_key" ON "criterios_score"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "licitacoes_numero_key" ON "licitacoes"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "licitacoes_identificador_externo_key" ON "licitacoes"("identificador_externo");

-- CreateIndex
CREATE UNIQUE INDEX "kanban_cards_licitacao_id_key" ON "kanban_cards"("licitacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "licitacoes_analise_licitacao_id_key" ON "licitacoes_analise"("licitacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "licitacoes_analise_ia_licitacao_id_key" ON "licitacoes_analise_ia"("licitacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "licitacoes_score_licitacao_id_key" ON "licitacoes_score"("licitacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "licitacoes_parecer_licitacao_id_key" ON "licitacoes_parecer"("licitacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "concorrentes_cnpj_key" ON "concorrentes"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "resultados_licitacao_licitacao_id_key" ON "resultados_licitacao"("licitacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "decisoes_go_nogo_licitacao_id_key" ON "decisoes_go_nogo"("licitacao_id");

-- CreateIndex
CREATE INDEX "documentos_empresa_cnpj_categoria_idx" ON "documentos_empresa"("cnpj", "categoria");

-- CreateIndex
CREATE INDEX "documentos_empresa_data_validade_idx" ON "documentos_empresa"("data_validade");

-- CreateIndex
CREATE INDEX "documentos_empresa_status_idx" ON "documentos_empresa"("status");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_alerta_doc_tipo_documento_key" ON "configuracoes_alerta_doc"("tipo_documento");

-- CreateIndex
CREATE INDEX "auditoria_documentos_documento_id_idx" ON "auditoria_documentos"("documento_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contas_auth_provider_provider_account_id_key" ON "contas_auth"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_auth_session_token_key" ON "sessoes_auth"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verificacao_tokens_token_key" ON "verificacao_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificacao_tokens_identifier_token_key" ON "verificacao_tokens"("identifier", "token");

-- AddForeignKey
ALTER TABLE "auditoria_parametros" ADD CONSTRAINT "auditoria_parametros_alterado_por_id_fkey" FOREIGN KEY ("alterado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucoes_captacao" ADD CONSTRAINT "execucoes_captacao_fonte_id_fkey" FOREIGN KEY ("fonte_id") REFERENCES "fontes_captacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_captados" ADD CONSTRAINT "itens_captados_execucao_id_fkey" FOREIGN KEY ("execucao_id") REFERENCES "execucoes_captacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_captados" ADD CONSTRAINT "itens_captados_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licitacoes" ADD CONSTRAINT "licitacoes_fonte_id_fkey" FOREIGN KEY ("fonte_id") REFERENCES "fontes_captacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanban_cards" ADD CONSTRAINT "kanban_cards_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanban_cards" ADD CONSTRAINT "kanban_cards_coluna_id_fkey" FOREIGN KEY ("coluna_id") REFERENCES "kanban_colunas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanban_cards" ADD CONSTRAINT "kanban_cards_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "kanban_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licitacoes_analise" ADD CONSTRAINT "licitacoes_analise_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licitacoes_analise_ia" ADD CONSTRAINT "licitacoes_analise_ia_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licitacoes_score" ADD CONSTRAINT "licitacoes_score_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licitacoes_parecer" ADD CONSTRAINT "licitacoes_parecer_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados_licitacao" ADD CONSTRAINT "resultados_licitacao_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados_licitacao" ADD CONSTRAINT "resultados_licitacao_empresa_vencedora_id_fkey" FOREIGN KEY ("empresa_vencedora_id") REFERENCES "concorrentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados_licitacao" ADD CONSTRAINT "resultados_licitacao_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_resultado" ADD CONSTRAINT "itens_resultado_resultado_id_fkey" FOREIGN KEY ("resultado_id") REFERENCES "resultados_licitacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_edital" ADD CONSTRAINT "checklist_edital_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_edital" ADD CONSTRAINT "checklist_edital_documento_empresa_id_fkey" FOREIGN KEY ("documento_empresa_id") REFERENCES "documentos_empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisoes_go_nogo" ADD CONSTRAINT "decisoes_go_nogo_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisoes_go_nogo" ADD CONSTRAINT "decisoes_go_nogo_decidido_por_id_fkey" FOREIGN KEY ("decidido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes_ia" ADD CONSTRAINT "acoes_ia_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_empresa" ADD CONSTRAINT "documentos_empresa_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_empresa" ADD CONSTRAINT "documentos_empresa_versao_anterior_id_fkey" FOREIGN KEY ("versao_anterior_id") REFERENCES "documentos_empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_documentos" ADD CONSTRAINT "auditoria_documentos_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos_empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_documentos" ADD CONSTRAINT "auditoria_documentos_realizado_por_id_fkey" FOREIGN KEY ("realizado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atestados_tecnicos" ADD CONSTRAINT "atestados_tecnicos_documento_empresa_id_fkey" FOREIGN KEY ("documento_empresa_id") REFERENCES "documentos_empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_auth" ADD CONSTRAINT "contas_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_auth" ADD CONSTRAINT "sessoes_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

