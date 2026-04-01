import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

// GET — listar CNPJs distintos dos documentos cadastrados
export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const cnpjs = await db.documentoEmpresa.groupBy({
    by: ["cnpj"],
    orderBy: { cnpj: "asc" },
  });

  return NextResponse.json(cnpjs.map((c) => c.cnpj));
}
