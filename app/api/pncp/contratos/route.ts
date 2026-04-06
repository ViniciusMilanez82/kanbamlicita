import { NextResponse } from "next/server";
import { buscarContratosPncp } from "@/lib/pncp/client";
import type { PncpSearchItem } from "@/lib/pncp/client";
import { searchItemToListaItem, parsePalavrasChave, parseUfsCsv } from "@/lib/pncp/normalize";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import type { PncpSituacao } from "@/lib/pncp/types";

/**
 * POST /api/pncp/contratos
 *
 * Busca no PNCP sem filtro de tipo — traz tudo (contrato, empenho, ata,
 * edital, aviso, etc). Filtro de UF aplicado no backend.
 * Retorna itens com campo 'tipoDocumento' para filtro no frontend.
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

  const palavrasChaveTexto = termos.join(" ");

  try {
    // Se filtra por UF, buscar mais páginas para compensar itens descartados
    const maxPaginas = filtrarUf ? 5 : 1;
    const tamApi = 50; // sempre pedir o máximo da API

    const todosItens: ReturnType<typeof searchItemToListaItem>[] = [];
    const idsVistos = new Set<string>();
    let totalApi = 0;
    const tiposEncontrados = new Set<string>();

    for (let pag = pagina; pag < pagina + maxPaginas; pag++) {
      const res = await buscarContratosPncp({
        palavrasChave: palavrasChaveTexto,
        uf: ufsInput.length > 0 ? ufsInput : undefined,
        pagina: filtrarUf ? pag : pagina,
        tamanhoPagina: filtrarUf ? tamApi : tamanhoPagina,
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

        const normalizado = searchItemToListaItem(item);

        // Detectar tipo do documento e situação (oportunidade vs referência)
        const { tipoDocumento: tipoDoc, situacao } = classificarItem(item);
        tiposEncontrados.add(tipoDoc);

        // Extrair empresa contratada (se houver)
        const empresaContratada = extrairEmpresaContratada(item);
        const cnpjContratada = extrairCnpjContratada(item);

        todosItens.push({
          ...normalizado,
          tipoDocumento: tipoDoc,
          situacao,
          empresaContratada,
          cnpjContratada,
        });
      }

      // Se já tem itens suficientes
      if (todosItens.length >= tamanhoPagina) break;
      if (res.items.length < tamApi) break;
    }

    // Limitar ao tamanho pedido
    const itensRetorno = todosItens.slice(0, tamanhoPagina);
    const totalPaginas = Math.max(1, Math.ceil(totalApi / tamanhoPagina));

    return NextResponse.json({
      itens: itensRetorno,
      totalRegistros: totalApi,
      totalPaginas,
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
/*  Classificação e enriquecimento dos itens PNCP                      */
/* ------------------------------------------------------------------ */

/** Tipos de documento considerados oportunidades abertas para participação */
const TIPOS_OPORTUNIDADE = new Set(["Edital", "Aviso"]);

/**
 * Detecta o tipo de documento e classifica como oportunidade ou referência.
 *
 * - "oportunidade" = Editais e Avisos (abertos para participação)
 * - "referencia"   = Contratos, Empenhos, Atas, Aditivos (já firmados — inteligência de mercado)
 */
function classificarItem(item: {
  document_type?: string;
  title?: string;
  tipo_nome?: string;
  tipo_contrato_nome?: string;
  item_url?: string;
}): { tipoDocumento: string; situacao: PncpSituacao } {
  const tipoDocumento = detectarTipoDocumento(item);
  const situacao: PncpSituacao = TIPOS_OPORTUNIDADE.has(tipoDocumento)
    ? "oportunidade"
    : "referencia";
  return { tipoDocumento, situacao };
}

/**
 * Detecta o tipo de documento baseado em múltiplos campos do item PNCP.
 */
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

/**
 * Extrai o nome da empresa contratada/fornecedora do item PNCP.
 * Campos podem variar dependendo do tipo de documento.
 */
function extrairEmpresaContratada(item: Partial<PncpSearchItem>): string | null {
  const nome =
    item.nomeRazaoSocialFornecedor ??
    item.razaoSocialFornecedor ??
    item.nomeFantasiaFornecedor ??
    null;
  return nome?.trim() || null;
}

/**
 * Extrai o CNPJ da empresa contratada/fornecedora.
 */
function extrairCnpjContratada(item: Partial<PncpSearchItem>): string | null {
  const cnpj = item.cnpjFornecedor ?? item.niFornecedor ?? null;
  return cnpj?.trim() || null;
}
