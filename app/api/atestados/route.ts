import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { searchParams } = new URL(req.url);
  const busca = searchParams.get("busca") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const valorMin = searchParams.get("valorMin");
  const valorMax = searchParams.get("valorMax");

  const where: Record<string, unknown> = {};

  if (busca) {
    where.OR = [
      { clienteNome: { contains: busca, mode: "insensitive" } },
      { descricaoServico: { contains: busca, mode: "insensitive" } },
    ];
  }

  if (tag) {
    where.tags = { has: tag };
  }

  if (valorMin || valorMax) {
    const valorFilter: Record<string, unknown> = {};
    if (valorMin) valorFilter.gte = parseFloat(valorMin);
    if (valorMax) valorFilter.lte = parseFloat(valorMax);
    where.valorContrato = valorFilter;
  }

  const atestados = await db.atestadoTecnico.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    include: {
      documentoEmpresa: {
        select: { id: true, nome: true, categoria: true, status: true },
      },
    },
  });

  const resultado = atestados.map((a) => ({
    ...a,
    valorContrato: a.valorContrato?.toString() ?? null,
  }));

  return NextResponse.json(resultado);
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

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

  if (!documentoEmpresaId) {
    return NextResponse.json(
      { error: "Documento da empresa e obrigatorio" },
      { status: 400 }
    );
  }

  if (!clienteNome?.trim()) {
    return NextResponse.json(
      { error: "Nome do cliente e obrigatorio" },
      { status: 400 }
    );
  }

  if (!descricaoServico?.trim()) {
    return NextResponse.json(
      { error: "Descricao do servico e obrigatoria" },
      { status: 400 }
    );
  }

  // Validate documentoEmpresa exists
  const docEmpresa = await db.documentoEmpresa.findUnique({
    where: { id: documentoEmpresaId },
  });
  if (!docEmpresa) {
    return NextResponse.json(
      { error: "Documento da empresa nao encontrado" },
      { status: 404 }
    );
  }

  const atestado = await db.atestadoTecnico.create({
    data: {
      documentoEmpresaId,
      clienteNome: clienteNome.trim(),
      clienteCnpj: clienteCnpj?.trim() || null,
      descricaoServico: descricaoServico.trim(),
      tags: tags ?? [],
      valorContrato: valorContrato ? parseFloat(valorContrato) : null,
      dataInicio: dataInicio ? new Date(dataInicio) : null,
      dataFim: dataFim ? new Date(dataFim) : null,
      possuiCat: possuiCat ?? false,
      numeroCat: numeroCat || null,
      observacoes: observacoes || null,
    },
    include: {
      documentoEmpresa: {
        select: { id: true, nome: true, categoria: true, status: true },
      },
    },
  });

  return NextResponse.json(
    { ...atestado, valorContrato: atestado.valorContrato?.toString() ?? null },
    { status: 201 }
  );
}
