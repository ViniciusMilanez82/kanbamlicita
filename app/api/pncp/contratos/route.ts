import { NextResponse } from "next/server";
import { fetchContratosPublicacao } from "@/lib/pncp/client";
import { filtrarContratos, parsePalavrasChave, parseUfsCsv, toListaItem } from "@/lib/pncp/normalize";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

const YMD = /^\d{8}$/;

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const dataInicial = String(body.dataInicial ?? "").replace(/-/g, "");
  const dataFinal = String(body.dataFinal ?? "").replace(/-/g, "");
  const pagina = Number(body.pagina) || 1;
  const tamanhoPagina = Number(body.tamanhoPagina) || 20;

  const ufsInput: string[] = Array.isArray(body.ufs)
    ? body.ufs.map((u: unknown) => String(u).trim().toUpperCase()).filter((u: string) => /^[A-Z]{2}$/.test(u))
    : parseUfsCsv(String(body.ufsCsv ?? ""));

  const termos: string[] = Array.isArray(body.palavrasChave)
    ? body.palavrasChave.map((p: unknown) => String(p).trim()).filter(Boolean)
    : parsePalavrasChave(String(body.palavrasChaveTexto ?? ""));

  if (!YMD.test(dataInicial) || !YMD.test(dataFinal)) {
    return NextResponse.json(
      { error: "Use datas válidas no formato YYYYMMDD ou YYYY-MM-DD" },
      { status: 400 }
    );
  }

  if (dataInicial > dataFinal) {
    return NextResponse.json({ error: "Data inicial não pode ser maior que a final" }, { status: 400 });
  }

  try {
    const api = await fetchContratosPublicacao({
      dataInicial,
      dataFinal,
      pagina,
      tamanhoPagina,
    });

    const lista = (api.data ?? []).map(toListaItem);
    const filtrada = filtrarContratos(lista, ufsInput, termos);

    return NextResponse.json({
      itens: filtrada,
      totalRegistros: api.totalRegistros ?? 0,
      totalPaginas: api.totalPaginas ?? 0,
      numeroPagina: api.numeroPagina ?? pagina,
      paginasRestantes: api.paginasRestantes ?? 0,
      empty: api.empty ?? false,
      filtrosAplicados: {
        ufs: ufsInput,
        palavrasChave: termos,
        registrosNestaPagina: lista.length,
        aposFiltroLocal: filtrada.length,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao consultar PNCP";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
