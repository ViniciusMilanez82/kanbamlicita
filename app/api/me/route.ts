import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  return NextResponse.json({ user });
}

export async function PUT(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const { name, senha } = body as { name?: string; senha?: string };

  const data: { name?: string; senha?: string } = {};
  if (name !== undefined) data.name = name;
  if (senha) data.senha = await bcrypt.hash(senha, 10);

  const user = await db.user.update({
    where: { id: auth.userId },
    data,
    select: { id: true, name: true, email: true, role: true },
  });
  return NextResponse.json({ user });
}
