/**
 * Orquestrador da extração de ficha.
 *
 * Lê a `Configuracao` global pra descobrir qual provedor de IA usar
 * (Anthropic, OpenAI, Gemini ou LLM interna OpenAI-compatível) e delega
 * pro provedor correspondente em `provedores/*.ts`.
 */

import { obterConfiguracao } from "@/lib/configuracao";
import { extrairFichaAnthropic } from "./provedores/anthropic";
import { extrairFichaOpenAI } from "./provedores/openai";
import { extrairFichaGemini } from "./provedores/gemini";
import type {
  ConfigProvedor,
  FichaIA,
  LicitacaoParaExtracao,
  ResultadoExtracao,
} from "./tipos";
import { PROMPT_VERSAO } from "./tipos";

export { PROMPT_VERSAO };
export type { FichaIA, LicitacaoParaExtracao, ResultadoExtracao };

/**
 * Fallback de chave: se a configuração não tiver chave salva, usamos a
 * variável de ambiente correspondente (mantém compatibilidade com instalações
 * que ainda dependem de `ANTHROPIC_API_KEY`, etc.).
 */
function chaveFallbackPorEnv(provider: string): string | null {
  switch (provider) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY?.trim() || process.env.LLM_API_KEY?.trim() || null;
    case "openai":
      return process.env.OPENAI_API_KEY?.trim() || null;
    case "gemini":
      return (
        process.env.GEMINI_API_KEY?.trim() ||
        process.env.GOOGLE_API_KEY?.trim() ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
        null
      );
    default:
      return null;
  }
}

export async function extrairFicha(
  licitacao: LicitacaoParaExtracao
): Promise<ResultadoExtracao> {
  const cfg = await obterConfiguracao();
  const provider = cfg.llmProvider;

  const apiKey = cfg.llmApiKey?.trim() || chaveFallbackPorEnv(provider);
  if (!apiKey) {
    throw new Error(
      "Chave de API não configurada. Acesse Configurações → Modelo de IA e cadastre a chave."
    );
  }

  const baseUrl = cfg.llmBaseUrl?.trim() || null;
  if (provider === "interna" && !baseUrl) {
    throw new Error(
      "URL da LLM interna não configurada. Acesse Configurações → Modelo de IA e informe a URL base."
    );
  }

  const config: ConfigProvedor = {
    apiKey,
    modelo: cfg.llmModelo?.trim() || "",
    baseUrl,
  };

  switch (provider) {
    case "anthropic":
      return extrairFichaAnthropic(config, licitacao);
    case "openai":
      return extrairFichaOpenAI(config, licitacao, "openai");
    case "gemini":
      return extrairFichaGemini(config, licitacao);
    case "interna":
      return extrairFichaOpenAI(config, licitacao, "interna");
    default:
      throw new Error(`Provedor de IA desconhecido: ${provider}`);
  }
}
