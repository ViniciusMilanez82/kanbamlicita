import { NextResponse } from "next/server";
import { buscarContratosPncp, type PncpSearchItem } from "@/lib/pncp/client";
import {
  searchItemToListaItem,
  parsePalavrasChave,
  parseUfsCsv,
} from "@/lib/pncp/normalize";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { buscarDetalhesContratacao } from "@/lib/pncp/detalhes";
import type {
  PncpContratoListaItem,
  PncpContratacaoOficial,
  PncpSituacao,
} from "@/lib/pncp/types";

/**
 * POST /api/pncp/contratos
 *
 * Busca editais no PNCP (oportunidades abertas).
 * 1. Descoberta por texto via /api/search/ (palavras-chave separadas por vírgula).
 * 2. Cada item da página é enriquecido em paralelo com o detalhe oficial
 *    /api/consulta/v1/orgaos/{cnpj}/compras/{ano}/{seq} para puxar dataEncerramentoProposta,
 *    modalidade, situação, srp, amparoLegal etc. (Manual PNCP §6.4).
 *    Fail-soft: se o detalhe falhar, mantém só os dados do search.
 */
export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const pagina = Math.max(Number(body.pagina) || 1, 1);
  const tamanhoPagina = Math.min(
    Math.max(Number(body.tamanhoPagina) || 20, 5),
    50
  );

  const ufsInput: string[] = Array.isArray(body.ufs)
    ? body.ufs
        .map((u: unknown) => String(u).trim().toUpperCase())
        .filter((u: string) => /^[A-Z]{2}$/.test(u))
    : parseUfsCsv(String(body.ufsCsv ?? ""));

  const ufsSet = new Set(ufsInput.map((u) => u.toUpperCase()));
  const filtrarUf = ufsSet.size > 0;

  const termos: string[] = Array.isArray(body.palavrasChave)
    ? body.palavrasChave
        .map((p: unknown) => String(p).trim())
        .filter(Boolean)
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
    const idsVistos = new Set<string>();
    let totalApiSoma = 0;

    type SearchAchado = {
      item: PncpSearchItem;
      tipoDocumento: string;
      situacao: PncpSituacao;
    };
    const achados: SearchAchado[] = [];

    const buscas = await Promise.all(
      termos.map((termo) =>
        buscarTermoPncp({
          termo,
          pagina,
          tamanhoPagina,
          ufsInput,
          ufsSet,
          filtrarUf,
          idsVistos,
        })
      )
    );

    for (const res of buscas) {
      totalApiSoma += res.totalApi;
      for (const a of res.achados) achados.push(a);
    }

    // Ordenar por data de publicação (mais recente primeiro) e fatiar antes
    // de enriquecer — só pagamos N requests pelo que vai aparecer na página.
    achados.sort((a, b) =>
      (b.item.data_publicacao_pncp ?? "").localeCompare(
        a.item.data_publicacao_pncp ?? ""
      )
    );
    const fatia = achados.slice(0, tamanhoPagina);

    // Enriquecimento paralelo. Falhas individuais não bloqueiam a página.
    const detalhes = await Promise.all(
      fatia.map(({ item }) =>
        item.numero_controle_pncp
          ? buscarDetalhesContratacao(item.numero_controle_pncp, 4000).catch(
              () => null
            )
          : Promise.resolve(null as PncpContratacaoOficial | null)
      )
    );

    const itensRetorno: PncpContratoListaItem[] = fatia.map(
      ({ item, tipoDocumento, situacao }, idx) => {
        const oficial = detalhes[idx];
        const normalizado = searchItemToListaItem(item, oficial ?? undefined);
        return {
          ...normalizado,
          tipoDocumento,
          situacao,
          empresaContratada: null,
          cnpjContratada: null,
        };
      }
    );

    const totalPaginas = Math.max(
      1,
      Math.ceil(achados.length / tamanhoPagina),
      Math.ceil(totalApiSoma / tamanhoPagina)
    );

    const tiposEncontrados = new Set<string>();
    for (const item of itensRetorno) {
      const tipo = item.tipoDocumento;
      if (tipo) tiposEncontrados.add(tipo);
    }

    return NextResponse.json({
      itens: itensRetorno,
      totalRegistros: totalApiSoma,
      totalPaginas,
      numeroPagina: pagina,
      tiposDisponiveis: [...tiposEncontrados].sort(),
      filtrosUsados: { ufs: ufsInput, palavrasChave: termos },
    });
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "Não foi possível consultar o site do governo";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/* ------------------------------------------------------------------ */
/*  Busca um termo individual no PNCP (descoberta via /api/search/)    */
/* ------------------------------------------------------------------ */

async function buscarTermoPncp(params: {
  termo: string;
  pagina: number;
  tamanhoPagina: number;
  ufsInput: string[];
  ufsSet: Set<string>;
  filtrarUf: boolean;
  idsVistos: Set<string>;
}): Promise<{
  achados: {
    item: PncpSearchItem;
    tipoDocumento: string;
    situacao: PncpSituacao;
  }[];
  totalApi: number;
}> {
  const {
    termo,
    pagina,
    tamanhoPagina,
    ufsInput,
    ufsSet,
    filtrarUf,
    idsVistos,
  } = params;
  const achados: {
    item: PncpSearchItem;
    tipoDocumento: string;
    situacao: PncpSituacao;
  }[] = [];
  let totalApi = 0;

  // Mais páginas pois muitos editais já têm resultado e são descartados.
  const maxPaginas = 8;
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

      // Descartar editais que já têm resultado ou cancelados
      if (item.tem_resultado || item.cancelado) continue;

      // Filtro de UF no backend
      if (filtrarUf) {
        const ufItem = (item.uf ?? "").toUpperCase();
        if (!ufsSet.has(ufItem)) continue;
      }

      const { tipoDocumento, situacao } = classificarItem(item);
      if (situacao !== "oportunidade") continue;

      achados.push({ item, tipoDocumento, situacao });
    }

    if (achados.length >= tamanhoPagina) break;
    if (res.items.length < tamApi) break;
  }

  return { achados, totalApi };
}

/* ------------------------------------------------------------------ */
/*  Classificação dos itens PNCP                                       */
/* ------------------------------------------------------------------ */

const TIPOS_REFERENCIA = new Set(["Contrato", "Empenho", "Ata", "Aditivo"]);

function classificarItem(item: PncpSearchItem): {
  tipoDocumento: string;
  situacao: PncpSituacao;
} {
  const tipoDocumento = detectarTipoDocumento(item);
  const situacao: PncpSituacao = TIPOS_REFERENCIA.has(tipoDocumento)
    ? "referencia"
    : "oportunidade";
  return { tipoDocumento, situacao };
}

function detectarTipoDocumento(item: PncpSearchItem): string {
  const docType = (item.document_type ?? "").toLowerCase();
  const titulo = (item.title ?? "").toLowerCase();
  const tipoNome = (item.tipo_nome ?? "").toLowerCase();
  const tipoContrato = (item.tipo_contrato_nome ?? "").toLowerCase();
  const url = (item.item_url ?? "").toLowerCase();

  if (docType.includes("ata") || titulo.match(/\bata\b/) || url.includes("/atas/"))
    return "Ata";
  if (
    docType.includes("empenho") ||
    titulo.match(/\bempenho\b/) ||
    titulo.match(/\bne\d/i) ||
    url.includes("/empenhos/")
  )
    return "Empenho";
  if (docType.includes("edital") || titulo.match(/\bedital\b/) || url.includes("/editais/"))
    return "Edital";
  if (docType.includes("aviso") || titulo.match(/\baviso\b/)) return "Aviso";
  if (docType.includes("aditivo") || titulo.match(/\baditivo\b/)) return "Aditivo";
  if (tipoContrato || tipoNome.includes("contrato") || url.includes("/contratos/"))
    return "Contrato";

  return docType || "Outro";
}
