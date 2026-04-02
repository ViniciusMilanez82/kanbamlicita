import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { executarAnaliseProfunda } from "@/lib/analise-profunda/pipeline";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/licitacoes/[id]/analise-profunda
 * Retorna o status e resultado da análise profunda.
 */
export async function GET(req: Request, { params }: RouteParams) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  // Buscar a análise profunda mais recente
  const acao = await db.acaoIa.findFirst({
    where: { licitacaoId: id, tipo: "analise_profunda" },
    orderBy: { criadoEm: "desc" },
  });

  if (!acao) {
    return NextResponse.json({ status: "nenhuma", dados: null });
  }

  // Buscar documentos baixados
  const documentos = await db.documento.findMany({
    where: { licitacaoId: id },
    select: { id: true, nome: true, tipo: true, tamanho: true, criadoEm: true },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json({
    status: acao.status,
    dados: acao.respostaJson,
    texto: acao.resposta,
    modelo: acao.modelo,
    erro: acao.erro,
    criadoEm: acao.criadoEm,
    documentos,
  });
}

/**
 * POST /api/licitacoes/[id]/analise-profunda
 * Dispara a análise profunda (se não houver uma em andamento).
 */
export async function POST(req: Request, { params }: RouteParams) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  // Verificar se licitação existe
  const licitacao = await db.licitacao.findUnique({ where: { id } });
  if (!licitacao) {
    return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });
  }

  // Verificar se já tem análise em andamento
  const emAndamento = await db.acaoIa.findFirst({
    where: {
      licitacaoId: id,
      tipo: "analise_profunda",
      status: "processando",
    },
  });

  if (emAndamento) {
    return NextResponse.json({
      status: "processando",
      mensagem: "Análise profunda já em andamento",
    });
  }

  // Disparar em background
  executarAnaliseProfunda(id).catch((err) => {
    console.error("[analise-profunda] Erro não tratado:", err);
  });

  return NextResponse.json({
    status: "iniciada",
    mensagem: "Análise profunda iniciada. Acompanhe pelo GET.",
  });
}
