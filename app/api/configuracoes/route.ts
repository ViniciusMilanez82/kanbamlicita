import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { CONFIG_ID, obterConfiguracao, paraPublica } from "@/lib/configuracao";
import type { LlmProvider } from "@/lib/generated/prisma/client";

const PROVIDERS_VALIDOS: ReadonlyArray<LlmProvider> = [
  "anthropic",
  "openai",
  "gemini",
  "interna",
];

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const cfg = await obterConfiguracao();
  return NextResponse.json({ configuracao: paraPublica(cfg) });
}

export async function PUT(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = (await req.json().catch(() => null)) as
    | {
        llmProvider?: string;
        llmModelo?: string | null;
        llmBaseUrl?: string | null;
        llmApiKey?: string | null;
      }
    | null;

  if (!body) {
    return NextResponse.json(
      { error: "Pedido inválido. Atualize a página e tente de novo." },
      { status: 400 }
    );
  }

  if (
    body.llmProvider !== undefined &&
    !PROVIDERS_VALIDOS.includes(body.llmProvider as LlmProvider)
  ) {
    return NextResponse.json(
      { error: "Modelo de IA não reconhecido." },
      { status: 400 }
    );
  }

  const data: {
    llmProvider?: LlmProvider;
    llmModelo?: string | null;
    llmBaseUrl?: string | null;
    llmApiKey?: string;
  } = {};

  if (body.llmProvider !== undefined) {
    data.llmProvider = body.llmProvider as LlmProvider;
  }
  if (body.llmModelo !== undefined) {
    const v = body.llmModelo?.trim() ?? "";
    data.llmModelo = v ? v : null;
  }
  if (body.llmBaseUrl !== undefined) {
    const v = body.llmBaseUrl?.trim() ?? "";
    data.llmBaseUrl = v ? v : null;
  }
  // Só atualiza a chave se o cliente mandou um valor não vazio.
  // Strings em branco são ignoradas pra não apagar a chave atual sem querer.
  if (typeof body.llmApiKey === "string" && body.llmApiKey.trim().length > 0) {
    data.llmApiKey = body.llmApiKey.trim();
  }

  const cfg = await db.configuracao.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID, ...data },
    update: data,
  });

  return NextResponse.json({ configuracao: paraPublica(cfg) });
}
