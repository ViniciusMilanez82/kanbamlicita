import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type Schema,
} from "@google/generative-ai";
import {
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

/**
 * Gemini SDK exige um schema diferente (sem union types, sem `null`).
 * Construímos o schema manualmente com nullable=true onde aplicável.
 */
const FICHA_SCHEMA_GEMINI: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    resumo: { type: SchemaType.STRING, nullable: true, description: "Resumo executivo de 3-5 linhas." },
    objetoDetalhado: { type: SchemaType.STRING, nullable: true, description: "Reformulação clara do objeto." },
    prazoExecucao: { type: SchemaType.STRING, nullable: true, description: "Prazo de execução em texto curto." },
    localExecucao: { type: SchemaType.STRING, nullable: true, description: "Local de execução." },
    garantia: { type: SchemaType.STRING, nullable: true, description: "Exigências de garantia." },
    criterioJulgamento: { type: SchemaType.STRING, nullable: true, description: "Critério canônico de julgamento." },
    formaPagamento: { type: SchemaType.STRING, nullable: true, description: "Condições de pagamento." },
    reajuste: { type: SchemaType.STRING, nullable: true, description: "Regras de reajuste." },
    exigenciasHabilitacao: {
      type: SchemaType.ARRAY,
      nullable: true,
      items: { type: SchemaType.STRING },
      description: "Exigências de habilitação relevantes.",
    },
    criteriosTecnicos: {
      type: SchemaType.ARRAY,
      nullable: true,
      items: { type: SchemaType.STRING },
      description: "Critérios técnicos específicos.",
    },
    riscos: {
      type: SchemaType.ARRAY,
      nullable: true,
      items: { type: SchemaType.STRING },
      description: "Riscos identificados.",
    },
    oportunidades: {
      type: SchemaType.ARRAY,
      nullable: true,
      items: { type: SchemaType.STRING },
      description: "Pontos favoráveis.",
    },
    observacoesIA: { type: SchemaType.STRING, nullable: true, description: "Observações livres." },
  },
};

const TOOL_DECLARATION: FunctionDeclaration = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  parameters: FICHA_SCHEMA_GEMINI,
};

function mensagemAmigavelDoErro(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message ?? "";
    const lower = m.toLowerCase();
    if (lower.includes("api key") || lower.includes("api_key") || lower.includes("permission_denied")) {
      return "A chave da IA está inválida ou expirou. Atualize em Configurações → Modelo de IA.";
    }
    if (lower.includes("quota") || lower.includes("billing") || lower.includes("resource_exhausted")) {
      return "A conta da IA está sem créditos ou atingiu o limite. Verifique no provedor.";
    }
    if (lower.includes("rate")) {
      return "A IA está com muitos pedidos agora. Aguarde alguns minutos e tente de novo.";
    }
    if (lower.includes("unavailable") || lower.includes("timeout")) {
      return "A IA está indisponível no momento. Tente de novo em alguns minutos.";
    }
    return m;
  }
  return "Ocorreu um erro inesperado. Tente de novo em alguns minutos.";
}

export async function extrairFichaGemini(
  cfg: ConfigProvedor,
  licitacao: LicitacaoParaExtracao
): Promise<ResultadoExtracao> {
  const genai = new GoogleGenerativeAI(cfg.apiKey);
  const modelo = cfg.modelo || "gemini-1.5-pro";

  const model = genai.getGenerativeModel({
    model: modelo,
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: [TOOL_DECLARATION] }],
    toolConfig: {
      functionCallingConfig: {
        // @ts-expect-error - "ANY" exige uma function call; presente em runtime mesmo sem export tipado.
        mode: "ANY",
        allowedFunctionNames: [TOOL_NAME],
      },
    },
  });

  let response: Awaited<ReturnType<typeof model.generateContent>>;
  try {
    response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: montarUserMessage(licitacao) }] }],
      generationConfig: { maxOutputTokens: 4000 },
    });
  } catch (err) {
    console.error("[ia/gemini] erro:", err);
    throw new Error(mensagemAmigavelDoErro(err));
  }

  const fnCall = response.response.functionCalls?.()?.[0];
  if (!fnCall || fnCall.name !== TOOL_NAME) {
    throw new Error("A IA não retornou a ficha esperada. Tente de novo.");
  }

  const ficha = fnCall.args as FichaIA;
  const usage = response.response.usageMetadata;

  return {
    ficha,
    modelo,
    versaoPrompt: PROMPT_VERSAO,
    tokensInput: usage?.promptTokenCount ?? 0,
    tokensOutput: usage?.candidatesTokenCount ?? 0,
    cacheRead: usage?.cachedContentTokenCount ?? 0,
    cacheCreate: 0,
  };
}
