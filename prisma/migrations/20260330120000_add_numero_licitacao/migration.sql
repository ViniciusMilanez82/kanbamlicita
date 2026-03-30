-- Adiciona campo numero sequencial à tabela licitacoes
CREATE SEQUENCE IF NOT EXISTS licitacoes_numero_seq;

ALTER TABLE "licitacoes" ADD COLUMN "numero" INTEGER NOT NULL DEFAULT nextval('licitacoes_numero_seq');

-- Preenche registros existentes com números sequenciais baseados na data de criação
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY criado_em) AS rn
  FROM licitacoes
)
UPDATE licitacoes SET numero = numbered.rn FROM numbered WHERE licitacoes.id = numbered.id;

-- Ajusta a sequence para continuar após o último número
SELECT setval('licitacoes_numero_seq', COALESCE((SELECT MAX(numero) FROM licitacoes), 0));

-- Cria índice único
CREATE UNIQUE INDEX "licitacoes_numero_key" ON "licitacoes"("numero");
