import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { PncpContratoRaw } from "@/lib/pncp/types";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { avaliarEPersistir } from "@/lib/aderencia/pipeline-hook";

function idPncp(c: PncpContratoRaw): string {
  const id = c.numeroControlePNCP || c.numeroControlePncpCompra;
  return id ? `pncp-contrato:${id}` : `pncp-contrato:${Date.now()}`;
}

function urlPncp(c: PncpContratoRaw, urlFromSearch?: string | null): string | null {
  if (urlFromSearch) {
    return urlFromSearch.startsWith("http") ? urlFromSearch : `https://pncp.gov.br${urlFromSearch}`;
  }
  const id = c.numeroControlePNCP || c.numeroControlePncpCompra;
  if (id) return `https://pncp.gov.br/app/editais/${id}`;
  return null;
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const raw = body.raw as PncpContratoRaw | undefined;
  const itemUrl = (body.urlPncp as string | undefined) ?? null;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Campo 'raw' com objeto PNCP é obrigatório" }, { status: 400 });
  }

  // Extrai dados do raw para criar a licitação
  const titulo = (raw.objetoContrato ?? "").slice(0, 500) || "Sem título";
  const orgao = raw.orgaoEntidade?.razaoSocial ?? null;
  const objeto = raw.objetoContrato ?? null;
  const uf = raw.unidadeOrgao?.ufSigla ?? null;
  const municipio = raw.unidadeOrgao?.municipioNome ?? null;
  const valorGlobal = typeof raw.valorGlobal === "number" ? raw.valorGlobal : null;
  const dataPublicacaoStr = raw.dataPublicacaoPncp ?? null;
  const categoria = raw.categoriaProcesso?.nome ?? raw.tipoContrato?.nome ?? null;
  const controle = raw.numeroControlePNCP ?? raw.numeroControlePncpCompra ?? "";

  const dedupId = idPncp(raw);
  const linkOrigem = urlPncp(raw, itemUrl) ?? dedupId;

  const existente = await db.licitacao.findFirst({
    where: { OR: [{ linkOrigem }, { linkOrigem: dedupId }] },
  });
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

  const dataPub = dataPublicacaoStr ? new Date(dataPublicacaoStr) : null;

  // Associar à fonte PNCP se existir
  const fontePncp = await db.fonteCaptacao.findFirst({
    where: { tipo: "pncp", ativo: true },
    select: { id: true },
  });

  const licitacao = await db.licitacao.create({
    data: {
      titulo,
      orgao,
      objeto,
      modalidade: categoria,
      uf,
      municipio,
      valorEstimado: valorGlobal,
      dataPublicacao: dataPub && !Number.isNaN(dataPub.getTime()) ? dataPub : null,
      linkOrigem,
      observacoes: `Importado do PNCP. Controle: ${controle || linkOrigem}`,
      dadosExtraidos: raw as object,
      fonteId: fontePncp?.id ?? null,
      card: {
        create: { colunaId: colunaInicial.id, ordem: 0 },
      },
    },
    include: {
      card: { include: { coluna: true } },
    },
  });

  // Avaliar aderencia automatica
  avaliarEPersistir(licitacao.id).catch(() => {});

  return NextResponse.json(licitacao, { status: 201 });
}
