
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoFonte" AS ENUM ('pncp', 'petronect', 'rss', 'scraping', 'api_generica');

-- CreateEnum
CREATE TYPE "StatusExecucao" AS ENUM ('executando', 'concluida', 'erro', 'cancelada');

-- CreateEnum
CREATE TYPE "StatusItem" AS ENUM ('criado', 'atualizado', 'duplicado', 'descartado', 'erro');

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
CREATE UNIQUE INDEX "licitacoes_numero_key" ON "licitacoes"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "kanban_cards_licitacao_id_key" ON "kanban_cards"("licitacao_id");

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
ALTER TABLE "execucoes_captacao" ADD CONSTRAINT "execucoes_captacao_fonte_id_fkey" FOREIGN KEY ("fonte_id") REFERENCES "fontes_captacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_captados" ADD CONSTRAINT "itens_captados_execucao_id_fkey" FOREIGN KEY ("execucao_id") REFERENCES "execucoes_captacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_captados" ADD CONSTRAINT "itens_captados_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "contas_auth" ADD CONSTRAINT "contas_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_auth" ADD CONSTRAINT "sessoes_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

