import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import type { InputJsonValue } from "@prisma/client/runtime/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const body = await req.json();

  const card = await db.kanbanCard.findUnique({ where: { id } });
  if (!card) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (body.checklistProgresso !== undefined) {
    data.checklistProgresso = body.checklistProgresso as InputJsonValue;
  }
  if (body.responsavelId !== undefined) {
    data.responsavelId = body.responsavelId || null;
  }
  if (body.urgente !== undefined) {
    data.urgente = Boolean(body.urgente);
  }
  if (body.notas !== undefined) {
    data.notas = body.notas || null;
  }

  const updated = await db.kanbanCard.update({
    where: { id },
    data,
    include: {
      coluna: { select: { id: true, nome: true, cor: true } },
      responsavel: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
