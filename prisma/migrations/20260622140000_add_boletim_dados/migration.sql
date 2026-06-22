-- Tabela com os dados brutos da planilha do boletim ConLicitação:
-- um campo distinto por coluna da planilha, para preservar tudo e permitir
-- busca posterior. Relação 1:1 com licitacoes (apaga junto com a licitação).
CREATE TABLE "boletim_dados" (
    "id" TEXT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "numero_conlicitacao" TEXT,
    "codigo" TEXT,
    "orgao" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "edital" TEXT,
    "site1" TEXT,
    "site2" TEXT,
    "processo" TEXT,
    "valor_estimado" TEXT,
    "itens" TEXT,
    "situacao" TEXT,
    "documento" TEXT,
    "abertura" TEXT,
    "prazo" TEXT,
    "objeto" TEXT,
    "observacao" TEXT,
    "anexos" TEXT,
    "atualizada_em" TEXT,
    "boletim" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boletim_dados_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "boletim_dados_licitacao_id_key" ON "boletim_dados"("licitacao_id");

ALTER TABLE "boletim_dados" ADD CONSTRAINT "boletim_dados_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
