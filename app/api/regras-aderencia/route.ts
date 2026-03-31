import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const regras = await db.regraAderencia.findMany({
    where: { ativo: true },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(regras);
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const { nome, tipo, campo, operador, valor, peso, descricao } = body;

  if (!nome || !tipo || !campo || !operador || !valor) {
    return NextResponse.json(
      { error: "Nome, tipo, campo, operador e valor são obrigatórios" },
      { status: 400 }
    );
  }

  const regra = await db.regraAderencia.create({
    data: {
      nome,
      tipo,
      campo,
      operador,
      valor,
      peso: peso != null ? Number(peso) : null,
      descricao: descricao ?? null,
    },
  });

  await registrarAuditoria({
    tabela: "regras_aderencia",
    registroId: regra.id,
    campo: "*",
    valorNovo: nome,
    acao: "criacao",
    alteradoPorId: auth.userId,
  });

  return NextResponse.json(regra, { status: 201 });
}
