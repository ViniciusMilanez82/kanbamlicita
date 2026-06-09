import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { montarLicitacaoBoletim } from "@/lib/conlicitacao/normalize";
import type { BoletimRow } from "@/lib/conlicitacao/types";

type ResultadoItem = {
  status: "criado" | "duplicado" | "erro";
  titulo: string;
  edital: string | null;
  id?: string;
  motivo?: string;
};

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const itens = body.itens as BoletimRow[] | undefined;

  if (!Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json(
      { error: "Envie ao menos uma linha do boletim para importar." },
      { status: 400 }
    );
  }
  if (itens.length > 2000) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Importe até 2000 linhas por vez." },
      { status: 400 }
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

  const fonte = await db.fonteCaptacao.findFirst({
    where: { tipo: "conlicitacao", ativo: true },
    select: { id: true },
  });

  let criados = 0;
  let duplicados = 0;
  let erros = 0;
  const detalhes: ResultadoItem[] = [];
  const dedupNoLote = new Set<string>();

  for (const row of itens) {
    const dados = montarLicitacaoBoletim(row);
    const edital = dados.numeroCompra;
    try {
      // duplicado dentro do próprio arquivo (os boletins se sobrepõem entre dias)
      if (dedupNoLote.has(dados.dedupId)) {
        duplicados++;
        detalhes.push({ status: "duplicado", titulo: dados.titulo, edital });
        continue;
      }
      dedupNoLote.add(dados.dedupId);

      const existente = await db.licitacao.findFirst({
        where: { linkOrigem: dados.dedupId },
        select: { id: true },
      });
      if (existente) {
        duplicados++;
        detalhes.push({
          status: "duplicado",
          titulo: dados.titulo,
          edital,
          id: existente.id,
        });
        continue;
      }

      const licitacao = await db.licitacao.create({
        data: {
          titulo: dados.titulo,
          orgao: dados.orgao,
          objeto: dados.objeto,
          modalidade: dados.modalidade,
          uf: dados.uf,
          municipio: dados.municipio,
          valorEstimado: dados.valorEstimado,
          dataPublicacao: dados.dataPublicacao,
          dataSessao: dados.dataSessao,
          processo: dados.processo,
          numeroCompra: dados.numeroCompra,
          informacaoComplementar: dados.informacaoComplementar,
          linkOrigem: dados.dedupId,
          linkSistemaOrigem: dados.linkSistemaOrigem,
          observacoes: dados.observacoes,
          dadosExtraidos: row as object,
          fonteId: fonte?.id ?? null,
          card: { create: { colunaId: colunaInicial.id, ordem: 0 } },
        },
        select: { id: true },
      });

      criados++;
      detalhes.push({
        status: "criado",
        titulo: dados.titulo,
        edital,
        id: licitacao.id,
      });
    } catch (e) {
      erros++;
      detalhes.push({
        status: "erro",
        titulo: dados.titulo,
        edital,
        motivo: e instanceof Error ? e.message : "erro desconhecido",
      });
    }
  }

  return NextResponse.json(
    { total: itens.length, criados, duplicados, erros, detalhes },
    { status: 201 }
  );
}
