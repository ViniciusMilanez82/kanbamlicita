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
  const { nome, tipo, campo, operador, valor, peso, ativo, descricao } = body;

  const antes = await db.regraAderencia.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });
  }

  const dados: Record<string, unknown> = {};
  if (nome !== undefined) dados.nome = nome;
  if (tipo !== undefined) dados.tipo = tipo;
  if (campo !== undefined) dados.campo = campo;
  if (operador !== undefined) dados.operador = operador;
  if (valor !== undefined) dados.valor = valor;
  if (peso !== undefined) dados.peso = peso != null ? Number(peso) : null;
  if (ativo !== undefined) dados.ativo = ativo;
  if (descricao !== undefined) dados.descricao = descricao;

  const regra = await db.regraAderencia.update({
    where: { id },
    data: dados,
  });

  await registrarAuditoriaDiff(
    "regras_aderencia",
    id,
    antes as unknown as Record<string, unknown>,
    dados,
    auth.userId
  );

  return NextResponse.json(regra);
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

  const antes = await db.regraAderencia.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });
  }

  await db.regraAderencia.update({
    where: { id },
    data: { ativo: false },
  });

  await registrarAuditoria({
    tabela: "regras_aderencia",
    registroId: id,
    campo: "ativo",
    valorAnterior: "true",
    valorNovo: "false",
    acao: "exclusao",
    alteradoPorId: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
