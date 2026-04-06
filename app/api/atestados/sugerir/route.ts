import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

/**
 * Remove acentos e converte para minusculas para comparacao de texto.
 */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Extrai palavras significativas (>= 3 caracteres) de um texto normalizado.
 */
function extrairPalavras(texto: string): string[] {
  return normalizar(texto)
    .split(/\W+/)
    .filter((p) => p.length >= 3);
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const { licitacaoId } = body;

  if (!licitacaoId) {
    return NextResponse.json(
      { error: "Informe a licitacao para buscar atestados" },
      { status: 400 }
    );
  }

  const licitacao = await db.licitacao.findUnique({
    where: { id: licitacaoId },
    select: { id: true, titulo: true, objeto: true, modalidade: true },
  });

  if (!licitacao) {
    return NextResponse.json(
      { error: "Licitacao nao encontrada" },
      { status: 404 }
    );
  }

  const atestados = await db.atestadoTecnico.findMany({
    include: {
      documentoEmpresa: {
        select: { id: true, nome: true, categoria: true, status: true },
      },
    },
  });

  // Build search text from licitacao
  const textoLicitacao = normalizar(
    [licitacao.titulo, licitacao.objeto, licitacao.modalidade]
      .filter(Boolean)
      .join(" ")
  );
  const palavrasLicitacao = extrairPalavras(textoLicitacao);

  const sugestoes = atestados.map((atestado) => {
    let pontos = 0;
    const maxPontos = 100;

    // 1. Tags matching (up to 50 points)
    if (atestado.tags.length > 0) {
      const tagsMatch = atestado.tags.filter((tag) =>
        textoLicitacao.includes(normalizar(tag))
      );
      const tagScore = Math.min(
        50,
        (tagsMatch.length / atestado.tags.length) * 50
      );
      pontos += tagScore;
    }

    // 2. Keyword matching in descricaoServico (up to 50 points)
    const palavrasServico = extrairPalavras(atestado.descricaoServico);
    if (palavrasServico.length > 0 && palavrasLicitacao.length > 0) {
      const matches = palavrasServico.filter((p) =>
        palavrasLicitacao.some((pl) => pl.includes(p) || p.includes(pl))
      );
      const keywordScore = Math.min(
        50,
        (matches.length / Math.max(palavrasServico.length, 1)) * 50
      );
      pontos += keywordScore;
    }

    return {
      ...atestado,
      valorContrato: atestado.valorContrato?.toString() ?? null,
      relevancia: Math.round(Math.min(pontos, maxPontos)),
    };
  });

  // Sort by relevancia desc, filter out zero relevance
  const resultado = sugestoes
    .filter((s) => s.relevancia > 0)
    .sort((a, b) => b.relevancia - a.relevancia);

  return NextResponse.json({
    licitacao: {
      id: licitacao.id,
      titulo: licitacao.titulo,
      objeto: licitacao.objeto,
    },
    sugestoes: resultado,
  });
}
