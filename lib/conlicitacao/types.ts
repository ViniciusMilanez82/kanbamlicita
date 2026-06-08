/**
 * Tipos do boletim da ConLicitação.
 *
 * O boletim é exportado como um arquivo de texto separado por ponto e vírgula
 * (`;`). Cada linha é uma licitação. As colunas abaixo são as do arquivo de
 * exemplo enviado pelo time (cabeçalho na primeira linha).
 */

export const BOLETIM_COLUNAS = [
  "status",
  "motivo",
  "cidade",
  "edital",
  "conlicitacao",
  "processo",
  "datas",
  "data_publicacao",
  "valor_estimado",
  "objeto",
  "sintese",
  "edital_online",
  "unidade",
  "endereco",
  "cep",
  "telefones",
  "fax",
  "email",
  "site1",
  "site2",
  "observacao",
] as const;

export type BoletimColuna = (typeof BOLETIM_COLUNAS)[number];

/** Uma linha já estruturada do boletim (todas as colunas como texto). */
export type BoletimRow = Record<BoletimColuna, string>;

/**
 * Status de triagem que vem na coluna `status` do boletim:
 * - ESCOPO: dentro do escopo, vale participar.
 * - CONFERIR: limítrofe, precisa de análise humana.
 * - RUIDO: descartado pela triagem.
 */
export type BoletimStatus = "ESCOPO" | "CONFERIR" | "RUIDO" | "OUTRO";

export function classificarStatus(status: string): BoletimStatus {
  const s = (status ?? "").trim().toUpperCase();
  if (s === "ESCOPO") return "ESCOPO";
  if (s === "CONFERIR") return "CONFERIR";
  if (s === "RUIDO" || s === "RUÍDO") return "RUIDO";
  return "OUTRO";
}
