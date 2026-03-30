import type { IaProvider } from "./provider";
import { db } from "@/lib/db";

type IaConfig = {
  provedor?: string;
  chaveApi?: string;
  modelo?: string;
};

let instance: IaProvider | null = null;
let lastConfigHash = "";

/**
 * Busca config de IA do banco. Se tiver chave salva, usa.
 * Se não, fallback para variáveis de ambiente.
 */
async function loadConfig(): Promise<{
  provider: string;
  apiKey: string;
  model: string;
}> {
  try {
    const empresa = await db.empresa.findFirst();
    const cfg = (empresa?.iaConfig as IaConfig) ?? {};

    const provider = cfg.provedor || process.env.LLM_PROVIDER || "openai";
    const apiKey =
      cfg.chaveApi ||
      process.env.LLM_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      "";
    const model = cfg.modelo || process.env.LLM_MODEL || "";

    return { provider, apiKey, model };
  } catch {
    return {
      provider: process.env.LLM_PROVIDER || "openai",
      apiKey:
        process.env.LLM_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        "",
      model: process.env.LLM_MODEL || "",
    };
  }
}

export async function getIaProvider(): Promise<IaProvider> {
  const cfg = await loadConfig();
  const hash = `${cfg.provider}:${cfg.apiKey.slice(-8)}:${cfg.model}`;

  // Se a config mudou, recria o provider
  if (instance && hash === lastConfigHash) {
    return instance;
  }

  lastConfigHash = hash;

  if (!cfg.apiKey) {
    throw new Error(
      "Nenhuma chave de IA configurada. Vá em Configurações → Inteligência Artificial e coloque sua chave."
    );
  }

  if (cfg.provider === "anthropic") {
    const { AnthropicProvider } = require("./anthropic");
    instance = new AnthropicProvider(cfg.apiKey, cfg.model);
  } else {
    const { OpenAiProvider } = require("./openai");
    instance = new OpenAiProvider(cfg.apiKey, cfg.model);
  }

  return instance!;
}

export function resetIaProvider() {
  instance = null;
  lastConfigHash = "";
}
