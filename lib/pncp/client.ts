import { PNCP_CONSULTA_BASE } from "./constants";
import type { PncpContratoRaw } from "./types";

type PncpContratosApiResponse = {
  data?: PncpContratoRaw[];
  totalRegistros?: number;
  totalPaginas?: number;
  numeroPagina?: number;
  paginasRestantes?: number;
  empty?: boolean;
  message?: string;
  error?: string;
  status?: string | number;
};

function clampPagina(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Contratos por data de publicação no PNCP (GET /v1/contratos).
 * `tamanhoPagina` mínimo 10 (requisito da API).
 */
export async function fetchContratosPublicacao(params: {
  dataInicial: string;
  dataFinal: string;
  pagina: number;
  tamanhoPagina: number;
}): Promise<PncpContratosApiResponse> {
  const tamanho = clampPagina(params.tamanhoPagina, 10, 50);
  const pagina = clampPagina(params.pagina, 1, 50_000);

  const url = new URL(`${PNCP_CONSULTA_BASE}/v1/contratos`);
  url.searchParams.set("dataInicial", params.dataInicial);
  url.searchParams.set("dataFinal", params.dataFinal);
  url.searchParams.set("pagina", String(pagina));
  url.searchParams.set("tamanhoPagina", String(tamanho));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const body = (await res.json()) as PncpContratosApiResponse;

  if (!res.ok) {
    const msg =
      typeof body.message === "string"
        ? body.message
        : typeof body.error === "string"
          ? body.error
          : `PNCP HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body;
}
