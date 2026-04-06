import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const { variaveis } = await req.json();

  const template = await db.templateDeclaracao.findUnique({
    where: { id },
  });

  if (!template) {
    return NextResponse.json(
      { error: "Template nao encontrado" },
      { status: 404 }
    );
  }

  let html = template.conteudoHtml;
  for (const [key, value] of Object.entries(variaveis ?? {})) {
    html = html.replaceAll(`{{${key}}}`, String(value));
  }

  // Replace any remaining unfilled placeholders with blank line
  html = html.replace(/\{\{[^}]+\}\}/g, "_______________");

  return NextResponse.json({ html, templateNome: template.nome });
}
