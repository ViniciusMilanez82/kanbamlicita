import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const empresa = await db.empresa.findUnique({ where: { id: "default" } });
  return NextResponse.json(empresa);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { nome, descricao, segmento } = body;

  const empresa = await db.empresa.upsert({
    where: { id: "default" },
    update: { nome, descricao, segmento },
    create: { id: "default", nome, descricao, segmento },
  });

  return NextResponse.json(empresa);
}
