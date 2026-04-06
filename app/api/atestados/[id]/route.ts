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

  const atestado = await db.atestadoTecnico.findUnique({
    where: { id },
    include: {
      documentoEmpresa: {
        select: { id: true, nome: true, categoria: true, status: true },
      },
    },
  });

  if (!atestado) {
    return NextResponse.json(
      { error: "Atestado nao encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...atestado,
    valorContrato: atestado.valorContrato?.toString() ?? null,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const body = await req.json();
  const {
    documentoEmpresaId,
    clienteNome,
    clienteCnpj,
    descricaoServico,
    tags,
    valorContrato,
    dataInicio,
    dataFim,
    possuiCat,
    numeroCat,
    observacoes,
  } = body;

  // Validate documentoEmpresa if changing
  if (documentoEmpresaId) {
    const docEmpresa = await db.documentoEmpresa.findUnique({
      where: { id: documentoEmpresaId },
    });
    if (!docEmpresa) {
      return NextResponse.json(
        { error: "Documento da empresa nao encontrado" },
        { status: 404 }
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (documentoEmpresaId !== undefined) data.documentoEmpresaId = documentoEmpresaId;
  if (clienteNome !== undefined) data.clienteNome = clienteNome.trim();
  if (clienteCnpj !== undefined) data.clienteCnpj = clienteCnpj?.trim() || null;
  if (descricaoServico !== undefined) data.descricaoServico = descricaoServico.trim();
  if (tags !== undefined) data.tags = tags;
  if (valorContrato !== undefined)
    data.valorContrato = valorContrato ? parseFloat(valorContrato) : null;
  if (dataInicio !== undefined)
    data.dataInicio = dataInicio ? new Date(dataInicio) : null;
  if (dataFim !== undefined)
    data.dataFim = dataFim ? new Date(dataFim) : null;
  if (possuiCat !== undefined) data.possuiCat = possuiCat;
  if (numeroCat !== undefined) data.numeroCat = numeroCat || null;
  if (observacoes !== undefined) data.observacoes = observacoes || null;

  const atestado = await db.atestadoTecnico.update({
    where: { id },
    data,
    include: {
      documentoEmpresa: {
        select: { id: true, nome: true, categoria: true, status: true },
      },
    },
  });

  return NextResponse.json({
    ...atestado,
    valorContrato: atestado.valorContrato?.toString() ?? null,
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const existe = await db.atestadoTecnico.findUnique({ where: { id } });
  if (!existe) {
    return NextResponse.json(
      { error: "Atestado nao encontrado" },
      { status: 404 }
    );
  }

  await db.atestadoTecnico.delete({ where: { id } });
  return NextResponse.json({ message: "Atestado removido" });
}
