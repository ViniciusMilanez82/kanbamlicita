-- CreateEnum
CREATE TYPE "LlmProvider" AS ENUM ('anthropic', 'openai', 'gemini', 'interna');

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "llm_provider" "LlmProvider" NOT NULL DEFAULT 'anthropic',
    "llm_modelo" TEXT,
    "llm_api_key" TEXT,
    "llm_base_url" TEXT,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);
