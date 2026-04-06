import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { getIaProvider } from "@/lib/ia/factory";

const SYSTEM_PROMPT = `Você é um especialista em licitações públicas brasileiras.
Dada uma licitação (título, objeto, modalidade), gere uma lista de documentos de habilitação necessários.

Para cada documento, retorne um JSON array com objetos contendo:
- "nome": nome do documento (ex: "CND Federal", "Atestado de Capacidade Técnica")
- "categoria": uma de: "juridica", "fiscal", "trabalhista", "tecnica", "economica", "complementar"
- "obrigatorio": true ou false

Responda APENAS com o JSON array, sem texto adicional, sem markdown.
Baseie-se na Lei 14.133/2021 (Nova Lei de Licitações) e nas práticas comuns.`;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  const { id } = await params;

  const licitacao = await db.licitacao.findUnique({
    where: { id },
    select: { titulo: true, objeto: true, modalidade: true, orgao: true, valorEstimado: true },
  });

  if (!licitacao) {
    return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });
  }

  // Check if checklist already has items
  const existentes = await db.checklistEdital.count({ where: { licitacaoId: id } });
  if (existentes > 0) {
    return NextResponse.json(
      { error: "Esta licitação já possui um checklist. Apague os itens existentes primeiro se quiser regenerar." },
      { status: 409 }
    );
  }

  try {
    const ia = await getIaProvider();

    const prompt = `Licitação:
Título: ${licitacao.titulo}
Objeto: ${licitacao.objeto ?? "Não informado"}
Modalidade: ${licitacao.modalidade ?? "Não informada"}
Órgão: ${licitacao.orgao ?? "Não informado"}
Valor estimado: ${licitacao.valorEstimado ? `R$ ${licitacao.valorEstimado}` : "Não informado"}

Gere a lista de documentos de habilitação necessários.`;

    const resposta = await ia.complete(SYSTEM_PROMPT, prompt);

    // Parse the JSON response
    let itens: { nome: string; categoria: string; obrigatorio: boolean }[];
    try {
      // Try to extract JSON from the response (may have markdown backticks)
      const jsonStr = resposta.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      itens = JSON.parse(jsonStr);
      if (!Array.isArray(itens)) throw new Error("Resposta da IA não é uma lista");
    } catch {
      return NextResponse.json(
        { error: "A IA não retornou uma lista válida. Tente novamente." },
        { status: 422 }
      );
    }

    // Validate categories
    const categoriasValidas = ["juridica", "fiscal", "trabalhista", "tecnica", "economica", "complementar"];

    // Create checklist items
    const created = await db.$transaction(
      itens
        .filter((item) => item.nome && categoriasValidas.includes(item.categoria))
        .map((item, idx) =>
          db.checklistEdital.create({
            data: {
              licitacaoId: id,
              nome: item.nome,
              categoria: item.categoria as any,
              obrigatorio: item.obrigatorio ?? true,
              ordem: idx,
            },
          })
        )
    );

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao gerar checklist com IA";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
