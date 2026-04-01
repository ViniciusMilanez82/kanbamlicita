import { NextResponse } from "next/server";
import { buscarContratosPncp, type PncpSearchItem } from "@/lib/pncp/client";
import { searchItemToListaItem, parsePalavrasChave, parseUfsCsv } from "@/lib/pncp/normalize";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import type { PncpContratoListaItem } from "@/lib/pncp/types";

/**
 * Classifica um item do PNCP no tipo correto baseado em múltiplos sinais
 */
function classificarTipo(item: PncpSearchItem): "contrato" | "empenho" | "ata" {
  const docType = (item.document_type ?? "").toLowerCase();
  const titulo = (item.title ?? "").toLowerCase();
  const tipoNome = (item.tipo_nome ?? "").toLowerCase();
  const tipoContrato = (item.tipo_contrato_nome ?? "").toLowerCase();
  const url = (item.item_url ?? "").toLowerCase();

  if (
    docType.includes("ata") ||
    titulo.match(/\bata\b/) ||
    tipoNome.includes("ata") ||
    tipoContrato.includes("ata") ||
    url.includes("/atas/")
  ) {
    return "ata";
  }

  if (
    docType.includes("empenho") ||
    titulo.match(/\bempenho\b/) ||
    titulo.match(/\bne\d/i) ||
    tipoNome.includes("empenho") ||
    tipoContrato.includes("empenho") ||
    url.includes("/empenhos/")
  ) {
    return "empenho";
  }

  return "contrato";
}

/**
 * Busca múltiplas páginas de um tipo no PNCP até ter resultados suficientes
 * após filtro de UF, ou esgotar páginas disponíveis.
 */
async function buscarTipoComPaginacao(params: {
  tipo: string;
  palavrasChave: string;
  ufs: string[];
  ufsSet: Set<string>;
  itensPorPagina: number;
  paginaInicial: number;
  maxPaginas: number;
}): Promise<{
  tipo: string;
  itens: PncpContratoListaItem[];
  totalApi: number;
}> {
  const { tipo, palavrasChave, ufs, ufsSet, itensPorPagina, paginaInicial, maxPaginas } = params;
  const filtrarUf = ufsSet.size > 0;
  const idsVistos = new Set<string>();
  const itensColetados: PncpContratoListaItem[] = [];
  let totalApi = 0;

  // Buscar até maxPaginas ou até ter itens suficientes
  for (let pag = paginaInicial; pag < paginaInicial + maxPaginas; pag++) {
    try {
      const res = await buscarContratosPncp({
        palavrasChave,
        uf: ufs.length > 0 ? ufs : undefined,
        pagina: pag,
        tamanhoPagina: 50, // sempre pedir o máximo da API
        tipoDocumento: tipo,
      });

      if (pag === paginaInicial) totalApi = res.total;
      if (res.items.length === 0) break;

      for (const item of res.items) {
        const id = item.numero_controle_pncp ?? item.id;
        if (idsVistos.has(id)) continue;
        idsVistos.add(id);

        // Filtro de UF no backend
        if (filtrarUf) {
          const ufItem = (item.uf ?? "").toUpperCase();
          if (!ufsSet.has(ufItem)) continue;
        }

        // Reclassificar tipo
        const tipoReal = classificarTipo(item);
        if (tipoReal !== tipo) continue; // só aceitar itens do tipo correto

        itensColetados.push(searchItemToListaItem(item));
      }

      // Se já temos resultados suficientes para mostrar, parar
      if (itensColetados.length >= itensPorPagina) break;

      // Se a API retornou menos que o máximo, não há mais páginas
      if (res.items.length < 50) break;
    } catch {
      break;
    }
  }

  return { tipo, itens: itensColetados, totalApi };
}

/**
 * POST /api/pncp/contratos
 *
 * Busca no PNCP os 3 tipos (contrato, empenho, ata) em paralelo.
 * Busca múltiplas páginas automaticamente para compensar filtro de UF.
 */
export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const pagina = Math.max(Number(body.pagina) || 1, 1);
  const itensPorPagina = Math.min(Math.max(Number(body.tamanhoPagina) || 20, 5), 50);

  const ufsInput: string[] = Array.isArray(body.ufs)
    ? body.ufs
        .map((u: unknown) => String(u).trim().toUpperCase())
        .filter((u: string) => /^[A-Z]{2}$/.test(u))
    : parseUfsCsv(String(body.ufsCsv ?? ""));

  const ufsSet = new Set(ufsInput.map((u) => u.toUpperCase()));

  const termos: string[] = Array.isArray(body.palavrasChave)
    ? body.palavrasChave.map((p: unknown) => String(p).trim()).filter(Boolean)
    : parsePalavrasChave(String(body.palavrasChaveTexto ?? ""));

  const palavrasChaveTexto = termos.join(" ");

  try {
    const TIPOS = ["contrato", "empenho", "ata"] as const;

    // Calcular página inicial na API considerando offset do usuário
    // Se usuário pede página 2 com 20 itens, precisamos pular ~40 itens na API
    // (estimando ~50% de filtro por UF)
    const paginaApi = Math.max(1, Math.ceil((pagina - 1) * itensPorPagina / 50) + 1);

    // Buscar os 3 tipos em paralelo, com paginação interna
    const resultados = await Promise.all(
      TIPOS.map((tipo) =>
        buscarTipoComPaginacao({
          tipo,
          palavrasChave: palavrasChaveTexto,
          ufs: ufsInput,
          ufsSet,
          itensPorPagina,
          paginaInicial: paginaApi,
          maxPaginas: 5, // buscar até 5 páginas (250 itens) para encontrar suficientes
        })
      )
    );

    const porTipo: Record<string, {
      tipo: string;
      itens: PncpContratoListaItem[];
      totalRegistros: number;
      totalPaginas: number;
    }> = {};

    for (const r of resultados) {
      // Limitar ao que o usuário pediu
      const itensLimitados = r.itens.slice(0, itensPorPagina);
      porTipo[r.tipo] = {
        tipo: r.tipo,
        itens: itensLimitados,
        totalRegistros: r.totalApi,
        totalPaginas: Math.max(1, Math.ceil(r.totalApi / itensPorPagina)),
      };
    }

    const totalGeral = resultados.reduce((s, r) => s + r.totalApi, 0);

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
