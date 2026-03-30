/** Endereço público da API de busca do PNCP (aceita texto livre + filtros). */
export const PNCP_SEARCH_BASE = "https://pncp.gov.br/api/search/";

/** Endereço da API de consulta (contratos por data — pode ter rate limit). */
export const PNCP_CONSULTA_BASE = "https://pncp.gov.br/api/consulta";

export const PNCP_DOCS = {
  site: "https://www.gov.br/pncp/pt-br",
  manuais: "https://www.gov.br/pncp/pt-br/central-de-conteudo/manuais",
} as const;
