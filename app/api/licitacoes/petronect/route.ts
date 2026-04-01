import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const raw = body.raw as Record<string, unknown> | undefined;

  if (!raw || typeof raw !== "object") {
    return NextResponse.json(
      { error: "Dados da oportunidade são obrigatórios" },
      { status: 400 }
    );
  }

  const opportNum = raw.opport_num as number | undefined;
  const dedupId = `petronect:${opportNum ?? Date.now()}`;

  const existente = await db.licitacao.findFirst({
    where: { linkOrigem: dedupId },
  });
  if (existente) {
    return NextResponse.json(
      { error: "Essa oportunidade Petronect já foi importada", id: existente.id },
      { status: 409 }
    );
  }

  const colunaInicial = await db.kanbanColuna.findFirst({
    where: { tipo: "inicial", ativo: true },
    orderBy: { ordem: "asc" },
  });

  if (!colunaInicial) {
    return NextResponse.json(
      { error: "Nenhuma coluna inicial configurada" },
      { status: 500 }
    );
  }

  const titulo =
    (raw.descricao as string) ?? `Oportunidade Petronect ${opportNum}`;
  const valorEstimado =
    typeof raw.valor_estimado === "number" ? raw.valor_estimado : null;
  const dataPubStr = raw.data_publicacao as string | undefined;
  const dataPub = dataPubStr ? new Date(dataPubStr) : null;

  const licitacao = await db.licitacao.create({
    data: {
      titulo: titulo.slice(0, 500),
      orgao: (raw.orgao as string) ?? null,
      objeto: (raw.objeto as string) ?? null,
      modalidade: (raw.modalidade as string) ?? null,
      uf: (raw.uf as string) ?? null,
      municipio: (raw.municipio as string) ?? null,
      valorEstimado,
      dataPublicacao:
        dataPub && !Number.isNaN(dataPub.getTime()) ? dataPub : null,
      linkOrigem: dedupId,
      observacoes: `Importado do Petronect. Oportunidade: ${opportNum ?? "N/A"}`,
      dadosExtraidos: raw as object,
      card: {
        create: { colunaId: colunaInicial.id, ordem: 0 },
      },
    },
    include: {
      card: { include: { coluna: true } },
    },
  });

  return NextResponse.json(licitacao, { status: 201 });
}
