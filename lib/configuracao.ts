/**
 * Helper para a configuração global do sistema (linha única em `configuracoes`).
 * Hoje guarda a escolha de LLM e suas credenciais.
 */

import { db } from "@/lib/db";
import type { Configuracao, LlmProvider } from "@/lib/generated/prisma/client";

export const CONFIG_ID = "default";

export type ConfiguracaoPublica = {
  llmProvider: LlmProvider;
  llmModelo: string | null;
  llmBaseUrl: string | null;
  apiKeyMascarada: string | null;
  temApiKey: boolean;
};

export async function obterConfiguracao(): Promise<Configuracao> {
  const cfg = await db.configuracao.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID },
    update: {},
  });
  return cfg;
}

/** Mascara a chave deixando só os últimos 4 caracteres visíveis. */
export function mascararChave(chave: string | null | undefined): string | null {
  if (!chave) return null;
  if (chave.length <= 4) return "•".repeat(chave.length);
  return "•".repeat(Math.max(4, chave.length - 4)) + chave.slice(-4);
}

export function paraPublica(cfg: Configuracao): ConfiguracaoPublica {
  return {
    llmProvider: cfg.llmProvider,
    llmModelo: cfg.llmModelo,
    llmBaseUrl: cfg.llmBaseUrl,
    apiKeyMascarada: mascararChave(cfg.llmApiKey),
    temApiKey: Boolean(cfg.llmApiKey),
  };
}
