import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { registrarAuditoria, registrarAuditoriaDiff } from "@/lib/auditoria";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { nome, descricao, tipo, peso, formulaRef, faixaMin, faixaMax, ativo, ordem } = body;

  const antes = await db.criterioScore.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Critério não encontrado" }, { status: 404 });
  }

  const dados: Record<string, unknown> = {};
  if (nome !== undefined) dados.nome = nome;
  if (descricao !== undefined) dados.descricao = descricao;
  if (tipo !== undefined) dados.tipo = tipo;
  if (peso !== undefined) dados.peso = Number(peso);
  if (formulaRef !== undefined) dados.formulaRef = formulaRef;
  if (faixaMin !== undefined) dados.faixaMin = faixaMin != null ? Number(faixaMin) : null;
  if (faixaMax !== undefined) dados.faixaMax = faixaMax != null ? Number(faixaMax) : null;
  if (ativo !== undefined) dados.ativo = ativo;
  if (ordem !== undefined) dados.ordem = ordem;

  const criterio = await db.criterioScore.update({
    where: { id },
    data: dados,
  });

  await registrarAuditoriaDiff(
    "criterios_score",
    id,
    antes as unknown as Record<string, unknown>,
    dados,
    auth.userId
  );

  return NextResponse.json(criterio);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const antes = await db.criterioScore.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Critério não encontrado" }, { status: 404 });
  }

  await db.criterioScore.update({
    where: { id },
    data: { ativo: false },
  });

  await registrarAuditoria({
    tabela: "criterios_score",
    registroId: id,
    campo: "ativo",
    valorAnterior: "true",
    valorNovo: "false",
    acao: "exclusao",
    alteradoPorId: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
