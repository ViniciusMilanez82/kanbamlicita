import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

const BASE_URL =
  "https://rc4nmhja42.execute-api.us-east-1.amazonaws.com/v1/oportunidade-publica/aberta";

async function autenticarPetronect(
  username: string,
  password: string
): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const texto = await res.text().catch(() => "");

  if (texto.trimStart().startsWith("<")) {
    throw new Error(
      "O Petronect está fora do ar neste momento. Tente novamente mais tarde."
    );
  }

  if (!res.ok) {
    throw new Error(`Falha na autenticação (${res.status})`);
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(texto);
  } catch {
    throw new Error(
      "Resposta inesperada do Petronect. Tente novamente mais tarde."
    );
  }

  const token = data.token ?? data.access_token ?? data.Token;
  if (!token) throw new Error("Token não encontrado na resposta");
  return token as string;
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const { palavrasChave } = body as { palavrasChave?: string };
  const query = (palavrasChave ?? "").trim();

  // Buscar credenciais da fonte Petronect configurada
  const fonte = await db.fonteCaptacao.findFirst({
    where: { tipo: "petronect", ativo: true },
  });

  if (!fonte) {
    return NextResponse.json(
      {
        error:
          "Nenhuma fonte Petronect configurada. Vá em Configurações para criar uma.",
      },
      { status: 400 }
    );
  }

  const params = fonte.parametros as Record<string, unknown>;
  const username = params.username as string | undefined;
  const password = params.password as string | undefined;

  if (!username || !password) {
    return NextResponse.json(
      {
        error:
          "Credenciais do Petronect não configuradas. Edite a fonte nas Configurações.",
      },
      { status: 400 }
    );
  }

  try {
    const token = await autenticarPetronect(username, password);

    const url = new URL(`${BASE_URL}/all`);
    if (query) url.searchParams.set("query", query);
    url.searchParams.set("onlyNew", "true");
    url.searchParams.set("isExactTerm", "false");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const texto = await res.text().catch(() => "");

    if (texto.trimStart().startsWith("<")) {
      return NextResponse.json(
        {
          error:
            "O Petronect está fora do ar neste momento. Tente novamente mais tarde.",
        },
        { status: 502 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Erro ao buscar no Petronect (${res.status})` },
        { status: res.status }
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(texto);
    } catch {
      return NextResponse.json(
        {
          error:
            "Resposta inesperada do Petronect. Tente novamente mais tarde.",
        },
        { status: 502 }
      );
    }

    const itens = Array.isArray(data)
      ? data
      : ((data as Record<string, unknown>).items ??
        (data as Record<string, unknown>).data ??
        []);

    return NextResponse.json({
      itens,
      total: Array.isArray(itens) ? itens.length : 0,
      query,
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Erro ao consultar Petronect";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
