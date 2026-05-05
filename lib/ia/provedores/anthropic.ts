import Anthropic from "@anthropic-ai/sdk";
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

const TOOL_SCHEMA: Anthropic.Tool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  input_schema: {
    type: "object",
    properties: FICHA_PROPERTIES as unknown as Record<string, unknown>,
    required: [],
  },
};

function mensagemAmigavelDoErro(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "A chave da IA está inválida ou expirou. Atualize em Configurações → Modelo de IA.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    const m = err.message ?? "";
    if (m.toLowerCase().includes("credit")) {
      return "A conta da IA está sem créditos. Adicione créditos no provedor escolhido.";
    }
    return "A conta da IA não tem permissão para essa operação.";
  }
  if (err instanceof Anthropic.BadRequestError) {
    const m = err.message ?? "";
    if (m.toLowerCase().includes("credit")) {
      return "A conta da IA está sem créditos. Adicione créditos no provedor escolhido.";
    }
    return "Os dados desta licitação não puderam ser processados pela IA. Tente de novo.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "A IA está com muitos pedidos agora. Aguarde alguns minutos e tente de novo.";
  }
  if (err instanceof Anthropic.InternalServerError) {
    return "A IA teve um problema interno. Tente de novo em alguns minutos.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Não conseguimos falar com a IA agora. Verifique sua conexão e tente de novo.";
  }
  if (err instanceof Anthropic.APIError) {
    if (err.status === 529) {
      return "A IA está sobrecarregada no momento. Aguarde alguns minutos e tente de novo.";
    }
    return `A IA retornou um erro (${err.status ?? "?"}). Tente de novo em alguns minutos.`;
  }
  if (err instanceof Error) return err.message;
  return "Ocorreu um erro inesperado. Tente de novo em alguns minutos.";
}

export async function extrairFichaAnthropic(
  cfg: ConfigProvedor,
  licitacao: LicitacaoParaExtracao
): Promise<ResultadoExtracao> {
  const client = new Anthropic({ apiKey: cfg.apiKey });
  const modelo = cfg.modelo || "claude-opus-4-7";

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: modelo,
      max_tokens: 4000,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      tools: [{ ...TOOL_SCHEMA, cache_control: { type: "ephemeral" } } as Anthropic.Tool],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [{ role: "user", content: montarUserMessage(licitacao) }],
    });
  } catch (err) {
    console.error("[ia/anthropic] erro:", err);
    throw new Error(mensagemAmigavelDoErro(err));
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === TOOL_NAME
  );
  if (!toolUse) {
    throw new Error("A IA não retornou a ficha esperada. Tente de novo.");
  }

  return {
    ficha: toolUse.input as FichaIA,
    modelo: response.model,
    versaoPrompt: PROMPT_VERSAO,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    cacheRead: response.usage.cache_read_input_tokens ?? 0,
    cacheCreate: response.usage.cache_creation_input_tokens ?? 0,
  };
}
