-- Adiciona coluna para o link do sistema de origem (BLL, ComprasNet, etc.)
-- vindo da API consulta v1 do PNCP.
ALTER TABLE "licitacoes" ADD COLUMN "link_sistema_origem" TEXT;
