import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { temPermissaoAuditoria } from "@/lib/documentos-empresa/permissoes";

// GET — listar log de auditoria
export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (!temPermissaoAuditoria(auth.role)) {
    return NextResponse.json(
      { error: "Sem permissão para ver auditoria" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const documentoId = searchParams.get("documentoId");
  const acao = searchParams.get("acao");
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");

  const where: Record<string, unknown> = {};
  if (documentoId) where.documentoId = documentoId;
  if (acao) where.acao = acao;
  if (de || ate) {
    where.criadoEm = {
      ...(de && { gte: new Date(de) }),
      ...(ate && { lte: new Date(ate) }),
    };
  }

  const registros = await db.auditoriaDocumento.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    take: 200,
    include: {
      realizadoPor: { select: { name: true } },
      documento: { select: { tipoDocumento: true, nomeOriginal: true, cnpj: true } },
    },
  });

  return NextResponse.json(registros);
}
