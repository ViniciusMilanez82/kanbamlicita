import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import {
  autenticarCognito,
  buscarOportunidades,
} from "@/lib/fontes/conector-petronect";

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const { palavrasChave } = body as { palavrasChave?: string };
  const query = (palavrasChave ?? "").trim();

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
    const token = await autenticarCognito(username, password);
    const itens = await buscarOportunidades(token, query);

    return NextResponse.json({
      itens,
      total: itens.length,
      query,
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Erro ao consultar Petronect";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
