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
  const { chave, valor, peso, descricao, ativo, ordem } = body;

  const antes = await db.parametroEstrategico.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Parâmetro não encontrado" }, { status: 404 });
  }

  const dados: Record<string, unknown> = {};
  if (chave !== undefined) dados.chave = chave;
  if (valor !== undefined) dados.valor = valor;
  if (peso !== undefined) dados.peso = peso != null ? Number(peso) : null;
  if (descricao !== undefined) dados.descricao = descricao;
  if (ativo !== undefined) dados.ativo = ativo;
  if (ordem !== undefined) dados.ordem = ordem;

  const parametro = await db.parametroEstrategico.update({
    where: { id },
    data: dados,
  });

  await registrarAuditoriaDiff(
    "parametros_estrategicos",
    id,
    antes as unknown as Record<string, unknown>,
    dados,
    auth.userId
  );

  return NextResponse.json(parametro);
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

  const antes = await db.parametroEstrategico.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Parâmetro não encontrado" }, { status: 404 });
  }

  await db.parametroEstrategico.update({
    where: { id },
    data: { ativo: false },
  });

  await registrarAuditoria({
    tabela: "parametros_estrategicos",
    registroId: id,
    campo: "ativo",
    valorAnterior: "true",
    valorNovo: "false",
    acao: "exclusao",
    alteradoPorId: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
