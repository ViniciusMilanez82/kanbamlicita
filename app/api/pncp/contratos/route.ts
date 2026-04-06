import { NextResponse } from "next/server";
import { buscarContratosPncp } from "@/lib/pncp/client";
import type { PncpSearchItem } from "@/lib/pncp/client";
import { searchItemToListaItem, parsePalavrasChave, parseUfsCsv } from "@/lib/pncp/normalize";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import type { PncpSituacao } from "@/lib/pncp/types";

/**
 * POST /api/pncp/contratos
 *
 * Busca editais no PNCP (oportunidades abertas).
 * Cada palavra-chave separada por vírgula gera uma busca independente.
 * Resultados são combinados sem duplicatas.
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
  const filtrarUf = ufsSet.size > 0;

  const termos: string[] = Array.isArray(body.palavrasChave)
    ? body.palavrasChave.map((p: unknown) => String(p).trim()).filter(Boolean)
    : parsePalavrasChave(String(body.palavrasChaveTexto ?? ""));

  if (termos.length === 0) {
    return NextResponse.json({
      itens: [],
      totalRegistros: 0,
      totalPaginas: 1,
      numeroPagina: pagina,
      tiposDisponiveis: [],
      filtrosUsados: { ufs: ufsInput, palavrasChave: [] },
    });
  }

  try {
    const todosItens: ReturnType<typeof searchItemToListaItem>[] = [];
    const idsVistos = new Set<string>();
    let totalApiSoma = 0;

    // Busca cada termo separadamente (PNCP faz AND entre palavras,
    // então "container galpão" retorna 0, mas buscando separado funciona)
    const buscasPorTermo = termos.map((termo) =>
      buscarTermoPncp({
        termo,
        pagina,
        tamanhoPagina,
        ufsInput,
        ufsSet,
        filtrarUf,
        idsVistos,
      })
    );

    const resultados = await Promise.all(buscasPorTermo);

    for (const res of resultados) {
      totalApiSoma += res.totalApi;
      for (const item of res.itens) {
        todosItens.push(item);
      }
    }

    // Ordenar por data de publicação (mais recente primeiro)
    todosItens.sort((a, b) => {
      const da = (a as any).dataPublicacao ?? "";
      const db = (b as any).dataPublicacao ?? "";
      return db.localeCompare(da);
    });

    // Paginar: pegar só o slice da página pedida
    const itensRetorno = todosItens.slice(0, tamanhoPagina);
    const totalPaginas = Math.max(1, Math.ceil(todosItens.length / tamanhoPagina));

    // Tipos encontrados
    const tiposEncontrados = new Set<string>();
    for (const item of itensRetorno) {
      if ((item as any).tipoDocumento) tiposEncontrados.add((item as any).tipoDocumento);
    }

    return NextResponse.json({
      itens: itensRetorno,
      totalRegistros: totalApiSoma,
      totalPaginas: Math.max(totalPaginas, Math.ceil(totalApiSoma / tamanhoPagina)),
      numeroPagina: pagina,
      tiposDisponiveis: [...tiposEncontrados].sort(),
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

/* ------------------------------------------------------------------ */
/*  Busca um termo individual no PNCP                                   */
/* ------------------------------------------------------------------ */

async function buscarTermoPncp(params: {
  termo: string;
  pagina: number;
  tamanhoPagina: number;
  ufsInput: string[];
  ufsSet: Set<string>;
  filtrarUf: boolean;
  idsVistos: Set<string>;
}): Promise<{ itens: ReturnType<typeof searchItemToListaItem>[]; totalApi: number }> {
  const { termo, pagina, tamanhoPagina, ufsInput, ufsSet, filtrarUf, idsVistos } = params;
  const itens: ReturnType<typeof searchItemToListaItem>[] = [];
  let totalApi = 0;

  // Busca até 3 páginas por termo para ter itens suficientes
  const maxPaginas = 3;
  const tamApi = 50;

  for (let pag = pagina; pag < pagina + maxPaginas; pag++) {
    const res = await buscarContratosPncp({
      palavrasChave: termo,
      uf: ufsInput.length > 0 ? ufsInput : undefined,
      pagina: pag,
      tamanhoPagina: tamApi,
    });

    if (pag === pagina) totalApi = res.total;
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

      // Classificar tipo — descartar contratos/atas/empenhos/aditivos
      const { tipoDocumento: tipoDoc, situacao } = classificarItem(item);
      if (situacao !== "oportunidade") continue;

      const normalizado = searchItemToListaItem(item);
      itens.push({
        ...normalizado,
        tipoDocumento: tipoDoc,
        situacao,
        empresaContratada: null,
        cnpjContratada: null,
      });
    }

    // Se já tem itens suficientes para este termo
    if (itens.length >= tamanhoPagina) break;
    if (res.items.length < tamApi) break;
  }

  return { itens, totalApi };
}

/* ------------------------------------------------------------------ */
/*  Classificação dos itens PNCP                                       */
/* ------------------------------------------------------------------ */

/** Tipos claramente já firmados — só estes são descartados */
const TIPOS_REFERENCIA = new Set(["Contrato", "Empenho", "Ata", "Aditivo"]);

function classificarItem(item: {
  document_type?: string;
  title?: string;
  tipo_nome?: string;
  tipo_contrato_nome?: string;
  item_url?: string;
}): { tipoDocumento: string; situacao: PncpSituacao } {
  const tipoDocumento = detectarTipoDocumento(item);
  const situacao: PncpSituacao = TIPOS_REFERENCIA.has(tipoDocumento)
    ? "referencia"
    : "oportunidade";
  return { tipoDocumento, situacao };
}

function detectarTipoDocumento(item: {
  document_type?: string;
  title?: string;
  tipo_nome?: string;
  tipo_contrato_nome?: string;
  item_url?: string;
}): string {
  const docType = (item.document_type ?? "").toLowerCase();
  const titulo = (item.title ?? "").toLowerCase();
  const tipoNome = (item.tipo_nome ?? "").toLowerCase();
  const tipoContrato = (item.tipo_contrato_nome ?? "").toLowerCase();
  const url = (item.item_url ?? "").toLowerCase();

  if (docType.includes("ata") || titulo.match(/\bata\b/) || url.includes("/atas/"))
    return "Ata";
  if (docType.includes("empenho") || titulo.match(/\bempenho\b/) || titulo.match(/\bne\d/i) || url.includes("/empenhos/"))
    return "Empenho";
  if (docType.includes("edital") || titulo.match(/\bedital\b/) || url.includes("/editais/"))
    return "Edital";
  if (docType.includes("aviso") || titulo.match(/\baviso\b/))
    return "Aviso";
  if (docType.includes("aditivo") || titulo.match(/\baditivo\b/))
    return "Aditivo";
  if (tipoContrato || tipoNome.includes("contrato") || url.includes("/contratos/"))
    return "Contrato";

  return docType || "Outro";
}
