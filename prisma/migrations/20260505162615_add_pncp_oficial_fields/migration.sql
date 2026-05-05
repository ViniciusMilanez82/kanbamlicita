-- Adiciona campos do schema oficial PNCP /v1/contratacoes/proposta (Manual §6.4)
ALTER TABLE "licitacoes"
  ADD COLUMN "valor_homologado" DECIMAL(15, 2),
  ADD COLUMN "data_encerramento_proposta" TIMESTAMP(3),
  ADD COLUMN "modalidade_id" INTEGER,
  ADD COLUMN "modalidade_nome" TEXT,
  ADD COLUMN "modo_disputa_nome" TEXT,
  ADD COLUMN "situacao_id" INTEGER,
  ADD COLUMN "situacao_nome" TEXT,
  ADD COLUMN "tipo_instrumento_convocatorio_nome" TEXT,
  ADD COLUMN "srp" BOOLEAN,
  ADD COLUMN "amparo_legal_codigo" INTEGER,
  ADD COLUMN "amparo_legal_nome" TEXT,
  ADD COLUMN "processo" TEXT,
  ADD COLUMN "numero_compra" TEXT,
  ADD COLUMN "informacao_complementar" TEXT;
