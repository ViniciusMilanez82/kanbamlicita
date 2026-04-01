import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { temPermissaoAdmin } from "@/lib/documentos-empresa/permissoes";

// PATCH — atualizar configuração de alerta
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (!temPermissaoAdmin(auth.role)) {
    return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const config = await db.configuracaoAlertaDoc.update({
    where: { id },
    data: {
      ...(body.diasVerde !== undefined && { diasVerde: body.diasVerde }),
      ...(body.diasAmarelo !== undefined && { diasAmarelo: body.diasAmarelo }),
      ...(body.diasLaranja !== undefined && { diasLaranja: body.diasLaranja }),
      ...(body.diasVermelho !== undefined && { diasVermelho: body.diasVermelho }),
      ...(body.diasPreto !== undefined && { diasPreto: body.diasPreto }),
    },
  });

  return NextResponse.json(config);
}

// DELETE — remover configuração
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (!temPermissaoAdmin(auth.role)) {
    return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
  }

  const { id } = await params;

  await db.configuracaoAlertaDoc.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
