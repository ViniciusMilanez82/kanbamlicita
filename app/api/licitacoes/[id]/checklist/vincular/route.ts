import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  const { id } = await params;

  // Get all checklist items without a linked document
  const itensPendentes = await db.checklistEdital.findMany({
    where: { licitacaoId: id, documentoEmpresaId: null },
  });

  if (itensPendentes.length === 0) {
    return NextResponse.json({ vinculados: 0, message: "Todos os itens já possuem documentos vinculados." });
  }

  // Get all vigente company documents
  const docsEmpresa = await db.documentoEmpresa.findMany({
    where: { status: { in: ["vigente", "vencendo"] } },
    select: { id: true, tipoDocumento: true, nome: true, categoria: true, status: true, nivelAlerta: true },
  });

  let vinculados = 0;
  const updates: { itemId: string; docId: string; status: string }[] = [];

  for (const item of itensPendentes) {
    // Try to find a matching document by category and name similarity
    const match = docsEmpresa.find((doc) => {
      // Match by category first
      if (doc.categoria !== item.categoria) return false;
      // Then check name similarity (simple contains check)
      const nomeItemLower = item.nome.toLowerCase();
      const nomeDocLower = doc.nome.toLowerCase();
      const tipoDocLower = doc.tipoDocumento.toLowerCase();
      return (
        nomeDocLower.includes(nomeItemLower) ||
        nomeItemLower.includes(nomeDocLower) ||
        tipoDocLower.includes(nomeItemLower) ||
        nomeItemLower.includes(tipoDocLower)
      );
    });

    if (match) {
      const newStatus = match.status === "vigente" ? "atendido" : "parcial";
      updates.push({ itemId: item.id, docId: match.id, status: newStatus });
      vinculados++;
    }
  }

  if (updates.length > 0) {
    await db.$transaction(
      updates.map((u) =>
        db.checklistEdital.update({
          where: { id: u.itemId },
          data: { documentoEmpresaId: u.docId, status: u.status },
        })
      )
    );
  }

  return NextResponse.json({
    vinculados,
    total: itensPendentes.length,
    message: vinculados > 0
      ? `${vinculados} de ${itensPendentes.length} itens vinculados automaticamente.`
      : "Não foi possível vincular documentos automaticamente. Vincule manualmente.",
  });
}
