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

  const opportNum = raw.OPPORT_NUM as string | undefined;
  const dedupId = `petronect:${opportNum ?? Date.now()}`;

  const existente = await db.licitacao.findFirst({
    where: { linkOrigem: dedupId },
  });
  if (existente) {
    return NextResponse.json(
      {
        error: "Essa oportunidade já está no seu painel.",
        id: existente.id,
      },
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
    (raw.DESC_OBJ_CONTRAT as string) ||
    (raw.OPPORT_DESCR as string) ||
    `Oportunidade Petronect ${opportNum}`;

  const regions = raw.REGIONS as
    | { REGION?: string; REGION_DESCRIPTION?: string }[]
    | undefined;
  const uf = regions?.[0]?.REGION ?? null;
  const municipio = regions?.[0]?.REGION_DESCRIPTION ?? null;

  const postingDate = raw.POSTING_DATE as string | undefined;
  const dataPub = postingDate ? new Date(postingDate + "T00:00:00") : null;

  // Associar à fonte Petronect se existir
  const fontePetronect = await db.fonteCaptacao.findFirst({
    where: { tipo: "petronect", ativo: true },
    select: { id: true },
  });

  const licitacao = await db.licitacao.create({
    data: {
      titulo: titulo.slice(0, 500),
      orgao: (raw.COMPANY_DESC as string) ?? null,
      objeto:
        (raw.DESC_OBJ_CONTRAT as string) ||
        (raw.OPPORT_DESCR as string) ||
        null,
      modalidade: (raw.OPPORT_TYPE as string) ?? null,
      uf,
      municipio,
      valorEstimado: null,
      dataPublicacao:
        dataPub && !Number.isNaN(dataPub.getTime()) ? dataPub : null,
      linkOrigem: dedupId,
      observacoes: `Importado do Petronect. Oportunidade: ${opportNum ?? "N/A"}`,
      dadosExtraidos: raw as object,
      fonteId: fontePetronect?.id ?? null,
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
