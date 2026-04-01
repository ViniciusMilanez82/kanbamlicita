import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { avaliarEPersistir } from "@/lib/aderencia/pipeline-hook";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const licitacao = await db.licitacao.findUnique({
    where: { id },
    select: {
      id: true,
      aderenciaAutomatica: true,
      scorePreliminar: true,
      classificacaoPreliminar: true,
    },
  });

  if (!licitacao) {
    return NextResponse.json(
      { error: "Licitação não encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json(licitacao);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const licitacao = await db.licitacao.findUnique({ where: { id } });
  if (!licitacao) {
    return NextResponse.json(
      { error: "Licitação não encontrada" },
      { status: 404 }
    );
  }

  await avaliarEPersistir(id);

  const atualizada = await db.licitacao.findUnique({
    where: { id },
    select: {
      id: true,
      aderenciaAutomatica: true,
      scorePreliminar: true,
      classificacaoPreliminar: true,
    },
  });

  return NextResponse.json(atualizada);
}
