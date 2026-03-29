import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getIaProvider } from "@/lib/ia/factory";
import { SYSTEM_ANALISAR, buildPromptAnalisar } from "@/lib/ia/prompts/analisar-licitacao";
import { SYSTEM_PROPOSTA, buildPromptProposta } from "@/lib/ia/prompts/sugerir-proposta";
import { SYSTEM_GENERICO } from "@/lib/ia/prompts/generico";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { licitacaoId, tipo, pergunta } = body;

  if (!licitacaoId || !tipo) {
    return NextResponse.json({ error: "licitacaoId e tipo são obrigatórios" }, { status: 400 });
  }

  const licitacao = await db.licitacao.findUnique({ where: { id: licitacaoId } });
  if (!licitacao) return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });

  const empresa = await db.empresa.findUnique({ where: { id: "default" } });
  const produtos = await db.produto.findMany({ where: { ativo: true } });

  const acao = await db.acaoIa.create({
    data: { licitacaoId, tipo, status: "processando" },
  });

  try {
    const ia = getIaProvider();
    let system: string;
    let prompt: string;

    const licData = {
      titulo: licitacao.titulo,
      objeto: licitacao.objeto,
      observacoes: licitacao.observacoes,
      dadosExtraidos: licitacao.dadosExtraidos,
    };

    const prodData = produtos.map((p) => ({
      nome: p.nome,
      descricao: p.descricao,
      categoria: p.categoria,
    }));

    const empData = {
      nome: empresa?.nome ?? "Empresa",
      descricao: empresa?.descricao ?? null,
      segmento: empresa?.segmento ?? null,
    };

    switch (tipo) {
      case "analise":
      case "triagem":
        system = SYSTEM_ANALISAR;
        prompt = buildPromptAnalisar(licData, prodData, empData);
        break;
      case "proposta":
        system = SYSTEM_PROPOSTA;
        prompt = buildPromptProposta(licData, prodData, empData);
        break;
      case "generico":
        system = SYSTEM_GENERICO;
        prompt = pergunta ?? `Analise esta licitação e dê sua opinião:\n\nTítulo: ${licitacao.titulo}\nObjeto: ${licitacao.objeto}`;
        break;
      default:
        system = SYSTEM_ANALISAR;
        prompt = buildPromptAnalisar(licData, prodData, empData);
    }

    const resposta = await ia.complete(system, prompt);

    let respostaJson = null;
    try {
      respostaJson = JSON.parse(resposta.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      // Response is not JSON — fine for "generico" type
    }

    const updated = await db.acaoIa.update({
      where: { id: acao.id },
      data: {
        resposta,
        respostaJson,
        modelo: ia.modelName,
        status: "concluido",
        prompt: prompt.substring(0, 2000),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    await db.acaoIa.update({
      where: { id: acao.id },
      data: { status: "erro", erro: msg },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
