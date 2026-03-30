import { NextResponse } from "next/server";
import { buscarContratosPncp } from "@/lib/pncp/client";
import { searchItemToListaItem, parsePalavrasChave, parseUfsCsv } from "@/lib/pncp/normalize";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

/**
 * POST /api/pncp/contratos
 *
 * Busca contratos no PNCP usando a API de busca do governo.
 * A busca por palavras-chave é feita pelo próprio servidor do governo,
 * então os resultados já vêm filtrados — rápido e preciso.
 */
export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const pagina = Math.max(Number(body.pagina) || 1, 1);
  const tamanhoPagina = Math.min(Math.max(Number(body.tamanhoPagina) || 20, 5), 50);

  // UFs
  const ufsInput: string[] = Array.isArray(body.ufs)
    ? body.ufs
        .map((u: unknown) => String(u).trim().toUpperCase())
        .filter((u: string) => /^[A-Z]{2}$/.test(u))
    : parseUfsCsv(String(body.ufsCsv ?? ""));

  // Palavras-chave — unidas em uma string para a busca do governo
  const termos: string[] = Array.isArray(body.palavrasChave)
    ? body.palavrasChave.map((p: unknown) => String(p).trim()).filter(Boolean)
    : parsePalavrasChave(String(body.palavrasChaveTexto ?? ""));

  const palavrasChaveTexto = termos.join(" ");

  try {
    const resultado = await buscarContratosPncp({
      palavrasChave: palavrasChaveTexto,
      uf: ufsInput.length > 0 ? ufsInput : undefined,
      pagina,
      tamanhoPagina,
    });

    const itens = resultado.items.map(searchItemToListaItem);
    const totalPaginas = Math.max(1, Math.ceil(resultado.total / tamanhoPagina));

    return NextResponse.json({
      itens,
      totalRegistros: resultado.total,
      totalPaginas,
      numeroPagina: pagina,
      totalFiltrados: resultado.total,
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
