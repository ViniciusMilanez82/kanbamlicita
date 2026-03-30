-- Preferências de busca na API pública de consulta PNCP (por empresa)
ALTER TABLE "empresa" ADD COLUMN "pncp_preferencias" JSONB;
