import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { temPermissaoAdmin } from "@/lib/documentos-empresa/permissoes";

type AlertaSugerido = {
  tipoDocumento: string;
  diasVerde: number;
  diasAmarelo: number;
  diasLaranja: number;
  diasVermelho: number;
  diasPreto: number;
};

// POST — aplicar sugestões de alertas da IA (cria/atualiza configs)
export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (!temPermissaoAdmin(auth.role)) {
    return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
  }

  const { alertas } = (await req.json()) as { alertas: AlertaSugerido[] };

  if (!alertas || !Array.isArray(alertas) || alertas.length === 0) {
    return NextResponse.json({ error: "Nenhum alerta para aplicar" }, { status: 400 });
  }

  let criados = 0;
  let atualizados = 0;

  for (const alerta of alertas) {
    if (!alerta.tipoDocumento) continue;

    const existente = await db.configuracaoAlertaDoc.findUnique({
      where: { tipoDocumento: alerta.tipoDocumento },
    });

    if (existente) {
      await db.configuracaoAlertaDoc.update({
        where: { tipoDocumento: alerta.tipoDocumento },
        data: {
          diasVerde: alerta.diasVerde ?? existente.diasVerde,
          diasAmarelo: alerta.diasAmarelo ?? existente.diasAmarelo,
          diasLaranja: alerta.diasLaranja ?? existente.diasLaranja,
          diasVermelho: alerta.diasVermelho ?? existente.diasVermelho,
          diasPreto: alerta.diasPreto ?? 0,
        },
      });
      atualizados++;
    } else {
      await db.configuracaoAlertaDoc.create({
        data: {
          tipoDocumento: alerta.tipoDocumento,
          diasVerde: alerta.diasVerde ?? 90,
          diasAmarelo: alerta.diasAmarelo ?? 60,
          diasLaranja: alerta.diasLaranja ?? 30,
          diasVermelho: alerta.diasVermelho ?? 15,
          diasPreto: alerta.diasPreto ?? 0,
        },
      });
      criados++;
    }
  }

  return NextResponse.json({ criados, atualizados, total: criados + atualizados });
}
