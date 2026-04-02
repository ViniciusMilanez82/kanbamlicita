import { NextResponse } from "next/server";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { checarHabilitacao } from "@/lib/analise-profunda/checar-habilitacao";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const resultado = await checarHabilitacao(id);
  return NextResponse.json(resultado);
}
