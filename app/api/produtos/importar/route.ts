import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getIaProvider } from "@/lib/ia/factory";
import { SYSTEM_CATALOGO, buildPromptCatalogo } from "@/lib/ia/prompts/extrair-catalogo";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const { texto } = body;

  if (!texto) return NextResponse.json({ error: "Texto é obrigatório" }, { status: 400 });

  try {
    const ia = await getIaProvider();
    const resposta = await ia.complete(SYSTEM_CATALOGO, buildPromptCatalogo(texto));

    const json = JSON.parse(resposta.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    // Suporta formato novo (itens) e legado (produtos)
    const itens = json.itens ?? json.produtos ?? [];

    const criados = [];
    for (const p of itens) {
      const descParts = [p.descricao ?? ""];
      if (p.tipo) descParts.push(`Tipo: ${p.tipo}`);
      if (Array.isArray(p.aplicacoes) && p.aplicacoes.length > 0) {
        descParts.push(`Aplicações: ${p.aplicacoes.join(", ")}`);
      }

      const produto = await db.produto.create({
        data: {
          nome: p.nome,
          descricao: descParts.filter(Boolean).join(" | ") || null,
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
