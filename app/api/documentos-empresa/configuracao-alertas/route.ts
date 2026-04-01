import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { temPermissaoAdmin } from "@/lib/documentos-empresa/permissoes";

// GET — listar configurações de alerta
export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const configs = await db.configuracaoAlertaDoc.findMany({
    orderBy: { tipoDocumento: "asc" },
  });

  return NextResponse.json(configs);
}

// POST — criar ou atualizar configuração de alerta
export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (!temPermissaoAdmin(auth.role)) {
    return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
  }

  const body = await req.json();
  const { tipoDocumento, diasVerde, diasAmarelo, diasLaranja, diasVermelho, diasPreto } = body;

  if (!tipoDocumento) {
    return NextResponse.json({ error: "tipoDocumento obrigatório" }, { status: 400 });
  }

  const config = await db.configuracaoAlertaDoc.upsert({
    where: { tipoDocumento },
    create: {
      tipoDocumento,
      diasVerde: diasVerde ?? 90,
      diasAmarelo: diasAmarelo ?? 60,
      diasLaranja: diasLaranja ?? 30,
      diasVermelho: diasVermelho ?? 15,
      diasPreto: diasPreto ?? 0,
    },
    update: {
      ...(diasVerde !== undefined && { diasVerde }),
      ...(diasAmarelo !== undefined && { diasAmarelo }),
      ...(diasLaranja !== undefined && { diasLaranja }),
      ...(diasVermelho !== undefined && { diasVermelho }),
      ...(diasPreto !== undefined && { diasPreto }),
    },
  });

  return NextResponse.json(config);
}
