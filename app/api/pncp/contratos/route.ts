import { NextResponse } from "next/server";
import { buscarContratosPncp, type PncpSearchItem } from "@/lib/pncp/client";
import { searchItemToListaItem, parsePalavrasChave, parseUfsCsv } from "@/lib/pncp/normalize";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

/**
 * Classifica um item do PNCP no tipo correto baseado em múltiplos sinais:
 * document_type, título, tipo_nome, tipo_contrato_nome, item_url
 */
function classificarTipo(item: PncpSearchItem): "contrato" | "empenho" | "ata" {
  const docType = (item.document_type ?? "").toLowerCase();
  const titulo = (item.title ?? "").toLowerCase();
  const tipoNome = (item.tipo_nome ?? "").toLowerCase();
  const tipoContrato = (item.tipo_contrato_nome ?? "").toLowerCase();
  const url = (item.item_url ?? "").toLowerCase();

  // Checar por ata primeiro (ata de registro de preço)
  if (
    docType.includes("ata") ||
    titulo.match(/\bata\b/) ||
    tipoNome.includes("ata") ||
    tipoContrato.includes("ata") ||
    url.includes("/atas/")
  ) {
    return "ata";
  }

  // Checar por empenho
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

  // Default: contrato
  return "contrato";
}

/**
 * POST /api/pncp/contratos
 *
 * Busca no PNCP os 3 tipos (contrato, empenho, ata) em paralelo.
 * Aplica filtro de UF no backend (garantia) e classifica os itens
 * corretamente por tipo usando múltiplos sinais do PNCP.
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

  const ufsSet = new Set(ufsInput.map((u) => u.toUpperCase()));

  const termos: string[] = Array.isArray(body.palavrasChave)
    ? body.palavrasChave.map((p: unknown) => String(p).trim()).filter(Boolean)
    : parsePalavrasChave(String(body.palavrasChaveTexto ?? ""));

  const palavrasChaveTexto = termos.join(" ");

  try {
    // Buscar os 3 tipos em paralelo na API do PNCP
    const TIPOS = ["contrato", "empenho", "ata"] as const;

    const respostas = await Promise.all(
      TIPOS.map(async (tipo) => {
        try {
          const res = await buscarContratosPncp({
            palavrasChave: palavrasChaveTexto,
            uf: ufsInput.length > 0 ? ufsInput : undefined,
            pagina,
            tamanhoPagina,
            tipoDocumento: tipo,
          });
          return { tipo, items: res.items, total: res.total };
        } catch {
          return { tipo, items: [] as PncpSearchItem[], total: 0 };
        }
      })
    );

    // Juntar todos os itens e reclassificar + filtrar UF no backend
    const porTipo: Record<string, { tipo: string; itens: ReturnType<typeof searchItemToListaItem>[]; totalRegistros: number; totalPaginas: number }> = {
      contrato: { tipo: "contrato", itens: [], totalRegistros: 0, totalPaginas: 1 },
      empenho: { tipo: "empenho", itens: [], totalRegistros: 0, totalPaginas: 1 },
      ata: { tipo: "ata", itens: [], totalRegistros: 0, totalPaginas: 1 },
    };

    const idsVistos = new Set<string>();

    for (const resposta of respostas) {
      for (const item of resposta.items) {
        // Deduplicar
        const id = item.numero_controle_pncp ?? item.id;
        if (idsVistos.has(id)) continue;
        idsVistos.add(id);

        // Filtro de UF no backend (a API do PNCP nem sempre filtra direito)
        if (ufsSet.size > 0) {
          const ufItem = (item.uf ?? "").toUpperCase();
          if (!ufsSet.has(ufItem)) continue;
        }

        // Classificar no tipo correto
        const tipoReal = classificarTipo(item);
        const normalizado = searchItemToListaItem(item);
        porTipo[tipoReal].itens.push(normalizado);
      }
    }

    // Atualizar totais baseado nos itens realmente classificados
    for (const tipo of TIPOS) {
      porTipo[tipo].totalRegistros = porTipo[tipo].itens.length;
      porTipo[tipo].totalPaginas = 1; // já filtrado no backend
    }

    const totalGeral = TIPOS.reduce((s, t) => s + porTipo[t].totalRegistros, 0);

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
