import { NextResponse } from "next/server";
import { buscarContratosPncp } from "@/lib/pncp/client";
import { searchItemToListaItem, parsePalavrasChave, parseUfsCsv } from "@/lib/pncp/normalize";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

const TIPOS_DOCUMENTO = ["contrato", "empenho", "ata"] as const;

/**
 * POST /api/pncp/contratos
 *
 * Busca no PNCP em paralelo: contrato, empenho e ata.
 * Retorna resultados agrupados por tipo.
 */
export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const pagina = Math.max(Number(body.pagina) || 1, 1);
  const tamanhoPagina = Math.min(Math.max(Number(body.tamanhoPagina) || 20, 5), 50);

  const ufsInput: string[] = Array.isArray(body.ufs)
    ? body.ufs
        .map((u: unknown) => String(u).trim().toUpperCase())
        .filter((u: string) => /^[A-Z]{2}$/.test(u))
    : parseUfsCsv(String(body.ufsCsv ?? ""));

  const termos: string[] = Array.isArray(body.palavrasChave)
    ? body.palavrasChave.map((p: unknown) => String(p).trim()).filter(Boolean)
    : parsePalavrasChave(String(body.palavrasChaveTexto ?? ""));

  const palavrasChaveTexto = termos.join(" ");

  try {
    // Buscar os 3 tipos em paralelo
    const resultados = await Promise.all(
      TIPOS_DOCUMENTO.map(async (tipo) => {
        try {
          const res = await buscarContratosPncp({
            palavrasChave: palavrasChaveTexto,
            uf: ufsInput.length > 0 ? ufsInput : undefined,
            pagina,
            tamanhoPagina,
            tipoDocumento: tipo,
          });
          return {
            tipo,
            itens: res.items.map(searchItemToListaItem),
            totalRegistros: res.total,
            totalPaginas: Math.max(1, Math.ceil(res.total / tamanhoPagina)),
          };
        } catch {
          return { tipo, itens: [], totalRegistros: 0, totalPaginas: 1 };
        }
      })
    );

    const porTipo = Object.fromEntries(
      resultados.map((r) => [r.tipo, r])
    );

    const totalGeral = resultados.reduce((s, r) => s + r.totalRegistros, 0);

    return NextResponse.json({
      porTipo,
      totalGeral,
      numeroPagina: pagina,
      filtrosUsados: {
        ufs: ufsInput,
        palavrasChave: termos,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível consultar o site do governo";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
