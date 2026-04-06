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

  const decisao = await db.decisaoGoNoGo.findUnique({
    where: { licitacaoId: id },
    include: {
      decididoPor: { select: { id: true, name: true } },
    },
  });

  if (!decisao) return NextResponse.json(null);

  return NextResponse.json({
    ...decisao,
    valorEstimadoCapturavel: decisao.valorEstimadoCapturavel != null
      ? String(decisao.valorEstimadoCapturavel)
      : null,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  const { id } = await params;

  const body = await req.json();
  const { decisao, justificativa, riscosIdentificados, valorEstimadoCapturavel } = body;

  if (!decisao || !["go", "no_go", "condicional"].includes(decisao)) {
    return NextResponse.json({ error: "Decisão inválida. Use: go, no_go ou condicional" }, { status: 400 });
  }

  // Get current score and checklist status
  const [score, checklistItens] = await Promise.all([
    db.licitacaoScore.findUnique({ where: { licitacaoId: id }, select: { scoreFinal: true } }),
    db.checklistEdital.findMany({ where: { licitacaoId: id }, select: { status: true, obrigatorio: true } }),
  ]);

  const obrigatorios = checklistItens.filter((i) => i.obrigatorio);
  const checklistPronto = obrigatorios.length > 0 && obrigatorios.every((i) => i.status === "atendido");

  // Upsert — allows changing decision
  const created = await db.decisaoGoNoGo.upsert({
    where: { licitacaoId: id },
    create: {
      licitacaoId: id,
      decisao,
      scoreNoMomento: score?.scoreFinal ?? null,
      checklistPronto,
      valorEstimadoCapturavel: valorEstimadoCapturavel ? Number(valorEstimadoCapturavel) : null,
      riscosIdentificados: riscosIdentificados ?? null,
      justificativa: justificativa?.trim() || null,
      decididoPorId: auth.userId,
    },
    update: {
      decisao,
      scoreNoMomento: score?.scoreFinal ?? null,
      checklistPronto,
      valorEstimadoCapturavel: valorEstimadoCapturavel ? Number(valorEstimadoCapturavel) : null,
      riscosIdentificados: riscosIdentificados ?? null,
      justificativa: justificativa?.trim() || null,
      decididoPorId: auth.userId,
    },
    include: {
      decididoPor: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    ...created,
    valorEstimadoCapturavel: created.valorEstimadoCapturavel != null
      ? String(created.valorEstimadoCapturavel)
      : null,
  }, { status: 201 });
}
