import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const url = new URL(req.url);
  const apenasNaoLidas = url.searchParams.get("naoLidas") === "true";

  const notificacoes = await db.notificacao.findMany({
    where: apenasNaoLidas ? { lida: false } : {},
    orderBy: { criadoEm: "desc" },
    take: 50,
    select: {
      id: true,
      tipo: true,
      titulo: true,
      mensagem: true,
      lida: true,
      licitacaoId: true,
      criadoEm: true,
    },
  });

  const totalNaoLidas = await db.notificacao.count({
    where: { lida: false },
  });

  return NextResponse.json({ notificacoes, totalNaoLidas });
}

/** Marcar notificações como lidas */
export async function PATCH(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const { ids, marcarTodas } = body as {
    ids?: string[];
    marcarTodas?: boolean;
  };

  if (marcarTodas) {
    await db.notificacao.updateMany({
      where: { lida: false },
      data: { lida: true },
    });
  } else if (ids && ids.length > 0) {
    await db.notificacao.updateMany({
      where: { id: { in: ids } },
      data: { lida: true },
    });
  }

  return NextResponse.json({ ok: true });
}
