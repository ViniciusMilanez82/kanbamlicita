-- CreateTable
CREATE TABLE "configuracao_sistema" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "pesosScore" JSONB NOT NULL DEFAULT '{"aderenciaDireta":15,"aderenciaAplicacao":25,"contextoOculto":20,"modeloComercial":15,"potencialEconomico":15,"qualidadeEvidencia":10}',
    "faixasScore" JSONB NOT NULL DEFAULT '{"aPlus":85,"a":70,"b":55,"c":40}',
    "segmentos" JSONB NOT NULL DEFAULT '[]',
    "listasParecerTab" JSONB NOT NULL DEFAULT '{}',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_sistema_pkey" PRIMARY KEY ("id")
);
