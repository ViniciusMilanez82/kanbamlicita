import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getIaProvider } from "@/lib/ia/factory";
import { SYSTEM_CATALOGO, buildPromptCatalogo } from "@/lib/ia/prompts/extrair-catalogo";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { texto } = body;

  if (!texto) return NextResponse.json({ error: "Texto é obrigatório" }, { status: 400 });

  try {
    const ia = getIaProvider();
    const resposta = await ia.complete(SYSTEM_CATALOGO, buildPromptCatalogo(texto));

    const json = JSON.parse(resposta.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    const produtos = json.produtos ?? [];

    const criados = [];
    for (const p of produtos) {
      const produto = await db.produto.create({
        data: {
          nome: p.nome,
          descricao: p.descricao ?? null,
          categoria: p.categoria ?? null,
          palavrasChave: p.palavrasChave ?? [],
        },
      });
      criados.push(produto);
    }

    return NextResponse.json({ importados: criados.length, produtos: criados }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
