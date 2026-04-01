import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") return NextResponse.json({ error: "Proibido" }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    senha?: string;
    role?: string;
    ativo?: boolean;
  };

  if (body.role !== undefined && !["admin", "juridico", "administrativo", "comercial", "leitura", "user"].includes(body.role)) {
    return NextResponse.json({ error: "Role inválida" }, { status: 400 });
  }

  if (body.ativo === false && id === auth.userId) {
    return NextResponse.json({ error: "Não é possível desativar a própria conta" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.role !== undefined) data.role = body.role;
  if (body.ativo !== undefined) data.ativo = body.ativo;
  if (body.senha) data.senha = await bcrypt.hash(body.senha, 10);

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, ativo: true, criadoEm: true },
  });
  return NextResponse.json({ user });
}
