-- Campos da licitação a preencher na importação PNCP (JSON de booleans; vazio = padrão no código)
ALTER TABLE "configuracao_sistema" ADD COLUMN IF NOT EXISTS "campos_captacao_pncp" JSONB NOT NULL DEFAULT '{}';
