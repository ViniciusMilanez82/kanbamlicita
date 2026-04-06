import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const resultado = await db.resultadoLicitacao.findUnique({
    where: { licitacaoId: id },
    include: {
      empresaVencedora: { select: { id: true, nome: true, cnpj: true } },
      registradoPor: { select: { id: true, name: true } },
      itensResultado: { orderBy: { criadoEm: "asc" } },
    },
  });

  if (!resultado) {
    return NextResponse.json(null);
  }

  // Serialize decimals
  return NextResponse.json({
    ...resultado,
    valorVencedor: resultado.valorVencedor != null ? String(resultado.valorVencedor) : null,
    valorNossaProposta: resultado.valorNossaProposta != null ? String(resultado.valorNossaProposta) : null,
    itensResultado: resultado.itensResultado.map((item) => ({
      ...item,
      valorUnitarioNosso: item.valorUnitarioNosso != null ? String(item.valorUnitarioNosso) : null,
      valorUnitarioVencedor: item.valorUnitarioVencedor != null ? String(item.valorUnitarioVencedor) : null,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const body = await req.json();

  const {
    resultado,
    empresaVencedoraId,
    nomeVencedorExterno,
    valorVencedor,
    valorNossaProposta,
    criterioJulgamento,
    motivoDerrota,
    motivoDetalhado,
    licoesAprendidas,
    itens,
  } = body;

  if (!resultado) {
    return NextResponse.json({ error: "Resultado é obrigatório" }, { status: 400 });
  }

  // Check licitacao exists
  const licitacao = await db.licitacao.findUnique({ where: { id } });
  if (!licitacao) {
    return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });
  }

  // Check if already has resultado
  const existente = await db.resultadoLicitacao.findUnique({ where: { licitacaoId: id } });
  if (existente) {
    return NextResponse.json({ error: "Esta licitação já possui resultado registrado" }, { status: 409 });
  }

  // Calculate percentage difference
  let diferencaPercentual: number | null = null;
  if (valorVencedor && valorNossaProposta && Number(valorNossaProposta) > 0) {
    diferencaPercentual = ((Number(valorVencedor) - Number(valorNossaProposta)) / Number(valorNossaProposta)) * 100;
  }

  const created = await db.resultadoLicitacao.create({
    data: {
      licitacaoId: id,
      resultado,
      empresaVencedoraId: empresaVencedoraId || null,
      nomeVencedorExterno: nomeVencedorExterno?.trim() || null,
      valorVencedor: valorVencedor ? Number(valorVencedor) : null,
      valorNossaProposta: valorNossaProposta ? Number(valorNossaProposta) : null,
      diferencaPercentual,
      criterioJulgamento: criterioJulgamento || null,
      motivoDerrota: motivoDerrota || null,
      motivoDetalhado: motivoDetalhado?.trim() || null,
      licoesAprendidas: licoesAprendidas?.trim() || null,
      registradoPorId: auth.userId,
      itensResultado: itens?.length
        ? {
            create: itens.map((item: Record<string, unknown>) => ({
              descricao: String(item.descricao),
              categoria: item.categoria ? String(item.categoria) : null,
              quantidade: item.quantidade ? Number(item.quantidade) : null,
              unidade: item.unidade ? String(item.unidade) : null,
              valorUnitarioNosso: item.valorUnitarioNosso ? Number(item.valorUnitarioNosso) : null,
              valorUnitarioVencedor: item.valorUnitarioVencedor ? Number(item.valorUnitarioVencedor) : null,
            })),
          }
        : undefined,
    },
    include: {
      empresaVencedora: { select: { id: true, nome: true } },
      itensResultado: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const body = await req.json();

  const resultado = await db.resultadoLicitacao.findUnique({ where: { licitacaoId: id } });
  if (!resultado) {
    return NextResponse.json({ error: "Nenhum resultado encontrado para esta licitação" }, { status: 404 });
  }

  const {
    resultado: resultadoStatus,
    empresaVencedoraId,
    nomeVencedorExterno,
    valorVencedor,
    valorNossaProposta,
    criterioJulgamento,
    motivoDerrota,
    motivoDetalhado,
    licoesAprendidas,
  } = body;

  // Recalculate percentage
  const vv = valorVencedor !== undefined ? valorVencedor : resultado.valorVencedor;
  const vnp = valorNossaProposta !== undefined ? valorNossaProposta : resultado.valorNossaProposta;
  let diferencaPercentual: number | null = null;
  if (vv && vnp && Number(vnp) > 0) {
    diferencaPercentual = ((Number(vv) - Number(vnp)) / Number(vnp)) * 100;
  }

  const data: Record<string, unknown> = { diferencaPercentual };
  if (resultadoStatus !== undefined) data.resultado = resultadoStatus;
  if (empresaVencedoraId !== undefined) data.empresaVencedoraId = empresaVencedoraId || null;
  if (nomeVencedorExterno !== undefined) data.nomeVencedorExterno = nomeVencedorExterno?.trim() || null;
  if (valorVencedor !== undefined) data.valorVencedor = valorVencedor ? Number(valorVencedor) : null;
  if (valorNossaProposta !== undefined) data.valorNossaProposta = valorNossaProposta ? Number(valorNossaProposta) : null;
  if (criterioJulgamento !== undefined) data.criterioJulgamento = criterioJulgamento || null;
  if (motivoDerrota !== undefined) data.motivoDerrota = motivoDerrota || null;
  if (motivoDetalhado !== undefined) data.motivoDetalhado = motivoDetalhado?.trim() || null;
  if (licoesAprendidas !== undefined) data.licoesAprendidas = licoesAprendidas?.trim() || null;

  const updated = await db.resultadoLicitacao.update({
    where: { id: resultado.id },
    data,
  });

  return NextResponse.json(updated);
}
