import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getIaProvider } from "@/lib/ia/factory";
import { SYSTEM_ANALISAR, buildPromptAnalisar } from "@/lib/ia/prompts/analisar-licitacao";
import { SYSTEM_PROPOSTA, buildPromptProposta } from "@/lib/ia/prompts/sugerir-proposta";
import { SYSTEM_GENERICO } from "@/lib/ia/prompts/generico";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

/**
 * POST /api/ia/analisar
 *
 * Dois modos:
 * 1. { licitacaoId, tipo }          → faz a análise e retorna preview (NÃO grava)
 * 2. { licitacaoId, tipo, gravar, resposta, respostaJson, modelo } → grava no histórico
 */
export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const { licitacaoId, tipo, pergunta, gravar } = body;

  if (!licitacaoId || !tipo) {
    return NextResponse.json({ error: "licitacaoId e tipo são obrigatórios" }, { status: 400 });
  }

  const licitacao = await db.licitacao.findUnique({ where: { id: licitacaoId } });
  if (!licitacao) return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });

  // ── MODO 2: Gravar resultado já existente ──
  if (gravar === true) {
    const { resposta, respostaJson, modelo } = body;
    const acao = await db.acaoIa.create({
      data: {
        licitacaoId,
        tipo,
        status: "concluido",
        resposta: resposta ?? "",
        respostaJson: respostaJson ?? null,
        modelo: modelo ?? "desconhecido",
      },
    });
    return NextResponse.json(acao, { status: 201 });
  }

  // ── MODO 1: Preview (não grava) ──
  const empresa = await db.empresa.findUnique({ where: { id: "default" } });
  const produtos = await db.produto.findMany({ where: { ativo: true } });

  try {
    const ia = await getIaProvider();
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
        prompt =
          pergunta ??
          `Analise esta licitação e dê sua opinião:\n\nTítulo: ${licitacao.titulo}\nObjeto: ${licitacao.objeto}`;
        break;
      default:
        system = SYSTEM_ANALISAR;
        prompt = buildPromptAnalisar(licData, prodData, empData);
    }

    const resposta = await ia.complete(system, prompt);

    let respostaJson = null;
    try {
      respostaJson = JSON.parse(
        resposta.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
      );
    } catch {
      // resposta não é JSON — ok para tipo "generico"
    }

    // Retorna preview sem gravar no banco
    return NextResponse.json({
      preview: true,
      tipo,
      resposta,
      respostaJson,
      modelo: ia.modelName,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
