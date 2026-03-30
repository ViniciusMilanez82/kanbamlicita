/*
  Warnings:

  - You are about to drop the column `bloqueado` on the `kanban_cards` table. All the data in the column will be lost.
  - You are about to drop the column `coluna_atual` on the `kanban_cards` table. All the data in the column will be lost.
  - You are about to drop the column `motivo_bloqueio` on the `kanban_cards` table. All the data in the column will be lost.
  - You are about to drop the column `ordem_coluna` on the `kanban_cards` table. All the data in the column will be lost.
  - You are about to drop the column `criterio_julgamento` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `envolve_desmobilizacao` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `envolve_desmontagem` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `envolve_fornecimento` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `envolve_instalacao` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `envolve_locacao` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `envolve_manutencao` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `envolve_mobilizacao` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `envolve_montagem` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `envolve_obra` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `envolve_servico` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `envolve_transporte` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `fonte_captacao` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `id_externo` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `moeda` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `numero_licitacao` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `numero_processo` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `objeto_resumido` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `possui_itens` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `possui_lotes` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `possui_planilha_orcamentaria` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `possui_precos_unitarios` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `possui_quantitativos` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `regiao` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `resumo_natureza` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `segmento` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `status_pipeline` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_disputa` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the column `valor_global_estimado` on the `licitacoes` table. All the data in the column will be lost.
  - You are about to drop the `captacao_execucoes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `captacao_fontes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `captacao_payloads` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `configuracao_sistema` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `kanban_movimentacoes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `licitacao_aliases_origem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `licitacao_analise` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `licitacao_analises_ia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `licitacao_documentos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `licitacao_itens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `licitacao_parecer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `licitacao_score` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `licitacao_sinais` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `coluna_id` to the `kanban_cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titulo` to the `licitacoes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "captacao_execucoes" DROP CONSTRAINT "captacao_execucoes_fonte_id_fkey";

-- DropForeignKey
ALTER TABLE "captacao_payloads" DROP CONSTRAINT "captacao_payloads_execucao_id_fkey";

-- DropForeignKey
ALTER TABLE "captacao_payloads" DROP CONSTRAINT "captacao_payloads_fonte_id_fkey";

-- DropForeignKey
ALTER TABLE "kanban_movimentacoes" DROP CONSTRAINT "kanban_movimentacoes_card_id_fkey";

-- DropForeignKey
ALTER TABLE "kanban_movimentacoes" DROP CONSTRAINT "kanban_movimentacoes_licitacao_id_fkey";

-- DropForeignKey
ALTER TABLE "licitacao_aliases_origem" DROP CONSTRAINT "licitacao_aliases_origem_fonte_id_fkey";

-- DropForeignKey
ALTER TABLE "licitacao_aliases_origem" DROP CONSTRAINT "licitacao_aliases_origem_licitacao_id_fkey";

-- DropForeignKey
ALTER TABLE "licitacao_analise" DROP CONSTRAINT "licitacao_analise_licitacao_id_fkey";

-- DropForeignKey
ALTER TABLE "licitacao_analises_ia" DROP CONSTRAINT "licitacao_analises_ia_licitacao_id_fkey";

-- DropForeignKey
ALTER TABLE "licitacao_documentos" DROP CONSTRAINT "licitacao_documentos_licitacao_id_fkey";

-- DropForeignKey
ALTER TABLE "licitacao_itens" DROP CONSTRAINT "licitacao_itens_licitacao_id_fkey";

-- DropForeignKey
ALTER TABLE "licitacao_parecer" DROP CONSTRAINT "licitacao_parecer_licitacao_id_fkey";

-- DropForeignKey
ALTER TABLE "licitacao_score" DROP CONSTRAINT "licitacao_score_licitacao_id_fkey";

-- DropForeignKey
ALTER TABLE "licitacao_sinais" DROP CONSTRAINT "licitacao_sinais_licitacao_id_fkey";

-- AlterTable
ALTER TABLE "kanban_cards" DROP COLUMN "bloqueado",
DROP COLUMN "coluna_atual",
DROP COLUMN "motivo_bloqueio",
DROP COLUMN "ordem_coluna",
ADD COLUMN     "coluna_id" TEXT NOT NULL,
ADD COLUMN     "notas" TEXT,
ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "licitacoes" DROP COLUMN "criterio_julgamento",
DROP COLUMN "envolve_desmobilizacao",
DROP COLUMN "envolve_desmontagem",
DROP COLUMN "envolve_fornecimento",
DROP COLUMN "envolve_instalacao",
DROP COLUMN "envolve_locacao",
DROP COLUMN "envolve_manutencao",
DROP COLUMN "envolve_mobilizacao",
DROP COLUMN "envolve_montagem",
DROP COLUMN "envolve_obra",
DROP COLUMN "envolve_servico",
DROP COLUMN "envolve_transporte",
DROP COLUMN "fonte_captacao",
DROP COLUMN "id_externo",
DROP COLUMN "moeda",
DROP COLUMN "numero_licitacao",
DROP COLUMN "numero_processo",
DROP COLUMN "objeto_resumido",
DROP COLUMN "possui_itens",
DROP COLUMN "possui_lotes",
DROP COLUMN "possui_planilha_orcamentaria",
DROP COLUMN "possui_precos_unitarios",
DROP COLUMN "possui_quantitativos",
DROP COLUMN "regiao",
DROP COLUMN "resumo_natureza",
DROP COLUMN "segmento",
DROP COLUMN "status_pipeline",
DROP COLUMN "tipo_disputa",
DROP COLUMN "valor_global_estimado",
ADD COLUMN     "dados_extraidos" JSONB,
ADD COLUMN     "objeto" TEXT,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "titulo" TEXT NOT NULL,
ADD COLUMN     "valor_estimado" DECIMAL(15,2),
ALTER COLUMN "modalidade" SET DATA TYPE TEXT,
ALTER COLUMN "data_publicacao" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "uf" SET DATA TYPE TEXT,
ALTER COLUMN "municipio" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "captacao_execucoes";

-- DropTable
DROP TABLE "captacao_fontes";

-- DropTable
DROP TABLE "captacao_payloads";

-- DropTable
DROP TABLE "configuracao_sistema";

-- DropTable
DROP TABLE "kanban_movimentacoes";

-- DropTable
DROP TABLE "licitacao_aliases_origem";

-- DropTable
DROP TABLE "licitacao_analise";

-- DropTable
DROP TABLE "licitacao_analises_ia";

-- DropTable
DROP TABLE "licitacao_documentos";

-- DropTable
DROP TABLE "licitacao_itens";

-- DropTable
DROP TABLE "licitacao_parecer";

-- DropTable
DROP TABLE "licitacao_score";

-- DropTable
DROP TABLE "licitacao_sinais";

-- DropEnum
DROP TYPE "KanbanColuna";

-- CreateTable
CREATE TABLE "empresa" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "segmento" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
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
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kanban_colunas_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanban_cards" ADD CONSTRAINT "kanban_cards_coluna_id_fkey" FOREIGN KEY ("coluna_id") REFERENCES "kanban_colunas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "kanban_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes_ia" ADD CONSTRAINT "acoes_ia_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
