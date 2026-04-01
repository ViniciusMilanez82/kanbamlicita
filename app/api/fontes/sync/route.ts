import { NextResponse } from "next/server";
import { verificarEExecutarFontes } from "@/lib/fontes/scheduler";

/**
 * POST /api/fontes/sync
 * Dispara verificação de todas as fontes ativas.
 * Pode ser chamado por cron externo ou manualmente.
 * Protegido por header x-cron-secret ou autenticação normal.
 */
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get("x-cron-secret");

  // Se tem CRON_SECRET configurado, aceita chamadas com o header correto
  if (cronSecret && headerSecret === cronSecret) {
    const resultado = await verificarEExecutarFontes();
    return NextResponse.json(resultado);
  }

  // Senão, exige autenticação normal (admin)
  const { getAuthFromRequest, naoAutenticado } = await import("@/lib/auth-api");
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const resultado = await verificarEExecutarFontes();
  return NextResponse.json(resultado);
}
