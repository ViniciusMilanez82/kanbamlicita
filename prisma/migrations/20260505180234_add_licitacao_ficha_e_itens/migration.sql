-- Adiciona Ficha (1:1) e Itens (1:N) da licitação.
-- Ficha: resultado da extração IA do edital (M5).
-- Itens: espelho do endpoint PNCP /v1/orgaos/{cnpj}/compras/{ano}/{seq}/itens.

-- CreateEnum
CREATE TYPE "StatusExtracaoFicha" AS ENUM ('pendente', 'extraindo', 'concluida', 'erro');

-- CreateTable
CREATE TABLE "licitacoes_fichas" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "resumo" TEXT,
    "objeto_detalhado" TEXT,
    "prazo_execucao" TEXT,
    "local_execucao" TEXT,
    "garantia" TEXT,
    "criterio_julgamento" TEXT,
    "forma_pagamento" TEXT,
    "reajuste" TEXT,
    "exigencias_habilitacao" JSONB,
    "criterios_tecnicos" JSONB,
    "riscos" JSONB,
    "oportunidades" JSONB,
    "observacoes_ia" TEXT,
    "status" "StatusExtracaoFicha" NOT NULL DEFAULT 'pendente',
    "extracao_iniciada_em" TIMESTAMP(3),
    "extracao_finalizada_em" TIMESTAMP(3),
    "extracao_erro" TEXT,
    "modelo_ia" TEXT,
    "versao_prompt" TEXT,
    "tokens_input" INTEGER,
    "tokens_output" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licitacoes_fichas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licitacoes_itens" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "numero_item" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(18,4),
    "unidade_medida" TEXT,
    "material_ou_servico" TEXT,
    "material_ou_servico_nome" TEXT,
    "valor_unitario_estimado" DECIMAL(18,4),
    "valor_total" DECIMAL(18,2),
    "item_categoria_id" INTEGER,
    "item_categoria_nome" TEXT,
    "ncm_nbs_codigo" TEXT,
    "ncm_nbs_descricao" TEXT,
    "criterio_julgamento_id" INTEGER,
    "criterio_julgamento_nome" TEXT,
    "situacao_compra_item" INTEGER,
    "tipo_beneficio" INTEGER,
    "tipo_beneficio_nome" TEXT,
    "tem_resultado" BOOLEAN,
    "dados_brutos_pncp" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licitacoes_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "licitacoes_fichas_licitacao_id_key" ON "licitacoes_fichas"("licitacao_id");

-- CreateIndex
CREATE INDEX "licitacoes_itens_licitacao_id_idx" ON "licitacoes_itens"("licitacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "licitacoes_itens_licitacao_id_numero_item_key" ON "licitacoes_itens"("licitacao_id", "numero_item");

-- AddForeignKey
ALTER TABLE "licitacoes_fichas" ADD CONSTRAINT "licitacoes_fichas_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licitacoes_itens" ADD CONSTRAINT "licitacoes_itens_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
