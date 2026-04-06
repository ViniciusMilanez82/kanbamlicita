import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const concorrente = await db.concorrente.findUnique({
    where: { id },
    include: {
      resultados: {
        include: {
          licitacao: {
            select: { id: true, titulo: true, orgao: true, modalidade: true, uf: true, valorEstimado: true },
          },
        },
        orderBy: { criadoEm: "desc" },
      },
    },
  });

  if (!concorrente) {
    return NextResponse.json({ error: "Concorrente não encontrado" }, { status: 404 });
  }

  return NextResponse.json(concorrente);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const body = await req.json();
  const { nome, cnpj, segmentos, porte, uf, observacoes, ativo } = body;

  // Check CNPJ uniqueness if changing
  if (cnpj) {
    const existe = await db.concorrente.findFirst({
      where: { cnpj, NOT: { id } },
    });
    if (existe) {
      return NextResponse.json({ error: "Já existe um concorrente com este CNPJ" }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  if (nome !== undefined) data.nome = nome.trim();
  if (cnpj !== undefined) data.cnpj = cnpj?.trim() || null;
  if (segmentos !== undefined) data.segmentos = segmentos;
  if (porte !== undefined) data.porte = porte || null;
  if (uf !== undefined) data.uf = uf || null;
  if (observacoes !== undefined) data.observacoes = observacoes || null;
  if (ativo !== undefined) data.ativo = ativo;

  const concorrente = await db.concorrente.update({
    where: { id },
    data,
  });

  return NextResponse.json(concorrente);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  // Check if has resultados linked
  const count = await db.resultadoLicitacao.count({
    where: { empresaVencedoraId: id },
  });

  if (count > 0) {
    // Soft delete instead
    await db.concorrente.update({
      where: { id },
      data: { ativo: false },
    });
    return NextResponse.json({ message: "Concorrente desativado (possui resultados vinculados)" });
  }

  await db.concorrente.delete({ where: { id } });
  return NextResponse.json({ message: "Concorrente removido" });
}
