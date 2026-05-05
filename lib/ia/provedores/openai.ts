import OpenAI from "openai";
import { APIError } from "openai/error";
import {
  FICHA_PROPERTIES,
  SYSTEM_PROMPT,
  TOOL_DESCRIPTION,
  TOOL_NAME,
  type ConfigProvedor,
  type FichaIA,
  type LicitacaoParaExtracao,
  type ResultadoExtracao,
  PROMPT_VERSAO,
  montarUserMessage,
} from "../tipos";

function mensagemAmigavelDoErro(err: unknown): string {
  if (err instanceof APIError) {
    const status = err.status ?? 0;
    if (status === 401) {
      return "A chave da IA está inválida ou expirou. Atualize em Configurações → Modelo de IA.";
    }
    if (status === 403) {
      return "A conta da IA não tem permissão para essa operação.";
    }
    if (status === 429) {
      const m = err.message ?? "";
      if (m.toLowerCase().includes("quota") || m.toLowerCase().includes("billing")) {
        return "A conta da IA está sem créditos. Adicione créditos no provedor escolhido.";
      }
      return "A IA está com muitos pedidos agora. Aguarde alguns minutos e tente de novo.";
    }
    if (status >= 500) {
      return "A IA teve um problema interno. Tente de novo em alguns minutos.";
    }
    return `A IA retornou um erro (${status || "?"}). Tente de novo em alguns minutos.`;
  }
  if (err instanceof Error) return err.message;
  return "Ocorreu um erro inesperado. Tente de novo em alguns minutos.";
}

export async function extrairFichaOpenAI(
  cfg: ConfigProvedor,
  licitacao: LicitacaoParaExtracao,
  rotuloFonte: "openai" | "interna" = "openai"
): Promise<ResultadoExtracao> {
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    ...(cfg.baseUrl ? { baseURL: cfg.baseUrl } : {}),
  });
  const modelo = cfg.modelo || (rotuloFonte === "interna" ? "llama3.1" : "gpt-4o-mini");

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await client.chat.completions.create({
      model: modelo,
      max_tokens: 4000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: montarUserMessage(licitacao) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: TOOL_NAME,
            description: TOOL_DESCRIPTION,
            parameters: {
              type: "object",
              properties: FICHA_PROPERTIES as unknown as Record<string, unknown>,
              required: [],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: TOOL_NAME } },
    });
  } catch (err) {
    console.error(`[ia/${rotuloFonte}] erro:`, err);
    throw new Error(mensagemAmigavelDoErro(err));
  }

  const choice = response.choices?.[0];
  const call = choice?.message?.tool_calls?.[0];
  if (!call || call.type !== "function" || call.function.name !== TOOL_NAME) {
    throw new Error("A IA não retornou a ficha esperada. Tente de novo.");
  }

  let ficha: FichaIA;
  try {
    ficha = JSON.parse(call.function.arguments) as FichaIA;
  } catch {
    throw new Error("A IA retornou um formato inválido. Tente de novo.");
  }

  return {
    ficha,
    modelo: response.model || modelo,
    versaoPrompt: PROMPT_VERSAO,
    tokensInput: response.usage?.prompt_tokens ?? 0,
    tokensOutput: response.usage?.completion_tokens ?? 0,
    cacheRead: response.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    cacheCreate: 0,
  };
}
