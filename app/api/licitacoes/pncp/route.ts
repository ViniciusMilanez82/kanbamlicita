import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { PncpContratacaoOficial } from "@/lib/pncp/types";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { buscarDetalhesContratacao } from "@/lib/pncp/detalhes";
import { urlEditalPncp } from "@/lib/pncp/url";

function dedupId(c: PncpContratacaoOficial): string {
  const id = c.numeroControlePNCP || c.numeroControlePncpCompra;
  return id ? `pncp-contrato:${id}` : `pncp-contrato:${Date.now()}`;
}

function urlPncpDoEdital(c: PncpContratacaoOficial): string | null {
  const id = c.numeroControlePNCP || c.numeroControlePncpCompra;
  return urlEditalPncp(id ?? null);
}

function toDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const raw = body.raw as PncpContratacaoOficial | undefined;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json(
      { error: "Campo 'raw' com objeto PNCP é obrigatório" },
      { status: 400 }
    );
  }

  const controle = raw.numeroControlePNCP ?? raw.numeroControlePncpCompra ?? "";

  // Se o raw veio do search.api (sem campos oficiais), enriquecemos agora.
  // Detectamos pela presença de modalidadeId/situacaoCompraId, que só existem
  // no schema oficial. Fail-soft: se enrich falhar, importamos com o que tem.
  const precisaEnriquecer =
    raw.modalidadeId === undefined && raw.situacaoCompraId === undefined;
  const oficial: PncpContratacaoOficial =
    precisaEnriquecer && controle
      ? (await buscarDetalhesContratacao(controle).catch(() => null)) ?? raw
      : raw;

  const titulo = (oficial.objetoCompra ?? oficial.objetoContrato ?? "")
    .slice(0, 500) || "Sem título";
  const orgao = oficial.orgaoEntidade?.razaoSocial ?? null;
  const objeto = oficial.objetoCompra ?? oficial.objetoContrato ?? null;
  const uf = oficial.unidadeOrgao?.ufSigla ?? null;
  const municipio = oficial.unidadeOrgao?.municipioNome ?? null;

  const valorEstimado =
    typeof oficial.valorTotalEstimado === "number"
      ? oficial.valorTotalEstimado
      : typeof oficial.valorGlobal === "number"
        ? oficial.valorGlobal
        : null;
  const valorHomologado =
    typeof oficial.valorTotalHomologado === "number"
      ? oficial.valorTotalHomologado
      : null;

  const dedup = dedupId(oficial);
  const linkOrigem = urlPncpDoEdital(oficial) ?? dedup;

  const existente = await db.licitacao.findFirst({
    where: { OR: [{ linkOrigem }, { linkOrigem: dedup }] },
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
    return NextResponse.json(
      { error: "Nenhuma coluna inicial configurada" },
      { status: 500 }
    );
  }

  const fontePncp = await db.fonteCaptacao.findFirst({
    where: { tipo: "pncp", ativo: true },
    select: { id: true },
  });

  const linkSistemaOrigem =
    typeof oficial.linkSistemaOrigem === "string" &&
    oficial.linkSistemaOrigem.startsWith("http")
      ? oficial.linkSistemaOrigem
      : null;

  const licitacao = await db.licitacao.create({
    data: {
      titulo,
      orgao,
      objeto,
      modalidade: oficial.modalidadeNome ?? null,
      uf,
      municipio,
      valorEstimado,
      valorHomologado,
      dataPublicacao: toDate(oficial.dataPublicacaoPncp),
      dataSessao: toDate(oficial.dataAberturaProposta),
      dataEncerramentoProposta: toDate(oficial.dataEncerramentoProposta),
      modalidadeId: oficial.modalidadeId ?? null,
      modalidadeNome: oficial.modalidadeNome ?? null,
      modoDisputaNome: oficial.modoDisputaNome ?? null,
      situacaoId: oficial.situacaoCompraId ?? null,
      situacaoNome: oficial.situacaoCompraNome ?? null,
      tipoInstrumentoConvocatorioNome:
        oficial.tipoInstrumentoConvocatorioNome ?? null,
      srp: typeof oficial.srp === "boolean" ? oficial.srp : null,
      amparoLegalCodigo: oficial.amparoLegal?.codigo ?? null,
      amparoLegalNome: oficial.amparoLegal?.nome ?? null,
      processo: oficial.processo ?? null,
      numeroCompra: oficial.numeroCompra ?? null,
      informacaoComplementar: oficial.informacaoComplementar ?? null,
      linkOrigem,
      linkSistemaOrigem,
      observacoes: `Importado do PNCP. Controle: ${controle || linkOrigem}`,
      dadosExtraidos: oficial as object,
      fonteId: fontePncp?.id ?? null,
      card: { create: { colunaId: colunaInicial.id, ordem: 0 } },
    },
    include: { card: { include: { coluna: true } } },
  });

  return NextResponse.json(licitacao, { status: 201 });
}
