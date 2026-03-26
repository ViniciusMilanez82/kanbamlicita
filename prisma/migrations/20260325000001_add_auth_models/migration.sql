-- CreateTable usuarios
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified" TIMESTAMP(3),
    "senha" VARCHAR(255),
    "name" VARCHAR(100),
    "image" TEXT,
    "role" VARCHAR(20) NOT NULL DEFAULT 'user',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable contas_auth
CREATE TABLE "contas_auth" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "contas_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable sessoes_auth
CREATE TABLE "sessoes_auth" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessoes_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable verificacao_tokens
CREATE TABLE "verificacao_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contas_auth_provider_provider_account_id_key" ON "contas_auth"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_auth_session_token_key" ON "sessoes_auth"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verificacao_tokens_token_key" ON "verificacao_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificacao_tokens_identifier_token_key" ON "verificacao_tokens"("identifier", "token");

-- AddForeignKey
ALTER TABLE "contas_auth" ADD CONSTRAINT "contas_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_auth" ADD CONSTRAINT "sessoes_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
