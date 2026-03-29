import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getIaProvider } from "@/lib/ia/factory";
import { SYSTEM_EXTRAIR, buildPromptExtrair } from "@/lib/ia/prompts/extrair-licitacao";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { texto } = body;

  if (!texto) return NextResponse.json({ error: "Texto é obrigatório" }, { status: 400 });

  const colunaInicial = await db.kanbanColuna.findFirst({
    where: { tipo: "inicial", ativo: true },
    orderBy: { ordem: "asc" },
  });

  if (!colunaInicial) {
    return NextResponse.json({ error: "Nenhuma coluna inicial configurada" }, { status: 500 });
  }

  try {
    const ia = getIaProvider();
    const resposta = await ia.complete(SYSTEM_EXTRAIR, buildPromptExtrair(texto));

    const dados = JSON.parse(resposta.replace(/```json?\n?/g, "").replace(/```/g, "").trim());

    const licitacao = await db.licitacao.create({
      data: {
        titulo: dados.titulo ?? "Licitação importada",
        orgao: dados.orgao,
        objeto: dados.objeto,
        modalidade: dados.modalidade,
        uf: dados.uf,
        municipio: dados.municipio,
        valorEstimado: dados.valorEstimado,
        dataPublicacao: dados.dataPublicacao ? new Date(dados.dataPublicacao) : null,
        dataSessao: dados.dataSessao ? new Date(dados.dataSessao) : null,
        observacoes: dados.observacoes,
        dadosExtraidos: dados,
        card: {
          create: { colunaId: colunaInicial.id, ordem: 0 },
        },
        acoesIa: {
          create: {
            tipo: "extracao",
            respostaJson: dados,
            resposta: resposta,
            modelo: ia.modelName,
            status: "concluido",
          },
        },
      },
      include: {
        card: { include: { coluna: true } },
      },
    });

    return NextResponse.json(licitacao, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
