import { PNCP_SEARCH_BASE } from "./constants";

/**
 * Estrutura de um item retornado pelo endpoint de busca do PNCP.
 * Campos mapeados a partir da resposta real da API /api/search/.
 */
export type PncpSearchItem = {
  id: string;
  title: string;
  description: string;
  item_url: string;
  document_type: string;
  numero_controle_pncp: string;
  orgao_cnpj: string;
  orgao_nome: string;
  unidade_nome: string;
  municipio_nome: string;
  uf: string;
  modalidade_licitacao_nome: string;
  situacao_nome: string;
  data_publicacao_pncp: string;
  data_assinatura: string;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  valor_global: number | null;
  tipo_nome: string;
  tipo_contrato_nome: string;
  esfera_nome: string;
  poder_nome: string;
  ano: string;
  numero_sequencial: string;
  cancelado: boolean;
  /* Campos do fornecedor/empresa contratada (presentes em contratos, atas, empenhos) */
  razaoSocialFornecedor?: string;
  nomeRazaoSocialFornecedor?: string;
  nomeFantasiaFornecedor?: string;
  cnpjFornecedor?: string;
  niFornecedor?: string;
};

export type PncpSearchResponse = {
  items: PncpSearchItem[];
  total: number;
};

/**
 * Busca contratos no PNCP via endpoint /api/search/.
 *
 * Essa API aceita busca por texto (parâmetro `q`) e já retorna
 * resultados filtrados pelo servidor do governo — muito mais rápido
 * e preciso do que filtrar localmente.
 */
export async function buscarContratosPncp(params: {
  palavrasChave?: string;
  uf?: string[];
  pagina: number;
  tamanhoPagina: number;
  tipoDocumento?: string;
}): Promise<PncpSearchResponse> {
  const tamanho = Math.min(50, Math.max(5, params.tamanhoPagina));
  const pagina = Math.max(1, params.pagina);

  const url = new URL(PNCP_SEARCH_BASE);
  // Não filtrar por tipo — busca tudo e o backend classifica/descarta
  if (params.tipoDocumento) {
    url.searchParams.set("tipos_documento", params.tipoDocumento);
  }
  url.searchParams.set("pagina", String(pagina));
  url.searchParams.set("tam_pagina", String(tamanho));

  // Busca por texto — o parâmetro principal
  if (params.palavrasChave?.trim()) {
    url.searchParams.set("q", params.palavrasChave.trim());
  }

  // Filtro por UF
  if (params.uf?.length) {
    url.searchParams.set("uf", params.uf.join(","));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = `O site do governo retornou erro (${res.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json === "string") msg = json;
      else if (json.message) msg = json.message;
      else if (json.error) msg = json.error;
    } catch {
      if (text.includes("<html")) {
        msg =
          "O site do governo está indisponível no momento. Tente novamente em alguns minutos.";
      }
    }
    throw new Error(msg);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    throw new Error(
      "O site do governo não retornou dados no formato esperado. Tente novamente em alguns minutos."
    );
  }

  const body = (await res.json()) as PncpSearchResponse;
  return {
    items: body.items ?? [],
    total: body.total ?? 0,
  };
}
