/**
 * Cliente para a API v1 do PNCP — busca detalhes completos e documentos de contratos/atas/empenhos.
 *
 * Endpoints públicos (sem autenticação):
 *  - Detalhe:     GET /api/pncp/v1/orgaos/{cnpj}/contratos/{ano}/{sequencial}
 *  - Documentos:  GET /api/pncp/v1/orgaos/{cnpj}/contratos/{ano}/{sequencial}/arquivos
 *  - Download:    GET /api/pncp/v1/orgaos/{cnpj}/contratos/{ano}/{sequencial}/arquivos/{seqDoc}
 */

import type { PncpContratacaoOficial } from "./types";

const PNCP_V1_BASE = "https://pncp.gov.br/api/pncp/v1";

// API de consulta v1 (oficial, documentada no Manual PNCP §3.1).
const PNCP_CONSULTA_V1_BASE = "https://pncp.gov.br/api/consulta/v1";

/**
 * Busca o objeto completo de uma contratação na API oficial /v1/orgaos/{cnpj}/compras/{ano}/{seq}
 * (Manual PNCP §6.4, schema idêntico ao da listagem).
 *
 * Fail-soft: timeout 5s + retorna null em qualquer erro, para não bloquear
 * a busca/import caso o PNCP esteja lento/instável.
 */
export async function buscarDetalhesContratacao(
  numeroControle: string,
  timeoutMs = 5000
): Promise<PncpContratacaoOficial | null> {
  const parsed = parseNumeroControle(numeroControle);
  if (!parsed) return null;

  const endpoint = `${PNCP_CONSULTA_V1_BASE}/orgaos/${parsed.cnpj}/compras/${parsed.ano}/${parsed.sequencial}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      headers: HEADERS,
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) return null;
    return (await res.json()) as PncpContratacaoOficial;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Compat: hoje só extrai linkSistemaOrigem. Implementado em cima de
 * buscarDetalhesContratacao para reaproveitar a chamada quando possível.
 */
export async function buscarLinkSistemaOrigem(
  numeroControle: string
): Promise<string | null> {
  const data = await buscarDetalhesContratacao(numeroControle);
  const link = data?.linkSistemaOrigem;
  return typeof link === "string" && link.startsWith("http") ? link : null;
}

const HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

/** Informação parseada de um numero_controle_pncp */
export type PncpIdParsed = {
  cnpj: string;
  tipo: string;
  sequencial: string;
  ano: string;
};

/**
 * Parseia o numero_controle_pncp.
 * Formatos conhecidos:
 *  - {cnpj}-{tipo}-{sequencial}/{ano}
 *  - Pode ter variações, tentamos extrair o máximo
 */
export function parseNumeroControle(id: string): PncpIdParsed | null {
  if (!id) return null;

  // Formato: 33000167000101-1-000028/2024
  const match = id.match(/^(\d{14})-(\d+)-(\d+)\/(\d{4})$/);
  if (match) {
    return { cnpj: match[1], tipo: match[2], sequencial: match[3], ano: match[4] };
  }

  // Formato alternativo sem tipo: 33000167000101-000028/2024
  const match2 = id.match(/^(\d{14})-(\d+)\/(\d{4})$/);
  if (match2) {
    return { cnpj: match2[1], tipo: "1", sequencial: match2[2], ano: match2[3] };
  }

  return null;
}

/**
 * Determina o endpoint correto baseado no tipo de documento e na URL do item.
 */
function determinarEndpoint(parsed: PncpIdParsed, itemUrl?: string): string {
  const url = (itemUrl ?? "").toLowerCase();

  if (url.includes("/atas/")) {
    return `${PNCP_V1_BASE}/orgaos/${parsed.cnpj}/compras/${parsed.ano}/${parsed.sequencial}/atas`;
  }
  if (url.includes("/empenhos/")) {
    return `${PNCP_V1_BASE}/orgaos/${parsed.cnpj}/compras/${parsed.ano}/${parsed.sequencial}/empenhos`;
  }

  // Default: contrato
  return `${PNCP_V1_BASE}/orgaos/${parsed.cnpj}/contratos/${parsed.ano}/${parsed.sequencial}`;
}

/** Resposta detalhada do contrato (campos mais importantes) */
export type PncpDetalheContrato = Record<string, unknown>;

/** Item da lista de arquivos */
export type PncpArquivoInfo = {
  sequencialDocumento: number;
  uri: string;
  url: string;
  titulo: string;
  tipoDocumento: string;
  tipoDocumentoNome?: string;
};

/**
 * Busca os detalhes completos de um contrato/ata/empenho no PNCP.
 */
export async function buscarDetalhesPncp(
  numeroControle: string,
  itemUrl?: string
): Promise<PncpDetalheContrato | null> {
  const parsed = parseNumeroControle(numeroControle);
  if (!parsed) return null;

  const endpoint = determinarEndpoint(parsed, itemUrl);

  try {
    const res = await fetch(endpoint, { headers: HEADERS, cache: "no-store" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Lista os arquivos/documentos associados a um contrato no PNCP.
 */
export async function listarArquivosPncp(
  numeroControle: string,
  _itemUrl?: string
): Promise<PncpArquivoInfo[]> {
  const parsed = parseNumeroControle(numeroControle);
  if (!parsed) return [];

  // Para contratos, o endpoint de arquivos é direto
  const base = `${PNCP_V1_BASE}/orgaos/${parsed.cnpj}/contratos/${parsed.ano}/${parsed.sequencial}`;
  const endpoint = `${base}/arquivos`;

  try {
    const res = await fetch(endpoint, { headers: HEADERS, cache: "no-store" });
    if (!res.ok) {
      // Tentar via compras (para atas/editais)
      const altBase = `${PNCP_V1_BASE}/orgaos/${parsed.cnpj}/compras/${parsed.ano}/${parsed.sequencial}`;
      const altRes = await fetch(`${altBase}/arquivos`, { headers: HEADERS, cache: "no-store" });
      if (!altRes.ok) return [];
      const ct = altRes.headers.get("content-type") ?? "";
      if (!ct.includes("json")) return [];
      const data = await altRes.json();
      return Array.isArray(data) ? data : [];
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Baixa um arquivo específico do PNCP.
 * Retorna o Buffer do arquivo e informações de tipo.
 */
export async function baixarArquivoPncp(
  numeroControle: string,
  sequencialDocumento: number
): Promise<{ buffer: Buffer; contentType: string; tamanho: number } | null> {
  const parsed = parseNumeroControle(numeroControle);
  if (!parsed) return null;

  const base = `${PNCP_V1_BASE}/orgaos/${parsed.cnpj}/contratos/${parsed.ano}/${parsed.sequencial}`;
  const endpoint = `${base}/arquivos/${sequencialDocumento}`;

  try {
    let res = await fetch(endpoint, {
      headers: { "User-Agent": HEADERS["User-Agent"] },
      cache: "no-store",
    });

    if (!res.ok) {
      // Tentar via compras
      const altBase = `${PNCP_V1_BASE}/orgaos/${parsed.cnpj}/compras/${parsed.ano}/${parsed.sequencial}`;
      res = await fetch(`${altBase}/arquivos/${sequencialDocumento}`, {
        headers: { "User-Agent": HEADERS["User-Agent"] },
        cache: "no-store",
      });
      if (!res.ok) return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";

    return { buffer, contentType, tamanho: buffer.length };
  } catch {
    return null;
  }
}
