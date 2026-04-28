import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

// GET — list all checklist items for a licitacao
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  const { id } = await params;

  const itens = await db.checklistEdital.findMany({
    where: { licitacaoId: id },
    include: {
      documentoEmpresa: {
        select: {
          id: true,
          nome: true,
          status: true,
          nivelAlerta: true,
          dataValidade: true,
          tipoDocumento: true,
        },
      },
    },
    orderBy: [{ categoria: "asc" }, { ordem: "asc" }],
  });

  return NextResponse.json(itens);
}

// POST — create a checklist item (or batch create)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  const { id } = await params;

  const body = await req.json();

  // Support batch creation (array) or single item
  const itens = Array.isArray(body) ? body : [body];

  type ChecklistInput = {
    nome: string;
    categoria: "juridica" | "fiscal" | "trabalhista" | "tecnica" | "economica" | "complementar";
    obrigatorio?: boolean;
    status?: "pendente" | "ok" | "nao_aplica" | "vencido";
    documentoEmpresaId?: string | null;
    observacoes?: string | null;
    ordem?: number;
  };

  const created = await db.$transaction(
    (itens as ChecklistInput[]).map((item, idx) =>
      db.checklistEdital.create({
        data: {
          licitacaoId: id,
          nome: item.nome,
          categoria: item.categoria,
          obrigatorio: item.obrigatorio ?? true,
          status: item.status ?? "pendente",
          documentoEmpresaId: item.documentoEmpresaId ?? null,
          observacoes: item.observacoes ?? null,
          ordem: item.ordem ?? idx,
        },
      })
    )
  );

  return NextResponse.json(created, { status: 201 });
}

// PATCH — update a single checklist item (id in body)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  await params; // consume params

  const body = await req.json();
  const { itemId, ...data } = body;

  if (!itemId) {
    return NextResponse.json({ error: "itemId é obrigatório" }, { status: 400 });
  }

  const updated = await db.checklistEdital.update({
    where: { id: itemId },
    data: {
      ...(data.nome !== undefined && { nome: data.nome }),
      ...(data.categoria !== undefined && { categoria: data.categoria }),
      ...(data.obrigatorio !== undefined && { obrigatorio: data.obrigatorio }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.documentoEmpresaId !== undefined && { documentoEmpresaId: data.documentoEmpresaId || null }),
      ...(data.observacoes !== undefined && { observacoes: data.observacoes || null }),
      ...(data.ordem !== undefined && { ordem: data.ordem }),
    },
    include: {
      documentoEmpresa: {
        select: { id: true, nome: true, status: true, nivelAlerta: true, dataValidade: true, tipoDocumento: true },
      },
    },
  });

  return NextResponse.json(updated);
}
