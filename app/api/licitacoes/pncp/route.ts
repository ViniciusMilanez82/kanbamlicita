import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { PncpContratoRaw } from "@/lib/pncp/types";
import { toListaItem } from "@/lib/pncp/normalize";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

function linkPncp(c: PncpContratoRaw): string {
  const id = c.numeroControlePNCP || c.numeroControlePncpCompra;
  return id ? `pncp-contrato:${id}` : `pncp-contrato:${Date.now()}`;
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const raw = body.raw as PncpContratoRaw | undefined;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Campo 'raw' com objeto PNCP é obrigatório" }, { status: 400 });
  }

  const item = toListaItem(raw);
  const linkOrigem = linkPncp(raw);

  const existente = await db.licitacao.findFirst({ where: { linkOrigem } });
  if (existente) {
    return NextResponse.json(
      { error: "Esta publicação PNCP já foi importada", id: existente.id },
      { status: 409 }
    );
  }

  const colunaInicial = await db.kanbanColuna.findFirst({
    where: { tipo: "inicial", ativo: true },
    orderBy: { ordem: "asc" },
  });

  if (!colunaInicial) {
    return NextResponse.json({ error: "Nenhuma coluna inicial configurada" }, { status: 500 });
  }

  const dataPub = item.dataPublicacao ? new Date(item.dataPublicacao) : null;

  const licitacao = await db.licitacao.create({
    data: {
      titulo: item.titulo.slice(0, 500),
      orgao: item.orgao || null,
      objeto: item.objeto || null,
      modalidade: item.categoria || null,
      uf: item.uf || null,
      municipio: item.municipio || null,
      valorEstimado: item.valorGlobal,
      dataPublicacao: dataPub && !Number.isNaN(dataPub.getTime()) ? dataPub : null,
      linkOrigem,
      observacoes: `Importado do PNCP. Controle: ${item.id}`,
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
