/**
 * Gera a URL pública do edital no portal PNCP.
 *
 * Formato canônico atual (2026): /app/editais/<cnpj>/<ano>/<sequencial-sem-zeros>
 * Recebe o numero_controle_pncp no formato "<cnpj>-<tipo>-<seq>/<ano>"
 * (ex.: "42498600000171-1-003679/2024" -> .../app/editais/42498600000171/2024/3679).
 */
export function urlEditalPncp(
  numeroControle: string | null | undefined
): string | null {
  if (!numeroControle) return null;

  const m1 = numeroControle.match(/^(\d{14})-\d+-(\d+)\/(\d{4})$/);
  if (m1) {
    const [, cnpj, sequencialRaw, ano] = m1;
    const seq = String(parseInt(sequencialRaw, 10));
    return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${seq}`;
  }

  // Variante sem segmento de tipo: "<cnpj>-<seq>/<ano>"
  const m2 = numeroControle.match(/^(\d{14})-(\d+)\/(\d{4})$/);
  if (m2) {
    const [, cnpj, sequencialRaw, ano] = m2;
    const seq = String(parseInt(sequencialRaw, 10));
    return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${seq}`;
  }

  return null;
}
