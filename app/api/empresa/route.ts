import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const empresa = await db.empresa.findUnique({ where: { id: "default" } });
  return NextResponse.json(empresa);
}

export async function PUT(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const { nome, descricao, segmento, pncpPreferencias, iaConfig } = body;

  // Importar resetIaProvider para invalidar cache quando config muda
  if (iaConfig !== undefined) {
    try {
      const { resetIaProvider } = await import("@/lib/ia/factory");
      resetIaProvider();
    } catch { /* ignorar */ }
  }

  const empresa = await db.empresa.upsert({
    where: { id: "default" },
    update: {
      nome,
      descricao,
      segmento,
      ...(pncpPreferencias !== undefined ? { pncpPreferencias } : {}),
      ...(iaConfig !== undefined ? { iaConfig } : {}),
    },
    create: {
      id: "default",
      nome,
      descricao,
      segmento,
      ...(pncpPreferencias !== undefined ? { pncpPreferencias } : {}),
      ...(iaConfig !== undefined ? { iaConfig } : {}),
    },
  });

  return NextResponse.json(empresa);
}
